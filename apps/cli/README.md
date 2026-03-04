# MyContext CLI — Domain-Specific Natural Language Compiler

**Transform natural language into production-ready Next.js applications through deterministic compilation.**

MyContext CLI (`mycontext-cli`) is the execution engine of the MyContext ecosystem. It acts as a **Domain-Specific Natural Language Compiler (DS-NLC)** for modern React/Next.js architectures. 

[![npm version](https://img.shields.io/npm/v/mycontext-cli.svg)](https://www.npmjs.com/package/mycontext-cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## 🎯 What it does

Most "AI Coders" act by directly writing code through trial and error, creating unmaintainable black-box architectures and hallucinating unpredictable functions.

**MyContext takes a radically different compiler approach:**
1. **The Planner (`mycontext plan`)**: Listens to your natural language intent (e.g. "Build a blog with user authentication") and translates it into a strict, validated JSON AST called the **Feature Structured Representation (FSR)**.
2. **The Generator (`mycontext build`)**: Deterministically renders this FSR AST into Next.js output files (Pages, Server Components, Client Components, Server Actions, and Schema Types) using strict scaffolding templates. 

**Zero LLMs are used in the final code execution step, guaranteeing 100% reproducible and hallucination-free output.** 

---

## 🏗️ Phase 0 Capabilities

### 1. Feature Structured Representation (FSR)
A strict, machine-first JSON schema that structures Next.js domains. It clearly separates:
- **`entryPoints`**: Top-level page routes.
- **`components`**: Client and Server nested components.
- **`serverActions`**: Strongly-typed form and data permutations.
- **`models`**: Schema structures describing business data logic.

### 2. Planner Module
Auto-infers context and asks necessary clarifying questions directly in your terminal to safely map standard ideas to exact code requirements. Output is explicitly saved as `.fsr.json` before any real code touches your file system.

### 3. Deterministic Scaffold Generator
Strict mapping of the final FSR blueprint into `src/app` Next.js structures using string-based template rendering. 

---

## 🚀 Quick Start

### Installation

```bash
# Install globally
npm install -g mycontext-cli
```

### 1. Generating a Blueprint (`mycontext plan`)

Use the planner to process natural language into an FSR JSON model.

```bash
mycontext plan "a collaborative markdown editor with realtime presence"
```
**What happens?**
The CLI's AI Agent queries you for details, generates the structured `editor` FSR AST, and saves it locally (e.g., `.mycontext/features/editor.fsr.json`). You can review and adjust the output securely.

### 2. Scaffolding Code (`mycontext build`)

Render your Next.js application deterministically from your generated blueprint.

```bash
mycontext build --feature editor
```
**What happens?**
The CLI parses `editor.fsr.json` and deterministically templates out your Next.js components, database actions, type models, and UI pages.

---

## 🛠️ Diagnostics (`mycontext doctor`)

Ensure your code matches the living brain context without drift. MyContext includes type and structure validation steps ensuring Next.js best practices stay intact across iterations.

```bash
# Verify your project for type safety and schema drift
mycontext doctor --verbose
```

---

## 🛣️ Roadmap

- [x] **Phase 0: DS-NLC Compiler Prototype (VERIFIED ✓)**
  - Interactive Planner for intent resolution.
  - FSR generation and definitions.
  - Deterministic Scaffolding engine for Next.js files without hallucinations.
- [ ] **Phase 1**: Expand global FSR registry tracking and module merging.
- [ ] **Phase 2**: Granular component-level targeted LLM refactors based on strict context boundaries.
- [ ] **Phase 3**: Automated InstantDB remote schema migrations and dynamic routing deployment.

---

## 📄 License & Links

MIT © [MyContext Team](https://github.com/farajabien/mycontext-cli)

- [NPM: mycontext-cli](https://www.npmjs.com/package/mycontext-cli)
- [NPM: @myycontext/core](https://www.npmjs.com/package/@myycontext/core)
- [Monorepo Documentation](../../README.md)
