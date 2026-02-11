import axios from "axios";
import { logger } from "./logger";
import chalk from "chalk";

export class GitHubModelsClient {
  private apiKey: string | undefined;
  private baseUrl = "https://models.inference.ai.azure.com";

  constructor() {
    this.apiKey = process.env.GITHUB_TOKEN || process.env.GITHUB_MODELS_API_KEY;
  }

  public hasApiKey(): boolean {
    return !!this.apiKey;
  }

  /**
   * Test connection to GitHub Models API
   */
  public async testConnection(): Promise<boolean> {
    if (!this.apiKey) return false;
    try {
      // Try to list models as a connection test
      await axios.get(`${this.baseUrl}/models`, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Generate text using GitHub Models
   */
  public async generateText(prompt: string, options: any = {}): Promise<string> {
    if (!this.apiKey) {
      throw new Error("GITHUB_TOKEN or GITHUB_MODELS_API_KEY not found in environment");
    }

    const model = options.model || "gpt-4o";
    const temperature = options.temperature || 0.7;
    const maxTokens = options.maxTokens || 4000;

    try {
      if (process.env.DEBUG || process.env.VERBOSE) {
        console.log(chalk.gray(`[GitHubModelsClient] Generating text with model: ${model}`));
      }

      const postData: any = {
        model,
        messages: [{ role: "user", content: prompt }],
        temperature,
        max_tokens: maxTokens,
      };

      if (options.jsonMode === true) {
        postData.response_format = { type: "json_object" };
      }

      const response = await axios.post(
        `${this.baseUrl}/chat/completions`,
        postData,
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
          },
        }
      );

      return response.data.choices[0].message.content;
    } catch (error: any) {
      const message = error.response?.data?.error?.message || error.message;
      logger.error(`GitHub Models API error: ${message}`);
      throw new Error(`GitHub Models generation failed: ${message}`);
    }
  }

  /**
   * Generate component using GitHub Models
   */
  public async generateComponent(prompt: string, options: any = {}): Promise<string> {
    const systemPrompt = `You are an expert React developer. 
Generate a high-quality, responsive React component using Tailwind CSS.
Include necessary imports (Lucide, Radix, etc. as needed).
Return ONLY the code block.`;

    const fullPrompt = `${systemPrompt}\n\nTask: ${prompt}`;
    return this.generateText(fullPrompt, options);
  }

  /**
   * Generate component refinement
   */
  public async generateComponentRefinement(
    componentCode: string,
    prompt: string,
    options: any = {}
  ): Promise<string> {
    const systemPrompt = `You are an expert React developer. 
Refine the provided React component based on the user request. 
Maintain high quality, responsiveness, and Tailwind CSS patterns.
Return ONLY the updated code block.`;

    const fullPrompt = `${systemPrompt}\n\nExisting Code:\n\`\`\`tsx\n${componentCode}\n\`\`\`\n\nRequest: ${prompt}`;
    return this.generateText(fullPrompt, options);
  }

  /**
   * List available models (placeholder - can be expanded)
   */
  public async listModels(): Promise<string[]> {
    return ["gpt-4o", "gpt-4o-mini", "o1-preview", "o1-mini"];
  }
}
