import * as fs from "fs-extra";
import * as path from "path";
import chalk from "chalk";
import prompts from "prompts";
import { TUIState, TUIMode } from "../types/tui";
import { PlanningMode } from "./PlanningMode";
import { DashboardMode } from "./DashboardMode";
import { LivingContext } from "../types/living-context";

export class TUIClient {
  private state: TUIState;
  private planningMode: PlanningMode;
  private dashboardMode: DashboardMode;
  private projectPath: string;

  constructor(projectPath: string = process.cwd()) {
    this.projectPath = projectPath;
    this.state = {
      mode: "PLANNING",
      input: "",
      history: [],
      contextStatus: {
        megaContextComplete: false,
        missingFields: [],
      },
      isProcessing: false,
    };
    this.planningMode = new PlanningMode(this, this.projectPath);
    this.dashboardMode = new DashboardMode(this, this.projectPath);
  }

  /**
   * Initialize TUI state from filesystem
   */
  async initialize(): Promise<void> {
    const brainPath = path.join(this.projectPath, ".mycontext", "context.json");
    if (await fs.pathExists(brainPath)) {
      try {
        const brain = await fs.readJson(brainPath);
        this.state.context = brain;
        this.state.mode = "DASHBOARD";
      } catch (e) {
        // Fallback to planning if corrupted
      }
    }
  }

  /**
   * Start the TUI
   */
  async start(): Promise<void> {
    await this.initialize();

    if (this.state.mode === "DASHBOARD" && this.state.context) {
      return await this.dashboardMode.start(this.state.context);
    }

    await this.startPlanningMode();
  }

  /**
   * Start the TUI in Planning Mode (Context Collection)
   */
  async startPlanningMode(): Promise<any> {
    this.updateMode("PLANNING");
    this.displayHeader("PLANNING MODE: Context Collection");
    
    // Delegate to PlanningMode handler
    return await this.planningMode.start();
  }

  /**
   * Switch modes
   */
  updateMode(mode: TUIMode) {
    this.state.mode = mode;
    console.clear();
  }

  /**
   * Display a branded header
   */
  private displayHeader(title: string) {
    console.log(chalk.cyan("========================================"));
    console.log(chalk.bold.white(`   MYCONTEXT | ${title}`));
    console.log(chalk.cyan("========================================\n"));
  }
}
