
import * as fs from 'fs-extra';
import * as path from 'path';
import { AICore } from '../../apps/cli/src/core/ai/AICore';
import { BrainClient } from '../../apps/cli/src/core/brain/BrainClient';
import { BrainRole, BrainTask } from '../../packages/core/src/types/brain';
import chalk from 'chalk';
import * as dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

// Load environment variables dynamically based on root
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
// We'll use a new experiment folder for this verification
const FRACTAL_ROOT = path.join(PROJECT_ROOT, 'experiments/fractal-brain-demo');

dotenv.config({ path: path.join(PROJECT_ROOT, '.mycontext', '.env') });
dotenv.config({ path: path.join(PROJECT_ROOT, '.env') });

class FractalOrchestrator {
  private aiCore: AICore;
  private brainClient: BrainClient;

  constructor() {
    this.aiCore = AICore.getInstance({
      fallbackEnabled: true,
      workingDirectory: PROJECT_ROOT
    });
    this.brainClient = BrainClient.getInstance(PROJECT_ROOT);
  }

  async initialize() {
    console.log(chalk.blue('🧠 Initializing Fractal Orchestrator...'));
    await fs.ensureDir(FRACTAL_ROOT);
    await this.brainClient.setNarrative('Experiment: Recursive Fractal Decomposition of Tasks');
    await this.brainClient.setStatus('thinking');
  }

  private async checkSync(): Promise<void> {
    const brain = await this.brainClient.getBrain();
    if (brain.status === 'paused') {
        console.log(chalk.yellow('Paused by user. Waiting...'));
        while ((await this.brainClient.getBrain()).status === 'paused') {
            await new Promise(r => setTimeout(r, 1000));
        }
        console.log(chalk.green('Resumed.'));
    }
  }

  // The Core Fractal Logic
  async processTask(taskDescription: string, parentId?: string, depth = 0): Promise<void> {
    const indent = "  ".repeat(depth);
    const taskId = uuidv4();
    
    console.log(chalk.cyan(`${indent}🔍 Processing Task [Depth ${depth}]: ${taskDescription}`));
    await this.brainClient.addUpdate('FractalPlanner', 'planner', 'thought', `[Depth ${depth}] Analyzing: ${taskDescription}`);

    // 1. Analyze Complexity
    const complexityAnalysis = await this.analyzeComplexity(taskDescription);
    
    // STOP CONDITION: If atomic, execute immediately.
    if (complexityAnalysis.isAtomic || depth > 3) {
        console.log(chalk.green(`${indent}⚡ Executing Atomic Task: ${taskDescription}`));
        await this.executeAtomicTask(taskDescription, FRACTAL_ROOT);
        return;
    }

    // RECURSION: If too complex, decompose.
    console.log(chalk.yellow(`${indent}🧩 Task too complex. Decomposing...`));
    await this.brainClient.addUpdate('FractalPlanner', 'planner', 'thought', `[Depth ${depth}] too complex. Decomposing: ${taskDescription}`);
    
    const subTasks = await this.decomposeTask(taskDescription);
    console.log(chalk.gray(`${indent}  ↳ Subtasks: ${subTasks.join(', ')}`));
    
    for (const subTask of subTasks) {
        await this.processTask(subTask, taskId, depth + 1);
    }
  }

  private async analyzeComplexity(task: string): Promise<{ isAtomic: boolean; reason: string }> {
      const prompt = `
        You are a Project Manager.
        TASK: "${task}"
        
        Is this task "atomic"? 
        Atomic means: It describes a SINGLE code file or a SINGLE specific action that can be done in one step.
        
        UI NUANCE:
        - A ShadCN component or a logical group of them (e.g. a Form Molecule, a Card) is ATOMIC.
        - "Build a Dashboard" -> NO (Requires multiple components, layout, routing)
        - "Create a Login Form" -> YES (ShadCN group)
        
        Return JSON: { "isAtomic": boolean, "reason": "string" }
      `;
      
      try {
          const result = await this.aiCore.generateStructuredText(prompt, '{ "isAtomic": boolean, "reason": "string" }');
          return result as any;
      } catch (e) {
          return { isAtomic: false, reason: "Failed to parse complexity" };
      }
  }

  private async decomposeTask(task: string): Promise<string[]> {
      const prompt = `
        You are a System Architect.
        The task "${task}" is too big to execute directly.
        Break it down into 2-5 sub-tasks.
        
        Return JSON: { "subTasks": ["string", "string"] }
      `;
      
      const result = await this.aiCore.generateStructuredText(prompt, '{ "subTasks": ["string"] }');
      return (result as any).subTasks;
  }

  private async executeAtomicTask(task: string, workDir: string) {
      // For this demo, we'll just generate a dummy file to prove it happened.
      const prompt = `
        You are a Developer.
        Task: ${task}
        
        Generate a simple TypeScript file that represents this task.
        If it's a UI component, generate React code.
        If it's logic, generate functions.
        
        Return ONLY code.
      `;
      
      let code = await this.aiCore.generateText(prompt);
      code = code.replace(/^```tsx?\n?/gi, "").replace(/^```\n?/gi, "").replace(/\n?```$/gi, "");
      
      // Generate a simplified filename
      const filenameRaw = await this.aiCore.generateText(`Suggest a filename (e.g. Button.tsx) for: ${task}. Return ONLY the filename.`);
      const filename = filenameRaw.trim().replace(/`/g, '');
      
      const filePath = path.join(workDir, filename);
      await fs.ensureDir(path.dirname(filePath));
      await fs.writeFile(filePath, code);
      
      await this.brainClient.addUpdate('FractalBuilder', 'builder', 'action', `Created ${filename} for task: ${task}`);
  }

  async run() {
    await this.initialize();
    
    const rootTask = "Create a high-converting Pricing Plans page. Includes a monthly/yearly toggle, 3 pricing cards (Free, Pro, Enterprise), and a comprehensive FAQ section with accordions.";
    console.log(chalk.magenta(`🏁 Starting Root Task: ${rootTask}`));
    
    await this.processTask(rootTask);
    
    console.log(chalk.green('✅ Fractal Execution Complete!'));
    await this.brainClient.setStatus('idle');
  }
}

new FractalOrchestrator().run().catch(console.error);
