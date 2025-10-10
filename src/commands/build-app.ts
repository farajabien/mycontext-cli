#!/usr/bin/env node

import chalk from "chalk";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import prompts from "prompts";
import { WorkflowAgent } from "../agents/implementations/WorkflowAgent";
import { PMAgentProjectInput } from "../types/pm-integration";

interface BuildAppOptions {
  description?: string; // Made optional for PM plan input
  output?: string;
  framework?: string;
  withTests?: boolean;
  verbose?: boolean;
  existing?: boolean; // New option to work with existing projects
  migrate?: boolean; // New option to migrate existing project
  interactive?: boolean; // New option for interactive mode
  skipValidation?: boolean; // New option to skip validation steps
  maxRetries?: number; // New option for maximum retry attempts

  // Complete Architecture Options
  completeArchitecture?: boolean; // Generate with actions, routes, full docs
  architectureType?: "nextjs-app-router" | "nextjs-pages" | "react-spa"; // Architecture type
  serverActions?: boolean; // Generate server actions
  routes?: boolean; // Generate Next.js routes

  // mycontext PM Integration Options
  pmPlan?: string; // Path to mycontext PM project plan JSON
  autoSync?: boolean; // Automatically sync progress with mycontext PM
  webhookUrl?: string; // Webhook URL for progress updates
}

export class BuildAppCommand {
  private workflowAgent = new WorkflowAgent();

  async execute(options: BuildAppOptions): Promise<void> {
    // Handle mycontext PM plan input
    let pmPlanData = null;
    if (options.pmPlan) {
      pmPlanData = await this.loadPMPlan(options.pmPlan);
      console.log(
        chalk.blue.bold("🤖 Building App from mycontext PM Project Plan\n")
      );
    } else {
      console.log(chalk.blue.bold("🚀 Building Complete App with MyContext\n"));
    }

    // Merge mycontext PM plan data with command options
    const finalOptions = this.mergeOptionsWithPMPlan(options, pmPlanData);

    const {
      description,
      output = "mycontext-app",
      framework = "nextjs",
      withTests = false,
      verbose = false,
      existing = false,
      migrate = false,
      interactive = false,
      skipValidation = false,
      maxRetries = 3,
      completeArchitecture = false,
      architectureType = "nextjs-app-router",
      serverActions = true,
      routes = true,
      pmPlan,
      autoSync = false,
      webhookUrl,
    } = finalOptions;

    // Display different header for PM plan builds
    if (pmPlanData) {
      console.log(chalk.cyan("📋 PM Plan:"));
      console.log(`   Project: ${chalk.white(pmPlanData.project.name)}`);
      console.log(
        `   Description: ${chalk.white(
          pmPlanData.project.description.substring(0, 60)
        )}...`
      );
      console.log(
        `   Tasks: ${chalk.white(pmPlanData.breakdown.tasks?.length || 0)}`
      );
      console.log(`   Framework: ${chalk.white(framework)}`);
      console.log(`   Architecture: ${chalk.white(architectureType)}`);
    } else {
      console.log(chalk.gray(`Description: ${description}`));
    }

    console.log(chalk.gray(`Output: ${output}`));
    console.log(chalk.gray(`Framework: ${framework}`));
    console.log(
      chalk.gray(`Interactive Mode: ${interactive ? "Enabled" : "Disabled"}`)
    );
    console.log(chalk.gray(`Max Retries: ${maxRetries}`));

    if (completeArchitecture) {
      console.log(chalk.blue.bold("\n🏗️  Complete Architecture Mode"));
      console.log(chalk.gray(`Architecture Type: ${architectureType}`));
      console.log(
        chalk.gray(`Server Actions: ${serverActions ? "Yes" : "No"}`)
      );
      console.log(chalk.gray(`Routes: ${routes ? "Yes" : "No"}`));
    }
    console.log();

    // Interactive prompts for complete architecture
    let finalCompleteArchitecture = completeArchitecture;
    let finalArchitectureType = architectureType;

    if (interactive && !completeArchitecture) {
      const architecturePrompts = await prompts([
        {
          type: "confirm",
          name: "useCompleteArch",
          message:
            "Generate complete architecture (components + actions + routes)?",
          initial: true,
        },
        {
          type: (prev) => (prev ? "select" : null),
          name: "archType",
          message: "Choose architecture type:",
          choices: [
            {
              title: "Next.js App Router (Recommended)",
              value: "nextjs-app-router",
            },
            { title: "Next.js Pages Router", value: "nextjs-pages" },
            { title: "React SPA", value: "react-spa" },
          ],
          initial: 0,
        },
      ]);

      if (architecturePrompts.useCompleteArch) {
        finalCompleteArchitecture = true;
        finalArchitectureType =
          architecturePrompts.archType || architectureType;

        console.log(
          chalk.blue.bold("\n🏗️  Complete Architecture Mode Enabled")
        );
        console.log(chalk.gray(`Architecture Type: ${finalArchitectureType}`));
        console.log();
      }
    }

    try {
      // Ensure description is available
      if (!description) {
        throw new Error("Project description is required");
      }

      // Use the new WorkflowAgent for agent-based, interactive workflow
      const workflowInput = {
        description,
        projectName: output,
        framework: framework as "nextjs" | "react" | "vue" | "angular",
        withTests,
        interactive,
        skipValidation,
        maxRetries,
        // Complete Architecture Options
        completeArchitecture: finalCompleteArchitecture,
        architectureType: finalArchitectureType,
        generateServerActions: serverActions,
        generateRoutes: routes,
        selfDocumenting: finalCompleteArchitecture, // Auto-enable if complete architecture
      };

      const result = await this.workflowAgent.run(workflowInput);

      if (result.success) {
        console.log(
          chalk.green.bold("\n✅ App built successfully with MyContext!")
        );
        console.log(
          chalk.yellow(
            `\n📁 Output directory: ${path.resolve(result.projectPath)}`
          )
        );

        if (finalCompleteArchitecture) {
          console.log(
            chalk.green.bold("\n🏗️  Complete Architecture Generated:")
          );
          console.log(chalk.gray(`   ✅ Components with self-documentation`));
          if (serverActions) {
            console.log(chalk.gray(`   ✅ Server actions in actions/`));
          }
          if (routes) {
            console.log(chalk.gray(`   ✅ Next.js routes in app/`));
          }
          console.log(chalk.gray(`   ✅ Architecture plan in .mycontext/`));
        }

        console.log(chalk.yellow(`\n🚀 To start the app:`));
        console.log(chalk.gray(`   cd ${result.projectPath}`));
        console.log(chalk.gray(`   pnpm dev`));
        console.log(chalk.yellow(`\n🌐 To preview:`));
        console.log(
          chalk.gray(
            `   mycontext preview components --project ${result.projectPath}`
          )
        );

        // Show workflow statistics
        if (interactive || verbose) {
          console.log(chalk.blue(`\n📊 Workflow Statistics:`));
          console.log(
            chalk.gray(`   • Completed Steps: ${result.completedSteps.length}`)
          );
          console.log(
            chalk.gray(`   • User Interactions: ${result.userInteractions}`)
          );
          console.log(chalk.gray(`   • Total Retries: ${result.totalRetries}`));
          console.log(
            chalk.gray(`   • Duration: ${Math.round(result.duration / 1000)}s`)
          );
        }
      } else {
        console.log(chalk.red.bold("\n❌ Workflow failed"));
        console.log(
          chalk.red(`Failed steps: ${result.failedSteps.join(", ")}`)
        );

        // Provide recovery options if interactive
        if (interactive && result.failedSteps.length > 0) {
          console.log(chalk.yellow(`\n🔧 Recovery Options:`));
          console.log(
            chalk.gray(`   • Run individual commands for failed steps`)
          );
          console.log(
            chalk.gray(`   • Check .mycontext/ directory for generated files`)
          );
          console.log(
            chalk.gray(`   • Review error logs above for specific issues`)
          );
        }

        throw new Error(
          `Workflow failed with ${result.failedSteps.length} failed steps`
        );
      }
    } catch (error) {
      console.log(chalk.red.bold("\n❌ Build failed"));
      console.log(
        chalk.red(
          `Error: ${error instanceof Error ? error.message : "Unknown error"}`
        )
      );

      // Provide helpful next steps
      console.log(chalk.yellow(`\n🔧 Troubleshooting:`));
      console.log(chalk.gray(`   • Check that all dependencies are installed`));
      console.log(chalk.gray(`   • Verify API keys are configured (optional)`));
      console.log(chalk.gray(`   • Review the generated files in .mycontext/`));
      console.log(chalk.gray(`   • Try running individual commands manually`));

      if (finalCompleteArchitecture) {
        console.log(
          chalk.yellow(`\n🏗️  Complete Architecture Troubleshooting:`)
        );
        console.log(
          chalk.gray(
            `   • Ensure component list exists (.mycontext/04-component-list.json)`
          )
        );
        console.log(
          chalk.gray(`   • Check that PRD and context files are generated`)
        );
        console.log(
          chalk.gray(
            `   • Try basic generation first without --complete-architecture`
          )
        );
        console.log(
          chalk.gray(
            `   • Review architecture plan in .mycontext/architecture-plan.json`
          )
        );
      }

      throw error;
    }
  }

  // mycontext PM Integration Methods
  private async loadPMPlan(planFile: string): Promise<PMAgentProjectInput> {
    if (!fs.existsSync(planFile)) {
      throw new Error(`PM plan file not found: ${planFile}`);
    }

    try {
      const planContent = fs.readFileSync(planFile, "utf8");
      const pmPlan: PMAgentProjectInput = JSON.parse(planContent);

      // Basic validation
      if (!pmPlan.project || !pmPlan.breakdown || !pmPlan.myContext) {
        throw new Error("Invalid PM plan structure");
      }

      return pmPlan;
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error(`Invalid JSON in PM plan file: ${error.message}`);
      }
      throw error;
    }
  }

  private mergeOptionsWithPMPlan(
    options: BuildAppOptions,
    pmPlan: PMAgentProjectInput | null
  ): BuildAppOptions {
    if (!pmPlan) {
      // Ensure description is provided when no PM plan
      if (!options.description) {
        throw new Error("Description is required when not using a PM plan");
      }
      return options;
    }

    // Merge PM plan data with command options
    return {
      ...options,
      description: pmPlan.project.description,
      framework: pmPlan.myContext.framework,
      withTests: pmPlan.myContext.withTests,
      completeArchitecture: pmPlan.myContext.completeArchitecture,
      architectureType: pmPlan.myContext.architecture,
      serverActions: pmPlan.myContext.generateServerActions,
      routes: pmPlan.myContext.generateRoutes,
      // Keep command-line options if explicitly provided
      output: options.output,
      verbose: options.verbose,
      interactive: options.interactive,
      skipValidation: options.skipValidation,
      maxRetries: options.maxRetries,
    };
  }

  // Help text method
  static getHelpText(): string {
    return `
${chalk.blue.bold("🚀 MyContext Build App Command")}

${chalk.yellow("Usage:")}
  mycontext build-app --description "<description>" [options]

${chalk.yellow("Basic Options:")}
  --description <desc>      Application description (required)
  --output <dir>           Output directory (default: mycontext-app)
  --framework <name>       Framework: nextjs|react|vue|angular (default: nextjs)
  --with-tests            Include test generation
  --interactive           Interactive mode with prompts
  --verbose               Detailed output
  --max-retries <n>       Maximum retry attempts (default: 3)
  --skip-validation       Skip validation steps

${chalk.yellow("🏗️  Complete Architecture Options:")}
  --complete-architecture  Generate full-stack architecture
  --architecture-type      nextjs-app-router (default) | nextjs-pages | react-spa
  --server-actions         Generate server actions (default: true with --complete-architecture)
  --routes                 Generate Next.js routes (default: true with --complete-architecture)

${chalk.yellow("🤖 mycontext PM Integration Options:")}
  --pm-plan <file>         Use mycontext PM project plan JSON file
  --auto-sync              Automatically sync progress with mycontext PM
  --webhook-url <url>      Webhook URL for progress updates

${chalk.yellow("📖 Examples:")}
  ${chalk.gray("# Basic build")}
  ${chalk.cyan('mycontext build-app --description "E-commerce platform"')}

  ${chalk.gray("# Complete architecture")}
  ${chalk.cyan(
    'mycontext build-app --description "E-commerce platform" --complete-architecture'
  )}

  ${chalk.gray("# Interactive with architecture")}
  ${chalk.cyan(
    'mycontext build-app --description "E-commerce platform" --interactive'
  )}

  ${chalk.gray("# Specific architecture type")}
  ${chalk.cyan(
    'mycontext build-app --description "Blog" --complete-architecture --architecture-type nextjs-pages'
  )}

  ${chalk.gray("# Build from mycontext PM project plan")}
  ${chalk.cyan("mycontext build-app --pm-plan ./pm-project-plan.json")}

  ${chalk.gray("# Build from PM plan with auto-sync")}
  ${chalk.cyan(
    "mycontext build-app --pm-plan ./pm-plan.json --auto-sync --webhook-url https://mycontext-pm.example.com/webhook"
  )}

${chalk.yellow("🎯 What Gets Generated:")}

  ${chalk.gray("Basic Mode:")}
  • Project structure
  • Context files (PRD, types, brand)
  • Basic React components
  • Component documentation

  ${chalk.gray("Complete Architecture Mode:")}
  • Everything from Basic Mode, plus:
  • Server actions with validation
  • Next.js App Router routes
  • Self-documenting components
  • Complete architecture plan
  • Production-ready structure

${chalk.yellow("💡 Tips:")}
  • Use ${chalk.cyan("--interactive")} for guided setup
  • Use ${chalk.cyan("--complete-architecture")} for full-stack apps
  • Review generated files in .mycontext/ directory
  • Check architecture-plan.json for complete overview
`;
  }

  // Legacy methods removed - now using WorkflowAgent for all functionality
  // The new agent-based workflow provides better coordination, error handling, and user interaction
}
