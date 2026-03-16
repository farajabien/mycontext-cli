import fs from "fs";
import path from "path";
import { AICore } from "../core/AICore";

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
  private aiCore: AICore;

  constructor(apiKey?: string, projectPath: string = process.cwd()) {
    this.aiCore = AICore.getInstance({
      fallbackEnabled: true,
      workingDirectory: projectPath
    });

    // If apiKey is provided, we can set it on the Gemini client via AICore
    if (apiKey) {
      const geminiClient = this.aiCore.getClient("gemini");
      if (geminiClient) {
        geminiClient.setApiKey(apiKey);
      }
    }
  }

  /**
   * Analyze a screenshot and extract UI information via AICore (with fallback)
   */
  async analyzeScreenshot(
    imagePath: string,
    retries: number = 2
  ): Promise<ScreenshotAnalysisResult> {
    try {
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

      const text = await this.aiCore.generateVisionText(prompt, imagePath);

      // Extract JSON from markdown code blocks if present
      const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/);
      const jsonText = (jsonMatch ? jsonMatch[1] : text) || "{}"; // Ensure it's never undefined

      const analysis: ScreenshotAnalysisResult = JSON.parse(jsonText);
      return analysis;
    } catch (error: any) {
      console.error("Error analyzing screenshot:", error);
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

}
