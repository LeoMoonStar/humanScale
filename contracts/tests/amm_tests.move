#[test_only]
module peoplecoin::amm_tests {
    use sui::test_scenario::{Self as ts, Scenario};
    use sui::coin::{Self, Coin};
    use sui::sui::SUI;
    use sui::object::{Self};
    use sui::clock;
    use peoplecoin::amm::{Self, LiquidityPool, LPToken};
    use peoplecoin::insurance::{Self, InsurancePool};
    use peoplecoin::creator_token::{Self, TokenRegistry};

    const ADMIN: address = @0xA;
    const LP_PROVIDER: address = @0xB;
    const TRADER: address = @0xC;
    const CREATOR: address = @0xD;

    /// Test token
    public struct TEST_TOKEN has drop {}

    #[test]
    /// Tests AMM liquidity pool creation with initial SUI and token reserves.
    /// Verifies pool initialization, reserve balances, and LP token supply generation.
    fun test_create_pool() {
        let mut scenario = ts::begin(ADMIN);

        // Create insurance pool first
        {
            ts::next_tx(&mut scenario, ADMIN);

            let initial_fund = coin::mint_for_testing<SUI>(100_000_000, ts::ctx(&mut scenario));
            insurance::create_insurance_pool(
                initial_fund,
                10_000_000,  // approval threshold
                ts::ctx(&mut scenario)
            );
        };

        // Create AMM pool
        {
            ts::next_tx(&mut scenario, LP_PROVIDER);

            let mut insurance_pool = ts::take_shared<InsurancePool>(&scenario);
            let pool_id = object::id(&insurance_pool);

            let sui = coin::mint_for_testing<SUI>(1_000_000, ts::ctx(&mut scenario));
            let tokens = coin::mint_for_testing<TEST_TOKEN>(1_000_000, ts::ctx(&mut scenario));

            amm::create_pool<TEST_TOKEN>(
                pool_id,  // token_registry_id
                pool_id,  // insurance_pool_id
                sui,
                tokens,
                ts::ctx(&mut scenario)
            );

            ts::return_shared(insurance_pool);
        };

        // Verify pool created
        {
            ts::next_tx(&mut scenario, LP_PROVIDER);

            let mut pool = ts::take_shared<LiquidityPool<TEST_TOKEN>>(&scenario);
            let (sui_reserve, token_reserve, lp_supply, _, _) = amm::get_pool_info(&pool);

            assert!(sui_reserve == 1_000_000, 0);
            assert!(token_reserve == 1_000_000, 1);
            assert!(lp_supply > 0, 2);

            ts::return_shared(pool);
        };

        ts::end(scenario);
    }

    #[test]
    /// Tests swapping SUI for tokens through the AMM pool.
    /// Verifies correct token output amount, reserve updates, and quote accuracy.
    fun test_swap_sui_for_token() {
        let mut scenario = ts::begin(ADMIN);

        // Setup: Create insurance pool and AMM pool
        setup_pools(&mut scenario);

        // Swap SUI for tokens
        {
            ts::next_tx(&mut scenario, TRADER);

            let mut pool = ts::take_shared<LiquidityPool<TEST_TOKEN>>(&scenario);
            let mut insurance_pool = ts::take_shared<InsurancePool>(&scenario);
            let mut registry = ts::take_shared<TokenRegistry>(&scenario);

            let (sui_before, token_before, _, _, _) = amm::get_pool_info(&pool);

            let sui_in = coin::mint_for_testing<SUI>(10_000, ts::ctx(&mut scenario));
            let expected_out = amm::quote_sui_to_token(&pool, 10_000);
            let clock = clock::create_for_testing(ts::ctx(&mut scenario));

            let tokens_out = amm::swap_sui_for_token(
                &mut pool,
                sui_in,
                expected_out,  // min_token_out
                &mut insurance_pool,
                &registry,
                &clock,
                ts::ctx(&mut scenario)
            );

            let actual_out = coin::value(&tokens_out);
            assert!(actual_out >= expected_out, 0);

            // Verify reserves changed
            let (sui_after, token_after, _, _, _) = amm::get_pool_info(&pool);
            assert!(sui_after > sui_before, 1);
            assert!(token_after < token_before, 2);

            clock::destroy_for_testing(clock);
            coin::burn_for_testing(tokens_out);
            ts::return_shared(pool);
            ts::return_shared(insurance_pool);
            ts::return_shared(registry);
        };

        ts::end(scenario);
    }

    #[test]
    /// Tests swapping tokens for SUI through the AMM pool.
    /// Verifies correct SUI output amount, reserve changes, and quote calculation.
    fun test_swap_token_for_sui() {
        let mut scenario = ts::begin(ADMIN);

        setup_pools(&mut scenario);

        {
            ts::next_tx(&mut scenario, TRADER);

            let mut pool = ts::take_shared<LiquidityPool<TEST_TOKEN>>(&scenario);
            let mut insurance_pool = ts::take_shared<InsurancePool>(&scenario);

            let (sui_before, token_before, _, _, _) = amm::get_pool_info(&pool);

            let token_in = coin::mint_for_testing<TEST_TOKEN>(10_000, ts::ctx(&mut scenario));
            let expected_out = amm::quote_token_to_sui(&pool, 10_000);

            let sui_out = amm::swap_token_for_sui(
                &mut pool,
                token_in,
                expected_out,
                &mut insurance_pool,
                ts::ctx(&mut scenario)
            );

            let actual_out = coin::value(&sui_out);
            assert!(actual_out >= expected_out, 0);

            // Verify reserves changed
            let (sui_after, token_after, _, _, _) = amm::get_pool_info(&pool);
            assert!(sui_after < sui_before, 1);
            assert!(token_after > token_before, 2);

            coin::burn_for_testing(sui_out);
            ts::return_shared(pool);
            ts::return_shared(insurance_pool);
        };

        ts::end(scenario);
    }

    #[test]
    /// Tests adding liquidity to an existing AMM pool.
    /// Verifies LP token minting and proportional reserve increases.
    fun test_add_liquidity() {
        let mut scenario = ts::begin(ADMIN);

        setup_pools(&mut scenario);

        {
            ts::next_tx(&mut scenario, LP_PROVIDER);

            let mut pool = ts::take_shared<LiquidityPool<TEST_TOKEN>>(&scenario);

            let (_, _, lp_supply_before, _, _) = amm::get_pool_info(&pool);

            let sui = coin::mint_for_testing<SUI>(100_000, ts::ctx(&mut scenario));
            let tokens = coin::mint_for_testing<TEST_TOKEN>(100_000, ts::ctx(&mut scenario));

            amm::add_liquidity(
                &mut pool,
                sui,
                tokens,
                0,  // min_lp_amount
                ts::ctx(&mut scenario)
            );

            let (_, _, lp_supply_after, _, _) = amm::get_pool_info(&pool);
            assert!(lp_supply_after > lp_supply_before, 0);

            ts::return_shared(pool);
        };

        ts::end(scenario);
    }

    #[test]
    /// Tests that AMM maintains constant product formula (x * y = k) after swaps.
    /// Verifies k value increases slightly due to LP fees being added to reserves.
    fun test_constant_product_formula() {
        let mut scenario = ts::begin(ADMIN);

        setup_pools(&mut scenario);

        {
            ts::next_tx(&mut scenario, TRADER);

            let mut pool = ts::take_shared<LiquidityPool<TEST_TOKEN>>(&scenario);
            let mut insurance_pool = ts::take_shared<InsurancePool>(&scenario);
            let mut registry = ts::take_shared<TokenRegistry>(&scenario);

            let (sui_before, token_before, _, _, _) = amm::get_pool_info(&pool);
            let k_before = sui_before * token_before;

            // Swap
            let sui_in = coin::mint_for_testing<SUI>(1_000, ts::ctx(&mut scenario));
            let clock = clock::create_for_testing(ts::ctx(&mut scenario));
            let tokens_out = amm::swap_sui_for_token(
                &mut pool,
                sui_in,
                0,
                &mut insurance_pool,
                &registry,
                &clock,
                ts::ctx(&mut scenario)
            );

            let (sui_after, token_after, _, _, _) = amm::get_pool_info(&pool);
            let k_after = sui_after * token_after;

            // k should increase slightly due to fees (0.4% goes to LPs)
            assert!(k_after >= k_before, 0);

            clock::destroy_for_testing(clock);
            coin::burn_for_testing(tokens_out);
            ts::return_shared(pool);
            ts::return_shared(insurance_pool);
            ts::return_shared(registry);
        };

        ts::end(scenario);
    }

    #[test]
    /// Tests price impact and slippage on AMM trades of different sizes.
    /// Verifies that larger trades receive worse exchange rates due to price impact.
    fun test_price_impact() {
        let mut scenario = ts::begin(ADMIN);

        setup_pools(&mut scenario);

        {
            ts::next_tx(&mut scenario, TRADER);

            let mut pool = ts::take_shared<LiquidityPool<TEST_TOKEN>>(&scenario);

            // Small swap
            let small_out = amm::quote_sui_to_token(&pool, 1_000);

            // Large swap (10x)
            let large_out = amm::quote_sui_to_token(&pool, 10_000);

            // Large swap should have worse rate due to price impact
            // If linear, large_out would be 10x small_out
            // But with price impact, it should be less
            assert!(large_out < small_out * 10, 0);

            ts::return_shared(pool);
        };

        ts::end(scenario);
    }

    // Helper function to setup pools
    fun setup_pools(scenario: &mut Scenario) {
        // Create insurance pool
        {
            ts::next_tx(scenario, ADMIN);

            let initial_fund = coin::mint_for_testing<SUI>(100_000_000, ts::ctx(scenario));
            insurance::create_insurance_pool(
                initial_fund,
                10_000_000,
                ts::ctx(scenario)
            );
        };

        // Create token registry
        {
            ts::next_tx(scenario, CREATOR);

            creator_token::create_token_for_testing<TEST_TOKEN>(
                8,  // decimals
                b"TEST",
                b"Test Token",
                b"Test",
                b"https://example.com/icon.png",
                10_000_000,  // total_supply
                3_000_000,   // creator_allocation
                3_000_000,   // platform_reserve
                4_000_000,   // liquidity_allocation
                5,           // buyback_duration_years
                0,           // buyback_start_date
                3,           // buyback_interval_months
                100000,      // buyback_amount_per_interval
                0,           // trading_block_duration_days (no block) - u8
                false,       // vesting_enabled
                0,           // vesting_monthly_release_bps
                0,           // vesting_total_release_bps
                100,         // initial_price_usd
                ts::ctx(scenario)
            );
        };

        // Create AMM pool
        {
            ts::next_tx(scenario, LP_PROVIDER);

            let mut insurance_pool = ts::take_shared<InsurancePool>(scenario);
            let pool_id = object::id(&insurance_pool);

            let sui = coin::mint_for_testing<SUI>(1_000_000, ts::ctx(scenario));
            let tokens = coin::mint_for_testing<TEST_TOKEN>(1_000_000, ts::ctx(scenario));

            amm::create_pool<TEST_TOKEN>(
                pool_id,
                pool_id,
                sui,
                tokens,
                ts::ctx(scenario)
            );

            ts::return_shared(insurance_pool);
        };
    }
}
