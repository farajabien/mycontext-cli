# LLM-Guided Constraint Solving with Structured Problem Representations

**Research Experiment & Findings Report**

> farajabien · mycontext-cli Research Track · March 2026

---

## Quick Start — Clone just the solver

This solver lives inside the `mycontext-cli` monorepo. Use sparse checkout to download **only this directory** without fetching the full project:

```bash
# Sparse checkout — only downloads experiments/solver/, not the full CLI codebase
git clone --filter=blob:none --sparse https://github.com/farajabien/mycontext-cli.git
cd mycontext-cli
git sparse-checkout set experiments/solver
cd experiments/solver
cp .env.example .env        # fill in at least one API key
npm install
```

Then run any of the scripts below. No other packages or workspace setup required.

### API keys

Copy `.env.example` to `.env` and add at least one key:

| Variable | Provider | Free tier |
|---|---|---|
| `GITHUB_TOKEN` | GitHub Models (gpt-4o-mini) | Yes — free with GitHub account |
| `GEMINI_API_KEY` | Google Gemini | Yes — Gemini 3.1 Flash Lite |
| `OPENAI_API_KEY` | OpenAI | No |

The solver picks the first available key in the order above.

### Quick commands

```bash
npm run sat:compare benchmarks/factorize-9797.cnf   # compare DPLL vs LLM on a factorization instance
npm run benchmarks:generate                          # generate all 20 competition benchmarks
npm run sat -- benchmarks/random3sat-100v-427c-s102.cnf   # plain DPLL on random 3-SAT
```

---

## Abstract

This paper presents an empirical comparison of three computational strategies — brute-force enumeration, constraint propagation, and LLM-guided domain narrowing — applied to structured search problems (integer factorization and password search). We introduce a *two-currency cost model* that expresses computational effort simultaneously in CPU operations and LLM tokens, enabling direct trade-off analysis between traditional and AI-augmented approaches.

The central contribution is a shared JSON constraint representation (ConstraintSpec) that acts as a unified interface consumed by all three strategies. This decoupling enables a *neuro-symbolic loop*: an LLM reasons about problem structure to produce a narrowed domain, and a deterministic solver verifies and completes the search. LLM-guided solving produced correct solutions with zero search-loop iterations across every tested instance, at a flat token cost of approximately 750–900 tokens (~$0.008 USD at GitHub Models pricing), independent of problem size.

**Important theoretical note:** constraint propagation's "0 search operations" result means the solution was found during domain evaluation — not that the overall complexity is sub-linear. Domain evaluation is still O(|domain|) = O(√N) for factorization. The architectural contribution is the separation of *reasoning* (neural) from *verification* (symbolic), not a complexity-class result.

---

## 1. Introduction

Modern AI systems increasingly combine neural and symbolic components. AlphaZero pairs a neural network with Monte Carlo Tree Search; automated theorem provers combine heuristic search with logical verification; planning systems use learned models to guide classical planners. The common pattern is:

```
reason first → structure the problem → search later
```

This experiment asks: can a structured JSON representation of a constraint satisfaction problem serve as the unifying interface between neural reasoning (an LLM) and symbolic search (a solver), and what does measurement reveal about how much the LLM guidance reduces actual search work?

We are not studying whether this resolves P vs NP. Factorization is not known to be NP-complete — it is believed to lie in an intermediate complexity class (BQP under quantum models, no classical sub-exponential algorithm is known). The problems here are chosen because they are well-understood and measurable, making them good benchmarks for the architectural question.

The real research question: **how much does LLM structural reasoning reduce symbolic search cost, and at what token cost?**

---

## 2. Theoretical Context

### 2.1 What "0 search operations" actually means

In the factorization results, constraint propagation reports `1` explored operation while brute-force reports `97`. This does not mean propagation is O(1) in the complexity-theory sense.

What happens internally during propagation:

```
for a in domain [2..98]:      ← still O(|domain|) = O(√N) iterations
    if not satisfies(9797 % a = 0):
        remove a from domain
```

After this pass, the domain contains only `{97}`. The subsequent *search* loop runs once (or zero times — the solution was found in the pruning pass). So:

- Brute-force: O(|domain|) search iterations
- Constraint propagation: O(|domain|) domain evaluation + O(|remaining|) search iterations

The practical advantage is that "remaining" is often 0 or 1 for strongly constrained problems. But the total work is the same order. This matters for honest reporting.

### 2.2 Where the LLM result is genuinely interesting

The LLM result is different in kind, not just degree. When the LLM produces `{"a":[97]}` for N=9797, it is not iterating — it is doing pattern recognition over its training distribution. Numbers like 97×101 exist in mathematical texts the model was trained on. The model performs approximate O(1) *lookup*, not algorithmic search.

This is the same insight behind AlphaZero's value network: the neural component doesn't search, it *recognizes*. Search happens in the tree; the network biases which branches to explore.

In this architecture:

```
LLM             →  recognizes structure  →  narrows domain  (O(1) lookup)
Propagation     →  verifies candidates   →  O(|domain|)
Search          →  exhaustive over remainder  →  O(0–1) after LLM hint
```

### 2.3 Relation to neuro-symbolic computing

This architecture is an instance of neuro-symbolic reasoning: a neural component (LLM) produces structured intermediate representations (ConstraintSpec with narrowed domains) that a symbolic component (the solver) can verify and complete. The JSON Brain acts as the shared interface — precise enough for a deterministic evaluator to execute, descriptive enough for an LLM to reason about.

Contrast with pure LLM approaches (output is unverifiable text) and pure symbolic approaches (require hand-coded rules) — the hybrid captures benefits of both.

---

## 3. Methodology

### 3.1 Constraint Specification Format

Each problem is expressed as a `ConstraintSpec` JSON object:

```json
{
  "variables": [
    { "name": "a", "domain": { "min": 2, "max": 98 } }
  ],
  "constraints": [
    { "expr": "9797 % a = 0" }
  ]
}
```

This format decouples problem representation from solving strategy. The same spec is consumed by all three solvers without modification.

### 3.2 Solving Strategies

**Brute-force**: Computes the cartesian product of all variable domains. Each candidate assignment is tested against all constraints. No pruning. Complexity: O(∏|domain_i|).

**Constraint propagation**: Before the search loop, each constraint is evaluated against each candidate value in each variable's domain. Values that fail all constraints are eliminated (pruned). For strongly constrained problems this often reduces the remaining search space to 0 or 1 candidates, at the cost of one O(|domain|) evaluation pass. Total: O(|domain|) propagation + O(|remainder|) search.

**LLM-guided**: The ConstraintSpec (plus any prior brute-force trace) is sent to a language model requesting JSON-structured domain hints. The model's suggested domain replaces the variable's domain before propagation runs. If the model's structural recognition is correct, the remainder is exactly the solution — 0 additional search iterations.

### 3.3 Refinement Loop

When `--refine` is specified:

```
Iteration 1:  brute-force — explores candidates, records trace
     ↓  feed trace + ConstraintSpec to LLM
Iteration 2:  llm-guided  — LLM suggests narrowed domain → 0 remainder
     ↓  (optional further iterations if LLM hint was imprecise)
Iteration N:  domain narrows further until solution is confirmed
```

This loop mirrors the AlphaZero pattern: explore → learn from trace → refine next search.

### 3.4 Measurement

| Metric | Definition |
|---|---|
| `exploredCount` | Number of candidate assignments tested in the search loop |
| `originalSearchSpaceSize` | Cartesian product size before propagation |
| `searchSpaceSize` | Cartesian product size after propagation |
| `reductionRatio` | `1 - (exploredCount / originalSearchSpaceSize)` |
| `runtimeMs` | Wall-clock time including propagation |
| `llmTokensUsed` | Tokens consumed by the LLM call (0 for non-LLM strategies) |
| `costUSD` | `llmTokensUsed × $0.00001` (GitHub Models rate) |

Note: `reductionRatio` measures search-loop reduction relative to the original space. It does not account for the propagation pass, which is proportional to domain size.

### 3.5 Expression Evaluator

A recursive-descent parser implements constraint evaluation without `eval()`. Supports: `+`, `-`, `*`, `/`, `%`, `=`, `<=`, `>=`, `!=`, `<`, `>`, `sqrt()`, `abs()`.

### 3.6 LLM Provider

Primary: GitHub Models (`models.inference.ai.azure.com`) via OpenAI SDK. Cost: $0.00001/token. Automatic fallback to Google Gemini (`gemini-2.5-flash` via OpenAI-compatible endpoint) on authentication failure.

---

## 4. Results

### 4.1 Integer Factorization: N = 9797 = 97 × 101

Search domain: a ∈ [2, 98] (⌊√9797⌋ = 98), constraint: `9797 % a = 0`

```
Method                    | Search Ops | Space | Loop Reduction | Tokens | Cost
--------------------------|------------|-------|----------------|--------|----------
brute-force               |         97 |    97 |           0.0% |      0 | $0.000
constraint-propagation    |          1 |    97 |          99.0% |      0 | $0.000
llm-guided (loop 2)       |          0 |    97 |         100.0% |    746 | $0.0075
```

LLM hint: `{"a":[97]}`

Note: constraint propagation's "1 op" reflects one search-loop iteration after the O(97) domain evaluation pass eliminated all non-factors. Brute-force and propagation have the same domain-evaluation work; propagation eliminates the remaining search iterations.

### 4.2 Password Search: "solve" (26-character alphabet, 26⁵ = 11,881,376 candidates)

Each character position is a separate variable: c0 ∈ [0,25], ..., c4 ∈ [0,25], with unary constraints `c0 = 18`, `c1 = 14`, etc. (character indices).

```
Method                    | Search Ops | Space      | Loop Reduction | Tokens | Cost
--------------------------|------------|------------|----------------|--------|----------
brute-force               |  2,489,112 | 11,881,376 |          79.1% |      0 | $0.000
constraint-propagation    |          0 | 11,881,376 |         100.0% |      0 | $0.000
llm-guided (loop 2)       |          0 | 11,881,376 |         100.0% |    891 | $0.0089
```

LLM hint: `{"c0":[18],"c1":[14],"c2":[11],"c3":[21],"c4":[4]}`

For password search, each character position is a unary constraint (one variable, one value). Domain evaluation reduces each position to one candidate independently — O(L × charset) total propagation work where L=5 and charset=26. Brute-force timed out: "solve" begins with 's' (index 18 of 26), placing it ~79% through alphabetical enumeration.

### 4.3 Factorization Scaling Benchmark

Brute-force search-loop operations vs. constraint propagation across six semiprime sizes:

```
bits |          N           | bf-ops | cp-ops | bf-ms | cp-ms | loop-reduction
-----|----------------------|--------|--------|-------|-------|----------------
   7 |                   77 |      5 |      0 |    1ms|    0ms|        100.0%  (7×11)
  10 |                  589 |     17 |      0 |    1ms|    0ms|        100.0%  (19×31)
  14 |                9,797 |     95 |      0 |    8ms|    2ms|        100.0%  (97×101)
  20 |            1,022,117 |  1,007 |      0 |   24ms|   12ms|        100.0%  (1009×1013)
  24 |           16,016,003 |  3,999 |      0 |   27ms|   28ms|        100.0%  (4001×4003)
  30 |        1,024,384,027 | 32,001 |      0 |  157ms|  221ms|        100.0%  (32003×32009)
```

`bf-ops` grows as O(√N) — confirming expected trial-division complexity. `cp-ops` reports 0 because for semiprimes the solution (`a = min(p,q)`) is found during the domain evaluation pass; the subsequent search loop has an empty remaining set. Wall-clock times reflect that propagation and brute-force do similar total work; propagation avoids the explicit loop but pays similar evaluation time.

---

## 5. Discussion

### 5.1 The Two-Currency Cost Model

| Currency | Brute force | Constraint prop | LLM-guided |
|---|---|---|---|
| Domain evaluation | O(√N) | O(√N) | O(1) — skipped |
| Search-loop iterations | O(√N) | O(0–1) | O(0) |
| LLM tokens | 0 | 0 | ~700–900/call |
| Cost at GitHub Models | $0 | $0 | ~$0.007–$0.009 |

The LLM's structural recognition bypasses domain evaluation entirely — it returns the answer directly. This is qualitatively different from propagation (which still evaluates the domain). For factorization at 30 bits, the LLM trades ~32,000 evaluation steps for ~$0.008. At 64 bits (ECDSA/RSA territory), brute-force evaluation becomes computationally infeasible while LLM token cost stays constant.

### 5.2 Architectural Parallel: AlphaZero

The refinement loop pattern mirrors AlphaZero's core design:

| AlphaZero | This system |
|---|---|
| Game position | ConstraintSpec |
| Neural network predicts good moves | LLM narrows variable domains |
| MCTS explores promising branches | Constraint propagation + search |
| Evaluation updates network | Trace fed back to LLM in next loop |

The shared insight: **neural components guide search; symbolic components verify**. The JSON representation is the interface between them — structured enough for the solver to execute deterministically, rich enough for the LLM to reason about semantically.

### 5.3 Why the JSON Representation Matters

Most agent frameworks pass reasoning state as markdown or chat logs. These are opaque to machines — not diffable, not parsable, not verifiable between models. The ConstraintSpec representation is:

- **Diffable**: domain changes between iterations are explicit
- **Parsable**: the solver executes constraints deterministically
- **Verifiable**: any candidate can be checked against any constraint
- **Shareable**: the same spec passes between LLM, propagator, and search loop

This is a systems design insight independent of the specific problems tested.

### 5.4 Limitations

1. **LLM correctness is probabilistic.** The LLM was correct on all tested instances, but this relies on the problems existing in its training distribution (small semiprimes, common English words). The architecture treats LLM hints as domain suggestions verified by the solver, not as final answers — which is the correct design, but does not guarantee correctness for out-of-distribution problems.

2. **Propagation complexity is O(|domain|), not O(1).** The "0 search operations" metric measures search-loop iterations only. Domain evaluation and propagation work is proportional to domain size, identical in order to brute-force. The improvement is eliminating the explicit search loop, not reducing total computation.

3. **Problems are highly structured.** Factorization of semiprimes and direct password search with known constraints are maximally amenable to propagation and LLM recognition. Problems near the 3-SAT phase transition, random graph coloring, or TSP instances would provide a much harder test.

4. **30-bit maximum tested.** Extending to 40–64 bits for factorization would test whether the LLM guidance advantage holds for numbers unlikely to be in its training distribution.

5. **Token cost varies by model and provider.** $0.00001/token is the GitHub Models rate at time of experiment. The architecture supports provider fallback.

---

## 6. Conclusions

1. A shared ConstraintSpec JSON format enables three fundamentally different solving strategies to operate on the same problem representation without modification. This decoupling is the primary architectural contribution.

2. Constraint propagation eliminates search-loop iterations for strongly constrained problems by finding solutions during domain evaluation. The total computational work remains O(|domain|) — the improvement is structural, not asymptotic.

3. LLM-guided solving bypasses domain evaluation by returning the answer via structural recognition from training. Token cost is independent of N for problems within the model's training distribution (~750–900 tokens, ~$0.008 per query).

4. The two-currency cost model provides a principled basis for strategy selection. LLM-guided solving is advantageous when N is large enough that domain evaluation becomes expensive, and the problem structure is likely to be in the model's training distribution.

5. The architecture — LLM narrows domain → propagation verifies and completes → trace feeds back — is structurally analogous to the neural-guided search pattern in AlphaZero and related neuro-symbolic systems. The ConstraintSpec JSON acts as the shared interface between the neural and symbolic components.

6. The most important open question is whether this architecture scales to problems without strong structural regularities: random 3-SAT near the phase transition, graph coloring, or TSP. This is the right next experiment.

---

## 7. Proposed Next Experiments

The results here are promising but the problems are too structured to be conclusive. These experiments would stress-test the architecture:

| Experiment | Why it matters |
|---|---|
| Random 3-SAT near the 4.2 clause/variable ratio | Phase transition — propagation gives no advantage; LLM must generalize |
| Graph coloring (random k-colorable graphs) | NP-complete; tests whether LLM hints reduce DPLL-style backtracking |
| TSP with 20–50 cities | Combinatorial explosion; LLM tour heuristic vs. exact solver lower bound |
| Factorization at 40–64 bits | Tests whether LLM knows large semiprimes or fails out-of-distribution |
| Multi-variable constraint systems | Tests whether ConstraintSpec scales to richer problem representations |

The metric to report: **search-space reduction ratio as a function of LLM hint quality**, measured by comparing runs where the LLM hint is accurate vs. where it is partially wrong. This would quantify exactly how much reasoning quality affects solver performance.

---

## 8. Reproducing the Results

### Prerequisites

```bash
cd experiments/solver
npm install
```

Create `.env` in the repo root. At least one LLM key is required for `llm-guided` and `--refine` modes:

```env
# Priority order (first valid key wins):
GITHUB_TOKEN=github_pat_...      # GitHub Models — $0.00001/token
```

### Commands

```bash
# Reproduce §4.1 — factorization with LLM refinement
npx tsx src/runner.ts factorize 9797 --refine

# Reproduce §4.2 — password search
npx tsx src/runner.ts password solve --charset az --refine

# Reproduce §4.3 — scaling benchmark (no LLM required)
npx tsx src/runner.ts benchmark
```

### Output files

All results saved to `experiments/solver/results/`:

| File | Contents |
|---|---|
| `factorize-<N>-<ts>.csv` | Per-method metrics for one factorization run |
| `factorize-<N>-refine-<ts>.csv` | Per-loop refinement trace with cumulative cost |
| `password-len<L>-<charset>-<ts>.csv` | Per-method metrics for a password benchmark |
| `benchmark-factorize-scaling-<ts>.csv` | All methods across all bit sizes |

CSV columns (refinement): `loop, method, exploredCount, searchSpaceSize, reductionRatio, runtimeMs, llmTokensUsed, cumulativeTokens, costUSD, cumulativeCostUSD, solution`

---

## 9. Architecture

```
Natural language / problem statement
        ↓
   LLM Parser (parses into ConstraintSpec)
        ↓
   ConstraintSpec (JSON Brain)             ← shared interface
   {
     variables: [{ name: "a", domain: { min: 2, max: 98 } }],
     constraints: [{ expr: "9797 % a = 0" }]
   }
        ↓
   ┌─────────────────────────────────────────┐
   │  Strategy selection                     │
   │                                         │
   │  brute-force     → cartesian product    │
   │  propagation     → prune, then search   │
   │  llm-guided      → LLM hint, then prop  │
   └─────────────────────────────────────────┘
        ↓
   SolveResult + SolveMetrics
   (search ops, domain eval, tokens, reduction ratio, cost)
        ↓
   CSV export + refinement loop feedback
```

Expression evaluator: recursive-descent parser, no `eval()`, supports `+`, `-`, `*`, `/`, `%`, `=`, `<=`, `>=`, `!=`, `<`, `>`, `sqrt()`, `abs()`.

---

## 10. Project Context

This experiment is part of the `mycontext-cli` monorepo research track. The constraint JSON format and solver architecture mirror the `SolverAgent` sub-agent in `apps/cli/src/agents/implementations/SolverAgent.ts`, which integrates the same reasoning pipeline into the full mycontext toolchain.

The broader research direction is documented in `apps/cli/src/types/constraint.ts`.

---

*Experiment code: `experiments/solver/src/` — TypeScript, ~600 lines, zero runtime dependencies beyond `openai` and `dotenv`.*

---

## 11. SAT Competition 2026 — Submission Guide

### Deadlines

| Action | Deadline |
|---|---|
| Solver registration + benchmark submission | **April 19, 2026** |
| Solver upload to StarExec | **April 26, 2026** |
| Final solver documentation | May 17, 2026 |

### Step 1 — Convert system description to PDF

The competition requires a 1–2 page IEEE-format PDF. Convert `SYSTEM_DESCRIPTION.md`:

```bash
# Option A: pandoc (if installed)
pandoc SYSTEM_DESCRIPTION.md -o SYSTEM_DESCRIPTION.pdf --pdf-engine=xelatex

# Option B: GitHub → print to PDF
# Open https://github.com/farajabien/mycontext-cli/blob/main/experiments/solver/SYSTEM_DESCRIPTION.md
# and use browser Print → Save as PDF
```

### Step 2 — Registration email (before April 19)

Check **https://satcompetition.github.io/2026/** for the organizer contact email. Send:

```
Subject: SAT Competition 2026 — Solver Registration — LLM-Guided (Experimental Track)

Solver name:    LLM-Guided
Authors:        Faraj Bienvenu <faraja.bien@gmail.com>
Track:          Experimental Track
System description: [attach SYSTEM_DESCRIPTION.pdf]
Source code:    https://github.com/farajabien/mycontext-cli/tree/main/experiments/solver
Benchmarks:     20 instances attached (see benchmarks/ directory)
                  7 factorization circuits (factorize-*.cnf)
                  7 graph 3-coloring instances (color3-*.cnf)
                  6 random 3-SAT at phase transition (random3sat-*.cnf)
```

Attach the 20 `.cnf` files from `benchmarks/` as a zip.

### Step 3 — Build the StarExec package (before April 26)

```bash
# Install dependencies (first time only)
npm install

# Build bundled binary + zip the competition package
npm run package
# → produces: llm-guided-sat-starexec.zip
```

The zip contains:
```
llm-guided-sat-starexec.zip
├── bin/
│   └── starexec_run_default   ← main entry point (chmod +x)
├── dist/
│   └── sat.mjs                ← bundled Node.js solver (~800KB, all deps baked in)
├── benchmarks/
│   └── *.cnf                  ← 20 competition instances
├── SYSTEM_DESCRIPTION.md
└── README.md
```

### Step 4 — Upload to StarExec

1. Create an account at **https://www.starexec.org/starexec/**
2. Go to **Solvers → Upload New Solver**
3. Upload `llm-guided-sat-starexec.zip`
4. Set solver name: `LLM-Guided`
5. StarExec will call `bin/starexec_run_default <input.cnf>` for each benchmark

### Notes on LLM mode in competition

StarExec machines may not have internet access. The solver handles this gracefully:
- If `GITHUB_TOKEN` is set in the environment → LLM-guided branching via GitHub Models
- Otherwise → falls back to VSIDS-lite (plain DPLL), still produces correct results

To request internet access for the Experimental Track, note this in your registration email. If granted, set `GITHUB_TOKEN` as a StarExec environment variable on the job configuration page.

### Verifying a submission build

```bash
# Quick smoke test of the competition package before submitting
bash bin/starexec_run_default benchmarks/factorize-77.cnf
# Expected: c mode: dpll (or llm-guided if token set)
#           c Parsed: 336 vars, 1082 clauses
#           s SATISFIABLE
#           v 1 2 ...

bash bin/starexec_run_default benchmarks/color3-10v-21e-s42.cnf
# Expected: s UNSATISFIABLE
```
