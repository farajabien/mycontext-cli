
import * as fs from 'fs-extra';
import * as path from 'path';
import { AICore } from '../../apps/cli/src/core/ai/AICore';
import { BrainClient } from '../../apps/cli/src/core/brain/BrainClient';
import { FileGenerator } from '../../apps/cli/src/utils/FileGenerator';
import { DependencySentinel } from '../../apps/cli/src/core/agents/DependencySentinel';
import chalk from 'chalk';
import * as dotenv from 'dotenv';
import { execSync } from 'child_process';

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

class MissionOrchestrator {
  private aiCore: AICore;
  private brainClient: BrainClient;

  constructor() {
    this.aiCore = AICore.getInstance({
      fallbackEnabled: true,
      workingDirectory: PROJECT_ROOT
    });
    this.brainClient = BrainClient.getInstance(PROJECT_ROOT);
  }

  async run() {
    console.log(chalk.blue('🚀 Starting Mission: Dark Mode...'));
    await this.brainClient.setNarrative('Mission: Implement Dark Mode in the Living Blog to verify Brain/Context unification.');
    await this.brainClient.setStatus('thinking');

    // 1. Install Dependencies (Self-Healing)
    await this.brainClient.addUpdate('Engineer', 'builder', 'thought', 'Installing dependencies safely...');
    const sentinel = new DependencySentinel(BLOG_ROOT);
    const installSuccess = await sentinel.guard('pnpm install next-themes lucide-react');
    
    if (installSuccess) {
        await this.brainClient.addUpdate('Engineer', 'builder', 'action', 'Dependencies installed/verified.');
    } else {
        await this.brainClient.addUpdate('Engineer', 'builder', 'error', 'Dependency installation failed even after self-healing.');
        process.exit(1);
    }

    // 2. CREATE THEME PROVIDER
    await this.generateFile(
        'components/theme-provider.tsx',
        `Create a ThemeProvider component using next-themes.
         It should wrap children with 'NextThemesProvider'.
         Props: attribute="class", defaultTheme="system", enableSystem.`
    );

    // 3. CREATE MODE TOGGLE
    await this.generateFile(
        'components/ModeToggle.tsx',
        `Create a ModeToggle component using standard Tailwind/ShadCN styles (but without dependencies if possible, or use standard HTML buttons if ShadCN dropdown is too complex to scaffold blindly).
         Better: A simple button that cycles themes (Light/Dark/System) using useTheme from next-themes.
         Use Lucide icons (Sun, Moon).`
    );

    // 4. UPDATE LAYOUT
    await this.brainClient.addUpdate('Engineer', 'builder', 'thought', 'Updating Layout to include ThemeProvider...');
    // We'll just overwrite layout.tsx for simplicity in this experiment
    const layoutPath = path.join(BLOG_ROOT, 'app/layout.tsx');
    if (fs.existsSync(layoutPath)) {
        let content = fs.readFileSync(layoutPath, 'utf8');
        // Simple injection logic (heuristic)
        if (!content.includes('ThemeProvider')) {
             content = `import { ThemeProvider } from "@/components/theme-provider"\n` + content;
             content = content.replace('children,', 'children, }: Readonly<{ children: React.ReactNode }>) {'); // Fix types if needed or just be loose
             content = content.replace('<body', '<body'); 
             content = content.replace('</body>', '</ThemeProvider></body>');
             content = content.replace('className={inter.className}>', 'className={inter.className}><ThemeProvider attribute="class" defaultTheme="system" enableSystem>');
        }
        // Actually, let's just generate a fresh one to be safe and clean
         await this.generateFile(
            'app/layout.tsx',
            `Create the root layout for Next.js 14.
             Import Inter font.
             Import "./globals.css".
             Import { ThemeProvider } from "@/components/theme-provider".
             Wrap the body content in ThemeProvider.
             Export metadata.`
        );
    }

    // 5. UPDATE HEADER
    await this.generateFile(
        'components/Header.tsx',
        `Update the Header component.
         Import ModeToggle from '@/components/ModeToggle'.
         Place ModeToggle on the far right of the nav bar.
         Keep existing Title "Antigravity OS".`
    );

    await this.brainClient.setStatus('idle');
    await this.brainClient.setNarrative('Mission Complete: Dark Mode Installed.');
    console.log(chalk.green('✅ Mission Complete!'));
  }

  private async generateFile(relativePath: string, prompt: string) {
      await this.brainClient.addUpdate('Engineer', 'builder', 'thought', `Generating ${relativePath}...`);
      
      const generator = new FileGenerator(this.aiCore, BLOG_ROOT);
      const code = await generator.generateFile(relativePath, prompt);
      
      await this.brainClient.addUpdate('Engineer', 'builder', 'action', `Created/Updated ${relativePath}`);
      await this.brainClient.updateArtifact('code', code, relativePath);
  }
}

new MissionOrchestrator().run().catch(console.error);
