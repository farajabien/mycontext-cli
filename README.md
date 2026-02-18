# MyContext Monorepo

<p align="center">
  <img src="https://raw.githubusercontent.com/farajabien/mycontext-cli/main/public/mycontext-logo.png" alt="MyContext Logo" width="200" />
</p>

**Zero-Drift Autonomous Development — Spec-Driven App Evolution with a Deterministic Physics Engine.**

> **"Agent skills are cool, but without a Brain, they're just markdown files."**

This monorepo contains the **MyContext** ecosystem: The first **Living Brain** for your codebase. It grounds AI agents in a deterministic "Context" (`context.json`), ensuring that every line of code generated is perfectly aligned with your design intent.

---

## 🏗️ Repository Structure

### 📦 Apps

- **[`apps/cli`](./apps/cli)** - `mycontext-cli`
  The command-line interface for initializing projects, analyzing screenshots, generating context, and autonomous code evolution.
  📚 [CLI Documentation](./apps/cli/README.md) | 📦 [npm package](https://www.npmjs.com/package/mycontext-cli)

- **[`apps/web`](./apps/web)** - MyContext Landing Page
  Marketing website and visual studio (in development) for the MyContext ecosystem.

- **[`apps/vscode`](./apps/vscode)** - VS Code Extension
  MyContext integration for Visual Studio Code (in development).

### 📚 Packages

- **[`packages/core`](./packages/core)** - `@myycontext/core`
  Shared manifest management, architectural types, and the deterministic "Living DB" engine.
  📚 [Core Documentation](./packages/core/README.md) | 📦 [npm package](https://www.npmjs.com/package/@myycontext/core)

---

## 🚀 Quick Start

### For Users (Install Published Packages)

```bash
# Install the CLI globally
npm install -g mycontext-cli

# Or use with npx
npx mycontext-cli init

# Initialize a project
mycontext init

# Analyze a screenshot and generate specs
mycontext analyze screenshot.png

# Generate full context for AI coding
mycontext generate context --full
```

### For Contributors (Local Development)

MyContext uses **Turborepo** and **pnpm** for monorepo management.

```bash
# 1. Clone the repository
git clone https://github.com/farajabien/mycontext-cli.git
cd mycontext-cli

# 2. Install dependencies
pnpm install

# 3. Build all packages
pnpm run build

# 4. Link CLI for local testing
cd apps/cli && pnpm link --global

# 5. Start development servers
pnpm run dev
```

#### Development Workflow

```bash
# Build specific package
pnpm --filter mycontext-cli build
pnpm --filter @myycontext/core build

# Run tests
pnpm run test

# Lint code
pnpm run lint

# Clean all build artifacts
pnpm run clean
```

---

## 🎯 Project Vision (Living DB)

## 🛡️ Maintainer Guard: `.ALIGN`
To keep this project's "Living Brain" and documentation in sync, always mention or include `.mycontext/ALIGN` in your prompts when working with an AI. It forces the AI to update `.mycontext/context.json` and this `README.md` alongside any code changes.

<!-- mycontext:start -->
### 🎯 Project Overview
**MyContext**: The deterministic anchor for AI-powered development. Ground your agents in specs, not hallucinations. An *agent-for-agents* platform that builds a **Living Brain** (`context.json`) so AI agents operate with 100% knowledge.

### ✨ Key Capabilities
| Command | Description |
|---------|-------------|
| `mycontext init` | Interactive TUI interview OR **Auto-Init** for existing projects (AI narrative generation) |
| `mycontext scan --assess` | Walk file tree → LLM compares code vs context → bidirectional drift detection |
| `mycontext sync` | **NEW** — Autonomous self-recontextualization: scan → assess → deep merge context.json + LLM-generate README |
| `mycontext generate` | Deterministic code generation from 100% populated MegaContext |
| `mycontext agent` | Multi-agent task execution via Brain blackboard pattern |

### 🏛️ Architecture
- **Unified Context Schema** — `MegaContext` (typed scaffolding) + `Brain` (narrative, registry, memory) coexist in one `context.json`
- **Deep Merge** — Recursive merge with array dedup (no more data loss on context updates)
- **Fractal Architecture** — Recursive decomposition → atomic assembly
- **Lego Assembly** — Component registry + semantic retrieval + assembly prompting

### 📊 Project Status
| Phase | Status |
|-------|--------|
| Foundation & CLI Core | ✅ Complete |
| Multi-Agent Architecture | ✅ Complete |
| Fractal Architecture & Lego Assembly | ✅ Complete |
| Project Scanner & Context Sync | ✅ Complete |
| Self-Recontextualization & Unified Context | ✅ Complete |

---
_Last synchronized with MyContext Living Brain on 2026-02-17_
<!-- mycontext:end -->

---

## 📦 Publishing Packages

To publish packages to npm:

```bash
# Publish CLI
cd apps/cli
npm version patch  # or minor, major
npm publish

# Publish Core
cd packages/core
npm version patch
npm publish
```

---

## 🤝 Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Project Structure Guidelines
- Keep packages focused and modular
- Shared types and utilities go in `@myycontext/core`
- CLI commands should be self-contained
- All packages must build successfully before publishing

---

## 📄 License

MIT © MyContext - See [LICENSE](LICENSE) for details.

---

## 🔗 Links

- [CLI Documentation](./apps/cli/README.md)
- [Core Package Documentation](./packages/core/README.md)
- [npm: mycontext-cli](https://www.npmjs.com/package/mycontext-cli)
- [npm: @myycontext/core](https://www.npmjs.com/package/@myycontext/core)
- [Report Issues](https://github.com/farajabien/mycontext-cli/issues)
