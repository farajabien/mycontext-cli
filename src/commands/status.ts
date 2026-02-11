import chalk from "chalk";
import { FileSystemManager } from "../utils/fileSystem";
import { CommandOptions } from "../types";

interface StatusOptions extends CommandOptions {
  detailed?: boolean;
  checkHealth?: boolean;
}

export class StatusCommand {
  private fs = new FileSystemManager();

  async execute(target: string, options: StatusOptions): Promise<void> {
    try {
      console.log(chalk.blue.bold("📊 MyContext Project Status\n"));

      // Check if we're in a MyContext project
      const isProject = await this.fs.isMyContextProject(".");
      if (!isProject) {
        console.log(chalk.yellow("❌ Not a MyContext project"));
        console.log(
          chalk.gray(
            'Run "mycontext init <project-name>" to create a new project.\n'
          )
        );
        return;
      }

      // Get project configuration
      const config = await this.fs.getProjectConfig(".");
      if (!config) {
        console.log(chalk.red("❌ Project configuration not found"));
        return;
      }

      // Display project status
      await this.displayProjectStatus(config, options);

      // Check health if requested
      if (options.checkHealth) {
        await this.checkProjectHealth(config);
      }
    } catch (error) {
      console.error(chalk.red("❌ Status check failed:"), error);
      throw error;
    }
  }

  private async displayProjectStatus(
    config: any,
    options: StatusOptions
  ): Promise<void> {
    // Project overview
    console.log(chalk.cyan("📁 Project Overview:"));
    console.log(`  Name: ${chalk.bold(config.name)}`);
    console.log(`  Description: ${chalk.gray(config.description)}`);
    console.log(`  Version: ${config.version}`);
    console.log(`  Status: ${this.getStatusBadge(config.status)}`);
    console.log(
      `  Created: ${new Date(config.createdAt).toLocaleDateString()}`
    );
    console.log(
      `  Updated: ${new Date(config.updatedAt).toLocaleDateString()}\n`
    );

    // Progress tracking
    await this.displayProgress(config);

    // File status
    await this.displayFileStatus();

    // Next steps
    this.displayNextSteps(config.status);
  }

  private async displayProgress(config: any): Promise<void> {
    console.log(chalk.cyan("🎯 Progress:"));

    const progressSteps = [
      { key: "initialized", label: "Project Initialized", icon: "✅" },
      {
        key: "context-generated",
        label: "Context Files Generated",
        icon: "📝",
      },
      { key: "branded", label: "Branding Guidelines", icon: "🎨" },
      { key: "components-planned", label: "Components Planned", icon: "🧩" },
      { key: "generating", label: "Components Generating", icon: "⚡" },
      { key: "completed", label: "Project Complete", icon: "🎉" },
    ];

    const currentIndex = progressSteps.findIndex(
      (step) => step.key === config.status
    );

    progressSteps.forEach((step, index) => {
      const isCompleted = index <= currentIndex;
      const isCurrent = index === currentIndex;

      let icon = step.icon;
      let color = chalk.gray;

      if (isCompleted) {
        icon = "✅";
        color = chalk.green;
      } else if (isCurrent) {
        icon = "🔄";
        color = chalk.yellow;
      }

      console.log(`  ${icon} ${color(step.label)}`);
    });

    console.log("");
  }

  private async displayFileStatus(): Promise<void> {
    console.log(chalk.cyan("📄 Files Status:"));

    const expectedFiles = [
      { path: ".mycontext/01-prd.md", name: "PRD", required: true },
      {
        path: ".mycontext/02-types.ts",
        name: "TypeScript Types",
        required: false,
      },
      {
        path: ".mycontext/03-branding.md",
        name: "Branding Guidelines",
        required: false,
      },
      {
        path: ".mycontext/04-component-list.json",
        name: "Component List",
        required: false,
      },
    ];

    for (const file of expectedFiles) {
      try {
        await this.fs.readFile(file.path);
        console.log(`  ✅ ${chalk.green(file.name)}`);
      } catch {
        if (file.required) {
          console.log(`  ❌ ${chalk.red(file.name)} (Missing)`);
        } else {
          console.log(`  ⚪ ${chalk.gray(file.name)} (Not generated)`);
        }
      }
    }

    console.log("");
  }

  private displayNextSteps(currentStatus: string): void {
    console.log(chalk.cyan("🎯 Next Steps:"));

    const nextSteps = this.getNextSteps(currentStatus);
    nextSteps.forEach((step, index) => {
      console.log(`  ${index + 1}. ${step}`);
    });

    console.log("");
  }

  private getNextSteps(status: string): string[] {
    switch (status) {
      case "initialized":
        return [
          'Run "mycontext generate context" to create PRD and user stories',
          "Edit the generated PRD to match your requirements",
          'Run "mycontext validate prd" to check quality',
        ];
      case "context-generated":
        return [
          'Run "mycontext generate types" to create TypeScript definitions',
          'Run "mycontext generate brand" to create branding guidelines',
          "Review and refine your context files",
        ];
      case "branded":
        return [
          'Run "mycontext generate components" to plan your component library',
          "Review the component list and adjust priorities",
          'Run "mycontext generate app-structure" to plan your app architecture',
        ];
      case "components-planned":
        return [
          "Start implementing components based on the generated list",
          "Use the context files with your AI development tools",
          'Run "mycontext status" to track progress',
        ];
      case "generating":
        return [
          "Wait for component generation to complete",
          "Review generated components",
          "Start development with the generated context",
        ];
      case "completed":
        return [
          "Start development with your generated context",
          "Use the context files with local AI models or other development tools",
          "Update context files as requirements evolve",
        ];
      default:
        return [
          'Run "mycontext init <project-name>" to start a new project',
          "Check the documentation at https://mycontext.fbien.com/docs",
        ];
    }
  }

  private async checkProjectHealth(config: any): Promise<void> {
    console.log(chalk.cyan("🏥 Health Check:"));

    const healthChecks = [
      {
        name: "Project Configuration",
        check: () => this.checkConfigHealth(config),
      },
      { name: "Context Files", check: () => this.checkContextHealth() },
      { name: "File Permissions", check: () => this.checkPermissions() },
    ];

    let allHealthy = true;

    for (const healthCheck of healthChecks) {
      try {
        const isHealthy = await healthCheck.check();
        const icon = isHealthy ? "✅" : "❌";
        const color = isHealthy ? chalk.green : chalk.red;

        console.log(`  ${icon} ${color(healthCheck.name)}`);

        if (!isHealthy) {
          allHealthy = false;
        }
      } catch (error) {
        console.log(`  ❌ ${chalk.red(healthCheck.name)} (Error)`);
        allHealthy = false;
      }
    }

    console.log("");

    if (allHealthy) {
      console.log(chalk.green("🎉 Project is healthy!"));
    } else {
      console.log(
        chalk.yellow("⚠️ Some issues found. Check the details above.")
      );
    }

    console.log("");
  }

  private async checkConfigHealth(config: any): Promise<boolean> {
    return !!(config.name && config.description && config.id);
  }

  private async checkContextHealth(): Promise<boolean> {
    try {
      const files = await this.fs.listContextFiles(".");
      return files.length > 0;
    } catch {
      return false;
    }
  }

  private async checkPermissions(): Promise<boolean> {
    try {
      // Try to write a test file
      const testPath = ".mycontext/test-permissions.tmp";
      await this.fs.writeFile(testPath, "test");
      await this.fs.readFile(testPath);
      // Clean up
      await import("fs-extra").then((fs) => fs.remove(testPath));
      return true;
    } catch {
      return false;
    }
  }

  private getStatusBadge(status: string): string {
    const badges = {
      initialized: chalk.blue("● Initialized"),
      "context-generated": chalk.green("● Context Generated"),
      branded: chalk.cyan("● Branded"),
      "components-planned": chalk.yellow("● Components Planned"),
      generating: chalk.magenta("● Generating"),
      completed: chalk.green("● Completed"),
    };

    return badges[status as keyof typeof badges] || chalk.gray("● Unknown");
  }
}
