/**
 * Validation Gates System
 *
 * Implements user approval checkpoints for PRD, context files, and other critical artifacts.
 * Follows "LLM as Compiler" philosophy - user approves the "compiled output".
 */

import prompts from 'prompts';
import chalk from 'chalk';
import * as fs from 'fs-extra';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface ValidationResult {
  approved: boolean;
  feedback?: string;
  edited?: boolean;
}

export class ValidationGates {
  /**
   * Validate PRD - CRITICAL GATE
   * User must read and approve the entire PRD before component generation.
   */
  static async validatePRD(prdPath: string, prdContent: string): Promise<ValidationResult> {
    console.log(chalk.blue.bold('\n╔════════════════════════════════════════════════════════════════╗'));
    console.log(chalk.blue.bold('║           📋 PRD VALIDATION REQUIRED - CRITICAL GATE           ║'));
    console.log(chalk.blue.bold('╚════════════════════════════════════════════════════════════════╝\n'));

    console.log(chalk.yellow('🔍 The PRD is the "source code" for the AI compiler.'));
    console.log(chalk.yellow('⚠️  Component generation quality depends on PRD accuracy.'));
    console.log(chalk.yellow('📖 Please read EVERY section carefully before approving.\n'));

    // Display PRD in sections
    await this.displayPRDSections(prdContent);

    const response = await prompts([
      {
        type: 'select',
        name: 'action',
        message: 'What would you like to do?',
        choices: [
          { title: '📖 Read PRD in full (opens in pager)', value: 'read' },
          { title: '✏️  Edit PRD manually (opens in editor)', value: 'edit' },
          { title: '✅ Approve PRD (I have read everything)', value: 'approve' },
          { title: '🔄 Regenerate PRD with feedback', value: 'regenerate' },
          { title: '❌ Cancel build-app workflow', value: 'cancel' },
        ],
        initial: 0,
      },
    ]);

    switch (response.action) {
      case 'read':
        await this.openInPager(prdContent);
        return this.validatePRD(prdPath, prdContent); // Re-prompt after reading

      case 'edit':
        await this.openInEditor(prdPath);
        const editedContent = await fs.readFile(prdPath, 'utf-8');
        console.log(chalk.green('\n✅ PRD edited successfully!'));
        return { approved: true, edited: true };

      case 'approve':
        const confirmation = await prompts({
          type: 'confirm',
          name: 'confirmed',
          message: chalk.yellow('⚠️  Final confirmation: Have you read the ENTIRE PRD?'),
          initial: false,
        });

        if (!confirmation.confirmed) {
          console.log(chalk.yellow('\n📖 Please take time to read the PRD carefully.\n'));
          return this.validatePRD(prdPath, prdContent);
        }

        console.log(chalk.green.bold('\n✅ PRD APPROVED - Proceeding to component generation\n'));
        return { approved: true };

      case 'regenerate':
        const { feedback } = await prompts({
          type: 'text',
          name: 'feedback',
          message: 'What changes would you like in the PRD?',
          validate: (value) => value.length >= 10 || 'Please provide detailed feedback (min 10 chars)',
        });

        return { approved: false, feedback };

      case 'cancel':
        throw new Error('User cancelled workflow');

      default:
        return { approved: false };
    }
  }

  /**
   * Validate Context File (Features, User Flows, Edge Cases, Tech Specs)
   */
  static async validateContextFile(
    fileName: string,
    content: string,
    filePath: string
  ): Promise<ValidationResult> {
    console.log(chalk.blue.bold(`\n╔════════════════════════════════════════════════════════════════╗`));
    console.log(chalk.blue.bold(`║           ✅ ${fileName.toUpperCase()} VALIDATION REQUIRED           ║`));
    console.log(chalk.blue.bold(`╚════════════════════════════════════════════════════════════════╝\n`));

    // Display content preview
    console.log(chalk.gray('Preview (first 20 lines):\n'));
    const lines = content.split('\n').slice(0, 20);
    lines.forEach((line, idx) => {
      console.log(chalk.gray(`${String(idx + 1).padStart(3, ' ')} │ ${line}`));
    });

    if (content.split('\n').length > 20) {
      console.log(chalk.gray(`... ${content.split('\n').length - 20} more lines\n`));
    }

    const response = await prompts([
      {
        type: 'select',
        name: 'action',
        message: `Review ${fileName}:`,
        choices: [
          { title: '📖 Read full file (opens in pager)', value: 'read' },
          { title: '✏️  Edit file', value: 'edit' },
          { title: '✅ Approve', value: 'approve' },
          { title: '🔄 Regenerate with feedback', value: 'regenerate' },
        ],
        initial: 0,
      },
    ]);

    switch (response.action) {
      case 'read':
        await this.openInPager(content);
        return this.validateContextFile(fileName, content, filePath);

      case 'edit':
        await this.openInEditor(filePath);
        console.log(chalk.green(`\n✅ ${fileName} edited successfully!`));
        return { approved: true, edited: true };

      case 'approve':
        console.log(chalk.green(`✅ ${fileName} approved\n`));
        return { approved: true };

      case 'regenerate':
        const { feedback } = await prompts({
          type: 'text',
          name: 'feedback',
          message: `What changes would you like in ${fileName}?`,
        });
        return { approved: false, feedback };

      default:
        return { approved: false };
    }
  }

  /**
   * Validate Component List
   */
  static async validateComponentList(componentList: any[], filePath: string): Promise<ValidationResult> {
    console.log(chalk.blue.bold('\n╔════════════════════════════════════════════════════════════════╗'));
    console.log(chalk.blue.bold('║           📋 COMPONENT LIST VALIDATION REQUIRED                ║'));
    console.log(chalk.blue.bold('╚════════════════════════════════════════════════════════════════╝\n'));

    // Display component tree
    console.log(chalk.yellow(`Total Components: ${componentList.length}\n`));

    const groupedComponents = this.groupComponents(componentList);
    Object.entries(groupedComponents).forEach(([group, components]) => {
      console.log(chalk.blue(`📁 ${group} (${components.length})`));
      components.forEach((comp: any) => {
        console.log(chalk.gray(`   └─ ${comp.name || comp}`));
      });
      console.log();
    });

    const response = await prompts([
      {
        type: 'select',
        name: 'action',
        message: 'Review component list:',
        choices: [
          { title: '✅ Approve component list', value: 'approve' },
          { title: '✏️  Edit component list (opens JSON editor)', value: 'edit' },
          { title: '🔄 Regenerate with different grouping', value: 'regenerate' },
        ],
      },
    ]);

    switch (response.action) {
      case 'approve':
        console.log(chalk.green('✅ Component list approved\n'));
        return { approved: true };

      case 'edit':
        await this.openInEditor(filePath);
        console.log(chalk.green('\n✅ Component list edited successfully!'));
        return { approved: true, edited: true };

      case 'regenerate':
        const { feedback } = await prompts({
          type: 'text',
          name: 'feedback',
          message: 'How would you like components grouped?',
        });
        return { approved: false, feedback };

      default:
        return { approved: false };
    }
  }

  /**
   * Validate Types
   */
  static async validateTypes(typesPath: string, typesContent: string): Promise<ValidationResult> {
    console.log(chalk.blue.bold('\n╔════════════════════════════════════════════════════════════════╗'));
    console.log(chalk.blue.bold('║           🔷 TYPESCRIPT TYPES VALIDATION REQUIRED              ║'));
    console.log(chalk.blue.bold('╚════════════════════════════════════════════════════════════════╝\n'));

    // Extract interface names
    const interfaceMatches = typesContent.matchAll(/(?:interface|type)\s+(\w+)/g);
    const interfaces = Array.from(interfaceMatches).map(match => match[1]);

    console.log(chalk.yellow(`Total Types: ${interfaces.length}\n`));
    interfaces.forEach((name, idx) => {
      console.log(chalk.gray(`${String(idx + 1).padStart(3, ' ')}. ${name}`));
    });
    console.log();

    const response = await prompts([
      {
        type: 'select',
        name: 'action',
        message: 'Review types:',
        choices: [
          { title: '📖 Read full types file', value: 'read' },
          { title: '✅ Approve types', value: 'approve' },
          { title: '✏️  Edit types', value: 'edit' },
        ],
      },
    ]);

    switch (response.action) {
      case 'read':
        await this.openInPager(typesContent);
        return this.validateTypes(typesPath, typesContent);

      case 'approve':
        console.log(chalk.green('✅ Types approved\n'));
        return { approved: true };

      case 'edit':
        await this.openInEditor(typesPath);
        console.log(chalk.green('\n✅ Types edited successfully!'));
        return { approved: true, edited: true };

      default:
        return { approved: false };
    }
  }

  /**
   * Display PRD in sections
   */
  private static displayPRDSections(prdContent: string): void {
    const sections = prdContent.split(/^##\s+/m).filter(Boolean);

    console.log(chalk.blue('📑 PRD Sections:\n'));
    sections.forEach((section, idx) => {
      const title = section.split('\n')[0];
      const lineCount = section.split('\n').length;
      console.log(chalk.gray(`${String(idx + 1).padStart(2, ' ')}. ${title} (${lineCount} lines)`));
    });
    console.log();
  }

  /**
   * Open content in system pager (less/more)
   */
  private static async openInPager(content: string): Promise<void> {
    const tempFile = `/tmp/mycontext-prd-${Date.now()}.md`;
    await fs.writeFile(tempFile, content);

    try {
      // Try to use `less` with syntax highlighting if available
      await execAsync(`less -R ${tempFile}`);
    } catch {
      // Fallback to basic `more`
      try {
        await execAsync(`more ${tempFile}`);
      } catch {
        console.log(chalk.yellow('\n⚠️  Could not open pager, displaying in terminal:\n'));
        console.log(content);
      }
    } finally {
      await fs.remove(tempFile).catch(() => {});
    }
  }

  /**
   * Open file in user's default editor
   */
  private static async openInEditor(filePath: string): Promise<void> {
    const editor = process.env.EDITOR || process.env.VISUAL || 'vim';

    console.log(chalk.blue(`\n📝 Opening in ${editor}...`));
    console.log(chalk.gray('Press any key after saving and closing the editor.\n'));

    try {
      await execAsync(`${editor} ${filePath}`);
    } catch (error) {
      console.log(chalk.red(`\n❌ Could not open editor: ${error}`));
      console.log(chalk.yellow(`Please manually edit: ${filePath}`));

      await prompts({
        type: 'confirm',
        name: 'done',
        message: 'Press Enter after editing the file...',
      });
    }
  }

  /**
   * Group components by category
   */
  private static groupComponents(componentList: any[]): Record<string, any[]> {
    const grouped: Record<string, any[]> = {};

    componentList.forEach(comp => {
      const group = (typeof comp === 'object' ? comp.group : null) || 'uncategorized';
      if (!grouped[group]) {
        grouped[group] = [];
      }
      grouped[group].push(comp);
    });

    return grouped;
  }

  /**
   * Validate Build Strategy Selection
   */
  static async validateBuildStrategy(
    strategies: any[],
    recommended: any
  ): Promise<{ approved: boolean; selectedStrategy?: string }> {
    console.log(chalk.blue.bold('\n╔════════════════════════════════════════════════════════════════╗'));
    console.log(chalk.blue.bold('║           🎯 BUILD STRATEGY SELECTION REQUIRED                 ║'));
    console.log(chalk.blue.bold('╚════════════════════════════════════════════════════════════════╝\n'));

    console.log(chalk.green(`💡 Recommended: ${recommended.name}\n`));
    console.log(chalk.gray(recommended.description));
    console.log();

    const { choice } = await prompts({
      type: 'select',
      name: 'choice',
      message: 'Select build strategy:',
      choices: strategies.map(s => ({
        title: `${s.icon} ${s.name} - ${s.timeToFirstDemo}`,
        value: s.id,
        description: s.description,
      })),
    });

    if (!choice) {
      return { approved: false };
    }

    console.log(chalk.green(`\n✅ Strategy selected: ${choice}\n`));
    return { approved: true, selectedStrategy: choice };
  }

  /**
   * Final build validation - user tests the app
   */
  static async validateFinalBuild(): Promise<ValidationResult> {
    console.log(chalk.blue.bold('\n╔════════════════════════════════════════════════════════════════╗'));
    console.log(chalk.blue.bold('║           🚀 FINAL BUILD VALIDATION - TEST YOUR APP            ║'));
    console.log(chalk.blue.bold('╚════════════════════════════════════════════════════════════════╝\n'));

    console.log(chalk.yellow('🧪 Please test your application:'));
    console.log(chalk.gray('   1. Run `pnpm dev` in another terminal'));
    console.log(chalk.gray('   2. Visit http://localhost:3000'));
    console.log(chalk.gray('   3. Test key user flows'));
    console.log(chalk.gray('   4. Check responsive design'));
    console.log(chalk.gray('   5. Verify all components render correctly\n'));

    const response = await prompts([
      {
        type: 'confirm',
        name: 'approved',
        message: 'Does the application work as expected?',
        initial: false,
      },
      {
        type: (prev) => (prev ? null : 'text'),
        name: 'issues',
        message: 'What issues did you find?',
      },
    ]);

    if (!response.approved) {
      return { approved: false, feedback: response.issues };
    }

    console.log(chalk.green.bold('\n🎉 Final build approved! Ready for deployment.\n'));
    return { approved: true };
  }
}
