/**
 * Security Rules — Scans for leaked secrets and API keys
 */
import type { DoctorRule, Diagnostic } from "../types";

function diag(
  rule: DoctorRule,
  filePath: string,
  message: string,
  opts: { line?: number; help?: string } = {}
): Diagnostic {
  return {
    ruleId: rule.id,
    filePath,
    line: opts.line,
    severity: rule.severity,
    message,
    help: opts.help || rule.help,
    autoFixable: false,
  };
}

const secretLeakRule: DoctorRule = {
  id: "security/secret-leak",
  name: "No Hardcoded Secrets",
  category: "security",
  severity: "error",
  description: "Detects potential API keys and secrets hardcoded in the codebase",
  help: "Move the secret to a secure environment variable and rotate the compromised key immediately!",
  appliesTo: ["node", "nextjs", "turbo"],
  async check(ctx) {
    const diagnostics: Diagnostic[] = [];
    
    const patterns = [
      { name: "Gemini API Key", regex: /AIzaSy[a-zA-Z0-9_-]{33}/g },
      { name: "OpenAI API Key", regex: /sk-[a-zA-Z0-9]{20,}/g },
      { name: "GitHub Token", regex: /ghp_[a-zA-Z0-9]{36,}/g },
      { name: "Anthropic API Key", regex: /sk-ant-[a-zA-Z0-9-]{60,}/g },
      { name: "X.AI API Key", regex: /xai-[a-zA-Z0-9]{40,}/g },
      { name: "Private Key", regex: /-----BEGIN (RSA|EC|OPENSSH)? PRIVATE KEY-----/g },
      { name: "InstantDB Admin Token", regex: /instant-admin-[a-zA-Z0-9-]{32,}/g }
    ];

    // Scan relevant files
    const files = await ctx.findFiles(/\.(ts|tsx|js|jsx|json|md|env|example|yml|yaml|txt)$/);
    
    for (const filePath of files) {
      if (filePath.includes("node_modules") || filePath.includes("dist")) continue;
      
      const content = await ctx.readFile(filePath);
      if (!content) continue;

      const lines = content.split("\n");
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line === undefined) continue;
        
        // Skip common false positives in .env.example
        if (filePath.endsWith(".env.example") && (line.includes("YOUR_") || line.includes("REPLACE_") || line.includes("<YOUR_"))) {
          continue;
        }

        for (const pattern of patterns) {
          pattern.regex.lastIndex = 0;
          if (pattern.regex.test(line)) {
            diagnostics.push(diag(this, filePath, `Potential ${pattern.name} detected`, {
              line: i + 1,
              help: `Move secrets to .env and ensure they are NOT committed to Git. If this leaked, ROTATE IT IMMEDIATELY.`
            }));
          }
        }
      }
    }

    return diagnostics;
  }
};

export const securityRules: DoctorRule[] = [secretLeakRule];
