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

    // Visual Roadmap
    console.log(chalk.cyan("\n📋 Execution Plan:"));
    console.log(chalk.gray("  1. Bootstrap Next.js + InstantDB"));
    console.log(chalk.gray("  2. Install InstantDB SDK"));
    console.log(chalk.gray("  3. Generate InstantDB Schema"));
    console.log(chalk.gray("  4. Generate Route Structure"));
    console.log(chalk.gray("  5. Persist Living Brain (.mycontext)"));
    console.log(""); 

    // 1. Framework Scaffold (Next.js)
    if (!fs.existsSync(projectPath)) {
        this.spinner.updateText("[1/5] Bootstrapping Next.js + InstantDB...");
        this.spinner.start();
        try {
            // Using a more deterministic install command (pnpm dlx create-next-app)
            // We use --no-eslint --no-tailwind --no-src-dir etc to have full control? 
            // For now, let's stick to standard recommended setup but fast
            execSync(`pnpm dlx create-next-app@latest ${context.project.name} --typescript --tailwind --eslint --app --no-src-dir --import-alias "@/*" --use-pnpm`, {
                stdio: "ignore" 
            });
            this.spinner.success({ text: "[1/5] Next.js shell created." });
        } catch (e) {
            this.spinner.error({ text: "Failed to scaffold Next.js app." });
            throw e;
        }
    } else {
        console.log(chalk.yellow("  [1/5] Directory exists, skipping scaffold."));
    }

    // 2. Install InstantDB
    this.spinner.updateText("[2/5] Installing InstantDB SDK...");
    this.spinner.start();
    execSync("pnpm add @instantdb/react @instantdb/admin", { cwd: projectPath, stdio: "ignore" });
    this.spinner.success({ text: "[2/5] InstantDB SDK installed." });

    // 3. Generate Schema
    this.spinner.updateText("[3/5] Generating InstantDB Schema...");
    this.spinner.start();
    await this.generateSchemaFile(projectPath, context);
    this.spinner.success({ text: "[3/5] Schema generated from MegaContext." });

    // 4. Generate Routes & Pages
    this.spinner.updateText("[4/5] Generating Route Structure...");
    this.spinner.start();
    await this.generateRoutes(projectPath, context);
    this.spinner.success({ text: "[4/5] Routes & Layouts generated." });

    // 5. Persist "Living Brain"
    this.spinner.updateText("[5/5] Initializing Living Brain (.mycontext)...");
    this.spinner.start();
    await this.saveContext(projectPath, context);
    await this.createAlign(projectPath);
    await this.createReadme(projectPath, context);
    await this.createEnvFile(projectPath);
    this.spinner.success({ text: "[5/5] Context, Utils, & .env saved." });

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

  // ... existing methods ...

  /**
   * Create .env file with API keys
   */
  private async createEnvFile(projectPath: string) {
      // Collect specific keys we care about
      const keys = [];
      if (process.env.GEMINI_API_KEY) keys.push(`GEMINI_API_KEY=${process.env.GEMINI_API_KEY}`);
      if (process.env.GOOGLE_API_KEY) keys.push(`GOOGLE_API_KEY=${process.env.GOOGLE_API_KEY}`);
      if (process.env.OPENROUTER_API_KEY) keys.push(`OPENROUTER_API_KEY=${process.env.OPENROUTER_API_KEY}`);
      
      // Default InstantDB App ID (Placeholder)
      keys.push(`NEXT_PUBLIC_INSTANT_APP_ID=${process.env.NEXT_PUBLIC_INSTANT_APP_ID || "YOUR_APP_ID_HERE"}`);

      if (keys.length > 0) {
          await fs.writeFile(path.join(projectPath, ".env"), keys.join("\n"));
      }
  }





  /**
   * Save the MegaContext to .mycontext/context.json
   */
  private async saveContext(projectPath: string, context: MegaContext) {
      const contextDir = path.join(projectPath, ".mycontext");
      await fs.ensureDir(contextDir);
      await fs.writeJSON(path.join(contextDir, "context.json"), context, { spaces: 2 });
  }

  /**
   * Create the .mycontext/ALIGN file
   */
  private async createAlign(projectPath: string) {
      const alignContent = `# MyContext Alignment Guard [SYNC]
Any changes to code, architecture, or features MUST be synchronized with:
1. \`.mycontext/context.json\` (Source of Truth / Living Brain)
2. \`README.md\` (Human-facing orientation & usage)

[PHILOSOPHY: DETERMINISTIC SCAFFOLDING]:
- **Next.js + InstantDB First**: We are built for Next.js full-stack projects using InstantDB as the backend.
- **Mega Context (100% Knowledge)**:
- Before ANY code is generated, the MegaContext must be 100% populated.

[PROJECT SCANNER — CONTEXT SYNC]:
- Run \`mycontext scan --assess\` to compare actual code against planned context.json.
- Identifies routes/components/entities in code but missing from context, and vice versa.
- Use during development to keep context.json aligned with reality.
`;
      const contextDir = path.join(projectPath, ".mycontext");
      await fs.ensureDir(contextDir);
      await fs.writeFile(path.join(contextDir, "ALIGN"), alignContent);
  }

  /**
   * Generate a README.md based on the context
   */
  private async createReadme(projectPath: string, context: MegaContext) {
      const readmeContent = `# ${context.project.name}

${context.project.description}

## Tech Stack
- **Framework**: Next.js (App Router)
- **Backend**: InstantDB
- **Styling**: TailwindCSS + ShadCN

## Computed Architecture
- **Roles**: ${context.auth.roles.map(r => r.name).join(", ")}
- **Entities**: ${Object.keys(context.database.entities).join(", ")}
- **Routes**: ${Object.keys(context.routing.routes).join(", ")}

## Getting Started

\`\`\`bash
pnpm install
pnpm dev
\`\`\`

Generated by MyContext CLI 🚀
`;
      await fs.writeFile(path.join(projectPath, "README.md"), readmeContent);
  }
}
