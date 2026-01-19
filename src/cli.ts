#!/usr/bin/env node

import { Command } from "commander";
import chalk from "chalk";
import { InitCommand } from "./commands/init";
import { ValidateCommand } from "./commands/validate";
import { GenerateCommand } from "./commands/generate";
import { ListCommand } from "./commands/list";
import { StatusCommand } from "./commands/status";
import { PreviewCommand } from "./commands/preview";
import { GenerateComponentsCommand } from "./commands/generate-components";
import { AuthCommand } from "./commands/auth";
import { PlaybooksCommand } from "./commands/playbooks";
import { enhance } from "./commands/enhance";
import { refine } from "./commands/refine";
import { SetupCommand } from "./commands/setup";
import { UpdateCommand } from "./commands/update";
import { AgentFlowCommand } from "./commands/agent-flow";
import { runCleanCommand } from "./utils/clean";
import { predict } from "./commands/predict";
import { AnalyzeCommand } from "./commands/analyze";
import { PromoteCommand } from "./commands/promote";
import { MigrateCommand } from "./commands/migrate";
import { GenerateTodosCommand } from "./commands/generate-todos";
import { SanitizeCommand } from "./commands/sanitize";
import { DatabaseSetupCommand } from "./commands/setup-database";
import { InstantDBSetupCommand } from "./commands/setup-instantdb";
import { MCPSetupCommand } from "./commands/setup-mcp";
import { SetupShadcnCommand } from "./commands/setup-shadcn";
import { SetupCompleteCommand } from "./commands/setup-complete";
import { ImportProjectPlanCommand } from "./commands/import-project-plan";
import { ExportProgressCommand } from "./commands/export-progress";
import { PMIntegrationCommand } from "./commands/pm-integration";
import { HelpCommand } from "./commands/help";
import { SuggestCommand } from "./commands/suggest";
import { WorkflowCommand } from "./commands/workflow";
import { GenerateContextFilesCommand } from "./commands/generate-context-files";
import { registerGenerateDesignPromptCommand } from "./commands/generate-design-prompt";
import { CompilePRDCommand } from "./commands/compile-prd";
import { buildStrategyCommand } from "./commands/build-strategy";
import { HealthCheckCommand } from "./commands/health-check";
import { DesignAnalyzeCommand } from "./commands/design-analyze";
import { PreCommandValidator } from "./utils/PreCommandValidator";

// Import sub-agent system
import { orchestrator } from "./agents/orchestrator/SubAgentOrchestrator";
import { CodeGenSubAgent } from "./agents/implementations/CodeGenSubAgent";
import { QASubAgent } from "./agents/implementations/QASubAgent";
import { DocsSubAgent } from "./agents/implementations/DocsSubAgent";
import { ArchitectAgent } from "./agents/implementations/ArchitectAgent";
import { SecurityAgent } from "./agents/implementations/SecurityAgent";
import { InteractiveAgent } from "./agents/implementations/InteractiveAgent";
import { ProjectSetupAgent } from "./agents/implementations/ProjectSetupAgent";
import { WorkflowAgent } from "./agents/implementations/WorkflowAgent";
import { PromptConstructorAgent } from "./agents/implementations/PromptConstructorAgent";
import { BackendDevAgent } from "./agents/implementations/BackendDevAgent";
import { EnhancementAgent } from "./agents/implementations/EnhancementAgent";

// Register sub-agents with the orchestrator
orchestrator.registerAgent(new CodeGenSubAgent());
orchestrator.registerAgent(new QASubAgent());
orchestrator.registerAgent(new DocsSubAgent());
orchestrator.registerAgent(new ArchitectAgent());
orchestrator.registerAgent(new SecurityAgent());
orchestrator.registerAgent(new InteractiveAgent());
orchestrator.registerAgent(new ProjectSetupAgent());
orchestrator.registerAgent(new WorkflowAgent());
orchestrator.registerAgent(new PromptConstructorAgent());
orchestrator.registerAgent(new BackendDevAgent());
orchestrator.registerAgent(new EnhancementAgent());

const program = new Command();

// Load environment variables from local project
try {
  const dotenv = require("dotenv");
  const dotenvExpand = require("dotenv-expand");
  const fs = require("fs-extra");
  const path = require("path");
  const cwd = process.cwd();
  const candidates = [
    path.join(cwd, ".mycontext", ".env.local"),
    path.join(cwd, ".mycontext", ".env"),
    path.join(cwd, ".env.local"),
    path.join(cwd, ".env"),
  ];
  for (const p of candidates) {
    if (fs.pathExistsSync(p)) {
      const result = dotenv.config({ path: p, silent: true });
      dotenvExpand.expand(result);
    }
  }
} catch {}

// CLI metadata
program
  .name("mycontext")
  .description("mycontext CLI - AI-powered component generation platform")
  .version(require("../package.json").version as string)
  .option("-v, --verbose", "enable verbose output")
  .option("-q, --quiet", "suppress non-essential output")
  .configureOutput({
    writeErr: (str) => process.stderr.write(chalk.red(str)),
    writeOut: (str) => process.stdout.write(str),
  });

// Note: Individual command timeouts are implemented in each command
// to prevent hanging during AI operations

// Global options
program
  .option("-v, --verbose", "enable verbose logging")
  .option("--project <name>", "specify project name")
  .option("--yes", "skip all prompts (non-interactive mode)")
  .option("--up", "update the CLI to latest version");

// Initialize command
program
  .command("init <project-name>")
  .description("Initialize a new MyContext project")
  .option("--description <desc>", "project description")
  .option("--force", "force reinitialization")
  .option(
    "--framework <type>",
    "specify framework: instantdb, nextjs, other (--next coming soon)"
  )
  .option("--with-shadcn", "run shadcn/ui init before MyContext init")
  .option("--scaffold-next", "scaffold a Next.js app (optional)")
  .option("--skip-shadcn", "do not run shadcn/ui init automatically")
  .action(async (projectName, options) => {
    try {
      const initCommand = new InitCommand();
      await initCommand.execute(projectName, {
        ...program.opts(),
        ...options,
      });
    } catch (error) {
      console.error(chalk.red("❌ Init failed:"), error);
      process.exit(1);
    }
  });

// Validate command
program
  .command("validate <target>")
  .description("Validate PRD or other context files")
  .option("--file <path>", "specific file to validate")
  .option("--interactive", "interactive validation mode")
  .action(async (target, options) => {
    try {
      const validateCommand = new ValidateCommand();
      await validateCommand.execute(target, {
        ...program.opts(),
        ...options,
      });
    } catch (error) {
      console.error(chalk.red("❌ Validation failed:"), error);
      process.exit(1);
    }
  });

// Generate command
program
  .command("generate <type>")
  .description(
    "Generate context files, types, branding, or components. For context: use --full for PRD+A/B/C/D files, --files-only for A/B/C/D only"
  )
  .option("--temperature <number>", "Generation temperature (0.1-1.0)", "0.7")
  .option("--max-tokens <number>", "Maximum tokens for generation", "4000")
  .option("--description <desc>", "Inline description/context to generate from")
  .option(
    "--context-file <path>",
    "Path to a file whose content is the context"
  )
  .option("--include-brand", "Include brand in 'all' generation flow")
  .option("--model <name>", "Override model id (e.g., openai/gpt-5)")
  .option(
    "--prd-file <path>",
    "Use an existing PRD file as 01-prd.md (skip AI)"
  )
  .option("--preserve-prd", "Do not overwrite existing .mycontext/01-prd.md")
  .option(
    "--model-candidates <list>",
    "Comma-separated fallback model ids (e.g., deepseek/DeepSeek-V3-0324,meta/Llama-4-Scout-17B-16E-Instruct)"
  )
  .option(
    "--models <list>",
    "Alias of --model-candidates (comma-separated model ids)"
  )
  .option(
    "--use-models <list>",
    "Alias of --model-candidates (comma-separated model ids)"
  )
  .option("--verbose", "Show detailed output")
  .option("--debug", "Enable debug logging")
  .option("--force", "Overwrite existing output files without prompt")
  .option(
    "--full",
    "Generate full context (PRD + A/B/C/D files) - for 'context' type only"
  )
  .option(
    "--files-only",
    "Generate only A/B/C/D files (requires existing PRD) - for 'context' type only"
  )
  .option(
    "--auto-continue",
    "Automatically continue to next logical steps after completion"
  )
  .option(
    "--from-schema",
    "Generate types from InstantDB schema (for 'types' type only)"
  )
  .action(async (type: string, options: any) => {
    try {
      const generateCommand = new GenerateCommand();
      await generateCommand.execute({
        ...program.opts(),
        ...options,
        // Normalize alias: component-list -> components-list
        type: type === "component-list" ? "components-list" : type,
        temperature: parseFloat(options.temperature),
        maxTokens: parseInt(options.maxTokens),
      });
    } catch (error) {
      console.error(chalk.red("❌ Generation failed:"), error);
      process.exit(1);
    }
  });

// Generate context files command (A/B/C/D workflow)
program
  .command("generate-context-files")
  .description(
    "Generate A/B/C/D context files (Features, User Flows, Edge Cases, Technical Specs)"
  )
  .option(
    "--description <desc>",
    "Project description to generate context from"
  )
  .option("--project-path <path>", "Project path (default: current directory)")
  .option("--force", "Overwrite existing context files")
  .option("--verbose", "Show detailed output")
  .action(async (options: any) => {
    try {
      const generateContextFilesCommand = new GenerateContextFilesCommand();
      await generateContextFilesCommand.execute({
        ...program.opts(),
        ...options,
      });
    } catch (error) {
      // soft fail
      if (error instanceof Error && error.message.includes("template")) {
        console.log(
          chalk.yellow(
            "⚠️  PRD is a template - please update with your project details first"
          )
        );
        console.log(
          chalk.gray("   Edit: .mycontext/01-prd.md with your project details")
        );
        console.log(
          chalk.gray("   Then run: mycontext generate-context-files")
        );
        process.exit(1);
      }
      // Don't log the error again - it's already been logged by the command
      process.exit(1);
    }
  });

// Generate design prompt command
registerGenerateDesignPromptCommand(program);

// Compile PRD command
program
  .command("compile-prd")
  .description("Compile PRD from A/B/C/D context files")
  .option("--project-path <path>", "Project path (default: current directory)")
  .option("--force", "Overwrite existing PRD")
  .option("--verbose", "Show detailed output")
  .action(async (options: any) => {
    try {
      const compilePRDCommand = new CompilePRDCommand();
      await compilePRDCommand.execute({
        ...program.opts(),
        ...options,
      });
    } catch (error) {
      console.error(chalk.red("❌ PRD compilation failed:"), error);
      process.exit(1);
    }
  });

// Context-aware help command
program
  .command("help [topic]")
  .description("Show context-aware help and guidance")
  .option("--verbose", "Show detailed help information")
  .action(async (topic: string | undefined, options: any) => {
    try {
      const helpCommand = new HelpCommand(program);
      await helpCommand.execute({
        topic,
        verbose: Boolean(options.verbose),
      });
    } catch (error) {
      console.error(chalk.red("❌ Help command failed:"), error);
      process.exit(1);
    }
  });

// Intelligent command suggestions
program
  .command("suggest [command]")
  .description("Get intelligent command suggestions and recommendations")
  .option("--limit <number>", "Limit number of suggestions", "5")
  .action(async (command: string | undefined, options: any) => {
    try {
      const suggestCommand = new SuggestCommand(program);
      await suggestCommand.execute({
        command,
        limit: parseInt(options.limit) || 5,
      });
    } catch (error) {
      console.error(chalk.red("❌ Suggest command failed:"), error);
      process.exit(1);
    }
  });

// Preview components command - Coming Soon
// program
//   .command("preview:components")
//   .description("Open component library preview in browser")
//   .option("--validate", "Run validation checks on all components")
//   .action(async (options: any) => {
//     try {
//       const { PreviewComponentsCommand } = await import(
//         "./commands/preview-components"
//       );
//       const previewCommand = new PreviewComponentsCommand();
//       await previewCommand.execute(options);
//     } catch (error) {
//       console.error(chalk.red("❌ Preview command failed:"), error);
//       process.exit(1);
//     }
//   });

// Review context command
program
  .command("review:context")
  .description("Review auto-generated features and address context gaps")
  .option("--auto-approve", "Automatically approve all features")
  .option("--skip-gaps", "Skip gap resolution")
  .action(async (options: any) => {
    try {
      const { ReviewContextCommand } = await import(
        "./commands/review-context"
      );
      const reviewCommand = new ReviewContextCommand();
      await reviewCommand.execute(options);
    } catch (error) {
      console.error(chalk.red("❌ Review context failed:"), error);
      process.exit(1);
    }
  });

// Refine component command
program
  .command("refine:component <componentName>")
  .description("Refine a specific component with AI suggestions")
  .option(
    "--variant <variant>",
    "Component variant (mobile/desktop/both)",
    "both"
  )
  .option(
    "--update-context",
    "Update context files and regenerate all components"
  )
  .option("--in-place", "Refine only this component file")
  .action(async (componentName: string, options: any) => {
    try {
      const { RefineComponentCommand } = await import(
        "./commands/refine-component"
      );
      const refineCommand = new RefineComponentCommand();
      await refineCommand.execute(componentName, options);
    } catch (error) {
      console.error(chalk.red("❌ Component refinement failed:"), error);
      process.exit(1);
    }
  });

// Generate components command
const generateComponentsCmd = program
  .command("generate-components [target]")
  .description("Generate React components using local AI")
  .option("--group <group>", "Component group to generate")
  .option("--all", "Generate all components (alias for target 'all')")
  .option("--core-only", "Generate only the first 10 components for validation")
  .option("--temperature <number>", "Generation temperature (0.1-1.0)", "0.7")
  .option("--max-tokens <number>", "Maximum tokens for generation", "4000")
  .option("--local", "Use local AI generation (no authentication required)")
  .option("--with-tests", "Generate unit tests for each component")
  .option(
    "--no-update-preview",
    "Do not update /preview registry during generation"
  )
  .option(
    "--no-open-preview",
    "Do not auto-open /preview in the browser after generation"
  )
  .option(
    "--final-canvas",
    "Run a final normalize pass to build the canvas layout"
  )
  .option("--check", "Run typecheck, lint, and tests after generation")
  // .option(
  //   "--preview-dir <path>",
  //   "Directory to write components for Studio preview"
  // )
  .option("--verbose", "Show detailed output")
  .option("--debug", "Enable debug logging")
  .action(async (target: string | undefined, options: any) => {
    try {
      const generateComponentsCommand = new GenerateComponentsCommand();
      // If --all is provided but no target, use 'all' as target
      // If --core-only is provided, use 'core' as target
      const actualTarget =
        target || (options.all ? "all" : options.coreOnly ? "core" : undefined);
      if (!actualTarget) {
        console.error(
          chalk.red(
            "❌ Please specify a target, use --all flag, or use --core-only flag"
          )
        );
        process.exit(1);
      }
      await generateComponentsCommand.execute(actualTarget, {
        ...program.opts(),
        ...options,
      });
    } catch (error) {
      console.error(chalk.red("❌ Component generation failed:"), error);
      process.exit(1);
    }
  });

// Add validation hook to generate-components command
PreCommandValidator.addValidationHook(generateComponentsCmd, {
  autoFix: true,
  strict: false,
});

// Design analyze command
program
  .command("design")
  .description("Design system analysis and manifest generation")
  .option("--analyze", "Analyze context files and generate design manifest")
  .option("--validate", "Validate all context files")
  .option("--summary", "Show design manifest summary")
  .option("--regenerate", "Force regenerate design manifest")
  .option("--resume", "Resume from last failed phase")
  .action(async (options: any) => {
    try {
      const designCommand = new DesignAnalyzeCommand();
      await designCommand.execute(options);
    } catch (error) {
      console.error(chalk.red("❌ Design analysis failed:"), error);
      process.exit(1);
    }
  });

// Feature Assembly command
// Clone Starter command

// Agent Flow command (BETA - Agentic workflow orchestration)
program
  .command("agent-flow <action>")
  .description("🧪 BETA: Run agentic workflows with agent communication")
  .option(
    "--mode <type>",
    "Workflow mode: auto, sequential, validation",
    "auto"
  )
  .option("--target <name>", "Target component or feature name")
  .option("--retry-limit <number>", "Maximum retry attempts per agent", "3")
  .option("--quality-threshold <number>", "Quality threshold (0-1)", "0.7")
  .option("--verbose", "Show detailed output")
  .action(async (action: string, options: any) => {
    try {
      const agentFlowCommand = new AgentFlowCommand();
      await agentFlowCommand.execute(action, {
        ...program.opts(),
        ...options,
        retryLimit: parseInt(options.retryLimit),
        qualityThreshold: parseFloat(options.qualityThreshold),
      });
    } catch (error) {
      console.error(chalk.red("❌ Agent flow failed:"), error);
      process.exit(1);
    }
  });

// Generate todos command
program
  .command("generate-todos")
  .description("Generate contextual todos from project context")
  .option("-c, --count <number>", "Number of todos to generate", "10")
  .option("-f, --focus <string>", "Focus area for todo generation")
  .option("-e, --energy <level>", "Energy level (low, medium, high)", "medium")
  .option(
    "-x, --complexity <level>",
    "Complexity level (simple, moderate, complex)",
    "moderate"
  )
  .option("-p, --project <id>", "Project ID for context")
  .action(async (options: any) => {
    try {
      const generateTodosCommand = new GenerateTodosCommand();
      await generateTodosCommand.generateTodos(options);
    } catch (error) {
      console.error(chalk.red("❌ Todo generation failed:"), error);
      process.exit(1);
    }
  });

// Setup command
program
  .command("setup")
  .description(
    "Set up MyContext with AI providers and configure for your development stack"
  )
  .option("--force", "Force setup even if already configured")
  .option("--skip-prompts", "Skip interactive prompts")
  .option(
    "--stack <stack>",
    "Pre-configure for specific stack (nextjs-tailwind-shadcn, react-tailwind-shadcn)"
  )
  .action(async (options) => {
    const setupCommand = new SetupCommand();
    await setupCommand.execute(options);
  });

// Model commands

// Enhance command
program.addCommand(enhance);

// Refine command
program.addCommand(refine);

// Auth command
program
  .command("auth")
  .description("Authenticate with MyContext AI")
  .option("--login", "Login to MyContext AI")
  .option("--logout", "Logout from MyContext AI")
  .option("--status", "Check authentication status")
  .option("--register", "Register new account")
  .action(async (options) => {
    try {
      const authCommand = new AuthCommand();
      await authCommand.execute(options);
    } catch (error) {
      console.error(chalk.red("❌ Authentication failed:"), error);
      process.exit(1);
    }
  });

// Playbooks command
program
  .command("playbooks")
  .description("Manage proven processes and technical flows")
  .option("--add <title>", "Add new playbook")
  .option("--list", "List all playbooks")
  .option("--search <term>", "Search playbooks")
  .option("--use <id>", "Use playbook in generation")
  .option("--remove <id>", "Remove playbook")
  .option("--template <id>", "Create from template")
  .option("--category <category>", "Filter by category")
  .action(async (options) => {
    try {
      const playbooksCommand = new PlaybooksCommand();
      await playbooksCommand.execute(options);
    } catch (error) {
      console.error(chalk.red("❌ Playbooks failed:"), error);
      process.exit(1);
    }
  });

// List command
program
  .command("list [type]")
  .description("List components, projects, files, or all resources")
  .option("--format <format>", "output format (table, json, simple)", "table")
  .option("--local", "list from local filesystem without auth")
  .action(async (type, options) => {
    try {
      const listCommand = new ListCommand();
      await listCommand.execute(type || "all", {
        ...program.opts(),
        ...options,
      });
    } catch (error) {
      console.error(chalk.red("❌ List failed:"), error);
      process.exit(1);
    }
  });

// Status command
program
  .command("status")
  .description("Check project status and progress")
  .option("--detailed", "show detailed status information")
  .option("--check-health", "perform health checks")
  .action(async (options) => {
    try {
      const statusCommand = new StatusCommand();
      await statusCommand.execute("", {
        ...program.opts(),
        ...options,
      });
    } catch (error) {
      console.error(chalk.red("❌ Status check failed:"), error);
      process.exit(1);
    }
  });

// Preview command
program
  .command("preview <type>")
  .description("Preview brand elements, components, or component groups")
  .option("--no-open", "don't open in browser automatically")
  .option("--port <number>", "port for local server", "3000")
  .action(async (type, options) => {
    try {
      const previewCommand = new PreviewCommand();
      await previewCommand.execute(type, {
        ...program.opts(),
        ...options,
      });
    } catch (error) {
      console.error(chalk.red("❌ Preview failed:"), error);
      process.exit(1);
    }
  });

// Workflow command - pre-configured workflow templates
const workflowCommand = new WorkflowCommand();
workflowCommand.register(program);

// Update command (mycontext update)
program
  .command("update")
  .description("Update mycontext CLI to the latest version")
  .action(async () => {
    try {
      const updater = new UpdateCommand();
      await updater.execute();
    } catch (error) {
      console.error(chalk.red("❌ Update failed:"), error);
      process.exit(1);
    }
  });

// Clean command
program
  .command("clean")
  .description("Clean and repair malformed context files")
  .option("--project <path>", "Project path (defaults to current directory)")
  .action(async (options) => {
    try {
      await runCleanCommand(options.project);
    } catch (error: any) {
      console.error(chalk.red("❌ Clean failed:"), error.message);
      process.exit(1);
    }
  });

// Add predict command
program.addCommand(predict);

// Add build strategy command
program.addCommand(buildStrategyCommand);

// Health check command
const healthCheckCommand = new HealthCheckCommand();
healthCheckCommand.register(program);

// Import Project Plan command (mycontext PM integration)
const importProjectPlanCommand = new ImportProjectPlanCommand();
importProjectPlanCommand.register(program);

// Export Progress command (mycontext PM integration)
const exportProgressCommand = new ExportProgressCommand();
exportProgressCommand.register(program);

// PM Integration command (comprehensive PM integration management)
const pmIntegrationCommand = new PMIntegrationCommand();
pmIntegrationCommand.register(program);

// Analyze command for existing projects
program
  .command("analyze")
  .description("Analyze existing project and generate context files")
  .option("--output <dir>", "Output directory for context files", ".mycontext")
  .option("--generate-context", "Generate context files", true)
  .option("--include-brand", "Include brand analysis", true)
  .option("--include-types", "Include type analysis", true)
  .option("--include-components", "Include component analysis", true)
  .option("--verbose", "Verbose output")
  .action(async (options) => {
    try {
      const command = new AnalyzeCommand();
      await command.execute(".", {
        output: options.output,
        generateContext: Boolean(options.generateContext),
        includeBrand: Boolean(options.includeBrand),
        includeTypes: Boolean(options.includeTypes),
        includeComponents: Boolean(options.includeComponents),
        verbose: Boolean(options.verbose),
      });
    } catch (error) {
      console.error(chalk.red("❌ Analysis failed:"), error);
      process.exit(1);
    }
  });

// Sanitize command for cleaning up project
program
  .command("sanitize")
  .description(
    "Sanitize project by checking for redundancy, duplicates, and unreachable code"
  )
  .option("--fix", "Automatically fix issues where possible")
  .option("--verbose", "Verbose output")
  .option("--no-duplicates", "Skip duplicate file checking")
  .option("--no-unreachable", "Skip unreachable code checking")
  .option("--no-redundancy", "Skip redundant file checking")
  .option("--no-unused", "Skip unused file checking")
  .action(async (options) => {
    try {
      const command = new SanitizeCommand();
      await command.execute(".", {
        fix: Boolean(options.fix),
        verbose: Boolean(options.verbose),
        checkDuplicates: options.duplicates !== false,
        checkUnreachable: options.unreachable !== false,
        checkRedundancy: options.redundancy !== false,
        checkUnused: options.unused !== false,
      });
    } catch (error) {
      console.error(chalk.red("❌ Sanitization failed:"), error);
      process.exit(1);
    }
  });

// Database setup command
program
  .command("setup-database")
  .description(
    "Set up database and authentication (InstantDB, Supabase, Firebase)"
  )
  .option("--provider <provider>", "Database provider", "instantdb")
  .option("--no-auth", "Skip authentication setup")
  .option("--no-schema", "Skip schema generation")
  .option("--no-components", "Skip component generation")
  .action(async (options) => {
    try {
      const command = new DatabaseSetupCommand();
      await command.execute({
        provider: options.provider,
        auth: options.auth !== false,
        schema: options.schema !== false,
        components: options.components !== false,
        skipAuth: options.auth === false,
        skipSchema: options.schema === false,
        skipComponents: options.components === false,
      });
    } catch (error) {
      console.error(chalk.red("❌ Database setup failed:"), error);
      process.exit(1);
    }
  });

// InstantDB + MCP setup command
program
  .command("setup-instantdb")
  .description(
    "Set up InstantDB with MCP integration for real-time database and AI-powered development"
  )
  .option("--no-mcp", "Skip MCP integration setup")
  .option("--no-auth", "Skip authentication setup")
  .option("--no-schema", "Skip schema generation")
  .option("--no-components", "Skip component generation")
  .option("--app-id <id>", "InstantDB App ID")
  .option("--token <token>", "InstantDB Personal Access Token")
  .action(async (options) => {
    try {
      const command = new InstantDBSetupCommand();
      await command.execute({
        mcp: options.mcp !== false,
        auth: options.auth !== false,
        schema: options.schema !== false,
        components: options.components !== false,
        skipAuth: options.auth === false,
        skipSchema: options.schema === false,
        skipComponents: options.components === false,
        appId: options.appId,
        token: options.token,
      });
    } catch (error) {
      console.error(chalk.red("❌ InstantDB setup failed:"), error);
      process.exit(1);
    }
  });

// MCP setup command
program
  .command("setup-mcp")
  .description(
    "Set up MCP (Model Context Protocol) for AI-powered development with various providers"
  )
  .option(
    "--provider <provider>",
    "MCP provider (instantdb, github, custom)",
    "instantdb"
  )
  .option("--server <url>", "Custom MCP server URL")
  .option("--token <token>", "Provider token")
  .option("--config <path>", "Custom MCP configuration file")
  .option("--no-install", "Skip dependency installation")
  .action(async (options) => {
    try {
      const command = new MCPSetupCommand();
      await command.execute({
        provider: options.provider,
        server: options.server,
        token: options.token,
        config: options.config,
        install: options.install !== false,
      });
    } catch (error) {
      console.error(chalk.red("❌ MCP setup failed:"), error);
      process.exit(1);
    }
  });

// shadcn/ui setup command
program
  .command("setup-shadcn")
  .description(
    "Set up shadcn/ui components with interactive terminal installation"
  )
  .option("--all", "Install all essential components automatically")
  .option(
    "--components <list>",
    "Comma-separated list of components to install"
  )
  .option("--force", "Force reinitialization even if already set up")
  .option("--skip-prompts", "Skip interactive prompts")
  .action(async (options) => {
    try {
      const command = new SetupShadcnCommand();
      await command.execute({
        all: Boolean(options.all),
        components: options.components
          ? options.components.split(",").map((c: string) => c.trim())
          : undefined,
        force: Boolean(options.force),
        skipPrompts: Boolean(options.skipPrompts),
      });
    } catch (error) {
      console.error(chalk.red("❌ shadcn/ui setup failed:"), error);
      process.exit(1);
    }
  });

// Setup complete command - guided complete project setup
const setupCompleteCommand = new SetupCompleteCommand();
setupCompleteCommand.register(program);

// Promote command for moving components to production
program
  .command("promote")
  .description("Promote components from development to production")
  .option("--component <name>", "Promote specific component")
  .option("--group <name>", "Promote all components in group")
  .option("--all", "Promote all components")
  .option("--keep-context", "Keep .mycontext directories")
  .option("--add-to-gitignore", "Add .mycontext/ to .gitignore", true)
  .action(async (options) => {
    try {
      const command = new PromoteCommand();
      await command.execute(".", {
        component: options.component,
        group: options.group,
        all: Boolean(options.all),
        keepContext: Boolean(options.keepContext),
        addToGitignore: Boolean(options.addToGitignore),
      });
    } catch (error) {
      console.error(chalk.red("❌ Promotion failed:"), error);
      process.exit(1);
    }
  });

// Migrate command for converting existing projects to MyContext structure
program
  .command("migrate")
  .description("Migrate existing project to MyContext structure")
  .option("--component <name>", "Migrate specific component")
  .option("--group <name>", "Migrate all components in group")
  .option("--all", "Migrate all components")
  .option("--include-actions", "Include server actions", true)
  .option("--include-hooks", "Include custom hooks", true)
  .option("--include-context", "Include React context", true)
  .option("--include-docs", "Include documentation", true)
  .option("--verbose", "Verbose output")
  .action(async (options) => {
    try {
      const command = new MigrateCommand();
      await command.execute(".", {
        component: options.component,
        group: options.group,
        all: Boolean(options.all),
        includeActions: Boolean(options.includeActions),
        includeHooks: Boolean(options.includeHooks),
        includeContext: Boolean(options.includeContext),
        includeDocs: Boolean(options.includeDocs),
        verbose: Boolean(options.verbose),
      });
    } catch (error) {
      console.error(chalk.red("❌ Migration failed:"), error);
      process.exit(1);
    }
  });

// Help command
program
  .command("help")
  .description("Show detailed help information")
  .action(() => {
    console.log(
      chalk.blue.bold("🚀 MyContext CLI - Agent-Driven Development\n")
    );
    console.log(chalk.yellow("Quick Start:"));
    console.log(chalk.gray("  mycontext init my-project"));
    console.log(chalk.gray("  # Set API key (Qwen FREE or GitHub Models)"));
    console.log(
      chalk.gray("  echo 'MYCONTEXT_QWEN_API_KEY=sk-or-xxx' > .mycontext/.env")
    );
    console.log(
      chalk.gray(
        "  mycontext generate context --full --description 'Modern todo app'"
      )
    );
    console.log(chalk.gray("  mycontext compile-prd"));
    console.log(chalk.gray("  mycontext validate prd"));
    console.log(chalk.gray("  mycontext generate components-list"));
    console.log(
      chalk.gray("  mycontext generate-components all --with-tests\n")
    );

    console.log(chalk.yellow("Available Commands:"));
    console.log(
      chalk.gray("  init <project-name>     - Initialize a new project")
    );
    console.log(
      chalk.gray(
        "  analyze                 - Analyze existing project and generate context"
      )
    );
    console.log(
      chalk.gray("  generate <type>         - Generate context files")
    );
    console.log(
      chalk.gray("  generate-components <target> - Generate React components")
    );
    console.log(
      chalk.gray("  enhance <target>        - Enhance components with AI")
    );
    console.log(
      chalk.gray("  refine <component>      - Refine components with AI")
    );
    console.log(
      chalk.gray(
        "  promote                 - Promote components from dev to production"
      )
    );
    console.log(
      chalk.gray(
        "  migrate                 - Migrate existing project to MyContext structure"
      )
    );
    console.log(
      chalk.gray("  validate <target>       - Validate PRD or files")
    );
    console.log(chalk.gray("  list [type]             - List resources"));
    console.log(chalk.gray("  status                  - Check project status"));
    console.log(
      chalk.gray("  preview <type>          - Preview brand or components")
    );
    console.log(
      chalk.gray(
        "  setup-instantdb         - Set up InstantDB with MCP integration"
      ),
      chalk.gray(
        "  setup-mcp               - Set up MCP (Model Context Protocol)"
      )
    );
    console.log(
      chalk.gray(
        "  setup-database          - Set up database and authentication"
      )
    );
    console.log(
      chalk.gray("  auth                    - Authenticate with MyContext AI")
    );
    console.log(
      chalk.gray("  auth --login            - Login to MyContext AI")
    );
    console.log(
      chalk.gray("  auth --logout           - Logout from MyContext AI")
    );
    console.log(
      chalk.gray("  auth --status           - Check authentication status")
    );
    console.log(chalk.gray("  auth --register         - Register new account"));
    console.log(
      chalk.gray("  playbooks               - Manage proven processes")
    );
    console.log(chalk.gray("  playbooks --add         - Add new playbook"));
    console.log(chalk.gray("  playbooks --list        - List all playbooks"));
    console.log(chalk.gray("  playbooks --search      - Search playbooks"));
    console.log(
      chalk.gray("  playbooks --use         - Use playbook in generation")
    );

    console.log(chalk.yellow("Generation Types:"));
    console.log(
      chalk.gray("  context                 - Generate PRD and user stories")
    );
    console.log(
      chalk.gray("  types                   - Generate TypeScript types")
    );
    console.log(
      chalk.gray("  brand                   - Generate branding guidelines")
    );
    console.log(
      chalk.gray(
        "  components-list         - Generate component list (alias: component-list)"
      )
    );
    console.log(
      chalk.gray("  app-structure           - Generate app structure\n")
    );

    console.log(chalk.yellow("List Types:"));
    console.log(
      chalk.gray("  components              - List generated components")
    );
    console.log(
      chalk.gray("  projects                - List project information")
    );
    console.log(chalk.gray("  files                   - List context files"));
    console.log(chalk.gray("  all                     - List everything\n"));

    // console.log(chalk.yellow("Preview Types:"));
    // console.log(
    //   chalk.gray("  brand                   - Preview brand elements")
    // );
    // console.log(
    //   chalk.gray("  components              - Preview all components")
    // );
    // console.log(
    //   chalk.gray("  generated               - Preview generated components")
    // );
    // console.log(
    //   chalk.gray(
    //     "  <group-name>            - Preview specific component group\n"
    //   )
    // );

    console.log(chalk.yellow("Examples:"));
    console.log(
      chalk.gray(
        '  mycontext init todo-app --description "A simple todo application"'
      )
    );
    console.log(
      chalk.gray("  mycontext init . --analyze  # Analyze existing project")
    );
    console.log(
      chalk.gray(
        "  mycontext analyze --generate-context  # Analyze and generate context"
      )
    );
    console.log(
      chalk.gray(
        '  mycontext init clarity-app --framework instantdb --description "A Clarity app with InstantDB"'
      )
    );
    console.log(chalk.gray("  mycontext init my-app --framework instantdb"));
    console.log(chalk.gray("  mycontext init my-app --framework nextjs"));
    console.log(chalk.gray("  mycontext generate context --yes"));
    console.log(chalk.gray("  mycontext validate prd --interactive"));
    console.log(chalk.gray("  mycontext generate-components authentication"));
    console.log(chalk.gray("  mycontext generate-components all"));
    console.log(
      chalk.gray("  mycontext enhance TodoApp.tsx --prompt 'Make it modern'")
    );
    console.log(chalk.gray("  mycontext enhance forms-input --yes"));
    console.log(
      chalk.gray("  mycontext refine Button.tsx --prompt 'Add accessibility'")
    );
    console.log(
      chalk.gray(
        "  mycontext refine Card.tsx --output-format diff --interactive"
      )
    );
    console.log(chalk.gray("  mycontext promote --component Button"));
    console.log(chalk.gray("  mycontext promote --all"));
    console.log(chalk.gray("  mycontext migrate --all"));
    console.log(chalk.gray("  mycontext migrate --component Button"));
    console.log(chalk.gray("  mycontext list components --format json"));
    console.log(chalk.gray("  mycontext status --check-health"));
    console.log(chalk.gray("  mycontext preview brand"));
    console.log(chalk.gray("  mycontext preview components"));
    console.log(chalk.gray("  mycontext preview generated authentication\n"));

    console.log(chalk.yellow("Documentation:"));
    console.log(chalk.gray("  https://mycontext.fbien.com/docs\n"));
  });

// Default action
program.action(() => {
  // If --up is provided without a subcommand, run update
  const opts = program.opts() as any;
  if (opts.up) {
    const updater = new UpdateCommand();
    updater
      .execute()
      .then(() => process.exit(0))
      .catch(() => process.exit(1));
    return;
  }
  console.log(chalk.blue.bold("🚀 MyContext CLI\n"));
  console.log(
    chalk.gray(
      "AI-powered agent-driven development for modern web applications.\n"
    )
  );
  console.log(chalk.yellow("Quick Start:"));
  console.log(chalk.gray("  mycontext init my-project"));
  console.log(
    chalk.gray(
      "  mycontext generate context --full --description 'Your project'"
    )
  );
  console.log(chalk.gray("  mycontext compile-prd"));
  console.log(chalk.gray('Run "mycontext help" for detailed information.\n'));
});

// Parse command line arguments
program
  .parseAsync()
  .then(() => {
    // Explicitly exit after command completes to avoid hanging
    process.exit(0);
  })
  .catch((error) => {
    console.error(chalk.red("❌ Command failed:"), error.message);
    process.exit(1);
  });
