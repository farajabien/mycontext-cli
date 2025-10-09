import {
  AIClient,
  AIClientOptions,
  AgentContext,
} from "../interfaces/AIClient";
import { MyContextAIClient } from "./MyContextAIClient";
import { ClaudeSDKClient } from "./ClaudeSDKClient";
import { XAIClient } from "./XAIClient";
import { EnrichedContext } from "../types/design-pipeline";

/**
 * Simplified Provider Chain for MyContext CLI
 *
 * Primary: MyContext AI (Fine-tuned GPT-4o Mini)
 * Fallback 1: Claude SDK
 * Fallback 2: XAI (Grok)
 *
 * This replaces the complex HybridAIClient with a streamlined approach
 * focused on our specialized fine-tuned model.
 */
export class ProviderChain implements AIClient {
  readonly clientType = "hybrid" as const;
  readonly supportsTools = true;
  readonly supportsStreaming = false;

  private providers: AIClient[];
  private myContextAI: MyContextAIClient;
  private claudeSDK: ClaudeSDKClient;
  private xai: XAIClient;

  constructor() {
    // Initialize providers in order of preference
    this.myContextAI = new MyContextAIClient();
    this.claudeSDK = new ClaudeSDKClient();
    this.xai = new XAIClient();

    this.providers = [
      this.myContextAI, // Primary: Fine-tuned model
      this.claudeSDK, // Fallback 1: Claude SDK
      this.xai, // Fallback 2: XAI (Grok)
    ];
  }

  /**
   * Check if any provider has API key configured
   */
  hasApiKey(): boolean {
    return this.providers.some((provider) => provider.hasApiKey());
  }

  /**
   * Set API key for all providers
   */
  setApiKey(apiKey: string): void {
    this.providers.forEach((provider) => {
      if (provider.setApiKey) {
        provider.setApiKey(apiKey);
      }
    });
  }

  /**
   * Check connection to any available provider
   */
  async checkConnection(): Promise<boolean> {
    for (const provider of this.providers) {
      try {
        const isConnected = await provider.checkConnection();
        if (isConnected) {
          return true;
        }
      } catch (error) {
        console.warn(
          `Provider ${provider.constructor.name} connection failed:`,
          error
        );
        continue;
      }
    }
    return false;
  }

  /**
   * Generate text using the first available provider
   */
  async generateText(
    prompt: string,
    options: AIClientOptions = {}
  ): Promise<string> {
    for (const provider of this.providers) {
      try {
        if (!provider.hasApiKey()) {
          console.warn(
            `Provider ${provider.constructor.name} has no API key, skipping`
          );
          continue;
        }

        const result = await provider.generateText(prompt, options);
        console.log(`✅ Generated text using ${provider.constructor.name}`);
        return result;
      } catch (error) {
        console.warn(`❌ Provider ${provider.constructor.name} failed:`, error);
        continue;
      }
    }

    throw new Error("All AI providers failed to generate text");
  }

  /**
   * Generate React component using MyContext AI with fallbacks
   */
  async generateComponent(
    prompt: string,
    context?: AgentContext,
    options: AIClientOptions = {}
  ): Promise<string> {
    for (const provider of this.providers) {
      try {
        if (!provider.hasApiKey()) {
          console.warn(
            `Provider ${provider.constructor.name} has no API key, skipping`
          );
          continue;
        }

        const result = await provider.generateComponent(
          prompt,
          context,
          options
        );
        console.log(
          `✅ Generated component using ${provider.constructor.name}`
        );
        return result;
      } catch (error) {
        console.warn(`❌ Provider ${provider.constructor.name} failed:`, error);
        continue;
      }
    }

    throw new Error("All AI providers failed to generate component");
  }

  /**
   * Generate component refinement using the first available provider
   */
  async generateComponentRefinement(
    componentCode: string,
    prompt: string,
    context?: AgentContext,
    options: AIClientOptions = {}
  ): Promise<string> {
    for (const provider of this.providers) {
      try {
        if (!provider.hasApiKey()) {
          console.warn(
            `Provider ${provider.constructor.name} has no API key, skipping`
          );
          continue;
        }

        const result = await provider.generateComponentRefinement(
          componentCode,
          prompt,
          context,
          options
        );
        console.log(`✅ Refined component using ${provider.constructor.name}`);
        return result;
      } catch (error) {
        console.warn(`❌ Provider ${provider.constructor.name} failed:`, error);
        continue;
      }
    }

    throw new Error("All AI providers failed to refine component");
  }

  /**
   * List models from all providers
   */
  async listModels(): Promise<string[]> {
    const allModels: string[] = [];

    for (const provider of this.providers) {
      try {
        if (provider.hasApiKey()) {
          const models = await provider.listModels();
          allModels.push(...models);
        }
      } catch (error) {
        console.warn(
          `Failed to list models from ${provider.constructor.name}:`,
          error
        );
        continue;
      }
    }

    return [...new Set(allModels)]; // Remove duplicates
  }

  /**
   * Get the primary provider (MyContext AI)
   */
  getPrimaryProvider(): MyContextAIClient {
    return this.myContextAI;
  }

  /**
   * Get provider by name
   */
  getProvider(name: string): AIClient | null {
    switch (name.toLowerCase()) {
      case "mycontext":
      case "mycontext-ai":
        return this.myContextAI;
      case "claude":
      case "claude-sdk":
        return this.claudeSDK;
      case "xai":
      case "grok":
        return this.xai;
      default:
        return null;
    }
  }

  /**
   * Get provider status
   */
  getProviderStatus(): Array<{
    name: string;
    hasKey: boolean;
    connected: boolean;
  }> {
    return this.providers.map((provider) => ({
      name: provider.constructor.name,
      hasKey: provider.hasApiKey(),
      connected: false, // Will be updated by checkConnection
    }));
  }

  /**
   * Check all provider connections
   */
  async checkAllConnections(): Promise<
    Array<{ name: string; hasKey: boolean; connected: boolean }>
  > {
    const statuses = await Promise.all(
      this.providers.map(async (provider) => {
        const hasKey = provider.hasApiKey();
        let connected = false;

        if (hasKey) {
          try {
            connected = await provider.checkConnection();
          } catch (error) {
            connected = false;
          }
        }

        return {
          name: provider.constructor.name,
          hasKey,
          connected,
        };
      })
    );

    return statuses;
  }

  /**
   * Cleanup all providers
   */
  async cleanup(): Promise<void> {
    await Promise.all(
      this.providers.map(async (provider) => {
        if (provider.cleanup) {
          try {
            await provider.cleanup();
          } catch (error) {
            console.warn(
              `Failed to cleanup ${provider.constructor.name}:`,
              error
            );
          }
        }
      })
    );
  }
}

/**
 * Singleton instance of the provider chain
 */
let providerChainInstance: ProviderChain | null = null;

/**
 * Get the global provider chain instance
 */
export function getProviderChain(): ProviderChain {
  if (!providerChainInstance) {
    providerChainInstance = new ProviderChain();
  }
  return providerChainInstance;
}

/**
 * Reset the global provider chain instance
 */
export function resetProviderChain(): void {
  if (providerChainInstance) {
    providerChainInstance.cleanup();
  }
  providerChainInstance = null;
}
