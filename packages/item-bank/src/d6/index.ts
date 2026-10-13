/**
 * D6 item-bank surface: "The Gearwright's Menagerie", the automata-workshop island, all 11
 * nodes. CG.1 (the coordinate plane: plot points, intercepts, distance and midpoint), FUN.1
 * (function notation, evaluation and the vertical-line test), FUN.2 (domain and range),
 * FUN.7 (composition), FUN.5 (average rate of change), FUN.3 (piecewise functions), FUN.8
 * (inverses), FUN.4 (reading graph features), FUN.9 (transformations and even/odd), FUN.10
 * (absolute-value functions) and FUN.6 (the difference quotient, an item-family node). This
 * aggregates the per-node practice templates and the frozen practice pool, mirroring the D5
 * and D7 surfaces.
 *
 * The 11 node modules are SCAFFOLD PLACEHOLDERS with empty template arrays until each node
 * is authored; see `practice.ts` for why an unstarted node is skipped rather than fatal.
 */
export { CG1_NODE, CG1_TEMPLATES } from "./nodes/CG.1";
export { FUN1_NODE, FUN1_TEMPLATES } from "./nodes/FUN.1";
export { FUN2_NODE, FUN2_TEMPLATES } from "./nodes/FUN.2";
export { FUN3_NODE, FUN3_TEMPLATES } from "./nodes/FUN.3";
export {
  FUN4_CHART_FRAME_COUNT,
  FUN4_CHART_FRAME_OPENINGS,
  FUN4_NODE,
  FUN4_TEMPLATES,
} from "./nodes/FUN.4";
export { FUN5_NODE, FUN5_TEMPLATES } from "./nodes/FUN.5";
export { FUN6_NODE, FUN6_TEMPLATES } from "./nodes/FUN.6";
export { FUN7_NODE, FUN7_TEMPLATES } from "./nodes/FUN.7";
export { FUN8_NODE, FUN8_TEMPLATES } from "./nodes/FUN.8";
export { d6ParityExponents, FUN9_NODE, FUN9_TEMPLATES } from "./nodes/FUN.9";
export { FUN10_NODE, FUN10_TEMPLATES } from "./nodes/FUN.10";
export {
  buildRandomizedD6PracticeSet,
  D6_AUTHORED_PRACTICE_NODES,
  D6_PRACTICE_ITEMS,
  D6_PRACTICE_MIX,
  D6_PRACTICE_NODES,
  D6_PRACTICE_POOL,
  D6_PRACTICE_RETRY_VARIANTS_PER_CELL,
  D6_PRACTICE_TEMPLATES,
  D6_PRACTICE_VARIANTS,
  drawD6PracticeInstance,
  getD6PracticeSet,
} from "./practice";
