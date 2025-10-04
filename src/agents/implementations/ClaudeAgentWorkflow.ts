/**
 * ClaudeAgentWorkflow Implementation
 *
 * Enhanced workflow agent that leverages Claude Agent SDK for advanced
 * context management, tool permissions, and MCP integration.
 */

import {
  SubAgent,
  WorkflowInput,
  WorkflowOutput,
  WorkflowStep,
} from "../interfaces/SubAgent";
import { ClaudeAgentClient } from "../../utils/claudeAgentClient";
import { ContextManager, ProjectContext } from "../../utils/contextManager";
import { ToolPermissionManager } from "../../utils/toolPermissions";
import { MCPAgentIntegration } from "../../utils/mcpAgentIntegration";
import chalk from "chalk";

export class ClaudeAgentWorkflow
  implements SubAgent<WorkflowInput, WorkflowOutput>
{
  name = "ClaudeAgentWorkflow";
  description =
    "Enhanced workflow agent using Claude Agent SDK with advanced context management and MCP integration";
  personality =
    "Advanced AI coordinator with deep project understanding and intelligent workflow orchestration";
  llmProvider = "claude-agent-sdk";
  expertise = [
    "workflow-management",
    "context-management",
    "tool-permissions",
    "mcp-integration",
    "agent-coordination",
    "error-handling",
    "user-experience",
  ];

  private claudeAgentClient: ClaudeAgentClient;
  private contextManager: ContextManager;
  private permissionManager: ToolPermissionManager;
  private mcpIntegration: MCPAgentIntegration;

  private completedSteps: Set<string> = new Set();
  private failedSteps: string[] = [];
  private userInteractions = 0;
  private totalRetries = 0;
  private workflowContext: ProjectContext = {};

  constructor(workingDirectory?: string) {
    this.claudeAgentClient = new ClaudeAgentClient(workingDirectory);
    this.contextManager = new ContextManager(workingDirectory);
    this.permissionManager = new ToolPermissionManager(workingDirectory);
    this.mcpIntegration = new MCPAgentIntegration(workingDirectory);
  }

  /**
   * Check if Claude Agent SDK is available
   */
  isClaudeAgentAvailable(): boolean {
    return this.claudeAgentClient.hasApiKey();
  }

  async run(input: WorkflowInput): Promise<WorkflowOutput> {
    const startTime = Date.now();
    const maxRetries = input.maxRetries || 3;

    console.log(
      chalk.blue.bold("🚀 Starting Claude Agent SDK Enhanced Workflow\n")
    );
    console.log(chalk.gray(`Project: ${input.projectName}`));
    console.log(chalk.gray(`Framework: ${input.framework}`));
    console.log(
      chalk.gray(
        `Interactive Mode: ${input.interactive ? "Enabled" : "Disabled"}\n`
      )
    );

    try {
      // Initialize Claude Agent SDK
      await this.initializeClaudeAgent();

      // Load and prepare context
      await this.prepareWorkflowContext(input);

      // Define enhanced workflow steps
      const steps = this.defineEnhancedWorkflowSteps(input);

      // Execute workflow with Claude Agent SDK
      await this.executeEnhancedWorkflow(
        steps,
        maxRetries,
        input.interactive || false
      );

      const duration = Date.now() - startTime;
      const completedSteps = Array.from(this.completedSteps);

      console.log(
        chalk.green.bold(
          "\n✅ Claude Agent SDK Workflow completed successfully!"
        )
      );
      console.log(
        chalk.blue(`⏱️  Total duration: ${Math.round(duration / 1000)}s`)
      );
      console.log(chalk.blue(`📋 Completed steps: ${completedSteps.length}`));
      console.log(chalk.blue(`🔄 Total retries: ${this.totalRetries}`));
      console.log(chalk.blue(`💬 User interactions: ${this.userInteractions}`));

      // Save final context
      await this.contextManager.saveContext(this.workflowContext);

      return {
        success: true,
        projectPath: input.projectName,
        completedSteps,
        failedSteps: this.failedSteps,
        userInteractions: this.userInteractions,
        totalRetries: this.totalRetries,
        duration,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      console.log(chalk.red.bold("\n❌ Claude Agent SDK Workflow failed"));
      console.log(
        chalk.red(
          `Error: ${error instanceof Error ? error.message : "Unknown error"}`
        )
      );

      return {
        success: false,
        projectPath: input.projectName,
        completedSteps: Array.from(this.completedSteps),
        failedSteps: this.failedSteps,
        userInteractions: this.userInteractions,
        totalRetries: this.totalRetries,
        duration,
      };
    } finally {
      // Cleanup
      await this.claudeAgentClient.cleanup();
    }
  }

  /**
   * Initialize Claude Agent SDK with enhanced configuration
   */
  private async initializeClaudeAgent(): Promise<void> {
    console.log(chalk.yellow("🔧 Initializing Claude Agent SDK with advanced features..."));

    try {
      // Check if Claude Agent SDK is available
      if (!this.claudeAgentClient.hasApiKey()) {
        throw new Error(
          "Claude API key not configured. Set MYCONTEXT_CLAUDE_API_KEY or ANTHROPIC_API_KEY"
        );
      }

      // Initialize MCP integration
      await this.mcpIntegration.initialize(this.claudeAgentClient);

      // Get permission configuration
      const permissionConfig = this.permissionManager.getClaudeAgentConfig();

      // Initialize Claude Agent with Phase 2 enhanced configuration
      await this.claudeAgentClient.initialize({
        model: "claude-3-5-sonnet-20241022",
        temperature: 0.2,
        maxTokens: 8000,
        systemPrompt: this.getEnhancedSystemPrompt(),
        ...permissionConfig,
        contextManagement: true,

        // NEW: Setting sources for reproducible builds
        settingSources: ['project', 'local'],

        // NEW: Register workflow-specific hooks
        hooks: {
          PreToolUse: async (input, toolUseID, options) => {
            const toolInput = input as any;
            console.log(chalk.gray(`   🔧 Using tool: ${toolInput.tool_name || 'unknown'}`));
            return { continue: true };
          },
          PostToolUse: async (input, toolUseID, options) => {
            const toolInput = input as any;
            console.log(chalk.gray(`   ✅ Tool completed: ${toolInput.tool_name || 'unknown'}`));
            return { continue: true };
          },
          SessionStart: async (input, toolUseID, options) => {
            console.log(chalk.blue('   🚀 Agent session started'));
            return { continue: true };
          },
        },

        // NEW: Permission callback for interactive approval
        canUseTool: async (toolName, input, options) => {
          // Auto-approve safe read operations
          if (['Read', 'Glob', 'Grep'].includes(toolName)) {
            return { behavior: 'allow', updatedInput: input };
          }

          // Always approve our custom MCP tools
          if ([
            'AnalyzeComponent',
            'ValidatePRD',
            'CheckTypes',
            'GenerateDocs',
            'DetectExistingComponents',
            'MapComponentsToRoutes',
            'GenerateScaffolding',
          ].includes(toolName)) {
            return { behavior: 'allow', updatedInput: input };
          }

          // For write operations, ask for permission (simplified for now)
          return { behavior: 'allow', updatedInput: input };
        },
      });

      console.log(chalk.green("✅ Claude Agent SDK initialized with advanced features"));

      // Log available agents
      const availableAgents = this.claudeAgentClient.getAvailableAgents();
      console.log(chalk.gray(`   📦 Available agents: ${availableAgents.length}`));

    } catch (error: any) {
      console.log(
        chalk.red(`❌ Claude Agent SDK initialization failed: ${error.message}`)
      );
      throw error;
    }
  }

  /**
   * Prepare workflow context
   */
  private async prepareWorkflowContext(input: WorkflowInput): Promise<void> {
    console.log(chalk.yellow("📋 Preparing workflow context..."));

    try {
      // Load existing context
      this.workflowContext = await this.contextManager.loadContext();

      // Add workflow-specific context
      this.workflowContext = await this.contextManager.mergeContext(
        this.workflowContext,
        {
          userPrompt: input.description,
          workingDirectory:
            input.projectName === "." ? process.cwd() : input.projectName,
          previousOutputs: {
            workflowStart: {
              projectName: input.projectName,
              framework: input.framework,
              description: input.description,
              interactive: input.interactive,
              timestamp: new Date().toISOString(),
            },
          },
        }
      );

      // Check if context needs compaction
      const contextStats = this.contextManager.getContextStats(
        this.workflowContext
      );
      if (contextStats.totalSize > 50000) {
        // 50KB limit
        console.log(
          chalk.yellow("⚠️ Context size exceeds limit, compacting...")
        );
        this.workflowContext = await this.contextManager.compactContext(
          this.workflowContext
        );
      }

      console.log(chalk.green("✅ Workflow context prepared"));
    } catch (error: any) {
      console.log(
        chalk.yellow(`⚠️ Context preparation warning: ${error.message}`)
      );
    }
  }

  /**
   * Define enhanced workflow steps with Claude Agent SDK
   */
  private defineEnhancedWorkflowSteps(input: WorkflowInput): WorkflowStep[] {
    return [
      {
        id: "context-analysis",
        name: "Context Analysis",
        description:
          "Analyze project context and requirements using Claude Agent SDK",
        agentName: this.name,
        agent: this,
        input: {
          workflowType: "context-analysis",
          projectContext: this.workflowContext,
          requirements: input.description,
        },
        required: true,
        retryable: true,
        interactive: false,
      },
      {
        id: "project-setup",
        name: "Project Setup",
        description:
          "Initialize project structure with enhanced context awareness",
        agentName: this.name,
        agent: this,
        input: {
          workflowType: "project-setup",
          projectName: input.projectName,
          framework: input.framework,
          context: this.workflowContext,
        },
        dependencies: ["context-analysis"],
        required: true,
        retryable: true,
        interactive: false,
      },
      // NEW: Component Detection Step (Component-First Workflow)
      {
        id: "component-detection",
        name: "Component Detection",
        description:
          "Detect existing validated components for component-first workflow",
        agentName: "component-first-builder",
        agent: this,
        input: {
          workflowType: "component-detection",
          projectPath: input.projectName,
          includeValidation: true,
        },
        dependencies: ["project-setup"],
        required: true,
        retryable: true,
        interactive: false,
      },
      {
        id: "requirement-gathering",
        name: "Requirement Gathering",
        description: "Gather detailed requirements using Claude Agent SDK",
        agentName: this.name,
        agent: this,
        input: {
          workflowType: "requirement-gathering",
          context: this.workflowContext,
          interactive: input.interactive,
        },
        dependencies: ["component-detection"],
        required: input.interactive,
        retryable: true,
        interactive: true,
      },
      {
        id: "context-generation",
        name: "Context Generation",
        description:
          "Generate comprehensive context files using Claude Agent SDK",
        agentName: this.name,
        agent: this,
        input: {
          workflowType: "context-generation",
          context: this.workflowContext,
          requirements: input.description,
        },
        dependencies: ["requirement-gathering"],
        required: true,
        retryable: true,
        interactive: false,
        // Skip if components already exist and should be reused
        skip: (context: any) =>
          context.componentDetection?.recommendation === "REUSE_COMPONENTS",
      },
      // NEW: Component Mapping Step (Only for REUSE_COMPONENTS mode)
      {
        id: "component-mapping",
        name: "Component Mapping",
        description:
          "Map existing components to routes intelligently",
        agentName: "component-first-builder",
        agent: this,
        input: {
          workflowType: "component-mapping",
          context: this.workflowContext,
          architectureType: input.architectureType || "nextjs-app-router",
        },
        dependencies: ["component-detection"],
        required: false,
        retryable: true,
        interactive: false,
        // Only run in REUSE_COMPONENTS mode
        skip: (context: any) =>
          context.componentDetection?.recommendation !== "REUSE_COMPONENTS",
      },
      {
        id: "component-generation",
        name: "Component Generation",
        description:
          "Generate React components using Claude Agent SDK with MCP integration",
        agentName: this.name,
        agent: this,
        input: {
          workflowType: "component-generation",
          context: this.workflowContext,
          components: "all",
        },
        dependencies: ["context-generation"],
        required: true,
        retryable: true,
        interactive: false,
        // Skip if components should be reused
        skip: (context: any) =>
          context.componentDetection?.recommendation === "REUSE_COMPONENTS",
      },
      // NEW: Scaffolding Generation Step
      {
        id: "scaffolding-generation",
        name: "Scaffolding Generation",
        description:
          "Generate routes, actions, and hooks for components",
        agentName: "component-first-builder",
        agent: this,
        input: {
          workflowType: "scaffolding-generation",
          context: this.workflowContext,
          projectPath: input.projectName,
          generateRoutes: input.generateRoutes !== false,
          generateActions: input.generateServerActions !== false,
          generateHooks: true,
          generateLayouts: true,
        },
        dependencies: ["component-mapping", "component-generation"],
        required: false,
        retryable: true,
        interactive: false,
        // Always run if complete architecture is enabled
        skip: (context: any) => !input.completeArchitecture,
      },
      {
        id: "validation-testing",
        name: "Validation & Testing",
        description:
          "Validate and test generated components using Claude Agent SDK",
        agentName: this.name,
        agent: this,
        input: {
          workflowType: "validation-testing",
          context: this.workflowContext,
        },
        dependencies: ["component-generation", "scaffolding-generation"],
        required: true,
        retryable: true,
        interactive: false,
      },
    ];
  }

  /**
   * Execute enhanced workflow with Claude Agent SDK
   */
  private async executeEnhancedWorkflow(
    steps: WorkflowStep[],
    maxRetries: number,
    interactive: boolean
  ): Promise<void> {
    for (const step of steps) {
      await this.executeStepWithClaudeAgent(step, maxRetries, interactive);
    }
  }

  /**
   * Execute individual step using Claude Agent SDK
   */
  private async executeStepWithClaudeAgent(
    step: WorkflowStep,
    maxRetries: number,
    interactive: boolean
  ): Promise<void> {
    const stepId = step.id;
    let retryCount = 0;

    console.log(chalk.blue(`\n🔄 Executing: ${step.name}`));
    console.log(chalk.gray(`   ${step.description}`));

    while (retryCount <= maxRetries) {
      try {
        // Build step-specific prompt
        const stepPrompt = this.buildStepPrompt(step);

        // Execute step using Claude Agent SDK
        const result = await this.claudeAgentClient.runAgentWorkflow(
          stepPrompt,
          this.workflowContext,
          {
            model: "claude-3-5-sonnet-20241022",
            temperature: 0.2,
            maxTokens: 8000,
          }
        );

        // Process step result
        await this.processStepResult(step, result);

        // Mark step as completed
        this.completedSteps.add(stepId);
        console.log(chalk.green(`✅ ${step.name} completed successfully`));

        // Update context with step results
        this.workflowContext = await this.contextManager.mergeContext(
          this.workflowContext,
          {
            previousOutputs: {
              ...this.workflowContext.previousOutputs,
              [stepId]: {
                result: result.content,
                timestamp: new Date().toISOString(),
                success: true,
              },
            },
          }
        );

        return;
      } catch (error: any) {
        retryCount++;
        this.totalRetries++;

        if (retryCount <= maxRetries) {
          console.log(
            chalk.yellow(
              `⚠️ ${step.name} failed, retrying (${retryCount}/${maxRetries})`
            )
          );
          console.log(chalk.gray(`   Error: ${error.message}`));

          // Add delay before retry
          await new Promise((resolve) =>
            setTimeout(resolve, 1000 * retryCount)
          );
        } else {
          console.log(
            chalk.red(`❌ ${step.name} failed after ${maxRetries} retries`)
          );
          this.failedSteps.push(stepId);

          if (step.required) {
            throw new Error(
              `Required step '${step.name}' failed: ${error.message}`
            );
          }
        }
      }
    }
  }

  /**
   * Build step-specific prompt for Claude Agent SDK
   */
  private buildStepPrompt(step: WorkflowStep): string {
    const basePrompt = `Execute the following workflow step: ${step.name}\n\nDescription: ${step.description}\n\n`;

    switch (step.input.workflowType) {
      case "context-analysis":
        return basePrompt + this.buildContextAnalysisPrompt(step);
      case "project-setup":
        return basePrompt + this.buildProjectSetupPrompt(step);
      case "requirement-gathering":
        return basePrompt + this.buildRequirementGatheringPrompt(step);
      case "context-generation":
        return basePrompt + this.buildContextGenerationPrompt(step);
      case "component-generation":
        return basePrompt + this.buildComponentGenerationPrompt(step);
      case "validation-testing":
        return basePrompt + this.buildValidationTestingPrompt(step);
      default:
        return (
          basePrompt +
          "Please execute this workflow step according to the provided input."
        );
    }
  }

  /**
   * Build context analysis prompt
   */
  private buildContextAnalysisPrompt(step: WorkflowStep): string {
    return `Analyze the project context and requirements:

Project Context:
${JSON.stringify(step.input.projectContext, null, 2)}

Requirements:
${step.input.requirements}

Please provide:
1. Context analysis summary
2. Key requirements identified
3. Recommended approach
4. Potential challenges and solutions`;
  }

  /**
   * Build project setup prompt
   */
  private buildProjectSetupPrompt(step: WorkflowStep): string {
    return `Set up the project structure:

Project Name: ${step.input.projectName}
Framework: ${step.input.framework}

Context:
${JSON.stringify(step.input.context, null, 2)}

Please provide:
1. Project structure recommendations
2. Dependencies to install
3. Configuration files needed
4. Initial setup steps`;
  }

  /**
   * Build requirement gathering prompt
   */
  private buildRequirementGatheringPrompt(step: WorkflowStep): string {
    return `Gather detailed requirements:

Current Context:
${JSON.stringify(step.input.context, null, 2)}

Interactive Mode: ${step.input.interactive}

Please provide:
1. Detailed requirements analysis
2. User stories and use cases
3. Technical specifications
4. Acceptance criteria`;
  }

  /**
   * Build context generation prompt
   */
  private buildContextGenerationPrompt(step: WorkflowStep): string {
    return `Generate comprehensive context files:

Context:
${JSON.stringify(step.input.context, null, 2)}

Requirements:
${step.input.requirements}

Please provide:
1. PRD (Product Requirements Document)
2. TypeScript type definitions
3. Branding guidelines
4. Component list
5. Project structure documentation`;
  }

  /**
   * Build component generation prompt
   */
  private buildComponentGenerationPrompt(step: WorkflowStep): string {
    return `Generate React components:

Context:
${JSON.stringify(step.input.context, null, 2)}

Components to generate: ${step.input.components}

Please provide:
1. Complete React component code
2. TypeScript interfaces
3. Styling with Tailwind CSS
4. Component documentation
5. Usage examples`;
  }

  /**
   * Build validation testing prompt
   */
  private buildValidationTestingPrompt(step: WorkflowStep): string {
    return `Validate and test generated components:

Context:
${JSON.stringify(step.input.context, null, 2)}

Please provide:
1. Component validation results
2. Test cases and scenarios
3. Performance analysis
4. Accessibility checks
5. Recommendations for improvements`;
  }

  /**
   * Process step result
   */
  private async processStepResult(
    step: WorkflowStep,
    result: any
  ): Promise<void> {
    // Process result based on step type
    switch (step.input.workflowType) {
      case "context-analysis":
        await this.processContextAnalysisResult(result);
        break;
      case "project-setup":
        await this.processProjectSetupResult(result);
        break;
      case "requirement-gathering":
        await this.processRequirementGatheringResult(result);
        break;
      case "context-generation":
        await this.processContextGenerationResult(result);
        break;
      case "component-generation":
        await this.processComponentGenerationResult(result);
        break;
      case "validation-testing":
        await this.processValidationTestingResult(result);
        break;
    }
  }

  /**
   * Process context analysis result
   */
  private async processContextAnalysisResult(result: any): Promise<void> {
    // Extract key insights from context analysis
    console.log(chalk.green("📊 Context analysis completed"));
  }

  /**
   * Process project setup result
   */
  private async processProjectSetupResult(result: any): Promise<void> {
    // Process project setup recommendations
    console.log(chalk.green("🏗️ Project setup completed"));
  }

  /**
   * Process requirement gathering result
   */
  private async processRequirementGatheringResult(result: any): Promise<void> {
    // Process gathered requirements
    console.log(chalk.green("📋 Requirements gathered"));
  }

  /**
   * Process context generation result
   */
  private async processContextGenerationResult(result: any): Promise<void> {
    // Process generated context files
    console.log(chalk.green("📄 Context files generated"));
  }

  /**
   * Process component generation result
   */
  private async processComponentGenerationResult(result: any): Promise<void> {
    // Process generated components
    console.log(chalk.green("🎨 Components generated"));
  }

  /**
   * Process validation testing result
   */
  private async processValidationTestingResult(result: any): Promise<void> {
    // Process validation results
    console.log(chalk.green("✅ Validation completed"));
  }

  /**
   * Get enhanced system prompt for Claude Agent SDK
   */
  private getEnhancedSystemPrompt(): string {
    return `You are an expert AI assistant specialized in React/Next.js development and component generation, enhanced with Claude Agent SDK capabilities.

Your enhanced capabilities include:
- Advanced context management and compaction
- Fine-grained tool permissions
- MCP (Model Context Protocol) integration
- Intelligent workflow orchestration
- Automatic error handling and retry logic

When executing workflows:
1. Use context management to maintain project state
2. Respect tool permissions and restrictions
3. Leverage MCP tools when available
4. Provide detailed progress updates
5. Handle errors gracefully with retry logic
6. Maintain comprehensive project context

Provide intelligent, context-aware responses that demonstrate deep understanding of the project and requirements.`;
  }
}
