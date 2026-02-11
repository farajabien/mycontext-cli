import { Command } from "commander";
import chalk from "chalk";
import { ProjectStructureValidator } from "../utils/ProjectStructureValidator";
import { PreCommandValidator } from "../utils/PreCommandValidator";
import * as fs from "fs-extra";
import * as path from "path";

export class HealthCheckCommand {
  private validator: ProjectStructureValidator;

  constructor() {
    this.validator = new ProjectStructureValidator();
  }

  register(program: Command): void {
    const healthCheckCommand = program
      .command("health-check")
      .description("Check and fix project structure issues")
      .option("-f, --fix", "Automatically fix issues where possible")
      .option("-r, --report", "Generate detailed health report")
      .option("-s, --strict", "Enable strict mode (block commands on issues)")
      .option("-o, --output <file>", "Output report to file")
      .option("--no-auto-fix", "Disable automatic fixing")
      .action(async (options) => {
        await this.run(options);
      });

    // Add validation hook to this command itself
    PreCommandValidator.addValidationHook(healthCheckCommand, {
      autoFix: false,
      strict: false,
    });
  }

  async run(options: {
    fix?: boolean;
    report?: boolean;
    strict?: boolean;
    output?: string;
    autoFix?: boolean;
  }): Promise<void> {
    console.log(chalk.blue("🏥 MyContext Project Health Check"));
    console.log(chalk.blue("================================\n"));

    try {
      // Run validation
      const report = await this.validator.validate();

      // Display results
      this.displayResults(report, options);

      // Auto-fix if requested
      if (options.fix || options.autoFix !== false) {
        await this.handleAutoFix(report, options);
      }

      // Generate report if requested
      if (options.report || options.output) {
        await this.generateReport(report, options);
      }

      // Set global validation settings
      if (options.strict !== undefined) {
        const { GlobalValidationSettings } = await import(
          "../utils/PreCommandValidator"
        );
        const settings = GlobalValidationSettings.getInstance();
        settings.setStrictMode(options.strict);
        console.log(
          chalk.blue(
            `\n🔧 Global strict mode: ${options.strict ? "enabled" : "disabled"}`
          )
        );
      }

      // Exit with appropriate code
      if (!report.isValid && options.strict) {
        console.log(chalk.red("\n❌ Health check failed in strict mode"));
        process.exit(1);
      } else if (!report.isValid) {
        console.log(chalk.yellow("\n⚠️  Health check completed with warnings"));
        process.exit(0);
      } else {
        console.log(chalk.green("\n✅ Health check passed"));
        process.exit(0);
      }
    } catch (error) {
      console.log(chalk.red(`❌ Health check failed: ${error}`));
      process.exit(1);
    }
  }

  private displayResults(report: any, options: any): void {
    console.log(chalk.blue("📊 Project Metrics:"));
    console.log(`   Package files: ${report.metrics.packageJsonCount}`);
    console.log(`   Node modules: ${report.metrics.nodeModulesCount}`);
    console.log(`   Lock files: ${report.metrics.lockFileCount}`);
    console.log(`   TypeScript configs: ${report.metrics.tsConfigCount}`);
    console.log(`   Build configs: ${report.metrics.buildConfigCount}`);
    console.log(`   Project depth: ${report.metrics.projectDepth}`);

    // Next.js specific metrics
    if (report.nextjsCompliant !== undefined) {
      console.log(
        `   Next.js App Router: ${report.nextjsCompliant ? chalk.green("✅ Compliant") : chalk.red("❌ Issues")}`
      );
    }
    if (report.shadcnCompliant !== undefined) {
      console.log(
        `   shadcn/ui Integration: ${report.shadcnCompliant ? chalk.green("✅ Compliant") : chalk.red("❌ Issues")}`
      );
    }
    console.log();

    console.log(chalk.blue("🏥 Health Status:"));
    if (report.isValid) {
      console.log(chalk.green("   ✅ HEALTHY - No issues found"));
    } else {
      console.log(
        chalk.red(
          `   ❌ NEEDS ATTENTION - ${report.issues.length} issues found`
        )
      );
    }

    if (report.issues.length > 0) {
      console.log(chalk.blue("\n🚨 Issues Found:"));

      const criticalIssues = report.issues.filter(
        (issue: any) => issue.severity === "critical"
      );
      const highIssues = report.issues.filter(
        (issue: any) => issue.severity === "high"
      );
      const mediumIssues = report.issues.filter(
        (issue: any) => issue.severity === "medium"
      );
      const lowIssues = report.issues.filter(
        (issue: any) => issue.severity === "low"
      );

      if (criticalIssues.length > 0) {
        console.log(chalk.red("\n   Critical Issues:"));
        criticalIssues.forEach((issue: any) => {
          console.log(chalk.red(`   ❌ ${issue.message}`));
          if (issue.file) console.log(chalk.gray(`      File: ${issue.file}`));
          if (issue.fix) console.log(chalk.gray(`      Fix: ${issue.fix}`));
        });
      }

      if (highIssues.length > 0) {
        console.log(chalk.red("\n   High Priority Issues:"));
        highIssues.forEach((issue: any) => {
          console.log(chalk.red(`   ⚠️  ${issue.message}`));
          if (issue.file) console.log(chalk.gray(`      File: ${issue.file}`));
          if (issue.fix) console.log(chalk.gray(`      Fix: ${issue.fix}`));
        });
      }

      if (mediumIssues.length > 0) {
        console.log(chalk.yellow("\n   Medium Priority Issues:"));
        mediumIssues.forEach((issue: any) => {
          console.log(chalk.yellow(`   ⚠️  ${issue.message}`));
          if (issue.file) console.log(chalk.gray(`      File: ${issue.file}`));
          if (issue.fix) console.log(chalk.gray(`      Fix: ${issue.fix}`));
        });
      }

      if (lowIssues.length > 0) {
        console.log(chalk.blue("\n   Low Priority Issues:"));
        lowIssues.forEach((issue: any) => {
          console.log(chalk.blue(`   ℹ️  ${issue.message}`));
          if (issue.file) console.log(chalk.gray(`      File: ${issue.file}`));
          if (issue.fix) console.log(chalk.gray(`      Fix: ${issue.fix}`));
        });
      }
    }

    if (report.recommendations.length > 0) {
      console.log(chalk.blue("\n💡 Recommendations:"));
      report.recommendations.forEach((rec: string) => {
        console.log(chalk.blue(`   • ${rec}`));
      });
    }

    console.log(
      chalk.blue(
        `\n🔧 Auto-fix available: ${report.autoFixable ? "Yes" : "No"}`
      )
    );
  }

  private async handleAutoFix(report: any, options: any): Promise<void> {
    if (!report.autoFixable) {
      console.log(chalk.yellow("\n⚠️  No auto-fixable issues found"));
      return;
    }

    console.log(chalk.blue("\n🔧 Attempting to auto-fix issues..."));

    try {
      const fixResult = await this.validator.autoFix();

      if (fixResult.fixed > 0) {
        console.log(
          chalk.green(`✅ Successfully fixed ${fixResult.fixed} issues`)
        );
      }

      if (fixResult.failed > 0) {
        console.log(chalk.red(`❌ Failed to fix ${fixResult.failed} issues:`));
        fixResult.errors.forEach((error: string) => {
          console.log(chalk.red(`   ${error}`));
        });
      }

      if (fixResult.fixed === 0 && fixResult.failed === 0) {
        console.log(chalk.yellow("ℹ️  No issues were auto-fixable"));
      }
    } catch (error) {
      console.log(chalk.red(`❌ Auto-fix failed: ${error}`));
    }
  }

  private async generateReport(report: any, options: any): Promise<void> {
    try {
      const reportContent = await this.validator.generateHealthReport();

      if (options.output) {
        const outputPath = path.resolve(options.output);
        await fs.writeFile(outputPath, reportContent);
        console.log(chalk.green(`\n📄 Health report saved to: ${outputPath}`));
      } else {
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        const reportPath = path.join(
          process.cwd(),
          `health-report-${timestamp}.md`
        );
        await fs.writeFile(reportPath, reportContent);
        console.log(chalk.green(`\n📄 Health report saved to: ${reportPath}`));
      }
    } catch (error) {
      console.log(chalk.red(`❌ Failed to generate report: ${error}`));
    }
  }
}

/**
 * Quick health check function for programmatic use
 */
export async function quickHealthCheck(projectRoot?: string): Promise<boolean> {
  try {
    const validator = new ProjectStructureValidator(projectRoot);
    const report = await validator.validate();
    return report.isValid;
  } catch (error) {
    console.error(`Health check failed: ${error}`);
    return false;
  }
}

/**
 * Health check with auto-fix
 */
export async function healthCheckWithFix(
  projectRoot?: string
): Promise<{ healthy: boolean; fixed: number }> {
  try {
    const validator = new ProjectStructureValidator(projectRoot);
    const report = await validator.validate();

    if (report.isValid) {
      return { healthy: true, fixed: 0 };
    }

    if (report.autoFixable) {
      const fixResult = await validator.autoFix();
      const newReport = await validator.validate();
      return { healthy: newReport.isValid, fixed: fixResult.fixed };
    }

    return { healthy: false, fixed: 0 };
  } catch (error) {
    console.error(`Health check with fix failed: ${error}`);
    return { healthy: false, fixed: 0 };
  }
}
