/**
 * Vision Testing Types
 *
 * Extends flow-testing types with vision-based capabilities.
 * Enables AI agents to understand UI through visual perception instead of brittle selectors.
 */

import {
  TestMission,
  TestStep,
  TestExecutionResult,
  ValidationRule,
  ValidationResult,
  TestStatus,
  BrowserConfig,
  DriftAlert,
} from "./flow-testing";

/**
 * Vision Test Mission - Enhanced with visual expectations
 */
export interface VisionTestMission extends TestMission {
  visualExpectations?: VisualExpectation[];
  baselineScreenshots?: string[]; // Paths to expected UI state screenshots
  recordDemo?: boolean; // Should this generate demo artifacts?
  demoConfig?: DemoConfig;
}

/**
 * Visual Expectation - What the UI should look like
 */
export interface VisualExpectation {
  id: string;
  name: string;
  description: string;
  screenshot?: string; // Reference screenshot for comparison
  colorScheme?: {
    primary?: string;
    secondary?: string;
    background?: string;
    text?: string;
  };
  layoutType?: "grid" | "flex" | "fixed" | "responsive";
  threshold?: number; // Acceptable difference % (0-100)
}

/**
 * Vision Action Decision - AI's decision on what to do next
 */
export interface VisionActionDecision {
  action: "click" | "fill" | "scroll" | "wait" | "navigate" | "upload" | "complete";
  confidence: number; // 0-100, how confident the AI is about this action
  reasoning: string; // Why the AI chose this action
  visualContext: string; // What the AI sees on screen

  // Element identification
  targetElement?: {
    description: string; // Natural language description
    visualCoordinates?: { x: number; y: number }; // Screen coordinates
    domSelector?: string; // Fallback DOM selector if available
    confidence: number; // How confident we are we found the right element
  };

  // Action-specific data
  value?: string; // For fill/upload actions
  url?: string; // For navigate actions

  // Intent and alignment
  intent: string; // High-level intent (e.g., "submitting the form")
  alignsWithPrimeObjective: boolean; // Gravity check result
  gravityScore: number; // 0-100, alignment with project's prime objective
}

/**
 * Vision Test Step - Enhanced with visual data
 */
export interface VisionTestStep extends TestStep {
  visionDecision?: VisionActionDecision;
  visualAnalysis?: {
    componentsDetected: string[]; // UI components visible
    interactiveElements: string[]; // Buttons, links, forms detected
    textContent: string[]; // Text extracted from screenshot
    colorPalette: string[]; // Dominant colors detected
    layoutStructure: string; // Brief description of layout
  };
  screenshotAnalysis?: {
    path: string;
    analysisText: string; // Full AI analysis of screenshot
    timestamp: string;
  };
}

/**
 * Vision Validation Rule - Visual checks
 * Note: Extends ValidationRule, type extended via string.
 */
export interface VisionValidationRule extends ValidationRule {
  type:
    | "url-match"
    | "element-exists"
    | "text-contains"
    | "element-visible"
    | "form-submitted"
    | "data-updated"
    | "custom"
    | "visual-match" // New: Compare screenshot to baseline
    | "color-scheme-match" // New: Validate color palette
    | "layout-match" // New: Validate layout structure
    | "text-readable" // New: Ensure text is legible
    | "no-visual-regression"; // New: No unexpected visual changes

  description: string;
  selector?: string; // CSS selector or accessibility label
  expectedValue?: string;
  customCheck?: string; // Natural language custom validation
  baselineScreenshot?: string; // For visual comparison
  threshold?: number; // Acceptable difference %
}

/**
 * Visual Validation Result - Results of visual checks
 */
export interface VisualValidationResult extends ValidationResult {
  visualDiff?: {
    diffPercentage: number; // 0-100
    diffScreenshot?: string; // Path to diff image
    affectedAreas?: Array<{
      x: number;
      y: number;
      width: number;
      height: number;
      description: string;
    }>;
  };
  colorAnalysis?: {
    expectedColors: string[];
    actualColors: string[];
    matches: boolean;
  };
}

/**
 * Vision Test Execution Result - Enhanced with visual artifacts
 */
export interface VisionTestExecutionResult extends TestExecutionResult {
  steps: VisionTestStep[]; // Override with vision steps
  validationResults: VisualValidationResult[]; // Override with visual validations

  visualSummary?: {
    totalScreenshots: number;
    visualRegressionsDetected: number;
    colorSchemeMatches: boolean;
    layoutMatches: boolean;
  };

  demoArtifacts?: DemoArtifacts; // If demo was recorded
}

/**
 * Demo Configuration - How to record and generate demos
 */
export interface DemoConfig {
  outputFormats: Array<"video" | "screenshots" | "html-replay" | "markdown-script">;
  videoQuality?: "720p" | "1080p" | "4K";
  fps?: number; // Frames per second for video
  includeVoiceOver?: boolean; // Generate VO script
  generateAudio?: boolean; // Use TTS for audio narration
  ttsConfig?: TTSConfig;
  narrationStyle?: "technical" | "casual" | "marketing" | "educational";
}

/**
 * TTS Configuration - Text-to-speech settings
 */
export interface TTSConfig {
  provider: "google-cloud-tts" | "elevenlabs" | "local";
  voice?: string; // Voice ID/name
  language?: string; // e.g., "en-US", "es-ES"
  speed?: number; // 0.5 - 2.0
  pitch?: number; // -20.0 - 20.0
}

/**
 * Demo Artifacts - All generated demo files
 */
export interface DemoArtifacts {
  generatedAt: string;
  formats: {
    video?: {
      path: string;
      duration: number; // seconds
      size: number; // bytes
      resolution: string;
    };
    screenshots?: {
      paths: string[];
      count: number;
      format: "png" | "jpeg";
    };
    htmlReplay?: {
      path: string;
      interactive: boolean;
    };
    markdownScript?: {
      path: string;
      wordCount: number;
    };
  };
  voiceOver?: {
    script: VOScript;
    audio?: {
      path: string;
      duration: number;
      format: "mp3" | "wav";
    };
  };
}

/**
 * Voice-Over Script - Narration with timestamps
 */
export interface VOScript {
  title: string;
  totalDuration: number; // seconds
  segments: VOSegment[];
  fullScript: string; // Complete markdown script
}

/**
 * Voice-Over Segment - Individual narration segment
 */
export interface VOSegment {
  id: string;
  timestamp: number; // seconds from start
  duration: number; // segment duration in seconds
  narration: string; // What to say
  action: string; // What's happening on screen
  screenshot?: string; // Reference screenshot for this segment
  metadata?: {
    step: number; // Corresponds to test step
    uiState: string; // Brief description of UI at this moment
    textOnScreen: string[]; // Text visible in screenshot
  };
}

/**
 * Visual Element - Element identified through vision
 */
export interface VisualElement {
  id: string;
  description: string; // Natural language description
  type: "button" | "link" | "input" | "form" | "card" | "navigation" | "text" | "image" | "unknown";
  visualCoordinates: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  domSelector?: string; // Fallback selector if available
  confidence: number; // 0-100
  interactable: boolean; // Can user interact with it?
  textContent?: string; // Any text in the element
}

/**
 * Vision Analysis Result - What the vision model sees
 */
export interface VisionAnalysisResult {
  screenshot: string; // Path to analyzed screenshot
  timestamp: string;

  elements: VisualElement[]; // All detected elements
  interactiveElements: VisualElement[]; // Only clickable/fillable elements

  uiState: {
    pageTitle?: string;
    url: string;
    loadingState: "loading" | "loaded" | "error";
    modalOpen: boolean;
    mainContent: string; // Description of main content area
  };

  designSystem: {
    colors: string[];
    typography: string[];
    spacing: string;
  };

  layoutStructure: {
    type: "grid" | "flex" | "fixed" | "responsive";
    sections: string[]; // e.g., ["header", "sidebar", "main", "footer"]
  };

  aiInterpretation: string; // Natural language summary
}

/**
 * Visual Diff Result - Comparison between two screenshots
 */
export interface VisualDiffResult {
  baseline: string; // Path to baseline screenshot
  current: string; // Path to current screenshot
  diff?: string; // Path to diff image (highlighted differences)

  similarity: number; // 0-100, how similar the images are
  differencePercentage: number; // 0-100, % of pixels that differ

  changes: VisualChange[];

  passed: boolean; // Based on threshold
  threshold: number; // Acceptable difference %
}

/**
 * Visual Change - Specific visual difference detected
 */
export interface VisualChange {
  id: string;
  type: "color" | "layout" | "text" | "element-added" | "element-removed" | "position" | "size";
  severity: "minor" | "moderate" | "major";
  description: string;
  location: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  expected?: string;
  actual?: string;
}

/**
 * Vision Browser Config - Extended browser configuration
 */
export interface VisionBrowserConfig extends BrowserConfig {
  visionModel?: "gemini-2.0-flash" | "gemini-1.5-flash" | "gemini-1.5-pro" | "gpt-4-vision";
  screenshotQuality?: number; // 0-100
  screenshotFormat?: "png" | "jpeg";
  analyzeEveryNthStep?: number; // Analyze every N steps to save costs (default: 1)
  enableVisualValidation?: boolean; // Run visual validation checks
  enableDemoRecording?: boolean; // Record demo artifacts
}

/**
 * Living Brain Update - Message to write to context.json
 */
export interface LivingBrainUpdate {
  timestamp: string;
  agentName: string;
  updateType: "test-start" | "test-step" | "test-complete" | "validation" | "demo-generated" | "error";
  data: any;
  metadata?: {
    testId?: string;
    executionId?: string;
    stepId?: string;
  };
}

/**
 * Agent Communication Protocol - How agents talk via Living Brain
 */
export interface AgentMessage {
  id: string;
  from: string; // Agent name
  to?: string; // Target agent (optional, null = broadcast)
  type: "request" | "response" | "notification" | "error";
  action: string; // What action is being requested/reported
  payload: any;
  timestamp: string;
  responseRequired: boolean;
}

/**
 * Vision Test Session - Active test session state
 */
export interface VisionTestSession {
  sessionId: string;
  missionId: string;
  status: "initializing" | "running" | "validating" | "recording" | "completed" | "failed";
  startedAt: string;

  currentStep: number;
  totalSteps: number;

  activeAgents: string[]; // Names of currently active agents

  livingBrainState: {
    lastUpdate: string;
    testProgress: number; // 0-100
    currentUrl: string;
    lastScreenshot?: string;
    lastDecision?: VisionActionDecision;
  };

  artifacts: {
    screenshots: string[];
    videos: string[];
    reports: string[];
  };
}

/**
 * Visual Regression Test Suite - Collection of visual tests
 */
export interface VisualRegressionSuite {
  id: string;
  name: string;
  description: string;
  baselinePath: string; // Path to baseline screenshots directory
  tests: VisionTestMission[];
  createdAt: string;
  updatedAt: string;

  config: {
    threshold: number; // Default threshold for all tests
    autoApprove?: boolean; // Auto-approve minor changes
    notifyOn: Array<"failure" | "change" | "completion">;
  };
}

/**
 * Demo Generation Request - Request to generate a demo
 */
export interface DemoGenerationRequest {
  missionId: string;
  config: DemoConfig;
  startUrl: string;
  flow: string; // Natural language description of flow to demo
  metadata?: {
    title?: string;
    description?: string;
    tags?: string[];
  };
}

/**
 * Demo Generation Result - Result of demo generation
 */
export interface DemoGenerationResult {
  requestId: string;
  status: "success" | "failed" | "partial";
  artifacts: DemoArtifacts;
  duration: number; // Time taken to generate (ms)
  error?: string;
}
