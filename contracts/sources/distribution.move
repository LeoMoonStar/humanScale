/// Distribution Module
///
/// Handles Stage 2 of the token lifecycle: Keep Distributing
/// Automatically releases platform-held reserve tokens to the liquidity pool
/// at regular intervals to ensure continuous liquidity availability.
///
/// Key Features:
/// - Scheduled distribution of reserve tokens
/// - Configurable release intervals and amounts
/// - Integration with AMM liquidity pools
/// - Prevents manipulation by enforcing time-locks

module peoplecoin::distribution {
    use sui::object::{Self, UID, ID};
    use sui::tx_context::{Self, TxContext};
    use sui::transfer;
    use sui::coin::{Self, Coin};
    use sui::balance::{Self, Balance};
    use sui::clock::{Self, Clock};
    use sui::event;
    use std::vector;

    /// Errors
    const ENotAuthorized: u64 = 0;
    const EDistributionNotReady: u64 = 1;
    const EInsufficientReserve: u64 = 2;
    const EInvalidSchedule: u64 = 3;
    const EAllDistributed: u64 = 4;

    /// Distribution schedule milestone
    struct DistributionMilestone has store, copy, drop {
        milestone_number: u64,
        release_timestamp: u64,  // When tokens can be released
        release_amount: u64,  // Tokens to release
        released: bool,
        released_at: u64,
    }

    /// Distribution vault holding reserve tokens
    struct DistributionVault<phantom T> has key {
        id: UID,
        token_registry_id: ID,
        platform_address: address,  // Platform admin address

        // Reserve tokens
        reserve_balance: Balance<T>,
        original_reserve: u64,

        // Distribution schedule
        milestones: vector<DistributionMilestone>,
        current_milestone: u64,

        // Configuration
        total_distribution_period_ms: u64,  // E.g., 2 years
        release_interval_ms: u64,  // E.g., every 3 months
        total_milestones: u64,

        // Liquidity pool integration
        target_pool_id: ID,  // AMM pool to receive tokens

        // Status
        distribution_completed: bool,
        created_at: u64,
    }

    /// Capability to manage distributions
    struct DistributionAdminCap has key, store {
        id: UID,
        vault_id: ID,
    }

    /// Events
    struct TokensDistributed has copy, drop {
        vault_id: ID,
        milestone_number: u64,
        amount: u64,
        recipient: address,
        timestamp: u64,
    }

    struct DistributionCompleted has copy, drop {
        vault_id: ID,
        total_distributed: u64,
        timestamp: u64,
    }

    /// Create distribution vault with reserve tokens
    ///
    /// The vault will automatically release tokens at regular intervals
    /// to maintain liquidity in the market
    public entry fun create_distribution_vault<T>(
        token_registry_id: ID,
        reserve_tokens: Coin<T>,
        distribution_period_years: u8,  // E.g., 2 years
        release_interval_months: u8,  // E.g., every 3 months
        target_pool_id: ID,  // Liquidity pool to receive tokens
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        assert!(release_interval_months > 0 && release_interval_months <= 12, EInvalidSchedule);
        assert!(distribution_period_years > 0 && distribution_period_years <= 10, EInvalidSchedule);

        let platform_address = tx_context::sender(ctx);
        let current_time = clock::timestamp_ms(clock);

        // Calculate distribution parameters
        let total_period_ms = (distribution_period_years as u64) * 365 * 24 * 60 * 60 * 1000;
        let interval_ms = (release_interval_months as u64) * 30 * 24 * 60 * 60 * 1000;  // Approx 30 days
        let total_milestones = total_period_ms / interval_ms;

        let total_reserve = coin::value(&reserve_tokens);
        let release_per_milestone = total_reserve / total_milestones;

        // Create distribution schedule
        let milestones = vector::empty<DistributionMilestone>();
        let i = 0;
        while (i < total_milestones) {
            let milestone = DistributionMilestone {
                milestone_number: i + 1,
                release_timestamp: current_time + ((i + 1) * interval_ms),
                release_amount: release_per_milestone,
                released: false,
                released_at: 0,
            };
            vector::push_back(&mut milestones, milestone);
            i = i + 1;
        };

        // Create vault
        let vault = DistributionVault<T> {
            id: object::new(ctx),
            token_registry_id,
            platform_address,
            reserve_balance: coin::into_balance(reserve_tokens),
            original_reserve: total_reserve,
            milestones,
            current_milestone: 0,
            total_distribution_period_ms: total_period_ms,
            release_interval_ms: interval_ms,
            total_milestones,
            target_pool_id,
            distribution_completed: false,
            created_at: current_time,
        };

        // Create admin capability
        let vault_id = object::id(&vault);
        let admin_cap = DistributionAdminCap {
            id: object::new(ctx),
            vault_id,
        };

        // Share vault and transfer capability
        transfer::share_object(vault);
        transfer::transfer(admin_cap, platform_address);
    }

    /// Execute scheduled distribution
    /// Can be called by anyone once the milestone time is reached
    /// This enables automated execution via cron jobs or keeper networks
    public entry fun execute_distribution<T>(
        vault: &mut DistributionVault<T>,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        assert!(!vault.distribution_completed, EAllDistributed);

        let current_time = clock::timestamp_ms(clock);
        let milestone_idx = vault.current_milestone;

        assert!(milestone_idx < vector::length(&vault.milestones), EAllDistributed);

        let milestone = vector::borrow_mut(&mut vault.milestones, milestone_idx);
        assert!(current_time >= milestone.release_timestamp, EDistributionNotReady);
        assert!(!milestone.released, EDistributionNotReady);

        let release_amount = milestone.release_amount;
        assert!(balance::value(&vault.reserve_balance) >= release_amount, EInsufficientReserve);

        // Extract tokens from reserve
        let release_balance = balance::split(&mut vault.reserve_balance, release_amount);
        let release_coin = coin::from_balance(release_balance, ctx);

        // Mark milestone as released
        milestone.released = true;
        milestone.released_at = current_time;
        vault.current_milestone = vault.current_milestone + 1;

        // Emit event
        event::emit(TokensDistributed {
            vault_id: object::id(vault),
            milestone_number: milestone.milestone_number,
            amount: release_amount,
            recipient: vault.platform_address,
            timestamp: current_time,
        });

        // Check if distribution is complete
        if (vault.current_milestone >= vault.total_milestones) {
            vault.distribution_completed = true;
            event::emit(DistributionCompleted {
                vault_id: object::id(vault),
                total_distributed: vault.original_reserve,
                timestamp: current_time,
            });
        };

        // Transfer tokens to platform admin to add to liquidity pool
        // In production, this would directly add to AMM pool
        transfer::public_transfer(release_coin, vault.platform_address);
    }

    /// Emergency function: Platform can withdraw all remaining tokens
    /// (Only use in case of critical issues)
    public entry fun emergency_withdraw<T>(
        vault: &mut DistributionVault<T>,
        _admin_cap: &DistributionAdminCap,
        ctx: &mut TxContext
    ) {
        assert!(tx_context::sender(ctx) == vault.platform_address, ENotAuthorized);

        let remaining = balance::value(&vault.reserve_balance);
        if (remaining > 0) {
            let withdraw_balance = balance::withdraw_all(&mut vault.reserve_balance);
            let withdraw_coin = coin::from_balance(withdraw_balance, ctx);
            transfer::public_transfer(withdraw_coin, vault.platform_address);
        };

        vault.distribution_completed = true;
    }

    /// View function: Get vault status
    public fun get_vault_status<T>(vault: &DistributionVault<T>): (
        u64,  // current_milestone
        u64,  // total_milestones
        u64,  // remaining_reserve
        u64,  // original_reserve
        bool, // distribution_completed
    ) {
        (
            vault.current_milestone,
            vault.total_milestones,
            balance::value(&vault.reserve_balance),
            vault.original_reserve,
            vault.distribution_completed,
        )
    }

    /// View function: Get next distribution time
    public fun get_next_distribution_time<T>(vault: &DistributionVault<T>): u64 {
        if (vault.current_milestone >= vector::length(&vault.milestones)) {
            return 0  // No more distributions
        };

        let milestone = vector::borrow(&vault.milestones, vault.current_milestone);
        milestone.release_timestamp
    }

    /// View function: Get milestone details
    public fun get_milestone<T>(
        vault: &DistributionVault<T>,
        milestone_number: u64
    ): (u64, u64, bool) {
        let milestone = vector::borrow(&vault.milestones, milestone_number);
        (
            milestone.release_timestamp,
            milestone.release_amount,
            milestone.released
        )
    }
}
