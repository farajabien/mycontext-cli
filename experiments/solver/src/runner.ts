/**
 * runner.ts — CLI entry point for the Structured Reasoning experiment suite
 *
 * Usage:
 *   npx tsx src/runner.ts factorize <N>             # e.g. 589, 9973, 1048583
 *   npx tsx src/runner.ts factorize <N> --refine    # enable refinement loop
 *   npx tsx src/runner.ts password  <target> [--charset az|az09|azAZ09|printable]
 *   npx tsx src/runner.ts benchmark                 # full suite across problem sizes
 *
 * Environment (any one is enough):
 *   GITHUB_TOKEN       — GitHub Models (gpt-4o-mini via Azure inference endpoint)
 *   OPENAI_API_KEY     — OpenAI direct
 *   OPENROUTER_API_KEY — OpenRouter (any model)
 *
 * Env files are loaded automatically from (first match wins):
 *   ./experiments/solver/.env
 *   ./.env  (repo root)
 *
 * NOTE: The password benchmark uses targets YOU supply. Do not use real
 * credentials. The point is to measure search-space complexity, not security.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { config as dotenvConfig } from "dotenv";
import OpenAI from "openai";
import {
  solve,
  factorizationSpec,
  passwordSpec,
  ConstraintSpec,
  SolveResult,
  SolveMetrics,
  RefinementIteration,
  SolverMethod,
} from "./solver.js";

// ---------------------------------------------------------------------------
// Load .env files (experiment dir first, then repo root)
// ---------------------------------------------------------------------------

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EXPERIMENT_ROOT = path.join(__dirname, "..");
const REPO_ROOT = path.join(EXPERIMENT_ROOT, "..", "..");

for (const candidate of [
  path.join(EXPERIMENT_ROOT, ".env"),
  path.join(REPO_ROOT, ".env.local"),
  path.join(REPO_ROOT, ".env"),
]) {
  if (fs.existsSync(candidate)) {
    dotenvConfig({ path: candidate, override: false });
  }
}

// ---------------------------------------------------------------------------
// LLM client — priority: GITHUB_TOKEN → OPENAI_API_KEY → OPENROUTER_API_KEY → GEMINI
// ---------------------------------------------------------------------------

// GitHub Models pricing: $0.00001 per token unit (as of 2025)
// https://docs.github.com/en/github-models/about-github-models
const GITHUB_MODELS_COST_PER_TOKEN = 0.00001;

function tokenCost(tokens: number, providerLabel: string): string {
  if (!providerLabel.startsWith("GitHub Models") || tokens === 0) return "";
  const cost = tokens * GITHUB_MODELS_COST_PER_TOKEN;
  return ` ($${cost.toFixed(5)})`;
}

interface LLMClient {
  chat: (systemPrompt: string, userMsg: string) => Promise<{ text: string; tokens: number }>;
  isAvailable: boolean;
  providerLabel: string;
}

function buildLLMClient(): LLMClient {
  const githubToken   = process.env["GITHUB_TOKEN"];
  const openaiKey     = process.env["OPENAI_API_KEY"];
  const openrouterKey = process.env["OPENROUTER_API_KEY"];
  const geminiKey     = process.env["GEMINI_API_KEY"];

  let client: OpenAI | null = null;
  let model = "gpt-4o-mini";
  let providerLabel = "none";

  if (githubToken) {
    // GitHub Models — OpenAI-compatible, Azure inference endpoint
    client = new OpenAI({
      apiKey: githubToken,
      baseURL: "https://models.inference.ai.azure.com",
    });
    model = "gpt-4o-mini";
    providerLabel = "GitHub Models (gpt-4o-mini)";
  } else if (openaiKey) {
    client = new OpenAI({ apiKey: openaiKey });
    model = "gpt-4o-mini";
    providerLabel = "OpenAI (gpt-4o-mini)";
  } else if (openrouterKey) {
    client = new OpenAI({ apiKey: openrouterKey, baseURL: "https://openrouter.ai/api/v1" });
    model = "openai/gpt-4o-mini";
    providerLabel = "OpenRouter (gpt-4o-mini)";
  } else if (geminiKey) {
    client = new OpenAI({
      apiKey: geminiKey,
      baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
    });
    model = "gemini-2.5-flash";
    providerLabel = "Gemini (gemini-2.5-flash)";
  }

  if (!client) {
    return {
      isAvailable: false,
      providerLabel: "none",
      chat: async () => { throw new Error("No LLM API key configured"); },
    };
  }

  const c = client;
  const m = model;
  return {
    isAvailable: true,
    providerLabel,
    chat: async (systemPrompt: string, userMsg: string) => {
      const res = await c.chat.completions.create({
        model: m,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user",   content: userMsg },
        ],
        temperature: 0.1,
        max_tokens: 512,
      });
      const tokens = res.usage?.total_tokens ?? 0;
      const text = res.choices[0]?.message?.content ?? "";
      return { text, tokens };
    },
  };
}

// ---------------------------------------------------------------------------
// LLM domain narrowing (used by the refinement loop)
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `You are a constraint programming expert helping to narrow search domains.
You will be given a constraint satisfaction problem and will return a JSON object
mapping each variable name to a small array of candidate integer values most likely
to contain the solution. Return ONLY valid JSON, nothing else.`;

async function llmNarrowDomains(
  spec: ConstraintSpec,
  previousTrace: string,
  llm: LLMClient
): Promise<{ domains: Map<string, number[]>; tokens: number }> {
  const userMsg = `PROBLEM:
${JSON.stringify({ description: spec.description, constraints: spec.constraints.map(c => c.expr) }, null, 2)}

PREVIOUS SEARCH TRACE (summary):
${previousTrace}

Narrow the domains. Return JSON like:
{"a": [17, 19, 23], "b": [23, 29, 31]}

Think about what values are mathematically likely given the constraints, then return JSON:`;

  try {
    const { text, tokens } = await llm.chat(SYSTEM_PROMPT, userMsg);
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return { domains: new Map(), tokens };

    const parsed = JSON.parse(jsonMatch[0]) as Record<string, number[]>;
    const result = new Map<string, number[]>();
    for (const [k, v] of Object.entries(parsed)) {
      if (Array.isArray(v) && v.every(x => typeof x === "number")) {
        result.set(k, v);
      }
    }
    return { domains: result, tokens };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("401") || msg.includes("credentials") || msg.includes("unauthorized")) {
      print(`  [llm] ${llm.providerLabel} auth failed (${msg.slice(0, 60)}) — falling back to Gemini`);
      const geminiKey = process.env["GEMINI_API_KEY"];
      if (geminiKey) {
        const OpenAI = (await import("openai")).default;
        const fallback = new OpenAI({ apiKey: geminiKey, baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/" });
        try {
          const res = await fallback.chat.completions.create({
            model: "gemini-2.5-flash",
            messages: [{ role: "system", content: SYSTEM_PROMPT }, { role: "user", content: userMsg }],
            temperature: 0.1, max_tokens: 512,
          });
          const tokens = res.usage?.total_tokens ?? 0;
          const text = res.choices[0]?.message?.content ?? "";
          const jsonMatch = text.match(/\{[\s\S]*\}/);
          if (!jsonMatch) return { domains: new Map(), tokens };
          const parsed = JSON.parse(jsonMatch[0]) as Record<string, number[]>;
          const result = new Map<string, number[]>();
          for (const [k, v] of Object.entries(parsed)) {
            if (Array.isArray(v) && v.every(x => typeof x === "number")) result.set(k, v);
          }
          print(`  [llm] Gemini fallback succeeded (${tokens} tokens)`);
          return { domains: result, tokens };
        } catch (fe) {
          print(`  [llm] Gemini fallback also failed: ${fe instanceof Error ? fe.message : fe}`);
        }
      }
    } else {
      print(`  [llm error] ${msg}`);
    }
    return { domains: new Map(), tokens: 0 };
  }
}

// ---------------------------------------------------------------------------
// Refinement loop
// ---------------------------------------------------------------------------

async function runRefinementLoop(
  spec: ConstraintSpec,
  llm: LLMClient,
  maxLoops = 4
): Promise<RefinementIteration[]> {
  const iterations: RefinementIteration[] = [];

  // Loop 1: brute-force baseline
  const bf = solve(spec, "brute-force", false);
  iterations.push({ loopIndex: 1, method: "brute-force", metrics: bf.metrics, solution: bf.solutions[0] });
  print(`  Loop 1 [brute-force]: explored ${bf.metrics.exploredCount.toLocaleString()} candidates in ${bf.metrics.runtimeMs}ms`);

  if (!llm.isAvailable) {
    print("  (LLM not configured — skipping refinement loops 2+)");
    return iterations;
  }

  // Loop 2+: constraint propagation with LLM-narrowed domains
  let prevResult = bf;
  for (let loop = 2; loop <= maxLoops; loop++) {
    const traceSnapshot = buildTraceSummary(prevResult);
    const { domains: llmDomains, tokens } = await llmNarrowDomains(spec, traceSnapshot, llm);

    const hint = llmDomains.size > 0
      ? Object.fromEntries(llmDomains.entries())
      : null;

    const result = solve(spec, "llm-guided", false, llmDomains, tokens, 1);
    iterations.push({
      loopIndex: loop,
      method: "llm-guided",
      metrics: result.metrics,
      solution: result.solutions[0],
      llmHint: hint ? JSON.stringify(hint) : undefined,
    });

    print(
      `  Loop ${loop} [llm-guided]: explored ${result.metrics.exploredCount.toLocaleString()} candidates` +
      ` in ${result.metrics.runtimeMs}ms, LLM tokens: ${tokens}${tokenCost(tokens, llm.providerLabel)}` +
      (hint ? `, hint: ${JSON.stringify(hint)}` : "")
    );

    // Stop if we've already hit 1 operation (can't improve further)
    if (result.metrics.exploredCount <= 1) break;
    prevResult = result;
  }

  return iterations;
}

function buildTraceSummary(result: SolveResult): string {
  const failed = result.trace.filter(s => !s.passed).slice(0, 5);
  const passed = result.trace.filter(s => s.passed).slice(0, 2);
  return [
    `Explored ${result.metrics.exploredCount} candidates, found ${result.solutions.length} solution(s).`,
    `Search space size: ${result.metrics.searchSpaceSize}`,
    failed.length > 0 ? `Failed examples: ${failed.map(s => JSON.stringify(s.candidate)).join(", ")}` : "",
    passed.length > 0 ? `Passing: ${passed.map(s => JSON.stringify(s.candidate)).join(", ")}` : "",
  ].filter(Boolean).join("\n");
}

// ---------------------------------------------------------------------------
// Output helpers
// ---------------------------------------------------------------------------

const COL_W = [26, 10, 13, 14, 11, 12];

function pad(s: string, w: number): string { return s.slice(0, w).padEnd(w); }

function printTableHeader() {
  const headers = ["Method", "Time (ms)", "Operations", "Space Size", "Reduction", "LLM Tokens"];
  const sep = COL_W.map(w => "-".repeat(w)).join("+");
  print(sep);
  print(headers.map((h, i) => pad(h, COL_W[i]!)).join("|"));
  print(sep);
}

function printTableRow(metrics: SolveMetrics, label?: string) {
  const m = metrics;
  const name = label ?? m.method;
  const cols = [
    name,
    `${m.runtimeMs}`,
    `${m.exploredCount.toLocaleString()}`,
    `${m.originalSearchSpaceSize.toLocaleString()}`,
    `${(m.reductionRatio * 100).toFixed(1)}%`,
    `${m.llmTokensUsed}`,
  ];
  print(cols.map((c, i) => pad(c, COL_W[i]!)).join("|"));
}

function printTableFooter() {
  print(COL_W.map(w => "-".repeat(w)).join("+"));
}

function print(s = "") { process.stdout.write(s + "\n"); }

// ---------------------------------------------------------------------------
// CSV export
// ---------------------------------------------------------------------------

const RESULTS_DIR = path.join(EXPERIMENT_ROOT, "results");

function ensureResultsDir() {
  if (!fs.existsSync(RESULTS_DIR)) fs.mkdirSync(RESULTS_DIR, { recursive: true });
}

function saveCSV(name: string, rows: SolveMetrics[]) {
  ensureResultsDir();
  const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const file = path.join(RESULTS_DIR, `${name}-${ts}.csv`);
  const headers = "method,originalSearchSpaceSize,searchSpaceSize,exploredCount,prunedCount,reductionRatio,runtimeMs,llmTokensUsed,llmCallCount";
  const lines = rows.map(r =>
    [r.method, r.originalSearchSpaceSize, r.searchSpaceSize, r.exploredCount, r.prunedCount,
      r.reductionRatio.toFixed(6), r.runtimeMs, r.llmTokensUsed, r.llmCallCount].join(",")
  );
  fs.writeFileSync(file, [headers, ...lines].join("\n"));
  return file;
}

function saveRefinementCSV(name: string, iterations: RefinementIteration[], providerLabel: string) {
  ensureResultsDir();
  const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const file = path.join(RESULTS_DIR, `${name}-refine-${ts}.csv`);
  const isGitHub = providerLabel.startsWith("GitHub Models");
  const headers = "loop,method,exploredCount,searchSpaceSize,reductionRatio,runtimeMs,llmTokensUsed,cumulativeTokens,costUSD,cumulativeCostUSD,solution";
  let cumTokens = 0;
  const lines = iterations.map(it => {
    cumTokens += it.metrics.llmTokensUsed;
    const cost = isGitHub ? (it.metrics.llmTokensUsed * GITHUB_MODELS_COST_PER_TOKEN).toFixed(6) : "n/a";
    const cumCost = isGitHub ? (cumTokens * GITHUB_MODELS_COST_PER_TOKEN).toFixed(6) : "n/a";
    return [
      it.loopIndex, it.method,
      it.metrics.exploredCount, it.metrics.searchSpaceSize,
      it.metrics.reductionRatio.toFixed(6),
      it.metrics.runtimeMs, it.metrics.llmTokensUsed, cumTokens, cost, cumCost,
      it.solution ? JSON.stringify(it.solution) : "none",
    ].join(",");
  });
  fs.writeFileSync(file, [headers, ...lines].join("\n"));
  return file;
}

// ---------------------------------------------------------------------------
// Command: factorize
// ---------------------------------------------------------------------------

async function cmdFactorize(args: string[]) {
  const N = parseInt(args[0] ?? "0");
  if (!N || N < 4) { print("Usage: factorize <N>  (N must be >= 4)"); process.exit(1); }
  const refine = args.includes("--refine");

  print(`\n${"=".repeat(64)}`);
  print(`  FACTORIZATION BENCHMARK   N = ${N}`);
  print(`${"=".repeat(64)}`);

  const spec = factorizationSpec(N);
  print(`  Variables  : ${spec.variables.map(v => `${v.name} ∈ ${JSON.stringify(v.domain)}`).join(", ")}`);
  print(`  Constraints: ${spec.constraints.map(c => c.expr).join("  |  ")}`);
  print(`  Brute-force search space: floor(√${N}) = ${Math.floor(Math.sqrt(N))} candidates\n`);

  const methods: SolverMethod[] = ["brute-force", "constraint-propagation"];
  const llm = buildLLMClient();
  if (llm.isAvailable) {
    print(`  [llm] Provider: ${llm.providerLabel}\n`);
    methods.push("llm-guided");
  } else {
    print("  [info] No LLM key found — skipping llm-guided method\n");
  }

  const allMetrics: SolveMetrics[] = [];
  printTableHeader();

  for (const method of methods) {
    const result = solve(spec, method, true);
    allMetrics.push(result.metrics);
    printTableRow(result.metrics);
    if (result.solutions.length > 0) {
      const s = result.solutions[0]!;
      const a = s["a"]!;
      const b = N / a;
      print(`  → solution: a=${a}, b=${b} (verify: ${a}×${b} = ${a * b})`);
    }
  }
  printTableFooter();

  if (refine) {
    print(`\n--- REFINEMENT LOOP ---`);
    const iterations = await runRefinementLoop(spec, llm);
    const rFile = saveRefinementCSV(`factorize-${N}`, iterations, llm.providerLabel);
    const totalTokens = iterations.reduce((a, i) => a + i.metrics.llmTokensUsed, 0);
    print(`  Refinement log: ${rFile}`);
    print(`  Total LLM tokens: ${totalTokens}${tokenCost(totalTokens, llm.providerLabel)}`);
  }

  const csvFile = saveCSV(`factorize-${N}`, allMetrics);
  print(`\n  Results saved to: ${csvFile}\n`);
}

// ---------------------------------------------------------------------------
// Command: password
// ---------------------------------------------------------------------------

async function cmdPassword(args: string[]) {
  const target = args[0];
  if (!target) { print("Usage: password <target> [--charset az|az09|azAZ09|printable] [--refine]"); process.exit(1); }

  const charsetIdx = args.indexOf("--charset");
  const charsetKey = charsetIdx !== -1 ? (args[charsetIdx + 1] ?? "az09") : "az09";
  const refine = args.includes("--refine");

  print(`\n${"=".repeat(64)}`);
  print(`  PASSWORD SEARCH BENCHMARK`);
  print(`  Target length : ${target.length} chars  |  Charset: ${charsetKey}`);
  print(`  NOTE: This benchmarks search complexity on a target you set.`);
  print(`        Do not use real credentials.`);
  print(`${"=".repeat(64)}`);

  let spec: ConstraintSpec;
  try { spec = passwordSpec(target, charsetKey); }
  catch (e) { print(`Error: ${(e as Error).message}`); process.exit(1); }

  const input = spec.input as { spaceSize: number; charsetSize: number };
  print(`  Search space: ${input.charsetSize}^${target.length} = ${input.spaceSize.toExponential(3)} candidates\n`);

  const llm = buildLLMClient();
  if (llm.isAvailable) {
    print(`  [llm] Provider: ${llm.providerLabel}\n`);
  } else {
    print("  [info] No LLM key — skipping llm-guided method\n");
  }

  const methods: SolverMethod[] = ["brute-force", "constraint-propagation"];
  if (llm.isAvailable) methods.push("llm-guided");

  const allMetrics: SolveMetrics[] = [];
  printTableHeader();

  for (const method of methods) {
    const result = solve(spec, method, false);
    allMetrics.push(result.metrics);
    printTableRow(result.metrics);
  }
  printTableFooter();

  print(`\n  Key insight (password):`);
  print(`  - Brute force: must try up to ${input.spaceSize.toExponential(3)} candidates`);
  print(`  - Constraint propagation: each char is a unary constraint → O(L) where L=${target.length}`);
  print(`  - LLM-guided: narrows by pattern — effective on predictable passwords, not random ones`);

  if (refine) {
    print(`\n--- REFINEMENT LOOP ---`);
    const iterations = await runRefinementLoop(spec, llm);
    const rFile = saveRefinementCSV(`password-len${target.length}`, iterations, llm.providerLabel);
    const totalTokens = iterations.reduce((a, i) => a + i.metrics.llmTokensUsed, 0);
    print(`  Refinement log: ${rFile}`);
    print(`  Total LLM tokens: ${totalTokens}${tokenCost(totalTokens, llm.providerLabel)}`);
  }

  const csvFile = saveCSV(`password-len${target.length}-${charsetKey}`, allMetrics);
  print(`\n  Results saved to: ${csvFile}\n`);
}

// ---------------------------------------------------------------------------
// Command: benchmark — scaling test across problem sizes (Phase 5)
// ---------------------------------------------------------------------------

async function cmdBenchmark() {
  print(`\n${"=".repeat(64)}`);
  print(`  SCALING BENCHMARK — Phase 5 of Research Plan`);
  print(`  Testing factorization for increasing bit sizes`);
  print(`${"=".repeat(64)}\n`);

  // Verified semiprimes with known factors
  const testCases: Array<{ N: number; bits: number; label: string }> = [
    { N: 77,            bits: 7,  label: "7×11" },
    { N: 589,           bits: 10, label: "19×31" },
    { N: 9797,          bits: 14, label: "97×101" },
    { N: 1_022_117,     bits: 20, label: "1009×1013" },
    { N: 16_016_003,    bits: 24, label: "4001×4003" },
    { N: 1_024_384_027, bits: 30, label: "32003×32009" },
  ];

  print("bits | N              | bf-ops  | cp-ops | bf-ms  | cp-ms  | cp-reduction (vs original)");
  print("-".repeat(80));

  for (const tc of testCases) {
    const spec = factorizationSpec(tc.N);
    const bf = solve(spec, "brute-force", false);
    const cp = solve(spec, "constraint-propagation", false);

    const bfOps = bf.metrics.exploredCount.toString().padStart(7);
    const cpOps = cp.metrics.exploredCount.toString().padStart(6);
    const bfMs  = bf.metrics.runtimeMs.toString().padStart(6);
    const cpMs  = cp.metrics.runtimeMs.toString().padStart(6);
    const cpRed = `${(cp.metrics.reductionRatio * 100).toFixed(1)}%`.padStart(9);

    print(`${tc.bits.toString().padStart(4)} | ${tc.N.toString().padStart(14)} | ${bfOps} | ${cpOps} | ${bfMs} | ${cpMs} | ${cpRed}  (${tc.label})`);
  }

  print("\n  CSV files saved per case:");
  const allRows: SolveMetrics[] = [];
  for (const tc of testCases) {
    const spec = factorizationSpec(tc.N);
    const bf = solve(spec, "brute-force", true);
    const cp = solve(spec, "constraint-propagation", true);
    allRows.push(bf.metrics, cp.metrics);
  }
  const csvFile = saveCSV("benchmark-factorize-scaling", allRows);
  print(`  ${csvFile}\n`);
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

const argv = process.argv.slice(2);
const cmd = argv[0];
const rest = argv.slice(1);

if (cmd === "factorize") {
  await cmdFactorize(rest);
} else if (cmd === "password") {
  await cmdPassword(rest);
} else if (cmd === "benchmark") {
  await cmdBenchmark();
} else {
  print(`
Structured Reasoning Experiment Runner
=======================================
Commands:
  factorize <N> [--refine]
      Compare brute-force, constraint-propagation, and LLM-guided methods
      on factoring N. --refine enables the self-improvement loop.

  password <target> [--charset az|az09|azAZ09|printable] [--refine]
      Benchmark search strategies on finding a known target password.
      Target is a string YOU set — not for attacking real credentials.

  benchmark
      Run the Phase 5 scaling test across 7-bit to 24-bit semiprimes.

Environment:
  OPENAI_API_KEY / OPENROUTER_API_KEY  — enables LLM-guided methods

Examples:
  npx tsx src/runner.ts factorize 589
  npx tsx src/runner.ts factorize 589 --refine
  npx tsx src/runner.ts password abc123 --charset az09
  npx tsx src/runner.ts benchmark
`);
}
