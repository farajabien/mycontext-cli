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

    // MyContext AI Provider Configuration (Simplified)
    // Claude Agent SDK handles Claude, Bedrock, and Vertex AI automatically
    envVars.add("ANTHROPIC_API_KEY=");

    // Optional: Amazon Bedrock (via Claude SDK)
    envVars.add("CLAUDE_CODE_USE_BEDROCK=0");
    envVars.add("AWS_ACCESS_KEY_ID=");
    envVars.add("AWS_SECRET_ACCESS_KEY=");
    envVars.add("AWS_REGION=us-east-1");

    // Optional: Google Vertex AI (via Claude SDK)
    envVars.add("CLAUDE_CODE_USE_VERTEX=0");
    envVars.add("GOOGLE_APPLICATION_CREDENTIALS=");

    // Optional: Grok 4 (direct X AI API - not supported by Claude SDK)
    envVars.add("MYCONTEXT_XAI_API_KEY=");

    // Provider selection (Claude SDK handles most providers automatically)
    envVars.add("MYCONTEXT_PROVIDER=claude-agent");
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

**🎯 RECOMMENDED: Claude Agent SDK (Handles Everything Automatically)**
- Go to: https://console.anthropic.com/
- Create account
- Get API key from dashboard
- Copy key to: ANTHROPIC_API_KEY
- The SDK automatically handles Claude, Bedrock, and Vertex AI

**☁️ Alternative: Amazon Bedrock (via Claude SDK)**
- Set: CLAUDE_CODE_USE_BEDROCK=1
- Configure AWS credentials
- The SDK automatically routes through Bedrock

**☁️ Alternative: Google Vertex AI (via Claude SDK)**
- Set: CLAUDE_CODE_USE_VERTEX=1
- Configure Google Cloud credentials
- The SDK automatically routes through Vertex AI

**🤖 Alternative: Grok 4 (Direct X AI API)**
- Go to: https://console.x.ai/
- Create account and subscribe to SuperGrok
- Get API key from dashboard
- Copy key to: MYCONTEXT_XAI_API_KEY
- Set: MYCONTEXT_PROVIDER=xai
- Set: MYCONTEXT_MODEL=grok-beta
- ✅ **WORKING**: Direct integration with X AI API

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

### 🎯 Primary Setup (Claude Agent SDK Routes All)

#### Option 1: Direct Claude API (Recommended)
\`\`\`bash
MYCONTEXT_PROVIDER=claude-agent
ANTHROPIC_API_KEY=your_anthropic_api_key
MYCONTEXT_MODEL=claude-3-5-sonnet-20241022
\`\`\`

#### Option 2: Amazon Bedrock (via Claude SDK)
\`\`\`bash
MYCONTEXT_PROVIDER=claude-agent
CLAUDE_CODE_USE_BEDROCK=1
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=us-east-1
MYCONTEXT_MODEL=claude-3-5-sonnet-20241022
\`\`\`

#### Option 3: Google Vertex AI (via Claude SDK)
\`\`\`bash
MYCONTEXT_PROVIDER=claude-agent
CLAUDE_CODE_USE_VERTEX=1
GOOGLE_APPLICATION_CREDENTIALS=path/to/service-account.json
MYCONTEXT_MODEL=claude-3-5-sonnet-20241022
\`\`\`

#### Option 4: Grok 4 (Direct X AI API) ✅ WORKING
\`\`\`bash
MYCONTEXT_PROVIDER=xai
MYCONTEXT_XAI_API_KEY=your_xai_api_key
MYCONTEXT_MODEL=grok-beta
\`\`\`

**✅ Tested and Working**: Grok 4 integration is fully functional!

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
- Double-check your ANTHROPIC_API_KEY is correct
- Ensure it has the right permissions
- For Bedrock: verify AWS credentials
- For Vertex AI: verify Google Cloud credentials

**"Rate limit exceeded" error?**
- Claude Agent SDK handles rate limiting automatically
- Grok 4 has its own rate limits - check X AI console
- Consider upgrading to higher tier plans
- Wait and try again later

**"No AI providers available" error?**
- Check your API key is correctly set in .mycontext/.env
- Verify the provider name matches your configuration
- For Grok 4: ensure MYCONTEXT_PROVIDER=xai
- Run: mycontext status to verify setup

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
