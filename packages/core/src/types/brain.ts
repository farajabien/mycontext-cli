
export type BrainRole = "orchestrator" | "planner" | "builder" | "reviewer" | "user";

export interface BrainTokenUsage {
  totalInputTokens: number;
  totalOutputTokens: number;
  totalTokens: number;
  totalCostUSD: number;
  callCount: number;
  byAgent: Record<string, {
    calls: number;
    inputTokens: number;
    outputTokens: number;
    costUSD: number;
  }>;
  byProvider: Record<string, {
    calls: number;
    inputTokens: number;
    outputTokens: number;
    costUSD: number;
  }>;
}

export interface BrainUpdate {
  id: string;
  timestamp: number;
  agent: string;
  role: BrainRole;
  message: string;
  type: "thought" | "action" | "error" | "completion" | "feedback";
  metadata?: Record<string, any>;
}

export interface BrainTask {
  id: string;
  title: string;
  description: string;
  status: "pending" | "in-progress" | "completed" | "failed";
  assignedTo: string; // agent name
  priority: "low" | "medium" | "high";
  dependencies?: string[]; // IDs of other tasks
  subTasks?: BrainTask[]; // Recursive decomposition
  parentId?: string; // Pointer to parent task
  created: number;
  updated: number;
}

export interface BrainArtifacts {
  prd?: {
    path: string;
    content: string;
    version: number;
    lastUpdated: number;
  };
  code?: {
    path: string;
    content: string;
    version: number;
    lastUpdated: number;
  };
  [key: string]: any;
}

export type BrainStatus = "idle" | "thinking" | "implementing" | "verifying" | "paused" | "user_input" | "error";

export interface Brain {
  version: string;
  narrative: string; // The high-level goal/story currently being pursued
  status: BrainStatus;
  checkpoints: string[]; // List of significant milestones achieved
  updates: BrainUpdate[];
  tasks: BrainTask[];
  artifacts: BrainArtifacts;
  memory: Record<string, any>; // Shared memory for agents to store loose facts
  usage?: BrainTokenUsage; // Cumulative LLM token usage across all agents
  registry: {
    components: Array<{
      name: string;
      description: string;
      path: string;
      dependencies?: string[];
    }>;
  };
}

export const INITIAL_BRAIN_STATE: Brain = {
  version: "1.0.0",
  narrative: "Waiting for a new challenge...",
  status: "idle",
  checkpoints: [],
  updates: [],
  tasks: [],
  artifacts: {},
  memory: {},
  registry: {
    components: [],
  },
};
