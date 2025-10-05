# Getting Started with MyContext CLI

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
# Should output: mycontext-cli@2.0.10
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

### **3. Generate Your First Component**

```bash
# Generate all components from context
mycontext generate components

# Or generate specific component
mycontext generate components Button
```

### **4. Start Building**

```bash
# Build complete application
mycontext build-app

# Or enhance existing components
mycontext enhance Button --prompt "Add loading state"
```

## 🏗️ **Project Structure**

After initialization, your project will have this structure:

```
my-awesome-app/
├── .mycontext/           # MyContext configuration
│   ├── prd.md           # Product Requirements Document
│   ├── types.ts         # TypeScript type definitions
│   ├── brand.md         # Brand guidelines and design system
│   ├── components.json  # Component specifications
│   └── .env            # Environment variables
├── components/          # Generated components
│   ├── ui/             # shadcn/ui components
│   ├── forms/          # Form components
│   └── layout/         # Layout components
├── app/                # Next.js app directory
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

## 🎯 **Core Workflows**

### **1. Component Generation Workflow**

```bash
# 1. Analyze existing project
mycontext analyze

# 2. Generate context files
mycontext generate context

# 3. Generate components
mycontext generate components

# 4. Validate and test
mycontext validate

# 5. Build and deploy
mycontext build-app
```

### **2. Enhancement Workflow**

```bash
# 1. Enhance existing component
mycontext enhance Button --prompt "Add dark mode support"

# 2. Generate UI specification
mycontext refine spec Button --desc "Dark mode toggle button"

# 3. Validate changes
mycontext validate Button

# 4. Update documentation
mycontext docs Button
```

### **3. Project Migration Workflow**

```bash
# 1. Analyze existing project
mycontext analyze existing-project

# 2. Migrate to MyContext
mycontext migrate --all

# 3. Generate missing components
mycontext generate components --all

# 4. Validate migration
mycontext validate --all
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
# Generate all components
mycontext generate components

# Generate specific component
mycontext generate components <component-name>

# Generate with tests
mycontext generate components --with-tests

# Generate complete architecture
mycontext generate components --complete-architecture
```

### **Enhancement & Refinement**

```bash
# Enhance component
mycontext enhance <component> --prompt "<description>"

# Refine component
mycontext refine <component> --prompt "<description>"

# Generate UI specification
mycontext refine spec <component> --desc "<description>"
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
mycontext preview

# List components
mycontext list

# Validate project
mycontext validate

# Sanitize code
mycontext sanitize
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
