/**
 * ProjectSetupAgent Implementation
 *
 * Handles project initialization and setup tasks in the build workflow.
 * Manages project structure creation, dependency installation, and basic configuration.
 */

import {
  SubAgent,
  ProjectSetupInput,
  ProjectSetupOutput,
} from "../interfaces/SubAgent";
import { InitCommand } from "../../commands/init";
import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";
import chalk from "chalk";

export class ProjectSetupAgent
  implements SubAgent<ProjectSetupInput, ProjectSetupOutput>
{
  name = "ProjectSetupAgent";
  description =
    "Handles project initialization, dependency management, and basic configuration setup";
  personality =
    "Methodical project architect that ensures proper foundation and configuration";
  llmProvider = "system"; // Uses system commands, not AI
  expertise = [
    "project-setup",
    "dependency-management",
    "configuration",
    "framework-setup",
  ];

  async run(input: ProjectSetupInput): Promise<ProjectSetupOutput> {
    const errors: string[] = [];
    const dependencies: string[] = [];
    const configFiles: string[] = [];

    try {
      let projectPath: string;

      if (input.existing) {
        // Handle existing project
        projectPath = path.resolve(input.projectName);

        if (!fs.existsSync(projectPath)) {
          throw new Error(
            `Existing project directory not found: ${projectPath}`
          );
        }

        console.log(
          chalk.blue(`📁 Working with existing project: ${projectPath}`)
        );

        // Check if it's already a MyContext project
        const mycontextDir = path.join(projectPath, ".mycontext");
        const isMyContextProject = fs.existsSync(mycontextDir);

        if (isMyContextProject && !input.migrate) {
          console.log(
            chalk.yellow("⚠️  Project is already initialized with MyContext")
          );
          return {
            success: true,
            projectPath,
            initialized: false,
            dependencies,
            configFiles,
          };
        }

        if (input.migrate) {
          await this.migrateExistingProject(projectPath);
        }
      } else {
        // Create new project
        projectPath = await this.initializeNewProject(input);
        configFiles.push("package.json", "tsconfig.json", "tailwind.config.js");
      }

      // Install dependencies if not skipped
      if (!input.skipDependencies) {
        console.log(chalk.blue("📦 Installing dependencies..."));
        try {
          execSync("pnpm install", { cwd: projectPath, stdio: "inherit" });
          dependencies.push(
            "next",
            "react",
            "react-dom",
            "typescript",
            "tailwindcss",
            "shadcn/ui"
          );
        } catch (error) {
          errors.push(`Failed to install dependencies: ${error}`);
        }
      }

      // Create MyContext directory structure
      await this.createMyContextStructure(projectPath);

      return {
        success: true,
        projectPath,
        initialized: true,
        dependencies,
        configFiles,
        errors: errors.length > 0 ? errors : undefined,
      };
    } catch (error) {
      return {
        success: false,
        projectPath: path.resolve(input.projectName),
        initialized: false,
        dependencies,
        configFiles,
        errors: [error instanceof Error ? error.message : "Unknown error"],
      };
    }
  }

  private async initializeNewProject(
    input: ProjectSetupInput
  ): Promise<string> {
    const initCommand = new InitCommand();
    const projectPath = path.resolve(input.projectName);

    console.log(
      chalk.blue(
        `🚀 Initializing new ${input.framework} project: ${input.projectName}`
      )
    );

    await initCommand.execute(input.projectName, {
      framework: input.framework,
      yes: true,
      verbose: false,
    });

    return projectPath;
  }

  private async migrateExistingProject(projectPath: string): Promise<void> {
    console.log(chalk.blue("🔄 Migrating existing project to MyContext..."));

    // Create .mycontext directory
    const mycontextDir = path.join(projectPath, ".mycontext");
    if (!fs.existsSync(mycontextDir)) {
      fs.mkdirSync(mycontextDir, { recursive: true });
    }

    // Create basic MyContext structure
    const basicFiles = [
      "01-prd.md",
      "02-types.ts",
      "03-branding.md",
      "04-component-list.json",
      "06-env.example",
    ];

    for (const file of basicFiles) {
      const filePath = path.join(mycontextDir, file);
      if (!fs.existsSync(filePath)) {
        // Create placeholder files
        const content = this.getPlaceholderContent(file);
        fs.writeFileSync(filePath, content);
      }
    }

    console.log(chalk.green("✅ Project migrated successfully"));
  }

  private async createMyContextStructure(projectPath: string): Promise<void> {
    const mycontextDir = path.join(projectPath, ".mycontext");

    if (!fs.existsSync(mycontextDir)) {
      fs.mkdirSync(mycontextDir, { recursive: true });
    }

    // Create context files structure
    const contextFiles = [
      "01a-features.md",
      "01b-user-flows.md",
      "01c-edge-cases.md",
      "01d-technical-specs.md",
      "01-prd.md",
      "02-types.ts",
      "03-branding.md",
      "04-component-list.json",
      "06-env.example",
    ];

    for (const file of contextFiles) {
      const filePath = path.join(mycontextDir, file);
      if (!fs.existsSync(filePath)) {
        const content = this.getPlaceholderContent(file);
        fs.writeFileSync(filePath, content);
      }
    }
  }

  private getPlaceholderContent(filename: string): string {
    const placeholders: Record<string, string> = {
      "01a-features.md":
        "# Product Features\n\nThis file will contain the detailed feature specifications.\n\n## Next Steps\n1. Run `mycontext generate-context-files` to populate this file\n2. Review and refine the generated content\n3. Run `mycontext compile-prd` to create the PRD\n",
      "01b-user-flows.md":
        "# User Flows\n\nThis file will contain user journey mappings.\n",
      "01c-edge-cases.md":
        "# Edge Cases\n\nThis file will contain error scenarios and edge conditions.\n",
      "01d-technical-specs.md":
        "# Technical Specifications\n\nThis file will contain technical requirements and architecture decisions.\n",
      "01-prd.md":
        "# Product Requirements Document\n\nThis file will be compiled from the context files.\n",
      "02-types.ts":
        "// TypeScript type definitions\nexport interface User {\n  id: string;\n  name: string;\n  email: string;\n}\n",
      "03-branding.md":
        "# Brand Guidelines\n\nThis file will contain brand specifications and design tokens.\n",
      "04-component-list.json":
        '{"groups": {}, "metadata": {"version": "1.0.0"}}',
      "06-env.example":
        "# MyContext Environment Variables\n# Copy this file to .env and add your API keys\n\nMYCONTEXT_QWEN_API_KEY=your_qwen_api_key_here\nMYCONTEXT_GITHUB_TOKEN=your_github_token_here\n",
    };

    return placeholders[filename] || "# Placeholder content\n";
  }

  validate?(input: ProjectSetupInput): boolean | Promise<boolean> {
    if (!input.projectName || !input.framework) {
      return false;
    }

    const validFrameworks = ["nextjs", "react", "vue", "angular"];
    if (!validFrameworks.includes(input.framework)) {
      return false;
    }

    return true;
  }

  async cleanup?(): Promise<void> {
    // No cleanup needed for this agent
  }

  async getStatus?(): Promise<any> {
    return {
      name: this.name,
      status: "idle",
      lastRun: new Date(),
      errorCount: 0,
      successCount: 0,
    };
  }
}
