// AI-Powered Workflow Command
// Analyzes project context and generates intelligent, contextual workflows using AI

import { Command } from "commander";
import chalk from "chalk";
import fs from "fs-extra";
import path from "path";
import prompts from "prompts";
import { GenerateContextFilesCommand } from "./generate-context-files";
import { GenerateCommand } from "./generate";
import { CompilePRDCommand } from "./compile-prd";
import { GenerateComponentsCommand } from "./generate-components";
import { HybridAIClient } from "../utils/hybridAIClient";

interface AIWorkflowAnalysis {
  workflowType: string;
  complexity: "low" | "medium" | "high";
  estimatedHours: number;
  components: string[];
  features: string[];
  architecture: "nextjs-app-router" | "nextjs-pages" | "react-spa";
  techStack: string[];
  workflow: {
    steps: Array<{
      id: string;
      name: string;
      description: string;
      estimatedTime: number;
      dependencies: string[];
      components?: string[];
    }>;
    milestones: Array<{
      name: string;
      description: string;
      components: string[];
      estimatedTime: number;
    }>;
  };
  recommendations: string[];
  rationale: string;
}

interface WorkflowContext {
  description?: string;
  contextFile?: string;
  prdFile?: string;
  existingComponents?: string[];
  projectType?: string;
  techStack?: string[];
  output?: string;
  force?: boolean;
  autoContinue?: boolean;
}

export class WorkflowCommand {
  private ai: HybridAIClient;

  constructor() {
    this.ai = new HybridAIClient();
  }

  public register(program: Command): void {
    const command = program
      .command("workflow")
      .description("AI-powered workflow analysis and project planning")
      .option(
        "--analyze",
        "Analyze current project and suggest optimal workflow"
      )
      .option(
        "--generate",
        "Generate and execute workflow based on project context"
      )
      .option("--interactive", "Interactive workflow planning")
      .option("--description <text>", "Project description for analysis")
      .option("--context-file <path>", "Path to context file")
      .option("--output <dir>", "Output directory", "mycontext-workflow")
      .option("--force", "Overwrite existing files")
      .option(
        "--auto-continue",
        "Automatically continue to component generation"
      )
      .option("--skip-components", "Skip component generation step")
      .option("--skip-preview", "Skip preview setup step")
      .option("--deploy", "Include deployment setup")
      .option("--with-tests", "Generate tests for components", true);

    command
      .command("analyze")
      .description("Analyze project context and recommend optimal workflow")
      .option("--description <text>", "Project description")
      .option("--context-file <path>", "Context file path")
      .option("--verbose", "Show detailed analysis")
      .action(async (options) => {
        await this.analyzeProject(options);
      });

    command
      .command("generate")
      .description(
        "Generate and execute complete workflow from project context"
      )
      .option("--description <text>", "Project description")
      .option("--context-file <path>", "Context file path")
      .option("--output <dir>", "Output directory", "mycontext-workflow")
      .option("--force", "Overwrite existing files")
      .option("--auto-continue", "Continue to component generation")
      .option("--skip-components", "Skip component generation step")
      .option("--skip-features", "Skip feature assembly step")
      .option("--skip-preview", "Skip preview setup step")
      .option(
        "--role <role>",
        "Role for feature assembly (admin/user/guest)",
        "admin"
      )
      .option("--deploy", "Include deployment setup")
      .option("--with-tests", "Generate tests for components", true)
      .action(async (options) => {
        await this.generateWorkflow(options);
      });

    command.action(async (options) => {
      if (options.analyze) {
        await this.analyzeProject(options);
      } else if (options.interactive) {
        await this.interactiveWorkflow();
      } else {
        console.log(chalk.blue.bold("🎯 MyContext AI Workflow System\n"));

        console.log(
          "This command uses AI to analyze your project requirements and generate"
        );
        console.log(
          "optimal, contextual workflows tailored to your specific needs.\n"
        );

        console.log(chalk.cyan("Commands:"));
        console.log(
          "  mycontext workflow analyze    # Analyze project and get recommendations"
        );
        console.log(
          "  mycontext workflow generate   # Generate and execute complete workflow"
        );
        console.log(
          "  mycontext workflow --interactive # Interactive workflow planning"
        );
        console.log("");

        console.log(chalk.cyan("Examples:"));
        console.log(`  ${chalk.gray("# Analyze current project")}`);
        console.log(
          `  ${chalk.cyan(
            'mycontext workflow analyze --description "E-commerce platform"'
          )}`
        );
        console.log("");
        console.log(`  ${chalk.gray("# Generate complete workflow")}`);
        console.log(
          `  ${chalk.cyan(
            "mycontext workflow generate --context-file ./context.md"
          )}`
        );
        console.log("");

        console.log(
          chalk.green(
            "💡 AI analyzes your requirements to create custom workflows!"
          )
        );
      }
    });
  }

  private async analyzeProject(options: any): Promise<void> {
    try {
      console.log(chalk.blue.bold("🔍 Analyzing Project Context...\n"));

      const context = await this.gatherProjectContext(options);
      const analysis = await this.performAIAnalysis(context);

      this.displayAnalysis(analysis);
    } catch (error) {
      console.error(chalk.red("❌ Analysis failed:"), error);
      throw error;
    }
  }

  private async generateWorkflow(options: any): Promise<void> {
    try {
      console.log(chalk.blue.bold("🚀 Generating AI-Powered Workflow...\n"));

      // Step 1: Gather context
      const context = await this.gatherProjectContext(options);
      console.log(chalk.cyan("📋 Context gathered"));

      // Step 2: AI analysis
      const analysis = await this.performAIAnalysis(context);
      console.log(chalk.cyan("🤖 AI analysis completed"));

      // Step 3: Display analysis
      this.displayAnalysis(analysis);

      // Step 4: Confirm and execute
      const { confirm } = await prompts({
        type: "confirm",
        name: "confirm",
        message: `Execute this ${analysis.workflowType} workflow?`,
        initial: true,
      });

      if (!confirm) {
        console.log(chalk.yellow("Workflow execution cancelled."));
        return;
      }

      // Step 5: Execute workflow
      await this.executeWorkflow(analysis, options);
    } catch (error) {
      console.error(chalk.red("❌ Workflow generation failed:"), error);
      throw error;
    }
  }

  private async interactiveWorkflow(): Promise<void> {
    console.log(chalk.blue.bold("🎯 Interactive Workflow Planning\n"));

    const { description } = await prompts({
      type: "text",
      name: "description",
      message: "Describe your project:",
      validate: (value) =>
        value.length > 10 || "Please provide a detailed description",
    });

    const { techStack } = await prompts({
      type: "multiselect",
      name: "techStack",
      message: "Select technologies:",
      choices: [
        { title: "Next.js", value: "nextjs" },
        { title: "React", value: "react" },
        { title: "TypeScript", value: "typescript" },
        { title: "Tailwind CSS", value: "tailwind" },
        { title: "Prisma", value: "prisma" },
        { title: "NextAuth", value: "nextauth" },
        { title: "Stripe", value: "stripe" },
        { title: "Supabase", value: "supabase" },
      ],
      min: 1,
    });

    const { complexity } = await prompts({
      type: "select",
      name: "complexity",
      message: "Project complexity:",
      choices: [
        { title: "Simple (landing page, blog)", value: "low" },
        { title: "Moderate (dashboard, e-commerce)", value: "medium" },
        { title: "Complex (social platform, LMS)", value: "high" },
      ],
    });

    const options = {
      description,
      techStack,
      complexity,
      interactive: true,
    };

    await this.generateWorkflow(options);
  }

  private async gatherProjectContext(options: any): Promise<WorkflowContext> {
    const context: WorkflowContext = {
      description: options.description,
      output: options.output || "mycontext-workflow",
      force: options.force,
      autoContinue: options.autoContinue,
    };

    // Try to read context file
    if (options.contextFile) {
      if (await fs.pathExists(options.contextFile)) {
        context.contextFile = options.contextFile;
        context.description = await fs.readFile(options.contextFile, "utf-8");
      }
    }

    // Try to find existing PRD
    const prdPath = path.join(process.cwd(), ".mycontext", "01-prd.md");
    if (await fs.pathExists(prdPath)) {
      context.prdFile = prdPath;
      if (!context.description) {
        context.description = await fs.readFile(prdPath, "utf-8");
      }
    }

    // Detect existing components
    const componentsPath = path.join(
      process.cwd(),
      ".mycontext",
      "05-component-list.json"
    );
    if (await fs.pathExists(componentsPath)) {
      try {
        const componentsData = await fs.readJson(componentsPath);
        context.existingComponents = componentsData.components || [];
      } catch (error) {
        // Ignore JSON parse errors
      }
    }

    return context;
  }

  private async performAIAnalysis(
    context: WorkflowContext
  ): Promise<AIWorkflowAnalysis> {
    const prompt = `Analyze the following project requirements and generate a comprehensive workflow analysis:

Project Description:
${context.description || "Not provided"}

${
  context.existingComponents
    ? `Existing Components: ${context.existingComponents.join(", ")}`
    : ""
}

Please provide a JSON response with this exact structure:
{
  "workflowType": "string (e.g., 'e-commerce', 'dashboard', 'blog', 'task-manager', 'social-platform', 'learning-platform')",
  "complexity": "low|medium|high",
  "estimatedHours": number,
  "components": ["array", "of", "component", "names"],
  "features": ["array", "of", "feature", "descriptions"],
  "architecture": "nextjs-app-router|nextjs-pages|react-spa",
  "techStack": ["array", "of", "technologies"],
  "workflow": {
    "steps": [
      {
        "id": "string",
        "name": "string",
        "description": "string",
        "estimatedTime": number,
        "dependencies": ["array", "of", "step", "ids"],
        "components": ["optional", "array", "of", "components", "for", "this", "step"]
      }
    ],
    "milestones": [
      {
        "name": "string",
        "description": "string",
        "components": ["array"],
        "estimatedTime": number
      }
    ]
  },
  "recommendations": ["array", "of", "specific", "recommendations"],
  "rationale": "string explaining why this workflow fits the project"
}

Be specific and actionable. Focus on realistic components and features for the described project.`;

    const result = await this.ai.generateText(prompt, {
      temperature: 0.3, // Lower temperature for more consistent analysis
    });

    if (!result || !result.text) {
      throw new Error("AI analysis failed");
    }

    try {
      // Extract JSON from response
      const jsonMatch = result.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON found in AI response");
      }

      const analysis: AIWorkflowAnalysis = JSON.parse(jsonMatch[0]);

      // Validate required fields
      if (
        !analysis.workflowType ||
        !analysis.workflow ||
        !analysis.workflow.steps
      ) {
        throw new Error("Invalid analysis structure");
      }

      return analysis;
    } catch (error) {
      console.error("Failed to parse AI analysis:", error);
      throw new Error("AI returned invalid analysis format");
    }
  }

  private displayAnalysis(analysis: AIWorkflowAnalysis): void {
    console.log(
      chalk.blue.bold(
        `📊 Workflow Analysis: ${analysis.workflowType.toUpperCase()}`
      )
    );
    console.log("");

    // Project overview
    console.log(chalk.cyan("🏗️  Project Overview:"));
    console.log(`   Type: ${chalk.white(analysis.workflowType)}`);
    console.log(`   Complexity: ${chalk.white(analysis.complexity)}`);
    console.log(
      `   Estimated Time: ${chalk.white(analysis.estimatedHours + " hours")}`
    );
    console.log(`   Architecture: ${chalk.white(analysis.architecture)}`);
    console.log("");

    // Tech stack
    if (analysis.techStack && analysis.techStack.length > 0) {
      console.log(chalk.cyan("🛠️  Recommended Tech Stack:"));
      analysis.techStack.forEach((tech) => {
        console.log(`   • ${chalk.white(tech)}`);
      });
      console.log("");
    }

    // Key features
    if (analysis.features && analysis.features.length > 0) {
      console.log(chalk.cyan("✨ Key Features:"));
      analysis.features.slice(0, 5).forEach((feature) => {
        console.log(`   • ${chalk.white(feature)}`);
      });
      if (analysis.features.length > 5) {
        console.log(`   ... and ${analysis.features.length - 5} more features`);
      }
      console.log("");
    }

    // Components
    if (analysis.components && analysis.components.length > 0) {
      console.log(chalk.cyan("🧩 Components to Generate:"));
      analysis.components.slice(0, 10).forEach((component) => {
        console.log(`   • ${chalk.white(component)}`);
      });
      if (analysis.components.length > 10) {
        console.log(
          `   ... and ${analysis.components.length - 10} more components`
        );
      }
      console.log("");
    }

    // Workflow steps
    if (analysis.workflow?.steps && analysis.workflow.steps.length > 0) {
      console.log(chalk.cyan("🔄 Workflow Steps:"));
      analysis.workflow.steps.forEach((step, index) => {
        console.log(
          `   ${index + 1}. ${chalk.yellow(step.name)} (${
            step.estimatedTime
          }min)`
        );
        console.log(`      ${chalk.gray(step.description)}`);
        if (step.dependencies && step.dependencies.length > 0) {
          console.log(
            `      ${chalk.gray(
              "Dependencies: " + step.dependencies.join(", ")
            )}`
          );
        }
      });
      console.log("");
    }

    // Milestones
    if (
      analysis.workflow?.milestones &&
      analysis.workflow.milestones.length > 0
    ) {
      console.log(chalk.cyan("🎯 Milestones:"));
      analysis.workflow.milestones.forEach((milestone, index) => {
        console.log(
          `   ${index + 1}. ${chalk.green(milestone.name)} (${
            milestone.estimatedTime
          }min)`
        );
        console.log(`      ${chalk.gray(milestone.description)}`);
        console.log(
          `      ${chalk.gray(
            "Components: " + milestone.components.slice(0, 3).join(", ")
          )}`
        );
      });
      console.log("");
    }

    // Recommendations
    if (analysis.recommendations && analysis.recommendations.length > 0) {
      console.log(chalk.cyan("💡 Recommendations:"));
      analysis.recommendations.forEach((rec) => {
        console.log(`   • ${chalk.white(rec)}`);
      });
      console.log("");
    }

    // Rationale
    if (analysis.rationale) {
      console.log(chalk.cyan("🤔 Analysis Rationale:"));
      console.log(`   ${chalk.gray(analysis.rationale)}`);
      console.log("");
    }
  }

  private async executeWorkflow(
    analysis: AIWorkflowAnalysis,
    options: any
  ): Promise<void> {
    const outputDir = options.output || `mycontext-${analysis.workflowType}`;

    console.log(
      chalk.blue.bold(`🚀 Executing ${analysis.workflowType} Workflow`)
    );
    console.log(chalk.gray(`Output directory: ${outputDir}`));
    console.log("");

    try {
      // Step 1: Generate context files
      console.log(chalk.cyan("📝 Step 1: Generating context files..."));
      const contextDescription = this.generateContextDescription(analysis);

      const contextCommand = new GenerateContextFilesCommand();
      await contextCommand.execute({
        description: contextDescription,
        projectPath: path.join(process.cwd(), outputDir),
        verbose: options.verbose,
        force: options.force,
      });

      // Step 2: Compile PRD
      console.log(chalk.cyan("📋 Step 2: Compiling PRD..."));
      const prdCommand = new CompilePRDCommand();
      await prdCommand.execute({
        projectPath: path.join(process.cwd(), outputDir),
      });

      // Step 3: Generate architecture
      console.log(chalk.cyan("🏗️  Step 3: Generating project architecture..."));
      const generateCommand = new GenerateCommand();
      await generateCommand.execute({
        type: "architecture",
        description: contextDescription,
        output: path.join(process.cwd(), outputDir, ".mycontext"),
        autoContinue: options.autoContinue,
        force: options.force,
      });

      // Step 4: Generate Components
      if (!options.skipComponents) {
        console.log(chalk.cyan("🎨 Step 4: Generating components..."));
        const componentsCommand = new GenerateComponentsCommand();
        await componentsCommand.execute("all", {
          all: true,
          withTests: options.withTests !== false,
          output: path.join(process.cwd(), outputDir),
          verbose: options.verbose,
        });
      }

      // Step 5: Assemble Features
      if (!options.skipFeatures) {
        console.log(chalk.cyan("📦 Step 5: Assembling features..."));
        const { AssembleFeaturesCommand } = await import("./assemble-features");
        const assembleFeaturesCommand = new AssembleFeaturesCommand();
        await assembleFeaturesCommand.execute({
          fromComponents: true,
          role: options.role || "admin",
          output: path.join(process.cwd(), outputDir),
          verbose: options.verbose,
        });
      }

      // Step 6: Preview Information
      if (!options.skipPreview) {
        console.log(chalk.cyan("👁️  Step 6: Preview your components..."));
        console.log(chalk.blue("   Visit https://studio.mycontext.app"));
        console.log(chalk.gray("   Upload your .mycontext/ directory to preview all components"));
      }

      // Step 7: Summary and Next Steps
      console.log(
        chalk.green.bold(`\n✅ ${analysis.workflowType} workflow completed!`)
      );
      console.log(chalk.cyan("📁 Project created in:"), outputDir);
      console.log(
        chalk.cyan("🧩 Components generated:"),
        analysis.components?.length || 0
      );
      console.log(
        chalk.cyan("✨ Features included:"),
        analysis.features?.length || 0
      );

      console.log(chalk.blue("\n📋 Next Steps:"));
      console.log(chalk.gray("   1. Review components: cd " + outputDir));
      console.log(
        chalk.gray("   2. Preview at: https://studio.mycontext.app")
      );
      console.log(chalk.gray("   3. Start development: npm run dev"));
      if (options.deploy) {
        console.log(chalk.gray("   4. Deploy: mycontext deploy"));
      }
    } catch (error) {
      console.error(chalk.red(`❌ Workflow execution failed: ${error}`));
      throw error;
    }
  }

  private generateContextDescription(analysis: AIWorkflowAnalysis): string {
    return `Build a ${
      analysis.workflowType
    } application with the following requirements:

Technical Stack: ${
      analysis.techStack?.join(", ") || "Next.js, TypeScript, Tailwind CSS"
    }
Architecture: ${analysis.architecture}

Key Features:
${analysis.features?.map((f) => `• ${f}`).join("\n") || ""}

Components Needed:
${analysis.components?.map((c) => `• ${c}`).join("\n") || ""}

${analysis.rationale || ""}

Estimated development time: ${analysis.estimatedHours} hours`;
  }

  public static getHelpText(): string {
    return `
${chalk.blue.bold("🎯 MyContext AI Workflow System")}

${chalk.yellow("Description:")}
  Intelligent workflow analysis and project planning using AI. Analyzes your
  project requirements and generates contextual, optimized workflows tailored
  to your specific needs.

${chalk.yellow("Commands:")}
  mycontext workflow analyze    # Analyze project and get AI recommendations
  mycontext workflow generate   # Generate and execute complete workflow
  mycontext workflow --interactive # Interactive workflow planning

${chalk.yellow("Analysis Features:")}
  • AI-powered project type detection
  • Complexity assessment and time estimation
  • Component and feature recommendations
  • Technology stack suggestions
  • Step-by-step workflow planning
  • Milestone identification

${chalk.yellow("Workflow Types Detected:")}
  • E-commerce platforms
  • Analytics dashboards
  • Content management systems
  • Task management tools
  • Social media platforms
  • Learning management systems
  • And many more...

${chalk.yellow("Options:")}
  --description <text>    Project description for analysis
  --context-file <path>   Path to existing context file
  --output <dir>          Output directory (default: mycontext-workflow)
  --force                 Overwrite existing files
  --auto-continue         Continue to component generation automatically

${chalk.yellow("Examples:")}
  ${chalk.gray("# Analyze a project idea")}
  ${chalk.cyan(
    'mycontext workflow analyze --description "Build a task management app"'
  )}

  ${chalk.gray("# Generate complete workflow")}
  ${chalk.cyan("mycontext workflow generate --context-file ./requirements.md")}

  ${chalk.gray("# Interactive planning")}
  ${chalk.cyan("mycontext workflow --interactive")}

${chalk.green(
  "💡 AI analyzes your specific requirements to create custom workflows!"
)}
`;
  }
}
