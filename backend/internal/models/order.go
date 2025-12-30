package models

import (
	"time"
)

type Order struct {
	ID                string    `json:"id"`
	UserID            string    `json:"userId"`
	TokenID           string    `json:"tokenId"`
	OrderType         string    `json:"orderType"` // "buy" or "sell"
	Side              string    `json:"side"`      // "bid" or "ask"
	Price             float64   `json:"price"`
	Quantity          int64     `json:"quantity"`
	FilledQuantity    int64     `json:"filledQuantity"`
	RemainingQuantity int64     `json:"remainingQuantity"`
	ExecutionType     string    `json:"executionType"` // "market" or "limit"
	TimeInForce       string    `json:"timeInForce"`   // "GTC", "IOC", "FOK"
	Status            string    `json:"status"`        // "open", "partially_filled", "filled", "cancelled", "rejected"
	FeeRate           float64   `json:"feeRate"`
	FeePaid           float64   `json:"feePaid"`
	CreatedAt         time.Time `json:"createdAt"`
	UpdatedAt         time.Time `json:"updatedAt"`
}

type Trade struct {
	ID                 string    `json:"id"`
	BuyerOrderID       string    `json:"buyerOrderId"`
	SellerOrderID      string    `json:"sellerOrderId"`
	BuyerID            string    `json:"buyerId"`
	SellerID           string    `json:"sellerId"`
	TokenID            string    `json:"tokenId"`
	Price              float64   `json:"price"`
	Quantity           int64     `json:"quantity"`
	TotalValue         float64   `json:"totalValue"`
	BuyerFee           float64   `json:"buyerFee"`
	SellerFee          float64   `json:"sellerFee"`
	PlatformFee        float64   `json:"platformFee"`
	SettlementStatus   string    `json:"settlementStatus"` // "pending", "settled", "failed"
	BlockchainTxHash   *string   `json:"blockchainTxHash,omitempty"`
	ExecutedAt         time.Time `json:"executedAt"`
	SettledAt          *time.Time `json:"settledAt,omitempty"`
}

// OrderBookLevel represents a price level in the order book
type OrderBookLevel struct {
	Price    float64 `json:"price"`
	Quantity int64   `json:"quantity"`
	Orders   int     `json:"orders"`
}

// OrderBook represents the full order book for a token
type OrderBook struct {
	TokenID    string           `json:"tokenId"`
	Bids       []OrderBookLevel `json:"bids"` // Buy orders (descending price)
	Asks       []OrderBookLevel `json:"asks"` // Sell orders (ascending price)
	Spread     float64          `json:"spread"`
	LastPrice  float64          `json:"lastPrice"`
	UpdatedAt  time.Time        `json:"updatedAt"`
}

// OrderEstimate represents the estimated execution of an order
type OrderEstimate struct {
	EstimatedPrice  float64                `json:"estimatedPrice"`
	TotalCost       float64                `json:"totalCost"`
	Quantity        int64                  `json:"quantity"`
	FeeRate         float64                `json:"feeRate"`
	TotalFees       float64                `json:"totalFees"`
	Slippage        float64                `json:"slippage"`
	Breakdown       OrderEstimateBreakdown `json:"breakdown"`
	Warnings        []string               `json:"warnings"`
}

type OrderEstimateBreakdown struct {
	BestPrice    float64               `json:"bestPrice"`
	WorstPrice   float64               `json:"worstPrice"`
	LevelsUsed   int                   `json:"levelsUsed"`
	MatchedOrders []OrderEstimateMatch `json:"matchedOrders"`
}

type OrderEstimateMatch struct {
	Price    float64 `json:"price"`
	Quantity int64   `json:"quantity"`
	Subtotal float64 `json:"subtotal"`
}
