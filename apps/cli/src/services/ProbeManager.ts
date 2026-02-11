import * as fs from 'fs-extra';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { logger } from '../utils/logger';

const execAsync = promisify(exec);

export interface ProbeResult {
  success: boolean;
  output: string;
  error?: string;
  timestamp: string;
  probeName: string;
}

export interface ProbeDefinition {
  name: string;
  description: string;
  command: string;
  category: 'file' | 'ast' | 'logic' | 'custom';
}

export class ProbeManager {
  private projectPath: string;
  private probesDir: string;

  constructor(projectPath: string) {
    this.projectPath = projectPath;
    this.probesDir = path.join(projectPath, '.mycontext', 'probes');
    this.ensureProbesDir();
  }

  private ensureProbesDir() {
    if (!fs.existsSync(this.probesDir)) {
      fs.mkdirpSync(this.probesDir);
    }
  }

  /**
   * Run a specific repository probe
   */
  async runProbe(probe: ProbeDefinition): Promise<ProbeResult> {
    const timestamp = new Date().toISOString();
    logger.info(`Executing probe: ${probe.name}`);

    try {
      const { stdout, stderr } = await execAsync(probe.command, {
        cwd: this.projectPath,
        timeout: 30000, // 30s timeout
      });

      if (stderr && !stdout) {
        return {
          success: false,
          output: stdout,
          error: stderr,
          timestamp,
          probeName: probe.name,
        };
      }

      return {
        success: true,
        output: stdout,
        timestamp,
        probeName: probe.name,
      };
    } catch (error: any) {
      logger.error(`Probe failed: ${probe.name}`, error);
      return {
        success: false,
        output: '',
        error: error.message,
        timestamp,
        probeName: probe.name,
      };
    }
  }

  /**
   * Save a successful probe as a reusable script
   */
  async saveProbe(probe: ProbeDefinition): Promise<void> {
    const probePath = path.join(this.probesDir, `${probe.name}.json`);
    await fs.writeJson(probePath, probe, { spaces: 2 });
    logger.info(`Probe saved: ${probe.name}`);
  }

  /**
   * List all available probes
   */
  async listProbes(): Promise<ProbeDefinition[]> {
    const files = await fs.readdir(this.probesDir);
    const probes: ProbeDefinition[] = [];

    for (const file of files) {
      if (file.endsWith('.json')) {
        const probe = await fs.readJson(path.join(this.probesDir, file));
        probes.push(probe);
      }
    }

    return probes;
  }
}
