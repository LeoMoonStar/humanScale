# PeopleCoin - API Documentation

## Overview
RESTful API documentation for the PeopleCoin platform.

**Base URL:** `https://api.peoplecoin.com/v1`

**Authentication:** JWT Bearer Token (except public endpoints)

---

## Table of Contents
1. [Authentication](#authentication)
2. [User Management](#user-management)
3. [Creator Management](#creator-management)
4. [Token Information](#token-information)
5. [Order Book & Trading](#order-book--trading) ⭐
6. [Portfolio & Balances](#portfolio--balances)
7. [Transactions](#transactions)
8. [Social Features](#social-features)
9. [Applications & Onboarding](#applications--onboarding)
10. [Market Data](#market-data)
11. [WebSocket API](#websocket-api)

---

## Authentication (Web3 Wallet-Based)

### Overview
Authentication uses **wallet signature verification** instead of passwords:
1. Frontend requests a nonce (challenge)
2. User signs the nonce with their wallet
3. Backend verifies the signature
4. Backend issues JWT session

**No passwords. No email required. Wallet is the identity.**

---

### Step 1: Request Nonce (Challenge)
```http
POST /auth/nonce
```

**Request Body:**
```json
{
  "walletAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "nonce": "Sign this message to authenticate: 839201a3f7e4",
    "expiresAt": "2024-01-01T12:05:00Z"
  }
}
```

**Notes:**
- Nonce is a random challenge string
- Expires in 5 minutes
- Stored in database associated with wallet address
- Frontend should prompt user to sign this exact message

---

### Step 2: Verify Signature & Login
```http
POST /auth/verify
```

**Request Body:**
```json
{
  "walletAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "signature": "0xabc123def456...", // Signed nonce from wallet
  "message": "Sign this message to authenticate: 839201a3f7e4" // Original nonce
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 3600,
    "user": {
      "id": "uuid",
      "walletAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
      "username": "john_doe", // Optional, if set
      "email": "john@example.com", // Optional, if set
      "role": "user",
      "createdAt": "2024-01-01T00:00:00Z"
    },
    "isNewUser": false // true if first time connecting this wallet
  }
}
```

**Backend Verification Process:**
```typescript
// 1. Retrieve nonce from database for this wallet
const storedNonce = await db.getNonce(walletAddress);

// 2. Verify nonce hasn't expired
if (storedNonce.expiresAt < Date.now()) {
  throw new Error('Nonce expired');
}

// 3. Verify signature using Sui SDK
import { verifyPersonalMessage } from '@mysten/sui.js/verify';

const isValid = await verifyPersonalMessage(
  Buffer.from(message),
  signature,
  walletAddress
);

if (!isValid) {
  throw new Error('Invalid signature');
}

// 4. User owns the wallet! Create/update user and issue JWT
```

---

### Logout
```http
POST /auth/logout
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

### Refresh Token
```http
POST /auth/refresh
```

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1..."
}
```

---

## User Management

### Get Current User Profile
```http
GET /users/me
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "walletAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "username": "john_doe",
    "email": "john@example.com", // Optional, null if not set
    "fullName": "John Doe",
    "phone": "+1234567890",
    "location": "New York, NY",
    "avatarUrl": "https://...",
    "bio": "...",
    "emailVerified": false,
    "kycVerified": true,
    "role": "user",
    "createdAt": "2024-01-01T00:00:00Z",
    "lastLoginAt": "2024-01-01T12:00:00Z"
  }
}
```

---

### Update User Profile
```http
PATCH /users/me
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "username": "john_doe",
  "fullName": "John Doe Jr.",
  "phone": "+1234567890",
  "location": "San Francisco, CA",
  "bio": "...",
  "avatarUrl": "https://..."
}
```

**Notes:**
- All fields are optional
- Username must be unique
- Wallet address cannot be changed

---

### Add/Update Email (Optional - For Notifications)
```http
POST /users/me/email
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "email": "john@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "email": "john@example.com",
    "emailVerified": false,
    "verificationEmailSent": true
  }
}
```

**Notes:**
- Email is **completely optional**
- Only used for notifications (trade confirmations, creator updates)
- Verification email sent automatically
- User can use platform without email

---

### Verify Email
```http
POST /users/me/email/verify
```

**Request Body:**
```json
{
  "token": "verification-token-from-email"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "emailVerified": true
  }
}
```

---

## Creator Management

### Get All Creators
```http
GET /creators?page=1&limit=20&category=Tech&location=Cambridge,MA&industry=Technology
```

**Query Parameters:**
- `page` (int): Page number (default: 1)
- `limit` (int): Items per page (default: 20, max: 100)
- `category` (string): Filter by category
- `location` (string): Filter by location
- `industry` (string): Filter by industry
- `verified` (boolean): Filter verified creators
- `sort` (string): Sort by `price`, `marketCap`, `holders`, `newest` (default: `marketCap`)

**Response:**
```json
{
  "success": true,
  "data": {
    "creators": [
      {
        "id": "uuid",
        "name": "Sarah Chen",
        "title": "AI Research Scientist",
        "avatar": "https://...",
        "category": "Tech",
        "location": "Cambridge, MA",
        "industry": "Technology",
        "verified": true,
        "token": {
          "symbol": "SARAH",
          "price": 2.45,
          "priceChange24h": 5.2,
          "marketCap": 245000,
          "holders": 428
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "totalPages": 8
    }
  }
}
```

---

### Search Creators
```http
GET /creators/search?q=Sarah%20Chen
```

**Query Parameters:**
- `q` (string): Search query

---

### Get Creator Profile
```http
GET /creators/{creatorId}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "userId": "uuid",
    "name": "Sarah Chen",
    "title": "AI Research Scientist",
    "avatar": "https://...",
    "banner": "https://...",
    "bio": "...",
    "location": "Cambridge, MA",
    "email": "sarah@example.com",
    "phone": "+1234567890",
    "verified": true,
    "category": "Tech",
    "industry": "Technology",
    "socialLinks": {
      "linkedin": "https://...",
      "github": "https://...",
      "website": "https://...",
      "twitter": "https://..."
    },
    "skills": ["Machine Learning", "AI", "Python"],
    "achievements": [
      "Published 20+ papers in top AI conferences"
    ],
    "experience": [
      {
        "title": "Senior AI Research Scientist",
        "company": "MIT CSAIL",
        "location": "Cambridge, MA",
        "duration": "2021 - Present",
        "description": "..."
      }
    ],
    "education": [
      {
        "degree": "Ph.D. in Computer Science",
        "school": "Stanford University",
        "year": "2018"
      }
    ],
    "futureGoals": "...",
    "currentWork": "...",
    "challenges": "...",
    "interests": "...",
    "customSections": [
      {
        "type": "video",
        "title": "About My Research",
        "url": "https://youtube.com/..."
      }
    ],
    "upcomingQA": {
      "date": "2024-01-15",
      "time": "2:00 PM EST",
      "link": "https://zoom.us/..."
    },
    "lastQAVideo": "https://youtube.com/..."
  }
}
```

---

## Token Information

### Get Token Details
```http
GET /tokens/{tokenId}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "creatorId": "uuid",
    "symbol": "SARAH",
    "name": "Sarah Chen Token",
    "decimals": 8,
    "totalSupply": 100000,
    "circulatingSupply": 40000,
    "currentPrice": 2.45,
    "initialPrice": 1.00,
    "marketCap": 245000,
    "totalHolders": 428,
    "totalVolume24h": 50000,
    "priceChange24h": 5.2,
    "releaseDate": "2024-01-01T00:00:00Z",
    "contractAddress": "0x...",
    "poolId": "0x...",
    "vaultId": "0x...",
    "status": "active"
  }
}
```

---

### Get Token Price History
```http
GET /tokens/{tokenId}/price-history?period=24h&interval=1h
```

**Query Parameters:**
- `period`: `1h`, `24h`, `7d`, `30d`, `1y`, `all` (default: `24h`)
- `interval`: `1m`, `5m`, `15m`, `1h`, `4h`, `1d` (default: `1h`)

**Response:**
```json
{
  "success": true,
  "data": {
    "prices": [
      {
        "timestamp": "2024-01-01T00:00:00Z",
        "price": 2.42,
        "volume24h": 45000,
        "marketCap": 242000
      },
      {
        "timestamp": "2024-01-01T01:00:00Z",
        "price": 2.45,
        "volume24h": 50000,
        "marketCap": 245000
      }
    ],
    "summary": {
      "minPrice": 2.20,
      "maxPrice": 2.50,
      "avgPrice": 2.42,
      "priceChange": 0.05,
      "priceChangePercent": 2.08
    }
  }
}
```

---

### Get Holder Distribution
```http
GET /tokens/{tokenId}/holders
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalHolders": 428,
    "distribution": {
      "top10Percent": 45,
      "top11to50Percent": 35,
      "othersPercent": 20
    },
    "topHolders": [
      {
        "address": "0x...",
        "balance": 5000,
        "percentage": 5.0,
        "rank": 1
      }
    ]
  }
}
```

---

### Get Recent Token Transactions
```http
GET /tokens/{tokenId}/transactions?page=1&limit=20
```

**Response:**
```json
{
  "success": true,
  "data": {
    "transactions": [
      {
        "id": "uuid",
        "type": "buy",
        "user": "Alice",
        "amount": 100,
        "price": 2.45,
        "totalValue": 245,
        "timestamp": "2024-01-01T12:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 500,
      "totalPages": 25
    }
  }
}
```

---

## Order Book & Trading ⭐

### Get Order Book
```http
GET /orderbook/{tokenId}?depth=20
```

**Query Parameters:**
- `depth` (int): Number of price levels to return (default: 20, max: 100)

**Response:**
```json
{
  "success": true,
  "data": {
    "tokenId": "uuid",
    "symbol": "SARAH",
    "lastPrice": 2.45,
    "bestBid": 2.44,
    "bestAsk": 2.46,
    "spread": 0.02,
    "spreadPercent": 0.82,
    "bids": [
      {
        "price": 2.44,
        "quantity": 1000,
        "total": 2440,
        "orders": 5
      },
      {
        "price": 2.43,
        "quantity": 800,
        "total": 1944,
        "orders": 3
      }
    ],
    "asks": [
      {
        "price": 2.46,
        "quantity": 900,
        "total": 2214,
        "orders": 4
      },
      {
        "price": 2.47,
        "quantity": 1200,
        "total": 2964,
        "orders": 6
      }
    ],
    "timestamp": "2024-01-01T12:00:00Z"
  }
}
```

---

### Create Order (Buy/Sell)
```http
POST /orders
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "tokenId": "uuid",
  "orderType": "buy", // or "sell"
  "executionType": "limit", // or "market"
  "price": 2.45, // Required for limit orders
  "quantity": 100,
  "timeInForce": "GTC" // GTC, IOC, FOK
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "orderId": "uuid",
    "tokenId": "uuid",
    "orderType": "buy",
    "executionType": "limit",
    "price": 2.45,
    "quantity": 100,
    "filledQuantity": 0,
    "remainingQuantity": 100,
    "status": "open",
    "feeRate": 0.005,
    "estimatedFee": 1.225,
    "createdAt": "2024-01-01T12:00:00Z"
  }
}
```

---

### Get User Orders
```http
GET /orders?status=open&tokenId={tokenId}&page=1&limit=20
Authorization: Bearer {token}
```

**Query Parameters:**
- `status`: `open`, `partially_filled`, `filled`, `cancelled` (default: all)
- `tokenId` (uuid): Filter by token
- `orderType`: `buy`, `sell`
- `page`, `limit`: Pagination

**Response:**
```json
{
  "success": true,
  "data": {
    "orders": [
      {
        "id": "uuid",
        "tokenId": "uuid",
        "tokenSymbol": "SARAH",
        "orderType": "buy",
        "executionType": "limit",
        "price": 2.45,
        "quantity": 100,
        "filledQuantity": 50,
        "remainingQuantity": 50,
        "status": "partially_filled",
        "feeRate": 0.005,
        "feePaid": 0.6125,
        "createdAt": "2024-01-01T12:00:00Z",
        "updatedAt": "2024-01-01T12:05:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 45,
      "totalPages": 3
    }
  }
}
```

---

### Cancel Order
```http
DELETE /orders/{orderId}
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "orderId": "uuid",
    "status": "cancelled",
    "cancelledAt": "2024-01-01T12:10:00Z"
  }
}
```

---

### Get Trade History
```http
GET /trades?tokenId={tokenId}&page=1&limit=20
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "trades": [
      {
        "id": "uuid",
        "tokenId": "uuid",
        "tokenSymbol": "SARAH",
        "side": "buy", // User's side
        "price": 2.45,
        "quantity": 50,
        "totalValue": 122.5,
        "fee": 0.6125,
        "executedAt": "2024-01-01T12:05:00Z",
        "settlementStatus": "settled",
        "blockchainTxHash": "0x..."
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 120,
      "totalPages": 6
    }
  }
}
```

---

### Estimate Trade
```http
POST /orders/estimate
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "tokenId": "uuid",
  "orderType": "buy",
  "executionType": "market",
  "quantity": 100
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "estimatedPrice": 2.46,
    "estimatedTotal": 246,
    "estimatedFee": 1.23,
    "priceImpact": 0.41, // percentage
    "executionProbability": 95 // percentage
  }
}
```

---

## Portfolio & Balances

### Get User Portfolio
```http
GET /users/me/portfolio
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalValue": 12450.50,
    "fiatBalance": 5000.00,
    "tokenValue": 7450.50,
    "change24h": 325.75,
    "changePercent24h": 2.69,
    "lastUpdated": "2024-01-01T12:00:00Z"
  }
}
```

---

### Get User Investments
```http
GET /users/me/investments
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "investments": [
      {
        "creatorId": "uuid",
        "creatorName": "Sarah Chen",
        "creatorTitle": "AI Research Scientist",
        "creatorAvatar": "https://...",
        "tokenId": "uuid",
        "tokenSymbol": "SARAH",
        "balance": 100,
        "averageBuyPrice": 2.30,
        "currentPrice": 2.45,
        "totalValue": 245,
        "unrealizedGain": 15,
        "unrealizedGainPercent": 6.52,
        "priceChange24h": 5.2
      }
    ],
    "summary": {
      "totalInvested": 7200,
      "totalValue": 7450.50,
      "totalGain": 250.50,
      "totalGainPercent": 3.48
    }
  }
}
```

---

### Get Balance History
```http
GET /users/me/balance-history?period=24h&interval=1h
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "history": [
      {
        "timestamp": "2024-01-01T00:00:00Z",
        "totalValue": 12000,
        "fiatValue": 5000,
        "tokenValue": 7000
      },
      {
        "timestamp": "2024-01-01T01:00:00Z",
        "totalValue": 12100,
        "fiatValue": 5000,
        "tokenValue": 7100
      }
    ]
  }
}
```

---

## Transactions

### Get User Transactions
```http
GET /transactions?type=buy&status=completed&page=1&limit=20
Authorization: Bearer {token}
```

**Query Parameters:**
- `type`: `buy`, `sell`, `deposit`, `withdrawal`, `transfer`, `fee`
- `status`: `pending`, `completed`, `failed`, `cancelled`
- `tokenId` (uuid): Filter by token
- `page`, `limit`: Pagination

**Response:**
```json
{
  "success": true,
  "data": {
    "transactions": [
      {
        "id": "uuid",
        "type": "buy",
        "status": "completed",
        "tokenId": "uuid",
        "tokenSymbol": "SARAH",
        "amount": 100,
        "price": 2.45,
        "fee": 1.225,
        "totalCost": 246.225,
        "blockchainTxHash": "0x...",
        "createdAt": "2024-01-01T12:00:00Z",
        "completedAt": "2024-01-01T12:00:30Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 250,
      "totalPages": 13
    }
  }
}
```

---

## Social Features

### Follow Creator
```http
POST /creators/{creatorId}/follow
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "creatorId": "uuid",
    "following": true,
    "followedAt": "2024-01-01T12:00:00Z"
  }
}
```

---

### Unfollow Creator
```http
DELETE /creators/{creatorId}/follow
Authorization: Bearer {token}
```

---

### Get Following List
```http
GET /users/me/following
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "following": [
      {
        "creatorId": "uuid",
        "name": "Sarah Chen",
        "title": "AI Research Scientist",
        "avatar": "https://...",
        "tokenSymbol": "SARAH",
        "tokenPrice": 2.45,
        "priceChange24h": 5.2,
        "followedAt": "2024-01-01T12:00:00Z"
      }
    ],
    "total": 15
  }
}
```

---

### Get Trending Topics
```http
GET /trending?limit=10
```

**Response:**
```json
{
  "success": true,
  "data": {
    "topics": [
      {
        "rank": 1,
        "title": "Harvard Law Professor Joins Platform",
        "tags": ["Law", "Education"],
        "people": ["Prof. Johnson"],
        "sentiment": "Bullish",
        "views": 15420,
        "publishedAt": "2024-01-01T10:00:00Z"
      }
    ]
  }
}
```

---

## Applications & Onboarding

### Submit Creator Application
```http
POST /creators/apply
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "personalInfo": {
    "fullName": "Sarah Chen",
    "email": "sarah@example.com",
    "phone": "+1234567890",
    "location": "Cambridge, MA",
    "bio": "..."
  },
  "professionalInfo": {
    "title": "AI Research Scientist",
    "profileUrls": [
      {
        "url": "https://linkedin.com/in/sarahchen",
        "label": "LinkedIn Profile",
        "displayType": "profile-card"
      }
    ]
  },
  "tokenConfig": {
    "symbol": "SARAH",
    "totalSupply": 100000,
    "initialPrice": 1.00,
    "seedLiquidity": 10000,
    "buybackDurationYears": 5
  },
  "documents": {
    "resumeUrl": "https://...",
    "idDocumentUrl": "https://...",
    "pitchVideoUrl": "https://..."
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "applicationId": "uuid",
    "status": "submitted",
    "submittedAt": "2024-01-01T12:00:00Z"
  }
}
```

---

### Check Token Symbol Availability
```http
GET /token-symbols/available?symbol=SARAH
```

**Response:**
```json
{
  "success": true,
  "data": {
    "symbol": "SARAH",
    "available": true
  }
}
```

---

### Scrape Profile URL
```http
POST /scrape
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "url": "https://linkedin.com/in/sarahchen"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "title": "Sarah Chen - AI Research Scientist",
    "description": "...",
    "imageUrl": "https://...",
    "metadata": {
      "occupation": "AI Research Scientist",
      "company": "MIT CSAIL",
      "location": "Cambridge, MA"
    }
  }
}
```

---

### Upload Document
```http
POST /upload
Authorization: Bearer {token}
Content-Type: multipart/form-data
```

**Form Data:**
- `file`: File (PDF, DOC, DOCX, JPG, PNG, MP4, MOV, AVI)
- `type`: `resume`, `id_document`, `pitch_video`

**Response:**
```json
{
  "success": true,
  "data": {
    "url": "https://storage.peoplecoin.com/...",
    "filename": "resume.pdf",
    "size": 524288,
    "mimeType": "application/pdf"
  }
}
```

---

## Market Data

### Get Market Sentiment
```http
GET /market/sentiment
```

**Response:**
```json
{
  "success": true,
  "data": {
    "score": 72,
    "label": "Greed",
    "previous": 68,
    "change": 4,
    "recordedAt": "2024-01-01T12:00:00Z"
  }
}
```

---

### Get Platform Statistics
```http
GET /statistics
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalUsers": 15420,
    "totalCreators": 150,
    "totalTokens": 148,
    "totalVolume24h": 2500000,
    "totalTrades24h": 8934,
    "recordedAt": "2024-01-01T12:00:00Z"
  }
}
```

---

### Get Categories
```http
GET /categories
```

**Response:**
```json
{
  "success": true,
  "data": {
    "categories": ["Tech", "Sports", "Music", "Business", "Law", "Education"]
  }
}
```

---

## WebSocket API

### Connect to WebSocket
```
wss://ws.peoplecoin.com/v1
```

**Authentication:**
Send authentication message immediately after connection:
```json
{
  "type": "auth",
  "token": "eyJhbGciOiJIUzI1..."
}
```

---

### Subscribe to Order Book Updates
```json
{
  "type": "subscribe",
  "channel": "orderbook",
  "tokenId": "uuid"
}
```

**Server Response:**
```json
{
  "type": "orderbook_update",
  "tokenId": "uuid",
  "bids": [...],
  "asks": [...],
  "timestamp": "2024-01-01T12:00:00Z"
}
```

---

### Subscribe to Trades
```json
{
  "type": "subscribe",
  "channel": "trades",
  "tokenId": "uuid"
}
```

**Server Response:**
```json
{
  "type": "trade",
  "tokenId": "uuid",
  "tradeId": "uuid",
  "price": 2.45,
  "quantity": 50,
  "side": "buy",
  "timestamp": "2024-01-01T12:00:00Z"
}
```

---

### Subscribe to Price Updates
```json
{
  "type": "subscribe",
  "channel": "price",
  "tokenId": "uuid"
}
```

**Server Response:**
```json
{
  "type": "price_update",
  "tokenId": "uuid",
  "price": 2.45,
  "priceChange24h": 5.2,
  "volume24h": 50000,
  "timestamp": "2024-01-01T12:00:00Z"
}
```

---

### Subscribe to User Order Updates
```json
{
  "type": "subscribe",
  "channel": "user_orders"
}
```

**Server Response:**
```json
{
  "type": "order_update",
  "orderId": "uuid",
  "status": "filled",
  "filledQuantity": 100,
  "updatedAt": "2024-01-01T12:00:00Z"
}
```

---

## Error Responses

All error responses follow this format:

```json
{
  "success": false,
  "error": {
    "code": "INVALID_TOKEN_SYMBOL",
    "message": "Token symbol must be 3-5 characters",
    "details": {
      "field": "tokenSymbol",
      "value": "SA"
    }
  }
}
```

### Common Error Codes
- `UNAUTHORIZED`: Authentication required
- `FORBIDDEN`: Insufficient permissions
- `NOT_FOUND`: Resource not found
- `VALIDATION_ERROR`: Input validation failed
- `INSUFFICIENT_BALANCE`: Not enough funds
- `ORDER_NOT_FOUND`: Order doesn't exist
- `INVALID_ORDER`: Invalid order parameters
- `MARKET_CLOSED`: Trading not available
- `RATE_LIMIT_EXCEEDED`: Too many requests

---

## Rate Limiting

- **Public endpoints:** 100 requests/minute
- **Authenticated endpoints:** 1000 requests/minute
- **Trading endpoints:** 100 requests/minute
- **WebSocket:** 1000 messages/minute

**Headers:**
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 995
X-RateLimit-Reset: 1640995200
```

---

## Pagination

All list endpoints support pagination:

**Query Parameters:**
- `page` (int): Page number (default: 1)
- `limit` (int): Items per page (default: 20, max: 100)

**Response:**
```json
{
  "success": true,
  "data": {
    "items": [...],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 500,
      "totalPages": 25,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

---

## Webhooks

Platform supports webhooks for key events:

### Webhook Events
- `order.created`
- `order.filled`
- `order.cancelled`
- `trade.executed`
- `document.signed`
- `application.submitted`
- `application.approved`

### Webhook Payload
```json
{
  "event": "order.filled",
  "timestamp": "2024-01-01T12:00:00Z",
  "data": {
    "orderId": "uuid",
    "userId": "uuid",
    "tokenId": "uuid",
    "filledQuantity": 100,
    "price": 2.45
  }
}
```

---

## Summary

### Total Endpoints: 50+

**Authentication:** 3 endpoints
**User Management:** 2 endpoints
**Creator Management:** 4 endpoints
**Token Information:** 4 endpoints
**Order Book & Trading:** 6 endpoints ⭐
**Portfolio & Balances:** 3 endpoints
**Transactions:** 1 endpoint
**Social Features:** 4 endpoints
**Applications:** 4 endpoints
**Market Data:** 3 endpoints
**WebSocket:** 4 channels
**Utility:** File upload, scraping, etc.
