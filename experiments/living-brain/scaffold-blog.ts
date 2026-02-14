
import * as path from 'path';
import { NextJSProjectGenerator } from '../../apps/cli/src/utils/NextJSProjectGenerator';

async function scaffold() {
  const projectRoot = path.join(process.cwd(), 'experiments', 'living-brain-blog');
  
  console.log(`Scaffolding blog in: ${projectRoot}`);

  const generator = new NextJSProjectGenerator({
    projectName: 'living-brain-blog',
    projectPath: projectRoot,
    withShadcn: true,
    withTailwind: true,
    withTypeScript: true,
    withESLint: true,
    withAppRouter: true,
    withLayouts: true,
    withComponents: true
  });

  await generator.generateProject();
  console.log('✅ Blog scaffolded successfully using MyContext Generator!');
}

scaffold().catch(console.error);
