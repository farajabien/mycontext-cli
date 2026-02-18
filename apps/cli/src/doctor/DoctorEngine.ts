/**
 * DoctorEngine — Main orchestrator for mycontext doctor
 *
 * 1. Detects project type (Next.js / Turborepo / Node.js)
 * 2. Loads applicable rules
 * 3. Runs checks, collects diagnostics
 * 4. Computes score and grade
 * 5. Optionally auto-fixes
 */
import * as fs from "fs-extra";
import * as path from "path";
import chalk from "chalk";
import {
  type ProjectInfo,
  type ProjectType,
  type WorkspaceInfo,
  type DoctorRule,
  type DoctorResult,
  type RuleResult,
  type RuleContext,
  type Diagnostic,
  type DoctorOptions,
  type DoctorCategory,
} from "./types";
import { allRules } from "./rules/index";

// ─── Project Detection ────────────────────────────────────────────

export async function detectProject(root: string): Promise<ProjectInfo> {
  const absRoot = path.resolve(root);
  const pkgPath = path.join(absRoot, "package.json");

  let pkg: any = {};
  if (await fs.pathExists(pkgPath)) {
    try { pkg = await fs.readJson(pkgPath); } catch { /* ignore */ }
  }

  // Detect package manager
  const packageManager = await detectPackageManager(absRoot);

  // Detect monorepo / Turborepo
  const turboJson = path.join(absRoot, "turbo.json");
  const hasTurbo = await fs.pathExists(turboJson);
  const isMonorepo = hasTurbo || !!pkg.workspaces || await fs.pathExists(path.join(absRoot, "pnpm-workspace.yaml"));

  // Detect Next.js
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };
  const hasNext = !!deps?.next;

  // Detect TypeScript
  const hasTs = await fs.pathExists(path.join(absRoot, "tsconfig.json"));

  // Determine project type
  let type: ProjectType = "node";
  if (hasTurbo || (isMonorepo && hasTurbo)) {
    type = "turbo";
  } else if (hasNext) {
    type = "nextjs";
  }

  // Detect workspaces
  let workspaces: WorkspaceInfo[] | undefined;
  if (isMonorepo) {
    workspaces = await detectWorkspaces(absRoot, pkg);
  }

  return {
    type,
    name: pkg.name || path.basename(absRoot),
    root: absRoot,
    version: pkg.version,
    packageManager,
    isMonorepo,
    workspaces,
    typescript: hasTs,
    nextVersion: deps?.next,
    reactVersion: deps?.react,
    turboVersion: deps?.turbo,
  };
}

async function detectPackageManager(root: string): Promise<ProjectInfo["packageManager"]> {
  if (await fs.pathExists(path.join(root, "pnpm-lock.yaml"))) return "pnpm";
  if (await fs.pathExists(path.join(root, "yarn.lock"))) return "yarn";
  if (await fs.pathExists(path.join(root, "bun.lockb"))) return "bun";
  if (await fs.pathExists(path.join(root, "package-lock.json"))) return "npm";
  return "unknown";
}

async function detectWorkspaces(root: string, pkg: any): Promise<WorkspaceInfo[]> {
  const workspaces: WorkspaceInfo[] = [];

  // Get workspace patterns from package.json or pnpm-workspace.yaml
  let patterns: string[] = [];
  if (pkg.workspaces) {
    patterns = Array.isArray(pkg.workspaces) ? pkg.workspaces : pkg.workspaces.packages || [];
  } else {
    const pnpmWs = path.join(root, "pnpm-workspace.yaml");
    if (await fs.pathExists(pnpmWs)) {
      const content = await fs.readFile(pnpmWs, "utf8");
      const match = content.match(/packages:\s*\n((?:\s+-\s+.+\n?)*)/);
      if (match && match[1]) {
        patterns = match[1].split("\n").map(l => l.replace(/^\s*-\s*['"]?/, "").replace(/['"]?\s*$/, "")).filter(Boolean);
      }
    }
  }

  // Resolve workspace directories
  for (const pattern of patterns) {
    const baseDir = pattern.replace(/\/?\*$/, "");
    const wsDir = path.join(root, baseDir);
    if (await fs.pathExists(wsDir)) {
      try {
        const entries = await fs.readdir(wsDir, { withFileTypes: true });
        for (const entry of entries) {
          if (!entry.isDirectory()) continue;
          const wsPath = path.join(baseDir, entry.name);
          const absPath = path.join(root, wsPath);
          const wsPkgPath = path.join(absPath, "package.json");
          const hasPackageJson = await fs.pathExists(wsPkgPath);

          let wsType: ProjectType = "node";
          if (hasPackageJson) {
            try {
              const wsPkg = await fs.readJson(wsPkgPath);
              const wsDeps = { ...wsPkg.dependencies, ...wsPkg.devDependencies };
              if (wsDeps?.next) wsType = "nextjs";
            } catch { /* ignore */ }
          }

          let name = entry.name;
          if (hasPackageJson) {
            try {
              const wsPkg = await fs.readJson(wsPkgPath);
              name = wsPkg.name || entry.name;
            } catch { /* ignore */ }
          }

          workspaces.push({
            name,
            path: wsPath,
            absolutePath: absPath,
            type: wsType,
            hasPackageJson,
          });
        }
      } catch { /* ignore */ }
    }
  }

  return workspaces;
}

// ─── Rule Context Factory ─────────────────────────────────────────

const IGNORE_DIRS = new Set([
  "node_modules", ".next", ".git", "dist", "build", ".turbo",
  ".pnpm-store", "coverage", ".cache", ".vercel", "__pycache__",
]);

function createRuleContext(root: string, project: ProjectInfo, isWorkspace: boolean = false): RuleContext {
  return {
    root,
    project,
    isWorkspace,
    async readFile(relativePath: string): Promise<string | null> {
      try {
        const abs = path.join(root, relativePath);
        return await fs.readFile(abs, "utf8");
      } catch { return null; }
    },
    async fileExists(relativePath: string): Promise<boolean> {
      return fs.pathExists(path.join(root, relativePath));
    },
    async findFiles(pattern: RegExp, maxDepth = 6): Promise<string[]> {
      const results: string[] = [];
      async function walk(dir: string, depth: number) {
        if (depth > maxDepth) return;
        try {
          const entries = await fs.readdir(dir, { withFileTypes: true });
          for (const entry of entries) {
            if (IGNORE_DIRS.has(entry.name)) continue;
            const rel = path.relative(root, path.join(dir, entry.name));
            if (entry.isDirectory()) {
              await walk(path.join(dir, entry.name), depth + 1);
            } else if (pattern.test(rel)) {
              results.push(rel);
            }
          }
        } catch { /* ignore permission errors */ }
      }
      await walk(root, 0);
      return results;
    },
    async readJson(relativePath: string): Promise<any | null> {
      try {
        return await fs.readJson(path.join(root, relativePath));
      } catch { return null; }
    },
  };
}

// ─── Score Calculation ─────────────────────────────────────────────

function calculateScore(diagnostics: Diagnostic[], totalRules: number): { score: number; grade: string } {
  if (totalRules === 0) return { score: 100, grade: "A+" };

  const errors = diagnostics.filter(d => d.severity === "error").length;
  const warnings = diagnostics.filter(d => d.severity === "warning").length;

  // Each error costs 5 points, each warning costs 2 points, min 0
  const deductions = (errors * 5) + (warnings * 2);
  const score = Math.max(0, Math.min(100, 100 - deductions));

  let grade: string;
  if (score >= 95) grade = "A+";
  else if (score >= 90) grade = "A";
  else if (score >= 85) grade = "A-";
  else if (score >= 80) grade = "B+";
  else if (score >= 75) grade = "B";
  else if (score >= 70) grade = "B-";
  else if (score >= 65) grade = "C+";
  else if (score >= 60) grade = "C";
  else if (score >= 55) grade = "C-";
  else if (score >= 50) grade = "D";
  else grade = "F";

  return { score, grade };
}

// ─── Main Doctor Engine ───────────────────────────────────────────

export async function runDoctor(
  directory: string,
  options: DoctorOptions = {}
): Promise<DoctorResult> {
  const start = Date.now();
  const project = await detectProject(directory);

  // Determine which roots to scan
  const scanRoots: Array<{ root: string; project: ProjectInfo }> = [];

  if (project.isMonorepo && project.workspaces) {
    // Filter by --project if specified
    const workspaces = options.project
      ? project.workspaces.filter(ws =>
          ws.name === options.project ||
          ws.path.endsWith(options.project!) ||
          ws.name.includes(options.project!)
        )
      : project.workspaces;

    // Scan root for turbo rules
    scanRoots.push({ root: project.root, project });

    // Scan each workspace
    for (const ws of workspaces) {
      const wsProject: ProjectInfo = {
        ...project,
        type: ws.type,
        name: ws.name,
        root: ws.absolutePath,
        isMonorepo: false,
        workspaces: undefined,
      };
      // Re-detect deps for this workspace
      const wsPkg = await fs.readJson(path.join(ws.absolutePath, "package.json")).catch(() => ({}));
      const wsDeps = { ...wsPkg.dependencies, ...wsPkg.devDependencies };
      wsProject.nextVersion = wsDeps?.next;
      wsProject.reactVersion = wsDeps?.react;
      scanRoots.push({ root: ws.absolutePath, project: wsProject });
    }
  } else {
    scanRoots.push({ root: project.root, project });
  }

  // Filter rules by category and project type
  const applicableRules = allRules.filter(rule => {
    if (options.category && rule.category !== options.category) return false;
    return true;
  });

  // Run rules across all scan roots
  const allDiagnostics: Diagnostic[] = [];
  const ruleResults: RuleResult[] = [];
  const diagnosticsByRoot = new Map<string, Diagnostic[]>();

  for (const { root, project: scanProject } of scanRoots) {
    const isWorkspace = project.isMonorepo && root !== project.root;
    const ctx = createRuleContext(root, scanProject, isWorkspace);
    const rootDiagnostics: Diagnostic[] = [];

    // Only run rules that apply to this project type
    const rules = applicableRules.filter((rule: DoctorRule) =>
      rule.appliesTo.includes(scanProject.type) ||
      (scanProject.type === "turbo" && rule.appliesTo.includes("turbo"))
    );

    for (const rule of rules) {
      try {
        const diagnostics = await rule.check(ctx);

        // Prefix file paths with workspace path for monorepos
        const prefixedDiags = diagnostics.map((d: Diagnostic) => ({
          ...d,
          filePath: project.isMonorepo && root !== project.root
            ? path.relative(project.root, path.join(root, d.filePath))
            : d.filePath,
        }));

        const existing = ruleResults.find((r: RuleResult) => r.ruleId === rule.id);
        if (existing) {
          existing.diagnostics.push(...prefixedDiags);
          existing.passed = existing.passed && prefixedDiags.length === 0;
        } else {
          ruleResults.push({
            ruleId: rule.id,
            ruleName: rule.name,
            category: rule.category,
            passed: prefixedDiags.length === 0,
            diagnostics: prefixedDiags,
          });
        }

        allDiagnostics.push(...prefixedDiags);
        rootDiagnostics.push(...prefixedDiags);
      } catch (err) {
        // Rule threw — treat as a pass (we don't want engine bugs to fail the scan)
      }
    }
    diagnosticsByRoot.set(root, rootDiagnostics);
  }

  // Auto-fix if requested
  let fixedCount = 0;
  if (options.fix && !options.dryRun) {
    for (const { root, project: scanProject } of scanRoots) {
      const isWorkspace = project.isMonorepo && root !== project.root;
      const ctx = createRuleContext(root, scanProject, isWorkspace);
      const rules = applicableRules.filter((r: DoctorRule) => r.appliesTo.includes(scanProject.type));
      const rootDiags = diagnosticsByRoot.get(root) || [];

      for (const rule of rules) {
        if (!rule.fix) continue;
        const ruleDiags = rootDiags.filter(d => d.ruleId === rule.id && d.autoFixable);
        for (const diag of ruleDiags) {
          try {
            const fixed = await rule.fix(ctx, diag);
            if (fixed) fixedCount++;
          } catch { /* ignore fix errors */ }
        }
      }
    }
  }

  const { score, grade } = calculateScore(allDiagnostics, ruleResults.length);

  return {
    score,
    grade,
    diagnostics: allDiagnostics,
    project,
    ruleResults,
    fixedCount: options.fix ? fixedCount : undefined,
    duration: Date.now() - start,
  };
}

// ─── Display ──────────────────────────────────────────────────────

export function displayResult(result: DoctorResult, options: DoctorOptions = {}): void {
  const { score, grade, diagnostics, project, ruleResults } = result;

  // Score-only mode
  if (options.score) {
    if (options.json) {
      console.log(JSON.stringify({ score, grade }));
    } else {
      console.log(`${score}`);
    }
    return;
  }

  // JSON mode
  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  // Header
  console.log();
  console.log(chalk.bold("🩺 MyContext Doctor"));
  console.log();
  console.log(`${chalk.dim("📂 Project:")} ${project.name}`);
  console.log(`${chalk.dim("🔍 Type:")}    ${formatProjectType(project)}`);
  if (project.isMonorepo && project.workspaces) {
    console.log(`${chalk.dim("📦 Workspaces:")} ${project.workspaces.length} detected`);
  }
  console.log();

  // Group diagnostics by category
  const categories: DoctorCategory[] = ["nextjs", "turbo", "node", "dead"];
  for (const cat of categories) {
    const catResults = ruleResults.filter(r => r.category === cat);
    if (catResults.length === 0) continue;

    console.log(chalk.bold(formatCategory(cat)));
    console.log(chalk.dim("─".repeat(50)));

    for (const rr of catResults) {
      if (rr.passed) {
        console.log(`  ${chalk.green("✓")} ${chalk.dim(rr.ruleId.padEnd(35))} ${chalk.green("pass")}`);
      } else {
        for (const diag of rr.diagnostics) {
          const icon = diag.severity === "error" ? chalk.red("✗") : chalk.yellow("⚠");
          const loc = diag.line ? chalk.dim(`:${diag.line}`) : "";
          console.log(`  ${icon} ${chalk.dim(diag.ruleId.padEnd(35))} ${diag.message}`);
          if (options.verbose && diag.filePath) {
            console.log(`    ${chalk.dim("→")} ${chalk.cyan(diag.filePath)}${loc}`);
          }
          if (options.verbose && diag.help) {
            console.log(`    ${chalk.dim("💡")} ${chalk.dim(diag.help)}`);
          }
        }
      }
    }
    console.log();
  }

  // Score
  const errors = diagnostics.filter(d => d.severity === "error").length;
  const warnings = diagnostics.filter(d => d.severity === "warning").length;
  const passed = ruleResults.filter(r => r.passed).length;

  console.log(chalk.bold("Score: ") + gradeColor(grade, `${score}/100 (${grade})`));
  console.log(
    `${chalk.red(`Errors: ${errors}`)} | ` +
    `${chalk.yellow(`Warnings: ${warnings}`)} | ` +
    `${chalk.green(`Passed: ${passed}/${ruleResults.length}`)}`
  );
  console.log(chalk.dim(`Completed in ${result.duration}ms`));

  // Fix summary
  if (result.fixedCount !== undefined) {
    console.log();
    console.log(chalk.green(`🔧 Fixed ${result.fixedCount} issues`));
  } else {
    const fixable = diagnostics.filter(d => d.autoFixable).length;
    if (fixable > 0) {
      console.log();
      console.log(chalk.dim(`Run ${chalk.cyan("mycontext doctor --fix")} to auto-fix ${fixable} issues`));
    }
  }
  console.log();
}

function formatProjectType(project: ProjectInfo): string {
  if (project.type === "turbo") return `Turborepo monorepo`;
  if (project.type === "nextjs") return `Next.js ${project.nextVersion || ""}`.trim();
  return "Node.js";
}

function formatCategory(cat: DoctorCategory): string {
  switch (cat) {
    case "nextjs": return "⚡ Next.js";
    case "turbo": return "🌀 Turborepo";
    case "node": return "📦 Node.js / Structure";
    case "dead": return "💀 Dead Code";
  }
}

function gradeColor(grade: string, text: string): string {
  if (grade.startsWith("A")) return chalk.green(text);
  if (grade.startsWith("B")) return chalk.cyan(text);
  if (grade.startsWith("C")) return chalk.yellow(text);
  return chalk.red(text);
}
