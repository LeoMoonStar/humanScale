package suiscan

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

type Client struct {
	baseURL    string
	httpClient *http.Client
}

func NewClient(baseURL string) *Client {
	return &Client{
		baseURL: baseURL,
		httpClient: &http.Client{
			Timeout: 10 * time.Second,
		},
	}
}

type CoinMetadata struct {
	Symbol      string `json:"symbol"`
	Name        string `json:"name"`
	Decimals    int    `json:"decimals"`
	TotalSupply string `json:"totalSupply"`
	Holders     int    `json:"holders"`
}

type Holder struct {
	Address    string  `json:"address"`
	Balance    string  `json:"balance"`
	Percentage float64 `json:"percentage"`
}

type HoldersResponse struct {
	Holders []Holder `json:"holders"`
	Total   int      `json:"total"`
}

type Transaction struct {
	Hash      string `json:"hash"`
	From      string `json:"from"`
	To        string `json:"to"`
	Amount    string `json:"amount"`
	Timestamp int64  `json:"timestamp"`
	Type      string `json:"type"`
}

type TransactionsResponse struct {
	Transactions []Transaction `json:"transactions"`
	Total        int           `json:"total"`
}

// GetCoinMetadata fetches token metadata from SuiScan
func (c *Client) GetCoinMetadata(coinType string) (*CoinMetadata, error) {
	url := fmt.Sprintf("%s/coin/%s", c.baseURL, coinType)

	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("suiscan API error: %d - %s", resp.StatusCode, string(body))
	}

	var metadata CoinMetadata
	if err := json.NewDecoder(resp.Body).Decode(&metadata); err != nil {
		return nil, err
	}

	return &metadata, nil
}

// GetHolders fetches token holders from SuiScan
func (c *Client) GetHolders(coinType string, page, limit int) (*HoldersResponse, error) {
	url := fmt.Sprintf("%s/coin/%s/holders?page=%d&limit=%d", c.baseURL, coinType, page, limit)

	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("suiscan API error: %d - %s", resp.StatusCode, string(body))
	}

	var holdersResp HoldersResponse
	if err := json.NewDecoder(resp.Body).Decode(&holdersResp); err != nil {
		return nil, err
	}

	return &holdersResp, nil
}

// GetTransactions fetches token transactions from SuiScan
func (c *Client) GetTransactions(coinType string, page, limit int) (*TransactionsResponse, error) {
	url := fmt.Sprintf("%s/coin/%s/transactions?page=%d&limit=%d", c.baseURL, coinType, page, limit)

	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("suiscan API error: %d - %s", resp.StatusCode, string(body))
	}

	var txsResp TransactionsResponse
	if err := json.NewDecoder(resp.Body).Decode(&txsResp); err != nil {
		return nil, err
	}

	return &txsResp, nil
}
