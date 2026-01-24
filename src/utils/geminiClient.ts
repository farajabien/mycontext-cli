import { logger } from "./logger";
import axios, { AxiosInstance } from "axios";

export interface GeminiMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface GeminiGenerationConfig {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  topK?: number;
  stopSequences?: string[];
}

export interface GeminiResponse {
  content: string;
  model: string;
  finishReason?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface GeminiVisualResponse {
  html: string;
  screenshot?: string; // base64 encoded PNG
  metadata: {
    model: string;
    timestamp: string;
    prompt: string;
  };
}

/**
 * Gemini API Client with nanobanana support for visual generation
 * Supports both text generation and HTML/screenshot generation
 */
export class GeminiClient {
  private apiKey: string;
  private baseUrl: string;
  private client: AxiosInstance;
  private model: string;

  constructor() {
    this.apiKey = this.getApiKey();
    this.baseUrl = "https://generativelanguage.googleapis.com/v1beta";
    this.model = "gemini-2.0-flash-exp"; // Latest Gemini model

    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 120000, // 2 minutes for complex generations
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  /**
   * Get Gemini API key from environment
   */
  private getApiKey(): string {
    const key =
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_API_KEY ||
      process.env.MYCONTEXT_GEMINI_API_KEY;

    if (!key) {
      throw new Error(
        "Gemini API key not found. Set GEMINI_API_KEY in .mycontext/.env"
      );
    }

    return key;
  }

  /**
   * Check if Gemini client has a valid API key
   */
  hasApiKey(): boolean {
    try {
      this.getApiKey();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Generate text completion using Gemini
   */
  async generateText(
    messages: GeminiMessage[],
    config?: GeminiGenerationConfig
  ): Promise<GeminiResponse> {
    try {
      logger.debug("Gemini: Generating text completion");

      // Convert messages to Gemini format
      const contents = this.convertMessages(messages);

      const response = await this.client.post(
        `/models/${this.model}:generateContent?key=${this.apiKey}`,
        {
          contents,
          generationConfig: {
            temperature: config?.temperature ?? 0.7,
            maxOutputTokens: config?.maxTokens ?? 4000,
            topP: config?.topP ?? 0.95,
            topK: config?.topK ?? 40,
            stopSequences: config?.stopSequences,
          },
        }
      );

      const candidate = response.data.candidates?.[0];
      if (!candidate) {
        throw new Error("No response from Gemini");
      }

      const content = candidate.content?.parts?.[0]?.text || "";
      const usage = response.data.usageMetadata;

      return {
        content,
        model: this.model,
        finishReason: candidate.finishReason,
        usage: usage
          ? {
              promptTokens: usage.promptTokenCount || 0,
              completionTokens: usage.candidatesTokenCount || 0,
              totalTokens: usage.totalTokenCount || 0,
            }
          : undefined,
      };
    } catch (error: any) {
      logger.error("Gemini generation failed:", error.message);
      throw new Error(`Gemini generation failed: ${error.message}`);
    }
  }

  /**
   * Generate visual screen (HTML + optional screenshot) using Gemini + nanobanana
   * This uses Gemini's multimodal capabilities to generate HTML
   */
  async generateVisualScreen(
    prompt: string,
    context?: {
      prd?: string;
      brand?: string;
      flows?: string;
      sampleData?: any;
    },
    config?: GeminiGenerationConfig & { includeScreenshot?: boolean }
  ): Promise<GeminiVisualResponse> {
    try {
      logger.debug("Gemini: Generating visual screen");

      // Build comprehensive prompt for HTML generation
      const systemPrompt = this.buildVisualPrompt(prompt, context);

      const response = await this.generateText(
        [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        config
      );

      // Extract HTML from response
      const html = this.extractHtml(response.content);

      // Optionally generate screenshot using nanobanana-style rendering
      let screenshot: string | undefined;
      if (config?.includeScreenshot) {
        screenshot = await this.generateScreenshot(html);
      }

      return {
        html,
        screenshot,
        metadata: {
          model: this.model,
          timestamp: new Date().toISOString(),
          prompt: prompt,
        },
      };
    } catch (error: any) {
      logger.error("Visual screen generation failed:", error.message);
      throw new Error(`Visual screen generation failed: ${error.message}`);
    }
  }

  /**
   * Build comprehensive prompt for visual screen generation
   */
  private buildVisualPrompt(
    userPrompt: string,
    context?: {
      prd?: string;
      brand?: string;
      flows?: string;
      sampleData?: any;
    }
  ): string {
    let prompt = `You are an expert UI/UX designer and frontend developer. Generate a complete, production-ready HTML page based on the following requirements.

IMPORTANT INSTRUCTIONS:
- Generate COMPLETE, VALID HTML with inline CSS
- Use modern, responsive design principles
- Include realistic content and data
- Use semantic HTML5 elements
- Make it mobile-first and accessible
- Include all necessary meta tags and viewport settings
- Use CSS Grid or Flexbox for layouts
- Add smooth transitions and hover states
- Ensure high contrast for readability
- Output ONLY the HTML code, wrapped in \`\`\`html code blocks

`;

    if (context?.brand) {
      prompt += `\n## BRAND GUIDELINES:\n${context.brand}\n`;
    }

    if (context?.prd) {
      prompt += `\n## PROJECT CONTEXT:\n${context.prd}\n`;
    }

    if (context?.flows) {
      prompt += `\n## USER FLOWS:\n${context.flows}\n`;
    }

    if (context?.sampleData) {
      prompt += `\n## SAMPLE DATA (use this for realistic content):\n${JSON.stringify(context.sampleData, null, 2)}\n`;
    }

    prompt += `\n## USER REQUEST:\n${userPrompt}\n`;

    return prompt;
  }

  /**
   * Extract HTML from Gemini response (handles markdown code blocks)
   */
  private extractHtml(content: string): string {
    // Try to extract from code blocks first
    const htmlBlockMatch = content.match(/```html\n([\s\S]*?)\n```/);
    if (htmlBlockMatch && htmlBlockMatch[1]) {
      return htmlBlockMatch[1].trim();
    }

    // Try generic code blocks
    const codeBlockMatch = content.match(/```\n([\s\S]*?)\n```/);
    if (codeBlockMatch && codeBlockMatch[1]) {
      return codeBlockMatch[1].trim();
    }

    // If no code blocks, check if it's already HTML
    if (content.includes("<!DOCTYPE html>") || content.includes("<html")) {
      return content.trim();
    }

    // Last resort: return as-is and hope for the best
    logger.warn("Could not extract HTML from response, using raw content");
    return content;
  }

  /**
   * Generate screenshot from HTML using nanobanana-style approach
   * For now, this is a placeholder - actual implementation would use puppeteer/playwright
   * or a headless browser API
   */
  private async generateScreenshot(html: string): Promise<string> {
    // TODO: Implement actual screenshot generation
    // Options:
    // 1. Use Puppeteer/Playwright locally
    // 2. Use a screenshot API service
    // 3. Use Gemini's native screenshot capabilities (if available)

    logger.debug("Screenshot generation not yet implemented");
    return ""; // Return empty string for now

    // Future implementation:
    // const browser = await puppeteer.launch();
    // const page = await browser.newPage();
    // await page.setContent(html);
    // const screenshot = await page.screenshot({ encoding: 'base64' });
    // await browser.close();
    // return screenshot;
  }

  /**
   * Convert messages to Gemini API format
   */
  private convertMessages(messages: GeminiMessage[]): any[] {
    return messages
      .filter((msg) => msg.role !== "system") // Gemini doesn't support system messages directly
      .map((msg) => ({
        role: msg.role === "assistant" ? "model" : "user",
        parts: [{ text: msg.content }],
      }));
  }

  /**
   * Test Gemini API connection
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.generateText([
        {
          role: "user",
          content: "Say 'Hello from Gemini' if you can read this.",
        },
      ]);
      return true;
    } catch (error) {
      logger.error("Gemini connection test failed:", error);
      return false;
    }
  }

  /**
   * Get available Gemini models
   */
  async listModels(): Promise<string[]> {
    try {
      const response = await this.client.get(`/models?key=${this.apiKey}`);
      return (
        response.data.models?.map((model: any) => model.name) || [this.model]
      );
    } catch (error) {
      logger.warn("Could not list Gemini models:", error);
      return [this.model];
    }
  }
}
