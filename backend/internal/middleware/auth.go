package middleware

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/peoplecoin/backend/internal/config"
	"github.com/peoplecoin/backend/internal/models"
)

type Claims struct {
	UserID        string `json:"userId"`
	WalletAddress string `json:"walletAddress"`
	Role          string `json:"role"`
	jwt.RegisteredClaims
}

// AuthRequired middleware verifies JWT token
func AuthRequired(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")

		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, models.APIResponse{
				Success: false,
				Error:   "No authorization token provided",
			})
			c.Abort()
			return
		}

		// Check if header starts with "Bearer "
		if !strings.HasPrefix(authHeader, "Bearer ") {
			c.JSON(http.StatusUnauthorized, models.APIResponse{
				Success: false,
				Error:   "Invalid authorization header format",
			})
			c.Abort()
			return
		}

		// Extract token
		tokenString := strings.TrimPrefix(authHeader, "Bearer ")

		// Parse and validate token
		token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
			return []byte(cfg.JWT.Secret), nil
		})

		if err != nil || !token.Valid {
			c.JSON(http.StatusUnauthorized, models.APIResponse{
				Success: false,
				Error:   "Invalid or expired token",
			})
			c.Abort()
			return
		}

		// Extract claims
		claims, ok := token.Claims.(*Claims)
		if !ok {
			c.JSON(http.StatusUnauthorized, models.APIResponse{
				Success: false,
				Error:   "Invalid token claims",
			})
			c.Abort()
			return
		}

		// Store user info in context
		c.Set("userID", claims.UserID)
		c.Set("walletAddress", claims.WalletAddress)
		c.Set("role", claims.Role)

		c.Next()
	}
}

// GetUserID extracts user ID from context
func GetUserID(c *gin.Context) (string, bool) {
	userID, exists := c.Get("userID")
	if !exists {
		return "", false
	}
	return userID.(string), true
}

// GetWalletAddress extracts wallet address from context
func GetWalletAddress(c *gin.Context) (string, bool) {
	walletAddress, exists := c.Get("walletAddress")
	if !exists {
		return "", false
	}
	return walletAddress.(string), true
}
