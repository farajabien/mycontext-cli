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

## 🏗️ Full Project Workflow

### 1. Initialization (`mycontext init`)
Set up your framework (InstantDB, Next.js, or shadcn) and establish the project brain.
```bash
mycontext init --interactive
```
*AI auto-infers 90% of your spec, reducing setup from 15 mins to 2 mins.*

### 2. Feature Planning (`mycontext plan`)
Translate a feature request into a strict FSR (Feature Structured Representation).
```bash
mycontext plan "A gallery for removed background images with token display"
```

### 3. Deterministic Build (`mycontext build`)
Compile your FSR into production-ready code.
```bash
mycontext build --feature gallery
```

### 4. Continuous Sync (`mycontext sync`)
Automatically update your documentation and `context.json` brain as your code evolves.
```bash
mycontext sync --readme
```

### 5. Diagnostics (`mycontext doctor`)
Verify type safety, catch schema drift, and check for "as any" usage.
```bash
mycontext doctor --verbose
```

---

## 📦 Installation
```bash
npm install -g mycontext-cli
```

---

## 🛣️ Roadmap
- [x] **Phase 0.6**: Deterministic Scaffolding & Token Tracking
- [x] **Phase 0.7**: Premium Layout Engine & Test-Mode
- [ ] **Phase 1**: Global Registry & Multi-Agent Orchestration
- [ ] **Phase 2**: Granular component-level targeted LLM refactors

---

## 📄 License & Links
MIT © [MyContext Team](https://github.com/farajabien/mycontext-cli)
- [Documentation](https://mycontext.framer.website)
- [NPM: mycontext-cli](https://www.npmjs.com/package/mycontext-cli)

---

## 🛣️ Roadmap
- [x] **Phase 0.6**: Deterministic Scaffolding & Token Tracking
- [x] **Phase 0.7**: Premium Layout Engine & Test-Mode
- [ ] **Phase 1**: Global Registry & Multi-Agent Orchestration
- [ ] **Phase 2**: Granular component-level targeted LLM refactors

---

## 📄 License & Links
MIT © [MyContext Team](https://github.com/farajabien/mycontext-cli)
- [Documentation](https://mycontext.framer.website)
- [NPM: mycontext-cli](https://www.npmjs.com/package/mycontext-cli)
