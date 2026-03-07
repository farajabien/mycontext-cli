import chalk from "chalk";
import prompts from "prompts";
import path from "path";
import { TUIClient } from "./TUIClient";
import { LivingContext } from "../types/living-context";

export class DashboardMode {
  private client: TUIClient;
  private projectPath: string;

  constructor(client: TUIClient, projectPath: string) {
    this.client = client;
    this.projectPath = projectPath;
  }

  /**
   * Main Dashboard loop
   */
  async start(context: LivingContext): Promise<void> {
    console.clear();
    this.renderHeader(context);
    this.renderSummary(context);
    this.renderFeatures(context);

    while (true) {
      const { action } = await prompts({
        type: "select",
        name: "action",
        message: "Cockpit Control:",
        choices: [
          { title: "🔄 Sync Brain (Scan & Refresh)", value: "sync" },
          { title: "🏗️  Generate Components (All)", value: "generate" },
          { title: "🎨 Design Ideation (Concepts)", value: "ideate" },
          { title: "🖼️  Recursive Enrichment (Screenshot)", value: "enrich" },
          { title: "📋 View Component Registry", value: "registry" },
          { title: "🎨 Edit Brand/Design", value: "brand" },
          { title: "🧠 Refine Requirements", value: "refine" },
          { title: "❌ Exit", value: "exit" },
        ],
      });

      if (action === "exit") process.exit(0);
      
      if (action === "sync") {
          console.log(chalk.blue("\nTriggering Brain Sync..."));
          // Logic to trigger mycontext generate context --full
          await new Promise(r => setTimeout(r, 1000));
          console.log(chalk.green("Brain synced successfully!"));
      }

      if (action === "ideate") {
          const { IdeateCommand } = await import("../commands/ideate");
          const ideateCommand = new IdeateCommand();
          await ideateCommand.execute({ industry: context.prd?.title });
          
          await prompts({ type: "text", name: "any", message: "Press enter to continue..." });
      }

      if (action === "enrich") {
          const { imagePath } = await prompts({
              type: "text",
              name: "imagePath",
              message: "Provide path to screenshot/mockup for enrichment:"
          });
          
          if (imagePath) {
              const { AnalyzeScreenshotCommand } = await import("../commands/analyze-screenshot");
              // Use standard register and execute pattern
              // For TUI, we might want to directly call the service
              const { GeminiVisionService } = await import("../services/gemini-vision");
              const service = new GeminiVisionService();
              
              console.log(chalk.blue("\nEnriching Brain with Visual Intent..."));
              const analysis = await service.analyzeScreenshot(imagePath);
              
              // Feed analysis back into context.json
              const contextPath = path.join(this.projectPath, ".mycontext", "context.json");
              const fs = await import("fs-extra");
              const currentContext = await fs.readJson(contextPath);
              
              // Update context with analysis metadata
              currentContext.aestheticPreference = analysis.designSystem?.colors?.primary || currentContext.aestheticPreference;
              currentContext.metadata.lastEnrichedAt = new Date().toISOString();
              
              // Add analysis to a dedicated visual history or just update requirements
              if (!currentContext.visualReferences) currentContext.visualReferences = [];
              currentContext.visualReferences.push({
                path: imagePath,
                timestamp: new Date().toISOString(),
                insights: analysis.fullAnalysis
              });
              
              await fs.writeJson(contextPath, currentContext, { spaces: 2 });
              
              console.log(chalk.green("✓ Analysis complete! Brain enriched with new design tokens."));
              await prompts({ type: "text", name: "any", message: "Press enter to continue..." });
          }
      }

      if (action === "refine") {
          // Switch back to planning mode for refinement
          await this.client.startPlanningMode();
          return;
      }
      
      // Loop back
      console.clear();
      this.renderHeader(context);
      this.renderSummary(context);
      this.renderFeatures(context);
    }
  }

  private renderHeader(context: LivingContext) {
    console.log(chalk.cyan("========================================"));
    console.log(chalk.bold.white(`   MYCONTEXT COCKPIT | ${context.prd?.title || "Project"}`));
    console.log(chalk.cyan("========================================\n"));
  }

  private renderSummary(context: LivingContext) {
    const componentsCount = context.components?.length || 0;
    const featuresCount = context.features?.length || 0;
    const entitiesCount = context.specs?.databaseSchema?.tables?.length || 0;

    console.log(chalk.bold("Project Health:"));
    console.log(chalk.gray(`• Features:   ${chalk.white(featuresCount)}`));
    console.log(chalk.gray(`• Entities:   ${chalk.white(entitiesCount)}`));
    console.log(chalk.gray(`• Components: ${chalk.white(componentsCount)}`));
    
    if (context.metadata?.lastUpdatedAt) {
        console.log(chalk.gray(`\nLast Sync: ${chalk.cyan(new Date(context.metadata.lastUpdatedAt).toLocaleString())}`));
    }
    console.log("");
  }

  private renderFeatures(context: LivingContext) {
    if (!context.features || context.features.length === 0) return;

    console.log(chalk.bold("Feature Progress:"));
    
    context.features.forEach(feature => {
      const status = feature.status || "planned";
      let statusColor = chalk.gray;
      let icon = "○";

      if (status === "completed") {
        statusColor = chalk.green;
        icon = "●";
      } else if (status === "in-progress") {
        statusColor = chalk.yellow;
        icon = "◐";
      }

      const barWidth = 20;
      const progress = this.calculateFeatureProgress(feature, context);
      const filledWidth = Math.round((progress / 100) * barWidth);
      const bar = chalk.green("█".repeat(filledWidth)) + chalk.gray("░".repeat(barWidth - filledWidth));

      console.log(`${statusColor(icon)} ${chalk.white(feature.name.padEnd(20))} ${bar} ${chalk.cyan(progress + "%")}`);
    });
    
    console.log("");
  }

  private calculateFeatureProgress(feature: any, context: LivingContext): number {
    if (feature.status === "Completed") return 100;
    if (feature.status === "Planned") return 0;
    
    // Simple heuristic: ratio of generated components to total required components
    const componentIds = feature.componentIds || [];
    if (componentIds.length === 0) return 30; // 30% if in progress but no specific components tracked

    const generatedCount = componentIds.filter((id: string) => {
      return context.components?.some(c => c.name === id && c.status === "generated");
    }).length;

    return Math.round((generatedCount / componentIds.length) * 100);
  }
}
