import { Command } from "commander";
import chalk from "chalk";
import { MyContextMCPServer } from "../mcp/mycontext-server";

export class MCPStartCommand {
  register(program: Command) {
    program
      .command("mcp:start")
      .description("Start the MyContext MCP Server for GitLab Duo integration")
      .option("-p, --path <path>", "Path to the project root", process.cwd())
      .action(async (options) => {
        try {
          console.error(chalk.blue.bold("🚀 Starting MyContext MCP Server..."));
          const server = new MyContextMCPServer(options.path);
          await server.start();
        } catch (error: any) {
          console.error(chalk.red("❌ Failed to start MCP server:"), error.message);
          process.exit(1);
        }
      });
  }
}
