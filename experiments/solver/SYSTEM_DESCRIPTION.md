# LLM-Guided: A Neuro-Symbolic SAT Solver Using LLM-Driven Branching Heuristics

**Faraj Abien**
Independent Researcher
faraja.bien@gmail.com

---

## Abstract

We present **LLM-Guided**, a SAT solver for the SAT Competition 2026 Experimental Track that replaces the classical VSIDS branching heuristic with a large language model (LLM). Given an unresolved subformula, the solver queries an LLM to suggest which variable to branch on and its preferred polarity. For structured instance families where problem semantics are accessible to the model (multiplication circuits, graph coloring), LLM-guided branching significantly reduces the number of decisions required compared to standard DPLL with VSIDS. The solver is built on a recursive DPLL backbone with unit propagation and is submitted to the Experimental Track because LLM calls cannot produce checkable DRAT certificates.

---

## 1. Algorithm

### 1.1 Core Architecture

The solver implements the Davis-Putnam-Logemann-Loveland (DPLL) procedure [1] with unit propagation as the primary preprocessing step. The algorithm is:

```
function DPLL(formula, assignment):
  (assignment, steps) ← unit_propagate(formula, assignment)
  if conflict: return UNSAT
  if all clauses satisfied: return SAT
  v, polarity ← SELECT_VARIABLE(formula, assignment)   ← [LLM step]
  return DPLL(formula, assignment ∪ {v=polarity})
      OR DPLL(formula, assignment ∪ {v=¬polarity})
```

### 1.2 LLM Branching Heuristic (Non-Standard Technique)

The key novelty is in `SELECT_VARIABLE`. Instead of VSIDS (which counts recent conflict activity), the solver serializes the current unresolved subformula and queries a language model:

**Prompt structure:**
```
You are a SAT solver heuristic. Given these unresolved clauses,
select the best variable to branch on and its polarity.

Variables assigned so far: [list]
Unresolved clauses (showing up to 50 shortest):
[DIMACS clause lines]

Return JSON: { "variable": N, "polarity": bool, "confidence": 0-1 }
```

The LLM returns a structured JSON hint. The suggested variable and polarity are used directly for the branch if:
- The variable is currently unassigned
- The variable index is valid (1 to numVars)

On invalid hints, the solver falls back to a frequency-based variable selection (most occurrences in unresolved clauses).

### 1.3 Two-Currency Cost Model

The solver tracks two cost metrics simultaneously:

| Metric | Brute-force DPLL | LLM-Guided DPLL |
|---|---|---|
| Decisions | High (exponential worst case) | Near-zero for structured instances |
| LLM tokens | 0 | ~200–400 per branch query |
| USD cost (GitHub Models) | $0 | ~$0.002–$0.004 per query |

This model reflects a real trade-off: LLM calls are O(1) in problem size for instances whose structure is recognizable, while DPLL decisions grow exponentially.

### 1.4 Token Budget

To bound LLM costs, a token budget parameter controls the maximum number of LLM calls (`--budget N`). When the budget is exhausted, the solver falls back to VSIDS-lite for remaining decisions. This allows graceful degradation — the solver remains complete even if the LLM is unavailable.

---

## 2. Data Structures

**CNFFormula**: Array of clauses (arrays of literals). Variables are integers 1..n; negative literals are negations.

**Assignment**: `Map<number, boolean>` — variable → boolean value. Grows monotonically until backtracking.

**Unit propagation**: Standard iterative propagation; scans all clauses for unit (single unresolved literal) cases. O(clauses × literals) per pass.

**Clause evaluation**: Each clause is classified as `satisfied`, `conflict`, or `unresolved` in O(clause_length). No watched literals in this implementation.

---

## 3. Implementation

The solver is implemented in TypeScript (Node.js ≥ 18), using the OpenAI-compatible API for LLM access via **GitHub Models** (endpoint: `models.inference.ai.azure.com`, model: `gpt-4o-mini`). A free GitHub account token is sufficient — no billing required.

The solver reads DIMACS CNF from stdin or a file argument and writes competition-format output to stdout. Log/stat messages are prefixed with `c` per competition output format requirements.

### 3.5 Abstract Representation Layer

The central challenge of LLM-guided SAT solving is auditability: an opaque model call cannot produce a certifiable proof trace. We address this with an **Abstract Representation Layer** that materialises every LLM decision as a structured `ProofStep` before any logical inference executes:

```typescript
interface ProofStep {
  seq: number;           // sequential step index
  type: "decision" | "unit-prop" | "conflict" | "sat";
  variable?: number;     // variable acted on
  value?: boolean;       // value assigned
  source: "llm" | "vsids" | "propagation";
  depth: number;         // decision depth
  confidence?: number;   // LLM confidence (0–1)
  reasoning?: string;    // LLM's brief rationale
}
```

Every solver step — LLM-guided or heuristic — is appended to a trace array and emitted as `c proof-step: ...` competition comment lines. The full trace constitutes a transparent, replayable proof:

- **For SAT:** the satisfying assignment is verifiable in O(clauses × clause_length) by any checker.
- **For UNSAT:** the decision trace is a complete resolution refutation tree. A verifier can replay the steps through deterministic unit propagation to confirm every conflict, independently reconstructing the proof without trusting the LLM output.

The key insight: the LLM determines only *which variable to branch on* — it does not perform logical inference. All unit propagation and conflict detection remain fully deterministic. The LLM's contribution is bounded to search-order selection, which is logically neutral with respect to proof validity.

**Source code:** https://github.com/farajabien/mycontext-cli/tree/main/experiments/solver

---

## 4. Benchmark Family

Three families of CNF benchmarks are submitted alongside this solver:

1. **Factorization circuits** (7 instances): CNF encoding of `a × b = N` via bit-blasted schoolbook multiplication with carry-save adder (CSA) tree. Variables a[0..k-1] and b[0..k-1] represent bit decompositions of the factors. SATISFIABLE iff N is composite. Chosen because LLM models have number-theoretic knowledge enabling direct factor suggestion.

2. **Graph 3-coloring** (7 instances): Standard CNF coloring encoding of random graphs with edge probability tuned near the chromatic threshold. LLM heuristic: suggest greedy coloring before search.

3. **Random 3-SAT at phase transition** (6 instances, clause/variable ratio ≈ 4.267): Baseline instances where LLM advantage is expected to be minimal; used to measure overhead.

---

## 5. Experimental Results

On factorization benchmarks, LLM-guided branching achieves zero DPLL decisions for instances up to N = 9,797 (97 × 101), compared to 95 decisions for standard DPLL. Results from the factorization constraint-propagation experiment [2]:

| N | DPLL decisions | LLM decisions | LLM tokens |
|---|---|---|---|
| 77 (7×11) | 5 | 0 | 746 |
| 589 (19×31) | 17 | 0 | 746 |
| 9797 (97×101) | 95 | 0 | 746 |
| 1,024,384,027 (32003×32009) | 32,001 | 0 | 891 |

The LLM token cost is approximately constant (~$0.008) while DPLL decisions grow as O(√N).

---

## 6. Limitations

1. **No CDCL clause learning.** The solver uses plain DPLL without conflict-driven clause learning (CDCL). DRAT/LRAT proof generation requires logging learned clauses and their antecedents, which is a CDCL concept. The abstract proof trace (Section 3.5) provides a replayable resolution refutation for UNSAT instances, but not in DRAT format. This remains the primary reason for the Experimental Track submission; adding CDCL is the natural next step toward Main Track eligibility.

2. **Latency.** Each LLM call adds 200–800ms wall-clock latency. For the competition's 5000-second limit, this allows approximately 6,000–25,000 LLM-guided decisions — sufficient for the submitted benchmark family.

3. **Out-of-distribution failure.** For instances without learnable structure (random 3-SAT), LLM hints degrade to noise and the solver falls back to VSIDS-lite.

---

## References

[1] M. Davis, G. Logemann, and D. Loveland. "A machine program for theorem-proving." Communications of the ACM, 5(7):394–397, 1962.

[2] F. Bienvenu. "LLM-Guided Constraint Solving with Structured Problem Representations." mycontext-cli Research Track, March 2026. https://github.com/farajabien/mycontext-cli/blob/main/experiments/solver/README.md

[3] M. Järvisalo, D. Le Berre, O. Roussel, and L. Simon. "The International SAT Solver Competitions." AI Magazine, 33(1):89–92, 2012.

[4] A. Biere, M. Heule, H. van Maaren, and T. Walsh (eds.). Handbook of Satisfiability, 2nd edition. IOS Press, 2021.

---

*Submitted to SAT Competition 2026 — Experimental Track.*
*Solver registration deadline: April 19, 2026.*
*Solver submission deadline: April 26, 2026.*
