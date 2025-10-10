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

    // MyContext AI Provider Chain (Primary → Fallback 1 → Fallback 2)
    envVars.add("# MyContext AI (Coming Soon - Primary Provider)");
    envVars.add("MYCONTEXT_API_KEY=");
    envVars.add("");

    envVars.add("# Claude SDK (Fallback 1)");
    envVars.add("ANTHROPIC_API_KEY=");
    envVars.add("");

    envVars.add("# XAI/Grok (Fallback 2)");
    envVars.add("XAI_API_KEY=");
    envVars.add("");

    // Add OpenRouter
    envVars.add("# OpenRouter (Fallback 3 - Free Tier for Testing)");
    envVars.add("MYCONTEXT_OPENROUTER_API_KEY=");
    envVars.add("");

    // Generation settings
    envVars.add("# Optional: Generation Settings");
    envVars.add("MYCONTEXT_TEMPERATURE=0.1");
    envVars.add("MYCONTEXT_MAX_TOKENS=4000");

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

## 🚀 Quick Setup

### Option 1: Use MyContext AI (Coming Soon - Recommended)
\`\`\`bash
MYCONTEXT_API_KEY=mctx-xxx
\`\`\`

### Option 2: Bring Your Own Keys (Free)
\`\`\`bash
ANTHROPIC_API_KEY=sk-ant-xxx      # Claude (primary)
XAI_API_KEY=xai-xxx                # Grok (fallback 1)
MYCONTEXT_OPENROUTER_API_KEY=sk-or-xxx  # OpenRouter free tier (fallback 2)
\`\`\`

## Provider Chain
MyContext AI → Claude SDK → XAI → OpenRouter (automatic fallback)

## Get API Keys

- **Claude**: https://console.anthropic.com/
- **XAI**: https://console.x.ai/
- **OpenRouter**: https://openrouter.ai/keys (free tier available)
- **MyContext AI**: Coming soon at api.mycontext.dev

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
