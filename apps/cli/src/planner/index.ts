import inquirer from 'inquirer';
import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import { FSR } from '@myycontext/core';

export interface PlannerOptions {
  initialRequest?: string;
  interactive?: boolean;
}

export class Planner {
  private fsrFilePath: string;

  constructor() {
    this.fsrFilePath = path.join(process.cwd(), '.mycontext', 'features');
    fs.ensureDirSync(this.fsrFilePath);
  }

  public async run(options: PlannerOptions): Promise<void> {
    console.log(chalk.blue('=== MyContext DS-NLC Planner ==='));
    
    let requestText = options.initialRequest;
    if (!requestText) {
      const { request } = await inquirer.prompt([
        {
          type: 'input',
          name: 'request',
          message: 'What feature would you like to build?',
        }
      ]);
      requestText = request;
    }

    const safeRequest = requestText || '';
    let featureId = safeRequest.toLowerCase().replace(/[^a-z0-9]/g, '_') || 'new_feature';
    
    console.log(chalk.gray(`\nAnalyzing intent for: "${safeRequest}"...`));
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate think time

    let fsr: Partial<FSR> = {
      featureId,
      description: safeRequest,
    };

    if (featureId.includes('todo')) {
      const isLocalStorage = safeRequest.toLowerCase().includes('local storage') || safeRequest.toLowerCase().includes('localstorage');
      console.log(chalk.green(`✓ Detected Todo feature pattern${isLocalStorage ? ' (Local Storage mode)' : ' (Server Actions mode)'}.`));
      
      fsr = {
        featureId: 'add_todo',
        description: safeRequest,
        entryPoint: { type: 'page', path: '/todos', component: 'TodosPage' },
        components: [
          { name: 'TodosPage', type: 'server', children: ['TodoList'] },
          { 
            name: 'TodoList', 
            type: 'client', 
            children: ['AddTodoButton'],
            state: isLocalStorage ? { type: 'local_storage', model: 'Todo' } : undefined
          },
          { name: 'AddTodoButton', type: 'client', triggers: ['AddTodoDialog'] },
          { name: 'AddTodoDialog', type: 'client', contains: ['AddTodoForm'] },
          { 
            name: 'AddTodoForm', 
            type: 'client',
            state: isLocalStorage ? { type: 'local_storage_form', target: 'todolist_data' } : undefined
          }
        ],
        serverActions: isLocalStorage ? [] : [
          { name: 'createTodo', input: 'TodoInput', output: 'Todo' },
          { name: 'getTodos', output: 'Todo[]' }
        ],
        models: [
          {
            name: 'Todo',
            fields: { id: 'string', title: 'string', completed: 'boolean' }
          }
        ],
        uiRules: { prefer_dialog_over_page: true }
      };
    } else if (featureId.includes('removebg') || featureId.includes('remove_background')) {
      console.log(chalk.green('✓ Detected Remove.bg feature pattern.'));
      fsr = {
        featureId: 'removebg',
        description: safeRequest,
        entryPoint: { type: 'page', path: '/removebg', component: 'RemoveBGPage' },
        components: [
          { name: 'RemoveBGPage', type: 'server', children: ['RemoveBGTool'] },
          { 
            name: 'RemoveBGTool', 
            type: 'client', 
            children: ['ImageUploader', 'ImagePreview', 'TokenDisplay'],
            state: { type: 'asset_processing', model: 'ImageProcess' }
          },
          { name: 'ImageUploader', type: 'client', state: { type: 'image_uploader' } },
          { name: 'ImagePreview', type: 'client', props: { src: 'string', processing: 'boolean' } },
          { name: 'TokenDisplay', type: 'client', state: { type: 'local_storage', target: 'user_tokens' } }
        ],
        models: [
          {
            name: 'ImageProcess',
            fields: { id: 'string', originalUrl: 'string', resultUrl: 'string', status: 'string' }
          }
        ],
        uiRules: { show_confetti_on_success: true }
      };
    }

    if (options.interactive) {
      fsr = await this.interactiveResolutionLoop(fsr);
    }

    // Save final FSR
    const targetFile = path.join(this.fsrFilePath, `${fsr.featureId}.fsr.json`);
    await fs.writeJson(targetFile, fsr, { spaces: 2 });
    console.log(chalk.green(`\n✓ FSR generated successfully at: ${targetFile}`));
    console.log(chalk.gray('Run `mycontext build --feature ' + fsr.featureId + '` to scaffold.'));
  }

  private async interactiveResolutionLoop(fsr: Partial<FSR>): Promise<Partial<FSR>> {
    const updated = { ...fsr };

    if (!updated.entryPoint) {
      console.log(chalk.yellow('\nMissing Entry Point.'));
      const { path, component } = await inquirer.prompt([
        { type: 'input', name: 'path', message: 'What is the route/path for this feature (e.g. /todos)?' },
        { type: 'input', name: 'component', message: 'What is the main page component name?' }
      ]);
      updated.entryPoint = { type: 'page', path, component };
    }

    if (!updated.components || updated.components.length === 0) {
      console.log(chalk.yellow('\nMissing Components.'));
      const { compNames } = await inquirer.prompt([
        { type: 'input', name: 'compNames', message: 'Enter main component names (comma separated):' }
      ]);
      updated.components = compNames.split(',').map((c: string) => ({ name: c.trim(), type: 'server' }));
    }

    console.log(chalk.blue('\nFinal Planned FSR Diff:'));
    console.log(chalk.gray(JSON.stringify(updated, null, 2)));

    const { approve } = await inquirer.prompt([{
      type: 'confirm',
      name: 'approve',
      message: 'Approve this Feature Structured Representation?',
      default: true
    }]);

    if (!approve) {
      console.log(chalk.red('Aborted by user.'));
      process.exit(0);
    }

    return updated;
  }
}
