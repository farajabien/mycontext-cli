
try {
  console.log('Testing fs-extra...');
  require('fs-extra');
  console.log('Testing chalk...');
  require('chalk');
  console.log('Testing dotenv...');
  require('dotenv');
  console.log('Testing brain types...');
  require('../../packages/core/src/types/brain');
  console.log('Testing AICore...');
  require('../../apps/cli/src/core/ai/AICore');
  console.log('Success!');
} catch (e) {
  console.error('Error:', e.message);
}
