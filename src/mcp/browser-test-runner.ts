/**
 * Browser Test Runner
 *
 * Executes test missions using Playwright + AI-powered navigation.
 * The AI agent autonomously navigates the UI, makes decisions, and validates outcomes.
 */

import { chromium, Browser, Page, BrowserContext } from "playwright";
import * as path from "path";
import * as fs from "fs-extra";
import {
  TestMission,
  TestExecutionResult,
  TestStep,
  ValidationResult,
  BrowserConfig,
  InteractiveTestSession,
  TestStatus,
} from "../types/flow-testing";
import { v4 as uuidv4 } from "uuid";
import { AIClient } from "../interfaces/AIClient";
import chalk from "chalk";

export class BrowserTestRunner {
  private projectPath: string;
  private browser?: Browser;
  private context?: BrowserContext;
  private aiClient: AIClient;
  private screenshotsDir: string;

  constructor(projectPath: string) {
    this.projectPath = projectPath;
    this.screenshotsDir = path.join(
      projectPath,
      ".mycontext",
      "test-screenshots"
    );
    fs.ensureDirSync(this.screenshotsDir);

    // Initialize AI client (will use the project's configured provider)
    this.aiClient = this.initializeAIClient();
  }

  /**
   * Initialize AI client from project config
   */
  private initializeAIClient(): AIClient {
    // Import and initialize the appropriate AI client
    // This will use the same AI provider configured for MyContext
    try {
      const { createAIClient } = require("../clients/ClaudeSDKClient");
      return createAIClient();
    } catch (error) {
      throw new Error(
        "Failed to initialize AI client. Please configure an AI provider."
      );
    }
  }

  /**
   * Run a test mission
   */
  async runTest(
    mission: TestMission,
    config: BrowserConfig = { headless: true }
  ): Promise<TestExecutionResult> {
    const executionId = uuidv4();
    const startTime = Date.now();
    const steps: TestStep[] = [];
    let status: TestStatus = "running";
    let error: any = null;

    console.log(chalk.blue(`\n🧪 Running test: ${mission.name}`));
    console.log(chalk.gray(`Mission: ${mission.mission}`));

    try {
      // Launch browser
      await this.launchBrowser(config);

      // Create new page
      const page = await this.context!.newPage();

      // Set viewport if specified
      if (config.viewport) {
        await page.setViewportSize(config.viewport);
      }

      // Start URL (use from config or mission)
      const startUrl = config.baseUrl || mission.sourceFlow || "http://localhost:3000";
      console.log(chalk.gray(`Starting at: ${startUrl}`));

      await page.goto(startUrl);

      // Take initial screenshot
      const initialScreenshot = await this.takeScreenshot(
        page,
        executionId,
        "initial"
      );

      // Execute mission using AI
      const executionSteps = await this.executeWithAI(
        page,
        mission,
        executionId
      );
      steps.push(...executionSteps);

      // Validate results
      const validationResults = await this.validateMission(
        page,
        mission,
        executionId
      );

      // Determine final status
      const allValidationsPassed = validationResults.every((v) => v.passed);
      status = allValidationsPassed ? "passed" : "failed";

      // Take final screenshot
      const finalScreenshot = await this.takeScreenshot(
        page,
        executionId,
        "final"
      );

      console.log(
        status === "passed"
          ? chalk.green(`✅ Test passed!`)
          : chalk.red(`❌ Test failed!`)
      );

      const endTime = Date.now();

      const result: TestExecutionResult = {
        missionId: mission.id,
        executionId,
        status,
        startedAt: new Date(startTime).toISOString(),
        completedAt: new Date(endTime).toISOString(),
        duration: endTime - startTime,
        steps,
        validationResults,
        finalState: {
          url: page.url(),
          screenshot: finalScreenshot,
          dom: await this.getSimplifiedDOM(page),
        },
        aiNotes: await this.generateAINotes(mission, steps, validationResults),
      };

      await page.close();
      return result;
    } catch (err: any) {
      console.error(chalk.red(`❌ Test error: ${err.message}`));

      error = {
        message: err.message,
        stack: err.stack,
      };

      const endTime = Date.now();

      return {
        missionId: mission.id,
        executionId,
        status: "error",
        startedAt: new Date(startTime).toISOString(),
        completedAt: new Date(endTime).toISOString(),
        duration: endTime - startTime,
        steps,
        validationResults: [],
        finalState: {
          url: "",
          screenshot: undefined,
        },
        error,
      };
    } finally {
      await this.closeBrowser();
    }
  }

  /**
   * Execute mission using AI
   */
  private async executeWithAI(
    page: Page,
    mission: TestMission,
    executionId: string
  ): Promise<TestStep[]> {
    const steps: TestStep[] = [];
    let stepOrder = 0;

    // AI prompt to understand the mission
    const systemPrompt = `You are an AI agent performing UI testing. Your mission is:
"${mission.mission}"

Expected outcome: "${mission.expectedOutcome}"

You can navigate the UI by:
1. Clicking elements (buttons, links, etc.)
2. Filling forms
3. Navigating to URLs
4. Waiting for elements to appear

Analyze the current page and decide what action to take next to accomplish the mission.
Be specific about selectors (use text content, aria-labels, or role attributes when possible).

Current URL: ${page.url()}`;

    // Get page content for AI
    const pageContent = await this.getPageContentForAI(page);

    console.log(chalk.yellow(`\n🤖 AI analyzing page...`));

    // Main execution loop
    let maxSteps = 20; // Prevent infinite loops
    let missionComplete = false;

    while (!missionComplete && maxSteps > 0) {
      maxSteps--;

      // Ask AI what to do next
      const aiResponse = await this.askAI(systemPrompt, pageContent, steps);

      if (!aiResponse || aiResponse.action === "complete") {
        missionComplete = true;
        break;
      }

      // Execute the AI's decision
      const step = await this.executeAction(
        page,
        aiResponse,
        stepOrder++,
        executionId
      );
      steps.push(step);

      console.log(
        chalk.cyan(`  Step ${step.order + 1}: ${step.action}`)
      );

      if (!step.success) {
        console.log(chalk.red(`    Failed: ${step.error}`));
        break;
      }

      // Wait a bit for page to settle
      await page.waitForTimeout(1000);

      // Update page content for next iteration
      const newPageContent = await this.getPageContentForAI(page);
      if (newPageContent === pageContent) {
        // Page hasn't changed, might be stuck
        console.log(chalk.yellow(`    ⚠️ Page unchanged, stopping`));
        break;
      }
    }

    return steps;
  }

  /**
   * Ask AI for next action
   */
  private async askAI(
    systemPrompt: string,
    pageContent: string,
    previousSteps: TestStep[]
  ): Promise<any> {
    try {
      const prompt = `${systemPrompt}

Page Content:
${pageContent}

Previous Steps:
${previousSteps.map((s) => `${s.order + 1}. ${s.action} - ${s.success ? "success" : "failed"}`).join("\n")}

What should be the next action? Respond in JSON format:
{
  "action": "click|fill|goto|wait|complete",
  "selector": "CSS selector or text content",
  "value": "value for fill action",
  "intent": "why you're taking this action"
}

If the mission is complete, respond with { "action": "complete" }`;

      const response = await this.aiClient.generateText(prompt, {
        maxTokens: 500,
        temperature: 0.2, // Lower temperature for more deterministic actions
      });

      // Parse JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      return null;
    } catch (error) {
      console.error("AI decision error:", error);
      return null;
    }
  }

  /**
   * Execute an action on the page
   */
  private async executeAction(
    page: Page,
    aiDecision: any,
    order: number,
    executionId: string
  ): Promise<TestStep> {
    const step: TestStep = {
      id: uuidv4(),
      order,
      action: `${aiDecision.action}: ${aiDecision.selector || aiDecision.value || ""}`,
      intent: aiDecision.intent || "",
      timestamp: new Date().toISOString(),
      success: false,
    };

    try {
      switch (aiDecision.action) {
        case "click":
          // Try multiple strategies to find the element
          const clickSelector = await this.findElement(
            page,
            aiDecision.selector
          );
          if (clickSelector) {
            await page.click(clickSelector);
            step.metadata = { clickedElement: clickSelector };
            step.success = true;
          } else {
            step.error = `Element not found: ${aiDecision.selector}`;
          }
          break;

        case "fill":
          const fillSelector = await this.findElement(page, aiDecision.selector);
          if (fillSelector) {
            await page.fill(fillSelector, aiDecision.value);
            step.metadata = {
              elementSelector: fillSelector,
              inputValue: aiDecision.value,
            };
            step.success = true;
          } else {
            step.error = `Element not found: ${aiDecision.selector}`;
          }
          break;

        case "goto":
          await page.goto(aiDecision.value);
          step.metadata = { navigationTarget: aiDecision.value };
          step.success = true;
          break;

        case "wait":
          await page.waitForTimeout(2000);
          step.success = true;
          break;

        default:
          step.error = `Unknown action: ${aiDecision.action}`;
      }

      // Take screenshot after action
      step.screenshot = await this.takeScreenshot(
        page,
        executionId,
        `step-${order}`
      );
      step.metadata = {
        ...step.metadata,
        url: page.url(),
      };
    } catch (error: any) {
      step.error = error.message;
      step.success = false;
    }

    return step;
  }

  /**
   * Find element using multiple strategies
   */
  private async findElement(page: Page, selector: string): Promise<string | null> {
    // Strategy 1: Direct selector
    if (await page.$(selector)) {
      return selector;
    }

    // Strategy 2: Text content
    const byText = `text="${selector}"`;
    if (await page.$(byText)) {
      return byText;
    }

    // Strategy 3: Partial text
    const byPartialText = `text=/${selector}/i`;
    if (await page.$(byPartialText)) {
      return byPartialText;
    }

    // Strategy 4: Role + name
    const byRole = `role=${selector}`;
    if (await page.$(byRole)) {
      return byRole;
    }

    return null;
  }

  /**
   * Validate mission completion
   */
  private async validateMission(
    page: Page,
    mission: TestMission,
    executionId: string
  ): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];

    if (!mission.validationRules || mission.validationRules.length === 0) {
      // No explicit validation rules, assume success if we got here
      return [];
    }

    for (const rule of mission.validationRules) {
      const result: ValidationResult = {
        rule,
        passed: false,
        message: "",
        timestamp: new Date().toISOString(),
      };

      try {
        switch (rule.type) {
          case "url-match":
            const currentUrl = page.url();
            result.passed = currentUrl.includes(rule.expectedValue || "");
            result.actualValue = currentUrl;
            result.message = result.passed
              ? `URL matches: ${currentUrl}`
              : `URL doesn't match. Expected: ${rule.expectedValue}, Got: ${currentUrl}`;
            break;

          case "element-exists":
            const element = await page.$(rule.selector || "");
            result.passed = element !== null;
            result.message = result.passed
              ? `Element exists: ${rule.selector}`
              : `Element not found: ${rule.selector}`;
            break;

          case "text-contains":
            const content = await page.textContent("body");
            result.passed = content?.includes(rule.expectedValue || "") || false;
            result.message = result.passed
              ? `Text found: ${rule.expectedValue}`
              : `Text not found: ${rule.expectedValue}`;
            break;

          case "element-visible":
            const visibleElement = await page.$(rule.selector || "");
            result.passed =
              visibleElement !== null &&
              (await visibleElement.isVisible());
            result.message = result.passed
              ? `Element visible: ${rule.selector}`
              : `Element not visible: ${rule.selector}`;
            break;

          default:
            result.message = `Unknown validation type: ${rule.type}`;
        }
      } catch (error: any) {
        result.message = `Validation error: ${error.message}`;
      }

      results.push(result);
    }

    return results;
  }

  /**
   * Get simplified DOM for AI analysis
   */
  private async getSimplifiedDOM(page: Page): Promise<string> {
    try {
      return await page.evaluate(() => {
        const body = document.body;
        // Get interactive elements
        const buttons = Array.from(document.querySelectorAll("button")).map(
          (b) => `Button: ${b.textContent?.trim()}`
        );
        const links = Array.from(document.querySelectorAll("a")).map(
          (a) => `Link: ${a.textContent?.trim()}`
        );
        const inputs = Array.from(document.querySelectorAll("input")).map(
          (i) => `Input: ${i.type} (${i.placeholder || i.name})`
        );

        return [
          `Interactive elements:`,
          ...buttons.slice(0, 10),
          ...links.slice(0, 10),
          ...inputs.slice(0, 10),
        ].join("\n");
      });
    } catch (error) {
      return "";
    }
  }

  /**
   * Get page content formatted for AI
   */
  private async getPageContentForAI(page: Page): Promise<string> {
    const title = await page.title();
    const url = page.url();
    const dom = await this.getSimplifiedDOM(page);

    return `Title: ${title}
URL: ${url}
${dom}`;
  }

  /**
   * Generate AI notes about the test execution
   */
  private async generateAINotes(
    mission: TestMission,
    steps: TestStep[],
    validations: ValidationResult[]
  ): Promise<string> {
    const successfulSteps = steps.filter((s) => s.success).length;
    const failedSteps = steps.filter((s) => !s.success).length;
    const passedValidations = validations.filter((v) => v.passed).length;

    return `Executed ${steps.length} steps (${successfulSteps} successful, ${failedSteps} failed). Validated ${passedValidations}/${validations.length} criteria.`;
  }

  /**
   * Take screenshot
   */
  private async takeScreenshot(
    page: Page,
    executionId: string,
    name: string
  ): Promise<string> {
    try {
      const filename = `${executionId}-${name}.png`;
      const filepath = path.join(this.screenshotsDir, filename);
      await page.screenshot({ path: filepath, fullPage: true });
      return filepath;
    } catch (error) {
      return "";
    }
  }

  /**
   * Launch browser
   */
  private async launchBrowser(config: BrowserConfig): Promise<void> {
    this.browser = await chromium.launch({
      headless: config.headless !== false,
      slowMo: config.slowMo || 0,
    });

    this.context = await this.browser.newContext({
      viewport: config.viewport || { width: 1280, height: 720 },
      recordVideo: config.recordVideo
        ? { dir: path.join(this.screenshotsDir, "videos") }
        : undefined,
    });
  }

  /**
   * Close browser
   */
  private async closeBrowser(): Promise<void> {
    if (this.context) {
      await this.context.close();
    }
    if (this.browser) {
      await this.browser.close();
    }
  }

  /**
   * Start interactive recording mode
   */
  async startRecording(
    name: string,
    startUrl: string
  ): Promise<InteractiveTestSession> {
    // TODO: Implement interactive recording
    // This would open a browser and observe user actions
    throw new Error("Interactive recording not yet implemented");
  }

  /**
   * Start watch mode
   */
  async startWatchMode(
    missions: string[],
    watchPaths: string[]
  ): Promise<void> {
    // TODO: Implement watch mode
    // This would watch files and re-run tests on changes
    throw new Error("Watch mode not yet implemented");
  }
}
