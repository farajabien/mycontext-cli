import chalk from "chalk";
import prompts from "prompts";
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
      console.log(chalk.blue.bold("🚀 MyContext Project Initialization\n"));

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

      if (!options.yes) {
        const responses = await prompts([
          {
            type: !finalProjectName ? "text" : null,
            name: "name",
            message: "Project name:",
            initial: "my-context-app",
            validate: (value: string) =>
              value.length > 0 || "Project name is required",
          },
          {
            type: !finalDescription ? "text" : null,
            name: "description",
            message: "Project description:",
            validate: (value: string) =>
              value.length > 10 || "Description must be at least 10 characters",
          },
          {
            type: !finalFramework ? "select" : null,
            name: "framework",
            message: "Choose your frontend framework:",
            choices: [
              { title: "InstantDB (Recommended)", value: "instantdb" },
              { title: "Next.js", value: "nextjs" },
              { title: "Other (Manual setup)", value: "other" },
            ],
            initial: 0, // Default to InstantDB
          },
        ]);

        finalProjectName = responses.name || finalProjectName;
        finalDescription = responses.description || finalDescription;
        finalFramework = responses.framework || finalFramework;
      } else {
        // Use defaults if --yes flag is used
        finalDescription =
          finalDescription ||
          "A MyContext AI-powered component generation project";
        // Keep lightweight by default when non-interactive
        finalFramework = finalFramework || "instantdb";
      }

      // Validate required fields
      if (!finalDescription) {
        throw new Error("Project description is required");
      }

      spinner.start();

      // Setup framework-specific project only when explicitly selected
      if (finalFramework === "instantdb") {
        spinner.stop(); // Stop spinner before interactive InstantDB setup
        await this.setupInstantDBProject(
          finalProjectName,
          workingDir,
          useCurrentDir
        );
        spinner.start(); // Restart spinner for remaining setup
      } else if (finalFramework === "nextjs") {
        spinner.updateText("Setting up Next.js project...");
        await this.setupNextJSProject(
          finalProjectName,
          workingDir,
          useCurrentDir
        );
      }

      // Initialize MyContext directory structure and context after framework setup
      spinner.updateText("Initializing MyContext project files...");
      const config = await this.fs.initializeProject(
        finalProjectName,
        finalDescription,
        workingDir,
        useCurrentDir
      );

      // Initialize shadcn/ui by default when a project exists unless explicitly skipped
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
      throw error;
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

    console.log(chalk.blue("\n🎯 Next Steps:\n"));

    console.log(chalk.yellow("1. Navigate to your project:"));
    console.log(chalk.gray(`   cd ${projectPath}\n`));

    console.log(chalk.yellow("2. 📋 REVIEW YOUR PRD (REQUIRED):"));
    console.log(chalk.gray("   • Open .mycontext/01-prd.md"));
    console.log(chalk.gray("   • Update with your specific requirements"));
    console.log(chalk.gray("   • Add user stories and technical details"));
    console.log(
      chalk.gray("   • This is crucial for accurate AI generation\n")
    );

    console.log(
      chalk.yellow("3. Configure AI provider (Claude SDK - RECOMMENDED!):")
    );
    console.log(
      chalk.gray("   # Get Claude API key: https://console.anthropic.com/\n")
    );
    console.log(
      chalk.gray("   # Copy .env.example to .env and add your key:\n")
    );
    console.log(chalk.cyan("   cp .mycontext/.env.example .mycontext/.env"));
    console.log(
      chalk.cyan(
        "   # Edit .mycontext/.env and replace placeholder with your actual Claude API key\n"
      )
    );

    console.log(chalk.yellow("4. Generate context files (after PRD review):"));
    console.log(chalk.gray("   mycontext generate context\n"));

    console.log(chalk.yellow("5. Validate your PRD:"));
    console.log(chalk.gray("   mycontext validate prd\n"));

    console.log(chalk.yellow("6. Plan your components:"));
    console.log(
      chalk.gray(
        "   mycontext generate components-list   # alias: component-list\n"
      )
    );

    console.log(
      chalk.yellow(
        "7. Set up InstantDB (already configured in InstantDB projects):"
      )
    );
    console.log(
      chalk.gray("   # InstantDB is already set up! Check instant.schema.ts")
    );
    console.log(chalk.gray("   # For other databases:"));
    console.log(chalk.gray("   mycontext setup-database"));
    console.log(chalk.gray("   # For other MCP providers:"));
    console.log(chalk.gray("   mycontext setup-mcp --provider github\n"));

    console.log(chalk.yellow("8. Generate components:"));
    console.log(
      chalk.gray(
        "   mycontext generate-components all --with-tests   # optional tests"
      )
    );

    console.log(chalk.yellow("10. Preview components:"));
    console.log(chalk.gray("   Visit /preview (dev server)"));
    console.log(
      chalk.gray("   mycontext normalize preview   # optional final layout\n")
    );

    console.log(chalk.yellow("⚠️  IMPORTANT NOTES:"));
    console.log(
      chalk.gray("• Get your Claude API key at: https://console.anthropic.com/")
    );
    console.log(
      chalk.gray(
        "• Always review your PRD (.mycontext/01-prd.md) before generating context"
      )
    );
    console.log(
      chalk.gray(
        "• The AI uses your PRD to generate accurate types and components"
      )
    );
    console.log(chalk.gray("• Use --yes flag to skip interactive prompts"));
    console.log(
      chalk.gray("• Check .mycontext directory for all generated files")
    );
    console.log(
      chalk.gray("• Run 'mycontext status' to check project progress\n")
    );
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

      // Create InstantDB project with user interaction
      console.log(chalk.blue("\n🚀 Starting InstantDB Project Creation"));
      console.log(
        chalk.gray(
          "   You'll now go through the InstantDB setup process interactively."
        )
      );
      console.log(
        chalk.gray(
          "   Complete the setup, and MyContext will continue automatically.\n"
        )
      );

      try {
        // Use spawn to handle interactive prompts properly
        const { spawn } = await import("child_process");
        const createInstantApp = spawn(
          "npx",
          ["create-instant-app@latest", projectName],
          {
            cwd: workingDir,
            stdio: ["inherit", "inherit", "inherit"], // Allow stdin/stdout/stderr to pass through
            shell: true,
          }
        );

        await new Promise<void>((resolve, reject) => {
          createInstantApp.on("close", (code) => {
            if (code === 0) {
              console.log(
                chalk.green("\n✅ InstantDB project created successfully!")
              );
              console.log(
                chalk.blue(
                  "🔄 MyContext will now continue with project setup...\n"
                )
              );
              resolve();
            } else {
              console.log(
                chalk.yellow(`\n⚠️ InstantDB setup completed with code ${code}`)
              );
              console.log(
                chalk.blue("🔄 MyContext will continue with project setup...\n")
              );
              resolve(); // Continue even if there was an issue
            }
          });

          createInstantApp.on("error", (error) => {
            console.log(
              chalk.yellow(
                `\n⚠️ InstantDB setup encountered an error: ${error.message}`
              )
            );
            console.log(
              chalk.blue("🔄 MyContext will continue with project setup...\n")
            );
            resolve(); // Continue even if there was an error
          });

          // Set timeout
          setTimeout(() => {
            createInstantApp.kill();
            console.log(chalk.yellow("\n⚠️ InstantDB setup timed out"));
            console.log(
              chalk.blue("🔄 MyContext will continue with project setup...\n")
            );
            resolve(); // Continue even if it timed out
          }, 600000); // 10 minutes - give more time for user interaction
        });
      } catch (error) {
        console.log(
          chalk.yellow(`\n⚠️ Failed to create InstantDB project automatically`)
        );
        console.log(chalk.gray(`   You can create it manually later:`));
        console.log(
          chalk.gray(`   npx create-instant-app@latest ${projectName}`)
        );
        console.log(
          chalk.blue("🔄 MyContext will continue with project setup...\n")
        );
      }
    } catch (error) {
      console.log(
        chalk.yellow(
          `\n⚠️ InstantDB setup encountered an issue: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        )
      );
      console.log(
        chalk.gray("   You can create the InstantDB project manually if needed")
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
      throw error;
    }
  }
}
