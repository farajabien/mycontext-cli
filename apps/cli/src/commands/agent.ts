import chalk from "chalk";
import * as fs from "fs-extra";
import path from "path";
import { CommandOptions } from "../types";
import { DesignManifestManager } from "@mycontext/core";
import { HybridAIClient } from "../utils/hybridAIClient";
import { EnhancedSpinner } from "../utils/spinner";
import { DesignManifest } from "@mycontext/core";

interface AgentOptions extends CommandOptions {
  prompt?: string;
  execute?: boolean;
  yes?: boolean;
  verbose?: boolean;
}

export class AgentCommand {
  private manifestManager: DesignManifestManager;
  private aiClient: HybridAIClient;
  private projectPath: string;

  constructor(projectPath: string = process.cwd()) {
    this.projectPath = projectPath;
    this.manifestManager = new DesignManifestManager(projectPath);
    this.aiClient = new HybridAIClient();
  }

  async execute(options: AgentOptions): Promise<void> {
    const prompt = options.prompt;

    if (!prompt) {
      console.error(chalk.red("❌ No prompt provided. Usage: mycontext agent \"your reckless instruction\""));
      return;
    }

    const spinner = new EnhancedSpinner("Analyzing prompt against Living Brain...");
    spinner.start();

    try {
      // 1. Load the manifest
      const manifest = await this.manifestManager.loadDesignManifest();
      if (!manifest) {
        spinner.fail("No design manifest found. Run 'mycontext init' first.");
        return;
      }

      // 2. Assessment Phase
      spinner.updateText("Consulting the Living Brain...");
      const assessment = await this.assessPrompt(prompt, manifest);

      spinner.succeed("Assessment complete.");
      
      // 3. Display Proposal
      this.displayProposal(assessment);

      // 4. Execution Phase
      if (options.execute) {
        await this.runEvolutionFlow(assessment, manifest, options);
      } else {
        console.log(chalk.gray("\nNext Step: Run with --execute (or -e) to apply these changes autonomously."));
      }

    } catch (error) {
      spinner.fail("Agent operation failed");
      console.error(chalk.red(`Error: ${error instanceof Error ? error.message : String(error)}`));
    }
  }

  private async runEvolutionFlow(assessment: any, currentManifest: DesignManifest, options: AgentOptions): Promise<void> {
    if (!options.yes) {
        const prompts = require("prompts");
        const response = await prompts({
            type: "confirm",
            name: "confirm",
            message: chalk.blue("Do you want the agent to evolve the Living Brain (Manifest + PRD) based on this assessment?"),
            initial: true
        });

        if (!response.confirm) {
            console.log(chalk.yellow("Aborted. No changes applied."));
            return;
        }
    }

    const spinner = new EnhancedSpinner("Evolving the Living Brain...");
    spinner.start();

    try {
        // 1. Evolve Manifest
        spinner.updateText("Updating design-manifest.json...");
        const evolvedManifest = await this.evolveManifest(assessment, currentManifest);
        await this.manifestManager.saveDesignManifest(evolvedManifest);

        // 2. Evolve PRD
        spinner.updateText("Synchronizing 01-prd.md...");
        await this.syncPRD(assessment, evolvedManifest);

        spinner.succeed("Evolution complete. The project state has been updated.");
        console.log(chalk.green("\n✨ The Living Brain has evolved. You can now use 'mycontext generate:components' or other commands to implement the changes."));
    } catch (error) {
        spinner.fail("Evolution failed");
        throw error;
    }
  }

  private async evolveManifest(assessment: any, currentManifest: DesignManifest): Promise<DesignManifest> {
      const systemPrompt = `You are the MyContext Manifest Evolver.
Your task is to take the current design-manifest.json and a Change Proposal, and produce the UPDATED design-manifest.json.

Current Manifest:
${JSON.stringify(currentManifest, null, 2)}

Change Proposal:
${JSON.stringify(assessment, null, 2)}

OUTPUT ONLY THE FULL UPDATED JSON. Ensure the structure is valid and all required fields are preserved while incorporating the new features/changes.`;

      const response = await this.aiClient.generateText(systemPrompt, {
          temperature: 0.1,
          jsonMode: true
      });

      if (process.env.DEBUG || process.env.VERBOSE) {
          console.log(chalk.gray(`[AgentCommand] Evolved Manifest Response: ${response.text.substring(0, 200)}...`));
      }

      try {
          return JSON.parse(response.text);
      } catch (e) {
          console.error(chalk.red("Failed to parse evolved manifest JSON:"), response.text);
          throw new Error("AI failed to produce a valid evolved manifest JSON.");
      }
  }

  private async syncPRD(assessment: any, evolvedManifest: DesignManifest): Promise<void> {
      const prdPath = path.join(this.projectPath, ".mycontext", "01-prd.md");
      if (!await fs.pathExists(prdPath)) return;

      const currentPRD = await fs.readFile(prdPath, "utf-8");

      const systemPrompt = `You are the MyContext Narrative Synchronizer.
Your task is to take the current 01-prd.md and an evolved Design Manifest, and update the PRD to reflect the new state of the project.

Current PRD:
${currentPRD}

Evolved Manifest:
${JSON.stringify(evolvedManifest, null, 2)}

Change Summary:
${assessment.summary}

Update the sections (Features, User Actions, etc.) to align with the new manifest.
OUTPUT THE COMPLETE UPDATED MARKDOWN CONTENT.`;

      const response = await this.aiClient.generateText(systemPrompt, {
          temperature: 0.2
      });

      if (process.env.DEBUG || process.env.VERBOSE) {
          console.log(chalk.gray(`[AgentCommand] Sync PRD Response: ${response.text.substring(0, 200)}...`));
      }

      await fs.writeFile(prdPath, response.text);
  }

  private async assessPrompt(prompt: string, manifest: DesignManifest): Promise<any> {
    const systemPrompt = `You are the MyContext Living Brain Orchestrator. 
Your job is to take a "reckless prompt" from a user and assess it against the project's "Physics Engine" (The Design Manifest).

The Design Manifest represents the immutable core of the project.
The user's prompt is a narrative request for change.

Your goal is to output a structured Manifest Change Proposal (JSON) that identifies:
1. **State Changes**: What specific parts of the manifest need to evolve? (e.g., adding a feature, updating a design token, defining a component).
2. **Task List**: A deterministic sequence of terminal-runnable tasks or architectural updates to implement the change.
3. **Boundary Check**: Does this prompt violate any existing PRD requirements or architectural constraints?
4. **Impact Score**: How much of the project is affected (Low/Medium/High)?

Current Manifest:
${JSON.stringify(manifest, null, 2)}

User Prompt:
"${prompt}"

OUTPUT ONLY VALID JSON in this format:
{
  "summary": "Brief summary of the proposed changes",
  "impact_score": "low|medium|high",
  "changes": [
    { "phase": "functional_summary|visual_system|component_hierarchy|...", "description": "What is changing?" }
  ],
  "tasks": [
    { "id": "task-uuid", "action": "Description of work", "type": "manifest_update|code_generation|filesystem|terminal" }
  ],
  "boundary_violations": ["List of concerns or contradictions with current manifest"]
}`;

    const response = await this.aiClient.generateText(systemPrompt, {
      temperature: 0.2,
      maxTokens: 2000,
      jsonMode: true
    });

    try {
      return JSON.parse(response.text);
    } catch (e) {
      throw new Error("AI failed to produce a valid JSON assessment.");
    }
  }

  private displayProposal(proposal: any): void {
    console.log(chalk.blue.bold("\n📋 Manifest Change Proposal"));
    console.log(chalk.gray("─────────────────────────────────────────────────"));
    console.log(`${chalk.yellow("Summary:")} ${proposal.summary}`);
    console.log(`${chalk.yellow("Impact:")} ${this.formatImpact(proposal.impact_score)}`);
    
    console.log(chalk.blue("\n🧬 State Changes:"));
    proposal.changes.forEach((c: any) => {
      console.log(chalk.gray(`  • [${c.phase}] ${c.description}`));
    });

    console.log(chalk.blue("\n🏗️  Execution Plan (Deterministic Tasks):"));
    proposal.tasks.forEach((t: any, i: number) => {
      console.log(chalk.gray(`  ${i + 1}. [${t.type}] ${t.action}`));
    });

    if (proposal.boundary_violations && proposal.boundary_violations.length > 0) {
      console.log(chalk.red("\n⚠️  Boundary Violations / Concerns:"));
      proposal.boundary_violations.forEach((v: string) => {
        console.log(chalk.red(`  • ${v}`));
      });
    }
    console.log(chalk.gray("─────────────────────────────────────────────────"));
  }

  private formatImpact(impact: string): string {
    switch (impact.toLowerCase()) {
      case "low": return chalk.green(impact);
      case "medium": return chalk.yellow(impact);
      case "high": return chalk.red(impact);
      default: return impact;
    }
  }
}
