import { AICore } from "../core/ai/AICore";
import { logger } from "./logger";
import chalk from "chalk";

/**
 * HybridAIClient (Legacy Wrapper)
 * 
 * This class is now a backward-compatibility layer that delegates to AICore.
 * New code should use AICore.getInstance().getBestClient() directly.
 */
export class HybridAIClient {
  constructor() {
    // AICore is likely already initialized by the command entry point
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

  async getActiveProviderName(): Promise<string> {
    const client = this.client as any;
    return client.providerName || "hybrid";
  }

  async getActiveTextModelName(): Promise<string> {
    return "unified-model";
  }

  async generateText(prompt: string, options: any = {}): Promise<{ text: string; provider: string }> {
    const text = await this.client.generateText(prompt, options);
    return { text, provider: await this.getActiveProviderName() };
  }

  async generateComponent(prompt: string, options: any = {}): Promise<{ code: string; provider: string; explanation?: string }> {
    const result = await this.client.generateComponent(prompt, undefined, options);
    const { code, explanation } = this.parseAIResponse(result);
    return { code, provider: await this.getActiveProviderName(), explanation };
  }

  async generateComponentRefinement(
    componentCode: string,
    prompt: string,
    options: any = {}
  ): Promise<{ code: string; provider: string; explanation?: string }> {
    const result = await this.client.generateComponentRefinement(componentCode, prompt, undefined, options);
    const { code, explanation } = this.parseAIResponse(result);
    return { code, provider: await this.getActiveProviderName(), explanation };
  }

  private parseAIResponse(response: string): { code: string; explanation?: string } {
    // Reuse the parsing logic from old client for compatibility
    const codeBlockPatterns = [
      /```(?:tsx|jsx|ts|js|typescript|javascript)?\s*\n([\s\S]*?)```/g,
      /```(?:tsx|jsx|ts|js|typescript|javascript)?\s*([\s\S]*?)```/g,
      /```\s*\n([\s\S]*?)```/g,
      /```\s*([\s\S]*?)```/g,
    ];

    for (const pattern of codeBlockPatterns) {
      const matches = [...response.matchAll(pattern)];
      if (matches.length > 0) {
        const longestMatch = matches.reduce((longest, match) =>
          (match[1]?.length || 0) > (longest[1]?.length || 0) ? match : longest
        );
        const code = longestMatch[1]?.trim() || "";
        const explanation = response.replace(longestMatch[0], "").trim();
        return { code, explanation: explanation || undefined };
      }
    }

    return { code: response.trim() };
  }
}
