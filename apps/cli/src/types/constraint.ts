/**
 * Constraint System Types
 *
 * JSON-first representation of combinatorial and constraint satisfaction
 * problems. Designed to sit between a natural-language LLM parser and a
 * solver back-end (native TS, Z3, OR-Tools, MiniSat, …).
 *
 * Usage in the research pipeline:
 *   NL input → LLM → ConstraintSpec → SolverAgent → SolveResult + SolveTrace
 */

// ---------------------------------------------------------------------------
// Problem spec (the "JSON Brain" for a constraint problem)
// ---------------------------------------------------------------------------

export type ProblemType =
  | "factorization"   // find factors of N
  | "sat"             // boolean satisfiability
  | "csp"             // general constraint satisfaction
  | "custom";         // freeform

export interface ConstraintVariable {
  /** Variable name (used inside constraint expressions). */
  name: string;

  /** Value domain. */
  type: "integer" | "boolean" | "real";

  domain?: {
    /** Inclusive lower bound (integers / reals). */
    min?: number;
    /** Inclusive upper bound (integers / reals). */
    max?: number;
    /** Explicit set of allowed values (overrides min/max). */
    values?: (number | boolean)[];
  };
}

export interface ConstraintExpression {
  /** The constraint expressed as a string, e.g. "a * b = 589" or "a <= b". */
  expr: string;
  /** Optional human-readable description of why this constraint exists. */
  description?: string;
}

export interface ConstraintSpec {
  problem: {
    /** Unique run ID (use crypto.randomUUID or timestamp). */
    id: string;
    type: ProblemType;
    /** Human-readable description of the problem. */
    description: string;
    /** Raw input data (e.g. { N: 589 } for factorization). */
    input: Record<string, unknown>;
    /** ISO timestamp when this spec was created. */
    createdAt: string;
  };

  variables: ConstraintVariable[];
  constraints: ConstraintExpression[];

  objective?: {
    type: "minimize" | "maximize" | "satisfy";
    /** Expression to optimise (omit for "satisfy"). */
    expr?: string;
  };

  /** Solver budget — lets the caller cap expensive searches. */
  searchBounds?: {
    /** Maximum number of candidate assignments to evaluate. */
    maxIterations?: number;
    /** Wall-clock timeout in milliseconds. */
    timeoutMs?: number;
  };
}

// ---------------------------------------------------------------------------
// Solver output and research metrics
// ---------------------------------------------------------------------------

/** A concrete assignment of values to all variables. */
export type Assignment = Record<string, number | boolean>;

/** Per-step trace entry (kept compact — one entry per iteration). */
export interface TraceStep {
  iteration: number;
  candidate: Assignment;
  /** Which constraint expression was violated (if any). */
  violatedConstraint?: string;
  passed: boolean;
}

export type SolverMethod =
  | "brute-force"
  | "constraint-propagation"
  | "llm-guided";

/**
 * Research metrics for a single solve run.
 * These are the numbers that back the Phase 4 / Phase 5 measurements.
 */
export interface SolveTrace {
  method: SolverMethod;

  /** Total candidate assignments that existed in the raw search space. */
  searchSpaceSize: number;

  /** Candidates actually evaluated (after propagation / pruning). */
  exploredCount: number;

  /** Candidates skipped because a constraint pruned the branch early. */
  prunedCount: number;

  /**
   * exploredCount / searchSpaceSize — fraction of search space visited.
   * A lower number means the solver worked smarter.
   */
  reductionRatio: number;

  /** Wall-clock milliseconds from solver start to first solution (or timeout). */
  runtimeMs: number;

  /** Detailed per-iteration log (may be truncated for large runs). */
  steps: TraceStep[];
}

export interface SolveResult {
  satisfiable: boolean;
  /** All solutions found (or just the first, depending on "stopAtFirst"). */
  solutions: Assignment[];
  trace: SolveTrace;
  /** Human-readable summary, e.g. "explored 0.38% of search space". */
  summary: string;
}

// ---------------------------------------------------------------------------
// SolverAgent I/O
// ---------------------------------------------------------------------------

export interface SolverInput {
  /**
   * If provided, the agent translates this natural-language string into a
   * ConstraintSpec using the LLM before solving.
   */
  naturalLanguage?: string;

  /**
   * If provided, skip the LLM translation phase and solve directly.
   * Either naturalLanguage or spec must be supplied.
   */
  spec?: ConstraintSpec;

  /** Solver strategy to use. Default: "constraint-propagation". */
  method?: SolverMethod;

  /** Return all solutions or stop at the first. Default: false (stop at first). */
  findAll?: boolean;
}

export interface SolverOutput {
  /** The constraint spec that was actually solved (LLM-translated or passed-in). */
  spec: ConstraintSpec;
  result: SolveResult;
  /** True when the spec was produced by the LLM from naturalLanguage. */
  translatedFromNL: boolean;
}
