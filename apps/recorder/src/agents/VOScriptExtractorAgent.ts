/**
 * Voice-Over Script Extractor Agent
 *
 * Extracts text from screenshots and generates professional narration scripts
 * with timestamps. Supports multiple narration styles and optional TTS integration.
 *
 * Communicates via Living Brain (context.json).
 */

import {
  SubAgent,
} from "./SubAgent";
import { GeminiVisionService } from "../services/gemini-vision";
import { GeminiClient } from "../utils/geminiClient";
import {
  VisionTestStep,
  VOScript,
  VOSegment,
  DemoConfig,
  LivingBrainUpdate,
} from "../types/vision-testing";
import { ContextService } from "../services/ContextService";
import { AICore } from "../core/AICore";
import { TTSService } from "../services/TTSService";
import { v4 as uuidv4 } from "uuid";
import * as fs from "fs-extra";
import * as path from "path";
import chalk from "chalk";

export interface VOScriptExtractorInput {
  steps: VisionTestStep[];
  missionName: string;
  missionDescription?: string;
  narrationStyle?: "technical" | "casual" | "marketing" | "educational";
  projectPath: string;
  outputPath: string;
  generateAudio?: boolean;
  ttsConfig?: DemoConfig["ttsConfig"];
}

export interface VOScriptExtractorOutput {
  script: VOScript;
  scriptPath: string;
  audioPath?: string;
  success: boolean;
  error?: string;
}

export class VOScriptExtractorAgent
  implements SubAgent<VOScriptExtractorInput, VOScriptExtractorOutput>
{
  name = "VOScriptExtractorAgent";
  description =
    "Extracts text from screenshots and generates professional narration scripts";
  personality: string;
  llmProvider: string;
  expertise: string[];

  private visionService: GeminiVisionService;
  private contextService?: ContextService;
  private ttsService: TTSService;

  constructor() {
    this.personality = `You are a professional voice-over artist and scriptwriter.
You write engaging, clear narration that guides viewers through demos smoothly. Your scripts
are natural, informative, and adapt to different audiences - from technical developers to
business stakeholders.`;

    this.llmProvider = "gemini-vision";
    this.expertise = [
      "Script writing",
      "Text extraction",
      "Narration generation",
      "Timing coordination",
      "TTS integration",
    ];

    this.visionService = new GeminiVisionService();
    this.ttsService = new TTSService();
  }

  async run(input: VOScriptExtractorInput): Promise<VOScriptExtractorOutput> {
    const {
      steps,
      missionName,
      missionDescription,
      narrationStyle = "technical",
      projectPath,
      outputPath,
      generateAudio,
      ttsConfig,
    } = input;

    // Initialize context service
    this.contextService = new ContextService(projectPath);
    await this.contextService.initialize();

    console.log(chalk.blue(`\n🎙️  ${this.name} generating narration...`));
    console.log(chalk.gray(`Style: ${narrationStyle}`));
    console.log(chalk.gray(`Steps: ${steps.length}`));

    try {
      // Generate VO segments for each step
      const segments: VOSegment[] = [];
      let totalDuration = 0;

      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        if (!step) continue;

        console.log(chalk.cyan(`\n  📝 Segment ${i + 1}/${steps.length}`));

        const segment = await this.generateSegment(
          step,
          i,
          narrationStyle,
          totalDuration
        );

        segments.push(segment);
        totalDuration += segment.duration;

        console.log(chalk.gray(`     "${segment.narration}"`));
      }

      // Build full script
      const fullScript = this.buildFullScript(
        segments,
        missionName,
        missionDescription,
        narrationStyle
      );

      // Create VOScript object
      const voScript: VOScript = {
        title: missionName,
        totalDuration,
        segments,
        fullScript,
      };

      // Save script to file
      await fs.ensureDir(path.dirname(outputPath));
      await fs.writeFile(
        outputPath,
        JSON.stringify(voScript, null, 2),
        "utf-8"
      );

      // Also save as human-readable markdown
      const mdPath = outputPath.replace(".json", ".md");
      await fs.writeFile(mdPath, fullScript, "utf-8");

      console.log(chalk.green(`\n  ✓ Script saved to ${outputPath}`));

      // Generate audio if requested
      let audioPath: string | undefined;
      if (generateAudio && ttsConfig) {
        console.log(chalk.cyan(`\n  🔊 Generating audio...`));
        audioPath = await this.generateAudio(voScript, ttsConfig, outputPath);
        console.log(chalk.green(`  ✓ Audio saved to ${audioPath}`));
      }

      // Write to Living Brain
      await this.writeLivingBrain({
        timestamp: new Date().toISOString(),
        agentName: this.name,
        updateType: "demo-generated",
        data: {
          scriptPath: outputPath,
          audioPath,
          segmentCount: segments.length,
          totalDuration,
        },
      });

      console.log(chalk.blue(`\n🎉 Narration script complete!`));

      return {
        script: voScript,
        scriptPath: outputPath,
        audioPath,
        success: true,
      };
    } catch (error: any) {
      console.error(chalk.red(`\n❌ Script generation error: ${error.message}`));

      // Write error to Living Brain
      await this.writeLivingBrain({
        timestamp: new Date().toISOString(),
        agentName: this.name,
        updateType: "error",
        data: {
          error: error.message,
          stack: error.stack,
        },
      });

      return {
        script: {
          title: missionName,
          totalDuration: 0,
          segments: [],
          fullScript: "",
        },
        scriptPath: outputPath,
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Generate a single narration segment
   */
  private async generateSegment(
    step: VisionTestStep,
    index: number,
    narrationStyle: "technical" | "casual" | "marketing" | "educational",
    currentTime: number
  ): Promise<VOSegment> {
    try {
      // Extract text from screenshot if available
      let textOnScreen: string[] = [];
      let uiState = "UI state unknown";

      if (step.screenshot && (await fs.pathExists(step.screenshot))) {
        const extracted = await this.extractTextFromScreenshot(
          step.screenshot
        );
        textOnScreen = extracted.textElements;
        uiState = extracted.summary;
      } else if (step.visualAnalysis) {
        textOnScreen = step.visualAnalysis.textContent || [];
        uiState = step.visualAnalysis.interactiveElements.join(", ");
      }

      // Generate narration based on style
      const narration = await this.generateNarration(
        step,
        textOnScreen,
        uiState,
        narrationStyle
      );

      // Estimate duration (roughly 150 words per minute)
      const wordCount = narration.split(/\s+/).length;
      const duration = (wordCount / 150) * 60; // seconds

      const segment: VOSegment = {
        id: uuidv4(),
        timestamp: currentTime,
        duration: Math.max(duration, 3), // Minimum 3 seconds per segment
        narration,
        action: step.action,
        screenshot: step.screenshot,
        metadata: {
          step: index + 1,
          uiState,
          textOnScreen,
        },
      };

      return segment;
    } catch (error) {
      // Fallback segment
      return {
        id: uuidv4(),
        timestamp: currentTime,
        duration: 3,
        narration: `Step ${index + 1}: ${step.action}`,
        action: step.action,
        screenshot: step.screenshot,
        metadata: {
          step: index + 1,
          uiState: "unknown",
          textOnScreen: [],
        },
      };
    }
  }

  /**
   * Extract text from screenshot using vision AI
   */
  private async extractTextFromScreenshot(
    screenshotPath: string
  ): Promise<{ textElements: string[]; summary: string }> {
    try {
      // Use Gemini Vision to extract text
      const imageData = await fs.readFile(screenshotPath);
      const base64Image = imageData.toString("base64");

      const { GoogleGenerativeAI } = require("@google/generative-ai");
      const apiKey =
        process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
      if (!apiKey) {
        throw new Error("Gemini API key not found");
      }

      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

      const prompt = `Extract all visible text from this screenshot.

Return JSON:
{
  "textElements": ["text 1", "text 2", ...],
  "summary": "Brief description of what's on screen"
}`;

      const result = await model.generateContent([
        prompt,
        {
          inlineData: {
            data: base64Image,
            mimeType: "image/png",
          },
        },
      ]);

      const response = await result.response;
      const text = response.text();

      // Extract JSON
      const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/);
      const jsonText = jsonMatch ? jsonMatch[1] : text;

      const parsed = JSON.parse(jsonText);
      return parsed;
    } catch (error) {
      console.warn("Text extraction failed:", error);
      return {
        textElements: [],
        summary: "Could not extract text",
      };
    }
  }

  /**
   * Generate narration for a step
   */
  private async generateNarration(
    step: VisionTestStep,
    textOnScreen: string[],
    uiState: string,
    style: string
  ): Promise<string> {
    const styleGuidance = {
      technical:
        "Use precise, technical language. Focus on actions and outcomes.",
      casual:
        "Use conversational, friendly language. Make it relatable and easy to follow.",
      marketing:
        "Use persuasive, benefit-focused language. Highlight features and value.",
      educational:
        "Use clear, instructive language. Explain why and how things work.",
    };

    const prompt = `You are writing voice-over narration for a demo video.

**Style**: ${style} - ${styleGuidance[style as keyof typeof styleGuidance] || styleGuidance.technical}

**Current Step**: ${step.action}
**Intent**: ${step.intent}
${step.visionDecision ? `**Reasoning**: ${step.visionDecision.reasoning}` : ""}

**UI State**: ${uiState}
**Text visible on screen**: ${textOnScreen.join(", ") || "None"}

Write 1-2 sentences of narration for this step. Be natural and engaging.
Do NOT include any formatting, just the plain narration text.`;

    try {
      const aiCore = AICore.getInstance();

      const narration = await aiCore.generateText(prompt, {
        temperature: 0.7,
      });

      return narration.trim();
    } catch (error) {
      console.warn("Narration generation failed, using fallback:", error);
      return this.generateFallbackNarration(step, style);
    }
  }

  /**
   * Generate fallback narration
   */
  private generateFallbackNarration(
    step: VisionTestStep,
    style: string
  ): string {
    const templates = {
      technical: `Now we ${step.action.toLowerCase()}. ${step.intent}`,
      casual: `Let's ${step.action.toLowerCase()}. ${step.intent}`,
      marketing: `Watch as we ${step.action.toLowerCase()}, ${step.intent}`,
      educational: `In this step, we'll ${step.action.toLowerCase()}. ${step.intent}`,
    };

    return (
      templates[style as keyof typeof templates] || templates.technical
    );
  }

  /**
   * Build full script markdown
   */
  private buildFullScript(
    segments: VOSegment[],
    title: string,
    description?: string,
    style?: string
  ): string {
    const lines: string[] = [
      `# ${title} - Voice-Over Script`,
      "",
      description || "",
      "",
      `**Style**: ${style || "technical"}`,
      `**Duration**: ${this.formatDuration(segments.reduce((sum, s) => sum + s.duration, 0))}`,
      `**Segments**: ${segments.length}`,
      "",
      "---",
      "",
      "## Narration",
      "",
    ];

    segments.forEach((segment, index) => {
      lines.push(
        `### Segment ${index + 1} [${this.formatTimestamp(segment.timestamp)}]`
      );
      lines.push("");
      lines.push(`**Action**: ${segment.action}`);
      lines.push(`**Duration**: ${segment.duration.toFixed(1)}s`);
      lines.push("");
      lines.push(segment.narration);
      lines.push("");
      lines.push("---");
      lines.push("");
    });

    return lines.join("\n");
  }

  /**
   * Generate audio using TTS
   */
  private async generateAudio(
    script: VOScript,
    ttsConfig: DemoConfig["ttsConfig"],
    outputPath: string
  ): Promise<string> {
    const audioPath = outputPath.replace(".json", ".mp3");
    
    // Concatenate all narration segments for a full audio file
    const fullNarration = script.segments.map(s => s.narration).join(". ");
    
    const success = await this.ttsService.generateSpeech(
      fullNarration,
      audioPath,
      ttsConfig as any
    );

    if (!success) {
      throw new Error("Failed to generate audio via TTSService");
    }

    return audioPath;
  }

  /**
   * Format timestamp as MM:SS
   */
  private formatTimestamp(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }

  /**
   * Format duration as human-readable string
   */
  private formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);

    if (mins > 0) {
      return `${mins}m ${secs}s`;
    }
    return `${secs}s`;
  }

  /**
   * Write update to Living Brain
   */
  private async writeLivingBrain(update: LivingBrainUpdate): Promise<void> {
    try {
      // Read current context using AICore
      const aiCore = AICore.getInstance();
      const currentContext: any = (await aiCore.getLivingContext()) || {};

      if (!currentContext.testExecutionHistory) {
        currentContext.testExecutionHistory = [];
      }

      currentContext.testExecutionHistory.push(update);

      if (currentContext.testExecutionHistory.length > 100) {
        currentContext.testExecutionHistory = currentContext.testExecutionHistory.slice(
          -100
        );
      }

      // Save back to context.json using AICore
      await aiCore.saveLivingContext(currentContext);
    } catch (error) {
      console.warn("Failed to write to Living Brain:", error);
    }
  }

  async validate(input: VOScriptExtractorInput): Promise<boolean> {
    return !!(
      input.steps &&
      input.missionName &&
      input.projectPath &&
      input.outputPath
    );
  }

  async getStatus(): Promise<{
    name: string;
    status: "idle" | "running" | "completed" | "error";
    lastRun?: Date;
    executionTime?: number;
    errorCount: number;
    successCount: number;
  }> {
    return {
      name: this.name,
      status: "idle",
      errorCount: 0,
      successCount: 0,
    };
  }
}
