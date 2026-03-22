import { spawn } from "child_process";
import * as path from "path";

async function testFinalSync() {
  const rootDir = "/Users/farajabien/Desktop/ahh work/personal/mycontext-cli";
  const cliPath = path.join(rootDir, "apps/cli/dist/cli.js");

  console.log("🚀 Starting Production MCP Server...");
  const server = spawn("node", [cliPath, "mcp:start", "-p", rootDir]);

  server.stderr.on("data", (data) => {
    console.log(`[SERVER]: ${data.toString().trim()}`);
  });

  const send = (obj: any) => {
    server.stdin.write(JSON.stringify(obj) + "\n");
  };

  server.stdout.on("data", (data) => {
    const raw = data.toString();
    try {
      const msg = JSON.parse(raw);
      console.log("📥 RESPONSE:", JSON.stringify(msg, null, 2).substring(0, 500) + "...");

      if (msg.id === 1) {
        console.log("✅ Initialized. Calling sync_brain...");
        send({
          jsonrpc: "2.0",
          id: 2,
          method: "tools/call",
          params: {
            name: "sync_brain",
            arguments: {}
          }
        });
      }

      if (msg.id === 2) {
        console.log("🎉 SYNC COMPLETE!");
        console.log("Result content:", msg.result.content[0].text);
        server.kill();
        process.exit(0);
      }
    } catch (e) {
      // Not JSON
    }
  });

  // Start sequence
  setTimeout(() => {
    send({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: { name: "final-tester", version: "1.0.0" }
      }
    });
  }, 2000);

  setTimeout(() => {
    console.error("❌ Timeout");
    server.kill();
    process.exit(1);
  }, 60000);
}

testFinalSync().catch(console.error);
