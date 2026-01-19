# Getting Started with MyContext CLI

**Context Generator for AI Design Tools (Stitch, etc.)**

## 🚀 **Installation**

### **Prerequisites**

- Node.js 18+
- npm or pnpm package manager
- Git (for version control)

### **Install MyContext CLI**

```bash
# Install globally
npm install -g mycontext-cli

# Or use npx (no installation required)
npx mycontext-cli@latest
```

### **Verify Installation**

```bash
mycontext --version
```

## 🎯 **Quick Start (Design-First)**

### **1. Initialize Your First Project**

```bash
# Create a new project
mycontext init my-awesome-app --framework nextjs

# Or initialize in current directory
mycontext init . --yes
```

### **2. Configure AI Provider**

```bash
# Recommended (free tier): OpenRouter
echo 'MYCONTEXT_OPENROUTER_API_KEY=your-key' > .mycontext/.env

# Then verify
mycontext status
```

### **3. Generate Your Context Pack (`.mycontext/`)**

```bash
# Generate A/B/C/D context files (features, flows, edge cases, tech specs)
mycontext generate-context-files --description "Describe your app..."

# Optional: compile into a single PRD if you maintain multiple context files
mycontext compile-prd
```

### **4. Generate a Design Prompt for Stitch**

```bash
mycontext generate:design-prompt --format stitch
# Output: .mycontext/design-prompt.txt
```

### **5. Use It**

```bash
# 1) Copy/paste .mycontext/design-prompt.txt into Stitch (or your AI designer)
# 2) Get UI screens and flows
# 3) Use the same .mycontext/ files as prompts in Cursor / Claude Code to implement
```

## 🏗️ **Project Structure**

After initialization, your project will have this structure:

```
my-awesome-app/
├── .mycontext/
│   ├── 01a-features.md
│   ├── 01b-user-flows.md
│   ├── 01c-edge-cases.md
│   ├── 01d-technical-specs.md
│   ├── 02-prd.md
│   ├── 03-branding.md
│   ├── 04-component-list.json
│   ├── 05-project-structure.md
│   ├── design-prompt.txt
│   └── .env            # Your AI provider key(s)
└── (your app files)
```

## ⚙️ **Configuration**

### **AI Provider Setup**

#### **Claude (Recommended)**

```bash
# Get API key from: https://console.anthropic.com/
export CLAUDE_API_KEY="sk-ant-..."

# Verify connection
mycontext status
```

#### **OpenAI**

```bash
# Get API key from: https://platform.openai.com/
export OPENAI_API_KEY="sk-..."

# Verify connection
mycontext status
```

#### **OpenRouter (Free Tier - DeepSeek-R1)**

```bash
# Get free API key from: https://openrouter.ai/keys
export MYCONTEXT_OPENROUTER_API_KEY="sk-or-..."

# Uses DeepSeek-R1 for advanced reasoning and better code generation
# Verify connection
mycontext status
```

#### **Local Development (Ollama)**

```bash
# Install Ollama
curl -fsSL https://ollama.ai/install.sh | sh

# Pull Claude model
ollama pull claude-3-sonnet

# Configure MyContext
mycontext setup --local
```

### **Project Configuration**

#### **Framework Selection**

```bash
# InstantDB (Recommended for real-time apps)
mycontext init my-app --framework instantdb

# Next.js (Traditional web apps)
mycontext init my-app --framework nextjs

# Other (Manual setup)
mycontext init my-app --framework other
```

**What you get with InstantDB:**

When you run `mycontext init my-app --framework instantdb`, MyContext automatically:

1. ✅ Sets up Next.js 15 with App Router
2. ✅ Initializes shadcn/ui components (Button, Input, Card, Checkbox)
3. ✅ Installs InstantDB dependencies (`@instantdb/react`, `@instantdb/admin`, `@tanstack/react-query`)
4. ✅ Generates schema files (`instant.schema.ts`, `instant.perms.ts`)
5. ✅ Creates database client (`lib/db.ts`)
6. ✅ Sets up environment file (`.env` with `NEXT_PUBLIC_INSTANT_APP_ID`)
7. ✅ Generates sample todo app (`app/home-client.tsx`, `app/page.tsx`)
8. ✅ Pushes schema to InstantDB

**Result:** You get a fully working real-time todo app out of the box! Just add your InstantDB App ID and run `pnpm dev`.

#### **UI Library Integration**

```bash
# shadcn/ui is automatic with InstantDB
# No additional setup needed!

# For Next.js projects, configure manually:
pnpm dlx shadcn@latest init
```

## 🎯 **Core Workflow**

### **Design-First (recommended)**

```bash
# 1) Generate .mycontext/ pack
mycontext generate-context-files --description "..."

# 2) Generate Stitch prompt
mycontext generate:design-prompt --format stitch

# 3) Paste into Stitch → get UI screens
# 4) Use same .mycontext files in Cursor/Claude Code to implement
```

### **Component Refinement (New in v2.0.29)**

Refine components with AI-powered suggestions and automatic regression testing:

```bash
# Refine a component
mycontext refine:component <ComponentName>
```

**Features:**

- AI-generated improvement suggestions
- Automatic regression testing (TypeScript, ESLint, Unit Tests)
- Mutation history tracking
- Baseline comparison for regression detection
- Interactive approval with confidence scores

**Example Approval UI:**

```
📝 Component Refinement Proposal: GameBoard

🔍 Changes:
  Added keyboard navigation and ARIA labels

📊 Test Results:
  ✅ TypeScript: Pass
  ✅ ESLint: Pass
  ✅ Unit Tests: 8/8 passing

🤖 AI Confidence: 87%
📈 Regression Check: No regressions detected

[A]ccept  [R]eject  [V]iew Diff
```

## 🛠️ **Essential Commands**

### **Project Management**

```bash
# Initialize new project
mycontext init <project-name>

# Analyze existing project
mycontext analyze

# Check project health
mycontext health-check

# Update MyContext CLI
mycontext update
```

### **Component Generation**

```bash
# Generate core 10 components
mycontext generate:components --core-only

# Generate all components
mycontext generate:components --all

# Generate specific component
mycontext generate:components <component-name>

# Generate with tests
mycontext generate:components --with-tests
```

### **Preview & Validation**

```bash
# Preview components in browser
mycontext preview:components

# Refine specific component
mycontext refine:component <component-name>

# Review context and approve features
mycontext review:context
```

### **Database & Backend**

```bash
# Set up InstantDB
mycontext setup-instantdb

# Set up database
mycontext setup-database

# Set up MCP integration
mycontext setup-mcp
```

### **Development Tools**

```bash
# Preview components
mycontext preview:components

# List components
mycontext list:components

# Validate project
mycontext validate:project

# Check project status
mycontext status
```

## 🎯 **Best Practices**

### **1. Start Small**

- Begin with simple components (Button, Input, Card)
- Gradually build more complex components
- Use the enhancement workflow to iterate

### **2. Use Context Effectively**

- Keep PRD updated with clear requirements
- Maintain comprehensive type definitions
- Document brand guidelines thoroughly

### **3. Leverage AI Agents**

- Use specialized agents for different tasks
- Let QA agent validate all generated code
- Use enhancement agent for iterative improvements

### **4. Maintain Quality**

- Run validation after each generation
- Use health checks regularly
- Keep components focused and reusable

## 🚨 **Troubleshooting**

### **Common Issues**

#### **"No AI provider configured"**

```bash
# Check environment variables
echo $CLAUDE_API_KEY

# Reconfigure
mycontext setup
```

#### **"Component generation failed"**

```bash
# Check project structure
mycontext analyze

# Validate context files
mycontext validate

# Try with verbose output
mycontext generate components --verbose
```

#### **"Build errors"**

```bash
# Check TypeScript errors
mycontext validate

# Sanitize code
mycontext sanitize

# Health check
mycontext health-check --fix
```

### **Getting Help**

```bash
# Show help for any command
mycontext <command> --help

# Check status
mycontext status

# View logs
mycontext logs
```

## 🎯 **Next Steps**

Now that you're set up, explore these advanced features:

- **[AI Agent System](ai-agents.md)** - Learn about our specialized agents
- **[Command Reference](commands.md)** - Complete command documentation
- **[Configuration Guide](configuration.md)** - Advanced configuration options
- **[Examples](examples.md)** - Real-world usage patterns

## 🚀 **Ready?**

Generate your context pack and prompt:

```bash
mycontext generate-context-files --description "..."
mycontext generate:design-prompt --format stitch
```
