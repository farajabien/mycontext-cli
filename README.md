# MyContext CLI

<p align="center">
  <img src="https://raw.githubusercontent.com/farajabien/mycontext-cli/main/public/mycontext-logo.png" alt="MyContext Logo" width="200" />
</p>

**Spec-Driven Development for the AI Era — Generate comprehensive context + visual screens, then code with Claude/Cursor**

[![npm version](https://badge.fury.io/js/mycontext-cli.svg)](https://www.npmjs.com/package/mycontext-cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org)

**The missing piece:** Start with an idea, get comprehensive specs + visual screens, then let AI tools build your app.

## 🚀 Two Paths to Code

### Path 1: Screenshot → Spec (🔥 NEW)
*Best for reverse-engineering designs or cloning styles.*

```bash
# 1. Initialize project with InstantDB (interactive setup)
mycontext init my-app --framework instantdb
# → Runs shadcn/ui init
# → Prompts for instant-cli init & schema push
# → Installs @instantdb/react, @instantdb/admin, auth deps
# → Copies template files to lib/ (instant-client.ts, auth.ts, etc.)

# 2. Analyze Screenshot (Powered by Gemini 2.0 Flash)
mycontext analyze mockup.png
# → Generates .mycontext/context.md
# → Extracts Design System (colors, fonts, spacing)
# → Identifies components & layout

# 3. Code (with full context)
pnpm dev
```

### Path 2: Idea → Full Context
*Best for new projects from scratch.*

```bash
# 1. Initialize with description and framework
mycontext init my-saas-app \
  --framework instantdb \
  --description "AI-powered code review SaaS"
# Choose framework: instantdb | nextjs | other

# 2. Generate Full Context (PRD, Features, Flows, Specs)
mycontext generate context --full

# 3. Generate UI Artifacts
mycontext generate:screens-list    # Extract screens from flows
mycontext generate:sample-data     # Generate realistic test data
mycontext generate:components-manifest  # Component specs with props
mycontext generate:actions         # Backend connection hooks

# 4. Use context with Claude/Cursor
# All files in .mycontext/ are ready for AI coding tools
```

## 🎯 Framework Support

MyContext adapts to your preferred tech stack with flexible initialization options:

### **InstantDB (Full Stack)** - Default
*Complete real-time backend with authentication and storage*

```bash
mycontext init my-app --framework instantdb
```

**Includes:**
- ✅ shadcn/ui components setup
- ✅ InstantDB client & admin SDK
- ✅ Auth utilities (bcrypt, magic codes, subdomain generation)
- ✅ File storage helpers
- ✅ Template files in `lib/` or `src/lib/`:
  - `instant-client.ts` - Client SDK with schema
  - `instant-admin.ts` - Admin SDK for server operations
  - `auth.ts` - Auth helpers (password hashing, magic codes)
  - `instantdb-storage.ts` - File upload/download utilities

**Dependencies Installed:**
- `@instantdb/react`, `@instantdb/admin`
- `bcryptjs`, `nanoid`, `@types/bcryptjs`

---

### **Next.js (Frontend Focus)**
*shadcn/ui + MyContext for Next.js projects*

```bash
mycontext init my-app --framework nextjs
```

**Includes:**
- ✅ shadcn/ui components setup
- ✅ MyContext project structure (.mycontext/)
- ⏭️ No database setup (bring your own backend)

---

### **Basic (MyContext Only)**
*Minimal setup for any project type*

```bash
mycontext init my-app --framework other
```

**Includes:**
- ✅ MyContext project structure only
- ⏭️ No UI library or database setup

---

## ✨ Key Features

### 📋 **1. Comprehensive Context Generation**
- **PRD**: Complete product specification
- **Brand System**: Colors, typography, tokens
- **User Flows**: Step-by-step journeys
- **Technical Specs**: Constraints & requirements
- **Types & Schema**: TypeScript/Database definitions

### 🎨 **2. Visual Screens (AI-Generated)**
- **HTML/JSX Screens**: Production-ready HTML/Tailwind or React components
- **Realistic Data**: Context-aware sample content
- **Hosted Preview**: Preview all screens at [studio.mycontext.app](https://studio.mycontext.app)

### 📦 **3. Export & Integrate**
- **Claude Code / Cursor**: Optimized context packs
- **Stitch / v0**: Dedicated design prompts
- **Figma**: (Coming soon) Direct export

## 🤖 AI Provider Setup

**MyContext works best with Gemini (Free Tier + Vision).**

```bash
# 1. Get free API key: https://aistudio.google.com/apikey
# 2. Configure project
echo 'GEMINI_API_KEY=your-key' > .mycontext/.env
```

*Also supports: Anthropic (Claude), OpenRouter (DeepSeek), xAI (Grok)*

## 📚 Documentation

**Note:** The MyContext CLI is a focused scaffolding and code generation tool. To preview generated screens and components visually, use the [hosted MyContext Studio app](https://studio.mycontext.app).

Detailed guides available in the [`docs/`](docs/) directory:
- [Getting Started](docs/01-getting-started/quick-start.md)
- [Core Features](docs/02-core-features/ai-agents.md)
- [Command Reference](docs/03-reference/commands.md)
- [Architecture](docs/06-architecture/system-overview.md)

## 🤝 Contributing

Contributions welcome! See [CONTRIBUTING.md](CONTRIBUTING.md).

## 📄 License

MIT © MyContext - See [LICENSE](LICENSE) for details.
