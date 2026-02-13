import * as fs from "fs-extra";
import * as path from "path";
import chalk from "chalk";
import {
  DesignManifest,
  EnrichedContext,
  ValidationResult,
  PhaseValidation,
} from "./types/design-pipeline";

/**
 * Design Manifest Manager
 *
 * Handles storage, loading, validation, and context enrichment
 * for the mycontext design pipeline manifest.
 */
export class DesignManifestManager {
  private manifestPath: string;
  private projectPath: string;

  constructor(projectPath: string = process.cwd()) {
    this.projectPath = projectPath;
    this.manifestPath = path.join(
      projectPath,
      ".mycontext",
      "context.json"
    );
  }

  /**
   * Save design manifest to .mycontext/context.json
   */
  async saveDesignManifest(manifest: DesignManifest): Promise<void> {
    try {
      // Ensure .mycontext directory exists
      const contextDir = path.dirname(this.manifestPath);
      await fs.ensureDir(contextDir);

      // Write manifest with pretty formatting
      await fs.writeJSON(this.manifestPath, manifest, { spaces: 2 });

      console.log(
        chalk.green(
          "✅ Living Brain saved to .mycontext/context.json"
        )
      );
    } catch (error) {
      console.error(chalk.red("❌ Failed to save design manifest:"), error);
      throw error;
    }
  }

  /**
   * Load design manifest from .mycontext/design-manifest.json
   */
  async loadDesignManifest(): Promise<DesignManifest | null> {
    try {
      if (!(await fs.pathExists(this.manifestPath))) {
        return null;
      }

      const manifestData = await fs.readJSON(this.manifestPath);
      return this.validateManifest(manifestData).valid ? manifestData : null;
    } catch (error) {
      console.warn(chalk.yellow("⚠️  Failed to load design manifest:"), error);
      return null;
    }
  }

  /**
   * Check if design manifest exists and is valid
   */
  async hasValidManifest(): Promise<boolean> {
    const manifest = await this.loadDesignManifest();
    return manifest !== null;
  }

  /**
   * Validate design manifest structure and completeness
   */
  validateManifest(manifest: any): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // Check required top-level fields
    if (!manifest.version) errors.push("Missing version field");
    if (!manifest.generated_at) errors.push("Missing generated_at field");
    if (!manifest.project_name) errors.push("Missing project_name field");
    if (!manifest.phases) errors.push("Missing phases object");

    if (manifest.phases) {
      // Validate each phase
      const phaseValidations = this.validatePhases(manifest.phases);
      phaseValidations.forEach((validation) => {
        if (!validation.result.valid) {
          errors.push(
            ...validation.result.errors.map(
              (e) => `${validation.phase_name}: ${e}`
            )
          );
        }
        warnings.push(
          ...validation.result.warnings.map(
            (w) => `${validation.phase_name}: ${w}`
          )
        );
      });
    }

    // Check metadata
    if (!manifest.metadata) {
      warnings.push("Missing metadata object");
    } else {
      if (!manifest.metadata.generation_time_ms) {
        warnings.push("Missing generation_time_ms in metadata");
      }
    }

    // Calculate confidence score
    const confidenceScore = this.calculateOverallConfidence(manifest);

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      suggestions,
      confidence_score: confidenceScore,
    };
  }

  /**
   * Validate individual phases
   */
  private validatePhases(phases: any): PhaseValidation[] {
    const validations: PhaseValidation[] = [];

    // Phase 1: Functional Summary
    validations.push(
      this.validatePhase("functional_summary", phases.functional_summary, [
        "app_name",
        "core_purpose",
        "key_features",
        "primary_user_actions",
        "platform",
        "technical_requirements",
        "complexity_level",
      ])
    );

    // Phase 2: Project Scope
    validations.push(
      this.validatePhase("project_scope", phases.project_scope, [
        "build_scope",
        "reason",
        "expected_outputs",
      ])
    );

    // Phase 3: Context Gaps
    validations.push(
      this.validatePhase("context_gaps", phases.context_gaps, [
        "missing",
        "recommended_next_action",
      ])
    );

    // Phase 4: Design Brief
    validations.push(
      this.validatePhase("design_brief", phases.design_brief, [
        "theme",
        "inspiration_sources",
        "blended_style",
        "primary_color",
        "support_colors",
        "typography",
        "ui_principles",
        "motion_style",
      ])
    );

    // Phase 5: Visual System
    validations.push(
      this.validatePhase("visual_system", phases.visual_system, [
        "colors",
        "typography",
        "spacing",
        "radii",
        "shadows",
        "motion",
        "breakpoints",
      ])
    );

    // Phase 6: Component Hierarchy
    validations.push(
      this.validatePhase("component_hierarchy", phases.component_hierarchy, [
        "screens",
        "components",
        "design_patterns",
        "interaction_flows",
      ])
    );

    // Phase 7: Implementation Plan
    validations.push(
      this.validatePhase("implementation_plan", phases.implementation_plan, [
        "framework",
        "pages",
        "state_management",
        "build_requirements",
        "data_persistence",
        "performance_optimizations",
      ])
    );

    // Phase 8: Design Intent
    validations.push(
      this.validatePhase("design_intent", phases.design_intent, [
        "visual_philosophy",
        "design_anchors",
        "user_experience_goals",
      ])
    );

    return validations;
  }

  /**
   * Validate a single phase
   */
  private validatePhase(
    phaseName: string,
    phaseData: any,
    requiredFields: string[]
  ): PhaseValidation {
    const errors: string[] = [];
    const warnings: string[] = [];
    const missingFields: string[] = [];

    if (!phaseData) {
      errors.push("Phase data is missing");
      return {
        phase_name: phaseName,
        result: {
          valid: false,
          errors,
          warnings,
          suggestions: [],
          confidence_score: 0,
        },
        required_fields: requiredFields,
        missing_fields: requiredFields,
        quality_indicators: {},
      };
    }

    // Check required fields
    requiredFields.forEach((field) => {
      if (!phaseData[field]) {
        missingFields.push(field);
        errors.push(`Missing required field: ${field}`);
      }
    });

    // Phase-specific validations
    if (phaseName === "functional_summary") {
      if (
        phaseData.complexity_level &&
        !["low", "medium", "high"].includes(phaseData.complexity_level)
      ) {
        errors.push("Invalid complexity_level value");
      }
      if (phaseData.key_features && !Array.isArray(phaseData.key_features)) {
        errors.push("key_features must be an array");
      }
    }

    if (phaseName === "design_brief") {
      if (
        phaseData.theme &&
        !["dark", "light", "mixed"].includes(phaseData.theme)
      ) {
        errors.push("Invalid theme value");
      }
      if (phaseData.primary_color && !phaseData.primary_color.startsWith("#")) {
        warnings.push("Primary color should be a hex value");
      }
    }

    if (phaseName === "visual_system") {
      if (phaseData.colors && !phaseData.colors.primary) {
        errors.push("Missing primary color in visual system");
      }
      if (phaseData.typography && !phaseData.typography.font_families) {
        errors.push("Missing font families in typography");
      }
    }

    const confidenceScore = this.calculatePhaseConfidence(
      phaseData,
      requiredFields.length - missingFields.length
    );

    return {
      phase_name: phaseName,
      result: {
        valid: errors.length === 0,
        errors,
        warnings,
        suggestions: this.generatePhaseSuggestions(phaseName, phaseData),
        confidence_score: confidenceScore,
      },
      required_fields: requiredFields,
      missing_fields: missingFields,
      quality_indicators: this.extractQualityIndicators(phaseName, phaseData),
    };
  }

  /**
   * Calculate overall confidence score for the manifest
   */
  private calculateOverallConfidence(manifest: any): number {
    if (!manifest.phases) return 0;

    const phaseScores = Object.values(manifest.phases).map((phase: any) =>
      this.calculatePhaseConfidence(phase, Object.keys(phase).length)
    );

    const averageScore =
      phaseScores.reduce((sum, score) => sum + score, 0) / phaseScores.length;

    // Boost score if metadata indicates AI generation
    if (manifest.metadata?.ai_model_used) {
      return Math.min(1, averageScore + 0.1);
    }

    return averageScore;
  }

  /**
   * Calculate confidence score for a single phase
   */
  private calculatePhaseConfidence(phaseData: any, fieldCount: number): number {
    if (!phaseData) return 0;

    const totalFields = Object.keys(phaseData).length;
    const completeness = fieldCount / Math.max(totalFields, 1);

    // Additional quality checks
    let qualityBonus = 0;
    if (phaseData.colors?.primary) qualityBonus += 0.1;
    if (phaseData.typography?.font_families) qualityBonus += 0.1;
    if (phaseData.design_anchors?.length > 0) qualityBonus += 0.1;

    return Math.min(1, completeness + qualityBonus);
  }

  /**
   * Generate suggestions for improving a phase
   */
  private generatePhaseSuggestions(
    phaseName: string,
    phaseData: any
  ): string[] {
    const suggestions: string[] = [];

    switch (phaseName) {
      case "functional_summary":
        if (!phaseData.user_personas) {
          suggestions.push(
            "Add user personas to better understand target audience"
          );
        }
        if (!phaseData.business_goals) {
          suggestions.push("Define business goals for better alignment");
        }
        break;

      case "design_brief":
        if (!phaseData.accessibility_focus) {
          suggestions.push("Add accessibility focus areas");
        }
        if (phaseData.inspiration_sources?.length < 3) {
          suggestions.push(
            "Add more inspiration sources for richer design direction"
          );
        }
        break;

      case "visual_system":
        if (!phaseData.colors?.success) {
          suggestions.push("Add semantic colors (success, warning, error)");
        }
        if (!phaseData.motion?.duration) {
          suggestions.push("Define motion timing for better consistency");
        }
        break;

      case "component_hierarchy":
        if (phaseData.components?.length === 0) {
          suggestions.push("Define specific components needed for the project");
        }
        if (!phaseData.design_patterns?.length) {
          suggestions.push("Identify design patterns to maintain consistency");
        }
        break;
    }

    return suggestions;
  }

  /**
   * Extract quality indicators for a phase
   */
  private extractQualityIndicators(
    phaseName: string,
    phaseData: any
  ): Record<string, any> {
    const indicators: Record<string, any> = {};

    switch (phaseName) {
      case "functional_summary":
        indicators.feature_count = phaseData.key_features?.length || 0;
        indicators.has_personas = !!phaseData.user_personas?.length;
        indicators.has_goals = !!phaseData.business_goals?.length;
        break;

      case "design_brief":
        indicators.inspiration_count =
          phaseData.inspiration_sources?.length || 0;
        indicators.has_accessibility = !!phaseData.accessibility_focus?.length;
        indicators.color_count = phaseData.support_colors?.length || 0;
        break;

      case "visual_system":
        indicators.color_completeness = this.calculateColorCompleteness(
          phaseData.colors
        );
        indicators.typography_completeness =
          this.calculateTypographyCompleteness(phaseData.typography);
        break;

      case "component_hierarchy":
        indicators.screen_count = phaseData.screens?.length || 0;
        indicators.component_count = phaseData.components?.length || 0;
        indicators.pattern_count = phaseData.design_patterns?.length || 0;
        break;
    }

    return indicators;
  }

  /**
   * Calculate color completeness score
   */
  private calculateColorCompleteness(colors: any): number {
    if (!colors) return 0;

    const requiredColors = [
      "primary",
      "background",
      "surface",
      "text",
      "text_muted",
    ];
    const optionalColors = [
      "secondary",
      "accent",
      "border",
      "success",
      "warning",
      "error",
    ];

    const requiredCount = requiredColors.filter(
      (color) => colors[color]
    ).length;
    const optionalCount = optionalColors.filter(
      (color) => colors[color]
    ).length;

    return (
      requiredCount / requiredColors.length +
      (optionalCount / optionalColors.length) * 0.3
    );
  }

  /**
   * Calculate typography completeness score
   */
  private calculateTypographyCompleteness(typography: any): number {
    if (!typography) return 0;

    let score = 0;
    if (typography.font_families?.heading) score += 0.3;
    if (typography.font_families?.body) score += 0.3;
    if (typography.scale) score += 0.2;
    if (typography.weights) score += 0.2;

    return Math.min(1, score);
  }

  /**
   * Enrich context with design manifest data
   */
  async enrichContextWithDesign(
    prd: string,
    types: string = "",
    brand: string = ""
  ): Promise<EnrichedContext> {
    const manifest = await this.loadDesignManifest();

    if (!manifest) {
      throw new Error("No design manifest found. Run design pipeline first.");
    }

    return {
      project_summary: manifest.phases.functional_summary,
      design_system: manifest.phases.visual_system,
      design_intent: manifest.phases.design_intent,
      component_architecture: manifest.phases.component_hierarchy,
      technical_context: {
        prd,
        types,
        brand,
      },
      implementation_guidelines: manifest.phases.implementation_plan,
      design_principles: manifest.phases.design_brief.ui_principles,
      visual_tokens: this.extractVisualTokens(manifest.phases.visual_system),
      interaction_patterns:
        manifest.phases.component_hierarchy.interaction_flows,
      accessibility_requirements:
        manifest.phases.design_brief.accessibility_focus || [],

      // NEW: Intent-based specifications
      enriched_intents:
        manifest.phases.intent_validation?.enriched_intents || [],
      intent_validation_report:
        manifest.phases.intent_validation?.validation_report || undefined,
      intent_clarifications:
        manifest.phases.intent_validation?.clarifications || [],
    };
  }

  /**
   * Extract visual tokens for easy consumption
   */
  private extractVisualTokens(visualSystem: any): Record<string, any> {
    return {
      colors: visualSystem.colors,
      spacing: visualSystem.spacing,
      typography: visualSystem.typography,
      radii: visualSystem.radii,
      shadows: visualSystem.shadows,
      motion: visualSystem.motion,
      breakpoints: visualSystem.breakpoints,
    };
  }

  /**
   * Get design manifest summary for display
   */
  async getManifestSummary(): Promise<string> {
    const manifest = await this.loadDesignManifest();

    if (!manifest) {
      return "No design manifest found";
    }

    const { phases } = manifest;
    const summary = [
      `🎨 Design Manifest: ${manifest.project_name}`,
      `📱 Platform: ${phases.functional_summary.platform}`,
      `🎯 Scope: ${phases.project_scope.build_scope}`,
      `🎨 Theme: ${phases.design_brief.theme}`,
      `🎨 Primary Color: ${phases.design_brief.primary_color}`,
      `📐 Components: ${phases.component_hierarchy.components.length}`,
      `📱 Screens: ${phases.component_hierarchy.screens.length}`,
      `⚡ Framework: ${phases.implementation_plan.framework}`,
      `🎯 Design Anchors: ${phases.design_intent.design_anchors.join(", ")}`,
    ];

    return summary.join("\n");
  }

  /**
   * Check if manifest needs regeneration based on age or changes
   */
  async shouldRegenerateManifest(maxAgeHours: number = 24): Promise<boolean> {
    const manifest = await this.loadDesignManifest();

    if (!manifest) return true;

    const generatedAt = new Date(manifest.generated_at);
    const ageHours = (Date.now() - generatedAt.getTime()) / (1000 * 60 * 60);

    return ageHours > maxAgeHours;
  }

  /**
   * Get manifest file path
   */
  getManifestPath(): string {
    return this.manifestPath;
  }

  /**
   * Check if manifest file exists
   */
  async manifestExists(): Promise<boolean> {
    return await fs.pathExists(this.manifestPath);
  }

  /**
   * Delete manifest file
   */
  async deleteManifest(): Promise<void> {
    try {
      if (await fs.pathExists(this.manifestPath)) {
        await fs.remove(this.manifestPath);
        console.log(chalk.yellow("🗑️  Design manifest deleted"));
      }
    } catch (error) {
      console.error(chalk.red("❌ Failed to delete design manifest:"), error);
      throw error;
    }
  }
  /**
   * Create a default design manifest
   */
  createDefaultManifest(projectName: string, description: string): DesignManifest {
    const timestamp = new Date().toISOString();
    return {
      version: "1.0.0",
      generated_at: timestamp,
      project_name: projectName,
      phases: {
        functional_summary: {
          app_name: projectName,
          core_purpose: description,
          key_features: [],
          primary_user_actions: [],
          platform: "web",
          technical_requirements: [],
          complexity_level: "low",
        },
        project_scope: {
          build_scope: "full_app",
          reason: "Default initialization",
          expected_outputs: [],
        },
        context_gaps: {
          missing: ["PRD detail", "User flows", "Design tokens"],
          recommended_next_action: "Run 'mycontext generate context --full' to flesh out requirements",
        },
        design_brief: {
          theme: "light",
          inspiration_sources: [],
          blended_style: "modern",
          primary_color: "#3B82F6",
          support_colors: [],
          typography: {
            heading: "Inter",
            body: "Inter",
          },
          ui_principles: [],
          motion_style: "normal",
          personality_keywords: [],
          emotional_tone: "professional",
          target_audience: "General users",
        },
        visual_system: {
          colors: {
            primary: "#3B82F6",
            background: "#FFFFFF",
            surface: "#F9FAFB",
            text: "#111827",
            text_muted: "#6B7280",
          },
          typography: {
            font_families: {
              heading: "Inter",
              body: "Inter",
              mono: "ui-monospace",
            },
            scale: {
              xs: "0.75rem",
              sm: "0.875rem",
              md: "1rem",
              lg: "1.125rem",
              xl: "1.25rem",
              "2xl": "1.5rem",
              "3xl": "1.875rem",
              "4xl": "2.25rem",
            },
            weights: {
              normal: "400",
              medium: "500",
              semibold: "600",
              bold: "700",
            },
          },
          spacing: {
            xs: "0.25rem",
            sm: "0.5rem",
            md: "1rem",
            lg: "1.5rem",
            xl: "2rem",
            "2xl": "3rem",
            "3xl": "4rem",
            "4xl": "6rem",
          },
          radii: {
            none: "0",
            sm: "0.125rem",
            md: "0.25rem",
            lg: "0.5rem",
            xl: "0.75rem",
            full: "9999px",
          },
          shadows: {
            sm: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
            md: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
            lg: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
            xl: "0 20px 25px -5px rgb(0 0 0 / 0.1)",
          },
          motion: {
            duration: {
              fast: "150ms",
              normal: "250ms",
              slow: "350ms",
            },
            easing: {
              linear: "linear",
              ease_in: "cubic-bezier(0.4, 0, 1, 1)",
              ease_out: "cubic-bezier(0, 0, 0.2, 1)",
              ease_in_out: "cubic-bezier(0.4, 0, 0.2, 1)",
            },
          },
          breakpoints: {
            sm: "640px",
            md: "768px",
            lg: "1024px",
            xl: "1280px",
          },
        },
        component_hierarchy: {
          screens: [],
          components: [],
          design_patterns: [],
          interaction_flows: [],
          state_management: [],
          data_flow: [],
        },
        implementation_plan: {
          framework: "nextjs",
          pages: [],
          state_management: "react-query",
          build_requirements: [],
          data_persistence: "vantage",
          performance_optimizations: [],
          accessibility_implementation: [],
          testing_strategy: [],
        },
        design_intent: {
          visual_philosophy: "Clean, professional, and accessible",
          design_anchors: ["modern", "trustworthy"],
          user_experience_goals: ["ease of use", "clarity"],
          brand_alignment: "Aligned with modern professional standards",
          technical_constraints: ["Responsive design", "Accessibility compliance"],
          scalability_considerations: ["Component-based architecture"],
          maintenance_guidelines: ["Documented props", "Consistent naming"],
          success_criteria: ["Project initialized", "Manifest generated"],
        },
        state_attestation: {
          last_audit_at: timestamp,
          drift_score: 0,
          compliance_status: "compliant",
          untracked_changes: [],
        },
      },
      metadata: {
        confidence_scores: {},
        fallbacks_used: [],
        generation_time_ms: 0,
      },
    };
  }
}
