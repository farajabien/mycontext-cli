/**
 * Turborepo Rules — Best practice checks for Turborepo monorepos
 */
import * as path from "path";
import type { DoctorRule, RuleContext, Diagnostic } from "../types";

function diag(
  rule: DoctorRule,
  filePath: string,
  message: string,
  opts: { line?: number; autoFixable?: boolean; help?: string } = {}
): Diagnostic {
  return {
    ruleId: rule.id,
    filePath,
    line: opts.line,
    severity: rule.severity,
    message,
    help: opts.help || rule.help,
    autoFixable: opts.autoFixable ?? false,
  };
}

// ─── Rules ────────────────────────────────────────────────────────

const hasTurboJson: DoctorRule = {
  id: "turbo/has-turbo-json",
  name: "Has turbo.json",
  category: "turbo",
  severity: "error",
  description: "Turborepo projects must have a turbo.json configuration",
  help: "Create turbo.json with pipeline configuration at the project root",
  appliesTo: ["turbo"],
  async check(ctx) {
    const results: Diagnostic[] = [];
    if (!(await ctx.fileExists("turbo.json"))) {
      results.push(diag(this, "turbo.json", "Missing turbo.json configuration"));
    }
    return results;
  },
};

const workspaceDeps: DoctorRule = {
  id: "turbo/workspace-deps",
  name: "Workspace Protocol",
  category: "turbo",
  severity: "warning",
  description: "Workspace packages should use workspace:* protocol for internal deps",
  help: "Use \"workspace:*\" for local package dependencies instead of version numbers",
  appliesTo: ["turbo"],
  async check(ctx) {
    const results: Diagnostic[] = [];
    if (!ctx.project.workspaces) return results;

    // Get all workspace package names
    const wsNames = new Set(ctx.project.workspaces.map(ws => ws.name));

    for (const ws of ctx.project.workspaces) {
      const pkgPath = path.join(ws.path, "package.json");
      const pkg = await ctx.readJson(pkgPath);
      if (!pkg) continue;

      const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
      for (const [dep, version] of Object.entries(allDeps)) {
        if (wsNames.has(dep) && typeof version === "string" && !version.startsWith("workspace:")) {
          results.push(diag(this, pkgPath,
            `${dep} should use "workspace:*" instead of "${version}"`,
            { autoFixable: true }
          ));
        }
      }
    }
    return results;
  },
};

const sharedTsConfig: DoctorRule = {
  id: "turbo/shared-tsconfig",
  name: "Shared TypeScript Config",
  category: "turbo",
  severity: "warning",
  description: "Workspace packages should extend a shared tsconfig",
  help: "Create a shared tsconfig.base.json at root and have workspaces extend it",
  appliesTo: ["turbo"],
  async check(ctx) {
    const results: Diagnostic[] = [];
    const hasBase = await ctx.fileExists("tsconfig.json") ||
      await ctx.fileExists("tsconfig.base.json");
    if (!hasBase) return results;

    if (!ctx.project.workspaces) return results;

    for (const ws of ctx.project.workspaces) {
      const tsPath = path.join(ws.path, "tsconfig.json");
      const content = await ctx.readFile(tsPath);
      if (!content) continue;

      if (!content.includes('"extends"')) {
        results.push(diag(this, tsPath,
          `${ws.name} tsconfig doesn't extend a shared base config`
        ));
      }
    }
    return results;
  },
};

const noRootAppDeps: DoctorRule = {
  id: "turbo/no-root-app-deps",
  name: "No Root App Dependencies",
  category: "turbo",
  severity: "warning",
  description: "Root package.json should only have devDependencies, not app-level deps",
  help: "Move application dependencies to workspace packages, keep only tooling in root",
  appliesTo: ["turbo"],
  async check(ctx) {
    const results: Diagnostic[] = [];
    const pkg = await ctx.readJson("package.json");
    if (!pkg?.dependencies) return results;

    // Common root-level deps that are fine
    const allowedRootDeps = new Set(["turbo", "typescript"]);
    const appDeps = Object.keys(pkg.dependencies).filter(d => !allowedRootDeps.has(d));

    if (appDeps.length > 0) {
      results.push(diag(this, "package.json",
        `Root has ${appDeps.length} application dependencies: ${appDeps.slice(0, 5).join(", ")}${appDeps.length > 5 ? "..." : ""}`,
        { help: "Move these to workspace packages; root should only have devDependencies" }
      ));
    }
    return results;
  },
};

const pipelineCoverage: DoctorRule = {
  id: "turbo/pipeline-coverage",
  name: "Pipeline Coverage",
  category: "turbo",
  severity: "warning",
  description: "All workspace scripts should be covered in turbo.json pipeline",
  help: "Add missing tasks to turbo.json to benefit from caching",
  appliesTo: ["turbo"],
  async check(ctx) {
    const results: Diagnostic[] = [];
    const turboConfig = await ctx.readJson("turbo.json");
    if (!turboConfig) return results;

    // Turbo v2 uses "tasks", v1 uses "pipeline"
    const pipeline = turboConfig.tasks || turboConfig.pipeline || {};
    const pipelineKeys = new Set(Object.keys(pipeline));

    if (!ctx.project.workspaces) return results;

    // Collect all unique script names across workspaces
    const allScripts = new Set<string>();
    for (const ws of ctx.project.workspaces) {
      const pkg = await ctx.readJson(path.join(ws.path, "package.json"));
      if (pkg?.scripts) {
        Object.keys(pkg.scripts).forEach(s => allScripts.add(s));
      }
    }

    // Common scripts that should be in pipeline
    const importantScripts = ["build", "test", "lint", "dev"];
    for (const script of importantScripts) {
      if (allScripts.has(script) && !pipelineKeys.has(script)) {
        results.push(diag(this, "turbo.json",
          `Script "${script}" exists in workspaces but not in turbo pipeline`
        ));
      }
    }
    return results;
  },
};

const workspaceNaming: DoctorRule = {
  id: "turbo/workspace-naming",
  name: "Consistent Workspace Naming",
  category: "turbo",
  severity: "warning",
  description: "Workspace packages should use consistent naming (e.g. @scope/name)",
  help: "Use @org/package-name format for workspace packages",
  appliesTo: ["turbo"],
  async check(ctx) {
    const results: Diagnostic[] = [];
    if (!ctx.project.workspaces || ctx.project.workspaces.length < 2) return results;

    const scoped = ctx.project.workspaces.filter(ws => ws.name.startsWith("@"));
    const unscoped = ctx.project.workspaces.filter(ws => !ws.name.startsWith("@"));

    // If some are scoped and some aren't, warn about inconsistency
    if (scoped.length > 0 && unscoped.length > 0) {
      for (const ws of unscoped) {
        results.push(diag(this, path.join(ws.path, "package.json"),
          `${ws.name} is not scoped — other packages use @scope/name format`
        ));
      }
    }
    return results;
  },
};

export const turboRules: DoctorRule[] = [
  hasTurboJson,
  workspaceDeps,
  sharedTsConfig,
  noRootAppDeps,
  pipelineCoverage,
  workspaceNaming,
];
