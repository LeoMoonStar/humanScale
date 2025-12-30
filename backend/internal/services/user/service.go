package user

import (
	"database/sql"
	"fmt"

	"github.com/peoplecoin/backend/internal/database"
	"github.com/peoplecoin/backend/internal/models"
)

type Service struct {
	db *database.DB
}

func NewService(db *database.DB) *Service {
	return &Service{db: db}
}

// GetUserByID retrieves a user by ID
func (s *Service) GetUserByID(userID string) (*models.User, error) {
	var user models.User

	query := `
		SELECT id, wallet_address, username, email, full_name, phone, location,
		       avatar_url, bio, email_verified, kyc_verified, kyc_status,
		       status, role, created_at, updated_at, last_login_at
		FROM users
		WHERE id = $1
	`

	err := s.db.QueryRow(query, userID).Scan(
		&user.ID,
		&user.WalletAddress,
		&user.Username,
		&user.Email,
		&user.FullName,
		&user.Phone,
		&user.Location,
		&user.AvatarURL,
		&user.Bio,
		&user.EmailVerified,
		&user.KYCVerified,
		&user.KYCStatus,
		&user.Status,
		&user.Role,
		&user.CreatedAt,
		&user.UpdatedAt,
		&user.LastLoginAt,
	)

	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("user not found")
	}

	if err != nil {
		return nil, fmt.Errorf("database error: %w", err)
	}

	return &user, nil
}

// UpdateProfile updates user profile information
func (s *Service) UpdateProfile(userID string, updates map[string]interface{}) (*models.User, error) {
	// Build dynamic update query
	allowedFields := map[string]bool{
		"username":   true,
		"full_name":  true,
		"phone":      true,
		"location":   true,
		"avatar_url": true,
		"bio":        true,
	}

	// Only update allowed fields
	validUpdates := make(map[string]interface{})
	for key, value := range updates {
		if allowedFields[key] {
			validUpdates[key] = value
		}
	}

	if len(validUpdates) == 0 {
		return s.GetUserByID(userID)
	}

	// Simple update for now - in production, use a query builder
	query := `
		UPDATE users
		SET username = COALESCE($1, username),
		    full_name = COALESCE($2, full_name),
		    bio = COALESCE($3, bio),
		    location = COALESCE($4, location),
		    avatar_url = COALESCE($5, avatar_url),
		    updated_at = NOW()
		WHERE id = $6
	`

	_, err := s.db.Exec(query,
		validUpdates["username"],
		validUpdates["full_name"],
		validUpdates["bio"],
		validUpdates["location"],
		validUpdates["avatar_url"],
		userID,
	)

	if err != nil {
		return nil, fmt.Errorf("failed to update profile: %w", err)
	}

	return s.GetUserByID(userID)
}

// AddEmail adds an email to user profile
func (s *Service) AddEmail(userID, email string) error {
	query := `
		UPDATE users
		SET email = $1, email_verified = false, updated_at = NOW()
		WHERE id = $2
	`

	_, err := s.db.Exec(query, email, userID)
	if err != nil {
		return fmt.Errorf("failed to add email: %w", err)
	}

	// TODO: Send verification email

	return nil
}

// VerifyEmail marks email as verified
func (s *Service) VerifyEmail(userID string) error {
	query := `
		UPDATE users
		SET email_verified = true, updated_at = NOW()
		WHERE id = $1
	`

	_, err := s.db.Exec(query, userID)
	if err != nil {
		return fmt.Errorf("failed to verify email: %w", err)
	}

	return nil
}
