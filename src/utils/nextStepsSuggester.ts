import chalk from "chalk";

export interface NextStep {
  description: string;
  command: string;
  priority: "high" | "medium" | "low";
  context?: string;
}

export interface WorkflowContext {
  lastCommand?: string;
  projectType?: string;
  hasPRD?: boolean;
  hasContextFiles?: boolean;
  hasComponents?: boolean;
  hasShadcn?: boolean;
  hasInstantDB?: boolean;
  aiProviderConfigured?: boolean;
  isNewProject?: boolean;
}

export class NextStepsSuggester {
  /**
   * Get context-aware next steps based on current project state
   */
  static getNextSteps(context: WorkflowContext): NextStep[] {
    const suggestions: NextStep[] = [];

    // After project initialization
    if (context.lastCommand === "init" || context.isNewProject) {
      suggestions.push(
        {
          description: "Review and update your PRD with project details",
          command: "mycontext compile-prd",
          priority: "high",
          context: "PRD is essential for AI generation",
        },
        {
          description: "Set up shadcn/ui components",
          command: "mycontext setup-shadcn --all",
          priority: "high",
          context: "Components are needed for UI development",
        },
        {
          description: "Configure AI provider",
          command: "mycontext status --check-health",
          priority: "high",
          context: "AI is required for code generation",
        }
      );
    }

    // After PRD compilation
    else if (context.lastCommand === "compile-prd") {
      if (!context.hasContextFiles) {
        suggestions.push({
          description: "Generate context files from PRD",
          command: "mycontext generate-context-files",
          priority: "high",
          context: "Context files help AI understand your project",
        });
      } else {
        suggestions.push({
          description: "Generate project architecture",
          command: "mycontext generate types",
          priority: "high",
          context: "Types define your data structures",
        });
      }
    }

    // After context file generation
    else if (context.lastCommand === "generate-context-files") {
      suggestions.push(
        {
          description: "Generate TypeScript types",
          command: "mycontext generate types",
          priority: "high",
          context: "Types provide type safety",
        },
        {
          description: "Generate brand guidelines",
          command: "mycontext generate brand",
          priority: "medium",
          context: "Branding ensures consistent UI",
        }
      );
    }

    // After generating types
    else if (
      context.lastCommand === "generate-types" ||
      context.lastCommand === "generate"
    ) {
      suggestions.push(
        {
          description: "Generate component list",
          command: "mycontext generate component-list",
          priority: "high",
          context: "Component list guides UI development",
        },
        {
          description: "Generate project structure",
          command: "mycontext generate project-structure",
          priority: "medium",
          context: "Structure organizes your codebase",
        }
      );
    }

    // After generating component list
    else if (context.lastCommand === "generate-component-list") {
      suggestions.push(
        {
          description: "Generate components automatically",
          command: "mycontext generate-components all --with-tests",
          priority: "high",
          context: "Components build your UI",
        },
        {
          description: "Generate project structure",
          command: "mycontext generate project-structure",
          priority: "medium",
          context: "Structure organizes components",
        }
      );
    }

    // After generating components
    else if (context.lastCommand?.includes("generate-components")) {
      suggestions.push(
        {
          description: "Preview components at hosted Studio",
          command: "Visit https://studio.mycontext.app",
          priority: "medium",
          context: "Upload your .mycontext/ directory to preview all components",
        },
        {
          description: "Validate component quality",
          command: "mycontext validate",
          priority: "medium",
          context: "Validation ensures quality",
        },
        {
          description: "Promote to production",
          command: "mycontext promote --all",
          priority: "low",
          context: "Move components to production",
        }
      );
    }

    // After validation
    else if (context.lastCommand === "validate") {
      if (!context.hasComponents) {
        suggestions.push({
          description: "Generate missing components",
          command: "mycontext generate-components all",
          priority: "high",
          context: "Fix validation issues",
        });
      } else {
        suggestions.push({
          description: "Run the development server",
          command: "npm run dev",
          priority: "medium",
          context: "Start developing your app",
        });
      }
    }

    // Database-specific suggestions
    if (context.hasInstantDB) {
      if (!context.lastCommand?.includes("setup-instantdb")) {
        suggestions.push({
          description: "Set up InstantDB integration",
          command: "mycontext setup-instantdb",
          priority: "high",
          context: "InstantDB provides real-time database",
        });
      }
    }

    // Always available suggestions
    if (suggestions.length === 0) {
      suggestions.push(
        {
          description: "Check project status",
          command: "mycontext status",
          priority: "low",
          context: "Monitor project progress",
        },
        {
          description: "Get help with commands",
          command: "mycontext --help",
          priority: "low",
          context: "Learn available commands",
        }
      );
    }

    // Sort by priority
    return suggestions.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * Display next steps in a user-friendly format
   */
  static displayNextSteps(suggestions: NextStep[], maxItems: number = 3): void {
    if (suggestions.length === 0) return;

    console.log("\n💡 Next Steps:");

    const displaySuggestions = suggestions.slice(0, maxItems);

    displaySuggestions.forEach((step, index) => {
      const priorityColor =
        step.priority === "high"
          ? chalk.red
          : step.priority === "medium"
          ? chalk.yellow
          : chalk.gray;

      console.log(`  ${index + 1}. ${step.description}`);
      console.log(`     ${chalk.cyan(step.command)}`);

      if (step.context) {
        console.log(`     ${chalk.gray(step.context)}`);
      }
    });

    if (suggestions.length > maxItems) {
      console.log(
        `  ${chalk.gray(
          `... and ${suggestions.length - maxItems} more suggestions`
        )}`
      );
      console.log(`     ${chalk.gray("Run: mycontext suggest")}`);
    }

    console.log();
  }

  /**
   * Get workflow context from project state
   */
  static async getWorkflowContext(
    projectRoot: string = process.cwd()
  ): Promise<WorkflowContext> {
    const fs = await import("fs-extra");
    const path = await import("path");

    const context: WorkflowContext = {
      isNewProject: false,
      hasPRD: false,
      hasContextFiles: false,
      hasComponents: false,
      hasShadcn: false,
      hasInstantDB: false,
      aiProviderConfigured: false,
    };

    try {
      // Check for PRD
      const prdPath = path.join(projectRoot, ".mycontext", "01-prd.md");
      context.hasPRD = await fs.pathExists(prdPath);

      // Check for context files
      const contextDir = path.join(projectRoot, ".mycontext");
      if (await fs.pathExists(contextDir)) {
        const files = await fs.readdir(contextDir);
        context.hasContextFiles = files.some(
          (file) => file.endsWith(".md") && file !== "01-prd.md"
        );
      }

      // Check for components
      const componentsDir = path.join(projectRoot, "components");
      context.hasComponents = await fs.pathExists(componentsDir);

      // Check for shadcn
      const shadcnConfig = path.join(projectRoot, "components.json");
      context.hasShadcn = await fs.pathExists(shadcnConfig);

      // Check for InstantDB
      const packageJsonPath = path.join(projectRoot, "package.json");
      if (await fs.pathExists(packageJsonPath)) {
        const packageJson = await fs.readJson(packageJsonPath);
        context.hasInstantDB = !!(
          packageJson.dependencies?.["@instantdb/react"] ||
          packageJson.dependencies?.["@instantdb/admin"]
        );
      }

      // Check for AI provider configuration
      const envFiles = [".env", ".env.local", ".mycontext/.env"];
      for (const envFile of envFiles) {
        const envPath = path.join(projectRoot, envFile);
        if (await fs.pathExists(envPath)) {
          const content = await fs.readFile(envPath, "utf8");
          if (
            content.includes("ANTHROPIC_API_KEY=") ||
            content.includes("MYCONTEXT_XAI_API_KEY=")
          ) {
            context.aiProviderConfigured = true;
            break;
          }
        }
      }

      // Check if this is a new project (recently initialized)
      const mycontextDir = path.join(projectRoot, ".mycontext");
      if (await fs.pathExists(mycontextDir)) {
        const stats = await fs.stat(mycontextDir);
        const daysSinceCreation =
          (Date.now() - stats.birthtimeMs) / (1000 * 60 * 60 * 24);
        context.isNewProject = daysSinceCreation < 1; // Less than 1 day old
      }

      // Detect project type from PRD content
      if (context.hasPRD) {
        context.projectType = await this.detectProjectType(projectRoot);
      }
    } catch (error) {
      // Ignore errors in context detection
    }

    return context;
  }

  /**
   * Detect project type from PRD content
   */
  private static async detectProjectType(projectRoot: string): Promise<string> {
    try {
      const fs = await import("fs-extra");
      const path = await import("path");

      const prdPath = path.join(projectRoot, ".mycontext", "01-prd.md");
      const content = await fs.readFile(prdPath, "utf8");
      const lowerContent = content.toLowerCase();

      // Detect project types based on keywords
      if (
        lowerContent.includes("e-commerce") ||
        lowerContent.includes("shopping") ||
        lowerContent.includes("store")
      ) {
        return "ecommerce";
      }
      if (
        lowerContent.includes("dashboard") ||
        lowerContent.includes("analytics") ||
        lowerContent.includes("metrics")
      ) {
        return "dashboard";
      }
      if (
        lowerContent.includes("blog") ||
        lowerContent.includes("content") ||
        lowerContent.includes("cms")
      ) {
        return "content";
      }
      if (
        lowerContent.includes("social") ||
        lowerContent.includes("feed") ||
        lowerContent.includes("network")
      ) {
        return "social";
      }
      if (lowerContent.includes("game") || lowerContent.includes("gaming")) {
        return "game";
      }
      if (lowerContent.includes("weather")) {
        return "weather";
      }
      if (
        lowerContent.includes("finance") ||
        lowerContent.includes("banking") ||
        lowerContent.includes("money")
      ) {
        return "finance";
      }

      return "general";
    } catch (error) {
      return "general";
    }
  }

  /**
   * Get intelligent workflow suggestions based on project analysis
   */
  static async getIntelligentSuggestions(
    projectRoot: string = process.cwd()
  ): Promise<NextStep[]> {
    const context = await this.getWorkflowContext(projectRoot);

    // Base suggestions
    const suggestions = this.getNextSteps(context);

    // Add project-type specific suggestions
    const typeSpecificSuggestions = this.getProjectTypeSuggestions(context);
    suggestions.push(...typeSpecificSuggestions);

    // Add workflow suggestions
    const workflowSuggestions = this.getWorkflowSuggestions(context);
    suggestions.unshift(...workflowSuggestions); // Add to beginning

    // Remove duplicates and sort by priority
    const uniqueSuggestions = this.deduplicateSuggestions(suggestions);
    return uniqueSuggestions.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * Get suggestions based on detected project type
   */
  private static getProjectTypeSuggestions(
    context: WorkflowContext
  ): NextStep[] {
    const suggestions: NextStep[] = [];

    if (!context.projectType || context.projectType === "general")
      return suggestions;

    switch (context.projectType) {
      case "ecommerce":
        if (!context.hasComponents) {
          suggestions.push({
            description: "Generate e-commerce specific components",
            command: "mycontext generate-components all --category ecommerce",
            priority: "medium",
            context:
              "Tailored for shopping cart, product display, checkout flow",
          });
        }
        break;

      case "dashboard":
        if (!context.hasComponents) {
          suggestions.push({
            description: "Generate dashboard components",
            command: "mycontext generate-components all --category dashboard",
            priority: "medium",
            context: "Charts, metrics cards, data tables for analytics",
          });
        }
        break;

      case "content":
        if (!context.hasComponents) {
          suggestions.push({
            description: "Generate content/blog components",
            command: "mycontext generate-components all --category content",
            priority: "medium",
            context: "Articles, comments, content management interface",
          });
        }
        break;
    }

    return suggestions;
  }

  /**
   * Get workflow-level suggestions
   */
  private static getWorkflowSuggestions(context: WorkflowContext): NextStep[] {
    const suggestions: NextStep[] = [];

    // Suggest complete workflow for new projects
    if (context.isNewProject && !context.hasComponents) {
      suggestions.push({
        description: "Run complete project setup workflow",
        command: "mycontext workflow start complete-setup --auto-continue",
        priority: "high",
        context: "Automated end-to-end project setup",
      });
    }

    // Suggest workflow status check
    suggestions.push({
      description: "Check current workflow status",
      command: "mycontext workflow status",
      priority: "low",
      context: "See progress and next steps",
    });

    return suggestions;
  }

  /**
   * Remove duplicate suggestions
   */
  private static deduplicateSuggestions(suggestions: NextStep[]): NextStep[] {
    const seen = new Set<string>();
    return suggestions.filter((suggestion) => {
      const key = `${suggestion.command}:${suggestion.description}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
}
