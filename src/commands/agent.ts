import chalk from "chalk";
import * as fs from "fs-extra";
import path from "path";
import { CommandOptions } from "../types";
import { DesignManifestManager } from "../utils/designManifestManager";
import { HybridAIClient } from "../utils/hybridAIClient";
import { EnhancedSpinner } from "../utils/spinner";
import { DesignManifest } from "../types/design-pipeline";

interface AgentOptions extends CommandOptions {
  prompt?: string;
  verbose?: boolean;
}

export class AgentCommand {
  private manifestManager: DesignManifestManager;
  private aiClient: HybridAIClient;

  constructor(projectPath: string = process.cwd()) {
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

      // 4. (Future) Approval Loop & Execution
      console.log(chalk.gray("\nNext Step: Run with --execute to apply these changes (Comming soon)."));

    } catch (error) {
      spinner.fail("Agent assessment failed");
      console.error(chalk.red(`Error: ${error instanceof Error ? error.message : String(error)}`));
    }
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
