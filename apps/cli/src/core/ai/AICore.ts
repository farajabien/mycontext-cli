import { AIClient, AIClientOptions, AgentContext } from "../../interfaces/AIClient";
import { GitHubModelsClient } from "../../utils/githubModelsClient";
import { OpenRouterClient } from "../../utils/openRouterClient";
import { LivingContext } from "../../types/living-context";
import { GeminiClient } from "../../utils/geminiClient";
import { XAIClient } from "../../clients/XAIClient";
import { ClaudeAgentClient } from "../../utils/claudeAgentClient";
import chalk from "chalk";
import * as fs from "fs-extra";
import * as path from "path";
import * as dotenv from "dotenv";
import * as dotenvExpand from "dotenv-expand";

export type AIProviderName = "github" | "openrouter" | "gemini" | "xai" | "claude" | "qwen";

export interface AICoreConfig {
  preferredProvider?: AIProviderName;
  fallbackEnabled: boolean;
  workingDirectory: string;
}

/**
 * AICore: The centralized logic for AI provider selection, 
 * token injection, and unified interface for all agents.
 */
export class AICore {
  private static instance: AICore;
  private providers: Map<AIProviderName, AIClient> = new Map();
  private config: AICoreConfig;

  private constructor(config: AICoreConfig) {
    this.config = config;
    this.loadEnvironmentVariables();
    this.initializeProviders();
  }

  public static getInstance(config?: AICoreConfig): AICore {
    if (!AICore.instance) {
      if (!config) {
        throw new Error("AICore must be initialized with config first");
      }
      AICore.instance = new AICore(config);
    }
    return AICore.instance;
  }

  private loadEnvironmentVariables(): void {
    const cwd = this.config.workingDirectory || process.cwd();
    const candidates = [
      path.join(cwd, ".mycontext", ".env.local"),
      path.join(cwd, ".mycontext", ".env"),
      path.join(cwd, ".env.local"),
      path.join(cwd, ".env"),
    ];

    for (const p of candidates) {
      if (fs.existsSync(p)) {
        const result = dotenv.config({ path: p, override: true });
        dotenvExpand.expand(result);
      }
    }
  }

  private initializeProviders(): void {
    // 1. Claude Agent SDK
    const claude = new ClaudeAgentClient();
    if (claude.hasApiKey()) this.providers.set("claude", claude as any);

    // 2. GitHub Models (Primary High Quality)
    const github = new GitHubModelsClient();
    if (github.hasApiKey()) this.providers.set("github", github as any);

    // 3. OpenRouter
    const openrouter = new OpenRouterClient();
    if (openrouter.hasApiKey()) this.providers.set("openrouter", openrouter as any);

    // 4. Gemini
    const gemini = new GeminiClient();
    if (gemini.hasApiKey()) this.providers.set("gemini", gemini as any);

    // 5. XAI
    const xai = new XAIClient();
    if (xai.hasApiKey()) this.providers.set("xai", xai as any);
  }

  public getBestClient(): AIClient {
    // Use override if present
    const envOverride = (process.env.MYCONTEXT_PROVIDER || process.env.AI_PROVIDER) as AIProviderName;
    if (envOverride && this.providers.has(envOverride)) {
      return this.providers.get(envOverride)!;
    }

    if (this.config.preferredProvider && this.providers.has(this.config.preferredProvider)) {
      return this.providers.get(this.config.preferredProvider)!;
    }

    // Default Priority Chain
    const priority: AIProviderName[] = ["claude", "github", "openrouter", "gemini", "xai"];
    for (const name of priority) {
      if (this.providers.has(name)) {
        return this.providers.get(name)!;
      }
    }

    throw new Error("No AI providers available. Please configure API keys (e.g., MYCONTEXT_GITHUB_TOKEN).");
  }

  /**
   * High-level generation utility that handles formatting and basic retries
   */
  public async generateStructuredText<T>(
    prompt: string,
    schema: string,
    options?: AIClientOptions
  ): Promise<T> {
    const client = this.getBestClient();
    const enhancedPrompt = `${prompt}\n\nIMPORTANT: You MUST return ONLY valid JSON that conforms to the following schema:\n${schema}\n\nDo not include code blocks or markdown, just the raw JSON string.`;
    
    const response = await client.generateText(enhancedPrompt, options);
    try {
      // Basic cleanup in case LLM wraps in code blocks
      const cleanJson = response.replace(/^```json\n?/, "").replace(/\n?```$/, "").trim();
      return JSON.parse(cleanJson) as T;
    } catch (e) {
      console.error(chalk.red("Failed to parse AI response as JSON"), response);
      throw new Error("AI failed to produce structured JSON context.");
    }
  }

  /**
   * Proxy for generateText with automatic fallback
   */
  public async generateText(prompt: string, options: AIClientOptions = {}): Promise<string> {
    const clients = this.getAvailableClients();
    let lastError: any = null;

    for (const client of clients) {
      try {
        return await client.generateText(prompt, options);
      } catch (error: any) {
        lastError = error;
        const message = error.message || String(error);
        
        // If it's a rate limit or auth error, log it and try the next client
        if (message.includes("429") || message.toLowerCase().includes("rate limit") || 
            message.includes("401") || message.toLowerCase().includes("unauthorized")) {
          console.log(chalk.yellow(`⚠️  Provider ${client.clientType} failed, trying fallback...`));
          continue;
        }
        
        // For other errors, we might still want to try fallback depending on severity
        console.log(chalk.gray(`ℹ️  Provider ${client.clientType} error: ${message.substring(0, 50)}...`));
      }
    }

    if (lastError) {
      this.handleAIError(lastError);
      throw lastError;
    }
    
    throw new Error("No AI providers available - configure API keys and retry");
  }

  /**
   * Get all clients that have API keys configured, ordered by priority
   */
  private getAvailableClients(): AIClient[] {
    const priority: AIProviderName[] = ["claude", "github", "openrouter", "gemini", "xai"];
    return priority
      .map(type => this.providers.get(type))
      .filter((client): client is AIClient => !!client && client.hasApiKey());
  }

  private handleAIError(error: any): void {
    const message = error.message || String(error);
    
    // GitHub Models Rate Limit (429)
    if (message.includes("429") || message.toLowerCase().includes("rate limit")) {
      console.log(chalk.yellow("\n⚠️  AI Rate Limit Hit (GitHub Models Free Tier)"));
      console.log(chalk.blue("💡 Recommendation:"));
      console.log(chalk.gray("   1. Obtain a FREE OpenRouter API key at https://openrouter.ai/keys"));
      console.log(chalk.gray("   2. Add it to .mycontext/.env: MYCONTEXT_OPENROUTER_API_KEY=sk-or-..."));
      console.log(chalk.gray("   3. Or switch to Gemini by adding GEMINI_API_KEY to your env."));
      return;
    }

    // Generic Auth error
    if (message.includes("401") || message.toLowerCase().includes("unauthorized") || message.toLowerCase().includes("api key")) {
      console.log(chalk.red("\n❌ AI Authentication Error"));
      console.log(chalk.gray("   Please check your API keys in .mycontext/.env"));
      return;
    }
  }

  /**
   * Proxy for generateComponent
   */
  public async generateComponent(
    prompt: string, 
    context?: AgentContext, 
    options: AIClientOptions = {}
  ): Promise<string> {
    return this.getBestClient().generateComponent(prompt, context, options);
  }

  /**
   * Proxy for generateComponentRefinement
   */
  public async generateComponentRefinement(
    componentCode: string,
    prompt: string,
    context?: AgentContext,
    options: AIClientOptions = {}
  ): Promise<string> {
    return this.getBestClient().generateComponentRefinement(componentCode, prompt, context, options);
  }

  /**
   * Get the primary source of truth (Living Brain)
   */
  public async getLivingContext(): Promise<LivingContext | null> {
    try {
      const contextPath = path.join(this.config.workingDirectory, ".mycontext", "context.json");
      if (await fs.pathExists(contextPath)) {
        return await fs.readJson(contextPath);
      }
      return null;
    } catch (error) {
      console.warn("⚠️  Could not load Living Context:", error);
      return null;
    }
  }
}
