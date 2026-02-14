
import { NextJSProjectGenerator } from '../../apps/cli/src/utils/NextJSProjectGenerator';
import * as path from 'path';
import * as fs from 'fs-extra';
import chalk from 'chalk';

const TEST_DIR = path.join(process.cwd(), 'experiments/test-scaffold-app');

async function run() {
  console.log(chalk.blue('🧪 Testing NextJSProjectGenerator...'));
  
  // Clean up previous test
  await fs.remove(TEST_DIR);
  
  const generator = new NextJSProjectGenerator({
    projectName: 'test-scaffold-app',
    projectPath: TEST_DIR,
    withAppRouter: true,
    withComponents: true,
    withESLint: true,
    withLayouts: true,
    withShadcn: true,
    withTailwind: true,
    withTypeScript: true
  });

  await generator.generateProject();

  console.log(chalk.blue('🔍 Verifying generated files...'));
  
  const filesToCheck = [
    'app/error.tsx',
    'app/loading.tsx',
    'app/not-found.tsx',
    'package.json'
  ];

  let success = true;

  for (const file of filesToCheck) {
    const filePath = path.join(TEST_DIR, file);
    if (await fs.pathExists(filePath)) {
        console.log(chalk.green(`✅ Found ${file}`));
        if (file === 'package.json') {
            const pkg = await fs.readJson(filePath);
            if (pkg.dependencies['lucide-react']) {
                console.log(chalk.green(`   - contains lucide-react`));
            } else {
                console.log(chalk.red(`   - MISSING lucide-react`));
                success = false;
            }
        }
    } else {
        console.log(chalk.red(`❌ Missing ${file}`));
        success = false;
    }
  }

  if (success) {
      console.log(chalk.green('\n✨ Scaffolding Test PASSED!'));
      // Cleanup
      await fs.remove(TEST_DIR);
  } else {
      console.log(chalk.red('\n💥 Scaffolding Test FAILED!'));
      process.exit(1);
  }
}

run().catch(console.error);
