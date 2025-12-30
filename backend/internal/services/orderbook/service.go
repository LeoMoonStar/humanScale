package orderbook

import (
	"database/sql"
	"fmt"
	"log"
	"time"

	"github.com/google/uuid"
	"github.com/peoplecoin/backend/internal/cache"
	"github.com/peoplecoin/backend/internal/database"
	"github.com/peoplecoin/backend/internal/models"
)

const (
	TakerFeeRate = 0.005 // 0.5%
	MakerFeeRate = 0.003 // 0.3%
)

type Service struct {
	db    *database.DB
	redis *cache.RedisClient
}

func NewService(db *database.DB, redis *cache.RedisClient) *Service {
	return &Service{
		db:    db,
		redis: redis,
	}
}

// GetOrderBook returns the current order book for a token
func (s *Service) GetOrderBook(tokenID string, depth int) (*models.OrderBook, error) {
	if depth <= 0 {
		depth = 20
	}

	// Try cache first
	cacheKey := cache.OrderBookKey(tokenID)
	var orderBook models.OrderBook

	err := s.redis.GetJSON(cacheKey, &orderBook)
	if err == nil {
		return &orderBook, nil
	}

	// Build order book from database
	orderBook = models.OrderBook{
		TokenID:   tokenID,
		Bids:      []models.OrderBookLevel{},
		Asks:      []models.OrderBookLevel{},
		UpdatedAt: time.Now(),
	}

	// Get bids (buy orders) - grouped by price, descending
	bidsQuery := `
		SELECT price, SUM(remaining_quantity) as total_quantity, COUNT(*) as order_count
		FROM orders
		WHERE token_id = $1 AND side = 'bid' AND status = 'open'
		GROUP BY price
		ORDER BY price DESC
		LIMIT $2
	`

	rows, err := s.db.Query(bidsQuery, tokenID, depth)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch bids: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var level models.OrderBookLevel
		if err := rows.Scan(&level.Price, &level.Quantity, &level.Orders); err != nil {
			continue
		}
		orderBook.Bids = append(orderBook.Bids, level)
	}

	// Get asks (sell orders) - grouped by price, ascending
	asksQuery := `
		SELECT price, SUM(remaining_quantity) as total_quantity, COUNT(*) as order_count
		FROM orders
		WHERE token_id = $1 AND side = 'ask' AND status = 'open'
		GROUP BY price
		ORDER BY price ASC
		LIMIT $2
	`

	rows, err = s.db.Query(asksQuery, tokenID, depth)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch asks: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var level models.OrderBookLevel
		if err := rows.Scan(&level.Price, &level.Quantity, &level.Orders); err != nil {
			continue
		}
		orderBook.Asks = append(orderBook.Asks, level)
	}

	// Calculate spread
	if len(orderBook.Bids) > 0 && len(orderBook.Asks) > 0 {
		orderBook.Spread = orderBook.Asks[0].Price - orderBook.Bids[0].Price
	}

	// Get last trade price
	lastPriceQuery := `
		SELECT price FROM trades
		WHERE token_id = $1
		ORDER BY executed_at DESC
		LIMIT 1
	`

	_ = s.db.QueryRow(lastPriceQuery, tokenID).Scan(&orderBook.LastPrice)

	// Cache order book
	_ = s.redis.SetJSON(cacheKey, orderBook, cache.OrderBookTTL)

	return &orderBook, nil
}

// CreateOrder creates a new order and attempts to match it
func (s *Service) CreateOrder(order *models.Order) (*models.Order, []*models.Trade, error) {
	// Validate order
	if err := s.validateOrder(order); err != nil {
		return nil, nil, err
	}

	// Start transaction
	tx, err := s.db.Begin()
	if err != nil {
		return nil, nil, fmt.Errorf("failed to start transaction: %w", err)
	}
	defer tx.Rollback()

	// Set default values
	order.ID = uuid.New().String()
	order.RemainingQuantity = order.Quantity
	order.FilledQuantity = 0
	order.Status = "open"
	order.CreatedAt = time.Now()
	order.UpdatedAt = time.Now()

	// Determine fee rate (taker for market orders, maker for limit orders)
	if order.ExecutionType == "market" {
		order.FeeRate = TakerFeeRate
	} else {
		order.FeeRate = MakerFeeRate
	}

	// Try to match order
	trades, err := s.matchOrder(tx, order)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to match order: %w", err)
	}

	// Insert order into database if not fully filled
	if order.RemainingQuantity > 0 {
		insertQuery := `
			INSERT INTO orders (
				id, user_id, token_id, order_type, side, price, quantity,
				filled_quantity, remaining_quantity, execution_type, time_in_force,
				status, fee_rate, fee_paid, created_at, updated_at
			)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
		`

		_, err = tx.Exec(insertQuery,
			order.ID, order.UserID, order.TokenID, order.OrderType, order.Side,
			order.Price, order.Quantity, order.FilledQuantity, order.RemainingQuantity,
			order.ExecutionType, order.TimeInForce, order.Status, order.FeeRate,
			order.FeePaid, order.CreatedAt, order.UpdatedAt,
		)

		if err != nil {
			return nil, nil, fmt.Errorf("failed to insert order: %w", err)
		}
	}

	// Commit transaction
	if err := tx.Commit(); err != nil {
		return nil, nil, fmt.Errorf("failed to commit transaction: %w", err)
	}

	// Invalidate order book cache
	_ = s.redis.Delete(cache.OrderBookKey(order.TokenID))

	return order, trades, nil
}

// matchOrder implements the order matching engine
func (s *Service) matchOrder(tx *sql.Tx, newOrder *models.Order) ([]*models.Trade, error) {
	trades := []*models.Trade{}

	// Determine opposite side
	oppositeSide := "ask"
	if newOrder.Side == "ask" {
		oppositeSide = "bid"
	}

	// Get matching orders from database
	var matchQuery string
	if newOrder.Side == "bid" {
		// For buy orders, get sell orders with price <= our price
		matchQuery = `
			SELECT id, user_id, price, remaining_quantity, fee_rate
			FROM orders
			WHERE token_id = $1 AND side = $2 AND status = 'open'
			  AND price <= $3
			ORDER BY price ASC, created_at ASC
		`
	} else {
		// For sell orders, get buy orders with price >= our price
		matchQuery = `
			SELECT id, user_id, price, remaining_quantity, fee_rate
			FROM orders
			WHERE token_id = $1 AND side = $2 AND status = 'open'
			  AND price >= $3
			ORDER BY price DESC, created_at ASC
		`
	}

	rows, err := tx.Query(matchQuery, newOrder.TokenID, oppositeSide, newOrder.Price)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	for rows.Next() && newOrder.RemainingQuantity > 0 {
		var matchingOrder struct {
			ID                string
			UserID            string
			Price             float64
			RemainingQuantity int64
			FeeRate           float64
		}

		if err := rows.Scan(
			&matchingOrder.ID,
			&matchingOrder.UserID,
			&matchingOrder.Price,
			&matchingOrder.RemainingQuantity,
			&matchingOrder.FeeRate,
		); err != nil {
			continue
		}

		// Determine match quantity
		matchQuantity := newOrder.RemainingQuantity
		if matchQuantity > matchingOrder.RemainingQuantity {
			matchQuantity = matchingOrder.RemainingQuantity
		}

		// Execute trade at matching order's price
		trade := &models.Trade{
			ID:            uuid.New().String(),
			TokenID:       newOrder.TokenID,
			Price:         matchingOrder.Price,
			Quantity:      matchQuantity,
			TotalValue:    float64(matchQuantity) * matchingOrder.Price,
			ExecutedAt:    time.Now(),
			SettlementStatus: "pending",
		}

		// Assign buyer and seller
		if newOrder.Side == "bid" {
			trade.BuyerOrderID = newOrder.ID
			trade.SellerOrderID = matchingOrder.ID
			trade.BuyerID = newOrder.UserID
			trade.SellerID = matchingOrder.UserID
			trade.BuyerFee = trade.TotalValue * newOrder.FeeRate
			trade.SellerFee = trade.TotalValue * matchingOrder.FeeRate
		} else {
			trade.BuyerOrderID = matchingOrder.ID
			trade.SellerOrderID = newOrder.ID
			trade.BuyerID = matchingOrder.UserID
			trade.SellerID = newOrder.UserID
			trade.BuyerFee = trade.TotalValue * matchingOrder.FeeRate
			trade.SellerFee = trade.TotalValue * newOrder.FeeRate
		}

		trade.PlatformFee = trade.BuyerFee + trade.SellerFee

		// Insert trade
		insertTradeQuery := `
			INSERT INTO trades (
				id, buyer_order_id, seller_order_id, buyer_id, seller_id, token_id,
				price, quantity, total_value, buyer_fee, seller_fee, platform_fee,
				settlement_status, executed_at
			)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
		`

		_, err = tx.Exec(insertTradeQuery,
			trade.ID, trade.BuyerOrderID, trade.SellerOrderID, trade.BuyerID,
			trade.SellerID, trade.TokenID, trade.Price, trade.Quantity,
			trade.TotalValue, trade.BuyerFee, trade.SellerFee, trade.PlatformFee,
			trade.SettlementStatus, trade.ExecutedAt,
		)

		if err != nil {
			log.Printf("Failed to insert trade: %v", err)
			continue
		}

		// Update matching order
		newMatchingRemaining := matchingOrder.RemainingQuantity - matchQuantity
		newMatchingStatus := "partially_filled"
		if newMatchingRemaining == 0 {
			newMatchingStatus = "filled"
		}

		updateMatchingQuery := `
			UPDATE orders
			SET filled_quantity = filled_quantity + $1,
			    remaining_quantity = $2,
			    status = $3,
			    fee_paid = fee_paid + $4,
			    updated_at = $5
			WHERE id = $6
		`

		_, err = tx.Exec(updateMatchingQuery,
			matchQuantity,
			newMatchingRemaining,
			newMatchingStatus,
			trade.SellerFee, // Fee for matching order
			time.Now(),
			matchingOrder.ID,
		)

		if err != nil {
			log.Printf("Failed to update matching order: %v", err)
			continue
		}

		// Update new order
		newOrder.FilledQuantity += matchQuantity
		newOrder.RemainingQuantity -= matchQuantity
		newOrder.FeePaid += trade.BuyerFee // Fee for new order

		if newOrder.RemainingQuantity == 0 {
			newOrder.Status = "filled"
		} else if newOrder.FilledQuantity > 0 {
			newOrder.Status = "partially_filled"
		}

		trades = append(trades, trade)
	}

	return trades, nil
}

// EstimateOrder estimates the execution of an order without placing it
func (s *Service) EstimateOrder(tokenID, orderType string, quantity int64, executionType string, price float64) (*models.OrderEstimate, error) {
	side := "bid"
	if orderType == "sell" {
		side = "ask"
	}

	// Create a temporary order for simulation
	tempOrder := &models.Order{
		TokenID:           tokenID,
		OrderType:         orderType,
		Side:              side,
		Price:             price,
		Quantity:          quantity,
		RemainingQuantity: quantity,
		ExecutionType:     executionType,
		FeeRate:           TakerFeeRate,
	}

	// Simulate matching (read-only)
	estimate := &models.OrderEstimate{
		Quantity:  quantity,
		FeeRate:   TakerFeeRate,
		Breakdown: models.OrderEstimateBreakdown{
			MatchedOrders: []models.OrderEstimateMatch{},
		},
		Warnings: []string{},
	}

	// Get opposite side orders
	oppositeSide := "ask"
	if side == "ask" {
		oppositeSide = "bid"
	}

	var matchQuery string
	if side == "bid" {
		matchQuery = `
			SELECT price, remaining_quantity
			FROM orders
			WHERE token_id = $1 AND side = $2 AND status = 'open'
			ORDER BY price ASC, created_at ASC
		`
	} else {
		matchQuery = `
			SELECT price, remaining_quantity
			FROM orders
			WHERE token_id = $1 AND side = $2 AND status = 'open'
			ORDER BY price DESC, created_at ASC
		`
	}

	rows, err := s.db.Query(matchQuery, tokenID, oppositeSide)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var totalCost float64
	matchedQuantity := int64(0)
	bestPrice := 0.0
	worstPrice := 0.0

	for rows.Next() && tempOrder.RemainingQuantity > 0 {
		var orderPrice float64
		var orderQuantity int64

		if err := rows.Scan(&orderPrice, &orderQuantity); err != nil {
			continue
		}

		// For limit orders, check price
		if executionType == "limit" {
			if side == "bid" && orderPrice > price {
				break
			}
			if side == "ask" && orderPrice < price {
				break
			}
		}

		if bestPrice == 0 {
			bestPrice = orderPrice
		}
		worstPrice = orderPrice

		matchQty := tempOrder.RemainingQuantity
		if matchQty > orderQuantity {
			matchQty = orderQuantity
		}

		subtotal := float64(matchQty) * orderPrice
		totalCost += subtotal
		matchedQuantity += matchQty
		tempOrder.RemainingQuantity -= matchQty

		estimate.Breakdown.MatchedOrders = append(estimate.Breakdown.MatchedOrders, models.OrderEstimateMatch{
			Price:    orderPrice,
			Quantity: matchQty,
			Subtotal: subtotal,
		})
		estimate.Breakdown.LevelsUsed++
	}

	if matchedQuantity == 0 {
		estimate.Warnings = append(estimate.Warnings, "Insufficient liquidity: No matching orders available")
		return estimate, nil
	}

	if matchedQuantity < quantity {
		estimate.Warnings = append(estimate.Warnings, fmt.Sprintf("Insufficient liquidity: Only %d tokens available", matchedQuantity))
	}

	estimate.EstimatedPrice = totalCost / float64(matchedQuantity)
	estimate.TotalFees = totalCost * estimate.FeeRate
	estimate.TotalCost = totalCost + estimate.TotalFees
	estimate.Breakdown.BestPrice = bestPrice
	estimate.Breakdown.WorstPrice = worstPrice

	// Calculate slippage
	if bestPrice > 0 {
		estimate.Slippage = ((estimate.EstimatedPrice - bestPrice) / bestPrice) * 100
		if estimate.Slippage > 2.0 {
			estimate.Warnings = append(estimate.Warnings, "High slippage: Consider splitting into smaller orders")
		}
	}

	return estimate, nil
}

// validateOrder validates order parameters
func (s *Service) validateOrder(order *models.Order) error {
	if order.Quantity <= 0 {
		return fmt.Errorf("quantity must be positive")
	}

	if order.ExecutionType == "limit" && order.Price <= 0 {
		return fmt.Errorf("limit orders must have a positive price")
	}

	if order.Side != "bid" && order.Side != "ask" {
		return fmt.Errorf("invalid order side")
	}

	return nil
}

// CancelOrder cancels an open order
func (s *Service) CancelOrder(orderID, userID string) error {
	query := `
		UPDATE orders
		SET status = 'cancelled', updated_at = NOW()
		WHERE id = $1 AND user_id = $2 AND status IN ('open', 'partially_filled')
	`

	result, err := s.db.Exec(query, orderID, userID)
	if err != nil {
		return fmt.Errorf("failed to cancel order: %w", err)
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		return fmt.Errorf("order not found or cannot be cancelled")
	}

	return nil
}

// GetUserOrders retrieves user's orders
func (s *Service) GetUserOrders(userID string, status *string, page, limit int) ([]*models.Order, *models.PaginationMeta, error) {
	offset := (page - 1) * limit

	var query string
	var args []interface{}

	if status != nil {
		query = `
			SELECT id, user_id, token_id, order_type, side, price, quantity,
			       filled_quantity, remaining_quantity, execution_type, time_in_force,
			       status, fee_rate, fee_paid, created_at, updated_at
			FROM orders
			WHERE user_id = $1 AND status = $2
			ORDER BY created_at DESC
			LIMIT $3 OFFSET $4
		`
		args = []interface{}{userID, *status, limit, offset}
	} else {
		query = `
			SELECT id, user_id, token_id, order_type, side, price, quantity,
			       filled_quantity, remaining_quantity, execution_type, time_in_force,
			       status, fee_rate, fee_paid, created_at, updated_at
			FROM orders
			WHERE user_id = $1
			ORDER BY created_at DESC
			LIMIT $2 OFFSET $3
		`
		args = []interface{}{userID, limit, offset}
	}

	rows, err := s.db.Query(query, args...)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to fetch orders: %w", err)
	}
	defer rows.Close()

	orders := []*models.Order{}
	for rows.Next() {
		var order models.Order
		if err := rows.Scan(
			&order.ID, &order.UserID, &order.TokenID, &order.OrderType, &order.Side,
			&order.Price, &order.Quantity, &order.FilledQuantity, &order.RemainingQuantity,
			&order.ExecutionType, &order.TimeInForce, &order.Status, &order.FeeRate,
			&order.FeePaid, &order.CreatedAt, &order.UpdatedAt,
		); err != nil {
			continue
		}
		orders = append(orders, &order)
	}

	// Get total count
	var countQuery string
	var countArgs []interface{}

	if status != nil {
		countQuery = `SELECT COUNT(*) FROM orders WHERE user_id = $1 AND status = $2`
		countArgs = []interface{}{userID, *status}
	} else {
		countQuery = `SELECT COUNT(*) FROM orders WHERE user_id = $1`
		countArgs = []interface{}{userID}
	}

	var total int
	_ = s.db.QueryRow(countQuery, countArgs...).Scan(&total)

	totalPages := (total + limit - 1) / limit
	pagination := &models.PaginationMeta{
		Page:       page,
		Limit:      limit,
		Total:      total,
		TotalPages: totalPages,
		HasNext:    page < totalPages,
		HasPrev:    page > 1,
	}

	return orders, pagination, nil
}

// GetTrades retrieves trades (user's trades or all trades for a token)
func (s *Service) GetTrades(userID *string, tokenID *string, page, limit int) ([]*models.Trade, *models.PaginationMeta, error) {
	offset := (page - 1) * limit

	var query string
	var args []interface{}

	if userID != nil {
		query = `
			SELECT id, buyer_order_id, seller_order_id, buyer_id, seller_id, token_id,
			       price, quantity, total_value, buyer_fee, seller_fee, platform_fee,
			       settlement_status, blockchain_tx_hash, executed_at, settled_at
			FROM trades
			WHERE buyer_id = $1 OR seller_id = $1
			ORDER BY executed_at DESC
			LIMIT $2 OFFSET $3
		`
		args = []interface{}{*userID, limit, offset}
	} else if tokenID != nil {
		query = `
			SELECT id, buyer_order_id, seller_order_id, buyer_id, seller_id, token_id,
			       price, quantity, total_value, buyer_fee, seller_fee, platform_fee,
			       settlement_status, blockchain_tx_hash, executed_at, settled_at
			FROM trades
			WHERE token_id = $1
			ORDER BY executed_at DESC
			LIMIT $2 OFFSET $3
		`
		args = []interface{}{*tokenID, limit, offset}
	} else {
		return nil, nil, fmt.Errorf("either userID or tokenID must be provided")
	}

	rows, err := s.db.Query(query, args...)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to fetch trades: %w", err)
	}
	defer rows.Close()

	trades := []*models.Trade{}
	for rows.Next() {
		var trade models.Trade
		if err := rows.Scan(
			&trade.ID, &trade.BuyerOrderID, &trade.SellerOrderID, &trade.BuyerID,
			&trade.SellerID, &trade.TokenID, &trade.Price, &trade.Quantity,
			&trade.TotalValue, &trade.BuyerFee, &trade.SellerFee, &trade.PlatformFee,
			&trade.SettlementStatus, &trade.BlockchainTxHash, &trade.ExecutedAt, &trade.SettledAt,
		); err != nil {
			continue
		}
		trades = append(trades, &trade)
	}

	// Get total count
	var countQuery string
	var countArgs []interface{}

	if userID != nil {
		countQuery = `SELECT COUNT(*) FROM trades WHERE buyer_id = $1 OR seller_id = $1`
		countArgs = []interface{}{*userID}
	} else if tokenID != nil {
		countQuery = `SELECT COUNT(*) FROM trades WHERE token_id = $1`
		countArgs = []interface{}{*tokenID}
	}

	var total int
	_ = s.db.QueryRow(countQuery, countArgs...).Scan(&total)

	totalPages := (total + limit - 1) / limit
	pagination := &models.PaginationMeta{
		Page:       page,
		Limit:      limit,
		Total:      total,
		TotalPages: totalPages,
		HasNext:    page < totalPages,
		HasPrev:    page > 1,
	}

	return trades, pagination, nil
}
