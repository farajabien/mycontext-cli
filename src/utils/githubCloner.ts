/**
 * GitHub Cloner Utility
 *
 * Handles cloning GitHub repositories for admin starter templates
 * and other project templates.
 */

import { exec } from "child_process";
import { promisify } from "util";
import * as fs from "fs/promises";
import * as path from "path";
import chalk from "chalk";

const execAsync = promisify(exec);

export interface CloneOptions {
  url: string;
  outputPath: string;
  branch?: string;
  depth?: number;
  removeGit?: boolean;
  verbose?: boolean;
}

export interface CloneResult {
  success: boolean;
  outputPath: string;
  error?: string;
  metadata?: {
    repository: string;
    branch: string;
    commitHash: string;
    clonedAt: string;
  };
}

export class GitHubCloner {
  /**
   * Clone a GitHub repository
   */
  static async clone(options: CloneOptions): Promise<CloneResult> {
    try {
      const {
        url,
        outputPath,
        branch = "main",
        depth = 1,
        removeGit = true,
        verbose = false,
      } = options;

      if (verbose) {
        console.log(chalk.gray(`  📥 Cloning ${url} to ${outputPath}`));
      }

      // Ensure output directory exists
      await fs.mkdir(path.dirname(outputPath), { recursive: true });

      // Clone repository
      const cloneCommand = `git clone --depth ${depth} --branch ${branch} ${url} ${outputPath}`;
      await execAsync(cloneCommand);

      // Get commit hash
      const commitHash = await this.getCommitHash(outputPath);

      // Remove .git directory if requested
      if (removeGit) {
        await fs.rm(path.join(outputPath, ".git"), {
          recursive: true,
          force: true,
        });
      }

      // Extract repository name from URL
      const repository = this.extractRepositoryName(url);

      const result: CloneResult = {
        success: true,
        outputPath,
        metadata: {
          repository,
          branch,
          commitHash,
          clonedAt: new Date().toISOString(),
        },
      };

      if (verbose) {
        console.log(chalk.green(`    ✓ Repository cloned successfully`));
        console.log(chalk.gray(`    Repository: ${repository}`));
        console.log(chalk.gray(`    Branch: ${branch}`));
        console.log(chalk.gray(`    Commit: ${commitHash.substring(0, 8)}`));
      }

      return result;
    } catch (error) {
      return {
        success: false,
        outputPath: options.outputPath,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Clone admin starter repository
   */
  static async cloneAdminStarter(
    outputPath: string,
    options: Partial<CloneOptions> = {}
  ): Promise<CloneResult> {
    const defaultOptions: CloneOptions = {
      url: "https://github.com/mycontext/admin-starter",
      outputPath,
      branch: "main",
      depth: 1,
      removeGit: true,
      verbose: true,
    };

    return this.clone({ ...defaultOptions, ...options });
  }

  /**
   * Clone a specific template repository
   */
  static async cloneTemplate(
    templateName: string,
    outputPath: string,
    options: Partial<CloneOptions> = {}
  ): Promise<CloneResult> {
    const templateUrl = `https://github.com/mycontext/${templateName}-template`;

    const defaultOptions: CloneOptions = {
      url: templateUrl,
      outputPath,
      branch: "main",
      depth: 1,
      removeGit: true,
      verbose: true,
    };

    return this.clone({ ...defaultOptions, ...options });
  }

  /**
   * Check if a repository exists and is accessible
   */
  static async checkRepository(
    url: string
  ): Promise<{ exists: boolean; error?: string }> {
    try {
      const command = `git ls-remote --heads ${url}`;
      await execAsync(command);
      return { exists: true };
    } catch (error) {
      return {
        exists: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Get available branches for a repository
   */
  static async getBranches(
    url: string
  ): Promise<{ branches: string[]; error?: string }> {
    try {
      const command = `git ls-remote --heads ${url}`;
      const { stdout } = await execAsync(command);

      const branches = stdout
        .split("\n")
        .filter((line) => line.trim())
        .map((line) => line.split("refs/heads/")[1])
        .filter((branch) => branch);

      return { branches };
    } catch (error) {
      return {
        branches: [],
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Get the latest commit hash for a repository
   */
  static async getLatestCommit(
    url: string,
    branch: string = "main"
  ): Promise<{ commitHash: string; error?: string }> {
    try {
      const command = `git ls-remote ${url} refs/heads/${branch}`;
      const { stdout } = await execAsync(command);

      const commitHash = stdout.split("\t")[0];
      return { commitHash };
    } catch (error) {
      return {
        commitHash: "",
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Get commit hash for a cloned repository
   */
  private static async getCommitHash(repoPath: string): Promise<string> {
    try {
      const command = "git rev-parse HEAD";
      const { stdout } = await execAsync(command, { cwd: repoPath });
      return stdout.trim();
    } catch {
      return "unknown";
    }
  }

  /**
   * Extract repository name from URL
   */
  private static extractRepositoryName(url: string): string {
    const match = url.match(/github\.com\/([^\/]+)\/([^\/]+)(?:\.git)?$/);
    if (match) {
      return `${match[1]}/${match[2]}`;
    }
    return url;
  }

  /**
   * Clone with retry logic
   */
  static async cloneWithRetry(
    options: CloneOptions,
    maxRetries: number = 3
  ): Promise<CloneResult> {
    let lastError: string | undefined;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      if (options.verbose && attempt > 1) {
        console.log(
          chalk.yellow(`  🔄 Retry attempt ${attempt}/${maxRetries}`)
        );
      }

      const result = await this.clone(options);

      if (result.success) {
        return result;
      }

      lastError = result.error;

      if (attempt < maxRetries) {
        // Wait before retry
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
      }
    }

    return {
      success: false,
      outputPath: options.outputPath,
      error: `Failed after ${maxRetries} attempts. Last error: ${lastError}`,
    };
  }

  /**
   * Clone and setup project
   */
  static async cloneAndSetup(
    options: CloneOptions & {
      installDependencies?: boolean;
      runSetup?: boolean;
      setupCommands?: string[];
    }
  ): Promise<CloneResult> {
    const {
      installDependencies = true,
      runSetup = true,
      setupCommands = [],
      ...cloneOptions
    } = options;

    // Clone repository
    const cloneResult = await this.clone(cloneOptions);
    if (!cloneResult.success) {
      return cloneResult;
    }

    try {
      // Install dependencies
      if (installDependencies) {
        await this.installDependencies(cloneResult.outputPath);
      }

      // Run setup commands
      if (runSetup && setupCommands.length > 0) {
        await this.runSetupCommands(cloneResult.outputPath, setupCommands);
      }

      return cloneResult;
    } catch (error) {
      return {
        success: false,
        outputPath: cloneResult.outputPath,
        error: `Setup failed: ${error}`,
      };
    }
  }

  /**
   * Install dependencies in cloned repository
   */
  private static async installDependencies(repoPath: string): Promise<void> {
    try {
      // Check if package.json exists
      const packageJsonPath = path.join(repoPath, "package.json");
      await fs.access(packageJsonPath);

      // Install dependencies
      await execAsync("npm install", { cwd: repoPath });
    } catch {
      // No package.json or install failed, skip
    }
  }

  /**
   * Run setup commands in cloned repository
   */
  private static async runSetupCommands(
    repoPath: string,
    commands: string[]
  ): Promise<void> {
    for (const command of commands) {
      try {
        await execAsync(command, { cwd: repoPath });
      } catch (error) {
        console.warn(chalk.yellow(`  ⚠️  Setup command failed: ${command}`));
      }
    }
  }

  /**
   * Clean up cloned repository
   */
  static async cleanup(outputPath: string): Promise<void> {
    try {
      await fs.rm(outputPath, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  }
}
