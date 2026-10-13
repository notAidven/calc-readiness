import type { ItemTemplate } from "../template";
import { num2_l2, num2_l3 } from "./nodes/NUM.2";
import { num3_l1, num3_l2 } from "./nodes/NUM.3";
import { num4_l2, num4_l3 } from "./nodes/NUM.4";
import { num5_l2, num5_l3 } from "./nodes/NUM.5";
import { numF_l1, numF_l2 } from "./nodes/NUM.F";
import { numS_l1, numS_l2 } from "./nodes/NUM.S";

/**
 * Parameterized D1 templates — the authoring unit. One template per (node,
 * difficulty) cell the multistage spec serves: routing L2 on every node, up L3
 * on NUM.2/4/5, down L1 on the roots (NUM.S/F/3). Keys are computed from the
 * drawn params by real arithmetic, so they are correct by construction; the
 * `validateTemplates` harness samples instances and confirms each grades correct.
 *
 * NUM.3 (field properties) and NUM.4 (evaluate & simplify) are genuine algebraic
 * EXPRESSION items over `x` (not arithmetic): NUM.3 asks the student to expand a
 * distributive product, NUM.4 to combine like terms. Both grade with
 * "combined_polynomial", so a student must produce the expanded/combined form.
 *
 * The per-cell generators now live under `nodes/<NODE>/`; this file only
 * AGGREGATES them, preserving the exact order that pins the frozen assessment
 * forms (`freezeParallelForms` seeds each item by its index here — see
 * `template.test.ts`). The order groups the down-stage L1s, the routing-stage
 * L2s, then the up-stage L3s.
 */
export const D1_TEMPLATES: readonly ItemTemplate[] = [
  // ---- down stage: L1 on root nodes ----
  numS_l1,
  numF_l1,
  num3_l1,
  // ---- routing stage: L2 on every node ----
  numS_l2,
  numF_l2,
  num2_l2,
  num3_l2,
  num4_l2,
  num5_l2,
  // ---- up stage: L3 on higher-tier nodes ----
  num2_l3,
  num4_l3,
  num5_l3,
];
