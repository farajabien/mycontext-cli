import chalk from "chalk";
import * as fs from "fs-extra";
import path from "path";
import { CONTEXT_FILES } from "../constants/fileNames";
import { EnhancedSpinner } from "../utils/spinner";
import { logger } from "../utils/logger";
import { HybridAIClient } from "../utils/hybridAIClient";
import { Command } from "commander";

export interface ComponentsManifestOptions {
  output?: string;
  verbose?: boolean;
  format?: "markdown" | "json";
  includeDemo?: boolean;
}

interface ComponentManifest {
  name: string;
  type: "layout" | "display" | "interactive" | "form" | "navigation";
  description: string;
  props: PropDefinition[];
  sampleData: Record<string, any>;
  actions: string[];
  usedInScreens: string[];
}

interface PropDefinition {
  name: string;
  type: string;
  required: boolean;
  description: string;
  sampleValue: any;
}

/**
 * Generate Components Manifest Command
 * Creates typed component list with props, sample data, and required actions
 */
export class GenerateComponentsManifestCommand {
  private spinner: EnhancedSpinner;
  private aiClient: HybridAIClient;
  private contextDir: string;

  constructor() {
    this.spinner = new EnhancedSpinner("Loading context files...");
    this.aiClient = new HybridAIClient();
    this.contextDir = ".mycontext";
  }

  async execute(options: ComponentsManifestOptions = {}): Promise<void> {
    this.spinner.start();

    try {
      const context = await this.loadContext();

      if (!context.screensList && !context.features && !context.types) {
        this.spinner.fail("No context files found");
        console.log(chalk.yellow("\n💡 Generate screens list first:"));
        console.log(chalk.cyan("   mycontext generate:screens-list\n"));
        return;
      }

      this.spinner.updateText("Analyzing screens and types for components...");

      const prompt = this.buildComponentsPrompt(context);

      this.spinner.updateText("Generating components manifest with AI...");

      const response = await this.aiClient.generateText(prompt, {
        maxTokens: 8192,
        temperature: 0.3,
      });

      if (!response) {
        throw new Error("AI generation failed");
      }

      const components = this.parseComponentsResponse(response.text);
      const markdown = this.generateMarkdown(components);

      const outputPath = options.output || path.join(this.contextDir, "03-components.md");
      await fs.ensureDir(path.dirname(outputPath));
      await fs.writeFile(outputPath, markdown, "utf-8");

      // Also generate JSON for programmatic use
      const jsonPath = path.join(this.contextDir, "03-components.json");
      await fs.writeFile(jsonPath, JSON.stringify(components, null, 2), "utf-8");

      this.spinner.succeed("Components manifest generated!");

      console.log(chalk.green(`\n✅ Generated ${components.length} component definitions`));
      console.log(chalk.gray(`   Markdown: ${outputPath}`));
      console.log(chalk.gray(`   JSON: ${jsonPath}\n`));

      // Print summary by type
      const byType = this.groupByType(components);
      console.log(chalk.bold("🧩 Components by Type:"));
      Object.entries(byType).forEach(([type, comps]) => {
        console.log(chalk.cyan(`   ${type}: ${comps.length}`));
      });

      console.log(chalk.yellow("\n💡 Next Steps:"));
      console.log(chalk.gray("   1. mycontext generate actions"));
      console.log(chalk.gray("   2. mycontext generate-components"));

    } catch (error: any) {
      this.spinner.fail(`Failed to generate components manifest: ${error.message}`);
      logger.error("Components manifest generation error:", error);
    }
  }

  private async loadContext(): Promise<{
    screensList?: string;
    features?: string;
    userFlows?: string;
    types?: string;
    prd?: string;
    screenshotContext?: string;
  }> {
    const context: any = {};
    const dir = this.contextDir;

    const files = [
      { key: "screensList", path: "02-screens-list.md" },
      { key: "features", path: "01a-features.md" },
      { key: "userFlows", path: "01b-user-flows.md" },
      { key: "types", path: "02-types.ts" },
      { key: "prd", path: CONTEXT_FILES.PRD },
      { key: "screenshotContext", path: "context.md" },
    ];

    for (const file of files) {
      const filePath = path.join(dir, file.path);
      if (await fs.pathExists(filePath)) {
        context[file.key] = await fs.readFile(filePath, "utf-8");
      }
    }

    return context;
  }

  private buildComponentsPrompt(context: any): string {
    let prompt = `You are a React component architect. Analyze the following project context and define ALL UI components needed.

For each component, provide:
1. Name (PascalCase, e.g., "TaskCard", "UserAvatar")
2. Type (layout|display|interactive|form|navigation)
3. Description (what it does)
4. Props with types and sample values
5. Actions/callbacks it needs
6. Which screens use it

OUTPUT FORMAT (JSON array):
\`\`\`json
[
  {
    "name": "TaskCard",
    "type": "display",
    "description": "Displays a single task with title, status, and actions",
    "props": [
      {
        "name": "task",
        "type": "Task",
        "required": true,
        "description": "The task data to display",
        "sampleValue": { "id": "1", "title": "Buy groceries", "completed": false }
      },
      {
        "name": "onComplete",
        "type": "(id: string) => void",
        "required": true,
        "description": "Callback when task is marked complete",
        "sampleValue": "() => console.log('completed')"
      }
    ],
    "sampleData": {
      "task": { "id": "1", "title": "Sample Task", "completed": false, "priority": "high" }
    },
    "actions": ["onComplete", "onEdit", "onDelete"],
    "usedInScreens": ["DashboardScreen", "TaskListScreen"]
  }
]
\`\`\`

PROJECT CONTEXT:
`;

    if (context.screensList) {
      prompt += `\n## Screens List:\n${context.screensList.substring(0, 2500)}\n`;
    }

    if (context.types) {
      prompt += `\n## TypeScript Types:\n${context.types.substring(0, 2000)}\n`;
    }

    if (context.features) {
      prompt += `\n## Features:\n${context.features.substring(0, 2000)}\n`;
    }

    if (context.screenshotContext) {
      prompt += `\n## Design Reference:\n${context.screenshotContext.substring(0, 1500)}\n`;
    }

    prompt += `
Include components for:
- Layout (Header, Footer, Sidebar, Container)
- Navigation (NavBar, TabBar, Breadcrumbs)
- Data Display (Cards, Lists, Tables, Charts)
- Forms (Input, Select, DatePicker, FormField)
- Feedback (Alert, Toast, Modal, Loading)
- Interactive (Button, Dropdown, Toggle)

Output ONLY the JSON array.`;

    return prompt;
  }

  private parseComponentsResponse(response: string): ComponentManifest[] {
    try {
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        logger.warn("Could not find JSON in response");
        return [];
      }

      const components = JSON.parse(jsonMatch[0]);
      return components.map((c: any) => ({
        name: c.name || "UnnamedComponent",
        type: c.type || "display",
        description: c.description || "",
        props: (c.props || []).map((p: any) => ({
          name: p.name,
          type: p.type || "any",
          required: p.required ?? true,
          description: p.description || "",
          sampleValue: p.sampleValue,
        })),
        sampleData: c.sampleData || {},
        actions: c.actions || [],
        usedInScreens: c.usedInScreens || [],
      }));
    } catch (error) {
      logger.error("Failed to parse components response:", error);
      return [];
    }
  }

  private groupByType(components: ComponentManifest[]): Record<string, ComponentManifest[]> {
    return components.reduce((acc, comp) => {
      const type = comp.type || "other";
      if (!acc[type]) acc[type] = [];
      acc[type].push(comp);
      return acc;
    }, {} as Record<string, ComponentManifest[]>);
  }

  private generateMarkdown(components: ComponentManifest[]): string {
    let md = `# Components Manifest

> Auto-generated component specifications with props and sample data.
> Total: ${components.length} components

## Overview

| Component | Type | Props | Actions | Used In |
|-----------|------|-------|---------|---------|
`;

    components.forEach(comp => {
      md += `| ${comp.name} | ${comp.type} | ${comp.props.length} | ${comp.actions.length} | ${comp.usedInScreens.length} screens |\n`;
    });

    md += `\n---\n\n## Component Specifications\n\n`;

    const byType = this.groupByType(components);
    
    for (const [type, comps] of Object.entries(byType)) {
      md += `### ${type.charAt(0).toUpperCase() + type.slice(1)} Components\n\n`;
      
      for (const comp of comps) {
        md += `#### ${comp.name}\n\n`;
        md += `**Description**: ${comp.description}\n\n`;
        md += `**Used in**: ${comp.usedInScreens.join(", ") || "N/A"}\n\n`;

        md += `**Props**:\n\`\`\`typescript\ninterface ${comp.name}Props {\n`;
        comp.props.forEach(prop => {
          md += `  ${prop.name}${prop.required ? "" : "?"}: ${prop.type}; // ${prop.description}\n`;
        });
        md += `}\n\`\`\`\n\n`;

        if (Object.keys(comp.sampleData).length > 0) {
          md += `**Sample Data**:\n\`\`\`json\n${JSON.stringify(comp.sampleData, null, 2)}\n\`\`\`\n\n`;
        }

        if (comp.actions.length > 0) {
          md += `**Actions Required**: ${comp.actions.map(a => `\`${a}\``).join(", ")}\n\n`;
        }

        md += `---\n\n`;
      }
    }

    md += `\n---
*Generated by MyContext CLI*
*Last updated: ${new Date().toISOString()}*
`;

    return md;
  }
}

export function registerGenerateComponentsManifestCommand(program: Command): void {
  program
    .command("generate:components-manifest")
    .alias("gcm")
    .description("Generate component specifications with props, sample data, and actions")
    .option("-o, --output <path>", "Output file path", ".mycontext/03-components.md")
    .option("-v, --verbose", "Enable verbose logging")
    .option("--include-demo", "Include demo/sample data for each component")
    .action(async (options: ComponentsManifestOptions) => {
      const command = new GenerateComponentsManifestCommand();
      await command.execute(options);
    });
}
