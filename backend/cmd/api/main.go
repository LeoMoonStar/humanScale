package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/peoplecoin/backend/internal/config"
	"github.com/peoplecoin/backend/internal/database"
	"github.com/peoplecoin/backend/internal/cache"
	"github.com/peoplecoin/backend/internal/middleware"
	"github.com/peoplecoin/backend/internal/services/auth"
	"github.com/peoplecoin/backend/internal/services/user"
	"github.com/peoplecoin/backend/internal/services/token"
	"github.com/peoplecoin/backend/internal/services/orderbook"
	"github.com/peoplecoin/backend/internal/handlers"
	"github.com/peoplecoin/backend/internal/blockchain/suiscan"
	"github.com/peoplecoin/backend/internal/blockchain/coingecko"
)

func main() {
	// Load configuration
	cfg := config.Load()

	// Initialize database
	db, err := database.Connect(cfg)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	// Initialize Redis cache
	redisClient := cache.NewRedisClient(cfg)
	defer redisClient.Close()

	// Initialize third-party API clients
	suiscanClient := suiscan.NewClient(cfg.ThirdParty.SuiScanAPIURL)
	coingeckoClient := coingecko.NewClient(cfg.ThirdParty.CoinGeckoAPIURL, cfg.ThirdParty.CoinGeckoAPIKey)

	// Initialize services
	authService := auth.NewService(db, cfg)
	userService := user.NewService(db)
	tokenService := token.NewService(db, redisClient, suiscanClient, coingeckoClient)
	orderbookService := orderbook.NewService(db, redisClient)

	// Initialize handlers
	authHandler := handlers.NewAuthHandler(authService)
	userHandler := handlers.NewUserHandler(userService)
	tokenHandler := handlers.NewTokenHandler(tokenService)
	orderbookHandler := handlers.NewOrderBookHandler(orderbookService)

	// Set up Gin router
	if cfg.Server.Env == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	router := gin.Default()

	// Global middleware
	router.Use(middleware.CORS(cfg.CORS.AllowedOrigins))
	router.Use(middleware.RequestID())
	router.Use(middleware.Logger())
	router.Use(middleware.Recovery())
	router.Use(middleware.RateLimit(100)) // 100 requests per minute

	// Health check endpoint
	router.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status": "ok",
			"timestamp": time.Now().Unix(),
		})
	})

	// API v1 routes
	v1 := router.Group("/api/v1")
	{
		// Authentication routes (public)
		authGroup := v1.Group("/auth")
		{
			authGroup.POST("/nonce", authHandler.RequestNonce)
			authGroup.POST("/verify", authHandler.VerifySignature)
			authGroup.POST("/refresh", authHandler.RefreshToken)
			authGroup.POST("/logout", middleware.AuthRequired(cfg), authHandler.Logout)
		}

		// User routes (protected)
		userGroup := v1.Group("/users")
		userGroup.Use(middleware.AuthRequired(cfg))
		{
			userGroup.GET("/me", userHandler.GetCurrentUser)
			userGroup.PATCH("/me", userHandler.UpdateProfile)
			userGroup.POST("/me/email", userHandler.AddEmail)
			userGroup.POST("/me/email/verify", userHandler.VerifyEmail)
		}

		// Token routes
		tokenGroup := v1.Group("/tokens")
		{
			tokenGroup.GET("/:id", tokenHandler.GetToken)
			tokenGroup.GET("/:id/price-history", tokenHandler.GetPriceHistory)
			tokenGroup.GET("/:id/holders", tokenHandler.GetHolders)
			tokenGroup.GET("/:id/transactions", tokenHandler.GetTransactions)
		}

		// Order book routes
		orderbookGroup := v1.Group("/orderbook")
		{
			orderbookGroup.GET("/:tokenId", orderbookHandler.GetOrderBook)
		}

		// Orders routes (protected)
		ordersGroup := v1.Group("/orders")
		ordersGroup.Use(middleware.AuthRequired(cfg))
		{
			ordersGroup.POST("", orderbookHandler.CreateOrder)
			ordersGroup.GET("", orderbookHandler.GetUserOrders)
			ordersGroup.DELETE("/:id", orderbookHandler.CancelOrder)
			ordersGroup.POST("/estimate", orderbookHandler.EstimateOrder)
		}

		// Trades routes (protected)
		tradesGroup := v1.Group("/trades")
		tradesGroup.Use(middleware.AuthRequired(cfg))
		{
			tradesGroup.GET("", orderbookHandler.GetTrades)
		}
	}

	// Start HTTP server
	srv := &http.Server{
		Addr:         ":" + cfg.Server.Port,
		Handler:      router,
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 10 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Start server in a goroutine
	go func() {
		log.Printf("🚀 Server starting on port %s", cfg.Server.Port)
		log.Printf("📝 Environment: %s", cfg.Server.Env)
		log.Printf("🌐 API available at http://localhost:%s/api/v1", cfg.Server.Port)

		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Failed to start server: %v", err)
		}
	}()

	// Graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("🛑 Shutting down server...")

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		log.Fatalf("Server forced to shutdown: %v", err)
	}

	log.Println("✅ Server exited gracefully")
}
