# Core Features

The heart of MyContext CLI - our AI agents, Intent Dictionary, and specialized models.

## Contents

- [AI Agents System](ai-agents.md) - How the 11 agents work together
- [Intent Dictionary](intent-dictionary-system.md) - Natural language mapping
- [Design Pipeline](design-pipeline.md) - 8-phase design analysis
- [Component Library Workflow](component-library-workflow.md) - Building component libraries
- [Clarification Workflow](clarification-workflow.md) - Gap detection and approval system
- [MyContext AI Model](mycontext-ai-model.md) - Fine-tuned model details

## Key Features

### 🤖 **11 Specialized AI Agents**

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

### 🎯 **Intent Dictionary System**

- **30+ UI Patterns**: Comprehensive coverage of shadcn/ui components
- **Fuzzy Matching**: Intelligent phrase recognition with Fuse.js
- **Context Awareness**: Domain-specific variations
- **Validation Rules**: Built-in accessibility and design system compliance

### 🔍 **Clarification System**

- **Gap Detection**: Identifies missing critical information in requirements
- **Auto-Generated Feature Tracking**: Tracks all assumptions for user approval
- **Interactive Approval**: Review and approve features before generation
- **Trigger Logging**: Transparent tracking of what causes regeneration
- **Iterative Refinement**: Refine components with AI suggestions

### 🔄 **Component Refinement & Regression (New in v2.0.29)**

- **AI-Powered Refinement**: Intelligent component improvement suggestions
- **Automatic Regression Testing**: TypeScript, ESLint, and Unit Test validation
- **Mutation Provenance**: Complete history of all component changes
- **Baseline Comparison**: Detect regressions against previous versions
- **Confidence Scoring**: AI provides confidence levels for refinements
- **Interactive Approval**: Review changes with test results before applying
- **Risk Flag Detection**: Identifies potential issues in refinements

### 🧠 **MyContext AI Model**

- **Fine-tuned for Component Generation**: Optimized specifically for UI component patterns
- **Intent Dictionary-driven**: Uses our pattern library for accurate component matching
- **shadcn/ui Optimized**: Trained on shadcn/ui patterns and best practices
- **Fast Generation**: Optimized for real-time development workflows

### 🔄 **Design Pipeline**

- **8 Phases**: Comprehensive design analysis and component generation
- **Context Loading**: Unified design system foundation
- **Intent Validation**: Natural language to component mapping
- **Quality Assurance**: 12+ validation checkpoints

## How It Works

1. **Input**: Natural language description of UI requirements
2. **Analysis**: DesignPipelineAgent analyzes requirements and context
3. **Gap Detection**: ContextValidator identifies missing critical information
4. **Feature Tracking**: Auto-generated assumptions tracked for approval
5. **Validation**: IntentValidator maps natural language to component patterns
6. **Enrichment**: IntentEnricher transforms intents into specifications
7. **Generation**: CodeGenSubAgent generates production-ready components
8. **Validation**: IntentCodeValidator ensures quality and compliance
9. **Output**: Complete React component with TypeScript and accessibility

## Benefits

- **10x Faster Development**: Generate components in seconds
- **Perfect Type Safety**: Complete TypeScript definitions
- **Accessibility First**: Built-in ARIA compliance
- **Design System Consistency**: Automatic shadcn/ui adherence
- **Zero Learning Curve**: Natural language interface

---

**Ready to explore?** [Start with AI Agents System →](ai-agents.md)
