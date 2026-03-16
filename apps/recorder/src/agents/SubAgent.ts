/**
 * Core interfaces for the MyContext Sub-Agent Architecture
 * Inspired by Anthropic's Claude Code sub-agents
 */

export interface SubAgent<TInput = any, TOutput = any> {
  /** Unique identifier for the sub-agent */
  name: string;

  /** Human-readable description of the sub-agent's role */
  description: string;

  /** Personality and expertise description */
  personality: string;

  /** LLM provider to use (e.g., 'claude-code', 'claude-sonnet', 'claude-haiku') */
  llmProvider: string;

  /** Areas of expertise */
  expertise: string[];

  /** Execute the sub-agent's main functionality */
  run(input: TInput): Promise<TOutput>;

  /** Validate input before processing (optional) */
  validate?(input: TInput): boolean | Promise<boolean>;

  /** Cleanup resources after execution (optional) */
  cleanup?(): Promise<void>;

  /** Get sub-agent status and health */
  getStatus?(): Promise<SubAgentStatus>;
}

export interface SubAgentStatus {
  name: string;
  status: "idle" | "running" | "completed" | "error";
  lastRun?: Date;
  executionTime?: number;
  errorCount: number;
  successCount: number;
}

export interface SubAgentConfig {
  name: string;
  enabled: boolean;
  llmProvider: string;
  temperature?: number;
  maxTokens?: number;
  timeout?: number;
  retries?: number;
}

export interface WorkflowStep {
  id: string;
  agentName: string;
  input: any;
  dependencies?: string[]; // IDs of steps this depends on
  parallel?: boolean; // Can run in parallel with other steps
  timeout?: number;
  retries?: number;
}

export interface WorkflowResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  executionTime: number;
  steps: WorkflowStepResult[];
}

export interface WorkflowStepResult {
  stepId: string;
  agentName: string;
  success: boolean;
  data?: any;
  error?: string;
  executionTime: number;
  startTime: Date;
  endTime: Date;
}

export interface SubAgentRegistry {
  register<TInput, TOutput>(agent: SubAgent<TInput, TOutput>): void;
  get(name: string): SubAgent<any, any> | undefined;
  list(): SubAgent<any, any>[];
  remove(name: string): boolean;
}

export interface SubAgentOrchestrator {
  /** Register a sub-agent */
  registerAgent<TInput, TOutput>(agent: SubAgent<TInput, TOutput>): void;

  /** Execute a single sub-agent */
  executeAgent<TInput, TOutput>(
    agentName: string,
    input: TInput
  ): Promise<TOutput>;

  /** Execute a workflow with multiple sub-agents */
  executeWorkflow<T>(workflow: WorkflowStep[]): Promise<WorkflowResult<T>>;

  /** Execute sub-agents in parallel */
  executeParallel<TInput, TOutput>(
    agents: Array<{ name: string; input: TInput }>
  ): Promise<Map<string, TOutput>>;

  /** Get orchestration status */
  getStatus(): Promise<OrchestratorStatus>;
}

export interface OrchestratorStatus {
  activeWorkflows: number;
  registeredAgents: string[];
  totalExecutions: number;
  averageExecutionTime: number;
  errorRate: number;
}

// Interactive Agent Types
export interface InteractiveInput {
  type: "prompt" | "confirm" | "select" | "multiline";
  message: string;
  defaultValue?: string;
  options?: string[];
  validate?: (input: string) => boolean | string;
  timeout?: number;
  retryOnError?: boolean;
  context?: any;
}

export interface InteractiveOutput {
  success: boolean;
  response: string;
  metadata: {
    inputType: string;
    responseTime: number;
    retries: number;
    context?: any;
  };
}

// Project Setup Agent Types
export interface ProjectSetupInput {
  projectName: string;
  framework: "nextjs" | "react" | "vue" | "angular";
  description: string;
  features: string[];
  existing?: boolean;
  migrate?: boolean;
  skipDependencies?: boolean;
}

export interface ProjectSetupOutput {
  success: boolean;
  projectPath: string;
  initialized: boolean;
  dependencies: string[];
  configFiles: string[];
  errors?: string[];
}

// Workflow Agent Types
export interface WorkflowInput {
  description: string;
  projectName: string;
  framework: "nextjs" | "react" | "vue" | "angular";
  withTests?: boolean;
  interactive?: boolean;
  skipValidation?: boolean;
  maxRetries?: number;

  // Complete Architecture Options
  completeArchitecture?: boolean;
  architectureType?: "nextjs-app-router" | "nextjs-pages" | "react-spa";
  generateServerActions?: boolean;
  generateRoutes?: boolean;
  selfDocumenting?: boolean;
}

export interface WorkflowOutput {
  success: boolean;
  projectPath: string;
  completedSteps: string[];
  failedSteps: string[];
  userInteractions: number;
  totalRetries: number;
  duration: number;
}

export interface WorkflowStep {
  id: string;
  name: string;
  description: string;
  agentName: string;
  agent: SubAgent<any, any>;
  input: any;
  dependencies?: string[];
  required?: boolean;
  retryable?: boolean;
  interactive?: boolean;
  skip?: (context: any) => boolean;
}

// Common input/output types for sub-agents
export interface ComponentGenerationInput {
  component: any;
  group: string;
  options: any;
  context?: any;
}

export interface ComponentGenerationOutput {
  code: string;
  metadata: {
    componentName: string;
    group: string;
    dependencies: string[];
    estimatedLines: number;
    shadcnComponents?: string[];
    qualityScore?: number;
  };
}

export interface QAValidationInput {
  code: string;
  component: any;
  standards: string[];
}

export interface QAValidationOutput {
  isValid: boolean;
  issues: Array<{
    type: "error" | "warning" | "suggestion";
    message: string;
    line?: number;
    severity: "low" | "medium" | "high";
  }>;
  score: number; // 0-100
}

export interface DocumentationInput {
  code: string;
  component: any;
  format: "readme" | "comments" | "inline";
}

export interface DocumentationOutput {
  content: string;
  format: string;
  estimatedReadTime: number;
}

export interface ActionClassificationInput {
  userStories: any[];
  types: any[];
  context: any;
}

export interface ActionClassificationOutput {
  actions: Array<{
    name: string;
    type: "user" | "server" | "response" | "common";
    description: string;
    dependencies: string[];
    parameters: any[];
  }>;
  dependencies: Array<{
    from: string;
    to: string;
    type: "component" | "action" | "type";
  }>;
}

// Enhancement Agent Interfaces
export interface EnhancementInput {
  currentComponent: string;
  userPrompt: string;
  designContext: DesignContext;
  constraints: {
    maxDependencies: number;
    targetFramework: "react" | "next";
    uiLibrary: "shadcn" | "custom";
  };
}

export interface EnhancementOutput {
  enhancedComponent: string;
  designTokens: DesignTokens;
  changes: EnhancementChanges;
  validation: ComponentValidation;
  suggestions: EnhancementSuggestions;
  analysis: {
    originalAnalysis: ComponentAnalysis;
    enhancedAnalysis: ComponentAnalysis;
  };
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
