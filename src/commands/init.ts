import chalk from "chalk";
import prompts from "prompts";
import figlet from "figlet";
import gradient from "gradient-string";
import { EnhancedSpinner } from "../utils/spinner";
import { FileSystemManager } from "../utils/fileSystem";
import { CommandOptions } from "../types";
import { execSync } from "child_process";
import * as fs from "fs-extra";
import * as path from "path";
import { EnvExampleGenerator } from "../utils/envExampleGenerator";

interface InitOptions extends CommandOptions {
  description?: string;
  force?: boolean;
  next?: boolean;
  framework?: string;
  withShadcn?: boolean;
  scaffoldNext?: boolean;
  skipShadcn?: boolean;
  analyze?: boolean; // New option to analyze existing project
  existing?: boolean; // New option to work with existing project
  specOnly?: boolean; // New option to skip framework scaffolding
}

export class InitCommand {
  private fs = new FileSystemManager();

  async execute(projectName: string, options: InitOptions): Promise<void> {
    const spinner = new EnhancedSpinner("Initializing project...");

    try {
      // Display ASCII art branding
      this.displayBranding();

      // Handle project name
      let finalProjectName = projectName;
      let useCurrentDir = projectName === ".";

      if (!finalProjectName && !options.yes) {
        const responses = await prompts([
          {
            type: "text",
            name: "name",
            message: "Project name:",
            initial: "my-app",
            validate: (value: string) =>
              value.length > 0 || "Project name is required",
          },
        ]);
        finalProjectName = responses.name || "my-app";
        useCurrentDir = finalProjectName === ".";
      }

      if (!finalProjectName) {
        finalProjectName = "my-app";
      }

      const workingDir = process.cwd();
      const projectPath = useCurrentDir
        ? workingDir
        : path.resolve(workingDir, finalProjectName);

      spinner.start();

      // 1. pnpm dlx shadcn@latest init
      spinner.updateText("Running shadcn init...");
      execSync("pnpm dlx shadcn@latest init", {
        cwd: workingDir,
        stdio: "inherit",
      });

      // 2. npx instant-cli init
      spinner.updateText("Running instant-cli init...");
      execSync("npx instant-cli init", {
        cwd: projectPath,
        stdio: "inherit",
      });

      // 3. pnpm add @instantdb/react
      spinner.updateText("Installing @instantdb/react...");
      execSync("pnpm add @instantdb/react", {
        cwd: projectPath,
        stdio: "inherit",
      });

      // Initialize MyContext directory structure and context
      spinner.updateText("Initializing MyContext project files...");
      const config = await this.fs.initializeProject(
        finalProjectName,
        options.description || `${finalProjectName} - AI-powered app`,
        workingDir,
        useCurrentDir
      );

      spinner.success({
        text: `Project "${finalProjectName}" initialized successfully!`,
      });

      // Show next steps
      this.showNextSteps(config, "instantdb", useCurrentDir);
    } catch (error) {
      spinner.error({ text: "Failed to initialize project" });
      console.error(chalk.red(`Error: ${error instanceof Error ? error.message : String(error)}`));
    }
  }

  private isValidProjectName(name: string): boolean {
    // Allow alphanumeric, hyphens, and underscores
    return /^[a-zA-Z0-9._-]+$/.test(name);
  }

  private showNextSteps(
    config: any,
    framework?: string,
    useCurrentDir?: boolean
  ): void {
    const projectPath = useCurrentDir ? process.cwd() : config.name;

    console.log(chalk.blue("\n🎯 Quick Start:\n"));

    console.log(chalk.yellow("1. Navigate to your project:"));
    console.log(chalk.gray(`   cd ${projectPath}\n`));

    console.log(chalk.yellow("2. ️  Analyze a screenshot (Gemini 2.0 Flash):"));
    console.log(chalk.cyan("   mycontext analyze /path/to/screenshot.png"));
    console.log(chalk.gray("   # Reverse-engineer any UI into a comprehensive spec!\n"));

    console.log(chalk.yellow("3. Configure AI provider:"));
    console.log(chalk.gray("   � Gemini (Free - Recommended for screenshots):"));
    console.log(chalk.gray("      Get API key: https://aistudio.google.com/apikey"));
    console.log(chalk.cyan("      echo 'GEMINI_API_KEY=your-key' >> .mycontext/.env\n"));
    console.log(chalk.gray("   📌 Claude (Best for text generation):"));
    console.log(chalk.gray("      https://console.anthropic.com/\n"));

    console.log(chalk.yellow("4. Generate full context:"));
    console.log(chalk.gray("   mycontext generate context --full\n"));

    console.log(chalk.yellow("5. Start development:"));
    console.log(chalk.gray("   pnpm dev\n"));

    console.log(chalk.green("✨ Tips:"));
    console.log(chalk.gray("• Check .mycontext/ for all generated files"));
    console.log(chalk.gray("• Use --yes flag to skip prompts"));
    console.log(chalk.gray("• Run 'mycontext status' to check project progress\n"));

    // Exit the process gracefully after displaying all information
    process.exit(0);
  }

  private displayBranding(): void {
    try {
      const logo = figlet.textSync("MyContext", {
        font: "Standard",
        horizontalLayout: "default",
        verticalLayout: "default",
      });

      // Apply gradient to the logo
      console.log(gradient.pastel.multiline(logo));
      console.log(
        chalk.cyan.bold(
          "    🚀 Screenshot → Spec → Code (Powered by Gemini 2.0 Flash)\n"
        )
      );
    } catch (error) {
      // Fallback to simple text if figlet fails
      console.log(chalk.blue.bold("\n🚀 MyContext - Screenshot to Spec\n"));
    }
  }
}
