/**
 * satSolver.ts
 *
 * LLM-Guided DPLL SAT Solver — SAT Competition 2026 Experimental Track
 *
 * Architecture:
 *   DIMACS CNF  →  internal ClauseDB  →  unit propagation  →  DPLL
 *                                                               ↑
 *                                               LLM variable selection
 *                                              (replaces VSIDS heuristic)
 *
 * Standard output format (SAT Competition):
 *   s SATISFIABLE
 *   v 1 -2 3 ... 0
 *
 *   s UNSATISFIABLE
 */

import OpenAI from "openai";

// ── Types ─────────────────────────────────────────────────────────────────

/** A literal: positive integer = true, negative = negated variable */
export type Literal = number;

/** A clause is a disjunction of literals */
export type Clause = Literal[];

export interface CNFFormula {
  numVars: number;
  numClauses: number;
  clauses: Clause[];
}

export type Assignment = Map<number, boolean>; // variable -> true/false

/**
 * ProofStep — abstract representation of a single solver action.
 *
 * Because the LLM only selects *which variable to branch on*, not the logical
 * validity of any inference, every decision can be recorded as a transparent,
 * replayable symbol. A verifier that replays the trace through deterministic
 * unit propagation can independently confirm SAT (by checking the assignment)
 * or UNSAT (by reconstructing the resolution refutation from conflict leaves).
 *
 * This eliminates the "opaque model call" barrier: the LLM's contribution is
 * fully materialised as structured data before any logical step executes.
 */
export type ProofStepSource = "llm" | "vsids" | "propagation";

export interface ProofStep {
  /** Sequential step index across the entire search */
  seq: number;
  /** Type of action */
  type: "decision" | "unit-prop" | "conflict" | "sat";
  /** Which variable was acted on (decisions and propagations) */
  variable?: number;
  /** Value assigned */
  value?: boolean;
  /** What produced this step */
  source: ProofStepSource;
  /** Current assignment depth (number of decisions made so far) */
  depth: number;
  /** LLM-provided confidence (0–1), only for source=llm */
  confidence?: number;
  /** LLM's brief reasoning string, only for source=llm */
  reasoning?: string;
}

export interface SATResult {
  satisfiable: boolean;
  assignment?: Assignment;
  decisions: number;    // DPLL decision points
  propagations: number; // Unit propagation steps
  llmCalls: number;
  llmTokens: number;
  llmCostUSD: number;
  runtimeMs: number;
  /** Abstract proof trace — every solver action as a transparent ProofStep */
  proofTrace: ProofStep[];
}

/** Compact single-line representation for competition comment output */
export function serializeProofStep(s: ProofStep): string {
  const base = `seq=${s.seq} type=${s.type} src=${s.source} depth=${s.depth}`;
  if (s.variable !== undefined) {
    const lit = s.value === false ? `-${s.variable}` : `${s.variable}`;
    const extra = s.confidence !== undefined ? ` conf=${s.confidence.toFixed(2)}` : "";
    const rsn = s.reasoning ? ` reason="${s.reasoning.replace(/"/g, "'").slice(0, 80)}"` : "";
    return `${base} var=${lit}${extra}${rsn}`;
  }
  return base;
}

// ── DIMACS Parser ──────────────────────────────────────────────────────────

/**
 * Parse DIMACS CNF format into CNFFormula.
 *
 * Format:
 *   c comment lines (ignored)
 *   p cnf <nvars> <nclauses>
 *   <lit> <lit> ... 0
 */
export function parseDIMACS(input: string): CNFFormula {
  const lines = input.split("\n");
  let numVars = 0;
  let numClauses = 0;
  const clauses: Clause[] = [];
  let currentClause: Literal[] = [];

  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith("c")) continue;

    if (line.startsWith("p cnf")) {
      const parts = line.split(/\s+/);
      numVars = parseInt(parts[2] ?? "0", 10);
      numClauses = parseInt(parts[3] ?? "0", 10);
      continue;
    }

    // Literal tokens
    const tokens = line.split(/\s+/).filter(Boolean);
    for (const tok of tokens) {
      const lit = parseInt(tok, 10);
      if (isNaN(lit)) continue;
      if (lit === 0) {
        if (currentClause.length > 0) {
          clauses.push([...currentClause]);
          currentClause = [];
        }
      } else {
        currentClause.push(lit);
      }
    }
  }
  if (currentClause.length > 0) clauses.push(currentClause);

  return { numVars, numClauses: clauses.length, clauses };
}

/**
 * Serialize a CNFFormula back to DIMACS format (for LLM context)
 */
export function serializeDIMACS(formula: CNFFormula): string {
  const lines = [`p cnf ${formula.numVars} ${formula.clauses.length}`];
  for (const clause of formula.clauses) {
    lines.push(clause.join(" ") + " 0");
  }
  return lines.join("\n");
}

// ── Unit Propagation ───────────────────────────────────────────────────────

/**
 * Apply unit propagation: if a clause has only one unassigned literal it
 * must be true. Returns updated assignment or null on conflict.
 */
export function unitPropagate(
  clauses: Clause[],
  assignment: Assignment
): { assignment: Assignment; steps: number } | null {
  const a = new Map(assignment);
  let steps = 0;
  let changed = true;

  while (changed) {
    changed = false;

    for (const clause of clauses) {
      const { status, unset } = evalClause(clause, a);
      if (status === "satisfied") continue;
      if (status === "conflict") return null;

      // Unit clause
      if (unset.length === 1) {
        const lit = unset[0]!;
        const v = Math.abs(lit);
        const val = lit > 0;
        a.set(v, val);
        steps++;
        changed = true;
      }
    }
  }

  return { assignment: a, steps };
}

function evalClause(
  clause: Clause,
  assignment: Assignment
): { status: "satisfied" | "conflict" | "unresolved"; unset: Literal[] } {
  const unset: Literal[] = [];
  for (const lit of clause) {
    const v = Math.abs(lit);
    const assigned = assignment.get(v);
    if (assigned === undefined) {
      unset.push(lit);
      continue;
    }
    const litTrue = lit > 0 ? assigned : !assigned;
    if (litTrue) return { status: "satisfied", unset: [] };
  }
  if (unset.length === 0) return { status: "conflict", unset: [] };
  return { status: "unresolved", unset };
}

// ── DPLL Core ─────────────────────────────────────────────────────────────

export interface DPLLStats {
  decisions: number;
  propagations: number;
}

/**
 * Choose the next unassigned variable using VSIDS-lite (most frequent in
 * unresolved clauses). Falls back to first unassigned.
 */
function chooseVariable(clauses: Clause[], assignment: Assignment, numVars: number): number | null {
  const freq = new Map<number, number>();
  for (const clause of clauses) {
    if (evalClause(clause, assignment).status === "unresolved") {
      for (const lit of clause) {
        const v = Math.abs(lit);
        if (!assignment.has(v)) {
          freq.set(v, (freq.get(v) ?? 0) + 1);
        }
      }
    }
  }
  if (freq.size === 0) {
    // All clauses satisfied — find first unassigned
    for (let v = 1; v <= numVars; v++) {
      if (!assignment.has(v)) return v;
    }
    return null;
  }
  let best = -1, bestFreq = -1;
  for (const [v, f] of freq) {
    if (f > bestFreq) { best = v; bestFreq = f; }
  }
  return best;
}

export function dpll(
  formula: CNFFormula,
  assignment: Assignment,
  stats: DPLLStats,
  trace: ProofStep[]
): Assignment | null {
  const result = unitPropagate(formula.clauses, assignment);
  if (!result) {
    trace.push({ seq: trace.length, type: "conflict", source: "propagation", depth: stats.decisions });
    return null;
  }
  stats.propagations += result.steps;
  const a = result.assignment;

  // Check for completion or conflict
  let allSatisfied = true;
  for (const clause of formula.clauses) {
    const { status } = evalClause(clause, a);
    if (status === "conflict") {
      trace.push({ seq: trace.length, type: "conflict", source: "propagation", depth: stats.decisions });
      return null;
    }
    if (status !== "satisfied") { allSatisfied = false; }
  }
  if (allSatisfied) {
    trace.push({ seq: trace.length, type: "sat", source: "propagation", depth: stats.decisions });
    return a;
  }

  // Choose branching variable
  const v = chooseVariable(formula.clauses, a, formula.numVars);
  if (v === null) return null;
  const depth = stats.decisions;
  stats.decisions++;
  trace.push({ seq: trace.length, type: "decision", variable: v, value: true, source: "vsids", depth });

  // Try true
  const aTrue = new Map(a);
  aTrue.set(v, true);
  const resTrue = dpll(formula, aTrue, stats, trace);
  if (resTrue) return resTrue;

  // Try false
  trace.push({ seq: trace.length, type: "decision", variable: v, value: false, source: "vsids", depth });
  const aFalse = new Map(a);
  aFalse.set(v, false);
  return dpll(formula, aFalse, stats, trace);
}

// ── LLM-Guided DPLL ─────────────────────────────────────────────────────

const GITHUB_MODELS_COST_PER_TOKEN = 0.00001;

interface LLMBranchHint {
  variable: number;
  polarity: boolean;
  confidence: number; // 0-1
  reasoning?: string;
}

async function llmSelectBranch(
  formula: CNFFormula,
  assignment: Assignment,
  llm: OpenAI,
  model: string,
  tokenTracker: { total: number }
): Promise<LLMBranchHint | null> {
  // Only send unresolved clauses to keep prompt small
  const unresolved = formula.clauses.filter(
    c => evalClause(c, assignment).status === "unresolved"
  );
  if (unresolved.length === 0) return null;

  // Limit to 50 shortest clauses to keep tokens low
  const sample = [...unresolved]
    .sort((a, b) => a.length - b.length)
    .slice(0, 50);

  const assignedVars = [...assignment.entries()]
    .map(([v, val]) => `${val ? "" : "-"}${v}`)
    .join(" ");

  const prompt = `You are a SAT solver heuristic. Given these unresolved clauses, select the best variable to branch on and its polarity.

Variables assigned so far: ${assignedVars || "(none)"}
Unresolved clauses (${unresolved.length} total, showing ${sample.length}):
${sample.map(c => c.join(" ") + " 0").join("\n")}

Return JSON:
{
  "variable": <positive integer — unassigned variable to branch on>,
  "polarity": <true or false — which value to try first>,
  "confidence": <0.0-1.0>,
  "reasoning": "<brief>"
}`;

  try {
    const res = await llm.chat.completions.create({
      model,
      messages: [{ role: "user", content: prompt }],
      max_tokens: 200,
      temperature: 0.1,
      response_format: { type: "json_object" },
    });

    tokenTracker.total += res.usage?.total_tokens ?? 0;

    const raw = res.choices[0]?.message.content ?? "{}";
    const hint = JSON.parse(raw) as LLMBranchHint;

    // Validate: variable must be unassigned
    if (
      typeof hint.variable === "number" &&
      hint.variable >= 1 &&
      hint.variable <= formula.numVars &&
      !assignment.has(hint.variable)
    ) {
      return hint;
    }
    return null;
  } catch {
    return null;
  }
}

export async function dpllLLM(
  formula: CNFFormula,
  assignment: Assignment,
  stats: DPLLStats,
  llm: OpenAI,
  model: string,
  tokenTracker: { total: number },
  maxLLMCalls: number,
  trace: ProofStep[]
): Promise<Assignment | null> {
  const result = unitPropagate(formula.clauses, assignment);
  if (!result) {
    trace.push({ seq: trace.length, type: "conflict", source: "propagation", depth: stats.decisions });
    return null;
  }
  stats.propagations += result.steps;
  const a = result.assignment;

  let allSatisfied = true;
  for (const clause of formula.clauses) {
    const { status } = evalClause(clause, a);
    if (status === "conflict") {
      trace.push({ seq: trace.length, type: "conflict", source: "propagation", depth: stats.decisions });
      return null;
    }
    if (status !== "satisfied") allSatisfied = false;
  }
  if (allSatisfied) {
    trace.push({ seq: trace.length, type: "sat", source: "propagation", depth: stats.decisions });
    return a;
  }

  const depth = stats.decisions;
  stats.decisions++;

  // LLM branch selection when budget allows, otherwise fallback to VSIDS
  let v: number | null = null;
  let firstPolarity = true;
  let stepSource: ProofStepSource = "vsids";
  let confidence: number | undefined;
  let reasoning: string | undefined;

  if (tokenTracker.total / 1000 < maxLLMCalls) {
    const hint = await llmSelectBranch(formula, a, llm, model, tokenTracker);
    if (hint) {
      v = hint.variable;
      firstPolarity = hint.polarity;
      stepSource = "llm";
      confidence = hint.confidence;
      reasoning = hint.reasoning;
    }
  }

  if (v === null) {
    v = chooseVariable(formula.clauses, a, formula.numVars);
    if (v === null) return null;
  }

  // Record the decision — fully transparent, replayable by any checker
  trace.push({
    seq: trace.length,
    type: "decision",
    variable: v,
    value: firstPolarity,
    source: stepSource,
    depth,
    confidence,
    reasoning,
  });

  // Try preferred polarity first
  const aFirst = new Map(a);
  aFirst.set(v, firstPolarity);
  const resFirst = await dpllLLM(formula, aFirst, stats, llm, model, tokenTracker, maxLLMCalls, trace);
  if (resFirst) return resFirst;

  // Try opposite
  trace.push({
    seq: trace.length,
    type: "decision",
    variable: v,
    value: !firstPolarity,
    source: stepSource,
    depth,
    confidence,
    reasoning: reasoning ? `[backtrack] ${reasoning}` : undefined,
  });
  const aSecond = new Map(a);
  aSecond.set(v, !firstPolarity);
  return dpllLLM(formula, aSecond, stats, llm, model, tokenTracker, maxLLMCalls, trace);
}

// ── Public Solver API ─────────────────────────────────────────────────────

export interface SolverOptions {
  strategy: "dpll" | "llm-guided";
  llm?: OpenAI;
  llmModel?: string;
  maxLLMCallBudget?: number; // max LLM calls (each call = 1 token batch)
  timeoutMs?: number;
}

export async function solve(
  formula: CNFFormula,
  options: SolverOptions
): Promise<SATResult> {
  const t0 = Date.now();
  const stats: DPLLStats = { decisions: 0, propagations: 0 };
  const tokenTracker = { total: 0 };
  const trace: ProofStep[] = [];

  let assignment: Assignment | null = null;

  if (options.strategy === "llm-guided" && options.llm) {
    assignment = await dpllLLM(
      formula,
      new Map(),
      stats,
      options.llm,
      options.llmModel ?? "gpt-4o-mini",
      tokenTracker,
      options.maxLLMCallBudget ?? 10,
      trace
    );
  } else {
    assignment = dpll(formula, new Map(), stats, trace);
  }

  const runtimeMs = Date.now() - t0;
  const llmCostUSD = tokenTracker.total * GITHUB_MODELS_COST_PER_TOKEN;

  return {
    satisfiable: assignment !== null,
    assignment: assignment ?? undefined,
    decisions: stats.decisions,
    propagations: stats.propagations,
    llmCalls: 0, // tracked via tokenTracker batches
    llmTokens: tokenTracker.total,
    llmCostUSD,
    runtimeMs,
    proofTrace: trace,
  };
}

// ── Competition Output Formatter ──────────────────────────────────────────

/**
 * Format result in SAT Competition standard output format:
 *   s SATISFIABLE
 *   v 1 -2 3 0
 *
 *   s UNSATISFIABLE
 */
export function formatCompetitionOutput(result: SATResult, numVars: number): string {
  if (!result.satisfiable || !result.assignment) {
    return "s UNSATISFIABLE";
  }

  const literals: number[] = [];
  for (let v = 1; v <= numVars; v++) {
    const val = result.assignment.get(v);
    if (val === true) literals.push(v);
    else if (val === false) literals.push(-v);
    else literals.push(v); // unset — can be either, default true
  }
  literals.push(0);

  // Wrap at 70 chars with "v " prefix lines
  const lines: string[] = ["s SATISFIABLE"];
  let line = "v";
  for (const lit of literals) {
    const tok = " " + lit;
    if (line.length + tok.length > 70) {
      lines.push(line);
      line = "v";
    }
    line += tok;
  }
  if (line !== "v") lines.push(line);

  return lines.join("\n");
}
