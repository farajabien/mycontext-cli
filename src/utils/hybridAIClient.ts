import { ClaudeAgentClient } from "./claudeAgentClient";
import { HostedApiClient } from "./hostedApiClient";
import { logger, LogLevel } from "./logger";
import chalk from "chalk";
import * as fs from "fs";
import * as path from "path";

// Load environment variables from project files
function loadEnvironmentVariables(): void {
  try {
    const dotenv = require("dotenv");
    const dotenvExpand = require("dotenv-expand");
    const cwd = process.cwd();
    const candidates = [
      path.join(cwd, ".mycontext", ".env.local"),
      path.join(cwd, ".mycontext", ".env"),
      path.join(cwd, ".env.local"),
      path.join(cwd, ".env"),
    ];
    for (const p of candidates) {
      if (fs.existsSync(p)) {
        const result = dotenv.config({ path: p });
        dotenvExpand.expand(result);
      }
    }
  } catch {
    // Ignore errors
  }
}

export interface AIProvider {
  name: string;
  priority: number; // Lower number = higher priority
  client: any; // Simplified to any to avoid missing client types
  isAvailable: () => Promise<boolean>;
}

export interface AIProviderConfig {
  enabled: boolean;
  priority: number;
  models: Record<string, any>;
  api: {
    baseUrl: string;
    timeout: number;
    retries: number;
  };
}

export interface AIConfig {
  github: AIProviderConfig;
  huggingface: AIProviderConfig;
  fallback: AIProviderConfig;
  xai?: AIProviderConfig;
  openai?: AIProviderConfig;
  claude?: AIProviderConfig;
  qwen?: AIProviderConfig;
  gemini?: AIProviderConfig;
}

export class HybridAIClient {
  private providers: AIProvider[] = [];
  private currentProvider: AIProvider | null = null;
  private config: AIConfig | null = null;
  private static hasLoggedInitialization = false;

  constructor() {
    // Load environment variables first
    loadEnvironmentVariables();

    this.loadConfig();
    this.initializeProviders();
  }

  /**
   * Load AI provider configuration
   */
  private loadConfig() {
    try {
      const configPath = path.join(__dirname, "../config/ai-providers.json");
      const configData = fs.readFileSync(configPath, "utf8");
      this.config = JSON.parse(configData);
    } catch (error) {
      logger.debug("Could not load config, using defaults");
      this.config = null;
    }
  }

  /**
   * Initialize available AI providers based on configuration
   */
  private async initializeProviders() {
    // Add user API key providers first (highest priority)
    // Claude Agent SDK (highest priority for advanced features)
    // Always try ClaudeAgentClient if it has an API key (simplified approach)
    const claudeAgentClient = new ClaudeAgentClient();
    if (claudeAgentClient.hasApiKey()) {
      // Determine provider name based on mode
      const providerName = claudeAgentClient.isGrokModeEnabled
        ? "xai"
        : "claude-agent";

      // Log the provider being used (only once)
      if (!HybridAIClient.hasLoggedInitialization) {
        if (claudeAgentClient.isGrokModeEnabled) {
          console.log(chalk.blue("🤖 Using Grok 4 via X AI API (direct)"));
        } else {
          console.log(
            chalk.blue(
              "🎯 Using Claude Agent SDK (supports Claude, Bedrock, Vertex AI)"
            )
          );
        }
        HybridAIClient.hasLoggedInitialization = true;
      }

      this.providers.push({
        name: providerName,
        priority: 0, // Highest priority for Agent SDK
        client: claudeAgentClient,
        isAvailable: () => claudeAgentClient.checkConnection(),
      });
    }

    // Sort providers by priority (lower number = higher priority)
    this.providers.sort((a, b) => a.priority - b.priority);

    // Add hosted API as fallback if no local providers are available
    if (this.providers.length === 0) {
      const hostedClient = new HostedApiClient();
      this.providers.push({
        name: "hosted",
        priority: 10, // Lower priority than local providers
        client: hostedClient,
        isAvailable: () => hostedClient.checkConnection(),
      });

      // Only log once to avoid spam
      if (!HybridAIClient.hasLoggedInitialization) {
        console.log(`Using hosted AI service`);
        HybridAIClient.hasLoggedInitialization = true;
      }
    } else {
      // Provider-specific message already logged above, no need for generic message
    }

    // Sort by priority
    this.providers.sort((a, b) => a.priority - b.priority);

    logger.verbose(`Initialized ${this.providers.length} AI providers`);
    if (logger.getLogLevel() >= LogLevel.VERBOSE) {
      this.providers.forEach((p) => {
        logger.verbose(`  • ${p.name} (priority: ${p.priority})`);
      });
    }
  }

  /**
   * Get the best available provider
   */
  private async getBestProvider(): Promise<AIProvider | null> {
    // Optional override via env - this takes highest priority
    const preferredName =
      process.env.MYCONTEXT_PROVIDER || process.env.AI_PROVIDER || "";
    if (preferredName) {
      const preferred = this.providers.find((p) => p.name === preferredName);
      if (preferred) {
        console.log(
          `[HybridAIClient] Environment override: using ${preferredName}`
        );
        try {
          if (await preferred.isAvailable()) {
            this.currentProvider = preferred;
            return preferred;
          } else {
            console.log(
              `[HybridAIClient] Preferred provider ${preferred.name} not available, falling back to priority order`
            );
          }
        } catch (error) {
          console.log(
            `[HybridAIClient] Preferred provider ${preferred.name} not available: ${error}, falling back to priority order`
          );
        }
      } else {
        console.log(
          `[HybridAIClient] Preferred provider ${preferredName} not found in available providers`
        );
      }
    }

    // Choose the highest-priority available provider
    for (const provider of this.providers) {
      try {
        const isAvailable = await provider.isAvailable();
        if (isAvailable) {
          this.currentProvider = provider;
          return provider;
        }
      } catch (error) {
        console.log(
          `[HybridAIClient] Provider ${provider.name} not available: ${error}`
        );
      }
    }
    return null;
  }

  /**
   * Expose current/next-best provider name for UX (e.g., spinner labels)
   */
  async getActiveProviderName(): Promise<string> {
    const provider = await this.getBestProvider();
    return provider?.name ?? "unknown";
  }

  /**
   * Best-effort model name for generic text generation per provider
   */
  async getActiveTextModelName(): Promise<string> {
    const provider = await this.getBestProvider();
    if (!provider) return "unknown";

    if (provider.name === "github") {
      // If user provided candidates via env, prefer the first
      const envCandidates = process.env.MYCONTEXT_MODEL_CANDIDATES;
      if (envCandidates) {
        const first = envCandidates
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)[0];
        if (first) return first;
      }
      return (
        this.config?.github?.models?.["component-generator"]?.name ||
        process.env.MYCONTEXT_MODEL ||
        "grok-3"
      );
    }
    if (provider.name === "openai") {
      return (
        this.config?.openai?.models?.["text-generator"]?.name || "gpt-3.5-turbo"
      );
    }
    if (provider.name === "claude") {
      return (
        this.config?.claude?.models?.["text-generator"]?.name ||
        "claude-3-5-sonnet-20241022"
      );
    }
    if (provider.name === "huggingface") {
      return (
        this.config?.huggingface?.models?.["component-generator"]?.name ||
        "mycontext/react-component-generator"
      );
    }
    if (provider.name === "gemini") {
      return (
        this.config?.gemini?.models?.["text-generator"]?.name ||
        "gemini-2.0-flash"
      );
    }
    if (provider.name === "xai") {
      return (
        this.config?.xai?.models?.["text-generator"]?.name ||
        "grok-4-fast-reasoning"
      );
    }
    // Default model name
    return "qwen3-coder";
  }

  /**
   * Generate component refinement using the best available provider
   */
  async generateComponentRefinement(
    componentCode: string,
    prompt: string,
    options: any = {}
  ): Promise<{ code: string; provider: string; explanation?: string }> {
    const provider = await this.getBestProvider();

    if (!provider) {
      throw new Error(
        "No AI providers available. Please configure Qwen API key or other providers."
      );
    }

    try {
      logger.verbose(`Using AI provider: ${provider.name}`);

      let result: string;

      if (provider.name === "qwen") {
        const qwenClient = provider.client as any;
        result = await qwenClient.generateComponentRefinement(
          componentCode,
          prompt,
          options
        );
      } else if (provider.name === "github") {
        const githubClient = provider.client as any;
        result = await githubClient.generateComponentRefinement(
          componentCode,
          prompt,
          options
        );
      } else if (provider.name === "openai") {
        const openaiClient = provider.client as any;
        result = await openaiClient.generateComponentRefinement(
          componentCode,
          prompt,
          options
        );
      } else if (provider.name === "claude") {
        const claudeClient = provider.client as any;
        result = await claudeClient.generateComponentRefinement(
          componentCode,
          prompt,
          options
        );
      } else if (provider.name === "huggingface") {
        const huggingFaceClient = provider.client as any;
        result = await huggingFaceClient.generateComponentRefinement(
          componentCode,
          prompt,
          options
        );
      } else if (provider.name === "gemini") {
        const geminiClient = provider.client as any;
        const response = await geminiClient.generateText(
          `Refine this React component: ${componentCode}\n\nUser request: ${prompt}`,
          options
        );
        result = response.text;
      } else if (provider.name === "xai") {
        const xaiClient = provider.client as any;
        const modelName = await this.getActiveTextModelName();
        result = await xaiClient.generateComponentRefinement(
          componentCode,
          prompt,
          { ...options, model: modelName }
        );
      } else {
        // No fallback - fail cleanly
        throw new Error("AI generation failed - no fallbacks allowed");
      }

      // Extract code and explanation
      const { code, explanation } = this.parseAIResponse(result);

      return {
        code,
        provider: provider.name,
        explanation,
      };
    } catch (error: any) {
      console.log(
        `[HybridAIClient] Provider ${provider.name} failed: ${error.message}`
      );

      // Try next provider
      const nextProvider = this.providers.find(
        (p) => p.priority > provider.priority
      );
      if (nextProvider) {
        console.log(
          `[HybridAIClient] Trying next provider: ${nextProvider.name}`
        );
        return this.generateComponentRefinement(componentCode, prompt, options);
      }

      throw error;
    }
  }

  /**
   * Generate new component using the best available provider
   */
  async generateComponent(
    prompt: string,
    options: any = {}
  ): Promise<{ code: string; provider: string; explanation?: string }> {
    return this.tryGenerateWithProviders(prompt, options, []);
  }

  private async tryGenerateWithProviders(
    prompt: string,
    options: any,
    failedProviders: string[] = [],
    maxRetries: number = 3
  ): Promise<{ code: string; provider: string; explanation?: string }> {
    // Find next available provider not in failed list
    for (const provider of this.providers) {
      if (failedProviders.includes(provider.name)) {
        continue;
      }

      try {
        logger.verbose(`Using AI provider: ${provider.name}`);

        let result: string;

        if (provider.name === "qwen") {
          const qwenClient = provider.client as any;
          result = await qwenClient.generateComponent(prompt, options);
        } else if (provider.name === "github") {
          const githubClient = provider.client as any;
          result = await githubClient.generateComponent(prompt, options);
        } else if (provider.name === "openai") {
          const openaiClient = provider.client as any;
          result = await openaiClient.generateComponent(prompt, options);
        } else if (provider.name === "claude") {
          const claudeClient = provider.client as any;
          result = await claudeClient.generateComponent(prompt, options);
        } else if (provider.name === "huggingface") {
          const huggingFaceClient = provider.client as any;
          result = await huggingFaceClient.generateComponent(prompt, options);
        } else if (provider.name === "gemini") {
          const geminiClient = provider.client as any;
          const response = await geminiClient.generateComponent(
            prompt,
            options
          );
          result = response.code;
        } else if (provider.name === "xai") {
          const xaiClient = provider.client as any;
          const modelName = await this.getActiveTextModelName();
          result = await xaiClient.generateComponent(prompt, {
            ...options,
            model: modelName,
          });
        } else if (provider.name === "hosted") {
          const hostedClient = provider.client as HostedApiClient;
          const response = await hostedClient.generateComponent(
            prompt,
            options
          );
          if (response.success && response.content) {
            result = response.content;
          } else {
            throw new Error(response.error || "Hosted API generation failed");
          }
        } else {
          // No fallback - fail cleanly
          throw new Error("AI generation failed - no fallbacks allowed");
        }

        // Extract code and explanation
        const { code, explanation } = this.parseAIResponse(result);

        return {
          code,
          provider: provider.name,
          explanation,
        };
      } catch (error: any) {
        console.log(
          `[HybridAIClient] Provider ${provider.name} failed: ${error.message}`
        );

        // Add to failed list and continue to next provider
        failedProviders.push(provider.name);

        // If this is a 402 Payment Required error, don't retry the same provider
        if (
          error.message.includes("402") ||
          error.message.includes("Payment Required")
        ) {
          console.log(
            `[HybridAIClient] Skipping ${provider.name} due to payment/credit issues`
          );
          continue;
        }

        // If this is a rate limit error, add to failed list but don't give up immediately
        if (
          error.message.includes("429") ||
          error.message.includes("Rate limit") ||
          error.message.includes("RateLimitReached")
        ) {
          console.log(
            `[HybridAIClient] ${provider.name} rate limited, will try other providers first`
          );
          // Don't add to failed list immediately - try other providers first
          continue;
        }
      }
    }

    // All providers failed
    const failedList = failedProviders.join(", ");
    console.log(chalk.red("❌ All AI providers failed"));
    console.log(chalk.yellow("💡 All AI providers failed. Retry options:"));
    console.log(chalk.gray("  1. Wait for rate limits to reset"));
    console.log(chalk.gray("  2. Check API key configuration"));
    console.log(chalk.gray("  3. Try again later"));
    throw new Error(
      `All AI providers failed: ${failedList}. Retry when conditions improve.`
    );
  }

  /**
   * Generate generic text (used for PRD, types, brand, etc.)
   */
  async generateText(
    prompt: string,
    options: any = {}
  ): Promise<{ text: string; provider: string }> {
    const spinnerCallback = options.spinnerCallback;
    const provider = await this.getBestProvider();
    const timeout = options.timeout || 60000; // 1 minute timeout per provider for faster UX

    if (!provider) {
      // No providers available - fail cleanly
      console.log(chalk.red("❌ No AI providers available"));
      console.log(chalk.yellow("💡 Configure API keys and retry"));
      throw new Error(
        "No AI providers available - configure API keys and retry"
      );
    }

    try {
      let text: string;

      // Wrap each provider call with timeout
      const providerCall = async () => {
        if (provider.name === "qwen") {
          const qwenClient = provider.client as any;
          return await qwenClient.generateText(prompt, options);
        } else if (provider.name === "github") {
          const githubClient = provider.client as any;
          return await githubClient.generateText(prompt, options);
        } else if (provider.name === "openai") {
          const openaiClient = provider.client as any;
          return await openaiClient.generateText(prompt, options);
        } else if (provider.name === "claude") {
          const claudeClient = provider.client as any;
          return await claudeClient.generateText(prompt, options);
        } else if (provider.name === "huggingface") {
          const hfClient = provider.client as any;
          return await hfClient.generateComponent(prompt, options);
        } else if (provider.name === "gemini") {
          const geminiClient = provider.client as any;
          const response = await geminiClient.generateText(prompt, options);
          return response.text;
        } else if (provider.name === "xai") {
          const xaiClient = provider.client as any;
          const modelName = await this.getActiveTextModelName();
          return await xaiClient.generateText(prompt, {
            ...options,
            model: modelName,
          });
        } else if (provider.name === "hosted") {
          const hostedClient = provider.client as HostedApiClient;
          const response = await hostedClient.generateText(prompt, options);
          if (response.success && response.content) {
            return response.content;
          } else {
            throw new Error(response.error || "Hosted API generation failed");
          }
        } else {
          // No fallback - fail cleanly
          throw new Error("AI generation failed - no fallbacks allowed");
        }
      };

      // Execute with timeout
      text = await Promise.race([
        providerCall(),
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error(`Timeout after ${timeout}ms`)),
            timeout
          )
        ),
      ]);

      return { text, provider: provider.name };
    } catch (error: any) {
      console.log(
        `[HybridAIClient] Provider ${provider.name} failed: ${error.message}`
      );

      // Try next provider if available
      const nextProvider = this.providers.find(
        (p) => p.priority > provider.priority
      );
      if (nextProvider) {
        console.log(
          `[HybridAIClient] Trying next provider: ${nextProvider.name}`
        );
        // Update spinner for next provider attempt
        if (spinnerCallback) {
          spinnerCallback(`🤖 Generating with ${nextProvider.name}...`, true);
        }
        return this.generateText(prompt, options);
      }

      // All providers failed - fail cleanly
      console.log(chalk.red("❌ All AI providers failed"));
      console.log(
        chalk.yellow("💡 MyContext requires 100% accuracy - no fallbacks")
      );
      console.log(chalk.blue("🔄 Retry options:"));
      console.log(chalk.gray("  1. Wait for rate limits to reset"));
      console.log(chalk.gray("  2. Use a different AI provider"));
      console.log(chalk.gray("  3. Check your API key configuration"));
      console.log(
        chalk.gray(
          "  4. Try again later with: mycontext generate context --full"
        )
      );
      throw new Error(
        "All AI providers failed - retry when conditions improve"
      );
    }
  }

  /**
   * Parse AI response to separate code from explanation
   * Enhanced with better pattern matching and truncation handling
   */
  private parseAIResponse(response: string): {
    code: string;
    explanation?: string;
  } {
    console.log(`🔍 DEBUG: Parsing AI response (length: ${response.length})`);
    console.log(`🔍 DEBUG: Response preview: ${response.substring(0, 200)}...`);

    // Check if response is truncated (common issue)
    if (response.length < 100) {
      console.warn(
        `⚠️  WARNING: Response appears truncated (${response.length} chars)`
      );
    }

    // Enhanced code block detection - look for any code block markers
    const codeBlockPatterns = [
      /```(?:tsx|jsx|ts|js|typescript|javascript)?\s*\n([\s\S]*?)```/g,
      /```(?:tsx|jsx|ts|js|typescript|javascript)?\s*([\s\S]*?)```/g,
      /```\s*\n([\s\S]*?)```/g,
      /```\s*([\s\S]*?)```/g,
    ];

    for (const pattern of codeBlockPatterns) {
      const matches = [...response.matchAll(pattern)];
      if (matches.length > 0) {
        // Use the longest match (most complete code)
        const longestMatch = matches.reduce((longest, match) =>
          (match[1]?.length || 0) > (longest[1]?.length || 0) ? match : longest
        );

        const code = longestMatch[1]?.trim() || "";
        const explanation = response.replace(longestMatch[0], "").trim();

        console.log(`✅ DEBUG: Found code block (${code.length} chars)`);
        return {
          code,
          explanation: explanation || undefined,
        };
      }
    }

    // Enhanced JSX/TSX content detection
    const jsxPatterns = [
      // Complete component with imports
      /(?:import\s+.*?;\s*)*\s*(?:export\s+)?(?:function|const)\s+\w+.*?{[\s\S]*?}(?:\s*export\s+default\s+\w+;?)?/g,
      // Function/const component
      /(?:export\s+)?(?:function|const)\s+\w+.*?{[\s\S]*?}/g,
      // Class component
      /(?:export\s+)?class\s+\w+.*?{[\s\S]*?}/g,
      // Interface/type definitions
      /(?:export\s+)?(?:interface|type)\s+\w+.*?{[\s\S]*?}/g,
    ];

    for (const pattern of jsxPatterns) {
      const matches = [...response.matchAll(pattern)];
      if (matches.length > 0) {
        // Use the longest match (most complete code)
        const longestMatch = matches.reduce((longest, match) =>
          match[0].length > longest[0].length ? match : longest
        );

        const code = longestMatch[0].trim();
        const explanation = response.replace(longestMatch[0], "").trim();

        console.log(`✅ DEBUG: Found JSX/TSX content (${code.length} chars)`);
        return {
          code,
          explanation: explanation || undefined,
        };
      }
    }

    // Look for incomplete code that might be truncated
    const incompletePatterns = [
      // Incomplete function/const
      /(?:export\s+)?(?:function|const)\s+\w+.*?{[\s\S]*$/,
      // Incomplete import statements
      /import\s+.*?$/,
      // Incomplete interface/type
      /(?:export\s+)?(?:interface|type)\s+\w+.*?{[\s\S]*$/,
    ];

    for (const pattern of incompletePatterns) {
      const match = response.match(pattern);
      if (match) {
        console.warn(
          `⚠️  WARNING: Found incomplete code pattern (${match[0].length} chars)`
        );
        console.warn(`⚠️  WARNING: This suggests the response was truncated`);

        // Try to complete the incomplete code
        let code = match[0].trim();

        // If it ends with an incomplete function, try to close it
        if (code.includes("{") && !code.includes("}")) {
          code +=
            "\n  // TODO: Complete this component - response was truncated\n  return <div>Incomplete component</div>;\n}";
        }

        return {
          code,
          explanation:
            "⚠️  WARNING: Response appears to be truncated. Please retry with a different model or increase token limits.",
        };
      }
    }

    // If no patterns match, return the whole response as code
    console.log(
      `⚠️  WARNING: No code patterns found, returning full response as code`
    );
    return { code: response };
  }

  /**
   * Get provider status
   */
  async getProviderStatus(): Promise<
    Array<{ name: string; available: boolean; priority: number }>
  > {
    const status = [];

    for (const provider of this.providers) {
      try {
        const available = await provider.isAvailable();
        status.push({
          name: provider.name,
          available,
          priority: provider.priority,
        });
      } catch (error) {
        status.push({
          name: provider.name,
          available: false,
          priority: provider.priority,
        });
      }
    }

    return status;
  }

  /**
   * Set Hugging Face API key
   */
  setHuggingFaceApiKey(apiKey: string): void {
    const huggingFaceProvider = this.providers.find(
      (p) => p.name === "huggingface"
    );
    if (huggingFaceProvider) {
      (huggingFaceProvider.client as any).setApiKey(apiKey);
    }
  }

  /**
   * Set OpenAI API key
   */
  setOpenAIApiKey(apiKey: string): void {
    const openaiProvider = this.providers.find((p) => p.name === "openai");
    if (openaiProvider) {
      (openaiProvider.client as any).setApiKey(apiKey);
    }
  }

  /**
   * Set Claude API key
   */
  setClaudeApiKey(apiKey: string): void {
    const claudeProvider = this.providers.find((p) => p.name === "claude");
    if (claudeProvider) {
      (claudeProvider.client as any).setApiKey(apiKey);
    }
  }

  /**
   * Set Gemini API key
   */
  setGeminiApiKey(apiKey: string): void {
    const geminiProvider = this.providers.find((p) => p.name === "gemini");
    if (geminiProvider) {
      (geminiProvider.client as any).setApiKey(apiKey);
    }
  }

  async getAvailableProviders(): Promise<AIProvider[]> {
    return this.providers;
  }

  async getAllProviders(): Promise<AIProvider[]> {
    return this.providers;
  }

  /**
   * Set Claude Agent API key
   */
  setClaudeAgentApiKey(apiKey: string): void {
    const claudeAgentProvider = this.providers.find(
      (p) => p.name === "claude-agent"
    );
    if (claudeAgentProvider) {
      (claudeAgentProvider.client as ClaudeAgentClient).setApiKey(apiKey);
    }
  }

  /**
   * Generate component using Claude Agent SDK with enhanced context
   */
  async generateComponentWithAgent(
    prompt: string,
    context: any = {},
    options: any = {}
  ): Promise<string> {
    const claudeAgentProvider = this.providers.find(
      (p) => p.name === "claude-agent"
    );

    if (claudeAgentProvider && (await claudeAgentProvider.isAvailable())) {
      const agentClient = claudeAgentProvider.client as ClaudeAgentClient;
      return await agentClient.generateComponent(prompt, context, options);
    }

    // Fallback to regular component generation
    const result = await this.generateComponent(prompt, options);
    return typeof result === "string" ? result : result.code;
  }

  /**
   * Run agent workflow with Claude Agent SDK
   */
  async runAgentWorkflow(
    workflowPrompt: string,
    context: any = {},
    options: any = {}
  ): Promise<{ content: string; context: any }> {
    const claudeAgentProvider = this.providers.find(
      (p) => p.name === "claude-agent"
    );

    if (claudeAgentProvider && (await claudeAgentProvider.isAvailable())) {
      const agentClient = claudeAgentProvider.client as ClaudeAgentClient;
      return await agentClient.runAgentWorkflow(
        workflowPrompt,
        context,
        options
      );
    }

    // Fallback to regular text generation
    const result = await this.generateText(workflowPrompt, options);
    const content = typeof result === "string" ? result : result.text;
    return { content, context };
  }

  /**
   * Check if Claude Agent SDK is available
   */
  async isClaudeAgentAvailable(): Promise<boolean> {
    const claudeAgentProvider = this.providers.find(
      (p) => p.name === "claude-agent"
    );
    return claudeAgentProvider
      ? await claudeAgentProvider.isAvailable()
      : false;
  }

  /**
   * Get Claude Agent SDK client if available
   */
  getClaudeAgentClient(): ClaudeAgentClient | null {
    const claudeAgentProvider = this.providers.find(
      (p) => p.name === "claude-agent"
    );
    return claudeAgentProvider
      ? (claudeAgentProvider.client as ClaudeAgentClient)
      : null;
  }

  // MyContext requires 100% accuracy - no fallbacks allowed
}
