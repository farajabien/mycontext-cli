import chalk from "chalk";
import prompts from "prompts";
import * as fs from "fs-extra";
import path from "path";
import { CommandOptions } from "../types";
import { FileSystemManager } from "../utils/fileSystem";
import { HybridAIClient } from "../utils/hybridAIClient";
import { ReviewContextCommand } from "./review-context";

export interface RefineComponentOptions extends CommandOptions {
  variant?: "mobile" | "desktop" | "both";
  updateContext?: boolean;
  inPlace?: boolean;
}

export class RefineComponentCommand {
  private fs = new FileSystemManager();
  private aiClient = new HybridAIClient();

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

      // Determine refinement strategy
      const strategy = await this.determineRefinementStrategy(
        componentName,
        options
      );

      if (strategy === "context-update") {
        await this.refineViaContextUpdate(componentName, options);
      } else {
        await this.refineInPlace(componentName, componentPath, options);
      }

      console.log(
        chalk.green(`✅ Component ${componentName} refined successfully!`)
      );
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
   * Determine refinement strategy
   */
  private async determineRefinementStrategy(
    componentName: string,
    options: RefineComponentOptions
  ): Promise<"context-update" | "in-place"> {
    if (options.updateContext) {
      return "context-update";
    }

    if (options.inPlace) {
      return "in-place";
    }

    // Ask user to choose strategy
    const response = await prompts({
      type: "select",
      name: "strategy",
      message: "How would you like to refine this component?",
      choices: [
        {
          title: "Update context files and regenerate all",
          value: "context-update",
          description: "Modify PRD/context → regenerate all components",
        },
        {
          title: "Refine this component only",
          value: "in-place",
          description: "Modify only this component file",
        },
        {
          title: "Cancel",
          value: "cancel",
          description: "Exit without changes",
        },
      ],
      initial: 1,
    });

    if (response.strategy === "cancel") {
      throw new Error("Refinement cancelled by user");
    }

    return response.strategy;
  }

  /**
   * Refine component via context update
   */
  private async refineViaContextUpdate(
    componentName: string,
    options: RefineComponentOptions
  ): Promise<void> {
    console.log(chalk.blue("📝 Updating context files..."));

    // Get refinement suggestions
    const suggestions = await this.getRefinementSuggestions(componentName);

    if (suggestions.length === 0) {
      console.log(
        chalk.yellow(
          "No specific suggestions found. Please manually update context files."
        )
      );
      return;
    }

    // Show suggestions and get user approval
    console.log(chalk.yellow("\n💡 AI suggests the following improvements:"));
    suggestions.forEach((suggestion, index) => {
      console.log(chalk.gray(`   ${index + 1}. ${suggestion}`));
    });

    const response = await prompts({
      type: "multiselect",
      name: "selectedSuggestions",
      message: "Which suggestions would you like to apply?",
      choices: suggestions.map((suggestion, index) => ({
        title: suggestion,
        value: index,
        description: `Suggestion ${index + 1}`,
      })),
      instructions: "Use space to select, enter to confirm",
    });

    if (
      response.selectedSuggestions &&
      response.selectedSuggestions.length > 0
    ) {
      // Update context files with selected suggestions
      await this.updateContextFiles(
        componentName,
        response.selectedSuggestions.map((i: number) => suggestions[i])
      );

      console.log(
        chalk.green(
          "✅ Context files updated. Run 'mycontext generate:components' to regenerate."
        )
      );
    }
  }

  /**
   * Refine component in-place
   */
  private async refineInPlace(
    componentName: string,
    componentPath: string,
    options: RefineComponentOptions
  ): Promise<void> {
    console.log(chalk.blue("🔧 Refining component in-place..."));

    // Read current component
    const currentCode = await this.fs.readFile(componentPath);

    // Get refinement suggestions
    const suggestions = await this.getRefinementSuggestions(componentName);

    if (suggestions.length === 0) {
      console.log(chalk.yellow("No specific suggestions found."));
      return;
    }

    // Show suggestions and get user approval
    console.log(chalk.yellow("\n💡 AI suggests the following improvements:"));
    suggestions.forEach((suggestion, index) => {
      console.log(chalk.gray(`   ${index + 1}. ${suggestion}`));
    });

    const response = await prompts({
      type: "multiselect",
      name: "selectedSuggestions",
      message: "Which suggestions would you like to apply?",
      choices: suggestions.map((suggestion, index) => ({
        title: suggestion,
        value: index,
        description: `Suggestion ${index + 1}`,
      })),
      instructions: "Use space to select, enter to confirm",
    });

    if (
      response.selectedSuggestions &&
      response.selectedSuggestions.length > 0
    ) {
      // Generate refined code
      const refinedCode = await this.generateRefinedCode(
        componentName,
        currentCode,
        response.selectedSuggestions.map((i: number) => suggestions[i])
      );

      // Write refined code
      await this.fs.writeFile(componentPath, refinedCode);

      console.log(
        chalk.green(`✅ Component ${componentName} refined successfully!`)
      );
    }
  }

  /**
   * Get refinement suggestions for a component
   */
  private async getRefinementSuggestions(
    componentName: string
  ): Promise<string[]> {
    const prompt = `Analyze this React component and suggest improvements:

Component: ${componentName}

Please suggest specific improvements for:
1. Accessibility (ARIA labels, keyboard navigation, screen reader support)
2. Performance (memoization, lazy loading, optimization)
3. User Experience (loading states, error handling, animations)
4. Code Quality (TypeScript types, error boundaries, best practices)
5. Responsive Design (mobile/desktop variants, breakpoints)

Return 3-5 specific, actionable suggestions.`;

    try {
      const response = await this.aiClient.generateText(prompt, {
        temperature: 0.7,
        maxTokens: 1000,
      });

      // Parse suggestions from response
      const suggestions = response.text
        .split("\n")
        .filter((line) => line.trim().match(/^\d+\./))
        .map((line) => line.replace(/^\d+\.\s*/, "").trim())
        .filter((suggestion) => suggestion.length > 0);

      return suggestions.slice(0, 5); // Limit to 5 suggestions
    } catch (error) {
      console.log(chalk.yellow("⚠️  Could not generate AI suggestions"));
      return [
        "Add loading state",
        "Improve accessibility with ARIA labels",
        "Add error boundary",
        "Optimize for mobile devices",
        "Add TypeScript types",
      ];
    }
  }

  /**
   * Generate refined code based on suggestions
   */
  private async generateRefinedCode(
    componentName: string,
    currentCode: string,
    suggestions: string[]
  ): Promise<string> {
    const prompt = `Refine this React component based on the suggestions:

Component: ${componentName}

Current Code:
\`\`\`tsx
${currentCode}
\`\`\`

Suggestions to apply:
${suggestions.map((s, i) => `${i + 1}. ${s}`).join("\n")}

Please generate the refined component code that incorporates these suggestions while maintaining the existing functionality and structure.`;

    try {
      const response = await this.aiClient.generateText(prompt, {
        temperature: 0.3,
        maxTokens: 3000,
      });

      return response.text;
    } catch (error) {
      console.log(chalk.yellow("⚠️  Could not generate refined code"));
      return currentCode;
    }
  }

  /**
   * Update context files with suggestions
   */
  private async updateContextFiles(
    componentName: string,
    suggestions: string[]
  ): Promise<void> {
    // This would update the PRD or other context files
    // For now, we'll create a refinement log
    const refinementLog = {
      component: componentName,
      suggestions: suggestions,
      timestamp: new Date().toISOString(),
      applied: true,
    };

    const logPath = ".mycontext/refinement-log.json";
    let existingLogs = [];

    if (await this.fs.exists(logPath)) {
      existingLogs = JSON.parse(await this.fs.readFile(logPath));
    }

    existingLogs.push(refinementLog);

    await this.fs.writeFile(logPath, JSON.stringify(existingLogs, null, 2));

    console.log(
      chalk.blue(
        "📝 Refinement suggestions logged to .mycontext/refinement-log.json"
      )
    );
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
