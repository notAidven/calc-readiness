/**
 * D2 item-bank surface: the "Boomtown Square" island. All five nodes ship
 * their lesson-practice pools here: EXP.1 (exponent laws to positive-exponent form),
 * RAD.1 (evaluate + simplify roots), RAD.2 (combine radicals + rationalize),
 * RAD.3 (rational exponent <-> radical form), and RAD.4 (variable radicands,
 * `sqrt(x^2) = |x|`, the even-root domain restriction). This aggregates the per-node
 * practice templates and the frozen practice pool, mirroring the D1 surface.
 */
export {
  d2_exp_build_l3,
  d2_exp_net_l2,
  d2_exp_power_l2,
  d2_exp_product_l1,
  d2_exp_quotient_l2,
  d2_exp_twovar_l3,
  EXP1_NODE,
  EXP1_TEMPLATES,
} from "./nodes/EXP.1";
export {
  d2_rad1_build_l3,
  d2_rad1_coeff_l3,
  d2_rad1_eval_l1,
  d2_rad1_quotient_l2,
  d2_rad1_simplify_l2,
  RAD1_NODE,
  RAD1_TEMPLATES,
} from "./nodes/RAD.1";
export {
  d2_rad2_build_l3,
  d2_rad2_combine_like_l1,
  d2_rad2_rationalize_coeff_l3,
  d2_rad2_rationalize_unit_l2,
  d2_rad2_simplify_combine_l2,
  RAD2_NODE,
  RAD2_TEMPLATES,
} from "./nodes/RAD.2";
export {
  d2_rad3_eval_l1,
  d2_rad3_negeval_l3,
  d2_rad3_simplify_l3,
  d2_rad3_to_exponent_l2,
  d2_rad3_to_radical_l2,
  RAD3_NODE,
  RAD3_TEMPLATES,
} from "./nodes/RAD.3";
export {
  d2_rad4_extract_l2,
  d2_rad4_magnitude_l1,
  d2_rad4_mixed_l3,
  d2_rad4_realroot_l2,
  d2_rad4_twovar_l3,
  RAD4_NODE,
  RAD4_TEMPLATES,
  radicalSymbolPair,
} from "./nodes/RAD.4";
export {
  buildRandomizedD2PracticeSet,
  D2_PRACTICE_ITEMS,
  D2_PRACTICE_MIX,
  D2_PRACTICE_NODES,
  D2_PRACTICE_POOL,
  D2_PRACTICE_RETRY_VARIANTS_PER_CELL,
  D2_PRACTICE_TEMPLATES,
  D2_PRACTICE_VARIANTS,
  drawD2PracticeInstance,
  getD2PracticeSet,
} from "./practice";
