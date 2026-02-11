# MyContext Vision: The Zero-Drift Autonomous Agent

## The Problem: Narrative Drift
In typical AI coding workflows, a "reckless prompt" (e.g., "add a login page and a database") often leads to "Narrative Drift." The AI hallucinates patterns, ignores existing architecture, and breaks the project's internal logic because it lack a deterministic anchor.

## The Solution: The Living Brain Orchestrator
MyContext introduces the **Zero-Drift Execution Pipeline**. We treat the project's `.mycontext/design-manifest.json` as the **Physics Engine** (Hard Gravity) and the user's prompt as the **Narrative Input**.

### The Pipeline Flow:

1. **Reckless Prompt**: The user provides high-level instructions without worrying about details.
2. **Brain Assessment (`agent:assess`)**:
   - The Agent reads the current `design-manifest.json`.
   - It analyzes the prompt to identify required state changes (New components, schema updates, workflow alterations).
   - It identifies potential "Boundary Violations" (e.g., trying to add a feature that contradicts the PRD).
3. **Structured Proposal**:
   - The Agent generates a deterministic **Task List**.
   - It proposes specific updates to the `design-manifest.json` (The "Physics" of the change).
4. **User Approval (The Guardrail)**:
   - The user reviews the proposal: "Adding Login Component under Auth Group, modifying Schema to include User table."
   - User approves the *intent* and the *plan* before a single line of code is written.
5. **Deterministic Execution**:
   - The Agent executes the tasks in order.
   - It performs **State Attestation** after each step to ensure the implementation matches the manifest.

## Why This Works
- **Deterministic**: The path from prompt to code is calculated and approved.
- **Auditable**: The `design-manifest.json` tracks every evolution of the project's DNA.
- **Resilient**: If the AI makes a mistake during implementation, the "Hard Gravity" anchor allows for precise correction or rollback.

## Immediate Goal: `mycontext agent`
The `agent` command will be the entry point for this autonomous flow, starting with the `assess` phase.
