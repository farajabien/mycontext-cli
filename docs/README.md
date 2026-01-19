# MyContext CLI Documentation

<p align="center">
  <img src="https://raw.githubusercontent.com/farajabien/mycontext-cli/main/public/mycontext-logo.png" alt="MyContext Logo" width="200" />
</p>

## Quick Links

- [Getting Started](01-getting-started/quick-start.md)
- [AI Agents System](02-core-features/ai-agents.md)
- [Intent Dictionary](02-core-features/intent-dictionary-system.md)
- [MyContext AI Model](02-core-features/mycontext-ai-model.md)
- [Command Reference](03-reference/commands.md)

## What is MyContext CLI?

MyContext CLI is a **context generator for AI design tools** (like Google Stitch) and AI coding tools (Cursor, Claude Code).

**The job:** produce a high-signal `.mycontext/` folder (PRD, branding, user flows, edge cases, technical specs) and a **single “mega prompt”** you can paste into an AI designer to get beautiful screens fast.

**We don’t need to generate code.** We need to generate the context that makes AI design tools output high-quality UI consistently.

[Read the full system overview →](06-architecture/system-overview.md)

## Core Features

### 1. **Local-First Context Pack (`.mycontext/`)**

- **PRD + Features + User Flows**: tells the AI designer what to build
- **Branding + Design Tokens**: tells the AI designer how it should look
- **Edge Cases + States**: tells the AI designer what “good” looks like beyond happy paths
- **Technical Specs**: tells the AI designer constraints (platform, auth, data)

### 2. **Design Prompt Generator**

- **One mega prompt**: concatenates context into `design-prompt.txt`
- **Stitch format**: instructions tailored for AI designers
- **General format**: works with any design tool
- **API format**: JSON output for programmatic use

### 3. **Gap Detection + Clarification**

- Detects missing information before you prompt an AI designer
- Saves auto-generated assumptions for review
- Helps you iterate on requirements without losing structure

## Documentation Structure

### 📚 [01 - Getting Started](01-getting-started/)

- [Getting Started](01-getting-started/getting-started.md) - Install, generate context, create design prompts
- [Index](01-getting-started/INDEX.md) - Getting started hub

### 📖 [03 - Reference](03-reference/)

- [Commands](03-reference/commands.md) - CLI commands (including `generate:design-prompt`)
- [Configuration](03-reference/configuration.md) - Settings and environment variables

### 🧠 Legacy / Research Docs

Some docs still describe the older “code generation platform” direction. They’re being kept temporarily for reference while we complete the pivot.

### 📚 [01 - Getting Started](01-getting-started/)

- [Installation](01-getting-started/installation.md) - Setup and requirements
- [Quick Start](01-getting-started/quick-start.md) - Your first component in 5 minutes
- [First Project](01-getting-started/first-project.md) - Complete project tutorial
- [Core Concepts](01-getting-started/core-concepts.md) - Understanding the system

### 🎯 [02 - Core Features](02-core-features/)

- [AI Agents System](02-core-features/ai-agents.md) - How the 11 agents work together
- [Intent Dictionary](02-core-features/intent-dictionary-system.md) - Natural language mapping
- [Design Pipeline](02-core-features/design-pipeline.md) - 8-phase design analysis
- [Feature Assembly](02-core-features/feature-assembly.md) - Building complex UIs
- [MyContext AI Model](02-core-features/mycontext-ai-model.md) - Fine-tuned model details

### 📖 [03 - Reference](03-reference/)

- [Commands](03-reference/commands.md) - Complete command reference
- [Configuration](03-reference/configuration.md) - Settings and customization
- [API Reference](03-reference/api-reference.md) - TypeScript API for programmatic use
- [Intent Dictionary Reference](03-reference/intent-dictionary-reference.md) - All patterns with examples

### 🛠️ [04 - Guides](04-guides/)

- [Component Generation](04-guides/component-generation.md) - Step-by-step component creation
- [Custom Workflows](04-guides/custom-workflows.md) - A/B/C/D workflow examples
- [Database Setup](04-guides/database-setup.md) - InstantDB, Supabase integration
- [Deployment](04-guides/deployment.md) - Vercel, production setup
- [Troubleshooting](04-guides/troubleshooting.md) - Common issues and solutions

### 🚀 [05 - Advanced](05-advanced/)

- [Custom Agents](05-advanced/custom-agents.md) - Creating your own agents
- [Extending Intent Dictionary](05-advanced/extending-intent-dictionary.md) - Adding custom patterns
- [Fine-Tuning Guide](05-advanced/fine-tuning-guide.md) - Training your own model
- [Performance Optimization](05-advanced/performance-optimization.md) - Caching, parallel processing

### 🏗️ [06 - Architecture](06-architecture/)

- [System Overview](06-architecture/system-overview.md) - High-level architecture
- [Agent Architecture](06-architecture/agent-architecture.md) - Detailed agent interactions
- [Design System](06-architecture/design-system.md) - Design pipeline technical details
- [PM Integration](06-architecture/pm-integration.md) - Product management integration

## Quick Start

```bash
# Install
npm install -g mycontext-cli

# Initialize a project (or run inside an existing one)
mycontext init my-app --framework nextjs
cd my-app

# Generate the .mycontext context pack (PRD, branding, flows, etc.)
mycontext generate-context-files --description "Describe your app..."

# Create a mega prompt for AI designers (Stitch, etc.)
mycontext generate:design-prompt --format stitch

# Copy .mycontext/design-prompt.txt → paste into Stitch → get UI screens
```

## Key Benefits

- **Best prompts win**: you stop hand-writing long context writeups
- **Design consistency**: brand + flows + edge cases keep outputs coherent
- **Tool-agnostic**: use Stitch (design) + Claude/Cursor (code) with the same `.mycontext/` pack

## Contributing

We welcome contributions! The highest impact areas right now:

- Better `.mycontext/` templates
- Better `design-prompt` formatting for Stitch and other AI designers
- Better gap detection / clarification questions

### Areas for Contribution

- **Intent Dictionary**: Add new UI patterns and variations
- **Agent Development**: Enhance existing agents or create new ones
- **Documentation**: Improve guides and add examples
- **Testing**: Add test cases and improve coverage
- **Performance**: Optimize generation speed and accuracy

## License

MIT License - see [LICENSE](https://github.com/mycontext/cli/blob/main/LICENSE) for details.

---

**Start here:** [Getting Started →](01-getting-started/getting-started.md)
