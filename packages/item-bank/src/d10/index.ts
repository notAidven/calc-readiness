/**
 * D10 item-bank surface: Geometry. GEO.1 (the Pythagorean theorem, similar triangles and
 * basic angle relationships) and GEO.2 (area, perimeter, volume and surface area of
 * standard figures) are the domain's whole authored node set, so unlike D8 this surface
 * has no node held back behind a checker gate. This aggregates the per-node practice
 * templates and the frozen practice pool, mirroring the D1, D2, D5, D7 and D8 surfaces.
 */
export { GEO1_NODE, GEO1_TEMPLATES } from "./nodes/GEO.1";
export { GEO2_NODE, GEO2_TEMPLATES } from "./nodes/GEO.2";
export {
  buildRandomizedD10PracticeSet,
  D10_PRACTICE_ITEMS,
  D10_PRACTICE_MIX,
  D10_PRACTICE_NODES,
  D10_PRACTICE_POOL,
  D10_PRACTICE_RETRY_VARIANTS_PER_CELL,
  D10_PRACTICE_TEMPLATES,
  D10_PRACTICE_VARIANTS,
  drawD10PracticeInstance,
  getD10PracticeSet,
} from "./practice";
