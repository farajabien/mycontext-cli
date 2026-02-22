/**
 * Init Interactive Command
 *
 * The user-facing entry point for deterministic compilation with AI-powered inference.
 * This command implements the "Self-Organizing Planner" where the AI:
 * 1. Decomposes the project into inference tasks
 * 2. Auto-infers high-confidence tasks (≥90%)
 * 3. Self-critiques its work
 * 4. Learns from user corrections
 * 5. Only prompts for ambiguous items
 *
 * Flow:
 * 1. Ask: "What are you building?"
 * 2. Decompose into tasks with confidence scores
 * 3. Auto-infer high-confidence tasks
 * 4. Show checkpoints for review
 * 5. Prompt for low-confidence items
 * 6. Show final diff preview
 * 7. Get user approval
 * 8. Save ASL to .mycontext/asl.json
 */

import inquirer from "inquirer";
import chalk from "chalk";
import ora from "ora";
import fs from "fs/promises";
import path from "path";
import type {
  ASL,
  Question,
  EntitySpec,
  FieldSpec,
  PageSpec,
  RoleSpec,
  PermissionSpec,
  InferenceTask,
  InferenceResult,
  Checkpoint,
  ContextRevelation,
} from "../types/asl";
import { Planner } from "../services/Planner";
import { InferenceEngine } from "../services/InferenceEngine";
import { AICore } from "../core/ai/AICore";

export class InitInteractiveCommand {
  private planner: Planner;
  private inferenceEngine: InferenceEngine;
  private ai: AICore;
  private asl: Partial<ASL>;

  constructor() {
    this.planner = new Planner();
    this.inferenceEngine = new InferenceEngine();
    this.ai = AICore.getInstance({
      fallbackEnabled: true,
      workingDirectory: process.cwd(),
    });
    this.asl = { version: "1.0" };
  }

  /**
   * Main entry point - NEW INFERENCE-BASED FLOW
   */
  async execute(): Promise<void> {
    console.log(chalk.bold.cyan("\n🎯 MyContext Interactive Setup\n"));
    console.log(
      chalk.dim("Describe your project and I'll build a complete specification with minimal questions.\n")
    );

    try {
      // Step 1: Get initial input
      const initialInput = await this.askInitialQuestion();

      // Step 2: Decompose into tasks
      console.log(chalk.cyan("\n🤖 Breaking down into tasks...\n"));
      const tasks = await this.planner.decompose(initialInput);
      this.displayTaskDecomposition(tasks);

      // Step 3: Recursive inference loop
      console.log(chalk.cyan("\n🤖 Auto-inferring high-confidence tasks...\n"));
      await this.recursiveInferenceLoop();

      // Step 4: Show checkpoints and get approval
      await this.showCheckpointsAndConfirm();

      // Step 5: Show final diff preview
      await this.showDiffPreview();

      // Step 6: Get final approval
      const approved = await this.getApproval();

      if (approved) {
        // Step 7: Save ASL
        await this.saveASL();

        console.log(chalk.green("\n✓ Specification complete!\n"));
        console.log(chalk.cyan("📊 Summary:"));
        console.log(chalk.gray(`   Auto-inferred: ${this.getAutoInferredCount()} items`));
        console.log(chalk.gray(`   User prompted: ${this.getUserPromptedCount()} items`));
        console.log(chalk.gray(`   Overall confidence: ${this.planner.getState().confidenceScore}%\n`));
        console.log(chalk.cyan("Next step: Run ") + chalk.bold("mycontext scaffold --from-manifest\n"));
      } else {
        console.log(chalk.yellow("\n⚠ Setup cancelled\n"));
      }
    } catch (error) {
      console.error(chalk.red("\n✗ Setup failed:"), error);
      throw error;
    }
  }

  // ============================================================================
  // NEW INFERENCE-BASED METHODS
  // ============================================================================

  /**
   * Ask single initial question
   */
  private async askInitialQuestion(): Promise<string> {
    const answers = await inquirer.prompt([
      {
        type: "input",
        name: "description",
        message: "What are you building?",
        validate: (input: string) => {
          if (!input || input.length < 10) {
            return "Please provide at least 10 characters describing your project";
          }
          return true;
        },
      },
    ]);

    return answers.description;
  }

  /**
   * Display task decomposition
   */
  private displayTaskDecomposition(tasks: InferenceTask[]): void {
    console.log(chalk.bold("📋 Task decomposition:\n"));

    tasks.forEach((task, idx) => {
      const confidenceColor = task.confidence >= 90 ? chalk.green :
                             task.confidence >= 70 ? chalk.yellow :
                             chalk.red;

      console.log(
        chalk.gray(`  ${idx + 1}.`) +
        ` ${task.description} - ` +
        confidenceColor(`${task.confidence}% confidence`)
      );
    });

    console.log(chalk.gray(`\n  Total: ${tasks.length} tasks\n`));
  }

  /**
   * Recursive inference loop
   */
  private async recursiveInferenceLoop(): Promise<void> {
    const state = this.planner.getState();
    const completedTasks: InferenceTask[] = [];
    const autoInferredTasks: InferenceTask[] = [];

    while (true) {
      // Select next task
      const task = this.planner.selectNextTask();
      if (!task) break;

      if (task.autoInfer) {
        // Auto-infer with spinner
        const spinner = ora(`Inferring: ${task.description}`).start();

        try {
          // Run inference
          const inference = await this.inferenceEngine.infer(
            task,
            this.asl,
            completedTasks
          );

          // Self-critique
          const critique = await this.inferenceEngine.selfCritique(
            inference,
            this.asl
          );

          spinner.stop();

          if (critique.confidence >= 90) {
            // Accept inference
            this.asl = { ...this.asl, ...inference.result };
            task.inference = inference.result;
            task.reasoning = inference.reasoning;

            // Reveal context
            const revelations = this.planner.revealContext(task, inference.result);
            revelations.forEach(rev => {
              console.log(
                chalk.green("✓") +
                ` ${rev.message} ` +
                chalk.gray(`(${rev.confidence}% confidence)`)
              );
            });

            autoInferredTasks.push(task);
            this.planner.markTaskComplete(task.id);
            completedTasks.push(task);

            // Update dependent tasks
            this.planner.updateDependentTasks(task);
          } else {
            // Drop to confirmation
            task.needsConfirmation = true;
            await this.confirmInference(task, inference, critique);
          }
        } catch (error) {
          spinner.fail(`Failed to infer: ${task.description}`);
          console.error(chalk.red(error));
        }
      } else if (task.needsConfirmation) {
        // Suggest with confirmation
        await this.confirmInference(task, null);
      } else {
        // Direct user prompt
        await this.promptUser(task);
      }
    }

    // Create checkpoint if we auto-inferred anything
    if (autoInferredTasks.length > 0) {
      this.planner.createCheckpoint(autoInferredTasks);
    }
  }

  /**
   * Confirm inference with user
   */
  private async confirmInference(
    task: InferenceTask,
    inference: InferenceResult | null,
    critique?: any
  ): Promise<void> {
    console.log(chalk.yellow("\n❓ Need confirmation:\n"));
    console.log(chalk.dim(`   ${task.description}\n`));

    if (inference) {
      console.log(chalk.dim("   Suggested:"));
      console.log(chalk.dim(`   ${JSON.stringify(inference.result, null, 2)}\n`));

      if (critique && critique.issues.length > 0) {
        console.log(chalk.yellow("   ⚠ Potential issues:"));
        critique.issues.forEach((issue: any) => {
          console.log(chalk.yellow(`   • ${issue.message}`));
        });
        console.log();
      }
    }

    const { confirmed } = await inquirer.prompt([
      {
        type: "confirm",
        name: "confirmed",
        message: "Accept this inference?",
        default: true,
      },
    ]);

    if (confirmed && inference) {
      this.asl = { ...this.asl, ...inference.result };
      task.inference = inference.result;
      this.planner.markTaskComplete(task.id);
    } else {
      // Fall back to direct prompt
      await this.promptUser(task);
    }
  }

  /**
   * Prompt user directly for a task
   */
  private async promptUser(task: InferenceTask): Promise<void> {
    console.log(chalk.cyan(`\n❓ ${task.description}\n`));

    // Generic text input for now
    // TODO: Add type-specific prompts (select, multi-select, etc.)
    const { answer } = await inquirer.prompt([
      {
        type: "input",
        name: "answer",
        message: "Your answer:",
      },
    ]);

    // Parse answer with AI
    const spinner = ora("Processing your answer...").start();

    try {
      const parsedInference = await this.inferenceEngine.infer(
        {
          ...task,
          description: `${task.description}. User said: "${answer}"`,
        },
        this.asl,
        []
      );

      this.asl = { ...this.asl, ...parsedInference.result };
      task.inference = parsedInference.result;

      spinner.succeed("Answer processed");
      this.planner.markTaskComplete(task.id);
    } catch (error) {
      spinner.fail("Failed to process answer");
      console.error(chalk.red(error));
    }
  }

  /**
   * Show checkpoints and get confirmation
   */
  private async showCheckpointsAndConfirm(): Promise<void> {
    const state = this.planner.getState();

    if (state.checkpoints.length === 0) return;

    console.log(chalk.cyan("\n💡 Checkpoint - Review Auto-Inferred Items:\n"));

    state.checkpoints.forEach(checkpoint => {
      console.log(chalk.bold(`  Checkpoint ${checkpoint.id}:`));
      console.log(chalk.gray(`  ✓ ${checkpoint.summary.entitiesCreated.length} entities`));
      console.log(chalk.gray(`  ✓ ${checkpoint.summary.fieldsAdded} fields`));
      console.log(chalk.gray(`  ✓ ${checkpoint.summary.rolesCreated.length} roles`));
      console.log(chalk.gray(`  ✓ ${checkpoint.summary.permissionsAdded} permissions`));
      console.log(chalk.gray(`  ✓ ${checkpoint.summary.pagesCreated.length} pages`));
      console.log(chalk.gray(`  Overall confidence: ${checkpoint.summary.totalConfidence}%\n`));
    });

    const { action } = await inquirer.prompt([
      {
        type: "list",
        name: "action",
        message: "What would you like to do?",
        choices: [
          { name: "Continue", value: "continue" },
          { name: "Edit inferences", value: "edit" },
          { name: "Cancel", value: "cancel" },
        ],
      },
    ]);

    if (action === "cancel") {
      throw new Error("User cancelled");
    }

    if (action === "edit") {
      // TODO: Implement interactive editing
      console.log(chalk.yellow("\n⚠ Interactive editing coming soon. For now, you can edit in the final diff.\n"));
    }
  }

  /**
   * Get counts for summary
   */
  private getAutoInferredCount(): number {
    const state = this.planner.getState();
    return state.tasks.filter(t => t.autoInfer && t.completed).length;
  }

  private getUserPromptedCount(): number {
    const state = this.planner.getState();
    return state.tasks.filter(t => !t.autoInfer && t.completed).length;
  }

  // ============================================================================
  // OLD METHODS (KEEP FOR COMPATIBILITY)
  // ============================================================================

  /**
   * OLD: Recursive clarification loop (legacy, not used in new flow)
   */
  private async recursiveClarificationLoop_OLD(): Promise<void> {
    let iteration = 0;
    const maxIterations = 20; // Safety limit

    while (!this.planner.isComplete(this.asl) && iteration < maxIterations) {
      iteration++;

      // Validate current ASL
      const validation = this.planner.validate(this.asl);

      console.log(
        chalk.cyan(
          `\n📊 Completeness: ${chalk.bold(validation.completeness + "%")}\n`
        )
      );

      // Generate questions for gaps
      const questions = this.planner.generateQuestions(this.asl);

      if (questions.length === 0) {
        // No more questions, but still not complete
        // This shouldn't happen, but handle gracefully
        console.log(
          chalk.yellow("⚠ No more questions, but specification may be incomplete")
        );
        break;
      }

      // Ask questions in batches by category
      const categorized = this.categorizeQuestions(questions);

      for (const [category, categoryQuestions] of Object.entries(categorized)) {
        await this.askQuestionBatch(category, categoryQuestions);
      }
    }

    if (iteration >= maxIterations) {
      console.log(
        chalk.yellow("\n⚠ Reached maximum iterations. Proceeding with current state.\n")
      );
    }
  }

  /**
   * Ask a batch of questions for a specific category
   */
  private async askQuestionBatch(
    category: string,
    questions: Question[]
  ): Promise<void> {
    console.log(chalk.bold.cyan(`\n📝 ${this.categoryLabel(category)}\n`));

    for (const question of questions) {
      const answer = await this.askQuestion(question);
      await this.processAnswer(question, answer);
    }
  }

  /**
   * Ask a single question
   */
  private async askQuestion(question: Question): Promise<any> {
    const inquirerQuestion: any = {
      type: this.mapQuestionType(question.type),
      name: "answer",
      message: question.text,
    };

    if (question.options) {
      inquirerQuestion.choices = question.options.map(opt => ({
        name: opt.description ? `${opt.label} - ${opt.description}` : opt.label,
        value: opt.value,
      }));
    }

    if (question.validation?.required) {
      inquirerQuestion.validate = (input: any) => {
        if (!input) return "This field is required";
        return true;
      };
    }

    const { answer } = await inquirer.prompt([inquirerQuestion]);
    return answer;
  }

  /**
   * Process answer and update ASL
   */
  private async processAnswer(question: Question, answer: any): Promise<void> {
    const [section, ...rest] = question.id.split(".");

    switch (section) {
      case "project":
        this.updateProject(rest.join("."), answer);
        break;
      case "entities":
        await this.updateEntities(rest, answer);
        break;
      case "auth":
        this.updateAuth(rest.join("."), answer);
        break;
      case "permissions":
        this.updatePermissions(rest.join("."), answer);
        break;
      case "pages":
        await this.updatePages(rest, answer);
        break;
      case "design":
        this.updateDesign(rest.join("."), answer);
        break;
    }
  }

  /**
   * Update project section
   */
  private updateProject(field: string, value: any): void {
    if (!this.asl.project) {
      this.asl.project = {
        name: "",
        description: "",
        framework: "nextjs",
        backend: "instantdb",
      };
    }

    (this.asl.project as any)[field] = value;
  }

  /**
   * Update entities section (uses AI to parse)
   */
  private async updateEntities(path: string[], value: any): Promise<void> {
    if (!this.asl.entities) this.asl.entities = {};

    if (path[0] === "list") {
      // Parse entity list
      const entityNames = value.split(",").map((e: string) => e.trim());

      entityNames.forEach((name: string) => {
        if (!this.asl.entities![name]) {
          this.asl.entities![name] = {
            name,
            fields: [],
            timestamps: true,
          };
        }
      });
    } else if (path[1] === "fields") {
      // Parse fields for specific entity
      const entityName = path[0];
      if (!entityName) return;
      const fields = await this.parseFieldsWithAI(entityName, value);
      if (this.asl.entities && this.asl.entities[entityName]) {
        this.asl.entities[entityName]!.fields = fields;
      }
    }
  }

  /**
   * Use AI to parse field definitions from natural language
   */
  private async parseFieldsWithAI(
    entityName: string,
    userInput: string
  ): Promise<FieldSpec[]> {
    const spinner = ora(`Parsing fields for ${entityName}...`).start();

    try {
      const prompt = `Parse the following field definitions for entity "${entityName}" into structured JSON.

User input: ${userInput}

Return a JSON array of fields with this structure:
{
  "fields": [
    {
      "name": "fieldName",
      "type": "string" | "number" | "boolean" | "date" | "json" | "ref",
      "required": true | false,
      "description": "field description"
    }
  ]
}

Examples:
- "title (string, required), content (string), published (boolean)"
- "email (unique string), age (number), bio (optional string)"

Return only valid JSON, no markdown.`;

      const response = await this.ai.generateText(prompt, {
        temperature: 0.1,
        maxTokens: 1000,
      });

      const parsed = JSON.parse(response);
      spinner.succeed(`Parsed ${parsed.fields.length} fields for ${entityName}`);

      return parsed.fields;
    } catch (error) {
      spinner.fail("Failed to parse fields");
      console.error(error);
      return [];
    }
  }

  /**
   * Update auth section
   */
  private updateAuth(field: string, value: any): void {
    if (!this.asl.auth) {
      this.asl.auth = {
        provider: "email",
        roles: [],
      };
    }

    if (field === "provider") {
      this.asl.auth.provider = value;
    } else if (field === "roles") {
      // Convert array of role names to RoleSpec[]
      if (Array.isArray(value)) {
        this.asl.auth.roles = value.map(name => ({
          name,
          description: `${name} role`,
        }));
      }
    } else if (field === "needed") {
      if (!value) {
        delete this.asl.auth;
      }
    }
  }

  /**
   * Update permissions section
   */
  private updatePermissions(field: string, value: any): void {
    if (!this.asl.permissions) this.asl.permissions = [];

    if (field === "needed" && value) {
      // Generate default permissions based on roles and entities
      if (this.asl.auth?.roles && this.asl.entities) {
        this.asl.auth.roles.forEach(role => {
          Object.keys(this.asl.entities!).forEach(entity => {
            if (role.name === "admin") {
              // Admins get full access
              this.asl.permissions!.push({
                role: role.name,
                resource: entity,
                actions: ["create", "read", "update", "delete"],
              });
            } else {
              // Regular users get limited access
              this.asl.permissions!.push({
                role: role.name,
                resource: entity,
                actions: ["read"],
                condition: { type: "own", field: "user_id" },
              });
            }
          });
        });
      }
    }
  }

  /**
   * Update pages section (uses AI to parse)
   */
  private async updatePages(path: string[], value: any): Promise<void> {
    if (!this.asl.pages) this.asl.pages = [];

    if (path[0] === "list") {
      // Parse page list
      const pages = await this.parsePagesWithAI(value);
      this.asl.pages = pages;
    } else {
      // Update specific page field
      const match = path[0]?.match(/\d+/);
      const pageIndex = parseInt(match?.[0] || "0");
      const field = path[1];

      if (!this.asl.pages || !this.asl.pages[pageIndex] || !field) return;

      (this.asl.pages[pageIndex] as any)[field] = value;
    }
  }

  /**
   * Use AI to parse page definitions
   */
  private async parsePagesWithAI(userInput: string): Promise<PageSpec[]> {
    const spinner = ora("Parsing pages...").start();

    try {
      const prompt = `Parse the following page definitions into structured JSON.

User input: ${userInput}

Return a JSON array of pages with this structure:
{
  "pages": [
    {
      "path": "/path",
      "name": "PageName",
      "type": "page",
      "title": "Page Title",
      "public": true | false
    }
  ]
}

Examples:
- "Home (/), Posts (/posts), Profile (/profile)"
- "Landing page (public), Dashboard (/dashboard, protected), Settings"

Return only valid JSON, no markdown.`;

      const response = await this.ai.generateText(prompt, {
        temperature: 0.1,
        maxTokens: 1000,
      });

      const parsed = JSON.parse(response);
      spinner.succeed(`Parsed ${parsed.pages.length} pages`);

      return parsed.pages;
    } catch (error) {
      spinner.fail("Failed to parse pages");
      console.error(error);
      return [];
    }
  }

  /**
   * Update design section
   */
  private updateDesign(field: string, value: any): void {
    if (!this.asl.design) {
      this.asl.design = {
        theme: "light",
      };
    }

    (this.asl.design as any)[field] = value;
  }

  /**
   * Show diff preview
   */
  private async showDiffPreview(): Promise<void> {
    console.log(chalk.bold.cyan("\n📋 Generation Preview\n"));

    const diff = this.planner.generateDiff(this.asl as ASL);

    // Summary
    console.log(chalk.bold("Summary:"));
    console.log(
      chalk.green(`  ✓ ${diff.summary.totalFiles} files will be generated`)
    );
    console.log(
      chalk.cyan(
        `  ✓ ~${Math.round(diff.summary.linesAdded)} lines of code`
      )
    );
    console.log();

    // File breakdown
    console.log(chalk.bold("Files:"));
    const filesByType = this.groupFilesByType(diff.files);

    Object.entries(filesByType).forEach(([type, files]) => {
      console.log(chalk.cyan(`  ${this.fileTypeLabel(type)}: ${files.length}`));
    });
    console.log();

    // Registries
    if (diff.registries.length > 0) {
      console.log(chalk.bold("Registries:"));
      diff.registries.forEach(reg => {
        console.log(
          chalk.cyan(`  ${reg.type}: ${reg.added.length} items`)
        );
      });
      console.log();
    }

    // Warnings
    if (diff.warnings && diff.warnings.length > 0) {
      console.log(chalk.bold.yellow("⚠ Warnings:"));
      diff.warnings.forEach(warning => {
        console.log(chalk.yellow(`  - ${warning}`));
      });
      console.log();
    }

    // Show sample files
    console.log(chalk.bold("Sample files:\n"));
    diff.files.slice(0, 5).forEach(file => {
      console.log(chalk.dim(`  ${file.path}`));
      if (file.preview) {
        console.log(
          chalk.dim(`    ${file.preview.split("\n").slice(0, 2).join("\n    ")}`)
        );
      }
    });

    if (diff.files.length > 5) {
      console.log(chalk.dim(`  ... and ${diff.files.length - 5} more files`));
    }
    console.log();
  }

  /**
   * Get user approval
   */
  private async getApproval(): Promise<boolean> {
    const { approve } = await inquirer.prompt([
      {
        type: "confirm",
        name: "approve",
        message: "Generate these files?",
        default: true,
      },
    ]);

    return approve;
  }

  /**
   * Save ASL to .mycontext/asl.json
   */
  private async saveASL(): Promise<void> {
    const spinner = ora("Saving manifest...").start();

    try {
      // Ensure .mycontext directory exists
      const mycontextDir = path.join(process.cwd(), ".mycontext");
      await fs.mkdir(mycontextDir, { recursive: true });

      // Save ASL
      const aslPath = path.join(mycontextDir, "asl.json");
      await fs.writeFile(aslPath, JSON.stringify(this.asl, null, 2), "utf-8");

      spinner.succeed(`Manifest saved to ${chalk.cyan(".mycontext/asl.json")}`);
    } catch (error) {
      spinner.fail("Failed to save manifest");
      throw error;
    }
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private categorizeQuestions(
    questions: Question[]
  ): Record<string, Question[]> {
    const categorized: Record<string, Question[]> = {};

    questions.forEach(q => {
      if (!categorized[q.category]) {
        categorized[q.category] = [];
      }
      categorized[q.category]!.push(q);
    });

    return categorized;
  }

  private categoryLabel(category: string): string {
    const labels: Record<string, string> = {
      project: "Project Information",
      entities: "Data Models (Entities)",
      auth: "Authentication",
      permissions: "Permissions (RBAC)",
      pages: "Pages & Routes",
      design: "Design & Styling",
    };
    return labels[category] || category;
  }

  private mapQuestionType(type: string): string {
    const mapping: Record<string, string> = {
      text: "input",
      number: "number",
      boolean: "confirm",
      select: "list",
      "multi-select": "checkbox",
      "entity-builder": "input",
      "field-builder": "input",
    };
    return mapping[type] || "input";
  }

  private groupFilesByType(files: any[]): Record<string, any[]> {
    const grouped: Record<string, any[]> = {};

    files.forEach(file => {
      if (!grouped[file.type]) {
        grouped[file.type] = [];
      }
      grouped[file.type]!.push(file);
    });

    return grouped;
  }

  private fileTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      schema: "Schema",
      type: "Types",
      page: "Pages",
      component: "Components",
      action: "Server Actions",
      config: "Configuration",
    };
    return labels[type] || type;
  }
}
