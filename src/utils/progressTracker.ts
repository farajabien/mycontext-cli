/**
 * Progress Tracking System
 *
 * Manages granular progress tracking for build-app workflow.
 * Generates JSON files that can be consumed by VS Code extension,
 * web dashboard, or other external tools.
 */

import * as fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';

export type PhaseStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'validation_required';
export type StepStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped';

export interface StepProgress {
  status: StepStatus;
  timestamp?: string;
  duration?: number;
  error?: string;
  metadata?: Record<string, any>;
}

export interface PhaseProgress {
  status: PhaseStatus;
  steps: number;
  completedSteps: number;
  duration: number;
  startTime?: string;
  endTime?: string;
  userValidations?: Record<string, boolean>;
  errors?: Array<{
    step: string;
    error: string;
    timestamp: string;
  }>;
}

export interface MasterProgress {
  version: string;
  startTime: string;
  endTime: string | null;
  status: PhaseStatus;
  currentPhase: string;
  currentStep: number;
  totalSteps: number;
  percentComplete: number;
  phases: Record<string, PhaseProgress>;
  errors: Array<{
    phase: string;
    step: number;
    error: string;
    timestamp: string;
  }>;
  retries: {
    total: number;
    byPhase: Record<string, number>;
  };
  userInteractions: number;
  buildChecks: {
    typescript: { passed: number; failed: number };
    eslint: { passed: number; failed: number };
    build: { passed: number; failed: number };
    tests: { passed: number; failed: number };
  };
}

export interface ComponentProgress {
  component: string;
  group: string;
  status: StepStatus;
  steps: Record<string, StepProgress>;
  retries: number;
  duration: number;
  metadata?: {
    linesOfCode?: number;
    dependencies?: string[];
    props?: string[];
    exports?: string[];
  };
}

export class ProgressTracker {
  private projectPath: string;
  private progressDir: string;
  private masterProgress: MasterProgress;
  private phaseStartTimes: Map<string, number> = new Map();
  private stepStartTimes: Map<string, number> = new Map();

  constructor(projectPath: string) {
    this.projectPath = projectPath;
    this.progressDir = path.join(projectPath, '.mycontext', 'progress');
    this.masterProgress = this.initializeMasterProgress();
  }

  private initializeMasterProgress(): MasterProgress {
    return {
      version: '2.0.0',
      startTime: new Date().toISOString(),
      endTime: null,
      status: 'pending',
      currentPhase: 'preflight',
      currentStep: 0,
      totalSteps: 230,
      percentComplete: 0,
      phases: {
        preflight: this.createPhaseProgress(10),
        initialization: this.createPhaseProgress(15),
        context_generation: this.createPhaseProgress(25),
        types: this.createPhaseProgress(10),
        branding: this.createPhaseProgress(10),
        build_strategy: this.createPhaseProgress(10),
        component_list: this.createPhaseProgress(10),
        component_generation: this.createPhaseProgress(0), // Dynamic based on component count
        server_actions: this.createPhaseProgress(30),
        routes: this.createPhaseProgress(20),
        integration: this.createPhaseProgress(20),
        post_generation: this.createPhaseProgress(10),
      },
      errors: [],
      retries: {
        total: 0,
        byPhase: {},
      },
      userInteractions: 0,
      buildChecks: {
        typescript: { passed: 0, failed: 0 },
        eslint: { passed: 0, failed: 0 },
        build: { passed: 0, failed: 0 },
        tests: { passed: 0, failed: 0 },
      },
    };
  }

  private createPhaseProgress(steps: number): PhaseProgress {
    return {
      status: 'pending',
      steps,
      completedSteps: 0,
      duration: 0,
    };
  }

  async initialize(): Promise<void> {
    await fs.ensureDir(this.progressDir);
    await fs.ensureDir(path.join(this.progressDir, '07-components'));
    await this.saveMasterProgress();
  }

  async startPhase(phaseName: string): Promise<void> {
    this.masterProgress.currentPhase = phaseName;
    this.masterProgress.phases[phaseName].status = 'in_progress';
    this.masterProgress.phases[phaseName].startTime = new Date().toISOString();
    this.phaseStartTimes.set(phaseName, Date.now());

    console.log(chalk.blue(`\n📋 Phase Started: ${this.formatPhaseName(phaseName)}`));
    await this.saveMasterProgress();
  }

  async completePhase(phaseName: string): Promise<void> {
    const startTime = this.phaseStartTimes.get(phaseName);
    const duration = startTime ? Date.now() - startTime : 0;

    this.masterProgress.phases[phaseName].status = 'completed';
    this.masterProgress.phases[phaseName].endTime = new Date().toISOString();
    this.masterProgress.phases[phaseName].duration = duration;
    this.masterProgress.phases[phaseName].completedSteps = this.masterProgress.phases[phaseName].steps;

    console.log(chalk.green(`✅ Phase Completed: ${this.formatPhaseName(phaseName)} (${Math.round(duration / 1000)}s)`));
    await this.saveMasterProgress();
  }

  async failPhase(phaseName: string, error: string): Promise<void> {
    this.masterProgress.phases[phaseName].status = 'failed';
    this.masterProgress.errors.push({
      phase: phaseName,
      step: this.masterProgress.currentStep,
      error,
      timestamp: new Date().toISOString(),
    });

    console.log(chalk.red(`❌ Phase Failed: ${this.formatPhaseName(phaseName)}`));
    await this.saveMasterProgress();
  }

  async requestValidation(phaseName: string, validationType: string): Promise<void> {
    this.masterProgress.phases[phaseName].status = 'validation_required';
    this.masterProgress.status = 'validation_required';
    this.masterProgress.userInteractions++;

    console.log(chalk.yellow(`\n⏸️  Validation Required: ${validationType}`));
    await this.saveMasterProgress();
  }

  async approveValidation(phaseName: string, validationType: string): Promise<void> {
    if (!this.masterProgress.phases[phaseName].userValidations) {
      this.masterProgress.phases[phaseName].userValidations = {};
    }
    this.masterProgress.phases[phaseName].userValidations![validationType] = true;
    this.masterProgress.phases[phaseName].status = 'in_progress';
    this.masterProgress.status = 'in_progress';

    console.log(chalk.green(`✅ Validation Approved: ${validationType}`));
    await this.saveMasterProgress();
  }

  async incrementStep(phaseName: string): Promise<void> {
    this.masterProgress.currentStep++;
    this.masterProgress.phases[phaseName].completedSteps++;
    this.masterProgress.percentComplete = (this.masterProgress.currentStep / this.masterProgress.totalSteps) * 100;

    await this.saveMasterProgress();
  }

  async recordBuildCheck(type: 'typescript' | 'eslint' | 'build' | 'tests', passed: boolean): Promise<void> {
    if (passed) {
      this.masterProgress.buildChecks[type].passed++;
    } else {
      this.masterProgress.buildChecks[type].failed++;
    }
    await this.saveMasterProgress();
  }

  async recordRetry(phaseName: string): Promise<void> {
    this.masterProgress.retries.total++;
    if (!this.masterProgress.retries.byPhase[phaseName]) {
      this.masterProgress.retries.byPhase[phaseName] = 0;
    }
    this.masterProgress.retries.byPhase[phaseName]++;
    await this.saveMasterProgress();
  }

  async setComponentCount(count: number): Promise<void> {
    // Each component has 12 steps (see BUILD_APP_PROCESS.md)
    const componentSteps = count * 12;
    this.masterProgress.phases.component_generation.steps = componentSteps;
    this.masterProgress.totalSteps = this.calculateTotalSteps();
    await this.saveMasterProgress();
  }

  private calculateTotalSteps(): number {
    return Object.values(this.masterProgress.phases).reduce((sum, phase) => sum + phase.steps, 0);
  }

  async startComponentGeneration(componentName: string, group: string): Promise<void> {
    const componentProgress: ComponentProgress = {
      component: componentName,
      group,
      status: 'in_progress',
      steps: {
        spec_loaded: { status: 'pending' },
        code_generated: { status: 'pending' },
        file_written: { status: 'pending' },
        lint_passed: { status: 'pending' },
        type_check_passed: { status: 'pending' },
        build_passed: { status: 'pending' },
        tests_generated: { status: 'pending' },
        tests_passed: { status: 'pending' },
        docs_generated: { status: 'pending' },
        registered: { status: 'pending' },
        preview_updated: { status: 'pending' },
      },
      retries: 0,
      duration: 0,
    };

    await this.saveComponentProgress(componentName, componentProgress);
    console.log(chalk.blue(`\n🔨 Generating: ${componentName}`));
  }

  async updateComponentStep(
    componentName: string,
    stepName: string,
    status: StepStatus,
    metadata?: Record<string, any>
  ): Promise<void> {
    const componentProgress = await this.loadComponentProgress(componentName);
    if (!componentProgress) return;

    componentProgress.steps[stepName] = {
      status,
      timestamp: new Date().toISOString(),
      metadata,
    };

    await this.saveComponentProgress(componentName, componentProgress);

    const icon = status === 'completed' ? '✅' : status === 'failed' ? '❌' : '⏳';
    console.log(chalk.gray(`   ${icon} ${this.formatStepName(stepName)}`));
  }

  async completeComponentGeneration(componentName: string, metadata?: ComponentProgress['metadata']): Promise<void> {
    const componentProgress = await this.loadComponentProgress(componentName);
    if (!componentProgress) return;

    componentProgress.status = 'completed';
    componentProgress.metadata = metadata;

    await this.saveComponentProgress(componentName, componentProgress);
    console.log(chalk.green(`✅ Completed: ${componentName}`));
  }

  async failComponentGeneration(componentName: string, error: string, retries: number): Promise<void> {
    const componentProgress = await this.loadComponentProgress(componentName);
    if (!componentProgress) return;

    componentProgress.status = 'failed';
    componentProgress.retries = retries;

    await this.saveComponentProgress(componentName, componentProgress);
    console.log(chalk.red(`❌ Failed: ${componentName} (${retries} retries)`));
  }

  async complete(): Promise<void> {
    this.masterProgress.status = 'completed';
    this.masterProgress.endTime = new Date().toISOString();
    this.masterProgress.percentComplete = 100;

    await this.saveMasterProgress();
    console.log(chalk.green.bold('\n🎉 Workflow Complete!\n'));
    this.displaySummary();
  }

  displaySummary(): void {
    const duration = Date.now() - new Date(this.masterProgress.startTime).getTime();
    const minutes = Math.floor(duration / 60000);
    const seconds = Math.floor((duration % 60000) / 1000);

    console.log(chalk.blue('📊 Workflow Summary:'));
    console.log(chalk.gray(`   Duration: ${minutes}m ${seconds}s`));
    console.log(chalk.gray(`   Total Steps: ${this.masterProgress.currentStep}/${this.masterProgress.totalSteps}`));
    console.log(chalk.gray(`   User Interactions: ${this.masterProgress.userInteractions}`));
    console.log(chalk.gray(`   Total Retries: ${this.masterProgress.retries.total}`));
    console.log();
    console.log(chalk.blue('✅ Build Checks:'));
    console.log(chalk.gray(`   TypeScript: ${this.masterProgress.buildChecks.typescript.passed} passed, ${this.masterProgress.buildChecks.typescript.failed} failed`));
    console.log(chalk.gray(`   ESLint: ${this.masterProgress.buildChecks.eslint.passed} passed, ${this.masterProgress.buildChecks.eslint.failed} failed`));
    console.log(chalk.gray(`   Build: ${this.masterProgress.buildChecks.build.passed} passed, ${this.masterProgress.buildChecks.build.failed} failed`));
    console.log(chalk.gray(`   Tests: ${this.masterProgress.buildChecks.tests.passed} passed, ${this.masterProgress.buildChecks.tests.failed} failed`));
    console.log();
  }

  private async saveMasterProgress(): Promise<void> {
    const masterFile = path.join(this.progressDir, 'master.json');
    await fs.writeJson(masterFile, this.masterProgress, { spaces: 2 });
  }

  private async savePhaseProgress(phaseName: string): Promise<void> {
    const phaseFile = path.join(this.progressDir, `${this.getPhaseNumber(phaseName)}-${phaseName}.json`);
    await fs.writeJson(phaseFile, this.masterProgress.phases[phaseName], { spaces: 2 });
  }

  private async saveComponentProgress(componentName: string, progress: ComponentProgress): Promise<void> {
    const fileName = componentName.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const componentFile = path.join(this.progressDir, '07-components', `${fileName}.json`);
    await fs.writeJson(componentFile, progress, { spaces: 2 });
  }

  private async loadComponentProgress(componentName: string): Promise<ComponentProgress | null> {
    const fileName = componentName.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const componentFile = path.join(this.progressDir, '07-components', `${fileName}.json`);

    try {
      return await fs.readJson(componentFile);
    } catch {
      return null;
    }
  }

  private getPhaseNumber(phaseName: string): string {
    const phaseNumbers: Record<string, string> = {
      preflight: '00',
      initialization: '01',
      context_generation: '02',
      types: '03',
      branding: '04',
      build_strategy: '05',
      component_list: '06',
      component_generation: '07',
      server_actions: '08',
      routes: '09',
      integration: '10',
      post_generation: '11',
    };
    return phaseNumbers[phaseName] || '99';
  }

  private formatPhaseName(phaseName: string): string {
    return phaseName
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  private formatStepName(stepName: string): string {
    return stepName
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  getMasterProgress(): MasterProgress {
    return this.masterProgress;
  }

  async loadProgress(): Promise<MasterProgress | null> {
    const masterFile = path.join(this.progressDir, 'master.json');
    try {
      return await fs.readJson(masterFile);
    } catch {
      return null;
    }
  }
}
