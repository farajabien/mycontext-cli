import chalk from "chalk";
import prompts from "prompts";
import { TUIState, TUIMode } from "../types/tui";
import { PlanningMode } from "./PlanningMode";

export class TUIClient {
  private state: TUIState;
  private planningMode: PlanningMode;
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
