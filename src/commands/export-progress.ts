import { Command } from "commander";
import fs from "fs";
import path from "path";
import chalk from "chalk";
import { PMAgentOutput, ProgressSyncResponse } from "../types/pm-integration";

interface ExportProgressOptions {
  output?: string;
  format?: "json" | "summary";
  webhook?: string;
  projectId?: string;
  verbose?: boolean;
  includeTasks?: boolean;
  includeComponents?: boolean;
  includeMetrics?: boolean;
}

export class ExportProgressCommand {
  public register(program: Command): void {
    program
      .command("export-progress")
      .description("Export project progress for mycontext PM synchronization")
      .option("-o, --output <file>", "Output file path", "progress-export.json")
      .option("-f, --format <type>", "Output format: json|summary", "json")
      .option(
        "-w, --webhook <url>",
        "Webhook URL to send progress to mycontext PM"
      )
      .option("-p, --project-id <id>", "Project ID for mycontext PM sync")
      .option("--verbose", "Detailed output", false)
      .option("--include-tasks", "Include detailed task information", true)
      .option("--include-components", "Include generated components list", true)
      .option("--include-metrics", "Include project metrics", true)
      .action(async (options: ExportProgressOptions) => {
        await this.exportProgress(options);
      });
  }

  public async exportProgress(options: ExportProgressOptions): Promise<void> {
    const {
      output,
      format,
      webhook,
      projectId,
      verbose,
      includeTasks = true,
      includeComponents = true,
      includeMetrics = true,
    } = options;

    console.log(chalk.blue.bold("📊 Exporting Project Progress\n"));

    try {
      // Load project context
      const projectContext = await this.loadProjectContext();

      // Load current tasks
      const tasks = await this.loadTasks();

      // Analyze generated components
      const components = await this.analyzeComponents();

      // Calculate metrics
      const metrics = this.calculateMetrics(tasks, components);

      // Create mycontext PM output
      const pmOutput: PMAgentOutput = {
        projectId:
          projectId || projectContext?.projectId || this.generateProjectId(),
        timestamp: new Date().toISOString(),
        status: "success",
        progress: {
          completedTasks: tasks.filter((t) => t.status === "completed").length,
          totalTasks: tasks.length,
          completionPercentage:
            tasks.length > 0
              ? (tasks.filter((t) => t.status === "completed").length /
                  tasks.length) *
                100
              : 0,
          currentPhase: this.determineCurrentPhase(tasks),
          nextMilestone: this.determineNextMilestone(tasks),
          blockers: this.identifyBlockers(tasks),
        },
        generated: {
          components: components.componentFiles,
          pages: components.pageFiles,
          apiEndpoints: components.apiFiles,
          tests: components.testFiles,
        },
        errors: [],
        suggestions: this.generateSuggestions(tasks, metrics),
        nextSteps: this.generateNextSteps(tasks, metrics),
      };

      // Output based on format
      if (format === "summary") {
        this.displaySummary(pmOutput, tasks, components, metrics);
      } else {
        // Save JSON output
        const outputPath = path.resolve(output || "progress-export.json");
        fs.writeFileSync(outputPath, JSON.stringify(pmOutput, null, 2));
        console.log(chalk.green(`✅ Progress exported to: ${outputPath}`));

        if (verbose) {
          this.displayDetailedProgress(pmOutput);
        }
      }

      // Send to webhook if specified
      if (webhook) {
        await this.sendToWebhook(webhook, pmOutput);
      }

      // Display key insights
      this.displayInsights(pmOutput);
    } catch (error) {
      console.error(
        chalk.red("❌ Export failed:"),
        error instanceof Error ? error.message : "Unknown error"
      );

      if (verbose) {
        console.error(chalk.red("Full error:"), error);
      }

      throw error;
    }
  }

  private async loadProjectContext(): Promise<any> {
    const contextPaths = [
      path.join(process.cwd(), ".mycontext", "project-context.json"),
      path.join(process.cwd(), ".mycontext", "context.json"),
    ];

    for (const contextPath of contextPaths) {
      if (fs.existsSync(contextPath)) {
        try {
          const context = JSON.parse(fs.readFileSync(contextPath, "utf8"));
          return context;
        } catch (error) {
          console.warn(chalk.yellow(`Warning: Could not parse ${contextPath}`));
        }
      }
    }

    console.log(chalk.yellow("⚠️  No project context found, using defaults"));
    return null;
  }

  private async loadTasks(): Promise<any[]> {
    const todosPath = path.join(process.cwd(), ".mycontext", "todos.json");

    if (fs.existsSync(todosPath)) {
      try {
        const todos = JSON.parse(fs.readFileSync(todosPath, "utf8"));
        return Array.isArray(todos) ? todos : [];
      } catch (error) {
        console.warn(chalk.yellow("Warning: Could not parse todos.json"));
      }
    }

    console.log(chalk.yellow("⚠️  No tasks found"));
    return [];
  }

  private async analyzeComponents(): Promise<{
    componentFiles: string[];
    pageFiles: string[];
    apiFiles: string[];
    testFiles: string[];
    totalFiles: number;
  }> {
    const result = {
      componentFiles: [] as string[],
      pageFiles: [] as string[],
      apiFiles: [] as string[],
      testFiles: [] as string[],
      totalFiles: 0,
    };

    try {
      // Analyze components directory
      const componentsDir = path.join(process.cwd(), "components");
      if (fs.existsSync(componentsDir)) {
        const componentFiles = await this.findFiles(componentsDir, [
          "**/*.{tsx,ts,jsx,js}",
        ]);
        result.componentFiles = componentFiles.map((f) =>
          path.relative(process.cwd(), f)
        );
      }

      // Analyze pages/app directory
      const pagesDir = path.join(process.cwd(), "app");
      const pagesDirAlt = path.join(process.cwd(), "pages");
      const pageDir = fs.existsSync(pagesDir)
        ? pagesDir
        : fs.existsSync(pagesDirAlt)
        ? pagesDirAlt
        : null;

      if (pageDir) {
        const pageFiles = await this.findFiles(pageDir, [
          "**/*.{tsx,ts,jsx,js}",
        ]);
        result.pageFiles = pageFiles.map((f) =>
          path.relative(process.cwd(), f)
        );
      }

      // Analyze API routes
      const apiDir = path.join(process.cwd(), "app", "api");
      if (fs.existsSync(apiDir)) {
        const apiFiles = await this.findFiles(apiDir, ["**/*.{ts,js}"]);
        result.apiFiles = apiFiles.map((f) => path.relative(process.cwd(), f));
      }

      // Analyze test files
      const testFiles = await this.findFiles(process.cwd(), [
        "**/*.{test,spec}.{tsx,ts,jsx,js}",
      ]);
      result.testFiles = testFiles.map((f) => path.relative(process.cwd(), f));

      result.totalFiles =
        result.componentFiles.length +
        result.pageFiles.length +
        result.apiFiles.length +
        result.testFiles.length;
    } catch (error) {
      console.warn(
        chalk.yellow("Warning: Could not analyze components:"),
        error
      );
    }

    return result;
  }

  private async findFiles(dir: string, patterns: string[]): Promise<string[]> {
    // Simple file finder - in production, this would use glob properly
    const results: string[] = [];

    const walk = (currentDir: string) => {
      const items = fs.readdirSync(currentDir);

      for (const item of items) {
        const fullPath = path.join(currentDir, item);
        const stat = fs.statSync(fullPath);

        if (
          stat.isDirectory() &&
          !item.startsWith(".") &&
          item !== "node_modules"
        ) {
          walk(fullPath);
        } else if (stat.isFile()) {
          // Simple pattern matching
          for (const pattern of patterns) {
            if (this.matchesPattern(fullPath, pattern)) {
              results.push(fullPath);
              break;
            }
          }
        }
      }
    };

    walk(dir);
    return results;
  }

  private matchesPattern(filePath: string, pattern: string): boolean {
    // Very basic pattern matching - in production, use proper glob library
    const fileName = path.basename(filePath);
    const ext = path.extname(fileName);

    if (pattern.includes("{")) {
      // Handle {tsx,ts,jsx,js} patterns
      const extPattern = pattern.match(/\{([^}]+)\}/)?.[1];
      if (extPattern) {
        const exts = extPattern.split(",");
        return exts.some((e) => fileName.endsWith(`.${e.trim()}`));
      }
    }

    if (pattern.includes(".test") || pattern.includes(".spec")) {
      return fileName.includes(".test") || fileName.includes(".spec");
    }

    return pattern.includes(ext.substring(1));
  }

  private calculateMetrics(tasks: any[], components: any) {
    const completedTasks = tasks.filter((t) => t.status === "completed");
    const inProgressTasks = tasks.filter((t) => t.status === "in_progress");
    const blockedTasks = tasks.filter((t) => t.status === "blocked");

    const estimatedHours = tasks.reduce(
      (sum, t) => sum + (t.estimatedHours || 0),
      0
    );
    const actualHours = completedTasks.reduce(
      (sum, t) => sum + (t.actualHours || 0),
      0
    );

    return {
      totalTasks: tasks.length,
      completedTasks: completedTasks.length,
      inProgressTasks: inProgressTasks.length,
      blockedTasks: blockedTasks.length,
      completionPercentage:
        tasks.length > 0 ? (completedTasks.length / tasks.length) * 100 : 0,
      estimatedHours,
      actualHours,
      velocity: actualHours > 0 ? completedTasks.length / actualHours : 0,
      componentsGenerated: components.totalFiles,
      testCoverage:
        components.testFiles.length > 0
          ? (components.testFiles.length /
              (components.componentFiles.length +
                components.pageFiles.length)) *
            100
          : 0,
    };
  }

  private determineCurrentPhase(tasks: any[]): string {
    // Simple phase detection based on task completion patterns
    const completedCount = tasks.filter((t) => t.status === "completed").length;
    const totalCount = tasks.length;

    if (completedCount === 0) return "Planning";
    if (completedCount < totalCount * 0.3) return "Setup";
    if (completedCount < totalCount * 0.7) return "Development";
    if (completedCount < totalCount) return "Testing";
    return "Completed";
  }

  private determineNextMilestone(tasks: any[]): string {
    const pendingTasks = tasks.filter((t) => t.status !== "completed");
    if (pendingTasks.length === 0) return "Project Complete";

    // Find next high-priority task
    const nextTask = pendingTasks
      .filter((t) => t.priority === "critical" || t.priority === "high")
      .sort((a, b) => {
        const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        const aPriority =
          priorityOrder[a.priority as keyof typeof priorityOrder] ?? 2;
        const bPriority =
          priorityOrder[b.priority as keyof typeof priorityOrder] ?? 2;
        return aPriority - bPriority;
      })[0];

    return nextTask ? nextTask.title : "Continue development";
  }

  private identifyBlockers(tasks: any[]): string[] {
    return tasks.filter((t) => t.status === "blocked").map((t) => t.title);
  }

  private generateSuggestions(tasks: any[], metrics: any): string[] {
    const suggestions: string[] = [];

    if (metrics.blockedTasks > 0) {
      suggestions.push("Resolve blocked tasks to maintain momentum");
    }

    if (metrics.completionPercentage < 50 && tasks.length > 10) {
      suggestions.push(
        "Consider breaking large tasks into smaller, manageable units"
      );
    }

    if (metrics.testCoverage < 50) {
      suggestions.push("Increase test coverage for better code quality");
    }

    if (metrics.velocity > 0 && metrics.velocity < 0.5) {
      suggestions.push(
        "Consider optimizing development workflow for better velocity"
      );
    }

    return suggestions;
  }

  private generateNextSteps(tasks: any[], metrics: any): string[] {
    const nextSteps: string[] = [];

    if (metrics.blockedTasks > 0) {
      nextSteps.push("Address blocked tasks and dependencies");
    }

    const pendingHighPriority = tasks.filter(
      (t) =>
        (t.status === "pending" || t.status === "todo") &&
        (t.priority === "critical" || t.priority === "high")
    );

    if (pendingHighPriority.length > 0) {
      nextSteps.push(
        `Focus on ${pendingHighPriority.length} high-priority tasks`
      );
    }

    if (metrics.testCoverage < 70) {
      nextSteps.push("Add unit tests for generated components");
    }

    if (metrics.completionPercentage < 100) {
      nextSteps.push("Continue development on remaining tasks");
    }

    return nextSteps;
  }

  private displaySummary(
    pmOutput: PMAgentOutput,
    tasks: any[],
    components: any,
    metrics: any
  ): void {
    console.log(chalk.blue.bold("📊 Project Progress Summary"));
    console.log(chalk.gray("─".repeat(50)));

    console.log(chalk.cyan("🎯 Progress:"));
    console.log(
      `   Completion: ${chalk.white(
        pmOutput.progress.completionPercentage.toFixed(1)
      )}%`
    );
    console.log(
      `   Tasks: ${chalk.white(pmOutput.progress.completedTasks)}/${
        pmOutput.progress.totalTasks
      } completed`
    );
    console.log(
      `   Current Phase: ${chalk.white(pmOutput.progress.currentPhase)}`
    );

    if (pmOutput.progress.nextMilestone) {
      console.log(
        `   Next Milestone: ${chalk.white(pmOutput.progress.nextMilestone)}`
      );
    }

    console.log(chalk.cyan("\n📁 Generated Files:"));
    console.log(
      `   Components: ${chalk.white(components.componentFiles.length)}`
    );
    console.log(`   Pages: ${chalk.white(components.pageFiles.length)}`);
    console.log(`   API Endpoints: ${chalk.white(components.apiFiles.length)}`);
    console.log(`   Tests: ${chalk.white(components.testFiles.length)}`);

    console.log(chalk.cyan("\n📈 Metrics:"));
    console.log(`   Estimated Hours: ${chalk.white(metrics.estimatedHours)}`);
    console.log(`   Actual Hours: ${chalk.white(metrics.actualHours)}`);
    if (metrics.velocity > 0) {
      console.log(
        `   Velocity: ${chalk.white(metrics.velocity.toFixed(2))} tasks/hour`
      );
    }

    if (pmOutput.progress.blockers && pmOutput.progress.blockers.length > 0) {
      console.log(chalk.cyan("\n🚫 Blockers:"));
      pmOutput.progress.blockers.forEach((blocker) => {
        console.log(`   • ${chalk.red(blocker)}`);
      });
    }

    if (pmOutput.suggestions && pmOutput.suggestions.length > 0) {
      console.log(chalk.cyan("\n💡 Suggestions:"));
      pmOutput.suggestions.forEach((suggestion) => {
        console.log(`   • ${chalk.yellow(suggestion)}`);
      });
    }
  }

  private displayDetailedProgress(pmOutput: PMAgentOutput): void {
    console.log(chalk.blue.bold("\n📋 Detailed Progress Export"));
    console.log(chalk.gray("─".repeat(50)));
    console.log(JSON.stringify(pmOutput, null, 2));
  }

  private async sendToWebhook(
    webhookUrl: string,
    pmOutput: PMAgentOutput
  ): Promise<void> {
    try {
      console.log(chalk.gray(`📤 Sending progress to webhook...`));

      // Use PM Integration Service for robust webhook communication
      const { PMIntegrationService } = await import(
        "../services/PMIntegrationService"
      );

      const integrationService = new PMIntegrationService({
        webhookUrl: webhookUrl,
        retryAttempts: 3,
        timeout: 30000,
      });

      await integrationService.exportProgress(pmOutput, webhookUrl);

      console.log(chalk.green(`✅ Progress sent to mycontext PM webhook`));
      console.log(chalk.gray(`   Webhook: ${webhookUrl}`));
      console.log(chalk.gray(`   Project: ${pmOutput.projectId}`));
    } catch (error) {
      console.warn(
        chalk.yellow(`Warning: Could not send to webhook: ${error}`)
      );
      throw error;
    }
  }

  private displayInsights(pmOutput: PMAgentOutput): void {
    console.log(chalk.blue.bold("\n🎯 mycontext PM Integration Ready"));

    console.log(chalk.cyan("🔄 Sync Commands:"));
    console.log(
      `   ${chalk.gray("mycontext export-progress --webhook <pm-url>")}`
    );
    console.log(
      `   ${chalk.gray(
        "mycontext sync-with-pm --project-id " + pmOutput.projectId
      )}`
    );

    if (pmOutput.nextSteps && pmOutput.nextSteps.length > 0) {
      console.log(chalk.cyan("\n📋 Recommended Next Steps:"));
      pmOutput.nextSteps.forEach((step, index) => {
        console.log(`   ${index + 1}. ${chalk.white(step)}`);
      });
    }
  }

  private generateProjectId(): string {
    // Generate a project ID based on current directory and timestamp
    const dirName = path.basename(process.cwd());
    const timestamp = Date.now();
    return `${dirName}-${timestamp}`;
  }

  public static getHelpText(): string {
    return `
${chalk.blue.bold("📊 MyContext Export Progress Command")}

${chalk.yellow("Description:")}
  Export project progress and status for mycontext PM synchronization and monitoring

${chalk.yellow("Usage:")}
  mycontext export-progress [options]

${chalk.yellow("Options:")}
  -o, --output <file>         Output file path (default: progress-export.json)
  -f, --format <type>         Output format: json|summary (default: json)
  -w, --webhook <url>         Webhook URL to send progress to mycontext PM
  -p, --project-id <id>       Project ID for mycontext PM sync
  --verbose                   Detailed output
  --include-tasks             Include detailed task information (default: true)
  --include-components        Include generated components list (default: true)
  --include-metrics           Include project metrics (default: true)

${chalk.yellow("Output Formats:")}

${chalk.cyan(
  "JSON Format:"
)} Complete structured data for mycontext PM consumption
\`\`\`json
{
  "projectId": "my-project-1234567890",
  "timestamp": "2024-01-15T10:30:00Z",
  "status": "success",
  "progress": {
    "completedTasks": 8,
    "totalTasks": 12,
    "completionPercentage": 66.7,
    "currentPhase": "Development",
    "nextMilestone": "API Integration",
    "blockers": ["Database setup pending"]
  },
  "generated": {
    "components": ["Button.tsx", "Input.tsx", "Card.tsx"],
    "pages": ["Home.tsx", "Dashboard.tsx"],
    "apiEndpoints": ["users.ts", "posts.ts"],
    "tests": ["Button.test.tsx", "Input.test.tsx"]
  },
  "suggestions": [
    "Consider adding error boundaries",
    "Increase test coverage"
  ],
  "nextSteps": [
    "Complete API integration",
    "Add user authentication"
  ]
}
\`\`\`

${chalk.cyan("Summary Format:")} Human-readable progress report
\`\`\`
📊 Project Progress Summary
──────────────────────────────────────────────────
🎯 Progress:
   Completion: 66.7%
   Tasks: 8/12 completed
   Current Phase: Development
   Next Milestone: API Integration

📁 Generated Files:
   Components: 15
   Pages: 3
   API Endpoints: 5
   Tests: 8

📈 Metrics:
   Estimated Hours: 120
   Actual Hours: 85
   Velocity: 0.094 tasks/hour
\`\`\`

${chalk.yellow("Examples:")}
  ${chalk.gray("# Export progress to file")}
  ${chalk.cyan("mycontext export-progress -o ./progress.json")}

  ${chalk.gray("# Export summary to console")}
  ${chalk.cyan("mycontext export-progress --format summary")}

  ${chalk.gray("# Send progress to mycontext PM webhook")}
  ${chalk.cyan(
    "mycontext export-progress --webhook https://mycontext-pm.example.com/webhook"
  )}

  ${chalk.gray("# Export with custom project ID")}
  ${chalk.cyan("mycontext export-progress --project-id my-project-001")}

${chalk.yellow("mycontext PM Integration:")}
  This command enables seamless integration between MyContext development workflow
  and mycontext PM monitoring. The exported progress data includes:

  • Task completion status and metrics
  • Generated components and files
  • Project velocity and estimates
  • Blockers and suggestions
  • Next steps and milestones

  mycontext PM can use this data to:
  • Monitor development progress in real-time
  • Provide contextual suggestions and tips
  • Identify blockers and propose solutions
  • Generate status reports and updates
  • Adjust timelines and resource allocation

${chalk.yellow("Webhook Integration:")}
  When using webhooks, the progress data is automatically sent to your mycontext PM
  system for real-time synchronization. This enables:

  • Live dashboard updates
  • Automated status reporting
  • Proactive issue detection
  • Intelligent resource suggestions

${chalk.yellow("Automation:")}
  Combine with cron jobs or CI/CD for automatic progress reporting:

  \`\`\`bash
  # Daily progress report
  0 18 * * 1-5 mycontext export-progress --webhook https://pm-ai.example.com/daily

  # CI/CD integration
  mycontext export-progress --webhook https://pm-ai.example.com/ci
  \`\`\`
`;
  }
}
