import chalk from "chalk";
import path from "path";
import { promises as fs } from "fs";
import * as fsExtra from "fs-extra";
import { CommandOptions } from "../types";
import { EnhancedSpinner } from "../utils/spinner";

interface PromoteOptions extends CommandOptions {
  component?: string;
  group?: string;
  all?: boolean;
  keepContext?: boolean;
  addToGitignore?: boolean;
}

export class PromoteCommand {
  private spinner = new EnhancedSpinner("Promoting components...");

  async execute(target: string, options: PromoteOptions): Promise<void> {
    const {
      component,
      group,
      all,
      keepContext = false,
      addToGitignore = true,
    } = options;

    console.log(chalk.blue.bold("🚀 Promoting Components to Production\n"));

    try {
      if (component) {
        await this.promoteComponent(component, keepContext, addToGitignore);
      } else if (group) {
        await this.promoteGroup(group, keepContext, addToGitignore);
      } else if (all) {
        await this.promoteAll(keepContext, addToGitignore);
      } else {
        console.log(
          chalk.yellow("Please specify --component, --group, or --all")
        );
        return;
      }

      console.log(chalk.green.bold("\n✅ Components promoted successfully!"));
      this.printNextSteps();
    } catch (error) {
      this.spinner.fail("Promotion failed");
      throw error;
    }
  }

  private async promoteComponent(
    componentName: string,
    keepContext: boolean,
    addToGitignore: boolean
  ): Promise<void> {
    this.spinner.start().updateText(`Promoting component: ${componentName}`);

    const componentsDir = path.join(process.cwd(), "src", "components");
    const componentPath = await this.findComponentPath(
      componentsDir,
      componentName
    );

    if (!componentPath) {
      throw new Error(`Component ${componentName} not found`);
    }

    const mycontextDir = path.join(componentPath, ".mycontext");

    if (!(await fsExtra.pathExists(mycontextDir))) {
      console.log(
        chalk.yellow(`No .mycontext directory found for ${componentName}`)
      );
      return;
    }

    // Move context files to parent directory
    await this.moveContextFiles(mycontextDir, componentPath, keepContext);

    // Update import paths in component files
    await this.updateImportPaths(componentPath, componentName);

    // Add to gitignore if requested
    if (addToGitignore) {
      await this.addToGitignore(componentPath);
    }

    this.spinner.succeed(`Component ${componentName} promoted`);
  }

  private async promoteGroup(
    groupName: string,
    keepContext: boolean,
    addToGitignore: boolean
  ): Promise<void> {
    this.spinner.start().updateText(`Promoting group: ${groupName}`);

    const groupDir = path.join(process.cwd(), "src", "components", groupName);

    if (!(await fsExtra.pathExists(groupDir))) {
      throw new Error(`Group ${groupName} not found`);
    }

    const components = await fs.readdir(groupDir);
    const componentDirs = components.filter(async (item) => {
      const itemPath = path.join(groupDir, item);
      const stat = await fs.stat(itemPath);
      return stat.isDirectory();
    });

    for (const componentDir of componentDirs) {
      const componentPath = path.join(groupDir, componentDir);
      const mycontextDir = path.join(componentPath, ".mycontext");

      if (await fsExtra.pathExists(mycontextDir)) {
        await this.moveContextFiles(mycontextDir, componentPath, keepContext);
        await this.updateImportPaths(componentPath, componentDir);

        if (addToGitignore) {
          await this.addToGitignore(componentPath);
        }
      }
    }

    this.spinner.succeed(`Group ${groupName} promoted`);
  }

  private async promoteAll(
    keepContext: boolean,
    addToGitignore: boolean
  ): Promise<void> {
    this.spinner.start().updateText("Promoting all components");

    const componentsDir = path.join(process.cwd(), "src", "components");

    if (!(await fsExtra.pathExists(componentsDir))) {
      throw new Error("Components directory not found");
    }

    const groups = await fs.readdir(componentsDir);

    for (const group of groups) {
      const groupPath = path.join(componentsDir, group);
      const stat = await fs.stat(groupPath);

      if (stat.isDirectory()) {
        await this.promoteGroup(group, keepContext, addToGitignore);
      }
    }

    this.spinner.succeed("All components promoted");
  }

  private async findComponentPath(
    componentsDir: string,
    componentName: string
  ): Promise<string | null> {
    const groups = await fs.readdir(componentsDir);

    for (const group of groups) {
      const groupPath = path.join(componentsDir, group);
      const stat = await fs.stat(groupPath);

      if (stat.isDirectory()) {
        const componentPath = path.join(groupPath, componentName);
        if (await fsExtra.pathExists(componentPath)) {
          return componentPath;
        }
      }
    }

    return null;
  }

  private async moveContextFiles(
    mycontextDir: string,
    componentPath: string,
    keepContext: boolean
  ): Promise<void> {
    const files = await fs.readdir(mycontextDir);

    for (const file of files) {
      const sourcePath = path.join(mycontextDir, file);
      const targetPath = path.join(componentPath, file);

      // Skip if target already exists
      if (await fsExtra.pathExists(targetPath)) {
        console.log(chalk.yellow(`Skipping ${file} - already exists`));
        continue;
      }

      await fs.rename(sourcePath, targetPath);
    }

    // Remove .mycontext directory if not keeping context
    if (!keepContext) {
      await fs.rmdir(mycontextDir);
    }
  }

  private async updateImportPaths(
    componentPath: string,
    componentName: string
  ): Promise<void> {
    const componentFile = path.join(componentPath, `${componentName}.tsx`);

    if (!(await fsExtra.pathExists(componentFile))) {
      return;
    }

    let content = await fs.readFile(componentFile, "utf-8");

    // Update relative imports from .mycontext to current directory
    content = content.replace(
      /from ['"]\.\/\.mycontext\/([^'"]+)['"]/g,
      'from "./$1"'
    );

    // Update relative imports from .mycontext to parent directory
    content = content.replace(
      /from ['"]\.\.\/\.mycontext\/([^'"]+)['"]/g,
      'from "./$1"'
    );

    await fs.writeFile(componentFile, content);
  }

  private async addToGitignore(componentPath: string): Promise<void> {
    const gitignorePath = path.join(process.cwd(), ".gitignore");
    const mycontextIgnore = ".mycontext/";

    if (await fsExtra.pathExists(gitignorePath)) {
      let content = await fs.readFile(gitignorePath, "utf-8");

      if (!content.includes(mycontextIgnore)) {
        content += `\n# MyContext development files\n${mycontextIgnore}\n`;
        await fs.writeFile(gitignorePath, content);
      }
    } else {
      await fs.writeFile(
        gitignorePath,
        `# MyContext development files\n${mycontextIgnore}\n`
      );
    }
  }

  private printNextSteps(): void {
    console.log(chalk.yellow("\n📋 Next Steps:"));
    console.log(chalk.gray("1. Review the promoted components"));
    console.log(chalk.gray("2. Implement the server actions and hooks"));
    console.log(chalk.gray("3. Test the components in your application"));
    console.log(chalk.gray("4. Commit your changes to version control"));
    console.log(
      chalk.gray(
        "\n💡 Tip: Use --keep-context to preserve .mycontext directories"
      )
    );
  }
}
