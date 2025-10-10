import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import chalk from "chalk";

export interface RegressionTestResult {
  typecheck: {
    passed: boolean;
    details: string[];
    score: number;
  };
  lint: {
    passed: boolean;
    details: string[];
    score: number;
  };
  unit: {
    passed: number;
    failed: number;
    total: number;
    details: string[];
    score: number;
  };
  overall: {
    score: number;
    passed: boolean;
    summary: string;
  };
}

export interface BaselineComparison {
  hasBaseline: boolean;
  regressionDetected: boolean;
  changes: {
    typecheck: "improved" | "regressed" | "unchanged";
    lint: "improved" | "regressed" | "unchanged";
    unit: "improved" | "regressed" | "unchanged";
  };
  summary: string;
}

export class RegressionRunner {
  private projectRoot: string;
  private componentPath: string;

  constructor(projectRoot: string, componentPath: string) {
    this.projectRoot = projectRoot;
    this.componentPath = componentPath;
  }

  async runRegressionSuite(): Promise<RegressionTestResult> {
    console.log(chalk.blue("🧪 Running regression test suite..."));

    const typecheckResult = await this.runTypecheck();
    const lintResult = await this.runLint();
    const unitResult = await this.runUnitTests();

    // Calculate weighted score
    const weights = {
      typecheck: 0.3,
      lint: 0.2,
      unit: 0.5,
    };

    const overallScore =
      typecheckResult.score * weights.typecheck +
      lintResult.score * weights.lint +
      unitResult.score * weights.unit;

    const passed =
      typecheckResult.passed && lintResult.passed && unitResult.failed === 0;

    let summary = "";
    if (passed) {
      summary = `All tests passed (Score: ${overallScore.toFixed(2)})`;
    } else {
      const failures = [];
      if (!typecheckResult.passed) failures.push("TypeScript");
      if (!lintResult.passed) failures.push("ESLint");
      if (unitResult.failed > 0)
        failures.push(`${unitResult.failed} unit tests`);
      summary = `Failed: ${failures.join(", ")} (Score: ${overallScore.toFixed(
        2
      )})`;
    }

    return {
      typecheck: typecheckResult,
      lint: lintResult,
      unit: unitResult,
      overall: {
        score: overallScore,
        passed,
        summary,
      },
    };
  }

  private async runTypecheck(): Promise<{
    passed: boolean;
    details: string[];
    score: number;
  }> {
    try {
      console.log(chalk.gray("  🔍 Running TypeScript check..."));

      const result = execSync(`npx tsc --noEmit --skipLibCheck`, {
        cwd: this.projectRoot,
        encoding: "utf8",
        stdio: "pipe",
      });

      return {
        passed: true,
        details: ["TypeScript compilation successful"],
        score: 1.0,
      };
    } catch (error: any) {
      const errorOutput = error.stdout || error.stderr || error.message;
      const details = errorOutput
        .split("\n")
        .filter((line: string) => line.trim());

      return {
        passed: false,
        details,
        score: 0.0,
      };
    }
  }

  private async runLint(): Promise<{
    passed: boolean;
    details: string[];
    score: number;
  }> {
    try {
      console.log(chalk.gray("  🔍 Running ESLint..."));

      const result = execSync(
        `npx eslint "${this.componentPath}" --format=compact`,
        {
          cwd: this.projectRoot,
          encoding: "utf8",
          stdio: "pipe",
        }
      );

      return {
        passed: true,
        details: ["ESLint check passed"],
        score: 1.0,
      };
    } catch (error: any) {
      const errorOutput = error.stdout || error.stderr || error.message;
      const details = errorOutput
        .split("\n")
        .filter((line: string) => line.trim());

      // Calculate partial score based on error severity
      const errorCount = details.filter((line: string) =>
        line.includes("error")
      ).length;
      const warningCount = details.filter((line: string) =>
        line.includes("warning")
      ).length;

      // Score decreases with errors, warnings have less impact
      const score = Math.max(0, 1.0 - errorCount * 0.3 - warningCount * 0.1);

      return {
        passed: errorCount === 0,
        details,
        score,
      };
    }
  }

  private async runUnitTests(): Promise<{
    passed: number;
    failed: number;
    total: number;
    details: string[];
    score: number;
  }> {
    try {
      console.log(chalk.gray("  🔍 Running unit tests..."));

      // Try to find test files for this component
      const testFiles = this.findTestFiles();

      if (testFiles.length === 0) {
        return {
          passed: 0,
          failed: 0,
          total: 0,
          details: ["No unit tests found for this component"],
          score: 0.5, // Neutral score when no tests exist
        };
      }

      const result = execSync(`npx jest ${testFiles.join(" ")} --json`, {
        cwd: this.projectRoot,
        encoding: "utf8",
        stdio: "pipe",
      });

      // Parse test results from JSON output
      const output = result.toString();
      const jsonMatch = output.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        const testResult = JSON.parse(jsonMatch[0]);
        const passed = testResult.numPassedTests || 0;
        const failed = testResult.numFailedTests || 0;
        const total = testResult.numTotalTests || 0;
        const score = total > 0 ? passed / total : 0.5;

        return {
          passed,
          failed,
          total,
          details: [`${passed}/${total} tests passed`],
          score,
        };
      }

      // Fallback to regex parsing if JSON parsing fails
      const passedMatch = output.match(/(\d+) passed/);
      const failedMatch = output.match(/(\d+) failed/);

      const passed = passedMatch ? parseInt(passedMatch[1]!, 10) : 0;
      const failed = failedMatch ? parseInt(failedMatch[1]!, 10) : 0;
      const total = passed + failed;

      const score = total > 0 ? passed / total : 0.5;

      return {
        passed,
        failed,
        total,
        details: [`${passed}/${total} tests passed`],
        score,
      };
    } catch (error: any) {
      const errorOutput = error.stdout || error.stderr || error.message;
      const details = errorOutput
        .split("\n")
        .filter((line: string) => line.trim());

      // Try to extract test results from error output
      const passedMatch = errorOutput.match(/(\d+) passed/);
      const failedMatch = errorOutput.match(/(\d+) failed/);

      const passed = passedMatch ? parseInt(passedMatch[1]!, 10) : 0;
      const failed = failedMatch ? parseInt(failedMatch[1]!, 10) : 0;
      const total = passed + failed;

      const score = total > 0 ? passed / total : 0.0;

      return {
        passed,
        failed,
        total,
        details,
        score,
      };
    }
  }

  private findTestFiles(): string[] {
    const testFiles: string[] = [];
    const componentName = path.basename(
      this.componentPath,
      path.extname(this.componentPath)
    );

    // Common test file patterns
    const patterns = [
      `${componentName}.test.ts`,
      `${componentName}.test.tsx`,
      `${componentName}.spec.ts`,
      `${componentName}.spec.tsx`,
      `__tests__/${componentName}.test.ts`,
      `__tests__/${componentName}.test.tsx`,
      `tests/${componentName}.test.ts`,
      `tests/${componentName}.test.tsx`,
    ];

    for (const pattern of patterns) {
      const testPath = path.join(this.projectRoot, pattern);
      if (fs.existsSync(testPath)) {
        testFiles.push(pattern);
      }
    }

    return testFiles;
  }

  async compareToBaseline(
    currentResult: RegressionTestResult,
    baselineResult: RegressionTestResult | null
  ): Promise<BaselineComparison> {
    if (!baselineResult) {
      return {
        hasBaseline: false,
        regressionDetected: false,
        changes: {
          typecheck: "unchanged",
          lint: "unchanged",
          unit: "unchanged",
        },
        summary: "No baseline available for comparison",
      };
    }

    const changes = {
      typecheck: this.compareScore(
        currentResult.typecheck.score,
        baselineResult.typecheck.score
      ),
      lint: this.compareScore(
        currentResult.lint.score,
        baselineResult.lint.score
      ),
      unit: this.compareScore(
        currentResult.unit.score,
        baselineResult.unit.score
      ),
    };

    const regressions = Object.values(changes).filter(
      (change) => change === "regressed"
    ).length;
    const improvements = Object.values(changes).filter(
      (change) => change === "improved"
    ).length;

    let summary = "";
    if (regressions === 0 && improvements === 0) {
      summary = "No changes detected";
    } else if (regressions > 0) {
      summary = `${regressions} regression(s) detected`;
    } else {
      summary = `${improvements} improvement(s) detected`;
    }

    return {
      hasBaseline: true,
      regressionDetected: regressions > 0,
      changes,
      summary,
    };
  }

  private compareScore(
    current: number,
    baseline: number
  ): "improved" | "regressed" | "unchanged" {
    const threshold = 0.05; // 5% threshold for change detection

    if (Math.abs(current - baseline) < threshold) {
      return "unchanged";
    }

    return current > baseline ? "improved" : "regressed";
  }

  async saveBaseline(
    result: RegressionTestResult,
    componentPath: string
  ): Promise<void> {
    const baselineDir = path.join(this.projectRoot, ".mycontext", "baselines");
    if (!fs.existsSync(baselineDir)) {
      fs.mkdirSync(baselineDir, { recursive: true });
    }

    const componentName = path.basename(
      componentPath,
      path.extname(componentPath)
    );
    const baselineFile = path.join(
      baselineDir,
      `${componentName}-baseline.json`
    );

    const baseline = {
      timestamp: new Date().toISOString(),
      componentPath,
      result,
    };

    fs.writeFileSync(baselineFile, JSON.stringify(baseline, null, 2));
    console.log(chalk.green(`✅ Baseline saved for ${componentName}`));
  }

  async loadBaseline(
    componentPath: string
  ): Promise<RegressionTestResult | null> {
    const baselineDir = path.join(this.projectRoot, ".mycontext", "baselines");
    const componentName = path.basename(
      componentPath,
      path.extname(componentPath)
    );
    const baselineFile = path.join(
      baselineDir,
      `${componentName}-baseline.json`
    );

    if (!fs.existsSync(baselineFile)) {
      return null;
    }

    try {
      const content = fs.readFileSync(baselineFile, "utf8");
      const baseline = JSON.parse(content);
      return baseline.result as RegressionTestResult;
    } catch (error) {
      console.warn(
        chalk.yellow(`⚠️  Failed to load baseline for ${componentName}`)
      );
      return null;
    }
  }
}
