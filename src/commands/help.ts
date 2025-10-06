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
  1. Initialize a new project: mycontext init <project-name>
  2. Set up AI provider: Configure ANTHROPIC_API_KEY or XAI_API_KEY
  3. Complete setup: mycontext setup-complete --auto-continue

For new projects, MyContext will guide you through:
- Creating a comprehensive PRD
- Generating TypeScript types and interfaces
- Setting up shadcn/ui components
- Creating React components with tests
- Configuring InstantDB for real-time data

Use 'mycontext help' for context-aware guidance based on your project state.`,
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
  init <name>           Initialize new project
  setup-complete        Analyze and complete project setup
  generate <type>       Generate code, types, components, etc.
  workflow <action>     Manage automated workflows
  validate              Check project quality
  status                Show project status

Setup Commands:
  setup-shadcn          Configure shadcn/ui components
  setup-instantdb       Configure InstantDB integration

Development Commands:
  generate-components   Create React components
  generate-context-files Generate project context files
  compile-prd           Create comprehensive PRD

Utility Commands:
  help [topic]          Show help (context-aware)
  status --check-health Check AI provider status`,
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
