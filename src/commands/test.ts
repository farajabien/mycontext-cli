/**
 * Test Commands
 *
 * CLI wrapper commands for the Flow Testing MCP Server.
 * Provides convenient commands for creating and running UI flow tests.
 */

import chalk from "chalk";
import prompts from "prompts";
import { Command } from "commander";
import { TestMissionManager } from "../mcp/test-mission-manager";
import { BrowserTestRunner } from "../mcp/browser-test-runner";
import { TestReporter } from "../mcp/test-reporter";
import * as path from "path";

interface TestCommandOptions {
  headless?: boolean;
  url?: string;
  slowMo?: number;
  verbose?: boolean;
}

interface TestInitOptions {
  fromUserFlows?: boolean;
  interactive?: boolean;
}

/**
 * Test command handler
 */
export class TestCommand {
  private projectPath: string;
  private missionManager: TestMissionManager;
  private testRunner: BrowserTestRunner;
  private reporter: TestReporter;

  constructor(projectPath?: string) {
    this.projectPath = projectPath || process.cwd();
    this.missionManager = new TestMissionManager(this.projectPath);
    this.testRunner = new BrowserTestRunner(this.projectPath);
    this.reporter = new TestReporter(this.projectPath);
  }

  /**
   * Run an ad-hoc test from natural language
   */
  async runAdHocTest(
    missionDescription: string,
    options: TestCommandOptions
  ): Promise<void> {
    console.log(chalk.blue.bold("\n🧪 Running Ad-Hoc Test\n"));

    // Create temporary mission
    const mission = await this.missionManager.createMission({
      name: `ad-hoc-${Date.now()}`,
      mission: missionDescription,
      expectedOutcome: "Test completes successfully",
      tags: ["ad-hoc"],
      startUrl: options.url,
    });

    // Run test
    await this.runTest(mission.id, options);
  }

  /**
   * Run a saved test mission
   */
  async runTest(
    missionId: string,
    options: TestCommandOptions
  ): Promise<void> {
    console.log(chalk.blue.bold("\n🧪 Running Test\n"));

    // Get mission
    const mission = await this.missionManager.getMission(missionId);

    if (!mission) {
      console.error(chalk.red(`❌ Mission not found: ${missionId}`));
      console.log(chalk.gray("\nRun 'mycontext test:list' to see available missions"));
      return;
    }

    console.log(chalk.cyan(`Mission: ${mission.name}`));
    console.log(chalk.gray(mission.mission));

    // Run test
    const result = await this.testRunner.runTest(mission, {
      headless: options.headless !== false,
      baseUrl: options.url,
      slowMo: options.slowMo,
    });

    // Save result
    await this.missionManager.saveExecution(result);

    // Generate and print report
    const report = await this.reporter.generateReport(result, mission);
    this.reporter.printReport(report);

    // Exit with appropriate code
    process.exit(result.status === "passed" ? 0 : 1);
  }

  /**
   * List all test missions
   */
  async listMissions(options: { status?: string; tag?: string }): Promise<void> {
    console.log(chalk.blue.bold("\n📋 Test Missions\n"));

    const missions = await this.missionManager.listMissions({
      status: options.status as any,
      tag: options.tag,
    });

    if (missions.length === 0) {
      console.log(chalk.yellow("No test missions found."));
      console.log(chalk.gray("\nCreate a mission with: mycontext test:init"));
      return;
    }

    missions.forEach((mission, index) => {
      console.log(chalk.bold(`${index + 1}. ${mission.name}`));
      console.log(chalk.gray(`   ID: ${mission.id}`));
      console.log(chalk.gray(`   Mission: ${mission.mission}`));
      console.log(chalk.gray(`   Expected: ${mission.expectedOutcome}`));

      if (mission.tags && mission.tags.length > 0) {
        console.log(chalk.gray(`   Tags: ${mission.tags.join(", ")}`));
      }

      console.log(
        chalk.gray(`   Created: ${new Date(mission.createdAt).toLocaleString()}`)
      );
      console.log("");
    });

    // Show statistics
    const stats = await this.missionManager.getStatistics();
    console.log(chalk.bold("Statistics:"));
    console.log(
      chalk.gray(`  Total Missions: ${stats.totalMissions}`)
    );
    console.log(
      chalk.gray(`  Total Executions: ${stats.totalExecutions}`)
    );
    console.log(
      chalk.gray(`  Pass Rate: ${stats.passRate}%`)
    );
    console.log(
      chalk.gray(
        `  Average Duration: ${stats.averageDuration}ms`
      )
    );
  }

  /**
   * Initialize a new test mission
   */
  async initMission(options: TestInitOptions): Promise<void> {
    console.log(chalk.blue.bold("\n🎬 Initialize Test Mission\n"));

    if (options.fromUserFlows) {
      await this.initFromUserFlows();
      return;
    }

    if (options.interactive) {
      await this.initInteractive();
      return;
    }

    // Prompt for mission details
    const answers = await prompts([
      {
        type: "text",
        name: "name",
        message: "Test mission name:",
        validate: (value) => (value.length > 0 ? true : "Name is required"),
      },
      {
        type: "text",
        name: "mission",
        message: "Mission description (what to test):",
        validate: (value) => (value.length > 0 ? true : "Description is required"),
      },
      {
        type: "text",
        name: "expectedOutcome",
        message: "Expected outcome:",
        validate: (value) => (value.length > 0 ? true : "Expected outcome is required"),
      },
      {
        type: "text",
        name: "startUrl",
        message: "Starting URL (optional):",
      },
      {
        type: "text",
        name: "tags",
        message: "Tags (comma-separated, optional):",
      },
    ]);

    if (!answers.name) {
      console.log(chalk.yellow("\nCancelled"));
      return;
    }

    // Create mission
    const mission = await this.missionManager.createMission({
      name: answers.name,
      mission: answers.mission,
      expectedOutcome: answers.expectedOutcome,
      startUrl: answers.startUrl || undefined,
      tags: answers.tags
        ? answers.tags.split(",").map((t: string) => t.trim())
        : [],
    });

    console.log(chalk.green(`\n✅ Mission created: ${mission.id}`));
    console.log(
      chalk.gray(`\nRun with: mycontext test:run ${mission.name}`)
    );
  }

  /**
   * Initialize missions from user flows
   */
  private async initFromUserFlows(): Promise<void> {
    console.log(chalk.cyan("Importing test missions from user flows..."));

    try {
      const missions = await this.missionManager.importFromUserFlows();

      console.log(
        chalk.green(`\n✅ Imported ${missions.length} missions from user flows`)
      );

      missions.forEach((mission) => {
        console.log(chalk.gray(`  • ${mission.name}`));
      });

      console.log(chalk.gray("\nRun with: mycontext test:run <name>"));
    } catch (error: any) {
      console.error(chalk.red(`\n❌ Error: ${error.message}`));
    }
  }

  /**
   * Initialize mission interactively
   */
  private async initInteractive(): Promise<void> {
    console.log(
      chalk.yellow(
        "\n🎥 Interactive recording mode is not yet implemented."
      )
    );
    console.log(
      chalk.gray(
        "This feature will allow you to perform actions in a browser,"
      )
    );
    console.log(chalk.gray("and the AI will observe and create a reusable test."));
  }

  /**
   * Show test report
   */
  async showReport(executionId: string, options: { verbose?: boolean }): Promise<void> {
    console.log(chalk.blue.bold("\n📊 Test Report\n"));

    const report = await this.reporter.getReport(executionId);

    if (!report) {
      console.error(chalk.red(`❌ Report not found: ${executionId}`));
      return;
    }

    if (options.verbose) {
      const formatted = await this.reporter.formatReport(report, {
        includeScreenshots: true,
      });
      console.log(formatted);
    } else {
      this.reporter.printReport(report);
    }
  }

  /**
   * Run all tests
   */
  async runAll(options: TestCommandOptions): Promise<void> {
    console.log(chalk.blue.bold("\n🧪 Running All Tests\n"));

    const missions = await this.missionManager.listMissions();

    if (missions.length === 0) {
      console.log(chalk.yellow("No test missions found."));
      return;
    }

    const results = [];

    for (const mission of missions) {
      console.log(chalk.cyan(`\n▶ Running: ${mission.name}`));

      const result = await this.testRunner.runTest(mission, {
        headless: options.headless !== false,
        baseUrl: options.url,
        slowMo: options.slowMo,
      });

      await this.missionManager.saveExecution(result);
      results.push(result);
    }

    // Summary
    const passed = results.filter((r) => r.status === "passed").length;
    const failed = results.filter((r) => r.status === "failed").length;
    const errors = results.filter((r) => r.status === "error").length;

    console.log(chalk.bold.blue("\n📊 Test Summary\n"));
    console.log(
      chalk.green(`  Passed: ${passed}/${results.length}`)
    );
    console.log(chalk.red(`  Failed: ${failed}/${results.length}`));
    console.log(
      chalk.yellow(`  Errors: ${errors}/${results.length}`)
    );

    process.exit(failed > 0 || errors > 0 ? 1 : 0);
  }
}

/**
 * Register test commands
 */
export function registerTestCommands(program: Command): void {
  const test = program
    .command("test")
    .description("Run UI flow tests with AI-powered navigation");

  // test "mission description" - Run ad-hoc test
  test
    .argument("[mission]", "Natural language test mission")
    .option("--headless", "Run in headless mode", true)
    .option("--url <url>", "Starting URL")
    .option("--slow-mo <ms>", "Slow down by N milliseconds")
    .option("-v, --verbose", "Verbose output")
    .action(async (mission, options) => {
      const cmd = new TestCommand();
      if (mission) {
        await cmd.runAdHocTest(mission, options);
      } else {
        test.help();
      }
    });

  // test:run <name> - Run saved mission
  program
    .command("test:run")
    .description("Run a saved test mission")
    .argument("<name>", "Mission name or ID")
    .option("--headless", "Run in headless mode", true)
    .option("--url <url>", "Starting URL")
    .option("--slow-mo <ms>", "Slow down by N milliseconds")
    .action(async (name, options) => {
      const cmd = new TestCommand();
      await cmd.runTest(name, options);
    });

  // test:list - List missions
  program
    .command("test:list")
    .description("List all test missions")
    .option("--status <status>", "Filter by status (all|passing|failing)")
    .option("--tag <tag>", "Filter by tag")
    .action(async (options) => {
      const cmd = new TestCommand();
      await cmd.listMissions(options);
    });

  // test:init - Initialize mission
  program
    .command("test:init")
    .description("Create a new test mission")
    .option("--from-user-flows", "Import from 02-user-flows.md")
    .option("--interactive", "Interactive recording mode")
    .action(async (options) => {
      const cmd = new TestCommand();
      await cmd.initMission(options);
    });

  // test:report <id> - Show report
  program
    .command("test:report")
    .description("Show test execution report")
    .argument("<id>", "Execution ID")
    .option("-v, --verbose", "Show full report")
    .action(async (id, options) => {
      const cmd = new TestCommand();
      await cmd.showReport(id, options);
    });

  // test:all - Run all tests
  program
    .command("test:all")
    .description("Run all test missions")
    .option("--headless", "Run in headless mode", true)
    .option("--url <url>", "Starting URL")
    .action(async (options) => {
      const cmd = new TestCommand();
      await cmd.runAll(options);
    });
}
