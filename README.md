# MyContext Monorepo

<p align="center">
  <img src="https://raw.githubusercontent.com/farajabien/mycontext-cli/main/public/mycontext-logo.png" alt="MyContext Logo" width="200" />
</p>

**Domain-Specific Natural Language Compiler (DS-NLC) for Next.js full-stack applications.**

> **"Agent skills are cool, but without a deterministic compilation step, they're just markdown files."**

This monorepo contains the **MyContext** ecosystem: The first compiler that turns your conversational intent into a deterministic **Feature Structured Representation (FSR)** and mathematically scaffolds a complete Next.js architecture with zero hallucination.

## 🎯 NEW: Unified Brain-First Workflow (VERIFIED ✓)

The CLI has been transformed into a **Brain-First** orchestrator. The `context.json` (The Living Brain) is now the single source of truth for your entire project, from PRD to Types and Brand Guidelines.

**Key Features**:
1. **Unified Sync**: `mycontext generate context --full` captures requirements, design tokens, and type definitions in a single high-fidelity AI pass.
2. **Project Cockpit**: Running `mycontext` without arguments launches an interactive TUI dashboard to manage your project's health and triggers.
3. **Deterministic Scaffolding**: Render your validated "Brain" into strictly typed Next.js App Router code with zero hallucination.

## 🧠 Core Philosophy

MyContext is **NOT** a free-wheeling autonomous coding agent. It is a **compiler** with a conversational frontend.

- ❌ LLMs do not write your application's raw files.
- ❌ No unpredictable trial-and-error code generation.
- ✅ LLMs parse intent and generate a unified **Living Brain (`context.json`)**.
- ✅ Deterministic script engines render the Brain into production-ready source code.
- ✅ Exact, predictable, testable, and strictly typed scaffold outputs.

---

## 🏗️ Repository Structure

### 📦 Apps

- **[`apps/cli`](./apps/cli)** - `mycontext-cli`
  The Brain-First Compiler & Project Cockpit. Contains the interactive Planner, TUI Dashboard, and Unified Scaffold Generator.
  📚 [CLI Documentation](./apps/cli/README.md) | 📦 [npm package](https://www.npmjs.com/package/mycontext-cli)

- **[`apps/web`](./apps/web)** - MyContext Web
  Landing page and visual studio (in development) for the MyContext ecosystem.
  📚 [Web Documentation](./apps/web/README.md)

### 📚 Packages

- **[`packages/core`](./packages/core)** - `@myycontext/core`
  Fundamental shared types and schemas including the **Living Context** definitions. 
  📚 [Core Documentation](./packages/core/README.md) | 📦 [npm package](https://www.npmjs.com/package/@myycontext/core)

---

## 🚀 Quick Start

### Installation

```bash
# Install the CLI globally
npm install -g mycontext-cli

# 1. Initialize a project and establish the local brain
mycontext init my-project --framework instantdb

# 2. Sync the brain (PRD + Types + Brand + Components)
mycontext generate context --full --description "A modern task manager"

# 3. Scaffold the complete application from the internal specs
mycontext generate-components all

# 4. Launch the project cockpit
mycontext
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
```

---

## 📦 Publishing Packages

To publish packages to npm:

```bash
# Publish Core
cd packages/core && npm version patch && npm publish

# Publish CLI
cd apps/cli && npm version patch && npm publish
```

---

## 🤝 Contributing & License

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.
MIT © MyContext - See [LICENSE](LICENSE) for details.

### 🔗 Links
- [CLI Package](https://www.npmjs.com/package/mycontext-cli)
- [Core Package](https://www.npmjs.com/package/@myycontext/core)
- [Report Issues](https://github.com/farajabien/mycontext-cli/issues)
