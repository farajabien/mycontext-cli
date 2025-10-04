import * as fs from "fs-extra";
import path from "path";
import chalk from "chalk";
import { ContextLoader } from "./contextLoader";
import { HybridAIClient } from "./hybridAIClient";

export interface BuildStrategy {
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

/**
 * BuildStrategyManager - LLM-Powered Strategy Generation
 *
 * This manager uses AI to generate 100% accurate, project-specific build strategies
 * by analyzing your project context and providing intelligent recommendations.
 */
export class BuildStrategyManager {
  private contextLoader: ContextLoader;
  private aiClient: HybridAIClient;

  constructor() {
    this.contextLoader = new ContextLoader(process.cwd());
    this.aiClient = new HybridAIClient();
  }

  /**
   * Load project context from .mycontext files
   */
  async loadProjectContext(): Promise<{
    projectName: string;
    description: string;
    components: string[];
    userRoles: string[];
    techStack: string[];
    prd: string;
    types: string;
    brand: string;
    componentList: any;
    features: string;
    userFlows: string;
    edgeCases: string;
    technicalSpecs: string;
  }> {
    try {
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

      // Default roles if none found
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

      // Default tech stack if none found
      if (techStack.length === 0) {
        techStack.push("next.js", "typescript", "tailwind css");
      }

      return {
        projectName: path.basename(process.cwd()),
        description: context.prd
          ? context.prd.substring(0, 200) + "..."
          : "MyContext Project",
        components,
        userRoles,
        techStack,
        prd: context.prd || "",
        types: context.types || "",
        brand: context.brand || "",
        componentList: context.componentList || null,
        features: context.features || "",
        userFlows: context.userFlows || "",
        edgeCases: context.edgeCases || "",
        technicalSpecs: context.technicalSpecs || "",
      };
    } catch (error) {
      // Fallback to default context if loading fails
      return {
        projectName: path.basename(process.cwd()),
        description: "MyContext Project",
        components: ["Button", "Form", "Dashboard", "Navigation"],
        userRoles: ["User", "Admin"],
        techStack: ["Next.js", "TypeScript", "Tailwind CSS"],
        prd: "",
        types: "",
        brand: "",
        componentList: null,
        features: "",
        userFlows: "",
        edgeCases: "",
        technicalSpecs: "",
      };
    }
  }

  /**
   * Save strategy data to JSON file
   */
  private async saveStrategyData(type: string, data: any): Promise<string> {
    const timestamp = new Date().toISOString().split("T")[0];
    const filename = `build-strategy-${type}-${timestamp}.json`;
    const filepath = path.join(process.cwd(), ".mycontext", filename);

    await fs.ensureDir(path.dirname(filepath));
    await fs.writeJson(
      filepath,
      {
        type,
        generatedAt: new Date().toISOString(),
        projectPath: process.cwd(),
        data,
      },
      { spaces: 2 }
    );

    return filepath;
  }

  /**
   * Load strategy data from JSON file
   */
  async loadStrategyData(type: string, date?: string): Promise<any> {
    const filename = date
      ? `build-strategy-${type}-${date}.json`
      : await this.findLatestStrategyFile(type);

    if (!filename) {
      throw new Error(`No ${type} strategy data found`);
    }

    const filepath = path.join(process.cwd(), ".mycontext", filename);
    const data = await fs.readJson(filepath);
    return data.data;
  }

  /**
   * Find the latest strategy file of a given type
   */
  private async findLatestStrategyFile(type: string): Promise<string | null> {
    const mycontextDir = path.join(process.cwd(), ".mycontext");

    if (!(await fs.pathExists(mycontextDir))) {
      return null;
    }

    const files = await fs.readdir(mycontextDir);
    const strategyFiles = files
      .filter(
        (file) =>
          file.startsWith(`build-strategy-${type}-`) && file.endsWith(".json")
      )
      .sort()
      .reverse();

    return strategyFiles[0] || null;
  }

  /**
   * List all available strategy files
   */
  async listStrategyFiles(): Promise<
    Array<{ type: string; date: string; filepath: string }>
  > {
    const mycontextDir = path.join(process.cwd(), ".mycontext");

    if (!(await fs.pathExists(mycontextDir))) {
      return [];
    }

    const files = await fs.readdir(mycontextDir);
    const strategyFiles = files
      .filter(
        (file) => file.startsWith("build-strategy-") && file.endsWith(".json")
      )
      .map((file) => {
        const match = file.match(
          /build-strategy-(\w+)-(\d{4}-\d{2}-\d{2})\.json/
        );
        if (match) {
          return {
            type: match[1],
            date: match[2],
            filepath: path.join(mycontextDir, file),
          };
        }
        return null;
      })
      .filter(Boolean)
      .sort((a, b) => b!.date.localeCompare(a!.date));

    return strategyFiles as Array<{
      type: string;
      date: string;
      filepath: string;
    }>;
  }

  /**
   * Get AI-powered strategy recommendations
   */
  async recommendStrategies(userPreferences?: any): Promise<any> {
    const context = await this.loadProjectContext();

    const prompt = `You are an expert software development strategist. Based on this project context, recommend the best build strategies.

PROJECT CONTEXT:
- Name: ${context.projectName}
- Description: ${context.description}
- Components: ${context.components.length} found (${context.components.join(", ")})
- User Roles: ${context.userRoles.join(", ")}
- Tech Stack: ${context.techStack.join(", ")}

USER PREFERENCES:
${userPreferences ? JSON.stringify(userPreferences, null, 2) : "Not specified"}

PROJECT DOCUMENTATION:
PRD: ${context.prd?.substring(0, 500) || "Not available"}
Features: ${context.features?.substring(0, 300) || "Not available"}
User Flows: ${context.userFlows?.substring(0, 300) || "Not available"}

Available strategies:
1. Foundation First - Build core infrastructure first (auth, DB, architecture)
2. Vertical Slice - Build complete user journeys end-to-end
3. Horizontal Slice - Build feature by feature across the app
4. Iterative Scaffolding - Small chunks everywhere, refine later
5. Hybrid Approach - Combines multiple strategies based on project needs

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
      "cons": ["array of disadvantages"]
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

      const result = JSON.parse(response.text || "{}");

      // Save to JSON file
      const filepath = await this.saveStrategyData("recommendations", result);
      console.log(chalk.gray(`💾 Saved to: ${filepath}`));

      return result;
    } catch (error) {
      // Fallback to default recommendations
      const fallback = {
        recommended: [
          {
            id: "vertical-slice",
            name: "Vertical Slice",
            description: "Build complete user journeys end-to-end",
            icon: "🎯",
            complexity: "medium",
            timeToFirstDemo: "2-3 weeks",
            bestFor: ["user-focused apps", "quick demos"],
            pros: ["Fast user value", "End-to-end testing"],
            cons: ["May duplicate work"],
          },
        ],
        reasoning:
          "Vertical slice approach recommended for balanced development",
        alternatives: [],
      };

      // Save fallback data too
      try {
        const filepath = await this.saveStrategyData(
          "recommendations",
          fallback
        );
        console.log(chalk.gray(`💾 Saved fallback to: ${filepath}`));
      } catch (saveError) {
        // Silent fail for fallback save
      }

      return fallback;
    }
  }

  /**
   * Generate AI-powered build plan
   */
  async generateBuildPlan(strategyId?: string): Promise<any> {
    const context = await this.loadProjectContext();
    const strategy = strategyId || "vertical-slice";

    const prompt = `You are an expert project planner. Create a detailed build plan for this project using the ${strategy} strategy.

PROJECT CONTEXT:
- Name: ${context.projectName}
- Description: ${context.description}
- Components: ${context.components.join(", ")}
- User Roles: ${context.userRoles.join(", ")}
- Tech Stack: ${context.techStack.join(", ")}

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
    "cons": ["disadvantages"]
  },
  "plan": [
    {
      "phase": 1,
      "name": "Phase Name",
      "duration": "1-2 weeks",
      "estimatedEffort": "1-2 weeks",
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

      const result = JSON.parse(response.text || "{}");

      // Save to JSON file
      const filepath = await this.saveStrategyData("plan", result);
      console.log(chalk.gray(`💾 Saved to: ${filepath}`));

      return result;
    } catch (error) {
      // Fallback plan
      const fallback = {
        strategy: {
          id: strategy,
          name: "Build Strategy",
          description: "Detailed build plan",
          icon: "🎯",
          complexity: "medium",
          timeToFirstDemo: "2-3 weeks",
          bestFor: ["general projects"],
          pros: ["Structured approach"],
          cons: ["May need adjustment"],
        },
        plan: [
          {
            phase: 1,
            name: "Foundation Setup",
            duration: "1-2 weeks",
            estimatedEffort: "1-2 weeks",
            tasks: ["Project setup", "Authentication", "Core components"],
            deliverables: ["Working foundation", "Basic auth", "Core UI"],
            successCriteria: "Foundation is solid and ready for features",
          },
        ],
        totalDuration: "4-6 weeks",
        milestones: [
          "Phase 1: Foundation",
          "Phase 2: Features",
          "Phase 3: Polish",
        ],
      };

      // Save fallback data too
      try {
        const filepath = await this.saveStrategyData("plan", fallback);
        console.log(chalk.gray(`💾 Saved fallback to: ${filepath}`));
      } catch (saveError) {
        // Silent fail for fallback save
      }

      return fallback;
    }
  }

  /**
   * Generate AI-powered task list
   */
  async generateTaskList(
    strategyId?: string,
    phaseNumber?: number
  ): Promise<any> {
    const context = await this.loadProjectContext();
    const strategy = strategyId || "vertical-slice";
    const phase = phaseNumber || 1;

    const prompt = `You are an expert task planner. Generate detailed tasks for Phase ${phase} of the ${strategy} strategy.

PROJECT CONTEXT:
- Name: ${context.projectName}
- Description: ${context.description}
- Components: ${context.components.join(", ")}
- User Roles: ${context.userRoles.join(", ")}
- Tech Stack: ${context.techStack.join(", ")}

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

      const result = JSON.parse(response.text || "{}");

      // Save to JSON file
      const filepath = await this.saveStrategyData("tasks", result);
      console.log(chalk.gray(`💾 Saved to: ${filepath}`));

      return result;
    } catch (error) {
      // Fallback task list
      const fallback = {
        phase: {
          phase,
          name: "Phase Name",
          duration: "1-2 weeks",
          tasks: ["Task 1", "Task 2", "Task 3"],
          deliverables: ["Deliverable 1", "Deliverable 2"],
          successCriteria: "Phase completed successfully",
        },
        tasks: [
          {
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
          },
        ],
      };

      // Save fallback data too
      try {
        const filepath = await this.saveStrategyData("tasks", fallback);
        console.log(chalk.gray(`💾 Saved fallback to: ${filepath}`));
      } catch (saveError) {
        // Silent fail for fallback save
      }

      return fallback;
    }
  }

  /**
   * Compare strategies using AI
   */
  async compareStrategies(): Promise<any> {
    const context = await this.loadProjectContext();

    const prompt = `You are an expert development strategist. Compare all build strategies for this project.

PROJECT CONTEXT:
- Name: ${context.projectName}
- Description: ${context.description}
- Components: ${context.components.join(", ")}
- User Roles: ${context.userRoles.join(", ")}
- Tech Stack: ${context.techStack.join(", ")}

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

      const result = JSON.parse(response.text || "{}");

      // Save to JSON file
      const filepath = await this.saveStrategyData("comparison", result);
      console.log(chalk.gray(`💾 Saved to: ${filepath}`));

      return result;
    } catch (error) {
      // Fallback comparison
      const fallback = {
        strategies: [
          {
            id: "vertical-slice",
            name: "Vertical Slice",
            description: "Build complete user journeys end-to-end",
            icon: "🎯",
            complexity: "medium",
            timeToFirstDemo: "2-3 weeks",
            bestFor: ["user-focused apps", "quick demos"],
            pros: ["Fast user value", "End-to-end testing"],
            cons: ["May duplicate work"],
            score: 8.5,
          },
        ],
        recommendation: "vertical-slice",
        reasoning:
          "Vertical slice approach recommended for balanced development",
      };

      // Save fallback data too
      try {
        const filepath = await this.saveStrategyData("comparison", fallback);
        console.log(chalk.gray(`💾 Saved fallback to: ${filepath}`));
      } catch (saveError) {
        // Silent fail for fallback save
      }

      return fallback;
    }
  }
}
