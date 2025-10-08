import { SubAgent } from "../interfaces/SubAgent";
import { HybridAIClient } from "../../utils/hybridAIClient";
import { FileSystemManager } from "../../utils/fileSystem";
import {
  DesignPipelineStateManager,
  DesignPipelineState,
} from "../../utils/designPipelineStateManager";
import {
  DesignPipelineInput,
  DesignPipelineOutput,
  DesignManifest,
  FunctionalSummary,
  ProjectScope,
  ContextGaps,
  DesignBrief,
  VisualSystem,
  ComponentHierarchy,
  ImplementationPlan,
  DesignIntent,
  FallbackResult,
  ValidationResult,
} from "../../types/design-pipeline";
import chalk from "chalk";

/**
 * DesignPipelineAgent
 *
 * Implements an 8-phase design reasoning pipeline as a SubAgent.
 * Each phase has AI generation with rule-based fallbacks for model-agnostic reliability.
 */
export class DesignPipelineAgent
  implements SubAgent<DesignPipelineInput, DesignPipelineOutput>
{
  name = "DesignPipelineAgent";
  description =
    "RICH design reasoning pipeline that generates rich visual context for component generation";
  personality = "methodical, design-focused, context-aware, systematic";
  llmProvider = "hybrid";
  expertise = [
    "design system creation",
    "visual reasoning",
    "user experience analysis",
    "component architecture",
    "design token generation",
    "aesthetic synthesis",
  ];

  private ai: HybridAIClient;
  private fs: FileSystemManager;
  private stateManager: DesignPipelineStateManager;
  private fallbacks: Map<string, (input: any) => FallbackResult> = new Map();

  constructor(projectPath: string = process.cwd()) {
    this.ai = new HybridAIClient();
    this.fs = new FileSystemManager();
    this.stateManager = new DesignPipelineStateManager(projectPath);
    this.initializeFallbacks();
  }

  async run(
    input: DesignPipelineInput,
    resumeFromState: boolean = false
  ): Promise<DesignPipelineOutput> {
    console.log(chalk.blue("🎨 Starting mycontext Design Pipeline..."));

    const startTime = Date.now();
    const warnings: string[] = [];
    const errors: string[] = [];
    const fallbacksUsed: string[] = [];

    // Load existing state if resuming
    let existingState: DesignPipelineState | null = null;
    let completedPhases: number[] = [];
    let partialResults: Record<string, any> = {};

    if (resumeFromState) {
      existingState = await this.stateManager.loadState();
      if (existingState) {
        completedPhases = existingState.completedPhases;
        partialResults = existingState.partialResults;
        console.log(
          chalk.blue(
            `🔄 Resuming from Phase ${
              existingState.failedPhase || existingState.currentPhase
            }...`
          )
        );
        console.log(
          chalk.gray(`   Completed phases: ${completedPhases.join(", ")}`)
        );
      } else {
        console.log(
          chalk.yellow("⚠️  No resumable state found, starting fresh")
        );
      }
    }

    try {
      // Phase 1: Parse PRD into Functional Summary
      if (!completedPhases.includes(1)) {
        console.log(chalk.gray("  Phase 1: Parsing PRD..."));
        const functionalSummary = await this.executePhaseWithErrorHandling(
          1,
          () => this.parsePRD(input.prd, input.project_path),
          partialResults
        );
        partialResults.functionalSummary = functionalSummary;
        completedPhases.push(1);
        await this.saveProgress(1, completedPhases, partialResults);
      } else {
        console.log(chalk.gray("  Phase 1: Using cached result..."));
        partialResults.functionalSummary = partialResults.functionalSummary;
      }

      // Phase 2: Classify Project Scope
      if (!completedPhases.includes(2)) {
        console.log(chalk.gray("  Phase 2: Classifying scope..."));
        const projectScope = await this.executePhaseWithErrorHandling(
          2,
          () => this.classifyScope(partialResults.functionalSummary),
          partialResults
        );
        partialResults.projectScope = projectScope;
        completedPhases.push(2);
        await this.saveProgress(2, completedPhases, partialResults);
      } else {
        console.log(chalk.gray("  Phase 2: Using cached result..."));
        partialResults.projectScope = partialResults.projectScope;
      }

      // Phase 3: Detect Missing Context
      if (!completedPhases.includes(3)) {
        console.log(chalk.gray("  Phase 3: Detecting context gaps..."));
        const contextGaps = await this.executePhaseWithErrorHandling(
          3,
          () => this.detectGaps(input, partialResults.functionalSummary),
          partialResults
        );
        partialResults.contextGaps = contextGaps;
        completedPhases.push(3);
        await this.saveProgress(3, completedPhases, partialResults);
      } else {
        console.log(chalk.gray("  Phase 3: Using cached result..."));
        partialResults.contextGaps = partialResults.contextGaps;
      }

      // Phase 4: Generate Design Brief
      if (!completedPhases.includes(4)) {
        console.log(chalk.gray("  Phase 4: Creating design brief..."));
        const designBrief = await this.executePhaseWithErrorHandling(
          4,
          () =>
            this.generateDesignBrief(
              partialResults.functionalSummary,
              partialResults.contextGaps
            ),
          partialResults
        );
        partialResults.designBrief = designBrief;
        completedPhases.push(4);
        await this.saveProgress(4, completedPhases, partialResults);
      } else {
        console.log(chalk.gray("  Phase 4: Using cached result..."));
        partialResults.designBrief = partialResults.designBrief;
      }

      // Phase 5: Build Visual System
      if (!completedPhases.includes(5)) {
        console.log(chalk.gray("  Phase 5: Building visual system..."));
        const visualSystem = await this.executePhaseWithErrorHandling(
          5,
          () =>
            this.buildVisualSystem(
              partialResults.designBrief,
              partialResults.functionalSummary
            ),
          partialResults
        );
        partialResults.visualSystem = visualSystem;
        completedPhases.push(5);
        await this.saveProgress(5, completedPhases, partialResults);
      } else {
        console.log(chalk.gray("  Phase 5: Using cached result..."));
        partialResults.visualSystem = partialResults.visualSystem;
      }

      // Phase 6: Define Component Hierarchy
      if (!completedPhases.includes(6)) {
        console.log(chalk.gray("  Phase 6: Defining component hierarchy..."));
        const componentHierarchy = await this.executePhaseWithErrorHandling(
          6,
          () =>
            this.defineHierarchy(
              partialResults.functionalSummary,
              partialResults.designBrief
            ),
          partialResults
        );
        partialResults.componentHierarchy = componentHierarchy;
        completedPhases.push(6);
        await this.saveProgress(6, completedPhases, partialResults);
      } else {
        console.log(chalk.gray("  Phase 6: Using cached result..."));
        partialResults.componentHierarchy = partialResults.componentHierarchy;
      }

      // Phase 7: Plan Implementation
      if (!completedPhases.includes(7)) {
        console.log(chalk.gray("  Phase 7: Planning implementation..."));
        const implementationPlan = await this.executePhaseWithErrorHandling(
          7,
          () =>
            this.planImplementation(
              partialResults.functionalSummary,
              partialResults.componentHierarchy
            ),
          partialResults
        );
        partialResults.implementationPlan = implementationPlan;
        completedPhases.push(7);
        await this.saveProgress(7, completedPhases, partialResults);
      } else {
        console.log(chalk.gray("  Phase 7: Using cached result..."));
        partialResults.implementationPlan = partialResults.implementationPlan;
      }

      // Phase 8: Synthesize Design Intent
      if (!completedPhases.includes(8)) {
        console.log(chalk.gray("  Phase 8: Synthesizing design intent..."));
        const designIntent = await this.executePhaseWithErrorHandling(
          8,
          () =>
            this.synthesizeIntent(
              partialResults.designBrief,
              partialResults.visualSystem,
              partialResults.functionalSummary
            ),
          partialResults
        );
        partialResults.designIntent = designIntent;
        completedPhases.push(8);
        await this.saveProgress(8, completedPhases, partialResults);
      } else {
        console.log(chalk.gray("  Phase 8: Using cached result..."));
        partialResults.designIntent = partialResults.designIntent;
      }

      // Create complete manifest
      const manifest: DesignManifest = {
        version: "1.0.0",
        generated_at: new Date().toISOString(),
        project_name: partialResults.functionalSummary.app_name,
        phases: {
          functional_summary: partialResults.functionalSummary,
          project_scope: partialResults.projectScope,
          context_gaps: partialResults.contextGaps,
          design_brief: partialResults.designBrief,
          visual_system: partialResults.visualSystem,
          component_hierarchy: partialResults.componentHierarchy,
          implementation_plan: partialResults.implementationPlan,
          design_intent: partialResults.designIntent,
        },
        metadata: {
          ai_model_used: "hybrid",
          confidence_scores: this.calculateConfidenceScores(),
          fallbacks_used: fallbacksUsed,
          generation_time_ms: Date.now() - startTime,
        },
      };

      // Clear state file on successful completion
      await this.stateManager.clearState();

      console.log(chalk.green("✅ Design pipeline completed successfully"));
      console.log(chalk.gray(`   Generated in ${Date.now() - startTime}ms`));
      console.log(
        chalk.gray(
          `   Design anchors: ${partialResults.designIntent.design_anchors.join(
            ", "
          )}`
        )
      );

      return {
        manifest,
        success: true,
        warnings,
        errors,
        fallbacks_used: fallbacksUsed,
      };
    } catch (error) {
      console.error(chalk.red("❌ Design pipeline failed:"), error);
      return {
        manifest: this.createEmptyManifest(input.project_path),
        success: false,
        warnings,
        errors: [
          ...errors,
          error instanceof Error ? error.message : String(error),
        ],
        fallbacks_used: fallbacksUsed,
      };
    }
  }

  // ============================================================================
  // ERROR HANDLING AND STATE MANAGEMENT
  // ============================================================================

  /**
   * Execute a phase with comprehensive error handling
   */
  private async executePhaseWithErrorHandling<T>(
    phaseNumber: number,
    phaseFunction: () => Promise<T>,
    partialResults: Record<string, any>
  ): Promise<T> {
    try {
      return await phaseFunction();
    } catch (error) {
      const failureType = this.detectFailureType(error);

      // Save failure state
      await this.stateManager.saveState({
        currentPhase: phaseNumber,
        completedPhases: Object.keys(partialResults).map(() => phaseNumber - 1),
        failedPhase: phaseNumber,
        failureReason: failureType,
        partialResults,
        projectPath: process.cwd(),
        timestamp: new Date(),
      });

      // Show comprehensive guidance
      this.showRecoveryGuidance(phaseNumber, failureType);

      // Throw to stop execution
      throw new Error(
        `Pipeline halted at Phase ${phaseNumber}: ${failureType}`
      );
    }
  }

  /**
   * Save progress after each successful phase
   */
  private async saveProgress(
    currentPhase: number,
    completedPhases: number[],
    partialResults: Record<string, any>
  ): Promise<void> {
    await this.stateManager.saveState({
      currentPhase: currentPhase + 1,
      completedPhases,
      partialResults,
      projectPath: process.cwd(),
      timestamp: new Date(),
    });
  }

  /**
   * Detect the type of failure from error
   */
  private detectFailureType(error: any): string {
    const errorMessage = error?.message?.toLowerCase() || "";
    const errorCode = error?.status || error?.code;

    if (errorCode === 429 || errorMessage.includes("rate limit")) {
      return "Rate limit exceeded";
    } else if (errorMessage.includes("timeout") || errorCode === "TIMEOUT") {
      return "Request timeout";
    } else if (
      errorCode === 401 ||
      errorCode === 403 ||
      errorMessage.includes("invalid key") ||
      errorMessage.includes("unauthorized")
    ) {
      return "API key error";
    } else if (
      errorMessage.includes("network") ||
      errorMessage.includes("connection")
    ) {
      return "Network error";
    } else if (
      errorMessage.includes("quota") ||
      errorMessage.includes("limit")
    ) {
      return "Quota exceeded";
    } else {
      return "Unknown error";
    }
  }

  /**
   * Show comprehensive recovery guidance
   */
  private showRecoveryGuidance(failedPhase: number, failureType: string): void {
    console.log(chalk.red("\n❌ Design Pipeline Halted"));
    console.log(
      chalk.yellow(`\n⚠️  Phase ${failedPhase} failed: ${failureType}`)
    );

    // Show completed phases
    console.log(chalk.green("\n✅ Completed Phases:"));
    for (let i = 1; i < failedPhase; i++) {
      console.log(chalk.gray(`   Phase ${i}: ${this.getPhaseName(i)}`));
    }

    // Show failure-specific guidance
    if (failureType.includes("Rate limit")) {
      console.log(chalk.blue("\n🕐 Rate Limit Detected:"));
      console.log(
        chalk.gray("   • Wait 60-120 seconds for rate limits to reset")
      );
      console.log(chalk.gray("   • Or switch to a different AI provider"));
      console.log(chalk.gray("   • Check your API usage limits"));
    } else if (failureType.includes("timeout")) {
      console.log(chalk.blue("\n⏱️  Timeout Detected:"));
      console.log(chalk.gray("   • The request took too long to complete"));
      console.log(chalk.gray("   • Try again with a different AI provider"));
      console.log(chalk.gray("   • Check your internet connection"));
    } else if (failureType.includes("API key")) {
      console.log(chalk.blue("\n🔑 API Key Error:"));
      console.log(chalk.gray("   • Check your API key configuration"));
      console.log(chalk.gray("   • Verify the key has sufficient permissions"));
      console.log(chalk.gray("   • Try a different AI provider"));
    } else if (failureType.includes("Network")) {
      console.log(chalk.blue("\n🌐 Network Error:"));
      console.log(chalk.gray("   • Check your internet connection"));
      console.log(chalk.gray("   • Try again in a few moments"));
      console.log(chalk.gray("   • Verify your network settings"));
    } else if (failureType.includes("Quota")) {
      console.log(chalk.blue("\n📊 Quota Exceeded:"));
      console.log(chalk.gray("   • You have exceeded your API quota"));
      console.log(chalk.gray("   • Wait for quota reset or upgrade your plan"));
      console.log(chalk.gray("   • Try a different AI provider"));
    }

    // Show resume command
    console.log(chalk.blue("\n🔄 To Resume:"));
    console.log(chalk.white("   mycontext design analyze --resume"));

    // Show alternative options
    console.log(chalk.blue("\n🔧 Alternative Options:"));
    console.log(
      chalk.gray(
        "   1. Switch AI provider: Set XAI_API_KEY, ANTHROPIC_API_KEY, or OPENAI_API_KEY"
      )
    );
    console.log(
      chalk.gray("   2. Start fresh: mycontext design analyze --regenerate")
    );
    console.log(chalk.gray("   3. Check status: mycontext design summary"));
    console.log(chalk.gray("   4. View state: mycontext design validate"));
  }

  /**
   * Get human-readable phase name
   */
  private getPhaseName(phaseNumber: number): string {
    const phaseNames = {
      1: "Parse PRD",
      2: "Classify Scope",
      3: "Detect Context Gaps",
      4: "Create Design Brief",
      5: "Build Visual System",
      6: "Define Component Hierarchy",
      7: "Plan Implementation",
      8: "Synthesize Design Intent",
    };
    return (
      phaseNames[phaseNumber as keyof typeof phaseNames] ||
      `Phase ${phaseNumber}`
    );
  }

  // ============================================================================
  // PHASE 1: PRD PARSING
  // ============================================================================

  private async parsePRD(
    prd: string,
    projectPath: string
  ): Promise<FunctionalSummary> {
    const prompt = `
You are a product analyst. Parse this PRD into a structured functional summary.

PRD:
${prd}

Output JSON with this exact structure:
{
  "app_name": "string",
  "core_purpose": "string", 
  "key_features": ["feature1", "feature2"],
  "primary_user_actions": ["action1", "action2"],
  "platform": "string",
  "technical_requirements": ["req1", "req2"],
  "complexity_level": "low|medium|high",
  "user_personas": ["persona1", "persona2"],
  "business_goals": ["goal1", "goal2"],
  "success_metrics": ["metric1", "metric2"]
}

Focus on extracting the core essence and user value proposition.`;

    try {
      const response = await this.ai.generateText(prompt, {
        temperature: 0.3,
        maxTokens: 1000,
      });

      const parsed = JSON.parse(response.text);
      return this.validateFunctionalSummary(parsed);
    } catch (error) {
      console.log(
        chalk.yellow("  ⚠️  AI parsing failed, using rule-based extraction")
      );
      return this.extractFunctionalSummaryFromPRD(prd);
    }
  }

  private extractFunctionalSummaryFromPRD(prd: string): FunctionalSummary {
    // Rule-based extraction as fallback
    const lines = prd.split("\n");
    const appName = this.extractAppName(prd);
    const features = this.extractFeatures(prd);
    const purpose = this.extractPurpose(prd);

    return {
      app_name: appName,
      core_purpose: purpose,
      key_features: features,
      primary_user_actions: this.extractUserActions(prd),
      platform: this.inferPlatform(prd),
      technical_requirements: this.extractTechnicalRequirements(prd),
      complexity_level: this.assessComplexity(features.length),
      user_personas: this.extractPersonas(prd),
      business_goals: this.extractBusinessGoals(prd),
      success_metrics: this.extractSuccessMetrics(prd),
    };
  }

  // ============================================================================
  // PHASE 2: SCOPE CLASSIFICATION
  // ============================================================================

  private async classifyScope(
    summary: FunctionalSummary
  ): Promise<ProjectScope> {
    const prompt = `
Classify this project's build scope based on the functional summary.

Summary: ${JSON.stringify(summary, null, 2)}

Options:
- single_component: One reusable component
- ui_page: Single page/screen with multiple components  
- full_app: Multi-screen application

Return JSON:
{
  "build_scope": "single_component|ui_page|full_app",
  "reason": "explanation",
  "expected_outputs": ["wireframes", "design tokens", "app structure"],
  "estimated_screens": number,
  "estimated_components": number,
  "development_phases": ["phase1", "phase2"],
  "technical_complexity": "simple|moderate|complex"
}`;

    try {
      const response = await this.ai.generateText(prompt, {
        temperature: 0.2,
        maxTokens: 500,
      });

      return JSON.parse(response.text);
    } catch (error) {
      return this.classifyScopeByRules(summary);
    }
  }

  private classifyScopeByRules(summary: FunctionalSummary): ProjectScope {
    const featureCount = summary.key_features.length;
    const hasMultipleScreens = summary.primary_user_actions.length > 3;

    let buildScope: "single_component" | "ui_page" | "full_app";
    if (featureCount <= 2 && !hasMultipleScreens) {
      buildScope = "single_component";
    } else if (featureCount <= 5 && summary.complexity_level !== "high") {
      buildScope = "ui_page";
    } else {
      buildScope = "full_app";
    }

    return {
      build_scope: buildScope,
      reason: `Based on ${featureCount} features and ${summary.complexity_level} complexity`,
      expected_outputs:
        buildScope === "full_app"
          ? [
              "design brief",
              "color palette",
              "component hierarchy",
              "screen wireframes",
            ]
          : ["design tokens", "component specs"],
      estimated_screens:
        buildScope === "full_app" ? Math.max(3, featureCount) : 1,
      estimated_components: Math.max(5, featureCount * 2),
      development_phases:
        buildScope === "full_app"
          ? ["Foundation", "Core Features", "Polish"]
          : ["Design", "Implementation"],
      technical_complexity: summary.complexity_level as
        | "simple"
        | "moderate"
        | "complex",
    };
  }

  // ============================================================================
  // PHASE 3: CONTEXT GAP DETECTION
  // ============================================================================

  private async detectGaps(
    input: DesignPipelineInput,
    summary: FunctionalSummary
  ): Promise<ContextGaps> {
    const missing: string[] = [];
    const hasBranding = !!input.branding && input.branding.length > 50;
    const hasTypes = !!input.types && input.types.length > 50;
    const hasComponentList =
      !!input.component_list && input.component_list.length > 50;

    if (!hasBranding)
      missing.push("visual direction", "brand personality", "color palette");
    if (!hasTypes) missing.push("data structures", "type definitions");
    if (!hasComponentList)
      missing.push("component specifications", "UI patterns");

    missing.push(
      "tone guidance",
      "accessibility requirements",
      "interaction patterns"
    );

    return {
      missing,
      recommended_next_action:
        missing.length > 3
          ? "Generate comprehensive design brief with AI assistance"
          : "Proceed with existing context and fill gaps during design generation",
      visual_direction_needed: !hasBranding,
      tone_guidance_needed: true,
      accessibility_requirements: [
        "WCAG 2.1 AA compliance",
        "keyboard navigation",
        "screen reader support",
      ],
      interaction_patterns: [
        "hover states",
        "loading states",
        "error handling",
      ],
      brand_consistency: hasBranding
        ? []
        : ["color usage", "typography", "spacing"],
    };
  }

  // ============================================================================
  // PHASE 4: DESIGN BRIEF GENERATION
  // ============================================================================

  private async generateDesignBrief(
    summary: FunctionalSummary,
    gaps: ContextGaps
  ): Promise<DesignBrief> {
    const prompt = `
Create a design inspiration brief for this project.

Project: ${summary.app_name}
Purpose: ${summary.core_purpose}
Features: ${summary.key_features.join(", ")}
Platform: ${summary.platform}
Complexity: ${summary.complexity_level}

Missing context: ${gaps.missing.join(", ")}

Generate 3 distinct visual directions, then blend the best elements.

Output JSON:
{
  "theme": "dark|light|mixed",
  "inspiration_sources": [
    {"name": "Brand", "style": "description", "reasoning": "why it fits"}
  ],
  "blended_style": "How you'd merge these styles",
  "primary_color": "#hex",
  "support_colors": ["#hex1", "#hex2"],
  "typography": {"heading": "font", "body": "font", "mono": "font"},
  "ui_principles": ["principle1", "principle2"],
  "motion_style": "description",
  "personality_keywords": ["word1", "word2"],
  "emotional_tone": "description",
  "target_audience": "description",
  "accessibility_focus": ["focus1", "focus2"]
}`;

    try {
      const response = await this.ai.generateText(prompt, {
        temperature: 0.7,
        maxTokens: 1500,
      });

      return JSON.parse(response.text);
    } catch (error) {
      return this.generateDesignBriefByRules(summary);
    }
  }

  private generateDesignBriefByRules(summary: FunctionalSummary): DesignBrief {
    const isDataFocused = summary.key_features.some(
      (f) =>
        f.toLowerCase().includes("dashboard") ||
        f.toLowerCase().includes("analytics")
    );
    const isConsumer = summary.key_features.some(
      (f) =>
        f.toLowerCase().includes("social") ||
        f.toLowerCase().includes("community")
    );

    const theme = isDataFocused ? "dark" : "light";
    const primaryColor = isConsumer ? "#3B82F6" : "#6366F1";

    return {
      theme,
      inspiration_sources: [
        { name: "Modern SaaS", style: "clean, professional, data-focused" },
        { name: "Material Design", style: "accessible, consistent, intuitive" },
        { name: "Tailwind UI", style: "utility-first, component-based" },
      ],
      blended_style:
        "Clean, modern interface with strong visual hierarchy and consistent spacing",
      primary_color: primaryColor,
      support_colors: ["#F8FAFC", "#1E293B", "#64748B", "#E2E8F0"],
      typography: {
        heading: "Inter",
        body: "Inter",
        mono: "JetBrains Mono",
      },
      ui_principles: ["clarity", "consistency", "accessibility", "performance"],
      motion_style: "smooth, purposeful transitions with easing",
      personality_keywords: ["professional", "clean", "intuitive", "reliable"],
      emotional_tone: "confident and approachable",
      target_audience: summary.user_personas?.[0] || "professional users",
      accessibility_focus: [
        "high contrast",
        "keyboard navigation",
        "screen reader support",
      ],
    };
  }

  // ============================================================================
  // PHASE 5: VISUAL SYSTEM GENERATION
  // ============================================================================

  private async buildVisualSystem(
    brief: DesignBrief,
    summary: FunctionalSummary
  ): Promise<VisualSystem> {
    const prompt = `
Create a complete design token system based on this design brief.

Brief: ${JSON.stringify(brief, null, 2)}

Generate a comprehensive visual system with colors, typography, spacing, shadows, and motion.

Output JSON:
{
  "colors": {
    "primary": "#hex",
    "secondary": "#hex", 
    "accent": "#hex",
    "background": "#hex",
    "surface": "#hex",
    "text": "#hex",
    "text_muted": "#hex",
    "border": "#hex",
    "success": "#hex",
    "warning": "#hex",
    "error": "#hex",
    "info": "#hex"
  },
  "typography": {
    "font_families": {"heading": "font", "body": "font", "mono": "font"},
    "scale": {"xs": "12px", "sm": "14px", "md": "16px", "lg": "18px", "xl": "20px", "2xl": "24px", "3xl": "30px", "4xl": "36px"},
    "weights": {"normal": "400", "medium": "500", "semibold": "600", "bold": "700"}
  },
  "spacing": {"xs": "4px", "sm": "8px", "md": "16px", "lg": "24px", "xl": "32px", "2xl": "48px", "3xl": "64px", "4xl": "96px"},
  "radii": {"none": "0px", "sm": "4px", "md": "8px", "lg": "12px", "xl": "16px", "full": "9999px"},
  "shadows": {"sm": "0 1px 2px rgba(0,0,0,0.05)", "md": "0 4px 6px rgba(0,0,0,0.1)", "lg": "0 10px 15px rgba(0,0,0,0.1)", "xl": "0 20px 25px rgba(0,0,0,0.1)"},
  "motion": {"duration": {"fast": "150ms", "normal": "300ms", "slow": "500ms"}, "easing": {"linear": "linear", "ease_in": "cubic-bezier(0.4,0,1,1)", "ease_out": "cubic-bezier(0,0,0.2,1)", "ease_in_out": "cubic-bezier(0.4,0,0.2,1)"}},
  "breakpoints": {"sm": "640px", "md": "768px", "lg": "1024px", "xl": "1280px"}
}`;

    try {
      const response = await this.ai.generateText(prompt, {
        temperature: 0.4,
        maxTokens: 2000,
      });

      return JSON.parse(response.text);
    } catch (error) {
      return this.generateVisualSystemByRules(brief);
    }
  }

  private generateVisualSystemByRules(brief: DesignBrief): VisualSystem {
    const isDark = brief.theme === "dark";
    const baseColors = isDark
      ? {
          bg: "#0F172A",
          surface: "#1E293B",
          text: "#F8FAFC",
          textMuted: "#94A3B8",
        }
      : {
          bg: "#FFFFFF",
          surface: "#F8FAFC",
          text: "#0F172A",
          textMuted: "#64748B",
        };

    return {
      colors: {
        primary: brief.primary_color,
        secondary: brief.support_colors[1] || "#64748B",
        accent: brief.support_colors[2] || "#3B82F6",
        background: baseColors.bg,
        surface: baseColors.surface,
        text: baseColors.text,
        text_muted: baseColors.textMuted,
        border: isDark ? "#334155" : "#E2E8F0",
        success: "#10B981",
        warning: "#F59E0B",
        error: "#EF4444",
        info: "#3B82F6",
      },
      typography: {
        font_families: {
          heading: brief.typography.heading,
          body: brief.typography.body,
          mono: brief.typography.mono || "JetBrains Mono",
        },
        scale: {
          xs: "12px",
          sm: "14px",
          md: "16px",
          lg: "18px",
          xl: "20px",
          "2xl": "24px",
          "3xl": "30px",
          "4xl": "36px",
        },
        weights: { normal: "400", medium: "500", semibold: "600", bold: "700" },
      },
      spacing: {
        xs: "4px",
        sm: "8px",
        md: "16px",
        lg: "24px",
        xl: "32px",
        "2xl": "48px",
        "3xl": "64px",
        "4xl": "96px",
      },
      radii: {
        none: "0px",
        sm: "4px",
        md: "8px",
        lg: "12px",
        xl: "16px",
        full: "9999px",
      },
      shadows: {
        sm: "0 1px 2px rgba(0,0,0,0.05)",
        md: "0 4px 6px rgba(0,0,0,0.1)",
        lg: "0 10px 15px rgba(0,0,0,0.1)",
        xl: "0 20px 25px rgba(0,0,0,0.1)",
      },
      motion: {
        duration: { fast: "150ms", normal: "300ms", slow: "500ms" },
        easing: {
          linear: "linear",
          ease_in: "cubic-bezier(0.4,0,1,1)",
          ease_out: "cubic-bezier(0,0,0.2,1)",
          ease_in_out: "cubic-bezier(0.4,0,0.2,1)",
        },
      },
      breakpoints: { sm: "640px", md: "768px", lg: "1024px", xl: "1280px" },
    };
  }

  // ============================================================================
  // PHASE 6: COMPONENT HIERARCHY
  // ============================================================================

  private async defineHierarchy(
    summary: FunctionalSummary,
    brief: DesignBrief
  ): Promise<ComponentHierarchy> {
    const prompt = `
Define the component hierarchy for this project.

Project: ${summary.app_name}
Features: ${summary.key_features.join(", ")}
User Actions: ${summary.primary_user_actions.join(", ")}
Platform: ${summary.platform}

Design Principles: ${brief.ui_principles.join(", ")}

Create screens and components needed to implement this app.

Output JSON:
{
  "screens": [
    {"name": "ScreenName", "description": "purpose", "purpose": "user goal", "components": ["Component1", "Component2"], "layout_type": "single_column|multi_column|grid|dashboard|modal", "navigation_flow": ["next_screen"], "user_journey_position": "entry|main|secondary|exit"}
  ],
  "components": [
    {"name": "ComponentName", "description": "purpose", "type": "layout|form|display|navigation|feedback|overlay", "props": [{"name": "prop", "type": "string", "required": true, "description": "purpose"}], "interactions": ["click", "hover"], "states": ["loading", "error"], "accessibility_requirements": ["aria-label"], "responsive_behavior": "description", "related_components": ["OtherComponent"]}
  ],
  "design_patterns": ["pattern1", "pattern2"],
  "interaction_flows": ["flow1", "flow2"],
  "state_management": ["local", "global"],
  "data_flow": ["description"]
}`;

    try {
      const response = await this.ai.generateText(prompt, {
        temperature: 0.5,
        maxTokens: 2000,
      });

      return JSON.parse(response.text);
    } catch (error) {
      return this.defineHierarchyByRules(summary);
    }
  }

  private defineHierarchyByRules(
    summary: FunctionalSummary
  ): ComponentHierarchy {
    const screens = this.generateScreensFromFeatures(summary.key_features);
    const components = this.generateComponentsFromActions(
      summary.primary_user_actions
    );

    return {
      screens,
      components,
      design_patterns: [
        "card-based layout",
        "progressive disclosure",
        "responsive grid",
      ],
      interaction_flows: [
        "user onboarding",
        "primary task completion",
        "error recovery",
      ],
      state_management: ["React hooks", "local storage", "context API"],
      data_flow: ["Unidirectional data flow with props and callbacks"],
    };
  }

  // ============================================================================
  // PHASE 7: IMPLEMENTATION PLAN
  // ============================================================================

  private async planImplementation(
    summary: FunctionalSummary,
    hierarchy: ComponentHierarchy
  ): Promise<ImplementationPlan> {
    const prompt = `
Create an implementation plan for this project.

Project: ${summary.app_name}
Platform: ${summary.platform}
Screens: ${hierarchy.screens.length}
Components: ${hierarchy.components.length}
Complexity: ${summary.complexity_level}

Output JSON:
{
  "framework": "Next.js|React|Vue|Svelte",
  "pages": ["page1", "page2"],
  "state_management": "useState|Redux|Zustand|Context",
  "build_requirements": ["requirement1", "requirement2"],
  "data_persistence": "localStorage|IndexedDB|API|Database",
  "notifications": "Web Push|Email|In-app",
  "authentication": "JWT|OAuth|Magic Link",
  "api_integration": "REST|GraphQL|tRPC",
  "deployment_strategy": "Vercel|Netlify|AWS|Docker",
  "performance_optimizations": ["optimization1", "optimization2"],
  "accessibility_implementation": ["WCAG compliance", "keyboard navigation"],
  "testing_strategy": ["unit tests", "integration tests", "e2e tests"],
  "monitoring_analytics": ["Google Analytics", "Sentry", "Custom metrics"]
}`;

    try {
      const response = await this.ai.generateText(prompt, {
        temperature: 0.3,
        maxTokens: 1000,
      });

      return JSON.parse(response.text);
    } catch (error) {
      return this.planImplementationByRules(summary, hierarchy);
    }
  }

  private planImplementationByRules(
    summary: FunctionalSummary,
    hierarchy: ComponentHierarchy
  ): ImplementationPlan {
    const isComplex = summary.complexity_level === "high";
    const isMobile = summary.platform.toLowerCase().includes("mobile");

    return {
      framework: "Next.js",
      pages: hierarchy.screens.map((s) =>
        s.name.toLowerCase().replace(/\s+/g, "-")
      ),
      state_management: isComplex ? "Zustand" : "useState + Context",
      build_requirements: [
        "TypeScript",
        "Tailwind CSS",
        "shadcn/ui",
        isMobile ? "PWA manifest" : "SEO optimization",
      ],
      data_persistence: isComplex ? "API + Database" : "localStorage",
      notifications: isMobile ? "Web Push" : "In-app",
      authentication: isComplex ? "NextAuth.js" : "Simple JWT",
      api_integration: isComplex ? "tRPC" : "REST",
      deployment_strategy: "Vercel",
      performance_optimizations: [
        "Image optimization",
        "Code splitting",
        "Lazy loading",
        "Bundle analysis",
      ],
      accessibility_implementation: [
        "WCAG 2.1 AA compliance",
        "Keyboard navigation",
        "Screen reader support",
        "Color contrast validation",
      ],
      testing_strategy: [
        "Jest unit tests",
        "React Testing Library",
        "Playwright e2e tests",
      ],
      monitoring_analytics: ["Vercel Analytics", "Sentry error tracking"],
    };
  }

  // ============================================================================
  // PHASE 8: DESIGN INTENT SYNTHESIS
  // ============================================================================

  private async synthesizeIntent(
    brief: DesignBrief,
    visualSystem: VisualSystem,
    summary: FunctionalSummary
  ): Promise<DesignIntent> {
    const prompt = `
Synthesize the complete design intent for this project.

Design Brief: ${JSON.stringify(brief, null, 2)}
Visual System: ${JSON.stringify(visualSystem.colors, null, 2)}
Project: ${summary.app_name} - ${summary.core_purpose}

Create a final design philosophy that guides all design decisions.

Output JSON:
{
  "visual_philosophy": "One paragraph describing the overall design approach",
  "design_anchors": ["principle1", "principle2", "principle3"],
  "user_experience_goals": ["goal1", "goal2"],
  "brand_alignment": "How design aligns with brand values",
  "technical_constraints": ["constraint1", "constraint2"],
  "scalability_considerations": ["consideration1", "consideration2"],
  "maintenance_guidelines": ["guideline1", "guideline2"],
  "success_criteria": ["criteria1", "criteria2"]
}`;

    try {
      const response = await this.ai.generateText(prompt, {
        temperature: 0.6,
        maxTokens: 800,
      });

      return JSON.parse(response.text);
    } catch (error) {
      return this.synthesizeIntentByRules(brief, summary);
    }
  }

  private synthesizeIntentByRules(
    brief: DesignBrief,
    summary: FunctionalSummary
  ): DesignIntent {
    return {
      visual_philosophy: `${
        summary.app_name
      } embodies a ${brief.personality_keywords.join(
        ", "
      )} design approach that prioritizes ${brief.ui_principles.join(
        ", "
      )} to create an ${brief.emotional_tone} user experience.`,
      design_anchors: brief.ui_principles.slice(0, 3),
      user_experience_goals: [
        "Intuitive navigation and task completion",
        "Accessible and inclusive design",
        "Consistent and predictable interactions",
      ],
      brand_alignment: `Design reflects ${brief.personality_keywords.join(
        ", "
      )} values through ${brief.primary_color} primary color and ${
        brief.typography.heading
      } typography.`,
      technical_constraints: [
        "Mobile-first responsive design",
        "Performance optimization",
        "Cross-browser compatibility",
      ],
      scalability_considerations: [
        "Component reusability",
        "Design token consistency",
        "Modular architecture",
      ],
      maintenance_guidelines: [
        "Follow established design patterns",
        "Maintain design token usage",
        "Regular accessibility audits",
      ],
      success_criteria: [
        "User task completion rate > 90%",
        "Accessibility score > 95",
        "Performance score > 90",
      ],
    };
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private initializeFallbacks(): void {
    this.fallbacks.set("extractAppName", (prd: string) => ({
      success: true,
      data: this.extractAppName(prd),
      confidence: 0.8,
      method: "rule_based",
      warnings: [],
    }));
  }

  private extractAppName(prd: string): string {
    const titleMatch = prd.match(/#\s*(.+)/);
    if (titleMatch) return titleMatch[1]?.trim() || "MyApp";

    const firstLine = prd.split("\n")[0];
    return firstLine?.replace(/[#*]/g, "").trim() || "MyApp";
  }

  private extractFeatures(prd: string): string[] {
    const features: string[] = [];
    const lines = prd.split("\n");

    for (const line of lines) {
      if (
        line.includes("feature") ||
        line.includes("functionality") ||
        line.includes("capability")
      ) {
        const cleanLine = line.replace(/[-*•]\s*/, "").trim();
        if (cleanLine.length > 5) features.push(cleanLine);
      }
    }

    return features.length > 0
      ? features
      : ["User interface", "Data management"];
  }

  private extractPurpose(prd: string): string {
    const purposeMatch = prd.match(/purpose[:\s]+(.+)/i);
    if (purposeMatch)
      return purposeMatch[1]?.trim() || "Application for user needs";

    const firstParagraph = prd.split("\n\n")[0];
    return (
      firstParagraph?.replace(/[#*]/g, "").trim() ||
      "Application for user needs"
    );
  }

  private extractUserActions(prd: string): string[] {
    const actions: string[] = [];
    const actionKeywords = [
      "click",
      "select",
      "input",
      "submit",
      "view",
      "create",
      "edit",
      "delete",
    ];

    for (const keyword of actionKeywords) {
      if (prd.toLowerCase().includes(keyword)) {
        actions.push(keyword.charAt(0).toUpperCase() + keyword.slice(1));
      }
    }

    return actions.length > 0
      ? actions
      : ["View content", "Interact with interface"];
  }

  private inferPlatform(prd: string): string {
    const lowerPrd = prd.toLowerCase();
    if (lowerPrd.includes("mobile") || lowerPrd.includes("app"))
      return "Mobile PWA";
    if (lowerPrd.includes("dashboard") || lowerPrd.includes("admin"))
      return "Web Dashboard";
    return "Web Application";
  }

  private extractTechnicalRequirements(prd: string): string[] {
    const requirements: string[] = [];
    const techKeywords = [
      "api",
      "database",
      "auth",
      "responsive",
      "pwa",
      "offline",
    ];

    for (const keyword of techKeywords) {
      if (prd.toLowerCase().includes(keyword)) {
        requirements.push(keyword.toUpperCase());
      }
    }

    return requirements.length > 0
      ? requirements
      : ["Responsive Design", "Modern Browser Support"];
  }

  private assessComplexity(featureCount: number): "low" | "medium" | "high" {
    if (featureCount <= 3) return "low";
    if (featureCount <= 6) return "medium";
    return "high";
  }

  private extractPersonas(prd: string): string[] {
    const personas: string[] = [];
    const personaKeywords = [
      "user",
      "customer",
      "admin",
      "manager",
      "developer",
    ];

    for (const keyword of personaKeywords) {
      if (prd.toLowerCase().includes(keyword)) {
        personas.push(keyword.charAt(0).toUpperCase() + keyword.slice(1));
      }
    }

    return personas.length > 0 ? personas : ["End User"];
  }

  private extractBusinessGoals(prd: string): string[] {
    return ["User engagement", "Task completion", "User satisfaction"];
  }

  private extractSuccessMetrics(prd: string): string[] {
    return ["User adoption", "Task completion rate", "User satisfaction score"];
  }

  private generateScreensFromFeatures(features: string[]): any[] {
    const screens: any[] = [
      {
        name: "Home",
        description: "Main landing screen",
        purpose: "Provide overview and navigation",
        components: ["Header", "Navigation", "ContentArea"],
        layout_type: "single_column" as const,
        navigation_flow: ["Settings"],
        user_journey_position: "entry" as const,
      },
    ];

    if (features.some((f) => f.toLowerCase().includes("dashboard"))) {
      const dashboardScreen = {
        name: "Dashboard",
        description: "Data overview and analytics",
        purpose: "Display key metrics and insights",
        components: ["MetricsCard", "Chart", "DataTable"],
        layout_type: "dashboard" as const,
        navigation_flow: ["Home", "Details"],
        user_journey_position: "main" as const,
      };
      screens.push(dashboardScreen);
    }

    return screens;
  }

  private generateComponentsFromActions(actions: string[]): any[] {
    const components = [
      {
        name: "Button",
        description: "Primary action button",
        type: "form" as const,
        props: [
          {
            name: "children",
            type: "ReactNode",
            required: true,
            description: "Button content",
          },
          {
            name: "onClick",
            type: "() => void",
            required: true,
            description: "Click handler",
          },
        ],
        interactions: ["click", "hover"],
        states: ["default", "loading", "disabled"],
        accessibility_requirements: ["aria-label", "keyboard navigation"],
        responsive_behavior: "Maintains size across breakpoints",
        related_components: ["IconButton", "LinkButton"],
      },
    ];

    if (actions.some((a) => a.toLowerCase().includes("input"))) {
      components.push({
        name: "Input",
        description: "Text input field",
        type: "form" as const,
        props: [
          {
            name: "value",
            type: "string",
            required: true,
            description: "Input value",
          },
          {
            name: "onChange",
            type: "(value: string) => void",
            required: true,
            description: "Change handler",
          },
        ],
        interactions: ["focus", "blur", "input"],
        states: ["default", "focused", "error", "disabled"],
        accessibility_requirements: ["aria-label", "aria-invalid"],
        responsive_behavior: "Full width on mobile",
        related_components: ["TextArea", "Select"],
      });
    }

    return components;
  }

  private validateFunctionalSummary(data: any): FunctionalSummary {
    return {
      app_name: data.app_name || "MyApp",
      core_purpose: data.core_purpose || "Application purpose",
      key_features: Array.isArray(data.key_features)
        ? data.key_features
        : ["Feature 1"],
      primary_user_actions: Array.isArray(data.primary_user_actions)
        ? data.primary_user_actions
        : ["Action 1"],
      platform: data.platform || "Web Application",
      technical_requirements: Array.isArray(data.technical_requirements)
        ? data.technical_requirements
        : ["Requirement 1"],
      complexity_level: ["low", "medium", "high"].includes(
        data.complexity_level
      )
        ? data.complexity_level
        : "medium",
      user_personas: Array.isArray(data.user_personas)
        ? data.user_personas
        : undefined,
      business_goals: Array.isArray(data.business_goals)
        ? data.business_goals
        : undefined,
      success_metrics: Array.isArray(data.success_metrics)
        ? data.success_metrics
        : undefined,
    };
  }

  private calculateConfidenceScores(): Record<string, number> {
    return {
      functional_summary: 0.9,
      project_scope: 0.8,
      context_gaps: 0.7,
      design_brief: 0.8,
      visual_system: 0.9,
      component_hierarchy: 0.8,
      implementation_plan: 0.7,
      design_intent: 0.8,
    };
  }

  private createEmptyManifest(projectPath: string): DesignManifest {
    return {
      version: "1.0.0",
      generated_at: new Date().toISOString(),
      project_name: "Unknown Project",
      phases: {
        functional_summary: {
          app_name: "Unknown App",
          core_purpose: "Unknown purpose",
          key_features: [],
          primary_user_actions: [],
          platform: "Web",
          technical_requirements: [],
          complexity_level: "medium",
        },
        project_scope: {
          build_scope: "full_app",
          reason: "Default fallback",
          expected_outputs: [],
        },
        context_gaps: {
          missing: [],
          recommended_next_action: "Manual review required",
        },
        design_brief: {
          theme: "light",
          inspiration_sources: [],
          blended_style: "Default style",
          primary_color: "#3B82F6",
          support_colors: [],
          typography: { heading: "Inter", body: "Inter" },
          ui_principles: [],
          motion_style: "smooth",
          personality_keywords: [],
          emotional_tone: "neutral",
          target_audience: "general",
        },
        visual_system: {
          colors: {
            primary: "#3B82F6",
            background: "#FFFFFF",
            surface: "#F8FAFC",
            text: "#0F172A",
            text_muted: "#64748B",
          },
          typography: {
            font_families: {
              heading: "Inter",
              body: "Inter",
              mono: "JetBrains Mono",
            },
            scale: {
              xs: "12px",
              sm: "14px",
              md: "16px",
              lg: "18px",
              xl: "20px",
              "2xl": "24px",
              "3xl": "30px",
              "4xl": "36px",
            },
            weights: {
              normal: "400",
              medium: "500",
              semibold: "600",
              bold: "700",
            },
          },
          spacing: {
            xs: "4px",
            sm: "8px",
            md: "16px",
            lg: "24px",
            xl: "32px",
            "2xl": "48px",
            "3xl": "64px",
            "4xl": "96px",
          },
          radii: {
            none: "0px",
            sm: "4px",
            md: "8px",
            lg: "12px",
            xl: "16px",
            full: "9999px",
          },
          shadows: {
            sm: "0 1px 2px rgba(0,0,0,0.05)",
            md: "0 4px 6px rgba(0,0,0,0.1)",
            lg: "0 10px 15px rgba(0,0,0,0.1)",
            xl: "0 20px 25px rgba(0,0,0,0.1)",
          },
          motion: {
            duration: { fast: "150ms", normal: "300ms", slow: "500ms" },
            easing: {
              linear: "linear",
              ease_in: "cubic-bezier(0.4,0,1,1)",
              ease_out: "cubic-bezier(0,0,0.2,1)",
              ease_in_out: "cubic-bezier(0.4,0,0.2,1)",
            },
          },
          breakpoints: { sm: "640px", md: "768px", lg: "1024px", xl: "1280px" },
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
          framework: "Next.js",
          pages: [],
          state_management: "useState",
          build_requirements: [],
          data_persistence: "localStorage",
          performance_optimizations: [],
          accessibility_implementation: [],
          testing_strategy: [],
        },
        design_intent: {
          visual_philosophy: "Clean and functional design",
          design_anchors: ["clarity", "consistency", "accessibility"],
          user_experience_goals: [],
          brand_alignment: "Neutral brand alignment",
          technical_constraints: [],
          scalability_considerations: [],
          maintenance_guidelines: [],
          success_criteria: [],
        },
      },
      metadata: {
        confidence_scores: {},
        fallbacks_used: ["all_phases"],
        generation_time_ms: 0,
      },
    };
  }

  // ============================================================================
  // SUBAGENT INTERFACE IMPLEMENTATION
  // ============================================================================

  async validate(input: DesignPipelineInput): Promise<boolean> {
    return !!(input.prd && input.prd.length > 10 && input.project_path);
  }

  async cleanup(): Promise<void> {
    // No cleanup needed
  }

  async getStatus(): Promise<any> {
    return {
      name: this.name,
      status: "idle",
      lastRun: undefined,
      executionTime: 0,
      errorCount: 0,
      successCount: 0,
    };
  }
}
