import {
  AgentMessage,
  AgentIntent,
  AgentContext,
  AgentCommunicationHandler,
  IntentResolver,
  WorkflowConfig,
} from "../interfaces/AgentCommunication";
import { SubAgentOrchestrator } from "../orchestrator/SubAgentOrchestrator";
import * as fs from "fs-extra";
import path from "path";

export class AgentCommunicationManager implements AgentCommunicationHandler {
  private messageHistory: AgentMessage[] = [];
  private orchestrator: SubAgentOrchestrator;
  private intentResolver: IntentResolver;

  constructor(
    orchestrator: SubAgentOrchestrator,
    intentResolver?: IntentResolver
  ) {
    this.orchestrator = orchestrator;
    this.intentResolver = intentResolver || new DefaultIntentResolver();
  }

  async sendMessage(message: AgentMessage): Promise<void> {
    this.messageHistory.push({
      ...message,
      timestamp: new Date().toISOString(),
    });

    // Save communication log for debugging
    await this.saveMessageLog(message);
  }

  async receiveMessage(agentName: string): Promise<AgentMessage | null> {
    // Get the latest message for this agent
    const messages = this.messageHistory.filter((m) => m.to === agentName);
    return messages.length > 0 ? messages[messages.length - 1]! : null;
  }

  async broadcastMessage(message: Omit<AgentMessage, "to">): Promise<void> {
    const agentNames = this.orchestrator.listAgents();

    for (const agentName of agentNames) {
      await this.sendMessage({
        ...message,
        to: agentName,
      } as AgentMessage);
    }
  }

  async getMessageHistory(agentName?: string): Promise<AgentMessage[]> {
    if (!agentName) return this.messageHistory;
    return this.messageHistory.filter(
      (m) => m.from === agentName || m.to === agentName
    );
  }

  async clearHistory(): Promise<void> {
    this.messageHistory = [];
  }

  private async saveMessageLog(message: AgentMessage): Promise<void> {
    try {
      const logDir = path.join(process.cwd(), ".mycontext", "agent-logs");
      await fs.ensureDir(logDir);

      const logFile = path.join(
        logDir,
        `communication-${new Date().toISOString().split("T")[0]}.json`
      );

      let logs: AgentMessage[] = [];
      if (await fs.pathExists(logFile)) {
        logs = await fs.readJson(logFile);
      }

      logs.push(message);
      await fs.writeJson(logFile, logs, { spaces: 2 });
    } catch (error) {
      // Silent fail - logging shouldn't break the workflow
    }
  }

  // Auto workflow orchestration
  async runAutoWorkflow(
    initialAgent: string,
    context: AgentContext,
    config: WorkflowConfig
  ): Promise<{
    success: boolean;
    outputs: Record<string, any>;
    messages: AgentMessage[];
  }> {
    let currentAgent = initialAgent;
    let outputs: Record<string, any> = {};
    let retryCount = 0;
    let attempts = 0;
    const maxAttempts = config.agents.length * 2; // Safety limit

    while (currentAgent && attempts < maxAttempts) {
      attempts++;

      try {
        // Execute current agent
        const agentOutput = await this.orchestrator.executeAgent(currentAgent, {
          context,
          previousOutputs: outputs,
          retryCount,
        });

        outputs[currentAgent] = agentOutput;

        // Analyze output and determine next action
        const intent = await this.intentResolver.analyzeOutput(
          agentOutput,
          context
        );

        // Send completion message
        await this.sendMessage({
          id: `${currentAgent}-${Date.now()}`,
          from: currentAgent,
          to: "coordinator",
          type: "completion",
          payload: { output: agentOutput, intent },
          timestamp: new Date().toISOString(),
        });

        // Check if we should trigger next agent
        if (
          config.enableAutoTransition &&
          (await this.intentResolver.shouldTriggerNextAgent(intent, context))
        ) {
          const nextAgent = await this.intentResolver.getNextAgent(
            intent,
            context
          );

          if (nextAgent) {
            // Create starter prompt for next agent
            const starterPrompt = await this.intentResolver.createStarterPrompt(
              intent,
              context
            );

            // Update context with new starter prompt
            context = {
              ...context,
              userPrompt: starterPrompt,
              previousOutputs: outputs,
            };

            // Send request to next agent
            await this.sendMessage({
              id: `transition-${Date.now()}`,
              from: currentAgent,
              to: nextAgent,
              type: "request",
              payload: {
                starterPrompt,
                context: context,
                intent,
              },
              timestamp: new Date().toISOString(),
            });

            currentAgent = nextAgent;
            retryCount = 0;
          } else {
            // No next agent, workflow complete
            break;
          }
        } else if (
          intent.action === "refine" &&
          retryCount < config.retryLimit
        ) {
          // Same agent needs to retry/refine
          retryCount++;
          context = {
            ...context,
            userPrompt:
              intent.nextSteps?.join(" ") || "Please refine the output",
            previousOutputs: outputs,
          };
        } else {
          // Workflow complete or max retries reached
          break;
        }
      } catch (error: any) {
        await this.sendMessage({
          id: `error-${Date.now()}`,
          from: currentAgent,
          to: "coordinator",
          type: "error",
          payload: { error: error.message, retryCount },
          timestamp: new Date().toISOString(),
        });

        if (retryCount < config.retryLimit) {
          retryCount++;
        } else {
          break;
        }
      }
    }

    return {
      success: Object.keys(outputs).length > 0,
      outputs,
      messages: this.messageHistory,
    };
  }
}

// Default intent resolver implementation
export class DefaultIntentResolver implements IntentResolver {
  async analyzeOutput(
    output: any,
    _context: AgentContext
  ): Promise<AgentIntent> {
    // Simple heuristic-based analysis
    const confidence = this.calculateConfidence(output);

    if (confidence < 0.3) {
      return {
        action: "refine",
        reason: "Output quality below threshold",
        confidence,
        nextSteps: ["Improve output quality", "Add missing details"],
      };
    }

    if (confidence > 0.8) {
      return {
        action: "complete",
        reason: "High quality output achieved",
        confidence,
        nextSteps: ["Proceed to next stage"],
      };
    }

    return {
      action: "generate",
      reason: "Acceptable output, continue workflow",
      confidence,
      nextSteps: ["Continue to next agent"],
    };
  }

  async shouldTriggerNextAgent(
    intent: AgentIntent,
    _context: AgentContext
  ): Promise<boolean> {
    return (
      intent.action === "complete" ||
      (intent.action === "generate" && intent.confidence > 0.6)
    );
  }

  async getNextAgent(
    _intent: AgentIntent,
    context: AgentContext
  ): Promise<string | null> {
    // Simple sequential flow for now
    const sequence = ["CodeGenSubAgent", "QASubAgent", "DocsSubAgent"];

    // Find current agent in sequence (based on context)
    if (context.previousOutputs) {
      const completed = Object.keys(context.previousOutputs);
      for (let i = 0; i < sequence.length; i++) {
        const agent = sequence[i];
        if (agent && !completed.includes(agent)) {
          return agent;
        }
      }
    }

    return sequence[0]!; // Default to first agent
  }

  async createStarterPrompt(
    intent: AgentIntent,
    context: AgentContext
  ): Promise<string> {
    const basePrompt = context.userPrompt || "Generate high-quality output";

    if (intent.action === "refine") {
      return `${basePrompt}\n\nPlease refine the previous output with these improvements:\n${
        intent.reason || "General improvements"
      }`;
    }

    if (
      context.previousOutputs &&
      Object.keys(context.previousOutputs).length > 0
    ) {
      const previousContext = Object.entries(context.previousOutputs)
        .map(
          ([agent, output]) =>
            `${agent}: ${
              typeof output === "string"
                ? output.substring(0, 200) + "..."
                : "Generated output"
            }`
        )
        .join("\n");

      return `${basePrompt}\n\nBuild upon previous agent outputs:\n${previousContext}`;
    }

    return basePrompt;
  }

  private calculateConfidence(output: any): number {
    if (!output) return 0;

    if (typeof output === "string") {
      // Simple heuristics for string output
      const length = output.length;
      const hasStructure = output.includes("\n") || output.includes("```");
      const hasDetails = length > 100;

      let score = 0.5;
      if (hasStructure) score += 0.2;
      if (hasDetails) score += 0.2;
      if (length > 500) score += 0.1;

      return Math.min(score, 1.0);
    }

    if (typeof output === "object") {
      // Object-based output confidence
      const keys = Object.keys(output);
      const hasCode = "code" in output;
      const hasMetadata = "metadata" in output;

      let score = 0.6;
      if (hasCode) score += 0.2;
      if (hasMetadata) score += 0.1;
      if (keys.length > 3) score += 0.1;

      return Math.min(score, 1.0);
    }

    return 0.5; // Default confidence
  }
}
