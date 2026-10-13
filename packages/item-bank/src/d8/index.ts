/**
 * D8 item-bank surface: Exponential & Logarithmic, all six nodes. EL.6 (solve exponential and
 * logarithmic equations) joined on 2026-07-30, once §10's *arbitrary equation equivalence*
 * deferral was read against the checker: solving an equation submits its ROOTS, and the one
 * root shape that was genuinely unstatable (a logarithm inside a solution set) is now
 * gradable behind `representation: "exact"`. This aggregates the per-node practice templates
 * and the frozen practice pool, mirroring the D1, D2, D5 and D7 surfaces.
 */
export { EL1_NODE, EL1_TEMPLATES } from "./nodes/EL.1";
export { EL2_NODE, EL2_TEMPLATES } from "./nodes/EL.2";
export { EL3_EXTRA_TEMPLATES, EL3_NODE, EL3_TEMPLATES } from "./nodes/EL.3";
export { EL4_NODE, EL4_TEMPLATES } from "./nodes/EL.4";
/**
 * EL.5's symbol table is public because its worked-solution figures need it. A template
 * records a variable as an INDEX (`template_params` is `Record<string, number>`), so the
 * figure has to decode that index with the very same list the generator encoded it with; a
 * second copy in `apps/web` would print the wrong variable the day either list grew.
 */
export { EL5_NODE, EL5_SYMBOLS, EL5_TEMPLATES, el5Symbol } from "./nodes/EL.5";
export { EL6_EXTRANEOUS_DRAWS, EL6_NODE, EL6_TEMPLATES } from "./nodes/EL.6";
export {
  buildRandomizedD8PracticeSet,
  D8_EXTRA_PRACTICE_TEMPLATES,
  D8_PRACTICE_ITEMS,
  D8_PRACTICE_MIX,
  D8_PRACTICE_NODES,
  D8_PRACTICE_POOL,
  D8_PRACTICE_RETRY_VARIANTS_PER_CELL,
  D8_PRACTICE_TEMPLATES,
  D8_PRACTICE_VARIANTS,
  drawD8PracticeInstance,
  getD8PracticeSet,
} from "./practice";
