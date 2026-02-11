import chalk from "chalk";
import { logger } from "./logger";

export interface ProgressStep {
  id: string;
  label: string;
  status: "pending" | "running" | "completed" | "failed";
  startTime?: number;
  endTime?: number;
  estimatedDuration?: number; // in milliseconds
  actualDuration?: number; // in milliseconds
}

export class ProgressTracker {
  private steps: ProgressStep[] = [];
  private currentStep: string | null = null;
  private startTime: number = Date.now();

  constructor(private title: string = "Progress") {}

  addStep(id: string, label: string, estimatedDuration?: number): this {
    this.steps.push({
      id,
      label,
      status: "pending",
      estimatedDuration,
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
      step.actualDuration = duration;
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

    return `${completed}/${total} steps completed${
      failed > 0 ? `, ${failed} failed` : ""
    } (${(totalTime / 1000).toFixed(1)}s)`;
  }

  /**
   * Get estimated time remaining for pending steps
   */
  getEstimatedTimeRemaining(): number {
    const pendingSteps = this.steps.filter((s) => s.status === "pending");
    const runningStep = this.steps.find((s) => s.status === "running");

    let remainingTime = 0;

    // Add estimated time for pending steps
    pendingSteps.forEach((step) => {
      if (step.estimatedDuration) {
        remainingTime += step.estimatedDuration;
      } else {
        // Default estimate of 10 seconds per step if no estimate provided
        remainingTime += 10000;
      }
    });

    // Add remaining time for running step
    if (runningStep && runningStep.estimatedDuration && runningStep.startTime) {
      const elapsed = Date.now() - runningStep.startTime;
      const remaining = Math.max(0, runningStep.estimatedDuration - elapsed);
      remainingTime += remaining;
    }

    return remainingTime;
  }

  /**
   * Get estimated completion time
   */
  getEstimatedCompletionTime(): Date {
    const remainingTime = this.getEstimatedTimeRemaining();
    return new Date(Date.now() + remainingTime);
  }

  /**
   * Format time duration for display
   */
  private formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    if (ms < 3600000) return `${(ms / 60000).toFixed(1)}m`;
    return `${(ms / 3600000).toFixed(1)}h`;
  }

  /**
   * Get detailed progress with time estimates and visual progress bar
   */
  getDetailedProgress(): string {
    const completed = this.steps.filter((s) => s.status === "completed").length;
    const total = this.steps.length;
    const totalTime = Date.now() - this.startTime;
    const eta = this.getEstimatedCompletionTime();
    const etaFormatted = eta.toLocaleTimeString();

    // Create visual progress bar
    const progressBar = this.createProgressBar(completed, total);

    let progress = `${completed}/${total} steps completed ${progressBar}`;

    if (completed < total) {
      const remaining = this.getEstimatedTimeRemaining();
      const remainingFormatted = this.formatDuration(remaining);
      progress += ` • ETA: ${etaFormatted} (${remainingFormatted} remaining)`;
    }

    progress += ` • Total: ${this.formatDuration(totalTime)}`;

    return progress;
  }

  /**
   * Create a visual progress bar
   */
  private createProgressBar(
    completed: number,
    total: number,
    width: number = 20
  ): string {
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    const filled = Math.round((completed / total) * width);
    const empty = width - filled;

    const bar = "█".repeat(filled) + "░".repeat(empty);
    return `[${bar}] ${percentage}%`;
  }

  /**
   * Show current step status with time remaining
   */
  showCurrentStep(): void {
    const currentStep = this.steps.find((s) => s.status === "running");
    if (!currentStep) return;

    const elapsed = Date.now() - (currentStep.startTime || 0);
    const elapsedFormatted = this.formatDuration(elapsed);

    let message = `${currentStep.label}... (${elapsedFormatted})`;

    if (currentStep.estimatedDuration) {
      const remaining = Math.max(0, currentStep.estimatedDuration - elapsed);
      const remainingFormatted = this.formatDuration(remaining);

      if (remaining > 0) {
        message += ` • ${remainingFormatted} remaining`;
      } else {
        message += ` • Overdue by ${this.formatDuration(-remaining)}`;
      }
    }

    logger.progress(message);
  }

  /**
   * Start periodic progress updates
   */
  startProgressUpdates(intervalMs: number = 2000): NodeJS.Timeout {
    return setInterval(() => {
      this.showCurrentStep();
    }, intervalMs);
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
          ? ` (${
              duration > 1000
                ? `${(duration / 1000).toFixed(1)}s`
                : `${duration}ms`
            })`
          : "";
      logger.success(`${label}${timing}`);
      return result;
    } catch (error) {
      logger.error(
        `${label} failed: ${
          error instanceof Error ? error.message : String(error)
        }`
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
