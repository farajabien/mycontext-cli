import { Command } from "commander";
import chalk from "chalk";
import { ProjectIntelligenceEngine } from "../agents/intelligence/ProjectIntelligence";
import { EnhancedSpinner } from "../utils/spinner";
import { ContextLoader, loadProjectContext } from "../utils/contextLoader";
import fs from "fs-extra";
import path from "path";

export interface PredictionOptions {
  type?: "next" | "dependencies" | "patterns" | "issues" | "optimization";
  confidence?: number;
  context?: string;
  verbose?: boolean;
}

export class PredictCommand {
  private intelligence: ProjectIntelligenceEngine;

  constructor() {
    this.intelligence = new ProjectIntelligenceEngine();
  }

  async execute(action: string, options: PredictionOptions): Promise<void> {
    const spinner = new EnhancedSpinner(`🔮 Predicting ${action}...`);

    try {
      spinner.start();

      // Load project context for better predictions
      const contextLoader = new ContextLoader();
      const projectContext = await contextLoader.loadProjectContext({
        verbose: options.verbose || false,
        required: false,
      });

      if (options.verbose) {
        const summary = contextLoader.getContextSummary(projectContext);
        console.log(chalk.gray(`📁 Context: ${summary}`));
      }

      // Analyze current project state
      const projectState = await this.intelligence.analyzeProject();

      let predictions;
      switch (action) {
        case "next":
          predictions = await this.predictNextSteps(projectState, options);
          break;
        case "dependencies":
          predictions = await this.predictDependencies(projectState, options);
          break;
        case "patterns":
          predictions = await this.predictPatterns(projectState, options);
          break;
        case "issues":
          predictions = await this.predictIssues(projectState, options);
          break;
        case "optimization":
          predictions = await this.predictOptimizations(projectState, options);
          break;
        default:
          predictions = await this.predictGeneral(projectState, options);
      }

      spinner.success({ text: `Predictions generated for ${action}` });

      // Display predictions
      await this.displayPredictions(action, predictions, options);

      // Save predictions for learning
      await this.savePredictions(action, predictions);
    } catch (error: any) {
      spinner.error({ text: `Prediction failed: ${error.message}` });
      throw error;
    }
  }

  private async predictNextSteps(
    projectState: any,
    options: PredictionOptions
  ): Promise<any> {
    const predictions = {
      immediateActions: [] as any[],
      suggestedComponents: [] as any[],
      architecturalNeeds: [] as any[],
      dependencies: [] as any[],
      confidence: 0,
    };

    // Analyze current components to predict next needs
    const components = await this.getExistingComponents();
    const patterns = projectState.architecturalPatterns;

    // Predict based on common patterns
    if (
      this.hasComponent(components, "ProductCard") &&
      !this.hasComponent(components, "CartDialog")
    ) {
      predictions.suggestedComponents.push({
        name: "CartDialog",
        reason: "ProductCard typically needs shopping cart functionality",
        confidence: 0.85,
        priority: "high",
      });
    }

    if (
      this.hasComponent(components, "LoginForm") &&
      !this.hasComponent(components, "AuthGuard")
    ) {
      predictions.suggestedComponents.push({
        name: "AuthGuard",
        reason: "Authentication forms need route protection",
        confidence: 0.9,
        priority: "high",
      });
    }

    if (
      this.hasComponent(components, "DataTable") &&
      !this.hasComponent(components, "FilterPanel")
    ) {
      predictions.suggestedComponents.push({
        name: "FilterPanel",
        reason: "Data tables benefit from filtering capabilities",
        confidence: 0.8,
        priority: "medium",
      });
    }

    // Predict architectural needs
    if (
      components.length > 10 &&
      !patterns.some((p: any) => p.name.includes("context"))
    ) {
      predictions.architecturalNeeds.push({
        pattern: "State Management",
        reason: "Large component count suggests need for centralized state",
        confidence: 0.75,
        suggestion: "Consider Context API or state management library",
      });
    }

    if (
      patterns.some((p: any) => p.name.includes("api")) &&
      !this.hasPattern(patterns, "error-boundaries")
    ) {
      predictions.architecturalNeeds.push({
        pattern: "Error Boundaries",
        reason: "API usage requires proper error handling",
        confidence: 0.8,
        suggestion: "Implement error boundaries for API components",
      });
    }

    // Predict immediate actions
    const recentFiles = projectState.codebaseAwareness.files
      .filter((f: any) => this.isRecentlyModified(f.lastModified))
      .sort(
        (a: any, b: any) => b.lastModified.getTime() - a.lastModified.getTime()
      );

    if (recentFiles.length > 0) {
      const latestFile = recentFiles[0];
      if (latestFile.type === "component" && !this.hasTests(latestFile.path)) {
        predictions.immediateActions.push({
          action: "Generate Tests",
          target: latestFile.path,
          reason: "Recently created component needs test coverage",
          confidence: 0.9,
        });
      }
    }

    // Calculate overall confidence
    predictions.confidence = this.calculateAverageConfidence([
      ...predictions.suggestedComponents,
      ...predictions.architecturalNeeds,
      ...predictions.immediateActions,
    ]);

    return predictions;
  }

  private async predictDependencies(
    projectState: any,
    options: PredictionOptions
  ): Promise<any> {
    const predictions = {
      needed: [] as any[],
      upgrades: [] as any[],
      potential_conflicts: [] as any[],
      optimization: [] as any[],
    };

    const components = await this.getExistingComponents();
    const existingDeps = await this.getPackageDependencies();

    // Predict needed dependencies based on components
    for (const component of components) {
      if (
        component.name.includes("Chart") &&
        !existingDeps.includes("recharts")
      ) {
        predictions.needed.push({
          package: "recharts",
          reason: "Chart components typically need charting library",
          confidence: 0.8,
          alternative: "chart.js",
        });
      }

      if (
        component.name.includes("Form") &&
        !existingDeps.includes("react-hook-form")
      ) {
        predictions.needed.push({
          package: "react-hook-form",
          reason: "Form components benefit from form management library",
          confidence: 0.7,
          alternative: "formik",
        });
      }

      if (
        component.name.includes("Animation") &&
        !existingDeps.includes("framer-motion")
      ) {
        predictions.needed.push({
          package: "framer-motion",
          reason: "Animation components need animation library",
          confidence: 0.85,
          alternative: "react-spring",
        });
      }
    }

    // Predict potential optimization opportunities
    if (
      existingDeps.includes("lodash") &&
      !existingDeps.includes("lodash-es")
    ) {
      predictions.optimization.push({
        change: "Switch to lodash-es",
        reason: "Better tree-shaking and smaller bundle size",
        confidence: 0.9,
        impact: "Bundle size reduction",
      });
    }

    if (existingDeps.includes("moment") && !existingDeps.includes("date-fns")) {
      predictions.optimization.push({
        change: "Replace moment with date-fns",
        reason: "Smaller bundle size and better performance",
        confidence: 0.8,
        impact: "Significant bundle size reduction",
      });
    }

    return predictions;
  }

  private async predictPatterns(
    projectState: any,
    options: PredictionOptions
  ): Promise<any> {
    const predictions = {
      emerging: [] as any[],
      recommended: [] as any[],
      antipatterns: [] as any[],
      modernization: [] as any[],
    };

    const patterns = projectState.architecturalPatterns;
    const components = await this.getExistingComponents();

    // Predict emerging patterns
    if (this.hasPattern(patterns, "react-hooks") && patterns.length > 5) {
      predictions.emerging.push({
        pattern: "Custom Hooks",
        reason: "Multiple components with hooks suggest need for custom hooks",
        confidence: 0.75,
        benefit: "Code reusability and separation of concerns",
      });
    }

    // Predict recommended patterns
    if (
      components.some((c) => c.name.includes("Modal")) &&
      !this.hasPattern(patterns, "portal-pattern")
    ) {
      predictions.recommended.push({
        pattern: "Portal Pattern",
        reason: "Modal components should use React portals",
        confidence: 0.9,
        implementation: "Use ReactDOM.createPortal for modals",
      });
    }

    // Detect potential antipatterns
    const highComplexityComponents =
      projectState.codebaseAwareness.files.filter(
        (f: any) => f.complexity > 15
      );

    if (highComplexityComponents.length > 0) {
      predictions.antipatterns.push({
        pattern: "God Components",
        files: highComplexityComponents.map((f: any) => f.path),
        reason: "Components with high complexity violate single responsibility",
        confidence: 0.8,
        fix: "Break down into smaller, focused components",
      });
    }

    return predictions;
  }

  private async predictIssues(
    projectState: any,
    options: PredictionOptions
  ): Promise<any> {
    const predictions = {
      performance: [] as any[],
      security: [] as any[],
      maintainability: [] as any[],
      accessibility: [] as any[],
    };

    const files = projectState.codebaseAwareness.files;

    // Predict performance issues
    const largeComponents = files.filter((f: any) => f.complexity > 20);
    if (largeComponents.length > 0) {
      predictions.performance.push({
        issue: "Component Complexity",
        affected: largeComponents.map((f: any) => f.path),
        severity: "medium",
        prediction: "May cause rendering performance issues",
        confidence: 0.7,
      });
    }

    // Predict security issues
    const formComponents = files.filter((f: any) =>
      f.patterns.includes("form")
    );
    if (formComponents.length > 0) {
      predictions.security.push({
        issue: "Input Validation",
        affected: formComponents.map((f: any) => f.path),
        severity: "high",
        prediction: "Forms need input validation and sanitization",
        confidence: 0.85,
      });
    }

    // Predict maintainability issues
    const outdatedPatterns = projectState.architecturalPatterns.filter(
      (p: any) => this.isOutdatedPattern(p.name)
    );

    if (outdatedPatterns.length > 0) {
      predictions.maintainability.push({
        issue: "Outdated Patterns",
        patterns: outdatedPatterns.map((p: any) => p.name),
        severity: "low",
        prediction: "May become harder to maintain as ecosystem evolves",
        confidence: 0.6,
      });
    }

    return predictions;
  }

  private async predictOptimizations(
    projectState: any,
    options: PredictionOptions
  ): Promise<any> {
    const predictions = {
      performance: [] as any[],
      bundle: [] as any[],
      code_quality: [] as any[],
      developer_experience: [] as any[],
    };

    // Predict performance optimizations
    const components = await this.getExistingComponents();

    const listComponents = components.filter(
      (c) =>
        c.name.includes("List") ||
        c.name.includes("Table") ||
        c.name.includes("Grid")
    );

    if (listComponents.length > 0) {
      predictions.performance.push({
        optimization: "Virtualization",
        components: listComponents.map((c) => c.name),
        reason: "Large lists benefit from virtualization",
        confidence: 0.8,
        impact: "Improved rendering performance for large datasets",
      });
    }

    // Predict bundle optimizations
    if (projectState.codebaseAwareness.files.length > 50) {
      predictions.bundle.push({
        optimization: "Code Splitting",
        reason: "Large codebase benefits from route-based code splitting",
        confidence: 0.85,
        impact: "Reduced initial bundle size",
      });
    }

    return predictions;
  }

  private async predictGeneral(
    projectState: any,
    options: PredictionOptions
  ): Promise<any> {
    // Combine all prediction types for general overview
    const nextSteps = await this.predictNextSteps(projectState, options);
    const dependencies = await this.predictDependencies(projectState, options);
    const patterns = await this.predictPatterns(projectState, options);
    const issues = await this.predictIssues(projectState, options);
    const optimizations = await this.predictOptimizations(
      projectState,
      options
    );

    return {
      summary: {
        nextSteps: nextSteps.suggestedComponents.length,
        dependencies: dependencies.needed.length,
        patterns: patterns.recommended.length,
        potential_issues: issues.performance.length + issues.security.length,
        optimizations:
          optimizations.performance.length + optimizations.bundle.length,
      },
      top_recommendations: [
        ...nextSteps.suggestedComponents.slice(0, 2),
        ...dependencies.needed.slice(0, 2),
        ...patterns.recommended.slice(0, 2),
      ].sort((a, b) => (b.confidence || 0) - (a.confidence || 0)),
    };
  }

  private async displayPredictions(
    action: string,
    predictions: any,
    options: PredictionOptions
  ): Promise<void> {
    console.log(chalk.blue.bold(`\n🔮 Predictions for: ${action}\n`));

    if (action === "next" || action === "general") {
      this.displayNextStepPredictions(predictions);
    }

    if (action === "dependencies") {
      this.displayDependencyPredictions(predictions);
    }

    if (action === "patterns") {
      this.displayPatternPredictions(predictions);
    }

    if (action === "issues") {
      this.displayIssuePredictions(predictions);
    }

    if (action === "optimization") {
      this.displayOptimizationPredictions(predictions);
    }

    if (action === "general") {
      this.displayGeneralSummary(predictions);
    }

    console.log(
      chalk.gray(
        `\n💡 Run 'mycontext predict <specific-type>' for detailed predictions`
      )
    );
  }

  private displayNextStepPredictions(predictions: any): void {
    if (predictions.suggestedComponents?.length > 0) {
      console.log(chalk.yellow.bold("📦 Suggested Components:"));
      predictions.suggestedComponents.forEach((comp: any) => {
        const confidence = Math.round(comp.confidence * 100);
        const priority =
          comp.priority === "high"
            ? "🔴"
            : comp.priority === "medium"
            ? "🟡"
            : "🟢";
        console.log(
          `  ${priority} ${chalk.cyan(comp.name)} (${confidence}% confidence)`
        );
        console.log(`     ${chalk.gray(comp.reason)}`);
      });
      console.log();
    }

    if (predictions.immediateActions?.length > 0) {
      console.log(chalk.red.bold("⚡ Immediate Actions:"));
      predictions.immediateActions.forEach((action: any) => {
        console.log(`  • ${chalk.yellow(action.action)}: ${action.target}`);
        console.log(`    ${chalk.gray(action.reason)}`);
      });
      console.log();
    }
  }

  private displayDependencyPredictions(predictions: any): void {
    if (predictions.needed?.length > 0) {
      console.log(chalk.green.bold("📦 Suggested Dependencies:"));
      predictions.needed.forEach((dep: any) => {
        const confidence = Math.round(dep.confidence * 100);
        console.log(
          `  • ${chalk.cyan(dep.package)} (${confidence}% confidence)`
        );
        console.log(`    ${chalk.gray(dep.reason)}`);
        if (dep.alternative) {
          console.log(`    ${chalk.gray(`Alternative: ${dep.alternative}`)}`);
        }
      });
      console.log();
    }
  }

  private displayPatternPredictions(predictions: any): void {
    if (predictions.recommended?.length > 0) {
      console.log(chalk.blue.bold("🏗️ Recommended Patterns:"));
      predictions.recommended.forEach((pattern: any) => {
        console.log(`  • ${chalk.cyan(pattern.pattern)}`);
        console.log(`    ${chalk.gray(pattern.reason)}`);
      });
      console.log();
    }
  }

  private displayIssuePredictions(predictions: any): void {
    ["performance", "security", "maintainability", "accessibility"].forEach(
      (category) => {
        const issues = predictions[category];
        if (issues?.length > 0) {
          console.log(
            chalk.red.bold(
              `⚠️ Potential ${
                category.charAt(0).toUpperCase() + category.slice(1)
              } Issues:`
            )
          );
          issues.forEach((issue: any) => {
            console.log(`  • ${chalk.yellow(issue.issue)} (${issue.severity})`);
            console.log(`    ${chalk.gray(issue.prediction)}`);
          });
          console.log();
        }
      }
    );
  }

  private displayOptimizationPredictions(predictions: any): void {
    ["performance", "bundle", "code_quality"].forEach((category) => {
      const opts = predictions[category];
      if (opts?.length > 0) {
        console.log(
          chalk.green.bold(
            `⚡ ${
              category.charAt(0).toUpperCase() + category.slice(1)
            } Optimizations:`
          )
        );
        opts.forEach((opt: any) => {
          console.log(`  • ${chalk.cyan(opt.optimization)}`);
          console.log(`    ${chalk.gray(opt.reason)}`);
          console.log(`    ${chalk.gray(`Impact: ${opt.impact}`)}`);
        });
        console.log();
      }
    });
  }

  private displayGeneralSummary(predictions: any): void {
    console.log(chalk.blue.bold("📊 Prediction Summary:"));
    console.log(`  Next steps: ${predictions.summary.nextSteps} suggestions`);
    console.log(
      `  Dependencies: ${predictions.summary.dependencies} recommendations`
    );
    console.log(`  Patterns: ${predictions.summary.patterns} opportunities`);
    console.log(
      `  Potential issues: ${predictions.summary.potential_issues} detected`
    );
    console.log(
      `  Optimizations: ${predictions.summary.optimizations} available`
    );
    console.log();

    if (predictions.top_recommendations?.length > 0) {
      console.log(chalk.yellow.bold("🎯 Top Recommendations:"));
      predictions.top_recommendations
        .slice(0, 3)
        .forEach((rec: any, idx: number) => {
          const confidence = rec.confidence
            ? Math.round(rec.confidence * 100) + "%"
            : "N/A";
          console.log(
            `  ${idx + 1}. ${chalk.cyan(
              rec.name || rec.package || rec.pattern
            )} (${confidence})`
          );
          console.log(`     ${chalk.gray(rec.reason)}`);
        });
    }
  }

  // Helper methods
  private async getExistingComponents(): Promise<any[]> {
    const compListPath = path.join(
      process.cwd(),
      ".mycontext",
      "04-component-list.json"
    );
    if (await fs.pathExists(compListPath)) {
      try {
        const compList = await fs.readJson(compListPath);
        return compList.groups?.flatMap((g: any) => g.components || []) || [];
      } catch {
        return [];
      }
    }
    return [];
  }

  private hasComponent(components: any[], name: string): boolean {
    return components.some((c) => c.name === name);
  }

  private hasPattern(patterns: any[], pattern: string): boolean {
    return patterns.some((p) => p.name.includes(pattern));
  }

  private isRecentlyModified(date: Date): boolean {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    return date > threeDaysAgo;
  }

  private hasTests(filePath: string): boolean {
    // Simplified test detection
    return filePath.includes(".test.") || filePath.includes(".spec.");
  }

  private async getPackageDependencies(): Promise<string[]> {
    const packagePath = path.join(process.cwd(), "package.json");
    if (await fs.pathExists(packagePath)) {
      try {
        const pkg = await fs.readJson(packagePath);
        return Object.keys({ ...pkg.dependencies, ...pkg.devDependencies });
      } catch {
        return [];
      }
    }
    return [];
  }

  private isOutdatedPattern(pattern: string): boolean {
    const outdatedPatterns = ["class-components", "prop-types", "enzyme"];
    return outdatedPatterns.includes(pattern);
  }

  private calculateAverageConfidence(items: any[]): number {
    if (items.length === 0) return 0;
    const sum = items.reduce((acc, item) => acc + (item.confidence || 0), 0);
    return sum / items.length;
  }

  private async savePredictions(
    action: string,
    predictions: any
  ): Promise<void> {
    const predictionsPath = path.join(
      process.cwd(),
      ".mycontext",
      "predictions.json"
    );

    let existingPredictions = {};
    if (await fs.pathExists(predictionsPath)) {
      try {
        existingPredictions = await fs.readJson(predictionsPath);
      } catch {}
    }

    const newPredictions = {
      ...existingPredictions,
      [action]: {
        timestamp: new Date().toISOString(),
        predictions,
      },
    };

    await fs.ensureDir(path.dirname(predictionsPath));
    await fs.writeJson(predictionsPath, newPredictions, { spaces: 2 });
  }
}

// Command registration
export const predict = new Command("predict")
  .description("🔮 Predict next development steps and opportunities")
  .argument(
    "[action]",
    "Prediction type: next, dependencies, patterns, issues, optimization",
    "general"
  )
  .option(
    "--confidence <threshold>",
    "Minimum confidence threshold (0-1)",
    "0.5"
  )
  .option("--context <type>", "Context filter (component, api, ui, etc.)")
  .option("--verbose", "Show detailed predictions")
  .action(async (action: string, options: PredictionOptions) => {
    try {
      const predictCommand = new PredictCommand();
      await predictCommand.execute(action, options);
    } catch (error: any) {
      console.error(chalk.red("❌ Prediction failed:"), error.message);
      process.exit(1);
    }
  });
