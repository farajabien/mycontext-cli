# mycontext-cli

> The Context Engine for AI-Native Development.  
> Generate high-fidelity scaffolds, maintain a **Living Brain**, and drive your entire codebase with a single source of truth.

[![npm version](https://img.shields.io/npm/v/mycontext-cli)](https://www.npmjs.com/package/mycontext-cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

## Table of Contents

- [What is MyContext?](#what-is-mycontext)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Core Concepts](#core-concepts)
- [Command Reference](#command-reference)
  - [Project Setup](#project-setup)
  - [Living Brain](#living-brain)
  - [AI Agent & Planning](#ai-agent--planning)
  - [Code Generation](#code-generation)
  - [Analysis & Diagnostics](#analysis--diagnostics)
  - [Maintenance](#maintenance)
- [Typical Workflow](#typical-workflow)
- [Environment Variables](#environment-variables)
- [Configuration](#configuration)

---

## What is MyContext?

MyContext treats your project spec as a **Living Brain** — a structured JSON document (`.mycontext/context.json`) that describes your app's goals, architecture, components, and design system. 

Every CLI command — such as screen mapping or component discovery — automatically synchronizes its results back into this central Brain, ensuring your documentation and your code remain perfectly aligned.

---

## Installation

```bash
npm install -g mycontext-cli
# or
pnpm add -g mycontext-cli
```

Verify:

```bash
mycontext --version
```

---

## Quick Start

```bash
# 1. Go to your project folder (or an empty directory)
cd my-app

# 2. Initialise the Living Brain
mycontext init

# 3. Configure your AI provider
mycontext setup

# 4. Generate the full context from your PRD
mycontext generate context --full

# 5. Scaffold the entire application
mycontext build
```

---

## Core Concepts

| Concept | What it is |
|---|---|
| **Living Brain** | `.mycontext/context.json` — single source of truth for your project |
| **PRD** | `.mycontext/01-prd.md` — your product requirements document |
| **Design Manifest** | AI-derived design system snapshot |
| **Sub-agents** | Specialised AI workers (CodeGen, QA, Architect, Security, …) |
| **FSR** | Feature Spec Record — structured description of a single feature |

---

## Command Reference

### Project Setup

#### `mycontext init [project-name]`

Initialise a new MyContext project. Creates `.mycontext/` with your PRD template, context skeleton, and (optionally) a framework scaffold.

```bash
mycontext init my-saas-app
mycontext init --framework nextjs          # Next.js + shadcn/ui
mycontext init --framework instantdb       # Next.js + InstantDB + shadcn (default)
mycontext init --framework other           # MyContext files only
mycontext init --interactive               # Guided 100%-complete spec wizard
mycontext init --spec-only                 # Context files only, no framework setup
```

#### `mycontext setup`

Configure AI providers (Anthropic, OpenAI, xAI) and your development stack.

```bash
mycontext setup
mycontext setup --stack nextjs-tailwind-shadcn
```

#### `mycontext auth`

Authenticate with the MyContext AI cloud service.

```bash
mycontext auth --login
mycontext auth --status
mycontext auth --logout
```

#### `mycontext setup-shadcn`

Add shadcn/ui to an existing project and wire it to the Living Brain.

#### `mycontext setup-database`

Set up a database provider (InstantDB, Supabase, Firebase) with schema and auth components.

```bash
mycontext setup-database --provider instantdb
```

#### `mycontext setup-instantdb`

Full InstantDB + MCP integration wizard.

```bash
mycontext setup-instantdb --app-id <id> --token <token>
```

#### `mycontext setup-mcp`

Configure a Model Context Protocol (MCP) server for AI-powered tooling.

```bash
mycontext setup-mcp --provider instantdb
mycontext setup-mcp --provider github
mycontext setup-mcp --provider custom --server <url>
```

---

### Living Brain

#### `mycontext generate [type]`

Orchestrate the Living Brain — generate context files, types, brand tokens, and more. All generation commands automatically synchronize their results into `.mycontext/context.json`.

```bash
mycontext generate context --full          # Full PRD + A/B/C/D context files
mycontext generate context                 # Incremental update
mycontext generate:screens-list            # Sync routes to the Brain
mycontext generate:components-manifest     # Sync component specs to the Brain
mycontext generate design-prompt           # AI design brief for UI designer
mycontext generate actions                 # UI→backend action hooks
mycontext generate assets                  # Planned asset list
mycontext generate sample-data             # Seed data for development
```

#### `mycontext sync`

Auto-update `context.json` and `README.md` by scanning the live codebase.

```bash
mycontext sync                   # Sync both
mycontext sync --context         # context.json only
mycontext sync --readme          # README.md only
mycontext sync --dry-run         # Preview changes without writing
```

#### `mycontext sync-readme`

Synchronise the root `README.md` with your design manifest.

#### `mycontext validate <target>`

Validate your PRD or context files for completeness.

```bash
mycontext validate prd
mycontext validate context
mycontext validate --interactive
```

#### `mycontext status`

Show current project status and progress against the Living Brain.

```bash
mycontext status
mycontext status --detailed
```

---

### AI Agent & Planning

#### `mycontext agent [prompt]`

Assess a natural-language prompt against the Living Brain and propose (or apply) changes.

```bash
mycontext agent "Add a dark mode toggle to the nav"
mycontext agent "Add a dark mode toggle" --execute   # Apply changes
mycontext agent "..." --execute --yes                # Skip confirmation
```

#### `mycontext plan`

Interactive feature planning session — produces an FSR (Feature Spec Record).

```bash
mycontext plan
```

#### `mycontext build-strategy`

Generate an AI-powered build strategy and execution plan from the current Brain state.

#### `mycontext ideate`

Generate creative UI/UX concepts based on project context.

```bash
mycontext ideate --industry fintech --count 5
```

---

### Code Generation

#### `mycontext build`

Scaffold the **entire** application from the Living Brain in one shot.

```bash
mycontext build
mycontext build --force    # Regenerate all components
```

#### `mycontext build-feature`

Build a single feature end-to-end from an FSR.

#### `mycontext generate-components [target]`

Generate React components from the component manifest.

```bash
mycontext generate-components all
mycontext generate-components --core-only     # First 10 components only
mycontext generate-components --group forms
mycontext generate-components all --with-tests
```

#### `mycontext add <component>`

Add a context-aware component (shadcn primitive or custom).

```bash
mycontext add button
mycontext add UserCard --group cards
mycontext add dialog --shadcn
```

#### `mycontext enhance`

Enhance the project or specific components with AI suggestions.

#### `mycontext refine`

Refine context or components.

#### `mycontext refine:component <componentName>`

Refine a single component with targeted AI feedback.

```bash
mycontext refine:component HeroSection --variant mobile
mycontext refine:component NavBar --in-place
```

#### `mycontext migrate [target]`

Migrate components to new standards.

```bash
mycontext migrate rtl                          # RTL-friendly logical CSS properties
mycontext migrate rtl --path src/components/Nav.tsx
mycontext migrate radix --all                  # Refactor to Radix/shadcn primitives
```

---

### Analysis & Diagnostics

#### `mycontext analyze`

Analyse an **existing** project and generate context files from the live codebase.

```bash
mycontext analyze
mycontext analyze --image ./screenshot.png    # Analyse a mockup instead
mycontext analyze --verbose
```

#### `mycontext design`

Design system analysis and manifest generation.

```bash
mycontext design --analyze
mycontext design --validate
mycontext design --summary
mycontext design --regenerate
```

#### `mycontext scan`

Scan the project tree and assess progress against the Living Brain.

```bash
mycontext scan
mycontext scan --assess          # AI progress assessment
mycontext scan --assess --json   # Machine-readable output
```

#### `mycontext health-check`

Run health checks across the project.

#### `mycontext doctor`

Full diagnostic check with auto-fix suggestions.

#### `mycontext sanitize`

Find and optionally remove redundant, duplicate, or unreachable code.

```bash
mycontext sanitize
mycontext sanitize --fix
mycontext sanitize --verbose
```

#### `mycontext generate-todos`

Generate a contextual todo list from the project's current state.

```bash
mycontext generate-todos --count 10 --energy high --complexity moderate
```

---

### Maintenance

#### `mycontext update`

Update the CLI to the latest published version.

```bash
mycontext update
```

#### `mycontext clean`

Clean and repair malformed context files.

```bash
mycontext clean
mycontext clean --project ./path/to/project
```

#### `mycontext help [topic]`

Context-aware help for any topic or command.

```bash
mycontext help
mycontext help agent
mycontext help generate --verbose
```

---

## Typical Workflow

### Starting a new project

```bash
mkdir my-app && cd my-app
mycontext init --spec-only            # Context files only
mycontext setup                       # Configure AI keys (Gemini, Claude, etc.)
mycontext generate context --full     # Build the Living Brain
mycontext generate:screens-list       # Map routes to Brain
mycontext generate:components-manifest # Map component specs to Brain
mycontext generate:design-prompt      # Ready for UI designer handoff
```

### Adding a feature to an existing project

```bash
mycontext plan                        # Describe the feature interactively
mycontext build-feature               # Generate code from the FSR
mycontext sync                        # Keep context.json in sync
```

### Adopting MyContext on an existing codebase

```bash
cd existing-project
mycontext analyze                     # Reverse-engineer context from code
mycontext generate context            # Fill gaps with AI
mycontext status                      # See what's covered
```

---

## Environment Variables

MyContext loads `.env` files from your project automatically. You can also set these directly:

| Variable | Description |
|---|---|
| `ANTHROPIC_API_KEY` | Anthropic Claude API key |
| `OPENAI_API_KEY` | OpenAI API key |
| `XAI_API_KEY` | xAI (Grok) API key |
| `MYCONTEXT_API_KEY` | MyContext cloud service key |
| `INSTANTDB_APP_ID` | InstantDB application ID |

Loaded in order (first match wins):  
`.mycontext/.env.local` → `.mycontext/.env` → `.env.local` → `.env`

---

## Configuration

All project configuration lives in `.mycontext/`:

```
.mycontext/
├── context.json        ← Living Brain (source of truth)
├── 01-prd.md           ← Product Requirements Document
├── .env.local          ← Local secrets (git-ignored)
└── ...                 ← Generated context files
```

---

## Links

- [GitHub](https://github.com/farajabien/mycontext-cli)
- [Issues](https://github.com/farajabien/mycontext-cli/issues)
- [npm](https://www.npmjs.com/package/mycontext-cli)

---

*Built with MyContext — spec-driven development for the AI era.*
