import chalk from "chalk";
import { Command } from "commander";
import { NextStepsSuggester } from "../utils/nextStepsSuggester";
import { WorkflowEngine } from "../utils/workflowEngine";

interface CommandMatch {
  command: string;
  description: string;
  similarity: number;
  category: string;
}

export class SuggestCommand {
  private program: Command;

  constructor(program: Command) {
    this.program = program;
  }

  async execute(options: { command?: string; limit?: number }): Promise<void> {
    const projectRoot = process.cwd();

    if (options.command) {
      await this.suggestSimilarCommands(options.command, options.limit);
    } else {
      await this.showContextSuggestions(projectRoot);
    }
  }

  private async showContextSuggestions(projectRoot: string): Promise<void> {
    console.log(chalk.blue("💡 Context-Aware Suggestions\n"));

    // Get intelligent suggestions based on project state
    const suggestions = await NextStepsSuggester.getIntelligentSuggestions(
      projectRoot
    );

    if (suggestions.length === 0) {
      console.log(chalk.green("🎉 Your project appears to be complete!"));
      console.log(chalk.gray("No suggestions needed at this time."));
      console.log();
      console.log(chalk.yellow("Available commands if you need them:"));
      console.log(`  ${chalk.cyan("mycontext status")} - Check project status`);
      console.log(
        `  ${chalk.cyan("mycontext validate")} - Validate project quality`
      );
      console.log(
        `  ${chalk.cyan("mycontext workflow list")} - See available workflows`
      );
      return;
    }

    console.log(chalk.green("Recommended Actions:"));
    suggestions.slice(0, 5).forEach((suggestion, index) => {
      console.log(`  ${index + 1}. ${suggestion.description}`);
      console.log(chalk.gray(`     ${suggestion.command}`));
      if (suggestion.context) {
        console.log(chalk.gray(`     ℹ️  ${suggestion.context}`));
      }
      console.log();
    });

    console.log(chalk.yellow("Quick Commands:"));
    console.log(
      `  ${chalk.cyan(
        "mycontext setup-complete --auto-continue"
      )} - Complete project setup`
    );
    console.log(
      `  ${chalk.cyan(
        "mycontext workflow suggest"
      )} - More workflow suggestions`
    );
    console.log(`  ${chalk.cyan("mycontext help")} - Context-aware help`);
  }

  private async suggestSimilarCommands(
    input: string,
    limit: number = 5
  ): Promise<void> {
    const availableCommands = this.getAllCommands();
    const matches = this.findSimilarCommands(input, availableCommands);

    if (matches.length === 0) {
      console.log(chalk.red(`❌ No commands found similar to "${input}"`));
      console.log();
      console.log(chalk.yellow("💡 Try these instead:"));
      console.log(
        `  ${chalk.cyan("mycontext help")} - Show available commands`
      );
      console.log(
        `  ${chalk.cyan("mycontext suggest")} - Get context-aware suggestions`
      );
      return;
    }

    console.log(chalk.blue(`🔍 Suggestions for "${input}"\n`));

    matches.slice(0, limit).forEach((match, index) => {
      const similarityPercent = Math.round(match.similarity * 100);
      const similarityIcon =
        similarityPercent > 80 ? "🎯" : similarityPercent > 60 ? "💡" : "🤔";

      console.log(
        `${index + 1}. ${similarityIcon} ${chalk.cyan(match.command)}`
      );
      console.log(`   ${match.description}`);
      console.log(
        chalk.gray(
          `   Category: ${match.category} • Similarity: ${similarityPercent}%`
        )
      );
      console.log();
    });

    if (matches.length > limit) {
      console.log(
        chalk.gray(`... and ${matches.length - limit} more suggestions`)
      );
    }

    console.log(chalk.yellow("💡 Pro Tips:"));
    console.log(chalk.gray("  • Use tab completion for faster command entry"));
    console.log(
      chalk.gray("  • Run 'mycontext help' for detailed command reference")
    );
    console.log(
      chalk.gray(
        "  • Use 'mycontext suggest' for context-aware recommendations"
      )
    );
  }

  private getAllCommands(): Array<{
    command: string;
    description: string;
    category: string;
  }> {
    return [
      // Core commands
      {
        command: "init <project-name>",
        description: "Initialize a new MyContext project",
        category: "Setup",
      },
      {
        command: "setup-complete",
        description: "Analyze and complete project setup automatically",
        category: "Setup",
      },
      {
        command: "generate <type>",
        description: "Generate code, types, components, or architecture",
        category: "Generation",
      },
      {
        command: "generate-components [target]",
        description: "Generate React components with AI",
        category: "Generation",
      },
      {
        command: "generate-context-files",
        description: "Generate detailed project context files",
        category: "Generation",
      },
      {
        command: "compile-prd",
        description: "Compile comprehensive PRD from context files",
        category: "Generation",
      },
      {
        command: "validate [target]",
        description: "Validate project quality and structure",
        category: "Quality",
      },
      {
        command: "status",
        description: "Show current project status and health",
        category: "Info",
      },
      {
        command: "help [topic]",
        description: "Show context-aware help and guidance",
        category: "Info",
      },
      {
        command: "suggest [command]",
        description: "Get command suggestions and recommendations",
        category: "Info",
      },

      // Workflow commands
      {
        command: "workflow list",
        description: "List all available workflows",
        category: "Workflow",
      },
      {
        command: "workflow start <id>",
        description: "Start a specific workflow",
        category: "Workflow",
      },
      {
        command: "workflow status",
        description: "Check current workflow progress",
        category: "Workflow",
      },
      {
        command: "workflow continue",
        description: "Resume the current workflow",
        category: "Workflow",
      },
      {
        command: "workflow stop",
        description: "Stop the current workflow",
        category: "Workflow",
      },
      {
        command: "workflow suggest",
        description: "Get intelligent workflow recommendations",
        category: "Workflow",
      },

      // Setup commands
      {
        command: "setup-shadcn",
        description: "Configure shadcn/ui component library",
        category: "Setup",
      },
      {
        command: "setup-instantdb",
        description: "Configure InstantDB for real-time data",
        category: "Setup",
      },
      {
        command: "setup-database",
        description: "Set up database configuration",
        category: "Setup",
      },

      // Utility commands
      {
        command: "promote",
        description: "Move components from development to production",
        category: "Deployment",
      },
      {
        command: "preview",
        description: "Preview generated components",
        category: "Development",
      },
      {
        command: "agent-flow",
        description: "Manage AI agent workflows",
        category: "AI",
      },
      {
        command: "generate-todos",
        description: "Generate TODO items from PRD",
        category: "Planning",
      },
      {
        command: "sanitize",
        description: "Clean and sanitize project files",
        category: "Maintenance",
      },
      {
        command: "build-strategy",
        description: "Generate build and deployment strategies",
        category: "Deployment",
      },
      {
        command: "health-check",
        description: "Check system and provider health",
        category: "Info",
      },
      {
        command: "migrate",
        description: "Migrate project configuration",
        category: "Maintenance",
      },
      {
        command: "update",
        description: "Update MyContext CLI to latest version",
        category: "Maintenance",
      },
    ];
  }

  private findSimilarCommands(
    input: string,
    commands: Array<{ command: string; description: string; category: string }>
  ): CommandMatch[] {
    const inputLower = input.toLowerCase();
    const matches: CommandMatch[] = [];

    for (const cmd of commands) {
      const commandSimilarity = this.calculateSimilarity(
        inputLower,
        cmd.command.toLowerCase()
      );
      const descriptionSimilarity = this.calculateSimilarity(
        inputLower,
        cmd.description.toLowerCase()
      );
      const categorySimilarity = this.calculateSimilarity(
        inputLower,
        cmd.category.toLowerCase()
      );

      const maxSimilarity = Math.max(
        commandSimilarity,
        descriptionSimilarity,
        categorySimilarity
      );

      if (maxSimilarity > 0.3) {
        // Only include reasonably similar matches
        matches.push({
          command: cmd.command,
          description: cmd.description,
          similarity: maxSimilarity,
          category: cmd.category,
        });
      }
    }

    // Sort by similarity (highest first)
    return matches.sort((a, b) => b.similarity - a.similarity);
  }

  private calculateSimilarity(str1: string, str2: string): number {
    if (str1 === str2) return 1.0;

    // Simple fuzzy matching using substring similarity
    const len1 = str1.length;
    const len2 = str2.length;

    if (len1 === 0) return len2 === 0 ? 1.0 : 0.0;
    if (len2 === 0) return 0.0;

    // Check for exact substring matches
    if (
      str2.toLowerCase().includes(str1.toLowerCase()) ||
      str1.toLowerCase().includes(str2.toLowerCase())
    ) {
      return 0.8; // High similarity for substring matches
    }

    // Calculate word overlap
    const words1 = str1.toLowerCase().split(/[\s\-_]+/);
    const words2 = str2.toLowerCase().split(/[\s\-_]+/);

    let commonWords = 0;
    for (const word1 of words1) {
      if (
        words2.some((word2) => word2.includes(word1) || word1.includes(word2))
      ) {
        commonWords++;
      }
    }

    const wordSimilarity = commonWords / Math.max(words1.length, words2.length);

    // Character-level similarity (simple)
    let charMatches = 0;
    const shorter = len1 < len2 ? str1 : str2;
    const longer = len1 < len2 ? str2 : str1;

    for (let i = 0; i < shorter.length; i++) {
      const char = shorter[i];
      if (char && longer.includes(char)) {
        charMatches++;
      }
    }

    const charSimilarity = charMatches / shorter.length;

    // Combine word and character similarity
    return wordSimilarity * 0.7 + charSimilarity * 0.3;
  }
}
