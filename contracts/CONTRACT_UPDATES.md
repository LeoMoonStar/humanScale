# Contract Updates Summary

## Overview
This document summarizes the updates made to integrate buyback parameters, linear vesting, and trading block periods into the PeopleCoin smart contracts.

---

## 1. Creator Token Updates (`creator_token.move`)

### New Parameters in `create_token`

The `create_token` function now accepts the following new parameters:

```move
public entry fun create_token<T: drop>(
    // ... existing parameters ...
    buyback_start_date: u64,                    // NEW: Timestamp when buyback starts
    buyback_interval_months: u8,                // NEW: Months between each buyback
    buyback_amount_per_interval: u64,           // NEW: Tokens to buyback each interval
    trading_block_duration_days: u8,            // NEW: Days creator cannot buy tokens
    vesting_enabled: bool,                      // NEW: Enable linear vesting for creator
    vesting_monthly_release_bps: u16,           // NEW: Basis points released per month (e.g., 200 = 2%)
    vesting_total_release_bps: u16,             // NEW: Max total release in basis points (e.g., 4000 = 40%)
    // ... rest of parameters ...
)
```

### New Fields in `TokenRegistry`

```move
struct TokenRegistry has key {
    // ... existing fields ...

    // Buyback configuration (already existed, now populated)
    buyback_start_date: u64,
    buyback_end_date: u64,
    buyback_interval_months: u8,
    buyback_amount: u64,

    // Trading restrictions (NEW)
    trading_block_end_date: u64,
    trading_block_duration_days: u8,

    // Vesting configuration (NEW)
    vesting_enabled: bool,
    vesting_monthly_release_bps: u16,
    vesting_total_release_bps: u16,
}
```

### New Helper Functions

```move
/// Check if creator can trade (buy) tokens
public fun can_creator_trade(registry: &TokenRegistry, current_timestamp: u64): bool

/// Get buyback configuration
public fun get_buyback_config(registry: &TokenRegistry): (u64, u64, u8, u64)

/// Get vesting configuration
public fun get_vesting_config(registry: &TokenRegistry): (bool, u16, u16)

/// Get trading restrictions
public fun get_trading_restrictions(registry: &TokenRegistry): (u64, u8)
```

---

## 2. New Module: Vesting Vault (`vesting_vault.move`)

### Purpose
Implements linear unlock for creator token allocation. Releases a fixed percentage of tokens monthly until a cap is reached.

### Key Features

- **Monthly Linear Release**: E.g., 2% per month
- **Total Release Cap**: E.g., maximum 40% of allocation
- **Remaining Tokens Locked**: Tokens beyond the cap stay locked forever

### Example

```
Creator gets 10,000 tokens allocated
Vesting: 2% monthly, max 40%
- Month 1: 200 tokens unlocked
- Month 2: 200 tokens unlocked
- ...
- Month 20: 200 tokens unlocked (4000 total = 40%)
- Remaining 6000 tokens stay locked forever
```

### Main Functions

```move
/// Create vesting vault for creator tokens
public entry fun create_vesting_vault<T>(
    token_registry_id: ID,
    creator_tokens: Coin<T>,
    monthly_release_bps: u16,      // E.g., 200 = 2%
    total_release_cap_bps: u16,    // E.g., 4000 = 40%
    clock: &Clock,
    ctx: &mut TxContext
)

/// Claim single month's vested tokens
public entry fun claim_vested_tokens<T>(
    vault: &mut VestingVault<T>,
    clock: &Clock,
    ctx: &mut TxContext
)

/// Batch claim all available vested tokens
public entry fun claim_all_available<T>(
    vault: &mut VestingVault<T>,
    clock: &Clock,
    ctx: &mut TxContext
)
```

### View Functions

```move
/// Get vault status
public fun get_vault_status<T>(vault: &VestingVault<T>): (address, u64, u64, u64, u64, u64, bool)

/// Get next vesting time
public fun get_next_vesting_time<T>(vault: &VestingVault<T>): u64

/// Get total claimable now
public fun get_claimable_amount<T>(vault: &VestingVault<T>, current_timestamp: u64): u64
```

---

## 3. Buyback Vault Updates (`buyback_vault.move`)

### New Function: Create Vault from Registry

Instead of manually specifying buyback parameters, you can now create a vault directly from the `TokenRegistry` configuration:

```move
/// Create buyback vault using TokenRegistry configuration
public entry fun create_vault_from_registry<T>(
    token_registry: &crate::creator_token::TokenRegistry,
    collateral: Coin<sui::sui::SUI>,
    clock: &Clock,
    ctx: &mut TxContext
)
```

This function automatically:
- Reads `buyback_start_date`, `buyback_end_date`, `buyback_interval_months`, and `buyback_amount` from the registry
- Calculates the number of milestones
- Creates the buyback schedule

### Updated Function Signatures

The `check_and_enforce_default` function now requires `token_registry`:

```move
public entry fun check_and_enforce_default<T>(
    vault: &mut BuybackVault<T>,
    amm_pool: &mut crate::amm::LiquidityPool<T>,
    insurance_pool: &mut crate::insurance::InsurancePool,
    treasury_cap: &mut coin::TreasuryCap<T>,
    token_registry: &crate::creator_token::TokenRegistry,  // NEW
    clock: &Clock,
    ctx: &mut TxContext
)
```

---

## 4. AMM Updates (`amm.move`)

### Trading Block Enforcement

The AMM now enforces the trading block period for creators. When a creator tries to buy their own token during the block period, the transaction will fail.

### Updated Function Signatures

```move
/// Swap SUI for tokens (with trading block check)
public fun swap_sui_for_token<T>(
    pool: &mut LiquidityPool<T>,
    sui_in: Coin<SUI>,
    min_token_out: u64,
    insurance_pool: &mut crate::insurance::InsurancePool,
    token_registry: &crate::creator_token::TokenRegistry,  // NEW
    clock: &sui::clock::Clock,                              // NEW
    ctx: &mut TxContext
): Coin<T>

/// Entry function version
public entry fun swap_sui_for_token_entry<T>(
    pool: &mut LiquidityPool<T>,
    sui_in: Coin<SUI>,
    min_token_out: u64,
    insurance_pool: &mut crate::insurance::InsurancePool,
    token_registry: &crate::creator_token::TokenRegistry,  // NEW
    clock: &sui::clock::Clock,                              // NEW
    ctx: &mut TxContext
)
```

### New Error Code

```move
const ECreatorTradingBlocked: u64 = 6;  // Thrown when creator tries to buy during block period
```

### How It Works

1. When someone calls `swap_sui_for_token`, the function checks if the sender is the creator
2. If sender is the creator, it checks if the current time is past `trading_block_end_date`
3. If still in block period, the transaction fails with `ECreatorTradingBlocked`
4. If block period has ended, the swap proceeds normally

---

## 5. Integration Guide

### Creating a Token with All New Features

```move
// Example: Create token with 30-day trading block, 2% monthly vesting up to 40%
creator_token::create_token(
    witness,
    decimals: 9,
    symbol: b"CREATOR",
    name: b"Creator Token",
    description: b"My creator token",
    icon_url: b"https://example.com/icon.png",
    total_supply: 1_000_000_000,
    creator_allocation: 400_000_000,      // 40% to creator (vested)
    platform_reserve: 200_000_000,         // 20% to platform
    liquidity_pool_allocation: 400_000_000, // 40% to pool
    buyback_duration_years: 5,
    buyback_start_date: 1735689600000,     // Jan 1, 2025 00:00:00 UTC
    buyback_interval_months: 3,            // Quarterly buybacks
    buyback_amount_per_interval: 10_000_000, // 10M tokens per quarter
    trading_block_duration_days: 30,       // Creator can't buy for 30 days
    vesting_enabled: true,
    vesting_monthly_release_bps: 200,      // 2% per month
    vesting_total_release_bps: 4000,       // Max 40% vested
    initial_price_usd: 100,                // $1.00
    ctx
);
```

### Setting Up Vesting

If vesting is enabled, the creator should:

1. Keep their allocation aside (not sent directly to creator in `create_token`)
2. Create a vesting vault:

```move
vesting_vault::create_vesting_vault(
    token_registry_id,
    creator_tokens,                    // Full 40% allocation
    monthly_release_bps: 200,          // 2% per month
    total_release_cap_bps: 4000,       // Max 40% of allocation
    clock,
    ctx
);
```

3. Claim vested tokens monthly:

```move
vesting_vault::claim_vested_tokens(vault, clock, ctx);
// OR claim all available at once
vesting_vault::claim_all_available(vault, clock, ctx);
```

### Setting Up Buyback Vault

```move
// Option 1: Use registry configuration (RECOMMENDED)
buyback_vault::create_vault_from_registry(
    token_registry,
    collateral: coin::from_balance(sui_balance, ctx),
    clock,
    ctx
);

// Option 2: Manual configuration (for custom schedules)
buyback_vault::create_vault(
    token_registry_id,
    collateral,
    duration_years: 5,
    num_milestones: 20,                // Quarterly = 20 milestones over 5 years
    total_required_burns: 200_000_000,
    clock,
    ctx
);
```

---

## 6. Timeline Example

Assuming token created on **Jan 1, 2025**:

### Trading Block Period
- **Jan 1 - Jan 31, 2025**: Creator CANNOT buy tokens (30-day block)
- **Feb 1, 2025 onward**: Creator CAN buy tokens

### Vesting Schedule (2% monthly, 40% cap)
- **Feb 1, 2025**: 2% unlocked (8M tokens out of 400M)
- **Mar 1, 2025**: 2% unlocked (8M tokens)
- **Apr 1, 2025**: 2% unlocked (8M tokens)
- ...
- **Sep 1, 2026**: 2% unlocked (20th month = 40% total = 160M tokens)
- **Remaining 240M tokens**: Locked forever

### Buyback Schedule (Quarterly, starting Jan 1, 2025)
- **Apr 1, 2025**: 1st buyback (10M tokens)
- **Jul 1, 2025**: 2nd buyback (10M tokens)
- **Oct 1, 2025**: 3rd buyback (10M tokens)
- **Jan 1, 2026**: 4th buyback (10M tokens)
- ...
- **Jan 1, 2030**: 20th and final buyback (10M tokens)

---

## 7. Breaking Changes

### ⚠️ Function Signature Changes

The following functions now require additional parameters:

1. **AMM Module**:
   - `swap_sui_for_token()` now requires `token_registry` and `clock`
   - `swap_sui_for_token_entry()` now requires `token_registry` and `clock`

2. **Buyback Vault Module**:
   - `check_and_enforce_default()` now requires `token_registry`

### Migration Guide

**Old Code**:
```move
amm::swap_sui_for_token_entry(pool, sui_in, min_out, insurance_pool, ctx);
```

**New Code**:
```move
amm::swap_sui_for_token_entry(
    pool,
    sui_in,
    min_out,
    insurance_pool,
    token_registry,  // ADD THIS
    clock,           // ADD THIS
    ctx
);
```

---

## 8. Testing Recommendations

### Test Cases to Add

1. **Trading Block**:
   - ✅ Creator cannot buy tokens during block period
   - ✅ Creator can buy tokens after block period ends
   - ✅ Non-creators can always buy tokens

2. **Vesting**:
   - ✅ Cannot claim before first milestone
   - ✅ Can claim exactly at milestone time
   - ✅ Can batch claim multiple milestones
   - ✅ Cannot exceed total vesting cap
   - ✅ Remaining tokens stay locked

3. **Buyback Integration**:
   - ✅ Vault reads correct config from registry
   - ✅ Milestones match configured intervals
   - ✅ Buyback amounts match configured values

---

## 9. Next Steps

1. **Update Tests**: Modify existing test files to use new function signatures
2. **Update Frontend**: Update TypeScript SDK to pass `token_registry` and `clock` to AMM functions
3. **Update Documentation**: Update API docs and user guides
4. **Deploy**: Test on devnet/testnet before mainnet deployment

---

## Questions?

For questions or issues, please refer to:
- Contract source code in `/contracts/sources/`
- Test files in `/contracts/tests/`
- This documentation file
