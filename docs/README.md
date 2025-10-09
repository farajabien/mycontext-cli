# MyContext CLI Documentation

## Quick Links

- [Getting Started](01-getting-started/quick-start.md)
- [AI Agents System](02-core-features/ai-agents.md)
- [Intent Dictionary](02-core-features/intent-dictionary-system.md)
- [MyContext AI Model](02-core-features/mycontext-ai-model.md)
- [Command Reference](03-reference/commands.md)

## What is MyContext CLI?

MyContext CLI is a revolutionary AI-powered development tool that generates production-ready React components from natural language descriptions. Built with 11 specialized AI agents and our proprietary Intent Dictionary System, it achieves 95%+ accuracy in code generation while maintaining perfect type safety and accessibility compliance.

[Read the full system overview →](06-architecture/system-overview.md)

## Core Features

### 1. **MyContext AI** - Fine-tuned GPT-4o Mini

- **95%+ Accuracy**: Zero hallucination, perfect shadcn/ui component matching
- **50% Cost Reduction**: Cheaper than GPT-4 while maintaining quality
- **2s Generation Time**: Fast response for real-time development
- **Custom Training**: Proprietary model trained on our Intent Dictionary patterns

### 2. **Intent Dictionary** - Type-Safe Natural Language Mapping

- **30+ UI Patterns**: Comprehensive coverage of shadcn/ui components
- **Fuzzy Matching**: Intelligent phrase recognition with Fuse.js
- **Context Awareness**: Domain-specific variations (ecommerce, dashboard, etc.)
- **Validation Rules**: Built-in accessibility and design system compliance

### 3. **11 Specialized Agents** - Expert AI for Every Task

- **DesignPipelineAgent**: Orchestrates 8-phase design analysis
- **PromptConstructorAgent**: Builds context-aware generation prompts
- **CodeGenSubAgent**: Generates production-ready React components
- **IntentValidator**: Validates and enriches natural language intents
- **IntentEnricher**: Transforms intents into component specifications
- **IntentCodeValidator**: Post-generation validation and quality assurance
- **IntentClarificationService**: Interactive clarification for ambiguous intents
- **ContextEnricher**: Loads and unifies design system context
- **DesignManifestManager**: Manages design pipeline state
- **FileManager**: Handles file operations and project structure
- **ErrorHandler**: Comprehensive error handling and recovery

### 4. **Zero-Error Guarantee** - 12+ Validation Checkpoints

- **Intent Validation**: Natural language to component mapping verification
- **Code Validation**: Component structure, props, and accessibility checks
- **Type Safety**: Complete TypeScript type definitions
- **Design System Compliance**: Adherence to shadcn/ui patterns
- **Accessibility**: ARIA attributes and semantic HTML validation

## Documentation Structure

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

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Git

### Installation

```bash
npm install -g mycontext-cli
```

### Quick Start

```bash
# Initialize a new project
mycontext init my-app

# Generate your first component
mycontext generate:component "Create a login form with email and password fields"

# Run the design pipeline
mycontext design:analyze --prd requirements.md
```

### What You Get

- **Production-ready React components** with TypeScript
- **Complete shadcn/ui integration** with proper imports
- **Accessibility compliance** with ARIA attributes
- **Responsive design** with Tailwind CSS
- **Type safety** with comprehensive interfaces

## Key Benefits

### For Developers

- **10x Faster Development**: Generate components in seconds, not hours
- **Zero Learning Curve**: Natural language interface
- **Perfect Type Safety**: Complete TypeScript definitions
- **Accessibility First**: Built-in ARIA compliance
- **Design System Consistency**: Automatic shadcn/ui adherence

### For Teams

- **Consistent Code Quality**: Standardized component patterns
- **Reduced Code Review Time**: Pre-validated, high-quality output
- **Faster Onboarding**: New developers productive immediately
- **Design System Adoption**: Automatic compliance with design standards

### For Organizations

- **Cost Reduction**: 50% cheaper than GPT-4 with better quality
- **Faster Time to Market**: Rapid prototyping and development
- **Quality Assurance**: 12+ validation checkpoints
- **Competitive Advantage**: Proprietary Intent Dictionary System

## Community & Support

- **GitHub**: [mycontext-cli](https://github.com/mycontext/cli) - Source code and issues
- **Discord**: [MyContext Community](https://discord.gg/mycontext) - Real-time support
- **Documentation**: This site - Comprehensive guides and references
- **Examples**: [Component Gallery](https://mycontext.dev/gallery) - Real-world examples

## Contributing

We welcome contributions! See our [Contributing Guide](https://github.com/mycontext/cli/blob/main/CONTRIBUTING.md) for details.

### Areas for Contribution

- **Intent Dictionary**: Add new UI patterns and variations
- **Agent Development**: Enhance existing agents or create new ones
- **Documentation**: Improve guides and add examples
- **Testing**: Add test cases and improve coverage
- **Performance**: Optimize generation speed and accuracy

## License

MIT License - see [LICENSE](https://github.com/mycontext/cli/blob/main/LICENSE) for details.

---

**Ready to revolutionize your development workflow?** [Start with our Quick Start guide →](01-getting-started/quick-start.md)
