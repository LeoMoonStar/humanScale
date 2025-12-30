# PeopleCoin - Order Book System Design

## Overview
The Order Book is a **critical centralized component** that manages all trading orders for creator tokens on the PeopleCoin platform. While we integrate with decentralized exchanges (DEX) for blockchain settlement, the centralized order book provides:

1. **Fast order matching** - Sub-millisecond matching engine
2. **Fair price discovery** - Transparent bid/ask spreads
3. **Order management** - Full control over order lifecycle
4. **Liquidity aggregation** - Combines platform and DEX liquidity
5. **Advanced order types** - Limit, market, stop-loss, etc.

---

## Architecture

### High-Level Components

```
┌─────────────────────────────────────────────────────────────┐
│                      Trading Platform                        │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐      ┌──────────────┐      ┌────────────┐│
│  │   REST API   │◄────►│ Order Book   │◄────►│ WebSocket  ││
│  │              │      │   Engine     │      │  Server    ││
│  └──────────────┘      └──────────────┘      └────────────┘│
│         ▲                      ▲                     │       │
│         │                      │                     │       │
│         ▼                      ▼                     ▼       │
│  ┌──────────────┐      ┌──────────────┐      ┌────────────┐│
│  │   Database   │      │ Redis Cache  │      │   Client   ││
│  │  PostgreSQL  │      │ (Hot Orders) │      │ Browsers   ││
│  └──────────────┘      └──────────────┘      └────────────┘│
│                                                               │
└───────────────────────────┬───────────────────────────────────┘
                            │
                            ▼
              ┌──────────────────────────┐
              │  Blockchain Settlement   │
              │    (Sui DEX Integration) │
              └──────────────────────────┘
```

---

## Order Book Data Structure

### In-Memory Order Book (Per Token)

```typescript
class OrderBook {
  tokenId: string;

  // Price-Level Aggregated Order Book
  bids: PriceLevel[]; // Sorted DESC by price
  asks: PriceLevel[]; // Sorted ASC by price

  // Fast lookups
  orderMap: Map<string, Order>; // orderId -> Order
  userOrders: Map<string, Set<string>>; // userId -> orderIds

  // Market state
  lastPrice: number;
  lastTradeTime: Date;

  // Statistics
  volume24h: number;
  trades24h: number;
}

interface PriceLevel {
  price: number;
  quantity: number; // Total quantity at this price
  orders: Order[]; // Ordered by time (FIFO)
}

interface Order {
  id: string;
  userId: string;
  tokenId: string;
  side: 'bid' | 'ask';
  orderType: 'buy' | 'sell';
  executionType: 'market' | 'limit';
  price: number;
  quantity: number;
  filledQuantity: number;
  remainingQuantity: number;
  status: 'open' | 'partially_filled' | 'filled' | 'cancelled';
  timeInForce: 'GTC' | 'IOC' | 'FOK';
  createdAt: Date;
  updatedAt: Date;
}
```

---

## Order Matching Engine

### Matching Algorithm

The matching engine follows **price-time priority**:

1. **Price Priority**: Higher bid prices match first, lower ask prices match first
2. **Time Priority**: Among same-price orders, earlier orders match first (FIFO)

### Matching Process Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    New Order Received                        │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
         ┌────────────────┐
         │ Validate Order │
         │  - Balance     │
         │  - Limits      │
         │  - Token       │
         └───────┬────────┘
                  │
                  ▼
         ┌────────────────┐
    ┌───►│ Lock Funds     │
    │    │  - Fiat (buy)  │
    │    │  - Tokens(sell)│
    │    └───────┬────────┘
    │            │
    │            ▼
    │    ┌────────────────┐          ┌─────────────┐
    │    │ Market Order?  │──Yes────►│ Match Now   │
    │    └───────┬────────┘          │ Best Price  │
    │            │ No                └──────┬──────┘
    │            ▼                          │
    │    ┌────────────────┐                │
    │    │ Add to Order   │                │
    │    │     Book       │                │
    │    └───────┬────────┘                │
    │            │                          │
    │            └──────────┬───────────────┘
    │                       │
    │                       ▼
    │              ┌────────────────┐
    │              │ Match Against  │
    │              │ Opposite Side  │
    │              └───────┬────────┘
    │                      │
    │                      ▼
    │              ┌────────────────┐
    │         Yes  │ Match Found?   │  No
    │      ┌───────┤                ├──────┐
    │      │       └────────────────┘      │
    │      ▼                               ▼
    │ ┌────────────────┐          ┌────────────────┐
    │ │ Execute Trade  │          │ Order Complete?│
    │ │  - Create Trade│      ┌───┤                │
    │ │  - Update Order│      │No └────────────────┘
    │ │  - Transfer $  │      │Yes        │
    │ └───────┬────────┘      │           │
    │         │               │           ▼
    │         └───────────────┘   ┌────────────────┐
    │                             │ Keep in Book   │
    └─────────────────────────────┤ (Partial Fill) │
                                  └────────────────┘
```

### Matching Code (Pseudocode)

```typescript
function matchOrder(newOrder: Order, orderBook: OrderBook): Trade[] {
  const trades: Trade[] = [];

  // Determine opposite side
  const oppositeSide = newOrder.side === 'bid' ? orderBook.asks : orderBook.bids;

  // Market order: match until filled
  if (newOrder.executionType === 'market') {
    while (newOrder.remainingQuantity > 0 && oppositeSide.length > 0) {
      const bestLevel = oppositeSide[0];
      const trade = executeTrade(newOrder, bestLevel.orders[0], bestLevel.price);
      trades.push(trade);

      updateOrder(newOrder, trade.quantity);
      updateOrder(bestLevel.orders[0], trade.quantity);

      // Remove filled orders
      if (bestLevel.orders[0].remainingQuantity === 0) {
        bestLevel.orders.shift();
        if (bestLevel.orders.length === 0) {
          oppositeSide.shift();
        }
      }
    }
  }

  // Limit order: match at price or better
  else if (newOrder.executionType === 'limit') {
    while (newOrder.remainingQuantity > 0 && oppositeSide.length > 0) {
      const bestLevel = oppositeSide[0];

      // Check if price matches
      const canMatch = newOrder.side === 'bid'
        ? newOrder.price >= bestLevel.price  // Buyer willing to pay this much
        : newOrder.price <= bestLevel.price; // Seller willing to sell at this price

      if (!canMatch) break;

      const trade = executeTrade(newOrder, bestLevel.orders[0], bestLevel.price);
      trades.push(trade);

      updateOrder(newOrder, trade.quantity);
      updateOrder(bestLevel.orders[0], trade.quantity);

      if (bestLevel.orders[0].remainingQuantity === 0) {
        bestLevel.orders.shift();
        if (bestLevel.orders.length === 0) {
          oppositeSide.shift();
        }
      }
    }

    // If not fully filled, add to order book
    if (newOrder.remainingQuantity > 0) {
      addToOrderBook(newOrder, orderBook);
    }
  }

  return trades;
}

function executeTrade(takerOrder: Order, makerOrder: Order, price: number): Trade {
  const quantity = Math.min(takerOrder.remainingQuantity, makerOrder.remainingQuantity);
  const totalValue = price * quantity;

  // Calculate fees (0.5% = 0.005)
  const takerFee = totalValue * 0.005;
  const makerFee = totalValue * 0.003; // Lower fee for makers

  const trade: Trade = {
    id: generateUUID(),
    buyerOrderId: takerOrder.side === 'bid' ? takerOrder.id : makerOrder.id,
    sellerOrderId: takerOrder.side === 'ask' ? takerOrder.id : makerOrder.id,
    buyerId: takerOrder.side === 'bid' ? takerOrder.userId : makerOrder.userId,
    sellerId: takerOrder.side === 'ask' ? takerOrder.userId : makerOrder.userId,
    tokenId: takerOrder.tokenId,
    price,
    quantity,
    totalValue,
    buyerFee: takerOrder.side === 'bid' ? takerFee : makerFee,
    sellerFee: takerOrder.side === 'ask' ? takerFee : makerFee,
    platformFee: takerFee + makerFee,
    executedAt: new Date(),
  };

  return trade;
}
```

---

## Order Types Supported

### 1. Market Order
- Executes immediately at best available price
- No price specified
- May execute at multiple price levels
- **Use case**: Immediate execution, price is secondary

### 2. Limit Order
- Executes only at specified price or better
- Joins order book if not immediately filled
- **Use case**: Price certainty, willing to wait

### 3. Time-in-Force Options

#### GTC (Good Till Cancel)
- Remains in order book until filled or manually cancelled
- Most common for limit orders

#### IOC (Immediate or Cancel)
- Execute immediately, cancel unfilled portion
- **Use case**: Fill as much as possible now, don't wait

#### FOK (Fill or Kill)
- Execute entire order immediately or cancel entire order
- **Use case**: All-or-nothing execution

---

## Order Book Operations

### 1. Add Order
```sql
-- Lock user funds
BEGIN TRANSACTION;

-- For buy order: lock fiat
UPDATE user_balances
SET fiat_locked = fiat_locked + (price * quantity)
WHERE user_id = ?;

-- For sell order: lock tokens
UPDATE token_holders
SET balance_locked = balance_locked + quantity
WHERE user_id = ? AND token_id = ?;

-- Create order
INSERT INTO orders (id, user_id, token_id, side, price, quantity, ...)
VALUES (?);

COMMIT;
```

### 2. Cancel Order
```sql
BEGIN TRANSACTION;

-- Update order status
UPDATE orders
SET status = 'cancelled', cancelled_at = NOW()
WHERE id = ? AND status IN ('open', 'partially_filled');

-- Unlock funds
UPDATE user_balances
SET fiat_locked = fiat_locked - (price * remaining_quantity)
WHERE user_id = ?;

COMMIT;
```

### 3. Execute Trade
```sql
BEGIN TRANSACTION;

-- Create trade record
INSERT INTO trades (id, buyer_order_id, seller_order_id, ...)
VALUES (?);

-- Update buyer order
UPDATE orders
SET filled_quantity = filled_quantity + ?,
    remaining_quantity = remaining_quantity - ?,
    status = CASE WHEN remaining_quantity = 0 THEN 'filled' ELSE 'partially_filled' END
WHERE id = ?;

-- Update seller order
UPDATE orders
SET filled_quantity = filled_quantity + ?,
    remaining_quantity = remaining_quantity - ?,
    status = CASE WHEN remaining_quantity = 0 THEN 'filled' ELSE 'partially_filled' END
WHERE id = ?;

-- Transfer tokens from seller to buyer
UPDATE token_holders
SET balance = balance - ?
WHERE user_id = ? AND token_id = ?;

INSERT INTO token_holders (user_id, token_id, balance)
VALUES (?, ?, ?)
ON CONFLICT (user_id, token_id)
DO UPDATE SET balance = balance + ?;

-- Transfer fiat from buyer to seller
UPDATE user_balances
SET fiat_balance = fiat_balance - (price * quantity + buyer_fee),
    fiat_locked = fiat_locked - (price * quantity)
WHERE user_id = ?;

UPDATE user_balances
SET fiat_balance = fiat_balance + (price * quantity - seller_fee)
WHERE user_id = ?;

-- Create transaction records
INSERT INTO transactions (user_id, type, amount, ...)
VALUES (...);

COMMIT;
```

---

## Performance Optimizations

### 1. Redis Cache for Hot Data
```
Key: orderbook:{tokenId}:bids
Value: Sorted Set (score = price, member = orderIds)

Key: orderbook:{tokenId}:asks
Value: Sorted Set (score = price, member = orderIds)

Key: order:{orderId}
Value: Hash (order details)

TTL: 24 hours (refreshed on access)
```

### 2. In-Memory Order Book
- Load active orders into memory on startup
- Process all matching in-memory
- Asynchronously persist to database
- **Target**: < 1ms matching latency

### 3. Database Indexes
```sql
CREATE INDEX idx_orders_token_side_status ON orders(token_id, side, status);
CREATE INDEX idx_orders_token_price ON orders(token_id, price) WHERE status = 'open';
CREATE INDEX idx_orders_user_status ON orders(user_id, status);
CREATE INDEX idx_trades_token_time ON trades(token_id, executed_at DESC);
```

### 4. Connection Pooling
- Database connection pool: 50-100 connections
- Redis connection pool: 20-50 connections
- WebSocket connections: Handle 10,000+ concurrent

---

## Order Book Snapshots

### Purpose
- Historical analysis
- Market depth visualization
- Trading algorithm backtesting

### Snapshot Frequency
- **Level 1** (Best bid/ask): Every 1 second
- **Level 2** (Top 20 levels): Every 5 seconds
- **Level 3** (Full book): Every 1 minute

### Storage Strategy
```sql
-- Recent snapshots: PostgreSQL (1 week)
-- Historical snapshots: Cold storage (S3/GCS)
-- Queryable via time-series database (TimescaleDB)

CREATE TABLE order_book_snapshots (
  id UUID PRIMARY KEY,
  token_id UUID NOT NULL,
  best_bid_price DECIMAL(20, 8),
  best_ask_price DECIMAL(20, 8),
  spread DECIMAL(20, 8),
  total_bid_volume BIGINT,
  total_ask_volume BIGINT,
  bids JSONB, -- Top 20 levels
  asks JSONB, -- Top 20 levels
  snapshot_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_snapshots_token_time ON order_book_snapshots(token_id, snapshot_at DESC);
```

---

## WebSocket Real-Time Updates

### Order Book Updates
```json
{
  "type": "orderbook_update",
  "tokenId": "uuid",
  "timestamp": "2024-01-01T12:00:00Z",
  "bids": [
    {"price": 2.44, "quantity": 1000, "orders": 5},
    {"price": 2.43, "quantity": 800, "orders": 3}
  ],
  "asks": [
    {"price": 2.46, "quantity": 900, "orders": 4},
    {"price": 2.47, "quantity": 1200, "orders": 6}
  ],
  "spread": 0.02,
  "lastPrice": 2.45
}
```

### Trade Execution Updates
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

### User Order Updates
```json
{
  "type": "order_update",
  "orderId": "uuid",
  "userId": "uuid",
  "status": "partially_filled",
  "filledQuantity": 50,
  "remainingQuantity": 50,
  "updatedAt": "2024-01-01T12:00:00Z"
}
```

---

## Blockchain Settlement Integration

### Settlement Flow

```
Centralized Order Book         Sui Blockchain DEX
─────────────────────          ──────────────────

1. Match orders ─────────────► 2. Create settlement TX
   in order book                   (batch trades)
                                   │
3. Mark as pending ◄────────────── │
   settlement                       │
                                    ▼
4. Wait for         ◄─────────── 5. Submit to blockchain
   confirmation                     (AMM swap)
                                    │
6. Update final    ◄────────────── │
   status                           ▼
                               7. TX confirmed on-chain
```

### Batching Strategy
- **Batch trades every 10 seconds** or when reaching 100 trades
- Reduces blockchain fees
- Improves settlement efficiency
- Users still see instant order execution

### Settlement Retry Logic
```typescript
async function settleTradeOnChain(trade: Trade, retries = 3): Promise<string> {
  try {
    const tx = await suiClient.executeTransaction({
      sender: platformWallet,
      kind: {
        Single: {
          Call: {
            package: AMM_PACKAGE_ID,
            module: 'amm',
            function: 'swap',
            arguments: [
              trade.tokenId,
              trade.quantity,
              trade.price
            ]
          }
        }
      }
    });

    return tx.digest;
  } catch (error) {
    if (retries > 0) {
      await sleep(1000);
      return settleTradeOnChain(trade, retries - 1);
    }
    throw error;
  }
}
```

---

## Security & Risk Management

### 1. Circuit Breakers
- Halt trading if price moves > 20% in 1 minute
- Maximum order size limits per user tier
- Daily trading volume limits

### 2. Anti-Manipulation
- Detect and prevent wash trading
- Monitor for spoofing (fake orders)
- Rate limiting on order placement

### 3. Fund Safety
- Segregated user funds
- Multi-signature wallet for platform funds
- Regular audits

---

## Monitoring & Metrics

### Key Metrics to Track
- **Order book depth** (bid/ask volume)
- **Spread** (best bid - best ask)
- **Matching latency** (order placement to execution)
- **Settlement time** (execution to blockchain confirmation)
- **Order fill rate** (% of orders fully filled)
- **Trade volume** (daily, weekly, monthly)
- **Active orders** (current open orders)
- **User activity** (orders per user, trades per day)

### Alerts
- Matching engine latency > 10ms
- Settlement failures > 1%
- Order book imbalance > 80/20
- Spread > 5%
- System errors

---

## Technology Stack Recommendations

### Core Services
- **Language**: Go or Rust (for matching engine performance)
- **Database**: PostgreSQL (primary), Redis (cache)
- **Message Queue**: RabbitMQ or Kafka (for trade events)
- **WebSocket**: Socket.io or native WebSocket
- **Time-series DB**: TimescaleDB (for historical data)

### Monitoring
- **Metrics**: Prometheus + Grafana
- **Logging**: ELK Stack (Elasticsearch, Logstash, Kibana)
- **APM**: Datadog or New Relic
- **Alerts**: PagerDuty

---

## Deployment Architecture

```
┌──────────────────────────────────────────────────────────┐
│                    Load Balancer (NGINX)                  │
└─────────────────┬────────────────────────────────────────┘
                  │
         ┌────────┴────────┐
         ▼                 ▼
┌─────────────────┐ ┌─────────────────┐
│   API Server    │ │  WebSocket      │
│   (3 replicas)  │ │  Server         │
│                 │ │  (2 replicas)   │
└────────┬────────┘ └────────┬────────┘
         │                   │
         └────────┬──────────┘
                  │
         ┌────────┴────────┐
         ▼                 ▼
┌─────────────────┐ ┌─────────────────┐
│ Matching Engine │ │  Redis Cluster  │
│  (Active/Standby│ │  (Sentinel)     │
│   for HA)       │ │                 │
└────────┬────────┘ └────────┬────────┘
         │                   │
         └────────┬──────────┘
                  │
         ┌────────┴────────┐
         ▼                 ▼
┌─────────────────┐ ┌─────────────────┐
│   PostgreSQL    │ │ Message Queue   │
│  (Primary +     │ │  (RabbitMQ)     │
│   Replica)      │ │                 │
└─────────────────┘ └─────────────────┘
```

---

## Summary

The Order Book system is the heart of the PeopleCoin trading platform. It provides:

✅ **Fast execution** - Sub-millisecond order matching
✅ **Fair pricing** - Transparent price discovery
✅ **Multiple order types** - Flexible trading strategies
✅ **Real-time updates** - WebSocket for live data
✅ **Blockchain settlement** - Secure on-chain finality
✅ **High availability** - Redundant architecture
✅ **Scalability** - Handles thousands of orders per second

This centralized order book + DEX settlement hybrid approach gives us the best of both worlds: speed and transparency of centralized systems with the security and finality of blockchain.
