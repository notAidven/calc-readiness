/**
 * The complete numeric contract for the three-night Plague containment.
 *
 * One batch earns one intervention. Accuracy is its countable strength, while
 * `incoming_by_round` is the maximum number of authored routes the outbreak attempts that night.
 */
export const PLAGUE = {
  rounds: 3,
  batch_size: 3,
  incoming_by_round: [1, 2, 0] as readonly number[],
  max_intervention_strength: 3,
  contained_max_affected: 2,
  /**
   * Kept as the question composer's one batch-size seam. It must equal `batch_size`; the engine
   * suite checks the relationship rather than allowing two independently tuned numbers.
   */
  cycle: {
    batch_size: 3,
  },
  /**
   * D-CRISIS-14's existing question window. The Care House changes the crisis decision, not
   * which completed lessons can furnish its three-question batches.
   */
  window: {
    eras_back: 2,
    shares_percent: [40, 35, 25] as readonly number[],
  },
} as const;
