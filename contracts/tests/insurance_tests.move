#[test_only]
module peoplecoin::insurance_tests {
    use sui::test_scenario::{Self as ts};
    use sui::coin::{Self};
    use sui::sui::SUI;
    use sui::object::{Self};
    use peoplecoin::insurance::{Self, InsurancePool, InsuranceAdminCap};

    const ADMIN: address = @0xA;
    const CREATOR: address = @0xC;

    #[test]
    /// Tests insurance pool initialization with initial funding.
    /// Verifies pool balance, fee tracking, and admin capability creation.
    fun test_create_insurance_pool() {
        let mut scenario = ts::begin(ADMIN);

        {
            ts::next_tx(&mut scenario, ADMIN);

            let initial_fund = coin::mint_for_testing<SUI>(100_000_000, ts::ctx(&mut scenario));
            insurance::create_insurance_pool(
                initial_fund,
                10_000_000,  // approval threshold
                ts::ctx(&mut scenario)
            );
        };

        {
            ts::next_tx(&mut scenario, ADMIN);

            let mut pool = ts::take_shared<InsurancePool>(&scenario);
            let (balance, fees, claims_paid, submitted, approved) = insurance::get_pool_status(&pool);

            assert!(balance == 100_000_000, 0);
            assert!(fees == 100_000_000, 1);
            assert!(claims_paid == 0, 2);
            assert!(submitted == 0, 3);
            assert!(approved == 0, 4);

            ts::return_shared(pool);
        };

        ts::end(scenario);
    }

    #[test]
    /// Tests adding additional funds to existing insurance pool.
    /// Verifies balance updates and fee accumulation after deposits.
    fun test_add_insurance_funds() {
        let mut scenario = ts::begin(ADMIN);

        {
            ts::next_tx(&mut scenario, ADMIN);

            let initial_fund = coin::mint_for_testing<SUI>(100_000_000, ts::ctx(&mut scenario));
            insurance::create_insurance_pool(initial_fund, 10_000_000, ts::ctx(&mut scenario));
        };

        {
            ts::next_tx(&mut scenario, ADMIN);

            let mut pool = ts::take_shared<InsurancePool>(&scenario);
            let additional_fund = coin::mint_for_testing<SUI>(50_000_000, ts::ctx(&mut scenario));

            insurance::add_insurance_funds(&mut pool, additional_fund);

            let (balance, fees, _, _, _) = insurance::get_pool_status(&pool);
            assert!(balance == 150_000_000, 0);
            assert!(fees == 150_000_000, 1);

            ts::return_shared(pool);
        };

        ts::end(scenario);
    }

    #[test]
    /// Tests insurance claim submission and admin approval workflow.
    /// Verifies claim creation, approval process, and payout to claimant.
    fun test_submit_and_approve_claim() {
        let mut scenario = ts::begin(ADMIN);

        {
            ts::next_tx(&mut scenario, ADMIN);

            let initial_fund = coin::mint_for_testing<SUI>(100_000_000, ts::ctx(&mut scenario));
            insurance::create_insurance_pool(initial_fund, 10_000_000, ts::ctx(&mut scenario));
        };

        let claim_id: u64;

        // Submit claim
        {
            ts::next_tx(&mut scenario, CREATOR);

            let mut pool = ts::take_shared<InsurancePool>(&scenario);
            let vault_id = object::id_from_address(@0x123);

            claim_id = insurance::submit_claim(
                &mut pool,
                vault_id,
                CREATOR,
                5_000_000,  // amount
                1,  // milestone
                ts::ctx(&mut scenario)
            );

            assert!(claim_id == 1, 0);

            let (_, _, _, submitted, _) = insurance::get_pool_status(&pool);
            assert!(submitted == 1, 1);

            ts::return_shared(pool);
        };

        // Approve claim
        {
            ts::next_tx(&mut scenario, ADMIN);

            let mut pool = ts::take_shared<InsurancePool>(&scenario);
            let admin_cap = ts::take_from_sender<InsuranceAdminCap>(&scenario);

            insurance::approve_claim(&mut pool, &admin_cap, claim_id, ts::ctx(&mut scenario));

            let (_, _, _, _, approved) = insurance::get_pool_status(&pool);
            assert!(approved == 1, 0);

            ts::return_to_sender(&scenario, admin_cap);
            ts::return_shared(pool);
        };

        ts::end(scenario);
    }

    #[test]
    /// Tests automatic processing of small claims below approval threshold.
    /// Verifies claims under threshold are paid out immediately without admin approval.
    fun test_auto_process_small_claim() {
        let mut scenario = ts::begin(ADMIN);

        {
            ts::next_tx(&mut scenario, ADMIN);

            let initial_fund = coin::mint_for_testing<SUI>(100_000_000, ts::ctx(&mut scenario));
            insurance::create_insurance_pool(
                initial_fund,
                10_000_000,  // approval threshold
                ts::ctx(&mut scenario)
            );
        };

        let claim_id: u64;

        // Submit small claim (below threshold)
        {
            ts::next_tx(&mut scenario, CREATOR);

            let mut pool = ts::take_shared<InsurancePool>(&scenario);
            let vault_id = object::id_from_address(@0x123);

            claim_id = insurance::submit_claim(
                &mut pool,
                vault_id,
                CREATOR,
                5_000_000,  // Below 10M threshold
                1,
                ts::ctx(&mut scenario)
            );

            ts::return_shared(pool);
        };

        // Auto-process claim (no admin approval needed)
        {
            ts::next_tx(&mut scenario, CREATOR);

            let mut pool = ts::take_shared<InsurancePool>(&scenario);

            let (balance_before, _, _, _, _) = insurance::get_pool_status(&pool);

            insurance::auto_process_claim(&mut pool, claim_id, ts::ctx(&mut scenario));

            let (balance_after, _, claims_paid, _, approved) = insurance::get_pool_status(&pool);

            assert!(balance_after == balance_before - 5_000_000, 0);
            assert!(claims_paid == 5_000_000, 1);
            assert!(approved == 1, 2);

            ts::return_shared(pool);
        };

        ts::end(scenario);
    }

    #[test]
    /// Tests that large claims above threshold cannot be auto-processed.
    /// Verifies auto-processing fails for claims requiring admin approval.
    #[expected_failure]
    fun test_cannot_auto_process_large_claim() {
        let mut scenario = ts::begin(ADMIN);

        {
            ts::next_tx(&mut scenario, ADMIN);

            let initial_fund = coin::mint_for_testing<SUI>(100_000_000, ts::ctx(&mut scenario));
            insurance::create_insurance_pool(
                initial_fund,
                10_000_000,  // approval threshold
                ts::ctx(&mut scenario)
            );
        };

        let claim_id: u64;

        // Submit large claim (above threshold)
        {
            ts::next_tx(&mut scenario, CREATOR);

            let mut pool = ts::take_shared<InsurancePool>(&scenario);
            let vault_id = object::id_from_address(@0x123);

            claim_id = insurance::submit_claim(
                &mut pool,
                vault_id,
                CREATOR,
                15_000_000,  // Above 10M threshold
                1,
                ts::ctx(&mut scenario)
            );

            ts::return_shared(pool);
        };

        // Try to auto-process (should fail)
        {
            ts::next_tx(&mut scenario, CREATOR);

            let mut pool = ts::take_shared<InsurancePool>(&scenario);

            insurance::auto_process_claim(&mut pool, claim_id, ts::ctx(&mut scenario));

            ts::return_shared(pool);
        };

        ts::end(scenario);
    }

    #[test]
    /// Tests the has_sufficient_funds() check for insurance pool solvency.
    /// Verifies pool can correctly report whether it has enough balance to cover claims.
    fun test_has_sufficient_funds() {
        let mut scenario = ts::begin(ADMIN);

        {
            ts::next_tx(&mut scenario, ADMIN);

            let initial_fund = coin::mint_for_testing<SUI>(100_000_000, ts::ctx(&mut scenario));
            insurance::create_insurance_pool(initial_fund, 10_000_000, ts::ctx(&mut scenario));
        };

        {
            ts::next_tx(&mut scenario, ADMIN);

            let mut pool = ts::take_shared<InsurancePool>(&scenario);

            assert!(insurance::has_sufficient_funds(&pool, 50_000_000), 0);
            assert!(insurance::has_sufficient_funds(&pool, 100_000_000), 1);
            assert!(!insurance::has_sufficient_funds(&pool, 150_000_000), 2);

            ts::return_shared(pool);
        };

        ts::end(scenario);
    }
}
