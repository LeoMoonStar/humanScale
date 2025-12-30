package coingecko

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

type Client struct {
	baseURL    string
	apiKey     string
	httpClient *http.Client
}

func NewClient(baseURL, apiKey string) *Client {
	return &Client{
		baseURL: baseURL,
		apiKey:  apiKey,
		httpClient: &http.Client{
			Timeout: 10 * time.Second,
		},
	}
}

type TokenPrice struct {
	USD          float64 `json:"usd"`
	USD24hChange float64 `json:"usd_24h_change"`
	USD24hVol    float64 `json:"usd_24h_vol"`
	USDMarketCap float64 `json:"usd_market_cap"`
}

// GetTokenPrice fetches token price from CoinGecko
func (c *Client) GetTokenPrice(coinType string) (*TokenPrice, error) {
	url := fmt.Sprintf("%s/simple/token_price/sui?contract_addresses=%s&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true&include_market_cap=true",
		c.baseURL, coinType)

	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}

	// Add API key if provided
	if c.apiKey != "" {
		req.Header.Set("X-CG-API-KEY", c.apiKey)
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("coingecko API error: %d - %s", resp.StatusCode, string(body))
	}

	var priceData map[string]TokenPrice
	if err := json.NewDecoder(resp.Body).Decode(&priceData); err != nil {
		return nil, err
	}

	// Get price for the specific coin type (case-insensitive)
	for key, price := range priceData {
		if key == coinType {
			return &price, nil
		}
	}

	// If not found, return default values
	return &TokenPrice{
		USD:          0,
		USD24hChange: 0,
		USD24hVol:    0,
		USDMarketCap: 0,
	}, nil
}
