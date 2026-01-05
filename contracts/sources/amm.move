/// Automated Market Maker (AMM) Module
///
/// Implements constant product formula (x * y = k) for trading creator tokens against SUI.
/// Each creator token gets its own liquidity pool.
///
/// Key Features:
/// - Constant product market maker (Uniswap v2 style)
/// - 0.5% trading fee (0.1% to insurance pool, 0.4% to liquidity providers)
/// - Add/remove liquidity with LP tokens
/// - Integration with buyback vault for automatic enforcement
/// - Slippage protection

module peoplecoin::amm {
    use sui::object::{Self, UID, ID};
    use sui::tx_context::{Self, TxContext};
    use sui::transfer;
    use sui::coin::{Self, Coin};
    use sui::balance::{Self, Balance};
    use sui::sui::SUI;
    use sui::event;
    use sui::math;

    /// Errors
    const EInsufficientLiquidity: u64 = 0;
    const EInsufficientAmount: u64 = 1;
    const ESlippageExceeded: u64 = 2;
    const EInvalidRatio: u64 = 3;
    const EZeroAmount: u64 = 4;
    const EPoolAlreadyExists: u64 = 5;
    const ECreatorTradingBlocked: u64 = 6;

    /// Constants
    const FEE_DENOMINATOR: u64 = 10000;  // 0.5% = 50/10000
    const TRADING_FEE_BPS: u64 = 50;  // 0.5% total fee
    const INSURANCE_FEE_BPS: u64 = 10;  // 0.1% to insurance
    const LP_FEE_BPS: u64 = 40;  // 0.4% to LPs
    const MINIMUM_LIQUIDITY: u64 = 1000;  // Prevent division by zero

    /// Liquidity Pool for a creator token
    public struct LiquidityPool<phantom T> has key {
        id: UID,
        token_registry_id: ID,

        // Reserves
        sui_reserve: Balance<SUI>,
        token_reserve: Balance<T>,

        // LP tokens
        lp_supply: u64,

        // Fee tracking
        total_fees_collected_sui: u64,
        total_fees_collected_token: u64,

        // Insurance pool integration
        insurance_pool_id: ID,

        // Statistics
        total_volume_sui: u64,
        total_volume_token: u64,
        total_swaps: u64,

        // Configuration
        created_at: u64,
    }

    /// LP (Liquidity Provider) token
    public struct LPToken<phantom T> has key, store {
        id: UID,
        pool_id: ID,
        amount: u64,
    }

    /// Pool registry (tracks all pools)
    public struct PoolRegistry has key {
        id: UID,
        pools: vector<ID>,
    }

    /// Events
    public struct PoolCreated has copy, drop {
        pool_id: ID,
        token_type: vector<u8>,
        sui_amount: u64,
        token_amount: u64,
        creator: address,
    }

    public struct LiquidityAdded has copy, drop {
        pool_id: ID,
        provider: address,
        sui_amount: u64,
        token_amount: u64,
        lp_minted: u64,
    }

    public struct LiquidityRemoved has copy, drop {
        pool_id: ID,
        provider: address,
        sui_amount: u64,
        token_amount: u64,
        lp_burned: u64,
    }

    public struct Swap has copy, drop {
        pool_id: ID,
        trader: address,
        sui_in: u64,
        token_in: u64,
        sui_out: u64,
        token_out: u64,
        fee_amount: u64,
    }

    /// Create a new liquidity pool for a creator token
    public entry fun create_pool<T>(
        token_registry_id: ID,
        insurance_pool_id: ID,
        sui_amount: Coin<SUI>,
        token_amount: Coin<T>,
        ctx: &mut TxContext
    ) {
        let sui_value = coin::value(&sui_amount);
        let token_value = coin::value(&token_amount);

        assert!(sui_value > 0 && token_value > 0, EZeroAmount);
        assert!(sui_value >= MINIMUM_LIQUIDITY && token_value >= MINIMUM_LIQUIDITY, EInsufficientLiquidity);

        // Calculate initial LP tokens (geometric mean)
        let lp_amount = math::sqrt(sui_value) * math::sqrt(token_value);

        // Create pool
        let pool = LiquidityPool<T> {
            id: object::new(ctx),
            token_registry_id,
            sui_reserve: coin::into_balance(sui_amount),
            token_reserve: coin::into_balance(token_amount),
            lp_supply: lp_amount,
            total_fees_collected_sui: 0,
            total_fees_collected_token: 0,
            insurance_pool_id,
            total_volume_sui: 0,
            total_volume_token: 0,
            total_swaps: 0,
            created_at: tx_context::epoch(ctx),
        };

        let pool_id = object::id(&pool);
        let creator = tx_context::sender(ctx);

        // Mint LP tokens for creator
        let lp_token = LPToken<T> {
            id: object::new(ctx),
            pool_id,
            amount: lp_amount,
        };

        // Emit event
        event::emit(PoolCreated {
            pool_id,
            token_type: b"T",  // Type name would be extracted in production
            sui_amount: sui_value,
            token_amount: token_value,
            creator,
        });

        // Share pool and transfer LP token
        transfer::share_object(pool);
        transfer::transfer(lp_token, creator);
    }

    /// Add liquidity to an existing pool
    public entry fun add_liquidity<T>(
        pool: &mut LiquidityPool<T>,
        mut sui_amount: Coin<SUI>,
        mut token_amount: Coin<T>,
        min_lp_amount: u64,  // Slippage protection
        ctx: &mut TxContext
    ) {
        let sui_value = coin::value(&sui_amount);
        let token_value = coin::value(&token_amount);

        assert!(sui_value > 0 && token_value > 0, EZeroAmount);

        let sui_reserve = balance::value(&pool.sui_reserve);
        let token_reserve = balance::value(&pool.token_reserve);

        // Calculate optimal amounts to maintain ratio
        let optimal_token = (sui_value * token_reserve) / sui_reserve;
        let optimal_sui = (token_value * sui_reserve) / token_reserve;

        let (final_sui, final_token) = if (optimal_token <= token_value) {
            (sui_value, optimal_token)
        } else {
            (optimal_sui, token_value)
        };

        // Calculate LP tokens to mint
        let lp_amount = math::min(
            (final_sui * pool.lp_supply) / sui_reserve,
            (final_token * pool.lp_supply) / token_reserve
        );

        assert!(lp_amount >= min_lp_amount, ESlippageExceeded);

        // Split coins to exact amounts
        let sui_coin = coin::split(&mut sui_amount, final_sui, ctx);
        let token_coin = coin::split(&mut token_amount, final_token, ctx);

        // Add to reserves
        balance::join(&mut pool.sui_reserve, coin::into_balance(sui_coin));
        balance::join(&mut pool.token_reserve, coin::into_balance(token_coin));

        // Update LP supply
        pool.lp_supply = pool.lp_supply + lp_amount;

        // Mint LP tokens
        let lp_token = LPToken<T> {
            id: object::new(ctx),
            pool_id: object::id(pool),
            amount: lp_amount,
        };

        let provider = tx_context::sender(ctx);

        // Emit event
        event::emit(LiquidityAdded {
            pool_id: object::id(pool),
            provider,
            sui_amount: final_sui,
            token_amount: final_token,
            lp_minted: lp_amount,
        });

        // Return excess coins if any
        if (coin::value(&sui_amount) > 0) {
            transfer::public_transfer(sui_amount, provider);
        } else {
            coin::destroy_zero(sui_amount);
        };

        if (coin::value(&token_amount) > 0) {
            transfer::public_transfer(token_amount, provider);
        } else {
            coin::destroy_zero(token_amount);
        };

        // Transfer LP token
        transfer::transfer(lp_token, provider);
    }

    /// Remove liquidity from pool
    public entry fun remove_liquidity<T>(
        pool: &mut LiquidityPool<T>,
        lp_token: LPToken<T>,
        min_sui_amount: u64,  // Slippage protection
        min_token_amount: u64,
        ctx: &mut TxContext
    ) {
        let LPToken { id, pool_id: _, amount: lp_amount } = lp_token;
        object::delete(id);

        assert!(lp_amount > 0, EZeroAmount);

        let sui_reserve = balance::value(&pool.sui_reserve);
        let token_reserve = balance::value(&pool.token_reserve);

        // Calculate amounts to return
        let sui_amount = (lp_amount * sui_reserve) / pool.lp_supply;
        let token_amount = (lp_amount * token_reserve) / pool.lp_supply;

        assert!(sui_amount >= min_sui_amount, ESlippageExceeded);
        assert!(token_amount >= min_token_amount, ESlippageExceeded);

        // Update LP supply
        pool.lp_supply = pool.lp_supply - lp_amount;

        // Withdraw from reserves
        let sui_balance = balance::split(&mut pool.sui_reserve, sui_amount);
        let token_balance = balance::split(&mut pool.token_reserve, token_amount);

        let sui_coin = coin::from_balance(sui_balance, ctx);
        let token_coin = coin::from_balance(token_balance, ctx);

        let provider = tx_context::sender(ctx);

        // Emit event
        event::emit(LiquidityRemoved {
            pool_id: object::id(pool),
            provider,
            sui_amount,
            token_amount,
            lp_burned: lp_amount,
        });

        // Transfer coins
        transfer::public_transfer(sui_coin, provider);
        transfer::public_transfer(token_coin, provider);
    }

    /// Swap SUI for tokens
    public fun swap_sui_for_token<T>(
        pool: &mut LiquidityPool<T>,
        sui_in: Coin<SUI>,
        min_token_out: u64,  // Slippage protection
        insurance_pool: &mut peoplecoin::insurance::InsurancePool,
        token_registry: &peoplecoin::creator_token::TokenRegistry,
        clock: &sui::clock::Clock,
        ctx: &mut TxContext
    ): Coin<T> {
        let sui_amount = coin::value(&sui_in);
        assert!(sui_amount > 0, EZeroAmount);

        // Check if sender is creator and if trading block is active
        let sender = tx_context::sender(ctx);
        if (peoplecoin::creator_token::is_creator(token_registry, sender)) {
            let current_time = sui::clock::timestamp_ms(clock);
            assert!(
                peoplecoin::creator_token::can_creator_trade(token_registry, current_time),
                ECreatorTradingBlocked
            );
        };

        let sui_reserve = balance::value(&pool.sui_reserve);
        let token_reserve = balance::value(&pool.token_reserve);

        // Calculate output with fee (constant product formula)
        let (token_out, fee_sui) = calculate_output_with_fee(
            sui_amount,
            sui_reserve,
            token_reserve
        );

        assert!(token_out >= min_token_out, ESlippageExceeded);

        // Split fee to insurance pool (0.1%) and keep rest for LPs (0.4%)
        let insurance_fee = (fee_sui * INSURANCE_FEE_BPS) / TRADING_FEE_BPS;
        let lp_fee = fee_sui - insurance_fee;

        // Convert SUI to balance first
        let mut sui_balance = coin::into_balance(sui_in);

        // Extract insurance fee and send to insurance pool
        let insurance_fee_balance = balance::split(&mut sui_balance, insurance_fee);
        peoplecoin::insurance::add_insurance_funds(
            insurance_pool,
            coin::from_balance(insurance_fee_balance, ctx)
        );

        // Add SUI (minus insurance fee) to pool
        balance::join(&mut pool.sui_reserve, sui_balance);

        // Remove tokens from pool
        let token_balance = balance::split(&mut pool.token_reserve, token_out);

        // Update statistics
        pool.total_volume_sui = pool.total_volume_sui + sui_amount;
        pool.total_fees_collected_sui = pool.total_fees_collected_sui + fee_sui;
        pool.total_swaps = pool.total_swaps + 1;

        // Emit event
        event::emit(Swap {
            pool_id: object::id(pool),
            trader: tx_context::sender(ctx),
            sui_in: sui_amount,
            token_in: 0,
            sui_out: 0,
            token_out,
            fee_amount: fee_sui,
        });

        coin::from_balance(token_balance, ctx)
    }

    /// Swap tokens for SUI
    public fun swap_token_for_sui<T>(
        pool: &mut LiquidityPool<T>,
        token_in: Coin<T>,
        min_sui_out: u64,  // Slippage protection
        insurance_pool: &mut peoplecoin::insurance::InsurancePool,
        ctx: &mut TxContext
    ): Coin<SUI> {
        let token_amount = coin::value(&token_in);
        assert!(token_amount > 0, EZeroAmount);

        let sui_reserve = balance::value(&pool.sui_reserve);
        let token_reserve = balance::value(&pool.token_reserve);

        // Calculate output with fee
        let (sui_out, fee_token) = calculate_output_with_fee(
            token_amount,
            token_reserve,
            sui_reserve
        );

        assert!(sui_out >= min_sui_out, ESlippageExceeded);

        // Fee is collected in tokens, convert to SUI for insurance
        // (Simplified: in production, would swap fee tokens for SUI)

        // Add tokens to pool
        balance::join(&mut pool.token_reserve, coin::into_balance(token_in));

        // Remove SUI from pool
        let sui_balance = balance::split(&mut pool.sui_reserve, sui_out);

        // Update statistics
        pool.total_volume_token = pool.total_volume_token + token_amount;
        pool.total_fees_collected_token = pool.total_fees_collected_token + fee_token;
        pool.total_swaps = pool.total_swaps + 1;

        // Emit event
        event::emit(Swap {
            pool_id: object::id(pool),
            trader: tx_context::sender(ctx),
            sui_in: 0,
            token_in: token_amount,
            sui_out,
            token_out: 0,
            fee_amount: fee_token,
        });

        coin::from_balance(sui_balance, ctx)
    }

    /// Entry function: Swap SUI for tokens
    public entry fun swap_sui_for_token_entry<T>(
        pool: &mut LiquidityPool<T>,
        sui_in: Coin<SUI>,
        min_token_out: u64,
        insurance_pool: &mut peoplecoin::insurance::InsurancePool,
        token_registry: &peoplecoin::creator_token::TokenRegistry,
        clock: &sui::clock::Clock,
        ctx: &mut TxContext
    ) {
        let token_out = swap_sui_for_token(
            pool,
            sui_in,
            min_token_out,
            insurance_pool,
            token_registry,
            clock,
            ctx
        );
        transfer::public_transfer(token_out, tx_context::sender(ctx));
    }

    /// Entry function: Swap tokens for SUI
    public entry fun swap_token_for_sui_entry<T>(
        pool: &mut LiquidityPool<T>,
        token_in: Coin<T>,
        min_sui_out: u64,
        insurance_pool: &mut peoplecoin::insurance::InsurancePool,
        ctx: &mut TxContext
    ) {
        let sui_out = swap_token_for_sui(pool, token_in, min_sui_out, insurance_pool, ctx);
        transfer::public_transfer(sui_out, tx_context::sender(ctx));
    }

    /// Calculate output amount with fee (constant product formula)
    /// Returns (output_amount, fee_amount)
    fun calculate_output_with_fee(
        input_amount: u64,
        input_reserve: u64,
        output_reserve: u64
    ): (u64, u64) {
        assert!(input_amount > 0, EZeroAmount);
        assert!(input_reserve > 0 && output_reserve > 0, EInsufficientLiquidity);

        // Fee calculation: 0.5% of input
        let fee = (input_amount * TRADING_FEE_BPS) / FEE_DENOMINATOR;
        let input_after_fee = input_amount - fee;

        // Constant product: (x + Δx) * (y - Δy) = x * y
        // Δy = (y * Δx) / (x + Δx)
        let numerator = input_after_fee * output_reserve;
        let denominator = input_reserve + input_after_fee;
        let output_amount = numerator / denominator;

        (output_amount, fee)
    }

    /// Get pool reserves and statistics (view function)
    public fun get_pool_info<T>(pool: &LiquidityPool<T>): (
        u64,  // sui_reserve
        u64,  // token_reserve
        u64,  // lp_supply
        u64,  // total_volume_sui
        u64,  // total_swaps
    ) {
        (
            balance::value(&pool.sui_reserve),
            balance::value(&pool.token_reserve),
            pool.lp_supply,
            pool.total_volume_sui,
            pool.total_swaps,
        )
    }

    /// Calculate quote for swapping SUI to tokens
    public fun quote_sui_to_token<T>(
        pool: &LiquidityPool<T>,
        sui_amount: u64
    ): u64 {
        let sui_reserve = balance::value(&pool.sui_reserve);
        let token_reserve = balance::value(&pool.token_reserve);
        let (output, _) = calculate_output_with_fee(sui_amount, sui_reserve, token_reserve);
        output
    }

    /// Calculate quote for swapping tokens to SUI
    public fun quote_token_to_sui<T>(
        pool: &LiquidityPool<T>,
        token_amount: u64
    ): u64 {
        let sui_reserve = balance::value(&pool.sui_reserve);
        let token_reserve = balance::value(&pool.token_reserve);
        let (output, _) = calculate_output_with_fee(token_amount, token_reserve, sui_reserve);
        output
    }

    /// Get current price (SUI per token)
    public fun get_price<T>(pool: &LiquidityPool<T>): (u64, u64) {
        let sui_reserve = balance::value(&pool.sui_reserve);
        let token_reserve = balance::value(&pool.token_reserve);

        // Return as ratio to avoid floating point
        (sui_reserve, token_reserve)
    }
}
