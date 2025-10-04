import { AIProvider } from "../types";

export interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
    };
    finishReason: string;
  }>;
  usageMetadata?: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
}

export class GeminiClient implements AIProvider {
  public name = "gemini";
  public priority = 2;
  public client = this;
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.MYCONTEXT_GEMINI_API_KEY || "";
    this.baseUrl = "https://generativelanguage.googleapis.com/v1beta";
  }

  async generateText(
    prompt: string,
    options: {
      maxTokens?: number;
      temperature?: number;
      model?: string;
    } = {}
  ): Promise<{
    text: string;
    provider: string;
    usage?: {
      tokens: number;
      model: string;
    };
  }> {
    if (!this.apiKey) {
      throw new Error(
        "Gemini API key not found. Set MYCONTEXT_GEMINI_API_KEY environment variable."
      );
    }

    const model = options.model || "gemini-2.0-flash";
    const maxTokens = Math.min(options.maxTokens || 4000, 4000);
    const temperature = options.temperature || 0.2;

    try {
      const response = await fetch(
        `${this.baseUrl}/models/${model}:generateContent`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-goog-api-key": this.apiKey,
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: prompt,
                  },
                ],
              },
            ],
            generationConfig: {
              maxOutputTokens: Math.min(maxTokens, 4000),
              temperature: temperature,
              topP: 0.95,
              topK: 64,
            },
          }),
        }
      );

      if (!response.ok) {
        const errorData = (await response.json().catch(() => ({}))) as any;
        throw new Error(
          `Gemini API error: ${response.status} ${response.statusText}. ${
            errorData?.error?.message || "Unknown error"
          }`
        );
      }

      const data = (await response.json()) as any;

      if (!data.candidates || data.candidates.length === 0) {
        throw new Error("No response generated from Gemini");
      }

      const candidate = data.candidates[0];
      const text = candidate.content.parts[0]?.text || "";

      return {
        text,
        provider: "gemini",
        usage: data.usageMetadata
          ? {
              tokens: data.usageMetadata.totalTokenCount,
              model: model,
            }
          : undefined,
      };
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`Gemini API request failed: ${error}`);
    }
  }

  async generateComponent(
    prompt: string,
    options: {
      maxTokens?: number;
      temperature?: number;
      model?: string;
    } = {}
  ): Promise<{
    code: string;
    metadata: {
      componentName: string;
      dependencies: string[];
      shadcnComponents: string[];
      qualityScore: number;
      linesOfCode: number;
    };
    provider: string;
    usage?: {
      tokens: number;
      model: string;
    };
  }> {
    const result = await this.generateText(prompt, options);

    // Extract component code from the response
    const codeMatch = result.text.match(
      /```(?:tsx?|jsx?|typescript|javascript)?\n([\s\S]*?)\n```/
    );
    const code = codeMatch ? codeMatch[1] : result.text;

    // Extract component name
    const nameMatch = code.match(
      /export\s+(?:default\s+)?(?:function|const)\s+(\w+)/
    );
    const componentName = nameMatch ? nameMatch[1] : "Component";

    // Extract dependencies
    const importMatches =
      code.match(/import\s+.*?from\s+["']([^"']+)["']/g) || [];
    const dependencies = importMatches
      .map((imp) => {
        const match = imp.match(/from\s+["']([^"']+)["']/);
        return match ? match[1] : "";
      })
      .filter(Boolean);

    // Extract shadcn components
    const shadcnMatches =
      code.match(/from\s+["']@\/components\/ui\/([^"']+)["']/g) || [];
    const shadcnComponents = shadcnMatches
      .map((imp) => {
        const match = imp.match(/@\/components\/ui\/([^"']+)/);
        return match ? match[1] : "";
      })
      .filter(Boolean);

    // Calculate quality score
    const qualityScore = this.calculateQualityScore(code);

    // Count lines of code
    const linesOfCode = code.split("\n").length;

    return {
      code,
      metadata: {
        componentName,
        dependencies,
        shadcnComponents,
        qualityScore,
        linesOfCode,
      },
      provider: "gemini",
      usage: result.usage,
    };
  }

  private calculateQualityScore(code: string): number {
    let score = 50; // Base score

    // Check for TypeScript
    if (code.includes("interface") || code.includes("type ")) {
      score += 10;
    }

    // Check for proper React patterns
    if (
      code.includes("React.FC") ||
      code.includes("useState") ||
      code.includes("useEffect")
    ) {
      score += 10;
    }

    // Check for accessibility
    if (
      code.includes("aria-") ||
      code.includes("role=") ||
      code.includes("alt=")
    ) {
      score += 10;
    }

    // Check for proper imports
    if (code.includes("import React") && code.includes("from 'react'")) {
      score += 5;
    }

    // Check for proper exports
    if (
      code.includes("export") &&
      (code.includes("function") || code.includes("const"))
    ) {
      score += 5;
    }

    // Check for error handling
    if (code.includes("try") && code.includes("catch")) {
      score += 5;
    }

    // Check for comments
    if (code.includes("//") || code.includes("/*")) {
      score += 5;
    }

    return Math.min(score, 100);
  }

  async isAvailable(): Promise<boolean> {
    if (!this.apiKey) {
      return false;
    }

    try {
      await this.generateText("Test", { maxTokens: 1 });
      return true;
    } catch {
      return false;
    }
  }

  getProviderName(): string {
    return "gemini";
  }

  hasApiKey(): boolean {
    return !!this.apiKey;
  }

  setApiKey(apiKey: string): void {
    this.apiKey = apiKey;
  }
}
