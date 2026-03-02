/**
 * Rule Registry — Exports all doctor rules
 */
import { nextjsRules } from "./nextjs-rules";
import { turboRules } from "./turbo-rules";
import { nodeRules } from "./node-rules";
import { deadCodeRules } from "./dead-code-rules";
import { typescriptRules } from "./typescript-rules";
import { instantdbRules } from "./instantdb-rules";
import { securityRules } from "./security-rules";
import type { DoctorRule } from "../types";

export const allRules: DoctorRule[] = [
  ...nextjsRules,
  ...turboRules,
  ...nodeRules,
  ...deadCodeRules,
  ...typescriptRules,
  ...instantdbRules,
  ...securityRules,
];

export { nextjsRules, turboRules, nodeRules, deadCodeRules, typescriptRules, instantdbRules, securityRules };
