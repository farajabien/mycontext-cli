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
  async createVisionMission(options: {
    name?: string;
    mission?: string;
    expected?: string;
    url?: string;
    interactive?: boolean;
  } = {}): Promise<void> {
    console.log(chalk.bold.blue("\n🎬 Create Vision Test Mission\n"));

    let name = options.name;
    let missionDesc = options.mission;
    let expectedOutcome = options.expected;
    let startUrl = options.url || "http://localhost:3000";
    let recordDemo = false;
    let demoConfig;

    if (options.interactive !== false) {
      const answers = await prompts([
        {
          type: "text",
          name: "name",
          message: "Mission name:",
          initial: options.name,
          validate: (value) => (value.length > 0 ? true : "Name is required"),
        },
        {
          type: "text",
          name: "mission",
          message: "What should the AI test? (natural language):",
          initial: options.mission,
          validate: (value) =>
            value.length > 0 ? true : "Mission description is required",
        },
        {
          type: "text",
          name: "expectedOutcome",
          message: "Expected outcome:",
          initial: options.expected,
          validate: (value) =>
            value.length > 0 ? true : "Expected outcome is required",
        },
        {
          type: "text",
          name: "startUrl",
          message: "Starting URL:",
          initial: options.url || "http://localhost:3000",
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

      name = answers.name;
      missionDesc = answers.mission;
      expectedOutcome = answers.expectedOutcome;
      startUrl = answers.startUrl;
      recordDemo = answers.recordDemo;

      if (recordDemo) {
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
    } else {
      if (!name || !missionDesc || !expectedOutcome) {
        console.error(
          chalk.red(
            "❌ Missing required fields. Please provide --name, --mission, and --expected when using --no-interactive."
          )
        );
        process.exit(1);
      }
    }

    // Create vision mission
    const visionMission: VisionTestMission = {
      id: `vision-${Date.now()}`,
      name: name!,
      description: missionDesc!,
      mission: missionDesc!,
      expectedOutcome: expectedOutcome!,
      tags: ["vision-test"],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      sourceFlow: startUrl,
      recordDemo,
      demoConfig,
    };

    // Save mission
    const saved = await this.missionManager.createMission(visionMission);

    console.log(chalk.green(`\n✅ Vision test mission created: ${saved.id}`));
    console.log(chalk.gray(`\nRun with: mycontext test:vision "${saved.name}"`));
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
   * Run visual density check to detect "nested card" syndrome
   */
  async checkDensity(url: string): Promise<void> {
    console.log(chalk.bold.yellow("\n🔍 Visual Density Check\n"));
    console.log(chalk.gray(`Target: ${url}`));

    const mission: VisionTestMission = {
      id: `density-${Date.now()}`,
      name: "Density Check",
      description: "Analyze the page for redundant containers, nested card syndrome, and visual noise.",
      mission: "Analyze the page for redundant containers, nested card syndrome, and visual noise.",
      expectedOutcome: "UI is clean and lacks redundant structural markers.",
      tags: ["density-check"],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      sourceFlow: url,
      recordDemo: false
    };

    const result = await this.testRunner.runTest(mission, { headless: true, baseUrl: url });
    
    // In a real implementation, we would pass the prompt specifically asking for density analysis
    if (result.status === "passed") {
      console.log(chalk.green("\n✅ Visual density is within healthy limits."));
    } else {
      console.log(chalk.red("\n❌ High visual density detected!"));
      console.log(chalk.yellow("Suggestion: Run 'mycontext refine --layout' to flatten nested containers."));
    }
  }

  /**
   * Export test execution to a professional walkthrough.md
   */
  async exportWalkthrough(executionId: string): Promise<void> {
    console.log(chalk.bold.blue("\n📝 Exporting Walkthrough\n"));
    
    // Logic to read execution artifacts and generate markdown
    const walkthroughPath = path.join(this.projectPath, 'walkthrough.md');
    const content = `# Project Walkthrough\n\nGenerated from test execution: ${executionId}\n\n## Visual Flow\n\n[Screenshots and recordings would be embedded here]`;
    
    await fs.writeFile(walkthroughPath, content);
    console.log(chalk.green(`\n✅ Walkthrough exported to: ${walkthroughPath}`));
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
    .option("--check-density", "Perform visual density analysis")
    .option("-v, --verbose", "Verbose output")
    .action(async (name, options) => {
      const cmd = new VisionTestCommand();
      if (options.checkDensity) {
        await cmd.checkDensity(options.url || "http://localhost:3000");
      } else {
        await cmd.runVisionTest(name, options);
      }
    });

  // test:vision:init - Create vision test mission
  program
    .command("test:vision:init")
    .description("Create a new vision test mission")
    .option("--name <name>", "Mission name")
    .option("--mission <mission>", "What should the AI test?")
    .option("--expected <expected>", "Expected outcome")
    .option("--url <url>", "Starting URL")
    .option("--no-interactive", "Disable interactive prompts")
    .action(async (options) => {
      const cmd = new VisionTestCommand();
      await cmd.createVisionMission(options);
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

      if (options.formats.includes('walkthrough')) {
        await cmd.exportWalkthrough(`demo-${Date.now()}`);
      }
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
}
