import { Command } from "commander";
import chalk from "chalk";
import * as fs from "fs-extra";
import path from "path";
import { AICore } from "../core/ai/AICore";
import { EnhancedSpinner } from "../utils/spinner";
import { logger } from "../utils/logger";
import { BrainClient } from "../core/brain/BrainClient";
import { BrainRole } from "@myycontext/core";

interface ImageAsset {
  id: string;
  type: string;
  description: string;
}

export class GenerateAssetsCommand {
  private spinner: EnhancedSpinner;
  private brain: BrainClient;

  constructor() {
    this.spinner = new EnhancedSpinner("Preparing asset generation...");
    this.brain = BrainClient.getInstance();
  }

  async execute(options: { output?: string }): Promise<void> {
    const projectPath = process.cwd();
    const contextDir = path.join(projectPath, ".mycontext");
    const manifestPath = path.join(contextDir, "images-manifest.json");
    const assetsDir = options.output ? path.resolve(projectPath, options.output) : path.join(projectPath, "public", "assets", "images");

    this.spinner.start();

    if (!fs.existsSync(manifestPath)) {
      this.spinner.fail("No images-manifest.json found");
      console.log(chalk.red("\n❌ Run 'mycontext ideate' first to generate a visual asset plan."));
      return;
    }

    try {
      const manifest = await fs.readJson(manifestPath);
      let assets: ImageAsset[] = [];
      
      if (Array.isArray(manifest)) {
        assets = manifest;
      } else if (manifest.visualAssets && Array.isArray(manifest.visualAssets)) {
        assets = manifest.visualAssets;
      } else if (manifest.assets && Array.isArray(manifest.assets)) {
        assets = manifest.assets;
      }

      if (assets.length === 0) {
        this.spinner.fail("Invalid manifest format or no assets found");
        return;
      }

      await fs.ensureDir(assetsDir);

      const ai = AICore.getInstance({ 
        workingDirectory: projectPath,
        fallbackEnabled: true 
      });

      console.log(chalk.blue(`\n🎨 Generating assets in ${assetsDir}...\n`));

      for (const asset of assets) {
        console.log(chalk.gray(`   [PLAN] ${asset.id} (${asset.type}): ${asset.description}`));
        
        const assetPath = path.join(assetsDir, `${asset.id}.png`);
        
        // Check if asset already exists
        if (fs.existsSync(assetPath)) {
          console.log(chalk.yellow(`   ⏩ Asset ${asset.id} already exists, skipping.`));
          await this.brain.addUpdate(
            "AssetGenerator",
            "builder",
            "action",
            `Skipped existing visual asset: ${asset.id}`,
            { id: asset.id, type: asset.type, path: assetPath }
          );
          continue;
        }

        // Active generation
        this.spinner.updateText(`Generating ${asset.id}...`);
        console.log(chalk.blue(`   🤖 Requesting AI Generation for ${asset.id}...`));
        
        try {
          await ai.generateImage(asset.description, assetPath);
          console.log(chalk.green(`   ✅ Asset ${asset.id} generated successfully.`));
          
          await this.brain.addUpdate(
            "AssetGenerator",
            "builder",
            "action",
            `Generated visual asset: ${asset.id}`,
            { id: asset.id, type: asset.type, path: assetPath }
          );
        } catch (err: any) {
          console.log(chalk.red(`   ❌ Failed to generate ${asset.id}: ${err.message}`));
          // For agentic guidance, we still log the failure for Brain visibility
          await this.brain.addUpdate(
            "AssetGenerator",
            "builder",
            "error",
            `Failed to generate visual asset: ${asset.id}`,
            { id: asset.id, error: err.message }
          );
        }
      }

      console.log(chalk.green(`\n✅ Asset generation pass complete.`));
      console.log(chalk.gray(`   Run 'mycontext generate:screens' to use these assets.\n`));

    } catch (error: any) {
      this.spinner.fail("Asset generation failed");
      logger.error("Asset generation error:", error.message);
      throw error;
    }
  }
}

export function registerGenerateAssetsCommand(program: Command): void {
  program
    .command("generate:assets")
    .alias("ga")
    .description("Generate visual assets planned in images-manifest.json")
    .option("-o, --output <path>", "Output directory for assets (default: public/assets/images)")
    .action(async (options: any) => {
      const command = new GenerateAssetsCommand();
      await command.execute(options);
    });
}
