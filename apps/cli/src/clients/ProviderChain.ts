import {
  AIClient,
  AIClientOptions,
  AgentContext,
} from "../interfaces/AIClient";
import { AICore } from "../core/ai/AICore";

/**
 * Simplified Provider Chain for MyContext CLI
 * 
 * Re-implemented as a wrapper around AICore to ensure unification.
 */
export class ProviderChain implements AIClient {
  readonly clientType = "hybrid" as const;
  readonly supportsTools = true;
  readonly supportsStreaming = false;

  constructor() {
    // AICore is likely already initialized
    try {
      AICore.getInstance();
    } catch (e) {
      AICore.getInstance({
        workingDirectory: process.cwd(),
        fallbackEnabled: true
      });
    }
  }

  private get client() {
    return AICore.getInstance().getBestClient();
  }

  hasApiKey(): boolean {
    return this.client.hasApiKey();
  }

  setApiKey(apiKey: string): void {
    this.client.setApiKey(apiKey);
  }

  async checkConnection(): Promise<boolean> {
    return this.client.checkConnection();
  }

  async generateText(prompt: string, options: AIClientOptions = {}): Promise<string> {
    return this.client.generateText(prompt, options);
  }

  async generateComponent(
    prompt: string,
    context?: AgentContext,
    options: AIClientOptions = {}
  ): Promise<string> {
    return this.client.generateComponent(prompt, context, options);
  }

  async generateComponentRefinement(
    componentCode: string,
    prompt: string,
    context?: AgentContext,
    options: AIClientOptions = {}
  ): Promise<string> {
    return this.client.generateComponentRefinement(componentCode, prompt, context, options);
  }

  async listModels(): Promise<string[]> {
    return this.client.listModels();
  }

  // Legacy compatibility methods
  getPrimaryProvider(): any {
    return this.client;
  }

  getProvider(name: string): any {
    return this.client;
  }

  getProviderStatus(): any[] {
    return [{
      name: "AICore",
      hasKey: this.hasApiKey(),
      connected: true
    }];
  }

  async checkAllConnections(): Promise<any[]> {
    return this.getProviderStatus();
  }

  async cleanup(): Promise<void> {
    if (this.client.cleanup) {
      await this.client.cleanup();
    }
  }
}

let providerChainInstance: ProviderChain | null = null;

export function getProviderChain(): ProviderChain {
  if (!providerChainInstance) {
    providerChainInstance = new ProviderChain();
  }
  return providerChainInstance;
}

export function resetProviderChain(): void {
  providerChainInstance = null;
}
