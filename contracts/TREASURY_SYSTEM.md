# Creator Treasury System

## Overview

The Creator Treasury System is a comprehensive token management solution that:
- Prevents creators from bypassing platform controls
- Ensures liquidity for the market
- Enforces buyback obligations automatically
- Provides transparency for all stakeholders

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   CREATOR'S WALLET                       │
│                                                          │
│  ❌ FROZEN for receiving tokens                         │
│  ✅ Can receive SUI (from sales)                        │
│  ✅ Can receive other coins                             │
│                                                          │
│  Creator MUST use Treasury to interact with tokens      │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                   CREATOR TREASURY                       │
│                   (Shared Object)                        │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Holdings: 400M tokens (40% of 1B total)               │
│                                                          │
│  ┌──────────────────────────────────────────┐           │
│  │  CREATOR PORTION (160M - 40%)            │           │
│  │  ├─ Vests 2% per month                   │           │
│  │  ├─ Stays in treasury                    │           │
│  │  └─ Available for creator to sell        │           │
│  └──────────────────────────────────────────┘           │
│                                                          │
│  ┌──────────────────────────────────────────┐           │
│  │  PLATFORM PORTION (240M - 60%)           │           │
│  │  ├─ Distributed 3% per month             │           │
│  │  ├─ Sent to market                       │           │
│  │  └─ Ensures liquidity                    │           │
│  └──────────────────────────────────────────┘           │
│                                                          │
│  Operations:                                             │
│  ├─ process_monthly_unlock() → vests + distributes     │
│  ├─ sell_tokens() → creator gets SUI                   │
│  ├─ execute_buyback() → burns tokens                   │
│  └─ deposit_collateral() → skin in the game           │
│                                                          │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                   REGULAR USERS                          │
│                                                          │
│  ✅ Can buy tokens on any DEX                           │
│  ✅ Can sell tokens anywhere                            │
│  ✅ Can transfer to anyone                              │
│  ✅ No restrictions                                     │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

## Monthly Unlock Timeline

### Configuration Parameters (Example)
```
Total Supply: 1,000,000,000 (1B tokens)
Creator Allocation: 400,000,000 (40%)

Creator Portion: 40% of 400M = 160M
  - Monthly Unlock: 2% of 400M = 8M
  - Unlocks to: Creator (stays in treasury)
  - Duration: 20 months to reach cap

Platform Portion: 60% of 400M = 240M
  - Monthly Distribution: 3% of 400M = 12M
  - Distributed to: Market
  - Duration: 20 months to reach cap
```

### Monthly Flow

| Month | Creator Vested | Platform Distributed | Treasury Balance | Notes |
|-------|---------------|---------------------|------------------|-------|
| 0 | 0 | 0 | 400M | Initial state |
| 1 | 8M | 12M → Market | 388M | First unlock |
| 2 | 16M | 24M → Market | 376M | Cumulative |
| 3 | 24M | 36M → Market | 364M | |
| ... | ... | ... | ... | |
| 10 | 80M | 120M → Market | 280M | Halfway |
| ... | ... | ... | ... | |
| 20 | 160M | 240M → Market | 160M | Cap reached |

**At Month 20:**
- Creator can sell up to 160M tokens (or hold)
- Platform already distributed 240M to market
- Even if creator never sells, market has 240M + initial LP

## Smart Contract Wizard Configuration

When creating a token through the wizard, you'll provide:

### 1. Basic Token Info
```typescript
{
  name: "Creator Token",
  symbol: "CREATOR",
  decimals: 9,
  description: "My creator token",
  icon_url: "https://...",
  total_supply: 1_000_000_000
}
```

### 2. Allocation Split
```typescript
{
  creator_allocation: 400_000_000,      // 40% to creator
  platform_reserve: 200_000_000,        // 20% to platform
  liquidity_pool_allocation: 400_000_000 // 40% to initial LP
}
```

### 3. Treasury Configuration (Configurable Percentages)
```typescript
{
  // How to split creator's 400M allocation
  creator_portion_bps: 4000,            // 40% → vests to creator (160M)
  platform_portion_bps: 6000,           // 60% → distributed to market (240M)

  // Unlock rates (as % of total allocation)
  creator_monthly_unlock_bps: 200,      // 2% per month
  platform_monthly_unlock_bps: 300,     // 3% per month
}
```

**Common Configurations:**

| Profile | Creator % | Platform % | Creator Monthly | Platform Monthly | Use Case |
|---------|-----------|------------|-----------------|------------------|----------|
| **Balanced** | 50% | 50% | 2% | 2% | Equal priority |
| **Creator-Favored** | 60% | 40% | 3% | 2% | Strong creator incentive |
| **Liquidity-First** | 40% | 60% | 2% | 3% | Ensure market supply |
| **Conservative** | 30% | 70% | 1% | 3% | Maximum liquidity insurance |
| **Aggressive** | 70% | 30% | 3% | 2% | Creator-driven project |

### 4. Buyback Configuration
```typescript
{
  buyback_duration_years: 5,
  buyback_start_date: 1735689600000,        // Unix timestamp
  buyback_interval_months: 3,               // Quarterly
  buyback_amount_per_interval: 10_000_000   // 10M per quarter
}
```

## Key Functions

### For Creators

#### 1. Sell Tokens
```move
// Get tokens from treasury
public entry fun sell_tokens_entry<T>(
    treasury: &mut CreatorTreasury<T>,
    amount: u64,
    ctx: &mut TxContext
)

// Then swap on DEX for SUI
// SUI goes to creator's wallet (not frozen for SUI)
```

**Restrictions:**
- ✅ Can only sell vested amount
- ❌ Cannot sell more than vested
- ✅ No daily/monthly limits (free market)

#### 2. Deposit Collateral
```move
public entry fun deposit_collateral<T>(
    treasury: &mut CreatorTreasury<T>,
    payment: Coin<SUI>,
    clock: &Clock,
    ctx: &mut TxContext
)
```

**Purpose:** Skin in the game for buyback enforcement

### For Anyone (Permissionless)

#### 1. Process Monthly Unlock
```move
public entry fun process_monthly_unlock<T>(
    treasury: &mut CreatorTreasury<T>,
    clock: &Clock,
    ctx: &mut TxContext
)
```

**What it does:**
- Vests tokens to creator (in treasury)
- Distributes tokens to platform (leaves treasury)
- Can be called by anyone (automated via keeper bots)

#### 2. Execute Buyback
```move
public fun execute_buyback<T>(
    treasury: &mut CreatorTreasury<T>,
    treasury_cap: &mut TreasuryCap<T>,
    milestone_idx: u64,
    clock: &Clock,
    ctx: &mut TxContext
): (bool, u64)
```

**Returns:**
- `(true, 0)` if enough tokens in treasury → burned directly
- `(false, deficit)` if not enough → needs market purchase

## Security Features

### 1. Wallet Freeze
```move
// Creator's wallet is frozen using DenyList
deny_list::v2_add(
    deny_list,
    &mut deny_cap,
    creator_address
);
```

**Effect:**
- Creator CANNOT receive tokens directly
- Any tokens sent to creator wallet become frozen
- Forces all operations through Treasury

### 2. Authorization Checks
```move
assert!(tx_context::sender(ctx) == treasury.creator, ENotAuthorized);
```

**Only creator can:**
- Sell tokens from treasury
- Deposit collateral

**Anyone can:**
- Process monthly unlock (permissionless)
- Execute buyback (permissionless enforcement)

### 3. Balance Validation
```move
assert!(amount <= treasury.creator_vested_amount, EInsufficientVested);
```

**Prevents:**
- Selling non-vested tokens
- Over-selling beyond allocation

## Integration Example

### 1. Token Creation
```move
// Smart Contract Wizard calls this
creator_token::create_token_with_treasury<MY_TOKEN>(
    witness,
    decimals: 9,
    symbol: b"CREATOR",
    name: b"Creator Token",
    description: b"My token",
    icon_url: b"https://...",
    total_supply: 1_000_000_000,
    creator_allocation: 400_000_000,
    platform_reserve: 200_000_000,
    liquidity_pool_allocation: 400_000_000,
    platform_address,
    creator_portion_bps: 4000,          // ← Wizard configurable
    platform_portion_bps: 6000,         // ← Wizard configurable
    creator_monthly_unlock_bps: 200,    // ← Wizard configurable
    platform_monthly_unlock_bps: 300,   // ← Wizard configurable
    buyback_duration_years: 5,
    buyback_start_date: 1735689600000,
    buyback_interval_months: 3,
    buyback_amount_per_interval: 10_000_000,
    initial_price_usd: 100,
    deny_list,
    clock,
    ctx
);
```

### 2. Monthly Automation (Keeper Bot)
```typescript
// Run every day
async function checkAndProcessUnlocks() {
  const treasuries = await getAllTreasuries();

  for (const treasury of treasuries) {
    const nextUnlockTime = await getNextUnlockTime(treasury);
    const now = Date.now();

    if (now >= nextUnlockTime) {
      await processMonthlyUnlock(treasury);
      console.log(`Processed unlock for ${treasury.id}`);
    }
  }
}
```

### 3. Buyback Automation (Keeper Bot)
```typescript
async function checkAndExecuteBuybacks() {
  const treasuries = await getAllTreasuries();

  for (const treasury of treasuries) {
    const milestones = await getMilestones(treasury);

    for (const milestone of milestones) {
      if (!milestone.completed && Date.now() >= milestone.deadline) {
        const result = await executeBuyback(treasury, milestone.index);

        if (!result.success) {
          // Need to buy from market
          await buyFromMarketAndComplete(
            treasury,
            milestone.index,
            result.deficit
          );
        }
      }
    }
  }
}
```

### 4. Creator Selling Workflow
```typescript
// 1. Check available balance
const available = await getAvailableToSell(treasury);

// 2. Get tokens from treasury
const tx = await sellTokens(treasury, amountToSell);
const tokens = tx.objectChanges.find(obj => obj.type === 'Coin<CREATOR>');

// 3. Swap on DEX (e.g., Cetus)
const sui = await swapOnDex(tokens, minSuiOut);

// 4. SUI automatically sent to creator's wallet
// Creator's wallet CAN receive SUI (only token is frozen)
```

## View Functions

```move
// Check treasury status
get_treasury_status(treasury): (
    creator: address,
    token_balance: u64,
    creator_vested_amount: u64,
    platform_distributed_amount: u64,
    total_bought_back: u64,
    collateral_amount: u64
)

// Check allocation details
get_allocation_details(treasury): (
    total_allocation: u64,
    creator_portion_cap: u64,
    platform_portion_cap: u64,
    creator_monthly_unlock_bps: u16,
    platform_monthly_unlock_bps: u16
)

// Check available to sell
get_available_to_sell(treasury): u64

// Check if unlock is ready
is_unlock_ready(treasury, current_time): bool

// Get next unlock time
get_next_unlock_time(treasury): u64

// Get milestone status
get_milestone(treasury, milestone_idx): (
    deadline_timestamp: u64,
    required_burn_amount: u64,
    completed: bool,
    actual_burn_amount: u64
)
```

## Testing

Run the comprehensive test suite:
```bash
sui move test
```

Tests cover:
- ✅ Treasury creation and initialization
- ✅ Monthly unlock (dual unlock mechanism)
- ✅ Creator selling (unrestricted)
- ✅ Buyback execution (direct burn)
- ✅ Buyback execution (market purchase)
- ✅ Collateral management
- ✅ Authorization checks
- ✅ Edge cases and error conditions

## Benefits Summary

| Stakeholder | Benefits |
|-------------|----------|
| **Creator** | Can sell vested tokens freely, transparent allocation, forced buyback ensures sustainability |
| **Investors** | Know creator's holdings (treasury balance), see selling activity, guaranteed liquidity from platform distribution |
| **Platform** | Enforce rules without manual intervention, prevent creator manipulation, ensure market health |
| **Market** | Transparent token distribution, gradual supply release, liquidity insurance from platform portion |

## Comparison to Traditional Models

| Feature | Traditional Vesting | Treasury System |
|---------|-------------------|----------------|
| Creator Control | Full control after vesting | Controlled via treasury |
| Alt Account Risk | High (can circumvent) | Low (alt accounts are regular users) |
| Liquidity | Depends on creator selling | Platform ensures via distribution |
| Transparency | Wallet balance (can hide) | Treasury balance (public) |
| Buyback | Manual enforcement | Automatic execution |
| Selling Limits | Often rate-limited | Unrestricted (free market) |
| Collateral | Not required | Enforced via treasury |

## Future Enhancements

Potential additions:
1. **Dynamic unlock rates** - Adjust based on token performance
2. **Multi-sig treasury** - Require multiple approvals for large sales
3. **Governance integration** - Token holders vote on unlock parameters
4. **Insurance pool integration** - Cover buyback deficits
5. **Cross-chain bridge** - Treasury tokens on multiple chains
