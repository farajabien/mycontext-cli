/**
 * TokenCostModel
 *
 * Pricing table for all supported LLM providers and models.
 * Prices are in USD per 1,000,000 tokens (consistent unit).
 *
 * Sources:
 *  - Gemini 3.1: https://ai.google.dev/pricing (March 2026)
 *  - Gemini 2.x: https://ai.google.dev/pricing
 *  - GitHub Models: $0.00001/token flat (all models, as of March 2026)
 *  - OpenRouter: varies by model — use gemini-2.5-flash defaults as fallback
 */

export interface ModelPricing {
  /** USD per 1M input tokens (prompts ≤ 200k tokens) */
  inputPricePerMToken: number;
  /** USD per 1M input tokens (prompts > 200k tokens) — same as inputPrice if no tier */
  inputPricePerMTokenLarge?: number;
  /** USD per 1M output tokens (prompts ≤ 200k tokens) */
  outputPricePerMToken: number;
  /** USD per 1M output tokens (prompts > 200k tokens) — same as outputPrice if no tier */
  outputPricePerMTokenLarge?: number;
}

// ── Gemini 3.1 models ─────────────────────────────────────────────────────

const GEMINI_3_1_PRO_PREVIEW: ModelPricing = {
  inputPricePerMToken: 2.00,
  inputPricePerMTokenLarge: 4.00,
  outputPricePerMToken: 12.00,
  outputPricePerMTokenLarge: 18.00,
};

const GEMINI_3_1_FLASH_LITE_PREVIEW: ModelPricing = {
  inputPricePerMToken: 0.25,
  outputPricePerMToken: 1.50,
};

const GEMINI_3_1_FLASH_IMAGE_PREVIEW: ModelPricing = {
  inputPricePerMToken: 0.50,
  outputPricePerMToken: 3.00,  // text output; image output is $60/1M tokens (billed separately)
};

// ── Gemini 2.x models ─────────────────────────────────────────────────────

const GEMINI_2_5_FLASH: ModelPricing = {
  inputPricePerMToken: 0.15,
  outputPricePerMToken: 0.60,
};

const GEMINI_2_0_FLASH: ModelPricing = {
  inputPricePerMToken: 0.10,
  outputPricePerMToken: 0.40,
};

// ── Gemini 1.5 models ─────────────────────────────────────────────────────

const GEMINI_1_5_PRO: ModelPricing = {
  inputPricePerMToken: 3.50,
  inputPricePerMTokenLarge: 7.00,
  outputPricePerMToken: 10.50,
  outputPricePerMTokenLarge: 21.00,
};

const GEMINI_1_5_FLASH: ModelPricing = {
  inputPricePerMToken: 0.075,
  inputPricePerMTokenLarge: 0.15,
  outputPricePerMToken: 0.30,
  outputPricePerMTokenLarge: 0.60,
};

// ── GitHub Models (flat rate) ─────────────────────────────────────────────

const GITHUB_MODELS_FLAT: ModelPricing = {
  // $0.00001 per token = $10.00 per 1M tokens
  inputPricePerMToken: 10.00,
  outputPricePerMToken: 10.00,
};

const GPT_4O_MINI: ModelPricing = {
  inputPricePerMToken: 0.15,
  outputPricePerMToken: 0.60,
};

// ── Master pricing table ──────────────────────────────────────────────────

export const MODEL_PRICING: Record<string, ModelPricing> = {
  // Gemini 3.1
  "gemini-3.1-pro-preview":            GEMINI_3_1_PRO_PREVIEW,
  "gemini-3.1-flash-lite-preview":     GEMINI_3_1_FLASH_LITE_PREVIEW,
  "gemini-3.1-flash-image-preview":    GEMINI_3_1_FLASH_IMAGE_PREVIEW,

  // Gemini 2.x
  "gemini-2.5-flash":                  GEMINI_2_5_FLASH,
  "gemini-2.0-flash":                  GEMINI_2_0_FLASH,
  "gemini-2.0-flash-exp":              GEMINI_2_0_FLASH,

  // Gemini 1.5
  "gemini-1.5-pro":                    GEMINI_1_5_PRO,
  "gemini-1.5-flash":                  GEMINI_1_5_FLASH,

  // OpenAI / GitHub Models
  "gpt-4o-mini":                       GPT_4O_MINI,
  "gpt-4o-mini (github-models)":       GPT_4O_MINI,
  "github-models":                     GITHUB_MODELS_FLAT,
};

/** Threshold in tokens above which large-context pricing applies */
const LARGE_CONTEXT_THRESHOLD = 200_000;

/**
 * Calculate cost in USD for a single LLM call.
 *
 * @param modelName  The model string returned by the client (used as lookup key)
 * @param inputTokens  Number of prompt/input tokens
 * @param outputTokens  Number of completion/output tokens
 * @returns cost in USD
 */
export function calculateCostUSD(
  modelName: string,
  inputTokens: number,
  outputTokens: number
): number {
  const pricing = findPricing(modelName);
  if (!pricing) return 0;

  const inputPrice =
    inputTokens > LARGE_CONTEXT_THRESHOLD
      ? (pricing.inputPricePerMTokenLarge ?? pricing.inputPricePerMToken)
      : pricing.inputPricePerMToken;

  const outputPrice =
    inputTokens > LARGE_CONTEXT_THRESHOLD
      ? (pricing.outputPricePerMTokenLarge ?? pricing.outputPricePerMToken)
      : pricing.outputPricePerMToken;

  return (inputTokens * inputPrice + outputTokens * outputPrice) / 1_000_000;
}

/**
 * Find pricing for a model name, with fuzzy matching for variant suffixes.
 */
function findPricing(modelName: string): ModelPricing | undefined {
  if (!modelName) return undefined;

  const key = modelName.toLowerCase();

  // Exact match first
  if (MODEL_PRICING[key]) return MODEL_PRICING[key];

  // Prefix match (handles "models/gemini-2.0-flash" SDK format)
  for (const [k, v] of Object.entries(MODEL_PRICING)) {
    if (key.includes(k) || k.includes(key)) return v;
  }

  return undefined;
}

/**
 * Format a USD cost for display, e.g. "$0.000743" or "<$0.00001"
 */
export function formatCostUSD(costUSD: number): string {
  if (costUSD === 0) return "$0.000";
  if (costUSD < 0.00001) return "<$0.00001";
  return `$${costUSD.toFixed(6)}`;
}
