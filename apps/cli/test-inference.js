#!/usr/bin/env node

/**
 * Test script for the inference engine
 * Tests the complete flow from user input to ASL generation
 */

const { InitInteractiveCommand } = require('./dist/commands/init-interactive');

async function test() {
  console.log('🧪 Testing Inference Engine\n');
  console.log('=' .repeat(50));
  console.log('\n');

  try {
    const command = new InitInteractiveCommand();
    await command.execute();

    console.log('\n');
    console.log('=' .repeat(50));
    console.log('✅ Test completed successfully!');
  } catch (error) {
    console.error('\n');
    console.error('=' .repeat(50));
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

test();
