/**
 * Vision Navigator Agent
 *
 * Autonomous agent that navigates UIs using vision-based understanding.
 * Observes -> Thinks -> Acts loop powered by visual AI.
 *
 * Communicates via Living Brain (context.json) following the blackboard pattern.
 */

import { Page } from "playwright";
import {
  SubAgent,
  QAValidationInput,
  QAValidationOutput,
} from "./SubAgent";
import { VisionElementFinder } from "../services/vision-element-finder";
import {
  VisionTestMission,
  VisionActionDecision,
  VisionTestStep,
  LivingBrainUpdate,
} from "../types/vision-testing";
import { ContextService } from "../services/ContextService";
import { AICore } from "../core/AICore";
import { v4 as uuidv4 } from "uuid";
import chalk from "chalk";
import inquirer from "inquirer";

export interface VisionNavigatorInput {
  page: Page;
  mission: VisionTestMission;
  projectPath: string;
  maxSteps?: number; // Maximum steps to prevent infinite loops
  interactive?: boolean; // Enable human-in-the-loop if confidence is low
}

export interface VisionNavigatorOutput {
  steps: VisionTestStep[];
  completed: boolean;
  finalUrl: string;
  reason?: string; // Why it stopped (completed, max steps, error, etc.)
}

export class VisionNavigatorAgent
  implements SubAgent<VisionNavigatorInput, VisionNavigatorOutput>
{
  name = "VisionNavigatorAgent";
  description =
    "Autonomous navigator that understands UIs through vision and executes test missions";
  personality: string;
  llmProvider: string;
  expertise: string[];

  private visionFinder?: VisionElementFinder;
  private contextService?: ContextService;

  constructor() {
    this.personality = `You are a meticulous AI agent that navigates web applications by
visually understanding the UI, just like a human would. You see the page, understand the context,
and make intelligent decisions about what to click, fill, or interact with. You ALWAYS validate
your actions against the project's Prime Objective to prevent mission drift.`;

    this.llmProvider = "gemini-vision"; // Uses Gemini for vision
    this.expertise = [
      "Vision-based UI understanding",
      "Autonomous navigation",
      "Intent validation",
      "Adaptive element finding",
      "Test execution",
    ];
  }

  async run(input: VisionNavigatorInput): Promise<VisionNavigatorOutput> {
    const { page, mission, projectPath, maxSteps = 20, interactive = false } = input;

    // Initialize services
    this.visionFinder = new VisionElementFinder(projectPath);
    this.contextService = new ContextService(projectPath);
    await this.contextService.initialize();

    // Get Prime Objective from manifest (for gravity checking)
    const manifest = this.contextService.getManifest();
    const primeObjective =
      manifest?.phases?.functional_summary?.core_purpose ||
      "Complete the test mission";

    console.log(chalk.blue(`\n🤖 ${this.name} starting navigation...`));
    console.log(chalk.gray(`Mission: ${mission.mission}`));
    console.log(chalk.gray(`Prime Objective: ${primeObjective}\n`));

    // Write mission start to Living Brain
    await this.writeLivingBrain({
      timestamp: new Date().toISOString(),
      agentName: this.name,
      updateType: "test-start",
      data: {
        missionId: mission.id,
        mission: mission.mission,
        expectedOutcome: mission.expectedOutcome,
      },
      metadata: {
        testId: mission.id,
      },
    });

    const steps: VisionTestStep[] = [];
    let completed = false;
    let reason = "";
    let stepOrder = 0;

    try {
      // Main navigation loop: Observe -> Think -> Act
      while (!completed && stepOrder < maxSteps) {
        console.log(chalk.cyan(`\n📸 Step ${stepOrder + 1}: Observing...`));

        // 1. OBSERVE: Analyze current page state with vision
        const pageAnalysis = await this.visionFinder.analyzePage(page);
        console.log(
          chalk.gray(`   UI State: ${pageAnalysis.aiInterpretation}`)
        );

        // 2. THINK: Decide next action based on mission and current state
        const previousStepDescriptions = steps.map(
          (s) => `${s.action} (${s.success ? "✓" : "✗"})`
        );

        console.log(chalk.yellow(`\n🤔 Thinking: Deciding next action...`));

        const decision = await this.visionFinder.decideNextAction(
          page,
          mission.mission,
          previousStepDescriptions,
          primeObjective
        );

        console.log(chalk.gray(`   Decision: ${decision.action}`));
        console.log(chalk.gray(`   Reasoning: ${decision.reasoning}`));
        console.log(
          chalk.gray(`   Confidence: ${decision.confidence}%`)
        );
        
        // INTERACTIVE MODE: Ask user for help if confidence is low
        if (interactive && decision.confidence < 75 && decision.action !== "complete") {
            console.log(chalk.bold.yellow(`\n⚠️  LOW CONFIDENCE ALERT: AI is unsure about the next move.`));
            const userDecision = await this.promptUser(decision);
            
            // Apply user overrides
            if (userDecision.action === "override") {
                decision.action = userDecision.newAction as any;
                decision.intent = userDecision.newIntent || decision.intent;
                decision.value = userDecision.newValue || decision.value;
                decision.reasoning = `[USER OVERRIDE] ${userDecision.reasoning}`;
                console.log(chalk.green(`   Using user override: ${decision.action}`));
            } else if (userDecision.action === "skip") {
                console.log(chalk.yellow(`   User chose to skip this suggested action.`));
                continue; // Skip this step and observe again
            } else {
                console.log(chalk.green(`   User approved the AI's suggestion.`));
            }
        }

        // Gravity Check: Validate alignment with Prime Objective
        if (!decision.alignsWithPrimeObjective) {
          console.log(
            chalk.red(
              `\n🛑 GRAVITY ALERT: Decision deviates from Prime Objective!`
            )
          );
          console.log(
            chalk.yellow(`   Gravity Score: ${decision.gravityScore}%`)
          );

          // Record failed step
          const failedStep: VisionTestStep = {
            id: uuidv4(),
            order: stepOrder++,
            action: `REJECTED: ${decision.action}`,
            intent: decision.intent,
            timestamp: new Date().toISOString(),
            success: false,
            error: `Gravity intervention: Action doesn't align with Prime Objective`,
            visionDecision: decision,
          };

          steps.push(failedStep);

          await this.writeLivingBrain({
            timestamp: new Date().toISOString(),
            agentName: this.name,
            updateType: "test-step",
            data: failedStep,
            metadata: {
              testId: mission.id,
              stepId: failedStep.id,
            },
          });

          // Ask AI to reconsider
          console.log(
            chalk.yellow(
              `   Re-thinking with gravity awareness...`
            )
          );
          // For now, we'll break the loop
          // In production, you'd retry with corrected context
          reason = "Gravity intervention - mission drift prevented";
          break;
        }

        // Check if mission is complete
        if (decision.action === "complete") {
          completed = true;
          reason = "Mission completed successfully";
          console.log(chalk.green(`\n✅ Mission complete!`));
          break;
        }

        // 3. ACT: Execute the decided action
        console.log(chalk.magenta(`\n⚡ Acting: Executing ${decision.action}...`));

        const step = await this.executeAction(
          page,
          decision,
          stepOrder++,
          mission
        );

        // Attach screenshot and visual analysis from the OBSERVE phase
        step.screenshot = pageAnalysis.screenshot;
        step.visualAnalysis = {
          componentsDetected: pageAnalysis.elements.map(e => e.description),
          interactiveElements: pageAnalysis.interactiveElements.map(e => e.description),
          textContent: [pageAnalysis.uiState.mainContent],
          colorPalette: pageAnalysis.designSystem.colors,
          layoutStructure: pageAnalysis.layoutStructure.type
        };

        steps.push(step);

        // Write step to Living Brain
        await this.writeLivingBrain({
          timestamp: new Date().toISOString(),
          agentName: this.name,
          updateType: "test-step",
          data: step,
          metadata: {
            testId: mission.id,
            executionId: `${mission.id}-${Date.now()}`,
            stepId: step.id,
          },
        });

        if (!step.success) {
          console.log(chalk.red(`   ❌ Step failed: ${step.error}`));
          reason = `Step failed: ${step.error}`;
          break;
        }

        console.log(chalk.green(`   ✓ Step successful`));

        // Brief pause for page to settle
        await page.waitForTimeout(1000);
      }

      // Check if we hit max steps
      if (stepOrder >= maxSteps && !completed) {
        reason = `Reached maximum steps (${maxSteps})`;
        console.log(chalk.yellow(`\n⚠️  ${reason}`));
      }

      const finalUrl = page.url();

      // Write completion to Living Brain
      await this.writeLivingBrain({
        timestamp: new Date().toISOString(),
        agentName: this.name,
        updateType: "test-complete",
        data: {
          completed,
          totalSteps: steps.length,
          successfulSteps: steps.filter((s) => s.success).length,
          finalUrl,
          reason,
        },
        metadata: {
          testId: mission.id,
        },
      });

      console.log(
        chalk.blue(
          `\n🏁 Navigation complete: ${steps.length} steps executed`
        )
      );

      return {
        steps,
        completed,
        finalUrl,
        reason,
      };
    } catch (error: any) {
      console.error(chalk.red(`\n❌ Navigation error: ${error.message}`));

      // Write error to Living Brain
      await this.writeLivingBrain({
        timestamp: new Date().toISOString(),
        agentName: this.name,
        updateType: "error",
        data: {
          error: error.message,
          stack: error.stack,
          stepsCompleted: steps.length,
        },
        metadata: {
          testId: mission.id,
        },
      });

      throw error;
    }
  }

  /**
   * Execute an action decided by the AI
   */
  private async executeAction(
    page: Page,
    decision: VisionActionDecision,
    order: number,
    mission: VisionTestMission
  ): Promise<VisionTestStep> {
    const step: VisionTestStep = {
      id: uuidv4(),
      order,
      action: `${decision.action}: ${decision.targetElement?.description || decision.value || decision.url || ""}`,
      intent: decision.intent,
      timestamp: new Date().toISOString(),
      success: false,
      visionDecision: decision,
    };

    try {
      switch (decision.action) {
        case "click":
          if (!decision.targetElement) {
            throw new Error("No target element specified for click action");
          }

          const clickSuccess = await this.visionFinder!.clickElement(
            page,
            decision.targetElement as any
          );

          if (!clickSuccess) {
            throw new Error("Click action failed");
          }

          step.metadata = {
            elementSelector: decision.targetElement.domSelector,
            clickedElement: decision.targetElement.description,
          };
          step.success = true;
          break;

        case "fill":
          if (!decision.targetElement || !decision.value) {
            throw new Error(
              "No target element or value specified for fill action"
            );
          }

          const fillSuccess = await this.visionFinder!.fillElement(
            page,
            decision.targetElement as any,
            decision.value
          );

          if (!fillSuccess) {
            throw new Error("Fill action failed");
          }

          step.metadata = {
            elementSelector: decision.targetElement.domSelector,
            inputValue: decision.value,
          };
          step.success = true;
          break;

        case "navigate":
          if (!decision.url) {
            throw new Error("No URL specified for navigate action");
          }

          await page.goto(decision.url);
          step.metadata = {
            navigationTarget: decision.url,
            url: page.url(),
          };
          step.success = true;
          break;

        case "scroll":
          await page.evaluate(() => {
            window.scrollBy(0, window.innerHeight);
          });
          step.success = true;
          break;

        case "wait":
          await page.waitForTimeout(2000);
          step.success = true;
          break;

        case "upload":
          // File upload would be handled here
          // Similar to the existing implementation
          step.error = "Upload action not yet implemented in VisionNavigatorAgent";
          break;

        default:
          step.error = `Unknown action: ${decision.action}`;
      }
    } catch (error: any) {
      step.error = error.message;
      step.success = false;
    }

    return step;
  }

  /**
   * Write update to Living Brain (context.json)
   */
  private async writeLivingBrain(update: LivingBrainUpdate): Promise<void> {
    try {
      // Read current context using AICore
      const aiCore = AICore.getInstance();
      const currentContext: any = (await aiCore.getLivingContext()) || {};

      // Add to test execution history
      if (!currentContext.testExecutionHistory) {
        currentContext.testExecutionHistory = [];
      }

      currentContext.testExecutionHistory.push(update);

      // Keep only last 100 updates to prevent bloat
      if (currentContext.testExecutionHistory.length > 100) {
        currentContext.testExecutionHistory = currentContext.testExecutionHistory.slice(
          -100
        );
      }

      // Save back to context.json using AICore
      await aiCore.saveLivingContext(currentContext);
    } catch (error) {
      console.warn("Failed to write to Living Brain:", error);
      // Don't throw - Living Brain writes are best-effort
    }
  }

  /**
   * Prompt user for guidance via TUI
   */
  private async promptUser(decision: VisionActionDecision): Promise<any> {
    console.log(chalk.gray(`\n   AI Suggested: ${chalk.bold(decision.action)} ${decision.intent}`));
    console.log(chalk.gray(`   AI Reasoning: ${decision.reasoning}`));
    
    const { choice } = await inquirer.prompt([
        {
            type: "list",
            name: "choice",
            message: "AI has low confidence. What should we do?",
            choices: [
                { name: "Approve - Let the AI try its suggestion", value: "approve" },
                { name: "Override - Provide a different command", value: "override" },
                { name: "Skip - Re-observe the page", value: "skip" },
                { name: "Abort - End the mission", value: "abort" }
            ]
        }
    ]);

    if (choice === "abort") {
        throw new Error("Mission aborted by user");
    }

    if (choice === "override") {
        const answers = await inquirer.prompt([
            {
                type: "list",
                name: "newAction",
                message: "Select new action:",
                choices: ["click", "fill", "navigate", "scroll", "wait"]
            },
            {
                type: "input",
                name: "newIntent",
                message: "Enter intent (e.g., 'click the login button'):"
            },
            {
                type: "input",
                name: "newValue",
                message: "Value (for 'fill' actions):",
                when: (answers: any) => answers.newAction === "fill"
            },
            {
                type: "input",
                name: "reasoning",
                message: "Briefly explain the override reasoning:",
                default: "Manually corrected navigation path"
            }
        ]);
        return { action: "override", ...answers };
    }

    return { action: choice };
  }

  async validate(input: VisionNavigatorInput): Promise<boolean> {
    return !!(input.page && input.mission && input.projectPath);
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
