import { Command } from "commander";
import chalk from "chalk";
import { VisionTestRunner } from "./core/VisionTestRunner";
import { VisionTestMission, DemoConfig } from "./types/vision-testing";
import dotenv from "dotenv";
import path from "path";
import { v4 as uuidv4 } from "uuid";

dotenv.config();

const program = new Command();

program
  .name("mycontext-recorder")
  .description("Premium Demo Recording & Autonomous Navigation Engine")
  .version("0.1.0");

program
  .command("demo")
  .description("Record a demo of a web application")
  .requiredOption("-u, --url <url>", "Starting URL")
  .option("-m, --mission <mission>", "What to record", "Navigate the application")
  .option("-n, --name <name>", "Demo name", "Demo")
  .option("-v, --voiceover", "Include voice-over script", false)
  .option("-i, --interactive", "Interactive TUI mode", false)
  .option("-y, --yes", "Skip confirmation", false)
  .action(async (options) => {
    console.log(chalk.bold.blue("\n🎬 MYCONTEXT RECORDER ENGINE"));
    console.log(chalk.blue("══════════════════════════════════════════════════════════════════════"));
    
    const projectPath = process.cwd();
    const runner = new VisionTestRunner(projectPath);

    const demoConfig: DemoConfig = {
      outputFormats: ["video", "screenshots", "html-replay", "markdown-script"],
      videoQuality: "1080p",
      includeVoiceOver: options.voiceover,
      generateAudio: options.voiceover,
    };

    const mission: VisionTestMission = {
      id: uuidv4(),
      name: options.name,
      description: options.mission,
      mission: options.mission,
      expectedOutcome: "Demo recorded successfully",
      tags: ["demo"],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      recordDemo: true,
      demoConfig,
      sourceFlow: options.url,
    };

    try {
      const result = await runner.runTest(mission, {
        headless: !options.interactive,
        recordVideo: true,
        baseUrl: options.url,
      });

      if (result.status === "passed") {
        console.log(chalk.bold.green("\n✅ Demo recorded successfully!"));
      } else {
        console.log(chalk.bold.red("\n❌ Demo recording failed"));
        if (result.error) {
          console.log(chalk.red(`   Error: ${result.error.message}`));
        }
      }
    } catch (error: any) {
      console.error(chalk.red(`\n💥 Fatal error: ${error.message}`));
      process.exit(1);
    }
  });

program.parse(process.argv);
