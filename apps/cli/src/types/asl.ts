/**
 * ASL (Abstract Specification Language)
 *
 * Formal TypeScript schema for deterministic full-stack app compilation.
 * This is the canonical input format for the MyContext compiler.
 *
 * ASL is LLM-generated from natural language, then validated by the Planner,
 * and finally consumed by deterministic script generators.
 */

// ============================================================================
// CORE ASL STRUCTURE
// ============================================================================

export interface ASL {
  version: "1.0";
  project: ProjectSpec;
  entities: Record<string, EntitySpec>;
  auth?: AuthSpec;
  permissions?: PermissionSpec[];
  pages: PageSpec[];
  components?: ComponentSpec[];
  relationships?: RelationshipSpec[];
  design?: DesignSpec;
}

// ============================================================================
// PROJECT SPECIFICATION
// ============================================================================

export interface ProjectSpec {
  name: string;
  description: string;
  framework: "nextjs";
  backend: "instantdb";
  styling?: "tailwind" | "tailwind-shadcn";
  packageManager?: "npm" | "pnpm" | "yarn" | "bun";
  typescript?: boolean; // default: true
}

// ============================================================================
// ENTITY SPECIFICATION (Database Schema)
// ============================================================================

export interface EntitySpec {
  name: string;
  description?: string;
  fields: FieldSpec[];
  indexes?: string[]; // Field names to index
  timestamps?: boolean; // Auto-add created_at, updated_at (default: true)
}

export interface FieldSpec {
  name: string;
  type: FieldType;
  required?: boolean; // default: false
  unique?: boolean;
  indexed?: boolean;
  default?: any;
  validation?: FieldValidation;
  description?: string;
}

export type FieldType =
  | "string"
  | "number"
  | "boolean"
  | "date"
  | "json"
  | "ref"; // Reference to another entity

export interface FieldValidation {
  min?: number;
  max?: number;
  pattern?: string; // Regex pattern
  enum?: string[]; // Allowed values
  custom?: string; // Custom validation function name
}

// ============================================================================
// RELATIONSHIP SPECIFICATION
// ============================================================================

export interface RelationshipSpec {
  name: string;
  from: string; // Entity name
  to: string; // Entity name
  type: RelationType;
  fromField?: string; // Foreign key field name (for many-to-one)
  cascade?: {
    delete?: boolean; // Delete related records
    update?: boolean; // Update related records
  };
}

export type RelationType =
  | "one-to-one"
  | "one-to-many"
  | "many-to-one"
  | "many-to-many";

// ============================================================================
// AUTH SPECIFICATION
// ============================================================================

export interface AuthSpec {
  provider: "email" | "oauth-github" | "oauth-google" | "magic-link";
  roles: RoleSpec[];
  defaultRole?: string; // Role assigned to new users
  userEntity?: string; // Which entity represents users (default: "User")
  features?: AuthFeature[];
}

export interface RoleSpec {
  name: string;
  description: string;
  extends?: string; // Inherit from another role
}

export type AuthFeature =
  | "email-verification"
  | "password-reset"
  | "two-factor"
  | "social-login"
  | "magic-link";

// ============================================================================
// PERMISSION SPECIFICATION (RBAC)
// ============================================================================

export interface PermissionSpec {
  role: string;
  resource: string; // Entity name or "*" for all
  actions: PermissionAction[];
  condition?: PermissionCondition;
}

export type PermissionAction = "create" | "read" | "update" | "delete" | "manage";

export interface PermissionCondition {
  type: "own" | "role" | "custom";
  field?: string; // Field to check (e.g., "author_id")
  value?: any; // Expected value
  expression?: string; // CEL expression for InstantDB
}

// ============================================================================
// PAGE SPECIFICATION (Next.js Routes)
// ============================================================================

export interface PageSpec {
  path: string; // Route path (e.g., "/posts", "/posts/[id]")
  name: string; // Component name (e.g., "PostsPage")
  type: PageType;
  title?: string;
  description?: string;

  // Access control
  public?: boolean; // Default: false (requires auth)
  guards?: PageGuard[];
  permissions?: string[]; // Permission IDs required

  // Layout
  layout?: LayoutSpec;

  // Data
  queries?: QuerySpec[];
  mutations?: MutationSpec[];

  // UI
  components?: string[]; // Component names to use
}

export type PageType = "page" | "layout" | "route-group";

export type PageGuard = "authenticated" | "role" | "permission" | "custom";

export interface LayoutSpec {
  type: "default" | "dashboard" | "auth" | "minimal";
  sidebar?: boolean;
  header?: boolean;
  footer?: boolean;
}

// ============================================================================
// DATA SPECIFICATION (Queries & Mutations)
// ============================================================================

export interface QuerySpec {
  name: string;
  entity: string;
  type: "one" | "many";
  filters?: FilterSpec[];
  includes?: string[]; // Related entities to include
  orderBy?: OrderBySpec;
  limit?: number;
}

export interface FilterSpec {
  field: string;
  operator: FilterOperator;
  value: any;
}

export type FilterOperator = "eq" | "ne" | "gt" | "gte" | "lt" | "lte" | "in" | "contains";

export interface OrderBySpec {
  field: string;
  direction: "asc" | "desc";
}

export interface MutationSpec {
  name: string;
  entity: string;
  type: MutationType;
  validation?: string[]; // Validation rule names
}

export type MutationType = "create" | "update" | "delete";

// ============================================================================
// COMPONENT SPECIFICATION
// ============================================================================

export interface ComponentSpec {
  name: string;
  type: ComponentType;
  description?: string;

  // Props
  props?: PropSpec[];

  // Dependencies
  dependencies?: string[]; // Other components used

  // UI
  variant?: string; // "card" | "list" | "form" | "modal"

  // Data
  dataSource?: string; // Entity name or query name
}

export type ComponentType =
  | "page"
  | "layout"
  | "card"
  | "list"
  | "form"
  | "modal"
  | "navigation"
  | "widget"
  | "custom";

export interface PropSpec {
  name: string;
  type: string; // TypeScript type
  required?: boolean;
  default?: any;
  description?: string;
}

// ============================================================================
// DESIGN SPECIFICATION
// ============================================================================

export interface DesignSpec {
  theme: "light" | "dark" | "system";
  colors?: ColorSpec;
  typography?: TypographySpec;
  spacing?: SpacingSpec;
  borderRadius?: number; // rem units
}

export interface ColorSpec {
  primary: string;
  secondary?: string;
  accent?: string;
  background?: string;
  foreground?: string;
  muted?: string;
  destructive?: string;
}

export interface TypographySpec {
  headingFont?: string;
  bodyFont?: string;
  scale?: "compact" | "normal" | "relaxed";
}

export interface SpacingSpec {
  unit?: number; // Base spacing unit in pixels (default: 4)
  scale?: "compact" | "normal" | "relaxed";
}

// ============================================================================
// VALIDATION TYPES
// ============================================================================

export interface ASLValidationResult {
  valid: boolean;
  errors: ASLValidationError[];
  warnings: ASLValidationWarning[];
  completeness: number; // 0-100%
}

export interface ASLValidationError {
  path: string; // JSON path (e.g., "entities.User.fields[0].type")
  message: string;
  severity: "error";
  fix?: string; // Suggested fix
}

export interface ASLValidationWarning {
  path: string;
  message: string;
  severity: "warning";
  suggestion?: string;
}

// ============================================================================
// QUESTION GENERATION TYPES
// ============================================================================

export interface Question {
  id: string;
  type: QuestionType;
  text: string;
  context?: string; // Additional context for the user
  options?: QuestionOption[];
  validation?: QuestionValidation;
  dependsOn?: string[]; // Question IDs this depends on
  category: QuestionCategory;
}

export type QuestionType =
  | "text"
  | "number"
  | "boolean"
  | "select"
  | "multi-select"
  | "entity-builder"
  | "field-builder";

export interface QuestionOption {
  value: string;
  label: string;
  description?: string;
}

export interface QuestionValidation {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  custom?: (value: any) => boolean;
}

export type QuestionCategory =
  | "project"
  | "entities"
  | "auth"
  | "permissions"
  | "pages"
  | "design";

// ============================================================================
// DIFF PREVIEW TYPES
// ============================================================================

export interface DiffPreview {
  summary: DiffSummary;
  files: FilePreview[];
  registries: RegistryPreview[];
  warnings?: string[];
}

export interface DiffSummary {
  totalFiles: number;
  newFiles: number;
  modifiedFiles: number;
  deletedFiles: number;
  linesAdded: number;
  linesRemoved: number;
}

export interface FilePreview {
  path: string;
  action: "create" | "modify" | "delete";
  type: "schema" | "page" | "component" | "action" | "config" | "type";
  preview?: string; // First few lines
  size?: number; // bytes
}

export interface RegistryPreview {
  type: "components" | "types" | "permissions";
  added: string[];
  modified: string[];
  removed: string[];
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Helper to check if ASL is complete enough for generation
 */
export function isASLComplete(asl: Partial<ASL>): asl is ASL {
  return !!(
    asl.version &&
    asl.project &&
    asl.entities &&
    Object.keys(asl.entities).length > 0 &&
    asl.pages &&
    asl.pages.length > 0
  );
}

/**
 * Calculate completeness percentage
 */
export function calculateCompleteness(asl: Partial<ASL>): number {
  let score = 0;
  let total = 0;

  // Project (20 points)
  total += 20;
  if (asl.project?.name) score += 5;
  if (asl.project?.description) score += 5;
  if (asl.project?.framework) score += 5;
  if (asl.project?.backend) score += 5;

  // Entities (30 points)
  total += 30;
  if (asl.entities && Object.keys(asl.entities).length > 0) {
    score += 15;
    const entityCount = Object.keys(asl.entities).length;
    const fieldsComplete = Object.values(asl.entities).every(
      e => e.fields && e.fields.length > 0
    );
    if (fieldsComplete) score += 15;
  }

  // Pages (20 points)
  total += 20;
  if (asl.pages && asl.pages.length > 0) {
    score += 10;
    const pagesComplete = asl.pages.every(p => p.path && p.name);
    if (pagesComplete) score += 10;
  }

  // Auth (15 points)
  total += 15;
  if (asl.auth?.provider) score += 8;
  if (asl.auth?.roles && asl.auth.roles.length > 0) score += 7;

  // Permissions (10 points)
  total += 10;
  if (asl.permissions && asl.permissions.length > 0) score += 10;

  // Design (5 points)
  total += 5;
  if (asl.design?.theme) score += 5;

  return Math.round((score / total) * 100);
}

/**
 * Get missing sections from ASL
 */
export function getMissingSections(asl: Partial<ASL>): string[] {
  const missing: string[] = [];

  if (!asl.project) missing.push("project");
  if (!asl.entities || Object.keys(asl.entities).length === 0) missing.push("entities");
  if (!asl.pages || asl.pages.length === 0) missing.push("pages");
  if (!asl.auth) missing.push("auth");
  if (!asl.permissions || asl.permissions.length === 0) missing.push("permissions");
  if (!asl.design) missing.push("design");

  return missing;
}

/**
 * Validate entity references in pages
 */
export function validateEntityReferences(asl: Partial<ASL>): string[] {
  const errors: string[] = [];

  if (!asl.pages || !asl.entities) return errors;

  asl.pages.forEach((page, idx) => {
    page.queries?.forEach((query, qIdx) => {
      if (!asl.entities![query.entity]) {
        errors.push(
          `pages[${idx}].queries[${qIdx}]: Entity "${query.entity}" does not exist`
        );
      }
    });

    page.mutations?.forEach((mutation, mIdx) => {
      if (!asl.entities![mutation.entity]) {
        errors.push(
          `pages[${idx}].mutations[${mIdx}]: Entity "${mutation.entity}" does not exist`
        );
      }
    });
  });

  return errors;
}

/**
 * Validate permission references
 */
export function validatePermissionReferences(asl: Partial<ASL>): string[] {
  const errors: string[] = [];

  if (!asl.permissions || !asl.entities || !asl.auth) return errors;

  asl.permissions.forEach((perm, idx) => {
    // Check role exists
    if (!asl.auth!.roles?.find(r => r.name === perm.role)) {
      errors.push(`permissions[${idx}]: Role "${perm.role}" does not exist`);
    }

    // Check resource exists (unless it's "*")
    if (perm.resource !== "*" && !asl.entities![perm.resource]) {
      errors.push(`permissions[${idx}]: Resource "${perm.resource}" does not exist`);
    }
  });

  return errors;
}

// ============================================================================
// INFERENCE ENGINE TYPES
// ============================================================================

/**
 * Represents a task in the inference decomposition tree
 */
export interface InferenceTask {
  id: string;
  description: string;
  category: QuestionCategory;
  confidence: number; // 0-100
  dependencies: string[]; // Task IDs this depends on
  autoInfer: boolean; // If confidence ≥ 90%
  needsConfirmation: boolean; // If 70-89% after self-critique
  needsUserInput: boolean; // If <70%
  inference?: Partial<ASL>; // What was inferred
  reasoning?: string; // Why this was inferred
  completed: boolean;
  completedAt?: Date;
}

/**
 * State of the planning and inference process
 */
export interface PlannerState {
  tasks: InferenceTask[];
  completedTasks: string[];
  pendingTasks: string[];
  revealedContext: ContextRevelation[]; // Context revealed during inference
  confidenceScore: number; // Overall confidence (weighted average)
  learningContext: LearningContext;
  checkpoints: Checkpoint[];
}

/**
 * Context revealed to user during inference
 */
export interface ContextRevelation {
  taskId: string;
  message: string;
  confidence: number;
  timestamp: Date;
  category: QuestionCategory;
}

/**
 * Session-based learning from user corrections
 */
export interface LearningContext {
  corrections: Correction[];
  preferences: Record<string, any>; // User preferences discovered during session
  patterns: Pattern[]; // Detected patterns (e.g., user prefers "article" over "post")
}

/**
 * User correction to an inference
 */
export interface Correction {
  taskId: string;
  inferredValue: any;
  correctedValue: any;
  reason?: string; // Optional user explanation
  timestamp: Date;
}

/**
 * Detected pattern from user behavior
 */
export interface Pattern {
  type: "terminology" | "structure" | "preference";
  description: string;
  examples: string[];
  confidence: number;
}

/**
 * Checkpoint summary before proceeding
 */
export interface Checkpoint {
  id: string;
  timestamp: Date;
  autoInferredTasks: InferenceTask[];
  summary: CheckpointSummary;
  approved: boolean;
}

/**
 * Summary of checkpoint
 */
export interface CheckpointSummary {
  entitiesCreated: string[];
  fieldsAdded: number;
  rolesCreated: string[];
  permissionsAdded: number;
  pagesCreated: string[];
  totalConfidence: number;
}

/**
 * Result of an inference operation
 */
export interface InferenceResult {
  task: InferenceTask;
  result: Partial<ASL>;
  confidence: number;
  reasoning: string;
  critique?: SelfCritique;
}

/**
 * Self-critique of an inference
 */
export interface SelfCritique {
  isValid: boolean;
  confidence: number; // Updated confidence after critique
  issues: CritiqueIssue[];
  suggestions: string[];
}

/**
 * Issue found during self-critique
 */
export interface CritiqueIssue {
  severity: "error" | "warning" | "info";
  message: string;
  field?: string;
  suggestion?: string;
}
