/**
 * Rule Registry — Exports all doctor rules
 */
import { nextjsRules } from "./nextjs-rules";
import { turboRules } from "./turbo-rules";
import { nodeRules } from "./node-rules";
import { deadCodeRules } from "./dead-code-rules";
import type { DoctorRule } from "../types";

export const allRules: DoctorRule[] = [
  ...nextjsRules,
  ...turboRules,
  ...nodeRules,
  ...deadCodeRules,
];

export { nextjsRules, turboRules, nodeRules, deadCodeRules };
