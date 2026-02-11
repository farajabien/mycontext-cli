import chalk from "chalk";
import * as fs from "fs-extra";
import path from "path";
import { CONTEXT_FILES } from "../constants/fileNames";
import { EnhancedSpinner } from "../utils/spinner";
import { logger } from "../utils/logger";
import { HybridAIClient } from "../utils/hybridAIClient";
import { Command } from "commander";

export interface ScreensListOptions {
  output?: string;
  verbose?: boolean;
  format?: "markdown" | "json";
}

interface Screen {
  name: string;
  route: string;
  description: string;
  components: string[];
  userFlowSteps: string[];
  sampleDataNeeds: string[];
  designNotes?: string;
}

/**
 * Generate Screens List Command
 * Extracts screens from user flows and creates structured list with routes, components, and demo data needs
 */
export class GenerateScreensListCommand {
  private spinner: EnhancedSpinner;
  private aiClient: HybridAIClient;
  private contextDir: string;

  constructor() {
    this.spinner = new EnhancedSpinner("Loading context files...");
    this.aiClient = new HybridAIClient();
    this.contextDir = ".mycontext";
  }

  async execute(options: ScreensListOptions = {}): Promise<void> {
    this.spinner.start();

    try {
      // Load existing context files
      const context = await this.loadContext();

      if (!context.userFlows && !context.features && !context.prd) {
        this.spinner.fail("No context files found");
        console.log(chalk.yellow("\n💡 Generate context first:"));
        console.log(chalk.cyan("   mycontext generate context --full\n"));
        return;
      }

      this.spinner.updateText("Analyzing user flows for screens...");

      // Build the AI prompt
      const prompt = this.buildScreensPrompt(context);

      this.spinner.updateText("Generating screens list with AI...");

      // Generate with AI
      const response = await this.aiClient.generateText(prompt, {
        maxTokens: 8192,
        temperature: 0.3, // Lower temperature for structured output
      });

      if (!response) {
        throw new Error("AI generation failed");
      }

      // Parse the response
      const screens = this.parseScreensResponse(response.text);

      // Generate markdown output
      const markdown = this.generateMarkdown(screens, context);

      // Write to file
      const outputPath = options.output || path.join(this.contextDir, "02-screens-list.md");
      await fs.ensureDir(path.dirname(outputPath));
      await fs.writeFile(outputPath, markdown, "utf-8");

      this.spinner.succeed("Screens list generated!");

      console.log(chalk.green(`\n✅ Generated ${screens.length} screens`));
      console.log(chalk.gray(`   Saved to: ${outputPath}\n`));

      // Print summary
      console.log(chalk.bold("📱 Screens Overview:"));
      screens.forEach((screen, idx) => {
        console.log(chalk.cyan(`   ${idx + 1}. ${screen.name}`));
        console.log(chalk.gray(`      Route: ${screen.route}`));
        console.log(chalk.gray(`      Components: ${screen.components.slice(0, 3).join(", ")}${screen.components.length > 3 ? "..." : ""}`));
      });

      console.log(chalk.yellow("\n💡 Next Steps:"));
      console.log(chalk.gray("   1. mycontext generate components-manifest"));
      console.log(chalk.gray("   2. mycontext generate actions"));

    } catch (error: any) {
      this.spinner.fail(`Failed to generate screens list: ${error.message}`);
      logger.error("Screens list generation error:", error);
    }
  }

  private async loadContext(): Promise<{
    prd?: string;
    features?: string;
    userFlows?: string;
    edgeCases?: string;
    technicalSpecs?: string;
    types?: string;
    screenshotContext?: string;
  }> {
    const context: any = {};
    const contextDir = this.contextDir;

    // Load PRD
    const prdPath = path.join(contextDir, CONTEXT_FILES.PRD);
    if (await fs.pathExists(prdPath)) {
      context.prd = await fs.readFile(prdPath, "utf-8");
    }

    // Load features (01a)
    const featuresPath = path.join(contextDir, "01a-features.md");
    if (await fs.pathExists(featuresPath)) {
      context.features = await fs.readFile(featuresPath, "utf-8");
    }

    // Load user flows (01b)
    const flowsPath = path.join(contextDir, "01b-user-flows.md");
    if (await fs.pathExists(flowsPath)) {
      context.userFlows = await fs.readFile(flowsPath, "utf-8");
    }

    // Load edge cases (01c)
    const edgeCasesPath = path.join(contextDir, "01c-edge-cases.md");
    if (await fs.pathExists(edgeCasesPath)) {
      context.edgeCases = await fs.readFile(edgeCasesPath, "utf-8");
    }

    // Load technical specs (01d)
    const techSpecsPath = path.join(contextDir, "01d-technical-specs.md");
    if (await fs.pathExists(techSpecsPath)) {
      context.technicalSpecs = await fs.readFile(techSpecsPath, "utf-8");
    }

    // Load types (02-types.ts)
    const typesPath = path.join(contextDir, "02-types.ts");
    if (await fs.pathExists(typesPath)) {
      context.types = await fs.readFile(typesPath, "utf-8");
    }

    // Load screenshot-derived context
    const screenshotContextPath = path.join(contextDir, "context.md");
    if (await fs.pathExists(screenshotContextPath)) {
      context.screenshotContext = await fs.readFile(screenshotContextPath, "utf-8");
    }

    return context;
  }

  private buildScreensPrompt(context: any): string {
    let prompt = `You are a UI/UX architect. Analyze the following project context and extract ALL screens needed for this application.

For each screen, provide:
1. Name (PascalCase, e.g., "DashboardScreen", "TaskDetailScreen")
2. Route (URL path, e.g., "/dashboard", "/tasks/:id")
3. Brief description (1-2 sentences)
4. Components needed (list of component names)
5. User flow steps that involve this screen
6. Sample data needs (what data this screen displays/edits)

OUTPUT FORMAT (JSON array):
\`\`\`json
[
  {
    "name": "DashboardScreen",
    "route": "/dashboard",
    "description": "Main dashboard showing overview and quick actions",
    "components": ["Header", "MetricCards", "TaskList", "QuickActions"],
    "userFlowSteps": ["User lands here after login", "Can navigate to all main sections"],
    "sampleDataNeeds": ["User stats", "Recent tasks", "Notifications count"]
  }
]
\`\`\`

PROJECT CONTEXT:
`;

    if (context.prd) {
      prompt += `\n## PRD:\n${context.prd.substring(0, 2000)}\n`;
    }

    if (context.features) {
      prompt += `\n## Features:\n${context.features.substring(0, 3000)}\n`;
    }

    if (context.userFlows) {
      prompt += `\n## User Flows:\n${context.userFlows.substring(0, 3000)}\n`;
    }

    if (context.technicalSpecs) {
      prompt += `\n## Technical Specs (API endpoints):\n${context.technicalSpecs.substring(0, 2000)}\n`;
    }

    if (context.screenshotContext) {
      prompt += `\n## Design Reference (from screenshot):\n${context.screenshotContext.substring(0, 1500)}\n`;
    }

    prompt += `
Be comprehensive - include ALL screens including:
- Authentication screens (login, register, forgot password)
- Main navigation screens (dashboard, home)
- CRUD screens for each entity (list, detail, create, edit)
- Settings and profile screens
- Error and empty state screens

Output ONLY the JSON array, no explanation.`;

    return prompt;
  }

  private parseScreensResponse(response: string): Screen[] {
    try {
      // Extract JSON from response
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        logger.warn("Could not find JSON in response, attempting to parse entire response");
        return [];
      }

      const screens = JSON.parse(jsonMatch[0]);
      return screens.map((s: any) => ({
        name: s.name || "UnnamedScreen",
        route: s.route || "/",
        description: s.description || "",
        components: s.components || [],
        userFlowSteps: s.userFlowSteps || [],
        sampleDataNeeds: s.sampleDataNeeds || [],
        designNotes: s.designNotes,
      }));
    } catch (error) {
      logger.error("Failed to parse screens response:", error);
      return [];
    }
  }

  private generateMarkdown(screens: Screen[], context: any): string {
    let md = `# Screens List

> Auto-generated from project context. ${screens.length} screens identified.

## Overview

| # | Screen | Route | Components |
|---|--------|-------|------------|
`;

    screens.forEach((screen, idx) => {
      md += `| ${idx + 1} | ${screen.name} | \`${screen.route}\` | ${screen.components.length} |\n`;
    });

    md += `\n---\n\n## Screen Details\n\n`;

    screens.forEach((screen, idx) => {
      md += `### ${idx + 1}. ${screen.name}\n\n`;
      md += `**Route**: \`${screen.route}\`\n\n`;
      md += `**Description**: ${screen.description}\n\n`;

      md += `**Components**:\n`;
      screen.components.forEach(comp => {
        md += `- ${comp}\n`;
      });

      md += `\n**User Flow Steps**:\n`;
      screen.userFlowSteps.forEach(step => {
        md += `- ${step}\n`;
      });

      md += `\n**Sample Data Needs**:\n`;
      screen.sampleDataNeeds.forEach(data => {
        md += `- ${data}\n`;
      });

      if (screen.designNotes) {
        md += `\n**Design Notes**: ${screen.designNotes}\n`;
      }

      md += `\n---\n\n`;
    });

    md += `\n---
*Generated by MyContext CLI*
*Last updated: ${new Date().toISOString()}*
`;

    return md;
  }
}

// Register the command
export function registerGenerateScreensListCommand(program: Command): void {
  program
    .command("generate:screens-list")
    .alias("gsl")
    .description("Generate a structured list of screens from user flows and context")
    .option("-o, --output <path>", "Output file path", ".mycontext/02-screens-list.md")
    .option("-v, --verbose", "Enable verbose logging")
    .option("-f, --format <format>", "Output format (markdown|json)", "markdown")
    .action(async (options: ScreensListOptions) => {
      const command = new GenerateScreensListCommand();
      await command.execute(options);
    });
}
