/**
 * Vision Element Finder Service
 *
 * Combines vision AI with DOM understanding to identify and interact with UI elements.
 * This is the revolutionary approach: instead of brittle CSS selectors,
 * we "see" the page and find elements like a human would.
 */

import { Page } from "playwright";
import { GeminiVisionService } from "./gemini-vision";
import {
  VisualElement,
  VisionAnalysisResult,
  VisionActionDecision,
} from "../types/vision-testing";
import * as fs from "fs-extra";
import * as path from "path";
import { v4 as uuidv4 } from "uuid";

export class VisionElementFinder {
  private visionService: GeminiVisionService;
  private screenshotsDir: string;
  private confidenceThreshold: number;

  constructor(
    projectPath: string,
    confidenceThreshold: number = 70 // Minimum confidence to trust vision over DOM
  ) {
    this.visionService = new GeminiVisionService();
    this.screenshotsDir = path.join(
      projectPath,
      ".mycontext",
      "vision-screenshots"
    );
    this.confidenceThreshold = confidenceThreshold;
    fs.ensureDirSync(this.screenshotsDir);
  }

  /**
   * Analyze the current page using vision
   */
  async analyzePage(page: Page): Promise<VisionAnalysisResult> {
    // Take screenshot
    const screenshotPath = await this.takeScreenshot(page);

    // Get DOM context for hybrid approach
    const domContext = await this.getDOMContext(page);

    // Analyze with vision AI
    const prompt = this.buildAnalysisPrompt(domContext);
    const visionAnalysis = await this.analyzeScreenshotWithPrompt(
      screenshotPath,
      prompt
    );

    return visionAnalysis;
  }

  /**
   * Find an element by natural language description
   */
  async findElement(
    page: Page,
    description: string,
    fallbackSelector?: string
  ): Promise<VisualElement | null> {
    // Take screenshot
    const screenshotPath = await this.takeScreenshot(page);

    // Get DOM context
    const domContext = await this.getDOMContext(page);

    // Ask vision AI to locate the element
    const prompt = `You are analyzing a web page screenshot to locate a specific UI element.

**Target Element**: ${description}

**Available DOM Context** (use this to correlate with visual):
${domContext}

**Task**: Find the element described as "${description}" in the screenshot.

Return a JSON response with this structure:
\`\`\`json
{
  "found": true/false,
  "element": {
    "description": "Clear description of what you see",
    "type": "button|link|input|form|card|navigation|text|image|unknown",
    "visualCoordinates": {
      "x": number (center X coordinate),
      "y": number (center Y coordinate),
      "width": number,
      "height": number
    },
    "domSelector": "CSS selector if you can determine one from context",
    "confidence": number (0-100),
    "interactable": true/false,
    "textContent": "Any text visible in the element"
  }
}
\`\`\`

If you cannot find the element, set "found": false and provide your reasoning.`;

    try {
      const result = await this.askVisionAI(screenshotPath, prompt);

      if (!result.found) {
        // Try fallback selector if provided
        if (fallbackSelector) {
          return await this.findByDOMSelector(page, fallbackSelector);
        }
        return null;
      }

      // Validate confidence
      if (result.element.confidence < this.confidenceThreshold) {
        console.warn(
          `Vision confidence (${result.element.confidence}%) below threshold (${this.confidenceThreshold}%). Trying fallback.`
        );

        if (fallbackSelector) {
          return await this.findByDOMSelector(page, fallbackSelector);
        }
      }

      return {
        id: uuidv4(),
        ...result.element,
      };
    } catch (error) {
      console.error("Vision element finding failed:", error);

      // Try fallback
      if (fallbackSelector) {
        return await this.findByDOMSelector(page, fallbackSelector);
      }

      return null;
    }
  }

  /**
   * Find all interactive elements on the page
   */
  async findAllInteractiveElements(page: Page): Promise<VisualElement[]> {
    const screenshotPath = await this.takeScreenshot(page);
    const domContext = await this.getDOMContext(page);

    const prompt = `You are analyzing a web page to find ALL interactive elements (buttons, links, inputs, etc.).

**DOM Context**:
${domContext}

Return a JSON array of all interactive elements you can identify:
\`\`\`json
{
  "elements": [
    {
      "description": "Clear description",
      "type": "button|link|input|form|etc",
      "visualCoordinates": { "x": number, "y": number, "width": number, "height": number },
      "domSelector": "CSS selector if determinable",
      "confidence": number (0-100),
      "interactable": true,
      "textContent": "Text visible in element"
    }
  ]
}
\`\`\`

Be thorough but focus on elements users can interact with.`;

    try {
      const result = await this.askVisionAI(screenshotPath, prompt);

      return result.elements.map((el: any) => ({
        id: uuidv4(),
        ...el,
      }));
    } catch (error) {
      console.error("Failed to find interactive elements:", error);
      return [];
    }
  }

  /**
   * Decide next action based on current page state
   */
  async decideNextAction(
    page: Page,
    mission: string,
    previousSteps: string[],
    primeObjective: string
  ): Promise<VisionActionDecision> {
    const screenshotPath = await this.takeScreenshot(page);
    const domContext = await this.getDOMContext(page);
    const currentUrl = page.url();

    const prompt = `You are an AI agent testing a web application.

**PRIME OBJECTIVE (Hard Gravity)**: "${primeObjective}"

**Your Mission**: ${mission}

**Current URL**: ${currentUrl}

**Previous Steps Taken**:
${previousSteps.map((step, i) => `${i + 1}. ${step}`).join("\n")}

**DOM Context**:
${domContext}

**Task**: Analyze the screenshot and decide the NEXT ACTION to accomplish the mission while staying aligned with the Prime Objective.

Return JSON:
\`\`\`json
{
  "action": "click|fill|scroll|wait|navigate|upload|complete",
  "confidence": number (0-100),
  "reasoning": "Why you chose this action",
  "visualContext": "What you see on screen",
  "targetElement": {
    "description": "What element to interact with",
    "visualCoordinates": { "x": number, "y": number },
    "domSelector": "CSS selector if possible",
    "confidence": number
  },
  "value": "value for fill/upload actions",
  "url": "URL for navigate action",
  "intent": "High-level intent (e.g., 'submitting form')",
  "alignsWithPrimeObjective": true/false,
  "gravityScore": number (0-100, alignment score)
}
\`\`\`

If mission is complete, set "action": "complete".

CRITICAL: Always check alignment with Prime Objective. If your action deviates, set alignsWithPrimeObjective to false.`;

    try {
      const decision = await this.askVisionAI(screenshotPath, prompt);
      return decision as VisionActionDecision;
    } catch (error) {
      throw new Error(
        `Failed to decide next action: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Click an element using visual coordinates
   */
  async clickElement(page: Page, element: VisualElement): Promise<boolean> {
    try {
      // Try visual coordinates first
      if (element.visualCoordinates) {
        const { x, y } = element.visualCoordinates;
        await page.mouse.click(x, y);
        return true;
      }

      // Fallback to DOM selector
      if (element.domSelector) {
        await page.click(element.domSelector);
        return true;
      }

      throw new Error("No valid method to click element");
    } catch (error) {
      console.error("Click failed:", error);
      return false;
    }
  }

  /**
   * Fill an input element using visual coordinates or selector
   */
  async fillElement(
    page: Page,
    element: VisualElement,
    value: string
  ): Promise<boolean> {
    try {
      // Try visual coordinates first
      if (element.visualCoordinates) {
        const { x, y } = element.visualCoordinates;
        await page.mouse.click(x, y);
        await page.keyboard.type(value);
        return true;
      }

      // Fallback to DOM selector
      if (element.domSelector) {
        await page.fill(element.domSelector, value);
        return true;
      }

      throw new Error("No valid method to fill element");
    } catch (error) {
      console.error("Fill failed:", error);
      return false;
    }
  }

  // Private helper methods

  /**
   * Take screenshot of current page
   */
  private async takeScreenshot(page: Page): Promise<string> {
    const filename = `vision-${Date.now()}-${uuidv4()}.png`;
    const filepath = path.join(this.screenshotsDir, filename);
    await page.screenshot({ path: filepath, fullPage: true });
    return filepath;
  }

  /**
   * Get DOM context for hybrid approach
   */
  private async getDOMContext(page: Page): Promise<string> {
    try {
      return await page.evaluate(() => {
        const title = document.title;
        const url = window.location.href;

        // Get interactive elements
        const buttons = Array.from(document.querySelectorAll("button"))
          .slice(0, 20)
          .map(
            (b, i) =>
              `Button ${i + 1}: "${b.textContent?.trim()}" (${b.className})`
          );

        const links = Array.from(document.querySelectorAll("a"))
          .slice(0, 20)
          .map(
            (a, i) =>
              `Link ${i + 1}: "${a.textContent?.trim()}" -> ${a.href} (${a.className})`
          );

        const inputs = Array.from(
          document.querySelectorAll("input, textarea")
        )
          .slice(0, 15)
          .map(
            (i, idx) =>
              `Input ${idx + 1}: type="${i.getAttribute("type")}" placeholder="${i.getAttribute("placeholder")}" name="${i.getAttribute("name")}"`
          );

        const forms = Array.from(document.querySelectorAll("form"))
          .slice(0, 5)
          .map((f, i) => `Form ${i + 1}: action="${f.action}" (${f.className})`);

        return `
Page Title: ${title}
URL: ${url}

Interactive Elements:

BUTTONS:
${buttons.join("\n")}

LINKS:
${links.join("\n")}

INPUTS:
${inputs.join("\n")}

FORMS:
${forms.join("\n")}
        `.trim();
      });
    } catch (error) {
      return "DOM context unavailable";
    }
  }

  /**
   * Build comprehensive analysis prompt
   */
  private buildAnalysisPrompt(domContext: string): string {
    return `You are analyzing a web page screenshot to understand the UI state.

**DOM Context**:
${domContext}

Return a comprehensive JSON analysis:
\`\`\`json
{
  "elements": [/* array of VisualElement objects */],
  "interactiveElements": [/* filteredarray of interactive elements */],
  "uiState": {
    "pageTitle": "string",
    "url": "string",
    "loadingState": "loading|loaded|error",
    "modalOpen": true/false,
    "mainContent": "description of main content"
  },
  "designSystem": {
    "colors": ["#hex1", "#hex2"],
    "typography": ["Font family, size"],
    "spacing": "spacing pattern"
  },
  "layoutStructure": {
    "type": "grid|flex|fixed|responsive",
    "sections": ["header", "sidebar", "main", "footer"]
  },
  "aiInterpretation": "Natural language summary of what's on screen"
}
\`\`\``;
  }

  /**
   * Analyze screenshot with custom prompt
   */
  private async analyzeScreenshotWithPrompt(
    screenshotPath: string,
    prompt: string
  ): Promise<any> {
    // Use Gemini Vision to analyze
    const imageData = await fs.readFile(screenshotPath);
    const base64Image = imageData.toString("base64");

    // Call Gemini API
    // (Simplified - actual implementation would use the GeminiVisionService)
    // For now, we'll use a placeholder structure

    return {
      screenshot: screenshotPath,
      timestamp: new Date().toISOString(),
      elements: [],
      interactiveElements: [],
      uiState: {
        url: "",
        loadingState: "loaded" as const,
        modalOpen: false,
        mainContent: "",
      },
      designSystem: {
        colors: [],
        typography: [],
        spacing: "",
      },
      layoutStructure: {
        type: "responsive" as const,
        sections: [],
      },
      aiInterpretation: "",
    };
  }

  /**
   * Ask vision AI with a custom prompt
   */
  private async askVisionAI(
    screenshotPath: string,
    prompt: string
  ): Promise<any> {
    try {
      // Read image
      const imageData = await fs.readFile(screenshotPath);
      const base64Image = imageData.toString("base64");
      const mimeType = "image/png";

      // Use Gemini to analyze
      // This is a simplified version - we'll integrate with GeminiVisionService properly
      const { GoogleGenerativeAI } = require("@google/generative-ai");

      const apiKey =
        process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
      if (!apiKey) {
        throw new Error("Gemini API key not found");
      }

      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

      const result = await model.generateContent([
        prompt,
        {
          inlineData: {
            data: base64Image,
            mimeType,
          },
        },
      ]);

      const response = await result.response;
      const text = response.text();

      // Extract JSON from response
      const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/);
      const jsonText = jsonMatch ? jsonMatch[1] : text;

      return JSON.parse(jsonText);
    } catch (error) {
      console.error("Vision AI query failed:", error);
      throw error;
    }
  }

  /**
   * Fallback: Find element by DOM selector
   */
  private async findByDOMSelector(
    page: Page,
    selector: string
  ): Promise<VisualElement | null> {
    try {
      const element = await page.$(selector);
      if (!element) {
        return null;
      }

      // Get bounding box for coordinates
      const box = await element.boundingBox();
      if (!box) {
        return null;
      }

      // Get text content
      const textContent = await element.textContent();

      return {
        id: uuidv4(),
        description: `Element found by selector: ${selector}`,
        type: "unknown",
        visualCoordinates: {
          x: box.x + box.width / 2,
          y: box.y + box.height / 2,
          width: box.width,
          height: box.height,
        },
        domSelector: selector,
        confidence: 60, // Lower confidence for DOM fallback
        interactable: true,
        textContent: textContent || undefined,
      };
    } catch (error) {
      return null;
    }
  }
}
