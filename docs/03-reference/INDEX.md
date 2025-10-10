# Reference

Complete reference documentation for MyContext CLI commands, configuration, and APIs.

## Contents

- [Commands](commands.md) - Complete command reference
- [Configuration](configuration.md) - Settings and customization
- [API Reference](api-reference.md) - TypeScript API for programmatic use
- [Intent Dictionary Reference](intent-dictionary-reference.md) - All patterns with examples

## Quick Reference

### Essential Commands

```bash
# Initialize project
mycontext init <project-name>

# Generate component
mycontext generate:component "description"

# Run design pipeline
mycontext design:analyze --prd requirements.md

# Generate multiple components
mycontext generate:components --manifest design-manifest.json
```

### Configuration Files

- **`.mycontext/config.json`**: Main configuration
- **`.mycontext/intent-dictionary.json`**: Custom intent patterns
- **`.mycontext/design-manifest.json`**: Design pipeline output
- **`.mycontext/context/`**: Context files directory

### Environment Variables

```bash
# Required
OPENAI_API_KEY=your-openai-api-key
MYCONTEXT_MODEL_ID=ft:gpt-4o-mini-2024-07-18:mycontext:intent-dict:abc123

# Optional
MYCONTEXT_TEMPERATURE=0.1
MYCONTEXT_MAX_TOKENS=4000
MYCONTEXT_TIMEOUT=30000
```

## API Reference

### Core Classes

```typescript
// AI Clients
class MyContextAIClient implements IAIClient
class ClaudeSDKClient implements IAIClient
class XAIClient implements IAIClient

// Agents
class DesignPipelineAgent
class PromptConstructorAgent
class CodeGenSubAgent
class IntentValidator
class IntentEnricher
class IntentCodeValidator

// Services
class ContextEnricher
class DesignManifestManager
class FileManager
class ErrorHandler
```

### Key Interfaces

```typescript
interface EnrichedContext {
  enriched_intents?: EnrichedComponentSpec[]
  intent_validation_report?: IntentValidationReport
  design_manifest?: DesignManifest
}

interface IntentMapping {
  intent_phrases: IntentPhrase[]
  component_pattern: ComponentPattern
  accessibility_spec: AccessibilitySpec
  validation_rules: ValidationRule[]
}

interface ValidationResult {
  valid: boolean
  issues: ValidationIssue[]
  suggestions: string[]
}
```

## Intent Dictionary Patterns

### Available Patterns

- **Form Components**: input-field, textarea-field, select-dropdown, checkbox-group, radio-group, file-upload, date-picker, time-picker
- **Navigation**: breadcrumb-nav, tabs-navigation, sidebar-menu, pagination-control
- **Feedback**: toast-notification, progress-bar, skeleton-loader, error-message
- **Overlays**: modal-dialog, dropdown-menu, tooltip, popover
- **Data Display**: badge, avatar, stat-card, data-table
- **Layout**: card, button, button-group, empty-state, input-group, spinner, item, kbd

### Pattern Structure

Each pattern includes:
- **Intent Phrases**: Natural language descriptions
- **Component Pattern**: shadcn/ui components and templates
- **Props Specification**: Required and optional props
- **Accessibility Spec**: ARIA attributes and keyboard support
- **Validation Rules**: Quality and compliance checks

## Command Options

### Global Options

- `--verbose, -v`: Enable verbose logging
- `--dry-run`: Show what would be done without executing
- `--config <path>`: Specify custom config file
- `--help, -h`: Show help information

### Component Generation

- `--output <path>`: Specify output directory
- `--format <format>`: Output format (tsx, jsx, ts, js)
- `--validate`: Enable post-generation validation
- `--accessibility`: Include accessibility features

### Design Pipeline

- `--prd <path>`: Product Requirements Document
- `--types <path>`: TypeScript definitions
- `--branding <path>`: Brand guidelines
- `--validate-intents`: Enable intent validation
- `--skip-validation`: Skip validation steps

---

**Need help?** [Check the Troubleshooting guide →](../04-guides/troubleshooting.md)
