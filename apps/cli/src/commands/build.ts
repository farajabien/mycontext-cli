import chalk from "chalk";
import { CommandOptions } from "../types";
import { GenerateComponentsCommand } from "./generate-components";
import { EnhancedSpinner } from "../utils/spinner";

interface BuildOptions extends CommandOptions {
  force?: boolean;
}

export class BuildCommand {
  private spinner = new EnhancedSpinner("Building application...");

  async execute(options: BuildOptions): Promise<void> {
    console.log(chalk.blue.bold("🏗️  Building your application from Living Brain...\n"));

    try {
      this.spinner.start();
      
      const generateCommand = new GenerateComponentsCommand();
      
      // Build is an alias for generating all components with complete architecture
      await generateCommand.execute("all", {
        ...options,
        completeArchitecture: true,
        updatePreview: true,
        withTests: true,
        finalCanvas: true
      });

      this.spinner.succeed("Application build completed successfully!");
      console.log(chalk.green("\n🚀 Your application is ready. Run 'npm run dev' to see it in action."));
      
    } catch (error) {
      this.spinner.fail("Build failed");
      throw error;
    }
  }
}
