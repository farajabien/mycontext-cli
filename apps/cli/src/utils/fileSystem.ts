import * as fs from "fs-extra";
import * as path from "path";
import { v4 as uuidv4 } from "uuid";
import { ProjectConfig, ContextFiles } from "../types";

export class FileSystemManager {
  private readonly mycontextDir = ".mycontext";
  private readonly contextDir = ".mycontext"; // canonical location for context artifacts

  /**
   * Initialize a new project directory structure
   */
  async initializeProject(
    projectName: string,
    description: string,
    workingDir: string,
    useCurrentDir?: boolean
  ): Promise<ProjectConfig> {
    const projectId = uuidv4();
    const timestamp = new Date().toISOString();

    const config: ProjectConfig = {
      id: projectId,
      name: projectName,
      description,
      createdAt: timestamp,
      updatedAt: timestamp,
      contextPath: path.join(this.mycontextDir),
      version: "0.1.0",
      status: "initialized",
    };

    // Create directory structure
    const projectPath = useCurrentDir
      ? workingDir
      : path.resolve(workingDir, projectName);
    const mycontextPath = path.join(projectPath, this.mycontextDir);

    if (!useCurrentDir) {
      await fs.ensureDir(projectPath);
    }
    await fs.ensureDir(mycontextPath);

    // Write config file
    await fs.writeJson(path.join(mycontextPath, "config.json"), config, {
      spaces: 2,
    });

    // Create initial PRD template (.mycontext/01-prd.md)
    const prdTemplate = this.createPRDTemplate(projectName, description);
    await fs.writeFile(path.join(mycontextPath, "01-prd.md"), prdTemplate);

    // Create prompt guard (.mycontext/ALIGN)
    const alignTemplate = this.createAlignTemplate();
    await fs.writeFile(path.join(mycontextPath, "ALIGN"), alignTemplate);

    return config;
  }

  /**
   * Read a file from the filesystem
   */
  async readFile(filePath: string): Promise<string> {
    return await fs.readFile(filePath, "utf-8");
  }

  /**
   * Write a file to the filesystem
   */
  async writeFile(filePath: string, content: string): Promise<void> {
    // Ensure directory exists
    const dir = path.dirname(filePath);
    await fs.ensureDir(dir);

    await fs.writeFile(filePath, content, "utf-8");
  }

  /**
   * Check if a file or directory exists
   */
  async exists(filePath: string): Promise<boolean> {
    return await fs.pathExists(filePath);
  }

  /**
   * Ensure a directory exists (create if it doesn't)
   */
  async ensureDir(dirPath: string): Promise<void> {
    await fs.ensureDir(dirPath);
  }

  /**
   * Check if a directory is a MyContext project
   */
  async isMyContextProject(dir: string): Promise<boolean> {
    try {
      const configPath = path.join(dir, this.mycontextDir, "config.json");
      await fs.access(configPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get project configuration
   */
  async getProjectConfig(projectPath: string): Promise<ProjectConfig | null> {
    try {
      const configPath = path.join(
        projectPath,
        this.mycontextDir,
        "config.json"
      );
      return await fs.readJson(configPath);
    } catch {
      return null;
    }
  }

  /**
   * Update project configuration
   */
  async updateProjectConfig(
    projectPath: string,
    updates: Partial<ProjectConfig>
  ): Promise<void> {
    const configPath = path.join(projectPath, this.mycontextDir, "config.json");
    const config = await this.getProjectConfig(projectPath);

    if (!config) {
      throw new Error("Project configuration not found");
    }

    const updatedConfig = {
      ...config,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    await fs.writeJson(configPath, updatedConfig, { spaces: 2 });
  }

  /**
   * List context files
   */
  async listContextFiles(projectPath: string): Promise<string[]> {
    try {
      const contextPath = path.join(projectPath, this.mycontextDir);
      const files = await fs.readdir(contextPath);
      return files.filter(
        (file) =>
          file.endsWith(".md") || file.endsWith(".ts") || file.endsWith(".json")
      );
    } catch {
      return [];
    }
  }

  /**
   * Create a PRD template
   */
  private createPRDTemplate(projectName: string, description: string): string {
    return `# Product Requirements Document

## Project Overview
**Project Name:** ${projectName}
**Description:** ${description}

## Core Features
- [Feature 1]: Brief description
- [Feature 2]: Brief description
- [Feature 3]: Brief description

## User Stories
- As a user, I want to [action] so that [benefit]
- As an admin, I need to [action] so that [benefit]

## Technical Requirements
- Technology Stack: [List technologies]
- Database: [Database choice]
- Authentication: [Auth method]

## Acceptance Criteria
- [ ] Feature 1 works correctly
- [ ] Feature 2 is responsive
- [ ] Feature 3 is accessible

## Notes
- Add more details as needed
- Update this document as requirements evolve
`;
  }

  /**
   * Create the prompt guard template
   */
  private createAlignTemplate(): string {
    return `# MyContext Alignment Guard [SYNC]
Any changes to code, architecture, or features MUST be synchronized with:
1. \`.mycontext/context.json\` (Source of Truth / Living Brain)
2. \`README.md\` (Human-facing orientation & usage)

[AI INSTRUCTION]:
- You are an orchestrator of the Living Brain.
- "Guessing" is prohibited. Align with the user's intent by clarifying requirements first.
- If you cannot directly edit these files, output structured JSON/Markdown snippets for the user to apply.

[PHILOSOPHY: DETERMINISTIC SCAFFOLDING]:
- **Next.js + InstantDB First**: We are built for Next.js full-stack projects using InstantDB as the backend.
- **Mega Context (100% Knowledge)**:
  - Before ANY code is generated, the \`MegaContext\` (a comprehensive JSON state) must be 100% populated.
  - This includes: \`Routes\`, \`Users/Permissions\`, \`Pages\`, \`Server Actions\`, \`Client Components\`, \`Database Schema\`.
  - It does NOT matter if the user has to answer 100 questions. The goal is certainty.
  - Once \`MegaContext\` is complete, the scaffolding script runs purely on facts, not hallucinations.

[AGENT TEAMS ARCHITECTURE]:
- The "Living Brain" (\`context.json\`) is the shared state ("Blackboard") that enables scalable Agent Teams.
- Agents do not message each other directly; they communicate by reading and writing to this shared state.
- ALWAYS check \`context.json\` for the latest state before acting. ALWAYS update \`context.json\` with your results.

[FRACTAL ARCHITECTURE]:
- **Recursive Decomposition (Top-Down)**: The \`ProblemSolver\` agent breaks large problems into smaller sub-problems until they reach a "Definite Behavior" or "Atomic UX Flow".
  - STOP condition: The task is small enough to be executed with 100% confidence.
  - **Nuance [UI]**: For user interfaces, a single ShadCN component or a logical group of them is considered atomic.
- **Atomic Assembly (Bottom-Up)**: The \`Builder\` agent constructs atomic components first, then assembles them into molecules.

[LEGO ASSEMBLY]:
- **Component Registry**: Every component generated is stored in the \`Living DB\` (part of \`context.json\` / \`MegaContext\`).
- **Semantic Retrieval**: Before generating a new component, agents search the registry for "Relevant Pieces".
- **Lego Prompting**: "Assemble these [Pieces] and add [New Behavior]". Ensure visual and logical consistency.

[TUI MODES]:
- **Planning Mode**: Chat with the user to build the \`MegaContext\`.
- **Agent Mode**: Execute tasks (file creation, command running) based on \`MegaContext\`.
- **Auto-Edit Mode**: Watch file changes or run specific refactors.
`;
  }

  /**
   * Create atomic file operations
   */
  async atomicWrite(filePath: string, content: string): Promise<void> {
    const tempPath = `${filePath}.tmp`;

    try {
      // Write to temporary file first
      await this.writeFile(tempPath, content);

      // Atomic move
      await fs.move(tempPath, filePath, { overwrite: true });
    } catch (error) {
      // Clean up temp file if it exists
      try {
        await fs.remove(tempPath);
      } catch {
        // Ignore cleanup errors
      }
      throw error;
    }
  }

  /**
   * Backup a file
   */
  async backupFile(filePath: string): Promise<string> {
    const backupPath = `${filePath}.backup.${Date.now()}`;
    await fs.copy(filePath, backupPath);
    return backupPath;
  }

  /**
   * Restore a file from backup
   */
  async restoreFile(backupPath: string, targetPath: string): Promise<void> {
    await fs.copy(backupPath, targetPath);
  }

  /**
   * Detect the lib directory in the project
   * Returns src/lib/ if src directory exists, otherwise lib/
   */
  async detectLibDirectory(projectPath: string): Promise<string> {
    const srcDir = path.join(projectPath, "src");
    const hasSrc = await fs.pathExists(srcDir);

    if (hasSrc) {
      return path.join(projectPath, "src", "lib");
    }

    return path.join(projectPath, "lib");
  }

  /**
   * Copy InstantDB template files to the project's lib directory
   */
  async copyInstantDBTemplates(projectPath: string): Promise<void> {
    const libDir = await this.detectLibDirectory(projectPath);
    await fs.ensureDir(libDir);

    // Get the templates directory relative to this file
    const templatesDir = path.join(__dirname, "..", "templates", "instantdb");

    // Template files to copy
    const templateFiles = [
      "auth.ts",
      "instant-admin.ts",
      "instant-client.ts",
      "instantdb-storage.ts",
    ];

    // Copy each template file
    for (const file of templateFiles) {
      const sourcePath = path.join(templatesDir, file);
      const destPath = path.join(libDir, file);

      if (await fs.pathExists(sourcePath)) {
        await fs.copy(sourcePath, destPath, { overwrite: true });
      }
    }
  }
}
