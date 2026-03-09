/**
 * solver.ts — Standalone constraint solver engine
 *
 * No external dependencies. Uses a safe recursive-descent arithmetic
 * expression evaluator (no eval()) and three search strategies:
 *   1. brute-force          — enumerate all assignments
 *   2. constraint-propagation — prune domains before enumeration
 *   3. llm-guided           — LLM narrows domains; propagation + enumeration
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ProblemType = "factorization" | "password" | "sat" | "csp" | "custom";
export type SolverMethod = "brute-force" | "constraint-propagation" | "llm-guided";

export interface Variable {
  name: string;
  type: "integer" | "boolean";
  domain: { min: number; max: number } | { values: number[] };
}

export interface Constraint {
  expr: string;
  description?: string;
}

export interface ConstraintSpec {
  id: string;
  type: ProblemType;
  description: string;
  input: Record<string, unknown>;
  variables: Variable[];
  constraints: Constraint[];
  searchBounds?: { maxIterations?: number; timeoutMs?: number };
}

export type Assignment = Record<string, number>;

export interface TraceStep {
  iteration: number;
  candidate: Assignment;
  violatedConstraint?: string;
  passed: boolean;
}

export interface SolveMetrics {
  method: SolverMethod;
  originalSearchSpaceSize: number; // before propagation
  searchSpaceSize: number;   // after propagation / domain narrowing
  exploredCount: number;     // candidates actually evaluated
  prunedCount: number;       // candidates eliminated by propagation
  reductionRatio: number;    // 1 - (exploredCount / originalSearchSpaceSize)
  runtimeMs: number;
  llmTokensUsed: number;     // 0 for non-LLM methods
  llmCallCount: number;      // number of LLM API calls made
}

export interface SolveResult {
  satisfiable: boolean;
  solutions: Assignment[];
  metrics: SolveMetrics;
  trace: TraceStep[];        // capped at MAX_TRACE_STEPS
  summary: string;
}

export interface RefinementIteration {
  loopIndex: number;
  method: SolverMethod;
  metrics: SolveMetrics;
  solution?: Assignment;
  llmHint?: string;          // what the LLM suggested this round
}

// ---------------------------------------------------------------------------
// Expression evaluator (no eval)
// ---------------------------------------------------------------------------

type Token =
  | { kind: "num"; value: number }
  | { kind: "ident"; value: string }
  | { kind: "op"; value: string };

function tokenize(expr: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < expr.length) {
    const c = expr.charAt(i);
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

    const two = expr.slice(i, i + 2);
    if (["<=", ">=", "!=", "=="].includes(two)) {
      tokens.push({ kind: "op", value: two }); i += 2; continue;
    }

    tokens.push({ kind: "op", value: c });
    i++;
  }
  return tokens;
}

interface PS { tokens: Token[]; pos: number; vars: Assignment }

const peek = (s: PS): Token | undefined => s.tokens[s.pos];
const consume = (s: PS): Token => s.tokens[s.pos++]!;

function parseAtom(s: PS): number {
  const t = peek(s);
  if (!t) throw new Error("Unexpected end of expression");
  if (t.kind === "num") { consume(s); return t.value; }
  if (t.kind === "ident") {
    consume(s);
    const next = peek(s);
    if (next?.kind === "op" && next.value === "(") {
      consume(s);
      const arg = parseAddSub(s);
      consume(s); // ')'
      if (t.value === "sqrt") return Math.sqrt(arg);
      if (t.value === "abs")  return Math.abs(arg);
      if (t.value === "floor") return Math.floor(arg);
      if (t.value === "ceil")  return Math.ceil(arg);
      throw new Error(`Unknown function: ${t.value}`);
    }
    if (!(t.value in s.vars)) throw new Error(`Unknown variable: ${t.value}`);
    return s.vars[t.value]!;
  }
  if (t.kind === "op" && t.value === "(") {
    consume(s);
    const v = parseAddSub(s);
    consume(s); // ')'
    return v;
  }
  throw new Error(`Unexpected token: ${JSON.stringify(t)}`);
}

function parseMulDiv(s: PS): number {
  let left = parseAtom(s);
  while (true) {
    const t = peek(s);
    if (!t || t.kind !== "op" || !["*", "/", "%"].includes(t.value)) break;
    const op = consume(s).value as string;
    const right = parseAtom(s);
    if (op === "*") left *= right;
    else if (op === "/") left /= right;
    else left = left % right;
  }
  return left;
}

function parseAddSub(s: PS): number {
  let left = parseMulDiv(s);
  while (true) {
    const t = peek(s);
    if (!t || t.kind !== "op" || !["+", "-"].includes(t.value)) break;
    const op = consume(s).value as string;
    left = op === "+" ? left + parseMulDiv(s) : left - parseMulDiv(s);
  }
  return left;
}

function evalArith(expr: string, vars: Assignment): number {
  const s: PS = { tokens: tokenize(expr), pos: 0, vars };
  return parseAddSub(s);
}

const COMP_OPS = ["<=", ">=", "!=", "==", "=", "<", ">"];
const EPS = 1e-9;

export function evaluateConstraint(expr: string, vars: Assignment): boolean {
  let depth = 0;
  for (let i = 0; i < expr.length; i++) {
    const ch = expr.charAt(i);
    if (ch === "(") { depth++; continue; }
    if (ch === ")") { depth--; continue; }
    if (depth > 0) continue;
    for (const op of COMP_OPS) {
      if (expr.slice(i, i + op.length) === op) {
        const prev = expr.charAt(i - 1);
        if (op.length === 1 && ["<", ">", "!", "="].includes(prev)) continue;
        const lhs = evalArith(expr.slice(0, i).trim(), vars);
        const rhs = evalArith(expr.slice(i + op.length).trim(), vars);
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
  return evalArith(expr, vars) !== 0;
}

// ---------------------------------------------------------------------------
// Domain utilities
// ---------------------------------------------------------------------------

export function expandDomain(v: Variable): number[] {
  if ("values" in v.domain) return [...v.domain.values];
  const { min, max } = v.domain;
  if (max - min > 2_000_000) throw new Error(`Domain too large for "${v.name}": [${min}, ${max}]`);
  const out: number[] = [];
  for (let x = min; x <= max; x++) out.push(x);
  return out;
}

function getVarNames(expr: string): Set<string> {
  const builtins = new Set(["sqrt", "abs", "floor", "ceil"]);
  const names = new Set<string>();
  const tokens = tokenize(expr);
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i]!;
    if (t.kind === "ident" && !builtins.has(t.value)) {
      const next = i + 1 < tokens.length ? tokens[i + 1]! : undefined;
      if (!next || next.kind !== "op" || next.value !== "(") names.add(t.value);
    }
  }
  return names;
}

/** Prune unary constraints (only reference 1 variable) from each domain. */
function propagate(spec: ConstraintSpec, domains: Map<string, number[]>): number {
  let pruned = 0;
  for (const v of spec.variables) {
    const dom = domains.get(v.name);
    if (!dom) continue;
    const before = dom.length;
    const filtered = dom.filter(val => {
      for (const c of spec.constraints) {
        const used = getVarNames(c.expr);
        if (used.size === 1 && used.has(v.name)) {
          try { if (!evaluateConstraint(c.expr, { [v.name]: val })) return false; }
          catch { /* skip if other vars needed */ }
        }
      }
      return true;
    });
    pruned += before - filtered.length;
    domains.set(v.name, filtered);
  }
  return pruned;
}

function* cartesian(vars: string[], domains: Map<string, number[]>): Generator<Assignment> {
  if (vars.length === 0) { yield {}; return; }
  const [head, ...tail] = vars;
  if (!head) return;
  for (const val of domains.get(head) ?? []) {
    for (const rest of cartesian(tail, domains)) yield { [head]: val, ...rest };
  }
}

// ---------------------------------------------------------------------------
// Core solver
// ---------------------------------------------------------------------------

const MAX_TRACE_STEPS = 500;

export function solve(
  spec: ConstraintSpec,
  method: SolverMethod,
  findAll: boolean,
  llmDomains?: Map<string, number[]>,
  llmTokensUsed = 0,
  llmCallCount = 0
): SolveResult {
  const t0 = Date.now();
  const maxIter = spec.searchBounds?.maxIterations ?? 500_000;
  const timeoutMs = spec.searchBounds?.timeoutMs ?? 20_000;

  const domains = new Map<string, number[]>();
  for (const v of spec.variables) domains.set(v.name, expandDomain(v));

  const originalSearchSpaceSize = [...domains.values()].reduce((a, d) => a * d.length, 1);
  let prunedCount = 0;
  if (method === "constraint-propagation" || method === "llm-guided") {
    prunedCount += propagate(spec, domains);
  }
  if (method === "llm-guided" && llmDomains) {
    for (const [k, v] of llmDomains) domains.set(k, v);
  }

  const searchSpaceSize = [...domains.values()].reduce((a, d) => a * d.length, 1);
  const varNames = spec.variables.map(v => v.name);
  const solutions: Assignment[] = [];
  const trace: TraceStep[] = [];
  let iter = 0;

  for (const candidate of cartesian(varNames, domains)) {
    if (iter >= maxIter || Date.now() - t0 > timeoutMs) break;

    let passed = true;
    let violatedConstraint: string | undefined;

    for (const c of spec.constraints) {
      try {
        if (!evaluateConstraint(c.expr, candidate)) {
          passed = false; violatedConstraint = c.expr; prunedCount++; break;
        }
      } catch {
        passed = false; violatedConstraint = c.expr + " [eval error]"; break;
      }
    }

    if (trace.length < MAX_TRACE_STEPS) trace.push({ iteration: iter, candidate, violatedConstraint, passed });
    if (passed) { solutions.push(candidate); if (!findAll) break; }
    iter++;
  }

  const runtimeMs = Date.now() - t0;
  const exploredCount = iter;
  // Reduction vs ORIGINAL space (before propagation) — key research metric
  const reductionRatio = originalSearchSpaceSize > 0
    ? 1 - (exploredCount / originalSearchSpaceSize)
    : 1;

  const metrics: SolveMetrics = {
    method, originalSearchSpaceSize, searchSpaceSize, exploredCount, prunedCount,
    reductionRatio, runtimeMs, llmTokensUsed, llmCallCount,
  };

  const pct = (reductionRatio * 100).toFixed(1);
  const summary = solutions.length > 0
    ? `[${method}] Found ${solutions.length} solution(s). ` +
      `Explored ${exploredCount.toLocaleString()} / ${originalSearchSpaceSize.toLocaleString()} original candidates (${pct}% reduction) in ${runtimeMs}ms.` +
      (llmTokensUsed > 0 ? ` LLM tokens: ${llmTokensUsed}` : "")
    : `[${method}] No solution. Explored ${exploredCount.toLocaleString()} / ${searchSpaceSize.toLocaleString()} in ${runtimeMs}ms.`;

  return { satisfiable: solutions.length > 0, solutions, metrics, trace, summary };
}

// ---------------------------------------------------------------------------
// Spec builders
// ---------------------------------------------------------------------------

/** Build a factorization spec for finding a that divides N. */
export function factorizationSpec(N: number): ConstraintSpec {
  const sqrtN = Math.floor(Math.sqrt(N));
  return {
    id: `factor-${N}`,
    type: "factorization",
    description: `Find integer a ∈ [2, √${N}] such that a divides ${N}`,
    input: { N },
    variables: [
      // Single variable: only iterate the smaller factor a up to √N.
      // The larger factor b = N/a is computed after solving.
      { name: "a", type: "integer", domain: { min: 2, max: sqrtN } },
    ],
    constraints: [
      { expr: `${N} % a = 0`, description: "a divides N exactly" },
    ],
    searchBounds: { maxIterations: 1_000_000, timeoutMs: 30_000 },
  };
}

/**
 * Build a password search spec.
 *
 * The target is a string YOU have set — this is for benchmarking search
 * complexity, not for attacking real credentials.
 *
 * Charset options: "az" (a–z), "az09" (a–z, 0–9), "printable" (ASCII 32–126)
 */
export function passwordSpec(target: string, charsetKey: string): ConstraintSpec {
  const charsets: Record<string, string> = {
    az:        "abcdefghijklmnopqrstuvwxyz",
    az09:      "abcdefghijklmnopqrstuvwxyz0123456789",
    azAZ09:    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
    printable: " !\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~",
  };
  const charset = charsets[charsetKey] ?? charsets["az09"]!;
  const L = target.length;

  const variables: Variable[] = [];
  const constraints: Constraint[] = [];

  for (let i = 0; i < L; i++) {
    const varName = `c${i}`;
    const charIdx = charset.indexOf(target.charAt(i));
    if (charIdx === -1) throw new Error(`Character '${target.charAt(i)}' not in charset "${charsetKey}"`);

    variables.push({ name: varName, type: "integer", domain: { min: 0, max: charset.length - 1 } });
    constraints.push({
      expr: `${varName} = ${charIdx}`,
      description: `position ${i} must be '${target.charAt(i)}' (index ${charIdx})`,
    });
  }

  // Total brute-force search space: charset.length ^ L
  const spaceSize = Math.pow(charset.length, L);
  return {
    id: `password-len${L}-${charsetKey}`,
    type: "password",
    description: `Find ${L}-character password (charset: ${charsetKey}, space: ${spaceSize.toExponential(2)})`,
    input: { targetLength: L, charsetKey, charsetSize: charset.length, spaceSize },
    variables,
    constraints,
    searchBounds: { maxIterations: 10_000_000, timeoutMs: 30_000 },
  };
}
