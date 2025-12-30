# PeopleCoin - Database Schema Design

## Overview
This document outlines the complete database schema for the PeopleCoin platform, including user management, creator tokens, order book, trading, and social features.

---

## Core Tables

### 1. Users
Primary table for all platform users (investors and creators).

**Web3-First Design**: Wallet address is the primary identity. Email is optional for notifications only.

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address VARCHAR(66) UNIQUE NOT NULL, -- Sui blockchain wallet (PRIMARY IDENTITY)

  -- Optional Profile Info (user can add later)
  username VARCHAR(50) UNIQUE,
  email VARCHAR(255) UNIQUE, -- Optional, for notifications only
  full_name VARCHAR(255),
  phone VARCHAR(50),
  location VARCHAR(255),
  avatar_url TEXT,
  bio TEXT,

  -- Authentication
  nonce VARCHAR(64), -- Current challenge nonce for signature verification
  nonce_expires_at TIMESTAMP,

  -- Verification & Security
  email_verified BOOLEAN DEFAULT FALSE, -- Only if email provided
  kyc_verified BOOLEAN DEFAULT FALSE,
  kyc_status ENUM('not_started', 'pending', 'approved', 'rejected') DEFAULT 'not_started',

  -- Status
  status ENUM('active', 'suspended', 'banned') DEFAULT 'active',
  role ENUM('user', 'creator', 'admin') DEFAULT 'user',

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  last_login_at TIMESTAMP,

  INDEX idx_wallet (wallet_address),
  INDEX idx_email (email),
  INDEX idx_username (username),
  INDEX idx_status (status),
  INDEX idx_role (role)
);
```

---

### 2. Creators
Extended profile information for creators.

```sql
CREATE TABLE creators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Profile Information
  professional_title VARCHAR(255) NOT NULL,
  banner_url TEXT,
  category VARCHAR(100), -- Tech, Sports, Music, Business, Law, etc.
  industry VARCHAR(100),
  verified BOOLEAN DEFAULT FALSE,

  -- Professional Details
  future_goals TEXT,
  current_work TEXT,
  challenges TEXT,
  interests TEXT,

  -- Social Links
  linkedin_url TEXT,
  github_url TEXT,
  website_url TEXT,
  twitter_url TEXT,

  -- Application Details
  application_id UUID REFERENCES creator_applications(id),
  approved_at TIMESTAMP,
  approved_by UUID REFERENCES users(id),

  -- Q&A Sessions
  upcoming_qa_date TIMESTAMP,
  upcoming_qa_time VARCHAR(50),
  upcoming_qa_link TEXT,
  last_qa_video_url TEXT,

  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_user_id (user_id),
  INDEX idx_category (category),
  INDEX idx_industry (industry),
  INDEX idx_verified (verified)
);
```

---

### 3. Creator Skills
Skills associated with each creator.

```sql
CREATE TABLE creator_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
  skill_name VARCHAR(100) NOT NULL,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_creator_id (creator_id),
  INDEX idx_skill_name (skill_name)
);
```

---

### 4. Creator Achievements
Achievements and notable accomplishments.

```sql
CREATE TABLE creator_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
  achievement TEXT NOT NULL,
  order_index INT DEFAULT 0,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_creator_id (creator_id)
);
```

---

### 5. Work Experience
Professional work history for creators.

```sql
CREATE TABLE work_experiences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES creators(id) ON DELETE CASCADE,

  job_title VARCHAR(255) NOT NULL,
  company VARCHAR(255) NOT NULL,
  location VARCHAR(255),
  start_date DATE,
  end_date DATE,
  is_current BOOLEAN DEFAULT FALSE,
  duration VARCHAR(100), -- "2021 - Present"
  description TEXT,

  order_index INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_creator_id (creator_id)
);
```

---

### 6. Education
Educational background for creators.

```sql
CREATE TABLE education (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES creators(id) ON DELETE CASCADE,

  degree VARCHAR(255) NOT NULL,
  school VARCHAR(255) NOT NULL,
  graduation_year VARCHAR(10),

  order_index INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_creator_id (creator_id)
);
```

---

### 7. Creator Content Sections
Custom content sections (videos, embeds, etc.).

```sql
CREATE TABLE creator_content_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES creators(id) ON DELETE CASCADE,

  type ENUM('video', 'iframe') NOT NULL,
  title VARCHAR(255) NOT NULL,
  url TEXT NOT NULL,

  order_index INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_creator_id (creator_id)
);
```

---

## Token Tables

### 8. Tokens
Creator tokens on the blockchain.

```sql
CREATE TABLE tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID UNIQUE NOT NULL REFERENCES creators(id) ON DELETE RESTRICT,

  -- Token Details
  symbol VARCHAR(10) UNIQUE NOT NULL, -- e.g., "SARAH", max 5 chars
  name VARCHAR(255) NOT NULL, -- e.g., "Sarah Chen Token"
  decimals INT DEFAULT 8,

  -- Supply & Distribution
  total_supply BIGINT NOT NULL,
  creator_allocation BIGINT NOT NULL, -- 30%
  reserve_allocation BIGINT NOT NULL, -- 30%
  liquidity_allocation BIGINT NOT NULL, -- 40%
  circulating_supply BIGINT DEFAULT 0,

  -- Pricing
  initial_price DECIMAL(20, 8) NOT NULL, -- in USD
  current_price DECIMAL(20, 8) NOT NULL,

  -- Market Stats
  market_cap DECIMAL(30, 2),
  total_holders INT DEFAULT 0,
  total_volume_24h DECIMAL(30, 2) DEFAULT 0,
  price_change_24h DECIMAL(10, 4) DEFAULT 0, -- percentage

  -- Blockchain
  contract_address VARCHAR(66) UNIQUE, -- Sui blockchain address
  pool_id VARCHAR(66), -- AMM pool ID
  vault_id VARCHAR(66), -- Buyback vault ID

  -- Launch Details
  release_date TIMESTAMP,
  seed_liquidity DECIMAL(20, 2), -- Initial liquidity in USD
  buyback_duration_years INT DEFAULT 5,

  -- Status
  status ENUM('pending', 'active', 'paused', 'delisted') DEFAULT 'pending',

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_creator_id (creator_id),
  INDEX idx_symbol (symbol),
  INDEX idx_status (status),
  INDEX idx_contract_address (contract_address)
);
```

---

### 9. Token Price History
Historical price data for charts.

```sql
CREATE TABLE token_price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_id UUID NOT NULL REFERENCES tokens(id) ON DELETE CASCADE,

  price DECIMAL(20, 8) NOT NULL,
  volume_24h DECIMAL(30, 2) DEFAULT 0,
  market_cap DECIMAL(30, 2),

  timestamp TIMESTAMP NOT NULL,

  INDEX idx_token_timestamp (token_id, timestamp),
  INDEX idx_timestamp (timestamp)
);
```

---

### 10. Token Holders
Track token ownership distribution.

```sql
CREATE TABLE token_holders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_id UUID NOT NULL REFERENCES tokens(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  balance BIGINT NOT NULL DEFAULT 0,
  percentage DECIMAL(10, 6) DEFAULT 0,

  first_acquired_at TIMESTAMP,
  last_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY unique_holder (token_id, user_id),
  INDEX idx_token_id (token_id),
  INDEX idx_user_id (user_id),
  INDEX idx_balance (balance DESC)
);
```

---

## Order Book Tables (Critical for Centralized Trading)

### 11. Orders
Central order book for buy/sell orders.

```sql
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Order Details
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  token_id UUID NOT NULL REFERENCES tokens(id) ON DELETE RESTRICT,

  order_type ENUM('buy', 'sell') NOT NULL,
  side ENUM('bid', 'ask') NOT NULL, -- bid = buy, ask = sell

  -- Pricing
  price DECIMAL(20, 8) NOT NULL, -- Price per token in USD
  quantity BIGINT NOT NULL, -- Amount of tokens
  filled_quantity BIGINT DEFAULT 0,
  remaining_quantity BIGINT NOT NULL,

  -- Order Type
  execution_type ENUM('market', 'limit') NOT NULL DEFAULT 'limit',
  time_in_force ENUM('GTC', 'IOC', 'FOK') DEFAULT 'GTC',
  -- GTC = Good Till Cancel
  -- IOC = Immediate or Cancel
  -- FOK = Fill or Kill

  -- Status
  status ENUM('open', 'partially_filled', 'filled', 'cancelled', 'rejected') DEFAULT 'open',

  -- Fees
  fee_rate DECIMAL(6, 4) DEFAULT 0.005, -- 0.5%
  fee_paid DECIMAL(20, 8) DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  filled_at TIMESTAMP,
  cancelled_at TIMESTAMP,
  expires_at TIMESTAMP,

  INDEX idx_user_token (user_id, token_id),
  INDEX idx_token_status (token_id, status),
  INDEX idx_side_price (side, price, created_at),
  INDEX idx_status (status),
  INDEX idx_created (created_at DESC)
);
```

---

### 12. Trades
Executed trades (matches between orders).

```sql
CREATE TABLE trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Matched Orders
  buyer_order_id UUID NOT NULL REFERENCES orders(id),
  seller_order_id UUID NOT NULL REFERENCES orders(id),
  buyer_id UUID NOT NULL REFERENCES users(id),
  seller_id UUID NOT NULL REFERENCES users(id),
  token_id UUID NOT NULL REFERENCES tokens(id) ON DELETE RESTRICT,

  -- Trade Details
  price DECIMAL(20, 8) NOT NULL, -- Execution price
  quantity BIGINT NOT NULL, -- Amount traded
  total_value DECIMAL(30, 8) NOT NULL, -- price * quantity

  -- Fees
  buyer_fee DECIMAL(20, 8) DEFAULT 0,
  seller_fee DECIMAL(20, 8) DEFAULT 0,
  platform_fee DECIMAL(20, 8) DEFAULT 0,

  -- Settlement
  settlement_status ENUM('pending', 'settled', 'failed') DEFAULT 'pending',
  blockchain_tx_hash VARCHAR(66), -- Sui transaction hash

  executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  settled_at TIMESTAMP,

  INDEX idx_buyer_id (buyer_id),
  INDEX idx_seller_id (seller_id),
  INDEX idx_token_time (token_id, executed_at DESC),
  INDEX idx_orders (buyer_order_id, seller_order_id),
  INDEX idx_executed (executed_at DESC)
);
```

---

### 13. Order Book Snapshots
Periodic snapshots of order book state for analytics.

```sql
CREATE TABLE order_book_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_id UUID NOT NULL REFERENCES tokens(id) ON DELETE CASCADE,

  -- Best Bid/Ask
  best_bid_price DECIMAL(20, 8),
  best_ask_price DECIMAL(20, 8),
  spread DECIMAL(20, 8),
  spread_percentage DECIMAL(10, 4),

  -- Depth
  total_bid_volume BIGINT,
  total_ask_volume BIGINT,

  -- Snapshot Data (JSON)
  bids JSON, -- [{price: 2.45, quantity: 1000, orders: 5}, ...]
  asks JSON, -- [{price: 2.47, quantity: 800, orders: 3}, ...]

  snapshot_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_token_time (token_id, snapshot_at DESC)
);
```

---

## Transaction & Portfolio Tables

### 14. Transactions
All blockchain and platform transactions.

```sql
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  token_id UUID REFERENCES tokens(id) ON DELETE RESTRICT,

  -- Transaction Details
  type ENUM('buy', 'sell', 'deposit', 'withdrawal', 'transfer', 'fee') NOT NULL,
  status ENUM('pending', 'completed', 'failed', 'cancelled') DEFAULT 'pending',

  -- Amounts
  amount DECIMAL(30, 8) NOT NULL,
  fee DECIMAL(20, 8) DEFAULT 0,
  price DECIMAL(20, 8), -- Price at execution (for trades)

  -- Related Records
  order_id UUID REFERENCES orders(id),
  trade_id UUID REFERENCES trades(id),

  -- Blockchain
  blockchain_tx_hash VARCHAR(66),
  blockchain_status VARCHAR(50),

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,

  INDEX idx_user_id (user_id),
  INDEX idx_token_id (token_id),
  INDEX idx_status (status),
  INDEX idx_type (type),
  INDEX idx_created (created_at DESC)
);
```

---

### 15. User Balances
Real-time user portfolio balances.

```sql
CREATE TABLE user_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Fiat Balance (USD)
  fiat_balance DECIMAL(30, 2) DEFAULT 0,
  fiat_locked DECIMAL(30, 2) DEFAULT 0, -- In open orders

  -- Metadata
  last_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY unique_user (user_id),
  INDEX idx_user_id (user_id)
);
```

---

### 16. Portfolio History
Historical portfolio value snapshots.

```sql
CREATE TABLE portfolio_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  total_value DECIMAL(30, 2) NOT NULL,
  fiat_value DECIMAL(30, 2) DEFAULT 0,
  token_value DECIMAL(30, 2) DEFAULT 0,

  snapshot_at TIMESTAMP NOT NULL,

  INDEX idx_user_time (user_id, snapshot_at DESC)
);
```

---

## Social & Engagement Tables

### 17. Following
User follows creator relationships.

```sql
CREATE TABLE following (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES creators(id) ON DELETE CASCADE,

  followed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE KEY unique_follow (user_id, creator_id),
  INDEX idx_user_id (user_id),
  INDEX idx_creator_id (creator_id)
);
```

---

### 18. Invitations
Creator invitation tracking.

```sql
CREATE TABLE invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  person_name VARCHAR(255) NOT NULL, -- Person being invited
  sender_name VARCHAR(255) NOT NULL,
  sender_email VARCHAR(255),
  message TEXT,
  join_group BOOLEAN DEFAULT FALSE,

  status ENUM('submitted', 'sent', 'accepted', 'declined') DEFAULT 'submitted',

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_person_name (person_name),
  INDEX idx_status (status)
);
```

---

### 19. Trending Topics
News and trending topics.

```sql
CREATE TABLE trending_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  title VARCHAR(500) NOT NULL,
  tags JSON, -- ["AI", "Tech", "Innovation"]
  people JSON, -- ["Elon Musk", "Sam Altman"]
  sentiment ENUM('Bullish', 'Neutral', 'Bearish') DEFAULT 'Neutral',
  view_count INT DEFAULT 0,

  published_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_published (published_at DESC),
  INDEX idx_sentiment (sentiment)
);
```

---

## Application & Onboarding Tables

### 20. Creator Applications
Creator onboarding applications.

```sql
CREATE TABLE creator_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,

  -- Personal Info
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  location VARCHAR(255),
  bio TEXT,

  -- Professional Info
  professional_title VARCHAR(255) NOT NULL,

  -- Token Configuration
  token_symbol VARCHAR(10) NOT NULL,
  total_supply BIGINT NOT NULL,
  initial_price DECIMAL(20, 8) NOT NULL,
  seed_liquidity DECIMAL(20, 2) NOT NULL,
  buyback_duration_years INT DEFAULT 5,

  -- Documents
  resume_url TEXT,
  id_document_url TEXT,
  pitch_video_url TEXT,

  -- Status
  status ENUM('draft', 'submitted', 'under_review', 'approved', 'rejected') DEFAULT 'draft',
  reviewed_by UUID REFERENCES users(id),
  review_notes TEXT,

  submitted_at TIMESTAMP,
  reviewed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_user_id (user_id),
  INDEX idx_status (status),
  INDEX idx_submitted (submitted_at DESC)
);
```

---

### 21. Application Profile URLs
URLs submitted in creator applications.

```sql
CREATE TABLE application_profile_urls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES creator_applications(id) ON DELETE CASCADE,

  url TEXT NOT NULL,
  label VARCHAR(255),
  display_type ENUM('embed', 'link', 'video', 'profile-card') DEFAULT 'link',

  -- Scraped Data
  scraped BOOLEAN DEFAULT FALSE,
  scraped_data JSON, -- {title, description, imageUrl, metadata}

  order_index INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_application_id (application_id)
);
```

---

### 22. Documents
Legal documents for signing.

```sql
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  title VARCHAR(255) NOT NULL,
  description TEXT,
  type ENUM('creator_agreement', 'buyback_obligation', 'privacy_policy', 'terms_of_service'),

  content_url TEXT NOT NULL, -- PDF URL
  pages INT DEFAULT 1,
  version VARCHAR(20) DEFAULT '1.0',

  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_type (type),
  INDEX idx_active (is_active)
);
```

---

### 23. Document Signatures
Track document signing.

```sql
CREATE TABLE document_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE RESTRICT,
  application_id UUID REFERENCES creator_applications(id),

  -- DocuSign Integration
  envelope_id VARCHAR(255),
  signing_url TEXT,

  status ENUM('pending', 'sent', 'delivered', 'signed', 'declined') DEFAULT 'pending',
  ip_address VARCHAR(45),

  sent_at TIMESTAMP,
  signed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_user_document (user_id, document_id),
  INDEX idx_status (status),
  INDEX idx_envelope (envelope_id)
);
```

---

## Market Data & Analytics

### 24. Market Sentiment
Overall market sentiment tracking.

```sql
CREATE TABLE market_sentiment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  score INT NOT NULL, -- 0-100
  label VARCHAR(50) NOT NULL, -- "Extreme Fear", "Fear", "Neutral", "Greed", "Extreme Greed"

  recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_recorded (recorded_at DESC)
);
```

---

### 25. Platform Statistics
Platform-wide metrics.

```sql
CREATE TABLE platform_statistics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  total_users INT DEFAULT 0,
  total_creators INT DEFAULT 0,
  total_tokens INT DEFAULT 0,
  total_volume_24h DECIMAL(30, 2) DEFAULT 0,
  total_trades_24h INT DEFAULT 0,

  recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_recorded (recorded_at DESC)
);
```

---

## Summary

### Total Tables: 25

**Core Entities:**
- Users, Creators, Creator Details (Skills, Achievements, Experience, Education, Content)

**Tokens:**
- Tokens, Price History, Holders

**Order Book & Trading:**
- Orders, Trades, Order Book Snapshots
- Transactions, User Balances, Portfolio History

**Social:**
- Following, Invitations, Trending Topics

**Applications:**
- Creator Applications, Profile URLs, Documents, Signatures

**Analytics:**
- Market Sentiment, Platform Statistics

---

## Key Indexes
All tables include appropriate indexes for:
- Primary lookups (user_id, token_id, creator_id)
- Status filtering
- Time-based queries
- Unique constraints
- Foreign key relationships

---

## Data Integrity
- Foreign key constraints ensure referential integrity
- Cascade deletes where appropriate (user data, creator profiles)
- Restrict deletes on critical financial data (orders, trades, transactions)
- Unique constraints on critical business logic (one creator per user, unique token symbols, unique wallets)
