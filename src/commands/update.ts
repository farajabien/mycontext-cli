import chalk from "chalk";
import { execSync, spawn } from "child_process";
import { logger } from "../utils/logger";

export class UpdateCommand {
  async execute(): Promise<void> {
    logger.info("Updating mycontext CLI...");

    // Check if we're in a project directory that might interfere
    const fs = require("fs-extra");
    const path = require("path");
    const packageJsonPath = path.join(process.cwd(), "package.json");

    if (await fs.pathExists(packageJsonPath)) {
      try {
        const packageJson = await fs.readJson(packageJsonPath);
        if (
          packageJson.packageManager &&
          packageJson.packageManager.includes("pnpm")
        ) {
          logger.warn(
            "⚠️  You're in a project that uses pnpm. This might interfere with global updates."
          );
          logger.info(
            "💡 Try running the update from your home directory or use: npm i -g mycontext-cli@latest"
          );
        } else if (
          packageJson.packageManager &&
          packageJson.packageManager.includes("npm")
        ) {
          logger.warn(
            "⚠️  You're in a project that uses npm. This might interfere with global updates."
          );
          logger.info(
            "💡 Try running the update from your home directory or use: npm i -g mycontext-cli@latest"
          );
        }
      } catch (e) {
        // Ignore errors reading package.json
      }
    }

    // Check current version first
    const currentVersion = this.getCurrentVersion();
    logger.info(`Current version: ${currentVersion}`);

    // Try pnpm first (cleaner output)
    try {
      logger.progress("Checking for updates via pnpm...");
      await this.runCommand("pnpm", ["add", "-g", "mycontext-cli@latest"]);

      // Wait a moment for the update to take effect
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Verify the update actually happened
      const newVersion = this.getCurrentVersion();
      if (newVersion !== currentVersion) {
        logger.success(
          `Updated successfully via pnpm: ${currentVersion} → ${newVersion}`
        );
      } else {
        logger.info("Already up to date via pnpm");
      }
      this.printNextCommands();
      return;
    } catch (e) {
      logger.verbose("pnpm not available or failed, trying npm...");
    }

    // Fallback to npm
    try {
      logger.progress("Checking for updates via npm...");
      await this.runCommand("npm", ["i", "-g", "mycontext-cli@latest"]);

      // Wait a moment for the update to take effect
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Verify the update actually happened
      const newVersion = this.getCurrentVersion();
      if (newVersion !== currentVersion) {
        logger.success(
          `Updated successfully via npm: ${currentVersion} → ${newVersion}`
        );
      } else {
        logger.info("Already up to date via npm");
      }
      this.printNextCommands();
    } catch (error) {
      // Try alternative approaches
      logger.warn("Standard update failed, trying alternative methods...");

      try {
        // Try with --force flag
        logger.progress("Trying npm with --force flag...");
        await this.runCommand("npm", [
          "i",
          "-g",
          "mycontext-cli@latest",
          "--force",
        ]);

        const newVersion = this.getCurrentVersion();
        if (newVersion !== currentVersion) {
          logger.success(
            `Updated successfully via npm --force: ${currentVersion} → ${newVersion}`
          );
          this.printNextCommands();
          return;
        }
      } catch (e) {
        logger.verbose("npm --force also failed");
      }

      // Try clearing cache and updating
      try {
        logger.progress("Clearing npm cache and trying again...");
        await this.runCommand("npm", ["cache", "clean", "--force"]);
        await this.runCommand("npm", ["i", "-g", "mycontext-cli@latest"]);

        const newVersion = this.getCurrentVersion();
        if (newVersion !== currentVersion) {
          logger.success(
            `Updated successfully after cache clear: ${currentVersion} → ${newVersion}`
          );
          this.printNextCommands();
          return;
        }
      } catch (e) {
        logger.verbose("Cache clear approach also failed");
      }

      logger.error("Failed to update CLI automatically");
      logger.info("Try manually:");
      logger.info("  pnpm add -g mycontext-cli@latest");
      logger.info("  npm i -g mycontext-cli@latest");
      logger.info("  npm i -g mycontext-cli@latest --force");
      logger.info("  npm cache clean --force && npm i -g mycontext-cli@latest");
      logger.info("");
      logger.info("💡 If you're in a project directory, try running from your home directory:");
      logger.info("  cd ~ && mycontext --up");
      throw error;
    }
  }

  private getCurrentVersion(): string {
    try {
      // Try to get the version from the actual installed package
      const { execSync } = require("child_process");
      const result = execSync("mycontext --version", { encoding: "utf8" });
      const versionMatch = result.match(/(\d+\.\d+\.\d+)/);
      if (versionMatch) {
        return versionMatch[1];
      }
    } catch (error) {
      // Fallback to package.json
      try {
        return require("../../package.json").version;
      } catch {
        return "unknown";
      }
    }
    return "unknown";
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
