# Getting Started with MyContext CLI

**AI-Powered Context & Component Library Generation**

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
# Should output: mycontext-cli@2.0.29
```

## 🎯 **Quick Start**

### **1. Initialize Your First Project**

```bash
# Create a new project
mycontext init my-awesome-app

# Or initialize in current directory
mycontext init . --yes
```

### **2. Configure AI Provider**

```bash
# Set up your AI provider (Claude recommended)
mycontext setup

# Or configure manually
export CLAUDE_API_KEY="your-claude-api-key"
```

### **3. Generate Your First Component Library**

```bash
# Generate context files
mycontext generate:context

# Generate InstantDB schema
mycontext generate:schema

# Generate types from schema
mycontext generate:types --from-schema

# Generate core 10 components
mycontext generate:components --core-only

# Preview and validate components
mycontext preview:components

# Generate all remaining components
mycontext generate:components --all
```

### **4. Refine Components (Optional)**

```bash
# Refine a specific component with AI suggestions and regression testing
mycontext refine:component GameBoard

# The system will automatically:
# - Generate AI-powered improvement suggestions
# - Run regression tests (TypeScript, ESLint, Unit Tests)
# - Show approval UI with test results and confidence scores
# - Track mutation history for auditing
# - Compare against baseline to detect regressions
```

### **5. Start Building**

```bash
# Export validated components to your app
mycontext export:components --validated-only

# Or manually copy from .mycontext/components/ to components/
cp -r .mycontext/components/mobile/* components/
cp -r .mycontext/components/desktop/* components/

# Start your Next.js app
npm run dev
```

## 🏗️ **Project Structure**

After initialization, your project will have this structure:

```
my-awesome-app/
├── .mycontext/           # MyContext configuration
│   ├── context/         # Context files
│   │   ├── 01-prd.md    # Product Requirements Document
│   │   ├── 02-brand.md  # Brand guidelines
│   │   └── 03-tech-stack.json
│   ├── schema.ts        # InstantDB schema
│   ├── types.ts         # Generated from schema
│   ├── 04-component-list.json # Project components
│   └── components/      # Generated component library
│       ├── mobile/      # Mobile variants
│       └── desktop/     # Desktop variants
├── app/                # Next.js app directory
│   └── mycontext-preview/ # Component preview
├── components/          # Your app components
│   └── ui/             # shadcn/ui (foundation)
├── lib/                # Utility functions
├── public/             # Static assets
└── package.json        # Dependencies
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

#### **UI Library Integration**

```bash
# Set up shadcn/ui (automatic with InstantDB)
mycontext setup --with-shadcn

# Or configure manually
pnpm dlx shadcn@latest init
```

## 🎯 **Core Workflow**

### **Component-First Development**

MyContext follows a Component-First approach - generate context, schema, types, then build your component library step by step:

```bash
# 1. Generate context files from your PRD
mycontext generate:context

# 2. Generate InstantDB schema from requirements
mycontext generate:schema

# 3. Generate TypeScript types from schema
mycontext generate:types --from-schema

# 4. Generate core 10 components (Button, Input, Card, etc.)
mycontext generate:components --core-only

# 5. Preview and validate components
mycontext preview:components

# 6. Generate all remaining components
mycontext generate:components --all
```

This workflow ensures:

- **Type Safety**: Types generated from schema, not assumptions
- **Quality Control**: Preview and validate before using components
- **Mobile + Desktop**: Separate variants for easy debugging
- **Incremental Development**: Start with core components, expand as needed

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

## 🚀 **Ready to Build?**

You're all set! Start building amazing applications with MyContext CLI:

```bash
# Create your first project
mycontext init my-first-app

# Generate components
mycontext generate components

# Start building!
mycontext build-app
```

Happy coding! 🎉
