
import * as fs from 'fs-extra';
import * as path from 'path';
import { Brain, BrainUpdate, BrainTask, BrainRole, INITIAL_BRAIN_STATE } from '@myycontext/core/src/types/brain';
import { v4 as uuidv4 } from 'uuid';
import chalk from 'chalk';

export class BrainClient {
  private static instance: BrainClient;
  private brainPath: string;

  private constructor(workingDirectory: string) {
    this.brainPath = path.join(workingDirectory, '.mycontext', 'context.json');
  }

  public static getInstance(workingDirectory: string = process.cwd()): BrainClient {
    if (!BrainClient.instance) {
      BrainClient.instance = new BrainClient(workingDirectory);
    }
    // Update path if working directory changes (edge case handling)
    if (path.dirname(path.dirname(BrainClient.instance.brainPath)) !== workingDirectory) {
       BrainClient.instance.brainPath = path.join(workingDirectory, '.mycontext', 'context.json');
    }
    return BrainClient.instance;
  }

  public async getBrain(): Promise<Brain> {
    try {
      if (await fs.pathExists(this.brainPath)) {
        const context = await fs.readJson(this.brainPath);
        if (context.brain) return context.brain;
      }
      return JSON.parse(JSON.stringify(INITIAL_BRAIN_STATE));
    } catch (error) {
      console.error(chalk.red('Failed to read context/brain:'), error);
      return JSON.parse(JSON.stringify(INITIAL_BRAIN_STATE));
    }
  }

  private incrementVersion(version: string): string {
    const parts = version.split('.').map(Number);
    if (parts.length !== 3 || parts.some(isNaN) || parts[2] === undefined) return version; // Fallback
    parts[2]++; // Increment patch
    return parts.join('.');
  }

  public async saveBrain(brain: Brain): Promise<void> {
    try {
      // Auto-increment version on save for alignment
      const currentVersion = brain.version || "1.0.0";
      brain.version = this.incrementVersion(currentVersion);
      
      let context: any = {};
      if (await fs.pathExists(this.brainPath)) {
        context = await fs.readJson(this.brainPath);
      }
      
      context.brain = brain;
      
      await fs.ensureDir(path.dirname(this.brainPath));
      await fs.writeJson(this.brainPath, context, { spaces: 2 });
    } catch (error) {
      console.error(chalk.red('Failed to save brain to context:'), error);
    }
  }

  public async addUpdate(
    agentName: string, 
    role: BrainRole, 
    type: "thought" | "action" | "error" | "completion", 
    message: string, 
    metadata?: any
  ): Promise<void> {
    const brain = await this.getBrain();
    const update: BrainUpdate = {
      id: uuidv4(),
      timestamp: Date.now(),
      agent: agentName,
      role,
      type,
      message,
      metadata
    };
    brain.updates.push(update);
    
    // Log to console for CLI visibility
    const color = type === 'error' ? chalk.red : type === 'action' ? chalk.green : chalk.gray;
    const icon = type === 'error' ? '❌' : type === 'action' ? '⚡' : type === 'thought' ? '💭' : '✅';
    console.log(color(`[${agentName}] ${icon} ${message}`));
    
    await this.saveBrain(brain);
  }

  public async updateArtifact(type: 'prd' | 'code', content: string, filePath: string): Promise<void> {
    const brain = await this.getBrain();
    if (!brain.artifacts) brain.artifacts = {};
    
    if (!brain.artifacts[type]) {
      brain.artifacts[type] = {
        path: filePath,
        content,
        version: 1,
        lastUpdated: Date.now()
      };
    } else {
      brain.artifacts[type]!.content = content;
      brain.artifacts[type]!.version++;
      brain.artifacts[type]!.lastUpdated = Date.now();
    }
    await this.saveBrain(brain);
  }

  public async setNarrative(narrative: string): Promise<void> {
    const brain = await this.getBrain();
    brain.narrative = narrative;
    await this.saveBrain(brain);
  }

  public async setStatus(status: Brain['status']): Promise<void> {
    const brain = await this.getBrain();
    brain.status = status;
    await this.saveBrain(brain);
  }

  public async reset(): Promise<void> {
    // Deep copy to avoid mutating the imported constant
    const freshBrain = JSON.parse(JSON.stringify(INITIAL_BRAIN_STATE));
    await this.saveBrain(freshBrain);
  }
}
