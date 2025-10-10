# Architecture

<p align="center">
  <img src="https://raw.githubusercontent.com/farajabien/mycontext-cli/main/public/mycontext-logo.png" alt="MyContext Logo" width="200" />
</p>

Technical architecture and system design documentation.

## Contents

- [System Overview](system-overview.md) - High-level architecture
- [Agent Architecture](agent-architecture.md) - Detailed agent interactions
- [Design System](design-system.md) - Design pipeline technical details
- [PM Integration](pm-integration.md) - Product management integration

## System Architecture

### High-Level Overview

MyContext CLI is built on a modular architecture with 11 specialized AI agents working together to transform natural language descriptions into production-ready React components.

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   User Input    │───▶│  Design Pipeline │───▶│ Generated Code   │
│ (Natural Lang)  │    │   (8 Phases)     │    │ (React + TS)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │ Intent Dictionary│
                       │   (30+ Patterns) │
                       └─────────────────┘
```

### Core Components

#### 1. **AI Agents Layer**

- **DesignPipelineAgent**: Orchestrates the entire design process
- **PromptConstructorAgent**: Builds context-aware prompts
- **CodeGenSubAgent**: Generates production-ready components
- **IntentValidator**: Validates and enriches natural language intents
- **IntentEnricher**: Transforms intents into specifications
- **IntentCodeValidator**: Post-generation validation
- **IntentClarificationService**: Interactive clarification

#### 2. **Services Layer**

- **ContextEnricher**: Loads and unifies design system context
- **DesignManifestManager**: Manages design pipeline state
- **FileManager**: Handles file operations
- **ErrorHandler**: Comprehensive error handling

#### 3. **Data Layer**

- **Intent Dictionary**: 30+ UI patterns with specifications
- **Design Manifest**: Pipeline state and results
- **Context Files**: PRD, types, branding, etc.

### Data Flow

```
1. User Input (Natural Language)
   ↓
2. DesignPipelineAgent (Phase 1-8)
   ↓
3. IntentValidator (Phase 3.5)
   ↓
4. IntentEnricher (Transform)
   ↓
5. PromptConstructorAgent (Build Prompt)
   ↓
6. CodeGenSubAgent (Generate)
   ↓
7. IntentCodeValidator (Validate)
   ↓
8. Generated Component (Output)
```

## Agent Architecture

### Agent Communication

Agents communicate through a structured message passing system:

```typescript
interface AgentMessage {
  from: string;
  to: string;
  type: "request" | "response" | "error";
  payload: any;
  timestamp: Date;
}
```

### Agent Lifecycle

1. **Initialization**: Load configuration and dependencies
2. **Processing**: Execute main agent logic
3. **Validation**: Verify output quality
4. **Cleanup**: Release resources and log results

### Error Handling

Each agent implements comprehensive error handling:

```typescript
class BaseAgent {
  async execute(input: any): Promise<any> {
    try {
      return await this.process(input);
    } catch (error) {
      return await this.handleError(error, input);
    }
  }

  private async handleError(error: Error, input: any): Promise<any> {
    // Log error
    this.logger.error(error.message, { input });

    // Attempt recovery
    const recovered = await this.attemptRecovery(error, input);

    // Return fallback or throw
    return recovered || this.getFallbackResponse(input);
  }
}
```

## Design System Architecture

### Design Pipeline Phases

The DesignPipelineAgent orchestrates 8 phases:

1. **Context Loading**: Load PRD, types, branding
2. **Gap Detection**: Identify missing context
3. **Functional Summary**: Extract requirements
4. **Intent Validation**: Map natural language to components
5. **Design Brief**: Create design specifications
6. **Component Hierarchy**: Define component structure
7. **Visual System**: Establish design tokens
8. **Quality Assurance**: Validate and optimize

### Intent Dictionary Structure

```typescript
interface IntentDictionary {
  mappings: Record<string, IntentMapping>;
  synonyms: Record<string, string>;
  validation_config: ValidationConfig;
}

interface IntentMapping {
  intent_phrases: IntentPhrase[];
  component_pattern: ComponentPattern;
  accessibility_spec: AccessibilitySpec;
  validation_rules: ValidationRule[];
}
```

### Component Generation Process

1. **Intent Extraction**: Parse natural language for UI intents
2. **Pattern Matching**: Find matching patterns in dictionary
3. **Confidence Scoring**: Calculate match confidence
4. **Enrichment**: Transform intents into specifications
5. **Template Expansion**: Generate component code
6. **Validation**: Verify quality and compliance
7. **Output**: Return production-ready component

## Integration Points

### External APIs

**Primary (Optional)**:

- **MyContext AI API** (api.mycontext.dev) - Fine-tuned model (paid, coming soon)

**Fallback Providers** (BYOK):

- **Claude SDK**: Anthropic API fallback
- **XAI API**: Secondary fallback (Grok)

**Architecture**:

```
MyContext AI (optional, hosted)
    ↓ (if unavailable or BYOK mode)
Claude SDK (your API key)
    ↓ (if unavailable)
XAI API (your API key)
```

**No vendor lock-in**: CLI works with any provider, MyContext AI is optional premium service.

### File System Integration

- **Project Structure**: Automatic file organization
- **Import Management**: Proper import statements
- **Type Definitions**: TypeScript interface generation
- **Configuration**: Project-specific settings

### Development Tools

- **VS Code Extension**: IDE integration
- **CLI Commands**: Command-line interface
- **API Client**: Programmatic access
- **Web Dashboard**: Visual interface

## Performance Considerations

### Caching Strategy

- **Intent Mappings**: Cache frequently used patterns
- **Generated Components**: Cache similar components
- **Context Files**: Cache loaded context data
- **API Responses**: Cache AI model responses

### Parallel Processing

- **Component Generation**: Generate multiple components simultaneously
- **Validation**: Parallel validation checks
- **File Operations**: Concurrent file operations
- **API Calls**: Parallel API requests

### Resource Management

- **Memory Usage**: Monitor and optimize memory consumption
- **API Limits**: Respect rate limits and quotas
- **File I/O**: Optimize file operations
- **Error Recovery**: Graceful degradation

## Security Considerations

### API Security

- **API Key Management**: Secure storage and rotation
- **Rate Limiting**: Prevent abuse and overuse
- **Input Validation**: Sanitize user inputs
- **Output Validation**: Verify generated code safety

### Code Generation Safety

- **Template Validation**: Ensure templates are safe
- **Dependency Checking**: Verify external dependencies
- **Accessibility Compliance**: Ensure accessibility standards
- **Security Best Practices**: Follow security guidelines

## Scalability

### Horizontal Scaling

- **Agent Distribution**: Distribute agents across instances
- **Load Balancing**: Balance processing load
- **Caching Clusters**: Distributed caching
- **Database Sharding**: Scale data storage

### Vertical Scaling

- **Resource Optimization**: Optimize single-instance performance
- **Memory Management**: Efficient memory usage
- **CPU Optimization**: Optimize processing algorithms
- **I/O Optimization**: Optimize file and network operations

---

**Want to understand the details?** [Start with System Overview →](system-overview.md)
