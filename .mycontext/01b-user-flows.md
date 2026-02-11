# User Flows

```markdown
# MyContext CLI User Flow Documentation

## Table of Contents
1. [Primary User Journeys](#primary-user-journeys)
2. [Authentication Flows](#authentication-flows)
3. [Core Feature Flows](#core-feature-flows)
4. [Error Handling Flows](#error-handling-flows)
5. [Admin/Management Flows](#adminmanagement-flows)
6. [Mobile vs Desktop Flows](#mobile-vs-desktop-flows)
7. [Accessibility Flows](#accessibility-flows)

---

## 1. Primary User Journeys

### **Flow Name:** Project Initialization (`mycontext init`)
#### **Description:**
A user initializes a new project, scaffolding the required files and directories to start using MyContext CLI.

#### **Steps:**
1. **User Action:** Run `mycontext init` in the terminal.
2. **System Response:** Prompts user to select a framework (InstantDB, Next.js, Basic).
3. **User Action:** Select a framework from the list.
4. **System Response:** 
   - Creates `.mycontext` directory in the project root.
   - Generates a foundational `design-manifest.json` file.
   - Outputs success message: "Project initialized successfully."
5. **Success Criteria:** The project directory contains the `.mycontext` folder with `design-manifest.json`.

#### **Decision Points and Branches:**
- If a project is already initialized, the system prompts: "A project is already initialized here. Overwrite? (y/n)."
  - **Yes:** Overwrites existing files.
  - **No:** Cancels the operation.

#### **Error States and Recovery:**
- **Error:** User lacks write permissions.
  - **System Response:** "Error: Unable to create files. Please check your permissions."
  - **Recovery:** User updates permissions and re-runs the command.

---

## 2. Authentication Flows
(Note: Authentication is not a core feature of MyContext CLI as it is a local, standalone tool. However, this section anticipates potential future integrations.)

### **Flow Name:** Login to AI Provider (Future Feature)
#### **Description:**
User logs in to an AI provider for multimodal integration.

#### **Steps:**
1. **User Action:** Run `mycontext login`.
2. **System Response:** Prompts the user to select an AI provider (e.g., OpenAI, Anthropic, etc.).
3. **User Action:** Selects the AI provider and enters credentials.
4. **System Response:** Authenticates with the provider and stores an API key in a secure file (`.mycontext/config.json`).
5. **Success Criteria:** The user is authenticated, and the system outputs: "Successfully logged in to [Provider]."

#### **Error States and Recovery:**
- **Error:** Invalid credentials.
  - **System Response:** "Error: Invalid credentials. Please try again."
  - **Recovery:** User re-enters credentials.

---

## 3. Core Feature Flows

### **Flow Name:** Context Generation (`mycontext generate context --full`)
#### **Description:**
Generates a comprehensive project context including PRD, user flows, edge cases, and technical specs.

#### **Steps:**
1. **User Action:** Run `mycontext generate context --full`.
2. **System Response:**
   - Analyzes the `design-manifest.json`.
   - Generates PRD, user flows, edge cases, and technical specs.
   - Saves generated files in the `.mycontext` directory.
   - Outputs success message: "Context successfully generated."
3. **Success Criteria:** Relevant context files (e.g., `prd.md`, `user-flows.md`) are created in the `.mycontext` directory.

#### **Decision Points and Branches:**
- If the `design-manifest.json` is missing, the system prompts: "Error: Design manifest not found. Run `mycontext init` first."

#### **Error States and Recovery:**
- **Error:** Missing `design-manifest.json`.
  - **System Response:** "Error: Design manifest not found. Run `mycontext init` first."
  - **Recovery:** User runs `mycontext init` and retries.

---

### **Flow Name:** Screen Generation (`mycontext generate:screens`)
#### **Description:**
Generates functional/visual screens (HTML or JSX) based on the design manifest.

#### **Steps:**
1. **User Action:** Run `mycontext generate:screens`.
2. **System Response:**
   - Parses `design-manifest.json` for screen definitions.
   - Generates screen files in the `/screens` directory.
   - Outputs success message: "Screens generated successfully."
3. **Success Criteria:** Screen files are available in the `/screens` directory.

#### **Error States and Recovery:**
- **Error:** Missing or malformed `design-manifest.json`.
  - **System Response:** "Error: Invalid design manifest. Please check the file format."
  - **Recovery:** User fixes the manifest and retries.

---

## 4. Error Handling Flows

### **Flow Name:** General Error Handling
#### **Description:**
How the CLI handles unexpected errors.

#### **Steps:**
1. **User Action:** Run any command with errors (e.g., typos, missing files).
2. **System Response:** Outputs a detailed error message, including:
   - What went wrong.
   - Suggested recovery steps.
3. **Success Criteria:** User can understand and resolve the issue.

#### **Error Examples:**
- **Error:** Command not recognized.
  - **System Response:** "Error: Command not found. Run `mycontext help` for a list of valid commands."
  - **Recovery:** User runs `mycontext help`.

---

## 5. Admin/Management Flows

### **Flow Name:** Update Dynamic README
#### **Description:**
Automatically updates the project’s root README file based on internal specs.

#### **Steps:**
1. **User Action:** Run `mycontext update-readme`.
2. **System Response:**
   - Parses internal specs.
   - Updates the README with the latest project details.
   - Outputs success message: "README updated successfully."
3. **Success Criteria:** README file reflects the latest project specifications.

---

## 6. Mobile vs Desktop Flows

### **Flow Name:** CLI Usability on Mobile Terminals
#### **Description:**
Ensures the CLI works seamlessly on mobile terminals (e.g., Termux, iSH).

#### **Steps:**
1. **User Action:** Run a command in a mobile terminal emulator.
2. **System Response:** Outputs results in a mobile-friendly format (e.g., responsive text wrapping).
3. **Success Criteria:** All commands are accessible and usable on mobile.

---

## 7. Accessibility Flows

### **Flow Name:** Screen Reader Compatibility
#### **Description:**
Ensures the CLI outputs are compatible with screen readers.

#### **Steps:**
1. **User Action:** Run any command with a screen reader enabled.
2. **System Response:** Outputs text in a clear and concise format.
3. **Success Criteria:** Screen readers correctly interpret the output.

### **Flow Name:** Keyboard Navigation
#### **Description:**
Ensures all prompts are accessible via keyboard navigation only.

#### **Steps:**
1. **User Action:** Navigate through CLI prompts using Tab and Enter keys.
2. **System Response:** Highlights active selections and accepts input via Enter.
3. **Success Criteria:** User can complete all prompts using only a keyboard.

---

### Flow Diagram Example (Text Format)

#### **Flow: Project Initialization**

```
[Start] --> [Run `mycontext init`] --> [Framework Selection Prompt]
   --> (User selects framework) --> [Create `.mycontext` Directory]
      --> [Generate `design-manifest.json`] --> [Success Message]
         --> [End]
(Error: Project already initialized?) --> [Prompt to Overwrite] --> [End]
```

---

**End of Documentation**
```

---
*Generated by MyContext CLI - AI-powered component generation platform*
*Last updated: 2026-02-11T12:37:47.891Z*
