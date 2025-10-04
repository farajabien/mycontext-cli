import chalk from "chalk";
import prompts from "prompts";
import { CommandOptions } from "../types";
import { EnhancedSpinner } from "../utils/spinner";
import { FileSystemManager } from "../utils/fileSystem";
import { execSync } from "child_process";
import * as fs from "fs-extra";
import * as path from "path";

interface MCPSetupOptions extends CommandOptions {
  provider?: "instantdb" | "github" | "custom";
  server?: string;
  token?: string;
  config?: string;
  install?: boolean;
}

export class MCPSetupCommand {
  private fs = new FileSystemManager();
  private spinner = new EnhancedSpinner("Setting up MCP...");

  async execute(options: MCPSetupOptions): Promise<void> {
    const {
      provider = "instantdb",
      server,
      token,
      config,
      install = true,
    } = options;

    console.log(chalk.blue.bold("🔌 MCP (Model Context Protocol) Setup\n"));

    try {
      // Check if we're in a valid project
      if (!(await this.isValidProject())) {
        throw new Error(
          "Not a valid MyContext project. Run 'mycontext init' first."
        );
      }

      await this.setupMCP({
        provider,
        server,
        token,
        config,
        install,
      });

      console.log(chalk.green.bold("\n✅ MCP setup completed!"));
      this.showNextSteps(provider);
    } catch (error) {
      this.spinner.fail("MCP setup failed");
      throw error;
    }
  }

  private async isValidProject(): Promise<boolean> {
    const packageJsonPath = path.join(process.cwd(), "package.json");
    const mycontextDir = path.join(process.cwd(), ".mycontext");

    return (
      (await fs.pathExists(packageJsonPath)) &&
      (await fs.pathExists(mycontextDir))
    );
  }

  private async setupMCP(options: {
    provider: string;
    server?: string;
    token?: string;
    config?: string;
    install: boolean;
  }): Promise<void> {
    console.log(chalk.blue(`🔌 Setting up MCP for ${options.provider}...\n`));

    // Step 1: Install MCP dependencies
    if (options.install) {
      this.spinner.start().updateText("Installing MCP dependencies...");
      await this.installMCPDependencies(options.provider);
      this.spinner.succeed("Dependencies installed");
    }

    // Step 2: Create MCP configuration
    this.spinner.start().updateText("Creating MCP configuration...");
    await this.createMCPConfig(options);
    this.spinner.succeed("MCP configuration created");

    // Step 3: Create MCP utilities
    this.spinner.start().updateText("Creating MCP utilities...");
    await this.createMCPUtilities(options.provider);
    this.spinner.succeed("MCP utilities created");

    // Step 4: Create environment configuration
    this.spinner.start().updateText("Creating environment configuration...");
    await this.createEnvironmentConfig(options);
    this.spinner.succeed("Environment configuration created");
  }

  private async installMCPDependencies(provider: string): Promise<void> {
    const packageManager = await this.detectPackageManager();
    const dependencies = ["@modelcontextprotocol/sdk"];

    // Add provider-specific dependencies
    switch (provider) {
      case "instantdb":
        dependencies.push("@instantdb/mcp");
        break;
      case "github":
        dependencies.push("@modelcontextprotocol/server-github");
        break;
      default:
        // For custom providers, we'll install the base SDK
        break;
    }

    try {
      execSync(`${packageManager} add ${dependencies.join(" ")}`, {
        stdio: "inherit",
        cwd: process.cwd(),
      });
    } catch (error) {
      console.log(
        chalk.yellow("⚠️ Failed to install with pnpm, trying npm...")
      );
      execSync(`npm install ${dependencies.join(" ")}`, {
        stdio: "inherit",
        cwd: process.cwd(),
      });
    }
  }

  private async detectPackageManager(): Promise<"pnpm" | "npm"> {
    if (await fs.pathExists(path.join(process.cwd(), "pnpm-lock.yaml"))) {
      return "pnpm";
    }
    return "npm";
  }

  private async createMCPConfig(options: {
    provider: string;
    server?: string;
    token?: string;
    config?: string;
  }): Promise<void> {
    const configDir = path.join(process.cwd(), ".mycontext", "mcp");
    await fs.ensureDir(configDir);

    let configContent = "";

    switch (options.provider) {
      case "instantdb":
        configContent = this.createInstantDBMCPConfig(options);
        break;
      case "github":
        configContent = this.createGitHubMCPConfig(options);
        break;
      default:
        configContent = this.createCustomMCPConfig(options);
        break;
    }

    await fs.writeFile(
      path.join(configDir, "config.json"),
      JSON.stringify(JSON.parse(configContent), null, 2)
    );

    // Create MCP server script
    const serverScript = this.createMCPServerScript(options.provider);
    await fs.writeFile(path.join(configDir, "server.js"), serverScript);

    // Make server script executable
    try {
      execSync(`chmod +x ${path.join(configDir, "server.js")}`, {
        cwd: process.cwd(),
      });
    } catch (error) {
      // Ignore chmod errors on Windows
    }
  }

  private createInstantDBMCPConfig(options: any): string {
    return `{
      "mcpServers": {
        "instantdb": {
          "command": "node",
          "args": [".mycontext/mcp/server.js"],
          "env": {
            "MCP_SERVER_TYPE": "instantdb",
            "INSTANTDB_APP_ID": "${options.token || "__YOUR_APP_ID__"}",
            "INSTANTDB_PERSONAL_ACCESS_TOKEN": "${options.token || "__YOUR_TOKEN__"}"
          }
        }
      }
    }`;
  }

  private createGitHubMCPConfig(options: any): string {
    return `{
      "mcpServers": {
        "github": {
          "command": "npx",
          "args": ["@modelcontextprotocol/server-github"],
          "env": {
            "GITHUB_PERSONAL_ACCESS_TOKEN": "${options.token || "__YOUR_GITHUB_TOKEN__"}"
          }
        }
      }
    }`;
  }

  private createCustomMCPConfig(options: any): string {
    return `{
      "mcpServers": {
        "custom": {
          "command": "node",
          "args": [".mycontext/mcp/server.js"],
          "env": {
            "MCP_SERVER_TYPE": "custom",
            "MCP_SERVER_URL": "${options.server || "__YOUR_SERVER_URL__"}",
            "MCP_SERVER_TOKEN": "${options.token || "__YOUR_TOKEN__"}"
          }
        }
      }
    }`;
  }

  private createMCPServerScript(provider: string): string {
    const baseScript = `#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

class MCPServer {
  constructor() {
    this.server = new Server(
      {
        name: "mycontext-mcp-server",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
  }

  setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: "query_database",
            description: "Query the database for data",
            inputSchema: {
              type: "object",
              properties: {
                query: {
                  type: "string",
                  description: "The database query to execute",
                },
              },
              required: ["query"],
            },
          },
          {
            name: "create_entity",
            description: "Create a new entity in the database",
            inputSchema: {
              type: "object",
              properties: {
                entityType: {
                  type: "string",
                  description: "The type of entity to create",
                },
                data: {
                  type: "object",
                  description: "The data for the entity",
                },
              },
              required: ["entityType", "data"],
            },
          },
        ],
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      switch (name) {
        case "query_database":
          return await this.handleQueryDatabase(args);
        case "create_entity":
          return await this.handleCreateEntity(args);
        default:
          throw new Error(\`Unknown tool: \${name}\`);
      }
    });
  }

  async handleQueryDatabase(args) {
    // Implement database query logic based on provider
    return {
      content: [
        {
          type: "text",
          text: \`Query executed: \${args.query}\`,
        },
      ],
    };
  }

  async handleCreateEntity(args) {
    // Implement entity creation logic based on provider
    return {
      content: [
        {
          type: "text",
          text: \`Entity created: \${args.entityType}\`,
        },
      ],
    };
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("MCP server running on stdio");
  }
}

const server = new MCPServer();
server.run().catch(console.error);
`;

    // Add provider-specific logic
    switch (provider) {
      case "instantdb":
        return baseScript.replace(
          "// Implement database query logic based on provider",
          `// InstantDB-specific query logic
    const { db } = await import("@instantdb/react");
    const result = await db.query(JSON.parse(args.query));
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };`
        );
      case "github":
        return baseScript.replace(
          "// Implement database query logic based on provider",
          `// GitHub API query logic
    const response = await fetch(\`https://api.github.com/\${args.query}\`, {
      headers: {
        Authorization: \`Bearer \${process.env.GITHUB_PERSONAL_ACCESS_TOKEN}\`,
      },
    });
    const result = await response.json();
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };`
        );
      default:
        return baseScript;
    }
  }

  private async createMCPUtilities(provider: string): Promise<void> {
    const utilitiesContent = `import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

export class MCPClient {
  private client: Client;
  private transport: StdioClientTransport;

  constructor(serverConfig: any) {
    this.transport = new StdioClientTransport({
      command: serverConfig.command,
      args: serverConfig.args,
      env: serverConfig.env,
    });
    this.client = new Client(
      {
        name: "mycontext-mcp-client",
        version: "1.0.0",
      },
      {
        capabilities: {},
      }
    );
  }

  async connect() {
    await this.client.connect(this.transport);
  }

  async queryDatabase(query: string) {
    const result = await this.client.request({
      method: "tools/call",
      params: {
        name: "query_database",
        arguments: { query },
      },
    });
    return result;
  }

  async createEntity(entityType: string, data: any) {
    const result = await this.client.request({
      method: "tools/call",
      params: {
        name: "create_entity",
        arguments: { entityType, data },
      },
    });
    return result;
  }

  async disconnect() {
    await this.client.close();
  }
}

// Provider-specific utilities
${this.createProviderUtilities(provider)}
`;

    await fs.writeFile(
      path.join(process.cwd(), "lib", "mcp-client.ts"),
      utilitiesContent
    );
  }

  private createProviderUtilities(provider: string): string {
    switch (provider) {
      case "instantdb":
        return `
// InstantDB-specific MCP utilities
export class InstantDBMCPClient extends MCPClient {
  constructor(appId: string, token: string) {
    super({
      command: "node",
      args: [".mycontext/mcp/server.js"],
      env: {
        MCP_SERVER_TYPE: "instantdb",
        INSTANTDB_APP_ID: appId,
        INSTANTDB_PERSONAL_ACCESS_TOKEN: token,
      },
    });
  }

  async queryEntities(entityType: string, filters?: any) {
    const query = JSON.stringify({ [entityType]: filters || {} });
    return await this.queryDatabase(query);
  }

  async createEntity(entityType: string, data: any) {
    return await this.createEntity(entityType, data);
  }
}`;
      case "github":
        return `
// GitHub-specific MCP utilities
export class GitHubMCPClient extends MCPClient {
  constructor(token: string) {
    super({
      command: "npx",
      args: ["@modelcontextprotocol/server-github"],
      env: {
        GITHUB_PERSONAL_ACCESS_TOKEN: token,
      },
    });
  }

  async getRepository(owner: string, repo: string) {
    return await this.queryDatabase(\`repos/\${owner}/\${repo}\`);
  }

  async getIssues(owner: string, repo: string, state?: string) {
    const query = \`repos/\${owner}/\${repo}/issues\${state ? \`?state=\${state}\` : ""}\`;
    return await this.queryDatabase(query);
  }
}`;
      default:
        return `
// Custom MCP utilities
export class CustomMCPClient extends MCPClient {
  constructor(serverUrl: string, token: string) {
    super({
      command: "node",
      args: [".mycontext/mcp/server.js"],
      env: {
        MCP_SERVER_TYPE: "custom",
        MCP_SERVER_URL: serverUrl,
        MCP_SERVER_TOKEN: token,
      },
    });
  }
}`;
    }
  }

  private async createEnvironmentConfig(options: {
    provider: string;
    server?: string;
    token?: string;
  }): Promise<void> {
    const envContent = `# MCP Configuration
MCP_SERVER_TYPE=${options.provider}
MCP_SERVER_URL=${options.server || "__YOUR_SERVER_URL__"}
MCP_SERVER_TOKEN=${options.token || "__YOUR_TOKEN__"}

# Provider-specific environment variables
${this.getProviderEnvVars(options.provider)}
`;

    const envPath = path.join(process.cwd(), ".env.local");
    const existingEnv = (await fs.pathExists(envPath))
      ? await fs.readFile(envPath, "utf-8")
      : "";

    // Only add MCP config if not already present
    if (!existingEnv.includes("MCP_SERVER_TYPE")) {
      await fs.writeFile(envPath, existingEnv + "\n" + envContent);
    }
  }

  private getProviderEnvVars(provider: string): string {
    switch (provider) {
      case "instantdb":
        return `# InstantDB Configuration
NEXT_PUBLIC_INSTANT_APP_ID=__YOUR_APP_ID__
INSTANTDB_PERSONAL_ACCESS_TOKEN=__YOUR_PERSONAL_ACCESS_TOKEN__`;
      case "github":
        return `# GitHub Configuration
GITHUB_PERSONAL_ACCESS_TOKEN=__YOUR_GITHUB_TOKEN__`;
      default:
        return `# Custom MCP Configuration
CUSTOM_MCP_SERVER_URL=__YOUR_SERVER_URL__
CUSTOM_MCP_SERVER_TOKEN=__YOUR_TOKEN__`;
    }
  }

  private showNextSteps(provider: string): void {
    console.log(chalk.blue.bold("\n🎯 Next Steps:\n"));

    console.log(chalk.yellow("1. Configure your MCP server:"));
    console.log(chalk.gray("   • Edit .mycontext/mcp/config.json"));
    console.log(
      chalk.gray("   • Update environment variables in .env.local\n")
    );

    console.log(chalk.yellow("2. Test your MCP connection:"));
    console.log(chalk.gray("   • Import MCPClient in your app"));
    console.log(chalk.gray("   • Test the connection with your provider\n"));

    console.log(chalk.yellow("3. Use MCP in your components:"));
    console.log(chalk.gray("   • Import MCP utilities from lib/mcp-client.ts"));
    console.log(
      chalk.gray("   • Use provider-specific methods for data operations\n")
    );

    console.log(chalk.cyan("📚 Documentation:"));
    console.log(
      chalk.gray("   • MCP Specification: https://modelcontextprotocol.io/")
    );
    console.log(
      chalk.gray(
        "   • InstantDB MCP: https://github.com/instantdb/instant/tree/main/client/packages/mcp"
      )
    );
    console.log(
      chalk.gray(
        "   • GitHub MCP: https://github.com/modelcontextprotocol/servers/tree/main/src/github"
      )
    );
  }
}
