/**
 * Configuration validation utilities
 */

import { TokenConfig, PlatformConfig, ValidationResult } from '../config.schema';
import { Logger } from './logger';

export class Validator {
  /**
   * Validate token configuration
   */
  static validateTokenConfig(config: TokenConfig): ValidationResult {
    const errors: string[] = [];

    // Basic validation
    if (!config.name || config.name.length === 0) {
      errors.push('Token name is required');
    }
    if (!config.symbol || config.symbol.length === 0) {
      errors.push('Token symbol is required');
    }
    if (config.symbol && config.symbol.length > 10) {
      errors.push('Token symbol must be 10 characters or less');
    }
    if (config.decimals < 0 || config.decimals > 18) {
      errors.push('Decimals must be between 0 and 18');
    }
    if (config.totalSupply <= 0n) {
      errors.push('Total supply must be greater than 0');
    }

    // Allocation validation
    const totalAllocation =
      config.creatorAllocation +
      config.platformReserve +
      config.liquidityPoolAllocation +
      (config.teamAllocation || 0n);

    if (totalAllocation !== config.totalSupply) {
      errors.push(
        `Allocations must sum to total supply. ` +
        `Expected: ${config.totalSupply}, Got: ${totalAllocation}`
      );
    }

    if (config.creatorAllocation <= 0n) {
      errors.push('Creator allocation must be greater than 0');
    }
    if (config.platformReserve < 0n) {
      errors.push('Platform reserve cannot be negative');
    }
    if (config.liquidityPoolAllocation <= 0n) {
      errors.push('Liquidity pool allocation must be greater than 0');
    }

    // Vesting validation
    if (config.vestingEnabled) {
      if (config.vestingMonthlyReleaseBps <= 0 || config.vestingMonthlyReleaseBps > 10000) {
        errors.push('Vesting monthly release must be between 1 and 10000 bps');
      }
      if (config.vestingTotalReleaseBps <= 0 || config.vestingTotalReleaseBps > 10000) {
        errors.push('Vesting total release must be between 1 and 10000 bps');
      }
    }

    // Buyback validation
    if (config.buybackDurationYears <= 0 || config.buybackDurationYears > 20) {
      errors.push('Buyback duration must be between 1 and 20 years');
    }
    if (config.buybackIntervalMonths <= 0 || config.buybackIntervalMonths > 120) {
      errors.push('Buyback interval must be between 1 and 120 months');
    }
    if (config.buybackAmountPerInterval <= 0n) {
      errors.push('Buyback amount per interval must be greater than 0');
    }
    if (config.buybackStartDate && config.buybackStartDate < Date.now()) {
      errors.push('Buyback start date must be in the future');
    }

    // AMM validation
    if (config.initialSuiLiquidity <= 0n) {
      errors.push('Initial SUI liquidity must be greater than 0');
    }
    if (config.initialTokenLiquidity <= 0n) {
      errors.push('Initial token liquidity must be greater than 0');
    }
    if (config.initialTokenLiquidity > config.liquidityPoolAllocation) {
      errors.push('Initial token liquidity cannot exceed liquidity pool allocation');
    }

    // Collateral validation
    if (config.initialCollateral <= 0n) {
      errors.push('Initial collateral must be greater than 0');
    }

    // Creator address validation (basic check)
    if (config.creatorAddress && !config.creatorAddress.startsWith('0x')) {
      errors.push('Creator address must start with 0x');
    }

    // Network validation
    if (!['testnet', 'mainnet', 'localnet'].includes(config.network)) {
      errors.push('Network must be testnet, mainnet, or localnet');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate platform configuration
   */
  static validatePlatformConfig(config: PlatformConfig): ValidationResult {
    const errors: string[] = [];

    if (config.platformVaultInitialFund <= 0n) {
      errors.push('Platform vault initial fund must be greater than 0');
    }
    if (config.platformVaultCreditLimit <= 0n) {
      errors.push('Platform vault credit limit must be greater than 0');
    }
    if (config.insurancePoolInitialFund <= 0n) {
      errors.push('Insurance pool initial fund must be greater than 0');
    }
    if (config.insurancePoolMinReserve <= 0n) {
      errors.push('Insurance pool minimum reserve must be greater than 0');
    }
    if (config.insurancePoolMinReserve > config.insurancePoolInitialFund) {
      errors.push('Insurance pool minimum reserve cannot exceed initial fund');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Log validation errors
   */
  static logValidationErrors(result: ValidationResult): void {
    if (!result.valid) {
      Logger.error('Validation failed:');
      result.errors.forEach(error => Logger.warn(`  - ${error}`));
    }
  }

  /**
   * Validate and throw if invalid
   */
  static validateOrThrow(config: TokenConfig | PlatformConfig): void {
    const result = 'network' in config && 'name' in config
      ? this.validateTokenConfig(config as TokenConfig)
      : this.validatePlatformConfig(config as PlatformConfig);

    if (!result.valid) {
      this.logValidationErrors(result);
      throw new Error('Configuration validation failed');
    }
  }

  /**
   * Validate file path
   */
  static validatePath(path: string, shouldExist: boolean = true): boolean {
    const fs = require('fs');
    const exists = fs.existsSync(path);

    if (shouldExist && !exists) {
      Logger.error(`Path does not exist: ${path}`);
      return false;
    }
    if (!shouldExist && exists) {
      Logger.error(`Path already exists: ${path}`);
      return false;
    }

    return true;
  }

  /**
   * Validate numeric string input
   */
  static parseNumericInput(value: string, name: string): bigint {
    try {
      const parsed = BigInt(value);
      if (parsed < 0) {
        throw new Error(`${name} cannot be negative`);
      }
      return parsed;
    } catch (error) {
      throw new Error(`Invalid numeric value for ${name}: ${value}`);
    }
  }

  /**
   * Validate percentage (basis points)
   */
  static validateBasisPoints(value: number, name: string): boolean {
    if (value < 0 || value > 10000) {
      Logger.error(`${name} must be between 0 and 10000 basis points`);
      return false;
    }
    return true;
  }
}
