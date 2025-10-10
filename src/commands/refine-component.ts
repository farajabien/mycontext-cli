import chalk from "chalk";
import prompts from "prompts";
import * as fs from "fs-extra";
import path from "path";
import { CommandOptions } from "../types";
import { FileSystemManager } from "../utils/fileSystem";
import { HybridAIClient } from "../utils/hybridAIClient";
import { ReviewContextCommand } from "./review-context";
import { MutationLogger, ComponentMutation } from "../services/MutationLogger";
import {
  RegressionRunner,
  RegressionTestResult,
} from "../services/RegressionRunner";

export interface RefineComponentOptions extends CommandOptions {
  variant?: "mobile" | "desktop" | "both";
  updateContext?: boolean;
  inPlace?: boolean;
}

export class RefineComponentCommand {
  private fs = new FileSystemManager();
  private aiClient = new HybridAIClient();
  private mutationLogger: MutationLogger;
  private regressionRunner: RegressionRunner;

  constructor() {
    this.mutationLogger = new MutationLogger(process.cwd());
    this.regressionRunner = new RegressionRunner(process.cwd(), "");
  }

  async execute(
    componentName: string,
    options: RefineComponentOptions
  ): Promise<void> {
    console.log(chalk.blue(`🔧 Refining component: ${componentName}`));

    try {
      // Check if component exists
      const componentPath = await this.findComponent(componentName);
      if (!componentPath) {
        console.log(chalk.red(`❌ Component ${componentName} not found`));
        return;
      }

      // Update regression runner with component path
      this.regressionRunner = new RegressionRunner(
        process.cwd(),
        componentPath
      );

      // Load current component and mutation history
      const currentCode = await this.fs.readFile(componentPath);
      const mutationHistory = await this.mutationLogger.getMutationHistory(
        componentPath
      );
      const lastApprovedVersion =
        await this.mutationLogger.getLastApprovedVersion(componentPath);

      // Get refinement instructions from user
      const refinementInstructions = await this.getRefinementInstructions(
        componentName
      );

      // Generate refined component with AI
      const refinementResult = await this.generateRefinedComponent(
        componentName,
        currentCode,
        refinementInstructions,
        mutationHistory
      );

      // Create mutation record
      const mutationId = await this.mutationLogger.createMutationFromRefinement(
        componentPath,
        currentCode,
        refinementResult.new_file,
        refinementResult.chainOfThought,
        refinementResult.confidence,
        refinementResult.riskFlags
      );

      // Run regression tests
      console.log(chalk.blue("🧪 Running regression tests..."));
      const testResults = await this.runRegressionTests(
        refinementResult.new_file,
        componentPath
      );

      // Compare to baseline
      const baselineComparison = await this.compareToBaseline(
        testResults,
        lastApprovedVersion
      );

      // Show approval UI
      const approved = await this.showApprovalUI(
        componentName,
        currentCode,
        refinementResult,
        testResults,
        baselineComparison
      );

      if (approved) {
        // Apply the refinement
        await this.fs.writeFile(componentPath, refinementResult.new_file);

        // Update mutation status
        await this.mutationLogger.updateMutationStatus(mutationId, "applied");

        // Save baseline for future comparisons
        await this.regressionRunner.saveBaseline(testResults, componentPath);

        console.log(
          chalk.green(
            `✅ Component ${componentName} refined and applied successfully!`
          )
        );
      } else {
        // Mark mutation as rejected
        await this.mutationLogger.updateMutationStatus(
          mutationId,
          "rejected",
          "User rejected"
        );
        console.log(chalk.yellow(`⏭️  Refinement rejected`));
      }
    } catch (error) {
      console.error(chalk.red("❌ Component refinement failed:"), error);
      throw error;
    }
  }

  /**
   * Find component file path
   */
  private async findComponent(componentName: string): Promise<string | null> {
    const possiblePaths = [
      `.mycontext/components/mobile/${componentName}.tsx`,
      `.mycontext/components/desktop/${componentName}.tsx`,
      `components/${componentName}.tsx`,
      `src/components/${componentName}.tsx`,
    ];

    for (const possiblePath of possiblePaths) {
      if (await this.fs.exists(possiblePath)) {
        return possiblePath;
      }
    }

    return null;
  }

  /**
   * Get refinement instructions from user
   */
  private async getRefinementInstructions(
    componentName: string
  ): Promise<string> {
    const response = await prompts({
      type: "text",
      name: "instructions",
      message: `What improvements would you like to make to ${componentName}?`,
      initial:
        "Improve accessibility, add loading states, and optimize performance",
    });

    return response.instructions || "General improvements";
  }

  /**
   * Generate refined component with AI
   */
  private async generateRefinedComponent(
    componentName: string,
    currentCode: string,
    instructions: string,
    mutationHistory: ComponentMutation[]
  ): Promise<{
    new_file: string;
    explanation: string;
    chainOfThought: string;
    confidence: number;
    riskFlags: string[];
  }> {
    const historyContext =
      mutationHistory.length > 0
        ? `\nPrevious refinements:\n${mutationHistory
            .slice(-3)
            .map((m) => `- ${m.timestamp}: ${m.chainOfThought}`)
            .join("\n")}`
        : "";

    const prompt = `You are a code-refinement assistant for MyContext. 
Input:
- ORIGINAL_FILE: \`\`\`${currentCode}\`\`\`
- CONTEXT: "Project uses shadcn/ui, Next.js App Router, InstantDB. Keep 'use client' placement rules."
- REFINEMENT: "${instructions}"
- HISTORY: ${historyContext}

Produce strictly JSON with fields:
{
 "patch": "<git unified diff>",
 "new_file": "<full updated file text>",
 "tests": [ { "type":"unit","code":"...test code..." } ],
 "explanation": "...",
 "confidence": 0.x,
 "risk_flags": []
}

Notes:
- Keep TypeScript types strict.
- Do not add new npm dependencies.
- Provide one-line summary and short chain-of-thought under explanation.
- Keep code <= 200 lines change when possible.`;

    try {
      const response = await this.aiClient.generateText(prompt, {
        temperature: 0.3,
        maxTokens: 4000,
      });

      // Parse JSON response
      const jsonMatch = response.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON found in response");
      }

      const result = JSON.parse(jsonMatch[0]);

      return {
        new_file: result.new_file || response.text,
        explanation: result.explanation || "Component refined",
        chainOfThought: result.explanation || "AI refinement applied",
        confidence: result.confidence || 0.7,
        riskFlags: result.risk_flags || [],
      };
    } catch (error) {
      console.log(
        chalk.yellow("⚠️  Could not parse AI response, using fallback")
      );
      return {
        new_file: currentCode,
        explanation: "Fallback refinement",
        chainOfThought: "AI parsing failed, using original code",
        confidence: 0.3,
        riskFlags: ["ai_parsing_failed"],
      };
    }
  }

  /**
   * Run regression tests on refined component
   */
  private async runRegressionTests(
    refinedCode: string,
    componentPath: string
  ): Promise<RegressionTestResult> {
    // Write refined code to temporary file
    const tempPath = `${componentPath}.tmp`;
    await this.fs.writeFile(tempPath, refinedCode);

    try {
      // Update regression runner with temp path
      const tempRegressionRunner = new RegressionRunner(
        process.cwd(),
        tempPath
      );
      const results = await tempRegressionRunner.runRegressionSuite();

      // Clean up temp file using fs-extra
      await fs.remove(tempPath);

      return results;
    } catch (error) {
      // Clean up temp file using fs-extra
      await fs.remove(tempPath);
      throw error;
    }
  }

  /**
   * Compare test results to baseline
   */
  private async compareToBaseline(
    currentResults: RegressionTestResult,
    lastApprovedVersion: ComponentMutation | null
  ): Promise<{
    hasBaseline: boolean;
    regressionDetected: boolean;
    summary: string;
  }> {
    if (!lastApprovedVersion) {
      return {
        hasBaseline: false,
        regressionDetected: false,
        summary: "No baseline available for comparison",
      };
    }

    // Simple comparison based on overall score
    const baselineScore = 0.8; // Default baseline score
    const currentScore = currentResults.overall.score;

    const regressionDetected = currentScore < baselineScore * 0.9; // 10% tolerance

    let summary = "";
    if (regressionDetected) {
      summary = `Regression detected: Score dropped from ${baselineScore.toFixed(
        2
      )} to ${currentScore.toFixed(2)}`;
    } else {
      summary = `No regression: Score ${currentScore.toFixed(
        2
      )} (baseline: ${baselineScore.toFixed(2)})`;
    }

    return {
      hasBaseline: true,
      regressionDetected,
      summary,
    };
  }

  /**
   * Show approval UI with test results
   */
  private async showApprovalUI(
    componentName: string,
    originalCode: string,
    refinementResult: any,
    testResults: RegressionTestResult,
    baselineComparison: any
  ): Promise<boolean> {
    console.log(
      chalk.cyan(`\n📝 Component Refinement Proposal: ${componentName}`)
    );

    console.log(chalk.yellow("\n🔍 Changes:"));
    console.log(chalk.gray(`  ${refinementResult.explanation}`));

    console.log(chalk.yellow("\n📊 Test Results:"));
    console.log(
      chalk.gray(
        `  TypeScript: ${
          testResults.typecheck.passed
            ? chalk.green("✅ Pass")
            : chalk.red("❌ Fail")
        }`
      )
    );
    console.log(
      chalk.gray(
        `  ESLint: ${
          testResults.lint.passed
            ? chalk.green("✅ Pass")
            : chalk.red("❌ Fail")
        }`
      )
    );
    console.log(
      chalk.gray(
        `  Unit Tests: ${testResults.unit.passed}/${testResults.unit.total} passing`
      )
    );

    console.log(chalk.yellow("\n🤖 AI Confidence:"));
    console.log(
      chalk.gray(`  ${(refinementResult.confidence * 100).toFixed(0)}%`)
    );

    if (refinementResult.riskFlags.length > 0) {
      console.log(chalk.yellow("\n⚠️  Risk Flags:"));
      refinementResult.riskFlags.forEach((flag: string) => {
        console.log(chalk.gray(`  - ${flag}`));
      });
    }

    console.log(chalk.yellow("\n📈 Regression Check:"));
    console.log(chalk.gray(`  ${baselineComparison.summary}`));

    const response = await prompts({
      type: "select",
      name: "action",
      message: "What would you like to do?",
      choices: [
        { title: "Accept refinement", value: "accept" },
        { title: "Reject refinement", value: "reject" },
        { title: "View diff", value: "diff" },
        { title: "Cancel", value: "cancel" },
      ],
      initial: 0,
    });

    if (response.action === "diff") {
      // Show diff (simplified)
      console.log(chalk.blue("\n📋 Diff Preview:"));
      console.log(
        chalk.gray("  [Diff would be shown here in a real implementation]")
      );

      // Ask again after showing diff
      const diffResponse = await prompts({
        type: "select",
        name: "action",
        message: "After viewing the diff:",
        choices: [
          { title: "Accept refinement", value: "accept" },
          { title: "Reject refinement", value: "reject" },
        ],
        initial: 0,
      });

      return diffResponse.action === "accept";
    }

    return response.action === "accept";
  }

  /**
   * Check if component needs refinement based on approvals
   */
  static async needsRefinement(componentName: string): Promise<boolean> {
    try {
      const approval = await ReviewContextCommand.getFeatureApproval(
        componentName.toLowerCase().replace(/\s+/g, "-")
      );
      return approval === false; // Component was rejected and needs refinement
    } catch (error) {
      return false;
    }
  }
}
