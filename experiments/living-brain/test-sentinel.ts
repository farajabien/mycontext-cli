
import { DependencySentinel } from '../../apps/cli/src/core/agents/DependencySentinel';
import * as path from 'path';
import * as fs from 'fs-extra';
import chalk from 'chalk';
import { execSync } from 'child_process';

const TEST_DIR = path.join(process.cwd(), 'experiments/sentinel-lab');

async function run() {
  console.log(chalk.blue('🧪 Testing Dependency Sentinel...'));
  
  // 1. Setup Test Environment
  await fs.ensureDir(TEST_DIR);
  await fs.writeJson(path.join(TEST_DIR, 'package.json'), {
    name: 'sentinel-lab',
    version: '1.0.0',
    scripts: {
        build: "tsc index.ts"
    },
    dependencies: {
        "typescript": "^5.0.0"
    }
  });

  // 2. Create a broken file (missing 'lodash')
  await fs.writeFile(path.join(TEST_DIR, 'index.ts'), `
    import _ from 'lodash';
    console.log(_.kebabCase('Sentinel Works'));
  `);

  console.log(chalk.yellow('💥 Created broken build (missing lodash)...'));

  // 3. Install initial deps (typescript)
  try {
    execSync('npm install', { cwd: TEST_DIR, stdio: 'ignore' }); 
    // Using npm for simplicity in this isolated test env, or pnpm if preferred
  } catch (e) {
      // ignore
  }

  // 4. Initialize AICore
  const { AICore } = await import('../../apps/cli/src/core/ai/AICore');
  AICore.getInstance({
      fallbackEnabled: true,
      workingDirectory: process.cwd()
  });

  // 5. Unleash the Sentinel
  const sentinel = new DependencySentinel(TEST_DIR, 3);
  
  // We expect this command to fail initially, then be fixed by installing lodash
  // Note: 'tsc' might need to be run via npx or from node_modules
  const command = 'npx tsc index.ts --noEmit --esModuleInterop --moduleResolution node'; 
  
  const success = await sentinel.guard(command);

  if (success) {
      console.log(chalk.green('\n✨ Sentinel Test PASSED! Build succeeded after self-healing.'));
      
      // Verify lodash is actually there
      if (await fs.pathExists(path.join(TEST_DIR, 'node_modules', 'lodash'))) {
          console.log(chalk.green('   - Verified lodash was installed.'));
      }
      
      // Cleanup
      await fs.remove(TEST_DIR);
  } else {
      console.log(chalk.red('\n💀 Sentinel Test FAILED!'));
      process.exit(1);
  }
}

run().catch(console.error);
