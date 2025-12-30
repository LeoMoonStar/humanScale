package auth

import (
	"database/sql"
	"testing"
	"time"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/peoplecoin/backend/internal/testutil"
	"github.com/stretchr/testify/assert"
)

func TestRequestNonce(t *testing.T) {
	db, mock, cleanup := testutil.NewMockDB(t)
	defer cleanup()

	cfg := testutil.NewTestConfig()
	service := NewService(db, cfg)

	walletAddress := "0x1234567890123456789012345678901234567890123456789012345678901234"

	tests := []struct {
		name          string
		walletAddress string
		setupMock     func()
		wantError     bool
	}{
		{
			name:          "Valid wallet address",
			walletAddress: walletAddress,
			setupMock: func() {
				mock.ExpectExec("INSERT INTO users").
					WithArgs(walletAddress, sqlmock.AnyArg(), sqlmock.AnyArg()).
					WillReturnResult(sqlmock.NewResult(1, 1))
			},
			wantError: false,
		},
		{
			name:          "Invalid wallet address - too short",
			walletAddress: "0x123",
			setupMock:     func() {},
			wantError:     true,
		},
		{
			name:          "Invalid wallet address - no 0x prefix",
			walletAddress: "1234567890123456789012345678901234567890123456789012345678901234",
			setupMock:     func() {},
			wantError:     true,
		},
		{
			name:          "Database error",
			walletAddress: walletAddress,
			setupMock: func() {
				mock.ExpectExec("INSERT INTO users").
					WithArgs(walletAddress, sqlmock.AnyArg(), sqlmock.AnyArg()).
					WillReturnError(sql.ErrConnDone)
			},
			wantError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			tt.setupMock()

			resp, err := service.RequestNonce(tt.walletAddress)

			if tt.wantError {
				assert.Error(t, err)
				assert.Nil(t, resp)
			} else {
				assert.NoError(t, err)
				assert.NotNil(t, resp)
				assert.NotEmpty(t, resp.Nonce)
				assert.Contains(t, resp.Nonce, "Sign this message to authenticate:")
				assert.NotEmpty(t, resp.ExpiresAt)

				// Verify nonce format
				assert.Greater(t, len(resp.Nonce), 40) // Should include random hex
			}

			// Verify all expectations were met
			if err := mock.ExpectationsWereMet(); err != nil && !tt.wantError {
				t.Errorf("unfulfilled expectations: %s", err)
			}
		})
	}
}

func TestVerifySignature(t *testing.T) {
	db, mock, cleanup := testutil.NewMockDB(t)
	defer cleanup()

	cfg := testutil.NewTestConfig()
	service := NewService(db, cfg)

	walletAddress := "0x1234567890123456789012345678901234567890123456789012345678901234"
	nonce := "Sign this message to authenticate: abc123def456"
	signature := "test-signature"
	userID := "550e8400-e29b-41d4-a716-446655440000"

	tests := []struct {
		name      string
		setupMock func()
		wantError bool
		isNewUser bool
	}{
		{
			name: "Valid signature - existing user",
			setupMock: func() {
				rows := sqlmock.NewRows([]string{
					"id", "wallet_address", "username", "email", "role",
					"nonce", "nonce_expires_at", "created_at",
				}).AddRow(
					userID, walletAddress, nil, nil, "user",
					nonce, time.Now().Add(5*time.Minute), time.Now().Add(-24*time.Hour),
				)

				mock.ExpectQuery("SELECT (.+) FROM users WHERE wallet_address").
					WithArgs(walletAddress).
					WillReturnRows(rows)

				mock.ExpectExec("UPDATE users SET last_login_at").
					WithArgs(walletAddress).
					WillReturnResult(sqlmock.NewResult(1, 1))
			},
			wantError: false,
			isNewUser: false,
		},
		{
			name: "Valid signature - new user",
			setupMock: func() {
				rows := sqlmock.NewRows([]string{
					"id", "wallet_address", "username", "email", "role",
					"nonce", "nonce_expires_at", "created_at",
				}).AddRow(
					userID, walletAddress, nil, nil, "user",
					nonce, time.Now().Add(5*time.Minute), time.Now().Add(-30*time.Second),
				)

				mock.ExpectQuery("SELECT (.+) FROM users WHERE wallet_address").
					WithArgs(walletAddress).
					WillReturnRows(rows)

				mock.ExpectExec("UPDATE users SET last_login_at").
					WithArgs(walletAddress).
					WillReturnResult(sqlmock.NewResult(1, 1))
			},
			wantError: false,
			isNewUser: true,
		},
		{
			name: "No nonce found",
			setupMock: func() {
				mock.ExpectQuery("SELECT (.+) FROM users WHERE wallet_address").
					WithArgs(walletAddress).
					WillReturnError(sql.ErrNoRows)
			},
			wantError: true,
		},
		{
			name: "Expired nonce",
			setupMock: func() {
				rows := sqlmock.NewRows([]string{
					"id", "wallet_address", "username", "email", "role",
					"nonce", "nonce_expires_at", "created_at",
				}).AddRow(
					userID, walletAddress, nil, nil, "user",
					nonce, time.Now().Add(-1*time.Minute), time.Now(),
				)

				mock.ExpectQuery("SELECT (.+) FROM users WHERE wallet_address").
					WithArgs(walletAddress).
					WillReturnRows(rows)
			},
			wantError: true,
		},
		{
			name: "Invalid nonce mismatch",
			setupMock: func() {
				rows := sqlmock.NewRows([]string{
					"id", "wallet_address", "username", "email", "role",
					"nonce", "nonce_expires_at", "created_at",
				}).AddRow(
					userID, walletAddress, nil, nil, "user",
					"different-nonce", time.Now().Add(5*time.Minute), time.Now(),
				)

				mock.ExpectQuery("SELECT (.+) FROM users WHERE wallet_address").
					WithArgs(walletAddress).
					WillReturnRows(rows)
			},
			wantError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			tt.setupMock()

			resp, err := service.VerifySignature(walletAddress, signature, nonce)

			if tt.wantError {
				assert.Error(t, err)
				assert.Nil(t, resp)
			} else {
				assert.NoError(t, err)
				assert.NotNil(t, resp)
				assert.NotEmpty(t, resp.AccessToken)
				assert.NotEmpty(t, resp.RefreshToken)
				assert.Equal(t, cfg.JWT.Expiration, resp.ExpiresIn)
				assert.Equal(t, tt.isNewUser, resp.IsNewUser)
				assert.NotNil(t, resp.User)
				assert.Equal(t, walletAddress, resp.User.WalletAddress)
			}

			if err := mock.ExpectationsWereMet(); err != nil && !tt.wantError {
				t.Errorf("unfulfilled expectations: %s", err)
			}
		})
	}
}

func TestGenerateAccessToken(t *testing.T) {
	cfg := testutil.NewTestConfig()
	service := &Service{cfg: cfg}

	userID := "550e8400-e29b-41d4-a716-446655440000"
	walletAddress := "0x1234567890123456789012345678901234567890123456789012345678901234"
	role := "user"

	token, err := service.generateAccessToken(userID, walletAddress, role)

	assert.NoError(t, err)
	assert.NotEmpty(t, token)

	// Token should be a valid JWT format (3 parts separated by dots)
	// We don't verify the actual content here, that's tested in middleware
	assert.Contains(t, token, ".")
}

func TestGenerateRefreshToken(t *testing.T) {
	cfg := testutil.NewTestConfig()
	service := &Service{cfg: cfg}

	userID := "550e8400-e29b-41d4-a716-446655440000"
	walletAddress := "0x1234567890123456789012345678901234567890123456789012345678901234"

	token, err := service.generateRefreshToken(userID, walletAddress)

	assert.NoError(t, err)
	assert.NotEmpty(t, token)
	assert.Contains(t, token, ".")
}

func TestIsValidSuiAddress(t *testing.T) {
	tests := []struct {
		name    string
		address string
		want    bool
	}{
		{
			name:    "Valid Sui address",
			address: "0x1234567890123456789012345678901234567890123456789012345678901234",
			want:    true,
		},
		{
			name:    "Too short",
			address: "0x123",
			want:    false,
		},
		{
			name:    "Too long",
			address: "0x12345678901234567890123456789012345678901234567890123456789012345",
			want:    false,
		},
		{
			name:    "Missing 0x prefix",
			address: "1234567890123456789012345678901234567890123456789012345678901234",
			want:    false,
		},
		{
			name:    "Invalid hex characters",
			address: "0x123456789012345678901234567890123456789012345678901234567890WXYZ",
			want:    false,
		},
		{
			name:    "Empty string",
			address: "",
			want:    false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := isValidSuiAddress(tt.address)
			assert.Equal(t, tt.want, got)
		})
	}
}

func TestGenerateNonce(t *testing.T) {
	// Generate multiple nonces to ensure they're unique
	nonces := make(map[string]bool)

	for i := 0; i < 100; i++ {
		nonce, err := generateNonce()

		assert.NoError(t, err)
		assert.NotEmpty(t, nonce)
		assert.Contains(t, nonce, "Sign this message to authenticate:")

		// Check uniqueness
		assert.False(t, nonces[nonce], "Nonce should be unique")
		nonces[nonce] = true

		// Check length (should have prefix + 32 hex characters)
		assert.Greater(t, len(nonce), 40)
	}
}
