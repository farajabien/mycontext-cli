/**
 * Authority Engine Blueprint Types
 *
 * Schema for Production Blueprints from the Multimodal Authority Engine (IdeaToVideo).
 * The MyContext render command ingests these blueprints and produces final media.
 */

/**
 * VoiceTone — Governs the vocal synthesis parameters for AI voiceover
 */
export interface VoiceTone {
  style: "calm" | "confident" | "energetic" | "authoritative" | "conversational" | "dramatic";
  pace?: "slow" | "moderate" | "fast";
  emphasis?: string[];          // Words/phrases to stress
  pauseAfterBeats?: number;     // Seconds of silence between story beats
}

/**
 * SceneBlueprint — A single scene in the production
 */
export interface SceneBlueprint {
  sceneNumber: number;
  title: string;
  script: string;               // Verbatim spoken word for this scene
  visualPrompt: string;         // Storyboard description for the visual generator
  duration: number;             // Target duration in seconds
  plotPillar?: string;          // Strategic "Plot Pillar" this scene serves
  storyBeat?: string;           // The narrative beat (hook, build, payoff, etc.)
  transition?: "cut" | "fade" | "dissolve" | "wipe";
  bRollNotes?: string;          // Additional B-Roll direction
}

/**
 * ProductionBlueprint — The complete production plan from the Authority Engine
 */
export interface ProductionBlueprint {
  /** Metadata */
  id: string;
  title: string;
  description: string;
  createdAt: string;
  source: "authority-engine" | "manual" | "imported";

  /** Strategic Context */
  narrative: {
    mission: string;            // Brand mission statement
    villain: string;            // "What we fight against"
    identityShift: string;      // "Who the audience becomes"
  };

  /** Voice Configuration */
  voiceTone: VoiceTone;

  /** Scene Sequence */
  scenes: SceneBlueprint[];

  /** Aggregate Timing */
  totalDuration: number;        // Sum of all scene durations

  /** Output Preferences */
  outputFormat: {
    aspectRatio: "9:16" | "16:9" | "1:1";
    resolution: "720p" | "1080p" | "4K";
  };

  /** Optional: Story Beat Architecture */
  storyBeats?: string[];
  plotPillars?: string[];
}

/**
 * RenderOutput — What MyContext produces after rendering a blueprint
 */
export interface RenderOutput {
  blueprintId: string;
  renderedAt: string;
  outputDir: string;
  artifacts: {
    voiceoverScript: string;    // Path to VO script JSON
    voiceoverMarkdown: string;  // Path to human-readable VO script
    storyboardHtml: string;     // Path to interactive HTML storyboard
    audioSegments?: string[];   // Paths to audio files per scene
    masterAudio?: string;       // Path to concatenated audio
  };
  stats: {
    totalScenes: number;
    totalDuration: number;
    wordsSpoken: number;
    generationTime: number;     // ms
  };
}
