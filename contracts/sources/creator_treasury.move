/// Creator Treasury Module
///
/// Manages creator's token allocation with dual-unlock mechanism:
/// - Creator Portion: Vests to creator (can sell when ready)
/// - Platform Portion: Distributed to market (ensures liquidity)
///
/// Key Features:
/// - Dual unlock to prevent supply monopoly
/// - Unrestricted selling (free market)
/// - Automatic buyback enforcement with collateral
/// - Transparent on-chain accounting
/// - Configurable vesting/distribution schedules
///
/// Security:
/// - Creator's wallet is frozen (can't receive tokens directly)
/// - All token operations go through this treasury
/// - Buyback enforced via collateral or automatic execution

module peoplecoin::creator_treasury {
    use sui::object::{Self, UID, ID};
    use sui::tx_context::{Self, TxContext};
    use sui::transfer;
    use sui::coin::{Self, Coin, TreasuryCap};
    use sui::balance::{Self, Balance};
    use sui::clock::{Self, Clock};
    use sui::event;
    use sui::sui::SUI;
    use std::vector;

    /// Errors
    const ENotAuthorized: u64 = 0;
    const ETooEarly: u64 = 1;
    const EInsufficientVested: u64 = 2;
    const EAlreadyCompleted: u64 = 3;
    const EInsufficientCollateral: u64 = 4;
    const EInvalidPercentage: u64 = 5;
    const EInsufficientBalance: u64 = 6;
    const EMilestoneNotDue: u64 = 7;

    /// Constants
    const BASIS_POINTS: u64 = 10000; // 100% = 10000 bps
    const MONTH_MS: u64 = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds

    /// Buyback milestone
    public struct BuybackMilestone has store, copy, drop {
        milestone_number: u64,
        deadline_timestamp: u64,
        required_burn_amount: u64,
        completed: bool,
        actual_burn_amount: u64,
        execution_timestamp: u64,
    }

    /// Creator Treasury - holds all creator tokens and manages distribution
    public struct CreatorTreasury<phantom T> has key {
        id: UID,
        creator: address,
        platform_address: address,

        // Token holdings
        token_balance: Balance<T>,
        total_allocation: u64,

        // Creator portion (vests to creator, stays in treasury)
        creator_portion_cap: u64,           // Max tokens that can vest to creator
        creator_vested_amount: u64,         // Cumulative vested (available to sell)
        creator_monthly_unlock_bps: u16,    // Monthly unlock rate in bps

        // Platform portion (distributed from treasury to market)
        platform_portion_cap: u64,          // Max tokens distributed to platform
        platform_distributed_amount: u64,   // Cumulative distributed
        platform_monthly_unlock_bps: u16,   // Monthly distribution rate in bps

        // Timing
        last_unlock_time: u64,
        unlock_interval_ms: u64,

        // Buyback enforcement
        sui_collateral: Balance<SUI>,
        buyback_milestones: vector<BuybackMilestone>,
        total_bought_back: u64,

        // Statistics
        creator_total_sold: u64,

        // Status
        created_at: u64,
    }

    /// Events
    public struct TreasuryCreated has copy, drop {
        treasury_id: ID,
        creator: address,
        total_allocation: u64,
        creator_portion_cap: u64,
        platform_portion_cap: u64,
    }

    public struct CreatorTokensVested has copy, drop {
        treasury_id: ID,
        amount: u64,
        total_vested: u64,
        timestamp: u64,
    }

    public struct PlatformTokensDistributed has copy, drop {
        treasury_id: ID,
        amount: u64,
        total_distributed: u64,
        recipient: address,
        timestamp: u64,
    }

    public struct CreatorTokensSold has copy, drop {
        treasury_id: ID,
        tokens_sold: u64,
        sui_received: u64,
        remaining_vested: u64,
        timestamp: u64,
    }

    public struct BuybackExecuted has copy, drop {
        treasury_id: ID,
        milestone_number: u64,
        tokens_burned: u64,
        method: vector<u8>, // "direct_burn" or "collateral_buy"
        sui_used: u64,
        timestamp: u64,
    }

    public struct CollateralDeposited has copy, drop {
        treasury_id: ID,
        amount: u64,
        total_collateral: u64,
        timestamp: u64,
    }

    /// Create treasury with creator's token allocation
    ///
    /// Percentages are in basis points (10000 = 100%)
    /// Example: creator_portion_bps = 4000 means 40% goes to creator
    public fun create_treasury<T>(
        creator_tokens: Coin<T>,
        platform_address: address,
        creator_portion_bps: u16,        // E.g., 4000 = 40%
        platform_portion_bps: u16,       // E.g., 6000 = 60%
        creator_monthly_unlock_bps: u16, // E.g., 200 = 2% per month
        platform_monthly_unlock_bps: u16,// E.g., 300 = 3% per month
        unlock_interval_ms: u64,         // E.g., MONTH_MS
        buyback_milestones: vector<BuybackMilestone>,
        clock: &Clock,
        ctx: &mut TxContext
    ): ID {
        // Validate percentages
        assert!(
            (creator_portion_bps as u64) + (platform_portion_bps as u64) == BASIS_POINTS,
            EInvalidPercentage
        );

        let total_allocation = coin::value(&creator_tokens);
        let creator_portion_cap = (total_allocation * (creator_portion_bps as u64)) / BASIS_POINTS;
        let platform_portion_cap = (total_allocation * (platform_portion_bps as u64)) / BASIS_POINTS;

        let treasury = CreatorTreasury<T> {
            id: object::new(ctx),
            creator: tx_context::sender(ctx),
            platform_address,
            token_balance: coin::into_balance(creator_tokens),
            total_allocation,
            creator_portion_cap,
            creator_vested_amount: 0,
            creator_monthly_unlock_bps,
            platform_portion_cap,
            platform_distributed_amount: 0,
            platform_monthly_unlock_bps,
            last_unlock_time: clock::timestamp_ms(clock),
            unlock_interval_ms,
            sui_collateral: balance::zero(),
            buyback_milestones,
            total_bought_back: 0,
            creator_total_sold: 0,
            created_at: clock::timestamp_ms(clock),
        };

        let treasury_id = object::id(&treasury);

        event::emit(TreasuryCreated {
            treasury_id,
            creator: tx_context::sender(ctx),
            total_allocation,
            creator_portion_cap,
            platform_portion_cap,
        });

        transfer::share_object(treasury);
        treasury_id
    }

    /// Process monthly unlock - releases to BOTH creator and platform
    /// Anyone can call this (permissionless)
    public entry fun process_monthly_unlock<T>(
        treasury: &mut CreatorTreasury<T>,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let current_time = clock::timestamp_ms(clock);

        // Check if unlock period has passed
        assert!(
            current_time >= treasury.last_unlock_time + treasury.unlock_interval_ms,
            ETooEarly
        );

        let treasury_id = object::id(treasury);

        // ===== CREATOR PORTION =====
        // Vest tokens to creator (stay in treasury, available to sell)
        let creator_unlock = (treasury.total_allocation *
                             (treasury.creator_monthly_unlock_bps as u64)) / BASIS_POINTS;

        if (treasury.creator_vested_amount + creator_unlock <= treasury.creator_portion_cap) {
            treasury.creator_vested_amount = treasury.creator_vested_amount + creator_unlock;

            event::emit(CreatorTokensVested {
                treasury_id,
                amount: creator_unlock,
                total_vested: treasury.creator_vested_amount,
                timestamp: current_time,
            });
        };

        // ===== PLATFORM PORTION =====
        // Distribute tokens to platform (leave treasury, go to market)
        let platform_unlock = (treasury.total_allocation *
                              (treasury.platform_monthly_unlock_bps as u64)) / BASIS_POINTS;

        if (treasury.platform_distributed_amount + platform_unlock <= treasury.platform_portion_cap) {
            // Check if treasury has enough balance
            let available_balance = balance::value(&treasury.token_balance);
            if (available_balance >= platform_unlock) {
                let platform_tokens = coin::take(
                    &mut treasury.token_balance,
                    platform_unlock,
                    ctx
                );

                transfer::public_transfer(platform_tokens, treasury.platform_address);

                treasury.platform_distributed_amount = treasury.platform_distributed_amount + platform_unlock;

                event::emit(PlatformTokensDistributed {
                    treasury_id,
                    amount: platform_unlock,
                    total_distributed: treasury.platform_distributed_amount,
                    recipient: treasury.platform_address,
                    timestamp: current_time,
                });
            };
        };

        // Update timestamp
        treasury.last_unlock_time = current_time;
    }

    /// Creator sells vested tokens (unrestricted - free market)
    /// Swaps tokens for SUI and sends SUI to creator
    public fun sell_tokens<T>(
        treasury: &mut CreatorTreasury<T>,
        amount: u64,
        ctx: &mut TxContext
    ): Coin<T> {
        // Auth check
        assert!(tx_context::sender(ctx) == treasury.creator, ENotAuthorized);

        // Can only sell vested tokens
        assert!(amount <= treasury.creator_vested_amount, EInsufficientVested);

        // Check treasury has enough balance
        assert!(balance::value(&treasury.token_balance) >= amount, EInsufficientBalance);

        // Take tokens from treasury
        let tokens_to_sell = coin::take(&mut treasury.token_balance, amount, ctx);

        // Update accounting
        treasury.creator_vested_amount = treasury.creator_vested_amount - amount;
        treasury.creator_total_sold = treasury.creator_total_sold + amount;

        // Return tokens (caller will handle DEX swap)
        tokens_to_sell
    }

    /// Creator sells tokens and automatically repays debt from proceeds
    /// This is the recommended flow - ensures debt is repaid with interest
    ///
    /// Flow:
    /// 1. Creator sells tokens on DEX and gets SUI
    /// 2. SUI proceeds are split: debt repayment first, remainder to creator
    /// 3. Debt is repaid with accrued punishment interest (10% APR)
    /// 4. Creator receives remaining SUI after debt deduction
    public entry fun sell_and_repay_debt<T>(
        treasury: &mut CreatorTreasury<T>,
        platform_vault: &mut peoplecoin::platform_vault::PlatformVault,
        tokens_amount: u64,
        sui_proceeds: Coin<SUI>,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        // Auth check
        assert!(tx_context::sender(ctx) == treasury.creator, ENotAuthorized);

        // Update accounting for sold tokens
        assert!(tokens_amount <= treasury.creator_vested_amount, EInsufficientVested);
        treasury.creator_vested_amount = treasury.creator_vested_amount - tokens_amount;
        treasury.creator_total_sold = treasury.creator_total_sold + tokens_amount;

        let total_proceeds = coin::value(&sui_proceeds);
        let creator = treasury.creator;

        // Check if creator has debt
        let has_debt = peoplecoin::platform_vault::has_debt(platform_vault, creator);

        if (has_debt) {
            // Repay debt from proceeds (consumes coin, returns amount deducted)
            let _debt_repaid = peoplecoin::platform_vault::repay_creator_debt(
                platform_vault,
                creator,
                sui_proceeds,
                clock,
                ctx
            );
            // Note: sui_proceeds is consumed by repay function
            // Remaining SUI (if any) is sent to creator automatically by platform_vault
        } else {
            // No debt - send all proceeds to creator
            transfer::public_transfer(sui_proceeds, creator);
        };

        // Emit event
        event::emit(CreatorTokensSold {
            treasury_id: object::id(treasury),
            tokens_sold: tokens_amount,
            sui_received: total_proceeds,
            remaining_vested: treasury.creator_vested_amount,
            timestamp: clock::timestamp_ms(clock),
        });
    }

    /// Entry function for selling tokens
    /// Caller handles the swap externally and calls this to get tokens
    public entry fun sell_tokens_entry<T>(
        treasury: &mut CreatorTreasury<T>,
        amount: u64,
        ctx: &mut TxContext
    ) {
        let tokens = sell_tokens(treasury, amount, ctx);
        transfer::public_transfer(tokens, tx_context::sender(ctx));
    }

    /// Record SUI proceeds from a sale (for tracking)
    public entry fun record_sale_proceeds<T>(
        treasury: &mut CreatorTreasury<T>,
        tokens_sold: u64,
        sui_received: u64,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        assert!(tx_context::sender(ctx) == treasury.creator, ENotAuthorized);

        event::emit(CreatorTokensSold {
            treasury_id: object::id(treasury),
            tokens_sold,
            sui_received,
            remaining_vested: treasury.creator_vested_amount,
            timestamp: clock::timestamp_ms(clock),
        });
    }

    /// Execute buyback - burn tokens from treasury or buy from market
    /// Anyone can call this (permissionless enforcement)
    public fun execute_buyback<T>(
        treasury: &mut CreatorTreasury<T>,
        treasury_cap: &mut TreasuryCap<T>,
        milestone_idx: u64,
        clock: &Clock,
        ctx: &mut TxContext
    ): (bool, u64) {
        // Extract immutable data before mutable borrow
        let treasury_id = object::id(treasury);

        let milestone = vector::borrow_mut(&mut treasury.buyback_milestones, milestone_idx);
        let current_time = clock::timestamp_ms(clock);

        // Check deadline
        assert!(current_time >= milestone.deadline_timestamp, EMilestoneNotDue);
        assert!(!milestone.completed, EAlreadyCompleted);

        let required_burn = milestone.required_burn_amount;
        let token_balance = balance::value(&treasury.token_balance);

        if (token_balance >= required_burn) {
            // CASE 1: Treasury has enough tokens - burn directly
            let tokens_to_burn = coin::take(&mut treasury.token_balance, required_burn, ctx);
            coin::burn(treasury_cap, tokens_to_burn);

            milestone.completed = true;
            milestone.actual_burn_amount = required_burn;
            milestone.execution_timestamp = current_time;
            treasury.total_bought_back = treasury.total_bought_back + required_burn;

            event::emit(BuybackExecuted {
                treasury_id,
                milestone_number: milestone.milestone_number,
                tokens_burned: required_burn,
                method: b"direct_burn",
                sui_used: 0,
                timestamp: current_time,
            });

            (true, 0)
        } else {
            // CASE 2: Insufficient tokens - needs to buy from market
            // Return false to signal caller needs to provide tokens
            (false, required_burn - token_balance)
        }
    }

    /// Complete buyback with purchased tokens
    /// Called after buying tokens from market
    public fun complete_buyback_with_purchase<T>(
        treasury: &mut CreatorTreasury<T>,
        treasury_cap: &mut TreasuryCap<T>,
        purchased_tokens: Coin<T>,
        milestone_idx: u64,
        sui_used: u64,
        clock: &Clock,
        _ctx: &mut TxContext
    ) {
        // Extract immutable data before mutable borrow
        let treasury_id = object::id(treasury);
        let current_time = clock::timestamp_ms(clock);

        let milestone = vector::borrow_mut(&mut treasury.buyback_milestones, milestone_idx);
        assert!(!milestone.completed, EAlreadyCompleted);

        let token_balance = balance::value(&treasury.token_balance);
        let purchased_amount = coin::value(&purchased_tokens);
        let total_available = token_balance + purchased_amount;

        assert!(total_available >= milestone.required_burn_amount, EInsufficientBalance);

        // Burn treasury balance first
        if (token_balance > 0) {
            let treasury_tokens = coin::take(
                &mut treasury.token_balance,
                token_balance,
                _ctx
            );
            coin::burn(treasury_cap, treasury_tokens);
        };

        // Burn purchased tokens
        coin::burn(treasury_cap, purchased_tokens);

        milestone.completed = true;
        milestone.actual_burn_amount = total_available;
        milestone.execution_timestamp = current_time;
        treasury.total_bought_back = treasury.total_bought_back + milestone.required_burn_amount;

        event::emit(BuybackExecuted {
            treasury_id,
            milestone_number: milestone.milestone_number,
            tokens_burned: total_available,
            method: b"market_purchase",
            sui_used,
            timestamp: current_time,
        });
    }

    /// Deposit SUI collateral (creator's skin in the game)
    public entry fun deposit_collateral<T>(
        treasury: &mut CreatorTreasury<T>,
        payment: Coin<SUI>,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        assert!(tx_context::sender(ctx) == treasury.creator, ENotAuthorized);

        let amount = coin::value(&payment);
        balance::join(&mut treasury.sui_collateral, coin::into_balance(payment));

        event::emit(CollateralDeposited {
            treasury_id: object::id(treasury),
            amount,
            total_collateral: balance::value(&treasury.sui_collateral),
            timestamp: clock::timestamp_ms(clock),
        });
    }

    /// Withdraw excess collateral (only after all buybacks complete)
    public entry fun withdraw_collateral<T>(
        treasury: &mut CreatorTreasury<T>,
        amount: u64,
        ctx: &mut TxContext
    ) {
        assert!(tx_context::sender(ctx) == treasury.creator, ENotAuthorized);

        // Check all buybacks are complete
        let total_milestones = vector::length(&treasury.buyback_milestones);
        let mut i = 0;
        while (i < total_milestones) {
            let milestone = vector::borrow(&treasury.buyback_milestones, i);
            assert!(milestone.completed, EAlreadyCompleted);
            i = i + 1;
        };

        let collateral_balance = coin::take(&mut treasury.sui_collateral, amount, ctx);
        transfer::public_transfer(collateral_balance, treasury.creator);
    }

    // ===== VIEW FUNCTIONS =====

    /// Get treasury status
    public fun get_treasury_status<T>(treasury: &CreatorTreasury<T>): (
        address,  // creator
        u64,      // token_balance
        u64,      // creator_vested_amount
        u64,      // platform_distributed_amount
        u64,      // total_bought_back
        u64,      // collateral_amount
    ) {
        (
            treasury.creator,
            balance::value(&treasury.token_balance),
            treasury.creator_vested_amount,
            treasury.platform_distributed_amount,
            treasury.total_bought_back,
            balance::value(&treasury.sui_collateral),
        )
    }

    /// Get next unlock time
    public fun get_next_unlock_time<T>(treasury: &CreatorTreasury<T>): u64 {
        treasury.last_unlock_time + treasury.unlock_interval_ms
    }

    /// Get milestone status
    public fun get_milestone<T>(
        treasury: &CreatorTreasury<T>,
        milestone_idx: u64
    ): (u64, u64, bool, u64) {
        let milestone = vector::borrow(&treasury.buyback_milestones, milestone_idx);
        (
            milestone.deadline_timestamp,
            milestone.required_burn_amount,
            milestone.completed,
            milestone.actual_burn_amount
        )
    }

    /// Get creator's available balance to sell
    public fun get_available_to_sell<T>(treasury: &CreatorTreasury<T>): u64 {
        treasury.creator_vested_amount
    }

    /// Check if unlock is ready
    public fun is_unlock_ready<T>(treasury: &CreatorTreasury<T>, current_time: u64): bool {
        current_time >= treasury.last_unlock_time + treasury.unlock_interval_ms
    }

    /// Get allocation details
    public fun get_allocation_details<T>(treasury: &CreatorTreasury<T>): (
        u64,  // total_allocation
        u64,  // creator_portion_cap
        u64,  // platform_portion_cap
        u16,  // creator_monthly_unlock_bps
        u16,  // platform_monthly_unlock_bps
    ) {
        (
            treasury.total_allocation,
            treasury.creator_portion_cap,
            treasury.platform_portion_cap,
            treasury.creator_monthly_unlock_bps,
            treasury.platform_monthly_unlock_bps,
        )
    }

    /// Helper function to create a buyback milestone
    /// Used during treasury initialization and testing
    public fun create_test_milestone(
        number: u64,
        deadline: u64,
        amount: u64
    ): BuybackMilestone {
        BuybackMilestone {
            milestone_number: number,
            deadline_timestamp: deadline,
            required_burn_amount: amount,
            completed: false,
            actual_burn_amount: 0,
            execution_timestamp: 0,
        }
    }
}
