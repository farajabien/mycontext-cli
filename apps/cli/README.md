# mycontext-cli

**The Command-Line Brain for Zero-Drift Autonomous Development.**

`mycontext-cli` is your AI-powered development companion that builds a **Living Brain** (`context.json`) for your codebase — so AI agents operate on facts, not hallucinations. It scaffolds projects deterministically, detects context drift, and keeps your implementation perfectly aligned with design intent.

[![npm version](https://img.shields.io/npm/v/mycontext-cli.svg)](https://www.npmjs.com/package/mycontext-cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## ✨ Key Features

- 🧠 **Living Brain** — A single source of truth (`context.json`) that acts as the shared "blackboard" for all agents
- 🔄 **Self-Recontextualization** — `mycontext sync` autonomously updates context + README by scanning your actual code
- 📂 **Bidirectional Drift Detection** — Finds what's in code but not in context, and vice versa
- 🏗️ **Deterministic Scaffolding** — AI interview → MegaContext → scaffold with zero guessing
- 🧱 **Lego Assembly** — Component registry + semantic retrieval for consistent code generation
- 🌲 **Fractal Architecture** — Recursive decomposition down to atomic UX flows
- 🤖 **Scalable Agent Teams** — Agents coordinate via shared state, not fragile message-passing

---

## 🚀 Installation

```bash
# Install globally
npm install -g mycontext-cli

# Or use without installation
npx mycontext-cli init
```

---

## 🛠️ Commands Reference

### `mycontext init`
Interactive TUI that interviews you → builds a complete MegaContext → deterministically scaffolds.

```bash
mycontext init
```

**What it does:**
- Detects existing context.json → offers Refine / Scan / Sync / Fresh
- AI-driven interview to populate MegaContext (entities, routes, roles, design)
- Scaffolds Next.js + InstantDB with schema, routes, ALIGN, README, .env

---

### `mycontext scan`
Walk the real file tree and compare against your planned context.

```bash
# Quick scan — file tree stats
mycontext scan

# AI-powered assessment — drift detection + merge suggestions
mycontext scan --assess

# Machine-readable output
mycontext scan --assess --json
```

---

### `mycontext sync` ✨ NEW
Autonomous self-recontextualization. Scans → assesses → deep merges context.json → LLM-generates README.

```bash
# Full sync (context.json + README)
mycontext sync

# Preview changes without writing
mycontext sync --dry-run

# Sync only context or only README
mycontext sync --context
mycontext sync --readme
```

**How it works:**
1. `ProjectScanner` walks your file tree and reads key files
2. LLM compares actual code vs. planned context → generates `ContextDiffReport`
3. `deepMerge()` safely updates context.json (recursive, arrays deduped by name/id)
4. LLM generates README content between `<!-- mycontext:start -->` / `<!-- mycontext:end -->` markers

---

### `mycontext generate`
Generate context files, types, and code from your specifications.

```bash
# Full context generation
mycontext generate context --full

# Generate types from schema
mycontext generate types --from-schema

# Generate components
mycontext generate components
```

---

### `mycontext agent`
Multi-agent task execution via the Brain blackboard pattern.

```bash
# Plan a feature
mycontext agent --plan "Add user authentication"

# Execute autonomously
mycontext agent --execute "Implement shopping cart"
```

---

### `mycontext analyze`
Reverse-engineer UI from screenshots into specifications.

```bash
mycontext analyze screenshot.png
```

---

## 🎯 Quick Start

```bash
# 1. Initialize (in any project directory)
npx mycontext-cli init

# 2. Configure AI (choose one — all have free tiers)
echo 'GEMINI_API_KEY=your-key' >> .mycontext/.env
# Or: GITHUB_TOKEN, OPENROUTER_API_KEY, ANTHROPIC_API_KEY, XAI_API_KEY

# 3. Scan your project
mycontext scan --assess

# 4. Auto-sync context + README
mycontext sync
```

---

## 🔧 AI Provider Setup

Configure in `.mycontext/.env` — MyContext auto-detects whichever key is present:

| Provider | Env Variable | Free Tier | Get Key |
|----------|-------------|-----------|---------|
| **Gemini** | `GEMINI_API_KEY` | ✅ Yes | [aistudio.google.com/apikey](https://aistudio.google.com/apikey) |
| **GitHub Models** | `GITHUB_TOKEN` | ✅ Yes | [github.com/settings/tokens](https://github.com/settings/tokens) |
| **OpenRouter** | `OPENROUTER_API_KEY` | Credits | [openrouter.ai/keys](https://openrouter.ai/keys) |
| **Anthropic** | `ANTHROPIC_API_KEY` | Credits | [console.anthropic.com](https://console.anthropic.com/) |
| **xAI (Grok)** | `XAI_API_KEY` | Credits | [x.ai](https://x.ai/) |

Provider fallback chain: Gemini → GitHub Models → OpenRouter → Anthropic → xAI

---

## 📁 Project Structure

After running `mycontext init`:

```
.mycontext/
├── .env                      # AI provider keys
├── context.json              # Living Brain — primary source of truth
├── ALIGN                     # Alignment Guard — rules for AI assistants
└── context/                  # Exported Markdown views for humans/AI
    ├── 01-prd.md
    ├── 01a-features.md
    └── ...
```

---

## 🏛️ Architecture: Unified Context

`context.json` supports two schemas that coexist:

| Schema | Purpose | Key Fields |
|--------|---------|------------|
| **MegaContext** | Deterministic scaffolding | `database.entities`, `routing.routes`, `auth.roles`, `topLevelDesign` |
| **Brain** | Existing/scanned projects | `brain.narrative`, `brain.registry`, `brain.checkpoints`, `brain.memory` |

The `UnifiedContext` type bridges both. `getContextSummary()` extracts data from either shape. `deepMerge()` safely combines them.

---

## 🎯 Philosophy: Hard Gravity

Every project starts with a **deterministic spec**. The CLI ensures code never drifts from design intent:

1. **Interview → MegaContext** — AI-driven 100% knowledge collection
2. **MegaContext → Scaffold** — Deterministic generation, zero guessing
3. **Scan → Assess** — Continuous bidirectional drift detection
4. **Sync → Update** — Autonomous self-recontextualization
5. **Never Drift** — Living Brain maintains alignment

---

## 🤝 Contributing

This package is part of the [MyContext Monorepo](https://github.com/farajabien/mycontext-cli).

```bash
git clone https://github.com/farajabien/mycontext-cli.git
cd mycontext-cli
pnpm install
pnpm run build
cd apps/cli && pnpm link --global
```

---

## 📄 License

MIT © MyContext — See [LICENSE](https://github.com/farajabien/mycontext-cli/blob/main/LICENSE)

## 🔗 Links

- [Monorepo](https://github.com/farajabien/mycontext-cli)
- [npm Package](https://www.npmjs.com/package/mycontext-cli)
- [Report Issues](https://github.com/farajabien/mycontext-cli/issues)
- [Core Package (@myycontext/core)](https://www.npmjs.com/package/@myycontext/core)
