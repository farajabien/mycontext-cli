import chalk from "chalk";
import { CommandOptions } from "../types";
import { FileSystemManager } from "../utils/fileSystem";
import { EnhancedSpinner } from "../utils/spinner";
import { CodeGenSubAgent } from "../agents/implementations/CodeGenSubAgent";
import { AICore } from "../core/ai/AICore";
import { execSync } from "child_process";
import * as path from "path";
import * as fs from "fs-extra";

interface AddOptions extends CommandOptions {
  group?: string;
  shadcn?: boolean;
}

export class AddCommand {
  private fs = new FileSystemManager();
  private spinner = new EnhancedSpinner("Adding component...");

  async execute(componentName: string, options: AddOptions): Promise<void> {
    const { group = "elements", shadcn = false } = options;

    console.log(chalk.blue.bold(`🚀 Adding component: ${chalk.white(componentName)}\n`));

    try {
      this.spinner.start();

      // 1. Detect if it's a shadcn primitive
      const isShadcnPrimitive = await this.isShadcnPrimitive(componentName);

      if (isShadcnPrimitive || shadcn) {
        this.spinner.updateText(`Installing shadcn primitive: ${componentName}...`);
        await this.installShadcnComponent(componentName);
        this.spinner.succeed(`Shadcn component ${componentName} installed.`);
        this.spinner.start().updateText(`Contextualizing ${componentName}...`);
      }

      // 2. Generate/Contextualize the component
      const codeGen = new CodeGenSubAgent();
      const aiCore = AICore.getInstance();
      const livingContext = await aiCore.getLivingContext();

      if (!livingContext) {
        throw new Error("Living Brain (context.json) not found. Run 'mycontext init' first.");
      }

      const result = await codeGen.run({
        component: {
          name: componentName,
          description: `A ${componentName} component for the ${livingContext.prd.title} project.`,
          type: "interactive",
          dependencies: isShadcnPrimitive ? [componentName] : [],
          tags: ["added-via-cli"]
        },
        group: group,
        context: livingContext,
        options: {
          projectPath: process.cwd()
        }
      });

      // 3. Write the file
      const componentsDir = path.join(process.cwd(), "src", "components", group);
      await fs.ensureDir(componentsDir);
      const filePath = path.join(componentsDir, `${this.toPascalCase(componentName)}.tsx`);
      
      await fs.writeFile(filePath, result.code);
      
      // 4. Update Registry (Brain)
      await this.updateRegistry(componentName, group, filePath);

      this.spinner.succeed(`Component ${chalk.white(componentName)} added and contextualized!`);
      console.log(chalk.gray(`\nLocation: ${filePath}`));

    } catch (error) {
      this.spinner.fail("Failed to add component");
      throw error;
    }
  }

  private async isShadcnPrimitive(name: string): Promise<boolean> {
    // Basic list of common shadcn primitives. In a real app, we might fetch this from the shadcn registry.
    const primitives = [
      "accordion", "alert", "alert-dialog", "aspect-ratio", "avatar", "badge", "button", 
      "calendar", "card", "carousel", "checkbox", "collapsible", "combobox", "command", 
      "context-menu", "dialog", "drawer", "dropdown-menu", "form", "hover-card", "input", 
      "label", "menubar", "navigation-menu", "pagination", "popover", "progress", 
      "radio-group", "resizable", "scroll-area", "select", "separator", "sheet", 
      "skeleton", "slider", "switch", "table", "tabs", "textarea", "toast", "toggle", 
      "tooltip"
    ];
    return primitives.includes(name.toLowerCase());
  }

  private async installShadcnComponent(name: string): Promise<void> {
    try {
      const packageManager = this.detectPackageManager();
      const cmd = `${packageManager === 'npm' ? 'npx' : packageManager} shadcn@latest add ${name} --yes`;
      execSync(cmd, { stdio: "ignore" });
    } catch (error) {
      console.warn(chalk.yellow(`\n⚠️  Could not install shadcn component via CLI. Ensure shadcn is initialized.`));
    }
  }

  private detectPackageManager(): "npm" | "pnpm" | "yarn" {
    if (fs.existsSync(path.join(process.cwd(), "pnpm-lock.yaml"))) return "pnpm";
    if (fs.existsSync(path.join(process.cwd(), "yarn.lock"))) return "yarn";
    return "npm";
  }

  private toPascalCase(str: string): string {
    return str
      .replace(/[-_]+/g, " ")
      .split(" ")
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join("");
  }

  private async updateRegistry(name: string, group: string, filePath: string): Promise<void> {
    const contextPath = path.join(process.cwd(), ".mycontext", "context.json");
    if (!(await fs.pathExists(contextPath))) return;

    const context = await fs.readJson(contextPath);
    if (!context.components) context.components = [];

    const existingIndex = context.components.findIndex((c: any) => c.name.toLowerCase() === name.toLowerCase());
    
    const componentData = {
      name: this.toPascalCase(name),
      path: path.relative(process.cwd(), filePath),
      group,
      status: "generated",
      generatedAt: new Date().toISOString()
    };

    if (existingIndex > -1) {
      context.components[existingIndex] = { ...context.components[existingIndex], ...componentData };
    } else {
      context.components.push(componentData);
    }

    await fs.writeJson(contextPath, context, { spaces: 2 });
  }
}
