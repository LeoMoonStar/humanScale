package models

// APIResponse is a standard API response wrapper
type APIResponse struct {
	Success bool        `json:"success"`
	Data    interface{} `json:"data,omitempty"`
	Error   string      `json:"error,omitempty"`
}

// PaginationMeta contains pagination metadata
type PaginationMeta struct {
	Page       int  `json:"page"`
	Limit      int  `json:"limit"`
	Total      int  `json:"total"`
	TotalPages int  `json:"totalPages"`
	HasNext    bool `json:"hasNext"`
	HasPrev    bool `json:"hasPrev"`
}

// PaginatedResponse wraps data with pagination metadata
type PaginatedResponse struct {
	Results    interface{}    `json:"results"`
	Pagination PaginationMeta `json:"pagination"`
}

// AuthResponse contains authentication tokens and user info
type AuthResponse struct {
	AccessToken  string `json:"accessToken"`
	RefreshToken string `json:"refreshToken"`
	ExpiresIn    int    `json:"expiresIn"`
	IsNewUser    bool   `json:"isNewUser"`
	User         *User  `json:"user"`
}

// NonceResponse contains the nonce for authentication
type NonceResponse struct {
	Nonce     string `json:"nonce"`
	ExpiresAt string `json:"expiresAt"`
}
