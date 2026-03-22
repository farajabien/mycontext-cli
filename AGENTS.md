# MyContext AI Agent Grounding

This project uses the **Living Brain** methodology for AI-native development. 

## The Living Brain (`.mycontext/context.json`)
The central source of truth for all architectural decisions, design systems, and project goals. AI Agents MUST reference this file before making changes to ensure alignment with the **Prime Objective**.

## Available Tools (via MCP)
The `mycontext-core-server` exposes the following high-level capabilities:

1.  **`get_living_brain`**: Retrieve the full state of the project's architecture and PRD.
2.  **`query_architecture`**: Search specific metadata paths (e.g., branding, features).
3.  **`validate_intent`**: Check if a proposed code change aligns with the project's long-term vision.
4.  **`sync_brain`**: Run the Monorepo Scanner to update the JSON manifest with current codebase reality.

## Operational Guidelines for Duo
- **Consult Before Coding**: Always run `get_living_brain` at the start of a session to understand the current technical specifications.
- **Respect the Brand**: Refer to `brand` metadata in the Brain for color palettes and components before generating UI.
- **Zero-Drift Policy**: If you identify a discrepancy between the code and the `context.json`, use the `sync_brain` tool or suggest a documentation update.

---
Built for the GitLab AI Hackathon 2026.
", "Complexity": 1, "Description": "Project grounding document for GitLab Duo Agents.
