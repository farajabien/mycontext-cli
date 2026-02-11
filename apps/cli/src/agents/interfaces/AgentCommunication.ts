export interface AgentMessage {
  id: string;
  from: string;
  to: string;
  type: "context" | "feedback" | "request" | "completion" | "error";
  payload: any;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface AgentIntent {
  action: "generate" | "validate" | "refine" | "complete" | "skip";
  target?: string;
  reason?: string;
  confidence: number; // 0-1
  nextSteps?: string[];
}

export interface AgentContext {
  prd?: string;
  types?: string;
  brand?: string;
  componentList?: any;
  projectStructure?: string;
  previousOutputs?: Record<string, any>;
  userPrompt?: string;
}

export interface AgentFeedback {
  score: number; // 0-100
  issues: Array<{
    type: "error" | "warning" | "suggestion";
    message: string;
    fix?: string;
  }>;
  recommendations: string[];
  shouldRetry: boolean;
  nextAgent?: string;
}

export interface AgentCommunicationHandler {
  sendMessage(message: AgentMessage): Promise<void>;
  receiveMessage(agentName: string): Promise<AgentMessage | null>;
  broadcastMessage(message: Omit<AgentMessage, "to">): Promise<void>;
  getMessageHistory(agentName?: string): Promise<AgentMessage[]>;
  clearHistory(): Promise<void>;
}

export interface IntentResolver {
  analyzeOutput(output: any, context: AgentContext): Promise<AgentIntent>;
  shouldTriggerNextAgent(
    intent: AgentIntent,
    context: AgentContext
  ): Promise<boolean>;
  getNextAgent(
    intent: AgentIntent,
    context: AgentContext
  ): Promise<string | null>;
  createStarterPrompt(
    intent: AgentIntent,
    context: AgentContext
  ): Promise<string>;
}

// Agent communication patterns
export enum CommunicationPattern {
  SEQUENTIAL = "sequential", // A -> B -> C
  PARALLEL = "parallel", // A + B + C simultaneously
  FEEDBACK_LOOP = "feedback", // A -> B -> feedback to A -> retry
  VALIDATION_CHAIN = "validation", // A -> QA -> B -> QA -> C
  AUTO_ORCHESTRATION = "auto", // AI decides flow
}

export interface WorkflowConfig {
  pattern: CommunicationPattern;
  agents: string[];
  retryLimit: number;
  qualityThreshold: number;
  timeoutMs: number;
  enableAutoTransition: boolean;
}
