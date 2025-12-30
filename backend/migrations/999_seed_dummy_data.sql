-- Seed Dummy Data for Testing
-- This migration adds realistic test data to the database
-- Run this ONLY in development/testing environments

-- ==========================================
-- 1. Create Test Users
-- ==========================================

INSERT INTO users (id, wallet_address, username, email, bio, avatar_url, role, status, email_verified, created_at) VALUES
(
  '550e8400-e29b-41d4-a716-446655440000',
  '0x1234567890123456789012345678901234567890123456789012345678901234',
  'alice_trader',
  'alice@example.com',
  'Crypto enthusiast and early adopter',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Alice',
  'user',
  'active',
  true,
  NOW() - INTERVAL '30 days'
),
(
  '550e8400-e29b-41d4-a716-446655440001',
  '0xabcdef1234567890123456789012345678901234567890123456789012345678',
  'bob_investor',
  'bob@example.com',
  'Long-term holder, DeFi maximalist',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Bob',
  'user',
  'active',
  true,
  NOW() - INTERVAL '25 days'
),
(
  '550e8400-e29b-41d4-a716-446655440002',
  '0x9876543210987654321098765432109876543210987654321098765432109876',
  'charlie_creator',
  'charlie@example.com',
  'Token creator and community builder',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Charlie',
  'creator',
  'active',
  true,
  NOW() - INTERVAL '20 days'
),
(
  '550e8400-e29b-41d4-a716-446655440003',
  '0xdeadbeef123456789012345678901234567890123456789012345678901234',
  'diana_whale',
  'diana@example.com',
  'Whale trader with big positions',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Diana',
  'user',
  'active',
  true,
  NOW() - INTERVAL '15 days'
),
(
  '550e8400-e29b-41d4-a716-446655440004',
  '0xcafebabe567890123456789012345678901234567890123456789012345678',
  'eve_newbie',
  'eve@example.com',
  'New to crypto, learning the ropes',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Eve',
  'user',
  'active',
  false,
  NOW() - INTERVAL '5 days'
);

-- ==========================================
-- 2. Create Test Tokens
-- ==========================================

INSERT INTO tokens (id, creator_id, coin_type, symbol, name, description, image_url, deployed_at, pool_address, status, created_at) VALUES
(
  '650e8400-e29b-41d4-a716-446655440000',
  '550e8400-e29b-41d4-a716-446655440002',
  '0x2::sui::SUI',
  'SUI',
  'Sui',
  'Native token of the Sui blockchain',
  'https://s2.coinmarketcap.com/static/img/coins/64x64/20947.png',
  NOW() - INTERVAL '200 days',
  '0xpool1234567890',
  'active',
  NOW() - INTERVAL '200 days'
),
(
  '650e8400-e29b-41d4-a716-446655440001',
  '550e8400-e29b-41d4-a716-446655440002',
  '0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf::coin::COIN',
  'USDC',
  'USD Coin',
  'Stablecoin pegged to US Dollar',
  'https://s2.coinmarketcap.com/static/img/coins/64x64/3408.png',
  NOW() - INTERVAL '180 days',
  '0xpool2345678901',
  'active',
  NOW() - INTERVAL '180 days'
),
(
  '650e8400-e29b-41d4-a716-446655440002',
  '550e8400-e29b-41d4-a716-446655440002',
  '0xpeople::coin::PEOPLE',
  'PEOPLE',
  'PeopleCoin',
  'Community-driven meme coin with real utility',
  'https://api.dicebear.com/7.x/identicon/svg?seed=PEOPLE',
  NOW() - INTERVAL '30 days',
  '0xpool3456789012',
  'active',
  NOW() - INTERVAL '30 days'
),
(
  '650e8400-e29b-41d4-a716-446655440003',
  '550e8400-e29b-41d4-a716-446655440001',
  '0xmoon::coin::MOON',
  'MOON',
  'MoonCoin',
  'To the moon! 🚀',
  'https://api.dicebear.com/7.x/identicon/svg?seed=MOON',
  NOW() - INTERVAL '25 days',
  '0xpool4567890123',
  'active',
  NOW() - INTERVAL '25 days'
),
(
  '650e8400-e29b-41d4-a716-446655440004',
  '550e8400-e29b-41d4-a716-446655440002',
  '0xdoge::coin::DOGE',
  'DOGE',
  'DogeOnSui',
  'Much wow, very decentralized',
  'https://api.dicebear.com/7.x/identicon/svg?seed=DOGE',
  NOW() - INTERVAL '20 days',
  '0xpool5678901234',
  'active',
  NOW() - INTERVAL '20 days'
),
(
  '650e8400-e29b-41d4-a716-446655440005',
  '550e8400-e29b-41d4-a716-446655440002',
  '0xpepe::coin::PEPE',
  'PEPE',
  'PepeOnSui',
  'The rare pepe collection',
  'https://api.dicebear.com/7.x/identicon/svg?seed=PEPE',
  NOW() - INTERVAL '15 days',
  '0xpool6789012345',
  'active',
  NOW() - INTERVAL '15 days'
);

-- ==========================================
-- 3. Create Test Orders (Order Book)
-- ==========================================

-- BID orders for PEOPLE token
INSERT INTO orders (id, user_id, token_id, order_type, side, price, quantity, filled_quantity, remaining_quantity, execution_type, time_in_force, status, fee_rate, created_at) VALUES
('750e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440000', '650e8400-e29b-41d4-a716-446655440002', 'buy', 'bid', 2.45, 1000, 0, 1000, 'limit', 'GTC', 'open', 0.005, NOW() - INTERVAL '2 hours'),
('750e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', '650e8400-e29b-41d4-a716-446655440002', 'buy', 'bid', 2.44, 1500, 0, 1500, 'limit', 'GTC', 'open', 0.005, NOW() - INTERVAL '3 hours'),
('750e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440003', '650e8400-e29b-41d4-a716-446655440002', 'buy', 'bid', 2.43, 2000, 0, 2000, 'limit', 'GTC', 'open', 0.005, NOW() - INTERVAL '4 hours'),
('750e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440000', '650e8400-e29b-41d4-a716-446655440002', 'buy', 'bid', 2.42, 3000, 0, 3000, 'limit', 'GTC', 'open', 0.005, NOW() - INTERVAL '5 hours'),
('750e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440001', '650e8400-e29b-41d4-a716-446655440002', 'buy', 'bid', 2.41, 2500, 0, 2500, 'limit', 'GTC', 'open', 0.005, NOW() - INTERVAL '6 hours'),

-- ASK orders for PEOPLE token
('750e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440002', '650e8400-e29b-41d4-a716-446655440002', 'sell', 'ask', 2.48, 1200, 0, 1200, 'limit', 'GTC', 'open', 0.003, NOW() - INTERVAL '1 hour'),
('750e8400-e29b-41d4-a716-446655440006', '550e8400-e29b-41d4-a716-446655440003', '650e8400-e29b-41d4-a716-446655440002', 'sell', 'ask', 2.49, 1800, 0, 1800, 'limit', 'GTC', 'open', 0.003, NOW() - INTERVAL '2 hours'),
('750e8400-e29b-41d4-a716-446655440007', '550e8400-e29b-41d4-a716-446655440002', '650e8400-e29b-41d4-a716-446655440002', 'sell', 'ask', 2.50, 2200, 0, 2200, 'limit', 'GTC', 'open', 0.003, NOW() - INTERVAL '3 hours'),
('750e8400-e29b-41d4-a716-446655440008', '550e8400-e29b-41d4-a716-446655440003', '650e8400-e29b-41d4-a716-446655440002', 'sell', 'ask', 2.51, 1600, 0, 1600, 'limit', 'GTC', 'open', 0.003, NOW() - INTERVAL '4 hours'),
('750e8400-e29b-41d4-a716-446655440009', '550e8400-e29b-41d4-a716-446655440002', '650e8400-e29b-41d4-a716-446655440002', 'sell', 'ask', 2.52, 1400, 0, 1400, 'limit', 'GTC', 'open', 0.003, NOW() - INTERVAL '5 hours');

-- ==========================================
-- 4. Create Test Trades
-- ==========================================

INSERT INTO trades (id, buyer_order_id, seller_order_id, token_id, price, quantity, total_value, buyer_fee, seller_fee, platform_fee, settlement_status, blockchain_tx_hash, executed_at) VALUES
(
  '850e8400-e29b-41d4-a716-446655440000',
  '750e8400-e29b-41d4-a716-446655440000',
  '750e8400-e29b-41d4-a716-446655440005',
  '650e8400-e29b-41d4-a716-446655440002',
  2.46,
  500,
  1230.00,
  6.15,
  3.69,
  9.84,
  'settled',
  '0xtx1234567890abcdef',
  NOW() - INTERVAL '1 hour'
),
(
  '850e8400-e29b-41d4-a716-446655440001',
  '750e8400-e29b-41d4-a716-446655440001',
  '750e8400-e29b-41d4-a716-446655440006',
  '650e8400-e29b-41d4-a716-446655440002',
  2.47,
  800,
  1976.00,
  9.88,
  5.93,
  15.81,
  'settled',
  '0xtx2345678901bcdef0',
  NOW() - INTERVAL '2 hours'
),
(
  '850e8400-e29b-41d4-a716-446655440002',
  '750e8400-e29b-41d4-a716-446655440002',
  '750e8400-e29b-41d4-a716-446655440007',
  '650e8400-e29b-41d4-a716-446655440002',
  2.48,
  1000,
  2480.00,
  12.40,
  7.44,
  19.84,
  'settled',
  '0xtx3456789012cdef01',
  NOW() - INTERVAL '3 hours'
),
(
  '850e8400-e29b-41d4-a716-446655440003',
  '750e8400-e29b-41d4-a716-446655440003',
  '750e8400-e29b-41d4-a716-446655440008',
  '650e8400-e29b-41d4-a716-446655440002',
  2.45,
  1200,
  2940.00,
  14.70,
  8.82,
  23.52,
  'settling',
  '0xtx4567890123def012',
  NOW() - INTERVAL '30 minutes'
),
(
  '850e8400-e29b-41d4-a716-446655440004',
  '750e8400-e29b-41d4-a716-446655440004',
  '750e8400-e29b-41d4-a716-446655440009',
  '650e8400-e29b-41d4-a716-446655440002',
  2.46,
  600,
  1476.00,
  7.38,
  4.43,
  11.81,
  'pending',
  NULL,
  NOW() - INTERVAL '10 minutes'
);

-- ==========================================
-- 5. Create User Follows
-- ==========================================

INSERT INTO user_follows (id, user_id, following_id, followed_at) VALUES
('950e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440002', NOW() - INTERVAL '10 days'),
('950e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440002', NOW() - INTERVAL '8 days'),
('950e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440002', NOW() - INTERVAL '3 days'),
('950e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440003', NOW() - INTERVAL '5 days'),
('950e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440003', NOW() - INTERVAL '7 days');

-- ==========================================
-- 6. Create Token Follows
-- ==========================================

INSERT INTO token_follows (id, user_id, token_id, followed_at) VALUES
('a50e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440000', '650e8400-e29b-41d4-a716-446655440002', NOW() - INTERVAL '15 days'),
('a50e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', '650e8400-e29b-41d4-a716-446655440002', NOW() - INTERVAL '12 days'),
('a50e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440000', '650e8400-e29b-41d4-a716-446655440003', NOW() - INTERVAL '10 days'),
('a50e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440001', '650e8400-e29b-41d4-a716-446655440004', NOW() - INTERVAL '8 days'),
('a50e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440003', '650e8400-e29b-41d4-a716-446655440002', NOW() - INTERVAL '6 days'),
('a50e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440004', '650e8400-e29b-41d4-a716-446655440005', NOW() - INTERVAL '2 days');

-- ==========================================
-- 7. Create News/Trending Topics
-- ==========================================

INSERT INTO trending_topics (id, title, description, url, image_url, category, sentiment, engagement_score, created_at) VALUES
(
  'b50e8400-e29b-41d4-a716-446655440000',
  'Harvard Law adds Bitcoin to investment portfolio',
  'Major institutional adoption milestone',
  'https://example.com/harvard-bitcoin',
  'https://via.placeholder.com/400x200',
  'crypto',
  'bullish',
  9850,
  NOW() - INTERVAL '2 hours'
),
(
  'b50e8400-e29b-41d4-a716-446655440001',
  'Sui Network TVL hits new all-time high',
  'DeFi ecosystem continues to grow',
  'https://example.com/sui-tvl',
  'https://via.placeholder.com/400x200',
  'defi',
  'bullish',
  8740,
  NOW() - INTERVAL '5 hours'
),
(
  'b50e8400-e29b-41d4-a716-446655440002',
  'SEC delays ETF decision again',
  'Regulatory uncertainty continues',
  'https://example.com/sec-etf',
  'https://via.placeholder.com/400x200',
  'regulation',
  'bearish',
  7620,
  NOW() - INTERVAL '8 hours'
),
(
  'b50e8400-e29b-41d4-a716-446655440003',
  'PeopleCoin community reaches 10k holders',
  'Viral growth continues',
  'https://example.com/people-10k',
  'https://via.placeholder.com/400x200',
  'meme',
  'bullish',
  6500,
  NOW() - INTERVAL '12 hours'
),
(
  'b50e8400-e29b-41d4-a716-446655440004',
  'New Layer 2 solution announced for Sui',
  'Scalability improvements coming',
  'https://example.com/sui-l2',
  'https://via.placeholder.com/400x200',
  'technology',
  'bullish',
  5400,
  NOW() - INTERVAL '1 day'
);

-- ==========================================
-- Summary
-- ==========================================
-- Created:
-- - 5 test users (Alice, Bob, Charlie, Diana, Eve)
-- - 6 tokens (SUI, USDC, PEOPLE, MOON, DOGE, PEPE)
-- - 10 open orders (5 bids, 5 asks for PEOPLE token)
-- - 5 completed trades
-- - 5 user follows
-- - 6 token follows
-- - 5 trending topics

SELECT 'Dummy data seeded successfully!' AS status;
