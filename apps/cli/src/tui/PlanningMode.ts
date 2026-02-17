import { v4 as uuidv4 } from "uuid";
import prompts from "prompts";
import chalk from "chalk";
import * as fs from "fs-extra";
import * as path from "path";
import { AICore } from "../core/ai/AICore";
import { EnhancedSpinner } from "../utils/spinner";
import { TUIClient } from "./TUIClient";
import { MegaContext } from "../types/mega-context";
import { ProjectScanner } from "../services/ProjectScanner";
import { ContextSyncer } from "../services/ContextSyncer";
import { UnifiedContext, getContextSummary, isMegaContext } from "../types/unified-context";
import { deepMerge } from "../utils/deepMerge";


export class PlanningMode {
  private client: TUIClient;
  private projectPath: string;

  constructor(client: TUIClient, projectPath: string = process.cwd()) {
    this.client = client;
    this.projectPath = projectPath;
  }

  /**
   * Start the AI-driven interview process.
   * If existing context is found, enters refinement mode.
   * Otherwise, starts fresh.
   */
  async start(): Promise<MegaContext> {
    // 1. Check for existing context (personalization)
    const existingContext = await this.loadExistingContext();

    if (existingContext) {
      return this.startRefinementMode(existingContext);
    }

    return this.startFreshMode();
  }

  /**
   * Load existing context.json if present (schema-agnostic)
   */
  private async loadExistingContext(): Promise<UnifiedContext | null> {
    const contextPath = path.join(this.projectPath, ".mycontext", "context.json");
    try {
      if (await fs.pathExists(contextPath)) {
        const context = await fs.readJson(contextPath);
        return context;
      }
    } catch (e) {
      // Corrupted or unreadable — treat as fresh
    }
    return null;
  }

  /**
   * REFINEMENT MODE: Schema-agnostic — works with MegaContext OR Brain format
   */
  private async startRefinementMode(existingContext: UnifiedContext): Promise<MegaContext> {
    console.log(chalk.green("🧠 Existing Living Brain detected!\n"));

    // Use unified summary helper — works with any context shape
    const summary = getContextSummary(existingContext);

    console.log(chalk.cyan("┌─────────────────────────────────────────┐"));
    console.log(chalk.cyan("│") + chalk.bold.white(` 📋 Current Context: ${summary.name}`) + " ".repeat(Math.max(0, 22 - summary.name.length)) + chalk.cyan("│"));
    console.log(chalk.cyan("├─────────────────────────────────────────┤"));
    if (summary.entities.length > 0)
      console.log(chalk.cyan("│") + chalk.gray(` Entities:    ${summary.entities.slice(0, 5).join(", ")}${summary.entities.length > 5 ? "..." : ""}`.padEnd(40)) + chalk.cyan("│"));
    if (summary.routes.length > 0)
      console.log(chalk.cyan("│") + chalk.gray(` Routes:      ${summary.routes.slice(0, 4).join(", ")}${summary.routes.length > 4 ? "..." : ""}`.padEnd(40)) + chalk.cyan("│"));
    if (summary.roles.length > 0)
      console.log(chalk.cyan("│") + chalk.gray(` Roles:       ${summary.roles.join(", ")}`.padEnd(40)) + chalk.cyan("│"));
    if (summary.components.length > 0)
      console.log(chalk.cyan("│") + chalk.gray(` Components:  ${summary.components.length} in Lego DB`.padEnd(39)) + chalk.cyan("│"));
    if (summary.checkpoints.length > 0)
      console.log(chalk.cyan("│") + chalk.gray(` Milestones:  ${summary.checkpoints.filter(c => c.status === "complete").length}/${summary.checkpoints.length} complete`.padEnd(39)) + chalk.cyan("│"));
    if (summary.capabilities.length > 0)
      console.log(chalk.cyan("│") + chalk.gray(` Capabilities: ${summary.capabilities.join(", ")}`.padEnd(38)) + chalk.cyan("│"));
    console.log(chalk.cyan("└─────────────────────────────────────────┘\n"));

    const { action } = await prompts({
      type: "select",
      name: "action",
      message: "What would you like to do?",
      choices: [
        { title: "🔄 Refine & Evolve (describe changes to add)", value: "refine" },
        { title: "📂 Scan & Assess (compare code vs context)", value: "scan" },
        { title: "🔀 Sync (auto-update context.json + README)", value: "sync" },
        { title: "🆕 Start Fresh (wipe and regenerate)", value: "fresh" },
        { title: "❌ Cancel", value: "cancel" },
      ],
    });

    if (action === "cancel") process.exit(0);
    if (action === "fresh") return this.startFreshMode();

    // Sync mode — autonomous recontextualization
    if (action === "sync") {
      await this.ensureApiKey();
      const syncer = new ContextSyncer(this.projectPath);
      const result = await syncer.syncAll();
      
      if (result.contextUpdated || result.readmeUpdated) {
        console.log(chalk.green("\n✅ Sync complete!"));
      } else {
        console.log(chalk.yellow("\nℹ️  No changes needed."));
      }
      
      // Reload context and loop back
      const refreshed = await this.loadExistingContext();
      return this.startRefinementMode(refreshed || existingContext);
    }

    // Scan the real project structure
    const scanner = new ProjectScanner(this.projectPath);
    console.log(chalk.blue("\n📂 Scanning project structure...\n"));
    const snapshot = await scanner.scan();
    scanner.displaySnapshot(snapshot);

    if (action === "scan") {
      // Pure assessment mode — show diffs then loop back
      await this.ensureApiKey();
      console.log(chalk.blue("\n🧠 Assessing progress against context...\n"));
      const report = await scanner.assessProgress(snapshot, existingContext);
      scanner.displayReport(report);
      
      // Ask if they want to merge suggestions
      if (report.diffs.length > 0) {
        const { merge } = await prompts({
          type: "confirm",
          name: "merge",
          message: "Apply suggested context merge to evolve the plan?",
          initial: true,
        });
        if (merge && Object.keys(report.suggestedContextMerge).length > 0) {
          // DEEP merge (not shallow spread)
          const merged = deepMerge(existingContext, report.suggestedContextMerge);
          const contextPath = path.join(this.projectPath, ".mycontext", "context.json");
          await fs.writeJson(contextPath, merged, { spaces: 2 });
          console.log(chalk.green("✅ Context merged (deep) and saved!"));
        }
      }
      // Restart refinement menu
      return this.startRefinementMode(existingContext);
    }

    // Refinement path — include file tree in prompt
    const { refinement } = await prompts({
      type: "text",
      name: "refinement",
      message: "Describe what you want to add or change:",
      initial: "Add a notifications system with real-time alerts",
    });

    if (!refinement) process.exit(0);

    // Build a compact file tree for the prompt
    const fileTreeCompact = snapshot.fileTree
      .filter(f => f.type === "file")
      .map(f => f.path)
      .slice(0, 100)
      .join("\n");

    const keyFilesCompact = snapshot.keyFiles
      .map(f => `--- ${f.path} ---\n${f.content}`)
      .join("\n\n");

    const spinner = new EnhancedSpinner("Evolving architecture with real project data...");
    spinner.start();

    const prompt = `
    You have an EXISTING Next.js + InstantDB application.
    
    PLANNED CONTEXT (context.json):
    ${JSON.stringify(existingContext, null, 2).substring(0, 3000)}
    
    ACTUAL FILE STRUCTURE (${snapshot.stats.totalFiles} files):
    ${fileTreeCompact.substring(0, 2000)}
    
    KEY FILES:
    ${keyFilesCompact.substring(0, 2000)}

    The user wants to EVOLVE it with this request:
    "${refinement}"

    Generate a COMPLETE, UPDATED MegaContext JSON that:
    1. PRESERVES all existing entities, routes, roles, and components
    2. REFLECTS what actually exists in the codebase (fix any context drift)
    3. ADDS the new features requested
    4. Maintains consistency across the entire context

    Return a valid MegaContext JSON with these sections:
    - project (keep existing name & metadata)
    - topLevelDesign (colors, fonts, radius)
    - auth (roles, permissions — preserve existing + add new)
    - database (entities, relationships — preserve existing + add new)
    - routing (routes — preserve existing + add new)
    - globalState (stores)
    `;

    try {
      await this.ensureApiKey();
      const ai = this.getAICore();

      const generatedContext = await ai.generateStructuredText<MegaContext>(
        prompt,
        "MegaContext"
      );

      // Preserve identity fields
      generatedContext.project.id = existingContext.project?.id || uuidv4();
      generatedContext.project.contextPath = ".mycontext";
      generatedContext.project.createdAt = existingContext.project?.createdAt || new Date().toISOString();

      spinner.success({ text: "Architecture evolved!" });

      return await this.reviewAndRefine(generatedContext);
    } catch (error: any) {
      spinner.error({ text: "AI generation failed." });
      console.error(chalk.red(error.message));
      this.showApiKeyHelp();
      process.exit(1);
    }
  }

  /**
   * FRESH MODE: Original clean-slate interview
   */
  private async startFreshMode(): Promise<MegaContext> {
    console.log(chalk.blue("Let's define your Next.js + InstantDB project."));
    console.log(chalk.gray("I will generate a complete plan based on your description.\n"));

    // 1. Initial Input
    const initialInput = await prompts([
      {
        type: "text",
        name: "name",
        message: "Project Name:",
        initial: "my-app",
      },
      {
        type: "text",
        name: "description",
        message: "Describe your app idea:",
        initial: "A task management app where users can create teams and assign tasks.",
      },
    ]);

    if (!initialInput.name) process.exit(0);

    // 2. AI Generation
    const spinner = new EnhancedSpinner("Dreaming up the architecture...");
    spinner.start();

    const ALIGN_RULES = `
[PHILOSOPHY: DETERMINISTIC SCAFFOLDING]:
- **Next.js + InstantDB First**: We are built for Next.js full-stack projects using InstantDB as the backend.
- **Mega Context (100% Knowledge)**:
  - Before ANY code is generated, the MegaContext must be 100% populated.
  - Using: Routes, Users/Permissions, Pages, Server Actions, Client Components, Database Schema.
  
[LEGO ASSEMBLY]:
- **Component Registry**: Every component generated is stored in the Living DB.
`;

    const prompt = `
    Generate a complete 'MegaContext' JSON for a Next.js + InstantDB application based on this description:
    "${initialInput.description}"

    Project Name: "${initialInput.name}"
    
    The JSON must adhere to the MegaContext structure and the following ALIGNMENT RULES:
    ${ALIGN_RULES}

    - Uses InstantDB for backend.
    - Uses Tailwind + Shadcn for styling.
    - Define granular roles and permissions.
    - Define a comprehensive database schema (InstantDB graph).
    - Define all necessary routes (Next.js App Router).
    
    Return valid JSON with sections: project, topLevelDesign, auth, database, routing, globalState.
    `;

    try {
      await this.ensureApiKey();
      const ai = this.getAICore();

      const generatedContext = await ai.generateStructuredText<MegaContext>(
        prompt,
        "MegaContext"
      );

      // Ensure critical fields are set
      generatedContext.project.id = uuidv4();
      generatedContext.project.contextPath = ".mycontext";
      generatedContext.project.createdAt = new Date().toISOString();

      spinner.success({ text: "Architecture plan generated!" });

      // 3. Review & Edit Loop
      return await this.reviewAndRefine(generatedContext);
    } catch (error: any) {
      spinner.error({ text: "AI generation failed." });
      console.error(chalk.red(error.message));
      this.showApiKeyHelp();
      process.exit(1);
    }
  }

  /**
   * Get or initialize AICore safely
   */
  private getAICore(): AICore {
    try {
      return AICore.getInstance();
    } catch {
      // AICore not yet initialized — initialize with defaults
      return AICore.getInstance({
        fallbackEnabled: true,
        workingDirectory: this.projectPath,
      });
    }
  }

  /**
   * Ensure an API key is available for AI generation
   */
  private async ensureApiKey(): Promise<void> {
    if (
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_API_KEY ||
      process.env.GITHUB_TOKEN ||
      process.env.MYCONTEXT_GITHUB_TOKEN ||
      process.env.OPENROUTER_API_KEY ||
      process.env.MYCONTEXT_OPENROUTER_API_KEY ||
      process.env.ANTHROPIC_API_KEY ||
      process.env.XAI_API_KEY
    ) {
      return; // At least one key exists
    }

    // No keys — prompt user
    console.log(chalk.yellow("\n⚠️  No AI API keys found in environment."));
    console.log(chalk.gray("You need at least one key to generate the architecture plan."));
    this.showApiKeyHelp();

    const response = await prompts({
      type: "password",
      name: "apiKey",
      message: "Enter your Gemini API Key (free):",
    });

    if (response.apiKey) {
      process.env.GEMINI_API_KEY = response.apiKey.trim();
    } else {
      console.log(chalk.red("❌ No API key provided. Exiting."));
      process.exit(1);
    }
  }

  /**
   * Show API key help
   */
  private showApiKeyHelp(): void {
    console.log(chalk.cyan("\n💡 Get a free key:"));
    console.log(chalk.gray("   Gemini (Free):    https://aistudio.google.com/apikey"));
    console.log(chalk.gray("   OpenRouter:       https://openrouter.ai/keys"));
    console.log(chalk.gray("   GitHub Models:    https://github.com/settings/tokens\n"));
  }

  /**
   * Present the context to the user and allow edits
   */
  private async reviewAndRefine(context: MegaContext): Promise<MegaContext> {
    while (true) {
      console.log(chalk.cyan("\n--- 📋 Plan Review ---"));
      console.log(`Name: ${chalk.bold(context.project.name)}`);
      
      if (context.auth?.roles?.length > 0)
        console.log(`Roles: ${context.auth.roles.map((r) => r.name).join(", ")}`);
      if (context.database?.entities)
        console.log(`Entities: ${Object.keys(context.database.entities).join(", ")}`);
      if (context.routing?.routes)
        console.log(`Routes: ${Object.keys(context.routing.routes).join(", ")}`);
      
      console.log(chalk.cyan("----------------------\n"));

      const { action } = await prompts({
        type: "select",
        name: "action",
        message: "What would you like to do?",
        choices: [
          { title: "✅ Looks good, build it!", value: "approve" },
          { title: "📝 Edit Description & Regenerate", value: "regenerate" },
          { title: "❌ Cancel", value: "cancel" },
        ],
      });

      if (action === "approve") {
        return context;
      } else if (action === "cancel") {
        process.exit(0);
      } else if (action === "regenerate") {
        console.log(chalk.yellow("Restarting generation..."));
        return this.startFreshMode();
      }
    }
  }
}
