# MyContext Monorepo

<p align="center">
  <img src="https://raw.githubusercontent.com/farajabien/mycontext-cli/main/public/mycontext-logo.png" alt="MyContext Logo" width="200" />
</p>

**Zero-Drift Autonomous Development — Spec-Driven App Evolution with a Deterministic Physics Engine.**

> **"Agent skills are cool, but without a Brain, they're just markdown files."**

This monorepo contains the **MyContext** ecosystem: The first **Living Brain** for your codebase. It grounds AI agents in a deterministic "Context" (`context.json`), ensuring that every line of code generated is perfectly aligned with your design intent.

## 🎯 NEW: Self-Organizing Planner (VERIFIED ✓)

**90% Prompt Reduction Achieved!**

[![Inference Verified](https://img.shields.io/badge/Inference-Verified%20✓-green)](./docs/TEST_RESULTS.md)
[![Prompt Reduction](https://img.shields.io/badge/Prompt%20Reduction-90%25-blue)](./docs/INFERENCE_ENGINE.md)
[![Confidence](https://img.shields.io/badge/Confidence-92%25-brightgreen)](./docs/TEST_RESULTS.md)

MyContext now features an intelligent **Self-Organizing Planner** that auto-infers 67-90% of your specification, reducing setup time from 10-15 minutes to 2-3 minutes!

**Example**: Instead of answering 20+ questions, just describe your project:
```bash
npx mycontext-cli init --interactive

"What are you building?" → "A blog with user authentication"

# AI auto-infers:
✓ User, Post, Comment entities (95% confidence)
✓ Entity fields and relationships (90-95% confidence)
✓ RBAC roles and permissions (92% confidence)
✓ Pages and navigation (90% confidence)

# Only asks:
? Auth provider? [Email] [OAuth GitHub] [OAuth Google]
? Design theme? [Light] [Dark] [System]

✅ Complete specification in 2-3 minutes!
```

**Verified Results**:
- 📊 **67-90% prompt reduction** (tested with real projects)
- ⚡ **67% faster** setup time
- 🎯 **92% overall confidence** scores
- 🔒 **Production-ready** with self-critique loops

[Learn more about the Inference Engine →](./docs/INFERENCE_ENGINE.md)

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

## Overview
This is a modern web application designed to streamline user interactions and project management. It provides an intuitive interface for managing user profiles, navigating dashboards, and customizing settings, all while ensuring a secure and seamless experience.

## Key Features
- **Authentication**: Secure user login and account management.
- **Dashboard**: Centralized hub for accessing and managing projects.
- **Profile Management**: Update and personalize user information with ease.
- **Settings**: Customize application preferences and configurations.
- **Data Management**: Efficient handling and organization of project-related data.

## Tech Stack
- Next.js
- TypeScript
- Tailwind CSS

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
