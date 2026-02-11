/**
 * Progress Tracking Types
 * Centralized type definitions for all progress tracking functionality
 */

export type PhaseStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "failed"
  | "validation_required";

export type StepStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "failed"
  | "skipped";

export interface StepProgress {
  status: StepStatus;
  timestamp?: string;
  duration?: number;
  error?: string;
  metadata?: Record<string, any>;
}

export interface PhaseProgress {
  status: PhaseStatus;
  steps: number;
  completedSteps: number;
  duration: number;
  startTime?: string;
  endTime?: string;
  userValidations?: Record<string, boolean>;
  errors?: Array<{
    step: string;
    error: string;
    timestamp: string;
  }>;
}

export interface MasterProgress {
  version: string;
  startTime: string;
  endTime: string | null;
  status: PhaseStatus;
  currentPhase: string;
  currentStep: number;
  totalSteps: number;
  percentComplete: number;
  phases: Record<string, PhaseProgress>;
  errors: Array<{
    phase: string;
    step: number;
    error: string;
    timestamp: string;
  }>;
  retries: {
    total: number;
    byPhase: Record<string, number>;
  };
  userInteractions: number;
  buildChecks: {
    typescript: { passed: number; failed: number };
    eslint: { passed: number; failed: number };
    build: { passed: number; failed: number };
    tests: { passed: number; failed: number };
  };
}

export interface ComponentProgress {
  component: string;
  group: string;
  status: StepStatus;
  steps: Record<string, StepProgress>;
  retries: number;
  duration: number;
  metadata?: {
    linesOfCode?: number;
    dependencies?: string[];
    props?: string[];
    exports?: string[];
  };
}

export interface ProgressTrackerConfig {
  projectPath: string;
  progressDir: string;
  autoSave: boolean;
  saveInterval: number;
}
