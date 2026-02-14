
import { FileGenerator } from '../../apps/cli/src/utils/FileGenerator';
import { AICore } from '../../apps/cli/src/core/ai/AICore';
import * as path from 'path';
import chalk from 'chalk';

async function testLego() {
    console.log(chalk.blue('🧪 Testing Lego Piece Discovery...'));
    
    // We need a dummy AICore that just returns what we want or errors (we only care about the prompt check)
    // Correct paths relative to where npx tsx is run
    const projectRoot = process.cwd(); 
    const workspaceRoot = path.join(projectRoot, '../../../../');
    
    const aiCore = AICore.getInstance({
        workingDirectory: workspaceRoot,
        fallbackEnabled: true
    });
    
    const generator = new FileGenerator(aiCore, projectRoot);
    
    console.log(chalk.yellow('\nScenario: Adding a Pro-Plus card to PricingPlans...'));
    // This prompt contains "PricingPlans" which should match our registry entry
    const prompt = "Add a new 'Pro Plus' pricing card to the PricingPlans component. It should cost $50/month.";
    
    try {
        await generator.generateFile('PricingPlansUpdate.jsx', prompt);
    } catch (e) {
        // We expect a rate limit error or something if it tries to call AI, 
        // but it should HAVE LOGGED the "Lego Pieces Found" before that.
        console.log(chalk.gray('Note: AI call failed as expected, checking discovery logs above.'));
    }
}

testLego().catch(console.error);
