export interface XaiOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

export class XaiClient {
  private baseUrl = process.env.XAI_BASE_URL || "https://api.x.ai/v1";
  private apiKey: string | null = null;

  constructor(apiKey?: string) {
    this.apiKey =
      apiKey ||
      process.env.MYCONTEXT_XAI_API_KEY ||
      process.env.MYCONTEXT_GROK_TOKEN ||
      process.env.XAI_API_KEY ||
      null;
  }

  hasApiKey(): boolean {
    return Boolean(this.apiKey);
  }

  async checkConnection(): Promise<boolean> {
    if (!this.hasApiKey()) return false;
    try {
      // Lightweight ping by requesting a very small completion
      const res = await this.request(
        "/chat/completions",
        {
          model: this.getDefaultModel(),
          messages: [{ role: "user", content: "ping" }],
          max_tokens: 1,
          temperature: 0.0,
        },
        8000
      );
      return Boolean(res?.id);
    } catch {
      return false;
    }
  }

  async generateText(
    prompt: string,
    options: Partial<XaiOptions> = {}
  ): Promise<string> {
    const model = options.model || this.getDefaultModel();
    const response = await this.request("/chat/completions", {
      model: model,
      messages: [
        { role: "system", content: "You are a helpful assistant." },
        { role: "user", content: prompt },
      ],
      max_tokens: options.maxTokens ?? 8000, // Increased from 2048
      temperature: options.temperature ?? 0.2,
    });
    return this.extractContent(response) || "";
  }

  async generateComponent(
    prompt: string,
    options: Partial<XaiOptions> = {}
  ): Promise<string> {
    // Increase token limits for component generation
    const enhancedOptions = {
      ...options,
      maxTokens: options.maxTokens ?? 8000, // Increased from 2048
      temperature: options.temperature ?? 0.3, // Slightly higher for creativity
    };
    return this.generateText(prompt, enhancedOptions);
  }

  async generateComponentRefinement(
    componentCode: string,
    prompt: string,
    options: Partial<XaiOptions> = {}
  ): Promise<string> {
    const messages: ChatMessage[] = [
      {
        role: "system",
        content: "You are an expert React/TypeScript code assistant.",
      },
      {
        role: "user",
        content: `${prompt}\n\n\u0060\u0060\u0060tsx\n${componentCode}\n\u0060\u0060\u0060`,
      },
    ];
    const response = await this.request("/chat/completions", {
      model: options.model || this.getDefaultModel(),
      messages,
      max_tokens: options.maxTokens ?? 8000, // Increased from 4096
      temperature: options.temperature ?? 0.2,
    });
    return this.extractContent(response) || "";
  }

  private async request(
    path: string,
    body: any,
    timeoutMs = 30000
  ): Promise<any> {
    if (!this.apiKey)
      throw new Error(
        "Missing X.AI API key (set MYCONTEXT_GROK_TOKEN or XAI_API_KEY)"
      );
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(`${this.baseUrl}${path}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(
          `XAI request failed: ${res.status} ${res.statusText} – ${text}`
        );
      }

      // Try to parse JSON response, handle malformed responses
      const responseText = await res.text();
      console.log(
        "🔍 DEBUG: X.AI response preview:",
        responseText.substring(0, 200)
      );

      try {
        // Check if response looks like JSON
        if (
          !responseText.trim().startsWith("{") &&
          !responseText.trim().startsWith("[")
        ) {
          console.warn(
            "❌ DEBUG: X.AI response doesn't look like JSON, got:",
            responseText.substring(0, 100)
          );
          throw new Error(
            `X.AI returned non-JSON response: ${responseText.substring(0, 100)}...`
          );
        }

        return JSON.parse(responseText);
      } catch (parseError) {
        console.error("❌ DEBUG: X.AI JSON parsing failed:", parseError);
        console.error("❌ DEBUG: Full X.AI response:", responseText);
        throw new Error(
          `X.AI response parsing failed: ${parseError instanceof Error ? parseError.message : String(parseError)}`
        );
      }
    } finally {
      clearTimeout(t);
    }
  }

  private extractContent(resp: any): string | null {
    try {
      const content = resp?.choices?.[0]?.message?.content;
      return typeof content === "string" ? content : null;
    } catch {
      return null;
    }
  }

  private getDefaultModel(): string {
    // Reasonable default; allow override via env
    const model =
      process.env.XAI_MODEL ||
      process.env.MYCONTEXT_MODEL ||
      "grok-4-fast-reasoning";
    return model;
  }
}
