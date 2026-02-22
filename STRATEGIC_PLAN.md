# MyContext CLI - Strategic Implementation Plan

**Date:** 2026-02-22
**Based on:** Complete CLI app review
**Vision:** Deterministic Full-Stack App Compiler

---

## 📊 CURRENT STATE ANALYSIS

### ✅ What We Have (Strong Foundation)

1. **Mature CLI Infrastructure (183 TypeScript files)**
   - 53 commands across 8 categories
   - 14 service classes (ProjectScanner, ContextSyncer, etc.)
   - 18+ autonomous agents (CodeGen, Architect, Backend, etc.)
   - AI provider chain (Claude → OpenRouter → Gemini → XAI)

2. **Comprehensive Type System**
   - `UnifiedContext` (merges Brain + MegaContext paradigms)
   - `MegaContext` (100% deterministic scaffolding spec)
   - `LivingContext` (structured brain representation)
   - Well-defined entity, route, auth, permission types

3. **Working Code Generation**
   - `FileGenerator` with Lego Assembly
   - `RouteGenerator` for Next.js App Router
   - `serverActionGenerator` for actions
   - `NextJSProjectGenerator` for full projects
   - `ScaffoldAgent` (MegaContext → full app)

4. **Advanced Doctor System**
   - 30 validation rules across 6 categories
   - Schema drift detection (NEW!)
   - Type safety checks (NEW!)
   - Auto-fix capabilities (14 rules)
   - Scoring system (0-100 with grades)

5. **Rich Template System**
   - InstantDB templates (client, admin, auth)
   - UI spec patterns (forms, navigation, etc.)
   - Build strategies (Component-First approach)
   - Intent dictionary for semantic mapping

6. **Robust Configuration**
   - AI provider configs with fallbacks
   - Local Ollama setup
   - Model version tracking
   - API endpoint configuration

### ⚠️ What's Missing (Gaps to Fill)

1. **No Recursive Clarification Loop**
   - `init --interactive` doesn't exist yet
   - No Q&A flow to build 100% complete manifest
   - No validation before generation

2. **No Unified Scaffold Command**
   - `scaffold --from-manifest` doesn't exist
   - ScaffoldAgent exists but not exposed as command
   - No single "mega script" entry point

3. **No ASL (Abstract Specification Language)**
   - No formal input format for specifications
   - No schema validation for ASL
   - No diff preview system

4. **No Registry System**
   - `components_registry.json` not tracked
   - `permissions_manifest.json` not validated
   - `types_registry.json` not maintained

5. **Agent Coordination Gap**
   - 18+ agents but no deterministic orchestration
   - Agents use LLM for code generation (not scripted)
   - No separation of intent parsing vs code generation

6. **MegaContext Not Fully Utilized**
   - Type exists but not populated via Q&A
   - No validator for 100% completeness
   - No planner layer

---

## 🎯 STRATEGIC DIRECTION

### Vision Alignment

**Before (Current):** AI-powered code generation with autonomous agents
**After (Target):** Deterministic compiler with LLM-based intent parsing

### Core Transformation

```
┌─────────────────────────────────────────────────────────────┐
│ CURRENT: LLM generates code directly (18+ agents)           │
│                                                               │
│ User → Agent → LLM writes code → Output                     │
│                                                               │
│ Problems:                                                    │
│ - Hallucinations                                             │
│ - Inconsistent output                                        │
│ - Hard to debug                                              │
│ - No improvement over time                                   │
└─────────────────────────────────────────────────────────────┘

                            ↓ TRANSFORMATION ↓

┌─────────────────────────────────────────────────────────────┐
│ TARGET: LLM only parses intent, scripts generate code       │
│                                                               │
│ User → Agent (Q&A) → ASL → Planner → Scripts → Output      │
│                                                               │
│ Benefits:                                                    │
│ - Zero hallucinations                                        │
│ - Deterministic output                                       │
│ - Transparent/debuggable                                     │
│ - Templates improve over time                                │
└─────────────────────────────────────────────────────────────┘
```

---

## 📋 IMPLEMENTATION ROADMAP

### Phase 1: Foundation (Week 1-2) — Build the Planner Layer

#### 1.1 Define ASL Schema (`src/types/asl.ts`)

Create formal TypeScript schema for Abstract Specification Language:

```typescript
interface ASL {
  version: "1.0";
  project: {
    name: string;
    framework: "nextjs";
    backend: "instantdb";
    description: string;
  };

  entities: Record<string, EntitySpec>;
  auth: AuthSpec;
  permissions: PermissionSpec[];
  pages: PageSpec[];
  components?: ComponentSpec[];
}

interface EntitySpec {
  name: string;
  fields: FieldSpec[];
  indexes?: string[];
}

interface PageSpec {
  path: string;
  component: string;
  guards?: string[];
  permissions?: string[];
  layout?: string;
}
```

**Deliverable:** Complete ASL type definitions with JSON schema validation

#### 1.2 Create Planner Service (`src/services/Planner.ts`)

Validate ASL for 100% completeness:

```typescript
class Planner {
  validate(asl: Partial<ASL>): ValidationResult {
    // Check: All entities have complete fields?
    // Check: All pages have layouts?
    // Check: All auth flows defined?
    // Check: All permissions mapped?
    // Return: List of missing items
  }

  generateQuestions(asl: Partial<ASL>): Question[] {
    // Detect gaps in ASL
    // Generate clarifying questions
    // Return: Ordered list of questions
  }

  generateDiff(asl: ASL): DiffPreview {
    // Show what will be generated
    // File count, structure preview
    // Return: Preview for user approval
  }
}
```

**Deliverable:** Validation, question generation, diff preview

#### 1.3 Build `init --interactive` Command (`src/commands/init-interactive.ts`)

Recursive clarification loop:

```typescript
async function initInteractive() {
  let asl: Partial<ASL> = { version: "1.0" };

  // Step 1: Initial questions
  const answers = await promptUser([
    "What are you building?",
    "Do you need authentication?",
    "What entities will you have?"
  ]);

  // Step 2: Parse answers into partial ASL
  asl = await parseAnswersToASL(answers);

  // Step 3: Recursive clarification
  while (!planner.isComplete(asl)) {
    const questions = planner.generateQuestions(asl);
    const moreAnswers = await promptUser(questions);
    asl = await updateASL(asl, moreAnswers);
  }

  // Step 4: Show diff and get approval
  const diff = planner.generateDiff(asl);
  const approved = await confirmDiff(diff);

  if (approved) {
    await saveASL(asl, ".mycontext/asl.json");
    console.log("✓ Manifest complete. Run: mycontext scaffold");
  }
}
```

**Deliverable:** Working `mycontext init --interactive` command

---

### Phase 2: Script Engine (Week 3-4) — Deterministic Generation

#### 2.1 Create Generator Scripts (`src/generators/`)

Convert existing generators to script-based (no LLM):

**`generate-schema-script.ts`:**
```typescript
function generateSchema(asl: ASL): string {
  const entities = Object.values(asl.entities)
    .map(entity => {
      const fields = entity.fields
        .map(f => `${f.name}: i.${f.type}()${f.required ? '' : '.optional()'}`)
        .join(',\n    ');

      return `${entity.name}: i.entity({
    ${fields}
  })`;
    })
    .join(',\n  ');

  return `import { i } from "@instantdb/core";

const schema = i.schema({
  entities: {
    ${entities}
  }
});

export default schema;`;
}
```

**`generate-page-script.ts`:**
```typescript
function generatePage(page: PageSpec): string {
  const guards = page.guards?.map(g => `with${capitalize(g)}Guard`).join('') || '';
  const permissionCheck = page.permissions?.length > 0
    ? `if (!hasPermissions([${page.permissions.map(p => `"${p}"`).join(', ')}])) return <Forbidden />;`
    : '';

  return `
import { ${guards} } from '@/lib/guards';
${page.permissions?.length ? "import { hasPermissions } from '@/lib/permissions';" : ''}

export default ${guards}(async function ${page.component}() {
  ${permissionCheck}

  return (
    <div>
      <h1>${page.component}</h1>
    </div>
  );
});`.trim();
}
```

**Key Generators Needed:**
- `generate-schema-script.ts` ✓
- `generate-types-script.ts` (enhance existing)
- `generate-page-script.ts` ✓
- `generate-component-script.ts`
- `generate-action-script.ts`
- `generate-auth-script.ts`
- `generate-middleware-script.ts`

**Deliverable:** 7 deterministic script generators

#### 2.2 Create `scaffold` Command (`src/commands/scaffold.ts`)

Orchestrate all generators:

```typescript
async function scaffold() {
  // Load ASL
  const asl = await loadASL(".mycontext/asl.json");

  if (!asl) {
    throw new Error("No manifest found. Run: mycontext init --interactive");
  }

  console.log("🚀 Scaffolding project from manifest...\n");

  // Execute generators in order
  const results = {
    schema: await generateSchemaScript(asl),
    types: await generateTypesScript(asl),
    pages: await Promise.all(asl.pages.map(generatePageScript)),
    components: await generateComponentsScript(asl),
    actions: await generateActionsScript(asl),
    auth: await generateAuthScript(asl),
    middleware: await generateMiddlewareScript(asl)
  };

  // Write files
  await writeFiles(results);

  // Update registries
  await updateRegistries(results);

  // Verify
  await runDoctor();

  console.log("\n✓ Scaffold complete!");
  console.log(`  Generated ${countFiles(results)} files`);
  console.log(`  Run: pnpm dev`);
}
```

**Deliverable:** Working `mycontext scaffold` command

---

### Phase 3: Registry System (Week 5) — Track Generated Assets

#### 3.1 Components Registry (`src/services/ComponentRegistry.ts`)

Track all generated components:

```typescript
interface ComponentRegistryEntry {
  name: string;
  path: string;
  props: Array<{ name: string; type: string }>;
  dependencies: string[];
  generatedFrom: string; // "asl.pages.posts" or "asl.entities.User"
  generatedAt: string;
}

class ComponentRegistry {
  private registry: Record<string, ComponentRegistryEntry> = {};

  register(component: ComponentRegistryEntry) {
    this.registry[component.name] = component;
    this.save();
  }

  get(name: string): ComponentRegistryEntry | null {
    return this.registry[name] || null;
  }

  list(): ComponentRegistryEntry[] {
    return Object.values(this.registry);
  }

  save() {
    fs.writeFileSync(
      ".mycontext/components_registry.json",
      JSON.stringify(this.registry, null, 2)
    );
  }
}
```

**Deliverable:** Auto-tracking of all generated components

#### 3.2 Types Registry (`src/services/TypeRegistry.ts`)

Track all generated types:

```typescript
interface TypeRegistryEntry {
  name: string;
  source: "instant.schema.ts" | "generated";
  fields: FieldInfo[];
  relations?: RelationInfo[];
  derivedTypes: string[]; // ["PostInsert", "PostWithRelations"]
}

class TypeRegistry {
  register(type: TypeRegistryEntry) { /* ... */ }
  get(name: string): TypeRegistryEntry | null { /* ... */ }
  // ...
}
```

**Deliverable:** Auto-tracking of all types

#### 3.3 Permissions Manifest (`src/services/PermissionsValidator.ts`)

Validate and enforce permissions:

```typescript
interface PermissionsManifest {
  roles: string[];
  permissions: PermissionRule[];
  guards: GuardRule[];
}

class PermissionsValidator {
  validate(manifest: PermissionsManifest): ValidationResult {
    // Check: All roles defined?
    // Check: All resources exist?
    // Check: No conflicting rules?
  }

  enforceAtRuntime(action: string, resource: string, user: User): boolean {
    // Runtime permission check
  }
}
```

**Deliverable:** Permission validation and enforcement

---

### Phase 4: Refactor Agents (Week 6-7) — Separate Concerns

#### 4.1 Create Intent Parser Agent

Convert existing CodeGenAgent to intent-only:

```typescript
class IntentParserAgent {
  async parseIntent(userInput: string): Promise<Partial<ASL>> {
    // Use LLM to parse natural language
    // Extract: entities, pages, auth, permissions
    // Return: Partial ASL (not code!)
  }

  async generateQuestions(partialASL: Partial<ASL>): Promise<Question[]> {
    // Use LLM to generate clarifying questions
    // Based on gaps in ASL
  }
}
```

**Key Change:** Agent only outputs ASL, never code

#### 4.2 Refactor Existing Agents

Transform 18 agents from code generators to intent parsers:

| Agent | Old Role | New Role |
|-------|----------|----------|
| CodeGenSubAgent | Writes code | Parses component intent → ASL |
| ArchitectAgent | Designs architecture | Parses architecture intent → ASL |
| BackendAgent | Writes server code | Parses API intent → ASL |
| SecurityAgent | Implements security | Parses security requirements → ASL |
| ... | ... | ... |

**Deliverable:** Agents only parse intent, scripts generate code

---

### Phase 5: Testing (Week 8-10) — Progressive Complexity

#### 5.1 Phase 1 Test: Todo App

**Goal:** Prove deterministic scaffolding works

**Steps:**
1. Run `mycontext init --interactive`
2. Answer questions (5-7 questions expected)
3. Review diff, approve
4. Run `mycontext scaffold`
5. Verify: 15 files generated, build passes, 0 manual edits

**Success Metrics:**
- Time to 100% manifest: < 5 min
- Build success: YES
- Manual edits: 0

#### 5.2 Phase 2 Test: Blog (Auth + Relations)

**Goal:** Prove auth guards and RBAC work

**Steps:**
1. Run `mycontext init --interactive`
2. Answer questions (12-15 questions expected)
3. Review diff (35+ files), approve
4. Run `mycontext scaffold`
5. Test auth flows, permission checks

**Success Metrics:**
- Auth guards: 100% correct
- Permission checks: 100% correct
- Manual edits: < 3

#### 5.3 Refine Templates

After each test:
1. Identify failures
2. Update script templates
3. Re-test
4. Document learnings

**Deliverable:** Refined templates with 90%+ accuracy

---

### Phase 6: Polish & Documentation (Week 11-12)

#### 6.1 CLI UX Improvements

- Spinners and progress bars
- Color-coded output
- Error messages with suggestions
- `--help` text updates

#### 6.2 Documentation Updates

- Update README with new workflow
- Create video tutorials
- Write migration guide (old → new)
- API documentation

#### 6.3 CI/CD Integration

- GitHub Actions workflow
- Pre-commit hooks
- Automated testing

---

## 🔧 TECHNICAL DECISIONS

### 1. Leverage Existing Infrastructure

**Keep:**
- ✅ ProjectScanner (for sync)
- ✅ ContextSyncer (for drift detection)
- ✅ Doctor system (for validation)
- ✅ AI provider chain (for intent parsing)
- ✅ Type system (UnifiedContext, MegaContext)

**Refactor:**
- 🔄 Agents: Code generators → Intent parsers
- 🔄 FileGenerator: LLM-based → Script-based
- 🔄 RouteGenerator: Enhance for determinism

**Add:**
- ➕ Planner service (validation, questions, diff)
- ➕ ASL schema (formal specification)
- ➕ Registry services (components, types, permissions)
- ➕ Script generators (deterministic templates)

### 2. Migration Strategy

**Approach:** Incremental migration, not big-bang rewrite

**Phase 1:** Add new commands alongside existing ones
- `init --interactive` (new)
- `scaffold` (new)
- Keep existing `init`, `generate` commands

**Phase 2:** Mark old commands as deprecated
- Add warnings: "Use `mycontext scaffold` instead"

**Phase 3:** Remove deprecated commands (v2.0)

### 3. Backward Compatibility

**UnifiedContext stays:**
- Supports both Brain and MegaContext paradigms
- Existing projects continue to work
- New projects use MegaContext exclusively

---

## 📊 SUCCESS METRICS

### Quantitative

| Metric | Target | Measurement |
|--------|--------|-------------|
| Time to 100% manifest | < 10 min | User testing |
| Questions asked | < 20 | Agent logs |
| Build success rate | > 95% | Automated tests |
| Manual edits required | < 5% | Code review |
| Template accuracy | > 90% | Test projects |

### Qualitative

- **Developer Experience:** "Just answer questions, get a working app"
- **Transparency:** "I understand what will be generated"
- **Reliability:** "Same input always produces same output"
- **Learning Curve:** "Easier than learning Next.js from scratch"

---

## 🚀 QUICK START (After Implementation)

```bash
# New workflow (deterministic compiler)
mycontext init --interactive
# Answer questions → ASL complete

mycontext scaffold
# Generates entire app deterministically

mycontext doctor
# Verify build, types, schema drift

pnpm dev
# App is ready!

# Old workflow (still works)
mycontext init
mycontext generate:components --all
mycontext generate:screens
```

---

## 🎯 MILESTONES

- [ ] **Week 2:** ASL schema, Planner service, `init --interactive` working
- [ ] **Week 4:** Script generators, `scaffold` command working
- [ ] **Week 5:** Registries tracking components/types/permissions
- [ ] **Week 7:** Agents refactored to intent parsers only
- [ ] **Week 10:** Phase 1-2 testing complete, templates refined
- [ ] **Week 12:** Documentation complete, ready for beta release

---

## 💡 KEY INSIGHTS FROM REVIEW

1. **We have 80% of the infrastructure** — Services, types, templates exist
2. **Main gap is the Planner layer** — No validation, no Q&A loop
3. **Agents are too powerful** — They generate code directly (should only parse intent)
4. **MegaContext exists but unused** — Perfect for deterministic scaffolding
5. **Doctor system is excellent** — Schema drift detection is a killer feature
6. **ScaffoldAgent exists** — Just needs to be exposed as a command

---

## 🎬 NEXT IMMEDIATE STEPS

1. **Create ASL schema** (`src/types/asl.ts`)
2. **Build Planner service** (`src/services/Planner.ts`)
3. **Implement `init --interactive`** (`src/commands/init-interactive.ts`)
4. **Test with Todo app** (validate workflow)
5. **Refine based on feedback**

---

**This plan transforms MyContext from an AI code generator into a deterministic compiler while leveraging 80% of the existing codebase.**

Ready to build! 🚀
