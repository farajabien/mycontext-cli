import {
  DesignManifestManager,
  EnrichedContext,
  DesignManifest,
  FunctionalSummary,
  VisualSystem,
  DesignIntent,
  ComponentHierarchy,
  ImplementationPlan,
} from "@mycontext/core";
import chalk from "chalk";

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
   * Format context for optimal model consumption
   */
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
