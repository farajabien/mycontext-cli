/**
 * SolverAgent
 *
 * Research sub-agent that implements Phase 2–4 of the "Structured Reasoning
 * Systems" research plan:
 *
 *   NL → LLM → ConstraintSpec (JSON Brain) → Solver → SolveResult + metrics
 *
 * The solver operates in pure TypeScript with no external dependencies so the
 * pipeline can run immediately. Swap the `_nativeSolve` call for a Z3 /
 * OR-Tools binding once you want to scale to harder instances.
 *
 * Key design choices:
 *  - Expression evaluation uses a recursive-descent parser (NO eval()).
 *  - Three interchangeable strategies: brute-force, constraint-propagation,
 *    llm-guided (LLM trims the domain before search).
 *  - Every run produces a SolveTrace with operations count, search-space size,
 *    pruning ratio — the numbers for Phase 4 / 5 measurement tables.
 */

import { HybridAIClient } from "../../utils/hybridAIClient";
import { SubAgent } from "../interfaces/SubAgent";
import { getSubAgentPersonality } from "../../constants/subAgentPersonalities";
import {
  SolverInput,
  SolverOutput,
  ConstraintSpec,
  ConstraintVariable,
  Assignment,
  SolveResult,
  SolveTrace,
  SolverMethod,
  TraceStep,
  ProblemType,
} from "../../types/constraint";

// ---------------------------------------------------------------------------
// Expression evaluator (no eval — safe for untrusted constraint strings)
// ---------------------------------------------------------------------------

type Token =
  | { kind: "num"; value: number }
  | { kind: "ident"; value: string }
  | { kind: "op"; value: string };

function tokenize(expr: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < expr.length) {
    const c = expr.charAt(i); // charAt always returns string, never undefined
    if (/\s/.test(c)) { i++; continue; }

    if (/[0-9]/.test(c) || (c === "." && /[0-9]/.test(expr.charAt(i + 1)))) {
      let s = "";
      while (i < expr.length && /[0-9.]/.test(expr.charAt(i))) s += expr.charAt(i++);
      tokens.push({ kind: "num", value: parseFloat(s) });
      continue;
    }

    if (/[a-zA-Z_]/.test(c)) {
      let s = "";
      while (i < expr.length && /[a-zA-Z0-9_]/.test(expr.charAt(i))) s += expr.charAt(i++);
      tokens.push({ kind: "ident", value: s });
      continue;
    }

    // Two-char operators first
    const two = expr.slice(i, i + 2);
    if (["<=", ">=", "!=", "=="].includes(two)) {
      tokens.push({ kind: "op", value: two });
      i += 2;
      continue;
    }

    tokens.push({ kind: "op", value: c });
    i++;
  }
  return tokens;
}

// Recursive-descent arithmetic evaluator
// Grammar:
//   expr   = addSub
//   addSub = mulDiv (('+' | '-') mulDiv)*
//   mulDiv = unary  (('*' | '/' | '%') unary)*
//   unary  = '-' unary | atom
//   atom   = NUMBER | IDENT | IDENT '(' expr ')' | '(' expr ')'

interface ParseState {
  tokens: Token[];
  pos: number;
  vars: Assignment;
}

function peek(s: ParseState): Token | undefined {
  return s.tokens[s.pos];
}

function consume(s: ParseState): Token {
  // Callers always guard with peek() before calling consume(), so this is safe
  return s.tokens[s.pos++]!;
}

function parseAtom(s: ParseState): number {
  const t = peek(s);
  if (!t) throw new Error("Unexpected end of expression");

  if (t.kind === "num") { consume(s); return t.value; }

  if (t.kind === "ident") {
    consume(s);
    // Built-in functions
    const next = peek(s);
    if (next && next.kind === "op" && next.value === "(") {
      consume(s); // consume '('
      const arg = parseExpr(s);
      const close = consume(s); // consume ')'
      if (close.value !== ")") throw new Error("Expected ')'");
      switch (t.value) {
        case "sqrt": return Math.sqrt(arg);
        case "abs":  return Math.abs(arg);
        case "floor": return Math.floor(arg);
        case "ceil":  return Math.ceil(arg);
        default: throw new Error(`Unknown function: ${t.value}`);
      }
    }
    // Variable lookup
    if (t.value in s.vars) return s.vars[t.value] as number;
    throw new Error(`Unknown variable: ${t.value}`);
  }

  if (t.kind === "op" && t.value === "(") {
    consume(s);
    const val = parseExpr(s);
    const close = consume(s);
    if (close.value !== ")") throw new Error("Expected ')'");
    return val;
  }

  throw new Error(`Unexpected token: ${JSON.stringify(t)}`);
}

function parseUnary(s: ParseState): number {
  const t = peek(s);
  if (t && t.kind === "op" && t.value === "-") {
    consume(s);
    return -parseAtom(s);
  }
  return parseAtom(s);
}

function parseMulDiv(s: ParseState): number {
  let left = parseUnary(s);
  while (true) {
    const t = peek(s);
    if (!t || t.kind !== "op" || !["*", "/", "%"].includes(t.value)) break;
    consume(s);
    const right = parseUnary(s);
    if (t.value === "*") left *= right;
    else if (t.value === "/") left /= right;
    else left = left % right;
  }
  return left;
}

function parseExpr(s: ParseState): number {
  let left = parseMulDiv(s);
  while (true) {
    const t = peek(s);
    if (!t || t.kind !== "op" || !["+", "-"].includes(t.value)) break;
    consume(s);
    const right = parseMulDiv(s);
    left = t.value === "+" ? left + right : left - right;
  }
  return left;
}

/**
 * Evaluate a constraint expression string against a variable assignment.
 * Expressions that contain a comparison operator return a boolean.
 * Pure arithmetic expressions return true iff the result is non-zero.
 */
function evaluateConstraint(expr: string, vars: Assignment): boolean {
  const COMP_OPS = ["<=", ">=", "!=", "==", "=", "<", ">"];

  // Find the leftmost comparison operator that isn't inside parentheses
  let depth = 0;
  for (let i = 0; i < expr.length; i++) {
    if (expr[i] === "(") { depth++; continue; }
    if (expr[i] === ")") { depth--; continue; }
    if (depth > 0) continue;

    for (const op of COMP_OPS) {
      if (expr.slice(i, i + op.length) === op) {
        // Make sure we're not inside a multi-char op preceded by < / > / !
        const prev = expr[i - 1];
        if (op.length === 1 && prev && ["<", ">", "!", "="].includes(prev)) continue;

        const lhsStr = expr.slice(0, i).trim();
        const rhsStr = expr.slice(i + op.length).trim();
        if (!lhsStr || !rhsStr) continue;

        const lhs = evalArith(lhsStr, vars);
        const rhs = evalArith(rhsStr, vars);
        const EPS = 1e-9;
        switch (op) {
          case "=": case "==": return Math.abs(lhs - rhs) <= EPS;
          case "<=": return lhs <= rhs + EPS;
          case ">=": return lhs >= rhs - EPS;
          case "!=": return Math.abs(lhs - rhs) > EPS;
          case "<":  return lhs < rhs - EPS;
          case ">":  return lhs > rhs + EPS;
        }
      }
    }
  }

  // No comparison found — treat numeric result as truthy
  return evalArith(expr, vars) !== 0;
}

function evalArith(expr: string, vars: Assignment): number {
  const state: ParseState = { tokens: tokenize(expr), pos: 0, vars };
  const result = parseExpr(state);
  if (state.pos < state.tokens.length) {
    throw new Error(`Unexpected token at position ${state.pos}: ${JSON.stringify(state.tokens[state.pos])}`);
  }
  return result;
}

// ---------------------------------------------------------------------------
// Domain generation
// ---------------------------------------------------------------------------

function generateDomain(v: ConstraintVariable): number[] | boolean[] {
  if (v.type === "boolean") {
    return v.domain?.values ? (v.domain.values as boolean[]) : [false, true];
  }

  if (v.domain?.values) return v.domain.values as number[];

  const min = v.domain?.min ?? 0;
  const max = v.domain?.max ?? 1000;

  if (max - min > 1_000_000) {
    throw new Error(
      `Variable "${v.name}" has domain size ${max - min + 1}. ` +
        "Cap the domain with searchBounds.maxIterations or reduce the range."
    );
  }

  const values: number[] = [];
  for (let x = min; x <= max; x++) values.push(x);
  return values;
}

// ---------------------------------------------------------------------------
// Constraint propagation — reduce variable domains before brute-force pass
// ---------------------------------------------------------------------------

/**
 * Very lightweight propagation: for each variable, eliminate values that
 * violate a unary constraint (one with only that variable).
 * Full arc-consistency (AC-3) would be more powerful; this handles the
 * common Phase 3 cases like `a >= 2` and `b <= sqrt(N)`.
 */
function propagateDomains(
  spec: ConstraintSpec,
  domains: Map<string, (number | boolean)[]>
): { prunedCount: number } {
  let prunedCount = 0;

  for (const v of spec.variables) {
    const dom = domains.get(v.name);
    if (!dom) continue;

    const filtered = dom.filter((val) => {
      const assignment: Assignment = {};
      for (const [k, existing] of domains.entries()) {
        if (k === v.name) assignment[k] = val;
        else assignment[k] = existing[0] as number | boolean; // placeholder
      }

      for (const ce of spec.constraints) {
        // Only apply constraints that reference solely this variable
        const usedVars = getVariableNames(ce.expr);
        if (usedVars.size === 1 && usedVars.has(v.name)) {
          try {
            if (!evaluateConstraint(ce.expr, assignment)) return false;
          } catch {
            // If evaluation fails (other var not bound), skip
          }
        }
      }
      return true;
    });

    prunedCount += dom.length - filtered.length;
    domains.set(v.name, filtered);
  }

  return { prunedCount };
}

function getVariableNames(expr: string): Set<string> {
  const names = new Set<string>();
  const tokens = tokenize(expr);
  const builtins = new Set(["sqrt", "abs", "floor", "ceil"]);
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i]!; // safe: i is within bounds
    if (t.kind === "ident" && !builtins.has(t.value)) {
      // Skip if followed by '(' (function call, not variable)
      const next = i + 1 < tokens.length ? tokens[i + 1]! : undefined;
      if (!next || next.kind !== "op" || next.value !== "(") {
        names.add(t.value);
      }
    }
  }
  return names;
}

// ---------------------------------------------------------------------------
// Solver core
// ---------------------------------------------------------------------------

interface SolverOptions {
  method: SolverMethod;
  findAll: boolean;
  maxIterations: number;
  timeoutMs: number;
  llmGuidedDomains?: Map<string, (number | boolean)[]>;
}

function* cartesianProduct(
  variables: string[],
  domains: Map<string, (number | boolean)[]>
): Generator<Assignment> {
  if (variables.length === 0) { yield {}; return; }

  const [head, ...tail] = variables;
  if (head === undefined) return;
  const headDomain = domains.get(head) ?? [];

  for (const val of headDomain) {
    for (const rest of cartesianProduct(tail, domains)) {
      yield { [head]: val, ...rest };
    }
  }
}

function nativeSolve(spec: ConstraintSpec, opts: SolverOptions): SolveResult {
  const startMs = Date.now();
  const solutions: Assignment[] = [];
  const steps: TraceStep[] = [];

  // Build initial domains
  const domains = new Map<string, (number | boolean)[]>();
  for (const v of spec.variables) {
    domains.set(v.name, generateDomain(v));
  }

  let prunedByPropagation = 0;

  // Constraint propagation pass (reduces domains before iteration)
  if (opts.method === "constraint-propagation" || opts.method === "llm-guided") {
    const pr = propagateDomains(spec, domains);
    prunedByPropagation = pr.prunedCount;
  }

  // For llm-guided, swap in the LLM-narrowed domains
  if (opts.method === "llm-guided" && opts.llmGuidedDomains) {
    for (const [k, v] of opts.llmGuidedDomains.entries()) {
      domains.set(k, v);
    }
  }

  const searchSpaceSize = [...domains.values()].reduce(
    (acc, d) => acc * d.length,
    1
  );

  const varNames = spec.variables.map((v) => v.name);
  let iteration = 0;
  let prunedDuringSearch = prunedByPropagation;
  const MAX_TRACE_STEPS = 200; // cap trace verbosity

  for (const assignment of cartesianProduct(varNames, domains)) {
    if (iteration >= opts.maxIterations) break;
    if (Date.now() - startMs > opts.timeoutMs) break;

    let allPassed = true;
    let violatedConstraint: string | undefined;

    for (const ce of spec.constraints) {
      try {
        if (!evaluateConstraint(ce.expr, assignment)) {
          allPassed = false;
          violatedConstraint = ce.expr;
          prunedDuringSearch++;
          break;
        }
      } catch (_err) {
        // Evaluation error — treat as constraint failure
        allPassed = false;
        violatedConstraint = ce.expr + " [eval error]";
        break;
      }
    }

    if (steps.length < MAX_TRACE_STEPS) {
      steps.push({ iteration, candidate: assignment, violatedConstraint, passed: allPassed });
    }

    if (allPassed) {
      solutions.push(assignment);
      if (!opts.findAll) break;
    }

    iteration++;
  }

  const runtimeMs = Date.now() - startMs;
  const exploredCount = iteration;
  const reductionRatio = searchSpaceSize > 0 ? exploredCount / searchSpaceSize : 1;

  const trace: SolveTrace = {
    method: opts.method,
    searchSpaceSize,
    exploredCount,
    prunedCount: prunedDuringSearch,
    reductionRatio,
    runtimeMs,
    steps,
  };

  const pct = (reductionRatio * 100).toFixed(2);
  const summary =
    solutions.length > 0
      ? `Found ${solutions.length} solution(s). Explored ${exploredCount.toLocaleString()} / ${searchSpaceSize.toLocaleString()} candidates (${pct}% of search space) in ${runtimeMs}ms.`
      : `No solution found. Explored ${exploredCount.toLocaleString()} / ${searchSpaceSize.toLocaleString()} candidates in ${runtimeMs}ms.`;

  return { satisfiable: solutions.length > 0, solutions, trace, summary };
}

// ---------------------------------------------------------------------------
// LLM translation: natural language → ConstraintSpec
// ---------------------------------------------------------------------------

const NL_TO_SPEC_SCHEMA = `{
  "problem": {
    "id": "string (unique, use a short slug)",
    "type": "factorization | sat | csp | custom",
    "description": "string",
    "input": { "...": "raw numeric/string inputs" },
    "createdAt": "ISO timestamp"
  },
  "variables": [
    {
      "name": "string",
      "type": "integer | boolean | real",
      "domain": { "min": number, "max": number }
    }
  ],
  "constraints": [
    { "expr": "arithmetic equality or inequality string", "description": "string" }
  ],
  "objective": { "type": "satisfy" },
  "searchBounds": { "maxIterations": 50000, "timeoutMs": 10000 }
}`;

// ---------------------------------------------------------------------------
// SolverAgent implementation
// ---------------------------------------------------------------------------

export class SolverAgent implements SubAgent<SolverInput, SolverOutput> {
  name = "SolverAgent";
  description =
    "Translates natural-language problems to ConstraintSpec JSON and solves them with instrumented search — research tooling for the Structured Reasoning project";
  personality: string;
  llmProvider: string;
  expertise: string[];

  private ai: HybridAIClient;

  constructor() {
    const p = getSubAgentPersonality(this.name);
    if (!p) throw new Error(`Personality not found for ${this.name}`);
    this.personality = p.systemPrompt;
    this.llmProvider = p.llmProvider;
    this.expertise = p.expertise;
    this.ai = new HybridAIClient();
  }

  async validate(input: SolverInput): Promise<boolean> {
    return !!(input.naturalLanguage || input.spec);
  }

  async run(input: SolverInput): Promise<SolverOutput> {
    let spec: ConstraintSpec;
    let translatedFromNL = false;

    if (input.spec) {
      spec = input.spec;
    } else if (input.naturalLanguage) {
      spec = await this._translateNL(input.naturalLanguage);
      translatedFromNL = true;
    } else {
      throw new Error("SolverAgent requires either naturalLanguage or spec input");
    }

    const method: SolverMethod = input.method ?? "constraint-propagation";
    const findAll = input.findAll ?? false;
    const maxIterations = spec.searchBounds?.maxIterations ?? 100_000;
    const timeoutMs = spec.searchBounds?.timeoutMs ?? 15_000;

    let llmGuidedDomains: Map<string, (number | boolean)[]> | undefined;

    if (method === "llm-guided") {
      llmGuidedDomains = await this._llmNarrowDomains(spec);
    }

    const result = nativeSolve(spec, {
      method,
      findAll,
      maxIterations,
      timeoutMs,
      llmGuidedDomains,
    });

    return { spec, result, translatedFromNL };
  }

  // -------------------------------------------------------------------------
  // LLM: natural language → ConstraintSpec
  // -------------------------------------------------------------------------

  private async _translateNL(nl: string): Promise<ConstraintSpec> {
    const prompt = `You are a constraint programming expert. Convert the following natural-language problem into a structured JSON constraint specification.

PROBLEM:
${nl}

Return ONLY valid JSON that conforms exactly to this schema:
${NL_TO_SPEC_SCHEMA}

Rules:
- Use integer domains unless the problem explicitly needs reals.
- For factorization of N: variables a, b with domain [2, sqrt(N)], constraints ["a * b = N", "a <= b"].
- For SAT: boolean variables, constraints expressed as "var1 = true", etc.
- Keep domain sizes reasonable (under 100,000 total combinations).
- Set createdAt to the current ISO timestamp.
- The id should be a short descriptive slug like "factor-589".

Return ONLY the JSON object, no explanation:`;

    const { text } = await this.ai.generateText(prompt);
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("LLM did not return valid JSON for constraint spec");

    const parsed = JSON.parse(jsonMatch[0]) as ConstraintSpec;

    // Ensure required fields exist
    if (!parsed.problem || !parsed.variables || !parsed.constraints) {
      throw new Error("LLM-generated spec is missing required fields (problem/variables/constraints)");
    }

    return parsed;
  }

  // -------------------------------------------------------------------------
  // LLM: narrow domains before search (llm-guided strategy)
  // -------------------------------------------------------------------------

  private async _llmNarrowDomains(
    spec: ConstraintSpec
  ): Promise<Map<string, (number | boolean)[]>> {
    const prompt = `You are a mathematical reasoning assistant. Given this constraint problem, suggest a NARROWED domain for each variable that is very likely to contain the solution while being much smaller than the original domain.

PROBLEM SPEC:
${JSON.stringify(spec, null, 2)}

Return ONLY a JSON object mapping variable names to arrays of up to 50 candidate values, e.g.:
{ "a": [17, 19, 23, 29, 31], "b": [19, 23, 29, 31, 37] }

Think step by step about what values are likely to satisfy all constraints, then return the JSON:`;

    try {
      const { text } = await this.ai.generateText(prompt);
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON in LLM domain response");

      const parsed = JSON.parse(jsonMatch[0]) as Record<string, (number | boolean)[]>;
      const result = new Map<string, (number | boolean)[]>();
      for (const [k, v] of Object.entries(parsed)) {
        if (Array.isArray(v)) result.set(k, v);
      }
      return result;
    } catch {
      // Fall back to full domains — solver still works, just without LLM pruning
      return new Map();
    }
  }

  async getStatus() {
    return {
      name: this.name,
      status: "idle" as const,
      errorCount: 0,
      successCount: 0,
    };
  }
}

// ---------------------------------------------------------------------------
// Convenience factory for direct use outside the orchestrator
// ---------------------------------------------------------------------------

export function createFactorizationSpec(N: number): ConstraintSpec {
  const sqrtN = Math.floor(Math.sqrt(N));
  return {
    problem: {
      id: `factor-${N}`,
      type: "factorization" as ProblemType,
      description: `Find two integers a and b such that a * b = ${N}`,
      input: { N },
      createdAt: new Date().toISOString(),
    },
    variables: [
      { name: "a", type: "integer", domain: { min: 2, max: sqrtN } },
      { name: "b", type: "integer", domain: { min: 2, max: N } },
    ],
    constraints: [
      { expr: `a * b = ${N}`, description: "Product must equal N" },
      { expr: "a <= b",        description: "Canonical order (avoid duplicate pairs)" },
    ],
    objective: { type: "satisfy" },
    searchBounds: { maxIterations: 200_000, timeoutMs: 30_000 },
  };
}
