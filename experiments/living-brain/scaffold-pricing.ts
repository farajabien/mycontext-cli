
import { NextJSProjectGenerator } from '../../apps/cli/src/utils/NextJSProjectGenerator';
import * as path from 'path';
import * as fs from 'fs-extra';
import chalk from 'chalk';

async function scaffold() {
    const root = path.join(process.cwd(), 'experiments/pricing-mission');
    console.log(chalk.blue(`🚀 Scaffolding Pricing Mission Project at: ${root}`));
    
    await fs.ensureDir(root);
    const generator = new NextJSProjectGenerator({
        projectName: 'pricing-mission',
        projectPath: root,
        withShadcn: true,
        withTailwind: true,
        withTypeScript: true,
        withESLint: true,
        withAppRouter: true,
        withLayouts: true,
        withComponents: true
    });
    await generator.generateProject();
    
    console.log(chalk.green('✅ Scaffolding Complete!'));
}

scaffold().catch(console.error);
