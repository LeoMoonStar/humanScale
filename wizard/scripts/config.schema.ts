/**
 * Configuration schemas for PeopleCoin wizard
 */

export type Network = 'testnet' | 'mainnet' | 'localnet';

/**
 * Token configuration for creating a new creator token
 */
export interface TokenConfig {
  // Token basics
  name: string;
  symbol: string;
  decimals: number;
  description: string;
  iconUrl: string;
  totalSupply: bigint;

  // Allocations
  creatorAllocation: bigint;
  platformReserve: bigint;
  liquidityPoolAllocation: bigint;
  teamAllocation?: bigint; // Optional team/advisor allocation

  // Vesting (creator)
  vestingEnabled: boolean;
  vestingMonthlyReleaseBps: number; // Basis points (200 = 2%)
  vestingTotalReleaseBps: number;   // Total vesting amount (4000 = 40%)

  // Buyback schedule
  buybackDurationYears: number;
  buybackStartDate: number; // Unix timestamp in milliseconds
  buybackIntervalMonths: number;
  buybackAmountPerInterval: bigint;

  // AMM initial liquidity
  initialSuiLiquidity: bigint;
  initialTokenLiquidity: bigint;

  // Collateral
  initialCollateral: bigint; // SUI for buyback vault

  // Creator info
  creatorAddress: string;

  // Network
  network: Network;
}

/**
 * Platform-wide configuration (one-time initialization)
 */
export interface PlatformConfig {
  platformVaultInitialFund: bigint; // e.g., 100,000,000 SUI
  platformVaultCreditLimit: bigint; // e.g., 500,000 SUI per creator
  insurancePoolInitialFund: bigint; // e.g., 1,000,000,000 SUI
  insurancePoolMinReserve: bigint;  // e.g., 50,000,000 SUI
  network: Network;
}

/**
 * Deployment result for a creator token
 */
export interface DeploymentResult {
  creatorName: string;
  packageId: string;
  tokenType: string;
  tokenRegistryId: string;
  // Coin object IDs from create_token
  creatorCoinsId?: string;
  platformReserveCoinsId?: string;
  liquidityCoinsId?: string;
  // Component IDs
  treasuryCapId?: string;
  treasuryId?: string;
  buybackVaultId?: string;
  ammPoolId?: string;
  vestingVaultId?: string;
  distributionVaultId?: string;
  deployedAt: string;
  network: Network;
  config: TokenConfig;
}

/**
 * Platform deployment result
 */
export interface PlatformDeploymentResult {
  platformVaultId: string;
  insurancePoolId: string;
  deployedAt: string;
  network: Network;
}

/**
 * Environment configuration
 */
export interface EnvironmentConfig {
  deployerPrivateKey: string;
  rpcUrl: string;
  network: Network;
  peoplecoinPackageId: string;
  platformVaultId?: string;
  insurancePoolId?: string;
  gasBudgetPublish: number;
  gasBudgetTransaction: number;
}

/**
 * CLI options for token deployment
 */
export interface DeployTokenOptions {
  name: string;
  symbol: string;
  decimals?: number;
  description?: string;
  iconUrl?: string;
  totalSupply: string;
  creatorAllocation: string;
  platformReserve: string;
  liquidityAllocation: string;
  teamAllocation?: string;
  vestingEnabled?: boolean;
  vestingMonthlyRelease?: number;
  buybackYears: number;
  buybackStartDate?: number;
  buybackIntervalMonths: number;
  buybackAmount: string;
  initialSuiLiquidity: string;
  initialCollateral: string;
  creatorAddress?: string;
  network: Network;
}

/**
 * CLI options for platform initialization
 */
export interface InitPlatformOptions {
  vaultFund?: string;
  creditLimit?: string;
  insuranceFund?: string;
  minReserve?: string;
  network: Network;
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Transaction result from Sui
 */
export interface TransactionResult {
  digest: string;
  effects: any;
  objectChanges?: any[];
  balanceChanges?: any[];
}
