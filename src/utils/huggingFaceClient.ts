import fetch from "node-fetch";

export interface HuggingFaceResponse {
  generated_text: string;
  // Add other response fields as needed
}

export interface HuggingFaceOptions {
  model: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  doSample?: boolean;
}

export class HuggingFaceClient {
  private baseUrl = "https://api-inference.huggingface.co";
  private apiKey: string | null = null;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.HUGGINGFACE_API_KEY || null;
  }

  /**
   * Check if Hugging Face is available
   */
  async checkConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        headers: this.getHeaders(),
        signal: AbortSignal.timeout(10000), // 10 second timeout
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  /**
   * Generate component refinement using Hugging Face
   */
  async generateComponentRefinement(
    componentCode: string,
    prompt: string,
    options: Partial<HuggingFaceOptions> = {}
  ): Promise<string> {
    const defaultOptions: HuggingFaceOptions = {
      model: "mycontext/react-component-refiner", // Our specialized model
      temperature: 0.1,
      maxTokens: 2048,
      topP: 0.9,
      doSample: true,
      ...options,
    };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 45000); // 45 second timeout

      const requestBody = {
        inputs: `Component Code:\n\`\`\`tsx\n${componentCode}\n\`\`\`\n\nRefinement Prompt: ${prompt}\n\nEnhanced Component:`,
        parameters: {
          temperature: defaultOptions.temperature,
          max_new_tokens: defaultOptions.maxTokens,
          top_p: defaultOptions.topP,
          do_sample: defaultOptions.doSample,
          return_full_text: false,
        },
      };

      console.log(`[HuggingFaceClient] Using model: ${defaultOptions.model}`);
      console.log(
        `[HuggingFaceClient] Sending request to: ${this.baseUrl}/models/${defaultOptions.model}`
      );

      const response = await fetch(
        `${this.baseUrl}/models/${defaultOptions.model}`,
        {
          method: "POST",
          headers: this.getHeaders(),
          body: JSON.stringify(requestBody),
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = (await response.json()) as HuggingFaceResponse[];
      const generatedText = data[0]?.generated_text || "";

      // Extract just the component code if the model returns explanatory text
      return this.extractComponentCode(generatedText, componentCode);
    } catch (error: any) {
      if (error.name === "AbortError") {
        throw new Error("Component refinement timed out after 45 seconds");
      }
      throw new Error(
        `Failed to generate component refinement: ${error.message}`
      );
    }
  }

  /**
   * Generate new components using Hugging Face
   */
  async generateComponent(
    prompt: string,
    options: Partial<HuggingFaceOptions> = {}
  ): Promise<string> {
    const defaultOptions: HuggingFaceOptions = {
      model: "mycontext/react-component-generator", // Our component generation model
      temperature: 0.1,
      maxTokens: 2048,
      topP: 0.9,
      doSample: true,
      ...options,
    };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout

      const requestBody = {
        inputs: `Generate a React component for: ${prompt}\n\nComponent:`,
        parameters: {
          temperature: defaultOptions.temperature,
          max_new_tokens: defaultOptions.maxTokens,
          top_p: defaultOptions.topP,
          do_sample: defaultOptions.doSample,
          return_full_text: false,
        },
      };

      const response = await fetch(
        `${this.baseUrl}/models/${defaultOptions.model}`,
        {
          method: "POST",
          headers: this.getHeaders(),
          body: JSON.stringify(requestBody),
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = (await response.json()) as HuggingFaceResponse[];
      const generatedText = data[0]?.generated_text || "";

      return this.extractComponentCode(generatedText);
    } catch (error: any) {
      if (error.name === "AbortError") {
        throw new Error("Component generation timed out after 60 seconds");
      }
      throw new Error(`Failed to generate component: ${error.message}`);
    }
  }

  /**
   * Extract component code from generated text
   */
  private extractComponentCode(
    generatedText: string,
    originalCode?: string
  ): string {
    // Look for code blocks
    const codeBlockMatch = generatedText.match(
      /```(?:tsx|jsx|ts|js)?\n([\s\S]*?)```/
    );
    if (codeBlockMatch) {
      return codeBlockMatch[1].trim();
    }

    // Look for JSX/TSX content
    const jsxMatch = generatedText.match(
      /(?:export\s+)?(?:function|const)\s+\w+.*?{[\s\S]*?}/
    );
    if (jsxMatch) {
      return jsxMatch[0];
    }

    // If no clear code found, return the original or the full text
    return originalCode || generatedText;
  }

  /**
   * Get request headers
   */
  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (this.apiKey) {
      headers["Authorization"] = `Bearer ${this.apiKey}`;
    }

    return headers;
  }

  /**
   * Check if API key is configured
   */
  hasApiKey(): boolean {
    return !!this.apiKey;
  }

  /**
   * Set API key
   */
  setApiKey(apiKey: string): void {
    this.apiKey = apiKey;
  }
}
