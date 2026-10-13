/**
 * D5 item-bank surface: the "Verdigris Hold" crafting-guild island, all six nodes. RAT.1
 * (simplify rational expressions and track excluded values), RAT.2 (multiply and divide),
 * RAT.3 (add and subtract over a common denominator), RAT.4 (simplify complex/nested
 * fractions), RAT.5 (domain, holes, asymptotes and intercepts) and RAT.6 (solve rational
 * equations, rejecting extraneous roots). This aggregates the per-node practice templates
 * and the frozen practice pool, mirroring the D1 and D2 surfaces.
 */
export { RAT1_NODE, RAT1_TEMPLATES } from "./nodes/RAT.1";
export { RAT2_NODE, RAT2_TEMPLATES } from "./nodes/RAT.2";
export { RAT3_NODE, RAT3_TEMPLATES } from "./nodes/RAT.3";
export { RAT4_NODE, RAT4_TEMPLATES } from "./nodes/RAT.4";
export { RAT5_NODE, RAT5_TEMPLATES } from "./nodes/RAT.5";
export { RAT6_NODE, RAT6_TEMPLATES } from "./nodes/RAT.6";
export {
  buildRandomizedD5PracticeSet,
  D5_PRACTICE_ITEMS,
  D5_PRACTICE_MIX,
  D5_PRACTICE_NODES,
  D5_PRACTICE_POOL,
  D5_PRACTICE_RETRY_VARIANTS_PER_CELL,
  D5_PRACTICE_TEMPLATES,
  D5_PRACTICE_VARIANTS,
  drawD5PracticeInstance,
  getD5PracticeSet,
} from "./practice";
