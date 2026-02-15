
import { MegaContext } from "../src/types/mega-context";
import * as fs from "fs";
import * as path from "path";

const samplePath = path.join(__dirname, "mega-context-sample.json");

try {
  const content = fs.readFileSync(samplePath, "utf-8");
  const data: MegaContext = JSON.parse(content);
  
  console.log("✅ MegaContext JSON is valid!");
  console.log(`Project: ${data.project.name} (${data.project.framework} + ${data.project.backend})`);
  console.log(`Entities: ${Object.keys(data.database.entities).join(", ")}`);
  console.log(`Routes: ${Object.keys(data.routing.routes).join(", ")}`);
  
  // Basic validation logic (simulating type checking at runtime)
  if (!data.project.framework || data.project.framework !== "nextjs") {
    throw new Error("Invalid framework: Must be 'nextjs'");
  }
  
} catch (error) {
  console.error("❌ Validation Failed:", error);
  process.exit(1);
}
