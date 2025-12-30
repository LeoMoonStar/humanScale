package models

import (
	"time"
)

type Token struct {
	ID              string    `json:"id"`
	CreatorID       string    `json:"creatorId"`
	CoinType        string    `json:"coinType"`
	Symbol          string    `json:"symbol"`
	DeployedAt      time.Time `json:"deployedAt"`
	DeployerAddress *string   `json:"deployerAddress,omitempty"`
	PoolAddress     *string   `json:"poolAddress,omitempty"`
	Status          string    `json:"status"`
}

// TokenInfo combines database token with live blockchain data
type TokenInfo struct {
	Token
	// Live data from third-party APIs
	Price          float64 `json:"price"`
	PriceChange24h float64 `json:"priceChange24h"`
	Volume24h      float64 `json:"volume24h"`
	MarketCap      float64 `json:"marketCap"`
	TotalSupply    string  `json:"totalSupply"`
	Holders        int     `json:"holders"`
}

type TokenHolder struct {
	Address    string  `json:"address"`
	Balance    string  `json:"balance"`
	Percentage float64 `json:"percentage"`
}

type TokenTransaction struct {
	Hash      string    `json:"hash"`
	From      string    `json:"from"`
	To        string    `json:"to"`
	Amount    string    `json:"amount"`
	Timestamp int64     `json:"timestamp"`
	Type      string    `json:"type"`
}
