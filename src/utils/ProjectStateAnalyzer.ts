// Project State Analyzer
// Analyzes current project state and suggests optimal next steps

import fs from "fs-extra";
import path from "path";
import chalk from "chalk";

export interface ProjectState {
  hasMyContext: boolean;
  hasPackageJson: boolean;
  hasContextFiles: boolean;
  hasArchitecture: boolean;
  hasComponents: boolean;
  hasTests: boolean;
  hasBuildConfig: boolean;
  projectType?: "simple" | "moderate" | "complex";
  techStack: string[];
  completionPercentage: number;
  nextRecommendedSteps: string[];
}

export interface WorkflowSuggestion {
  command: string;
  description: string;
  priority: "high" | "medium" | "low";
  estimatedTime: string;
  reason: string;
}

export class ProjectStateAnalyzer {
  private projectRoot: string;

  constructor(projectRoot: string = process.cwd()) {
    this.projectRoot = projectRoot;
  }

  /**
   * Analyze the current project state
   */
  async analyzeProjectState(): Promise<ProjectState> {
    const myContextPath = path.join(this.projectRoot, ".mycontext");

    const state: ProjectState = {
      hasMyContext: await fs.pathExists(myContextPath),
      hasPackageJson: await fs.pathExists(
        path.join(this.projectRoot, "package.json")
      ),
      hasContextFiles: false,
      hasArchitecture: false,
      hasComponents: false,
      hasTests: false,
      hasBuildConfig: false,
      techStack: [],
      completionPercentage: 0,
      nextRecommendedSteps: [],
    };

    if (state.hasMyContext) {
      // Check for context files
      state.hasContextFiles = await this.checkContextFiles(myContextPath);

      // Check for architecture files
      state.hasArchitecture = await this.checkArchitectureFiles(myContextPath);

      // Check for components
      state.hasComponents = await this.checkComponentFiles();

      // Check for tests
      state.hasTests = await this.checkTestFiles();

      // Detect project type and tech stack
      const projectInfo = await this.detectProjectInfo(myContextPath);
      state.projectType = projectInfo.type;
      state.techStack = projectInfo.techStack;

      // Calculate completion percentage
      state.completionPercentage = this.calculateCompletionPercentage(state);

      // Generate next steps
      state.nextRecommendedSteps = await this.generateNextSteps(state);
    }

    return state;
  }

  /**
   * Get workflow suggestions based on current state
   */
  async getWorkflowSuggestions(): Promise<WorkflowSuggestion[]> {
    const state = await this.analyzeProjectState();
    const suggestions: WorkflowSuggestion[] = [];

    if (!state.hasMyContext) {
      suggestions.push({
        command: "mycontext setup-complete --interactive",
        description: "Complete guided project setup with AI assistance",
        priority: "high",
        estimatedTime: "~5 minutes",
        reason:
          "No MyContext configuration found - project needs initial setup",
      });
      return suggestions;
    }

    if (!state.hasContextFiles) {
      suggestions.push({
        command: "mycontext generate-context-files",
        description: "Generate PRD and feature specifications",
        priority: "high",
        estimatedTime: "~2 minutes",
        reason: "Missing project context and requirements documentation",
      });
    }

    if (!state.hasArchitecture && state.hasContextFiles) {
      suggestions.push({
        command: "mycontext generate architecture --auto-continue",
        description: "Generate complete project architecture",
        priority: "high",
        estimatedTime: "~3 minutes",
        reason: "Project has context but needs technical architecture",
      });
    }

    if (!state.hasComponents && state.hasArchitecture) {
      suggestions.push({
        command: "mycontext generate components",
        description: "Generate component implementations",
        priority: "medium",
        estimatedTime: "~4 minutes",
        reason: "Architecture defined but components need implementation",
      });
    }

    if (!state.hasTests && state.hasComponents) {
      suggestions.push({
        command: "mycontext generate tests",
        description: "Generate comprehensive test suite",
        priority: "medium",
        estimatedTime: "~2 minutes",
        reason: "Components implemented but lack test coverage",
      });
    }

    if (!state.hasBuildConfig) {
      suggestions.push({
        command: "mycontext build-app",
        description: "Build complete application",
        priority: "medium",
        estimatedTime: "~5 minutes",
        reason: "Project ready for final build and deployment preparation",
      });
    }

    // Always suggest help for new users
    if (state.completionPercentage < 50) {
      suggestions.push({
        command: "mycontext --help",
        description: "View all available commands",
        priority: "low",
        estimatedTime: "< 1 minute",
        reason: "Learn about additional available commands",
      });
    }

    return suggestions;
  }

  /**
   * Display project status in a user-friendly format
   */
  async displayProjectStatus(): Promise<void> {
    const state = await this.analyzeProjectState();

    console.log(chalk.blue.bold("\n📊 Project Status Analysis\n"));

    // Overall completion
    const completionBar = this.createProgressBar(
      state.completionPercentage,
      30
    );
    console.log(`Completion: ${completionBar} ${state.completionPercentage}%`);

    // Project details
    if (state.projectType) {
      console.log(`Type: ${chalk.white(state.projectType)} project`);
    }
    if (state.techStack.length > 0) {
      console.log(`Tech Stack: ${chalk.white(state.techStack.join(", "))}`);
    }

    console.log("");

    // Status checklist
    console.log(chalk.cyan("📋 Current Status:"));
    this.displayChecklistItem("MyContext setup", state.hasMyContext);
    this.displayChecklistItem("Package.json", state.hasPackageJson);
    this.displayChecklistItem(
      "Context files (PRD, features)",
      state.hasContextFiles
    );
    this.displayChecklistItem("Project architecture", state.hasArchitecture);
    this.displayChecklistItem("Component implementations", state.hasComponents);
    this.displayChecklistItem("Test coverage", state.hasTests);
    this.displayChecklistItem("Build configuration", state.hasBuildConfig);

    // Next steps
    if (state.nextRecommendedSteps.length > 0) {
      console.log(chalk.cyan("\n🎯 Recommended Next Steps:"));

      for (const step of state.nextRecommendedSteps.slice(0, 3)) {
        console.log(`   • ${chalk.yellow(step)}`);
      }

      if (state.nextRecommendedSteps.length > 3) {
        console.log(
          `   • ... and ${
            state.nextRecommendedSteps.length - 3
          } more suggestions`
        );
      }
    }

    console.log("");
  }

  private async checkContextFiles(myContextPath: string): Promise<boolean> {
    const contextFiles = ["01-prd.md", "01a-features.md", "02-types.ts"];

    for (const file of contextFiles) {
      if (await fs.pathExists(path.join(myContextPath, file))) {
        return true;
      }
    }
    return false;
  }

  private async checkArchitectureFiles(
    myContextPath: string
  ): Promise<boolean> {
    const archFiles = [
      "03-branding.md",
      "04-component-list.json",
      "05-project-structure.md",
    ];

    for (const file of archFiles) {
      if (await fs.pathExists(path.join(myContextPath, file))) {
        return true;
      }
    }
    return false;
  }

  private async checkComponentFiles(): Promise<boolean> {
    try {
      const componentsPath = path.join(this.projectRoot, "components");
      return (
        (await fs.pathExists(componentsPath)) &&
        (await fs.readdir(componentsPath)).length > 0
      );
    } catch {
      return false;
    }
  }

  private async checkTestFiles(): Promise<boolean> {
    try {
      const testPath = path.join(this.projectRoot, "__tests__");
      const hasTests =
        (await fs.pathExists(testPath)) &&
        (await fs.readdir(testPath)).length > 0;

      // Also check for test files in components
      const componentsPath = path.join(this.projectRoot, "components");
      if (await fs.pathExists(componentsPath)) {
        const componentFiles = await fs.readdir(componentsPath);
        const hasTestFiles = componentFiles.some(
          (file) => file.includes(".test.") || file.includes(".spec.")
        );
        return hasTests || hasTestFiles;
      }

      return hasTests;
    } catch {
      return false;
    }
  }

  private async detectProjectInfo(myContextPath: string): Promise<{
    type?: "simple" | "moderate" | "complex";
    techStack: string[];
  }> {
    const result = {
      type: undefined as "simple" | "moderate" | "complex" | undefined,
      techStack: [] as string[],
    };

    try {
      // Try to detect from PRD or features
      const prdPath = path.join(myContextPath, "01-prd.md");
      if (await fs.pathExists(prdPath)) {
        const content = await fs.readFile(prdPath, "utf-8");

        // Detect tech stack mentions
        const techStackKeywords = [
          "Next.js",
          "React",
          "TypeScript",
          "Tailwind",
          "Prisma",
          "Supabase",
          "PostgreSQL",
          "MongoDB",
          "Express",
          "Node.js",
          "Vue",
          "Angular",
        ];

        for (const tech of techStackKeywords) {
          if (content.toLowerCase().includes(tech.toLowerCase())) {
            result.techStack.push(tech);
          }
        }

        // Detect project complexity
        if (
          content.toLowerCase().includes("complex") ||
          content.toLowerCase().includes("advanced")
        ) {
          result.type = "complex";
        } else if (
          content.toLowerCase().includes("dashboard") ||
          content.toLowerCase().includes("application")
        ) {
          result.type = "moderate";
        } else if (
          content.toLowerCase().includes("landing") ||
          content.toLowerCase().includes("portfolio")
        ) {
          result.type = "simple";
        }
      }
    } catch (error) {
      // Ignore errors in detection
    }

    return result;
  }

  private calculateCompletionPercentage(state: ProjectState): number {
    const checks = [
      state.hasMyContext,
      state.hasPackageJson,
      state.hasContextFiles,
      state.hasArchitecture,
      state.hasComponents,
      state.hasTests,
      state.hasBuildConfig,
    ];

    const completed = checks.filter(Boolean).length;
    return Math.round((completed / checks.length) * 100);
  }

  private async generateNextSteps(state: ProjectState): Promise<string[]> {
    const steps: string[] = [];

    if (!state.hasContextFiles) {
      steps.push("Generate project context and requirements");
    }

    if (!state.hasArchitecture && state.hasContextFiles) {
      steps.push("Create technical architecture and component specifications");
    }

    if (!state.hasComponents && state.hasArchitecture) {
      steps.push("Implement component library");
    }

    if (!state.hasTests && state.hasComponents) {
      steps.push("Add comprehensive test coverage");
    }

    if (!state.hasBuildConfig) {
      steps.push("Configure build and deployment settings");
    }

    if (state.completionPercentage === 100) {
      steps.push("Project is complete! Ready for deployment");
    }

    return steps;
  }

  private createProgressBar(percentage: number, width: number = 20): string {
    const filled = Math.round((percentage / 100) * width);
    const empty = width - filled;

    const bar = "█".repeat(filled) + "░".repeat(empty);
    return `[${bar}] ${percentage}%`;
  }

  private displayChecklistItem(label: string, completed: boolean): void {
    const check = completed ? chalk.green("✅") : chalk.gray("⬜");
    console.log(`   ${check} ${label}`);
  }
}
