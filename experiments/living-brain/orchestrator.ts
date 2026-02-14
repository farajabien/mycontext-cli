import * as fs from 'fs-extra';
import * as path from 'path';
import { AICore } from '../../apps/cli/src/core/ai/AICore';
import { BrainClient } from '../../apps/cli/src/core/brain/BrainClient';
import { Brain, BrainUpdate, BrainTask, BrainRole, INITIAL_BRAIN_STATE } from '../../packages/core/src/types/brain';
import { v4 as uuidv4 } from 'uuid';
import chalk from 'chalk';
import * as dotenv from 'dotenv';


// Load environment variables dynamically based on root
const findProjectRoot = () => {
  let current = process.cwd();
  while (current !== '/') {
    if (fs.existsSync(path.join(current, 'pnpm-workspace.yaml'))) {
      return current;
    }
    current = path.dirname(current);
  }
  return process.cwd(); // Fallback
};

const PROJECT_ROOT = findProjectRoot();

dotenv.config({ path: path.join(PROJECT_ROOT, '.mycontext', '.env') });
dotenv.config({ path: path.join(PROJECT_ROOT, '.env') });

class LivingBrainOrchestrator {
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
    console.log(chalk.blue('🧠 Initializing Living Brain...'));
    await this.brainClient.reset();
  }

  private async waitForUnpause(): Promise<void> {
    let brain = await this.brainClient.getBrain();
    if (brain.status === 'paused') {
        process.stdout.write(chalk.yellow('\n[Orchestrator] Paused by user. Waiting to resume...'));
        while (brain.status === 'paused') {
            await new Promise(r => setTimeout(r, 1000));
            brain = await this.brainClient.getBrain();
        }
        console.log(chalk.green('\n[Orchestrator] Resumed!'));
    }
  }

  // Check for user signals between steps
  private async checkSync(): Promise<void> {
    await this.waitForUnpause();
    const brain = await this.brainClient.getBrain();
    // In a real agent, we might read the latest user feedback here and adjust context
    // For now, we just log it if there's a new user message
    const lastUpdate = brain.updates[brain.updates.length - 1];
    if (lastUpdate && lastUpdate.role === 'user' && !lastUpdate.metadata?.processed) {
        console.log(chalk.blue(`[User Input Detected] ${lastUpdate.message}`));
        // Mark as processed (naive implementation, ideally we'd track processing ID)
    }
  }

  async runExperiment(problemStatement: string) {
    await this.initialize();
    
    // Update Narrative
    await this.brainClient.setNarrative(`Experiment: ${problemStatement}`);
    await this.brainClient.setStatus('thinking');
    await this.checkSync();

    // 1. Planning Phase
    await this.brainClient.addUpdate('Architect', 'planner', 'thought', `Analyzing problem: "${problemStatement}"`);
    await this.checkSync();
    
    const brainstormingPrompt = `
      You are a software architect.
      Problem: ${problemStatement}
      
      Brainstorm 3 distinct technical approaches to solve this problem using React and Tailwind CSS.
      Keep it high-level but technical.
    `;
    
    const ideas = await this.aiCore.generateText(brainstormingPrompt);
    await this.brainClient.addUpdate('Architect', 'planner', 'action', 'Generated technical approaches', { ideas });
    await this.checkSync();
    
    await this.brainClient.addUpdate('Architect', 'planner', 'thought', 'Selecting the best approach and drafting PRD...');
    
    const prdPrompt = `
      You are a product manager.
      Problem: ${problemStatement}
      Technical Ideas: ${ideas}
      
      Write a concise PRD (Product Requirements Document) in Markdown format.
      Include:
      1. Goal
      2. Core Features
      3. Technical Specs (React, Tailwind)
      4. Acceptance Criteria
    `;
    
    const prd = await this.aiCore.generateText(prdPrompt);
    await this.brainClient.updateArtifact('prd', prd, 'brain/generated-prd.md');
    await this.brainClient.addUpdate('Architect', 'planner', 'action', 'PRD Drafted and saved.');
    await this.checkSync();

    // 2. Execution Phase
    await this.brainClient.setStatus('implementing');
    await this.brainClient.addUpdate('Engineer', 'builder', 'thought', 'Reviewing PRD and preparing for implementation...');
    await this.checkSync();
    
    const codePrompt = `
      You are a senior React developer.
      Implement the component described in this PRD using React, Tailwind CSS, and Lucide React icons if needed.
      
      PRD:
      ${prd}
      
      Return ONLY the full TSX code for the component. 
      Default export the component.
      Do not use markdown blocks.
    `;
    
    // Check pause before expensive generation
    await this.checkSync();
    const code = await this.aiCore.generateText(codePrompt);
    
    // Basic cleanup
    const cleanCode = code.replace(/^```tsx?\n?/gi, "").replace(/^```\n?/gi, "").replace(/\n?```$/gi, "");
    
    await this.brainClient.updateArtifact('code', cleanCode, 'brain/GeneratedComponent.tsx');
    await this.brainClient.addUpdate('Engineer', 'builder', 'action', 'Component implementation complete.');
    await this.checkSync();

    // Completion
    await this.brainClient.setStatus('idle');
    await this.brainClient.setNarrative('Experiment complete. Waiting for review.');
    console.log(chalk.green('✅ Experiment finished successfully!'));
  }
}

// Run if called directly
if (require.main === module) {
  const orchestrator = new LivingBrainOrchestrator();
  const problem = process.argv[2] || "Create a 'Pomodoro Timer' component that gamifies focus time with a leveling system.";
  
  orchestrator.runExperiment(problem).catch(err => {
    console.error(chalk.red('Orchestrator failed:'), err);
  });
}
