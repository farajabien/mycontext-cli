import { v4 as uuidv4 } from "uuid";
import prompts from "prompts";
import chalk from "chalk";
import { AICore } from "../core/ai/AICore";
import { EnhancedSpinner } from "../utils/spinner";
import { TUIClient } from "./TUIClient";
import { MegaContext } from "../types/mega-context";

export class PlanningMode {
  private client: TUIClient;
  private ai = AICore.getInstance(); // Assumes AICore is singleton-ready

  constructor(client: TUIClient) {
    this.client = client;
  }

  /**
   * Start the AI-driven interview process
   */
  async start(): Promise<MegaContext> {
    console.log(chalk.blue("Let's define your Next.js + InstantDB project."));
    console.log(chalk.gray("I will generate a complete plan based on your description.\n"));

    // 1. Initial Input
    const initialInput = await prompts([
      {
        type: "text",
        name: "name",
        message: "Project Name:",
        initial: "my-app"
      },
      {
        type: "text",
        name: "description",
        message: "Describe your app idea:",
        initial: "A task management app where users can create teams and assign tasks."
      }
    ]);

    if (!initialInput.name) process.exit(0);

    // 2. AI Generation
    const spinner = new EnhancedSpinner("Dreaming up the architecture...");
    spinner.start();

    // Define the schema for JSON enforcement (simplified for the prompt)
    const megaContextSchema = `
    {
      "project": { "framework": "nextjs", "backend": "instantdb", "styling": "tailwind-shadcn", ... },
      "topLevelDesign": { "theme": "...", "colors": {...}, "radius": number },
      "auth": { "roles": [{ "name": "...", "description": "..." }], "permissions": [...] },
      "database": { 
        "entities": { 
          "entityName": { "name": "...", "fields": { "fieldName": { "type": "string" } } } 
        },
        "relationships": [...] 
      },
      "routing": { 
        "routes": { 
          "/path": { "type": "page", "ui": { "title": "...", "description": "..." } } 
        } 
      }
    }
    `;

    const prompt = `
    Generate a complete 'MegaContext' JSON for a Next.js + InstantDB application based on this description:
    "${initialInput.description}"

    Project Name: "${initialInput.name}"
    
    The JSON must adhere to the MegaContext structure.
    - Uses InstantDB for backend.
    - Uses Tailwind + Shadcn for styling.
    - Define granular roles and permissions.
    - Define a comprehensive database schema (InstantDB graph).
    - Define all necessary routes (Next.js App Router).
    `;

    try {
        await this.ensureApiKey();

        const generatedContext = await this.ai.generateStructuredText<MegaContext>(
            prompt,
            megaContextSchema
        );
        
        // Ensure critical fields are set (AI might miss nested defaults)
        generatedContext.project.id = uuidv4();
        generatedContext.project.contextPath = ".mycontext";
        generatedContext.project.createdAt = new Date().toISOString();
        
        spinner.success({ text: "Architecture plan generated!" });
        
        // 3. Review & Edit Loop
        return await this.reviewAndRefine(generatedContext);

    } catch (error: any) {
        spinner.error({ text: "AI generation failed." });
        console.error(error.message);
        process.exit(1);
    }
  }

  /**
   * Ensure an API key is available for AI generation
   */
  private async ensureApiKey(): Promise<void> {
    // Check if AICore has working providers
    try {
        // We can't easily check internal state of AICore, but we can check env vars
        // or try a lightweight call. 
        // Better: Check env vars for known keys
        if (!process.env.GEMINI_API_KEY && !process.env.GOOGLE_API_KEY && !process.env.MYCONTEXT_GITHUB_TOKEN && !process.env.OPENROUTER_API_KEY) {
             throw new Error("No keys found");
        }
    } catch (e) {
        // Prompt user
        const spinner = new EnhancedSpinner("Checking AI access...");
        spinner.stop(); // Stop previous if any
        
        console.log(chalk.yellow("\n⚠️  No AI API keys found in environment."));
        console.log(chalk.gray("You need a Gemini API key (Free) or OpenRouter key to generate the plan."));
        
        const response = await prompts({
            type: "password",
            name: "apiKey",
            message: "Enter your Gemini API Key:",
        });

        if (response.apiKey) {
            process.env.GEMINI_API_KEY = response.apiKey.trim();
            // Re-initialize AICore providers if necessary (AICore singleton might need refresh or it reads env vars on fly?)
            // Looking at AICore.ts, providers are initialized in constructor. 
            // We might need to force reload or just rely on GeminiClient reading env var at runtime?
            // GeminiClient reads env var in getApiKey() which is called during generateText -> initializeClient
            // So setting process.env should work if client wasn't successfully initialized yet.
        } else {
            console.log(chalk.red("❌ No API key provided. Exiting."));
            process.exit(1);
        }
    }
  }

  /**
   * Present the context to the user and allow edits
   */
  private async reviewAndRefine(context: MegaContext): Promise<MegaContext> {
    while (true) {
        console.log(chalk.cyan("\n--- 📋 Plan Review ---"));
        console.log(`Name: ${chalk.bold(context.project.name)}`);
        console.log(`Roles: ${context.auth.roles.map(r => r.name).join(", ")}`);
        console.log(`Entities: ${Object.keys(context.database.entities).join(", ")}`);
        console.log(`Routes: ${Object.keys(context.routing.routes).join(", ")}`);
        console.log(chalk.cyan("----------------------\n"));

        const { action } = await prompts({
            type: "select",
            name: "action",
            message: "What would you like to do?",
            choices: [
                { title: "✅ Looks good, build it!", value: "approve" },
                { title: "📝 Edit Description & Regenerate", value: "regenerate" },
                { title: "❌ Cancel", value: "cancel" }
            ]
        });

        if (action === "approve") {
            return context;
        } else if (action === "cancel") {
            process.exit(0);
        } else if (action === "regenerate") {
            // Re-run start() - simplified for now, ideally we'd pass existing context
            console.log(chalk.yellow("Restarting generation..."));
            return this.start();
        }
    }
  }
}
