import * as fs from "fs-extra";
import * as path from "path";
import chalk from "chalk";
import { ProjectContext } from "../types";
import { CONTEXT_FILES, getAllFileNameVariants } from "../constants/fileNames";

export interface ContextLoadOptions {
  verbose?: boolean;
  required?: boolean;
}

/**
 * Loads project context from .mycontext directory
 * Provides fallback to context/ directory for backward compatibility
 */
export class ContextLoader {
  private projectPath: string;

  constructor(projectPath: string = process.cwd()) {
    this.projectPath = projectPath;
  }

  /**
   * Load all available context files
   */
  async loadProjectContext(
    options: ContextLoadOptions = {}
  ): Promise<ProjectContext> {
    const context: ProjectContext = {};
    const { verbose = false, required = false } = options;

    try {
      // Try .mycontext directory first (new structure)
      const mycontextDir = path.join(this.projectPath, ".mycontext");
      if (await fs.pathExists(mycontextDir)) {
        await this.loadFromDirectory(mycontextDir, context, verbose);
      } else if (required) {
        throw new Error(
          "No .mycontext directory found. Run 'mycontext init' first."
        );
      } else {
        // Fallback to context/ directory (legacy structure)
        const contextDir = path.join(this.projectPath, "context");
        if (await fs.pathExists(contextDir)) {
          if (verbose) {
            console.log(chalk.gray("📁 Using legacy context/ directory"));
          }
          await this.loadFromDirectory(contextDir, context, verbose);
        }
      }

      if (verbose && Object.keys(context).length > 0) {
        console.log(chalk.green("✅ Context loaded successfully"));
        console.log(
          chalk.gray(`   Available: ${Object.keys(context).join(", ")}`)
        );
      }

      return context;
    } catch (error) {
      if (required) {
        throw error;
      }
      if (verbose) {
        console.log(chalk.yellow("⚠️ Some context files could not be loaded"));
      }
      return context;
    }
  }

  /**
   * Load context from a specific directory
   */
  private async loadFromDirectory(
    dir: string,
    context: ProjectContext,
    verbose: boolean
  ): Promise<void> {
    // Helper function to load a file with variants
    const loadFileWithVariants = async (
      canonicalName: string,
      contextKey: keyof ProjectContext,
      displayName: string
    ): Promise<void> => {
      const variants = getAllFileNameVariants(canonicalName);
      for (const variant of variants) {
        const filePath = path.join(dir, variant);
        if (await fs.pathExists(filePath)) {
          const content = await fs.readFile(filePath, "utf8");
          (context as any)[contextKey] = content;
          if (verbose) {
            console.log(chalk.gray(`   📄 ${displayName}: ${variant}`));
          }
          break;
        }
      }
    };

    // Load PRD
    await loadFileWithVariants(CONTEXT_FILES.PRD, "prd", "PRD");

    // Load Types
    await loadFileWithVariants(CONTEXT_FILES.TYPES, "types", "Types");

    // Load Brand
    await loadFileWithVariants(CONTEXT_FILES.BRANDING, "brand", "Brand");

    // Load Component List (JSON)
    const compListVariants = getAllFileNameVariants(CONTEXT_FILES.COMPONENT_LIST);
    for (const variant of compListVariants) {
      const compListPath = path.join(dir, variant);
      if (await fs.pathExists(compListPath)) {
        try {
          const compListRaw = await fs.readFile(compListPath, "utf8");
          context.componentList = JSON.parse(compListRaw);
          if (verbose) {
            console.log(chalk.gray(`   📄 Component List: ${variant}`));
          }
          break;
        } catch (error) {
          // Invalid JSON, try next variant
          continue;
        }
      }
    }

    // Load A/B/C/D Context Files
    await loadFileWithVariants(CONTEXT_FILES.FEATURES, "features", "Features");
    await loadFileWithVariants(CONTEXT_FILES.USER_FLOWS, "userFlows", "User Flows");
    await loadFileWithVariants(CONTEXT_FILES.EDGE_CASES, "edgeCases", "Edge Cases");
    await loadFileWithVariants(CONTEXT_FILES.TECHNICAL_SPECS, "technicalSpecs", "Technical Specs");

    // Load Project Structure
    await loadFileWithVariants(CONTEXT_FILES.PROJECT_STRUCTURE, "projectStructure", "Project Structure");
  }

  /**
   * Get a description from context files, with fallback priority
   */
  async getDescriptionFromContext(
    options: ContextLoadOptions = {}
  ): Promise<string | null> {
    const context = await this.loadProjectContext(options);

    // Priority order: PRD > Types > User Stories > Technical Specs
    if (context.prd && context.prd.trim()) {
      return context.prd.trim();
    }

    if (context.types && context.types.trim()) {
      return context.types.trim();
    }

    if (context.userStories && context.userStories.trim()) {
      return context.userStories.trim();
    }

    if (context.technicalSpecs && context.technicalSpecs.trim()) {
      return context.technicalSpecs.trim();
    }

    return null;
  }

  /**
   * Check if context files exist
   */
  async hasContextFiles(): Promise<boolean> {
    const context = await this.loadProjectContext();
    return Object.keys(context).length > 0;
  }

  /**
   * Get context summary for display
   */
  getContextSummary(context: ProjectContext): string {
    const parts: string[] = [];

    if (context.prd) parts.push("PRD");
    if (context.types) parts.push("Types");
    if (context.brand) parts.push("Brand");
    if (context.componentList) parts.push("Components");
    if (context.userStories) parts.push("User Stories");
    if (context.technicalSpecs) parts.push("Technical Specs");
    if (context.projectStructure) parts.push("Project Structure");

    return parts.length > 0 ? parts.join(", ") : "No context found";
  }
}

/**
 * Convenience function to load project context
 */
export async function loadProjectContext(
  projectPath?: string,
  options?: ContextLoadOptions
): Promise<ProjectContext> {
  const loader = new ContextLoader(projectPath);
  return loader.loadProjectContext(options);
}

/**
 * Convenience function to get description from context
 */
export async function getDescriptionFromContext(
  projectPath?: string,
  options?: ContextLoadOptions
): Promise<string | null> {
  const loader = new ContextLoader(projectPath);
  return loader.getDescriptionFromContext(options);
}
