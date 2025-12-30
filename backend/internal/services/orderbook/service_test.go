package orderbook

import (
	"testing"
	"time"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/peoplecoin/backend/internal/cache"
	"github.com/peoplecoin/backend/internal/models"
	"github.com/peoplecoin/backend/internal/testutil"
	"github.com/stretchr/testify/assert"
)

func TestGetOrderBook(t *testing.T) {
	db, mock, cleanup := testutil.NewMockDB(t)
	defer cleanup()

	redisClient := &cache.RedisClient{} // Mock Redis (won't actually connect)
	service := NewService(db, redisClient)

	tokenID := "660e8400-e29b-41d4-a716-446655440001"
	depth := 20

	tests := []struct {
		name      string
		setupMock func()
		wantError bool
		wantBids  int
		wantAsks  int
	}{
		{
			name: "Successful order book retrieval",
			setupMock: func() {
				// Mock bids query
				bidsRows := sqlmock.NewRows([]string{"price", "total_quantity", "order_count"}).
					AddRow(2.45, 1000, 3).
					AddRow(2.44, 1500, 5).
					AddRow(2.43, 800, 2)

				mock.ExpectQuery("SELECT price, SUM\\(remaining_quantity\\)").
					WithArgs(tokenID, depth).
					WillReturnRows(bidsRows)

				// Mock asks query
				asksRows := sqlmock.NewRows([]string{"price", "total_quantity", "order_count"}).
					AddRow(2.46, 900, 2).
					AddRow(2.47, 1200, 4).
					AddRow(2.48, 600, 1)

				mock.ExpectQuery("SELECT price, SUM\\(remaining_quantity\\)").
					WithArgs(tokenID, depth).
					WillReturnRows(asksRows)

				// Mock last price query
				lastPriceRows := sqlmock.NewRows([]string{"price"}).
					AddRow(2.45)

				mock.ExpectQuery("SELECT price FROM trades").
					WithArgs(tokenID).
					WillReturnRows(lastPriceRows)
			},
			wantError: false,
			wantBids:  3,
			wantAsks:  3,
		},
		{
			name: "Empty order book",
			setupMock: func() {
				// Empty bids
				mock.ExpectQuery("SELECT price, SUM\\(remaining_quantity\\)").
					WithArgs(tokenID, depth).
					WillReturnRows(sqlmock.NewRows([]string{"price", "total_quantity", "order_count"}))

				// Empty asks
				mock.ExpectQuery("SELECT price, SUM\\(remaining_quantity\\)").
					WithArgs(tokenID, depth).
					WillReturnRows(sqlmock.NewRows([]string{"price", "total_quantity", "order_count"}))

				// No last price
				mock.ExpectQuery("SELECT price FROM trades").
					WithArgs(tokenID).
					WillReturnRows(sqlmock.NewRows([]string{"price"}))
			},
			wantError: false,
			wantBids:  0,
			wantAsks:  0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			tt.setupMock()

			orderBook, err := service.GetOrderBook(tokenID, depth)

			if tt.wantError {
				assert.Error(t, err)
				assert.Nil(t, orderBook)
			} else {
				assert.NoError(t, err)
				assert.NotNil(t, orderBook)
				assert.Equal(t, tokenID, orderBook.TokenID)
				assert.Len(t, orderBook.Bids, tt.wantBids)
				assert.Len(t, orderBook.Asks, tt.wantAsks)

				// Verify spread calculation
				if len(orderBook.Bids) > 0 && len(orderBook.Asks) > 0 {
					expectedSpread := orderBook.Asks[0].Price - orderBook.Bids[0].Price
					assert.Equal(t, expectedSpread, orderBook.Spread)
				}
			}

			assert.NoError(t, mock.ExpectationsWereMet())
		})
	}
}

func TestEstimateOrder(t *testing.T) {
	db, mock, cleanup := testutil.NewMockDB(t)
	defer cleanup()

	redisClient := &cache.RedisClient{}
	service := NewService(db, redisClient)

	tokenID := "660e8400-e29b-41d4-a716-446655440001"

	tests := []struct {
		name              string
		orderType         string
		quantity          int64
		executionType     string
		price             float64
		setupMock         func()
		wantError         bool
		expectedPrice     float64
		expectedSlippage  float64
		expectedWarnings  int
	}{
		{
			name:          "Market buy order - sufficient liquidity",
			orderType:     "buy",
			quantity:      1000,
			executionType: "market",
			price:         0,
			setupMock: func() {
				rows := sqlmock.NewRows([]string{"price", "remaining_quantity"}).
					AddRow(2.46, 500).
					AddRow(2.47, 300).
					AddRow(2.48, 200)

				mock.ExpectQuery("SELECT price, remaining_quantity").
					WithArgs(tokenID, "ask").
					WillReturnRows(rows)
			},
			wantError:        false,
			expectedPrice:    2.465,     // Weighted average
			expectedSlippage: 0.20325203, // ~0.2%
			expectedWarnings: 0,
		},
		{
			name:          "Market buy order - insufficient liquidity",
			orderType:     "buy",
			quantity:      2000,
			executionType: "market",
			price:         0,
			setupMock: func() {
				rows := sqlmock.NewRows([]string{"price", "remaining_quantity"}).
					AddRow(2.46, 500).
					AddRow(2.47, 300)

				mock.ExpectQuery("SELECT price, remaining_quantity").
					WithArgs(tokenID, "ask").
					WillReturnRows(rows)
			},
			wantError:        false,
			expectedWarnings: 1, // Should warn about insufficient liquidity
		},
		{
			name:          "Limit buy order - within price range",
			orderType:     "buy",
			quantity:      500,
			executionType: "limit",
			price:         2.47,
			setupMock: func() {
				rows := sqlmock.NewRows([]string{"price", "remaining_quantity"}).
					AddRow(2.46, 300).
					AddRow(2.47, 200).
					AddRow(2.48, 100)

				mock.ExpectQuery("SELECT price, remaining_quantity").
					WithArgs(tokenID, "ask").
					WillReturnRows(rows)
			},
			wantError:     false,
			expectedPrice: 2.46, // Only matches at 2.46 and 2.47
		},
		{
			name:          "Market sell order",
			orderType:     "sell",
			quantity:      800,
			executionType: "market",
			price:         0,
			setupMock: func() {
				rows := sqlmock.NewRows([]string{"price", "remaining_quantity"}).
					AddRow(2.45, 500).
					AddRow(2.44, 300).
					AddRow(2.43, 200)

				mock.ExpectQuery("SELECT price, remaining_quantity").
					WithArgs(tokenID, "bid").
					WillReturnRows(rows)
			},
			wantError: false,
		},
		{
			name:          "High slippage warning",
			orderType:     "buy",
			quantity:      5000,
			executionType: "market",
			price:         0,
			setupMock: func() {
				rows := sqlmock.NewRows([]string{"price", "remaining_quantity"}).
					AddRow(2.46, 1000).
					AddRow(2.50, 1000).
					AddRow(2.55, 1000).
					AddRow(2.60, 1000).
					AddRow(2.65, 1000)

				mock.ExpectQuery("SELECT price, remaining_quantity").
					WithArgs(tokenID, "ask").
					WillReturnRows(rows)
			},
			wantError:        false,
			expectedWarnings: 1, // Should warn about high slippage
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			tt.setupMock()

			estimate, err := service.EstimateOrder(
				tokenID,
				tt.orderType,
				tt.quantity,
				tt.executionType,
				tt.price,
			)

			if tt.wantError {
				assert.Error(t, err)
				assert.Nil(t, estimate)
			} else {
				assert.NoError(t, err)
				assert.NotNil(t, estimate)
				assert.Equal(t, tt.quantity, estimate.Quantity)
				assert.Equal(t, TakerFeeRate, estimate.FeeRate)

				if tt.expectedPrice > 0 {
					assert.InDelta(t, tt.expectedPrice, estimate.EstimatedPrice, 0.01)
				}

				if tt.expectedWarnings > 0 {
					assert.GreaterOrEqual(t, len(estimate.Warnings), tt.expectedWarnings)
				}

				// Verify breakdown
				assert.NotNil(t, estimate.Breakdown)
				assert.GreaterOrEqual(t, len(estimate.Breakdown.MatchedOrders), 0)
			}

			assert.NoError(t, mock.ExpectationsWereMet())
		})
	}
}

func TestValidateOrder(t *testing.T) {
	service := &Service{}

	tests := []struct {
		name      string
		order     *models.Order
		wantError bool
	}{
		{
			name: "Valid market order",
			order: &models.Order{
				Quantity:      1000,
				ExecutionType: "market",
				Side:          "bid",
			},
			wantError: false,
		},
		{
			name: "Valid limit order",
			order: &models.Order{
				Quantity:      1000,
				ExecutionType: "limit",
				Price:         2.45,
				Side:          "ask",
			},
			wantError: false,
		},
		{
			name: "Invalid - zero quantity",
			order: &models.Order{
				Quantity:      0,
				ExecutionType: "market",
				Side:          "bid",
			},
			wantError: true,
		},
		{
			name: "Invalid - negative quantity",
			order: &models.Order{
				Quantity:      -100,
				ExecutionType: "market",
				Side:          "bid",
			},
			wantError: true,
		},
		{
			name: "Invalid - limit order without price",
			order: &models.Order{
				Quantity:      1000,
				ExecutionType: "limit",
				Price:         0,
				Side:          "bid",
			},
			wantError: true,
		},
		{
			name: "Invalid - limit order with negative price",
			order: &models.Order{
				Quantity:      1000,
				ExecutionType: "limit",
				Price:         -2.45,
				Side:          "bid",
			},
			wantError: true,
		},
		{
			name: "Invalid - invalid side",
			order: &models.Order{
				Quantity:      1000,
				ExecutionType: "market",
				Side:          "invalid",
			},
			wantError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := service.validateOrder(tt.order)

			if tt.wantError {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
			}
		})
	}
}

func TestCancelOrder(t *testing.T) {
	db, mock, cleanup := testutil.NewMockDB(t)
	defer cleanup()

	redisClient := &cache.RedisClient{}
	service := NewService(db, redisClient)

	orderID := "880e8400-e29b-41d4-a716-446655440003"
	userID := "550e8400-e29b-41d4-a716-446655440000"

	tests := []struct {
		name      string
		setupMock func()
		wantError bool
	}{
		{
			name: "Successfully cancel order",
			setupMock: func() {
				mock.ExpectExec("UPDATE orders SET status").
					WithArgs(orderID, userID).
					WillReturnResult(sqlmock.NewResult(1, 1))
			},
			wantError: false,
		},
		{
			name: "Order not found",
			setupMock: func() {
				mock.ExpectExec("UPDATE orders SET status").
					WithArgs(orderID, userID).
					WillReturnResult(sqlmock.NewResult(0, 0))
			},
			wantError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			tt.setupMock()

			err := service.CancelOrder(orderID, userID)

			if tt.wantError {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
			}

			assert.NoError(t, mock.ExpectationsWereMet())
		})
	}
}

func TestFeeCalculation(t *testing.T) {
	tests := []struct {
		name          string
		executionType string
		expectedRate  float64
	}{
		{
			name:          "Market order - taker fee",
			executionType: "market",
			expectedRate:  TakerFeeRate,
		},
		{
			name:          "Limit order - maker fee",
			executionType: "limit",
			expectedRate:  MakerFeeRate,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			order := &models.Order{
				ExecutionType: tt.executionType,
			}

			if order.ExecutionType == "market" {
				order.FeeRate = TakerFeeRate
			} else {
				order.FeeRate = MakerFeeRate
			}

			assert.Equal(t, tt.expectedRate, order.FeeRate)
		})
	}
}
