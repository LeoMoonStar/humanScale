/**
 * Logger utility for formatted console output
 */

import chalk from 'chalk';

export class Logger {
  /**
   * Log success message
   */
  static success(message: string): void {
    console.log(chalk.green('✅'), message);
  }

  /**
   * Log error message
   */
  static error(message: string, error?: any): void {
    console.log(chalk.red('❌'), message);
    if (error) {
      console.log(chalk.red(error.message || error));
      if (error.stack) {
        console.log(chalk.gray(error.stack));
      }
    }
  }

  /**
   * Log warning message
   */
  static warn(message: string): void {
    console.log(chalk.yellow('⚠️ '), message);
  }

  /**
   * Log info message
   */
  static info(message: string): void {
    console.log(chalk.blue('ℹ️ '), message);
  }

  /**
   * Log step message (numbered step)
   */
  static step(stepNumber: number, message: string): void {
    console.log(chalk.cyan(`[${stepNumber}]`), message);
  }

  /**
   * Log section header
   */
  static section(title: string): void {
    console.log();
    console.log(chalk.bold.cyan(`━━━ ${title} ━━━`));
    console.log();
  }

  /**
   * Log divider
   */
  static divider(): void {
    console.log(chalk.gray('─'.repeat(60)));
  }

  /**
   * Log key-value pair
   */
  static keyValue(key: string, value: string): void {
    console.log(chalk.gray(`  ${key}:`), chalk.white(value));
  }

  /**
   * Log transaction hash/digest
   */
  static txHash(hash: string, network: string): void {
    const explorerUrl = getExplorerUrl(network, hash);
    console.log(chalk.gray('  Transaction:'), chalk.blue(hash));
    console.log(chalk.gray('  Explorer:'), chalk.underline(explorerUrl));
  }

  /**
   * Log object ID
   */
  static objectId(label: string, id: string, network: string): void {
    const explorerUrl = getExplorerUrl(network, id, 'object');
    console.log(chalk.gray(`  ${label}:`), chalk.blue(id));
    console.log(chalk.gray(`  View:`), chalk.underline(explorerUrl));
  }

  /**
   * Log progress message (for longer operations)
   */
  static progress(message: string): void {
    process.stdout.write(chalk.yellow('⏳ ') + message + '...');
  }

  /**
   * Clear progress line and show completion
   */
  static progressDone(): void {
    process.stdout.clearLine(0);
    process.stdout.cursorTo(0);
    console.log(chalk.green('✅ Done'));
  }

  /**
   * Log deployment summary
   */
  static deploymentSummary(result: any): void {
    this.section('Deployment Summary');
    this.keyValue('Creator', result.creatorName);
    this.keyValue('Network', result.network);
    this.keyValue('Package ID', result.packageId);
    this.keyValue('Token Type', result.tokenType);
    if (result.tokenRegistryId) {
      this.objectId('Token Registry', result.tokenRegistryId, result.network);
    }
    if (result.treasuryId) {
      this.objectId('Creator Treasury', result.treasuryId, result.network);
    }
    if (result.buybackVaultId) {
      this.objectId('Buyback Vault', result.buybackVaultId, result.network);
    }
    if (result.ammPoolId) {
      this.objectId('AMM Pool', result.ammPoolId, result.network);
    }
    this.divider();
  }
}

/**
 * Get explorer URL for transaction or object
 */
function getExplorerUrl(network: string, id: string, type: 'txn' | 'object' = 'txn'): string {
  const baseUrl = network === 'mainnet'
    ? 'https://suiscan.xyz/mainnet'
    : network === 'testnet'
    ? 'https://suiscan.xyz/testnet'
    : 'http://localhost:3000'; // Local explorer if available

  return `${baseUrl}/${type}/${id}`;
}
