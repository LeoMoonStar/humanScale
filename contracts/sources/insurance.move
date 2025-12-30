/// Insurance Pool Module
///
/// Platform-wide insurance fund to protect investors from creator defaults.
/// Funded by 0.1% of all trading fees (out of 0.5% total).
///
/// Key Features:
/// - Collects fees from all AMM pools
/// - Covers buyback defaults when collateral insufficient
/// - Governance for fund allocation
/// - Transparent usage tracking

module peoplecoin::insurance {
    use sui::object::{Self, UID, ID};
    use sui::tx_context::{Self, TxContext};
    use sui::transfer;
    use sui::coin::{Self, Coin};
    use sui::balance::{Self, Balance};
    use sui::sui::SUI;
    use sui::event;
    use sui::table::{Self, Table};

    /// Errors
    const ENotAuthorized: u64 = 0;
    const EInsufficientFunds: u64 = 1;
    const EClaimAlreadyProcessed: u64 = 2;
    const EInvalidAmount: u64 = 3;

    /// Insurance claim record
    struct ClaimRecord has store, copy, drop {
        claim_id: u64,
        vault_id: ID,
        creator: address,
        amount_claimed: u64,
        milestone_number: u64,
        approved: bool,
        processed: bool,
        created_at: u64,
        processed_at: u64,
    }

    /// Platform-wide insurance pool
    struct InsurancePool has key {
        id: UID,

        // Insurance fund
        fund_balance: Balance<SUI>,

        // Governance
        platform_admin: address,
        approval_threshold: u64,  // Amount requiring approval

        // Claim tracking
        claims: Table<u64, ClaimRecord>,
        next_claim_id: u64,
        total_claims_paid: u64,

        // Statistics
        total_fees_collected: u64,
        total_claims_submitted: u64,
        total_claims_approved: u64,

        // Configuration
        created_at: u64,
    }

    /// Admin capability for insurance pool
    struct InsuranceAdminCap has key, store {
        id: UID,
        pool_id: ID,
    }

    /// Events
    struct InsuranceFundsAdded has copy, drop {
        pool_id: ID,
        amount: u64,
        from_pool: ID,  // Which AMM pool contributed
        timestamp: u64,
    }

    struct ClaimSubmitted has copy, drop {
        claim_id: u64,
        vault_id: ID,
        creator: address,
        amount: u64,
        timestamp: u64,
    }

    struct ClaimApproved has copy, drop {
        claim_id: u64,
        vault_id: ID,
        amount: u64,
        timestamp: u64,
    }

    struct ClaimPaid has copy, drop {
        claim_id: u64,
        vault_id: ID,
        recipient: address,
        amount: u64,
        timestamp: u64,
    }

    /// Initialize the insurance pool
    public entry fun create_insurance_pool(
        initial_fund: Coin<SUI>,
        approval_threshold: u64,
        ctx: &mut TxContext
    ) {
        let platform_admin = tx_context::sender(ctx);

        let pool = InsurancePool {
            id: object::new(ctx),
            fund_balance: coin::into_balance(initial_fund),
            platform_admin,
            approval_threshold,
            claims: table::new(ctx),
            next_claim_id: 1,
            total_claims_paid: 0,
            total_fees_collected: balance::value(&coin::into_balance(initial_fund)),
            total_claims_submitted: 0,
            total_claims_approved: 0,
            created_at: tx_context::epoch(ctx),
        };

        let pool_id = object::id(&pool);

        // Create admin capability
        let admin_cap = InsuranceAdminCap {
            id: object::new(ctx),
            pool_id,
        };

        // Share pool and transfer admin cap
        transfer::share_object(pool);
        transfer::transfer(admin_cap, platform_admin);
    }

    /// Add insurance funds (called by AMM during swaps)
    public fun add_insurance_funds(
        pool: &mut InsurancePool,
        funds: Coin<SUI>,
    ) {
        let amount = coin::value(&funds);
        balance::join(&mut pool.fund_balance, coin::into_balance(funds));

        pool.total_fees_collected = pool.total_fees_collected + amount;

        // Event emitted by AMM with from_pool info
    }

    /// Submit insurance claim for a defaulted buyback
    /// Called automatically by buyback vault when creator defaults
    public fun submit_claim(
        pool: &mut InsurancePool,
        vault_id: ID,
        creator: address,
        amount: u64,
        milestone_number: u64,
        ctx: &mut TxContext
    ): u64 {
        assert!(amount > 0, EInvalidAmount);

        let claim_id = pool.next_claim_id;
        pool.next_claim_id = pool.next_claim_id + 1;

        let claim = ClaimRecord {
            claim_id,
            vault_id,
            creator,
            amount_claimed: amount,
            milestone_number,
            approved: false,
            processed: false,
            created_at: tx_context::epoch(ctx),
            processed_at: 0,
        };

        table::add(&mut pool.claims, claim_id, claim);
        pool.total_claims_submitted = pool.total_claims_submitted + 1;

        // Emit event
        event::emit(ClaimSubmitted {
            claim_id,
            vault_id,
            creator,
            amount,
            timestamp: tx_context::epoch(ctx),
        });

        claim_id
    }

    /// Approve insurance claim (admin function)
    public entry fun approve_claim(
        pool: &mut InsurancePool,
        _admin_cap: &InsuranceAdminCap,
        claim_id: u64,
        ctx: &mut TxContext
    ) {
        assert!(tx_context::sender(ctx) == pool.platform_admin, ENotAuthorized);
        assert!(table::contains(&pool.claims, claim_id), EClaimAlreadyProcessed);

        let claim = table::borrow_mut(&mut pool.claims, claim_id);
        assert!(!claim.approved, EClaimAlreadyProcessed);

        claim.approved = true;
        pool.total_claims_approved = pool.total_claims_approved + 1;

        // Emit event
        event::emit(ClaimApproved {
            claim_id,
            vault_id: claim.vault_id,
            amount: claim.amount_claimed,
            timestamp: tx_context::epoch(ctx),
        });
    }

    /// Process approved claim and send funds
    public entry fun process_claim(
        pool: &mut InsurancePool,
        _admin_cap: &InsuranceAdminCap,
        claim_id: u64,
        ctx: &mut TxContext
    ) {
        assert!(tx_context::sender(ctx) == pool.platform_admin, ENotAuthorized);
        assert!(table::contains(&pool.claims, claim_id), EClaimAlreadyProcessed);

        let claim = table::borrow_mut(&mut pool.claims, claim_id);
        assert!(claim.approved, ENotAuthorized);
        assert!(!claim.processed, EClaimAlreadyProcessed);

        let amount = claim.amount_claimed;
        assert!(balance::value(&pool.fund_balance) >= amount, EInsufficientFunds);

        // Mark as processed
        claim.processed = true;
        claim.processed_at = tx_context::epoch(ctx);

        // Extract funds
        let claim_balance = balance::split(&mut pool.fund_balance, amount);
        let claim_coin = coin::from_balance(claim_balance, ctx);

        pool.total_claims_paid = pool.total_claims_paid + amount;

        // Emit event
        event::emit(ClaimPaid {
            claim_id,
            vault_id: claim.vault_id,
            recipient: claim.creator,
            amount,
            timestamp: tx_context::epoch(ctx),
        });

        // Transfer funds to buyback vault (in production, would integrate with vault)
        // For now, transfer to creator who will use it for buyback
        transfer::public_transfer(claim_coin, claim.creator);
    }

    /// Auto-approve and process small claims (below threshold)
    public entry fun auto_process_claim(
        pool: &mut InsurancePool,
        claim_id: u64,
        ctx: &mut TxContext
    ) {
        assert!(table::contains(&pool.claims, claim_id), EClaimAlreadyProcessed);

        let claim = table::borrow_mut(&mut pool.claims, claim_id);
        assert!(!claim.processed, EClaimAlreadyProcessed);
        assert!(claim.amount_claimed <= pool.approval_threshold, ENotAuthorized);

        // Auto-approve small claims
        if (!claim.approved) {
            claim.approved = true;
            pool.total_claims_approved = pool.total_claims_approved + 1;
        };

        let amount = claim.amount_claimed;
        assert!(balance::value(&pool.fund_balance) >= amount, EInsufficientFunds);

        // Mark as processed
        claim.processed = true;
        claim.processed_at = tx_context::epoch(ctx);

        // Extract funds
        let claim_balance = balance::split(&mut pool.fund_balance, amount);
        let claim_coin = coin::from_balance(claim_balance, ctx);

        pool.total_claims_paid = pool.total_claims_paid + amount;

        // Emit events
        event::emit(ClaimApproved {
            claim_id,
            vault_id: claim.vault_id,
            amount,
            timestamp: tx_context::epoch(ctx),
        });

        event::emit(ClaimPaid {
            claim_id,
            vault_id: claim.vault_id,
            recipient: claim.creator,
            amount,
            timestamp: tx_context::epoch(ctx),
        });

        // Transfer funds
        transfer::public_transfer(claim_coin, claim.creator);
    }

    /// Platform can add additional funds to insurance pool
    public entry fun add_platform_contribution(
        pool: &mut InsurancePool,
        contribution: Coin<SUI>,
        ctx: &mut TxContext
    ) {
        assert!(tx_context::sender(ctx) == pool.platform_admin, ENotAuthorized);

        let amount = coin::value(&contribution);
        balance::join(&mut pool.fund_balance, coin::into_balance(contribution));

        pool.total_fees_collected = pool.total_fees_collected + amount;
    }

    /// Emergency withdrawal (only platform admin, use with extreme caution)
    public entry fun emergency_withdraw(
        pool: &mut InsurancePool,
        _admin_cap: &InsuranceAdminCap,
        amount: u64,
        ctx: &mut TxContext
    ) {
        assert!(tx_context::sender(ctx) == pool.platform_admin, ENotAuthorized);
        assert!(balance::value(&pool.fund_balance) >= amount, EInsufficientFunds);

        let withdraw_balance = balance::split(&mut pool.fund_balance, amount);
        let withdraw_coin = coin::from_balance(withdraw_balance, ctx);

        transfer::public_transfer(withdraw_coin, pool.platform_admin);
    }

    /// View function: Get pool status
    public fun get_pool_status(pool: &InsurancePool): (
        u64,  // total_balance
        u64,  // total_fees_collected
        u64,  // total_claims_paid
        u64,  // total_claims_submitted
        u64,  // total_claims_approved
    ) {
        (
            balance::value(&pool.fund_balance),
            pool.total_fees_collected,
            pool.total_claims_paid,
            pool.total_claims_submitted,
            pool.total_claims_approved,
        )
    }

    /// View function: Get claim details
    public fun get_claim(pool: &InsurancePool, claim_id: u64): &ClaimRecord {
        table::borrow(&pool.claims, claim_id)
    }

    /// View function: Check if pool has sufficient funds for amount
    public fun has_sufficient_funds(pool: &InsurancePool, amount: u64): bool {
        balance::value(&pool.fund_balance) >= amount
    }
}
