# Zero-Drift Mission: Milestone Roadmap (v3 - Hard Gravity)

**Vision**: The `.mycontext` folder is not a mirror of your mistakes; it is the **Physics** of your project. The agent must fight gravity to fail.

---

## Milestone 1: The Sensor Array (Verification Probes)
**Goal**: Replace "Hallucinated Memory" with "Direct Observation".
- Implement `run_probe` tool.
- AI must use probes (filesystem/AST) to answer state questions instead of relying on context memory.
- [TEST]: AI successfully identifies a missing prop in a real component without being told in the prompt.

---

## Milestone 2: Hard Gravity (Constraint Engine)
**Goal**: Make the `design-manifest.json` an immutable constraint during execution.
- Implement the `ConstraintService` that validates AI intents against the Prime Objective.
- Error-back to the agent if its proposed action violates the narrative weight.
- [TEST]: If user asks to "Make it Blue" but manifest says "Red", the agent rejects the action or triggers a "Consistency Alert".

---

## Milestone 3: Grounded Tooling (Pre-hooks)
**Goal**: Automatic anchoring of all agent tools.
- Bind `write_file`, `run_test`, and `create_mission` to a grounding check.
- NO tool call is processed unless it carries a "Narrative Alignment" token.
- [TEST]: AI is unable to "click" an element that isn't defined in the implementation plan without reasoning its way through the divergence.

---

## Milestone 4: State Attestation (Validation over Reflection)
**Goal**: Ensure the manifest remains the "Source of Truth," not a "Log of Drift."
- Agents do not "Update" the manifest; they "Attest" to it.
- If code matches spec: Attestation Success.
- If code differs: Drift Alert (User choice: Fix Code? or Evolve Spec?).
- [TEST]: Agent catches a mismatch between the database schema and the PRD and refuses to proceed without user intervention.

---

## Milestone 5: Zero-Drift Synthesis
**Goal**: Quantify the Gravity.
- Final report includes a "Narrative Compliance" score.
- Visualizing the drift over time to see where the project "leaks" context.

---

## Timeline
- **Week 1**: Sensors (M1) + Hard Gravity Engine (M2)
- **Week 2**: Grounded Tools (M3) + Attestation (M4)
- **Week 3**: Synthesis & Reporting (M5)
