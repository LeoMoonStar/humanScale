package models

import (
	"time"
)

type User struct {
	ID             string     `json:"id"`
	WalletAddress  string     `json:"walletAddress"`
	Username       *string    `json:"username,omitempty"`
	Email          *string    `json:"email,omitempty"`
	FullName       *string    `json:"fullName,omitempty"`
	Phone          *string    `json:"phone,omitempty"`
	Location       *string    `json:"location,omitempty"`
	AvatarURL      *string    `json:"avatarUrl,omitempty"`
	Bio            *string    `json:"bio,omitempty"`
	Nonce          *string    `json:"-"`
	NonceExpiresAt *time.Time `json:"-"`
	EmailVerified  bool       `json:"emailVerified"`
	KYCVerified    bool       `json:"kycVerified"`
	KYCStatus      string     `json:"kycStatus"`
	Status         string     `json:"status"`
	Role           string     `json:"role"`
	CreatedAt      time.Time  `json:"createdAt"`
	UpdatedAt      time.Time  `json:"updatedAt"`
	LastLoginAt    *time.Time `json:"lastLoginAt,omitempty"`
}

type UserBalance struct {
	ID        string    `json:"id"`
	UserID    string    `json:"userId"`
	Currency  string    `json:"currency"`
	Balance   float64   `json:"balance"`
	Locked    float64   `json:"locked"`
	UpdatedAt time.Time `json:"updatedAt"`
}
