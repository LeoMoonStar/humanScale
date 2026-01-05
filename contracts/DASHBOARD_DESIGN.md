# Creator Dashboard UI/UX Design

## Overview
Comprehensive dashboard for creators to manage their token treasury, monitor debt status, and execute sales with automatic debt repayment.

---

## Main Dashboard View

```
┌─────────────────────────────────────────────────────────────────────────┐
│  🎨 MyToken Creator Dashboard                              [@creator123] │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  📊 Token Holdings                                                        │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  Total Allocation: 3,000,000 MYTOKEN (30% of supply)            │    │
│  │                                                                   │    │
│  │  Vesting Progress:                                               │    │
│  │  ▓▓▓▓▓▓▓▓░░░░░░░░░░░░░░ 40% (Month 12/30)                      │    │
│  │                                                                   │    │
│  │  Available to Sell:    1,200,000 MYTOKEN                        │    │
│  │  Still Vesting:        1,800,000 MYTOKEN                        │    │
│  │  Already Sold:           500,000 MYTOKEN                        │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                           │
│  ⚠️  Debt Status                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  Outstanding Debt: 15,000 SUI                                    │    │
│  │  Interest Accrued:  1,250 SUI (30 days overdue)                 │    │
│  │  Total Owed:       16,250 SUI                                    │    │
│  │                                                                   │    │
│  │  Interest Rate: 10% APR (while in debt)                         │    │
│  │  Days in Debt: 30 days                                           │    │
│  │                                                                   │    │
│  │  ⏰ Next Buyback Deadline: Jun 15, 2024 (5 days)                │    │
│  │  Required: Buy & burn 1,000 MYTOKEN (~1,050 SUI)                │    │
│  │                                                                   │    │
│  │  💡 Tip: Sell tokens now to pay debt and avoid more interest!   │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                           │
│  💰 Sale Calculator                                                       │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  Amount to Sell: [________100,000______] MYTOKEN                │    │
│  │                  (Max: 1,200,000)                                │    │
│  │                                                                   │    │
│  │  Estimated Proceeds:                                             │    │
│  │  ├─ Market Value:        ~100,000 SUI                           │    │
│  │  ├─ To Debt + Interest:   16,250 SUI ⚠️                         │    │
│  │  └─ You Receive:          83,750 SUI ✅                          │    │
│  │                                                                   │    │
│  │  After This Sale:                                                │    │
│  │  ├─ Remaining Debt:            0 SUI ✅                          │    │
│  │  └─ Available to Sell:   1,100,000 MYTOKEN                      │    │
│  │                                                                   │    │
│  │  [Calculate] [Sell Tokens] buttons                              │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                           │
│  📈 Performance Metrics                                                   │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  Lifetime Sales:        500,000 MYTOKEN → 480,000 SUI           │    │
│  │  ├─ To Debt Repayment:  120,000 SUI (25%)                       │    │
│  │  └─ To Your Wallet:     360,000 SUI (75%)                       │    │
│  │                                                                   │    │
│  │  Buyback Compliance:                                             │    │
│  │  ├─ Completed:  8/10 milestones ✅                               │    │
│  │  ├─ Defaulted:  2/10 milestones ⚠️                               │    │
│  │  └─ Compliance Rate: 80%                                         │    │
│  └─────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Tabs Navigation

### Tab 1: Overview (Main Dashboard - shown above)

### Tab 2: Sales History

```
┌─────────────────────────────────────────────────────────────────────────┐
│  📜 Sales History                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  Date         │ Sold (MYTOKEN) │ Total SUI │ To Debt │ To You │ Debt After│
│  ────────────────────────────────────────────────────────────────────────│
│  Jun 10, 2024 │   100,000      │  100,000  │ 16,250  │ 83,750 │      0    │
│  May 15, 2024 │    80,000      │   78,000  │  5,200  │ 72,800 │ 15,000    │
│  Apr 20, 2024 │   120,000      │  118,000  │      0  │118,000 │      0    │
│  Mar 10, 2024 │   200,000      │  195,000  │      0  │195,000 │      0    │
│               │                │           │         │        │           │
│  Total        │   500,000      │  491,000  │ 21,450  │469,550 │           │
│                                                                           │
│  [Export CSV] [Filter] [Search]                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Tab 3: Buyback Schedule

```
┌─────────────────────────────────────────────────────────────────────────┐
│  📅 Buyback Schedule (20 milestones over 5 years)                        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  Milestone │ Deadline    │ Required │ Status    │ Actual │ Cost  │ Debt │
│  ──────────────────────────────────────────────────────────────────────  │
│     1      │ Jan 15 2024 │  1,000   │ ✅ Done   │ 1,000  │ 1,050 │   0  │
│     2      │ Apr 15 2024 │  1,000   │ ✅ Done   │ 1,000  │ 1,048 │   0  │
│     3      │ Jul 15 2024 │  1,000   │ ⚠️  Auto  │   950  │ 1,000 │1,050 │
│     4      │ Oct 15 2024 │  1,000   │ 🔄 Next   │   -    │   -   │   -  │
│     5      │ Jan 15 2025 │  1,000   │ ⏳ Pending│   -    │   -   │   -  │
│    ...     │     ...     │   ...    │    ...    │  ...   │  ...  │ ...  │
│    20      │ Oct 15 2028 │  1,000   │ ⏳ Pending│   -    │   -   │   -  │
│                                                                           │
│  Legend:                                                                  │
│  ✅ Done - Completed on time                                              │
│  ⚠️  Auto - Defaulted, auto-enforced by vault                            │
│  🔄 Next - Upcoming deadline                                              │
│  ⏳ Pending - Future milestone                                            │
└─────────────────────────────────────────────────────────────────────────┘
```

### Tab 4: Debt Details

```
┌─────────────────────────────────────────────────────────────────────────┐
│  💳 Debt Details & Repayment History                                     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  Current Debt Breakdown:                                                 │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  Principal (from defaults):     15,000 SUI                       │    │
│  │  Accrued Interest (30 days):     1,250 SUI                       │    │
│  │  ─────────────────────────────────────                           │    │
│  │  Total Debt:                    16,250 SUI                       │    │
│  │                                                                   │    │
│  │  Interest Rate: 10% APR                                          │    │
│  │  Daily Interest: ~4.11 SUI/day                                   │    │
│  │                                                                   │    │
│  │  If paid today:    16,250 SUI                                    │    │
│  │  If paid in 7d:    16,279 SUI (+29 SUI)                         │    │
│  │  If paid in 30d:   16,373 SUI (+123 SUI)                        │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                           │
│  Debt History:                                                            │
│  Date         │ Event              │ Amount  │ Interest │ Total    │     │
│  ────────────────────────────────────────────────────────────────────    │
│  May 10, 2024 │ Default (M3)       │+15,000  │     0    │ 15,000   │     │
│  May 15, 2024 │ Interest accrued   │     0   │  +205    │ 15,205   │     │
│  May 20, 2024 │ Sale repayment     │ -5,205  │     0    │ 10,000   │     │
│  May 25, 2024 │ Interest accrued   │     0   │  +137    │ 10,137   │     │
│  Jun 10, 2024 │ Default (M4)       │+15,000  │     0    │ 25,137   │     │
│  Jun 12, 2024 │ Sale repayment     │-25,137  │     0    │      0   │     │
│                                                                           │
│  [Download Report]                                                        │
└─────────────────────────────────────────────────────────────────────────┘
```

### Tab 5: Platform Vault Status

```
┌─────────────────────────────────────────────────────────────────────────┐
│  🏦 Platform Vault Relationship                                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  Your Vault Status:                                                      │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  Your Collateral:         100,000 SUI                            │    │
│  │  Borrowed from Platform:   15,000 SUI                            │    │
│  │  Platform Interest Rate:    5% APR                               │    │
│  │  Days Borrowed:                30 days                           │    │
│  │  Interest Owed to Platform: 61.64 SUI                            │    │
│  │                                                                   │    │
│  │  Total Owed to Platform:   15,061.64 SUI                         │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                           │
│  Platform Vault Info:                                                    │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  Total Capacity:      100,000,000 SUI                            │    │
│  │  Currently Lent:       15,234,567 SUI (15.2%)                    │    │
│  │  Available:            84,765,433 SUI (84.8%)                    │    │
│  │                                                                   │    │
│  │  Your Utilization:           15,000 SUI (0.015%)                 │    │
│  │  Your Credit Limit:         500,000 SUI                          │    │
│  │  Available Credit:          485,000 SUI                          │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                           │
│  Loan History:                                                            │
│  Date         │ Event      │ Amount    │ Interest │ Total Borrowed │     │
│  ────────────────────────────────────────────────────────────────────    │
│  May 10, 2024 │ Borrow     │ +15,000   │    0     │     15,000     │     │
│  Jun 12, 2024 │ Repayment  │ -15,062   │  -62     │          0     │     │
│                                                                           │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Mobile Responsive View

```
┌──────────────────────────┐
│  🎨 MyToken              │
│  [@creator123]           │
├──────────────────────────┤
│                          │
│  💼 Holdings             │
│  1.2M / 3M available     │
│  ▓▓▓▓░░░░ 40%           │
│                          │
│  ⚠️  Debt: 16,250 SUI   │
│  Interest: 1,250 SUI     │
│  📅 Next: 5 days         │
│                          │
│  💰 Quick Sell           │
│  ┌────────────────────┐  │
│  │ Amount: [100,000] │  │
│  │ You Get: 83,750   │  │
│  │                    │  │
│  │  [Sell Now]       │  │
│  └────────────────────┘  │
│                          │
│  [History] [Schedule]    │
│  [Debt] [Platform]       │
│                          │
└──────────────────────────┘
```

---

## Key Features

### 1. Real-time Updates
- WebSocket connection for live price updates
- Auto-refresh debt interest calculations
- Live countdown to next deadline

### 2. Alerts & Notifications
- 🔔 Upcoming deadline warnings (7 days, 3 days, 1 day)
- ⚠️  High debt-to-collateral ratio alerts
- ✅ Successful sale confirmations
- 📧 Email/SMS notifications for critical events

### 3. Educational Tooltips
- Hover over metrics for explanations
- "What is this?" links for complex concepts
- Calculator tooltips showing formulas

### 4. Export & Reporting
- CSV export for all tables
- PDF reports for tax purposes
- API access for third-party analytics

### 5. Accessibility
- WCAG 2.1 AA compliant
- Keyboard navigation
- Screen reader optimized
- High contrast mode

---

## Color Coding

| Status | Color | Usage |
|--------|-------|-------|
| ✅ Success | Green | Completed milestones, positive balances |
| ⚠️  Warning | Yellow | Upcoming deadlines, moderate debt |
| ❌ Error | Red | Defaults, high debt, overdue |
| 🔄 Active | Blue | Current operations, next milestone |
| ⏳ Pending | Gray | Future events, disabled actions |

---

## Implementation Notes

### Frontend Stack
- React/Next.js for UI
- TanStack Query for data fetching
- Recharts for visualizations
- Tailwind CSS for styling
- Sui wallet integration

### API Endpoints Needed
```
GET  /api/creator/:address/status
GET  /api/creator/:address/sales-history
GET  /api/creator/:address/debt-details
GET  /api/creator/:address/buyback-schedule
POST /api/creator/:address/estimate-sale
POST /api/creator/:address/execute-sale
GET  /api/platform-vault/status
```

### Real-time Updates
```javascript
// WebSocket subscription
ws.subscribe(`creator.${address}.debt`, (data) => {
  updateDebtDisplay(data.total, data.interest);
});

ws.subscribe(`creator.${address}.price`, (data) => {
  recalculateSaleEstimate(data.price);
});
```

---

## User Flows

### Flow 1: First-time Creator
1. Lands on dashboard → Sees tutorial overlay
2. Walks through vesting explanation
3. Tries sale calculator with demo values
4. Understands debt mechanism before first sale

### Flow 2: Creator in Debt
1. Sees big red warning banner
2. Calculator automatically shows debt deduction
3. Clear CTA: "Sell to clear debt"
4. Success message after debt cleared

### Flow 3: Creator Approaching Deadline
1. Email notification 7 days before
2. Dashboard shows countdown timer
3. Estimate required sale amount
4. One-click option to sell exact amount needed

---

## TODO Items

### Phase 1: Core Dashboard ⏸️ DEFERRED
- [ ] TODO: Implement basic token holdings display
- [ ] TODO: Add vesting progress visualization
- [ ] TODO: Create sale calculator component
- [ ] TODO: Integrate wallet connection
- [ ] TODO: Add debt status display with real-time interest
- [ ] TODO: Show punishment interest rate (10% APR while in debt)
- [ ] TODO: Display days in debt counter

### Phase 2: Sales & Debt ⏸️ DEFERRED
- [ ] TODO: Implement sale execution flow with auto debt deduction
- [ ] TODO: Add debt repayment tracking with interest breakdown
- [ ] TODO: Create time-based interest calculation engine (daily compounding)
- [ ] TODO: Build sales history table with debt repayment column
- [ ] TODO: Add export functionality for tax reporting
- [ ] TODO: Show "interest saved" when debt is paid quickly
- [ ] TODO: Warning alerts when interest is accumulating rapidly

### Phase 3: Advanced Features ⏸️ DEFERRED
- [ ] TODO: Buyback schedule timeline with completion status
- [ ] TODO: Platform vault integration UI (borrow status, credit limit)
- [ ] TODO: Real-time price updates via WebSocket
- [ ] TODO: Notification system (email/SMS for deadlines)
- [ ] TODO: Mobile responsive design
- [ ] TODO: Platform vault health indicator (capacity, utilization)
- [ ] TODO: Credit score visualization based on compliance

### Phase 4: Analytics ⏸️ DEFERRED
- [ ] TODO: Performance metrics dashboard
- [ ] TODO: Compliance scoring algorithm
- [ ] TODO: Predictive analytics (debt projection, interest forecast)
- [ ] TODO: ROI calculations for investors
- [ ] TODO: Tax reporting tools with interest deductions
- [ ] TODO: Debt aging analysis (how long in debt)
- [ ] TODO: Platform vault loan history

### Phase 5: Smart Contract Integration 🚧 IN PROGRESS
- [x] DONE: Basic BuybackVault module
- [x] DONE: CreatorTreasury module
- [x] DONE: Insurance pool integration
- [ ] TODO: PlatformVault module (centralized borrowing)
- [ ] TODO: Interest rate calculation in debt tracking
- [ ] TODO: Auto debt deduction from creator sales
- [ ] TODO: Platform vault credit limit per creator
- [ ] TODO: Debt repayment priority system

---

## Metrics to Track

### User Engagement
- Daily active creators
- Average time on dashboard
- Sale execution rate
- Debt clearance time

### Business Metrics
- Total debt repaid through sales
- Average debt duration
- Platform vault utilization
- Creator compliance rate

---

**Last Updated**: January 2026
**Version**: 1.0
**Owner**: Product Team
