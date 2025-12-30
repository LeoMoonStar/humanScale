/// Buyback Vault Module
///
/// Manages the buyback schedule and enforces creator obligations.
/// This is the core mechanism that ensures creators fulfill their commitments.
///
/// Key Features:
/// - Scheduled buyback milestones with deadlines
/// - Automatic buyback execution if creator defaults
/// - On-chain debt tracking
/// - Collateral management for buyback enforcement
/// - Integration with AMM for automatic market purchases

module peoplecoin::buyback_vault {
    use sui::object::{Self, UID, ID};
    use sui::tx_context::{Self, TxContext};
    use sui::transfer;
    use sui::coin::{Self, Coin};
    use sui::balance::{Self, Balance};
    use sui::table::{Self, Table};
    use sui::clock::{Self, Clock};
    use sui::event;
    use std::vector;

    /// Errors
    const ENotCreator: u64 = 0;
    const EInsufficientCollateral: u64 = 1;
    const EMilestoneNotReached: u64 = 2;
    const EInvalidBuybackAmount: u64 = 3;
    const EDebtExists: u64 = 4;
    const EMilestoneAlreadyCompleted: u64 = 5;
    const EInvalidSchedule: u64 = 6;

    /// Buyback milestone structure
    struct BuybackMilestone has store, copy, drop {
        milestone_number: u64,
        deadline_timestamp: u64,  // Unix timestamp
        required_burn_amount: u64,  // Tokens to burn
        completed: bool,
        completed_at: u64,
        actual_burn_amount: u64,
    }

    /// Debt record when creator defaults
    struct DebtRecord has store, copy, drop {
        milestone_number: u64,
        debt_amount_sui: u64,  // SUI spent to cover the buyback
        tokens_bought: u64,
        created_at: u64,
    }

    /// Main buyback vault shared object
    struct BuybackVault<phantom T> has key {
        id: UID,
        creator: address,
        token_registry_id: ID,

        // Buyback schedule
        milestones: vector<BuybackMilestone>,
        current_milestone: u64,

        // Collateral and funds
        collateral: Balance<sui::sui::SUI>,  // SUI locked as collateral
        emergency_fund: Balance<sui::sui::SUI>,  // Additional emergency funds

        // Debt tracking
        total_debt: u64,
        debt_records: vector<DebtRecord>,

        // Configuration
        total_buyback_duration_ms: u64,  // Duration in milliseconds
        total_required_burns: u64,  // Total tokens that must be burned

        // Status
        is_defaulted: bool,
        created_at: u64,
    }

    /// Capability to manage vault (held by creator)
    struct VaultManagerCap has key, store {
        id: UID,
        vault_id: ID,
    }

    /// Events
    struct MilestoneCompleted has copy, drop {
        vault_id: ID,
        milestone_number: u64,
        burn_amount: u64,
        timestamp: u64,
    }

    struct DefaultTriggered has copy, drop {
        vault_id: ID,
        milestone_number: u64,
        debt_amount: u64,
        timestamp: u64,
    }

    struct CollateralDeposited has copy, drop {
        vault_id: ID,
        amount: u64,
        timestamp: u64,
    }

    /// Initialize buyback vault for a creator token
    ///
    /// The schedule is divided evenly across the duration
    /// For example: 5 years, 20 milestones = buyback every 3 months
    public entry fun create_vault<T>(
        token_registry_id: ID,
        collateral: Coin<sui::sui::SUI>,
        duration_years: u8,
        num_milestones: u64,
        total_required_burns: u64,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        assert!(num_milestones > 0 && num_milestones <= 120, EInvalidSchedule);  // Max 10 years monthly

        let creator = tx_context::sender(ctx);
        let current_time = clock::timestamp_ms(clock);
        let total_duration_ms = (duration_years as u64) * 365 * 24 * 60 * 60 * 1000;  // Years to milliseconds
        let interval_ms = total_duration_ms / num_milestones;

        // Create milestone schedule
        let milestones = vector::empty<BuybackMilestone>();
        let burn_per_milestone = total_required_burns / num_milestones;

        let i = 0;
        while (i < num_milestones) {
            let milestone = BuybackMilestone {
                milestone_number: i + 1,
                deadline_timestamp: current_time + ((i + 1) * interval_ms),
                required_burn_amount: burn_per_milestone,
                completed: false,
                completed_at: 0,
                actual_burn_amount: 0,
            };
            vector::push_back(&mut milestones, milestone);
            i = i + 1;
        };

        // Create vault
        let vault = BuybackVault<T> {
            id: object::new(ctx),
            creator,
            token_registry_id,
            milestones,
            current_milestone: 0,
            collateral: coin::into_balance(collateral),
            emergency_fund: balance::zero(),
            total_debt: 0,
            debt_records: vector::empty(),
            total_buyback_duration_ms: total_duration_ms,
            total_required_burns,
            is_defaulted: false,
            created_at: current_time,
        };

        // Create manager capability
        let vault_id = object::id(&vault);
        let manager_cap = VaultManagerCap {
            id: object::new(ctx),
            vault_id,
        };

        // Emit event
        event::emit(CollateralDeposited {
            vault_id,
            amount: balance::value(&vault.collateral),
            timestamp: current_time,
        });

        // Share vault and transfer capability
        transfer::share_object(vault);
        transfer::transfer(manager_cap, creator);
    }

    /// Creator executes buyback by burning tokens
    public entry fun execute_buyback<T>(
        vault: &mut BuybackVault<T>,
        _manager_cap: &VaultManagerCap,
        tokens_to_burn: Coin<T>,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        assert!(tx_context::sender(ctx) == vault.creator, ENotCreator);

        let current_time = clock::timestamp_ms(clock);
        let burn_amount = coin::value(&tokens_to_burn);

        // Find current active milestone
        let milestone_idx = vault.current_milestone;
        assert!(milestone_idx < vector::length(&vault.milestones), EMilestoneNotReached);

        let milestone = vector::borrow_mut(&mut vault.milestones, milestone_idx);
        assert!(!milestone.completed, EMilestoneAlreadyCompleted);
        assert!(burn_amount >= milestone.required_burn_amount, EInvalidBuybackAmount);

        // Mark milestone as completed
        milestone.completed = true;
        milestone.completed_at = current_time;
        milestone.actual_burn_amount = burn_amount;

        // Move to next milestone
        vault.current_milestone = vault.current_milestone + 1;

        // Emit event
        event::emit(MilestoneCompleted {
            vault_id: object::id(vault),
            milestone_number: milestone.milestone_number,
            burn_amount,
            timestamp: current_time,
        });

        // Tokens will be burned by the treasury cap holder (creator)
        // Transfer tokens to creator for burning
        transfer::public_transfer(tokens_to_burn, vault.creator);
    }

    /// Add collateral to vault (increases security for investors)
    public entry fun add_collateral<T>(
        vault: &mut BuybackVault<T>,
        additional_collateral: Coin<sui::sui::SUI>,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        assert!(tx_context::sender(ctx) == vault.creator, ENotCreator);

        let amount = coin::value(&additional_collateral);
        balance::join(&mut vault.collateral, coin::into_balance(additional_collateral));

        event::emit(CollateralDeposited {
            vault_id: object::id(vault),
            amount,
            timestamp: clock::timestamp_ms(clock),
        });
    }

    /// Check if creator has defaulted on current milestone
    /// This function can be called by anyone to trigger automatic enforcement
    /// Integrates with AMM for automatic buyback and insurance pool for deficit coverage
    public entry fun check_and_enforce_default<T>(
        vault: &mut BuybackVault<T>,
        amm_pool: &mut crate::amm::LiquidityPool<T>,
        insurance_pool: &mut crate::insurance::InsurancePool,
        treasury_cap: &mut coin::TreasuryCap<T>,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let current_time = clock::timestamp_ms(clock);
        let milestone_idx = vault.current_milestone;

        if (milestone_idx >= vector::length(&vault.milestones)) {
            return  // All milestones completed
        };

        let milestone = vector::borrow_mut(&mut vault.milestones, milestone_idx);

        // Check if deadline passed and milestone not completed
        if (current_time > milestone.deadline_timestamp && !milestone.completed) {
            vault.is_defaulted = true;

            let required_burn = milestone.required_burn_amount;

            // Step 1: Calculate SUI needed to buy required tokens from AMM
            let sui_needed = crate::amm::quote_token_to_sui(amm_pool, required_burn);

            let collateral_available = balance::value(&vault.collateral);

            if (collateral_available >= sui_needed) {
                // Step 2a: Use collateral to buy tokens from AMM
                let collateral_coin = coin::from_balance(
                    balance::split(&mut vault.collateral, sui_needed),
                    ctx
                );

                let tokens_bought = crate::amm::swap_sui_for_token(
                    amm_pool,
                    collateral_coin,
                    required_burn,
                    insurance_pool,
                    ctx
                );

                // Step 3a: Burn the tokens
                coin::burn(treasury_cap, tokens_bought);

                // Mark milestone as completed (forced)
                milestone.completed = true;
                milestone.completed_at = current_time;
                milestone.actual_burn_amount = required_burn;
                vault.current_milestone = vault.current_milestone + 1;

                // Record debt (even though buyback succeeded, creator still defaulted)
                let debt_record = DebtRecord {
                    milestone_number: milestone.milestone_number,
                    debt_amount_sui: sui_needed,
                    tokens_bought: required_burn,
                    created_at: current_time,
                };
                vector::push_back(&mut vault.debt_records, debt_record);
                vault.total_debt = vault.total_debt + sui_needed;

            } else {
                // Step 2b: Insufficient collateral - use all available collateral
                let available_collateral = balance::withdraw_all(&mut vault.collateral);
                let collateral_coin = coin::from_balance(available_collateral, ctx);
                let collateral_value = coin::value(&collateral_coin);

                // Buy as many tokens as possible
                let tokens_bought = crate::amm::swap_sui_for_token(
                    amm_pool,
                    collateral_coin,
                    0,  // min_token_out = 0 (emergency mode)
                    insurance_pool,
                    ctx
                );

                let tokens_bought_amount = coin::value(&tokens_bought);

                // Burn purchased tokens
                coin::burn(treasury_cap, tokens_bought);

                // Step 3b: Submit insurance claim for remaining amount
                let deficit_sui = sui_needed - collateral_value;

                let claim_id = crate::insurance::submit_claim(
                    insurance_pool,
                    object::id(vault),
                    vault.creator,
                    deficit_sui,
                    milestone.milestone_number,
                    ctx
                );

                // Record debt with insurance claim
                let debt_record = DebtRecord {
                    milestone_number: milestone.milestone_number,
                    debt_amount_sui: sui_needed,
                    tokens_bought: tokens_bought_amount,
                    created_at: current_time,
                };
                vector::push_back(&mut vault.debt_records, debt_record);
                vault.total_debt = vault.total_debt + sui_needed;

                // Milestone partially completed
                milestone.completed = false;  // Still not fully completed
                milestone.actual_burn_amount = tokens_bought_amount;
            };

            event::emit(DefaultTriggered {
                vault_id: object::id(vault),
                milestone_number: milestone.milestone_number,
                debt_amount: sui_needed,
                timestamp: current_time,
            });
        }
    }

    /// View function: Get vault status
    public fun get_vault_status<T>(vault: &BuybackVault<T>): (
        address,  // creator
        u64,      // current_milestone
        u64,      // total_milestones
        u64,      // total_debt
        bool,     // is_defaulted
        u64,      // collateral_amount
    ) {
        (
            vault.creator,
            vault.current_milestone,
            vector::length(&vault.milestones),
            vault.total_debt,
            vault.is_defaulted,
            balance::value(&vault.collateral),
        )
    }

    /// View function: Get specific milestone details
    public fun get_milestone<T>(
        vault: &BuybackVault<T>,
        milestone_number: u64
    ): (u64, u64, bool) {
        let milestone = vector::borrow(&vault.milestones, milestone_number);
        (
            milestone.deadline_timestamp,
            milestone.required_burn_amount,
            milestone.completed
        )
    }

    /// View function: Get all debt records
    public fun get_debt_records<T>(vault: &BuybackVault<T>): &vector<DebtRecord> {
        &vault.debt_records
    }
}
