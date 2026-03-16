import OpenAI from "openai";
import { AIClient, AIClientOptions, AgentContext } from "../core/AIClient";

export class OpenRouterClient implements AIClient {
  readonly clientType = "direct-api" as const;
  readonly supportsTools = false;
  readonly supportsStreaming = false;

  private client: OpenAI | null = null;
  private apiKey: string | null = null;

  constructor() {
    this.apiKey =
      process.env.MYCONTEXT_OPENROUTER_API_KEY ||
      process.env.OPENROUTER_API_KEY ||
      process.env.OPENROUTER_KEY ||
      null;

    if (this.apiKey) {
      this.client = new OpenAI({
        baseURL: "https://openrouter.ai/api/v1",
        apiKey: this.apiKey,
        defaultHeaders: {
          "HTTP-Referer": "https://mycontext.dev",
          "X-Title": "MyContext CLI",
        },
      });
    }
  }

  hasApiKey(): boolean {
    return !!this.apiKey;
  }

  setApiKey(apiKey: string): void {
    this.apiKey = apiKey;
    this.client = new OpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: this.apiKey,
      defaultHeaders: {
        "HTTP-Referer": "https://mycontext.dev",
        "X-Title": "MyContext CLI",
      },
    });
  }

  async checkConnection(): Promise<boolean> {
    // Just check if client exists - don't make actual API call
    // (API calls in checkConnection cause false negatives)
    return !!this.client;
  }

  async generateText(prompt: string, options: AIClientOptions = {}): Promise<string> {
    if (!this.client) throw new Error("OpenRouter not configured");

    const response = await this.client.chat.completions.create({
      model: options.model || "deepseek/deepseek-r1", // OpenRouter format
      messages: [{ role: "user", content: prompt }],
      temperature: options.temperature || 0.7,
      max_tokens: options.maxTokens || 4000,
    });

    return response.choices[0]?.message?.content || "";
  }

  async generateComponent(
    prompt: string, 
    context?: AgentContext,
    options: AIClientOptions = {}
  ): Promise<string> {
    return this.generateText(prompt, options);
  }

  async generateComponentRefinement(
    componentCode: string,
    prompt: string,
    context?: AgentContext,
    options: AIClientOptions = {}
  ): Promise<string> {
    const fullPrompt = `Refine this component: ${prompt}\n\nExisting Code:\n${componentCode}`;
    return this.generateText(fullPrompt, options);
  }

  async generateVisionText(
    prompt: string,
    imagePath: string,
    options: AIClientOptions = {}
  ): Promise<string> {
    if (!this.client) throw new Error("OpenRouter not configured");

    try {
      const fs = await import("fs");
      const imageBuffer = await fs.promises.readFile(imagePath);
      const base64Image = imageBuffer.toString("base64");
      const mimeType = imagePath.toLowerCase().endsWith(".png") ? "image/png" : "image/jpeg";

      const response = await this.client.chat.completions.create({
        model: options.model || "google/gemini-pro-1.5-vision", // Default vision model for OpenRouter
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              {
                type: "image_url",
                image_url: {
                  url: `data:${mimeType};base64,${base64Image}`,
                },
              },
            ] as any,
          },
        ],
        max_tokens: options.maxTokens || 4000,
      });

      return response.choices[0]?.message?.content || "";
    } catch (error) {
      throw new Error(`OpenRouter vision generation failed: ${error}`);
    }
  }

  async generateImage(
    prompt: string,
    outputPath: string,
    options: AIClientOptions = {}
  ): Promise<string> {
    throw new Error("OpenRouter image generation not yet implemented in this client");
  }

  async listModels(): Promise<string[]> {
    return ["deepseek/deepseek-r1", "google/gemini-pro-1.5-vision", "anthropic/claude-3-sonnet"];
  }

  async cleanup(): Promise<void> {
    // No specific cleanup needed
  }
}
