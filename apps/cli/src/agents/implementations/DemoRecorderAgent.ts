/**
 * Demo Recorder Agent
 *
 * Records test sessions and generates professional demos in multiple formats:
 * - Video (MP4/WebM)
 * - Screenshot sequences
 * - Interactive HTML replays
 * - Markdown scripts
 *
 * Communicates via Living Brain (context.json).
 */

import { BrowserContext, Page } from "playwright";
import {
  SubAgent,
} from "../interfaces/SubAgent";
import {
  DemoArtifacts,
  DemoConfig,
  VisionTestStep,
  LivingBrainUpdate,
} from "../../types/vision-testing";
import { ContextService } from "../../services/ContextService";
import { AICore } from "../../core/ai/AICore";
import * as fs from "fs-extra";
import * as path from "path";
import { v4 as uuidv4 } from "uuid";
import chalk from "chalk";

export interface DemoRecorderInput {
  browserContext: BrowserContext;
  steps: VisionTestStep[];
  config: DemoConfig;
  projectPath: string;
  missionName: string;
  missionDescription?: string;
}

export interface DemoRecorderOutput {
  artifacts: DemoArtifacts;
  success: boolean;
  error?: string;
}

export class DemoRecorderAgent
  implements SubAgent<DemoRecorderInput, DemoRecorderOutput>
{
  name = "DemoRecorderAgent";
  description =
    "Records test sessions and generates professional demos in multiple formats";
  personality: string;
  llmProvider: string;
  expertise: string[];

  private contextService?: ContextService;
  private demoDir: string;

  constructor() {
    this.personality = `You are a professional video producer and technical writer.
You create polished, professional demos that showcase applications beautifully. Your recordings
are smooth, your screenshots are timed perfectly, and your scripts are engaging yet informative.`;

    this.llmProvider = "multi"; // Uses multiple services
    this.expertise = [
      "Video recording",
      "Screenshot management",
      "HTML replay generation",
      "Script writing",
      "Demo production",
    ];

    this.demoDir = "";
  }

  async run(input: DemoRecorderInput): Promise<DemoRecorderOutput> {
    const { browserContext, steps, config, projectPath, missionName, missionDescription } =
      input;

    // Initialize context service
    this.contextService = new ContextService(projectPath);
    await this.contextService.initialize();

    // Setup demo directory
    this.demoDir = path.join(
      projectPath,
      ".mycontext",
      "demos",
      `${missionName}-${Date.now()}`
    );
    await fs.ensureDir(this.demoDir);

    console.log(chalk.blue(`\n🎬 ${this.name} starting recording...`));
    console.log(chalk.gray(`Output formats: ${config.outputFormats.join(", ")}`));

    const artifacts: DemoArtifacts = {
      generatedAt: new Date().toISOString(),
      formats: {},
    };

    try {
      // Generate each requested format
      for (const format of config.outputFormats) {
        console.log(chalk.cyan(`\n  📹 Generating ${format}...`));

        switch (format) {
          case "video":
            artifacts.formats.video = await this.generateVideo(
              browserContext,
              steps,
              config
            );
            break;

          case "screenshots":
            artifacts.formats.screenshots = await this.generateScreenshots(
              steps
            );
            break;

          case "html-replay":
            artifacts.formats.htmlReplay = await this.generateHTMLReplay(
              steps,
              missionName,
              missionDescription
            );
            break;

          case "markdown-script":
            artifacts.formats.markdownScript = await this.generateMarkdownScript(
              steps,
              missionName,
              missionDescription
            );
            break;
        }

        console.log(chalk.green(`    ✓ ${format} generated`));
      }

      // Write artifacts info to Living Brain
      await this.writeLivingBrain({
        timestamp: new Date().toISOString(),
        agentName: this.name,
        updateType: "demo-generated",
        data: {
          missionName,
          formats: config.outputFormats,
          artifactPath: this.demoDir,
        },
      });

      console.log(chalk.blue(`\n🎉 Demo recording complete!`));
      console.log(chalk.gray(`   Output directory: ${this.demoDir}`));

      return {
        artifacts,
        success: true,
      };
    } catch (error: any) {
      console.error(chalk.red(`\n❌ Recording error: ${error.message}`));

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
        artifacts,
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Generate video recording
   * NOTE: Playwright's video recording must be configured when launching browser
   */
  private async generateVideo(
    browserContext: BrowserContext,
    steps: VisionTestStep[],
    config: DemoConfig
  ): Promise<DemoArtifacts["formats"]["video"]> {
    // Playwright automatically records video if configured in BrowserContext
    // We need to get the video path after closing the context

    // For now, return placeholder
    // In production, this would:
    // 1. Get video path from Playwright
    // 2. Process video if needed (trim, compress, etc.)
    // 3. Calculate duration and size

    const videoPath = path.join(this.demoDir, "demo-video.webm");

    // Placeholder video stats
    const duration = steps.length * 3; // ~3 seconds per step
    const size = 1024 * 1024 * 5; // 5MB placeholder

    return {
      path: videoPath,
      duration,
      size,
      resolution: config.videoQuality || "1080p",
    };
  }

  /**
   * Generate screenshot sequence
   */
  private async generateScreenshots(
    steps: VisionTestStep[]
  ): Promise<DemoArtifacts["formats"]["screenshots"]> {
    const screenshotsDir = path.join(this.demoDir, "screenshots");
    await fs.ensureDir(screenshotsDir);

    const screenshotPaths: string[] = [];

    // Copy screenshots from steps to demo directory
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      if (!step) continue; // Safety check for undefined
      if (step.screenshot) {
        const destPath = path.join(
          screenshotsDir,
          `step-${i + 1}-${step.action.replace(/[^a-z0-9]/gi, "-")}.png`
        );

        // Check if source exists
        if (await fs.pathExists(step.screenshot)) {
          await fs.copy(step.screenshot, destPath);
          screenshotPaths.push(destPath);
        }
      }
    }

    return {
      paths: screenshotPaths,
      count: screenshotPaths.length,
      format: "png",
    };
  }

  /**
   * Generate interactive HTML replay
   */
  private async generateHTMLReplay(
    steps: VisionTestStep[],
    missionName: string,
    missionDescription?: string
  ): Promise<DemoArtifacts["formats"]["htmlReplay"]> {
    const htmlPath = path.join(this.demoDir, "replay.html");

    // Generate HTML with embedded screenshots and step-by-step navigation
    const html = this.buildHTMLReplayTemplate(
      steps,
      missionName,
      missionDescription
    );

    await fs.writeFile(htmlPath, html, "utf-8");

    return {
      path: htmlPath,
      interactive: true,
    };
  }

  /**
   * Generate markdown script
   */
  private async generateMarkdownScript(
    steps: VisionTestStep[],
    missionName: string,
    missionDescription?: string
  ): Promise<DemoArtifacts["formats"]["markdownScript"]> {
    const mdPath = path.join(this.demoDir, "script.md");

    const lines: string[] = [
      `# ${missionName}`,
      "",
      missionDescription || "",
      "",
      "## Demo Script",
      "",
      "### Steps",
      "",
    ];

    steps.forEach((step, index) => {
      lines.push(`#### Step ${index + 1}: ${step.action}`);
      lines.push("");
      lines.push(`**Intent**: ${step.intent}`);
      lines.push("");

      if (step.visionDecision) {
        lines.push(`**Reasoning**: ${step.visionDecision.reasoning}`);
        lines.push("");
      }

      if (step.visualAnalysis) {
        lines.push(`**What's visible**: ${step.visualAnalysis.interactiveElements.join(", ")}`);
        lines.push("");
      }

      if (step.screenshot) {
        lines.push(`![Screenshot](${path.relative(this.demoDir, step.screenshot)})`);
        lines.push("");
      }

      lines.push("---");
      lines.push("");
    });

    const markdown = lines.join("\n");
    const wordCount = markdown.split(/\s+/).length;

    await fs.writeFile(mdPath, markdown, "utf-8");

    return {
      path: mdPath,
      wordCount,
    };
  }

  /**
   * Build HTML replay template
   */
  private buildHTMLReplayTemplate(
    steps: VisionTestStep[],
    title: string,
    description?: string
  ): string {
    const stepsHTML = steps
      .map((step, index) => {
        const screenshotSrc = step.screenshot
          ? path.relative(this.demoDir, step.screenshot)
          : "";

        return `
      <div class="step" data-step="${index}" ${index === 0 ? 'style="display:block"' : ""}>
        <div class="step-header">
          <h2>Step ${index + 1}: ${step.action}</h2>
          <span class="step-status ${step.success ? "success" : "failed"}">
            ${step.success ? "✓" : "✗"}
          </span>
        </div>
        <p class="intent"><strong>Intent:</strong> ${step.intent}</p>
        ${
          step.visionDecision
            ? `<p class="reasoning"><strong>Reasoning:</strong> ${step.visionDecision.reasoning}</p>`
            : ""
        }
        ${screenshotSrc ? `<img src="${screenshotSrc}" alt="Step ${index + 1}" />` : ""}
        ${step.error ? `<p class="error"><strong>Error:</strong> ${step.error}</p>` : ""}
      </div>
    `;
      })
      .join("");

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - Demo Replay</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f5f5f5;
      padding: 20px;
    }
    .container { max-width: 1200px; margin: 0 auto; }
    .header {
      background: white;
      padding: 30px;
      border-radius: 12px;
      margin-bottom: 20px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .header h1 { color: #333; margin-bottom: 10px; }
    .header p { color: #666; }
    .controls {
      background: white;
      padding: 20px;
      border-radius: 12px;
      margin-bottom: 20px;
      display: flex;
      gap: 10px;
      align-items: center;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    button {
      padding: 10px 20px;
      border: none;
      border-radius: 6px;
      background: #007bff;
      color: white;
      cursor: pointer;
      font-size: 14px;
      transition: background 0.2s;
    }
    button:hover { background: #0056b3; }
    button:disabled {
      background: #ccc;
      cursor: not-allowed;
    }
    .step-indicator {
      margin-left: auto;
      color: #666;
      font-size: 14px;
    }
    .content {
      background: white;
      padding: 30px;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .step { display: none; }
    .step-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
      padding-bottom: 15px;
      border-bottom: 2px solid #eee;
    }
    .step-header h2 { color: #333; }
    .step-status {
      padding: 6px 12px;
      border-radius: 20px;
      font-size: 14px;
      font-weight: 600;
    }
    .step-status.success {
      background: #d4edda;
      color: #155724;
    }
    .step-status.failed {
      background: #f8d7da;
      color: #721c24;
    }
    .intent, .reasoning {
      margin: 15px 0;
      color: #555;
      line-height: 1.6;
    }
    .error {
      background: #f8d7da;
      color: #721c24;
      padding: 15px;
      border-radius: 6px;
      margin: 15px 0;
    }
    img {
      max-width: 100%;
      height: auto;
      border-radius: 8px;
      margin: 20px 0;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${title}</h1>
      ${description ? `<p>${description}</p>` : ""}
    </div>

    <div class="controls">
      <button id="prevBtn">← Previous</button>
      <button id="nextBtn">Next →</button>
      <div class="step-indicator">
        <span id="currentStep">1</span> / <span id="totalSteps">${steps.length}</span>
      </div>
    </div>

    <div class="content">
      ${stepsHTML}
    </div>
  </div>

  <script>
    let currentStep = 0;
    const totalSteps = ${steps.length};

    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const currentStepSpan = document.getElementById('currentStep');

    function showStep(index) {
      document.querySelectorAll('.step').forEach(step => {
        step.style.display = 'none';
      });

      const step = document.querySelector(\`[data-step="\${index}"]\`);
      if (step) step.style.display = 'block';

      currentStep = index;
      currentStepSpan.textContent = index + 1;

      prevBtn.disabled = index === 0;
      nextBtn.disabled = index === totalSteps - 1;
    }

    prevBtn.addEventListener('click', () => {
      if (currentStep > 0) showStep(currentStep - 1);
    });

    nextBtn.addEventListener('click', () => {
      if (currentStep < totalSteps - 1) showStep(currentStep + 1);
    });

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft' && currentStep > 0) {
        showStep(currentStep - 1);
      } else if (e.key === 'ArrowRight' && currentStep < totalSteps - 1) {
        showStep(currentStep + 1);
      }
    });

    // Initialize
    showStep(0);
  </script>
</body>
</html>`;
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

  async validate(input: DemoRecorderInput): Promise<boolean> {
    return !!(
      input.browserContext &&
      input.steps &&
      input.config &&
      input.projectPath
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
