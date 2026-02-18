/**
 * Doctor Types — Shared interfaces for the mycontext doctor system
 */

// ─── Project Detection ────────────────────────────────────────────

export type ProjectType = "nextjs" | "turbo" | "node";

export interface ProjectInfo {
  type: ProjectType;
  name: string;
  root: string;
  version?: string;             // e.g. Next.js 15.x
  packageManager: "npm" | "pnpm" | "yarn" | "bun" | "unknown";
  isMonorepo: boolean;
  workspaces?: WorkspaceInfo[];
  typescript: boolean;
  nextVersion?: string;
  reactVersion?: string;
  turboVersion?: string;
}

export interface WorkspaceInfo {
  name: string;
  path: string;               // relative to root
  absolutePath: string;
  type: ProjectType;
  hasPackageJson: boolean;
}

// ─── Diagnostics ──────────────────────────────────────────────────

export type DoctorCategory = "nextjs" | "turbo" | "node" | "dead";

export interface Diagnostic {
  ruleId: string;
  filePath: string;            // relative to project root
  line?: number;
  column?: number;
  severity: "error" | "warning";
  message: string;
  help: string;
  autoFixable: boolean;
}

// ─── Rules ────────────────────────────────────────────────────────

export interface RuleContext {
  root: string;                // absolute path to project/workspace root
  project: ProjectInfo;
  isWorkspace: boolean;
  readFile(relativePath: string): Promise<string | null>;
  fileExists(relativePath: string): Promise<boolean>;
  findFiles(pattern: RegExp, maxDepth?: number): Promise<string[]>;
  readJson(relativePath: string): Promise<any | null>;
}

export interface DoctorRule {
  id: string;                  // e.g. "nextjs/missing-root-layout"
  name: string;                // Human-readable
  category: DoctorCategory;
  severity: "error" | "warning";
  description: string;         // What the rule checks
  help: string;                // How to fix
  appliesTo: ProjectType[];    // Which project types
  check(ctx: RuleContext): Promise<Diagnostic[]>;
  fix?(ctx: RuleContext, diag: Diagnostic): Promise<boolean>;
}

// ─── Results ──────────────────────────────────────────────────────

export interface DoctorResult {
  score: number;               // 0-100
  grade: string;               // A+ through F
  diagnostics: Diagnostic[];
  project: ProjectInfo;
  ruleResults: RuleResult[];
  fixedCount?: number;
  duration: number;            // ms
}

export interface RuleResult {
  ruleId: string;
  ruleName: string;
  category: DoctorCategory;
  passed: boolean;
  diagnostics: Diagnostic[];
}

// ─── Options ──────────────────────────────────────────────────────

export interface DoctorOptions {
  fix?: boolean;
  verbose?: boolean;
  score?: boolean;             // output only score
  project?: string;            // workspace filter
  category?: DoctorCategory;   // rule category filter
  dryRun?: boolean;
  json?: boolean;
  prune?: boolean;
}

export interface DiagnoseOptions {
  lint?: boolean;
  deadCode?: boolean;
  category?: DoctorCategory;
  project?: string;
}
