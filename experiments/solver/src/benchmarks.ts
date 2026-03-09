/**
 * benchmarks.ts — CNF Benchmark Generator for SAT Competition 2026
 *
 * Generates three families of benchmark instances:
 *
 * 1. factorize-<N>.cnf   — Is N composite? Find factor a: a*b=N (bit-blasted circuit)
 *    LLM advantage: number-theoretic knowledge → direct factor suggestion
 *    CDCL challenge: multiplication circuit has many symmetries
 *
 * 2. color-k-<n>-<e>.cnf — k-colorability of random graphs
 *    LLM advantage: greedily suggesting color assignments
 *    CDCL challenge: large search space for dense graphs
 *
 * 3. random-3sat-<n>-<m>.cnf — Random 3-SAT at phase transition (ratio ≈ 4.267)
 *    LLM advantage: minimal (used as baseline for comparison)
 *    CDCL baseline: hardest known class for DPLL
 *
 * Usage:
 *   npx tsx src/benchmarks.ts generate          # generates all 20 instances
 *   npx tsx src/benchmarks.ts factorize <N>     # single factorization instance
 *   npx tsx src/benchmarks.ts color <k> <n> <e> # k-coloring of graph with n verts, e edges
 *   npx tsx src/benchmarks.ts random <n> <m>    # random 3-SAT with n vars, m clauses
 */

import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BENCH_DIR = path.resolve(__dirname, "..", "benchmarks");

// ── Helpers ───────────────────────────────────────────────────────────────

/** Simple seeded PRNG (xorshift32) for reproducible benchmarks */
class PRNG {
  private state: number;
  constructor(seed: number) { this.state = seed >>> 0 || 1; }
  next(): number {
    let x = this.state;
    x ^= x << 13; x ^= x >> 17; x ^= x << 5;
    this.state = x >>> 0;
    return (this.state >>> 0) / 0x100000000;
  }
  int(lo: number, hi: number): number { return Math.floor(lo + this.next() * (hi - lo + 1)); }
}

function writeCNF(
  filename: string,
  nVars: number,
  clauses: number[][],
  comments: string[] = []
): void {
  fs.mkdirSync(BENCH_DIR, { recursive: true });
  const lines: string[] = [];
  for (const c of comments) lines.push(`c ${c}`);
  lines.push(`p cnf ${nVars} ${clauses.length}`);
  for (const clause of clauses) lines.push(clause.join(" ") + " 0");
  fs.writeFileSync(path.join(BENCH_DIR, filename), lines.join("\n") + "\n");
  console.log(`Generated: benchmarks/${filename}  (${nVars} vars, ${clauses.length} clauses)`);
}

// ── 1. Factorization as SAT (bit-blasted multiplication circuit) ───────────
//
// Encoding: Given N, create variables for k-bit factor a (2 ≤ a ≤ √N).
// Encode "N mod a = 0" using binary trial division circuit.
//
// Simpler approach: encode as bit-level equality of a * (N / a) = N.
// We use a column-based binary multiplier (schoolbook).
//
// Variables:
//   1..k         — bits of factor a (a[0] = LSB)
//   k+1..2k      — bits of quotient b (b[0] = LSB)
//   rest         — intermediate carry/sum wires

interface CNFBuilder {
  nextVar: number;
  clauses: number[][];
  newVar(): number;
  addClause(...lits: number[]): void;
  andGate(x: number, y: number): number; // returns z where z = x AND y
  xorGate(x: number, y: number): number; // returns z where z = x XOR y
  orGate(x: number, y: number): number;  // returns z where z = x OR y
}

function makeBuilder(startVar: number): CNFBuilder {
  const b: CNFBuilder = {
    nextVar: startVar,
    clauses: [],
    newVar() { return this.nextVar++; },
    addClause(...lits) { this.clauses.push(lits); },
    andGate(x, y) {
      const z = this.newVar();
      this.addClause(-x, -y, z);
      this.addClause(x, -z);
      this.addClause(y, -z);
      return z;
    },
    xorGate(x, y) {
      const z = this.newVar();
      this.addClause(-x, -y, -z);
      this.addClause(x, y, -z);
      this.addClause(x, -y, z);
      this.addClause(-x, y, z);
      return z;
    },
    orGate(x, y) {
      const z = this.newVar();
      this.addClause(x, y, -z);
      this.addClause(-x, z);
      this.addClause(-y, z);
      return z;
    },
  };
  return b;
}

/** Full adder: returns [sum, carry] where sum = a XOR b XOR cin */
function fullAdder(b: CNFBuilder, a: number, x: number, cin: number): [number, number] {
  const axb = b.xorGate(a, x);
  const sum = b.xorGate(axb, cin);
  const c1 = b.andGate(a, x);
  const c2 = b.andGate(axb, cin);
  const carry = b.orGate(c1, c2);
  return [sum, carry];
}

/**
 * Encode "a * b = N" as CNF where a and b are k-bit integers.
 * Uses a carry-save adder (CSA) tree: 3 bits → 1 sum + 1 carry.
 * Returns the CNF formula with variables a[0..k-1] and b[0..k-1] as 1..2k.
 */
export function factorizationCNF(N: number): { nVars: number; clauses: number[][]; comments: string[] } {
  const k = Math.ceil(Math.log2(N + 1)) + 1;
  const Nbits = Array.from({ length: 2 * k }, (_, i) => (N >> i) & 1);

  // Variables: a[i] = i+1 (i=0..k-1), b[i] = k+i+1 (i=0..k-1)
  const aVars = Array.from({ length: k }, (_, i) => i + 1);
  const bVars = Array.from({ length: k }, (_, i) => k + i + 1);
  const builder = makeBuilder(2 * k + 1);

  // Partial products: pp[i][j] = a[i] AND b[j], occupies bit position i+j
  const columns: number[][] = Array.from({ length: 2 * k }, () => []);
  for (let i = 0; i < k; i++) {
    for (let j = 0; j < k; j++) {
      const pp = builder.andGate(aVars[i]!, bVars[j]!);
      columns[i + j]!.push(pp);
    }
  }

  // CSA reduction: process each column, propagate carries
  const productBits: number[] = [];
  for (let c = 0; c < 2 * k; c++) {
    const col = columns[c]!;

    // Reduce column to ≤ 2 bits using full adders (3→2), half adders (2→2 but carry goes out)
    while (col.length > 2) {
      const a = col.shift()!;
      const b = col.shift()!;
      const ci = col.shift()!;
      const [s, co] = fullAdder(builder, a, b, ci);
      col.push(s);                        // sum stays in this column
      columns[c + 1]?.push(co);           // carry goes to next column
    }

    if (col.length === 2) {
      // Half adder: sum stays, carry goes out
      const [a, b] = [col[0]!, col[1]!];
      const s = builder.xorGate(a, b);
      const co = builder.andGate(a, b);
      productBits.push(s);
      columns[c + 1]?.push(co);
    } else if (col.length === 1) {
      productBits.push(col[0]!);
    } else {
      // Empty column — constant 0
      const z = builder.newVar();
      builder.addClause(-z);
      productBits.push(z);
    }
  }

  // Fix product bits to equal N's binary representation
  const clauses: number[][] = [...builder.clauses];
  for (let c = 0; c < Math.min(productBits.length, 2 * k); c++) {
    const bit = productBits[c]!;
    clauses.push([Nbits[c] === 1 ? bit : -bit]);
  }

  // Constraint: both factors are non-trivial (≥ 2)
  clauses.push(aVars.slice(1)); // a[1] OR a[2] OR ... must be true (a ≥ 2)
  clauses.push(bVars.slice(1)); // b[1] OR b[2] OR ... must be true (b ≥ 2)

  return {
    nVars: builder.nextVar - 1,
    clauses,
    comments: [
      `Factorization SAT: find a,b > 1 such that a * b = ${N}`,
      `Variable a[i] = i+1 (i=0..${k - 1}), b[i] = ${k}+i+1 (i=0..${k - 1})`,
      `SATISFIABLE iff ${N} is composite`,
      `SAT Competition 2026 — Experimental Track — LLM-Guided SAT Solver`,
    ],
  };
}

// ── 2. Graph k-Coloring ───────────────────────────────────────────────────

/**
 * Encode k-coloring of a graph as CNF.
 * Variables: x[v][c] = var(v, c, k) = v*k + c + 1
 */
function colorVar(v: number, c: number, k: number): number {
  return v * k + c + 1;
}

export function graphColoringCNF(
  k: number,
  edges: [number, number][],
  nVertices: number
): { nVars: number; clauses: number[][]; comments: string[] } {
  const clauses: number[][] = [];

  // At least one color per vertex
  for (let v = 0; v < nVertices; v++) {
    clauses.push(Array.from({ length: k }, (_, c) => colorVar(v, c, k)));
  }

  // At most one color per vertex (pairwise)
  for (let v = 0; v < nVertices; v++) {
    for (let c1 = 0; c1 < k; c1++) {
      for (let c2 = c1 + 1; c2 < k; c2++) {
        clauses.push([-colorVar(v, c1, k), -colorVar(v, c2, k)]);
      }
    }
  }

  // Adjacent vertices must have different colors
  for (const [u, v] of edges) {
    for (let c = 0; c < k; c++) {
      clauses.push([-colorVar(u, c, k), -colorVar(v, c, k)]);
    }
  }

  return {
    nVars: nVertices * k,
    clauses,
    comments: [
      `${k}-Coloring of graph with ${nVertices} vertices, ${edges.length} edges`,
      `Variable x[v][c] = vertex v has color c  (v=0..${nVertices - 1}, c=0..${k - 1})`,
      `Variable number: v*${k} + c + 1`,
      `SAT Competition 2026 — Experimental Track — LLM-Guided SAT Solver`,
    ],
  };
}

/** Generate a random graph */
function randomGraph(n: number, edgeProbability: number, seed: number): [number, number][] {
  const rng = new PRNG(seed);
  const edges: [number, number][] = [];
  for (let u = 0; u < n; u++) {
    for (let v = u + 1; v < n; v++) {
      if (rng.next() < edgeProbability) edges.push([u, v]);
    }
  }
  return edges;
}

// ── 3. Random 3-SAT ──────────────────────────────────────────────────────

export function random3SAT(
  nVars: number,
  nClauses: number,
  seed: number
): { nVars: number; clauses: number[][]; comments: string[] } {
  const rng = new PRNG(seed);
  const clauses: number[][] = [];

  for (let i = 0; i < nClauses; i++) {
    const vars = new Set<number>();
    while (vars.size < 3) {
      vars.add(rng.int(1, nVars));
    }
    const clause = [...vars].map(v => (rng.next() < 0.5 ? v : -v));
    clauses.push(clause);
  }

  return {
    nVars,
    clauses,
    comments: [
      `Random 3-SAT: ${nVars} vars, ${nClauses} clauses (ratio ${(nClauses / nVars).toFixed(3)})`,
      `Seed: ${seed}`,
      `SAT Competition 2026 — Experimental Track — LLM-Guided SAT Solver`,
    ],
  };
}

// ── Benchmark suite generation ────────────────────────────────────────────

export function generateAll(): void {
  console.log(`Generating SAT Competition 2026 benchmark suite → ${BENCH_DIR}\n`);

  // Family 1: Factorization (7 instances — capped at 20-bit to keep circuits manageable)
  // Larger semiprimes create O(k^3) clauses — millions for k≥24
  const semiprimes: [number, string, string][] = [
    [77,      "7×11",      "easy"],
    [589,     "19×31",     "easy"],
    [9797,    "97×101",    "medium"],
    [1022117, "1009×1013", "medium"],
    [16127,   "127×127",   "medium"],   // perfect square — symmetric
    [2491,    "47×53",     "easy"],
    [10403,   "101×103",   "medium"],
  ];

  for (const [N, label, diff] of semiprimes) {
    const { nVars, clauses, comments } = factorizationCNF(N);
    writeCNF(`factorize-${N}.cnf`, nVars, clauses, [
      ...comments,
      `Label: ${label}  Difficulty: ${diff}`,
    ]);
  }

  // Family 2: Graph 3-coloring (7 instances)
  const graphConfigs = [
    { n: 10,  p: 0.4,  seed: 42,  diff: "easy"   },
    { n: 15,  p: 0.4,  seed: 43,  diff: "easy"   },
    { n: 20,  p: 0.35, seed: 44,  diff: "medium" },
    { n: 25,  p: 0.35, seed: 45,  diff: "medium" },
    { n: 30,  p: 0.3,  seed: 46,  diff: "medium" },
    { n: 40,  p: 0.28, seed: 47,  diff: "hard"   },
    { n: 50,  p: 0.25, seed: 48,  diff: "hard"   },
  ];

  for (const { n, p, seed, diff } of graphConfigs) {
    const edges = randomGraph(n, p, seed);
    const { nVars, clauses, comments } = graphColoringCNF(3, edges, n);
    writeCNF(`color3-${n}v-${edges.length}e-s${seed}.cnf`, nVars, clauses, [
      ...comments,
      `Difficulty: ${diff}`,
    ]);
  }

  // Family 3: Random 3-SAT near phase transition (ratio 4.267) — 6 instances
  const satConfigs = [
    { n: 50,  ratio: 4.267, seed: 100 },
    { n: 75,  ratio: 4.267, seed: 101 },
    { n: 100, ratio: 4.267, seed: 102 },
    { n: 150, ratio: 4.267, seed: 103 },
    { n: 200, ratio: 4.267, seed: 104 },
    { n: 300, ratio: 4.267, seed: 105 },
  ];

  for (const { n, ratio, seed } of satConfigs) {
    const m = Math.round(n * ratio);
    const { nVars, clauses, comments } = random3SAT(n, m, seed);
    writeCNF(`random3sat-${n}v-${m}c-s${seed}.cnf`, nVars, clauses, comments);
  }

  console.log(`\nTotal: 20 benchmark instances in ${BENCH_DIR}/`);
}

// ── CLI ───────────────────────────────────────────────────────────────────

const [, , cmd, ...rest] = process.argv;

switch (cmd) {
  case "generate":
    generateAll();
    break;

  case "factorize": {
    const N = parseInt(rest[0] ?? "0", 10);
    if (!N) { console.error("Usage: benchmarks factorize <N>"); process.exit(1); }
    const { nVars, clauses, comments } = factorizationCNF(N);
    writeCNF(`factorize-${N}.cnf`, nVars, clauses, comments);
    break;
  }

  case "color": {
    const k = parseInt(rest[0] ?? "3", 10);
    const n = parseInt(rest[1] ?? "20", 10);
    const p = parseFloat(rest[2] ?? "0.4");
    const seed = parseInt(rest[3] ?? "42", 10);
    const edges = randomGraph(n, p, seed);
    const { nVars, clauses, comments } = graphColoringCNF(k, edges, n);
    writeCNF(`color${k}-${n}v-${edges.length}e.cnf`, nVars, clauses, comments);
    break;
  }

  case "random": {
    const n = parseInt(rest[0] ?? "100", 10);
    const m = parseInt(rest[1] ?? "427", 10);
    const seed = parseInt(rest[2] ?? "42", 10);
    const { nVars, clauses, comments } = random3SAT(n, m, seed);
    writeCNF(`random3sat-${n}v-${m}c.cnf`, nVars, clauses, comments);
    break;
  }

  default:
    console.log("Usage: npx tsx src/benchmarks.ts [generate|factorize|color|random] [...args]");
}
