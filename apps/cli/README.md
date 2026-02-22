# MyContext CLI — Deterministic Full-Stack App Compiler

**Transform natural language into production-ready Next.js applications through deterministic compilation.**

MyContext is not an AI code generator—it's a **natural-language-to-project compiler** that uses LLMs only for intent parsing while all code generation is performed by deterministic script templates. No hallucinations. No guessing. Just facts → manifest → complete application.

[![npm version](https://img.shields.io/npm/v/mycontext-cli.svg)](https://www.npmjs.com/package/mycontext-cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## 🎯 Ultimate Goal

Run **ONE "mega script"** after the agent validates your specification, and get a complete Next.js application with all pages, features, roles, components, auth, and actions already wired—with minimal manual intervention.

---

## 🧠 Core Philosophy

### What MyContext Is

- ✅ A **deterministic compiler** (natural language → manifest → scripted generation)
- ✅ A **recursive clarification agent** (100% specification before code)
- ✅ A **canonical project brain** (context.json as single source of truth)

### What MyContext Is NOT

- ❌ An autonomous coder (AI does not guess or hallucinate)
- ❌ A trial-and-error generator (no brute-force LLM coding)
- ❌ A chat-based assistant (it's a compiler with a conversational interface)

---

## 🏗️ How It Works

```
[User Input (Natural Language)]
         ↓
[Agent: Parse Intent → ASL]
         ↓
[Planner: Validate → Ask Questions → Ensure 100% Complete]
         ↓
[User: Approve Diff]
         ↓
[Script Engine: Deterministic Generation]
         ↓
[Verifier: TypeScript, Build, Schema Drift]
         ↓
[Brain: Update context.json + Registries]
```

### The 5 Core Principles

1. **Deterministic Compilation**
   - LLM interprets intent into ASL (Abstract Specification Language)
   - Scripts generate code (no LLM involved in generation)
   - Same manifest always produces same output

2. **Canonical Project State**
   ```
   .mycontext/
   ├── context.json              # Master brain
   ├── components_registry.json  # Component catalog
   ├── types_registry.json       # Type definitions
   ├── design_manifest.json      # Design tokens
   └── permissions_manifest.json # RBAC rules
   ```

3. **Recursive Clarification Loop**
   - Agent asks questions until manifest is 100% complete
   - User answers 100 questions if needed (certainty > speed)
   - No code generation until specification is perfect

4. **Separation of Concerns**
   - LLM: Natural language → ASL
   - Planner: Validate, detect gaps, query user
   - Scripts: Generate files deterministically
   - Verifier: TypeScript, build, lint, schema drift

5. **Iterative Refinement**
   - Templates improve with each project
   - Future projects benefit automatically
   - Goal: 99% correct by Project 20

---

## 📦 What Gets Generated

The "mega script" scaffolds a **COMPLETE Next.js application** including:

- ✅ Full project scaffold (Next.js 15+ App Router)
- ✅ Pages, layouts, nested routes
- ✅ Client and server components
- ✅ Server actions and data manipulation
- ✅ Authentication flows (login, register, logout)
- ✅ Role-based access control (guards, middleware)
- ✅ Permission checks (RBAC)
- ✅ User profile pages
- ✅ shadCN UI components (fully typed props, animations)
- ✅ InstantDB schema (instant.schema.ts)
- ✅ TypeScript types (Insert, WithRelations, entity types)
- ✅ **Everything defined in the manifest**

**Manual refinement limited to:**
- Optional advanced UX features
- Fine-tuning component behaviors
- User-specific styling preferences

---

## 🚀 Quick Start

### Installation

```bash
# Install globally
npm install -g mycontext-cli

# Or use with npx
npx mycontext-cli init
```

### Usage (New Workflow)

```bash
# Step 1: Initialize with recursive clarification
mycontext init --interactive

# The agent will ask questions until your specification is 100% complete:
# - "Which auth provider?"
# - "What roles do you need?"
# - "What fields should a Post have?"
# Answer all questions → Agent builds complete manifest

# Step 2: Review and approve the diff
# The planner shows exactly what will be generated
# [Approve / Modify / Cancel]

# Step 3: Run the mega-script to scaffold entire project
mycontext scaffold --from-manifest

# Step 4: Verify build
mycontext doctor

# Done! Your complete app is ready.
```

---

## 📖 Commands Reference

### `mycontext init --interactive`

**Start the recursive clarification loop.**

The agent asks questions until your specification is 100% complete. No guessing.

```bash
mycontext init --interactive
```

**Example Session:**
```
Agent: "What are you building?"
User: "A blog with authentication"

Agent: "Which auth provider?"
  [ ] Email/password
  [ ] OAuth GitHub
  [ ] OAuth Google

Agent: "What roles do you need?"
User: "Admin, Author, Reader"

Agent: "What fields should a Post have?"
Suggested: title, content, author_id, published_at
User: [Confirm or add more]

... continues until 100% complete ...

Agent: "Manifest is complete. Ready to generate."
```

---

### `mycontext scaffold --from-manifest`

**Generate the entire project from the validated manifest.**

This is the "mega script" that deterministically creates all files.

```bash
mycontext scaffold --from-manifest
```

**Output:**
```
✓ Generated instant.schema.ts (3 entities, 2 links)
✓ Generated types/schema.ts (Insert, WithRelations types)
✓ Generated 7 pages
✓ Generated 12 components
✓ Generated 3 action files
✓ Generated auth guards and middleware
✓ Updated registries

Total: 35 files created
Build: ✓ Passed
Doctor: ✓ All checks passed
```

---

### `mycontext doctor`

**Verify your project for type safety, schema drift, and best practices.**

```bash
mycontext doctor

# Auto-fix issues
mycontext doctor --fix

# Show detailed diagnostics
mycontext doctor --verbose

# Run only specific checks
mycontext doctor --category typescript
```

**Checks:**
- ✅ TypeScript compilation
- ✅ Schema field drift detection (NEW!)
  - Catches: `payment.payment_method` when schema has `payment.method`
- ✅ `as any` cast detection (NEW!)
- ✅ Unknown[] transaction array typing (NEW!)
- ✅ Duplicate type declarations (NEW!)
- ✅ Next.js best practices
- ✅ Dead code detection

---

### `mycontext sync`

**Update the canonical brain after manual code changes.**

```bash
# Full sync (context.json + README)
mycontext sync

# Preview changes
mycontext sync --dry-run

# Sync only context or README
mycontext sync --context
mycontext sync --readme
```

**How it works:**
1. Scans project files
2. Compares against context.json
3. Detects drift (code changed but brain didn't)
4. Updates brain with AI-generated diff
5. Regenerates README

---

### `mycontext generate types --from-schema`

**Generate TypeScript types from InstantDB schema.**

```bash
mycontext generate types --from-schema
```

**Output:** `.mycontext/types.ts` with:
- Entity types (`User`, `Post`, `Comment`)
- Insert types (`PostInsert` = `Omit<Post, "id" | "created_at">`)
- WithRelations types (`PostWithRelations` = `Post & { author?: User; comments?: Comment[] }`)
- Component prop types
- Dummy data generators

---

## 🧪 Progressive Testing Roadmap

We build MyContext iteratively through progressive complexity:

| Phase | Complexity | Example | Goal |
|-------|------------|---------|------|
| **Phase 1** | ★☆☆☆☆ | Todo App | Prove deterministic scaffolding works |
| **Phase 2** | ★★★☆☆ | Blog (Auth) | Prove auth guards and RBAC work |
| **Phase 3** | ★★★★☆ | E-commerce | Prove complex state management works |
| **Phase 4** | ★★★★★ | SaaS Dashboard | Prove enterprise-grade scaffolding |

See [docs/TESTING_ROADMAP.md](./docs/TESTING_ROADMAP.md) for full details.

---

## 📚 Documentation

- [**ARCHITECTURE.md**](./docs/ARCHITECTURE.md) — System layers, data flow, registries
- [**COMPILER_SPEC.md**](./docs/COMPILER_SPEC.md) — Input/output contracts, script templates
- [**TESTING_ROADMAP.md**](./docs/TESTING_ROADMAP.md) — Progressive complexity plan
- [**ALIGN**](../.mycontext/ALIGN) — Philosophical foundation

---

## 🔧 Technology Stack

- **TypeScript** — Type-safe script templates
- **Next.js 15+** — App Router, Server Components
- **InstantDB** — Realtime database with schema
- **shadCN** — UI component library
- **Commander.js** — CLI framework

---

## 🎨 Example: Blog Generation

### Input (Natural Language)
```
"Build a blog with user authentication.
Authors can create and edit posts.
Readers can view and comment."
```

### Agent Questions
```
1. Auth provider? → Email/password
2. Post fields? → title, content, published, author_id
3. Comment nesting? → Flat
4. Markdown support? → Yes
```

### Generated Output (35 files)
```
src/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── (dashboard)/
│   │   ├── posts/
│   │   │   ├── page.tsx
│   │   │   ├── [id]/page.tsx
│   │   │   ├── [id]/edit/page.tsx
│   │   │   └── new/page.tsx
│   │   └── layout.tsx (with auth guard)
│   └── page.tsx
├── components/
│   ├── auth/ (LoginForm, RegisterForm)
│   ├── posts/ (PostCard, PostList, PostForm)
│   └── comments/ (CommentList, CommentForm)
├── actions/
│   ├── auth.ts (login, register, logout)
│   ├── posts.ts (CRUD)
│   └── comments.ts (CRUD)
└── lib/
    ├── guards.ts (withAuthGuard, withRoleGuard)
    └── permissions.ts (hasPermission, canEdit)

instant.schema.ts (User, Post, Comment entities)
middleware.ts (route protection)
```

### Verification
```bash
$ mycontext doctor
✓ TypeScript compilation passed
✓ Schema drift check passed
✓ Build successful
```

---

## 🚢 Differentiators

| Traditional AI Generators | MyContext Compiler |
|---------------------------|-------------------|
| LLM writes code directly | LLM only parses intent |
| Trial-and-error generation | Deterministic script execution |
| Unpredictable output | Output matches manifest exactly |
| No validation before generation | 100% spec validation required |
| Hallucinations common | Zero hallucination (no LLM in generation) |
| Hard to debug | Transparent script templates |
| Doesn't improve over time | Templates refine with each project |

---

## 🛣️ Roadmap

- [x] Phase 1: Doctor command with type safety checks
- [x] Phase 1: Type generation from InstantDB schema
- [ ] Phase 2: `init --interactive` recursive clarification
- [ ] Phase 2: `scaffold --from-manifest` deterministic generation
- [ ] Phase 3: Component registry implementation
- [ ] Phase 3: Permissions manifest validation
- [ ] Phase 4: Progressive testing (Todo → Blog → E-commerce → SaaS)
- [ ] Phase 5: Visual schema builder
- [ ] Phase 6: Template marketplace

---

## 🤝 Contributing

We welcome contributions! Areas of focus:

1. **Script templates** — Improve deterministic generators
2. **Validation rules** — Add planner checks
3. **Doctor diagnostics** — New type safety rules
4. **Testing** — Help test progressive complexity phases

---

## 📄 License

MIT © [MyContext Team](https://github.com/farajabien/mycontext-cli)

---

## 🙏 Acknowledgments

Built with:
- [InstantDB](https://instantdb.com) — Realtime database
- [shadCN](https://ui.shadcn.com) — UI components
- [Next.js](https://nextjs.org) — React framework
- [Commander.js](https://github.com/tj/commander.js) — CLI framework

---

## 📧 Contact & Support

- **Issues:** [GitHub Issues](https://github.com/farajabien/mycontext-cli/issues)
- **Discussions:** [GitHub Discussions](https://github.com/farajabien/mycontext-cli/discussions)
- **Twitter:** [@mycontextcli](https://twitter.com/mycontextcli)

---

**This is not just a tool—it's a paradigm shift in full-stack development.**

```bash
npx mycontext-cli init --interactive
```

Let's build the future, deterministically.
