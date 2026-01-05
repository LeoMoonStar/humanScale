#[test_only]
module peoplecoin::creator_token_tests {
    use sui::test_scenario::{Self as ts};
    use peoplecoin::creator_token::{Self, TokenRegistry};
    use std::string;

    const CREATOR: address = @0xC;
    const INVESTOR: address = @0xD;

    /// Test witness for testing
    public struct TEST_CREATOR_TOKEN has drop {}

    #[test]
    /// Tests successful creator token creation with valid allocations.
    /// Verifies token registry initialization and metadata storage (name, symbol, supply, price).
    fun test_create_token_success() {
        let mut scenario = ts::begin(CREATOR);

        // Create token
        {
            ts::next_tx(&mut scenario, CREATOR);

            let total_supply = 10_000_000;  // 10M tokens
            let creator_allocation = 3_000_000;  // 30%
            let platform_reserve = 3_000_000;  // 30%
            let liquidity_allocation = 4_000_000;  // 40%

            creator_token::create_token_for_testing<TEST_CREATOR_TOKEN>(
                8,  // decimals
                b"TEST",
                b"Test Creator Token",
                b"Token for testing",
                b"https://example.com/icon.png",
                total_supply,
                creator_allocation,
                platform_reserve,
                liquidity_allocation,
                5,  // 5 years buyback
                1000000,  // buyback_start_date (timestamp)
                3,  // buyback_interval_months
                100000,  // buyback_amount_per_interval
                30,  // trading_block_duration_days
                true,  // vesting_enabled
                200,  // vesting_monthly_release_bps (2%)
                4000,  // vesting_total_release_bps (40%)
                100,  // $1.00 initial price
                ts::ctx(&mut scenario)
            );
        };

        // Verify token registry created
        {
            ts::next_tx(&mut scenario, CREATOR);

            let mut registry = ts::take_shared<TokenRegistry>(&scenario);

            let (creator, name, symbol, supply, duration, price) = creator_token::get_token_info(&registry);

            assert!(creator == CREATOR, 0);
            assert!(string::utf8(b"Test Creator Token") == name, 1);
            assert!(string::utf8(b"TEST") == symbol, 2);
            assert!(supply == 10_000_000, 3);
            assert!(duration == 5, 4);
            assert!(price == 100, 5);

            ts::return_shared(registry);
        };

        ts::end(scenario);
    }

    #[test]
    /// Tests that token creation fails when allocations don't sum to total supply.
    /// Verifies allocation validation logic and proper error handling.
    #[expected_failure(abort_code = peoplecoin::creator_token::EInvalidAllocation)]
    fun test_create_token_invalid_allocation() {
        let mut scenario = ts::begin(CREATOR);

        {
            ts::next_tx(&mut scenario, CREATOR);

            // Allocations don't add up to total supply
            creator_token::create_token_for_testing<TEST_CREATOR_TOKEN>(
                8,
                b"TEST",
                b"Test Creator Token",
                b"Token for testing",
                b"https://example.com/icon.png",
                10_000_000,  // total
                3_000_000,   // creator
                3_000_000,   // reserve
                3_000_000,   // liquidity - should be 4M!
                5,
                1000000,  // buyback_start_date
                3,  // buyback_interval_months
                100000,  // buyback_amount_per_interval
                30,  // trading_block_duration_days
                true,  // vesting_enabled
                200,  // vesting_monthly_release_bps
                4000,  // vesting_total_release_bps
                100,  // initial_price
                ts::ctx(&mut scenario)
            );
        };

        ts::end(scenario);
    }

    #[test]
    /// Tests the is_creator() function for creator verification.
    /// Verifies correct identification of token creator vs other addresses.
    fun test_is_creator() {
        let mut scenario = ts::begin(CREATOR);

        // Create token
        {
            ts::next_tx(&mut scenario, CREATOR);

            creator_token::create_token_for_testing<TEST_CREATOR_TOKEN>(
                8,
                b"TEST",
                b"Test Token",
                b"Test",
                b"https://example.com/icon.png",
                10_000_000,
                3_000_000,
                3_000_000,
                4_000_000,
                5,
                1000000,  // buyback_start_date
                3,  // buyback_interval_months
                100000,  // buyback_amount_per_interval
                30,  // trading_block_duration_days
                true,  // vesting_enabled
                200,  // vesting_monthly_release_bps
                4000,  // vesting_total_release_bps
                100,  // initial_price
                ts::ctx(&mut scenario)
            );
        };

        // Test is_creator function
        {
            ts::next_tx(&mut scenario, CREATOR);

            let mut registry = ts::take_shared<TokenRegistry>(&scenario);

            assert!(creator_token::is_creator(&registry, CREATOR), 0);
            assert!(!creator_token::is_creator(&registry, INVESTOR), 1);

            ts::return_shared(registry);
        };

        ts::end(scenario);
    }
}
