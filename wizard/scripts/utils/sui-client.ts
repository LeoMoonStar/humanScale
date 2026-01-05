/**
 * Sui Client wrapper for blockchain interactions
 */

import { SuiClient, getFullnodeUrl } from '@mysten/sui.js/client';
import { Ed25519Keypair } from '@mysten/sui.js/keypairs/ed25519';
import { TransactionBlock } from '@mysten/sui.js/transactions';
import { fromB64 } from '@mysten/sui.js/utils';
import { Network, EnvironmentConfig, TransactionResult } from '../config.schema';
import { Logger } from './logger';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

export class SuiClientWrapper {
  private client: SuiClient;
  private keypair: Ed25519Keypair;
  private network: Network;
  private config: EnvironmentConfig;

  constructor(network: Network) {
    this.network = network;
    this.config = this.loadConfig(network);
    this.client = new SuiClient({ url: this.config.rpcUrl });
    this.keypair = this.loadKeypair();
  }

  /**
   * Load configuration from environment
   */
  private loadConfig(network: Network): EnvironmentConfig {
    const rpcUrl = network === 'testnet'
      ? process.env.SUI_TESTNET_RPC || getFullnodeUrl('testnet')
      : network === 'mainnet'
      ? process.env.SUI_MAINNET_RPC || getFullnodeUrl('mainnet')
      : process.env.SUI_LOCAL_RPC || 'http://127.0.0.1:9000';

    const peoplecoinPackageId = network === 'testnet'
      ? process.env.PEOPLECOIN_PACKAGE_ID_TESTNET
      : network === 'mainnet'
      ? process.env.PEOPLECOIN_PACKAGE_ID_MAINNET
      : process.env.PEOPLECOIN_PACKAGE_ID_LOCAL;

    if (!peoplecoinPackageId) {
      throw new Error(
        `PeopleCoin package ID not found for ${network}. Please set PEOPLECOIN_PACKAGE_ID_${network.toUpperCase()} in .env`
      );
    }

    return {
      deployerPrivateKey: process.env.DEPLOYER_PRIVATE_KEY || '',
      rpcUrl,
      network,
      peoplecoinPackageId,
      platformVaultId: process.env.PLATFORM_VAULT_ID,
      insurancePoolId: process.env.INSURANCE_POOL_ID,
      gasBudgetPublish: parseInt(process.env.GAS_BUDGET_PUBLISH || '100000000'),
      gasBudgetTransaction: parseInt(process.env.GAS_BUDGET_TRANSACTION || '10000000'),
    };
  }

  /**
   * Load keypair from environment
   */
  private loadKeypair(): Ed25519Keypair {
    const privateKey = this.config.deployerPrivateKey;
    if (!privateKey) {
      throw new Error('DEPLOYER_PRIVATE_KEY not found in .env file');
    }

    try {
      // Try loading as base64
      const decoded = fromB64(privateKey);
      return Ed25519Keypair.fromSecretKey(decoded);
    } catch (error) {
      throw new Error('Invalid private key format. Expected base64 encoded key.');
    }
  }

  /**
   * Get client instance
   */
  getClient(): SuiClient {
    return this.client;
  }

  /**
   * Get signer address
   */
  getAddress(): string {
    return this.keypair.getPublicKey().toSuiAddress();
  }

  /**
   * Get network
   */
  getNetwork(): Network {
    return this.network;
  }

  /**
   * Get PeopleCoin package ID
   */
  getPeopleCoinPackageId(): string {
    return this.config.peoplecoinPackageId;
  }

  /**
   * Get platform vault ID
   */
  getPlatformVaultId(): string | undefined {
    return this.config.platformVaultId;
  }

  /**
   * Get insurance pool ID
   */
  getInsurancePoolId(): string | undefined {
    return this.config.insurancePoolId;
  }

  /**
   * Check wallet balance
   */
  async checkBalance(minRequired: bigint = 0n): Promise<bigint> {
    const address = this.getAddress();
    const balance = await this.client.getBalance({ owner: address });
    const totalBalance = BigInt(balance.totalBalance);

    Logger.info(`Wallet balance: ${this.formatSui(totalBalance)} SUI`);

    if (minRequired > 0n && totalBalance < minRequired) {
      throw new Error(
        `Insufficient balance. Required: ${this.formatSui(minRequired)} SUI, Available: ${this.formatSui(totalBalance)} SUI`
      );
    }

    return totalBalance;
  }

  /**
   * Execute transaction block
   */
  async executeTransaction(
    txb: TransactionBlock,
    gasBudget?: number
  ): Promise<TransactionResult> {
    try {
      // Set gas budget if provided
      if (gasBudget) {
        txb.setGasBudget(gasBudget);
      }

      // Sign and execute
      const result = await this.client.signAndExecuteTransactionBlock({
        transactionBlock: txb,
        signer: this.keypair,
        options: {
          showEffects: true,
          showObjectChanges: true,
          showBalanceChanges: true,
        },
      });

      // Check for errors
      if (result.effects?.status?.status !== 'success') {
        throw new Error(`Transaction failed: ${result.effects?.status?.error || 'Unknown error'}`);
      }

      Logger.success('Transaction executed successfully');
      Logger.txHash(result.digest, this.network);

      return {
        digest: result.digest,
        effects: result.effects,
        objectChanges: result.objectChanges,
        balanceChanges: result.balanceChanges,
      };
    } catch (error: any) {
      Logger.error('Transaction execution failed', error);
      throw error;
    }
  }

  /**
   * Publish Move package
   */
  async publishPackage(compiledModules: string[], dependencies: string[]): Promise<TransactionResult> {
    const txb = new TransactionBlock();
    const [upgradeCap] = txb.publish({
      modules: compiledModules,
      dependencies,
    });

    // Transfer upgrade cap to sender
    txb.transferObjects([upgradeCap], txb.pure(this.getAddress()));

    return await this.executeTransaction(txb, this.config.gasBudgetPublish);
  }

  /**
   * Format SUI amount (MIST to SUI)
   */
  formatSui(mist: bigint): string {
    const sui = Number(mist) / 1_000_000_000;
    return sui.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 9 });
  }

  /**
   * Parse SUI amount (SUI to MIST)
   */
  parseSui(sui: string): bigint {
    const value = parseFloat(sui);
    return BigInt(Math.floor(value * 1_000_000_000));
  }

  /**
   * Get object by ID
   */
  async getObject(objectId: string): Promise<any> {
    return await this.client.getObject({
      id: objectId,
      options: { showContent: true, showType: true, showOwner: true },
    });
  }

  /**
   * Wait for transaction confirmation
   */
  async waitForTransaction(digest: string, timeoutMs: number = 30000): Promise<void> {
    const startTime = Date.now();
    while (Date.now() - startTime < timeoutMs) {
      try {
        const result = await this.client.getTransactionBlock({
          digest,
          options: { showEffects: true },
        });
        if (result.effects?.status?.status === 'success') {
          return;
        }
      } catch (error) {
        // Transaction not found yet, continue waiting
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    throw new Error(`Transaction ${digest} not confirmed within ${timeoutMs}ms`);
  }
}
