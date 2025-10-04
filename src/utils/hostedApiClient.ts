import { HybridAIClient } from "./hybridAIClient";
import { getApiUrl } from "../config/api";

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
  private baseUrl: string;
  private apiKey?: string;

  constructor(apiKey?: string) {
    this.baseUrl = getApiUrl("");
    this.apiKey = apiKey;

    // Try to load auth token from stored auth if no API key provided
    if (!this.apiKey) {
      this.loadStoredAuth();
    }
  }

  private async loadStoredAuth(): Promise<void> {
    try {
      const fs = require("fs-extra");
      const path = require("path");
      const authPath = path.join(process.cwd(), ".mycontext", "auth.json");

      if (await fs.pathExists(authPath)) {
        const auth = await fs.readJson(authPath);
        if (auth?.token) {
          this.apiKey = auth.token;
        }
      }
    } catch (error) {
      // Ignore errors
    }
  }

  async generateText(
    prompt: string,
    options: any = {}
  ): Promise<HostedApiResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(this.apiKey && { Authorization: `Bearer ${this.apiKey}` }),
        },
        body: JSON.stringify({
          message: prompt,
          context: options.context || {},
          model: options.model || "mycontext",
          temperature: options.temperature || 0.7,
          maxTokens: options.maxTokens || 4000,
          stream: false,
        }),
      });

      if (!response.ok) {
        const error = (await response.json()) as any;
        throw new Error(error.error || `HTTP ${response.status}`);
      }

      const result = (await response.json()) as any;
      return {
        success: result.success,
        content: result.data?.message,
        data: result.data,
        error: result.error,
        usage: result.data?.usage,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Hosted API request failed",
      };
    }
  }

  async generateComponent(
    prompt: string,
    options: any = {}
  ): Promise<HostedApiResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/components`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(this.apiKey && { Authorization: `Bearer ${this.apiKey}` }),
        },
        body: JSON.stringify({
          component: {
            name: options.componentName || "Component",
            description: prompt,
          },
          group: options.group || "general",
          context: options.context || {},
          model: options.model || "mycontext",
          temperature: options.temperature || 0.7,
          maxTokens: options.maxTokens || 4000,
          withTests: options.withTests || false,
        }),
      });

      if (!response.ok) {
        try {
          const errorText = await response.text();
          console.log(
            "🔍 DEBUG: Hosted API error response preview:",
            errorText.substring(0, 200)
          );

          // Try to parse as JSON, fallback to text
          let error;
          try {
            error = JSON.parse(errorText);
          } catch {
            error = { error: errorText };
          }
          throw new Error(error.error || `HTTP ${response.status}`);
        } catch (parseError) {
          throw new Error(
            `HTTP ${response.status}: ${parseError instanceof Error ? parseError.message : String(parseError)}`
          );
        }
      }

      try {
        const resultText = await response.text();
        console.log(
          "🔍 DEBUG: Hosted API success response preview:",
          resultText.substring(0, 200)
        );

        // Check if response looks like JSON
        if (
          !resultText.trim().startsWith("{") &&
          !resultText.trim().startsWith("[")
        ) {
          console.warn(
            "❌ DEBUG: Hosted API response doesn't look like JSON, got:",
            resultText.substring(0, 100)
          );
          throw new Error(
            `Hosted API returned non-JSON response: ${resultText.substring(0, 100)}...`
          );
        }

        const result = JSON.parse(resultText);
        return {
          success: result.success,
          content: result.data?.component?.code,
          data: result.data,
          error: result.error,
          usage: result.data?.usage,
        };
      } catch (parseError) {
        console.error("❌ DEBUG: Hosted API JSON parsing failed:", parseError);
        throw new Error(
          `Hosted API response parsing failed: ${parseError instanceof Error ? parseError.message : String(parseError)}`
        );
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Hosted API request failed",
      };
    }
  }

  async checkConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/pricing`, {
        method: "GET",
        headers: {
          ...(this.apiKey && { Authorization: `Bearer ${this.apiKey}` }),
        },
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async getPricing(): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/pricing`, {
        method: "GET",
        headers: {
          ...(this.apiKey && { Authorization: `Bearer ${this.apiKey}` }),
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Failed to fetch pricing",
      };
    }
  }

  async generateContext(
    type: string,
    prompt: string,
    options: any = {}
  ): Promise<HostedApiResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(this.apiKey && { Authorization: `Bearer ${this.apiKey}` }),
        },
        body: JSON.stringify({
          type,
          prompt,
          context: options.context || {},
          model: options.model || "mycontext",
          temperature: options.temperature || 0.7,
          maxTokens: options.maxTokens || 4000,
        }),
      });

      if (!response.ok) {
        const error = (await response.json()) as any;
        throw new Error(error.error || `HTTP ${response.status}`);
      }

      const result = (await response.json()) as any;
      return {
        success: result.success,
        content: result.data?.content,
        data: result.data,
        error: result.error,
        usage: result.data?.usage,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Hosted API request failed",
      };
    }
  }

  async getUsage(period: string = "month"): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/usage?period=${period}`, {
        method: "GET",
        headers: {
          ...(this.apiKey && { Authorization: `Bearer ${this.apiKey}` }),
        },
      });

      if (!response.ok) {
        const error = (await response.json()) as any;
        throw new Error(error.error || `HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Failed to fetch usage",
      };
    }
  }

  async subscribeToPlan(plan: string, paymentMethod?: any): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/pricing`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(this.apiKey && { Authorization: `Bearer ${this.apiKey}` }),
        },
        body: JSON.stringify({
          plan,
          paymentMethod,
        }),
      });

      if (!response.ok) {
        const error = (await response.json()) as any;
        throw new Error(error.error || `HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Failed to subscribe to plan",
      };
    }
  }

  hasApiKey(): boolean {
    return !!this.apiKey;
  }
}
