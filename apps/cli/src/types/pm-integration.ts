// mycontext PM Integration Types
// Defines the interface between mycontext PM and MyContext CLI

export interface PMAgentProjectInput {
  project: {
    name: string;
    description: string;
    techStack?: string[];
    timeline?: {
      startDate: string;
      endDate: string;
      totalWeeks: number;
    };
    budget?: {
      amount: number;
      currency: string;
    };
  };

  breakdown: {
    epics?: Epic[];
    userStories?: UserStory[];
    tasks?: PMTask[];
    phases?: BuildPhase[];
  };

  myContext: {
    framework: "nextjs" | "react" | "vue" | "angular";
    architecture: "nextjs-app-router" | "nextjs-pages" | "react-spa";
    generateServerActions?: boolean;
    generateRoutes?: boolean;
    withTests?: boolean;
    completeArchitecture?: boolean;
  };

  components?: {
    ui?: ComponentSpec[];
    pages?: PageSpec[];
    api?: ApiSpec[];
  };

  metadata?: {
    generatedBy: string;
    generatedAt: string;
    version: string;
    projectId?: string;
  };
}

// mycontext PM Task Structure
export interface PMTask {
  id: string;
  title: string;
  description?: string;
  status?: "todo" | "in_progress" | "review" | "done" | "blocked" | "cancelled";
  priority?: "critical" | "high" | "medium" | "low";
  estimatedHours?: number;
  actualHours?: number;
  dependencies?: string[];
  blockedBy?: string[];
  relatedComponents?: string[];
  relatedFiles?: string[];
  tags?: string[];
  assignee?: string;
  createdAt?: string;
  updatedAt?: string;
  completedAt?: string;
  dueDate?: string;
  notes?: string;
  acceptanceCriteria?: string[];
}

// mycontext PM Epic Structure
export interface Epic {
  id: string;
  title: string;
  description?: string;
  priority?: "critical" | "high" | "medium" | "low";
  status?: "planned" | "in_progress" | "completed" | "cancelled";
  userStories?: string[]; // User story IDs
  tasks?: string[]; // Task IDs
  estimatedHours?: number;
  createdAt?: string;
  updatedAt?: string;
}

// mycontext PM User Story Structure
export interface UserStory {
  id: string;
  title: string;
  description?: string;
  acceptanceCriteria?: string[];
  priority?: "critical" | "high" | "medium" | "low";
  status?: "planned" | "in_progress" | "completed" | "cancelled";
  epicId?: string;
  tasks?: string[]; // Task IDs
  estimatedHours?: number;
  createdAt?: string;
  updatedAt?: string;
}

// mycontext PM Build Phase Structure
export interface BuildPhase {
  id: string;
  name: string;
  description?: string;
  order: number;
  status?: "planned" | "in_progress" | "completed" | "blocked";
  tasks?: string[]; // Task IDs
  deliverables?: string[];
  estimatedHours?: number;
  actualHours?: number;
  startDate?: string;
  endDate?: string;
  dependencies?: string[]; // Other phase IDs
}

// Component Specifications from mycontext PM
export interface ComponentSpec {
  id: string;
  name: string;
  type: "ui" | "form" | "display" | "layout" | "interactive";
  description?: string;
  props?: ComponentProp[];
  dependencies?: string[];
  priority?: "high" | "medium" | "low";
  acceptanceCriteria?: string[];
  mockupUrl?: string;
  designNotes?: string;
}

export interface PageSpec {
  id: string;
  path: string;
  name: string;
  description?: string;
  components: string[]; // Component IDs
  layout: "full" | "sidebar" | "centered" | "dashboard";
  authRequired?: boolean;
  dataRequirements?: string[];
  acceptanceCriteria?: string[];
}

export interface ApiSpec {
  id: string;
  path: string;
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  name: string;
  description?: string;
  parameters?: ApiParameter[];
  response?: ApiResponse;
  authentication?: boolean;
  rateLimit?: {
    requests: number;
    window: string;
  };
}

// Supporting types
export interface ComponentProp {
  name: string;
  type: string;
  required: boolean;
  description?: string;
  defaultValue?: any;
  validation?: string;
}

export interface ApiParameter {
  name: string;
  type: string;
  required: boolean;
  description?: string;
  location: "path" | "query" | "body" | "header";
  validation?: string;
}

export interface ApiResponse {
  type: string;
  description?: string;
  schema?: any;
  examples?: any[];
}

// mycontext PM Output for Progress Reporting
export interface PMAgentOutput {
  projectId: string;
  timestamp: string;
  status: "success" | "error" | "in_progress";
  progress: {
    completedTasks: number;
    totalTasks: number;
    completionPercentage: number;
    currentPhase?: string;
    nextMilestone?: string;
    blockers?: string[];
  };
  generated: {
    components: string[];
    pages: string[];
    apiEndpoints: string[];
    tests: string[];
  };
  errors?: string[];
  suggestions?: string[];
  nextSteps?: string[];
}

// Progress Sync Types
export interface ProgressSyncRequest {
  projectId: string;
  syncTimestamp: string;
  includeTasks?: boolean;
  includeComponents?: boolean;
  includeMetrics?: boolean;
}

export interface ProgressSyncResponse {
  projectId: string;
  lastSyncTimestamp: string;
  changes: {
    newTasks?: PMTask[];
    updatedTasks?: PMTask[];
    completedTasks?: string[];
    newComponents?: string[];
    metrics: {
      totalTasks: number;
      completedTasks: number;
      completionPercentage: number;
      estimatedHours: number;
      actualHours: number;
    };
  };
  errors?: string[];
}

// mycontext PM Integration Status
export interface PMIntegrationStatus {
  connected: boolean;
  lastSync?: string;
  projectId?: string;
  pendingUpdates?: number;
  errors?: string[];
}

// Webhook Events
export interface WebhookEvent {
  type:
    | "progress_update"
    | "task_completed"
    | "phase_completed"
    | "error"
    | "sync_request";
  projectId: string;
  data: any;
  timestamp: string;
}

// CLI Commands for PM Integration
export interface PMCommandOptions {
  projectId?: string;
  webhookUrl?: string;
  syncInterval?: number;
  verbose?: boolean;
  dryRun?: boolean;
}

// Error types for PM integration
export class PMIntegrationError extends Error {
  constructor(message: string, public code: string, public details?: any) {
    super(message);
    this.name = "PMIntegrationError";
  }
}

export const PMIntegrationErrorCodes = {
  INVALID_PLAN_FORMAT: "INVALID_PLAN_FORMAT",
  PLAN_VALIDATION_FAILED: "PLAN_VALIDATION_FAILED",
  PROJECT_CREATION_FAILED: "PROJECT_CREATION_FAILED",
  WORKFLOW_EXECUTION_FAILED: "WORKFLOW_EXECUTION_FAILED",
  SYNC_FAILED: "SYNC_FAILED",
  INVALID_PROJECT_ID: "INVALID_PROJECT_ID",
} as const;
