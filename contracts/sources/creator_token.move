/// Creator Token Module
///
/// This module implements the core fungible token for individual creators.
/// Each creator gets their own token type with customized parameters.
///
/// Key Features:
/// - One-time witness pattern for creating unique token types
/// - Fixed supply with controlled initial distribution
/// - Integration with buyback vault for scheduled burns
/// - Metadata storage for creator information

module peoplecoin::creator_token {
    use sui::coin::{Self, Coin, TreasuryCap};
    use sui::balance::{Self, Balance};
    use sui::tx_context::{Self, TxContext};
    use sui::transfer;
    use sui::object::{Self, UID};
    use sui::url::{Self, Url};
    use std::option;
    use std::string::{Self, String};

    /// Errors
    const EInvalidSupply: u64 = 0;
    const EInsufficientBalance: u64 = 1;
    const ENotAuthorized: u64 = 2;
    const EInvalidAllocation: u64 = 3;

    /// Shared object that stores token metadata and configuration
    struct TokenRegistry has key {
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
        initial_price_usd: u64, // Price in cents (e.g., 100 = $1.00)
        created_at: u64,
    }

    /// Capability to manage token distribution
    struct AdminCap has key, store {
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
        initial_price_usd: u64,
        ctx: &mut TxContext
    ) {
        // Validate allocations add up to total supply
        assert!(
            creator_allocation + platform_reserve + liquidity_pool_allocation == total_supply,
            EInvalidAllocation
        );

        // Create the currency
        let (treasury_cap, metadata) = coin::create_currency(
            witness,
            decimals,
            symbol,
            name,
            description,
            option::some(url::new_unsafe_from_bytes(icon_url)),
            ctx
        );

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
            initial_price_usd,
            created_at: tx_context::epoch(ctx),
        };

        // Create admin capability
        let admin_cap = AdminCap {
            id: object::new(ctx),
            token_registry_id: object::uid_to_address(&registry.id),
        };

        // Mint total supply
        let total_coin = coin::mint(&mut treasury_cap, total_supply, ctx);

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

    #[test_only]
    /// Test-only witness for testing
    struct TEST_TOKEN has drop {}
}
