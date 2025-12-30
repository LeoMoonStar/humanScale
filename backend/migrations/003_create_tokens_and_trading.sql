-- Create tokens table (simplified - most data from third-party APIs)
CREATE TABLE IF NOT EXISTS tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES creators(id) ON DELETE RESTRICT,

  -- Blockchain identifiers
  coin_type VARCHAR(255) UNIQUE NOT NULL,
  symbol VARCHAR(10) NOT NULL,

  -- Deployment info
  deployed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deployer_address VARCHAR(66),
  pool_address VARCHAR(66),

  -- Status
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'deployed', 'active', 'suspended'))
);

CREATE INDEX idx_tokens_creator ON tokens(creator_id);
CREATE INDEX idx_tokens_coin_type ON tokens(coin_type);
CREATE INDEX idx_tokens_symbol ON tokens(symbol);
CREATE INDEX idx_tokens_status ON tokens(status);

-- Orders table (centralized order book)
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  token_id UUID NOT NULL REFERENCES tokens(id) ON DELETE RESTRICT,

  order_type VARCHAR(10) NOT NULL CHECK (order_type IN ('buy', 'sell')),
  side VARCHAR(10) NOT NULL CHECK (side IN ('bid', 'ask')),

  price DECIMAL(20, 8) NOT NULL,
  quantity BIGINT NOT NULL,
  filled_quantity BIGINT DEFAULT 0,
  remaining_quantity BIGINT NOT NULL,

  execution_type VARCHAR(10) NOT NULL DEFAULT 'limit' CHECK (execution_type IN ('market', 'limit')),
  time_in_force VARCHAR(10) DEFAULT 'GTC' CHECK (time_in_force IN ('GTC', 'IOC', 'FOK')),

  status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'partially_filled', 'filled', 'cancelled', 'rejected')),

  fee_rate DECIMAL(6, 4) DEFAULT 0.005,
  fee_paid DECIMAL(20, 8) DEFAULT 0,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_orders_user_token ON orders(user_id, token_id);
CREATE INDEX idx_orders_token_status ON orders(token_id, status);
CREATE INDEX idx_orders_side_price ON orders(side, price, created_at);
CREATE INDEX idx_orders_status ON orders(status);

-- Trades table
CREATE TABLE IF NOT EXISTS trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_order_id UUID NOT NULL REFERENCES orders(id),
  seller_order_id UUID NOT NULL REFERENCES orders(id),
  buyer_id UUID NOT NULL REFERENCES users(id),
  seller_id UUID NOT NULL REFERENCES users(id),
  token_id UUID NOT NULL REFERENCES tokens(id) ON DELETE RESTRICT,

  price DECIMAL(20, 8) NOT NULL,
  quantity BIGINT NOT NULL,
  total_value DECIMAL(30, 8) NOT NULL,

  buyer_fee DECIMAL(20, 8) DEFAULT 0,
  seller_fee DECIMAL(20, 8) DEFAULT 0,
  platform_fee DECIMAL(20, 8) DEFAULT 0,

  settlement_status VARCHAR(20) DEFAULT 'pending' CHECK (settlement_status IN ('pending', 'settled', 'failed')),
  blockchain_tx_hash VARCHAR(66),

  executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  settled_at TIMESTAMP
);

CREATE INDEX idx_trades_token_time ON trades(token_id, executed_at DESC);
CREATE INDEX idx_trades_buyer ON trades(buyer_id);
CREATE INDEX idx_trades_seller ON trades(seller_id);
CREATE INDEX idx_trades_settlement ON trades(settlement_status);

-- Portfolio history
CREATE TABLE IF NOT EXISTS portfolio_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_id UUID NOT NULL REFERENCES tokens(id) ON DELETE CASCADE,
  total_invested DECIMAL(20, 8) DEFAULT 0,
  total_value DECIMAL(20, 8) DEFAULT 0,
  quantity BIGINT DEFAULT 0,
  avg_buy_price DECIMAL(20, 8) DEFAULT 0,
  realized_pnl DECIMAL(20, 8) DEFAULT 0,
  unrealized_pnl DECIMAL(20, 8) DEFAULT 0,
  snapshot_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_portfolio_user ON portfolio_history(user_id);
CREATE INDEX idx_portfolio_token ON portfolio_history(token_id);
CREATE INDEX idx_portfolio_snapshot ON portfolio_history(snapshot_at DESC);
