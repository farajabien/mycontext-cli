/**
 * ContextSyncer — Autonomous context.json + README updater
 * 
 * The "self-recontextualization" engine:
 * 1. Scan the real project (via ProjectScanner)
 * 2. LLM assesses drift between code and context.json
 * 3. Deep merge suggestions into context.json
 * 4. LLM generates README content from updated context
 * 5. Write both files
 */
import * as fs from "fs-extra";
import * as path from "path";
import chalk from "chalk";
import { ProjectScanner, ContextDiffReport, ProjectSnapshot } from "./ProjectScanner";
import { AICore } from "../core/ai/AICore";
import { deepMerge } from "../utils/deepMerge";
import { UnifiedContext, getContextSummary } from "../types/unified-context";

export interface SyncResult {
  contextUpdated: boolean;
  readmeUpdated: boolean;
  report: ContextDiffReport | null;
  contextDiff: string;    // Human-readable diff summary
  readmeDiff: string;     // Human-readable diff summary
}

export class ContextSyncer {
  private projectRoot: string;
  private scanner: ProjectScanner;

  constructor(projectRoot: string = process.cwd()) {
    this.projectRoot = projectRoot;
    this.scanner = new ProjectScanner(projectRoot);
  }

  /**
   * Sync everything: context.json + README
   */
  async syncAll(options: { dryRun?: boolean } = {}): Promise<SyncResult> {
    console.log(chalk.blue("📂 Scanning project structure...\n"));
    const snapshot = await this.scanner.scan();
    this.scanner.displaySnapshot(snapshot);

    const contextResult = await this.syncContext(snapshot, options);
    const readmeResult = await this.syncReadme(options);

    return {
      contextUpdated: contextResult.contextUpdated,
      readmeUpdated: readmeResult.readmeUpdated,
      report: contextResult.report,
      contextDiff: contextResult.contextDiff,
      readmeDiff: readmeResult.readmeDiff,
    };
  }

  /**
   * Sync context.json: scan → assess → deep merge
   */
  async syncContext(
    snapshot?: ProjectSnapshot,
    options: { dryRun?: boolean } = {}
  ): Promise<{ contextUpdated: boolean; report: ContextDiffReport | null; contextDiff: string }> {
    const contextPath = path.join(this.projectRoot, ".mycontext", "context.json");

    // Load existing context
    let existingContext: UnifiedContext = {};
    try {
      if (await fs.pathExists(contextPath)) {
        existingContext = await fs.readJson(contextPath);
      }
    } catch {
      // Start fresh if corrupted
    }

    // Scan if not provided
    if (!snapshot) {
      snapshot = await this.scanner.scan();
    }

    // Assess via LLM
    console.log(chalk.blue("\n🧠 Assessing progress against Living Brain...\n"));
    const report = await this.scanner.assessProgress(snapshot, existingContext);
    this.scanner.displayReport(report);

    if (report.overallProgress < 0) {
      return { contextUpdated: false, report, contextDiff: "LLM assessment failed" };
    }

    // Deep merge suggestions
    const hasMerge = Object.keys(report.suggestedContextMerge).length > 0;
    if (!hasMerge) {
      return { contextUpdated: false, report, contextDiff: "No changes suggested" };
    }

    const merged = deepMerge(existingContext, report.suggestedContextMerge);

    // Update scan memory
    if (!merged.brain) merged.brain = {};
    if (!merged.brain.memory) merged.brain.memory = {};
    merged.brain.memory.lastSync = {
      syncedAt: new Date().toISOString(),
      totalFiles: snapshot.stats.totalFiles,
      totalDirs: snapshot.stats.totalDirs,
      overallProgress: report.overallProgress,
      diffsFound: report.diffs.length,
    };

    const diffSummary = report.diffs
      .map((d) => `  ${d.type === "missing_in_context" ? "+" : d.type === "missing_in_code" ? "-" : "~"} [${d.category}] ${d.description}`)
      .join("\n");

    if (options.dryRun) {
      console.log(chalk.yellow("\n🔍 DRY RUN — would apply these changes:"));
      console.log(chalk.gray(diffSummary));
      return { contextUpdated: false, report, contextDiff: diffSummary };
    }

    // Write
    await fs.ensureDir(path.dirname(contextPath));
    await fs.writeJson(contextPath, merged, { spaces: 2 });
    console.log(chalk.green("✅ context.json updated via deep merge!"));

    return { contextUpdated: true, report, contextDiff: diffSummary };
  }

  /**
   * Sync README: read context.json → LLM generate section → write between markers
   */
  async syncReadme(options: { dryRun?: boolean } = {}): Promise<{ readmeUpdated: boolean; readmeDiff: string }> {
    const readmePath = path.join(this.projectRoot, "README.md");
    const contextPath = path.join(this.projectRoot, ".mycontext", "context.json");

    if (!(await fs.pathExists(readmePath))) {
      return { readmeUpdated: false, readmeDiff: "No README.md found" };
    }
    if (!(await fs.pathExists(contextPath))) {
      return { readmeUpdated: false, readmeDiff: "No context.json found" };
    }

    const readme = await fs.readFile(readmePath, "utf-8");
    const context: UnifiedContext = await fs.readJson(contextPath);
    const summary = getContextSummary(context);

    const START_MARKER = "<!-- mycontext:start -->";
    const END_MARKER = "<!-- mycontext:end -->";

    const startIdx = readme.indexOf(START_MARKER);
    const endIdx = readme.indexOf(END_MARKER);

    if (startIdx === -1 || endIdx === -1) {
      console.log(chalk.yellow("⚠️  No MyContext markers in README. Add these to enable auto-sync:"));
      console.log(chalk.cyan(`   ${START_MARKER}`));
      console.log(chalk.cyan(`   ${END_MARKER}`));
      return { readmeUpdated: false, readmeDiff: "No markers found in README" };
    }

    // Generate content via LLM
    const ai = this.getAICore();
    const prompt = `Generate a concise, well-formatted markdown section for a README based on this project context:

Project: ${summary.name}
Description: ${summary.description}
${summary.entities.length > 0 ? `Entities: ${summary.entities.join(", ")}` : ""}
${summary.routes.length > 0 ? `Routes: ${summary.routes.join(", ")}` : ""}
${summary.roles.length > 0 ? `Roles: ${summary.roles.join(", ")}` : ""}
${summary.components.length > 0 ? `Components: ${summary.components.map((c) => c.name).join(", ")}` : ""}
${summary.checkpoints.length > 0 ? `Milestones: ${summary.checkpoints.map((c) => `${c.label} (${c.status})`).join(", ")}` : ""}
${summary.capabilities.length > 0 ? `Capabilities: ${summary.capabilities.join(", ")}` : ""}
${context.project?.techStack ? `Tech Stack: ${context.project.techStack.join(", ")}` : ""}

Architecture type: ${context.architecture?.type || context.project?.type || "unknown"}
${context.architecture?.packages ? `Packages: ${Object.keys(context.architecture.packages).join(", ")}` : ""}

Return ONLY the markdown content (no fences). Include sections:
- Brief overview
- Architecture/tech stack
- Key features/capabilities
- Project status (based on checkpoints)

Keep it concise — max 30 lines. Use emojis sparingly.`;

    try {
      let newContent = await ai.generateText(prompt);
      newContent = newContent.replace(/^```[a-z]*\n?/gm, "").replace(/```$/gm, "").trim();

      const before = readme.substring(0, startIdx + START_MARKER.length);
      const after = readme.substring(endIdx);
      const updated = `${before}\n\n${newContent}\n\n${after}`;

      if (options.dryRun) {
        console.log(chalk.yellow("\n🔍 DRY RUN — README would be updated with:"));
        console.log(chalk.gray(newContent.substring(0, 300) + "..."));
        return { readmeUpdated: false, readmeDiff: newContent.substring(0, 200) };
      }

      await fs.writeFile(readmePath, updated, "utf-8");
      console.log(chalk.green("✅ README.md updated between markers!"));
      return { readmeUpdated: true, readmeDiff: `Updated ${newContent.split("\n").length} lines` };
    } catch (error: any) {
      console.log(chalk.red(`❌ README sync failed: ${error.message}`));
      return { readmeUpdated: false, readmeDiff: `Error: ${error.message}` };
    }
  }

  private getAICore(): AICore {
    try {
      return AICore.getInstance();
    } catch {
      return AICore.getInstance({
        fallbackEnabled: true,
        workingDirectory: this.projectRoot,
      });
    }
  }
}
