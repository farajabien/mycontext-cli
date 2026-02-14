
import * as fs from 'fs-extra';
import * as path from 'path';
import { AICore } from '../core/ai/AICore';
import chalk from 'chalk';

export class FileGenerator {
  private aiCore: AICore;
  private projectRoot: string;

  constructor(aiCore: AICore, projectRoot: string = process.cwd()) {
    this.aiCore = aiCore;
    this.projectRoot = projectRoot;
  }

  async generateFile(relativePath: string, prompt: string, context?: string): Promise<string> {
    const filePath = path.join(this.projectRoot, relativePath);
    const exists = await fs.pathExists(filePath);
    let fullPrompt = prompt;

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
