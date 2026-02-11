import { CommandOptions } from "../types";
import { UnifiedDesignContextLoader } from "../utils/unifiedDesignContextLoader";
import chalk from "chalk";

interface DesignAnalyzeOptions extends CommandOptions {
  regenerate?: boolean;
  summary?: boolean;
  validate?: boolean;
  resume?: boolean;
}

/**
 * Design Analyze Command
 *
 * Analyzes all context files and generates a rich design manifest
 * that serves as the foundation for component generation.
 *
 * This is the key command that treats all context files as a unified design system.
 */
export class DesignAnalyzeCommand {
  private contextLoader: UnifiedDesignContextLoader;

  constructor() {
    this.contextLoader = new UnifiedDesignContextLoader();
  }

  async execute(options: DesignAnalyzeOptions): Promise<void> {
    console.log(chalk.blue("🎨 MyContext Design Analysis"));
    console.log(
      chalk.gray("Analyzing all context files as unified design system...\n")
    );

    try {
      if (options.validate) {
        await this.validateContextFiles();
        return;
      }

      if (options.summary) {
        await this.showSummary();
        return;
      }

      if (options.regenerate) {
        await this.regenerateDesignManifest();
        return;
      }

      if (options.resume) {
        await this.resumeFromFailure();
        return;
      }

      // Check for auto-resume
      const canResume = await this.contextLoader.canResume();
      if (canResume) {
        console.log(
          chalk.yellow(
            "🔄 Resumable state detected, resuming from last failure..."
          )
        );
        await this.resumeFromFailure();
        return;
      }

      // Default: analyze and generate design manifest
      await this.analyzeAndGenerate();
    } catch (error) {
      console.error(chalk.red("❌ Design analysis failed:"), error);
      process.exit(1);
    }
  }

  /**
   * Analyze all context files and generate design manifest
   */
  private async analyzeAndGenerate(): Promise<void> {
    console.log(chalk.blue("🔄 Analyzing context files..."));

    const { enrichedContext, hasDesignManifest, shouldGenerateManifest } =
      await this.contextLoader.loadUnifiedDesignContext();

    if (hasDesignManifest && !shouldGenerateManifest) {
      console.log(chalk.green("✅ Using existing design manifest"));
    } else {
      console.log(chalk.green("✅ Generated new design manifest"));
    }

    // Display context summary
    console.log(chalk.blue("\n📋 Design Context Summary:"));
    console.log(chalk.gray("─".repeat(50)));
    console.log(
      this.contextLoader.getContextEnricher().getContextSummary(enrichedContext)
    );

    // Display next steps
    console.log(chalk.blue("\n➡️  Next Steps:"));
    console.log(
      chalk.gray(
        "   • Run 'mycontext generate components' to generate components"
      )
    );
    console.log(
      chalk.gray("   • Run 'mycontext design summary' to view design manifest")
    );
    console.log(
      chalk.gray("   • Run 'mycontext design validate' to check context files")
    );
  }

  /**
   * Validate all context files
   */
  private async validateContextFiles(): Promise<void> {
    console.log(chalk.blue("🔍 Validating context files..."));

    const validation = await this.contextLoader.validateContextFiles();

    if (validation.valid) {
      console.log(chalk.green("✅ All required context files found"));
    } else {
      console.log(chalk.red("❌ Missing required context files:"));
      validation.missing.forEach((file) => {
        console.log(chalk.red(`   • ${file}`));
      });
    }

    if (validation.warnings.length > 0) {
      console.log(chalk.yellow("\n⚠️  Warnings:"));
      validation.warnings.forEach((warning) => {
        console.log(chalk.yellow(`   • ${warning}`));
      });
    }

    if (validation.valid) {
      console.log(chalk.blue("\n➡️  Next Steps:"));
      console.log(
        chalk.gray(
          "   • Run 'mycontext design analyze' to generate design manifest"
        )
      );
      console.log(
        chalk.gray(
          "   • Run 'mycontext generate components' to generate components"
        )
      );
    } else {
      console.log(chalk.blue("\n➡️  Next Steps:"));
      console.log(chalk.gray("   • Create missing context files"));
      console.log(chalk.gray("   • Run 'mycontext init' to set up project"));
    }
  }

  /**
   * Show design manifest summary
   */
  private async showSummary(): Promise<void> {
    console.log(chalk.blue("📋 Design Manifest Summary"));
    console.log(chalk.gray("─".repeat(50)));

    const summary = await this.contextLoader.getDesignManifestSummary();
    console.log(summary);

    console.log(chalk.blue("\n➡️  Next Steps:"));
    console.log(
      chalk.gray(
        "   • Run 'mycontext generate components' to generate components"
      )
    );
    console.log(
      chalk.gray("   • Run 'mycontext design analyze' to regenerate manifest")
    );
  }

  /**
   * Regenerate design manifest
   */
  private async regenerateDesignManifest(): Promise<void> {
    console.log(chalk.blue("🔄 Regenerating design manifest..."));

    await this.contextLoader.regenerateDesignManifest();

    console.log(chalk.green("✅ Design manifest regenerated"));
    console.log(chalk.blue("\n➡️  Next Steps:"));
    console.log(
      chalk.gray(
        "   • Run 'mycontext generate components' to generate components"
      )
    );
    console.log(
      chalk.gray("   • Run 'mycontext design summary' to view updated manifest")
    );
  }

  /**
   * Get help text for the command
   */
  static getHelpText(): string {
    return `
🎨 Design Analyze Command

Analyzes all context files (PRD + Types + Brand + Component List) as a unified design system
and generates a rich design manifest for optimal component generation.

USAGE:
  mycontext design analyze [options]

OPTIONS:
  --regenerate    Force regenerate design manifest
  --summary       Show design manifest summary
  --validate      Validate all context files
  --help          Show this help message

EXAMPLES:
  mycontext design analyze              # Analyze and generate design manifest
  mycontext design analyze --validate   # Check if all context files exist
  mycontext design analyze --summary    # Show current design manifest
  mycontext design analyze --regenerate # Force regenerate design manifest

CONTEXT FILES:
  The command looks for these files in order:
  • PRD: .mycontext/01-prd.md, .mycontext/prd.md, context/01-prd.md, context/prd.md
  • Types: .mycontext/02-types.ts, .mycontext/types.ts, context/types.ts
  • Brand: .mycontext/03-branding.md, .mycontext/branding.md, context/branding.md
  • Components: .mycontext/04-component-list.json, .mycontext/component-list.json, context/component-list.json
  • Architecture: .mycontext/05-architecture.md, .mycontext/architecture.md, context/architecture.md
  • CSS: .mycontext/brand/globals.css, .mycontext/globals.css, context/globals.css, app/globals.css

DESIGN MANIFEST:
  The design manifest (.mycontext/design-manifest.json) contains:
  • Functional summary from PRD
  • Project scope and complexity
  • Design brief and visual direction
  • Complete visual system (colors, typography, spacing, etc.)
  • Component hierarchy and patterns
  • Implementation guidelines
  • Design intent and principles

This manifest serves as the foundation for generating components that are:
• Visually consistent with your design system
• Contextually aware of your project requirements
• Following established design patterns
• Optimized for your specific use case
`;
  }

  /**
   * Resume from last failed phase
   */
  private async resumeFromFailure(): Promise<void> {
    console.log(chalk.blue("🔄 Resuming Design Pipeline..."));

    try {
      // Load existing state
      const state = await this.contextLoader.loadState();
      if (!state) {
        console.log(chalk.red("❌ No resumable state found"));
        console.log(
          chalk.gray("   Run 'mycontext design analyze' to start fresh")
        );
        return;
      }

      // Check if state is stale
      const isStale = await this.contextLoader.isStateStale();
      if (isStale) {
        console.log(chalk.yellow("⚠️  Pipeline state is older than 24 hours"));
        console.log(
          chalk.gray(
            "   Consider running 'mycontext design analyze --regenerate' for fresh results"
          )
        );
      }

      // Show state summary
      const summary = await this.contextLoader.getStateSummary();
      console.log(chalk.blue("\n📊 Pipeline State:"));
      console.log(chalk.gray(summary));

      // Resume the pipeline
      const { enrichedContext } =
        await this.contextLoader.loadUnifiedDesignContext(true);

      console.log(chalk.green("✅ Pipeline resumed successfully"));

      // Display context summary
      console.log(chalk.blue("\n📋 Design Context Summary:"));
      console.log(chalk.gray("─".repeat(50)));
      console.log(
        this.contextLoader
          .getContextEnricher()
          .getContextSummary(enrichedContext)
      );

      // Display next steps
      console.log(chalk.blue("\n➡️  Next Steps:"));
      console.log(
        chalk.gray(
          "   • Run 'mycontext generate components' to generate components"
        )
      );
      console.log(
        chalk.gray(
          "   • Run 'mycontext design summary' to view design manifest"
        )
      );
      console.log(
        chalk.gray(
          "   • Run 'mycontext design validate' to check context files"
        )
      );
    } catch (error) {
      console.error(chalk.red("❌ Resume failed:"), error);
      console.log(chalk.blue("\n🔧 Try these alternatives:"));
      console.log(
        chalk.gray("   1. Start fresh: mycontext design analyze --regenerate")
      );
      console.log(chalk.gray("   2. Check status: mycontext design summary"));
      console.log(
        chalk.gray("   3. Validate files: mycontext design validate")
      );
    }
  }
}
