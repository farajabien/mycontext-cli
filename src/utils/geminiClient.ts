import { GoogleGenerativeAI, Content, Part } from "@google/generative-ai";
import { logger } from "./logger";
import axios from "axios"; // Kept for edge cases if needed, but primarily using SDK

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

/**
 * Gemini API Client using official Google Generative AI SDK
 * Supports text generation, multimodal interaction, and visual generation
 */
export class GeminiClient {
  private apiKey?: string;
  private genAI?: GoogleGenerativeAI;
  private model: string;

  private readonly MODELS = [
    "gemini-2.0-flash",           // Latest stable Flash
    "gemini-2.0-flash-exp",       // Experimental Flash 2.0
    "gemini-1.5-flash",           // Stable 1.5 Flash
    "gemini-1.5-flash-latest",    // Alias for latest 1.5 Flash
    "gemini-1.5-pro",             // Stable 1.5 Pro
    "gemini-1.5-pro-latest"       // Alias for latest 1.5 Pro
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
   * Generate text completion using Gemini with fallback
   */
  async generateText(
    input: GeminiMessage[] | string,
    config?: GeminiGenerationConfig
  ): Promise<GeminiResponse> {
    if (!this.genAI) {
        this.initializeClient();
        if (!this.genAI) throw new Error("Gemini API key not configured");
    }

    let lastError: any;
    
    // Normalize input to array of messages
    const messages = typeof input === "string" ? [{ role: "user", content: input }] as GeminiMessage[] : input;

    // Extract system instruction if present
    const systemMessage = messages.find(m => m.role === "system");
    const systemInstruction = systemMessage ? systemMessage.content : undefined;

    // Convert remaining messages to SDK Content format
    const history = this.convertMessagesToContent(messages.filter(m => m.role !== "system"));

    // Try models in order
    for (const modelName of this.MODELS) {
      try {
        this.model = modelName;
        const model = this.genAI.getGenerativeModel({ 
            model: modelName,
            systemInstruction: systemInstruction
        });

        logger.debug(`Gemini: Generating with ${modelName}`);

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

      const response = await this.generateText(
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

  private async generateScreenshot(html: string): Promise<string> {
    logger.debug("Screenshot generation not yet implemented");
    return "";
  }

  /**
   * Test Gemini API connection
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.generateText("Say 'Hello' if connected.");
      return true;
    } catch (error) {
      logger.error("Gemini connection test failed:", error);
      return false;
    }
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

  async listModels(): Promise<string[]> {
      return this.MODELS;
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
