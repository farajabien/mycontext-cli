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

---

## SAT Competition 2026 — Submission Guide

### Deadlines

| Action | Deadline |
|---|---|
| Solver registration + benchmark submission | **April 19, 2026** |
| Solver upload to StarExec | **April 26, 2026** |
| Final solver documentation | May 17, 2026 |

### Step 1 — System description PDF

```bash
# Generate HTML, then print to PDF in browser (Cmd+P → Save as PDF)
pandoc SYSTEM_DESCRIPTION.md -o SYSTEM_DESCRIPTION.html && open SYSTEM_DESCRIPTION.html
```

### Step 2 — Registration email (before April 19)

Send to `organizers@satcompetition.org`:

```
Subject: SAT Competition 2026 — Solver Registration — LLM-Guided (Experimental Track)

Solver name:    LLM-Guided
Authors:        Faraj Bienvenu <faraja.bien@gmail.com>
Track:          Experimental Track
System description: [attach SYSTEM_DESCRIPTION.pdf]
Source code:    https://github.com/farajabien/mycontext-cli/tree/main/experiments/solver
Benchmarks:     20 instances attached (benchmarks.zip)
```

### Step 3 — Build the StarExec package (before April 26)

```bash
npm run package
# → llm-guided-sat-starexec.zip
```

Package contents:
```
llm-guided-sat-starexec.zip
├── bin/starexec_run_default   ← entry point (chmod +x)
├── dist/sat.mjs               ← bundled solver (~800KB, all deps baked in)
├── benchmarks/*.cnf           ← 20 competition instances
├── SYSTEM_DESCRIPTION.md
└── README.md
```

### Step 4 — Upload to StarExec

1. Create an account at **https://www.starexec.org/**
2. Go to **Solvers → Upload New Solver**
3. Upload `llm-guided-sat-starexec.zip`
4. StarExec calls `bin/starexec_run_default <input.cnf>` for each benchmark

### LLM mode on StarExec

StarExec machines may not have internet access. The solver handles this gracefully:
- `GITHUB_TOKEN` set → LLM-guided branching via GitHub Models
- No token → falls back to VSIDS-lite DPLL, still produces correct results

To request internet access, note it in your registration email.

### Smoke test before submitting

```bash
bash bin/starexec_run_default benchmarks/factorize-77.cnf
# Expected: s SATISFIABLE

bash bin/starexec_run_default benchmarks/color3-10v-21e-s42.cnf
# Expected: s UNSATISFIABLE
```
