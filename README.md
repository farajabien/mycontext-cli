# MyContext CLI + mycontext PM System

**🤖 AI-Powered Project Management + Component-First Development**

[![npm version](https://badge.fury.io/js/mycontext-cli.svg)](https://www.npmjs.com/package/mycontext-cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org)

**Two powerful systems in one:**

1. **🎯 mycontext PM** - Intelligent project planning, task decomposition, and real-time monitoring using Claude Agent SDK
2. **🎨 MyContext CLI** - Component-first development with zero-error guarantees and production-ready code generation

**Result:** From client requirements to production deployment - fully automated with AI oversight.

## 🚀 Quick Start

### **Option 1: Complete Guided Setup (⭐ Recommended for New Projects)**

```bash
# Install globally
npm install -g mycontext-cli

# Single command complete setup with AI guidance
mycontext setup-complete --interactive

# That's it! Project is ready for development.
```

### **Option 2: Step-by-Step Development**

```bash
# Install globally
npm install -g mycontext-cli

# 1. Initialize project
mycontext init my-app

# 2. Generate context files (PRD, features, etc.)
mycontext generate-context-files --description "Your app idea"

# 3. Compile PRD (requires approval)
mycontext compile-prd

# 4. Generate individual components
mycontext generate types
mycontext generate brand
mycontext generate components-list
mycontext generate project-structure

# 5. Generate components with validation
mycontext generate-components all --with-tests

# 6. Preview components visually
mycontext preview components

# 7. Build complete app when ready
mycontext build-app --interactive
```

### **Option 3: AI-Powered Workflow Analysis**

```bash
# Install globally
npm install -g mycontext-cli

# 1. AI analyzes your project requirements

# 2. AI generates contextual workflow and executes it
mycontext workflow generate --description "E-commerce platform with payments"

# 3. Or use interactive workflow planning
mycontext workflow --interactive

# 4. AI creates complete project structure with components
# 5. Continue development with AI-generated architecture
```

## 💡 Philosophy: Component-First Development

**Start Small, Scale Gradually:**

1. **Context Files** → Define your app (PRD, features, technical specs)
2. **Component List** → AI automatically generates list of needed components
3. **Build Strategy** → Choose how to approach development
4. **Component Generation** → Build components one by one with validation
5. **Visual Preview** → See components in browser before integration
6. **Scale to App** → Assemble validated components into full application

**Result:** Production-ready apps with 0 errors, built incrementally.

## 🏗️ System Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Client Input  │───▶│  mycontext PM   │───▶│  MyContext CLI  │
│                 │    │  (Next.js App)  │    │                 │
│ • Requirements  │    │                 │    │ • Code Generation│
│ • Budget        │    │ • Task Planning │    │ • Component      │
│ • Timeline      │    │ • Progress Mgmt │    │   Creation      │
└─────────────────┘    │ • Real-time     │    └─────────────────┘
                       │   Monitoring    │
                       └─────────────────┘
                               │
                               ▼
                       ┌─────────────────┐
                       │  Progress Sync  │
                       │  (Webhooks)     │
                       └─────────────────┘
```

### **Data Flow:**

1. **Client Requirements** → mycontext PM analyzes and decomposes into structured JSON
2. **mycontext PM Plan** → MyContext CLI imports and generates project structure
3. **Code Generation** → MyContext builds production-ready components
4. **Progress Updates** → Real-time sync back to mycontext PM dashboard
5. **AI Oversight** → Continuous monitoring and intelligent suggestions

## 🎯 Key Features

### 🤖 **mycontext PM (NEW)**

- **Intelligent Project Planning** - AI decomposes requirements into epics, user stories, and tasks
- **Real-time Progress Monitoring** - Hourly checks, blocker detection, timeline adjustments
- **Client Brief Processing** - Parse contracts, budgets, and timelines into structured plans
- **Task Assignment & Tracking** - Automated task management with priority and dependency handling
- **Progress Synchronization** - Webhook integration for live dashboard updates

### ✅ **MyContext CLI (Component-First Development)**

- **Streamlined Workflow** - Single `generate architecture` command replaces 5 separate steps
- **Smart Next Steps** - Context-aware suggestions guide you through the development process
- **Zero-Error Guarantee** - TypeScript/ESLint/build validation on every component
- **UI Specification System** - Plain-English specs with accessibility & responsive guidance
- **Visual Preview** - Figma-like component board for testing
- **BYOK Model** - Use your own Claude/X.AI/OpenAI API keys (~$20/month)

### 🤖 **AI Workflow Analysis**

- **Intelligent Project Analysis** - AI understands your requirements and suggests optimal workflows
- **Contextual Workflow Generation** - Custom workflows tailored to your specific project needs
- **Component Recommendations** - AI suggests appropriate components and features
- **Architecture Guidance** - Recommends best tech stack and project structure

## 📋 Commands

### Complete Project Setup (⭐ NEW)

```bash
mycontext setup-complete --interactive       # Complete guided project setup
mycontext setup-complete --name "MyApp"      # Direct setup with options
```

### AI Workflow Analysis (NEW)

```bash
mycontext workflow analyze                   # Analyze project with AI
mycontext workflow generate                  # Generate and execute workflow
mycontext workflow --interactive             # Interactive workflow planning
```

### Streamlined Workflow (Recommended)

```bash
mycontext init <project-name>              # Initialize project
mycontext generate-context-files            # Generate PRD, features, specs
mycontext generate architecture             # Generate complete architecture
mycontext build-app                         # Build complete application
```

### Traditional Component-First Workflow

```bash
mycontext init <project-name>              # Initialize project
mycontext generate-context-files            # Generate PRD, features, specs
mycontext compile-prd                       # Compile context into PRD
mycontext generate types                    # Generate TypeScript types
mycontext generate brand                    # Generate brand guidelines
mycontext generate components-list          # Generate component list
mycontext generate project-structure        # Generate project structure
mycontext generate-components <name|all>    # Generate components
mycontext preview <type>                    # Preview components/app
mycontext build-app                         # Build complete application
```

### UI Specification

```bash
mycontext refine spec <component> --desc "description"    # Generate UI spec from description
mycontext refine spec <component> --json-file <path>      # Generate UI spec from JSON
mycontext generate-components all --verbose                # Auto-generate specs with components
```

### Setup & Configuration

```bash
mycontext setup                             # Configure AI providers
mycontext build-strategy                    # Choose build approach
mycontext health-check                      # Verify installation
```

## ⚙️ Configuration

### API Keys (Required)

```bash
# Create .mycontext/.env file
echo 'MYCONTEXT_CLAUDE_API_KEY=sk-ant-xxx' > .mycontext/.env
echo 'MYCONTEXT_XAI_API_KEY=xai-xxx' >> .mycontext/.env
```

**Recommended providers:**

- **Claude** (best for complex reasoning)
- **X.AI Grok** (best for code generation)
- **OpenAI** (most versatile)
- **Qwen3** (free via OpenRouter)

## 📊 Project Structure

```
my-app/
├── .mycontext/
│   ├── 01-prd.md                 # Product Requirements
│   ├── 02-a-features.md          # Features specification
│   ├── 02-b-user-flows.md        # User flows
│   ├── 02-c-edge-cases.md        # Edge cases
│   ├── 02-d-technical-specs.md   # Technical specifications
│   ├── 03-types.ts               # TypeScript types
│   ├── 04-branding.md            # Branding & design system
│   ├── 05-component-list.json    # Generated component list
│   └── .env                      # API keys
├── components/                    # Generated components
│   └── dashboard/
│       ├── RevenueCard.tsx       # Component file
│       ├── RevenueCard.spec.md   # UI specification
│       └── index.ts              # Export file
├── actions/                       # Server actions (if full-stack)
├── app/                          # Next.js routes (if full-stack)
└── package.json
```

## 📋 UI Specification Example

Generate detailed, plain-English specifications from simple descriptions:

```bash
mycontext refine spec RevenueCard --desc "A card showing total revenue prominently with percentage change"
```

**Output:**

```
📋 UI Specification for RevenueCard

📝 Compact Specification:
**RevenueCard Component - Compact Spec**

**Visual Hierarchy:**
- Primary: Total Revenue, $125,430
- Secondary: +12.5% from last month

**Layout:** vertical arrangement
**Spacing:** medium spacing between elements
**Colors:** primary, success theme

📋 Detailed Specification:
**RevenueCard Component - Detailed Implementation Spec**

**Component Overview:**
- Name: RevenueCard
- Type: card
- Description: A card component displaying revenue metrics...

**Visual Hierarchy:**
1. **title**: Total Revenue
   - Prominence: medium (medium (~16px))
2. **value**: $125,430
   - Prominence: high (large (~32px))
3. **subtitle**: +12.5% from last month
   - Prominence: low (small (~12px))

**Accessibility Requirements:**
- All interactive elements must have aria-label or aria-labelledby
- Focus management: tab order follows visual hierarchy
- Color contrast: minimum 4.5:1 ratio for text

**Responsive Adjustments:**
- Mobile (< 768px): Reduce spacing to 12px, stack vertically
- Desktop (> 768px): Standard spacing, maintain layout
```

## 🆚 MyContext + mycontext PM vs Others

| Feature                   | MyContext + mycontext PM | Lovable    | v0.dev      | Bolt        |
| ------------------------- | ------------------------ | ---------- | ----------- | ----------- |
| **AI Project Management** | ✅ Full System           | ❌ None    | ❌ None     | ❌ None     |
| **Code Location**         | Your machine             | Cloud      | Cloud       | Cloud       |
| **End-to-End Automation** | ✅ Requirements→Deploy   | ❌ Manual  | ❌ Manual   | ❌ Manual   |
| **Progress Monitoring**   | ✅ Real-time             | ❌ None    | ❌ None     | ❌ None     |
| **Validation Gates**      | 12+ checkpoints          | None       | None        | None        |
| **TypeScript Guarantee**  | 100%                     | No         | No          | No          |
| **PM Integration**        | ✅ Native                | ❌ None    | ❌ None     | ❌ None     |
| **Pricing**               | BYOK ($0-20/mo)          | $20-200/mo | Usage-based | Usage-based |

## 🐛 Troubleshooting

**"PRD Validation Failed"**

```bash
mycontext compile-prd --force
```

**"Component Build Failed"**

```bash
# Automatic retry with error context (max 3 attempts)
# Check .mycontext/progress/07-components/<component>.json
```

**"API Key Issues"**

```bash
mycontext setup  # Reconfigure API keys
mycontext health-check  # Verify setup
```

**"UI Spec Generation Failed"**

```bash
# Check if templates exist
ls src/templates/ui-spec-templates.json

# Generate spec with verbose output
mycontext refine spec ComponentName --desc "description" --verbose

# Use JSON input instead of description
mycontext refine spec ComponentName --json-file component.json
```

**"PM Plan Import Failed"**

```bash
# Validate PM plan structure first
mycontext import-project-plan ./pm-plan.json --validate

# Check for required fields in PM plan
# Required: project.name, project.description, breakdown.tasks, myContext.framework
```

**"Progress Export Issues"**

```bash
# Check if project has been initialized
mycontext export-progress --format summary

# Ensure .mycontext directory exists with todos.json
ls -la .mycontext/
```

**"mycontext PM Synchronization Failed"**

```bash
# Test webhook connectivity
curl -X POST https://mycontext-pm.example.com/webhook \
  -H "Content-Type: application/json" \
  -d '{"test": "connection"}'

# Check webhook URL format
mycontext export-progress --webhook https://mycontext-pm.example.com/webhook
```

## 📚 Documentation

- [Getting Started](https://github.com/farajabien/mycontext-cli#quick-start)
- [AI Workflow Analysis](https://github.com/farajabien/mycontext-cli#ai-workflow-analysis-new)
- [Component Generation](https://github.com/farajabien/mycontext-cli#traditional-component-first-workflow)
- [System Architecture](https://github.com/farajabien/mycontext-cli#system-architecture)
- [Build Strategies](https://github.com/farajabien/mycontext-cli#philosophy-component-first-development)

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

MIT © MyContext

---

**🤖 The future of AI-powered development: From requirements to production with mycontext PM oversight.**

**Built by developers, for developers. Your code stays on your machine.** 🚀
