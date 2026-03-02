#!/usr/bin/env node

/**
 * Vision Testing MCP Server
 *
 * A Model Context Protocol server for vision-based UI testing.
 * Provides AI-powered autonomous navigation, visual validation,
 * and professional demo generation.
 *
 * REPLACES: testing-server.ts (old selector-based testing)
 *
 * MCP Tools:
 * - create_vision_test: Create a vision test mission
 * - run_vision_test: Execute a vision test
 * - generate_demo: Record and generate demo artifacts
 * - visual_regression: Run visual regression tests
 * - extract_vo_script: Generate voice-over script from test
 * - list_vision_tests: List all vision test missions
 * - get_vision_test_report: Get detailed test report
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import { VisionTestRunner } from "./vision-test-runner";
import { TestMissionManager } from "./test-mission-manager";
import { ContextService } from "../services/ContextService";
import {
  VisionTestMission,
  DemoGenerationRequest,
  VisionBrowserConfig,
} from "../types/vision-testing";
import * as path from "path";
import * as fs from "fs-extra";
import chalk from "chalk";

export class VisionTestingMCPServer {
  private server: Server;
  private testRunner: VisionTestRunner;
  private missionManager: TestMissionManager;
  private contextService: ContextService;
  private projectPath: string;

  constructor(projectPath?: string) {
    this.projectPath = projectPath || process.cwd();

    this.server = new Server(
      {
        name: "vision-testing-server",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // Initialize managers
    this.testRunner = new VisionTestRunner(this.projectPath);
    this.missionManager = new TestMissionManager(this.projectPath);
    this.contextService = new ContextService(this.projectPath);

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
          case "create_vision_test":
            return await this.handleCreateVisionTest(args);
          case "run_vision_test":
            return await this.handleRunVisionTest(args);
          case "generate_demo":
            return await this.handleGenerateDemo(args);
          case "visual_regression":
            return await this.handleVisualRegression(args);
          case "extract_vo_script":
            return await this.handleExtractVOScript(args);
          case "list_vision_tests":
            return await this.handleListVisionTests(args);
          case "get_vision_test_report":
            return await this.handleGetTestReport(args);
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error: any) {
        return {
          content: [
            {
              type: "text" as const,
              text: `❌ Error executing ${name}: ${error.message}\n\n${error.stack || ""}`,
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
        name: "create_vision_test",
        description:
          "Create a new vision-based UI test mission. The AI will autonomously navigate and validate the UI using visual understanding.",
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
                "Natural language description of what to test (e.g., 'User should be able to login and view dashboard')",
            },
            expectedOutcome: {
              type: "string",
              description: "Expected result after completing the mission",
            },
            startUrl: {
              type: "string",
              description: "Starting URL for the test (default: http://localhost:3000)",
            },
            recordDemo: {
              type: "boolean",
              description: "Whether to record demo artifacts (default: false)",
            },
            demoConfig: {
              type: "object",
              description: "Demo recording configuration",
              properties: {
                outputFormats: {
                  type: "array",
                  items: {
                    type: "string",
                    enum: ["video", "screenshots", "html-replay", "markdown-script"],
                  },
                },
                videoQuality: {
                  type: "string",
                  enum: ["720p", "1080p", "4K"],
                },
                includeVoiceOver: {
                  type: "boolean",
                },
                narrationStyle: {
                  type: "string",
                  enum: ["technical", "casual", "marketing", "educational"],
                },
              },
            },
            visualExpectations: {
              type: "array",
              description: "Visual expectations to validate",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  description: { type: "string" },
                  screenshot: { type: "string" },
                },
              },
            },
          },
          required: ["name", "mission", "expectedOutcome"],
        },
      },
      {
        name: "run_vision_test",
        description:
          "Execute a vision test with autonomous AI navigation. The AI will see the UI and make intelligent decisions about interactions.",
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
            recordVideo: {
              type: "boolean",
              description: "Record video of test execution (default: false)",
            },
          },
          required: ["missionId"],
        },
      },
      {
        name: "generate_demo",
        description:
          "Record a UI flow and generate professional demo artifacts in multiple formats (video, HTML replay, screenshots, VO script)",
        inputSchema: {
          type: "object",
          properties: {
            flow: {
              type: "string",
              description:
                "Natural language description of the flow to demonstrate",
            },
            startUrl: {
              type: "string",
              description: "URL to start the demo from",
            },
            outputFormats: {
              type: "array",
              description: "Output formats to generate",
              items: {
                type: "string",
                enum: ["video", "screenshots", "html-replay", "markdown-script"],
              },
            },
            videoQuality: {
              type: "string",
              enum: ["720p", "1080p", "4K"],
              description: "Video quality (default: 1080p)",
            },
            includeVoiceOver: {
              type: "boolean",
              description: "Generate voice-over script (default: false)",
            },
            narrationStyle: {
              type: "string",
              enum: ["technical", "casual", "marketing", "educational"],
              description: "Narration style (default: technical)",
            },
          },
          required: ["flow", "startUrl", "outputFormats"],
        },
      },
      {
        name: "visual_regression",
        description:
          "Run visual regression tests by comparing current UI against baseline screenshots",
        inputSchema: {
          type: "object",
          properties: {
            missionId: {
              type: "string",
              description: "ID of the test mission with baseline screenshots",
            },
            threshold: {
              type: "number",
              description:
                "Acceptable difference percentage (0-100, default: 5)",
            },
          },
          required: ["missionId"],
        },
      },
      {
        name: "extract_vo_script",
        description:
          "Extract voice-over narration script from an existing test execution",
        inputSchema: {
          type: "object",
          properties: {
            executionId: {
              type: "string",
              description: "ID of the test execution",
            },
            narrationStyle: {
              type: "string",
              enum: ["technical", "casual", "marketing", "educational"],
              description: "Narration style (default: technical)",
            },
            generateAudio: {
              type: "boolean",
              description: "Generate audio using TTS (default: false)",
            },
          },
          required: ["executionId"],
        },
      },
      {
        name: "list_vision_tests",
        description: "List all vision test missions",
        inputSchema: {
          type: "object",
          properties: {
            status: {
              type: "string",
              enum: ["all", "passing", "failing"],
              description: "Filter by status (default: all)",
            },
            tag: {
              type: "string",
              description: "Filter by tag",
            },
          },
        },
      },
      {
        name: "get_vision_test_report",
        description:
          "Get detailed report from a vision test execution with screenshots and visual analysis",
        inputSchema: {
          type: "object",
          properties: {
            executionId: {
              type: "string",
              description: "ID of the test execution",
            },
            includeScreenshots: {
              type: "boolean",
              description:
                "Include screenshot paths in report (default: true)",
            },
          },
          required: ["executionId"],
        },
      },
    ];
  }

  private async handleCreateVisionTest(args: any) {
    const {
      name,
      mission,
      expectedOutcome,
      startUrl,
      recordDemo = false,
      demoConfig,
      visualExpectations = [],
    } = args;

    // Validate against Prime Objective if available
    await this.contextService.initialize();
    const manifest = this.contextService.getManifest();

    if (manifest) {
      const grounding = await this.contextService.validateIntent(mission);
      if (!grounding.valid) {
        return {
          content: [
            {
              type: "text" as const,
              text: `⚠️ MISSION REJECTED: Your mission "${mission}" may deviate from the Project's Prime Objective.\n\n**Prime Objective**: "${manifest.phases.functional_summary.core_purpose}"\n\n**Reason**: ${grounding.reason}\n\nPlease revise your mission to align with the project's core purpose.`,
            },
          ],
          isError: true,
        };
      }
    }

    const visionMission: VisionTestMission = {
      id: `vision-${Date.now()}`,
      name,
      description: mission,
      mission,
      expectedOutcome,
      tags: ["vision-test"],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      sourceFlow: startUrl,
      recordDemo,
      demoConfig,
      visualExpectations,
    };

    // Save mission
    const saved = await this.missionManager.createMission(visionMission);

    return {
      content: [
        {
          type: "text" as const,
          text: `✅ Vision test mission created successfully!

**Mission ID**: ${saved.id}
**Name**: ${saved.name}
**Mission**: ${saved.mission}
**Expected Outcome**: ${saved.expectedOutcome}
**Record Demo**: ${recordDemo ? "Yes" : "No"}
${startUrl ? `**Start URL**: ${startUrl}` : ""}

You can now run this mission with:
\`\`\`
run_vision_test(missionId: "${saved.id}")
\`\`\`

Or from CLI:
\`\`\`bash
mycontext test:vision ${saved.id}
\`\`\`
`,
        },
      ],
    };
  }

  private async handleRunVisionTest(args: any) {
    const { missionId, headless = true, baseUrl, recordVideo = false } = args;

    const mission = await this.missionManager.getMission(missionId);

    if (!mission) {
      throw new Error(`Mission not found: ${missionId}`);
    }

    // Pre-flight checks
    await this.contextService.initialize();
    const manifest = this.contextService.getManifest();

    if (manifest) {
      console.log(
        chalk.blue(
          `🛰️  Pre-flight: Anchoring to "${manifest.project_name}"`
        )
      );
    }

    // Execute the test
    const config: VisionBrowserConfig = {
      headless,
      baseUrl,
      recordVideo,
    };

    const result = await this.testRunner.runTest(mission, config);

    // Save execution result
    await this.missionManager.saveExecution(result);

    const statusEmoji = result.status === "passed" ? "✅" : "❌";

    let output = `${statusEmoji} Test execution ${result.status.toUpperCase()}

**Mission**: ${mission.name}
**Execution ID**: ${result.executionId}
**Duration**: ${((result.duration || 0) / 1000).toFixed(1)}s
**Steps Executed**: ${result.steps.length} (${result.steps.filter((s) => s.success).length} successful)
**Validations**: ${result.validationResults.length} (${result.validationResults.filter((v) => v.passed).length} passed)

${result.status === "failed" || result.status === "error" ? `**Error**: ${result.error?.message}\n` : ""}

**Final State**:
- URL: ${result.finalState.url}
- Screenshot: ${result.finalState.screenshot || "N/A"}
`;

    if (result.visualSummary) {
      output += `
**Visual Summary**:
- Screenshots: ${result.visualSummary.totalScreenshots}
- Visual Regressions: ${result.visualSummary.visualRegressionsDetected}
- Color Scheme Match: ${result.visualSummary.colorSchemeMatches ? "✓" : "✗"}
- Layout Match: ${result.visualSummary.layoutMatches ? "✓" : "✗"}
`;
    }

    if (result.demoArtifacts) {
      output += `
**Demo Artifacts**:
- Formats: ${Object.keys(result.demoArtifacts.formats).join(", ")}
`;

      if (result.demoArtifacts.formats.video) {
        output += `- Video: ${result.demoArtifacts.formats.video.path}\n`;
      }
      if (result.demoArtifacts.formats.htmlReplay) {
        output += `- HTML Replay: ${result.demoArtifacts.formats.htmlReplay.path}\n`;
      }
      if (result.demoArtifacts.voiceOver) {
        output += `- VO Script: ${result.demoArtifacts.voiceOver.script.segments.length} segments\n`;
      }
    }

    output += `
View full report:
\`\`\`
get_vision_test_report(executionId: "${result.executionId}")
\`\`\`
`;

    return {
      content: [
        {
          type: "text" as const,
          text: output,
        },
      ],
    };
  }

  private async handleGenerateDemo(args: any) {
    const {
      flow,
      startUrl,
      outputFormats,
      videoQuality = "1080p",
      includeVoiceOver = false,
      narrationStyle = "technical",
    } = args;

    const request: DemoGenerationRequest = {
      missionId: `demo-${Date.now()}`,
      config: {
        outputFormats,
        videoQuality,
        includeVoiceOver,
        narrationStyle,
        generateAudio: false,
      },
      startUrl,
      flow,
      metadata: {
        title: "Demo Recording",
        description: flow,
      },
    };

    const result = await this.testRunner.generateDemo(request);

    if (result.status === "failed") {
      return {
        content: [
          {
            type: "text" as const,
            text: `❌ Demo generation failed: ${result.error}`,
          },
        ],
        isError: true,
      };
    }

    let output = `✅ Demo generated successfully!

**Request ID**: ${result.requestId}
**Duration**: ${(result.duration / 1000).toFixed(1)}s

**Artifacts**:
`;

    const formats = result.artifacts.formats;

    if (formats.video) {
      output += `
📹 **Video**
- Path: ${formats.video.path}
- Duration: ${formats.video.duration}s
- Size: ${(formats.video.size / 1024 / 1024).toFixed(2)}MB
- Resolution: ${formats.video.resolution}
`;
    }

    if (formats.screenshots) {
      output += `
📸 **Screenshots**
- Count: ${formats.screenshots.count}
- Format: ${formats.screenshots.format}
`;
    }

    if (formats.htmlReplay) {
      output += `
🌐 **HTML Replay**
- Path: ${formats.htmlReplay.path}
- Interactive: ${formats.htmlReplay.interactive ? "Yes" : "No"}
`;
    }

    if (formats.markdownScript) {
      output += `
📝 **Markdown Script**
- Path: ${formats.markdownScript.path}
- Word Count: ${formats.markdownScript.wordCount}
`;
    }

    if (result.artifacts.voiceOver) {
      output += `
🎙️ **Voice-Over Script**
- Segments: ${result.artifacts.voiceOver.script.segments.length}
- Duration: ${result.artifacts.voiceOver.script.totalDuration.toFixed(1)}s
`;
    }

    return {
      content: [
        {
          type: "text" as const,
          text: output,
        },
      ],
    };
  }

  private async handleVisualRegression(args: any) {
    const { missionId, threshold = 5 } = args;

    // Placeholder - in production would run visual regression tests
    return {
      content: [
        {
          type: "text" as const,
          text: `🔍 Visual regression testing for mission: ${missionId}

Threshold: ${threshold}%

ℹ️  Visual regression testing is currently in development.
This feature will compare current UI against baseline screenshots and detect:
- Layout changes
- Color scheme drift
- Component positioning
- Text content differences

Stay tuned!`,
        },
      ],
    };
  }

  private async handleExtractVOScript(args: any) {
    const {
      executionId,
      narrationStyle = "technical",
      generateAudio = false,
    } = args;

    // Placeholder - would extract VO from saved execution
    return {
      content: [
        {
          type: "text" as const,
          text: `🎙️  Extracting voice-over script for execution: ${executionId}

Narration Style: ${narrationStyle}
Generate Audio: ${generateAudio ? "Yes" : "No"}

ℹ️  VO script extraction is currently in development.
This will analyze test execution screenshots and generate:
- Natural language narration
- Timestamped script segments
- Optional TTS audio

Stay tuned!`,
        },
      ],
    };
  }

  private async handleListVisionTests(args: any) {
    const { status = "all", tag } = args;

    const missions = await this.missionManager.listMissions({ status, tag });

    const visionMissions = missions.filter(
      (m) =>
        (m as VisionTestMission).visualExpectations !== undefined ||
        m.tags?.includes("vision-test")
    );

    const output = [
      `# Vision Test Missions (${visionMissions.length})`,
      "",
      ...visionMissions.map((m, index) => {
        const vm = m as VisionTestMission;
        return `${index + 1}. **${m.name}** (${m.id})
   - Mission: ${m.mission}
   - Expected: ${m.expectedOutcome}
   - Record Demo: ${vm.recordDemo ? "Yes" : "No"}
   - Visual Expectations: ${vm.visualExpectations?.length || 0}
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

    // Placeholder - would retrieve detailed report
    return {
      content: [
        {
          type: "text" as const,
          text: `📊 Test Report for execution: ${executionId}

Include Screenshots: ${includeScreenshots ? "Yes" : "No"}

ℹ️  Detailed reporting is currently in development.
The full report will include:
- Step-by-step breakdown with screenshots
- Visual analysis at each step
- Validation results with diffs
- Performance metrics
- AI decision reasoning

Stay tuned!`,
        },
      ],
    };
  }

  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("Vision Testing MCP Server running on stdio");
  }
}

// Start server if run directly
if (require.main === module) {
  const projectPath = process.argv[2] || process.cwd();
  const server = new VisionTestingMCPServer(projectPath);
  server.start().catch(console.error);
}
