import {
  AIClient,
  AIClientOptions,
  AgentContext,
} from "../interfaces/AIClient";

/**
 * XAI Client - Fallback provider using X AI API (Grok)
 *
 * This is a simplified client that uses the X AI API directly
 * as a secondary fallback when MyContext AI and Claude SDK are not available.
 */
export class XAIClient implements AIClient {
  readonly clientType = "direct-api" as const;
  readonly supportsTools = false;
  readonly supportsStreaming = false;

  private apiKey: string | null = null;
  private baseUrl = "https://api.x.ai/v1";

  constructor() {
    this.apiKey = process.env.XAI_API_KEY || null;
  }

  /**
   * Check if API key is available
   */
  hasApiKey(): boolean {
    return !!this.apiKey;
  }

  /**
   * Set API key for X AI API
   */
  setApiKey(apiKey: string): void {
    this.apiKey = apiKey;
  }

  /**
   * Check connection to X AI API
   */
  async checkConnection(): Promise<boolean> {
    if (!this.apiKey) {
      return false;
    }

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: "grok-beta",
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
      console.warn("XAI connection check failed:", error);
      return false;
    }
  }

  /**
   * Generate text using X AI API
   */
  async generateText(
    prompt: string,
    options: AIClientOptions = {}
  ): Promise<string> {
    if (!this.apiKey) {
      throw new Error("XAI API key not configured");
    }

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: options.model || "grok-beta",
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
          `XAI API error: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();
      return data.choices[0].message.content || "";
    } catch (error) {
      throw new Error(`XAI generation failed: ${error}`);
    }
  }

  /**
   * Generate React component using X AI API
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
   * Generate component refinement using X AI API
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
    return ["grok-beta", "grok-2-1212", "grok-2-vision-1212"];
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    // No cleanup needed for fetch-based client
  }
}
