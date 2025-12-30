package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/peoplecoin/backend/internal/middleware"
	"github.com/peoplecoin/backend/internal/models"
	"github.com/peoplecoin/backend/internal/services/orderbook"
)

type OrderBookHandler struct {
	service *orderbook.Service
}

func NewOrderBookHandler(service *orderbook.Service) *OrderBookHandler {
	return &OrderBookHandler{service: service}
}

type CreateOrderInput struct {
	TokenID       string  `json:"tokenId" binding:"required"`
	OrderType     string  `json:"orderType" binding:"required,oneof=buy sell"`
	ExecutionType string  `json:"executionType" binding:"required,oneof=market limit"`
	Quantity      int64   `json:"quantity" binding:"required,min=1"`
	Price         float64 `json:"price"`
	TimeInForce   string  `json:"timeInForce" binding:"oneof=GTC IOC FOK"`
}

type EstimateOrderInput struct{
	TokenID       string  `json:"tokenId" binding:"required"`
	OrderType     string  `json:"orderType" binding:"required,oneof=buy sell"`
	ExecutionType string  `json:"executionType" binding:"required,oneof=market limit"`
	Quantity      int64   `json:"quantity" binding:"required,min=1"`
	Price         float64 `json:"price"`
}

// GetOrderBook returns the order book for a token
func (h *OrderBookHandler) GetOrderBook(c *gin.Context) {
	tokenID := c.Param("tokenId")
	depth, _ := strconv.Atoi(c.DefaultQuery("depth", "20"))

	if depth < 1 || depth > 100 {
		depth = 20
	}

	orderBook, err := h.service.GetOrderBook(tokenID, depth)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{
			Success: false,
			Error:   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Data:    orderBook,
	})
}

// CreateOrder creates a new order
func (h *OrderBookHandler) CreateOrder(c *gin.Context) {
	userID, exists := middleware.GetUserID(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, models.APIResponse{
			Success: false,
			Error:   "User not authenticated",
		})
		return
	}

	var input CreateOrderInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{
			Success: false,
			Error:   "Invalid request: " + err.Error(),
		})
		return
	}

	// Validate price for limit orders
	if input.ExecutionType == "limit" && input.Price <= 0 {
		c.JSON(http.StatusBadRequest, models.APIResponse{
			Success: false,
			Error:   "Limit orders must have a positive price",
		})
		return
	}

	// Set default time in force
	if input.TimeInForce == "" {
		input.TimeInForce = "GTC"
	}

	// Determine side
	side := "bid"
	if input.OrderType == "sell" {
		side = "ask"
	}

	// Create order
	order := &models.Order{
		UserID:        userID,
		TokenID:       input.TokenID,
		OrderType:     input.OrderType,
		Side:          side,
		Price:         input.Price,
		Quantity:      input.Quantity,
		ExecutionType: input.ExecutionType,
		TimeInForce:   input.TimeInForce,
	}

	createdOrder, trades, err := h.service.CreateOrder(order)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{
			Success: false,
			Error:   err.Error(),
		})
		return
	}

	c.JSON(http.StatusCreated, models.APIResponse{
		Success: true,
		Data: gin.H{
			"order":  createdOrder,
			"trades": trades,
		},
	})
}

// GetUserOrders returns user's orders
func (h *OrderBookHandler) GetUserOrders(c *gin.Context) {
	userID, exists := middleware.GetUserID(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, models.APIResponse{
			Success: false,
			Error:   "User not authenticated",
		})
		return
	}

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	statusParam := c.Query("status")

	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}

	var status *string
	if statusParam != "" {
		status = &statusParam
	}

	orders, pagination, err := h.service.GetUserOrders(userID, status, page, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{
			Success: false,
			Error:   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Data: models.PaginatedResponse{
			Results:    orders,
			Pagination: *pagination,
		},
	})
}

// CancelOrder cancels an order
func (h *OrderBookHandler) CancelOrder(c *gin.Context) {
	userID, exists := middleware.GetUserID(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, models.APIResponse{
			Success: false,
			Error:   "User not authenticated",
		})
		return
	}

	orderID := c.Param("id")

	if err := h.service.CancelOrder(orderID, userID); err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{
			Success: false,
			Error:   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Data: gin.H{
			"message": "Order cancelled successfully",
		},
	})
}

// EstimateOrder estimates order execution
func (h *OrderBookHandler) EstimateOrder(c *gin.Context) {
	var input EstimateOrderInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{
			Success: false,
			Error:   "Invalid request: " + err.Error(),
		})
		return
	}

	// Validate price for limit orders
	if input.ExecutionType == "limit" && input.Price <= 0 {
		c.JSON(http.StatusBadRequest, models.APIResponse{
			Success: false,
			Error:   "Limit orders must have a positive price",
		})
		return
	}

	estimate, err := h.service.EstimateOrder(
		input.TokenID,
		input.OrderType,
		input.Quantity,
		input.ExecutionType,
		input.Price,
	)

	if err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{
			Success: false,
			Error:   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Data:    estimate,
	})
}

// GetTrades returns trades for the user
func (h *OrderBookHandler) GetTrades(c *gin.Context) {
	userID, exists := middleware.GetUserID(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, models.APIResponse{
			Success: false,
			Error:   "User not authenticated",
		})
		return
	}

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))

	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}

	trades, pagination, err := h.service.GetTrades(&userID, nil, page, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{
			Success: false,
			Error:   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Data: models.PaginatedResponse{
			Results:    trades,
			Pagination: *pagination,
		},
	})
}
