import { Command } from "commander";
import chalk from "chalk";
import { Planner } from "../planner/index";

export class PlanCommand {
  public register(program: Command): void {
    program
      .command("plan [featureRequest]")
      .description("Start Planner interactive mode to produce a verified FSR manifest.")
      .option("--feature <name>", "Initial feature to plan")
      .option("--interactive", "Use interactive mode to resolve missing FSR fields", false)
      .action(async (featureRequest, options) => {
        try {
          const planner = new Planner();
          await planner.run({
            initialRequest: featureRequest || options.feature,
            interactive: options.interactive
          });
        } catch (error) {
          console.error(chalk.red("❌ Planner failed:"), error);
          process.exit(1);
        }
      });
  }
}
