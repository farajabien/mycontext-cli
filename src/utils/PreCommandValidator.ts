import { ProjectStructureValidator, ProjectStructureReport } from "./ProjectStructureValidator";
import chalk from "chalk";
import { Command } from "commander";

export interface ValidationResult {
  passed: boolean;
  report: ProjectStructureReport;
  autoFixed: boolean;
}

export class PreCommandValidator {
  private validator: ProjectStructureValidator;
  private autoFixEnabled: boolean = true;
  private strictMode: boolean = false;

  constructor(projectRoot?: string, options?: { autoFix?: boolean; strict?: boolean }) {
    this.validator = new ProjectStructureValidator(projectRoot);
    this.autoFixEnabled = options?.autoFix ?? true;
    this.strictMode = options?.strict ?? false;
  }

  /**
   * Validate project structure before running any command
   */
  async validateBeforeCommand(command: string): Promise<ValidationResult> {
    console.log(chalk.blue(`🔍 Validating project structure before: ${command}`));
    
    const report = await this.validator.validate();
    
    if (report.isValid) {
      console.log(chalk.green("✅ Project structure is healthy"));
      return { passed: true, report, autoFixed: false };
    }

    console.log(chalk.yellow(`⚠️  Found ${report.issues.length} project structure issues`));
    
    // Show critical issues immediately
    const criticalIssues = report.issues.filter(issue => issue.severity === "critical");
    if (criticalIssues.length > 0) {
      console.log(chalk.red("\n🚨 Critical Issues Found:"));
      criticalIssues.forEach(issue => {
        console.log(chalk.red(`   ❌ ${issue.message}`));
        if (issue.file) console.log(chalk.gray(`      File: ${issue.file}`));
        if (issue.fix) console.log(chalk.gray(`      Fix: ${issue.fix}`));
      });
    }

    // Attempt auto-fix if enabled
    let autoFixed = false;
    if (this.autoFixEnabled && report.autoFixable) {
      console.log(chalk.blue("\n🔧 Attempting to auto-fix issues..."));
      const fixResult = await this.validator.autoFix();
      
      if (fixResult.fixed > 0) {
        console.log(chalk.green(`✅ Auto-fixed ${fixResult.fixed} issues`));
        autoFixed = true;
        
        // Re-validate after fixes
        const newReport = await this.validator.validate();
        if (newReport.isValid) {
          console.log(chalk.green("✅ All issues resolved!"));
          return { passed: true, report: newReport, autoFixed: true };
        }
      }
      
      if (fixResult.failed > 0) {
        console.log(chalk.red(`❌ Failed to fix ${fixResult.failed} issues`));
        fixResult.errors.forEach(error => {
          console.log(chalk.red(`   ${error}`));
        });
      }
    }

    // Handle remaining issues based on strict mode
    if (this.strictMode) {
      console.log(chalk.red("\n🚫 Strict mode enabled - blocking command execution"));
      console.log(chalk.yellow("Run 'mycontext health-check --fix' to resolve issues"));
      return { passed: false, report, autoFixed };
    } else {
      console.log(chalk.yellow("\n⚠️  Continuing with warnings..."));
      console.log(chalk.yellow("Run 'mycontext health-check' for detailed report"));
      return { passed: true, report, autoFixed };
    }
  }

  /**
   * Add validation hooks to a Commander command
   */
  static addValidationHook(command: Command, options?: { autoFix?: boolean; strict?: boolean }): void {
    const validator = new PreCommandValidator(undefined, options);
    
    command.hook('preAction', async (thisCommand, actionCommand) => {
      const commandName = `${actionCommand.name()} ${actionCommand.args.join(' ')}`.trim();
      
      try {
        const result = await validator.validateBeforeCommand(commandName);
        
        if (!result.passed) {
          console.log(chalk.red("\n❌ Command blocked due to project structure issues"));
          process.exit(1);
        }
        
        if (result.autoFixed) {
          console.log(chalk.green("\n✅ Project structure issues auto-fixed, continuing..."));
        }
      } catch (error) {
        console.log(chalk.red(`❌ Validation failed: ${error}`));
        if (options?.strict) {
          process.exit(1);
        }
      }
    });
  }

  /**
   * Validate specific command types with custom rules
   */
  async validateForCommandType(commandType: string): Promise<ValidationResult> {
    const report = await this.validator.validate();
    
    // Add command-specific validation rules
    switch (commandType) {
      case "generate":
        return this.validateForGenerate(report);
      case "build":
        return this.validateForBuild(report);
      case "test":
        return this.validateForTest(report);
      case "deploy":
        return this.validateForDeploy(report);
      default:
        return this.validateBeforeCommand(commandType);
    }
  }

  private async validateForGenerate(report: ProjectStructureReport): Promise<ValidationResult> {
    // For generate commands, we need a clean structure
    const criticalIssues = report.issues.filter(issue => issue.severity === "critical");
    
    if (criticalIssues.length > 0) {
      console.log(chalk.red("🚫 Cannot generate components with critical project structure issues"));
      return { passed: false, report, autoFixed: false };
    }
    
    return this.validateBeforeCommand("generate");
  }

  private async validateForBuild(report: ProjectStructureReport): Promise<ValidationResult> {
    // For build commands, we need proper configuration
    const configIssues = report.issues.filter(issue => 
      issue.message.includes("configuration") || 
      issue.message.includes("package.json") ||
      issue.message.includes("lock file")
    );
    
    if (configIssues.length > 0) {
      console.log(chalk.red("🚫 Cannot build with configuration issues"));
      return { passed: false, report, autoFixed: false };
    }
    
    return this.validateBeforeCommand("build");
  }

  private async validateForTest(report: ProjectStructureReport): Promise<ValidationResult> {
    // For test commands, we need dependencies installed
    const dependencyIssues = report.issues.filter(issue => 
      issue.message.includes("node_modules") ||
      issue.message.includes("dependencies")
    );
    
    if (dependencyIssues.length > 0) {
      console.log(chalk.red("🚫 Cannot run tests with dependency issues"));
      return { passed: false, report, autoFixed: false };
    }
    
    return this.validateBeforeCommand("test");
  }

  private async validateForDeploy(report: ProjectStructureReport): Promise<ValidationResult> {
    // For deploy commands, we need a completely clean structure
    if (!report.isValid) {
      console.log(chalk.red("🚫 Cannot deploy with project structure issues"));
      console.log(chalk.yellow("Run 'mycontext health-check --fix' to resolve issues"));
      return { passed: false, report, autoFixed: false };
    }
    
    return this.validateBeforeCommand("deploy");
  }

  /**
   * Enable/disable auto-fix
   */
  setAutoFix(enabled: boolean): void {
    this.autoFixEnabled = enabled;
  }

  /**
   * Enable/disable strict mode
   */
  setStrictMode(enabled: boolean): void {
    this.strictMode = enabled;
  }

  /**
   * Get current validation settings
   */
  getSettings(): { autoFix: boolean; strict: boolean } {
    return {
      autoFix: this.autoFixEnabled,
      strict: this.strictMode
    };
  }
}

/**
 * Decorator function to add validation to commands
 */
export function withValidation(options?: { autoFix?: boolean; strict?: boolean }) {
  return function(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function(...args: any[]) {
      const validator = new PreCommandValidator(undefined, options);
      const commandName = `${target.constructor.name}.${propertyKey}`;
      
      try {
        const result = await validator.validateBeforeCommand(commandName);
        
        if (!result.passed) {
          console.log(chalk.red("\n❌ Command blocked due to project structure issues"));
          return;
        }
        
        if (result.autoFixed) {
          console.log(chalk.green("\n✅ Project structure issues auto-fixed, continuing..."));
        }
        
        return originalMethod.apply(this, args);
      } catch (error) {
        console.log(chalk.red(`❌ Validation failed: ${error}`));
        if (options?.strict) {
          return;
        }
        return originalMethod.apply(this, args);
      }
    };
    
    return descriptor;
  };
}

/**
 * Global validation settings
 */
export class GlobalValidationSettings {
  private static instance: GlobalValidationSettings;
  private autoFixEnabled: boolean = true;
  private strictMode: boolean = false;
  private validationEnabled: boolean = true;

  static getInstance(): GlobalValidationSettings {
    if (!GlobalValidationSettings.instance) {
      GlobalValidationSettings.instance = new GlobalValidationSettings();
    }
    return GlobalValidationSettings.instance;
  }

  setAutoFix(enabled: boolean): void {
    this.autoFixEnabled = enabled;
  }

  setStrictMode(enabled: boolean): void {
    this.strictMode = enabled;
  }

  setValidationEnabled(enabled: boolean): void {
    this.validationEnabled = enabled;
  }

  getSettings(): { autoFix: boolean; strict: boolean; enabled: boolean } {
    return {
      autoFix: this.autoFixEnabled,
      strict: this.strictMode,
      enabled: this.validationEnabled
    };
  }

  createValidator(projectRoot?: string): PreCommandValidator {
    return new PreCommandValidator(projectRoot, {
      autoFix: this.autoFixEnabled,
      strict: this.strictMode
    });
  }
}
