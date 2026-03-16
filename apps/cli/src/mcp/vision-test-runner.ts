/**
 * Vision Test Runner
 *
 * Main execution engine for vision-based testing.
 * Manages Playwright browser lifecycle, coordinates vision agents,
 * and produces comprehensive test reports.
 *
 * REPLACES: browser-test-runner.ts (old selector-based testing)
 */

import { chromium, Browser, Page, BrowserContext } from "playwright";
import * as path from "path";
import * as fs from "fs-extra";
import {
  VisionTestMission,
  VisionTestExecutionResult,
  VisionBrowserConfig,
  DemoGenerationRequest,
  DemoGenerationResult,
} from "../types/vision-testing";
import { VisionTestCoordinator } from "../agents/implementations/VisionTestCoordinator";
import { ContextService } from "../services/ContextService";
import { v4 as uuidv4 } from "uuid";
import chalk from "chalk";

export class VisionTestRunner {
  private projectPath: string;
  private browser?: Browser;
  private context?: BrowserContext;
  private contextService: ContextService;
  private screenshotsDir: string;
  private videosDir: string;
  private lastVideoPath?: string;

  constructor(projectPath: string) {
    this.projectPath = projectPath;
    this.contextService = new ContextService(projectPath);

    this.screenshotsDir = path.join(
      projectPath,
      ".mycontext",
      "vision-screenshots"
    );
    this.videosDir = path.join(projectPath, ".mycontext", "vision-videos");

    fs.ensureDirSync(this.screenshotsDir);
    fs.ensureDirSync(this.videosDir);
  }

  /**
   * Run a vision test mission
   */
  async runTest(
    mission: VisionTestMission,
    config: VisionBrowserConfig = { headless: true }
  ): Promise<VisionTestExecutionResult> {
    const executionId = uuidv4();
    const startTime = Date.now();

    console.log(chalk.bold.magenta(`\n${"═".repeat(70)}`));
    console.log(chalk.bold.magenta(`🚀 VISION TEST RUNNER`));
    console.log(chalk.bold.magenta(`${"═".repeat(70)}\n`));
    console.log(chalk.white(`Mission: ${mission.name}`));
    console.log(chalk.gray(`Description: ${mission.description}`));
    console.log(chalk.gray(`Expected Outcome: ${mission.expectedOutcome}`));
    console.log(chalk.gray(`Browser: ${config.headless ? "Headless" : "Headed"}`));
    console.log(chalk.gray(`Execution ID: ${executionId}\n`));

    try {
      // Initialize context service
      await this.contextService.initialize();

      // Launch browser
      await this.launchBrowser(config);

      if (!this.context) {
        throw new Error("Failed to create browser context");
      }

      // Create new page
      const page = await this.context.newPage();

      // Set viewport if specified
      if (config.viewport) {
        await page.setViewportSize(config.viewport);
      }

      // Navigate to start URL
      const startUrl =
        config.baseUrl ||
        mission.sourceFlow ||
        mission.validationRules?.[0]?.expectedValue ||
        "http://localhost:3000";

      console.log(chalk.cyan(`\n🌐 Navigating to: ${startUrl}\n`));
      await page.goto(startUrl, { waitUntil: "domcontentloaded" });

      // Wait a moment for page to settle
      await page.waitForTimeout(1000);

      // Create and run vision test coordinator
      const coordinator = new VisionTestCoordinator();

      const coordinatorOutput = await coordinator.run({
        page,
        browserContext: this.context,
        mission,
        projectPath: this.projectPath,
      });

      // Get the result
      const result = coordinatorOutput.result;

      // Capture video path before closing page (Playwright only flushes video on close)
      let videoPath: string | undefined;
      if (page.video()) {
        try {
          videoPath = await page.video()!.path();
        } catch {
          // Video path may not be available if recording wasn't configured
        }
      }

      // Close page (this flushes the video file)
      await page.close();

      // Store video path for external access
      if (videoPath) {
        this.lastVideoPath = videoPath;
        
        // Update demo artifacts with real video path and move file
        if (result.demoArtifacts && result.demoArtifacts.formats.video) {
          const targetPath = result.demoArtifacts.formats.video.path;
          
          try {
            // Ensure target directory exists
            await fs.ensureDir(path.dirname(targetPath));
            
            // Move/copy video to target location
            await fs.copy(videoPath, targetPath);
            
            // Update result with final path and size
            const stats = await fs.stat(targetPath);
            result.demoArtifacts.formats.video.path = targetPath;
            result.demoArtifacts.formats.video.size = stats.size;
          } catch (copyError) {
            console.warn(chalk.yellow(`\n⚠️  Failed to move video recording to demo directory: ${copyError}`));
            // Fallback: keep the original Playwright path
            result.demoArtifacts.formats.video.path = videoPath;
          }
        }
      }

      // Display final summary
      this.displaySummary(result);

      return result;
    } catch (error: any) {
      console.error(chalk.red(`\n❌ Test execution failed: ${error.message}`));
      console.error(chalk.gray(error.stack));

      const endTime = Date.now();

      // Return error result
      const errorResult: VisionTestExecutionResult = {
        missionId: mission.id,
        executionId,
        status: "error",
        startedAt: new Date(startTime).toISOString(),
        completedAt: new Date(endTime).toISOString(),
        duration: endTime - startTime,
        steps: [],
        validationResults: [],
        finalState: {
          url: "",
        },
        error: {
          message: error.message,
          stack: error.stack,
        },
      };

      return errorResult;
    } finally {
      // Always close browser
      await this.closeBrowser();
    }
  }

  /**
   * Generate a demo (record a flow without assertions)
   */
  async generateDemo(
    request: DemoGenerationRequest
  ): Promise<DemoGenerationResult> {
    const requestId = uuidv4();
    const startTime = Date.now();

    console.log(chalk.bold.blue(`\n${"═".repeat(70)}`));
    console.log(chalk.bold.blue(`🎬 DEMO GENERATION`));
    console.log(chalk.bold.blue(`${"═".repeat(70)}\n`));
    console.log(chalk.white(`Flow: ${request.flow}`));
    console.log(chalk.gray(`Start URL: ${request.startUrl}`));
    console.log(
      chalk.gray(`Formats: ${request.config.outputFormats.join(", ")}\n`)
    );

    try {
      // Create a temporary mission for demo recording
      const demoMission: VisionTestMission = {
        id: requestId,
        name: request.metadata?.title || "Demo Recording",
        description: request.metadata?.description || request.flow,
        mission: request.flow,
        expectedOutcome: "Demo recorded successfully",
        tags: request.metadata?.tags || ["demo"],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        recordDemo: true,
        demoConfig: request.config,
        sourceFlow: request.startUrl,
      };

      // Run test with demo recording enabled
      const result = await this.runTest(demoMission, {
        headless: false, // Show browser for demos
        recordVideo: true,
      });

      if (result.status === "error") {
        throw new Error(
          result.error?.message || "Demo generation failed"
        );
      }

      const endTime = Date.now();

      const demoResult: DemoGenerationResult = {
        requestId,
        status: result.demoArtifacts ? "success" : "failed",
        artifacts: result.demoArtifacts!,
        duration: endTime - startTime,
      };

      console.log(chalk.green(`\n✅ Demo generation complete!`));
      console.log(chalk.gray(`Duration: ${(demoResult.duration / 1000).toFixed(1)}s\n`));

      return demoResult;
    } catch (error: any) {
      console.error(chalk.red(`\n❌ Demo generation failed: ${error.message}`));

      const endTime = Date.now();

      return {
        requestId,
        status: "failed",
        artifacts: {
          generatedAt: new Date().toISOString(),
          formats: {},
        },
        duration: endTime - startTime,
        error: error.message,
      };
    }
  }

  /**
   * Run multiple tests in sequence
   */
  async runTestSuite(
    missions: VisionTestMission[],
    config: VisionBrowserConfig = { headless: true }
  ): Promise<VisionTestExecutionResult[]> {
    console.log(chalk.bold.cyan(`\n${"═".repeat(70)}`));
    console.log(chalk.bold.cyan(`🧪 VISION TEST SUITE`));
    console.log(chalk.bold.cyan(`${"═".repeat(70)}\n`));
    console.log(chalk.white(`Tests: ${missions.length}\n`));

    const results: VisionTestExecutionResult[] = [];

    for (let i = 0; i < missions.length; i++) {
      const mission = missions[i];
      if (!mission) continue; // Safety check for undefined

      console.log(
        chalk.yellow(`\n[${ i + 1}/${missions.length}] Running: ${mission.name}`)
      );

      const result = await this.runTest(mission, config);
      results.push(result);

      // Brief pause between tests
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    // Print suite summary
    console.log(chalk.bold.cyan(`\n${"═".repeat(70)}`));
    console.log(chalk.bold.cyan(`📊 TEST SUITE SUMMARY`));
    console.log(chalk.bold.cyan(`${"═".repeat(70)}\n`));

    const passed = results.filter((r) => r.status === "passed").length;
    const failed = results.filter((r) => r.status === "failed").length;
    const errors = results.filter((r) => r.status === "error").length;

    console.log(chalk.green(`✓ Passed: ${passed}`));
    console.log(chalk.red(`✗ Failed: ${failed}`));
    console.log(chalk.yellow(`⚠ Errors: ${errors}`));
    console.log(chalk.white(`Total: ${results.length}\n`));

    return results;
  }

  /**
   * Launch browser with configuration
   */
  private async launchBrowser(config: VisionBrowserConfig): Promise<void> {
    console.log(chalk.gray(`\n🌐 Launching browser...`));

    this.browser = await chromium.launch({
      headless: config.headless !== false,
      slowMo: config.slowMo || 0,
    });

    const contextOptions: any = {
      viewport: config.viewport || { width: 1280, height: 720 },
    };

    // Enable video recording if requested
    if (config.recordVideo) {
      contextOptions.recordVideo = {
        dir: this.videosDir,
        size: config.viewport || { width: 1280, height: 720 },
      };
    }

    this.context = await this.browser.newContext(contextOptions);

    console.log(chalk.green(`✓ Browser ready\n`));
  }

  /**
   * Close browser
   */
  private async closeBrowser(): Promise<void> {
    if (this.context) {
      await this.context.close();
      this.context = undefined;
    }

    if (this.browser) {
      await this.browser.close();
      this.browser = undefined;
    }
  }

  /**
   * Display test summary
   */
  private displaySummary(result: VisionTestExecutionResult): void {
    console.log(chalk.bold.magenta(`\n${"═".repeat(70)}`));
    console.log(chalk.bold.magenta(`📋 TEST SUMMARY`));
    console.log(chalk.bold.magenta(`${"═".repeat(70)}\n`));

    // Status
    const statusColor = result.status === "passed" ? "green" : "red";
    console.log(
      chalk[statusColor](
        `Status: ${result.status.toUpperCase()}`
      )
    );

    // Duration
    console.log(
      chalk.white(`Duration: ${((result.duration || 0) / 1000).toFixed(1)}s`)
    );

    // Steps
    const successfulSteps = result.steps.filter((s) => s.success).length;
    console.log(
      chalk.white(`Steps: ${successfulSteps}/${result.steps.length} successful`)
    );

    // Validations
    if (result.validationResults.length > 0) {
      const passedValidations = result.validationResults.filter(
        (v) => v.passed
      ).length;
      console.log(
        chalk.white(
          `Validations: ${passedValidations}/${result.validationResults.length} passed`
        )
      );
    }

    // Visual Summary
    if (result.visualSummary) {
      console.log(
        chalk.white(`Screenshots: ${result.visualSummary.totalScreenshots}`)
      );
      if (result.visualSummary.visualRegressionsDetected > 0) {
        console.log(
          chalk.yellow(
            `Visual Regressions: ${result.visualSummary.visualRegressionsDetected}`
          )
        );
      }
    }

    // Demo Artifacts
    if (result.demoArtifacts) {
      console.log(
        chalk.white(
          `Demo Formats: ${Object.keys(result.demoArtifacts.formats).join(", ")}`
        )
      );
    }

    // Final URL
    console.log(chalk.gray(`\nFinal URL: ${result.finalState.url}`));

    // Error details
    if (result.error) {
      console.log(chalk.red(`\nError: ${result.error.message}`));
    }

    console.log(chalk.bold.magenta(`\n${"═".repeat(70)}\n`));
  }

  /**
   * Take a screenshot (utility method)
   */
  async takeScreenshot(page: Page, name: string): Promise<string> {
    const filename = `${name}-${Date.now()}.png`;
    const filepath = path.join(this.screenshotsDir, filename);
    await page.screenshot({ path: filepath, fullPage: true });
    return filepath;
  }

  /**
   * Get browser instance (for external use)
   */
  getBrowser(): Browser | undefined {
    return this.browser;
  }

  /**
   * Get browser context (for external use)
   */
  getContext(): BrowserContext | undefined {
    return this.context;
  }

  /**
   * Get the last recorded video path
   */
  getLastVideoPath(): string | undefined {
    return this.lastVideoPath;
  }
}
