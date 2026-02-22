/**
 * InferenceEngine
 *
 * LLM-powered inference system that auto-completes high-confidence tasks,
 * self-critiques its own work, and learns from user corrections.
 */

import type {
  ASL,
  InferenceTask,
  InferenceResult,
  SelfCritique,
  LearningContext,
  Correction,
  Pattern,
} from "../types/asl";
import { AICore } from "../core/ai/AICore";

export class InferenceEngine {
  private learningContext: LearningContext;
  private aiCore: AICore;

  constructor() {
    this.learningContext = {
      corrections: [],
      preferences: {},
      patterns: [],
    };

    // Initialize AICore
    this.aiCore = AICore.getInstance({
      fallbackEnabled: true,
      workingDirectory: process.cwd(),
    });
  }

  /**
   * Run LLM-based inference for a task
   */
  async infer(
    task: InferenceTask,
    currentASL: Partial<ASL>,
    completedTasks: InferenceTask[]
  ): Promise<InferenceResult> {
    const prompt = this.buildInferencePrompt(task, currentASL, completedTasks);

    const response = await this.aiCore.generateText(prompt, {
      temperature: 0.3, // Lower temperature for more deterministic inference
    });

    let parsedResult: any;
    try {
      // Strip markdown code blocks if present
      let cleanedResponse = response.trim();
      if (cleanedResponse.startsWith('```json')) {
        cleanedResponse = cleanedResponse.replace(/^```json\s*/m, '').replace(/\s*```$/m, '');
      } else if (cleanedResponse.startsWith('```')) {
        cleanedResponse = cleanedResponse.replace(/^```\s*/m, '').replace(/\s*```$/m, '');
      }

      parsedResult = JSON.parse(cleanedResponse);
    } catch (error) {
      throw new Error(`Failed to parse inference result: ${response}`);
    }

    return {
      task,
      result: parsedResult.asl,
      confidence: parsedResult.confidence,
      reasoning: parsedResult.reasoning,
    };
  }

  /**
   * Self-critique: LLM validates its own inference
   */
  async selfCritique(
    inference: InferenceResult,
    currentASL: Partial<ASL>
  ): Promise<SelfCritique> {
    const prompt = this.buildCritiquePrompt(inference, currentASL);

    const response = await this.aiCore.generateText(prompt, {
      temperature: 0.2, // Even lower temperature for critique
    });

    let parsedCritique: any;
    try {
      // Strip markdown code blocks if present
      let cleanedResponse = response.trim();
      if (cleanedResponse.startsWith('```json')) {
        cleanedResponse = cleanedResponse.replace(/^```json\s*/m, '').replace(/\s*```$/m, '');
      } else if (cleanedResponse.startsWith('```')) {
        cleanedResponse = cleanedResponse.replace(/^```\s*/m, '').replace(/\s*```$/m, '');
      }

      parsedCritique = JSON.parse(cleanedResponse);
    } catch (error) {
      throw new Error(`Failed to parse critique result: ${response}`);
    }

    return {
      isValid: parsedCritique.isValid,
      confidence: parsedCritique.confidence,
      issues: parsedCritique.issues || [],
      suggestions: parsedCritique.suggestions || [],
    };
  }

  /**
   * Feed inference results to downstream tasks
   * Updates confidence and dependencies
   */
  feedToNextTasks(
    completedTask: InferenceTask,
    pendingTasks: InferenceTask[]
  ): InferenceTask[] {
    return pendingTasks.map((task) => {
      // Check if this task depends on the completed task
      if (task.dependencies.includes(completedTask.id)) {
        // Boost confidence if dependency completed successfully
        const confidenceBoost = completedTask.confidence >= 90 ? 10 : 5;
        const newConfidence = Math.min(100, task.confidence + confidenceBoost);

        return {
          ...task,
          confidence: newConfidence,
          autoInfer: newConfidence >= 90,
          needsConfirmation: newConfidence >= 70 && newConfidence < 90,
          needsUserInput: newConfidence < 70,
        };
      }

      return task;
    });
  }

  /**
   * Learn from user correction
   */
  async learnFromCorrection(
    taskId: string,
    inferredValue: any,
    correctedValue: any,
    reason?: string
  ): Promise<void> {
    const correction: Correction = {
      taskId,
      inferredValue,
      correctedValue,
      reason,
      timestamp: new Date(),
    };

    this.learningContext.corrections.push(correction);

    // Detect patterns from corrections
    await this.detectPatterns();
  }

  /**
   * Detect patterns from user corrections
   */
  private async detectPatterns(): Promise<void> {
    if (this.learningContext.corrections.length < 2) return;

    const prompt = this.buildPatternDetectionPrompt();

    const response = await this.aiCore.generateText(prompt, {
      temperature: 0.3,
    });

    let parsedPatterns: any;
    try {
      // Strip markdown code blocks if present
      let cleanedResponse = response.trim();
      if (cleanedResponse.startsWith('```json')) {
        cleanedResponse = cleanedResponse.replace(/^```json\s*/m, '').replace(/\s*```$/m, '');
      } else if (cleanedResponse.startsWith('```')) {
        cleanedResponse = cleanedResponse.replace(/^```\s*/m, '').replace(/\s*```$/m, '');
      }

      parsedPatterns = JSON.parse(cleanedResponse);
    } catch (error) {
      return; // Silently fail pattern detection
    }

    if (parsedPatterns.patterns && Array.isArray(parsedPatterns.patterns)) {
      this.learningContext.patterns = parsedPatterns.patterns;
    }
  }

  /**
   * Get learning context for prompt injection
   */
  getLearningContext(): string {
    if (this.learningContext.corrections.length === 0) {
      return "";
    }

    const corrections = this.learningContext.corrections
      .map(
        (c) =>
          `- User corrected "${c.inferredValue}" to "${c.correctedValue}"${
            c.reason ? ` (reason: ${c.reason})` : ""
          }`
      )
      .join("\n");

    const patterns =
      this.learningContext.patterns.length > 0
        ? "\n\nDetected patterns:\n" +
          this.learningContext.patterns
            .map((p) => `- ${p.description} (confidence: ${p.confidence}%)`)
            .join("\n")
        : "";

    return `\n\n## Learning Context (from previous corrections):\n${corrections}${patterns}\n\nPlease apply these learnings to your inference.`;
  }

  // ============================================================================
  // PROMPT BUILDING
  // ============================================================================

  private buildInferencePrompt(
    task: InferenceTask,
    currentASL: Partial<ASL>,
    completedTasks: InferenceTask[]
  ): string {
    const learningContext = this.getLearningContext();

    return `You are an expert software architect helping to build a complete application specification (ASL - Abstract Specification Language).

## Task
${task.description}

## Current ASL State
\`\`\`json
${JSON.stringify(currentASL, null, 2)}
\`\`\`

## Completed Tasks (for context)
${completedTasks.map((t) => `- ${t.description} (confidence: ${t.confidence}%)`).join("\n")}
${learningContext}

## Your Task
Infer the missing ASL sections for: "${task.description}"

Consider:
1. What entities, fields, pages, or permissions are needed?
2. What are the standard conventions for this type of application?
3. What can be reasonably inferred from the current state and completed tasks?
4. What patterns exist in similar applications?

## Guidelines
1. **Entities**: Must be a Record/Object where keys are entity names. Each entity must have 'name' and 'fields'. Fields must have 'name' and 'type' (string, number, boolean, date, json, ref).
2. **Auth**: If needed, provider must be 'email', 'oauth-github', 'oauth-google', or 'magic-link'.
3. **Permissions**: Each permission must have 'role', 'resource' (entity name or '*'), and 'actions' (array of: 'create', 'read', 'update', 'delete', 'manage'). **DO NOT USE 'can'**.
4. **Pages**: Must have 'path' (e.g., '/dashboard'), 'name' (component name), 'type' ('page' or 'layout').

Return a JSON response with:
\`\`\`json
{
  "asl": {
    // Partial ASL object with your inferred sections
    // Only include the sections you're inferring for this task
  },
  "confidence": 85, // 0-100 confidence score
  "reasoning": "I inferred X because Y. Standard convention suggests Z."
}
\`\`\`

Be conservative with confidence:
- 95-100%: Extremely certain (e.g., blog → needs Post entity)
- 85-94%: Very confident (e.g., blog → likely needs Comment entity)
- 70-84%: Moderately confident (e.g., auth method could be email or OAuth)
- Below 70%: Too ambiguous, user input needed

Only return JSON, no other text.`;
  }

  private buildCritiquePrompt(
    inference: InferenceResult,
    currentASL: Partial<ASL>
  ): string {
    return `You are a critical reviewer validating an AI inference.

## Original Task
${inference.task.description}

## Inference Made
\`\`\`json
${JSON.stringify(inference.result, null, 2)}
\`\`\`

## Reasoning Provided
${inference.reasoning}

## Confidence Claimed
${inference.confidence}%

## Current ASL State
\`\`\`json
${JSON.stringify(currentASL, null, 2)}
\`\`\`

## Your Task
Critically evaluate this inference. Look for:
1. **Logical errors**: Does the inference make sense?
2. **Inconsistencies**: Does it conflict with existing ASL?
3. **Over-confidence**: Is the confidence score justified?
4. **Missing context**: Are there assumptions that might be wrong?
5. **Type safety**: Are the field types appropriate?

Return a JSON response:
\`\`\`json
{
  "isValid": true, // or false
  "confidence": 85, // Updated confidence (can be lower or higher)
  "issues": [
    {
      "severity": "error", // "error" | "warning" | "info"
      "message": "Description of the issue",
      "field": "entities.User.fields[0]", // Optional: specific field path
      "suggestion": "How to fix it"
    }
  ],
  "suggestions": [
    "Consider adding X",
    "Y might be better as Z"
  ]
}
\`\`\`

Be harsh but fair. Drop confidence if there's any doubt.

Only return JSON, no other text.`;
  }

  private buildPatternDetectionPrompt(): string {
    const corrections = this.learningContext.corrections
      .map(
        (c, idx) =>
          `${idx + 1}. Task: ${c.taskId}\n   Inferred: ${JSON.stringify(c.inferredValue)}\n   Corrected: ${JSON.stringify(c.correctedValue)}${
            c.reason ? `\n   Reason: ${c.reason}` : ""
          }`
      )
      .join("\n\n");

    return `Analyze these user corrections and detect patterns:

${corrections}

Look for patterns in:
1. **Terminology**: User prefers certain terms (e.g., "article" instead of "post")
2. **Structure**: User prefers certain data structures (e.g., nested vs flat)
3. **Preferences**: User has specific preferences (e.g., always use OAuth instead of email/password)

Return JSON:
\`\`\`json
{
  "patterns": [
    {
      "type": "terminology", // "terminology" | "structure" | "preference"
      "description": "User prefers 'article' over 'post'",
      "examples": ["post → article", "blog post → article"],
      "confidence": 95 // How confident are you this is a real pattern
    }
  ]
}
\`\`\`

Only return JSON, no other text.`;
  }
}
