import chalk from "chalk";
import prompts from "prompts";
import inquirer from "inquirer";
import clipboardy from "clipboardy";
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
import { GeminiClient } from "../utils/geminiClient";

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
    const spinner = new EnhancedSpinner("Initializing...");

    try {
      this.displayBranding();

      const currentDir = process.cwd();
      const currentDirName = path.basename(currentDir);
      const hasPackageJson = await fs.pathExists(path.join(currentDir, "package.json"));
      const hasNodeModules = await fs.pathExists(path.join(currentDir, "node_modules"));
      const mycontextPath = path.join(currentDir, ".mycontext");
      const hasMyContext = await fs.pathExists(mycontextPath);

      // Handle project name resolution
      let finalProjectName = projectName;
      let useCurrentDir = projectName === "." || !projectName;

      if (useCurrentDir) {
        finalProjectName = currentDirName;
      }

      // 1. Existing Project Flow (package.json exists)
      if (hasPackageJson && !options.next && !options.framework && !options.specOnly) {
        const isInteractive = !options.yes;
        if (isInteractive) {
          const { useExisting } = await prompts({
            type: "confirm",
            name: "useExisting",
            message: chalk.yellow(`⚠️  Existing project detected (${finalProjectName}). Initialize MyContext here?`),
            initial: true
          });

          if (useExisting) {
            const { initMode } = await prompts({
              type: "select",
              name: "initMode",
              message: "How would you like to initialize context?",
              choices: [
                { title: "Scan Project (Recommended)", value: "scan", description: "Analyzes file tree & key files to build context" },
                { title: "Manual Input", value: "manual", description: "Enter project description yourself" }
              ],
              initial: 0
            });

            spinner.start();
            let description = options.description || `${finalProjectName} - AI-powered app`;

            if (initMode === "scan") {
              spinner.updateText("Scanning project structure...");
              try {
                const { ProjectScanner } = await import("../services/ProjectScanner");
                const scanner = new ProjectScanner(currentDir);
                const snapshot = await scanner.scan();
                description = `Project: ${finalProjectName}\nStats: ${snapshot.stats.totalFiles} files.\nContext: ${options.description || ''}`;
              } catch (e) {
                // fallback
              }
            } else if (initMode === "manual" && !options.description) {
              spinner.stop();
              
              const { inputMethod } = await inquirer.prompt([
                {
                  type: "list",
                  name: "inputMethod",
                  message: "How would you like to provide the project description?",
                  choices: [
                    { name: "📋 Paste from Clipboard (Best for long PRDs)", value: "clipboard" },
                    { name: "📝 Open Default Editor (Vim/Nano)", value: "editor" },
                    { name: "⌨️  Type Simple Description", value: "type" }
                  ]
                }
              ]);

              if (inputMethod === "clipboard") {
                try {
                  spinner.updateText("Reading clipboard...");
                  description = await clipboardy.read();
                  if (!description || description.trim().length === 0) {
                    console.log(chalk.red("\n❌ Clipboard is empty. Please copy your spec first."));
                    // Fallback to type
                    description = (await inquirer.prompt([{ type: "input", name: "desc", message: "Simple description:" }])).desc;
                  } else {
                    console.log(chalk.green(`\n✅ Successfully ingested ${description.length} characters from clipboard.`));
                    const preview = description.length > 100 ? description.substring(0, 100) + "..." : description;
                    console.log(chalk.gray(`Preview: "${preview}"\n`));
                  }
                } catch (err) {
                  console.log(chalk.red("\n❌ Failed to read clipboard. Check permissions."));
                  description = (await inquirer.prompt([{ type: "input", name: "desc", message: "Simple description:" }])).desc;
                }
              } else if (inputMethod === "editor") {
                const { desc } = await inquirer.prompt([
                  {
                    type: "editor",
                    name: "desc",
                    message: "Project description:",
                    validate: (value) => value.trim().length > 0 ? true : "Description is required"
                  }
                ]);
                description = desc;
              } else {
                const { desc } = await inquirer.prompt([
                  {
                    type: "input",
                    name: "desc",
                    message: "Simple description:",
                    validate: (value) => value.length > 0 ? true : "Description is required"
                  }
                ]);
                description = desc;
              }
              spinner.start();
            }

            const config = await this.fs.initializeProject(finalProjectName!, description, currentDir, true);
            await this.createInitialManifest(currentDir, finalProjectName!, description);
            
            spinner.success({ text: `Project "${finalProjectName!}" initialized with context!` });
            
            // Post-initialization environment setup
            await this.setupEnvironmentKeys(currentDir, options, undefined);
            
            this.showNextSteps(config, undefined, true);
            return;
          }
        }
      }

      // 2. New Project Flow (No package.json or explicitly requested new)
      if (!hasPackageJson && !options.yes && !options.specOnly) {
        const { framework } = await prompts({
          type: "select",
          name: "framework",
          message: "No package.json found. What would you like to build?",
          choices: [
            { title: "Next.js + InstantDB (Full Stack)", value: "instantdb" },
            { title: "Next.js Landing Page (High Fidelity UI)", value: "landing" },
            { title: "Next.js + shadcn (UI Only)", value: "nextjs" },
            { title: "Basic MyContext (Spec Only)", value: "basic" }
          ],
          initial: 0
        });

        if (framework === "basic") {
          options.specOnly = true;
        } else {
          options.framework = framework;
        }
      }

      // Resolution for final naming if still undefined
      if (!finalProjectName && !options.yes) {
        const responses = await prompts([
          {
            type: "text",
            name: "name",
            message: "Project name:",
            initial: currentDirName,
            validate: (value: string) => value.length > 0 || "Project name is required",
          },
        ]);
        finalProjectName = responses.name || currentDirName;
        useCurrentDir = finalProjectName === "." || finalProjectName === currentDirName;
        if (finalProjectName === ".") finalProjectName = currentDirName;
      }

      if (!finalProjectName) finalProjectName = currentDirName || "my-app";

      const workingDir = process.cwd();
      let projectPath: string;
      let effectiveDescription: string;

      // Safety check for overwrite / non-empty directory
      const isDirty = (await fs.readdir(workingDir)).filter(f => !f.startsWith('.')).length > 0;
      
      if (useCurrentDir && !hasPackageJson && isDirty && !options.force && !options.yes) {
        console.log(chalk.yellow(`⚠️  The current directory contains files that may conflict with project scaffolding.`));
        const { projectName: newName } = await prompts({
          type: "text",
          name: "projectName",
          message: "Enter a new project name (to create a subdirectory):",
          validate: (val) => val.length > 0 || "Project name is required"
        });
        
        if (newName && newName !== ".") {
          finalProjectName = newName;
          useCurrentDir = false;
        }
      }

      projectPath = useCurrentDir ? workingDir : path.resolve(workingDir, finalProjectName!);
      effectiveDescription = options.description || `${finalProjectName} - AI-powered app`;

      if (await fs.pathExists(path.join(projectPath, ".mycontext")) && !options.force && !options.yes) {
        const { confirmOverwrite } = await prompts({
          type: "confirm",
          name: "confirmOverwrite",
          message: chalk.yellow(`⚠️  Existing .mycontext folder found in ${useCurrentDir ? '.' : finalProjectName}. Overwrite?`),
          initial: false,
        });

        if (!confirmOverwrite) {
          console.log(chalk.blue("\nInitialization cancelled."));
          return;
        }
      }

      spinner.start();

      if (options.specOnly) {
        await this.initBasicProject(spinner, projectPath, finalProjectName!, { ...options, description: effectiveDescription }, useCurrentDir);
      } else {
        const framework = options.framework || "nextjs";
        if (framework === "instantdb") {
          await this.initInstantDBProject(spinner, workingDir, projectPath, finalProjectName!, { ...options, description: effectiveDescription }, useCurrentDir);
        } else if (framework === "landing") {
          await this.initLandingPageProject(spinner, workingDir, projectPath, finalProjectName!, { ...options, description: effectiveDescription }, useCurrentDir);
        } else {
          await this.initNextJSProject(spinner, workingDir, projectPath, finalProjectName!, { ...options, description: effectiveDescription }, useCurrentDir);
        }
      }

      // Generate initial premium landing page immediately
      spinner.updateText("Generating premium landing page...");
      const { DeterministicScaffoldGenerator } = await import("../generator/scaffold");
      const scaffolder = new DeterministicScaffoldGenerator(projectPath);
      await scaffolder.generateRootLandingPage([]); 
      
    } catch (error) {
      spinner.error({ text: "Failed to initialize project" });
      if (error instanceof Error && error.message.includes("Command failed")) {
        console.log(chalk.red("\n❌ Scaffolding Failed: create-next-app cannot run in a non-empty directory."));
        console.log(chalk.blue("💡 Fix: Provide a unique project name to create a subdirectory:"));
        console.log(chalk.cyan("   mycontext init <my-project-name>\n"));
      } else {
        console.error(chalk.red(`Error: ${error instanceof Error ? error.message : String(error)}`));
      }
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
    // 0. Bootstrap Next.js project first
    const hasPackageJson = await fs.pathExists(path.join(projectPath, "package.json"));
    if (!hasPackageJson) {
      spinner.updateText("Bootstrapping Next.js project...");
      const projectNameParam = useCurrentDir ? "." : projectName;
      execSync(`npx -y create-next-app@latest ${projectNameParam} --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-pnpm --skip-install --no-react-compiler --no-git`, {
        cwd: workingDir,
        stdio: "inherit",
      });
      
      // Install initial dependencies
      spinner.updateText("Installing dependencies...");
      execSync("pnpm install", { cwd: projectPath, stdio: "ignore" });
    }

    // 1. Run shadcn init if components.json doesn't exist
    const componentsJsonPath = path.join(projectPath, "components.json");
    if (!fs.existsSync(componentsJsonPath)) {
      spinner.updateText("Running shadcn init...");
      execSync(`pnpm dlx shadcn@latest init ${options.yes ? "-d -y" : ""}`, {
        cwd: projectPath,
        stdio: "inherit",
      });
    } else {
      console.log(chalk.blue("ℹ️  shadcn/ui already initialized, skipping..."));
    }

    // 2. Prompt user for instant-cli init
    spinner.stop();
    let runInstantInit = true;
    if (!options.yes) {
      const response = await prompts({
        type: "confirm",
        name: "runInstantInit",
        message: "Run 'npx instant-cli init' to initialize InstantDB?",
        initial: true,
      });
      runInstantInit = response.runInstantInit;
    }

    if (runInstantInit) {
      spinner.start();
      spinner.updateText("Running instant-cli init...");
      execSync("npx instant-cli init", {
        cwd: projectPath,
        stdio: "inherit",
      });

      // Prompt user to push schemas
      spinner.stop();
      let pushSchemas = false;
      if (!options.yes) {
        const response = await prompts({
          type: "confirm",
          name: "pushSchemas",
          message:
            "Push schemas to InstantDB dashboard? (Make sure you've configured your app)",
          initial: false,
        });
        pushSchemas = response.pushSchemas;
      }

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

    // Post-initialization environment setup
    await this.setupEnvironmentKeys(projectPath, options, "instantdb");

    // Show next steps
    this.showNextSteps(config, "instantdb", useCurrentDir);
  }

  private async initNextJSProject(
    spinner: EnhancedSpinner,
    workingDir: string,
    projectPath: string,
    projectName: string,
    options: InitOptions,
    useCurrentDir: boolean
  ): Promise<void> {
    // 1. Check for Next.js presence, bootstrap if missing
    const hasPackageJson = await fs.pathExists(path.join(projectPath, "package.json"));
    if (!hasPackageJson) {
      spinner.updateText("Bootstrapping Next.js project...");
      const projectNameParam = useCurrentDir ? "." : projectName;
      // Using --yes and specific version to match user's environment
      execSync(`npx -y create-next-app@latest ${projectNameParam} --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-pnpm --skip-install --no-react-compiler --no-git`, {
        cwd: workingDir,
        stdio: "inherit",
      });
      
      // Install dependencies silently
      spinner.updateText("Installing dependencies...");
      execSync("pnpm install", { cwd: projectPath, stdio: "ignore" });
    }

    // 2. Run shadcn init if components.json doesn't exist
    const componentsJsonPath = path.join(projectPath, "components.json");
    if (!fs.existsSync(componentsJsonPath)) {
      spinner.updateText("Running shadcn init...");
      // -d for defaults, -y for non-interactive
      execSync("pnpm dlx shadcn@latest init -d -y", {
        cwd: projectPath,
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

    // Post-initialization environment setup
    await this.setupEnvironmentKeys(projectPath, options, "nextjs");

    // Show next steps
    this.showNextSteps(config, "nextjs", useCurrentDir);
  }

  private async initLandingPageProject(
    spinner: EnhancedSpinner,
    workingDir: string,
    projectPath: string,
    projectName: string,
    options: InitOptions,
    useCurrentDir: boolean
  ): Promise<void> {
    // 1. Standard Next.js bootstrap
    await this.initNextJSProject(spinner, workingDir, projectPath, projectName, options, useCurrentDir);
    
    // 2. Specialized Landing Page scaffolding
    spinner.updateText("Generating specialized landing page architecture...");
    const { DeterministicScaffoldGenerator } = await import("../generator/scaffold");
    const scaffolder = new DeterministicScaffoldGenerator(projectPath);
    
    // We update the context to reflect it's a landing-page project
    const contextPath = path.join(projectPath, ".mycontext", "context.json");
    if (fs.existsSync(contextPath)) {
      const context = await fs.readJson(contextPath);
      context.projectType = "landing-page";
      context.aestheticPreference = "premium-high-fidelity";
      await fs.writeJson(contextPath, context, { spaces: 2 });
    }
    
    await scaffolder.generateRootLandingPage([]);
    
    spinner.success({
      text: `Premium Landing Page project "${projectName}" ready for ideation!`,
    });
    
    console.log(chalk.cyan("\n🚀 Tip: Run 'mycontext ideate' to generate UI concepts for your landing page.\n"));
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

    // Post-initialization environment setup
    await this.setupEnvironmentKeys(projectPath, options, undefined);

    // Show next steps
    this.showNextSteps(config, undefined, useCurrentDir);
  }

  private isValidProjectName(name: string): boolean {
    // Allow alphanumeric, hyphens, and underscores
    return /^[a-zA-Z0-9._-]+$/.test(name);
  }

  private async setupEnvironmentKeys(projectPath: string, options: InitOptions, framework?: string): Promise<void> {
    const envPath = path.join(projectPath, ".env.local");
    const hasEnv = await fs.pathExists(envPath);
    let envContent = hasEnv ? await fs.readFile(envPath, "utf-8") : "";

    console.log(chalk.blue("\n🔑 Environment Configuration:"));

    if (options.yes) {
      console.log(chalk.gray("ℹ️  Non-interactive mode: Skipping environment prompts."));
      return;
    }

    const keysToPrompt = [];
    
    // Always prompt for GitHub Token (Preferred for reliability right now)
    if (!process.env.GITHUB_TOKEN && !envContent.includes("GITHUB_TOKEN")) {
      keysToPrompt.push({
        type: "password",
        name: "githubToken",
        message: "Enter your GitHub Classic Token (with 'repo' scopes for AI Models):",
      });
    }

    // Still allow Gemini API Key but mark as optional/secondary
    if (!process.env.GEMINI_API_KEY && !envContent.includes("GEMINI_API_KEY")) {
      keysToPrompt.push({
        type: "password",
        name: "geminiKey",
        message: "Enter your Gemini API Key (Optional, get it from aistudio.google.com):",
      });
    }

    // Prompt for InstantDB App ID if using instantdb and not present
    if (framework === "instantdb" && !envContent.includes("NEXT_PUBLIC_INSTANT_APP_ID")) {
      keysToPrompt.push({
        type: "input",
        name: "instantAppId",
        message: "Enter your InstantDB App ID:",
      });
    }

    if (keysToPrompt.length > 0) {
      const answers = await inquirer.prompt(keysToPrompt);
      
      let newVars = "";
      if (answers.githubToken) {
        newVars += `\nGITHUB_TOKEN=${answers.githubToken}`;
      }
      if (answers.geminiKey) {
        newVars += `\nGEMINI_API_KEY=${answers.geminiKey}`;
      }
      if (answers.instantAppId) {
        newVars += `\nNEXT_PUBLIC_INSTANT_APP_ID=${answers.instantAppId}`;
      }

      if (newVars) {
        if (!envContent) {
          envContent = "# MyContext Environment Variables" + newVars;
        } else {
          envContent += newVars;
        }
        await fs.writeFile(envPath, envContent);
        console.log(chalk.green("✅ Environment variables saved to .env.local"));
      }
    } else {
      console.log(chalk.gray("ℹ️  Required environment variables are already set."));
    }
  }

  private showNextSteps(
    config: any,
    framework?: string,
    useCurrentDir?: boolean
  ): void {
    const projectPath = useCurrentDir ? "./" : config.name;

    console.log(chalk.blue("\n🎯 Next Steps:\n"));

    let step = 1;

    if (!useCurrentDir) {
      console.log(chalk.yellow(`  ${step++}. cd ` + projectPath));
    }

    console.log(chalk.yellow(`  ${step++}. Generate Full Context (FSR + Component Discovery):`));
    console.log(chalk.cyan("      mycontext generate context --full\n"));

    console.log(chalk.yellow(`  ${step++}. Sync & Update Brain (as needed):`));
    console.log(chalk.cyan("      mycontext sync\n"));

    console.log(chalk.green("✨ MyContext v4.2.17 | Context-Driven Development Activated\n"));

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
          "    🧠 Living Brain | Context-Driven Development (v4.2.17)\n"
        )
      );
    } catch (error) {
      // Fallback to simple text if figlet fails
      console.log(chalk.blue.bold("\n🧠 MyContext - Context-Driven Development\n"));
    }
  }
}
