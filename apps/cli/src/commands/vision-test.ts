/**
 * Vision Test Commands
 *
 * CLI commands for vision-based UI testing with AI-powered navigation.
 * Provides commands for running vision tests, generating demos, and more.
 */

import chalk from "chalk";
import prompts from "prompts";
import { Command } from "commander";
import { VisionTestRunner } from "../mcp/vision-test-runner";
import { TestMissionManager } from "../mcp/test-mission-manager";
import {
  VisionTestMission,
  DemoGenerationRequest,
  VisionBrowserConfig,
} from "../types/vision-testing";
import * as path from "path";
import * as fs from "fs-extra";

interface VisionTestOptions {
  headless?: boolean;
  url?: string;
  slowMo?: number;
  verbose?: boolean;
  recordVideo?: boolean;
}

interface DemoOptions {
  formats?: string[];
  quality?: "720p" | "1080p" | "4K";
  voiceover?: boolean;
  style?: "technical" | "casual" | "marketing" | "educational";
  audio?: boolean;
}

/**
 * Vision Test Command Handler
 */
export class VisionTestCommand {
  private projectPath: string;
  private testRunner: VisionTestRunner;
  private missionManager: TestMissionManager;

  constructor(projectPath?: string) {
    this.projectPath = projectPath || process.cwd();
    this.testRunner = new VisionTestRunner(this.projectPath);
    this.missionManager = new TestMissionManager(this.projectPath);
  }

  /**
   * Run a vision test
   */
  async runVisionTest(
    missionIdOrName: string,
    options: VisionTestOptions
  ): Promise<void> {
    console.log(chalk.bold.magenta("\n🎯 Vision Test Runner\n"));

    // Get mission
    const mission = await this.missionManager.getMission(missionIdOrName);

    if (!mission) {
      console.error(chalk.red(`❌ Mission not found: ${missionIdOrName}`));
      console.log(chalk.gray("\nRun 'mycontext test:list' to see available missions"));
      return;
    }

    console.log(chalk.cyan(`Mission: ${mission.name}`));
    console.log(chalk.gray(`Description: ${mission.description}`));
    console.log(chalk.gray(`Expected: ${mission.expectedOutcome}\n`));

    // Convert to vision mission if needed
    const visionMission: VisionTestMission = {
      ...mission,
      visualExpectations: (mission as any).visualExpectations || [],
      recordDemo: false,
    };

    // Configure browser
    const config: VisionBrowserConfig = {
      headless: options.headless !== false,
      baseUrl: options.url,
      slowMo: options.slowMo,
      recordVideo: options.recordVideo || false,
    };

    // Run test
    const result = await this.testRunner.runTest(visionMission, config);

    // Save result
    await this.missionManager.saveExecution(result);

    // Display result
    console.log(
      chalk[result.status === "passed" ? "green" : "red"](
        `\n${result.status === "passed" ? "✅ TEST PASSED" : "❌ TEST FAILED"}`
      )
    );

    // Exit with appropriate code
    process.exit(result.status === "passed" ? 0 : 1);
  }

  /**
   * Create a new vision test mission
   */
  async createVisionMission(): Promise<void> {
    console.log(chalk.bold.blue("\n🎬 Create Vision Test Mission\n"));

    const answers = await prompts([
      {
        type: "text",
        name: "name",
        message: "Mission name:",
        validate: (value) => (value.length > 0 ? true : "Name is required"),
      },
      {
        type: "text",
        name: "mission",
        message: "What should the AI test? (natural language):",
        validate: (value) =>
          value.length > 0 ? true : "Mission description is required",
      },
      {
        type: "text",
        name: "expectedOutcome",
        message: "Expected outcome:",
        validate: (value) =>
          value.length > 0 ? true : "Expected outcome is required",
      },
      {
        type: "text",
        name: "startUrl",
        message: "Starting URL:",
        initial: "http://localhost:3000",
      },
      {
        type: "confirm",
        name: "recordDemo",
        message: "Record demo artifacts?",
        initial: false,
      },
    ]);

    if (!answers.name) {
      console.log(chalk.yellow("\nCancelled"));
      return;
    }

    let demoConfig;

    if (answers.recordDemo) {
      const demoAnswers = await prompts([
        {
          type: "multiselect",
          name: "formats",
          message: "Select output formats:",
          choices: [
            { title: "Video (MP4/WebM)", value: "video" },
            { title: "Screenshots", value: "screenshots" },
            { title: "HTML Replay", value: "html-replay" },
            { title: "Markdown Script", value: "markdown-script" },
          ],
          min: 1,
        },
        {
          type: "select",
          name: "quality",
          message: "Video quality:",
          choices: [
            { title: "720p", value: "720p" },
            { title: "1080p", value: "1080p" },
            { title: "4K", value: "4K" },
          ],
          initial: 1,
        },
        {
          type: "confirm",
          name: "voiceover",
          message: "Generate voice-over script?",
          initial: false,
        },
      ]);

      let style = "technical";
      if (demoAnswers.voiceover) {
        const styleAnswer = await prompts({
          type: "select",
          name: "style",
          message: "Narration style:",
          choices: [
            { title: "Technical", value: "technical" },
            { title: "Casual", value: "casual" },
            { title: "Marketing", value: "marketing" },
            { title: "Educational", value: "educational" },
          ],
        });
        style = styleAnswer.style;
      }

      demoConfig = {
        outputFormats: demoAnswers.formats,
        videoQuality: demoAnswers.quality,
        includeVoiceOver: demoAnswers.voiceover,
        narrationStyle: style as any,
        generateAudio: false,
      };
    }

    // Create vision mission
    const visionMission: VisionTestMission = {
      id: `vision-${Date.now()}`,
      name: answers.name,
      description: answers.mission,
      mission: answers.mission,
      expectedOutcome: answers.expectedOutcome,
      tags: ["vision-test"],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      sourceFlow: answers.startUrl,
      recordDemo: answers.recordDemo,
      demoConfig,
    };

    // Save mission
    const saved = await this.missionManager.createMission(visionMission);

    console.log(chalk.green(`\n✅ Vision test mission created: ${saved.id}`));
    console.log(chalk.gray(`\nRun with: mycontext test:vision ${saved.name}`));
  }

  /**
   * Generate a demo
   */
  async generateDemo(
    flowDescription: string,
    startUrl: string,
    options: DemoOptions
  ): Promise<void> {
    console.log(chalk.bold.blue("\n🎬 Demo Generation\n"));

    const formats = options.formats || ["video", "html-replay"];

    const request: DemoGenerationRequest = {
      missionId: `demo-${Date.now()}`,
      config: {
        outputFormats: formats as any[],
        videoQuality: options.quality || "1080p",
        includeVoiceOver: options.voiceover || false,
        narrationStyle: options.style || "technical",
        generateAudio: options.audio || false,
      },
      startUrl,
      flow: flowDescription,
      metadata: {
        title: "Demo Recording",
        description: flowDescription,
        tags: ["demo"],
      },
    };

    console.log(chalk.cyan(`Flow: ${flowDescription}`));
    console.log(chalk.gray(`Start URL: ${startUrl}`));
    console.log(chalk.gray(`Formats: ${formats.join(", ")}\n`));

    const result = await this.testRunner.generateDemo(request);

    if (result.status === "failed") {
      console.error(chalk.red(`\n❌ Demo generation failed: ${result.error}`));
      process.exit(1);
    }

    console.log(chalk.green(`\n✅ Demo generated successfully!`));
    console.log(chalk.gray(`Duration: ${(result.duration / 1000).toFixed(1)}s`));

    // Display artifact paths
    if (result.artifacts.formats.video) {
      console.log(chalk.cyan(`\n📹 Video: ${result.artifacts.formats.video.path}`));
    }
    if (result.artifacts.formats.htmlReplay) {
      console.log(
        chalk.cyan(`🌐 HTML Replay: ${result.artifacts.formats.htmlReplay.path}`)
      );
    }
    if (result.artifacts.formats.screenshots) {
      console.log(
        chalk.cyan(
          `📸 Screenshots: ${result.artifacts.formats.screenshots.count} images`
        )
      );
    }
    if (result.artifacts.voiceOver) {
      console.log(
        chalk.cyan(
          `🎙️  VO Script: ${result.artifacts.voiceOver.script.segments.length} segments`
        )
      );
    }
  }

  /**
   * Generate voice-over script from existing execution
   */
  async generateVOScript(
    executionId: string,
    options: { style?: string; audio?: boolean }
  ): Promise<void> {
    console.log(chalk.bold.blue("\n🎙️  Voice-Over Script Generation\n"));

    console.log(chalk.yellow("\nℹ️  This feature is coming soon!"));
    console.log(
      chalk.gray(
        "This will extract text from test execution screenshots and generate"
      )
    );
    console.log(chalk.gray("a professional narration script with timestamps."));
  }

  /**
   * Run visual regression tests
   */
  async runVisualRegression(
    missionId: string,
    options: { threshold?: number }
  ): Promise<void> {
    console.log(chalk.bold.cyan("\n🔍 Visual Regression Testing\n"));

    console.log(chalk.yellow("\nℹ️  This feature is coming soon!"));
    console.log(
      chalk.gray(
        "This will compare current UI against baseline screenshots and detect:"
      )
    );
    console.log(chalk.gray("  • Layout changes"));
    console.log(chalk.gray("  • Color scheme drift"));
    console.log(chalk.gray("  • Component positioning"));
    console.log(chalk.gray("  • Text content differences"));
  }
}

/**
 * Register vision test commands
 */
export function registerVisionTestCommands(program: Command): void {
  // test:vision <name> - Run vision test
  program
    .command("test:vision")
    .description("Run a vision-based UI test with AI navigation")
    .argument("<name>", "Mission name or ID")
    .option("--no-headless", "Show browser (non-headless mode)")
    .option("--url <url>", "Starting URL")
    .option("--slow-mo <ms>", "Slow down by N milliseconds")
    .option("--record-video", "Record video of test execution")
    .option("-v, --verbose", "Verbose output")
    .action(async (name, options) => {
      const cmd = new VisionTestCommand();
      await cmd.runVisionTest(name, options);
    });

  // test:vision:init - Create vision test mission
  program
    .command("test:vision:init")
    .description("Create a new vision test mission")
    .action(async () => {
      const cmd = new VisionTestCommand();
      await cmd.createVisionMission();
    });

  // demo:record - Generate demo
  program
    .command("demo:record")
    .description("Record a UI flow and generate demo artifacts")
    .argument("<flow>", "Natural language description of the flow")
    .argument("<url>", "Starting URL")
    .option(
      "--formats <formats>",
      "Output formats (comma-separated: video,screenshots,html-replay,markdown-script)",
      "video,html-replay"
    )
    .option(
      "--quality <quality>",
      "Video quality (720p, 1080p, 4K)",
      "1080p"
    )
    .option("--voiceover", "Generate voice-over script")
    .option(
      "--style <style>",
      "Narration style (technical, casual, marketing, educational)",
      "technical"
    )
    .option("--audio", "Generate audio using TTS")
    .action(async (flow, url, options) => {
      const cmd = new VisionTestCommand();
      await cmd.generateDemo(flow, url, {
        formats: options.formats.split(","),
        quality: options.quality,
        voiceover: options.voiceover,
        style: options.style as any,
        audio: options.audio,
      });
    });

  // demo:narrate - Generate VO script
  program
    .command("demo:narrate")
    .description("Generate voice-over script from test execution")
    .argument("<execution-id>", "Test execution ID")
    .option(
      "--style <style>",
      "Narration style (technical, casual, marketing, educational)",
      "technical"
    )
    .option("--audio", "Generate audio using TTS")
    .action(async (executionId, options) => {
      const cmd = new VisionTestCommand();
      await cmd.generateVOScript(executionId, options);
    });

  // test:visual-regression - Run visual regression
  program
    .command("test:visual-regression")
    .description("Run visual regression tests against baseline")
    .argument("<mission>", "Mission name or ID")
    .option("--threshold <percent>", "Acceptable difference % (0-100)", "5")
    .action(async (mission, options) => {
      const cmd = new VisionTestCommand();
      await cmd.runVisualRegression(mission, {
        threshold: parseFloat(options.threshold),
      });
    });
}
