/**
 * AIClient Interface
 *
 * Unified interface for all AI client implementations in MyContext CLI.
 * Supports both simple API calls and complex agentic workflows.
 */

export type OperationComplexity = 'simple' | 'moderate' | 'complex';

export interface AIClientOptions {
  model?: string;
  modelCandidates?: string[];
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  workingDirectory?: string;
}

export interface AgentContext {
  prd?: string;
  types?: string;
  brand?: string;
  componentList?: any;
  projectStructure?: string;
  previousOutputs?: Record<string, any>;
  userPrompt?: string;
  workingDirectory?: string;
}

export interface StreamingOptions {
  onProgress?: (message: string) => void;
  onToken?: (token: string) => void;
  onToolUse?: (tool: string, input: any) => void;
  onError?: (error: Error) => void;
}

export interface GenerationResult {
  content: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
  toolsUsed?: string[];
  duration?: number;
  context?: AgentContext;
}

export interface WorkflowResult {
  success: boolean;
  content: string;
  steps: string[];
  errors?: string[];
  context?: AgentContext;
  duration?: number;
}

/**
 * Base interface that all AI clients must implement
 */
export interface AIClient {
  // Client identification
  readonly clientType: 'direct-api' | 'agent-sdk' | 'hybrid';
  readonly supportsTools: boolean;
  readonly supportsStreaming: boolean;

  // Connection management
  hasApiKey(): boolean;
  checkConnection(): Promise<boolean>;
  setApiKey(apiKey: string): void;

  // Basic text generation
  generateText(
    prompt: string,
    options?: AIClientOptions
  ): Promise<string>;

  // Component-specific generation
  generateComponent(
    prompt: string,
    context?: AgentContext,
    options?: AIClientOptions
  ): Promise<string>;

  // Component refinement
  generateComponentRefinement(
    componentCode: string,
    prompt: string,
    context?: AgentContext,
    options?: AIClientOptions
  ): Promise<string>;

  // Model management
  listModels(): Promise<string[]>;

  // Cleanup
  cleanup?(): Promise<void>;
}

/**
 * Extended interface for Agent SDK clients with advanced capabilities
 */
export interface AgentAIClient extends AIClient {
  clientType: 'agent-sdk' | 'hybrid';
  supportsTools: true;

  // Advanced agent operations
  generateWithTools(
    prompt: string,
    tools: string[],
    context?: AgentContext,
    options?: AIClientOptions
  ): Promise<GenerationResult>;

  // Streaming generation
  generateStream(
    prompt: string,
    streamOptions: StreamingOptions,
    context?: AgentContext,
    options?: AIClientOptions
  ): Promise<GenerationResult>;

  // Workflow orchestration
  runWorkflow(
    workflowPrompt: string,
    context?: AgentContext,
    options?: AIClientOptions
  ): Promise<WorkflowResult>;

  // Agent configuration
  configureAgent(config: AgentConfiguration): Promise<void>;

  // Permission management
  requestPermission(operation: string, target: string): Promise<boolean>;

  // NEW: Use specific agent
  useAgent(
    agentName: string,
    prompt: string,
    context?: AgentContext,
    options?: AIClientOptions
  ): Promise<GenerationResult>;

  // NEW: Get available agents
  getAvailableAgents(): string[];
}

export interface AgentConfiguration {
  name: string;
  description: string;
  tools?: string[];
  systemPrompt?: string;
  model?: 'sonnet' | 'opus' | 'haiku' | 'inherit';
  permissionMode?: 'strict' | 'permissive' | 'default';
  allowedTools?: string[];
  disallowedTools?: string[];
}

/**
 * MCP Tool definition (from @anthropic-ai/claude-agent-sdk)
 */
export interface MCPTool {
  name: string;
  description: string;
  inputSchema: any; // Zod schema
  handler: (args: any, extra?: any) => Promise<MCPToolResult>;
}

export interface MCPToolResult {
  content: Array<{ type: 'text'; text: string }>;
  isError?: boolean;
}

/**
 * Hook callback types (from SDK)
 */
export type HookEvent =
  | 'PreToolUse'
  | 'PostToolUse'
  | 'Notification'
  | 'UserPromptSubmit'
  | 'SessionStart'
  | 'SessionEnd'
  | 'Stop'
  | 'SubagentStop'
  | 'PreCompact';

export interface BaseHookInput {
  session_id: string;
  transcript_path: string;
  cwd: string;
  permission_mode?: string;
}

export interface PreToolUseHookInput extends BaseHookInput {
  hook_event_name: 'PreToolUse';
  tool_name: string;
  tool_input: unknown;
}

export interface PostToolUseHookInput extends BaseHookInput {
  hook_event_name: 'PostToolUse';
  tool_name: string;
  tool_input: unknown;
  tool_response: unknown;
}

export type HookInput = PreToolUseHookInput | PostToolUseHookInput | BaseHookInput;

export interface HookOutput {
  continue?: boolean;
  suppressOutput?: boolean;
  stopReason?: string;
  decision?: 'approve' | 'block';
}

export type HookCallback = (
  input: HookInput,
  toolUseID: string | undefined,
  options: { signal: AbortSignal }
) => Promise<HookOutput>;

/**
 * Permission system types
 */
export type PermissionBehavior = 'allow' | 'deny' | 'ask';

export interface PermissionResult {
  behavior: PermissionBehavior;
  updatedInput?: Record<string, unknown>;
  message?: string;
  interrupt?: boolean;
}

export type CanUseToolCallback = (
  toolName: string,
  input: Record<string, unknown>,
  options: {
    signal: AbortSignal;
    suggestions?: any[];
  }
) => Promise<PermissionResult>;

/**
 * Setting sources (from SDK)
 */
export type SettingSource = 'user' | 'project' | 'local';

/**
 * Operation metadata to help router decide which client to use
 */
export interface OperationMetadata {
  complexity: OperationComplexity;
  requiresTools: boolean;
  requiresStreaming: boolean;
  requiresMultiStep: boolean;
  requiresFileAccess: boolean;
  requiresValidation: boolean;
  estimatedTokens?: number;
  timeoutMs?: number;
}

/**
 * Factory configuration for creating AI clients
 */
export interface AIClientFactoryConfig {
  preferredClient?: 'direct-api' | 'agent-sdk' | 'auto';
  fallbackEnabled?: boolean;
  autoSelectByComplexity?: boolean;
  defaultModel?: string;
  defaultTemperature?: number;
  defaultMaxTokens?: number;
  workingDirectory?: string;
}

/**
 * Error types specific to AI operations
 */
export class AIClientError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly recoverable: boolean = false
  ) {
    super(message);
    this.name = 'AIClientError';
  }
}

export class PermissionDeniedError extends AIClientError {
  constructor(operation: string, target: string) {
    super(
      `Permission denied for operation '${operation}' on '${target}'`,
      'PERMISSION_DENIED',
      true
    );
  }
}

export class ToolExecutionError extends AIClientError {
  constructor(tool: string, message: string) {
    super(
      `Tool '${tool}' execution failed: ${message}`,
      'TOOL_EXECUTION_FAILED',
      true
    );
  }
}

export class ContextOverflowError extends AIClientError {
  constructor(currentTokens: number, maxTokens: number) {
    super(
      `Context overflow: ${currentTokens} tokens exceeds maximum ${maxTokens}`,
      'CONTEXT_OVERFLOW',
      true
    );
  }
}
