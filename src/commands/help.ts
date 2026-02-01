import chalk from "chalk";
import { Command } from "commander";
import { NextStepsSuggester } from "../utils/nextStepsSuggester";
import { WorkflowEngine } from "../utils/workflowEngine";
import { ProjectStateAnalyzer } from "../utils/ProjectStateAnalyzer";

export class HelpCommand {
  private program: Command;

  constructor(program: Command) {
    this.program = program;
  }

  async execute(options: { topic?: string; verbose?: boolean }): Promise<void> {
    const projectRoot = process.cwd();

    if (options.topic) {
      await this.showTopicHelp(options.topic, options.verbose);
      return;
    }

    // Context-aware help based on project state
    await this.showContextAwareHelp(projectRoot, options.verbose);
  }

  private async showContextAwareHelp(
    projectRoot: string,
    verbose?: boolean
  ): Promise<void> {
    console.log(chalk.blue("🤖 MyContext - Context-Aware Help\n"));

    // Use enhanced project state analyzer
    const analyzer = new ProjectStateAnalyzer(projectRoot);
    await analyzer.displayProjectStatus();

    // Show available workflows
    console.log(chalk.yellow("⚡ Available Workflows:"));
    this.displayAvailableWorkflows(verbose);
    console.log();

    // Show quick commands
    console.log(chalk.magenta("🚀 Quick Start Commands:"));
    this.displayQuickCommands();
    console.log();

    if (verbose) {
      console.log(chalk.gray("💡 Pro Tips:"));
      console.log(
        chalk.gray(
          "  • Use 'mycontext setup-complete --auto-continue' for intelligent project completion"
        )
      );
      console.log(
        chalk.gray(
          "  • Use 'mycontext workflow suggest' for workflow recommendations"
        )
      );
      console.log(
        chalk.gray(
          "  • Use 'mycontext help <topic>' for detailed help on specific topics"
        )
      );
      console.log();
    }
  }

  private displayProjectStatus(context: any): void {
    const statusItems = [
      {
        label: "PRD",
        status: context.hasPRD,
        description: "Product Requirements Document",
      },
      {
        label: "Context",
        status: context.hasContextFiles,
        description: "Context files (features, flows, etc.)",
      },
      {
        label: "Components",
        status: context.hasComponents,
        description: "React components generated",
      },
      {
        label: "shadcn/ui",
        status: context.hasShadcn,
        description: "UI component library",
      },
      {
        label: "InstantDB",
        status: context.hasInstantDB,
        description: "Real-time database",
      },
      {
        label: "AI Config",
        status: context.aiProviderConfigured,
        description: "AI provider configured",
      },
    ];

    statusItems.forEach((item) => {
      const statusIcon = item.status ? chalk.green("✅") : chalk.red("❌");
      const statusText = item.status
        ? chalk.green("Ready")
        : chalk.red("Missing");
      console.log(
        `  ${statusIcon} ${item.label}: ${statusText} - ${item.description}`
      );
    });

    if (context.projectType) {
      console.log(
        chalk.gray(
          `  🎯 Detected project type: ${chalk.cyan(context.projectType)}`
        )
      );
    }
  }

  private async displayWorkflowSuggestions(
    analyzer: ProjectStateAnalyzer
  ): Promise<void> {
    try {
      const suggestions = await analyzer.getWorkflowSuggestions();

      if (suggestions.length === 0) {
        console.log(
          chalk.gray(
            "  ✨ Your project is fully set up! Ready for development."
          )
        );
        return;
      }

      for (const suggestion of suggestions.slice(0, 3)) {
        const priorityIcon =
          suggestion.priority === "high"
            ? "🔴"
            : suggestion.priority === "medium"
            ? "🟡"
            : "🟢";
        console.log(`  ${priorityIcon} ${chalk.cyan(suggestion.command)}`);
        console.log(
          `     ${chalk.gray(suggestion.description)} (${
            suggestion.estimatedTime
          })`
        );
        if (suggestion.reason) {
          console.log(`     ${chalk.gray("Reason: " + suggestion.reason)}`);
        }
        console.log();
      }

      if (suggestions.length > 3) {
        console.log(
          chalk.gray(`  ... and ${suggestions.length - 3} more suggestions.`)
        );
        console.log(
          chalk.gray(
            `  Run 'mycontext help --topic workflows' for all options.`
          )
        );
      }
    } catch (error) {
      console.log(
        chalk.gray(
          "  💡 Run 'mycontext setup-complete --interactive' to get started"
        )
      );
    }
  }

  private async displayIntelligentSuggestions(
    projectRoot: string
  ): Promise<void> {
    try {
      const suggestions = await NextStepsSuggester.getIntelligentSuggestions(
        projectRoot
      );

      if (suggestions.length === 0) {
        console.log(
          chalk.gray(
            "  ✨ Your project is fully set up! Ready for development."
          )
        );
        return;
      }

      suggestions.slice(0, 5).forEach((suggestion, index) => {
        console.log(`  ${index + 1}. ${suggestion.description}`);
        console.log(chalk.gray(`     ${suggestion.command}`));
        if (suggestion.context) {
          console.log(chalk.gray(`     ℹ️  ${suggestion.context}`));
        }
        console.log();
      });
    } catch (error) {
      console.log(
        chalk.gray("  Unable to analyze project state for suggestions.")
      );
    }
  }

  private displayAvailableWorkflows(verbose?: boolean): void {
    const workflows = WorkflowEngine.getWorkflows();

    workflows.forEach((workflow) => {
      console.log(chalk.cyan(`  ${workflow.id}`));
      console.log(`    ${workflow.name}`);
      if (verbose) {
        console.log(chalk.gray(`    ${workflow.description}`));
        console.log(
          chalk.gray(
            `    ⏱️ ${workflow.estimatedTotalTime}min • 📝 ${workflow.steps.length} steps`
          )
        );
      }
      console.log();
    });
  }

  private displayQuickCommands(): void {
    const commands = [
      {
        cmd: "mycontext setup-complete --interactive",
        desc: "Complete guided project setup with AI assistance",
        priority: "high",
      },
      {
        cmd: "mycontext workflow analyze",
        desc: "Analyze current project and get AI recommendations",
        priority: "medium",
      },
      {
        cmd: "mycontext generate architecture --auto-continue",
        desc: "Generate complete project architecture",
        priority: "medium",
      },
      {
        cmd: "mycontext status",
        desc: "Check current project status and health",
        priority: "low",
      },
      {
        cmd: "mycontext validate",
        desc: "Validate project structure and configuration",
        priority: "low",
      },
    ];

    commands
      .sort((a, b) => {
        const priorityOrder: Record<string, number> = {
          high: 3,
          medium: 2,
          low: 1,
        };
        const aPriority = priorityOrder[a.priority || "medium"] || 2;
        const bPriority = priorityOrder[b.priority || "medium"] || 2;
        return bPriority - aPriority;
      })
      .forEach((cmd) => {
        const priorityIcon =
          cmd.priority === "high"
            ? "🔥"
            : cmd.priority === "medium"
            ? "💡"
            : "📖";
        console.log(`  ${priorityIcon} ${chalk.cyan(cmd.cmd)}`);
        console.log(chalk.gray(`     ${cmd.desc}`));
      });
  }

  private async showTopicHelp(topic: string, verbose?: boolean): Promise<void> {
    const topics = {
      "getting-started": {
        title: "🚀 Getting Started",
        content: `
MyContext is an AI-powered component generation and project setup tool.

Quick Start:
  1. Initialize with your preferred framework:
     ${chalk.cyan("mycontext init my-app --framework instantdb")}  # Full stack (default)
     ${chalk.cyan("mycontext init my-app --framework nextjs")}     # Next.js + shadcn
     ${chalk.cyan("mycontext init my-app --framework other")}      # MyContext only

  2. Set up AI provider: Configure GEMINI_API_KEY (free) or ANTHROPIC_API_KEY
     ${chalk.gray("echo 'GEMINI_API_KEY=your-key' > .mycontext/.env")}

  3. Generate context: ${chalk.cyan("mycontext generate context --full")}

For InstantDB projects, template files are automatically copied to lib/:
  - instant-client.ts (Client SDK with schema)
  - instant-admin.ts (Admin SDK for server operations)
  - auth.ts (Password hashing, magic codes, subdomains)
  - instantdb-storage.ts (File upload/download)

Use ${chalk.cyan("mycontext help frameworks")} for detailed framework information.
Use ${chalk.cyan("mycontext help")} for context-aware guidance based on your project state.`,
      },

      frameworks: {
        title: "🎯 Framework Support",
        content: `
MyContext adapts to your tech stack with flexible initialization:

${chalk.cyan("1. InstantDB (Full Stack)")} - Default
   ${chalk.gray("Complete real-time backend with auth and storage")}

   Command: ${chalk.cyan("mycontext init my-app --framework instantdb")}

   What happens:
   ✅ Runs shadcn/ui init interactively
   ✅ Prompts to run instant-cli init
   ✅ Prompts to push schemas to InstantDB
   ✅ Installs: @instantdb/react, @instantdb/admin
   ✅ Installs auth deps: bcryptjs, nanoid, @types/bcryptjs
   ✅ Copies template files to lib/ (or src/lib/):
      • instant-client.ts - Client SDK with schema
      • instant-admin.ts - Admin SDK for server operations
      • auth.ts - Auth helpers (hashing, magic codes)
      • instantdb-storage.ts - File upload/download
   ✅ Creates .mycontext/ project structure

   After init, configure:
   ${chalk.gray("echo 'NEXT_PUBLIC_INSTANT_APP_ID=your-app-id' > .env.local")}

${chalk.cyan("2. Next.js (Frontend Focus)")}
   ${chalk.gray("shadcn/ui + MyContext for Next.js projects")}

   Command: ${chalk.cyan("mycontext init my-app --framework nextjs")}

   What happens:
   ✅ Runs shadcn/ui init interactively
   ✅ Creates .mycontext/ project structure
   ⏭️ No database setup (bring your own backend)

${chalk.cyan("3. Basic (MyContext Only)")}
   ${chalk.gray("Minimal setup for any project type")}

   Command: ${chalk.cyan("mycontext init my-app --framework other")}

   What happens:
   ✅ Creates .mycontext/ project structure only
   ⏭️ No UI library or database setup

${chalk.yellow("Template File Locations:")}
  • Projects with src/: ${chalk.gray("src/lib/")}
  • Projects without src/: ${chalk.gray("lib/")}
  • Auto-detected during init

${chalk.yellow("Next Steps:")}
  ${chalk.cyan("mycontext help getting-started")}  # Quick start guide
  ${chalk.cyan("mycontext status")}                # Check project status`,
      },

      workflows: {
        title: "⚡ Workflows",
        content: `
MyContext provides automated workflows for different project types:

Available Workflows:
${WorkflowEngine.getWorkflows()
  .map(
    (w) =>
      `  ${chalk.cyan(w.id)}: ${w.name}
    ${w.description}
    Time: ${w.estimatedTotalTime}min, Steps: ${w.steps.length}`
  )
  .join("\n")}

Usage:
  mycontext workflow list                    # List all workflows
  mycontext workflow suggest                 # Get recommendations
  mycontext workflow start <id> --auto-continue  # Run workflow
  mycontext workflow status                  # Check progress
  mycontext workflow continue                # Resume workflow`,
      },

      commands: {
        title: "📋 Available Commands",
        content: `
Core Commands:
  ${chalk.cyan("init <name> [--framework <type>]")}
    Initialize new project with framework support
    Examples:
      mycontext init my-app --framework instantdb  # Full stack (default)
      mycontext init my-app --framework nextjs     # Next.js + shadcn
      mycontext init my-app --framework other      # MyContext only

  ${chalk.cyan("setup-complete")}        Analyze and complete project setup
  ${chalk.cyan("generate <type>")}       Generate code, types, components, etc.
  ${chalk.cyan("workflow <action>")}     Manage automated workflows
  ${chalk.cyan("validate")}              Check project quality
  ${chalk.cyan("status")}                Show project status

Setup Commands:
  ${chalk.cyan("setup-shadcn")}          Configure shadcn/ui components
  ${chalk.cyan("setup-instantdb")}       Configure InstantDB integration
  ${chalk.cyan("setup-database")}        Set up database and authentication

Development Commands:
  ${chalk.cyan("generate-components")}   Create React components
  ${chalk.cyan("generate-context-files")} Generate project context files
  ${chalk.cyan("compile-prd")}           Create comprehensive PRD
  ${chalk.cyan("analyze <image>")}       Analyze screenshot (Gemini Vision)

Utility Commands:
  ${chalk.cyan("help [topic]")}          Show help (context-aware)
    Topics: getting-started, frameworks, workflows, commands, ai-providers
  ${chalk.cyan("status --check-health")} Check AI provider status`,
      },

      "ai-providers": {
        title: "🤖 AI Provider Configuration",
        content: `
MyContext supports multiple AI providers with automatic fallback:

Primary Setup (Recommended):
  export ANTHROPIC_API_KEY="your_key_here"
  mycontext status --check-health

Alternative Providers:
  export XAI_API_KEY="your_key_here"  # For Grok 4
  export MYCONTEXT_PROVIDER=xai

The system automatically:
- Tests provider connectivity
- Falls back on failures
- Optimizes for speed vs. quality
- Handles rate limits gracefully

Check status: mycontext status --check-health`,
      },

      troubleshooting: {
        title: "🔧 Troubleshooting",
        content: `
Common Issues:

❌ "No AI providers available"
   → Configure ANTHROPIC_API_KEY or XAI_API_KEY
   → Run: mycontext status --check-health

❌ "Command failed"
   → Check project structure: mycontext validate
   → Ensure all dependencies are installed

❌ "Workflow interrupted"
   → Resume with: mycontext workflow continue
   → Check status: mycontext workflow status

❌ "Component generation failed"
   → Try with different provider: export MYCONTEXT_PROVIDER=xai
   → Check API key validity

For detailed troubleshooting:
  mycontext status --verbose
  mycontext validate --detailed`,
      },
    };

    const topicData = topics[topic as keyof typeof topics];

    if (!topicData) {
      console.log(chalk.red(`❌ Unknown help topic: ${topic}`));
      console.log(chalk.yellow("Available topics:"));
      Object.keys(topics).forEach((t) => {
        console.log(`  ${chalk.cyan(t)}`);
      });
      return;
    }

    console.log(chalk.blue(topicData.title));
    console.log();
    console.log(topicData.content.trim());

    if (verbose) {
      console.log();
      console.log(chalk.gray("💡 For context-aware help: mycontext help"));
    }
  }
}
