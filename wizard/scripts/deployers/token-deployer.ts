/**
 * Token Deployer
 * Handles building, publishing, and initializing creator tokens
 */

import { TransactionBlock } from '@mysten/sui.js/transactions';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { SuiClientWrapper } from '../utils/sui-client';
import { Logger } from '../utils/logger';
import { TokenConfig, DeploymentResult } from '../config.schema';
import { Validator } from '../utils/validator';
import { TokenGenerator } from '../generators/token-generator';

export class TokenDeployer {
  private client: SuiClientWrapper;
  private generator: TokenGenerator;

  constructor(client: SuiClientWrapper) {
    this.client = client;
    this.generator = new TokenGenerator();
  }

  /**
   * Deploy complete token system
   */
  async deployToken(config: TokenConfig): Promise<DeploymentResult> {
    Logger.section(`Deploying ${config.name} (${config.symbol})`);

    // Validate configuration
    Validator.validateOrThrow(config);

    // Generate unique module name
    const moduleName = TokenGenerator.generateModuleName(config.symbol);
    const witnessName = TokenGenerator.generateWitnessName(config.symbol);
    const packageName = TokenGenerator.generatePackageName(config.symbol);

    Logger.info(`Module: ${moduleName}`);
    Logger.info(`Witness: ${witnessName}`);

    try {
      // Step 1: Generate token module
      const packageDir = await this.generator.generateTokenModule({
        tokenName: config.name,
        symbol: config.symbol,
        packageName,
        moduleName,
        witnessName,
        peoplecoinPath: path.resolve(__dirname, '../../../contracts'),
        suiRevision: this.getSuiRevision(config.network),
        network: config.network,
      });

      // Step 2: Build Move package
      Logger.step(2, 'Building Move package...');
      const { modules, dependencies } = await this.buildPackage(packageDir);
      Logger.success('Package built successfully');

      // Step 3: Publish package
      Logger.step(3, 'Publishing package to network...');
      const { packageId, witnessObjectId } = await this.publishPackage(modules, dependencies);
      Logger.success(`Package published: ${packageId}`);
      Logger.objectId('Package', packageId, config.network);

      // Step 4: Create token using witness
      Logger.step(4, 'Creating token...');
      const tokenCreationResult = await this.createToken(config, packageId, witnessObjectId, witnessName);
      Logger.success(`Token created: ${config.symbol}`);
      Logger.objectId('Token Registry', tokenCreationResult.tokenRegistryId, config.network);

      // Build result
      const result: DeploymentResult = {
        creatorName: config.name,
        packageId,
        tokenType: `${packageId}::${moduleName}::${witnessName}`,
        tokenRegistryId: tokenCreationResult.tokenRegistryId,
        creatorCoinsId: tokenCreationResult.creatorCoinsId,
        platformReserveCoinsId: tokenCreationResult.platformReserveCoinsId,
        liquidityCoinsId: tokenCreationResult.liquidityCoinsId,
        deployedAt: new Date().toISOString(),
        network: config.network,
        config,
      };

      // Save deployment record
      await this.saveDeploymentRecord(result);

      // Cleanup temp files
      this.generator.cleanup(packageName);

      return result;
    } catch (error: any) {
      Logger.error('Token deployment failed', error);
      throw error;
    }
  }

  /**
   * Build Move package
   */
  private async buildPackage(packageDir: string): Promise<{ modules: string[]; dependencies: string[] }> {
    try {
      // Run sui move build
      const buildOutput = execSync('sui move build --dump-bytecode-as-base64', {
        cwd: packageDir,
        encoding: 'utf-8',
      });

      // Read compiled bytecode
      const buildDir = path.join(packageDir, 'build');
      const packageName = path.basename(packageDir);
      const modulesPath = path.join(buildDir, packageName, 'bytecode_modules');

      if (!fs.existsSync(modulesPath)) {
        throw new Error('Compiled modules not found. Build may have failed.');
      }

      // Read all .mv files as base64
      const moduleFiles = fs.readdirSync(modulesPath).filter(f => f.endsWith('.mv'));
      const modules = moduleFiles.map(file => {
        const filePath = path.join(modulesPath, file);
        return fs.readFileSync(filePath, 'base64');
      });

      // Dependencies (Sui framework + PeopleCoin)
      const dependencies = [
        '0x1', // Sui framework
        '0x2', // Sui framework
        this.client.getPeopleCoinPackageId(), // PeopleCoin package
      ];

      return { modules, dependencies };
    } catch (error: any) {
      throw new Error(`Failed to build package: ${error.message}`);
    }
  }

  /**
   * Publish Move package to network
   */
  private async publishPackage(
    modules: string[],
    dependencies: string[]
  ): Promise<{ packageId: string; witnessObjectId: string }> {
    const result = await this.client.publishPackage(modules, dependencies);

    // Extract package ID from published objects
    const packageObj = result.objectChanges?.find(
      (obj: any) => obj.type === 'published'
    );

    if (!packageObj || !packageObj.packageId) {
      throw new Error('Package ID not found in transaction result');
    }

    // Extract witness object (transferred to sender in init())
    const witnessObj = result.objectChanges?.find(
      (obj: any) => obj.type === 'created' && obj.owner?.AddressOwner === this.client.getAddress()
    );

    if (!witnessObj || !witnessObj.objectId) {
      throw new Error('Witness object not found in transaction result');
    }

    return {
      packageId: packageObj.packageId,
      witnessObjectId: witnessObj.objectId,
    };
  }

  /**
   * Create token using witness
   */
  private async createToken(
    config: TokenConfig,
    packageId: string,
    witnessObjectId: string,
    witnessName: string
  ): Promise<string> {
    const txb = new TransactionBlock();
    const peoplecoinPackageId = this.client.getPeopleCoinPackageId();

    // Get module name from package
    const moduleName = witnessName.toLowerCase();

    // Call creator_token::create_token with witness
    txb.moveCall({
      target: `${peoplecoinPackageId}::creator_token::create_token`,
      typeArguments: [`${packageId}::${moduleName}::${witnessName}`],
      arguments: [
        txb.object(witnessObjectId), // witness
        txb.pure(config.decimals, 'u8'),
        txb.pure(Array.from(Buffer.from(config.symbol))),
        txb.pure(Array.from(Buffer.from(config.name))),
        txb.pure(Array.from(Buffer.from(config.description || ''))),
        txb.pure(Array.from(Buffer.from(config.iconUrl || ''))),
        txb.pure(config.totalSupply, 'u64'),
        txb.pure(config.creatorAllocation, 'u64'),
        txb.pure(config.platformReserve, 'u64'),
        txb.pure(config.liquidityPoolAllocation, 'u64'),
        txb.pure(config.buybackDurationYears, 'u8'),
        txb.pure(config.buybackStartDate || Date.now() + 86400000, 'u64'), // Default: tomorrow
        txb.pure(config.buybackIntervalMonths, 'u8'),
        txb.pure(config.buybackAmountPerInterval, 'u64'),
        txb.pure(0, 'u8'), // trading_block_duration_days (0 = no block)
        txb.pure(config.vestingEnabled),
        txb.pure(config.vestingMonthlyReleaseBps, 'u16'),
        txb.pure(config.vestingTotalReleaseBps, 'u16'),
        txb.pure(100, 'u64'), // initial_price_usd (default $1.00)
      ],
    });

    const result = await this.client.executeTransaction(txb);

    // Extract TokenRegistry ID from created shared objects
    const registryObj = result.objectChanges?.find(
      (obj: any) => obj.type === 'created' && obj.objectType?.includes('TokenRegistry')
    );

    if (!registryObj || !registryObj.objectId) {
      throw new Error('TokenRegistry not found in transaction result');
    }

    // Extract coin object IDs that were created and transferred to sender
    // create_token transfers three coins: creator, platform, liquidity
    const createdCoins = result.objectChanges?.filter(
      (obj: any) => obj.type === 'created' &&
                    obj.objectType?.includes('::coin::Coin') &&
                    obj.owner?.AddressOwner === this.client.getAddress()
    );

    if (!createdCoins || createdCoins.length < 3) {
      throw new Error('Expected 3 coin objects from create_token (creator, platform, liquidity)');
    }

    // Store coin IDs for component initialization
    // Note: The order matches the creation order in create_token:
    // 1. creator_coins, 2. reserve_coins, 3. liquidity_coins
    const coinIds = createdCoins.map((obj: any) => obj.objectId);

    return {
      tokenRegistryId: registryObj.objectId,
      creatorCoinsId: coinIds[0],
      platformReserveCoinsId: coinIds[1],
      liquidityCoinsId: coinIds[2],
    };
  }

  /**
   * Save deployment record
   */
  private async saveDeploymentRecord(result: DeploymentResult): Promise<void> {
    const fileName = result.creatorName.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const deploymentPath = path.join(
      __dirname,
      '../../deployments',
      result.network,
      `creator-${fileName}.json`
    );

    fs.mkdirSync(path.dirname(deploymentPath), { recursive: true });
    fs.writeFileSync(deploymentPath, JSON.stringify(result, null, 2));
    Logger.success(`Deployment record saved: ${deploymentPath}`);
  }

  /**
   * Get Sui framework revision for network
   */
  private getSuiRevision(network: string): string {
    switch (network) {
      case 'mainnet':
        return 'framework/mainnet';
      case 'testnet':
        return 'framework/testnet';
      default:
        return 'framework/devnet';
    }
  }
}
