import { SubAgent } from "../interfaces/SubAgent";
import { ProjectIntelligenceEngine } from "../intelligence/ProjectIntelligence";
import { getSubAgentPersonality } from "@/constants/subAgentPersonalities";
import { AICore } from "../../core/ai/AICore";
import { LivingContext } from "../../types/living-context";

export class ArchitectAgent implements SubAgent {
  name = "ArchitectAgent";
  description =
    "System design, patterns, and performance optimization specialist";
  personality: string;
  llmProvider: string;
  expertise: string[];

  constructor() {
    const personality = getSubAgentPersonality(this.name);
    if (!personality) {
      // Fallback if no personality defined
      this.personality = "analytical";
      this.llmProvider = "github";
      this.expertise = ["architecture", "performance", "patterns"];
    } else {
      this.personality = personality.systemPrompt;
      this.llmProvider = personality.llmProvider;
      this.expertise = personality.expertise;
    }
  }

  async run(input: any): Promise<any> {
    return this.execute(input);
  }

  validate?(input: any): boolean | Promise<boolean> {
    return !!(input && (input.context || input.component));
  }

  async cleanup?(): Promise<void> {
    // No cleanup needed for this agent
  }

  async getStatus?(): Promise<any> {
    return {
      name: this.name,
      status: "idle",
      errorCount: 0,
      successCount: 0,
    };
  }

  async execute(input: any): Promise<any> {
    const { context: inputContext, component, codebase } = input;

    try {
      // NEW: Load from Living Brain (JSON)
      const aiCore = AICore.getInstance();
      const livingContext = await aiCore.getLivingContext();
      const context = livingContext || inputContext;

      if (livingContext) {
        console.log("🧠 ArchitectAgent anchoring to Living Brain");
      }
      // Analyze architectural requirements
      const architecture = await this.analyzeArchitecture(context, component);

      // Generate system design recommendations
      const recommendations = await this.generateRecommendations(
        architecture,
        codebase
      );

      // Optimize for performance
      const optimizations = await this.suggestOptimizations(
        component,
        codebase
      );

      return {
        architecture,
        recommendations,
        optimizations,
        patterns: this.identifyApplicablePatterns(component),
        scalabilityConsiderations: this.assessScalability(component, codebase),
      };
    } catch (error: any) {
      throw new Error(`Architecture analysis failed: ${error.message}`);
    }
  }

  private async analyzeArchitecture(
    context: any,
    component: any
  ): Promise<any> {
    return {
      componentType: this.classifyComponent(component),
      dataFlow: this.analyzeDataFlow(component),
      dependencies: this.analyzeDependencies(component),
      complexity: this.assessComplexity(component),
      patterns: this.detectPatterns(component),
    };
  }

  private classifyComponent(component: any): string {
    if (component.name.includes("Page") || component.name.includes("Layout"))
      return "structural";
    if (component.name.includes("Form") || component.name.includes("Input"))
      return "interactive";
    if (component.name.includes("Card") || component.name.includes("Display"))
      return "presentational";
    if (
      component.name.includes("Provider") ||
      component.name.includes("Context")
    )
      return "stateful";
    return "utility";
  }

  private analyzeDataFlow(component: any): any {
    return {
      inputSources: this.identifyInputSources(component),
      outputTargets: this.identifyOutputTargets(component),
      stateManagement: this.assessStateManagement(component),
      sideEffects: this.identifySideEffects(component),
    };
  }

  private identifyInputSources(component: any): string[] {
    const sources = [];
    if (component.dependencies?.includes("props")) sources.push("props");
    if (component.dependencies?.includes("context")) sources.push("context");
    if (component.dependencies?.includes("api")) sources.push("external-api");
    if (component.dependencies?.includes("localStorage"))
      sources.push("local-storage");
    return sources;
  }

  private identifyOutputTargets(component: any): string[] {
    const targets = [];
    if (component.context?.includes("callback"))
      targets.push("parent-callbacks");
    if (component.context?.includes("mutation")) targets.push("state-mutation");
    if (component.context?.includes("navigation"))
      targets.push("route-navigation");
    return targets;
  }

  private assessStateManagement(component: any): any {
    return {
      hasLocalState: component.dependencies?.includes("useState") || false,
      hasSharedState: component.dependencies?.includes("useContext") || false,
      hasServerState: component.dependencies?.includes("useQuery") || false,
      complexity: "low", // Can be enhanced with actual analysis
    };
  }

  private identifySideEffects(component: any): string[] {
    const effects = [];
    if (component.dependencies?.includes("useEffect"))
      effects.push("dom-effects");
    if (component.dependencies?.includes("fetch"))
      effects.push("network-requests");
    if (component.dependencies?.includes("localStorage"))
      effects.push("storage-effects");
    return effects;
  }

  private analyzeDependencies(component: any): any {
    return {
      external:
        component.dependencies?.filter(
          (dep: string) => !dep.startsWith("@/")
        ) || [],
      internal:
        component.dependencies?.filter((dep: string) => dep.startsWith("@/")) ||
        [],
      circular: [], // TODO: Implement circular dependency detection
      heavy: this.identifyHeavyDependencies(component.dependencies || []),
    };
  }

  private identifyHeavyDependencies(dependencies: string[]): string[] {
    const heavyLibs = ["lodash", "moment", "axios", "three", "chart.js"];
    return dependencies.filter((dep) =>
      heavyLibs.some((heavy) => dep.includes(heavy))
    );
  }

  private assessComplexity(component: any): any {
    const baseComplexity = 1;
    let complexity = baseComplexity;

    // Add complexity for dependencies
    complexity += (component.dependencies?.length || 0) * 0.5;

    // Add complexity for props
    complexity += (component.props?.length || 0) * 0.3;

    // Add complexity for conditional logic
    if (
      component.acceptanceCriteria?.some(
        (criteria: string) =>
          criteria.includes("conditional") || criteria.includes("state")
      )
    ) {
      complexity += 2;
    }

    return {
      score: Math.round(complexity * 10) / 10,
      rating: complexity < 3 ? "low" : complexity < 6 ? "medium" : "high",
      factors: this.getComplexityFactors(component),
    };
  }

  private getComplexityFactors(component: any): string[] {
    const factors = [];
    if ((component.dependencies?.length || 0) > 5)
      factors.push("many-dependencies");
    if (component.type === "form") factors.push("form-validation");
    if (component.context?.includes("async")) factors.push("async-operations");
    return factors;
  }

  private detectPatterns(component: any): string[] {
    const patterns = [];

    if (component.name.includes("Provider")) patterns.push("provider-pattern");
    if (component.dependencies?.includes("forwardRef"))
      patterns.push("ref-forwarding");
    if (component.type === "form") patterns.push("controlled-components");
    if (component.dependencies?.includes("memo")) patterns.push("memoization");
    if (component.name.includes("HOC") || component.name.startsWith("with"))
      patterns.push("higher-order-component");

    return patterns;
  }

  private async generateRecommendations(
    architecture: any,
    codebase: any
  ): Promise<string[]> {
    const recommendations = [];

    // Performance recommendations
    if (architecture.complexity.rating === "high") {
      recommendations.push(
        "Consider breaking down this component into smaller, focused components"
      );
    }

    if (architecture.dependencies.heavy.length > 0) {
      recommendations.push(
        `Consider lazy loading heavy dependencies: ${architecture.dependencies.heavy.join(
          ", "
        )}`
      );
    }

    // Pattern recommendations
    if (
      architecture.dataFlow.hasSharedState &&
      !architecture.patterns.includes("provider-pattern")
    ) {
      recommendations.push(
        "Consider using Context Provider pattern for shared state"
      );
    }

    if (
      architecture.componentType === "interactive" &&
      !architecture.patterns.includes("controlled-components")
    ) {
      recommendations.push(
        "Ensure form inputs are properly controlled components"
      );
    }

    // Scalability recommendations
    if (architecture.dependencies.external.length > 10) {
      recommendations.push(
        "High external dependency count - consider dependency consolidation"
      );
    }

    return recommendations;
  }

  private async suggestOptimizations(
    component: any,
    codebase: any
  ): Promise<any> {
    return {
      performance: this.getPerformanceOptimizations(component),
      bundle: this.getBundleOptimizations(component),
      rendering: this.getRenderingOptimizations(component),
      memory: this.getMemoryOptimizations(component),
    };
  }

  private getPerformanceOptimizations(component: any): string[] {
    const optimizations = [];

    if (
      !component.dependencies?.includes("memo") &&
      component.type === "display"
    ) {
      optimizations.push("Add React.memo for pure components");
    }

    if (
      component.dependencies?.includes("useEffect") &&
      !component.dependencies?.includes("useCallback")
    ) {
      optimizations.push("Consider useCallback for effect dependencies");
    }

    if (
      component.type === "interactive" &&
      !component.dependencies?.includes("useMemo")
    ) {
      optimizations.push("Consider useMemo for expensive calculations");
    }

    return optimizations;
  }

  private getBundleOptimizations(component: any): string[] {
    const optimizations = [];

    if (component.dependencies?.some((dep: string) => dep.includes("lodash"))) {
      optimizations.push(
        "Use individual lodash imports instead of full library"
      );
    }

    if (component.dependencies?.some((dep: string) => dep.includes("moment"))) {
      optimizations.push(
        "Consider replacing moment.js with day.js for smaller bundle"
      );
    }

    return optimizations;
  }

  private getRenderingOptimizations(component: any): string[] {
    const optimizations = [];

    if (component.type === "display" && component.context?.includes("list")) {
      optimizations.push("Implement virtualization for large lists");
    }

    if (component.dependencies?.includes("Image")) {
      optimizations.push("Ensure proper image optimization and lazy loading");
    }

    return optimizations;
  }

  private getMemoryOptimizations(component: any): string[] {
    const optimizations = [];

    if (component.dependencies?.includes("useEffect")) {
      optimizations.push("Ensure proper cleanup in useEffect hooks");
    }

    if (component.dependencies?.includes("EventListener")) {
      optimizations.push("Remove event listeners in component cleanup");
    }

    return optimizations;
  }

  private identifyApplicablePatterns(component: any): any {
    return {
      recommended: this.getRecommendedPatterns(component),
      current: this.detectPatterns(component),
      alternatives: this.getAlternativePatterns(component),
    };
  }

  private getRecommendedPatterns(component: any): string[] {
    const patterns = [];

    if (component.type === "form") {
      patterns.push(
        "controlled-components",
        "form-validation",
        "error-boundaries"
      );
    }

    if (component.type === "display" && component.context?.includes("list")) {
      patterns.push("virtualization", "pagination", "infinite-scroll");
    }

    if (component.name.includes("Modal") || component.name.includes("Dialog")) {
      patterns.push("portal-pattern", "focus-trap", "escape-key-handling");
    }

    return patterns;
  }

  private getAlternativePatterns(component: any): string[] {
    const alternatives = [];

    if (component.dependencies?.includes("useState")) {
      alternatives.push("useReducer for complex state logic");
    }

    if (component.dependencies?.includes("prop-drilling")) {
      alternatives.push("context-api", "component-composition");
    }

    return alternatives;
  }

  private assessScalability(component: any, codebase: any): any {
    return {
      maintainability: this.assessMaintainability(component),
      extensibility: this.assessExtensibility(component),
      testability: this.assessTestability(component),
      reusability: this.assessReusability(component),
    };
  }

  private assessMaintainability(component: any): any {
    const score = this.calculateMaintainabilityScore(component);
    return {
      score,
      rating:
        score > 8
          ? "excellent"
          : score > 6
          ? "good"
          : score > 4
          ? "fair"
          : "poor",
      factors: this.getMaintainabilityFactors(component),
    };
  }

  private calculateMaintainabilityScore(component: any): number {
    let score = 10;

    // Deduct points for complexity
    if (component.dependencies?.length > 10) score -= 2;
    if (component.acceptanceCriteria?.length > 8) score -= 1;

    // Add points for good practices
    if (component.dependencies?.includes("TypeScript")) score += 1;
    if (component.context?.includes("documented")) score += 1;

    return Math.max(0, Math.min(10, score));
  }

  private getMaintainabilityFactors(component: any): string[] {
    const factors = [];

    if ((component.dependencies?.length || 0) > 10)
      factors.push("high-dependency-count");
    if (!component.dependencies?.includes("TypeScript"))
      factors.push("no-type-safety");
    if ((component.acceptanceCriteria?.length || 0) > 8)
      factors.push("complex-requirements");

    return factors;
  }

  private assessExtensibility(component: any): any {
    return {
      rating: "good", // Simplified for now
      suggestions: [
        "Use composition over inheritance",
        "Implement proper prop interfaces",
        "Consider render props pattern for flexibility",
      ],
    };
  }

  private assessTestability(component: any): any {
    return {
      rating: "good", // Simplified for now
      suggestions: [
        "Separate business logic from UI logic",
        "Use dependency injection for external services",
        "Ensure components are pure when possible",
      ],
    };
  }

  private assessReusability(component: any): any {
    return {
      rating: "good", // Simplified for now
      suggestions: [
        "Make components configurable via props",
        "Avoid hard-coded values",
        "Design for composition",
      ],
    };
  }
}
