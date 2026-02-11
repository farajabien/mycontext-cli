# GitLab Hackathon: Flow Guardian — Full Specification & Implementation Guide

## 1. Project Vision
**Flow Guardian** is a GitLab Duo Custom Agent that enables **Conversational UI Testing**. It turns the software testing process into a natural language dialogue. Instead of writing brittle E2E scripts, developers describe a mission, and the agent autonomously navigates the UI, validates the outcome, and reports back in the GitLab ecosystem.

---

## 2. Problem & Solution
*   **The Bottleneck**: Modern teams move fast, but E2E testing is a drag. It’s either manual (slow) or scripted (brittle).
*   **The AI Opportunity**: LLMs can now "reason" about DOM structures and accessibility labels, making autonomous browser navigation possible.
*   **The Solution**: An agent that "understands" your app's purpose and can verify it just by clicking around like a human would, but at machine speed and with 24/7 reliability.

---

## 3. Product Requirements (PRD)

### 3.1 Functional Features
1.  **Direct Mission Execution**: `Duo, verify that the 'Forgot Password' flow actually sends an email.`
2.  **Autonomous Navigation**: The agent finds the 'Forgot Password' link, enters the email, clicks submit, and checks for the "Check your inbox" success state.
3.  **Strategy Drafting**: Before running, the agent explains its plan: *"I'll navigate to /login, find the recovery link, and input a test email. Confirm?"*
4.  **Auto-Validation**: The agent infers what "success" looks like (e.g., URL change, specific modal appearing).

### 3.2 Technical Requirements
*   **Agent Platform**: GitLab Duo Custom Agent.
*   **MCP Server**: Expose `Flow Testing MCP` (Playwright-based) to the GitLab Agent.
*   **Context Source**: Optionally reads `.mycontext/` files for deep domain knowledge.
*   **CI/CD Integration**: A GitLab Job that runs missions on Review Environments.

---

## 4. Implementation Strategy

### 4.1 Phase 1: The "Agent" (Duo Custom Agent)
*   **System Prompt**: Focus on "Spec-to-Execution" mapping. The agent should be an expert at identifying UI elements by their semantic roles.
*   **Tool Mapping**:
    *   `create_test_mission`: Parse the natural language input.
    *   `run_test`: Execute the autonomous loop.
    *   `get_test_report`: Format the findings for the user.

### 4.2 Phase 2: The "Guardian" (CI/CD Bot)
*   Create a `.gitlab-ci.yml` template.
*   Job: `flow-validation`.
*   Triggers: On every Merge Request.
*   Action: Pulls recorded missions and runs them against the `CI_ENVIRONMENT_URL`.
*   Reporting: Post a Markdown table in the MR with ✅/❌ and failure screenshots.

---

## 5. Technical Context for Coding Agent

### 5.1 Project Structure (Current State)
The core logic resides in `src/mcp/`:
*   `testing-server.ts`: The MCP Server entry point.
*   `browser-test-runner.ts`: The autonomous navigator (Playwright + AI).
*   `test-mission-manager.ts`: Storage for missions in `.mycontext/test-missions.json`.

### 5.2 Key Logic: Browser Execution Loop
```typescript
while (!missionComplete && maxSteps > 0) {
  // 1. Snapshot DOM (Simplified for context window)
  const pageState = await getSimplifiedDOM(page);
  
  // 2. AI Decision
  const nextAction = await ai.decide(pageState, previousSteps, mission);
  
  // 3. Playwright Execution
  await executeAction(page, nextAction);
  
  // 4. Verification Check
  if (isMissionAccomplished(page, mission)) missionComplete = true;
}
```

---

## 6. Hackathon Submission Focus
*   **Category**: Most Impactful / Technically Impressive.
*   **Story**: "We moved from 2 hours of manual QA per release to a 2-minute conversation with our GitLab Duo Agent."
*   **Category Tags**: #GitLabDuo #AI #TestingAutomation #MCP #Gemini #Anthropic
