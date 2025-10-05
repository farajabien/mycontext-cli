import * as fs from "fs-extra";
import * as path from "path";
import chalk from "chalk";
import {
  ProjectStructureValidator,
  ProjectStructureReport,
  ProjectStructureIssue,
} from "./ProjectStructureValidator";

export interface RepairResult {
  success: boolean;
  repaired: number;
  failed: number;
  skipped: number;
  errors: string[];
  warnings: string[];
  actions: RepairAction[];
}

export interface RepairAction {
  type: "create" | "delete" | "move" | "update" | "fix";
  description: string;
  file?: string;
  success: boolean;
  error?: string;
}

export class ProjectStructureRepair {
  private validator: ProjectStructureValidator;
  private projectRoot: string;
  private backupEnabled: boolean = true;
  private dryRun: boolean = false;

  constructor(projectRoot: string = process.cwd()) {
    this.projectRoot = projectRoot;
    this.validator = new ProjectStructureValidator(projectRoot);
  }

  /**
   * Comprehensive project structure repair
   */
  async repairProject(
    options: {
      dryRun?: boolean;
      backup?: boolean;
      force?: boolean;
      verbose?: boolean;
    } = {}
  ): Promise<RepairResult> {
    this.dryRun = options.dryRun || false;
    this.backupEnabled = options.backup !== false;

    const result: RepairResult = {
      success: false,
      repaired: 0,
      failed: 0,
      skipped: 0,
      errors: [],
      warnings: [],
      actions: [],
    };

    console.log(
      chalk.blue("🔧 Starting comprehensive project structure repair...")
    );
    console.log(
      chalk.blue("==================================================\n")
    );

    if (this.dryRun) {
      console.log(chalk.yellow("🧪 DRY RUN MODE - No changes will be made\n"));
    }

    try {
      // Step 1: Create backup if enabled
      if (this.backupEnabled && !this.dryRun) {
        await this.createBackup(result);
      }

      // Step 2: Analyze current structure
      const report = await this.validator.validate();
      console.log(
        chalk.blue(`📊 Found ${report.issues.length} issues to address\n`)
      );

      // Step 3: Repair critical issues first
      await this.repairCriticalIssues(report, result);

      // Step 4: Repair high priority issues
      await this.repairHighPriorityIssues(report, result);

      // Step 5: Repair medium priority issues
      await this.repairMediumPriorityIssues(report, result);

      // Step 6: Repair low priority issues
      await this.repairLowPriorityIssues(report, result);

      // Step 7: Optimize project structure
      await this.optimizeProjectStructure(result);

      // Step 8: Final validation
      await this.performFinalValidation(result);

      result.success = result.failed === 0;

      console.log(chalk.blue("\n📋 Repair Summary:"));
      console.log(`   ✅ Repaired: ${chalk.green(result.repaired)}`);
      console.log(`   ❌ Failed: ${chalk.red(result.failed)}`);
      console.log(`   ⏭️  Skipped: ${chalk.yellow(result.skipped)}`);

      if (result.errors.length > 0) {
        console.log(chalk.red("\n❌ Errors:"));
        result.errors.forEach((error) => console.log(chalk.red(`   ${error}`)));
      }

      if (result.warnings.length > 0) {
        console.log(chalk.yellow("\n⚠️  Warnings:"));
        result.warnings.forEach((warning) =>
          console.log(chalk.yellow(`   ${warning}`))
        );
      }

      return result;
    } catch (error) {
      result.errors.push(`Repair failed: ${error}`);
      console.log(chalk.red(`❌ Repair failed: ${error}`));
      return result;
    }
  }

  /**
   * Create backup of current project
   */
  private async createBackup(result: RepairResult): Promise<void> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const backupPath = path.join(
        this.projectRoot,
        "..",
        `.backup-${path.basename(this.projectRoot)}-${timestamp}`
      );

      console.log(chalk.blue("💾 Creating backup..."));

      await fs.copy(this.projectRoot, backupPath, {
        filter: (src) => {
          // Skip node_modules and other large directories
          const relativePath = path.relative(this.projectRoot, src);
          return (
            !relativePath.startsWith("node_modules") &&
            !relativePath.startsWith(".git") &&
            !relativePath.startsWith(".next") &&
            !relativePath.startsWith("dist")
          );
        },
      });

      result.actions.push({
        type: "create",
        description: `Created backup at ${backupPath}`,
        success: true,
      });

      console.log(chalk.green(`✅ Backup created: ${backupPath}`));
    } catch (error) {
      result.warnings.push(`Failed to create backup: ${error}`);
      console.log(chalk.yellow(`⚠️  Could not create backup: ${error}`));
    }
  }

  /**
   * Repair critical issues
   */
  private async repairCriticalIssues(
    report: ProjectStructureReport,
    result: RepairResult
  ): Promise<void> {
    const criticalIssues = report.issues.filter(
      (issue) => issue.severity === "critical"
    );

    if (criticalIssues.length === 0) return;

    console.log(
      chalk.red(`🚨 Repairing ${criticalIssues.length} critical issues...`)
    );

    for (const issue of criticalIssues) {
      await this.repairIssue(issue, result);
    }
  }

  /**
   * Repair high priority issues
   */
  private async repairHighPriorityIssues(
    report: ProjectStructureReport,
    result: RepairResult
  ): Promise<void> {
    const highIssues = report.issues.filter(
      (issue) => issue.severity === "high"
    );

    if (highIssues.length === 0) return;

    console.log(
      chalk.yellow(`⚠️  Repairing ${highIssues.length} high priority issues...`)
    );

    for (const issue of highIssues) {
      await this.repairIssue(issue, result);
    }
  }

  /**
   * Repair medium priority issues
   */
  private async repairMediumPriorityIssues(
    report: ProjectStructureReport,
    result: RepairResult
  ): Promise<void> {
    const mediumIssues = report.issues.filter(
      (issue) => issue.severity === "medium"
    );

    if (mediumIssues.length === 0) return;

    console.log(
      chalk.blue(
        `ℹ️  Repairing ${mediumIssues.length} medium priority issues...`
      )
    );

    for (const issue of mediumIssues) {
      await this.repairIssue(issue, result);
    }
  }

  /**
   * Repair low priority issues
   */
  private async repairLowPriorityIssues(
    report: ProjectStructureReport,
    result: RepairResult
  ): Promise<void> {
    const lowIssues = report.issues.filter((issue) => issue.severity === "low");

    if (lowIssues.length === 0) return;

    console.log(
      chalk.gray(`ℹ️  Repairing ${lowIssues.length} low priority issues...`)
    );

    for (const issue of lowIssues) {
      await this.repairIssue(issue, result);
    }
  }

  /**
   * Repair a specific issue
   */
  private async repairIssue(
    issue: ProjectStructureIssue,
    result: RepairResult
  ): Promise<void> {
    try {
      let action: RepairAction | null = null;

      if (issue.message.includes("Multiple package.json")) {
        action = await this.repairMultiplePackageJson(issue);
      } else if (issue.message.includes("Nested node_modules")) {
        action = await this.repairNestedNodeModules(issue);
      } else if (issue.message.includes("Multiple lock files")) {
        action = await this.repairMultipleLockFiles(issue);
      } else if (issue.message.includes("Multiple build configurations")) {
        action = await this.repairMultipleBuildConfigs(issue);
      } else if (issue.message.includes("No package.json")) {
        action = await this.repairMissingPackageJson(issue);
      } else if (issue.message.includes("No lock file")) {
        action = await this.repairMissingLockFile(issue);
      } else if (issue.message.includes("No TypeScript configuration")) {
        action = await this.repairMissingTsConfig(issue);
      } else if (issue.message.includes("No build configuration")) {
        action = await this.repairMissingBuildConfig(issue);
      } else if (issue.message.includes("Package manager")) {
        action = await this.repairPackageManager(issue);
      } else {
        result.skipped++;
        return;
      }

      if (action) {
        result.actions.push(action);
        if (action.success) {
          result.repaired++;
          console.log(chalk.green(`   ✅ ${action.description}`));
        } else {
          result.failed++;
          result.errors.push(action.error || "Unknown error");
          console.log(
            chalk.red(`   ❌ ${action.description}: ${action.error}`)
          );
        }
      }
    } catch (error) {
      result.failed++;
      result.errors.push(`Failed to repair issue: ${error}`);
      console.log(chalk.red(`   ❌ Failed to repair: ${issue.message}`));
    }
  }

  /**
   * Repair multiple package.json files
   */
  private async repairMultiplePackageJson(
    issue: ProjectStructureIssue
  ): Promise<RepairAction> {
    const action: RepairAction = {
      type: "delete",
      description: "Remove nested package.json files",
      success: false,
    };

    try {
      if (this.dryRun) {
        action.success = true;
        action.description += " (dry run)";
        return action;
      }

      const packageJsonFiles = await this.findFiles("package.json");
      const rootPackageJson = path.join(this.projectRoot, "package.json");

      let removedCount = 0;
      for (const file of packageJsonFiles) {
        if (file !== rootPackageJson) {
          await fs.remove(file);
          removedCount++;
        }
      }

      action.success = true;
      action.description = `Removed ${removedCount} nested package.json files`;
      return action;
    } catch (error) {
      action.error = String(error);
      return action;
    }
  }

  /**
   * Repair nested node_modules directories
   */
  private async repairNestedNodeModules(
    issue: ProjectStructureIssue
  ): Promise<RepairAction> {
    const action: RepairAction = {
      type: "delete",
      description: "Remove nested node_modules directories",
      success: false,
    };

    try {
      if (this.dryRun) {
        action.success = true;
        action.description += " (dry run)";
        return action;
      }

      const nodeModulesDirs = await this.findDirectories("node_modules");
      const rootNodeModules = path.join(this.projectRoot, "node_modules");

      let removedCount = 0;
      for (const dir of nodeModulesDirs) {
        if (dir !== rootNodeModules) {
          await fs.remove(dir);
          removedCount++;
        }
      }

      action.success = true;
      action.description = `Removed ${removedCount} nested node_modules directories`;
      return action;
    } catch (error) {
      action.error = String(error);
      return action;
    }
  }

  /**
   * Repair multiple lock files
   */
  private async repairMultipleLockFiles(
    issue: ProjectStructureIssue
  ): Promise<RepairAction> {
    const action: RepairAction = {
      type: "delete",
      description: "Remove conflicting lock files",
      success: false,
    };

    try {
      if (this.dryRun) {
        action.success = true;
        action.description += " (dry run)";
        return action;
      }

      const lockFiles = await this.findFiles(
        "*-lock.yaml",
        "package-lock.json",
        "yarn.lock",
        "bun.lockb"
      );
      const preferredLockFile = path.join(this.projectRoot, "pnpm-lock.yaml");

      let removedCount = 0;
      for (const file of lockFiles) {
        if (file !== preferredLockFile) {
          await fs.remove(file);
          removedCount++;
        }
      }

      action.success = true;
      action.description = `Removed ${removedCount} conflicting lock files`;
      return action;
    } catch (error) {
      action.error = String(error);
      return action;
    }
  }

  /**
   * Repair multiple build configurations
   */
  private async repairMultipleBuildConfigs(
    issue: ProjectStructureIssue
  ): Promise<RepairAction> {
    const action: RepairAction = {
      type: "delete",
      description: "Remove conflicting build configurations",
      success: false,
    };

    try {
      if (this.dryRun) {
        action.success = true;
        action.description += " (dry run)";
        return action;
      }

      const buildConfigs = await this.findFiles(
        "next.config.*",
        "webpack.config.*",
        "vite.config.*",
        "rollup.config.*",
        "esbuild.config.*"
      );
      const preferredConfig = path.join(this.projectRoot, "next.config.ts");

      let removedCount = 0;
      for (const file of buildConfigs) {
        if (file !== preferredConfig) {
          await fs.remove(file);
          removedCount++;
        }
      }

      action.success = true;
      action.description = `Removed ${removedCount} conflicting build configurations`;
      return action;
    } catch (error) {
      action.error = String(error);
      return action;
    }
  }

  /**
   * Repair missing package.json
   */
  private async repairMissingPackageJson(
    issue: ProjectStructureIssue
  ): Promise<RepairAction> {
    const action: RepairAction = {
      type: "create",
      description: "Create default package.json",
      success: false,
    };

    try {
      if (this.dryRun) {
        action.success = true;
        action.description += " (dry run)";
        return action;
      }

      const packageJsonPath = path.join(this.projectRoot, "package.json");
      const packageJson = this.generateDefaultPackageJson();

      await fs.writeJson(packageJsonPath, packageJson, { spaces: 2 });

      action.success = true;
      action.description = "Created default package.json";
      return action;
    } catch (error) {
      action.error = String(error);
      return action;
    }
  }

  /**
   * Repair missing lock file
   */
  private async repairMissingLockFile(
    issue: ProjectStructureIssue
  ): Promise<RepairAction> {
    const action: RepairAction = {
      type: "create",
      description: "Generate pnpm-lock.yaml",
      success: false,
    };

    try {
      if (this.dryRun) {
        action.success = true;
        action.description += " (dry run)";
        return action;
      }

      const { execSync } = require("child_process");
      execSync("pnpm install", { cwd: this.projectRoot, stdio: "pipe" });

      action.success = true;
      action.description = "Generated pnpm-lock.yaml";
      return action;
    } catch (error) {
      action.error = String(error);
      return action;
    }
  }

  /**
   * Repair missing TypeScript configuration
   */
  private async repairMissingTsConfig(
    issue: ProjectStructureIssue
  ): Promise<RepairAction> {
    const action: RepairAction = {
      type: "create",
      description: "Create default tsconfig.json",
      success: false,
    };

    try {
      if (this.dryRun) {
        action.success = true;
        action.description += " (dry run)";
        return action;
      }

      const tsConfigPath = path.join(this.projectRoot, "tsconfig.json");
      const tsConfig = this.generateDefaultTsConfig();

      await fs.writeJson(tsConfigPath, tsConfig, { spaces: 2 });

      action.success = true;
      action.description = "Created default tsconfig.json";
      return action;
    } catch (error) {
      action.error = String(error);
      return action;
    }
  }

  /**
   * Repair missing build configuration
   */
  private async repairMissingBuildConfig(
    issue: ProjectStructureIssue
  ): Promise<RepairAction> {
    const action: RepairAction = {
      type: "create",
      description: "Create default next.config.ts",
      success: false,
    };

    try {
      if (this.dryRun) {
        action.success = true;
        action.description += " (dry run)";
        return action;
      }

      const nextConfigPath = path.join(this.projectRoot, "next.config.ts");
      const nextConfig = this.generateDefaultNextConfig();

      await fs.writeFile(nextConfigPath, nextConfig);

      action.success = true;
      action.description = "Created default next.config.ts";
      return action;
    } catch (error) {
      action.error = String(error);
      return action;
    }
  }

  /**
   * Repair package manager configuration
   */
  private async repairPackageManager(
    issue: ProjectStructureIssue
  ): Promise<RepairAction> {
    const action: RepairAction = {
      type: "update",
      description: "Update package manager configuration",
      success: false,
    };

    try {
      if (this.dryRun) {
        action.success = true;
        action.description += " (dry run)";
        return action;
      }

      const packageJsonPath = path.join(this.projectRoot, "package.json");
      if (await fs.pathExists(packageJsonPath)) {
        const packageJson = await fs.readJson(packageJsonPath);
        packageJson.packageManager = "pnpm@10.11.0";
        await fs.writeJson(packageJsonPath, packageJson, { spaces: 2 });
      }

      action.success = true;
      action.description = "Updated package manager to pnpm";
      return action;
    } catch (error) {
      action.error = String(error);
      return action;
    }
  }

  /**
   * Optimize project structure
   */
  private async optimizeProjectStructure(result: RepairResult): Promise<void> {
    console.log(chalk.blue("🔧 Optimizing project structure..."));

    try {
      // Detect project type (InstantDB vs Next.js)
      const isInstantDBProject = await this.isInstantDBProject();

      // Ensure essential directories exist based on project type
      const essentialDirs = isInstantDBProject
        ? [
            "src",
            "src/app",
            "src/lib",
            "src/components",
            "src/hooks",
            "src/types",
            "public",
          ]
        : ["src", "components", "lib", "hooks", "types", "public"];

      for (const dir of essentialDirs) {
        const dirPath = path.join(this.projectRoot, dir);
        if (!(await fs.pathExists(dirPath))) {
          if (!this.dryRun) {
            await fs.ensureDir(dirPath);
          }

          result.actions.push({
            type: "create",
            description: `Created directory: ${dir}`,
            success: true,
          });
          result.repaired++;
        }
      }

      // InstantDB-specific optimizations
      if (isInstantDBProject) {
        await this.optimizeInstantDBStructure(result);
      }

      // Ensure .gitignore exists
      const gitignorePath = path.join(this.projectRoot, ".gitignore");
      if (!(await fs.pathExists(gitignorePath))) {
        if (!this.dryRun) {
          const gitignoreContent = await this.generateGitignoreContent();
          await fs.writeFile(gitignorePath, gitignoreContent);
        }

        result.actions.push({
          type: "create",
          description: "Created .gitignore",
          success: true,
        });
        result.repaired++;
      }

      console.log(chalk.green("✅ Project structure optimized"));
    } catch (error) {
      result.errors.push(`Failed to optimize project structure: ${error}`);
    }
  }

  /**
   * Perform final validation
   */
  private async performFinalValidation(result: RepairResult): Promise<void> {
    console.log(chalk.blue("🔍 Performing final validation..."));

    try {
      const report = await this.validator.validate();

      if (report.isValid) {
        console.log(chalk.green("✅ Project structure is now healthy"));
      } else {
        const remainingIssues = report.issues.length;
        result.warnings.push(`${remainingIssues} issues remain after repair`);
        console.log(chalk.yellow(`⚠️  ${remainingIssues} issues remain`));
      }
    } catch (error) {
      result.errors.push(`Final validation failed: ${error}`);
    }
  }

  /**
   * Detect if this is an InstantDB project
   */
  private async isInstantDBProject(): Promise<boolean> {
    try {
      const packageJsonPath = path.join(this.projectRoot, "package.json");
      const instantSchemaPath = path.join(
        this.projectRoot,
        "src",
        "instant.schema.ts"
      );

      if (
        !(await fs.pathExists(packageJsonPath)) ||
        !(await fs.pathExists(instantSchemaPath))
      ) {
        return false;
      }

      const packageJson = await fs.readJson(packageJsonPath);
      const hasInstantDependency =
        packageJson.dependencies?.["@instantdb/react"] ||
        packageJson.dependencies?.["@instantdb/admin"] ||
        packageJson.dependencies?.["@instantdb/core"];

      return Boolean(hasInstantDependency);
    } catch {
      return false;
    }
  }

  /**
   * Optimize InstantDB-specific structure
   */
  private async optimizeInstantDBStructure(
    result: RepairResult
  ): Promise<void> {
    console.log(chalk.blue("🔧 Optimizing InstantDB structure..."));

    try {
      // Ensure InstantDB-specific files exist
      const instantFiles = [
        {
          path: "src/instant.schema.ts",
          content: this.generateInstantSchema(),
        },
        { path: "src/instant.perms.ts", content: this.generateInstantPerms() },
        { path: "src/lib/db.ts", content: this.generateInstantDBConnection() },
      ];

      for (const file of instantFiles) {
        const filePath = path.join(this.projectRoot, file.path);
        if (!(await fs.pathExists(filePath))) {
          if (!this.dryRun) {
            await fs.ensureDir(path.dirname(filePath));
            await fs.writeFile(filePath, file.content);
          }

          result.actions.push({
            type: "create",
            description: `Created InstantDB file: ${file.path}`,
            success: true,
          });
          result.repaired++;
        }
      }

      // Update package.json to use pnpm if it's using npm
      await this.ensurePnpmPackageManager(result);

      console.log(chalk.green("✅ InstantDB structure optimized"));
    } catch (error) {
      result.errors.push(`Failed to optimize InstantDB structure: ${error}`);
    }
  }

  /**
   * Ensure package manager is set to pnpm
   */
  private async ensurePnpmPackageManager(result: RepairResult): Promise<void> {
    try {
      const packageJsonPath = path.join(this.projectRoot, "package.json");
      if (await fs.pathExists(packageJsonPath)) {
        const packageJson = await fs.readJson(packageJsonPath);

        if (
          !packageJson.packageManager ||
          !packageJson.packageManager.startsWith("pnpm")
        ) {
          if (!this.dryRun) {
            packageJson.packageManager = "pnpm@10.11.0";
            await fs.writeJson(packageJsonPath, packageJson, { spaces: 2 });
          }

          result.actions.push({
            type: "update",
            description: "Updated package manager to pnpm",
            success: true,
          });
          result.repaired++;
        }
      }
    } catch (error) {
      result.warnings.push(`Could not update package manager: ${error}`);
    }
  }

  /**
   * Generate InstantDB schema template
   */
  private generateInstantSchema(): string {
    return `// Docs: https://www.instantdb.com/docs/modeling-data

import { i } from '@instantdb/react';

const _schema = i.schema({
  entities: {
    $files: i.entity({
      path: i.string().unique().indexed(),
      url: i.string(),
    }),
    $users: i.entity({
      email: i.string().unique().indexed().optional(),
    }),
    // Add your entities here
  },
  links: {
    // Add your links here
  },
  rooms: {
    // Add your rooms here
  },
});

// This helps Typescript display nicer intellisense
type _AppSchema = typeof _schema;
interface AppSchema extends _AppSchema {}
const schema: AppSchema = _schema;

export type { AppSchema };
export default schema;
`;
  }

  /**
   * Generate InstantDB permissions template
   */
  private generateInstantPerms(): string {
    return `// Docs: https://www.instantdb.com/docs/permissions

import type { InstantRules } from '@instantdb/react';

const rules = {
  /**
   * Welcome to Instant's permission system!
   * Right now your rules are empty. To start filling them in, check out the docs:
   * https://www.instantdb.com/docs/permissions
   *
   * Here's an example to give you a feel:
   * posts: {
   *   allow: {
   *     view: "true",
   *     create: "isOwner",
   *     update: "isOwner",
   *     delete: "isOwner",
   *   },
   *   bind: ["isOwner", "auth.id != null && auth.id == data.ownerId"],
   * },
   */
} satisfies InstantRules;

export default rules;
`;
  }

  /**
   * Generate InstantDB connection template
   */
  private generateInstantDBConnection(): string {
    return `import { init } from '@instantdb/react';
import { initAdmin } from '@instantdb/admin';
import schema from '../instant.schema';

const APP_ID = process.env.NEXT_PUBLIC_INSTANT_APP_ID!;
const ADMIN_TOKEN = process.env.INSTANT_ADMIN_TOKEN;

// Client-side database connection
const db = init({ appId: APP_ID, schema });

// Admin connection (server-side only)
const admin = ADMIN_TOKEN ? initAdmin({ appId: APP_ID, token: ADMIN_TOKEN }) : null;

export default db;
export { admin };
`;
  }

  /**
   * Helper methods
   */
  private async findFiles(...patterns: string[]): Promise<string[]> {
    const files: string[] = [];

    for (const pattern of patterns) {
      const glob = require("glob");
      const matches = await glob(pattern, {
        cwd: this.projectRoot,
        absolute: true,
        ignore: ["**/node_modules/**"],
      });
      files.push(...matches);
    }

    return [...new Set(files)];
  }

  private async findDirectories(dirName: string): Promise<string[]> {
    const glob = require("glob");
    const matches = await glob(`**/${dirName}`, {
      cwd: this.projectRoot,
      absolute: true,
      ignore: ["**/node_modules/**"],
    });
    return matches;
  }

  private async generateDefaultPackageJson(): Promise<any> {
    const isInstantDBProject = await this.isInstantDBProject();

    const basePackageJson: {
      name: string;
      version: string;
      private: boolean;
      scripts: { [key: string]: string };
      dependencies: { [key: string]: string };
      devDependencies: { [key: string]: string };
      packageManager: string;
    } = {
      name: path
        .basename(this.projectRoot)
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, "-"),
      version: "0.1.0",
      private: true,
      scripts: {
        dev: "next dev",
        build: "next build",
        start: "next start",
        lint: "next lint",
        "type-check": "tsc --noEmit",
      },
      dependencies: {
        react: "^18.0.0",
        "react-dom": "^18.0.0",
        next: "^14.0.0",
      },
      devDependencies: {
        typescript: "^5.0.0",
        "@types/node": "^20.0.0",
        "@types/react": "^18.0.0",
        "@types/react-dom": "^18.0.0",
        eslint: "^8.0.0",
        "eslint-config-next": "^14.0.0",
      },
      packageManager: "pnpm@10.11.0",
    };

    // Add InstantDB dependencies if it's an InstantDB project
    if (isInstantDBProject) {
      basePackageJson.dependencies["@instantdb/react"] = "^0.20.0";
      basePackageJson.dependencies["@instantdb/admin"] = "^0.20.0";
    }

    return basePackageJson;
  }

  private async generateDefaultTsConfig(): Promise<any> {
    const isInstantDBProject = await this.isInstantDBProject();

    const baseConfig = {
      compilerOptions: {
        target: "es5",
        lib: ["dom", "dom.iterable", "es6"],
        allowJs: true,
        skipLibCheck: true,
        strict: true,
        noEmit: true,
        esModuleInterop: true,
        module: "esnext",
        moduleResolution: "bundler",
        resolveJsonModule: true,
        isolatedModules: true,
        jsx: "preserve",
        incremental: true,
        plugins: [
          {
            name: "next",
          },
        ],
        paths: {
          "@/*": ["./*"],
        },
      },
      include: ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
      exclude: ["node_modules"],
    };

    // InstantDB projects use src/ directory structure
    if (isInstantDBProject) {
      baseConfig.compilerOptions.paths = {
        "@/*": ["./src/*"],
      };
    }

    return baseConfig;
  }

  private generateDefaultNextConfig(): string {
    return `import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    turbo: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
};

export default nextConfig;
`;
  }

  private async generateGitignoreContent(): Promise<string> {
    const isInstantDBProject = await this.isInstantDBProject();

    let content = `# Dependencies
node_modules/
.pnp
.pnp.js

# Production builds
.next/
out/
build/
dist/

# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Logs
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*
lerna-debug.log*

# Runtime data
pids
*.pid
*.seed
*.pid.lock

# Coverage directory used by tools like istanbul
coverage/
*.lcov

# nyc test coverage
.nyc_output

# Dependency directories
node_modules/
jspm_packages/

# TypeScript cache
*.tsbuildinfo

# Optional npm cache directory
.npm

# Optional eslint cache
.eslintcache

# Optional REPL history
.node_repl_history

# Output of 'npm pack'
*.tgz

# Yarn Integrity file
.yarn-integrity

# parcel-bundler cache (https://parceljs.org/)
.cache
.parcel-cache

# Next.js build output
.next

# Nuxt.js build / generate output
.nuxt
dist

# Gatsby files
.cache/
public

# Storybook build outputs
.out
.storybook-out

# Temporary folders
tmp/
temp/

# Editor directories and files
.vscode/
.idea/
*.swp
*.swo
*~

# OS generated files
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
ehthumbs.db
Thumbs.db

# MyContext specific
.mycontext/.env
.mycontext/logs/
.mycontext/cache/`;

    // Add InstantDB-specific patterns
    if (isInstantDBProject) {
      content += `

# InstantDB specific
.env.local
.env.development.local
.env.test.local
.env.production.local
# Admin tokens should be kept secure
INSTANT_ADMIN_TOKEN
instant.db
*.db
*.sqlite
*.sqlite3`;
    }

    return content;
  }
}
