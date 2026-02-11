/**
 * Build Validation System
 *
 * Ensures every component passes TypeScript, ESLint, and build checks.
 * Follows "LLM as Compiler" philosophy - validates the "compiled output".
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import chalk from 'chalk';
import * as fs from 'fs-extra';
import path from 'path';

const execAsync = promisify(exec);

export interface ValidationResult {
  passed: boolean;
  errors: string[];
  warnings: string[];
  output?: string;
}

export interface BuildValidationResults {
  typescript: ValidationResult;
  eslint: ValidationResult;
  build: ValidationResult;
  tests?: ValidationResult;
}

export class BuildValidator {
  private projectPath: string;
  private verbose: boolean;

  constructor(projectPath: string, verbose = false) {
    this.projectPath = projectPath;
    this.verbose = verbose;
  }

  /**
   * Run TypeScript type checking
   */
  async validateTypeScript(filePath?: string): Promise<ValidationResult> {
    console.log(chalk.blue('🔷 Running TypeScript check...'));

    try {
      const command = filePath
        ? `npx tsc --noEmit ${filePath}`
        : `npx tsc --noEmit`;

      const { stdout, stderr } = await execAsync(command, {
        cwd: this.projectPath,
        timeout: 30000, // 30 second timeout
      });

      if (this.verbose) {
        console.log(chalk.gray(stdout));
      }

      console.log(chalk.green('✅ TypeScript check passed'));
      return { passed: true, errors: [], warnings: [] };
    } catch (error: any) {
      const errors = this.parseTypeScriptErrors(error.stdout || error.stderr);

      console.log(chalk.red(`❌ TypeScript check failed (${errors.length} errors)`));
      if (this.verbose) {
        errors.forEach(err => console.log(chalk.red(`   ${err}`)));
      }

      return {
        passed: false,
        errors,
        warnings: [],
        output: error.stdout || error.stderr,
      };
    }
  }

  /**
   * Run ESLint
   */
  async validateESLint(filePath?: string): Promise<ValidationResult> {
    console.log(chalk.blue('📋 Running ESLint check...'));

    try {
      const command = filePath
        ? `npx eslint ${filePath}`
        : `npx eslint . --ext .ts,.tsx`;

      const { stdout, stderr } = await execAsync(command, {
        cwd: this.projectPath,
        timeout: 30000,
      });

      if (this.verbose) {
        console.log(chalk.gray(stdout));
      }

      console.log(chalk.green('✅ ESLint check passed'));
      return { passed: true, errors: [], warnings: [] };
    } catch (error: any) {
      const { errors, warnings } = this.parseESLintErrors(error.stdout || error.stderr);

      if (errors.length > 0) {
        console.log(chalk.red(`❌ ESLint check failed (${errors.length} errors, ${warnings.length} warnings)`));
      } else if (warnings.length > 0) {
        console.log(chalk.yellow(`⚠️  ESLint check passed with warnings (${warnings.length})`));
      }

      if (this.verbose) {
        errors.forEach(err => console.log(chalk.red(`   ${err}`)));
        warnings.forEach(warn => console.log(chalk.yellow(`   ${warn}`)));
      }

      return {
        passed: errors.length === 0,
        errors,
        warnings,
        output: error.stdout || error.stderr,
      };
    }
  }

  /**
   * Run full build
   */
  async validateBuild(): Promise<ValidationResult> {
    console.log(chalk.blue('🔨 Running build check...'));

    try {
      const { stdout, stderr } = await execAsync('npm run build', {
        cwd: this.projectPath,
        timeout: 120000, // 2 minute timeout for build
      });

      if (this.verbose) {
        console.log(chalk.gray(stdout));
      }

      console.log(chalk.green('✅ Build check passed'));
      return { passed: true, errors: [], warnings: [] };
    } catch (error: any) {
      const errors = this.parseBuildErrors(error.stdout || error.stderr);

      console.log(chalk.red(`❌ Build check failed (${errors.length} errors)`));
      if (this.verbose) {
        errors.forEach(err => console.log(chalk.red(`   ${err}`)));
      }

      return {
        passed: false,
        errors,
        warnings: [],
        output: error.stdout || error.stderr,
      };
    }
  }

  /**
   * Run tests for a component
   */
  async validateTests(testPath?: string): Promise<ValidationResult> {
    console.log(chalk.blue('🧪 Running tests...'));

    try {
      const command = testPath
        ? `npm test -- ${testPath}`
        : `npm test`;

      const { stdout, stderr } = await execAsync(command, {
        cwd: this.projectPath,
        timeout: 60000, // 1 minute timeout
      });

      if (this.verbose) {
        console.log(chalk.gray(stdout));
      }

      console.log(chalk.green('✅ Tests passed'));
      return { passed: true, errors: [], warnings: [] };
    } catch (error: any) {
      const errors = this.parseTestErrors(error.stdout || error.stderr);

      console.log(chalk.red(`❌ Tests failed (${errors.length} failures)`));
      if (this.verbose) {
        errors.forEach(err => console.log(chalk.red(`   ${err}`)));
      }

      return {
        passed: false,
        errors,
        warnings: [],
        output: error.stdout || error.stderr,
      };
    }
  }

  /**
   * Run all validations for a component
   */
  async validateComponent(componentPath: string, withTests = false): Promise<BuildValidationResults> {
    console.log(chalk.blue.bold(`\n🔍 Validating: ${path.basename(componentPath)}\n`));

    const results: BuildValidationResults = {
      typescript: await this.validateTypeScript(componentPath),
      eslint: await this.validateESLint(componentPath),
      build: await this.validateBuild(),
    };

    if (withTests) {
      const testPath = componentPath.replace(/\.tsx?$/, '.test.tsx');
      if (await fs.pathExists(testPath)) {
        results.tests = await this.validateTests(testPath);
      }
    }

    const allPassed = results.typescript.passed &&
                      results.eslint.passed &&
                      results.build.passed &&
                      (!results.tests || results.tests.passed);

    if (allPassed) {
      console.log(chalk.green.bold('\n✅ All validations passed!\n'));
    } else {
      console.log(chalk.red.bold('\n❌ Some validations failed\n'));
    }

    return results;
  }

  /**
   * Run complete project validation
   */
  async validateProject(): Promise<BuildValidationResults> {
    console.log(chalk.blue.bold('\n🔍 Running Complete Project Validation\n'));

    const results: BuildValidationResults = {
      typescript: await this.validateTypeScript(),
      eslint: await this.validateESLint(),
      build: await this.validateBuild(),
    };

    // Check for test script in package.json
    const packageJsonPath = path.join(this.projectPath, 'package.json');
    if (await fs.pathExists(packageJsonPath)) {
      const packageJson = await fs.readJson(packageJsonPath);
      if (packageJson.scripts?.test) {
        results.tests = await this.validateTests();
      }
    }

    return results;
  }

  /**
   * Parse TypeScript errors
   */
  private parseTypeScriptErrors(output: string): string[] {
    const errors: string[] = [];
    const errorRegex = /(.+\.tsx?)\((\d+),(\d+)\): error TS(\d+): (.+)/g;

    let match;
    while ((match = errorRegex.exec(output)) !== null) {
      const [, file, line, col, code, message] = match;
      errors.push(`${file}:${line}:${col} - TS${code}: ${message}`);
    }

    return errors;
  }

  /**
   * Parse ESLint errors
   */
  private parseESLintErrors(output: string): { errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    const lines = output.split('\n');
    for (const line of lines) {
      if (line.includes('error')) {
        errors.push(line.trim());
      } else if (line.includes('warning')) {
        warnings.push(line.trim());
      }
    }

    return { errors, warnings };
  }

  /**
   * Parse build errors
   */
  private parseBuildErrors(output: string): string[] {
    const errors: string[] = [];
    const lines = output.split('\n');

    for (const line of lines) {
      if (
        line.includes('ERROR') ||
        line.includes('Failed to compile') ||
        line.includes('Module not found') ||
        line.includes('Cannot find')
      ) {
        errors.push(line.trim());
      }
    }

    return errors;
  }

  /**
   * Parse test errors
   */
  private parseTestErrors(output: string): string[] {
    const errors: string[] = [];
    const lines = output.split('\n');

    for (const line of lines) {
      if (line.includes('FAIL') || line.includes('✕')) {
        errors.push(line.trim());
      }
    }

    return errors;
  }

  /**
   * Get error context for AI retry
   */
  static extractErrorContext(validationResults: BuildValidationResults): string {
    const context: string[] = [];

    if (!validationResults.typescript.passed) {
      context.push('TypeScript Errors:');
      validationResults.typescript.errors.forEach(err => context.push(`  - ${err}`));
    }

    if (!validationResults.eslint.passed) {
      context.push('ESLint Errors:');
      validationResults.eslint.errors.forEach(err => context.push(`  - ${err}`));
    }

    if (!validationResults.build.passed) {
      context.push('Build Errors:');
      validationResults.build.errors.forEach(err => context.push(`  - ${err}`));
    }

    if (validationResults.tests && !validationResults.tests.passed) {
      context.push('Test Failures:');
      validationResults.tests.errors.forEach(err => context.push(`  - ${err}`));
    }

    return context.join('\n');
  }

  /**
   * Format validation summary
   */
  static formatValidationSummary(results: BuildValidationResults): string {
    const summary: string[] = [];

    summary.push('Validation Results:');
    summary.push(`  TypeScript: ${results.typescript.passed ? '✅ Passed' : '❌ Failed'}`);
    summary.push(`  ESLint: ${results.eslint.passed ? '✅ Passed' : '❌ Failed'}`);
    summary.push(`  Build: ${results.build.passed ? '✅ Passed' : '❌ Failed'}`);

    if (results.tests) {
      summary.push(`  Tests: ${results.tests.passed ? '✅ Passed' : '❌ Failed'}`);
    }

    return summary.join('\n');
  }
}
