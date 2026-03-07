import { Command } from "commander";
import chalk from "chalk";
import * as fs from "fs-extra";
import path from "path";
import { EnhancedSpinner } from "../utils/spinner";
import { HybridAIClient } from "../utils/hybridAIClient";
import { logger } from "../utils/logger";
import { BrainClient } from "../core/brain/BrainClient";
import { BrainRole } from "@myycontext/core";

export class IdeateCommand {
  private spinner: EnhancedSpinner;
  private ai: HybridAIClient;
  private brain: BrainClient;
    
  constructor() {
    this.spinner = new EnhancedSpinner("Dreaming up UI concepts...");
    this.ai = new HybridAIClient();
    this.brain = BrainClient.getInstance();
  }

  async execute(options: { industry?: string; count?: number; output?: string }): Promise<void> {
    const projectPath = process.cwd();
    const contextDir = path.join(projectPath, ".mycontext");
    const ideasDir = options.output ? path.resolve(projectPath, options.output) : path.join(contextDir, "ideas");

    this.spinner.start();

    if (!fs.existsSync(contextDir)) {
      this.spinner.fail("No .mycontext directory found");
      console.log(chalk.red("\n❌ Run 'mycontext init' first to establish project context."));
      return;
    }

    try {
      await fs.ensureDir(ideasDir);

      // 1. Load context
      const contextPath = path.join(contextDir, "context.json");
      let projectContext = {};
      if (fs.existsSync(contextPath)) {
        projectContext = await fs.readJson(contextPath);
      }

      const industry = options.industry || (projectContext as any)?.prd?.title || "SaaS Application";
      const count = options.count || 3;

      this.spinner.updateText(`Generating ${count} creative concepts and visual asset plan for ${industry}...`);
      
      await this.brain.addUpdate(
        "Ideator", 
        "planner", 
        "thought", 
        `Exploring ${count} UI concepts and ${industry} visual assets.`
      );

      // 2. Build Ideation Prompt
      const ideationPrompt = `
        You are a World-Class UI/UX Creative Director and Visual Specialist. 
        Generate ${count} distinct, high-fidelity UI/UX concepts for a project in the "${industry}" industry.
        
        Context: ${JSON.stringify(projectContext)}
        
        For each concept, provide:
        1. **Concept Name**: A bold, catchy name.
        2. **Visual Direction**: Color palette, typography, and "vibe" (e.g., Glassmorphism, Brutalism, Cyberpunk, Apple-esque).
        3. **Key Layout Innovations**: Unique ways to present information relevant to this industry.
        4. **User Experience Hook**: A specific interaction or flow that makes this stand out.

        ## VISUAL ASSETS PLAN
        Identify exactly 8 high-impact visual assets required for a premier landing page and dashboard for this project.
        For each asset, provide:
        - "id": kebab-case name (e.g., hero-background, feature-analytics-icon)
        - "type": (e.g., hero-image, icon, avatar, product-shot)
        - "description": detailed visual prompt for an image generator
        
        Format the response in two parts:
        Part 1: The Markdown Report.
        Part 2: A JSON block at the end with the VISUAL ASSETS PLAN data.
      `;

      const response = await this.ai.generateText(ideationPrompt);
      
      // Extract Markdown and JSON
      const jsonMatch = response.text.match(/```json\n([\s\S]*?)\n```/);
      const manifestData = (jsonMatch && jsonMatch[1]) ? JSON.parse(jsonMatch[1]) : null;
      const markdownReport = response.text.replace(/```json\n[\s\S]*?\n```/, "").trim();

      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const reportName = `ideation-report-${timestamp}.md`;
      const reportPath = path.join(ideasDir, reportName);

      await fs.writeFile(reportPath, markdownReport, "utf8");

      if (manifestData) {
        const manifestPath = path.join(contextDir, "images-manifest.json");
        await fs.writeJson(manifestPath, manifestData, { spaces: 2 });
        await this.brain.addUpdate(
          "Ideator", 
          "planner", 
          "action", 
          `Generated visual asset manifest with ${manifestData.visualAssets?.length || 0} planned assets.`
        );
        console.log(chalk.gray(`   ✅ Visual Asset Manifest saved to ${manifestPath}`));
      }

      // Sync with Brain narrative
      const conceptNames = response.text.match(/\*\*Concept Name\*\*:\s*([^\n]+)/g) || [];
      if (conceptNames.length > 0) {
        const narrative = `Focusing on UI concepts: ${conceptNames.map(n => n.replace(/\*\*Concept Name\*\*:\s*/, "").trim()).join(", ")}.`;
        await this.brain.setNarrative(narrative);
      }

      this.spinner.succeed(`Generated ${count} concepts!`);
      
      console.log(chalk.green(`\n🎨 Ideation Report saved to: ${reportPath}\n`));
      
      console.log(chalk.blue("Next steps:"));
      console.log(chalk.gray(`  1. Review the ideas in ${reportPath}`));
      console.log(chalk.gray(`  2. Run 'mycontext generate:assets' to create real AI images.`));
      console.log(chalk.gray(`  3. Use 'mycontext generate:screens' to visualize your favorite concept.`));
      console.log(chalk.gray(`  4. Run 'mycontext analyze' if you have a reference image matching a concept.\n`));

    } catch (error: any) {
      this.spinner.fail("Ideation failed");
      logger.error("Ideation error:", error.message);
      throw error;
    }
  }
}

export function registerIdeateCommand(program: Command): void {
  program
    .command("ideate")
    .description("Generate creative UI/UX concepts based on project context")
    .option("-i, --industry <name>", "Specific industry for ideation")
    .option("-c, --count <number>", "Number of concepts to generate", "3")
    .option("-o, --output <path>", "Output directory for ideas")
    .action(async (options: any) => {
      const command = new IdeateCommand();
      await command.execute({
        industry: options.industry,
        count: parseInt(options.count),
        output: options.output
      });
    });
}
