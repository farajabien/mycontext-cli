
/**
 * TUI MODES & STATE
 * 
 * Defines the state machine for the "Claude Code"-like TUI.
 */

import { LivingContext } from "./living-context";

export type TUIMode = "PLANNING" | "DASHBOARD" | "AGENT" | "AUTO_EDIT";

export interface TUIState {
  mode: TUIMode;
  input: string;
  history: TUIHistoryItem[];
  context?: LivingContext;
  contextStatus: {
    megaContextComplete: boolean;
    missingFields: string[];
  };
  activeAgent?: string; // e.g. "Architect", "Builder"
  isProcessing: boolean;
}

export interface TUIHistoryItem {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
  metadata?: {
    mode: TUIMode;
    command?: string;
    output?: string;
  };
}

// slash commands
export type TUISlashCommand = 
  | "/plan"      // Switch to Planning Mode
  | "/act"       // Switch to Agent Mode
  | "/edit"      // Switch to Auto-Edit Mode
  | "/review"    // Review MegaContext
  | "/generate"  // Trigger generation (if Context is 100%)
  | "/clear";    // Clear history
