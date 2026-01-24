import { Command } from "commander";
import chalk from "chalk";
import * as fs from "fs-extra";
import path from "path";
import { CONTEXT_FILES } from "../constants/fileNames";
import { EnhancedSpinner } from "../utils/spinner";
import { logger } from "../utils/logger";
import { HybridAIClient } from "../utils/hybridAIClient";

interface SampleDataOptions {
  count?: number;
  types?: string; // comma-separated list of data types to generate
  output?: string;
  verbose?: boolean;
}

interface SampleDataResponse {
  users?: any[];
  [key: string]: any;
}

/**
 * Generate realistic sample data based on project types and schema
 * Uses AI to create contextual, realistic test data for screens and previews
 */
export class GenerateSampleDataCommand {
  private spinner: EnhancedSpinner;
  private aiClient: HybridAIClient;

  constructor() {
    this.spinner = new EnhancedSpinner("Generating sample data...");
    this.aiClient = new HybridAIClient();
  }

  async execute(options: SampleDataOptions): Promise<void> {
    const projectPath = process.cwd();
    const contextDir = path.join(projectPath, ".mycontext");

    this.spinner.start();

    // Check if .mycontext directory exists
    if (!fs.existsSync(contextDir)) {
      this.spinner.fail("No .mycontext directory found");
      console.log(
        chalk.red(
          "\n❌ No .mycontext directory found. Run 'mycontext init' first."
        )
      );
      return;
    }

    try {
      // Load context files for understanding what data to generate
      const context = await this.loadContext(contextDir, projectPath);

      // Generate sample data using AI
      const sampleData = await this.generateSampleData(context, options);

      // Determine output path
      const outputPath = options.output
        ? path.resolve(options.output)
        : path.join(contextDir, "sample-data.json");

      // Write sample data
      await fs.writeFile(
        outputPath,
        JSON.stringify(sampleData, null, 2),
        "utf8"
      );

      this.spinner.succeed("Sample data generated");

      console.log(chalk.green(`\n✅ Sample data saved to: ${outputPath}`));
      console.log(
        chalk.blue(
          "\n💡 This data will be used for realistic screen previews and testing"
        )
      );

      // Show summary
      this.showSummary(sampleData);
    } catch (error: any) {
      this.spinner.fail("Sample data generation failed");
      logger.error("Error generating sample data:", error.message);
      throw error;
    }
  }

  /**
   * Load context files to understand what sample data to generate
   */
  private async loadContext(
    contextDir: string,
    projectPath: string
  ): Promise<{
    prd?: string;
    types?: string;
    schema?: string;
    features?: string;
  }> {
    const context: any = {};

    // Load PRD for project understanding
    const prdPath = path.join(contextDir, CONTEXT_FILES.PRD);
    if (fs.existsSync(prdPath)) {
      context.prd = fs.readFileSync(prdPath, "utf8");
    }

    // Load types definition
    const typesPath = path.join(contextDir, CONTEXT_FILES.TYPES);
    if (fs.existsSync(typesPath)) {
      context.types = fs.readFileSync(typesPath, "utf8");
    }

    // Load InstantDB schema if exists
    const schemaPath = path.join(projectPath, "instant.schema.ts");
    if (fs.existsSync(schemaPath)) {
      context.schema = fs.readFileSync(schemaPath, "utf8");
    }

    // Load features for understanding use cases
    const featuresPath = path.join(contextDir, CONTEXT_FILES.FEATURES);
    if (fs.existsSync(featuresPath)) {
      context.features = fs.readFileSync(featuresPath, "utf8");
    }

    return context;
  }

  /**
   * Generate sample data using AI based on project context
   */
  private async generateSampleData(
    context: any,
    options: SampleDataOptions
  ): Promise<SampleDataResponse> {
    const count = options.count || 10;

    // Build prompt for AI
    const prompt = this.buildSampleDataPrompt(context, count, options.types);

    if (options.verbose) {
      logger.info("Generating sample data with AI...");
    }

    // Use AI to generate sample data
    const response = await this.aiClient.generateText(prompt, {
      temperature: 0.8, // Higher temperature for more variety in sample data
      maxTokens: 4000,
    });

    // Parse response (AI should return JSON)
    try {
      const responseText = response.text;
      // Extract JSON from response
      const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/);
      if (jsonMatch && jsonMatch[1]) {
        return JSON.parse(jsonMatch[1]);
      }

      // Try to parse as direct JSON
      return JSON.parse(responseText);
    } catch (error) {
      logger.warn("Could not parse AI response as JSON, using fallback data");
      return this.generateFallbackData(context, count);
    }
  }

  /**
   * Build comprehensive prompt for sample data generation
   */
  private buildSampleDataPrompt(
    context: any,
    count: number,
    types?: string
  ): string {
    let prompt = `You are a data generator. Generate realistic, production-quality sample data for testing and previews.

IMPORTANT:
- Generate VALID JSON only
- Use realistic, varied data (names, emails, dates, etc.)
- Match the data types and schema provided
- Include ${count} items for each data type
- Make data contextually relevant to the project
- Output ONLY JSON, wrapped in \`\`\`json code blocks

`;

    if (context.prd) {
      prompt += `\n## PROJECT CONTEXT:\n${context.prd.substring(0, 2000)}\n`;
    }

    if (context.types) {
      prompt += `\n## TYPE DEFINITIONS:\n${context.types}\n`;
    }

    if (context.schema) {
      prompt += `\n## DATABASE SCHEMA:\n${context.schema}\n`;
    }

    if (context.features) {
      prompt += `\n## FEATURES (for context):\n${context.features.substring(0, 1000)}\n`;
    }

    if (types) {
      prompt += `\n## SPECIFIC TYPES TO GENERATE:\n${types}\n`;
    } else {
      prompt += `\n## GENERATE DATA FOR:\n- users (with realistic names, emails, avatars, roles)\n- Any other entities defined in the schema/types\n`;
    }

    prompt += `\nGenerate realistic sample data matching the above context. Return as JSON with keys for each entity type.`;

    return prompt;
  }

  /**
   * Generate fallback sample data when AI fails
   */
  private generateFallbackData(context: any, count: number): SampleDataResponse {
    const data: SampleDataResponse = {
      users: [],
    };

    // Generate basic user data
    const firstNames = [
      "Alice",
      "Bob",
      "Charlie",
      "Diana",
      "Eve",
      "Frank",
      "Grace",
      "Henry",
      "Ivy",
      "Jack",
    ];
    const lastNames = [
      "Smith",
      "Johnson",
      "Williams",
      "Brown",
      "Jones",
      "Garcia",
      "Miller",
      "Davis",
      "Rodriguez",
      "Martinez",
    ];

    for (let i = 0; i < Math.min(count, 10); i++) {
      const firstName = firstNames[i % firstNames.length]!;
      const lastName = lastNames[i % lastNames.length]!;
      data.users!.push({
        id: `user-${i + 1}`,
        name: `${firstName} ${lastName}`,
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`,
        avatar: `https://i.pravatar.cc/150?img=${i + 1}`,
        role: i === 0 ? "admin" : "user",
        createdAt: new Date(
          Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000
        ).toISOString(),
      });
    }

    return data;
  }

  /**
   * Show summary of generated data
   */
  private showSummary(data: SampleDataResponse): void {
    console.log(chalk.yellow("\n📊 Generated Sample Data:"));

    Object.keys(data).forEach((key) => {
      const items = data[key];
      if (Array.isArray(items)) {
        console.log(chalk.gray(`   ${key}: ${items.length} items`));
      } else {
        console.log(chalk.gray(`   ${key}: ${typeof items}`));
      }
    });

    console.log(
      chalk.gray(
        "\n💡 Use this data with 'mycontext generate:screens' for realistic previews"
      )
    );
  }
}

/**
 * Register the generate:sample-data command
 */
export function registerGenerateSampleDataCommand(program: Command): void {
  program
    .command("generate:sample-data")
    .alias("gsd")
    .description(
      "Generate realistic sample data based on types and schema for screen previews"
    )
    .option("-c, --count <number>", "Number of items per type", "10")
    .option(
      "-t, --types <types>",
      "Comma-separated list of data types to generate"
    )
    .option(
      "-o, --output <path>",
      "Output file path (default: .mycontext/sample-data.json)"
    )
    .option("-v, --verbose", "Show detailed output")
    .action(async (options: SampleDataOptions) => {
      const command = new GenerateSampleDataCommand();
      await command.execute({
        ...options,
        count: options.count ? parseInt(options.count as any) : 10,
      });
    });
}
