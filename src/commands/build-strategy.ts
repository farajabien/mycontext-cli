import { Command } from "commander";
import { BuildStrategyManager } from "../utils/buildStrategyManager";
import chalk from "chalk";
import inquirer from "inquirer";

export const buildStrategyCommand = new Command("build-strategy")
  .description("Generate AI-powered build strategy for your project")
  .option("-r, --recommend", "Get strategy recommendations")
  .option("-p, --plan", "Generate detailed build plan")
  .option("-t, --tasks", "Generate task list for current phase")
  .option("-c, --compare", "Compare all available strategies")
  .option("--context", "Show loaded project context")
  .option("--list", "List all saved strategy files")
  .option(
    "--load <type>",
    "Load saved strategy data (recommendations|plan|tasks|comparison)"
  )
  .action(async (options) => {
    const manager = new BuildStrategyManager();

    try {
      if (options.context) {
        await showProjectContext(manager);
      } else if (options.list) {
        await listStrategyFiles(manager);
      } else if (options.load) {
        await loadStrategyData(manager, options.load);
      } else if (options.recommend) {
        await getStrategyRecommendations(manager);
      } else if (options.plan) {
        await generateBuildPlan(manager, options.strategy);
      } else if (options.tasks) {
        await generateTaskList(manager, options.strategy);
      } else if (options.compare) {
        await compareStrategies(manager);
      } else {
        await interactiveStrategySelection(manager);
      }
    } catch (error) {
      console.error(chalk.red("❌ Error:"), error);
      process.exit(1);
    }
  });

async function showProjectContext(manager: BuildStrategyManager) {
  console.log(chalk.blue("📋 Project Context Analysis\n"));

  try {
    const context = await manager.loadProjectContext();

    console.log(chalk.bold("📁 Project Information:"));
    console.log(chalk.gray(`   Name: ${context.projectName}`));
    console.log(chalk.gray(`   Description: ${context.description}`));
    console.log();

    console.log(chalk.bold("🧩 Components Found:"));
    if (context.components.length > 0) {
      context.components.forEach((comp, index) => {
        console.log(chalk.gray(`   ${index + 1}. ${comp}`));
      });
    } else {
      console.log(chalk.yellow("   No components found in component list"));
    }
    console.log();

    console.log(chalk.bold("👥 User Roles Identified:"));
    context.userRoles.forEach((role, index) => {
      console.log(chalk.gray(`   ${index + 1}. ${role}`));
    });
    console.log();

    console.log(chalk.bold("⚙️ Tech Stack Detected:"));
    context.techStack.forEach((tech, index) => {
      console.log(chalk.gray(`   ${index + 1}. ${tech}`));
    });
    console.log();

    const loadedFiles = [
      context.prd,
      context.types,
      context.brand,
      context.componentList,
      context.features,
      context.userFlows,
      context.edgeCases,
      context.technicalSpecs,
    ].filter(Boolean).length;

    console.log(chalk.bold("📊 Context Completeness:"));
    console.log(chalk.gray(`   ${loadedFiles}/8 context files loaded`));

    if (loadedFiles >= 6) {
      console.log(
        chalk.green(
          "   ✅ Excellent context coverage - build plans will be highly accurate"
        )
      );
    } else if (loadedFiles >= 4) {
      console.log(
        chalk.yellow(
          "   ⚠️ Good context coverage - build plans will be reasonably accurate"
        )
      );
    } else {
      console.log(
        chalk.red(
          "   ❌ Limited context coverage - consider running 'mycontext generate context --full' first"
        )
      );
    }
  } catch (error) {
    console.log(chalk.red("❌ Error loading project context:"));
    console.log(chalk.gray(`   ${error}`));
    console.log(
      chalk.yellow(
        "\n💡 Try running 'mycontext init' or 'mycontext generate context --full' first"
      )
    );
  }
}

async function getStrategyRecommendations(manager: BuildStrategyManager) {
  console.log(chalk.blue("🎯 Getting AI-Powered Strategy Recommendations\n"));

  const answers = await inquirer.prompt([
    {
      type: "list",
      name: "projectType",
      message: "What type of project are you building?",
      choices: [
        { name: "Client Work", value: "client" },
        { name: "Personal Project", value: "personal" },
        { name: "Team Development", value: "team" },
        { name: "MVP Development", value: "mvp" },
        { name: "Enterprise Application", value: "enterprise" },
      ],
    },
    {
      type: "list",
      name: "complexity",
      message: "How complex is your application?",
      choices: [
        { name: "Simple (few features, single user type)", value: "simple" },
        {
          name: "Medium (multiple features, some complexity)",
          value: "medium",
        },
        {
          name: "Complex (many features, multiple user types)",
          value: "complex",
        },
      ],
    },
    {
      type: "list",
      name: "timeline",
      message: "What's your timeline?",
      choices: [
        { name: "Urgent (need demo ASAP)", value: "urgent" },
        { name: "Moderate (balanced approach)", value: "moderate" },
        { name: "Flexible (quality over speed)", value: "flexible" },
      ],
    },
    {
      type: "list",
      name: "teamSize",
      message: "What's your team size?",
      choices: [
        { name: "Solo developer", value: "solo" },
        { name: "Small team (2-5 people)", value: "small" },
        { name: "Large team (6+ people)", value: "large" },
      ],
    },
  ]);

  const recommendations = await manager.recommendStrategies(answers);

  console.log(chalk.green("\n✅ Recommended Strategies:\n"));
  recommendations.recommended.forEach((strategy: any) => {
    console.log(chalk.bold(`${strategy.icon} ${strategy.name}`));
    console.log(chalk.gray(`   ${strategy.description}`));
    console.log(
      chalk.cyan(`   Time to first demo: ${strategy.timeToFirstDemo}`)
    );
    console.log(chalk.yellow(`   Complexity: ${strategy.complexity}`));
    console.log();
  });

  console.log(chalk.blue("💡 Reasoning:"));
  console.log(chalk.gray(`   ${recommendations.reasoning}\n`));

  if (recommendations.alternatives.length > 0) {
    console.log(chalk.yellow("🔄 Alternative Strategies:"));
    recommendations.alternatives.forEach((strategy: any) => {
      console.log(chalk.gray(`   ${strategy.icon} ${strategy.name}`));
    });
  }
}

async function generateBuildPlan(
  manager: BuildStrategyManager,
  strategyId?: string
) {
  console.log(chalk.blue("📋 Generating Detailed Build Plan\n"));

  if (!strategyId) {
    const { strategy } = await inquirer.prompt([
      {
        type: "list",
        name: "strategy",
        message: "Which strategy would you like to plan?",
        choices: [
          { name: "🏗️ Foundation First", value: "foundation-first" },
          { name: "🎯 Vertical Slice", value: "vertical-slice" },
          { name: "📊 Horizontal Slice", value: "horizontal-slice" },
          { name: "🔄 Iterative Scaffolding", value: "iterative-scaffolding" },
          { name: "⚡ Hybrid Approach", value: "hybrid" },
        ],
      },
    ]);
    strategyId = strategy;
  }

  const plan = await manager.generateBuildPlan(strategyId);

  console.log(
    chalk.green(`✅ Build Plan for ${plan.strategy?.name || strategyId}:\n`)
  );

  plan.plan?.forEach((phase: any) => {
    console.log(chalk.bold(`Phase ${phase.phase}: ${phase.name}`));
    console.log(chalk.gray(`   Duration: ${phase.duration}`));
    console.log(chalk.gray(`   Tasks: ${phase.tasks?.join(", ")}`));
    console.log(
      chalk.gray(`   Deliverables: ${phase.deliverables?.join(", ")}`)
    );
    console.log();
  });

  if (plan.totalDuration) {
    console.log(chalk.cyan(`📅 Total Duration: ${plan.totalDuration}`));
  }

  if (plan.milestones?.length > 0) {
    console.log(chalk.yellow("\n🎯 Key Milestones:"));
    plan.milestones.forEach((milestone: string) => {
      console.log(chalk.gray(`   • ${milestone}`));
    });
  }
}

async function generateTaskList(
  manager: BuildStrategyManager,
  strategyId?: string
) {
  console.log(chalk.blue("📝 Generating Task List\n"));

  if (!strategyId) {
    const { strategy } = await inquirer.prompt([
      {
        type: "list",
        name: "strategy",
        message: "Which strategy?",
        choices: [
          { name: "🏗️ Foundation First", value: "foundation-first" },
          { name: "🎯 Vertical Slice", value: "vertical-slice" },
          { name: "📊 Horizontal Slice", value: "horizontal-slice" },
          { name: "🔄 Iterative Scaffolding", value: "iterative-scaffolding" },
          { name: "⚡ Hybrid Approach", value: "hybrid" },
        ],
      },
    ]);
    strategyId = strategy;
  }

  const { phaseNumber } = await inquirer.prompt([
    {
      type: "number",
      name: "phaseNumber",
      message: "Which phase?",
      default: 1,
      min: 1,
    },
  ]);

  const taskList = await manager.generateTaskList(strategyId, phaseNumber);

  console.log(
    chalk.green(`✅ Tasks for Phase ${phaseNumber}: ${taskList.phase?.name}\n`)
  );

  taskList.tasks?.forEach((task: any) => {
    console.log(chalk.bold(`${task.title}`));
    console.log(chalk.gray(`   ${task.description}`));
    console.log(chalk.cyan(`   Priority: ${task.priority}`));
    console.log(chalk.yellow(`   Time: ${task.estimatedTime}`));
    if (task.dependencies?.length > 0) {
      console.log(
        chalk.red(`   Dependencies: ${task.dependencies.join(", ")}`)
      );
    }
    console.log();
  });
}

async function compareStrategies(manager: BuildStrategyManager) {
  console.log(chalk.blue("⚖️ Comparing All Strategies\n"));

  const comparison = await manager.compareStrategies();

  console.log(chalk.green("📊 Strategy Comparison:\n"));

  comparison.strategies?.forEach((strategy: any) => {
    console.log(chalk.bold(`${strategy.icon} ${strategy.name}`));
    console.log(chalk.gray(`   ${strategy.description}`));
    console.log(chalk.cyan(`   Time to demo: ${strategy.timeToFirstDemo}`));
    console.log(chalk.yellow(`   Complexity: ${strategy.complexity}`));
    console.log(chalk.green(`   Score: ${strategy.score}/10`));
    console.log();
  });

  console.log(chalk.bold(`🎯 Recommendation: ${comparison.recommendation}`));
  console.log(chalk.gray(`   ${comparison.reasoning}`));
}

async function interactiveStrategySelection(manager: BuildStrategyManager) {
  console.log(chalk.blue("🚀 MyContext Build Strategy Assistant\n"));

  const { action } = await inquirer.prompt([
    {
      type: "list",
      name: "action",
      message: "What would you like to do?",
      choices: [
        { name: "Get strategy recommendations", value: "recommend" },
        { name: "Compare all strategies", value: "compare" },
        { name: "Generate build plan", value: "plan" },
        { name: "Generate task list", value: "tasks" },
        { name: "Show project context", value: "context" },
      ],
    },
  ]);

  switch (action) {
    case "recommend":
      await getStrategyRecommendations(manager);
      break;
    case "compare":
      await compareStrategies(manager);
      break;
    case "plan":
      await generateBuildPlan(manager);
      break;
    case "tasks":
      await generateTaskList(manager);
      break;
    case "context":
      await showProjectContext(manager);
      break;
  }
}

async function listStrategyFiles(manager: BuildStrategyManager) {
  console.log(chalk.blue("📁 Saved Strategy Files\n"));

  try {
    const files = await manager.listStrategyFiles();

    if (files.length === 0) {
      console.log(chalk.yellow("No strategy files found."));
      console.log(
        chalk.gray(
          "Run 'mycontext build-strategy --recommend' to generate your first strategy file."
        )
      );
      return;
    }

    console.log(chalk.green("Available strategy files:\n"));

    files.forEach((file, index) => {
      console.log(chalk.bold(`${index + 1}. ${file.type.toUpperCase()}`));
      console.log(chalk.gray(`   Date: ${file.date}`));
      console.log(chalk.gray(`   Path: ${file.filepath}`));
      console.log();
    });

    console.log(chalk.cyan("💡 Usage:"));
    console.log(
      chalk.gray("   mycontext build-strategy --load recommendations")
    );
    console.log(chalk.gray("   mycontext build-strategy --load plan"));
    console.log(chalk.gray("   mycontext build-strategy --load tasks"));
    console.log(chalk.gray("   mycontext build-strategy --load comparison"));
  } catch (error) {
    console.log(chalk.red("❌ Error listing strategy files:"));
    console.log(chalk.gray(`   ${error}`));
  }
}

async function loadStrategyData(manager: BuildStrategyManager, type: string) {
  console.log(chalk.blue(`📂 Loading ${type} Strategy Data\n`));

  try {
    const data = await manager.loadStrategyData(type);

    console.log(chalk.green(`✅ Loaded ${type} strategy data:\n`));

    // Pretty print the JSON data
    console.log(chalk.gray(JSON.stringify(data, null, 2)));

    console.log(chalk.cyan("\n💡 TypeScript Usage:"));
    console.log(chalk.gray("```typescript"));
    console.log(
      chalk.gray(
        "import { BuildStrategyManager } from './buildStrategyManager';"
      )
    );
    console.log(chalk.gray(""));
    console.log(chalk.gray("const manager = new BuildStrategyManager();"));
    console.log(
      chalk.gray(
        `const ${type}Data = await manager.loadStrategyData('${type}');`
      )
    );
    console.log(chalk.gray(""));
    console.log(chalk.gray("// Access the data"));
    console.log(chalk.gray(`console.log(${type}Data);`));
    console.log(chalk.gray("```"));
  } catch (error) {
    console.log(chalk.red(`❌ Error loading ${type} strategy data:`));
    console.log(chalk.gray(`   ${error}`));
    console.log(
      chalk.yellow(
        "\n💡 Try running 'mycontext build-strategy --list' to see available files"
      )
    );
  }
}
