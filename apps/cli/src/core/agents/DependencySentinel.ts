
import { BrainClient } from '../brain/BrainClient';
import { AICore } from '../ai/AICore';
import * as path from 'path';
import * as fs from 'fs-extra';
import { execSync, exec } from 'child_process';
import chalk from 'chalk';
import * as util from 'util';

const execAsync = util.promisify(exec);

export class DependencySentinel {
  private brains: BrainClient;
  private ai: AICore;
  private workDir: string;
  private maxRetries: number;

  constructor(workDir: string, maxRetries = 3) {
    this.workDir = workDir;
    this.maxRetries = maxRetries;
    this.brains = BrainClient.getInstance();
    this.ai = AICore.getInstance();
  }

  /**
   * Execute a command with self-healing capabilities.
   * If the command fails, the Sentinel will analyze the output and attempt to fix it.
   */
  public async guard(command: string): Promise<boolean> {
    let attempts = 0;
    
    while (attempts <= this.maxRetries) {
      if (attempts > 0) {
        console.log(chalk.yellow(`🛡️  Sentinel Retry [${attempts}/${this.maxRetries}] for: ${command}`));
        await this.brains.addUpdate('Sentinel', 'orchestrator', 'thought', `Retry ${attempts}/${this.maxRetries} for command: ${command}`);
      }

      try {
        console.log(chalk.blue(`🛡️  Sentinel running: ${command}`));
        // We use execSync for now to simplify streaming output, 
        // but for a robust implementation we might want proper streaming.
        // Using stdio: 'inherit' lets the user see progress.
        execSync(command, { cwd: this.workDir, stdio: 'inherit' });
        
        console.log(chalk.green(`✅ Command passed: ${command}`));
        return true;
        
      } catch (error: any) {
        console.log(chalk.red(`❌ Command failed: ${command}`));
        
        // In execSync with inherit, we don't capture stdout/stderr easily in the error object 
        // (unless we assume it printed to screen and we can't see it programmatically).
        // To fix this, we need to re-run it capturing output OR use execAsync initially.
        // Let's use a "dry run" with capture to get the error details for the AI.
        
        const errorOutput = await this.captureErrorOutput(command);
        
        attempts++;
        if (attempts > this.maxRetries) {
            console.log(chalk.red(`💀 Sentinel gave up after ${this.maxRetries} attempts.`));
            return false;
        }

        await this.diagnoseAndFix(command, errorOutput);
      }
    }
    return false;
  }

  private async captureErrorOutput(command: string): Promise<string> {
      try {
          await execAsync(command, { cwd: this.workDir });
          return ""; // It unexpectedly passed?
      } catch (e: any) {
          return `${e.stdout}\n${e.stderr}`;
      }
  }

  private async diagnoseAndFix(command: string, errorLog: string) {
    await this.brains.addUpdate('Sentinel', 'orchestrator', 'thought', `Diagnosing failure for: ${command}`);
    
    const prompt = `
      You are the Dependency Sentinel, a self-healing build agent.
      
      COMMAND: ${command}
      WORKING_DIR: ${this.workDir}
      
      ERROR OUTPUT:
      \`\`\`
      ${errorLog.slice(0, 4000)}
      \`\`\`
      
      TASK:
      Analyze the error and provide a shell command to fix it.
      Common fixes:
      - "pnpm add <package>" (if module not found)
      - "pnpm add -D @types/<package>" (if type error)
      - "mkdir -p <dir>" (if directory missing)
      
      RETURN FORMAT:
      Return ONLY the shell command to execute. No markdown, no explanations.
      If you cannot determine a fix, return "SKIP".
    `;

    const fixCommand = await this.ai.generateText(prompt);
    const cleanCommand = fixCommand.replace(/`/g, '').trim();

    if (cleanCommand === 'SKIP' || !cleanCommand) {
        console.log(chalk.red("🛡️  Sentinel could not determine a fix."));
        return;
    }

    console.log(chalk.magenta(`🛡️  Sentinel attempting fix: ${cleanCommand}`));
    await this.brains.addUpdate('Sentinel', 'orchestrator', 'action', `Executing fix: ${cleanCommand}`);
    
    try {
        execSync(cleanCommand, { cwd: this.workDir, stdio: 'inherit' });
        console.log(chalk.green(`✅ Fix executed successfully.`));
    } catch (e) {
        console.log(chalk.red(`❌ Fix execution failed.`));
    }
  }
}
