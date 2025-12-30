package token

import (
	"database/sql"
	"fmt"
	"log"

	"github.com/peoplecoin/backend/internal/blockchain/coingecko"
	"github.com/peoplecoin/backend/internal/blockchain/suiscan"
	"github.com/peoplecoin/backend/internal/cache"
	"github.com/peoplecoin/backend/internal/database"
	"github.com/peoplecoin/backend/internal/models"
)

type Service struct {
	db              *database.DB
	redis           *cache.RedisClient
	suiscanClient   *suiscan.Client
	coingeckoClient *coingecko.Client
}

func NewService(
	db *database.DB,
	redis *cache.RedisClient,
	suiscanClient *suiscan.Client,
	coingeckoClient *coingecko.Client,
) *Service {
	return &Service{
		db:              db,
		redis:           redis,
		suiscanClient:   suiscanClient,
		coingeckoClient: coingeckoClient,
	}
}

// GetToken fetches token info from database and enriches with live data
func (s *Service) GetToken(tokenID string) (*models.TokenInfo, error) {
	// 1. Get token from database
	var token models.Token

	query := `
		SELECT id, creator_id, coin_type, symbol, deployed_at,
		       deployer_address, pool_address, status
		FROM tokens
		WHERE id = $1
	`

	err := s.db.QueryRow(query, tokenID).Scan(
		&token.ID,
		&token.CreatorID,
		&token.CoinType,
		&token.Symbol,
		&token.DeployedAt,
		&token.DeployerAddress,
		&token.PoolAddress,
		&token.Status,
	)

	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("token not found")
	}

	if err != nil {
		return nil, fmt.Errorf("database error: %w", err)
	}

	// 2. Try to get live data from cache
	cacheKey := cache.TokenInfoKey(token.CoinType)
	var tokenInfo models.TokenInfo

	err = s.redis.GetJSON(cacheKey, &tokenInfo)
	if err == nil {
		// Cache hit - return cached data with database token info
		tokenInfo.Token = token
		return &tokenInfo, nil
	}

	// 3. Cache miss - fetch from third-party APIs
	liveData, err := s.fetchLiveData(token.CoinType)
	if err != nil {
		log.Printf("Failed to fetch live data: %v", err)
		// Return token with zero values for live data
		return &models.TokenInfo{
			Token:          token,
			Price:          0,
			PriceChange24h: 0,
			Volume24h:      0,
			MarketCap:      0,
			TotalSupply:    "0",
			Holders:        0,
		}, nil
	}

	// 4. Combine database token with live data
	tokenInfo = models.TokenInfo{
		Token:          token,
		Price:          liveData.Price,
		PriceChange24h: liveData.PriceChange24h,
		Volume24h:      liveData.Volume24h,
		MarketCap:      liveData.MarketCap,
		TotalSupply:    liveData.TotalSupply,
		Holders:        liveData.Holders,
	}

	// 5. Cache the result
	_ = s.redis.SetJSON(cacheKey, tokenInfo, cache.TokenInfoTTL)

	return &tokenInfo, nil
}

// GetHolders fetches token holders from blockchain explorer
func (s *Service) GetHolders(tokenID string, page, limit int) ([]models.TokenHolder, *models.PaginationMeta, error) {
	// Get token to get coin_type
	var coinType string
	query := `SELECT coin_type FROM tokens WHERE id = $1`

	err := s.db.QueryRow(query, tokenID).Scan(&coinType)
	if err != nil {
		return nil, nil, fmt.Errorf("token not found")
	}

	// Try cache first
	cacheKey := cache.TokenHoldersKey(coinType, page, limit)
	var cachedResponse struct {
		Holders    []models.TokenHolder
		Pagination models.PaginationMeta
	}

	err = s.redis.GetJSON(cacheKey, &cachedResponse)
	if err == nil {
		return cachedResponse.Holders, &cachedResponse.Pagination, nil
	}

	// Fetch from SuiScan
	holdersResp, err := s.suiscanClient.GetHolders(coinType, page, limit)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to fetch holders: %w", err)
	}

	// Convert to models
	holders := make([]models.TokenHolder, len(holdersResp.Holders))
	for i, h := range holdersResp.Holders {
		holders[i] = models.TokenHolder{
			Address:    h.Address,
			Balance:    h.Balance,
			Percentage: h.Percentage,
		}
	}

	// Build pagination
	totalPages := (holdersResp.Total + limit - 1) / limit
	pagination := &models.PaginationMeta{
		Page:       page,
		Limit:      limit,
		Total:      holdersResp.Total,
		TotalPages: totalPages,
		HasNext:    page < totalPages,
		HasPrev:    page > 1,
	}

	// Cache the result
	cachedResponse.Holders = holders
	cachedResponse.Pagination = *pagination
	_ = s.redis.SetJSON(cacheKey, cachedResponse, cache.TokenHoldersTTL)

	return holders, pagination, nil
}

// GetTransactions fetches token transactions from blockchain explorer
func (s *Service) GetTransactions(tokenID string, page, limit int) ([]models.TokenTransaction, *models.PaginationMeta, error) {
	// Get token to get coin_type
	var coinType string
	query := `SELECT coin_type FROM tokens WHERE id = $1`

	err := s.db.QueryRow(query, tokenID).Scan(&coinType)
	if err != nil {
		return nil, nil, fmt.Errorf("token not found")
	}

	// Try cache first
	cacheKey := cache.TokenTransactionsKey(coinType, page, limit)
	var cachedResponse struct {
		Transactions []models.TokenTransaction
		Pagination   models.PaginationMeta
	}

	err = s.redis.GetJSON(cacheKey, &cachedResponse)
	if err == nil {
		return cachedResponse.Transactions, &cachedResponse.Pagination, nil
	}

	// Fetch from SuiScan
	txsResp, err := s.suiscanClient.GetTransactions(coinType, page, limit)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to fetch transactions: %w", err)
	}

	// Convert to models
	transactions := make([]models.TokenTransaction, len(txsResp.Transactions))
	for i, tx := range txsResp.Transactions {
		transactions[i] = models.TokenTransaction{
			Hash:      tx.Hash,
			From:      tx.From,
			To:        tx.To,
			Amount:    tx.Amount,
			Timestamp: tx.Timestamp,
			Type:      tx.Type,
		}
	}

	// Build pagination
	totalPages := (txsResp.Total + limit - 1) / limit
	pagination := &models.PaginationMeta{
		Page:       page,
		Limit:      limit,
		Total:      txsResp.Total,
		TotalPages: totalPages,
		HasNext:    page < totalPages,
		HasPrev:    page > 1,
	}

	// Cache the result
	cachedResponse.Transactions = transactions
	cachedResponse.Pagination = *pagination
	_ = s.redis.SetJSON(cacheKey, cachedResponse, cache.TokenTxsTTL)

	return transactions, pagination, nil
}

// fetchLiveData fetches live token data from third-party APIs
func (s *Service) fetchLiveData(coinType string) (*struct {
	Price          float64
	PriceChange24h float64
	Volume24h      float64
	MarketCap      float64
	TotalSupply    string
	Holders        int
}, error) {
	// Fetch price data from CoinGecko
	priceData, err := s.coingeckoClient.GetTokenPrice(coinType)
	if err != nil {
		log.Printf("CoinGecko API error: %v", err)
		priceData = &coingecko.TokenPrice{}
	}

	// Fetch metadata from SuiScan
	metadata, err := s.suiscanClient.GetCoinMetadata(coinType)
	if err != nil {
		log.Printf("SuiScan API error: %v", err)
		return nil, err
	}

	return &struct {
		Price          float64
		PriceChange24h float64
		Volume24h      float64
		MarketCap      float64
		TotalSupply    string
		Holders        int
	}{
		Price:          priceData.USD,
		PriceChange24h: priceData.USD24hChange,
		Volume24h:      priceData.USD24hVol,
		MarketCap:      priceData.USDMarketCap,
		TotalSupply:    metadata.TotalSupply,
		Holders:        metadata.Holders,
	}, nil
}
