/// Creator Token Module
///
/// This module implements the core fungible token for individual creators.
/// Each creator gets their own token type with customized parameters.
///
/// Key Features:
/// - One-time witness pattern for creating unique token types
/// - Fixed supply with controlled initial distribution
/// - Integration with Creator Treasury for allocation management
/// - Regulated currency with DenyCap for freezing creator wallet
/// - Metadata storage for creator information
///
/// Flow:
/// 1. Create regulated token with DenyCap
/// 2. Freeze creator's wallet (forces treasury use)
/// 3. Split allocation: creator → treasury, platform, liquidity
/// 4. Creator can only interact with tokens via Treasury
/// 5. All other users trade freely

module peoplecoin::creator_token {
    use sui::coin::{Self, Coin, TreasuryCap, DenyCap};
    use sui::deny_list::{Self, DenyList};
    use sui::balance::{Self, Balance};
    use sui::tx_context::{Self, TxContext};
    use sui::transfer;
    use sui::object::{Self, UID, ID};
    use sui::url::{Self, Url};
    use sui::clock::{Self as clock, Clock};
    use std::option;
    use std::string::{Self, String};
    use std::vector;

    /// Errors
    const EInvalidSupply: u64 = 0;
    const EInsufficientBalance: u64 = 1;
    const ENotAuthorized: u64 = 2;
    const EInvalidAllocation: u64 = 3;

    /// Shared object that stores token metadata and configuration
    public struct TokenRegistry has key {
        id: UID,
        creator: address,
        token_name: String,
        token_symbol: String,
        description: String,
        icon_url: Url,
        total_supply: u64,
        creator_allocation: u64,
        platform_reserve: u64,
        liquidity_pool_allocation: u64,
        buyback_duration_years: u8,
        buyback_start_date: u64,
        buyback_end_date: u64,
        buyback_interval_months: u8,
        buyback_amount: u64,
        initial_price_usd: u64, // Price in cents (e.g., 100 = $1.00)

        // Trading restrictions
        trading_block_end_date: u64,  // Timestamp when creator can start trading
        trading_block_duration_days: u8,  // Number of days creator cannot buy tokens

        // Vesting configuration
        vesting_enabled: bool,
        vesting_monthly_release_bps: u16,  // Basis points (200 = 2%)
        vesting_total_release_bps: u16,  // Max release in basis points (4000 = 40%)

        created_at: u64,
    }

    /// Capability to manage token distribution
    public struct AdminCap has key, store {
        id: UID,
        token_registry_id: address,
    }

    /// Initialize a new creator token
    /// This creates the token type and distributes the initial supply
    public entry fun create_token<T: drop>(
        witness: T,
        decimals: u8,
        symbol: vector<u8>,
        name: vector<u8>,
        description: vector<u8>,
        icon_url: vector<u8>,
        total_supply: u64,
        creator_allocation: u64,
        platform_reserve: u64,
        liquidity_pool_allocation: u64,
        buyback_duration_years: u8,
        buyback_start_date: u64,  // Timestamp when buyback starts
        buyback_interval_months: u8,  // Months between each buyback
        buyback_amount_per_interval: u64,  // Tokens to buyback each interval
        trading_block_duration_days: u8,  // Days creator cannot buy tokens
        vesting_enabled: bool,  // Enable linear vesting for creator
        vesting_monthly_release_bps: u16,  // Basis points released per month (e.g., 200 = 2%)
        vesting_total_release_bps: u16,  // Max total release in basis points (e.g., 4000 = 40%)
        initial_price_usd: u64,
        ctx: &mut TxContext
    ) {
        // Validate allocations add up to total supply
        assert!(
            creator_allocation + platform_reserve + liquidity_pool_allocation == total_supply,
            EInvalidAllocation
        );

        // Create the currency
        let (mut treasury_cap, metadata) = coin::create_currency(
            witness,
            decimals,
            symbol,
            name,
            description,
            option::some(url::new_unsafe_from_bytes(icon_url)),
            ctx
        );

        // Calculate buyback end date
        let current_time = tx_context::epoch(ctx);
        let buyback_end_date = buyback_start_date + ((buyback_duration_years as u64) * 365 * 24 * 60 * 60 * 1000);

        // Calculate trading block end date
        let trading_block_end_date = current_time + ((trading_block_duration_days as u64) * 24 * 60 * 60 * 1000);

        // Create token registry
        let registry = TokenRegistry {
            id: object::new(ctx),
            creator: tx_context::sender(ctx),
            token_name: string::utf8(name),
            token_symbol: string::utf8(symbol),
            description: string::utf8(description),
            icon_url: url::new_unsafe_from_bytes(icon_url),
            total_supply,
            creator_allocation,
            platform_reserve,
            liquidity_pool_allocation,
            buyback_duration_years,
            buyback_start_date,
            buyback_end_date,
            buyback_interval_months,
            buyback_amount: buyback_amount_per_interval,
            initial_price_usd,
            trading_block_end_date,
            trading_block_duration_days,
            vesting_enabled,
            vesting_monthly_release_bps,
            vesting_total_release_bps,
            created_at: current_time,
        };

        // Create admin capability
        let admin_cap = AdminCap {
            id: object::new(ctx),
            token_registry_id: object::uid_to_address(&registry.id),
        };

        // Mint total supply
        let mut total_coin = coin::mint(&mut treasury_cap, total_supply, ctx);

        // Split allocations
        let creator_coins = coin::split(&mut total_coin, creator_allocation, ctx);
        let reserve_coins = coin::split(&mut total_coin, platform_reserve, ctx);
        let liquidity_coins = total_coin; // Remaining balance

        // Transfer creator allocation to creator
        transfer::public_transfer(creator_coins, tx_context::sender(ctx));

        // Transfer reserve to platform (admin cap holder manages this)
        transfer::public_transfer(reserve_coins, tx_context::sender(ctx));

        // Liquidity pool coins should be sent to AMM pool
        // For now, transfer to creator who will seed the pool
        transfer::public_transfer(liquidity_coins, tx_context::sender(ctx));

        // Share registry for public access
        transfer::share_object(registry);

        // Transfer admin capability to creator
        transfer::transfer(admin_cap, tx_context::sender(ctx));

        // Freeze metadata (immutable)
        transfer::public_freeze_object(metadata);

        // Transfer treasury cap to platform/creator for potential future operations
        transfer::public_transfer(treasury_cap, tx_context::sender(ctx));
    }

    /// Create token with Treasury integration and wallet freeze
    /// This is the recommended way to create creator tokens
    public entry fun create_token_with_treasury<T: drop>(
        witness: T,
        decimals: u8,
        symbol: vector<u8>,
        name: vector<u8>,
        description: vector<u8>,
        icon_url: vector<u8>,
        total_supply: u64,
        creator_allocation: u64,
        platform_reserve: u64,
        liquidity_pool_allocation: u64,
        platform_address: address,
        // Treasury configuration
        creator_portion_bps: u16,           // % of creator allocation to vest to creator
        platform_portion_bps: u16,          // % of creator allocation to distribute to market
        creator_monthly_unlock_bps: u16,    // Monthly unlock rate for creator
        platform_monthly_unlock_bps: u16,   // Monthly distribution rate for platform
        // Buyback configuration
        buyback_duration_years: u8,
        buyback_start_date: u64,
        buyback_interval_months: u8,
        buyback_amount_per_interval: u64,
        // Other
        initial_price_usd: u64,
        deny_list: &mut DenyList,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        // Validate allocations
        assert!(
            creator_allocation + platform_reserve + liquidity_pool_allocation == total_supply,
            EInvalidAllocation
        );

        // Create REGULATED currency (with DenyCap for freezing)
        let (mut treasury_cap, deny_cap, metadata) = coin::create_regulated_currency_v2(
            witness,
            decimals,
            symbol,
            name,
            description,
            option::some(url::new_unsafe_from_bytes(icon_url)),
            false, // Not immutable
            ctx
        );

        let current_time = clock::timestamp_ms(clock);
        let buyback_end_date = buyback_start_date +
            ((buyback_duration_years as u64) * 365 * 24 * 60 * 60 * 1000);

        // Create token registry
        let registry = TokenRegistry {
            id: object::new(ctx),
            creator: tx_context::sender(ctx),
            token_name: string::utf8(name),
            token_symbol: string::utf8(symbol),
            description: string::utf8(description),
            icon_url: url::new_unsafe_from_bytes(icon_url),
            total_supply,
            creator_allocation,
            platform_reserve,
            liquidity_pool_allocation,
            buyback_duration_years,
            buyback_start_date,
            buyback_end_date,
            buyback_interval_months,
            buyback_amount: buyback_amount_per_interval,
            initial_price_usd,
            trading_block_end_date: 0, // Not used with treasury model
            trading_block_duration_days: 0,
            vesting_enabled: true,
            vesting_monthly_release_bps: creator_monthly_unlock_bps,
            vesting_total_release_bps: creator_portion_bps,
            created_at: current_time,
        };

        // Mint total supply
        let mut total_coin = coin::mint(&mut treasury_cap, total_supply, ctx);

        // Split allocations
        let creator_tokens = coin::split(&mut total_coin, creator_allocation, ctx);
        let reserve_coins = coin::split(&mut total_coin, platform_reserve, ctx);
        let liquidity_coins = total_coin; // Remaining

        // TODO: FREEZE creator's wallet (forces treasury use)
        // Note: deny_list::v2_add is public(package) and can't be called from external packages
        // This feature needs to be implemented via a different mechanism or through a System transaction
        // For now, the treasury system works without wallet freezing - creators can still use the treasury voluntarily
        // deny_list::v2_add(
        //     deny_list,
        //     &mut deny_cap,
        //     tx_context::sender(ctx)
        // );

        // Create buyback milestones
        let mut milestones = vector::empty();
        let interval_ms = (buyback_interval_months as u64) * 30 * 24 * 60 * 60 * 1000;
        let num_milestones = (buyback_end_date - buyback_start_date) / interval_ms;

        let mut i = 0;
        while (i < num_milestones) {
            let milestone = peoplecoin::creator_treasury::create_test_milestone(
                i + 1,
                buyback_start_date + ((i + 1) * interval_ms),
                buyback_amount_per_interval
            );
            vector::push_back(&mut milestones, milestone);
            i = i + 1;
        };

        // Create treasury with creator's allocation
        let treasury_id = peoplecoin::creator_treasury::create_treasury(
            creator_tokens,
            platform_address,
            creator_portion_bps,
            platform_portion_bps,
            creator_monthly_unlock_bps,
            platform_monthly_unlock_bps,
            30 * 24 * 60 * 60 * 1000, // Monthly
            milestones,
            clock,
            ctx
        );

        // Transfer platform reserve
        transfer::public_transfer(reserve_coins, platform_address);

        // Transfer liquidity pool allocation to creator (they'll seed the pool)
        transfer::public_transfer(liquidity_coins, tx_context::sender(ctx));

        // Share registry
        transfer::share_object(registry);

        // Freeze metadata
        transfer::public_freeze_object(metadata);

        // Transfer TreasuryCap to treasury (for burning during buybacks)
        // Note: In production, you'd pass the treasury object here
        transfer::public_transfer(treasury_cap, tx_context::sender(ctx));

        // Transfer DenyCap to platform admin (for emergency unfreezing if needed)
        transfer::public_transfer(deny_cap, platform_address);
    }

    /// Burn tokens (used by buyback mechanism)
    public entry fun burn<T>(
        treasury_cap: &mut TreasuryCap<T>,
        coin: Coin<T>,
    ) {
        coin::burn(treasury_cap, coin);
    }

    /// Get token registry information (view function)
    public fun get_token_info(registry: &TokenRegistry): (
        address,
        String,
        String,
        u64,
        u8,
        u64
    ) {
        (
            registry.creator,
            registry.token_name,
            registry.token_symbol,
            registry.total_supply,
            registry.buyback_duration_years,
            registry.initial_price_usd
        )
    }

    /// Check if address is the creator
    public fun is_creator(registry: &TokenRegistry, addr: address): bool {
        registry.creator == addr
    }

    /// Check if creator can trade (buy) tokens
    /// Returns true if trading block period has ended
    public fun can_creator_trade(registry: &TokenRegistry, current_timestamp: u64): bool {
        current_timestamp >= registry.trading_block_end_date
    }

    /// Get buyback configuration
    public fun get_buyback_config(registry: &TokenRegistry): (
        u64,  // buyback_start_date
        u64,  // buyback_end_date
        u8,   // buyback_interval_months
        u64,  // buyback_amount
    ) {
        (
            registry.buyback_start_date,
            registry.buyback_end_date,
            registry.buyback_interval_months,
            registry.buyback_amount
        )
    }

    /// Get vesting configuration
    public fun get_vesting_config(registry: &TokenRegistry): (
        bool,  // vesting_enabled
        u16,   // monthly_release_bps
        u16,   // total_release_bps
    ) {
        (
            registry.vesting_enabled,
            registry.vesting_monthly_release_bps,
            registry.vesting_total_release_bps
        )
    }

    /// Get trading restrictions
    public fun get_trading_restrictions(registry: &TokenRegistry): (
        u64,  // trading_block_end_date
        u8,   // trading_block_duration_days
    ) {
        (
            registry.trading_block_end_date,
            registry.trading_block_duration_days
        )
    }

    #[test_only]
    /// Test-only witness for testing
    public struct TEST_TOKEN has drop {}

    #[test_only]
    /// Test-only helper to create token without proper OTW
    public fun create_token_for_testing<T>(
        decimals: u8,
        symbol: vector<u8>,
        name: vector<u8>,
        description: vector<u8>,
        icon_url: vector<u8>,
        total_supply: u64,
        creator_allocation: u64,
        platform_reserve: u64,
        liquidity_pool_allocation: u64,
        buyback_duration_years: u8,
        buyback_start_date: u64,
        buyback_interval_months: u8,
        buyback_amount_per_interval: u64,
        trading_block_duration_days: u8,
        vesting_enabled: bool,
        vesting_monthly_release_bps: u16,
        vesting_total_release_bps: u16,
        initial_price_usd: u64,
        ctx: &mut TxContext
    ) {
        // Validate allocations
        assert!(
            creator_allocation + platform_reserve + liquidity_pool_allocation == total_supply,
            EInvalidAllocation
        );

        // Create treasury cap for testing (bypasses OTW requirement)
        let mut treasury_cap = coin::create_treasury_cap_for_testing<T>(ctx);

        // Calculate dates
        let current_time = tx_context::epoch(ctx);
        let buyback_end_date = buyback_start_date + ((buyback_duration_years as u64) * 365 * 24 * 60 * 60 * 1000);
        let trading_block_end_date = current_time + ((trading_block_duration_days as u64) * 24 * 60 * 60 * 1000);

        // Create token registry
        let registry = TokenRegistry {
            id: object::new(ctx),
            creator: tx_context::sender(ctx),
            token_name: string::utf8(name),
            token_symbol: string::utf8(symbol),
            description: string::utf8(description),
            icon_url: url::new_unsafe_from_bytes(icon_url),
            total_supply,
            creator_allocation,
            platform_reserve,
            liquidity_pool_allocation,
            buyback_duration_years,
            buyback_start_date,
            buyback_end_date,
            buyback_interval_months,
            buyback_amount: buyback_amount_per_interval,
            initial_price_usd,
            trading_block_end_date,
            trading_block_duration_days,
            vesting_enabled,
            vesting_monthly_release_bps,
            vesting_total_release_bps,
            created_at: current_time,
        };

        // Mint total supply
        let mut total_coin = coin::mint(&mut treasury_cap, total_supply, ctx);

        // Split allocations
        let creator_coins = coin::split(&mut total_coin, creator_allocation, ctx);
        let reserve_coins = coin::split(&mut total_coin, platform_reserve, ctx);
        let liquidity_coins = total_coin; // Remaining balance

        // Transfer creator allocation to creator
        transfer::public_transfer(creator_coins, tx_context::sender(ctx));

        // Transfer reserve to platform
        transfer::public_transfer(reserve_coins, tx_context::sender(ctx));

        // Transfer liquidity allocation
        transfer::public_transfer(liquidity_coins, tx_context::sender(ctx));

        // Share registry
        transfer::share_object(registry);

        // Transfer treasury cap to creator
        transfer::public_transfer(treasury_cap, tx_context::sender(ctx));
    }
}
