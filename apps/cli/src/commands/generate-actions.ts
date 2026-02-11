import chalk from "chalk";
import * as fs from "fs-extra";
import path from "path";
import { CONTEXT_FILES } from "../constants/fileNames";
import { EnhancedSpinner } from "../utils/spinner";
import { logger } from "../utils/logger";
import { HybridAIClient } from "../utils/hybridAIClient";
import { Command } from "commander";

export interface ActionsOptions {
  output?: string;
  verbose?: boolean;
  includeSchema?: boolean;
}

interface UserAction {
  name: string;
  trigger: string;
  handler: string;
  description: string;
  backendHook: string;
  httpMethod?: string;
  payload?: string;
  response?: string;
}

interface SystemAction {
  name: string;
  trigger: string;
  implementation: string;
  description: string;
}

interface DbSchemaHint {
  table: string;
  fields: string[];
  relationships?: string[];
}

interface ActionsManifest {
  userActions: UserAction[];
  systemActions: SystemAction[];
  dbSchemaHints: DbSchemaHint[];
}

/**
 * Generate Actions Command
 * Creates a manifest of user/system actions needed to hook UI to backend/DB
 */
export class GenerateActionsCommand {
  private spinner: EnhancedSpinner;
  private aiClient: HybridAIClient;
  private contextDir: string;

  constructor() {
    this.spinner = new EnhancedSpinner("Loading context files...");
    this.aiClient = new HybridAIClient();
    this.contextDir = ".mycontext";
  }

  async execute(options: ActionsOptions = {}): Promise<void> {
    this.spinner.start();

    try {
      const context = await this.loadContext();

      if (!context.components && !context.features && !context.technicalSpecs) {
        this.spinner.fail("No context files found");
        console.log(chalk.yellow("\n💡 Generate components manifest first:"));
        console.log(chalk.cyan("   mycontext generate:components-manifest\n"));
        return;
      }

      this.spinner.updateText("Analyzing components and features for actions...");

      const prompt = this.buildActionsPrompt(context);

      this.spinner.updateText("Generating actions manifest with AI...");

      const response = await this.aiClient.generateText(prompt, {
        maxTokens: 8192,
        temperature: 0.3,
      });

      if (!response) {
        throw new Error("AI generation failed");
      }

      const actions = this.parseActionsResponse(response.text);
      const markdown = this.generateMarkdown(actions);

      const outputPath = options.output || path.join(this.contextDir, "04-actions.md");
      await fs.ensureDir(path.dirname(outputPath));
      await fs.writeFile(outputPath, markdown, "utf-8");

      // Also generate JSON
      const jsonPath = path.join(this.contextDir, "04-actions.json");
      await fs.writeFile(jsonPath, JSON.stringify(actions, null, 2), "utf-8");

      this.spinner.succeed("Actions manifest generated!");

      console.log(chalk.green(`\n✅ Actions manifest generated`));
      console.log(chalk.gray(`   User Actions: ${actions.userActions.length}`));
      console.log(chalk.gray(`   System Actions: ${actions.systemActions.length}`));
      console.log(chalk.gray(`   DB Tables: ${actions.dbSchemaHints.length}`));
      console.log(chalk.gray(`\n   Saved to: ${outputPath}\n`));

      // Print overview
      console.log(chalk.bold("🎬 User Actions Overview:"));
      actions.userActions.slice(0, 5).forEach(action => {
        console.log(chalk.cyan(`   ${action.name}`));
        console.log(chalk.gray(`      ${action.trigger} → ${action.backendHook}`));
      });
      if (actions.userActions.length > 5) {
        console.log(chalk.gray(`   ... and ${actions.userActions.length - 5} more`));
      }

      console.log(chalk.yellow("\n💡 Next Steps:"));
      console.log(chalk.gray("   1. Review actions and customize for your backend"));
      console.log(chalk.gray("   2. mycontext generate-components"));
      console.log(chalk.gray("   3. Implement backend endpoints"));

    } catch (error: any) {
      this.spinner.fail(`Failed to generate actions manifest: ${error.message}`);
      logger.error("Actions generation error:", error);
    }
  }

  private async loadContext(): Promise<{
    components?: string;
    screensList?: string;
    features?: string;
    technicalSpecs?: string;
    types?: string;
    userFlows?: string;
  }> {
    const context: any = {};
    const dir = this.contextDir;

    const files = [
      { key: "components", path: "03-components.md" },
      { key: "screensList", path: "02-screens-list.md" },
      { key: "features", path: "01a-features.md" },
      { key: "technicalSpecs", path: "01d-technical-specs.md" },
      { key: "types", path: "02-types.ts" },
      { key: "userFlows", path: "01b-user-flows.md" },
    ];

    for (const file of files) {
      const filePath = path.join(dir, file.path);
      if (await fs.pathExists(filePath)) {
        context[file.key] = await fs.readFile(filePath, "utf-8");
      }
    }

    return context;
  }

  private buildActionsPrompt(context: any): string {
    let prompt = `You are a full-stack architect. Analyze the following project context and extract ALL actions needed to connect the UI to backend/database.

Categorize actions as:
1. **User Actions**: Triggered by user interaction (clicks, form submits, etc.)
2. **System Actions**: Triggered by the system (timers, webhooks, background jobs)
3. **DB Schema Hints**: What database tables/fields are needed

For User Actions, provide:
- name: Action name (camelCase, e.g., "createTask")
- trigger: What triggers it (e.g., "Submit task form")
- handler: Frontend handler function name
- description: What it does
- backendHook: API endpoint (e.g., "POST /api/tasks")
- httpMethod: HTTP method
- payload: Request body shape
- response: Response shape

For System Actions, provide:
- name: Action name
- trigger: What triggers it (e.g., "Every 5 minutes", "On task create")
- implementation: Hook or function name
- description: What it does

For DB Schema Hints, provide:
- table: Table/collection name
- fields: Array of field names with types
- relationships: Foreign keys or references

OUTPUT FORMAT (JSON):
\`\`\`json
{
  "userActions": [
    {
      "name": "createTask",
      "trigger": "Submit create task form",
      "handler": "handleCreateTask",
      "description": "Creates a new task in the database",
      "backendHook": "POST /api/tasks",
      "httpMethod": "POST",
      "payload": "{ title: string, description?: string, priority: Priority }",
      "response": "{ id: string, ...task }"
    }
  ],
  "systemActions": [
    {
      "name": "autoSaveDraft",
      "trigger": "5 second debounce on form change",
      "implementation": "useDraftAutoSave()",
      "description": "Automatically saves form draft to localStorage"
    }
  ],
  "dbSchemaHints": [
    {
      "table": "tasks",
      "fields": ["id: string", "title: string", "completed: boolean", "userId: string", "createdAt: Date"],
      "relationships": ["userId -> users.id"]
    }
  ]
}
\`\`\`

PROJECT CONTEXT:
`;

    if (context.components) {
      prompt += `\n## Components (with actions needed):\n${context.components.substring(0, 3000)}\n`;
    }

    if (context.technicalSpecs) {
      prompt += `\n## Technical Specs (API endpoints):\n${context.technicalSpecs.substring(0, 2500)}\n`;
    }

    if (context.features) {
      prompt += `\n## Features:\n${context.features.substring(0, 2000)}\n`;
    }

    if (context.types) {
      prompt += `\n## TypeScript Types:\n${context.types.substring(0, 1500)}\n`;
    }

    if (context.userFlows) {
      prompt += `\n## User Flows:\n${context.userFlows.substring(0, 1500)}\n`;
    }

    prompt += `
Be comprehensive - include CRUD operations for all entities, auth actions, and any background processes.
Output ONLY the JSON object.`;

    return prompt;
  }

  private parseActionsResponse(response: string): ActionsManifest {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        logger.warn("Could not find JSON in response");
        return { userActions: [], systemActions: [], dbSchemaHints: [] };
      }

      const parsed = JSON.parse(jsonMatch[0]);
      return {
        userActions: (parsed.userActions || []).map((a: any) => ({
          name: a.name || "",
          trigger: a.trigger || "",
          handler: a.handler || a.name,
          description: a.description || "",
          backendHook: a.backendHook || "",
          httpMethod: a.httpMethod,
          payload: a.payload,
          response: a.response,
        })),
        systemActions: (parsed.systemActions || []).map((a: any) => ({
          name: a.name || "",
          trigger: a.trigger || "",
          implementation: a.implementation || "",
          description: a.description || "",
        })),
        dbSchemaHints: (parsed.dbSchemaHints || []).map((h: any) => ({
          table: h.table || "",
          fields: h.fields || [],
          relationships: h.relationships,
        })),
      };
    } catch (error) {
      logger.error("Failed to parse actions response:", error);
      return { userActions: [], systemActions: [], dbSchemaHints: [] };
    }
  }

  private generateMarkdown(actions: ActionsManifest): string {
    let md = `# Actions Manifest

> Complete list of actions needed to connect UI to backend/database.

## Summary

| Category | Count |
|----------|-------|
| User Actions | ${actions.userActions.length} |
| System Actions | ${actions.systemActions.length} |
| Database Tables | ${actions.dbSchemaHints.length} |

---

## User Actions

These are actions triggered by user interaction (clicks, form submits, etc.).

| Action | Trigger | Backend Hook | Method |
|--------|---------|--------------|--------|
`;

    actions.userActions.forEach(action => {
      md += `| \`${action.name}\` | ${action.trigger} | \`${action.backendHook}\` | ${action.httpMethod || "N/A"} |\n`;
    });

    md += `\n### Action Details\n\n`;

    actions.userActions.forEach(action => {
      md += `#### ${action.name}\n\n`;
      md += `- **Description**: ${action.description}\n`;
      md += `- **Trigger**: ${action.trigger}\n`;
      md += `- **Handler**: \`${action.handler}\`\n`;
      md += `- **Backend**: \`${action.backendHook}\`\n`;
      if (action.payload) {
        md += `- **Payload**: \`${action.payload}\`\n`;
      }
      if (action.response) {
        md += `- **Response**: \`${action.response}\`\n`;
      }
      md += `\n`;
    });

    md += `---\n\n## System Actions\n\nThese are actions triggered by the system (timers, webhooks, background jobs).\n\n`;

    if (actions.systemActions.length === 0) {
      md += `*No system actions identified*\n\n`;
    } else {
      md += `| Action | Trigger | Implementation |\n|--------|---------|----------------|\n`;
      actions.systemActions.forEach(action => {
        md += `| \`${action.name}\` | ${action.trigger} | \`${action.implementation}\` |\n`;
      });
      md += `\n`;
    }

    md += `---\n\n## Database Schema Hints\n\nBased on the actions above, you'll need these database structures:\n\n`;

    if (actions.dbSchemaHints.length === 0) {
      md += `*No specific schema hints generated*\n\n`;
    } else {
      actions.dbSchemaHints.forEach(hint => {
        md += `### \`${hint.table}\`\n\n`;
        md += `**Fields**:\n`;
        hint.fields.forEach(field => {
          md += `- \`${field}\`\n`;
        });
        if (hint.relationships && hint.relationships.length > 0) {
          md += `\n**Relationships**:\n`;
          hint.relationships.forEach(rel => {
            md += `- ${rel}\n`;
          });
        }
        md += `\n`;
      });
    }

    md += `---
*Generated by MyContext CLI*
*Last updated: ${new Date().toISOString()}*
`;

    return md;
  }
}

export function registerGenerateActionsCommand(program: Command): void {
  program
    .command("generate:actions")
    .alias("ga")
    .description("Generate actions manifest for connecting UI to backend/database")
    .option("-o, --output <path>", "Output file path", ".mycontext/04-actions.md")
    .option("-v, --verbose", "Enable verbose logging")
    .option("--include-schema", "Include detailed DB schema suggestions")
    .action(async (options: ActionsOptions) => {
      const command = new GenerateActionsCommand();
      await command.execute(options);
    });
}
