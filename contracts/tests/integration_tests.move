#[test_only]
module peoplecoin::integration_tests {
    use sui::test_scenario::{Self as ts};
    use sui::coin::{Self, TreasuryCap};
    use sui::sui::SUI;
    use sui::object;
    use sui::clock;

    use peoplecoin::creator_token::{Self, TokenRegistry};
    use peoplecoin::buyback_vault::{Self, BuybackVault};
    use peoplecoin::amm::{Self, LiquidityPool};
    use peoplecoin::insurance::{Self, InsurancePool};
    use peoplecoin::platform_vault::{Self, PlatformVault};

    const ADMIN: address = @0xA;
    const CREATOR: address = @0xC;
    const INVESTOR1: address = @0xD;
    const INVESTOR2: address = @0xE;

    /// Test token for integration testing
    public struct INTEGRATION_TOKEN has drop {}

    #[test]
    /// Tests complete system lifecycle from token creation through trading to buyback enforcement.
    /// Verifies end-to-end integration of token registry, AMM, insurance pool, and buyback vault components.
    fun test_full_lifecycle() {
        let mut scenario = ts::begin(ADMIN);

        // Step 1: Create insurance pool
        {
            ts::next_tx(&mut scenario, ADMIN);

            let initial_fund = coin::mint_for_testing<SUI>(1_000_000_000, ts::ctx(&mut scenario));
            insurance::create_insurance_pool(
                initial_fund,
                50_000_000,  // 50M SUI approval threshold
                ts::ctx(&mut scenario)
            );
        };

        // Step 2: Creator creates token
        {
            ts::next_tx(&mut scenario, CREATOR);

            creator_token::create_token_for_testing<INTEGRATION_TOKEN>(
                8,  // decimals
                b"INTG",
                b"Integration Token",
                b"Token for integration testing",
                b"https://example.com/icon.png",
                10_000_000,  // 10M total supply
                3_000_000,   // 30% creator
                3_000_000,   // 30% reserve
                4_000_000,   // 40% liquidity
                5,  // 5 years
                1000000,  // buyback_start_date
                3,  // buyback_interval_months
                100000,  // buyback_amount_per_interval
                30,  // trading_block_duration_days
                true,  // vesting_enabled
                200,  // vesting_monthly_release_bps
                4000,  // vesting_total_release_bps
                100,  // $1.00 initial price
                ts::ctx(&mut scenario)
            );
        };

        // Step 3: Create AMM pool with liquidity
        {
            ts::next_tx(&mut scenario, CREATOR);

            let mut insurance_pool = ts::take_shared<InsurancePool>(&scenario);
            let mut registry = ts::take_shared<TokenRegistry>(&scenario);

            let sui = coin::mint_for_testing<SUI>(4_000_000, ts::ctx(&mut scenario));  // 1:1 ratio
            let tokens = coin::mint_for_testing<INTEGRATION_TOKEN>(4_000_000, ts::ctx(&mut scenario));

            amm::create_pool<INTEGRATION_TOKEN>(
                object::id(&registry),
                object::id(&insurance_pool),
                sui,
                tokens,
                ts::ctx(&mut scenario)
            );

            ts::return_shared(insurance_pool);
            ts::return_shared(registry);
        };

        // Step 4: Create buyback vault with collateral
        {
            ts::next_tx(&mut scenario, CREATOR);

            let mut registry = ts::take_shared<TokenRegistry>(&scenario);
            let mut clock = clock::create_for_testing(ts::ctx(&mut scenario));

            let collateral = coin::mint_for_testing<SUI>(500_000_000, ts::ctx(&mut scenario));  // 500M SUI collateral

            buyback_vault::create_vault<INTEGRATION_TOKEN>(
                object::id(&registry),
                collateral,
                5,  // 5 years
                20,  // 20 milestones (quarterly)
                3_000_000,  // Must burn 3M tokens total
                &clock,
                ts::ctx(&mut scenario)
            );

            clock::destroy_for_testing(clock);
            ts::return_shared(registry);
        };

        // Step 5: Investor 1 buys tokens
        {
            ts::next_tx(&mut scenario, INVESTOR1);

            let mut pool = ts::take_shared<LiquidityPool<INTEGRATION_TOKEN>>(&scenario);
            let mut insurance_pool = ts::take_shared<InsurancePool>(&scenario);
            let mut registry = ts::take_shared<TokenRegistry>(&scenario);

            let sui_in = coin::mint_for_testing<SUI>(100_000, ts::ctx(&mut scenario));
            let mut clock = clock::create_for_testing(ts::ctx(&mut scenario));

            let tokens_out = amm::swap_sui_for_token(
                &mut pool,
                sui_in,
                0,  // min_token_out
                &mut insurance_pool,
                &registry,
                &clock,
                ts::ctx(&mut scenario)
            );

            clock::destroy_for_testing(clock);

            // Verify got tokens
            assert!(coin::value(&tokens_out) > 0, 0);

            coin::burn_for_testing(tokens_out);
            ts::return_shared(pool);
            ts::return_shared(insurance_pool);
            ts::return_shared(registry);
        };

        // Step 6: Investor 2 buys tokens (price should be higher due to AMM)
        {
            ts::next_tx(&mut scenario, INVESTOR2);

            let mut pool = ts::take_shared<LiquidityPool<INTEGRATION_TOKEN>>(&scenario);
            let mut insurance_pool = ts::take_shared<InsurancePool>(&scenario);
            let mut registry = ts::take_shared<TokenRegistry>(&scenario);

            let sui_in = coin::mint_for_testing<SUI>(100_000, ts::ctx(&mut scenario));
            let expected_out = amm::quote_sui_to_token(&pool, 100_000);
            let mut clock = clock::create_for_testing(ts::ctx(&mut scenario));

            let tokens_out = amm::swap_sui_for_token(
                &mut pool,
                sui_in,
                expected_out,
                &mut insurance_pool,
                &registry,
                &clock,
                ts::ctx(&mut scenario)
            );

            clock::destroy_for_testing(clock);
            assert!(coin::value(&tokens_out) >= expected_out, 0);

            coin::burn_for_testing(tokens_out);
            ts::return_shared(pool);
            ts::return_shared(insurance_pool);
            ts::return_shared(registry);
        };

        // Step 7: Verify insurance pool collected fees
        {
            ts::next_tx(&mut scenario, ADMIN);

            let mut insurance_pool = ts::take_shared<InsurancePool>(&scenario);
            let (balance, fees, _, _, _) = insurance::get_pool_status(&insurance_pool);

            // Should have more than initial 1B SUI due to trading fees
            assert!(balance > 1_000_000_000, 0);
            assert!(fees > 1_000_000_000, 1);

            ts::return_shared(insurance_pool);
        };

        // Step 8: Verify pool statistics
        {
            ts::next_tx(&mut scenario, ADMIN);

            let mut pool = ts::take_shared<LiquidityPool<INTEGRATION_TOKEN>>(&scenario);
            let (_, _, _, volume, swaps) = amm::get_pool_info(&pool);

            assert!(volume == 200_000, 0);  // 100k + 100k
            assert!(swaps == 2, 1);

            ts::return_shared(pool);
        };

        ts::end(scenario);
    }

    #[test]
    /// Tests automatic buyback enforcement when creator misses deadline but vault has sufficient collateral.
    /// Verifies vault uses collateral to buy and burn tokens, marks default, records debt, and advances milestone.
    fun test_automatic_buyback_on_default() {
        let mut scenario = ts::begin(ADMIN);

        // Setup: Create all contracts with high collateral
        setup_full_system(&mut scenario);

        // Fast forward time past first buyback deadline
        {
            ts::next_tx(&mut scenario, CREATOR);

            let mut vault = ts::take_shared<BuybackVault<INTEGRATION_TOKEN>>(&scenario);
            let mut pool = ts::take_shared<LiquidityPool<INTEGRATION_TOKEN>>(&scenario);
            let mut insurance_pool = ts::take_shared<InsurancePool>(&scenario);
            let mut treasury_cap = ts::take_from_sender<TreasuryCap<INTEGRATION_TOKEN>>(&scenario);
            let mut registry = ts::take_shared<TokenRegistry>(&scenario);
            let mut platform_vault = ts::take_shared<peoplecoin::platform_vault::PlatformVault>(&scenario);

            // Create clock at future time (buyback_start + first interval + 1ms)
            let buyback_start = 1000000;  // Same as in setup
            // Calculate interval: 5 years / 20 milestones
            let interval_ms = (5 * 365 * 24 * 60 * 60 * 1000) / 20;
            let future_time = buyback_start + interval_ms + 1;
            let mut clock = clock::create_for_testing(ts::ctx(&mut scenario));
            clock::set_for_testing(&mut clock, future_time);

            // Get vault status before
            let (_, milestone_before, _, debt_before, defaulted_before, _) =
                buyback_vault::get_vault_status(&vault);

            assert!(milestone_before == 0, 0);
            assert!(debt_before == 0, 1);
            assert!(!defaulted_before, 2);

            // Trigger automatic enforcement
            buyback_vault::check_and_enforce_default(
                &mut vault,
                &mut platform_vault,
                &mut pool,
                &mut insurance_pool,
                &mut treasury_cap,
                &registry,
                &clock,
                ts::ctx(&mut scenario)
            );

            // Verify default was handled
            let (_, milestone_after, _, debt_after, defaulted_after, _) =
                buyback_vault::get_vault_status(&vault);

            assert!(defaulted_after, 3);  // Should be marked as defaulted
            assert!(debt_after > 0, 4);  // Should have debt
            assert!(milestone_after == 1, 5);  // Should have moved to next milestone

            clock::destroy_for_testing(clock);
            ts::return_to_sender(&scenario, treasury_cap);
            ts::return_shared(vault);
            ts::return_shared(platform_vault);
            ts::return_shared(pool);
            ts::return_shared(insurance_pool);
            ts::return_shared(registry);
        };

        ts::end(scenario);
    }

    #[test]
    /// Tests platform vault borrowing when vault collateral is insufficient to cover buyback.
    /// Verifies that vault uses all available collateral, then borrows from platform vault for deficit.
    fun test_insurance_claim_on_insufficient_collateral() {
        let mut scenario = ts::begin(ADMIN);

        // Setup with LOW collateral
        setup_system_with_low_collateral(&mut scenario);

        // Make token price very high by buying lots
        {
            ts::next_tx(&mut scenario, INVESTOR1);

            let mut pool = ts::take_shared<LiquidityPool<INTEGRATION_TOKEN>>(&scenario);
            let mut insurance_pool = ts::take_shared<InsurancePool>(&scenario);
            let mut registry = ts::take_shared<TokenRegistry>(&scenario);

            // Buy lots of tokens to increase price
            let sui_in = coin::mint_for_testing<SUI>(1_000_000, ts::ctx(&mut scenario));
            let mut clock = clock::create_for_testing(ts::ctx(&mut scenario));

            let tokens_out = amm::swap_sui_for_token(
                &mut pool,
                sui_in,
                0,
                &mut insurance_pool,
                &registry,
                &clock,
                ts::ctx(&mut scenario)
            );

            clock::destroy_for_testing(clock);
            coin::burn_for_testing(tokens_out);
            ts::return_shared(pool);
            ts::return_shared(insurance_pool);
            ts::return_shared(registry);
        };

        // Fast forward and trigger default (collateral won't be enough)
        {
            ts::next_tx(&mut scenario, CREATOR);

            let mut vault = ts::take_shared<BuybackVault<INTEGRATION_TOKEN>>(&scenario);
            let mut pool = ts::take_shared<LiquidityPool<INTEGRATION_TOKEN>>(&scenario);
            let mut insurance_pool = ts::take_shared<InsurancePool>(&scenario);
            let mut treasury_cap = ts::take_from_sender<TreasuryCap<INTEGRATION_TOKEN>>(&scenario);
            let mut registry = ts::take_shared<TokenRegistry>(&scenario);
            let mut platform_vault = ts::take_shared<peoplecoin::platform_vault::PlatformVault>(&scenario);

            let (_, _, _, _, _, collateral_before) = buyback_vault::get_vault_status(&vault);
            let (_, _, platform_lent_before, _, _) = platform_vault::get_vault_status(&platform_vault);

            let buyback_start = 1000000;  // Same as in setup
            // Calculate interval: 5 years / 20 milestones
            let interval_ms = (5 * 365 * 24 * 60 * 60 * 1000) / 20;
            let future_time = buyback_start + interval_ms + 1;
            let mut clock = clock::create_for_testing(ts::ctx(&mut scenario));
            clock::set_for_testing(&mut clock, future_time);

            buyback_vault::check_and_enforce_default(
                &mut vault,
                &mut platform_vault,
                &mut pool,
                &mut insurance_pool,
                &mut treasury_cap,
                &registry,
                &clock,
                ts::ctx(&mut scenario)
            );

            // Verify collateral was used and platform vault lent funds
            let (_, _, _, debt_after, defaulted_after, collateral_after) = buyback_vault::get_vault_status(&vault);
            assert!(collateral_after < collateral_before, 0);  // Collateral was used

            // Verify platform vault lent money
            let (_, _, platform_lent_after, _, _) = platform_vault::get_vault_status(&platform_vault);
            assert!(platform_lent_after > platform_lent_before, 1);  // Platform vault lent funds

            // Verify debt was created
            assert!(debt_after > 0, 2);  // Debt recorded
            assert!(defaulted_after, 3);

            clock::destroy_for_testing(clock);
            ts::return_to_sender(&scenario, treasury_cap);
            ts::return_shared(vault);
            ts::return_shared(platform_vault);
            ts::return_shared(pool);
            ts::return_shared(insurance_pool);
            ts::return_shared(registry);
        };

        ts::end(scenario);
    }

    #[test]
    /// Tests multiple consecutive buyback milestones being enforced automatically.
    /// Verifies that the vault can handle sequential defaults and properly tracks debt across multiple milestones.
    fun test_multiple_milestone_defaults() {
        let mut scenario = ts::begin(ADMIN);

        setup_full_system(&mut scenario);

        let buyback_start = 1000000;
        let interval_ms = (5 * 365 * 24 * 60 * 60 * 1000) / 20;

        // Trigger first milestone default
        {
            ts::next_tx(&mut scenario, CREATOR);
            let mut vault = ts::take_shared<BuybackVault<INTEGRATION_TOKEN>>(&scenario);
            let mut platform_vault = ts::take_shared<PlatformVault>(&scenario);
            let mut pool = ts::take_shared<LiquidityPool<INTEGRATION_TOKEN>>(&scenario);
            let mut insurance_pool = ts::take_shared<InsurancePool>(&scenario);
            let mut treasury_cap = ts::take_from_sender<TreasuryCap<INTEGRATION_TOKEN>>(&scenario);
            let mut registry = ts::take_shared<TokenRegistry>(&scenario);
            let mut clock = clock::create_for_testing(ts::ctx(&mut scenario));
            clock::set_for_testing(&mut clock, buyback_start + interval_ms + 1);

            buyback_vault::check_and_enforce_default(
                &mut vault, &mut platform_vault, &mut pool, &mut insurance_pool,
                &mut treasury_cap, &registry, &clock, ts::ctx(&mut scenario)
            );

            let (_, milestone1, _, debt1, _, _) = buyback_vault::get_vault_status(&vault);
            assert!(milestone1 == 1, 0);
            assert!(debt1 > 0, 1);

            clock::destroy_for_testing(clock);
            ts::return_to_sender(&scenario, treasury_cap);
            ts::return_shared(vault);
            ts::return_shared(platform_vault);
            ts::return_shared(pool);
            ts::return_shared(insurance_pool);
            ts::return_shared(registry);
        };

        // Trigger second milestone default
        {
            ts::next_tx(&mut scenario, CREATOR);
            let mut vault = ts::take_shared<BuybackVault<INTEGRATION_TOKEN>>(&scenario);
            let mut platform_vault = ts::take_shared<PlatformVault>(&scenario);
            let mut pool = ts::take_shared<LiquidityPool<INTEGRATION_TOKEN>>(&scenario);
            let mut insurance_pool = ts::take_shared<InsurancePool>(&scenario);
            let mut treasury_cap = ts::take_from_sender<TreasuryCap<INTEGRATION_TOKEN>>(&scenario);
            let mut registry = ts::take_shared<TokenRegistry>(&scenario);
            let mut clock = clock::create_for_testing(ts::ctx(&mut scenario));
            clock::set_for_testing(&mut clock, buyback_start + (interval_ms * 2) + 1);

            let (_, _, _, debt_before, _, _) = buyback_vault::get_vault_status(&vault);

            buyback_vault::check_and_enforce_default(
                &mut vault, &mut platform_vault, &mut pool, &mut insurance_pool,
                &mut treasury_cap, &registry, &clock, ts::ctx(&mut scenario)
            );

            let (_, milestone2, _, debt2, _, _) = buyback_vault::get_vault_status(&vault);
            assert!(milestone2 == 2, 2);
            assert!(debt2 > debt_before, 3);

            clock::destroy_for_testing(clock);
            ts::return_to_sender(&scenario, treasury_cap);
            ts::return_shared(vault);
            ts::return_shared(platform_vault);
            ts::return_shared(pool);
            ts::return_shared(insurance_pool);
            ts::return_shared(registry);
        };

        ts::end(scenario);
    }

    #[test]
    /// Tests that trading activity properly updates pool reserves and statistics.
    /// Verifies volume tracking, swap counts, and reserve changes after multiple trades.
    fun test_trading_updates_pool_state() {
        let mut scenario = ts::begin(ADMIN);

        setup_full_system(&mut scenario);

        // Perform multiple trades
        {
            ts::next_tx(&mut scenario, INVESTOR1);
            let mut pool = ts::take_shared<LiquidityPool<INTEGRATION_TOKEN>>(&scenario);
            let mut insurance_pool = ts::take_shared<InsurancePool>(&scenario);
            let mut registry = ts::take_shared<TokenRegistry>(&scenario);
            let mut clock = clock::create_for_testing(ts::ctx(&mut scenario));

            let (sui_before, token_before, _, volume_before, swaps_before) = amm::get_pool_info(&pool);

            // Trade 1: Buy tokens
            let sui_in1 = coin::mint_for_testing<SUI>(50_000, ts::ctx(&mut scenario));
            let tokens_out1 = amm::swap_sui_for_token(
                &mut pool, sui_in1, 0, &mut insurance_pool, &registry, &clock, ts::ctx(&mut scenario)
            );

            // Trade 2: Buy more tokens
            let sui_in2 = coin::mint_for_testing<SUI>(30_000, ts::ctx(&mut scenario));
            let tokens_out2 = amm::swap_sui_for_token(
                &mut pool, sui_in2, 0, &mut insurance_pool, &registry, &clock, ts::ctx(&mut scenario)
            );

            let (sui_after, token_after, _, volume_after, swaps_after) = amm::get_pool_info(&pool);

            // Verify reserves changed correctly
            assert!(sui_after > sui_before, 0);
            assert!(token_after < token_before, 1);
            assert!(volume_after == volume_before + 80_000, 2);
            assert!(swaps_after == swaps_before + 2, 3);

            clock::destroy_for_testing(clock);
            coin::burn_for_testing(tokens_out1);
            coin::burn_for_testing(tokens_out2);
            ts::return_shared(pool);
            ts::return_shared(insurance_pool);
            ts::return_shared(registry);
        };

        ts::end(scenario);
    }

    #[test]
    /// Tests that insurance pool accumulates fees from trading activity.
    /// Verifies fee collection mechanism and balance increases from swap fees.
    fun test_insurance_accumulates_trading_fees() {
        let mut scenario = ts::begin(ADMIN);

        setup_full_system(&mut scenario);

        let initial_balance;
        {
            ts::next_tx(&mut scenario, ADMIN);
            let insurance_pool = ts::take_shared<InsurancePool>(&scenario);
            let (balance, _, _, _, _) = insurance::get_pool_status(&insurance_pool);
            initial_balance = balance;
            ts::return_shared(insurance_pool);
        };

        // Execute trades to generate fees
        {
            ts::next_tx(&mut scenario, INVESTOR1);
            let mut pool = ts::take_shared<LiquidityPool<INTEGRATION_TOKEN>>(&scenario);
            let mut insurance_pool = ts::take_shared<InsurancePool>(&scenario);
            let mut registry = ts::take_shared<TokenRegistry>(&scenario);
            let mut clock = clock::create_for_testing(ts::ctx(&mut scenario));

            let sui_in = coin::mint_for_testing<SUI>(100_000, ts::ctx(&mut scenario));
            let tokens_out = amm::swap_sui_for_token(
                &mut pool, sui_in, 0, &mut insurance_pool, &registry, &clock, ts::ctx(&mut scenario)
            );

            clock::destroy_for_testing(clock);
            coin::burn_for_testing(tokens_out);
            ts::return_shared(pool);
            ts::return_shared(insurance_pool);
            ts::return_shared(registry);
        };

        // Verify insurance pool balance increased
        {
            ts::next_tx(&mut scenario, ADMIN);
            let insurance_pool = ts::take_shared<InsurancePool>(&scenario);
            let (balance_after, _, _, _, _) = insurance::get_pool_status(&insurance_pool);
            assert!(balance_after > initial_balance, 0);
            ts::return_shared(insurance_pool);
        };

        ts::end(scenario);
    }

    #[test]
    /// Tests that check_and_enforce_default does nothing when deadline has not passed.
    /// Verifies that the enforcement mechanism respects milestone deadlines.
    fun test_no_enforcement_before_deadline() {
        let mut scenario = ts::begin(ADMIN);

        setup_full_system(&mut scenario);

        {
            ts::next_tx(&mut scenario, CREATOR);
            let mut vault = ts::take_shared<BuybackVault<INTEGRATION_TOKEN>>(&scenario);
            let mut platform_vault = ts::take_shared<PlatformVault>(&scenario);
            let mut pool = ts::take_shared<LiquidityPool<INTEGRATION_TOKEN>>(&scenario);
            let mut insurance_pool = ts::take_shared<InsurancePool>(&scenario);
            let mut treasury_cap = ts::take_from_sender<TreasuryCap<INTEGRATION_TOKEN>>(&scenario);
            let mut registry = ts::take_shared<TokenRegistry>(&scenario);
            let mut clock = clock::create_for_testing(ts::ctx(&mut scenario));

            // Set clock to time BEFORE first deadline
            let buyback_start = 1000000;
            let before_deadline = buyback_start + 1000;
            clock::set_for_testing(&mut clock, before_deadline);

            let (_, milestone_before, _, debt_before, defaulted_before, _) =
                buyback_vault::get_vault_status(&vault);

            // Try to enforce (should do nothing)
            buyback_vault::check_and_enforce_default(
                &mut vault, &mut platform_vault, &mut pool, &mut insurance_pool,
                &mut treasury_cap, &registry, &clock, ts::ctx(&mut scenario)
            );

            let (_, milestone_after, _, debt_after, defaulted_after, _) =
                buyback_vault::get_vault_status(&vault);

            // Verify nothing changed
            assert!(milestone_after == milestone_before, 0);
            assert!(debt_after == debt_before, 1);
            assert!(defaulted_after == defaulted_before, 2);

            clock::destroy_for_testing(clock);
            ts::return_to_sender(&scenario, treasury_cap);
            ts::return_shared(vault);
            ts::return_shared(platform_vault);
            ts::return_shared(pool);
            ts::return_shared(insurance_pool);
            ts::return_shared(registry);
        };

        ts::end(scenario);
    }

    #[test]
    /// Tests price impact on AMM by comparing small vs large trade outputs.
    /// Verifies that larger trades receive worse prices due to slippage.
    fun test_amm_price_impact_on_trades() {
        let mut scenario = ts::begin(ADMIN);

        setup_full_system(&mut scenario);

        {
            ts::next_tx(&mut scenario, INVESTOR1);
            let mut pool = ts::take_shared<LiquidityPool<INTEGRATION_TOKEN>>(&scenario);

            // Small trade
            let small_output = amm::quote_sui_to_token(&pool, 1_000);

            // Large trade (10x)
            let large_output = amm::quote_sui_to_token(&pool, 10_000);

            // Large trade should have worse rate (< 10x output)
            assert!(large_output < small_output * 10, 0);

            ts::return_shared(pool);
        };

        ts::end(scenario);
    }

    #[test]
    /// Tests bidirectional AMM swaps (SUI→Token and Token→SUI).
    /// Verifies that both swap directions work correctly and reserves update properly.
    fun test_bidirectional_swaps() {
        let mut scenario = ts::begin(ADMIN);

        setup_full_system(&mut scenario);

        {
            ts::next_tx(&mut scenario, INVESTOR1);
            let mut pool = ts::take_shared<LiquidityPool<INTEGRATION_TOKEN>>(&scenario);
            let mut insurance_pool = ts::take_shared<InsurancePool>(&scenario);
            let mut registry = ts::take_shared<TokenRegistry>(&scenario);
            let mut clock = clock::create_for_testing(ts::ctx(&mut scenario));

            let (sui_initial, token_initial, _, _, _) = amm::get_pool_info(&pool);

            // Swap SUI for tokens
            let sui_in = coin::mint_for_testing<SUI>(10_000, ts::ctx(&mut scenario));
            let tokens_out = amm::swap_sui_for_token(
                &mut pool, sui_in, 0, &mut insurance_pool, &registry, &clock, ts::ctx(&mut scenario)
            );

            let (sui_mid, token_mid, _, _, _) = amm::get_pool_info(&pool);
            assert!(sui_mid > sui_initial, 0);
            assert!(token_mid < token_initial, 1);

            // Swap tokens back for SUI
            let sui_back = amm::swap_token_for_sui(
                &mut pool, tokens_out, 0, &mut insurance_pool, ts::ctx(&mut scenario)
            );

            let (sui_final, token_final, _, _, _) = amm::get_pool_info(&pool);

            // Due to fees, won't return to exact initial state
            assert!(coin::value(&sui_back) < 10_000, 2);  // Lost value to fees

            clock::destroy_for_testing(clock);
            coin::burn_for_testing(sui_back);
            ts::return_shared(pool);
            ts::return_shared(insurance_pool);
            ts::return_shared(registry);
        };

        ts::end(scenario);
    }

    #[test]
    /// Tests vault status tracking after default enforcement with sufficient collateral.
    /// Verifies milestone completion, debt recording, and collateral deduction.
    fun test_vault_state_after_enforcement() {
        let mut scenario = ts::begin(ADMIN);

        setup_full_system(&mut scenario);

        {
            ts::next_tx(&mut scenario, CREATOR);
            let mut vault = ts::take_shared<BuybackVault<INTEGRATION_TOKEN>>(&scenario);
            let mut platform_vault = ts::take_shared<PlatformVault>(&scenario);
            let mut pool = ts::take_shared<LiquidityPool<INTEGRATION_TOKEN>>(&scenario);
            let mut insurance_pool = ts::take_shared<InsurancePool>(&scenario);
            let mut treasury_cap = ts::take_from_sender<TreasuryCap<INTEGRATION_TOKEN>>(&scenario);
            let mut registry = ts::take_shared<TokenRegistry>(&scenario);
            let mut clock = clock::create_for_testing(ts::ctx(&mut scenario));

            let buyback_start = 1000000;
            let interval_ms = (5 * 365 * 24 * 60 * 60 * 1000) / 20;
            clock::set_for_testing(&mut clock, buyback_start + interval_ms + 1);

            let (_, _, _, _, _, collateral_before) = buyback_vault::get_vault_status(&vault);

            buyback_vault::check_and_enforce_default(
                &mut vault, &mut platform_vault, &mut pool, &mut insurance_pool,
                &mut treasury_cap, &registry, &clock, ts::ctx(&mut scenario)
            );

            let (_, milestone, _, debt, defaulted, collateral_after) =
                buyback_vault::get_vault_status(&vault);

            assert!(milestone == 1, 0);
            assert!(debt > 0, 1);
            assert!(defaulted, 2);
            assert!(collateral_after < collateral_before, 3);  // Collateral was used

            clock::destroy_for_testing(clock);
            ts::return_to_sender(&scenario, treasury_cap);
            ts::return_shared(vault);
            ts::return_shared(platform_vault);
            ts::return_shared(pool);
            ts::return_shared(insurance_pool);
            ts::return_shared(registry);
        };

        ts::end(scenario);
    }

    // Helper: Setup full system
    fun setup_full_system(scenario: &mut ts::Scenario) {
        // Platform vault
        {
            ts::next_tx(scenario, ADMIN);
            let initial_fund = coin::mint_for_testing<SUI>(100_000_000_000, ts::ctx(scenario));  // 100B SUI
            let mut clock = clock::create_for_testing(ts::ctx(scenario));
            platform_vault::create_vault(
                initial_fund,
                500_000_000,  // 500M SUI default credit limit
                &clock,
                ts::ctx(scenario)
            );
            clock::destroy_for_testing(clock);
        };

        // Insurance pool
        {
            ts::next_tx(scenario, ADMIN);
            let fund = coin::mint_for_testing<SUI>(1_000_000_000, ts::ctx(scenario));
            insurance::create_insurance_pool(fund, 50_000_000, ts::ctx(scenario));
        };

        // Creator token
        {
            ts::next_tx(scenario, CREATOR);
            creator_token::create_token_for_testing<INTEGRATION_TOKEN>(
                8, b"INTG", b"Integration Token", b"Test",
                b"https://example.com/icon.png",
                10_000_000, 3_000_000, 3_000_000, 4_000_000,
                5,
                1000000,  // buyback_start_date
                3,  // buyback_interval_months
                100000,  // buyback_amount_per_interval
                30,  // trading_block_duration_days
                true,  // vesting_enabled
                200,  // vesting_monthly_release_bps
                4000,  // vesting_total_release_bps
                100,  // initial_price_usd
                ts::ctx(scenario)
            );
        };

        // AMM pool
        {
            ts::next_tx(scenario, CREATOR);
            let mut insurance_pool = ts::take_shared<InsurancePool>(scenario);
            let mut registry = ts::take_shared<TokenRegistry>(scenario);
            let sui = coin::mint_for_testing<SUI>(4_000_000, ts::ctx(scenario));
            let tokens = coin::mint_for_testing<INTEGRATION_TOKEN>(4_000_000, ts::ctx(scenario));

            amm::create_pool<INTEGRATION_TOKEN>(
                object::id(&registry),
                object::id(&insurance_pool),
                sui, tokens, ts::ctx(scenario)
            );

            ts::return_shared(insurance_pool);
            ts::return_shared(registry);
        };

        // Buyback vault with HIGH collateral
        {
            ts::next_tx(scenario, CREATOR);
            let mut registry = ts::take_shared<TokenRegistry>(scenario);
            let mut clock = clock::create_for_testing(ts::ctx(scenario));
            // Set clock to buyback_start_date so vault deadlines are calculated from there
            clock::set_for_testing(&mut clock, 1000000);
            let collateral = coin::mint_for_testing<SUI>(500_000_000, ts::ctx(scenario));

            buyback_vault::create_vault<INTEGRATION_TOKEN>(
                object::id(&registry), collateral,
                5, 20, 20_000,  // Reduced to 20k total (1k per milestone) to minimize AMM slippage
                &clock, ts::ctx(scenario)
            );

            clock::destroy_for_testing(clock);
            ts::return_shared(registry);
        };
    }

    // Helper: Setup with low collateral
    fun setup_system_with_low_collateral(scenario: &mut ts::Scenario) {
        // Platform vault
        {
            ts::next_tx(scenario, ADMIN);
            let initial_fund = coin::mint_for_testing<SUI>(100_000_000_000, ts::ctx(scenario));  // 100B SUI
            let mut clock = clock::create_for_testing(ts::ctx(scenario));
            platform_vault::create_vault(
                initial_fund,
                500_000_000,  // 500M SUI default credit limit
                &clock,
                ts::ctx(scenario)
            );
            clock::destroy_for_testing(clock);
        };

        // Insurance pool
        {
            ts::next_tx(scenario, ADMIN);
            let fund = coin::mint_for_testing<SUI>(1_000_000_000, ts::ctx(scenario));
            insurance::create_insurance_pool(fund, 50_000_000, ts::ctx(scenario));
        };

        // Creator token
        {
            ts::next_tx(scenario, CREATOR);
            creator_token::create_token_for_testing<INTEGRATION_TOKEN>(
                8, b"INTG", b"Integration Token", b"Test",
                b"https://example.com/icon.png",
                10_000_000, 3_000_000, 3_000_000, 4_000_000,
                5,
                1000000,  // buyback_start_date
                3,  // buyback_interval_months
                100000,  // buyback_amount_per_interval
                30,  // trading_block_duration_days
                true,  // vesting_enabled
                200,  // vesting_monthly_release_bps
                4000,  // vesting_total_release_bps
                100,  // initial_price_usd
                ts::ctx(scenario)
            );
        };

        // AMM pool
        {
            ts::next_tx(scenario, CREATOR);
            let mut insurance_pool = ts::take_shared<InsurancePool>(scenario);
            let mut registry = ts::take_shared<TokenRegistry>(scenario);
            let sui = coin::mint_for_testing<SUI>(4_000_000, ts::ctx(scenario));
            let tokens = coin::mint_for_testing<INTEGRATION_TOKEN>(4_000_000, ts::ctx(scenario));

            amm::create_pool<INTEGRATION_TOKEN>(
                object::id(&registry),
                object::id(&insurance_pool),
                sui, tokens, ts::ctx(scenario)
            );

            ts::return_shared(insurance_pool);
            ts::return_shared(registry);
        };

        // Buyback vault with LOW collateral (will be insufficient)
        {
            ts::next_tx(scenario, CREATOR);
            let mut registry = ts::take_shared<TokenRegistry>(scenario);
            let mut clock = clock::create_for_testing(ts::ctx(scenario));
            // Set clock to buyback_start_date so vault deadlines are calculated from there
            clock::set_for_testing(&mut clock, 1000000);
            let collateral = coin::mint_for_testing<SUI>(100, ts::ctx(scenario));  // Only 100 SUI - truly insufficient!

            buyback_vault::create_vault<INTEGRATION_TOKEN>(
                object::id(&registry), collateral,
                5, 20, 20_000,  // Reduced to 20k total (1k per milestone) to minimize AMM slippage
                &clock, ts::ctx(scenario)
            );

            clock::destroy_for_testing(clock);
            ts::return_shared(registry);
        };
    }
}
