export interface ProjectConfig {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  contextPath: string;
  version: string;
  status:
    | "initialized"
    | "context-generated"
    | "branded"
    | "components-planned"
    | "generating"
    | "completed";
}

/**
 * Unified ProjectContext interface - Single source of truth
 * Consolidates all context properties from contextManager.ts and contextLoader.ts
 */
export interface ProjectContext {
  // Core context files
  prd?: string;
  types?: string;
  brand?: string;
  componentList?: any;
  projectStructure?: string;

  // User-centric context files (A/B/C/D files)
  features?: string; // 01a-features.md
  userFlows?: string; // 01b-user-flows.md
  edgeCases?: string; // 01c-edge-cases.md
  technicalSpecs?: string; // 01d-technical-specs.md

  // Legacy/alternative context files
  userStories?: string;

  // Build strategy integration
  buildStrategy?: BuildStrategyPlan;

  // Metadata
  previousOutputs?: Record<string, any>;
  userPrompt?: string;
  workingDirectory?: string;
  contextVersion?: string;
  lastUpdated?: string;
}

export interface ContextFiles {
  prd: string;
  types: string;
  userStories: string;
  actionFunctions: string;
  componentList: string;
  branding?: string;
}

export interface PRDValidationResult {
  overall: number;
  dimensions: {
    technicalCompleteness: number;
    noveltyRisk: number;
    resourceEstimate: number;
    compliance: number;
    languageClarity: number;
  };
  recommendations: string[];
  risks: string[];
  isValid: boolean;
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

export interface CommandOptions {
  verbose?: boolean;
  project?: string;
  yes?: boolean; // Add yes flag for non-interactive mode
}

export interface GenerationOptions {
  temperature?: number;
  maxTokens?: number;
  verbose?: boolean;
  output?: string;
}

export interface GenerateComponentsOptions {
  target: string;
  group?: string;
  temperature?: number;
  maxTokens?: number;
  verbose?: boolean;
  output?: string;
}

export interface EnhancementOptions {
  prompt: string;
  temperature?: number;
  maxTokens?: number;
  verbose?: boolean;
  output?: string;
}

export interface GenerationResult {
  success: boolean;
  content?: string;
  error?: string;
  provider: "qwen" | "github" | "huggingface" | "hybrid";
  metadata?: {
    model: string;
    tokens: number;
    latency: number;
  };
}

export interface ComponentProp {
  name: string;
  type: string;
  required: boolean;
  description: string;
  defaultValue?: string;
}

export interface BrandingConfig {
  projectName: string;
  colors: {
    primary: string;
    secondary: string;
    accent?: string;
    background: string;
    foreground: string;
    muted: string;
    mutedForeground: string;
    card: string;
    cardForeground: string;
    border: string;
    input: string;
    ring: string;
  };
  typography: {
    fontFamily: string;
    headingFont?: string;
    fontSizes: string[];
  };
  spacing: {
    baseUnit: number;
    scale: number[];
  };
  designPrinciples: string[];
  componentPatterns: string[];
}

export interface CLIContext {
  currentProject?: ProjectConfig;
  globalConfig: GlobalConfig;
  workingDirectory: string;
}

export interface GlobalConfig {
  defaultEditor: string;
  apiEndpoint: string;
  userId?: string;
  apiKey?: string;
}

export interface UserStory {
  id: string;
  title: string;
  description: string;
  acceptanceCriteria: string[];
  priority: "low" | "medium" | "high" | "critical";
  components: string[];
  actionFunctions: string[];
}

export interface ActionFunction {
  name: string;
  description: string;
  parameters: FunctionParameter[];
  returnType: string;
  userStories: string[];
  implementation?: string;
}

export interface FunctionParameter {
  name: string;
  type: string;
  required: boolean;
  description: string;
}

export interface AIProvider {
  name: string;
  priority: number;
  client: any;
  isAvailable: () => Promise<boolean>;
}

// ============================================================================
// BUILD STRATEGY TYPES
// ============================================================================

export type StrategyId =
  | "foundation-first"
  | "vertical-slice"
  | "horizontal-slice"
  | "iterative-scaffolding"
  | "hybrid-approach";

export type PhaseStatus =
  | "not_started"
  | "planning"
  | "in_progress"
  | "blocked"
  | "completed"
  | "cancelled";

export type TaskStatus =
  | "pending"
  | "in_progress"
  | "blocked"
  | "in_review"
  | "completed"
  | "cancelled";

export type TaskCategory =
  | "setup"
  | "backend"
  | "frontend"
  | "testing"
  | "documentation"
  | "refactoring"
  | "bugfix"
  | "deployment";

/**
 * Phase Identifier - Supports hierarchical phases (3.5a, etc.)
 */
export interface PhaseIdentifier {
  id: string; // "phase-3.5.a"
  major: number; // 3
  minor?: number; // 5
  patch?: string; // "a"
  label: string; // "Phase 3.5a"
  displayOrder: number; // 3.51 (for sorting)
}

/**
 * Task with machine-readable status
 */
export interface Task {
  // Identity
  id: string;
  title: string;
  description?: string;

  // Status
  status: TaskStatus;
  emoji?: string; // Optional visual indicator

  // Timing
  createdAt: string;
  updatedAt?: string;
  startedAt?: string;
  completedAt?: string;
  dueDate?: string;

  // Effort
  estimatedHours?: number;
  actualHours?: number;
  complexity?: "simple" | "medium" | "complex";

  // Assignment
  assignee?: string;
  team?: string;

  // Priority & Classification
  priority: "critical" | "high" | "medium" | "low";
  category?: TaskCategory;
  tags?: string[];

  // Dependencies
  dependencies?: string[]; // Task IDs
  blockedBy?: string[];
  blocks?: string[];

  // Related Entities
  relatedComponents?: string[];
  relatedFiles?: string[];
  pullRequest?: string;
  issue?: string;

  // Notes
  notes?: string;
  completionNotes?: string;
}

/**
 * Phase Progress - Auto-calculated
 */
export interface PhaseProgress {
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  blockedTasks: number;
  completionPercentage: number; // Auto-calculated
  estimatedHoursTotal: number;
  actualHoursSpent: number;
  burndownRate?: number;
}

/**
 * Phase Dependency
 */
export interface PhaseDependency {
  phaseId: string;
  type: "requires" | "suggests" | "optional";
  reason: string;
  status: "satisfied" | "pending" | "blocked";
}

/**
 * Phase Component - Links components to phases
 */
export interface PhaseComponent {
  name: string;
  path: string;
  type: "ui" | "page" | "api" | "utility" | "hook" | "context" | "type";
  generatedAt?: string;
  status: "planned" | "generated" | "refined" | "tested" | "production";
  relatedTasks: string[];
  dependencies?: string[];
  tests?: ComponentTest[];
}

export interface ComponentTest {
  type: "unit" | "integration" | "e2e";
  path: string;
  status: "passing" | "failing" | "skipped";
  coverage?: number;
}

/**
 * Deliverable
 */
export interface Deliverable {
  id: string;
  title: string;
  description?: string;
  type:
    | "feature"
    | "component"
    | "documentation"
    | "test_suite"
    | "deployment"
    | "api_endpoint"
    | "database_schema";
  status: "planned" | "in_progress" | "completed" | "verified";
  createdAt: string;
  completedAt?: string;
  relatedTasks: string[];
  artifacts?: DeliverableArtifact[];
}

export interface DeliverableArtifact {
  name: string;
  type: "file" | "url" | "screenshot" | "demo";
  path: string;
  createdAt: string;
}

/**
 * Build Phase
 */
export interface BuildPhase {
  // Identity
  phase: PhaseIdentifier;
  name: string;
  description?: string;

  // Timing
  duration: string;
  estimatedEffort: string;
  startDate?: string;
  endDate?: string;
  estimatedCompletionDate?: string;

  // Status
  status: PhaseStatus;
  priority: "critical" | "high" | "medium" | "low";

  // Progress
  progress: PhaseProgress;

  // Tasks & Deliverables
  tasks: Task[];
  deliverables: Deliverable[];
  successCriteria: string | string[];

  // Components
  components: PhaseComponent[];

  // Dependencies
  dependencies: PhaseDependency[];
  blockedBy?: string[];
  blocks?: string[];

  // Metadata
  notes?: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Milestone
 */
export interface Milestone {
  id: string;
  phaseId: string;
  title: string;
  description?: string;
  targetDate?: string;
  achievedDate?: string;
  status: "upcoming" | "in_progress" | "achieved" | "missed";
  criteria: string[];
}

/**
 * Risk Factor
 */
export interface RiskFactor {
  id: string;
  title: string;
  description: string;
  severity: "critical" | "high" | "medium" | "low";
  probability: "very_likely" | "likely" | "possible" | "unlikely";
  impact: string;
  mitigation: string;
  status: "active" | "mitigated" | "occurred" | "resolved";
  relatedPhases: string[];
}

/**
 * Success Metrics
 */
export interface SuccessMetrics {
  codeCoverage: string;
  performance: string;
  security: string;
  mobile: string;
  userRoles: string;
  [key: string]: string; // Extensible
}

/**
 * Build Strategy Plan - Main type
 */
export interface BuildStrategyPlan {
  // Metadata
  type: "plan" | "recommendations" | "tasks" | "comparison";
  version: string;
  generatedAt: string;
  projectPath: string;
  lastUpdated: string;

  // Strategy Selection
  strategy: StrategyMetadata;

  // Project Context Reference
  context: {
    projectName: string;
    description: string;
    techStack: string[];
    userRoles: string[];
    components: string[];
    features: string[];
    complexity: "simple" | "medium" | "complex";
    teamSize: "solo" | "small" | "large";
    timeline: "urgent" | "moderate" | "flexible";
  };

  // Build Plan
  data: {
    plan: BuildPhase[];
    totalDuration: string;
    currentPhase: PhaseIdentifier;
    nextMilestone: string;
    milestones: Milestone[];
    riskFactors: RiskFactor[];
    successMetrics: SuccessMetrics;
  };
}

/**
 * Strategy Metadata
 */
export interface StrategyMetadata {
  id: StrategyId;
  name: string;
  description: string;
  icon: string;
  complexity: "low" | "medium" | "high";
  timeToFirstDemo: string;
  currentStatus: string;
  completionPercentage: number;
  bestFor: string[];
  pros: string[];
  cons: string[];
}

// ============================================================================
// COMPLETE ARCHITECTURE TYPES (Enhanced Component Generation)
// ============================================================================

/**
 * Action Types
 */
export type ActionType =
  | "server-action" // Next.js server action
  | "client-action" // Client-side action
  | "event-handler" // React event handler
  | "form-action" // Form submission handler
  | "api-route" // API route handler
  | "middleware"; // Middleware function

export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

/**
 * Action Definition
 */
export interface ActionDefinition {
  name: string;
  type: ActionType;
  description: string;
  method?: HttpMethod;
  route?: string;
  parameters?: string[];
  returns?: string;
  database?: string;
  validation?: string;
  middleware?: string[];
  external?: string[];
  serverAction?: string; // Reference to server action if client action
}

/**
 * Server Action Definition
 */
export interface ServerActionDefinition {
  name: string;
  description: string;
  parameters: Array<{
    name: string;
    type: string;
    required: boolean;
    description?: string;
  }>;
  returns: string;
  database?: string;
  validation?: string;
  middleware?: string[];
  external?: string[];
  errorHandling?: string[];
  caching?: {
    strategy: "no-cache" | "force-cache" | "revalidate";
    revalidate?: number;
  };
}

/**
 * Route Definition
 */
export interface RouteDefinition {
  path: string;
  type: "page" | "layout" | "dynamic" | "api";
  page?: string;
  layout?: string;
  components: string[];
  actions: string[];
  middleware?: string[];
  metadata?: {
    title?: string;
    description?: string;
    openGraph?: Record<string, any>;
  };
}

/**
 * API Endpoint Definition
 */
export interface ApiEndpoint {
  path: string;
  methods: HttpMethod[];
  actions: string[];
  middleware?: string[];
  rateLimit?: {
    requests: number;
    window: string;
  };
  auth?: boolean;
  description?: string;
}

/**
 * Enhanced Component Definition with Complete Architecture
 */
export interface EnhancedComponent extends Component {
  level: number;
  routes: RouteDefinition[];
  actions: ActionDefinition[];
  serverActions?: ServerActionDefinition[];
  apiEndpoints?: ApiEndpoint[];
  database?: {
    table: string;
    operations: ("read" | "write" | "update" | "delete")[];
  };
  children?: Record<string, EnhancedComponent>;
  selfDocumentation?: ComponentDocumentation;
}

/**
 * Component Documentation
 */
export interface ComponentDocumentation {
  purpose: string;
  userExpectations: string[];
  integrationNotes: string[];
  dataFlow: string[];
  usageExample: string;
  dependencies: ComponentReference[];
  relatedActions: string[];
  relatedRoutes: string[];
}

/**
 * Component Reference
 */
export interface ComponentReference {
  name: string;
  level: number;
  relationship: "parent" | "child" | "sibling" | "dependency";
}

/**
 * Complete Generation Item
 */
export interface CompleteGenerationItem {
  component: EnhancedComponent;
  level: number;
  dependencies: ComponentReference[];
  routes: RouteDefinition[];
  actions: ActionDefinition[];
  serverActions: ServerActionDefinition[];
  generationOrder: number;
  selfDocumentation: string;
}

/**
 * Complete Architecture Plan
 */
export interface CompleteArchitecturePlan {
  project: {
    name: string;
    description: string;
    architecture: {
      type: "nextjs-app-router" | "nextjs-pages" | "react-spa" | "custom";
      features: FeatureDefinition[];
    };
  };
  hierarchy: Record<string, EnhancedComponent>;
  routes: Record<string, RouteDefinition>;
  api: Record<string, ApiEndpoint>;
  serverActions: Record<
    string,
    {
      description: string;
      actions: ServerActionDefinition[];
    }
  >;
  metadata: {
    totalComponents: number;
    totalRoutes: number;
    totalApiEndpoints: number;
    totalServerActions: number;
    generationStrategy: string;
    documentationLevel: "basic" | "standard" | "comprehensive";
  };
}

/**
 * Feature Definition
 */
export interface FeatureDefinition {
  name: string;
  description: string;
  components: {
    client: string[];
    server: string[];
  };
  routes: RouteDefinition[];
  actions: ActionDefinition[];
  database?: {
    tables: string[];
    relationships: string[];
  };
}

/**
 * Generation Queue Item
 */
export interface GenerationQueueItem {
  component: EnhancedComponent;
  order: number;
  dependencies: string[];
  status: "pending" | "in_progress" | "completed" | "failed";
}

// ============================================================================
// RE-EXPORT SPECIALIZED TYPES
// ============================================================================

// Progress Types
export * from "./progress";

// Analysis Types
export * from "./analysis";

// Component Types
export * from "./components";

// Enhancement Types
export * from "./enhancement";

// PM Integration Types
export * from "./pm-integration";

// Feature Bundle Types
export * from "./feature-bundle";

// Role Permission Types (excluding members already exported from feature-bundle)
export type { Role, RoleHierarchy } from "./role-permissions";
