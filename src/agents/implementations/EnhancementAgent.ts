/**
 * EnhancementAgent Implementation
 *
 * Specialized sub-agent for iterative component design refinement.
 * Focuses on enhancing single React components through user prompts,
 * maintaining design consistency, and extracting design tokens.
 */

import {
  ComponentValidation,
  DesignTokens,
  SubAgent,
} from "../interfaces/SubAgent";
import { getSubAgentPersonality } from "../personalities/definitions";

import { DesignTokenExtractor } from "../../utils/designTokenExtractor";
import { ComponentValidator } from "../../utils/componentValidator";

export class EnhancementAgent
  implements SubAgent<EnhancementInput, EnhancementOutput>
{
  name = "EnhancementAgent";
  description =
    "Specialized agent for iterative component design refinement and enhancement";
  personality: string;
  llmProvider: string;
  expertise: string[];

  private tokenExtractor: DesignTokenExtractor;
  private validator: ComponentValidator;

  constructor() {
    const personality = getSubAgentPersonality(this.name);
    if (!personality) {
      throw new Error(`Personality not found for ${this.name}`);
    }

    this.personality = personality.systemPrompt;
    this.llmProvider = personality.llmProvider;
    this.expertise = personality.expertise;

    // Initialize utilities
    this.tokenExtractor = new DesignTokenExtractor();
    this.validator = new ComponentValidator();
  }

  async run(input: EnhancementInput): Promise<EnhancementOutput> {
    const { currentComponent, userPrompt, designContext, constraints } = input;

    try {
      // 1. Analyze current component
      const analysis = await this.analyzeComponent(currentComponent);

      // 2. Clarify the user's prompt to remove ambiguity and infer symmetric behavior
      const clarified = await this.clarifyUserRequest(
        currentComponent,
        userPrompt,
        analysis,
        designContext
      );

      // 3. Generate enhancement based on clarified prompt
      const gen = await this.generateEnhancement(
        currentComponent,
        clarified?.clarifiedText || userPrompt,
        analysis,
        designContext
      );
      const enhancedComponent = gen.enhancedComponent;

      // 4. Extract design tokens from enhanced component
      const designTokens = await this.tokenExtractor.extractTokens(
        enhancedComponent
      );

      // 5. Validate enhancement against constraints
      const validation = await this.validator.validateEnhancement(
        enhancedComponent,
        constraints
      );

      // 6. Generate enhancement suggestions
      const suggestions = await this.generateSuggestions(
        enhancedComponent,
        designTokens
      );

      // 7. Calculate changes between versions
      const changes = this.diffComponents(currentComponent, enhancedComponent);

      return {
        enhancedComponent,
        originalComponent: currentComponent, // Add the original component
        designTokens,
        changes,
        validation,
        suggestions,
        analysis: {
          originalAnalysis: analysis,
          enhancedAnalysis: await this.analyzeComponent(enhancedComponent),
        },
        promptUsed: {
          system: gen.systemPrompt,
          composed: gen.composedPrompt,
          clarified: clarified?.clarifiedText,
        },
      };
    } catch (error) {
      console.error("EnhancementAgent failed:", error);
      throw new Error(
        `Enhancement failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  async validate(input: EnhancementInput): Promise<boolean> {
    // Validate required fields
    if (!input.currentComponent || !input.userPrompt) {
      return false;
    }

    // Validate component syntax
    try {
      await this.validator.validateSyntax(input.currentComponent);
      return true;
    } catch (error) {
      return false;
    }
  }

  async getStatus(): Promise<{
    name: string;
    status: "idle" | "running" | "completed" | "error";
    lastRun?: Date;
    executionTime?: number;
    errorCount: number;
    successCount: number;
  }> {
    return {
      name: this.name,
      status: "idle",
      errorCount: 0,
      successCount: 0,
    };
  }

  private async analyzeComponent(
    componentCode: string
  ): Promise<ComponentAnalysis> {
    const analysis: ComponentAnalysis = {
      type: this.detectComponentType(componentCode),
      complexity: this.assessComplexity(componentCode),
      dependencies: this.extractDependencies(componentCode),
      designPatterns: this.extractDesignPatterns(componentCode),
      accessibility: this.assessAccessibility(componentCode),
      performance: this.assessPerformance(componentCode),
      linesOfCode: componentCode.split("\n").length,
      hasState: this.hasStateManagement(componentCode),
      hasEffects: this.hasSideEffects(componentCode),
      hasProps: this.hasProps(componentCode),
    };

    return analysis;
  }

  private async generateEnhancement(
    currentComponent: string,
    prompt: string,
    analysis: ComponentAnalysis,
    designContext: DesignContext
  ): Promise<{
    enhancedComponent: string;
    systemPrompt: string;
    composedPrompt: string;
    rawOutput?: string;
    warning?: string;
  }> {
    const systemPrompt = this.buildEnhancementPrompt(analysis, designContext);
    const composedPrompt = `${systemPrompt}\n\nUser Request: ${prompt}\n\nCurrent Component:\n\`\`\`tsx\n${currentComponent}\n\`\`\`\n\nEnhanced Component:`;

    // Use fallback enhancement generation
    const providers = [
      {
        name: "fallback",
        generate: async (options: any) => {
          return { content: this.generateBasicEnhancement(currentComponent, prompt) };
        },
      },
    ];

    let lastRawOutput: string | undefined;
    let lastError: unknown;
    for (const provider of providers) {
      try {
        if (provider.generate) {
          if (process.env.DEBUG_ENHANCER === "true") {
            console.log(
              `[enhancer] provider=${provider.name} calling generate`
            );
          }
          const result = await provider.generate({
            prompt: composedPrompt,
            systemPrompt,
            temperature: 0.7,
            maxTokens: 4000,
          });

          if (process.env.DEBUG_ENHANCER === "true") {
            console.log(
              `[enhancer] provider=${provider.name} raw length=${
                result.content?.length || 0
              } sample=`,
              (result.content || "").slice(0, 240)
            );
          }

          lastRawOutput = result.content || "";
          const enhancedComponent = this.postProcessComponent(
            lastRawOutput || ""
          );

          // Validate the enhanced component
          if (await this.validator.validateSyntax(enhancedComponent)) {
            return {
              enhancedComponent,
              systemPrompt,
              composedPrompt,
              rawOutput: lastRawOutput,
            };
          }
        }
      } catch (error) {
        console.warn(
          `${provider.name} failed, trying next...`,
          error instanceof Error ? error.message : error
        );
        lastError = error;
        continue;
      }
    }

    // Soft fallback: return original component with warning and raw output
    const allowSoftFallback =
      process.env.ENHANCER_NO_SOFT_FALLBACK === "true" ? false : true;
    if (allowSoftFallback) {
      return {
        enhancedComponent: currentComponent,
        systemPrompt,
        composedPrompt,
        rawOutput: lastRawOutput,
        warning: `AI generation returned invalid code. Falling back to original component. ${
          lastError instanceof Error ? lastError.message : ""
        }`,
      };
    }

    throw new Error("All AI providers failed to generate enhancement");
  }

  /**
   * Clarify the user's freeform request into a precise, unambiguous instruction.
   * Encourages symmetric behavior (e.g., if increment changes, consider decrement implications)
   * but preserves the rule of minimal change unless explicitly requested.
   */
  private async clarifyUserRequest(
    _currentComponent: string,
    userPrompt: string,
    analysis: ComponentAnalysis,
    designContext: DesignContext
  ): Promise<{ clarifiedText: string } | null> {
    // Deterministic clarifier (no external providers)
    try {
      const text = String(userPrompt || "").trim();
      if (!text) return null;

      const normalized = text.replace(/\s+/g, " ").replace(/\s+\.$/, ".");

      const assumptions: string[] = [];
      const implications: string[] = [];

      // Heuristics based on component analysis
      if (analysis.type === "form") {
        if (/validate|error|submit/i.test(normalized)) {
          assumptions.push("Form uses zod + react-hook-form for validation");
          implications.push(
            "Show inline errors and disable submit while submitting"
          );
        }
      }
      if (/increment|decrement|counter/i.test(normalized)) {
        implications.push(
          "Ensure symmetric increment/decrement behavior and bounds checks"
        );
      }
      if (/accessib|aria|keyboard|focus/i.test(normalized)) {
        assumptions.push(
          "Follow Radix a11y patterns for roles, ARIA and focus management"
        );
      }
      if (designContext?.colors?.length) {
        assumptions.push(
          `Respect brand colors (${designContext.colors
            .slice(0, 3)
            .join(", ")}${designContext.colors.length > 3 ? ", …" : ""})`
        );
      }

      const clarifiedText = [
        normalized,
        assumptions.length ? ` Assumptions: ${assumptions.join("; ")}.` : "",
        implications.length ? ` Implications: ${implications.join("; ")}.` : "",
      ]
        .join("")
        .trim();

      return { clarifiedText };
    } catch {
      return null;
    }
  }

  private buildEnhancementPrompt(
    analysis: ComponentAnalysis,
    designContext: DesignContext
  ): string {
    return `
You are an expert React component designer specializing in iterative refinement and enhancement.

Current Component Analysis (for context only):
- Type: ${analysis.type}
- Complexity: ${analysis.complexity}
- Dependencies: ${analysis.dependencies.join(", ")}
- Design Patterns: ${analysis.designPatterns.join(", ")}
- Has State: ${analysis.hasState}
- Has Props: ${analysis.hasProps}

Design Context:
- Colors: ${designContext.colors.join(", ")}
- Spacing: ${designContext.spacing}
- Typography: ${designContext.typography}
- Interactions: ${designContext.interactions.join(", ")}

Enhancement Guidelines (visual-first):
1. Prioritize fulfilling the user's request for visualization and interactivity. Avoid unrelated changes.
2. Preserve public interfaces (props/state names) unless the user asks to change them.
3. It's okay for the component to be larger or include internal helper functions and small subcomponents in the same file.
4. Use shadcn primitives via alias imports (e.g., import { Button } from '@ui/button'). Avoid external libraries. Inline logic and Tailwind are preferred.
5. Accessibility and responsiveness are encouraged when they don't conflict with the user's request.
6. Maintain strict TypeScript.
7. If the user's request is ambiguous, make the smallest reasonable change. If the request implies symmetry (e.g., increment logic), consider mirroring related actions.
8. Return the full component code; no markdown or prose is allowed.

Code Quality Requirements:
- Use functional components with hooks
- Implement proper TypeScript interfaces
- Add JSDoc comments for complex logic
- Use semantic HTML elements
- Implement proper event handling
- Add proper prop validation
- Use Tailwind CSS for styling
- Ensure responsive design with mobile-first approach

Output rules (critical):
 - Return only valid TSX code. No prose, no markdown fences, no backticks.
 - Must include a single default export: export default function ComponentName() { ... }
 - Use shadcn primitives via alias imports (e.g., import { Button } from '@ui/button').
 - Avoid unused imports. Comments are allowed.
 - Ensure the code compiles as-is.
 
Return only the enhanced React component code with TypeScript, nothing else.
`;
  }

  private postProcessComponent(componentCode: string): string {
    // Clean up and normalize LLM output into a valid default-exported TSX component
    let cleaned = componentCode.trim();

    // 1) Strip markdown code fences and any language hints
    cleaned = cleaned.replace(/```tsx?\n?/gi, "").replace(/```\n?/g, "");

    // 2) Remove leading prose before first likely code token
    const firstCodeIdxCandidates = [
      cleaned.indexOf("\nimport "),
      cleaned.indexOf("import "),
      cleaned.indexOf("export "),
      cleaned.indexOf("function "),
      cleaned.indexOf("const "),
      cleaned.indexOf("class "),
    ].filter((idx) => idx >= 0);
    if (firstCodeIdxCandidates.length > 0) {
      const startIdx = Math.min(...firstCodeIdxCandidates);
      cleaned = cleaned.slice(startIdx);
    }

    // 3) Ensure React import if hooks are referenced but no React import is present
    const usesHooks = /(useState|useEffect|useMemo|useCallback|useRef)/.test(
      cleaned
    );
    const hasReactImport = /import\s+React/.test(cleaned);
    if (usesHooks && !hasReactImport) {
      cleaned =
        `import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";\n` +
        cleaned;
    }

    // 4) Normalize exports
    if (!/export\s+default/.test(cleaned)) {
      // Convert `export function Name` → `export default function Name`
      if (/export\s+function\s+([A-Z]\w*)\s*\(/.test(cleaned)) {
        cleaned = cleaned.replace(
          /export\s+function\s+([A-Z]\w*)\s*\(/,
          "export default function $1("
        );
      }

      // Convert `export const Name = ...` → `const Name = ...; export default Name;`
      if (!/export\s+default/.test(cleaned)) {
        cleaned = cleaned.replace(
          /export\s+const\s+([A-Z]\w*)\s*=\s*/g,
          "const $1 = "
        );
      }

      // If still no default export, append one for obvious component declarations
      if (!/export\s+default/.test(cleaned)) {
        const fnMatch = cleaned.match(/function\s+([A-Z]\w*)\s*\(/);
        const varMatch = cleaned.match(/const\s+([A-Z]\w*)\s*=\s*(?:\(|<)/);
        const componentName =
          (fnMatch && fnMatch[1]) || (varMatch && varMatch[1]) || null;
        if (componentName) {
          // Avoid duplicate default export lines
          const hasDefaultLine = new RegExp(
            `export\\s+default\\s+${componentName}`
          ).test(cleaned);
          if (!hasDefaultLine) {
            cleaned = `${cleaned.trim()}\n\nexport default ${componentName};\n`;
          }
        }
      }
    }

    // 5) Final validation or last-resort JSX wrapper
    if (!/export\s+default/.test(cleaned)) {
      // If the model produced a bare JSX tree, wrap it
      const hasJSX = /<[A-Za-z][\s\S]*>/.test(cleaned);
      const hasImportsOrExports = /\b(import|export)\b/.test(cleaned);
      if (hasJSX && !hasImportsOrExports) {
        const wrapped = `import React from "react";\n\nfunction EnhancedComponent() {\n  return (\n${cleaned}\n  );\n}\n\nexport default EnhancedComponent;\n`;
        return wrapped;
      }

      // Otherwise, still invalid
      throw new Error("Generated code is not a valid React component");
    }

    return cleaned;
  }

  private detectComponentType(componentCode: string): string {
    const componentName = this.extractComponentName(componentCode);

    if (componentName.toLowerCase().includes("form")) return "form";
    if (
      componentName.toLowerCase().includes("modal") ||
      componentName.toLowerCase().includes("dialog")
    )
      return "modal";
    if (componentName.toLowerCase().includes("card")) return "card";
    if (componentName.toLowerCase().includes("button")) return "button";
    if (componentName.toLowerCase().includes("input")) return "input";
    if (componentName.toLowerCase().includes("list")) return "list";
    if (componentName.toLowerCase().includes("grid")) return "grid";
    if (componentName.toLowerCase().includes("table")) return "table";
    if (componentName.toLowerCase().includes("chart")) return "chart";
    if (componentName.toLowerCase().includes("nav")) return "navigation";

    return "custom";
  }

  private assessComplexity(
    componentCode: string
  ): "simple" | "medium" | "complex" {
    const lines = componentCode.split("\n").length;
    const hasState = this.hasStateManagement(componentCode);
    const hasEffects = this.hasSideEffects(componentCode);
    const hasProps = this.hasProps(componentCode);
    const hasConditionals = (
      componentCode.match(/if|else|switch|ternary/g) || []
    ).length;
    const hasLoops = (componentCode.match(/map|forEach|for|while/g) || [])
      .length;

    let complexity = 0;
    if (lines > 100) complexity += 2;
    if (hasState) complexity += 1;
    if (hasEffects) complexity += 1;
    if (hasProps) complexity += 1;
    if (hasConditionals > 3) complexity += 1;
    if (hasLoops > 2) complexity += 1;

    if (complexity <= 2) return "simple";
    if (complexity <= 4) return "medium";
    return "complex";
  }

  private extractDependencies(componentCode: string): string[] {
    const dependencies: string[] = [];

    // Extract React imports
    if (componentCode.includes("useState")) dependencies.push("useState");
    if (componentCode.includes("useEffect")) dependencies.push("useEffect");
    if (componentCode.includes("useCallback")) dependencies.push("useCallback");
    if (componentCode.includes("useMemo")) dependencies.push("useMemo");
    if (componentCode.includes("useRef")) dependencies.push("useRef");
    if (componentCode.includes("useContext")) dependencies.push("useContext");

    // Extract shadcn/ui components
    const shadcnComponents = [
      "Button",
      "Input",
      "Card",
      "Dialog",
      "Modal",
      "Select",
      "Checkbox",
      "RadioGroup",
      "Textarea",
      "Switch",
      "Slider",
      "Progress",
      "Badge",
      "Avatar",
      "Alert",
      "Toast",
      "Tooltip",
      "Popover",
      "DropdownMenu",
    ];

    shadcnComponents.forEach((component) => {
      if (componentCode.includes(component)) {
        dependencies.push(`@ui/${component.toLowerCase()}`);
      }
    });

    return dependencies;
  }

  private extractDesignPatterns(componentCode: string): string[] {
    const patterns: string[] = [];

    if (componentCode.includes("className=")) patterns.push("Tailwind CSS");
    if (componentCode.includes("useState")) patterns.push("State Management");
    if (componentCode.includes("useEffect")) patterns.push("Side Effects");
    if (componentCode.includes("onClick")) patterns.push("Event Handling");
    if (componentCode.includes("disabled")) patterns.push("Disabled States");
    if (componentCode.includes("loading")) patterns.push("Loading States");
    if (componentCode.includes("error")) patterns.push("Error Handling");
    if (componentCode.includes("aria-")) patterns.push("Accessibility");
    if (componentCode.includes("transition")) patterns.push("Animations");
    if (componentCode.includes("hover:")) patterns.push("Hover Effects");

    return patterns;
  }

  private assessAccessibility(componentCode: string): number {
    let score = 0;

    if (componentCode.includes("aria-label")) score += 20;
    if (componentCode.includes("aria-describedby")) score += 15;
    if (componentCode.includes("role=")) score += 15;
    if (componentCode.includes("tabIndex")) score += 10;
    if (componentCode.includes("onKeyDown")) score += 10;
    if (componentCode.includes("alt=")) score += 10;
    if (componentCode.includes("semantic")) score += 10;
    if (componentCode.includes("focus")) score += 10;

    return Math.min(score, 100);
  }

  private assessPerformance(componentCode: string): number {
    let score = 100;

    if (componentCode.includes("useMemo")) score += 10;
    if (componentCode.includes("useCallback")) score += 10;
    if (componentCode.includes("React.memo")) score += 10;
    if (componentCode.includes("lazy")) score += 10;
    if (componentCode.includes("suspense")) score += 10;

    // Penalties for performance issues
    if (
      componentCode.includes("setInterval") &&
      !componentCode.includes("clearInterval")
    )
      score -= 20;
    if (
      componentCode.includes("addEventListener") &&
      !componentCode.includes("removeEventListener")
    )
      score -= 20;
    if (
      componentCode.includes("new Date()") &&
      componentCode.includes("useEffect")
    )
      score -= 15;

    return Math.max(score, 0);
  }

  private hasStateManagement(componentCode: string): boolean {
    return (
      componentCode.includes("useState") || componentCode.includes("useReducer")
    );
  }

  private hasSideEffects(componentCode: string): boolean {
    return (
      componentCode.includes("useEffect") ||
      componentCode.includes("useLayoutEffect")
    );
  }

  private hasProps(componentCode: string): boolean {
    return (
      componentCode.includes("props") ||
      componentCode.includes("interface") ||
      componentCode.includes("type Props")
    );
  }

  private extractComponentName(componentCode: string): string {
    const match = componentCode.match(/export\s+default\s+function\s+(\w+)/);
    return match ? match[1] : "UnknownComponent";
  }

  private async generateSuggestions(
    componentCode: string,
    designTokens: DesignTokens
  ): Promise<EnhancementSuggestions> {
    const suggestions: EnhancementSuggestions = {
      accessibility: [],
      performance: [],
      design: [],
      functionality: [],
    };

    // Analyze for accessibility improvements
    if (!componentCode.includes("aria-label")) {
      suggestions.accessibility.push(
        "Add ARIA labels for better screen reader support"
      );
    }
    if (!componentCode.includes("onKeyDown")) {
      suggestions.accessibility.push("Add keyboard navigation support");
    }
    if (!componentCode.includes("focus")) {
      suggestions.accessibility.push("Add focus management for better UX");
    }

    // Analyze for performance improvements
    if (
      componentCode.includes("useState") &&
      !componentCode.includes("useCallback")
    ) {
      suggestions.performance.push(
        "Consider using useCallback for event handlers"
      );
    }
    if (componentCode.includes("map") && !componentCode.includes("key=")) {
      suggestions.performance.push("Add key prop to mapped elements");
    }

    // Analyze for design improvements
    if (!componentCode.includes("transition")) {
      suggestions.design.push(
        "Add smooth transitions for better user experience"
      );
    }
    if (!componentCode.includes("hover:")) {
      suggestions.design.push("Add hover effects for interactive elements");
    }
    if (!componentCode.includes("responsive")) {
      suggestions.design.push("Ensure responsive design for mobile devices");
    }

    // Analyze for functionality improvements
    if (
      componentCode.includes("onClick") &&
      !componentCode.includes("disabled")
    ) {
      suggestions.functionality.push("Add loading states for async operations");
    }
    if (!componentCode.includes("error")) {
      suggestions.functionality.push(
        "Add error handling for better reliability"
      );
    }

    return suggestions;
  }

  private diffComponents(
    originalComponent: string,
    enhancedComponent: string
  ): EnhancementChanges {
    const changes: EnhancementChanges = {
      addedLines: [],
      removedLines: [],
      modifiedLines: [],
      totalChanges: 0,
    };

    const originalLines = originalComponent.split("\n");
    const enhancedLines = enhancedComponent.split("\n");

    // Simple line-by-line comparison
    const maxLines = Math.max(originalLines.length, enhancedLines.length);

    for (let i = 0; i < maxLines; i++) {
      const originalLine = originalLines[i] || "";
      const enhancedLine = enhancedLines[i] || "";

      if (originalLine !== enhancedLine) {
        if (!originalLine) {
          changes.addedLines.push({ line: i + 1, content: enhancedLine });
        } else if (!enhancedLine) {
          changes.removedLines.push({ line: i + 1, content: originalLine });
        } else {
          changes.modifiedLines.push({
            line: i + 1,
            original: originalLine,
            enhanced: enhancedLine,
          });
        }
        changes.totalChanges++;
      }
    }

    return changes;
  }

  private generateBasicEnhancement(currentComponent: string, prompt: string): string {
    return `// Enhanced component based on: ${prompt}
// This is a fallback enhancement template
// Configure an AI provider for full enhancement generation

${currentComponent}

// Enhancement suggestions:
// - Add proper TypeScript types
// - Improve accessibility features
// - Optimize performance
// - Add error handling
// - Enhance styling and layout`;
  }
}

// Type definitions for the EnhancementAgent
export interface EnhancementInput {
  currentComponent: string;
  userPrompt: string;
  designContext: DesignContext;
  constraints: {
    maxDependencies: number;
    targetFramework: "react" | "next";
    uiLibrary: "shadcn" | "custom";
  };
}

export interface EnhancementOutput {
  enhancedComponent: string;
  originalComponent: string; // Add original component for comparison
  designTokens: DesignTokens;
  changes: EnhancementChanges;
  validation: ComponentValidation;
  suggestions: EnhancementSuggestions;
  analysis: {
    originalAnalysis: ComponentAnalysis;
    enhancedAnalysis: ComponentAnalysis;
  };
  promptUsed?: {
    system: string;
    composed: string;
    clarified?: string;
  };
  rawOutput?: string;
  warning?: string;
}

export interface ComponentAnalysis {
  type: string;
  complexity: "simple" | "medium" | "complex";
  dependencies: string[];
  designPatterns: string[];
  accessibility: number;
  performance: number;
  linesOfCode: number;
  hasState: boolean;
  hasEffects: boolean;
  hasProps: boolean;
}

export interface DesignContext {
  colors: string[];
  spacing: string;
  typography: string;
  interactions: string[];
}

export interface EnhancementChanges {
  addedLines: Array<{ line: number; content: string }>;
  removedLines: Array<{ line: number; content: string }>;
  modifiedLines: Array<{
    line: number;
    original: string;
    enhanced: string;
  }>;
  totalChanges: number;
}

export interface EnhancementSuggestions {
  accessibility: string[];
  performance: string[];
  design: string[];
  functionality: string[];
}
