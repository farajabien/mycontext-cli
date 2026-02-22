# MyContext Doctor - Quick Reference

## Rule Distribution

```
┌─────────────────┬────────┬──────────┐
│ Category        │ Rules  │ Auto-Fix │
├─────────────────┼────────┼──────────┤
│ Next.js         │ 10     │ 1        │
│ Turborepo       │ 6      │ 1        │
│ Node.js/Struct  │ 7      │ 4        │
│ TypeScript      │ 3      │ 0        │
│ Dead Code       │ 3      │ 3        │
│ InstantDB       │ 1      │ 1        │
├─────────────────┼────────┼──────────┤
│ TOTAL           │ 30     │ 14       │
└─────────────────┴────────┴──────────┘
```

## Architecture Layers

```
┌────────────────────────────────────────┐
│     Command Layer (doctor.ts)          │
│     - CLI integration                  │
│     - Option parsing                   │
└──────────────┬─────────────────────────┘
               │
┌──────────────▼─────────────────────────┐
│     DoctorEngine (orchestrator)        │
│     - Project detection                │
│     - Workspace enumeration            │
│     - Rule execution & aggregation     │
│     - Scoring & formatting             │
└──────────────┬─────────────────────────┘
               │
┌──────────────▼─────────────────────────┐
│     Rule System (30 rules)             │
│     ┌─────────────┬─────────────┐      │
│     │ Check()     │ Fix()       │      │
│     │ (analyze)   │ (remediate) │      │
│     └─────────────┴─────────────┘      │
└──────────────┬─────────────────────────┘
               │
┌──────────────▼─────────────────────────┐
│     RuleContext (file operations)      │
│     - readFile()                       │
│     - fileExists()                     │
│     - findFiles()                      │
│     - readJson()                       │
└────────────────────────────────────────┘
```

## Key Interfaces

### DoctorRule (Plugin Interface)
```typescript
{
  id: string;                    // "category/rule-name"
  category: DoctorCategory;      // nextjs|turbo|node|dead
  severity: "error"|"warning";   // Scoring impact
  appliesTo: ProjectType[];      // nextjs|turbo|node
  check(): Diagnostic[];         // Analyze
  fix?(): boolean;              // Remediate
}
```

### RuleContext (Provider Interface)
```typescript
{
  root: string;
  project: ProjectInfo;
  readFile(path): string | null;
  fileExists(path): boolean;
  findFiles(pattern): string[];
  readJson(path): any | null;
}
```

### Diagnostic (Problem Report)
```typescript
{
  ruleId: string;
  filePath: string;      // relative to root
  line?: number;
  severity: "error"|"warning";
  message: string;
  help: string;
  autoFixable: boolean;
}
```

## Scoring Formula

```
Base: 100 points
Deduction:
  - Each ERROR:   -5 points
  - Each WARNING: -2 points
  
Floor: 0, Ceiling: 100

Grades:
  A+: 95-100  |  B-: 70-74   |  D: 50-54
  A:  90-94   |  C+: 65-69   |  F: <50
  A-: 85-89   |  C:  60-64
  B+: 80-84   |  C-: 55-59
  B:  75-79
```

## Rule Categories

### Next.js (10 rules)
- Root layout requirement
- Client directive enforcement
- Component best practices (Image, Link)
- Metadata exports
- Loading states

### Turborepo (6 rules)
- Monorepo configuration
- Workspace protocol enforcement
- Pipeline coverage
- Naming conventions
- Dependency structure

### Node.js/Structure (7 rules)
- Lock file validation
- TypeScript strict mode
- .gitignore completeness
- Environment examples
- Unused dependencies

### TypeScript (3 rules)
- "as any" cast detection
- Transaction typing
- Duplicate type declarations

### Dead Code (3 rules + AUTO-FIX)
- Orphan files (→ delete)
- Unused exports
- Unused components (→ delete)

### InstantDB (1 rule + SCHEMA PARSING)
- Schema field drift with fuzzy matching
- Auto-fix field name corrections

## File Locations

```
apps/cli/src/
├── commands/
│   └── doctor.ts                 # CLI command
├── doctor/
│   ├── DoctorEngine.ts           # Core orchestrator
│   ├── api.ts                    # Programmatic API
│   ├── types.ts                  # Type definitions
│   └── rules/
│       ├── index.ts              # Registry
│       ├── nextjs-rules.ts
│       ├── turbo-rules.ts
│       ├── node-rules.ts
│       ├── typescript-rules.ts
│       ├── dead-code-rules.ts
│       └── instantdb-rules.ts
```

## Usage Examples

### Basic Diagnosis
```bash
mycontext doctor .
```

### Auto-Fix Issues
```bash
mycontext doctor . --fix
```

### Dead Code Removal (Destructive)
```bash
mycontext doctor . --prune
```

### Specific Category
```bash
mycontext doctor . --category nextjs
```

### Monorepo Workspace
```bash
mycontext doctor . --project @myorg/cli
```

### CI/CD Integration
```bash
mycontext doctor . --score --json
# {"score": 87, "grade": "B+"}
```

### Dry Run
```bash
mycontext doctor . --fix --dry-run
```

## Performance Features

### Safeguards
- Dead code: Cap at 20 results
- Unused exports: Skip if >300 files
- Unused deps: Sample 200 files
- findFiles(): Max depth 6
- Ignore dirs: node_modules, .next, .git, etc.

### Error Handling
- Rule errors → Silently skip
- Fix errors → Continue with next
- Graceful degradation built-in

## Extensibility Pattern

To add a new rule:

1. Create rule in appropriate file:
```typescript
const myRule: DoctorRule = {
  id: "category/name",
  category: "node",
  severity: "warning",
  appliesTo: ["nextjs"],
  async check(ctx) {
    // Analyze
    return [diag(...), ...];
  },
  async fix(ctx, diag) {
    // Remediate
    return true;
  }
};
```

2. Export in rules/index.ts:
```typescript
export const allRules = [
  ...myRules,
  ...otherRules,
];
```

3. Rule will auto-register and run

## Key Design Decisions

| Decision | Why |
|----------|-----|
| Regex over AST | Speed, simplicity, maintenance |
| Graceful failures | Engine bugs don't break scan |
| Heuristics vs precise | Performance over perfection |
| Rule-based | Extensible, independent checks |
| Async operations | Large project support |
| Monorepo aware | Multi-workspace native |

## Innovation Highlights

✨ **InstantDB Schema Drift Detection**
- Parses instant.schema.ts
- Detects field access mismatches
- Fuzzy matching (Levenshtein distance)
- Auto-fixes suggestions

✨ **Dead Code Pruning**
- Import graph construction
- Smart entry point detection
- Safe deletion with thresholds
- Component PascalCase recognition

✨ **Monorepo Native**
- Auto-discovers workspaces
- Scans root + each workspace
- Aggregates with path prefixes
- Per-workspace rule filtering

## Scoring Example

```
Project Health Report:
- 2 Errors (Next.js rules):   -10 points
- 4 Warnings (TypeScript):     -8 points
- 5 Warnings (Node.js):       -10 points
                        Total: -28 points
                        
Final: 100 - 28 = 72 → B- Grade
```

## Integration Points

| System | Integration |
|--------|-----------|
| CLI | commander.js |
| File I/O | fs-extra |
| Colors | chalk |
| JSON | native |
| Async | Promise-based |
| Monorepo | Turborepo/npm/pnpm aware |

