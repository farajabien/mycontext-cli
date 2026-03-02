import { Command } from "commander";
import { prompt } from "inquirer";
import { clarifyFeatureRequestWithLLM } from "../services/llmClarifier";
import { FeaturePlannerAgent } from "../agents/implementations/FeaturePlannerAgent";
import { updateContextJson } from "../utils/fileSystem";
import { loadContextJson } from "../utils/contextLoader";

export const PlanFeatureCommand = new Command("plan-feature")
  .description("Describe a new feature/enhancement, clarify with LLM, and let the planner agent review, plan, and update the brain/todos.")
  .action(async () => {
    // 1. Prompt user for feature/enhancement description
    const { featureDescription } = await prompt([
      {
        type: "input",
        name: "featureDescription",
        message: "Describe the new feature or enhancement:",
      },
    ]);

    // 2. Load current context
    const context = await loadContextJson();

    // 3. Clarify/clean request with LLM
    const clarifiedRequest = await clarifyFeatureRequestWithLLM(featureDescription, context);

    // 4. Planner agent reviews and proposes plan/todos
    const planner = new FeaturePlannerAgent();
    const plan = await planner.planFeature(clarifiedRequest, context);

    // 5. Present plan/todos for approval
    console.log("\nProposed Plan:");
    console.log(plan.summary);
    if (plan.todos && plan.todos.length > 0) {
      console.log("\nTodos:");
      plan.todos.forEach((todo, idx) => {
        console.log(`  [ ] ${todo}`);
      });
    }

    const { approve } = await prompt([
      {
        type: "confirm",
        name: "approve",
        message: "Approve and update context.json/roadmap?",
        default: true,
      },
    ]);

    if (approve) {
      await updateContextJson(plan.contextUpdates);
      console.log("\n✅ Feature/plan added to context.json and roadmap.");
    } else {
      console.log("\n❌ Plan not applied.");
    }
  });
