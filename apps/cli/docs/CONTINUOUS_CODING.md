# 🔄 Autonomous Continuous Coding (The spec-driven Loop)

The MyContext Autonomous Continuous Coding loop is a self-evolving system designed to maintain zero-drift between design intent and implementation. Unlike traditional agent systems that scale through pure token volume, MyContext scales through **Deterministic Grounding**.

## 🏎️ The MyContext Advantage vs. Brute-Force Scaling

While industry leaders (like Cursor) experiment with long-running agents that consume trillions of tokens to build complex systems from scratch, MyContext takes a different path. 

### My Thoughts on the Cursor Approach:
- **Inefficiency as a Feature**: Spending trillions of tokens to migrate Solid to React or build a browser is impressive but represents a "guess and check" brute-force methodology. It relies on the model being smart enough to eventually find the right path through sheer volume.
- **Coordination Debt**: Their "Planners and Workers" approach is a classic distributed computing solution to a problem that shouldn't exist if you have a **Living DB**. In their system, the agents have to *discover* the architecture; in ours, they are *anchored* to it.
- **The Compilation Gap**: The user is right—spending millions of dollars for code that might not compile or pass CI is a systemic failure of "soft" context. MyContext's "hard gravity" prevents this by making compilation a baseline physics check, not an afterthought.

| Feature | Brute-Force Scaling (Cursor) | MyContext Living DB |
| :--- | :--- | :--- |
| **Foundation** | LLM internal state (Hallucination risk) | Deterministic Manifest (Hard Gravity Anchor) |
| **Coordination** | Planners & Workers (High conflict) | Single Source of Truth (Living DB) |
| **Scale** | Token-heavy, trillions of tokens | Efficiency-first, spec-driven |
| **Verification** | Pass/Fail CI | Deterministic "Physics" Compliance |

## 🔄 The Autonomous Loop Architecture

The system operates in a continuous cycle, managed by specialized agents:

### 1. 🎯 Task Generator (The Seer)
- **Action**: Runs `status` against the `Living DB` (README.md / .mycontext manifest).
- **Goal**: Identifies gaps between the current codebase and the deterministic spec.
- **Output**: Proposed task for alignment.

### 2. 🌊 Task Promoter (The Officializer)
- **Action**: Runs `mycontext` promotion scripts.
- **Goal**: Adds the task to the `.mycontext` todo list, ensuring it's locked into the narrative.
- **Output**: Updated `todo.json`.

### 3. 🛠️ Executor Agent (The Builder)
- **Action**: Reads the `todo` and triggers the `CodeGenSubAgent`.
- **Goal**: Generates production-ready code blocks tailored to the manifest requirements.
- **Reference**: Uses `apps/cli/src/agents/implementations/CodeGenSubAgent.ts`.

### 4. 📁 File Creator (The Materializer)
- **Action**: Writes files based on `comps` (components) and `actions` (server actions/hooks).
- **Goal**: Physical realization of the code blocks provided by the executor.

### 5. 🧪 Testing Agent (The Validator)
- **Action**: Triggers the **Testing MCP**.
- **Goal**: Runs unit tests (Jest) and integration tests (Playwright) locally.
- **Feedback**: Feeds the report back to the **Task Generator** if failures occur.

### 6. 👮 QA Agent (The Inspector)
- **Action**: Performs a multi-stage check:
    - **Layer 1**: Static checks (TypeScript types, `pnpm build`).
    - **Layer 2**: Visual verification via Browser (Playwright/Terminal debug logs).
    - **Layer 3**: Narrative compliance check (Zero-drift validation).

### 7. 📦 Package Installer Agent (The Resolver) [NEW]
- **Action**: Detects missing dependencies in generated code and runs installation commands.
- **Goal**: Ensures that the `Executor`'s output actually compiles by resolving local environment gaps.
- **Output**: Success confirmation and updated `package.json`.

## 🚀 Continuous Evolution & Loophole Analysis

This loop turns the development process into a local, deterministic engine. However, no loop is perfect. Here are the potential "loopholes" or challenges we need to solve:

### 1. 🌀 The Infinite Fix-Loop (Loophole)
- **Risk**: The Testing Agent reports a failure, the Generator suggests a fix, the Executor implements it, but the test *still* fails. Without a "circuit breaker," the agent could burn infinite tokens trying the same wrong fix.
- **Solution**: Implement **Narrative Memory**. If the loop reaches $N$ iterations on a single component without success, it must halt and request human intervention or trigger an **Architect Refresh** (re-analyzing the spec itself).

### 2. 🧊 Spec Stagnation (Loophole)
- **Risk**: The code evolves, but the `README.md` (Living DB) isn't updated. Eventually, the drift becomes so large that the loop loses its anchor.
- **Solution**: Every successful `QA` pass MUST trigger a `Spec Sync` task to ensure the documentation reflects the new reality.

### 3. 🛡️ Verification Depth (Loophole)
- **Risk**: Tests pass (functional correctness), but the code is "ugly," violates architectural patterns, or has security flaws that aren't caught by basic unit tests.
- **Solution**: The **QA Agent** needs higher "Narrative Weight" in the loop. It shouldn't just run `npm test`; it should use our `ArchitectAgent.ts` patterns to verify that the generated code *looks like* a MyContext component (e.g., proper shadcn/ui usage, mobile-first design).

## 🏁 Is `mycontext init` the right starting point?

**Absolutely.** `mycontext init` establishes the **Ground Truth**. 
Without it, the agents are just "planners and workers" floating in a void (like the Cursor agents). With it, every agent knows the "Physics" of the project from second zero. 

The loop should be triggered immediately after `init` to build out the scaffolding, then run continuously to evolve it.
