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
    // MyContext-specific environment variables for user-centric workflow
    const envVars = new Set<string>();

    // Basic Next.js setup (only if needed)
    envVars.add("NODE_ENV=development");
    envVars.add("NEXT_PUBLIC_APP_URL=http://localhost:3000");

    // MyContext AI Provider Configuration (User-Centric Workflow)
    // Qwen3 Coder (FREE - Recommended starting point)
    envVars.add("MYCONTEXT_QWEN_API_KEY=sk-or-your_qwen_key_here");

    // Optional: GitHub Models (requires GitHub account)
    envVars.add("MYCONTEXT_GITHUB_TOKEN=ghp_your_github_token_here");

    // Optional: X.AI Grok (premium)
    envVars.add("MYCONTEXT_XAI_API_KEY=xai-your_xai_key_here");

    // Optional: Claude (premium)
    envVars.add("MYCONTEXT_CLAUDE_API_KEY=sk-ant-your_claude_key_here");

    // Optional: OpenAI (premium)
    envVars.add("MYCONTEXT_OPENAI_API_KEY=sk-your_openai_key_here");

    // Optional: Gemini (premium)
    envVars.add("MYCONTEXT_GEMINI_API_KEY=your_gemini_key_here");

    // Provider selection (Qwen is recommended default)
    envVars.add("MYCONTEXT_PROVIDER=qwen");
    envVars.add("MYCONTEXT_MODEL=qwen3-coder");

    // Generation settings
    envVars.add("MYCONTEXT_TIMEOUT=60000");
    envVars.add("MYCONTEXT_MAX_RETRIES=3");
    envVars.add("MYCONTEXT_TEMPERATURE=0.2");
    envVars.add("MYCONTEXT_MAX_TOKENS=4000");

    // Check for database dependencies and add relevant env vars
    const dependencies = packageJson
      ? { ...packageJson.dependencies, ...packageJson.devDependencies }
      : {};

    if (dependencies["@supabase/supabase-js"] || dependencies["supabase"]) {
      envVars.add("NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url");
      envVars.add("NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key");
    }

    if (dependencies["instantdb"]) {
      envVars.add("INSTANTDB_APP_ID=your_instantdb_app_id");
    }

    if (dependencies["next-auth"]) {
      envVars.add("NEXTAUTH_URL=http://localhost:3000");
      envVars.add("NEXTAUTH_SECRET=your_nextauth_secret_here");
    }

    return `# MyContext Environment Variables

This file contains environment variables for your MyContext project.
Copy this file to \`.env\` in your .mycontext directory and update with your actual credentials.

## 🚀 Quick Start Guide

### Step 1: Choose Your AI Provider

**🎯 RECOMMENDED: Qwen3 Coder (100% FREE)**
- Go to: https://openrouter.ai/keys
- Create account (free)
- Get API key from dashboard
- Copy key to: MYCONTEXT_QWEN_API_KEY

**🔑 Alternative: GitHub Models (Free with GitHub Account)**
- Go to: https://github.com/settings/tokens
- Create token with 'models:read' scope
- Copy token to: MYCONTEXT_GITHUB_TOKEN

### Step 2: Configure Your Environment

Copy this file to \`.mycontext/.env\`:
\`\`\`bash
cp .env.example .mycontext/.env
\`\`\`

### Step 3: Update with Your Keys

Edit \`.mycontext/.env\` and replace placeholder values:
- Replace \`sk-or-your_qwen_key_here\` with your actual Qwen API key
- Or replace \`ghp_your_github_token_here\` with your GitHub token

### Step 4: Test Your Setup

\`\`\`bash
mycontext status
\`\`\`

## Environment Variables

${Array.from(envVars).join("\n")}

## 🔧 AI Provider Configuration

### 🎯 Primary Setup (Choose One)

#### Option 1: Qwen3 Coder (FREE - Recommended)
\`\`\`bash
MYCONTEXT_PROVIDER=qwen
MYCONTEXT_QWEN_API_KEY=sk-or-your_actual_key_here
MYCONTEXT_MODEL=qwen3-coder
\`\`\`

#### Option 2: GitHub Models (FREE with GitHub Account)
\`\`\`bash
MYCONTEXT_PROVIDER=github
MYCONTEXT_GITHUB_TOKEN=ghp_your_actual_github_token_here
MYCONTEXT_MODEL=grok-3
\`\`\`

#### Option 3: X.AI Grok (Premium)
\`\`\`bash
MYCONTEXT_PROVIDER=xai
MYCONTEXT_XAI_API_KEY=xai-your_actual_key_here
MYCONTEXT_MODEL=grok-4-fast-reasoning
\`\`\`

#### Option 4: Claude (Premium)
\`\`\`bash
MYCONTEXT_PROVIDER=claude
MYCONTEXT_CLAUDE_API_KEY=sk-ant-your_actual_key_here
MYCONTEXT_MODEL=claude-3-5-sonnet-20241022
\`\`\`

#### Option 5: OpenAI (Premium)
\`\`\`bash
MYCONTEXT_PROVIDER=openai
MYCONTEXT_OPENAI_API_KEY=sk-your_actual_key_here
MYCONTEXT_MODEL=gpt-4-turbo
\`\`\`

## 📋 MyContext Workflow Steps

After setting up your environment:

1. **Review PRD** (Required):
   \`\`\`bash
   # Open .mycontext/01-prd.md and update with your requirements
   \`\`\`

2. **Generate Context Files**:
   \`\`\`bash
   mycontext generate-context-files
   \`\`\`

3. **Compile PRD**:
   \`\`\`bash
   mycontext compile-prd
   \`\`\`

4. **Generate Components**:
   \`\`\`bash
   mycontext generate-components all --with-tests
   \`\`\`

5. **Preview Your App**:
   \`\`\`bash
   npm run dev
   # Visit http://localhost:3000/preview
   \`\`\`

## 🔒 Security Notes

- Never commit actual API keys to version control
- Add \`.env\` to your \`.gitignore\` file
- Rotate API keys regularly
- Use different keys for development and production
- Monitor your API usage for unusual activity

## 🛠️ Troubleshooting

**"Invalid API key" error?**
- Double-check your API key is correct
- Ensure it has the right permissions
- Try a different provider

**"Rate limit exceeded" error?**
- Qwen and GitHub have generous free tiers
- Consider upgrading to paid plans for higher limits
- Wait and try again later

**Need help?**
- Check: mycontext status
- Review: .mycontext directory for generated files
- Test: mycontext model --test
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
