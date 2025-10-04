# MyContext CLI

**🎨 Component-First Visual Builder with Zero-Error Guarantees**

[![npm version](https://badge.fury.io/js/mycontext-cli.svg)](https://www.npmjs.com/package/mycontext-cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org)

Generate production-ready React/Next.js components **one at a time**, preview them visually, then scale to complete applications. Every component guaranteed **zero TypeScript/ESLint/build errors**.

## 🚀 Quick Start

```bash
# Install globally
npm install -g mycontext-cli

# 1. Initialize project
mycontext init my-app

# 2. Generate context files (PRD, features, etc.)
mycontext generate-context-files --description "Your app idea"

# 3. Component list is generated automatically
# 4. Compile PRD (requires approval)
mycontext compile-prd

# 5. Generate components with validation
mycontext generate-components all --with-tests

# 6. Preview components visually
mycontext preview components

# 7. Build complete app when ready
mycontext build-app --interactive
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

## 🎯 Key Features

### ✅ Zero-Error Guarantee

- **TypeScript validation** on every component
- **ESLint checks** with automatic fixes
- **Build validation** before moving forward
- **Automatic retries** with error context (max 3 attempts)

### ✅ UI Specification System

- **Plain-English specs** from component descriptions
- **JSON-to-spec conversion** for structured input
- **Built-in templates** for common patterns (cards, forms, buttons)
- **Detailed implementation guidance** with accessibility & responsive requirements
- **Integrated workflow** with component generation

### ✅ Visual Preview

- **Figma-like component board** for visual testing
- **Interactive component playground**
- **Responsive design testing**

### ✅ BYOK Model (Bring Your Own Keys)

- Use your own Claude/X.AI/OpenAI API keys
- No billing from us - you control costs
- Transparent pricing (~$20/month for unlimited usage)

## 📋 Commands

### Core Workflow

```bash
mycontext init <project-name>              # Initialize project
mycontext generate-context-files            # Generate PRD, features, specs
mycontext compile-prd                       # Compile context into PRD
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

## 🆚 MyContext vs Others

| Feature                  | MyContext       | Lovable    | v0.dev      |
| ------------------------ | --------------- | ---------- | ----------- |
| **Code Location**        | Your machine    | Cloud      | Cloud       |
| **Validation Gates**     | 12+ checkpoints | None       | None        |
| **Build Validation**     | Every component | None       | None        |
| **TypeScript Guarantee** | 100%            | No         | No          |
| **UI Specifications**    | Plain-English   | None       | None        |
| **Pricing**              | BYOK ($0-20/mo) | $20-200/mo | Usage-based |
| **Deployment**           | Anywhere        | Limited    | Vercel only |

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

## 📚 Documentation

- [Getting Started](https://github.com/farajabien/mycontext-cli#quick-start)
- [Component Generation](https://github.com/farajabien/mycontext-cli#commands)
- [Build Strategies](https://github.com/farajabien/mycontext-cli#philosophy-component-first-development)

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

MIT © MyContext

---

**Built by developers, for developers. Your code stays on your machine.** 🚀
