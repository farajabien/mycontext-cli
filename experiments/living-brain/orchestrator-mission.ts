
import * as fs from 'fs-extra';
import * as path from 'path';
import { AICore } from '../../apps/cli/src/core/ai/AICore';
import { BrainClient } from '../../apps/cli/src/core/brain/BrainClient';
import { FileGenerator } from '../../apps/cli/src/utils/FileGenerator';
import { DependencySentinel } from '../../apps/cli/src/core/agents/DependencySentinel';
import chalk from 'chalk';
import * as dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

const findProjectRoot = () => {
    let current = process.cwd();
    while (current !== '/') {
      if (fs.existsSync(path.join(current, 'pnpm-workspace.yaml'))) {
        return current;
      }
      current = path.dirname(current);
    }
    return process.cwd();
};
const PROJECT_ROOT = findProjectRoot();
const PRICING_ROOT = path.join(PROJECT_ROOT, 'apps/cli/experiments/pricing-mission');

dotenv.config({ path: path.join(PROJECT_ROOT, '.mycontext', '.env') });
dotenv.config({ path: path.join(PROJECT_ROOT, '.env') });

class MissionOrchestrator {
  private aiCore: AICore;
  private brainClient: BrainClient;
  private sentinel: DependencySentinel;

  constructor() {
    this.aiCore = AICore.getInstance({
      fallbackEnabled: true,
      workingDirectory: PROJECT_ROOT
    });
    this.brainClient = BrainClient.getInstance(PROJECT_ROOT);
    this.sentinel = new DependencySentinel(PRICING_ROOT);
  }

  async run() {
    console.log(chalk.blue('🚀 Starting Fractal Mission: Pricing & FAQ...'));
    await this.brainClient.setNarrative('Mission: Implement a comprehensive Pricing Plans page with FAQ using Fractal Decomposition.');
    await this.brainClient.setStatus('thinking');

    // Pre-flight: Ensure base dependencies
    await this.brainClient.addUpdate('Engineer', 'builder', 'thought', 'Checking essential dependencies...');
    await this.sentinel.guard('pnpm install next-themes lucide-react');

    const rootTask = "Create a high-converting Pricing Plans page. Includes a monthly/yearly toggle, 3 pricing cards (Free, Pro, Enterprise), and a comprehensive FAQ section with accordions. Use Shadcn-like components.";
    
    await this.processRecursiveTask(rootTask);

    await this.brainClient.setStatus('idle');
    await this.brainClient.setNarrative('Fractal Mission Complete: Dark Mode System Fully Assembled.');
    console.log(chalk.green('✅ Mission Complete!'));
  }

  private async processRecursiveTask(taskDescription: string, depth = 0): Promise<void> {
    const indent = "  ".repeat(depth);
    console.log(chalk.cyan(`${indent}🔍 Decomposing: ${taskDescription}`));
    
    await this.brainClient.addUpdate('FractalPlanner', 'planner', 'thought', `[Depth ${depth}] Evaluating: ${taskDescription}`);

    const complexity = await this.analyzeComplexity(taskDescription);

    if (complexity.isAtomic || depth > 2) {
        console.log(chalk.green(`${indent}⚡ Executing Atomic Unit: ${taskDescription}`));
        await this.executeAtomicUnit(taskDescription);
        return;
    }

    console.log(chalk.yellow(`${indent}🧩 Complex segment detected. Breaking down...`));
    const subtasks = await this.decomposeTask(taskDescription);

    for (const subtask of subtasks) {
        await this.processRecursiveTask(subtask, depth + 1);
    }
  }

  private async analyzeComplexity(task: string): Promise<{ isAtomic: boolean }> {
      const prompt = `
        Task: "${task}"
        Is this an "Atomic Action"? 
        Atomic Action = Creating one specific file or updating one specific component.
        
        NUANCE FOR UI:
        - A single ShadCN component is ATOMIC.
        - A group of related ShadCN components forming a logical unit (e.g. a complete Contact Form with Inputs/Button) is ATOMIC.
        - A high-level complex feature (e.g. "Manage Users Dashboard") is NOT ATOMIC.
        
        Return JSON: { "isAtomic": boolean }
      `;
      const result = await this.aiCore.generateStructuredText(prompt, '{ "isAtomic": boolean }');
      return result as any;
  }

  private async decomposeTask(task: string): Promise<string[]> {
      const prompt = `
        Break this task down into specific atomic technical steps (creating files, updating layouts):
        "${task}"
        
        Return JSON: { "steps": ["step 1", "step 2"] }
      `;
      const result = await this.aiCore.generateStructuredText(prompt, '{ "steps": ["string"] }');
      return (result as any).steps;
  }

  private async executeAtomicUnit(taskDescription: string) {
      await this.brainClient.addUpdate('Engineer', 'builder', 'thought', `Executing step: ${taskDescription}`);
      
      const prompt = `
        You are an Atomic Builder.
        Objective: ${taskDescription}
        
        Action: Decide if you need to create a new file or update an existing one.
        If creating, decide the filename.
        
        Return JSON: { "action": "create" | "update", "filename": "string", "instruction": "detailed prompt for FileGenerator" }
      `;
      
      const plan = await this.aiCore.generateStructuredText(prompt, '{ "action": "string", "filename": "string", "instruction": "string" }') as any;
      
      const generator = new FileGenerator(this.aiCore, PRICING_ROOT);
      const code = await generator.generateFile(plan.filename, plan.instruction);
      
      await this.brainClient.addUpdate('Engineer', 'builder', 'action', `Successfully finished: ${plan.filename}`);
      await this.brainClient.updateArtifact('code', code, plan.filename);
  }
}

new MissionOrchestrator().run().catch(console.error);
