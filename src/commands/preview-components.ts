import chalk from "chalk";
import { CommandOptions } from "../types";
import { FileSystemManager } from "../utils/fileSystem";
import { execSync } from "child_process";

export interface PreviewComponentsOptions extends CommandOptions {
  validate?: boolean;
}

export class PreviewComponentsCommand {
  private fs = new FileSystemManager();

  async execute(options: PreviewComponentsOptions): Promise<void> {
    console.log(chalk.blue("🔍 Opening component preview..."));

    try {
      // Check if preview route exists
      const previewPath = "app/mycontext-preview/page.tsx";
      if (!(await this.fs.exists(previewPath))) {
        console.log(
          chalk.yellow(
            "⚠️  Preview route not found. Creating basic preview page..."
          )
        );
        await this.createBasicPreviewPage();
      }

      // Check if components exist
      const componentsDir = ".mycontext/components";
      if (!(await this.fs.exists(componentsDir))) {
        console.log(
          chalk.red(
            "❌ No components found. Run 'mycontext generate:components --core-only' first."
          )
        );
        return;
      }

      // Run validation if requested
      if (options.validate) {
        await this.runValidationChecks();
      }

      // Open preview in browser
      await this.openPreview();
    } catch (error) {
      console.error(chalk.red("❌ Preview failed:"), error);
      throw error;
    }
  }

  private async createBasicPreviewPage(): Promise<void> {
    const previewContent = `import React from 'react';

export default function MyContextPreview() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          MyContext Component Preview
        </h1>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Component Gallery</h2>
          <p className="text-gray-600">
            Your generated components will appear here. Run the following commands to get started:
          </p>
          
          <div className="mt-4 bg-gray-100 p-4 rounded">
            <code className="text-sm">
              mycontext generate:components --core-only
            </code>
          </div>
          
          <div className="mt-2 bg-gray-100 p-4 rounded">
            <code className="text-sm">
              mycontext preview:components --validate
            </code>
          </div>
        </div>
      </div>
    </div>
  );
}`;

    await this.fs.ensureDir("app/mycontext-preview");
    await this.fs.writeFile("app/mycontext-preview/page.tsx", previewContent);

    console.log(chalk.green("✅ Created basic preview page"));
  }

  private async runValidationChecks(): Promise<void> {
    console.log(chalk.blue("🔍 Running validation checks..."));

    try {
      // TypeScript check
      console.log(chalk.gray("   Running TypeScript check..."));
      execSync("npx tsc --noEmit", { stdio: "pipe" });
      console.log(chalk.green("   ✅ TypeScript check passed"));

      // Lint check
      console.log(chalk.gray("   Running ESLint..."));
      execSync("npx eslint .mycontext/components --ext .ts,.tsx", {
        stdio: "pipe",
      });
      console.log(chalk.green("   ✅ ESLint check passed"));
    } catch (error) {
      console.log(chalk.yellow("   ⚠️ Some validation checks failed"));
    }
  }

  private async openPreview(): Promise<void> {
    try {
      // Try to open in browser
      const url = "http://localhost:3000/mycontext-preview";

      // Check if Next.js dev server is running
      try {
        execSync("curl -s http://localhost:3000 > /dev/null", {
          stdio: "pipe",
        });
        console.log(chalk.green(`✅ Opening preview at ${url}`));

        // Open in browser
        execSync(`open ${url}`, { stdio: "pipe" });
      } catch {
        console.log(chalk.yellow("⚠️  Next.js dev server not running"));
        console.log(chalk.blue("💡 Start your Next.js app with: npm run dev"));
        console.log(chalk.blue(`   Then visit: ${url}`));
      }
    } catch (error) {
      console.log(chalk.yellow("⚠️  Could not open browser automatically"));
      console.log(
        chalk.blue("💡 Manually visit: http://localhost:3000/mycontext-preview")
      );
    }
  }
}
