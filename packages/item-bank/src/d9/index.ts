/**
 * D9 item-bank surface: Trigonometry, all nine nodes (TRG.1 to TRG.9). This aggregates the
 * per-node practice templates and the frozen practice pool, mirroring the D1, D2, D5, D7 and
 * D8 surfaces.
 *
 * The domain is separate from the frozen TRG.2 PRODUCT assessment item, which lives under
 * `product/nodes/TRG.2` and is graded by the assessment path. Nothing here touches it, and
 * the difference is load-bearing rather than administrative: the product item answers
 * multipart, a shape no practice item may use because `apps/web` has no multi-field input to
 * submit one with.
 */
export { TRG1_NODE, TRG1_TEMPLATES } from "./nodes/TRG.1";
export { TRG2_NODE, TRG2_TEMPLATES } from "./nodes/TRG.2";
export { TRG3_NODE, TRG3_TEMPLATES } from "./nodes/TRG.3";
export {
  TRG4_HEADINGS,
  TRG4_IDENTITY_LINES,
  TRG4_NODE,
  TRG4_TEMPLATES,
} from "./nodes/TRG.4";
export { TRG5_NODE, TRG5_TEMPLATES } from "./nodes/TRG.5";
export { TRG6_NODE, TRG6_TEMPLATES } from "./nodes/TRG.6";
export { TRG7_EXTRA_TEMPLATES, TRG7_NODE, TRG7_TEMPLATES } from "./nodes/TRG.7";
export { TRG8_EXTRA_TEMPLATES, TRG8_NODE, TRG8_TEMPLATES } from "./nodes/TRG.8";
export { TRG9_NODE, TRG9_TEMPLATES, TRG9_TRIPLES } from "./nodes/TRG.9";
export {
  buildRandomizedD9PracticeSet,
  D9_EXTRA_PRACTICE_TEMPLATES,
  D9_PRACTICE_ITEMS,
  D9_PRACTICE_MIX,
  D9_PRACTICE_NODES,
  D9_PRACTICE_POOL,
  D9_PRACTICE_RETRY_VARIANTS_PER_CELL,
  D9_PRACTICE_TEMPLATES,
  D9_PRACTICE_VARIANTS,
  drawD9PracticeInstance,
  getD9PracticeSet,
} from "./practice";
