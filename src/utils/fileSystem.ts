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
