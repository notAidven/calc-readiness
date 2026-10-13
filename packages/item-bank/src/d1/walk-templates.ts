import type { ItemTemplate } from "../template";
import { num2_walk } from "./nodes/NUM.2";
import { num3_walk } from "./nodes/NUM.3";
import { num4_walk } from "./nodes/NUM.4";
import { num5_walk } from "./nodes/NUM.5";
import { numF_walk } from "./nodes/NUM.F";
import { numS_walk } from "./nodes/NUM.S";

/**
 * Dedicated L2 templates for the v2 prerequisite-gated **walk** — one per D1 node,
 * all at the routing tier the walk probes. These are a SEPARATE authoring set from
 * the shared `D1_TEMPLATES` (`./templates.ts`) on purpose: those also freeze the v1
 * MST forms + the practice pool, whose content hashes are pinned/immutable, so the
 * walk gets its own generators (distinct `d1w.*` template ids) to be tightened
 * without touching a single published v1 item.
 *
 * The per-node walk generators now live under `nodes/<NODE>/` alongside that node's
 * other templates; this file only AGGREGATES them in node order (the order pins the
 * frozen walk forms via `freezeDeepParallelForms`; see `walk.test.ts`).
 *
 * Tightening over the reused L2 set (2026-07-24 review):
 *   - **Commutativity guards** so a cell's parallel instances can't be trivial
 *     re-orderings of each other (e.g. `1/3 + 1/4` vs `1/4 + 1/3`, `3x + 5x` vs
 *     `5x + 3x`): the symmetric operands are emitted in canonical order, which
 *     collapses would-be twins to one content hash so the deep-freeze picks a
 *     genuinely different instance.
 *   - **NUM.5 percentages** no longer use 50% (or 10%) — both are doable by
 *     intuition/decimal-shift without understanding percent-of — and now mix a
 *     **reverse** form ("PART is P% of what?") with the forward form, so the item
 *     probes the part/percent/whole relationship rather than halving.
 *   - **Variety keys** (2026-07-24 follow-up) so a cell's three instances differ in
 *     their leading structure, not just full content — content-hash distinctness
 *     alone let near-twins like `5(3x+4)`/`5(3x+5)` (or three `20%` items) freeze
 *     into one cell. `freezeDeepParallelForms` enforces distinct `varietyKey`s.
 *
 * Keys are computed from the drawn params by real arithmetic (correct by
 * construction); `validateTemplates` samples instances through the real checker.
 */
export const D1_WALK_TEMPLATES: readonly ItemTemplate[] = [
  numS_walk,
  numF_walk,
  num2_walk,
  num3_walk,
  num4_walk,
  num5_walk,
];
