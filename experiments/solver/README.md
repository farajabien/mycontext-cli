# LLM-Guided SAT Solver

**SAT Competition 2026 — Experimental Track**

> farajabien · [SYSTEM_DESCRIPTION.md](./SYSTEM_DESCRIPTION.md)

---

## Quick Start

This solver lives inside the `mycontext-cli` monorepo. Use sparse checkout to download **only this directory**:

```bash
git clone --filter=blob:none --sparse https://github.com/farajabien/mycontext-cli.git
cd mycontext-cli
git sparse-checkout set experiments/solver
cd experiments/solver
cp .env.example .env   # add GITHUB_TOKEN
npm install
```

### API key

| Variable | Provider | Free tier |
|---|---|---|
| `GITHUB_TOKEN` | GitHub Models (gpt-4o-mini) | Yes — free with GitHub account |

### Commands

```bash
# Run solver on a CNF file
npm run sat -- benchmarks/factorize-77.cnf

# LLM-guided mode (requires GITHUB_TOKEN)
npm run sat -- benchmarks/factorize-77.cnf --llm

# Compare DPLL vs LLM on a benchmark
npm run sat:compare benchmarks/factorize-9797.cnf

# Generate all 20 competition benchmarks
npm run benchmarks:generate
```

---

## Architecture

A DPLL solver augmented with LLM-guided variable selection. When `GITHUB_TOKEN` is set, the solver queries GitHub Models (gpt-4o-mini) to suggest the next branching variable. Each LLM decision is logged as a structured `ProofStep` in the solver output — making branching transparent and independently replayable.

```
CNF formula
     ↓
Unit propagation (BCP)
     ↓
Variable selection:
  ├── LLM mode   → query GitHub Models → suggested variable + reasoning
  └── DPLL mode  → VSIDS-lite heuristic
     ↓
Recurse / Backtrack
     ↓
s SATISFIABLE / s UNSATISFIABLE
```

**Proof trace** (emitted as competition comment lines):
```
c proof-trace: 12 steps llm=8 vsids=4
c proof-step: seq=1 type=decision src=llm depth=0 var=3 conf=0.85 reason="variable 3 appears in most unit clauses"
c proof-step: seq=2 type=unit-prop src=propagation depth=1 var=7
...
```

---

## Benchmarks

Three families (20 total), generated via `npm run benchmarks:generate`:

| Family | Count | Description |
|---|---|---|
| `factorize-*.cnf` | 7 | Integer factorization circuits (7–30 bit semiprimes) |
| `color3-*.cnf` | 7 | Graph 3-coloring instances |
| `random3sat-*.cnf` | 6 | Random 3-SAT at the 4.2 clause/variable phase transition |
