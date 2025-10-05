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
import { BuildAppCommand } from "./commands/build-app";
import { AnalyzeCommand } from "./commands/analyze";
import { PromoteCommand } from "./commands/promote";
import { MigrateCommand } from "./commands/migrate";
import { GenerateTodosCommand } from "./commands/generate-todos";
import { SanitizeCommand } from "./commands/sanitize";
import { DatabaseSetupCommand } from "./commands/setup-database";
import { InstantDBSetupCommand } from "./commands/setup-instantdb";
import { MCPSetupCommand } from "./commands/setup-mcp";
import { GenerateContextFilesCommand } from "./commands/generate-context-files";
import { CompilePRDCommand } from "./commands/compile-prd";
import { buildStrategyCommand } from "./commands/build-strategy";
import { HealthCheckCommand } from "./commands/health-check";
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
      const result = dotenv.config({ path: p });
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
      console.error(chalk.red("❌ Context files generation failed:"), error);
      process.exit(1);
    }
  });

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

// Generate components command
const generateComponentsCmd = program
  .command("generate-components [target]")
  .description("Generate React components using local AI")
  .option("--group <group>", "Component group to generate")
  .option("--all", "Generate all components (alias for target 'all')")
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
  .option("--verbose", "Show detailed output")
  .option("--debug", "Enable debug logging")
  .action(async (target: string | undefined, options: any) => {
    try {
      const generateComponentsCommand = new GenerateComponentsCommand();
      // If --all is provided but no target, use 'all' as target
      const actualTarget = target || (options.all ? "all" : undefined);
      if (!actualTarget) {
        console.error(
          chalk.red("❌ Please specify a target or use --all flag")
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

// Workflow command - streamlined development flow
program
  .command("workflow <step>")
  .description(
    "Streamlined development workflow: init → context → types → brand → components"
  )
  .option("--description <desc>", "Project description for context generation")
  .option("--with-tests", "Generate tests for components")
  .option("--skip-brand", "Skip brand generation step")
  .action(async (step, options) => {
    try {
      const steps = ["init", "context", "types", "brand", "components"];
      const currentIndex = steps.indexOf(step);

      if (currentIndex === -1) {
        console.error(chalk.red(`❌ Invalid step: ${step}`));
        console.log(chalk.blue("Available steps: " + steps.join(" → ")));
        process.exit(1);
      }

      console.log(chalk.blue(`🚀 Running workflow step: ${step}`));

      // Run the current step and all previous steps if needed
      for (let i = 0; i <= currentIndex; i++) {
        const currentStep = steps[i];
        console.log(
          chalk.gray(`\n📋 Step ${i + 1}/${steps.length}: ${currentStep}`)
        );

        switch (currentStep) {
          case "init":
            // Skip if already initialized
            if (await require("fs-extra").pathExists(".mycontext")) {
              console.log(chalk.gray("   ✓ Already initialized"));
              continue;
            }
            break;
          case "context":
            const generateCommand = new GenerateCommand();
            await generateCommand.execute({
              type: "context",
              full: true,
              description: options.description,
              ...options,
            });
            break;
          case "types":
            const generateTypesCommand = new GenerateCommand();
            await generateTypesCommand.execute({
              type: "types",
              ...options,
            });
            break;
          case "brand":
            if (options.skipBrand) {
              console.log(chalk.gray("   ⏭️  Skipped (--skip-brand)"));
              continue;
            }
            const generateBrandCommand = new GenerateCommand();
            await generateBrandCommand.execute({
              type: "brand",
              ...options,
            });
            break;
          case "components":
            const generateComponentsCommand = new GenerateComponentsCommand();
            await generateComponentsCommand.execute("all", {
              withTests: options.withTests || false,
              all: true,
              ...options,
            });
            break;
        }
      }

      console.log(
        chalk.green(`\n✅ Workflow step '${step}' completed successfully!`)
      );
      if (currentIndex < steps.length - 1) {
        console.log(
          chalk.blue(
            `\n➡️  Next step: mycontext workflow ${steps[currentIndex + 1]}`
          )
        );
      } else {
        console.log(
          chalk.green(
            `\n🎉 All workflow steps completed! Your project is ready.`
          )
        );
      }
    } catch (error) {
      console.error(chalk.red("❌ Workflow failed:"), error);
      process.exit(1);
    }
  });

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

// Build App command (agent-driven workflow with looping)
const buildAppCmd = program
  .command("build-app")
  .description(
    "Build a complete app with agent-driven workflow and user interaction"
  )
  .option("--description <desc>", "App description/PRD")
  .option("--output <dir>", "Output directory", "mycontext-app")
  .option("--framework <type>", "Framework type", "nextjs")
  .option("--with-tests", "Generate unit tests")
  .option("--existing", "Work with existing project")
  .option("--migrate", "Migrate existing project to MyContext structure")
  .option("--verbose", "Verbose output")
  .option(
    "--interactive",
    "Enable interactive mode with user prompts and confirmations"
  )
  .option("--skip-validation", "Skip validation and quality assurance steps")
  .option(
    "--max-retries <number>",
    "Maximum retry attempts for failed steps",
    "3"
  )
  .action(async (options) => {
    try {
      const command = new BuildAppCommand();
      await command.execute({
        description: options.description,
        output: options.output,
        framework: options.framework,
        withTests: Boolean(options.withTests),
        existing: Boolean(options.existing),
        migrate: Boolean(options.migrate),
        verbose: Boolean(options.verbose),
        interactive: Boolean(options.interactive),
        skipValidation: Boolean(options.skipValidation),
        maxRetries: parseInt(options.maxRetries) || 3,
      });
    } catch (error) {
      console.error(chalk.red("❌ Build app failed:"), error);
      process.exit(1);
    }
  });

// Add validation hook to build-app command
PreCommandValidator.addValidationHook(buildAppCmd, {
  autoFix: true,
  strict: true,
});

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
    console.log(chalk.gray("  mycontext build-app --interactive"));
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
      chalk.gray(
        "  build-app               - Build complete app from PRD (v0-like)"
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

    console.log(chalk.yellow("Preview Types:"));
    console.log(
      chalk.gray("  brand                   - Preview brand elements")
    );
    console.log(
      chalk.gray("  components              - Preview all components")
    );
    console.log(
      chalk.gray("  generated               - Preview generated components")
    );
    console.log(
      chalk.gray(
        "  <group-name>            - Preview specific component group\n"
      )
    );

    console.log(chalk.yellow("Examples:"));
    console.log(
      chalk.gray(
        '  mycontext build-app --description "A modern todo app with dark mode" --output "todo-app"'
      )
    );
    console.log(
      chalk.gray(
        '  mycontext build-app --description "Enhance my existing app" --existing --migrate'
      )
    );
    console.log(
      chalk.gray(
        '  mycontext build-app --description "Interactive app building" --interactive --max-retries 5'
      )
    );
    console.log(
      chalk.gray(
        '  mycontext build-app --description "Fast build without validation" --skip-validation'
      )
    );
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
  console.log(chalk.gray("  mycontext build-app --interactive\n"));
  console.log(chalk.gray('Run "mycontext help" for detailed information.\n'));
});

// Parse command line arguments
program.parse();
