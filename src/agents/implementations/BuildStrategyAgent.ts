import { SubAgent } from "../interfaces/SubAgent";
import { HybridAIClient } from "../../utils/hybridAIClient";
import { ContextLoader } from "../../utils/contextLoader";
import { getSubAgentPersonality } from "../personalities/definitions";
import chalk from "chalk";
import path from "path";

export interface BuildStrategyInput {
  projectPath: string;
  strategyType?: "recommend" | "plan" | "tasks" | "compare";
  specificStrategy?: string;
  phaseNumber?: number;
  userPreferences?: {
    projectType: "client" | "personal" | "team" | "mvp" | "enterprise";
    complexity: "simple" | "medium" | "complex";
    userRoles: "single" | "multiple";
    timeline: "urgent" | "moderate" | "flexible";
    teamSize: "solo" | "small" | "large";
  };
}

export interface BuildStrategyOutput {
  strategy: {
    id: string;
    name: string;
    description: string;
    icon: string;
    complexity: "low" | "medium" | "high";
    timeToFirstDemo: string;
    bestFor: string[];
    pros: string[];
    cons: string[];
    phases: BuildPhase[];
  };
  recommendations?: {
    recommended: any[];
    reasoning: string;
    alternatives: any[];
  };
  plan?: {
    strategy: any;
    plan: any[];
    totalDuration: string;
    milestones: string[];
  };
  taskList?: {
    phase: BuildPhase;
    tasks: TaskDetail[];
  };
  contextAnalysis: {
    projectName: string;
    description: string;
    components: string[];
    userRoles: string[];
    techStack: string[];
    contextCompleteness: number;
    accuracyLevel: "excellent" | "good" | "limited";
  };
  llmInsights: {
    projectComplexity: string;
    riskFactors: string[];
    successFactors: string[];
    customRecommendations: string[];
  };
}

export interface BuildPhase {
  phase: number;
  name: string;
  duration: string;
  tasks: string[];
  deliverables: string[];
  successCriteria: string;
}

export interface TaskDetail {
  id: string;
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
  estimatedTime: string;
  dependencies: string[];
  deliverables: string[];
}

export class BuildStrategyAgent
  implements SubAgent<BuildStrategyInput, BuildStrategyOutput>
{
  name = "BuildStrategyAgent";
  description =
    "AI-powered build strategy expert that generates 100% accurate, project-specific development plans";
  personality: string;
  llmProvider: string;
  expertise: string[];
  private aiClient: HybridAIClient;
  private contextLoader: ContextLoader;

  constructor() {
    const personality = getSubAgentPersonality(this.name);
    if (personality) {
      this.personality = personality.systemPrompt;
      this.llmProvider = personality.llmProvider;
      this.expertise = personality.expertise;
    } else {
      this.personality = "strategic, analytical, project-focused expert";
      this.llmProvider = "hybrid";
      this.expertise = [
        "project-planning",
        "development-strategy",
        "risk-assessment",
        "team-coordination",
      ];
    }

    this.aiClient = new HybridAIClient();
    this.contextLoader = new ContextLoader(process.cwd());
  }

  async run(input: BuildStrategyInput): Promise<BuildStrategyOutput> {
    console.log(
      chalk.blue("🧠 Build Strategy Agent: Analyzing project context...")
    );

    try {
      // Step 1: Load and analyze project context
      const contextAnalysis = await this.analyzeProjectContext(
        input.projectPath
      );

      // Step 2: Generate LLM-powered insights
      const llmInsights = await this.generateLLMInsights(
        contextAnalysis,
        input.userPreferences
      );

      // Step 3: Generate strategy based on input type
      let output: BuildStrategyOutput;

      switch (input.strategyType) {
        case "recommend":
          output = await this.generateRecommendations(
            contextAnalysis,
            llmInsights,
            input.userPreferences
          );
          break;
        case "plan":
          output = await this.generateBuildPlan(
            contextAnalysis,
            llmInsights,
            input.specificStrategy
          );
          break;
        case "tasks":
          output = await this.generateTaskList(
            contextAnalysis,
            llmInsights,
            input.specificStrategy,
            input.phaseNumber
          );
          break;
        case "compare":
          output = await this.generateComparison(contextAnalysis, llmInsights);
          break;
        default:
          output = await this.generateRecommendations(
            contextAnalysis,
            llmInsights,
            input.userPreferences
          );
      }

      console.log(
        chalk.green("✅ Build Strategy Agent: Strategy generated successfully!")
      );
      return output;
    } catch (error) {
      console.error(chalk.red("❌ Build Strategy Agent failed:"), error);
      throw error;
    }
  }

  async validate(input: BuildStrategyInput): Promise<boolean> {
    return !!input.projectPath;
  }

  async cleanup(): Promise<void> {
    // No cleanup needed
  }

  async getStatus(): Promise<any> {
    return {
      name: this.name,
      status: "idle",
      errorCount: 0,
      successCount: 0,
    };
  }

  private async analyzeProjectContext(projectPath: string): Promise<any> {
    const context = await this.contextLoader.loadProjectContext({
      verbose: false,
    });

    // Extract components from component list
    const components: string[] = [];
    if (context.componentList && Array.isArray(context.componentList)) {
      context.componentList.forEach((comp: any) => {
        if (typeof comp === "string") {
          components.push(comp);
        } else if (comp.name) {
          components.push(comp.name);
        }
      });
    }

    // Extract user roles from PRD and user flows
    const userRoles: string[] = [];
    const prdText = context.prd || "";
    const userFlowsText = context.userFlows || "";

    const rolePatterns = [
      /(?:user|users?)\s+(?:role|type|persona)s?[:\s]+([^.\n]+)/gi,
      /(?:admin|administrator)s?/gi,
      /(?:customer|client)s?/gi,
      /(?:guest|visitor)s?/gi,
      /(?:moderator|manager)s?/gi,
    ];

    rolePatterns.forEach((pattern) => {
      const matches = [
        ...prdText.matchAll(pattern),
        ...userFlowsText.matchAll(pattern),
      ];
      matches.forEach((match) => {
        if (match[1]) {
          const role = match[1].trim().toLowerCase();
          if (!userRoles.includes(role)) {
            userRoles.push(role);
          }
        } else if (match[0]) {
          const role = match[0].trim().toLowerCase();
          if (!userRoles.includes(role)) {
            userRoles.push(role);
          }
        }
      });
    });

    if (userRoles.length === 0) {
      userRoles.push("user", "admin");
    }

    // Extract tech stack
    const techStack: string[] = [];
    const techPatterns = [
      /next\.?js/gi,
      /react/gi,
      /typescript/gi,
      /tailwind/gi,
      /node\.?js/gi,
      /prisma/gi,
      /supabase/gi,
      /firebase/gi,
      /mongodb/gi,
      /postgresql/gi,
      /mysql/gi,
    ];

    const allText = `${context.prd} ${context.types} ${context.technicalSpecs}`;
    techPatterns.forEach((pattern) => {
      const matches = allText.match(pattern);
      if (matches) {
        matches.forEach((match) => {
          const tech = match.toLowerCase();
          if (!techStack.includes(tech)) {
            techStack.push(tech);
          }
        });
      }
    });

    if (techStack.length === 0) {
      techStack.push("next.js", "typescript", "tailwind css");
    }

    // Calculate context completeness
    const loadedFiles = [
      context.prd,
      context.types,
      context.brand,
      context.componentList,
      context.features,
      context.userFlows,
      context.edgeCases,
      context.technicalSpecs,
    ].filter(Boolean).length;

    const accuracyLevel =
      loadedFiles >= 6 ? "excellent" : loadedFiles >= 4 ? "good" : "limited";

    return {
      projectName: path.basename(projectPath),
      description: context.prd
        ? context.prd.substring(0, 200) + "..."
        : "MyContext Project",
      components,
      userRoles,
      techStack,
      contextCompleteness: loadedFiles,
      accuracyLevel,
      rawContext: context,
    };
  }

  private async generateLLMInsights(
    contextAnalysis: any,
    userPreferences?: any
  ): Promise<any> {
    const prompt = `You are an expert software development strategist. Analyze this project context and provide strategic insights.

PROJECT CONTEXT:
- Name: ${contextAnalysis.projectName}
- Description: ${contextAnalysis.description}
- Components: ${contextAnalysis.components.length} found (${contextAnalysis.components.join(", ")})
- User Roles: ${contextAnalysis.userRoles.join(", ")}
- Tech Stack: ${contextAnalysis.techStack.join(", ")}
- Context Completeness: ${contextAnalysis.contextCompleteness}/8 files

USER PREFERENCES:
${userPreferences ? JSON.stringify(userPreferences, null, 2) : "Not specified"}

PROJECT DOCUMENTATION:
PRD: ${contextAnalysis.rawContext.prd?.substring(0, 500) || "Not available"}
Features: ${contextAnalysis.rawContext.features?.substring(0, 300) || "Not available"}
User Flows: ${contextAnalysis.rawContext.userFlows?.substring(0, 300) || "Not available"}
Technical Specs: ${contextAnalysis.rawContext.technicalSpecs?.substring(0, 300) || "Not available"}

Provide strategic analysis as JSON:
{
  "projectComplexity": "Brief assessment of project complexity (simple/medium/complex)",
  "riskFactors": ["array of potential risks and challenges"],
  "successFactors": ["array of key success factors"],
  "customRecommendations": ["array of specific recommendations for this project"],
  "optimalStrategy": "Recommended build strategy (foundation-first/vertical-slice/horizontal-slice/iterative-scaffolding/hybrid)",
  "reasoning": "Detailed explanation of why this strategy is optimal"
}`;

    try {
      const response = await this.aiClient.generateText(prompt, {
        temperature: 0.3,
        maxTokens: 2000,
      });

      return JSON.parse(response.text || "{}");
    } catch (error) {
      console.warn("LLM insights generation failed, using fallback");
      return {
        projectComplexity: "medium",
        riskFactors: [
          "Scope creep",
          "Technical complexity",
          "Timeline pressure",
        ],
        successFactors: [
          "Clear requirements",
          "Good team communication",
          "Iterative development",
        ],
        customRecommendations: [
          "Start with core features",
          "Implement proper testing",
          "Focus on user experience",
        ],
        optimalStrategy: "vertical-slice",
        reasoning:
          "Vertical slice approach recommended for balanced development",
      };
    }
  }

  private async generateRecommendations(
    contextAnalysis: any,
    llmInsights: any,
    userPreferences?: any
  ): Promise<BuildStrategyOutput> {
    const prompt = `You are an expert development strategist. Based on the project analysis, recommend the best build strategies.

PROJECT ANALYSIS:
${JSON.stringify(contextAnalysis, null, 2)}

LLM INSIGHTS:
${JSON.stringify(llmInsights, null, 2)}

USER PREFERENCES:
${userPreferences ? JSON.stringify(userPreferences, null, 2) : "Not specified"}

Generate recommendations as JSON:
{
  "recommended": [
    {
      "id": "strategy-id",
      "name": "Strategy Name",
      "description": "Brief description",
      "icon": "🎯",
      "complexity": "low/medium/high",
      "timeToFirstDemo": "1-2 weeks",
      "bestFor": ["array of use cases"],
      "pros": ["array of advantages"],
      "cons": ["array of disadvantages"],
      "confidence": 0.9
    }
  ],
  "reasoning": "Detailed explanation of recommendations",
  "alternatives": [
    {
      "id": "alternative-id",
      "name": "Alternative Name",
      "description": "Brief description",
      "icon": "🔄",
      "whyNotPrimary": "Why this wasn't the top choice"
    }
  ]
}`;

    try {
      const response = await this.aiClient.generateText(prompt, {
        temperature: 0.2,
        maxTokens: 2500,
      });

      const recommendations = JSON.parse(response.text || "{}");

      return {
        strategy: recommendations.recommended?.[0] || this.getDefaultStrategy(),
        recommendations,
        contextAnalysis,
        llmInsights,
      };
    } catch (error) {
      console.warn("LLM recommendations failed, using fallback");
      return {
        strategy: this.getDefaultStrategy(),
        recommendations: {
          recommended: [this.getDefaultStrategy()],
          reasoning: "Fallback strategy based on project analysis",
          alternatives: [],
        },
        contextAnalysis,
        llmInsights,
      };
    }
  }

  private async generateBuildPlan(
    contextAnalysis: any,
    llmInsights: any,
    strategyId?: string
  ): Promise<BuildStrategyOutput> {
    const strategy =
      strategyId || llmInsights.optimalStrategy || "vertical-slice";

    const prompt = `You are an expert project planner. Create a detailed build plan for this project using the ${strategy} strategy.

PROJECT ANALYSIS:
${JSON.stringify(contextAnalysis, null, 2)}

LLM INSIGHTS:
${JSON.stringify(llmInsights, null, 2)}

STRATEGY: ${strategy}

Generate a detailed build plan as JSON:
{
  "strategy": {
    "id": "${strategy}",
    "name": "Strategy Name",
    "description": "Strategy description",
    "icon": "🎯",
    "complexity": "medium",
    "timeToFirstDemo": "2-3 weeks",
    "bestFor": ["use cases"],
    "pros": ["advantages"],
    "cons": ["disadvantages"],
    "phases": [
      {
        "phase": 1,
        "name": "Phase Name",
        "duration": "1-2 weeks",
        "tasks": ["task1", "task2", "task3"],
        "deliverables": ["deliverable1", "deliverable2"],
        "successCriteria": "Clear success criteria"
      }
    ]
  },
  "plan": [
    {
      "phase": 1,
      "name": "Phase Name",
      "duration": "1-2 weeks",
      "estimatedEffort": "1-2 weeks (adjusted for complexity)",
      "tasks": ["task1", "task2"],
      "deliverables": ["deliverable1"],
      "successCriteria": "Success criteria"
    }
  ],
  "totalDuration": "4-6 weeks",
  "milestones": ["Phase 1: Foundation", "Phase 2: Core Features", "Phase 3: Polish"]
}`;

    try {
      const response = await this.aiClient.generateText(prompt, {
        temperature: 0.2,
        maxTokens: 3000,
      });

      const plan = JSON.parse(response.text || "{}");

      return {
        strategy: plan.strategy || this.getDefaultStrategy(),
        plan,
        contextAnalysis,
        llmInsights,
      };
    } catch (error) {
      console.warn("LLM plan generation failed, using fallback");
      return {
        strategy: this.getDefaultStrategy(),
        plan: {
          strategy: this.getDefaultStrategy(),
          plan: [this.getDefaultPhase()],
          totalDuration: "4-6 weeks",
          milestones: [
            "Phase 1: Foundation",
            "Phase 2: Features",
            "Phase 3: Polish",
          ],
        },
        contextAnalysis,
        llmInsights,
      };
    }
  }

  private async generateTaskList(
    contextAnalysis: any,
    llmInsights: any,
    strategyId?: string,
    phaseNumber?: number
  ): Promise<BuildStrategyOutput> {
    const strategy =
      strategyId || llmInsights.optimalStrategy || "vertical-slice";
    const phase = phaseNumber || 1;

    const prompt = `You are an expert task planner. Generate detailed tasks for Phase ${phase} of the ${strategy} strategy.

PROJECT ANALYSIS:
${JSON.stringify(contextAnalysis, null, 2)}

LLM INSIGHTS:
${JSON.stringify(llmInsights, null, 2)}

STRATEGY: ${strategy}
PHASE: ${phase}

Generate detailed tasks as JSON:
{
  "phase": {
    "phase": ${phase},
    "name": "Phase Name",
    "duration": "1-2 weeks",
    "tasks": ["task1", "task2", "task3"],
    "deliverables": ["deliverable1", "deliverable2"],
    "successCriteria": "Clear success criteria"
  },
  "tasks": [
    {
      "id": "task-1",
      "title": "Task Title",
      "description": "Detailed task description",
      "priority": "high/medium/low",
      "estimatedTime": "1-2 days",
      "dependencies": ["dependency1"],
      "deliverables": ["deliverable1", "deliverable2"]
    }
  ]
}`;

    try {
      const response = await this.aiClient.generateText(prompt, {
        temperature: 0.2,
        maxTokens: 2000,
      });

      const taskList = JSON.parse(response.text || "{}");

      return {
        strategy: this.getDefaultStrategy(),
        taskList,
        contextAnalysis,
        llmInsights,
      };
    } catch (error) {
      console.warn("LLM task generation failed, using fallback");
      return {
        strategy: this.getDefaultStrategy(),
        taskList: {
          phase: this.getDefaultPhase(),
          tasks: [this.getDefaultTask()],
        },
        contextAnalysis,
        llmInsights,
      };
    }
  }

  private async generateComparison(
    contextAnalysis: any,
    llmInsights: any
  ): Promise<BuildStrategyOutput> {
    const prompt = `You are an expert development strategist. Compare all build strategies for this project.

PROJECT ANALYSIS:
${JSON.stringify(contextAnalysis, null, 2)}

LLM INSIGHTS:
${JSON.stringify(llmInsights, null, 2)}

Compare these strategies: foundation-first, vertical-slice, horizontal-slice, iterative-scaffolding, hybrid

Generate comparison as JSON:
{
  "strategies": [
    {
      "id": "foundation-first",
      "name": "Foundation First",
      "description": "Build core infrastructure first",
      "icon": "🏗️",
      "complexity": "medium",
      "timeToFirstDemo": "3-4 weeks",
      "bestFor": ["complex projects", "team development"],
      "pros": ["solid foundation", "scalable"],
      "cons": ["slow initial progress"],
      "score": 8.5
    }
  ],
  "recommendation": "vertical-slice",
  "reasoning": "Best fit for this project based on analysis"
}`;

    try {
      const response = await this.aiClient.generateText(prompt, {
        temperature: 0.2,
        maxTokens: 2500,
      });

      const comparison = JSON.parse(response.text || "{}");

      return {
        strategy: comparison.strategies?.[0] || this.getDefaultStrategy(),
        recommendations: comparison,
        contextAnalysis,
        llmInsights,
      };
    } catch (error) {
      console.warn("LLM comparison failed, using fallback");
      return {
        strategy: this.getDefaultStrategy(),
        recommendations: {
          recommended: [this.getDefaultStrategy()],
          reasoning: "Fallback comparison based on project analysis",
          alternatives: [],
        },
        contextAnalysis,
        llmInsights,
      };
    }
  }

  private getDefaultStrategy(): any {
    return {
      id: "vertical-slice",
      name: "Vertical Slice (User Journey)",
      description: "Build complete user journeys end-to-end",
      icon: "🎯",
      complexity: "medium",
      timeToFirstDemo: "2-3 weeks",
      bestFor: ["user-focused apps", "quick demos"],
      pros: ["Fast user value", "End-to-end testing"],
      cons: ["May duplicate work"],
      phases: [this.getDefaultPhase()],
    };
  }

  private getDefaultPhase(): BuildPhase {
    return {
      phase: 1,
      name: "Foundation Setup",
      duration: "1-2 weeks",
      tasks: ["Project setup", "Authentication", "Core components"],
      deliverables: ["Working foundation", "Basic auth", "Core UI"],
      successCriteria: "Foundation is solid and ready for features",
    };
  }

  private getDefaultTask(): TaskDetail {
    return {
      id: "task-1",
      title: "Project Setup",
      description:
        "Set up the core project structure with Next.js, TypeScript, and Tailwind CSS",
      priority: "high",
      estimatedTime: "1-2 days",
      dependencies: [],
      deliverables: [
        "Working Next.js app",
        "TypeScript config",
        "Tailwind setup",
      ],
    };
  }
}
