/**
 * Token module generator
 * Generates unique Move modules for creator tokens
 */

import * as fs from 'fs';
import * as path from 'path';
import Handlebars from 'handlebars';
import { Logger } from '../utils/logger';

export interface TokenModuleConfig {
  tokenName: string;
  symbol: string;
  packageName: string;
  moduleName: string;
  witnessName: string;
  peoplecoinPath: string;
  suiRevision: string;
  network: string;
}

export class TokenGenerator {
  private templatesDir: string;
  private tempDir: string;

  constructor() {
    this.templatesDir = path.join(__dirname, '../templates');
    this.tempDir = path.join(__dirname, '../../temp');
  }

  /**
   * Generate unique module name from token symbol and timestamp
   */
  static generateModuleName(symbol: string): string {
    const timestamp = Date.now();
    const clean = symbol.toLowerCase().replace(/[^a-z0-9]/g, '');
    return `${clean}_${timestamp}`;
  }

  /**
   * Generate witness name (uppercase with underscores)
   */
  static generateWitnessName(symbol: string): string {
    return symbol.toUpperCase().replace(/[^A-Z0-9]/g, '_');
  }

  /**
   * Generate package name
   */
  static generatePackageName(symbol: string): string {
    return symbol.toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  /**
   * Generate complete token module
   */
  async generateTokenModule(config: TokenModuleConfig): Promise<string> {
    Logger.step(1, 'Generating token module...');

    // Create temp directory
    const packageDir = path.join(this.tempDir, config.packageName);
    const sourcesDir = path.join(packageDir, 'sources');

    // Clean up if exists
    if (fs.existsSync(packageDir)) {
      fs.rmSync(packageDir, { recursive: true, force: true });
    }

    // Create directories
    fs.mkdirSync(sourcesDir, { recursive: true });

    // Generate Move.toml
    await this.generateMoveToml(packageDir, config);

    // Generate token.move
    await this.generateTokenMove(sourcesDir, config);

    Logger.success(`Token module generated: ${packageDir}`);
    return packageDir;
  }

  /**
   * Generate Move.toml file
   */
  private async generateMoveToml(packageDir: string, config: TokenModuleConfig): Promise<void> {
    const templatePath = path.join(this.templatesDir, 'Move.toml.template');
    const template = fs.readFileSync(templatePath, 'utf-8');
    const compiled = Handlebars.compile(template);

    const content = compiled({
      packageName: config.packageName,
      peoplecoinPath: path.resolve(__dirname, '../../../contracts'),
      suiRevision: this.getSuiRevision(config.network),
    });

    const outputPath = path.join(packageDir, 'Move.toml');
    fs.writeFileSync(outputPath, content);
    Logger.info(`Generated Move.toml`);
  }

  /**
   * Generate token.move file
   */
  private async generateTokenMove(sourcesDir: string, config: TokenModuleConfig): Promise<void> {
    const templatePath = path.join(this.templatesDir, 'token.move.template');
    const template = fs.readFileSync(templatePath, 'utf-8');
    const compiled = Handlebars.compile(template);

    const content = compiled({
      tokenName: config.tokenName,
      packageAddress: config.packageName,
      moduleName: config.moduleName,
      witnessName: config.witnessName,
      timestamp: new Date().toISOString(),
    });

    const outputPath = path.join(sourcesDir, `${config.moduleName}.move`);
    fs.writeFileSync(outputPath, content);
    Logger.info(`Generated ${config.moduleName}.move`);
  }

  /**
   * Get appropriate Sui framework revision for network
   */
  private getSuiRevision(network: string): string {
    switch (network) {
      case 'mainnet':
        return 'framework/mainnet';
      case 'testnet':
        return 'framework/testnet';
      case 'localnet':
      default:
        return 'framework/devnet';
    }
  }

  /**
   * Cleanup temp directory
   */
  cleanup(packageName: string): void {
    const packageDir = path.join(this.tempDir, packageName);
    if (fs.existsSync(packageDir)) {
      fs.rmSync(packageDir, { recursive: true, force: true });
      Logger.info(`Cleaned up temp directory: ${packageName}`);
    }
  }

  /**
   * Cleanup all temp files
   */
  cleanupAll(): void {
    if (fs.existsSync(this.tempDir)) {
      fs.rmSync(this.tempDir, { recursive: true, force: true });
      Logger.info('Cleaned up all temp directories');
    }
  }
}
