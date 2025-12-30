# PeopleCoin Architecture

## 1. Project Overview
PeopleCoin is an investment platform that allows individuals to tokenize themselves ("Personal Tokens"). Users can raise funds by issuing tokens, while investors can bet on the future success of these individuals.

**Core Value Proposition:**
- **For Creators:** Get early-stage funding and investment easily.
- **For Investors:** Invest in people you know and believe in.

## 2. Technical Architecture

### 2.1 Blockchain Layer
- **Network:** **SUI Blockchain**
- **Token Standard:** Fungible Token (SUI Coin<T>, conceptually similar to ERC-20).
- **Smart Contracts:**
  - Handles token generation, distribution, and trading.
  - **Automated Enforcement:** All buyback and debt logic is immutable and executed on-chain.

### 2.2 Backend Layer
- **Language:** **Rust** or **Golang** (for high performance/concurrency).
- **Responsibilities:**
  - **KYC/Identity:** Verifies user identity (ideally via Wallet credentials or fallback to platform KYC).
  - **Off-chain Profiles:** Hosting rich media (videos, talks, blogs) for creators to pitch themselves.
  - **Indexing:** Aggregating on-chain data for fast frontend retrieval.

### 2.3 Frontend Layer
- **Platform:** Web Application (Mobile-First / Mobile-Responsive).
- **Authentication:** Connect Wallet (e.g., Sui Wallet, zkLogin).

---

## 3. Core Mechanisms & User Flow

### 3.1 Onboarding & KYC
1.  **Wallet Connection:** User connects via SUI-compatible wallet.
2.  **KYC Check:**
    - *Preferred:* Read KYC data directly from wallet identity providers (if available).
    - *Fallback:* Platform performs background check (academic history, anti-fraud verification).
3.  **Approval:** Only verified non-scam users can deploy contracts.

### 3.2 Token Lifecycle Stages

The lifecycle spans 5 to 10 years and is divided into three distinct stages:

#### Stage 1: Generation & Setup
- **Initial Funding:** Creator provides seed money to liquidity pool.
- **Allocation:**
  - **Creator:** Holds a certain amount of tokens initially.
  - **Platform (Reserve):** Holds a portion of tokens to be distributed over time.
  - **Liquidity Pool:** Seeded with initial funding and tokens.
- **Contract Definition:** Total supply, buyback schedule (e.g., 5-10 years), and initial price are locked.

#### Stage 2: Keep Distributing (Liquidity Injection)
- **Goal:** Ensure available liquidity for the community even if holders HODL.
- **Mechanism:** The Platform/Contract automatically releases held tokens into the Liquidity Pool at regular intervals (e.g., every 3 months).
- **Duration:** Continues until the reserve is fully distributed or specific conditions are met.

#### Stage 3: Free Trading & Buyback
- **Trigger:** Identifying milestone - specifically after the **Creator executes their first buyback and burn**.
- **State:**
  - All intended circulating supply is effectively on the market (or distribution continues in parallel).
  - True "Free Trading" era begins.
- **Ongoing Obligation:** Creator must continue to buy back and burn tokens according to the schedule to avoid default/debt generation.

### 3.3 Trading & Liquidity
- **AMM:** Automated Market Maker facilitates trading.
- **Dynamics:** Continuous platform distribution helps stabilize supply availability.

### 3.4 Buyback & Default Logic (Smart Contract Enforced)
- **Golden Rule:** The creator *must* burn a specific amount of tokens by defined deadlines.
- **Automatic Execution:**
  - If the creator misses a deadline, the Smart Contract **automatically** buys the required tokens from the market (Liquidity Pool) using the locked collatoral/funds.
  - **Debt Creation:** If funds are insufficient, a "Debt" state is recorded on-chain against the creator's address.
  - **Consequence:** Default triggers legal/off-chain consequences (suing for breach of contract), but the on-chain mechanism ensures the protocol remains solvent as long as collateral exists.

### 3.5 Market Making & Stability (Optional Service)
- **Community-Driven (Default):** The creator is solely responsible for managing their token's economy.
  - *Risk:* If price skyrockets, the creator may struggle to afford the buyback.
- **Platform Managed Service (Subscription):**
  - **Market Making:** The platform actively manages liquidity to maintain price predictability/stability.
  - **Managed Wallet:** Creator delegates wallet management to the platform, ensuring sufficient tokens are reserved for the mandatory burn events.

## 4. Work packages / Modules
_(Based on Monorepo structure)_

1.  **Smart Contract Generator**: Tooling to deploy customized Move contracts for each user.
2.  **Web UI**:
    - **Creator Dashboard**: KYC status, Token Management, Buyback execution.
    - **Investor Feed**: Discovery of new talents, Trading interface.
3.  **Backend API**:
    - User Profile Management.
    - Media Upload/Streaming.
    - Blockchain Event Indexer.
4.  **Market Making Bot (Low Priority)**:
    - Automated trading bot to stabilize token prices.
    - Wallet management service for subscribed creators.
