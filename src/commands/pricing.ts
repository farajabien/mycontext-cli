import { Command } from "commander";
import { CommandOptions } from "../types";
import { HostedApiClient } from "../utils/hostedApiClient";
import chalk from "chalk";
import * as fs from "fs-extra";
import * as path from "path";

interface PricingOptions extends CommandOptions {
  show?: boolean;
  current?: boolean;
}

export class PricingCommand {
  private pricingConfig: any;

  constructor() {
    this.loadPricingConfig();
  }

  private loadPricingConfig() {
    try {
      const configPath = path.join(__dirname, "../config/pricing.json");
      this.pricingConfig = fs.readJsonSync(configPath);
    } catch (error) {
      console.log(chalk.red("Failed to load pricing configuration"));
      process.exit(1);
    }
  }

  async execute(options: PricingOptions): Promise<void> {
    if (options.current) {
      await this.showCurrentUsage();
    } else {
      this.showPricingPlans();
    }
  }

  private showPricingPlans(): void {
    console.log(chalk.blue("🚀 MyContext Beta - BYOK Model\n"));

    console.log(chalk.green("🎉 We're in Beta!"));
    console.log(
      chalk.gray(
        "All usage is Bring Your Own Key (BYOK) - no pricing, no subscriptions!\n"
      )
    );

    console.log(chalk.blue("🔑 How It Works:"));
    console.log(
      chalk.gray("1. Use your own API keys (Claude or GPT recommended)")
    );
    console.log(
      chalk.gray("2. Pay only what you normally pay to your API provider")
    );
    console.log(chalk.gray("3. No rate limits or usage tracking from us"));
    console.log(chalk.gray("4. Complete control over costs and performance\n"));

    console.log(chalk.yellow("🚀 Quick Start:"));
    console.log(
      chalk.gray("• Run 'mycontext setup' to configure your API keys")
    );
    console.log(chalk.gray("• Get started: mycontext init my-app"));
    console.log(chalk.gray("• Recommended: Claude or GPT for best results"));
  }

  private async showCurrentUsage(): Promise<void> {
    console.log(chalk.blue("📊 Current Configuration\n"));

    console.log(chalk.green("✅ Beta Mode Active"));
    console.log(chalk.gray("You're using the BYOK (Bring Your Own Key) model"));
    console.log(chalk.gray("No billing or usage tracking from MyContext\n"));

    console.log(chalk.yellow("🔑 Your API Keys:"));
    console.log(
      chalk.gray("• Check your .mycontext/.env file for configured keys")
    );
    console.log(chalk.gray("• Recommended: Claude or GPT for best results"));
    console.log(
      chalk.gray("• You pay only what you normally pay to your API provider\n")
    );

    console.log(chalk.blue("💡 Tips:"));
    console.log(
      chalk.gray("• Run 'mycontext model status' to check your AI setup")
    );
    console.log(
      chalk.gray("• Run 'mycontext setup' to configure new API keys")
    );
  }
}
