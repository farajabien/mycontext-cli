import * as fs from "fs-extra";
import * as path from "path";
import chalk from "chalk";
import { NextJSProjectValidator } from "./NextJSProjectValidator";

export interface ProjectStructureReport {
  isValid: boolean;
  issues: ProjectStructureIssue[];
  metrics: ProjectMetrics;
  recommendations: string[];
  autoFixable: boolean;
  nextjsCompliant?: boolean;
  shadcnCompliant?: boolean;
}

export interface ProjectStructureIssue {
  type: "error" | "warning" | "info";
  severity: "critical" | "high" | "medium" | "low";
  message: string;
  file?: string;
  fix?: string;
  autoFixable: boolean;
}

export interface ProjectMetrics {
  packageJsonCount: number;
  nodeModulesCount: number;
  lockFileCount: number;
  tsConfigCount: number;
  buildConfigCount: number;
  totalFiles: number;
  projectDepth: number;
}

export class ProjectStructureValidator {
  private projectRoot: string;
  private issues: ProjectStructureIssue[] = [];
  private metrics: ProjectMetrics;
  private nextjsValidator: NextJSProjectValidator;

  constructor(projectRoot: string = process.cwd()) {
    this.projectRoot = projectRoot;
    this.metrics = this.calculateMetrics();
    this.nextjsValidator = new NextJSProjectValidator(projectRoot);
  }

  /**
   * Comprehensive project structure validation
   */
  async validate(): Promise<ProjectStructureReport> {
    this.issues = [];

    console.log(chalk.blue("🔍 Validating project structure..."));

    // Run all validation checks
    await this.checkPackageJsonFiles();
    await this.checkNodeModulesDirectories();
    await this.checkLockFiles();
    await this.checkTypeScriptConfigs();
    await this.checkBuildConfigs();
    await this.checkProjectDepth();
    await this.checkPathIssues();
    await this.checkDependencyConflicts();

    // Run Next.js specific validation
    const nextjsReport = await this.nextjsValidator.validateNextJSProject();
    this.issues.push(
      ...nextjsReport.issues.map((issue) => ({
        type: issue.type,
        severity: issue.severity,
        message: issue.message,
        file: issue.file,
        fix: issue.fix,
        autoFixable: issue.autoFixable,
      }))
    );

    const isValid =
      this.issues.filter((issue) => issue.type === "error").length === 0;
    const autoFixable = this.issues.every((issue) => issue.autoFixable);

    return {
      isValid,
      issues: this.issues,
      metrics: this.metrics,
      recommendations: this.generateRecommendations(),
      autoFixable,
      nextjsCompliant: nextjsReport.appRouterCompliant,
      shadcnCompliant: nextjsReport.shadcnCompliant,
    };
  }

  /**
   * Check for multiple package.json files
   */
  private async checkPackageJsonFiles(): Promise<void> {
    const packageJsonFiles = await this.findFiles("package.json");

    if (packageJsonFiles.length === 0) {
      this.addIssue({
        type: "error",
        severity: "critical",
        message: "No package.json file found in project root",
        autoFixable: false,
      });
    } else if (packageJsonFiles.length > 1) {
      this.addIssue({
        type: "error",
        severity: "critical",
        message: `Multiple package.json files detected (${packageJsonFiles.length} found)`,
        file: packageJsonFiles.join(", "),
        fix: "Remove nested package.json files and consolidate dependencies",
        autoFixable: true,
      });
    }
  }

  /**
   * Check for nested node_modules directories
   */
  private async checkNodeModulesDirectories(): Promise<void> {
    const nodeModulesDirs = await this.findDirectories("node_modules");

    if (nodeModulesDirs.length === 0) {
      this.addIssue({
        type: "warning",
        severity: "medium",
        message:
          "No node_modules directory found. Run 'pnpm install' to install dependencies",
        autoFixable: true,
      });
    } else if (nodeModulesDirs.length > 1) {
      this.addIssue({
        type: "error",
        severity: "critical",
        message: `Nested node_modules directories detected (${nodeModulesDirs.length} found)`,
        file: nodeModulesDirs.join(", "),
        fix: "Remove nested node_modules directories and reinstall dependencies",
        autoFixable: true,
      });
    }
  }

  /**
   * Check for multiple lock files
   */
  private async checkLockFiles(): Promise<void> {
    const lockFiles = await this.findFiles(
      "*-lock.yaml",
      "package-lock.json",
      "yarn.lock",
      "bun.lockb"
    );

    if (lockFiles.length === 0) {
      this.addIssue({
        type: "warning",
        severity: "medium",
        message:
          "No lock file found. Run 'pnpm install' to generate pnpm-lock.yaml",
        autoFixable: true,
      });
    } else if (lockFiles.length > 1) {
      this.addIssue({
        type: "error",
        severity: "critical",
        message: `Multiple lock files detected (${lockFiles.length} found)`,
        file: lockFiles.join(", "),
        fix: "Remove conflicting lock files and keep only pnpm-lock.yaml",
        autoFixable: true,
      });
    }
  }

  /**
   * Check for multiple TypeScript configurations
   */
  private async checkTypeScriptConfigs(): Promise<void> {
    const tsConfigFiles = await this.findFiles("tsconfig*.json");

    if (tsConfigFiles.length === 0) {
      this.addIssue({
        type: "error",
        severity: "high",
        message: "No TypeScript configuration found",
        autoFixable: true,
      });
    } else if (tsConfigFiles.length > 2) {
      this.addIssue({
        type: "warning",
        severity: "medium",
        message: `Multiple TypeScript configurations detected (${tsConfigFiles.length} found)`,
        file: tsConfigFiles.join(", "),
        fix: "Consider consolidating TypeScript configurations",
        autoFixable: false,
      });
    }
  }

  /**
   * Check for multiple build configurations
   */
  private async checkBuildConfigs(): Promise<void> {
    const buildConfigs = await this.findFiles(
      "next.config.*",
      "webpack.config.*",
      "vite.config.*",
      "rollup.config.*",
      "esbuild.config.*"
    );

    if (buildConfigs.length === 0) {
      this.addIssue({
        type: "warning",
        severity: "medium",
        message: "No build configuration found",
        autoFixable: true,
      });
    } else if (buildConfigs.length > 1) {
      this.addIssue({
        type: "error",
        severity: "high",
        message: `Multiple build configurations detected (${buildConfigs.length} found)`,
        file: buildConfigs.join(", "),
        fix: "Remove conflicting build configurations and keep only Next.js config",
        autoFixable: true,
      });
    }
  }

  /**
   * Check project depth and path issues
   */
  private async checkProjectDepth(): Promise<void> {
    const depth = this.calculateProjectDepth();

    if (depth > 6) {
      this.addIssue({
        type: "warning",
        severity: "medium",
        message: `Project path is deeply nested (${depth} levels). Consider moving to a shorter path`,
        autoFixable: false,
      });
    }

    if (this.projectRoot.includes(" ")) {
      this.addIssue({
        type: "warning",
        severity: "medium",
        message:
          "Project path contains spaces, which may cause issues with some tools",
        autoFixable: false,
      });
    }
  }

  /**
   * Check for dependency conflicts
   */
  private async checkDependencyConflicts(): Promise<void> {
    try {
      const packageJsonPath = path.join(this.projectRoot, "package.json");
      if (await fs.pathExists(packageJsonPath)) {
        const packageJson = await fs.readJson(packageJsonPath);

        // Check for package manager conflicts
        if (
          packageJson.packageManager &&
          !packageJson.packageManager.includes("pnpm")
        ) {
          this.addIssue({
            type: "warning",
            severity: "medium",
            message: "Package manager specified is not pnpm",
            fix: "Update packageManager field to use pnpm",
            autoFixable: true,
          });
        }

        // Check for duplicate dependencies
        const allDeps = {
          ...(packageJson.dependencies || {}),
          ...(packageJson.devDependencies || {}),
          ...(packageJson.peerDependencies || {}),
        };

        const duplicateDeps = this.findDuplicateDependencies(allDeps);
        if (duplicateDeps.length > 0) {
          this.addIssue({
            type: "warning",
            severity: "low",
            message: `Potential duplicate dependencies: ${duplicateDeps.join(", ")}`,
            autoFixable: false,
          });
        }
      }
    } catch (error) {
      this.addIssue({
        type: "error",
        severity: "medium",
        message: `Failed to read package.json: ${error}`,
        autoFixable: false,
      });
    }
  }

  /**
   * Check for path-related issues
   */
  private async checkPathIssues(): Promise<void> {
    const pathIssues = [];

    // Check for special characters in path
    if (/[<>:"|?*]/.test(this.projectRoot)) {
      pathIssues.push("contains invalid characters");
    }

    // Check for very long paths
    if (this.projectRoot.length > 200) {
      pathIssues.push("path is very long");
    }

    if (pathIssues.length > 0) {
      this.addIssue({
        type: "warning",
        severity: "low",
        message: `Project path ${pathIssues.join(" and ")}`,
        autoFixable: false,
      });
    }
  }

  /**
   * Auto-fix detected issues
   */
  async autoFix(): Promise<{
    fixed: number;
    failed: number;
    errors: string[];
  }> {
    const report = await this.validate();
    let fixed = 0;
    let failed = 0;
    const errors: string[] = [];

    console.log(chalk.blue("🔧 Attempting to auto-fix issues..."));

    for (const issue of report.issues) {
      if (issue.autoFixable) {
        try {
          await this.fixIssue(issue);
          fixed++;
          console.log(chalk.green(`✅ Fixed: ${issue.message}`));
        } catch (error) {
          failed++;
          errors.push(`Failed to fix "${issue.message}": ${error}`);
          console.log(chalk.red(`❌ Failed to fix: ${issue.message}`));
        }
      }
    }

    return { fixed, failed, errors };
  }

  /**
   * Fix a specific issue
   */
  private async fixIssue(issue: ProjectStructureIssue): Promise<void> {
    switch (issue.type) {
      case "error":
        if (issue.message.includes("Multiple package.json")) {
          await this.removeNestedPackageJson();
        } else if (issue.message.includes("Nested node_modules")) {
          await this.removeNestedNodeModules();
        } else if (issue.message.includes("Multiple lock files")) {
          await this.removeConflictingLockFiles();
        } else if (issue.message.includes("Multiple build configurations")) {
          await this.removeConflictingBuildConfigs();
        }
        break;
      case "warning":
        if (issue.message.includes("No package.json")) {
          await this.createDefaultPackageJson();
        } else if (issue.message.includes("No lock file")) {
          await this.generateLockFile();
        } else if (issue.message.includes("No TypeScript configuration")) {
          await this.createDefaultTsConfig();
        } else if (issue.message.includes("No build configuration")) {
          await this.createDefaultNextConfig();
        }
        break;
    }
  }

  /**
   * Remove nested package.json files
   */
  private async removeNestedPackageJson(): Promise<void> {
    const packageJsonFiles = await this.findFiles("package.json");
    const rootPackageJson = path.join(this.projectRoot, "package.json");

    for (const file of packageJsonFiles) {
      if (file !== rootPackageJson) {
        await fs.remove(file);
        console.log(chalk.yellow(`🗑️  Removed nested package.json: ${file}`));
      }
    }
  }

  /**
   * Remove nested node_modules directories
   */
  private async removeNestedNodeModules(): Promise<void> {
    const nodeModulesDirs = await this.findDirectories("node_modules");
    const rootNodeModules = path.join(this.projectRoot, "node_modules");

    for (const dir of nodeModulesDirs) {
      if (dir !== rootNodeModules) {
        await fs.remove(dir);
        console.log(chalk.yellow(`🗑️  Removed nested node_modules: ${dir}`));
      }
    }
  }

  /**
   * Remove conflicting lock files
   */
  private async removeConflictingLockFiles(): Promise<void> {
    const lockFiles = await this.findFiles(
      "*-lock.yaml",
      "package-lock.json",
      "yarn.lock",
      "bun.lockb"
    );
    const preferredLockFile = path.join(this.projectRoot, "pnpm-lock.yaml");

    for (const file of lockFiles) {
      if (file !== preferredLockFile) {
        await fs.remove(file);
        console.log(chalk.yellow(`🗑️  Removed conflicting lock file: ${file}`));
      }
    }
  }

  /**
   * Remove conflicting build configurations
   */
  private async removeConflictingBuildConfigs(): Promise<void> {
    const buildConfigs = await this.findFiles(
      "next.config.*",
      "webpack.config.*",
      "vite.config.*",
      "rollup.config.*",
      "esbuild.config.*"
    );
    const preferredConfig = path.join(this.projectRoot, "next.config.ts");

    for (const file of buildConfigs) {
      if (file !== preferredConfig) {
        await fs.remove(file);
        console.log(
          chalk.yellow(`🗑️  Removed conflicting build config: ${file}`)
        );
      }
    }
  }

  /**
   * Create default package.json
   */
  private async createDefaultPackageJson(): Promise<void> {
    const defaultPackageJson = {
      name: path.basename(this.projectRoot),
      version: "0.1.0",
      private: true,
      scripts: {
        dev: "next dev",
        build: "next build",
        start: "next start",
        lint: "next lint",
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
        tailwindcss: "^3.0.0",
        autoprefixer: "^10.0.0",
        postcss: "^8.0.0",
      },
      packageManager: "pnpm@10.11.0",
    };

    await fs.writeJson(
      path.join(this.projectRoot, "package.json"),
      defaultPackageJson,
      { spaces: 2 }
    );
    console.log(chalk.green("✅ Created default package.json"));
  }

  /**
   * Generate lock file
   */
  private async generateLockFile(): Promise<void> {
    const { execSync } = require("child_process");
    try {
      execSync("pnpm install", { cwd: this.projectRoot, stdio: "pipe" });
      console.log(chalk.green("✅ Generated pnpm-lock.yaml"));
    } catch (error) {
      throw new Error("Failed to generate lock file");
    }
  }

  /**
   * Create default TypeScript configuration
   */
  private async createDefaultTsConfig(): Promise<void> {
    const defaultTsConfig = {
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

    await fs.writeJson(
      path.join(this.projectRoot, "tsconfig.json"),
      defaultTsConfig,
      { spaces: 2 }
    );
    console.log(chalk.green("✅ Created default tsconfig.json"));
  }

  /**
   * Create default Next.js configuration
   */
  private async createDefaultNextConfig(): Promise<void> {
    const defaultNextConfig = `import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    turbo: true,
  },
};

export default nextConfig;
`;

    await fs.writeFile(
      path.join(this.projectRoot, "next.config.ts"),
      defaultNextConfig
    );
    console.log(chalk.green("✅ Created default next.config.ts"));
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

  private calculateMetrics(): ProjectMetrics {
    return {
      packageJsonCount: 0,
      nodeModulesCount: 0,
      lockFileCount: 0,
      tsConfigCount: 0,
      buildConfigCount: 0,
      totalFiles: 0,
      projectDepth: this.calculateProjectDepth(),
    };
  }

  private calculateProjectDepth(): number {
    return this.projectRoot.split(path.sep).length;
  }

  private findDuplicateDependencies(deps: Record<string, string>): string[] {
    const duplicates: string[] = [];
    const seen = new Set<string>();

    for (const [name, version] of Object.entries(deps)) {
      if (seen.has(name)) {
        duplicates.push(name);
      }
      seen.add(name);
    }

    return duplicates;
  }

  private addIssue(issue: ProjectStructureIssue): void {
    this.issues.push(issue);
  }

  private generateRecommendations(): string[] {
    const recommendations: string[] = [];

    if (this.metrics.packageJsonCount > 1) {
      recommendations.push(
        "Consolidate all dependencies into a single package.json file"
      );
    }

    if (this.metrics.nodeModulesCount > 1) {
      recommendations.push(
        "Remove nested node_modules directories and reinstall dependencies"
      );
    }

    if (this.metrics.lockFileCount > 1) {
      recommendations.push(
        "Use only pnpm-lock.yaml and remove other lock files"
      );
    }

    if (this.metrics.projectDepth > 6) {
      recommendations.push("Consider moving project to a shorter path");
    }

    if (this.projectRoot.includes(" ")) {
      recommendations.push("Consider moving project to a path without spaces");
    }

    return recommendations;
  }

  /**
   * Generate a comprehensive health report
   */
  async generateHealthReport(): Promise<string> {
    const report = await this.validate();

    let healthReport = `# Project Health Report\n\n`;
    healthReport += `**Generated:** ${new Date().toISOString()}\n`;
    healthReport += `**Project Root:** ${this.projectRoot}\n\n`;

    healthReport += `## 📊 Metrics\n\n`;
    healthReport += `- Package files: ${report.metrics.packageJsonCount}\n`;
    healthReport += `- Node modules: ${report.metrics.nodeModulesCount}\n`;
    healthReport += `- Lock files: ${report.metrics.lockFileCount}\n`;
    healthReport += `- TypeScript configs: ${report.metrics.tsConfigCount}\n`;
    healthReport += `- Build configs: ${report.metrics.buildConfigCount}\n`;
    healthReport += `- Project depth: ${report.metrics.projectDepth}\n\n`;

    healthReport += `## 🏥 Health Status\n\n`;
    healthReport += `**Overall Status:** ${report.isValid ? "✅ HEALTHY" : "❌ NEEDS ATTENTION"}\n\n`;

    if (report.issues.length > 0) {
      healthReport += `## 🚨 Issues Found\n\n`;

      const criticalIssues = report.issues.filter(
        (i) => i.severity === "critical"
      );
      const highIssues = report.issues.filter((i) => i.severity === "high");
      const mediumIssues = report.issues.filter((i) => i.severity === "medium");
      const lowIssues = report.issues.filter((i) => i.severity === "low");

      if (criticalIssues.length > 0) {
        healthReport += `### Critical Issues\n\n`;
        criticalIssues.forEach((issue) => {
          healthReport += `- ❌ **${issue.message}**\n`;
          if (issue.file) healthReport += `  - File: ${issue.file}\n`;
          if (issue.fix) healthReport += `  - Fix: ${issue.fix}\n`;
          healthReport += `\n`;
        });
      }

      if (highIssues.length > 0) {
        healthReport += `### High Priority Issues\n\n`;
        highIssues.forEach((issue) => {
          healthReport += `- ⚠️ **${issue.message}**\n`;
          if (issue.file) healthReport += `  - File: ${issue.file}\n`;
          if (issue.fix) healthReport += `  - Fix: ${issue.fix}\n`;
          healthReport += `\n`;
        });
      }

      if (mediumIssues.length > 0) {
        healthReport += `### Medium Priority Issues\n\n`;
        mediumIssues.forEach((issue) => {
          healthReport += `- ⚠️ **${issue.message}**\n`;
          if (issue.file) healthReport += `  - File: ${issue.file}\n`;
          if (issue.fix) healthReport += `  - Fix: ${issue.fix}\n`;
          healthReport += `\n`;
        });
      }

      if (lowIssues.length > 0) {
        healthReport += `### Low Priority Issues\n\n`;
        lowIssues.forEach((issue) => {
          healthReport += `- ℹ️ **${issue.message}**\n`;
          if (issue.file) healthReport += `  - File: ${issue.file}\n`;
          if (issue.fix) healthReport += `  - Fix: ${issue.fix}\n`;
          healthReport += `\n`;
        });
      }
    }

    if (report.recommendations.length > 0) {
      healthReport += `## 💡 Recommendations\n\n`;
      report.recommendations.forEach((rec) => {
        healthReport += `- ${rec}\n`;
      });
      healthReport += `\n`;
    }

    healthReport += `## 🔧 Auto-Fix Available\n\n`;
    healthReport += `**Auto-fixable issues:** ${report.autoFixable ? "✅ Yes" : "❌ No"}\n\n`;

    if (report.autoFixable) {
      healthReport += `Run \`mycontext health-check --fix\` to automatically fix issues.\n\n`;
    }

    return healthReport;
  }
}
