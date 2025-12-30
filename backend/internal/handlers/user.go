package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/peoplecoin/backend/internal/middleware"
	"github.com/peoplecoin/backend/internal/models"
	"github.com/peoplecoin/backend/internal/services/user"
)

type UserHandler struct {
	service *user.Service
}

func NewUserHandler(service *user.Service) *UserHandler {
	return &UserHandler{service: service}
}

type UpdateProfileInput struct {
	Username  *string `json:"username"`
	FullName  *string `json:"fullName"`
	Phone     *string `json:"phone"`
	Location  *string `json:"location"`
	AvatarURL *string `json:"avatarUrl"`
	Bio       *string `json:"bio"`
}

type AddEmailInput struct {
	Email string `json:"email" binding:"required,email"`
}

type VerifyEmailInput struct {
	Token string `json:"token" binding:"required"`
}

// GetCurrentUser returns the authenticated user's profile
func (h *UserHandler) GetCurrentUser(c *gin.Context) {
	userID, exists := middleware.GetUserID(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, models.APIResponse{
			Success: false,
			Error:   "User not authenticated",
		})
		return
	}

	user, err := h.service.GetUserByID(userID)
	if err != nil {
		c.JSON(http.StatusNotFound, models.APIResponse{
			Success: false,
			Error:   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Data:    user,
	})
}

// UpdateProfile updates the user's profile
func (h *UserHandler) UpdateProfile(c *gin.Context) {
	userID, exists := middleware.GetUserID(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, models.APIResponse{
			Success: false,
			Error:   "User not authenticated",
		})
		return
	}

	var input UpdateProfileInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{
			Success: false,
			Error:   "Invalid request: " + err.Error(),
		})
		return
	}

	// Convert input to map
	updates := make(map[string]interface{})
	if input.Username != nil {
		updates["username"] = *input.Username
	}
	if input.FullName != nil {
		updates["full_name"] = *input.FullName
	}
	if input.Phone != nil {
		updates["phone"] = *input.Phone
	}
	if input.Location != nil {
		updates["location"] = *input.Location
	}
	if input.AvatarURL != nil {
		updates["avatar_url"] = *input.AvatarURL
	}
	if input.Bio != nil {
		updates["bio"] = *input.Bio
	}

	user, err := h.service.UpdateProfile(userID, updates)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{
			Success: false,
			Error:   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Data:    user,
	})
}

// AddEmail adds an email to the user's profile
func (h *UserHandler) AddEmail(c *gin.Context) {
	userID, exists := middleware.GetUserID(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, models.APIResponse{
			Success: false,
			Error:   "User not authenticated",
		})
		return
	}

	var input AddEmailInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{
			Success: false,
			Error:   "Invalid request: " + err.Error(),
		})
		return
	}

	if err := h.service.AddEmail(userID, input.Email); err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{
			Success: false,
			Error:   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Data: gin.H{
			"message": "Verification email sent",
		},
	})
}

// VerifyEmail verifies the user's email
func (h *UserHandler) VerifyEmail(c *gin.Context) {
	userID, exists := middleware.GetUserID(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, models.APIResponse{
			Success: false,
			Error:   "User not authenticated",
		})
		return
	}

	var input VerifyEmailInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{
			Success: false,
			Error:   "Invalid request: " + err.Error(),
		})
		return
	}

	// TODO: Verify token before marking email as verified

	if err := h.service.VerifyEmail(userID); err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{
			Success: false,
			Error:   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Data: gin.H{
			"message": "Email verified successfully",
		},
	})
}
