import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import * as path from "path";

async function run() {
  const transport = new StdioClientTransport({
    command: "npx",
    args: [
      "tsx", 
      path.join(process.cwd(), "apps/cli/src/mcp/mycontext-server.ts"),
      process.cwd()
    ],
  });


  const client = new Client(
    {
      name: "mcp-test-client",
      version: "1.0.0",
    },
    {
      capabilities: {},
    }
  );

  console.log("Connecting to MCP server...");
  await client.connect(transport);
  console.log("Connected!");

  console.log("Calling get_living_brain directly:");
  try {
    const brainResult = await client.request({
      method: "tools/call",
      params: {
        name: "get_living_brain",
        arguments: {},
      },
    });
    console.log("Brain Result (truncated):", JSON.stringify(brainResult).substring(0, 500) + "...");
  } catch (e) {
    console.error("Direct call failed:", e);
  }

  await client.close();

  console.log("Disconnected.");
}

run().catch(console.error);
