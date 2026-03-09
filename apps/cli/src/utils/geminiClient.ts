import { GoogleGenerativeAI, Content, Part } from "@google/generative-ai";
import { logger } from "./logger";
import axios from "axios"; // Kept for edge cases if needed, but primarily using SDK
import OpenAI from "openai";

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
  text?: string; // Backward compatibility alias
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

import { AIClient, AIClientOptions, AgentContext, GenerationResult } from "../interfaces/AIClient";

/**
 * Gemini API Client using official Google Generative AI SDK
 * Supports text generation, multimodal interaction, and visual generation
 */
export class GeminiClient implements AIClient {
  readonly clientType = "direct-api" as const;
  readonly supportsTools = false;
  readonly supportsStreaming = false;

  private apiKey?: string;
  private genAI?: GoogleGenerativeAI;
  private model: string;

  private readonly MODELS = [
    "gemini-3.1-flash-lite-preview",  // 3.1 Flash Lite — cheapest ($0.25/$1.50 per 1M)
    "gemini-3.1-pro-preview",         // 3.1 Pro — highest capability ($2/$12 per 1M)
    "gemini-3.1-flash-image-preview", // 3.1 Flash Image — multimodal
    "gemini-2.5-flash",               // 2.5 Flash — fast ($0.15/$0.60 per 1M)
    "gemini-2.0-flash",               // 2.0 Flash — stable fallback
    "gemini-1.5-pro",                 // 1.5 Pro — legacy
    "gemini-1.5-flash",               // 1.5 Flash — legacy
    "gemini-2.0-flash-exp",           // Flash 2.0 Experimental
    "gemini-pro",                     // Legacy Pro
  ];

  constructor() {
    this.model = this.MODELS[0] || "gemini-1.5-flash";
    this.initializeClient();
  }

  /**
   * Initialize SDK client
   */
  private initializeClient() {
    try {
      const key = this.getApiKey();
      if (key) {
        // Use v1 for stable models by default
        this.genAI = new GoogleGenerativeAI(key);
      }
    } catch (e) {
      // Ignore if key missing, will ensure check availability later
    }
  }

  /**
   * Get Gemini API key from environment
   */
  private getApiKey(): string {
    if (this.apiKey) {
      return this.apiKey;
    }

    const key =
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_API_KEY ||
      process.env.MYCONTEXT_GEMINI_API_KEY;

    if (key) {
      this.apiKey = key;
      // Debug: Log key prefix to verify if terminal or file key is used
      if (process.env.DEBUG || process.env.VERBOSE) {
        logger.debug(`Gemini: Using API key starting with ${key.substring(0, 8)}... (Source: ${process.env.GEMINI_API_KEY ? 'Terminal/Env' : 'Project File'})`);
      }
    }
    return key || "";
  }

  /**
   * Check if Gemini client has a valid API key
   */
  hasApiKey(): boolean {
    return !!this.getApiKey();
  }

  /**
   * Set API key for Gemini API
   */
  setApiKey(apiKey: string): void {
    this.apiKey = apiKey;
    this.initializeClient();
  }

  /**
   * Check connection to Gemini API
   */
  async checkConnection(): Promise<boolean> {
    try {
      if (!this.genAI) this.initializeClient();
      if (!this.genAI) return false;
      
      const model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      await model.generateContent("ping");
      return true;
    } catch (error) {
      logger.error("Gemini connection check failed:", error);
      return false;
    }
  }

  /**
   * Get GitHub token for text backups
   */
  private getGitHubToken(): string | undefined {
    return (
      process.env.GITHUB_TOKEN ||
      process.env.MYCONTEXT_GITHUB_TOKEN
    );
  }

  /**
   * Generate text completion using Gemini or GitHub Models (Fallback/Cost-Saving)
   */
  async generateText(
    prompt: string,
    options: AIClientOptions = {}
  ): Promise<string> {
    const input: GeminiMessage[] = [{ role: "user", content: prompt }];
    const config: GeminiGenerationConfig = {
      temperature: options.temperature,
      maxTokens: options.maxTokens,
    };

    const response = await this.executeGenerateText(input, config);
    return response.content;
  }

  /**
   * Generate text and return full GenerationResult including token usage.
   * Use this when you need token counts for cost tracking.
   */
  async generateTextResult(
    prompt: string,
    options: AIClientOptions = {}
  ): Promise<GenerationResult> {
    const input: GeminiMessage[] = [{ role: "user", content: prompt }];
    const config: GeminiGenerationConfig = {
      temperature: options.temperature,
      maxTokens: options.maxTokens,
    };
    const response = await this.executeGenerateText(input, config);
    return {
      content: response.content,
      model: response.model,
      provider: response.model?.includes("github-models") ? "github" : "gemini",
      usage: response.usage
        ? {
            inputTokens: response.usage.promptTokens,
            outputTokens: response.usage.completionTokens,
            totalTokens: response.usage.totalTokens,
          }
        : undefined,
    };
  }

  /**
   * Internal generation logic that returns rich response
   */
  private async executeGenerateText(
    input: GeminiMessage[] | string,
    config?: GeminiGenerationConfig
  ): Promise<GeminiResponse> {
    const githubToken = this.getGitHubToken();
    
    // Normalize input to array of messages
    const messages = typeof input === "string" ? [{ role: "user", content: input }] as GeminiMessage[] : input;

    // Use GitHub Models if available for strict text generation (Cost Savings)
    if (githubToken) {
       try {
           logger.debug("Routing text generation to GitHub Models for cost optimization");
           const openai = new OpenAI({
               baseURL: "https://models.inference.ai.azure.com",
               apiKey: githubToken,
           });

           const sysMsg = messages.find(m => m.role === "system");
           const completion = await openai.chat.completions.create({
               messages: messages.map(m => ({
                   role: m.role,
                   content: m.content
               })),
               model: "gpt-4o-mini",
               temperature: config?.temperature ?? 0.7,
               max_tokens: config?.maxTokens ?? 8192,
               top_p: config?.topP ?? 0.95,
           });

           return {
               content: completion.choices[0]?.message.content || "",
               text: completion.choices[0]?.message.content || "",
               model: "gpt-4o-mini (github-models)",
               finishReason: completion.choices[0]?.finish_reason,
               usage: completion.usage ? {
                   promptTokens: completion.usage.prompt_tokens,
                   completionTokens: completion.usage.completion_tokens,
                   totalTokens: completion.usage.total_tokens
               } : undefined
           };
       } catch(error: any) {
           logger.warn(`GitHub Models failed: ${error.message}. Falling back to Gemini...`);
       }
    }

    if (!this.genAI) {
        this.initializeClient();
        if (!this.genAI) throw new Error("Gemini API key not configured");
    }

    let lastError: any;

    // Extract system instruction if present
    const systemMessage = messages.find(m => m.role === "system");
    const systemInstruction = systemMessage ? systemMessage.content : undefined;

    // Convert remaining messages to SDK Content format
    const history = this.convertMessagesToContent(messages.filter(m => m.role !== "system"));

    // Try models in order
    for (const modelName of this.MODELS) {
      // Robust Endpoint Sweeping: Try both v1 and v1beta for each model
      // 2.0 models usually need v1beta, 1.5 models usually use v1
      const endpoints = modelName.includes("2.0") || modelName.includes("exp") 
        ? ["v1beta", "v1"] 
        : ["v1", "v1beta"];
        
      for (const apiVersion of endpoints) {
        try {
          const fullModelName = modelName.startsWith("models/") ? modelName : `models/${modelName}`;
          
          const model = this.genAI.getGenerativeModel({ 
              model: fullModelName,
              systemInstruction: systemInstruction
          }, { apiVersion });

          logger.debug(`Gemini: Generating with ${fullModelName} (${apiVersion})`);

        const generationConfig = {
            temperature: config?.temperature ?? 0.7,
            maxOutputTokens: config?.maxTokens ?? 8192,
            topP: config?.topP ?? 0.95,
            topK: config?.topK ?? 40,
            stopSequences: config?.stopSequences,
        };

        if (history.length === 0) {
             throw new Error("No user content provided for generation");
        }

        const result = await model.generateContent({
            contents: history,
            generationConfig
        });

        const response = await result.response;
        const text = response.text();
        const usage = result.response.usageMetadata;

        return {
            content: text,
            text: text, 
            model: modelName,
            finishReason: response.candidates?.[0]?.finishReason,
            usage: usage ? {
                promptTokens: usage.promptTokenCount,
                completionTokens: usage.candidatesTokenCount,
                totalTokens: usage.totalTokenCount
            } : undefined
        };

      } catch (error: any) {
        lastError = error;
        
        // Handle rate limit specifically - don't keep trying other models if rate limited
        if (error.message?.includes("429") || error.message?.includes("Too Many Requests")) {
            logger.warn(`Gemini model ${modelName} is rate limited (429). Stop trying other models.`);
            throw new Error(`Gemini rate limit reached (429). Please wait a moment or upgrade your tier.`);
        }

        if (process.env.DEBUG || process.env.VERBOSE) {
            logger.warn(`Gemini (${modelName}) failed: ${error.message}, trying next...`);
        } else {
            // Still log failing models for visibility in non-debug mode but concisely
            console.error(`⚠️ Gemini model ${modelName} failed: ${error.message.substring(0, 100)}${error.message.length > 100 ? '...' : ''}`);
        }
        continue;
        }
      }
    }
    
    logger.error("All Gemini models failed:", lastError?.message);
    throw new Error(`Gemini generation failed: ${lastError?.message || "Unknown error"}`);
  }

  /**
   * Convert simplified messages to SDK Content format
   */
  private convertMessagesToContent(messages: GeminiMessage[]): Content[] {
    return messages.map(msg => ({
        role: msg.role === "assistant" ? "model" : "user",
        parts: [{ text: msg.content }]
    }));
  }

  /**
   * Generate visual screen (HTML + optional screenshot) using Gemini + nanobanana
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

      const systemPrompt = this.buildVisualPrompt(prompt, context);

      const response = await this.executeGenerateText(
        [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt },
        ],
        config
      );

      const html = this.extractHtml(response.content);

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

  private buildVisualPrompt(userPrompt: string, context?: any): string {
    let prompt = `You are an expert UI/UX designer and frontend developer. Generate a complete, production-ready HTML page based on the following requirements.
IMPORTANT: Output ONLY valid HTML code within \`\`\`html blocks.
`;
    if (context?.brand) prompt += `\n## BRAND:\n${context.brand}\n`;
    if (context?.prd) prompt += `\n## CONTEXT:\n${context.prd}\n`;
    if (context?.flows) prompt += `\n## FLOWS:\n${context.flows}\n`;
    if (context?.sampleData) prompt += `\n## DATA:\n${JSON.stringify(context.sampleData, null, 2)}\n`;
    
    if (context?.imagesManifest) {
      const assets = Array.isArray(context.imagesManifest.assets) ? context.imagesManifest.assets : (context.imagesManifest.visualAssets || context.imagesManifest);
      if (Array.isArray(assets)) {
        prompt += `\n## LOCAL VISUAL ASSETS (CRITICAL - USE THESE PATHS):\n`;
        assets.forEach((a: any) => {
          prompt += `- ${a.id}: /assets/images/${a.id}.png (${a.description})\n`;
        });
        prompt += `\nSTRICT REQUIREMENT: Use these LOCAL paths provided for all relevant images. DO NOT use Unsplash or placeholders.\n`;
      }
    }
    
    prompt += `\n## REQUEST:\n${userPrompt}\n`;
    return prompt;
  }

  private extractHtml(content: string): string {
    const htmlBlock = content.match(/```html\n([\s\S]*?)\n```/);
    if (htmlBlock?.[1]) return htmlBlock[1].trim();
    
    const codeBlock = content.match(/```\n([\s\S]*?)\n```/);
    if (codeBlock?.[1]) return codeBlock[1].trim();
    
    if (content.includes("<!DOCTYPE html>") || content.includes("<html")) return content.trim();
    return content;
  }

  /**
   * Generate component using Gemini
   */
  async generateComponent(
    prompt: string,
    context?: AgentContext,
    options: AIClientOptions = {}
  ): Promise<string> {
    const visualResponse = await this.generateVisualScreen(prompt, context as any, options as any);
    return visualResponse.html;
  }

  /**
   * Generate component refinement using Gemini
   */
  async generateComponentRefinement(
    componentCode: string,
    prompt: string,
    context?: AgentContext,
    options: AIClientOptions = {}
  ): Promise<string> {
    const refinementPrompt = `Refine this component: ${prompt}\n\nExisting Code:\n${componentCode}`;
    return this.generateText(refinementPrompt, options);
  }

  /**
   * Generate text from image (Vision implementation of interface)
   */
  async generateVisionText(
    prompt: string,
    imagePath: string,
    options: AIClientOptions = {}
  ): Promise<string> {
    const response = await this.generateFromImage(prompt, imagePath, {
      ...options,
      systemPrompt: options.systemPrompt
    });
    return response.content;
  }

  private async generateScreenshot(html: string): Promise<string> {
    logger.debug("Screenshot generation not yet implemented");
    return "";
  }

  /**
   * List available models
   */
  async listModels(): Promise<string[]> {
    return this.MODELS;
  }

  /**
   * Generate image using Gemini (Implement via Imagen or specific multimodal if available)
   * Note: Currently implemented as a placeholder for agentic fulfillment.
   */
  async generateImage(
    prompt: string,
    outputPath: string,
    options?: AIClientOptions
  ): Promise<string> {
    logger.debug(`Gemini: Requested image generation for: ${prompt}`);
    // In a real environment, this would call Imagen 3 or similar GCP API
    // For this CLI, we log it so the Agentic layer can fulfill or use a placeholder
    
    // Check for GITHUB_TOKEN which might allow some image models if added later
    
    throw new Error("Direct image generation not yet implemented in GeminiClient. Agentic fulfillment required.");
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    // No specific cleanup for Gemini SDK
  }

  /**
   * Generate text from image input (multimodal)
   */
  async generateFromImage(
    prompt: string,
    imagePath: string,
    config?: GeminiGenerationConfig & { systemPrompt?: string }
  ): Promise<GeminiResponse> {
    if (!this.genAI) this.initializeClient();
    if (!this.genAI) throw new Error("Gemini API key not configured");

    try {
      logger.debug(`Gemini: Generating from image: ${imagePath}`);
      // Helper to encode image
      
      // We need just the base64 data and mimeType, assuming VisionUtils provides that or path
      // Note: VisionUtils usually returns a Part object correct for REST API. 
      // For SDK, we use inlineData. 
      // Let's assume we read file ourselves to be safe and dependent-less if possible.
      
      const fs = await import('fs');
      
      const imageBuffer = await fs.promises.readFile(imagePath);
      const mimeType = this.getMimeType(imagePath);
      
      const imagePart = {
          inlineData: {
              data: imageBuffer.toString('base64'),
              mimeType: mimeType
          }
      };

      const systemInstruction = config?.systemPrompt;

      // Try models
      for (const modelName of this.MODELS) {
          try {
              const model = this.genAI.getGenerativeModel({ model: modelName, systemInstruction });
              const result = await model.generateContent([prompt, imagePart]);
              const response = await result.response;
              
              return {
                  content: response.text(),
                  model: modelName,
                  finishReason: response.candidates?.[0]?.finishReason
              };
          } catch (e) {
              continue;
          }
      }
      throw new Error("All vision models failed");

    } catch (error: any) {
      logger.error("Gemini vision generation failed:", error.message);
      throw new Error(`Gemini vision generation failed: ${error.message}`);
    }
  }

  private getMimeType(filePath: string): string {
    const ext = filePath.toLowerCase().split('.').pop();
    switch (ext) {
      case 'png': return 'image/png';
      case 'jpg':
      case 'jpeg': return 'image/jpeg';
      case 'webp': return 'image/webp';
      case 'heic': return 'image/heic';
      case 'heif': return 'image/heif';
      default: return 'image/jpeg';
    }
  }
}
