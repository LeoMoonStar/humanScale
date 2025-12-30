# PeopleCoin Smart Contracts

## Overview

This directory contains the SUI Move smart contracts for the PeopleCoin platform. The contracts implement a complete system for personal token creation, automated distribution, and enforced buyback obligations.

---

## Architecture

### Core Contracts

1. **`creator_token.move`** - Fungible Token Generation
   - Creates unique creator tokens using SUI's Coin standard
   - One-time witness pattern ensures each creator gets a unique token type
   - Handles initial distribution (creator, platform reserve, liquidity pool)
   - Stores immutable token metadata and configuration

2. **`buyback_vault.move`** - Buyback Schedule & Debt Tracking
   - Enforces creator's buyback obligations over 5-10 years
   - Milestone-based schedule with automatic deadline enforcement
   - On-chain debt tracking when creators default
   - Collateral management for investor protection

3. **`distribution.move`** - Automated Reserve Distribution
   - Stage 2: Keeps distributing platform-held tokens to market
   - Time-locked releases at regular intervals (e.g., every 3 months)
   - Ensures continuous liquidity availability
   - Prevents token hoarding and maintains market activity

---

## Token Lifecycle (3 Stages)

### Stage 1: Generation & Setup
```
Creator submits application → KYC approval → Contract deployment
```

**On-chain actions:**
- Deploy unique token with `create_token()`
- Set total supply, allocations, buyback duration
- Create `BuybackVault` with collateral
- Create `DistributionVault` with reserve tokens
- Seed liquidity pool with initial allocation

**Initial Distribution:**
- Creator: 30% (example)
- Platform Reserve: 30%
- Liquidity Pool: 40%

### Stage 2: Keep Distributing
```
Every X months → Platform releases reserve tokens to liquidity pool
```

**On-chain actions:**
- `execute_distribution()` is called when milestone time is reached
- Tokens automatically released from `DistributionVault`
- Added to liquidity pool to maintain supply
- Anyone can trigger (permissionless execution)

**Duration:** Until reserve fully distributed or buyback phase begins

### Stage 3: Free Trading & Buyback
```
Creator must buy back and burn tokens according to schedule
```

**On-chain actions:**
- Creator calls `execute_buyback()` before each deadline
- If deadline missed → `check_and_enforce_default()` triggers automatic buyback
- Collateral used to purchase tokens from market
- Debt recorded on-chain if collateral insufficient
- Trading continues 24/7 on AMM

---

## Automation Strategy

### 1. Token Generation Automation

**Backend Service Implementation:**

```typescript
// Backend API endpoint: POST /api/creator/deploy-token

async function deployCreatorToken(creatorData) {
  // 1. Verify KYC and approval status
  const kyc = await verifyKYC(creatorData.userId);
  if (!kyc.approved) throw new Error("KYC not approved");

  // 2. Generate unique token witness type
  const tokenWitness = generateUniqueWitness(creatorData.userId);

  // 3. Prepare contract deployment transaction
  const tx = new Transaction();

  // 4. Call create_token with creator's parameters
  tx.moveCall({
    target: `${PACKAGE_ID}::creator_token::create_token`,
    typeArguments: [tokenWitness],
    arguments: [
      tx.pure(8),  // decimals
      tx.pure(creatorData.tokenSymbol),
      tx.pure(creatorData.tokenName),
      tx.pure(creatorData.description),
      tx.pure(creatorData.iconUrl),
      tx.pure(creatorData.totalSupply),
      tx.pure(creatorData.creatorAllocation),
      tx.pure(creatorData.platformReserve),
      tx.pure(creatorData.liquidityAllocation),
      tx.pure(creatorData.buybackDurationYears),
      tx.pure(creatorData.initialPriceUsd),
    ],
  });

  // 5. Sign with platform admin key and execute
  const result = await signAndExecute(tx);

  // 6. Store contract addresses in database
  await saveContractAddresses(creatorData.userId, result);

  // 7. Create buyback vault
  await deployBuybackVault(creatorData, result.tokenType);

  // 8. Create distribution vault
  await deployDistributionVault(creatorData, result.tokenType);

  return result;
}
```

**Key Components:**
- **Backend API**: Express/FastAPI endpoint that orchestrates deployment
- **SUI SDK**: `@mysten/sui.js` for transaction building and execution
- **Wallet Management**: Platform admin wallet with deployment permissions
- **Database**: Store token addresses, vault IDs, creator mappings

**Deployment Flow:**
```
User submits form → Frontend calls /api/creator/deploy-token
→ Backend validates KYC → Generates unique witness type
→ Builds Move transaction → Signs with admin wallet
→ Executes on SUI blockchain → Stores addresses in DB
→ Returns success to user
```

---

### 2. Automated Distribution (Stage 2)

**Cron Job Implementation:**

```typescript
// Run every hour
cron.schedule('0 * * * *', async () => {
  // 1. Query all active distribution vaults from database
  const vaults = await db.getActiveDistributionVaults();

  for (const vault of vaults) {
    // 2. Check if next milestone is ready
    const nextTime = await getNextDistributionTime(vault.id);
    const currentTime = Date.now();

    if (currentTime >= nextTime) {
      // 3. Execute distribution transaction
      const tx = new Transaction();
      tx.moveCall({
        target: `${PACKAGE_ID}::distribution::execute_distribution`,
        typeArguments: [vault.tokenType],
        arguments: [
          tx.object(vault.vaultId),
          tx.object(CLOCK_OBJECT_ID),
        ],
      });

      // 4. Anyone can execute (no auth needed)
      await executeTransaction(tx);

      // 5. Log execution
      console.log(`Distributed tokens for vault ${vault.id}`);
    }
  }
});
```

**Alternative: Keeper Network Integration**

Instead of centralized cron jobs, use decentralized keepers:

- **Gelato Network**: Automated smart contract execution
- **Chainlink Keepers**: Time-based or custom logic triggers
- **Custom Keeper Bot**: Monitor blockchain events and execute

**Benefits:**
- Permissionless (anyone can trigger)
- Decentralized execution
- No single point of failure
- Gas costs paid by trigger mechanism

---

### 3. Automated Buyback Enforcement

**Default Detection Service:**

```typescript
// Run every day
cron.schedule('0 0 * * *', async () => {
  // 1. Query all buyback vaults
  const vaults = await db.getActiveBuybackVaults();

  for (const vault of vaults) {
    // 2. Check vault status on-chain
    const status = await getBuybackVaultStatus(vault.id);

    // 3. Check if current milestone is overdue
    const milestone = await getCurrentMilestone(vault.id);
    const currentTime = Date.now();

    if (currentTime > milestone.deadline && !milestone.completed) {
      // 4. Trigger automatic enforcement
      const tx = new Transaction();
      tx.moveCall({
        target: `${PACKAGE_ID}::buyback_vault::check_and_enforce_default`,
        typeArguments: [vault.tokenType],
        arguments: [
          tx.object(vault.vaultId),
          tx.object(CLOCK_OBJECT_ID),
        ],
      });

      await executeTransaction(tx);

      // 5. Send alerts
      await sendDefaultAlert(vault.creatorId);
      await notifyInvestors(vault.id);

      // 6. Trigger legal process if needed
      if (status.debt > LEGAL_THRESHOLD) {
        await initiateLegalAction(vault.creatorId);
      }
    }
  }
});
```

**Automatic Buyback Execution (Future Enhancement):**

Currently `check_and_enforce_default()` records the default. To make it fully automatic:

```move
// In buyback_vault.move, add AMM integration:

public entry fun check_and_enforce_default<T>(
    vault: &mut BuybackVault<T>,
    amm_pool: &mut Pool<T, SUI>,  // AMM pool reference
    clock: &Clock,
    ctx: &mut TxContext
) {
    // ... existing deadline check ...

    if (is_defaulted) {
        // Use collateral to buy tokens from market
        let collateral_amount = calculate_required_collateral(milestone);
        let collateral_coin = extract_collateral(vault, collateral_amount);

        // Swap SUI for tokens on AMM
        let tokens_bought = swap_sui_for_tokens(
            amm_pool,
            collateral_coin,
            milestone.required_burn_amount,
            ctx
        );

        // Burn the tokens
        burn_tokens(treasury_cap, tokens_bought);

        // Record debt if insufficient
        // ... debt tracking logic ...
    }
}
```

---

## Automation Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     Backend Services                         │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────┐  ┌──────────────────┐                 │
│  │  Token Deployer  │  │  Keeper Service  │                 │
│  │                  │  │                  │                 │
│  │  • KYC check     │  │  • Cron jobs     │                 │
│  │  • Witness gen   │  │  • Distribution  │                 │
│  │  • TX builder    │  │  • Default check │                 │
│  │  • DB storage    │  │  • Alerts        │                 │
│  └────────┬─────────┘  └────────┬─────────┘                 │
│           │                     │                            │
└───────────┼─────────────────────┼────────────────────────────┘
            │                     │
            ▼                     ▼
┌─────────────────────────────────────────────────────────────┐
│                     SUI Blockchain                           │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌────────────────┐  ┌──────────────┐  ┌─────────────────┐  │
│  │ CreatorToken   │  │ BuybackVault │  │ DistributionVault│  │
│  │                │  │              │  │                  │  │
│  │ • Token mint   │  │ • Milestones │  │ • Reserve tokens │  │
│  │ • Metadata     │  │ • Collateral │  │ • Auto-release   │  │
│  │ • Allocations  │  │ • Debt track │  │ • Liquidity mgmt │  │
│  └────────────────┘  └──────────────┘  └─────────────────┘  │
│                                                               │
└───────────────────────────────────────────────────────────────┘
            │                     │                     │
            ▼                     ▼                     ▼
┌─────────────────────────────────────────────────────────────┐
│                         AMM Pool                             │
│         (DeepBook or Custom Constant Product AMM)            │
└─────────────────────────────────────────────────────────────┘
```

---

## Security Considerations

### 1. **Collateral Requirements**
- Creators must lock SUI as collateral (e.g., 2x expected buyback cost)
- Protects investors if creator defaults
- Enables automatic market buyback

### 2. **Immutable Schedules**
- Buyback schedule set at creation, cannot be changed
- Distribution intervals fixed
- Prevents creator manipulation

### 3. **On-Chain Debt Tracking**
- All defaults recorded permanently
- Transparent for investors
- Legal enforcement evidence

### 4. **Permissionless Execution**
- Anyone can trigger distribution/enforcement
- Reduces platform centralization risk
- Keeper networks can automate

### 5. **Time Oracle (Clock)**
- Uses SUI's Clock object for timestamps
- Prevents time manipulation
- Consistent across all contracts

---

## Gas Optimization

### Efficient Data Structures
- Use `vector` for bounded lists (milestones)
- `Balance` instead of `Coin` for storage
- Minimal on-chain storage (metadata only)

### Batching
- Distribute multiple creator tokens in single TX
- Batch buyback checks for gas savings

### Event-Driven Indexing
- Emit events for all state changes
- Backend indexes events instead of querying chain
- Reduces RPC calls

---

## Testing Strategy

### Unit Tests
```bash
sui move test
```

Test coverage:
- Token creation with various allocations
- Buyback execution (on-time and late)
- Distribution milestone triggers
- Debt recording and collateral usage
- Edge cases (zero amounts, invalid schedules)

### Integration Tests
- Deploy all contracts on testnet
- Simulate full creator lifecycle
- Test automation scripts
- Verify event emissions

### Stress Tests
- Deploy 100+ creator tokens
- Measure gas costs at scale
- Test concurrent operations

---

## Deployment Guide

### 1. Build Contracts
```bash
cd contracts
sui move build
```

### 2. Deploy to Testnet
```bash
sui client publish --gas-budget 100000000
```

### 3. Save Package ID
```bash
export PACKAGE_ID=0x...
```

### 4. Initialize Platform
```typescript
// Create platform admin wallet
// Fund with testnet SUI
// Store private key securely (use KMS in production)
```

### 5. Test Token Deployment
```bash
# Use SUI CLI or TypeScript SDK
```

---

## AMM Integration (Next Step)

For trading to work, we need an AMM. Two options:

### Option 1: Use SUI DeepBook
- SUI's native CLOB (Central Limit Order Book)
- High liquidity, low slippage
- Requires DeepBook integration

### Option 2: Custom Constant Product AMM
- Simple x * y = k formula
- Independent liquidity pools per creator
- Full control over fees and parameters

**Recommendation:** Start with custom AMM for MVP, migrate to DeepBook later for liquidity aggregation.

---

## Feedback & Design Analysis

### ✅ Strengths

1. **Fully On-Chain Enforcement**
   - No off-chain trust required for buybacks
   - Smart contracts enforce all obligations
   - Transparent and auditable

2. **Automated Distribution**
   - Stage 2 ensures continuous liquidity
   - Prevents "all tokens locked" scenario
   - Time-locked releases maintain fairness

3. **Debt Tracking**
   - On-chain record of defaults
   - Legal enforcement evidence
   - Transparent investor protection

4. **Flexible Schedules**
   - 5-10 year buyback periods
   - Customizable milestones
   - Monthly/quarterly distributions

5. **Collateral Security**
   - Creators lock funds upfront
   - Automatic buyback possible
   - Reduces investor risk

### ⚠️ Challenges & Considerations

1. **AMM Liquidity Risk**
   - If token price spikes, creator may not afford buyback
   - Need sufficient initial liquidity
   - **Solution:** Minimum collateral = 2x market cap, dynamic adjustment

2. **Oracle Dependency**
   - Automatic buyback needs price oracle
   - SUI oracle landscape still developing
   - **Solution:** Use Pyth Network or Switchboard oracles

3. **Gas Costs**
   - Automated executions cost gas
   - Who pays for keeper operations?
   - **Solution:** Reserve 1% of token supply for gas fees, keeper rewards

4. **Legal Enforceability**
   - On-chain debt ≠ automatic legal action
   - Still requires off-chain legal framework
   - **Solution:** Smart contracts + legal agreements (DocuSign integration)

5. **Creator Liquidity Burden**
   - Buyback schedule might be too aggressive
   - Creator income may fluctuate
   - **Solution:** Grace periods, partial buyback options, flexible schedules

### 🚀 Recommended Enhancements

1. **Add Grace Periods**
   - Allow 30-day grace period before default
   - Creator can request extension (requires community vote)

2. **Partial Buyback Support**
   - Allow buying back portion of milestone
   - Pro-rate remaining obligations

3. **Dynamic Collateral Adjustment**
   - Monitor token price
   - Request additional collateral if price rises
   - Protect against "too successful" scenario

4. **Community Governance**
   - Token holders vote on schedule modifications
   - Weighted voting based on holdings
   - Prevents creator unilateral changes

5. **Insurance Pool**
   - Platform-wide insurance fund
   - Cover defaults beyond collateral
   - Funded by platform fees (e.g., 0.5% trading fee)

---

## Next Steps

1. ✅ **Core contracts complete** (creator_token, buyback_vault, distribution)
2. ⏳ **Add AMM contract** (constant product or DeepBook integration)
3. ⏳ **Write comprehensive tests**
4. ⏳ **Deploy to testnet and verify**
5. ⏳ **Build backend automation service**
6. ⏳ **Integrate price oracles**
7. ⏳ **Security audit** (external firm recommended)
8. ⏳ **Mainnet deployment**

---

## Questions for Product Team

1. **Collateral Amount**: What multiple of expected buyback cost (2x? 3x?)?
2. **Default Penalties**: Additional penalty beyond debt (e.g., 10% fee)?
3. **Grace Periods**: How many days before enforcement?
4. **Oracle Choice**: Pyth, Switchboard, or custom?
5. **AMM Design**: Custom AMM or DeepBook?
6. **Fee Structure**: Trading fees (0.3%?), platform cut?
7. **Insurance Pool**: Should platform maintain safety fund?

---

## License

MIT
