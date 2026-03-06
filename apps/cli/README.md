# MyContext CLI - Deterministic Full-Stack App Compiler

Transform natural language into production-ready Next.js applications through deterministic compilation.

MyContext is not an AI code generator—it's a natural-language-to-project compiler that uses LLMs only for intent parsing, while all code generation is performed by deterministic script templates. No hallucinations. No guessing. Just facts → manifest → complete application.

[![npm version](https://img.shields.io/npm/v/mycontext-cli.svg)](https://www.npmjs.com/package/mycontext-cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## 🧠 Core Philosophy

### Zero-Hallucination Compilation
Most AI tools act as "chat-driven coders" that guess your requirements. MyContext acts as a **Natural Language Compiler**:
1. **Analyze**: LLM parses your intent into a strict JSON manifest (FSR).
2. **Clarify**: The CLI identifies gaps and prompts you *before* any code is written.
3. **Generate**: Deterministic script templates render valid, typed Next.js code.

### The Living Brain (`.mycontext/`)
Every project is governed by a local "brain" folder that ensures your code, types, and design tokens never drift:
- `context.json`: The master source of truth for your project features.
- `design_manifest.json`: Your premium design tokens and layout rules.
- `registry/`: Automated tracking of all generated components and actions.

---

## 🚀 NEW: Phase 0.7 Premium Features (VERIFIED ✓)

- **Smart Layout Engine**: Autonomic 8/12 grid placement based on component `weight`.
- **Test-Mode Fast-Forward**: Detects `__MYCONTEXT_TEST_MODE__` to speed up animations 60x.
- **Auto-Test Generation**: `mycontext test:generate` creates Playwright specs from your FSR.
- **Density Guardrails**: Visual checks to prevent "rammed UI" and visual clutter.

---

---

## 🚀 The Brain-First Workflow

Transforming natural language into project intent involves three core stages, all mediated by the **Living Brain (`.mycontext/context.json`)**.

### 1. Initialization (`mycontext init`)
Establish the `.mycontext` directory and establish the source of truth.
```bash
mycontext init --interactive
```
*AI auto-infers project framework, core entities, and foundational requirements.*

### 2. High-Fidelity Sync (`mycontext generate context --full`)
The most critical step. This command performs a unified AI pass to synchronize:
- **Requirements**: Functional and non-functional specs (PRD).
- **Features**: Atomic feature breakdown with technical specifications.
- **Types**: Shared TypeScript entity definitions and database schemas.
- **Brand**: Visual design tokens (colors, typography).
- **Registry**: Auto-discovery of existing code to prevent drift.

```bash
mycontext generate context --full --description "A removal tool for image backgrounds"
```

### 3. Component Orchestration (`mycontext generate-components`)
Render the specifications in the brain into production-ready React code.
```bash
# Generate everything in the brain
mycontext generate-components all

# Or target a specific group
mycontext generate-components gallery
```

### 4. Project Cockpit (The Dashboard)
Run `mycontext` without arguments to launch the interactive dashboard.
- **Project Health**: View feature completeness and type coverage.
- **Registry Manager**: Browse generated components and schemas.
- **Sync Trigger**: Instantly refresh the brain from the dashboard.

---

## 🛠️ Diagnostics & Maintenance

- **`mycontext doctor`**: Verify project health, type safety, and schema alignment.
- **`mycontext sync --readme`**: Synchronize the root README with the brain's latest design manifest.
- **`mycontext status`**: Quick check of the current project state.

---

## 📦 Installation
```bash
npm install -g mycontext-cli
```

---

## 🛣️ Roadmap
- [x] **Phase 0.7**: Brain-First Architecture & TUI Dashboard
- [x] **Phase 0.8**: Smart Layout Engine & Deterministic Scaffolding
- [ ] **Phase 1**: Multi-Agent Orchestration (Backend/Security/QA)
- [ ] **Phase 2**: Granular component-level targeted LLM refactors

---

## 📄 License & Links
MIT © [MyContext Team](https://github.com/farajabien/mycontext-cli)
- [Documentation](https://mycontext.framer.website)
- [NPM: mycontext-cli](https://www.npmjs.com/package/mycontext-cli)
