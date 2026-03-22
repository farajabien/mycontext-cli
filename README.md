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

## Overview
This modern web application provides a robust and intuitive platform for users to manage their projects and personal data effectively. Designed for a seamless experience, it integrates key functionalities to support a productive workflow.

## Key Features
-   **Secure Authentication**: Implements a comprehensive system for user registration, login, and secure session management.
-   **Project Management**: Tools for users to create, organize, and track their individual projects.
-   **User Profile & Settings**: Dedicated sections for users to manage their personal information and application preferences.
-   **Data Management**: Capabilities for handling and organizing user-specific data associated with projects and profiles.
-   **Interactive Dashboard**: A centralized view providing quick access and an overview of active projects and key information.

## Tech Stack
-   **Next.js**: A React framework for building performant, server-rendered, and statically generated web applications.
-   **TypeScript**: A strongly typed superset of JavaScript, enhancing code quality, maintainability, and developer experience.
-   **Tailwind CSS**: A utility-first CSS framework for rapidly building custom designs and responsive user interfaces.

<!-- mycontext:end -->

---
*Built with MyContext — spec-driven development for the AI era.*
