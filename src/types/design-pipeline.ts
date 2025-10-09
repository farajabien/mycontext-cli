/**
 * Design Pipeline Types
 *
 * Defines interfaces for all 8 phases of the design reasoning pipeline
 * that replicates an internal design process for rich, contextual component generation.
 */

// ============================================================================
// PHASE 1: PRD PARSING - Functional Summary
// ============================================================================

export interface FunctionalSummary {
  app_name: string;
  core_purpose: string;
  key_features: string[];
  primary_user_actions: string[];
  platform: string;
  technical_requirements: string[];
  complexity_level: "low" | "medium" | "high";
  user_personas?: string[];
  business_goals?: string[];
  success_metrics?: string[];
}

// ============================================================================
// PHASE 2: SCOPE CLASSIFICATION - Project Type & Scope
// ============================================================================

export interface ProjectScope {
  build_scope: "single_component" | "ui_page" | "full_app";
  reason: string;
  expected_outputs: string[];
  estimated_screens?: number;
  estimated_components?: number;
  development_phases?: string[];
  technical_complexity?: "simple" | "moderate" | "complex";
}

// ============================================================================
// PHASE 3: MISSING CONTEXT DETECTION
// ============================================================================

export interface ContextGaps {
  missing: string[];
  recommended_next_action: string;
  visual_direction_needed?: boolean;
  tone_guidance_needed?: boolean;
  accessibility_requirements?: string[];
  interaction_patterns?: string[];
  brand_consistency?: string[];
}

// ============================================================================
// PHASE 4: DESIGN INSPIRATION BRIEF
// ============================================================================

export interface InspirationSource {
  name: string;
  style: string;
  url?: string;
  reasoning?: string;
}

export interface DesignBrief {
  theme: "dark" | "light" | "mixed";
  inspiration_sources: InspirationSource[];
  blended_style: string;
  primary_color: string;
  support_colors: string[];
  typography: {
    heading: string;
    body: string;
    mono?: string;
  };
  ui_principles: string[];
  motion_style: string;
  personality_keywords: string[];
  emotional_tone: string;
  target_audience: string;
  accessibility_focus?: string[];
}

// ============================================================================
// PHASE 5: VISUAL SYSTEM - Design Tokens
// ============================================================================

export interface ColorPalette {
  primary: string;
  secondary?: string;
  accent?: string;
  background: string;
  surface: string;
  text: string;
  text_muted: string;
  border?: string;
  success?: string;
  warning?: string;
  error?: string;
  info?: string;
}

export interface TypographyScale {
  xs: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
  "2xl": string;
  "3xl": string;
  "4xl": string;
}

export interface SpacingScale {
  xs: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
  "2xl": string;
  "3xl": string;
  "4xl": string;
}

export interface BorderRadius {
  none: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
  full: string;
}

export interface ShadowSystem {
  sm: string;
  md: string;
  lg: string;
  xl: string;
  inner?: string;
}

export interface MotionTokens {
  duration: {
    fast: string;
    normal: string;
    slow: string;
  };
  easing: {
    linear: string;
    ease_in: string;
    ease_out: string;
    ease_in_out: string;
  };
}

export interface VisualSystem {
  colors: ColorPalette;
  typography: {
    font_families: {
      heading: string;
      body: string;
      mono: string;
    };
    scale: TypographyScale;
    weights: {
      normal: string;
      medium: string;
      semibold: string;
      bold: string;
    };
  };
  spacing: SpacingScale;
  radii: BorderRadius;
  shadows: ShadowSystem;
  motion: MotionTokens;
  breakpoints: {
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
}

// ============================================================================
// PHASE 6: COMPONENT HIERARCHY - Structure & Interactions
// ============================================================================

export interface ComponentProps {
  name: string;
  type: string;
  required: boolean;
  description: string;
  default_value?: any;
}

export interface ComponentDefinition {
  name: string;
  description: string;
  type: "layout" | "form" | "display" | "navigation" | "feedback" | "overlay";
  props: ComponentProps[];
  interactions: string[];
  states: string[];
  accessibility_requirements: string[];
  responsive_behavior: string;
  related_components: string[];
}

export interface ScreenDefinition {
  name: string;
  description: string;
  purpose: string;
  components: string[];
  layout_type:
    | "single_column"
    | "multi_column"
    | "grid"
    | "dashboard"
    | "modal";
  navigation_flow: string[];
  user_journey_position: "entry" | "main" | "secondary" | "exit";
}

export interface ComponentHierarchy {
  screens: ScreenDefinition[];
  components: ComponentDefinition[];
  design_patterns: string[];
  interaction_flows: string[];
  state_management: string[];
  data_flow: string[];
}

// ============================================================================
// PHASE 7: IMPLEMENTATION PLAN - Technical Architecture
// ============================================================================

export interface ImplementationPlan {
  framework: string;
  pages: string[];
  state_management: string;
  build_requirements: string[];
  data_persistence: string;
  notifications?: string;
  authentication?: string;
  api_integration?: string;
  deployment_strategy?: string;
  performance_optimizations: string[];
  accessibility_implementation: string[];
  testing_strategy: string[];
  monitoring_analytics?: string[];
}

// ============================================================================
// PHASE 8: DESIGN INTENT - Final Synthesis
// ============================================================================

export interface DesignIntent {
  visual_philosophy: string;
  design_anchors: string[];
  user_experience_goals: string[];
  brand_alignment: string;
  technical_constraints: string[];
  scalability_considerations: string[];
  maintenance_guidelines: string[];
  success_criteria: string[];
}

// ============================================================================
// DESIGN MANIFEST - Complete Pipeline Output
// ============================================================================

export interface DesignManifest {
  version: string;
  generated_at: string;
  project_name: string;
  phases: {
    functional_summary: FunctionalSummary;
    project_scope: ProjectScope;
    context_gaps: ContextGaps;
    design_brief: DesignBrief;
    visual_system: VisualSystem;
    component_hierarchy: ComponentHierarchy;
    implementation_plan: ImplementationPlan;
    design_intent: DesignIntent;
    intent_validation?: {
      validation_report: import("./intent-dictionary").IntentValidationReport;
      enriched_intents: import("./intent-dictionary").EnrichedComponentSpec[];
      clarifications: import("./intent-dictionary").ClarificationResponse[];
    };
  };
  metadata: {
    ai_model_used?: string;
    confidence_scores: Record<string, number>;
    fallbacks_used: string[];
    generation_time_ms: number;
  };
}

// ============================================================================
// DESIGN PIPELINE INPUT/OUTPUT TYPES
// ============================================================================

export interface DesignPipelineInput {
  prd: string;
  types?: string;
  branding?: string;
  component_list?: string;
  project_path: string;
  force_regenerate?: boolean;
  target_phases?: string[];
}

export interface DesignPipelineOutput {
  manifest: DesignManifest;
  success: boolean;
  warnings: string[];
  errors: string[];
  fallbacks_used: string[];
}

// ============================================================================
// FALLBACK & TEMPLATE TYPES
// ============================================================================

export interface DesignTemplate {
  name: string;
  description: string;
  category:
    | "dashboard"
    | "ecommerce"
    | "saas"
    | "mobile"
    | "content"
    | "custom";
  phases: Partial<DesignManifest["phases"]>;
  use_cases: string[];
  complexity: "low" | "medium" | "high";
}

export interface FallbackResult {
  success: boolean;
  data: any;
  confidence: number;
  method: "ai_generation" | "rule_based" | "template_based" | "default";
  warnings: string[];
}

// ============================================================================
// CONTEXT ENRICHMENT TYPES
// ============================================================================

export interface EnrichedContext {
  project_summary: FunctionalSummary;
  design_system: VisualSystem;
  design_intent: DesignIntent;
  component_architecture: ComponentHierarchy;
  technical_context: {
    prd: string;
    types: string;
    brand: string;
  };
  implementation_guidelines: ImplementationPlan;
  design_principles: string[];
  visual_tokens: Record<string, any>;
  interaction_patterns: string[];
  accessibility_requirements: string[];

  // NEW: Intent-based specifications
  enriched_intents?: import("./intent-dictionary").EnrichedComponentSpec[];
  intent_validation_report?: import("./intent-dictionary").IntentValidationReport;
  intent_clarifications?: import("./intent-dictionary").ClarificationResponse[];
}

// ============================================================================
// VALIDATION TYPES
// ============================================================================

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
  confidence_score: number;
}

export interface PhaseValidation {
  phase_name: string;
  result: ValidationResult;
  required_fields: string[];
  missing_fields: string[];
  quality_indicators: Record<string, any>;
}
