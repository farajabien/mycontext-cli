/**
 * ProjectScanner — Scans the real file structure and compares against context.json
 * 
 * This is the "eyes" of the Living Brain:
 * 1. Walks the actual project file tree
 * 2. Reads key files (package.json, route files, components, schemas)
 * 3. Builds a structured ProjectSnapshot
 * 4. Passes snapshot + context.json to LLM for progress assessment
 * 5. Returns a ContextDiffReport with suggested merges/updates
 */
import * as fs from "fs-extra";
import * as path from "path";
import chalk from "chalk";
import { AICore } from "../core/ai/AICore";

// --- Types ---

export interface FileEntry {
  path: string;          // Relative to project root
  type: "file" | "dir";
  size?: number;         // bytes
  extension?: string;
}

export interface FileSnippet {
  path: string;          // Relative to project root
  content: string;       // Truncated content
  lines: number;
}

export interface ProjectSnapshot {
  scannedAt: string;
  projectRoot: string;
  fileTree: FileEntry[];
  keyFiles: FileSnippet[];
  stats: {
    totalFiles: number;
    totalDirs: number;
    routeFiles: number;
    componentFiles: number;
    apiFiles: number;
    schemaFiles: number;
    testFiles: number;
  };
}

export interface ContextDiffItem {
  type: "missing_in_context" | "missing_in_code" | "outdated" | "suggestion";
  category: "route" | "component" | "entity" | "config" | "general";
  description: string;
  suggestion: string;
}

export interface ContextDiffReport {
  assessedAt: string;
  overallProgress: number;        // 0-100
  progressSummary: string;
  diffs: ContextDiffItem[];
  suggestedContextMerge: any;     // Partial context.json updates
}

// --- Scanner ---

const IGNORE_DIRS = new Set([
  "node_modules", ".next", ".git", "dist", "build", ".turbo",
  ".pnpm-store", "coverage", ".cache", ".vercel", "__pycache__",
]);

const IGNORE_EXTENSIONS = new Set([
  ".png", ".jpg", ".jpeg", ".gif", ".svg", ".ico", ".woff", ".woff2",
  ".ttf", ".eot", ".mp4", ".webm", ".mp3", ".wav", ".pdf", ".lock",
  ".map",
]);

const KEY_FILE_PATTERNS: RegExp[] = [
  /package\.json$/,
  /tsconfig\.json$/,
  /instant\.schema\.(ts|js)$/,
  /instant\.perms\.(ts|js)$/,
  /\.env\.example$/,
  /layout\.(tsx|jsx|ts|js)$/,
  /page\.(tsx|jsx|ts|js)$/,
  /route\.(tsx|jsx|ts|js)$/,
  /schema\.(ts|js|prisma)$/,
  /globals\.css$/,
  /readme\.md$/i,
];

const MAX_FILE_READ_SIZE = 3000; // chars per file
const MAX_KEY_FILES = 30;        // cap to keep prompt manageable
const MAX_TREE_DEPTH = 6;        // don't go too deep

export class ProjectScanner {
  private projectRoot: string;
  private ai: AICore | null = null;

  constructor(projectRoot: string = process.cwd()) {
    this.projectRoot = projectRoot;
  }

  /**
   * Full scan: walk tree + read key files + build snapshot
   */
  async scan(): Promise<ProjectSnapshot> {
    const fileTree: FileEntry[] = [];
    const keyFiles: FileSnippet[] = [];
    const stats = {
      totalFiles: 0,
      totalDirs: 0,
      routeFiles: 0,
      componentFiles: 0,
      apiFiles: 0,
      schemaFiles: 0,
      testFiles: 0,
    };

    // Walk the tree
    await this.walkDirectory("", fileTree, stats, 0);

    // Read key files (truncated)
    for (const entry of fileTree) {
      if (entry.type !== "file") continue;
      if (keyFiles.length >= MAX_KEY_FILES) break;

      const isKeyFile = KEY_FILE_PATTERNS.some((p) => p.test(entry.path));
      if (isKeyFile) {
        const snippet = await this.readFileSnippet(entry.path);
        if (snippet) keyFiles.push(snippet);
      }
    }

    return {
      scannedAt: new Date().toISOString(),
      projectRoot: this.projectRoot,
      fileTree,
      keyFiles,
      stats,
    };
  }

  /**
   * Recursively walk a directory
   */
  private async walkDirectory(
    relativePath: string,
    entries: FileEntry[],
    stats: { totalFiles: number; totalDirs: number; routeFiles: number; componentFiles: number; apiFiles: number; schemaFiles: number; testFiles: number },
    depth: number
  ): Promise<void> {
    if (depth > MAX_TREE_DEPTH) return;

    const fullPath = path.join(this.projectRoot, relativePath);
    let items: string[];
    try {
      items = await fs.readdir(fullPath);
    } catch {
      return;
    }

    for (const item of items) {
      if (IGNORE_DIRS.has(item) && depth < 2) continue;  // Allow nested dirs with same name
      if (item.startsWith(".") && item !== ".env.example") continue;

      const itemRelPath = relativePath ? `${relativePath}/${item}` : item;
      const itemFullPath = path.join(this.projectRoot, itemRelPath);

      let stat: fs.Stats;
      try {
        stat = await fs.stat(itemFullPath);
      } catch {
        continue;
      }

      if (stat.isDirectory()) {
        if (IGNORE_DIRS.has(item)) continue;
        stats.totalDirs++;
        entries.push({ path: itemRelPath, type: "dir" });
        await this.walkDirectory(itemRelPath, entries, stats, depth + 1);
      } else if (stat.isFile()) {
        const ext = path.extname(item);
        if (IGNORE_EXTENSIONS.has(ext)) continue;

        stats.totalFiles++;
        entries.push({
          path: itemRelPath,
          type: "file",
          size: stat.size,
          extension: ext,
        });

        // Categorize
        if (/page\.(tsx|jsx)$/.test(item) || /route\.(tsx|jsx|ts)$/.test(item))
          stats.routeFiles++;
        if (/^[A-Z].*\.(tsx|jsx)$/.test(item))
          stats.componentFiles++;
        if (itemRelPath.includes("/api/"))
          stats.apiFiles++;
        if (/schema|model|entity/i.test(item))
          stats.schemaFiles++;
        if (/\.(test|spec)\.(ts|tsx|js|jsx)$/.test(item))
          stats.testFiles++;
      }
    }
  }

  /**
   * Read a file, truncated to MAX_FILE_READ_SIZE
   */
  private async readFileSnippet(relativePath: string): Promise<FileSnippet | null> {
    try {
      const fullPath = path.join(this.projectRoot, relativePath);
      const content = await fs.readFile(fullPath, "utf-8");
      const lines = content.split("\n").length;
      return {
        path: relativePath,
        content: content.substring(0, MAX_FILE_READ_SIZE),
        lines,
      };
    } catch {
      return null;
    }
  }

  /**
   * Compare a snapshot against context.json and get LLM assessment
   */
  async assessProgress(
    snapshot: ProjectSnapshot,
    existingContext: any
  ): Promise<ContextDiffReport> {
    // Build a compact representation for the LLM
    const treeCompact = snapshot.fileTree
      .filter((f) => f.type === "file")
      .map((f) => f.path)
      .join("\n");

    const keyFilesCompact = snapshot.keyFiles
      .map((f) => `--- ${f.path} (${f.lines} lines) ---\n${f.content}`)
      .join("\n\n");

    const contextStr = JSON.stringify(existingContext, null, 2).substring(0, 5000);

    const prompt = `You are the Living Brain's Assessment Engine for a MyContext-managed project.

TASK: Compare the ACTUAL project file structure against the project's PLANNED context (context.json) and provide a progress assessment.

## ACTUAL FILE STRUCTURE (${snapshot.stats.totalFiles} files, ${snapshot.stats.totalDirs} dirs)
Stats: ${snapshot.stats.routeFiles} route files, ${snapshot.stats.componentFiles} components, ${snapshot.stats.apiFiles} API routes, ${snapshot.stats.schemaFiles} schema files, ${snapshot.stats.testFiles} test files

File tree:
${treeCompact.substring(0, 3000)}

## KEY FILES CONTENT
${keyFilesCompact.substring(0, 4000)}

## PLANNED CONTEXT (context.json)
${contextStr}

## INSTRUCTIONS
Analyze the gap between PLANNED and ACTUAL. Return valid JSON:
{
  "overallProgress": <0-100 int>,
  "progressSummary": "<2-3 sentence summary of current state>",
  "diffs": [
    {
      "type": "missing_in_context" | "missing_in_code" | "outdated" | "suggestion",
      "category": "route" | "component" | "entity" | "config" | "general",
      "description": "<what's missing/outdated>",
      "suggestion": "<concrete fix>"
    }
  ],
  "suggestedContextMerge": {
    // Partial context.json structure with suggested additions/updates
    // Only include NEW items that should be added to context.json
  }
}

Rules:
- "missing_in_context": Code exists but context.json doesn't know about it
- "missing_in_code": context.json plans it but code doesn't have it yet
- "outdated": Code has evolved beyond what context.json describes
- Focus on actionable, specific findings. Max 10 diffs.`;

    try {
      const ai = this.getAICore();
      const report = await ai.generateStructuredText<any>(prompt, "ContextDiffReport");

      return {
        assessedAt: new Date().toISOString(),
        overallProgress: report.overallProgress || 0,
        progressSummary: report.progressSummary || "Assessment complete.",
        diffs: report.diffs || [],
        suggestedContextMerge: report.suggestedContextMerge || {},
      };
    } catch (error: any) {
      return {
        assessedAt: new Date().toISOString(),
        overallProgress: -1,
        progressSummary: `LLM assessment failed: ${error.message}`,
        diffs: [],
        suggestedContextMerge: {},
      };
    }
  }

  /**
   * Display the scan results nicely
   */
  displaySnapshot(snapshot: ProjectSnapshot): void {
    console.log(chalk.cyan("\n┌──────────────────────────────────────────────┐"));
    console.log(chalk.cyan("│") + chalk.bold.white("  📂 Project Scan Results") + " ".repeat(22) + chalk.cyan("│"));
    console.log(chalk.cyan("├──────────────────────────────────────────────┤"));
    console.log(chalk.cyan("│") + chalk.gray(`  Files:      ${String(snapshot.stats.totalFiles).padEnd(6)} Dirs: ${snapshot.stats.totalDirs}`.padEnd(45)) + chalk.cyan("│"));
    console.log(chalk.cyan("│") + chalk.gray(`  Routes:     ${String(snapshot.stats.routeFiles).padEnd(6)} Components: ${snapshot.stats.componentFiles}`.padEnd(45)) + chalk.cyan("│"));
    console.log(chalk.cyan("│") + chalk.gray(`  API Routes: ${String(snapshot.stats.apiFiles).padEnd(6)} Schemas: ${snapshot.stats.schemaFiles}`.padEnd(45)) + chalk.cyan("│"));
    console.log(chalk.cyan("│") + chalk.gray(`  Tests:      ${String(snapshot.stats.testFiles).padEnd(6)}`.padEnd(45)) + chalk.cyan("│"));
    console.log(chalk.cyan("│") + chalk.gray(`  Key Files:  ${snapshot.keyFiles.length} read for analysis`.padEnd(45)) + chalk.cyan("│"));
    console.log(chalk.cyan("└──────────────────────────────────────────────┘"));
  }

  /**
   * Display the diff report nicely
   */
  displayReport(report: ContextDiffReport): void {
    const progressBar = this.makeProgressBar(report.overallProgress, 20);
    
    console.log(chalk.cyan("\n┌──────────────────────────────────────────────┐"));
    console.log(chalk.cyan("│") + chalk.bold.white("  🧠 Context Sync Assessment") + " ".repeat(18) + chalk.cyan("│"));
    console.log(chalk.cyan("├──────────────────────────────────────────────┤"));
    console.log(chalk.cyan("│") + chalk.white(`  Progress: ${progressBar} ${report.overallProgress}%`.padEnd(45)) + chalk.cyan("│"));
    console.log(chalk.cyan("│") + chalk.gray(`  ${report.progressSummary.substring(0, 43)}`.padEnd(45)) + chalk.cyan("│"));
    console.log(chalk.cyan("└──────────────────────────────────────────────┘"));

    if (report.diffs.length > 0) {
      console.log(chalk.yellow(`\n📋 Found ${report.diffs.length} items to sync:\n`));
      for (const diff of report.diffs) {
        const icon = {
          missing_in_context: "🔵",
          missing_in_code: "🔴",
          outdated: "🟡",
          suggestion: "💡",
        }[diff.type];
        console.log(`  ${icon} [${diff.category}] ${diff.description}`);
        console.log(chalk.gray(`     → ${diff.suggestion}\n`));
      }
    }

    if (Object.keys(report.suggestedContextMerge).length > 0) {
      console.log(chalk.green("📦 Suggested context.json merge:"));
      console.log(chalk.gray(JSON.stringify(report.suggestedContextMerge, null, 2).substring(0, 500)));
    }
  }

  /**
   * Get or initialize AICore safely
   */
  private getAICore(): AICore {
    if (this.ai) return this.ai;
    try {
      this.ai = AICore.getInstance();
    } catch {
      this.ai = AICore.getInstance({
        fallbackEnabled: true,
        workingDirectory: this.projectRoot,
      });
    }
    return this.ai;
  }

  private makeProgressBar(percent: number, width: number): string {
    if (percent < 0) return "❌".padEnd(width);
    const filled = Math.round((percent / 100) * width);
    const empty = width - filled;
    return "█".repeat(filled) + "░".repeat(empty);
  }
}
