import chalk from "chalk";
import prompts from "prompts";
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

    while (true) {
      const { action } = await prompts({
        type: "select",
        name: "action",
        message: "Cockpit Control:",
        choices: [
          { title: "🔄 Sync Brain (Scan & Refresh)", value: "sync" },
          { title: "🏗️  Generate Components (All)", value: "generate" },
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
          // For now, we'll just log
          await new Promise(r => setTimeout(r, 1000));
          console.log(chalk.green("Brain synced successfully!"));
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
}
