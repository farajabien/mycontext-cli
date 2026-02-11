/**
 * Clone Starter Command
 *
 * Clones the admin starter repository and sets up the project
 * with InstantDB, shadcn/ui, and authentication.
 */

import { Command } from "commander";
import * as fs from "fs/promises";
import * as path from "path";
import { exec } from "child_process";
import { promisify } from "util";
import chalk from "chalk";
import { AdminStarterBundle } from "../types/feature-bundle";

const execAsync = promisify(exec);

export interface CloneStarterOptions {
  url?: string;
  output?: string;
  branch?: string;
  install?: boolean;
  setup?: boolean;
  verbose?: boolean;
}

export class CloneStarterCommand {
  private command: Command;

  constructor() {
    this.command = new Command("clone-starter");
    this.setupCommand();
  }

  private setupCommand() {
    this.command
      .description("Clone admin starter repository and set up project")
      .option(
        "--url <url>",
        "GitHub repository URL",
        "https://github.com/mycontext/admin-starter"
      )
      .option(
        "--output <path>",
        "Output directory for cloned project",
        "./admin-starter"
      )
      .option("--branch <branch>", "Git branch to clone", "main")
      .option("--install", "Install dependencies after cloning", true)
      .option("--setup", "Run setup commands after cloning", true)
      .option("--verbose", "Verbose output")
      .action(async (options: CloneStarterOptions) => {
        await this.execute(options);
      });
  }

  async execute(options: CloneStarterOptions): Promise<void> {
    console.log(chalk.cyan("📦 Cloning admin starter..."));

    try {
      const outputPath = path.resolve(options.output || "./admin-starter");

      // Step 1: Clone repository
      console.log(chalk.gray("  📥 Cloning repository..."));
      await this.cloneRepository(options.url!, outputPath, options.branch!);

      // Step 2: Load starter bundle configuration
      console.log(chalk.gray("  📋 Loading starter configuration..."));
      const starterBundle = await this.loadStarterBundle();

      // Step 3: Install dependencies
      if (options.install) {
        console.log(chalk.gray("  📦 Installing dependencies..."));
        await this.installDependencies(outputPath);
      }

      // Step 4: Set up environment
      console.log(chalk.gray("  ⚙️  Setting up environment..."));
      await this.setupEnvironment(outputPath, starterBundle);

      // Step 5: Run setup commands
      if (options.setup) {
        console.log(chalk.gray("  🔧 Running setup commands..."));
        await this.runSetupCommands(outputPath, starterBundle);
      }

      // Step 6: Save starter configuration
      console.log(chalk.gray("  💾 Saving starter configuration..."));
      await this.saveStarterConfiguration(outputPath, starterBundle);

      console.log(
        chalk.green("✅ Admin starter cloned and set up successfully!")
      );
      this.showNextSteps(outputPath, starterBundle);
    } catch (error) {
      console.log(chalk.red(`❌ Failed to clone starter: ${error}`));
      process.exit(1);
    }
  }

  private async cloneRepository(
    url: string,
    outputPath: string,
    branch: string
  ): Promise<void> {
    try {
      const command = `git clone -b ${branch} ${url} ${outputPath}`;
      await execAsync(command);
      console.log(chalk.green(`    ✓ Repository cloned to ${outputPath}`));
    } catch (error) {
      throw new Error(`Failed to clone repository: ${error}`);
    }
  }

  private async loadStarterBundle(): Promise<AdminStarterBundle> {
    const bundlePath = path.join(
      __dirname,
      "../../templates/admin-starter-bundle.json"
    );
    const bundleContent = await fs.readFile(bundlePath, "utf-8");
    return JSON.parse(bundleContent);
  }

  private async installDependencies(outputPath: string): Promise<void> {
    try {
      await execAsync("npm install", { cwd: outputPath });
      console.log(chalk.green("    ✓ Dependencies installed"));
    } catch (error) {
      console.log(
        chalk.yellow(`    ⚠️  Failed to install dependencies: ${error}`)
      );
      console.log(
        chalk.gray('    Run "npm install" manually in the project directory')
      );
    }
  }

  private async setupEnvironment(
    outputPath: string,
    starterBundle: AdminStarterBundle
  ): Promise<void> {
    const envPath = path.join(outputPath, ".env.local");
    const envExamplePath = path.join(outputPath, ".env.example");

    // Create .env.local from .env.example if it exists
    try {
      const envExample = await fs.readFile(envExamplePath, "utf-8");
      await fs.writeFile(envPath, envExample);
      console.log(chalk.green("    ✓ Environment file created"));
    } catch {
      // Create basic .env.local
      const envContent = this.generateEnvironmentFile(starterBundle);
      await fs.writeFile(envPath, envContent);
      console.log(chalk.green("    ✓ Environment file created"));
    }

    // Update package.json with starter bundle info
    await this.updatePackageJson(outputPath, starterBundle);
  }

  private generateEnvironmentFile(starterBundle: AdminStarterBundle): string {
    const envVars = starterBundle.setup.environment;
    return (
      Object.entries(envVars)
        .map(([key, value]) => `${key}=${value}`)
        .join("\n") + "\n"
    );
  }

  private async updatePackageJson(
    outputPath: string,
    starterBundle: AdminStarterBundle
  ): Promise<void> {
    const packageJsonPath = path.join(outputPath, "package.json");

    try {
      const packageJson = JSON.parse(
        await fs.readFile(packageJsonPath, "utf-8")
      );

      // Add starter bundle metadata
      packageJson.mycontext = {
        starter: starterBundle.name,
        version: starterBundle.version,
        features: starterBundle.features,
        stack: starterBundle.stack,
      };

      await fs.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));
      console.log(chalk.green("    ✓ Package.json updated"));
    } catch (error) {
      console.log(
        chalk.yellow(`    ⚠️  Failed to update package.json: ${error}`)
      );
    }
  }

  private async runSetupCommands(
    outputPath: string,
    starterBundle: AdminStarterBundle
  ): Promise<void> {
    for (const command of starterBundle.setup.commands) {
      try {
        console.log(chalk.gray(`    Running: ${command}`));
        await execAsync(command, { cwd: outputPath });
        console.log(chalk.green(`    ✓ ${command}`));
      } catch (error) {
        console.log(
          chalk.yellow(`    ⚠️  Failed to run "${command}": ${error}`)
        );
      }
    }
  }

  private async saveStarterConfiguration(
    outputPath: string,
    starterBundle: AdminStarterBundle
  ): Promise<void> {
    const mycontextDir = path.join(outputPath, ".mycontext");
    await fs.mkdir(mycontextDir, { recursive: true });

    const configPath = path.join(mycontextDir, "admin-starter.json");
    await fs.writeFile(configPath, JSON.stringify(starterBundle, null, 2));
    console.log(chalk.green("    ✓ Starter configuration saved"));
  }

  private showNextSteps(
    outputPath: string,
    starterBundle: AdminStarterBundle
  ): void {
    console.log(chalk.blue("\n📋 Next Steps:"));
    console.log(chalk.cyan("  1. Navigate to project:"));
    console.log(chalk.white(`     cd ${outputPath}`));
    console.log(chalk.cyan("  2. Configure environment:"));
    console.log(chalk.white("     # Edit .env.local with your API keys"));
    console.log(chalk.cyan("  3. Set up database:"));
    console.log(chalk.white("     mycontext setup-database"));
    console.log(chalk.cyan("  4. Start development:"));
    console.log(chalk.white("     npm run dev"));

    console.log(chalk.gray("\n  Features included:"));
    starterBundle.features.forEach((feature) => {
      console.log(chalk.gray(`  • ${feature}`));
    });

    console.log(chalk.gray("\n  Stack:"));
    Object.entries(starterBundle.stack).forEach(([key, value]) => {
      console.log(chalk.gray(`  • ${key}: ${value}`));
    });

    console.log(chalk.blue("\n🚀 Ready to build!"));
    console.log(
      chalk.gray(
        "  The admin starter includes authentication, user management,"
      )
    );
    console.log(
      chalk.gray("  and invite system. Customize it for your needs.")
    );
  }

  getCommand(): Command {
    return this.command;
  }
}
