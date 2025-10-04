/**
 * Enhancement Types
 * Centralized type definitions for component enhancement functionality
 */

export interface EnhancementOptions {
  prompt: string;
  temperature?: number;
  maxTokens?: number;
  verbose?: boolean;
  debug?: boolean;
  output?: string;
  interactive?: boolean;
  outputFormat?: "default" | "structured" | "diff" | "preview";
  showChanges?: boolean;
  preserveHistory?: boolean;
}

export interface EnhancementResult {
  success: boolean;
  enhancedComponent?: string;
  originalComponent?: string;
  changes?: EnhancementChanges;
  validation?: ComponentValidation;
  suggestions?: EnhancementSuggestions;
  analysis?: {
    originalAnalysis: ComponentAnalysis;
    enhancedAnalysis: ComponentAnalysis;
  };
  promptUsed?: {
    system: string;
    composed: string;
    clarified?: string;
  };
  rawOutput?: string;
  warning?: string;
}

export interface ComponentAnalysis {
  type: string;
  complexity: "simple" | "medium" | "complex";
  dependencies: string[];
  designPatterns: string[];
  accessibility: number;
  performance: number;
  linesOfCode: number;
  hasState: boolean;
  hasEffects: boolean;
  hasProps: boolean;
}

export interface DesignContext {
  colors: string[];
  spacing: string;
  typography: string;
  interactions: string[];
}

export interface DesignTokens {
  colors: ColorTokens;
  spacing: SpacingTokens;
  typography: TypographyTokens;
  shadows: ShadowTokens;
  borderRadius: BorderRadiusTokens;
  animations: AnimationTokens;
}

export interface ColorTokens {
  primary: string[];
  secondary: string[];
  accent: string[];
  neutral: string[];
  success: string[];
  warning: string[];
  error: string[];
}

export interface SpacingTokens {
  xs: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
  "2xl": string;
  "3xl": string;
}

export interface TypographyTokens {
  fontFamily: string[];
  fontSize: string[];
  fontWeight: string[];
  lineHeight: string[];
}

export interface ShadowTokens {
  sm: string;
  md: string;
  lg: string;
  xl: string;
}

export interface BorderRadiusTokens {
  sm: string;
  md: string;
  lg: string;
  xl: string;
  full: string;
}

export interface AnimationTokens {
  duration: string[];
  easing: string[];
  properties: string[];
}

export interface EnhancementChanges {
  addedLines: Array<{ line: number; content: string }>;
  removedLines: Array<{ line: number; content: string }>;
  modifiedLines: Array<{
    line: number;
    original: string;
    enhanced: string;
  }>;
  totalChanges: number;
}

export interface EnhancementSuggestions {
  accessibility: string[];
  performance: string[];
  design: string[];
  functionality: string[];
}

// Import shared types from components
import {
  ComponentValidation,
  ValidationError,
  ValidationWarning,
} from "./components";
