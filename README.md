# MyContext CLI

<p align="center">
  <img src="https://raw.githubusercontent.com/farajabien/mycontext-cli/main/public/mycontext-logo.png" alt="MyContext Logo" width="200" />
</p>

**Spec-Driven Development for the AI Era — Generate comprehensive context + visual screens, then code with Claude/Cursor**

[![npm version](https://badge.fury.io/js/mycontext-cli.svg)](https://www.npmjs.com/package/mycontext-cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org)

**The missing piece:** Start with an idea, get comprehensive specs + visual screens, then let AI tools build your app.

## 📦 Installation

```bash
# npm
npm install -g mycontext-cli

# pnpm (recommended)
pnpm add -g mycontext-cli

# yarn
yarn global add mycontext-cli
```

**Prerequisites:**
- Node.js >= 18.0.0
- pnpm/npm/yarn

**Verify installation:**
```bash
mycontext --version
mycontext --help
```

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

MyContext supports multiple AI providers. Choose one based on your needs:

### **Recommended: GitHub Models** (GPT-4o - Free for GitHub users)

```bash
# 1. Get GitHub token: https://github.com/settings/tokens (with 'repo' scope)
# 2. Configure project
echo 'GITHUB_TOKEN=your-token' > .mycontext/.env
```

**Why GitHub Models?**
- Free access to GPT-4o and other premium models
- High rate limits for GitHub users
- Excellent code generation quality
- No separate API key needed (uses GitHub token)

### **Alternative: Gemini** (Free Tier + Vision)

```bash
# 1. Get free API key: https://aistudio.google.com/apikey
# 2. Configure project
echo 'GEMINI_API_KEY=your-key' > .mycontext/.env
```

**Why Gemini?**
- Generous free tier
- Vision API for screenshot analysis
- Fast response times
- Good for visual screen generation

### **Other Supported Providers:**
- **Anthropic Claude**: `ANTHROPIC_API_KEY=your-key`
- **OpenRouter** (DeepSeek, etc.): `OPENROUTER_API_KEY=your-key`
- **xAI Grok**: `XAI_API_KEY=your-key`

**Provider Priority:** Claude Agent SDK → GitHub Models → OpenRouter → Gemini → xAI

## 📁 Generated Context Structure

After running `mycontext init` and `mycontext generate context --full`, you'll have:

```
.mycontext/
├── 01-prd.md                    # Product Requirements Document
├── 02-user-flows.md             # User journey maps & flows
├── 03-branding.md               # Design system & brand guidelines
├── 04-component-list.json       # Component specifications
├── 05-technical-specs.md        # Technical constraints & requirements
├── 06-types.ts                  # TypeScript type definitions
├── 07-features.md               # Feature breakdown & priorities
├── sample-data.json             # Realistic test data
├── screens/                     # Generated visual screens
│   ├── home/
│   │   ├── index.html           # HTML screen
│   │   ├── index.tsx            # React/JSX screen
│   │   └── metadata.json        # Generation metadata
│   └── screens-manifest.json    # All screens index
└── .env                         # AI provider configuration
```

### File Descriptions

| File | Purpose | Used By |
|------|---------|---------|
| `01-prd.md` | Complete product spec, user stories, success metrics | AI tools for understanding requirements |
| `02-user-flows.md` | User journeys, screen flows, interaction patterns | Screen generation, component planning |
| `03-branding.md` | Colors, typography, spacing, design tokens | UI generation, consistency checks |
| `04-component-list.json` | Component specs, props, relationships | Component generation, dependency tracking |
| `05-technical-specs.md` | Tech stack, constraints, API contracts | Architecture decisions, validation |
| `06-types.ts` | TypeScript interfaces, database schema | Type-safe code generation |
| `07-features.md` | Feature list, priorities, implementation order | Project planning, task generation |
| `sample-data.json` | Realistic test data for all entities | Screen previews, testing, development |

## 🤝 Integration with AI Coding Tools

### Using with Claude Code

1. **Initialize your project:**
   ```bash
   mycontext init my-app --framework instantdb
   mycontext generate context --full
   ```

2. **Add context to Claude Code:**
   ```bash
   # The .mycontext/ directory is automatically indexed
   # Reference files in your prompts:
   # "Using the specs in .mycontext/01-prd.md, implement the login flow"
   ```

3. **Best Practices:**
   - Start with `01-prd.md` for high-level understanding
   - Reference `04-component-list.json` for specific components
   - Use `06-types.ts` for type-safe implementations
   - Check `03-branding.md` for styling consistency

### Using with Cursor

1. **Add to Cursor's context:**
   ```
   # In Cursor, use @ to reference files:
   @.mycontext/01-prd.md
   @.mycontext/04-component-list.json
   ```

2. **Cursor Rules (.cursorrules):**
   ```markdown
   # Always reference MyContext specs
   - Check .mycontext/01-prd.md for requirements
   - Follow design system in .mycontext/03-branding.md
   - Use types from .mycontext/06-types.ts
   ```

### Using with v0/Stitch

Generate design prompts optimized for v0:
```bash
mycontext generate:design-prompt --format stitch
# Outputs formatted prompt in .mycontext/design-prompt.txt
```

## 📚 Documentation

**Note:** The MyContext CLI is a focused scaffolding and code generation tool. To preview generated screens and components visually, use the [hosted MyContext Studio app](https://studio.mycontext.app).

Detailed guides available in the [`docs/`](docs/) directory:
- [Getting Started](docs/01-getting-started/quick-start.md)
- [Core Features](docs/02-core-features/ai-agents.md)
- [Command Reference](docs/03-reference/commands.md)
- [Architecture](docs/06-architecture/system-overview.md)

## 📖 Quick Command Reference

### Essential Commands

| Command | Description | Example |
|---------|-------------|---------|
| `mycontext init <name>` | Initialize new project | `mycontext init my-app --framework instantdb` |
| `mycontext generate context` | Generate all context files | `mycontext generate context --full` |
| `mycontext generate:screens` | Generate visual screens | `mycontext generate:screens --format jsx` |
| `mycontext generate:sample-data` | Generate test data | `mycontext generate:sample-data --count 20` |
| `mycontext generate-components` | Generate React components | `mycontext generate-components all` |
| `mycontext analyze <image>` | Analyze screenshot | `mycontext analyze mockup.png` |
| `mycontext setup-shadcn` | Setup shadcn/ui | `mycontext setup-shadcn --all` |
| `mycontext status` | Check project status | `mycontext status --detailed` |

### Common Workflows

**🚀 Start from Scratch:**
```bash
mycontext init my-saas --framework instantdb
cd my-saas
mycontext generate context --full
mycontext generate:screens --all
mycontext generate-components all
```

**🎨 From Design/Screenshot:**
```bash
mycontext init design-clone --framework nextjs
mycontext analyze design.png
mycontext generate:screens --all --format jsx
```

**⚡ Quick Prototype:**
```bash
mycontext init prototype --framework other
mycontext generate context --description "Your idea here"
mycontext generate:screens home login dashboard
```

### Troubleshooting

**No AI provider configured:**
```bash
# Set GitHub token (recommended)
echo 'GITHUB_TOKEN=your-token' > .mycontext/.env

# Or Gemini key
echo 'GEMINI_API_KEY=your-key' > .mycontext/.env
```

**Components not generating:**
```bash
# Check if context files exist
mycontext status

# Regenerate context if needed
mycontext generate context --full --force
```

**Preview not working:**
- Visit https://studio.mycontext.app
- Upload your `.mycontext/` directory
- Or open generated HTML files directly in browser

## 🤝 Contributing

Contributions welcome! See [CONTRIBUTING.md](CONTRIBUTING.md).

## 📄 License

MIT © MyContext - See [LICENSE](LICENSE) for details.
