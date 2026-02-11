import OpenAI from "openai";

export class OpenRouterClient {
  private client: OpenAI | null = null;
  private apiKey: string | null = null;

  constructor() {
    this.apiKey =
      process.env.MYCONTEXT_OPENROUTER_API_KEY ||
      process.env.OPENROUTER_API_KEY ||
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

  async checkConnection(): Promise<boolean> {
    // Just check if client exists - don't make actual API call
    // (API calls in checkConnection cause false negatives)
    return !!this.client;
  }

  async generateText(prompt: string, options: any = {}): Promise<string> {
    if (!this.client) throw new Error("OpenRouter not configured");

    const response = await this.client.chat.completions.create({
      model: "deepseek/deepseek-r1", // OpenRouter format
      messages: [{ role: "user", content: prompt }],
      temperature: options.temperature || 0.7,
      max_tokens: options.maxTokens || 4000,
    });

    return response.choices[0]?.message?.content || "";
  }

  async generateComponent(prompt: string, options: any = {}): Promise<string> {
    return this.generateText(prompt, options);
  }
}
