import { Command } from "commander";
import chalk from "chalk";
import * as fs from "fs-extra";
import path from "path";
import { HybridAIClient } from "../utils/hybridAIClient";
import { EnhancedSpinner } from "../utils/spinner";
import { CONTEXT_FILES, REQUIRED_FILES, getAllFileNameVariants } from "../constants/fileNames";

interface CompilePRDOptions {
  projectPath?: string;
  verbose?: boolean;
  force?: boolean;
}

export class CompilePRDCommand {
  private aiClient: HybridAIClient;

  constructor() {
    this.aiClient = new HybridAIClient();
  }

  async execute(options: CompilePRDOptions): Promise<void> {
    const projectPath = options.projectPath || process.cwd();
    const contextDir = path.join(projectPath, ".mycontext");

    console.log(chalk.blue.bold("🧠 Compiling PRD from User-Centric Context"));
    console.log(
      chalk.gray(
        "Compiling comprehensive PRD from user interaction documentation...\n"
      )
    );

    // Check if context files exist
    const contextFiles = await this.checkContextFiles(contextDir);
    if (contextFiles.missing.length > 0) {
      console.error(
        chalk.red("❌ Missing required user interaction context files:")
      );
      contextFiles.missing.forEach((file) =>
        console.error(chalk.gray(`   • ${file}`))
      );
      console.error(
        chalk.red(
          "\nPlease run 'mycontext generate-context-files' to create user interaction documentation."
        )
      );
      console.error(
        chalk.gray(
          "💡 Tip: Review and edit the context files first - this is why MyContext works!"
        )
      );
      console.error(
        chalk.gray(
          "Add missing business logic, correct AI mistakes, and clarify requirements.\n"
        )
      );
      return;
    }

    // Check if PRD already exists
    const prdPath = path.join(contextDir, CONTEXT_FILES.PRD);
    if ((await fs.pathExists(prdPath)) && !options.force) {
      console.log(
        chalk.yellow(`⚠️  PRD already exists at .mycontext/${CONTEXT_FILES.PRD}`)
      );
      console.log(chalk.yellow("Use --force to overwrite existing PRD.\n"));
      return;
    }

    try {
      // Read context files
      const contextData = await this.readContextFiles(
        contextDir,
        contextFiles.existing,
        contextFiles.mapping
      );

      // Show file mapping if any alternative files were used
      const alternativeMappings = Object.entries(contextFiles.mapping).filter(
        ([expected, actual]) => expected !== actual
      );
      if (alternativeMappings.length > 0) {
        console.log(chalk.blue("📁 File Mapping Used:"));
        alternativeMappings.forEach(([expected, actual]) => {
          console.log(chalk.gray(`   ${expected} ← ${actual}`));
        });
        console.log("");
      }

      // Generate PRD
      await this.generatePRD(contextDir, contextData, contextFiles.mapping);

      console.log(chalk.green.bold("\n✅ PRD Compiled Successfully!"));
      console.log(chalk.gray("\nGenerated file:"));
      console.log(
        chalk.gray("  • 02-prd.md - User-Centric Product Requirements Document")
      );

      console.log(
        chalk.blue.bold("\n🧠 Next Steps (Human-in-the-Loop Workflow):")
      );
      console.log(chalk.gray("1. 📖 Review the compiled PRD for accuracy"));
      console.log(
        chalk.gray("2. ✏️ Edit PRD to correct any AI misunderstandings")
      );
      console.log(chalk.gray("3. 🎯 Add missing business requirements"));
      console.log(chalk.gray("4. 🔍 Clarify ambiguous areas"));
      console.log(
        chalk.gray("5. 💡 This step ensures perfect components later!")
      );
      console.log(
        chalk.gray(
          "6. Run 'mycontext generate types' to generate TypeScript types from your corrected PRD"
        )
      );
      console.log(
        chalk.gray(
          "7. Run 'mycontext generate brand-kit' to create brand guidelines"
        )
      );
      console.log(
        chalk.gray(
          "8. Run 'mycontext generate components-list' to plan components"
        )
      );
      console.log(
        chalk.gray(
          "9. Run 'mycontext generate-components all --with-tests' to generate components"
        )
      );
    } catch (error) {
      console.error(chalk.red("❌ PRD compilation failed:"), error);
      throw error;
    }
  }

  private async checkContextFiles(contextDir: string): Promise<{
    existing: string[];
    missing: string[];
    mapping: Record<string, string>;
  }> {
    const existing: string[] = [];
    const missing: string[] = [];
    const mapping: Record<string, string> = {};

    // Use standardized required files
    const requiredFiles = REQUIRED_FILES.COMPILE_PRD;

    // Check for each required file and its variants
    for (const canonicalFile of requiredFiles) {
      const variants = getAllFileNameVariants(canonicalFile);
      let found = false;

      for (const variant of variants) {
        if (await fs.pathExists(path.join(contextDir, variant))) {
          existing.push(canonicalFile);
          mapping[canonicalFile] = variant;
          found = true;
          break;
        }
      }

      if (!found) {
        missing.push(canonicalFile);
      }
    }

    return { existing, missing, mapping };
  }

  private async readContextFiles(
    contextDir: string,
    files: string[],
    mapping: Record<string, string>
  ): Promise<Record<string, string>> {
    const contextData: Record<string, string> = {};

    for (const file of files) {
      const actualFile = mapping[file] || file;
      const filePath = path.join(contextDir, actualFile);
      const content = await fs.readFile(filePath, "utf-8");
      contextData[file] = content;
    }

    return contextData;
  }

  private async generatePRD(
    contextDir: string,
    contextData: Record<string, string>,
    mapping: Record<string, string>
  ): Promise<void> {
    const spinner = new EnhancedSpinner("Compiling PRD from context files...");
    spinner.start();

    try {
      const prompt = this.buildPRDPrompt(contextData);
      const response = await this.aiClient.generateText(prompt, {
        temperature: 0.7,
        maxTokens: 4000,
      });

      const content = this.formatPRDContent(
        response.text,
        contextData,
        mapping
      );
      await fs.writeFile(path.join(contextDir, CONTEXT_FILES.PRD), content);

      spinner.succeed("PRD compiled");
    } catch (error) {
      spinner.fail("PRD compilation failed");
      throw error;
    }
  }

  private buildPRDPrompt(contextData: Record<string, string>): string {
    const features = contextData["01a-features.md"] || "";
    const userFlows = contextData["01b-user-flows.md"] || "";
    const edgeCases = contextData["01c-edge-cases.md"] || "";
    const technicalSpecs = contextData["01d-technical-specs.md"] || "";

    return `You are a product manager creating a comprehensive Product Requirements Document (PRD) by compiling user-centric context documentation.

Create a well-structured PRD that synthesizes the following user interaction documentation:

## User Interaction Documentation:
${features}

## User Journey Flows:
${userFlows}

## User Error Scenarios:
${edgeCases}

## User-Centric Technical Implementation:
${technicalSpecs}

Generate a comprehensive PRD that includes:

1. **Executive Summary** - High-level project overview and objectives
2. **Product Overview** - What we're building and why
3. **Target Users** - User personas and target audience
4. **Core Features** - Primary functionality organized by priority
5. **User Stories** - Detailed user stories with acceptance criteria
6. **User Experience** - Key user flows and interaction patterns
7. **Technical Requirements** - Architecture, technology stack, and constraints
8. **Non-Functional Requirements** - Performance, security, accessibility
9. **Success Metrics** - How we measure success
10. **Timeline and Milestones** - Development phases and deliverables
11. **Risks and Mitigation** - Potential issues and solutions
12. **Dependencies** - External dependencies and integrations

Ensure the PRD is:
- Comprehensive yet concise
- Well-organized with clear sections
- Includes specific, measurable requirements
- Addresses both functional and non-functional needs
- Provides clear guidance for development teams

Format the output as a professional markdown document with clear headings, bullet points, and structured content.`;
  }

  private formatPRDContent(
    response: string,
    contextData: Record<string, string>,
    mapping: Record<string, string>
  ): string {
    const timestamp = new Date().toISOString();
    const contextFiles = Object.keys(contextData).join(", ");

    return `# Product Requirements Document (PRD)

${response}

---

## Document Information

- **Generated**: ${timestamp}
- **Source Context Files**: ${contextFiles}
- **Generated by**: MyContext CLI - AI-powered component generation platform
- **Version**: 1.0

## Context File References

This PRD was compiled from the following context files:
${Object.keys(contextData)
  .map((file) => {
    const actualFile = mapping[file] || file;
    const description = this.getContextFileDescription(file);
    return actualFile !== file
      ? `- \`${file}\` (from \`${actualFile}\`) - ${description}`
      : `- \`${file}\` - ${description}`;
  })
  .join("\n")}

---
*This document serves as the single source of truth for product requirements and should be updated as the project evolves.*
`;
  }

  private getContextFileDescription(filename: string): string {
    const descriptions: Record<string, string> = {
      "01a-features.md": "User actions and system responses documentation",
      "01b-user-flows.md": "Complete user journey interactions and flows",
      "01c-edge-cases.md": "User error scenarios and recovery documentation",
      "01d-technical-specs.md":
        "Technical implementation supporting user experience",
    };

    return descriptions[filename] || "User-centric context file";
  }
}
