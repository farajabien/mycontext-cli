/**
 * Dead Code Rules — Find unused exports, orphan files, unused components
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

const orphanFiles: DoctorRule = {
  id: "dead/orphan-files",
  name: "Orphan Files",
  category: "dead",
  severity: "warning",
  description: "Files not imported by any other file in the project",
  help: "Delete orphan files or import them where needed",
  appliesTo: ["node", "nextjs"],
  async check(ctx) {
    const results: Diagnostic[] = [];

    // Find all .ts/.tsx/.js/.jsx files
    const allFiles = await ctx.findFiles(/\.(ts|tsx|js|jsx)$/);
    if (allFiles.length === 0) return results;

    // Build import graph
    const importedFiles = new Set<string>();

    // Files that are entry points (not expected to be imported)
    const entryPatterns = [
      /page\.(tsx|jsx|ts|js)$/,
      /layout\.(tsx|jsx|ts|js)$/,
      /route\.(tsx|jsx|ts|js)$/,
      /loading\.(tsx|jsx|ts|js)$/,
      /error\.(tsx|jsx|ts|js)$/,
      /not-found\.(tsx|jsx|ts|js)$/,
      /middleware\.(ts|js)$/,
      /\bindex\.(ts|tsx|js|jsx)$/,
      /\.config\.(ts|js|mjs|cjs)$/,
      /\.test\.(ts|tsx|js|jsx)$/,
      /\.spec\.(ts|tsx|js|jsx)$/,
      /cli\.(ts|js)$/,
    ];

    for (const f of allFiles) {
      const content = await ctx.readFile(f);
      if (!content) continue;

      // Find import/require statements
      const importRegex = /(?:import|require)\s*\(?['"]([^'"]+)['"]\)?/g;
      const exportFromRegex = /export\s+.*\s+from\s+['"]([^'"]+)['"]/g;
      let match;

      const processImport = (importPath: string) => {
        if (importPath.startsWith(".")) {
          // Resolve relative import to actual file
          const dir = path.dirname(f);
          const resolved = path.join(dir, importPath);

          // Try common extensions
          const extensions = ["", ".ts", ".tsx", ".js", ".jsx", "/index.ts", "/index.tsx", "/index.js"];
          for (const ext of extensions) {
            const candidate = resolved + ext;
            // Normalize path
            const normalized = path.normalize(candidate);
            importedFiles.add(normalized);
          }
        }
      };

      while ((match = importRegex.exec(content)) !== null) {
        const m = match[1];
        if (m) processImport(m);
      }
      while ((match = exportFromRegex.exec(content)) !== null) {
        const m = match[1];
        if (m) processImport(m);
      }
    }

    // Find orphans
    const orphans: string[] = [];
    for (const f of allFiles) {
      // Skip entry points
      if (entryPatterns.some(p => p.test(f))) continue;
      // Skip if the file (without extension) is in the imported set
      const withoutExt = f.replace(/\.(ts|tsx|js|jsx)$/, "");
      const normalized = path.normalize(f);
      const normalizedWithout = path.normalize(withoutExt);

      const isImported = importedFiles.has(normalized) ||
        importedFiles.has(normalizedWithout) ||
        importedFiles.has(normalizedWithout + "/index");

      if (!isImported) {
        orphans.push(f);
      }
    }

    // Only report if we found a reasonable number of orphans (< 30% of files)
    // Otherwise, the detection is probably incomplete
    if (orphans.length > 0 && orphans.length < allFiles.length * 0.3) {
      for (const orphan of orphans.slice(0, 20)) { // cap at 20 to avoid noise
        results.push(diag(this, orphan, `File appears unused — not imported anywhere`));
      }
    }
    return results;
  },
};

const unusedExports: DoctorRule = {
  id: "dead/unused-exports",
  name: "Unused Exports",
  category: "dead",
  severity: "warning",
  description: "Exported functions/types that aren't imported anywhere",
  help: "Remove unused exports or make them private",
  appliesTo: ["node", "nextjs"],
  async check(ctx) {
    const results: Diagnostic[] = [];

    // Skip if it's a library package (has main/module/exports/types in package.json)
    const pkg = await ctx.readJson("package.json");
    if (pkg && (pkg.main || pkg.module || pkg.exports || pkg.types || pkg.typings)) {
      return results;
    }

    // Find all named exports across the project
    const allFiles = await ctx.findFiles(/\.(ts|tsx|js|jsx)$/);
    if (allFiles.length > 300) return results; // too big, skip

    // Build a map of all exported names
    const exports: Array<{ name: string; file: string; line: number }> = [];
    let allContent = "";

    for (const f of allFiles) {
      const content = await ctx.readFile(f);
      if (!content) continue;
      allContent += content + "\n";

      const lines = content.split("\n");
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!line) continue;

        // export function name
        const funcMatch = /export\s+(?:async\s+)?function\s+(\w+)/g.exec(line);
        if (funcMatch && funcMatch[1]) {
          exports.push({ name: funcMatch[1], file: f, line: i + 1 });
        }

        // export const name
        const constMatch = /export\s+const\s+(\w+)/g.exec(line);
        if (constMatch && constMatch[1]) {
          exports.push({ name: constMatch[1], file: f, line: i + 1 });
        }

        // export class name
        const classMatch = /export\s+class\s+(\w+)/g.exec(line);
        if (classMatch && classMatch[1]) {
          exports.push({ name: classMatch[1], file: f, line: i + 1 });
        }

        // export interface/type name
        const typeMatch = /export\s+(?:interface|type)\s+(\w+)/g.exec(line);
        if (typeMatch && typeMatch[1]) {
          exports.push({ name: typeMatch[1], file: f, line: i + 1 });
        }
      }
    }

    // For each export, check if it's referenced elsewhere
    const unused: typeof exports = [];
    for (const exp of exports) {
      // Skip very common names that might be false positives
      if (["default", "metadata", "GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"].includes(exp.name)) continue;
      // Skip index files (barrel exports)
      if (/index\.(ts|tsx|js|jsx)$/.test(exp.file)) continue;

      // Count references (subtract 1 for the export itself)
      const regex = new RegExp(`\\b${exp.name}\\b`, "g");
      const matches = allContent.match(regex);
      const count = matches ? matches.length : 0;

      // If only referenced once (the export declaration itself), it's unused
      if (count <= 1) {
        unused.push(exp);
      }
    }

    // Cap results
    for (const u of unused.slice(0, 15)) {
      results.push(diag(this, u.file, `Export "${u.name}" appears unused`, { line: u.line }));
    }
    return results;
  },
};

const unusedComponents: DoctorRule = {
  id: "dead/unused-components",
  name: "Unused Components",
  category: "dead",
  severity: "warning",
  description: "React components defined but never imported/used",
  help: "Remove unused components or use them in your pages",
  appliesTo: ["nextjs"],
  async check(ctx) {
    const results: Diagnostic[] = [];

    // Find component files (PascalCase .tsx files, not in pages/layouts/routes)
    const componentFiles = await ctx.findFiles(/\/[A-Z][a-zA-Z]+\.(tsx|jsx)$/);
    const allFiles = await ctx.findFiles(/\.(ts|tsx|js|jsx)$/);

    if (allFiles.length > 300) return results; // too big

    // Read all content for reference checking
    let allContent = "";
    for (const f of allFiles) {
      const content = await ctx.readFile(f);
      if (content) allContent += content + "\n";
    }

    for (const cf of componentFiles) {
      // Extract component name from file path
      const basename = path.basename(cf, path.extname(cf));
      // Skip if it's a page/layout/route
      if (["page", "layout", "route", "loading", "error", "not-found"].includes(basename.toLowerCase())) continue;

      // Check if component name is referenced in any other file
      const regex = new RegExp(`<${basename}[\\s/>]|import.*${basename}`, "g");
      const matches = allContent.match(regex);
      const references = matches ? matches.length : 0;

      // The component definition itself counts as 1 reference (import in its own file)
      if (references <= 1) {
        results.push(diag(this, cf, `Component "${basename}" appears unused`));
      }
    }
    return results;
  },
};

export const deadCodeRules: DoctorRule[] = [
  orphanFiles,
  unusedExports,
  unusedComponents,
];
