import { Command } from "commander";
import { CommandOptions } from "../types";
import { EnhancedSpinner } from "../utils/spinner";
import { HybridAIClient } from "../utils/hybridAIClient";
import chalk from "chalk";

interface ModelOptions extends CommandOptions {
  test?: boolean;
  status?: boolean;
  list?: boolean;
  backup?: boolean;
  restore?: boolean;
  update?: boolean;
  remove?: boolean;
  info?: boolean;
}

export class ModelCommand {
  private aiClient: HybridAIClient;

  constructor() {
    this.aiClient = new HybridAIClient();
  }

  async execute(options: ModelOptions): Promise<void> {
    if (options.status) {
      await this.showStatus();
    } else if (options.test) {
      await this.testModel();
    } else if (options.list) {
      await this.listModels();
    } else if (options.info) {
      await this.showInfo();
    } else {
      // Default: show status
      await this.showStatus();
    }
  }

  private async showStatus(): Promise<void> {
    console.log(chalk.blue("📊 MyContext Model Status\n"));

    try {
      // Check available providers
      const providers = await this.aiClient.getAvailableProviders();

      if (providers.length === 0) {
        console.log(chalk.red("❌ No AI providers available"));
        console.log(chalk.yellow("\n🔧 To fix this:"));
        console.log(chalk.gray("1. Run: mycontext setup"));
        console.log(chalk.gray("2. Or add API keys to .mycontext/.env"));
        return;
      }

      console.log(chalk.green("✅ Available Providers:"));
      providers.forEach((provider) => {
        console.log(
          chalk.gray(`   • ${provider.name} (priority: ${provider.priority})`)
        );
      });

      // Test the primary provider
      const primaryProvider = providers[0];
      console.log(chalk.blue(`\n🧪 Testing ${primaryProvider.name}...`));

      try {
        const testResult = await this.aiClient.generateText("Test connection", {
          maxTokens: 10,
        });
        console.log(chalk.green(`   ✅ ${primaryProvider.name} is working`));
      } catch (error: any) {
        console.log(
          chalk.red(`   ❌ ${primaryProvider.name} failed: ${error.message}`)
        );
      }
    } catch (error: any) {
      console.log(chalk.red(`❌ Status check failed: ${error.message}`));
    }
  }

  private async testModel(): Promise<void> {
    const spinner = new EnhancedSpinner("Testing AI model...");

    try {
      spinner.start();

      const testPrompt = "Generate a simple React component called TestButton";
      const result = await this.aiClient.generateText(testPrompt, {
        maxTokens: 100,
      });

      spinner.success({ text: "Model test completed" });

      console.log(chalk.green("\n✅ Model Test Results:"));
      console.log(chalk.gray(`Provider: ${result.provider}`));
      console.log(
        chalk.gray(`Response length: ${result.text.length} characters`)
      );
      console.log(chalk.blue("\n📝 Generated Content:"));
      console.log(chalk.gray(result.text));
    } catch (error: any) {
      spinner.error({ text: "Model test failed" });
      console.log(chalk.red(`❌ Test failed: ${error.message}`));
    }
  }

  private async listModels(): Promise<void> {
    console.log(chalk.blue("📋 Available AI Models\n"));

    try {
      const providers = await this.aiClient.getAllProviders();

      if (providers.length === 0) {
        console.log(chalk.red("❌ No providers available"));
        return;
      }

      for (const provider of providers) {
        console.log(chalk.green(`🤖 ${provider.name.toUpperCase()}`));
        console.log(chalk.gray(`   Priority: ${provider.priority}`));
        console.log(
          chalk.gray(
            `   Available: ${(await provider.isAvailable()) ? "Yes" : "No"}`
          )
        );
        console.log();
      }
    } catch (error: any) {
      console.log(chalk.red(`❌ Failed to list models: ${error.message}`));
    }
  }

  private async showInfo(): Promise<void> {
    console.log(chalk.blue("ℹ️  MyContext Model Information\n"));

    console.log(chalk.yellow("🎯 Recommended Setup:"));
    console.log(chalk.gray("1. Qwen3 Coder (FREE) - Primary provider"));
    console.log(chalk.gray("2. Gemini 2.0 Flash (FREE) - Secondary provider"));
    console.log(chalk.gray("3. GitHub Models - Tertiary provider"));
    console.log(chalk.gray("4. Claude/OpenAI - Fallback providers"));

    console.log(chalk.yellow("\n🔑 API Keys Needed:"));
    console.log(chalk.gray("• MYCONTEXT_QWEN_API_KEY (OpenRouter)"));
    console.log(chalk.gray("• MYCONTEXT_GEMINI_API_KEY (Google)"));
    console.log(chalk.gray("• MYCONTEXT_GITHUB_TOKEN (GitHub)"));
    console.log(chalk.gray("• MYCONTEXT_CLAUDE_API_KEY (Anthropic)"));
    console.log(chalk.gray("• MYCONTEXT_OPENAI_API_KEY (OpenAI)"));

    console.log(chalk.yellow("\n🚀 Quick Start:"));
    console.log(chalk.gray("1. Run: mycontext setup"));
    console.log(
      chalk.gray("2. Choose Qwen3 Coder (free) or Gemini 2.0 Flash (free)")
    );
    console.log(chalk.gray("3. Add your API key"));
    console.log(chalk.gray("4. Start generating components!"));

    console.log(chalk.yellow("\n📚 More Info:"));
    console.log(chalk.gray("• Qwen3 Coder: https://openrouter.ai/"));
    console.log(chalk.gray("• Gemini 2.0 Flash: https://ai.google.dev/"));
    console.log(
      chalk.gray("• GitHub Models: https://github.com/features/github-models")
    );
    console.log(chalk.gray("• Documentation: https://mycontext.fbien.com"));
  }
}
