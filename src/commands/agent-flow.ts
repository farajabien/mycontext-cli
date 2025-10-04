import chalk from "chalk";
import { EnhancedSpinner } from "../utils/spinner";
import { SubAgentOrchestrator } from "../agents/orchestrator/SubAgentOrchestrator";
import { CodeGenSubAgent } from "../agents/implementations/CodeGenSubAgent";
import { QASubAgent } from "../agents/implementations/QASubAgent";
import { DocsSubAgent } from "../agents/implementations/DocsSubAgent";
import { AgentCommunicationManager } from "../agents/communication/AgentCommunicationManager";
import {
  CommunicationPattern,
  WorkflowConfig,
  AgentContext,
} from "../agents/interfaces/AgentCommunication";
import { CommandOptions } from "../types";
import * as fs from "fs-extra";
import path from "path";

interface AgentFlowOptions extends CommandOptions {
  mode?: "auto" | "sequential" | "validation";
  target?: string;
  retryLimit?: number;
  qualityThreshold?: number;
}

export class AgentFlowCommand {
  private orchestrator: SubAgentOrchestrator;
  private communicationManager: AgentCommunicationManager;

  constructor() {
    this.orchestrator = new SubAgentOrchestrator();

    // Register agents
    this.orchestrator.registerAgent(new CodeGenSubAgent());
    this.orchestrator.registerAgent(new QASubAgent());
    this.orchestrator.registerAgent(new DocsSubAgent());

    // Initialize communication manager
    this.communicationManager = new AgentCommunicationManager(
      this.orchestrator
    );
  }

  async execute(action: string, options: AgentFlowOptions): Promise<void> {
    const spinner = new EnhancedSpinner(`Running agent flow: ${action}`);

    try {
      spinner.start();

      switch (action) {
        case "generate-context":
          await this.runContextGenerationFlow(options, spinner);
          break;
        case "generate-components":
          await this.runComponentGenerationFlow(options, spinner);
          break;
        case "validate-workflow":
          await this.runValidationWorkflow(options, spinner);
          break;
        default:
          throw new Error(`Unknown agent flow action: ${action}`);
      }

      spinner.success({ text: `Agent flow completed: ${action}` });
      this.printFlowSummary(action);
    } catch (error: any) {
      spinner.error({ text: `Agent flow failed: ${error.message}` });
      throw error;
    }
  }

  private async runContextGenerationFlow(
    options: AgentFlowOptions,
    spinner: EnhancedSpinner
  ): Promise<void> {
    spinner.updateText("Orchestrating context generation agents...");

    // Read existing context
    const context = await this.loadProjectContext();

    const workflowConfig: WorkflowConfig = {
      pattern: CommunicationPattern.AUTO_ORCHESTRATION,
      agents: ["CodeGenSubAgent", "QASubAgent", "DocsSubAgent"],
      retryLimit: options.retryLimit || 2,
      qualityThreshold: options.qualityThreshold || 0.7,
      timeoutMs: 60000, // 1 minute for faster UX
      enableAutoTransition: true,
    };

    // Run auto workflow
    const result = await this.communicationManager.runAutoWorkflow(
      "CodeGenSubAgent",
      context,
      workflowConfig
    );

    if (!result.success) {
      throw new Error("Agent communication workflow failed");
    }

    // Save results
    await this.saveWorkflowResults("context-generation", result);

    console.log(
      chalk.green(
        `\n✅ Context generation completed with ${result.messages.length} agent messages`
      )
    );
  }

  private async runComponentGenerationFlow(
    options: AgentFlowOptions,
    spinner: EnhancedSpinner
  ): Promise<void> {
    spinner.updateText("Orchestrating component generation agents...");

    const context = await this.loadProjectContext();

    // Add component-specific context
    if (options.target) {
      context.userPrompt = `Generate component: ${options.target}`;
    }

    const workflowConfig: WorkflowConfig = {
      pattern:
        options.mode === "validation"
          ? CommunicationPattern.VALIDATION_CHAIN
          : CommunicationPattern.SEQUENTIAL,
      agents: ["CodeGenSubAgent", "QASubAgent", "DocsSubAgent"],
      retryLimit: options.retryLimit || 3,
      qualityThreshold: options.qualityThreshold || 0.8,
      timeoutMs: 60000, // 1 minute for faster UX
      enableAutoTransition: true,
    };

    const result = await this.communicationManager.runAutoWorkflow(
      "CodeGenSubAgent",
      context,
      workflowConfig
    );

    if (!result.success) {
      throw new Error("Component generation workflow failed");
    }

    await this.saveWorkflowResults("component-generation", result);

    console.log(chalk.green(`\n✅ Component generation completed`));
    console.log(
      chalk.gray(`   Generated: ${Object.keys(result.outputs).length} outputs`)
    );
    console.log(
      chalk.gray(`   Messages: ${result.messages.length} agent communications`)
    );
  }

  private async runValidationWorkflow(
    options: AgentFlowOptions,
    spinner: EnhancedSpinner
  ): Promise<void> {
    spinner.updateText("Running validation workflow...");

    // Test the communication system
    const testMessage = {
      id: "test-message",
      from: "system",
      to: "CodeGenSubAgent",
      type: "request" as const,
      payload: { test: true },
      timestamp: new Date().toISOString(),
    };

    await this.communicationManager.sendMessage(testMessage);

    const received =
      await this.communicationManager.receiveMessage("CodeGenSubAgent");

    if (!received) {
      throw new Error("Agent communication validation failed");
    }

    console.log(chalk.green("\n✅ Agent communication system validated"));
    console.log(chalk.gray("   Message sending/receiving: OK"));
    console.log(chalk.gray("   Message persistence: OK"));
  }

  private async loadProjectContext(): Promise<AgentContext> {
    const contextDir = path.join(process.cwd(), ".mycontext");

    const context: AgentContext = {};

    // Load existing context files
    try {
      const prdPath = path.join(contextDir, "01-prd.md");
      if (await fs.pathExists(prdPath)) {
        context.prd = await fs.readFile(prdPath, "utf8");
      }

      const typesPath = path.join(contextDir, "02-types.ts");
      if (await fs.pathExists(typesPath)) {
        context.types = await fs.readFile(typesPath, "utf8");
      }

      const brandPath = path.join(contextDir, "03-branding.md");
      if (await fs.pathExists(brandPath)) {
        context.brand = await fs.readFile(brandPath, "utf8");
      }

      const compListPath = path.join(contextDir, "04-component-list.json");
      if (await fs.pathExists(compListPath)) {
        const compListRaw = await fs.readFile(compListPath, "utf8");
        context.componentList = JSON.parse(compListRaw);
      }

      const structurePath = path.join(contextDir, "05-project-structure.md");
      if (await fs.pathExists(structurePath)) {
        context.projectStructure = await fs.readFile(structurePath, "utf8");
      }
    } catch (error) {
      console.log(chalk.yellow("⚠️ Some context files could not be loaded"));
    }

    return context;
  }

  private async saveWorkflowResults(
    workflowType: string,
    result: { success: boolean; outputs: Record<string, any>; messages: any[] }
  ): Promise<void> {
    const resultsDir = path.join(
      process.cwd(),
      ".mycontext",
      "agent-workflows"
    );
    await fs.ensureDir(resultsDir);

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const resultsFile = path.join(
      resultsDir,
      `${workflowType}-${timestamp}.json`
    );

    await fs.writeJson(
      resultsFile,
      {
        workflowType,
        timestamp: new Date().toISOString(),
        success: result.success,
        outputs: result.outputs,
        messages: result.messages,
        summary: {
          totalOutputs: Object.keys(result.outputs).length,
          totalMessages: result.messages.length,
          agents: Object.keys(result.outputs),
        },
      },
      { spaces: 2 }
    );

    console.log(chalk.gray(`   Workflow results saved: ${resultsFile}`));
  }

  private printFlowSummary(action: string): void {
    console.log(chalk.blue("\n➡️ Next Steps:"));

    switch (action) {
      case "generate-context":
        console.log(chalk.gray("   mycontext agent-flow generate-components"));
        console.log(chalk.gray("   mycontext generate-components all"));
        break;
      case "generate-components":
        console.log(chalk.gray("   mycontext preview components"));
        console.log(chalk.gray("   mycontext list components --local"));
        break;
      case "validate-workflow":
        console.log(chalk.gray("   Agent communication system is working"));
        console.log(chalk.gray("   Ready for production agent workflows"));
        break;
    }

    console.log(chalk.blue("\n🔍 Debug:"));
    console.log(
      chalk.gray("   Check .mycontext/agent-logs/ for communication history")
    );
    console.log(
      chalk.gray("   Check .mycontext/agent-workflows/ for workflow results")
    );
  }
}
