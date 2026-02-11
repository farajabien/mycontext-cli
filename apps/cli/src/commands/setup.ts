import { Command } from "commander";
import { CommandOptions } from "../types";
import { EnhancedSpinner } from "../utils/spinner";
import * as fs from "fs-extra";
import * as path from "path";
import * as os from "os";
import chalk from "chalk";
import inquirer from "inquirer";

interface SetupOptions extends CommandOptions {
  local?: boolean;
  cloud?: boolean;
  force?: boolean;
  skipPrompts?: boolean;
  stack?: string;
}

export class SetupCommand {
  private setupConfigPath: string;

  constructor() {
    this.setupConfigPath = path.join(os.homedir(), ".mycontext", "setup.json");
  }

  async execute(options: SetupOptions): Promise<void> {
    console.log(chalk.blue("🚀 MyContext CLI Setup\n"));

    // Check if already set up
    if ((await this.isAlreadySetup()) && !options.force) {
      console.log(chalk.green("✅ MyContext is already set up and working!"));
      console.log(chalk.gray("Use --force to run setup again\n"));

      await this.showCurrentStatus();
      return;
    }

    // Show welcome and get user consent
    if (!options.skipPrompts) {
      const proceed = await this.getSetupConsent();
      if (!proceed) {
        console.log(
          chalk.yellow(
            "Setup cancelled. You can run setup later with: mycontext setup"
          )
        );
        return;
      }
    }

    const spinner = new EnhancedSpinner("Setting up MyContext...");

    try {
      // Step 1: Create .mycontext directory
      await this.createMyContextDirectory();

      // Step 2: Set up API providers
      await this.setupApiProviders();

      // Step 3: Configure stack
      await this.setupStackConfiguration(options);

      // Step 4: Verify setup
      await this.verifySetup();

      // Step 4: Save setup status
      await this.saveSetupStatus();

      spinner.success({ text: "MyContext setup completed successfully!" });

      console.log(chalk.green("\n🎉 Setup Complete!"));
      console.log(chalk.yellow("\n📋 Next Steps:"));
      console.log(chalk.gray("1. Create a new project: mycontext init my-app"));
      console.log(
        chalk.gray("2. Generate context: mycontext generate context")
      );
      console.log(
        chalk.gray("3. Generate components: mycontext generate-components all")
      );
    } catch (error: any) {
      spinner.error({ text: "Setup failed" });
      throw error;
    }
  }

  private async getSetupConsent(): Promise<boolean> {
    console.log(chalk.cyan("Welcome to MyContext! 🎉"));
    console.log(
      chalk.gray(
        "This setup will configure your AI providers for component generation.\n"
      )
    );

    console.log(chalk.yellow("💰 Pricing:"));
    console.log(chalk.gray("• Set up your own API keys → FREE forever"));
    console.log(
      chalk.gray("• Use our hosted service → $5/month (FREE during beta)")
    );
    console.log(chalk.gray("• Current beta period: FREE until Dec 31, 2025\n"));

    const { proceed } = await inquirer.prompt([
      {
        type: "confirm",
        name: "proceed",
        message: "Do you want to continue with the setup?",
        default: true,
      },
    ]);

    return proceed;
  }

  private async createMyContextDirectory(): Promise<void> {
    const homeDir = os.homedir();
    const myContextDir = path.join(homeDir, ".mycontext");

    if (!(await fs.pathExists(myContextDir))) {
      await fs.mkdir(myContextDir, { recursive: true });
      console.log(chalk.gray("   Created .mycontext directory"));
    }
  }

  private async setupApiProviders(): Promise<void> {
    console.log(chalk.yellow("\n🔑 API Provider Setup"));
    console.log(chalk.gray("Choose your preferred AI provider:\n"));

    const { provider } = await inquirer.prompt([
      {
        type: "list",
        name: "provider",
        message: "Select your AI provider:",
        choices: [
          {
            name: "Qwen3 Coder (FREE via OpenRouter) - Recommended",
            value: "qwen",
          },
          {
            name: "GitHub Models (Fast, high-quality)",
            value: "github",
          },
          {
            name: "OpenAI (GPT models)",
            value: "openai",
          },
          {
            name: "Claude (Anthropic)",
            value: "claude",
          },
          {
            name: "Hosted Service (FREE during beta, $5/month after)",
            value: "hosted",
          },
          {
            name: "Skip for now",
            value: "skip",
          },
        ],
      },
    ]);

    if (provider === "skip") {
      console.log(chalk.yellow("   Skipping API provider setup"));
      return;
    }

    await this.configureProvider(provider);
  }

  private async setupStackConfiguration(options: SetupOptions): Promise<void> {
    // Only configure stack if we're in a project directory
    const cwd = process.cwd();
    const packageJsonPath = path.join(cwd, "package.json");

    if (!(await fs.pathExists(packageJsonPath))) {
      console.log(
        chalk.gray(
          "   Skipping stack configuration (not in a project directory)"
        )
      );
      return;
    }

    console.log(chalk.yellow("\n🎯 Stack Configuration"));

    let stack = options.stack;
    if (!stack) {
      const { stackChoice } = await inquirer.prompt([
        {
          type: "list",
          name: "stackChoice",
          message: "Select your development stack:",
          choices: [
            {
              name: "Next.js + Tailwind + shadcn/ui",
              value: "nextjs-tailwind-shadcn",
            },
            {
              name: "React + Tailwind + shadcn/ui",
              value: "react-tailwind-shadcn",
            },
            { name: "Skip stack configuration", value: "skip" },
          ],
        },
      ]);
      stack = stackChoice;
    }

    if (stack === "skip") {
      console.log(chalk.gray("   Skipping stack configuration"));
      return;
    }

    await this.configureStack(stack!);
  }

  private async configureStack(stack: string): Promise<void> {
    const projectRoot = process.cwd();
    const myContextDir = path.join(projectRoot, ".mycontext");
    await fs.ensureDir(myContextDir);

    switch (stack) {
      case "nextjs-tailwind-shadcn":
        await this.setupNextjsTailwindShadcn(myContextDir);
        break;
      case "react-tailwind-shadcn":
        await this.setupReactTailwindShadcn(myContextDir);
        break;
      default:
        console.log(chalk.yellow(`   Unknown stack: ${stack}`));
        return;
    }

    console.log(chalk.green(`   ✅ Configured for ${stack}`));
  }

  private async setupNextjsTailwindShadcn(myContextDir: string): Promise<void> {
    const config = {
      stack: {
        framework: "nextjs",
        routing: "app-router",
        styling: "tailwind",
        ui: "@workspace/ui",
        state: "zustand",
        forms: "react-hook-form",
        icons: "lucide-react",
      },
      timeouts: {
        generation: 120000,
        enhancement: 60000,
        qa: 30000,
      },
      patterns: {
        serverComponent:
          "export default function ComponentName() { return <div>...</div> }",
        clientComponent:
          "'use client'\\nexport default function ComponentName() { return <div>...</div> }",
        imports: {
          ui: "@workspace/ui/components",
          next: "next/navigation",
          react: "react",
        },
      },
      quality: {
        minQAScore: 90,
        requireTypeScript: true,
        requireAccessibility: true,
        forbiddenDependencies: [
          "react-router-dom",
          "styled-components",
          "@emotion/styled",
          "react-i18next",
          "react-query",
          "@tanstack/react-query",
          "axios",
          "lodash",
        ],
      },
    };

    const dependencies = {
      allowed: [
        "react",
        "next",
        "@workspace/ui",
        "tailwindcss",
        "zustand",
        "react-hook-form",
        "lucide-react",
        "clsx",
        "class-variance-authority",
        "tailwind-merge",
      ],
      forbidden: [
        "react-router-dom",
        "styled-components",
        "@emotion/styled",
        "react-i18next",
        "react-query",
        "@tanstack/react-query",
        "axios",
        "lodash",
      ],
      required: ["react", "next", "@workspace/ui"],
    };

    await fs.writeFile(
      path.join(myContextDir, "config.json"),
      JSON.stringify(config, null, 2)
    );
    await fs.writeFile(
      path.join(myContextDir, "dependencies.json"),
      JSON.stringify(dependencies, null, 2)
    );

    // Create templates directory
    const templatesDir = path.join(myContextDir, "templates");
    await fs.ensureDir(templatesDir);

    // Generate Next.js templates
    await fs.writeFile(
      path.join(templatesDir, "nextjs-component.tsx"),
      `"use client";

import React from "react";
import { Button } from "@workspace/ui/components/button";
import { Card } from "@workspace/ui/components/card";
import { cn } from "@workspace/ui/lib/utils";

interface ComponentNameProps {
  className?: string;
  children?: React.ReactNode;
}

export default function ComponentName({
  className,
  children,
}: ComponentNameProps) {
  return <Card className={cn("p-4", className)}>{children}</Card>;
}`
    );
  }

  private async setupReactTailwindShadcn(myContextDir: string): Promise<void> {
    const config = {
      stack: {
        framework: "react",
        routing: "react-router",
        styling: "tailwind",
        ui: "@workspace/ui",
        state: "zustand",
        forms: "react-hook-form",
        icons: "lucide-react",
      },
      timeouts: {
        generation: 120000,
        enhancement: 60000,
        qa: 30000,
      },
      patterns: {
        component:
          "export default function ComponentName() { return <div>...</div> }",
        imports: {
          ui: "@workspace/ui/components",
          router: "react-router-dom",
          react: "react",
        },
      },
      quality: {
        minQAScore: 90,
        requireTypeScript: true,
        requireAccessibility: true,
        forbiddenDependencies: [
          "styled-components",
          "@emotion/styled",
          "react-i18next",
          "react-query",
          "@tanstack/react-query",
          "axios",
          "lodash",
        ],
      },
    };

    const dependencies = {
      allowed: [
        "react",
        "react-dom",
        "react-router-dom",
        "@workspace/ui",
        "tailwindcss",
        "zustand",
        "react-hook-form",
        "lucide-react",
        "clsx",
        "class-variance-authority",
        "tailwind-merge",
      ],
      forbidden: [
        "styled-components",
        "@emotion/styled",
        "react-i18next",
        "react-query",
        "@tanstack/react-query",
        "axios",
        "lodash",
      ],
      required: ["react", "react-dom", "@workspace/ui"],
    };

    await fs.writeFile(
      path.join(myContextDir, "config.json"),
      JSON.stringify(config, null, 2)
    );
    await fs.writeFile(
      path.join(myContextDir, "dependencies.json"),
      JSON.stringify(dependencies, null, 2)
    );

    // Create templates directory
    const templatesDir = path.join(myContextDir, "templates");
    await fs.ensureDir(templatesDir);

    // Generate React templates
    await fs.writeFile(
      path.join(templatesDir, "react-component.tsx"),
      `import React from "react";
import { Button } from "@workspace/ui/components/button";
import { Card } from "@workspace/ui/components/card";
import { cn } from "@workspace/ui/lib/utils";

interface ComponentNameProps {
  className?: string;
  children?: React.ReactNode;
}

export default function ComponentName({
  className,
  children,
}: ComponentNameProps) {
  return <Card className={cn("p-4", className)}>{children}</Card>;
}`
    );
  }

  private async configureProvider(provider: string): Promise<void> {
    const homeDir = os.homedir();
    const envPath = path.join(homeDir, ".mycontext", ".env");

    let envVar = "";
    let apiKey = "";

    switch (provider) {
      case "qwen":
        envVar = "MYCONTEXT_QWEN_API_KEY";
        console.log(chalk.cyan("\n🌐 Qwen3 Coder Setup"));
        console.log(chalk.gray("1. Visit https://openrouter.ai/"));
        console.log(chalk.gray("2. Create an account (free)"));
        console.log(chalk.gray("3. Get your API key"));
        break;
      case "github":
        envVar = "MYCONTEXT_GITHUB_TOKEN";
        console.log(chalk.cyan("\n🐙 GitHub Models Setup"));
        console.log(
          chalk.gray(
            "1. Go to GitHub Settings > Developer settings > Personal access tokens"
          )
        );
        console.log(
          chalk.gray("2. Create a token with 'models:read' permission")
        );
        break;
      case "openai":
        envVar = "MYCONTEXT_OPENAI_API_KEY";
        console.log(chalk.cyan("\n🤖 OpenAI Setup"));
        console.log(
          chalk.gray("1. Visit https://platform.openai.com/api-keys")
        );
        console.log(chalk.gray("2. Create a new API key"));
        break;
      case "claude":
        envVar = "MYCONTEXT_CLAUDE_API_KEY";
        console.log(chalk.cyan("\n🧠 Claude Setup"));
        console.log(chalk.gray("1. Visit https://console.anthropic.com/"));
        console.log(chalk.gray("2. Create an API key"));
        break;
      case "hosted":
        envVar = "MYCONTEXT_HOSTED_API_KEY";
        console.log(chalk.cyan("\n☁️  Hosted Service Setup"));
        console.log(chalk.green("✅ FREE during beta period!"));
        console.log(chalk.gray("1. Visit https://mycontext.fbien.com/signup"));
        console.log(chalk.gray("2. Create an account (free during beta)"));
        console.log(chalk.gray("3. Get your API key"));
        break;
    }

    const { apiKey: inputKey } = await inquirer.prompt([
      {
        type: "password",
        name: "apiKey",
        message: `Enter your ${provider} API key:`,
        validate: (input: string) => {
          if (!input.trim()) {
            return "API key is required";
          }
          return true;
        },
      },
    ]);

    apiKey = inputKey;

    // Write to .env file
    const envContent = `# MyContext API Configuration
${envVar}=${apiKey}

# Add other providers as needed:
# MYCONTEXT_QWEN_API_KEY=sk-or-xxx
# MYCONTEXT_GITHUB_TOKEN=ghp_xxx
# MYCONTEXT_OPENAI_API_KEY=sk-xxx
# MYCONTEXT_CLAUDE_API_KEY=sk-ant-xxx
`;

    await fs.writeFile(envPath, envContent);
    console.log(chalk.green(`   ✅ ${provider} API key configured`));
  }

  private async verifySetup(): Promise<void> {
    console.log(chalk.yellow("\n🔍 Verifying Setup"));

    // Check if .env file exists
    const homeDir = os.homedir();
    const envPath = path.join(homeDir, ".mycontext", ".env");

    if (await fs.pathExists(envPath)) {
      console.log(chalk.green("   ✅ Environment file configured"));
    } else {
      console.log(chalk.yellow("   ⚠️  No environment file found"));
    }

    // Check if we can load the configuration
    try {
      const { HybridAIClient } = await import("../utils/hybridAIClient");
      const client = new HybridAIClient();
      console.log(chalk.green("   ✅ AI client initialized"));
    } catch (error) {
      console.log(chalk.red("   ❌ AI client initialization failed"));
    }
  }

  private async saveSetupStatus(): Promise<void> {
    const setupStatus = {
      completed: true,
      timestamp: new Date().toISOString(),
      version: "0.4.21",
    };

    await fs.writeJson(this.setupConfigPath, setupStatus, { spaces: 2 });
  }

  private async isAlreadySetup(): Promise<boolean> {
    return await fs.pathExists(this.setupConfigPath);
  }

  private async showCurrentStatus(): Promise<void> {
    console.log(chalk.blue("\n📊 Current Status:"));

    // Check environment file
    const homeDir = os.homedir();
    const envPath = path.join(homeDir, ".mycontext", ".env");

    if (await fs.pathExists(envPath)) {
      const envContent = await fs.readFile(envPath, "utf-8");
      const providers = [];

      if (envContent.includes("MYCONTEXT_QWEN_API_KEY"))
        providers.push("Qwen3 Coder");
      if (envContent.includes("MYCONTEXT_GITHUB_TOKEN"))
        providers.push("GitHub Models");
      if (envContent.includes("MYCONTEXT_OPENAI_API_KEY"))
        providers.push("OpenAI");
      if (envContent.includes("MYCONTEXT_CLAUDE_API_KEY"))
        providers.push("Claude");

      if (providers.length > 0) {
        console.log(
          chalk.green(`   ✅ Configured providers: ${providers.join(", ")}`)
        );
      } else {
        console.log(chalk.yellow("   ⚠️  No API providers configured"));
      }
    } else {
      console.log(chalk.yellow("   ⚠️  No environment file found"));
    }

    // Check setup status
    if (await this.isAlreadySetup()) {
      const setupData = await fs.readJson(this.setupConfigPath);
      console.log(chalk.green(`   ✅ Setup completed: ${setupData.timestamp}`));
    }
  }
}
