import * as fs from "fs-extra";
import * as path from "path";
import chalk from "chalk";

/**
 * Design Pipeline State Manager
 *
 * Manages the state of the design pipeline execution, allowing for
 * graceful failure handling and resumption from any failed phase.
 */
export interface DesignPipelineState {
  currentPhase: number;
  completedPhases: number[];
  failedPhase?: number;
  failureReason?: string;
  timestamp: Date;
  partialResults: Record<string, any>;
  projectPath: string;
}

export class DesignPipelineStateManager {
  private statePath: string;

  constructor(projectPath: string = process.cwd()) {
    this.statePath = path.join(
      projectPath,
      ".mycontext",
      "design-pipeline-state.json"
    );
  }

  /**
   * Save the current pipeline state
   */
  async saveState(state: DesignPipelineState): Promise<void> {
    try {
      // Ensure .mycontext directory exists
      await fs.ensureDir(path.dirname(this.statePath));

      // Save state with timestamp
      const stateWithTimestamp = {
        ...state,
        timestamp: new Date().toISOString(),
      };

      await fs.writeJson(this.statePath, stateWithTimestamp, { spaces: 2 });

      console.log(
        chalk.gray(`   💾 Pipeline state saved (Phase ${state.currentPhase})`)
      );
    } catch (error) {
      console.warn(chalk.yellow("⚠️  Failed to save pipeline state:"), error);
    }
  }

  /**
   * Load existing pipeline state
   */
  async loadState(): Promise<DesignPipelineState | null> {
    try {
      if (!(await fs.pathExists(this.statePath))) {
        return null;
      }

      const stateData = await fs.readJson(this.statePath);

      // Convert timestamp back to Date object
      return {
        ...stateData,
        timestamp: new Date(stateData.timestamp),
      };
    } catch (error) {
      console.warn(chalk.yellow("⚠️  Failed to load pipeline state:"), error);
      return null;
    }
  }

  /**
   * Clear the state file (called on successful completion)
   */
  async clearState(): Promise<void> {
    try {
      if (await fs.pathExists(this.statePath)) {
        await fs.remove(this.statePath);
        console.log(chalk.gray("   🧹 Pipeline state cleared"));
      }
    } catch (error) {
      console.warn(chalk.yellow("⚠️  Failed to clear pipeline state:"), error);
    }
  }

  /**
   * Check if there's a resumable state
   */
  async canResume(): Promise<boolean> {
    const state = await this.loadState();
    return state !== null && state.failedPhase !== undefined;
  }

  /**
   * Get the next phase to execute
   */
  async getNextPhase(): Promise<number> {
    const state = await this.loadState();
    if (!state) return 1;

    return state.failedPhase ? state.failedPhase : state.currentPhase;
  }

  /**
   * Get completed phases
   */
  async getCompletedPhases(): Promise<number[]> {
    const state = await this.loadState();
    return state?.completedPhases || [];
  }

  /**
   * Get failure information
   */
  async getFailureInfo(): Promise<{ phase: number; reason: string } | null> {
    const state = await this.loadState();
    if (!state || !state.failedPhase) return null;

    return {
      phase: state.failedPhase,
      reason: state.failureReason || "Unknown error",
    };
  }

  /**
   * Get partial results from completed phases
   */
  async getPartialResults(): Promise<Record<string, any>> {
    const state = await this.loadState();
    return state?.partialResults || {};
  }

  /**
   * Check if state is stale (older than 24 hours)
   */
  async isStateStale(): Promise<boolean> {
    const state = await this.loadState();
    if (!state) return false;

    const now = new Date();
    const stateTime = new Date(state.timestamp);
    const hoursDiff = (now.getTime() - stateTime.getTime()) / (1000 * 60 * 60);

    return hoursDiff > 24;
  }

  /**
   * Get state summary for display
   */
  async getStateSummary(): Promise<string> {
    const state = await this.loadState();
    if (!state) return "No pipeline state found";

    const completed = state.completedPhases.length;
    const total = 8;
    const progress = Math.round((completed / total) * 100);

    let summary = `Pipeline Progress: ${completed}/${total} phases (${progress}%)`;

    if (state.failedPhase) {
      summary += `\nLast failed: Phase ${state.failedPhase} (${state.failureReason})`;
    }

    const age = Math.round(
      (Date.now() - new Date(state.timestamp).getTime()) / (1000 * 60)
    );
    summary += `\nState age: ${age} minutes ago`;

    return summary;
  }
}
