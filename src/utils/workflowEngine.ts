import chalk from "chalk";
import * as fs from "fs-extra";
import * as path from "path";
import { NextStepsSuggester, WorkflowContext } from "./nextStepsSuggester";

export interface WorkflowStep {
  id: string;
  name: string;
  description: string;
  command: string;
  dependencies: string[];
  autoContinue: boolean;
  estimatedTime: number; // in minutes
  estimatedDuration?: number; // in milliseconds (for progress tracking)
  requiredContext?: Partial<WorkflowContext>;
  optional?: boolean;
}

export interface WorkflowDefinition {
  id: string;
  name: string;
  description: string;
  steps: WorkflowStep[];
  estimatedTotalTime: number;
  category: "setup" | "development" | "deployment" | "maintenance";
}

export interface WorkflowProgress {
  workflowId: string;
  currentStepId?: string;
  completedSteps: string[];
  startedAt: Date;
  estimatedCompletion?: Date;
  context: WorkflowContext;
  completed?: boolean;
}

export class WorkflowEngine {
  private static workflows: Map<string, WorkflowDefinition> = new Map();
  private static activeWorkflows: Map<string, WorkflowProgress> = new Map();
  private static WORKFLOW_STATE_FILE = ".mycontext/workflow-state.json";

  /**
   * Register a workflow definition
   */
  static registerWorkflow(workflow: WorkflowDefinition): void {
    this.workflows.set(workflow.id, workflow);
  }

  /**
   * Get all available workflows
   */
  static getWorkflows(): WorkflowDefinition[] {
    return Array.from(this.workflows.values());
  }

  /**
   * Get a specific workflow by ID
   */
  static getWorkflow(workflowId: string): WorkflowDefinition | undefined {
    return this.workflows.get(workflowId);
  }

  /**
   * Start a workflow for a project
   */
  static async startWorkflow(
    workflowId: string,
    projectRoot: string = process.cwd(),
    autoContinue: boolean = false
  ): Promise<WorkflowProgress> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow '${workflowId}' not found`);
    }

    const context = await NextStepsSuggester.getWorkflowContext(projectRoot);
    const progress: WorkflowProgress = {
      workflowId,
      completedSteps: [],
      startedAt: new Date(),
      context,
    };

    // Check if there's already a saved workflow for this project
    const existingProgress = await this.loadWorkflowState(projectRoot);
    if (existingProgress && !existingProgress.completed) {
      console.log(
        chalk.yellow(
          "⚠️  Found existing workflow progress. Use 'workflow continue' to resume or 'workflow stop' to start fresh."
        )
      );
      throw new Error(
        "Existing workflow in progress. Use 'workflow continue' to resume."
      );
    }

    // Calculate estimated completion time
    const totalTime = workflow.estimatedTotalTime;
    progress.estimatedCompletion = new Date(Date.now() + totalTime * 60 * 1000);

    this.activeWorkflows.set(`${workflowId}:${projectRoot}`, progress);

    // Save to disk
    await this.saveWorkflowState(projectRoot, progress);

    console.log(chalk.blue(`🚀 Starting workflow: ${workflow.name}`));
    console.log(chalk.gray(workflow.description));
    console.log(chalk.gray(`Estimated time: ${totalTime} minutes`));
    console.log();

    // Start with the first step
    await this.executeNextStep(progress, projectRoot, autoContinue);

    return progress;
  }

  /**
   * Execute the next step in a workflow
   */
  private static async executeNextStep(
    progress: WorkflowProgress,
    projectRoot: string,
    autoContinue: boolean
  ): Promise<void> {
    const workflow = this.workflows.get(progress.workflowId);
    if (!workflow) return;

    const nextStep = this.getNextStep(workflow, progress);
    if (!nextStep) {
      // Workflow complete
      this.completeWorkflow(progress);
      return;
    }

    progress.currentStepId = nextStep.id;

    const stepNumber = progress.completedSteps.length + 1;
    console.log(
      chalk.cyan(
        `📋 Step ${stepNumber}/${workflow.steps.length}: ${nextStep.name}`
      )
    );
    console.log(chalk.gray(nextStep.description));
    console.log(
      chalk.gray(`⏱️  Estimated time: ${nextStep.estimatedTime} minutes`)
    );

    // Calculate and display ETA
    const remainingSteps =
      workflow.steps.length - progress.completedSteps.length;
    const totalRemainingTime = workflow.steps
      .filter((step) => !progress.completedSteps.includes(step.id))
      .reduce((sum, step) => sum + (step.estimatedTime || 5), 0);

    if (remainingSteps > 1) {
      const eta = new Date(Date.now() + totalRemainingTime * 60 * 1000);
      console.log(chalk.gray(`🎯 ETA: ${eta.toLocaleTimeString()}`));
    }
    console.log();

    if (autoContinue && nextStep.autoContinue) {
      console.log(chalk.yellow(`⚡ Auto-executing: ${nextStep.command}`));
      console.log();

      const stepStartTime = Date.now();
      try {
        await this.executeCommand(nextStep.command, projectRoot);
        const stepDuration = Date.now() - stepStartTime;
        const durationText =
          stepDuration > 60000
            ? `${(stepDuration / 60000).toFixed(1)}m`
            : `${(stepDuration / 1000).toFixed(1)}s`;

        progress.completedSteps.push(nextStep.id);
        progress.currentStepId = undefined;

        // Save progress to disk
        await this.saveWorkflowState(projectRoot, progress);

        console.log(chalk.green(`✅ Completed in ${durationText}`));
        console.log();

        // Continue to next step
        await this.executeNextStep(progress, projectRoot, autoContinue);
      } catch (error) {
        console.log(chalk.red(`❌ Step failed: ${error}`));
        console.log(chalk.yellow(`💡 Manual execution: ${nextStep.command}`));
        console.log();
      }
    } else {
      console.log(chalk.yellow(`💡 Execute: ${nextStep.command}`));
      console.log(chalk.gray(`Then run: mycontext workflow continue`));
      console.log();
    }
  }

  /**
   * Continue an active workflow
   */
  static async continueWorkflow(
    projectRoot: string = process.cwd()
  ): Promise<void> {
    let activeWorkflow = this.findActiveWorkflow(projectRoot);

    // If not in memory, try to load from disk
    if (!activeWorkflow) {
      const loadedWorkflow = await this.loadWorkflowState(projectRoot);
      if (loadedWorkflow) {
        activeWorkflow = loadedWorkflow;
        // Restore to memory
        const key = `${activeWorkflow.workflowId}:${projectRoot}`;
        this.activeWorkflows.set(key, activeWorkflow);
        console.log(chalk.green("📂 Resumed workflow from saved state"));
      }
    }

    if (!activeWorkflow) {
      console.log(chalk.red("❌ No active workflow found"));
      console.log(
        chalk.gray(
          "Start a workflow with: mycontext workflow start <workflow-id>"
        )
      );
      return;
    }

    await this.executeNextStep(activeWorkflow, projectRoot, false);
  }

  /**
   * Get the next step to execute
   */
  private static getNextStep(
    workflow: WorkflowDefinition,
    progress: WorkflowProgress
  ): WorkflowStep | null {
    // Find steps that haven't been completed and have all dependencies met
    for (const step of workflow.steps) {
      if (progress.completedSteps.includes(step.id)) continue;

      // Check if all dependencies are completed
      const dependenciesMet = step.dependencies.every((dep) =>
        progress.completedSteps.includes(dep)
      );

      if (dependenciesMet) {
        // Check if required context is available
        if (step.requiredContext) {
          const contextMatch = Object.entries(step.requiredContext).every(
            ([key, value]) => {
              return (progress.context as any)[key] === value;
            }
          );

          if (!contextMatch && !step.optional) continue;
        }

        return step;
      }
    }

    return null;
  }

  /**
   * Execute a command
   */
  private static async executeCommand(
    command: string,
    projectRoot: string
  ): Promise<void> {
    const { spawn } = await import("child_process");

    return new Promise((resolve, reject) => {
      const parts = command.split(" ");
      const cmd = parts[0];
      const args = parts.slice(1);

      if (!cmd) {
        reject(new Error("Invalid command"));
        return;
      }

      const child = spawn(cmd, args, {
        cwd: projectRoot,
        stdio: "inherit" as const,
        shell: true,
      });

      child.on("close", (code: number | null) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Command failed with exit code ${code}`));
        }
      });

      child.on("error", (error: Error) => {
        reject(error);
      });
    });
  }

  /**
   * Complete a workflow
   */
  private static completeWorkflow(progress: WorkflowProgress): void {
    const workflow = this.workflows.get(progress.workflowId);
    if (!workflow) return;

    const duration = Date.now() - progress.startedAt.getTime();
    const minutes = Math.round(duration / (1000 * 60));

    console.log(chalk.green(`🎉 Workflow completed: ${workflow.name}`));
    console.log(chalk.gray(`Total time: ${minutes} minutes`));
    console.log(
      chalk.gray(
        `Steps completed: ${progress.completedSteps.length}/${workflow.steps.length}`
      )
    );
    console.log();

    // Clean up
    this.activeWorkflows.delete(
      `${progress.workflowId}:${progress.context.projectType || "default"}`
    );

    // Clear saved state
    this.clearWorkflowState(process.cwd());
  }

  /**
   * Find active workflow for a project
   */
  private static findActiveWorkflow(
    projectRoot: string
  ): WorkflowProgress | undefined {
    // Try to find by exact project root first
    for (const [key, progress] of this.activeWorkflows) {
      if (key.endsWith(`:${projectRoot}`) || key.endsWith(":default")) {
        return progress;
      }
    }
    return undefined;
  }

  /**
   * Get workflow status
   */
  static getWorkflowStatus(
    projectRoot: string = process.cwd()
  ): WorkflowProgress | null {
    return this.findActiveWorkflow(projectRoot) || null;
  }

  /**
   * Stop an active workflow
   */
  static async stopWorkflow(
    projectRoot: string = process.cwd()
  ): Promise<void> {
    const activeWorkflow = this.findActiveWorkflow(projectRoot);
    if (activeWorkflow) {
      console.log(
        chalk.yellow(`⏹️  Stopped workflow: ${activeWorkflow.workflowId}`)
      );
      this.activeWorkflows.delete(
        `${activeWorkflow.workflowId}:${projectRoot}`
      );

      // Clear saved state
      await this.clearWorkflowState(projectRoot);
    } else {
      console.log(chalk.gray("No active workflow to stop"));
    }
  }

  /**
   * Save workflow state to disk
   */
  private static async saveWorkflowState(
    projectRoot: string,
    progress: WorkflowProgress
  ): Promise<void> {
    try {
      const stateFile = path.join(projectRoot, this.WORKFLOW_STATE_FILE);
      const stateDir = path.dirname(stateFile);

      // Ensure directory exists
      await fs.ensureDir(stateDir);

      // Save workflow state
      await fs.writeJson(
        stateFile,
        {
          ...progress,
          lastSaved: new Date().toISOString(),
        },
        { spaces: 2 }
      );
    } catch (error) {
      // Ignore save errors to avoid disrupting workflow
      console.warn(`Failed to save workflow state: ${error}`);
    }
  }

  /**
   * Load workflow state from disk
   */
  private static async loadWorkflowState(
    projectRoot: string
  ): Promise<WorkflowProgress | null> {
    try {
      const stateFile = path.join(projectRoot, this.WORKFLOW_STATE_FILE);

      if (!(await fs.pathExists(stateFile))) {
        return null;
      }

      const state = await fs.readJson(stateFile);

      // Validate loaded state
      if (!state.workflowId || !state.completedSteps || !state.context) {
        console.warn("Invalid workflow state file, ignoring");
        return null;
      }

      // Restore dates
      state.startedAt = new Date(state.startedAt);
      if (state.estimatedCompletion) {
        state.estimatedCompletion = new Date(state.estimatedCompletion);
      }

      return state;
    } catch (error) {
      console.warn(`Failed to load workflow state: ${error}`);
      return null;
    }
  }

  /**
   * Clear saved workflow state
   */
  private static async clearWorkflowState(projectRoot: string): Promise<void> {
    try {
      const stateFile = path.join(projectRoot, this.WORKFLOW_STATE_FILE);
      if (await fs.pathExists(stateFile)) {
        await fs.remove(stateFile);
      }
    } catch (error) {
      // Ignore cleanup errors
    }
  }
}

// Register built-in workflows
WorkflowEngine.registerWorkflow({
  id: "complete-setup",
  name: "Complete Project Setup",
  description:
    "Set up a new MyContext project from scratch to production-ready",
  category: "setup",
  estimatedTotalTime: 45,
  steps: [
    {
      id: "init",
      name: "Initialize Project",
      description: "Create project structure and basic configuration",
      command: "mycontext init . --framework instantdb",
      dependencies: [],
      autoContinue: true,
      estimatedTime: 5,
      estimatedDuration: 300000, // 5 minutes
    },
    {
      id: "setup-shadcn",
      name: "Set Up shadcn/ui",
      description: "Install and configure shadcn/ui components",
      command: "mycontext setup-shadcn --all",
      dependencies: ["init"],
      autoContinue: true,
      estimatedTime: 8,
      estimatedDuration: 480000, // 8 minutes
    },
    {
      id: "compile-prd",
      name: "Compile PRD",
      description: "Generate comprehensive PRD from context files",
      command: "mycontext compile-prd",
      dependencies: ["init"],
      autoContinue: true,
      estimatedTime: 3,
      estimatedDuration: 180000, // 3 minutes
    },
    {
      id: "generate-types",
      name: "Generate Types",
      description: "Create TypeScript types from PRD",
      command: "mycontext generate types",
      dependencies: ["compile-prd"],
      autoContinue: true,
      estimatedTime: 5,
      estimatedDuration: 300000, // 5 minutes
    },
    {
      id: "generate-brand",
      name: "Generate Brand Guidelines",
      description: "Create brand guidelines and design tokens",
      command: "mycontext generate brand",
      dependencies: ["compile-prd"],
      autoContinue: true,
      estimatedTime: 3,
      estimatedDuration: 180000, // 3 minutes
    },
    {
      id: "generate-component-list",
      name: "Generate Component List",
      description: "Create comprehensive component list",
      command: "mycontext generate component-list",
      dependencies: ["generate-types"],
      autoContinue: true,
      estimatedTime: 4,
      estimatedDuration: 240000, // 4 minutes
    },
    {
      id: "generate-components",
      name: "Generate Components",
      description: "Generate all React components with tests",
      command: "mycontext generate-components all --with-tests",
      dependencies: ["generate-component-list", "setup-shadcn"],
      autoContinue: true,
      estimatedTime: 15,
      estimatedDuration: 900000, // 15 minutes
    },
    {
      id: "validate",
      name: "Validate Project",
      description: "Run comprehensive project validation",
      command: "mycontext validate",
      dependencies: ["generate-components"],
      autoContinue: false,
      estimatedTime: 2,
      estimatedDuration: 120000, // 2 minutes
    },
  ],
});

WorkflowEngine.registerWorkflow({
  id: "component-development",
  name: "Component Development",
  description: "Develop and refine React components",
  category: "development",
  estimatedTotalTime: 25,
  steps: [
    {
      id: "generate-component",
      name: "Generate Component",
      description: "Generate a specific component",
      command: "mycontext generate-components Button",
      dependencies: [],
      autoContinue: true,
      estimatedTime: 3,
    },
    {
      id: "preview-component",
      name: "Preview Component",
      description: "Preview component at hosted Studio (https://studio.mycontext.app)",
      command: "echo 'Visit https://studio.mycontext.app to preview your components'",
      dependencies: ["generate-component"],
      autoContinue: false,
      estimatedTime: 1,
    },
    {
      id: "validate-component",
      name: "Validate Component",
      description: "Run validation on generated component",
      command: "mycontext validate --component Button",
      dependencies: ["generate-component"],
      autoContinue: false,
      estimatedTime: 1,
    },
  ],
});

WorkflowEngine.registerWorkflow({
  id: "ecommerce-setup",
  name: "E-commerce Application Setup",
  description:
    "Complete setup for e-commerce applications with shopping cart, products, and checkout",
  category: "setup",
  estimatedTotalTime: 50,
  steps: [
    {
      id: "init",
      name: "Initialize E-commerce Project",
      description: "Create project structure for e-commerce application",
      command:
        "mycontext init . --framework instantdb --description 'E-commerce application with shopping cart and checkout'",
      dependencies: [],
      autoContinue: true,
      estimatedTime: 5,
      estimatedDuration: 300000,
    },
    {
      id: "setup-shadcn",
      name: "Set Up shadcn/ui",
      description: "Install essential UI components for e-commerce",
      command: "mycontext setup-shadcn --all",
      dependencies: ["init"],
      autoContinue: true,
      estimatedTime: 8,
      estimatedDuration: 480000,
    },
    {
      id: "compile-prd",
      name: "Compile E-commerce PRD",
      description: "Generate comprehensive PRD for e-commerce features",
      command: "mycontext compile-prd",
      dependencies: ["init"],
      autoContinue: true,
      estimatedTime: 3,
      estimatedDuration: 180000,
    },
    {
      id: "generate-architecture",
      name: "Generate E-commerce Architecture",
      description:
        "Create types, brand, and component structure for e-commerce",
      command: "mycontext generate architecture --auto-continue",
      dependencies: ["compile-prd"],
      autoContinue: true,
      estimatedTime: 20,
      estimatedDuration: 1200000,
    },
    {
      id: "generate-ecommerce-components",
      name: "Generate E-commerce Components",
      description:
        "Generate shopping cart, product display, and checkout components",
      command:
        "mycontext generate-components all --category ecommerce --with-tests",
      dependencies: ["generate-architecture"],
      autoContinue: true,
      estimatedTime: 12,
      estimatedDuration: 720000,
    },
    {
      id: "validate-ecommerce",
      name: "Validate E-commerce Setup",
      description: "Run comprehensive validation for e-commerce application",
      command: "mycontext validate",
      dependencies: ["generate-ecommerce-components"],
      autoContinue: false,
      estimatedTime: 2,
      estimatedDuration: 120000,
    },
  ],
});

WorkflowEngine.registerWorkflow({
  id: "dashboard-setup",
  name: "Dashboard Application Setup",
  description:
    "Complete setup for analytics dashboards with charts, metrics, and data visualization",
  category: "setup",
  estimatedTotalTime: 48,
  steps: [
    {
      id: "init",
      name: "Initialize Dashboard Project",
      description: "Create project structure for analytics dashboard",
      command:
        "mycontext init . --framework instantdb --description 'Analytics dashboard with charts and metrics'",
      dependencies: [],
      autoContinue: true,
      estimatedTime: 5,
      estimatedDuration: 300000,
    },
    {
      id: "setup-shadcn",
      name: "Set Up shadcn/ui",
      description: "Install dashboard UI components",
      command: "mycontext setup-shadcn --all",
      dependencies: ["init"],
      autoContinue: true,
      estimatedTime: 8,
      estimatedDuration: 480000,
    },
    {
      id: "compile-prd",
      name: "Compile Dashboard PRD",
      description: "Generate comprehensive PRD for dashboard features",
      command: "mycontext compile-prd",
      dependencies: ["init"],
      autoContinue: true,
      estimatedTime: 3,
      estimatedDuration: 180000,
    },
    {
      id: "generate-architecture",
      name: "Generate Dashboard Architecture",
      description: "Create types, brand, and component structure for dashboard",
      command: "mycontext generate architecture --auto-continue",
      dependencies: ["compile-prd"],
      autoContinue: true,
      estimatedTime: 18,
      estimatedDuration: 1080000,
    },
    {
      id: "generate-dashboard-components",
      name: "Generate Dashboard Components",
      description: "Generate charts, metrics cards, and data tables",
      command:
        "mycontext generate-components all --category dashboard --with-tests",
      dependencies: ["generate-architecture"],
      autoContinue: true,
      estimatedTime: 12,
      estimatedDuration: 720000,
    },
    {
      id: "validate-dashboard",
      name: "Validate Dashboard Setup",
      description: "Run comprehensive validation for dashboard application",
      command: "mycontext validate",
      dependencies: ["generate-dashboard-components"],
      autoContinue: false,
      estimatedTime: 2,
      estimatedDuration: 120000,
    },
  ],
});

WorkflowEngine.registerWorkflow({
  id: "content-blog-setup",
  name: "Content/Blog Application Setup",
  description:
    "Complete setup for content management with articles, comments, and CMS features",
  category: "setup",
  estimatedTotalTime: 46,
  steps: [
    {
      id: "init",
      name: "Initialize Content Project",
      description: "Create project structure for content/blog application",
      command:
        "mycontext init . --framework instantdb --description 'Content management system with articles and comments'",
      dependencies: [],
      autoContinue: true,
      estimatedTime: 5,
      estimatedDuration: 300000,
    },
    {
      id: "setup-shadcn",
      name: "Set Up shadcn/ui",
      description: "Install content UI components",
      command: "mycontext setup-shadcn --all",
      dependencies: ["init"],
      autoContinue: true,
      estimatedTime: 8,
      estimatedDuration: 480000,
    },
    {
      id: "compile-prd",
      name: "Compile Content PRD",
      description: "Generate comprehensive PRD for content features",
      command: "mycontext compile-prd",
      dependencies: ["init"],
      autoContinue: true,
      estimatedTime: 3,
      estimatedDuration: 180000,
    },
    {
      id: "generate-architecture",
      name: "Generate Content Architecture",
      description: "Create types, brand, and component structure for content",
      command: "mycontext generate architecture --auto-continue",
      dependencies: ["compile-prd"],
      autoContinue: true,
      estimatedTime: 16,
      estimatedDuration: 960000,
    },
    {
      id: "generate-content-components",
      name: "Generate Content Components",
      description:
        "Generate articles, comments, and content management components",
      command:
        "mycontext generate-components all --category content --with-tests",
      dependencies: ["generate-architecture"],
      autoContinue: true,
      estimatedTime: 12,
      estimatedDuration: 720000,
    },
    {
      id: "validate-content",
      name: "Validate Content Setup",
      description: "Run comprehensive validation for content application",
      command: "mycontext validate",
      dependencies: ["generate-content-components"],
      autoContinue: false,
      estimatedTime: 2,
      estimatedDuration: 120000,
    },
  ],
});

WorkflowEngine.registerWorkflow({
  id: "production-deployment",
  name: "Production Deployment",
  description: "Prepare and deploy application to production environment",
  category: "deployment",
  estimatedTotalTime: 15,
  steps: [
    {
      id: "validate-production",
      name: "Production Validation",
      description: "Run comprehensive validation for production readiness",
      command: "mycontext validate",
      dependencies: [],
      autoContinue: true,
      estimatedTime: 3,
      estimatedDuration: 180000,
    },
    {
      id: "promote-production",
      name: "Promote to Production",
      description: "Move validated components to production directory",
      command: "mycontext promote --all",
      dependencies: ["validate-production"],
      autoContinue: true,
      estimatedTime: 2,
      estimatedDuration: 120000,
    },
    {
      id: "build-production",
      name: "Build for Production",
      description: "Create optimized production build",
      command: "npm run build",
      dependencies: ["promote-production"],
      autoContinue: true,
      estimatedTime: 8,
      estimatedDuration: 480000,
    },
    {
      id: "deploy-checklist",
      name: "Deployment Checklist",
      description: "Final deployment preparation checklist",
      command: "mycontext status --deployment-check",
      dependencies: ["build-production"],
      autoContinue: false,
      estimatedTime: 2,
      estimatedDuration: 120000,
    },
  ],
});

WorkflowEngine.registerWorkflow({
  id: "feature-enhancement",
  name: "Feature Enhancement",
  description: "Add new features to existing applications",
  category: "development",
  estimatedTotalTime: 30,
  steps: [
    {
      id: "analyze-current",
      name: "Analyze Current State",
      description: "Review existing components and architecture",
      command: "mycontext status",
      dependencies: [],
      autoContinue: true,
      estimatedTime: 2,
      estimatedDuration: 120000,
    },
    {
      id: "update-prd",
      name: "Update PRD",
      description: "Add new requirements to PRD",
      command: "mycontext compile-prd",
      dependencies: ["analyze-current"],
      autoContinue: true,
      estimatedTime: 3,
      estimatedDuration: 180000,
    },
    {
      id: "generate-enhanced-types",
      name: "Generate Enhanced Types",
      description: "Update types for new features",
      command: "mycontext generate types",
      dependencies: ["update-prd"],
      autoContinue: true,
      estimatedTime: 5,
      estimatedDuration: 300000,
    },
    {
      id: "generate-new-components",
      name: "Generate New Components",
      description: "Create components for new features",
      command: "mycontext generate-components all --with-tests",
      dependencies: ["generate-enhanced-types"],
      autoContinue: true,
      estimatedTime: 15,
      estimatedDuration: 900000,
    },
    {
      id: "validate-enhancement",
      name: "Validate Enhancement",
      description: "Ensure new features work correctly",
      command: "mycontext validate",
      dependencies: ["generate-new-components"],
      autoContinue: false,
      estimatedTime: 3,
      estimatedDuration: 180000,
    },
  ],
});
