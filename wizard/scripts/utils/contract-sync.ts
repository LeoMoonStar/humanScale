/**
 * Contract Interface Sync Validator
 * Validates that wizard's function calls match actual contract interfaces
 */

import * as fs from 'fs';
import * as path from 'path';
import { Logger } from './logger';

interface FunctionSignature {
  module: string;
  name: string;
  params: Array<{ name: string; type: string }>;
  typeParams: string[];
  file: string;
  line: number;
}

interface WizardCall {
  target: string;
  file: string;
  line: number;
  arguments: string[];
  typeArguments: string[];
}

export class ContractSyncValidator {
  private contractsPath: string;
  private wizardPath: string;
  private contractFunctions: Map<string, FunctionSignature>;
  private wizardCalls: Map<string, WizardCall[]>;

  constructor() {
    this.contractsPath = path.resolve(__dirname, '../../../contracts/sources');
    this.wizardPath = path.resolve(__dirname, '../deployers');
    this.contractFunctions = new Map();
    this.wizardCalls = new Map();
  }

  /**
   * Main validation entry point
   */
  async validate(): Promise<boolean> {
    Logger.section('Contract-Wizard Sync Validation');

    try {
      // Step 1: Extract contract function signatures
      Logger.step(1, 'Parsing contract interfaces...');
      await this.extractContractSignatures();
      Logger.success(`Found ${this.contractFunctions.size} contract functions`);

      // Step 2: Extract wizard moveCall invocations
      Logger.step(2, 'Parsing wizard function calls...');
      await this.extractWizardCalls();
      Logger.success(`Found ${Array.from(this.wizardCalls.values()).flat().length} wizard calls`);

      // Step 3: Validate each wizard call against contract
      Logger.step(3, 'Validating wizard calls match contracts...');
      const validations: boolean[] = [];

      this.wizardCalls.forEach((calls, target) => {
        calls.forEach(call => {
          const valid = this.validateCall(call);
          validations.push(valid);
        });
      });

      const allValid = validations.every(v => v);

      // Step 4: Validate templates
      Logger.step(4, 'Validating templates...');
      const templatesValid = await this.validateTemplates();
      validations.push(templatesValid);

      Logger.divider();

      if (validations.every(v => v)) {
        Logger.success('All validations passed! Wizard is in sync with contracts.');
        return true;
      } else {
        Logger.error('Validation failed! Wizard is OUT OF SYNC with contracts.');
        Logger.warn('Please update wizard code to match contract interfaces.');
        return false;
      }
    } catch (error: any) {
      Logger.error('Contract sync validation error', error);
      return false;
    }
  }

  /**
   * Extract function signatures from Move contracts
   */
  private async extractContractSignatures(): Promise<void> {
    const files = fs.readdirSync(this.contractsPath)
      .filter(f => f.endsWith('.move'));

    for (const file of files) {
      const filePath = path.join(this.contractsPath, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');

      let inFunction = false;
      let functionStart = -1;
      let currentFunction: Partial<FunctionSignature> = {};
      let params: Array<{ name: string; type: string }> = [];
      let typeParams: string[] = [];

      lines.forEach((line, index) => {
        // Match public entry function OR public function (both can be called from TypeScript)
        const funcMatch = line.match(/public\s+(?:entry\s+)?fun\s+(\w+)(<.*?>)?/);
        if (funcMatch && !inFunction) {
          inFunction = true;
          functionStart = index;

          // Extract type parameters if present
          if (funcMatch[2]) {
            const typeParamMatch = funcMatch[2].match(/<(.+)>/);
            if (typeParamMatch) {
              typeParams = typeParamMatch[1].split(',').map(t => t.trim());
            }
          }

          const moduleName = file.replace('.move', '');
          currentFunction = {
            module: moduleName,
            name: funcMatch[1],
            file,
            line: index + 1,
            params: [],
            typeParams: typeParams || [],
          };
          params = [];
        }

        // Extract parameters
        if (inFunction && line.match(/^\s+\w+\s*:/)) {
          const paramMatch = line.match(/^\s+(\w+)\s*:\s*(.+?)(,|\))?$/);
          if (paramMatch) {
            const paramName = paramMatch[1];
            const paramType = paramMatch[2].replace(/,$/, '').trim();

            // Skip internal keywords and ctx parameter (automatically provided by Sui)
            if (paramName !== 'fn' &&
                paramName !== 'let' &&
                paramName !== 'mut' &&
                paramName !== 'ctx') {
              params.push({ name: paramName, type: paramType });
            }
          }
        }

        // End of function signature
        // Can be: ") {" or "): Type {" or ") " followed by "{" on next line
        if (inFunction) {
          if (line.includes(') {') ||
              line.match(/\):\s*\w+.*?\{/) ||
              line.match(/\):\s*\w+/) ||
              (line.trim() === ')' || line.trim().startsWith('):')) ||
              (line.trim() === '{' && params.length > 0)) {

            // Check if we've found the opening brace
            if (line.includes('{') || line.trim() === '{') {
              currentFunction.params = params;
              const key = `${currentFunction.module}::${currentFunction.name}`;
              this.contractFunctions.set(key, currentFunction as FunctionSignature);
              inFunction = false;
              typeParams = [];
            }
          }
        }
      });
    }
  }

  /**
   * Extract wizard's moveCall invocations
   */
  private async extractWizardCalls(): Promise<void> {
    const files = fs.readdirSync(this.wizardPath)
      .filter(f => f.endsWith('.ts'));

    for (const file of files) {
      const filePath = path.join(this.wizardPath, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');

      let inMoveCall = false;
      let currentCall: Partial<WizardCall> = {};
      let target = '';
      let args: string[] = [];
      let typeArgs: string[] = [];
      let braceDepth = 0;
      let inArgumentsArray = false;
      let bracketDepth = 0;

      lines.forEach((line, index) => {
        // Match txb.moveCall({
        if (line.includes('txb.moveCall({')) {
          inMoveCall = true;
          braceDepth = 1;
          currentCall = {
            file,
            line: index + 1,
            arguments: [],
            typeArguments: [],
          };
          args = [];
          typeArgs = [];
        }

        if (inMoveCall) {
          // Track braces
          braceDepth += (line.match(/{/g) || []).length;
          braceDepth -= (line.match(/}/g) || []).length;

          // Extract target
          const targetMatch = line.match(/target:\s*[`'"](.+?)[`'"]/);
          if (targetMatch) {
            target = targetMatch[1];
            currentCall.target = target;
          }

          // Extract type arguments
          const typeArgsMatch = line.match(/typeArguments:\s*\[(.+?)\]/);
          if (typeArgsMatch) {
            typeArgs = typeArgsMatch[1].split(',').map(t => t.trim().replace(/[`'"]/g, ''));
            currentCall.typeArguments = typeArgs;
          }

          // Track arguments array
          if (line.includes('arguments:') && line.includes('[')) {
            inArgumentsArray = true;
            bracketDepth = (line.match(/\[/g) || []).length - (line.match(/\]/g) || []).length;

            // Check if arguments are on the same line
            const sameLineArgs = line.match(/arguments:\s*\[(.*?)\]/);
            if (sameLineArgs && bracketDepth === 0) {
              // Single-line arguments array
              const argsContent = sameLineArgs[1];
              if (argsContent.trim()) {
                argsContent.split(',').forEach(arg => {
                  const trimmed = arg.trim();
                  if (trimmed) args.push(trimmed);
                });
              }
              inArgumentsArray = false;
            }
          } else if (inArgumentsArray) {
            // Track brackets
            bracketDepth += (line.match(/\[/g) || []).length;
            bracketDepth -= (line.match(/\]/g) || []).length;

            // Extract argument from line
            const trimmed = line.trim();
            // Skip empty lines, brackets, and closing patterns
            if (trimmed &&
                trimmed !== '[' &&
                trimmed !== ']' &&
                trimmed !== '],' &&
                trimmed !== ']),' &&
                trimmed !== 'arguments:' &&
                !trimmed.startsWith('//') &&
                !trimmed.startsWith('}')) {
              // Remove trailing comma and brackets
              const argValue = trimmed.replace(/[,\]]+$/, '').trim();
              if (argValue && argValue !== '') {
                args.push(argValue);
              }
            }

            // Check if array closed
            if (bracketDepth === 0) {
              inArgumentsArray = false;
            }
          }

          // End of moveCall
          if (braceDepth === 0 && inMoveCall) {
            currentCall.arguments = args;

            if (currentCall.target) {
              const key = currentCall.target;
              if (!this.wizardCalls.has(key)) {
                this.wizardCalls.set(key, []);
              }
              this.wizardCalls.get(key)!.push(currentCall as WizardCall);
            }

            inMoveCall = false;
          }
        }
      });
    }
  }

  /**
   * Validate a wizard call against contract signature
   */
  private validateCall(call: WizardCall): boolean {
    // Parse target: packageId::module::function or ${packageId}::module::function
    const targetParts = call.target.split('::');
    if (targetParts.length < 3) {
      Logger.warn(`Invalid target format: ${call.target} (${call.file}:${call.line})`);
      return false;
    }

    const module = targetParts[targetParts.length - 2];
    const funcName = targetParts[targetParts.length - 1];
    const key = `${module}::${funcName}`;

    const contractFunc = this.contractFunctions.get(key);

    if (!contractFunc) {
      Logger.error(`✗ Contract function not found: ${key}`);
      Logger.warn(`  Called in: ${call.file}:${call.line}`);
      return false;
    }

    // Validate parameter count
    const expectedParams = contractFunc.params.length;
    const actualParams = call.arguments.length;

    if (expectedParams !== actualParams) {
      Logger.error(`✗ Parameter count mismatch: ${key}`);
      Logger.warn(`  Expected: ${expectedParams} params`);
      Logger.warn(`  Got: ${actualParams} params`);
      Logger.warn(`  Location: ${call.file}:${call.line}`);
      Logger.info(`  Contract: ${contractFunc.file}:${contractFunc.line}`);
      return false;
    }

    // Validate type parameters
    if (contractFunc.typeParams.length > 0 && call.typeArguments.length === 0) {
      Logger.warn(`⚠️  Missing type arguments for ${key}`);
      Logger.warn(`  Expected: ${contractFunc.typeParams.join(', ')}`);
      Logger.warn(`  Location: ${call.file}:${call.line}`);
      // This is a warning, not an error
    }

    Logger.success(`✓ ${key} (${expectedParams} params) - ${call.file}`);
    return true;
  }

  /**
   * Validate templates match expected structure
   */
  private async validateTemplates(): Promise<boolean> {
    const templatesPath = path.join(__dirname, '../templates');
    let allValid = true;

    // 1. Validate Move.toml.template
    const moveTomlPath = path.join(templatesPath, 'Move.toml.template');
    if (fs.existsSync(moveTomlPath)) {
      const content = fs.readFileSync(moveTomlPath, 'utf-8');

      // Check for required dependencies
      const hasSuiDep = content.includes('[dependencies]') && content.includes('Sui =');
      const hasPeopleCoinDep = content.includes('PeopleCoin =');

      if (hasSuiDep && hasPeopleCoinDep) {
        Logger.success('✓ Move.toml.template has correct dependencies');
      } else {
        Logger.error('✗ Move.toml.template missing required dependencies');
        if (!hasSuiDep) Logger.warn('  Missing: Sui dependency');
        if (!hasPeopleCoinDep) Logger.warn('  Missing: PeopleCoin dependency');
        allValid = false;
      }

      // Check for required fields
      const hasAddresses = content.includes('[addresses]');
      const hasPackageName = content.includes('name =');

      if (hasAddresses && hasPackageName) {
        Logger.success('✓ Move.toml.template has required fields');
      } else {
        Logger.error('✗ Move.toml.template missing required fields');
        if (!hasAddresses) Logger.warn('  Missing: [addresses] section');
        if (!hasPackageName) Logger.warn('  Missing: name field');
        allValid = false;
      }
    } else {
      Logger.error('✗ Move.toml.template not found');
      allValid = false;
    }

    // 2. Validate token.move.template
    const tokenMovePath = path.join(templatesPath, 'token.move.template');
    if (fs.existsSync(tokenMovePath)) {
      const content = fs.readFileSync(tokenMovePath, 'utf-8');

      // Check for OTW pattern
      const hasWitness = content.includes('has drop');
      const hasInit = content.includes('fun init(');
      const hasTransfer = content.includes('transfer::public_transfer');

      if (hasWitness && hasInit && hasTransfer) {
        Logger.success('✓ token.move.template follows OTW pattern');
      } else {
        Logger.error('✗ token.move.template incorrect structure');
        if (!hasWitness) Logger.warn('  Missing: witness struct with "has drop"');
        if (!hasInit) Logger.warn('  Missing: init() function');
        if (!hasTransfer) Logger.warn('  Missing: witness transfer in init()');
        allValid = false;
      }

      // Check for required imports
      const hasTxContext = content.includes('use sui::tx_context');
      const hasTransferImport = content.includes('use sui::transfer');

      if (hasTxContext && hasTransferImport) {
        Logger.success('✓ token.move.template has required imports');
      } else {
        Logger.error('✗ token.move.template missing required imports');
        if (!hasTxContext) Logger.warn('  Missing: use sui::tx_context');
        if (!hasTransferImport) Logger.warn('  Missing: use sui::transfer');
        allValid = false;
      }
    } else {
      Logger.error('✗ token.move.template not found');
      allValid = false;
    }

    return allValid;
  }

  /**
   * Generate summary report
   */
  async generateReport(): Promise<string> {
    await this.extractContractSignatures();
    await this.extractWizardCalls();

    let report = '# Contract-Wizard Sync Report\n\n';
    report += `Generated: ${new Date().toISOString()}\n\n`;

    report += '## Contract Functions\n\n';
    this.contractFunctions.forEach((func, key) => {
      report += `### ${key}\n`;
      report += `- File: ${func.file}:${func.line}\n`;
      report += `- Type Params: ${func.typeParams.join(', ') || 'none'}\n`;
      report += `- Parameters:\n`;
      func.params.forEach(p => {
        report += `  - ${p.name}: ${p.type}\n`;
      });
      report += '\n';
    });

    report += '## Wizard Calls\n\n';
    this.wizardCalls.forEach((calls, target) => {
      report += `### ${target}\n`;
      calls.forEach(call => {
        report += `- ${call.file}:${call.line}\n`;
        report += `  - Arguments: ${call.arguments.length}\n`;
        report += `  - Type Arguments: ${call.typeArguments.join(', ') || 'none'}\n`;
      });
      report += '\n';
    });

    return report;
  }
}

/**
 * CLI command to run validation
 */
export async function runContractSync(): Promise<void> {
  const validator = new ContractSyncValidator();
  const valid = await validator.validate();

  if (!valid) {
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  runContractSync().catch(error => {
    Logger.error('Contract sync failed', error);
    process.exit(1);
  });
}
