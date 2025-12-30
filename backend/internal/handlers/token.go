package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/peoplecoin/backend/internal/models"
	"github.com/peoplecoin/backend/internal/services/token"
)

type TokenHandler struct {
	service *token.Service
}

func NewTokenHandler(service *token.Service) *TokenHandler {
	return &TokenHandler{service: service}
}

// GetToken returns token information with live data
func (h *TokenHandler) GetToken(c *gin.Context) {
	tokenID := c.Param("id")

	tokenInfo, err := h.service.GetToken(tokenID)
	if err != nil {
		c.JSON(http.StatusNotFound, models.APIResponse{
			Success: false,
			Error:   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Data:    tokenInfo,
	})
}

// GetPriceHistory returns token price history
func (h *TokenHandler) GetPriceHistory(c *gin.Context) {
	// TODO: Implement price history (could fetch from CoinGecko or store our own)
	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Data:    []interface{}{},
	})
}

// GetHolders returns token holders list
func (h *TokenHandler) GetHolders(c *gin.Context) {
	tokenID := c.Param("id")

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))

	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}

	holders, pagination, err := h.service.GetHolders(tokenID, page, limit)
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
			Results:    holders,
			Pagination: *pagination,
		},
	})
}

// GetTransactions returns token transactions
func (h *TokenHandler) GetTransactions(c *gin.Context) {
	tokenID := c.Param("id")

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))

	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}

	transactions, pagination, err := h.service.GetTransactions(tokenID, page, limit)
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
			Results:    transactions,
			Pagination: *pagination,
		},
	})
}
