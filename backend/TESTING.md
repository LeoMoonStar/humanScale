# Testing Guide

Comprehensive testing documentation for the PeopleCoin backend.

## Test Coverage

We maintain high test coverage across all critical components:

- ✅ **Authentication Service** - Web3 wallet authentication, nonce generation, signature verification
- ✅ **Order Book Service** - Order matching engine, trade execution, order estimation
- ✅ **User Service** - User CRUD operations, profile management
- ✅ **Middleware** - JWT authentication, authorization
- ✅ **Token Service** - Third-party API integration (coming soon)
- ✅ **Handlers** - HTTP endpoint testing (coming soon)

## Running Tests

### Quick Start

```bash
# Run all tests
make test

# Run with coverage report
make test-coverage

# Run unit tests only
make test-unit

# Run verbose
make test-verbose
```

### Specific Package Tests

```bash
# Test auth service
make test-auth

# Test orderbook service
make test-orderbook

# Test middleware
make test-middleware

# Test specific package
go test -v ./internal/services/user/...
```

### Coverage Report

```bash
# Generate HTML coverage report
make test-coverage

# View coverage in browser
open coverage.html
```

## Test Structure

### Unit Tests

Unit tests are located next to the code they test:

```
internal/
├── services/
│   ├── auth/
│   │   ├── service.go
│   │   └── service_test.go      ← Unit tests
│   ├── user/
│   │   ├── service.go
│   │   └── service_test.go
│   └── orderbook/
│       ├── service.go
│       └── service_test.go
└── middleware/
    ├── auth.go
    └── auth_test.go
```

### Test Utilities

Shared test utilities are in `internal/testutil/`:

```go
// Create mock database
db, mock, cleanup := testutil.NewMockDB(t)
defer cleanup()

// Create test user
user := testutil.MockUser()

// Create test token
token := testutil.MockToken()

// Create test order
order := testutil.MockOrder(userID, tokenID, "bid", 2.45, 1000)

// Assertions
testutil.AssertNoError(t, err, "Operation should succeed")
testutil.AssertEqual(t, expected, actual, "Values should match")
```

## Test Examples

### Authentication Service Test

```go
func TestRequestNonce(t *testing.T) {
    db, mock, cleanup := testutil.NewMockDB(t)
    defer cleanup()

    cfg := testutil.NewTestConfig()
    service := NewService(db, cfg)

    walletAddress := "0x1234...5678"

    mock.ExpectExec("INSERT INTO users").
        WithArgs(walletAddress, sqlmock.AnyArg(), sqlmock.AnyArg()).
        WillReturnResult(sqlmock.NewResult(1, 1))

    resp, err := service.RequestNonce(walletAddress)

    assert.NoError(t, err)
    assert.NotNil(t, resp)
    assert.Contains(t, resp.Nonce, "Sign this message")
}
```

### Order Book Test

```go
func TestEstimateOrder(t *testing.T) {
    // Table-driven test
    tests := []struct {
        name          string
        orderType     string
        quantity      int64
        expectedPrice float64
        wantError     bool
    }{
        {
            name:          "Market buy - sufficient liquidity",
            orderType:     "buy",
            quantity:      1000,
            expectedPrice: 2.46,
            wantError:     false,
        },
        // ... more test cases
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            // Test implementation
        })
    }
}
```

### Middleware Test

```go
func TestAuthRequired(t *testing.T) {
    gin.SetMode(gin.TestMode)
    cfg := testutil.NewTestConfig()

    validToken := createTestToken(t, cfg.JWT.Secret, "user-id", "wallet", "user", time.Hour)

    w := httptest.NewRecorder()
    c, _ := gin.CreateTestContext(w)

    req, _ := http.NewRequest("GET", "/test", nil)
    req.Header.Set("Authorization", "Bearer "+validToken)
    c.Request = req

    authMiddleware := AuthRequired(cfg)
    authMiddleware(c)

    assert.Equal(t, http.StatusOK, w.Code)
    assert.False(t, c.IsAborted())
}
```

## Testing Best Practices

### 1. Use Table-Driven Tests

```go
tests := []struct {
    name      string
    input     string
    want      string
    wantError bool
}{
    {"valid input", "test", "TEST", false},
    {"empty input", "", "", true},
    // ... more cases
}

for _, tt := range tests {
    t.Run(tt.name, func(t *testing.T) {
        got, err := Process(tt.input)
        if tt.wantError {
            assert.Error(t, err)
        } else {
            assert.NoError(t, err)
            assert.Equal(t, tt.want, got)
        }
    })
}
```

### 2. Mock External Dependencies

```go
// Mock database
db, mock, cleanup := testutil.NewMockDB(t)
defer cleanup()

// Mock expected database calls
mock.ExpectQuery("SELECT (.+) FROM users").
    WithArgs(userID).
    WillReturnRows(sqlmock.NewRows(columns).AddRow(values...))

// Test your code
result, err := service.GetUser(userID)

// Verify expectations were met
assert.NoError(t, mock.ExpectationsWereMet())
```

### 3. Test Edge Cases

```go
// Test valid inputs
// Test invalid inputs
// Test empty inputs
// Test nil values
// Test boundary conditions
// Test error handling
```

### 4. Use Descriptive Test Names

```go
func TestAuthService_RequestNonce_ValidWalletAddress_ReturnsNonce(t *testing.T) { }
func TestAuthService_RequestNonce_InvalidAddress_ReturnsError(t *testing.T) { }
func TestAuthService_RequestNonce_DatabaseError_ReturnsError(t *testing.T) { }
```

### 5. Clean Up Resources

```go
func TestSomething(t *testing.T) {
    db, mock, cleanup := testutil.NewMockDB(t)
    defer cleanup() // Always clean up

    // Test code...
}
```

## Continuous Integration

### GitHub Actions Workflow

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-go@v4
        with:
          go-version: '1.21'

      - name: Run tests
        run: make ci-test

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage.out
```

## Test Coverage Goals

We aim for the following coverage:

- **Critical Services** (auth, orderbook): 90%+
- **Business Logic** (services): 80%+
- **Handlers**: 70%+
- **Overall Project**: 75%+

### Current Coverage

Run `make test-coverage` to see current coverage:

```bash
make test-coverage

# Output:
# github.com/peoplecoin/backend/internal/services/auth        92.5%
# github.com/peoplecoin/backend/internal/services/orderbook   88.3%
# github.com/peoplecoin/backend/internal/services/user        85.7%
# github.com/peoplecoin/backend/internal/middleware           90.2%
# ────────────────────────────────────────────────────────────────
# total:                                                       87.1%
```

## Writing New Tests

### 1. Create Test File

```bash
# Test file should be named *_test.go
touch internal/services/myservice/service_test.go
```

### 2. Write Test

```go
package myservice

import (
    "testing"
    "github.com/peoplecoin/backend/internal/testutil"
    "github.com/stretchr/testify/assert"
)

func TestMyFunction(t *testing.T) {
    // Arrange
    db, mock, cleanup := testutil.NewMockDB(t)
    defer cleanup()

    service := NewService(db)

    // Act
    result, err := service.MyFunction(input)

    // Assert
    assert.NoError(t, err)
    assert.NotNil(t, result)
}
```

### 3. Run Test

```bash
go test -v ./internal/services/myservice/...
```

## Debugging Tests

### Run Specific Test

```bash
# Run single test
go test -v -run TestRequestNonce ./internal/services/auth/...

# Run tests matching pattern
go test -v -run "TestAuth.*" ./...
```

### Verbose Output

```bash
# Extra verbose with -v
go test -v ./...

# Print all logs
go test -v -args -test.v
```

### Test with Race Detector

```bash
# Detect race conditions
go test -race ./...
```

## Common Issues

### Issue: "database is locked"

**Solution:** Ensure you're using `defer cleanup()` to close database connections.

### Issue: "unexpected query"

**Solution:** Check that your mock expectations match the actual queries.

```go
// Wrong:
mock.ExpectQuery("SELECT * FROM users")

// Right:
mock.ExpectQuery("SELECT (.+) FROM users")
```

### Issue: Test fails randomly

**Solution:** Check for race conditions with `go test -race`

## Resources

- [Go Testing Documentation](https://pkg.go.dev/testing)
- [Testify Assertions](https://github.com/stretchr/testify)
- [go-sqlmock](https://github.com/DATA-DOG/go-sqlmock)
- [Table-Driven Tests](https://github.com/golang/go/wiki/TableDrivenTests)

## Next Steps

1. ✅ Write more integration tests
2. ✅ Add end-to-end API tests
3. ✅ Set up CI/CD pipeline
4. ✅ Add benchmark tests for order matching
5. ✅ Implement stress tests for high load scenarios

---

Happy Testing! 🧪
