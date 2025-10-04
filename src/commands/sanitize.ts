import chalk from "chalk";
import path from "path";
import * as fs from "fs-extra";
import { glob } from "glob";
import { CommandOptions } from "../types";
import { EnhancedSpinner } from "../utils/spinner";

interface SanitizeOptions extends CommandOptions {
  fix?: boolean;
  verbose?: boolean;
  checkDuplicates?: boolean;
  checkUnreachable?: boolean;
  checkRedundancy?: boolean;
  checkUnused?: boolean;
}

interface SanitizeReport {
  duplicates: DuplicateFile[];
  unreachable: UnreachableFile[];
  redundant: RedundantFile[];
  unused: UnusedFile[];
  summary: {
    totalIssues: number;
    duplicates: number;
    unreachable: number;
    redundant: number;
    unused: number;
  };
}

interface DuplicateFile {
  type: "exact" | "similar";
  files: string[];
  similarity: number;
  size: number;
}

interface UnreachableFile {
  file: string;
  reason: "no-imports" | "unused-export" | "dead-code";
  details: string;
}

interface RedundantFile {
  file: string;
  reason: "duplicate-functionality" | "obsolete" | "superseded";
  details: string;
  suggestion?: string;
}

interface UnusedFile {
  file: string;
  reason: "unused-import" | "unused-export" | "unused-dependency";
  details: string;
}

export class SanitizeCommand {
  private spinner = new EnhancedSpinner("Sanitizing project...");

  async execute(target: string, options: SanitizeOptions): Promise<void> {
    const {
      fix = false,
      verbose = false,
      checkDuplicates = true,
      checkUnreachable = true,
      checkRedundancy = true,
      checkUnused = true,
    } = options;

    console.log(chalk.blue.bold("🧹 Project Sanitization\n"));

    try {
      const projectPath = path.resolve(target);

      if (!(await this.isValidProject(projectPath))) {
        throw new Error("Not a valid project directory");
      }

      this.spinner.start().updateText("Analyzing project structure...");

      const report = await this.analyzeProject(projectPath, {
        checkDuplicates,
        checkUnreachable,
        checkRedundancy,
        checkUnused,
        verbose,
      });

      this.spinner.succeed("Analysis completed");

      this.displayReport(report, verbose);

      if (fix) {
        await this.fixIssues(report, projectPath);
      } else {
        this.showFixSuggestions(report);
      }
    } catch (error) {
      this.spinner.fail("Sanitization failed");
      throw error;
    }
  }

  private async isValidProject(projectPath: string): Promise<boolean> {
    const packageJsonPath = path.join(projectPath, "package.json");
    return await fs.pathExists(packageJsonPath);
  }

  private async analyzeProject(
    projectPath: string,
    options: {
      checkDuplicates: boolean;
      checkUnreachable: boolean;
      checkRedundancy: boolean;
      checkUnused: boolean;
      verbose: boolean;
    }
  ): Promise<SanitizeReport> {
    const report: SanitizeReport = {
      duplicates: [],
      unreachable: [],
      redundant: [],
      unused: [],
      summary: {
        totalIssues: 0,
        duplicates: 0,
        unreachable: 0,
        redundant: 0,
        unused: 0,
      },
    };

    // Get all relevant files
    const files = await this.getAllFiles(projectPath);

    if (options.checkDuplicates) {
      this.spinner.updateText("Checking for duplicate files...");
      report.duplicates = await this.findDuplicates(files);
      report.summary.duplicates = report.duplicates.length;
    }

    if (options.checkUnreachable) {
      this.spinner.updateText("Checking for unreachable code...");
      report.unreachable = await this.findUnreachableCode(files, projectPath);
      report.summary.unreachable = report.unreachable.length;
    }

    if (options.checkRedundancy) {
      this.spinner.updateText("Checking for redundant files...");
      report.redundant = await this.findRedundantFiles(files, projectPath);
      report.summary.redundant = report.redundant.length;
    }

    if (options.checkUnused) {
      this.spinner.updateText("Checking for unused files...");
      report.unused = await this.findUnusedFiles(files, projectPath);
      report.summary.unused = report.unused.length;
    }

    report.summary.totalIssues =
      report.summary.duplicates +
      report.summary.unreachable +
      report.summary.redundant +
      report.summary.unused;

    return report;
  }

  private async getAllFiles(projectPath: string): Promise<string[]> {
    const patterns = [
      "**/*.{ts,tsx,js,jsx,json,md}",
      "!node_modules/**",
      "!.git/**",
      "!.next/**",
      "!dist/**",
      "!build/**",
      "!.mycontext/**",
    ];

    const files: string[] = [];
    for (const pattern of patterns) {
      const matches = await glob(pattern, { cwd: projectPath });
      files.push(...matches.map((file) => path.join(projectPath, file)));
    }

    return files;
  }

  private async findDuplicates(files: string[]): Promise<DuplicateFile[]> {
    const duplicates: DuplicateFile[] = [];
    const fileHashes = new Map<string, string[]>();

    for (const file of files) {
      try {
        const content = await fs.readFile(file, "utf-8");
        const hash = this.hashContent(content);

        if (fileHashes.has(hash)) {
          fileHashes.get(hash)!.push(file);
        } else {
          fileHashes.set(hash, [file]);
        }
      } catch (error) {
        // Skip files that can't be read
        continue;
      }
    }

    for (const [hash, fileList] of fileHashes) {
      if (fileList.length > 1) {
        const firstFile = fileList[0];
        if (!firstFile) continue;
        const stats = await fs.stat(firstFile);
        const size = stats.size;
        duplicates.push({
          type: "exact",
          files: fileList,
          similarity: 100,
          size,
        });
      }
    }

    return duplicates;
  }

  private async findUnreachableCode(
    files: string[],
    projectPath: string
  ): Promise<UnreachableFile[]> {
    const unreachable: UnreachableFile[] = [];
    const importMap = new Map<string, Set<string>>();
    const exportMap = new Map<string, Set<string>>();

    // Build import/export maps
    for (const file of files) {
      if (
        file.endsWith(".ts") ||
        file.endsWith(".tsx") ||
        file.endsWith(".js") ||
        file.endsWith(".jsx")
      ) {
        try {
          const content = await fs.readFile(file, "utf-8");
          const relativePath = path.relative(projectPath, file);

          // Find imports
          const imports = this.extractImports(content);
          importMap.set(relativePath, new Set(imports));

          // Find exports
          const exports = this.extractExports(content);
          exportMap.set(relativePath, new Set(exports));
        } catch (error) {
          continue;
        }
      }
    }

    // Check for unreachable files
    for (const file of files) {
      const relativePath = path.relative(projectPath, file);

      // Skip entry points
      if (this.isEntryPoint(relativePath)) {
        continue;
      }

      // Check if file is imported anywhere
      let isImported = false;
      for (const [_, imports] of importMap) {
        if (
          imports.has(relativePath) ||
          imports.has(relativePath.replace(/\.(ts|tsx|js|jsx)$/, ""))
        ) {
          isImported = true;
          break;
        }
      }

      if (!isImported) {
        unreachable.push({
          file: relativePath,
          reason: "no-imports",
          details: "File is not imported by any other file",
        });
      }
    }

    return unreachable;
  }

  private async findRedundantFiles(
    files: string[],
    projectPath: string
  ): Promise<RedundantFile[]> {
    const redundant: RedundantFile[] = [];
    const fileNames = new Map<string, string[]>();

    // Group files by name
    for (const file of files) {
      const fileName = path.basename(file);
      if (!fileNames.has(fileName)) {
        fileNames.set(fileName, []);
      }
      fileNames.get(fileName)!.push(file);
    }

    // Check for files with same name in different locations
    for (const [fileName, fileList] of fileNames) {
      if (fileList.length > 1) {
        for (const file of fileList) {
          redundant.push({
            file: path.relative(projectPath, file),
            reason: "duplicate-functionality",
            details: `Multiple files with name '${fileName}' found`,
            suggestion: "Consider consolidating or renaming files",
          });
        }
      }
    }

    // Check for common redundant patterns
    for (const file of files) {
      const relativePath = path.relative(projectPath, file);

      // Check for test files without corresponding source files
      if (file.includes(".test.") || file.includes(".spec.")) {
        const sourceFile = file.replace(/\.(test|spec)\./, ".");
        if (!(await fs.pathExists(sourceFile))) {
          redundant.push({
            file: relativePath,
            reason: "obsolete",
            details: "Test file without corresponding source file",
            suggestion: "Remove test file or create source file",
          });
        }
      }

      // Check for backup files
      if (
        file.endsWith(".bak") ||
        file.endsWith(".backup") ||
        file.endsWith("~")
      ) {
        redundant.push({
          file: relativePath,
          reason: "obsolete",
          details: "Backup file detected",
          suggestion: "Remove backup file if no longer needed",
        });
      }
    }

    return redundant;
  }

  private async findUnusedFiles(
    files: string[],
    projectPath: string
  ): Promise<UnusedFile[]> {
    const unused: UnusedFile[] = [];
    const packageJsonPath = path.join(projectPath, "package.json");

    if (await fs.pathExists(packageJsonPath)) {
      try {
        const packageJson = JSON.parse(
          await fs.readFile(packageJsonPath, "utf-8")
        );
        const dependencies = {
          ...(packageJson.dependencies || {}),
          ...(packageJson.devDependencies || {}),
        };

        // Check for unused dependencies
        for (const [depName, _] of Object.entries(dependencies)) {
          const isUsed = await this.isDependencyUsed(depName, files);
          if (!isUsed) {
            unused.push({
              file: `package.json (${depName})`,
              reason: "unused-dependency",
              details: `Dependency '${depName}' is not used in the codebase`,
            });
          }
        }
      } catch (error) {
        // Skip if package.json can't be parsed
      }
    }

    return unused;
  }

  private hashContent(content: string): string {
    // Simple hash function for content comparison
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString();
  }

  private extractImports(content: string): string[] {
    const imports: string[] = [];
    const importRegex = /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g;
    let match;

    while ((match = importRegex.exec(content)) !== null) {
      if (match[1]) imports.push(match[1]);
    }

    return imports;
  }

  private extractExports(content: string): string[] {
    const exports: string[] = [];

    // Named exports
    const namedExportRegex =
      /export\s+(?:const|let|var|function|class|interface|type)\s+(\w+)/g;
    let match;
    while ((match = namedExportRegex.exec(content)) !== null) {
      if (match[1]) exports.push(match[1]);
    }

    // Default exports
    const defaultExportRegex = /export\s+default\s+(\w+)/g;
    while ((match = defaultExportRegex.exec(content)) !== null) {
      if (match[1]) exports.push(match[1]);
    }

    return exports;
  }

  private isEntryPoint(filePath: string): boolean {
    const entryPoints = [
      "index.ts",
      "index.js",
      "main.ts",
      "main.js",
      "app/page.tsx",
      "pages/index.tsx",
      "pages/_app.tsx",
      "pages/_document.tsx",
    ];

    return entryPoints.some((entry) => filePath.includes(entry));
  }

  private async isDependencyUsed(
    depName: string,
    files: string[]
  ): Promise<boolean> {
    for (const file of files) {
      if (
        file.endsWith(".ts") ||
        file.endsWith(".tsx") ||
        file.endsWith(".js") ||
        file.endsWith(".jsx")
      ) {
        try {
          const content = await fs.readFile(file, "utf-8");
          if (content.includes(depName)) {
            return true;
          }
        } catch (error) {
          continue;
        }
      }
    }
    return false;
  }

  private displayReport(report: SanitizeReport, verbose: boolean): void {
    console.log(chalk.blue.bold("\n📊 Sanitization Report\n"));

    console.log(chalk.yellow("Summary:"));
    console.log(`  Total Issues: ${report.summary.totalIssues}`);
    console.log(`  Duplicates: ${report.summary.duplicates}`);
    console.log(`  Unreachable: ${report.summary.unreachable}`);
    console.log(`  Redundant: ${report.summary.redundant}`);
    console.log(`  Unused: ${report.summary.unused}\n`);

    if (report.duplicates.length > 0) {
      console.log(chalk.red.bold("🔍 Duplicate Files:"));
      for (const duplicate of report.duplicates) {
        console.log(
          chalk.red(
            `  ${duplicate.type.toUpperCase()} (${
              duplicate.similarity
            }% similar, ${duplicate.size} bytes)`
          )
        );
        for (const file of duplicate.files) {
          console.log(chalk.gray(`    - ${file}`));
        }
        console.log();
      }
    }

    if (report.unreachable.length > 0) {
      console.log(chalk.yellow.bold("🚫 Unreachable Files:"));
      for (const unreachable of report.unreachable) {
        console.log(chalk.yellow(`  ${unreachable.file}`));
        console.log(chalk.gray(`    Reason: ${unreachable.reason}`));
        console.log(chalk.gray(`    Details: ${unreachable.details}\n`));
      }
    }

    if (report.redundant.length > 0) {
      console.log(chalk.yellow.bold("🔄 Redundant Files:"));
      for (const redundant of report.redundant) {
        console.log(chalk.yellow(`  ${redundant.file}`));
        console.log(chalk.gray(`    Reason: ${redundant.reason}`));
        console.log(chalk.gray(`    Details: ${redundant.details}`));
        if (redundant.suggestion) {
          console.log(chalk.cyan(`    Suggestion: ${redundant.suggestion}`));
        }
        console.log();
      }
    }

    if (report.unused.length > 0) {
      console.log(chalk.magenta.bold("🗑️ Unused Files:"));
      for (const unused of report.unused) {
        console.log(chalk.magenta(`  ${unused.file}`));
        console.log(chalk.gray(`    Reason: ${unused.reason}`));
        console.log(chalk.gray(`    Details: ${unused.details}\n`));
      }
    }
  }

  private showFixSuggestions(report: SanitizeReport): void {
    if (report.summary.totalIssues === 0) {
      console.log(
        chalk.green.bold("✅ No issues found! Your project is clean.")
      );
      return;
    }

    console.log(chalk.blue.bold("\n🔧 Fix Suggestions:"));
    console.log(chalk.gray("Run with --fix flag to automatically fix issues:"));
    console.log(chalk.cyan("  mycontext sanitize --fix\n"));

    if (report.duplicates.length > 0) {
      console.log(chalk.yellow("For duplicate files:"));
      console.log(chalk.gray("  - Review and consolidate duplicate files"));
      console.log(chalk.gray("  - Remove unnecessary copies\n"));
    }

    if (report.unreachable.length > 0) {
      console.log(chalk.yellow("For unreachable files:"));
      console.log(chalk.gray("  - Remove unused files or add proper imports"));
      console.log(chalk.gray("  - Check if files should be entry points\n"));
    }

    if (report.redundant.length > 0) {
      console.log(chalk.yellow("For redundant files:"));
      console.log(
        chalk.gray("  - Rename or consolidate files with same names")
      );
      console.log(chalk.gray("  - Remove obsolete files\n"));
    }

    if (report.unused.length > 0) {
      console.log(chalk.yellow("For unused dependencies:"));
      console.log(
        chalk.gray("  - Remove unused dependencies from package.json")
      );
      console.log(
        chalk.gray("  - Run 'npm prune' or 'pnpm prune' to clean up\n")
      );
    }
  }

  private async fixIssues(
    report: SanitizeReport,
    projectPath: string
  ): Promise<void> {
    console.log(chalk.blue.bold("\n🔧 Fixing Issues...\n"));

    let fixedCount = 0;

    // Fix duplicate files (keep the first one, remove others)
    for (const duplicate of report.duplicates) {
      if (duplicate.files.length > 1) {
        const keepFile = duplicate.files[0];
        const removeFiles = duplicate.files.slice(1);

        for (const file of removeFiles) {
          try {
            await fs.remove(file);
            console.log(
              chalk.green(
                `  ✅ Removed duplicate: ${path.relative(projectPath, file)}`
              )
            );
            fixedCount++;
          } catch (error) {
            console.log(
              chalk.red(
                `  ❌ Failed to remove: ${path.relative(projectPath, file)}`
              )
            );
          }
        }
      }
    }

    // Fix unused dependencies
    for (const unused of report.unused) {
      if (unused.reason === "unused-dependency") {
        const depName = unused.file.match(/\(([^)]+)\)/)?.[1];
        if (depName) {
          try {
            // This would require modifying package.json
            console.log(
              chalk.yellow(
                `  ⚠️ Manual fix needed: Remove dependency '${depName}' from package.json`
              )
            );
          } catch (error) {
            console.log(
              chalk.red(`  ❌ Failed to remove dependency: ${depName}`)
            );
          }
        }
      }
    }

    console.log(chalk.green.bold(`\n✅ Fixed ${fixedCount} issues`));
    console.log(
      chalk.gray("Some issues may require manual review and fixing.")
    );
  }
}
