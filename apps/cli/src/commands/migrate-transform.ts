import chalk from "chalk";
import { CommandOptions } from "../types";
import { FileSystemManager } from "../utils/fileSystem";
import { EnhancedSpinner } from "../utils/spinner";
import { CodeGenSubAgent } from "../agents/implementations/CodeGenSubAgent";
import { AICore } from "../core/ai/AICore";
import * as path from "path";
import * as fs from "fs-extra";

interface MigrateOptions extends CommandOptions {
  path?: string;
  all?: boolean;
}

export class MigrateTransformCommand {
  private fs = new FileSystemManager();
  private spinner = new EnhancedSpinner("Refactoring...");

  async migrateRtl(options: MigrateOptions): Promise<void> {
    await this.runTransform("rtl", "Convert styles to RTL-friendly logical properties (e.g., ml-4 -> ms-4).", options);
  }

  async migrateRadix(options: MigrateOptions): Promise<void> {
    await this.runTransform("radix", "Refactor primitive UI elements to use Radix UI / Shadcn primitives.", options);
  }

  private async runTransform(type: string, goal: string, options: MigrateOptions): Promise<void> {
    const { path: targetPath, all = false } = options;

    if (!targetPath && !all) {
      console.log(chalk.red("❌ Please specify a --path or use --all"));
      return;
    }

    console.log(chalk.blue.bold(`🔄 Running ${type} migration...\n`));

    try {
      this.spinner.start();
      const files = await this.getTargetFiles(targetPath, all);
      
      const enhancementAgent = new (await import("../agents/implementations/EnhancementAgent")).EnhancementAgent();
      const aiCore = AICore.getInstance();
      const livingContext = await aiCore.getLivingContext();

      for (const file of files) {
        this.spinner.updateText(`Transforming ${path.basename(file)}...`);
        const content = await fs.readFile(file, "utf8");
        
        const result = await enhancementAgent.run({
          currentComponent: content,
          userPrompt: goal,
          designContext: {
            colors: [],
            spacing: "relaxed",
            typography: "modern",
            interactions: ["hover", "focus"]
          },
          constraints: {
            maxDependencies: 10,
            targetFramework: "next",
            uiLibrary: "shadcn"
          }
        });

        await fs.writeFile(file, result.enhancedComponent);
      }

      this.spinner.succeed(`Migration ${type} completed for ${files.length} files!`);
    } catch (error) {
      this.spinner.fail(`Migration ${type} failed`);
      throw error;
    }
  }

  private async getTargetFiles(targetPath?: string, all?: boolean): Promise<string[]> {
    if (targetPath) {
      const fullPath = path.resolve(process.cwd(), targetPath);
      if (await fs.pathExists(fullPath)) {
        const stats = await fs.stat(fullPath);
        if (stats.isFile()) return [fullPath];
        if (stats.isDirectory()) {
          const files = await fs.readdir(fullPath);
          return files.filter(f => /\.(tsx|ts|jsx|js)$/.test(f)).map(f => path.join(fullPath, f));
        }
      }
    }
    
    if (all) {
      // Logic to find all components in src/components
      const componentsDir = path.join(process.cwd(), "src", "components");
      if (await fs.pathExists(componentsDir)) {
        // Simple recursive find (placeholder for more robust logic)
        return this.walkSync(componentsDir).filter(f => /\.(tsx|ts|jsx|js)$/.test(f));
      }
    }

    return [];
  }

  private walkSync(dir: string, filelist: string[] = []): string[] {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
      const filepath = path.join(dir, file);
      if (fs.statSync(filepath).isDirectory()) {
        filelist = this.walkSync(filepath, filelist);
      } else {
        filelist.push(filepath);
      }
    });
    return filelist;
  }
}
