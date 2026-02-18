/**
 * Node.js / Structure Rules — General project health checks
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

const singleLockFile: DoctorRule = {
  id: "node/single-lock-file",
  name: "Single Lock File",
  category: "node",
  severity: "error",
  description: "Project should have only one package manager lock file",
  help: "Delete the extra lock files and stick to one package manager",
  appliesTo: ["node", "nextjs", "turbo"],
  async check(ctx) {
    const results: Diagnostic[] = [];
    if (ctx.isWorkspace) return results; // Lock file belongs in root
    const lockFiles = [
      { file: "package-lock.json", pm: "npm" },
      { file: "yarn.lock", pm: "yarn" },
      { file: "pnpm-lock.yaml", pm: "pnpm" },
      { file: "bun.lockb", pm: "bun" },
    ];

    const found: string[] = [];
    for (const lf of lockFiles) {
      if (await ctx.fileExists(lf.file)) found.push(lf.file);
    }

    if (found.length > 1) {
      const firstFound = found[0];
      if (firstFound) {
        results.push(diag(this, firstFound,
          `Multiple lock files found: ${found.join(", ")}`,
          { autoFixable: true, help: "Keep only the one matching your package manager" }
        ));
      }
    } else if (found.length === 0) {
      results.push(diag(this, "package.json",
        "No lock file found — run your package manager's install",
        { help: `Run \`${ctx.project.packageManager} install\` to generate a lock file` }
      ));
    }
    return results;
  },
};

const noNestedNodeModules: DoctorRule = {
  id: "node/no-nested-node-modules",
  name: "No Nested node_modules",
  category: "node",
  severity: "warning",
  description: "Nested node_modules directories can cause dependency resolution issues",
  help: "Remove nested node_modules and use workspace hoisting",
  appliesTo: ["node", "nextjs", "turbo"],
  async check(ctx) {
    const results: Diagnostic[] = [];

    // Check common nested locations
    const suspectDirs = await ctx.findFiles(/node_modules\/.*\/node_modules/);
    // findFiles looks at files, so let's check dirs manually
    const commonNested = ["src/node_modules", "lib/node_modules", "app/node_modules"];
    for (const nested of commonNested) {
      if (await ctx.fileExists(nested)) {
        results.push(diag(this, nested, `Nested node_modules at ${nested}`, {
          autoFixable: true,
          help: "Delete this directory — it was likely created by accident"
        }));
      }
    }
    return results;
  },
};

const tsconfigStrict: DoctorRule = {
  id: "node/tsconfig-strict",
  name: "TypeScript Strict Mode",
  category: "node",
  severity: "warning",
  description: "TypeScript strict mode catches more bugs at compile time",
  help: 'Enable "strict": true in tsconfig.json compilerOptions',
  appliesTo: ["node", "nextjs"],
  async check(ctx) {
    const results: Diagnostic[] = [];
    if (!ctx.project.typescript) return results;

    const tsconfig = await ctx.readJson("tsconfig.json");
    if (!tsconfig) return results;

    if (!tsconfig.compilerOptions?.strict) {
      results.push(diag(this, "tsconfig.json", "TypeScript strict mode is disabled", {
        autoFixable: true,
      }));
    }
    return results;
  },
};

const enginesField: DoctorRule = {
  id: "node/engines-field",
  name: "Engines Field",
  category: "node",
  severity: "warning",
  description: "package.json should specify Node.js engine version for consistency",
  help: 'Add "engines": { "node": ">=18" } to package.json',
  appliesTo: ["node", "nextjs", "turbo"],
  async check(ctx) {
    const results: Diagnostic[] = [];
    const pkg = await ctx.readJson("package.json");
    if (!pkg) return results;

    if (!pkg.engines?.node) {
      results.push(diag(this, "package.json", "Missing engines.node field", {
        autoFixable: true,
      }));
    }
    return results;
  },
  async fix(ctx, d) {
    const pkg = await ctx.readJson("package.json");
    if (!pkg) return false;
    pkg.engines = { ...pkg.engines, node: ">=18" };
    const { writeJson } = await import("fs-extra");
    await writeJson(path.join(ctx.root, "package.json"), pkg, { spaces: 2 });
    return true;
  },
};

const gitignoreComplete: DoctorRule = {
  id: "structure/gitignore",
  name: "Complete .gitignore",
  category: "node",
  severity: "warning",
  description: ".gitignore should cover common patterns",
  help: "Add missing entries to .gitignore",
  appliesTo: ["node", "nextjs", "turbo"],
  async check(ctx) {
    const results: Diagnostic[] = [];
    if (ctx.isWorkspace) return results; // .gitignore belongs in root
    const content = await ctx.readFile(".gitignore");

    if (!content) {
      results.push(diag(this, ".gitignore", "No .gitignore file found", {
        autoFixable: true,
      }));
      return results;
    }

    const requiredPatterns = [
      { pattern: "node_modules", label: "node_modules" },
      { pattern: ".env", label: ".env files" },
    ];

    // Add Next.js-specific patterns
    if (ctx.project.type === "nextjs") {
      requiredPatterns.push({ pattern: ".next", label: ".next build dir" });
    }

    for (const { pattern, label } of requiredPatterns) {
      if (!content.includes(pattern)) {
        results.push(diag(this, ".gitignore", `Missing ${label} pattern in .gitignore`, {
          autoFixable: true,
        }));
      }
    }
    return results;
  },
};

const envExample: DoctorRule = {
  id: "structure/env-example",
  name: "Environment Example",
  category: "node",
  severity: "warning",
  description: "If .env exists, .env.example should too for team onboarding",
  help: "Create .env.example with placeholder values for all env vars",
  appliesTo: ["node", "nextjs"],
  async check(ctx) {
    const results: Diagnostic[] = [];

    const envFiles = [".env", ".env.local"];
    let hasEnv = false;
    for (const ef of envFiles) {
      if (await ctx.fileExists(ef)) { hasEnv = true; break; }
    }

    if (hasEnv) {
      const hasExample = await ctx.fileExists(".env.example") ||
        await ctx.fileExists(".env.local.example");
      if (!hasExample) {
        results.push(diag(this, ".env.example",
          "Has .env but no .env.example — teammates won't know which vars are needed"
        ));
      }
    }
    return results;
  },
};

const noUnusedDeps: DoctorRule = {
  id: "node/unused-deps",
  name: "No Unused Dependencies",
  category: "node",
  severity: "warning",
  description: "Dependencies in package.json should be actually imported in code",
  help: "Remove unused dependencies with 'npm uninstall <pkg>'",
  appliesTo: ["node", "nextjs"],
  async check(ctx) {
    const results: Diagnostic[] = [];
    const pkg = await ctx.readJson("package.json");
    if (!pkg?.dependencies) return results;

    // Skip common deps that are used implicitly
    const implicitDeps = new Set([
      "typescript", "@types/node", "@types/react", "@types/react-dom",
      "eslint", "prettier", "tailwindcss", "postcss", "autoprefixer",
      "next", "react", "react-dom", "turbo", "@next/font",
      "encoding", "bufferutil", "utf-8-validate",
    ]);

    const allSourceFiles = await ctx.findFiles(/\.(ts|tsx|js|jsx|mjs|cjs)$/);
    // Read up to 200 source files to check imports
    const filesToCheck = allSourceFiles.slice(0, 200);
    let allContent = "";
    for (const f of filesToCheck) {
      const content = await ctx.readFile(f);
      if (content) allContent += content + "\n";
    }

    const unused: string[] = [];
    for (const dep of Object.keys(pkg.dependencies)) {
      if (implicitDeps.has(dep)) continue;
      // Check if dep name appears anywhere in source (lazy but effective)
      const depBase = dep.startsWith("@") ? dep : dep.split("/")[0];
      if (!allContent.includes(`"${depBase}"`) &&
          !allContent.includes(`'${depBase}'`) &&
          !allContent.includes(`from "${depBase}`) &&
          !allContent.includes(`from '${depBase}`) &&
          !allContent.includes(`require("${depBase}`) &&
          !allContent.includes(`require('${depBase}`)) {
        unused.push(dep);
      }
    }

    if (unused.length > 0) {
      results.push(diag(this, "package.json",
        `${unused.length} potentially unused deps: ${unused.slice(0, 5).join(", ")}${unused.length > 5 ? "..." : ""}`,
        { help: `Check: ${unused.join(", ")}` }
      ));
    }
    return results;
  },
};

export const nodeRules: DoctorRule[] = [
  singleLockFile,
  noNestedNodeModules,
  tsconfigStrict,
  enginesField,
  gitignoreComplete,
  envExample,
  noUnusedDeps,
];
