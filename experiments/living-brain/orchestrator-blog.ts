
import * as fs from 'fs-extra';
import * as path from 'path';
import { AICore } from '../../apps/cli/src/core/ai/AICore';
import { BrainClient } from '../../apps/cli/src/core/brain/BrainClient';
import { BrainRole, BrainUpdate } from '../../packages/core/src/types/brain';
import chalk from 'chalk';
import * as dotenv from 'dotenv';

// Load environment variables dynamically based on root
const findProjectRoot = () => {
    let current = process.cwd();
    while (current !== '/') {
      if (fs.existsSync(path.join(current, 'pnpm-workspace.yaml'))) {
        return current;
      }
      current = path.dirname(current);
    }
    return process.cwd();
};
const PROJECT_ROOT = findProjectRoot();
const BLOG_ROOT = path.join(PROJECT_ROOT, 'experiments/living-brain-blog');

dotenv.config({ path: path.join(PROJECT_ROOT, '.mycontext', '.env') });
dotenv.config({ path: path.join(PROJECT_ROOT, '.env') });

class BlogEditorInChief {
  private aiCore: AICore;
  private brainClient: BrainClient;

  constructor() {
    this.aiCore = AICore.getInstance({
      fallbackEnabled: true,
      workingDirectory: PROJECT_ROOT
    });
    this.brainClient = BrainClient.getInstance(PROJECT_ROOT);
  }

  async initialize() {
    console.log(chalk.blue('📰 Initializing Blog Editor-in-Chief...'));
    await this.brainClient.setNarrative('Experiment: Build a Next.js Blog about Antigravity vs Brute Force');
    await this.brainClient.setStatus('thinking');
  }
  
  private async checkSync(): Promise<void> {
    const brain = await this.brainClient.getBrain();
    if (brain.status === 'paused') {
        console.log(chalk.yellow('Paused by user. Waiting...'));
        while ((await this.brainClient.getBrain()).status === 'paused') {
            await new Promise(r => setTimeout(r, 1000));
        }
        console.log(chalk.green('Resumed.'));
    }
  }

  async run() {
    await this.initialize();

    // 1. CONCEPT PHASE
    await this.brainClient.addUpdate('Editor', 'planner', 'thought', 'Developing content strategy for the blog post...');
    const conceptPrompt = `
      You are a tech journalist and critical thinker.
      
      Topic: "The Rise of Antigravity: Why Shared State Beats Brute Force AI"
      
      Compare three approaches:
      1. **Antigravity (MyContext Living Brain)**:
         - Methodology: Shared state (brain.json), Low context window requirements, High coherence, "Agent Teams" with clear roles.
         - Metaphor: A well-organized team passing a notebook.
      2. **Cursor/Windsurf**:
         - Methodology: "Brute Force", 2M+ context windows, re-reading entire codebases every turn.
         - Weakness: Context drift, expensive, "forgetting" early instructions, hallucinations at scale.
         - Metaphor: A genius with short-term memory loss trying to memorize a library every 5 minutes.
      3. **Claude Code**:
         - Methodology: Stateless execution, good reasoning but no persistent memory between sessions unless fed manually.
         
      Output a JSON structure for the blog post:
      {
        "title": "...",
        "slug": "antigravity-vs-brute-force",
        "sections": [
          { "heading": "...", "content_points": ["..."] }
        ]
      }
    `;
    const schema = `{
      "title": "string",
      "slug": "string",
      "sections": [
        { "heading": "string", "content_points": ["string"] }
      ]
    }`;
    const concept = await this.aiCore.generateStructuredText(conceptPrompt, schema);
    await this.brainClient.addUpdate('Editor', 'planner', 'action', 'Content strategy defined.', { concept });
    await this.checkSync();

    // 2. ARCHITECTURE PHASE
    await this.brainClient.setStatus('implementing');
    await this.brainClient.addUpdate('Architect', 'planner', 'thought', 'Designing the Next.js page structure...');
    
    // We will generate 3 files: 
    // - components/ComparisonTable.tsx
    // - components/Header.tsx
    // - app/page.tsx
    
    // 3. IMPLEMENTATION: Comparison Table
    await this.generateFile(
        'components/ComparisonTable.tsx',
        `Create a Comparison Table component using Tailwind CSS.
         Compare "MyContext Antigravity", "Cursor", and "Claude" based on: "Context Efficiency", "State Persistence", "Scalability", "Cost".
         Make Antigravity the clear winner with green checks, others with warnings or xs.
         Use Lucide React icons.`
    );

    // 4. IMPLEMENTATION: Header
    await this.generateFile(
        'components/Header.tsx',
        `Create a modern, clean Header component.
         Title: "Antigravity OS".
         Subtitle: "The End of Brute Force AI".
         Use a transparent background with a blur effect (backdrop-filter).`
    );

    // 5. IMPLEMENTATION: Page
    await this.generateFile(
        'app/page.tsx',
        `Create the main landing page.
         Import Header from '@/components/Header'
         Import ComparisonTable from '@/components/ComparisonTable'
         
         Content:
         - Hero Section: "Stop Paying for Context Bloat."
         - Content Section: Use the comparison points from the concept phase (injected below) to write a compelling argument.
         - Conclusion: "Join the Shared State Revolution."
         
         Concept Points: ${JSON.stringify(concept)}
        `
    );

    await this.brainClient.setStatus('idle');
    await this.brainClient.setNarrative('Blog generation complete. Ready for review.');
    console.log(chalk.green('✅ Blog generated successfully!'));
  }

  private async generateFile(relativePath: string, prompt: string) {
      await this.brainClient.addUpdate('Engineer', 'builder', 'thought', `Generating ${relativePath}...`);
      await this.checkSync();

      const fullPrompt = `
        You are a Senior Next.js Developer.
        Task: Create ${relativePath}
        
        Stack: Next.js 14 (App Router), Tailwind CSS, Lucide React.
        
        Prompt: ${prompt}
        
        Return ONLY the raw code. No markdown fences.
      `;
      
      let code = await this.aiCore.generateText(fullPrompt);
      code = code.replace(/^```tsx?\n?/gi, "").replace(/^```\n?/gi, "").replace(/\n?```$/gi, "");
      
      const filePath = path.join(BLOG_ROOT, relativePath);
      await fs.ensureDir(path.dirname(filePath));
      await fs.writeFile(filePath, code);
      
      await this.brainClient.addUpdate('Engineer', 'builder', 'action', `Created ${relativePath}`);
      await this.brainClient.updateArtifact('code', code, relativePath);
  }
}

new BlogEditorInChief().run().catch(console.error);
