/**
 * Component Generation Types
 * Centralized type definitions for component generation functionality
 */

export interface ComponentGenerationOptions {
  target: string;
  group?: string;
  temperature?: number;
  maxTokens?: number;
  verbose?: boolean;
  output?: string;
  template?: string;
  local?: boolean;
  withTests?: boolean;
  updatePreview?: boolean;
  finalCanvas?: boolean;
  openPreview?: boolean;
  check?: boolean;
  completeArchitecture?: boolean;
  serverActions?: boolean;
  routes?: boolean;
  selfDocumenting?: boolean;
  architectureType?: "nextjs-app-router" | "react-spa";
}

export interface ComponentGenerationResult {
  success: boolean;
  component?: GeneratedComponent;
  error?: string;
  metadata?: {
    componentName: string;
    group: string;
    dependencies: string[];
    estimatedLines: number;
    shadcnComponents?: string[];
    qualityScore?: number;
  };
}

export interface GeneratedComponent {
  name: string;
  code: string;
  path: string;
  group: string;
  dependencies: string[];
  props: ComponentProp[];
  tests?: string;
  documentation?: string;
}

export interface ComponentProp {
  name: string;
  type: string;
  required: boolean;
  description: string;
  defaultValue?: string;
}

export interface ComponentGroup {
  name: string;
  description: string;
  components: Component[];
  priority: "high" | "medium" | "low";
  dependencies: string[];
}

export interface Component {
  name: string;
  description: string;
  type: "form" | "display" | "layout" | "interactive";
  priority: "high" | "medium" | "low";
  dependencies: string[];
  tags: string[];
  implementation?: string;
}

export interface ComponentValidation {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  score: number;
  suggestions: string[];
}

export interface ValidationError {
  type: "syntax" | "structure" | "react" | "typescript" | "accessibility";
  message: string;
  line?: number;
  severity: "error" | "warning";
}

export interface ValidationWarning {
  type: "performance" | "accessibility" | "best-practice";
  message: string;
  line?: number;
  suggestion: string;
}
