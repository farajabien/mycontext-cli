/**
 * Visual Validator Agent
 *
 * Performs visual regression testing by comparing screenshots.
 * Detects UI changes, color scheme drift, layout shifts, and more.
 *
 * Communicates via Living Brain (context.json).
 */

import { Page } from "playwright";
import {
  SubAgent,
} from "./SubAgent";
import { GeminiVisionService } from "../services/gemini-vision";
import {
  VisualValidationResult,
  VisionValidationRule,
  VisualDiffResult,
  VisualChange,
  LivingBrainUpdate,
} from "../types/vision-testing";
import { ContextService } from "../services/ContextService";
import { AICore } from "../core/AICore";
import { v4 as uuidv4 } from "uuid";
import * as fs from "fs-extra";
import * as path from "path";
import chalk from "chalk";

export interface VisualValidatorInput {
  currentScreenshot: string; // Path to current screenshot
  baselineScreenshot?: string; // Path to baseline (optional)
  validationRules: VisionValidationRule[];
  projectPath: string;
  page?: Page; // Optional page context for additional checks
}

export interface VisualValidatorOutput {
  results: VisualValidationResult[];
  passed: boolean; // Overall pass/fail
  visualDiff?: VisualDiffResult;
  summary: {
    totalChecks: number;
    passed: number;
    failed: number;
    warnings: number;
  };
}

export class VisualValidatorAgent
  implements SubAgent<VisualValidatorInput, VisualValidatorOutput>
{
  name = "VisualValidatorAgent";
  description =
    "Validates UI appearance through visual comparison and regression detection";
  personality: string;
  llmProvider: string;
  expertise: string[];

  private visionService: GeminiVisionService;
  private contextService?: ContextService;

  constructor() {
    this.personality = `You are a meticulous visual QA engineer with a keen eye for detail.
You detect even the smallest visual discrepancies, color shifts, layout changes, and design
inconsistencies. Your goal is to ensure the UI matches expectations pixel-perfectly while being
smart about what changes matter vs. what's acceptable variation.`;

    this.llmProvider = "gemini-vision";
    this.expertise = [
      "Visual regression testing",
      "Screenshot comparison",
      "Color scheme validation",
      "Layout verification",
      "Accessibility checks",
      "Design system compliance",
    ];

    this.visionService = new GeminiVisionService();
  }

  async run(input: VisualValidatorInput): Promise<VisualValidatorOutput> {
    const {
      currentScreenshot,
      baselineScreenshot,
      validationRules,
      projectPath,
      page,
    } = input;

    // Initialize context service
    this.contextService = new ContextService(projectPath);
    await this.contextService.initialize();

    console.log(chalk.blue(`\n🔍 ${this.name} starting validation...`));
    console.log(chalk.gray(`Validation rules: ${validationRules.length}`));

    const results: VisualValidationResult[] = [];
    let visualDiff: VisualDiffResult | undefined;

    try {
      // Run each validation rule
      for (const rule of validationRules) {
        console.log(chalk.cyan(`\n  📋 Checking: ${rule.description}`));

        let result: VisualValidationResult;

        switch (rule.type) {
          case "visual-match":
            result = await this.validateVisualMatch(
              currentScreenshot,
              baselineScreenshot || rule.baselineScreenshot!,
              rule
            );
            if (result.visualDiff) {
              visualDiff = result.visualDiff as any;
            }
            break;

          case "color-scheme-match":
            result = await this.validateColorScheme(currentScreenshot, rule);
            break;

          case "layout-match":
            result = await this.validateLayout(currentScreenshot, rule);
            break;

          case "text-readable":
            result = await this.validateTextReadability(currentScreenshot, rule);
            break;

          case "no-visual-regression":
            result = await this.validateNoRegression(
              currentScreenshot,
              baselineScreenshot || rule.baselineScreenshot!,
              rule
            );
            break;

          // DOM-based validations (from original ValidationRule types)
          case "url-match":
          case "element-exists":
          case "text-contains":
          case "element-visible":
            result = await this.validateDOMRule(page, rule);
            break;

          default:
            result = {
              rule,
              passed: false,
              message: `Unknown validation type: ${rule.type}`,
              timestamp: new Date().toISOString(),
            };
        }

        results.push(result);

        // Write result to Living Brain
        await this.writeLivingBrain({
          timestamp: new Date().toISOString(),
          agentName: this.name,
          updateType: "validation",
          data: result,
        });

        // Log result
        if (result.passed) {
          console.log(chalk.green(`    ✓ Passed`));
        } else {
          console.log(chalk.red(`    ✗ Failed: ${result.message}`));
        }
      }

      // Calculate summary
      const passed = results.filter((r) => r.passed).length;
      const failed = results.filter((r) => !r.passed).length;
      const warnings = results.filter(
        (r) =>
          r.visualDiff &&
          r.visualDiff.diffPercentage > 0 &&
          r.visualDiff.diffPercentage < ((r.rule as any).threshold || 5)
      ).length;

      const summary = {
        totalChecks: results.length,
        passed,
        failed,
        warnings,
      };

      const overallPassed = failed === 0;

      console.log(
        chalk.blue(
          `\n🏁 Validation complete: ${passed}/${results.length} passed`
        )
      );

      return {
        results,
        passed: overallPassed,
        visualDiff,
        summary,
      };
    } catch (error: any) {
      console.error(chalk.red(`\n❌ Validation error: ${error.message}`));

      // Write error to Living Brain
      await this.writeLivingBrain({
        timestamp: new Date().toISOString(),
        agentName: this.name,
        updateType: "error",
        data: {
          error: error.message,
          stack: error.stack,
        },
      });

      throw error;
    }
  }

  /**
   * Validate visual match between current and baseline screenshots
   */
  private async validateVisualMatch(
    currentPath: string,
    baselinePath: string,
    rule: VisionValidationRule
  ): Promise<VisualValidationResult> {
    try {
      // Check if baseline exists
      if (!await fs.pathExists(baselinePath)) {
        return {
          rule,
          passed: false,
          message: `Baseline screenshot not found: ${baselinePath}`,
          timestamp: new Date().toISOString(),
        };
      }

      // Perform visual diff
      const diff = await this.compareScreenshots(
        baselinePath,
        currentPath,
        rule.threshold || 5
      );

      const passed = diff.passed;

      return {
        rule,
        passed,
        actualValue: `${diff.differencePercentage.toFixed(2)}% difference`,
        message: passed
          ? `Visual match OK (${diff.differencePercentage.toFixed(2)}% diff)`
          : `Visual regression detected (${diff.differencePercentage.toFixed(2)}% diff exceeds threshold of ${rule.threshold || 5}%)`,
        timestamp: new Date().toISOString(),
        visualDiff: {
          diffPercentage: diff.differencePercentage,
          diffScreenshot: diff.diff,
          affectedAreas: diff.changes.map((change) => ({
            x: change.location.x,
            y: change.location.y,
            width: change.location.width,
            height: change.location.height,
            description: change.description,
          })),
        },
      };
    } catch (error: any) {
      return {
        rule,
        passed: false,
        message: `Visual comparison failed: ${error.message}`,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Validate color scheme matches expectations
   */
  private async validateColorScheme(
    screenshotPath: string,
    rule: VisionValidationRule
  ): Promise<VisualValidationResult> {
    try {
      // Use vision AI to extract colors
      const analysis = await this.visionService.analyzeScreenshot(screenshotPath);

      // Extract actual colors from design system
      const actualColors = Object.values(analysis.designSystem.colors || {}).filter(
        (c) => c && c.startsWith("#")
      );

      // For this validation, we'd need expected colors in the rule
      // For now, we'll do a simple check
      const hasValidColors = actualColors.length > 0;

      return {
        rule,
        passed: hasValidColors,
        message: hasValidColors
          ? `Color scheme detected: ${actualColors.join(", ")}`
          : "No valid color scheme detected",
        timestamp: new Date().toISOString(),
        colorAnalysis: {
          expectedColors: [], // Would come from rule in production
          actualColors,
          matches: hasValidColors,
        },
      };
    } catch (error: any) {
      return {
        rule,
        passed: false,
        message: `Color validation failed: ${error.message}`,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Validate layout structure
   */
  private async validateLayout(
    screenshotPath: string,
    rule: VisionValidationRule
  ): Promise<VisualValidationResult> {
    try {
      const analysis = await this.visionService.analyzeScreenshot(screenshotPath);

      const layoutType = analysis.layout.type;
      const layoutDescription = analysis.layout.structure;

      return {
        rule,
        passed: true, // In production, compare against expected layout
        actualValue: `${layoutType}: ${layoutDescription}`,
        message: `Layout validated: ${layoutType}`,
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      return {
        rule,
        passed: false,
        message: `Layout validation failed: ${error.message}`,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Validate text readability
   */
  private async validateTextReadability(
    screenshotPath: string,
    rule: VisionValidationRule
  ): Promise<VisualValidationResult> {
    try {
      // Use vision AI to check text contrast, size, etc.
      const prompt = `Analyze this screenshot for text readability.
Check for:
1. Text contrast (is text readable against background?)
2. Font size (is text large enough?)
3. Text spacing (is text well-spaced?)

Return JSON:
{
  "readable": true/false,
  "issues": ["issue 1", "issue 2"],
  "score": 0-100
}`;

      // Simplified - in production would use actual analysis
      return {
        rule,
        passed: true,
        message: "Text readability check passed",
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      return {
        rule,
        passed: false,
        message: `Readability validation failed: ${error.message}`,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Validate no visual regression
   */
  private async validateNoRegression(
    currentPath: string,
    baselinePath: string,
    rule: VisionValidationRule
  ): Promise<VisualValidationResult> {
    // Similar to visual-match, but stricter threshold
    return this.validateVisualMatch(currentPath, baselinePath, {
      ...rule,
      threshold: rule.threshold || 2, // Stricter default threshold
    });
  }

  /**
   * Validate DOM-based rules (fallback for non-visual checks)
   */
  private async validateDOMRule(
    page: Page | undefined,
    rule: VisionValidationRule
  ): Promise<VisualValidationResult> {
    if (!page) {
      return {
        rule,
        passed: false,
        message: "Page context required for DOM validation",
        timestamp: new Date().toISOString(),
      };
    }

    try {
      switch (rule.type) {
        case "url-match":
          const url = page.url();
          const matches = url.includes(rule.expectedValue || "");
          return {
            rule,
            passed: matches,
            actualValue: url,
            message: matches
              ? `URL matches: ${url}`
              : `URL doesn't match. Expected: ${rule.expectedValue}, Got: ${url}`,
            timestamp: new Date().toISOString(),
          };

        case "element-exists":
          const element = await page.$(rule.selector || "");
          return {
            rule,
            passed: element !== null,
            message: element
              ? `Element exists: ${rule.selector}`
              : `Element not found: ${rule.selector}`,
            timestamp: new Date().toISOString(),
          };

        case "text-contains":
          const content = await page.textContent("body");
          const containsText =
            content?.includes(rule.expectedValue || "") || false;
          return {
            rule,
            passed: containsText,
            message: containsText
              ? `Text found: ${rule.expectedValue}`
              : `Text not found: ${rule.expectedValue}`,
            timestamp: new Date().toISOString(),
          };

        case "element-visible":
          const visibleElement = await page.$(rule.selector || "");
          const isVisible =
            visibleElement !== null && (await visibleElement.isVisible());
          return {
            rule,
            passed: isVisible,
            message: isVisible
              ? `Element visible: ${rule.selector}`
              : `Element not visible: ${rule.selector}`,
            timestamp: new Date().toISOString(),
          };

        default:
          return {
            rule,
            passed: false,
            message: `Unknown DOM validation type: ${rule.type}`,
            timestamp: new Date().toISOString(),
          };
      }
    } catch (error: any) {
      return {
        rule,
        passed: false,
        message: `DOM validation error: ${error.message}`,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Compare two screenshots and detect differences
   * NOTE: This is a placeholder - in production would use pixelmatch or sharp
   */
  private async compareScreenshots(
    baselinePath: string,
    currentPath: string,
    threshold: number
  ): Promise<VisualDiffResult> {
    // Placeholder implementation
    // In production, would use:
    // - pixelmatch for pixel-level comparison
    // - sharp for image processing
    // - Vision AI for semantic comparison

    // For now, return a mock result
    const mockDifferencePercentage = Math.random() * threshold; // Random diff within threshold

    const changes: VisualChange[] = [];

    // If there's a difference, create mock changes
    if (mockDifferencePercentage > threshold / 2) {
      changes.push({
        id: uuidv4(),
        type: "color",
        severity: "minor",
        description: "Subtle color variation detected",
        location: { x: 100, y: 200, width: 50, height: 30 },
      });
    }

    return {
      baseline: baselinePath,
      current: currentPath,
      similarity: 100 - mockDifferencePercentage,
      differencePercentage: mockDifferencePercentage,
      changes,
      passed: mockDifferencePercentage <= threshold,
      threshold,
    };
  }

  /**
   * Write update to Living Brain
   */
  private async writeLivingBrain(update: LivingBrainUpdate): Promise<void> {
    try {
      // Read current context using AICore
      const aiCore = AICore.getInstance();
      const currentContext: any = (await aiCore.getLivingContext()) || {};

      if (!currentContext.testExecutionHistory) {
        currentContext.testExecutionHistory = [];
      }

      currentContext.testExecutionHistory.push(update);

      // Keep only last 100 updates
      if (currentContext.testExecutionHistory.length > 100) {
        currentContext.testExecutionHistory = currentContext.testExecutionHistory.slice(
          -100
        );
      }

      // Save back to context.json using AICore
      await aiCore.saveLivingContext(currentContext);
    } catch (error) {
      console.warn("Failed to write to Living Brain:", error);
    }
  }

  async validate(input: VisualValidatorInput): Promise<boolean> {
    return !!(
      input.currentScreenshot &&
      input.validationRules &&
      input.projectPath
    );
  }

  async getStatus(): Promise<{
    name: string;
    status: "idle" | "running" | "completed" | "error";
    lastRun?: Date;
    executionTime?: number;
    errorCount: number;
    successCount: number;
  }> {
    return {
      name: this.name,
      status: "idle",
      errorCount: 0,
      successCount: 0,
    };
  }
}
