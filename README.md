# MyContext CLI + mycontext PM System

**🤖 AI-Powered Project Management + Component-First Development**

[![npm version](https://badge.fury.io/js/mycontext-cli.svg)](https://www.npmjs.com/package/mycontext-cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org)

**🎨 MyContext CLI** - Component-first development with zero-error guarantees and production-ready code generation

<!-- Future: mycontext PM - Intelligent project planning, task decomposition, and real-time monitoring using Claude Agent SDK -->

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

## 🎨 Design-Driven Development

MyContext uses a revolutionary design pipeline that treats all context files as a unified design system foundation:

### **Design Workflow**

1. **Context Files** (PRD + Types + Brand + Component List) serve as design foundation
2. **Design Pipeline** analyzes and generates rich design manifest with 8-phase reasoning
3. **Components** inherit design system automatically with visual tokens and design principles

### **Design Commands**

```bash
# Generate design manifest from all context files
mycontext design analyze

# Resume from last failure (auto-detected or explicit)
mycontext design analyze --resume

# Validate context files for design consistency
mycontext design validate

# View design manifest summary
mycontext design summary

# Regenerate design manifest with updated context
mycontext design regenerate
```

### **Error Recovery Example**

```bash
# Pipeline fails at Phase 6 due to rate limit
mycontext design analyze
# ... Phase 1-5 complete, Phase 6 fails

# Wait 60 seconds, then resume
mycontext design analyze --resume
# ... Resumes from Phase 6, skips 1-5
```

### **Design System Integration**

- **Visual Tokens** - Colors, typography, spacing automatically applied to components
- **Design Principles** - Consistent design patterns across all generated components
- **Component Architecture** - Hierarchical component structure with design relationships
- **Design Intent** - User experience focus and design anchors guide component generation

## 🚀 Feature Assembly (NEW)

MyContext doesn't stop at components - we assemble them into **working features**:

### From Components to Features

```
Components → Features → Role-Based Access → Production App
```

### What is a Feature?

A Feature bundles:

- **Components**: UI elements (buttons, forms, cards)
- **Types**: TypeScript interfaces and types
- **Actions**: Server actions for data mutations
- **Hooks**: Custom React hooks for state management
- **Routes**: API routes and page routes
- **Database**: InstantDB schema and queries
- **Permissions**: Role-based access control

### Quick Start with Admin Starter

```bash
# Option 1: Complete setup with admin starter
mycontext setup-complete --with-admin-starter

# Option 2: Add to existing project
mycontext clone-starter --url <your-admin-repo>
mycontext assemble-features --role admin
```

### Admin-First Development

1. **Build Admin Features First** - Full CRUD permissions
2. **Cascade to User Role** - Subset of admin (read-only, limited actions)
3. **Add Guest Features** - Public-only features

**Why Admin First?** If admin CRUD works, user READ-ONLY is trivial to generate.

### Feature Assembly Commands

```bash
# Assemble from generated components
mycontext assemble-features --from-components

# Use admin starter template
mycontext assemble-features --use-starter --role admin

# Generate specific feature
mycontext assemble-features --feature user-management --role admin

# Generate for specific role
mycontext assemble-features --role user --from-components
```

### Example: User Management Feature

```bash
mycontext assemble-features --feature user-management --role admin
```

**Generated**:

- 5 Components (UserList, UserCard, UserForm, InviteDialog, UserSettings)
- 12 Server Actions (createUser, updateUser, deleteUser, inviteUser, etc.)
- 3 Custom Hooks (useUsers, useInvites, useUserPermissions)
- 2 API Routes (/api/users, /api/invites)
- InstantDB Schema (users, invites, permissions tables)
- Role Permissions (admin: full access, user: read own profile)

### The MyContext Promise

**Before** (Component Library Only):

- Generate 50 components ✅
- Developer manually assembles features ⏱️ 2-3 days
- Wire up actions, hooks, routes ⏱️ 1-2 days
- Add auth and permissions ⏱️ 1 day

**After** (Feature Assembly):

- Generate 50 components ✅
- MyContext assembles into 10 features ⚡ 10 minutes
- Generate for admin role ⚡ 5 minutes
- Adapt for user role ⚡ 3 minutes

**Total**: Production-ready app with auth, features, and role-based access in **under 30 minutes**.

## 💡 Philosophy: Component-First to Feature-Complete

**Start Small, Scale Fast:**

1. **Context Files** → Define your app (PRD, features, technical specs)
2. **Design Pipeline** → AI analyzes context files as unified design system
3. **Design Manifest** → Rich design tokens, principles, and component architecture
4. **Component List** → AI automatically generates list of needed components
5. **Component Generation** → Build components with design system integration
6. **Feature Assembly** → Combine components into working features (NEW)
7. **Role-Based Access** → Generate for admin, then cascade to other roles (NEW)
8. **Visual Preview** → See features in browser before deployment
9. **Production Deploy** → Complete app with auth, features, and permissions

**Result:** Production-ready apps with working features, auth, and role-based access in hours, not weeks.

## 🏗️ System Architecture

```
┌─────────────────┐    ┌─────────────────┐
│   Client Input  │───▶│  MyContext CLI  │
│                 │    │                 │
│ • Requirements  │    │ • Code Generation│
│ • Description   │    │ • Component      │
│ • Tech Stack    │    │   Creation      │
└─────────────────┘    └─────────────────┘
```

<!-- Future PM Architecture:
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
-->

### **Data Flow:**

1. **Client Requirements** → AI analyzes and generates project structure
2. **Code Generation** → MyContext builds production-ready components
3. **AI Oversight** → Intelligent suggestions and validation throughout development

<!-- Future PM Data Flow:
1. Client Requirements → mycontext PM analyzes and decomposes into structured JSON
2. mycontext PM Plan → MyContext CLI imports and generates project structure
3. Code Generation → MyContext builds production-ready components
4. Progress Updates → Real-time sync back to mycontext PM dashboard
5. AI Oversight → Continuous monitoring and intelligent suggestions
-->

## 🎯 Key Features

<!-- Future: mycontext PM (Coming Soon)
- Intelligent Project Planning - AI decomposes requirements into epics, user stories, and tasks
- Real-time Progress Monitoring - Hourly checks, blocker detection, timeline adjustments
- Client Brief Processing - Parse contracts, budgets, and timelines into structured plans
- Task Assignment & Tracking - Automated task management with priority and dependency handling
- Progress Synchronization - Webhook integration for live dashboard updates
-->

### ✅ **MyContext CLI (Component-First Development)**

- **Streamlined Workflow** - Single `setup-complete` command for full project setup
- **Design-Driven Development** - Revolutionary design pipeline treats all context files as unified design system
- **Feature Assembly** - Combine components into working features with auth, actions, and role-based access
- **Admin-First Development** - Build admin features first, then cascade to user roles automatically
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

### Design Pipeline (NEW)

```bash
mycontext design analyze                     # Generate design manifest from context files
mycontext design validate                    # Validate context files for design consistency
mycontext design summary                     # View design manifest summary
mycontext design regenerate                  # Regenerate design manifest with updated context
```

### Feature Assembly (NEW)

```bash
# Assemble components into features
mycontext assemble-features --from-components    # From generated components
mycontext assemble-features --use-starter        # With admin starter
mycontext assemble-features --role admin         # For specific role
mycontext assemble-features --feature <name>     # Specific feature only

# Clone admin starter
mycontext clone-starter --url <repo-url>         # Clone from GitHub
mycontext clone-starter --install --setup        # Clone and setup
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

## 🆚 MyContext CLI vs Others

| Feature                   | MyContext CLI          | Lovable    | v0.dev      | Bolt        |
| ------------------------- | ---------------------- | ---------- | ----------- | ----------- |
| **AI Project Management** | 🚧 Coming Soon         | ❌ None    | ❌ None     | ❌ None     |
| **Code Location**         | Your machine           | Cloud      | Cloud       | Cloud       |
| **End-to-End Automation** | ✅ Requirements→Deploy | ❌ Manual  | ❌ Manual   | ❌ Manual   |
| **Progress Monitoring**   | ✅ Context-Aware       | ❌ None    | ❌ None     | ❌ None     |
| **Validation Gates**      | 12+ checkpoints        | None       | None        | None        |
| **TypeScript Guarantee**  | 100%                   | No         | No          | No          |
| **PM Integration**        | 🚧 Coming Soon         | ❌ None    | ❌ None     | ❌ None     |
| **Pricing**               | BYOK ($0-20/mo)        | $20-200/mo | Usage-based | Usage-based |

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

<!-- Future: mycontext PM Synchronization (Coming Soon)
# Test webhook connectivity
curl -X POST https://mycontext-pm.example.com/webhook \
  -H "Content-Type: application/json" \
  -d '{"test": "connection"}'

# Check webhook URL format
mycontext export-progress --webhook https://mycontext-pm.example.com/webhook
-->

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

**🤖 The future of AI-powered development: From requirements to production with intelligent automation.**

**Built by developers, for developers. Your code stays on your machine.** 🚀

<!-- Future: 🤖 The future of AI-powered development: From requirements to production with mycontext PM oversight. -->
