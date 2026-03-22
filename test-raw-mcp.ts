import { spawn } from "child_process";
import * as path from "path";

async function testRawMCP() {
  console.log("🚀 Starting MyContext MCP Server in RAW mode...");

  const serverProcess = spawn("npx", [
    "tsx",
    path.join(process.cwd(), "apps/cli/src/mcp/mycontext-server.ts"),
    process.cwd()
  ]);

  serverProcess.stderr.on("data", (data) => {
    console.error(`[Server Log]: ${data.toString().trim()}`);
  });

  const sendRequest = (method: string, params: any) => {
    const request = {
      jsonrpc: "2.0",
      id: Date.now(),
      method,
      params,
    };
    serverProcess.stdin.write(JSON.stringify(request) + "\n");
  };

  serverProcess.stdout.on("data", (data) => {
    try {
      const response = JSON.parse(data.toString());
      console.log("📥 Received Response:", JSON.stringify(response, null, 2).substring(0, 1000) + "...");
      
      if (response.result && response.result.tools) {
        console.log("✅ Tools listed successfully!");
        // Now call sync_brain
        console.log("📡 Calling sync_brain...");
        sendRequest("tools/call", {
          name: "sync_brain",
          arguments: {}
        });
      }

      if (response.result && response.result.content) {
        console.log("🎉 Tool Execution Result received!");
        process.exit(0);
      }
    } catch (e) {
      // Ignore non-json logs
    }
  });

  // 1. Initialize
  console.log("📡 Sending initialize...");
  sendRequest("initialize", {
    protocolVersion: "2024-11-05",
    capabilities: {},
    clientInfo: { name: "raw-tester", version: "1.0.0" }
  });

  // 2. List tools after a short delay
  setTimeout(() => {
    console.log("📡 Listing tools...");
    sendRequest("tools/list", {});
  }, 2000);

  // Timeout safety
  setTimeout(() => {
    console.error("❌ Test timed out.");
    serverProcess.kill();
    process.exit(1);
  }, 30000);
}

testRawMCP().catch(console.error);
