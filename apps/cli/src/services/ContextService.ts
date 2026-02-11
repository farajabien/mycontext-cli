import { DesignManifestManager } from '@mycontext/core';
import { DesignManifest, EnrichedContext } from '@mycontext/core';
import { logger } from '../utils/logger';
import { HybridAIClient } from '../utils/hybridAIClient';

export interface ContextQuery {
  path: string; // e.g., 'phases.visual_system.colors'
  filter?: string;
}

export class ContextService {
  private manifestManager: DesignManifestManager;
  private aiClient: HybridAIClient;
  private projectPath: string;
  private manifest: DesignManifest | null = null;

  constructor(projectPath: string) {
    this.projectPath = projectPath;
    this.manifestManager = new DesignManifestManager(projectPath);
    this.aiClient = new HybridAIClient();
  }

  /**
   * Initialize and load the manifest
   */
  async initialize(): Promise<void> {
    this.manifest = await this.manifestManager.loadDesignManifest();
  }

  /**
   * Get the full manifest
   */
  getManifest(): DesignManifest | null {
    return this.manifest;
  }

  /**
   * Query specific data from the manifest
   */
  async queryContext(query: ContextQuery): Promise<any> {
    if (!this.manifest) {
      await this.initialize();
    }
    
    if (!this.manifest) {
      throw new Error('Design manifest not found');
    }

    // Simple path-based lookup
    const parts = query.path.split('.');
    let current: any = this.manifest;

    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        return null; // Path not found
      }
    }

    return current;
  }

  /**
   * Get a consolidated enrichment context for the AI
   */
  async getEnrichedContext(): Promise<EnrichedContext | null> {
    return this.manifestManager.enrichContextWithDesign("", "", "");
  }

  /**
   * Validate an intent against the Prime Objective
   * (Milestone 2: Hard Gravity)
   */
  async validateIntent(intent: string): Promise<{
    valid: boolean;
    reason?: string;
    narrativeWeight: number;
  }> {
    if (!this.manifest) {
      await this.initialize();
    }

    if (!this.manifest) {
       return { valid: true, narrativeWeight: 0.5 };
    }

    const primeObjective = this.manifest.phases.functional_summary.core_purpose;
    const projectNarrative = this.manifest.phases.design_intent.visual_philosophy;
    
    logger.info(`Checking Hard Gravity for intent: "${intent}"`);

    const prompt = `You are the Hard Gravity Engine for Antigravity OS. 
Your job is to ensure that the AI Agent's intent aligns with the Project's Prime Objective.

PRIME OBJECTIVE: "${primeObjective}"
PROJECT NARRATIVE: "${projectNarrative}"

AGENT INTENT: "${intent}"

Does this intent align with the Prime Objective? 
Respond in JSON format:
{
  "aligns": true | false,
  "narrative_weight": 0.0 to 1.0,
  "reason": "Short explanation of alignment or deviation"
}

If the intent is a generic UI action (e.g., clicking a button to navigate), it should generally align unless it explicitly contradicts the objective.`;

    try {
      const response = await this.aiClient.generateText(prompt, {
        temperature: 0, // Deterministic
      });
      
      const result = JSON.parse(response.text.replace(/```json\n?|\n?```/g, '').trim());
      
      return {
        valid: result.aligns,
        reason: result.reason,
        narrativeWeight: result.narrative_weight
      };
    } catch (error) {
      logger.error("Failed to validate intent against gravity", error);
      return { valid: true, narrativeWeight: 0.5 }; // Fallback
    }
  }
}
