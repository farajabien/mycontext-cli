
export type BrainRole = "orchestrator" | "planner" | "builder" | "reviewer" | "user";

export interface BrainUpdate {
  id: string;
  timestamp: number;
  agent: string;
  role: BrainRole;
  message: string;
  type: "thought" | "action" | "error" | "completion";
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

export interface Brain {
  version: string;
  narrative: string; // The high-level goal/story currently being pursued
  status: "idle" | "thinking" | "implementing" | "verifying" | "paused";
  checkpoints: string[]; // List of significant milestones achieved
  updates: BrainUpdate[];
  tasks: BrainTask[];
  artifacts: BrainArtifacts;
  memory: Record<string, any>; // Shared memory for agents to store loose facts
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
};
