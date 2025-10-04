export interface QwenOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

export class QwenClient {
  private baseUrl = "https://openrouter.ai/api/v1";
  private apiKey: string | null = null;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || this.loadTokenFromEnvFiles();
  }

  hasApiKey(): boolean {
    return !!this.apiKey;
  }

  private loadTokenFromEnvFiles(): string | null {
    // Check environment variables
    const envKey =
      process.env.MYCONTEXT_QWEN_API_KEY || process.env.QWEN_API_KEY;
    if (envKey) return envKey;

    // Check .mycontext/.env file
    try {
      const fs = require("fs");
      const path = require("path");
      const envPath = path.join(process.cwd(), ".mycontext", ".env");

      if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, "utf8");
        const lines = envContent.split("\n");

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith("MYCONTEXT_QWEN_API_KEY=")) {
            const key = trimmed.split("=")[1]?.trim();
            if (key && !key.startsWith("$")) {
              return key;
            }
          }
        }
      }
    } catch (error) {
      // Ignore file read errors
    }

    return null;
  }

  private getHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://mycontext.fbien.com",
      "X-Title": "MyContext CLI",
    };
  }

  async checkConnection(): Promise<boolean> {
    if (!this.apiKey) return false;

    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        method: "GET",
        headers: this.getHeaders(),
        signal: AbortSignal.timeout(10000),
      });

      return response.ok;
    } catch (error) {
      return false;
    }
  }

  async generateText(
    prompt: string,
    options: Partial<QwenOptions> = {}
  ): Promise<string> {
    const messages: ChatMessage[] = [{ role: "user", content: prompt }];

    return this.generateWithMessages(messages, options);
  }

  async generateComponent(
    prompt: string,
    options: Partial<QwenOptions> = {}
  ): Promise<string> {
    const systemPrompt = `You are an expert React/Next.js developer specializing in creating production-ready components using TypeScript, Tailwind CSS, and shadcn/ui.

Key requirements:
- Use TypeScript with proper type definitions
- Import shadcn/ui components from '@/components/ui/<component>'
- Use Tailwind CSS for styling with design tokens
- Follow Next.js App Router patterns (Server Components by default, "use client" when needed)
- Include proper accessibility attributes
- Add comprehensive JSDoc comments
- Export both named and default exports
- Include action functions as separate exports
- Use proper error handling and loading states

Generate clean, production-ready React component code.`;

    const messages: ChatMessage[] = [
      { role: "system", content: systemPrompt },
      { role: "user", content: prompt },
    ];

    return this.generateWithMessages(messages, options);
  }

  async generateComponentRefinement(
    componentCode: string,
    prompt: string,
    options: Partial<QwenOptions> = {}
  ): Promise<string> {
    const systemPrompt = `You are an expert React/Next.js developer specializing in refining and improving existing components.

Key requirements:
- Maintain TypeScript type safety
- Preserve existing functionality while improving code quality
- Use shadcn/ui components from '@/components/ui/<component>'
- Apply Tailwind CSS best practices
- Improve accessibility and performance
- Add proper error handling and loading states
- Maintain consistent code style
- Add comprehensive JSDoc comments where missing

Refine the provided component code based on the user's request.`;

    const messages: ChatMessage[] = [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: `Current component code:\n\`\`\`tsx\n${componentCode}\n\`\`\`\n\nRefinement request: ${prompt}`,
      },
    ];

    return this.generateWithMessages(messages, options);
  }

  private async generateWithMessages(
    messages: ChatMessage[],
    options: Partial<QwenOptions> = {}
  ): Promise<string> {
    if (!this.apiKey) {
      throw new Error(
        "Qwen API key not found. Set MYCONTEXT_QWEN_API_KEY environment variable."
      );
    }

    const model = options.model || "qwen/qwen3-coder:free";
    const temperature = options.temperature ?? 0.2;
    const maxTokens = Math.min(options.maxTokens ?? 4000, 4000);

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify({
          model,
          messages,
          temperature,
          max_tokens: maxTokens,
          stream: false,
        }),
        signal: AbortSignal.timeout(60000),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Qwen API error: ${response.status} ${response.statusText} - ${errorText}`
        );
      }

      const data = await response.json();
      return this.extractContent(data);
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Qwen generation failed: ${error.message}`);
      }
      throw new Error("Qwen generation failed: Unknown error");
    }
  }

  private extractContent(response: any): string {
    try {
      if (
        response.choices &&
        response.choices[0] &&
        response.choices[0].message
      ) {
        return response.choices[0].message.content || "";
      }
      return "";
    } catch (error) {
      return "";
    }
  }

  async listModels(): Promise<string[]> {
    if (!this.apiKey) return [];

    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        method: "GET",
        headers: this.getHeaders(),
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) return [];

      const data = (await response.json()) as any;
      return (
        data.data
          ?.map((model: any) => model.id)
          .filter((id: string) => id.includes("qwen")) || []
      );
    } catch (error) {
      return [];
    }
  }

  setApiKey(apiKey: string): void {
    this.apiKey = apiKey;
  }
}
