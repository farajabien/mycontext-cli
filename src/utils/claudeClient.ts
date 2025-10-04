import fetch from "node-fetch";
import * as fs from "fs";
import * as path from "path";
import {
  AIClient,
  AIClientOptions,
  AgentContext,
} from "../interfaces/AIClient";

export interface ClaudeOptions {
  model: string;
  modelCandidates?: string[];
  temperature?: number;
  maxTokens?: number;
}

type ChatMessage = { role: "user" | "assistant"; content: string };

export class ClaudeClient implements AIClient {
  // AIClient interface properties
  readonly clientType = 'direct-api' as const;
  readonly supportsTools = false;
  readonly supportsStreaming = false;
  private baseUrl: string;
  private token: string | null;

  constructor() {
    this.baseUrl = "https://api.anthropic.com/v1";
    this.token =
      process.env.MYCONTEXT_CLAUDE_API_KEY ||
      process.env.ANTHROPIC_API_KEY ||
      null;

    if (!this.token) {
      const loaded = this.loadTokenFromEnvFiles();
      if (loaded) {
        this.token = loaded;
      }
    }
  }

  hasApiKey(): boolean {
    return !!this.token;
  }

  /**
   * Load token from project-level env files without external deps
   * Priority: .mycontext/.env -> .env
   */
  private loadTokenFromEnvFiles(): string | null {
    try {
      const cwd = process.cwd();
      const candidates = [
        path.join(cwd, ".mycontext", ".env"),
        path.join(cwd, ".env"),
      ];

      for (const file of candidates) {
        if (fs.existsSync(file)) {
          const content = fs.readFileSync(file, "utf8");
          const lines = content.split("\n");

          for (const line of lines) {
            const trimmed = line.trim();
            if (
              trimmed.startsWith("MYCONTEXT_CLAUDE_API_KEY=") ||
              trimmed.startsWith("ANTHROPIC_API_KEY=")
            ) {
              const keyValue = trimmed.split("=", 2);
              if (keyValue.length === 2) {
                const value = keyValue[1].replace(/^["']|["']$/g, ""); // Remove quotes
                if (value && !value.startsWith("$")) {
                  // Not a variable reference
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

  async checkConnection(): Promise<boolean> {
    if (!this.token) return false;

    try {
      const response = await fetch(`${this.baseUrl}/messages`, {
        method: "POST",
        headers: {
          "x-api-key": this.token,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-3-haiku-20240307",
          max_tokens: 1,
          messages: [{ role: "user", content: "test" }],
        }),
      });

      return response.ok;
    } catch (error) {
      console.log(`[ClaudeClient] Connection check failed: ${error}`);
      return false;
    }
  }

  async generateText(
    prompt: string,
    options: ClaudeOptions = { model: "claude-3-haiku-20240307" }
  ): Promise<string> {
    if (!this.token) {
      throw new Error("Claude API key not configured");
    }

    const model = options.model || "claude-3-haiku-20240307";
    const messages: ChatMessage[] = [
      {
        role: "user",
        content: prompt,
      },
    ];

    const payload = {
      model,
      messages,
      max_tokens: options.maxTokens || 4096,
      temperature: options.temperature || 0.2,
    };

    const response = await fetch(`${this.baseUrl}/messages`, {
      method: "POST",
      headers: {
        "x-api-key": this.token,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Claude API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    return data.content[0]?.text || "";
  }

  async generateComponent(
    prompt: string,
    context?: AgentContext,
    options?: AIClientOptions
  ): Promise<string> {
    // For component generation, we want more structured output
    let enhancedPrompt = `You are a React component generator. Generate a complete, production-ready React component based on the following requirements:

${prompt}

Please provide:
1. The complete component code in a code block
2. A brief explanation of the implementation

Format your response with the code in a \`\`\`tsx code block.`;

    // Add context if available (though this client doesn't fully utilize it)
    if (context) {
      if (context.brand) {
        enhancedPrompt += `\n\nBrand Guidelines:\n${context.brand.substring(0, 500)}...`;
      }
      if (context.types) {
        enhancedPrompt += `\n\nType Definitions:\n${context.types.substring(0, 500)}...`;
      }
    }

    const claudeOptions: ClaudeOptions = {
      model: options?.model || "claude-3-haiku-20240307",
      temperature: options?.temperature,
      maxTokens: options?.maxTokens,
    };

    return this.generateText(enhancedPrompt, claudeOptions);
  }

  async generateComponentRefinement(
    componentCode: string,
    prompt: string,
    context?: AgentContext,
    options?: AIClientOptions
  ): Promise<string> {
    const enhancedPrompt = `You are a React component refactoring expert. Please refine the following component:

\`\`\`tsx
${componentCode}
\`\`\`

Requirements:
${prompt}

Please provide:
1. The complete refactored component code
2. A brief explanation of the changes made

Format your response with the code in a \`\`\`tsx code block.`;

    const claudeOptions: ClaudeOptions = {
      model: options?.model || "claude-3-haiku-20240307",
      temperature: options?.temperature,
      maxTokens: options?.maxTokens,
    };

    return this.generateText(enhancedPrompt, claudeOptions);
  }

  async listModels(): Promise<string[]> {
    if (!this.token) return [];

    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        method: "GET",
        headers: {
          "x-api-key": this.token,
          "anthropic-version": "2023-06-01",
        },
      });

      if (!response.ok) return [];

      const data = await response.json();
      return data.data?.map((model: any) => model.id) || [];
    } catch (error) {
      console.log(`[ClaudeClient] Failed to list models: ${error}`);
      return [];
    }
  }

  setApiKey(apiKey: string): void {
    this.token = apiKey;
  }
}
