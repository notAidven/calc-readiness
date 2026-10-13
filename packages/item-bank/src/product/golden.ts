import type { D1AnswerDefinition } from "@cr/components";

import { cg1_golden } from "./nodes/CG.1";
import { el1_golden } from "./nodes/EL.1";
import { el6_golden } from "./nodes/EL.6";
import { exp1_golden } from "./nodes/EXP.1";
import { fun1_golden } from "./nodes/FUN.1";
import { lf1_golden } from "./nodes/LF.1";
import { lin1_golden } from "./nodes/LIN.1";
import { lin5_golden } from "./nodes/LIN.5";
import { lin6_golden } from "./nodes/LIN.6";
import { pol1_golden } from "./nodes/POL.1";
import { pol2_golden } from "./nodes/POL.2";
import { rad1_golden } from "./nodes/RAD.1";
import { rad2_golden } from "./nodes/RAD.2";
import { rad3_golden } from "./nodes/RAD.3";
import { rad4_golden } from "./nodes/RAD.4";
import { rat1_golden } from "./nodes/RAT.1";
import { trg1_golden } from "./nodes/TRG.1";
import { trg2_golden } from "./nodes/TRG.2";

/**
 * Hand-authored, human-reviewed prompt<->answer anchors for the Phase-2 product (v2)
 * spine nodes — the correctness net templates cannot give (a template guarantees a
 * key is self-consistent, not that it is the RIGHT answer to the prompt). Each
 * fixture pins a fixed prompt, the key + equivalent `alternate_valid` forms that
 * MUST grade correct, and reason-coded `near_miss` wrong answers that MUST grade
 * incorrect with EXACTLY the noted reason code (the specific misconception each item
 * is meant to catch). Run through the real v2 checker in Node AND Chromium
 * (`product-golden.test.ts`, `product-golden.browser.test.ts`) for §13.7 parity.
 */
export interface ProductGoldenFixture {
  item_version_id: string;
  node_id: string;
  prompt: string;
  answer: D1AnswerDefinition;
  /** The canonical key/raw answer — must grade `correct`. */
  valid: unknown;
  /** Equivalent representations of the key — must also grade `correct`. */
  alternate_valid: readonly unknown[];
  /** Plausible wrong answers — must grade `incorrect` with the noted reason code. */
  near_miss: readonly { answer: unknown; reason: string }[];
}

/**
 * Golden fixtures for the product nodes. Each node's fixtures live under
 * `nodes/<NODE>/`; this file AGGREGATES them in the same node order as
 * `PRODUCT_TEMPLATES` (and thus the order the golden suites expect).
 *
 * LIN.5, LIN.6 and EL.6 are appended AFTER the spine block and have no entry in
 * `PRODUCT_TEMPLATES`: they are post-MVP `target` nodes, so they are not served by the
 * frozen pre/post walk, and their fixtures are here purely as the executable evidence
 * that their answer shapes grade on cleared categories (`Content_Authoring_Split.md`
 * §4.4). Keeping them in this one list is deliberate — it is the list both golden suites
 * grade through the real v2 checker in Node AND Chromium, so the evidence gets the same
 * cross-runtime treatment as every other category's.
 */
export const PRODUCT_GOLDEN_FIXTURES: readonly ProductGoldenFixture[] = [
  ...lin1_golden,
  ...pol1_golden,
  ...pol2_golden,
  ...rat1_golden,
  ...cg1_golden,
  ...fun1_golden,
  ...lf1_golden,
  ...rad1_golden,
  ...el1_golden,
  ...exp1_golden,
  ...trg1_golden,
  ...trg2_golden,
  ...rad2_golden,
  ...rad3_golden,
  ...rad4_golden,
  ...lin5_golden,
  ...lin6_golden,
  ...el6_golden,
];
