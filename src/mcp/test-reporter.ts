/**
 * Test Reporter
 *
 * Generates and formats test execution reports.
 * Reports are saved in .mycontext/test-reports/
 */

import * as fs from "fs-extra";
import * as path from "path";
import {
  TestReport,
  TestExecutionResult,
  TestMission,
} from "../types/flow-testing";
import chalk from "chalk";

export class TestReporter {
  private projectPath: string;
  private reportsDir: string;

  constructor(projectPath: string) {
    this.projectPath = projectPath;
    this.reportsDir = path.join(projectPath, ".mycontext", "test-reports");
    fs.ensureDirSync(this.reportsDir);
  }

  /**
   * Generate a report from test execution
   */
  async generateReport(
    execution: TestExecutionResult,
    mission?: TestMission
  ): Promise<TestReport> {
    const report: TestReport = {
      reportId: execution.executionId,
      mission: mission || ({} as TestMission), // Will be filled by caller
      execution,
      generatedAt: new Date().toISOString(),
      summary: {
        totalSteps: execution.steps.length,
        successfulSteps: execution.steps.filter((s) => s.success).length,
        failedSteps: execution.steps.filter((s) => !s.success).length,
        totalValidations: execution.validationResults.length,
        passedValidations: execution.validationResults.filter((v) => v.passed)
          .length,
        failedValidations: execution.validationResults.filter((v) => !v.passed)
          .length,
        overallStatus: execution.status,
      },
      insights: this.generateInsights(execution),
      recommendations: this.generateRecommendations(execution),
    };

    // Save report to disk
    await this.saveReport(report);

    return report;
  }

  /**
   * Save report to disk
   */
  private async saveReport(report: TestReport): Promise<void> {
    const filename = `${report.reportId}.json`;
    const filepath = path.join(this.reportsDir, filename);
    await fs.writeJson(filepath, report, { spaces: 2 });
  }

  /**
   * Get a report by execution ID
   */
  async getReport(executionId: string): Promise<TestReport | null> {
    const filepath = path.join(this.reportsDir, `${executionId}.json`);

    if (await fs.pathExists(filepath)) {
      return await fs.readJson(filepath);
    }

    return null;
  }

  /**
   * Format report as text
   */
  async formatReport(
    report: TestReport,
    options: { includeScreenshots?: boolean } = {}
  ): Promise<string> {
    const { includeScreenshots = true } = options;
    const { execution, summary } = report;

    const lines: string[] = [];

    // Header
    lines.push(`# Test Report: ${report.mission.name || "Unknown Mission"}`);
    lines.push("");
    lines.push(`**Execution ID**: ${execution.executionId}`);
    lines.push(`**Status**: ${execution.status.toUpperCase()}`);
    lines.push(`**Date**: ${new Date(execution.startedAt).toLocaleString()}`);
    lines.push(
      `**Duration**: ${execution.duration ? `${execution.duration}ms` : "N/A"}`
    );
    lines.push("");

    // Summary
    lines.push(`## Summary`);
    lines.push("");
    lines.push(`- **Total Steps**: ${summary.totalSteps}`);
    lines.push(`- **Successful Steps**: ${summary.successfulSteps}`);
    lines.push(`- **Failed Steps**: ${summary.failedSteps}`);
    lines.push(`- **Total Validations**: ${summary.totalValidations}`);
    lines.push(`- **Passed Validations**: ${summary.passedValidations}`);
    lines.push(`- **Failed Validations**: ${summary.failedValidations}`);
    lines.push("");

    // Steps
    if (execution.steps.length > 0) {
      lines.push(`## Execution Steps (${execution.steps.length})`);
      lines.push("");

      execution.steps.forEach((step) => {
        const statusIcon = step.success ? "✅" : "❌";
        lines.push(`### ${statusIcon} Step ${step.order + 1}: ${step.action}`);
        if (step.intent) {
          lines.push(`**Intent**: ${step.intent}`);
        }
        if (!step.success && step.error) {
          lines.push(`**Error**: ${step.error}`);
        }
        if (includeScreenshots && step.screenshot) {
          lines.push(`**Screenshot**: ${step.screenshot}`);
        }
        if (step.metadata) {
          lines.push(`**Metadata**: ${JSON.stringify(step.metadata, null, 2)}`);
        }
        lines.push("");
      });
    }

    // Validations
    if (execution.validationResults.length > 0) {
      lines.push(`## Validation Results (${execution.validationResults.length})`);
      lines.push("");

      execution.validationResults.forEach((validation, index) => {
        const statusIcon = validation.passed ? "✅" : "❌";
        lines.push(`### ${statusIcon} Validation ${index + 1}`);
        lines.push(`**Type**: ${validation.rule.type}`);
        lines.push(`**Description**: ${validation.rule.description}`);
        lines.push(`**Result**: ${validation.message}`);
        if (validation.actualValue) {
          lines.push(`**Actual Value**: ${validation.actualValue}`);
        }
        lines.push("");
      });
    }

    // Error
    if (execution.error) {
      lines.push(`## Error`);
      lines.push("");
      lines.push("```");
      lines.push(execution.error.message);
      if (execution.error.stack) {
        lines.push("");
        lines.push(execution.error.stack);
      }
      lines.push("```");
      lines.push("");
    }

    // Final State
    lines.push(`## Final State`);
    lines.push("");
    lines.push(`**URL**: ${execution.finalState.url || "N/A"}`);
    if (includeScreenshots && execution.finalState.screenshot) {
      lines.push(`**Screenshot**: ${execution.finalState.screenshot}`);
    }
    lines.push("");

    // AI Notes
    if (execution.aiNotes) {
      lines.push(`## AI Notes`);
      lines.push("");
      lines.push(execution.aiNotes);
      lines.push("");
    }

    // Insights
    if (report.insights && report.insights.length > 0) {
      lines.push(`## Insights`);
      lines.push("");
      report.insights.forEach((insight) => lines.push(`- ${insight}`));
      lines.push("");
    }

    // Recommendations
    if (report.recommendations && report.recommendations.length > 0) {
      lines.push(`## Recommendations`);
      lines.push("");
      report.recommendations.forEach((rec) => lines.push(`- ${rec}`));
      lines.push("");
    }

    return lines.join("\n");
  }

  /**
   * Generate insights from execution
   */
  private generateInsights(execution: TestExecutionResult): string[] {
    const insights: string[] = [];

    // Analyze step success rate
    const successRate =
      execution.steps.length > 0
        ? (execution.steps.filter((s) => s.success).length /
            execution.steps.length) *
          100
        : 0;

    if (successRate === 100 && execution.status === "passed") {
      insights.push("All steps executed successfully");
    } else if (successRate < 50) {
      insights.push(
        `Low success rate (${Math.round(successRate)}%) - test may need adjustment`
      );
    }

    // Analyze execution time
    if (execution.duration) {
      if (execution.duration > 30000) {
        insights.push(`Test took ${Math.round(execution.duration / 1000)}s - consider optimization`);
      } else if (execution.duration < 5000) {
        insights.push("Fast execution time - excellent!");
      }
    }

    // Analyze validation results
    if (execution.validationResults.length > 0) {
      const passRate =
        (execution.validationResults.filter((v) => v.passed).length /
          execution.validationResults.length) *
        100;

      if (passRate < 100) {
        insights.push(
          `${Math.round(100 - passRate)}% of validations failed - review expected outcomes`
        );
      }
    }

    // Check for errors
    if (execution.error) {
      insights.push(`Test encountered an error: ${execution.error.message}`);
    }

    return insights;
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(execution: TestExecutionResult): string[] {
    const recommendations: string[] = [];

    // Failed steps
    const failedSteps = execution.steps.filter((s) => !s.success);
    if (failedSteps.length > 0) {
      recommendations.push(
        `Review failed steps: ${failedSteps.map((s) => s.action).join(", ")}`
      );
    }

    // Failed validations
    const failedValidations = execution.validationResults.filter(
      (v) => !v.passed
    );
    if (failedValidations.length > 0) {
      recommendations.push(
        `Update validation rules or fix issues causing failures`
      );
    }

    // No validations
    if (execution.validationResults.length === 0) {
      recommendations.push(
        `Add validation rules to ensure test reliability`
      );
    }

    // Long execution
    if (execution.duration && execution.duration > 30000) {
      recommendations.push(
        `Consider adding explicit waits or optimizing selectors`
      );
    }

    // Error
    if (execution.error) {
      recommendations.push(
        `Fix the error before proceeding: ${execution.error.message}`
      );
    }

    return recommendations;
  }

  /**
   * Generate summary report for multiple executions
   */
  async generateSummaryReport(
    executionIds: string[]
  ): Promise<{
    totalTests: number;
    passed: number;
    failed: number;
    errors: number;
    averageDuration: number;
    reports: TestReport[];
  }> {
    const reports: TestReport[] = [];

    for (const id of executionIds) {
      const report = await this.getReport(id);
      if (report) {
        reports.push(report);
      }
    }

    const passed = reports.filter(
      (r) => r.execution.status === "passed"
    ).length;
    const failed = reports.filter(
      (r) => r.execution.status === "failed"
    ).length;
    const errors = reports.filter(
      (r) => r.execution.status === "error"
    ).length;

    const durations = reports
      .filter((r) => r.execution.duration)
      .map((r) => r.execution.duration!);
    const averageDuration =
      durations.length > 0
        ? durations.reduce((sum, d) => sum + d, 0) / durations.length
        : 0;

    return {
      totalTests: reports.length,
      passed,
      failed,
      errors,
      averageDuration: Math.round(averageDuration),
      reports,
    };
  }

  /**
   * Console log a report with colors
   */
  printReport(report: TestReport): void {
    console.log(chalk.bold.blue(`\n📊 Test Report: ${report.mission.name}`));
    console.log(chalk.gray(`═══════════════════════════════════════`));

    const statusColor =
      report.execution.status === "passed"
        ? chalk.green
        : report.execution.status === "failed"
          ? chalk.red
          : chalk.yellow;

    console.log(
      `Status: ${statusColor(report.execution.status.toUpperCase())}`
    );
    console.log(
      `Duration: ${report.execution.duration ? `${report.execution.duration}ms` : "N/A"}`
    );
    console.log("");

    console.log(chalk.bold("Summary:"));
    console.log(
      `  Steps: ${report.summary.successfulSteps}/${report.summary.totalSteps} passed`
    );
    console.log(
      `  Validations: ${report.summary.passedValidations}/${report.summary.totalValidations} passed`
    );

    if (report.insights && report.insights.length > 0) {
      console.log(chalk.bold("\nInsights:"));
      report.insights.forEach((insight) =>
        console.log(chalk.cyan(`  • ${insight}`))
      );
    }

    if (report.recommendations && report.recommendations.length > 0) {
      console.log(chalk.bold("\nRecommendations:"));
      report.recommendations.forEach((rec) =>
        console.log(chalk.yellow(`  • ${rec}`))
      );
    }

    console.log(chalk.gray(`\nFull report: ${report.reportId}\n`));
  }
}
