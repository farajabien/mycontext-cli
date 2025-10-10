# Component Refinement + Regression System

## Overview

This document outlines the complete vision for a production-ready component refinement and regression testing system for MyContext CLI. The system implements automatic refinement tracking, comprehensive regression testing, and a diffusion-inspired iterative improvement algorithm.

## Goals

Automatically refine an existing component (and refinements-of-refinements), track every mutation, and run regression (unit + visual + accessibility + type) so improvements are safe, auditable, and reversible.

## 1. Data Model

Store the full provenance so you can replay, diff and audit.

```typescript
interface ComponentMutation {
  submissionId: string;
  componentPath: string;
  componentSource: string;
  refinement: {
    requestId: string;
    description: string;
    constraints: { 
      "no-new-deps": boolean; 
      "keep-prop-names": string[] 
    };
    priority: "high" | "medium" | "low";
    tags: string[];
  };
  history: Array<{
    refinementId: string;
    actor: "human" | "ai" | "system";
    timestamp: string;
    notes: string;
  }>;
  tests: {
    unit: string[];
    accessibility: string[];
    visual: string[];
  };
  status: "proposed" | "applied" | "rejected";
}
```

## 2. Submission + Storage Rules

- Always store the entire original file and the entire refined file (or a patch) — never rely solely on diffs for provenance.
- Save a JSON mutation record containing before, after, diff, actor, chainOfThought, confidence, testsRequested.
- Prefer append-only mutation log; mark each mutation with proposed → applied/rejected and store appliedAt.

## 3. How the Refinement Loop Works (End-to-End)

1. **User / system submits**: original component + refinement instructions (human clarifies design/context).
2. **LLM runs the refinement prompt** and returns:
   - a) patch (git unified diff or full updated file),
   - b) explanation & chain_of_thought,
   - c) tests_added_or_changed (unit tests, storybook/visual snapshot changes),
   - d) confidence and risk flags.
3. **Server stores the proposal** in mutations collection, triggers webhooks and runs automated policy checks (size change, banned APIs, new deps).
4. **CI/test harness runs**:
   - Typecheck (tsc),
   - Lint (ESLint, Prettier),
   - Unit tests (vitest / jest),
   - Accessibility checks (axe, @axe-core/react),
   - Visual regression (Storybook + Chromatic / Percy / Playwright snapshot),
   - Bundle/perf checks (optional).
5. **Scoring**: the harness produces a pass/fail and a numeric score (weighted).
6. **Decision**:
   - If autonomy=true and score >= threshold → apply patch, record applied.
   - Else → open human approval UI showing diffs, test results, chain-of-thought; human approves/rejects or edits.
7. **Apply**: when applied, commit patch to Git (or write file to DB), create an immutable applied mutation with before/after snapshots, increment node strengths if you use brain graph.
8. **Regression**: Keep original snapshot baseline for later regression testing. When further refinements come, run regression tests comparing new results to earlier applied version to detect regressions.

## 4. Regression Suite (What to Run Every Time)

- **Type & Lint**: tsc --noEmit + eslint (fail on errors).
- **Unit Tests**: run tests for files touched and all related modules (vitest/jest/react-testing-library).
- **Snapshot Tests**: Jest snapshots or Storybook snapshots for the component.
- **Visual Regression**: Render Storybook stories and compare bitmaps (Chromatic, Percy, or Playwright + pixeldiff).
- **Accessibility**: run axe on rendered examples (@axe-core/react, pa11y).
- **Behavioral Tests**: simulate the component behavior (click sequences, keyboard navigation).
- **Performance**: optional — measure bundle size delta or first load for significant components.

If any test fails, mark mutation.status = 'failed' and send human attention.

## 5. Patch Format

Accept either:
- Git unified diff (best for atomic git apply), or
- Full-file replacement (easiest to implement), or
- AST transform script (advance: jscodeshift/ts-morph) for deterministic edits.

Recommended: ask LLM to return a git-style patch and a new_file_contents. Example LLM JSON response:

```json
{
  "patch": "diff --git a/src/components/Button.tsx b/src/components/Button.tsx\n@@ -1,10 +1,14 @@\n-<old>\n+<new>\n",
  "new_file": "export default function Button(...) { ... }",
  "tests": {
    "unit": "added test Button shows spinner when loading",
    "story": "Updated Button.stories.tsx with loading story"
  },
  "explanation": "Reduced padding to match design tokens; added aria-pressed for toggle button; added loading spinner which preserves button width.",
  "confidence": 0.86,
  "risk": []
}
```

## 6. LLM Prompt Templates

### Refine Existing Component (Short + Strict)

```
You are a code-refinement assistant for MyContext. 
Input:
- ORIGINAL_FILE: ```<FULL ORIGINAL FILE TEXT>```
- CONTEXT: "Project uses shadcn/ui, Next.js App Router, InstantDB. Keep 'use client' placement rules."
- REFINEMENT: "Make the button accessible, add an inline loading state preserving width, use design tokens '--primary' spacing md, keep prop names onClick and children, add types, and keep no new npm dependencies."
- HISTORY: [list of previous refinements, brief]

Produce strictly JSON with fields:
{
 "patch": "<git unified diff>",
 "new_file": "<full updated file text>",
 "tests": [ { "type":"unit","code":"...test code..." } ],
 "explanation": "...",
 "confidence": 0.x,
 "risk_flags": []
}

Notes:
- Keep TypeScript types strict.
- Do not add new npm dependencies.
- Provide one-line summary and short chain-of-thought under explanation.
- Keep code <= 200 lines change when possible.
```

### Refinement-of-Refinement

Same as above, but include PREVIOUS_PATCH and FAILED_TESTS. The LLM must address failing tests and produce a patch that resolves them. Output same JSON fields. If tests cannot be fixed without changing API, explain why and propose minimal API change.

## 7. Automated Scoring & Selection

When you allow multiple candidate refinements (ensemble or evolutionary), score each candidate:

**Metrics (weighted):**
- typecheck: 0/1
- unit-tests: percent passing (0..1)
- visual-regression: pixel-diff normalized (1 - normalizedDiff)
- accessibility: axe violations penalized
- size: bundle change penalty
- style: eslint/prettier pass

Final score = weighted sum. Accept if >= threshold.

You can generate N candidates by calling LLM with different temperatures or by using a "mutation + denoise" loop (see diffusion-like section).

## 8. "Diffusion-like" Refinement Algorithm

You suggested diffusion — here's a practical analogue for code:

1. **Forward (noising)**: create noisy variants of the component by applying small, controlled mutations:
   - rename internal vars,
   - change spacing and minor CSS classes,
   - try alternate implementation patterns (useEffect -> useMemo),
   - modify prop defaults slightly.

2. **Reverse (denoise)**: ask the LLM to "denoise" each noisy variant toward the objective (refinement instructions). The LLM's job is to produce a cleaned-up version that both passes tests and better matches the refinement.

3. **Selection**: run tests on denoised outputs, score them, pick the best.

This is effectively a stochastic search + refinement (like evolutionary search or simulated annealing) — not literal diffusion in continuous image space, but it transfers the idea: iterate from noisy seeds to higher-quality artifacts.

**Implementation tips:**
- The "noise" step uses deterministic mutation operators (small AST edits, CSS tweaks).
- Run many short LLM runs with low temperature to denoise.
- Prefer ensembles: produce 5–10 candidates and run full tests in parallel.

This gives you:
- Robustness (multiple candidates),
- Exploration (escape local minima),
- And a provenance chain showing how the solution evolved.

## 9. CI Integration (Example Flow)

- Push proposal → POST /api/brain/propose.
- Server writes mutation record and enqueues CI job (GitHub Actions, GitLab CI, or a local runner).
- CI job checks out repo, applies patch (or replaces file), runs:
  - pnpm install --frozen-lockfile
  - pnpm tsc --noEmit
  - pnpm lint
  - pnpm test --changedFiles
  - pnpm storybook:build && run visual regression
  - node scripts/compute-score.js --mutationId=...
- CI returns results to server; server writes mutation.result and triggers UI / webhook.

If accepted, server commits patch to refinements/<submissionId>.patch branch or directly to main if auto-apply allowed.

## 10. Practical Code Examples

### Apply Patch Server-Side (Pseudo Node)

```typescript
import simpleGit from 'simple-git';
import fs from 'fs';
import { execSync } from 'child_process';

async function applyPatch(patchText: string, repoPath: string) {
  const patchFile = '/tmp/refine.patch';
  fs.writeFileSync(patchFile, patchText);
  const git = simpleGit(repoPath);
  try {
    execSync(`git apply ${patchFile}`, { cwd: repoPath });
    execSync(`git add -A`, { cwd: repoPath });
    execSync(`git commit -m "LLM refinement" --no-verify`, { cwd: repoPath });
    // return commit hash
    const sha = execSync('git rev-parse HEAD', { cwd: repoPath }).toString().trim();
    return sha;
  } catch (err) {
    console.error('applyPatch failed', err.toString());
    throw err;
  }
}
```

### Generate JS/TS Patch from Full File

```typescript
import { createPatch } from 'diff';
const oldText = fs.readFileSync(filePath, 'utf8');
const newText = lllResponse.new_file;
const patch = createPatch(filePath, oldText, newText);
```

### JSON Mutation Record (Store in InstantDB)

```typescript
interface MutationRecord {
  id: string;
  componentPath: string;
  before: string;
  after: string;
  diff: string;
  tests: {
    unit: TestResult[];
    accessibility: TestResult[];
    visual: TestResult[];
  };
  chainOfThought: string;
  confidence: number;
  riskFlags: string[];
  status: "proposed" | "applied" | "rejected";
  appliedAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;
}
```

## 11. Human Approval UI

Show in the CLI:
- Side-by-side diff with syntax highlight (original vs proposed).
- Tests run results with failing lines & failure logs.
- Visual snapshots: current vs proposed (toggle & overlay diff).
- LLM chain-of-thought and confidence.
- Buttons: Accept / Reject / Edit (open quick in-browser editor).
- Comment box & approve button for audit.

## 12. Metrics & Dashboards to Monitor

- Acceptance rate (LLM proposals accepted without human change)
- Regression failures per 100 proposals
- Average time to apply
- Tests added per PR
- Visual regression false-positive rate

## 13. Minimal First-Steps Implementation

1. Add mutations collection + propose endpoint (we already did similar earlier).
2. Add UI to submit component + refinement (component text + instruction).
3. Implement LLM prompt (copy paste above).
4. Accept LLM output as new_file and create a mutation record.
5. Run a minimal CI job: tsc + vitest + axe on the patched code. If all green, mark applied.
6. Add a visual snapshot stage afterward.

## 14. Final Notes & Tradeoffs

- **Safety**: Always keep the mutation log and before/after snapshots. Prefer append-only logs.
- **Speed vs safety**: autonomy=true is fine in a dev environment; in production require human approvals.
- **Complex edits**: For cross-file API changes, require a manual decision (LLM should propose API change with explicit migration notes).
- **Determinism**: Use AST-based transforms for deterministic edits where possible; diff/patch is flexible but may be fragile.

## Implementation Status

### ✅ Completed (v2.0.29)
- Basic mutation logging system
- Regression test runner (typecheck, lint, unit tests)
- Enhanced refine command with approval UI
- Structured LLM prompts for refinement

### 🚧 Future Implementation (Post-v2.0.29)
- Full visual regression testing
- Diffusion-like refinement algorithm
- Multi-candidate ensemble generation
- CI/CD integration hooks
- Advanced accessibility testing
- Performance regression detection
- Automated scoring and selection

## Research Questions

1. **How effective is the diffusion-inspired approach compared to single-shot refinement?**
2. **What's the optimal ensemble size for multi-candidate generation?**
3. **How do we balance exploration vs exploitation in the refinement space?**
4. **What's the impact of mutation history on refinement quality?**
5. **How can we measure and optimize the refinement "convergence rate"?**

This system represents a significant advancement in automated code refinement, combining the reliability of traditional testing with the creativity of AI-driven improvement suggestions.
