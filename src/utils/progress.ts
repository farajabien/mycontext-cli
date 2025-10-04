import chalk from "chalk";
import { logger } from "./logger";

export interface ProgressStep {
  id: string;
  label: string;
  status: "pending" | "running" | "completed" | "failed";
  startTime?: number;
  endTime?: number;
}

export class ProgressTracker {
  private steps: ProgressStep[] = [];
  private currentStep: string | null = null;
  private startTime: number = Date.now();

  constructor(private title: string = "Progress") {}

  addStep(id: string, label: string): this {
    this.steps.push({
      id,
      label,
      status: "pending",
    });
    return this;
  }

  startStep(id: string): this {
    const step = this.steps.find((s) => s.id === id);
    if (step) {
      step.status = "running";
      step.startTime = Date.now();
      this.currentStep = id;
      logger.progress(`${step.label}...`);
    }
    return this;
  }

  completeStep(id: string, message?: string): this {
    const step = this.steps.find((s) => s.id === id);
    if (step) {
      step.status = "completed";
      step.endTime = Date.now();
      const duration = step.endTime - (step.startTime || 0);
      const durationText =
        duration > 1000 ? `${(duration / 1000).toFixed(1)}s` : `${duration}ms`;
      logger.success(`${message || step.label} (${durationText})`);
    }
    return this;
  }

  failStep(id: string, error?: string): this {
    const step = this.steps.find((s) => s.id === id);
    if (step) {
      step.status = "failed";
      step.endTime = Date.now();
      logger.error(`${step.label}${error ? `: ${error}` : ""}`);
    }
    return this;
  }

  getSummary(): string {
    const totalTime = Date.now() - this.startTime;
    const completed = this.steps.filter((s) => s.status === "completed").length;
    const failed = this.steps.filter((s) => s.status === "failed").length;
    const total = this.steps.length;

    return `${completed}/${total} steps completed${failed > 0 ? `, ${failed} failed` : ""} (${(totalTime / 1000).toFixed(1)}s)`;
  }

  showSummary(): void {
    const summary = this.getSummary();
    if (this.steps.some((s) => s.status === "failed")) {
      logger.error(`Build failed: ${summary}`);
    } else {
      logger.success(`Build completed: ${summary}`);
    }
  }

  // Convenience methods for common operations
  static async runTask<T>(
    label: string,
    task: () => Promise<T>,
    options: { showTiming?: boolean } = {}
  ): Promise<T> {
    const startTime = Date.now();
    logger.progress(`${label}...`);

    try {
      const result = await task();
      const duration = Date.now() - startTime;
      const timing =
        options.showTiming && duration > 500
          ? ` (${duration > 1000 ? `${(duration / 1000).toFixed(1)}s` : `${duration}ms`})`
          : "";
      logger.success(`${label}${timing}`);
      return result;
    } catch (error) {
      logger.error(
        `${label} failed: ${error instanceof Error ? error.message : String(error)}`
      );
      throw error;
    }
  }

  static createBuildTracker(): ProgressTracker {
    return new ProgressTracker("MyContext CLI Build")
      .addStep("clean", "Clean build directory")
      .addStep("lint", "Lint source code")
      .addStep("compile", "Compile TypeScript")
      .addStep("copy", "Copy configuration files")
      .addStep("test", "Run tests");
  }
}

// Export convenience functions
export const progress = {
  task: ProgressTracker.runTask,
  build: ProgressTracker.createBuildTracker,
};
