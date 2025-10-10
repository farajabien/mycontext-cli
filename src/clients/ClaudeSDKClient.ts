import {
  AIClient,
  AIClientOptions,
  AgentContext,
} from "../interfaces/AIClient";

/**
 * Claude SDK Client - Fallback provider using Claude API
 *
 * This is a simplified client that uses the Claude API directly
 * as a fallback when MyContext AI is not available.
 */
export class ClaudeSDKClient implements AIClient {
  readonly clientType = "direct-api" as const;
  readonly supportsTools = false;
  readonly supportsStreaming = false;

  private apiKey: string | null = null;
  private baseUrl = "https://api.anthropic.com/v1";

  constructor() {
    this.apiKey = process.env.ANTHROPIC_API_KEY || null;
  }

  /**
   * Check if API key is available
   */
  hasApiKey(): boolean {
    return !!this.apiKey;
  }

  /**
   * Set API key for Claude API
   */
  setApiKey(apiKey: string): void {
    this.apiKey = apiKey;
  }

  /**
   * Check connection to Claude API
   */
  async checkConnection(): Promise<boolean> {
    if (!this.apiKey) {
      return false;
    }

    try {
      const response = await fetch(`${this.baseUrl}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": this.apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-3-haiku-20240307",
          max_tokens: 10,
          messages: [
            {
              role: "user",
              content: "test",
            },
          ],
        }),
      });

      return response.ok;
    } catch (error) {
      console.warn("Claude SDK connection check failed:", error);
      return false;
    }
  }

  /**
   * Generate text using Claude API
   */
  async generateText(
    prompt: string,
    options: AIClientOptions = {}
  ): Promise<string> {
    if (!this.apiKey) {
      throw new Error("Anthropic API key not configured for Claude SDK");
    }

    try {
      const response = await fetch(`${this.baseUrl}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": this.apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: options.model || "claude-3-haiku-20240307",
          max_tokens: options.maxTokens || 4000,
          temperature: options.temperature || 0.7,
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
        }),
      });

      if (!response.ok) {
        throw new Error(
          `Claude API error: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();
      return data.content[0].text || "";
    } catch (error) {
      throw new Error(`Claude SDK generation failed: ${error}`);
    }
  }

  /**
   * Generate React component using Claude API
   */
  async generateComponent(
    prompt: string,
    context?: AgentContext,
    options: AIClientOptions = {}
  ): Promise<string> {
    const systemPrompt = `You are a React component generator. Generate production-ready React components with TypeScript.

Requirements:
- Use functional components with hooks
- Include proper TypeScript types
- Add accessibility attributes
- Use Tailwind CSS for styling
- Include proper imports and exports
- Generate complete, runnable code

${context?.prd ? `Project Requirements: ${context.prd}` : ""}
${context?.types ? `Type Definitions: ${context.types}` : ""}
${context?.brand ? `Brand Guidelines: ${context.brand}` : ""}`;

    const fullPrompt = `${systemPrompt}\n\nGenerate a React component for: ${prompt}`;

    return this.generateText(fullPrompt, options);
  }

  /**
   * Generate component refinement using Claude API
   */
  async generateComponentRefinement(
    componentCode: string,
    prompt: string,
    context?: AgentContext,
    options: AIClientOptions = {}
  ): Promise<string> {
    const systemPrompt = `You are a React component refiner. Improve and modify existing React components.

Requirements:
- Maintain existing functionality
- Preserve TypeScript types
- Keep accessibility attributes
- Follow React best practices
- Provide complete refined component

${context?.prd ? `Project Requirements: ${context.prd}` : ""}
${context?.types ? `Type Definitions: ${context.types}` : ""}
${context?.brand ? `Brand Guidelines: ${context.brand}` : ""}`;

    const fullPrompt = `${systemPrompt}\n\nComponent to refine:\n\`\`\`tsx\n${componentCode}\n\`\`\n\nRefinement request: ${prompt}`;

    return this.generateText(fullPrompt, options);
  }

  /**
   * List available models
   */
  async listModels(): Promise<string[]> {
    return [
      "claude-3-haiku-20240307",
      "claude-3-sonnet-20240229",
      "claude-3-opus-20240229",
    ];
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    // No cleanup needed for fetch-based client
  }
}
