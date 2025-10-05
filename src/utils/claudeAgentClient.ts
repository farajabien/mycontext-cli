import {
  query,
  type Options,
  type Query,
  type AgentDefinition,
  createSdkMcpServer,
} from "@anthropic-ai/claude-agent-sdk";
import * as fs from "fs";
import * as path from "path";
import chalk from "chalk";
import {
  AgentAIClient,
  AIClientOptions,
  AgentContext,
  AgentConfiguration,
  GenerationResult,
  WorkflowResult,
  StreamingOptions,
  HookCallback,
  HookEvent,
  CanUseToolCallback,
  SettingSource,
  MCPTool,
} from "../interfaces/AIClient";
import { getAllMCPTools } from "./mcpTools";
import { getAllAgentDefinitions, getAgentDefinition } from "./agentDefinitions";

export interface ClaudeAgentOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  allowedTools?: string[];
  disallowedTools?: string[];
  permissionMode?: "strict" | "permissive";
  contextManagement?: boolean;
  // New SDK options
  agents?: Record<string, AgentDefinition>;
  settingSources?: SettingSource[];
  hooks?: Partial<Record<HookEvent, HookCallback>>;
  canUseTool?: CanUseToolCallback;
  mcpTools?: MCPTool[];
}

export class ClaudeAgentClient implements AgentAIClient {
  // AgentAIClient interface properties
  readonly clientType = "agent-sdk" as const;
  readonly supportsTools = true;
  readonly supportsStreaming = true;
  private queryInstance: Query | null = null;
  private apiKey: string | null = null;
  private baseUrl = "https://api.anthropic.com/v1";
  private workingDirectory: string;
  private options: Options = {};

  // Grok 4 support (only provider not supported by Claude SDK)
  private isGrokMode: boolean = false;
  private grokApiKey: string | null = null;

  // New SDK features
  private registeredAgents: Record<string, AgentDefinition> = {};
  private registeredHooks: Partial<Record<HookEvent, HookCallback>> = {};
  private mcpServer: any = null;
  // private streamingHandler: StreamingHandler | null = null; // DISABLED

  constructor(workingDirectory?: string) {
    this.workingDirectory = workingDirectory || process.cwd();
    this.apiKey = this.loadApiKey();

    // Check if we should use Grok 4 (only provider not supported by Claude SDK)
    this.checkGrokMode();

    // Auto-register built-in agents
    this.registeredAgents = getAllAgentDefinitions();
  }

  hasApiKey(): boolean {
    if (this.isGrokMode) {
      return !!this.grokApiKey;
    }
    return !!this.apiKey;
  }

  /**
   * Check if we should use Grok 4 (only provider not supported by Claude SDK)
   */
  private checkGrokMode(): void {
    const provider = process.env.MYCONTEXT_PROVIDER;

    // Only use Grok mode if explicitly requested (since Claude SDK doesn't support it)
    if (provider === "xai" || provider === "grok") {
      this.isGrokMode = true;
      this.grokApiKey = this.loadGrokApiKey();

      if (this.grokApiKey) {
        console.log(chalk.blue("🤖 Using Grok 4 via X AI API (direct)"));
      }
    } else {
      console.log(
        chalk.blue(
          "🎯 Using Claude Agent SDK (supports Claude, Bedrock, Vertex AI)"
        )
      );
    }
  }

  /**
   * Load Grok API key from environment variables
   */
  private loadGrokApiKey(): string | null {
    const candidates = [
      process.env.MYCONTEXT_XAI_API_KEY,
      process.env.XAI_API_KEY,
    ];

    // Check for API key in environment
    for (const key of candidates) {
      if (key && key.trim()) {
        return key.trim();
      }
    }

    // Load from project-level env files
    return this.loadTokenFromEnvFiles();
  }

  /**
   * Load API key from environment variables and project files
   */
  private loadApiKey(): string | null {
    const candidates = [
      process.env.MYCONTEXT_CLAUDE_API_KEY,
      process.env.ANTHROPIC_API_KEY,
      process.env.CLAUDE_API_KEY,
    ];

    // Check for API key in environment
    for (const key of candidates) {
      if (key && key.trim()) {
        return key.trim();
      }
    }

    // Load from project-level env files
    return this.loadTokenFromEnvFiles();
  }

  /**
   * Load token from project-level env files
   * Priority: .mycontext/.env -> .env
   */
  private loadTokenFromEnvFiles(): string | null {
    try {
      const candidates = [
        path.join(this.workingDirectory, ".mycontext", ".env"),
        path.join(this.workingDirectory, ".env"),
      ];

      for (const file of candidates) {
        if (fs.existsSync(file)) {
          const content = fs.readFileSync(file, "utf8");
          const lines = content.split("\n");

          for (const line of lines) {
            const trimmed = line.trim();
            if (
              trimmed.startsWith("MYCONTEXT_CLAUDE_API_KEY=") ||
              trimmed.startsWith("ANTHROPIC_API_KEY=") ||
              trimmed.startsWith("CLAUDE_API_KEY=")
            ) {
              const keyValue = trimmed.split("=", 2);
              if (keyValue.length === 2) {
                const value = keyValue[1]?.replace(/^["']|["']$/g, "") || ""; // Remove quotes
                if (value && !value.startsWith("$")) {
                  return value;
                }
              }
            }
          }
        }
      }
    } catch (error) {
      // Ignore file read errors
    }
    return null;
  }

  /**
   * Initialize the Claude Agent with configuration
   */
  async initialize(options: ClaudeAgentOptions = {}): Promise<void> {
    if (!this.apiKey) {
      throw new Error(
        "Claude API key not configured. Set MYCONTEXT_CLAUDE_API_KEY or ANTHROPIC_API_KEY"
      );
    }

    try {
      // Create system prompt for MyContext CLI
      const systemPrompt =
        options.systemPrompt || this.getDefaultSystemPrompt();

      // Configure options for the SDK with all new features
      this.options = {
        systemPrompt: {
          type: "preset",
          preset: "claude_code",
          append: systemPrompt,
        },
        model: options.model || "claude-3-5-sonnet-20241022",

        // Tool permissions
        allowedTools: options.allowedTools,
        disallowedTools: options.disallowedTools,
        permissionMode: (options.permissionMode as any) || "default",

        // Agent definitions (use registered + provided)
        agents: {
          ...this.registeredAgents,
          ...(options.agents || {}),
        },

        // Setting sources (default to project-level only for reproducibility)
        settingSources: options.settingSources || ["project", "local"],

        // Hooks
        hooks: options.hooks ? this.convertHooks(options.hooks) : undefined,

        // Permission callback
        canUseTool: options.canUseTool
          ? this.wrapCanUseTool(options.canUseTool)
          : undefined,
      };

      // Register hooks if provided
      if (options.hooks) {
        this.registeredHooks = options.hooks;
      }

      // Setup MCP server with custom tools if provided
      if (options.mcpTools || getAllMCPTools().length > 0) {
        await this.setupMCPServer(options.mcpTools);
      }

      console.log(chalk.green("✅ Claude Agent SDK initialized successfully"));

      // Log enabled features
      if (Object.keys(this.options.agents || {}).length > 0) {
        console.log(
          chalk.gray(
            `   📦 Agents: ${
              Object.keys(this.options.agents || {}).length
            } registered`
          )
        );
      }
      if (this.mcpServer) {
        console.log(
          chalk.gray(
            `   🔧 MCP Tools: ${
              (options.mcpTools || getAllMCPTools()).length
            } available`
          )
        );
      }
      if (options.hooks && Object.keys(options.hooks).length > 0) {
        console.log(
          chalk.gray(
            `   🪝 Hooks: ${Object.keys(options.hooks).length} registered`
          )
        );
      }
    } catch (error: any) {
      throw new Error(`Failed to initialize Claude Agent: ${error.message}`);
    }
  }

  /**
   * Setup MCP server with custom tools
   */
  private async setupMCPServer(customTools?: MCPTool[]): Promise<void> {
    try {
      const tools = customTools || getAllMCPTools();

      if (tools.length > 0) {
        this.mcpServer = createSdkMcpServer({
          name: "mycontext-tools",
          version: "1.0.0",
          tools: tools as any, // MCP tools are already in SDK format
        });

        console.log(
          chalk.gray(`   🔧 MCP Server created with ${tools.length} tools`)
        );
      }
    } catch (error: any) {
      console.log(
        chalk.yellow(`   ⚠️  MCP Server setup failed: ${error.message}`)
      );
    }
  }

  /**
   * Convert our hook format to SDK hook format
   */
  private convertHooks(hooks: Partial<Record<HookEvent, HookCallback>>): any {
    const sdkHooks: any = {};

    for (const [event, callback] of Object.entries(hooks)) {
      sdkHooks[event] = async (
        input: any,
        toolUseID: string | undefined,
        options: any
      ) => {
        const result = await callback(input, toolUseID, options);
        return result;
      };
    }

    return sdkHooks;
  }

  /**
   * Wrap our CanUseTool callback for SDK compatibility
   */
  private wrapCanUseTool(callback: CanUseToolCallback): any {
    return async (
      toolName: string,
      input: Record<string, unknown>,
      options: any
    ) => {
      const result = await callback(toolName, input, options);

      // Convert our format to SDK format
      if (result.behavior === "allow") {
        return {
          behavior: "allow" as const,
          updatedInput: result.updatedInput || input,
        };
      } else {
        return {
          behavior: "deny" as const,
          message: result.message || "Permission denied",
          interrupt: result.interrupt,
        };
      }
    };
  }

  /**
   * Check connection to Claude API
   */
  async checkConnection(): Promise<boolean> {
    if (!this.apiKey) return false;

    try {
      if (!this.queryInstance) {
        await this.initialize();
      }

      // Test with a simple request
      this.queryInstance = query({
        prompt: "ping",
        options: this.options,
      });

      // Check if query was created successfully
      return !!this.queryInstance;
    } catch (error) {
      console.log(`[ClaudeAgentClient] Connection check failed: ${error}`);
      return false;
    }
  }

  /**
   * Generate text using Claude Agent SDK or direct provider APIs
   */
  async generateText(
    prompt: string,
    options: ClaudeAgentOptions = {}
  ): Promise<string> {
    // If using Grok directly, use X AI API
    if (this.isGrokMode && this.grokApiKey) {
      return this.generateWithGrok(prompt, options);
    }

    // For Claude, Bedrock, and Vertex AI, use Claude Agent SDK
    // The SDK automatically handles routing based on environment variables
    if (!this.queryInstance) {
      await this.initialize(options);
    }

    try {
      this.queryInstance = query({
        prompt,
        options: this.options,
      });

      // Get the response from the query
      let response = "";
      for await (const message of this.queryInstance) {
        if (message.type === "assistant") {
          response += message.message.content[0]?.text || "";
        }
      }

      return response;
    } catch (error: any) {
      throw new Error(`Claude Agent generation failed: ${error.message}`);
    }
  }

  /**
   * Generate text using Grok 4 via X AI API
   */
  private async generateWithGrok(
    prompt: string,
    options: ClaudeAgentOptions = {}
  ): Promise<string> {
    if (!this.grokApiKey) {
      throw new Error("Grok API key not found");
    }

    const model = options.model || process.env.MYCONTEXT_MODEL || "grok-beta";

    try {
      const response = await fetch(`https://api.x.ai/v1/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.grokApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: model,
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: options.temperature || 0.7,
          max_tokens: options.maxTokens || 4000,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          `Grok API error: ${response.status} - ${
            errorData.error?.message || response.statusText
          }`
        );
      }

      const data = await response.json();
      return data.choices[0]?.message?.content || "";
    } catch (error: any) {
      throw new Error(`Grok generation failed: ${error.message}`);
    }
  }

  /**
   * Generate React component with enhanced context
   */
  async generateComponent(
    prompt: string,
    context: AgentContext = {},
    options: ClaudeAgentOptions = {}
  ): Promise<string> {
    if (!this.queryInstance) {
      await this.initialize(options);
    }

    // Build comprehensive context for component generation
    const contextPrompt = this.buildComponentContextPrompt(prompt, context);

    try {
      this.queryInstance = query({
        prompt: contextPrompt,
        options: this.options,
      });

      // Get the response from the query
      let response = "";
      for await (const message of this.queryInstance) {
        if (message.type === "assistant") {
          response += message.message.content[0]?.text || "";
        }
      }

      return response;
    } catch (error: any) {
      throw new Error(`Component generation failed: ${error.message}`);
    }
  }

  /**
   * Refine existing component with Claude Agent SDK
   */
  async generateComponentRefinement(
    componentCode: string,
    prompt: string,
    context: AgentContext = {},
    options: ClaudeAgentOptions = {}
  ): Promise<string> {
    if (!this.queryInstance) {
      await this.initialize(options);
    }

    const refinementPrompt = this.buildRefinementPrompt(
      componentCode,
      prompt,
      context
    );

    try {
      this.queryInstance = query({
        prompt: refinementPrompt,
        options: this.options,
      });

      // Get the response from the query
      let response = "";
      for await (const message of this.queryInstance) {
        if (message.type === "assistant") {
          response += message.message.content[0]?.text || "";
        }
      }

      return response;
    } catch (error: any) {
      throw new Error(`Component refinement failed: ${error.message}`);
    }
  }

  /**
   * Run agent workflow with context management
   */
  async runAgentWorkflow(
    workflowPrompt: string,
    context: AgentContext = {},
    options: ClaudeAgentOptions = {}
  ): Promise<{ content: string; context: AgentContext }> {
    if (!this.queryInstance) {
      await this.initialize(options);
    }

    // Build workflow context
    const workflowContextPrompt = this.buildWorkflowContextPrompt(
      workflowPrompt,
      context
    );

    try {
      this.queryInstance = query({
        prompt: workflowContextPrompt,
        options: this.options,
      });

      // Get the response from the query
      let response = "";
      for await (const message of this.queryInstance) {
        if (message.type === "assistant") {
          response += message.message.content[0]?.text || "";
        }
      }

      // Update context with new information
      const updatedContext = this.updateContextFromResponse(context, response);

      return {
        content: response,
        context: updatedContext,
      };
    } catch (error: any) {
      throw new Error(`Agent workflow failed: ${error.message}`);
    }
  }

  /**
   * Get available models
   */
  async listModels(): Promise<string[]> {
    if (this.isGrokMode) {
      // Return Grok models
      return ["grok-beta", "grok-2-1212", "grok-2-vision-1212"];
    }

    // Claude Agent SDK doesn't expose model listing directly
    // Return common Claude models
    return [
      "claude-3-5-sonnet-20241022",
      "claude-3-5-haiku-20241022",
      "claude-3-opus-20240229",
      "claude-3-sonnet-20240229",
      "claude-3-haiku-20240307",
    ];
  }

  /**
   * Set API key
   */
  setApiKey(apiKey: string): void {
    this.apiKey = apiKey;
    this.queryInstance = null; // Reset query instance to reinitialize with new key
  }

  /**
   * Get default system prompt for MyContext CLI
   */
  private getDefaultSystemPrompt(): string {
    return `You are an expert AI assistant specialized in React/Next.js development and component generation. You work with the MyContext CLI to help developers build production-ready applications.

Your expertise includes:
- React/TypeScript component development
- Next.js App Router patterns
- Shadcn UI component integration
- Tailwind CSS styling
- Component architecture and best practices
- Code optimization and performance
- Accessibility and responsive design

When generating components:
1. Always use TypeScript with proper interfaces
2. Follow Next.js App Router conventions
3. Use Shadcn UI components when appropriate
4. Include proper error handling and loading states
5. Add comprehensive comments for external dependencies
6. Ensure mobile-first responsive design
7. Follow accessibility best practices

Provide clean, production-ready code that follows modern React patterns.`;
  }

  /**
   * Build comprehensive context prompt for component generation
   */
  private buildComponentContextPrompt(
    prompt: string,
    context: AgentContext
  ): string {
    let contextPrompt = `Generate a production-ready React component based on the following requirements:\n\n${prompt}\n\n`;

    if (context.prd) {
      contextPrompt += `\n## Project Requirements Document:\n${context.prd}\n`;
    }

    if (context.types) {
      contextPrompt += `\n## TypeScript Types:\n${context.types}\n`;
    }

    if (context.brand) {
      contextPrompt += `\n## Branding Guidelines:\n${context.brand}\n`;
    }

    if (context.componentList) {
      contextPrompt += `\n## Available Components:\n${JSON.stringify(
        context.componentList,
        null,
        2
      )}\n`;
    }

    if (context.projectStructure) {
      contextPrompt += `\n## Project Structure:\n${context.projectStructure}\n`;
    }

    contextPrompt += `\nPlease provide:
1. Complete component code in a \`\`\`tsx code block
2. Brief explanation of the implementation
3. Any external dependencies that need to be created
4. Usage examples if applicable`;

    return contextPrompt;
  }

  /**
   * Build refinement prompt
   */
  private buildRefinementPrompt(
    componentCode: string,
    prompt: string,
    context: AgentContext
  ): string {
    let refinementPrompt = `Refine the following React component based on the requirements:\n\n${prompt}\n\n`;

    refinementPrompt += `\n## Current Component:\n\`\`\`tsx\n${componentCode}\n\`\`\`\n`;

    if (context.prd) {
      refinementPrompt += `\n## Project Context:\n${context.prd}\n`;
    }

    refinementPrompt += `\nPlease provide:
1. Complete refactored component code in a \`\`\`tsx code block
2. Brief explanation of the changes made
3. Any new dependencies or considerations`;

    return refinementPrompt;
  }

  /**
   * Build workflow context prompt
   */
  private buildWorkflowContextPrompt(
    prompt: string,
    context: AgentContext
  ): string {
    let workflowPrompt = `Execute the following workflow:\n\n${prompt}\n\n`;

    if (context.prd) {
      workflowPrompt += `\n## Project Requirements:\n${context.prd}\n`;
    }

    if (context.previousOutputs) {
      workflowPrompt += `\n## Previous Workflow Outputs:\n${JSON.stringify(
        context.previousOutputs,
        null,
        2
      )}\n`;
    }

    if (context.projectStructure) {
      workflowPrompt += `\n## Project Structure:\n${context.projectStructure}\n`;
    }

    workflowPrompt += `\nPlease provide a comprehensive response that addresses the workflow requirements.`;

    return workflowPrompt;
  }

  /**
   * Update context from agent response
   */
  private updateContextFromResponse(
    currentContext: AgentContext,
    response: string
  ): AgentContext {
    // Extract any new context information from the response
    // This is a basic implementation - could be enhanced with more sophisticated parsing
    const updatedContext = { ...currentContext };

    // Look for generated code blocks that might contain new types or components
    const codeBlockRegex =
      /```(?:tsx?|typescript|javascript|jsx)\n([\s\S]*?)\n```/g;
    const codeBlocks = response.match(codeBlockRegex);

    if (codeBlocks && codeBlocks.length > 0) {
      // Store the latest generated code for potential future reference
      updatedContext.previousOutputs = {
        ...updatedContext.previousOutputs,
        lastGeneratedCode: codeBlocks[codeBlocks.length - 1],
        timestamp: new Date().toISOString(),
      };
    }

    return updatedContext;
  }

  /**
   * Generate with specific tools enabled
   */
  async generateWithTools(
    prompt: string,
    tools: string[],
    context?: AgentContext,
    options?: AIClientOptions
  ): Promise<GenerationResult> {
    if (!this.queryInstance) {
      await this.initialize({
        ...options,
        allowedTools: tools,
      });
    }

    const contextPrompt = this.buildComponentContextPrompt(
      prompt,
      context || {}
    );
    const startTime = Date.now();

    try {
      this.queryInstance = query({
        prompt: contextPrompt,
        options: {
          ...this.options,
          allowedTools: tools,
        },
      });

      let response = "";
      const toolsUsed: string[] = [];

      for await (const message of this.queryInstance) {
        if (message.type === "assistant") {
          response += message.message.content[0]?.text || "";
        }
        // Track tool usage if available
        if (message.type === "assistant" && message.message.content) {
          for (const content of message.message.content) {
            if ((content as any).type === "tool_use") {
              toolsUsed.push((content as any).name);
            }
          }
        }
      }

      return {
        content: response,
        toolsUsed: [...new Set(toolsUsed)],
        duration: Date.now() - startTime,
        context: this.updateContextFromResponse(context || {}, response),
      };
    } catch (error: any) {
      throw new Error(`Tool-based generation failed: ${error.message}`);
    }
  }

  /**
   * Generate with streaming progress (using StreamingHandler)
   */
  async generateStream(
    prompt: string,
    streamOptions: StreamingOptions,
    context?: AgentContext,
    options?: AIClientOptions
  ): Promise<GenerationResult> {
    if (!this.queryInstance) {
      await this.initialize(options);
    }

    const contextPrompt = this.buildComponentContextPrompt(
      prompt,
      context || {}
    );

    try {
      this.queryInstance = query({
        prompt: contextPrompt,
        options: this.options,
      });

      // Use StreamingHandler for better progress tracking - DISABLED
      // const { content, stats } = await streamWithProgress(this.queryInstance, {
      //   showProgress: true,
      //   showTokens: true,
      //   showToolUsage: true,
      //   onProgress: streamOptions.onProgress,
      //   onToken: streamOptions.onToken,
      //   onToolUse: streamOptions.onToolUse,
      //   onError: streamOptions.onError,
      // });

      // DISABLED: Return mock data
      return {
        content: "Streaming disabled",
        toolsUsed: [],
        duration: 0,
        usage: {
          inputTokens: 0,
          outputTokens: 0,
          totalTokens: 0,
        },
        context: this.updateContextFromResponse(
          context || {},
          "Streaming disabled"
        ),
      };
    } catch (error: any) {
      if (streamOptions.onError) {
        streamOptions.onError(error);
      }
      throw new Error(`Streaming generation failed: ${error.message}`);
    }
  }

  /**
   * Run agent workflow with enhanced context management
   */
  async runWorkflow(
    workflowPrompt: string,
    context?: AgentContext,
    options?: AIClientOptions
  ): Promise<WorkflowResult> {
    const result = await this.runAgentWorkflow(
      workflowPrompt,
      context,
      options
    );

    // Transform to WorkflowResult format
    return {
      success: true,
      content: result.content,
      steps: ["workflow-execution"],
      context: result.context,
    };
  }

  /**
   * Configure agent with specific settings
   */
  async configureAgent(config: AgentConfiguration): Promise<void> {
    const agentOptions: ClaudeAgentOptions = {
      model:
        config.model === "inherit"
          ? undefined
          : `claude-3-${config.model}-20241022`,
      systemPrompt: config.systemPrompt,
      allowedTools: config.allowedTools,
      disallowedTools: config.disallowedTools,
      permissionMode: config.permissionMode as any,
    };

    await this.initialize(agentOptions);

    console.log(chalk.green(`✅ Agent configured: ${config.name}`));
    console.log(chalk.gray(`   Description: ${config.description}`));
    if (config.tools) {
      console.log(chalk.gray(`   Tools: ${config.tools.join(", ")}`));
    }
  }

  /**
   * Request permission for an operation (placeholder for future implementation)
   */
  async requestPermission(operation: string, target: string): Promise<boolean> {
    // For now, return true as permissions are handled by the SDK
    // In future, could add interactive prompts here
    console.log(
      chalk.yellow(`⚠️  Requesting permission: ${operation} on ${target}`)
    );
    return true;
  }

  /**
   * Use a specific agent for generation
   */
  async useAgent(
    agentName: string,
    prompt: string,
    context?: AgentContext,
    options?: AIClientOptions
  ): Promise<GenerationResult> {
    const agent =
      this.registeredAgents[agentName] || getAgentDefinition(agentName);

    if (!agent) {
      throw new Error(`Agent '${agentName}' not found`);
    }

    console.log(chalk.blue(`🤖 Using agent: ${agentName}`));
    console.log(chalk.gray(`   ${agent.description}`));

    // Initialize with agent-specific settings
    await this.initialize({
      ...options,
      agents: { [agentName]: agent },
      allowedTools: agent.tools,
    });

    // Use the agent
    const contextPrompt = `@${agentName}\n\n${prompt}`;

    return await this.generateWithTools(
      contextPrompt,
      agent.tools || [],
      context,
      options
    );
  }

  /**
   * Register a custom agent
   */
  registerAgent(name: string, agent: AgentDefinition): void {
    this.registeredAgents[name] = agent;
    console.log(chalk.green(`✅ Agent registered: ${name}`));
  }

  /**
   * Register a hook
   */
  registerHook(event: HookEvent, callback: HookCallback): void {
    this.registeredHooks[event] = callback;
    console.log(chalk.green(`✅ Hook registered: ${event}`));
  }

  /**
   * Get list of available agents
   */
  getAvailableAgents(): string[] {
    return Object.keys(this.registeredAgents);
  }

  /**
   * Get agent info
   */
  getAgentInfo(name: string): AgentDefinition | undefined {
    return this.registeredAgents[name];
  }

  /**
   * Enable/disable specific tools
   */
  setToolPermissions(allowed?: string[], disallowed?: string[]): void {
    this.options.allowedTools = allowed;
    this.options.disallowedTools = disallowed;

    console.log(chalk.blue("🔧 Tool permissions updated"));
    if (allowed) {
      console.log(chalk.gray(`   Allowed: ${allowed.join(", ")}`));
    }
    if (disallowed) {
      console.log(chalk.gray(`   Disallowed: ${disallowed.join(", ")}`));
    }
  }

  /**
   * Get MCP server instance
   */
  getMCPServer(): any {
    return this.mcpServer;
  }

  /**
   * Check if agent is available
   */
  hasAgent(name: string): boolean {
    return name in this.registeredAgents;
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    if (this.queryInstance) {
      // Claude Agent SDK cleanup if needed
      this.queryInstance = null;
    }

    // DISABLED: streamingHandler is not available
    // if (this.streamingHandler) {
    //   this.streamingHandler.stop();
    //   this.streamingHandler = null;
    // }

    if (this.mcpServer) {
      // MCP server cleanup if needed
      this.mcpServer = null;
    }
  }
}
