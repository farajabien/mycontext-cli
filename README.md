# MyContext CLI + MyContext AI

**AI-Powered Context & Component Library Generation for Your Next.js App**

[![npm version](https://badge.fury.io/js/mycontext-cli.svg)](https://www.npmjs.com/package/mycontext-cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org)

Generate your context files and component library. That's it. Use it inside Cursor or any IDE. Built on top of shadcn/ui with our Intent Dictionary System for 95%+ accuracy.

## 🚀 Quick Start

```bash
# Install globally
npm install -g mycontext-cli

# Initialize a new project
mycontext init my-app
cd my-app

# Configure your AI provider
echo 'ANTHROPIC_API_KEY=your-key' > .mycontext/.env

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

## ✨ What You Get

- **Context Files** - PRD, branding, tech stack from your project analysis
- **InstantDB Schema** - Database schema generated from your requirements
- **TypeScript Types** - Generated from schema for type safety
- **Component Library** - Mobile + desktop variants built on shadcn/ui
- **Preview System** - Validate components before using in your app
- **Zero Hallucination** - Intent Dictionary maps natural language to exact components
- **Clarification System** - Detects gaps and tracks auto-generated features for approval

## 💰 Pricing

- **MyContext CLI** - Free and open source (MIT License)
- **MyContext AI API** - Hosted fine-tuned model (beta)

Use the CLI with your own AI provider keys (Claude, OpenAI, XAI) for free, or upgrade to our hosted API for best-in-class quality.

## 📚 Full Documentation

**Complete guides, tutorials, and API reference available on GitHub:**

👉 **[View Full Documentation](https://github.com/farajabien/mycontext-cli/tree/main/docs)**

- [Getting Started Guide](https://github.com/farajabien/mycontext-cli/blob/main/docs/01-getting-started/quick-start.md)
- [AI Agents System](https://github.com/farajabien/mycontext-cli/blob/main/docs/02-core-features/ai-agents.md)
- [Intent Dictionary](https://github.com/farajabien/mycontext-cli/blob/main/docs/02-core-features/intent-dictionary-system.md)
- [Command Reference](https://github.com/farajabien/mycontext-cli/blob/main/docs/03-reference/commands.md)
- [Architecture](https://github.com/farajabien/mycontext-cli/blob/main/docs/06-architecture/system-overview.md)

## 🎯 Key Features

- **Component-First Workflow** - Generate context → schema → types → core 10 → validate → all components
- **Mobile + Desktop Variants** - Separate files for easy debugging and validation
- **Schema-Driven Types** - TypeScript types generated from InstantDB schema
- **Preview & Validation** - Interactive component gallery with quality checks
- **Intent Dictionary** - 30+ UI patterns with type-safe natural language mapping
- **shadcn/ui Foundation** - Built on top of shadcn/ui, respecting its design principles
- **Clarification System** - Prevents vague requests by detecting gaps and tracking assumptions

## 🔍 How MyContext Ensures Accuracy

### Gap Detection

MyContext analyzes your requirements and detects missing critical information:

```bash
❌ Critical information missing:

1. What type of game is this?
   - a) Turn-based (Tic-tac-toe, Chess)
   - b) Real-time (Racing, Shooting)
   - c) Puzzle (Matching, Strategy)
```

### Auto-Generated Feature Tracking

All assumptions are tracked for your approval:

```bash
📋 Auto-generated Features Review

1. Real-time multiplayer with Socket.io
   Reasoning: You mentioned "play against each other"
   Confidence: Medium
   [Y] Accept  [N] Reject  [E] Edit
```

### Interactive Approval System

Review and approve features before component generation:

```bash
mycontext review:context
```

### Iterative Refinement

Refine components with AI suggestions:

```bash
mycontext refine:component UserCard --in-place
```

## 🤝 Contributing

Contributions welcome! See our [Contributing Guide](https://github.com/farajabien/mycontext-cli/blob/main/CONTRIBUTING.md).

## 📄 License

MIT © MyContext - See [LICENSE](https://github.com/farajabien/mycontext-cli/blob/main/LICENSE) for details.

---

**Built by developers, for developers. Your code stays on your machine.** 🚀

[Full Documentation](https://github.com/farajabien/mycontext-cli/tree/main/docs) • [GitHub](https://github.com/farajabien/mycontext-cli) • [Issues](https://github.com/farajabien/mycontext-cli/issues)
