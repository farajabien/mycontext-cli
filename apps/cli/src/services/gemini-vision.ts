import { GoogleGenerativeAI } from "@google/generative-ai";
import { VertexAI, GenerativeModel } from "@google-cloud/vertexai";
import fs from "fs";
import path from "path";

export interface ScreenshotAnalysisResult {
  components: Array<{
    name: string;
    type: string;
    description: string;
    hierarchy: string;
  }>;
  designSystem: {
    colors: {
      primary?: string;
      secondary?: string;
      background?: string;
      text?: string;
      accent?: string;
    };
    typography: {
      headings?: string;
      body?: string;
      fontFamilies?: string[];
    };
    spacing: {
      baseUnit?: string;
      scale?: string[];
    };
  };
  layout: {
    type: string;
    structure: string;
    responsiveBreakpoints?: string[];
  };
  techStack: {
    suggested: string[];
    reasoning: string;
  };
  fullAnalysis: string;
}

export class GeminiVisionService {
  private genAI?: GoogleGenerativeAI;
  private vertexAI?: VertexAI;
  private model: any; // Type union is complex between two SDKs, keeping as any for flexibility
  private shouldUseVertex: boolean = false;

  constructor(apiKey?: string) {
    // Priority 1: Check for API Key (Google AI Studio / Dev path)
    const key = apiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    
    if (key) {
      console.log("🔑 Using Google AI (API Key) for analysis");
      this.genAI = new GoogleGenerativeAI(key);
      // Model will be set during analyzeScreenshot with fallback logic
      return;
    }

    // Priority 2: Vertex AI (requires proper GCP project with Vertex AI enabled)
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      console.log("🚀 Using Vertex AI (Service Account) for analysis");
      this.shouldUseVertex = true;
      
      let projectId = process.env.GOOGLE_CLOUD_PROJECT || "gen-lang-client-0497677316"; 
      
      try {
         this.vertexAI = new VertexAI({ project: projectId, location: 'us-central1' });
         return; 
      } catch (e) {
         console.warn("⚠️ Failed to initialize Vertex AI.", e);
         this.shouldUseVertex = false;
      }
    }

    throw new Error(
      "Gemini API key not found. Please set GEMINI_API_KEY or GOOGLE_API_KEY environment variable."
    );
  }

  // Models to try in order of preference (newest first)
  private readonly VISION_MODELS = [
    "gemini-2.0-flash",
    "gemini-1.5-flash-latest", 
    "gemini-1.5-flash",
    "gemini-1.5-pro",
    "gemini-pro-vision"
  ];

  /**
   * Analyze a screenshot and extract UI information
   */
  async analyzeScreenshot(
    imagePath: string,
    retries: number = 2
  ): Promise<ScreenshotAnalysisResult> {
    try {
      // Read the image file
      const imageData = await fs.promises.readFile(imagePath);
      const base64Image = imageData.toString("base64");
      const mimeType = this.getMimeType(imagePath);

      const prompt = `You are an expert UI/UX analyst and frontend developer. Analyze this screenshot of a web/mobile application and provide a comprehensive breakdown.

**Extract and describe:**

1. **Components**: List all UI components visible (buttons, cards, navigation, forms, etc.)
   - Component name
   - Component type (e.g., "Button", "Card", "Navigation Bar")
   - Description
   - Position in hierarchy

2. **Design System**:
   - **Colors**: Extract the color palette (primary, secondary, background, text, accent colors). Use hex codes if possible.
   - **Typography**: Identify font families, heading styles, body text styles
   - **Spacing**: Identify spacing patterns, base unit (e.g., 4px, 8px), padding/margin scale

3. **Layout**:
   - Layout type (grid, flexbox, fixed, responsive)
   - Structure description (number of columns, sections, containers)
   - Responsive breakpoints (if detectable)

4. **Tech Stack Suggestion**:
   - Recommend appropriate technologies (React, Vue, Tailwind, etc.)
   - Reasoning for the recommendations

5. **Full Analysis**: A comprehensive description of the entire UI, user flow, and any notable patterns or features

**Output your analysis in JSON format:**

\`\`\`json
{
  "components": [
    {
      "name": "Component Name",
      "type": "Component Type",
      "description": "Detailed description",
      "hierarchy": "Parent > Child structure"
    }
  ],
  "designSystem": {
    "colors": {
      "primary": "#hex",
      "secondary": "#hex",
      "background": "#hex",
      "text": "#hex",
      "accent": "#hex"
    },
    "typography": {
      "headings": "Font name, size, weight",
      "body": "Font name, size, weight",  
      "fontFamilies": ["Font 1", "Font 2"]
    },
    "spacing": {
      "baseUnit": "8px",
      "scale": ["4px", "8px", "16px", "24px", "32px"]
    }
  },
  "layout": {
    "type": "Grid/Flexbox/Fixed",
    "structure": "Description of layout structure",
    "responsiveBreakpoints": ["mobile: 320px", "tablet: 768px", "desktop: 1024px"]
  },
  "techStack": {
    "suggested": ["React", "Tailwind CSS", "TypeScript"],
    "reasoning": "Explanation of why these technologies fit"
  },
  "fullAnalysis": "Comprehensive description of the entire interface..."
}
\`\`\`

Be as detailed and accurate as possible. If something is unclear or not visible, note that in the description.`;

      let result;
      let lastError: any = null;
      
      // Try models in order until one works
      for (const modelName of this.VISION_MODELS) {
        try {
          console.log(`  Trying model: ${modelName}...`);
          
          if (this.shouldUseVertex && this.vertexAI) {
            // Vertex AI SDK Usage
            const model = this.vertexAI.getGenerativeModel({ model: modelName });
            const imagePart = {
              inlineData: {
                data: base64Image,
                mimeType: mimeType
              }
            };
            const textPart = { text: prompt };
            
            result = await model.generateContent({
              contents: [{ role: 'user', parts: [imagePart, textPart] }]
            });
          } else if (this.genAI) {
            // Google AI SDK Usage
            const model = this.genAI.getGenerativeModel({ model: modelName });
            result = await model.generateContent([
              prompt,
              {
                inlineData: {
                  data: base64Image,
                  mimeType,
                },
              },
            ]);
          }
          
          // If we got here, the model worked!
          console.log(`  ✓ Using ${modelName}`);
          break;
        } catch (modelError: any) {
          lastError = modelError;
          // 404 means model not found, try next one
          if (modelError?.status === 404 || modelError?.message?.includes('not found')) {
            continue;
          }
          // Other errors (rate limit, etc.) should be thrown
          throw modelError;
        }
      }
      
      if (!result) {
        throw lastError || new Error("No models available");
      }

      const response: any = await result.response;
      // Both SDKs have different response structures, so we handle both
      
      let text = "";
      if (typeof response.text === 'function') {
         text = response.text(); 
      } else if (response.candidates && response.candidates.length > 0) {
         // Fallback for raw Vertex response
         text = response.candidates[0]?.content?.parts?.[0]?.text || "";
      }

      // Extract JSON from markdown code blocks if present
      const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/);
      const jsonText = (jsonMatch ? jsonMatch[1] : text) || "{}"; // Ensure it's never undefined

      const analysis: ScreenshotAnalysisResult = JSON.parse(jsonText);
      return analysis;
    } catch (error: any) {
      // Check if it's a rate limit error and retry
      if ((error?.status === 429 || error?.code === 429) && retries > 0) {
        const retryDelay = error?.errorDetails?.find((d: any) => d["@type"]?.includes("RetryInfo"))?.retryDelay;
        const waitTime = retryDelay ? parseInt(retryDelay.replace("s", "")) * 1000 : 3000;
        
        console.log(`Rate limited. Retrying in ${waitTime / 1000}s... (${retries} attempts left)`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        return this.analyzeScreenshot(imagePath, retries - 1);
      }
      
      console.error("Error analyzing screenshot:", error);
      
      // Friendly error for Vertex AI API not enabled
      if (this.shouldUseVertex && error?.message?.includes("Vertex AI API has not been used")) {
        const activationUrl = error?.error?.details?.find((d: any) => d.activationUrl)?.activationUrl;
        if (activationUrl) {
             throw new Error(
                `Vertex AI API is not enabled for project. \n\n👉 Enable it here: ${activationUrl}\n\nThen try again.`
              );
        }
      }

      throw new Error(
        `Failed to analyze screenshot: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Generate context.md file from screenshot analysis
   */
  generateContextFromAnalysis(
    analysis: ScreenshotAnalysisResult,
    projectName: string
  ): string {
    const context = `# ${projectName} - Context

## Overview
${analysis.fullAnalysis}

## Component Breakdown

${analysis.components
  .map(
    (comp) => `### ${comp.name}
**Type**: ${comp.type}
**Description**: ${comp.description}
**Hierarchy**: ${comp.hierarchy}
`
  )
  .join("\n")}

## Design System

### Colors
${Object.entries(analysis.designSystem.colors || {})
  .map(([key, value]) => `- **${key}**: ${value}`)
  .join("\n")}

### Typography
- **Headings**: ${analysis.designSystem.typography.headings || "Not specified"}
- **Body**: ${analysis.designSystem.typography.body || "Not specified"}
- **Font Families**: ${analysis.designSystem.typography.fontFamilies?.join(", ") || "Not specified"}

### Spacing
- **Base Unit**: ${analysis.designSystem.spacing.baseUnit || "8px"}
- **Scale**: ${analysis.designSystem.spacing.scale?.join(", ") || "8px, 16px, 24px, 32px"}

## Layout
**Type**: ${analysis.layout.type}
**Structure**: ${analysis.layout.structure}
${analysis.layout.responsiveBreakpoints ? `**Breakpoints**: ${analysis.layout.responsiveBreakpoints.join(", ")}` : ""}

## Recommended Tech Stack
${analysis.techStack.suggested.map((tech) => `- ${tech}`).join("\n")}

**Reasoning**: ${analysis.techStack.reasoning}

## Implementation Guidelines

1. **Component Structure**: Follow the hierarchy outlined above
2. **Styling**: Use the design system tokens for consistent styling
3. **Responsiveness**: Implement breakpoints as specified
4. **Accessibility**: Ensure all interactive elements are keyboard accessible and have proper ARIA labels
5. **Performance**: Optimize images and lazy-load components where appropriate
`;

    return context;
  }

  /**
   * Get MIME type from file extension
   */
  private getMimeType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes: Record<string, string> = {
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".gif": "image/gif",
      ".webp": "image/webp",
    };
    return mimeTypes[ext] || "image/jpeg";
  }
}
