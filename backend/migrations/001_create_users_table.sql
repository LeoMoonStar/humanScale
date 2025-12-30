-- Create users table (Web3-first authentication)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address VARCHAR(66) UNIQUE NOT NULL,

  -- Optional profile info
  username VARCHAR(50) UNIQUE,
  email VARCHAR(255) UNIQUE,
  full_name VARCHAR(255),
  phone VARCHAR(50),
  location VARCHAR(255),
  avatar_url TEXT,
  bio TEXT,

  -- Authentication (no password!)
  nonce VARCHAR(64),
  nonce_expires_at TIMESTAMP,

  -- Verification & security
  email_verified BOOLEAN DEFAULT FALSE,
  kyc_verified BOOLEAN DEFAULT FALSE,
  kyc_status VARCHAR(20) DEFAULT 'not_started' CHECK (kyc_status IN ('not_started', 'pending', 'approved', 'rejected')),

  -- Status
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'banned')),
  role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'creator', 'admin')),

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login_at TIMESTAMP
);

-- Indexes
CREATE INDEX idx_users_wallet ON users(wallet_address);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_role ON users(role);

-- User balances
CREATE TABLE IF NOT EXISTS user_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  currency VARCHAR(10) NOT NULL DEFAULT 'USD',
  balance DECIMAL(20, 8) DEFAULT 0,
  locked DECIMAL(20, 8) DEFAULT 0,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(user_id, currency)
);

CREATE INDEX idx_user_balances_user ON user_balances(user_id);
