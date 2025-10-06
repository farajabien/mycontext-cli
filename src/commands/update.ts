import chalk from "chalk";
import { execSync, spawn } from "child_process";
import { logger } from "../utils/logger";

export class UpdateCommand {
  async execute(): Promise<void> {
    logger.info("Updating mycontext CLI...");

    try {
      logger.progress("Running update via pnpm dlx...");
      await this.runCommand("pnpm", ["dlx", "mycontext-cli@latest", "--up"]);
      logger.success("Update command executed successfully");
    } catch (error) {
      logger.error("Failed to run update command");
      logger.info("Try manually:");
      logger.info("  pnpm dlx mycontext-cli@latest --up");
      throw error;
    }
  }

  private async runCommand(command: string, args: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, {
        stdio: "inherit",
        timeout: 180000,
      });

      child.on("close", (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Command failed with code ${code}`));
        }
      });

      child.on("error", (error) => {
        reject(error);
      });
    });
  }
}
