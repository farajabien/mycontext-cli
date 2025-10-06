#!/usr/bin/env node

/**
 * MyContext CLI Improvement Analysis Script
 *
 * This script runs the improvement review prompt through your configured AI
 * to generate comprehensive improvement reports for the MyContext CLI.
 */

const { HybridAIClient } = require('../dist/utils/hybridAIClient');
const fs = require('fs-extra');
const path = require('path');

async function runImprovementAnalysis() {
  console.log('🤖 Running MyContext CLI Improvement Analysis...\n');

  try {
    // Load the improvement review prompt
    const promptPath = path.join(__dirname, '..', 'docs', 'improvement-review-prompt.md');
    const prompt = await fs.readFile(promptPath, 'utf8');

    console.log('📋 Loaded improvement review prompt');
    console.log('🔍 Analyzing codebase and generating reports...\n');

    // Initialize AI client
    const aiClient = new HybridAIClient();

    // Run the analysis
    const response = await aiClient.generateText(prompt, {
      temperature: 0.7,
      maxTokens: 8000, // Allow for comprehensive analysis
    });

    // Parse the response to extract the reports
    const reports = parseAIResponse(response.text);

    // Save each report to the docs directory
    await saveReports(reports);

    console.log('✅ Improvement analysis completed successfully!');
    console.log('\n📊 Generated Reports:');
    Object.keys(reports).forEach(reportName => {
      console.log(`   • docs/${reportName}`);
    });

    console.log('\n🎯 Next Steps:');
    console.log('   1. Review the generated reports');
    console.log('   2. Prioritize implementation based on the priority matrix');
    console.log('   3. Start with P0 (critical) fixes');
    console.log('   4. Implement improvements incrementally');

  } catch (error) {
    console.error('❌ Improvement analysis failed:', error.message);
    console.log('\n💡 Troubleshooting:');
    console.log('   1. Check your AI provider configuration');
    console.log('   2. Verify API keys are set correctly');
    console.log('   3. Try running: mycontext status');
    console.log('   4. Check rate limits and quotas');
  }
}

function parseAIResponse(response) {
  // This is a simplified parser - in a real implementation,
  // you would need more sophisticated parsing based on the AI response format

  const reports = {
    'workflow-optimization.md': extractSection(response, 'Workflow Optimization Report'),
    'error-handling-improvements.md': extractSection(response, 'Error Handling Improvement Plan'),
    'ux-improvements.md': extractSection(response, 'User Experience Enhancement'),
    'documentation-gaps.md': extractSection(response, 'Documentation Gaps Analysis'),
    'implementation-priority.md': extractSection(response, 'Implementation Priority Matrix')
  };

  return reports;
}

function extractSection(text, sectionName) {
  // Simple section extraction - you may need more sophisticated parsing
  const lines = text.split('\n');
  const startIndex = lines.findIndex(line => line.includes(sectionName));

  if (startIndex === -1) {
    return `# ${sectionName}\n\n*Report generation in progress...*\n`;
  }

  // Extract content until next major section or end
  const content = [];
  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith('# ') && i > startIndex && !line.includes(sectionName)) {
      break;
    }
    content.push(line);
  }

  return content.join('\n');
}

async function saveReports(reports) {
  const docsDir = path.join(__dirname, '..', 'docs');

  for (const [filename, content] of Object.entries(reports)) {
    const filePath = path.join(docsDir, filename);
    await fs.writeFile(filePath, content);
    console.log(`   ✓ Saved ${filename}`);
  }
}

// Run the analysis
if (require.main === module) {
  runImprovementAnalysis().catch(console.error);
}

module.exports = { runImprovementAnalysis };
