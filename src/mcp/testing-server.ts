#!/usr/bin/env node

/**
 * Flow Testing MCP Server
 *
 * A Model Context Protocol server that provides AI-powered UI flow testing capabilities.
 * Can be used standalone or integrated with MyContext CLI.
 *
 * MCP Tools:
 * - create_test_mission: Create a new test mission from natural language
 * - run_test: Execute a test mission with autonomous browser navigation
 * - list_test_missions: List all saved test missions
 * - get_test_report: Retrieve detailed test execution report
 * - record_flow: Interactive flow recording mode
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import { TestMissionManager } from "./test-mission-manager";
import { BrowserTestRunner } from "./browser-test-runner";
import { TestReporter } from "./test-reporter";
import * as path from "path";

export class FlowTestingMCPServer {
  private server: Server;
  private missionManager: TestMissionManager;
  private testRunner: BrowserTestRunner;
  private reporter: TestReporter;
  private projectPath: string;

  constructor(projectPath?: string) {
    this.projectPath = projectPath || process.cwd();

    this.server = new Server(
      {
        name: "flow-testing-server",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // Initialize managers
    this.missionManager = new TestMissionManager(this.projectPath);
    this.testRunner = new BrowserTestRunner(this.projectPath);
    this.reporter = new TestReporter(this.projectPath);

    this.setupToolHandlers();
  }

  private setupToolHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: this.getAvailableTools(),
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case "create_test_mission":
            return await this.handleCreateTestMission(args);
          case "run_test":
            return await this.handleRunTest(args);
          case "list_test_missions":
            return await this.handleListTestMissions(args);
          case "get_test_report":
            return await this.handleGetTestReport(args);
          case "record_flow":
            return await this.handleRecordFlow(args);
          case "watch_tests":
            return await this.handleWatchTests(args);
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error: any) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error executing ${name}: ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  private getAvailableTools(): Tool[] {
    return [
      {
        name: "create_test_mission",
        description:
          "Create a new UI flow test mission from natural language description",
        inputSchema: {
          type: "object",
          properties: {
            name: {
              type: "string",
              description: "Name for the test mission",
            },
            mission: {
              type: "string",
              description:
                "Natural language description of what to test (e.g., 'User should be able to login with valid credentials')",
            },
            expectedOutcome: {
              type: "string",
              description: "Expected result after completing the mission",
            },
            validationRules: {
              type: "array",
              description: "Optional validation rules to check",
              items: {
                type: "object",
                properties: {
                  type: {
                    type: "string",
                    enum: [
                      "url-match",
                      "element-exists",
                      "text-contains",
                      "element-visible",
                      "form-submitted",
                      "data-updated",
                      "custom",
                    ],
                  },
                  description: { type: "string" },
                  selector: { type: "string" },
                  expectedValue: { type: "string" },
                },
              },
            },
            startUrl: {
              type: "string",
              description: "Starting URL for the test",
            },
          },
          required: ["name", "mission", "expectedOutcome"],
        },
      },
      {
        name: "run_test",
        description: "Execute a test mission with autonomous browser navigation",
        inputSchema: {
          type: "object",
          properties: {
            missionId: {
              type: "string",
              description: "ID of the test mission to run",
            },
            headless: {
              type: "boolean",
              description: "Run browser in headless mode (default: true)",
            },
            baseUrl: {
              type: "string",
              description: "Base URL to use if different from mission config",
            },
            slowMo: {
              type: "number",
              description: "Slow down operations by N milliseconds for debugging",
            },
          },
          required: ["missionId"],
        },
      },
      {
        name: "list_test_missions",
        description: "List all saved test missions",
        inputSchema: {
          type: "object",
          properties: {
            status: {
              type: "string",
              enum: ["all", "passing", "failing"],
              description: "Filter missions by last execution status",
            },
            tag: {
              type: "string",
              description: "Filter missions by tag",
            },
          },
        },
      },
      {
        name: "get_test_report",
        description: "Retrieve detailed report from a test execution",
        inputSchema: {
          type: "object",
          properties: {
            executionId: {
              type: "string",
              description: "ID of the test execution",
            },
            includeScreenshots: {
              type: "boolean",
              description: "Include screenshot paths in report (default: true)",
            },
          },
          required: ["executionId"],
        },
      },
      {
        name: "record_flow",
        description:
          "Start interactive recording mode to learn a flow by observing user actions",
        inputSchema: {
          type: "object",
          properties: {
            name: {
              type: "string",
              description: "Name for the recorded flow",
            },
            startUrl: {
              type: "string",
              description: "URL to start recording from",
            },
          },
          required: ["name", "startUrl"],
        },
      },
      {
        name: "watch_tests",
        description:
          "Start watch mode to automatically re-run tests on file changes",
        inputSchema: {
          type: "object",
          properties: {
            missions: {
              type: "array",
              items: { type: "string" },
              description:
                "Mission IDs to watch (empty = watch all)",
            },
            watchPaths: {
              type: "array",
              items: { type: "string" },
              description:
                "Paths to watch for changes (default: src/, app/, components/)",
            },
          },
        },
      },
    ];
  }

  private async handleCreateTestMission(args: any) {
    const {
      name,
      mission,
      expectedOutcome,
      validationRules = [],
      startUrl,
    } = args;

    const newMission = await this.missionManager.createMission({
      name,
      mission,
      expectedOutcome,
      validationRules,
      startUrl,
    });

    return {
      content: [
        {
          type: "text" as const,
          text: `✅ Test mission created successfully!

**Mission ID**: ${newMission.id}
**Name**: ${newMission.name}
**Mission**: ${newMission.mission}
**Expected Outcome**: ${newMission.expectedOutcome}
${startUrl ? `**Start URL**: ${startUrl}` : ""}
${validationRules.length > 0 ? `**Validation Rules**: ${validationRules.length}` : ""}

You can now run this mission with:
\`\`\`
run_test(missionId: "${newMission.id}")
\`\`\`

Or from CLI:
\`\`\`
mycontext test:run ${newMission.name}
\`\`\`
`,
        },
      ],
    };
  }

  private async handleRunTest(args: any) {
    const { missionId, headless = true, baseUrl, slowMo } = args;

    const mission = await this.missionManager.getMission(missionId);

    if (!mission) {
      throw new Error(`Mission not found: ${missionId}`);
    }

    // Execute the test
    const result = await this.testRunner.runTest(mission, {
      headless,
      baseUrl,
      slowMo,
    });

    // Save execution result
    await this.missionManager.saveExecution(result);

    // Generate report
    const report = await this.reporter.generateReport(result);

    const statusEmoji = result.status === "passed" ? "✅" : "❌";

    return {
      content: [
        {
          type: "text" as const,
          text: `${statusEmoji} Test execution ${result.status.toUpperCase()}

**Mission**: ${mission.name}
**Execution ID**: ${result.executionId}
**Duration**: ${result.duration}ms
**Steps Executed**: ${result.steps.length}
**Validations**: ${result.validationResults.length} (${result.validationResults.filter((v) => v.passed).length} passed)

${result.status === "failed" ? `**Error**: ${result.error?.message}\n` : ""}

**Final State**:
- URL: ${result.finalState.url}
- Screenshot: ${result.finalState.screenshot || "N/A"}

${result.aiNotes ? `**AI Notes**: ${result.aiNotes}\n` : ""}

View full report:
\`\`\`
get_test_report(executionId: "${result.executionId}")
\`\`\`
`,
        },
      ],
    };
  }

  private async handleListTestMissions(args: any) {
    const { status = "all", tag } = args;

    const missions = await this.missionManager.listMissions({ status, tag });

    const output = [
      `# Test Missions (${missions.length})`,
      "",
      ...missions.map((m, index) => {
        return `${index + 1}. **${m.name}** (${m.id})
   - Mission: ${m.mission}
   - Expected: ${m.expectedOutcome}
   - Tags: ${m.tags?.join(", ") || "none"}
   - Created: ${new Date(m.createdAt).toLocaleString()}`;
      }),
    ];

    return {
      content: [
        {
          type: "text" as const,
          text: output.join("\n"),
        },
      ],
    };
  }

  private async handleGetTestReport(args: any) {
    const { executionId, includeScreenshots = true } = args;

    const report = await this.reporter.getReport(executionId);

    if (!report) {
      throw new Error(`Report not found: ${executionId}`);
    }

    const output = await this.reporter.formatReport(report, {
      includeScreenshots,
    });

    return {
      content: [
        {
          type: "text" as const,
          text: output,
        },
      ],
    };
  }

  private async handleRecordFlow(args: any) {
    const { name, startUrl } = args;

    // Start interactive recording
    const session = await this.testRunner.startRecording(name, startUrl);

    return {
      content: [
        {
          type: "text" as const,
          text: `🎥 Recording started for "${name}"

**Session ID**: ${session.sessionId}
**Start URL**: ${startUrl}

A browser window will open. Perform your actions, and the AI will observe and learn.
When done, the recorded flow will be saved as a test mission.

Recording in progress...
`,
        },
      ],
    };
  }

  private async handleWatchTests(args: any) {
    const { missions = [], watchPaths = ["src", "app", "components"] } = args;

    // Start watch mode
    await this.testRunner.startWatchMode(missions, watchPaths);

    return {
      content: [
        {
          type: "text" as const,
          text: `👀 Watch mode started

**Watching**: ${missions.length > 0 ? missions.join(", ") : "all missions"}
**Paths**: ${watchPaths.join(", ")}

Tests will automatically re-run when files change.
Press Ctrl+C to stop.
`,
        },
      ],
    };
  }

  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("Flow Testing MCP Server running on stdio");
  }
}

// Start server if run directly
if (require.main === module) {
  const projectPath = process.argv[2] || process.cwd();
  const server = new FlowTestingMCPServer(projectPath);
  server.start().catch(console.error);
}
