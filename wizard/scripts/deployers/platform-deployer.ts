/**
 * Platform Deployer
 * Handles one-time platform initialization (Platform Vault + Insurance Pool)
 */

import { TransactionBlock } from '@mysten/sui.js/transactions';
import { SuiClientWrapper } from '../utils/sui-client';
import { Logger } from '../utils/logger';
import { PlatformConfig, PlatformDeploymentResult } from '../config.schema';
import { Validator } from '../utils/validator';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

export class PlatformDeployer {
  private client: SuiClientWrapper;

  constructor(client: SuiClientWrapper) {
    this.client = client;
  }

  /**
   * Check if platform is already initialized
   */
  async checkPlatformExists(): Promise<{ vaultExists: boolean; insuranceExists: boolean }> {
    const vaultId = this.client.getPlatformVaultId();
    const insuranceId = this.client.getInsurancePoolId();

    let vaultExists = false;
    let insuranceExists = false;

    if (vaultId) {
      try {
        await this.client.getObject(vaultId);
        vaultExists = true;
        Logger.info(`Platform Vault found: ${vaultId}`);
      } catch {
        Logger.warn('Platform Vault ID in .env but object not found');
      }
    }

    if (insuranceId) {
      try {
        await this.client.getObject(insuranceId);
        insuranceExists = true;
        Logger.info(`Insurance Pool found: ${insuranceId}`);
      } catch {
        Logger.warn('Insurance Pool ID in .env but object not found');
      }
    }

    return { vaultExists, insuranceExists };
  }

  /**
   * Deploy platform vault and insurance pool
   */
  async deployPlatform(config: PlatformConfig): Promise<PlatformDeploymentResult> {
    Logger.section('Platform Initialization');

    // Validate configuration
    Validator.validateOrThrow(config);

    // Check if already exists
    const { vaultExists, insuranceExists } = await this.checkPlatformExists();

    if (vaultExists && insuranceExists) {
      throw new Error('Platform already initialized. Use existing vault and insurance pool IDs.');
    }

    // Check wallet balance
    const requiredBalance = config.platformVaultInitialFund + config.insurancePoolInitialFund;
    await this.client.checkBalance(requiredBalance);

    let platformVaultId: string | undefined;
    let insurancePoolId: string | undefined;

    // Deploy Platform Vault
    if (!vaultExists) {
      Logger.step(1, 'Deploying Platform Vault...');
      platformVaultId = await this.deployPlatformVault(
        config.platformVaultInitialFund,
        config.platformVaultCreditLimit
      );
      Logger.success(`Platform Vault deployed: ${platformVaultId}`);
    } else {
      platformVaultId = this.client.getPlatformVaultId();
      Logger.info('Using existing Platform Vault');
    }

    // Deploy Insurance Pool
    if (!insuranceExists) {
      Logger.step(2, 'Deploying Insurance Pool...');
      insurancePoolId = await this.deployInsurancePool(
        config.insurancePoolInitialFund,
        config.insurancePoolMinReserve
      );
      Logger.success(`Insurance Pool deployed: ${insurancePoolId}`);
    } else {
      insurancePoolId = this.client.getInsurancePoolId();
      Logger.info('Using existing Insurance Pool');
    }

    // Save to .env and deployment record
    const result: PlatformDeploymentResult = {
      platformVaultId: platformVaultId!,
      insurancePoolId: insurancePoolId!,
      deployedAt: new Date().toISOString(),
      network: config.network,
    };

    await this.savePlatformAddresses(result);

    Logger.section('Platform Deployment Complete');
    Logger.objectId('Platform Vault', result.platformVaultId, config.network);
    Logger.objectId('Insurance Pool', result.insurancePoolId, config.network);

    return result;
  }

  /**
   * Deploy platform vault
   */
  private async deployPlatformVault(
    initialFund: bigint,
    creditLimit: bigint
  ): Promise<string> {
    const txb = new TransactionBlock();
    const packageId = this.client.getPeopleCoinPackageId();

    // Create SUI coin for initial fund
    const [fundCoin] = txb.splitCoins(txb.gas, [txb.pure(initialFund)]);

    // Call platform_vault::create_vault
    txb.moveCall({
      target: `${packageId}::platform_vault::create_vault`,
      arguments: [
        fundCoin,
        txb.pure(creditLimit, 'u64'),
        txb.object('0x6'), // Clock object
      ],
    });

    const result = await this.client.executeTransaction(txb);

    // Extract platform vault ID from created objects
    const vaultId = result.objectChanges?.find(
      (obj: any) => obj.type === 'created' && obj.objectType?.includes('PlatformVault')
    )?.objectId;

    if (!vaultId) {
      throw new Error('Platform Vault ID not found in transaction result');
    }

    return vaultId;
  }

  /**
   * Deploy insurance pool
   */
  private async deployInsurancePool(
    initialFund: bigint,
    approvalThreshold: bigint
  ): Promise<string> {
    const txb = new TransactionBlock();
    const packageId = this.client.getPeopleCoinPackageId();

    // Create SUI coin for initial fund
    const [fundCoin] = txb.splitCoins(txb.gas, [txb.pure(initialFund)]);

    // Call insurance::create_insurance_pool
    txb.moveCall({
      target: `${packageId}::insurance::create_insurance_pool`,
      arguments: [
        fundCoin,
        txb.pure(approvalThreshold, 'u64'),
      ],
    });

    const result = await this.client.executeTransaction(txb);

    // Extract insurance pool ID from created objects
    const poolId = result.objectChanges?.find(
      (obj: any) => obj.type === 'created' && obj.objectType?.includes('InsurancePool')
    )?.objectId;

    if (!poolId) {
      throw new Error('Insurance Pool ID not found in transaction result');
    }

    return poolId;
  }

  /**
   * Save platform addresses to .env and deployment record
   */
  private async savePlatformAddresses(result: PlatformDeploymentResult): Promise<void> {
    const envPath = path.join(__dirname, '../../.env');
    const envExamplePath = path.join(__dirname, '../../.env.example');

    // Read current .env or create from example
    let envContent = '';
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf-8');
    } else if (fs.existsSync(envExamplePath)) {
      envContent = fs.readFileSync(envExamplePath, 'utf-8');
    }

    // Update platform IDs
    const lines = envContent.split('\n');
    const updatedLines = lines.map(line => {
      if (line.startsWith('PLATFORM_VAULT_ID=')) {
        return `PLATFORM_VAULT_ID=${result.platformVaultId}`;
      }
      if (line.startsWith('INSURANCE_POOL_ID=')) {
        return `INSURANCE_POOL_ID=${result.insurancePoolId}`;
      }
      return line;
    });

    // Add if not exists
    if (!updatedLines.some(l => l.startsWith('PLATFORM_VAULT_ID='))) {
      updatedLines.push(`PLATFORM_VAULT_ID=${result.platformVaultId}`);
    }
    if (!updatedLines.some(l => l.startsWith('INSURANCE_POOL_ID='))) {
      updatedLines.push(`INSURANCE_POOL_ID=${result.insurancePoolId}`);
    }

    // Write back to .env
    fs.writeFileSync(envPath, updatedLines.join('\n'));
    Logger.success('Updated .env with platform addresses');

    // Save deployment record
    const deploymentPath = path.join(
      __dirname,
      '../../deployments',
      result.network,
      'platform.json'
    );

    fs.mkdirSync(path.dirname(deploymentPath), { recursive: true });
    fs.writeFileSync(deploymentPath, JSON.stringify(result, null, 2));
    Logger.success(`Deployment record saved: ${deploymentPath}`);

    // Reload environment variables
    dotenv.config({ path: envPath });
  }
}
