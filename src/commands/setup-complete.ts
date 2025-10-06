// Setup Complete Command
// Single-command guided setup for complete project initialization

import { Command } from "commander";
import chalk from "chalk";
import prompts from "prompts";
import path from "path";
import fs from "fs-extra";
import { GenerateContextFilesCommand } from "./generate-context-files";
import { GenerateCommand } from "./generate";
import { ProgressTracker } from "../utils/progress";
import { EnhancedSpinner } from "../utils/spinner";

interface SetupOptions {
  description?: string;
  name?: string;
  output?: string;
  force?: boolean;
  interactive?: boolean;
  autoContinue?: boolean;
  skipConfirmation?: boolean;
}

interface ProjectPreferences {
  name: string;
  description: string;
  type: "simple" | "moderate" | "complex";
  techStack: string[];
  features: string[];
  timeline: "quick" | "standard" | "extended";
}

export class SetupCompleteCommand {
  private spinner: EnhancedSpinner;

  constructor() {
    this.spinner = new EnhancedSpinner("Setting up project...");
  }

  public register(program: Command): void {
    program
      .command("setup-complete")
      .description("Complete guided project setup with AI assistance")
      .option("-d, --description <text>", "Project description")
      .option("-n, --name <name>", "Project name")
      .option("-o, --output <dir>", "Output directory")
      .option("--force", "Overwrite existing files without confirmation")
      .option("--interactive", "Force interactive mode")
      .option(
        "--auto-continue",
        "Continue to component generation automatically"
      )
      .option("--skip-confirmation", "Skip confirmation prompts")
      .action(async (options: SetupOptions) => {
        await this.execute(options);
      });
  }

  private async execute(options: SetupOptions): Promise<void> {
    try {
      console.log(chalk.blue.bold("🚀 MyContext Complete Project Setup\n"));
      console.log(
        "This guided setup will create your complete project structure with AI assistance.\n"
      );

      // Get project preferences
      const preferences = await this.gatherProjectPreferences(options);

      // Confirm setup
      if (!options.skipConfirmation) {
        await this.confirmSetup(preferences);
      }

      // Execute complete setup workflow
      await this.executeCompleteSetup(preferences, options);

      // Show success and next steps
      await this.showSetupComplete(preferences);
    } catch (error) {
      console.error(chalk.red("❌ Setup failed:"), error);
      console.log(chalk.yellow("\n💡 Troubleshooting:"));
      console.log("  • Check your internet connection for AI services");
      console.log("  • Verify API keys are configured");
      console.log("  • Try with --force to overwrite existing files");
      console.log("  • Use --interactive for guided setup");
      throw error;
    }
  }

  private async gatherProjectPreferences(
    options: SetupOptions
  ): Promise<ProjectPreferences> {
    // If all options provided and not interactive, use them directly
    if (options.description && options.name && !options.interactive) {
      return {
        name: options.name,
        description: options.description,
        type: "moderate", // default
        techStack: ["Next.js", "TypeScript", "Tailwind CSS"],
        features: ["responsive", "modern"],
        timeline: "standard",
      };
    }

    console.log(
      chalk.cyan("📋 Let's gather some information about your project:\n")
    );

    // Project name
    const nameResponse = await prompts({
      type: "text",
      name: "name",
      message: "Project name:",
      initial: options.name || "my-awesome-app",
      validate: (value) =>
        value.length >= 2 || "Project name must be at least 2 characters",
    });

    // Project description
    const descriptionResponse = await prompts({
      type: "text",
      name: "description",
      message: "Describe your project:",
      initial: options.description || "",
      validate: (value) =>
        value.length >= 10 ||
        "Please provide a detailed description (at least 10 characters)",
    });

    // Project complexity
    const complexityResponse = await prompts({
      type: "select",
      name: "type",
      message: "Project complexity:",
      choices: [
        {
          title: "Simple (landing page, blog, portfolio)",
          value: "simple",
          description: "Basic website with 5-10 components",
        },
        {
          title: "Moderate (dashboard, e-commerce, SaaS)",
          value: "moderate",
          description: "Full application with 15-25 components",
        },
        {
          title: "Complex (social platform, LMS, marketplace)",
          value: "complex",
          description: "Advanced application with 30+ components",
        },
      ],
    });

    // Tech stack preferences
    const techStackResponse = await prompts({
      type: "multiselect",
      name: "techStack",
      message: "Select your preferred technologies:",
      choices: [
        { title: "Next.js", value: "Next.js", selected: true },
        { title: "React", value: "React" },
        { title: "TypeScript", value: "TypeScript", selected: true },
        { title: "Tailwind CSS", value: "Tailwind CSS", selected: true },
        { title: "Prisma", value: "Prisma" },
        { title: "NextAuth.js", value: "NextAuth.js" },
        { title: "Stripe", value: "Stripe" },
        { title: "Supabase", value: "Supabase" },
      ],
      min: 1,
      hint: "Use space to select, enter to confirm",
    });

    // Timeline preference
    const timelineResponse = await prompts({
      type: "select",
      name: "timeline",
      message: "Development timeline:",
      choices: [
        { title: "Quick (1-2 weeks)", value: "quick" },
        { title: "Standard (2-4 weeks)", value: "standard", selected: true },
        { title: "Extended (1-3 months)", value: "extended" },
      ],
    });

    return {
      name: nameResponse.name,
      description: descriptionResponse.description,
      type: complexityResponse.type,
      techStack: techStackResponse.techStack,
      features: this.getDefaultFeatures(complexityResponse.type),
      timeline: timelineResponse.timeline,
    };
  }

  private getDefaultFeatures(type: string): string[] {
    const baseFeatures = ["responsive", "accessible"];

    switch (type) {
      case "simple":
        return [...baseFeatures, "fast", "seo-friendly"];
      case "moderate":
        return [...baseFeatures, "interactive", "data-driven", "user-accounts"];
      case "complex":
        return [
          ...baseFeatures,
          "real-time",
          "multi-tenant",
          "advanced-analytics",
          "api-driven",
        ];
      default:
        return baseFeatures;
    }
  }

  private async confirmSetup(preferences: ProjectPreferences): Promise<void> {
    console.log(chalk.cyan("\n📋 Setup Summary:"));
    console.log(`   Project: ${chalk.white(preferences.name)}`);
    console.log(`   Type: ${chalk.white(preferences.type)}`);
    console.log(
      `   Tech Stack: ${chalk.white(preferences.techStack.join(", "))}`
    );
    console.log(`   Timeline: ${chalk.white(preferences.timeline)}`);
    console.log(
      `   Key Features: ${chalk.white(preferences.features.join(", "))}`
    );
    console.log("");

    const confirmResponse = await prompts({
      type: "confirm",
      name: "confirm",
      message: "Ready to create this project?",
      initial: true,
    });

    if (!confirmResponse.confirm) {
      console.log(chalk.yellow("Setup cancelled."));
      process.exit(0);
    }
  }

  private async executeCompleteSetup(
    preferences: ProjectPreferences,
    options: SetupOptions
  ): Promise<void> {
    const outputDir = options.output || preferences.name;
    const projectPath = path.resolve(outputDir);

    // Initialize progress tracker with enhanced features
    const progressTracker = new ProgressTracker("Complete Project Setup");
    progressTracker
      .addStep("init", "Initialize project structure", 2000)
      .addStep("context", "Generate context files", 8000)
      .addStep("architecture", "Generate project architecture", 15000)
      .addStep("components", "Generate components", 20000);

    console.log(chalk.blue.bold(`\n🏗️ Creating project: ${preferences.name}`));
    console.log(chalk.gray(`Location: ${projectPath}`));
    console.log(
      chalk.gray(
        `Estimated time: ~${this.estimateTotalTime(preferences)} minutes\n`
      )
    );

    // Start real-time progress updates
    const progressInterval = progressTracker.startProgressUpdates(3000);

    // Check if directory exists
    if ((await fs.pathExists(projectPath)) && !options.force) {
      const overwriteResponse = await prompts({
        type: "confirm",
        name: "overwrite",
        message: `Directory ${outputDir} already exists. Overwrite?`,
        initial: false,
      });

      if (!overwriteResponse.overwrite) {
        console.log(chalk.yellow("Setup cancelled."));
        return;
      }
    }

    try {
      // Step 1: Initialize project
      progressTracker.startStep("init");
      console.log(chalk.cyan("📁 Step 1: Initializing project structure..."));

      // Create project directory
      await fs.ensureDir(projectPath);
      process.chdir(projectPath);

      // Create basic package.json
      const packageJson = {
        name: preferences.name.toLowerCase().replace(/\s+/g, "-"),
        version: "0.1.0",
        description: preferences.description,
        scripts: {
          dev: "next dev",
          build: "next build",
          start: "next start",
          lint: "next lint",
        },
        dependencies: {},
        devDependencies: {},
      };

      await fs.writeJson("package.json", packageJson, { spaces: 2 });
      progressTracker.completeStep("init", "✅ Project initialized");
      console.log(chalk.gray(`   Created project structure`));

      // Step 2: Generate context files
      progressTracker.startStep("context");
      console.log(chalk.cyan("📝 Step 2: Generating context files..."));

      const contextDescription = this.buildContextDescription(preferences);
      const contextCommand = new GenerateContextFilesCommand();

      await contextCommand.execute({
        description: contextDescription,
        projectPath: projectPath,
        verbose: false,
        force: true,
      });

      progressTracker.completeStep("context", "✅ Context files generated");
      console.log(chalk.gray(`   Generated PRD and feature specifications`));

      // Step 3: Generate architecture
      progressTracker.startStep("architecture");
      console.log(chalk.cyan("🏗️ Step 3: Generating project architecture..."));

      const generateCommand = new GenerateCommand();
      await generateCommand.execute({
        type: "architecture",
        description: contextDescription,
        output: path.join(projectPath, ".mycontext"),
        autoContinue: options.autoContinue || false,
        force: true,
      });

      progressTracker.completeStep("architecture", "✅ Architecture generated");
      console.log(
        chalk.gray(`   Generated types, components, and project structure`)
      );

      // Step 4: Generate components (if auto-continue enabled)
      if (options.autoContinue) {
        progressTracker.startStep("components");
        console.log(chalk.cyan("🧩 Step 4: Generating components..."));

        const { GenerateComponentsCommand } = await import(
          "./generate-components"
        );
        const generateComponentsCommand = new GenerateComponentsCommand();
        await generateComponentsCommand.execute("all", {
          withTests: true,
          all: true,
        });

        progressTracker.completeStep("components", "✅ Components generated");
        console.log(chalk.gray(`   Generated component implementations`));
      }

      // Show final progress
      clearInterval(progressInterval);
      console.log(chalk.gray(`\n📊 ${progressTracker.getDetailedProgress()}`));
    } catch (error) {
      // Clean up progress interval
      clearInterval(progressInterval);
      // Note: We don't have a getCurrentStep method, so we'll use a generic failure message
      console.error(chalk.red("❌ Setup failed:"), error);
      throw error;
    }
  }

  private estimateTotalTime(preferences: ProjectPreferences): number {
    // Base time estimates in minutes
    const baseTimes = {
      simple: 3,
      moderate: 5,
      complex: 8,
    };

    let totalMinutes = baseTimes[preferences.type];

    // Add time for component generation if auto-continue is enabled
    if (
      preferences.features.includes("interactive") ||
      preferences.features.includes("real-time")
    ) {
      totalMinutes += 2;
    }

    // Add time for complex tech stacks
    if (preferences.techStack.length > 4) {
      totalMinutes += 1;
    }

    return Math.ceil(totalMinutes);
  }

  private buildContextDescription(preferences: ProjectPreferences): string {
    const typeDescriptions = {
      simple: "a simple, clean website",
      moderate: "a full-featured web application",
      complex: "an advanced, scalable web platform",
    };

    return `Create ${typeDescriptions[preferences.type]} called "${
      preferences.name
    }" with the following requirements:

Project Description: ${preferences.description}

Technical Requirements:
• Tech Stack: ${preferences.techStack.join(", ")}
• Complexity Level: ${preferences.type}
• Key Features: ${preferences.features.join(", ")}
• Timeline: ${preferences.timeline}

Please generate comprehensive context files that will guide the development of this ${
      preferences.type
    } project using modern best practices and the specified technology stack.`;
  }

  private async showSetupComplete(
    preferences: ProjectPreferences
  ): Promise<void> {
    const projectPath = path.resolve(preferences.name);

    console.log(
      chalk.green.bold(`\n🎉 Project "${preferences.name}" setup complete!`)
    );
    console.log("");

    console.log(chalk.cyan("📁 Project Structure:"));
    console.log(`   Location: ${chalk.white(projectPath)}`);
    console.log(`   Type: ${chalk.white(preferences.type)} application`);
    console.log(
      `   Tech Stack: ${chalk.white(preferences.techStack.join(", "))}`
    );
    console.log("");

    console.log(chalk.cyan("📋 Generated Files:"));
    console.log("   • PRD and feature specifications");
    console.log("   • TypeScript type definitions");
    console.log("   • Component architecture");
    console.log("   • Project structure");
    if (preferences.type === "moderate" || preferences.type === "complex") {
      console.log("   • Brand guidelines");
    }
    console.log("");

    console.log(chalk.cyan("🚀 Next Steps:"));

    // Change to project directory
    console.log(`   ${chalk.cyan(`cd ${preferences.name}`)}`);

    // Install dependencies
    console.log(`   ${chalk.cyan("pnpm install")}  # Install dependencies`);

    // Start development
    console.log(`   ${chalk.cyan("pnpm dev")}     # Start development server`);

    if (!preferences.techStack.includes("Next.js")) {
      console.log(
        `   ${chalk.cyan("npm run dev")}  # Alternative start command`
      );
    }

    console.log("");

    console.log(chalk.cyan("🔧 Development Commands:"));
    console.log(
      `   ${chalk.gray(
        "mycontext generate components"
      )}  # Generate more components`
    );
    console.log(
      `   ${chalk.gray(
        "mycontext build-app"
      )}           # Build complete application`
    );
    console.log(
      `   ${chalk.gray(
        "mycontext preview components"
      )}   # Preview generated components`
    );

    console.log("");
    console.log(chalk.green("💡 Tip: Your project is ready for development!"));
    console.log(chalk.gray("   Use 'mycontext --help' for more commands."));
  }

  public static getHelpText(): string {
    return `
${chalk.blue.bold("🚀 MyContext Setup Complete Command")}

${chalk.yellow("Description:")}
  Complete guided project setup with AI assistance. This single command creates
  your entire project structure, from initial concept to working application.

${chalk.yellow("What it does:")}
  1. 📁 Creates project directory and initializes structure
  2. 📝 Generates comprehensive context files (PRD, features, specs)
  3. 🏗️ Creates complete project architecture (types, components, structure)
  4. 🧩 Optionally generates component implementations
  5. 📋 Provides next steps and development guidance

${chalk.yellow("Usage:")}
  mycontext setup-complete [options]

${chalk.yellow("Interactive Mode (Recommended for first-time users):")}
  mycontext setup-complete --interactive

${chalk.yellow("Direct Mode (For automation/scripts):")}
  mycontext setup-complete \\
    --name "My Project" \\
    --description "A modern web application for task management" \\
    --auto-continue

${chalk.yellow("Options:")}
  -n, --name <name>         Project name
  -d, --description <text>  Project description
  -o, --output <dir>        Output directory (default: project name)
  --force                   Overwrite existing files
  --interactive             Force interactive mode
  --auto-continue           Generate components automatically
  --skip-confirmation       Skip confirmation prompts

${chalk.yellow("Project Types:")}
  • Simple: Landing pages, portfolios, blogs (5-10 components)
  • Moderate: Dashboards, e-commerce, SaaS apps (15-25 components)
  • Complex: Social platforms, LMS, marketplaces (30+ components)

${chalk.yellow("Examples:")}
  ${chalk.gray("# Interactive setup (recommended)")}
  ${chalk.cyan("mycontext setup-complete --interactive")}

  ${chalk.gray("# Direct setup with description")}
  ${chalk.cyan(
    'mycontext setup-complete --name "TaskApp" --description "A modern task management application"'
  )}

  ${chalk.gray("# Complete setup with components")}
  ${chalk.cyan(
    'mycontext setup-complete --name "Ecommerce" --description "Online store" --auto-continue'
  )}

${chalk.yellow("Generated Structure:")}
  project/
  ├── .mycontext/           # Context and configuration
  │   ├── 01-prd.md        # Product requirements
  │   ├── 02-types.ts      # TypeScript definitions
  │   ├── 03-branding.md   # Design guidelines
  │   ├── 04-component-list.json # Component specifications
  │   └── 05-project-structure.md # Architecture
  ├── components/           # Generated components (if --auto-continue)
  ├── package.json          # Project configuration
  └── README.md            # Setup documentation

${chalk.green(
  "💡 This command replaces 4-6 separate commands with one guided experience!"
)}
`;
  }
}
