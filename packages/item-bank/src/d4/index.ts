/**
 * D4 item-bank surface: Polynomials & Quadratics, all eight nodes across THREE eras.
 *
 * POL.1, POL.2, POL.3, POL.4 and POL.8 are `getEraNodes("classical")` exactly. POL.6 and POL.7
 * are graph-reading lessons that moved to Early Modern with the coordinate plane, and POL.5
 * requires the plane outright and sits in the Industrial Era. A domain directory is not an era,
 * and this one holds a domain that spans three of them.
 *
 * This aggregates the per-node practice templates and the frozen practice pool, mirroring the
 * D1, D2, D3, D5, D7 and D8 surfaces.
 */
export { POL1_NODE, POL1_TEMPLATES } from "./nodes/POL.1";
export { POL2_NODE, POL2_TEMPLATES } from "./nodes/POL.2";
export { POL3_NODE, POL3_TEMPLATES } from "./nodes/POL.3";
export { POL4_NODE, POL4_TEMPLATES } from "./nodes/POL.4";
export { POL5_NODE, POL5_TEMPLATES } from "./nodes/POL.5";
export { POL6_NODE, POL6_TEMPLATES } from "./nodes/POL.6";
export { POL7_NODE, POL7_TEMPLATES } from "./nodes/POL.7";
export { POL8_NODE, POL8_TEMPLATES } from "./nodes/POL.8";
export {
  buildRandomizedD4PracticeSet,
  D4_PRACTICE_ITEMS,
  D4_PRACTICE_MIX,
  D4_PRACTICE_NODES,
  D4_PRACTICE_POOL,
  D4_PRACTICE_RETRY_VARIANTS_PER_CELL,
  D4_PRACTICE_TEMPLATES,
  D4_PRACTICE_VARIANTS,
  drawD4PracticeInstance,
  getD4PracticeSet,
} from "./practice";
