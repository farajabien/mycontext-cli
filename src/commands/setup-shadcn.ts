import { spawn } from "child_process";
import * as fs from "fs-extra";
import * as path from "path";
import chalk from "chalk";
import { EnhancedSpinner } from "../utils/spinner";

interface ShadcnSetupOptions {
  all?: boolean;
  components?: string[];
  force?: boolean;
  skipPrompts?: boolean;
}

export class SetupShadcnCommand {
  private spinner = new EnhancedSpinner("Setting up shadcn/ui...");

  async execute(options: ShadcnSetupOptions): Promise<void> {
    const projectRoot = process.cwd();

    console.log(chalk.blue("🎨 Setting up shadcn/ui components...\n"));

    // Check if we're in a Next.js project
    if (!(await this.isValidProject(projectRoot))) {
      console.log(chalk.red("❌ Not in a valid Next.js project"));
      console.log("   Please run this command from your Next.js project root");
      process.exit(1);
    }

    // Check if shadcn is already initialized
    if ((await this.isShadcnInitialized(projectRoot)) && !options.force) {
      console.log(chalk.yellow("⚠️  shadcn/ui is already initialized"));
      console.log("   Use --force to reinitialize");
      return;
    }

    // Initialize shadcn/ui first
    await this.initializeShadcn(projectRoot);

    // Install components
    if (options.all) {
      await this.installAllComponents(projectRoot);
    } else if (options.components && options.components.length > 0) {
      await this.installSpecificComponents(projectRoot, options.components);
    } else {
      // Interactive mode - let user choose
      await this.interactiveComponentInstallation(projectRoot);
    }

    console.log(chalk.green("\n✅ shadcn/ui setup completed!"));
    console.log(
      chalk.gray("   Run: mycontext generate-components all --with-tests")
    );
  }

  private async isValidProject(projectRoot: string): Promise<boolean> {
    const packageJsonPath = path.join(projectRoot, "package.json");
    const nextConfigPath = path.join(projectRoot, "next.config.js");

    if (!(await fs.pathExists(packageJsonPath))) return false;

    try {
      const packageJson = await fs.readJson(packageJsonPath);
      return !!(
        packageJson.dependencies?.next || packageJson.devDependencies?.next
      );
    } catch {
      return false;
    }
  }

  private async isShadcnInitialized(projectRoot: string): Promise<boolean> {
    const componentsPath = path.join(projectRoot, "components.json");
    const uiPath = path.join(projectRoot, "components", "ui");

    return (
      (await fs.pathExists(componentsPath)) && (await fs.pathExists(uiPath))
    );
  }

  private async initializeShadcn(projectRoot: string): Promise<void> {
    console.log(chalk.cyan("📦 Initializing shadcn/ui..."));

    // Check package manager
    const packageManager = await this.detectPackageManager(projectRoot);

    // Run shadcn init
    await this.runShadcnCommand(projectRoot, packageManager, ["init", "--yes"]);
  }

  private async installAllComponents(projectRoot: string): Promise<void> {
    console.log(
      chalk.cyan("\n📦 Installing all essential shadcn/ui components...")
    );
    console.log(chalk.gray("   This may take a few minutes...\n"));

    const components = [
      "accordion",
      "alert",
      "alert-dialog",
      "aspect-ratio",
      "avatar",
      "badge",
      "breadcrumb",
      "button",
      "calendar",
      "card",
      "carousel",
      "chart",
      "checkbox",
      "collapsible",
      "command",
      "context-menu",
      "dialog",
      "drawer",
      "dropdown-menu",
      "form",
      "hover-card",
      "input",
      "input-otp",
      "label",
      "menubar",
      "navigation-menu",
      "pagination",
      "popover",
      "progress",
      "radio-group",
      "resizable",
      "scroll-area",
      "select",
      "separator",
      "sheet",
      "sidebar",
      "skeleton",
      "slider",
      "sonner",
      "switch",
      "table",
      "tabs",
      "textarea",
      "toggle",
      "toggle-group",
      "tooltip",
      "field",
      "button-group",
      "empty",
      "input-group",
      "spinner",
    ];

    const packageManager = await this.detectPackageManager(projectRoot);

    // Install components in batches to avoid overwhelming the terminal
    const batchSize = 10;
    for (let i = 0; i < components.length; i += batchSize) {
      const batch = components.slice(i, i + batchSize);
      console.log(
        chalk.gray(
          `   Installing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(
            components.length / batchSize
          )}: ${batch.join(", ")}`
        )
      );

      await this.runShadcnCommand(projectRoot, packageManager, [
        "add",
        ...batch,
      ]);

      // Small delay between batches
      if (i + batchSize < components.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
  }

  private async installSpecificComponents(
    projectRoot: string,
    components: string[]
  ): Promise<void> {
    console.log(
      chalk.cyan(`\n📦 Installing ${components.length} shadcn/ui components...`)
    );

    const packageManager = await this.detectPackageManager(projectRoot);
    await this.runShadcnCommand(projectRoot, packageManager, [
      "add",
      ...components,
    ]);
  }

  private async interactiveComponentInstallation(
    projectRoot: string
  ): Promise<void> {
    console.log(
      chalk.cyan("\n📦 Interactive shadcn/ui component installation")
    );
    console.log(
      chalk.gray("   You will now interact directly with shadcn/ui CLI\n")
    );

    const packageManager = await this.detectPackageManager(projectRoot);

    // Provide instructions to user
    console.log(chalk.yellow("💡 Instructions:"));
    console.log("   • Select the components you need");
    console.log("   • Use spacebar to select/deselect components");
    console.log("   • Press Enter to confirm selection");
    console.log("   • Press Ctrl+C to cancel\n");

    // Let user interact with shadcn directly
    await this.runShadcnCommand(projectRoot, packageManager, ["add"]);
  }

  private async runShadcnCommand(
    projectRoot: string,
    packageManager: "npm" | "pnpm" | "yarn",
    args: string[]
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const command =
        packageManager === "npm"
          ? "npx"
          : packageManager === "pnpm"
          ? "pnpm dlx"
          : "yarn dlx";
      const fullCommand = [command, "shadcn@latest", ...args];

      console.log(chalk.gray(`   Running: ${fullCommand.join(" ")}`));

      const child = spawn(command, ["shadcn@latest", ...args], {
        cwd: projectRoot,
        stdio: "inherit", // Pass all stdio directly to user
        shell: true,
      });

      child.on("close", (code: number | null) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`shadcn command failed with code ${code}`));
        }
      });

      child.on("error", (error: Error) => {
        reject(error);
      });
    });
  }

  private async detectPackageManager(
    projectRoot: string
  ): Promise<"npm" | "pnpm" | "yarn"> {
    // Check for lock files
    const pnpmLock = path.join(projectRoot, "pnpm-lock.yaml");
    const yarnLock = path.join(projectRoot, "yarn.lock");
    const packageLock = path.join(projectRoot, "package-lock.json");

    if (await fs.pathExists(pnpmLock)) return "pnpm";
    if (await fs.pathExists(yarnLock)) return "yarn";
    if (await fs.pathExists(packageLock)) return "npm";

    // Default to npm if no lock file found
    return "npm";
  }
}
