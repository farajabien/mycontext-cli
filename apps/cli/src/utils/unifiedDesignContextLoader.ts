import * as fs from "fs-extra";
import * as path from "path";
import { ContextEnricher } from "./contextEnricher";
import { DesignPipelineAgent } from "../agents/implementations/DesignPipelineAgent";
import { DesignPipelineStateManager } from "./designPipelineStateManager";
import { DesignManifestManager, DesignPipelineInput, EnrichedContext } from "@myycontext/core";
import chalk from "chalk";

/**
 * Unified Design Context Loader
 *
 * Treats ALL context files (PRD + Types + Brand + Component List + Architecture)
 * as a unified design system foundation for component generation.
 *
 * This is the key insight from V0: context files ARE the design system.
 */
export class UnifiedDesignContextLoader {
  private manifestManager: DesignManifestManager;
  private contextEnricher: ContextEnricher;
  private designPipeline: DesignPipelineAgent;
  private stateManager: DesignPipelineStateManager;
  private projectPath: string;

  constructor(projectPath: string = process.cwd()) {
    this.projectPath = projectPath;
    this.manifestManager = new DesignManifestManager(projectPath);
    this.contextEnricher = new ContextEnricher(projectPath);
    this.designPipeline = new DesignPipelineAgent(projectPath);
    this.stateManager = new DesignPipelineStateManager(projectPath);
  }

  getContextEnricher(): ContextEnricher {
    return this.contextEnricher;
  }

  /**
   * Load and unify ALL context files as design system foundation
   */
  async loadUnifiedDesignContext(resumeFromState: boolean = false): Promise<{
    enrichedContext: EnrichedContext;
    hasDesignManifest: boolean;
    shouldGenerateManifest: boolean;
  }> {
    console.log(chalk.blue("🔄 Loading unified design context..."));

    try {
      // 1. Load all context files
      const contextFiles = await this.loadAllContextFiles();
      console.log(
        chalk.gray(
          `   Loaded ${Object.keys(contextFiles).length} context files`
        )
      );

      // 2. Check if design manifest exists and is valid
      const hasDesignManifest = await this.manifestManager.hasValidManifest();
      const shouldGenerateManifest =
        !hasDesignManifest ||
        (await this.manifestManager.shouldRegenerateManifest(24));

      let enrichedContext: EnrichedContext;

      if (hasDesignManifest && !shouldGenerateManifest) {
        // 3a. Use existing design manifest
        console.log(chalk.gray("   Using existing design manifest"));
        enrichedContext = await this.contextEnricher.mergeAllContext(
          contextFiles.prd,
          contextFiles.types,
          contextFiles.brand,
          contextFiles.componentList
        );
      } else {
        // 3b. Generate new design manifest from all context files
        console.log(
          chalk.gray("   Generating design manifest from context files")
        );
        const designInput: DesignPipelineInput = {
          prd: contextFiles.prd,
          types: contextFiles.types,
          branding: contextFiles.brand,
          component_list: contextFiles.componentList,
          project_path: this.projectPath,
          force_regenerate: shouldGenerateManifest,
        };

        try {
          const designOutput = await this.designPipeline.run(
            designInput,
            resumeFromState
          );

          if (designOutput.success) {
            await this.manifestManager.saveDesignManifest(
              designOutput.manifest
            );
            console.log(chalk.green("✅ Design manifest generated and saved"));
          } else {
            console.warn(
              chalk.yellow("⚠️  Design pipeline failed, using fallback context")
            );
          }
        } catch (error) {
          // Pipeline failed at a specific phase - error already logged with recovery guidance
          // Re-throw to stop component generation
          throw error;
        }

        // Load enriched context
        enrichedContext = await this.contextEnricher.mergeAllContext(
          contextFiles.prd,
          contextFiles.types,
          contextFiles.brand,
          contextFiles.componentList
        );
      }

      console.log(chalk.green("✅ Unified design context loaded"));
      console.log(
        chalk.gray(
          `   Design system: ${enrichedContext.design_system.colors.primary} primary`
        )
      );
      console.log(
        chalk.gray(
          `   Components: ${enrichedContext.component_architecture.components.length} defined`
        )
      );
      console.log(
        chalk.gray(
          `   Design anchors: ${enrichedContext.design_intent.design_anchors.join(
            ", "
          )}`
        )
      );

      return {
        enrichedContext,
        hasDesignManifest,
        shouldGenerateManifest,
      };
    } catch (error) {
      console.error(
        chalk.red("❌ Failed to load unified design context:"),
        error
      );
      throw error;
    }
  }

  /**
   * Load all context files as a unified design foundation
   */
  private async loadAllContextFiles(): Promise<{
    prd: string;
    types: string;
    brand: string;
    componentList: string;
    architecture: string;
    globals: string;
  }> {
    const contextFiles = {
      prd: "",
      types: "",
      brand: "",
      componentList: "",
      architecture: "",
      globals: "",
    };

    // Load PRD
    contextFiles.prd = await this.loadContextFile([
      "./.mycontext/01-prd.md",
      "./.mycontext/prd.md",
      "./context/01-prd.md",
      "./context/prd.md",
    ]);

    // Load Types
    contextFiles.types = await this.loadContextFile([
      "./.mycontext/02-types.ts",
      "./.mycontext/types.ts",
      "./context/types.ts",
    ]);

    // Load Brand (CSS + Markdown)
    contextFiles.brand = await this.loadBrandContext();

    // Load Component List
    contextFiles.componentList = await this.loadContextFile([
      "./.mycontext/04-component-list.json",
      "./.mycontext/component-list.json",
      "./context/component-list.json",
    ]);

    // Load Architecture
    contextFiles.architecture = await this.loadContextFile([
      "./.mycontext/05-architecture.md",
      "./.mycontext/architecture.md",
      "./context/architecture.md",
    ]);

    // Load Globals CSS
    contextFiles.globals = await this.loadContextFile([
      "./.mycontext/brand/globals.css",
      "./.mycontext/globals.css",
      "./context/globals.css",
      "./app/globals.css",
    ]);

    return contextFiles;
  }

  /**
   * Load brand context (CSS + Markdown combined)
   */
  private async loadBrandContext(): Promise<string> {
    const brandParts: string[] = [];

    // Load CSS files
    const cssFiles = [
      "./.mycontext/brand/globals.css",
      "./.mycontext/globals.css",
      "./context/globals.css",
      "./app/globals.css",
    ];

    for (const file of cssFiles) {
      const content = await this.loadContextFile([file]);
      if (content) {
        brandParts.push(`=== CSS DESIGN TOKENS ===\n${content}`);
      }
    }

    // Load brand markdown
    const brandMd = await this.loadContextFile([
      "./.mycontext/03-branding.md",
      "./.mycontext/branding.md",
      "./context/branding.md",
    ]);

    if (brandMd) {
      brandParts.push(`=== BRAND GUIDELINES ===\n${brandMd}`);
    }

    // Load brand directory files
    const brandDirs = ["./.mycontext/brand/", "./context/brand/"];
    for (const dir of brandDirs) {
      if (await fs.pathExists(dir)) {
        const files = await fs.readdir(dir);
        for (const file of files) {
          if (file.endsWith(".css") || file.endsWith(".md")) {
            const filePath = path.join(dir, file);
            const content = await fs.readFile(filePath, "utf8");
            brandParts.push(`=== ${file.toUpperCase()} ===\n${content}`);
          }
        }
      }
    }

    return brandParts.join("\n\n");
  }

  /**
   * Load a single context file from multiple candidates
   */
  private async loadContextFile(candidates: string[]): Promise<string> {
    for (const candidate of candidates) {
      try {
        if (await fs.pathExists(candidate)) {
          return await fs.readFile(candidate, "utf8");
        }
      } catch (error) {
        // Continue to next candidate
      }
    }
    return "";
  }

  /**
   * Get context summary for display
   */
  async getContextSummary(): Promise<string> {
    try {
      const { enrichedContext } = await this.loadUnifiedDesignContext();
      return this.contextEnricher.getContextSummary(enrichedContext);
    } catch (error) {
      return "Failed to load context summary";
    }
  }

  /**
   * Check if all required context files exist
   */
  async validateContextFiles(): Promise<{
    valid: boolean;
    missing: string[];
    warnings: string[];
  }> {
    const missing: string[] = [];
    const warnings: string[] = [];

    // Check for PRD
    const prdExists = await this.loadContextFile([
      "./.mycontext/01-prd.md",
      "./.mycontext/prd.md",
      "./context/01-prd.md",
      "./context/prd.md",
    ]);
    if (!prdExists) {
      missing.push("PRD (Product Requirements Document)");
    }

    // Check for Component List
    const compListExists = await this.loadContextFile([
      "./.mycontext/04-component-list.json",
      "./.mycontext/component-list.json",
      "./context/component-list.json",
    ]);
    if (!compListExists) {
      missing.push("Component List");
    }

    // Check for Types (optional but recommended)
    const typesExists = await this.loadContextFile([
      "./.mycontext/02-types.ts",
      "./.mycontext/types.ts",
      "./context/types.ts",
    ]);
    if (!typesExists) {
      warnings.push(
        "Types file not found (recommended for better component generation)"
      );
    }

    // Check for Brand (optional but recommended)
    const brandExists = await this.loadBrandContext();
    if (!brandExists) {
      warnings.push(
        "Brand context not found (recommended for consistent design)"
      );
    }

    return {
      valid: missing.length === 0,
      missing,
      warnings,
    };
  }

  /**
   * Get design manifest summary
   */
  async getDesignManifestSummary(): Promise<string> {
    return await this.manifestManager.getManifestSummary();
  }

  /**
   * Force regenerate design manifest
   */
  async regenerateDesignManifest(): Promise<void> {
    console.log(chalk.blue("🔄 Regenerating design manifest..."));

    const contextFiles = await this.loadAllContextFiles();
    const designInput: DesignPipelineInput = {
      prd: contextFiles.prd,
      types: contextFiles.types,
      branding: contextFiles.brand,
      component_list: contextFiles.componentList,
      project_path: this.projectPath,
      force_regenerate: true,
    };

    try {
      const designOutput = await this.designPipeline.run(designInput, false);

      if (designOutput.success) {
        await this.manifestManager.saveDesignManifest(designOutput.manifest);
        console.log(chalk.green("✅ Design manifest regenerated"));
      } else {
        throw new Error("Failed to regenerate design manifest");
      }
    } catch (error) {
      // Pipeline failed - error already logged with recovery guidance
      throw error;
    }
  }

  // ============================================================================
  // STATE MANAGEMENT METHODS
  // ============================================================================

  /**
   * Check if there's a resumable state
   */
  async canResume(): Promise<boolean> {
    return await this.stateManager.canResume();
  }

  /**
   * Load existing pipeline state
   */
  async loadState() {
    return await this.stateManager.loadState();
  }

  /**
   * Check if state is stale
   */
  async isStateStale(): Promise<boolean> {
    return await this.stateManager.isStateStale();
  }

  /**
   * Get state summary
   */
  async getStateSummary(): Promise<string> {
    return await this.stateManager.getStateSummary();
  }
}
