# Quick Start Guide

Get up and running with MyContext CLI in 5 minutes.

## Prerequisites

- Node.js >= 18.0.0
- pnpm, npm, or yarn
- A code editor (VS Code recommended)
- (Optional) Claude Code or Cursor

## Installation

```bash
# Using pnpm (recommended)
pnpm add -g mycontext-cli

# Using npm
npm install -g mycontext-cli

# Using yarn
yarn global add mycontext-cli
```

**Verify installation**:
```bash
mycontext --version
# Should output: 4.0.0 or higher
```

## Quick Start: Path 1 - New Project from Scratch

### Step 1: Initialize Project (2 minutes)

```bash
# Create a new project
mycontext init my-saas-app --framework instantdb

# Follow the prompts:
# ? Project description: AI-powered code review SaaS
# ? Setup shadcn/ui? Yes
# ? Setup InstantDB? Yes
```

**What this does**:
- Creates `.mycontext/` directory
- Sets up shadcn/ui (if selected)
- Configures InstantDB (if selected)
- Creates template files

### Step 2: Configure AI Provider (30 seconds)

```bash
# Get GitHub token (recommended - free GPT-4o access)
# Visit: https://github.com/settings/tokens
# Create token with 'repo' scope

# Add to environment
echo 'GITHUB_TOKEN=your_token_here' > .mycontext/.env

# Or use Gemini (free tier)
# Visit: https://aistudio.google.com/apikey
echo 'GEMINI_API_KEY=your_key_here' > .mycontext/.env
```

### Step 3: Generate Context (1 minute)

```bash
# Generate complete project context
mycontext generate context --full

# This creates:
# ✅ 01-prd.md - Product requirements
# ✅ 02-user-flows.md - User journeys
# ✅ 03-branding.md - Design system
# ✅ 04-component-list.json - Component specs
# ✅ 05-technical-specs.md - Tech requirements
# ✅ 06-types.ts - TypeScript types
# ✅ 07-features.md - Feature breakdown
```

### Step 4: Generate Visual Screens (1 minute)

```bash
# Generate screens for key flows
mycontext generate:screens --all --format jsx

# Or generate specific screens
mycontext generate:screens login dashboard --format jsx

# Preview at: https://studio.mycontext.app
```

### Step 5: Start Coding! (30 seconds)

**With Claude Code:**
```bash
# Open in Claude Code
code .

# In Claude Code, ask:
"Using the specs in .mycontext/01-prd.md, implement the LoginForm component from .mycontext/04-component-list.json"
```

**With Cursor:**
```bash
# Open in Cursor
cursor .

# Reference files with @:
@.mycontext/01-prd.md @.mycontext/04-component-list.json
"Implement the login flow"
```

**Manual Development:**
```bash
# Start dev server
pnpm dev

# Components are in: .mycontext/screens/
# Copy and modify as needed
```

---

## Quick Start: Path 2 - From Design/Screenshot

### Step 1: Initialize Project

```bash
mycontext init design-clone --framework nextjs
```

### Step 2: Analyze Screenshot

```bash
# Analyze a design mockup
mycontext analyze ./mockup.png

# This extracts:
# ✅ Color palette
# ✅ Typography
# ✅ Layout structure
# ✅ Component list
# ✅ Spacing system
```

### Step 3: Generate Screens

```bash
# Generate screens based on analysis
mycontext generate:screens --all --format jsx
```

### Step 4: Start Coding

Your context is ready! Use with Claude Code or Cursor as shown above.

---

## Common Commands

```bash
# Check project status
mycontext status --detailed

# Generate sample test data
mycontext generate:sample-data --count 20

# Generate component specifications
mycontext generate:components-manifest

# Validate context files
mycontext validate prd

# Get help
mycontext --help
mycontext generate --help
```

---

## Next Steps

### 🎨 Customize Your Context

Edit the generated files in `.mycontext/` to match your exact needs:

```bash
# Edit PRD
code .mycontext/01-prd.md

# Regenerate context
mycontext generate context --full --force
```

### 📦 Generate Components

```bash
# Generate React components from specs
mycontext generate-components all

# Or generate specific groups
mycontext generate-components authentication
```

### 🔍 Preview Everything

Visit [studio.mycontext.app](https://studio.mycontext.app):
1. Upload your `.mycontext/` directory
2. Browse screens, components, and specs
3. Share with your team

### 🚀 Deploy

```bash
# Build for production
pnpm build

# Deploy to Vercel
vercel

# Or deploy to Netlify
netlify deploy
```

---

## Troubleshooting

### "No AI provider configured"

**Solution:**
```bash
# Add GitHub token or Gemini key
echo 'GITHUB_TOKEN=your_token' > .mycontext/.env
# or
echo 'GEMINI_API_KEY=your_key' > .mycontext/.env
```

### "Context files not found"

**Solution:**
```bash
# Check if .mycontext exists
ls -la .mycontext

# Regenerate if needed
mycontext generate context --full
```

### "Components not generating"

**Solution:**
```bash
# Check status
mycontext status

# Ensure context files exist
mycontext validate prd

# Try with verbose output
mycontext generate-components all --verbose
```

### "Permission denied"

**Solution:**
```bash
# Install with sudo (if needed)
sudo npm install -g mycontext-cli

# Or use npx (no install)
npx mycontext-cli init my-app
```

---

## FAQ

### How do I use MyContext with Claude Code?

1. Open your project in VS Code
2. Install Claude Code extension
3. The `.mycontext/` directory is automatically indexed
4. Reference files in prompts: "Using .mycontext/01-prd.md, implement..."

### How do I use MyContext with Cursor?

1. Open project in Cursor
2. Use `@` to reference files: `@.mycontext/01-prd.md`
3. Add to `.cursorrules`:
   ```markdown
   Always reference MyContext specs in .mycontext/
   Follow design system in .mycontext/03-branding.md
   ```

### Can I use MyContext with existing projects?

Yes! Run `mycontext init` in your existing project. It won't overwrite existing files.

### What frameworks does MyContext support?

- **InstantDB**: Full stack with real-time backend
- **Next.js**: Frontend focus with shadcn/ui
- **Other**: Any framework (context-only mode)

### Is MyContext free?

Yes! MyContext CLI is open source (MIT license). AI providers have free tiers:
- GitHub Models: Free GPT-4o for GitHub users
- Gemini: Generous free tier

### How do I update MyContext?

```bash
npm install -g mycontext-cli@latest
# or
pnpm add -g mycontext-cli@latest
```

### Where can I get help?

- **Documentation**: You're reading it!
- **Issues**: [GitHub Issues](https://github.com/farajabien/mycontext-cli/issues)
- **Discussions**: [GitHub Discussions](https://github.com/farajabien/mycontext-cli/discussions)

---

## Example Projects

Check out these complete examples:

- [SaaS Starter](https://github.com/farajabien/mycontext-examples/saas)
- [E-commerce](https://github.com/farajabien/mycontext-examples/ecommerce)
- [Dashboard](https://github.com/farajabien/mycontext-examples/dashboard)

---

## Video Tutorials

- [Getting Started (5 min)](https://youtube.com/watch?v=...)
- [Claude Code Integration (10 min)](https://youtube.com/watch?v=...)
- [Advanced Workflows (15 min)](https://youtube.com/watch?v=...)

---

## What's Next?

- [ ] Read [Complete Installation Guide](./installation.md)
- [ ] Follow [First Project Tutorial](./first-project.md)
- [ ] Learn [AI Tool Integration](./ai-tool-integration.md)
- [ ] Check [Implementation Roadmap](../roadmap/00-overview.md)

---

**Estimated Time**: 5-10 minutes
**Difficulty**: Beginner
**Last Updated**: February 6, 2024

🎉 **Congratulations!** You're now ready to build AI-powered applications with MyContext.
