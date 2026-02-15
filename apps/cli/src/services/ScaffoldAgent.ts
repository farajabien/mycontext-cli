import { EnhancedSpinner } from "../utils/spinner";
import { MegaContext } from "../types/mega-context";
import { FileSystemManager } from "../utils/fileSystem";
import chalk from "chalk";
import { execSync } from "child_process";
import * as path from "path";
import * as fs from "fs-extra";

export class ScaffoldAgent {
  private fs = new FileSystemManager();
  private spinner: EnhancedSpinner;

  constructor() {
    this.spinner = new EnhancedSpinner("Refining architecture...");
  }

  /**
   * Deterministically scaffold the project from the MegaContext
   */
  async scaffold(context: MegaContext): Promise<void> {
    console.log(chalk.blue(`\n🚀 Scaling up to 100% deterministic scaffold for: ${context.project.name}\n`));
    
    const projectPath = path.resolve(process.cwd(), context.project.name);

    // 1. Framework Scaffold (Next.js)
    if (!fs.existsSync(projectPath)) {
        this.spinner.updateText("Bootstrapping Next.js + InstantDB...");
        this.spinner.start();
        try {
            // Using a more deterministic install command (pnpm dlx create-next-app)
            // We use --no-eslint --no-tailwind --no-src-dir etc to have full control? 
            // For now, let's stick to standard recommended setup but fast
            execSync(`pnpm dlx create-next-app@latest ${context.project.name} --typescript --tailwind --eslint --app --no-src-dir --import-alias "@/*" --use-pnpm`, {
                stdio: "ignore" 
            });
            this.spinner.success({ text: "Next.js shell created." });
        } catch (e) {
            this.spinner.error({ text: "Failed to scaffold Next.js app." });
            throw e;
        }
    }

    // 2. Install InstantDB
    this.spinner.updateText("Installing InstantDB SDK...");
    this.spinner.start();
    execSync("pnpm add @instantdb/react @instantdb/admin", { cwd: projectPath, stdio: "ignore" });
    this.spinner.success({ text: "InstantDB SDK installed." });

    // 3. Generate Schema
    this.spinner.updateText("Generating InstantDB Schema...");
    this.spinner.start();
    await this.generateSchemaFile(projectPath, context);
    this.spinner.success({ text: "Schema generated from MegaContext." });

    // 4. Generate Routes & Pages
    this.spinner.updateText("Generating Route Structure...");
    this.spinner.start();
    await this.generateRoutes(projectPath, context);
    this.spinner.success({ text: "Routes & Layouts generated." });

    console.log(chalk.green(`\n✅ Project "${context.project.name}" is ready!`));
    console.log(chalk.gray(`   cd ${context.project.name} && pnpm dev`));
  }

  /**
   * Generate instant.schema.ts
   */
  private async generateSchemaFile(projectPath: string, context: MegaContext) {
    // This would actually generate the full TS file content based on context.database.entities
    // For prototype, we generate a stub
    const schemaContent = `
import { i } from "@instantdb/react";

export const graph = i.graph(
  "${context.project.id}",
  {
    ${Object.entries(context.database.entities).map(([name, def]) => `${name}: i.entity({
      ${Object.keys(def.fields).map(f => `${f}: i.string()`).join(",\n      ")}
    })`).join(",\n    ")}
  }
);
    `;
    
    await fs.ensureDir(path.join(projectPath, "lib"));
    await fs.writeFile(path.join(projectPath, "lib", "instant.schema.ts"), schemaContent);
  }

  /**
   * Generate Next.js App Router structure
   */
  private async generateRoutes(projectPath: string, context: MegaContext) {
    const appDir = path.join(projectPath, "app");
    
    for (const [routePath, routeNode] of Object.entries(context.routing.routes)) {
        if (routeNode.type === "page") {
            const relativePath = routePath === "/" ? "" : routePath.slice(1); // remove leading slash
            const targetDir = path.join(appDir, relativePath);
            await fs.ensureDir(targetDir);
            
            const pageContent = `
export default function Page() {
  return (
    <div className="container mx-auto py-10">
      <h1 className="text-4xl font-bold">${routeNode.ui?.title || "Page"}</h1>
      <p className="mt-4 text-muted-foreground">${routeNode.ui?.description || ""}</p>
      {/* Components: ${routeNode.ui?.components?.map(c => c.name).join(", ")} */}
    </div>
  );
}
            `;
            await fs.writeFile(path.join(targetDir, "page.tsx"), pageContent);
        }
    }
  }
}
