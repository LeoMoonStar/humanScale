# Platform Vault & Debt System

## Overview

The platform vault system provides a safety net for the entire PeopleCoin ecosystem. It ensures that buyback commitments are always fulfilled, even when individual creators lack sufficient collateral.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     PLATFORM VAULT                              │
│  (Centralized SUI Pool - 100M+ SUI capacity)                   │
│                                                                  │
│  - Emergency buyback loans (5% APR)                            │
│  - Creator punishment debt tracking (10% APR)                  │
│  - Credit limits per creator                                    │
│  - Time-based interest calculation                             │
└────────────┬────────────────────────────────┬───────────────────┘
             │                                │
             ├────────────────────────────────┼─────────────────┐
             │                                │                 │
    ┌────────▼─────────┐           ┌────────▼─────────┐   ┌────▼────────┐
    │ Creator A Vault  │           │ Creator B Vault  │   │ Creator C   │
    │                  │           │                  │   │   Vault     │
    │ Collateral: 500K │           │ Collateral: 100K │   │ Coll: 1M    │
    │ Borrowed: 0      │           │ Borrowed: 50K    │   │ Borr: 0     │
    │ Debt: 0          │           │ Debt: 15K        │   │ Debt: 0     │
    └──────────────────┘           └──────────────────┘   └─────────────┘
```

---

## Key Components

### 1. Platform Vault
**Purpose**: Centralized emergency fund for all buyback vaults

**Features**:
- **Large SUI Pool**: 100M+ SUI capacity for emergency buybacks
- **Loan System**: Lends to buyback vaults at 5% APR when collateral runs out
- **Credit Limits**: Per-creator borrowing limits (default 500K SUI)
- **Interest Tracking**: Automatic time-based interest calculation
- **Debt Enforcement**: Tracks creator debt with 10% APR punishment interest

**States**:
- `total_capacity`: Maximum SUI available
- `total_lent`: Currently lent to buyback vaults
- `active_loans`: Table of vault_id -> Loan
- `creator_debts`: Table of creator -> CreatorDebt

### 2. Creator Debt System
**Purpose**: Track and enforce repayment of defaulted buyback obligations

**Debt Creation**:
- When creator defaults on buyback milestone
- Platform vault covers the buyback cost
- Debt is recorded with timestamp

**Interest Rate**:
- **10% APR** (punishment rate)
- Compounds based on time
- Higher than loan rate to incentivize quick repayment

**Repayment**:
- Automatic deduction from creator token sales
- Payment priority: Interest first, then principal
- Debt is cleared when total_owed = 0

### 3. Loan System
**Purpose**: Emergency liquidity for buyback vaults

**Loan Terms**:
- **Interest Rate**: 5% APR
- **Credit Limit**: Default 500K SUI per creator
- **Collateral**: Backed by creator's vault collateral
- **Repayment**: Must be repaid with interest

**Workflow**:
1. Buyback vault detects insufficient collateral
2. Vault borrows from platform vault
3. Platform vault issues loan at 5% APR
4. Loan tracked in `active_loans` table
5. Buyback completes using borrowed funds
6. Creator must repay loan with interest

---

## Interest Calculation

### Formula
```
interest = (principal * rate_bps * time_seconds) / (10000 * seconds_per_year)
```

### Example: Creator Debt
```
Principal: 15,000 SUI
Rate: 10% APR (1000 bps)
Time: 30 days (2,592,000 seconds)

interest = (15000 * 1000 * 2592000) / (10000 * 31536000)
         = 38,880,000,000 / 315,360,000,000
         = ~1,233 SUI

Total Owed = 15,000 + 1,233 = 16,233 SUI
```

### Example: Platform Loan
```
Principal: 50,000 SUI
Rate: 5% APR (500 bps)
Time: 90 days

interest = (50000 * 500 * 7776000) / (10000 * 31536000)
         = ~616 SUI

Total Owed = 50,000 + 616 = 50,616 SUI
```

---

## Creator Sale Flow with Debt Repayment

### Standard Sale (No Debt)
```
Creator → Sell 100K tokens → Get 100K SUI → All to creator wallet
```

### Sale with Outstanding Debt
```
Creator: Owes 16,250 SUI (15K principal + 1.25K interest)

Step 1: Sell tokens
Creator → Sell 100K tokens → Get 100K SUI

Step 2: Auto debt deduction
100K SUI → Platform Vault
  ├─ 16,250 SUI → Debt repayment (clears debt)
  │   ├─ 1,250 → Interest (to platform)
  │   └─ 15,000 → Principal (to platform)
  └─ 83,750 SUI → Creator wallet

Result: Debt cleared, creator receives 83,750 SUI
```

### Partial Debt Repayment
```
Creator: Owes 50K SUI
Sale proceeds: 30K SUI

30K SUI → Platform Vault
  ├─ 30K → Partial debt repayment
  └─ 0 → Creator wallet

Remaining debt: 20K SUI (continues accruing interest)
```

---

## Default Scenario Flow

### Scenario: Creator misses buyback deadline

**Initial State**:
- Milestone 3 deadline: Jul 15, 2024
- Required burn: 1,000 tokens
- Creator collateral: 10,000 SUI
- Current token price: 1.05 SUI

**Step-by-Step**:

1. **Deadline Passes** (Jul 16, 2024)
   - System detects default
   - Triggers `check_and_enforce_default()`

2. **Calculate Cost**
   - Quote AMM: "Need 1,050 SUI to buy 1,000 tokens"
   - Check collateral: 10,000 SUI available ✅

3. **Borrow from Platform** (if needed)
   - In this case: Not needed (sufficient collateral)
   - If insufficient: Borrow from platform vault

4. **Execute Buyback**
   - Use 1,050 SUI from collateral
   - Buy 1,000 tokens from AMM
   - Burn tokens using TreasuryCap

5. **Record Debt**
   - Create debt record: 1,050 SUI
   - Start accruing 10% APR interest
   - Mark milestone as completed (forced)

6. **Creator Notification**
   - "You defaulted on Milestone 3"
   - "Debt: 1,050 SUI"
   - "Interest: 10% APR"
   - "Sell tokens to repay debt"

7. **Interest Accumulation**
   ```
   Day 1:  1,050 SUI + 0.29 SUI = 1,050.29 SUI
   Day 7:  1,050 SUI + 2.01 SUI = 1,052.01 SUI
   Day 30: 1,050 SUI + 8.63 SUI = 1,058.63 SUI
   ```

8. **Creator Sells Tokens**
   - Sell 20,000 tokens → 21,000 SUI
   - Auto-deduction: 1,058.63 SUI → Debt repayment
   - Creator receives: 19,941.37 SUI
   - Debt cleared ✅

---

## Platform Vault Borrowing Flow

### Scenario: Insufficient Collateral

**Initial State**:
- Creator collateral: 100 SUI
- Token price spiked: 1,500 SUI needed for buyback
- Platform vault: 100M SUI available

**Flow**:

1. **Default Detection**
   - Need: 1,500 SUI
   - Have: 100 SUI
   - Deficit: 1,400 SUI

2. **Check Credit Limit**
   - Creator credit limit: 500K SUI
   - Current borrowed: 0 SUI
   - Can borrow: 500K SUI ✅

3. **Borrow from Platform**
   ```move
   let borrowed_sui = platform_vault::borrow(
       vault,
       creator_address,
       buyback_vault_id,
       1400,  // amount
       clock,
       ctx
   );
   ```

4. **Execute Buyback**
   - Use all collateral: 100 SUI
   - Use borrowed funds: 1,400 SUI
   - Total: 1,500 SUI → Buy & burn tokens

5. **Record Loan**
   - Principal: 1,400 SUI
   - Interest: 5% APR (platform loan rate)
   - Must be repaid

6. **Create Punishment Debt**
   - Principal: 1,500 SUI (full buyback cost)
   - Interest: 10% APR (punishment rate)
   - Deducted from sales

7. **Dual Obligations**
   - **Loan**: 1,400 SUI @ 5% APR → Repay to platform vault
   - **Debt**: 1,500 SUI @ 10% APR → Deducted from sales

---

## Credit Limit Management

### Default Limits
- **New creators**: 500,000 SUI credit limit
- **Proven creators**: Can request increase
- **Defaulters**: Can be reduced by admin

### Custom Limits
```move
// Admin sets custom limit for high-performing creator
platform_vault::set_credit_limit(
    vault,
    admin_cap,
    creator_address,
    2_000_000,  // 2M SUI credit limit
    ctx
);
```

### Utilization
```
Credit Limit:    500,000 SUI
Currently Borrowed: 15,000 SUI
Available Credit:  485,000 SUI
Utilization:      3%
```

---

## Security & Risk Management

### Platform Vault Safety
- **Overcollateralization**: Total collateral > total lent
- **Diversification**: Spread across many creators
- **Insurance backup**: Insurance pool as secondary safety net

### Creator Risk Mitigation
- **Collateral requirements**: Creators must post collateral
- **Punishment interest**: 10% APR discourages defaults
- **Auto-enforcement**: System automatically executes buybacks
- **Credit limits**: Cap individual exposure

### Interest Rate Design
- **Platform Loan**: 5% APR (cost of capital)
- **Punishment Debt**: 10% APR (incentive to comply)
- **Spread**: 5% profit margin for platform

---

## API Reference

### PlatformVault Functions

#### Admin Functions
```move
// Create platform vault
public entry fun create_vault(
    initial_fund: Coin<SUI>,
    default_credit_limit: u64,
    clock: &Clock,
    ctx: &mut TxContext
)

// Deposit more funds
public entry fun deposit_funds(
    vault: &mut PlatformVault,
    admin_cap: &PlatformVaultAdminCap,
    funds: Coin<SUI>,
    clock: &Clock,
    ctx: &mut TxContext
)

// Set custom credit limit
public entry fun set_credit_limit(
    vault: &mut PlatformVault,
    admin_cap: &PlatformVaultAdminCap,
    creator: address,
    limit: u64,
    ctx: &mut TxContext
)
```

#### Borrowing Functions
```move
// Borrow for emergency buyback
public fun borrow(
    vault: &mut PlatformVault,
    borrower: address,
    borrower_vault_id: ID,
    amount: u64,
    clock: &Clock,
    ctx: &mut TxContext
): Coin<SUI>

// Repay loan
public entry fun repay_loan(
    vault: &mut PlatformVault,
    borrower_vault_id: ID,
    payment: Coin<SUI>,
    clock: &Clock,
    ctx: &mut TxContext
)
```

#### Debt Management
```move
// Create creator debt
public fun create_creator_debt(
    vault: &mut PlatformVault,
    creator: address,
    amount: u64,
    clock: &Clock,
    ctx: &mut TxContext
)

// Repay creator debt (from sales)
public fun repay_creator_debt(
    vault: &mut PlatformVault,
    creator: address,
    payment: Coin<SUI>,
    clock: &Clock,
    ctx: &mut TxContext
): u64  // Returns amount deducted
```

#### View Functions
```move
// Get vault status
public fun get_vault_status(vault: &PlatformVault): (
    u64,  // total_capacity
    u64,  // available_balance
    u64,  // total_lent
    u64,  // total_interest_earned
    u64,  // active_loans_count
)

// Get creator debt with current interest
public fun get_creator_debt(
    vault: &PlatformVault,
    creator: address,
    current_time: u64
): (u64, u64, u64, u64)  // (principal, interest, total_owed, days_in_debt)

// Check if creator has debt
public fun has_debt(vault: &PlatformVault, creator: address): bool
```

---

## Events

### Platform Vault Events
```move
// Vault created
struct VaultCreated {
    vault_id: ID,
    initial_balance: u64,
    admin: address,
}

// Loan issued
struct LoanIssued {
    vault_id: ID,
    borrower: address,
    borrower_vault_id: ID,
    amount: u64,
    timestamp: u64,
}

// Loan repaid
struct LoanRepaid {
    vault_id: ID,
    borrower: address,
    principal: u64,
    interest: u64,
    total_repaid: u64,
    timestamp: u64,
}

// Debt created
struct DebtCreated {
    vault_id: ID,
    creator: address,
    amount: u64,
    timestamp: u64,
}

// Debt repaid
struct DebtRepaid {
    vault_id: ID,
    creator: address,
    amount: u64,
    interest_paid: u64,
    remaining_debt: u64,
    timestamp: u64,
}
```

---

## Monitoring & Alerts

### Platform Dashboard
- Total capacity vs. total lent
- Number of active loans
- Default rate across all creators
- Interest earned
- Top borrowers

### Creator Dashboard
- Current debt amount
- Days in debt
- Interest accruing per day
- Estimated repayment amount
- Credit limit utilization

### Alert Triggers
- Platform vault utilization > 80%
- Creator debt > 30 days old
- Credit limit exceeded
- Loan default risk

---

## Best Practices

### For Creators
1. **Maintain Collateral**: Keep sufficient SUI in vault
2. **Meet Deadlines**: Execute buybacks on time to avoid debt
3. **Repay Quickly**: 10% APR adds up fast
4. **Monitor Debt**: Check dashboard regularly
5. **Sell Strategically**: Use `sell_and_repay_debt()` to auto-repay

### For Platform
1. **Set Conservative Limits**: Don't over-lend
2. **Monitor Utilization**: Keep reserves for emergencies
3. **Adjust Rates**: Change interest rates based on risk
4. **Track Defaults**: Analyze patterns and adjust limits
5. **Maintain Insurance**: Backstop for extreme scenarios

---

**Last Updated**: January 2026
**Version**: 1.0
**Status**: Implemented ✅
