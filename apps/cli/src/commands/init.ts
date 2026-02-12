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
import { DesignManifestManager } from "@myycontext/core";

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
  private manifestManager = new DesignManifestManager();

  async execute(projectName: string | undefined, options: InitOptions): Promise<void> {
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

      // Safety check: Detect existing MyContext project
      const mycontextPath = path.join(projectPath, ".mycontext");
      if (await fs.pathExists(mycontextPath) && !options.force && !options.yes) {
        const { confirmOverwrite } = await prompts({
          type: "confirm",
          name: "confirmOverwrite",
          message: chalk.yellow(`⚠️  Existing .mycontext folder found in ${projectName || '.'}. Overwrite?`),
          initial: false,
        });

        if (!confirmOverwrite) {
          console.log(chalk.blue("\nInitialization cancelled. Use 'mycontext status' to audit your existing project instead."));
          return;
        }
      }

      spinner.start();

      // Determine framework (default to instantdb for backward compatibility)
      const framework = options.framework || "instantdb";

      if (framework === "instantdb") {
        // InstantDB workflow
        await this.initInstantDBProject(
          spinner,
          workingDir,
          projectPath,
          finalProjectName,
          options,
          useCurrentDir
        );
      } else if (framework === "nextjs" || framework === "next") {
        // Next.js workflow (shadcn + MyContext only)
        await this.initNextJSProject(
          spinner,
          workingDir,
          projectPath,
          finalProjectName,
          options,
          useCurrentDir
        );
      } else {
        // Default: MyContext only
        await this.initBasicProject(
          spinner,
          projectPath,
          finalProjectName,
          options,
          useCurrentDir
        );
      }
    } catch (error) {
      spinner.error({ text: "Failed to initialize project" });
      console.error(
        chalk.red(
          `Error: ${error instanceof Error ? error.message : String(error)}`
        )
      );
      throw error;
    }
  }

  /**
   * Initialize an InstantDB project with full setup
   */
  private async initInstantDBProject(
    spinner: EnhancedSpinner,
    workingDir: string,
    projectPath: string,
    projectName: string,
    options: InitOptions,
    useCurrentDir: boolean
  ): Promise<void> {
    // 1. Run shadcn init if components.json doesn't exist
    const componentsJsonPath = path.join(projectPath, "components.json");
    if (!fs.existsSync(componentsJsonPath)) {
      spinner.updateText("Running shadcn init...");
      execSync("pnpm dlx shadcn@latest init", {
        cwd: workingDir,
        stdio: "inherit",
      });
    } else {
      console.log(chalk.blue("ℹ️  shadcn/ui already initialized, skipping..."));
    }

    // 2. Prompt user for instant-cli init
    spinner.stop();
    const { runInstantInit } = await prompts({
      type: "confirm",
      name: "runInstantInit",
      message: "Run 'npx instant-cli init' to initialize InstantDB?",
      initial: true,
    });

    if (runInstantInit) {
      spinner.start();
      spinner.updateText("Running instant-cli init...");
      execSync("npx instant-cli init", {
        cwd: projectPath,
        stdio: "inherit",
      });

      // Prompt user to push schemas
      spinner.stop();
      const { pushSchemas } = await prompts({
        type: "confirm",
        name: "pushSchemas",
        message:
          "Push schemas to InstantDB dashboard? (Make sure you've configured your app)",
        initial: false,
      });

      if (pushSchemas) {
        spinner.start();
        spinner.updateText("Pushing schemas to InstantDB...");
        execSync("npx instant-cli push", {
          cwd: projectPath,
          stdio: "inherit",
        });
      }
    }

    // 3. Install @instantdb/react and @instantdb/admin
    spinner.start();
    spinner.updateText("Installing InstantDB packages...");
    execSync("pnpm add @instantdb/react @instantdb/admin", {
      cwd: projectPath,
      stdio: "inherit",
    });

    // Install bcrypt for auth utilities
    spinner.updateText("Installing auth dependencies...");
    execSync("pnpm add bcryptjs nanoid && pnpm add -D @types/bcryptjs", {
      cwd: projectPath,
      stdio: "inherit",
    });

    // 4. Copy InstantDB templates to lib folder
    spinner.updateText("Copying InstantDB template files...");
    await this.fs.copyInstantDBTemplates(projectPath);

    // 5. Initialize MyContext directory structure and context
    spinner.updateText("Initializing MyContext project files...");
    const config = await this.fs.initializeProject(
      projectName,
      options.description || `${projectName} - AI-powered app`,
      workingDir,
      useCurrentDir
    );
    await this.createInitialManifest(
      projectPath,
      projectName,
      options.description || `${projectName} - AI-powered app`
    );

    spinner.success({
      text: `Project "${projectName}" initialized successfully with InstantDB!`,
    });

    // Show next steps
    this.showNextSteps(config, "instantdb", useCurrentDir);
  }

  /**
   * Initialize a Next.js project (shadcn + MyContext only)
   */
  private async initNextJSProject(
    spinner: EnhancedSpinner,
    workingDir: string,
    projectPath: string,
    projectName: string,
    options: InitOptions,
    useCurrentDir: boolean
  ): Promise<void> {
    // 1. Run shadcn init if components.json doesn't exist
    const componentsJsonPath = path.join(projectPath, "components.json");
    if (!fs.existsSync(componentsJsonPath)) {
      spinner.updateText("Running shadcn init...");
      execSync("pnpm dlx shadcn@latest init", {
        cwd: workingDir,
        stdio: "inherit",
      });
    } else {
      console.log(chalk.blue("ℹ️  shadcn/ui already initialized, skipping..."));
    }

    // 2. Initialize MyContext directory structure and context
    spinner.updateText("Initializing MyContext project files...");
    const config = await this.fs.initializeProject(
      projectName,
      options.description || `${projectName} - Next.js app`,
      workingDir,
      useCurrentDir
    );
    await this.createInitialManifest(
      projectPath,
      projectName,
      options.description || `${projectName} - Next.js app`
    );

    spinner.success({
      text: `Project "${projectName}" initialized successfully with Next.js!`,
    });

    // Show next steps
    this.showNextSteps(config, "nextjs", useCurrentDir);
  }

  /**
   * Initialize a basic MyContext project (no framework)
   */
  private async initBasicProject(
    spinner: EnhancedSpinner,
    projectPath: string,
    projectName: string,
    options: InitOptions,
    useCurrentDir: boolean
  ): Promise<void> {
    spinner.updateText("Initializing MyContext project files...");
    const config = await this.fs.initializeProject(
      projectName,
      options.description || `${projectName} - AI-powered app`,
      process.cwd(),
      useCurrentDir
    );
    await this.createInitialManifest(
      projectPath,
      projectName,
      options.description || `${projectName} - AI-powered app`
    );

    spinner.success({
      text: `Project "${projectName}" initialized successfully!`,
    });

    // Show next steps
    this.showNextSteps(config, undefined, useCurrentDir);
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
    const projectPath = useCurrentDir ? "." : config.name;

    console.log(chalk.blue("\n🎯 Quick Start:\n"));

    if (!useCurrentDir) {
      console.log(chalk.yellow("1. Navigate to your project:"));
      console.log(chalk.gray(`   cd ${projectPath}\n`));
    }

    if (framework === "instantdb") {
      console.log(chalk.yellow("2. Configure InstantDB:"));
      console.log(
        chalk.gray("   • Add your InstantDB App ID to .env.local:")
      );
      console.log(
        chalk.cyan("     NEXT_PUBLIC_INSTANT_APP_ID=your-app-id")
      );
      console.log(
        chalk.gray("   • Template files copied to lib/ (or src/lib/):")
      );
      console.log(chalk.gray("     - instant-client.ts (Client SDK)"));
      console.log(chalk.gray("     - instant-admin.ts (Admin SDK)"));
      console.log(chalk.gray("     - auth.ts (Auth helpers)"));
      console.log(chalk.gray("     - instantdb-storage.ts (File storage)\n"));
    }

    console.log(chalk.yellow("3. ️  Analyze a screenshot (Gemini 2.0 Flash):"));
    console.log(chalk.cyan("   mycontext analyze /path/to/screenshot.png"));
    console.log(
      chalk.gray("   # Reverse-engineer any UI into a comprehensive spec!\n")
    );

    console.log(chalk.yellow("4. Configure AI provider:"));
    console.log(chalk.gray("   🔥 GitHub Models (GPT-4o - Free & High Quality):"));
    console.log(chalk.gray("      Get GitHub token: https://github.com/settings/tokens"));
    console.log(chalk.cyan("      echo 'GITHUB_TOKEN=your-token' >> .mycontext/.env\n"));
    console.log(chalk.gray("   ✨ Gemini (Free Tier + Vision for screenshots):"));
    console.log(chalk.gray("      Get API key: https://aistudio.google.com/apikey"));
    console.log(chalk.cyan("      echo 'GEMINI_API_KEY=your-key' >> .mycontext/.env\n"));
    console.log(chalk.gray("   📌 Claude (Best for advanced reasoning):"));
    console.log(chalk.gray("      https://console.anthropic.com/\n"));

    console.log(chalk.yellow("5. Generate full context:"));
    console.log(chalk.gray("   mycontext generate context --full\n"));

    console.log(chalk.yellow("6. Start development:"));
    console.log(chalk.gray("   pnpm dev\n"));

    console.log(chalk.green("✨ Tips:"));
    console.log(chalk.gray("• Check .mycontext/ for all generated files"));
    if (framework === "instantdb") {
      console.log(
        chalk.gray("• InstantDB templates are ready to use in your lib/ folder")
      );
      console.log(
        chalk.gray("• Update instant.schema.ts with your data model")
      );
    }
    console.log(chalk.gray("• Use --yes flag to skip prompts"));
    console.log(chalk.gray("• Run 'mycontext status' to check project progress\n"));

    // Exit the process gracefully after displaying all information
    process.exit(0);
  }

  /**
   * Create the initial design manifest as a Hard Gravity anchor
   */
  private async createInitialManifest(
    projectPath: string,
    projectName: string,
    description: string
  ): Promise<void> {
    const manager = new DesignManifestManager(projectPath);
    const manifest = manager.createDefaultManifest(projectName, description);
    await manager.saveDesignManifest(manifest);
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
