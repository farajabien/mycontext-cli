/**
 * AI Client Router
 *
 * Intelligent routing layer that decides which AI client to use based on
 * operation characteristics, context, and system state.
 */

import {
  AIClient,
  AgentAIClient,
  OperationMetadata,
  OperationComplexity,
  AIClientError,
  AgentContext,
  AIClientOptions,
} from '../interfaces/AIClient';
import { AIClientFactory } from './aiClientFactory';
import chalk from 'chalk';

/**
 * Router that intelligently selects the appropriate AI client for operations
 */
export class AIClientRouter {
  private factory: AIClientFactory;
  private operationHistory: Map<string, OperationMetadata> = new Map();
  private performanceMetrics: Map<string, PerformanceMetric[]> = new Map();

  constructor(factory?: AIClientFactory) {
    this.factory = factory || AIClientFactory.getInstance();
  }

  /**
   * Route a simple text generation request
   */
  async generateText(
    prompt: string,
    options?: AIClientOptions
  ): Promise<string> {
    const metadata = this.analyzeOperation({
      prompt,
      operationType: 'text-generation',
    });

    const client = await this.selectClient(metadata);
    const startTime = Date.now();

    try {
      const result = await client.generateText(prompt, options);
      this.recordPerformance('text-generation', Date.now() - startTime, true);
      return result;
    } catch (error: any) {
      this.recordPerformance('text-generation', Date.now() - startTime, false);
      throw this.handleError(error, metadata);
    }
  }

  /**
   * Route a component generation request
   */
  async generateComponent(
    prompt: string,
    context?: AgentContext,
    options?: AIClientOptions
  ): Promise<string> {
    const metadata = this.analyzeOperation({
      prompt,
      context,
      operationType: 'component-generation',
    });

    const client = await this.selectClient(metadata);
    const startTime = Date.now();

    try {
      const result = await client.generateComponent(prompt, context, options);
      this.recordPerformance('component-generation', Date.now() - startTime, true);
      return result;
    } catch (error: any) {
      this.recordPerformance('component-generation', Date.now() - startTime, false);
      throw this.handleError(error, metadata);
    }
  }

  /**
   * Route a component refinement request
   */
  async refineComponent(
    componentCode: string,
    prompt: string,
    context?: AgentContext,
    options?: AIClientOptions
  ): Promise<string> {
    const metadata = this.analyzeOperation({
      prompt,
      context,
      componentCode,
      operationType: 'component-refinement',
    });

    const client = await this.selectClient(metadata);
    const startTime = Date.now();

    try {
      const result = await client.generateComponentRefinement(
        componentCode,
        prompt,
        context,
        options
      );
      this.recordPerformance('component-refinement', Date.now() - startTime, true);
      return result;
    } catch (error: any) {
      this.recordPerformance('component-refinement', Date.now() - startTime, false);
      throw this.handleError(error, metadata);
    }
  }

  /**
   * Route a workflow request (Agent SDK only)
   */
  async runWorkflow(
    workflowPrompt: string,
    context?: AgentContext,
    options?: AIClientOptions
  ): Promise<any> {
    const metadata = this.analyzeOperation({
      prompt: workflowPrompt,
      context,
      operationType: 'workflow',
    });

    // Workflows always require Agent SDK
    metadata.requiresTools = true;
    metadata.requiresMultiStep = true;
    metadata.complexity = 'complex';

    const client = await this.selectClient(metadata);

    if (!this.isAgentClient(client)) {
      throw new AIClientError(
        'Workflow operations require Agent SDK client',
        'AGENT_SDK_REQUIRED',
        false
      );
    }

    const startTime = Date.now();

    try {
      const result = await (client as AgentAIClient).runWorkflow(
        workflowPrompt,
        context,
        options
      );
      this.recordPerformance('workflow', Date.now() - startTime, true);
      return result;
    } catch (error: any) {
      this.recordPerformance('workflow', Date.now() - startTime, false);
      throw this.handleError(error, metadata);
    }
  }

  /**
   * Route a generation with specific tools (Agent SDK only)
   */
  async generateWithTools(
    prompt: string,
    tools: string[],
    context?: AgentContext,
    options?: AIClientOptions
  ): Promise<any> {
    const metadata = this.analyzeOperation({
      prompt,
      context,
      tools,
      operationType: 'generation-with-tools',
    });

    metadata.requiresTools = true;
    metadata.complexity = 'complex';

    const client = await this.selectClient(metadata);

    if (!this.isAgentClient(client)) {
      throw new AIClientError(
        'Tool-based generation requires Agent SDK client',
        'AGENT_SDK_REQUIRED',
        false
      );
    }

    const startTime = Date.now();

    try {
      const result = await (client as AgentAIClient).generateWithTools(
        prompt,
        tools,
        context,
        options
      );
      this.recordPerformance('generation-with-tools', Date.now() - startTime, true);
      return result;
    } catch (error: any) {
      this.recordPerformance('generation-with-tools', Date.now() - startTime, false);
      throw this.handleError(error, metadata);
    }
  }

  /**
   * Analyze operation to determine requirements
   */
  private analyzeOperation(input: OperationInput): OperationMetadata {
    const metadata: OperationMetadata = {
      complexity: this.determineComplexity(input),
      requiresTools: this.checkToolRequirement(input),
      requiresStreaming: this.checkStreamingRequirement(input),
      requiresMultiStep: this.checkMultiStepRequirement(input),
      requiresFileAccess: this.checkFileAccessRequirement(input),
      requiresValidation: this.checkValidationRequirement(input),
      estimatedTokens: this.estimateTokens(input),
    };

    // Store for future analysis
    const key = input.operationType || 'unknown';
    this.operationHistory.set(key, metadata);

    return metadata;
  }

  /**
   * Determine operation complexity
   */
  private determineComplexity(input: OperationInput): OperationComplexity {
    const { prompt, context, operationType, componentCode } = input;

    // Workflows and multi-file operations are always complex
    if (operationType === 'workflow' || operationType === 'generation-with-tools') {
      return 'complex';
    }

    // Component operations with rich context are moderate to complex
    if (operationType === 'component-generation' || operationType === 'component-refinement') {
      const hasContext = context && (context.prd || context.types || context.brand);
      const isLarge = (prompt?.length || 0) > 1000 || (componentCode?.length || 0) > 2000;

      if (hasContext && isLarge) return 'complex';
      if (hasContext || isLarge) return 'moderate';
    }

    // Simple text generation
    if ((prompt?.length || 0) < 500) {
      return 'simple';
    }

    return 'moderate';
  }

  /**
   * Check if operation requires tools
   */
  private checkToolRequirement(input: OperationInput): boolean {
    const { operationType, tools, context } = input;

    // Explicit tool requirements
    if (tools && tools.length > 0) return true;

    // Workflow operations need tools
    if (operationType === 'workflow') return true;

    // Check context for file references
    if (context?.workingDirectory) return true;

    return false;
  }

  /**
   * Check if operation would benefit from streaming
   */
  private checkStreamingRequirement(input: OperationInput): boolean {
    const { operationType, estimatedDuration } = input;

    // Long-running operations benefit from streaming
    if (estimatedDuration && estimatedDuration > 5000) return true;

    // Workflows should stream progress
    if (operationType === 'workflow') return true;

    return false;
  }

  /**
   * Check if operation is multi-step
   */
  private checkMultiStepRequirement(input: OperationInput): boolean {
    const { operationType } = input;

    return operationType === 'workflow' || operationType === 'generation-with-tools';
  }

  /**
   * Check if operation needs file access
   */
  private checkFileAccessRequirement(input: OperationInput): boolean {
    const { context, tools } = input;

    if (context?.workingDirectory) return true;
    if (tools?.some(t => ['Read', 'Write', 'Edit', 'Glob'].includes(t))) return true;

    return false;
  }

  /**
   * Check if operation needs validation
   */
  private checkValidationRequirement(input: OperationInput): boolean {
    const { operationType } = input;

    return operationType === 'component-generation' ||
           operationType === 'component-refinement' ||
           operationType === 'workflow';
  }

  /**
   * Estimate token count for operation
   */
  private estimateTokens(input: OperationInput): number {
    const { prompt, context, componentCode } = input;

    let tokens = 0;

    // Estimate prompt tokens (rough approximation: 1 token ≈ 4 characters)
    if (prompt) tokens += Math.ceil(prompt.length / 4);
    if (componentCode) tokens += Math.ceil(componentCode.length / 4);

    // Add context tokens
    if (context) {
      if (context.prd) tokens += Math.ceil(context.prd.length / 4);
      if (context.types) tokens += Math.ceil(context.types.length / 4);
      if (context.brand) tokens += Math.ceil(context.brand.length / 4);
    }

    return tokens;
  }

  /**
   * Select appropriate client based on metadata
   */
  private async selectClient(metadata: OperationMetadata): Promise<AIClient> {
    try {
      return await this.factory.getClient(
        metadata.complexity,
        metadata.requiresTools,
        metadata.requiresStreaming
      );
    } catch (error: any) {
      throw new AIClientError(
        `Failed to get AI client: ${error.message}`,
        'CLIENT_SELECTION_FAILED',
        false
      );
    }
  }

  /**
   * Check if client is an Agent SDK client
   */
  private isAgentClient(client: AIClient): client is AgentAIClient {
    return client.clientType === 'agent-sdk' && client.supportsTools;
  }

  /**
   * Handle and transform errors
   */
  private handleError(error: any, metadata: OperationMetadata): Error {
    if (error instanceof AIClientError) {
      return error;
    }

    // Transform common errors
    if (error.message?.includes('permission')) {
      return new AIClientError(
        error.message,
        'PERMISSION_DENIED',
        true
      );
    }

    if (error.message?.includes('timeout')) {
      return new AIClientError(
        error.message,
        'TIMEOUT',
        true
      );
    }

    if (error.message?.includes('context')) {
      return new AIClientError(
        error.message,
        'CONTEXT_OVERFLOW',
        true
      );
    }

    // Generic error
    return new AIClientError(
      error.message || 'Unknown error',
      'UNKNOWN_ERROR',
      false
    );
  }

  /**
   * Record performance metrics
   */
  private recordPerformance(
    operation: string,
    duration: number,
    success: boolean
  ): void {
    if (!this.performanceMetrics.has(operation)) {
      this.performanceMetrics.set(operation, []);
    }

    this.performanceMetrics.get(operation)!.push({
      duration,
      success,
      timestamp: Date.now(),
    });

    // Keep only last 100 entries per operation
    const metrics = this.performanceMetrics.get(operation)!;
    if (metrics.length > 100) {
      metrics.shift();
    }
  }

  /**
   * Get performance statistics
   */
  getPerformanceStats(operation?: string): PerformanceStats {
    if (operation) {
      const metrics = this.performanceMetrics.get(operation) || [];
      return this.calculateStats(metrics);
    }

    // Aggregate all operations
    const allMetrics: PerformanceMetric[] = [];
    for (const metrics of this.performanceMetrics.values()) {
      allMetrics.push(...metrics);
    }

    return this.calculateStats(allMetrics);
  }

  /**
   * Calculate statistics from metrics
   */
  private calculateStats(metrics: PerformanceMetric[]): PerformanceStats {
    if (metrics.length === 0) {
      return {
        count: 0,
        successRate: 0,
        avgDuration: 0,
        minDuration: 0,
        maxDuration: 0,
      };
    }

    const durations = metrics.map(m => m.duration);
    const successes = metrics.filter(m => m.success).length;

    return {
      count: metrics.length,
      successRate: successes / metrics.length,
      avgDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
      minDuration: Math.min(...durations),
      maxDuration: Math.max(...durations),
    };
  }

  /**
   * Log router statistics
   */
  logStats(): void {
    console.log(chalk.blue('\n📊 AI Client Router Statistics:'));

    for (const [operation, metrics] of this.performanceMetrics.entries()) {
      const stats = this.calculateStats(metrics);
      console.log(chalk.gray(`\n  ${operation}:`));
      console.log(chalk.gray(`    Count: ${stats.count}`));
      console.log(chalk.gray(`    Success Rate: ${(stats.successRate * 100).toFixed(1)}%`));
      console.log(chalk.gray(`    Avg Duration: ${stats.avgDuration.toFixed(0)}ms`));
      console.log(chalk.gray(`    Range: ${stats.minDuration.toFixed(0)}ms - ${stats.maxDuration.toFixed(0)}ms`));
    }

    console.log();
  }

  /**
   * Clear performance history
   */
  clearHistory(): void {
    this.operationHistory.clear();
    this.performanceMetrics.clear();
  }
}

/**
 * Operation input for analysis
 */
interface OperationInput {
  operationType?: string;
  prompt?: string;
  context?: AgentContext;
  componentCode?: string;
  tools?: string[];
  estimatedDuration?: number;
}

/**
 * Performance metric
 */
interface PerformanceMetric {
  duration: number;
  success: boolean;
  timestamp: number;
}

/**
 * Performance statistics
 */
interface PerformanceStats {
  count: number;
  successRate: number;
  avgDuration: number;
  minDuration: number;
  maxDuration: number;
}

/**
 * Singleton router instance
 */
let routerInstance: AIClientRouter | null = null;

/**
 * Get router instance
 */
export function getAIClientRouter(): AIClientRouter {
  if (!routerInstance) {
    routerInstance = new AIClientRouter();
  }
  return routerInstance;
}

/**
 * Reset router (useful for testing)
 */
export function resetAIClientRouter(): void {
  routerInstance = null;
}
