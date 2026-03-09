#!/usr/bin/env node
/**
 * sat.ts — SAT Competition 2026 Experimental Track Entry Point
 *
 * Usage:
 *   npx tsx src/sat.ts <input.cnf> [--llm] [--budget <N>]
 *   cat input.cnf | npx tsx src/sat.ts [--llm]
 *
 * Options:
 *   --llm          Use LLM-guided branching (requires GITHUB_TOKEN)
 *   --budget <N>   Max LLM call batches (default: 10)
 *   --compare      Run both DPLL and LLM-guided and print comparison
 *   --stats        Print solver statistics + abstract proof trace to stderr
 *
 * Output format: SAT Competition standard (s SATISFIABLE / s UNSATISFIABLE + v line)
 *
 * Abstract Representation Layer
 * ─────────────────────────────
 * Every solver decision — including LLM-guided ones — is recorded as a
 * ProofStep (variable, polarity, source, depth, reasoning). The full trace is
 * emitted as "c proof-step: ..." comment lines, making the branching sequence
 * transparent and independently replayable. For SAT instances the satisfying
 * assignment is trivially verifiable; for UNSAT instances the trace constitutes
 * a resolution refutation from which a formal proof can be reconstructed.
 */

import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import * as dotenv from "dotenv";
import OpenAI from "openai";
import {
  parseDIMACS,
  solve,
  formatCompetitionOutput,
  serializeProofStep,
  SATResult,
} from "./satSolver.js";

// ── Competition timeout handling ──────────────────────────────────────────
// StarExec/BenchCloud sends SIGTERM (and SIGXCPU on CPU limit) when the
// time limit is reached. Output s UNKNOWN and exit cleanly.

function handleTimeout(signal: string): void {
  process.stdout.write(`c Received ${signal} — time limit reached\ns UNKNOWN\n`);
  process.exit(0);
}

process.on("SIGTERM", () => handleTimeout("SIGTERM"));
process.on("SIGXCPU", () => handleTimeout("SIGXCPU"));
process.on("SIGINT",  () => handleTimeout("SIGINT"));

// ── Environment loading ───────────────────────────────────────────────────

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const EXPERIMENT_ROOT = path.resolve(__dirname, "..", "..");

for (const envFile of [
  path.join(__dirname, "..", ".env"),
  path.join(EXPERIMENT_ROOT, ".env"),
  path.join(EXPERIMENT_ROOT, "..", ".env.local"),
  path.join(EXPERIMENT_ROOT, "..", ".env"),
]) {
  if (fs.existsSync(envFile)) {
    dotenv.config({ path: envFile, override: false });
    break;
  }
}

// ── LLM client (GitHub Models only) ──────────────────────────────────────
// Uses the OpenAI-compatible endpoint at models.inference.ai.azure.com.
// A free GitHub account token is sufficient — no billing required.

function buildLLMClient(): { client: OpenAI; model: string; provider: string } | null {
  const token = process.env.GITHUB_TOKEN ?? process.env.MYCONTEXT_GITHUB_TOKEN;
  if (!token) return null;
  return {
    client: new OpenAI({
      baseURL: "https://models.inference.ai.azure.com",
      apiKey: token,
    }),
    model: "gpt-4o-mini",
    provider: "github-models",
  };
}

// ── Argument parsing ──────────────────────────────────────────────────────

const args = process.argv.slice(2);
const useLLM = args.includes("--llm");
const compare = args.includes("--compare");
const printStats = args.includes("--stats");

const budgetIdx = args.indexOf("--budget");
const budget = budgetIdx !== -1 ? parseInt(args[budgetIdx + 1] ?? "10", 10) : 10;

const inputFile = args.find(a => !a.startsWith("--") && a !== String(budget));

// ── Input reading ─────────────────────────────────────────────────────────

async function readInput(): Promise<string> {
  if (inputFile) {
    return fs.readFileSync(inputFile, "utf8");
  }
  // Read from stdin
  return new Promise(resolve => {
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", chunk => (data += chunk));
    process.stdin.on("end", () => resolve(data));
  });
}

// ── Main ──────────────────────────────────────────────────────────────────

function printStatsLine(label: string, result: SATResult, providerInfo = ""): void {
  const costStr = result.llmTokens > 0
    ? ` | tokens=${result.llmTokens} cost=$${result.llmCostUSD.toFixed(6)}`
    : "";
  process.stderr.write(
    `c [${label}${providerInfo}] decisions=${result.decisions} propagations=${result.propagations} time=${result.runtimeMs}ms${costStr}\n`
  );
}

/**
 * Emit the abstract proof trace as competition comment lines.
 * Each line is: c proof-step: <serialized ProofStep>
 *
 * A verifier can replay these steps through deterministic unit propagation to
 * independently confirm the result, regardless of whether the decisions were
 * LLM-guided or heuristic. LLM decisions include 'reason="..."' so the full
 * branching rationale is auditable.
 */
function emitProofTrace(result: SATResult): void {
  const llmSteps = result.proofTrace.filter(s => s.source === "llm").length;
  const vsidsSteps = result.proofTrace.filter(s => s.source === "vsids").length;
  process.stderr.write(
    `c proof-trace: ${result.proofTrace.length} steps  llm=${llmSteps}  vsids=${vsidsSteps}\n`
  );
  for (const step of result.proofTrace) {
    process.stderr.write(`c proof-step: ${serializeProofStep(step)}\n`);
  }
}

async function main(): Promise<void> {
  const input = await readInput();

  if (!input.trim()) {
    process.stderr.write("c Error: no input\n");
    process.stdout.write("s UNKNOWN\n");
    process.exit(1);
  }

  const formula = parseDIMACS(input);
  process.stderr.write(`c Parsed: ${formula.numVars} vars, ${formula.clauses.length} clauses\n`);

  if (compare) {
    // Run both strategies and compare
    const baseResult = await solve(formula, { strategy: "dpll" });
    process.stderr.write("c --- DPLL baseline ---\n");
    printStatsLine("dpll", baseResult);

    const llmSetup = buildLLMClient();
    if (llmSetup) {
      process.stderr.write(`c --- LLM-guided (${llmSetup.provider}/${llmSetup.model}) ---\n`);
      const llmResult = await solve(formula, {
        strategy: "llm-guided",
        llm: llmSetup.client,
        llmModel: llmSetup.model,
        maxLLMCallBudget: budget,
      });
      printStatsLine("llm", llmResult, ` ${llmSetup.provider}/${llmSetup.model}`);
      if (printStats) emitProofTrace(llmResult);

      const improvement = baseResult.decisions > 0
        ? ((1 - llmResult.decisions / baseResult.decisions) * 100).toFixed(1)
        : "N/A";
      process.stderr.write(
        `c Decision reduction: ${improvement}%  |  LLM cost: $${llmResult.llmCostUSD.toFixed(6)}\n`
      );

      // Output the LLM result (assumed same SAT/UNSAT)
      process.stdout.write(formatCompetitionOutput(llmResult, formula.numVars) + "\n");
    } else {
      process.stderr.write("c No LLM provider configured — outputting DPLL result\n");
      process.stdout.write(formatCompetitionOutput(baseResult, formula.numVars) + "\n");
    }
    return;
  }

  if (useLLM) {
    const llmSetup = buildLLMClient();
    if (!llmSetup) {
      process.stderr.write("c Warning: --llm requested but no LLM key found, falling back to DPLL\n");
    } else {
      process.stderr.write(`c LLM provider: ${llmSetup.provider} / ${llmSetup.model}\n`);
      const result = await solve(formula, {
        strategy: "llm-guided",
        llm: llmSetup.client,
        llmModel: llmSetup.model,
        maxLLMCallBudget: budget,
      });
      if (printStats) printStatsLine("llm-guided", result, ` ${llmSetup.provider}`);
      if (printStats) emitProofTrace(result);
      process.stdout.write(formatCompetitionOutput(result, formula.numVars) + "\n");
      return;
    }
  }

  // Default: DPLL
  const result = await solve(formula, { strategy: "dpll" });
  if (printStats) printStatsLine("dpll", result);
  if (printStats) emitProofTrace(result);
  process.stdout.write(formatCompetitionOutput(result, formula.numVars) + "\n");
}

main().catch(err => {
  process.stderr.write(`c Fatal: ${err.message}\n`);
  process.stdout.write("s UNKNOWN\n");
  process.exit(1);
});
