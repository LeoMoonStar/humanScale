# PeopleCoin Backend API

Production-ready Go backend for the PeopleCoin platform with Web3 wallet authentication, centralized order book, and blockchain integration.

## Features

✅ **Web3 Authentication** - Challenge-response authentication using wallet signatures (no passwords)
✅ **Centralized Order Book** - Sub-millisecond order matching with price-time priority
✅ **Third-Party Integration** - Fetches token data from SuiScan & CoinGecko APIs
✅ **Redis Caching** - High-performance caching layer
✅ **JWT Tokens** - Secure session management
✅ **Real-time Updates** - WebSocket support (coming soon)
✅ **Clean Architecture** - Modular, maintainable codebase

## Tech Stack

- **Language**: Go 1.21+
- **Web Framework**: Gin
- **Database**: PostgreSQL 14+
- **Cache**: Redis 7+
- **Search**: Typesense (optional)
- **Blockchain**: Sui Network

## Quick Start

### Prerequisites

- Go 1.21 or higher
- Docker & Docker Compose (for local development)
- PostgreSQL (optional if using Docker)
- Redis (optional if using Docker)

### 1. Clone and Setup

```bash
cd /Users/jiaweiyang/Project/peopleCoin/backend

# Copy environment variables
cp .env.example .env

# Edit .env with your configuration
nano .env
```

### 2. Start Infrastructure with Docker

```bash
# Start PostgreSQL, Redis, and Typesense
docker-compose up -d

# This will start:
# - PostgreSQL on localhost:5432
# - Redis on localhost:6379
# - Typesense on localhost:8108
```

### 3. Install Dependencies

```bash
go mod download
```

### 4. Run Database Migrations

```bash
# Connect to PostgreSQL
psql -h localhost -U postgres -d peoplecoin

# Run migrations (in order)
\i migrations/001_create_users_table.sql
\i migrations/002_create_creators_table.sql
\i migrations/003_create_tokens_and_trading.sql

# Or run all at once:
cat migrations/*.sql | psql -h localhost -U postgres -d peoplecoin
```

### 5. Run the API Server

```bash
go run cmd/api/main.go
```

The API will be available at `http://localhost:8080`

## API Endpoints

### Health Check
```bash
curl http://localhost:8080/health
```

### Authentication (Web3)

**Request Nonce:**
```bash
curl -X POST http://localhost:8080/api/v1/auth/nonce \
  -H "Content-Type: application/json" \
  -d '{
    "walletAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
  }'
```

**Verify Signature:**
```bash
curl -X POST http://localhost:8080/api/v1/auth/verify \
  -H "Content-Type: application/json" \
  -d '{
    "walletAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "signature": "0xabc123...",
    "message": "Sign this message to authenticate: xyz789"
  }'
```

### User Management

**Get Current User:**
```bash
curl http://localhost:8080/api/v1/users/me \
  -H "Authorization: Bearer {your-jwt-token}"
```

**Update Profile:**
```bash
curl -X PATCH http://localhost:8080/api/v1/users/me \
  -H "Authorization: Bearer {your-jwt-token}" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "johndoe",
    "bio": "Web3 enthusiast"
  }'
```

### Tokens

**Get Token Info:**
```bash
curl http://localhost:8080/api/v1/tokens/{tokenId}
```

**Get Token Holders:**
```bash
curl "http://localhost:8080/api/v1/tokens/{tokenId}/holders?page=1&limit=20"
```

### Trading

**Get Order Book:**
```bash
curl "http://localhost:8080/api/v1/orderbook/{tokenId}?depth=20"
```

**Estimate Order:**
```bash
curl -X POST http://localhost:8080/api/v1/orders/estimate \
  -H "Authorization: Bearer {your-jwt-token}" \
  -H "Content-Type: application/json" \
  -d '{
    "tokenId": "uuid",
    "orderType": "buy",
    "executionType": "market",
    "quantity": 1000
  }'
```

**Create Order:**
```bash
curl -X POST http://localhost:8080/api/v1/orders \
  -H "Authorization: Bearer {your-jwt-token}" \
  -H "Content-Type: application/json" \
  -d '{
    "tokenId": "uuid",
    "orderType": "buy",
    "executionType": "limit",
    "quantity": 1000,
    "price": 2.45,
    "timeInForce": "GTC"
  }'
```

**Get User Orders:**
```bash
curl "http://localhost:8080/api/v1/orders?page=1&limit=20&status=open" \
  -H "Authorization: Bearer {your-jwt-token}"
```

**Cancel Order:**
```bash
curl -X DELETE http://localhost:8080/api/v1/orders/{orderId} \
  -H "Authorization: Bearer {your-jwt-token}"
```

**Get Trades:**
```bash
curl "http://localhost:8080/api/v1/trades?page=1&limit=20" \
  -H "Authorization: Bearer {your-jwt-token}"
```

## Project Structure

```
backend/
├── cmd/
│   └── api/
│       └── main.go                 # Application entry point
├── internal/
│   ├── config/                     # Configuration management
│   ├── database/                   # Database connection
│   ├── models/                     # Data models
│   ├── handlers/                   # HTTP handlers
│   │   ├── auth.go
│   │   ├── user.go
│   │   ├── token.go
│   │   └── orderbook.go
│   ├── services/                   # Business logic
│   │   ├── auth/                   # Web3 authentication
│   │   ├── user/                   # User management
│   │   ├── token/                  # Token service
│   │   └── orderbook/              # Order matching engine
│   ├── middleware/                 # HTTP middleware
│   ├── blockchain/                 # Third-party API clients
│   │   ├── suiscan/                # SuiScan client
│   │   └── coingecko/              # CoinGecko client
│   ├── cache/                      # Redis caching
│   └── ws/                         # WebSocket (coming soon)
├── migrations/                     # SQL migrations
├── docker-compose.yml              # Local development setup
├── Dockerfile                      # Production container
├── go.mod                          # Go dependencies
└── README.md                       # This file
```

## Environment Variables

See `.env.example` for all available configuration options:

- **Server**: PORT, ENV
- **Database**: DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME
- **Redis**: REDIS_HOST, REDIS_PORT
- **JWT**: JWT_SECRET, JWT_REFRESH_SECRET, JWT_EXPIRATION
- **Typesense**: TYPESENSE_HOST, TYPESENSE_PORT, TYPESENSE_API_KEY
- **APIs**: SUISCAN_API_URL, COINGECKO_API_URL
- **Blockchain**: SUI_RPC_URL, SUI_NETWORK

## Development

### Run with Auto-Reload

Install air for hot reload:
```bash
go install github.com/cosmtrek/air@latest
air
```

### Run Tests

```bash
go test ./...
```

### Build for Production

```bash
go build -o bin/api cmd/api/main.go
./bin/api
```

### Docker Build

```bash
docker build -t peoplecoin-api .
docker run -p 8080:8080 --env-file .env peoplecoin-api
```

## Order Book System

The order book implements **price-time priority** matching:

1. **Orders are matched** based on:
   - Best price first
   - Earliest timestamp for same price

2. **Order Types**:
   - **Market**: Execute immediately at best available price
   - **Limit**: Execute only at specified price or better

3. **Time in Force**:
   - **GTC** (Good Till Cancel): Remains open until filled or cancelled
   - **IOC** (Immediate or Cancel): Fill immediately, cancel remainder
   - **FOK** (Fill or Kill): Fill completely or cancel entirely

4. **Fees**:
   - Taker (market orders): 0.5%
   - Maker (limit orders): 0.3%

## Third-Party API Integration

Token data is fetched from external sources:

- **SuiScan**: Token holders, transactions, metadata
- **CoinGecko**: Real-time prices, market cap, 24h volume
- **Sui RPC**: Blockchain data

Data is cached in Redis to minimize API calls and improve performance.

## Security Features

- ✅ Web3 wallet authentication (no password storage)
- ✅ JWT with refresh tokens
- ✅ CORS protection
- ✅ Rate limiting
- ✅ Input validation
- ✅ SQL injection prevention
- ⚠️ TODO: Implement actual Sui signature verification (currently placeholder)

## Production Deployment

### Using Docker

```bash
# Build production image
docker build -t peoplecoin-api:latest .

# Run with production env
docker run -d \
  --name peoplecoin-api \
  -p 8080:8080 \
  --env-file .env.production \
  peoplecoin-api:latest
```

### Manual Deployment

1. Build binary:
   ```bash
   CGO_ENABLED=0 GOOS=linux go build -o api cmd/api/main.go
   ```

2. Copy to server with:
   - Binary (`api`)
   - Migrations (`migrations/`)
   - `.env` file

3. Run migrations on production database

4. Start with process manager:
   ```bash
   # Using systemd, supervisor, or pm2
   ./api
   ```

## Troubleshooting

### Database Connection Issues

```bash
# Test PostgreSQL connection
psql -h localhost -U postgres -d peoplecoin

# Check if migrations ran
\dt

# View tables
\d users
\d orders
\d trades
```

### Redis Connection Issues

```bash
# Test Redis connection
redis-cli ping

# Check cached keys
redis-cli KEYS "*"
```

### Port Already in Use

```bash
# Kill process on port 8080
lsof -ti:8080 | xargs kill -9
```

## Contributing

1. Create feature branch
2. Make changes
3. Run tests
4. Submit pull request

## License

MIT

## Support

For issues and questions:
- GitHub Issues: https://github.com/peoplecoin/backend/issues
- Documentation: See `/docs` directory

---

Built with ❤️ for the PeopleCoin platform
