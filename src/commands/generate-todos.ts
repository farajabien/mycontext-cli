import { Command } from "commander";
import { HybridAIClient } from "../utils/hybridAIClient";
import { HostedApiClient } from "../utils/hostedApiClient";
import chalk from "chalk";
import fs from "fs";
import path from "path";

interface TodoGenerationOptions {
  count?: number;
  focus?: string;
  energyLevel?: "low" | "medium" | "high";
  complexity?: "simple" | "moderate" | "complex";
  projectId?: string;
}

export class GenerateTodosCommand {
  private aiClient: HybridAIClient;
  private hostedApiClient: HostedApiClient;

  constructor() {
    this.aiClient = new HybridAIClient();
    this.hostedApiClient = new HostedApiClient();
  }

  public register(program: Command): void {
    program
      .command("generate-todos")
      .description("Generate contextual todos from project context")
      .option("-c, --count <number>", "Number of todos to generate", "10")
      .option("-f, --focus <string>", "Focus area for todo generation")
      .option(
        "-e, --energy <level>",
        "Energy level (low, medium, high)",
        "medium"
      )
      .option(
        "-x, --complexity <level>",
        "Complexity level (simple, moderate, complex)",
        "moderate"
      )
      .option("-p, --project <id>", "Project ID for context")
      .action(async (options) => {
        await this.generateTodos(options);
      });
  }

  public async generateTodos(options: TodoGenerationOptions): Promise<void> {
    try {
      console.log(chalk.blue("🎯 Generating contextual todos...\n"));

      // Check if we have local AI keys
      if (this.hasLocalAIKeys()) {
        console.log(chalk.yellow("Using local AI providers..."));
        await this.generateWithLocalAI(options);
      } else {
        console.log(chalk.yellow("Using hosted MyContext AI..."));
        await this.generateWithHostedAI(options);
      }

      console.log(chalk.green("\n✅ Todo generation completed!"));
    } catch (error) {
      console.error(chalk.red("❌ Error generating todos:"), error);
      process.exit(1);
    }
  }

  private hasLocalAIKeys(): boolean {
    return !!(
      process.env.MYCONTEXT_GITHUB_TOKEN ||
      process.env.MYCONTEXT_QWEN_API_KEY ||
      process.env.MYCONTEXT_GEMINI_API_KEY ||
      process.env.OPENAI_API_KEY ||
      process.env.ANTHROPIC_API_KEY ||
      process.env.HUGGINGFACE_API_KEY
    );
  }

  private async generateWithLocalAI(
    options: TodoGenerationOptions
  ): Promise<void> {
    const context = await this.loadProjectContext();
    const count = parseInt(String(options.count || "10"));
    const focus = options.focus || "general development tasks";
    const energyLevel = options.energyLevel || "medium";
    const complexity = options.complexity || "moderate";

    const prompt = this.buildTodoGenerationPrompt(context, {
      count,
      focus,
      energyLevel,
      complexity,
    });

    try {
      const response = await this.aiClient.generateText(prompt, {
        temperature: 0.3,
        maxTokens: 4000,
      });

      const parsedTodos = this.parseTodosFromResponse(response.text);
      await this.saveTodos(parsedTodos, options.projectId);

      console.log(
        chalk.green(`Generated ${parsedTodos.length} contextual todos`)
      );
      this.displayTodos(parsedTodos);
    } catch (error) {
      console.error(chalk.red("Error with local AI generation:"), error);
      throw error;
    }
  }

  private async generateWithHostedAI(
    options: TodoGenerationOptions
  ): Promise<void> {
    const context = await this.loadProjectContext();
    const count = parseInt(String(options.count || "10"));
    const focus = options.focus || "general development tasks";
    const energyLevel = options.energyLevel || "medium";
    const complexity = options.complexity || "moderate";

    try {
      const response = await this.hostedApiClient.generateText(
        `Generate ${count} contextual todos for a ${complexity} complexity project focused on ${focus} with ${energyLevel} energy level.`,
        {
          context: JSON.stringify(context),
          temperature: 0.3,
          maxTokens: 4000,
        }
      );

      const parsedTodos = this.parseTodosFromResponse(
        response.data?.message || response
      );
      await this.saveTodos(parsedTodos, options.projectId);

      console.log(
        chalk.green(`Generated ${parsedTodos.length} contextual todos`)
      );
      this.displayTodos(parsedTodos);
    } catch (error) {
      console.error(chalk.red("Error with hosted AI generation:"), error);
      throw error;
    }
  }

  private async loadProjectContext(): Promise<any> {
    const contextPath = path.join(process.cwd(), ".mycontext");

    if (!fs.existsSync(contextPath)) {
      throw new Error(
        "No .mycontext directory found. Run 'mycontext init' first."
      );
    }

    const context: any = {};

    // Load PRD
    const prdPath = path.join(contextPath, "01-prd.md");
    if (fs.existsSync(prdPath)) {
      context.prd = fs.readFileSync(prdPath, "utf8");
    }

    // Load types
    const typesPath = path.join(contextPath, "02-types.ts");
    if (fs.existsSync(typesPath)) {
      context.types = fs.readFileSync(typesPath, "utf8");
    }

    // Load component list
    const componentsPath = path.join(contextPath, "03-component-list.json");
    if (fs.existsSync(componentsPath)) {
      context.components = JSON.parse(fs.readFileSync(componentsPath, "utf8"));
    }

    // Load branding
    const brandingPath = path.join(contextPath, "04-branding.md");
    if (fs.existsSync(brandingPath)) {
      context.branding = fs.readFileSync(brandingPath, "utf8");
    }

    return context;
  }

  private buildTodoGenerationPrompt(
    context: any,
    options: {
      count: number;
      focus: string;
      energyLevel: string;
      complexity: string;
    }
  ): string {
    return `You are a project management AI assistant. Generate ${
      options.count
    } contextual todos for a ${options.complexity} complexity project.

Project Context:
${JSON.stringify(context, null, 2)}

Focus Area: ${options.focus}
Energy Level: ${options.energyLevel}
Complexity: ${options.complexity}

For each todo, provide:
1. A clear, actionable title (max 60 characters)
2. A detailed description with full project context
3. Priority level (low, medium, high, urgent)
4. Estimated time in minutes
5. Relevant considerations based on project context
6. Tags for categorization
7. Dependencies (if any)

Format the response as a JSON array with this structure:
[
  {
    "title": "Todo title",
    "description": "Detailed description with project context",
    "priority": "medium",
    "estimatedTime": 120,
    "considerations": ["Consideration 1", "Consideration 2"],
    "tags": ["tag1", "tag2"],
    "dependencies": ["todo-id-1", "todo-id-2"]
  }
]

Make sure each todo is:
- Specific and actionable
- Contextually relevant to the project
- Appropriate for the specified energy level and complexity
- Includes all necessary context for understanding
- Realistic in terms of time estimation
- Properly categorized with relevant tags`;
  }

  private parseTodosFromResponse(response: string): any[] {
    try {
      // Try to extract JSON from the response
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      // Fallback: create basic todos from text
      const lines = response.split("\n").filter((line) => line.trim());
      const todos = [];

      for (let i = 0; i < Math.min(lines.length, 10); i++) {
        const line = lines[i]?.trim() || "";
        if (line && !line.startsWith("#") && !line.startsWith("*")) {
          todos.push({
            title: line.substring(0, 60),
            description: line,
            priority: "medium",
            estimatedTime: 60,
            considerations: ["Generated from project context"],
            tags: ["generated"],
            dependencies: [],
          });
        }
      }

      return todos;
    } catch (error) {
      console.error("Error parsing todos from response:", error);
      return [];
    }
  }

  private async saveTodos(todos: any[], projectId?: string): Promise<void> {
    const todosPath = path.join(process.cwd(), ".mycontext", "todos.json");

    // Load existing todos
    let existingTodos = [];
    if (fs.existsSync(todosPath)) {
      try {
        existingTodos = JSON.parse(fs.readFileSync(todosPath, "utf8"));
      } catch (error) {
        console.warn("Could not load existing todos, starting fresh");
      }
    }

    // Add new todos with IDs
    const newTodos = todos.map((todo, index) => ({
      id: `todo-${Date.now()}-${index}`,
      ...todo,
      status: "todo",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      projectId: projectId || "default",
    }));

    const allTodos = [...existingTodos, ...newTodos];

    // Ensure .mycontext directory exists
    const contextDir = path.dirname(todosPath);
    if (!fs.existsSync(contextDir)) {
      fs.mkdirSync(contextDir, { recursive: true });
    }

    fs.writeFileSync(todosPath, JSON.stringify(allTodos, null, 2));
  }

  private displayTodos(todos: any[]): void {
    console.log(chalk.blue("\n📋 Generated Todos:\n"));

    todos.forEach((todo, index) => {
      console.log(chalk.cyan(`${index + 1}. ${todo.title}`));
      console.log(
        chalk.gray(
          `   Priority: ${todo.priority} | Time: ${todo.estimatedTime}min`
        )
      );
      console.log(chalk.gray(`   Tags: ${todo.tags.join(", ")}`));
      console.log(chalk.white(`   ${todo.description}`));
      if (todo.considerations && todo.considerations.length > 0) {
        console.log(
          chalk.yellow(`   Considerations: ${todo.considerations.join(", ")}`)
        );
      }
      console.log();
    });
  }
}
