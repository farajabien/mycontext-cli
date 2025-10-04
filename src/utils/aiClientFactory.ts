/**
 * AI Client Factory
 *
 * Factory for creating and managing AI client instances.
 * Handles client selection, caching, and lifecycle management.
 */

import {
  AIClient,
  AgentAIClient,
  AIClientFactoryConfig,
  AIClientError,
  OperationComplexity,
} from '../interfaces/AIClient';
import { ClaudeClient } from './claudeClient';
import { ClaudeAgentClient } from './claudeAgentClient';
import chalk from 'chalk';

/**
 * Singleton factory for creating and managing AI clients
 */
export class AIClientFactory {
  private static instance: AIClientFactory;
  private config: AIClientFactoryConfig;
  private clientCache: Map<string, AIClient> = new Map();
  private workingDirectory: string;

  private constructor(config: AIClientFactoryConfig = {}) {
    this.config = {
      preferredClient: config.preferredClient || 'auto',
      fallbackEnabled: config.fallbackEnabled !== false,
      autoSelectByComplexity: config.autoSelectByComplexity !== false,
      defaultModel: config.defaultModel || 'claude-3-5-sonnet-20241022',
      defaultTemperature: config.defaultTemperature || 0.7,
      defaultMaxTokens: config.defaultMaxTokens || 4096,
      workingDirectory: config.workingDirectory || process.cwd(),
    };
    this.workingDirectory = this.config.workingDirectory!;
  }

  /**
   * Get singleton instance
   */
  static getInstance(config?: AIClientFactoryConfig): AIClientFactory {
    if (!AIClientFactory.instance) {
      AIClientFactory.instance = new AIClientFactory(config);
    }
    return AIClientFactory.instance;
  }

  /**
   * Reset singleton (useful for testing)
   */
  static reset(): void {
    AIClientFactory.instance = null as any;
  }

  /**
   * Update factory configuration
   */
  configure(config: Partial<AIClientFactoryConfig>): void {
    this.config = { ...this.config, ...config };
    if (config.workingDirectory) {
      this.workingDirectory = config.workingDirectory;
    }
  }

  /**
   * Get or create a client based on requirements
   */
  async getClient(
    complexity?: OperationComplexity,
    requiresTools: boolean = false,
    requiresStreaming: boolean = false
  ): Promise<AIClient> {
    // Determine which client to use
    const clientType = this.selectClientType(
      complexity,
      requiresTools,
      requiresStreaming
    );

    // Check cache first
    const cacheKey = `${clientType}-${this.workingDirectory}`;
    if (this.clientCache.has(cacheKey)) {
      return this.clientCache.get(cacheKey)!;
    }

    // Create new client
    const client = await this.createClient(clientType);
    this.clientCache.set(cacheKey, client);

    return client;
  }

  /**
   * Get Agent SDK client specifically (for advanced operations)
   */
  async getAgentClient(): Promise<AgentAIClient> {
    const cacheKey = `agent-sdk-${this.workingDirectory}`;

    if (this.clientCache.has(cacheKey)) {
      return this.clientCache.get(cacheKey) as AgentAIClient;
    }

    const client = new ClaudeAgentClient(this.workingDirectory);

    // Verify API key is available
    if (!client.hasApiKey()) {
      throw new AIClientError(
        'Claude API key not configured. Set MYCONTEXT_CLAUDE_API_KEY or ANTHROPIC_API_KEY',
        'NO_API_KEY',
        false
      );
    }

    // Initialize the agent
    try {
      await client.initialize({
        model: this.config.defaultModel,
        temperature: this.config.defaultTemperature,
        maxTokens: this.config.defaultMaxTokens,
      });
    } catch (error: any) {
      throw new AIClientError(
        `Failed to initialize Agent SDK: ${error.message}`,
        'AGENT_INIT_FAILED',
        false
      );
    }

    this.clientCache.set(cacheKey, client);
    return client as AgentAIClient;
  }

  /**
   * Get Direct API client specifically (for simple operations)
   */
  async getDirectClient(): Promise<AIClient> {
    const cacheKey = `direct-api-${this.workingDirectory}`;

    if (this.clientCache.has(cacheKey)) {
      return this.clientCache.get(cacheKey)!;
    }

    const client = new ClaudeClient();

    if (!client.hasApiKey()) {
      throw new AIClientError(
        'Claude API key not configured. Set MYCONTEXT_CLAUDE_API_KEY or ANTHROPIC_API_KEY',
        'NO_API_KEY',
        false
      );
    }

    this.clientCache.set(cacheKey, client);
    return client;
  }

  /**
   * Select appropriate client type based on operation requirements
   */
  private selectClientType(
    complexity?: OperationComplexity,
    requiresTools: boolean = false,
    requiresStreaming: boolean = false
  ): 'direct-api' | 'agent-sdk' {
    // If explicitly configured, use that preference
    if (this.config.preferredClient === 'direct-api') {
      if (requiresTools) {
        console.log(
          chalk.yellow(
            '⚠️  Operation requires tools but preferredClient is direct-api. Consider using agent-sdk.'
          )
        );
      }
      return 'direct-api';
    }

    if (this.config.preferredClient === 'agent-sdk') {
      return 'agent-sdk';
    }

    // Auto-select based on requirements
    if (this.config.autoSelectByComplexity) {
      // Use Agent SDK for:
      // - Complex operations
      // - Operations requiring tools (file access, validation)
      // - Operations requiring streaming
      if (
        complexity === 'complex' ||
        requiresTools ||
        requiresStreaming
      ) {
        return 'agent-sdk';
      }

      // Use Direct API for:
      // - Simple operations
      // - Single-shot text generation
      if (complexity === 'simple') {
        return 'direct-api';
      }

      // Default to Agent SDK for moderate complexity
      return 'agent-sdk';
    }

    // Default to Agent SDK
    return 'agent-sdk';
  }

  /**
   * Create a new client instance
   */
  private async createClient(
    clientType: 'direct-api' | 'agent-sdk'
  ): Promise<AIClient> {
    if (clientType === 'agent-sdk') {
      return await this.getAgentClient();
    } else {
      return await this.getDirectClient();
    }
  }

  /**
   * Check if any AI client is available and configured
   */
  async isAvailable(): Promise<boolean> {
    try {
      // Try Agent SDK first
      const agentClient = new ClaudeAgentClient(this.workingDirectory);
      if (agentClient.hasApiKey()) {
        const connected = await agentClient.checkConnection();
        if (connected) {
          console.log(chalk.green('✅ Claude Agent SDK available'));
          return true;
        }
      }

      // Fallback to direct API
      const directClient = new ClaudeClient();
      if (directClient.hasApiKey()) {
        const connected = await directClient.checkConnection();
        if (connected) {
          console.log(chalk.green('✅ Claude Direct API available'));
          return true;
        }
      }

      return false;
    } catch (error) {
      return false;
    }
  }

  /**
   * Test connection for a specific client type
   */
  async testConnection(
    clientType: 'direct-api' | 'agent-sdk' = 'agent-sdk'
  ): Promise<boolean> {
    try {
      const client = await this.createClient(clientType);
      return await client.checkConnection();
    } catch (error) {
      return false;
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): AIClientFactoryConfig {
    return { ...this.config };
  }

  /**
   * Clear client cache
   */
  clearCache(): void {
    this.clientCache.clear();
  }

  /**
   * Cleanup all cached clients
   */
  async cleanup(): Promise<void> {
    for (const [key, client] of this.clientCache.entries()) {
      if (client.cleanup) {
        try {
          await client.cleanup();
        } catch (error) {
          console.error(
            chalk.red(`Failed to cleanup client ${key}:`),
            error
          );
        }
      }
    }
    this.clearCache();
  }

  /**
   * Get statistics about cached clients
   */
  getStats(): {
    cachedClients: number;
    clientTypes: Record<string, number>;
  } {
    const stats = {
      cachedClients: this.clientCache.size,
      clientTypes: {} as Record<string, number>,
    };

    for (const [key] of this.clientCache.entries()) {
      const type = key.split('-')[0];
      stats.clientTypes[type] = (stats.clientTypes[type] || 0) + 1;
    }

    return stats;
  }

  /**
   * Log current factory state (for debugging)
   */
  logState(): void {
    console.log(chalk.blue('\n🏭 AI Client Factory State:'));
    console.log(chalk.gray(`  Preferred Client: ${this.config.preferredClient}`));
    console.log(chalk.gray(`  Fallback Enabled: ${this.config.fallbackEnabled}`));
    console.log(chalk.gray(`  Auto-Select: ${this.config.autoSelectByComplexity}`));
    console.log(chalk.gray(`  Working Directory: ${this.workingDirectory}`));

    const stats = this.getStats();
    console.log(chalk.gray(`  Cached Clients: ${stats.cachedClients}`));
    if (stats.cachedClients > 0) {
      for (const [type, count] of Object.entries(stats.clientTypes)) {
        console.log(chalk.gray(`    - ${type}: ${count}`));
      }
    }
    console.log();
  }
}

/**
 * Convenience function to get factory instance
 */
export function getAIClientFactory(
  config?: AIClientFactoryConfig
): AIClientFactory {
  return AIClientFactory.getInstance(config);
}

/**
 * Convenience function to get an AI client
 */
export async function getAIClient(
  complexity?: OperationComplexity,
  requiresTools?: boolean,
  requiresStreaming?: boolean
): Promise<AIClient> {
  const factory = AIClientFactory.getInstance();
  return await factory.getClient(complexity, requiresTools, requiresStreaming);
}

/**
 * Convenience function to get Agent SDK client
 */
export async function getAgentClient(): Promise<AgentAIClient> {
  const factory = AIClientFactory.getInstance();
  return await factory.getAgentClient();
}
