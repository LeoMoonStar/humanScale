package auth

import (
	"crypto/rand"
	"database/sql"
	"encoding/hex"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/peoplecoin/backend/internal/config"
	"github.com/peoplecoin/backend/internal/database"
	"github.com/peoplecoin/backend/internal/middleware"
	"github.com/peoplecoin/backend/internal/models"
)

type Service struct {
	db  *database.DB
	cfg *config.Config
}

func NewService(db *database.DB, cfg *config.Config) *Service {
	return &Service{
		db:  db,
		cfg: cfg,
	}
}

// RequestNonce generates a random nonce for authentication
func (s *Service) RequestNonce(walletAddress string) (*models.NonceResponse, error) {
	// Validate wallet address format
	if !isValidSuiAddress(walletAddress) {
		return nil, fmt.Errorf("invalid wallet address format")
	}

	// Generate random nonce
	nonce, err := generateNonce()
	if err != nil {
		return nil, err
	}

	// Set expiration to 5 minutes from now
	expiresAt := time.Now().Add(5 * time.Minute)

	// Store or update nonce in database
	query := `
		INSERT INTO users (wallet_address, nonce, nonce_expires_at, created_at, updated_at)
		VALUES ($1, $2, $3, NOW(), NOW())
		ON CONFLICT (wallet_address)
		DO UPDATE SET nonce = $2, nonce_expires_at = $3, updated_at = NOW()
	`

	_, err = s.db.Exec(query, walletAddress, nonce, expiresAt)
	if err != nil {
		return nil, fmt.Errorf("failed to store nonce: %w", err)
	}

	return &models.NonceResponse{
		Nonce:     nonce,
		ExpiresAt: expiresAt.Format(time.RFC3339),
	}, nil
}

// VerifySignature verifies the wallet signature and issues JWT tokens
func (s *Service) VerifySignature(walletAddress, signature, message string) (*models.AuthResponse, error) {
	// 1. Get user with nonce from database
	var user models.User
	var nonce sql.NullString
	var nonceExpiresAt sql.NullTime

	query := `
		SELECT id, wallet_address, username, email, role, nonce, nonce_expires_at, created_at
		FROM users
		WHERE wallet_address = $1
	`

	err := s.db.QueryRow(query, walletAddress).Scan(
		&user.ID,
		&user.WalletAddress,
		&user.Username,
		&user.Email,
		&user.Role,
		&nonce,
		&nonceExpiresAt,
		&user.CreatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("no nonce found for this wallet. Please request a new nonce")
	}

	if err != nil {
		return nil, fmt.Errorf("database error: %w", err)
	}

	// 2. Verify nonce exists and hasn't expired
	if !nonce.Valid || nonce.String == "" {
		return nil, fmt.Errorf("no active nonce found")
	}

	if !nonceExpiresAt.Valid || time.Now().After(nonceExpiresAt.Time) {
		return nil, fmt.Errorf("nonce has expired. Please request a new one")
	}

	if message != nonce.String {
		return nil, fmt.Errorf("invalid nonce")
	}

	// 3. Verify signature
	// TODO: Implement proper Sui signature verification
	// For now, we'll skip actual cryptographic verification
	// In production, use Sui SDK or implement Ed25519 verification
	valid, err := verifySuiSignature(walletAddress, message, signature)
	if err != nil || !valid {
		return nil, fmt.Errorf("invalid signature")
	}

	// 4. Determine if this is a new user
	isNewUser := user.CreatedAt.After(time.Now().Add(-1 * time.Minute))

	// 5. Update last login and clear nonce
	updateQuery := `
		UPDATE users
		SET last_login_at = NOW(), nonce = NULL, nonce_expires_at = NULL, updated_at = NOW()
		WHERE wallet_address = $1
	`

	_, err = s.db.Exec(updateQuery, walletAddress)
	if err != nil {
		return nil, fmt.Errorf("failed to update user: %w", err)
	}

	// 6. Generate JWT tokens
	accessToken, err := s.generateAccessToken(user.ID, user.WalletAddress, user.Role)
	if err != nil {
		return nil, fmt.Errorf("failed to generate access token: %w", err)
	}

	refreshToken, err := s.generateRefreshToken(user.ID, user.WalletAddress)
	if err != nil {
		return nil, fmt.Errorf("failed to generate refresh token: %w", err)
	}

	return &models.AuthResponse{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		ExpiresIn:    s.cfg.JWT.Expiration,
		IsNewUser:    isNewUser,
		User:         &user,
	}, nil
}

// RefreshToken generates a new access token from a refresh token
func (s *Service) RefreshToken(refreshTokenString string) (*models.AuthResponse, error) {
	// Parse refresh token
	token, err := jwt.ParseWithClaims(refreshTokenString, &middleware.Claims{}, func(token *jwt.Token) (interface{}, error) {
		return []byte(s.cfg.JWT.RefreshSecret), nil
	})

	if err != nil || !token.Valid {
		return nil, fmt.Errorf("invalid refresh token")
	}

	claims, ok := token.Claims.(*middleware.Claims)
	if !ok {
		return nil, fmt.Errorf("invalid token claims")
	}

	// Get user from database
	var user models.User
	query := `SELECT id, wallet_address, username, email, role FROM users WHERE id = $1`

	err = s.db.QueryRow(query, claims.UserID).Scan(
		&user.ID,
		&user.WalletAddress,
		&user.Username,
		&user.Email,
		&user.Role,
	)

	if err != nil {
		return nil, fmt.Errorf("user not found")
	}

	// Generate new access token
	accessToken, err := s.generateAccessToken(user.ID, user.WalletAddress, user.Role)
	if err != nil {
		return nil, err
	}

	return &models.AuthResponse{
		AccessToken:  accessToken,
		RefreshToken: refreshTokenString, // Return the same refresh token
		ExpiresIn:    s.cfg.JWT.Expiration,
		IsNewUser:    false,
		User:         &user,
	}, nil
}

// Helper functions

func generateNonce() (string, error) {
	bytes := make([]byte, 16)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return "Sign this message to authenticate: " + hex.EncodeToString(bytes), nil
}

func (s *Service) generateAccessToken(userID, walletAddress, role string) (string, error) {
	claims := &middleware.Claims{
		UserID:        userID,
		WalletAddress: walletAddress,
		Role:          role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Duration(s.cfg.JWT.Expiration) * time.Second)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(s.cfg.JWT.Secret))
}

func (s *Service) generateRefreshToken(userID, walletAddress string) (string, error) {
	claims := &middleware.Claims{
		UserID:        userID,
		WalletAddress: walletAddress,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Duration(s.cfg.JWT.RefreshExpiration) * time.Second)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(s.cfg.JWT.RefreshSecret))
}

func isValidSuiAddress(address string) bool {
	// Sui addresses are 66 characters long starting with "0x"
	if len(address) != 66 {
		return false
	}
	if address[0:2] != "0x" {
		return false
	}
	// Check if remaining characters are hex
	_, err := hex.DecodeString(address[2:])
	return err == nil
}

func verifySuiSignature(walletAddress, message, signature string) (bool, error) {
	// TODO: Implement actual Sui signature verification
	// This requires:
	// 1. Decoding the signature (base64 or hex)
	// 2. Verifying it using Ed25519 or Secp256k1 (depending on key type)
	// 3. Recovering the public key and checking it matches the wallet address
	//
	// For now, we'll return true to allow testing
	// In production, use: github.com/tyler-smith/go-bip32 or similar

	// PLACEHOLDER: Always return true for development
	// IMPORTANT: Implement proper verification before production!
	return true, nil
}
