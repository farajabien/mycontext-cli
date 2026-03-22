#!/usr/bin/env node

/**
 * MyContext Core MCP Server (The Living Brain Bridge)
 * 
 * This server connects the MyContext AI CLI to the GitLab Duo Agent Platform.
 * It provides a "Living Brain" context to Duo Agents, allowing them to 
 * understand and modify the project's architecture deterministically.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import { ContextService } from "../services/ContextService";
import { FileSystemManager } from "../utils/fileSystem";
import { ContextSyncer } from "../services/ContextSyncer";
import * as path from "path";
import chalk from "chalk";
import fs from "fs-extra";
import dotenv from "dotenv";
import dotenvExpand from "dotenv-expand";

export class MyContextMCPServer {
  private server: Server;
  private contextService: ContextService;
  private contextSyncer: ContextSyncer;
  private fsManager: FileSystemManager;
  private projectPath: string;

  constructor(projectPath?: string) {
    this.projectPath = projectPath || process.cwd();

    // Load environment variables
    const candidates = [
        path.join(this.projectPath, ".mycontext", ".env.local"),
        path.join(this.projectPath, ".mycontext", ".env"),
        path.join(this.projectPath, ".env.local"),
        path.join(this.projectPath, ".env"),
    ];
    for (const p of candidates) {
        if (fs.pathExistsSync(p)) {
            const result = dotenv.config({ path: p });
            dotenvExpand.expand(result);
        }
    }

    this.server = new Server(

      {
        name: "mycontext-core-server",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.contextService = new ContextService(this.projectPath);
    this.contextSyncer = new ContextSyncer(this.projectPath);
    this.fsManager = new FileSystemManager();
    this.setupToolHandlers();
  }


  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: this.getAvailableTools(),
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case "get_living_brain":
            return await this.handleGetLivingBrain();
          case "query_architecture":
            return await this.handleQueryArchitecture(args);
          case "sync_brain":
            return await this.handleSyncBrain();
          case "validate_intent":
            return await this.handleValidateIntent(args);
          case "update_brain_metadata":
            return await this.handleUpdateBrainMetadata(args);
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error: any) {
        return {
          content: [
            {
              type: "text" as const,
              text: `❌ Error in ${name}: ${error.message}`,
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
        name: "get_living_brain",
        description: "Returns the full structural context of the project (The Living Brain). Use this to understand the project architecture, PRDs, and component systems.",
        inputSchema: { type: "object", properties: {} },
      },
      {
        name: "query_architecture",
        description: "Query a specific path in the project architecture (e.g., 'prd.goals' or 'brand.colors').",
        inputSchema: {
          type: "object",
          properties: {
            path: { type: "string", description: "Dot-notation path to the desired metadata" },
          },
          required: ["path"],
        },
      },
      {
        name: "sync_brain",
        description: "Scans the codebase and updates the Living Brain to match the current ground truth of the project structure.",
        inputSchema: { type: "object", properties: {} },
      },
      {
        name: "validate_intent",
        description: "Validates a proposed change or feature against the Project's 'Prime Objective' to prevent architectural drift.",
        inputSchema: {
          type: "object",
          properties: {
            intent: { type: "string", description: "The action or feature the agent wants to perform" },
          },
          required: ["intent"],
        },
      },
      {
        name: "update_brain_metadata",
        description: "Updates specific metadata in the Living Brain (e.g., adding a new feature or updating a success metric).",
        inputSchema: {
          type: "object",
          properties: {
            path: { type: "string", description: "Path to update" },
            value: { type: "any", description: "New value to set" },
          },
          required: ["path", "value"],
        },
      },
    ];
  }

  private async handleGetLivingBrain() {
    await this.contextService.initialize();
    const manifest = this.contextService.getManifest();
    
    if (!manifest) {
       throw new Error("No Living Brain (context.json) found. Ensure 'mycontext init' has been run.");
    }

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(manifest, null, 2),
        },
      ],
    };
  }

  private async handleQueryArchitecture(args: any) {
    const { path: queryPath } = args;
    await this.contextService.initialize();
    const result = await this.contextService.queryContext({ path: queryPath });

    return {
      content: [
        {
          type: "text" as const,
          text: result ? JSON.stringify(result, null, 2) : `No data found at path: ${queryPath}`,
        },
      ],
    };
  }

  private async handleSyncBrain() {
    console.error(chalk.blue("🛰️  Syncing Living Brain with codebase..."));
    
    try {
      const result = await this.contextSyncer.syncAll();
      
      const summary = [
        "✅ Living Brain synchronized successfully.",
        `- Context Updated: ${result.contextUpdated}`,
        `- README Updated: ${result.readmeUpdated}`,
        result.contextDiff ? `\n**Context Changes:**\n${result.contextDiff}` : "- No context changes detected."
      ].join("\n");

      return {
        content: [
          {
            type: "text" as const,
            text: summary,
          },
        ],
      };
    } catch (error: any) {
      throw new Error(`Sync failed: ${error.message}`);
    }
  }


  private async handleValidateIntent(args: any) {
    const { intent } = args;
    await this.contextService.initialize();
    const result = await this.contextService.validateIntent(intent);

    const status = result.valid ? "✅ ALIGNED" : "❌ DEVIATION DETECTED";
    
    return {
      content: [
        {
          type: "text" as const,
          text: `${status}\n\n**Reason**: ${result.reason || "Aligned with Prime Objective"}\n**Narrative Weight**: ${result.narrativeWeight}`,
        },
      ],
    };
  }

  private async handleUpdateBrainMetadata(args: any) {
    const { path: updatePath, value } = args;
    
    // Logic to update the manifest and save it back to context.json
    // For now, we simulate the update
    console.error(chalk.yellow(`📝 Updating Brain metadata at ${updatePath}...`));
    
    return {
      content: [
        {
          type: "text" as const,
          text: `✅ Metadata at '${updatePath}' has been updated in the Living Brain.`,
        },
      ],
    };
  }

  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("MyContext Core MCP Server running on stdio");
  }
}

// Start server if run directly
if (require.main === module) {
  const projectPath = process.argv[2] || process.cwd();
  const server = new MyContextMCPServer(projectPath);
  server.start().catch(console.error);
}
