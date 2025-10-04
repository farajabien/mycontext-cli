/**
 * Progress Tracking System
 *
 * Manages granular progress tracking for build-app workflow.
 * Generates JSON files that can be consumed by VS Code extension,
 * web dashboard, or other external tools.
 */

import * as fs from "fs-extra";
import path from "path";
import chalk from "chalk";
import {
  PhaseStatus,
  StepStatus,
  StepProgress,
  PhaseProgress,
  MasterProgress,
  ComponentProgress,
} from "@/types/progress";

export class ProgressTracker {
  private projectPath: string;
  private progressDir: string;
  private masterProgress: MasterProgress;
  private phaseStartTimes: Map<string, number> = new Map();
  private stepStartTimes: Map<string, number> = new Map();

  constructor(projectPath: string) {
    this.projectPath = projectPath;
    this.progressDir = path.join(projectPath, ".mycontext", "progress");
    this.masterProgress = this.initializeMasterProgress();
  }

  private initializeMasterProgress(): MasterProgress {
    return {
      version: "2.0.8",
      startTime: new Date().toISOString(),
      endTime: null,
      status: "pending" as PhaseStatus,
      currentPhase: "preflight",
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
      status: "pending" as PhaseStatus,
      steps,
      completedSteps: 0,
      duration: 0,
    };
  }

  async initialize(): Promise<void> {
    await fs.ensureDir(this.progressDir);
    await fs.ensureDir(path.join(this.progressDir, "07-components"));
    await this.saveMasterProgress();
  }

  async startPhase(phaseName: string): Promise<void> {
    this.masterProgress.currentPhase = phaseName;
    const phase = this.masterProgress.phases[phaseName];
    if (phase) {
      phase.status = "in_progress";
      phase.startTime = new Date().toISOString();
    }
    this.phaseStartTimes.set(phaseName, Date.now());

    console.log(
      chalk.blue(`\n📋 Phase Started: ${this.formatPhaseName(phaseName)}`)
    );
    await this.saveMasterProgress();
  }

  async completePhase(phaseName: string): Promise<void> {
    const startTime = this.phaseStartTimes.get(phaseName);
    const duration = startTime ? Date.now() - startTime : 0;

    const phase = this.masterProgress.phases[phaseName];
    if (phase) {
      phase.status = "completed";
      phase.endTime = new Date().toISOString();
      phase.duration = duration;
      phase.completedSteps = phase.steps;
    }

    console.log(
      chalk.green(
        `✅ Phase Completed: ${this.formatPhaseName(phaseName)} (${Math.round(
          duration / 1000
        )}s)`
      )
    );
    await this.saveMasterProgress();
  }

  async failPhase(phaseName: string, error: string): Promise<void> {
    const phase = this.masterProgress.phases[phaseName];
    if (phase) {
      phase.status = "failed";
    }
    this.masterProgress.errors.push({
      phase: phaseName,
      step: this.masterProgress.currentStep,
      error,
      timestamp: new Date().toISOString(),
    });

    console.log(
      chalk.red(`❌ Phase Failed: ${this.formatPhaseName(phaseName)}`)
    );
    await this.saveMasterProgress();
  }

  async requestValidation(
    phaseName: string,
    validationType: string
  ): Promise<void> {
    const phase = this.masterProgress.phases[phaseName];
    if (phase) {
      phase.status = "validation_required";
    }
    this.masterProgress.status = "validation_required";
    this.masterProgress.userInteractions++;

    console.log(chalk.yellow(`\n⏸️  Validation Required: ${validationType}`));
    await this.saveMasterProgress();
  }

  async approveValidation(
    phaseName: string,
    validationType: string
  ): Promise<void> {
    const phase = this.masterProgress.phases[phaseName];
    if (phase) {
      if (!phase.userValidations) {
        phase.userValidations = {};
      }
      phase.userValidations[validationType] = true;
      phase.status = "in_progress";
    }
    this.masterProgress.status = "in_progress";

    console.log(chalk.green(`✅ Validation Approved: ${validationType}`));
    await this.saveMasterProgress();
  }

  async incrementStep(phaseName: string): Promise<void> {
    this.masterProgress.currentStep++;
    const phase = this.masterProgress.phases[phaseName];
    if (phase) {
      phase.completedSteps++;
    }
    this.masterProgress.percentComplete =
      (this.masterProgress.currentStep / this.masterProgress.totalSteps) * 100;

    await this.saveMasterProgress();
  }

  async recordBuildCheck(
    type: "typescript" | "eslint" | "build" | "tests",
    passed: boolean
  ): Promise<void> {
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
    const phase = this.masterProgress.phases.component_generation;
    if (phase) {
      phase.steps = componentSteps;
    }
    this.masterProgress.totalSteps = this.calculateTotalSteps();
    await this.saveMasterProgress();
  }

  private calculateTotalSteps(): number {
    return Object.values(this.masterProgress.phases).reduce(
      (sum, phase) => sum + phase.steps,
      0
    );
  }

  async startComponentGeneration(
    componentName: string,
    group: string
  ): Promise<void> {
    const componentProgress: ComponentProgress = {
      component: componentName,
      group,
      status: "in_progress" as StepStatus,
      steps: {
        spec_loaded: { status: "pending" as StepStatus },
        code_generated: { status: "pending" as StepStatus },
        file_written: { status: "pending" as StepStatus },
        lint_passed: { status: "pending" as StepStatus },
        type_check_passed: { status: "pending" as StepStatus },
        build_passed: { status: "pending" as StepStatus },
        tests_generated: { status: "pending" as StepStatus },
        tests_passed: { status: "pending" as StepStatus },
        docs_generated: { status: "pending" as StepStatus },
        registered: { status: "pending" as StepStatus },
        preview_updated: { status: "pending" as StepStatus },
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

    const icon =
      status === "completed" ? "✅" : status === "failed" ? "❌" : "⏳";
    console.log(chalk.gray(`   ${icon} ${this.formatStepName(stepName)}`));
  }

  async completeComponentGeneration(
    componentName: string,
    metadata?: ComponentProgress["metadata"]
  ): Promise<void> {
    const componentProgress = await this.loadComponentProgress(componentName);
    if (!componentProgress) return;

    componentProgress.status = "completed";
    componentProgress.metadata = metadata;

    await this.saveComponentProgress(componentName, componentProgress);
    console.log(chalk.green(`✅ Completed: ${componentName}`));
  }

  async failComponentGeneration(
    componentName: string,
    error: string,
    retries: number
  ): Promise<void> {
    const componentProgress = await this.loadComponentProgress(componentName);
    if (!componentProgress) return;

    componentProgress.status = "failed";
    componentProgress.retries = retries;

    await this.saveComponentProgress(componentName, componentProgress);
    console.log(chalk.red(`❌ Failed: ${componentName} (${retries} retries)`));
  }

  async complete(): Promise<void> {
    this.masterProgress.status = "completed";
    this.masterProgress.endTime = new Date().toISOString();
    this.masterProgress.percentComplete = 100;

    await this.saveMasterProgress();
    console.log(chalk.green.bold("\n🎉 Workflow Complete!\n"));
    this.displaySummary();
  }

  displaySummary(): void {
    const duration =
      Date.now() - new Date(this.masterProgress.startTime).getTime();
    const minutes = Math.floor(duration / 60000);
    const seconds = Math.floor((duration % 60000) / 1000);

    console.log(chalk.blue("📊 Workflow Summary:"));
    console.log(chalk.gray(`   Duration: ${minutes}m ${seconds}s`));
    console.log(
      chalk.gray(
        `   Total Steps: ${this.masterProgress.currentStep}/${this.masterProgress.totalSteps}`
      )
    );
    console.log(
      chalk.gray(
        `   User Interactions: ${this.masterProgress.userInteractions}`
      )
    );
    console.log(
      chalk.gray(`   Total Retries: ${this.masterProgress.retries.total}`)
    );
    console.log();
    console.log(chalk.blue("✅ Build Checks:"));
    console.log(
      chalk.gray(
        `   TypeScript: ${this.masterProgress.buildChecks.typescript.passed} passed, ${this.masterProgress.buildChecks.typescript.failed} failed`
      )
    );
    console.log(
      chalk.gray(
        `   ESLint: ${this.masterProgress.buildChecks.eslint.passed} passed, ${this.masterProgress.buildChecks.eslint.failed} failed`
      )
    );
    console.log(
      chalk.gray(
        `   Build: ${this.masterProgress.buildChecks.build.passed} passed, ${this.masterProgress.buildChecks.build.failed} failed`
      )
    );
    console.log(
      chalk.gray(
        `   Tests: ${this.masterProgress.buildChecks.tests.passed} passed, ${this.masterProgress.buildChecks.tests.failed} failed`
      )
    );
    console.log();
  }

  private async saveMasterProgress(): Promise<void> {
    const masterFile = path.join(this.progressDir, "master.json");
    await fs.writeJson(masterFile, this.masterProgress, { spaces: 2 });
  }

  private async savePhaseProgress(phaseName: string): Promise<void> {
    const phaseFile = path.join(
      this.progressDir,
      `${this.getPhaseNumber(phaseName)}-${phaseName}.json`
    );
    await fs.writeJson(phaseFile, this.masterProgress.phases[phaseName], {
      spaces: 2,
    });
  }

  private async saveComponentProgress(
    componentName: string,
    progress: ComponentProgress
  ): Promise<void> {
    const fileName = componentName.toLowerCase().replace(/[^a-z0-9]/g, "-");
    const componentFile = path.join(
      this.progressDir,
      "07-components",
      `${fileName}.json`
    );
    await fs.writeJson(componentFile, progress, { spaces: 2 });
  }

  private async loadComponentProgress(
    componentName: string
  ): Promise<ComponentProgress | null> {
    const fileName = componentName.toLowerCase().replace(/[^a-z0-9]/g, "-");
    const componentFile = path.join(
      this.progressDir,
      "07-components",
      `${fileName}.json`
    );

    try {
      return await fs.readJson(componentFile);
    } catch {
      return null;
    }
  }

  private getPhaseNumber(phaseName: string): string {
    const phaseNumbers: Record<string, string> = {
      preflight: "00",
      initialization: "01",
      context_generation: "02",
      types: "03",
      branding: "04",
      build_strategy: "05",
      component_list: "06",
      component_generation: "07",
      server_actions: "08",
      routes: "09",
      integration: "10",
      post_generation: "11",
    };
    return phaseNumbers[phaseName] || "99";
  }

  private formatPhaseName(phaseName: string): string {
    return phaseName
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }

  private formatStepName(stepName: string): string {
    return stepName
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }

  getMasterProgress(): MasterProgress {
    return this.masterProgress;
  }

  async loadProgress(): Promise<MasterProgress | null> {
    const masterFile = path.join(this.progressDir, "master.json");
    try {
      return await fs.readJson(masterFile);
    } catch {
      return null;
    }
  }
}
