#!/usr/bin/env node

/**
 * MyContext CLI Improvement Analysis Script
 *
 * - Robust Markdown section extraction using unified + remark-parse
 * - Matches headings at any depth; stops a section at next heading of same or shallower depth
 * - Normalizes headings for reliable matching
 * - Fallback simple extraction if parsing fails
 *
 * Install deps:
 *   npm i fs-extra unified remark-parse mdast-util-to-markdown
 */

const { HybridAIClient } = require('../dist/utils/hybridAIClient');
const fs = require('fs-extra');
const path = require('path');

const { unified } = require('unified');
const remarkParse = require('remark-parse');
const { toMarkdown } = require('mdast-util-to-markdown');

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

/* ----------------------------
   High-level response parsing
   ---------------------------- */
function parseAIResponse(response) {
  // Define the expected section names (canonical names)
  const sectionNames = [
    'Workflow Optimization Report',
    'Error Handling Improvement Plan',
    'User Experience Enhancement',
    'Documentation Gaps Analysis',
    'Implementation Priority Matrix'
  ];

  // Try robust markdown extraction first
  const extractedSections = extractSections(response, sectionNames);

  // Map section names to filenames and provide a small fallback
  const reports = {
    'workflow-optimization.md': extractedSections['workflow optimization report'] ||
      `# Workflow Optimization Report\n\n*Report generation in progress...*\n`,
    'error-handling-improvements.md': extractedSections['error handling improvement plan'] ||
      `# Error Handling Improvement Plan\n\n*Report generation in progress...*\n`,
    'ux-improvements.md': extractedSections['user experience enhancement'] ||
      `# User Experience Enhancement\n\n*Report generation in progress...*\n`,
    'documentation-gaps.md': extractedSections['documentation gaps analysis'] ||
      `# Documentation Gaps Analysis\n\n*Report generation in progress...*\n`,
    'implementation-priority.md': extractedSections['implementation priority matrix'] ||
      `# Implementation Priority Matrix\n\n*Report generation in progress...*\n`
  };

  return reports;
}

/* ----------------------------
   Markdown section extraction
   ---------------------------- */

/**
 * Extracts sections from Markdown. Returns an object keyed by normalized section name.
 *
 * - Parses the Markdown into mdast (root).
 * - Iterates root.children sequentially. When a heading node matches one of the requested
 *   section names (normalized), it collects nodes until the next heading with depth <= current.
 */
function extractSections(markdown, sectionNames) {
  // Normalize requested names to lowercase punctuation-stripped keys
  const normalizedTargets = sectionNames.reduce((acc, name) => {
    acc[normalizeHeading(name)] = name; // store original for reference if needed
    return acc;
  }, {});

  try {
    const tree = unified().use(remarkParse).parse(markdown);
    const results = {};

    const children = tree.children || [];

    let currentKey = null;      // normalized key string
    let currentDepth = 100;     // heading depth of the current section start
    let buffer = [];

    for (let i = 0; i < children.length; i++) {
      const node = children[i];

      if (node.type === 'heading') {
        const headingText = getPlainTextFromHeading(node);
        const norm = normalizeHeading(headingText);

        // If there's an active section and this heading is same-or-shallower depth, close it.
        if (currentKey && node.depth <= currentDepth) {
          // flush
          results[currentKey] = toMarkdown({ type: 'root', children: buffer });
          currentKey = null;
          buffer = [];
          currentDepth = 100;
        }

        // Start a new section if heading matches one of the requested names
        if (normalizedTargets[norm]) {
          currentKey = norm;
          currentDepth = node.depth;
          buffer = [node]; // include the heading node itself
          continue; // don't push this heading again below
        }
      }

      // If currently collecting a section, add node
      if (currentKey) buffer.push(node);
    }

    // Flush last open section
    if (currentKey && buffer.length > 0) {
      results[currentKey] = toMarkdown({ type: 'root', children: buffer });
    }

    return results;
  } catch (err) {
    // Fallback to simple extraction
    console.warn('⚠️  remark parse failed, falling back to line-based extraction:', err.message);
    return extractSectionsFallback(markdown, sectionNames);
  }
}

/* ----------------------------
   Helpers
   ---------------------------- */

function normalizeHeading(text) {
  if (!text) return '';
  // lowercase, trim, remove punctuation except internal hyphens/underscores
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // remove punctuation
    .replace(/\s+/g, ' ')
    .trim();
}

function getPlainTextFromHeading(node) {
  // heading node may have children with various types (text, emphasis, etc.)
  if (!node || !node.children) return '';
  return node.children
    .map(child => {
      if (child.type === 'text') return child.value;
      // handle inline emphasis, strong, link, etc. by recursively pulling plain text
      if (child.children) return child.children.map(c => c.value || '').join('');
      return child.value || '';
    })
    .join('')
    .trim();
}

/* ----------------------------
   Fallback extraction (simple)
   ---------------------------- */
function extractSectionsFallback(text, sectionNames) {
  const results = {};
  const lines = text.split(/\r?\n/);
  const normalizedTargets = sectionNames.map(s => normalizeHeading(s));

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // simple heading detection: lines starting with '#'
    const isHeading = line.trim().startsWith('#');
    if (!isHeading) continue;

    // strip leading hashes and whitespace
    const headingText = line.replace(/^#+\s*/, '').trim();
    const norm = normalizeHeading(headingText);
    const matchIndex = normalizedTargets.indexOf(norm);
    if (matchIndex === -1) continue;

    const sectionName = sectionNames[matchIndex];
    // collect subsequent lines until next top-level heading
    const buffer = [line];
    for (let j = i + 1; j < lines.length; j++) {
      if (lines[j].trim().startsWith('#')) break;
      buffer.push(lines[j]);
    }
    results[norm] = buffer.join('\n');
  }

  return results;
}

/* ----------------------------
   Save reports
   ---------------------------- */
async function saveReports(reports) {
  const docsDir = path.join(__dirname, '..', 'docs');
  await fs.ensureDir(docsDir);

  for (const [filename, content] of Object.entries(reports)) {
    const filePath = path.join(docsDir, filename);
    await fs.writeFile(filePath, content, 'utf8');
    console.log(`   ✓ Saved ${filename}`);
  }
}

/* ----------------------------
   Module exports & CLI runner
   ---------------------------- */
if (require.main === module) {
  runImprovementAnalysis().catch(console.error);
}

module.exports = {
  runImprovementAnalysis,
  extractSections,           // exported for easier unit testing
  extractSectionsFallback,
  normalizeHeading,
};
