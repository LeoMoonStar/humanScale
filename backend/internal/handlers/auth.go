package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/peoplecoin/backend/internal/models"
	"github.com/peoplecoin/backend/internal/services/auth"
)

type AuthHandler struct {
	service *auth.Service
}

func NewAuthHandler(service *auth.Service) *AuthHandler {
	return &AuthHandler{
		service: service,
	}
}

type RequestNonceInput struct {
	WalletAddress string `json:"walletAddress" binding:"required"`
}

type VerifySignatureInput struct {
	WalletAddress string `json:"walletAddress" binding:"required"`
	Signature     string `json:"signature" binding:"required"`
	Message       string `json:"message" binding:"required"`
}

type RefreshTokenInput struct {
	RefreshToken string `json:"refreshToken" binding:"required"`
}

// RequestNonce godoc
// @Summary Request authentication nonce
// @Description Generates a random nonce for wallet signature
// @Tags auth
// @Accept json
// @Produce json
// @Param input body RequestNonceInput true "Wallet Address"
// @Success 200 {object} models.APIResponse{data=models.NonceResponse}
// @Failure 400 {object} models.APIResponse
// @Router /auth/nonce [post]
func (h *AuthHandler) RequestNonce(c *gin.Context) {
	var input RequestNonceInput

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{
			Success: false,
			Error:   "Invalid request: " + err.Error(),
		})
		return
	}

	nonceResp, err := h.service.RequestNonce(input.WalletAddress)
	if err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{
			Success: false,
			Error:   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Data:    nonceResp,
	})
}

// VerifySignature godoc
// @Summary Verify wallet signature and login
// @Description Verifies the signed nonce and returns JWT tokens
// @Tags auth
// @Accept json
// @Produce json
// @Param input body VerifySignatureInput true "Signature Verification"
// @Success 200 {object} models.APIResponse{data=models.AuthResponse}
// @Failure 400 {object} models.APIResponse
// @Failure 401 {object} models.APIResponse
// @Router /auth/verify [post]
func (h *AuthHandler) VerifySignature(c *gin.Context) {
	var input VerifySignatureInput

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{
			Success: false,
			Error:   "Invalid request: " + err.Error(),
		})
		return
	}

	authResp, err := h.service.VerifySignature(input.WalletAddress, input.Signature, input.Message)
	if err != nil {
		c.JSON(http.StatusUnauthorized, models.APIResponse{
			Success: false,
			Error:   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Data:    authResp,
	})
}

// RefreshToken godoc
// @Summary Refresh access token
// @Description Generates a new access token using refresh token
// @Tags auth
// @Accept json
// @Produce json
// @Param input body RefreshTokenInput true "Refresh Token"
// @Success 200 {object} models.APIResponse{data=models.AuthResponse}
// @Failure 401 {object} models.APIResponse
// @Router /auth/refresh [post]
func (h *AuthHandler) RefreshToken(c *gin.Context) {
	var input RefreshTokenInput

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{
			Success: false,
			Error:   "Invalid request: " + err.Error(),
		})
		return
	}

	authResp, err := h.service.RefreshToken(input.RefreshToken)
	if err != nil {
		c.JSON(http.StatusUnauthorized, models.APIResponse{
			Success: false,
			Error:   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Data:    authResp,
	})
}

// Logout godoc
// @Summary Logout user
// @Description Invalidates the current session
// @Tags auth
// @Accept json
// @Produce json
// @Security BearerAuth
// @Success 200 {object} models.APIResponse
// @Router /auth/logout [post]
func (h *AuthHandler) Logout(c *gin.Context) {
	// For stateless JWT, logout is handled client-side
	// Could implement token blacklist if needed

	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Data: gin.H{
			"message": "Logged out successfully",
		},
	})
}
