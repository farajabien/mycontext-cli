/**
 * Flow Testing Types
 * Defines interfaces for AI-powered UI flow testing
 */

/**
 * Test Mission - Natural language description of what to test
 */
export interface TestMission {
  id: string;
  name: string;
  description: string;
  mission: string; // Natural language mission description
  expectedOutcome: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
  sourceFlow?: string; // Reference to user flow from 02-user-flows.md
  validationRules?: ValidationRule[];
  testData?: any; // Test data like file names, credentials, etc.
}

/**
 * Validation Rule - Specific things to check during testing
 */
export interface ValidationRule {
  type:
    | "url-match"
    | "element-exists"
    | "text-contains"
    | "element-visible"
    | "form-submitted"
    | "data-updated"
    | "custom";
  description: string;
  selector?: string; // CSS selector or accessibility label
  expectedValue?: string;
  customCheck?: string; // Natural language custom validation
}

/**
 * Test Execution Status
 */
export type TestStatus =
  | "pending"
  | "running"
  | "passed"
  | "failed"
  | "error"
  | "skipped";

/**
 * Test Step - Individual action taken by the AI agent
 */
export interface TestStep {
  id: string;
  order: number;
  action: string; // Natural language description of action
  intent: string; // Why the agent took this action
  timestamp: string;
  screenshot?: string; // Path to screenshot
  dom?: string; // Simplified DOM snapshot
  success: boolean;
  error?: string;
  metadata?: {
    url?: string;
    elementSelector?: string;
    inputValue?: string;
    clickedElement?: string;
    navigationTarget?: string;
    uploadedFile?: string;
    filePath?: string;
  };
}

/**
 * Drift Alert - Indication of divergence from project gravity
 */
export interface DriftAlert {
  type: "objective" | "visual" | "logic" | "implementation";
  severity: "low" | "medium" | "high";
  message: string;
  expected: string;
  actual: string;
  timestamp: string;
}

/**
 * Test Execution Result
 */
export interface TestExecutionResult {
  missionId: string;
  executionId: string;
  status: TestStatus;
  startedAt: string;
  completedAt?: string;
  duration?: number; // milliseconds
  steps: TestStep[];
  validationResults: ValidationResult[];
  finalState: {
    url: string;
    screenshot?: string;
    dom?: string;
  };
  error?: {
    message: string;
    stack?: string;
    step?: string;
  };
  aiNotes?: string; // Agent's summary of what happened
  driftAnalysis?: {
    narrativeCompliance: number; // 0.0 to 1.0
    alerts: DriftAlert[];
  };
}

/**
 * Validation Result
 */
export interface ValidationResult {
  rule: ValidationRule;
  passed: boolean;
  actualValue?: string;
  message: string;
  timestamp: string;
}

/**
 * Test Report - Complete summary of test execution
 */
export interface TestReport {
  reportId: string;
  mission: TestMission;
  execution: TestExecutionResult;
  generatedAt: string;
  summary: {
    totalSteps: number;
    successfulSteps: number;
    failedSteps: number;
    totalValidations: number;
    passedValidations: number;
    failedValidations: number;
    overallStatus: TestStatus;
  };
  driftReport?: {
    overallScore: number;
    criticalAlerts: number;
  };
  insights?: string[]; // AI-generated insights about the test
  recommendations?: string[]; // Suggestions for improvement
}

/**
 * Test Missions Storage
 */
export interface TestMissionsStorage {
  version: string;
  createdAt: string;
  updatedAt: string;
  missions: TestMission[];
  executionHistory: {
    missionId: string;
    executions: TestExecutionResult[];
  }[];
}

/**
 * Browser Context Configuration
 */
export interface BrowserConfig {
  headless: boolean;
  viewport?: {
    width: number;
    height: number;
  };
  slowMo?: number; // Slow down operations by N milliseconds
  baseUrl?: string;
  timeout?: number; // Default timeout in milliseconds
  screenshotOnFailure?: boolean;
  recordVideo?: boolean;
}

/**
 * Test Generation Options
 */
export interface TestGenerationOptions {
  fromUserFlows?: boolean; // Generate from 02-user-flows.md
  specificFlows?: string[]; // Names of specific flows to generate tests for
  includeEdgeCases?: boolean; // Include tests for edge cases
  validationLevel?: "basic" | "standard" | "comprehensive";
}

/**
 * Interactive Test Session
 */
export interface InteractiveTestSession {
  sessionId: string;
  startedAt: string;
  mission: Partial<TestMission>;
  recordedSteps: TestStep[];
  currentUrl: string;
  status: "recording" | "paused" | "completed" | "cancelled";
}
