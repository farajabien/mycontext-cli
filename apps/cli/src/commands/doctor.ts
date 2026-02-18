/**
 * mycontext doctor — Diagnose and fix project issues
 *
 * Usage:
 *   mycontext doctor [directory]
 *   mycontext doctor . --fix
 *   mycontext doctor . --verbose
 *   mycontext doctor . --score --json
 *   mycontext doctor . --project cli
 *   mycontext doctor . --category nextjs
 */
import { Command } from "commander";
import chalk from "chalk";
import { runDoctor, displayResult } from "../doctor/DoctorEngine";
import type { DoctorOptions, DoctorCategory } from "../doctor/types";

export class DoctorCommand {
  register(program: Command): void {
    program
      .command("doctor [directory]")
      .description("🩺 Diagnose and fix project issues")
      .option("--fix", "Auto-fix all fixable issues")
      .option("--verbose", "Show file details per rule")
      .option("--score", "Output only the score")
      .option("--project <name>", "Select workspace project (monorepo)")
      .option("--category <cat>", "Run only a specific category (nextjs|turbo|node|dead)")
      .option("--dry-run", "Show what --fix would do without changing files")
      .option("--prune", "Prune dead code (destructive)")
      .option("--json", "Output JSON (for programmatic use)")
      .action(async (directory: string | undefined, opts: any) => {
        await this.run(directory || ".", {
          fix: opts.fix,
          verbose: opts.verbose,
          score: opts.score,
          project: opts.project,
          category: opts.category as DoctorCategory | undefined,
          dryRun: opts.dryRun,
          json: opts.json,
          prune: opts.prune,
        });
      });
  }

  async run(directory: string, options: DoctorOptions): Promise<void> {
    try {
      const result = await runDoctor(directory, options);

      // Display results
      displayResult(result, options);

      // Exit with error code if there are errors (for CI)
      if (options.score && result.score < 50) {
        process.exit(1);
      }
    } catch (error: any) {
      console.error(chalk.red(`\n❌ Doctor failed: ${error.message}\n`));
      if (options.verbose) {
        console.error(error.stack);
      }
      process.exit(1);
    }
  }
}
