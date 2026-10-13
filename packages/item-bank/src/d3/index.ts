/**
 * D3 item-bank surface: Linear Equations, Inequalities & Absolute Value. All five live nodes ship
 * here (LIN.1, LIN.3, LIN.4, LIN.5 and LIN.6), which is the whole of the domain: LIN.2 is
 * RETIRED in `skill_graph.json` and its skill moved to RAT.6 in D5.
 *
 * This aggregates the per-node practice templates and the frozen practice pool, mirroring the D1,
 * D2, D5, D7 and D8 surfaces.
 */
export { LIN1_NODE, LIN1_TEMPLATES } from "./nodes/LIN.1";
export { LIN3_NODE, LIN3_TEMPLATES } from "./nodes/LIN.3";
export { LIN4_NODE, LIN4_TEMPLATES } from "./nodes/LIN.4";
export { LIN5_NODE, LIN5_TEMPLATES } from "./nodes/LIN.5";
export { LIN6_NODE, LIN6_TEMPLATES } from "./nodes/LIN.6";
export {
  buildRandomizedD3PracticeSet,
  D3_PRACTICE_ITEMS,
  D3_PRACTICE_MIX,
  D3_PRACTICE_NODES,
  D3_PRACTICE_POOL,
  D3_PRACTICE_RETRY_VARIANTS_PER_CELL,
  D3_PRACTICE_TEMPLATES,
  D3_PRACTICE_VARIANTS,
  drawD3PracticeInstance,
  getD3PracticeSet,
} from "./practice";
