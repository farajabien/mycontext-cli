import { Command } from "commander";
import chalk from "chalk";
import fs from "fs-extra";
import path from "path";
import { DeterministicScaffoldGenerator } from "../generator/scaffold";
import { FSR } from "@myycontext/core";

export class BuildFeatureCommand {
  public register(program: Command): void {
    program
      .command("build")
      .description("Run the deterministic scaffold generator for a specific feature from its FSR.")
      .requiredOption("--feature <name>", "Name of the feature to build (e.g. add_todo)")
      .action(async (options) => {
        try {
          const featureId = options.feature;
          const fsrPath = path.join(process.cwd(), '.mycontext', 'features', `${featureId}.fsr.json`);
          
          if (!await fs.pathExists(fsrPath)) {
            console.error(chalk.red(`❌ FSR not found for feature: ${featureId}`));
            console.error(chalk.gray(`Looked in: ${fsrPath}`));
            console.error(chalk.gray(`Run 'mycontext plan ${featureId}' first.`));
            process.exit(1);
          }

          const fsr: FSR = await fs.readJson(fsrPath);
          const generator = new DeterministicScaffoldGenerator();
          await generator.generate(fsr);

        } catch (error) {
          console.error(chalk.red("❌ Build failed:"), error);
          process.exit(1);
        }
      });
  }
}
