/**
 * Demo Command
 *
 * Simplified, universal demo recording command.
 * Works with any web app — just point it at a URL and let the AI explore.
 *
 * Usage:
 *   mycontext demo                              # Interactive prompts
 *   mycontext demo --url https://myapp.com      # Skip URL prompt
 *   mycontext demo --url ... --yes              # Fully non-interactive
 */

import chalk from "chalk";
import { Command } from "commander";
import * as path from "path";
import * as fs from "fs-extra";
import prompts from "prompts";
import { VisionTestRunner } from "../mcp/vision-test-runner";
import { DemoGenerationRequest } from "../types/vision-testing";

export function registerDemoCommand(program: Command): void {
  program
    .command("demo")
    .description("Record an AI-powered demo of any web application")
    .option("--url <url>", "Application URL to demo")
    .option("--mission <mission>", "What should the AI explore/demonstrate?")
    .option("--title <title>", "Demo title")
    .option(
      "--formats <formats>",
      "Output formats (comma-separated: video,screenshots,html-replay,markdown-script)",
      "screenshots,html-replay,markdown-script"
    )
    .option("--voiceover", "Generate voice-over narration script")
    .option(
      "--style <style>",
      "Narration style (technical, casual, marketing, educational)",
      "marketing"
    )
    .option("--headless", "Run in headless mode (no browser window)")
    .option("-y, --yes", "Skip interactive prompts (non-interactive mode)")
    .action(async (options: any) => {
      const projectPath = process.cwd();

      console.log(chalk.bold.magenta(`\n${"═".repeat(70)}`));
      console.log(chalk.bold.magenta(`🎬 MYCONTEXT DEMO`));
      console.log(chalk.bold.magenta(`${"═".repeat(70)}\n`));
      console.log(
        chalk.gray("AI-powered demo recording — works with any web app\n")
      );

      let url = options.url;
      let mission = options.mission;
      let title = options.title;
      const formats = options.formats.split(",");

      // ── Interactive prompts (if not --yes) ──────────────────────────────
      if (!options.yes) {
        if (!url) {
          const urlAnswer = await prompts({
            type: "text",
            name: "url",
            message: "Application URL:",
            initial: "http://localhost:3000",
            validate: (v: string) =>
              v.startsWith("http") ? true : "Must be a valid URL (http/https)",
          });
          if (!urlAnswer.url) {
            console.log(chalk.yellow("Cancelled."));
            return;
          }
          url = urlAnswer.url;
        }

        if (!mission) {
          const missionAnswer = await prompts({
            type: "text",
            name: "mission",
            message: "What should the AI explore/demonstrate?",
            initial:
              "Explore the application, interact with key features, and record the user experience",
          });
          if (!missionAnswer.mission) {
            console.log(chalk.yellow("Cancelled."));
            return;
          }
          mission = missionAnswer.mission;
        }

        if (!title) {
          // Auto-generate title from URL
          try {
            const hostname = new URL(url).hostname.replace("www.", "");
            title = `${hostname} Demo`;
          } catch {
            title = "Application Demo";
          }
        }
      } else {
        // Non-interactive defaults
        if (!url) {
          console.error(
            chalk.red("❌ --url is required in non-interactive mode")
          );
          process.exit(1);
        }
        mission =
          mission ||
          "Explore the application, interact with key features, and record the user experience";
        title = title || "Application Demo";
      }

      console.log(chalk.cyan(`  🌐 URL:     ${url}`));
      console.log(chalk.cyan(`  🎯 Mission: ${mission}`));
      console.log(chalk.cyan(`  📦 Formats: ${formats.join(", ")}`));
      console.log(
        chalk.cyan(
          `  🎙️  Voice:   ${options.voiceover ? options.style : "disabled"}`
        )
      );
      console.log(
        chalk.cyan(
          `  🖥️  Browser: ${options.headless ? "headless" : "headed (watching mode)"}\n`
        )
      );

      // ── Run the demo pipeline ──────────────────────────────────────────
      const runner = new VisionTestRunner(projectPath);

      const request: DemoGenerationRequest = {
        missionId: `demo-${Date.now()}`,
        config: {
          outputFormats: formats,
          videoQuality: "1080p",
          includeVoiceOver: options.voiceover || false,
          narrationStyle: options.style || "marketing",
          generateAudio: false,
        },
        startUrl: url,
        flow: mission,
        metadata: {
          title: title,
          description: mission,
          tags: ["demo", "mycontext"],
        },
      };

      try {
        const result = await runner.generateDemo(request);

        if (result.status === "failed") {
          console.error(
            chalk.red(`\n❌ Demo generation failed: ${result.error}`)
          );
          console.log(
            chalk.gray(
              "\nTip: Make sure the URL is accessible and you have a Gemini API key configured."
            )
          );
          console.log(
            chalk.gray(
              "     Set GEMINI_API_KEY in .env or .mycontext/.env.local"
            )
          );
          process.exit(1);
        }

        // ── Success output ─────────────────────────────────────────────
        console.log(chalk.bold.green(`\n${"═".repeat(70)}`));
        console.log(chalk.bold.green(`✅ DEMO COMPLETE`));
        console.log(chalk.bold.green(`${"═".repeat(70)}\n`));
        console.log(
          chalk.white(
            `  ⏱  Duration: ${(result.duration / 1000).toFixed(1)}s`
          )
        );

        if (result.artifacts.formats.video) {
          console.log(
            chalk.cyan(
              `  📹 Video:       ${result.artifacts.formats.video.path}`
            )
          );
        }
        if (result.artifacts.formats.screenshots) {
          console.log(
            chalk.cyan(
              `  📸 Screenshots: ${result.artifacts.formats.screenshots.count} images`
            )
          );
        }
        if (result.artifacts.formats.htmlReplay) {
          console.log(
            chalk.cyan(
              `  🌐 HTML Replay: ${result.artifacts.formats.htmlReplay.path}`
            )
          );
        }
        if (result.artifacts.formats.markdownScript) {
          console.log(
            chalk.cyan(
              `  📝 Script:      ${result.artifacts.formats.markdownScript.path}`
            )
          );
        }
        if (result.artifacts.voiceOver) {
          console.log(
            chalk.cyan(
              `  🎙️  VO Script:   ${result.artifacts.voiceOver.script.segments.length} segments`
            )
          );
        }

        console.log(
          chalk.gray(
            `\n  📂 All artifacts: .mycontext/demos/\n`
          )
        );

        // Open HTML replay if generated
        if (result.artifacts.formats.htmlReplay) {
          console.log(
            chalk.gray(
              `  Tip: Open the HTML replay in your browser to review the demo`
            )
          );
          console.log(
            chalk.gray(
              `       open "${result.artifacts.formats.htmlReplay.path}"\n`
            )
          );
        }
      } catch (error: any) {
        console.error(chalk.red(`\n❌ Demo failed: ${error.message}`));

        if (error.message.includes("GEMINI_API_KEY") || error.message.includes("API key")) {
          console.log(chalk.yellow("\n💡 Setup required:"));
          console.log(chalk.gray("   1. Get a Gemini API key from https://aistudio.google.com/apikey"));
          console.log(chalk.gray("   2. Add to .env: GEMINI_API_KEY=your-key-here"));
          console.log(chalk.gray("   3. Run: mycontext demo --url <your-app-url>"));
        }

        process.exit(1);
      }
    });
}
