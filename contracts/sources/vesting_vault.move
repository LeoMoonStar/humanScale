/// Vesting Vault Module
///
/// Implements linear unlock for creator token allocation.
/// Releases a fixed percentage of tokens monthly until a cap is reached.
///
/// Key Features:
/// - Monthly linear release (e.g., 2% per month)
/// - Total release cap (e.g., maximum 40% of allocation)
/// - Time-locked schedule prevents manipulation
/// - Remaining tokens stay locked
/// - Integration with token registry for configuration
///
/// Example:
/// Creator gets 10,000 tokens allocated
/// Vesting: 2% monthly, max 40%
/// - Month 1: 200 tokens unlocked
/// - Month 2: 200 tokens unlocked
/// - ...
/// - Month 20: 200 tokens unlocked (4000 total = 40%)
/// - Remaining 6000 tokens stay locked forever

module peoplecoin::vesting_vault {
    use sui::object::{Self, UID, ID};
    use sui::tx_context::{Self, TxContext};
    use sui::transfer;
    use sui::coin::{Self, Coin};
    use sui::balance::{Self, Balance};
    use sui::clock::{Self, Clock};
    use sui::event;
    use std::vector;

    /// Errors
    const ENotCreator: u64 = 0;
    const EVestingNotReady: u64 = 1;
    const EInsufficientBalance: u64 = 2;
    const EAllVested: u64 = 3;
    const EVestingNotEnabled: u64 = 4;
    const EInvalidConfig: u64 = 5;

    /// Vesting milestone (one per month)
    public struct VestingMilestone has store, copy, drop {
        milestone_number: u64,
        unlock_timestamp: u64,  // When tokens can be released
        unlock_amount: u64,  // Tokens to release
        unlocked: bool,
        unlocked_at: u64,
    }

    /// Vesting vault holding locked creator tokens
    public struct VestingVault<phantom T> has key {
        id: UID,
        token_registry_id: ID,
        creator: address,

        // Locked tokens
        locked_balance: Balance<T>,
        original_allocation: u64,
        total_vested_amount: u64,  // Total unlocked so far

        // Vesting schedule
        milestones: vector<VestingMilestone>,
        current_milestone: u64,

        // Configuration
        monthly_release_bps: u16,  // Basis points (200 = 2%)
        total_release_cap_bps: u16,  // Max release (4000 = 40%)
        total_vested_cap: u64,  // Max tokens that can be vested
        monthly_unlock_amount: u64,  // Tokens per month

        // Status
        vesting_completed: bool,
        created_at: u64,
    }

    /// Events
    public struct TokensVested has copy, drop {
        vault_id: ID,
        milestone_number: u64,
        amount: u64,
        creator: address,
        timestamp: u64,
    }

    public struct VestingCompleted has copy, drop {
        vault_id: ID,
        total_vested: u64,
        remaining_locked: u64,
        timestamp: u64,
    }

    /// Create vesting vault for creator tokens
    ///
    /// Tokens are released monthly until the total release cap is reached
    /// Remaining tokens stay permanently locked
    public entry fun create_vesting_vault<T>(
        token_registry_id: ID,
        creator_tokens: Coin<T>,  // Creator's full allocation
        monthly_release_bps: u16,  // E.g., 200 = 2%
        total_release_cap_bps: u16,  // E.g., 4000 = 40%
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        assert!(monthly_release_bps > 0 && monthly_release_bps <= 10000, EInvalidConfig);
        assert!(total_release_cap_bps > 0 && total_release_cap_bps <= 10000, EInvalidConfig);
        assert!(total_release_cap_bps >= monthly_release_bps, EInvalidConfig);

        let creator = tx_context::sender(ctx);
        let current_time = clock::timestamp_ms(clock);

        let original_allocation = coin::value(&creator_tokens);

        // Calculate amounts
        let total_vested_cap = (original_allocation * (total_release_cap_bps as u64)) / 10000;
        let monthly_unlock_amount = (original_allocation * (monthly_release_bps as u64)) / 10000;

        // Calculate number of milestones needed
        let num_milestones = total_vested_cap / monthly_unlock_amount;
        let month_ms = 30 * 24 * 60 * 60 * 1000;  // Approx 30 days

        // Create vesting schedule
        let mut milestones = vector::empty<VestingMilestone>();
        let mut i = 0;
        while (i < num_milestones) {
            let milestone = VestingMilestone {
                milestone_number: i + 1,
                unlock_timestamp: current_time + ((i + 1) * month_ms),
                unlock_amount: monthly_unlock_amount,
                unlocked: false,
                unlocked_at: 0,
            };
            vector::push_back(&mut milestones, milestone);
            i = i + 1;
        };

        // Create vault
        let vault = VestingVault<T> {
            id: object::new(ctx),
            token_registry_id,
            creator,
            locked_balance: coin::into_balance(creator_tokens),
            original_allocation,
            total_vested_amount: 0,
            milestones,
            current_milestone: 0,
            monthly_release_bps,
            total_release_cap_bps,
            total_vested_cap,
            monthly_unlock_amount,
            vesting_completed: false,
            created_at: current_time,
        };

        // Share vault
        transfer::share_object(vault);
    }

    /// Execute monthly vesting release
    /// Can be called by creator once the milestone time is reached
    public entry fun claim_vested_tokens<T>(
        vault: &mut VestingVault<T>,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        assert!(tx_context::sender(ctx) == vault.creator, ENotCreator);
        assert!(!vault.vesting_completed, EAllVested);

        let current_time = clock::timestamp_ms(clock);
        let milestone_idx = vault.current_milestone;

        assert!(milestone_idx < vector::length(&vault.milestones), EAllVested);

        // Get vault data before mutable borrow
        let vault_id = object::id(vault);
        let creator = vault.creator;

        let milestone = vector::borrow_mut(&mut vault.milestones, milestone_idx);
        assert!(current_time >= milestone.unlock_timestamp, EVestingNotReady);
        assert!(!milestone.unlocked, EVestingNotReady);

        let unlock_amount = milestone.unlock_amount;
        let milestone_number = milestone.milestone_number;
        assert!(balance::value(&vault.locked_balance) >= unlock_amount, EInsufficientBalance);

        // Extract tokens from locked balance
        let unlock_balance = balance::split(&mut vault.locked_balance, unlock_amount);
        let unlock_coin = coin::from_balance(unlock_balance, ctx);

        // Mark milestone as unlocked
        milestone.unlocked = true;
        milestone.unlocked_at = current_time;
        vault.current_milestone = vault.current_milestone + 1;
        vault.total_vested_amount = vault.total_vested_amount + unlock_amount;

        // Emit event
        event::emit(TokensVested {
            vault_id,
            milestone_number,
            amount: unlock_amount,
            creator,
            timestamp: current_time,
        });

        // Check if vesting is complete
        if (vault.current_milestone >= vector::length(&vault.milestones)) {
            vault.vesting_completed = true;
            event::emit(VestingCompleted {
                vault_id: object::id(vault),
                total_vested: vault.total_vested_amount,
                remaining_locked: balance::value(&vault.locked_balance),
                timestamp: current_time,
            });
        };

        // Transfer unlocked tokens to creator
        transfer::public_transfer(unlock_coin, vault.creator);
    }

    /// Batch claim all available vested tokens
    /// Claims all milestones that have passed their unlock timestamp
    public entry fun claim_all_available<T>(
        vault: &mut VestingVault<T>,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        assert!(tx_context::sender(ctx) == vault.creator, ENotCreator);
        assert!(!vault.vesting_completed, EAllVested);

        let current_time = clock::timestamp_ms(clock);
        let mut total_to_claim = 0u64;
        let mut milestones_claimed = 0u64;

        // Find all claimable milestones
        let mut i = vault.current_milestone;
        let len = vector::length(&vault.milestones);

        while (i < len) {
            let milestone = vector::borrow(&vault.milestones, i);
            if (current_time >= milestone.unlock_timestamp && !milestone.unlocked) {
                total_to_claim = total_to_claim + milestone.unlock_amount;
                milestones_claimed = milestones_claimed + 1;
            } else {
                break  // Stop at first non-claimable milestone
            };
            i = i + 1;
        };

        assert!(total_to_claim > 0, EVestingNotReady);
        assert!(balance::value(&vault.locked_balance) >= total_to_claim, EInsufficientBalance);

        // Get vault data before mutable borrow
        let vault_id = object::id(vault);
        let creator = vault.creator;
        let current_milestone_start = vault.current_milestone;

        // Update all claimed milestones
        let mut j = current_milestone_start;
        while (j < current_milestone_start + milestones_claimed) {
            let milestone = vector::borrow_mut(&mut vault.milestones, j);
            milestone.unlocked = true;
            milestone.unlocked_at = current_time;

            let milestone_number = milestone.milestone_number;
            let unlock_amount = milestone.unlock_amount;

            event::emit(TokensVested {
                vault_id,
                milestone_number,
                amount: unlock_amount,
                creator,
                timestamp: current_time,
            });

            j = j + 1;
        };

        // Extract total tokens
        let unlock_balance = balance::split(&mut vault.locked_balance, total_to_claim);
        let unlock_coin = coin::from_balance(unlock_balance, ctx);

        // Update vault state
        vault.current_milestone = vault.current_milestone + milestones_claimed;
        vault.total_vested_amount = vault.total_vested_amount + total_to_claim;

        // Check if vesting is complete
        if (vault.current_milestone >= vector::length(&vault.milestones)) {
            vault.vesting_completed = true;
            event::emit(VestingCompleted {
                vault_id: object::id(vault),
                total_vested: vault.total_vested_amount,
                remaining_locked: balance::value(&vault.locked_balance),
                timestamp: current_time,
            });
        };

        // Transfer unlocked tokens to creator
        transfer::public_transfer(unlock_coin, vault.creator);
    }

    /// View function: Get vault status
    public fun get_vault_status<T>(vault: &VestingVault<T>): (
        address,  // creator
        u64,      // current_milestone
        u64,      // total_milestones
        u64,      // total_vested_amount
        u64,      // remaining_locked
        u64,      // total_vested_cap
        bool,     // vesting_completed
    ) {
        (
            vault.creator,
            vault.current_milestone,
            vector::length(&vault.milestones),
            vault.total_vested_amount,
            balance::value(&vault.locked_balance),
            vault.total_vested_cap,
            vault.vesting_completed,
        )
    }

    /// View function: Get next vesting time
    public fun get_next_vesting_time<T>(vault: &VestingVault<T>): u64 {
        if (vault.current_milestone >= vector::length(&vault.milestones)) {
            return 0  // No more vesting
        };

        let milestone = vector::borrow(&vault.milestones, vault.current_milestone);
        milestone.unlock_timestamp
    }

    /// View function: Get milestone details
    public fun get_milestone<T>(
        vault: &VestingVault<T>,
        milestone_number: u64
    ): (u64, u64, bool) {
        let milestone = vector::borrow(&vault.milestones, milestone_number);
        (
            milestone.unlock_timestamp,
            milestone.unlock_amount,
            milestone.unlocked
        )
    }

    /// View function: Get total claimable now
    public fun get_claimable_amount<T>(vault: &VestingVault<T>, current_timestamp: u64): u64 {
        let mut total_claimable = 0u64;
        let mut i = vault.current_milestone;
        let len = vector::length(&vault.milestones);

        while (i < len) {
            let milestone = vector::borrow(&vault.milestones, i);
            if (current_timestamp >= milestone.unlock_timestamp && !milestone.unlocked) {
                total_claimable = total_claimable + milestone.unlock_amount;
            } else {
                break
            };
            i = i + 1;
        };

        total_claimable
    }
}
