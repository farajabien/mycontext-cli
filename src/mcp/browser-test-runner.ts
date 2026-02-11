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
  DriftAlert,
} from "../types/flow-testing";
import { v4 as uuidv4 } from "uuid";
import { AIClient } from "../interfaces/AIClient";
import { ContextService } from "../services/ContextService";
import chalk from "chalk";

export class BrowserTestRunner {
  private projectPath: string;
  private browser?: Browser;
  private context?: BrowserContext;
  private aiClient: AIClient;
  private contextService: ContextService;
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
    this.contextService = new ContextService(projectPath);
  }

  /**
   * Initialize AI client from project config
   */
  private initializeAIClient(): AIClient {
    // Import and initialize the provider chain
    // This will check for available keys (MyContext, OpenAI, Claude, XAI)
    try {
      const { getProviderChain } = require("../clients/ProviderChain");
      return getProviderChain();
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

      // Milestone 4 & 5: State Attestation & Zero-Drift Synthesis
      const successfulGravityChecks = steps.filter(s => s.success && !s.action.startsWith('REJECTED')).length;
      const totalGravityAttempts = steps.length;
      const narrativeCompliance = totalGravityAttempts > 0 ? successfulGravityChecks / totalGravityAttempts : 1.0;

      const driftAlerts: DriftAlert[] = [];
      if (status === 'failed') {
        driftAlerts.push({
          type: 'objective',
          severity: 'high',
          message: 'Final state does not match expected outcome',
          expected: mission.expectedOutcome,
          actual: 'Validation failed on current page',
          timestamp: new Date().toISOString()
        });
      }

      // Check for rejected intents
      steps.filter(s => s.action.startsWith('REJECTED')).forEach(s => {
        driftAlerts.push({
          type: 'logic',
          severity: 'medium',
          message: `Intent rejected by Hard Gravity Engine: ${s.intent}`,
          expected: 'Aligned intent',
          actual: s.intent,
          timestamp: s.timestamp
        });
      });

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
        driftAnalysis: {
          narrativeCompliance,
          alerts: driftAlerts
        }
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

    // Load manifest for gravity (Milestone 2)
    await this.contextService.initialize();
    const manifest = this.contextService.getManifest();
    const primeObjective = manifest?.phases.functional_summary.core_purpose || mission.mission;

    // AI prompt to understand the mission
    const systemPrompt = `You are an AI agent performing UI testing. 

HARD GRAVITY (PRIME OBJECTIVE):
"${primeObjective}"

Your mission is:
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
      const aiResponse = await this.askAI(systemPrompt, pageContent, steps, mission);

      if (!aiResponse || aiResponse.action === "complete") {
        missionComplete = true;
        break;
      }

      // Milestone 2: Hard Gravity Check
      const grounding = await this.contextService.validateIntent(aiResponse.intent || "");
      if (!grounding.valid) {
        console.log(chalk.red(`\n🛑 GRAVITY INTERVENTION: Intent deviates from Prime Objective!`));
        console.log(chalk.yellow(`REASON: ${grounding.reason}`));
        
        // Add a "failed" step to record the deviation
        steps.push({
          id: uuidv4(),
          order: stepOrder++,
          action: `REJECTED: ${aiResponse.action}`,
          intent: aiResponse.intent,
          timestamp: new Date().toISOString(),
          success: false,
          error: `Gravity Intervention: ${grounding.reason}`
        });

        // Prompt AI to rethink with gravity awareness
        const correctionPrompt = `${systemPrompt}\n\n⚠️ PREVIOUS INTENT REJECTED: "${aiResponse.intent}"\nREASON: ${grounding.reason}\n\nPlease rethink your action to stay anchored to the Prime Objective.`;
        const retryResponse = await this.askAI(correctionPrompt, pageContent, steps, mission);
        
        if (!retryResponse || retryResponse.intent === aiResponse.intent) {
          console.log(chalk.red(`❌ AI failed to align with Gravity. Stopping.`));
          break;
        }
        
        // Swap response for the corrected one
        aiResponse.action = retryResponse.action;
        aiResponse.selector = retryResponse.selector;
        aiResponse.value = retryResponse.value;
        aiResponse.intent = retryResponse.intent;
      }

      // Execute the AI's decision
      const step = await this.executeAction(
        page,
        aiResponse,
        stepOrder++,
        executionId,
        mission
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
    previousSteps: TestStep[],
    mission: TestMission
  ): Promise<any> {
    try {
      // Prepare test data context
      const testDataContext = mission.testData
        ? `
Available Test Data:
- CV File: ${(mission.testData as any).cvFileName || 'sample-cv.pdf'}
- Update Notes: ${(mission.testData as any).updateNotes || 'N/A'}
- Job Description: ${(mission.testData as any).jobDescription ? 'Available' : 'N/A'}
`
        : '';

      const prompt = `${systemPrompt}

Page Content:
${pageContent}

Previous Steps:
${previousSteps.map((s) => `${s.order + 1}. ${s.action} - ${s.success ? "success" : "failed"}`).join("\n")}
${testDataContext}

What should be the next action? Respond in JSON format:
{
  "action": "click|fill|goto|wait|upload|complete",
  "selector": "element selector - use one of these formats:",
  "value": "value for fill/upload action",
  "intent": "why you're taking this action"
}

SELECTOR FORMATS (choose the most specific one that works):
1. Text-based (preferred for buttons/links): "Button text" or "Link text"
2. Playwright has-text: "button:has-text('Click me')" or "a:has-text('Learn more')"
3. Standard CSS: "#id", ".class", "button[type='submit']"
4. ARIA attributes: "[aria-label='Close']", "[role='button']"

EXAMPLES:
- Click a button: { "action": "click", "selector": "Refresh My CV", "intent": "switching to refresh mode" }
- Fill input: { "action": "fill", "selector": "input[type='email']", "value": "test@email.com", "intent": "entering email" }
- Upload file: { "action": "upload", "value": "sample-cv.pdf", "intent": "uploading CV file" }
- Navigate: { "action": "goto", "value": "/dashboard", "intent": "going to dashboard" }
- Wait: { "action": "wait", "intent": "waiting for page to load" }

IMPORTANT FOR FILE UPLOADS:
- Use "upload" action with the filename from Available Test Data
- Don't try to click file inputs - they're often hidden
- The system will automatically find the file input and upload the file

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
   * Infer what value to use for a field based on test data
   */
  private inferFieldValue(
    fieldSelector: string,
    aiProvidedValue: string | undefined,
    mission: TestMission
  ): string {
    // If AI provided a value and it's not a placeholder, use it
    if (aiProvidedValue && !aiProvidedValue.startsWith('[USE ')) {
      return aiProvidedValue;
    }

    // Try to match field to test data
    if (mission.testData) {
      const testData = mission.testData as any;
      const lowerSelector = fieldSelector.toLowerCase();

      // Match based on field purpose
      if ((lowerSelector.includes('note') || lowerSelector.includes('update')) && testData.updateNotes) {
        return testData.updateNotes;
      }
      if ((lowerSelector.includes('job') || lowerSelector.includes('description')) && testData.jobDescription) {
        return testData.jobDescription;
      }
      if (lowerSelector.includes('email') && testData.email) {
        return testData.email;
      }
      if (lowerSelector.includes('password') && testData.password) {
        return testData.password;
      }
      if (lowerSelector.includes('name') && testData.name) {
        return testData.name;
      }
    }

    // Fallback: use AI-provided value or empty string
    return aiProvidedValue || '';
  }

  /**
   * Execute an action on the page
   */
  private async executeAction(
    page: Page,
    aiDecision: any,
    order: number,
    executionId: string,
    mission: TestMission
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
            // Infer the correct value to use (from test data or AI)
            const valueToUse = this.inferFieldValue(
              aiDecision.selector,
              aiDecision.value,
              mission
            );

            await page.fill(fillSelector, valueToUse);
            step.metadata = {
              elementSelector: fillSelector,
              inputValue: valueToUse,
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

        case "upload":
          // Handle file upload (works with hidden file inputs)
          try {
            const fileInput = await page.$('input[type="file"]');
            if (fileInput && aiDecision.value) {
              // Construct file path from test-fixtures directory
              const filePath = path.join(
                this.projectPath,
                'test-fixtures',
                aiDecision.value
              );

              // Check if file exists
              if (!fs.existsSync(filePath)) {
                step.error = `File not found: ${filePath}`;
                break;
              }

              await fileInput.setInputFiles(filePath);
              step.metadata = {
                uploadedFile: aiDecision.value,
                filePath: filePath
              };
              step.success = true;
            } else {
              step.error = `File input not found or no file specified`;
            }
          } catch (error: any) {
            step.error = `Upload failed: ${error.message}`;
          }
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
   * Convert jQuery-style or ambiguous selectors to Playwright-compatible selectors
   */
  private convertToPlaywrightSelector(selector: string): string[] {
    const candidates: string[] = [];

    // Pattern 1: jQuery :contains() -> Playwright :has-text() or text=
    // e.g., "button:contains('Refresh My CV')" -> "button:has-text('Refresh My CV')"
    const containsMatch = selector.match(/^([a-z]+):contains\(['"](.+)['"]\)$/i);
    if (containsMatch) {
      const [, element, text] = containsMatch;
      candidates.push(`${element}:has-text("${text}")`);
      candidates.push(`${element} >> text="${text}"`);
      candidates.push(`${element}:text("${text}")`);
      return candidates;
    }

    // Pattern 2: Plain text -> multiple strategies
    // If it looks like plain text (no CSS selector chars)
    if (!/[#.\[\]:>~+]/.test(selector)) {
      candidates.push(`text="${selector}"`);              // Exact text
      candidates.push(`text=/${selector}/i`);             // Case-insensitive
      candidates.push(`button:has-text("${selector}")`);   // Button with text
      candidates.push(`a:has-text("${selector}")`);        // Link with text
      candidates.push(`[aria-label="${selector}"]`);       // ARIA label
      return candidates;
    }

    // Pattern 3: Already looks like a valid CSS selector
    candidates.push(selector);
    return candidates;
  }

  /**
   * Try to find form inputs using intelligent strategies
   */
  private async tryFormInputStrategies(page: Page, selector: string): Promise<string | null> {
    // Extract potential field keywords from selector
    const lowerSelector = selector.toLowerCase();
    const keywords = lowerSelector.match(/\b(update|notes|email|password|name|description|job|message|comment|text)\b/);

    if (!keywords) {
      // If selector looks like it might be for a textarea or input, try generic strategies
      if (lowerSelector.includes('textarea') || lowerSelector.includes('input')) {
        // Try to find any visible textarea or input
        const visibleTextarea = await page.$('textarea:visible');
        if (visibleTextarea) return 'textarea:visible';

        const visibleInput = await page.$('input[type="text"]:visible');
        if (visibleInput) return 'input[type="text"]:visible';
      }
      return null;
    }

    const keyword = keywords[0];

    // Strategy 1: Try by placeholder (case-insensitive)
    try {
      const byPlaceholder = `[placeholder*="${keyword}" i]`;
      if (await page.$(byPlaceholder)) return byPlaceholder;
    } catch {}

    // Strategy 2: Try by name attribute
    try {
      const byName = `[name*="${keyword}" i]`;
      if (await page.$(byName)) return byName;
    } catch {}

    // Strategy 3: Try by id attribute
    try {
      const byId = `[id*="${keyword}" i]`;
      if (await page.$(byId)) return byId;
    } catch {}

    // Strategy 4: Find textarea with nearby label containing keyword
    try {
      const textareas = await page.$$('textarea');
      for (const textarea of textareas) {
        if (await textarea.isVisible()) {
          // Check if there's a label near this textarea
          const textareaId = await textarea.getAttribute('id');
          if (textareaId) {
            const label = await page.$(`label[for="${textareaId}"]`);
            if (label) {
              const labelText = await label.textContent();
              if (labelText && labelText.toLowerCase().includes(keyword)) {
                return `#${textareaId}`;
              }
            }
          }
          // If no specific match, return first visible textarea for notes/updates
          if (['note', 'update', 'message', 'comment'].includes(keyword)) {
            return 'textarea:visible';
          }
        }
      }
    } catch {}

    // Strategy 5: Try input by type for specific keywords
    try {
      if (keyword === 'email') {
        if (await page.$('input[type="email"]')) return 'input[type="email"]';
      }
      if (keyword === 'password') {
        if (await page.$('input[type="password"]')) return 'input[type="password"]';
      }
      if (['name', 'text', 'description'].includes(keyword)) {
        if (await page.$('input[type="text"]:visible')) return 'input[type="text"]:visible';
      }
    } catch {}

    return null;
  }

  /**
   * Find element using multiple strategies
   */
  private async findElement(page: Page, selector: string): Promise<string | null> {
    // Convert selector to candidate selectors
    const candidates = this.convertToPlaywrightSelector(selector);

    // Try each candidate
    for (const candidate of candidates) {
      try {
        const element = await page.$(candidate);
        if (element) {
          return candidate;
        }
      } catch (error) {
        // Selector syntax error, try next candidate
        continue;
      }
    }

    // Additional fallback: Try with partial text matching
    try {
      const partialText = `text=/${selector.replace(/['"]/g, '')}/i`;
      if (await page.$(partialText)) {
        return partialText;
      }
    } catch {
      // Ignore errors
    }

    // NEW: Try form input strategies if still no match
    const formStrategy = await this.tryFormInputStrategies(page, selector);
    if (formStrategy) {
      return formStrategy;
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
