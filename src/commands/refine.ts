#!/usr/bin/env node

import { Command } from "commander";
import chalk from "chalk";
import fs from "fs-extra";
import path from "path";
import { EnhancedSpinner } from "../utils/spinner";
import { EnhancementAgent } from "../agents/implementations/EnhancementAgent";
import { ContextLoader } from "../utils/contextLoader";

export interface RefinementOptions {
  prompt: string;
  temperature?: number;
  maxTokens?: number;
  verbose?: boolean;
  debug?: boolean;
  output?: string;
  // Refinement-specific options
  interactive?: boolean; // VS Code extension mode
  outputFormat?: "structured" | "diff" | "preview" | "apply";
  showChanges?: boolean; // Show detailed changes
  preserveHistory?: boolean; // Keep refinement history
  rollback?: boolean; // Rollback to previous version
}

export class RefineCommand {
  private enhancementAgent: EnhancementAgent;

  constructor() {
    this.enhancementAgent = new EnhancementAgent();
  }

  async execute(
    componentPath: string,
    options: RefinementOptions
  ): Promise<any> {
    const spinner = new EnhancedSpinner("Initializing refinement...");

    try {
      spinner.start();

      // Load project context for better refinements
      const contextLoader = new ContextLoader();
      const projectContext = await contextLoader.loadProjectContext({
        verbose: options.verbose || false,
        required: false,
      });

      if (options.verbose) {
        const summary = contextLoader.getContextSummary(projectContext);
        console.log(chalk.gray(`📁 Context: ${summary}`));
      }

      // Validate component path
      if (!componentPath) {
        throw new Error("Component path is required");
      }

      // Check if component file exists
      const fullPath = path.resolve(componentPath);
      if (!(await fs.pathExists(fullPath))) {
        throw new Error(`Component file not found: ${componentPath}`);
      }

      // Check if it's a React component
      if (!fullPath.endsWith(".tsx") && !fullPath.endsWith(".jsx")) {
        throw new Error("Target must be a React component file (.tsx/.jsx)");
      }

      spinner.updateText("Reading component file...");
      const componentCode = await fs.readFile(fullPath, "utf-8");
      const componentName = path.basename(fullPath, path.extname(fullPath));

      // Get refinement prompt
      const prompt = await this.getRefinementPrompt(options);

      spinner.updateText("Refining component...");

      // Run refinement with fallback
      let result;
      try {
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
      } catch (error: any) {
        if (error.message.includes("timed out")) {
          console.log(
            chalk.yellow(
              "⚠️  AI generation timed out, using fallback enhancement..."
            )
          );

          // Fallback: Simple component improvements without AI
          result = {
            enhancedComponent: this.generateFallbackEnhancement(
              componentCode,
              prompt
            ),
            originalComponent: componentCode,
            designTokens: { colors: {}, spacing: {}, typography: {} },
            changes: { added: [], modified: [], removed: [] },
          };
        } else {
          throw error;
        }
      }

      // Handle rollback if requested
      if (options.rollback) {
        return await this.handleRollback(fullPath, componentName, spinner);
      }

      // Preserve history if requested
      if (options.preserveHistory) {
        await this.preserveComponentHistory(fullPath, componentCode);
      }

      // Generate output based on format
      const output = this.generateRefinementOutput(
        result,
        componentName,
        options
      );

      // Apply changes if requested
      if (options.outputFormat === "apply") {
        await this.applyRefinement(fullPath, result.enhancedComponent, spinner);
      }

      spinner.succeed("Refinement completed successfully!");

      // Return structured output for VS Code extension
      if (options.interactive || options.outputFormat !== "structured") {
        return output;
      }

      // Display results for CLI
      this.displayRefinementResults(output, componentName);
      this.printNextCommands();
    } catch (error) {
      spinner.fail("Refinement failed");
      console.error(chalk.red("❌ Error:"), error);

      if (options.interactive) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
          componentName: path.basename(
            componentPath,
            path.extname(componentPath)
          ),
        };
      }

      process.exit(1);
    }
  }

  private printNextCommands(): void {
    try {
      console.log("");
      console.log(chalk.blue("➡️ Next commands:"));
      console.log(chalk.gray("   mycontext preview components"));
      console.log(chalk.gray("   mycontext normalize preview"));
      console.log(chalk.gray("   mycontext enhance <group>"));
      console.log(
        chalk.gray("   mycontext generate-components all --with-tests")
      );
      console.log("");
    } catch {}
  }

  /**
   * Get refinement prompt from options or user input
   */
  private async getRefinementPrompt(
    options: RefinementOptions
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
      rl.question(chalk.blue("Enter refinement prompt: "), (answer: string) => {
        rl.close();
        resolve(
          answer.trim() || "Refine this component with modern design patterns"
        );
      });
    });
  }

  /**
   * Generate fallback enhancement when AI times out
   */
  private generateFallbackEnhancement(
    componentCode: string,
    prompt: string
  ): string {
    // Simple fallback improvements without AI
    let enhanced = componentCode;

    // Add basic accessibility improvements
    if (enhanced.includes("<button") && !enhanced.includes("aria-label")) {
      enhanced = enhanced.replace(
        /<button([^>]*)>/g,
        '<button$1 aria-label="Button">'
      );
    }

    // Add hover effects if not present
    if (enhanced.includes("className=") && !enhanced.includes("hover:")) {
      enhanced = enhanced.replace(
        /className="([^"]*)"/g,
        'className="$1 hover:opacity-80 transition-opacity"'
      );
    }

    // Add focus styles
    if (enhanced.includes("className=") && !enhanced.includes("focus:")) {
      enhanced = enhanced.replace(
        /className="([^"]*)"/g,
        'className="$1 focus:outline-none focus:ring-2 focus:ring-blue-500"'
      );
    }

    return enhanced;
  }

  /**
   * Extract design context from component code
   */
  private extractDesignContext(componentCode: string): any {
    // Simple extraction of design context from component
    const colors =
      componentCode.match(
        /(?:bg-|text-|border-)([a-z]+-\d+|primary|secondary|accent)/g
      ) || [];
    const spacing =
      componentCode.match(/(?:p-|m-|gap-)(\d+|xs|sm|md|lg|xl)/g) || [];
    const typography =
      componentCode.match(
        /(?:text-)(xs|sm|base|lg|xl|2xl|3xl|4xl|5xl|6xl|7xl|8xl|9xl)/g
      ) || [];

    return {
      colors: [...new Set(colors)],
      spacing: [...new Set(spacing)],
      typography: [...new Set(typography)],
      interactions: this.extractInteractions(componentCode),
    };
  }

  /**
   * Extract interaction patterns from component
   */
  private extractInteractions(componentCode: string): string[] {
    const interactions = [];

    if (componentCode.includes("onClick")) interactions.push("click");
    if (componentCode.includes("onChange")) interactions.push("change");
    if (componentCode.includes("onSubmit")) interactions.push("submit");
    if (componentCode.includes("onFocus")) interactions.push("focus");
    if (componentCode.includes("onBlur")) interactions.push("blur");
    if (componentCode.includes("useState")) interactions.push("state");
    if (componentCode.includes("useEffect")) interactions.push("effects");

    return interactions;
  }

  /**
   * Generate refinement output based on format
   */
  private generateRefinementOutput(
    result: any,
    componentName: string,
    options: RefinementOptions
  ): any {
    const baseOutput = {
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
        model: "mycontext-refinement",
        temperature: options.temperature,
        maxTokens: options.maxTokens,
        prompt: options.prompt,
      },
    };

    // Output based on format
    switch (options.outputFormat) {
      case "diff":
        return this.generateDiffOutput(baseOutput);
      case "preview":
        return this.generatePreviewOutput(baseOutput);
      case "apply":
        return this.generateApplyOutput(baseOutput);
      case "structured":
      default:
        return baseOutput;
    }
  }

  /**
   * Generate diff output for side-by-side comparison
   */
  private generateDiffOutput(baseOutput: any): any {
    return {
      ...baseOutput,
      diff: {
        unified: this.generateUnifiedDiff(
          baseOutput.originalCode,
          baseOutput.enhancedCode
        ),
        sideBySide: this.generateSideBySideDiff(
          baseOutput.originalCode,
          baseOutput.enhancedCode
        ),
      },
    };
  }

  /**
   * Generate preview output for component rendering
   */
  private generatePreviewOutput(baseOutput: any): any {
    return {
      ...baseOutput,
      preview: {
        canRender: this.canRenderComponent(baseOutput.enhancedCode),
        dependencies: this.extractDependencies(baseOutput.enhancedCode),
        props: this.extractComponentProps(baseOutput.enhancedCode),
        warnings: this.extractRenderWarnings(baseOutput.enhancedCode),
      },
    };
  }

  /**
   * Generate apply output for immediate application
   */
  private generateApplyOutput(baseOutput: any): any {
    return {
      ...baseOutput,
      apply: {
        ready: true,
        filePath: baseOutput.metadata?.filePath,
        backupPath: baseOutput.metadata?.backupPath,
        changes: baseOutput.changes,
      },
    };
  }

  /**
   * Generate unified diff format
   */
  private generateUnifiedDiff(original: string, enhanced: string): string {
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

  /**
   * Preserve component history for rollback
   */
  private async preserveComponentHistory(
    filePath: string,
    originalCode: string
  ): Promise<void> {
    const historyDir = path.join(path.dirname(filePath), ".mycontext-history");
    await fs.ensureDir(historyDir);

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const historyFile = path.join(
      historyDir,
      `${path.basename(filePath)}.${timestamp}.backup`
    );

    await fs.writeFile(historyFile, originalCode);
  }

  /**
   * Handle rollback to previous version
   */
  private async handleRollback(
    filePath: string,
    componentName: string,
    spinner: EnhancedSpinner
  ): Promise<any> {
    spinner.updateText("Rolling back to previous version...");

    const historyDir = path.join(path.dirname(filePath), ".mycontext-history");
    if (!(await fs.pathExists(historyDir))) {
      throw new Error("No history found for rollback");
    }

    const historyFiles = await fs.readdir(historyDir);
    const backupFiles = historyFiles
      .filter(
        (file) =>
          file.startsWith(`${path.basename(filePath)}.`) &&
          file.endsWith(".backup")
      )
      .sort()
      .reverse();

    if (backupFiles.length === 0) {
      throw new Error("No backup files found for rollback");
    }

    const latestBackup = backupFiles[0];
    const backupPath = path.join(historyDir, latestBackup);
    const backupCode = await fs.readFile(backupPath, "utf-8");

    // Restore the backup
    await fs.writeFile(filePath, backupCode);

    spinner.succeed("Rollback completed successfully!");

    return {
      success: true,
      componentName,
      action: "rollback",
      restoredFrom: latestBackup,
      restoredCode: backupCode,
    };
  }

  /**
   * Apply refinement changes to file
   */
  private async applyRefinement(
    filePath: string,
    enhancedCode: string,
    spinner: EnhancedSpinner
  ): Promise<void> {
    spinner.updateText("Applying refinement changes...");

    // Create backup before applying
    const backupPath = `${filePath}.backup.${Date.now()}`;
    const originalCode = await fs.readFile(filePath, "utf-8");
    await fs.writeFile(backupPath, originalCode);

    // Apply the enhanced code
    await fs.writeFile(filePath, enhancedCode);

    spinner.updateText("Refinement applied successfully!");
  }

  /**
   * Display refinement results for CLI
   */
  private displayRefinementResults(output: any, componentName: string): void {
    console.log(chalk.green(`\n✅ Refined ${componentName}`));
    console.log(chalk.gray(`Quality Score: ${output.validation.score}/100`));

    if (output.changes.totalChanges > 0) {
      console.log(
        chalk.gray(`Changes: ${output.changes.totalChanges} lines modified`)
      );
    }

    if (output.suggestions?.accessibility?.length > 0) {
      console.log(chalk.yellow("\n🔍 Accessibility Suggestions:"));
      output.suggestions.accessibility.forEach((suggestion: string) => {
        console.log(chalk.gray(`  • ${suggestion}`));
      });
    }

    if (output.suggestions?.performance?.length > 0) {
      console.log(chalk.blue("\n⚡ Performance Suggestions:"));
      output.suggestions.performance.forEach((suggestion: string) => {
        console.log(chalk.gray(`  • ${suggestion}`));
      });
    }
  }
}

// CLI command setup
const refineCommand = new RefineCommand();

export const refine = new Command("refine")
  .description("Refine React components with AI-powered improvements")
  .argument("<component>", "Component file (.tsx/.jsx) to refine")
  .option("-p, --prompt <text>", "Refinement prompt")
  .option("--temperature <number>", "Generation temperature (0-1)", "0.7")
  .option("--max-tokens <number>", "Maximum tokens", "4000")
  .option("--yes", "Skip prompts (non-interactive mode)")
  // Refinement-specific options
  .option("--interactive", "VS Code extension mode with structured output")
  .option(
    "--output-format <format>",
    "Output format: structured, diff, preview, apply",
    "structured"
  )
  .option("--show-changes", "Show detailed changes in output")
  .option("--preserve-history", "Keep refinement history for rollback")
  .option("--rollback", "Rollback to previous version")
  .action(async (component, options) => {
    try {
      const result = await refineCommand.execute(component, {
        ...options,
        temperature: parseFloat(options.temperature),
        maxTokens: parseInt(options.maxTokens),
        outputFormat: options.outputFormat || "structured",
        interactive: options.interactive || false,
        showChanges: options.showChanges || false,
        preserveHistory: options.preserveHistory || false,
        rollback: options.rollback || false,
      });

      // For interactive mode, output JSON
      if (options.interactive || options.outputFormat !== "default") {
        console.log(JSON.stringify(result, null, 2));
      }
    } catch (error) {
      console.error(chalk.red("❌ Refinement failed:"), error);
      process.exit(1);
    }
  });
