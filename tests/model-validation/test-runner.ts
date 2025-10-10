/**
 * Model Validation Test Runner
 *
 * Runs validation tests against the fine-tuned GPT-2 model
 * and generates quality reports with comprehensive metrics.
 */

import { HfInference } from "@huggingface/inference";
import * as fs from "fs";
import * as path from "path";
import {
  intentDictionaryTests,
  type TestPrompt,
} from "./intent-dictionary-tests";
import {
  expandedPatternTests,
  type ExpandedTestPrompt,
} from "./expanded-patterns-tests";

// ============================================================================
// Configuration
// ============================================================================

const MODEL_ID = "faraja/mycontext-codegen2-merged";
const RESULTS_DIR = path.join(__dirname, "results");
const MAX_NEW_TOKENS = 512;
const TEMPERATURE = 0.2;

// ============================================================================
// Types
// ============================================================================

export interface ValidationResult {
  testId: string;
  prompt: string;
  generated: string;
  passed: boolean;
  score: number;
  checks: ValidationCheck[];
  errors: string[];
  warnings: string[];
}

export interface ValidationCheck {
  name: string;
  passed: boolean;
  message: string;
  category:
    | "syntax"
    | "imports"
    | "props"
    | "accessibility"
    | "patterns"
    | "nextjs"
    | "instantdb";
}

export interface TestReport {
  modelId: string;
  testDate: string;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  averageScore: number;
  categoryScores: Record<string, number>;
  results: ValidationResult[];
}

// ============================================================================
// Model Client
// ============================================================================

class GPT2ModelClient {
  private client: HfInference;

  constructor(apiKey?: string) {
    this.client = new HfInference(apiKey || process.env.HUGGINGFACE_API_KEY);
  }

  async generate(prompt: string): Promise<string> {
    try {
      const response = await this.client.textGeneration({
        model: MODEL_ID,
        inputs: `// Task: ${prompt}\n`,
        parameters: {
          max_new_tokens: MAX_NEW_TOKENS,
          temperature: TEMPERATURE,
          return_full_text: false,
        },
      });

      return response.generated_text;
    } catch (error) {
      console.error(`Error generating for prompt: ${prompt}`, error);
      throw error;
    }
  }
}

// ============================================================================
// Validation Logic
// ============================================================================

class CodeValidator {
  /**
   * Validate TypeScript syntax
   */
  static validateSyntax(code: string): ValidationCheck {
    const checks = [
      {
        pattern: /^import\s+.*\s+from\s+['"]/,
        message: "Has import statements",
      },
      {
        pattern: /export\s+(default\s+)?function/,
        message: "Has export statement",
      },
      { pattern: /const\s+\w+\s*=/, message: "Has variable declarations" },
      { pattern: /<\w+[^>]*>/, message: "Has JSX/TSX elements" },
    ];

    const passedChecks = checks.filter((check) => check.pattern.test(code));
    const passed = passedChecks.length >= 2; // At least 2 checks should pass

    return {
      name: "TypeScript Syntax",
      passed,
      message: passed
        ? `Valid TypeScript/TSX syntax (${passedChecks.length}/4 checks)`
        : "Invalid or incomplete TypeScript syntax",
      category: "syntax",
    };
  }

  /**
   * Validate shadcn/ui imports
   */
  static validateImports(
    code: string,
    expectedComponents: string[]
  ): ValidationCheck {
    const hasCorrectImports = expectedComponents.some((component) => {
      const importPattern = new RegExp(
        `@/components/ui/${component.toLowerCase()}`
      );
      return importPattern.test(code);
    });

    return {
      name: "Component Imports",
      passed: hasCorrectImports,
      message: hasCorrectImports
        ? "Contains correct shadcn/ui imports"
        : `Missing expected imports: ${expectedComponents.join(", ")}`,
      category: "imports",
    };
  }

  /**
   * Validate component props
   */
  static validateProps(code: string, expectedProps: string[]): ValidationCheck {
    if (expectedProps.length === 0) {
      return {
        name: "Component Props",
        passed: true,
        message: "No specific props required",
        category: "props",
      };
    }

    const foundProps = expectedProps.filter((prop) => code.includes(prop));
    const passed = foundProps.length >= expectedProps.length / 2; // At least 50% of props

    return {
      name: "Component Props",
      passed,
      message: passed
        ? `Found ${foundProps.length}/${expectedProps.length} expected props`
        : `Missing props: ${expectedProps
            .filter((p) => !foundProps.includes(p))
            .join(", ")}`,
      category: "props",
    };
  }

  /**
   * Validate accessibility
   */
  static validateAccessibility(code: string): ValidationCheck {
    const a11yPatterns = [
      /aria-\w+=/,
      /role="/,
      /alt="/,
      /<label/i,
      /htmlFor=/,
    ];

    const hasA11y = a11yPatterns.some((pattern) => pattern.test(code));

    return {
      name: "Accessibility",
      passed: hasA11y,
      message: hasA11y
        ? "Contains accessibility attributes"
        : "Missing ARIA attributes or semantic HTML",
      category: "accessibility",
    };
  }

  /**
   * Validate pattern adherence
   */
  static validatePatternAdherence(
    code: string,
    mustInclude: string[]
  ): ValidationCheck {
    const foundPatterns = mustInclude.filter((pattern) =>
      code.includes(pattern)
    );
    const passed = foundPatterns.length >= mustInclude.length * 0.7; // 70% threshold

    return {
      name: "Pattern Adherence",
      passed,
      message: passed
        ? `Matches ${foundPatterns.length}/${mustInclude.length} required patterns`
        : `Missing patterns: ${mustInclude
            .filter((p) => !foundPatterns.includes(p))
            .join(", ")}`,
      category: "patterns",
    };
  }

  /**
   * Validate Next.js patterns
   */
  static validateNextJS(
    code: string,
    mustNotInclude: string[]
  ): ValidationCheck {
    const hasClientDirective = code.includes("'use client'");
    const hasServerDirective = code.includes("'use server'");
    const hasHooks = /use(State|Effect|Ref|Context|Reducer)/.test(code);

    // If has hooks, must have 'use client'
    if (hasHooks && !hasClientDirective) {
      return {
        name: "Next.js Compliance",
        passed: false,
        message: "Missing 'use client' directive for client-side hooks",
        category: "nextjs",
      };
    }

    // Check mustNotInclude patterns
    const violations = mustNotInclude.filter((pattern) =>
      code.includes(pattern)
    );
    if (violations.length > 0) {
      return {
        name: "Next.js Compliance",
        passed: false,
        message: `Contains forbidden patterns: ${violations.join(", ")}`,
        category: "nextjs",
      };
    }

    return {
      name: "Next.js Compliance",
      passed: true,
      message: "Follows Next.js App Router conventions",
      category: "nextjs",
    };
  }

  /**
   * Validate InstantDB patterns
   */
  static validateInstantDB(code: string): ValidationCheck {
    if (!code.includes("db.")) {
      return {
        name: "InstantDB Patterns",
        passed: true,
        message: "Not an InstantDB component",
        category: "instantdb",
      };
    }

    const validPatterns = [
      /db\.useQuery\(/,
      /db\.transact\(/,
      /db\.tx\./,
      /db\.auth\./,
      /db\.storage\./,
      /db\.room\(/,
    ];

    const hasValidPattern = validPatterns.some((pattern) => pattern.test(code));

    return {
      name: "InstantDB Patterns",
      passed: hasValidPattern,
      message: hasValidPattern
        ? "Contains valid InstantDB API calls"
        : "Invalid or incomplete InstantDB usage",
      category: "instantdb",
    };
  }
}

// ============================================================================
// Test Runner
// ============================================================================

export class ModelTestRunner {
  private client: GPT2ModelClient;
  private results: ValidationResult[] = [];

  constructor() {
    this.client = new GPT2ModelClient();
  }

  /**
   * Run all tests
   */
  async runAllTests(): Promise<TestReport> {
    console.log("🚀 Starting model validation...\n");

    // Run Intent Dictionary tests
    console.log("📊 Running Intent Dictionary tests (30 patterns)...");
    for (const test of intentDictionaryTests) {
      await this.runIntentDictionaryTest(test);
    }

    // Run Expanded Pattern tests
    console.log("\n📊 Running Expanded Pattern tests (40+ patterns)...");
    for (const test of expandedPatternTests) {
      await this.runExpandedPatternTest(test);
    }

    // Generate report
    const report = this.generateReport();
    await this.saveReport(report);

    return report;
  }

  /**
   * Run Intent Dictionary test
   */
  private async runIntentDictionaryTest(test: TestPrompt): Promise<void> {
    console.log(`  Testing: ${test.pattern}...`);

    try {
      const generated = await this.client.generate(test.prompt);

      const checks: ValidationCheck[] = [
        CodeValidator.validateSyntax(generated),
        CodeValidator.validateImports(generated, test.expectedComponents),
        CodeValidator.validateProps(generated, test.expectedProps),
        CodeValidator.validateAccessibility(generated),
        CodeValidator.validatePatternAdherence(generated, test.mustInclude),
        CodeValidator.validateNextJS(generated, []),
        CodeValidator.validateInstantDB(generated),
      ];

      const passedChecks = checks.filter((c) => c.passed).length;
      const score = (passedChecks / checks.length) * 100;
      const passed = score >= 70; // 70% threshold

      this.results.push({
        testId: test.id,
        prompt: test.prompt,
        generated,
        passed,
        score,
        checks,
        errors: checks.filter((c) => !c.passed).map((c) => c.message),
        warnings: [],
      });

      console.log(`    ${passed ? "✅" : "❌"} Score: ${score.toFixed(1)}%`);
    } catch (error) {
      console.error(`    ❌ Error: ${error}`);
      this.results.push({
        testId: test.id,
        prompt: test.prompt,
        generated: "",
        passed: false,
        score: 0,
        checks: [],
        errors: [`Generation failed: ${error}`],
        warnings: [],
      });
    }
  }

  /**
   * Run Expanded Pattern test
   */
  private async runExpandedPatternTest(
    test: ExpandedTestPrompt
  ): Promise<void> {
    console.log(`  Testing: ${test.id}...`);

    try {
      const generated = await this.client.generate(test.prompt);

      const checks: ValidationCheck[] = [
        CodeValidator.validateSyntax(generated),
        CodeValidator.validatePatternAdherence(generated, test.mustInclude),
        CodeValidator.validateNextJS(generated, test.mustNotInclude),
        CodeValidator.validateInstantDB(generated),
      ];

      const passedChecks = checks.filter((c) => c.passed).length;
      const score = (passedChecks / checks.length) * 100;
      const passed = score >= 60; // Lower threshold for expanded patterns

      this.results.push({
        testId: test.id,
        prompt: test.prompt,
        generated,
        passed,
        score,
        checks,
        errors: checks.filter((c) => !c.passed).map((c) => c.message),
        warnings: [],
      });

      console.log(`    ${passed ? "✅" : "❌"} Score: ${score.toFixed(1)}%`);
    } catch (error) {
      console.error(`    ❌ Error: ${error}`);
      this.results.push({
        testId: test.id,
        prompt: test.prompt,
        generated: "",
        passed: false,
        score: 0,
        checks: [],
        errors: [`Generation failed: ${error}`],
        warnings: [],
      });
    }
  }

  /**
   * Generate comprehensive report
   */
  private generateReport(): TestReport {
    const passedTests = this.results.filter((r) => r.passed).length;
    const totalTests = this.results.length;
    const averageScore =
      this.results.reduce((sum, r) => sum + r.score, 0) / totalTests;

    // Calculate category scores
    const categoryScores: Record<string, number> = {};
    const intentTests = this.results.filter((r) =>
      intentDictionaryTests.some((t) => t.id === r.testId)
    );
    const expandedTests = this.results.filter((r) =>
      expandedPatternTests.some((t) => t.id === r.testId)
    );

    categoryScores["Intent Dictionary"] =
      intentTests.reduce((sum, r) => sum + r.score, 0) / intentTests.length;
    categoryScores["Expanded Patterns"] =
      expandedTests.reduce((sum, r) => sum + r.score, 0) / expandedTests.length;

    return {
      modelId: MODEL_ID,
      testDate: new Date().toISOString(),
      totalTests,
      passedTests,
      failedTests: totalTests - passedTests,
      averageScore,
      categoryScores,
      results: this.results,
    };
  }

  /**
   * Save report to file
   */
  private async saveReport(report: TestReport): Promise<void> {
    // Create results directory
    if (!fs.existsSync(RESULTS_DIR)) {
      fs.mkdirSync(RESULTS_DIR, { recursive: true });
    }

    // Save JSON report
    const jsonPath = path.join(RESULTS_DIR, "test-report.json");
    fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));

    // Save markdown report
    const mdPath = path.join(RESULTS_DIR, "RESULTS.md");
    const markdown = this.generateMarkdownReport(report);
    fs.writeFileSync(mdPath, markdown);

    console.log(`\n✅ Reports saved:`);
    console.log(`   JSON: ${jsonPath}`);
    console.log(`   Markdown: ${mdPath}`);
  }

  /**
   * Generate markdown report
   */
  private generateMarkdownReport(report: TestReport): string {
    const {
      totalTests,
      passedTests,
      failedTests,
      averageScore,
      categoryScores,
    } = report;

    let md = `# GPT-2 Model Validation Results\n\n`;
    md += `## Test Date\n${new Date(report.testDate).toLocaleString()}\n\n`;
    md += `## Model\n\`${report.modelId}\`\n\n`;
    md += `## Test Coverage\n`;
    md += `- Intent Dictionary Patterns: 30/30\n`;
    md += `- Expanded Patterns: ${expandedPatternTests.length}/${expandedPatternTests.length}\n`;
    md += `- Total Tests: ${totalTests}\n\n`;

    md += `## Results Summary\n\n`;
    md += `### Overall Metrics\n`;
    md += `- **Accuracy**: ${((passedTests / totalTests) * 100).toFixed(
      1
    )}% (${passedTests}/${totalTests} tests passed)\n`;
    md += `- **Average Score**: ${averageScore.toFixed(1)}%\n`;
    md += `- **Passed Tests**: ${passedTests}\n`;
    md += `- **Failed Tests**: ${failedTests}\n\n`;

    md += `### Category Scores\n`;
    for (const [category, score] of Object.entries(categoryScores)) {
      md += `- **${category}**: ${score.toFixed(1)}%\n`;
    }

    md += `\n## Detailed Results\n\n`;
    for (const result of report.results) {
      const status = result.passed ? "✅ Pass" : "❌ Fail";
      md += `### ${result.testId} - ${status} (${result.score.toFixed(
        1
      )}%)\n\n`;
      md += `**Prompt**: ${result.prompt}\n\n`;

      if (result.errors.length > 0) {
        md += `**Errors**:\n`;
        result.errors.forEach((error) => {
          md += `- ${error}\n`;
        });
        md += `\n`;
      }

      md += `**Validation Checks**:\n`;
      result.checks.forEach((check) => {
        const checkStatus = check.passed ? "✅" : "❌";
        md += `- ${checkStatus} ${check.name}: ${check.message}\n`;
      });
      md += `\n`;
    }

    return md;
  }
}

// ============================================================================
// CLI Entry Point
// ============================================================================

if (require.main === module) {
  const runner = new ModelTestRunner();
  runner
    .runAllTests()
    .then((report) => {
      console.log(`\n🎉 Testing complete!`);
      console.log(`   Average Score: ${report.averageScore.toFixed(1)}%`);
      console.log(`   Passed: ${report.passedTests}/${report.totalTests}`);
      process.exit(0);
    })
    .catch((error) => {
      console.error(`❌ Testing failed:`, error);
      process.exit(1);
    });
}
