import fetch from "node-fetch";
import * as fs from "fs";
import * as path from "path";

export interface OpenAIOptions {
  model: string;
  modelCandidates?: string[];
  temperature?: number;
  maxTokens?: number;
}

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

export class OpenAIClient {
  private baseUrl: string;
  private token: string | null;

  constructor() {
    this.baseUrl = "https://api.openai.com/v1";
    this.token =
      process.env.MYCONTEXT_OPENAI_API_KEY ||
      process.env.OPENAI_API_KEY ||
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
              trimmed.startsWith("MYCONTEXT_OPENAI_API_KEY=") ||
              trimmed.startsWith("OPENAI_API_KEY=")
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
      const response = await fetch(`${this.baseUrl}/models`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.token}`,
          "Content-Type": "application/json",
        },
        timeout: 5000,
      });

      return response.ok;
    } catch (error) {
      console.log(`[OpenAIClient] Connection check failed: ${error}`);
      return false;
    }
  }

  async generateText(
    prompt: string,
    options: OpenAIOptions = { model: "gpt-3.5-turbo" }
  ): Promise<string> {
    if (!this.token) {
      throw new Error("OpenAI API key not configured");
    }

    const model = options.model || "gpt-3.5-turbo";
    const messages: ChatMessage[] = [
      {
        role: "user",
        content: prompt,
      },
    ];

    const payload = {
      model,
      messages,
      temperature: options.temperature || 0.2,
      max_tokens: options.maxTokens || 4096,
    };

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || "";
  }

  async generateComponent(
    prompt: string,
    options: OpenAIOptions = { model: "gpt-3.5-turbo" }
  ): Promise<string> {
    // For component generation, we want more structured output
    const enhancedPrompt = `You are a React component generator. Generate a complete, production-ready React component based on the following requirements:

${prompt}

Please provide:
1. The complete component code in a code block
2. A brief explanation of the implementation

Format your response with the code in a \`\`\`tsx code block.`;

    return this.generateText(enhancedPrompt, options);
  }

  async generateComponentRefinement(
    componentCode: string,
    prompt: string,
    options: OpenAIOptions = { model: "gpt-3.5-turbo" }
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

    return this.generateText(enhancedPrompt, options);
  }

  async listModels(): Promise<string[]> {
    if (!this.token) return [];

    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) return [];

      const data = await response.json();
      return data.data?.map((model: any) => model.id) || [];
    } catch (error) {
      console.log(`[OpenAIClient] Failed to list models: ${error}`);
      return [];
    }
  }

  setApiKey(apiKey: string): void {
    this.token = apiKey;
  }
}
