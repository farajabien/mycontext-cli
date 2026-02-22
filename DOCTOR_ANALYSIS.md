# MyContext CLI Validation & Diagnostic Systems - Complete Analysis

## Executive Summary

The MyContext CLI features a sophisticated **Doctor system** - a pluggable rule-based diagnostic and auto-fixing engine that validates project health across multiple dimensions: Next.js, Turborepo, Node.js, TypeScript, InstantDB schemas, and dead code detection.

---

## 1. DOCTOR COMMAND STRUCTURE

### 1.1 Command Integration
**File:** `apps/cli/src/commands/doctor.ts`

The doctor command is a CLI-facing wrapper that:
- Accepts a target directory (defaults to `.`)
- Supports multiple modes: diagnostic, fixing, pruning, JSON output
- Filters by project/workspace and rule category
- Provides a structured API for programmatic access

**Key Options:**
```typescript
--fix          // Auto-fix all fixable issues
--verbose      // Show file-level details
--score        // Output only numeric score
--project      // Filter to specific workspace
--category     // Filter to rule category (nextjs|turbo|node|dead)
--dry-run      // Show what would be fixed
--prune        // Destructive: remove dead code
--json         // Machine-readable output
```

### 1.2 Core Engine: DoctorEngine
**File:** `apps/cli/src/doctor/DoctorEngine.ts`

The engine orchestrates:

1. **Project Detection** (`detectProject()`)
   - Determines project type: `nextjs | turbo | node`
   - Detects package manager: `npm | pnpm | yarn | bun | unknown`
   - Identifies monorepo structure (Turborepo, npm workspaces, pnpm)
   - Detects TypeScript, React, Next.js versions
   - Discovers workspace structure and paths

2. **Workspace Enumeration** (`detectWorkspaces()`)
   - Parses `package.json` workspaces or `pnpm-workspace.yaml`
   - Maps relative paths to absolute paths
   - Detects type per workspace
   - Only applies rules to applicable project types

3. **Rule Execution** (`runDoctor()`)
   - Filters rules by category and project type
   - Creates rule context for each scan root (root + each workspace)
   - Collects diagnostics from all rules
   - Aggregates into a single report
   - Optionally applies fixes

4. **Scoring** (`calculateScore()`)
   - Error: -5 points each
   - Warning: -2 points each
   - Grade scale: A+ (95+), A (90+), ..., F (<50)

5. **Output Formatting** (`displayResult()`)
   - Human-readable console output with categories
   - JSON export for CI/CD pipelines
   - Score-only mode for automation
   - Verbose mode with file paths and help text

---

## 2. RULE ENGINE ARCHITECTURE

### 2.1 Rule Interface (`DoctorRule`)

```typescript
interface DoctorRule {
  id: string;                              // e.g., "nextjs/missing-root-layout"
  name: string;                            // Human-readable name
  category: DoctorCategory;                // nextjs | turbo | node | dead
  severity: "error" | "warning";           // Determines scoring impact
  description: string;                     // What the rule checks
  help: string;                            // How to fix
  appliesTo: ProjectType[];               // Which projects run this rule
  check(ctx: RuleContext): Promise<Diagnostic[]>;  // Main check function
  fix?(ctx: RuleContext, diag: Diagnostic): Promise<boolean>;  // Optional auto-fix
}
```

### 2.2 Rule Context (`RuleContext`)

Provides rules with a standardized interface to interact with the project:

```typescript
interface RuleContext {
  root: string;                            // Absolute path to project/workspace root
  project: ProjectInfo;                    // Detected project metadata
  isWorkspace: boolean;                    // Whether scanning a workspace
  
  // File operations
  readFile(relativePath: string): Promise<string | null>;
  fileExists(relativePath: string): Promise<boolean>;
  readJson(relativePath: string): Promise<any | null>;
  findFiles(pattern: RegExp, maxDepth?: number): Promise<string[]>;
}
```

### 2.3 Rule Registry

**File:** `apps/cli/src/doctor/rules/index.ts`

Central export point for all rules:
```typescript
export const allRules: DoctorRule[] = [
  ...nextjsRules,
  ...turboRules,
  ...nodeRules,
  ...deadCodeRules,
  ...typescriptRules,
  ...instantdbRules,
];
```

---

## 3. EXISTING RULES IMPLEMENTATION

### 3.1 Next.js Rules (10 rules)
**File:** `apps/cli/src/doctor/rules/nextjs-rules.ts`

| Rule ID | Severity | Category | Checks |
|---------|----------|----------|--------|
| `nextjs/missing-root-layout` | ERROR | nextjs | App Router requires root layout |
| `nextjs/layout-html-body` | ERROR | nextjs | Layout wraps children in `<html>` and `<body>` |
| `nextjs/page-default-export` | ERROR | nextjs | Page files have default export |
| `nextjs/client-directive` | WARNING | nextjs | Files using hooks have "use client" ⭐ **AUTO-FIXABLE** |
| `nextjs/server-component-hooks` | ERROR | nextjs | Server components don't use React hooks |
| `nextjs/metadata-export` | WARNING | nextjs | Pages export metadata or generateMetadata |
| `nextjs/image-component` | WARNING | nextjs | Uses next/image instead of `<img>` |
| `nextjs/link-component` | WARNING | nextjs | Uses next/link for internal navigation |
| `nextjs/route-handler-methods` | ERROR | nextjs | API routes export HTTP methods |
| `nextjs/loading-states` | WARNING | nextjs | Async pages have loading.tsx |

**Key Features:**
- Pattern matching for common mistakes
- Heuristic detection (e.g., checking for `useState` to suggest "use client")
- Auto-fix capability for client directive insertion

### 3.2 Turborepo Rules (6 rules)
**File:** `apps/cli/src/doctor/rules/turbo-rules.ts`

| Rule ID | Severity | Category | Checks |
|---------|----------|----------|--------|
| `turbo/has-turbo-json` | ERROR | turbo | turbo.json exists |
| `turbo/workspace-deps` | WARNING | turbo | Workspace packages use "workspace:*" protocol ⭐ **AUTO-FIXABLE** |
| `turbo/shared-tsconfig` | WARNING | turbo | Workspaces extend shared tsconfig |
| `turbo/no-root-app-deps` | WARNING | turbo | Root only has devDependencies |
| `turbo/pipeline-coverage` | WARNING | turbo | Workspace scripts in turbo pipeline |
| `turbo/workspace-naming` | WARNING | turbo | Consistent @scope/package naming |

**Key Features:**
- Monorepo-aware (checks workspace constraints)
- Pipeline task validation
- Dependency resolution and protocol checking

### 3.3 Node.js / Structure Rules (7 rules)
**File:** `apps/cli/src/doctor/rules/node-rules.ts`

| Rule ID | Severity | Category | Checks |
|---------|----------|----------|--------|
| `node/single-lock-file` | ERROR | node | Only one package manager lock file ⭐ **AUTO-FIXABLE** |
| `node/no-nested-node-modules` | WARNING | node | No nested node_modules directories ⭐ **AUTO-FIXABLE** |
| `node/tsconfig-strict` | WARNING | node | TypeScript strict mode enabled ⭐ **AUTO-FIXABLE** |
| `node/engines-field` | WARNING | node | package.json has engines.node ⭐ **AUTO-FIXABLE** |
| `structure/gitignore` | WARNING | node | Complete .gitignore ⭐ **AUTO-FIXABLE** |
| `structure/env-example` | WARNING | node | .env.example exists if .env present |
| `node/unused-deps` | WARNING | node | No unused dependencies |

**Key Features:**
- Package manager detection and validation
- Config file auto-patching
- Heuristic dependency analysis (samples 200 files)

### 3.4 TypeScript Rules (3 rules)
**File:** `apps/cli/src/doctor/rules/typescript-rules.ts`

| Rule ID | Severity | Category | Checks |
|---------|----------|----------|--------|
| `typescript/as-any-casts` | WARNING | node | Detects 'as any' type casts |
| `typescript/instantdb-transaction-typing` | ERROR | node | InstantDB transaction array types |
| `typescript/duplicate-type-declarations` | WARNING | node | Duplicate schema types |

**Key Features:**
- Type safety enforcement
- Schema-aware validation
- Pattern matching for TypeScript anti-patterns

### 3.5 Dead Code Rules (3 rules + ⭐ AUTO-FIX)
**File:** `apps/cli/src/doctor/rules/dead-code-rules.ts`

| Rule ID | Severity | Category | Checks |
|---------|----------|----------|--------|
| `dead/orphan-files` | WARNING | dead | Files not imported anywhere ⭐ **AUTO-FIXABLE** |
| `dead/unused-exports` | WARNING | dead | Exported functions/types never used ⭐ **AUTO-FIXABLE** |
| `dead/unused-components` | WARNING | dead | React components never instantiated ⭐ **AUTO-FIXABLE** |

**Key Features:**
- Full import graph construction
- Entry point recognition (pages, layouts, configs)
- Component detection via PascalCase convention
- Safeguards: capped at 20 results, skips >30% threshold
- Files: deletes orphaned files and unused components

**Smart Skip Logic:**
- Entry patterns: pages, layouts, routes, configs, tests
- Library detection: skips if package.json has main/module/exports
- Size limits: skips projects >300 files
- Normalization: handles various import formats

### 3.6 InstantDB Rules (1 rule + SCHEMA PARSING)
**File:** `apps/cli/src/doctor/rules/instantdb-rules.ts`

| Rule ID | Severity | Category | Checks |
|---------|----------|----------|--------|
| `instantdb/schema-field-drift` | ERROR | node | Code matches InstantDB schema ⭐ **AUTO-FIXABLE** |

**Key Features:**
- **Schema Parser:** Extracts entity/field definitions from instant.schema.ts
- **Field Access Detection:** Uses fuzzy matching to identify entity.field access patterns
- **Intelligent Similarity Matching:**
  - Exact field name match
  - Suffix matching (e.g., payment_method → method)
  - Substring matching (e.g., zone_id in delivery_zone_id)
  - Levenshtein distance for typos (≤3 character differences)
- **Auto-Fix:** Replaces incorrect field names with suggestions

**Schema Parsing Logic:**
```
Pattern detection:
entities: {
  EntityName: {
    fields: {
      fieldName: { type: "string", required: true }
    }
  }
}
```

---

## 4. VALIDATION & SCHEMA HANDLING

### 4.1 Schema Discovery & Parsing

The InstantDB schema parser is the most sophisticated validation component:

**Supported Schema Locations:**
- `instant.schema.ts`
- `src/instant.schema.ts`
- `.mycontext/schema.ts`
- `instant.schema.js`

**Parsing Strategy:**
1. Extract `entities: { ... }` section using regex
2. Parse each entity definition with field extraction
3. Build Map<EntityName, { name, fields }>
4. Fields include type and required flag

### 4.2 Field Access Detection

Uses heuristic pattern matching for entity.field access:

```typescript
// Patterns matched:
payment.payment_method
user.email
customer.delivery_zone_id
```

**Fuzzy Matching Strategy:**
- Case-insensitive entity name matching
- Plural/singular detection (users → User)
- Prefix/suffix matching
- Levenshtein distance for typo detection

### 4.3 Type Safety Validation

**TypeScript-specific Checks:**
- `as any` cast detection with pattern: `\s+as\s+any[\s\)\;\,\}\]\.]/`
- InstantDB transaction typing: checks `unknown[]` arrays passed to `.transact()`
- Duplicate type declarations: compares schema types with file-level type exports

### 4.4 Configuration Validation

Uses `fs-extra.readJson()` with graceful failure:
```typescript
try {
  const config = await fs.readJson(path);
  // validate config structure
} catch {
  return null;  // Skip rule if config missing
}
```

---

## 5. EXTENSIBILITY & PLUGIN POINTS

### 5.1 Adding New Rules

To add a new rule:

1. **Create rule definition** in appropriate file (or new file):
```typescript
const myNewRule: DoctorRule = {
  id: "category/rule-name",
  name: "Human Readable Name",
  category: "node" | "nextjs" | "turbo" | "dead",
  severity: "error" | "warning",
  description: "What it checks",
  help: "How to fix",
  appliesTo: ["nextjs", "turbo"],
  async check(ctx) {
    const results: Diagnostic[] = [];
    // Implement check logic
    return results;
  },
  async fix(ctx, diag) {  // Optional
    // Implement auto-fix
    return true; // success
  }
};
```

2. **Export in rule registry:**
```typescript
// rules/my-rules.ts
export const myRules: DoctorRule[] = [myNewRule];

// rules/index.ts
import { myRules } from "./my-rules";
export const allRules = [
  // ... existing
  ...myRules,
];
```

3. **Key Considerations:**
   - Use `ctx.findFiles(pattern, maxDepth)` for file discovery
   - Implement graceful failure in `check()` (errors don't fail scan)
   - Only implement `fix()` if rule is marked `autoFixable: true`
   - Use `RuleContext` for all file operations
   - Consider performance: cap results, skip large projects

### 5.2 RuleContext Capabilities

```typescript
// File reading
await ctx.readFile("relative/path.ts");          // string | null
await ctx.readJson("package.json");              // any | null
await ctx.fileExists("some/file");               // boolean
await ctx.findFiles(/\.tsx?$/, maxDepth);        // string[]

// Project metadata
ctx.root;                                         // absolute path
ctx.project.type;                                 // "nextjs" | "turbo" | "node"
ctx.project.isMonorepo;                          // boolean
ctx.isWorkspace;                                 // boolean
```

### 5.3 Diagnostic Reporting

```typescript
interface Diagnostic {
  ruleId: string;
  filePath: string;              // relative to project root
  line?: number;
  column?: number;
  severity: "error" | "warning"; // Impacts scoring
  message: string;               // User-facing
  help: string;                  // How to fix
  autoFixable: boolean;          // Can --fix/--prune fix it?
}
```

---

## 6. SCORING & GRADING SYSTEM

### 6.1 Calculation Logic

```
Points Deduction:
  - Each error: -5 points
  - Each warning: -2 points
  - Floor: 0, Ceiling: 100

Grade Mapping:
  A+: ≥95
  A:  ≥90
  A-: ≥85
  B+: ≥80
  B:  ≥75
  B-: ≥70
  C+: ≥65
  C:  ≥60
  C-: ≥55
  D:  ≥50
  F:  <50
```

### 6.2 CI/CD Integration

```bash
mycontext doctor . --score --json
# Output: {"score": 87, "grade": "B+"}

# Exit code handling:
# score < 50 → exit 1 (failure)
# score ≥ 50 → exit 0 (success)
```

---

## 7. FILTERING & SCOPING

### 7.1 Category Filtering
Rules can be filtered by category:
```bash
mycontext doctor . --category nextjs    # Only Next.js rules
mycontext doctor . --category dead      # Only dead code rules
```

### 7.2 Project/Workspace Filtering
In monorepos, run rules for specific workspaces:
```bash
mycontext doctor . --project @myorg/cli
mycontext doctor . --project apps/web
```

**Matching Logic:**
- Exact package name match
- Path suffix match
- Substring match

### 7.3 Dry-Run Mode
```bash
mycontext doctor . --fix --dry-run      # Show what would be fixed
```

Prevents file modifications while still running fix logic.

---

## 8. IMPLEMENTATION PATTERNS

### 8.1 Pattern Detection
Most rules use regex patterns:
```typescript
// Hooks detection
/\b(useState|useEffect|useRef|...)\s*\(/

// Entity access
/(\w+)\.(\w+)/g  // variable.field pattern
```

### 8.2 Heuristic Analysis
Rules often use heuristics rather than AST parsing:
- String matching for imports
- Regex for pattern detection
- Statistical analysis (e.g., >30% orphan threshold)
- Sampling (200 files for unused deps)

### 8.3 Graceful Degradation
```typescript
// Missing file → skip rule
const content = await ctx.readFile(path);
if (!content) return [];

// Parse error → return null
try {
  const parsed = parseSchema();
} catch {
  return null;
}

// No applicable rules → just pass
const rules = applicableRules.filter(r => r.appliesTo.includes(type));
if (rules.length === 0) return { score: 100, grade: "A+" };
```

### 8.4 Monorepo Awareness
Engine scans:
1. Root directory (for turbo/npm workspace rules)
2. Each workspace directory (for project-specific rules)
3. Aggregates results with workspace-prefixed file paths

---

## 9. KEY DESIGN DECISIONS

| Decision | Rationale |
|----------|-----------|
| **Rule-based architecture** | Extensible, each rule is independent |
| **Regex over AST parsing** | Speed, lower memory footprint, easier to maintain |
| **Graceful rule failures** | Engine bugs don't break entire scan |
| **Scoped auto-fix** | Only fix rules explicitly marked autoFixable |
| **Monorepo support baked in** | Multi-workspace discovery automatic |
| **Heuristic not precise** | Trades accuracy for performance (OK for linting) |
| **Async context operations** | Supports large projects, non-blocking I/O |
| **Configurable severity** | Same rule can be error/warning per project |
| **Project type awareness** | Different rule sets per tech stack |

---

## 10. PERFORMANCE CONSIDERATIONS

### 10.1 Safeguards Built Into Rules

- **File capping:** 
  - Dead code: cap at 20 orphans
  - Unused exports: skip projects >300 files
  - Unused deps: sample 200 files
  
- **Depth limiting:**
  - `findFiles()` defaults to maxDepth: 6
  - Ignores: node_modules, .next, .git, dist, build, etc.

- **Orphan filtering:**
  - Skip if >30% of files are orphans (likely incomplete detection)

### 10.2 File System Operations

All operations through RuleContext:
- Async/await for non-blocking I/O
- Single pass through file tree
- Caching implicitly via context

---

## 11. ERROR HANDLING & RELIABILITY

### 11.1 Rule Error Handling
```typescript
try {
  const diagnostics = await rule.check(ctx);
} catch (err) {
  // Silently skip — don't fail entire scan
}
```

### 11.2 Fix Error Handling
```typescript
try {
  const fixed = await rule.fix(ctx, diag);
  if (fixed) fixedCount++;
} catch {
  // Silently skip — continue with next fix
}
```

### 11.3 User Feedback
- Verbose mode: shows full stack traces
- Score-only mode: numeric output only
- JSON mode: structured for parsing
- Dry-run: no file modifications

---

## 12. SUMMARY TABLE

| Aspect | Implementation |
|--------|----------------|
| **Total Rules** | 30 rules across 6 categories |
| **Auto-Fixable** | 14 rules |
| **Project Types** | 3 (nextjs, turbo, node) |
| **Categories** | 4 (nextjs, turbo, node, dead) |
| **Max Score** | 100 |
| **Max Grade** | A+ |
| **Key Innovation** | InstantDB schema drift detection with fuzzy matching |
| **Performance Model** | Heuristic-based (regex), gracefully degrading |
| **Extensibility** | Plugin-style rule system with standardized interface |

---

## 13. EXAMPLE: HOW A RULE WORKS

### Example: `typescript/as-any-casts`

```typescript
const asAnyCasts: DoctorRule = {
  id: "typescript/as-any-casts",
  category: "node",
  severity: "warning",  // -2 points each
  appliesTo: ["nextjs", "node"],
  
  async check(ctx) {
    const files = await ctx.findFiles(/\.(tsx?|jsx?)$/);
    const pattern = /\s+as\s+any[\s\)\;\,\}\]\.]/g;
    
    for (const file of files) {
      const content = await ctx.readFile(file);
      if (!content) continue;
      
      const occurrences = findOccurrences(content, pattern);
      if (occurrences.length > 0) {
        results.push(diag(this, file, 
          `Found ${occurrences.length} 'as any' cast(s)`,
          { line: occurrences[0].line }
        ));
      }
    }
    return results;
  }
};
```

**Execution:**
1. Find all TS/JS files
2. Check for "as any" pattern
3. Report first occurrence with line number
4. No auto-fix (not marked autoFixable)
5. User must manually fix

---

## CONCLUSION

The MyContext Doctor is a **sophisticated, extensible validation framework** that:

1. **Detects project types** automatically
2. **Runs 30+ rules** in parallel across monorepos
3. **Provides helpful diagnostics** with context
4. **Auto-fixes 14 rule violations** safely
5. **Scores project health** numerically
6. **Integrates with CI/CD** via JSON/score modes
7. **Extensible plugin system** for custom rules

Perfect for ensuring **project consistency** and **catching common mistakes** early in development workflows.
