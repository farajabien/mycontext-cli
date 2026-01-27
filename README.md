# MyContext CLI

<p align="center">
  <img src="https://raw.githubusercontent.com/farajabien/mycontext-cli/main/public/mycontext-logo.png" alt="MyContext Logo" width="200" />
</p>

**Spec-Driven Development for the AI Era — Generate comprehensive context + visual screens, then code with Claude/Cursor**

[![npm version](https://badge.fury.io/js/mycontext-cli.svg)](https://www.npmjs.com/package/mycontext-cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org)

**The missing piece:** Start with an idea, get comprehensive specs + visual screens, then let AI tools build your app.

**What makes us different:**
- 🎯 **Context-First**: Only tool that generates PRD/brand/flows/types BEFORE design
- 🏠 **Local-First**: Everything runs on your machine, you own the data
- 🔄 **Full Workflow**: Idea → Context → Screens → Code in ONE tool
- 📋 **Spec-Driven**: Comprehensive specifications drive both design AND development
- 🤝 **Tool-Agnostic**: Use with Stitch, v0, Claude Code, Cursor - or ANY AI tool

## 🚀 Quick Start — Complete Workflow

### The Complete Workflow: Idea → Screens → Code

```bash
# 1. Install globally
npm install -g mycontext-cli

# 2. Initialize project with your idea
mycontext init my-saas-app --description "B2B project management tool"
cd my-saas-app

# 3. Configure AI provider (Gemini free tier recommended!)
echo 'GEMINI_API_KEY=your-key' > .mycontext/.env
# Get free key: https://aistudio.google.com/apikey

# 4. Generate comprehensive context (PRD, brand, flows, types)
mycontext generate context --full

# 5. Generate realistic sample data for screens
mycontext generate:sample-data --count 20

# 6. Generate visual screens (HTML + screenshots)
mycontext generate:screens --all

# 7. Review screens in browser (auto-opens)
# Screens saved to .mycontext/screens/

# 8A. Export for design tools (optional)
mycontext generate:design-prompt --format stitch

# 8B. OR use screens as reference and code with Claude/Cursor
# All context files in .mycontext/ are ready for AI coding tools
```

### For Existing Projects

```bash
# Analyze existing project and generate full context
mycontext analyze --generate-context --include-brand

# 🆕 NEW! Analyze a screenshot with Gemini Vision (2.0 Flash)
mycontext analyze /path/to/screenshot.png
# Generates comprehensive context.md with:
# - 20+ UI components with hierarchy
# - Design system (colors, typography, spacing)
# - Layout analysis
# - Tech stack recommendations

# Generate sample data from your existing types/schema
mycontext generate:sample-data

# Generate screens for specific pages
mycontext generate:screens login
mycontext generate:screens dashboard

# Or generate all screens at once
mycontext generate:screens --all
```

## ✨ What You Get

### 📋 **1. Comprehensive Context Files**

- **PRD (Product Requirements Document)** - Complete product specification
- **Brand Guidelines** - Colors, typography, design system, tone
- **User Flows** - Step-by-step user journeys
- **Features & User Actions** - Detailed feature documentation
- **Technical Specs** - Constraints and requirements
- **Edge Cases** - Error states and edge scenarios
- **Types & Schema** - TypeScript interfaces and database schema

### 🎨 **2. Visual Screens (NEW!)**

- **HTML Screens** - Production-ready HTML with inline CSS
- **Screenshots** - PNG previews for each screen
- **Realistic Data** - Screens populated with AI-generated sample data
- **Context-Aware** - Screens match your brand, flows, and features
- **Browser Preview** - Auto-opens for instant review

### 📦 **3. Sample Data**

- **AI-Generated** - Realistic users, content based on your types
- **Type-Safe** - Matches your schema and TypeScript definitions
- **Contextual** - Relevant to your project domain
- **Customizable** - Generate as many items as you need

### 🚀 **4. Export Options**

- **Design Prompts** - Optimized for Stitch, v0, and other AI design tools
- **Screen References** - Use generated screens as visual references
- **Context Packs** - Complete `.mycontext/` directory for Claude Code/Cursor
- **Figma Export** (coming soon) - Import screens directly into Figma

### 💡 **The Complete Workflow**

1. **Generate Context** → `mycontext generate context --full` (PRD, brand, flows, types)
2. **Generate Sample Data** → `mycontext generate:sample-data` (realistic test data)
3. **Generate Screens** → `mycontext generate:screens --all` (visual HTML screens)
4. **Review & Refine** → View screens in browser, iterate if needed
5. **Code with AI** → Use `.mycontext/` files + screens with Claude Code/Cursor
6. **Ship** → Production-ready app with consistent design

<!-- ## 🎨 MyContext Studio - Coming Soon

**Bundled component preview and prototyping tool included with every project!**

- **Live Preview** - See components in real-time as you generate them
- **Responsive Testing** - Mobile, tablet, and desktop previews
- **Component Library** - Browse, search, and manage generated components
- **Copy & Export** - One-click code copying and component export
- **Real-time Updates** - Components auto-appear when generated by CLI

```bash
# Start Studio preview
pnpm studio:dev
# Opens at http://localhost:3001

# Studio automatically watches for new components
mycontext generate:components
# Components instantly appear in Studio!
``` -->

## 🎯 Why MyContext CLI?

**The Problem:** AI tools are powerful but need context. Without comprehensive specs, you get:
- ❌ Inconsistent designs across screens
- ❌ Missing edge cases and error states
- ❌ Incomplete requirements
- ❌ Prompt fatigue from writing the same context repeatedly

**The Solution:** MyContext CLI generates comprehensive specifications FIRST, then uses them to:
1. Generate context-aware visual screens (HTML/PNG)
2. Create optimized prompts for AI design tools (Stitch, v0)
3. Provide complete context for AI coding tools (Claude Code, Cursor)

**The Result:**
- ✅ Comprehensive specs drive everything (PRD, brand, flows, types)
- ✅ Visual screens with realistic data for stakeholder review
- ✅ Better outputs from AI tools (they have full context)
- ✅ Consistent design and code across your app
- ✅ Full local workflow, you own everything

**We're building the missing context layer that makes ALL AI development tools work better.**

## 💰 Pricing

- **MyContext CLI** - Free and open source (MIT License)

Use the CLI with your own AI provider keys (Claude, OpenAI, XAI) for free.

## 📚 Full Documentation

**Complete guides, tutorials, and API reference available on GitHub:**

👉 **[View Full Documentation](https://github.com/farajabien/mycontext-cli/tree/main/docs)**

- [Getting Started Guide](https://github.com/farajabien/mycontext-cli/blob/main/docs/01-getting-started/quick-start.md)
- [AI Agents System](https://github.com/farajabien/mycontext-cli/blob/main/docs/02-core-features/ai-agents.md)
- [Intent Dictionary](https://github.com/farajabien/mycontext-cli/blob/main/docs/02-core-features/intent-dictionary-system.md)
- [Command Reference](https://github.com/farajabien/mycontext-cli/blob/main/docs/03-reference/commands.md)
- [Architecture](https://github.com/farajabien/mycontext-cli/blob/main/docs/06-architecture/system-overview.md)

## 🎯 Key Features

### **Context Generation**
- **Comprehensive PRD** - Product requirements from your project analysis
- **Brand Guidelines** - Colors, typography, design tokens, tone of voice
- **User Flows** - Complete user journeys and interactions
- **Feature Documentation** - Detailed feature specifications
- **Technical Constraints** - What's possible, what's not

### **Design Prompt Optimization**
- **Stitch-Optimized** - Format specifically tuned for Google Stitch
- **General Format** - Works with v0, Framer AI, and other design tools
- **API Format** - JSON output for programmatic integration
- **Smart Concatenation** - Combines all context into one powerful prompt

### **Project Analysis**
- **Existing Project Support** - Analyze and extract context from any project
- **Gap Detection** - Identifies missing information
- **Auto-Generation** - Fills in gaps with intelligent defaults
- **Vision Mode (New!)** - Reverse-engineer PRDs and Brand Systems from screenshots (`analyze --image`)

## 🤖 AI Provider Setup (Required)

**MyContext supports multiple AI providers.** Choose based on your needs:

### 🎯 Recommended: Gemini (Free + Visual Generation)

```bash
# 1. Get free API key: https://aistudio.google.com/apikey
# 2. Add to your project:
echo 'GEMINI_API_KEY=your-key' > .mycontext/.env
# 3. Start generating!
mycontext generate context --full
mycontext generate:screens --all
```

**Why Gemini?**
- ✅ **FREE with generous limits**
- ✅ **Powered by Gemini 1.5 Flash** (Stable & Fast)
- ✅ Multimodal support (text + visual generation)
- ✅ Fast and high-quality outputs
- ✅ **Perfect for screen generation** with nanobanana-style HTML output
- ✅ No credit card required

### Alternative Providers

**OpenRouter (Free Tier, DeepSeek R1)**

```bash
# Get free API key: https://openrouter.ai/keys
echo 'MYCONTEXT_OPENROUTER_API_KEY=sk-or-xxx' > .mycontext/.env
```

- ✅ Free tier with generous limits
- ✅ DeepSeek R1 (powerful reasoning)
- ✅ No credit card required

**Claude (Best Quality)**

```bash
# Get key: https://console.anthropic.com/
echo 'ANTHROPIC_API_KEY=sk-ant-xxx' > .mycontext/.env
```

- ✅ Highest quality results
- ⚠️ Paid only

**XAI/Grok**

```bash
# Get key: https://console.x.ai/
echo 'XAI_API_KEY=xai-xxx' > .mycontext/.env
```

- ✅ Good for creative outputs
- ⚠️ Paid only

**Provider Priority:** Claude → OpenRouter → Gemini → XAI (automatic fallback)

## 🤝 Contributing

Contributions welcome! See our [Contributing Guide](https://github.com/farajabien/mycontext-cli/blob/main/CONTRIBUTING.md).

## 📄 License

MIT © MyContext - See [LICENSE](https://github.com/farajabien/mycontext-cli/blob/main/LICENSE) for details.

---

## 🔄 The Complete Workflow

```
                    ┌─────────────────────────────────────┐
                    │      1. Start with Idea            │
                    │   mycontext init my-app            │
                    └──────────────┬──────────────────────┘
                                   │
                                   ▼
                    ┌─────────────────────────────────────┐
                    │   2. Generate Context Files        │
                    │ mycontext generate context --full  │
                    │  PRD • Brand • Flows • Types       │
                    └──────────────┬──────────────────────┘
                                   │
                                   ▼
                    ┌─────────────────────────────────────┐
                    │   3. Generate Sample Data          │
                    │  mycontext generate:sample-data    │
                    │    Realistic test data             │
                    └──────────────┬──────────────────────┘
                                   │
                                   ▼
                    ┌─────────────────────────────────────┐
                    │   4. Generate Visual Screens       │
                    │  mycontext generate:screens --all  │
                    │    HTML + PNG previews             │
                    └──────────────┬──────────────────────┘
                                   │
                    ┌──────────────┴──────────────┐
                    │                             │
                    ▼                             ▼
    ┌───────────────────────────┐   ┌──────────────────────────┐
    │   5A. Use with AI Tools   │   │  5B. Code Directly       │
    │  Stitch • v0 • Designers  │   │  Claude Code • Cursor    │
    │  (design-prompt.txt)      │   │  (.mycontext/ + screens) │
    └───────────────┬───────────┘   └──────────┬───────────────┘
                    │                           │
                    └───────────┬───────────────┘
                                │
                                ▼
                    ┌─────────────────────────────────────┐
                    │   6. Ship Production App           │
                    │  Complete • Consistent • Quality   │
                    └─────────────────────────────────────┘
```

**Spec-driven development for the AI era. Your code, your data, your machine.** 🚀

[Full Documentation](https://github.com/farajabien/mycontext-cli/tree/main/docs) • [GitHub](https://github.com/farajabien/mycontext-cli) • [Issues](https://github.com/farajabien/mycontext-cli/issues)
