# Research Report: Secret Leak Detection for `mycontext doctor`

## Executive Summary
This report proposes adding a new set of rules to the `mycontext doctor` command to detect hardcoded secrets and API keys in the codebase. This is motivated by a real-world incident during a recent session where a **Gemini API Key** and **InstantDB Admin Token** were committed to Git history in `.env.example`.

## 🚨 Motivation: The ".env.example" Incident
During a recent development session for the `gemini-live-marketing-agent` project, it was discovered that commit `b45bc7f` contained actual production-grade API keys instead of placeholders in the `.env.example` file. 

Current project health checks in `mycontext` focuses on:
- Dead code / Unused exports
- Dependency conflicts (e.g., Zod)
- Next.js / Firebase configuration
- Gitignore completeness

However, it lacks **Secret Scanning**, which is a critical part of pre-push and pre-deployment health.

## Proposed Implementation

### 1. New Rule Category: `security`
A new file `src/doctor/rules/security-rules.ts` should be created to house these checks.

### 2. High-Priority Patterns
We should implement regex-based scanning for the following common patterns:

| Service | Pattern |
|---------|---------|
| **Google Gemini** | `AIzaSy[a-zA-Z0-9_-]{33}` |
| **OpenAI** | `sk-[a-zA-Z0-9]{20,}` |
| **GitHub Tokens** | `ghp_[a-zA-Z0-9]{36,}` |
| **Anthropic** | `sk-ant-[a-zA-Z0-9-]{60,}` |
| **X.AI** | `xai-[a-zA-Z0-9]{40,}` |
| **Generic Private Keys** | `-----BEGIN (RSA|EC|OPENSSH)? PRIVATE KEY-----` |

### 3. Proposed Doctor Rule Structure

```typescript
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
      { name: "Private Key", regex: /-----BEGIN .* PRIVATE KEY-----/g }
    ];

    // Implementation would scan all files in the project, 
    // excluding suspected binaries and node_modules.
    // ...
    
    return diagnostics;
  }
};
```

## Recommended Fix Actions
When a leak is detected, `mycontext doctor` should:
1. **Block the build**: The severity should be `error`.
2. **Warn about Git history**: Remind the developer that simply deleting the file is not enough; the commit history must be rewritten if the key was already pushed.
3. **Rotation Advice**: Provide links to the respective provider's key management pages.

## Next Steps
1. Create `security-rules.ts`.
2. Integrate into the main `DoctorEngine`.
3. Add a diagnostic check to `mycontext doctor --fix` that can help automate the removal process (while warning about history).

---
*Drafted by Antigravity AI*
