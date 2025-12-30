package testutil

import (
	"database/sql"
	"testing"
	"time"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/peoplecoin/backend/internal/database"
	"github.com/peoplecoin/backend/internal/config"
	"github.com/peoplecoin/backend/internal/models"
)

// NewMockDB creates a new mock database connection
func NewMockDB(t *testing.T) (*database.DB, sqlmock.Sqlmock, func()) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("failed to create mock database: %v", err)
	}

	return &database.DB{DB: db}, mock, func() {
		db.Close()
	}
}

// NewTestConfig creates a test configuration
func NewTestConfig() *config.Config {
	return &config.Config{
		Server: config.ServerConfig{
			Port: "8080",
			Env:  "test",
		},
		Database: config.DatabaseConfig{
			Host:     "localhost",
			Port:     "5432",
			User:     "test",
			Password: "test",
			DBName:   "test",
			SSLMode:  "disable",
		},
		JWT: config.JWTConfig{
			Secret:            "test-secret",
			RefreshSecret:     "test-refresh-secret",
			Expiration:        3600,
			RefreshExpiration: 604800,
		},
	}
}

// MockUser creates a mock user for testing
func MockUser() *models.User {
	now := time.Now()
	username := "testuser"
	email := "test@example.com"

	return &models.User{
		ID:            "550e8400-e29b-41d4-a716-446655440000",
		WalletAddress: "0x1234567890123456789012345678901234567890123456789012345678901234",
		Username:      &username,
		Email:         &email,
		Role:          "user",
		Status:        "active",
		CreatedAt:     now,
		UpdatedAt:     now,
	}
}

// MockToken creates a mock token for testing
func MockToken() *models.Token {
	now := time.Now()
	deployerAddr := "0x1234567890123456789012345678901234567890123456789012345678901234"
	poolAddr := "0xabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcd"

	return &models.Token{
		ID:              "660e8400-e29b-41d4-a716-446655440001",
		CreatorID:       "770e8400-e29b-41d4-a716-446655440002",
		CoinType:        "0x2::sui::SUI",
		Symbol:          "SARAH",
		DeployedAt:      now,
		DeployerAddress: &deployerAddr,
		PoolAddress:     &poolAddr,
		Status:          "active",
	}
}

// MockOrder creates a mock order for testing
func MockOrder(userID, tokenID string, side string, price float64, quantity int64) *models.Order {
	now := time.Now()
	orderType := "buy"
	if side == "ask" {
		orderType = "sell"
	}

	return &models.Order{
		ID:                "880e8400-e29b-41d4-a716-446655440003",
		UserID:            userID,
		TokenID:           tokenID,
		OrderType:         orderType,
		Side:              side,
		Price:             price,
		Quantity:          quantity,
		FilledQuantity:    0,
		RemainingQuantity: quantity,
		ExecutionType:     "limit",
		TimeInForce:       "GTC",
		Status:            "open",
		FeeRate:           0.003,
		FeePaid:           0,
		CreatedAt:         now,
		UpdatedAt:         now,
	}
}

// AnyTime is a matcher for sqlmock that matches any time.Time
type AnyTime struct{}

func (a AnyTime) Match(v interface{}) bool {
	_, ok := v.(time.Time)
	return ok
}

// AssertNoError fails the test if error is not nil
func AssertNoError(t *testing.T, err error, msg string) {
	t.Helper()
	if err != nil {
		t.Fatalf("%s: %v", msg, err)
	}
}

// AssertError fails the test if error is nil
func AssertError(t *testing.T, err error, msg string) {
	t.Helper()
	if err == nil {
		t.Fatalf("%s: expected error but got nil", msg)
	}
}

// AssertEqual fails the test if expected != actual
func AssertEqual(t *testing.T, expected, actual interface{}, msg string) {
	t.Helper()
	if expected != actual {
		t.Fatalf("%s: expected %v, got %v", msg, expected, actual)
	}
}

// AssertNotNil fails the test if value is nil
func AssertNotNil(t *testing.T, value interface{}, msg string) {
	t.Helper()
	if value == nil {
		t.Fatalf("%s: expected non-nil value", msg)
	}
}

// AssertNil fails the test if value is not nil
func AssertNil(t *testing.T, value interface{}, msg string) {
	t.Helper()
	if value != nil {
		t.Fatalf("%s: expected nil value, got %v", msg, value)
	}
}
