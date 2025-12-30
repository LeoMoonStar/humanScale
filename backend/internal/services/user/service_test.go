package user

import (
	"database/sql"
	"testing"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/peoplecoin/backend/internal/testutil"
	"github.com/stretchr/testify/assert"
)

func TestGetUserByID(t *testing.T) {
	db, mock, cleanup := testutil.NewMockDB(t)
	defer cleanup()

	service := NewService(db)
	user := testutil.MockUser()

	tests := []struct {
		name      string
		userID    string
		setupMock func()
		wantError bool
	}{
		{
			name:   "Successfully get user",
			userID: user.ID,
			setupMock: func() {
				rows := sqlmock.NewRows([]string{
					"id", "wallet_address", "username", "email", "full_name",
					"phone", "location", "avatar_url", "bio", "email_verified",
					"kyc_verified", "kyc_status", "status", "role",
					"created_at", "updated_at", "last_login_at",
				}).AddRow(
					user.ID, user.WalletAddress, user.Username, user.Email, user.FullName,
					user.Phone, user.Location, user.AvatarURL, user.Bio, user.EmailVerified,
					user.KYCVerified, user.KYCStatus, user.Status, user.Role,
					user.CreatedAt, user.UpdatedAt, user.LastLoginAt,
				)

				mock.ExpectQuery("SELECT (.+) FROM users WHERE id").
					WithArgs(user.ID).
					WillReturnRows(rows)
			},
			wantError: false,
		},
		{
			name:   "User not found",
			userID: "non-existent-id",
			setupMock: func() {
				mock.ExpectQuery("SELECT (.+) FROM users WHERE id").
					WithArgs("non-existent-id").
					WillReturnError(sql.ErrNoRows)
			},
			wantError: true,
		},
		{
			name:   "Database error",
			userID: user.ID,
			setupMock: func() {
				mock.ExpectQuery("SELECT (.+) FROM users WHERE id").
					WithArgs(user.ID).
					WillReturnError(sql.ErrConnDone)
			},
			wantError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			tt.setupMock()

			result, err := service.GetUserByID(tt.userID)

			if tt.wantError {
				assert.Error(t, err)
				assert.Nil(t, result)
			} else {
				assert.NoError(t, err)
				assert.NotNil(t, result)
				assert.Equal(t, user.ID, result.ID)
				assert.Equal(t, user.WalletAddress, result.WalletAddress)
				assert.Equal(t, user.Role, result.Role)
			}

			assert.NoError(t, mock.ExpectationsWereMet())
		})
	}
}

func TestUpdateProfile(t *testing.T) {
	db, mock, cleanup := testutil.NewMockDB(t)
	defer cleanup()

	service := NewService(db)
	user := testutil.MockUser()

	tests := []struct {
		name      string
		userID    string
		updates   map[string]interface{}
		setupMock func()
		wantError bool
	}{
		{
			name:   "Successfully update username and bio",
			userID: user.ID,
			updates: map[string]interface{}{
				"username": "newusername",
				"bio":      "New bio text",
			},
			setupMock: func() {
				// Expect update query
				mock.ExpectExec("UPDATE users SET").
					WithArgs(
						sqlmock.AnyArg(), // username
						sqlmock.AnyArg(), // full_name
						sqlmock.AnyArg(), // bio
						sqlmock.AnyArg(), // location
						sqlmock.AnyArg(), // avatar_url
						user.ID,
					).
					WillReturnResult(sqlmock.NewResult(1, 1))

				// Expect GetUserByID query after update
				rows := sqlmock.NewRows([]string{
					"id", "wallet_address", "username", "email", "full_name",
					"phone", "location", "avatar_url", "bio", "email_verified",
					"kyc_verified", "kyc_status", "status", "role",
					"created_at", "updated_at", "last_login_at",
				}).AddRow(
					user.ID, user.WalletAddress, "newusername", user.Email, user.FullName,
					user.Phone, user.Location, user.AvatarURL, "New bio text", user.EmailVerified,
					user.KYCVerified, user.KYCStatus, user.Status, user.Role,
					user.CreatedAt, user.UpdatedAt, user.LastLoginAt,
				)

				mock.ExpectQuery("SELECT (.+) FROM users WHERE id").
					WithArgs(user.ID).
					WillReturnRows(rows)
			},
			wantError: false,
		},
		{
			name:    "No updates provided",
			userID:  user.ID,
			updates: map[string]interface{}{},
			setupMock: func() {
				// Should only query, not update
				rows := sqlmock.NewRows([]string{
					"id", "wallet_address", "username", "email", "full_name",
					"phone", "location", "avatar_url", "bio", "email_verified",
					"kyc_verified", "kyc_status", "status", "role",
					"created_at", "updated_at", "last_login_at",
				}).AddRow(
					user.ID, user.WalletAddress, user.Username, user.Email, user.FullName,
					user.Phone, user.Location, user.AvatarURL, user.Bio, user.EmailVerified,
					user.KYCVerified, user.KYCStatus, user.Status, user.Role,
					user.CreatedAt, user.UpdatedAt, user.LastLoginAt,
				)

				mock.ExpectQuery("SELECT (.+) FROM users WHERE id").
					WithArgs(user.ID).
					WillReturnRows(rows)
			},
			wantError: false,
		},
		{
			name:   "Update with invalid field (should be ignored)",
			userID: user.ID,
			updates: map[string]interface{}{
				"username":   "newusername",
				"invalid":    "should be ignored",
				"wallet_address": "should also be ignored",
			},
			setupMock: func() {
				mock.ExpectExec("UPDATE users SET").
					WithArgs(
						"newusername",    // only valid fields
						sqlmock.AnyArg(),
						sqlmock.AnyArg(),
						sqlmock.AnyArg(),
						sqlmock.AnyArg(),
						user.ID,
					).
					WillReturnResult(sqlmock.NewResult(1, 1))

				rows := sqlmock.NewRows([]string{
					"id", "wallet_address", "username", "email", "full_name",
					"phone", "location", "avatar_url", "bio", "email_verified",
					"kyc_verified", "kyc_status", "status", "role",
					"created_at", "updated_at", "last_login_at",
				}).AddRow(
					user.ID, user.WalletAddress, "newusername", user.Email, user.FullName,
					user.Phone, user.Location, user.AvatarURL, user.Bio, user.EmailVerified,
					user.KYCVerified, user.KYCStatus, user.Status, user.Role,
					user.CreatedAt, user.UpdatedAt, user.LastLoginAt,
				)

				mock.ExpectQuery("SELECT (.+) FROM users WHERE id").
					WithArgs(user.ID).
					WillReturnRows(rows)
			},
			wantError: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			tt.setupMock()

			result, err := service.UpdateProfile(tt.userID, tt.updates)

			if tt.wantError {
				assert.Error(t, err)
				assert.Nil(t, result)
			} else {
				assert.NoError(t, err)
				assert.NotNil(t, result)
				assert.Equal(t, user.ID, result.ID)
			}

			assert.NoError(t, mock.ExpectationsWereMet())
		})
	}
}

func TestAddEmail(t *testing.T) {
	db, mock, cleanup := testutil.NewMockDB(t)
	defer cleanup()

	service := NewService(db)
	user := testutil.MockUser()

	tests := []struct {
		name      string
		userID    string
		email     string
		setupMock func()
		wantError bool
	}{
		{
			name:   "Successfully add email",
			userID: user.ID,
			email:  "newemail@example.com",
			setupMock: func() {
				mock.ExpectExec("UPDATE users SET email").
					WithArgs("newemail@example.com", user.ID).
					WillReturnResult(sqlmock.NewResult(1, 1))
			},
			wantError: false,
		},
		{
			name:   "Database error",
			userID: user.ID,
			email:  "newemail@example.com",
			setupMock: func() {
				mock.ExpectExec("UPDATE users SET email").
					WithArgs("newemail@example.com", user.ID).
					WillReturnError(sql.ErrConnDone)
			},
			wantError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			tt.setupMock()

			err := service.AddEmail(tt.userID, tt.email)

			if tt.wantError {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
			}

			assert.NoError(t, mock.ExpectationsWereMet())
		})
	}
}

func TestVerifyEmail(t *testing.T) {
	db, mock, cleanup := testutil.NewMockDB(t)
	defer cleanup()

	service := NewService(db)
	user := testutil.MockUser()

	tests := []struct {
		name      string
		userID    string
		setupMock func()
		wantError bool
	}{
		{
			name:   "Successfully verify email",
			userID: user.ID,
			setupMock: func() {
				mock.ExpectExec("UPDATE users SET email_verified").
					WithArgs(user.ID).
					WillReturnResult(sqlmock.NewResult(1, 1))
			},
			wantError: false,
		},
		{
			name:   "Database error",
			userID: user.ID,
			setupMock: func() {
				mock.ExpectExec("UPDATE users SET email_verified").
					WithArgs(user.ID).
					WillReturnError(sql.ErrConnDone)
			},
			wantError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			tt.setupMock()

			err := service.VerifyEmail(tt.userID)

			if tt.wantError {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
			}

			assert.NoError(t, mock.ExpectationsWereMet())
		})
	}
}
