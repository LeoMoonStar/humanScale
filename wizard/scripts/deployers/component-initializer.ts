/**
 * Component Initializer
 * Initializes all components after token creation:
 * - Creator Treasury (vesting)
 * - Buyback Vault (with collateral)
 * - AMM Liquidity Pool (with initial liquidity)
 * - Optional: Distribution Vault
 */

import { TransactionBlock } from '@mysten/sui.js/transactions';
import { SuiClientWrapper } from '../utils/sui-client';
import { Logger } from '../utils/logger';
import { TokenConfig, DeploymentResult } from '../config.schema';

export class ComponentInitializer {
  private client: SuiClientWrapper;

  constructor(client: SuiClientWrapper) {
    this.client = client;
  }

  /**
   * Initialize all components for a deployed token
   */
  async initializeComponents(
    config: TokenConfig,
    deploymentResult: DeploymentResult
  ): Promise<DeploymentResult> {
    Logger.section('Initializing Components');

    const packageId = this.client.getPeopleCoinPackageId();
    const platformVaultId = this.client.getPlatformVaultId();
    const insurancePoolId = this.client.getInsurancePoolId();

    if (!platformVaultId || !insurancePoolId) {
      throw new Error('Platform not initialized. Run wizard:init-platform first.');
    }

    // Get token type
    const tokenType = deploymentResult.tokenType;

    try {
      // Step 1: Create Creator Treasury (if vesting enabled)
      let treasuryId: string | undefined;
      if (config.vestingEnabled && deploymentResult.creatorCoinsId) {
        Logger.step(1, 'Creating Creator Treasury with vesting...');
        treasuryId = await this.createCreatorTreasury(
          config,
          deploymentResult.tokenRegistryId,
          deploymentResult.creatorCoinsId,
          tokenType
        );
        Logger.success(`Creator Treasury created: ${treasuryId}`);
        deploymentResult.treasuryId = treasuryId;
      }

      // Step 2: Create Buyback Vault
      Logger.step(2, 'Creating Buyback Vault...');
      const buybackVaultId = await this.createBuybackVault(
        config,
        deploymentResult.tokenRegistryId,
        tokenType
      );
      Logger.success(`Buyback Vault created: ${buybackVaultId}`);
      deploymentResult.buybackVaultId = buybackVaultId;

      // Step 3: Create AMM Pool
      if (deploymentResult.liquidityCoinsId) {
        Logger.step(3, 'Creating AMM Liquidity Pool...');
        const ammPoolId = await this.createAMMPool(
          config,
          deploymentResult.tokenRegistryId,
          insurancePoolId,
          deploymentResult.liquidityCoinsId,
          tokenType
        );
        Logger.success(`AMM Pool created: ${ammPoolId}`);
        deploymentResult.ammPoolId = ammPoolId;
      }

      // Step 4: Create Distribution Vault (for platform reserves)
      if (config.platformReserve > 0n && deploymentResult.platformReserveCoinsId && deploymentResult.ammPoolId) {
        Logger.step(4, 'Creating Distribution Vault for platform reserves...');
        const distributionVaultId = await this.createDistributionVault(
          config,
          deploymentResult.tokenRegistryId,
          deploymentResult.ammPoolId,
          deploymentResult.platformReserveCoinsId,
          tokenType
        );
        Logger.success(`Distribution Vault created: ${distributionVaultId}`);
        deploymentResult.distributionVaultId = distributionVaultId;
      }

      Logger.section('Component Initialization Complete');
      return deploymentResult;
    } catch (error: any) {
      Logger.error('Component initialization failed', error);
      throw error;
    }
  }

  /**
   * Create Creator Treasury with vesting
   */
  private async createCreatorTreasury(
    config: TokenConfig,
    tokenRegistryId: string,
    creatorCoinsId: string,
    tokenType: string
  ): Promise<string> {
    const txb = new TransactionBlock();
    const packageId = this.client.getPeopleCoinPackageId();
    const platformAddress = this.client.getAddress(); // Platform receives distributed tokens

    // Calculate vesting parameters
    const creatorPortionBps = config.vestingTotalReleaseBps; // e.g., 4000 = 40%
    const platformPortionBps = 10000 - creatorPortionBps; // e.g., 6000 = 60%
    const creatorMonthlyUnlockBps = config.vestingMonthlyReleaseBps; // e.g., 200 = 2%
    const platformMonthlyUnlockBps = config.vestingMonthlyReleaseBps; // Same rate
    const unlockIntervalMs = 30 * 24 * 60 * 60 * 1000; // 30 days

    // Create buyback milestones
    const milestones = [];
    const intervalMs = config.buybackIntervalMonths * 30 * 24 * 60 * 60 * 1000;
    const numMilestones = Math.floor(
      (config.buybackDurationYears * 365 * 24 * 60 * 60 * 1000) / intervalMs
    );

    for (let i = 0; i < numMilestones; i++) {
      const milestone = txb.moveCall({
        target: `${packageId}::creator_treasury::create_test_milestone`,
        arguments: [
          txb.pure(i + 1, 'u64'), // milestone_number
          txb.pure(config.buybackStartDate + (i + 1) * intervalMs, 'u64'), // deadline
          txb.pure(config.buybackAmountPerInterval, 'u64'), // amount
        ],
      });
      milestones.push(milestone);
    }

    // Create milestones vector
    const milestonesVector = txb.makeMoveVec({
      elements: milestones,
    });

    // Call creator_treasury::create_treasury
    const treasuryId = txb.moveCall({
      target: `${packageId}::creator_treasury::create_treasury`,
      typeArguments: [tokenType],
      arguments: [
        txb.object(creatorCoinsId), // creator_tokens
        txb.pure(platformAddress, 'address'), // platform_address
        txb.pure(creatorPortionBps, 'u16'), // creator_portion_bps
        txb.pure(platformPortionBps, 'u16'), // platform_portion_bps
        txb.pure(creatorMonthlyUnlockBps, 'u16'), // creator_monthly_unlock_bps
        txb.pure(platformMonthlyUnlockBps, 'u16'), // platform_monthly_unlock_bps
        txb.pure(unlockIntervalMs, 'u64'), // unlock_interval_ms
        milestonesVector, // buyback_milestones
        txb.object('0x6'), // Clock
      ],
    });

    const result = await this.client.executeTransaction(txb);

    // The function returns ID, extract from transaction effects
    // Look for shared CreatorTreasury object
    const treasuryObj = result.objectChanges?.find(
      (obj: any) => obj.type === 'created' && obj.objectType?.includes('CreatorTreasury')
    );

    if (!treasuryObj || !treasuryObj.objectId) {
      throw new Error('CreatorTreasury not found in transaction result');
    }

    return treasuryObj.objectId;
  }

  /**
   * Create Buyback Vault with collateral
   */
  private async createBuybackVault(
    config: TokenConfig,
    tokenRegistryId: string,
    tokenType: string
  ): Promise<string> {
    const txb = new TransactionBlock();
    const packageId = this.client.getPeopleCoinPackageId();

    // Create collateral coin
    const [collateralCoin] = txb.splitCoins(txb.gas, [txb.pure(config.initialCollateral)]);

    // Call buyback_vault::create_vault_from_registry
    txb.moveCall({
      target: `${packageId}::buyback_vault::create_vault_from_registry`,
      typeArguments: [tokenType],
      arguments: [
        txb.object(tokenRegistryId), // token_registry (shared object)
        collateralCoin, // collateral
        txb.object('0x6'), // Clock
      ],
    });

    const result = await this.client.executeTransaction(txb);

    // Extract buyback vault ID
    const vaultObj = result.objectChanges?.find(
      (obj: any) => obj.type === 'created' && obj.objectType?.includes('BuybackVault')
    );

    if (!vaultObj || !vaultObj.objectId) {
      throw new Error('BuybackVault not found in transaction result');
    }

    return vaultObj.objectId;
  }

  /**
   * Create AMM Liquidity Pool
   */
  private async createAMMPool(
    config: TokenConfig,
    tokenRegistryId: string,
    insurancePoolId: string,
    liquidityCoinsId: string,
    tokenType: string
  ): Promise<string> {
    const txb = new TransactionBlock();
    const packageId = this.client.getPeopleCoinPackageId();

    // Create SUI coin for liquidity
    const [suiCoin] = txb.splitCoins(txb.gas, [txb.pure(config.initialSuiLiquidity)]);

    // Call amm::create_pool
    txb.moveCall({
      target: `${packageId}::amm::create_pool`,
      typeArguments: [tokenType],
      arguments: [
        txb.pure(tokenRegistryId, 'address'), // token_registry_id (ID is actually address)
        txb.pure(insurancePoolId, 'address'), // insurance_pool_id
        suiCoin, // sui_amount
        txb.object(liquidityCoinsId), // token_amount (coin from creation)
      ],
    });

    const result = await this.client.executeTransaction(txb);

    // Extract AMM pool ID
    const poolObj = result.objectChanges?.find(
      (obj: any) => obj.type === 'created' && obj.objectType?.includes('LiquidityPool')
    );

    if (!poolObj || !poolObj.objectId) {
      throw new Error('LiquidityPool not found in transaction result');
    }

    return poolObj.objectId;
  }

  /**
   * Create Distribution Vault for platform reserves
   */
  private async createDistributionVault(
    config: TokenConfig,
    tokenRegistryId: string,
    ammPoolId: string,
    platformReserveCoinsId: string,
    tokenType: string
  ): Promise<string> {
    const txb = new TransactionBlock();
    const packageId = this.client.getPeopleCoinPackageId();

    // Distribution parameters
    const distributionPeriodYears = 2; // 2 years
    const releaseIntervalMonths = 3; // Every 3 months

    // Call distribution::create_distribution_vault
    txb.moveCall({
      target: `${packageId}::distribution::create_distribution_vault`,
      typeArguments: [tokenType],
      arguments: [
        txb.pure(tokenRegistryId, 'address'), // token_registry_id
        txb.object(platformReserveCoinsId), // reserve_tokens
        txb.pure(distributionPeriodYears, 'u8'), // distribution_period_years
        txb.pure(releaseIntervalMonths, 'u8'), // release_interval_months
        txb.pure(ammPoolId, 'address'), // target_pool_id
        txb.object('0x6'), // Clock
      ],
    });

    const result = await this.client.executeTransaction(txb);

    // Extract distribution vault ID
    const vaultObj = result.objectChanges?.find(
      (obj: any) => obj.type === 'created' && obj.objectType?.includes('DistributionVault')
    );

    if (!vaultObj || !vaultObj.objectId) {
      throw new Error('DistributionVault not found in transaction result');
    }

    return vaultObj.objectId;
  }

  /**
   * Initialize all components in a single transaction (advanced)
   * This would be more efficient but requires careful coin management
   */
  async initializeAllInOneTransaction(
    config: TokenConfig,
    tokenType: string,
    tokenRegistryId: string,
    creatorCoinsId: string,
    platformReserveCoinsId: string,
    liquidityCoinsId: string
  ): Promise<{
    treasuryId: string;
    buybackVaultId: string;
    ammPoolId: string;
    distributionVaultId?: string;
  }> {
    Logger.section('Initializing All Components (Single Transaction)');

    const txb = new TransactionBlock();
    const packageId = this.client.getPeopleCoinPackageId();
    const insurancePoolId = this.client.getInsurancePoolId()!;
    const platformAddress = this.client.getAddress();

    // 1. Create collateral for buyback vault
    const [collateral] = txb.splitCoins(txb.gas, [txb.pure(config.initialCollateral)]);

    // 2. Create buyback vault
    txb.moveCall({
      target: `${packageId}::buyback_vault::create_vault_from_registry`,
      typeArguments: [tokenType],
      arguments: [
        txb.object(tokenRegistryId),
        collateral,
        txb.object('0x6'),
      ],
    });

    // 3. Create SUI liquidity
    const [suiLiquidity] = txb.splitCoins(txb.gas, [txb.pure(config.initialSuiLiquidity)]);

    // 4. Create AMM pool
    txb.moveCall({
      target: `${packageId}::amm::create_pool`,
      typeArguments: [tokenType],
      arguments: [
        txb.pure(tokenRegistryId, 'address'),
        txb.pure(insurancePoolId, 'address'),
        suiLiquidity,
        txb.object(liquidityCoinsId),
      ],
    });

    // Execute transaction
    const result = await this.client.executeTransaction(txb);

    // Extract created object IDs
    const buybackVault = result.objectChanges?.find(
      (obj: any) => obj.type === 'created' && obj.objectType?.includes('BuybackVault')
    )?.objectId || '';

    const ammPool = result.objectChanges?.find(
      (obj: any) => obj.type === 'created' && obj.objectType?.includes('LiquidityPool')
    )?.objectId || '';

    return {
      treasuryId: '', // Would need separate transaction for treasury
      buybackVaultId: buybackVault,
      ammPoolId: ammPool,
    };
  }
}
