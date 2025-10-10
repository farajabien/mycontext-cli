import { SubAgent } from "../interfaces/SubAgent";
import * as fs from "fs";
import * as path from "path";
import { UnifiedDesignContextLoader } from "../../utils/unifiedDesignContextLoader";
import { DesignManifest, EnrichedContext } from "../../types/design-pipeline";

export interface PromptConstructionContext {
  prd?: string;
  types?: string;
  branding?: string;
  componentList?: string;
  componentName: string;
  componentGroup: string;
  projectPath: string;
  stackConfig?: any;
}

export interface ConstructedPrompt {
  systemPrompt: string;
  userPrompt: string;
  contextSummary: string;
  specificRequirements: string[];
}

/**
 * PromptConstructorAgent
 *
 * Analyzes all context files and constructs highly specific prompts
 * for component generation based on project requirements, types, and branding.
 *
 * Features:
 * - Context file analysis and extraction
 * - Component-specific requirement generation
 * - Intelligent prompt construction
 * - Domain knowledge integration
 */
export class PromptConstructorAgent
  implements SubAgent<PromptConstructionContext, ConstructedPrompt>
{
  name = "PromptConstructorAgent";
  description =
    "Analyzes user-centric context documentation and compiles user interactions into component specifications";
  personality = "analytical, detail-oriented, context-aware";
  llmProvider: string = "github";
  expertise = [
    "user experience analysis",
    "user interaction compilation",
    "user-centric prompt construction",
    "user behavior understanding",
  ];

  async run(context: PromptConstructionContext): Promise<ConstructedPrompt> {
    // Step 1: Load unified design context (includes design manifest)
    const designContext = await this.loadDesignContext(context);

    // Step 2: Analyze all context files with design context
    const contextAnalysis = await this.analyzeContextFiles(
      context,
      designContext
    );

    // Step 3: Extract component-specific requirements with design system
    const componentRequirements = await this.extractComponentRequirements(
      context,
      contextAnalysis,
      designContext
    );

    // Step 4: Use AI to enhance and refine the prompt with design context
    const enhancedPrompt = await this.enhancePromptWithAI(
      context,
      contextAnalysis,
      componentRequirements,
      designContext
    );

    // Step 5: Construct final prompt with AI enhancements and design system
    const constructedPrompt = await this.constructPrompt(
      context,
      enhancedPrompt,
      componentRequirements,
      designContext
    );

    return constructedPrompt;
  }

  private async loadDesignContext(context: PromptConstructionContext): Promise<{
    enrichedContext?: EnrichedContext;
    designManifest?: DesignManifest;
  }> {
    try {
      const contextLoader = new UnifiedDesignContextLoader(context.projectPath);
      const { enrichedContext } =
        await contextLoader.loadUnifiedDesignContext();

      return {
        enrichedContext,
        designManifest: undefined, // Design manifest is embedded in enrichedContext
      };
    } catch (error) {
      console.warn(
        "Failed to load design context, proceeding without design manifest:",
        error
      );
      return {};
    }
  }

  private async analyzeContextFiles(
    context: PromptConstructionContext,
    designContext?: {
      enrichedContext?: EnrichedContext;
      designManifest?: DesignManifest;
    }
  ): Promise<any> {
    const analysis: any = {
      userInteractions: [] as string[],
      userActions: [] as string[],
      userFeedback: [] as string[],
      userErrorRecovery: [] as string[],
      userJourneyFlows: [] as string[],
      userDecisionPoints: [] as string[],
      userStates: [] as string[],
      userExperienceGuidelines: [] as string[],
      userInterfacePatterns: [] as string[],
      userAccessibilityNeeds: [] as string[],
      userPerformanceExpectations: [] as string[],
      userErrorScenarios: [] as string[],
      // Design system context
      designSystem: null as any,
      designIntent: null as any,
      visualTokens: null as any,
      componentHierarchy: null as any,
    };

    // Analyze user-centric context files
    if (context.prd) {
      analysis.userInteractions = this.extractUserInteractions(context.prd);
      analysis.userActions = this.extractUserActions(context.prd);
      analysis.userFeedback = this.extractUserFeedback(context.prd);
      analysis.userJourneyFlows = this.extractUserJourneyFlows(context.prd);
      analysis.userErrorScenarios = this.extractUserErrorScenarios(context.prd);
      analysis.userExperienceGuidelines = this.extractUserExperienceGuidelines(
        context.prd
      );
      analysis.userStates = this.extractUserStates(context.prd);
      analysis.userDecisionPoints = this.extractUserDecisionPoints(context.prd);
      analysis.userErrorRecovery = this.extractUserErrorRecovery(context.prd);
    }

    // Analyze user interface patterns from types
    if (context.types) {
      analysis.userInterfacePatterns = this.extractUserInterfacePatterns(
        context.types
      );
    }

    // Analyze user experience guidelines from branding
    if (context.branding) {
      analysis.userExperienceGuidelines = [
        ...analysis.userExperienceGuidelines,
        ...this.extractUserExperienceGuidelines(context.branding),
      ];
    }

    // Analyze user interface patterns from component list
    if (context.componentList) {
      analysis.userInterfacePatterns = [
        ...analysis.userInterfacePatterns,
        ...this.extractUserInterfacePatterns(context.componentList),
      ];
      analysis.userAccessibilityNeeds = this.extractUserAccessibilityNeeds(
        context.componentList
      );
      analysis.userPerformanceExpectations =
        this.extractUserPerformanceExpectations(context.componentList);
    } else {
      analysis.userInterfacePatterns = [];
      analysis.userAccessibilityNeeds = [];
      analysis.userPerformanceExpectations = [];
    }

    // Extract design system context if available
    if (designContext?.enrichedContext) {
      analysis.designSystem = designContext.enrichedContext.design_system;
      analysis.designIntent = designContext.enrichedContext.design_intent;
      analysis.visualTokens = designContext.enrichedContext.visual_tokens;
      analysis.componentHierarchy =
        designContext.enrichedContext.component_architecture;
    }

    return analysis;
  }

  private async enhancePromptWithAI(
    context: PromptConstructionContext,
    analysis: any,
    requirements: string[],
    designContext?: {
      enrichedContext?: EnrichedContext;
      designManifest?: DesignManifest;
    }
  ): Promise<any> {
    try {
      const { HybridAIClient } = await import("../../utils/hybridAIClient");

      const enhancementPrompt = `You are an expert prompt engineer specializing in React component generation.

Based on this project context, enhance the component generation requirements:

PROJECT DOMAIN: ${analysis.domain}
COMPONENT: ${context.componentName}
GROUP: ${context.componentGroup}

CURRENT ANALYSIS:
- Business Logic: ${analysis.businessLogic.join(", ")}
- User Stories: ${analysis.userStories.join(", ")}
- Technical Requirements: ${analysis.technicalRequirements.join(", ")}

CURRENT REQUIREMENTS:
${requirements.map((req, i) => `${i + 1}. ${req}`).join("\n")}

Please enhance these requirements by:
1. Adding specific implementation details
2. Identifying potential edge cases
3. Suggesting best practices for this component type
4. Adding accessibility requirements
5. Including error handling patterns
6. Suggesting performance optimizations

Return your response as a JSON object with these keys:
{
  "enhancedRequirements": ["array of enhanced requirement strings"],
  "implementationNotes": ["array of specific implementation guidance"],
  "externalDependencies": ["array of required external files with paths"],
  "edgeCases": ["array of edge cases to handle"],
  "accessibilityRequirements": ["array of accessibility features to implement"]
}`;

      const aiClient = new HybridAIClient();
      const enhancementResponse = await aiClient.generateText(
        enhancementPrompt,
        { model: process.env.MYCONTEXT_MODEL || "grok-3" }
      );

      // Try to parse the AI response as JSON
      try {
        console.log(
          "🔍 DEBUG: AI enhancement response length:",
          enhancementResponse.text.length
        );
        console.log(
          "🔍 DEBUG: AI enhancement response preview:",
          enhancementResponse.text.substring(0, 200)
        );

        // First, try to extract JSON from the response
        const jsonMatch = enhancementResponse.text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          console.log(
            "❌ DEBUG: No JSON found in AI enhancement response, using original analysis"
          );
          console.log("❌ DEBUG: Full response:", enhancementResponse.text);
          return analysis;
        }

        console.log(
          "✅ DEBUG: Found JSON match:",
          jsonMatch[0].substring(0, 100) + "..."
        );
        const enhancedAnalysis = JSON.parse(jsonMatch[0]);
        return {
          ...analysis,
          enhancedRequirements:
            enhancedAnalysis.enhancedRequirements || requirements,
          implementationNotes: enhancedAnalysis.implementationNotes || [],
          externalDependencies: enhancedAnalysis.externalDependencies || [],
          edgeCases: enhancedAnalysis.edgeCases || [],
          accessibilityRequirements:
            enhancedAnalysis.accessibilityRequirements || [],
        };
      } catch (parseError) {
        console.log(
          "AI enhancement parsing failed, using original analysis:",
          parseError
        );
        return analysis;
      }
    } catch (error) {
      console.log("AI prompt enhancement failed, using original analysis");
      return analysis;
    }
  }

  private extractDomain(prd: string): string {
    // Extract the main domain/application type
    const lines = prd.split("\n");
    for (const line of lines) {
      if (
        line.includes("Product Requirements") ||
        line.includes("PRD") ||
        line.includes("Overview")
      ) {
        return line.toLowerCase().includes("tic-tac-toe")
          ? "game"
          : line.toLowerCase().includes("e-commerce")
          ? "ecommerce"
          : line.toLowerCase().includes("dashboard")
          ? "dashboard"
          : line.toLowerCase().includes("social")
          ? "social"
          : "application";
      }
    }
    return "application";
  }

  private extractBusinessLogic(prd: string): string[] {
    const logic: string[] = [];
    const lines = prd.split("\n");

    for (let i = 0; i < lines.length; i++) {
      const currentLine = lines[i];
      if (!currentLine) continue;

      const line = currentLine.toLowerCase();
      if (
        line.includes("algorithm") ||
        line.includes("logic") ||
        line.includes("rules")
      ) {
        logic.push(currentLine.trim());
        // Get next few lines for context
        for (let j = i + 1; j < Math.min(i + 3, lines.length); j++) {
          const nextLine = lines[j];
          if (nextLine && nextLine.trim() && !nextLine.startsWith("#")) {
            logic.push(nextLine.trim());
          }
        }
      }
    }

    return logic;
  }

  private extractUserStories(prd: string): string[] {
    const stories: string[] = [];
    const lines = prd.split("\n");

    for (const line of lines) {
      if (
        line.includes("As a") ||
        line.includes("User Story") ||
        line.includes("story")
      ) {
        stories.push(line.trim());
      }
    }

    return stories;
  }

  private extractTechnicalRequirements(prd: string): string[] {
    const requirements: string[] = [];
    const lines = prd.split("\n");

    for (const line of lines) {
      const lowerLine = line.toLowerCase();
      if (
        lowerLine.includes("technical") ||
        lowerLine.includes("requirement") ||
        lowerLine.includes("technology") ||
        lowerLine.includes("framework")
      ) {
        requirements.push(line.trim());
      }
    }

    return requirements;
  }

  private extractDataStructures(types: string): string[] {
    const structures: string[] = [];
    const lines = types.split("\n");

    for (const line of lines) {
      if (
        line.includes("interface") ||
        line.includes("type") ||
        line.includes("enum")
      ) {
        structures.push(line.trim());
      }
    }

    return structures;
  }

  private extractBrandingGuidelines(branding: string): string[] {
    const guidelines: string[] = [];
    const lines = branding.split("\n");

    for (const line of lines) {
      const lowerLine = line.toLowerCase();
      if (
        lowerLine.includes("color") ||
        lowerLine.includes("font") ||
        lowerLine.includes("style") ||
        lowerLine.includes("design")
      ) {
        guidelines.push(line.trim());
      }
    }

    return guidelines;
  }

  private extractUIPatterns(componentList: string): string[] {
    const patterns: string[] = [];

    try {
      const parsed = JSON.parse(componentList);

      if (parsed.groups) {
        for (const group of parsed.groups) {
          if (group.components) {
            for (const component of group.components) {
              if (component.description) {
                patterns.push(`${component.name}: ${component.description}`);
              }
            }
          }
        }
      }
    } catch (e) {
      // Fallback to text parsing
      const lines = componentList.split("\n");
      for (const line of lines) {
        if (line.includes("description") || line.includes("component")) {
          patterns.push(line.trim());
        }
      }
    }

    return patterns;
  }

  private async extractComponentRequirements(
    context: PromptConstructionContext,
    analysis: any,
    designContext?: {
      enrichedContext?: EnrichedContext;
      designManifest?: DesignManifest;
    }
  ): Promise<string[]> {
    const requirements: string[] = [];

    // NEW: Load intent-based requirements from enriched context
    if (designContext?.enrichedContext?.enriched_intents) {
      const relevantIntents = this.filterRelevantIntents(
        designContext.enrichedContext.enriched_intents,
        context.componentName
      );

      for (const intent of relevantIntents) {
        requirements.push(...this.formatIntentAsRequirements(intent));
      }
    }

    // Component-specific requirements based on name and group
    const componentName = context.componentName.toLowerCase();
    const componentGroup = context.componentGroup.toLowerCase();

    // Game-specific requirements
    if (analysis.domain === "game") {
      if (componentName.includes("board") || componentName.includes("game")) {
        requirements.push("Implement a 3x3 grid for tic-tac-toe gameplay");
        requirements.push("Handle click events for each cell");
        requirements.push("Display X and O markers clearly");
        requirements.push("Show game state (current player, winner, draw)");
        requirements.push("Include reset/new game functionality");
        requirements.push("Add smooth hover and click animations");
      }

      if (componentName.includes("ai") || componentName.includes("logic")) {
        requirements.push("Implement minimax algorithm for AI moves");
        requirements.push("Support different difficulty levels");
        requirements.push("Provide optimal move calculation");
      }

      if (
        componentName.includes("score") ||
        componentName.includes("history")
      ) {
        requirements.push("Track wins, losses, and draws");
        requirements.push("Display game history");
        requirements.push("Persist score data");
      }
    }

    // UI-specific requirements based on group
    if (componentGroup.includes("interface") || componentGroup.includes("ui")) {
      requirements.push("Use consistent spacing and layout patterns");
      requirements.push("Ensure responsive design for mobile and desktop");
      requirements.push("Include proper accessibility attributes");
      requirements.push("Follow shadcn/ui component patterns");
    }

    return requirements;
  }

  private async constructPrompt(
    context: PromptConstructionContext,
    analysis: any,
    requirements: string[],
    designContext?: {
      enrichedContext?: EnrichedContext;
      designManifest?: DesignManifest;
    }
  ): Promise<ConstructedPrompt> {
    // Use stack configuration if available
    const stackInfo = context.stackConfig
      ? `
STACK CONFIGURATION:
- Framework: ${context.stackConfig.stack?.framework || "Next.js"}
- Routing: ${context.stackConfig.stack?.routing || "App Router"}
- Styling: ${context.stackConfig.stack?.styling || "Tailwind CSS"}
- UI Library: ${context.stackConfig.stack?.ui || "@workspace/ui"}
- State Management: ${context.stackConfig.stack?.state || "React hooks"}
- Forms: ${context.stackConfig.stack?.forms || "react-hook-form"}
- Icons: ${context.stackConfig.stack?.icons || "lucide-react"}

FORBIDDEN DEPENDENCIES (DO NOT USE):
${
  context.stackConfig.quality?.forbiddenDependencies
    ?.map((dep: string) => `- ${dep}`)
    .join("\n") || "None specified"
}

REQUIRED PATTERNS:
${
  context.stackConfig.patterns
    ? `
- Server Components: ${context.stackConfig.patterns.serverComponent}
- Client Components: ${context.stackConfig.patterns.clientComponent}
- Import Patterns: ${JSON.stringify(
        context.stackConfig.patterns.imports,
        null,
        2
      )}
`
    : ""
}
`
      : "";

    const systemPrompt = `You are an expert React/TypeScript developer compiling user interactions into production-ready Next.js components.

📱 **MOBILE-FIRST DESIGN REQUIREMENTS**:
Design a mobile-first, touch-first, single-focus stepped experience rather than multi-field forms. Requirements:

Primary goal: turn multi-field forms into 1 task per screen (single focus), with a clear stepper/progress indicator and per-step status badges (e.g., Pending / Saved / Error / Completed).

Device & constraints: target phones (360–430px width). Touch targets ≥44–48px. Thumb-reachable layouts (controls near bottom where appropriate).

Navigation: linear forward/back with swipe support and unobtrusive skip where needed. Avoid deep menus.

Visuals: card-based steps, large CTA, clear illustrations or icons to contextualize each step (no dense inputs). Use status colors + icons for states.

Interactions: single primary action per screen (big button). Support gestures (swipe to go back/forward), skeleton loaders, and subtle transitions between steps.

Statuses & feedback: show real-time per-step statuses (e.g., "Saving…", success check, retry on error). Include undo where destructive.

Accessibility: high contrast text, semantic labels, reachable controls, readable font sizes.

Edge cases: offline, retries, partial saves, validations that show contextual microcopy (not large error pages).

Deliverables: clickable mobile prototype, design tokens (spacing, colors, typography), interaction specs, and exportable assets (SVGs/icons) plus short dev handoff notes.

Tone: simple, visual, mobile-first. No long forms — use single-task screens, visual progress and clear statuses.

🧠 **LLM as Compiler Philosophy**: You are compiling user interaction documentation into React components, where user actions become event handlers and system responses become UI states.

USER EXPERIENCE CONTEXT:
- User Interactions: ${analysis.userInteractions.length} documented user actions
- User Actions: ${analysis.userActions.length} specific user operations
- User Feedback: ${analysis.userFeedback.length} user response patterns
- User Journey Flows: ${analysis.userJourneyFlows.length} complete user paths
- User Decision Points: ${
      analysis.userDecisionPoints.length
    } user choice moments
- User States: ${analysis.userStates.length} different user interface states
- User Error Scenarios: ${analysis.userErrorScenarios.length} user failure modes
- User Error Recovery: ${analysis.userErrorRecovery.length} user recovery paths

${stackInfo}

COMPONENT TARGET:
- Name: ${context.componentName}
- Group: ${context.componentGroup}
- Purpose: Compile user interactions into a functional, interactive component

🎯 **USER-CENTRIC REQUIREMENTS**:
- **User Actions → Event Handlers**: Every user action documented must have corresponding event handlers
- **System Responses → UI States**: Every system response must be reflected in component state
- **User Feedback → Visual Feedback**: All user feedback patterns must be implemented
- **Error Recovery → User Paths**: All error scenarios must have user-friendly recovery options
- **User States → Component States**: All user states must be represented in component logic

CRITICAL TECHNICAL REQUIREMENTS:
- Use TypeScript with strict typing
- Import React properly: import React from 'react'
- Use shadcn/ui primitives with correct import paths
- Use proper React hooks: useState, useCallback, useEffect
- Add comprehensive TypeScript interfaces for user data
- Include proper error handling for all user interactions
- Ensure accessibility with ARIA labels and roles
- Return only a single TSX component file with default export
- Use Next.js App Router patterns (Link from 'next/link', useRouter from 'next/navigation')
- Use Tailwind CSS for all styling

USER INTERFACE PATTERNS:
${analysis.userInterfacePatterns
  .map((pattern: string) => `- ${pattern}`)
  .join("\n")}

USER ACCESSIBILITY NEEDS:
${analysis.userAccessibilityNeeds.map((need: string) => `- ${need}`).join("\n")}

USER PERFORMANCE EXPECTATIONS:
${analysis.userPerformanceExpectations
  .map((expectation: string) => `- ${expectation}`)
  .join("\n")}

USER EXPERIENCE GUIDELINES:
${analysis.userExperienceGuidelines
  .map((guideline: string) => `- ${guideline}`)
  .join("\n")}

${this.formatDesignSystemForPrompt(analysis, designContext)}

IMPORTANT: This should be a complete, functional component that implements the actual user interactions, not just a layout wrapper. Include all necessary state management, event handlers, and user feedback systems.`;

    const userPrompt = `Compile the ${
      context.componentName
    } component from user interaction documentation:

🎯 **USER INTERACTIONS TO IMPLEMENT**:
${analysis.userInteractions
  .map((interaction: string) => `- ${interaction}`)
  .join("\n")}

👆 **USER ACTIONS TO HANDLE**:
${analysis.userActions.map((action: string) => `- ${action}`).join("\n")}

💬 **USER FEEDBACK TO SHOW**:
${analysis.userFeedback.map((feedback: string) => `- ${feedback}`).join("\n")}

🔄 **USER JOURNEY FLOWS TO SUPPORT**:
${analysis.userJourneyFlows.map((flow: string) => `- ${flow}`).join("\n")}

⚡ **USER DECISION POINTS TO ENABLE**:
${analysis.userDecisionPoints
  .map((decision: string) => `- ${decision}`)
  .join("\n")}

📱 **USER STATES TO REPRESENT**:
${analysis.userStates.map((state: string) => `- ${state}`).join("\n")}

🚨 **USER ERROR SCENARIOS TO HANDLE**:
${analysis.userErrorScenarios
  .map((scenario: string) => `- ${scenario}`)
  .join("\n")}

🔧 **USER ERROR RECOVERY TO PROVIDE**:
${analysis.userErrorRecovery
  .map((recovery: string) => `- ${recovery}`)
  .join("\n")}

⚙️ **TECHNICAL REQUIREMENTS TO FULFILL**:
${requirements.map((req) => `- ${req}`).join("\n")}

🎨 **USER EXPERIENCE GUIDELINES TO FOLLOW**:
${analysis.userExperienceGuidelines
  .map((guideline: string) => `- ${guideline}`)
  .join("\n")}

IMPORTANT: This should be a complete, functional component that implements the actual user interactions, not just a layout wrapper. Every documented user action must have a corresponding event handler, and every system response must be reflected in the component's UI state. Include all necessary state management, event handlers, and user feedback systems to support the complete user experience.`;

    return {
      systemPrompt,
      userPrompt,
      contextSummary: `User Interactions: ${analysis.userInteractions.length} actions, ${analysis.userFeedback.length} feedback patterns, ${analysis.userErrorScenarios.length} error scenarios`,
      specificRequirements: requirements,
    };
  }

  private detectExternalDependencies(
    componentList: string,
    componentName: string,
    componentGroup: string
  ): string[] {
    const dependencies: string[] = [];

    try {
      // Try to parse JSON, if it fails, try to extract useful info from the text
      let componentData;
      try {
        componentData = JSON.parse(componentList);
      } catch (jsonError) {
        // If JSON parsing fails, try to extract dependencies from text
        console.log("JSON parsing failed, trying text-based extraction");
        this.extractDependenciesFromText(
          componentList,
          componentName,
          dependencies
        );
        return dependencies;
      }

      if (componentData.groups) {
        for (const group of componentData.groups) {
          for (const component of group.components || []) {
            if (component.name === componentName && component.dependencies) {
              // Add custom hooks that might be needed
              if (
                component.dependencies.some((dep: string) =>
                  dep.toLowerCase().includes("auth")
                )
              ) {
                dependencies.push(
                  "@/hooks/useAuth.ts - User authentication hook"
                );
              }
              if (
                component.dependencies.some((dep: string) =>
                  dep.toLowerCase().includes("history")
                )
              ) {
                dependencies.push(
                  "@/hooks/useGameHistory.ts - Game history management hook"
                );
              }
              if (
                component.dependencies.some((dep: string) =>
                  dep.toLowerCase().includes("storage")
                )
              ) {
                dependencies.push(
                  "@/hooks/useLocalStorage.ts - Local storage utility hook"
                );
              }

              // Add utility files for complex logic
              if (
                component.actionFunctions?.some(
                  (fn: string) => fn.includes("minimax") || fn.includes("AI")
                )
              ) {
                dependencies.push(
                  "@/utils/minimax.ts - AI algorithm implementation"
                );
              }
              if (
                component.actionFunctions?.some((fn: string) =>
                  fn.includes("validation")
                )
              ) {
                dependencies.push(
                  "@/utils/validation.ts - Form/data validation utilities"
                );
              }

              // Add type definitions
              if (component.stateVariables?.length > 0) {
                dependencies.push(
                  "@/types/game.ts - Game-related type definitions"
                );
              }
            }
          }
        }
      }
    } catch (error) {
      console.log("Error parsing component list for dependencies:", error);
    }

    return dependencies;
  }

  private extractDependenciesFromText(
    text: string,
    componentName: string,
    dependencies: string[]
  ): void {
    // Simple text-based extraction for common patterns
    if (
      text.toLowerCase().includes("minimax") ||
      text.toLowerCase().includes("ai")
    ) {
      dependencies.push("@/utils/minimax.ts - AI algorithm implementation");
    }
    if (text.toLowerCase().includes("auth")) {
      dependencies.push("@/hooks/useAuth.ts - User authentication hook");
    }
    if (text.toLowerCase().includes("history")) {
      dependencies.push(
        "@/hooks/useGameHistory.ts - Game history management hook"
      );
    }
    if (text.toLowerCase().includes("storage")) {
      dependencies.push(
        "@/hooks/useLocalStorage.ts - Local storage utility hook"
      );
    }
  }

  // === User-Centric Extraction Methods ===

  private extractUserInteractions(prd: string): string[] {
    const interactions: string[] = [];
    const lines = prd.split("\n");

    for (let i = 0; i < lines.length; i++) {
      const currentLine = lines[i];
      if (!currentLine) continue;

      const line = currentLine.toLowerCase();

      // Look for user action patterns
      if (
        line.includes("user") &&
        (line.includes("click") ||
          line.includes("tap") ||
          line.includes("enter") ||
          line.includes("select") ||
          line.includes("choose") ||
          line.includes("navigate") ||
          line.includes("browse") ||
          line.includes("search"))
      ) {
        interactions.push(currentLine);
      }
    }

    return interactions;
  }

  private extractUserActions(prd: string): string[] {
    const actions: string[] = [];
    const lines = prd.split("\n");

    for (let i = 0; i < lines.length; i++) {
      const currentLine = lines[i];
      if (!currentLine) continue;

      const line = currentLine.toLowerCase();

      // Look for specific user actions
      if (
        line.includes("user") &&
        (line.includes("add") ||
          line.includes("remove") ||
          line.includes("delete") ||
          line.includes("edit") ||
          line.includes("update") ||
          line.includes("create") ||
          line.includes("submit") ||
          line.includes("save") ||
          line.includes("upload") ||
          line.includes("download"))
      ) {
        actions.push(currentLine);
      }
    }

    return actions;
  }

  private extractUserFeedback(prd: string): string[] {
    const feedback: string[] = [];
    const lines = prd.split("\n");

    for (let i = 0; i < lines.length; i++) {
      const currentLine = lines[i];
      if (!currentLine) continue;

      const line = currentLine.toLowerCase();

      // Look for feedback patterns
      if (
        line.includes("user") &&
        (line.includes("see") ||
          line.includes("display") ||
          line.includes("show") ||
          line.includes("message") ||
          line.includes("notification") ||
          line.includes("alert") ||
          line.includes("success") ||
          line.includes("error") ||
          line.includes("loading") ||
          line.includes("spinner"))
      ) {
        feedback.push(currentLine);
      }
    }

    return feedback;
  }

  private extractUserJourneyFlows(prd: string): string[] {
    const flows: string[] = [];
    const lines = prd.split("\n");

    for (let i = 0; i < lines.length; i++) {
      const currentLine = lines[i];
      if (!currentLine) continue;

      const line = currentLine.toLowerCase();

      // Look for journey patterns
      if (
        line.includes("user") &&
        (line.includes("flow") ||
          line.includes("journey") ||
          line.includes("process") ||
          line.includes("step") ||
          line.includes("navigate"))
      ) {
        flows.push(currentLine);
      }
    }

    return flows;
  }

  private extractUserErrorScenarios(prd: string): string[] {
    const errors: string[] = [];
    const lines = prd.split("\n");

    for (let i = 0; i < lines.length; i++) {
      const currentLine = lines[i];
      if (!currentLine) continue;

      const line = currentLine.toLowerCase();

      // Look for error patterns
      if (
        line.includes("user") &&
        (line.includes("error") ||
          line.includes("fail") ||
          line.includes("wrong") ||
          line.includes("invalid") ||
          line.includes("problem") ||
          line.includes("issue") ||
          line.includes("retry") ||
          line.includes("recover"))
      ) {
        errors.push(currentLine);
      }
    }

    return errors;
  }

  private extractUserExperienceGuidelines(prd: string): string[] {
    const guidelines: string[] = [];
    const lines = prd.split("\n");

    for (let i = 0; i < lines.length; i++) {
      const currentLine = lines[i];
      if (!currentLine) continue;

      const line = currentLine.toLowerCase();

      // Look for UX guidelines
      if (
        line.includes("user") &&
        (line.includes("experience") ||
          line.includes("ux") ||
          line.includes("design") ||
          line.includes("interface") ||
          line.includes("interaction") ||
          line.includes("usability") ||
          line.includes("accessibility"))
      ) {
        const currentLine = lines[i];
        if (currentLine) guidelines.push(currentLine);
      }
    }

    return guidelines;
  }

  private extractUserStates(prd: string): string[] {
    const states: string[] = [];
    const lines = prd.split("\n");

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]?.toLowerCase() || "";

      // Look for state patterns
      if (
        line.includes("user") &&
        (line.includes("state") ||
          line.includes("status") ||
          line.includes("condition") ||
          line.includes("mode") ||
          line.includes("loading") ||
          line.includes("empty") ||
          line.includes("disabled"))
      ) {
        const currentLine = lines[i];
        if (currentLine) states.push(currentLine);
      }
    }

    return states;
  }

  private extractUserDecisionPoints(prd: string): string[] {
    const decisions: string[] = [];
    const lines = prd.split("\n");

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]?.toLowerCase() || "";

      // Look for decision patterns
      if (
        line.includes("user") &&
        (line.includes("choose") ||
          line.includes("select") ||
          line.includes("decide") ||
          line.includes("option") ||
          line.includes("alternative") ||
          line.includes("can") ||
          line.includes("may") ||
          line.includes("either"))
      ) {
        const currentLine = lines[i];
        if (currentLine) decisions.push(currentLine);
      }
    }

    return decisions;
  }

  private extractUserErrorRecovery(prd: string): string[] {
    const recovery: string[] = [];
    const lines = prd.split("\n");

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]?.toLowerCase() || "";

      // Look for recovery patterns
      if (
        line.includes("user") &&
        (line.includes("recover") ||
          line.includes("retry") ||
          line.includes("fix") ||
          line.includes("resolve") ||
          line.includes("correct") ||
          line.includes("handle") ||
          line.includes("manage"))
      ) {
        const currentLine = lines[i];
        if (currentLine) recovery.push(currentLine);
      }
    }

    return recovery;
  }

  private extractUserInterfacePatterns(types: string): string[] {
    const patterns: string[] = [];

    // Look for interface patterns in TypeScript types
    if (types.includes("interface") || types.includes("type")) {
      const lines = types.split("\n");

      for (const line of lines) {
        if (line.includes("interface") || line.includes("type")) {
          patterns.push(line);
        }
      }
    }

    return patterns;
  }

  private extractUserAccessibilityNeeds(componentList: string): string[] {
    const accessibility: string[] = [];

    // Look for accessibility requirements in component list
    if (
      componentList.toLowerCase().includes("accessibility") ||
      componentList.toLowerCase().includes("a11y") ||
      componentList.toLowerCase().includes("screen reader")
    ) {
      accessibility.push(
        "Accessibility requirements detected in component list"
      );
    }

    return accessibility;
  }

  private extractUserPerformanceExpectations(componentList: string): string[] {
    const performance: string[] = [];

    // Look for performance requirements
    if (
      componentList.toLowerCase().includes("performance") ||
      componentList.toLowerCase().includes("speed") ||
      componentList.toLowerCase().includes("loading")
    ) {
      performance.push("Performance requirements detected in component list");
    }

    return performance;
  }

  private formatDesignSystemForPrompt(
    analysis: any,
    designContext?: {
      enrichedContext?: EnrichedContext;
      designManifest?: DesignManifest;
    }
  ): string {
    if (
      !analysis.designSystem &&
      !analysis.designIntent &&
      !analysis.visualTokens
    ) {
      return "";
    }

    let designSection = "\n🎨 **DESIGN SYSTEM CONTEXT**:\n";

    if (analysis.designSystem) {
      designSection += `\n**Visual Tokens:**
- Primary Color: ${analysis.designSystem.colors?.primary || "Not specified"}
- Secondary Color: ${analysis.designSystem.colors?.secondary || "Not specified"}
- Typography: ${
        analysis.designSystem.typography?.heading || "Not specified"
      } (headings), ${
        analysis.designSystem.typography?.body || "Not specified"
      } (body)
- Spacing Scale: ${
        analysis.designSystem.spacing?.base || "Not specified"
      }px base unit
- Border Radius: ${
        analysis.designSystem.borderRadius?.base || "Not specified"
      }px
- Shadows: ${analysis.designSystem.shadows?.base || "Not specified"}`;
    }

    if (analysis.designIntent) {
      designSection += `\n\n**Design Principles:**
- Design Anchors: ${
        analysis.designIntent.design_anchors?.join(", ") || "Not specified"
      }
- Key Principles: ${
        analysis.designIntent.key_principles?.join(", ") || "Not specified"
      }
- User Experience Focus: ${
        analysis.designIntent.user_experience_focus || "Not specified"
      }`;
    }

    if (analysis.visualTokens) {
      designSection += `\n\n**Component Tokens:**
- Button Styles: ${JSON.stringify(analysis.visualTokens.buttons || {})}
- Input Styles: ${JSON.stringify(analysis.visualTokens.inputs || {})}
- Card Styles: ${JSON.stringify(analysis.visualTokens.cards || {})}`;
    }

    if (analysis.componentHierarchy) {
      designSection += `\n\n**Component Architecture:**
- Total Components: ${analysis.componentHierarchy.components?.length || 0}
- Component Groups: ${
        analysis.componentHierarchy.groups
          ?.map((g: any) => g.name)
          .join(", ") || "Not specified"
      }`;
    }

    designSection += "\n\n**Design Implementation Requirements:**\n";
    designSection += "- Use the specified color palette for all UI elements\n";
    designSection +=
      "- Apply consistent typography scale throughout the component\n";
    designSection +=
      "- Follow the established spacing and border radius patterns\n";
    designSection +=
      "- Implement component tokens for buttons, inputs, and cards\n";
    designSection +=
      "- Ensure visual consistency with the overall design system";

    return designSection;
  }

  /**
   * Filter enriched intents to find those relevant to the current component
   */
  private filterRelevantIntents(
    enrichedIntents: any[],
    componentName: string
  ): any[] {
    const componentNameLower = componentName.toLowerCase();
    
    return enrichedIntents.filter(intent => {
      // Check if component name matches any shadcn components
      const matchesShadcnComponent = intent.shadcn_components.some((comp: string) =>
        componentNameLower.includes(comp.toLowerCase())
      );
      
      // Check if component name matches canonical intent
      const matchesCanonicalIntent = componentNameLower.includes(
        intent.canonical_intent.toLowerCase()
      );
      
      // Check if component name matches original description
      const matchesDescription = intent.original_description.toLowerCase().includes(
        componentNameLower
      );
      
      return matchesShadcnComponent || matchesCanonicalIntent || matchesDescription;
    });
  }

  /**
   * Format an enriched intent as requirement strings
   */
  private formatIntentAsRequirements(intent: any): string[] {
    const requirements: string[] = [];
    
    // Add intent-based requirements
    requirements.push(
      `REQUIRED IMPLEMENTATION (Intent: ${intent.canonical_intent}):`
    );
    requirements.push(`- Original description: "${intent.original_description}"`);
    requirements.push(`- Confidence: ${(intent.intent_confidence * 100).toFixed(0)}%`);
    
    // Add shadcn component requirements
    if (intent.shadcn_components && intent.shadcn_components.length > 0) {
      requirements.push(`- Required shadcn/ui components: ${intent.shadcn_components.join(", ")}`);
    }
    
    // Add component imports
    if (intent.component_imports && intent.component_imports.length > 0) {
      requirements.push(`- Required imports: ${intent.component_imports.join(", ")}`);
    }
    
    // Add design pattern requirements
    if (intent.design_pattern) {
      requirements.push(`- Design pattern: ${intent.design_pattern.name || 'Custom pattern'}`);
    }
    
    // Add props requirements
    if (intent.props_spec && intent.props_spec.length > 0) {
      const requiredProps = intent.props_spec.filter((prop: any) => 
        intent.design_pattern?.required_props?.some((req: any) => req.name === prop.name)
      );
      const optionalProps = intent.props_spec.filter((prop: any) => 
        !intent.design_pattern?.required_props?.some((req: any) => req.name === prop.name)
      );
      
      if (requiredProps.length > 0) {
        requirements.push(`- Required props: ${requiredProps.map((p: any) => `${p.name}: ${p.type}`).join(", ")}`);
      }
      if (optionalProps.length > 0) {
        requirements.push(`- Optional props: ${optionalProps.map((p: any) => `${p.name}: ${p.type}`).join(", ")}`);
      }
    }
    
    // Add accessibility requirements
    if (intent.accessibility_spec) {
      const a11yReqs: string[] = [];
      if (intent.accessibility_spec.aria_attributes) {
        a11yReqs.push(`ARIA attributes: ${Object.keys(intent.accessibility_spec.aria_attributes).join(", ")}`);
      }
      if (intent.accessibility_spec.keyboard_support && intent.accessibility_spec.keyboard_support.length > 0) {
        a11yReqs.push(`Keyboard support: ${intent.accessibility_spec.keyboard_support.map((k: any) => k.key).join(", ")}`);
      }
      if (a11yReqs.length > 0) {
        requirements.push(`- Accessibility: ${a11yReqs.join("; ")}`);
      }
    }
    
    // Add state management requirements
    if (intent.state_management && intent.state_management.length > 0) {
      requirements.push(`- State management: ${intent.state_management.map((s: any) => s.name).join(", ")}`);
    }
    
    // Add design token requirements
    if (intent.design_tokens_used && Object.keys(intent.design_tokens_used).length > 0) {
      requirements.push(`- Design tokens: ${Object.keys(intent.design_tokens_used).join(", ")}`);
    }
    
    // Add code template if available
    if (intent.code_template) {
      requirements.push(`- Code template: ${intent.code_template.substring(0, 200)}${intent.code_template.length > 200 ? '...' : ''}`);
    }
    
    return requirements;
  }
}
