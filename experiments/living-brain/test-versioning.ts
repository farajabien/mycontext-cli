
import { BrainClient } from '../../apps/cli/src/core/brain/BrainClient';
import chalk from 'chalk';
import * as path from 'path';
import * as fs from 'fs-extra';

// Mock project root finding for test
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

async function testVersioning() {
    console.log(chalk.blue('🧪 Starting Brain Versioning Test...'));
    
    // 1. Initialize Client
    const client = BrainClient.getInstance(PROJECT_ROOT);
    await client.reset(); // Reset to clean state (1.0.0)
    
    let brain = await client.getBrain();
    const initialVersion = brain.version;
    console.log(chalk.gray(`Initial Version: ${initialVersion}`));
    
    // Parse version parts to calculate expected next versions
    const parts = initialVersion.split('.').map(Number);
    const expectedNext = `${parts[0]}.${parts[1]}.${parts[2] + 1}`;
    const expectedFinal = `${parts[0]}.${parts[1]}.${parts[2] + 2}`;

    // 2. Perform Action (should increment to current + 1)
    console.log(chalk.yellow('Action: Adding thought...'));
    await client.addUpdate('Tester', 'user', 'thought', 'Testing version increment');
    
    brain = await client.getBrain();
    console.log(chalk.green(`New Version: ${brain.version}`));
    
    if (brain.version !== expectedNext) {
        console.error(chalk.red(`Expected ${expectedNext}, got ${brain.version}`));
        process.exit(1);
    }

    // 3. Ensure persistence
    console.log(chalk.yellow('Action: Setting status...'));
    await client.setStatus('thinking');
    
    brain = await client.getBrain();
    console.log(chalk.green(`Final Version: ${brain.version}`));
    
    if (brain.version !== expectedFinal) {
         console.error(chalk.red(`Expected ${expectedFinal}, got ${brain.version}`));
         process.exit(1);
    }

    console.log(chalk.green('✅ Versioning Logic Verified Successfully!'));
}

testVersioning().catch(err => console.error(err));
