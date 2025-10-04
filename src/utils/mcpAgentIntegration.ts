import * as fs from "fs";
import * as path from "path";
import chalk from "chalk";
import { ClaudeAgentClient } from "./claudeAgentClient";
import { ContextManager, ProjectContext } from "./contextManager";
import { ToolPermissionManager } from "./toolPermissions";

export interface MCPServer {
  name: string;
  url: string;
  token?: string;
  capabilities: string[];
  status: "active" | "inactive" | "error";
  lastUsed?: string;
}

export interface MCPIntegration {
  servers: MCPServer[];
  activeServer?: string;
  configuration: {
    autoConnect: boolean;
    timeout: number;
    retries: number;
    cacheResults: boolean;
  };
}

export class MCPAgentIntegration {
  private mcpConfigFile: string;
  private workingDirectory: string;
  private contextManager: ContextManager;
  private permissionManager: ToolPermissionManager;
  private claudeAgentClient: ClaudeAgentClient | null = null;

  constructor(workingDirectory?: string) {
    this.workingDirectory = workingDirectory || process.cwd();
    this.mcpConfigFile = path.join(
      this.workingDirectory,
      ".mycontext",
      "mcp-config.json"
    );
    this.contextManager = new ContextManager(this.workingDirectory);
    this.permissionManager = new ToolPermissionManager(this.workingDirectory);
  }

  /**
   * Initialize MCP integration with Claude Agent SDK
   */
  async initialize(claudeAgentClient: ClaudeAgentClient): Promise<void> {
    this.claudeAgentClient = claudeAgentClient;

    try {
      // Load MCP configuration
      const mcpConfig = await this.loadMCPConfig();

      // Initialize Claude Agent with MCP tools
      await this.configureClaudeAgentWithMCP(mcpConfig);

      console.log(
        chalk.green("✅ MCP integration initialized with Claude Agent SDK")
      );
    } catch (error: any) {
      console.log(chalk.red(`❌ MCP integration failed: ${error.message}`));
      throw error;
    }
  }

  /**
   * Add MCP server to configuration
   */
  async addMCPServer(
    server: Omit<MCPServer, "status" | "lastUsed">
  ): Promise<void> {
    try {
      const mcpConfig = await this.loadMCPConfig();

      // Check if server already exists
      const existingServer = mcpConfig.servers.find(
        (s) => s.name === server.name
      );
      if (existingServer) {
        throw new Error(`MCP server '${server.name}' already exists`);
      }

      // Test server connection
      const status = await this.testMCPServer(server);

      // Add server to configuration
      mcpConfig.servers.push({
        ...server,
        status,
        lastUsed: new Date().toISOString(),
      });

      await this.saveMCPConfig(mcpConfig);

      // Update Claude Agent configuration if initialized
      if (this.claudeAgentClient) {
        await this.configureClaudeAgentWithMCP(mcpConfig);
      }

      console.log(
        chalk.green(`✅ MCP server '${server.name}' added successfully`)
      );
    } catch (error: any) {
      console.log(chalk.red(`❌ Failed to add MCP server: ${error.message}`));
      throw error;
    }
  }

  /**
   * Remove MCP server from configuration
   */
  async removeMCPServer(serverName: string): Promise<void> {
    try {
      const mcpConfig = await this.loadMCPConfig();

      const serverIndex = mcpConfig.servers.findIndex(
        (s) => s.name === serverName
      );
      if (serverIndex === -1) {
        throw new Error(`MCP server '${serverName}' not found`);
      }

      mcpConfig.servers.splice(serverIndex, 1);

      // Update active server if it was removed
      if (mcpConfig.activeServer === serverName) {
        mcpConfig.activeServer =
          mcpConfig.servers.length > 0 ? mcpConfig.servers[0].name : undefined;
      }

      await this.saveMCPConfig(mcpConfig);

      // Update Claude Agent configuration if initialized
      if (this.claudeAgentClient) {
        await this.configureClaudeAgentWithMCP(mcpConfig);
      }

      console.log(
        chalk.green(`✅ MCP server '${serverName}' removed successfully`)
      );
    } catch (error: any) {
      console.log(
        chalk.red(`❌ Failed to remove MCP server: ${error.message}`)
      );
      throw error;
    }
  }

  /**
   * Execute MCP workflow with Claude Agent SDK
   */
  async executeMCPWorkflow(
    workflowPrompt: string,
    context: ProjectContext = {},
    options: any = {}
  ): Promise<{ content: string; context: ProjectContext; mcpResults: any[] }> {
    if (!this.claudeAgentClient) {
      throw new Error("Claude Agent SDK not initialized");
    }

    try {
      // Load current context
      const currentContext = await this.contextManager.loadContext();
      const mergedContext = await this.contextManager.mergeContext(
        currentContext,
        context
      );

      // Build MCP-enhanced workflow prompt
      const mcpPrompt = this.buildMCPWorkflowPrompt(
        workflowPrompt,
        mergedContext
      );

      // Execute workflow with Claude Agent SDK
      const result = await this.claudeAgentClient.runAgentWorkflow(
        mcpPrompt,
        mergedContext,
        options
      );

      // Process MCP results
      const mcpResults = await this.processMCPResults(result.content);

      // Update context with MCP results
      const updatedContext = await this.updateContextWithMCPResults(
        mergedContext,
        mcpResults
      );

      // Save updated context
      await this.contextManager.saveContext(updatedContext);

      return {
        content: result.content,
        context: updatedContext,
        mcpResults,
      };
    } catch (error: any) {
      console.log(
        chalk.red(`❌ MCP workflow execution failed: ${error.message}`)
      );
      throw error;
    }
  }

  /**
   * Get MCP server status
   */
  async getMCPServerStatus(): Promise<{
    servers: MCPServer[];
    activeServer?: string;
  }> {
    const mcpConfig = await this.loadMCPConfig();

    // Test all servers
    for (const server of mcpConfig.servers) {
      server.status = await this.testMCPServer(server);
    }

    await this.saveMCPConfig(mcpConfig);

    return {
      servers: mcpConfig.servers,
      activeServer: mcpConfig.activeServer,
    };
  }

  /**
   * List available MCP capabilities
   */
  async listMCPCapabilities(): Promise<Record<string, string[]>> {
    const mcpConfig = await this.loadMCPConfig();
    const capabilities: Record<string, string[]> = {};

    for (const server of mcpConfig.servers) {
      if (server.status === "active") {
        capabilities[server.name] = server.capabilities;
      }
    }

    return capabilities;
  }

  /**
   * Configure Claude Agent with MCP tools
   */
  private async configureClaudeAgentWithMCP(
    mcpConfig: MCPIntegration
  ): Promise<void> {
    if (!this.claudeAgentClient) return;

    try {
      // Get MCP tools from active servers
      const mcpTools = await this.getMCPTools(mcpConfig);

      // Get permission configuration
      const permissionConfig = this.permissionManager.getClaudeAgentConfig();

      // Initialize Claude Agent with MCP tools and permissions
      await this.claudeAgentClient.initialize({
        allowedTools: mcpTools,
        ...permissionConfig,
        contextManagement: true,
      });

      console.log(
        chalk.green(
          `✅ Claude Agent configured with ${mcpTools.length} MCP tools`
        )
      );
    } catch (error: any) {
      console.log(
        chalk.yellow(
          `⚠️ Could not configure Claude Agent with MCP: ${error.message}`
        )
      );
    }
  }

  /**
   * Test MCP server connection
   */
  private async testMCPServer(
    server: Omit<MCPServer, "status" | "lastUsed">
  ): Promise<"active" | "inactive" | "error"> {
    try {
      // Simple HTTP test - in a real implementation, you'd use proper MCP protocol
      const response = await fetch(server.url, {
        method: "GET",
        headers: server.token
          ? { Authorization: `Bearer ${server.token}` }
          : {},
        signal: AbortSignal.timeout(5000),
      });

      return response.ok ? "active" : "error";
    } catch (error) {
      return "error";
    }
  }

  /**
   * Get MCP tools from configuration
   */
  private async getMCPTools(mcpConfig: MCPIntegration): Promise<string[]> {
    const tools: string[] = [];

    for (const server of mcpConfig.servers) {
      if (server.status === "active") {
        // Map MCP capabilities to tool names
        const serverTools = server.capabilities.map(
          (capability) => `mcp_${server.name}_${capability}`
        );
        tools.push(...serverTools);
      }
    }

    return tools;
  }

  /**
   * Build MCP-enhanced workflow prompt
   */
  private buildMCPWorkflowPrompt(
    workflowPrompt: string,
    context: ProjectContext
  ): string {
    let mcpPrompt = `Execute the following workflow with MCP (Model Context Protocol) integration:\n\n${workflowPrompt}\n\n`;

    // Add MCP context
    mcpPrompt += `## Available MCP Tools:\n`;
    const mcpConfig = this.loadMCPConfigSync();
    for (const server of mcpConfig.servers) {
      if (server.status === "active") {
        mcpPrompt += `- ${server.name}: ${server.capabilities.join(", ")}\n`;
      }
    }

    // Add project context
    if (context.prd) {
      mcpPrompt += `\n## Project Requirements:\n${context.prd}\n`;
    }

    if (context.componentList) {
      mcpPrompt += `\n## Available Components:\n${JSON.stringify(context.componentList, null, 2)}\n`;
    }

    mcpPrompt += `\nPlease use the available MCP tools to enhance your workflow execution.`;

    return mcpPrompt;
  }

  /**
   * Process MCP results from agent response
   */
  private async processMCPResults(content: string): Promise<any[]> {
    const mcpResults: any[] = [];

    try {
      // Extract MCP tool calls from content
      const mcpCallRegex = /mcp_\w+_\w+\([^)]*\)/g;
      const matches = content.match(mcpCallRegex);

      if (matches) {
        for (const match of matches) {
          mcpResults.push({
            tool: match,
            timestamp: new Date().toISOString(),
            status: "executed",
          });
        }
      }
    } catch (error) {
      console.log(chalk.yellow("⚠️ Could not process MCP results"));
    }

    return mcpResults;
  }

  /**
   * Update context with MCP results
   */
  private async updateContextWithMCPResults(
    context: ProjectContext,
    mcpResults: any[]
  ): Promise<ProjectContext> {
    const updatedContext = { ...context };

    // Add MCP results to previous outputs
    updatedContext.previousOutputs = {
      ...updatedContext.previousOutputs,
      mcpResults: {
        results: mcpResults,
        timestamp: new Date().toISOString(),
      },
    };

    return updatedContext;
  }

  /**
   * Load MCP configuration
   */
  private async loadMCPConfig(): Promise<MCPIntegration> {
    try {
      if (fs.existsSync(this.mcpConfigFile)) {
        const content = fs.readFileSync(this.mcpConfigFile, "utf8");
        return JSON.parse(content);
      }
    } catch (error: any) {
      console.log(
        chalk.yellow(`⚠️ Could not load MCP config: ${error.message}`)
      );
    }

    return this.getDefaultMCPConfig();
  }

  /**
   * Load MCP configuration synchronously
   */
  private loadMCPConfigSync(): MCPIntegration {
    try {
      if (fs.existsSync(this.mcpConfigFile)) {
        const content = fs.readFileSync(this.mcpConfigFile, "utf8");
        return JSON.parse(content);
      }
    } catch (error) {
      // Ignore errors
    }

    return this.getDefaultMCPConfig();
  }

  /**
   * Save MCP configuration
   */
  private async saveMCPConfig(config: MCPIntegration): Promise<void> {
    try {
      const configDir = path.dirname(this.mcpConfigFile);
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }
      fs.writeFileSync(this.mcpConfigFile, JSON.stringify(config, null, 2));
    } catch (error: any) {
      console.log(chalk.red(`❌ Could not save MCP config: ${error.message}`));
    }
  }

  /**
   * Get default MCP configuration
   */
  private getDefaultMCPConfig(): MCPIntegration {
    return {
      servers: [],
      activeServer: undefined,
      configuration: {
        autoConnect: true,
        timeout: 30000,
        retries: 3,
        cacheResults: true,
      },
    };
  }

  /**
   * Get MCP integration summary
   */
  getMCPSummary(): string {
    const config = this.loadMCPConfigSync();
    const summary = {
      servers: config.servers.length,
      activeServers: config.servers.filter((s) => s.status === "active").length,
      activeServer: config.activeServer,
      configuration: config.configuration,
    };

    return JSON.stringify(summary, null, 2);
  }
}
