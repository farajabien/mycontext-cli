/**
 * Planner Service
 *
 * The "Planner Layer" in the MyContext compiler pipeline.
 * Responsible for:
 * 1. Validating ASL for 100% completeness
 * 2. Generating clarifying questions for gaps
 * 3. Creating diff previews before generation
 * 4. Task decomposition with confidence scoring (NEW)
 * 5. Auto-inference for high-confidence tasks (NEW)
 *
 * The Planner ensures NO code is generated until the specification is perfect.
 */

import type {
  ASL,
  ASLValidationResult,
  ASLValidationError,
  ASLValidationWarning,
  Question,
  QuestionCategory,
  QuestionOption,
  DiffPreview,
  DiffSummary,
  FilePreview,
  RegistryPreview,
  EntitySpec,
  PageSpec,
  InferenceTask,
  PlannerState,
  ContextRevelation,
  Checkpoint,
  CheckpointSummary,
} from "../types/asl";

import {
  calculateCompleteness,
  getMissingSections,
  validateEntityReferences,
  validatePermissionReferences,
  isASLComplete,
} from "../types/asl";

import { AICore } from "../core/ai/AICore";
import { InferenceEngine } from "./InferenceEngine";

export class Planner {
  private state: PlannerState;
  private inferenceEngine: InferenceEngine;
  private aiCore: AICore;

  constructor() {
    this.inferenceEngine = new InferenceEngine();
    this.aiCore = AICore.getInstance({
      fallbackEnabled: true,
      workingDirectory: process.cwd(),
    });
    this.state = {
      tasks: [],
      completedTasks: [],
      pendingTasks: [],
      revealedContext: [],
      confidenceScore: 0,
      learningContext: {
        corrections: [],
        preferences: {},
        patterns: [],
      },
      checkpoints: [],
    };
  }

  // ============================================================================
  // NEW: TASK DECOMPOSITION & INFERENCE
  // ============================================================================

  /**
   * Decompose initial input into inference tasks with confidence scores
   */
  async decompose(initialInput: string): Promise<InferenceTask[]> {
    const prompt = this.buildDecompositionPrompt(initialInput);

    const response = await this.aiCore.generateText(prompt, {
      temperature: 0.3,
    });

    let parsedTasks: any;
    try {
      // Strip markdown code blocks if present
      let cleanedResponse = response.trim();
      if (cleanedResponse.startsWith('```json')) {
        cleanedResponse = cleanedResponse.replace(/^```json\s*/m, '').replace(/\s*```$/m, '');
      } else if (cleanedResponse.startsWith('```')) {
        cleanedResponse = cleanedResponse.replace(/^```\s*/m, '').replace(/\s*```$/m, '');
      }

      parsedTasks = JSON.parse(cleanedResponse);
    } catch (error) {
      throw new Error(`Failed to parse task decomposition: ${response}`);
    }

    // Convert to InferenceTask objects
    const tasks: InferenceTask[] = parsedTasks.tasks.map((t: any, idx: number) => ({
      id: `task-${idx + 1}`,
      description: t.description,
      category: t.category,
      confidence: t.confidence,
      dependencies: t.dependencies || [],
      autoInfer: t.confidence >= 90,
      needsConfirmation: t.confidence >= 70 && t.confidence < 90,
      needsUserInput: t.confidence < 70,
      completed: false,
    }));

    this.state.tasks = tasks;
    this.state.pendingTasks = tasks.map(t => t.id);

    return tasks;
  }

  /**
   * Select next task to execute based on dependencies and confidence
   */
  selectNextTask(): InferenceTask | null {
    const availableTasks = this.state.tasks.filter(task => {
      // Must be pending
      if (task.completed) return false;

      // All dependencies must be completed
      const dependenciesMet = task.dependencies.every(depId =>
        this.state.completedTasks.includes(depId)
      );

      return dependenciesMet;
    });

    if (availableTasks.length === 0) return null;

    // Prioritize by confidence (highest first)
    availableTasks.sort((a, b) => b.confidence - a.confidence);

    return availableTasks[0] || null;
  }

  /**
   * Mark task as completed and update state
   */
  markTaskComplete(taskId: string): void {
    const task = this.state.tasks.find(t => t.id === taskId);
    if (!task) return;

    task.completed = true;
    task.completedAt = new Date();
    this.state.completedTasks.push(taskId);
    this.state.pendingTasks = this.state.pendingTasks.filter(id => id !== taskId);

    // Update overall confidence score
    this.updateConfidenceScore();
  }

  /**
   * Update dependent tasks after a task completes
   */
  updateDependentTasks(completedTask: InferenceTask): void {
    this.state.tasks = this.inferenceEngine.feedToNextTasks(
      completedTask,
      this.state.tasks.filter(t => !t.completed)
    );
  }

  /**
   * Reveal context to user (what was inferred and why)
   */
  revealContext(task: InferenceTask, inference: Partial<ASL>): ContextRevelation[] {
    const revelations: ContextRevelation[] = [];

    // Generate human-readable explanations
    if (inference.entities) {
      Object.keys(inference.entities).forEach(entityName => {
        revelations.push({
          taskId: task.id,
          message: `${entityName} entity (${task.reasoning || 'inferred from context'})`,
          confidence: task.confidence,
          timestamp: new Date(),
          category: task.category,
        });
      });
    }

    if (inference.auth) {
      revelations.push({
        taskId: task.id,
        message: `Authentication: ${inference.auth.provider} (${task.reasoning || 'inferred from context'})`,
        confidence: task.confidence,
        timestamp: new Date(),
        category: task.category,
      });
    }

    if (inference.pages) {
      inference.pages.forEach(page => {
        revelations.push({
          taskId: task.id,
          message: `Page: ${page.path} (${task.reasoning || 'inferred from context'})`,
          confidence: task.confidence,
          timestamp: new Date(),
          category: task.category,
        });
      });
    }

    this.state.revealedContext.push(...revelations);
    return revelations;
  }

  /**
   * Create checkpoint summary before proceeding
   */
  createCheckpoint(autoInferredTasks: InferenceTask[]): Checkpoint {
    const entitiesCreated: string[] = [];
    const rolesCreated: string[] = [];
    const pagesCreated: string[] = [];
    let fieldsAdded = 0;
    let permissionsAdded = 0;

    autoInferredTasks.forEach(task => {
      if (task.inference?.entities) {
        Object.keys(task.inference.entities).forEach(entityName => {
          entitiesCreated.push(entityName);
          const entity = task.inference?.entities?.[entityName];
          if (entity) {
            fieldsAdded += entity.fields?.length || 0;
          }
        });
      }

      if (task.inference?.auth?.roles) {
        rolesCreated.push(...task.inference.auth.roles.map(r => r.name));
      }

      if (task.inference?.permissions) {
        permissionsAdded += task.inference.permissions.length;
      }

      if (task.inference?.pages) {
        pagesCreated.push(...task.inference.pages.map(p => p.path));
      }
    });

    const totalConfidence =
      autoInferredTasks.reduce((sum, t) => sum + t.confidence, 0) /
      (autoInferredTasks.length || 1);

    const summary: CheckpointSummary = {
      entitiesCreated,
      fieldsAdded,
      rolesCreated,
      permissionsAdded,
      pagesCreated,
      totalConfidence: Math.round(totalConfidence),
    };

    const checkpoint: Checkpoint = {
      id: `checkpoint-${this.state.checkpoints.length + 1}`,
      timestamp: new Date(),
      autoInferredTasks,
      summary,
      approved: false,
    };

    this.state.checkpoints.push(checkpoint);
    return checkpoint;
  }

  /**
   * Get current planner state
   */
  getState(): PlannerState {
    return this.state;
  }

  /**
   * Update overall confidence score
   */
  private updateConfidenceScore(): void {
    if (this.state.tasks.length === 0) {
      this.state.confidenceScore = 0;
      return;
    }

    const totalConfidence = this.state.tasks
      .filter(t => t.completed)
      .reduce((sum, task) => sum + task.confidence, 0);

    const totalTasks = this.state.tasks.length;
    this.state.confidenceScore = Math.round(totalConfidence / totalTasks);
  }

  /**
   * Build decomposition prompt
   */
  private buildDecompositionPrompt(initialInput: string): string {
    return `You are an expert software architect helping to break down a project description into actionable inference tasks.

## User Input
"${initialInput}"

## Your Task
Break this down into specific inference tasks that can be completed sequentially. Each task should:
1. Have a clear description
2. Be assignable to a category (project, entities, auth, permissions, pages, design)
3. Have a confidence score (0-100) indicating how confidently it can be inferred
4. List dependencies on other tasks (by task number)

Consider:
- What entities (data models) are needed?
- What authentication/authorization is needed?
- What pages/routes are needed?
- What relationships exist between entities?
- What can be inferred with high confidence vs. what needs user input?

Return JSON:
\`\`\`json
{
  "tasks": [
    {
      "description": "Infer core entities from 'blog' context",
      "category": "entities",
      "confidence": 95,
      "dependencies": []
    },
    {
      "description": "Infer User entity fields",
      "category": "entities",
      "confidence": 90,
      "dependencies": [1]
    },
    {
      "description": "Infer authentication requirements",
      "category": "auth",
      "confidence": 85,
      "dependencies": [1]
    }
  ]
}
\`\`\`

Confidence guidelines:
- 95-100%: Extremely certain (e.g., blog → needs Post entity)
- 85-94%: Very confident (e.g., blog → likely needs Comment entity)
- 70-84%: Moderately confident (e.g., auth method could be email or OAuth)
- Below 70%: Too ambiguous, user input needed

Only return JSON, no other text.`;
  }

  // ============================================================================
  // EXISTING METHODS (KEEP AS-IS)
  // ============================================================================

  /**
   * Validate ASL for completeness and correctness
   */
  validate(asl: Partial<ASL>): ASLValidationResult {
    const errors: ASLValidationError[] = [];
    const warnings: ASLValidationWarning[] = [];

    // 1. Check required top-level fields
    if (!asl.version) {
      errors.push({
        path: "version",
        message: "ASL version is required",
        severity: "error",
        fix: 'Set version to "1.0"',
      });
    }

    if (!asl.project) {
      errors.push({
        path: "project",
        message: "Project specification is required",
        severity: "error",
      });
    } else {
      // Validate project fields
      if (!asl.project.name) {
        errors.push({
          path: "project.name",
          message: "Project name is required",
          severity: "error",
        });
      }

      if (!asl.project.framework) {
        errors.push({
          path: "project.framework",
          message: "Framework must be specified",
          severity: "error",
          fix: 'Set framework to "nextjs"',
        });
      }

      if (!asl.project.backend) {
        errors.push({
          path: "project.backend",
          message: "Backend must be specified",
          severity: "error",
          fix: 'Set backend to "instantdb"',
        });
      }
    }

    // 2. Check entities
    if (!asl.entities || Object.keys(asl.entities).length === 0) {
      errors.push({
        path: "entities",
        message: "At least one entity must be defined",
        severity: "error",
      });
    } else {
      // Validate each entity
      Object.entries(asl.entities).forEach(([entityName, entity], idx) => {
        if (!entity.fields || entity.fields.length === 0) {
          errors.push({
            path: `entities.${entityName}.fields`,
            message: `Entity "${entityName}" must have at least one field`,
            severity: "error",
          });
        }

        // Check field types
        entity.fields?.forEach((field, fieldIdx) => {
          if (!field.name) {
            errors.push({
              path: `entities.${entityName}.fields[${fieldIdx}].name`,
              message: "Field name is required",
              severity: "error",
            });
          }

          if (!field.type) {
            errors.push({
              path: `entities.${entityName}.fields[${fieldIdx}].type`,
              message: `Field "${field.name}" must have a type`,
              severity: "error",
            });
          }

          // Warn about missing descriptions
          if (!field.description) {
            warnings.push({
              path: `entities.${entityName}.fields[${fieldIdx}].description`,
              message: `Field "${field.name}" missing description`,
              severity: "warning",
              suggestion: "Add description for better documentation",
            });
          }
        });
      });
    }

    // 3. Check pages
    if (!asl.pages || asl.pages.length === 0) {
      errors.push({
        path: "pages",
        message: "At least one page must be defined",
        severity: "error",
      });
    } else {
      asl.pages.forEach((page, idx) => {
        if (!page.path) {
          errors.push({
            path: `pages[${idx}].path`,
            message: "Page path is required",
            severity: "error",
          });
        }

        if (!page.name) {
          errors.push({
            path: `pages[${idx}].name`,
            message: "Page name (component name) is required",
            severity: "error",
          });
        }

        // Check if page requires auth but no auth is configured
        if (!page.public && !asl.auth) {
          warnings.push({
            path: `pages[${idx}]`,
            message: `Page "${page.path}" requires authentication but no auth is configured`,
            severity: "warning",
            suggestion: "Add auth configuration or mark page as public",
          });
        }
      });
    }

    // 4. Check auth if provided
    if (asl.auth) {
      if (!asl.auth.provider) {
        errors.push({
          path: "auth.provider",
          message: "Auth provider must be specified",
          severity: "error",
        });
      }

      if (!asl.auth.roles || asl.auth.roles.length === 0) {
        warnings.push({
          path: "auth.roles",
          message: "No roles defined",
          severity: "warning",
          suggestion: "Define at least one role (e.g., 'user', 'admin')",
        });
      }
    }

    // 5. Validate entity references in pages
    const refErrors = validateEntityReferences(asl);
    refErrors.forEach(err => {
      const parts = err.split(":");
      errors.push({
        path: parts[0] || "",
        message: parts[1] || err,
        severity: "error",
      });
    });

    // 6. Validate permission references
    const permErrors = validatePermissionReferences(asl);
    permErrors.forEach(err => {
      const parts = err.split(":");
      errors.push({
        path: parts[0] || "",
        message: parts[1] || err,
        severity: "error",
      });
    });

    // 7. Calculate completeness
    const completeness = calculateCompleteness(asl);

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      completeness,
    };
  }

  /**
   * Generate clarifying questions for gaps in ASL
   */
  generateQuestions(asl: Partial<ASL>): Question[] {
    const questions: Question[] = [];
    const missing = getMissingSections(asl);

    // 1. Project questions
    if (!asl.project) {
      questions.push({
        id: "project.name",
        type: "text",
        text: "What is the name of your project?",
        context: "This will be used as the package name and directory name.",
        validation: {
          required: true,
          pattern: "^[a-z][a-z0-9-]*$",
        },
        category: "project",
      });

      questions.push({
        id: "project.description",
        type: "text",
        text: "Describe your project in one sentence:",
        context: "This helps the AI understand your project's purpose.",
        validation: {
          required: true,
          minLength: 10,
        },
        category: "project",
      });
    }

    // 2. Entity questions
    if (!asl.entities || Object.keys(asl.entities).length === 0) {
      questions.push({
        id: "entities.list",
        type: "text",
        text: "What are the main entities (data models) in your app?",
        context: "Examples: User, Post, Comment, Product, Order. Separate with commas.",
        validation: {
          required: true,
        },
        category: "entities",
      });
    } else {
      // For each entity, check if fields are complete
      Object.entries(asl.entities).forEach(([entityName, entity]) => {
        if (!entity.fields || entity.fields.length === 0) {
          questions.push({
            id: `entities.${entityName}.fields`,
            type: "entity-builder",
            text: `What fields should the "${entityName}" entity have?`,
            context: `Define the data structure for ${entityName}. Examples: title (string), price (number), published (boolean).`,
            validation: {
              required: true,
            },
            category: "entities",
          });
        }
      });
    }

    // 3. Auth questions
    if (!asl.auth) {
      questions.push({
        id: "auth.needed",
        type: "boolean",
        text: "Does your app need user authentication?",
        context: "Most apps with user-specific data need authentication.",
        category: "auth",
      });
    } else {
      if (!asl.auth.provider) {
        questions.push({
          id: "auth.provider",
          type: "select",
          text: "Which authentication method do you want to use?",
          options: [
            {
              value: "email",
              label: "Email/Password",
              description: "Traditional email and password authentication",
            },
            {
              value: "magic-link",
              label: "Magic Link",
              description: "Passwordless login via email link",
            },
            {
              value: "oauth-github",
              label: "OAuth (GitHub)",
              description: "Login with GitHub account",
            },
            {
              value: "oauth-google",
              label: "OAuth (Google)",
              description: "Login with Google account",
            },
          ],
          validation: {
            required: true,
          },
          category: "auth",
        });
      }

      if (!asl.auth.roles || asl.auth.roles.length === 0) {
        questions.push({
          id: "auth.roles",
          type: "multi-select",
          text: "What user roles do you need?",
          context: "Roles define different permission levels (e.g., admin can do everything, user can only edit their own content).",
          options: [
            { value: "admin", label: "Admin", description: "Full system access" },
            { value: "user", label: "User", description: "Regular user" },
            { value: "moderator", label: "Moderator", description: "Content moderation" },
            { value: "guest", label: "Guest", description: "Read-only access" },
          ],
          validation: {
            required: true,
          },
          category: "auth",
        });
      }
    }

    // 4. Permission questions
    if (asl.auth && (!asl.permissions || asl.permissions.length === 0)) {
      questions.push({
        id: "permissions.needed",
        type: "boolean",
        text: "Do you need role-based access control (RBAC)?",
        context: "RBAC controls who can create, read, update, or delete specific resources.",
        dependsOn: ["auth.needed"],
        category: "permissions",
      });
    }

    // 5. Page questions
    if (!asl.pages || asl.pages.length === 0) {
      questions.push({
        id: "pages.list",
        type: "text",
        text: "What are the main pages/routes in your app?",
        context: "Examples: Home (/), Posts (/posts), Profile (/profile). Separate with commas.",
        validation: {
          required: true,
        },
        category: "pages",
      });
    } else {
      // Check if pages need more details
      asl.pages.forEach((page, idx) => {
        if (!page.type) {
          questions.push({
            id: `pages[${idx}].type`,
            type: "select",
            text: `What type of page is "${page.path}"?`,
            options: [
              { value: "page", label: "Regular Page" },
              { value: "layout", label: "Layout" },
              { value: "route-group", label: "Route Group" },
            ],
            validation: {
              required: true,
            },
            category: "pages",
          });
        }

        if (page.public === undefined) {
          questions.push({
            id: `pages[${idx}].public`,
            type: "boolean",
            text: `Should "${page.path}" be publicly accessible (no login required)?`,
            category: "pages",
          });
        }
      });
    }

    // 6. Design questions
    if (!asl.design) {
      questions.push({
        id: "design.theme",
        type: "select",
        text: "What theme do you prefer?",
        options: [
          { value: "light", label: "Light", description: "Light color scheme" },
          { value: "dark", label: "Dark", description: "Dark color scheme" },
          { value: "system", label: "System", description: "Follow system preference" },
        ],
        validation: {
          required: false,
        },
        category: "design",
      });
    }

    return questions;
  }

  /**
   * Generate diff preview showing what will be generated
   */
  generateDiff(asl: ASL): DiffPreview {
    const files: FilePreview[] = [];
    const registries: RegistryPreview[] = [];
    const warnings: string[] = [];

    // 1. Schema file
    files.push({
      path: "instant.schema.ts",
      action: "create",
      type: "schema",
      preview: this.generateSchemaPreview(asl),
      size: this.estimateSize(asl.entities),
    });

    // 2. Types file
    files.push({
      path: "src/types/schema.ts",
      action: "create",
      type: "type",
      preview: this.generateTypesPreview(asl),
      size: this.estimateSize(asl.entities) * 2,
    });

    // 3. Page files
    asl.pages.forEach(page => {
      const pagePath = this.pageSpecToPath(page);
      files.push({
        path: pagePath,
        action: "create",
        type: "page",
        preview: `export default function ${page.name}() { ... }`,
        size: 500,
      });
    });

    // 4. Component files (estimate based on entities)
    const componentCount = Object.keys(asl.entities).length * 3; // Card, List, Form per entity
    for (let i = 0; i < componentCount; i++) {
      files.push({
        path: `src/components/.../${i}.tsx`,
        action: "create",
        type: "component",
        size: 300,
      });
    }

    // 5. Action files
    Object.keys(asl.entities).forEach(entityName => {
      files.push({
        path: `src/actions/${entityName.toLowerCase()}.ts`,
        action: "create",
        type: "action",
        preview: `'use server';\n\nexport async function create${entityName}(...) { ... }`,
        size: 800,
      });
    });

    // 6. Auth files (if auth is configured)
    if (asl.auth) {
      files.push(
        {
          path: "src/lib/guards.ts",
          action: "create",
          type: "config",
          preview: "export function withAuthGuard(...) { ... }",
          size: 600,
        },
        {
          path: "src/lib/permissions.ts",
          action: "create",
          type: "config",
          preview: "export function hasPermission(...) { ... }",
          size: 400,
        },
        {
          path: "middleware.ts",
          action: "create",
          type: "config",
          preview: "export function middleware(request: NextRequest) { ... }",
          size: 500,
        }
      );
    }

    // 7. Registry previews
    registries.push({
      type: "components",
      added: Object.keys(asl.entities).flatMap(e => [
        `${e}Card`,
        `${e}List`,
        `${e}Form`,
      ]),
      modified: [],
      removed: [],
    });

    registries.push({
      type: "types",
      added: Object.keys(asl.entities).flatMap(e => [e, `${e}Insert`, `${e}WithRelations`]),
      modified: [],
      removed: [],
    });

    if (asl.permissions) {
      registries.push({
        type: "permissions",
        added: asl.permissions.map(p => `${p.role}:${p.resource}:${(p.actions || []).join(",")}`),
        modified: [],
        removed: [],
      });
    }

    // 8. Warnings
    if (!asl.auth && asl.pages.some(p => !p.public)) {
      warnings.push("Some pages require authentication but no auth is configured");
    }

    // 9. Summary
    const summary: DiffSummary = {
      totalFiles: files.length,
      newFiles: files.length,
      modifiedFiles: 0,
      deletedFiles: 0,
      linesAdded: files.reduce((sum, f) => sum + (f.size || 0) / 50, 0), // Rough estimate
      linesRemoved: 0,
    };

    return {
      summary,
      files,
      registries,
      warnings,
    };
  }

  /**
   * Check if ASL is complete enough for generation
   */
  isComplete(asl: Partial<ASL>): boolean {
    return isASLComplete(asl);
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private generateSchemaPreview(asl: ASL): string {
    const entityNames = Object.keys(asl.entities).slice(0, 2).join(", ");
    const entityCount = Object.keys(asl.entities).length;
    const more = entityCount > 2 ? ` + ${entityCount - 2} more` : "";

    return `import { i } from "@instantdb/core";

const schema = i.schema({
  entities: {
    ${entityNames}${more} ...
  }
});`;
  }

  private generateTypesPreview(asl: ASL): string {
    const firstEntity = Object.keys(asl.entities)[0];
    return `export interface ${firstEntity} {
  id: string;
  ...
}

export type ${firstEntity}Insert = Omit<${firstEntity}, "id">;`;
  }

  private pageSpecToPath(page: PageSpec): string {
    // Convert page spec to Next.js file path
    const basePath = page.path === "/" ? "" : page.path;
    return `src/app${basePath}/page.tsx`;
  }

  private estimateSize(entities: Record<string, EntitySpec>): number {
    // Rough estimate: 100 bytes per field
    let total = 0;
    Object.values(entities).forEach(entity => {
      total += (entity.fields?.length || 0) * 100;
    });
    return total;
  }
}
