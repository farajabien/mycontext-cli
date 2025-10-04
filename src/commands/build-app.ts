#!/usr/bin/env node

import chalk from "chalk";
import { promises as fs } from "fs";
import path from "path";
import { execSync } from "child_process";
import prompts from "prompts";
import { WorkflowAgent } from "../agents/implementations/WorkflowAgent";

interface BuildAppOptions {
  description: string;
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
}

export class BuildAppCommand {
  private workflowAgent = new WorkflowAgent();

  async execute(options: BuildAppOptions): Promise<void> {
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
    } = options;

    console.log(chalk.blue.bold("🚀 Building Complete App with MyContext\n"));
    console.log(chalk.gray(`Description: ${description}`));
    console.log(chalk.gray(`Output: ${output}`));
    console.log(chalk.gray(`Framework: ${framework}`));
    console.log(
      chalk.gray(`Interactive Mode: ${interactive ? "Enabled" : "Disabled"}`)
    );
    console.log(chalk.gray(`Max Retries: ${maxRetries}`));

    if (completeArchitecture) {
      console.log(chalk.blue.bold("\n🏗️  Complete Architecture Mode"));
      console.log(chalk.gray(`Architecture Type: ${architectureType}`));
      console.log(chalk.gray(`Server Actions: ${serverActions ? "Yes" : "No"}`));
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
          message: "Generate complete architecture (components + actions + routes)?",
          initial: true,
        },
        {
          type: (prev) => (prev ? "select" : null),
          name: "archType",
          message: "Choose architecture type:",
          choices: [
            { title: "Next.js App Router (Recommended)", value: "nextjs-app-router" },
            { title: "Next.js Pages Router", value: "nextjs-pages" },
            { title: "React SPA", value: "react-spa" },
          ],
          initial: 0,
        },
      ]);

      if (architecturePrompts.useCompleteArch) {
        finalCompleteArchitecture = true;
        finalArchitectureType = architecturePrompts.archType || architectureType;

        console.log(chalk.blue.bold("\n🏗️  Complete Architecture Mode Enabled"));
        console.log(chalk.gray(`Architecture Type: ${finalArchitectureType}`));
        console.log();
      }
    }

    try {
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
          console.log(chalk.green.bold("\n🏗️  Complete Architecture Generated:"));
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
        console.log(chalk.yellow(`\n🏗️  Complete Architecture Troubleshooting:`));
        console.log(chalk.gray(`   • Ensure component list exists (.mycontext/04-component-list.json)`));
        console.log(chalk.gray(`   • Check that PRD and context files are generated`));
        console.log(chalk.gray(`   • Try basic generation first without --complete-architecture`));
        console.log(chalk.gray(`   • Review architecture plan in .mycontext/architecture-plan.json`));
      }

      throw error;
    }
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

${chalk.yellow("📖 Examples:")}
  ${chalk.gray("# Basic build")}
  ${chalk.cyan("mycontext build-app --description \"E-commerce platform\"")}

  ${chalk.gray("# Complete architecture")}
  ${chalk.cyan("mycontext build-app --description \"E-commerce platform\" --complete-architecture")}

  ${chalk.gray("# Interactive with architecture")}
  ${chalk.cyan("mycontext build-app --description \"E-commerce platform\" --interactive")}

  ${chalk.gray("# Specific architecture type")}
  ${chalk.cyan("mycontext build-app --description \"Blog\" --complete-architecture --architecture-type nextjs-pages")}

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
