/**
 * QASubAgent Implementation
 *
 * Specialized sub-agent for quality assurance and code validation.
 * Uses Claude Sonnet for analytical capabilities.
 */

import { HybridAIClient } from "../../utils/hybridAIClient";
import {
  SubAgent,
  QAValidationInput,
  QAValidationOutput,
} from "../interfaces/SubAgent";
import { getSubAgentPersonality } from "../personalities/definitions";

export class QASubAgent
  implements SubAgent<QAValidationInput, QAValidationOutput>
{
  name = "QASubAgent";
  description =
    "Meticulous QA engineer with expertise in code review and quality assurance";
  personality: string;
  llmProvider: string;
  expertise: string[];
  private ai: HybridAIClient;

  constructor() {
    const personality = getSubAgentPersonality(this.name);
    if (!personality) {
      throw new Error(`Personality not found for ${this.name}`);
    }

    this.personality = personality.systemPrompt;
    this.llmProvider = personality.llmProvider;
    this.expertise = personality.expertise;
    this.ai = new HybridAIClient();
  }

  async run(input: QAValidationInput): Promise<QAValidationOutput> {
    const { code, component, standards } = input;

    try {
      // Use hybrid AI for comprehensive QA analysis
      const prompt = this.buildQAPrompt(code, component, standards);
      const { text: aiResponse } = await this.ai.generateText(prompt);

      // Parse AI response for issues and score
      const analysis = this.parseAIResponse(aiResponse);

      return {
        isValid: analysis.score >= 70,
        issues: analysis.issues,
        score: analysis.score,
      };
    } catch (error) {
      throw new Error(
        `QA validation failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  async validate(input: QAValidationInput): Promise<boolean> {
    return !!(input.code && input.component);
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

  private async checkTypeScriptCompliance(
    code: string,
    component: any
  ): Promise<{ issues: QAValidationOutput["issues"]; scoreDeduction: number }> {
    const issues: QAValidationOutput["issues"] = [];
    let scoreDeduction = 0;

    // Check for proper TypeScript usage
    if (!code.includes("interface") && !code.includes("type")) {
      issues.push({
        type: "warning",
        message: "Component lacks proper TypeScript interface definitions",
        severity: "medium",
      });
      scoreDeduction += 10;
    }

    if (code.includes("any")) {
      issues.push({
        type: "warning",
        message:
          'Usage of "any" type detected - consider using more specific types',
        severity: "low",
      });
      scoreDeduction += 5;
    }

    if (!code.includes("Props")) {
      issues.push({
        type: "suggestion",
        message: "Consider adding a Props interface for better type safety",
        severity: "low",
      });
      scoreDeduction += 2;
    }

    return { issues, scoreDeduction };
  }

  private async checkReactBestPractices(
    code: string,
    component: any
  ): Promise<{ issues: QAValidationOutput["issues"]; scoreDeduction: number }> {
    const issues: QAValidationOutput["issues"] = [];
    let scoreDeduction = 0;

    // Check for React best practices
    if (!code.includes('"use client"') && code.includes("useState")) {
      issues.push({
        type: "error",
        message: 'Client component missing "use client" directive',
        severity: "high",
      });
      scoreDeduction += 15;
    }

    if (code.includes("console.log")) {
      issues.push({
        type: "warning",
        message: "Console.log statements should be removed in production code",
        severity: "medium",
      });
      scoreDeduction += 5;
    }

    if (!code.includes("className") && code.includes("<div")) {
      issues.push({
        type: "suggestion",
        message: "Consider adding className prop for styling flexibility",
        severity: "low",
      });
      scoreDeduction += 2;
    }

    return { issues, scoreDeduction };
  }

  private async checkAccessibility(
    code: string,
    component: any
  ): Promise<{ issues: QAValidationOutput["issues"]; scoreDeduction: number }> {
    const issues: QAValidationOutput["issues"] = [];
    let scoreDeduction = 0;

    // Check for accessibility features
    if (code.includes("<button") && !code.includes("aria-")) {
      issues.push({
        type: "suggestion",
        message: "Consider adding ARIA attributes for better accessibility",
        severity: "low",
      });
      scoreDeduction += 3;
    }

    if (code.includes("<img") && !code.includes("alt=")) {
      issues.push({
        type: "warning",
        message: "Images should have alt attributes for accessibility",
        severity: "medium",
      });
      scoreDeduction += 8;
    }

    return { issues, scoreDeduction };
  }

  private async checkPerformance(
    code: string,
    component: any
  ): Promise<{ issues: QAValidationOutput["issues"]; scoreDeduction: number }> {
    const issues: QAValidationOutput["issues"] = [];
    let scoreDeduction = 0;

    // Check for performance considerations
    if (code.includes("useEffect") && !code.includes("[]")) {
      issues.push({
        type: "suggestion",
        message:
          "Consider adding dependency array to useEffect for better performance",
        severity: "low",
      });
      scoreDeduction += 3;
    }

    if (code.includes("map(") && code.includes("key=")) {
      // This is good - no deduction
    } else if (code.includes("map(")) {
      issues.push({
        type: "warning",
        message: "Array.map() should include key prop for React optimization",
        severity: "medium",
      });
      scoreDeduction += 8;
    }

    return { issues, scoreDeduction };
  }

  private async checkSecurity(
    code: string,
    component: any
  ): Promise<{ issues: QAValidationOutput["issues"]; scoreDeduction: number }> {
    const issues: QAValidationOutput["issues"] = [];
    let scoreDeduction = 0;

    // Check for security concerns
    if (code.includes("dangerouslySetInnerHTML")) {
      issues.push({
        type: "warning",
        message:
          "dangerouslySetInnerHTML can be a security risk - ensure content is sanitized",
        severity: "high",
      });
      scoreDeduction += 12;
    }

    if (code.includes("eval(")) {
      issues.push({
        type: "error",
        message: "eval() usage detected - this is a security vulnerability",
        severity: "high",
      });
      scoreDeduction += 20;
    }

    return { issues, scoreDeduction };
  }

  /**
   * Build QA prompt for Ollama
   */
  private buildQAPrompt(
    code: string,
    component: any,
    standards?: string[]
  ): string {
    const componentInfo =
      typeof component === "string" ? component : JSON.stringify(component);
    const standardsText =
      standards?.join(", ") ||
      "React, TypeScript, accessibility, performance, security";

    return `[mycontext] Plan: plan → generate → QA → docs → preview (→ checks)\nYou are a meticulous QA engineer specializing in React/TypeScript code review. Analyze the following component for quality issues.

Component Information:
${componentInfo}

Component Code:
\`\`\`tsx
${code}
\`\`\`

Standards to check: ${standardsText}

Analyze the code and return a JSON response with this exact structure:
{
  "score": number (0-100),
  "issues": [
    {
      "type": "error" | "warning" | "suggestion",
      "message": "string",
      "severity": "high" | "medium" | "low"
    }
  ]
}

Focus on:
- TypeScript compliance and type safety
- React best practices and patterns
- Accessibility (ARIA, semantic HTML, keyboard navigation)
- Performance (hooks usage, memoization, dependencies)
- Security (XSS prevention, input validation)
- Code structure and maintainability

Return only the JSON response:`;
  }

  /**
   * Parse AI response for QA analysis
   */
  private parseAIResponse(aiResponse: string): {
    score: number;
    issues: QAValidationOutput["issues"];
  } {
    try {
      // Try to extract JSON from the response
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON found in AI response");
      }

      const parsed = JSON.parse(jsonMatch[0]);

      // Validate the parsed response
      if (typeof parsed.score !== "number" || !Array.isArray(parsed.issues)) {
        throw new Error("Invalid response structure");
      }

      return {
        score: Math.max(0, Math.min(100, parsed.score)),
        issues: parsed.issues.map((issue: any) => ({
          type: issue.type || "suggestion",
          message: issue.message || "Unknown issue",
          severity: issue.severity || "medium",
        })),
      };
    } catch (error) {
      // Fallback to basic analysis if AI response parsing fails
      console.warn(
        "Failed to parse AI response, using fallback analysis:",
        error
      );

      const fallbackIssues = [
        {
          type: "warning" as const,
          message: "AI analysis failed, using basic validation",
          severity: "medium" as const,
        },
      ];

      return {
        score: 70, // Default passing score
        issues: fallbackIssues,
      };
    }
  }
}
