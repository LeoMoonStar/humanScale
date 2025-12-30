#[test_only]
module peoplecoin::creator_token_tests {
    use sui::test_scenario::{Self as ts, Scenario};
    use sui::coin::{Self, TreasuryCap};
    use peoplecoin::creator_token::{Self, TokenRegistry, TEST_TOKEN};
    use std::string;

    const CREATOR: address = @0xC;
    const INVESTOR: address = @0xD;

    /// Test witness for testing
    struct TEST_CREATOR_TOKEN has drop {}

    #[test]
    fun test_create_token_success() {
        let scenario = ts::begin(CREATOR);

        // Create token
        {
            ts::next_tx(&mut scenario, CREATOR);

            let total_supply = 10_000_000;  // 10M tokens
            let creator_allocation = 3_000_000;  // 30%
            let platform_reserve = 3_000_000;  // 30%
            let liquidity_allocation = 4_000_000;  // 40%

            creator_token::create_token<TEST_CREATOR_TOKEN>(
                TEST_CREATOR_TOKEN {},
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
                100,  // $1.00 initial price
                ts::ctx(&mut scenario)
            );
        };

        // Verify token registry created
        {
            ts::next_tx(&mut scenario, CREATOR);

            let registry = ts::take_shared<TokenRegistry>(&scenario);

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
    #[expected_failure(abort_code = peoplecoin::creator_token::EInvalidAllocation)]
    fun test_create_token_invalid_allocation() {
        let scenario = ts::begin(CREATOR);

        {
            ts::next_tx(&mut scenario, CREATOR);

            // Allocations don't add up to total supply
            creator_token::create_token<TEST_CREATOR_TOKEN>(
                TEST_CREATOR_TOKEN {},
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
                100,
                ts::ctx(&mut scenario)
            );
        };

        ts::end(scenario);
    }

    #[test]
    fun test_is_creator() {
        let scenario = ts::begin(CREATOR);

        // Create token
        {
            ts::next_tx(&mut scenario, CREATOR);

            creator_token::create_token<TEST_CREATOR_TOKEN>(
                TEST_CREATOR_TOKEN {},
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
                100,
                ts::ctx(&mut scenario)
            );
        };

        // Test is_creator function
        {
            ts::next_tx(&mut scenario, CREATOR);

            let registry = ts::take_shared<TokenRegistry>(&scenario);

            assert!(creator_token::is_creator(&registry, CREATOR), 0);
            assert!(!creator_token::is_creator(&registry, INVESTOR), 1);

            ts::return_shared(registry);
        };

        ts::end(scenario);
    }
}
