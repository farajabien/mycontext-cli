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
    // We get the final path in VisionTestRunner after closing.
    // Here we just define where we WANT the video to be.
    
    const videoPath = path.join(this.demoDir, "video.webm");

    // Placeholder stats, will be updated by runner
    const duration = steps.length * 3; 

    return {
      path: videoPath,
      duration,
      size: 0,
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
    :root {
      --bg-color: #0d1117;
      --card-bg: #161b22;
      --border-color: #30363d;
      --text-main: #e6edf3;
      --text-muted: #8b949e;
      --accent-color: #f85149;
      --accent-glow: rgba(248, 81, 73, 0.4);
      --success-color: #238636;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }
    
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: var(--bg-color);
      color: var(--text-main);
      padding: 0;
      line-height: 1.6;
    }

    .container { 
      max-width: 1400px; 
      margin: 0 auto; 
      display: grid;
      grid-template-columns: 350px 1fr;
      height: 100vh;
      overflow: hidden;
    }

    /* Sidebar */
    .sidebar {
      background: var(--card-bg);
      border-right: 1px solid var(--border-color);
      padding: 40px 20px;
      display: flex;
      flex-direction: column;
      gap: 30px;
      overflow-y: auto;
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 12px;
      font-weight: 800;
      font-size: 1.2rem;
      letter-spacing: -0.02em;
      color: var(--accent-color);
    }

    .mission-card {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid var(--border-color);
      padding: 20px;
      border-radius: 12px;
    }

    .mission-card h3 {
      font-size: 0.8rem;
      text-transform: uppercase;
      color: var(--text-muted);
      margin-bottom: 10px;
      letter-spacing: 0.05em;
    }

    .step-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .step-item {
      padding: 12px 15px;
      border-radius: 8px;
      cursor: pointer;
      border: 1px solid transparent;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      font-size: 0.9rem;
      color: var(--text-muted);
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .step-item:hover {
      background: rgba(255, 255, 255, 0.05);
    }

    .step-item.active {
      background: rgba(248, 81, 73, 0.1);
      border-color: var(--accent-color);
      color: var(--text-main);
    }

    .step-number {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: var(--border-color);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.75rem;
      font-weight: bold;
    }

    .active .step-number {
      background: var(--accent-color);
    }

    /* Main Content */
    .main-view {
      padding: 40px;
      overflow-y: auto;
      background-image: radial-gradient(circle at 2px 2px, rgba(255,255,255,0.05) 1px, transparent 0);
      background-size: 40px 40px;
    }

    .step-detail { display: none; }
    .step-detail.active { display: block; animation: fadeIn 0.4s ease-out; }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .step-header {
      margin-bottom: 30px;
    }

    .step-header h2 {
      font-size: 2rem;
      margin-bottom: 10px;
      letter-spacing: -0.03em;
    }

    .tag-row {
      display: flex;
      gap: 10px;
      margin-bottom: 20px;
    }

    .tag {
      padding: 4px 12px;
      border-radius: 100px;
      font-size: 0.75rem;
      font-weight: 600;
      background: var(--border-color);
      text-transform: uppercase;
    }

    .tag.action { background: var(--accent-color); color: white; }

    .analysis-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-bottom: 30px;
    }

    .analysis-card {
      background: var(--card-bg);
      border: 1px solid var(--border-color);
      padding: 20px;
      border-radius: 12px;
    }

    .analysis-card h4 {
      color: var(--text-muted);
      font-size: 0.8rem;
      margin-bottom: 10px;
      text-transform: uppercase;
    }

    .screenshot-container {
      position: relative;
      border-radius: 16px;
      overflow: hidden;
      border: 1px solid var(--border-color);
      box-shadow: 0 20px 40px rgba(0,0,0,0.4);
      background: #000;
    }

    .screenshot-container img {
      width: 100%;
      height: auto;
      display: block;
    }

    .floating-controls {
      position: fixed;
      bottom: 40px;
      right: 40px;
      background: rgba(22, 27, 34, 0.8);
      backdrop-filter: blur(12px);
      padding: 10px;
      border-radius: 100px;
      border: 1px solid var(--border-color);
      display: flex;
      gap: 5px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.3);
    }

    .control-btn {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      border: none;
      background: transparent;
      color: white;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.2s;
    }

    .control-btn:hover { background: rgba(255,255,255,0.1); }
    .control-btn:disabled { opacity: 0.3; cursor: not-allowed; }

    .reasoning-text {
      font-style: italic;
      color: var(--text-muted);
    }
  </style>
</head>
<body>
  <div class="container">
    <aside class="sidebar">
      <div class="brand">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M2 12h20M5 5l14 14M19 5L5 14"/></svg>
        MYCONTEXT AGENT
      </div>

      <div class="mission-card">
        <h3>Primary Objective</h3>
        <p>${title}</p>
        <p style="font-size: 0.8rem; color: var(--text-muted); margin-top: 10px;">
          ${description || ""}
        </p>
      </div>

      <nav class="step-list">
        ${steps
          .map(
            (s, i) => `
          <div class="step-item ${i === 0 ? "active" : ""}" onclick="showStep(${i})" id="sidemenu-${i}">
            <div class="step-number">${i + 1}</div>
            <div class="step-label">${s.action}</div>
          </div>
        `
          )
          .join("")}
      </nav>
    </aside>

    <main class="main-view">
      ${steps
        .map((step, index) => {
          const screenshotSrc = step.screenshot
            ? path.relative(this.demoDir, step.screenshot)
            : "";

          return `
        <div class="step-detail ${index === 0 ? "active" : ""}" data-step="${index}">
          <div class="step-header">
            <div class="tag-row">
              <span class="tag action">${step.action}</span>
              <span class="tag">${step.success ? "Success" : "Failed"}</span>
            </div>
            <h2>${step.intent}</h2>
          </div>

          <div class="analysis-grid">
            <div class="analysis-card">
              <h4>🎯 Intent & Strategy</h4>
              <p>${step.intent}</p>
              ${
                step.visionDecision
                  ? `<p class="reasoning-text" style="margin-top:10px">"${step.visionDecision.reasoning}"</p>`
                  : ""
              }
            </div>
            <div class="analysis-card">
              <h4>🤖 Agent Insight</h4>
              <p>${
                step.visionDecision?.visualContext || "Analyzing UI patterns..."
              }</p>
            </div>
          </div>

          <div class="screenshot-container">
            ${screenshotSrc ? `<img src="${screenshotSrc}" alt="Step ${index + 1}" />` : ""}
          </div>
          
          ${step.error ? `<div class="error" style="background:rgba(248,81,73,0.1); border:1px solid var(--accent-color); padding:20px; margin-top:20px; border-radius:12px; color:var(--accent-color);"><strong>Error:</strong> ${step.error}</div>` : ""}
        </div>
      `;
        })
        .join("")}

      <div class="floating-controls">
        <button class="control-btn" id="prevBtn" title="Previous Step (Left Arrow)">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        </button>
        <button class="control-btn" id="nextBtn" title="Next Step (Right Arrow)">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
        </button>
      </div>
    </main>
  </div>

  <script>
    let currentStep = 0;
    const totalSteps = ${steps.length};

    function showStep(index) {
      if (index < 0 || index >= totalSteps) return;

      // Update detail cards
      document.querySelectorAll('.step-detail').forEach(d => {
        d.classList.remove('active');
      });
      document.querySelector(\`[data-step="\${index}"]\`).classList.add('active');

      // Update sidebar
      document.querySelectorAll('.step-item').forEach(i => {
        i.classList.remove('active');
      });
      document.getElementById(\`sidemenu-\${index}\`).classList.add('active');

      currentStep = index;
      
      document.getElementById('prevBtn').disabled = index === 0;
      document.getElementById('nextBtn').disabled = index === totalSteps - 1;
    }

    document.getElementById('prevBtn').addEventListener('click', () => showStep(currentStep - 1));
    document.getElementById('nextBtn').addEventListener('click', () => showStep(currentStep + 1));

    document.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') showStep(currentStep - 1);
      if (e.key === 'ArrowRight') showStep(currentStep + 1);
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
