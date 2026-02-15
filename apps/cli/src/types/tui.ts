
/**
 * TUI MODES & STATE
 * 
 * Defines the state machine for the "Claude Code"-like TUI.
 */

export type TUIMode = "PLANNING" | "AGENT" | "AUTO_EDIT";

export interface TUIState {
  mode: TUIMode;
  input: string;
  history: TUIHistoryItem[];
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
