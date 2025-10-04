import chalk from "chalk";
import { execSync, spawn } from "child_process";
import { logger } from "../utils/logger";

export class UpdateCommand {
  async execute(): Promise<void> {
    logger.info("Updating mycontext CLI...");

    // Try pnpm first (cleaner output)
    try {
      logger.progress("Checking for updates via pnpm...");
      await this.runCommand("pnpm", ["add", "-g", "mycontext-cli@latest"]);
      logger.success("Updated successfully via pnpm");
      this.printNextCommands();
      return;
    } catch (e) {
      logger.verbose("pnpm not available or failed, trying npm...");
    }

    // Fallback to npm
    try {
      logger.progress("Checking for updates via npm...");
      await this.runCommand("npm", ["i", "-g", "mycontext-cli@latest"]);
      logger.success("Updated successfully via npm");
      this.printNextCommands();
    } catch (error) {
      logger.error("Failed to update CLI automatically");
      logger.info("Try manually:");
      logger.info("  pnpm add -g mycontext-cli@latest");
      logger.info("  npm i -g mycontext-cli@latest");
      throw error;
    }
  }

  private async runCommand(command: string, args: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, {
        stdio: ["inherit", "pipe", "pipe"],
        timeout: command === "pnpm" ? 120000 : 180000,
      });

      let stdout = "";
      let stderr = "";

      if (child.stdout) {
        child.stdout.on("data", (data) => {
          stdout += data.toString();
        });
      }

      if (child.stderr) {
        child.stderr.on("data", (data) => {
          stderr += data.toString();
        });
      }

      child.on("close", (code) => {
        if (code === 0) {
          // Filter out common warnings and verbose output
          const cleanStdout = this.filterOutput(stdout);
          const cleanStderr = this.filterOutput(stderr);

          if (cleanStdout && !cleanStdout.includes("Already up to date")) {
            logger.verbose(cleanStdout);
          }
          if (cleanStderr) {
            logger.verbose(cleanStderr);
          }
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

  private filterOutput(output: string): string {
    const lines = output.split("\n").filter((line) => {
      // Filter out common verbose/noisy lines
      return (
        !line.includes("deprecated subdependencies") &&
        !line.includes("Failed to create bin") &&
        !line.includes("Progress: resolved") &&
        !line.includes("Done in") &&
        !line.includes("npm verbose") &&
        !line.includes("npm info") &&
        line.trim() !== ""
      );
    });
    return lines.join("\n").trim();
  }
  private printNextCommands(): void {
    try {
      logger.step("Next commands:");
      logger.info("  mycontext --version");
      logger.info("  mycontext init my-app --yes");
      logger.info(
        "  mycontext generate-context-files --description 'Your project'"
      );
      logger.info("  mycontext compile-prd");
    } catch {}
  }
}
