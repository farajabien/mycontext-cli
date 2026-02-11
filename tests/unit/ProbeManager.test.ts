import { ProbeManager } from '../../src/services/ProbeManager';
import * as path from 'path';
import * as fs from 'fs-extra';

jest.mock('../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('ProbeManager', () => {
  const projectPath = process.cwd();
  let probeManager: ProbeManager;

  beforeEach(() => {
    probeManager = new ProbeManager(projectPath);
  });

  it('should run a simple ls command as a probe', async () => {
    const result = await probeManager.runProbe({
      name: 'list_files',
      description: 'List current files',
      command: 'ls',
      category: 'file'
    });

    expect(result.success).toBe(true);
    expect(result.output).toContain('package.json');
  });

  it('should handle failing commands gracefully', async () => {
    const result = await probeManager.runProbe({
      name: 'invalid_command',
      description: 'Run invalid command',
      command: 'nonexistentcommand12345',
      category: 'custom'
    });

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});
