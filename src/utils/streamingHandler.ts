/**
 * Streaming Handler for Claude Agent SDK
 *
 * Handles streaming messages, progress tracking, and user feedback
 * for long-running agent operations.
 */

import chalk from 'chalk';
import ora, { Ora } from 'ora';
import type { SDKMessage, Query } from '@anthropic-ai/claude-agent-sdk';

export interface StreamingOptions {
  showProgress?: boolean;
  showTokens?: boolean;
  showToolUsage?: boolean;
  onProgress?: (message: string) => void;
  onToken?: (token: string) => void;
  onToolUse?: (tool: string, input: any) => void;
  onError?: (error: Error) => void;
}

export interface StreamingStats {
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
  toolsUsed: string[];
  duration: number;
  messagesProcessed: number;
}

/**
 * Handles streaming from Claude Agent SDK with progress tracking
 */
export class StreamingHandler {
  private spinner: Ora | null = null;
  private stats: StreamingStats = {
    totalTokens: 0,
    inputTokens: 0,
    outputTokens: 0,
    toolsUsed: [],
    duration: 0,
    messagesProcessed: 0,
  };
  private startTime: number = 0;
  private options: StreamingOptions;

  constructor(options: StreamingOptions = {}) {
    this.options = {
      showProgress: options.showProgress !== false,
      showTokens: options.showTokens !== false,
      showToolUsage: options.showToolUsage !== false,
      ...options,
    };
  }

  /**
   * Start streaming handler
   */
  start(message: string = 'Processing...') {
    this.startTime = Date.now();
    if (this.options.showProgress) {
      this.spinner = ora(message).start();
    }
  }

  /**
   * Process streaming messages from query
   */
  async processStream(query: Query): Promise<string> {
    let fullResponse = '';

    try {
      for await (const message of query) {
        this.stats.messagesProcessed++;

        // Handle different message types
        switch (message.type) {
          case 'assistant':
            const text = this.handleAssistantMessage(message);
            fullResponse += text;
            break;

          case 'result':
            this.handleToolResult(message);
            break;

          case 'system':
            this.handleSystemMessage(message);
            break;

          default:
            // Handle other message types
            if ((message as any).type === 'partial_assistant') {
              this.handlePartialMessage(message);
            } else if ((message as any).type === 'permission_denial') {
              this.handlePermissionDenial(message);
            }
            break;
        }
      }

      this.stats.duration = Date.now() - this.startTime;
      this.complete();

      return fullResponse;
    } catch (error: any) {
      this.error(error);
      throw error;
    }
  }

  /**
   * Handle assistant message
   */
  private handleAssistantMessage(message: any): string {
    let text = '';

    if (message.message && message.message.content) {
      for (const content of message.message.content) {
        if (content.type === 'text') {
          text += content.text;

          // Stream tokens if enabled
          if (this.options.onToken) {
            this.options.onToken(content.text);
          }
        } else if (content.type === 'tool_use') {
          // Track tool usage
          const toolName = content.name;
          if (!this.stats.toolsUsed.includes(toolName)) {
            this.stats.toolsUsed.push(toolName);
          }

          if (this.options.showToolUsage) {
            this.updateSpinner(`🔧 Using tool: ${toolName}`);
          }

          if (this.options.onToolUse) {
            this.options.onToolUse(toolName, content.input);
          }
        }
      }

      // Update token stats if available
      if (message.message.usage) {
        this.stats.inputTokens += message.message.usage.input_tokens || 0;
        this.stats.outputTokens += message.message.usage.output_tokens || 0;
        this.stats.totalTokens = this.stats.inputTokens + this.stats.outputTokens;
      }
    }

    return text;
  }

  /**
   * Handle partial assistant message (streaming)
   */
  private handlePartialMessage(message: any) {
    if (message.message && message.message.content) {
      for (const content of message.message.content) {
        if (content.type === 'text') {
          // Update progress with partial text
          const preview = content.text.substring(0, 50);
          if (this.options.showProgress) {
            this.updateSpinner(`📝 ${preview}...`);
          }

          if (this.options.onProgress) {
            this.options.onProgress(content.text);
          }
        }
      }
    }
  }

  /**
   * Handle tool result message
   */
  private handleToolResult(message: any) {
    if (this.options.showToolUsage && message.content) {
      const preview = JSON.stringify(message.content).substring(0, 50);
      this.updateSpinner(`✅ Tool result: ${preview}...`);
    }
  }

  /**
   * Handle system message
   */
  private handleSystemMessage(message: any) {
    if (message.message) {
      if (this.options.showProgress) {
        this.updateSpinner(`ℹ️ ${message.message}`);
      }
    }
  }

  /**
   * Handle permission denial
   */
  private handlePermissionDenial(message: any) {
    if (this.spinner) {
      this.spinner.warn(chalk.yellow(`⚠️ Permission denied: ${message.message || 'Unknown operation'}`));
      this.spinner = ora().start();
    }
  }

  /**
   * Update spinner text
   */
  private updateSpinner(text: string) {
    if (this.spinner) {
      this.spinner.text = text;
    }
  }

  /**
   * Complete streaming successfully
   */
  complete(message?: string) {
    if (this.spinner) {
      this.spinner.succeed(message || chalk.green('✅ Completed'));
    }

    // Show stats if enabled
    if (this.options.showTokens && this.stats.totalTokens > 0) {
      console.log(chalk.gray(`   Tokens: ${this.stats.totalTokens} (in: ${this.stats.inputTokens}, out: ${this.stats.outputTokens})`));
    }

    if (this.options.showToolUsage && this.stats.toolsUsed.length > 0) {
      console.log(chalk.gray(`   Tools used: ${this.stats.toolsUsed.join(', ')}`));
    }

    if (this.options.showProgress) {
      console.log(chalk.gray(`   Duration: ${(this.stats.duration / 1000).toFixed(2)}s`));
    }
  }

  /**
   * Handle error during streaming
   */
  error(error: Error) {
    if (this.spinner) {
      this.spinner.fail(chalk.red(`❌ Error: ${error.message}`));
    }

    if (this.options.onError) {
      this.options.onError(error);
    }
  }

  /**
   * Stop spinner without completion
   */
  stop() {
    if (this.spinner) {
      this.spinner.stop();
    }
  }

  /**
   * Get current statistics
   */
  getStats(): StreamingStats {
    return { ...this.stats };
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.stats = {
      totalTokens: 0,
      inputTokens: 0,
      outputTokens: 0,
      toolsUsed: [],
      duration: 0,
      messagesProcessed: 0,
    };
  }
}

/**
 * Convenience function to create and use streaming handler
 */
export async function streamWithProgress(
  query: Query,
  options: StreamingOptions = {}
): Promise<{ content: string; stats: StreamingStats }> {
  const handler = new StreamingHandler(options);
  handler.start();

  const content = await handler.processStream(query);
  const stats = handler.getStats();

  return { content, stats };
}

/**
 * Simplified streaming with default options
 */
export async function simpleStream(query: Query): Promise<string> {
  const { content } = await streamWithProgress(query, {
    showProgress: true,
    showTokens: true,
    showToolUsage: true,
  });
  return content;
}
