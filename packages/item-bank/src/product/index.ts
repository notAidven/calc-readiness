import { type FrozenItem, freezeDeepParallelForms } from "../template";
import { PRODUCT_TEMPLATES } from "./templates";

export { PRODUCT_GOLDEN_FIXTURES, type ProductGoldenFixture } from "./golden";
export { PRODUCT_TEMPLATES } from "./templates";

/**
 * The Phase-2 product (v2) foundational-spine nodes authored here — the ones the
 * committed product checker (checker version 2) clears. In ranked authoring order.
 * The foundational spine plus the D2 radical nodes RAD.2, RAD.3 and RAD.4, appended
 * at the END so every earlier node keeps its index and its frozen walk forms stay
 * byte-identical (`freezeDeepParallelForms` seeds each cell by its index here).
 */
export const PRODUCT_NODES: readonly string[] = [
  "LIN.1",
  "POL.1",
  "POL.2",
  "RAT.1",
  "CG.1",
  "FUN.1",
  "LF.1",
  "RAD.1",
  "EL.1",
  "EXP.1",
  "TRG.1",
  "TRG.2",
  "RAD.2",
  "RAD.3",
  "RAD.4",
];

/**
 * Parallel items per served (node) cell. The walk adjudicates each node with an
 * adaptive 2-of-3, so a served cell needs >=3 parallel items that never repeat
 * (Adaptive-Diagnostic amendment §8; mirrors `D1_WALK_ITEMS_PER_CELL`).
 */
export const PRODUCT_WALK_ITEMS_PER_CELL = 3;

// Seed bases disjoint from every D1 pool (1000/2000 forms, 5000 practice, 7000
// variants, 10000/20000 walk) so no frozen id or content ever collides across packs.
const FORM_A_SEED_BASE = 100_000;
const FORM_B_SEED_BASE = 200_000;

const forms = freezeDeepParallelForms(PRODUCT_TEMPLATES, {
  instancesPerCell: PRODUCT_WALK_ITEMS_PER_CELL,
  seedBaseA: FORM_A_SEED_BASE,
  seedBaseB: FORM_B_SEED_BASE,
});

/** Frozen product walk Form A (pre pool) — PRODUCT_WALK_ITEMS_PER_CELL L2 items/node. */
export const PRODUCT_FORM_A: readonly FrozenItem[] = forms.formA;
/** Frozen product walk Form B (post pool) — matched depth, guaranteed distinct from A. */
export const PRODUCT_FORM_B: readonly FrozenItem[] = forms.formB;

/** All frozen product (v2) walk assessment item versions (both forms). */
export const PRODUCT_ITEM_PACK: readonly FrozenItem[] = [
  ...PRODUCT_FORM_A,
  ...PRODUCT_FORM_B,
];
