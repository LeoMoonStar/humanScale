#!/usr/bin/env node

/**
 * PeopleCoin Deployment Wizard - Main CLI Entry Point
 */

import { Command } from 'commander';
import inquirer from 'inquirer';
import { SuiClientWrapper } from './utils/sui-client';
import { Logger } from './utils/logger';
import { Validator } from './utils/validator';
import { PlatformDeployer } from './deployers/platform-deployer';
import { TokenDeployer } from './deployers/token-deployer';
import { ComponentInitializer } from './deployers/component-initializer';
import {
  Network,
  TokenConfig,
  PlatformConfig,
  DeployTokenOptions,
  InitPlatformOptions,
} from './config.schema';

const program = new Command();

program
  .name('peoplecoin-wizard')
  .description('PeopleCoin deployment wizard for creator tokens')
  .version('1.0.0');

/**
 * Initialize Platform Command
 */
program
  .command('init-platform')
  .description('Initialize platform (Platform Vault + Insurance Pool) - ONE TIME ONLY')
  .option('--network <network>', 'Network (testnet/mainnet/localnet)', 'testnet')
  .option('--vault-fund <amount>', 'Platform vault initial fund (SUI)', '100000000')
  .option('--credit-limit <amount>', 'Per-creator credit limit (SUI)', '500000')
  .option('--insurance-fund <amount>', 'Insurance pool initial fund (SUI)', '1000000000')
  .option('--min-reserve <amount>', 'Insurance pool min reserve (SUI)', '50000000')
  .action(async (options: InitPlatformOptions) => {
    try {
      Logger.section('Platform Initialization');

      // Confirm with user
      const { confirm } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirm',
          message: `Initialize platform on ${options.network}? This is a ONE-TIME operation.`,
          default: false,
        },
      ]);

      if (!confirm) {
        Logger.info('Cancelled by user');
        process.exit(0);
      }

      // Parse configuration
      const config: PlatformConfig = {
        platformVaultInitialFund: Validator.parseNumericInput(
          options.vaultFund || '100000000',
          'vault fund'
        ),
        platformVaultCreditLimit: Validator.parseNumericInput(
          options.creditLimit || '500000',
          'credit limit'
        ),
        insurancePoolInitialFund: Validator.parseNumericInput(
          options.insuranceFund || '1000000000',
          'insurance fund'
        ),
        insurancePoolMinReserve: Validator.parseNumericInput(
          options.minReserve || '50000000',
          'min reserve'
        ),
        network: options.network as Network,
      };

      // Initialize client
      const client = new SuiClientWrapper(config.network);
      Logger.info(`Connected to ${config.network}`);
      Logger.info(`Deployer address: ${client.getAddress()}`);

      // Check balance
      const requiredBalance =
        config.platformVaultInitialFund + config.insurancePoolInitialFund;
      await client.checkBalance(requiredBalance);

      // Deploy platform
      const deployer = new PlatformDeployer(client);
      const result = await deployer.deployPlatform(config);

      Logger.success('Platform initialization complete!');
      Logger.info('Platform IDs saved to .env');
      Logger.info('You can now deploy creator tokens using: npm run wizard:deploy');
    } catch (error: any) {
      Logger.error('Platform initialization failed', error);
      process.exit(1);
    }
  });

/**
 * Deploy Token Command
 */
program
  .command('deploy')
  .description('Deploy a complete creator token system')
  .requiredOption('--name <name>', 'Token name (e.g., "Alice Token")')
  .requiredOption('--symbol <symbol>', 'Token symbol (e.g., "ALICE")')
  .option('--decimals <decimals>', 'Token decimals', '8')
  .option('--description <desc>', 'Token description', '')
  .option('--icon-url <url>', 'Token icon URL', '')
  .requiredOption('--total-supply <amount>', 'Total token supply')
  .requiredOption('--creator-allocation <amount>', 'Creator allocation')
  .requiredOption('--platform-reserve <amount>', 'Platform reserve')
  .requiredOption('--liquidity-allocation <amount>', 'Liquidity pool allocation')
  .option('--team-allocation <amount>', 'Team allocation (optional)')
  .option('--vesting-enabled', 'Enable vesting for creator', true)
  .option('--vesting-monthly-release <bps>', 'Monthly vesting release (bps)', '200')
  .requiredOption('--buyback-years <years>', 'Buyback duration (years)')
  .option('--buyback-start-date <timestamp>', 'Buyback start date (unix ms)')
  .requiredOption('--buyback-interval-months <months>', 'Buyback interval (months)')
  .requiredOption('--buyback-amount <amount>', 'Tokens to buyback per interval')
  .requiredOption('--initial-sui-liquidity <amount>', 'Initial SUI for AMM')
  .requiredOption('--initial-collateral <amount>', 'SUI collateral for buyback')
  .option('--creator-address <address>', 'Creator address (default: deployer)')
  .requiredOption('--network <network>', 'Network (testnet/mainnet/localnet)')
  .action(async (options: DeployTokenOptions) => {
    try {
      Logger.section(`Deploying ${options.name}`);

      // Confirm with user
      const { confirm } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirm',
          message: `Deploy ${options.name} (${options.symbol}) on ${options.network}?`,
          default: false,
        },
      ]);

      if (!confirm) {
        Logger.info('Cancelled by user');
        process.exit(0);
      }

      // Parse configuration
      const totalSupply = Validator.parseNumericInput(options.totalSupply, 'total supply');
      const creatorAllocation = Validator.parseNumericInput(
        options.creatorAllocation,
        'creator allocation'
      );
      const platformReserve = Validator.parseNumericInput(
        options.platformReserve,
        'platform reserve'
      );
      const liquidityAllocation = Validator.parseNumericInput(
        options.liquidityAllocation,
        'liquidity allocation'
      );
      const teamAllocation = options.teamAllocation
        ? Validator.parseNumericInput(options.teamAllocation, 'team allocation')
        : 0n;

      const config: TokenConfig = {
        name: options.name,
        symbol: options.symbol,
        decimals: parseInt(options.decimals || '8'),
        description: options.description || `${options.name} creator token`,
        iconUrl: options.iconUrl || '',
        totalSupply,
        creatorAllocation,
        platformReserve,
        liquidityPoolAllocation: liquidityAllocation,
        teamAllocation: teamAllocation > 0n ? teamAllocation : undefined,
        vestingEnabled: options.vestingEnabled !== false,
        vestingMonthlyReleaseBps: parseInt(options.vestingMonthlyRelease || '200'),
        vestingTotalReleaseBps: 10000, // 100%
        buybackDurationYears: parseInt(options.buybackYears),
        buybackStartDate: options.buybackStartDate
          ? parseInt(options.buybackStartDate)
          : Date.now() + 86400000, // Tomorrow
        buybackIntervalMonths: parseInt(options.buybackIntervalMonths),
        buybackAmountPerInterval: Validator.parseNumericInput(
          options.buybackAmount,
          'buyback amount'
        ),
        initialSuiLiquidity: Validator.parseNumericInput(
          options.initialSuiLiquidity,
          'initial SUI liquidity'
        ),
        initialTokenLiquidity: liquidityAllocation, // Use full liquidity allocation
        initialCollateral: Validator.parseNumericInput(
          options.initialCollateral,
          'initial collateral'
        ),
        creatorAddress: options.creatorAddress || '',
        network: options.network as Network,
      };

      // Initialize client
      const client = new SuiClientWrapper(config.network);
      if (!config.creatorAddress) {
        config.creatorAddress = client.getAddress();
      }

      Logger.info(`Connected to ${config.network}`);
      Logger.info(`Deployer address: ${client.getAddress()}`);

      // Validate configuration
      Logger.step(1, 'Validating configuration...');
      Validator.validateOrThrow(config);
      Logger.success('Configuration valid');

      // Check balance
      const requiredBalance = config.initialSuiLiquidity + config.initialCollateral + 100000000n; // +0.1 SUI for gas
      await client.checkBalance(requiredBalance);

      // Deploy token
      Logger.step(2, 'Deploying token...');
      const tokenDeployer = new TokenDeployer(client);
      const deploymentResult = await tokenDeployer.deployToken(config);

      // Initialize components
      Logger.step(3, 'Initializing components...');
      const componentInitializer = new ComponentInitializer(client);
      const finalResult = await componentInitializer.initializeComponents(
        config,
        deploymentResult
      );

      // Display summary
      Logger.deploymentSummary(finalResult);

      Logger.success('Token deployment complete!');
      Logger.info(`Deployment record: deployments/${config.network}/creator-${options.name.toLowerCase()}.json`);
    } catch (error: any) {
      Logger.error('Token deployment failed', error);
      process.exit(1);
    }
  });

/**
 * Sync Contracts Command
 */
program
  .command('sync')
  .description('Validate wizard against contract interfaces')
  .action(async () => {
    const { runContractSync } = await import('./utils/contract-sync');
    await runContractSync();
  });

/**
 * Show Status Command
 */
program
  .command('status')
  .description('Show platform and deployment status')
  .option('--network <network>', 'Network to check', 'testnet')
  .action(async (options) => {
    try {
      const client = new SuiClientWrapper(options.network as Network);

      Logger.section('Platform Status');
      Logger.info(`Network: ${options.network}`);
      Logger.info(`Deployer: ${client.getAddress()}`);

      const balance = await client.checkBalance(0n);
      Logger.info(`Balance: ${client.formatSui(balance)} SUI`);

      const vaultId = client.getPlatformVaultId();
      const insuranceId = client.getInsurancePoolId();

      if (vaultId) {
        Logger.success(`Platform Vault: ${vaultId}`);
      } else {
        Logger.warn('Platform Vault not initialized');
      }

      if (insuranceId) {
        Logger.success(`Insurance Pool: ${insuranceId}`);
      } else {
        Logger.warn('Insurance Pool not initialized');
      }

      Logger.divider();
    } catch (error: any) {
      Logger.error('Status check failed', error);
      process.exit(1);
    }
  });

// Parse arguments
program.parse();
