# MyContext CLI

<p align="center">
  <img src="https://raw.githubusercontent.com/farajabien/mycontext-cli/main/public/mycontext-logo.png" alt="MyContext Logo" width="200" />
</p>

**Zero-Drift Autonomous Development — Spec-Driven App Evolution with a Deterministic Physics Engine.**

[![npm version](https://badge.fury.io/js/mycontext-cli.svg)](https://www.npmjs.com/package/mycontext-cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org)

**The missing piece:** Stop the drift. Start with an idea, define the physics in the Living DB, and let the Autonomous Agent evolve your codebase with perfect narrative compliance.

---

## 🚀 Quick Start (Simple Setup)

MyContext is built to work out of the box with **GitHub Models (GPT-4o)**. No complex API keys required.

```bash
# 1. Install CLI
npm install -g mycontext-cli

# 2. Get your GitHub Token (Free & High Quality)
# Go to: https://github.com/settings/tokens (with 'repo' scope)

# 3. Initialize your project
export GITHUB_TOKEN=your-token
mycontext init my-app --framework basic
cd my-app

# 4. Generate the Brain
mycontext generate context --full

# 5. Evolve Autonomously (The Agent)
mycontext agent "Add a dashboard area with user activity charts" --execute
```

---

## 🎯 Project Vision (Living DB)

<!-- mycontext:start -->
### 🎯 Project Overview
**MyContext CLI**: Spec-driven development anchor for AI-powered coding

### ✨ Key Features
- Framework scaffolding
- Screenshot analysis
- Context generation
- Narrative compliance
- Living DB anchoring

### 🛠️ Technical Stack
- **Framework**: Node.js (TypeScript)
- **Data Persistence**: JSON/Markdown on disk
- **Key Libraries**: ts-node, commander, HybridAI

--- 
_Last synchronized with MyContext Living DB on 2/11/2026_
<!-- mycontext:end -->

---

## 🛠️ The Paradigm Anchor

Every MyContext project includes a cognitive anchor for AI agents. When using external tools (Claude, Cursor, v0), **always** include these files to prevent drift:

1.  `@.mycontext/gravity-system.md` - The "Physics Rules" for the AI.
2.  `@.mycontext/design-manifest.json` - The "Living Brain" (Current State).
3.  `@.mycontext/01-prd.md` - The "Prime Narrative."

---

## 🤖 AI Provider Configuration

While **GitHub Models** is the recommended default, MyContext is a Hybrid AI engine:

- **GitHub Models (GPT-4o)**: `export GITHUB_TOKEN=...` (Default)
- **DeepSeek/OpenRouter**: `export OPENROUTER_API_KEY=...`
- **Gemini (Vision)**: `export GEMINI_API_KEY=...` (Recommended for `analyze` command)
- **Anthropic**: `export ANTHROPIC_API_KEY=...`

---

## 📖 Essential Commands

| Command | Purpose |
|---------|---------|
| `mycontext init` | Bootstrap the Living DB and Gravity System. |
| `mycontext generate context` | Turn an idea into a full architectural spec. |
| `mycontext agent` | Assess and evolve features autonomously. |
| `mycontext status` | Check project health and narrative compliance. |
| `mycontext sync-readme` | Anchor your README to the latest manifest state. |

---

## 🤝 Contributing

Contributions welcome! See [CONTRIBUTING.md](CONTRIBUTING.md).

## 📄 License

MIT © MyContext - See [LICENSE](LICENSE) for details.
