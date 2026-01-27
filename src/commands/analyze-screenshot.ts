import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import fs from "fs";
import path from "path";
import { GeminiVisionService } from "../services/gemini-vision";

export class AnalyzeScreenshotCommand {
  private program: Command;

  constructor(program: Command) {
    this.program = program;
  }

  public register(): void {
    this.program
      .command("analyze <imagePath>")
      .description("Analyze a screenshot and generate context using Gemini Vision")
      .option("-o, --output <path>", "Output file path", ".mycontext/context.md")
      .option("--project-name <name>", "Project name", "My Project")
      .option("--json", "Output raw JSON analysis")
      .action(async (imagePath: string, options: any) => {
        await this.execute(imagePath, options);
      });
  }

  private async execute(
    imagePath: string,
    options: { output: string; projectName: string; json?: boolean }
  ): Promise<void> {
    try {
      // Validate image exists
      if (!fs.existsSync(imagePath)) {
        console.log(chalk.red(`❌ Image not found: ${imagePath}`));
        process.exit(1);
      }

      console.log(chalk.blue("\n🔍 Analyzing screenshot with Gemini Vision...\n"));

      const spinner = ora("Connecting to Gemini API...").start();

      // Initialize Gemini service
      const geminiService = new GeminiVisionService();
      
      spinner.text = "Analyzing UI components...";
      const analysis = await geminiService.analyzeScreenshot(imagePath);

      spinner.succeed("Analysis complete!");

      // Output results
      if (options.json) {
        console.log(JSON.stringify(analysis, null, 2));
        return;
      }

      // Display summary
      console.log(chalk.green("\n╔══════════════════════════════════════╗"));
      console.log(chalk.green("║  Analysis Complete                   ║"));
      console.log(chalk.green("╚══════════════════════════════════════╝\n"));

      console.log(chalk.cyan("📦 Detected Components:"));
      analysis.components.slice(0, 5).forEach((comp) => {
        console.log(chalk.white(`  • ${comp.name}`) + chalk.gray(` (${comp.type})`));
      });
      if (analysis.components.length > 5) {
        console.log(chalk.gray(`  ... and ${analysis.components.length - 5} more`));
      }

      console.log(chalk.cyan("\n🎨 Design System:"));
      if (analysis.designSystem.colors.primary) {
        console.log(chalk.white(`  • Primary: ${analysis.designSystem.colors.primary}`));
      }
      if (analysis.designSystem.spacing.baseUnit) {
        console.log(chalk.white(`  • Base Unit: ${analysis.designSystem.spacing.baseUnit}`));
      }

      console.log(chalk.cyan("\n📐 Layout:"));
      console.log(chalk.white(`  • Type: ${analysis.layout.type}`));
      console.log(chalk.white(`  • ${analysis.layout.structure}`));

      console.log(chalk.cyan("\n💻 Recommended Tech Stack:"));
      analysis.techStack.suggested.forEach((tech) => {
        console.log(chalk.white(`  • ${tech}`));
      });

      // Generate context file
      const spinner2 = ora("Generating context file...").start();
      
      const contextContent = geminiService.generateContextFromAnalysis(
        analysis,
        options.projectName
      );

      // Ensure directory exists
      const outputDir = path.dirname(options.output);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      fs.writeFileSync(options.output, contextContent, "utf-8");
      
      spinner2.succeed(`Context saved to ${options.output}`);

      console.log(chalk.green("\n╔══════════════════════════════════════╗"));
      console.log(chalk.green("║  🎉 Ready to Code!                   ║"));
      console.log(chalk.green("╚══════════════════════════════════════╝\n"));

      console.log(chalk.white("Next steps:"));
      console.log(chalk.gray("  1. ") + chalk.white(`cat ${options.output}`) + chalk.gray(" # Review context"));
      console.log(chalk.gray("  2. ") + chalk.white("mycontext generate") + chalk.gray(" # Generate screens"));
      console.log(chalk.gray("  3. ") + chalk.white("mycontext preview") + chalk.gray(" # Preview in Studio\n"));

    } catch (error) {
      console.log(chalk.red(`\n❌ Error: ${error instanceof Error ? error.message : "Unknown error"}`));
      
      if (error instanceof Error && error.message.includes("API key")) {
        console.log(chalk.yellow("\n💡 Tip: Set your Gemini API key:"));
        console.log(chalk.gray("   export GEMINI_API_KEY=your_key_here"));
        console.log(chalk.gray("   Or add it to your .env file\n"));
      }
      
      process.exit(1);
    }
  }
}
