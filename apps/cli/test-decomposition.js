#!/usr/bin/env node

/**
 * Test task decomposition
 */

const { Planner } = require('./dist/services/Planner');

async function test() {
  console.log('🧪 Testing Task Decomposition\n');
  console.log('Input: "A blog with user authentication"\n');
  console.log('=' .repeat(60));

  try {
    const planner = new Planner();

    console.log('\n🤖 Decomposing into tasks...\n');
    const tasks = await planner.decompose('A blog with user authentication');

    console.log(`📋 Generated ${tasks.length} tasks:\n`);

    tasks.forEach((task, idx) => {
      const confidenceEmoji = task.confidence >= 90 ? '✓' :
                             task.confidence >= 70 ? '⚠' : '❌';

      console.log(`  ${idx + 1}. ${confidenceEmoji} [${task.confidence}%] ${task.description}`);
      console.log(`     Category: ${task.category}`);
      console.log(`     Auto-infer: ${task.autoInfer ? 'YES' : 'NO'}`);
      console.log(`     Dependencies: ${task.dependencies.length > 0 ? task.dependencies.join(', ') : 'none'}`);
      console.log();
    });

    // Summary
    const autoInferCount = tasks.filter(t => t.autoInfer).length;
    const confirmCount = tasks.filter(t => t.needsConfirmation).length;
    const promptCount = tasks.filter(t => t.needsUserInput).length;

    console.log('=' .repeat(60));
    console.log('\n📊 Summary:');
    console.log(`   Total tasks: ${tasks.length}`);
    console.log(`   Auto-infer (≥90%): ${autoInferCount} tasks`);
    console.log(`   Need confirmation (70-89%): ${confirmCount} tasks`);
    console.log(`   Need user input (<70%): ${promptCount} tasks`);
    console.log(`
   Expected user prompts: ${confirmCount + promptCount}`);
    console.log(`   Prompt reduction: ${Math.round((autoInferCount / tasks.length) * 100)}%\n`);

    console.log('✅ Decomposition test passed!');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

test();
