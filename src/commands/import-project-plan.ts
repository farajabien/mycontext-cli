import { Command } from "commander";
import fs from "fs";
import path from "path";
import chalk from "chalk";
import { WorkflowAgent } from "../agents/implementations/WorkflowAgent";
import { PMAgentProjectInput } from "../types";

interface ImportProjectPlanOptions {
  planFile: string;
  output?: string;
  validate?: boolean;
  skipConfirmation?: boolean;
  verbose?: boolean;
}

export class ImportProjectPlanCommand {
  private workflowAgent = new WorkflowAgent();

  public register(program: Command): void {
    program
      .command("import-project-plan")
      .description("Import and execute a mycontext PM project plan")
      .argument("<plan-file>", "Path to mycontext PM project plan JSON file")
      .option(
        "-o, --output <dir>",
        "Output directory for generated project",
        "mycontext-project"
      )
      .option("--validate", "Validate plan without executing", false)
      .option("--skip-confirmation", "Skip confirmation prompts", false)
      .option("--verbose", "Detailed output", false)
      .action(async (planFile: string, options: ImportProjectPlanOptions) => {
        await this.importProjectPlan({ ...options, planFile });
      });
  }

  public async importProjectPlan(
    options: ImportProjectPlanOptions
  ): Promise<void> {
    const { planFile, output, validate, skipConfirmation, verbose } = options;

    console.log(chalk.blue.bold("📋 Importing mycontext PM Project Plan\n"));

    try {
      // 1. Load and validate mycontext PM plan
      const pmPlan = await this.loadAndValidatePlan(planFile);

      if (validate) {
        console.log(chalk.green("✅ Plan validation successful!"));
        this.displayPlanSummary(pmPlan);
        return;
      }

      // 2. Display plan summary and get confirmation
      this.displayPlanSummary(pmPlan);

      if (!skipConfirmation) {
        const confirmed = await this.confirmExecution(pmPlan);
        if (!confirmed) {
          console.log(chalk.yellow("Operation cancelled."));
          return;
        }
      }

      // 3. Create project structure
      console.log(chalk.blue("\n🏗️  Creating project structure..."));
      const projectPath = await this.createProjectStructure(
        pmPlan,
        output || "mycontext-project"
      );

      // 4. Save PM plan to project
      await this.savePlanToProject(pmPlan, projectPath);

      // 5. Execute MyContext workflow
      console.log(chalk.blue("\n🚀 Executing MyContext workflow..."));
      await this.executeMyContextWorkflow(pmPlan, projectPath);

      // 6. Display results
      this.displayResults(pmPlan, projectPath);
    } catch (error) {
      console.error(
        chalk.red("❌ Import failed:"),
        error instanceof Error ? error.message : "Unknown error"
      );

      if (verbose) {
        console.error(chalk.red("Full error:"), error);
      }

      throw error;
    }
  }

  private async loadAndValidatePlan(
    planFile: string
  ): Promise<PMAgentProjectInput> {
    console.log(chalk.gray(`Loading plan from: ${planFile}`));

    if (!fs.existsSync(planFile)) {
      throw new Error(`Plan file not found: ${planFile}`);
    }

    let planContent: string;
    try {
      planContent = fs.readFileSync(planFile, "utf8");
    } catch (error) {
      throw new Error(
        `Failed to read plan file: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }

    let pmPlan: PMAgentProjectInput;
    try {
      pmPlan = JSON.parse(planContent);
    } catch (error) {
      throw new Error(
        `Invalid JSON in plan file: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }

    // Validate required fields
    this.validatePlanStructure(pmPlan);

    console.log(chalk.green("✅ Plan loaded and validated"));
    return pmPlan;
  }

  private validatePlanStructure(
    plan: any
  ): asserts plan is PMAgentProjectInput {
    if (!plan.project) {
      throw new Error("Missing 'project' section in PM plan");
    }

    if (!plan.project.name || !plan.project.description) {
      throw new Error("Missing required project fields: name and description");
    }

    if (!plan.breakdown) {
      throw new Error("Missing 'breakdown' section in PM plan");
    }

    if (!plan.myContext) {
      throw new Error("Missing 'myContext' configuration section");
    }

    // Validate MyContext configuration
    const requiredFields = [
      "framework",
      "architecture",
      "generateServerActions",
      "generateRoutes",
    ];
    for (const field of requiredFields) {
      if (!(field in plan.myContext)) {
        throw new Error(`Missing required MyContext field: ${field}`);
      }
    }
  }

  private displayPlanSummary(plan: PMAgentProjectInput): void {
    console.log(chalk.blue.bold("\n📋 mycontext PM Project Plan Summary"));
    console.log(chalk.gray("─".repeat(50)));

    // Project info
    console.log(chalk.cyan("🏗️  Project:"));
    console.log(`   Name: ${chalk.white(plan.project.name)}`);
    console.log(
      `   Description: ${chalk.white(
        plan.project.description.substring(0, 100)
      )}...`
    );
    if (plan.project.techStack) {
      console.log(
        `   Tech Stack: ${chalk.white(plan.project.techStack.join(", "))}`
      );
    }

    // Timeline
    if (plan.project.timeline) {
      console.log(chalk.cyan("\n⏰ Timeline:"));
      console.log(
        `   Duration: ${chalk.white(plan.project.timeline.totalWeeks)} weeks`
      );
      console.log(`   Start: ${chalk.white(plan.project.timeline.startDate)}`);
      console.log(`   End: ${chalk.white(plan.project.timeline.endDate)}`);
    }

    // Budget
    if (plan.project.budget) {
      console.log(chalk.cyan("\n💰 Budget:"));
      console.log(
        `   Amount: ${chalk.white(plan.project.budget.amount)} ${
          plan.project.budget.currency
        }`
      );
    }

    // Task breakdown
    console.log(chalk.cyan("\n📊 Task Breakdown:"));
    console.log(`   Epics: ${chalk.white(plan.breakdown.epics?.length || 0)}`);
    console.log(
      `   User Stories: ${chalk.white(plan.breakdown.userStories?.length || 0)}`
    );
    console.log(`   Tasks: ${chalk.white(plan.breakdown.tasks?.length || 0)}`);
    console.log(
      `   Phases: ${chalk.white(plan.breakdown.phases?.length || 0)}`
    );

    // MyContext config
    console.log(chalk.cyan("\n⚙️  MyContext Configuration:"));
    console.log(`   Framework: ${chalk.white(plan.myContext.framework)}`);
    console.log(`   Architecture: ${chalk.white(plan.myContext.architecture)}`);
    console.log(
      `   Server Actions: ${chalk.white(
        plan.myContext.generateServerActions ? "Yes" : "No"
      )}`
    );
    console.log(
      `   Routes: ${chalk.white(plan.myContext.generateRoutes ? "Yes" : "No")}`
    );
    console.log(
      `   Tests: ${chalk.white(plan.myContext.withTests ? "Yes" : "No")}`
    );
    console.log(
      `   Complete Architecture: ${chalk.white(
        plan.myContext.completeArchitecture ? "Yes" : "No"
      )}`
    );

    // Components
    if (plan.components) {
      console.log(chalk.cyan("\n🧩 Components:"));
      console.log(
        `   UI Components: ${chalk.white(plan.components.ui?.length || 0)}`
      );
      console.log(
        `   Pages: ${chalk.white(plan.components.pages?.length || 0)}`
      );
      console.log(
        `   API Endpoints: ${chalk.white(plan.components.api?.length || 0)}`
      );
    }
  }

  private async confirmExecution(plan: PMAgentProjectInput): Promise<boolean> {
    const { default: prompts } = await import("prompts");

    const response = await prompts({
      type: "confirm",
      name: "confirm",
      message: `Execute mycontext PM project plan for "${plan.project.name}"?`,
      initial: true,
    });

    return response.confirm;
  }

  private async createProjectStructure(
    plan: PMAgentProjectInput,
    outputDir: string
  ): Promise<string> {
    const projectPath = path.resolve(outputDir);

    // Create output directory
    if (!fs.existsSync(projectPath)) {
      fs.mkdirSync(projectPath, { recursive: true });
    }

    // Initialize basic project structure
    const myContextDir = path.join(projectPath, ".mycontext");
    if (!fs.existsSync(myContextDir)) {
      fs.mkdirSync(myContextDir, { recursive: true });
    }

    console.log(chalk.green(`✅ Project structure created at: ${projectPath}`));
    return projectPath;
  }

  private async savePlanToProject(
    plan: PMAgentProjectInput,
    projectPath: string
  ): Promise<void> {
    const myContextDir = path.join(projectPath, ".mycontext");

    // Save PM plan
    const planPath = path.join(myContextDir, "pm-plan.json");
    fs.writeFileSync(planPath, JSON.stringify(plan, null, 2));

    // Save tasks for MyContext
    const tasks = this.convertPMTasksToMyContext(plan.breakdown.tasks || []);
    const todosPath = path.join(myContextDir, "todos.json");
    fs.writeFileSync(todosPath, JSON.stringify(tasks, null, 2));

    // Save project context
    const contextPath = path.join(myContextDir, "project-context.json");
    const projectContext = {
      name: plan.project.name,
      description: plan.project.description,
      techStack: plan.project.techStack,
      timeline: plan.project.timeline,
      budget: plan.project.budget,
      myContextConfig: plan.myContext,
      createdFromPM: true,
      createdAt: new Date().toISOString(),
    };
    fs.writeFileSync(contextPath, JSON.stringify(projectContext, null, 2));

    console.log(chalk.green("✅ PM plan saved to project"));
  }

  private convertPMTasksToMyContext(pmTasks: any[]): any[] {
    return pmTasks.map((task, index) => ({
      id: task.id || `task-${Date.now()}-${index}`,
      title: task.title,
      description: task.description,
      status: this.mapPMStatusToMyContext(task.status),
      priority: this.mapPMPriorityToMyContext(task.priority),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      estimatedHours: task.estimatedHours,
      dependencies: task.dependencies || [],
      relatedComponents: task.relatedComponents || [],
      tags: task.tags || [],
      projectId: "pm-generated",
    }));
  }

  private mapPMStatusToMyContext(pmStatus?: string): string {
    const statusMap: { [key: string]: string } = {
      todo: "pending",
      in_progress: "in_progress",
      review: "in_review",
      done: "completed",
      blocked: "blocked",
      cancelled: "cancelled",
    };
    return statusMap[pmStatus || "todo"] || "pending";
  }

  private mapPMPriorityToMyContext(pmPriority?: string): string {
    const priorityMap: { [key: string]: string } = {
      critical: "critical",
      high: "high",
      medium: "medium",
      low: "low",
    };
    return priorityMap[pmPriority || "medium"] || "medium";
  }

  private async executeMyContextWorkflow(
    plan: PMAgentProjectInput,
    projectPath: string
  ): Promise<void> {
    const workflowInput = {
      description: plan.project.description,
      projectName: path.basename(projectPath),
      framework: plan.myContext.framework as
        | "nextjs"
        | "react"
        | "vue"
        | "angular",
      withTests: plan.myContext.withTests || false,
      interactive: false,
      skipValidation: false,
      maxRetries: 3,
      completeArchitecture: plan.myContext.completeArchitecture || false,
      architectureType: plan.myContext.architecture as
        | "nextjs-app-router"
        | "nextjs-pages"
        | "react-spa",
      generateServerActions: plan.myContext.generateServerActions || false,
      generateRoutes: plan.myContext.generateRoutes || false,
      selfDocumenting: plan.myContext.completeArchitecture || false,
    };

    const result = await this.workflowAgent.run(workflowInput);

    if (!result.success) {
      throw new Error(`Workflow failed: ${result.failedSteps.join(", ")}`);
    }

    console.log(chalk.green("✅ MyContext workflow completed successfully"));
  }

  private displayResults(plan: PMAgentProjectInput, projectPath: string): void {
    console.log(
      chalk.green.bold("\n🎉 mycontext PM Project Plan Successfully Imported!")
    );
    console.log(
      chalk.yellow(`📁 Project Location: ${path.resolve(projectPath)}`)
    );

    console.log(chalk.blue.bold("\n🏗️  Generated Project Structure:"));

    const structure = [
      "├── .mycontext/",
      "│   ├── pm-plan.json          # Original mycontext PM plan",
      "│   ├── todos.json            # Task breakdown",
      "│   └── project-context.json  # Project metadata",
      "├── components/               # Generated components",
      "├── app/                     # Next.js app routes",
      "├── lib/                     # Utility functions",
      "└── package.json            # Dependencies",
    ];

    structure.forEach((line) => console.log(chalk.gray(line)));

    console.log(chalk.blue.bold("\n🚀 Next Steps:"));

    const nextSteps = [
      `cd ${path.relative(process.cwd(), projectPath)}`,
      "pnpm install",
      "pnpm dev",
      "# View project in browser",
      "# Review generated components",
      "# Customize as needed",
    ];

    nextSteps.forEach((step, index) => {
      console.log(chalk.cyan(`   ${index + 1}. ${step}`));
    });

    // PM Integration hint
    console.log(chalk.yellow.bold("\n🔄 For mycontext PM Integration:"));
    console.log(
      chalk.gray(
        `   • Project ID: ${plan.project.name
          .toLowerCase()
          .replace(/\s+/g, "-")}`
      )
    );
    console.log(
      chalk.gray("   • Use 'mycontext export-progress' to sync status")
    );
    console.log(
      chalk.gray("   • Use 'mycontext sync-with-pm' for real-time updates")
    );
  }

  public static getHelpText(): string {
    return `
${chalk.blue.bold("📋 MyContext Import Project Plan Command")}

${chalk.yellow("Description:")}
  Import and execute a mycontext PM project plan to generate a complete application

${chalk.yellow("Usage:")}
  mycontext import-project-plan <plan-file> [options]

${chalk.yellow("Arguments:")}
  plan-file              Path to mycontext PM project plan JSON file

${chalk.yellow("Options:")}
  -o, --output <dir>     Output directory (default: mycontext-project)
  --validate             Validate plan without executing
  --skip-confirmation    Skip confirmation prompts
  --verbose              Detailed output

${chalk.yellow("mycontext PM Plan Format:")}
  {
    "project": {
      "name": "My Project",
      "description": "Project description...",
      "techStack": ["Next.js", "TypeScript"],
      "timeline": {
        "startDate": "2024-01-01",
        "endDate": "2024-02-01",
        "totalWeeks": 4
      }
    },
    "breakdown": {
      "epics": [...],
      "userStories": [...],
      "tasks": [...],
      "phases": [...]
    },
    "myContext": {
      "framework": "nextjs",
      "architecture": "nextjs-app-router",
      "generateServerActions": true,
      "generateRoutes": true,
      "withTests": true,
      "completeArchitecture": true
    },
    "components": {
      "ui": [...],
      "pages": [...],
      "api": [...]
    }
  }

${chalk.yellow("Examples:")}
  ${chalk.gray("# Validate a PM plan")}
  ${chalk.cyan("mycontext import-project-plan ./pm-plan.json --validate")}

  ${chalk.gray("# Import and execute PM plan")}
  ${chalk.cyan("mycontext import-project-plan ./pm-plan.json -o my-project")}

  ${chalk.gray("# Import with custom output directory")}
  ${chalk.cyan(
    "mycontext import-project-plan ./pm-plan.json --output ./projects/my-app --skip-confirmation"
  )}

${chalk.yellow("Integration with mycontext PM:")}
  This command enables seamless integration between mycontext PM planning and MyContext code generation.
  mycontext PM can generate structured project plans that MyContext automatically converts into
  production-ready applications.

${chalk.yellow("Next Steps After Import:")}
  1. Navigate to the generated project directory
  2. Install dependencies: pnpm install
  3. Start development: pnpm dev
  4. Review and customize generated components
  5. Sync progress back to mycontext PM using export-progress
`;
  }
}
