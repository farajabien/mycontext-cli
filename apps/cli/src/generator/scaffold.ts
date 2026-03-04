import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import { FSR } from '@myycontext/core';
import { 
  generateNextPageTemplate, 
  generateServerComponentTemplate, 
  generateClientComponentTemplate, 
  generateServerActionTemplate,
  generateTypesTemplate,
  generateRootLandingPageTemplate
} from './templates/nextjs';

export class DeterministicScaffoldGenerator {
  private targetDir: string;

  constructor(targetDir: string = process.cwd()) {
    this.targetDir = targetDir;
  }

  public async generate(fsr: FSR): Promise<void> {
    console.log(chalk.blue(`=== Scaffolding Feature: ${fsr.featureId} ===`));

    const usesSrc = fs.existsSync(path.join(this.targetDir, 'src'));
    const baseDir = usesSrc ? path.join(this.targetDir, 'src') : this.targetDir;

    // 1. Generate Models/Types
    if (fsr.models && fsr.models.length > 0) {
      const typesDir = path.join(baseDir, 'types');
      await fs.ensureDir(typesDir);
      const typesContent = generateTypesTemplate(fsr.models);
      await fs.writeFile(path.join(typesDir, `${fsr.featureId}.ts`), typesContent);
      console.log(chalk.green(`✓ Types generated: types/${fsr.featureId}.ts`));
    }

    // 2. Generate Server Actions
    if (fsr.serverActions && fsr.serverActions.length > 0) {
      const actionsDir = path.join(baseDir, 'app', 'actions');
      await fs.ensureDir(actionsDir);
      
      const actionsContent = fsr.serverActions.map((a: any) => generateServerActionTemplate(a, fsr.models)).join('\n\n');
      const cleanContent = `"use server";\n\nimport { revalidatePath } from "next/cache";\n\n` +
        actionsContent.replace(/"use server";\n\nimport { revalidatePath } from "next\/cache";\n\n/g, '');

      await fs.writeFile(path.join(actionsDir, `${fsr.featureId}.ts`), cleanContent);
      console.log(chalk.green(`✓ Actions generated: app/actions/${fsr.featureId}.ts`));
    }

    // 3. Generate Components
    if (fsr.components && fsr.components.length > 0) {
      const componentsDir = path.join(baseDir, 'components');
      await fs.ensureDir(componentsDir);

      for (const comp of fsr.components) {
        // Exclude the page entry point from standard components if it is defined as the entry component
        if (comp.name === fsr.entryPoint.component) continue;

        const content = comp.type === 'server' 
          ? generateServerComponentTemplate(comp) 
          : generateClientComponentTemplate(comp);
        
        await fs.writeFile(path.join(componentsDir, `${comp.name}.tsx`), content);
        console.log(chalk.green(`✓ Component generated: components/${comp.name}.tsx`));
      }
    }

    // 4. Generate Entry Point (Page)
    if (fsr.entryPoint.type === 'page') {
      const normalizedPath = fsr.entryPoint.path.startsWith('/') ? fsr.entryPoint.path.slice(1) : fsr.entryPoint.path;
      const pageDir = path.join(baseDir, 'app', normalizedPath);
      await fs.ensureDir(pageDir);

      const rootComponent = fsr.components.find((c: any) => c.name === fsr.entryPoint.component);
      const children = rootComponent ? rootComponent.children : [];
      
      const pageContent = generateNextPageTemplate(fsr.entryPoint.component || 'Page', children);
      await fs.writeFile(path.join(pageDir, 'page.tsx'), pageContent);
      console.log(chalk.green(`✓ Page generated: app/${normalizedPath}/page.tsx`));
    }

    // 5. Generate Root Landing Page
    await this.generateRootLandingPage([{
      path: fsr.entryPoint.path,
      name: fsr.entryPoint.component || fsr.featureId
    }]);

    console.log(chalk.blue(`\n✅ Scaffolding complete for ${fsr.featureId}.`));
    console.log(chalk.gray(`Note: Import paths use "@/components" alias.`));
  }

  public async generateRootLandingPage(extraRoutes: {path: string, name: string}[] = []): Promise<void> {
    const usesSrc = fs.existsSync(path.join(this.targetDir, 'src'));
    const baseDir = usesSrc ? path.join(this.targetDir, 'src') : this.targetDir;
    
    const featuresDir = path.join(this.targetDir, '.mycontext', 'features');
    let routes: {path: string, name: string}[] = [...extraRoutes];
    
    if (await fs.pathExists(featuresDir)) {
      const files = await fs.readdir(featuresDir);
      for (const file of files) {
        if (file.endsWith('.fsr.json')) {
          try {
            const fData = await fs.readJson(path.join(featuresDir, file));
            if (fData.entryPoint && fData.entryPoint.path) {
              // Avoid duplicates
              if (!routes.some(r => r.path === fData.entryPoint.path)) {
                routes.push({
                  path: fData.entryPoint.path,
                  name: fData.entryPoint.component || fData.featureId
                });
              }
            }
          } catch (e) {
            // ignore
          }
        }
      }
    }
    
    const rootPagePath = path.join(baseDir, 'app', 'page.tsx');
    await fs.ensureDir(path.join(baseDir, 'app'));
    const rootPageContent = generateRootLandingPageTemplate(routes);
    await fs.writeFile(rootPagePath, rootPageContent);
    console.log(chalk.green(`✓ Root landing page updated: app/page.tsx`));
  }
}
