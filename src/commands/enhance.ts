#!/usr/bin/env node

import { Command } from "commander";
import chalk from "chalk";
import fs from "fs-extra";
import path from "path";
import { EnhancedSpinner } from "../utils/spinner";
import { EnhancementAgent } from "../agents/implementations/EnhancementAgent";
import { ContextLoader } from "../utils/contextLoader";
import { getAgentClient } from "../utils/aiClientFactory";
// import { usageTracker } from "../../lib/analytics/usage-tracker";

export interface EnhancementOptions {
  prompt: string;
  temperature?: number;
  maxTokens?: number;
  verbose?: boolean;
  debug?: boolean;
  output?: string;
  // NEW: Refinement-specific options
  interactive?: boolean; // VS Code extension mode
  outputFormat?: "default" | "structured" | "diff" | "preview";
  showChanges?: boolean; // Show detailed changes
  preserveHistory?: boolean; // Keep enhancement history
}

export class EnhanceCommand {
  private enhancementAgent: EnhancementAgent;
  private useAgentSDK: boolean = true; // NEW: Use Agent SDK by default

  constructor() {
    this.enhancementAgent = new EnhancementAgent();
  }

  async execute(target: string, options: EnhancementOptions): Promise<void> {
    const spinner = new EnhancedSpinner("Initializing enhancement...");

    try {
      spinner.start();

      // Load project context for better enhancements
      const contextLoader = new ContextLoader();
      const projectContext = await contextLoader.loadProjectContext({
        verbose: options.verbose || false,
        required: false
      });

      if (options.verbose) {
        const summary = contextLoader.getContextSummary(projectContext);
        console.log(chalk.gray(`📁 Context: ${summary}`));
      }

      // Validate target
      if (!target) {
        throw new Error("Target component or group is required");
      }

      // Check if target is a file or group
      const isFile = target.endsWith(".tsx") || target.endsWith(".jsx");
      const isGroup = !isFile && !target.includes(".");

      if (isFile) {
        await this.enhanceSingleComponent(target, options, spinner);
      } else if (isGroup) {
        await this.enhanceComponentGroup(target, options, spinner);
      } else {
        throw new Error(
          "Target must be a component file (.tsx/.jsx) or component group"
        );
      }

      spinner.succeed("Enhancement completed successfully!");
      this.printNextCommands();
    } catch (error) {
      spinner.fail("Enhancement failed");
      console.error(chalk.red("❌ Error:"), error);
      process.exit(1);
    }
  }

  /**
   * NEW: Enhance component using Agent SDK with refactoring agent
   */
  private async enhanceWithAgentSDK(
    componentCode: string,
    componentName: string,
    prompt: string,
    options: EnhancementOptions,
    spinner: EnhancedSpinner
  ): Promise<any> {
    // Get Agent SDK client
    const agentClient = await getAgentClient();

    // Build context for enhancement
    const enhancementPrompt = `
Refactor and enhance the following React component:

Component Name: ${componentName}

Current Code:
\`\`\`tsx
${componentCode}
\`\`\`

Enhancement Requirements:
${prompt}

Please provide:
1. Enhanced component code with improvements
2. List of changes made
3. Quality score (0-100)
4. Accessibility suggestions
5. Performance suggestions

Focus on:
- Clean code principles
- React best practices
- TypeScript type safety
- Performance optimizations
- Accessibility improvements
`;

    // Use refactoring agent with streaming
    spinner.updateText('🤖 Using refactoring agent...');

    const result = await agentClient.useAgent(
      'refactoring',
      enhancementPrompt,
      {
        workingDirectory: process.cwd(),
      },
      {
        model: 'claude-3-5-sonnet-20241022',
        temperature: options.temperature || 0.2,
        maxTokens: options.maxTokens || 4000,
      }
    );

    // Parse the response
    const enhancedCode = this.extractCodeFromResponse(result.content);
    const changes = this.parseChangesFromResponse(result.content);
    const score = this.parseScoreFromResponse(result.content);
    const suggestions = this.parseSuggestionsFromResponse(result.content);

    return {
      enhancedComponent: enhancedCode || componentCode,
      originalComponent: componentCode,
      validation: {
        score: score,
        isValid: true,
        errors: [],
        warnings: [],
      },
      changes: {
        totalChanges: changes.length,
        addedLines: changes.filter((c: any) => c.type === 'add').length,
        removedLines: changes.filter((c: any) => c.type === 'remove').length,
        modifiedLines: changes.filter((c: any) => c.type === 'modify').length,
      },
      suggestions: {
        accessibility: suggestions.accessibility || [],
        performance: suggestions.performance || [],
      },
    };
  }

  /**
   * Extract code from agent response
   */
  private extractCodeFromResponse(response: string): string | null {
    const codeBlockMatch = response.match(/```(?:tsx?|typescript|jsx?)\n([\s\S]*?)\n```/);
    return codeBlockMatch ? codeBlockMatch[1] : null;
  }

  /**
   * Parse changes from response
   */
  private parseChangesFromResponse(response: string): any[] {
    const changes: any[] = [];
    const changesSection = response.match(/changes made:?\n([\s\S]*?)(?:\n\n|quality score)/i);

    if (changesSection) {
      const lines = changesSection[1].split('\n');
      lines.forEach(line => {
        if (line.trim().startsWith('-') || line.trim().startsWith('•')) {
          changes.push({ type: 'modify', description: line.trim().substring(1).trim() });
        }
      });
    }

    return changes;
  }

  /**
   * Parse quality score from response
   */
  private parseScoreFromResponse(response: string): number {
    const scoreMatch = response.match(/quality score:?\s*(\d+)/i);
    return scoreMatch ? parseInt(scoreMatch[1]) : 85;
  }

  /**
   * Parse suggestions from response
   */
  private parseSuggestionsFromResponse(response: string): any {
    const accessibilityMatch = response.match(/accessibility suggestions?:?\n([\s\S]*?)(?:\n\n|performance)/i);
    const performanceMatch = response.match(/performance suggestions?:?\n([\s\S]*?)(?:\n\n|$)/i);

    const parseSuggestions = (text: string | undefined): string[] => {
      if (!text) return [];
      return text.split('\n')
        .map(line => line.trim())
        .filter(line => line.startsWith('-') || line.startsWith('•'))
        .map(line => line.substring(1).trim());
    };

    return {
      accessibility: parseSuggestions(accessibilityMatch?.[1]),
      performance: parseSuggestions(performanceMatch?.[1]),
    };
  }

  private printNextCommands(): void {
    try {
      console.log("");
      console.log(chalk.blue("➡️ Next commands:"));
      console.log(chalk.gray("   mycontext preview components"));
      console.log(chalk.gray("   mycontext normalize preview"));
      console.log(chalk.gray("   mycontext refine <component> --apply"));
      console.log(chalk.gray("   mycontext enhance <group>"));
      console.log("");
    } catch {}
  }

  private async enhanceSingleComponent(
    componentPath: string,
    options: EnhancementOptions,
    spinner: EnhancedSpinner
  ): Promise<void> {
    spinner.updateText("Reading component file...");

    // Read component file
    const fullPath = path.resolve(componentPath);
    if (!(await fs.pathExists(fullPath))) {
      throw new Error(`Component file not found: ${componentPath}`);
    }

    const componentCode = await fs.readFile(fullPath, "utf-8");
    const componentName = path.basename(fullPath, path.extname(fullPath));

    // Get enhancement prompt
    const prompt = await this.getEnhancementPrompt(options);

    spinner.updateText("Enhancing component with Agent SDK...");

    let result;

    // NEW: Try Agent SDK first
    if (this.useAgentSDK) {
      try {
        result = await this.enhanceWithAgentSDK(
          componentCode,
          componentName,
          prompt,
          options,
          spinner
        );
      } catch (error) {
        console.log(chalk.yellow('⚠️  Agent SDK failed, falling back to standard enhancement'));
        // Fallback to standard enhancement
        result = await this.enhancementAgent.run({
          currentComponent: componentCode,
          userPrompt: prompt,
          designContext: this.extractDesignContext(componentCode),
          constraints: {
            maxDependencies: 5,
            targetFramework: "react",
            uiLibrary: "shadcn",
          },
        });
      }
    } else {
      // Use standard enhancement agent
      result = await this.enhancementAgent.run({
        currentComponent: componentCode,
        userPrompt: prompt,
        designContext: this.extractDesignContext(componentCode),
        constraints: {
          maxDependencies: 5,
          targetFramework: "react",
          uiLibrary: "shadcn",
        },
      });
    }

    // Track usage
    await this.trackEnhancementUsage(
      componentName,
      "single",
      result.validation.score
    );

    // Save enhanced component
    const outputPath = options.output || fullPath;
    await fs.writeFile(outputPath, result.enhancedComponent);

    // Display results
    if (options.interactive || options.outputFormat === "structured") {
      // Return structured output for VS Code extension
      return this.generateStructuredOutput(result, componentName, options);
    } else {
      this.displayEnhancementResults(result, componentName);
    }

    spinner.updateText("Enhancement completed!");
  }

  private async enhanceComponentGroup(
    groupName: string,
    options: EnhancementOptions,
    spinner: EnhancedSpinner
  ): Promise<void> {
    spinner.updateText("Reading component group...");

    // Find component group directory
    const groupDir = path.join("components", "generated", groupName);
    if (!(await fs.pathExists(groupDir))) {
      throw new Error(`Component group not found: ${groupName}`);
    }

    // Get all component files in group
    const files = await fs.readdir(groupDir);
    const componentFiles = files.filter(
      (file) => file.endsWith(".tsx") && !file.endsWith(".d.ts")
    );

    if (componentFiles.length === 0) {
      throw new Error(`No component files found in group: ${groupName}`);
    }

    // Get enhancement prompt
    const prompt = await this.getEnhancementPrompt(options);

    spinner.updateText(`Enhancing ${componentFiles.length} components...`);

    let totalScore = 0;
    let enhancedCount = 0;

    // Enhance each component
    for (const file of componentFiles) {
      try {
        const filePath = path.join(groupDir, file);
        const componentCode = await fs.readFile(filePath, "utf-8");
        const componentName = path.basename(file, ".tsx");

        spinner.updateText(`Enhancing ${componentName}...`);

        const result = await this.enhancementAgent.run({
          currentComponent: componentCode,
          userPrompt: prompt,
          designContext: this.extractDesignContext(componentCode),
          constraints: {
            maxDependencies: 5,
            targetFramework: "react",
            uiLibrary: "shadcn",
          },
        });

        // Save enhanced component
        await fs.writeFile(filePath, result.enhancedComponent);

        totalScore += result.validation.score;
        enhancedCount++;

        // Track usage
        await this.trackEnhancementUsage(
          componentName,
          "group",
          result.validation.score
        );
      } catch (error) {
        console.warn(chalk.yellow(`⚠️  Failed to enhance ${file}:`), error);
      }
    }

    // Display group results
    const averageScore = enhancedCount > 0 ? totalScore / enhancedCount : 0;
    this.displayGroupResults(
      enhancedCount,
      componentFiles.length,
      averageScore
    );

    spinner.updateText(
      `Enhanced ${enhancedCount}/${componentFiles.length} components`
    );
  }

  private async getEnhancementPrompt(
    options: EnhancementOptions
  ): Promise<string> {
    if (options.prompt) {
      return options.prompt;
    }

    // Interactive prompt
    const readline = require("readline");
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    return new Promise((resolve) => {
      rl.question(
        chalk.blue("Enter enhancement prompt: "),
        (answer: string) => {
          rl.close();
          resolve(
            answer.trim() ||
              "Enhance this component with modern design patterns"
          );
        }
      );
    });
  }

  private extractDesignContext(componentCode: string): any {
    // Simple extraction of design context from component
    const colors =
      componentCode.match(
        /(?:bg-|text-|border-)([a-z]+-\d+|primary|secondary|accent)/g
      ) || [];
    const spacing =
      componentCode.match(/(?:p-|m-|gap-)(\d+|xs|sm|md|lg|xl)/g) || [];

    return {
      colors: [...new Set(colors.map((c: string) => c.split("-")[1]))],
      spacing: spacing.length > 0 ? spacing[0]?.split("-")[1] || "md" : "md",
      typography: "inter",
      interactions: ["hover", "click"],
    };
  }

  private async trackEnhancementUsage(
    componentName: string,
    type: "single" | "group",
    qualityScore: number
  ): Promise<void> {
    try {
      console.log(chalk.gray(`📊 Usage tracking disabled`));
    } catch (error) {
      console.warn(chalk.yellow("⚠️  Failed to track usage:"), error);
    }
  }

  private displayEnhancementResults(result: any, componentName: string): void {
    console.log(chalk.green(`\n✅ Enhanced ${componentName}`));
    console.log(chalk.gray(`Quality Score: ${result.validation.score}/100`));

    if (result.changes.totalChanges > 0) {
      console.log(
        chalk.gray(`Changes: ${result.changes.totalChanges} lines modified`)
      );
    }

    if (result.suggestions.accessibility.length > 0) {
      console.log(chalk.yellow("\n🔍 Accessibility Suggestions:"));
      result.suggestions.accessibility.forEach((suggestion: string) => {
        console.log(chalk.gray(`  • ${suggestion}`));
      });
    }

    if (result.suggestions.performance.length > 0) {
      console.log(chalk.blue("\n⚡ Performance Suggestions:"));
      result.suggestions.performance.forEach((suggestion: string) => {
        console.log(chalk.gray(`  • ${suggestion}`));
      });
    }

    console.log(
      chalk.gray(
        `\n💳 Credits used: ${this.calculateCredits(result.validation.score)}`
      )
    );
  }

  private displayGroupResults(
    enhancedCount: number,
    totalCount: number,
    averageScore: number
  ): void {
    console.log(
      chalk.green(`\n✅ Enhanced ${enhancedCount}/${totalCount} components`)
    );
    console.log(
      chalk.gray(`Average Quality Score: ${averageScore.toFixed(1)}/100`)
    );

    if (enhancedCount < totalCount) {
      console.log(
        chalk.yellow(
          `⚠️  ${totalCount - enhancedCount} components failed to enhance`
        )
      );
    }

    const totalCredits = this.calculateCredits(averageScore) * enhancedCount;
    console.log(chalk.gray(`\n💳 Total credits used: ${totalCredits}`));
  }

  private calculateCredits(qualityScore: number): number {
    // Credit calculation based on quality score
    if (qualityScore >= 90) return 3;
    if (qualityScore >= 80) return 2;
    if (qualityScore >= 70) return 1;
    return 1; // Minimum credit cost
  }

  /**
   * Generate structured output for VS Code extension
   */
  private generateStructuredOutput(
    result: any,
    componentName: string,
    options: EnhancementOptions
  ): any {
    const structuredOutput = {
      success: true,
      componentName,
      enhancedCode: result.enhancedComponent,
      originalCode: result.originalComponent || "",
      changes: {
        totalChanges: result.changes.totalChanges,
        addedLines: result.changes.addedLines,
        removedLines: result.changes.removedLines,
        modifiedLines: result.changes.modifiedLines,
      },
      validation: {
        score: result.validation.score,
        isValid: result.validation.isValid,
        errors: result.validation.errors,
        warnings: result.validation.warnings,
      },
      suggestions: result.suggestions,
      metadata: {
        executionTime: Date.now(),
        model: "mycontext-enhancement",
        temperature: options.temperature,
        maxTokens: options.maxTokens,
      },
    };

    // Output based on format
    switch (options.outputFormat) {
      case "diff":
        return this.generateDiffOutput(structuredOutput);
      case "preview":
        return this.generatePreviewOutput(structuredOutput);
      case "structured":
      default:
        return structuredOutput;
    }
  }

  /**
   * Generate diff output for side-by-side comparison
   */
  private generateDiffOutput(structuredOutput: any): any {
    return {
      ...structuredOutput,
      diff: {
        unified: this.generateUnifiedDiff(
          structuredOutput.originalCode,
          structuredOutput.enhancedCode
        ),
        sideBySide: this.generateSideBySideDiff(
          structuredOutput.originalCode,
          structuredOutput.enhancedCode
        ),
      },
    };
  }

  /**
   * Generate preview output for component rendering
   */
  private generatePreviewOutput(structuredOutput: any): any {
    return {
      ...structuredOutput,
      preview: {
        canRender: this.canRenderComponent(structuredOutput.enhancedCode),
        dependencies: this.extractDependencies(structuredOutput.enhancedCode),
        props: this.extractComponentProps(structuredOutput.enhancedCode),
        warnings: this.extractRenderWarnings(structuredOutput.enhancedCode),
      },
    };
  }

  /**
   * Generate unified diff format
   */
  private generateUnifiedDiff(original: string, enhanced: string): string {
    // Simple diff implementation - in production, use a proper diff library
    const originalLines = original.split("\n");
    const enhancedLines = enhanced.split("\n");

    let diff = "";
    let i = 0,
      j = 0;

    while (i < originalLines.length || j < enhancedLines.length) {
      if (
        i < originalLines.length &&
        j < enhancedLines.length &&
        originalLines[i] === enhancedLines[j]
      ) {
        diff += ` ${originalLines[i]}\n`;
        i++;
        j++;
      } else if (i < originalLines.length) {
        diff += `-${originalLines[i]}\n`;
        i++;
      } else if (j < enhancedLines.length) {
        diff += `+${enhancedLines[j]}\n`;
        j++;
      }
    }

    return diff;
  }

  /**
   * Generate side-by-side diff format
   */
  private generateSideBySideDiff(original: string, enhanced: string): any {
    const originalLines = original.split("\n");
    const enhancedLines = enhanced.split("\n");

    const maxLines = Math.max(originalLines.length, enhancedLines.length);
    const sideBySide = [];

    for (let i = 0; i < maxLines; i++) {
      const originalLine = originalLines[i] || "";
      const enhancedLine = enhancedLines[i] || "";
      const isModified = originalLine !== enhancedLine;

      sideBySide.push({
        lineNumber: i + 1,
        original: originalLine,
        enhanced: enhancedLine,
        modified: isModified,
        type: isModified ? "modified" : "unchanged",
      });
    }

    return sideBySide;
  }

  /**
   * Check if component can be rendered
   */
  private canRenderComponent(code: string): boolean {
    // Basic validation - check for common React patterns
    const hasExport =
      /export\s+(default\s+)?function|export\s+(default\s+)?const|export\s+class/.test(
        code
      );
    const hasReturn = /return\s*\(/.test(code);
    const hasJSX = /<[A-Z][a-zA-Z]*/.test(code);

    return hasExport && hasReturn && hasJSX;
  }

  /**
   * Extract component dependencies
   */
  private extractDependencies(code: string): string[] {
    const imports = code.match(/import\s+.*?\s+from\s+['"]([^'"]+)['"]/g) || [];
    return imports
      .map((imp) => {
        const match = imp.match(/from\s+['"]([^'"]+)['"]/);
        return match ? match[1] : "";
      })
      .filter(Boolean);
  }

  /**
   * Extract component props interface
   */
  private extractComponentProps(code: string): any {
    const propsMatch = code.match(/interface\s+(\w+)Props\s*\{([^}]+)\}/);
    if (!propsMatch) return null;

    const propsText = propsMatch[2];
    const props = propsText
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("/") && !line.startsWith("*"))
      .map((line) => {
        const propMatch = line.match(/(\w+)\??:\s*(.+?)(?:;|$)/);
        if (propMatch) {
          return {
            name: propMatch[1],
            type: propMatch[2].trim(),
            required: !line.includes("?"),
          };
        }
        return null;
      })
      .filter(Boolean);

    return props;
  }

  /**
   * Extract render warnings
   */
  private extractRenderWarnings(code: string): string[] {
    const warnings = [];

    // Check for common issues
    if (!code.includes("useState") && code.includes("setState")) {
      warnings.push("Component uses setState but no useState hook found");
    }

    if (code.includes("useEffect") && !code.includes("dependencies")) {
      warnings.push("useEffect missing dependency array");
    }

    if (code.includes("onClick") && !code.includes("aria-label")) {
      warnings.push("Interactive element missing accessibility label");
    }

    return warnings;
  }
}

// CLI command setup
const enhanceCommand = new EnhanceCommand();

export const enhance = new Command("enhance")
  .description("Enhance React components with AI-powered improvements")
  .argument("<target>", "Component file (.tsx/.jsx) or component group name")
  .option("-i, --input <path>", "Input component file path")
  .option("-o, --output <path>", "Output file path (defaults to input)")
  .option("-p, --prompt <text>", "Enhancement prompt")
  .option("--temperature <number>", "Generation temperature (0-1)", "0.7")
  .option("--max-tokens <number>", "Maximum tokens", "4000")
  .option("--credits <number>", "Credit limit for enhancement")
  .option("--yes", "Skip prompts (non-interactive mode)")
  // NEW: Refinement-specific options
  .option("--interactive", "VS Code extension mode with structured output")
  .option(
    "--output-format <format>",
    "Output format: default, structured, diff, preview",
    "default"
  )
  .option("--show-changes", "Show detailed changes in output")
  .option("--preserve-history", "Keep enhancement history for rollback")
  .action(async (target, options) => {
    try {
      await enhanceCommand.execute(target, {
        ...options,
        temperature: parseFloat(options.temperature),
        maxTokens: parseInt(options.maxTokens),
        outputFormat: options.outputFormat || "default",
        interactive: options.interactive || false,
        showChanges: options.showChanges || false,
        preserveHistory: options.preserveHistory || false,
      });
    } catch (error) {
      console.error(chalk.red("❌ Enhancement failed:"), error);
      process.exit(1);
    }
  });
