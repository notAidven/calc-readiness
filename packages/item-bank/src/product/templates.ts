import type { ItemTemplate } from "../template";
import { cg1_template } from "./nodes/CG.1";
import { el1_template } from "./nodes/EL.1";
import { exp1_template } from "./nodes/EXP.1";
import { fun1_template } from "./nodes/FUN.1";
import { lf1_template } from "./nodes/LF.1";
import { lin1_template } from "./nodes/LIN.1";
import { pol1_template } from "./nodes/POL.1";
import { pol2_template } from "./nodes/POL.2";
import { rad1_template } from "./nodes/RAD.1";
import { rad2_template } from "./nodes/RAD.2";
import { rad3_template } from "./nodes/RAD.3";
import { rad4_template } from "./nodes/RAD.4";
import { rat1_template } from "./nodes/RAT.1";
import { trg1_template } from "./nodes/TRG.1";
import { trg2_template } from "./nodes/TRG.2";

/**
 * Parameterized L2 templates for the Phase-2 product (v2) foundational-spine nodes
 * the v2 checker now clears (Answer_Equivalence_Spec §2-§6). One template per node,
 * at the routing tier a difficulty-agnostic walk probes (mirroring `D1_WALK_TEMPLATES`).
 *
 * Every key is computed from the drawn params by real arithmetic, so it is correct
 * by construction; `validateTemplates(PRODUCT_TEMPLATES, >=1000, PRODUCT_CHECKER_CONFIG)`
 * grades each sampled instance through the REAL v2 checker (the net that catches a
 * bad key before anything is frozen). Each template declares a structural `varietyKey`
 * so a served (form, node) cell holds >=3 genuinely different items for the 2-of-3
 * walk rule, never near-twins that differ in one surface number.
 *
 * The per-node generators now live under `nodes/<NODE>/`; this file only AGGREGATES
 * them, preserving the exact node order that pins the frozen product walk forms
 * (`freezeDeepParallelForms` seeds each cell by its index here — see `product.test.ts`).
 *
 * EXP.1, TRG.1, and TRG.2 are now authored too: the v2 checker gained
 * `positive_exponents` (numeric-identity + no-negative-exponent form),
 * `canonical_exact_trig_value` (exact special-angle radical values), and a `pi`
 * exact-radian path. RAD.2 (combine radicals), RAD.3 (rational-exponent evaluation)
 * and RAD.4 (variable radicands, cleared by the v0.15 variable-radical wave) are
 * appended at the END so every earlier node keeps its index and its frozen forms stay
 * byte-identical. Still blocked: nodes whose forms need the deferred features (graph
 * geometric comparator, `is_vertex_form`, `set_builder`).
 */
export const PRODUCT_TEMPLATES: readonly ItemTemplate[] = [
  lin1_template,
  pol1_template,
  pol2_template,
  rat1_template,
  cg1_template,
  fun1_template,
  lf1_template,
  rad1_template,
  el1_template,
  exp1_template,
  trg1_template,
  trg2_template,
  rad2_template,
  rad3_template,
  rad4_template,
];
