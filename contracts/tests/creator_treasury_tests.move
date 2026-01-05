/// Comprehensive tests for Creator Treasury module
///
/// Test coverage:
/// 1. Treasury creation and initialization
/// 2. Monthly unlock mechanism (dual unlock)
/// 3. Creator selling (unrestricted)
/// 4. Buyback execution (direct burn)
/// 5. Buyback execution (market purchase)
/// 6. Collateral management
/// 7. Edge cases and error conditions

#[test_only]
module peoplecoin::creator_treasury_tests {
    use sui::test_scenario::{Self as test, Scenario, next_tx, ctx};
    use sui::coin::{Self, Coin, TreasuryCap};
    use sui::test_utils;
    use sui::clock::{Self, Clock};
    use sui::sui::SUI;
    use peoplecoin::creator_treasury::{Self, CreatorTreasury};
    use std::vector;

    /// Test coin
    public struct TEST_COIN has drop {}

    const CREATOR: address = @0xC;
    const PLATFORM: address = @0xA;
    const ALICE: address = @0xB;

    const TOTAL_ALLOCATION: u64 = 1_000_000_000; // 1B tokens
    const CREATOR_PORTION_BPS: u16 = 4000;       // 40%
    const PLATFORM_PORTION_BPS: u16 = 6000;      // 60%
    const CREATOR_MONTHLY_BPS: u16 = 200;        // 2% per month
    const PLATFORM_MONTHLY_BPS: u16 = 300;       // 3% per month
    const MONTH_MS: u64 = 30 * 24 * 60 * 60 * 1000;

    /// Helper: Create test clock
    fun create_clock(scenario: &mut Scenario): Clock {
        clock::create_for_testing(ctx(scenario))
    }

    /// Helper: Advance clock by milliseconds
    fun advance_clock(clock: &mut Clock, ms: u64) {
        clock::increment_for_testing(clock, ms);
    }

    /// Helper: Create treasury with default params (takes treasury_cap as parameter)
    fun create_test_treasury(treasury_cap: &mut TreasuryCap<TEST_COIN>, scenario: &mut Scenario, clock: &Clock) {
        next_tx(scenario, CREATOR);
        {
            // Mint creator allocation
            let creator_tokens = coin::mint(treasury_cap, TOTAL_ALLOCATION, ctx(scenario));

            // Create buyback milestones (3 milestones, quarterly)
            let mut milestones = vector::empty();
            let current_time = clock::timestamp_ms(clock);

            // Milestone 1: 3 months, burn 10M
            vector::push_back(&mut milestones, creator_treasury::create_test_milestone(
                1,
                current_time + (3 * MONTH_MS),
                10_000_000
            ));

            // Milestone 2: 6 months, burn 10M
            vector::push_back(&mut milestones, creator_treasury::create_test_milestone(
                2,
                current_time + (6 * MONTH_MS),
                10_000_000
            ));

            // Milestone 3: 9 months, burn 10M
            vector::push_back(&mut milestones, creator_treasury::create_test_milestone(
                3,
                current_time + (9 * MONTH_MS),
                10_000_000
            ));

            // Create treasury
            creator_treasury::create_treasury(
                creator_tokens,
                PLATFORM,
                CREATOR_PORTION_BPS,
                PLATFORM_PORTION_BPS,
                CREATOR_MONTHLY_BPS,
                PLATFORM_MONTHLY_BPS,
                MONTH_MS,
                milestones,
                clock,
                ctx(scenario)
            );
        }
    }

    // ===== INITIALIZATION TESTS =====

    #[test]
    /// Tests creator treasury initialization with vesting schedule.
    /// Verifies treasury creation, token allocation, and vesting configuration setup.
    fun test_treasury_creation() {
        let mut scenario_val = test::begin(CREATOR);
        let scenario = &mut scenario_val;
        let mut clock = create_clock(scenario);

        // Create currency once per test
        let mut treasury_cap = coin::create_treasury_cap_for_testing<TEST_COIN>(ctx(scenario));

        create_test_treasury(&mut treasury_cap, scenario, &clock);

        // Verify treasury exists and has correct initial state
        next_tx(scenario, CREATOR);
        {
            let mut treasury = test::take_shared<CreatorTreasury<TEST_COIN>>(scenario);

            let (
                creator,
                token_balance,
                creator_vested,
                platform_distributed,
                bought_back,
                collateral
            ) = creator_treasury::get_treasury_status(&treasury);

            assert!(creator == CREATOR, 0);
            assert!(token_balance == TOTAL_ALLOCATION, 1);
            assert!(creator_vested == 0, 2);
            assert!(platform_distributed == 0, 3);
            assert!(bought_back == 0, 4);
            assert!(collateral == 0, 5);

            let (
                total_alloc,
                creator_cap,
                platform_cap,
                creator_monthly,
                platform_monthly
            ) = creator_treasury::get_allocation_details(&treasury);

            assert!(total_alloc == TOTAL_ALLOCATION, 6);
            assert!(creator_cap == 400_000_000, 7); // 40% of 1B
            assert!(platform_cap == 600_000_000, 8); // 60% of 1B
            assert!(creator_monthly == CREATOR_MONTHLY_BPS, 9);
            assert!(platform_monthly == PLATFORM_MONTHLY_BPS, 10);

            test::return_shared(treasury);
        };

        clock::destroy_for_testing(clock);
        test_utils::destroy(treasury_cap);
        test::end(scenario_val);
    }

    // ===== MONTHLY UNLOCK TESTS =====

    #[test]
    /// Tests vesting unlock for the first month after vesting starts.
    /// Verifies correct unlock amount calculation and vested balance tracking.
    fun test_monthly_unlock_first_month() {
        let mut scenario_val = test::begin(CREATOR);
        let scenario = &mut scenario_val;
        let mut clock = create_clock(scenario);

        // Create currency once per test
        let mut treasury_cap = coin::create_treasury_cap_for_testing<TEST_COIN>(ctx(scenario));

        create_test_treasury(&mut treasury_cap, scenario, &clock);

        // Advance time by 1 month
        advance_clock(&mut clock, MONTH_MS);

        // Process unlock
        next_tx(scenario, ALICE); // Anyone can call
        {
            let mut treasury = test::take_shared<CreatorTreasury<TEST_COIN>>(scenario);

            creator_treasury::process_monthly_unlock(&mut treasury, &clock, ctx(scenario));

            let (
                _creator,
                token_balance,
                creator_vested,
                platform_distributed,
                _bought_back,
                _collateral
            ) = creator_treasury::get_treasury_status(&treasury);

            // Creator: 2% of 1B = 20M vested
            assert!(creator_vested == 20_000_000, 0);

            // Platform: 3% of 1B = 30M distributed
            assert!(platform_distributed == 30_000_000, 1);

            // Balance should decrease by platform distribution
            assert!(token_balance == TOTAL_ALLOCATION - 30_000_000, 2);

            test::return_shared(treasury);
        };

        // Platform should receive tokens
        next_tx(scenario, PLATFORM);
        {
            let platform_tokens = test::take_from_sender<Coin<TEST_COIN>>(scenario);
            assert!(coin::value(&platform_tokens) == 30_000_000, 3);
            test::return_to_sender(scenario, platform_tokens);
        };

        clock::destroy_for_testing(clock);
        test_utils::destroy(treasury_cap);
        test::end(scenario_val);
    }

    #[test]
    /// Tests vesting unlock across multiple months with time progression.
    /// Verifies cumulative vesting and monthly unlock calculations over time.
    fun test_monthly_unlock_multiple_months() {
        let mut scenario_val = test::begin(CREATOR);
        let scenario = &mut scenario_val;
        let mut clock = create_clock(scenario);

        // Create currency once per test
        let mut treasury_cap = coin::create_treasury_cap_for_testing<TEST_COIN>(ctx(scenario));

        create_test_treasury(&mut treasury_cap, scenario, &clock);

        // Process 5 months of unlocking
        let mut i = 0;
        while (i < 5) {
            advance_clock(&mut clock, MONTH_MS);

            next_tx(scenario, ALICE);
            {
                let mut treasury = test::take_shared<CreatorTreasury<TEST_COIN>>(scenario);
                creator_treasury::process_monthly_unlock(&mut treasury, &clock, ctx(scenario));
                test::return_shared(treasury);
            };

            i = i + 1;
        };

        // Check final state after 5 months
        next_tx(scenario, CREATOR);
        {
            let mut treasury = test::take_shared<CreatorTreasury<TEST_COIN>>(scenario);

            let (
                _creator,
                token_balance,
                creator_vested,
                platform_distributed,
                _bought_back,
                _collateral
            ) = creator_treasury::get_treasury_status(&treasury);

            // Creator: 5 months * 2% = 10% = 100M
            assert!(creator_vested == 100_000_000, 0);

            // Platform: 5 months * 3% = 15% = 150M
            assert!(platform_distributed == 150_000_000, 1);

            // Balance: 1B - 150M = 850M
            assert!(token_balance == 850_000_000, 2);

            test::return_shared(treasury);
        };

        clock::destroy_for_testing(clock);
        test_utils::destroy(treasury_cap);
        test::end(scenario_val);
    }

    #[test]
    /// Tests that unlock attempts before vesting start time fail properly.
    /// Verifies early unlock prevention and correct error handling.
    #[expected_failure(abort_code = creator_treasury::ETooEarly)]
    fun test_unlock_too_early_fails() {
        let mut scenario_val = test::begin(CREATOR);
        let scenario = &mut scenario_val;
        let mut clock = create_clock(scenario);

        // Create currency once per test
        let mut treasury_cap = coin::create_treasury_cap_for_testing<TEST_COIN>(ctx(scenario));

        create_test_treasury(&mut treasury_cap, scenario, &clock);

        // Try to unlock after only 15 days (half a month)
        advance_clock(&mut clock, MONTH_MS / 2);

        next_tx(scenario, ALICE);
        {
            let mut treasury = test::take_shared<CreatorTreasury<TEST_COIN>>(scenario);
            creator_treasury::process_monthly_unlock(&mut treasury, &clock, ctx(scenario));
            test::return_shared(treasury);
        };

        clock::destroy_for_testing(clock);
        test_utils::destroy(treasury_cap);
        test::end(scenario_val);
    }

    // ===== SELLING TESTS =====

    #[test]
    /// Tests creator selling vested tokens from treasury.
    /// Verifies token withdrawal, balance updates, and sell transaction tracking.
    fun test_creator_sell_tokens() {
        let mut scenario_val = test::begin(CREATOR);
        let scenario = &mut scenario_val;
        let mut clock = create_clock(scenario);

        // Create currency once per test
        let mut treasury_cap = coin::create_treasury_cap_for_testing<TEST_COIN>(ctx(scenario));

        create_test_treasury(&mut treasury_cap, scenario, &clock);

        // Unlock 1 month
        advance_clock(&mut clock, MONTH_MS);
        next_tx(scenario, ALICE);
        {
            let mut treasury = test::take_shared<CreatorTreasury<TEST_COIN>>(scenario);
            creator_treasury::process_monthly_unlock(&mut treasury, &clock, ctx(scenario));
            test::return_shared(treasury);
        };

        // Creator sells 10M tokens
        next_tx(scenario, CREATOR);
        {
            let mut treasury = test::take_shared<CreatorTreasury<TEST_COIN>>(scenario);

            let tokens_to_sell = creator_treasury::sell_tokens(
                &mut treasury,
                10_000_000,
                ctx(scenario)
            );

            assert!(coin::value(&tokens_to_sell) == 10_000_000, 0);

            let available = creator_treasury::get_available_to_sell(&treasury);
            assert!(available == 10_000_000, 1); // 20M vested - 10M sold

            transfer::public_transfer(tokens_to_sell, CREATOR);
            test::return_shared(treasury);
        };

        clock::destroy_for_testing(clock);
        test_utils::destroy(treasury_cap);
        test::end(scenario_val);
    }

    #[test]
    /// Tests that non-creator addresses cannot sell tokens from treasury.
    /// Verifies creator-only access control for token withdrawals.
    #[expected_failure(abort_code = creator_treasury::ENotAuthorized)]
    fun test_non_creator_cannot_sell() {
        let mut scenario_val = test::begin(CREATOR);
        let scenario = &mut scenario_val;
        let mut clock = create_clock(scenario);

        // Create currency once per test
        let mut treasury_cap = coin::create_treasury_cap_for_testing<TEST_COIN>(ctx(scenario));

        create_test_treasury(&mut treasury_cap, scenario, &clock);

        // Unlock 1 month
        advance_clock(&mut clock, MONTH_MS);
        next_tx(scenario, ALICE);
        {
            let mut treasury = test::take_shared<CreatorTreasury<TEST_COIN>>(scenario);
            creator_treasury::process_monthly_unlock(&mut treasury, &clock, ctx(scenario));
            test::return_shared(treasury);
        };

        // ALICE tries to sell (should fail)
        next_tx(scenario, ALICE);
        {
            let mut treasury = test::take_shared<CreatorTreasury<TEST_COIN>>(scenario);
            let tokens = creator_treasury::sell_tokens(&mut treasury, 10_000_000, ctx(scenario));
            test::return_to_sender(scenario, tokens);
            test::return_shared(treasury);
        };

        clock::destroy_for_testing(clock);
        test_utils::destroy(treasury_cap);
        test::end(scenario_val);
    }

    #[test]
    /// Tests that creators cannot sell more tokens than their vested balance.
    /// Verifies vesting schedule enforcement and balance constraints.
    #[expected_failure(abort_code = creator_treasury::EInsufficientVested)]
    fun test_cannot_sell_more_than_vested() {
        let mut scenario_val = test::begin(CREATOR);
        let scenario = &mut scenario_val;
        let mut clock = create_clock(scenario);

        // Create currency once per test
        let mut treasury_cap = coin::create_treasury_cap_for_testing<TEST_COIN>(ctx(scenario));

        create_test_treasury(&mut treasury_cap, scenario, &clock);

        // Unlock 1 month (20M vested)
        advance_clock(&mut clock, MONTH_MS);
        next_tx(scenario, ALICE);
        {
            let mut treasury = test::take_shared<CreatorTreasury<TEST_COIN>>(scenario);
            creator_treasury::process_monthly_unlock(&mut treasury, &clock, ctx(scenario));
            test::return_shared(treasury);
        };

        // Try to sell 30M (more than vested)
        next_tx(scenario, CREATOR);
        {
            let mut treasury = test::take_shared<CreatorTreasury<TEST_COIN>>(scenario);
            let tokens = creator_treasury::sell_tokens(&mut treasury, 30_000_000, ctx(scenario));
            test::return_to_sender(scenario, tokens);
            test::return_shared(treasury);
        };

        clock::destroy_for_testing(clock);
        test_utils::destroy(treasury_cap);
        test::end(scenario_val);
    }

    // ===== BUYBACK TESTS =====

    #[test]
    /// Tests creator buyback through direct token burning from treasury.
    /// Verifies milestone completion, token burn, and collateral refund mechanics.
    fun test_buyback_direct_burn() {
        let mut scenario_val = test::begin(CREATOR);
        let scenario = &mut scenario_val;
        let mut clock = create_clock(scenario);

        // Create currency once per test
        let mut treasury_cap = coin::create_treasury_cap_for_testing<TEST_COIN>(ctx(scenario));

        create_test_treasury(&mut treasury_cap, scenario, &clock);

        // Advance to milestone 1 (3 months)
        advance_clock(&mut clock, 3 * MONTH_MS);

        // Execute buyback (treasury has 1B tokens, milestone needs 10M)
        next_tx(scenario, ALICE); // Anyone can execute
        {
            let mut treasury = test::take_shared<CreatorTreasury<TEST_COIN>>(scenario);

            let (success, _deficit) = creator_treasury::execute_buyback(
                &mut treasury,
                &mut treasury_cap,
                0, // milestone index
                &clock,
                ctx(scenario)
            );

            assert!(success, 0);

            let (
                _creator,
                token_balance,
                _creator_vested,
                _platform_distributed,
                bought_back,
                _collateral
            ) = creator_treasury::get_treasury_status(&treasury);

            // Should have burned 10M
            assert!(bought_back == 10_000_000, 1);

            test::return_shared(treasury);
        };

        clock::destroy_for_testing(clock);
        test_utils::destroy(treasury_cap);
        test::end(scenario_val);
    }

    #[test]
    /// Tests creator buyback by purchasing tokens from market then burning.
    /// Verifies market purchase flow, burn execution, and milestone tracking.
    fun test_buyback_with_market_purchase() {
        let mut scenario_val = test::begin(CREATOR);
        let scenario = &mut scenario_val;
        let mut clock = create_clock(scenario);

        // Create currency once per test
        let mut treasury_cap = coin::create_treasury_cap_for_testing<TEST_COIN>(ctx(scenario));

        create_test_treasury(&mut treasury_cap, scenario, &clock);

        // Unlock and sell tokens to reduce treasury balance
        let mut i = 0;
        while (i < 20) {
            advance_clock(&mut clock, MONTH_MS);
            next_tx(scenario, ALICE);
            {
                let mut treasury = test::take_shared<CreatorTreasury<TEST_COIN>>(scenario);
                creator_treasury::process_monthly_unlock(&mut treasury, &clock, ctx(scenario));
                test::return_shared(treasury);
            };
            i = i + 1;
        };

        // Sell all vested tokens (400M)
        next_tx(scenario, CREATOR);
        {
            let mut treasury = test::take_shared<CreatorTreasury<TEST_COIN>>(scenario);
            let available = creator_treasury::get_available_to_sell(&treasury);
            let tokens = creator_treasury::sell_tokens(&mut treasury, available, ctx(scenario));
            transfer::public_transfer(tokens, CREATOR);
            test::return_shared(treasury);
        };

        // Now treasury has insufficient balance for milestone 1 (needs 10M)
        next_tx(scenario, ALICE);
        {
            let mut treasury = test::take_shared<CreatorTreasury<TEST_COIN>>(scenario);

            let (success, deficit) = creator_treasury::execute_buyback(
                &mut treasury,
                &mut treasury_cap,
                0,
                &clock,
                ctx(scenario)
            );

            assert!(!success, 0); // Should return false (needs purchase)
            assert!(deficit > 0, 1); // Should report deficit

            test::return_shared(treasury);
        };

        // Simulate buying tokens from market and completing buyback
        next_tx(scenario, ALICE);
        {
            let mut treasury = test::take_shared<CreatorTreasury<TEST_COIN>>(scenario);

            // Mint tokens to simulate market purchase
            let purchased_tokens = coin::mint(&mut treasury_cap, 10_000_000, ctx(scenario));

            creator_treasury::complete_buyback_with_purchase(
                &mut treasury,
                &mut treasury_cap,
                purchased_tokens,
                0, // milestone index
                1000, // sui_used (simulated)
                &clock,
                ctx(scenario)
            );

            let (_,_,_,_, bought_back, _) = creator_treasury::get_treasury_status(&treasury);
            assert!(bought_back == 10_000_000, 2);

            test::return_shared(treasury);
        };

        clock::destroy_for_testing(clock);
        test_utils::destroy(treasury_cap);
        test::end(scenario_val);
    }

    #[test]
    /// Tests that buyback attempts before milestone deadline fail.
    /// Verifies buyback timing enforcement and deadline validation.
    #[expected_failure(abort_code = creator_treasury::EMilestoneNotDue)]
    fun test_buyback_before_deadline_fails() {
        let mut scenario_val = test::begin(CREATOR);
        let scenario = &mut scenario_val;
        let mut clock = create_clock(scenario);

        // Create currency once per test
        let mut treasury_cap = coin::create_treasury_cap_for_testing<TEST_COIN>(ctx(scenario));

        create_test_treasury(&mut treasury_cap, scenario, &clock);

        // Try to execute before milestone 1 (3 months)
        advance_clock(&mut clock, 2 * MONTH_MS); // Only 2 months

        next_tx(scenario, ALICE);
        {
            let mut treasury = test::take_shared<CreatorTreasury<TEST_COIN>>(scenario);
            let (_success, _deficit) = creator_treasury::execute_buyback(
                &mut treasury,
                &mut treasury_cap,
                0,
                &clock,
                ctx(scenario)
            );
            test::return_shared(treasury);
        };

        clock::destroy_for_testing(clock);
        test_utils::destroy(treasury_cap);
        test::end(scenario_val);
    }

    // ===== COLLATERAL TESTS =====

    #[test]
    /// Tests creator depositing additional collateral to treasury.
    /// Verifies collateral tracking and balance updates after deposits.
    fun test_deposit_collateral() {
        let mut scenario_val = test::begin(CREATOR);
        let scenario = &mut scenario_val;
        let mut clock = create_clock(scenario);

        // Create currency once per test
        let mut treasury_cap = coin::create_treasury_cap_for_testing<TEST_COIN>(ctx(scenario));

        create_test_treasury(&mut treasury_cap, scenario, &clock);

        // Creator deposits 1000 SUI collateral
        next_tx(scenario, CREATOR);
        {
            let mut treasury = test::take_shared<CreatorTreasury<TEST_COIN>>(scenario);
            let sui_payment = coin::mint_for_testing<SUI>(1000, ctx(scenario));

            creator_treasury::deposit_collateral(
                &mut treasury,
                sui_payment,
                &clock,
                ctx(scenario)
            );

            let (_, _, _, _, _, collateral) = creator_treasury::get_treasury_status(&treasury);
            assert!(collateral == 1000, 0);

            test::return_shared(treasury);
        };

        clock::destroy_for_testing(clock);
        test_utils::destroy(treasury_cap);
        test::end(scenario_val);
    }

    // ===== VIEW FUNCTION TESTS =====

    #[test]
    /// Tests the is_unlock_ready() check for vesting unlock eligibility.
    /// Verifies timing-based unlock availability determination.
    fun test_is_unlock_ready() {
        let mut scenario_val = test::begin(CREATOR);
        let scenario = &mut scenario_val;
        let mut clock = create_clock(scenario);

        // Create currency once per test
        let mut treasury_cap = coin::create_treasury_cap_for_testing<TEST_COIN>(ctx(scenario));

        create_test_treasury(&mut treasury_cap, scenario, &clock);

        next_tx(scenario, CREATOR);
        {
            let mut treasury = test::take_shared<CreatorTreasury<TEST_COIN>>(scenario);

            // Not ready yet
            let current_time = clock::timestamp_ms(&clock);
            assert!(!creator_treasury::is_unlock_ready(&treasury, current_time), 0);

            test::return_shared(treasury);
        };

        // Advance time
        advance_clock(&mut clock, MONTH_MS);

        next_tx(scenario, CREATOR);
        {
            let mut treasury = test::take_shared<CreatorTreasury<TEST_COIN>>(scenario);

            // Should be ready now
            let current_time = clock::timestamp_ms(&clock);
            assert!(creator_treasury::is_unlock_ready(&treasury, current_time), 1);

            test::return_shared(treasury);
        };

        clock::destroy_for_testing(clock);
        test_utils::destroy(treasury_cap);
        test::end(scenario_val);
    }
}
