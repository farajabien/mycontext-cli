/**
 * Intent Dictionary Type Definitions
 *
 * Defines the type system for mapping natural language UI descriptions
 * to shadcn/ui component implementations with type-safe specifications.
 *
 * @module intent-dictionary
 */

// ============================================================================
// CORE INTENT STRUCTURES
// ============================================================================

/**
 * Natural language phrase that describes a UI intent
 */
export interface IntentPhrase {
  /** The main phrase describing the intent */
  phrase: string;
  /** Alternative phrasings and synonyms */
  aliases: string[];
  /** Keywords that boost confidence when present in context */
  context_keywords: string[];
  /** Confidence boost multiplier (0-1) for this phrase */
  confidence_boost: number;
}

/**
 * shadcn/ui component reference
 */
export interface ShadcnComponent {
  /** Component name as exported (e.g., "Button", "Form") */
  name: string;
  /** Import path (e.g., "@/components/ui/button") */
  import_path: string;
  /** Named exports from the module */
  exports: string[];
  /** Related components often used together */
  peer_components?: string[];
}

/**
 * Component implementation pattern with template code
 */
export interface ComponentPattern {
  /** shadcn/ui components required for this pattern */
  shadcn_components: ShadcnComponent[];
  /** Template code with {{placeholder}} syntax */
  template_code: string;
  /** Required props that must be provided */
  required_props: PropDefinition[];
  /** Optional props with default values */
  optional_props: PropDefinition[];
  /** Default variant values */
  default_variants: Record<string, string>;
}

/**
 * TypeScript prop definition
 */
export interface PropDefinition {
  /** Prop name */
  name: string;
  /** TypeScript type */
  type: string;
  /** Default value if not provided */
  default_value?: any;
  /** Human-readable description */
  description: string;
  /** Validation rule for this prop */
  validation?: ValidationRule;
}

/**
 * Validation rule for props or component behavior
 */
export interface ValidationRule {
  /** Type of validation */
  rule_type: "required" | "pattern" | "enum" | "custom" | "min" | "max";
  /** The rule value (regex pattern, enum values, etc.) */
  rule_value: string | string[] | number;
  /** Error message shown when validation fails */
  error_message: string;
}

/**
 * Interaction specification defining component behavior
 */
export interface InteractionSpec {
  /** Event handlers required or recommended */
  events: string[];
  /** State variables needed for this component */
  states: StateDefinition[];
  /** Behavioral patterns and transitions */
  behaviors: BehaviorDefinition[];
}

/**
 * State variable definition
 */
export interface StateDefinition {
  /** State variable name */
  name: string;
  /** Initial value */
  initial_value: any;
  /** TypeScript type */
  type: string;
  /** Valid state transitions */
  transitions?: string[];
}

/**
 * Behavior definition for interactions
 */
export interface BehaviorDefinition {
  /** Event or condition that triggers this behavior */
  trigger: string;
  /** Description of what happens */
  action: string;
  /** Requirements for this behavior to work */
  requirements: string[];
}

/**
 * Accessibility specifications
 */
export interface AccessibilitySpec {
  /** Required ARIA attributes */
  aria_attributes: Record<string, string>;
  /** Keyboard interactions that must be supported */
  keyboard_support: KeyboardSupport[];
  /** Screen reader text if needed */
  screen_reader_text?: string;
  /** ARIA role if non-standard */
  role?: string;
  /** Focus management requirements */
  focus_management?: string;
}

/**
 * Keyboard interaction specification
 */
export interface KeyboardSupport {
  /** Key or key combination */
  key: string;
  /** Action performed when key is pressed */
  action: string;
  /** Condition when this key binding is active */
  condition?: string;
}

/**
 * Design token mapping specification
 */
export interface DesignTokenMapping {
  /** Category of design token */
  token_category:
    | "color"
    | "spacing"
    | "typography"
    | "shadow"
    | "radius"
    | "motion";
  /** Required tokens from the design system */
  required_tokens: string[];
  /** Mapping to CSS variables */
  css_var_mapping: Record<string, string>;
}

/**
 * Responsive behavior specification
 */
export interface ResponsiveBehavior {
  /** Behavior at different breakpoints */
  breakpoint_behaviors: Record<string, string>;
  /** Whether to use mobile-first approach */
  mobile_first: boolean;
  /** Touch target requirements */
  touch_targets: {
    /** Minimum size for touch targets */
    min_size: string;
  };
}

/**
 * Conflict resolution strategy
 */
export interface ConflictResolution {
  /** Intent names this conflicts with */
  conflicts_with: string[];
  /** How to resolve the conflict */
  resolution_strategy: "prioritize" | "combine" | "error" | "prompt";
  /** Message to show when conflict occurs */
  resolution_message: string;
}

/**
 * Example of intent usage
 */
export interface IntentExample {
  /** Natural language description */
  natural_language: string;
  /** Detected intent name */
  extracted_intent: string;
  /** Generated code sample */
  generated_code_sample: string;
}

// ============================================================================
// PRIMARY INTENT MAPPING
// ============================================================================

/**
 * Complete specification for a UI intent pattern
 */
export interface IntentMapping {
  // Core identification
  /** Canonical identifier for this intent (e.g., "primary-button") */
  canonical_name: string;
  /** Category this intent belongs to */
  category: string;
  /** Natural language phrases that match this intent */
  intent_phrases: IntentPhrase[];

  // Component specification
  /** Component implementation pattern */
  component_pattern: ComponentPattern;
  /** Interaction and behavior specifications */
  interaction_spec: InteractionSpec;
  /** Accessibility requirements */
  accessibility_spec: AccessibilitySpec;

  // Design integration
  /** Design token mappings */
  design_tokens: DesignTokenMapping[];
  /** Responsive behavior specification */
  responsive_behavior: ResponsiveBehavior;

  // Validation and conflicts
  /** Validation rules for this intent */
  validation_rules: ValidationRule[];
  /** Conflict resolution strategies */
  conflict_resolution: ConflictResolution[];

  // Metadata
  /** Minimum confidence threshold for this intent */
  confidence_threshold: number;
  /** Usage frequency (tracked by analytics) */
  usage_frequency: number;
  /** Example usages */
  examples: IntentExample[];
}

// ============================================================================
// COMPONENT CATEGORIES
// ============================================================================

/**
 * Component category grouping
 */
export interface ComponentCategory {
  /** Category name */
  name: string;
  /** Description of this category */
  description: string;
  /** Common patterns in this category */
  common_patterns: string[];
  /** shadcn components typically used */
  shadcn_components: string[];
}

// ============================================================================
// DICTIONARY STRUCTURE
// ============================================================================

/**
 * Validation configuration
 */
export interface ValidationConfig {
  /** Minimum confidence threshold (0-1) */
  min_confidence_threshold: number;
  /** Threshold for considering intent ambiguous */
  ambiguity_threshold: number;
  /** Whether to require design tokens in generated code */
  require_design_tokens: boolean;
  /** Strict mode: fail on unknown intents vs. fallback */
  strict_mode: boolean;
}

/**
 * Usage analytics tracking
 */
export interface UsageAnalytics {
  /** Total number of validations performed */
  total_validations: number;
  /** Usage count per intent */
  intent_usage_counts: Record<string, number>;
  /** Log of validation failures */
  validation_failures: ValidationFailureLog[];
  /** Average confidence score across validations */
  average_confidence: number;
}

/**
 * Validation failure log entry
 */
export interface ValidationFailureLog {
  /** When the failure occurred */
  timestamp: string;
  /** Original text that failed to match */
  original_text: string;
  /** Intents that were attempted */
  attempted_intents: string[];
  /** Reason for failure */
  failure_reason: string;
}

/**
 * The complete intent dictionary
 */
export interface IntentDictionary {
  /** Dictionary version */
  version: string;
  /** Last update timestamp */
  last_updated: string;
  /** Schema version for compatibility */
  schema_version: string;

  /** Intent mappings by canonical name */
  mappings: Record<string, IntentMapping>;
  /** Quick synonym lookup to canonical names */
  synonyms: Record<string, string>;

  /** Component categories */
  categories: ComponentCategory[];
  /** Validation configuration */
  validation_config: ValidationConfig;

  /** Usage analytics */
  usage_analytics: UsageAnalytics;

  /** Custom user-defined mappings */
  custom_mappings?: Record<string, IntentMapping>;
  /** Project-specific overrides */
  project_overrides?: Record<string, Partial<IntentMapping>>;
}

// ============================================================================
// VALIDATION RESULTS
// ============================================================================

/**
 * Extracted intent from text analysis
 */
export interface ExtractedIntent {
  /** Original text that matched */
  original_text: string;
  /** Pattern that matched this text */
  pattern_matched: string;
  /** Surrounding context */
  context: Record<string, any>;
  /** Initial confidence score */
  confidence: number;
}

/**
 * Successfully validated intent
 */
export interface ValidatedIntent {
  /** Original text from PRD */
  original_text: string;
  /** Canonical intent name matched */
  canonical_name: string;
  /** Full intent mapping specification */
  intent_mapping: IntentMapping;
  /** Confidence score (0-1) */
  confidence: number;
  /** Extracted contextual information */
  extracted_context: Record<string, any>;
  /** Resolved placeholder values for template */
  resolved_placeholders: Record<string, string>;
}

/**
 * Ambiguous intent requiring clarification
 */
export interface AmbiguousIntent {
  /** Original text that's ambiguous */
  original_text: string;
  /** Possible intent matches */
  possible_intents: Array<{
    /** Canonical name of possible intent */
    canonical_name: string;
    /** Confidence score for this possibility */
    confidence: number;
    /** Reasoning for why this might match */
    reasoning: string;
  }>;
  /** Additional context needed to resolve ambiguity */
  context_needed: string[];
}

/**
 * Unknown intent that couldn't be matched
 */
export interface UnknownIntent {
  /** Original text that couldn't be matched */
  original_text: string;
  /** Similar intents that partially matched */
  similar_intents: Array<{
    /** Canonical name of similar intent */
    canonical_name: string;
    /** Similarity score (0-1) */
    similarity_score: number;
  }>;
  /** Suggested fallback if any */
  suggested_fallback: string;
}

/**
 * Request for user clarification
 */
export interface ClarificationRequest {
  /** Question to ask the user */
  question: string;
  /** Original ambiguous text */
  original_text: string;
  /** Suggested intents to choose from */
  suggested_intents: Array<{
    /** Canonical name */
    canonical_name: string;
    /** User-friendly description */
    description: string;
    /** Components that will be used */
    components: string[];
  }>;
}

/**
 * User's response to clarification
 */
export interface ClarificationResponse {
  /** Original text that needed clarification */
  original_text: string;
  /** Resolved intent chosen by user */
  resolved_intent: string;
  /** Confidence is 1.0 for user selections */
  confidence: number;
}

/**
 * Complete validation report
 */
export interface IntentValidationReport {
  /** Successfully validated intents */
  validated_intents: ValidatedIntent[];
  /** Ambiguous intents requiring clarification */
  ambiguous_intents: AmbiguousIntent[];
  /** Unknown intents that couldn't be matched */
  unknown_intents: UnknownIntent[];
  /** Overall confidence score */
  confidence_score: number;
  /** Clarifications needed from user */
  clarifications_needed: ClarificationRequest[];
  /** Warnings about potential issues */
  warnings: string[];
  /** Suggestions for improvement */
  suggestions: string[];
}

// ============================================================================
// ENRICHED COMPONENT SPECIFICATIONS
// ============================================================================

/**
 * Fully enriched component specification ready for code generation
 */
export interface EnrichedComponentSpec {
  // Original context
  /** Original natural language description */
  original_description: string;
  /** Generated component name */
  component_name: string;

  // Intent mapping
  /** Canonical intent this is based on */
  canonical_intent: string;
  /** Confidence in the intent match */
  intent_confidence: number;

  // Implementation details
  /** shadcn components to use */
  shadcn_components: string[];
  /** Import statements needed */
  component_imports: string[];
  /** Design pattern specification */
  design_pattern: ComponentPattern;
  /** Expanded code template with values filled in */
  code_template: string;

  // Props and types
  /** Prop specifications */
  props_spec: PropDefinition[];
  /** Generated TypeScript type definitions */
  type_definitions: string;

  // Behavior
  /** State management requirements */
  state_management: StateDefinition[];
  /** Event handler signatures */
  event_handlers: string[];

  // Design system integration
  /** Design tokens with resolved values */
  design_tokens_used: Record<string, string>;
  /** Accessibility requirements */
  accessibility_spec: AccessibilitySpec;
  /** Responsive configuration */
  responsive_config: ResponsiveBehavior;

  // Validation
  /** Validation rules for this component */
  validation_rules: ValidationRule[];
  /** Conflicts with other intents */
  conflicts: string[];
}

// ============================================================================
// CODE VALIDATION
// ============================================================================

/**
 * Issue found during code validation
 */
export interface ValidationIssue {
  /** Severity of the issue */
  severity: "error" | "warning" | "info";
  /** Category of issue */
  category:
    | "missing_component"
    | "missing_prop"
    | "accessibility"
    | "design_tokens"
    | "pattern_match"
    | "other";
  /** Human-readable message */
  message: string;
  /** Intent this issue relates to */
  intent: string;
  /** Suggested fix */
  fix: string;
}

/**
 * Result of code validation
 */
export interface CodeValidationResult {
  /** Whether code passes validation */
  valid: boolean;
  /** Issues found during validation */
  issues: ValidationIssue[];
  /** Pattern match score (0-1) */
  pattern_match_score: number;
  /** Intent confidence score */
  confidence: number;
  /** Improvement suggestions */
  suggestions: string[];
}

// ============================================================================
// HELPER TYPES
// ============================================================================

/**
 * Fuzzy match result
 */
export interface FuzzyMatchResult {
  /** Canonical intent name */
  canonical_name: string;
  /** Confidence score (0-1) */
  confidence: number;
  /** Matched intent mapping */
  mapping: IntentMapping;
  /** Matched phrase */
  matched_phrase: string;
}

/**
 * Intent extraction context
 */
export interface ExtractionContext {
  /** Preceding text */
  before: string;
  /** Following text */
  after: string;
  /** Detected keywords */
  keywords: string[];
  /** Section of PRD this came from */
  section: string;
}

// ============================================================================
// CODE VALIDATION TYPES
// ============================================================================

/**
 * Result of validating generated code against intent specifications
 */
export interface ValidationResult {
  /** Whether the code passes all validation checks */
  valid: boolean;
  /** List of validation issues found */
  issues: ValidationIssue[];
  /** Suggested improvements */
  suggestions: string[];
}

/**
 * Individual validation issue found in generated code
 */
export interface ValidationIssue {
  /** Type of validation check that failed */
  type: "component" | "props" | "accessibility" | "state" | "tokens";
  /** Severity level of the issue */
  severity: "error" | "warning" | "info";
  /** Human-readable description of the issue */
  message: string;
  /** Suggested fix for the issue */
  fix: string;
  /** Line number where issue was found (if applicable) */
  line_number?: number;
}
