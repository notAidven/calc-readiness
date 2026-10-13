import type { D1AnswerDefinition, D1NodeId } from "@cr/components";

import { num2_golden } from "./nodes/NUM.2";
import { num3_golden } from "./nodes/NUM.3";
import { num4_golden } from "./nodes/NUM.4";
import { num5_golden } from "./nodes/NUM.5";
import { numF_golden } from "./nodes/NUM.F";
import { numS_golden } from "./nodes/NUM.S";

/**
 * A hand-authored, human-reviewed prompt↔answer anchor. Templates guarantee a key
 * is self-consistent (it grades correct under its own spec), but NOT that the key
 * is the right answer to the prompt — a template could compute a self-consistent
 * but wrong key. Golden fixtures close that gap: a fixed prompt with the values
 * that MUST grade correct (`valid` = the key; `alternate_valid` = equivalent forms
 * the checker must also accept) and the plausible wrong answers that MUST grade
 * incorrect (`near_miss` = order-of-operations slips, sign errors, unsimplified
 * forms). Exercised in `golden.test.ts` against the real D1 checker.
 */
export interface GoldenFixture {
  item_version_id: string;
  node_id: D1NodeId;
  prompt: string;
  answer: D1AnswerDefinition;
  /** The canonical key — must grade `correct`. */
  valid: unknown;
  /** Equivalent representations of the key — must also grade `correct`. */
  alternate_valid: readonly unknown[];
  /** Plausible wrong answers — must grade `incorrect`. */
  near_miss: readonly unknown[];
}

/**
 * Golden fixtures covering every D1 node (2 per node). Concrete numbers, chosen so
 * the near-misses encode the exact mistakes the item is meant to catch. Each node's
 * fixtures live under `nodes/<NODE>/`; this file AGGREGATES them in node order.
 */
export const D1_GOLDEN_FIXTURES: readonly GoldenFixture[] = [
  ...numS_golden,
  ...numF_golden,
  ...num2_golden,
  ...num3_golden,
  ...num4_golden,
  ...num5_golden,
];
