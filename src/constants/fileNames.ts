/**
 * Standardized file naming convention for MyContext CLI
 * Single source of truth for all context file names
 */

export const CONTEXT_FILES = {
  // A/B/C/D Context Files (User-centric documentation)
  FEATURES: '01a-features.md',
  USER_FLOWS: '01b-user-flows.md',
  EDGE_CASES: '01c-edge-cases.md',
  TECHNICAL_SPECS: '01d-technical-specs.md',

  // Core Context Files
  PRD: '02-prd.md',  // Changed from 01-prd.md to avoid conflict
  TYPES: '02-types.ts',
  BRANDING: '03-branding.md',
  COMPONENT_LIST: '04-component-list.json',
  PROJECT_STRUCTURE: '05-project-structure.md',

  // State and Tracking
  STATE: 'state.json',
  CONTEXT_MEMORY: 'context.json',
  PROGRESS: 'progress.json',

  // Build Strategy
  BUILD_STRATEGY_PLAN: 'build-strategy-plan.json',
  BUILD_STRATEGY_RECOMMENDATIONS: 'build-strategy-recommendations.json',
  BUILD_STRATEGY_TASKS: 'build-strategy-tasks.json',
  BUILD_STRATEGY_COMPARISON: 'build-strategy-comparison.json',
} as const;

/**
 * Legacy file names for backward compatibility
 * @deprecated Use CONTEXT_FILES instead
 */
export const LEGACY_FILE_NAMES = {
  '01a-brief.md': CONTEXT_FILES.FEATURES,
  '01b-requirements.md': CONTEXT_FILES.USER_FLOWS,
  '01c-flows.md': CONTEXT_FILES.EDGE_CASES,
  '01-prd.md': CONTEXT_FILES.PRD,
  'prd.md': CONTEXT_FILES.PRD,
  'PRD.md': CONTEXT_FILES.PRD,
  '01_PRD.md': CONTEXT_FILES.PRD,
  'types.ts': CONTEXT_FILES.TYPES,
  '02_types.ts': CONTEXT_FILES.TYPES,
  'branding.md': CONTEXT_FILES.BRANDING,
  '03_branding.md': CONTEXT_FILES.BRANDING,
  'component-list.json': CONTEXT_FILES.COMPONENT_LIST,
  'components-list.json': CONTEXT_FILES.COMPONENT_LIST,
  '04_component_list.json': CONTEXT_FILES.COMPONENT_LIST,
  'project-structure.md': CONTEXT_FILES.PROJECT_STRUCTURE,
  '05_project_structure.md': CONTEXT_FILES.PROJECT_STRUCTURE,
} as const;

/**
 * Required context files for various operations
 */
export const REQUIRED_FILES = {
  COMPILE_PRD: [
    CONTEXT_FILES.FEATURES,
    CONTEXT_FILES.USER_FLOWS,
    CONTEXT_FILES.EDGE_CASES,
    CONTEXT_FILES.TECHNICAL_SPECS,
  ],
  GENERATE_TYPES: [CONTEXT_FILES.PRD],
  GENERATE_BRAND: [CONTEXT_FILES.PRD],
  GENERATE_COMPONENTS_LIST: [
    CONTEXT_FILES.PRD,
    CONTEXT_FILES.TYPES,
  ],
  GENERATE_COMPONENTS: [
    CONTEXT_FILES.PRD,
    CONTEXT_FILES.TYPES,
    CONTEXT_FILES.COMPONENT_LIST,
  ],
} as const;

/**
 * Get the standardized file name for a given file
 * Returns the canonical name or the original if no mapping exists
 */
export function getStandardFileName(fileName: string): string {
  return LEGACY_FILE_NAMES[fileName as keyof typeof LEGACY_FILE_NAMES] || fileName;
}

/**
 * Check if a file name is legacy
 */
export function isLegacyFileName(fileName: string): boolean {
  return fileName in LEGACY_FILE_NAMES;
}

/**
 * Get all possible names for a canonical file (including legacy)
 */
export function getAllFileNameVariants(canonicalName: string): string[] {
  const variants = [canonicalName];

  for (const [legacy, canonical] of Object.entries(LEGACY_FILE_NAMES)) {
    if (canonical === canonicalName) {
      variants.push(legacy);
    }
  }

  return variants;
}
