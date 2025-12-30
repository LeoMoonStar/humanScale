#[test_only]
module peoplecoin::integration_tests {
    use sui::test_scenario::{Self as ts};
    use sui::coin::{Self, TreasuryCap};
    use sui::sui::SUI;
    use sui::object::{Self};
    use sui::clock::{Self, Clock};
    use sui::test_utils;

    use peoplecoin::creator_token::{Self, TokenRegistry, AdminCap};
    use peoplecoin::buyback_vault::{Self, BuybackVault};
    use peoplecoin::amm::{Self, LiquidityPool};
    use peoplecoin::insurance::{Self, InsurancePool};

    const ADMIN: address = @0xA;
    const CREATOR: address = @0xC;
    const INVESTOR1: address = @0xD;
    const INVESTOR2: address = @0xE;

    /// Test token for integration testing
    struct INTEGRATION_TOKEN has drop {}

    #[test]
    /// Full lifecycle test: Create token → Pool → Trade → Buyback → Default
    fun test_full_lifecycle() {
        let scenario = ts::begin(ADMIN);

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

            creator_token::create_token<INTEGRATION_TOKEN>(
                INTEGRATION_TOKEN {},
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
                100,  // $1.00
                ts::ctx(&mut scenario)
            );
        };

        // Step 3: Create AMM pool with liquidity
        {
            ts::next_tx(&mut scenario, CREATOR);

            let insurance_pool = ts::take_shared<InsurancePool>(&scenario);
            let registry = ts::take_shared<TokenRegistry>(&scenario);

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

            let registry = ts::take_shared<TokenRegistry>(&scenario);
            let clock = clock::create_for_testing(ts::ctx(&mut scenario));

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

            let pool = ts::take_shared<LiquidityPool<INTEGRATION_TOKEN>>(&scenario);
            let insurance_pool = ts::take_shared<InsurancePool>(&scenario);

            let sui_in = coin::mint_for_testing<SUI>(100_000, ts::ctx(&mut scenario));

            let tokens_out = amm::swap_sui_for_token(
                &mut pool,
                sui_in,
                0,  // min_token_out
                &mut insurance_pool,
                ts::ctx(&mut scenario)
            );

            // Verify got tokens
            assert!(coin::value(&tokens_out) > 0, 0);

            coin::burn_for_testing(tokens_out);
            ts::return_shared(pool);
            ts::return_shared(insurance_pool);
        };

        // Step 6: Investor 2 buys tokens (price should be higher due to AMM)
        {
            ts::next_tx(&mut scenario, INVESTOR2);

            let pool = ts::take_shared<LiquidityPool<INTEGRATION_TOKEN>>(&scenario);
            let insurance_pool = ts::take_shared<InsurancePool>(&scenario);

            let sui_in = coin::mint_for_testing<SUI>(100_000, ts::ctx(&mut scenario));
            let expected_out = amm::quote_sui_to_token(&pool, 100_000);

            let tokens_out = amm::swap_sui_for_token(
                &mut pool,
                sui_in,
                expected_out,
                &mut insurance_pool,
                ts::ctx(&mut scenario)
            );

            assert!(coin::value(&tokens_out) >= expected_out, 0);

            coin::burn_for_testing(tokens_out);
            ts::return_shared(pool);
            ts::return_shared(insurance_pool);
        };

        // Step 7: Verify insurance pool collected fees
        {
            ts::next_tx(&mut scenario, ADMIN);

            let insurance_pool = ts::take_shared<InsurancePool>(&scenario);
            let (balance, fees, _, _, _) = insurance::get_pool_status(&insurance_pool);

            // Should have more than initial 1B SUI due to trading fees
            assert!(balance > 1_000_000_000, 0);
            assert!(fees > 1_000_000_000, 1);

            ts::return_shared(insurance_pool);
        };

        // Step 8: Verify pool statistics
        {
            ts::next_tx(&mut scenario, ADMIN);

            let pool = ts::take_shared<LiquidityPool<INTEGRATION_TOKEN>>(&scenario);
            let (_, _, _, volume, swaps) = amm::get_pool_info(&pool);

            assert!(volume == 200_000, 0);  // 100k + 100k
            assert!(swaps == 2, 1);

            ts::return_shared(pool);
        };

        ts::end(scenario);
    }

    #[test]
    /// Test automatic buyback enforcement when creator defaults
    fun test_automatic_buyback_on_default() {
        let scenario = ts::begin(ADMIN);

        // Setup: Create all contracts
        setup_full_system(&mut scenario);

        // Fast forward time past first buyback deadline
        {
            ts::next_tx(&mut scenario, ADMIN);

            let vault = ts::take_shared<BuybackVault<INTEGRATION_TOKEN>>(&scenario);
            let pool = ts::take_shared<LiquidityPool<INTEGRATION_TOKEN>>(&scenario);
            let insurance_pool = ts::take_shared<InsurancePool>(&scenario);
            let treasury_cap = ts::take_from_sender<TreasuryCap<INTEGRATION_TOKEN>>(&scenario);

            // Create clock at future time (3 months + 1 day)
            let future_time = 90 * 24 * 60 * 60 * 1000 + 1;  // 90 days in ms + 1ms
            let clock = clock::create_for_testing(ts::ctx(&mut scenario));
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
                &mut pool,
                &mut insurance_pool,
                &mut treasury_cap,
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
            ts::return_shared(pool);
            ts::return_shared(insurance_pool);
        };

        ts::end(scenario);
    }

    #[test]
    /// Test insurance claim when collateral insufficient
    fun test_insurance_claim_on_insufficient_collateral() {
        let scenario = ts::begin(ADMIN);

        // Setup with LOW collateral
        setup_system_with_low_collateral(&mut scenario);

        // Make token price very high by buying lots
        {
            ts::next_tx(&mut scenario, INVESTOR1);

            let pool = ts::take_shared<LiquidityPool<INTEGRATION_TOKEN>>(&scenario);
            let insurance_pool = ts::take_shared<InsurancePool>(&scenario);

            // Buy lots of tokens to increase price
            let sui_in = coin::mint_for_testing<SUI>(1_000_000, ts::ctx(&mut scenario));

            let tokens_out = amm::swap_sui_for_token(
                &mut pool,
                sui_in,
                0,
                &mut insurance_pool,
                ts::ctx(&mut scenario)
            );

            coin::burn_for_testing(tokens_out);
            ts::return_shared(pool);
            ts::return_shared(insurance_pool);
        };

        // Fast forward and trigger default (collateral won't be enough)
        {
            ts::next_tx(&mut scenario, ADMIN);

            let vault = ts::take_shared<BuybackVault<INTEGRATION_TOKEN>>(&scenario);
            let pool = ts::take_shared<LiquidityPool<INTEGRATION_TOKEN>>(&scenario);
            let insurance_pool = ts::take_shared<InsurancePool>(&scenario);
            let treasury_cap = ts::take_from_sender<TreasuryCap<INTEGRATION_TOKEN>>(&scenario);

            let (claims_before, _, _, submitted_before, _) = insurance::get_pool_status(&insurance_pool);

            let future_time = 90 * 24 * 60 * 60 * 1000 + 1;
            let clock = clock::create_for_testing(ts::ctx(&mut scenario));
            clock::set_for_testing(&mut clock, future_time);

            buyback_vault::check_and_enforce_default(
                &mut vault,
                &mut pool,
                &mut insurance_pool,
                &mut treasury_cap,
                &clock,
                ts::ctx(&mut scenario)
            );

            // Verify insurance claim was submitted
            let (_, _, _, submitted_after, _) = insurance::get_pool_status(&insurance_pool);
            assert!(submitted_after > submitted_before, 0);

            clock::destroy_for_testing(clock);
            ts::return_to_sender(&scenario, treasury_cap);
            ts::return_shared(vault);
            ts::return_shared(pool);
            ts::return_shared(insurance_pool);
        };

        ts::end(scenario);
    }

    // Helper: Setup full system
    fun setup_full_system(scenario: &mut ts::Scenario) {
        // Insurance pool
        {
            ts::next_tx(scenario, ADMIN);
            let fund = coin::mint_for_testing<SUI>(1_000_000_000, ts::ctx(scenario));
            insurance::create_insurance_pool(fund, 50_000_000, ts::ctx(scenario));
        };

        // Creator token
        {
            ts::next_tx(scenario, CREATOR);
            creator_token::create_token<INTEGRATION_TOKEN>(
                INTEGRATION_TOKEN {},
                8, b"INTG", b"Integration Token", b"Test",
                b"https://example.com/icon.png",
                10_000_000, 3_000_000, 3_000_000, 4_000_000,
                5, 100, ts::ctx(scenario)
            );
        };

        // AMM pool
        {
            ts::next_tx(scenario, CREATOR);
            let insurance_pool = ts::take_shared<InsurancePool>(scenario);
            let registry = ts::take_shared<TokenRegistry>(scenario);
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
            let registry = ts::take_shared<TokenRegistry>(scenario);
            let clock = clock::create_for_testing(ts::ctx(scenario));
            let collateral = coin::mint_for_testing<SUI>(500_000_000, ts::ctx(scenario));

            buyback_vault::create_vault<INTEGRATION_TOKEN>(
                object::id(&registry), collateral,
                5, 20, 3_000_000,
                &clock, ts::ctx(scenario)
            );

            clock::destroy_for_testing(clock);
            ts::return_shared(registry);
        };
    }

    // Helper: Setup with low collateral
    fun setup_system_with_low_collateral(scenario: &mut ts::Scenario) {
        // Insurance pool
        {
            ts::next_tx(scenario, ADMIN);
            let fund = coin::mint_for_testing<SUI>(1_000_000_000, ts::ctx(scenario));
            insurance::create_insurance_pool(fund, 50_000_000, ts::ctx(scenario));
        };

        // Creator token
        {
            ts::next_tx(scenario, CREATOR);
            creator_token::create_token<INTEGRATION_TOKEN>(
                INTEGRATION_TOKEN {},
                8, b"INTG", b"Integration Token", b"Test",
                b"https://example.com/icon.png",
                10_000_000, 3_000_000, 3_000_000, 4_000_000,
                5, 100, ts::ctx(scenario)
            );
        };

        // AMM pool
        {
            ts::next_tx(scenario, CREATOR);
            let insurance_pool = ts::take_shared<InsurancePool>(scenario);
            let registry = ts::take_shared<TokenRegistry>(scenario);
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
            let registry = ts::take_shared<TokenRegistry>(scenario);
            let clock = clock::create_for_testing(ts::ctx(scenario));
            let collateral = coin::mint_for_testing<SUI>(10_000, ts::ctx(scenario));  // Only 10k SUI!

            buyback_vault::create_vault<INTEGRATION_TOKEN>(
                object::id(&registry), collateral,
                5, 20, 3_000_000,
                &clock, ts::ctx(scenario)
            );

            clock::destroy_for_testing(clock);
            ts::return_shared(registry);
        };
    }
}
