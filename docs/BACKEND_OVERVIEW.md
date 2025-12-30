# PeopleCoin - Backend System Overview

## Documentation Index

This is your complete backend documentation package for the PeopleCoin platform.

### 📚 Core Documents

1. **[DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md)** - Complete database design
   - 25 tables covering all platform features
   - User management, creators, tokens, orders, trades
   - Optimized indexes and relationships
   - Order book tables (essential)
   - **Web3-first user table** (wallet address as identity)

2. **[API_DOCUMENTATION.md](./API_DOCUMENTATION.md)** - REST & WebSocket API
   - 50+ REST endpoints
   - WebSocket real-time channels
   - **Web3 wallet authentication** (nonce + signature)
   - Order book & trading APIs
   - Complete request/response examples

3. **[WEB3_AUTHENTICATION.md](./WEB3_AUTHENTICATION.md)** - Wallet-based auth ⭐
   - Complete authentication flow
   - Frontend implementation (React + Sui Wallet)
   - Backend implementation (signature verification)
   - Security best practices
   - No passwords, wallet is identity

4. **[ORDER_BOOK_DESIGN.md](./ORDER_BOOK_DESIGN.md)** - Trading engine architecture
   - Centralized order matching system
   - Price-time priority algorithm
   - Performance optimizations
   - Blockchain settlement integration
   - Real-time updates via WebSocket

---

## System Architecture

### High-Level Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend (React)                        │
│         Dashboard, Explore, Creator Detail, Trading          │
└──────────────────────┬──────────────────────────────────────┘
                       │ REST API / WebSocket
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                    Backend Services                          │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   API        │  │  Order Book  │  │  WebSocket   │      │
│  │   Gateway    │  │   Engine     │  │   Server     │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                  │                  │              │
│         └──────────┬───────┴──────────────────┘              │
│                    │                                         │
│  ┌─────────────────┴──────────────────────────────────┐    │
│  │          Business Logic Services                     │    │
│  │  • Auth Service    • Creator Service                 │    │
│  │  • Token Service   • Trading Service                 │    │
│  │  • Portfolio Svc   • Social Service                  │    │
│  └─────────────────┬──────────────────────────────────┘    │
│                    │                                         │
└────────────────────┼─────────────────────────────────────────┘
                     │
         ┌───────────┴───────────┐
         ▼                       ▼
┌─────────────────┐    ┌─────────────────┐
│   PostgreSQL    │    │  Redis Cache    │
│   (Primary DB)  │    │  (Order Book)   │
└─────────────────┘    └─────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│    Sui Blockchain (DEX)         │
│  • AMM Pools                    │
│  • Buyback Vaults               │
│  • Settlement Layer             │
└─────────────────────────────────┘
```

---

## Database Schema Summary

### Core Tables (25 Total)

#### User & Authentication (2 tables) - Web3-First ⭐
- `users` - Platform users (wallet_address as primary identity, email optional)
- `user_balances` - Fiat balances

#### Creator Management (7 tables)
- `creators` - Creator profiles
- `creator_skills` - Skills
- `creator_achievements` - Achievements
- `work_experiences` - Work history
- `education` - Education background
- `creator_content_sections` - Custom content
- `following` - User follows creator

#### Token Management (3 tables)
- `tokens` - Creator tokens
- `token_price_history` - Historical prices
- `token_holders` - Ownership distribution

#### Order Book & Trading (4 tables) ⭐
- `orders` - Central order book
- `trades` - Executed trades
- `order_book_snapshots` - Historical depth
- `transactions` - All platform transactions

#### Portfolio (1 table)
- `portfolio_history` - User portfolio snapshots

#### Social & Engagement (2 tables)
- `trending_topics` - News and trends
- `invitations` - Creator invitations

#### Applications (4 tables)
- `creator_applications` - Onboarding applications
- `application_profile_urls` - Profile URLs
- `documents` - Legal documents
- `document_signatures` - Signing records

#### Analytics (2 tables)
- `market_sentiment` - Market mood index
- `platform_statistics` - Platform metrics

---

## API Endpoints Summary

### Authentication (4 endpoints) - Web3 Wallet-Based ⭐
```
POST   /auth/nonce           - Get challenge to sign
POST   /auth/verify          - Verify signature & login
POST   /auth/refresh         - Refresh access token
POST   /auth/logout          - Logout
```

**No passwords. Wallet address is the identity.**

### User Management (4 endpoints)
```
GET    /users/me              - Get current user profile
PATCH  /users/me              - Update profile (username, bio, etc.)
POST   /users/me/email        - Add email (optional, for notifications)
POST   /users/me/email/verify - Verify email
```

### Creator Management (4 endpoints)
```
GET    /creators
GET    /creators/search
GET    /creators/{id}
GET    /creators/feed
```

### Token Information (4 endpoints)
```
GET    /tokens/{id}
GET    /tokens/{id}/price-history
GET    /tokens/{id}/holders
GET    /tokens/{id}/transactions
```

### Order Book & Trading (6 endpoints) ⭐
```
GET    /orderbook/{tokenId}        - Get order book depth
POST   /orders                     - Create order (buy/sell)
GET    /orders                     - Get user orders
DELETE /orders/{id}                - Cancel order
GET    /trades                     - Get trade history
POST   /orders/estimate            - Estimate trade price
```

### Portfolio (3 endpoints)
```
GET    /users/me/portfolio
GET    /users/me/investments
GET    /users/me/balance-history
```

### Transactions (1 endpoint)
```
GET    /transactions
```

### Social Features (4 endpoints)
```
POST   /creators/{id}/follow
DELETE /creators/{id}/follow
GET    /users/me/following
GET    /trending
```

### Applications (4 endpoints)
```
POST   /creators/apply
GET    /token-symbols/available
POST   /scrape
POST   /upload
```

### Market Data (3 endpoints)
```
GET    /market/sentiment
GET    /statistics
GET    /categories
```

### WebSocket Channels (4 channels)
```
orderbook     - Real-time order book updates
trades        - Real-time trade executions
price         - Real-time price updates
user_orders   - User's order status updates
```

**Total: 50+ Endpoints**

---

## Order Book System Highlights

### Key Features

1. **Centralized Matching Engine**
   - Sub-millisecond order matching
   - Price-time priority algorithm
   - Support for market, limit orders
   - Time-in-force: GTC, IOC, FOK

2. **Performance Optimizations**
   - In-memory order book (Redis)
   - Database connection pooling
   - Async blockchain settlement
   - WebSocket for real-time updates

3. **Order Types**
   - **Market Orders**: Immediate execution
   - **Limit Orders**: Execute at specific price
   - **GTC**: Good till cancel
   - **IOC**: Immediate or cancel
   - **FOK**: Fill or kill

4. **Trading Fees**
   - Taker fee: 0.5% (0.005)
   - Maker fee: 0.3% (0.003)
   - Platform keeps all fees

5. **Settlement Flow**
   - Orders matched centrally (fast)
   - Trades batched every 10 seconds
   - Settled on Sui blockchain (secure)
   - Users see instant execution

---

## Technology Stack Recommendations

### Backend Core
- **Language**: Go or Rust (matching engine) + Node.js (API services)
- **Framework**: Express.js / Fastify (Node) or Gin (Go)
- **Database**: PostgreSQL 14+
- **Cache**: Redis 7+ (with Sentinel for HA)
- **Message Queue**: RabbitMQ or Apache Kafka

### Real-Time
- **WebSocket**: Socket.io or native WebSocket
- **Protocol**: JSON over WebSocket

### Blockchain
- **Network**: Sui Mainnet
- **SDK**: @mysten/sui.js
- **Wallet Integration**: Sui Wallet SDK

### Infrastructure
- **Container**: Docker + Kubernetes
- **Load Balancer**: NGINX or HAProxy
- **Monitoring**: Prometheus + Grafana
- **Logging**: ELK Stack
- **APM**: Datadog or New Relic

### Security
- **Authentication**: JWT (access + refresh tokens)
- **Encryption**: TLS 1.3, AES-256
- **KYC**: Third-party integration (Onfido, Jumio)
- **2FA**: TOTP (Google Authenticator)

---

## Development Phases

### Phase 1: Foundation (Weeks 1-4)
- [ ] Database setup and migrations
- [ ] User authentication system
- [ ] Basic API structure
- [ ] Creator profile management

### Phase 2: Token System (Weeks 5-8)
- [ ] Token creation and management
- [ ] Price history tracking
- [ ] Holder distribution
- [ ] Basic portfolio views

### Phase 3: Order Book (Weeks 9-12) ⭐
- [ ] Order book data structures
- [ ] Matching engine implementation
- [ ] Order creation/cancellation APIs
- [ ] Trade execution logic
- [ ] WebSocket real-time updates

### Phase 4: Trading Features (Weeks 13-16)
- [ ] Market orders
- [ ] Limit orders
- [ ] Order history
- [ ] Trade history
- [ ] Portfolio tracking

### Phase 5: Blockchain Integration (Weeks 17-20)
- [ ] Sui wallet connection
- [ ] AMM pool integration
- [ ] Settlement layer
- [ ] Transaction tracking
- [ ] Buyback vault monitoring

### Phase 6: Social & Onboarding (Weeks 21-24)
- [ ] Creator applications
- [ ] Document signing (DocuSign)
- [ ] Profile URL scraping
- [ ] Following/social features
- [ ] Trending topics

### Phase 7: Polish & Launch (Weeks 25-28)
- [ ] Performance optimization
- [ ] Security audit
- [ ] Load testing
- [ ] Beta testing
- [ ] Production deployment

---

## Critical Success Factors

### 1. Order Book Performance
- **Target**: < 1ms matching latency
- **Approach**: In-memory processing, Redis caching
- **Monitoring**: Real-time latency tracking

### 2. Security
- **User funds**: Segregated accounts, multi-sig wallets
- **API**: Rate limiting, input validation, SQL injection prevention
- **Blockchain**: Secure key management, transaction signing

### 3. Scalability
- **Horizontal scaling**: Stateless API servers
- **Database**: Read replicas for analytics
- **Caching**: Redis for hot data
- **CDN**: Static assets

### 4. Reliability
- **Uptime**: 99.9% target
- **Backup**: Daily automated backups
- **Disaster recovery**: Multi-region deployment
- **Monitoring**: 24/7 alerting

---

## API Rate Limits

| Endpoint Type | Limit | Window |
|--------------|-------|--------|
| Public endpoints | 100 req | 1 minute |
| Authenticated endpoints | 1,000 req | 1 minute |
| Trading endpoints | 100 req | 1 minute |
| WebSocket messages | 1,000 msg | 1 minute |

---

## Fee Structure

| Action | Fee | Notes |
|--------|-----|-------|
| Market Order (Taker) | 0.5% | Higher fee for immediate execution |
| Limit Order (Maker) | 0.3% | Lower fee for providing liquidity |
| Deposit | 0% | Free deposits |
| Withdrawal | Network fee | Sui blockchain gas |
| Transfer | 0.1% | Internal transfers |

---

## Next Steps

### 1. Review Documentation
- [ ] Read DATABASE_SCHEMA.md
- [ ] Review API_DOCUMENTATION.md
- [ ] Study ORDER_BOOK_DESIGN.md

### 2. Technical Decisions
- [ ] Choose primary backend language (Go/Rust/Node.js)
- [ ] Decide on hosting provider (AWS/GCP/Azure)
- [ ] Select monitoring/logging tools
- [ ] Finalize security approach (2FA, KYC provider)

### 3. Setup Development Environment
- [ ] Initialize Git repository
- [ ] Setup CI/CD pipeline
- [ ] Create development database
- [ ] Configure local Redis

### 4. Start Implementation
- [ ] Create database migrations
- [ ] Implement user authentication
- [ ] Build basic API endpoints
- [ ] Set up testing framework

---

## Questions to Address

Before starting backend development, we should clarify:

1. **Hosting**: AWS, GCP, or Azure?
2. **Primary Language**: Go, Rust, or Node.js for backend?
3. **Deployment**: Kubernetes or simpler container orchestration?
4. **KYC Provider**: Which service for identity verification?
5. **Email Provider**: SendGrid, Mailgun, or AWS SES?
6. **File Storage**: S3, GCS, or Azure Blob?
7. **DocuSign**: Already have account or need setup?
8. **Monitoring Budget**: Datadog (paid) or open-source stack?

---

## Summary

The backend architecture is designed to support:

✅ **10,000+ concurrent users**
✅ **1,000+ trades per second**
✅ **< 1ms order matching**
✅ **99.9% uptime**
✅ **Real-time order book updates**
✅ **Secure blockchain settlement**
✅ **Comprehensive user management**
✅ **Creator onboarding workflow**

All documentation is complete and ready for implementation. The order book system is the crown jewel - a centralized matching engine with decentralized settlement, giving us speed AND security.

Ready to start building! 🚀
