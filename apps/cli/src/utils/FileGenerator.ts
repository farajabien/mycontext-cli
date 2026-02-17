
import * as fs from 'fs-extra';
import * as path from 'path';
import { AICore } from '../core/ai/AICore';
import { BrainClient } from '../core/brain/BrainClient';
import chalk from 'chalk';

export class FileGenerator {
  private aiCore: AICore;
  private projectRoot: string;
  private brainClient: BrainClient;

  constructor(aiCore: AICore, projectRoot: string = process.cwd()) {
    this.aiCore = aiCore;
    this.projectRoot = projectRoot;
    // Walk up to find workspace root (directory containing .mycontext/)
    this.brainClient = BrainClient.getInstance(this.findWorkspaceRoot(projectRoot)); 
  }

  /**
   * Walk up directory tree to find the workspace root (contains .mycontext/)
   */
  private findWorkspaceRoot(startDir: string): string {
    let dir = startDir;
    for (let i = 0; i < 10; i++) { // max 10 levels up
      if (fs.existsSync(path.join(dir, '.mycontext'))) {
        return dir;
      }
      const parent = path.dirname(dir);
      if (parent === dir) break; // reached filesystem root
      dir = parent;
    }
    return startDir; // fallback to project root
  }

  async generateFile(relativePath: string, prompt: string, context?: string): Promise<string> {
    const filePath = path.join(this.projectRoot, relativePath);
    const exists = await fs.pathExists(filePath);
    let fullPrompt = prompt;

    // Phase 11: Lego Assembly - Search Registry
    const registry = await this.brainClient.getRegistry();
    
    const relevantPieces = registry.components.filter(c => {
        const nameMatch = prompt.toLowerCase().includes(c.name.toLowerCase());
        const descMatch = c.description.toLowerCase().split(' ').some(word => word.length > 3 && prompt.toLowerCase().includes(word.toLowerCase()));
        return nameMatch || descMatch;
    });

    if (relevantPieces.length > 0) {
        console.log(chalk.cyan(`🧩 Lego Pieces Found: ${relevantPieces.map(p => p.name).join(', ')}`));
        let piecesContext = "\n\nRELEVANT LEGO PIECES (Reuse patterns/styles from these):\n";
        for (const piece of relevantPieces) {
            try {
                // Find full path to piece (registry stores relative or absolute, we need to be careful)
                // Assuming registry.path is relative to workspace root or project root.
                // For now, let's try to read it.
                const pieceContent = await fs.readFile(path.join(this.projectRoot, piece.path), 'utf-8');
                piecesContext += `File: ${piece.path}\nContent:\n\`\`\`tsx\n${pieceContent}\n\`\`\`\n`;
            } catch (e) {
                // Ignore if file missing
            }
        }
        fullPrompt += piecesContext;
    }

    if (exists) {
      const existingContent = await fs.readFile(filePath, 'utf-8');
      console.log(chalk.yellow(`📝 Updating existing file: ${relativePath}`));
      fullPrompt = `
        TASK: Update the following file based on the instructions.
        
        EXISTING CONTENT:
        \`\`\`tsx
        ${existingContent}
        \`\`\`
        
        INSTRUCTIONS:
        ${prompt}
        
        ${relevantPieces.length > 0 ? 'REUSE PATTERNS FROM LEGO PIECES ABOVE.' : ''}
        
        IMPORTANT: Return the FULL updated file content. Do not return a diff.
      `;
    } else {
      console.log(chalk.green(`✨ Creating new file: ${relativePath}`));
    }

    if (context) {
        fullPrompt += `\n\nADDITIONAL CONTEXT:\n${context}`;
    }

    fullPrompt += `\n\nReturn ONLY the raw code. No markdown fences.`;

    let code = await this.aiCore.generateText(fullPrompt);
    
    // Clean up
    code = code.replace(/^```[a-z]*\n?/gmi, "").replace(/^```\n?/gmi, "").replace(/\n?```$/gmi, "").trim();

    // Client Component Guard
    if (this.needsUseClient(code) && !code.includes('"use client"') && !code.includes("'use client'")) {
        console.log(chalk.magenta(`🛡️  Auto-injecting "use client" directive`));
        code = `"use client";\n\n` + code;
    }

    await fs.ensureDir(path.dirname(filePath));
    await fs.writeFile(filePath, code);

    // Phase 11: Auto-Register in Living DB
    const fileName = path.basename(relativePath);
    await this.brainClient.registerComponent(
        fileName,
        `Generated component for: ${prompt.substring(0, 100)}...`,
        relativePath
    );
    
    return code;
  }

  private needsUseClient(code: string): boolean {
    const hooks = [
        'useState', 'useEffect', 'useContext', 'useReducer', 'useCallback', 
        'useMemo', 'useRef', 'useLayoutEffect', 'useImperativeHandle', 
        'useDebugValue', 'useDeferredValue', 'useTransition', 'useId', 
        'useSyncExternalStore', 'useInsertionEffect',
        'createContext'
    ];
    const routerHooks = [
        'useRouter', 'usePathname', 'useSearchParams', 
        'useSelectedLayoutSegment', 'useSelectedLayoutSegments', 'useParams'
    ];
    
    // Regex to match usage like: useTheme(), useState(null), etc. to avoid matching string literals
    const hookRegex = new RegExp(`\\b(${[...hooks, ...routerHooks].join('|')})\\b`);
    return hookRegex.test(code);
  }
}
