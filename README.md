# MyContext AI CLI: The Context Engine for AI-Native Development

AI code generation often fails because it lacks deep, structured project awareness. **MyContext** solves this by generating a 100% accurate 'Living Brain' — a centralized JSON source of truth — that maps out PRDs, Type systems, and Component Architectures for perfect AI alignment.

## 🧠 The Living Brain Philosophy
MyContext is built on a **JSON-First Architecture**. While we export human-readable Markdown for documentation, the single source of truth (SSOT) is always `.mycontext/context.json`.

Every CLI command — from screen mapping to component manifest generation — automatically synchronizes its output back into this central Brain. This ensures that any AI agent (Antigravity, Cursor, etc.) has a consistent, structured, and up-to-date understanding of the entire project.

## ✨ Key Features
- **JSON-First Single Source of Truth**: All architectural metadata is centralized in `context.json`.
- **Automated Living Brain Sync**: CLI commands automatically update the Brain with discovery results (routes, components, actions).
- **Agent Hand-off Scaffold**: Generates the exact PRD and design prompts needed to "scope" another AI agent's work.
- **Brain Reconstruction (FSR)**: Scans any existing project and reconstructs a high-fidelity Living Brain from source code.
- **Vision-Based Development**: Capture UI designs and sync them directly into your component manifest.

## 🛠️ Technical Stack
- **Frontend**: Next.js, React, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Node.js, TypeScript
- **Tools**: pnpm (workspaces), Commander.js, Playwright, Zod, OpenAI API, Google Gemini API, Anthropic Claude API

## 📂 Project Structure
```bash
📁 apps
  📁 cli       # Core CLI tool & Context Engine
  📁 vscode    # (Alpha) VS Code Extension
  📁 web       # MyContext Analytics Dashboard
  📁 recorder  # Vision-based UI capture & E2E recorder
📁 packages
  📁 core      # Shared logic & AI client interfaces
📄 turbo.json  # Monorepo orchestration
```

## 🚀 Quick Start
1. **Bootstrap the Brain**:
   ```bash
   mycontext init my-new-app
   ```
2. **Generate Full Architecture**:
   ```bash
   mycontext generate context --full
   ```
3. **Map Screens & Components**:
   ```bash
   mycontext generate:screens-list
   mycontext generate:components-manifest
   ```
4. **Export for Designer/Agent**:
   ```bash
   mycontext generate:design-prompt
   ```

<!-- mycontext:start -->
### 🎯 Project Overview
Developers, especially those leveraging AI, spend significant time bootstrapping projects, managing context, and ensuring consistency across the codebase. AI code generation often lacks deep project awareness, leading to generic, disconnected, or incorrect outputs. There is a critical need for a system that maintains a dynamic, 'living' understanding of a project, which can be used by both humans and AI agents to build, evolve, and test applications with high fidelity and speed.

### ✨ Key Features
- Living Brain Management
- Agent Orchestration System
- AI-Powered Code Generation
- Vision-Based Testing & Demos
- Iterative Enhancement & Refinement

### 🛠️ Technical Stack
- **Frontend**: Next.js, React, TypeScript

### 🧠 Context-Driven Development
> **Initialization creates the shell and sets the guardrails for future AI.** MyContext Doctor enforces those rails at deterministic speeds, meaning any AI that acts later is perfectly bounded and much less prone to hallucination or costly trial-and-error operations.

*This project leverages MyContext natively. See the `.mycontext` directory for the active project brain.*


---
_Last synchronized with MyContext Living DB on 3/10/2026_
<!-- mycontext:end -->

---
*Built with MyContext — spec-driven development for the AI era.*
