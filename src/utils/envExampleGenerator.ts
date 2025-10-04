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
    // Claude (Recommended starting point)
    envVars.add("MYCONTEXT_CLAUDE_API_KEY=");

    // Optional: OpenRouter (FREE alternative)
    envVars.add("MYCONTEXT_OPENROUTER_API_KEY=");

    // Optional: GitHub Models (requires GitHub account)
    envVars.add("MYCONTEXT_GITHUB_TOKEN=");

    // Optional: X.AI Grok
    envVars.add("MYCONTEXT_XAI_API_KEY=");

    // Optional: OpenAI
    envVars.add("MYCONTEXT_OPENAI_API_KEY=");

    // Optional: Gemini
    envVars.add("MYCONTEXT_GEMINI_API_KEY=");

    // Optional: Groq
    envVars.add("MYCONTEXT_GROQ_API_KEY=");

    // Optional: Cerebras
    envVars.add("MYCONTEXT_CEREBRAS_API_KEY=");

    // Optional: Fireworks
    envVars.add("MYCONTEXT_FIREWORKS_API_KEY=");

    // Optional: Together
    envVars.add("MYCONTEXT_TOGETHER_API_KEY=");

    // Optional: Deepseek
    envVars.add("MYCONTEXT_DEEPSEEK_API_KEY=");

    // Provider selection (Claude is recommended default)
    envVars.add("MYCONTEXT_PROVIDER=claude");
    envVars.add("MYCONTEXT_MODEL=claude-3-5-sonnet-20241022");

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

**🎯 RECOMMENDED: Claude**
- Go to: https://console.anthropic.com/
- Create account
- Get API key from dashboard
- Copy key to: MYCONTEXT_CLAUDE_API_KEY

**🔑 Alternative: OpenRouter (100% FREE)**
- Go to: https://openrouter.ai/keys
- Create account (free)
- Get API key from dashboard
- Copy key to: MYCONTEXT_OPENROUTER_API_KEY

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

Edit \`.mycontext/.env\` and replace placeholder values with your actual API keys.

### Step 4: Test Your Setup

\`\`\`bash
mycontext status
\`\`\`

## Environment Variables

${Array.from(envVars).join("\n")}

## 🔧 AI Provider Configuration

### 🎯 Primary Setup (Choose One)

#### Option 1: Claude (Recommended)
\`\`\`bash
MYCONTEXT_PROVIDER=claude
MYCONTEXT_CLAUDE_API_KEY=
MYCONTEXT_MODEL=claude-3-5-sonnet-20241022
\`\`\`

#### Option 2: OpenRouter (FREE)
\`\`\`bash
MYCONTEXT_PROVIDER=openrouter
MYCONTEXT_OPENROUTER_API_KEY=
MYCONTEXT_MODEL=qwen/qwen-2.5-coder-32b-instruct
\`\`\`

#### Option 3: GitHub Models (FREE with GitHub Account)
\`\`\`bash
MYCONTEXT_PROVIDER=github
MYCONTEXT_GITHUB_TOKEN=
MYCONTEXT_MODEL=gpt-4o
\`\`\`

#### Option 4: X.AI Grok
\`\`\`bash
MYCONTEXT_PROVIDER=xai
MYCONTEXT_XAI_API_KEY=
MYCONTEXT_MODEL=grok-beta
\`\`\`

#### Option 5: OpenAI
\`\`\`bash
MYCONTEXT_PROVIDER=openai
MYCONTEXT_OPENAI_API_KEY=
MYCONTEXT_MODEL=gpt-4o
\`\`\`

#### Option 6: Gemini
\`\`\`bash
MYCONTEXT_PROVIDER=gemini
MYCONTEXT_GEMINI_API_KEY=
MYCONTEXT_MODEL=gemini-2.0-flash-exp
\`\`\`

#### Option 7: Groq
\`\`\`bash
MYCONTEXT_PROVIDER=groq
MYCONTEXT_GROQ_API_KEY=
MYCONTEXT_MODEL=llama-3.3-70b-versatile
\`\`\`

#### Option 8: Cerebras
\`\`\`bash
MYCONTEXT_PROVIDER=cerebras
MYCONTEXT_CEREBRAS_API_KEY=
MYCONTEXT_MODEL=llama3.1-70b
\`\`\`

#### Option 9: Fireworks
\`\`\`bash
MYCONTEXT_PROVIDER=fireworks
MYCONTEXT_FIREWORKS_API_KEY=
MYCONTEXT_MODEL=accounts/fireworks/models/llama-v3p3-70b-instruct
\`\`\`

#### Option 10: Together
\`\`\`bash
MYCONTEXT_PROVIDER=together
MYCONTEXT_TOGETHER_API_KEY=
MYCONTEXT_MODEL=meta-llama/Llama-3.3-70B-Instruct-Turbo
\`\`\`

#### Option 11: Deepseek
\`\`\`bash
MYCONTEXT_PROVIDER=deepseek
MYCONTEXT_DEEPSEEK_API_KEY=
MYCONTEXT_MODEL=deepseek-chat
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
- OpenRouter and GitHub have generous free tiers
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
