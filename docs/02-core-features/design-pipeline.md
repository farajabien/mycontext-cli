# Design Pipeline Documentation

## Overview

The MyContext Design Pipeline is a revolutionary system that treats all context files (PRD, Types, Brand, Component List) as a unified design system foundation. This enables true design-driven development where components automatically inherit design consistency and visual tokens.

## Key Insight

> **"Context files ARE the design system"** - All context files serve as the foundation for design reasoning, not just separate documentation.

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Context Files │───▶│ Design Pipeline │───▶│ Design Manifest │
│                 │    │                 │    │                 │
│ • PRD           │    │ • 8-Phase       │    │ • Visual Tokens │
│ • Types         │    │   Reasoning     │    │ • Design System │
│ • Brand         │    │ • AI + Fallbacks│    │ • Component     │
│ • Component List│    │ • Model-Agnostic│    │   Architecture  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │ Component       │
                       │ Generation      │
                       │                 │
                       │ • Design Tokens │
                       │ • Visual System │
                       │ • Design Intent │
                       └─────────────────┘
```

## 8-Phase Design Reasoning Pipeline

### Phase 1: PRD Parse

**Purpose:** Extract core project information from PRD

- App name and purpose
- Key features and requirements
- User stories and use cases
- Technical constraints

### Phase 2: Functional Summary

**Purpose:** Synthesize project scope and functionality

- Project scope definition
- Key features list
- User types and personas
- Success metrics

### Phase 3: Context Gaps

**Purpose:** Identify missing design context

- Missing brand information
- Incomplete user stories
- Unclear technical requirements
- Design system gaps

### Phase 4: Design Brief

**Purpose:** Create comprehensive design brief

- Design objectives
- Target audience
- Brand personality
- Visual direction

### Phase 5: Visual System

**Purpose:** Define visual design system

- Color palette (primary, secondary, accent)
- Typography scale (headings, body, mono)
- Spacing system (base unit, scale)
- Border radius and shadows

### Phase 6: Component Hierarchy

**Purpose:** Structure component architecture

- Component groups and categories
- Component relationships
- Screen definitions
- Navigation flow

### Phase 7: Implementation Plan

**Purpose:** Define technical implementation

- Technology stack
- Component patterns
- State management approach
- Performance requirements

### Phase 8: Design Intent

**Purpose:** Synthesize design principles and user experience

- Design anchors and principles
- User experience focus
- Interaction patterns
- Accessibility requirements

## Design Manifest Structure

The design manifest (`.mycontext/design-manifest.json`) contains:

```json
{
  "project_summary": {
    "app_name": "string",
    "purpose": "string",
    "key_features": ["string"],
    "user_types": ["string"],
    "success_metrics": ["string"]
  },
  "design_system": {
    "colors": {
      "primary": "string",
      "secondary": "string",
      "accent": "string"
    },
    "typography": {
      "heading": "string",
      "body": "string",
      "mono": "string"
    },
    "spacing": {
      "base": "number"
    },
    "borderRadius": {
      "base": "string"
    },
    "shadows": {
      "base": "string"
    }
  },
  "design_intent": {
    "design_anchors": ["string"],
    "key_principles": ["string"],
    "user_experience_focus": "string"
  },
  "component_architecture": {
    "components": [
      {
        "name": "string",
        "description": "string",
        "type": "string",
        "group": "string"
      }
    ],
    "groups": [
      {
        "name": "string",
        "description": "string",
        "components": ["string"]
      }
    ],
    "screens": [
      {
        "name": "string",
        "description": "string",
        "layout_type": "string",
        "components": ["string"]
      }
    ]
  },
  "visual_tokens": {
    "buttons": {},
    "inputs": {},
    "cards": {}
  },
  "technical_context": {
    "prd": "string",
    "types": "string",
    "brand": "string"
  },
  "implementation_guidelines": {
    "tech_stack": ["string"],
    "patterns": ["string"],
    "performance": ["string"]
  }
}
```

## Integration with Component Generation

### PromptConstructorAgent Integration

The PromptConstructorAgent loads the design manifest and injects design context into prompts:

```typescript
// Load design manifest for enriched context
const contextLoader = new UnifiedDesignContextLoader(context.projectPath);
const { enrichedContext } = await contextLoader.loadUnifiedDesignContext();

// Inject into prompts
systemPrompt += `\n\nDESIGN SYSTEM:\n${this.formatDesignSystem(
  enrichedContext.design_system
)}`;
```

### CodeGenSubAgent Integration

The CodeGenSubAgent applies design tokens to generated components:

```typescript
// Extract design tokens
const designSystem = input.options?.context?.designSystem;
if (designSystem) {
  prompt += `\n\nDESIGN TOKENS:\n`;
  prompt += `Colors: ${JSON.stringify(designSystem.colors)}\n`;
  prompt += `Typography: ${JSON.stringify(designSystem.typography)}\n`;
  prompt += `Spacing: ${JSON.stringify(designSystem.spacing)}\n`;
}
```

## Commands

### Design Analysis

```bash
# Generate design manifest from all context files
mycontext design analyze

# Validate context files for design consistency
mycontext design validate

# View design manifest summary
mycontext design summary

# Regenerate design manifest with updated context
mycontext design regenerate
```

### Architecture Generation

```bash
# Generate complete architecture including design manifest
mycontext generate architecture

# Setup complete project with design pipeline
mycontext setup-complete --interactive
```

### Component Generation

```bash
# Generate components with design system integration
mycontext generate-components all

# Generate specific component with design context
mycontext generate-components Button --group forms
```

## Best Practices

### 1. Context File Quality

- **PRD**: Include detailed user stories and requirements
- **Types**: Define comprehensive TypeScript interfaces
- **Brand**: Specify colors, typography, and visual style
- **Component List**: Include component relationships and hierarchy

### 2. Design Manifest Maintenance

- Regenerate manifest when context files change
- Validate manifest before component generation
- Review design summary for consistency

### 3. Component Development

- Use design tokens from manifest
- Follow design principles and anchors
- Maintain visual consistency across components
- Apply accessibility requirements

## Error Recovery and Resume

### State Persistence

When the design pipeline encounters an error (rate limits, timeouts, API errors, etc.), it automatically:

- Saves your progress to `.mycontext/design-pipeline-state.json`
- Records which phase failed and why
- Preserves all completed phase results

### Resume Options

#### Option 1: Explicit Resume

```bash
mycontext design analyze --resume
```

#### Option 2: Auto-Detection

Simply run the command again - it will auto-detect resumable state:

```bash
mycontext design analyze
```

### Error Types and Solutions

**Rate Limit Errors**

- Wait 60-120 seconds for limits to reset
- Switch to different AI provider (set XAI_API_KEY, ANTHROPIC_API_KEY, or OPENAI_API_KEY)
- Check your API usage limits

**Timeout Errors**

- Request took too long to complete
- Try different AI provider
- Check internet connection

**API Key Errors**

- Verify API key configuration
- Check key has sufficient permissions
- Try different AI provider

**Network Errors**

- Check internet connection
- Retry in a few moments
- Verify network settings

### State Management

**Check State**

```bash
mycontext design validate  # Shows if resumable state exists
mycontext design summary   # Shows progress if state exists
```

**Clear State** (automatic on success)
State is automatically cleaned up when pipeline completes successfully.

**Stale State Warning**
If state is older than 24 hours, you'll see a warning suggesting fresh regeneration.

## Troubleshooting

### Design Manifest Not Generated

```bash
# Check if context files exist
ls .mycontext/

# Generate missing context files
mycontext generate-context-files

# Regenerate design manifest
mycontext design regenerate
```

### Design Tokens Not Applied

```bash
# Verify design manifest exists
mycontext design summary

# Check component generation context
mycontext generate-components Button --debug
```

### Inconsistent Design

```bash
# Validate design manifest
mycontext design validate

# Regenerate with updated context
mycontext design regenerate
```

## Advanced Usage

### Custom Design Templates

Create custom design templates in `src/templates/design-templates.json`:

```json
{
  "dashboard": {
    "colors": {
      "primary": "#3B82F6",
      "secondary": "#64748B"
    },
    "typography": {
      "heading": "Inter",
      "body": "Inter"
    }
  }
}
```

### Design Fallbacks

The system includes rule-based fallbacks for when AI generation fails:

- Color extraction from brand context
- Typography inference from project type
- Spacing scale based on design patterns
- Component hierarchy from feature analysis

### Context Enrichment

The ContextEnricher merges all context files with the design manifest:

```typescript
const enrichedContext = {
  project_summary: functionalSummary,
  design_system: visualSystem,
  design_intent: designIntent,
  component_architecture: componentHierarchy,
  visual_tokens: visualTokens,
  technical_context: {
    prd: prdContent,
    types: typesContent,
    brand: brandContent,
  },
};
```

## Examples

### E-commerce App Design Manifest

```json
{
  "project_summary": {
    "app_name": "ShopEasy",
    "purpose": "Modern e-commerce platform for small businesses",
    "key_features": [
      "product catalog",
      "shopping cart",
      "checkout",
      "user accounts"
    ],
    "user_types": ["customers", "sellers", "admins"],
    "success_metrics": ["conversion rate", "cart abandonment", "user retention"]
  },
  "design_system": {
    "colors": {
      "primary": "#10B981",
      "secondary": "#6B7280",
      "accent": "#F59E0B"
    },
    "typography": {
      "heading": "Inter",
      "body": "Inter",
      "mono": "JetBrains Mono"
    },
    "spacing": {
      "base": 8
    }
  },
  "design_intent": {
    "design_anchors": ["trust", "simplicity", "efficiency"],
    "key_principles": ["mobile-first", "accessibility", "performance"],
    "user_experience_focus": "Streamlined shopping experience"
  }
}
```

### Dashboard App Design Manifest

```json
{
  "project_summary": {
    "app_name": "AnalyticsPro",
    "purpose": "Business intelligence dashboard for data visualization",
    "key_features": ["charts", "metrics", "reports", "filters"],
    "user_types": ["analysts", "managers", "executives"],
    "success_metrics": [
      "data accuracy",
      "user engagement",
      "insight generation"
    ]
  },
  "design_system": {
    "colors": {
      "primary": "#3B82F6",
      "secondary": "#64748B",
      "accent": "#8B5CF6"
    },
    "typography": {
      "heading": "Inter",
      "body": "Inter",
      "mono": "JetBrains Mono"
    },
    "spacing": {
      "base": 4
    }
  },
  "design_intent": {
    "design_anchors": ["clarity", "insight", "actionability"],
    "key_principles": ["data-driven", "scalable", "intuitive"],
    "user_experience_focus": "Clear data visualization and insights"
  }
}
```

## Future Enhancements

- **Design System Versioning**: Track changes to design manifest over time
- **Component Library Integration**: Export design tokens to external design systems
- **Visual Design Tools**: Integration with Figma, Sketch, or Adobe XD
- **Design Testing**: Automated visual regression testing
- **Design Analytics**: Track design system usage and effectiveness

## Conclusion

The MyContext Design Pipeline revolutionizes component development by treating all context files as a unified design system. This enables:

- **Consistent Design**: All components inherit from the same design system
- **Faster Development**: Design decisions are automated and consistent
- **Better UX**: Components follow established design principles
- **Maintainable Code**: Design tokens and patterns are centralized

The result is production-ready applications with consistent, professional design that scales from individual components to complete applications.
