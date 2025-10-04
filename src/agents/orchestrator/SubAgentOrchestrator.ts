/**
 * Sub-Agent Orchestrator
 *
 * Manages the registration, execution, and orchestration of sub-agents.
 * Supports both sequential and parallel execution patterns.
 */

import {
  SubAgent,
  SubAgentOrchestrator as ISubAgentOrchestrator,
  WorkflowStep,
  WorkflowResult,
  WorkflowStepResult,
  OrchestratorStatus,
  SubAgentStatus,
} from "../interfaces/SubAgent";
import { getSubAgentPersonality } from "../personalities/definitions";
import { EnhancedSpinner } from "../../utils/spinner";
import { logger } from "../../utils/logger";
import chalk from "chalk";

export class SubAgentOrchestrator implements ISubAgentOrchestrator {
  private agents: Map<string, SubAgent<any, any>> = new Map();
  private executionHistory: WorkflowStepResult[] = [];
  private activeWorkflows: Set<string> = new Set();
  private totalExecutions = 0;
  private totalExecutionTime = 0;

  /**
   * Register a sub-agent with the orchestrator
   */
  registerAgent<TInput, TOutput>(agent: SubAgent<TInput, TOutput>): void {
    if (this.agents.has(agent.name)) {
      logger.warn(
        `Sub-agent '${agent.name}' is already registered. Overwriting.`
      );
    }

    this.agents.set(agent.name, agent);
    logger.verbose(`Registered sub-agent: ${agent.name}`);
  }

  /**
   * Execute a single sub-agent
   */
  async executeAgent<TInput, TOutput>(
    agentName: string,
    input: TInput
  ): Promise<TOutput> {
    const agent = this.agents.get(agentName);
    if (!agent) {
      throw new Error(
        `Sub-agent '${agentName}' not found. Available agents: ${Array.from(
          this.agents.keys()
        ).join(", ")}`
      );
    }

    const personality = getSubAgentPersonality(agentName);
    const spinner = new EnhancedSpinner(`🤖 Executing ${agentName}...`);

    try {
      spinner.start();

      // Validate input if the agent supports it
      if (agent.validate) {
        const isValid = await agent.validate(input);
        if (!isValid) {
          throw new Error(
            `Input validation failed for sub-agent '${agentName}'`
          );
        }
      }

      const startTime = Date.now();
      const result = await agent.run(input);
      const executionTime = Date.now() - startTime;

      // Record execution
      this.recordExecution(agentName, true, executionTime, result);

      spinner.success({ text: `${agentName} completed in ${executionTime}ms` });

      if (personality) {
        console.log(chalk.blue(`💡 ${personality.description}`));
      }

      return result;
    } catch (error) {
      const executionTime = 0;
      this.recordExecution(
        agentName,
        false,
        executionTime,
        undefined,
        error as string
      );

      spinner.error({ text: `${agentName} failed: ${error}` });
      throw error;
    } finally {
      // Cleanup if the agent supports it
      if (agent.cleanup) {
        try {
          await agent.cleanup();
        } catch (cleanupError) {
          console.warn(
            chalk.yellow(`⚠️  Cleanup failed for ${agentName}: ${cleanupError}`)
          );
        }
      }
    }
  }

  /**
   * Execute a workflow with multiple sub-agents
   */
  async executeWorkflow<T>(
    workflow: WorkflowStep[]
  ): Promise<WorkflowResult<T>> {
    const workflowId = `workflow-${Date.now()}`;
    this.activeWorkflows.add(workflowId);

    const spinner = new EnhancedSpinner(
      `🔄 Executing workflow with ${workflow.length} steps...`
    );
    const startTime = Date.now();
    const results: WorkflowStepResult[] = [];

    try {
      spinner.start();

      // Build dependency graph
      const dependencyGraph = this.buildDependencyGraph(workflow);

      // Execute steps in dependency order
      const executedSteps = new Set<string>();
      const stepResults = new Map<string, any>();

      while (executedSteps.size < workflow.length) {
        const readySteps = this.getReadySteps(
          workflow,
          dependencyGraph,
          executedSteps,
          stepResults
        );

        if (readySteps.length === 0) {
          throw new Error("Circular dependency detected in workflow");
        }

        // Execute ready steps in parallel
        const parallelResults = await Promise.allSettled(
          readySteps.map(async (step) => {
            const stepStartTime = Date.now();

            try {
              // Resolve input dependencies
              const resolvedInput = this.resolveStepInput(step, stepResults);

              const result = await this.executeAgent(
                step.agentName,
                resolvedInput
              );
              const stepExecutionTime = Date.now() - stepStartTime;

              const stepResult: WorkflowStepResult = {
                stepId: step.id,
                agentName: step.agentName,
                success: true,
                data: result,
                executionTime: stepExecutionTime,
                startTime: new Date(stepStartTime),
                endTime: new Date(),
              };

              results.push(stepResult);
              stepResults.set(step.id, result);
              executedSteps.add(step.id);

              return stepResult;
            } catch (error) {
              const stepExecutionTime = Date.now() - stepStartTime;

              const stepResult: WorkflowStepResult = {
                stepId: step.id,
                agentName: step.agentName,
                success: false,
                error: error as string,
                executionTime: stepExecutionTime,
                startTime: new Date(stepStartTime),
                endTime: new Date(),
              };

              results.push(stepResult);
              throw error;
            }
          })
        );

        // Check for failures
        const failures = parallelResults.filter(
          (result) => result.status === "rejected"
        );
        if (failures.length > 0) {
          const errorMessages = failures
            .map((f) => (f as PromiseRejectedResult).reason)
            .join(", ");
          throw new Error(`Workflow step failures: ${errorMessages}`);
        }
      }

      const executionTime = Date.now() - startTime;
      const success = results.every((r) => r.success);

      spinner.success({ text: `Workflow completed in ${executionTime}ms` });

      return {
        success,
        data: stepResults.get(workflow[workflow.length - 1].id),
        executionTime,
        steps: results,
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      spinner.error({ text: `Workflow failed: ${error}` });

      return {
        success: false,
        error: error as string,
        executionTime,
        steps: results,
      };
    } finally {
      this.activeWorkflows.delete(workflowId);
    }
  }

  /**
   * Execute multiple sub-agents in parallel
   */
  async executeParallel<TInput, TOutput>(
    agents: Array<{ name: string; input: TInput }>
  ): Promise<Map<string, TOutput>> {
    const spinner = new EnhancedSpinner(
      `🔄 Executing ${agents.length} agents in parallel...`
    );

    try {
      spinner.start();

      const results = await Promise.allSettled(
        agents.map(async ({ name, input }) => {
          const result = await this.executeAgent(name, input);
          return { name, result };
        })
      );

      const resultMap = new Map<string, TOutput>();
      const failures: string[] = [];

      results.forEach((result, index) => {
        if (result.status === "fulfilled") {
          resultMap.set(result.value.name, result.value.result as TOutput);
        } else {
          failures.push(`${agents[index].name}: ${result.reason}`);
        }
      });

      if (failures.length > 0) {
        spinner.warn({ text: `Some agents failed: ${failures.join(", ")}` });
      } else {
        spinner.success({
          text: `All ${agents.length} agents completed successfully`,
        });
      }

      return resultMap;
    } catch (error) {
      spinner.error({ text: `Parallel execution failed: ${error}` });
      throw error;
    }
  }

  /**
   * Get orchestration status
   */
  async getStatus(): Promise<OrchestratorStatus> {
    const agentStatuses = await Promise.all(
      Array.from(this.agents.values()).map(async (agent) => {
        if (agent.getStatus) {
          return await agent.getStatus();
        }
        return {
          name: agent.name,
          status: "idle" as const,
          errorCount: 0,
          successCount: 0,
        };
      })
    );

    const successfulExecutions = this.executionHistory.filter(
      (r) => r.success
    ).length;
    const totalExecutions = this.executionHistory.length;
    const errorRate =
      totalExecutions > 0
        ? (totalExecutions - successfulExecutions) / totalExecutions
        : 0;

    return {
      activeWorkflows: this.activeWorkflows.size,
      registeredAgents: Array.from(this.agents.keys()),
      totalExecutions: this.totalExecutions,
      averageExecutionTime:
        this.totalExecutions > 0
          ? this.totalExecutionTime / this.totalExecutions
          : 0,
      errorRate,
    };
  }

  /**
   * Get a registered sub-agent
   */
  getAgent(name: string): SubAgent<any, any> | undefined {
    return this.agents.get(name);
  }

  /**
   * List all registered sub-agents
   */
  listAgents(): string[] {
    return Array.from(this.agents.keys());
  }

  /**
   * Remove a sub-agent
   */
  removeAgent(name: string): boolean {
    return this.agents.delete(name);
  }

  /**
   * Clear all sub-agents
   */
  clearAgents(): void {
    this.agents.clear();
  }

  // Private helper methods

  private recordExecution(
    agentName: string,
    success: boolean,
    executionTime: number,
    data?: any,
    error?: string
  ): void {
    this.totalExecutions++;
    this.totalExecutionTime += executionTime;

    const stepResult: WorkflowStepResult = {
      stepId: `single-${Date.now()}`,
      agentName,
      success,
      data,
      error,
      executionTime,
      startTime: new Date(Date.now() - executionTime),
      endTime: new Date(),
    };

    this.executionHistory.push(stepResult);
  }

  private buildDependencyGraph(
    workflow: WorkflowStep[]
  ): Map<string, string[]> {
    const graph = new Map<string, string[]>();

    workflow.forEach((step) => {
      graph.set(step.id, step.dependencies || []);
    });

    return graph;
  }

  private getReadySteps(
    workflow: WorkflowStep[],
    dependencyGraph: Map<string, string[]>,
    executedSteps: Set<string>,
    stepResults: Map<string, any>
  ): WorkflowStep[] {
    return workflow.filter((step) => {
      if (executedSteps.has(step.id)) {
        return false;
      }

      const dependencies = dependencyGraph.get(step.id) || [];
      return dependencies.every((dep) => executedSteps.has(dep));
    });
  }

  private resolveStepInput(
    step: WorkflowStep,
    stepResults: Map<string, any>
  ): any {
    if (typeof step.input === "function") {
      return step.input(stepResults);
    }
    return step.input;
  }
}

// Export a singleton instance
export const orchestrator = new SubAgentOrchestrator();
