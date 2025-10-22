import * as fs from "fs-extra";
import path from "path";

export interface ProjectDependencies {
  [key: string]: string;
}

export interface PackageJson {
  dependencies?: ProjectDependencies;
  devDependencies?: ProjectDependencies;
}

export class EnvExampleGenerator {
  /**
   * Generate user-centric environment example focused on MyContext workflow
   */
  static generateEnvExample(packageJson?: PackageJson): string {
    const envVars = new Set<string>();

    // MyContext AI Provider Chain
    envVars.add("# Choose ONE of these providers:");
    envVars.add("");
    envVars.add("# Option 1: OpenRouter (Recommended - Free Tier Available)");
    envVars.add("MYCONTEXT_OPENROUTER_API_KEY=");
    envVars.add("");
    envVars.add("# Option 2: Claude (Best Quality)");
    envVars.add("# ANTHROPIC_API_KEY=sk-ant-xxx");
    envVars.add("");
    envVars.add("# Option 3: XAI/Grok");
    envVars.add("# XAI_API_KEY=xai-xxx");
    envVars.add("");

    // Check for database dependencies
    const dependencies = packageJson
      ? { ...packageJson.dependencies, ...packageJson.devDependencies }
      : {};

    if (dependencies["@instantdb/react"]) {
      envVars.add("");
      envVars.add("# InstantDB");
      envVars.add("NEXT_PUBLIC_INSTANT_APP_ID=");
    }

    return `# MyContext Environment Variables

## 🚀 Quick Start

**You need ONE API key to get started.** Choose your preferred provider:

### Option 1: OpenRouter (Recommended)
- **Free tier available** with generous limits
- Uses DeepSeek R1 (powerful reasoning model)
- Get free key: https://openrouter.ai/keys

\`\`\`bash
MYCONTEXT_OPENROUTER_API_KEY=sk-or-xxx
\`\`\`

### Option 2: Claude (Best Quality)
- Highest quality results
- Paid but worth it for production
- Get key: https://console.anthropic.com/

\`\`\`bash
ANTHROPIC_API_KEY=sk-ant-xxx
\`\`\`

### Option 3: XAI/Grok
- Alternative provider
- Get key: https://console.x.ai/

\`\`\`bash
XAI_API_KEY=xai-xxx
\`\`\`

## Provider Chain (Automatic Fallback)
Claude → XAI → OpenRouter (whichever keys you provide)

## Get API Keys

- **OpenRouter**: https://openrouter.ai/keys (FREE tier)
- **Claude**: https://console.anthropic.com/ (paid)
- **XAI**: https://console.x.ai/ (paid)

## Environment Variables

${Array.from(envVars).join("\n")}

## 🔒 Security

- Never commit \`.env\` to version control
- Add \`.env\` to \`.gitignore\`
- Rotate API keys regularly

## 📚 More Info

See full documentation: https://github.com/farajabien/mycontext-cli/tree/main/docs
`;
  }

  /**
   * Generate environment example for a specific project path
   */
  static async generateForProject(projectPath: string): Promise<string> {
    try {
      const packageJsonPath = path.join(projectPath, "package.json");
      if (await fs.pathExists(packageJsonPath)) {
        const packageJson = await fs.readJson(packageJsonPath);
        return this.generateEnvExample(packageJson);
      }
    } catch (error) {
      // If we can't read package.json, generate basic example
    }

    // Fallback to basic example
    return this.generateEnvExample();
  }
}
