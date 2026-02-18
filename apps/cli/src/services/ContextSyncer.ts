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
    
    // Construct a richer prompt that encourages specificity
    const prompt = `Generate a concise, professional markdown section for a README based on this project context.
    
CONTEXT:
Project Name: ${summary.name}
Description: ${summary.description || "A modern web application"}
Entities: ${summary.entities.length > 0 ? summary.entities.join(", ") : "User, Project"}
Routes: ${summary.routes.length > 0 ? summary.routes.join(", ") : "Dashboard, Profile, Settings"}
Capabilities: ${summary.capabilities.length > 0 ? summary.capabilities.join(", ") : "Authentication, Data Management"}
Tech Stack: ${context.project?.techStack ? context.project.techStack.join(", ") : "Next.js, TypeScript, Tailwind CSS"}

INSTRUCTIONS:
1. Write a 3-section summary: Overview, Key Features, Tech Stack.
2. DO NOT use placeholders like "[Insert text here]" or "[Unknown]". If a detail is missing, infer it from the context or generic web app standards (e.g., "Built with modern web technologies").
3. Make it sound professional and "shipped".
4. Return ONLY the markdown content (no fences).

Example format:
## Overview
[Concise description of what the app does]

## Key Features
- **Feature 1**: Description
- **Feature 2**: Description

## Tech Stack
- Stack item 1
- Stack item 2
`;

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

  /**
   * Sync everything: context.json + README
   */
  async syncAll(options: { dryRun?: boolean } = {}): Promise<SyncResult> {
    console.log(chalk.blue("📂 Scanning project structure...\n"));
    const snapshot = await this.scanner.scan();
    this.scanner.displaySnapshot(snapshot);

    const contextResult = await this.syncContext(snapshot, options);
    const readmeResult = await this.syncReadme(options);

    // Add explicit next steps for the user
    console.log(chalk.cyan("\n🚀 Next Steps:"));
    if (contextResult.report && contextResult.report.diffs.length > 0) {
        console.log(chalk.white("  • Review the sync suggestions above."));
        console.log(chalk.white("  • Run 'mycontext generate context' to refine the Living Brain further."));
    } else {
        console.log(chalk.white("  • Your context is in sync! You can now start building features."));
        console.log(chalk.white("  • Try: mycontext agent \"add a blog page\""));
    }

    return {
      contextUpdated: contextResult.contextUpdated,
      readmeUpdated: readmeResult.readmeUpdated,
      report: contextResult.report,
      contextDiff: contextResult.contextDiff,
      readmeDiff: readmeResult.readmeDiff,
    };
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
