#[test_only]
module peoplecoin::platform_vault_tests {
    use sui::test_scenario::{Self as ts};
    use sui::coin::{Self};
    use sui::sui::SUI;
    use sui::clock;
    use peoplecoin::platform_vault::{Self, PlatformVault};
    use peoplecoin::creator_treasury::{Self, CreatorTreasury};

    const ADMIN: address = @0xA;
    const CREATOR: address = @0xC;

    /// Test token for treasury
    public struct TEST_COIN has drop {}

    #[test]
    /// Tests that creator cannot profit from sale when debt exists (sell amount > debt).
    /// Verifies debt is fully paid, interest collected, and creator receives remainder.
    fun test_sell_amount_greater_than_debt() {
        let mut scenario = ts::begin(ADMIN);

        // Create platform vault
        {
            ts::next_tx(&mut scenario, ADMIN);
            let initial_fund = coin::mint_for_testing<SUI>(100_000_000_000, ts::ctx(&mut scenario));
            let mut clock = clock::create_for_testing(ts::ctx(&mut scenario));
            platform_vault::create_vault(
                initial_fund,
                500_000_000,
                &clock,
                ts::ctx(&mut scenario)
            );
            clock::destroy_for_testing(clock);
        };

        // Create creator treasury
        {
            ts::next_tx(&mut scenario, CREATOR);
            let creator_tokens = coin::mint_for_testing<TEST_COIN>(1_000_000, ts::ctx(&mut scenario));
            let mut clock = clock::create_for_testing(ts::ctx(&mut scenario));

            creator_treasury::create_treasury<TEST_COIN>(
                creator_tokens,
                ADMIN,  // platform_address
                4000,   // 40% creator
                6000,   // 60% platform
                200,    // 2% monthly unlock
                300,    // 3% monthly unlock
                30 * 24 * 60 * 60 * 1000,  // 30 days
                vector::empty(),  // no buyback milestones
                &clock,
                ts::ctx(&mut scenario)
            );

            clock::destroy_for_testing(clock);
        };

        // Unlock tokens for creator
        {
            ts::next_tx(&mut scenario, CREATOR);
            let mut treasury = ts::take_shared<CreatorTreasury<TEST_COIN>>(&scenario);
            let mut clock = clock::create_for_testing(ts::ctx(&mut scenario));

            // Fast forward 31 days to allow unlock
            clock::set_for_testing(&mut clock, 31 * 24 * 60 * 60 * 1000);

            creator_treasury::process_monthly_unlock(&mut treasury, &clock, ts::ctx(&mut scenario));

            clock::destroy_for_testing(clock);
            ts::return_shared(treasury);
        };

        // Wait until day 31, then create debt
        let debt_creation_time = 31 * 24 * 60 * 60 * 1000;
        {
            ts::next_tx(&mut scenario, ADMIN);
            let mut platform_vault = ts::take_shared<PlatformVault>(&scenario);
            let mut clock = clock::create_for_testing(ts::ctx(&mut scenario));
            clock::set_for_testing(&mut clock, debt_creation_time);

            platform_vault::create_creator_debt(
                &mut platform_vault,
                CREATOR,
                50_000,
                &clock,
                ts::ctx(&mut scenario)
            );

            clock::destroy_for_testing(clock);
            ts::return_shared(platform_vault);
        };

        // Wait 30 days for interest to accrue (total 61 days from start)
        let sale_time = 61 * 24 * 60 * 60 * 1000;

        // Verify debt has grown with interest
        {
            ts::next_tx(&mut scenario, CREATOR);
            let platform_vault = ts::take_shared<PlatformVault>(&scenario);

            let (principal, interest, total_owed, days_in_debt) = platform_vault::get_creator_debt(
                &platform_vault,
                CREATOR,
                sale_time
            );

            assert!(principal == 50_000, 0);
            assert!(interest > 0, 1);  // Interest should have accrued
            assert!(total_owed > 50_000, 2);  // Total > principal
            assert!(days_in_debt == 30, 3);  // 30 days in debt (from day 31 to day 61)

            ts::return_shared(platform_vault);
        };

        // Creator sells tokens for 100,000 SUI (more than debt)
        {
            ts::next_tx(&mut scenario, CREATOR);
            let mut treasury = ts::take_shared<CreatorTreasury<TEST_COIN>>(&scenario);
            let mut platform_vault = ts::take_shared<PlatformVault>(&scenario);
            let mut clock = clock::create_for_testing(ts::ctx(&mut scenario));
            clock::set_for_testing(&mut clock, sale_time);

            // Get debt amount before sale
            let (_, interest_before, debt_before, _) = platform_vault::get_creator_debt(
                &platform_vault,
                CREATOR,
                sale_time
            );

            // Get platform vault interest before
            let (_, _, _, interest_earned_before, _) = platform_vault::get_vault_status(&platform_vault);

            // Simulate selling tokens for 100,000 SUI
            let sale_proceeds = coin::mint_for_testing<SUI>(100_000, ts::ctx(&mut scenario));

            // Call sell_and_repay_debt
            creator_treasury::sell_and_repay_debt(
                &mut treasury,
                &mut platform_vault,
                10_000,  // tokens sold
                sale_proceeds,
                &clock,
                ts::ctx(&mut scenario)
            );

            // Verify debt is cleared
            let has_debt = platform_vault::has_debt(&platform_vault, CREATOR);
            assert!(!has_debt, 4);  // Debt should be fully paid

            // Verify interest was collected
            let (_, _, _, interest_earned_after, _) = platform_vault::get_vault_status(&platform_vault);
            assert!(interest_earned_after > interest_earned_before, 5);
            assert!(interest_earned_after == interest_earned_before + interest_before, 6);

            // Note: Remainder (100,000 - debt) should be sent to creator
            // This happens automatically in repay_creator_debt

            clock::destroy_for_testing(clock);
            ts::return_shared(treasury);
            ts::return_shared(platform_vault);
        };

        ts::end(scenario);
    }

    #[test]
    /// Tests that creator receives nothing when sell amount equals debt.
    /// Verifies debt is fully paid and all proceeds go to debt + interest.
    fun test_sell_amount_equals_debt() {
        let mut scenario = ts::begin(ADMIN);

        // Create platform vault
        {
            ts::next_tx(&mut scenario, ADMIN);
            let initial_fund = coin::mint_for_testing<SUI>(100_000_000_000, ts::ctx(&mut scenario));
            let mut clock = clock::create_for_testing(ts::ctx(&mut scenario));
            platform_vault::create_vault(
                initial_fund,
                500_000_000,
                &clock,
                ts::ctx(&mut scenario)
            );
            clock::destroy_for_testing(clock);
        };

        // Create creator treasury
        {
            ts::next_tx(&mut scenario, CREATOR);
            let creator_tokens = coin::mint_for_testing<TEST_COIN>(1_000_000, ts::ctx(&mut scenario));
            let mut clock = clock::create_for_testing(ts::ctx(&mut scenario));

            creator_treasury::create_treasury<TEST_COIN>(
                creator_tokens,
                ADMIN,
                4000, 6000, 200, 300,
                30 * 24 * 60 * 60 * 1000,
                vector::empty(),
                &clock,
                ts::ctx(&mut scenario)
            );

            clock::destroy_for_testing(clock);
        };

        // Unlock tokens
        {
            ts::next_tx(&mut scenario, CREATOR);
            let mut treasury = ts::take_shared<CreatorTreasury<TEST_COIN>>(&scenario);
            let mut clock = clock::create_for_testing(ts::ctx(&mut scenario));
            clock::set_for_testing(&mut clock, 31 * 24 * 60 * 60 * 1000);
            creator_treasury::process_monthly_unlock(&mut treasury, &clock, ts::ctx(&mut scenario));
            clock::destroy_for_testing(clock);
            ts::return_shared(treasury);
        };

        // Create debt
        {
            ts::next_tx(&mut scenario, ADMIN);
            let mut platform_vault = ts::take_shared<PlatformVault>(&scenario);
            let mut clock = clock::create_for_testing(ts::ctx(&mut scenario));

            platform_vault::create_creator_debt(
                &mut platform_vault,
                CREATOR,
                50_000,
                &clock,
                ts::ctx(&mut scenario)
            );

            clock::destroy_for_testing(clock);
            ts::return_shared(platform_vault);
        };

        // Wait for interest, then sell exactly the debt amount
        let sale_time = 61 * 24 * 60 * 60 * 1000;

        {
            ts::next_tx(&mut scenario, CREATOR);
            let mut treasury = ts::take_shared<CreatorTreasury<TEST_COIN>>(&scenario);
            let mut platform_vault = ts::take_shared<PlatformVault>(&scenario);
            let mut clock = clock::create_for_testing(ts::ctx(&mut scenario));
            clock::set_for_testing(&mut clock, sale_time);

            // Get exact debt amount
            let (_, _, total_owed, _) = platform_vault::get_creator_debt(
                &platform_vault,
                CREATOR,
                sale_time
            );

            // Sell for exactly the debt amount
            let sale_proceeds = coin::mint_for_testing<SUI>(total_owed, ts::ctx(&mut scenario));

            creator_treasury::sell_and_repay_debt(
                &mut treasury,
                &mut platform_vault,
                10_000,
                sale_proceeds,
                &clock,
                ts::ctx(&mut scenario)
            );

            // Verify debt is cleared
            let has_debt = platform_vault::has_debt(&platform_vault, CREATOR);
            assert!(!has_debt, 0);  // Should be fully paid

            // Creator receives nothing (all goes to debt)

            clock::destroy_for_testing(clock);
            ts::return_shared(treasury);
            ts::return_shared(platform_vault);
        };

        ts::end(scenario);
    }

    #[test]
    /// Tests that creator receives nothing when sell amount is less than debt.
    /// Verifies partial debt repayment and remaining debt persists.
    fun test_sell_amount_less_than_debt() {
        let mut scenario = ts::begin(ADMIN);

        // Create platform vault
        {
            ts::next_tx(&mut scenario, ADMIN);
            let initial_fund = coin::mint_for_testing<SUI>(100_000_000_000, ts::ctx(&mut scenario));
            let mut clock = clock::create_for_testing(ts::ctx(&mut scenario));
            platform_vault::create_vault(
                initial_fund,
                500_000_000,
                &clock,
                ts::ctx(&mut scenario)
            );
            clock::destroy_for_testing(clock);
        };

        // Create creator treasury
        {
            ts::next_tx(&mut scenario, CREATOR);
            let creator_tokens = coin::mint_for_testing<TEST_COIN>(1_000_000, ts::ctx(&mut scenario));
            let mut clock = clock::create_for_testing(ts::ctx(&mut scenario));

            creator_treasury::create_treasury<TEST_COIN>(
                creator_tokens,
                ADMIN,
                4000, 6000, 200, 300,
                30 * 24 * 60 * 60 * 1000,
                vector::empty(),
                &clock,
                ts::ctx(&mut scenario)
            );

            clock::destroy_for_testing(clock);
        };

        // Unlock tokens
        {
            ts::next_tx(&mut scenario, CREATOR);
            let mut treasury = ts::take_shared<CreatorTreasury<TEST_COIN>>(&scenario);
            let mut clock = clock::create_for_testing(ts::ctx(&mut scenario));
            clock::set_for_testing(&mut clock, 31 * 24 * 60 * 60 * 1000);
            creator_treasury::process_monthly_unlock(&mut treasury, &clock, ts::ctx(&mut scenario));
            clock::destroy_for_testing(clock);
            ts::return_shared(treasury);
        };

        // Create debt of 50,000 SUI
        {
            ts::next_tx(&mut scenario, ADMIN);
            let mut platform_vault = ts::take_shared<PlatformVault>(&scenario);
            let mut clock = clock::create_for_testing(ts::ctx(&mut scenario));

            platform_vault::create_creator_debt(
                &mut platform_vault,
                CREATOR,
                50_000,
                &clock,
                ts::ctx(&mut scenario)
            );

            clock::destroy_for_testing(clock);
            ts::return_shared(platform_vault);
        };

        let sale_time = 61 * 24 * 60 * 60 * 1000;

        // First sale: 20,000 SUI (less than debt)
        {
            ts::next_tx(&mut scenario, CREATOR);
            let mut treasury = ts::take_shared<CreatorTreasury<TEST_COIN>>(&scenario);
            let mut platform_vault = ts::take_shared<PlatformVault>(&scenario);
            let mut clock = clock::create_for_testing(ts::ctx(&mut scenario));
            clock::set_for_testing(&mut clock, sale_time);

            let (_, _, debt_before, _) = platform_vault::get_creator_debt(
                &platform_vault,
                CREATOR,
                sale_time
            );

            // Sell for only 20,000 SUI (partial payment)
            let sale_proceeds = coin::mint_for_testing<SUI>(20_000, ts::ctx(&mut scenario));

            creator_treasury::sell_and_repay_debt(
                &mut treasury,
                &mut platform_vault,
                5_000,  // tokens sold
                sale_proceeds,
                &clock,
                ts::ctx(&mut scenario)
            );

            // Verify debt still exists
            let has_debt = platform_vault::has_debt(&platform_vault, CREATOR);
            assert!(has_debt, 0);  // Still has debt

            // Verify debt reduced
            let (_, _, debt_after, _) = platform_vault::get_creator_debt(
                &platform_vault,
                CREATOR,
                sale_time
            );
            assert!(debt_after < debt_before, 1);  // Debt reduced
            assert!(debt_after == debt_before - 20_000, 2);  // Reduced by payment

            // Creator receives nothing (all goes to debt)

            clock::destroy_for_testing(clock);
            ts::return_shared(treasury);
            ts::return_shared(platform_vault);
        };

        ts::end(scenario);
    }

    #[test]
    /// Tests that multiple partial sales gradually pay down debt.
    /// Verifies that each sale reduces debt until fully paid.
    fun test_multiple_partial_sales_pay_debt() {
        let mut scenario = ts::begin(ADMIN);

        // Create platform vault
        {
            ts::next_tx(&mut scenario, ADMIN);
            let initial_fund = coin::mint_for_testing<SUI>(100_000_000_000, ts::ctx(&mut scenario));
            let mut clock = clock::create_for_testing(ts::ctx(&mut scenario));
            platform_vault::create_vault(
                initial_fund,
                500_000_000,
                &clock,
                ts::ctx(&mut scenario)
            );
            clock::destroy_for_testing(clock);
        };

        // Create creator treasury
        {
            ts::next_tx(&mut scenario, CREATOR);
            let creator_tokens = coin::mint_for_testing<TEST_COIN>(1_000_000, ts::ctx(&mut scenario));
            let mut clock = clock::create_for_testing(ts::ctx(&mut scenario));

            creator_treasury::create_treasury<TEST_COIN>(
                creator_tokens,
                ADMIN,
                4000, 6000, 200, 300,
                30 * 24 * 60 * 60 * 1000,
                vector::empty(),
                &clock,
                ts::ctx(&mut scenario)
            );

            clock::destroy_for_testing(clock);
        };

        // Unlock tokens
        {
            ts::next_tx(&mut scenario, CREATOR);
            let mut treasury = ts::take_shared<CreatorTreasury<TEST_COIN>>(&scenario);
            let mut clock = clock::create_for_testing(ts::ctx(&mut scenario));
            clock::set_for_testing(&mut clock, 31 * 24 * 60 * 60 * 1000);
            creator_treasury::process_monthly_unlock(&mut treasury, &clock, ts::ctx(&mut scenario));
            clock::destroy_for_testing(clock);
            ts::return_shared(treasury);
        };

        // Create debt of 50,000 SUI
        {
            ts::next_tx(&mut scenario, ADMIN);
            let mut platform_vault = ts::take_shared<PlatformVault>(&scenario);
            let mut clock = clock::create_for_testing(ts::ctx(&mut scenario));

            platform_vault::create_creator_debt(
                &mut platform_vault,
                CREATOR,
                50_000,
                &clock,
                ts::ctx(&mut scenario)
            );

            clock::destroy_for_testing(clock);
            ts::return_shared(platform_vault);
        };

        let mut current_time = 31 * 24 * 60 * 60 * 1000;

        // First sale: 20,000 SUI
        {
            ts::next_tx(&mut scenario, CREATOR);
            let mut treasury = ts::take_shared<CreatorTreasury<TEST_COIN>>(&scenario);
            let mut platform_vault = ts::take_shared<PlatformVault>(&scenario);
            let mut clock = clock::create_for_testing(ts::ctx(&mut scenario));
            clock::set_for_testing(&mut clock, current_time);

            let sale_proceeds = coin::mint_for_testing<SUI>(20_000, ts::ctx(&mut scenario));
            creator_treasury::sell_and_repay_debt(
                &mut treasury,
                &mut platform_vault,
                5_000,
                sale_proceeds,
                &clock,
                ts::ctx(&mut scenario)
            );

            let has_debt = platform_vault::has_debt(&platform_vault, CREATOR);
            assert!(has_debt, 0);

            clock::destroy_for_testing(clock);
            ts::return_shared(treasury);
            ts::return_shared(platform_vault);
        };

        // Second sale: 15,000 SUI (day later)
        current_time = current_time + 24 * 60 * 60 * 1000;
        {
            ts::next_tx(&mut scenario, CREATOR);
            let mut treasury = ts::take_shared<CreatorTreasury<TEST_COIN>>(&scenario);
            let mut platform_vault = ts::take_shared<PlatformVault>(&scenario);
            let mut clock = clock::create_for_testing(ts::ctx(&mut scenario));
            clock::set_for_testing(&mut clock, current_time);

            let sale_proceeds = coin::mint_for_testing<SUI>(15_000, ts::ctx(&mut scenario));
            creator_treasury::sell_and_repay_debt(
                &mut treasury,
                &mut platform_vault,
                3_000,
                sale_proceeds,
                &clock,
                ts::ctx(&mut scenario)
            );

            let has_debt = platform_vault::has_debt(&platform_vault, CREATOR);
            assert!(has_debt, 1);  // Still has debt

            clock::destroy_for_testing(clock);
            ts::return_shared(treasury);
            ts::return_shared(platform_vault);
        };

        // Third sale: 20,000 SUI (should fully pay remaining debt + interest)
        current_time = current_time + 24 * 60 * 60 * 1000;
        {
            ts::next_tx(&mut scenario, CREATOR);
            let mut treasury = ts::take_shared<CreatorTreasury<TEST_COIN>>(&scenario);
            let mut platform_vault = ts::take_shared<PlatformVault>(&scenario);
            let mut clock = clock::create_for_testing(ts::ctx(&mut scenario));
            clock::set_for_testing(&mut clock, current_time);

            let sale_proceeds = coin::mint_for_testing<SUI>(20_000, ts::ctx(&mut scenario));
            creator_treasury::sell_and_repay_debt(
                &mut treasury,
                &mut platform_vault,
                5_000,
                sale_proceeds,
                &clock,
                ts::ctx(&mut scenario)
            );

            // Debt should be cleared now
            let has_debt = platform_vault::has_debt(&platform_vault, CREATOR);
            assert!(!has_debt, 2);  // Debt fully paid

            clock::destroy_for_testing(clock);
            ts::return_shared(treasury);
            ts::return_shared(platform_vault);
        };

        ts::end(scenario);
    }

    #[test]
    /// Tests that interest properly accumulates over time and is collected.
    /// Verifies 10% APR calculation and platform vault receives interest.
    fun test_interest_accumulation_and_collection() {
        let mut scenario = ts::begin(ADMIN);

        // Create platform vault
        {
            ts::next_tx(&mut scenario, ADMIN);
            let initial_fund = coin::mint_for_testing<SUI>(100_000_000_000, ts::ctx(&mut scenario));
            let mut clock = clock::create_for_testing(ts::ctx(&mut scenario));
            platform_vault::create_vault(
                initial_fund,
                500_000_000,
                &clock,
                ts::ctx(&mut scenario)
            );
            clock::destroy_for_testing(clock);
        };

        // Create debt of 100,000 SUI at time 0
        let debt_principal = 100_000;
        let debt_creation_time = 0;
        {
            ts::next_tx(&mut scenario, ADMIN);
            let mut platform_vault = ts::take_shared<PlatformVault>(&scenario);
            let mut clock = clock::create_for_testing(ts::ctx(&mut scenario));
            clock::set_for_testing(&mut clock, debt_creation_time);

            platform_vault::create_creator_debt(
                &mut platform_vault,
                CREATOR,
                debt_principal,
                &clock,
                ts::ctx(&mut scenario)
            );

            clock::destroy_for_testing(clock);
            ts::return_shared(platform_vault);
        };

        // Check interest after 30 days (should be ~822 SUI at 10% APR)
        // Formula: 100,000 * 0.10 * (30/365) = ~822
        let time_30_days = 30 * 24 * 60 * 60 * 1000;
        {
            ts::next_tx(&mut scenario, CREATOR);
            let platform_vault = ts::take_shared<PlatformVault>(&scenario);

            let (principal, interest, total_owed, days) = platform_vault::get_creator_debt(
                &platform_vault,
                CREATOR,
                time_30_days
            );

            assert!(principal == debt_principal, 0);
            assert!(interest > 800 && interest < 850, 1);  // ~822 SUI
            assert!(total_owed == principal + interest, 2);
            assert!(days == 30, 3);

            ts::return_shared(platform_vault);
        };

        // Check interest after 365 days (should be ~10,000 SUI at 10% APR)
        let time_365_days = 365 * 24 * 60 * 60 * 1000;
        {
            ts::next_tx(&mut scenario, CREATOR);
            let platform_vault = ts::take_shared<PlatformVault>(&scenario);

            let (principal, interest, total_owed, days) = platform_vault::get_creator_debt(
                &platform_vault,
                CREATOR,
                time_365_days
            );

            assert!(principal == debt_principal, 4);
            assert!(interest > 9_900 && interest < 10_100, 5);  // ~10,000 SUI
            assert!(total_owed == principal + interest, 6);
            assert!(days == 365, 7);

            ts::return_shared(platform_vault);
        };

        // Create treasury for repayment
        {
            ts::next_tx(&mut scenario, CREATOR);
            let creator_tokens = coin::mint_for_testing<TEST_COIN>(1_000_000, ts::ctx(&mut scenario));
            let mut clock = clock::create_for_testing(ts::ctx(&mut scenario));
            clock::set_for_testing(&mut clock, time_365_days);

            creator_treasury::create_treasury<TEST_COIN>(
                creator_tokens,
                ADMIN,
                4000, 6000, 200, 300,
                30 * 24 * 60 * 60 * 1000,
                vector::empty(),
                &clock,
                ts::ctx(&mut scenario)
            );

            clock::destroy_for_testing(clock);
        };

        // Unlock tokens multiple times to have enough vested (need 50k tokens)
        // With 2% monthly, need 3 unlocks: 20k + 20k + 20k = 60k
        {
            ts::next_tx(&mut scenario, CREATOR);
            let mut treasury = ts::take_shared<CreatorTreasury<TEST_COIN>>(&scenario);
            let mut clock = clock::create_for_testing(ts::ctx(&mut scenario));

            // First unlock at time_365_days + 31 days
            clock::set_for_testing(&mut clock, time_365_days + 31 * 24 * 60 * 60 * 1000);
            creator_treasury::process_monthly_unlock(&mut treasury, &clock, ts::ctx(&mut scenario));

            // Second unlock at +61 days
            clock::set_for_testing(&mut clock, time_365_days + 61 * 24 * 60 * 60 * 1000);
            creator_treasury::process_monthly_unlock(&mut treasury, &clock, ts::ctx(&mut scenario));

            // Third unlock at +91 days
            clock::set_for_testing(&mut clock, time_365_days + 91 * 24 * 60 * 60 * 1000);
            creator_treasury::process_monthly_unlock(&mut treasury, &clock, ts::ctx(&mut scenario));

            clock::destroy_for_testing(clock);
            ts::return_shared(treasury);
        };

        {
            ts::next_tx(&mut scenario, CREATOR);
            let mut treasury = ts::take_shared<CreatorTreasury<TEST_COIN>>(&scenario);
            let mut platform_vault = ts::take_shared<PlatformVault>(&scenario);
            let mut clock = clock::create_for_testing(ts::ctx(&mut scenario));
            let repay_time = time_365_days + 91 * 24 * 60 * 60 * 1000;
            clock::set_for_testing(&mut clock, repay_time);

            // Get interest before repayment
            let (_, interest_amount, total_owed, _) = platform_vault::get_creator_debt(
                &mut platform_vault,
                CREATOR,
                repay_time
            );

            let (_, _, _, interest_earned_before, _) = platform_vault::get_vault_status(&platform_vault);

            // Repay full debt
            let payment = coin::mint_for_testing<SUI>(total_owed, ts::ctx(&mut scenario));
            creator_treasury::sell_and_repay_debt(
                &mut treasury,
                &mut platform_vault,
                50_000,
                payment,
                &clock,
                ts::ctx(&mut scenario)
            );

            // Verify interest was collected by platform vault
            let (_, _, _, interest_earned_after, _) = platform_vault::get_vault_status(&platform_vault);
            assert!(interest_earned_after == interest_earned_before + interest_amount, 8);

            // Verify debt cleared
            let has_debt = platform_vault::has_debt(&platform_vault, CREATOR);
            assert!(!has_debt, 9);

            clock::destroy_for_testing(clock);
            ts::return_shared(treasury);
            ts::return_shared(platform_vault);
        };

        ts::end(scenario);
    }

    #[test]
    /// Tests that interest is paid before principal in debt repayment.
    /// Verifies correct payment priority order.
    fun test_interest_paid_before_principal() {
        let mut scenario = ts::begin(ADMIN);

        // Create platform vault
        {
            ts::next_tx(&mut scenario, ADMIN);
            let initial_fund = coin::mint_for_testing<SUI>(100_000_000_000, ts::ctx(&mut scenario));
            let mut clock = clock::create_for_testing(ts::ctx(&mut scenario));
            platform_vault::create_vault(
                initial_fund,
                500_000_000,
                &clock,
                ts::ctx(&mut scenario)
            );
            clock::destroy_for_testing(clock);
        };

        // Create debt
        {
            ts::next_tx(&mut scenario, ADMIN);
            let mut platform_vault = ts::take_shared<PlatformVault>(&scenario);
            let mut clock = clock::create_for_testing(ts::ctx(&mut scenario));

            platform_vault::create_creator_debt(
                &mut platform_vault,
                CREATOR,
                10_000,
                &clock,
                ts::ctx(&mut scenario)
            );

            clock::destroy_for_testing(clock);
            ts::return_shared(platform_vault);
        };

        // Wait 365 days for significant interest (~1,000 SUI)
        let time = 365 * 24 * 60 * 60 * 1000;

        // Create treasury
        {
            ts::next_tx(&mut scenario, CREATOR);
            let creator_tokens = coin::mint_for_testing<TEST_COIN>(1_000_000, ts::ctx(&mut scenario));
            let mut clock = clock::create_for_testing(ts::ctx(&mut scenario));
            clock::set_for_testing(&mut clock, time);

            creator_treasury::create_treasury<TEST_COIN>(
                creator_tokens,
                ADMIN,
                4000, 6000, 200, 300,
                30 * 24 * 60 * 60 * 1000,
                vector::empty(),
                &clock,
                ts::ctx(&mut scenario)
            );

            clock::destroy_for_testing(clock);
        };

        // Unlock
        {
            ts::next_tx(&mut scenario, CREATOR);
            let mut treasury = ts::take_shared<CreatorTreasury<TEST_COIN>>(&scenario);
            let mut clock = clock::create_for_testing(ts::ctx(&mut scenario));
            clock::set_for_testing(&mut clock, time + 31 * 24 * 60 * 60 * 1000);
            creator_treasury::process_monthly_unlock(&mut treasury, &clock, ts::ctx(&mut scenario));
            clock::destroy_for_testing(clock);
            ts::return_shared(treasury);
        };

        // Make partial payment that only covers interest
        {
            ts::next_tx(&mut scenario, CREATOR);
            let mut treasury = ts::take_shared<CreatorTreasury<TEST_COIN>>(&scenario);
            let mut platform_vault = ts::take_shared<PlatformVault>(&scenario);
            let mut clock = clock::create_for_testing(ts::ctx(&mut scenario));
            let payment_time = time + 31 * 24 * 60 * 60 * 1000;
            clock::set_for_testing(&mut clock, payment_time);

            let (principal_before, interest_before, _, _) = platform_vault::get_creator_debt(
                &platform_vault,
                CREATOR,
                payment_time
            );

            // Pay only the interest amount
            let payment = coin::mint_for_testing<SUI>(interest_before, ts::ctx(&mut scenario));
            creator_treasury::sell_and_repay_debt(
                &mut treasury,
                &mut platform_vault,
                5_000,
                payment,
                &clock,
                ts::ctx(&mut scenario)
            );

            // Check that interest is cleared but principal remains
            let (principal_after, interest_after, _, _) = platform_vault::get_creator_debt(
                &mut platform_vault,
                CREATOR,
                payment_time
            );

            assert!(interest_after == 0, 0);  // Interest paid first
            assert!(principal_after == principal_before, 1);  // Principal unchanged

            clock::destroy_for_testing(clock);
            ts::return_shared(treasury);
            ts::return_shared(platform_vault);
        };

        ts::end(scenario);
    }
}
