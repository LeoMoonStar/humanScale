# PeopleCoin Development Tasks

Based on `agents.md` architecture specification.

---

## Phase 1: Foundation & Infrastructure

### 1.1 Project Setup
- [x] Initialize monorepo structure
- [x] Set up frontend (React + TypeScript + Vite)

### 1.2 Frontend development
- [x] Build portfolio dashboard (current Home.tsx)
  - [x] Portfolio summary with balance
  - [x] Balance change chart
  - [x] Asset allocation
  - [x] Transaction history
  - [x] Following person
- [x] Adding SUI wallet connection functionality (supports SUI blockchain)
- [x] Add search page with result list
- [x] Create a detail page for any return result (creator's coin)
- [x] Details page contains creator information:
  - [x] LinkedIn-style job experience section
  - [x] GitHub profile link
  - [x] Personal website and social links
  - [x] Spotify/Kickstarter/custom webview embedding support
  - [x] Creator uploaded video section
  - [x] Highly customizable profile sections
- [x] Details page contains Q&A features:
  - [x] Next public Q&A date and time
  - [x] Zoom meeting link integration
  - [x] Last Q&A video replay
- [x] Detail page contains trading features:
  - [x] Price chart for the coin (24h bar chart)
  - [x] Most recent transactions
  - [x] Buy and sell module with amount input
- [x] Application page for user to become a creator:
  - [x] Multi-step form (4 steps)
  - [x] Personal information collection
  - [x] Professional information
  - [x] Set total supply
  - [x] Define buyback schedule (5-10 years)
  - [x] Set initial price & allocation
  - [x] Seed liquidity pool configuration
  - [x] Document upload (Resume, ID, Pitch Video)
- [x] Legal document signing page with DocuSign integration placeholder 
- [ ] Build KYC submission flow
- [ ] Create KYC status dashboard
- [ ] Implement email notifications
- [ ] Integrate zkLogin support



### 1.3 Blockchain Layer (SUI)
- [ ] Set up SUI Move smart contracts directory
- [ ] Research SUI blockchain development best practices
- [ ] Set up SUI development environment
- [ ] Create base Move smart contract template
- [ ] Implement token generation contract (Fungible Token)
- [ ] Implement AMM (Automated Market Maker) contract
- [ ] Implement buyback & burn mechanism
- [ ] Implement debt tracking on-chain
- [ ] Add collateral locking mechanism
- [ ] Write unit tests for smart contracts
- [ ] Deploy contracts to SUI testnet
- [ ] Security audit for smart contracts

---

## Phase 2: Backend Development

### 2.1 Core Backend API
- [ ] Set up golang backend
- [ ] Set up REST API framework
- [ ] Design database schema (PostgreSQL/MongoDB)
- [ ] Implement user authentication system
- [ ] Implement wallet connection integration

### 2.2 KYC & Identity Management
- [ ] Research wallet-based KYC solutions for SUI
- [ ] Implement wallet credential verification
- [ ] Build fallback platform KYC system
- [ ] Implement background check verification
- [ ] Create admin approval workflow
- [ ] Build anti-fraud detection system

### 2.3 Profile & Media Management
- [ ] Implement user profile CRUD operations
- [ ] Set up media storage (AWS S3 / IPFS)
- [ ] Build media upload API (videos, images, documents)
- [ ] Implement content moderation system
- [ ] Create rich text editor for creator pitches

### 2.4 Blockchain Indexer
- [ ] Set up SUI blockchain event listener
- [ ] Index token creation events
- [ ] Index trading transactions
- [ ] Index buyback & burn events
- [ ] Index debt creation events
- [ ] Build caching layer for fast queries
- [ ] Create API endpoints for indexed data

---

## Phase 3: Frontend Further Development

### 3.1 Authentication & Onboarding



### 3.2 Creator Dashboard
- [ ] Design creator onboarding flow
  
- [ ] Create token management dashboard
  - [ ] View token metrics (price, volume, holders)
  - [ ] Monitor buyback obligations
  - [ ] Track debt status
- [ ] Build buyback execution interface
  - [ ] Manual buyback trigger
  - [ ] Burn confirmation UI
- [ ] Implement profile management
  - [ ] Upload pitch videos
  - [ ] Add social links
  - [ ] Write bio/story
- [ ] Create analytics dashboard
  - [ ] Token performance charts
  - [ ] Holder demographics
  - [ ] Trading volume trends



### 3.4 Trading Dashboard Enhancements
- [ ] Implement chart time period switching (1D, 1W, 1M, 1Y, ALL)
- [ ] Add technical indicators (MA, EMA, RSI, MACD)
- [ ] Create trending topics sidebar with live data
- [ ] Implement real-time price updates (WebSocket)
- [ ] Add transaction filtering & sorting
- [ ] Export transaction history to CSV

---

## Phase 4: Smart Contract Integration

### 4.1 Contract Deployment System
- [ ] Build smart contract generator tool
- [ ] Create contract deployment API
- [ ] Implement contract parameter validation
- [ ] Add transaction signing flow
- [ ] Handle deployment errors & retries
- [ ] Store contract addresses in database

### 4.2 Token Distribution Mechanism
- [ ] Implement Stage 2 distribution logic
- [ ] Build automated distribution scheduler
- [ ] Create distribution monitoring dashboard
- [ ] Add manual distribution override (admin)

### 4.3 Buyback & Default System
- [ ] Monitor buyback deadlines
- [ ] Send notifications before deadlines
- [ ] Execute automatic buyback on default
- [ ] Record debt on-chain
- [ ] Trigger legal/compliance alerts
- [ ] Create default resolution workflow

---

## Phase 5: Market Making Service (Low Priority)

### 5.1 Market Making Bot
- [ ] Design bot trading strategy
- [ ] Implement liquidity management algorithm
- [ ] Build price stabilization logic
- [ ] Create bot monitoring dashboard
- [ ] Add emergency stop mechanism

### 5.2 Subscription Management
- [ ] Design subscription pricing tiers
- [ ] Implement payment processing
- [ ] Build wallet delegation system
- [ ] Create service agreement interface
- [ ] Add creator opt-in/opt-out flow

---

## Phase 6: Testing & Quality Assurance

### 6.1 Testing
- [ ] Write frontend unit tests (Vitest/Jest)
- [ ] Write backend unit tests
- [ ] Create integration tests
- [ ] Implement E2E tests (Playwright/Cypress)
- [ ] Smart contract testing on testnet
- [ ] Load testing & performance optimization

### 6.2 Security
- [ ] Security audit for backend API
- [ ] Security audit for smart contracts (external firm)
- [ ] Penetration testing
- [ ] Implement rate limiting & DDoS protection
- [ ] Add input validation & sanitization
- [ ] Set up monitoring & alerting

---

## Phase 7: Deployment & Launch

### 7.1 Infrastructure
- [ ] Set up production servers
- [ ] Configure CDN for frontend
- [ ] Set up database backups
- [ ] Implement logging & monitoring (Datadog/Sentry)
- [ ] Configure auto-scaling

### 7.2 Launch Preparation
- [ ] Deploy smart contracts to SUI mainnet
- [ ] Deploy backend to production
- [ ] Deploy frontend to production
- [ ] Create legal terms & conditions
- [ ] Write user documentation
- [ ] Prepare marketing materials
- [ ] Beta testing with select users

### 7.3 Post-Launch
- [ ] Monitor system performance
- [ ] Gather user feedback
- [ ] Fix critical bugs
- [ ] Iterate on UX improvements
- [ ] Add requested features

---

## Current Sprint (Frontend Polish)

### Immediate Tasks
- [x] Fix Tailwind CSS v4 → v3 downgrade
- [x] Implement balance change chart (Robinhood-style)
- [x] Fix header layout (padding-top issue)
- [ ] Match trading dashboard to design reference
- [ ] Add real-time data integration
- [ ] Implement responsive mobile layout
- [ ] Polish UI components and animations

---

## Notes & Decisions

### Technology Stack
- **Frontend:** React 19 + TypeScript + Vite + Tailwind CSS v3
- **Backend:** TBD (Rust vs Golang)
- **Blockchain:** SUI Move
- **Database:** TBD (PostgreSQL vs MongoDB)
- **Deployment:** TBD (AWS/Vercel/Railway)

### Priority Order
1. Smart Contract Development (Core)
2. Creator Dashboard (High)
3. Investor Feed & Trading (High)
4. Backend API & Indexer (High)
5. KYC System (Medium)
6. Market Making Bot (Low)

### Risk Items
- [ ] SUI blockchain limitations research needed
- [ ] Legal compliance for tokenization platform
- [ ] Scalability of on-chain debt tracking
- [ ] Security of automated buyback mechanism
