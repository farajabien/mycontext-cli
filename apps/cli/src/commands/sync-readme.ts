import chalk from "chalk";
import * as fs from "fs-extra";
import * as path from "path";
import { DesignManifestManager } from "@myycontext/core";
import { CommandOptions } from "../types";

interface SyncREADMEOptions extends CommandOptions {
  force?: boolean;
  verbose?: boolean;
}

export class SyncREADMECommand {
  private manifestManager: DesignManifestManager;

  constructor() {
    this.manifestManager = new DesignManifestManager();
  }

  async execute(options: SyncREADMEOptions): Promise<void> {
    const projectPath = process.cwd();
    const readmePath = path.join(projectPath, "README.md");

    try {
      console.log(chalk.blue.bold("🔄 Synchronizing README with Living DB..."));

      // 1. Load manifest
      const manifest = await this.manifestManager.loadDesignManifest();
      if (!manifest) {
        console.error(
          chalk.red("❌ Living Brain not found (.mycontext/context.json)")
        );
        console.log(chalk.gray("Run 'mycontext generate architecture' or create a manifest first."));
        return;
      }

      // 2. Read README.md
      if (!(await fs.pathExists(readmePath))) {
        console.error(chalk.red("❌ README.md not found in project root."));
        return;
      }

      const readmeContent = await fs.readFile(readmePath, "utf-8");

      // 3. Generate content to inject
      const injectedContent = this.generateSyncContent(manifest);

      // 4. Perform synchronization
      const updatedContent = this.syncContent(readmeContent, injectedContent);

      if (updatedContent === readmeContent) {
        console.log(chalk.yellow("ℹ️ README is already in sync with manifest."));
        return;
      }

      // 5. Save updated README
      await fs.writeFile(readmePath, updatedContent, "utf-8");

      console.log(chalk.green.bold("✅ README synchronized successfully!"));
      
      if (options.verbose) {
        console.log(chalk.gray("\nUpdated sections based on Living DB state:"));
        console.log(chalk.gray("  • Project Overview"));
        console.log(chalk.gray("  • Key Features"));
        console.log(chalk.gray("  • Technical Stack"));
      }

    } catch (error) {
      console.error(chalk.red("❌ README synchronization failed:"), error);
    }
  }

  private generateSyncContent(manifest: any): string {
    const { phases } = manifest;
    const summary = phases.functional_summary;
    const plan = phases.implementation_plan;

    let content = "\n";
    
    // Project Name & Purpose
    content += `### 🎯 Project Overview\n`;
    content += `**${summary.app_name}**: ${summary.core_purpose}\n\n`;

    // Key Features
    content += `### ✨ Key Features\n`;
    summary.key_features.forEach((feature: string) => {
      content += `- ${feature}\n`;
    });
    content += "\n";

    // Technical Stack
    content += `### 🛠️ Technical Stack\n`;
    content += `- **Framework**: ${plan.framework}\n`;
    content += `- **Data Persistence**: ${plan.data_persistence}\n`;
    if (plan.build_requirements && plan.build_requirements.length > 0) {
      content += `- **Key Libraries**: ${plan.build_requirements.join(", ")}\n`;
    }
    content += "\n";

    // Living DB Status
    content += `--- \n`;
    content += `_Last synchronized with MyContext Living DB on ${new Date().toLocaleDateString()}_\n`;

    return content;
  }

  private syncContent(readme: string, newContent: string): string {
    const startMarker = "<!-- mycontext:start -->";
    const endMarker = "<!-- mycontext:end -->";

    const startIndex = readme.indexOf(startMarker);
    const endIndex = readme.indexOf(endMarker);

    if (startIndex === -1 || endIndex === -1) {
      console.log(chalk.yellow("⚠️  Snap! No MyContext markers found in README.md."));
      console.log(chalk.gray(`Add ${chalk.cyan(startMarker)} and ${chalk.cyan(endMarker)} to enable auto-sync.`));
      return readme;
    }

    const before = readme.substring(0, startIndex + startMarker.length);
    const after = readme.substring(endIndex);

    return `${before}${newContent}${after}`;
  }
}
