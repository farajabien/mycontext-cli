# Natural Language to Code Intent Dictionary System

## Table of Contents

- [Overview](#overview)
- [Core Concept](#core-concept)
- [Current Architecture Analysis](#current-architecture-analysis)
- [Implementation Strategy](#implementation-strategy)
- [Type System & Schema](#type-system--schema)
- [Core Services](#core-services)
- [Integration Points](#integration-points)
- [File Structure](#file-structure)
- [Implementation Phases](#implementation-phases)
- [Benefits & Use Cases](#benefits--use-cases)
- [Examples](#examples)

---

## Overview

The Intent Dictionary System creates a **semantic compiler layer** that validates and enriches natural language requirements during the `design:analyze` phase, ensuring type-safe mapping from user intent to specific shadcn/ui components with predefined design patterns.

### Problem Statement

Current AI-driven code generation faces several challenges:

1. **Inconsistency**: Same requirements produce different implementations across runs
2. **Pattern Drift**: Generated code doesn't consistently follow established design systems
3. **Validation Gap**: No mechanism to ensure generated code matches intent
4. **Context Loss**: Natural language descriptions lose precision during translation

### Solution

Create a **typed dictionary** that maps natural language UI descriptions to:

- Specific shadcn/ui component combinations
- Predetermined design patterns with templates
- Type-safe prop definitions
- Accessibility requirements
- Design token mappings
- Validation rules

This acts as a "compiler" where English descriptions are the source code, and the intent dictionary is the type system.

---

## Core Concept

### Natural Language as Source Code

```
"Add a submit button for the login form"
    ↓ [Intent Extraction]
"primary-button" intent detected (confidence: 0.95)
    ↓ [Dictionary Lookup]
IntentMapping {
  shadcn_components: ["Button"]
  template: "<Button type='submit' variant='default'>{{label}}</Button>"
  required_props: [onClick, children]
  accessibility: {aria-label, keyboard support}
  design_tokens: [primary color, spacing]
}
    ↓ [Code Generation with Guardrails]
Validated, type-safe component code
```

### Key Principles

1. **Predictability**: Same intent → same component pattern
2. **Type Safety**: All mappings are strongly typed
3. **Validation**: Generated code validated against intent specs
4. **Extensibility**: Dictionary is JSON, easily customizable
5. **AI Enhancement**: LLM generates within guardrails, not replaced

---

## Current Architecture Analysis

### Existing Flow

```
PRD + Context Files
    ↓
DesignPipelineAgent (8 phases)
    ├─ Phase 1: Parse PRD → FunctionalSummary
    ├─ Phase 2: Classify Scope → ProjectScope
    ├─ Phase 3: Detect Gaps → ContextGaps
    ├─ Phase 4: Generate Design Brief → DesignBrief
    ├─ Phase 5: Build Visual System → VisualSystem
    ├─ Phase 6: Define Component Hierarchy → ComponentHierarchy
    ├─ Phase 7: Plan Implementation → ImplementationPlan
    └─ Phase 8: Synthesize Intent → DesignIntent
    ↓
DesignManifest (.mycontext/design-manifest.json)
    ↓
UnifiedDesignContextLoader → EnrichedContext
    ↓
PromptConstructorAgent (extracts requirements)
    ↓
CodeGenSubAgent (HybridAIClient)
    ↓
Generated Component Code
```

### Integration Point: Phase 3.5

The Intent Dictionary System inserts between Phase 3 (detectGaps) and Phase 4 (generateDesignBrief):

```
Phase 3: Detect Context Gaps
    ↓
Phase 3.5: Validate & Enrich UI Intents (NEW)
    ├─ Extract intent phrases from PRD
    ├─ Match against dictionary
    ├─ Detect ambiguities
    ├─ Generate clarifications
    └─ Create enriched component specs
    ↓
Phase 4: Generate Design Brief
```

### Strengths to Preserve

1. **Existing 8-phase design pipeline** - comprehensive and battle-tested
2. **UnifiedDesignContextLoader** - already treats context as design system
3. **PromptConstructorAgent** - sophisticated context analysis
4. **State management** - resumable pipeline with error recovery
5. **Fallback mechanisms** - rule-based fallbacks for AI failures

---

## Implementation Strategy

### Phase 1: Foundation (Week 1) ✓ CURRENT PHASE

**Goal**: Establish type system and basic validation

**Deliverables**:

- `src/types/intent-dictionary.ts` - Complete type definitions
- `src/config/intent-dictionary.json` - Initial 10 core UI patterns
- `src/services/IntentValidator.ts` - Basic validation service

**Core Patterns** (Initial 10):

1. primary-button
2. secondary-button
3. auth-form
4. text-input
5. confirmation-dialog
6. data-table
7. card-layout
8. navigation-menu
9. alert-message
10. loading-spinner

### Phase 2: Integration (Week 2)

**Goal**: Integrate with existing design pipeline

**Deliverables**:

- Modify `DesignPipelineAgent.ts` to add Phase 3.5
- Update `EnrichedContext` type definition
- Implement `IntentEnricher` service
- Update `DesignManifest` schema

**Tasks**:

- Add intent validation to design pipeline
- Store intent validation results in manifest
- Enrich component definitions with intent specs

### Phase 3: Enhancement (Week 3)

**Goal**: Full dictionary and prompt enhancement

**Deliverables**:

- Expand dictionary to 30 patterns
- Integrate with `PromptConstructorAgent`
- Add validation to `CodeGenSubAgent`
- Implement `IntentCodeValidator`

**Tasks**:

- Build comprehensive pattern library
- Enhance prompt construction with intent specs
- Add post-generation validation

### Phase 4: Polish (Week 4)

**Goal**: User experience and tooling

**Deliverables**:

- CLI commands (`validate-intents`, `list-intents`)
- Interactive clarification flows
- Usage analytics and reporting
- Documentation and examples

**Tasks**:

- Create user-facing commands
- Implement clarification prompts
- Add analytics tracking
- Write comprehensive docs

---

## Type System & Schema

### Core Types

```typescript
// Primary intent mapping structure
interface IntentMapping {
  canonical_name: string;
  category: ComponentCategory;
  intent_phrases: IntentPhrase[];
  component_pattern: ComponentPattern;
  interaction_spec: InteractionSpec;
  accessibility_spec: AccessibilitySpec;
  design_tokens: DesignTokenMapping[];
  responsive_behavior: ResponsiveBehavior;
  validation_rules: ValidationRule[];
  confidence_threshold: number;
  examples: IntentExample[];
}

// Dictionary structure
interface IntentDictionary {
  version: string;
  schema_version: string;
  mappings: Record<string, IntentMapping>;
  synonyms: Record<string, string>;
  categories: ComponentCategory[];
  validation_config: ValidationConfig;
  usage_analytics: UsageAnalytics;
}

// Validation output
interface IntentValidationReport {
  validated_intents: ValidatedIntent[];
  ambiguous_intents: AmbiguousIntent[];
  unknown_intents: UnknownIntent[];
  confidence_score: number;
  clarifications_needed: ClarificationRequest[];
}
```

See `src/types/intent-dictionary.ts` for complete type definitions.

---

## Core Services

### IntentValidator

**Location**: `src/services/IntentValidator.ts`

**Responsibilities**:

- Load and manage intent dictionary
- Extract UI intent phrases from PRD text
- Match intents against dictionary using fuzzy matching
- Detect ambiguities and conflicts
- Generate clarification prompts
- Calculate confidence scores

**Key Methods**:

```typescript
class IntentValidator {
  validateContextFiles(prd, types, brand): Promise<IntentValidationReport>;
  extractIntentsFromText(text: string): ExtractedIntent[];
  matchIntents(extracted: ExtractedIntent[]): Promise<ValidatedIntent[]>;
  detectAmbiguities(matches: ValidatedIntent[]): AmbiguousIntent[];
  generateClarifications(ambiguities): ClarificationRequest[];
}
```

### IntentEnricher

**Location**: `src/services/IntentEnricher.ts`

**Responsibilities**:

- Transform validated intents into enriched component specs
- Expand code templates with context
- Map design tokens from visual system
- Generate TypeScript type definitions
- Resolve placeholder values

**Key Methods**:

```typescript
class IntentEnricher {
  enrichComponentDefinitions(
    summary: FunctionalSummary,
    validation: IntentValidationReport,
    visualSystem: VisualSystem
  ): EnrichedComponentSpec[];

  expandTemplate(template, intent, visualSystem): string;
  mapDesignTokens(mapping, visualSystem): Record<string, string>;
}
```

### IntentCodeValidator

**Location**: `src/services/IntentCodeValidator.ts`

**Responsibilities**:

- Validate generated code against intent specifications
- Check for required shadcn components
- Verify prop definitions
- Validate accessibility attributes
- Check design token usage
- Calculate pattern match score

**Key Methods**:

```typescript
class IntentCodeValidator {
  validateGeneratedCode(
    code: string,
    intentSpec: EnrichedComponentSpec
  ): CodeValidationResult;

  calculatePatternMatch(code, pattern): number;
  generateImprovements(code, spec): string[];
}
```

### IntentClarificationService

**Location**: `src/services/IntentClarificationService.ts`

**Responsibilities**:

- Present clarification questions to users
- Provide multiple choice options
- Handle user responses
- Update validation report with clarifications

**Key Methods**:

```typescript
class IntentClarificationService {
  promptUserForClarifications(
    clarifications: ClarificationRequest[]
  ): Promise<ClarificationResponse[]>;
}
```

---

## Integration Points

### 1. DesignPipelineAgent Integration

**File**: `src/agents/implementations/DesignPipelineAgent.ts`

**Changes**:

- Add Phase 3.5 after `detectGaps` (line 146)
- Add `validateIntents` method
- Update `defineHierarchy` to use enriched intents
- Modify manifest to include intent validation

```typescript
// Phase 3.5: Validate UI Intents
if (!completedPhases.includes(3.5)) {
  console.log(chalk.gray("  Phase 3.5: Validating UI intents..."));
  const intentValidation = await this.validateIntents(
    input,
    partialResults.functionalSummary
  );
  partialResults.intentValidation = intentValidation;
  completedPhases.push(3.5);

  if (intentValidation.confidence_score < 0.7) {
    // Prompt for clarifications
    const clarifier = new IntentClarificationService();
    await clarifier.promptUserForClarifications(
      intentValidation.clarifications_needed
    );
  }
}
```

### 2. PromptConstructorAgent Integration

**File**: `src/agents/implementations/PromptConstructorAgent.ts`

**Changes**:

- Update `extractComponentRequirements` to include intent specs
- Add `formatIntentAsRequirement` method
- Enhance prompts with strict intent-based requirements

```typescript
private async extractComponentRequirements(
  context: PromptConstructionContext,
  analysis: any,
  designContext?: { enrichedContext?: EnrichedContext }
): Promise<string[]> {
  const requirements: string[] = [];

  // Load intent-based requirements
  if (designContext?.enrichedContext?.enriched_intents) {
    const relevantIntents = designContext.enrichedContext.enriched_intents
      .filter(intent => this.isRelevantToComponent(intent, context.componentName));

    for (const intent of relevantIntents) {
      requirements.push(this.formatIntentAsRequirement(intent));
    }
  }

  return requirements;
}
```

### 3. CodeGenSubAgent Integration

**File**: `src/agents/implementations/CodeGenSubAgent.ts`

**Changes**:

- Update `constructPromptWithLLM` to include intent specifications
- Add post-generation validation
- Implement `loadIntentSpecs` method

```typescript
private async generateProductionReadyComponent(...): Promise<string> {
  // Generate code
  const code = await ai.generateComponent(prompt, options);

  // Validate against intent specifications
  const intentSpecs = this.loadIntentSpecs(component, options);
  if (intentSpecs && intentSpecs.length > 0) {
    const validator = new IntentCodeValidator();

    for (const spec of intentSpecs) {
      const validation = validator.validateGeneratedCode(code, spec);

      if (!validation.valid) {
        // Log validation errors and suggestions
        validation.issues.forEach(issue => {
          console.log(chalk.red(`   ✗ ${issue.message}`));
          console.log(chalk.gray(`     Fix: ${issue.fix}`));
        });
      }
    }
  }

  return code;
}
```

### 4. Type System Updates

**File**: `src/types/design-pipeline.ts`

**Changes**:

- Add `enriched_intents` to `EnrichedContext`
- Add `intent_validation` to `DesignManifest` phases

```typescript
export interface EnrichedContext {
  project_summary: FunctionalSummary;
  design_system: VisualSystem;
  design_intent: DesignIntent;
  component_architecture: ComponentHierarchy;

  // NEW: Intent-based specifications
  enriched_intents?: EnrichedComponentSpec[];
  intent_validation_report?: IntentValidationReport;
  intent_clarifications?: ClarificationResponse[];

  // ... rest of interface
}
```

---

## File Structure

```
src/
├── types/
│   ├── design-pipeline.ts          (MODIFY - add enriched_intents)
│   └── intent-dictionary.ts        (NEW - complete type system)
│
├── config/
│   └── intent-dictionary.json      (NEW - pattern mappings)
│
├── services/
│   ├── IntentValidator.ts          (NEW - validation logic)
│   ├── IntentEnricher.ts           (NEW - enrichment logic)
│   ├── IntentCodeValidator.ts      (NEW - post-gen validation)
│   └── IntentClarificationService.ts (NEW - user interaction)
│
├── agents/implementations/
│   ├── DesignPipelineAgent.ts      (MODIFY - add Phase 3.5)
│   ├── PromptConstructorAgent.ts   (MODIFY - use enriched intents)
│   └── CodeGenSubAgent.ts          (MODIFY - strict templates + validation)
│
├── utils/
│   ├── contextEnricher.ts          (MODIFY - include intents)
│   └── designManifestManager.ts    (MODIFY - save intents)
│
└── commands/
    ├── validate-intents.ts         (NEW - standalone validation)
    ├── list-intents.ts             (NEW - show available patterns)
    ├── design-analyze.ts           (MODIFY - add --validate-intents)
    └── generate-components.ts      (MODIFY - validate output)
```

---

## Implementation Phases

### Phase 1: Foundation ✓ CURRENT

**Week 1 Deliverables**:

1. **Type Definitions** (`src/types/intent-dictionary.ts`)

   - Complete type system for intent mappings
   - Validation report types
   - Enriched component spec types
   - All supporting interfaces

2. **Initial Dictionary** (`src/config/intent-dictionary.json`)

   - 10 core UI patterns:
     - primary-button
     - secondary-button
     - auth-form
     - text-input
     - confirmation-dialog
     - data-table
     - card-layout
     - navigation-menu
     - alert-message
     - loading-spinner
   - Each with full specifications:
     - Intent phrases and aliases
     - shadcn component mappings
     - Code templates
     - Props definitions
     - Accessibility specs
     - Design token mappings

3. **IntentValidator Service** (`src/services/IntentValidator.ts`)
   - Load dictionary from JSON
   - Extract intents from PRD text using regex patterns
   - Match intents with confidence scoring
   - Detect ambiguities
   - Generate clarification requests
   - Basic fuzzy matching

**Testing Strategy**:

- Unit tests for intent extraction
- Test with sample PRDs
- Validate confidence scoring
- Test ambiguity detection

### Phase 2: Integration

**Week 2 Deliverables**:

1. **Design Pipeline Integration**

   - Add Phase 3.5 to DesignPipelineAgent
   - Update state management
   - Save intent validation in manifest

2. **IntentEnricher Service**

   - Transform validated intents to enriched specs
   - Template expansion with placeholders
   - Design token mapping

3. **Type System Updates**
   - Update EnrichedContext interface
   - Update DesignManifest schema
   - Migration for existing manifests

**Testing Strategy**:

- End-to-end pipeline tests
- Verify manifest contains intent data
- Test resume functionality

### Phase 3: Enhancement

**Week 3 Deliverables**:

1. **Expanded Dictionary**

   - Add 20 more patterns (total: 30)
   - Cover all major shadcn components
   - Include complex patterns (multi-step forms, etc.)

2. **Prompt Enhancement**

   - Integrate with PromptConstructorAgent
   - Format intent specs for LLM prompts
   - Add strict adherence instructions

3. **Code Validation**
   - IntentCodeValidator service
   - Post-generation validation
   - Pattern match scoring
   - Auto-fix suggestions

**Testing Strategy**:

- Generate components and validate
- Test validation accuracy
- Measure pattern adherence

### Phase 4: Polish

**Week 4 Deliverables**:

1. **CLI Commands**

   - `mycontext validate-intents` - Validate PRD intents
   - `mycontext list-intents` - Show available patterns
   - `mycontext test-intent <name>` - Test specific intent

2. **User Experience**

   - Interactive clarification prompts
   - Progress indicators
   - Helpful error messages

3. **Analytics & Reporting**

   - Track intent usage
   - Log validation failures
   - Generate improvement suggestions

4. **Documentation**
   - User guide for intent dictionary
   - How to extend dictionary
   - Best practices guide
   - Example PRDs

---

## Benefits & Use Cases

### Benefits

1. **Predictability**

   - Same intent descriptions produce consistent code
   - Design patterns enforced across codebase
   - Reduce LLM output variance

2. **Type Safety**

   - Natural language validated like typed code
   - Catch errors before generation
   - Prevent invalid component combinations

3. **Quality Assurance**

   - Post-generation validation ensures compliance
   - Pattern matching scores guide improvements
   - Accessibility requirements enforced

4. **Developer Experience**

   - Clear feedback on ambiguous requirements
   - Suggestions for better descriptions
   - Fast iteration with validation

5. **Maintainability**

   - Centralized pattern definitions
   - Easy to update and extend
   - Self-documenting through examples

6. **Learning**
   - Users learn to write better PRDs
   - See how natural language maps to code
   - Understand component patterns

### Use Cases

#### 1. Consistent Form Generation

**Before**:

```
"Add a login form"
→ Different implementations each time
→ Various validation approaches
→ Inconsistent error handling
```

**After**:

```
"Add a login form"
→ Intent: auth-form (95% confidence)
→ Uses: Form, Input, Button (shadcn)
→ Pattern: react-hook-form + zod validation
→ Accessibility: ARIA labels, keyboard support
→ Result: Consistent, validated implementation
```

#### 2. Ambiguity Detection

**Example**:

```
"Add a button to delete items"
→ Ambiguous: Could be:
  1. destructive-button (dangerous action)
  2. icon-button (compact delete)
  3. confirmation-dialog-trigger (safe delete with confirm)
→ Clarification prompt:
  "What type of delete button?
   1. Dangerous destructive button (red, prominent)
   2. Icon-only delete button (compact)
   3. Delete with confirmation dialog (recommended)"
```

#### 3. Pattern Enforcement

**Example**:

```
Generated code checked against intent:
✓ Uses Button from @/components/ui/button
✓ Includes onClick handler
✓ Has aria-label attribute
✓ Uses primary design token
✗ Missing loading state (warning)
✗ Missing disabled variant (suggestion)

Pattern match score: 85%
Suggestions:
- Add loading prop for async actions
- Include disabled state for form validation
```

#### 4. Design System Compliance

**Example**:

```
Intent: primary-button
Design tokens required:
- var(--primary): #3B82F6
- var(--primary-foreground): #FFFFFF
- var(--spacing-md): 16px

Validation:
✓ Uses var(--primary) for background
✓ Uses var(--spacing-md) for padding
✗ Hardcoded #FFFFFF instead of var(--primary-foreground)

Fix: Replace color with design token
```

---

## Examples

### Example 1: Simple Button

**PRD Text**:

```markdown
Add a submit button that saves the user's profile changes.
```

**Intent Validation**:

```json
{
  "validated_intents": [
    {
      "original_text": "submit button that saves",
      "canonical_name": "primary-button",
      "confidence": 0.95,
      "intent_mapping": {
        "shadcn_components": ["Button"],
        "template": "<Button type='submit' variant='default' onClick={handleSubmit}>Save Profile</Button>",
        "required_props": ["onClick", "children"],
        "accessibility": {
          "aria-label": "Save profile changes",
          "keyboard_support": ["Enter", "Space"]
        }
      }
    }
  ]
}
```

**Generated Code**:

```tsx
import { Button } from "@/components/ui/button";

interface ProfileFormProps {
  onSave: () => Promise<void>;
}

export function ProfileForm({ onSave }: ProfileFormProps) {
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await onSave();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      type="submit"
      variant="default"
      onClick={handleSubmit}
      disabled={loading}
      aria-label="Save profile changes"
    >
      {loading ? "Saving..." : "Save Profile"}
    </Button>
  );
}
```

**Validation Result**:

```
✓ Uses Button from @/components/ui/button
✓ Includes onClick handler
✓ Has aria-label attribute
✓ Implements loading state
✓ Has disabled state
Pattern match: 100%
```

### Example 2: Authentication Form

**PRD Text**:

```markdown
Users need a login form with email and password fields.
Include validation and error handling.
```

**Intent Validation**:

```json
{
  "validated_intents": [
    {
      "original_text": "login form with email and password",
      "canonical_name": "auth-form",
      "confidence": 0.98,
      "intent_mapping": {
        "shadcn_components": ["Form", "Input", "Button", "Label"],
        "template": "<Form><FormField name='email'><Input type='email'/></FormField>...",
        "required_props": ["onSubmit"],
        "validation_rules": [
          { "field": "email", "rule": "email format" },
          { "field": "password", "rule": "min length 8" }
        ]
      }
    }
  ]
}
```

**Generated Code**: (Full auth form with validation)

**Validation Result**:

```
✓ Uses Form, Input, Button from shadcn
✓ Implements react-hook-form
✓ Includes zod validation
✓ Has email format validation
✓ Has password length validation
✓ Proper error messages
✓ ARIA attributes present
Pattern match: 95%
```

### Example 3: Ambiguous Intent

**PRD Text**:

```markdown
Add a button to remove items from the cart.
```

**Intent Validation**:

```json
{
  "ambiguous_intents": [
    {
      "original_text": "button to remove items",
      "possible_intents": [
        {
          "canonical_name": "destructive-button",
          "confidence": 0.65,
          "reasoning": "Permanent removal action"
        },
        {
          "canonical_name": "icon-button",
          "confidence": 0.6,
          "reasoning": "Common pattern for item removal"
        },
        {
          "canonical_name": "confirmation-dialog-trigger",
          "confidence": 0.7,
          "reasoning": "Safe removal with confirmation"
        }
      ]
    }
  ],
  "clarifications_needed": [
    {
      "question": "How should items be removed from the cart?",
      "suggested_intents": [
        {
          "canonical_name": "icon-button",
          "description": "Small X icon button (instant removal)",
          "components": ["Button with icon"]
        },
        {
          "canonical_name": "confirmation-dialog-trigger",
          "description": "Button with confirmation dialog (safer)",
          "components": ["Button", "AlertDialog"]
        }
      ]
    }
  ]
}
```

**User Prompt**:

```
⚠️ Clarification needed:

How should items be removed from the cart?

1. Small X icon button (instant removal)
   → Quick, but no undo
   → Uses: Button with icon

2. Button with confirmation dialog (safer) [RECOMMENDED]
   → Shows "Are you sure?" dialog
   → Uses: Button, AlertDialog

Choose [1-2]:
```

---

## Future Enhancements

### Phase 5: Advanced Features (Future)

1. **Custom Pattern Creation**

   - User-defined patterns in `.mycontext/custom-intents.json`
   - Pattern inheritance and composition
   - Project-specific overrides

2. **AI-Assisted Pattern Learning**

   - Learn patterns from existing codebases
   - Suggest new patterns based on usage
   - Auto-generate templates from examples

3. **Multi-Language Support**

   - Intent descriptions in multiple languages
   - Translation of technical terms
   - Localized examples

4. **Visual Pattern Builder**

   - GUI for creating intent mappings
   - Visual template editor
   - Interactive testing

5. **Analytics Dashboard**

   - Intent usage statistics
   - Pattern effectiveness metrics
   - Validation success rates
   - Improvement recommendations

6. **Integration Ecosystem**
   - Figma plugin for design-to-intent
   - VS Code extension for inline validation
   - GitHub Action for PR validation
   - Storybook integration

---

## Metrics & Success Criteria

### Key Metrics

1. **Confidence Scores**

   - Target: >90% of intents with >0.7 confidence
   - Measure: Average confidence across all validations

2. **Pattern Match Scores**

   - Target: >85% pattern adherence in generated code
   - Measure: Average validation scores

3. **Ambiguity Rate**

   - Target: <10% of intents require clarification
   - Measure: Ambiguous intents / total intents

4. **Unknown Intent Rate**

   - Target: <5% completely unknown intents
   - Measure: Unknown intents / total intents

5. **Code Quality**

   - Target: 100% accessibility compliance
   - Target: 100% design token usage
   - Measure: Validation issue counts

6. **User Satisfaction**
   - Target: Reduced iteration cycles
   - Target: More consistent outputs
   - Measure: User surveys and feedback

### Success Criteria

**Phase 1 Success**:

- [ ] All types compile without errors
- [ ] Dictionary loads successfully
- [ ] Can extract and match at least 7/10 test intents
- [ ] Confidence scoring produces reasonable results

**Phase 2 Success**:

- [ ] Design pipeline runs with Phase 3.5
- [ ] Intent validation saved in manifest
- [ ] EnrichedContext includes intent data
- [ ] Can resume pipeline after intent validation

**Phase 3 Success**:

- [ ] Generated code includes intent requirements
- [ ] Post-generation validation catches >80% of issues
- [ ] Pattern match scores >85% on average
- [ ] Prompts include strict intent guidance

**Phase 4 Success**:

- [ ] CLI commands work end-to-end
- [ ] Users can validate intents standalone
- [ ] Clarification prompts are helpful
- [ ] Documentation is comprehensive

---

## Contributing

### Adding New Patterns

To add a new intent pattern to the dictionary:

1. **Define the Intent Mapping** in `src/config/intent-dictionary.json`:

```json
{
  "mappings": {
    "your-pattern-name": {
      "canonical_name": "your-pattern-name",
      "category": "appropriate-category",
      "intent_phrases": [
        {
          "phrase": "natural description",
          "aliases": ["alternative", "phrasings"],
          "context_keywords": ["key", "words"],
          "confidence_boost": 0.8
        }
      ],
      "component_pattern": {
        "shadcn_components": [
          /*...*/
        ],
        "template_code": "...",
        "required_props": [
          /*...*/
        ],
        "optional_props": [
          /*...*/
        ]
      }
      // ... rest of specification
    }
  }
}
```

2. **Add Tests** in `tests/intent-validation/`:

```typescript
describe("your-pattern-name intent", () => {
  it("should match expected phrases", () => {
    const validator = new IntentValidator();
    const result = validator.validateContextFiles(testPRD);
    expect(result.validated_intents[0].canonical_name).toBe(
      "your-pattern-name"
    );
  });
});
```

3. **Document with Examples** in this file

4. **Test End-to-End**:

```bash
mycontext validate-intents --test "your test phrase"
```

### Best Practices for Pattern Design

1. **Be Specific**: Pattern names should clearly indicate what they generate
2. **Provide Alternatives**: Include comprehensive aliases and synonyms
3. **Template Quality**: Templates should be production-ready
4. **Accessibility First**: Always include accessibility specs
5. **Design Tokens**: Map all colors, spacing, etc. to design tokens
6. **Examples**: Include at least 3 real-world examples
7. **Validation**: Define strict validation rules

---

## Appendix

### A. Related Documentation

- [Design Pipeline Documentation](./design-pipeline.md)
- [AI Agents Documentation](./ai-agents.md)
- [Commands Reference](./commands.md)

### B. Glossary

- **Intent**: A user's desired UI component or pattern expressed in natural language
- **Intent Mapping**: The dictionary entry that maps an intent to component specifications
- **Canonical Name**: The standardized identifier for an intent pattern
- **Confidence Score**: A measure (0-1) of how certain the system is about an intent match
- **Enriched Component Spec**: A fully-specified component definition with all implementation details
- **Design Token**: A named design system value (color, spacing, etc.)
- **Pattern Match Score**: A measure of how well generated code adheres to the intent template

### C. Technical References

- [shadcn/ui Components](https://ui.shadcn.com/)
- [React Hook Form](https://react-hook-form.com/)
- [Zod Validation](https://zod.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)

---

## Changelog

### v1.0.0 (2025-10-09)

- Initial design document
- Complete type system specification
- Implementation phases defined
- Phase 1 in progress

---

**Status**: Phase 1 - Foundation (In Progress)

**Last Updated**: 2025-10-09

**Contributors**: MyContext CLI Team
