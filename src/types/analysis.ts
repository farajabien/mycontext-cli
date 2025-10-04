/**
 * Analysis Types
 * Centralized type definitions for project analysis functionality
 */

export interface ProjectAnalysis {
  projectType: string;
  framework: string;
  structure: {
    hasAppRouter: boolean;
    hasPagesRouter: boolean;
    hasComponents: boolean;
    hasLib: boolean;
    hasStyles: boolean;
  };
  components: ComponentInfo[];
  types: TypeInfo[];
  styling: StylingInfo;
  dependencies: string[];
  packageJson: any;
  inferredPurpose: string;
  recommendations: string[];
}

export interface ComponentInfo {
  name: string;
  path: string;
  type: "page" | "component" | "layout" | "api" | "documentation";
  group?: string;
  props: string[];
  dependencies: string[];
  complexity: number;
  hasState: boolean;
  hasEffects: boolean;
  isClient: boolean;
  isServer: boolean;
}

export interface TypeInfo {
  name: string;
  type: "interface" | "type" | "enum" | "class";
  path: string;
  properties: string[];
  isExported: boolean;
  isGeneric: boolean;
}

export interface StylingInfo {
  framework:
    | "tailwind"
    | "css-modules"
    | "styled-components"
    | "emotion"
    | "vanilla";
  hasDesignSystem: boolean;
  colors: string[];
  fonts: string[];
  spacing: string[];
  breakpoints: string[];
  customProperties: string[];
}

export interface AnalysisOptions {
  output?: string;
  generateContext?: boolean;
  includeBrand?: boolean;
  includeTypes?: boolean;
  includeComponents?: boolean;
  verbose?: boolean;
}

export interface AnalysisResult {
  success: boolean;
  analysis?: ProjectAnalysis;
  error?: string;
  generatedFiles?: string[];
}
