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
}

export class InitCommand {
  private fs = new FileSystemManager();

  async execute(projectName: string, options: InitOptions): Promise<void> {
    const spinner = new EnhancedSpinner("Initializing project...");

    try {
      // Display ASCII art branding
      this.displayBranding();

      // Handle current directory initialization with "."
      let finalProjectName = projectName;
      let useCurrentDir = false;

      if (projectName === ".") {
        const currentDir = path.basename(process.cwd());
        finalProjectName = currentDir;
        useCurrentDir = true;
        console.log(
          chalk.cyan(`📁 Initializing in current directory: ${currentDir}`)
        );
      } else {
        // Validate project name for new directories
        if (!this.isValidProjectName(projectName)) {
          throw new Error(
            "Project name must be alphanumeric with hyphens or underscores only"
          );
        }
      }

      // Check if this is an existing project and analyze it
      if (useCurrentDir || options.existing) {
        const isExistingProject = await this.isExistingProject(process.cwd());
        if (isExistingProject) {
          console.log(chalk.yellow("🔍 Existing project detected!"));

          if (options.analyze) {
            // Run analysis on existing project
            await this.analyzeExistingProject(process.cwd(), options);
            return;
          } else {
            // Ask user if they want to analyze
            const shouldAnalyze = await this.askToAnalyze();
            if (shouldAnalyze) {
              await this.analyzeExistingProject(process.cwd(), options);
              return;
            }
          }
        }
      }

      const workingDir = process.cwd();

      // Interactive prompts if not using --yes flag
      let finalDescription = options.description;
      let finalFramework = options.framework;

      // Set framework based on explicit flags
      if (options.next || options.scaffoldNext) {
        finalFramework = "nextjs";
      }

      // Minimal prompts - only ask for project name if not provided
      if (!options.yes && !finalProjectName) {
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
      }

      // Smart defaults - no prompts needed
      finalDescription = finalDescription || `${finalProjectName} - AI-powered app`;
      finalFramework = finalFramework || "instantdb"; // Auto-select InstantDB

      // Validate required fields
      if (!finalDescription) {
        throw new Error("Project description is required");
      }

      spinner.start();

      // Setup framework-specific project with correct order
      if (finalFramework === "instantdb") {
        // 1. Setup Next.js first (if needed)
        const projectPath = useCurrentDir
          ? workingDir
          : path.join(workingDir, finalProjectName);
        const packageJsonPath = path.join(projectPath, "package.json");

        if (!(await fs.pathExists(packageJsonPath))) {
          spinner.updateText("Setting up Next.js project...");
          await this.setupNextJSProject(
            finalProjectName,
            workingDir,
            useCurrentDir
          );
        }

        // 2. Setup shadcn/ui FIRST (before InstantDB)
        const shouldInitShadcn = options.skipShadcn !== true;
        if (shouldInitShadcn) {
          spinner.updateText("Initializing shadcn/ui...");
          await this.setupShadcn(finalProjectName, workingDir, useCurrentDir);
        }

        // 3. Setup InstantDB (MyContext branded flow)
        spinner.stop(); // Stop spinner for InstantDB setup output
        await this.setupInstantDBProject(
          finalProjectName,
          workingDir,
          useCurrentDir
        );
        spinner.start(); // Restart spinner for remaining setup
      } else if (finalFramework === "nextjs") {
        // Next.js only setup
        spinner.updateText("Setting up Next.js project...");
        await this.setupNextJSProject(
          finalProjectName,
          workingDir,
          useCurrentDir
        );

        // Setup shadcn/ui for Next.js projects
        const shouldInitShadcn = options.skipShadcn !== true;
        if (shouldInitShadcn) {
          const projectPath = useCurrentDir
            ? workingDir
            : path.join(workingDir, finalProjectName);
          const packageJsonPath = path.join(projectPath, "package.json");
          if (await fs.pathExists(packageJsonPath)) {
            spinner.updateText("Initializing shadcn/ui...");
            await this.setupShadcn(finalProjectName, workingDir, useCurrentDir);
          } else {
            console.log(
              chalk.yellow(
                "   ⚠️ shadcn/ui init skipped (no package.json found). Run it inside an existing Next.js project."
              )
            );
            console.log(chalk.gray("   pnpm dlx shadcn@latest init -y"));
          }
        }
      }

      // Initialize MyContext directory structure and context after framework setup
      spinner.updateText("Initializing MyContext project files...");
      const config = await this.fs.initializeProject(
        finalProjectName,
        finalDescription,
        workingDir,
        useCurrentDir
      );

      // Write .mycontext/.env.example with guidance
      try {
        const projectPath = useCurrentDir
          ? workingDir
          : path.join(workingDir, finalProjectName);
        const envDir = path.join(projectPath, ".mycontext");
        await fs.ensureDir(envDir);
        const envExamplePath = path.join(envDir, ".env.example");
        const envExample = await EnvExampleGenerator.generateForProject(
          projectPath
        );
        await fs.writeFile(envExamplePath, envExample);
      } catch {}

      // Setup Studio (if bundled)
      const projectPath = useCurrentDir
        ? workingDir
        : path.join(workingDir, finalProjectName);
      await this.setupStudio(projectPath);

      spinner.success({
        text: `Project "${finalProjectName}" initialized successfully!`,
      });

      // PRD Review Workflow - Encourage users to review and update PRD
      await this.handlePRDReviewWorkflow(
        finalProjectName,
        workingDir,
        useCurrentDir
      );

      // Show next steps with framework-specific guidance
      this.showNextSteps(config, finalFramework, useCurrentDir);
    } catch (error) {
      spinner.error({ text: "Failed to initialize project" });
      // Don't re-throw - let the CLI handle it
    }
  }

  private async handlePRDReviewWorkflow(
    projectName: string,
    workingDir: string,
    useCurrentDir: boolean
  ): Promise<void> {
    console.log(chalk.blue("\n📋 PRD Review Workflow"));
    console.log(
      chalk.yellow(
        "❗ IMPORTANT: Please review and update your PRD before proceeding with context generation."
      )
    );
    console.log(
      chalk.gray(
        "   The PRD is the foundation of your project - make sure it accurately describes your requirements."
      )
    );

    const projectPath = useCurrentDir
      ? workingDir
      : path.join(workingDir, projectName);
    const prdPath = path.join(projectPath, ".mycontext", "01-prd.md");

    console.log(chalk.cyan("\n📄 Your PRD has been initialized at:"));
    console.log(chalk.gray(`   ${prdPath}`));

    console.log(chalk.cyan("\n🔍 Next steps:"));
    console.log(chalk.gray("   1. Open and review the PRD file"));
    console.log(chalk.gray("   2. Update it with your specific requirements"));
    console.log(
      chalk.gray(
        "   3. Add user stories, acceptance criteria, and technical details"
      )
    );
    console.log(
      chalk.gray("   4. Run 'mycontext generate context' when ready")
    );

    console.log(
      chalk.yellow(
        "\n⚠️  Reminder: Context generation requires a reviewed PRD!"
      )
    );
    console.log(
      chalk.gray(
        "   The AI will use your PRD to generate accurate types and brand guidelines."
      )
    );
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

    console.log(chalk.yellow("2. �️  Analyze a screenshot (Gemini 2.0 Flash):"));
    console.log(chalk.cyan("   mycontext analyze /path/to/screenshot.png"));
    console.log(chalk.gray("   # Reverse-engineer any UI into a comprehensive spec!\n"));

    console.log(chalk.yellow("3. Configure AI provider:"));
    console.log(chalk.gray("   📌 Gemini (Free - Recommended for screenshots):"));
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

  private async detectPackageManager(): Promise<"pnpm" | "npm" | "yarn"> {
    const pnpmLock = path.join(process.cwd(), "pnpm-lock.yaml");
    const yarnLock = path.join(process.cwd(), "yarn.lock");
    const packageLock = path.join(process.cwd(), "package-lock.json");

    if (await fs.pathExists(pnpmLock)) return "pnpm";
    if (await fs.pathExists(yarnLock)) return "yarn";
    if (await fs.pathExists(packageLock)) return "npm";

    return "pnpm"; // Default to pnpm
  }

  private async installInstantDBDeps(projectPath: string): Promise<void> {
    try {
      const packageManager = await this.detectPackageManager();
      const installCmd =
        packageManager === "pnpm"
          ? "pnpm add"
          : packageManager === "yarn"
          ? "yarn add"
          : "npm install";

      console.log(chalk.gray("   Installing InstantDB dependencies..."));
      execSync(
        `${installCmd} @instantdb/react @instantdb/admin @tanstack/react-query`,
        {
          cwd: projectPath,
          stdio: "inherit",
          timeout: 180000,
        }
      );
      console.log(chalk.green("   ✅ Dependencies installed"));
    } catch (error) {
      console.log(
        chalk.yellow("   ⚠️ Failed to install dependencies automatically")
      );
      console.log(chalk.gray("   Run manually:"));
      console.log(
        chalk.gray(
          "   pnpm add @instantdb/react @instantdb/admin @tanstack/react-query"
        )
      );
    }
  }

  private async generateInstantDBSchema(projectPath: string): Promise<void> {
    try {
      const schemaTemplatePath = path.join(
        __dirname,
        "../templates/instantdb/schema.template.ts"
      );
      const schemaContent = await fs.readFile(schemaTemplatePath, "utf-8");
      const schemaPath = path.join(projectPath, "instant.schema.ts");

      await fs.writeFile(schemaPath, schemaContent);
      console.log(chalk.green("   ✅ instant.schema.ts created"));
    } catch (error) {
      console.log(chalk.yellow("   ⚠️ Failed to create schema file"));
    }
  }

  private async generateInstantDBPerms(projectPath: string): Promise<void> {
    try {
      const permsTemplatePath = path.join(
        __dirname,
        "../templates/instantdb/perms.template.ts"
      );
      const permsContent = await fs.readFile(permsTemplatePath, "utf-8");
      const permsPath = path.join(projectPath, "instant.perms.ts");

      await fs.writeFile(permsPath, permsContent);
      console.log(chalk.green("   ✅ instant.perms.ts created"));
    } catch (error) {
      console.log(chalk.yellow("   ⚠️ Failed to create permissions file"));
    }
  }

  private async generateDBClient(projectPath: string): Promise<void> {
    try {
      const dbTemplatePath = path.join(
        __dirname,
        "../templates/instantdb/db.template.ts"
      );
      const dbContent = await fs.readFile(dbTemplatePath, "utf-8");
      const libDir = path.join(projectPath, "lib");
      await fs.ensureDir(libDir);
      const dbPath = path.join(libDir, "db.ts");

      await fs.writeFile(dbPath, dbContent);
      console.log(chalk.green("   ✅ lib/db.ts created"));
    } catch (error) {
      console.log(chalk.yellow("   ⚠️ Failed to create database client"));
    }
  }

  private async createInstantDBEnv(
    projectPath: string,
    appId?: string
  ): Promise<void> {
    try {
      const envPath = path.join(projectPath, ".env");
      const envContent = `# InstantDB Configuration
NEXT_PUBLIC_INSTANT_APP_ID=${appId || "__YOUR_APP_ID_HERE__"}

# Get your app ID from: https://instantdb.com/dash
# Create a new app or use an existing one
`;

      // Check if .env exists
      if (await fs.pathExists(envPath)) {
        const existingEnv = await fs.readFile(envPath, "utf-8");
        if (!existingEnv.includes("NEXT_PUBLIC_INSTANT_APP_ID")) {
          await fs.appendFile(envPath, "\n" + envContent);
          console.log(chalk.green("   ✅ .env updated with InstantDB config"));
        } else {
          console.log(chalk.gray("   ✅ .env already has InstantDB config"));
        }
      } else {
        await fs.writeFile(envPath, envContent);
        console.log(chalk.green("   ✅ .env created"));
      }
    } catch (error) {
      console.log(chalk.yellow("   ⚠️ Failed to create .env file"));
    }
  }

  private async generateSampleComponents(projectPath: string): Promise<void> {
    try {
      // Generate home-client.tsx
      const homeClientTemplatePath = path.join(
        __dirname,
        "../templates/instantdb/home-client.template.tsx"
      );
      const homeClientContent = await fs.readFile(
        homeClientTemplatePath,
        "utf-8"
      );
      const appDir = path.join(projectPath, "app");
      await fs.ensureDir(appDir);
      const homeClientPath = path.join(appDir, "home-client.tsx");

      await fs.writeFile(homeClientPath, homeClientContent);
      console.log(chalk.green("   ✅ app/home-client.tsx created"));

      // Generate/update page.tsx
      const pageTemplatePath = path.join(
        __dirname,
        "../templates/instantdb/page.template.tsx"
      );
      const pageContent = await fs.readFile(pageTemplatePath, "utf-8");
      const pagePath = path.join(appDir, "page.tsx");

      await fs.writeFile(pagePath, pageContent);
      console.log(chalk.green("   ✅ app/page.tsx updated"));
    } catch (error) {
      console.log(chalk.yellow("   ⚠️ Failed to create sample components"));
    }
  }

  private async pushInstantDBSchema(projectPath: string): Promise<void> {
    try {
      console.log(chalk.gray("   Pushing schema to InstantDB..."));
      execSync("npx instant-cli@latest push -y", {
        cwd: projectPath,
        stdio: "inherit",
        timeout: 60000,
      });
      console.log(chalk.green("   ✅ Schema pushed to InstantDB"));
    } catch (error) {
      console.log(
        chalk.yellow(
          "   ⚠️ Schema push failed (you can push it manually later)"
        )
      );
      console.log(chalk.gray("   Run: npx instant-cli@latest push"));
    }
  }

  private isValidProjectName(name: string): boolean {
    // Allow alphanumeric, hyphens, and underscores
    return /^[a-zA-Z0-9_-]+$/.test(name);
  }

  private async setupInstantDBProject(
    projectName: string,
    workingDir: string,
    useCurrentDir?: boolean
  ): Promise<void> {
    try {
      const projectPath = useCurrentDir
        ? workingDir
        : path.join(workingDir, projectName);

      // Check if InstantDB project already exists
      const instantSchemaPath = path.join(projectPath, "instant.schema.ts");
      const packageJsonPath = path.join(projectPath, "package.json");

      if (
        (await fs.pathExists(instantSchemaPath)) &&
        (await fs.pathExists(packageJsonPath))
      ) {
        console.log(chalk.gray("   ✅ InstantDB project structure detected"));
        return;
      }

      console.log(chalk.blue("\n🗄️  Setting up InstantDB...\n"));

      // Step 1: Install dependencies
      await this.installInstantDBDeps(projectPath);

      // Step 2: Generate schema
      await this.generateInstantDBSchema(projectPath);

      // Step 3: Generate permissions
      await this.generateInstantDBPerms(projectPath);

      // Step 4: Create database client
      await this.generateDBClient(projectPath);

      // Step 5: Create environment file
      await this.createInstantDBEnv(projectPath);

      // Step 6: Generate sample components
      await this.generateSampleComponents(projectPath);

      // Step 7: Push schema to InstantDB
      await this.pushInstantDBSchema(projectPath);

      console.log(chalk.green("\n✅ InstantDB setup complete!\n"));
      console.log(chalk.yellow("📝 Next steps:"));
      console.log(
        chalk.gray("   1. Get your App ID from: https://instantdb.com/dash")
      );
      console.log(
        chalk.gray("   2. Update NEXT_PUBLIC_INSTANT_APP_ID in .env")
      );
      console.log(chalk.gray("   3. Run: pnpm dev"));
      console.log(
        chalk.gray("   4. Open http://localhost:3000 to see your todo app\n")
      );
    } catch (error) {
      console.log(
        chalk.yellow(
          `\n⚠️ InstantDB setup encountered an issue: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        )
      );
      console.log(
        chalk.gray("   You can complete the setup manually if needed")
      );
      console.log(
        chalk.blue("🔄 MyContext will continue with project setup...\n")
      );
    }
  }

  private async setupNextJSProject(
    projectName: string,
    workingDir: string,
    useCurrentDir?: boolean
  ): Promise<void> {
    try {
      const projectPath = path.join(workingDir, projectName);

      // Check if Next.js project already exists
      const packageJsonPath = path.join(projectPath, "package.json");
      if (await fs.pathExists(packageJsonPath)) {
        console.log(chalk.gray("   ✅ Next.js project structure detected"));
        return;
      }

      // Create Next.js project
      console.log(chalk.gray("   Creating Next.js project..."));
      try {
        execSync(
          `npx create-next-app@latest ${projectName} --typescript --tailwind --eslint --app --import-alias "@/*" --yes`,
          {
            cwd: workingDir,
            stdio: "inherit",
            timeout: 300000, // 5 minutes
          }
        );
        console.log(chalk.green("   ✅ Next.js project created"));
      } catch (error) {
        console.log(
          chalk.yellow(`   ⚠️ Failed to create Next.js project automatically`)
        );
        console.log(chalk.gray(`   Please create it manually:`));
        console.log(
          chalk.gray(
            `   npx create-next-app@latest ${projectName} --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"`
          )
        );
      }
    } catch (error) {
      console.log(
        chalk.yellow(
          `   ⚠️ Next.js setup encountered an issue: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        )
      );
      console.log(
        chalk.gray("   You can create the Next.js project manually if needed")
      );
    }
  }

  private async setupShadcn(
    projectName: string,
    workingDir: string,
    useCurrentDir?: boolean
  ): Promise<void> {
    const projectPath = path.join(workingDir, projectName);
    try {
      console.log(chalk.gray("   Running shadcn/ui init (pnpm first)..."));
      try {
        execSync(`pnpm dlx shadcn@latest init -y`, {
          cwd: projectPath,
          stdio: "inherit",
          timeout: 180000,
        });
        console.log(chalk.green("   ✅ shadcn/ui initialized (pnpm)"));
        return;
      } catch (e) {
        console.log(
          chalk.gray("   pnpm not available or failed, trying npx...")
        );
      }

      execSync(`npx shadcn@latest init -y`, {
        cwd: projectPath,
        stdio: "inherit",
        timeout: 180000,
      });
      console.log(chalk.green("   ✅ shadcn/ui initialized (npx)"));
    } catch (error) {
      console.log(
        chalk.yellow(
          "   ⚠️ shadcn/ui init failed. You can run it manually inside the project:"
        )
      );
      console.log(chalk.gray("   pnpm dlx shadcn@latest init -y"));
      console.log(chalk.gray("   # or"));
      console.log(chalk.gray("   npx shadcn@latest init -y"));
    }
  }

  private async isExistingProject(projectPath: string): Promise<boolean> {
    const packageJsonPath = path.join(projectPath, "package.json");
    const instantSchemaPath = path.join(projectPath, "instant.schema.ts");
    const nextConfigPath = path.join(projectPath, "next.config.js");
    const nextConfigTsPath = path.join(projectPath, "next.config.ts");

    const hasPackageJson = await fs.pathExists(packageJsonPath);
    const hasInstantSchema = await fs.pathExists(instantSchemaPath);
    const hasNextConfig =
      (await fs.pathExists(nextConfigPath)) ||
      (await fs.pathExists(nextConfigTsPath));

    if (!hasPackageJson) return false;

    try {
      const packageJson = JSON.parse(
        await fs.readFile(packageJsonPath, "utf-8")
      );

      // Check for InstantDB project
      const hasInstantDependency =
        packageJson.dependencies?.["@instantdb/react"] ||
        packageJson.dependencies?.["@instantdb/core"];

      // Check for Next.js project
      const hasNextDependency =
        packageJson.dependencies?.next || packageJson.devDependencies?.next;

      return (
        (hasInstantDependency && hasInstantSchema) ||
        (hasNextDependency && hasNextConfig)
      );
    } catch {
      return false;
    }
  }

  private async askToAnalyze(): Promise<boolean> {
    const response = await prompts({
      type: "confirm",
      name: "analyze",
      message:
        "Would you like to analyze this existing project and generate context files?",
      initial: true,
    });

    return response.analyze;
  }

  private async analyzeExistingProject(
    projectPath: string,
    options: InitOptions
  ): Promise<void> {
    console.log(chalk.blue.bold("🔍 Analyzing Existing Project\n"));

    try {
      // Import and use AnalyzeCommand
      const { AnalyzeCommand } = await import("./analyze");
      const analyzeCommand = new AnalyzeCommand();

      await analyzeCommand.execute(projectPath, {
        output: ".mycontext",
        generateContext: true,
        includeBrand: true,
        includeTypes: true,
        includeComponents: true,
        verbose: options.verbose || false,
      });

      console.log(
        chalk.green.bold("\n✅ Existing project analysis completed!")
      );
      console.log(chalk.yellow("\n📋 Next Steps:"));
      console.log(
        chalk.gray("1. Review the generated context files in .mycontext/")
      );
      console.log(
        chalk.gray(
          "2. Run 'mycontext generate context --full' to enhance context"
        )
      );
      console.log(
        chalk.gray(
          "3. Run 'mycontext generate components-list' to plan new components"
        )
      );
      console.log(
        chalk.gray(
          "4. Run 'mycontext generate-components' to create new components"
        )
      );
    } catch (error) {
      console.error(chalk.red("❌ Analysis failed:"), error);
      // Don't re-throw - let the CLI handle it
    }
  }

  private async setupStudio(projectPath: string): Promise<void> {
    try {
      const studioPath = path.join(projectPath, "studio");

      // Check if Studio is bundled (exists in CLI directory)
      const bundledStudioPath = path.join(__dirname, "../../studio");
      if (!(await this.fs.exists(bundledStudioPath))) {
        console.log(chalk.yellow("📱 Studio not bundled - skipping setup"));
        return;
      }

      console.log(chalk.blue("📱 Setting up MyContext Studio preview..."));

      // Copy Studio to project
      await fs.copy(bundledStudioPath, studioPath);

      // Install Studio dependencies
      console.log(chalk.blue("📦 Installing Studio dependencies..."));
      try {
        execSync("pnpm install", {
          cwd: studioPath,
          stdio: "inherit",
          timeout: 120000, // 2 minutes timeout
        });
      } catch (error) {
        console.log(
          chalk.yellow(
            "⚠️  Failed to install Studio dependencies. You can run 'cd studio && pnpm install' manually."
          )
        );
      }

      // Create .env.local for Studio
      const envLocalPath = path.join(studioPath, ".env.local");
      const envContent = `# MyContext Studio Configuration
NEXT_PUBLIC_CLI_COMPONENTS_PATH=../components/generated
NEXT_PUBLIC_STUDIO_VERSION=0.1.0
`;
      await fs.writeFile(envLocalPath, envContent);

      console.log(chalk.green("✅ Studio setup complete!"));
      console.log(
        chalk.gray("   Run 'pnpm studio:dev' to start the preview server")
      );
    } catch (error) {
      console.log(
        chalk.yellow(
          "⚠️  Studio setup failed - you can set it up manually later"
        )
      );
    }
  }
}
