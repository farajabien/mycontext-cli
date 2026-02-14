
import * as fs from 'fs-extra';
import * as path from 'path';
import chalk from 'chalk';

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
const MYCONTEXT_DIR = path.join(PROJECT_ROOT, '.mycontext');
const BRAIN_PATH = path.join(MYCONTEXT_DIR, 'brain.json');
const CONTEXT_PATH = path.join(MYCONTEXT_DIR, 'context.json');

async function migrate() {
  console.log(chalk.blue('🧠 Starting Brain Migration...'));

  if (!await fs.pathExists(BRAIN_PATH)) {
    console.log(chalk.yellow('⚠️  No brain.json found. Skipping migration.'));
    return;
  }

  const brain = await fs.readJson(BRAIN_PATH);
  
  let context: any = {};
  if (await fs.pathExists(CONTEXT_PATH)) {
    context = await fs.readJson(CONTEXT_PATH);
    console.log(chalk.gray('📄 Found existing context.json'));
  } else {
    console.log(chalk.gray('📄 Creating new context.json'));
  }

  context.brain = brain;

  await fs.writeJson(CONTEXT_PATH, context, { spaces: 2 });
  console.log(chalk.green('✅ Merged brain into context.json'));

  await fs.remove(BRAIN_PATH);
  console.log(chalk.green('🗑️  Deleted brain.json'));
  
  console.log(chalk.bold.green('🚀 Migration Complete!'));
}

migrate().catch(console.error);
