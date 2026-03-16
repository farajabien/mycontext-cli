/**
 * Vision Test Coordinator
 *
 * Orchestrates all vision-based testing agents using the Living Brain (context.json) as
 * the communication blackboard. Coordinates navigation, validation, demo recording, and
 * script generation in a cohesive workflow.
 *
 * Uses the SubAgentOrchestrator pattern for robust agent management.
 */

import { Page, BrowserContext } from "playwright";
import {
  SubAgent,
} from "./SubAgent";
import { SubAgentOrchestrator } from "../orchestrator/SubAgentOrchestrator";
import { VisionNavigatorAgent } from "./VisionNavigatorAgent";
import { VisualValidatorAgent } from "./VisualValidatorAgent";
import { DemoRecorderAgent } from "./DemoRecorderAgent";
import { VOScriptExtractorAgent } from "./VOScriptExtractorAgent";
import {
  VisionTestMission,
  VisionTestExecutionResult,
  VisionTestStep,
  VisualValidationResult,
  DemoArtifacts,
  LivingBrainUpdate,
} from "../types/vision-testing";
import { ContextService } from "../services/ContextService";
import { AICore } from "../core/AICore";
import { v4 as uuidv4 } from "uuid";
import chalk from "chalk";
import * as path from "path";

export interface VisionTestCoordinatorInput {
  page: Page;
  browserContext: BrowserContext;
  mission: VisionTestMission;
  projectPath: string;
  interactive?: boolean;
}

export interface VisionTestCoordinatorOutput {
  result: VisionTestExecutionResult;
  success: boolean;
}

export class VisionTestCoordinator
  implements SubAgent<VisionTestCoordinatorInput, VisionTestCoordinatorOutput>
{
  name = "VisionTestCoordinator";
  description =
    "Master coordinator for vision-based testing workflows";
  personality: string;
  llmProvider: string;
  expertise: string[];

  private orchestrator: SubAgentOrchestrator;
  private contextService?: ContextService;

  // Specialized agents
  private navigatorAgent: VisionNavigatorAgent;
  private validatorAgent: VisualValidatorAgent;
  private recorderAgent: DemoRecorderAgent;
  private voExtractorAgent: VOScriptExtractorAgent;

  constructor() {
    this.personality = `You are a master coordinator overseeing an autonomous testing team.
You delegate tasks to specialized agents, monitor their progress via the Living Brain, and
ensure all pieces come together into a cohesive test execution. You're the conductor of the
vision testing orchestra.`;

    this.llmProvider = "multi"; // Uses multiple providers through agents
    this.expertise = [
      "Test orchestration",
      "Agent coordination",
      "Workflow management",
      "Result aggregation",
      "Living Brain communication",
    ];

    // Initialize orchestrator
    this.orchestrator = new SubAgentOrchestrator();

    // Initialize specialized agents
    this.navigatorAgent = new VisionNavigatorAgent();
    this.validatorAgent = new VisualValidatorAgent();
    this.recorderAgent = new DemoRecorderAgent();
    this.voExtractorAgent = new VOScriptExtractorAgent();

    // Register agents with orchestrator
    this.orchestrator.registerAgent(this.navigatorAgent);
    this.orchestrator.registerAgent(this.validatorAgent);
    this.orchestrator.registerAgent(this.recorderAgent);
    this.orchestrator.registerAgent(this.voExtractorAgent);
  }

  async run(
    input: VisionTestCoordinatorInput
  ): Promise<VisionTestCoordinatorOutput> {
    const { page, browserContext, mission, projectPath } = input;

    // Initialize context service
    this.contextService = new ContextService(projectPath);
    await this.contextService.initialize();

    const executionId = uuidv4();
    const startTime = Date.now();

    console.log(chalk.bold.blue(`\n${"=".repeat(60)}`));
    console.log(chalk.bold.blue(`🎯 VISION TEST COORDINATOR`));
    console.log(chalk.bold.blue(`${"=".repeat(60)}\n`));
    console.log(chalk.white(`Mission: ${mission.name}`));
    console.log(chalk.gray(`ID: ${executionId}`));
    console.log(chalk.gray(`Record Demo: ${mission.recordDemo || false}\n`));

    // Write mission start to Living Brain
    await this.writeLivingBrain({
      timestamp: new Date().toISOString(),
      agentName: this.name,
      updateType: "test-start",
      data: {
        executionId,
        missionId: mission.id,
        missionName: mission.name,
        recordDemo: mission.recordDemo,
      },
      metadata: {
        testId: mission.id,
        executionId,
      },
    });

    try {
      // PHASE 1: Navigation
      console.log(chalk.bold.cyan(`\n━━━ PHASE 1: NAVIGATION ━━━`));

      const navigationResult = await this.orchestrator.executeAgent<any, any>(
        this.navigatorAgent.name,
        {
          page,
          mission,
          projectPath,
          maxSteps: 20,
          interactive: input.interactive,
        }
      );

      const steps: VisionTestStep[] = navigationResult.steps;

      console.log(
        chalk.green(
          `\n✓ Navigation complete: ${steps.length} steps executed`
        )
      );

      // PHASE 2: Validation (if validation rules exist)
      console.log(chalk.bold.cyan(`\n━━━ PHASE 2: VALIDATION ━━━`));

      let validationResults: VisualValidationResult[] = [];

      if (
        mission.validationRules &&
        mission.validationRules.length > 0
      ) {
        // Get final screenshot
        const finalStep = steps[steps.length - 1];
        const currentScreenshot = finalStep?.screenshot || "";

        const validationOutput = await this.orchestrator.executeAgent<any, any>(
          this.validatorAgent.name,
          {
            currentScreenshot,
            baselineScreenshot: mission.baselineScreenshots?.[0],
            validationRules: mission.validationRules,
            projectPath,
            page,
          }
        );

        validationResults = validationOutput.results;

        console.log(
          chalk.green(
            `\n✓ Validation complete: ${validationOutput.summary.passed}/${validationOutput.summary.totalChecks} passed`
          )
        );
      } else {
        console.log(chalk.gray("  No validation rules defined, skipping..."));
      }

      // PHASE 3: Demo Recording (if requested)
      let demoArtifacts: DemoArtifacts | undefined;

      if (mission.recordDemo && mission.demoConfig) {
        console.log(chalk.bold.cyan(`\n━━━ PHASE 3: DEMO RECORDING ━━━`));

        const recorderOutput = await this.orchestrator.executeAgent<any, any>(
          this.recorderAgent.name,
          {
            browserContext,
            steps,
            config: mission.demoConfig,
            projectPath,
            missionName: mission.name,
            missionDescription: mission.description,
          }
        );

        demoArtifacts = recorderOutput.artifacts;

        if (demoArtifacts) {
          console.log(
            chalk.green(
              `\n✓ Demo artifacts generated in ${Object.keys(demoArtifacts.formats).length} format(s)`
            )
          );
        }

        // PHASE 4: VO Script Generation (if requested)
        if (mission.demoConfig.includeVoiceOver) {
          console.log(chalk.bold.cyan(`\n━━━ PHASE 4: VO SCRIPT GENERATION ━━━`));

          const voScriptPath = path.join(
            projectPath,
            ".mycontext",
            "demos",
            `${mission.name}-${Date.now()}`,
            "voiceover-script.json"
          );

          const voOutput = await this.orchestrator.executeAgent<any, any>(
            this.voExtractorAgent.name,
            {
              steps,
              missionName: mission.name,
              missionDescription: mission.description,
              narrationStyle: mission.demoConfig.narrationStyle,
              projectPath,
              outputPath: voScriptPath,
              generateAudio: mission.demoConfig.generateAudio,
              ttsConfig: mission.demoConfig.ttsConfig,
            }
          );

          if (demoArtifacts && voOutput.success) {
            demoArtifacts.voiceOver = {
              script: voOutput.script,
              audio: voOutput.audioPath
                ? {
                    path: voOutput.audioPath,
                    duration: voOutput.script.totalDuration,
                    format: "mp3",
                  }
                : undefined,
            };
          }

          console.log(
            chalk.green(
              `\n✓ Voice-over script generated with ${voOutput.script.segments.length} segments`
            )
          );
        }
      }

      // Calculate final result
      const endTime = Date.now();
      const duration = endTime - startTime;

      const successfulSteps = steps.filter((s) => s.success).length;
      const passedValidations = validationResults.filter((v) => v.passed).length;

      const allStepsSuccessful = successfulSteps === steps.length;
      const allValidationsPassed =
        validationResults.length === 0 ||
        passedValidations === validationResults.length;

      const finalStatus =
        allStepsSuccessful && allValidationsPassed ? "passed" : "failed";

      // Get final URL
      const finalUrl = page.url();

      // Build test execution result
      const testResult: VisionTestExecutionResult = {
        missionId: mission.id,
        executionId,
        status: finalStatus,
        startedAt: new Date(startTime).toISOString(),
        completedAt: new Date(endTime).toISOString(),
        duration,
        steps,
        validationResults,
        finalState: {
          url: finalUrl,
          screenshot: steps[steps.length - 1]?.screenshot,
        },
        visualSummary: {
          totalScreenshots: steps.filter((s) => s.screenshot).length,
          visualRegressionsDetected: validationResults.filter(
            (v) => !v.passed && v.rule.type?.includes("visual")
          ).length,
          colorSchemeMatches: validationResults.every(
            (v) => v.passed || v.rule.type !== "color-scheme-match"
          ),
          layoutMatches: validationResults.every(
            (v) => v.passed || v.rule.type !== "layout-match"
          ),
        },
        demoArtifacts,
      };

      // Write completion to Living Brain
      await this.writeLivingBrain({
        timestamp: new Date().toISOString(),
        agentName: this.name,
        updateType: "test-complete",
        data: {
          executionId,
          status: finalStatus,
          duration,
          totalSteps: steps.length,
          successfulSteps,
          validationResults: validationResults.length,
          passedValidations,
          demoGenerated: !!demoArtifacts,
        },
        metadata: {
          testId: mission.id,
          executionId,
        },
      });

      // Print final summary
      console.log(chalk.bold.blue(`\n${"=".repeat(60)}`));
      console.log(
        chalk.bold[finalStatus === "passed" ? "green" : "red"](
          `${finalStatus === "passed" ? "✅ TEST PASSED" : "❌ TEST FAILED"}`
        )
      );
      console.log(chalk.bold.blue(`${"=".repeat(60)}\n`));
      console.log(chalk.white(`Duration: ${(duration / 1000).toFixed(1)}s`));
      console.log(chalk.white(`Steps: ${successfulSteps}/${steps.length} successful`));
      if (validationResults.length > 0) {
        console.log(
          chalk.white(
            `Validations: ${passedValidations}/${validationResults.length} passed`
          )
        );
      }
      if (demoArtifacts) {
        console.log(
          chalk.white(
            `Demo formats: ${Object.keys(demoArtifacts.formats).join(", ")}`
          )
        );
      }
      console.log("");

      return {
        result: testResult,
        success: finalStatus === "passed",
      };
    } catch (error: any) {
      const endTime = Date.now();
      const duration = endTime - startTime;

      console.error(chalk.red(`\n❌ Test execution error: ${error.message}`));

      // Write error to Living Brain
      await this.writeLivingBrain({
        timestamp: new Date().toISOString(),
        agentName: this.name,
        updateType: "error",
        data: {
          executionId,
          error: error.message,
          stack: error.stack,
          duration,
        },
        metadata: {
          testId: mission.id,
          executionId,
        },
      });

      // Return error result
      const errorResult: VisionTestExecutionResult = {
        missionId: mission.id,
        executionId,
        status: "error",
        startedAt: new Date(startTime).toISOString(),
        completedAt: new Date(endTime).toISOString(),
        duration,
        steps: [],
        validationResults: [],
        finalState: {
          url: page.url(),
        },
        error: {
          message: error.message,
          stack: error.stack,
        },
      };

      return {
        result: errorResult,
        success: false,
      };
    }
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

      // Keep only last 100 updates
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

  async validate(input: VisionTestCoordinatorInput): Promise<boolean> {
    return !!(
      input.page &&
      input.browserContext &&
      input.mission &&
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
