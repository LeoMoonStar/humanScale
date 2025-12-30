.PHONY: help test test-coverage test-unit test-integration run build clean docker-build docker-up docker-down migrate

# Default target
help:
	@echo "PeopleCoin Backend - Available commands:"
	@echo ""
	@echo "  make run              - Run the application"
	@echo "  make test             - Run all tests"
	@echo "  make test-unit        - Run unit tests only"
	@echo "  make test-coverage    - Run tests with coverage report"
	@echo "  make test-verbose     - Run tests with verbose output"
	@echo "  make build            - Build the binary"
	@echo "  make clean            - Clean build artifacts"
	@echo "  make docker-up        - Start Docker services"
	@echo "  make docker-down      - Stop Docker services"
	@echo "  make docker-build     - Build Docker image"
	@echo "  make migrate          - Run database migrations"
	@echo "  make deps             - Download dependencies"
	@echo "  make lint             - Run linter"
	@echo ""

# Run the application
run:
	@echo "Starting PeopleCoin API..."
	go run cmd/api/main.go

# Build the binary
build:
	@echo "Building binary..."
	go build -o bin/api cmd/api/main.go
	@echo "✅ Binary built: bin/api"

# Run all tests
test:
	@echo "Running all tests..."
	go test -v ./...

# Run unit tests only
test-unit:
	@echo "Running unit tests..."
	go test -v -short ./internal/...

# Run tests with coverage
test-coverage:
	@echo "Running tests with coverage..."
	go test -v -coverprofile=coverage.out ./...
	go tool cover -html=coverage.out -o coverage.html
	@echo "✅ Coverage report generated: coverage.html"
	@echo ""
	@echo "Coverage summary:"
	go tool cover -func=coverage.out | grep total

# Run tests with verbose output
test-verbose:
	@echo "Running tests with verbose output..."
	go test -v -count=1 ./...

# Run tests for specific package
test-auth:
	@echo "Testing auth service..."
	go test -v ./internal/services/auth/...

test-orderbook:
	@echo "Testing orderbook service..."
	go test -v ./internal/services/orderbook/...

test-middleware:
	@echo "Testing middleware..."
	go test -v ./internal/middleware/...

# Download dependencies
deps:
	@echo "Downloading dependencies..."
	go mod download
	go mod tidy
	@echo "✅ Dependencies updated"

# Clean build artifacts and test cache
clean:
	@echo "Cleaning..."
	rm -rf bin/
	rm -f coverage.out coverage.html
	go clean -testcache
	@echo "✅ Clean complete"

# Docker commands
docker-up:
	@echo "Starting Docker services..."
	docker-compose up -d
	@echo "✅ Services started"
	@echo ""
	@echo "PostgreSQL: localhost:5432"
	@echo "Redis:      localhost:6379"
	@echo "Typesense:  localhost:8108"

docker-down:
	@echo "Stopping Docker services..."
	docker-compose down
	@echo "✅ Services stopped"

docker-build:
	@echo "Building Docker image..."
	docker build -t peoplecoin-api:latest .
	@echo "✅ Image built: peoplecoin-api:latest"

docker-logs:
	docker-compose logs -f

# Database migrations
migrate:
	@echo "Running database migrations..."
	@cat migrations/*.sql | psql -h localhost -U postgres -d peoplecoin
	@echo "✅ Migrations complete"

migrate-test:
	@echo "Running migrations on test database..."
	@cat migrations/*.sql | psql -h localhost -U postgres -d peoplecoin_test
	@echo "✅ Test migrations complete"

# Linting
lint:
	@echo "Running linter..."
	@if command -v golangci-lint > /dev/null; then \
		golangci-lint run ./...; \
	else \
		echo "golangci-lint not installed. Install with:"; \
		echo "  brew install golangci-lint"; \
	fi

# Format code
fmt:
	@echo "Formatting code..."
	go fmt ./...
	@echo "✅ Code formatted"

# Check for security issues
security:
	@echo "Checking for security issues..."
	@if command -v gosec > /dev/null; then \
		gosec ./...; \
	else \
		echo "gosec not installed. Install with:"; \
		echo "  go install github.com/securego/gosec/v2/cmd/gosec@latest"; \
	fi

# Development: Run with auto-reload
dev:
	@echo "Starting development server with auto-reload..."
	@if command -v air > /dev/null; then \
		air; \
	else \
		echo "air not installed. Install with:"; \
		echo "  go install github.com/cosmtrek/air@latest"; \
		echo ""; \
		echo "Running without auto-reload..."; \
		make run; \
	fi

# CI/CD targets
ci-test:
	@echo "Running CI tests..."
	go test -v -race -coverprofile=coverage.out ./...
	go tool cover -func=coverage.out

ci-build:
	@echo "Building for CI..."
	CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o bin/api cmd/api/main.go

# Database helpers
db-reset:
	@echo "⚠️  WARNING: This will delete all data!"
	@read -p "Are you sure? [y/N]: " confirm && [ $$confirm = "y" ] || exit 1
	@echo "Resetting database..."
	docker-compose down -v
	docker-compose up -d postgres
	@sleep 3
	make migrate
	@echo "✅ Database reset complete"

db-shell:
	@echo "Opening database shell..."
	psql -h localhost -U postgres -d peoplecoin

# Quick setup for new developers
setup:
	@echo "Setting up PeopleCoin backend..."
	@echo ""
	@echo "1. Copying .env.example to .env..."
	@cp -n .env.example .env || true
	@echo ""
	@echo "2. Starting Docker services..."
	@make docker-up
	@sleep 5
	@echo ""
	@echo "3. Running migrations..."
	@make migrate
	@echo ""
	@echo "4. Installing dependencies..."
	@make deps
	@echo ""
	@echo "✅ Setup complete!"
	@echo ""
	@echo "Run 'make run' to start the server"
	@echo "Run 'make test' to run tests"
