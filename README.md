# MyContext Monorepo

<p align="center">
  <img src="https://raw.githubusercontent.com/farajabien/mycontext-cli/main/public/mycontext-logo.png" alt="MyContext Logo" width="200" />
</p>

**Domain-Specific Natural Language Compiler (DS-NLC) for Next.js full-stack applications.**

> **"Agent skills are cool, but without a deterministic compilation step, they're just markdown files."**

This monorepo contains the **MyContext** ecosystem: The first compiler that turns your conversational intent into a deterministic **Feature Structured Representation (FSR)** and mathematically scaffolds a complete Next.js architecture with zero hallucination.

## 🎯 NEW: Phase 0 DS-NLC Compiler (VERIFIED ✓)

The CLI pipeline has been successfully transformed into a rigorous Domain-Specific Natural Language Compiler. 

**Core Accomplishments**:
1. **FSR Schema (AST)**: A strict JSON structure mapping features to pages, client/server components, server actions, data models, and UI rules.
2. **Planner Module**: Isolates LLM intent parsing from file generation. Interactive terminal clarification ensures 100% specification certainty.
3. **Deterministic Scaffold Generator**: Generates strictly typed Next.js App Router code, shadcn UI components, and InstantDB models utilizing zero machine-learning inference. Same FSR inputs always produce the exact same project output.

## 🧠 Core Philosophy

MyContext is **NOT** a free-wheeling autonomous coding agent. It is a **compiler** with a conversational frontend.

- ❌ LLMs do not write your application's raw files.
- ❌ No unpredictable trial-and-error code generation.
- ✅ LLMs parse intent and generate an Abstract Specification Language (FSR).
- ✅ Deterministic script engines render the FSR into Next.js source code.
- ✅ Exact, predictable, testable, and strictly typed scaffold outputs.

---

## 🏗️ Repository Structure

### 📦 Apps

- **[`apps/cli`](./apps/cli)** - `mycontext-cli`
  The Domain-Specific Natural Language Compiler. Contains the interactive Planner, FSR schema validators, and the Deterministic Scaffold Generator.
  📚 [CLI Documentation](./apps/cli/README.md) | 📦 [npm package](https://www.npmjs.com/package/mycontext-cli)

- **[`apps/web`](./apps/web)** - MyContext Web
  Landing page and visual studio (in development) for the MyContext ecosystem.
  📚 [Web Documentation](./apps/web/README.md)

### 📚 Packages

- **[`packages/core`](./packages/core)** - `@myycontext/core`
  The fundamental shared types and schemas including the immutable **FSR (Feature Structured Representation)** definitions. 
  📚 [Core Documentation](./packages/core/README.md) | 📦 [npm package](https://www.npmjs.com/package/@myycontext/core)

---

## 🚀 Quick Start

### Installation

```bash
# Install the CLI globally
npm install -g mycontext-cli

# Initialize a project and generate FSR specification
mycontext plan "A todo app with local storage"

# Scaffold code from your generated FSR into Next.js App Router
mycontext build --feature add_todo
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
