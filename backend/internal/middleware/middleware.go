package middleware

import (
	"fmt"
	"log"
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// CORS middleware
func CORS(allowedOrigins []string) gin.HandlerFunc {
	return func(c *gin.Context) {
		origin := c.Request.Header.Get("Origin")

		// Check if origin is allowed
		allowed := false
		for _, allowedOrigin := range allowedOrigins {
			if origin == allowedOrigin {
				allowed = true
				break
			}
		}

		if allowed {
			c.Writer.Header().Set("Access-Control-Allow-Origin", origin)
		}

		c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Request-ID")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}

		c.Next()
	}
}

// RequestID middleware adds a unique request ID
func RequestID() gin.HandlerFunc {
	return func(c *gin.Context) {
		requestID := c.Request.Header.Get("X-Request-ID")
		if requestID == "" {
			requestID = uuid.New().String()
		}

		c.Set("requestID", requestID)
		c.Writer.Header().Set("X-Request-ID", requestID)

		c.Next()
	}
}

// Logger middleware logs request details
func Logger() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		path := c.Request.URL.Path
		method := c.Request.Method

		c.Next()

		duration := time.Since(start)
		statusCode := c.Writer.Status()
		requestID, _ := c.Get("requestID")

		log.Printf("[%s] %s %s - %d - %v",
			requestID,
			method,
			path,
			statusCode,
			duration,
		)
	}
}

// Recovery middleware recovers from panics
func Recovery() gin.HandlerFunc {
	return func(c *gin.Context) {
		defer func() {
			if err := recover(); err != nil {
				requestID, _ := c.Get("requestID")
				log.Printf("[%s] PANIC: %v", requestID, err)

				c.JSON(http.StatusInternalServerError, gin.H{
					"success": false,
					"error":   "Internal server error",
				})
			}
		}()

		c.Next()
	}
}

// RateLimiter implements a simple in-memory rate limiter
type RateLimiter struct {
	requests map[string][]time.Time
	mu       sync.Mutex
	limit    int
	window   time.Duration
}

func NewRateLimiter(requestsPerMinute int) *RateLimiter {
	return &RateLimiter{
		requests: make(map[string][]time.Time),
		limit:    requestsPerMinute,
		window:   time.Minute,
	}
}

func (rl *RateLimiter) Allow(identifier string) bool {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	now := time.Now()
	windowStart := now.Add(-rl.window)

	// Get or create request list for this identifier
	if _, exists := rl.requests[identifier]; !exists {
		rl.requests[identifier] = []time.Time{}
	}

	// Remove old requests outside the window
	validRequests := []time.Time{}
	for _, reqTime := range rl.requests[identifier] {
		if reqTime.After(windowStart) {
			validRequests = append(validRequests, reqTime)
		}
	}

	// Check if limit exceeded
	if len(validRequests) >= rl.limit {
		return false
	}

	// Add current request
	validRequests = append(validRequests, now)
	rl.requests[identifier] = validRequests

	return true
}

// RateLimit middleware
func RateLimit(requestsPerMinute int) gin.HandlerFunc {
	limiter := NewRateLimiter(requestsPerMinute)

	return func(c *gin.Context) {
		// Use IP address as identifier
		identifier := c.ClientIP()

		// For authenticated users, use user ID
		if userID, exists := c.Get("userID"); exists {
			identifier = fmt.Sprintf("user:%s", userID)
		}

		if !limiter.Allow(identifier) {
			c.JSON(http.StatusTooManyRequests, gin.H{
				"success": false,
				"error":   "Rate limit exceeded. Please try again later.",
			})
			c.Abort()
			return
		}

		c.Next()
	}
}
