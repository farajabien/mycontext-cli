/**
 * HostedApiClient - OpenRouter-based AI client with generous free tier
 *
 * Uses OpenRouter's API with DeepSeek R1 for powerful, free AI generation.
 * Works without API key (with rate limits), or add OPENROUTER_API_KEY for higher limits.
 */

// Polyfill fetch for Node < 18
import fetch from "node-fetch";
import * as path from "path";
import * as fs from "fs";

export interface HostedApiResponse {
  success: boolean;
  content?: string;
  data?: any;
  error?: string;
  metadata?: any;
  usage?: {
    tokens: number;
    cost: number;
    remaining: number;
  };
  pricing?: {
    plan: string;
    monthly_cost: number;
    usage_this_month: number;
  };
}

export class HostedApiClient {
  private modelName: string;
  private apiUrl: string;
  private apiKey: string | null;

  constructor(apiKey?: string) {
    // Load model name from config
    this.modelName = this.loadModelFromConfig();

    // Use OpenRouter API
    this.apiUrl =
      process.env.MYCONTEXT_API_URL ||
      "https://openrouter.ai/api/v1/chat/completions";

    // Optional API key for higher limits
    this.apiKey =
      apiKey ||
      process.env.MYCONTEXT_API_KEY ||
      process.env.OPENROUTER_API_KEY ||
      null;
  }

  private loadModelFromConfig(): string {
    try {
      // Try to load from model-versions.json
      const configPath = path.join(__dirname, "../config/model-versions.json");
      if (fs.existsSync(configPath)) {
        const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
        if (config.current) {
          return config.current;
        }
      }
    } catch (error) {
      // Fallback if config can't be loaded
      console.warn("⚠️  Could not load model config, using default");
    }

    // Fallback to env var or default free model
    return process.env.MYCONTEXT_MODEL_NAME || "deepseek/deepseek-r1";
  }

  async generateText(
    prompt: string,
    options: any = {}
  ): Promise<HostedApiResponse> {
    // Require API key for OpenRouter
    if (!this.apiKey) {
      return {
        success: false,
        error:
          `OpenRouter API key required. Get your free API key at https://openrouter.ai/keys\n\n` +
          `Then add it to your .env file:\n` +
          `MYCONTEXT_OPENROUTER_API_KEY=sk-or-xxx\n\n` +
          `Or set it directly:\n` +
          `export MYCONTEXT_OPENROUTER_API_KEY=sk-or-xxx`,
      };
    }

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "HTTP-Referer": "https://github.com/farajabien/mycontext-cli",
        "X-Title": "MyContext CLI",
        Authorization: `Bearer ${this.apiKey}`,
      };

      console.log(`🔍 DEBUG: Calling OpenRouter API: ${this.apiUrl}`);
      console.log(`🔍 DEBUG: Model: ${this.modelName}`);
      console.log(`🔍 DEBUG: Auth: Yes (API key provided)`);

      const response = await fetch(this.apiUrl, {
        method: "POST",
        headers,
        body: JSON.stringify({
          model: this.modelName,
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
          max_tokens: options.maxTokens || 4000,
          temperature: options.temperature || 0.7,
        }),
      });

      console.log(`🔍 DEBUG: Response status: ${response.status}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ DEBUG: OpenRouter error: ${errorText}`);
        throw new Error(
          `OpenRouter API error (${response.status}): ${errorText.substring(
            0,
            200
          )}`
        );
      }

      const data = await response.json();
      console.log(
        `🔍 DEBUG: Response data type: ${typeof data}, hasChoices: ${!!data.choices}`
      );

      // Extract content from OpenRouter response format
      let generatedText = "";
      if (data.choices && data.choices[0]?.message?.content) {
        generatedText = data.choices[0].message.content;
      } else {
        console.error(
          `❌ DEBUG: Unexpected OpenRouter response:`,
          JSON.stringify(data).substring(0, 500)
        );
        throw new Error("Unexpected OpenRouter response format");
      }

      console.log(`✅ DEBUG: Generated ${generatedText.length} characters`);

      return {
        success: true,
        content: generatedText,
        data: { message: generatedText },
      };
    } catch (error: any) {
      console.error(`❌ DEBUG: Full error:`, error);
      return {
        success: false,
        error: `MyContext AI failed: ${error.message}`,
      };
    }
  }

  async generateComponent(
    prompt: string,
    options: any = {}
  ): Promise<HostedApiResponse> {
    // Use same OpenRouter endpoint as generateText
    return this.generateText(prompt, options);
  }

  async checkConnection(): Promise<boolean> {
    // OpenRouter has generous free tier, always return true
    return true;
  }

  async getPricing(): Promise<any> {
    return {
      success: true,
      data: {
        plan: "free",
        description: "OpenRouter free tier with DeepSeek R1",
      },
    };
  }

  async generateContext(
    type: string,
    prompt: string,
    options: any = {}
  ): Promise<HostedApiResponse> {
    // Use same OpenRouter endpoint as generateText
    return this.generateText(prompt, options);
  }

  async getUsage(period: string = "month"): Promise<any> {
    return {
      success: true,
      data: {
        message: "Usage tracking not available for OpenRouter free tier",
      },
    };
  }

  async subscribeToPlan(plan: string, paymentMethod?: any): Promise<any> {
    // Not applicable for OpenRouter free tier
    return {
      success: false,
      error: "Subscriptions not available for OpenRouter free tier",
    };
  }

  hasApiKey(): boolean {
    // Always return true since OpenRouter works without auth
    return true;
  }
}
