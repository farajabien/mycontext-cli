import {
  DesignManifestManager,
  EnrichedContext,
  DesignManifest,
  FunctionalSummary,
  VisualSystem,
  DesignIntent,
  ComponentHierarchy,
  ImplementationPlan,
} from "@myycontext/core";
import chalk from "chalk";
import { ContextRenderer } from "./contextRenderer";
import * as path from "path";
import * as fs from "fs-extra";

/**
 * Context Enricher
 *
 * Merges all context files (PRD, types, brand, design manifest) into a unified
 * enriched context for optimal component generation.
 */
export class ContextEnricher {
  private manifestManager: DesignManifestManager;

  constructor(projectPath: string = process.cwd()) {
    this.manifestManager = new DesignManifestManager(projectPath);
  }

  /**
   * Merge all context files with design manifest
   */
  async mergeAllContext(
    prd: string,
    types: string = "",
    brand: string = "",
    componentList: string = ""
  ): Promise<EnrichedContext> {
    console.log(chalk.blue("🔄 Enriching context with design manifest..."));

    try {
      // Load design manifest
      const manifest = await this.manifestManager.loadDesignManifest();

      if (!manifest) {
        throw new Error(
          "No design manifest found. Run design pipeline first with: mycontext design analyze"
        );
      }

      // Create enriched context
      const enrichedContext =
        await this.manifestManager.enrichContextWithDesign(prd, types, brand);

      // Add additional context from component list
      if (componentList) {
        enrichedContext.component_architecture = this.mergeComponentList(
          enrichedContext.component_architecture,
          componentList
        );
      }

      // Add design reasoning context (extend the interface)
      (enrichedContext as any).design_reasoning =
        this.generateDesignReasoning(manifest);

      console.log(chalk.green("✅ Context enriched successfully"));
      console.log(
        chalk.gray(
          `   Design system: ${enrichedContext.design_system.colors.primary} primary color`
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

      return enrichedContext;
    } catch (error) {
      console.error(chalk.red("❌ Context enrichment failed:"), error);
      throw error;
    }
  }

  /**
   * Enrich context using the Living Brain (context.json)
   */
  async enrichWithBrain(
    contextFiles: any,
    brain: any
  ): Promise<EnrichedContext> {
    console.log(chalk.blue("🔄 Enriching context directly from Living Brain..."));

    // Transform Brain JSON to EnrichedContext with full type compliance
    const enrichedContext: EnrichedContext = {
      project_summary: {
        app_name: brain.project_name || "MyContext App",
        core_purpose: brain.prd?.problemStatement || "",
        platform: "web",
        complexity_level: "medium",
        key_features: (brain.features || []).map((f: any) => f.name),
        primary_user_actions: (brain.flows || []).map((f: any) => f.name),
        technical_requirements: [
          ...(brain.specs?.techStack?.frontend || []),
          ...(brain.specs?.techStack?.backend || []),
        ],
      },
      design_system: {
        colors: {
          primary: brain.brand?.colors?.primary || "#3b82f6",
          background: brain.brand?.colors?.background || "#ffffff",
          surface: brain.brand?.colors?.surface || "#ffffff",
          secondary: brain.brand?.colors?.secondary || "#64748b",
          accent: brain.brand?.colors?.accent || "#3b82f6",
          border: "#e2e8f0",
          success: "#22c55e",
          warning: "#f59e0b",
          error: "#ef4444",
          text: brain.brand?.colors?.text || "#0f172a",
          text_muted: brain.brand?.colors?.textMuted || "#64748b"
        },
        typography: {
          font_families: {
            heading: brain.brand?.typography?.fontFamily || "Inter",
            body: brain.brand?.typography?.fontFamily || "Inter",
            mono: "JetBrains Mono, monospace"
          },
          scale: { 
            xs: "0.75rem", 
            sm: "0.875rem", 
            md: "1rem", 
            lg: "1.125rem", 
            xl: "1.25rem", 
            "2xl": "1.5rem", 
            "3xl": "1.875rem",
            "4xl": "2.25rem"
          },
          weights: {
            normal: "400",
            medium: "500",
            semibold: "600",
            bold: "700"
          }
        },
        spacing: { 
          xs: "0.25rem", 
          sm: "0.5rem", 
          md: "1rem", 
          lg: "1.5rem", 
          xl: "2rem", 
          "2xl": "3rem", 
          "3xl": "4rem",
          "4xl": "5rem"
        },
        radii: { 
          none: "0", 
          sm: "0.125rem", 
          md: "0.375rem", 
          lg: "0.5rem", 
          xl: "0.75rem", 
          full: "9999px" 
        },
        shadows: { 
          sm: "0 1px 2px 0 rgb(0 0 0 / 0.05)", 
          md: "0 4px 6px -1px rgb(0 0 0 / 0.1)", 
          lg: "0 10px 15px -3px rgb(0 0 0 / 0.1)", 
          xl: "0 20px 25px -5px rgb(0 0 0 / 0.1)" 
        },
        motion: { 
          duration: { fast: "100ms", normal: "200ms", slow: "300ms" }, 
          easing: { linear: "linear", ease_in: "ease-in", ease_out: "ease-out", ease_in_out: "ease-in-out" } 
        },
        breakpoints: {
          sm: "640px",
          md: "768px",
          lg: "1024px",
          xl: "1280px"
        }
      },
      design_intent: {
        visual_philosophy: brain.brand?.designPrinciples?.join(". ") || "",
        design_anchors: brain.brand?.designPrinciples || [],
        user_experience_goals: ["Simplicity", "Speed", "Clarity"],
        brand_alignment: "Consistent with brand guidelines",
        technical_constraints: [],
        success_criteria: (brain.prd?.successMetrics || []),
        scalability_considerations: ["Modular components", "Atomic design"],
        maintenance_guidelines: ["Use shared components", "Follow type system"],
      },
      component_architecture: {
        screens: (brain.flows || []).map((f: any) => ({
          name: f.name,
          description: f.description,
          layout_type: "standard",
        })),
        components: (brain.components || []).map((c: any) => ({
          name: c.name,
          description: c.description,
          type: c.type,
        })),
        design_patterns: [] as string[],
        interaction_flows: [] as any[],
        state_management: [] as any[],
        data_flow: [] as any[],
      },
      technical_context: {
        prd: ContextRenderer.renderPRD(brain),
        types: ContextRenderer.renderTypesGuide(brain),
        brand: ContextRenderer.renderBrandGuide(brain),
      },
      implementation_guidelines: {
        framework: brain.specs?.architecture || "nextjs-app-router",
        state_management: "React Context/Zustand",
        data_persistence: brain.specs?.techStack?.backend?.join(", ") || "InstantDB",
        pages: (brain.flows || []).map((f: any) => f.name),
        build_requirements: [],
        performance_optimizations: [],
        accessibility_implementation: [],
        testing_strategy: [],
      } as any, // Temporary override for pages type mismatch if existing
      design_principles: brain.brand?.designPrinciples || [],
      visual_tokens: {},
      interaction_patterns: [],
      accessibility_requirements: [],
    };

    return enrichedContext;
  }
  formatContextForModel(context: EnrichedContext): string {
    const sections = [
      this.formatProjectSummary(context.project_summary),
      this.formatDesignSystem(context.design_system),
      this.formatDesignIntent(context.design_intent),
      this.formatComponentArchitecture(context.component_architecture),
      this.formatTechnicalContext(context.technical_context),
      this.formatImplementationGuidelines(context.implementation_guidelines),
      this.formatDesignPrinciples(context.design_principles),
      this.formatVisualTokens(context.visual_tokens),
      this.formatInteractionPatterns(context.interaction_patterns),
      this.formatAccessibilityRequirements(context.accessibility_requirements),
    ];

    return sections.filter((section) => section.trim().length > 0).join("\n\n");
  }

  /**
   * Compress context for token efficiency
   */
  compressContext(context: EnrichedContext): EnrichedContext {
    return {
      ...context,
      // Keep essential design tokens, remove verbose descriptions
      visual_tokens: this.compressVisualTokens(context.visual_tokens),
      design_principles: context.design_principles.slice(0, 5), // Top 5 principles
      interaction_patterns: context.interaction_patterns.slice(0, 3), // Top 3 patterns
    };
  }

  /**
   * Get context summary for display
   */
  getContextSummary(context: EnrichedContext): string {
    return [
      `📱 Project: ${context.project_summary.app_name}`,
      `🎯 Purpose: ${context.project_summary.core_purpose}`,
      `🎨 Theme: ${
        context.design_system.colors.background === "#FFFFFF" ? "Light" : "Dark"
      }`,
      `🎨 Primary: ${context.design_system.colors.primary}`,
      `📐 Components: ${context.component_architecture.components.length}`,
      `📱 Screens: ${context.component_architecture.screens.length}`,
      `⚡ Framework: ${context.implementation_guidelines.framework}`,
      `🎯 Anchors: ${context.design_intent.design_anchors.join(", ")}`,
    ].join("\n");
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  private formatProjectSummary(summary: FunctionalSummary): string {
    return `## PROJECT SUMMARY
**App Name:** ${summary.app_name}
**Core Purpose:** ${summary.core_purpose}
**Platform:** ${summary.platform}
**Complexity:** ${summary.complexity_level}

**Key Features:**
${summary.key_features.map((f) => `- ${f}`).join("\n")}

**Primary User Actions:**
${summary.primary_user_actions.map((a) => `- ${a}`).join("\n")}

**Technical Requirements:**
${summary.technical_requirements.map((r) => `- ${r}`).join("\n")}`;
  }

  private formatDesignSystem(system: VisualSystem): string {
    return `## DESIGN SYSTEM

**Colors:**
- Primary: ${system.colors.primary}
- Background: ${system.colors.background}
- Surface: ${system.colors.surface}
- Text: ${system.colors.text}
- Text Muted: ${system.colors.text_muted}
${system.colors.success ? `- Success: ${system.colors.success}` : ""}
${system.colors.warning ? `- Warning: ${system.colors.warning}` : ""}
${system.colors.error ? `- Error: ${system.colors.error}` : ""}

**Typography:**
- Heading: ${system.typography.font_families.heading}
- Body: ${system.typography.font_families.body}
- Scale: ${Object.entries(system.typography.scale)
      .map(([size, value]) => `${size}: ${value}`)
      .join(", ")}

**Spacing Scale:**
${Object.entries(system.spacing)
  .map(([size, value]) => `- ${size}: ${value}`)
  .join("\n")}

**Border Radius:**
${Object.entries(system.radii)
  .map(([size, value]) => `- ${size}: ${value}`)
  .join("\n")}

**Shadows:**
${Object.entries(system.shadows)
  .map(([size, value]) => `- ${size}: ${value}`)
  .join("\n")}

**Motion:**
- Duration: ${Object.entries(system.motion.duration)
      .map(([type, value]) => `${type}: ${value}`)
      .join(", ")}
- Easing: ${Object.entries(system.motion.easing)
      .map(([type, value]) => `${type}: ${value}`)
      .join(", ")}`;
  }

  private formatDesignIntent(intent: DesignIntent): string {
    return `## DESIGN INTENT

**Visual Philosophy:**
${intent.visual_philosophy}

**Design Anchors:**
${intent.design_anchors.map((anchor) => `- ${anchor}`).join("\n")}

**User Experience Goals:**
${intent.user_experience_goals.map((goal) => `- ${goal}`).join("\n")}

**Brand Alignment:**
${intent.brand_alignment}

**Technical Constraints:**
${intent.technical_constraints
  .map((constraint) => `- ${constraint}`)
  .join("\n")}

**Success Criteria:**
${intent.success_criteria.map((criteria) => `- ${criteria}`).join("\n")}`;
  }

  private formatComponentArchitecture(
    architecture: ComponentHierarchy
  ): string {
    return `## COMPONENT ARCHITECTURE

**Screens:**
${architecture.screens
  .map(
    (screen) =>
      `- **${screen.name}**: ${screen.description} (${screen.layout_type})`
  )
  .join("\n")}

**Components:**
${architecture.components
  .map(
    (component) =>
      `- **${component.name}**: ${component.description} (${component.type})`
  )
  .join("\n")}

**Design Patterns:**
${architecture.design_patterns.map((pattern) => `- ${pattern}`).join("\n")}

**Interaction Flows:**
${architecture.interaction_flows.map((flow) => `- ${flow}`).join("\n")}

**State Management:**
${architecture.state_management.map((state) => `- ${state}`).join("\n")}

**Data Flow:**
${architecture.data_flow}`;
  }

  private formatTechnicalContext(technical: {
    prd: string;
    types: string;
    brand: string;
  }): string {
    const sections = [];

    if (technical.prd) {
      sections.push(`**PRD Context:**\n${technical.prd.slice(0, 500)}...`);
    }

    if (technical.types) {
      sections.push(
        `**Type Definitions:**\n${technical.types.slice(0, 300)}...`
      );
    }

    if (technical.brand) {
      sections.push(
        `**Brand Guidelines:**\n${technical.brand.slice(0, 300)}...`
      );
    }

    return sections.length > 0
      ? `## TECHNICAL CONTEXT\n\n${sections.join("\n\n")}`
      : "";
  }

  private formatImplementationGuidelines(
    guidelines: ImplementationPlan
  ): string {
    return `## IMPLEMENTATION GUIDELINES

**Framework:** ${guidelines.framework}
**State Management:** ${guidelines.state_management}
**Data Persistence:** ${guidelines.data_persistence}

**Build Requirements:**
${guidelines.build_requirements.map((req) => `- ${req}`).join("\n")}

**Performance Optimizations:**
${guidelines.performance_optimizations.map((opt) => `- ${opt}`).join("\n")}

**Accessibility Implementation:**
${guidelines.accessibility_implementation.map((acc) => `- ${acc}`).join("\n")}

**Testing Strategy:**
${guidelines.testing_strategy.map((test) => `- ${test}`).join("\n")}`;
  }

  private formatDesignPrinciples(principles: string[]): string {
    return `## DESIGN PRINCIPLES

${principles.map((principle) => `- ${principle}`).join("\n")}`;
  }

  private formatVisualTokens(tokens: Record<string, any>): string {
    return `## VISUAL TOKENS

**Available for component styling:**
- Colors: Use CSS variables or Tailwind classes
- Spacing: Use consistent spacing scale
- Typography: Follow font family and scale
- Shadows: Apply appropriate elevation
- Motion: Use defined timing and easing`;
  }

  private formatInteractionPatterns(patterns: string[]): string {
    return patterns.length > 0
      ? `## INTERACTION PATTERNS

${patterns.map((pattern) => `- ${pattern}`).join("\n")}`
      : "";
  }

  private formatAccessibilityRequirements(requirements: string[]): string {
    return requirements.length > 0
      ? `## ACCESSIBILITY REQUIREMENTS

${requirements.map((req) => `- ${req}`).join("\n")}`
      : "";
  }

  private mergeComponentList(
    existing: ComponentHierarchy,
    componentList: string
  ): ComponentHierarchy {
    try {
      const parsedList = JSON.parse(componentList);

      if (parsedList.components && Array.isArray(parsedList.components)) {
        return {
          ...existing,
          components: [...existing.components, ...parsedList.components],
        };
      }
    } catch (error) {
      console.warn(
        chalk.yellow(
          "⚠️  Failed to parse component list, using existing architecture"
        )
      );
    }

    return existing;
  }

  private generateDesignReasoning(manifest: DesignManifest): string {
    const { phases } = manifest;

    return `## DESIGN REASONING

**Why this design direction?**
${phases.design_brief.blended_style}

**Inspiration sources:**
${phases.design_brief.inspiration_sources
  .map((source) => `- ${source.name}: ${source.style}`)
  .join("\n")}

**Personality keywords:**
${phases.design_brief.personality_keywords.join(", ")}

**Emotional tone:**
${phases.design_brief.emotional_tone}

**Target audience:**
${phases.design_brief.target_audience}`;
  }

  private compressVisualTokens(
    tokens: Record<string, any>
  ): Record<string, any> {
    // Keep only essential tokens for token efficiency
    return {
      colors: {
        primary: tokens.colors?.primary,
        background: tokens.colors?.background,
        surface: tokens.colors?.surface,
        text: tokens.colors?.text,
        text_muted: tokens.colors?.text_muted,
      },
      spacing: {
        sm: tokens.spacing?.sm,
        md: tokens.spacing?.md,
        lg: tokens.spacing?.lg,
      },
      typography: {
        heading: tokens.typography?.font_families?.heading,
        body: tokens.typography?.font_families?.body,
      },
    };
  }
}
