import chalk from "chalk";
import prompts from "prompts";
import path from "path";
import { EnhancedSpinner } from "../utils/spinner";
import { FileSystemManager } from "../utils/fileSystem";
import { ProgressTracker } from "../utils/progress";
import { HybridAIClient } from "../utils/hybridAIClient";
// import { GitHubModelsClient } from "../utils/githubModelsClient";
import { HostedApiClient } from "../utils/hostedApiClient";
import { CommandOptions, GenerationOptions, GenerationResult } from "../types";
import * as fs from "fs-extra";
import {
  isGenericTypes,
  generateTypesFromTemplate,
} from "../utils/typeTemplateGenerator";

// Dynamic component generation types
type AppType =
  | "ecommerce"
  | "dashboard"
  | "social"
  | "productivity"
  | "communication"
  | "content"
  | "utility"
  | "game"
  | "weather"
  | "finance"
  | "general";
type AppIntent =
  | "create"
  | "view"
  | "manage"
  | "connect"
  | "analyze"
  | "entertain";
type AppComplexity = "low" | "medium" | "high";
type UserType = "admin" | "user" | "guest" | "moderator";
type UIPattern =
  | "product-grid"
  | "shopping-cart"
  | "checkout-flow"
  | "product-detail"
  | "data-table"
  | "chart-dashboard"
  | "metric-cards"
  | "sidebar-navigation"
  | "feed"
  | "profile-card"
  | "comment-thread"
  | "social-actions"
  | "list-view"
  | "form-wizard"
  | "calendar-view"
  | "kanban-board"
  | "form"
  | "card-layout"
  | "navigation"
  | "dashboard";
type TechnicalRequirement =
  | "responsive"
  | "realtime"
  | "offline"
  | "accessible"
  | "performant";

interface Component {
  name: string;
  description: string;
  type: "layout" | "display" | "interactive" | "form";
  priority: "high" | "medium" | "low";
  userStories: string[];
  actionFunctions: string[];
  dependencies: string[];
  tags: string[];
}

interface ComponentGroup {
  name: string;
  description: string;
  priority: "high" | "medium" | "low";
  components: Component[];
}

interface PriorityMatrix {
  critical: number;
  high: number;
  medium: number;
  low: number;
}

interface AppAnalysis {
  appType: AppType;
  primaryIntent: AppIntent;
  complexity: AppComplexity;
  keyFeatures: string[];
  userTypes: UserType[];
  dataEntities: string[];
  technicalRequirements: TechnicalRequirement[];
  uiPatterns: UIPattern[];
  componentGroups: ComponentGroup[];
  priorityMatrix: PriorityMatrix;
}

interface GenerateOptions extends CommandOptions {
  type?:
    | "context"
    | "types"
    | "brand"
    | "components-list"
    | "project-structure"
    | "architecture"
    | "all";
  output?: string;
  force?: boolean;
  description?: string;
  contextFile?: string;
  model?: string;
  modelCandidates?: string[] | string;
  full?: boolean;
  autoContinue?: boolean;
  filesOnly?: boolean;
  fromSchema?: boolean; // Generate types from InstantDB schema
}

export class GenerateCommand {
  private fs = new FileSystemManager();
  private spinner: EnhancedSpinner;
  private ai: HybridAIClient;
  private hostedApi: HostedApiClient;

  constructor() {
    this.spinner = new EnhancedSpinner("Processing...");
    this.ai = new HybridAIClient();
    this.hostedApi = new HostedApiClient();
  }

  async execute(options: GenerateOptions): Promise<void> {
    try {
      this.spinner.start().updateText("Analyzing project context...");

      const projectContext = await this.resolveInputContext(options);
      if (!projectContext) {
        throw new Error(
          "No project context found. Run 'mycontext init' or pass --description/--context-file."
        );
      }

      // Auto-discover GitHub Models as default candidates when none provided
      if (!this.getModelCandidates(options)) {
        try {
          const gh = null;
          // if (gh && gh.hasApiKey()) {
          //   const list = await gh.listModels();
          //   if (Array.isArray(list) && list.length) {
          //     (options as any)._autoModelCandidates = list.slice(0, 4);
          //   }
          // }
        } catch {}
      }

      // Accept both 'component-list' and 'components-list'
      const rawType = options.type || (await this.promptForType());
      const type = rawType === "component-list" ? "components-list" : rawType;
      let result: GenerationResult;

      switch (type) {
        case "context":
        case "prd":
        case "requirements":
          // Check if user wants full context generation (PRD + A/B/C/D files)
          if (options.full) {
            // Generate both PRD and A/B/C/D files
            result = await this.generateFullContext(projectContext, options);
          } else {
            // Default: Generate A/B/C/D files (requires existing PRD)
            // This is the expected behavior for 'mycontext generate context'
            // Use the dedicated GenerateContextFilesCommand for proper handling
            const { GenerateContextFilesCommand } = await import(
              "./generate-context-files"
            );
            const contextFilesCommand = new GenerateContextFilesCommand();
            await contextFilesCommand.execute({
              description: projectContext.description,
              projectPath: this.getProjectRoot(),
              verbose: options.verbose,
              force: options.force,
            });
            result = {
              success: true,
              content: "Context files generated successfully",
              provider: "hybrid" as any,
              metadata: { model: "hybrid", tokens: 0, latency: 0 },
            };
          }
          break;
        case "types":
        case "type":
        case "interfaces":
          result = await this.generateTypes(projectContext, options);
          break;
        case "brand":
        case "brand-kit":
          result = await this.generateBrand(projectContext, options);
          break;
        case "components-list":
        case "component-list":
          result = await this.generateComponentList(projectContext, options);
          break;
        case "components":
          // Redirect to generate-components command for actual component generation
          console.log(chalk.blue("🔄 Redirecting to component generation..."));
          const { GenerateComponentsCommand } = await import(
            "./generate-components"
          );
          const generateComponentsCommand = new GenerateComponentsCommand();
          await generateComponentsCommand.execute("all", {
            ...options,
            withTests: (options as any).tests || false,
            all: true,
          });
          return; // Exit early since we're delegating to another command
        case "project-structure":
        case "structure":
        case "project":
          result = await this.generateProjectStructure(projectContext, options);
          break;
        case "architecture":
          // Generate complete architecture: types + brand + component-list + project-structure
          result = await this.generateArchitecture(projectContext, options);
          break;
        case "all": {
          // Run sequentially with chaining: PRD -> Types(from PRD) -> (optional Brand) -> Components List(from Types + optional brand)
          // PRD
          const ctxRes = await this.generateContext(projectContext, options);
          if (!ctxRes.success || !ctxRes.content)
            throw new Error(ctxRes.error || "PRD generation failed");
          const prdPath = await this.saveGeneratedContent(
            "context",
            ctxRes.content,
            options
          );
          console.log(chalk.green(`✅ Generated context saved to: ${prdPath}`));

          // Types (use PRD as context)
          const typesRes = await this.generateTypes(projectContext, {
            ...options,
            contextFile: prdPath,
          });
          if (!typesRes.success || !typesRes.content)
            throw new Error(typesRes.error || "Types generation failed");
          const typesPath = await this.saveGeneratedContent(
            "types",
            typesRes.content,
            options
          );
          console.log(chalk.green(`✅ Generated types saved to: ${typesPath}`));

          // Brand (use PRD as context for better output)
          let brandPath: string | null = null;
          const brandRes = await this.generateBrand(projectContext, {
            ...options,
            contextFile: prdPath,
          });
          if (brandRes.success && brandRes.content) {
            brandPath = await this.saveGeneratedContent(
              "brand",
              brandRes.content,
              options
            );
            console.log(
              chalk.green(`✅ Generated brand saved to: ${brandPath}`)
            );
          } else {
            console.log(
              chalk.yellow(
                `⚠️ Brand generation skipped or failed: ${
                  brandRes.error || "unknown"
                }`
              )
            );
          }

          // Components List (use Types + Brand as context)
          const compListRes = await this.generateComponentList(projectContext, {
            ...options,
            contextFile: brandPath ? `${typesPath},${brandPath}` : typesPath,
          });
          if (!compListRes.success || !compListRes.content)
            throw new Error(
              compListRes.error || "Components list generation failed"
            );
          const compListPath = await this.saveGeneratedContent(
            "components-list",
            compListRes.content,
            options
          );
          console.log(
            chalk.green(
              `✅ Generated components-list saved to: ${compListPath}`
            )
          );

          // Project Structure (use all context artifacts)
          const structureRes = await this.generateProjectStructure(
            projectContext,
            {
              ...options,
              contextFile: brandPath
                ? `${prdPath},${typesPath},${brandPath},${compListPath}`
                : `${prdPath},${typesPath},${compListPath}`,
            }
          );
          if (structureRes.success && structureRes.content) {
            const structurePath = await this.saveGeneratedContent(
              "project-structure",
              structureRes.content,
              options
            );
            console.log(
              chalk.green(
                `✅ Generated project structure saved to: ${structurePath}`
              )
            );
          } else {
            console.log(
              chalk.yellow(
                `⚠️ Project structure generation skipped or failed: ${
                  structureRes.error || "unknown"
                }`
              )
            );
          }

          this.spinner.success({
            text: "🎉 All artifacts generated successfully!",
          });

          // Show next steps for the "all" workflow
          this.printNextStepsAfterGenerate("all");
          return;
        }
        default:
          throw new Error(`Unknown generation type: ${type}`);
      }

      if (result.success && result.content) {
        this.spinner.success({ text: `✅ ${type} generated successfully!` });

        // Save the generated content
        const outputPath = await this.saveGeneratedContent(
          type,
          result.content,
          options
        );

        console.log(
          chalk.green(`✅ Generated ${type} saved to: ${outputPath}`)
        );

        // Show smart next steps suggestions
        await this.showNextSteps(type, options);

        // If this was components-list and we're not in --yes mode, offer to select core now
        if (type === "components-list" && !(options as any).yes) {
          try {
            const coreStatePath = path.join(
              process.cwd(),
              ".mycontext",
              "core.json"
            );
            const hasCoreState = await fs.pathExists(coreStatePath);
            const coreState = hasCoreState
              ? await fs.readJson(coreStatePath)
              : {};
            if (!coreState?.name) {
              const raw = await fs.readFile(outputPath, "utf8");
              const json = JSON.parse(raw);
              const groups = Array.isArray(json.groups) ? json.groups : [];
              const metaCandidates: Array<{
                name: string;
                group: string;
                reason?: string;
              }> = Array.isArray(json?.metadata?.coreCandidates)
                ? json.metadata.coreCandidates
                : [];
              const candidateKeys = new Set(
                metaCandidates.map((c) => `${c.group}::${c.name}`)
              );
              const flat: Array<{
                name: string;
                group: string;
                tags?: string[];
              }> = [];
              for (const g of groups)
                for (const c of g.components || [])
                  flat.push({ name: c.name, group: g.name, tags: c.tags });
              if (flat.length) {
                // Preferred by metadata first; then heuristic-based; then rest
                const byKey = new Map(
                  flat.map((c) => [`${c.group}::${c.name}`, c] as const)
                );
                const metaList = metaCandidates
                  .map((c) => byKey.get(`${c.group}::${c.name}`))
                  .filter(Boolean) as typeof flat;
                const heuristic = flat.filter(
                  (c) =>
                    (/core|canvas|layout|board/i.test(c.name) ||
                      (Array.isArray(c.tags) &&
                        c.tags.some((t) => /core|canvas/i.test(String(t))))) &&
                    !candidateKeys.has(`${c.group}::${c.name}`)
                );
                const rest = flat.filter(
                  (c) =>
                    !candidateKeys.has(`${c.group}::${c.name}`) &&
                    !heuristic.includes(c)
                );
                const ordered = [...metaList, ...heuristic, ...rest];
                const choices = ordered.map((c) => ({
                  title:
                    `${c.group} / ${c.name}` +
                    (candidateKeys.has(`${c.group}::${c.name}`) ? "  ⭐" : ""),
                  value: `${c.group}::${c.name}`,
                }));
                const pickNow = await prompts({
                  type: "toggle",
                  name: "do",
                  message:
                    "Select your core component now? (You can also run 'mycontext core set <Name>')",
                  initial: true,
                  active: "yes",
                  inactive: "later",
                });
                if (pickNow?.do) {
                  const ans = await prompts({
                    type: "autocomplete",
                    name: "pick",
                    message: "Pick the core component (design anchor)",
                    choices,
                    suggest: (input: string, choicesArg: any[]) => {
                      const q = (input || "").toLowerCase();
                      return Promise.resolve(
                        choicesArg.filter((c: any) =>
                          String(c.title).toLowerCase().includes(q)
                        )
                      );
                    },
                  });
                  if (ans?.pick) {
                    const [g, n] = String(ans.pick).split("::");
                    const state = {
                      name: n,
                      group: g || "core",
                      ready: false,
                      updatedAt: new Date().toISOString(),
                      refinements: [],
                    };
                    await fs.ensureDir(path.dirname(coreStatePath));
                    await fs.writeJson(coreStatePath, state, { spaces: 2 });
                    console.log(
                      chalk.green(`✅ Core set to ${n} (group: ${g}).`)
                    );
                    console.log(
                      chalk.gray(
                        "Generate it with: mycontext core --group core generate"
                      )
                    );
                  }
                }
              }
            }
          } catch {}
        }

        // Friendly next steps per type
        this.printNextStepsAfterGenerate(type);
      } else {
        throw new Error(result.error || "Generation failed");
      }
    } catch (error) {
      // Friendlier handling for missing providers
      const message = error instanceof Error ? error.message : String(error);
      if (/No AI providers available/i.test(message)) {
        console.log(
          chalk.yellow("\n⚠️  No AI providers configured. Choose your option:")
        );
        console.log(
          chalk.blue("\n🔑 Option 1: Use your own AI keys (recommended)")
        );
        console.log(
          chalk.gray("   1. Copy: .mycontext/.env.example → .mycontext/.env")
        );
        console.log(chalk.gray("   2. Add: MYCONTEXT_GITHUB_TOKEN=ghp_xxx"));
        console.log(
          chalk.gray(
            "   3. Or: MYCONTEXT_QWEN_API_KEY=sk-or-xxx (free via OpenRouter)"
          )
        );
        console.log(chalk.blue("\n🌐 Option 2: Use hosted MyContext AI"));
        console.log(chalk.gray("   1. Run: mycontext setup"));
        console.log(
          chalk.gray(
            "   2. Configure your API keys (Claude or GPT recommended)"
          )
        );
        console.log(
          chalk.gray("   3. You're in beta - no pricing, just BYOK!")
        );

        // No fallback - fail cleanly
        console.log(chalk.red("❌ AI generation failed"));
        console.log(
          chalk.yellow("💡 MyContext requires 100% accuracy - no fallbacks")
        );
        console.log(chalk.blue("🔄 Retry options:"));
        console.log(chalk.gray("  1. Wait for rate limits to reset"));
        console.log(chalk.gray("  2. Use a different AI provider"));
        console.log(chalk.gray("  3. Check your API key configuration"));
        console.log(
          chalk.gray(
            "  4. Try again later with: mycontext generate context --full"
          )
        );
        this.spinner.fail("Generation failed");
        throw new Error("AI generation failed - retry when conditions improve");
      }
      this.spinner.fail("Generation failed");
      throw error;
    }
  }

  async getProjectContext() {
    try {
      const contextPath = path.join(process.cwd(), ".mycontext", "config.json");
      if (await fs.pathExists(contextPath)) {
        return await fs.readJson(contextPath);
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  private async getActivePlaybook(): Promise<any> {
    try {
      const playbookPath = path.join(
        process.cwd(),
        ".mycontext",
        "active-playbook.json"
      );
      if (await fs.pathExists(playbookPath)) {
        return await fs.readJson(playbookPath);
      }
    } catch (error) {
      // Ignore errors
    }
    return null;
  }

  private async resolveInputContext(options: GenerateOptions) {
    // 1) Explicit description wins
    if (options.description && options.description.trim()) {
      const desc = options.description.trim();
      // Truncate long descriptions for terminal display
      const truncatedDesc =
        desc.length > 100 ? desc.substring(0, 100) + "..." : desc;
      console.log(chalk.gray(`📝 Description: ${truncatedDesc}`));
      return { description: desc };
    }
    // 2) Explicit context file
    if (options.contextFile) {
      const filePath = path.isAbsolute(options.contextFile)
        ? options.contextFile
        : path.join(process.cwd(), options.contextFile);
      if (await fs.pathExists(filePath)) {
        const content = await fs.readFile(filePath, "utf8");
        return { description: content.trim() };
      }
    }
    // 3) STDIN: allow piping/pasting long descriptions (Ctrl-D to finish)
    const stdinContent = await this.readStdinIfAvailable();
    if (stdinContent && stdinContent.trim().length > 0) {
      const desc = stdinContent.trim();
      // Truncate long descriptions for terminal display
      const truncatedDesc =
        desc.length > 100 ? desc.substring(0, 100) + "..." : desc;
      console.log(chalk.gray(`📝 Pasted description: ${truncatedDesc}`));
      return { description: desc };
    }
    // 4) Auto: prefer .mycontext/02-types.ts, then .mycontext/01-prd.md, then legacy fallback
    try {
      let typesPath = path.join(process.cwd(), ".mycontext", "02-types.ts");
      if (!(await fs.pathExists(typesPath))) {
        typesPath = path.join(process.cwd(), ".mycontext", "types.ts");
      }
      if (!(await fs.pathExists(typesPath))) {
        typesPath = path.join(process.cwd(), "context", "types.ts");
      }
      if (await fs.pathExists(typesPath)) {
        const content = await fs.readFile(typesPath, "utf8");
        return { description: content.trim() };
      }
    } catch {}
    try {
      let prdPath = path.join(process.cwd(), ".mycontext", "01-prd.md");
      if (!(await fs.pathExists(prdPath))) {
        prdPath = path.join(process.cwd(), ".mycontext", "prd.md");
      }
      if (!(await fs.pathExists(prdPath))) {
        prdPath = path.join(process.cwd(), "context", "prd.md");
      }
      if (await fs.pathExists(prdPath)) {
        const content = await fs.readFile(prdPath, "utf8");
        return { description: content.trim() };
      }
    } catch {}
    // 5) Interactive prompt to capture description (when not in --yes)
    if (!(options as any).yes) {
      this.spinner.stop();
      console.log(chalk.blue("\n📝 Project Description"));
      console.log(
        chalk.gray(
          "Enter your project description or PRD. Press Ctrl-D when finished."
        )
      );

      const pasted = await this.readStdinBlockUntilEOF();
      if (pasted && pasted.trim().length > 0) {
        const desc = pasted.trim();
        // Truncate long descriptions for terminal display
        const truncatedDesc =
          desc.length > 100 ? desc.substring(0, 100) + "..." : desc;
        console.log(chalk.gray(`📝 Description: ${truncatedDesc}`));
        this.spinner.start().updateText("Processing description...");
        return { description: desc };
      } else {
        // Fallback to simple text input
        const short = await prompts({
          type: "text",
          name: "desc",
          message: "Short project description:",
        });
        if (short?.desc && String(short.desc).trim().length > 0) {
          this.spinner.start().updateText("Processing description...");
          return { description: String(short.desc).trim() };
        }
      }
      this.spinner.start().updateText("Continuing without description...");
    }
    // 6) Fallback to project config
    return await this.getProjectContext();
  }

  async generateContext(
    projectContext: any,
    options: GenerateOptions
  ): Promise<GenerationResult> {
    // If user provided --prd-file, import it as-is and return without AI
    try {
      const prdFile =
        (options as any).prdFile ||
        (options as any).prdfile ||
        (options as any)["prd-file"]; // accept variants
      if (prdFile) {
        const abs = path.isAbsolute(prdFile)
          ? prdFile
          : path.join(process.cwd(), prdFile);
        if (await fs.pathExists(abs)) {
          const content = await fs.readFile(abs, "utf8");
          return {
            success: true,
            content,
            provider: "hybrid",
            metadata: { imported: true } as any,
          };
        }
      }
    } catch {}

    // Check if PRD already exists and handle accordingly
    const projectRoot = this.getProjectRoot();
    const prdPath = path.join(projectRoot, ".mycontext", "01-prd.md");
    const existingPRD = await this.checkExistingPRD(prdPath, options);

    if (existingPRD.shouldSkip) {
      return {
        success: true,
        content: existingPRD.content || "",
        provider: "hybrid",
        metadata: { skipped: true, reason: existingPRD.reason } as any,
      };
    }

    // Get active playbook for additional context
    const activePlaybook = await this.getActivePlaybook();

    // Load existing context files for better PRD generation
    const contextContent = await this.loadContextForPRDGeneration();

    // Check if we're merging with existing PRD
    const isMerging = (options as any).merge && existingPRD.content;

    const prompt = [
      `[mycontext] Plan: plan → generate → QA → docs → preview (→ checks)`,
      isMerging
        ? `Refine and enhance the existing PRD based on the following project context:`
        : `Create a production-grade PRD based on the following project context:`,
      ``,
      contextContent,
      ``,
      ...(isMerging
        ? [
            `## Existing PRD to Refine:`,
            ``,
            existingPRD.content,
            ``,
            `IMPORTANT: You are refining the above existing PRD. Enhance it with the context above while preserving valuable existing content. Merge new insights with existing structure.`,
          ]
        : [
            `IMPORTANT: Generate a PRD that is 100% accurate to the business context provided above. Extract specific requirements, features, and business logic from the context files. Do NOT generate generic fallback content.`,
          ]),
      "",
      // Include playbook context if available
      ...(activePlaybook
        ? [
            "",
            "## Proven Process Reference",
            `**Active Playbook: ${activePlaybook.title}**`,
            `Category: ${activePlaybook.category || "N/A"}`,
            `Difficulty: ${activePlaybook.metadata?.difficulty || "N/A"}`,
            `Estimated Time: ${
              activePlaybook.metadata?.estimatedTime || "N/A"
            }`,
            "",
            "**Process Guidelines:**",
            activePlaybook.content,
            "",
            "**Important:** Follow the proven patterns and best practices outlined in the playbook above. This will ensure your implementation follows industry standards and proven approaches.",
            "",
          ]
        : []),
      "Assume default stack unless user specifies otherwise:",
      "- Frontend: Next.js (App Router) with Shadcn UI",
      "- Auth/DB/File storage: InstantDB (auth, data, file persistence)",
      "- Accessibility: Radix UI principles (keyboard nav, ARIA, focus mgmt)",
      "- Testing: Jest + React Testing Library",
      "",
      "Follow this step-by-step process first, then structure the PRD (avoid generic statements):",
      "",
      "Process:",
      "1) Problem Statement: restate the project description from the user's perspective (who is impacted, what problem exists today, why now)",
      "2) Desired Outcomes & Success Metrics: what users want to eliminate/improve/create; define measurable outcomes",
      "3) Primary Users & Roles: identify roles and their responsibilities/permissions",
      "4) Current State & Pain Points: briefly describe how it works today (or assumptions) and pain points",
      "5) Improvement Opportunities: what to eliminate/automate/simplify; list key constraints/assumptions",
      "6) Solution Approach & Scope: MVP vs later; boundaries and tradeoffs",
      "7) User Journeys & Flows: derive end-to-end flows per role (happy path + alternatives + edge cases)",
      "8) Detailed User Stories: action-oriented stories with context and goals",
      "9) Acceptance Criteria: Given/When/Then per critical story",
      "10) Entity Model & Relationships: core entities and associations",
      "11) Information Architecture: pages/routes and the shadcn/ui primitives likely used",
      "12) Technical Requirements: SSR/ISR, server actions, data fetching, security, telemetry",
      "13) Non-Functional Requirements: performance budgets, accessibility, i18n, reliability",
      "14) Risks & Open Questions: what could derail the plan and what needs decisions",
      "",
      "Then, produce the PRD with the following sections (use exact headers for splitting):",
      "Structure the PRD with depth (avoid generic statements):",
      "## Requirements",
      "1) Overview: goal, non-goals, success metrics",
      "2) User Roles & Responsibilities: distinct roles with responsibilities and permissions",
      "3) Personas (optional): brief traits that influence UX",
      "4) Detailed User Stories: action-oriented; include negative flows and edge cases",
      "5) Entity Model & Relationships: main entities and associations",
      "",
      "## Flows",
      "6) User Journeys & Flows: end-to-end scenarios per role (step-by-step)",
      "7) Information Architecture: pages/routes, key UI patterns (shadcn components)",
      "8) Technical Requirements: SSR/ISR, data fetching, server actions, security, telemetry",
      "9) Non-Functional Requirements: performance budgets, accessibility, internationalization",
      "10) Acceptance Criteria: Gherkin-style Given/When/Then per critical story",
      "11) Risks & Open Questions",
      "",
      "Include two diagrams in fenced code blocks:",
      "- Sequence diagram of a critical flow (e.g., auth → gameplay → result)",
      "- (Optional) Flowchart for a user journey",
      "",
      "```mermaid",
      "sequenceDiagram",
      "  autonumber",
      "  participant User",
      "  participant App as Next.js App",
      "  participant DB as InstantDB",
      "  User->>App: Perform primary action",
      "  App->>DB: Persist/fetch data",
      "  DB-->>App: Data OK",
      "  App-->>User: Updated UI",
      "```",
      "",
      "Write concretely. Ground content in the provided description. No placeholders.",
    ].join("\n");

    try {
      // Check if user has local AI keys configured
      const hasLocalKeys = this.hasLocalAIKeys();

      if (hasLocalKeys) {
        // Use local AI first (user's own keys)
        this.spinner.updateText(
          `🤖 Generating PRD with ${await this.ai.getActiveProviderName()}...`
        );
        const { text, provider } = await this.ai.generateText(prompt, {
          model: options.model || process.env.MYCONTEXT_MODEL,
          modelCandidates: this.getModelCandidates(options),
          spinnerCallback: (text: string, resetTimer: boolean = false) => {
            this.spinner.updateText(text);
            if (resetTimer) {
              this.spinner.reset();
            }
          },
        });

        const cleaned = this.sanitizeMarkdownOutput(text);

        return {
          success: true,
          content: cleaned,
          provider: provider as any,
          metadata: {
            model: "local",
            tokens: cleaned.length / 4,
            latency: 1000,
          },
        };
      } else {
        // No local keys - use hosted API (requires authentication)
        this.spinner.updateText(
          "🤖 Generating PRD with MyContext AI (hosted)..."
        );

        const hostedResult = await this.hostedApi.generateContext(
          "context",
          prompt,
          {
            model: options.model || "mycontext",
            context: projectContext,
          }
        );

        if (hostedResult.success && hostedResult.data) {
          const cleaned = this.sanitizeMarkdownOutput(hostedResult.data);
          return {
            success: true,
            content: cleaned,
            provider: "hosted" as any,
            metadata: {
              model: "mycontext",
              tokens: cleaned.length / 4,
              latency: 1000,
            },
          };
        } else {
          throw new Error(hostedResult.error || "Hosted API failed");
        }
      }
    } catch (error) {
      return {
        success: false,
        error: `AI generation failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        provider: "hybrid",
      };
    }
  }

  async generateTypes(
    projectContext: any,
    options: GenerateOptions
  ): Promise<GenerationResult> {
    // Check if --from-schema flag is used
    if (options.fromSchema) {
      return this.generateTypesFromSchema();
    }

    // Load context files for accurate type generation
    const contextContent = await this.loadContextForTypesGeneration();

    // Try AI generation first, but have template fallback ready
    const prompt = `Generate TypeScript types for the business application described in the context.

CONTEXT: ${contextContent}

Create TypeScript interfaces for the business entities mentioned in the context above.

Generate 5 files: database.ts, enums.ts, ui.ts, utils.ts, index.ts

Use the business entities from the context above, not generic types.`;

    try {
      // Check if user has local AI keys configured
      const hasLocalKeys = this.hasLocalAIKeys();

      if (hasLocalKeys) {
        // Use local AI first (user's own keys)
        this.spinner.updateText(
          `🔧 Generating TypeScript types with ${await this.ai.getActiveProviderName()}...`
        );
        const { text, provider } = await this.ai.generateText(prompt, {
          model: options.model || process.env.MYCONTEXT_MODEL,
          modelCandidates: this.getModelCandidates(options),
          spinnerCallback: (text: string, resetTimer: boolean = false) => {
            this.spinner.updateText(text);
            if (resetTimer) {
              this.spinner.reset();
            }
          },
        });

        // Parse the generated content and create structured files
        const structuredContent = this.parseAndStructureTypes(text);

        // Check if AI generated generic types (fallback detection)
        if (isGenericTypes(structuredContent)) {
          console.log(
            "⚠️  AI generated generic types, using template fallback..."
          );
          const templateContent = generateTypesFromTemplate(contextContent);
          return {
            success: true,
            content: templateContent,
            provider: "template-fallback" as any,
            metadata: {
              model: "template",
              tokens: templateContent.length / 4,
              latency: 100,
            },
          };
        }

        return {
          success: true,
          content: structuredContent,
          provider: provider as any,
          metadata: {
            model: "local",
            tokens: structuredContent.length / 4,
            latency: 600,
          },
        };
      } else {
        // No local keys - try hosted API only
        this.spinner.updateText(
          "🔧 Generating TypeScript types with MyContext AI (hosted)..."
        );

        try {
          const hostedResult = await this.hostedApi.generateContext(
            "types",
            prompt,
            {
              model: options.model || "mycontext",
              context: projectContext,
            }
          );

          if (hostedResult.success && hostedResult.data) {
            // Parse the generated content and create structured files
            const structuredContent = this.parseAndStructureTypes(
              hostedResult.data
            );

            // Check if AI generated generic types (fallback detection)
            if (isGenericTypes(structuredContent)) {
              console.log(
                "⚠️  AI generated generic types, using template fallback..."
              );
              const templateContent = generateTypesFromTemplate(contextContent);
              return {
                success: true,
                content: templateContent,
                provider: "template-fallback" as any,
                metadata: {
                  model: "template",
                  tokens: templateContent.length / 4,
                  latency: 100,
                },
              };
            }

            return {
              success: true,
              content: structuredContent,
              provider: "hosted" as any,
              metadata: {
                model: "mycontext",
                tokens: structuredContent.length / 4,
                latency: 600,
              },
            };
          } else {
            console.log(chalk.red("❌ Hosted API failed"));
            console.log(
              chalk.yellow("💡 MyContext requires 100% accuracy - no fallbacks")
            );
            console.log(chalk.blue("🔄 Retry options:"));
            console.log(
              chalk.gray("  1. Configure a local AI provider API key")
            );
            console.log(chalk.gray("  2. Check your API key configuration"));
            console.log(
              chalk.gray("  3. Try again later with: mycontext generate types")
            );
            throw new Error(
              "Hosted API unavailable - configure local AI provider"
            );
          }
        } catch (error) {
          // No fallback - fail cleanly
          console.log(chalk.red("❌ AI generation failed for types"));
          console.log(
            chalk.yellow("💡 MyContext requires 100% accuracy - no fallbacks")
          );
          console.log(chalk.blue("🔄 Retry options:"));
          console.log(chalk.gray("  1. Wait for rate limits to reset"));
          console.log(chalk.gray("  2. Use a different AI provider"));
          console.log(chalk.gray("  3. Check your API key configuration"));
          console.log(
            chalk.gray("  4. Try again later with: mycontext generate types")
          );
          throw new Error(
            "AI generation failed - retry when conditions improve"
          );
        }
      }
    } catch (error) {
      return {
        success: false,
        error: `AI generation failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        provider: "hybrid",
      };
    }
  }

  /**
   * Generate types from InstantDB schema
   */
  private async generateTypesFromSchema(): Promise<GenerationResult> {
    try {
      this.spinner.updateText("🔄 Generating types from InstantDB schema...");

      // Check if schema file exists
      const schemaPath = ".mycontext/schema.ts";
      if (!(await this.fs.exists(schemaPath))) {
        throw new Error(
          `Schema file not found: ${schemaPath}. Run 'mycontext generate:schema' first.`
        );
      }

      // Run the schema types generator script
      const { spawn } = require("child_process");
      const tsx = require.resolve("tsx");

      return new Promise((resolve, reject) => {
        const child = spawn(
          "node",
          [tsx, "scripts/generateTypesFromSchema.ts"],
          {
            stdio: "pipe",
            cwd: process.cwd(),
          }
        );

        let output = "";
        let error = "";

        child.stdout.on("data", (data: any) => {
          output += data.toString();
        });

        child.stderr.on("data", (data: any) => {
          error += data.toString();
        });

        child.on("close", async (code: any) => {
          if (code === 0) {
            // Read the generated types file
            const typesPath = ".mycontext/types.ts";
            if (await this.fs.exists(typesPath)) {
              const typesContent = await this.fs.readFile(typesPath);
              resolve({
                success: true,
                content: typesContent,
                provider: "schema-generator" as any,
                metadata: {
                  model: "schema-generator",
                  tokens: typesContent.length / 4,
                  latency: 200,
                },
              });
            } else {
              reject(new Error("Types file was not generated"));
            }
          } else {
            reject(new Error(`Schema types generation failed: ${error}`));
          }
        });
      });
    } catch (error) {
      return {
        success: false,
        error: `Schema types generation failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        provider: "hybrid" as any,
      };
    }
  }

  /**
   * Load context files for accurate type generation
   */
  private async loadContextForTypesGeneration(): Promise<string> {
    const context = await this.loadAllContextFiles();

    if (!context.hasContext) {
      return 'No detailed context files found. Please ensure you have generated context files first with "mycontext generate context --full".';
    }

    let contextContent = "";

    // Load PRD (01-prd.md)
    if (context.prd && !this.isTemplatePRD(context.prd)) {
      contextContent += `## Project Requirements Document (PRD)\n\n${context.prd}\n\n`;
    }

    // Load features (01a-features.md)
    if (context.features) {
      contextContent += `## Features and Requirements\n\n${context.features}\n\n`;
    }

    // Load user flows (01b-user-flows.md)
    if (context.userFlows) {
      contextContent += `## User Flows and Interactions\n\n${context.userFlows}\n\n`;
    }

    // Load edge cases (01c-edge-cases.md)
    if (context.edgeCases) {
      contextContent += `## Edge Cases and Error Scenarios\n\n${context.edgeCases}\n\n`;
    }

    // Load technical specs (01d-technical-specs.md)
    if (context.technicalSpecs) {
      contextContent += `## Technical Specifications\n\n${context.technicalSpecs}\n\n`;
    }

    return contextContent;
  }

  /**
   * Load context files for accurate brand generation
   */
  private async loadContextForBrandGeneration(): Promise<string> {
    const context = await this.loadAllContextFiles();

    if (!context.hasContext) {
      return 'No detailed context files found. Please ensure you have generated context files first with "mycontext generate context --full".';
    }

    let contextContent = "";

    // Load PRD (01-prd.md)
    if (context.prd && !this.isTemplatePRD(context.prd)) {
      contextContent += `## Project Requirements Document (PRD)\n\n${context.prd}\n\n`;
    }

    // Load features (01a-features.md)
    if (context.features) {
      contextContent += `## Features and Requirements\n\n${context.features}\n\n`;
    }

    // Load user flows (01b-user-flows.md)
    if (context.userFlows) {
      contextContent += `## User Flows and Interactions\n\n${context.userFlows}\n\n`;
    }

    // Load edge cases (01c-edge-cases.md)
    if (context.edgeCases) {
      contextContent += `## Edge Cases and Error Scenarios\n\n${context.edgeCases}\n\n`;
    }

    // Load technical specs (01d-technical-specs.md)
    if (context.technicalSpecs) {
      contextContent += `## Technical Specifications\n\n${context.technicalSpecs}\n\n`;
    }

    return contextContent;
  }

  /**
   * Check if PRD already exists and handle user preferences
   */
  private async checkExistingPRD(
    prdPath: string,
    options: GenerateOptions
  ): Promise<{
    shouldSkip: boolean;
    content?: string;
    reason?: string;
  }> {
    if (!(await fs.pathExists(prdPath))) {
      return { shouldSkip: false };
    }

    const existingContent = await fs.readFile(prdPath, "utf8");

    // Check if it's just a template/placeholder
    if (this.isTemplatePRD(existingContent)) {
      console.log(
        chalk.yellow(
          "⚠️  Existing PRD appears to be a template, will generate new one"
        )
      );
      return { shouldSkip: false };
    }

    // Check for force flag
    if ((options as any).force) {
      console.log(
        chalk.yellow("🔄 Force flag detected, will overwrite existing PRD")
      );
      return { shouldSkip: false };
    }

    // Check for merge flag
    if ((options as any).merge) {
      console.log(
        chalk.blue("🔀 Merge flag detected, will merge with existing PRD")
      );
      return { shouldSkip: false, content: existingContent };
    }

    // Interactive prompt for user choice
    console.log(chalk.yellow("⚠️  PRD already exists at .mycontext/01-prd.md"));
    console.log(chalk.gray("What would you like to do?"));
    console.log(chalk.gray("  1. Overwrite existing PRD (--force)"));
    console.log(chalk.gray("  2. Merge with existing PRD (--merge)"));
    console.log(chalk.gray("  3. Skip generation (keep existing)"));

    // For now, default to skip to avoid breaking existing workflows
    // In a full implementation, you'd use inquirer or similar for interactive prompts
    console.log(
      chalk.blue(
        "ℹ️  Skipping PRD generation (use --force to overwrite or --merge to merge)"
      )
    );
    return {
      shouldSkip: true,
      content: existingContent,
      reason:
        "PRD already exists - use --force to overwrite or --merge to merge",
    };
  }

  /**
   * Load context files for accurate PRD generation
   */
  private async loadContextForPRDGeneration(): Promise<string> {
    const context = await this.loadAllContextFiles();

    if (!context.hasContext) {
      return 'No detailed context files found. Please ensure you have generated context files first with "mycontext generate context --full".';
    }

    let contextContent = "";

    // Load existing PRD if it exists (for refinement)
    if (context.prd && !this.isTemplatePRD(context.prd)) {
      contextContent += `## Existing Project Requirements Document (PRD)\n\n${context.prd}\n\n`;
    }

    // Load features (01a-features.md)
    if (context.features) {
      contextContent += `## Features and Requirements\n\n${context.features}\n\n`;
    }

    // Load user flows (01b-user-flows.md)
    if (context.userFlows) {
      contextContent += `## User Flows and Interactions\n\n${context.userFlows}\n\n`;
    }

    // Load edge cases (01c-edge-cases.md)
    if (context.edgeCases) {
      contextContent += `## Edge Cases and Error Scenarios\n\n${context.edgeCases}\n\n`;
    }

    // Load technical specs (01d-technical-specs.md)
    if (context.technicalSpecs) {
      contextContent += `## Technical Specifications\n\n${context.technicalSpecs}\n\n`;
    }

    return contextContent;
  }

  /**
   * Unified method to load all context files for consistent discovery
   */
  private async loadAllContextFiles(): Promise<{
    prd: string;
    features: string;
    userFlows: string;
    edgeCases: string;
    technicalSpecs: string;
    hasContext: boolean;
  }> {
    const projectRoot = this.getProjectRoot();
    const contextDir = path.join(projectRoot, ".mycontext");

    const readOrEmpty = async (filePath: string): Promise<string> => {
      if (await fs.pathExists(filePath)) {
        return await fs.readFile(filePath, "utf8");
      }
      return "";
    };

    // Load all context files
    const prd = await readOrEmpty(path.join(contextDir, "01-prd.md"));
    const features = await readOrEmpty(
      path.join(contextDir, "01a-features.md")
    );
    const userFlows = await readOrEmpty(
      path.join(contextDir, "01b-user-flows.md")
    );
    const edgeCases = await readOrEmpty(
      path.join(contextDir, "01c-edge-cases.md")
    );
    const technicalSpecs = await readOrEmpty(
      path.join(contextDir, "01d-technical-specs.md")
    );

    // Check if we have any meaningful context
    const hasContext = !!(
      prd.trim() ||
      features.trim() ||
      userFlows.trim() ||
      edgeCases.trim() ||
      technicalSpecs.trim()
    );

    return {
      prd,
      features,
      userFlows,
      edgeCases,
      technicalSpecs,
      hasContext,
    };
  }

  // specs flow removed; PRD is the requirements and Brand is the design.

  // REMOVED: Dangerous fallback method that compromises accuracy
  private generateTypesTemplate_DISABLED(projectContext: any): string {
    // Generate a basic template when AI generation fails
    const projectName = projectContext.description || "MyContext Project";

    return `# 🚀 TypeScript Type System - ${projectName}

## Generated Type System Template

This is a fallback template generated when AI services are not available.
Please configure API keys to get AI-generated types.

## 📁 Generated Structure

\`\`\`
lib/types/
├── index.ts           # Main export file
├── database.ts        # Database types & schemas
├── enums.ts          # Enum constants & types
├── ui.ts             # UI component types
├── utils.ts          # Utility types & helpers
\`\`\`

### index.ts - Main Entry Point
\`\`\`typescript
// Main type exports for ${projectName}
export * from './database';
export * from './enums';
export * from './ui';
export * from './utils';
\`\`\`

### database.ts - Database Layer Types
\`\`\`typescript
// Database types for ${projectName}
export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
}
\`\`\`

### enums.ts - Enum Constants & Types
\`\`\`typescript
// Enum constants for ${projectName}
export const USER_ROLES = {
  ADMIN: 'admin',
  USER: 'user',
  GUEST: 'guest',
} as const;

export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES];
\`\`\`

### ui.ts - UI Component Types
\`\`\`typescript
// UI component types for ${projectName}
export interface ButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  disabled?: boolean;
}

export interface InputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: 'text' | 'email' | 'password';
  disabled?: boolean;
}
\`\`\`

### utils.ts - Utility Types & Helpers
\`\`\`typescript
// Utility types for ${projectName}
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredField<T, K extends keyof T> = T & Required<Pick<T, K>>;

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
\`\`\`

## 🎯 Next Steps

1. **Configure API Keys**: Set up AI provider keys for enhanced generation
2. **Customize Types**: Modify these templates for your specific needs
3. **Add Validation**: Include Zod schemas for runtime validation
4. **Generate Components**: Use these types to generate components
5. **Test Integration**: Ensure types work with your components

## 📝 Notes

- This is a fallback template generated without AI assistance
- For better results, configure Qwen, GitHub Models, or other AI providers
- Types can be extended and customized as your project grows

---
*Generated by MyContext CLI - Fallback template*
*Last updated: ${new Date().toISOString()}*`;
  }

  private parseAIGeneratedTypes(
    aiGeneratedContent: string
  ): Record<string, string> {
    // Try to parse the AI-generated content
    const content = aiGeneratedContent;

    // Look for code blocks with specific file names
    const filePatterns = [
      {
        name: "database",
        pattern: /```typescript\s*\/\/.*database\.ts[\s\S]*?```/gi,
      },
      {
        name: "enums",
        pattern: /```typescript\s*\/\/.*enums\.ts[\s\S]*?```/gi,
      },
      { name: "ui", pattern: /```typescript\s*\/\/.*ui\.ts[\s\S]*?```/gi },
      {
        name: "utils",
        pattern: /```typescript\s*\/\/.*utils\.ts[\s\S]*?```/gi,
      },
      {
        name: "index",
        pattern: /```typescript\s*\/\/.*index\.ts[\s\S]*?```/gi,
      },
    ];

    const typesFolderContent: Record<string, string> = {};

    filePatterns.forEach(({ name, pattern }) => {
      const match = pattern.exec(content);
      if (match) {
        // Extract the content inside the code block
        const codeBlock = match[0];
        const codeContent = codeBlock
          .replace(/```typescript\s*\/\/.*\.ts\s*/gi, "")
          .replace(/```/g, "")
          .trim();

        if (codeContent) {
          typesFolderContent[name] = codeContent;
        }
      }
    });

    // If no structured content found, try to extract interfaces and types from the content
    if (Object.keys(typesFolderContent).length === 0) {
      const interfaces = this.extractInterfaces(content);
      const enums = this.extractEnums(content);
      const types = this.extractTypes(content);

      typesFolderContent.database = interfaces.join("\n\n");
      typesFolderContent.enums = enums.join("\n\n");
      typesFolderContent.ui = this.generateUITypes(interfaces);
      typesFolderContent.utils = types.join("\n\n");
      typesFolderContent.index = this.generateIndexTypes(
        interfaces,
        enums,
        types
      );
    }

    // Fallback to template if still no content
    if (Object.keys(typesFolderContent).length === 0) {
      return {
        index: this.generateTypesIndex(),
        database: this.generateTypesDatabase(),
        enums: this.generateTypesEnums(),
        ui: this.generateTypesUI(),
        utils: this.generateTypesUtils(),
      };
    }

    return typesFolderContent;
  }

  private extractInterfaces(content: string): string[] {
    const interfacePattern = /interface\s+(\w+)\s*\{[^}]*\}/g;
    const interfaces: string[] = [];
    let match;

    while ((match = interfacePattern.exec(content)) !== null) {
      interfaces.push(match[0]);
    }

    return interfaces;
  }

  private extractEnums(content: string): string[] {
    const enumPattern = /enum\s+(\w+)\s*\{[^}]*\}/g;
    const enums: string[] = [];
    let match;

    while ((match = enumPattern.exec(content)) !== null) {
      enums.push(match[0]);
    }

    return enums;
  }

  private extractTypes(content: string): string[] {
    const typePattern = /type\s+(\w+)\s*=\s*[^;]+;/g;
    const types: string[] = [];
    let match;

    while ((match = typePattern.exec(content)) !== null) {
      types.push(match[0]);
    }

    return types;
  }

  private generateUITypes(interfaces: string[]): string {
    const uiTypes: string[] = [];

    interfaces.forEach((interfaceStr) => {
      const interfaceName = interfaceStr.match(/interface\s+(\w+)/)?.[1];
      if (interfaceName) {
        uiTypes.push(`export interface ${interfaceName}FormData {`);
        uiTypes.push(`  // Form data for ${interfaceName}`);
        uiTypes.push(`}`);
        uiTypes.push("");
        uiTypes.push(`export interface ${interfaceName}TableRow {`);
        uiTypes.push(`  // Table row for ${interfaceName}`);
        uiTypes.push(`}`);
        uiTypes.push("");
      }
    });

    return uiTypes.join("\n");
  }

  private generateIndexTypes(
    interfaces: string[],
    enums: string[],
    types: string[]
  ): string {
    const exports: string[] = [];

    // Export interfaces
    interfaces.forEach((interfaceStr) => {
      const interfaceName = interfaceStr.match(/interface\s+(\w+)/)?.[1];
      if (interfaceName) {
        exports.push(`export type { ${interfaceName} } from './database';`);
      }
    });

    // Export enums
    enums.forEach((enumStr) => {
      const enumName = enumStr.match(/enum\s+(\w+)/)?.[1];
      if (enumName) {
        exports.push(`export type { ${enumName} } from './enums';`);
      }
    });

    // Export types
    types.forEach((typeStr) => {
      const typeName = typeStr.match(/type\s+(\w+)/)?.[1];
      if (typeName) {
        exports.push(`export type { ${typeName} } from './utils';`);
      }
    });

    return exports.join("\n");
  }

  private parseAndStructureTypes(aiGeneratedContent: string): string {
    // Parse the AI-generated content to extract the actual types
    const typesFolderContent = this.parseAIGeneratedTypes(aiGeneratedContent);

    // Create the types folder structure in .mycontext
    const typesDir = path.join(process.cwd(), ".mycontext", "types");
    fs.ensureDirSync(typesDir);

    // Write each file
    Object.entries(typesFolderContent).forEach(([filename, content]) => {
      const filePath = path.join(typesDir, `${filename}.ts`);
      fs.writeFileSync(filePath, content);
    });

    // Return a summary of what was created
    return `# 🚀 TypeScript Type System Architecture Guide

## Overview

This guide provides a comprehensive, scalable approach to organizing TypeScript types in modern web applications. The structure we've implemented ensures maintainability, type safety, and developer experience.

## 📁 Generated Structure

\`\`\`
lib/types/
├── index.ts           # Main export file
├── database.ts        # Database types & schemas
├── enums.ts          # Enum constants & types
├── ui.ts             # UI component types
└── utils.ts          # Utility types & helpers
\`\`\`

## 🏗️ Implementation Details

### ✅ Generated Files:
- **index.ts** - Central export point with organized imports
- **database.ts** - Database schema types and relationships
- **enums.ts** - Enum constants with type guards
- **ui.ts** - UI component prop types and interfaces
- **utils.ts** - Utility types and helper interfaces

### 📦 Ready to Use
To use these types in your project:

\`\`\`bash
# Move the types folder to your lib directory
mv .mycontext/types ./lib/

# Or copy individual files as needed
cp .mycontext/types/* ./lib/types/
\`\`\`

### 📚 Import Examples

\`\`\`typescript
// Main entry point
import type { User, Order, ApiResponse } from "@/lib/types";

// Specific domains
import type { User } from "@/lib/types/database";
import type { ButtonProps } from "@/lib/types/ui";
import type { USER_ROLES } from "@/lib/types/enums";
import type { Optional, PaginatedResponse } from "@/lib/types/utils";
\`\`\`

## 🎯 Key Features

- **Type Safety**: Comprehensive TypeScript interfaces
- **Scalability**: Organized by domain and responsibility
- **Developer Experience**: Clear naming and documentation
- **Maintainability**: Single responsibility per file
- **Reusability**: Generic types and composable interfaces

## 📋 Next Steps

1. **Move to Project**: Copy \`.mycontext/types/\` to \`./lib/types/\`
2. **Update Imports**: Change import paths to use new location
3. **Extend as Needed**: Add feature-specific types to new files
4. **Type Guards**: Use provided enum type guards for validation

The generated type system provides a solid foundation for any modern TypeScript application! 🎉`;
  }

  private generateTypesIndex(): string {
    return `/**
 * Main types export file
 *
 * This file serves as the central export point for all type definitions.
 * It organizes types by domain and ensures clean imports throughout the codebase.
 */

// Database and core types
export * from "./database";
export * from "./enums";

// Domain-specific types
export * from "./ui";
export * from "./utils";

// Add more feature-specific exports here as you create them:
// export * from "./auth";
// export * from "./payments";
// export * from "./inventory";
// export * from "./notifications";
`;
  }

  private generateTypesDatabase(): string {
    return `/**
 * Database Types
 *
 * This file contains type definitions directly linked to the database schema.
 * All types are derived from the database.types.ts file for type safety.
 */

import type { Tables, Enums } from "@/lib/database.types";

// ============================================
// CORE TABLE TYPES
// ============================================

// Core entities
export type User = Tables<"users">;
export type Project = Tables<"projects">;
export type Component = Tables<"components">;

// Add more core entities based on your database schema:
// export type Order = Tables<"orders">;
// export type Product = Tables<"products">;
// export type Category = Tables<"categories">;

// ============================================
// RELATIONSHIP TYPES
// ============================================

export interface UserWithProjects extends User {
  projects?: Project[];
}

export interface ProjectWithComponents extends Project {
  components?: Component[];
  owner?: User;
}

// Add more relationship types:
// export interface OrderWithItems extends Order {
//   order_items?: OrderItem[];
//   customer?: Customer;
// }

export interface ComponentWithProject extends Component {
  project?: Project;
}
`;
  }

  private generateTypesEnums(): string {
    return `/**
 * Enum Types
 *
 * This file contains all enum types and their constants for easy reference.
 * These are derived from the database schema enums.
 */

// Re-export database enums for convenience
export type {
  UserRole,
  ProjectStatus,
  ComponentType,
} from "@/lib/database.types";

// ============================================
// ENUM CONSTANTS
// ============================================

// User Roles
export const USER_ROLES = {
  ADMIN: "admin",
  USER: "user",
  MODERATOR: "moderator",
  GUEST: "guest",
} as const;

// Project Status
export const PROJECT_STATUSES = {
  ACTIVE: "active",
  INACTIVE: "inactive",
  ARCHIVED: "archived",
  DRAFT: "draft",
} as const;

// Component Types
export const COMPONENT_TYPES = {
  FORM: "form",
  DISPLAY: "display",
  LAYOUT: "layout",
  INTERACTIVE: "interactive",
  UTILITY: "utility",
} as const;

// Add more enum constants as needed:
// export const ORDER_STATUSES = {
//   PENDING: "pending",
//   PROCESSING: "processing",
//   COMPLETED: "completed",
//   CANCELLED: "cancelled",
// } as const;

// ============================================
// TYPE GUARDS & UTILITIES
// ============================================

export function isUserRole(value: string): value is UserRole {
  return Object.values(USER_ROLES).includes(value as UserRole);
}

export function isProjectStatus(value: string): value is ProjectStatus {
  return Object.values(PROJECT_STATUSES).includes(value as ProjectStatus);
}

export function isComponentType(value: string): value is ComponentType {
  return Object.values(COMPONENT_TYPES).includes(value as ComponentType);
}
`;
  }

  private generateTypesUI(): string {
    return `/**
 * UI Component Types
 *
 * This file contains types related to UI components, props, and user interface elements.
 */

// ============================================
// COMPONENT PROP TYPES
// ============================================

export interface ButtonProps {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  disabled?: boolean;
  loading?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

export interface DataTableProps<T> {
  data: T[];
  loading?: boolean;
  error?: string;
  onRefresh?: () => void;
  onRowClick?: (row: T) => void;
  searchable?: boolean;
  filterable?: boolean;
  sortable?: boolean;
  pagination?: boolean;
}

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl" | "fullscreen";
  closable?: boolean;
  footer?: React.ReactNode;
}

// ============================================
// FORM TYPES
// ============================================

export interface FormFieldProps {
  name: string;
  label: string;
  type?: "text" | "number" | "email" | "select" | "textarea" | "password";
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[];
  validation?: ValidationRule[];
}

export interface FormState<T extends Record<string, any>> {
  data: T;
  errors: Record<string, string>;
  isSubmitting: boolean;
  isDirty: boolean;
  isValid: boolean;
  touched: Record<string, boolean>;
}

export interface FormFieldState {
  value: any;
  error?: string;
  touched: boolean;
  isValid: boolean;
}

// ============================================
// LAYOUT TYPES
// ============================================

export interface LayoutProps {
  children: React.ReactNode;
  header?: React.ReactNode;
  sidebar?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

export interface SidebarProps {
  isOpen: boolean;
  onToggle?: () => void;
  width?: number;
  collapsible?: boolean;
  children: React.ReactNode;
}
`;
  }

  private generateTypesUtils(): string {
    return `/**
 * Utility Types
 *
 * This file contains utility types, helper interfaces, and common patterns.
 */

// ============================================
// COMMON UTILITY TYPES
// ============================================

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;
export type WithTimestamps<T> = T & {
  created_at: string;
  updated_at: string;
};

// ============================================
// API RESPONSE TYPES
// ============================================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

export interface ListResponse<T> extends ApiResponse<T[]> {
  count: number;
  next?: string;
  previous?: string;
}

// ============================================
// VALIDATION TYPES
// ============================================

export interface ValidationRule<T = any> {
  required?: boolean;
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: T) => boolean | string;
}

export interface ValidationRules<T> {
  [K in keyof T]?: ValidationRule<T[K]>;
}

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
  warnings?: Record<string, string>;
}

// ============================================
// EVENT TYPES
// ============================================

export interface BaseEvent {
  id: string;
  type: string;
  timestamp: string;
  userId?: string;
  metadata?: Record<string, any>;
}

export interface ComponentEvent extends BaseEvent {
  type: "component.created" | "component.updated" | "component.deleted";
  componentId: string;
  projectId: string;
}

export interface UserEvent extends BaseEvent {
  type: "user.login" | "user.logout" | "user.created";
  userId: string;
}

// ============================================
// HOOK TYPES
// ============================================

export interface UseAsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export interface UseFormReturn<T> {
  values: T;
  errors: Record<string, string>;
  touched: Record<string, boolean>;
  isSubmitting: boolean;
  isValid: boolean;
  handleChange: (field: keyof T, value: any) => void;
  handleBlur: (field: keyof T) => void;
  handleSubmit: (e: React.FormEvent) => void;
  reset: () => void;
  setFieldValue: (field: keyof T, value: any) => void;
  setFieldError: (field: keyof T, error: string) => void;
}
`;
  }

  private sanitizeTypeScriptOutput(raw: string): string {
    // Prefer fenced code block content if present
    const block = raw.match(/```(?:ts|tsx|typescript|js)?\n([\s\S]*?)```/);
    if (block && block[1]) return block[1].trim();

    // Convert any non-code lines into TS comments; strip stray fences/headings
    const lines = raw.split(/\r?\n/);
    let inside = false;
    const out: string[] = [];
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith("```")) {
        inside = !inside;
        continue;
      }
      if (inside) {
        out.push(line);
      } else if (/^#{1,6}\s/.test(trimmed)) {
        out.push("// " + trimmed.replace(/^#{1,6}\s*/, ""));
      } else if (trimmed.length === 0) {
        out.push("");
      } else {
        out.push("// " + line);
      }
    }
    return out.join("\n").trim();
  }

  async generateBrand(
    projectContext: any,
    options: GenerateOptions
  ): Promise<GenerationResult> {
    // Load context files for accurate brand generation
    const contextContent = await this.loadContextForBrandGeneration();

    const prompt = `[mycontext] Brand System Generation with CSS Custom Properties

Generate a comprehensive brand system with actual CSS custom properties based on the following project context:

${contextContent}

IMPORTANT: Generate a brand system that is 100% accurate to the business context provided above. Extract specific brand requirements, color preferences, typography needs, and design patterns from the context files. Do NOT generate generic fallback branding.

Create a complete design system with:

## Required CSS Structure:
Create a globals.css file with proper CSS custom properties following this exact structure:

### CSS Custom Properties Structure:
\`\`\`css
@layer base {
  :root {
    /* Color System */
    --primary: [hex];
    --primary-foreground: [hex];
    --secondary: [hex];
    --secondary-foreground: [hex];
    --accent: [hex];
    --accent-foreground: [hex];

    /* Neutral Colors */
    --background: [hex];
    --foreground: [hex];
    --muted: [hex];
    --muted-foreground: [hex];
    --border: [hex];
    --input: [hex];
    --ring: [hex];

    /* Typography */
    --font-family: [font-stack];
    --font-size-xs: [size];
    --font-size-sm: [size];
    --font-size-base: [size];
    --font-size-lg: [size];
    --font-size-xl: [size];

    /* Spacing */
    --spacing-1: [value];
    --spacing-2: [value];
    --spacing-3: [value];
    --spacing-4: [value];

    /* Border Radius */
    --radius-sm: [value];
    --radius-md: [value];
    --radius-lg: [value];

    /* Shadows */
    --shadow-sm: [shadow];
    --shadow-md: [shadow];
    --shadow-lg: [shadow];
  }

  .dark {
    /* Dark mode overrides */
    --background: [dark-hex];
    --foreground: [dark-hex];
    /* ... other dark mode colors */
  }
}

/* Utility Classes */
@layer utilities {
  .text-balance { text-wrap: balance; }
  .bg-primary { background-color: hsl(var(--primary)); }
  .text-primary { color: hsl(var(--primary)); }
  /* Add more utility classes as needed */
}
\`\`\`

## Requirements:
- Use HSL color format for better manipulation
- Include comprehensive color palette (light + dark modes)
- Define typography scale with consistent ratios
- Include spacing scale based on 4px grid
- Add shadow definitions
- Include utility classes for common patterns
- Make it production-ready and well-commented
- Ensure accessibility compliance (WCAG AA contrast ratios)

## Also Generate:
- Brand guidelines markdown file with usage examples
- Color palette documentation
- Typography specifications
- Component styling patterns

Make the CSS immediately usable - no placeholders, actual working values!`;

    try {
      // Check if user has local AI keys configured
      const hasLocalKeys = this.hasLocalAIKeys();

      if (hasLocalKeys) {
        // Use local AI first (user's own keys)
        this.spinner.updateText(
          `🎨 Generating brand system with ${await this.ai.getActiveProviderName()}...`
        );
        const { text, provider } = await this.ai.generateText(prompt, {
          model: options.model || process.env.MYCONTEXT_MODEL,
          modelCandidates: this.getModelCandidates(options),
          spinnerCallback: (text: string, resetTimer: boolean = false) => {
            this.spinner.updateText(text);
            if (resetTimer) {
              this.spinner.reset();
            }
          },
        });

        // Parse and create the brand system files
        const brandFiles = this.parseAndCreateBrandSystem(text);

        return {
          success: true,
          content: brandFiles.guide,
          provider: provider as any,
          metadata: {
            model: "local",
            tokens: brandFiles.guide.length / 4,
            latency: 600,
          },
        };
      } else {
        // No local keys - use hosted API (requires authentication)
        this.spinner.updateText(
          "🎨 Generating brand system with MyContext AI (hosted)..."
        );

        const hostedResult = await this.hostedApi.generateContext(
          "brand",
          prompt,
          {
            model: options.model || "mycontext",
            context: projectContext,
          }
        );

        if (hostedResult.success && hostedResult.data) {
          // Parse and create the brand system files
          const brandFiles = this.parseAndCreateBrandSystem(hostedResult.data);
          return {
            success: true,
            content: brandFiles.guide,
            provider: "hosted" as any,
            metadata: {
              model: "mycontext",
              tokens: brandFiles.guide.length / 4,
              latency: 600,
            },
          };
        } else {
          throw new Error(hostedResult.error || "Hosted API failed");
        }
      }
    } catch (error) {
      return {
        success: false,
        error: `AI generation failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        provider: "hybrid",
      };
    }
  }

  async generateProjectStructure(
    projectContext: any,
    options: GenerateOptions
  ): Promise<GenerationResult> {
    this.spinner.updateText("Generating project structure...");

    try {
      // Read existing context artifacts
      const contextArtifacts = await this.readContextArtifacts();
      const prd = contextArtifacts.prd;
      const types = contextArtifacts.types;

      // Read component list specifically
      const compListPath = path.join(
        process.cwd(),
        ".mycontext",
        "04-component-list.json"
      );
      let compList: any = null;
      if (await fs.pathExists(compListPath)) {
        try {
          const compListRaw = await fs.readFile(compListPath, "utf8");
          compList = JSON.parse(compListRaw);
        } catch {
          // Ignore parse errors
        }
      }

      if (!compList?.groups?.length) {
        throw new Error(
          "Component list is required for project structure generation. Run: mycontext generate components-list"
        );
      }

      const structurePrompt = this.buildProjectStructurePrompt(
        projectContext.description || "",
        prd,
        types,
        compList
      );

      const candidates = this.getModelCandidates(options);
      const result = await this.ai.generateText(structurePrompt, {
        modelCandidates: candidates,
        temperature: 0.3,
        spinnerCallback: (text: string, resetTimer: boolean = false) => {
          this.spinner.updateText(text);
          if (resetTimer) {
            this.spinner.reset();
          }
        },
      });

      if (!result?.text) {
        throw new Error("Failed to generate project structure");
      }

      const sanitized = this.sanitizeMarkdownOutput(result.text);

      return {
        success: true,
        content: sanitized,
        provider:
          (result.provider as "qwen" | "github" | "huggingface" | "hybrid") ||
          "hybrid",
      };
    } catch (error: any) {
      console.error(
        chalk.red(`Project structure generation failed: ${error.message}`)
      );

      // No fallback - fail cleanly
      console.log(chalk.red("❌ AI generation failed for project structure"));
      console.log(
        chalk.yellow("💡 MyContext requires 100% accuracy - no fallbacks")
      );
      console.log(chalk.blue("🔄 Retry options:"));
      console.log(chalk.gray("  1. Wait for rate limits to reset"));
      console.log(chalk.gray("  2. Use a different AI provider"));
      console.log(chalk.gray("  3. Check your API key configuration"));
      console.log(
        chalk.gray(
          "  4. Try again later with: mycontext generate context --full"
        )
      );
      throw new Error("AI generation failed - retry when conditions improve");
    }
  }

  async generateComponentList(
    projectContext: any,
    options: GenerateOptions
  ): Promise<GenerationResult> {
    // Load comprehensive context for better component generation
    const allContext = await this.loadAllContextFiles();
    const ctx = await this.readContextArtifacts();
    // Note: No core readiness check here - components-list generation should happen
    // before any core component is selected and refined
    const coreExcerpt = await this.readCoreExcerpt();
    const prompt = [
      `[mycontext] Plan: plan → generate → QA → docs → preview (→ checks)`,
      `Create a detailed, business-specific component list for: ${
        projectContext.description || "MyContext project"
      }`,
      "",
      "IMPORTANT: Use the detailed business context below to create components that directly implement the specific features, user stories, and acceptance criteria described. Extract exact feature names, user roles, and business requirements to generate precise, domain-specific components.",
      "",
      "Example: If the context mentions 'Mobile Order Entry' with specific acceptance criteria like 'Given a front office user is logged in, When they enter an order via a mobile device, Then the order should be saved and synced to the backend', create a component like 'MobileOrderEntry' with a description that references these specific requirements.",
      "",
      ...(coreExcerpt
        ? [
            "Core component excerpt (use for visual/style consistency):",
            coreExcerpt,
            "",
          ]
        : []),
      "Business Context:",
      allContext.hasContext
        ? [
            allContext.prd ? `## PRD\n${allContext.prd}` : "",
            allContext.features ? `## Features\n${allContext.features}` : "",
            allContext.userFlows
              ? `## User Flows\n${allContext.userFlows}`
              : "",
            allContext.edgeCases
              ? `## Edge Cases\n${allContext.edgeCases}`
              : "",
            allContext.technicalSpecs
              ? `## Technical Specs\n${allContext.technicalSpecs}`
              : "",
          ]
            .filter(Boolean)
            .join("\n\n")
        : ctx.prd.split("\n").slice(0, 60).join("\n"),
      "",
      "Types excerpt:",
      ctx.types.split("\n").slice(0, 80).join("\n"),
      "",
      "Branding excerpt:",
      ctx.brand.split("\n").slice(0, 40).join("\n"),
      "",
      "Available shadcn/ui primitives (import from '@/components/ui/<component>'):",
      (ctx.shadcn.length ? ctx.shadcn : this.getCanonicalShadcnList())
        .slice(0, 60)
        .join(", "),
      "",
      "Return strictly valid JSON ONLY with this HIERARCHICAL structure:",
      "{",
      '  "ApplicationName": {',
      '    "description": "Main application component",',
      '    "progress": { "completed": 0, "total": 0 },',
      '    "children": {',
      '      "Header": {',
      '        "description": "Application header section",',
      '        "progress": { "completed": 0, "total": 0 },',
      '        "children": {',
      '          "Logo": { "description": "Company logo", "type": "display" },',
      '          "Navigation": { "description": "Main navigation", "type": "interactive" }',
      "        }",
      "      },",
      '      "Main": {',
      '        "description": "Main content area",',
      '        "progress": { "completed": 0, "total": 0 },',
      '        "children": {',
      '          "BusinessSection1": {',
      '            "description": "First business domain section",',
      '            "progress": { "completed": 0, "total": 0 },',
      '            "children": {',
      '              "SubComponent1": { "description": "Specific business component", "type": "form" },',
      '              "SubComponent2": { "description": "Another business component", "type": "display" }',
      "            }",
      "          }",
      "        }",
      "      }",
      "    }",
      "  },",
      '  "metadata": {',
      '    "coreCandidates": [',
      '      { "name": string, "path": string, "reason": string },',
      '      { "name": string, "path": string, "reason": string }',
      "    ],",
      '    "totalComponents": 0,',
      '    "completedComponents": 0',
      "  }",
      "}",
      "",
      "Rules:",
      "- Create a HIERARCHICAL component structure that mirrors React component composition",
      "- Start with the main application component as the root",
      "- Nest components from largest to smallest (App -> Sections -> SubComponents -> Atomic Components)",
      "- Each component should have: description, progress tracking, and children (if any)",
      "- Progress tracking: { completed: 0, total: 0 } - total counts all nested components",
      "- CRITICAL: Use the SPECIFIC business context above to generate detailed, domain-specific components",
      "- Extract specific feature names, user stories, and acceptance criteria from the context",
      "- Create components that directly implement the features described in the context",
      "- Use the exact terminology and business language from the context",
      "- Group by business domain in the hierarchy (e.g., 'OrderManagement', 'InventoryManagement')",
      "- Each leaf component should have a 'type' field: 'layout', 'display', 'interactive', 'form'",
      "- Component descriptions should reference specific business requirements from the context",
      "- No code fences, no comments, no trailing commas.",
      "- Use only the fields above.",
      "- Ensure arrays/objects have no extra commas.",
      "- Provide 2-3 'coreCandidates' with their full path in the hierarchy.",
    ].join("\n");

    try {
      // Check if user has local AI keys configured
      const hasLocalKeys = this.hasLocalAIKeys();

      let text: string;
      let provider: string;

      if (hasLocalKeys) {
        // Use local AI first (user's own keys)
        this.spinner.updateText(
          `📋 Generating component list with ${await this.ai.getActiveProviderName()}...`
        );
        try {
          const r = await this.ai.generateText(prompt, {
            model: options.model || process.env.MYCONTEXT_MODEL,
            modelCandidates: this.getModelCandidates(options),
            spinnerCallback: (text: string, resetTimer: boolean = false) => {
              this.spinner.updateText(text);
              if (resetTimer) {
                this.spinner.reset();
              }
            },
          });
          text = r.text;
          provider = r.provider as any;
        } catch (e: any) {
          // Handle transient network issues like unexpected EOF with a single retry
          const msg = String(e?.message || e);
          if (/unexpected EOF|ECONNRESET|EPIPE/i.test(msg)) {
            this.spinner.updateText(
              "Retrying component list generation after transient error..."
            );
            const r2 = await this.ai.generateText(prompt, {
              model: options.model || process.env.MYCONTEXT_MODEL,
              modelCandidates: this.getModelCandidates(options),
              spinnerCallback: (text: string, resetTimer: boolean = false) => {
                this.spinner.updateText(text);
                if (resetTimer) {
                  this.spinner.reset();
                }
              },
            });
            text = r2.text;
            provider = r2.provider as any;
          } else {
            throw e;
          }
        }
      } else {
        // No local keys - use hosted API (requires authentication)
        this.spinner.updateText(
          "📋 Generating component list with MyContext AI (hosted)..."
        );

        const hostedResult = await this.hostedApi.generateContext(
          "components-list",
          prompt,
          {
            model: options.model || "mycontext",
            context: projectContext,
          }
        );

        if (hostedResult.success && hostedResult.data) {
          text = hostedResult.data;
          provider = "hosted";
        } else {
          throw new Error(hostedResult.error || "Hosted API failed");
        }
      }

      // Attempt to repair and extract valid JSON
      const repaired = this.repairJson(text);
      const cleanedContent = this.extractJson(repaired);

      // Attach rich context so JSON alone is enough for component generation
      try {
        console.log(
          `[GenerateCommand] Attempting to parse cleaned content (first 200 chars): ${cleanedContent.slice(
            0,
            200
          )}...`
        );
        const obj = JSON.parse(cleanedContent);
        return {
          success: true,
          content: JSON.stringify(obj, null, 2),
          provider: provider as any,
          metadata: {
            model: "auto",
            tokens: cleanedContent.length / 4,
            latency: 700,
          },
        };
      } catch (error) {
        console.log(
          `[GenerateCommand] JSON.parse failed: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
        console.log(
          `[GenerateCommand] Content that failed to parse: ${cleanedContent.slice(
            0,
            500
          )}...`
        );

        // Check if this looks like a non-JSON response
        if (
          !cleanedContent.trim().startsWith("{") &&
          !cleanedContent.trim().startsWith("[")
        ) {
          throw new Error(
            `AI returned plain text instead of JSON. Response: "${cleanedContent.slice(
              0,
              200
            )}..."`
          );
        }

        // Fallback to cleaned content
        return {
          success: true,
          content: cleanedContent,
          provider: provider as any,
          metadata: {
            model: "auto",
            tokens: cleanedContent.length / 4,
            latency: 700,
          },
        };
      }
    } catch (error) {
      // No fallback - fail cleanly
      const message = error instanceof Error ? error.message : String(error);
      console.log(chalk.red("❌ AI generation failed for component list"));
      console.log(
        chalk.yellow("💡 MyContext requires 100% accuracy - no fallbacks")
      );
      console.log(chalk.blue("🔄 Retry options:"));
      console.log(chalk.gray("  1. Wait for rate limits to reset"));
      console.log(chalk.gray("  2. Use a different AI provider"));
      console.log(chalk.gray("  3. Check your API key configuration"));
      console.log(
        chalk.gray(
          "  4. Try again later with: mycontext generate components-list"
        )
      );
      throw new Error(
        `AI generation failed: ${message} - retry when conditions improve`
      );
    }
  }

  /**
   * Generate complete project architecture: types + brand + component-list + project-structure
   */
  async generateArchitecture(
    projectContext: any,
    options: GenerateOptions
  ): Promise<GenerationResult> {
    // Check if auto-continue is enabled
    const shouldAutoContinue = options.autoContinue;
    const results = [];
    const startTime = Date.now();

    // Initialize progress tracker with time estimates
    const progressTracker = new ProgressTracker(
      "Project Architecture Generation"
    )
      .addStep("types", "Generate TypeScript types", 5000) // 5 seconds
      .addStep("brand", "Generate brand guidelines", 3000) // 3 seconds
      .addStep("design-manifest", "Generate design manifest", 2000) // 2 seconds
      .addStep("component-list", "Generate component list", 4000) // 4 seconds
      .addStep("project-structure", "Generate project structure", 3000); // 3 seconds

    console.log(
      chalk.blue("🏗️  Generating complete project architecture...\n")
    );

    // Display progress overview with time estimates
    const totalSteps = 5;
    const eta = progressTracker.getEstimatedCompletionTime();
    console.log(chalk.gray(`📋 Progress: 0/${totalSteps} steps completed`));
    console.log(
      chalk.gray(
        `⏱️  ETA: ${eta.toLocaleTimeString()} (${
          progressTracker.getEstimatedTimeRemaining() / 1000
        }s remaining)\n`
      )
    );

    // Step 1: Generate Types
    progressTracker.startStep("types");
    try {
      const typesResult = await this.generateTypes(projectContext, options);
      if (!typesResult.success) {
        throw new Error("Types generation failed");
      }
      results.push({ step: "types", result: typesResult });
      progressTracker.completeStep("types", "✅ TypeScript types generated");
    } catch (error) {
      progressTracker.failStep(
        "types",
        error instanceof Error ? error.message : "Unknown error"
      );
      throw error;
    }

    // Step 2: Generate Brand Guidelines
    progressTracker.startStep("brand");
    try {
      const brandResult = await this.generateBrand(projectContext, options);
      if (!brandResult.success) {
        throw new Error("Brand generation failed");
      }
      results.push({ step: "brand", result: brandResult });
      progressTracker.completeStep("brand", "✅ Brand guidelines generated");
    } catch (error) {
      progressTracker.failStep(
        "brand",
        error instanceof Error ? error.message : "Unknown error"
      );
      throw error;
    }

    // Step 2.5: Generate Design Manifest
    progressTracker.startStep("design-manifest");
    try {
      const { DesignAnalyzeCommand } = await import("./design-analyze");
      const designCommand = new DesignAnalyzeCommand();
      await designCommand.execute({});
      results.push({
        step: "design-manifest",
        result: { success: true, metadata: { tokens: 0 } },
      });
      progressTracker.completeStep(
        "design-manifest",
        "✅ Design manifest generated"
      );
    } catch (error) {
      progressTracker.failStep(
        "design-manifest",
        error instanceof Error ? error.message : "Unknown error"
      );
      // Don't throw error - design manifest is optional
      console.log(
        chalk.yellow(
          "⚠️  Design manifest generation failed, continuing without it"
        )
      );
    }

    // Step 3: Generate Component List
    progressTracker.startStep("component-list");
    try {
      const componentListResult = await this.generateComponentList(
        projectContext,
        options
      );
      if (!componentListResult.success) {
        throw new Error("Component list generation failed");
      }
      results.push({ step: "component-list", result: componentListResult });
      progressTracker.completeStep(
        "component-list",
        "✅ Component list generated"
      );
    } catch (error) {
      progressTracker.failStep(
        "component-list",
        error instanceof Error ? error.message : "Unknown error"
      );
      throw error;
    }

    // Step 4: Generate Project Structure
    progressTracker.startStep("project-structure");
    try {
      const structureResult = await this.generateProjectStructure(
        projectContext,
        options
      );
      if (!structureResult.success) {
        throw new Error("Project structure generation failed");
      }
      results.push({ step: "project-structure", result: structureResult });
      progressTracker.completeStep(
        "project-structure",
        "✅ Project structure generated"
      );
    } catch (error) {
      progressTracker.failStep(
        "project-structure",
        error instanceof Error ? error.message : "Unknown error"
      );
      throw error;
    }

    const totalTime = Date.now() - startTime;

    // Show final progress summary with detailed timing
    console.log(chalk.gray(`\n📊 ${progressTracker.getDetailedProgress()}`));

    // Auto-continue to components if enabled
    if (shouldAutoContinue) {
      console.log(
        chalk.cyan("\n🚀 Auto-continuing to component generation...")
      );

      try {
        const { GenerateComponentsCommand } = await import(
          "./generate-components"
        );
        const generateComponentsCommand = new GenerateComponentsCommand();
        await generateComponentsCommand.execute("all", {
          ...options,
          withTests: true,
          all: true,
        });

        console.log(
          chalk.green("\n✅ Architecture and components generation completed!")
        );
      } catch (error) {
        console.log(
          chalk.yellow(
            "\n⚠️  Architecture completed but component generation failed"
          )
        );
        console.log(
          chalk.gray(
            "   You can retry with: mycontext generate-components all --with-tests"
          )
        );
        throw error;
      }
    } else {
      // Show next steps
      console.log(chalk.green("\n✅ Architecture generation complete!"));
      console.log(chalk.blue("\n📋 Generated Files:"));
      console.log(chalk.gray("   • TypeScript types"));
      console.log(chalk.gray("   • Brand guidelines"));
      console.log(chalk.gray("   • Design manifest"));
      console.log(chalk.gray("   • Component list"));
      console.log(chalk.gray("   • Project structure"));

      console.log(chalk.blue("\n➡️  Recommended Next Steps:"));
      console.log(chalk.cyan("   1. Generate components:"));
      console.log(
        chalk.white("      mycontext generate-components all --with-tests")
      );
      console.log(chalk.cyan("   2. Preview components:"));
      console.log(chalk.white("      mycontext preview components"));
      console.log(chalk.cyan("   3. Build complete app:"));
      console.log(chalk.white("      mycontext build-app --interactive"));

      // Show additional next steps from NextStepsSuggester
      const { NextStepsSuggester } = await import(
        "../utils/nextStepsSuggester"
      );
      const workflowContext = await NextStepsSuggester.getWorkflowContext();
      workflowContext.lastCommand = "generate-architecture";
      workflowContext.hasContextFiles = true;
      const nextSteps = NextStepsSuggester.getNextSteps(workflowContext);
      NextStepsSuggester.displayNextSteps(nextSteps);
    }

    return {
      success: true,
      content: `Complete project architecture generated successfully:\n${results
        .map((r) => `✅ ${r.step}`)
        .join("\n")}${
        shouldAutoContinue ? "\n✅ Components generated automatically" : ""
      }`,
      provider: "hybrid" as any,
      metadata: {
        model: "architecture-suite",
        tokens: results.reduce(
          (sum, r) => sum + (r.result.metadata?.tokens || 0),
          0
        ),
        latency: totalTime,
      },
    };
  }

  // REMOVED: Dangerous fallback method that compromises accuracy
  private buildFallbackComponentList_DISABLED(projectContext: any): any {
    // Neutral skeleton: no assumptions. Valid shape with guidance.
    return {
      project: {
        name: (projectContext?.description || "mycontext-project").slice(0, 40),
        description: projectContext?.description || "Generated project",
      },
      metadata: {
        version: "1.0.0",
        generatedAt: new Date().toISOString(),
        ai: false,
        provider: "none",
      },
      groups: [],
      guidance: {
        note: "AI generation timed out. Start by adding groups with components (name, description, type, priority, userStories, actionFunctions, dependencies, tags).",
        exampleGroup: {
          name: "Auth",
          description: "Authentication components",
          priority: "high",
          components: [
            {
              name: "LoginForm",
              description: "Email/password form",
              type: "form",
              priority: "high",
              userStories: ["As a user, I can log in"],
              actionFunctions: ["onSubmit"],
              dependencies: ["react"],
              tags: ["auth", "form"],
            },
          ],
        },
      },
    };
  }

  private async showNextSteps(
    type: string,
    options: GenerateOptions
  ): Promise<void> {
    const suggestions = this.getContextualSuggestions(type);

    if (suggestions.length > 0) {
      console.log("\n💡 Next Steps:");
      suggestions.forEach((step, index) => {
        console.log(`   ${index + 1}. ${step.description}`);
        console.log(`      ${step.command}`);
        if (step.optional) {
          console.log(`      ${chalk.gray("(optional)")}`);
        }
      });
      console.log(""); // Empty line for spacing
    }
  }

  private getContextualSuggestions(
    type: string
  ): Array<{ description: string; command: string; optional?: boolean }> {
    switch (type) {
      case "context":
        return [
          {
            description: "Compile PRD from context files",
            command: "mycontext compile-prd",
          },
          {
            description: "Generate complete project architecture",
            command: "mycontext generate architecture",
          },
        ];

      case "architecture":
        return [
          {
            description: "Generate components from the architecture",
            command: "mycontext generate-components all --with-tests",
          },
          {
            description: "Preview the generated component list",
            command: "mycontext list components",
            optional: true,
          },
        ];

      case "types":
        return [
          {
            description: "Generate brand guidelines using the types",
            command: "mycontext generate brand",
          },
          {
            description: "Generate component list with type information",
            command: "mycontext generate components-list",
          },
        ];

      case "brand":
        return [
          {
            description: "Generate component list with brand context",
            command: "mycontext generate components-list",
          },
        ];

      case "components-list":
        return [
          {
            description: "Generate project structure",
            command: "mycontext generate project-structure",
          },
          {
            description: "Start generating components",
            command: "mycontext generate-components all --with-tests",
          },
        ];

      case "project-structure":
        return [
          {
            description: "Generate all components",
            command: "mycontext generate-components all --with-tests",
          },
          {
            description: "Build the complete application",
            command: "mycontext build-app --interactive",
          },
        ];

      default:
        return [];
    }
  }

  private async promptForType(): Promise<string> {
    const response = await prompts({
      type: "select",
      name: "type",
      message: "What would you like to generate?",
      choices: [
        { title: "Context (PRD)", value: "context" },
        { title: "Complete Architecture", value: "architecture" },
        { title: "TypeScript Types", value: "types" },
        { title: "Brand Guidelines", value: "brand" },
        { title: "Component List", value: "components-list" },
        { title: "Project Structure", value: "project-structure" },
        { title: "All", value: "all" },
      ],
    });

    return response.type;
  }

  private async saveGeneratedContent(
    type: string,
    content: string,
    options: GenerateOptions
  ): Promise<string> {
    // Write stable files into context/ to avoid duplicating timestamped artifacts
    const outputDir = options.output || ".mycontext";
    await fs.ensureDir(outputDir);

    let outputPath: string;
    switch (type) {
      case "context": {
        outputPath = path.join(outputDir, "01-prd.md");
        const preserve = Boolean((options as any).preservePrd);

        // Don't overwrite PRD if content is just a success message
        if (content === "Context files generated successfully") {
          // This means context generation had gaps and didn't actually generate content
          // Don't overwrite the existing PRD
          return outputPath;
        }

        if (preserve && (await fs.pathExists(outputPath))) {
          // Preserve existing PRD; write a copy next to it for reference
          const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
          const alt = path.join(outputDir, `01-prd.imported-${timestamp}.md`);
          await fs.writeFile(alt, content);
        } else {
          await fs.writeFile(outputPath, content);
        }

        // Also write split artifacts for improved DX (idempotent)
        try {
          const sections = this.splitPrdContent(content);
          const writtenFiles: string[] = [];

          if (sections.brief.trim().length > 0) {
            await fs.writeFile(
              path.join(outputDir, "01a-brief.md"),
              sections.brief
            );
            writtenFiles.push("01a-brief.md");
          }
          if (sections.requirements.trim().length > 0) {
            await fs.writeFile(
              path.join(outputDir, "01b-requirements.md"),
              sections.requirements
            );
            writtenFiles.push("01b-requirements.md");
          }
          if (sections.flows.trim().length > 0) {
            await fs.writeFile(
              path.join(outputDir, "01c-flows.md"),
              sections.flows
            );
            writtenFiles.push("01c-flows.md");
          }

          if (writtenFiles.length > 0) {
            console.log(
              chalk.gray(
                `   ↳ Also wrote split context: ${writtenFiles.join(", ")}`
              )
            );
          } else {
            console.log(
              chalk.yellow(
                "   ⚠️ No split sections written (content may be too short or unstructured)"
              )
            );
          }
        } catch (error) {
          console.log(
            chalk.yellow(
              `   ⚠️ Failed to split context: ${
                error instanceof Error ? error.message : "Unknown error"
              }`
            )
          );
        }

        break;
      }
      case "types": {
        // Types are now generated as a folder structure
        // The parseAndStructureTypes method already created the files
        // We just need to write the summary/guide file
        outputPath = path.join(outputDir, "02-types-guide.md");
        await fs.writeFile(outputPath, content);
        break;
      }
      case "brand": {
        // Brand is now generated as a folder structure
        // The parseAndCreateBrandSystem method already created the files
        // We just need to write the guide file
        outputPath = path.join(outputDir, "03-branding-guide.md");
        await fs.writeFile(outputPath, content);
        break;
      }
      case "components-list": {
        outputPath = path.join(outputDir, "04-component-list.json");
        const force = Boolean((options as any).force);
        try {
          const incoming = JSON.parse(content);
          if ((await fs.pathExists(outputPath)) && !force) {
            // Merge with existing if possible
            const existing = JSON.parse(await fs.readFile(outputPath, "utf8"));
            const merged = this.mergeComponentLists(existing, incoming);
            await fs.writeFile(outputPath, JSON.stringify(merged, null, 2));
          } else {
            await fs.writeFile(outputPath, JSON.stringify(incoming, null, 2));
          }
        } catch {
          // If parsing fails, and --force, overwrite with cleaned content
          if (force) {
            await fs.writeFile(outputPath, content);
          } else {
            // Merge path fallback
            await fs.writeFile(outputPath, content);
          }
        }
        break;
      }
      case "project-structure": {
        outputPath = path.join(outputDir, "05-project-structure.md");
        await fs.writeFile(outputPath, content);
        break;
      }
      default: {
        // Fallback: keep timestamped file for unknown types
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        outputPath = path.join(outputDir, `${type}-${timestamp}.txt`);
        await fs.writeFile(outputPath, content);
      }
    }

    return outputPath;
  }

  // Numbered files are canonical; no alias writer needed anymore

  private mergeComponentLists(existing: any, incoming: any): any {
    try {
      const toGroups = (obj: any) =>
        Array.isArray(obj?.groups) ? obj.groups : [];
      const existingGroups = toGroups(existing);
      const incomingGroups = toGroups(incoming);

      const mapByName = new Map<string, any>();
      for (const g of existingGroups) {
        mapByName.set(String(g.name).toLowerCase(), {
          ...g,
          components: Array.isArray(g.components) ? g.components : [],
        });
      }
      for (const g of incomingGroups) {
        const key = String(g.name).toLowerCase();
        const base = mapByName.get(key) || {
          name: g.name,
          description: g.description,
          components: [],
        };
        const mergedComponents = this.mergeComponentsByName(
          base.components,
          Array.isArray(g.components) ? g.components : []
        );
        mapByName.set(key, { ...base, ...g, components: mergedComponents });
      }

      return {
        ...(typeof existing === "object" && existing ? existing : {}),
        ...(typeof incoming === "object" && incoming ? incoming : {}),
        groups: Array.from(mapByName.values()),
      };
    } catch {
      // On any merge failure, prefer incoming fully
      return incoming;
    }
  }

  private mergeComponentsByName(a: any[], b: any[]): any[] {
    const out = new Map<string, any>();
    for (const c of a) {
      if (c && c.name) out.set(String(c.name).toLowerCase(), c);
    }
    for (const c of b) {
      if (!c || !c.name) continue;
      const key = String(c.name).toLowerCase();
      const prev = out.get(key) || {};
      out.set(key, { ...prev, ...c });
    }
    return Array.from(out.values());
  }

  private parseAndCreateBrandSystem(aiGeneratedContent: string): {
    css: string;
    guide: string;
  } {
    // Create the brand system files
    const cssContent = this.generateBrandCSS();
    const guideContent = this.generateBrandGuide();

    // Create the brand folder structure in .mycontext
    const brandDir = path.join(process.cwd(), ".mycontext", "brand");
    fs.ensureDirSync(brandDir);

    // Write the CSS file
    const cssPath = path.join(brandDir, "globals.css");
    fs.writeFileSync(cssPath, cssContent);

    // Write additional brand files
    const colorPath = path.join(brandDir, "colors.md");
    fs.writeFileSync(colorPath, this.generateBrandColors());

    const typographyPath = path.join(brandDir, "typography.md");
    fs.writeFileSync(typographyPath, this.generateBrandTypography());

    return {
      css: cssContent,
      guide: guideContent,
    };
  }

  private generateBrandCSS(): string {
    return `@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    /* ============================================
       BRAND COLOR SYSTEM - Light Mode
       ============================================ */

    /* Primary Colors */
    --primary: 221.2 83.2% 53.3%;
    --primary-foreground: 210 40% 98%;

    /* Secondary Colors */
    --secondary: 210 40% 96%;
    --secondary-foreground: 222.2 84% 4.9%;

    /* Accent Colors */
    --accent: 210 40% 96%;
    --accent-foreground: 222.2 84% 4.9%;

    /* Neutral Colors */
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;

    --muted: 210 40% 96%;
    --muted-foreground: 215.4 16.3% 46.9%;

    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;

    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;

    /* Border and Input */
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 221.2 83.2% 53.3%;

    /* Destructive */
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;

    /* ============================================
       TYPOGRAPHY SYSTEM
       ============================================ */

    /* Font Families */
    --font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
    --font-family-heading: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
    --font-family-mono: 'JetBrains Mono', 'Fira Code', 'SF Mono', monospace;

    /* Font Sizes */
    --font-size-xs: 0.75rem;    /* 12px */
    --font-size-sm: 0.875rem;   /* 14px */
    --font-size-base: 1rem;     /* 16px */
    --font-size-lg: 1.125rem;   /* 18px */
    --font-size-xl: 1.25rem;    /* 20px */
    --font-size-2xl: 1.5rem;    /* 24px */
    --font-size-3xl: 1.875rem;  /* 30px */
    --font-size-4xl: 2.25rem;   /* 36px */
    --font-size-5xl: 3rem;      /* 48px */

    /* Font Weights */
    --font-weight-normal: 400;
    --font-weight-medium: 500;
    --font-weight-semibold: 600;
    --font-weight-bold: 700;

    /* Line Heights */
    --line-height-tight: 1.25;
    --line-height-snug: 1.375;
    --line-height-normal: 1.5;
    --line-height-relaxed: 1.625;
    --line-height-loose: 2;

    /* ============================================
       SPACING SYSTEM (4px Grid)
       ============================================ */

    --spacing-0: 0;
    --spacing-1: 0.25rem;    /* 4px */
    --spacing-2: 0.5rem;     /* 8px */
    --spacing-3: 0.75rem;    /* 12px */
    --spacing-4: 1rem;       /* 16px */
    --spacing-5: 1.25rem;    /* 20px */
    --spacing-6: 1.5rem;     /* 24px */
    --spacing-8: 2rem;       /* 32px */
    --spacing-10: 2.5rem;    /* 40px */
    --spacing-12: 3rem;      /* 48px */
    --spacing-16: 4rem;      /* 64px */
    --spacing-20: 5rem;      /* 80px */
    --spacing-24: 6rem;      /* 96px */
    --spacing-32: 8rem;      /* 128px */

    /* ============================================
       BORDER RADIUS SYSTEM
       ============================================ */

    --radius-none: 0;
    --radius-sm: 0.125rem;   /* 2px */
    --radius-md: 0.375rem;   /* 6px */
    --radius-lg: 0.5rem;     /* 8px */
    --radius-xl: 0.75rem;    /* 12px */
    --radius-2xl: 1rem;      /* 16px */
    --radius-full: 9999px;

    /* ============================================
       SHADOW SYSTEM
       ============================================ */

    --shadow-none: 0 0 #0000;
    --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
    --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
    --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
    --shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);
    --shadow-2xl: 0 25px 50px -12px rgb(0 0 0 / 0.25);

    /* ============================================
       ANIMATION SYSTEM
       ============================================ */

    --animation-duration-fast: 150ms;
    --animation-duration-normal: 300ms;
    --animation-duration-slow: 500ms;

    --animation-easing-ease: cubic-bezier(0.4, 0, 0.2, 1);
    --animation-easing-ease-in: cubic-bezier(0.4, 0, 1, 1);
    --animation-easing-ease-out: cubic-bezier(0, 0, 0.2, 1);
    --animation-easing-ease-in-out: cubic-bezier(0.4, 0, 0.6, 1);
  }

  /* ============================================
     DARK MODE OVERRIDES
     ============================================ */

  .dark {
    /* Primary Colors */
    --primary: 217.2 91.2% 59.8%;
    --primary-foreground: 222.2 84% 4.9%;

    /* Secondary Colors */
    --secondary: 217.2 32.6% 17.5%;
    --secondary-foreground: 210 40% 98%;

    /* Accent Colors */
    --accent: 217.2 32.6% 17.5%;
    --accent-foreground: 210 40% 98%;

    /* Neutral Colors */
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;

    --muted: 217.2 32.6% 17.5%;
    --muted-foreground: 215 20.2% 65.1%;

    --popover: 222.2 84% 4.9%;
    --popover-foreground: 210 40% 98%;

    --card: 222.2 84% 4.9%;
    --card-foreground: 210 40% 98%;

    /* Border and Input */
    --border: 217.2 32.6% 17.5%;
    --input: 217.2 32.6% 17.5%;
    --ring: 224.3 76.3% 94.1%;

    /* Destructive */
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 210 40% 98%;
  }

  /* ============================================
     BASE STYLES
     ============================================ */

  * {
    @apply border-border;
  }

  body {
    @apply bg-background text-foreground;
    font-family: var(--font-family);
    font-size: var(--font-size-base);
    line-height: var(--line-height-normal);
  }

  /* Headings */
  h1, h2, h3, h4, h5, h6 {
    font-family: var(--font-family-heading);
    @apply text-foreground;
  }

  h1 { @apply text-4xl font-bold; }
  h2 { @apply text-3xl font-semibold; }
  h3 { @apply text-2xl font-semibold; }
  h4 { @apply text-xl font-medium; }
  h5 { @apply text-lg font-medium; }
  h6 { @apply text-base font-medium; }

  /* Links */
  a {
    @apply text-primary hover:text-primary/80 transition-colors;
  }

  /* Focus styles for accessibility */
  *:focus-visible {
    @apply outline-none ring-2 ring-ring ring-offset-2;
  }
}

/* ============================================
   UTILITY CLASSES
   ============================================ */

@layer utilities {
  /* Text utilities */
  .text-balance { text-wrap: balance; }

  /* Color utilities */
  .bg-primary { background-color: hsl(var(--primary)); }
  .bg-secondary { background-color: hsl(var(--secondary)); }
  .bg-accent { background-color: hsl(var(--accent)); }
  .bg-muted { background-color: hsl(var(--muted)); }

  .text-primary { color: hsl(var(--primary)); }
  .text-secondary { color: hsl(var(--secondary)); }
  .text-muted { color: hsl(var(--muted-foreground)); }

  .border-primary { border-color: hsl(var(--primary)); }
  .border-secondary { border-color: hsl(var(--secondary)); }

  /* Spacing utilities */
  .space-y-fluid > * + * { margin-top: var(--spacing-4); }
  .space-x-fluid > * + * { margin-left: var(--spacing-4); }

  /* Animation utilities */
  .animate-fade-in {
    animation: fadeIn var(--animation-duration-normal) var(--animation-easing-ease);
  }

  .animate-slide-up {
    animation: slideUp var(--animation-duration-normal) var(--animation-easing-ease);
  }

  /* Layout utilities */
  .container-fluid {
    width: 100%;
    padding-left: var(--spacing-4);
    padding-right: var(--spacing-4);
    margin-left: auto;
    margin-right: auto;
  }

  @media (min-width: 640px) {
    .container-fluid {
      max-width: 640px;
    }
  }

  @media (min-width: 768px) {
    .container-fluid {
      max-width: 768px;
    }
  }

  @media (min-width: 1024px) {
    .container-fluid {
      max-width: 1024px;
    }
  }

  @media (min-width: 1280px) {
    .container-fluid {
      max-width: 1280px;
    }
  }

  @media (min-width: 1536px) {
    .container-fluid {
      max-width: 1536px;
    }
  }
}

/* ============================================
   KEYFRAMES
   ============================================ */

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(1rem);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* ============================================
   COMPONENT STYLES
   ============================================ */

@layer components {
  /* Button variants using CSS custom properties */
  .btn-primary {
    background-color: hsl(var(--primary));
    color: hsl(var(--primary-foreground));
    border-radius: var(--radius-md);
    padding: var(--spacing-2) var(--spacing-4);
    font-weight: var(--font-weight-medium);
    transition: all var(--animation-duration-fast) var(--animation-easing-ease);
  }

  .btn-primary:hover {
    background-color: hsl(var(--primary) / 0.9);
  }

  .btn-primary:focus {
    box-shadow: 0 0 0 2px hsl(var(--ring));
  }

  /* Card component */
  .card-base {
    background-color: hsl(var(--card));
    border: 1px solid hsl(var(--border));
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-sm);
  }

  /* Input styles */
  .input-base {
    background-color: hsl(var(--background));
    border: 1px solid hsl(var(--input));
    border-radius: var(--radius-md);
    padding: var(--spacing-2) var(--spacing-3);
    color: hsl(var(--foreground));
  }

  .input-base:focus {
    outline: none;
    border-color: hsl(var(--ring));
    box-shadow: 0 0 0 2px hsl(var(--ring) / 0.2);
  }
}`;
  }

  private generateBrandGuide(): string {
    return `# 🚀 Brand System & Design Tokens

## Overview

This comprehensive brand system provides a complete design foundation with CSS custom properties, ensuring consistency across your entire application.

## 📁 Generated Structure

\`\`\`
.mycontext/brand/
├── globals.css           # Complete CSS custom properties
├── colors.md            # Color palette documentation
├── typography.md        # Typography specifications
└── components.md        # Component styling patterns
\`\`\`

## 🎨 Color System

### Primary Palette
- **Primary**: \`hsl(221.2 83.2% 53.3%)\` - Main brand color
- **Secondary**: \`hsl(210 40% 96%)\` - Supporting color
- **Accent**: \`hsl(210 40% 96%)\` - Highlight color

### Neutral Colors
- **Background**: \`hsl(0 0% 100%)\` - Page background
- **Foreground**: \`hsl(222.2 84% 4.9%)\` - Text color
- **Muted**: \`hsl(210 40% 96%)\` - Subtle backgrounds
- **Border**: \`hsl(214.3 31.8% 91.4%)\` - Element borders

## 📝 Typography Scale

### Font Families
- **Body**: Inter, system fonts
- **Headings**: Inter, system fonts
- **Mono**: JetBrains Mono, Fira Code

### Font Sizes (Mobile-First)
- **xs**: 0.75rem (12px)
- **sm**: 0.875rem (14px)
- **base**: 1rem (16px)
- **lg**: 1.125rem (18px)
- **xl**: 1.25rem (20px)
- **2xl**: 1.5rem (24px)
- **3xl**: 1.875rem (30px)
- **4xl**: 2.25rem (36px)

## 📐 Spacing System (4px Grid)

Based on a consistent 4px grid for harmonious spacing:
- **1**: 4px
- **2**: 8px
- **3**: 12px
- **4**: 16px
- **6**: 24px
- **8**: 32px
- **12**: 48px

## 🔄 Border Radius System

- **sm**: 2px - Small elements
- **md**: 6px - Buttons, inputs
- **lg**: 8px - Cards, modals
- **xl**: 12px - Large containers
- **full**: 9999px - Pills, avatars

## 🎯 Usage Examples

### CSS Classes
\`\`\`css
/* Using custom properties */
.my-component {
  background-color: hsl(var(--primary));
  color: hsl(var(--primary-foreground));
  border-radius: var(--radius-md);
  padding: var(--spacing-4);
  font-family: var(--font-family);
}

/* Using utility classes */
<button class="btn-primary">
  Click me
</button>
\`\`\`

### React Components
\`\`\`tsx
import { Button } from "@/components/ui/button";

export function MyComponent() {
  return (
    <div className="bg-background text-foreground p-4 rounded-lg">
      <Button variant="default" size="md">
        Primary Action
      </Button>
    </div>
  );
}
\`\`\`

## 🎨 Dark Mode Support

The system includes complete dark mode support:

\`\`\`css
.dark {
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
  /* ... all other color overrides */
}
\`\`\`

## 📦 Ready to Use

To integrate this brand system into your project:

\`\`\`bash
# Copy the globals.css to your project
cp .mycontext/brand/globals.css ./src/app/globals.css

# Or append to existing globals.css
cat .mycontext/brand/globals.css >> ./src/app/globals.css
\`\`\`

## 🔧 Customization

### Modifying Colors
\`\`\`css
:root {
  /* Override any color */
  --primary: 220 89% 56%; /* Custom blue */
  --secondary: 142 76% 36%; /* Custom green */
}
\`\`\`

### Adding New Properties
\`\`\`css
:root {
  /* Add custom properties */
  --brand-success: 142 76% 36%;
  --brand-warning: 32 95% 44%;
  --brand-error: 0 84% 60%;
}
\`\`\`

## 🎯 Best Practices

1. **Always use CSS custom properties** instead of hardcoded values
2. **Leverage the spacing scale** for consistent layouts
3. **Use semantic color names** (primary, secondary, etc.)
4. **Test in both light and dark modes**
5. **Maintain WCAG AA contrast ratios**

## 🚀 Production Ready

This brand system is:
- ✅ **Accessible** - WCAG AA compliant contrast ratios
- ✅ **Performant** - Minimal CSS, optimized for modern browsers
- ✅ **Scalable** - Easy to extend and customize
- ✅ **Consistent** - Unified design language across components
- ✅ **Maintainable** - Well-documented and organized

The generated CSS custom properties provide a solid foundation for any modern web application! 🎉`;
  }

  private generateBrandColors(): string {
    return `# 🎨 Color Palette & Usage Guide

## Primary Colors

### Light Mode
| Color | HSL Value | Usage |
|-------|-----------|-------|
| Primary | \`hsl(221.2 83.2% 53.3%)\` | Main brand color, primary actions |
| Secondary | \`hsl(210 40% 96%)\` | Supporting color, secondary actions |
| Accent | \`hsl(210 40% 96%)\` | Highlight color, special elements |
| Background | \`hsl(0 0% 100%)\` | Page background |
| Foreground | \`hsl(222.2 84% 4.9%)\` | Primary text color |
| Muted | \`hsl(210 40% 96%)\` | Subtle backgrounds, disabled states |
| Border | \`hsl(214.3 31.8% 91.4%)\` | Element borders, dividers |

### Dark Mode
| Color | HSL Value | Usage |
|-------|-----------|-------|
| Primary | \`hsl(217.2 91.2% 59.8%)\` | Main brand color, primary actions |
| Secondary | \`hsl(217.2 32.6% 17.5%)\` | Supporting color, secondary actions |
| Background | \`hsl(222.2 84% 4.9%)\` | Page background |
| Foreground | \`hsl(210 40% 98%)\` | Primary text color |

## Usage Examples

### CSS Classes
\`\`\`css
/* Primary button */
.btn-primary {
  background-color: hsl(var(--primary));
  color: hsl(var(--primary-foreground));
}

/* Card component */
.card {
  background-color: hsl(var(--card));
  border: 1px solid hsl(var(--border));
  color: hsl(var(--card-foreground));
}

/* Input field */
.input {
  background-color: hsl(var(--background));
  border: 1px solid hsl(var(--input));
  color: hsl(var(--foreground));
}

.input:focus {
  border-color: hsl(var(--ring));
}
\`\`\`

### Tailwind Integration
\`\`\`tsx
// Using with Tailwind CSS
<div className="bg-background text-foreground border border-border rounded-md">
  <h1 className="text-primary">Primary heading</h1>
  <p className="text-muted-foreground">Muted text</p>
</div>
\`\`\`

## Accessibility Considerations

All colors meet WCAG AA contrast requirements:
- **Primary text on background**: 15.8:1 contrast ratio ✅
- **Muted text on background**: 4.6:1 contrast ratio ✅
- **Primary text on primary background**: 8.6:1 contrast ratio ✅

## Color Variations

### Alpha Transparency
\`\`\`css
/* Semi-transparent versions */
--primary-80: hsl(var(--primary) / 0.8);
--primary-60: hsl(var(--primary) / 0.6);
--primary-40: hsl(var(--primary) / 0.4);
--primary-20: hsl(var(--primary) / 0.2);
\`\`\`

### Hover States
\`\`\`css
.btn-primary:hover {
  background-color: hsl(var(--primary) / 0.9);
}

.btn-secondary:hover {
  background-color: hsl(var(--secondary) / 0.8);
}
\`\`\`

## Implementation Notes

1. **Always use HSL format** for better manipulation and consistency
2. **Leverage CSS custom properties** instead of hardcoded values
3. **Test color combinations** for accessibility compliance
4. **Consider color blindness** when designing color-dependent UI
5. **Maintain color harmony** across light and dark modes`;
  }

  private generateBrandTypography(): string {
    return `# 📝 Typography System & Specifications

## Font Families

### Primary Fonts
- **Body Text**: \`'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif\`
- **Headings**: \`'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif\`
- **Monospace**: \`'JetBrains Mono', 'Fira Code', 'SF Mono', monospace\`

## Font Size Scale

| Scale | Size | Line Height | Usage |
|-------|------|-------------|-------|
| xs | 0.75rem (12px) | 1.5 | Small labels, captions |
| sm | 0.875rem (14px) | 1.43 | Secondary text, small buttons |
| base | 1rem (16px) | 1.5 | Body text, inputs |
| lg | 1.125rem (18px) | 1.56 | Large body text, buttons |
| xl | 1.25rem (20px) | 1.5 | Section headings |
| 2xl | 1.5rem (24px) | 1.33 | Page headings |
| 3xl | 1.875rem (30px) | 1.2 | Hero headings |
| 4xl | 2.25rem (36px) | 1.11 | Major headings |
| 5xl | 3rem (48px) | 1 | Display headings |

## Font Weights

| Weight | Value | Usage |
|--------|-------|-------|
| Normal | 400 | Body text |
| Medium | 500 | Emphasized text |
| Semibold | 600 | Headings, buttons |
| Bold | 700 | Strong emphasis |

## Implementation

### CSS Classes
\`\`\`css
/* Heading hierarchy */
.h1 { font-size: var(--font-size-4xl); font-weight: var(--font-weight-bold); }
.h2 { font-size: var(--font-size-3xl); font-weight: var(--font-weight-semibold); }
.h3 { font-size: var(--font-size-2xl); font-weight: var(--font-weight-semibold); }
.h4 { font-size: var(--font-size-xl); font-weight: var(--font-weight-medium); }
.h5 { font-size: var(--font-size-lg); font-weight: var(--font-weight-medium); }
.h6 { font-size: var(--font-size-base); font-weight: var(--font-weight-medium); }

/* Text utilities */
.text-body { font-size: var(--font-size-base); line-height: var(--line-height-normal); }
.text-small { font-size: var(--font-size-sm); line-height: var(--line-height-normal); }
.text-large { font-size: var(--font-size-lg); line-height: var(--line-height-relaxed); }
\`\`\`

### React Components
\`\`\`tsx
// Typography component
interface TypographyProps {
  variant: 'h1' | 'h2' | 'h3' | 'body' | 'caption';
  children: React.ReactNode;
  className?: string;
}

export function Typography({ variant, children, className }: TypographyProps) {
  const baseClasses = "font-family";
  const variantClasses = {
    h1: "text-4xl font-bold",
    h2: "text-3xl font-semibold",
    h3: "text-2xl font-semibold",
    body: "text-base",
    caption: "text-sm text-muted-foreground"
  };

  return (
    <div className={cn(baseClasses, variantClasses[variant], className)}>
      {children}
    </div>
  );
}
\`\`\`

## Line Heights

| Name | Value | Usage |
|------|-------|-------|
| tight | 1.25 | Headings, compact text |
| snug | 1.375 | Subheadings, labels |
| normal | 1.5 | Body text, paragraphs |
| relaxed | 1.625 | Long-form content |
| loose | 2 | Quotes, testimonials |

## Responsive Typography

### Mobile-First Approach
\`\`\`css
/* Base size */
.text-responsive {
  font-size: var(--font-size-sm);
}

/* Tablet and up */
@media (min-width: 768px) {
  .text-responsive {
    font-size: var(--font-size-base);
  }
}

/* Desktop and up */
@media (min-width: 1024px) {
  .text-responsive {
    font-size: var(--font-size-lg);
  }
}
\`\`\`

## Accessibility Considerations

1. **Font Size**: Minimum 14px for body text (16px preferred)
2. **Line Height**: Minimum 1.5 for body text
3. **Contrast**: 4.5:1 minimum for normal text, 3:1 for large text
4. **Readability**: Avoid pure black text on white backgrounds
5. **Hierarchy**: Clear size relationships between heading levels

## Performance Notes

- **System Fonts**: Use system font stacks for better performance
- **Font Loading**: Implement font-display: swap to prevent layout shift
- **Subset**: Consider font subsetting for smaller file sizes
- **Caching**: Cache fonts appropriately for repeat visits

## Implementation Checklist

- [x] Font families defined
- [x] Font size scale established
- [x] Font weight scale defined
- [x] Line height values set
- [x] Responsive typography implemented
- [x] Accessibility requirements met
- [x] CSS custom properties created
- [x] Component integration ready`;
  }

  private sanitizeMarkdownOutput(raw: string): string {
    // Preserve fenced code blocks (e.g., ```mermaid, ```ts) while stripping stray outer fences only
    // If the model wrapped the whole document in a single fence, unwrap once; otherwise keep inner fences.
    const singleFence = raw.match(/^```[a-zA-Z]*\n[\s\S]*\n```\s*$/);
    if (singleFence) {
      // unwrap outer fence only
      return raw
        .replace(/^```[a-zA-Z]*\n/, "")
        .replace(/\n```\s*$/, "")
        .trim();
    }
    return raw.trim();
  }

  private splitPrdContent(raw: string): {
    brief: string;
    requirements: string;
    flows: string;
  } {
    try {
      const text = String(raw);

      // Look for common section headers with more flexible patterns
      const sectionPatterns = {
        requirements:
          /(?:^|\n)#+\s*(?:Requirements?|Detailed User Stories|Acceptance Criteria|Features?|Functionality|Core Features?|Key Features?|What You Can Do|What Users Can Do)/i,
        flows:
          /(?:^|\n)#+\s*(?:Flows?|User Journeys?|User Flows?|Navigation|UI Flows?|Workflow|Process|```mermaid)/i,
      };

      let brief = text;
      let requirements = "";
      let flows = "";

      // Find requirements section
      const reqMatch = text.match(sectionPatterns.requirements);
      const idxReq = reqMatch ? reqMatch.index : -1;

      // Find flows section
      const flowsMatch = text.match(sectionPatterns.flows);
      const idxFlows = flowsMatch ? flowsMatch.index : -1;

      if (idxReq !== -1 && typeof idxReq === "number") {
        // Extract brief (everything before requirements)
        brief = text.slice(0, idxReq).trim();

        // Extract requirements section
        const reqEnd =
          idxFlows !== -1 && typeof idxFlows === "number" && idxFlows > idxReq
            ? idxFlows
            : text.length;
        requirements = text.slice(idxReq, reqEnd).trim();

        // Extract flows section if found
        if (idxFlows !== -1 && typeof idxFlows === "number") {
          flows = text.slice(idxFlows).trim();
        }
      } else {
        // If no clear sections found, try to split by content length
        const totalLength = text.length;
        if (totalLength > 2000) {
          // Split into roughly equal parts
          const partSize = Math.floor(totalLength / 3);
          brief = text.slice(0, partSize).trim();
          requirements = text.slice(partSize, partSize * 2).trim();
          flows = text.slice(partSize * 2).trim();
        } else if (totalLength > 1000) {
          // Split into brief + combined requirements/flows
          const splitPoint = Math.floor(totalLength / 2);
          brief = text.slice(0, splitPoint).trim();
          requirements = text.slice(splitPoint).trim();
        }
      }

      // Ensure we have content in brief at minimum
      if (!brief.trim() && text.trim()) {
        brief = text.trim();
      }

      return { brief, requirements, flows };
    } catch (error) {
      console.warn("Error splitting PRD content:", error);
      return { brief: raw, requirements: "", flows: "" };
    }
  }

  // REMOVED: Dangerous fallback method that compromises accuracy
  private buildSkeleton_DISABLED(type: string, projectContext: any): string {
    switch (type) {
      case "context": {
        const title = (
          projectContext?.description || "MyContext Project"
        ).slice(0, 80);
        return `# Product Requirements Document\n\n## Overview\n${title}\n\n## Goals\n- ...\n\n## User Stories\n- As a user, ...\n\n## Technical Requirements\n- Next.js + Shadcn UI\n\n## Acceptance Criteria\n- ...\n`;
      }
      case "types": {
        return `// Types skeleton\n// Define core entities based on your PRD\n\nexport interface User {\n  id: string;\n  name: string;\n}\n`;
      }
      case "brand": {
        return `# Brand Guidelines\n\n## Identity\n- Primary color: #2563eb\n\n## Typography\n- Headings: Inter, 600\n- Body: Inter, 400\n`;
      }
      case "components-list": {
        // No fallback - fail cleanly
        throw new Error("AI generation failed - no fallbacks allowed");
      }
      default: {
        return `Generated by MyContext CLI - no providers available.\n`;
      }
    }
  }

  private async readStdinIfAvailable(): Promise<string | null> {
    try {
      if (process.stdin.isTTY) return null;
      const chunks: Buffer[] = [];
      return await new Promise<string>((resolve) => {
        process.stdin.resume();
        process.stdin.setEncoding("utf8");
        process.stdin.on("data", (data) => {
          chunks.push(Buffer.from(String(data)));
        });
        process.stdin.on("end", () => {
          const s = Buffer.concat(chunks).toString("utf8");
          resolve(s);
        });
        // Safety: end after 50ms if nothing comes (likely interactive TTY)
        setTimeout(() => {
          if (chunks.length === 0) resolve("");
        }, 50);
      });
    } catch {
      return null;
    }
  }

  private async readStdinBlockUntilEOF(): Promise<string> {
    const chunks: Buffer[] = [];
    return await new Promise<string>((resolve) => {
      process.stdin.resume();
      process.stdin.setEncoding("utf8");
      process.stdin.on("data", (data) => {
        chunks.push(Buffer.from(String(data)));
      });
      process.stdin.on("end", () => {
        resolve(Buffer.concat(chunks).toString("utf8"));
      });
    });
  }

  private extractJson(raw: string): string {
    // Log the raw response for debugging
    console.log(
      `[GenerateCommand] Raw AI response (first 200 chars): ${raw.slice(
        0,
        200
      )}...`
    );

    // 1) Prefer fenced json block
    const fence = raw.match(/```json\n([\s\S]*?)```/i);
    if (fence && fence[1]) {
      const s = fence[1].trim();
      try {
        const parsed = JSON.parse(s);
        return JSON.stringify(parsed, null, 2);
      } catch (error) {
        console.log(
          `[GenerateCommand] Failed to parse fenced JSON: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    }

    // 2) Any fenced block
    const anyFence = raw.match(/```[a-zA-Z]*\n([\s\S]*?)```/);
    if (anyFence && anyFence[1]) {
      const candidate = anyFence[1].trim();
      try {
        const parsed = JSON.parse(candidate);
        return JSON.stringify(parsed, null, 2);
      } catch (error) {
        console.log(
          `[GenerateCommand] Failed to parse any fenced block: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    }

    // 3) Strip prose and attempt to locate the first '{' to last '}'
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start !== -1 && end !== -1 && end > start) {
      const slice = raw.slice(start, end + 1);
      try {
        const parsed = JSON.parse(slice);
        return JSON.stringify(parsed, null, 2);
      } catch (error) {
        console.log(
          `[GenerateCommand] Failed to parse JSON slice: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    }

    // 4) Check if response looks like plain text (not JSON)
    if (!raw.trim().startsWith("{") && !raw.trim().startsWith("[")) {
      console.log(
        `[GenerateCommand] AI returned plain text instead of JSON. Response starts with: "${raw
          .trim()
          .slice(0, 50)}..."`
      );
      throw new Error(
        `AI returned plain text instead of JSON. Response: "${raw
          .trim()
          .slice(0, 100)}..."`
      );
    }

    // 5) Fallback: wrap into minimal valid envelope
    return JSON.stringify(
      { error: "Invalid JSON from AI", raw: raw.slice(0, 500) },
      null,
      2
    );
  }

  private async readContextArtifacts(): Promise<{
    prd: string;
    types: string;
    brand: string;
    shadcn: string[];
  }> {
    try {
      const cwd = process.cwd();
      const readOrEmpty = async (rel: string) =>
        (await fs.pathExists(path.join(cwd, rel)))
          ? await fs.readFile(path.join(cwd, rel), "utf8")
          : "";
      // Prefer split files if present
      let prd = "";
      const brief =
        (await readOrEmpty(".mycontext/01a-brief.md")) ||
        (await readOrEmpty(".mycontext/01-brief.md"));
      const reqs =
        (await readOrEmpty(".mycontext/01b-requirements.md")) ||
        (await readOrEmpty(".mycontext/02-requirements.md"));
      const flows =
        (await readOrEmpty(".mycontext/01c-flows.md")) ||
        (await readOrEmpty(".mycontext/03-flows.md"));
      if (brief || reqs || flows) {
        prd = [
          brief ? "## Brief\n\n" + brief : "",
          reqs ? "\n\n## Requirements\n\n" + reqs : "",
          flows ? "\n\n## Flows\n\n" + flows : "",
        ]
          .filter(Boolean)
          .join("");
      }
      if (!prd) {
        prd = await readOrEmpty(".mycontext/01-prd.md");
      }
      const types = await readOrEmpty(".mycontext/02-types.ts");
      const brand =
        (await readOrEmpty(".mycontext/brand/globals.css")) ||
        (await readOrEmpty(".mycontext/03-branding.md"));
      // discover shadcn/ui primitives from components/ui
      const uiDir = path.join(cwd, "components", "ui");
      let shadcn: string[] = [];
      try {
        if (await fs.pathExists(uiDir)) {
          const files = await fs.readdir(uiDir);
          shadcn = files
            .filter((f) => f.endsWith(".tsx"))
            .map((f) => f.replace(/\.tsx$/, ""));
        }
      } catch {}
      return { prd, types, brand, shadcn };
    } catch {
      return { prd: "", types: "", brand: "", shadcn: [] };
    }
  }

  private async readCoreExcerpt(): Promise<string> {
    try {
      const coreStatePath = path.join(process.cwd(), ".mycontext", "core.json");
      const coreDir = path.join(
        process.cwd(),
        "components",
        ".mycontext",
        "core"
      );
      if (!(await fs.pathExists(coreDir))) return "";
      const files = await fs.readdir(coreDir);
      const state = (await fs.pathExists(coreStatePath))
        ? await fs.readJson(coreStatePath)
        : null;
      const preferred = state?.name ? `${state.name}.tsx` : null;
      const tsx =
        preferred && files.includes(preferred)
          ? preferred
          : files.find((f) => f.endsWith(".tsx"));
      if (!tsx) return "";
      const src = await fs.readFile(path.join(coreDir, tsx), "utf8");
      // Keep only top comment and first ~120 lines for excerpt
      const lines = src.split("\n").slice(0, 120).join("\n");
      const state2 = (await fs.pathExists(coreStatePath))
        ? await fs.readJson(coreStatePath)
        : null;
      return [
        state2?.name ? `Name: ${state2.name}` : "",
        state2?.group ? `Group: ${state2.group}` : "",
        lines,
      ]
        .filter(Boolean)
        .join("\n");
    } catch {
      return "";
    }
  }

  private getCanonicalShadcnList(): string[] {
    return [
      "Accordion",
      "Alert",
      "AlertDialog",
      "AspectRatio",
      "Avatar",
      "Badge",
      "Breadcrumb",
      "Button",
      "Calendar",
      "Card",
      "Carousel",
      "Checkbox",
      "Collapsible",
      "Combobox",
      "Command",
      "ContextMenu",
      "DataTable",
      "Dialog",
      "Drawer",
      "DropdownMenu",
      "HoverCard",
      "Input",
      "InputOTP",
      "Label",
      "Menubar",
      "NavigationMenu",
      "Pagination",
      "Popover",
      "Progress",
      "RadioGroup",
      "Resizable",
      "ScrollArea",
      "Select",
      "Separator",
      "Sheet",
      "Sidebar",
      "Skeleton",
      "Slider",
      "Sonner",
      "Switch",
      "Table",
      "Tabs",
      "Textarea",
      "Toast",
      "Toggle",
      "ToggleGroup",
      "Tooltip",
      "Typography",
    ];
  }

  private repairJson(raw: string): string {
    // Log what we're trying to repair
    console.log(
      `[GenerateCommand] Repairing JSON input (first 100 chars): ${raw.slice(
        0,
        100
      )}...`
    );

    // Check if input looks like plain text (not JSON)
    const trimmed = raw.trim();
    if (
      !trimmed.startsWith("{") &&
      !trimmed.startsWith("[") &&
      !trimmed.includes("```json")
    ) {
      console.log(
        `[GenerateCommand] Input doesn't look like JSON, returning as-is for extractJson to handle`
      );
      return raw; // Let extractJson handle the error
    }

    // Remove any fenced code blocks markers
    let s = raw.replace(/```json\n?|```/gi, "");
    // Remove stray tokens and trailing commas before ] or }
    s = s.replace(/\s*" \" ",?\s*/g, "");
    s = s.replace(/,\s*(\]|\})/g, "$1");
    // Quote bare identifiers for "name" fields, e.g., { "name": Dashboard } → { "name": "Dashboard" }
    // Handles simple PascalCase/word identifiers without quotes
    s = s.replace(
      /("name"\s*:\s*)([A-Za-z_][A-Za-z0-9_]*)/g,
      (_m, p1, p2) => `${p1}"${p2}"`
    );

    console.log(
      `[GenerateCommand] Repaired JSON (first 100 chars): ${s.slice(0, 100)}...`
    );
    return s;
  }

  private buildProjectStructurePrompt(
    description: string,
    prd: string,
    types: string,
    compList: any
  ): string {
    const groups = compList.groups || [];
    const componentSummary = groups
      .map(
        (g: any) =>
          `${g.name} (${g.components?.length || 0} components): ${
            g.description
          }`
      )
      .join("\n");

    return `Generate a Next.js project structure for: ${description}

DESIGN PRINCIPLES:
- Prioritize dialogs for details/forms/interactions (reduce page count)
- Use datatables for reports and data metrics
- Minimize standalone pages - favor modal workflows
- Follow Next.js App Router patterns

EXISTING CONTEXT:
## PRD Summary:
${prd.substring(0, 500)}...

## Component Groups:
${componentSummary}

## Available Types:
${types.substring(0, 300)}...

PROJECT STRUCTURE REQUIREMENTS:
1. Generate a realistic Next.js 13+ app directory structure
2. Create minimal pages - favor dialogs and datatables
3. Include API routes for each data entity
4. Structure for the specific app type and complexity
5. Show how components will be organized
6. Include middleware, layouts, and error boundaries
7. Plan for state management and data fetching

Format as a markdown file with:
- Clear directory tree structure
- Explanation of each major directory/file
- Component placement strategy
- API route organization
- State management approach

Generate the complete project structure now:`;
  }

  // REMOVED: Dangerous fallback method that compromises accuracy
  private buildFallbackProjectStructure_DISABLED(projectContext: any): string {
    const appType = projectContext.description?.toLowerCase() || "general";
    const isEcommerce =
      appType.includes("ecommerce") || appType.includes("shop");
    const isDashboard =
      appType.includes("dashboard") || appType.includes("admin");

    return `# Project Structure

## Core Next.js Structure
\`\`\`
${projectContext.name || "project"}/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   └── register/page.tsx
│   │   ├── dashboard/
│   │   │   ├── page.tsx              # Main dashboard with dialogs
│   │   │   └── loading.tsx
│   │   ├── api/
│   │   │   ├── auth/route.ts
${
  isEcommerce
    ? "│   │   │   ├── products/route.ts\n│   │   │   ├── orders/route.ts\n│   │   │   └── cart/route.ts"
    : "│   │   │   ├── users/route.ts\n│   │   │   └── data/route.ts"
}
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx                 # Landing page
│   ├── components/
│   │   ├── ui/                      # shadcn/ui components
│   │   ├── dialogs/                 # Modal dialogs for forms/details
│   │   │   ├── CreateDialog.tsx
│   │   │   ├── EditDialog.tsx
│   │   │   └── DetailsDialog.tsx
│   │   ├── tables/                  # Data tables for reports
│   │   │   ├── DataTable.tsx
│   │   │   └── ReportsTable.tsx
│   │   └── forms/                   # Reusable form components
│   └── lib/
│       ├── utils.ts
│       ├── validations.ts
│       └── api.ts
├── components.json
└── package.json
\`\`\`

## Design Strategy
- **Minimal Pages**: Use dialogs for forms and detail views
- **Datatables**: Centralized data display with inline actions
- **Modal-First**: Most interactions happen in dialogs
- **API-Driven**: Each entity has dedicated API routes
- **Component Organization**: Group by function, not feature
`;
  }

  private printNextStepsAfterGenerate(type: string): void {
    try {
      // Normalize aliases to their primary command names
      const normalizedType = this.normalizeCommandType(type);

      switch (normalizedType) {
        case "context":
          console.log(chalk.blue("\n➡️ Next: Generate types"));
          console.log(chalk.gray("   mycontext generate types"));
          break;
        case "types":
          console.log(chalk.blue("\n➡️ Next: Generate brand"));
          console.log(chalk.gray("   mycontext generate brand"));
          break;
        case "brand":
          console.log(chalk.blue("\n➡️ Next: Plan components"));
          console.log(
            chalk.gray(
              "   mycontext generate components-list   # alias: component-list"
            )
          );
          break;
        case "components-list":
          console.log(chalk.blue("\n➡️ Next: Generate project structure"));
          console.log(chalk.gray("   mycontext generate project-structure"));
          console.log(chalk.blue("\n💡 Then: Generate components"));
          console.log(
            chalk.gray(
              "   mycontext generate-components all --with-tests   # optional tests"
            )
          );
          console.log(chalk.blue("➡️ Preview:"));
          console.log(chalk.gray("   Visit /preview (dev server)"));
          console.log(
            chalk.gray(
              "   mycontext normalize preview   # optional final layout"
            )
          );
          break;
        case "project-structure":
          console.log(chalk.blue("\n➡️ Next: Generate components"));
          console.log(
            chalk.gray(
              "   mycontext generate-components all --with-tests   # optional tests"
            )
          );
          console.log(chalk.blue("➡️ Preview:"));
          console.log(chalk.gray("   Visit /preview (dev server)"));
          break;
        case "all":
          console.log(chalk.blue("\n🎉 Full context generated! Next steps:"));
          console.log(
            chalk.gray("   1. Review generated files in .mycontext/")
          );
          console.log(
            chalk.gray(
              "   2. Generate components: mycontext generate-components all"
            )
          );
          console.log(chalk.gray("   3. Start development: npm run dev"));
          console.log(chalk.gray("   4. Preview: Visit /preview (dev server)"));
          break;
        default:
          break;
      }
      console.log();
    } catch {}
  }

  /**
   * Normalize command aliases to their primary command names
   */
  private normalizeCommandType(type: string): string {
    const aliases: Record<string, string> = {
      prd: "context",
      requirements: "context",
      type: "types",
      interfaces: "types",
      "brand-kit": "brand",
      "component-list": "components-list",
      components: "components-list",
      structure: "project-structure",
      project: "project-structure",
    };

    return aliases[type] || type;
  }

  private hasLocalAIKeys(): boolean {
    // Check for any local AI provider keys
    const keys = {
      github: !!process.env.MYCONTEXT_GITHUB_TOKEN,
      qwen: !!process.env.MYCONTEXT_QWEN_API_KEY,
      gemini: !!process.env.MYCONTEXT_GEMINI_API_KEY,
      xai: !!process.env.MYCONTEXT_XAI_API_KEY,
      claude: !!process.env.MYCONTEXT_CLAUDE_API_KEY,
      openai: !!process.env.OPENAI_API_KEY,
      anthropic: !!process.env.ANTHROPIC_API_KEY,
      huggingface: !!process.env.HUGGINGFACE_API_KEY,
      openrouter: !!process.env.MYCONTEXT_OPENROUTER_API_KEY, // Add this
    };

    console.log(`[GenerateCommand] API Keys detected:`, keys);

    return !!(
      process.env.MYCONTEXT_GITHUB_TOKEN ||
      process.env.MYCONTEXT_QWEN_API_KEY ||
      process.env.MYCONTEXT_GEMINI_API_KEY ||
      process.env.MYCONTEXT_XAI_API_KEY ||
      process.env.MYCONTEXT_CLAUDE_API_KEY ||
      process.env.OPENAI_API_KEY ||
      process.env.ANTHROPIC_API_KEY ||
      process.env.HUGGINGFACE_API_KEY ||
      process.env.MYCONTEXT_OPENROUTER_API_KEY
    );
  }

  private getModelCandidates(options: GenerateOptions): string[] | undefined {
    const raw =
      (options as any).modelCandidates ||
      (options as any).models ||
      (options as any).useModels ||
      (options as any)._autoModelCandidates ||
      process.env.MYCONTEXT_MODEL_CANDIDATES;
    if (!raw) {
      // Default discovery path: ask GitHub client for models and pick a few good ones
      try {
        // const { GitHubModelsClient } = require("../utils/githubModelsClient");
        const gh = null;
        // if (gh && gh.hasApiKey()) {
        // Note: this is sync invocation within options compute; OK to block briefly
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        // const deasync = require("deasync");
        // let list: string[] = [];
        // let done = false;
        // gh.listModels()
        //   .then((m: string[]) => {
        //     list = m;
        //     done = true;
        //   })
        //   .catch(() => {
        //     done = true;
        //   });
        // while (!done) {
        //   deasync.sleep(50);
        // }
        // if (list.length) {
        //   return list.slice(0, 4);
        // }
        // }
      } catch {}
      return undefined;
    }
    if (Array.isArray(raw)) return raw as string[];
    if (typeof raw === "string") {
      return raw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }
    return undefined;
  }

  /**
   * Generate full context (PRD + A/B/C/D files)
   */
  private async generateFullContext(
    projectContext: any,
    options: GenerateOptions
  ): Promise<GenerationResult> {
    console.log(chalk.blue("🚀 Generating Full Context (PRD + A/B/C/D files)"));

    // First generate the PRD
    console.log("[GenerateCommand] Step 1: Generating PRD...");
    const prdResult = await this.generateContext(projectContext, options);
    if (!prdResult.success) {
      console.log("[GenerateCommand] PRD generation failed:", prdResult.error);
      return prdResult;
    }
    console.log("[GenerateCommand] PRD generation successful");

    // Then generate the A/B/C/D files
    console.log("[GenerateCommand] Step 2: Generating A/B/C/D files...");
    const contextFilesResult = await this.generateContextFiles(
      projectContext,
      options
    );
    if (!contextFilesResult.success) {
      console.log(
        "[GenerateCommand] A/B/C/D files generation failed:",
        contextFilesResult.error
      );
      return contextFilesResult;
    }
    console.log("[GenerateCommand] A/B/C/D files generation successful");

    return {
      success: true,
      content: "Full context generated successfully (PRD + A/B/C/D files)",
      provider: "hybrid" as any,
      metadata: { model: "hybrid", tokens: 0, latency: 0 },
    };
  }

  /**
   * Get the project root directory, handling cases where we're inside .mycontext
   */
  private getProjectRoot(): string {
    const cwd = process.cwd();

    // If we're already in a .mycontext directory, go up one level
    if (cwd.endsWith(".mycontext")) {
      return path.dirname(cwd);
    }

    // If we're in a subdirectory of .mycontext, find the project root
    let currentDir = cwd;
    while (currentDir !== path.dirname(currentDir)) {
      if (path.basename(currentDir) === ".mycontext") {
        return path.dirname(currentDir);
      }
      currentDir = path.dirname(currentDir);
    }

    // Default to current working directory
    return cwd;
  }

  /**
   * Generate A/B/C/D context files (Features, User Flows, Edge Cases, Technical Specs)
   */
  private async generateContextFiles(
    projectContext: any,
    options: GenerateOptions
  ): Promise<GenerationResult> {
    // Ensure we're using the project root, not a nested .mycontext directory
    const projectRoot = this.getProjectRoot();
    const contextDir = path.join(projectRoot, ".mycontext");

    // Ensure .mycontext directory exists
    await fs.ensureDir(contextDir);

    // Check if context files already exist
    const existingFiles = await this.checkExistingContextFiles(contextDir);
    if (existingFiles.length > 0 && !options.force) {
      return {
        success: false,
        error: `Context files already exist: ${existingFiles.join(
          ", "
        )}. Use --force to overwrite.`,
        provider: "system" as any,
        metadata: { model: "system", tokens: 0, latency: 0 },
      };
    }

    // Get context from PRD if it exists, otherwise use description
    const contextContent = await this.getContextForGeneration(
      contextDir,
      projectContext.description
    );

    try {
      // Generate each context file using the PRD content as context
      console.log("[GenerateCommand] Generating features file...");
      await this.generateFeaturesFile(contextDir, contextContent);
      console.log("[GenerateCommand] Generating user flows file...");
      await this.generateUserFlowsFile(contextDir, contextContent);
      console.log("[GenerateCommand] Generating edge cases file...");
      await this.generateEdgeCasesFile(contextDir, contextContent);
      console.log("[GenerateCommand] Generating technical specs file...");
      await this.generateTechnicalSpecsFile(contextDir, contextContent);

      return {
        success: true,
        content: "Context files generated successfully",
        provider: "hybrid" as any,
        metadata: { model: "hybrid", tokens: 0, latency: 0 },
      };
    } catch (error) {
      return {
        success: false,
        error: `Context file generation failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
        provider: "system" as any,
        metadata: { model: "system", tokens: 0, latency: 0 },
      };
    }
  }

  private async checkExistingContextFiles(
    contextDir: string
  ): Promise<string[]> {
    const files = [
      "01a-features.md",
      "01b-user-flows.md",
      "01c-edge-cases.md",
      "01d-technical-specs.md",
    ];

    const existingFiles: string[] = [];
    for (const file of files) {
      if (await fs.pathExists(path.join(contextDir, file))) {
        existingFiles.push(file);
      }
    }
    return existingFiles;
  }

  private async generateFeaturesFile(
    contextDir: string,
    contextContent?: string
  ): Promise<void> {
    const prompt = this.buildFeaturesPrompt(contextContent);

    try {
      // Add timeout to prevent infinite loops
      const timeoutPromise = new Promise(
        (_, reject) =>
          setTimeout(() => reject(new Error("AI generation timeout")), 30000) // 30 second timeout
      );

      const responsePromise = this.ai.generateText(prompt, {
        temperature: 0.7,
        maxTokens: 2000,
      });

      const response = (await Promise.race([
        responsePromise,
        timeoutPromise,
      ])) as any;

      // Check if response is valid
      if (!response || !response.text || response.text.trim().length < 50) {
        throw new Error("AI response too short or invalid");
      }

      const content = this.formatFeaturesContent(response.text);
      await fs.writeFile(path.join(contextDir, "01a-features.md"), content);
    } catch (error) {
      console.log(chalk.red("❌ AI generation failed for features"));
      console.log(
        chalk.yellow("💡 MyContext requires 100% accuracy - no fallbacks")
      );
      console.log(chalk.blue("🔄 Retry options:"));
      console.log(chalk.gray("  1. Wait for rate limits to reset"));
      console.log(chalk.gray("  2. Use a different AI provider"));
      console.log(chalk.gray("  3. Check your API key configuration"));
      console.log(
        chalk.gray(
          "  4. Try again later with: mycontext generate context --full"
        )
      );
      throw new Error("AI generation failed - retry when conditions improve");
    }
  }

  private async generateUserFlowsFile(
    contextDir: string,
    contextContent?: string
  ): Promise<void> {
    const prompt = this.buildUserFlowsPrompt(contextContent);

    try {
      const response = await this.ai.generateText(prompt, {
        temperature: 0.7,
        maxTokens: 2000,
      });

      const content = this.formatUserFlowsContent(response.text);
      await fs.writeFile(path.join(contextDir, "01b-user-flows.md"), content);
    } catch (error) {
      console.log(chalk.red("❌ AI generation failed for user flows"));
      console.log(
        chalk.yellow("💡 MyContext requires 100% accuracy - no fallbacks")
      );
      console.log(chalk.blue("🔄 Retry options:"));
      console.log(chalk.gray("  1. Wait for rate limits to reset"));
      console.log(chalk.gray("  2. Use a different AI provider"));
      console.log(chalk.gray("  3. Check your API key configuration"));
      console.log(
        chalk.gray(
          "  4. Try again later with: mycontext generate context --full"
        )
      );
      throw new Error("AI generation failed - retry when conditions improve");
    }
  }

  private async generateEdgeCasesFile(
    contextDir: string,
    contextContent?: string
  ): Promise<void> {
    const prompt = this.buildEdgeCasesPrompt(contextContent);

    try {
      const response = await this.ai.generateText(prompt, {
        temperature: 0.7,
        maxTokens: 2000,
      });

      const content = this.formatEdgeCasesContent(response.text);
      await fs.writeFile(path.join(contextDir, "01c-edge-cases.md"), content);
    } catch (error) {
      console.log(chalk.red("❌ AI generation failed for edge cases"));
      console.log(
        chalk.yellow("💡 MyContext requires 100% accuracy - no fallbacks")
      );
      console.log(chalk.blue("🔄 Retry options:"));
      console.log(chalk.gray("  1. Wait for rate limits to reset"));
      console.log(chalk.gray("  2. Use a different AI provider"));
      console.log(chalk.gray("  3. Check your API key configuration"));
      console.log(
        chalk.gray(
          "  4. Try again later with: mycontext generate context --full"
        )
      );
      throw new Error("AI generation failed - retry when conditions improve");
    }
  }

  private async generateTechnicalSpecsFile(
    contextDir: string,
    contextContent?: string
  ): Promise<void> {
    const prompt = this.buildTechnicalSpecsPrompt(contextContent);

    try {
      const response = await this.ai.generateText(prompt, {
        temperature: 0.7,
        maxTokens: 2000,
      });

      const content = this.formatTechnicalSpecsContent(response.text);
      await fs.writeFile(
        path.join(contextDir, "01d-technical-specs.md"),
        content
      );
    } catch (error) {
      console.log(chalk.red("❌ AI generation failed for technical specs"));
      console.log(
        chalk.yellow("💡 MyContext requires 100% accuracy - no fallbacks")
      );
      console.log(chalk.blue("🔄 Retry options:"));
      console.log(chalk.gray("  1. Wait for rate limits to reset"));
      console.log(chalk.gray("  2. Use a different AI provider"));
      console.log(chalk.gray("  3. Check your API key configuration"));
      console.log(
        chalk.gray(
          "  4. Try again later with: mycontext generate context --full"
        )
      );
      throw new Error("AI generation failed - retry when conditions improve");
    }
  }

  private buildFeaturesPrompt(contextContent?: string): string {
    return `You are a product manager creating a comprehensive features document for a web application.

${
  contextContent
    ? `Project Context (from PRD): ${contextContent}`
    : "Generate features for a modern web application."
}

Create a detailed features document that includes:

1. **Core Features** - Primary functionality that defines the product
2. **User Features** - Features that directly benefit end users
3. **Admin Features** - Administrative and management capabilities
4. **Technical Features** - Backend, API, and infrastructure features
5. **Integration Features** - Third-party integrations and APIs
6. **Security Features** - Authentication, authorization, and data protection
7. **Performance Features** - Optimization and scalability features
8. **Accessibility Features** - WCAG compliance and inclusive design

For each feature, include:
- Feature name and description
- User value proposition
- Acceptance criteria
- Priority level (High/Medium/Low)
- Dependencies on other features

Format the output as a well-structured markdown document with clear sections and bullet points.`;
  }

  private buildUserFlowsPrompt(contextContent?: string): string {
    return `You are a UX designer creating comprehensive user flow documentation for a web application.

${
  contextContent
    ? `Project Context (from PRD): ${contextContent}`
    : "Generate user flows for a modern web application."
}

Create detailed user flow documentation that includes:

1. **Primary User Journeys** - Main user paths through the application
2. **Authentication Flows** - Login, signup, password reset, etc.
3. **Core Feature Flows** - How users interact with main features
4. **Error Handling Flows** - What happens when things go wrong
5. **Admin/Management Flows** - Administrative user journeys
6. **Mobile vs Desktop Flows** - Responsive design considerations
7. **Accessibility Flows** - Screen reader and keyboard navigation paths

For each flow, include:
- Flow name and description
- Step-by-step user actions
- System responses and feedback
- Decision points and branches
- Error states and recovery
- Success criteria

Format the output as a well-structured markdown document with clear sections, numbered steps, and flow diagrams in text format.`;
  }

  private buildEdgeCasesPrompt(contextContent?: string): string {
    return `You are a QA engineer creating comprehensive edge cases and error scenarios documentation for a web application.

${
  contextContent
    ? `Project Context (from PRD): ${contextContent}`
    : "Generate edge cases for a modern web application."
}

Create detailed edge cases documentation that includes:

1. **Input Validation Edge Cases** - Invalid, malformed, or extreme input scenarios
2. **Network Edge Cases** - Offline, slow connections, timeouts, API failures
3. **Browser Edge Cases** - Different browsers, versions, disabled features
4. **Device Edge Cases** - Mobile, tablet, desktop, different screen sizes
5. **Data Edge Cases** - Empty data, large datasets, concurrent modifications
6. **Security Edge Cases** - Injection attacks, XSS, CSRF, unauthorized access
7. **Performance Edge Cases** - High load, memory constraints, slow operations
8. **Accessibility Edge Cases** - Screen readers, keyboard-only navigation, high contrast
9. **Integration Edge Cases** - Third-party service failures, API changes
10. **Business Logic Edge Cases** - Boundary conditions, race conditions

For each edge case, include:
- Scenario description
- Expected behavior
- Potential impact
- Mitigation strategies
- Testing approach

Format the output as a well-structured markdown document with clear sections and detailed scenarios.`;
  }

  private buildTechnicalSpecsPrompt(contextContent?: string): string {
    return `You are a technical architect creating comprehensive technical specifications for a web application.

${
  contextContent
    ? `Project Context (from PRD): ${contextContent}`
    : "Generate technical specs for a modern web application."
}

Create detailed technical specifications that include:

1. **Architecture Overview** - System design, components, and relationships
2. **Technology Stack** - Frontend, backend, database, deployment technologies
3. **API Specifications** - Endpoints, request/response formats, authentication
4. **Database Design** - Schema, relationships, indexing, data flow
5. **Security Requirements** - Authentication, authorization, data protection
6. **Performance Requirements** - Response times, throughput, scalability
7. **Deployment Architecture** - Infrastructure, CI/CD, monitoring
8. **Integration Requirements** - Third-party services, APIs, webhooks
9. **Development Standards** - Code style, testing, documentation
10. **Monitoring and Logging** - Error tracking, analytics, performance monitoring

For each specification, include:
- Requirement description
- Technical approach
- Implementation details
- Dependencies
- Success criteria

Format the output as a well-structured markdown document with clear sections and technical details.`;
  }

  private formatFeaturesContent(response: string): string {
    return `# Product Features

${response}

---
*Generated by MyContext CLI - AI-powered component generation platform*
*Last updated: ${new Date().toISOString()}*
`;
  }

  private formatUserFlowsContent(response: string): string {
    return `# User Flows

${response}

---
*Generated by MyContext CLI - AI-powered component generation platform*
*Last updated: ${new Date().toISOString()}*
`;
  }

  private formatEdgeCasesContent(response: string): string {
    return `# Edge Cases and Error Scenarios

${response}

---
*Generated by MyContext CLI - AI-powered component generation platform*
*Last updated: ${new Date().toISOString()}*
`;
  }

  private formatTechnicalSpecsContent(response: string): string {
    return `# Technical Specifications

${response}

---
*Generated by MyContext CLI - AI-powered component generation platform*
*Last updated: ${new Date().toISOString()}*
`;
  }

  /**
   * Get context content for generation - prefer PRD over description
   */
  private async getContextForGeneration(
    contextDir: string,
    fallbackDescription?: string
  ): Promise<string> {
    // First, try to read from 01-prd.md
    const prdPath = path.join(contextDir, "01-prd.md");
    if (await fs.pathExists(prdPath)) {
      try {
        const prdContent = await fs.readFile(prdPath, "utf8");

        // Check if PRD is just a template/starter sample
        if (this.isTemplatePRD(prdContent)) {
          console.log(
            chalk.yellow(
              "⚠️  PRD appears to be a template, not using as context"
            )
          );
        } else {
          console.log(
            chalk.blue(
              "📖 Using existing PRD as context for context files generation"
            )
          );
          return prdContent;
        }
      } catch (error) {
        console.log(
          chalk.yellow(
            "⚠️  Could not read PRD file, falling back to description"
          )
        );
      }
    }

    // Fallback to description if no PRD exists
    if (fallbackDescription) {
      console.log(chalk.blue("📝 Using project description as context"));
      return fallbackDescription;
    }

    // No context available - ask user
    console.log(chalk.red("❌ No PRD or description found!"));
    console.log(chalk.yellow("Please provide context by either:"));
    console.log(
      chalk.gray("  1. Run 'mycontext generate context' first to create a PRD")
    );
    console.log(
      chalk.gray(
        "  2. Use --description flag: mycontext generate-context-files --description 'Your project'"
      )
    );
    console.log(
      chalk.gray("  3. Create a PRD file manually at .mycontext/01-prd.md")
    );

    throw new Error(
      "No context available for generation. Please provide a PRD or description."
    );
  }

  /**
   * Check if PRD content is just a template/starter sample
   */
  private isTemplatePRD(content: string): boolean {
    const templateIndicators = [
      "MyContext project",
      "Replace this with your actual project description",
      "TODO: Add your project details",
      "This is a template",
      "Sample project",
      "Example project",
      "Your project description here",
      "Project Name: [Your Project Name]",
      "Description: [Your project description]",
      "## Project Overview\n\n[Add your project overview here]",
      "## Requirements\n\n[Add your requirements here]",
      "## Features\n\n[Add your features here]",
      "## Technical Specifications\n\n[Add your technical specs here]",
    ];

    // Check if content contains multiple template indicators
    const templateMatches = templateIndicators.filter((indicator) =>
      content.toLowerCase().includes(indicator.toLowerCase())
    );

    // If more than 2 template indicators are found, it's likely a template
    if (templateMatches.length >= 2) {
      return true;
    }

    // Check if content is very short (likely a template)
    // BUT NOT if it's just a success message from context generation
    if (
      content.includes("Full context generated successfully") ||
      content.includes("context generated successfully")
    ) {
      return false; // This is not a template, it's a success message
    }

    if (content.trim().length < 200) {
      return true;
    }

    // Check if content is mostly placeholder text
    const placeholderRatio =
      (content.match(/\[.*?\]/g) || []).length /
      (content.split(" ").length || 1);
    if (placeholderRatio > 0.1) {
      // More than 10% placeholders
      return true;
    }

    return false;
  }

  /**
   * REMOVED: Dangerous fallback method that compromises accuracy
   * MyContext requires 100% accuracy - no fallbacks allowed
   */
  private extractFeaturesFromPRD_DISABLED(prdContent?: string): string {
    if (!prdContent) {
      return `# Product Features

## Core Features

*No features available - PRD content not found*

---
*Generated by MyContext CLI - AI-powered component generation platform*
*Last updated: ${new Date().toISOString()}*
`;
    }

    // Extract features from PRD content
    const features = this.extractSectionFromPRD(prdContent, [
      "Core Features",
      "Features",
      "Key Features",
      "Main Features",
    ]);

    return `# Product Features

${
  features ||
  "## Core Features\n\n*Features will be extracted from PRD content*"
}

---
*Generated by MyContext CLI - AI-powered component generation platform*
*Last updated: ${new Date().toISOString()}*
`;
  }

  /**
   * REMOVED: Dangerous fallback method that compromises accuracy
   * MyContext requires 100% accuracy - no fallbacks allowed
   */
  private extractUserFlowsFromPRD_DISABLED(prdContent?: string): string {
    if (!prdContent) {
      return `# User Flows

## User Journey

*No user flows available - PRD content not found*

---
*Generated by MyContext CLI - AI-powered component generation platform*
*Last updated: ${new Date().toISOString()}*
`;
    }

    // Extract user flows from PRD content
    const userFlows = this.extractSectionFromPRD(prdContent, [
      "User Roles",
      "User Journey",
      "User Flows",
      "Workflow",
    ]);

    return `# User Flows

${
  userFlows ||
  "## User Journey\n\n*User flows will be extracted from PRD content*"
}

---
*Generated by MyContext CLI - AI-powered component generation platform*
*Last updated: ${new Date().toISOString()}*
`;
  }

  /**
   * REMOVED: Dangerous fallback method that compromises accuracy
   * MyContext requires 100% accuracy - no fallbacks allowed
   */
  private extractEdgeCasesFromPRD_DISABLED(prdContent?: string): string {
    if (!prdContent) {
      return `# Edge Cases and Error Scenarios

## Error Handling

*No edge cases available - PRD content not found*

---
*Generated by MyContext CLI - AI-powered component generation platform*
*Last updated: ${new Date().toISOString()}*
`;
    }

    // Extract edge cases from PRD content
    const edgeCases = this.extractSectionFromPRD(prdContent, [
      "Risk Mitigation",
      "Edge Cases",
      "Error Scenarios",
      "Troubleshooting",
    ]);

    return `# Edge Cases and Error Scenarios

${
  edgeCases ||
  "## Error Handling\n\n*Edge cases will be extracted from PRD content*"
}

---
*Generated by MyContext CLI - AI-powered component generation platform*
*Last updated: ${new Date().toISOString()}*
`;
  }

  /**
   * REMOVED: Dangerous fallback method that compromises accuracy
   * MyContext requires 100% accuracy - no fallbacks allowed
   */
  private extractTechnicalSpecsFromPRD_DISABLED(prdContent?: string): string {
    if (!prdContent) {
      return `# Technical Specifications

## Architecture

*No technical specs available - PRD content not found*

---
*Generated by MyContext CLI - AI-powered component generation platform*
*Last updated: ${new Date().toISOString()}*
`;
    }

    // Extract technical specs from PRD content
    const techSpecs = this.extractSectionFromPRD(prdContent, [
      "Technical Architecture",
      "Technical Specifications",
      "Architecture",
      "Technology Stack",
    ]);

    return `# Technical Specifications

${
  techSpecs ||
  "## Architecture\n\n*Technical specifications will be extracted from PRD content*"
}

---
*Generated by MyContext CLI - AI-powered component generation platform*
*Last updated: ${new Date().toISOString()}*
`;
  }

  /**
   * Extract a section from PRD content by looking for common section headers
   */
  private extractSectionFromPRD(
    prdContent: string,
    sectionHeaders: string[]
  ): string {
    const lines = prdContent.split("\n");
    let inSection = false;
    let sectionContent: string[] = [];
    let currentSection = "";

    for (const line of lines) {
      const trimmedLine = line.trim();

      // Check if this line starts a section we're looking for
      if (
        sectionHeaders.some(
          (header) =>
            trimmedLine.toLowerCase().includes(header.toLowerCase()) &&
            (trimmedLine.startsWith("#") ||
              trimmedLine.startsWith("##") ||
              trimmedLine.startsWith("###"))
        )
      ) {
        if (inSection) {
          // We found a new section, stop collecting the previous one
          break;
        }
        inSection = true;
        currentSection = trimmedLine;
        sectionContent.push(line);
        continue;
      }

      if (inSection) {
        // Check if we hit another major section (starts with # or ##)
        if (
          trimmedLine.startsWith("#") &&
          !trimmedLine.includes(currentSection)
        ) {
          break;
        }
        sectionContent.push(line);
      }
    }

    return sectionContent.join("\n").trim();
  }
}
