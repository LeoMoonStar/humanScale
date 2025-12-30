package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/peoplecoin/backend/internal/testutil"
	"github.com/stretchr/testify/assert"
)

func TestAuthRequired(t *testing.T) {
	gin.SetMode(gin.TestMode)
	cfg := testutil.NewTestConfig()

	// Create a valid token
	validToken := createTestToken(t, cfg.JWT.Secret, "user-id", "wallet-address", "user", time.Hour)

	// Create an expired token
	expiredToken := createTestToken(t, cfg.JWT.Secret, "user-id", "wallet-address", "user", -time.Hour)

	// Create a token with invalid signature
	invalidToken := createTestToken(t, "wrong-secret", "user-id", "wallet-address", "user", time.Hour)

	tests := []struct {
		name           string
		authHeader     string
		expectedStatus int
		expectAbort    bool
	}{
		{
			name:           "Valid token",
			authHeader:     "Bearer " + validToken,
			expectedStatus: http.StatusOK,
			expectAbort:    false,
		},
		{
			name:           "No authorization header",
			authHeader:     "",
			expectedStatus: http.StatusUnauthorized,
			expectAbort:    true,
		},
		{
			name:           "Invalid header format - no Bearer",
			authHeader:     validToken,
			expectedStatus: http.StatusUnauthorized,
			expectAbort:    true,
		},
		{
			name:           "Expired token",
			authHeader:     "Bearer " + expiredToken,
			expectedStatus: http.StatusUnauthorized,
			expectAbort:    true,
		},
		{
			name:           "Invalid signature",
			authHeader:     "Bearer " + invalidToken,
			expectedStatus: http.StatusUnauthorized,
			expectAbort:    true,
		},
		{
			name:           "Malformed token",
			authHeader:     "Bearer invalid.token.here",
			expectedStatus: http.StatusUnauthorized,
			expectAbort:    true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Setup
			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)

			// Create request with auth header
			req, _ := http.NewRequest("GET", "/test", nil)
			if tt.authHeader != "" {
				req.Header.Set("Authorization", tt.authHeader)
			}
			c.Request = req

			// Execute middleware
			authMiddleware := AuthRequired(cfg)

			// Add a test handler to verify context values
			handlerCalled := false
			testHandler := func(c *gin.Context) {
				handlerCalled = true
				c.Status(http.StatusOK)
			}

			authMiddleware(c)

			// If not aborted, call test handler
			if !c.IsAborted() {
				testHandler(c)
			}

			// Assertions
			assert.Equal(t, tt.expectedStatus, w.Code)
			assert.Equal(t, !tt.expectAbort, handlerCalled)

			// Verify context values were set for valid tokens
			if !tt.expectAbort {
				userID, exists := c.Get("userID")
				assert.True(t, exists)
				assert.Equal(t, "user-id", userID)

				walletAddress, exists := c.Get("walletAddress")
				assert.True(t, exists)
				assert.Equal(t, "wallet-address", walletAddress)

				role, exists := c.Get("role")
				assert.True(t, exists)
				assert.Equal(t, "user", role)
			}
		})
	}
}

func TestGetUserID(t *testing.T) {
	gin.SetMode(gin.TestMode)

	tests := []struct {
		name        string
		setupContext func(*gin.Context)
		wantUserID  string
		wantExists  bool
	}{
		{
			name: "User ID exists",
			setupContext: func(c *gin.Context) {
				c.Set("userID", "test-user-id")
			},
			wantUserID: "test-user-id",
			wantExists: true,
		},
		{
			name:        "User ID not set",
			setupContext: func(c *gin.Context) {},
			wantUserID:  "",
			wantExists:  false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			c, _ := gin.CreateTestContext(httptest.NewRecorder())
			tt.setupContext(c)

			userID, exists := GetUserID(c)

			assert.Equal(t, tt.wantUserID, userID)
			assert.Equal(t, tt.wantExists, exists)
		})
	}
}

func TestGetWalletAddress(t *testing.T) {
	gin.SetMode(gin.TestMode)

	tests := []struct {
		name              string
		setupContext      func(*gin.Context)
		wantWalletAddress string
		wantExists        bool
	}{
		{
			name: "Wallet address exists",
			setupContext: func(c *gin.Context) {
				c.Set("walletAddress", "0x1234567890123456789012345678901234567890123456789012345678901234")
			},
			wantWalletAddress: "0x1234567890123456789012345678901234567890123456789012345678901234",
			wantExists:        true,
		},
		{
			name:              "Wallet address not set",
			setupContext:      func(c *gin.Context) {},
			wantWalletAddress: "",
			wantExists:        false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			c, _ := gin.CreateTestContext(httptest.NewRecorder())
			tt.setupContext(c)

			walletAddress, exists := GetWalletAddress(c)

			assert.Equal(t, tt.wantWalletAddress, walletAddress)
			assert.Equal(t, tt.wantExists, exists)
		})
	}
}

// Helper function to create test JWT tokens
func createTestToken(t *testing.T, secret string, userID, walletAddress, role string, expiration time.Duration) string {
	claims := &Claims{
		UserID:        userID,
		WalletAddress: walletAddress,
		Role:          role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(expiration)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString([]byte(secret))
	if err != nil {
		t.Fatalf("Failed to create test token: %v", err)
	}

	return tokenString
}
