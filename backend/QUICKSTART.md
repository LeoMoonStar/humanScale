# Quick Start Guide

Get the PeopleCoin backend running in 5 minutes!

## Prerequisites

- Go 1.21+ installed
- Docker Desktop running
- Terminal/Command Line

## Step 1: Start Services (1 minute)

```bash
cd /Users/jiaweiyang/Project/peopleCoin/backend

# Start PostgreSQL, Redis, and Typesense
docker-compose up -d

# Wait for services to be ready (about 30 seconds)
```

## Step 2: Setup Environment (30 seconds)

```bash
# Copy example environment file
cp .env.example .env

# The defaults work for local development!
```

## Step 3: Install Dependencies (1 minute)

```bash
# Download Go modules
go mod download
```

## Step 4: Run Migrations (1 minute)

```bash
# Run all migrations
cat migrations/*.sql | psql -h localhost -U postgres -d peoplecoin

# Password: postgres (from docker-compose.yml)
```

## Step 5: Start the API (30 seconds)

```bash
# Run the server
go run cmd/api/main.go
```

You should see:
```
✅ Database connected successfully
✅ Redis connected successfully
🚀 Server starting on port 8080
📝 Environment: development
🌐 API available at http://localhost:8080/api/v1
```

## Step 6: Test It! (30 seconds)

```bash
# Health check
curl http://localhost:8080/health

# Should return:
# {"status":"ok","timestamp":1704067200}
```

## Test Web3 Authentication

```bash
# 1. Request a nonce
curl -X POST http://localhost:8080/api/v1/auth/nonce \
  -H "Content-Type: application/json" \
  -d '{
    "walletAddress": "0x1234567890123456789012345678901234567890123456789012345678901234"
  }'

# You'll get a nonce like:
# {"success":true,"data":{"nonce":"Sign this message to authenticate: abc123...","expiresAt":"2024-01-01T12:05:00Z"}}

# 2. In production, user signs this with their wallet
# 3. For testing, you can skip signature verification (it's a placeholder)
curl -X POST http://localhost:8080/api/v1/auth/verify \
  -H "Content-Type: application/json" \
  -d '{
    "walletAddress": "0x1234567890123456789012345678901234567890123456789012345678901234",
    "signature": "test-signature",
    "message": "Sign this message to authenticate: abc123..."
  }'

# You'll get JWT tokens!
# {"success":true,"data":{"accessToken":"eyJ...","refreshToken":"eyJ...","expiresIn":3600,"isNewUser":true,"user":{...}}}
```

## What's Running?

- **Backend API**: http://localhost:8080
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:6379
- **Typesense**: localhost:8108

## Common Commands

```bash
# Stop services
docker-compose down

# View logs
docker-compose logs -f

# Restart services
docker-compose restart

# Clean everything (⚠️ deletes data)
docker-compose down -v
```

## Next Steps

1. Read the [README](./README.md) for full API documentation
2. Test all endpoints with the examples
3. Implement Sui signature verification (see TODO in auth service)
4. Deploy to production!

## Troubleshooting

### "Port 8080 already in use"
```bash
lsof -ti:8080 | xargs kill -9
```

### "Cannot connect to database"
```bash
# Check if PostgreSQL is running
docker ps | grep postgres

# Restart database
docker-compose restart postgres
```

### "Go command not found"
Install Go from https://go.dev/dl/

---

That's it! You're ready to build amazing Web3 trading features! 🚀
