/// Platform Vault Module
///
/// Centralized vault that provides emergency buyback support to all creator vaults.
/// Acts as a safety net when individual creator collateral is insufficient.
///
/// Key Features:
/// - Large pool of platform-owned SUI for emergency buybacks
/// - Loan system with interest rates
/// - Per-creator credit limits
/// - Automatic repayment tracking
/// - Time-based punishment interest for overdue debt
///
/// Design:
/// - When a creator defaults and has insufficient collateral, their vault borrows from platform
/// - Loans accrue interest based on time borrowed (punishment mechanism)
/// - Platform vault tracks all outstanding loans and enforces limits
/// - Creators must repay loans (with interest) before withdrawing collateral

module peoplecoin::platform_vault {
    use sui::object::{Self, UID, ID};
    use sui::tx_context::{Self, TxContext};
    use sui::transfer;
    use sui::coin::{Self, Coin};
    use sui::balance::{Self, Balance};
    use sui::clock::{Self, Clock};
    use sui::table::{Self, Table};
    use sui::event;
    use sui::sui::SUI;

    /// Errors
    const ENotAuthorized: u64 = 0;
    const EInsufficientFunds: u64 = 1;
    const ECreditLimitExceeded: u64 = 2;
    const ELoanNotFound: u64 = 3;
    const EInsufficientRepayment: u64 = 4;

    /// Constants
    const PLATFORM_INTEREST_RATE_BPS: u64 = 500;  // 5% APR for platform loans
    const PUNISHMENT_INTEREST_RATE_BPS: u64 = 1000;  // 10% APR for creator debt
    const BASIS_POINTS: u64 = 10000;
    const SECONDS_PER_YEAR: u64 = 365 * 24 * 60 * 60;
    const MS_PER_SECOND: u64 = 1000;

    /// Loan record for tracking borrower debt to platform
    public struct Loan has store, copy, drop {
        borrower: address,
        vault_id: ID,
        principal: u64,  // Original amount borrowed
        borrowed_at: u64,  // Timestamp when borrowed
        last_interest_calc: u64,  // Last time interest was calculated
        accrued_interest: u64,  // Total interest accrued
        total_owed: u64,  // Principal + accrued interest
    }

    /// Per-creator debt tracking (for creator sales auto-deduction)
    public struct CreatorDebt has store, copy, drop {
        creator: address,
        principal: u64,  // Debt from defaulted buybacks
        created_at: u64,  // When debt was created
        last_interest_calc: u64,  // Last interest calculation
        accrued_interest: u64,  // Punishment interest accrued
        total_owed: u64,  // Principal + interest
        repaid_amount: u64,  // Total repaid so far
    }

    /// Platform Vault - centralized emergency fund
    public struct PlatformVault has key {
        id: UID,
        admin: address,

        // Main fund
        balance: Balance<SUI>,
        total_capacity: u64,
        total_lent: u64,

        // Loan tracking
        active_loans: Table<ID, Loan>,  // vault_id -> Loan
        creator_debts: Table<address, CreatorDebt>,  // creator -> debt

        // Configuration
        default_credit_limit: u64,  // Default credit limit per creator
        custom_credit_limits: Table<address, u64>,  // Custom limits

        // Statistics
        total_interest_earned: u64,
        total_loans_issued: u64,
        total_loans_repaid: u64,

        created_at: u64,
    }

    /// Admin capability
    public struct PlatformVaultAdminCap has key, store {
        id: UID,
        vault_id: ID,
    }

    /// Events
    public struct VaultCreated has copy, drop {
        vault_id: ID,
        initial_balance: u64,
        admin: address,
    }

    public struct LoanIssued has copy, drop {
        vault_id: ID,
        borrower: address,
        borrower_vault_id: ID,
        amount: u64,
        timestamp: u64,
    }

    public struct LoanRepaid has copy, drop {
        vault_id: ID,
        borrower: address,
        principal: u64,
        interest: u64,
        total_repaid: u64,
        timestamp: u64,
    }

    public struct DebtCreated has copy, drop {
        vault_id: ID,
        creator: address,
        amount: u64,
        timestamp: u64,
    }

    public struct DebtRepaid has copy, drop {
        vault_id: ID,
        creator: address,
        amount: u64,
        interest_paid: u64,
        remaining_debt: u64,
        timestamp: u64,
    }

    public struct FundsDeposited has copy, drop {
        vault_id: ID,
        amount: u64,
        new_balance: u64,
        timestamp: u64,
    }

    /// Create platform vault with initial funding
    public entry fun create_vault(
        initial_fund: Coin<SUI>,
        default_credit_limit: u64,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let admin = tx_context::sender(ctx);
        let balance_amount = coin::value(&initial_fund);

        let vault = PlatformVault {
            id: object::new(ctx),
            admin,
            balance: coin::into_balance(initial_fund),
            total_capacity: balance_amount,
            total_lent: 0,
            active_loans: table::new(ctx),
            creator_debts: table::new(ctx),
            default_credit_limit,
            custom_credit_limits: table::new(ctx),
            total_interest_earned: 0,
            total_loans_issued: 0,
            total_loans_repaid: 0,
            created_at: clock::timestamp_ms(clock),
        };

        let vault_id = object::id(&vault);

        let admin_cap = PlatformVaultAdminCap {
            id: object::new(ctx),
            vault_id,
        };

        event::emit(VaultCreated {
            vault_id,
            initial_balance: balance_amount,
            admin,
        });

        transfer::share_object(vault);
        transfer::transfer(admin_cap, admin);
    }

    /// Add funds to platform vault
    public entry fun deposit_funds(
        vault: &mut PlatformVault,
        _admin_cap: &PlatformVaultAdminCap,
        funds: Coin<SUI>,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        assert!(tx_context::sender(ctx) == vault.admin, ENotAuthorized);

        let amount = coin::value(&funds);
        balance::join(&mut vault.balance, coin::into_balance(funds));
        vault.total_capacity = vault.total_capacity + amount;

        event::emit(FundsDeposited {
            vault_id: object::id(vault),
            amount,
            new_balance: balance::value(&vault.balance),
            timestamp: clock::timestamp_ms(clock),
        });
    }

    /// Borrow funds for emergency buyback (called by buyback vault)
    /// Returns SUI coin to use for buyback
    public fun borrow(
        vault: &mut PlatformVault,
        borrower: address,
        borrower_vault_id: ID,
        amount: u64,
        clock: &Clock,
        ctx: &mut TxContext
    ): Coin<SUI> {
        let current_time = clock::timestamp_ms(clock);

        // Check credit limit
        let credit_limit = get_credit_limit(vault, borrower);
        let current_debt = get_total_debt_for_borrower(vault, borrower_vault_id);
        assert!(current_debt + amount <= credit_limit, ECreditLimitExceeded);

        // Check vault has funds
        let available = balance::value(&vault.balance);
        assert!(available >= amount, EInsufficientFunds);

        // Create loan record
        let loan = Loan {
            borrower,
            vault_id: borrower_vault_id,
            principal: amount,
            borrowed_at: current_time,
            last_interest_calc: current_time,
            accrued_interest: 0,
            total_owed: amount,
        };

        table::add(&mut vault.active_loans, borrower_vault_id, loan);
        vault.total_lent = vault.total_lent + amount;
        vault.total_loans_issued = vault.total_loans_issued + 1;

        event::emit(LoanIssued {
            vault_id: object::id(vault),
            borrower,
            borrower_vault_id,
            amount,
            timestamp: current_time,
        });

        coin::take(&mut vault.balance, amount, ctx)
    }

    /// Repay loan (with interest)
    public entry fun repay_loan(
        vault: &mut PlatformVault,
        borrower_vault_id: ID,
        payment: Coin<SUI>,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        assert!(table::contains(&vault.active_loans, borrower_vault_id), ELoanNotFound);

        let current_time = clock::timestamp_ms(clock);
        let payment_amount = coin::value(&payment);

        // Update interest before repayment
        update_loan_interest(vault, borrower_vault_id, current_time);

        let loan = table::borrow_mut(&mut vault.active_loans, borrower_vault_id);
        let total_owed = loan.total_owed;

        assert!(payment_amount >= total_owed, EInsufficientRepayment);

        let principal = loan.principal;
        let interest = loan.accrued_interest;
        let borrower = loan.borrower;

        // Remove loan
        table::remove(&mut vault.active_loans, borrower_vault_id);
        vault.total_lent = vault.total_lent - principal;
        vault.total_loans_repaid = vault.total_loans_repaid + 1;
        vault.total_interest_earned = vault.total_interest_earned + interest;

        // Add payment to vault
        balance::join(&mut vault.balance, coin::into_balance(payment));

        event::emit(LoanRepaid {
            vault_id: object::id(vault),
            borrower,
            principal,
            interest,
            total_repaid: payment_amount,
            timestamp: current_time,
        });
    }

    /// Create creator debt (punishment debt for defaults)
    /// Called when a creator defaults and uses platform funds
    public fun create_creator_debt(
        vault: &mut PlatformVault,
        creator: address,
        amount: u64,
        clock: &Clock,
        _ctx: &mut TxContext
    ) {
        let current_time = clock::timestamp_ms(clock);

        if (table::contains(&vault.creator_debts, creator)) {
            // Update existing debt
            let debt = table::borrow_mut(&mut vault.creator_debts, creator);
            update_creator_debt_interest(debt, current_time);
            debt.principal = debt.principal + amount;
            debt.total_owed = debt.total_owed + amount;
        } else {
            // Create new debt
            let debt = CreatorDebt {
                creator,
                principal: amount,
                created_at: current_time,
                last_interest_calc: current_time,
                accrued_interest: 0,
                total_owed: amount,
                repaid_amount: 0,
            };
            table::add(&mut vault.creator_debts, creator, debt);
        };

        event::emit(DebtCreated {
            vault_id: object::id(vault),
            creator,
            amount,
            timestamp: current_time,
        });
    }

    /// Repay creator debt (deducted from sales automatically)
    /// Takes payment, deducts debt, and transfers remainder to creator
    /// Returns amount actually deducted for debt
    public fun repay_creator_debt(
        vault: &mut PlatformVault,
        creator: address,
        payment: Coin<SUI>,
        clock: &Clock,
        ctx: &mut TxContext
    ): u64 {
        let payment_amount = coin::value(&payment);

        if (!table::contains(&vault.creator_debts, creator)) {
            // No debt - return all to creator
            transfer::public_transfer(payment, creator);
            return 0
        };

        let current_time = clock::timestamp_ms(clock);

        let debt = table::borrow_mut(&mut vault.creator_debts, creator);
        update_creator_debt_interest(debt, current_time);

        let amount_to_repay = if (payment_amount >= debt.total_owed) {
            debt.total_owed
        } else {
            payment_amount
        };

        // Calculate how much is principal vs interest
        let interest_paid = if (amount_to_repay >= debt.accrued_interest) {
            let int = debt.accrued_interest;
            debt.accrued_interest = 0;
            int
        } else {
            debt.accrued_interest = debt.accrued_interest - amount_to_repay;
            amount_to_repay
        };

        let principal_paid = amount_to_repay - interest_paid;
        debt.principal = debt.principal - principal_paid;
        debt.total_owed = debt.total_owed - amount_to_repay;
        debt.repaid_amount = debt.repaid_amount + amount_to_repay;

        vault.total_interest_earned = vault.total_interest_earned + interest_paid;

        // Split payment: debt portion to vault, remainder to creator
        if (payment_amount > amount_to_repay) {
            // Split the payment
            let mut payment_balance = coin::into_balance(payment);
            let debt_payment = balance::split(&mut payment_balance, amount_to_repay);
            balance::join(&mut vault.balance, debt_payment);

            // Return remainder to creator
            let remainder = coin::from_balance(payment_balance, ctx);
            transfer::public_transfer(remainder, creator);
        } else {
            // All goes to debt
            balance::join(&mut vault.balance, coin::into_balance(payment));
        };

        // Remove debt if fully paid
        let remaining = debt.total_owed;
        if (remaining == 0) {
            table::remove(&mut vault.creator_debts, creator);
        };

        event::emit(DebtRepaid {
            vault_id: object::id(vault),
            creator,
            amount: amount_to_repay,
            interest_paid,
            remaining_debt: remaining,
            timestamp: current_time,
        });

        amount_to_repay
    }

    /// Update loan interest (internal helper)
    fun update_loan_interest(
        vault: &mut PlatformVault,
        vault_id: ID,
        current_time: u64
    ) {
        let loan = table::borrow_mut(&mut vault.active_loans, vault_id);
        let time_elapsed_ms = current_time - loan.last_interest_calc;
        let time_elapsed_seconds = time_elapsed_ms / MS_PER_SECOND;

        // Calculate interest: principal * rate * time / year
        let interest = (loan.principal * PLATFORM_INTEREST_RATE_BPS * time_elapsed_seconds)
                      / (BASIS_POINTS * SECONDS_PER_YEAR);

        loan.accrued_interest = loan.accrued_interest + interest;
        loan.total_owed = loan.principal + loan.accrued_interest;
        loan.last_interest_calc = current_time;
    }

    /// Update creator debt interest (punishment rate)
    fun update_creator_debt_interest(
        debt: &mut CreatorDebt,
        current_time: u64
    ) {
        let time_elapsed_ms = current_time - debt.last_interest_calc;
        let time_elapsed_seconds = time_elapsed_ms / MS_PER_SECOND;

        // Higher punishment rate for creator debt
        let interest = (debt.principal * PUNISHMENT_INTEREST_RATE_BPS * time_elapsed_seconds)
                      / (BASIS_POINTS * SECONDS_PER_YEAR);

        debt.accrued_interest = debt.accrued_interest + interest;
        debt.total_owed = debt.principal + debt.accrued_interest;
        debt.last_interest_calc = current_time;
    }

    /// Set custom credit limit for creator
    public entry fun set_credit_limit(
        vault: &mut PlatformVault,
        _admin_cap: &PlatformVaultAdminCap,
        creator: address,
        limit: u64,
        ctx: &mut TxContext
    ) {
        assert!(tx_context::sender(ctx) == vault.admin, ENotAuthorized);

        if (table::contains(&vault.custom_credit_limits, creator)) {
            let existing_limit = table::borrow_mut(&mut vault.custom_credit_limits, creator);
            *existing_limit = limit;
        } else {
            table::add(&mut vault.custom_credit_limits, creator, limit);
        };
    }

    // ===== VIEW FUNCTIONS =====

    /// Get credit limit for creator
    public fun get_credit_limit(vault: &PlatformVault, creator: address): u64 {
        if (table::contains(&vault.custom_credit_limits, creator)) {
            *table::borrow(&vault.custom_credit_limits, creator)
        } else {
            vault.default_credit_limit
        }
    }

    /// Get total debt for a specific borrower vault
    fun get_total_debt_for_borrower(vault: &PlatformVault, vault_id: ID): u64 {
        if (table::contains(&vault.active_loans, vault_id)) {
            let loan = table::borrow(&vault.active_loans, vault_id);
            loan.total_owed
        } else {
            0
        }
    }

    /// Get platform vault status
    public fun get_vault_status(vault: &PlatformVault): (
        u64,  // total_capacity
        u64,  // available balance
        u64,  // total_lent
        u64,  // total_interest_earned
        u64,  // active_loans_count
    ) {
        (
            vault.total_capacity,
            balance::value(&vault.balance),
            vault.total_lent,
            vault.total_interest_earned,
            vault.total_loans_issued - vault.total_loans_repaid,
        )
    }

    /// Get creator debt with current interest
    public fun get_creator_debt(
        vault: &PlatformVault,
        creator: address,
        current_time: u64
    ): (u64, u64, u64, u64) {  // (principal, interest, total_owed, days_in_debt)
        if (!table::contains(&vault.creator_debts, creator)) {
            return (0, 0, 0, 0)
        };

        let debt = table::borrow(&vault.creator_debts, creator);

        // Calculate current interest
        let time_elapsed_ms = current_time - debt.last_interest_calc;
        let time_elapsed_seconds = time_elapsed_ms / MS_PER_SECOND;
        let additional_interest = (debt.principal * PUNISHMENT_INTEREST_RATE_BPS * time_elapsed_seconds)
                                  / (BASIS_POINTS * SECONDS_PER_YEAR);

        let total_interest = debt.accrued_interest + additional_interest;
        let total_owed = debt.principal + total_interest;
        let days_in_debt = (current_time - debt.created_at) / (24 * 60 * 60 * 1000);

        (debt.principal, total_interest, total_owed, days_in_debt)
    }

    /// Check if creator has debt
    public fun has_debt(vault: &PlatformVault, creator: address): bool {
        table::contains(&vault.creator_debts, creator)
    }

    /// Get punishment interest rate (for display)
    public fun get_punishment_interest_rate_bps(): u64 {
        PUNISHMENT_INTEREST_RATE_BPS
    }

    /// Get platform loan interest rate (for display)
    public fun get_platform_interest_rate_bps(): u64 {
        PLATFORM_INTEREST_RATE_BPS
    }
}
