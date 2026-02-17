/**
 * E2E Test: Verify PlanningMode detects existing context.json
 * Run from project root: npx tsx experiments/test-context-aware-tui.ts
 */
import path from "path";
import chalk from "chalk";

// Simulate the PlanningMode context detection
async function main() {
    const projectPath = process.cwd();
    
    console.log(chalk.blue("🧪 E2E Test: Context-Aware TUI Detection\n"));
    console.log(chalk.gray(`Project path: ${projectPath}\n`));
    
    // Dynamically import PlanningMode (it's compiled)
    const { PlanningMode } = await import("../apps/cli/dist/tui/PlanningMode.js");
    const { TUIClient } = await import("../apps/cli/dist/tui/TUIClient.js");
    
    // Create TUIClient pointed at our project root
    const tui = new TUIClient(projectPath);
    
    // We can't run the full interactive flow in a test, 
    // but we CAN test the context detection logic directly
    const planningMode = new PlanningMode(tui, projectPath);
    
    // Test: loadExistingContext should find our context.json
    const existing = await (planningMode as any).loadExistingContext();
    
    if (existing) {
        console.log(chalk.green("✅ Context detection PASSED!"));
        console.log(chalk.gray(`   Project: ${existing.project?.name || existing.brain?.narrative || "Found"}`));
        
        const entities = existing.database?.entities ? Object.keys(existing.database.entities) : [];
        const routes = existing.routing?.routes ? Object.keys(existing.routing.routes) : [];
        const brain = existing.brain;
        const registry = brain?.registry?.components || [];
        
        console.log(chalk.gray(`   Entities: ${entities.length > 0 ? entities.join(", ") : "(none in MegaContext)"}`));
        console.log(chalk.gray(`   Routes: ${routes.length > 0 ? routes.join(", ") : "(none in MegaContext)"}`));
        console.log(chalk.gray(`   Brain: ${brain ? "✅ Present" : "❌ Missing"}`));
        console.log(chalk.gray(`   Lego DB: ${registry.length} components registered`));
        
        console.log(chalk.green("\n🎯 The TUI would show: \"🧠 Existing Living Brain detected!\""));
        console.log(chalk.green("   And offer: 🔄 Refine & Evolve | 🆕 Start Fresh | ❌ Cancel"));
    } else {
        console.log(chalk.red("❌ Context detection FAILED — no context.json found"));
        console.log(chalk.gray("   Expected .mycontext/context.json at: " + projectPath));
    }
}

main().catch(console.error);
