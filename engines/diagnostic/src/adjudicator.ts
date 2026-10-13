/**
 * Per-node adjudication for the prerequisite-gated walk (Contracts Amendment v2
 * §4.3, into which the probe-policy amendment folded on 2026-07-26). Pure and
 * incremental — it consumes the ordered SCORABLE correctness outcomes for one
 * probed node (faults are filtered and re-served by the caller, never passed in)
 * and reports whether to serve another item or the node is decided.
 *
 * The rule is **confirmation proportional to consequence**. Every node opens with
 * a single item. A decision that only affects the node itself is taken on that one
 * item; a decision that would cascade — crediting a large prerequisite closure, or
 * pruning a large dependent cone — falls through to the original adaptive 2-of-3.
 * Consequence is a STATIC property of `(node, scope, graph)` (see `NodeConsequence`),
 * never of the walk's evolving unknown set, so `rebuildWalkState` can re-bucket the
 * response rows by node and re-adjudicate each node in isolation exactly as the live
 * engine did (INV-DIAG-4 reproducibility) without replaying the walk.
 *
 * Design goals encoded here (INV-DIAG-6/7/8 as amended):
 * - Cheap, confident pass: two correct in a row → `passed` + `robust` (still the
 *   only state that earns the top city seed, and the trigger for crediting the
 *   prerequisite CLOSURE — not for test-out, which every pass gets).
 * - A consequential miss NEVER decides a failure on one item: two misses require a
 *   third confirming item before a large subtree can be pruned.
 * - Bias toward placing-low: a mixed 2-of-3 correct still passes, non-robustly —
 *   it seeds 2 rather than 3 and credits no closure, but it IS a genuine pass and
 *   it DOES test out. Any 2-of-3 incorrect is a confirmed failure.
 * - A node with nothing much downstream stops paying for a confirmation it cannot
 *   cascade — that is where the item budget is won.
 *
 * On "test-out", because the comments here previously got it backwards: test-out
 * keys on `placement_estimate >= 2`, and EVERY `passed` resolution clears that bar
 * (`placementFor`: measured-robust 3, measured-non-robust 2, inferred 2). What
 * `robust` gates is the top seed and downward INFERENCE, never the node's own
 * unlock. Settled 2026-07-26 —
 * `docs/Contracts_Amendment_Diagnostic_Probe_Policy.md` §3.5.
 */

/** A node is still decided within at most three scorable items. */
export const MAX_PROBE_ITEMS = 3;

/**
 * How far a decision about one node reaches through the DAG, within the walk's
 * scope. Both counts are static graph facts, fixed before the walk starts.
 */
export interface NodeConsequence {
  /** In-scope transitive prerequisites — what a pass would credit via test-out. */
  passClosure: number;
  /** In-scope transitive dependents — what a confirmed failure would prune. */
  failCone: number;
}

/** A node with no measured reach either way: always cheap to decide. */
export const ISOLATED_CONSEQUENCE: NodeConsequence = { passClosure: 0, failCone: 0 };

/**
 * The share of the scope a decision must reach before it is worth confirming,
 * as a fraction of the in-scope node count.
 *
 * It is a FRACTION rather than an absolute count because "how much damage does a
 * wrong call do" is inherently relative to the instrument: a cascade of 5 nodes
 * is most of the 6-node D1 walk and a rounding error in the 62-node walk. An
 * absolute threshold tuned on the full graph silently degenerates on D1 — nothing
 * in a 6-node scope can reach 7 nodes, so every node would decide on one item and
 * the live instrument would lose ~5 points of accuracy.
 *
 * SELECTION SWEEP, `engines/diagnostic/sim/policy-sweep.sim.test.ts` over the
 * 62-node graph at **n = 3,000** (mild noise, pooled profiles), quoted as the
 * absolute threshold it produces there. Median items / truth accuracy:
 * 3 → 50 / 96.4%, 5 → 47 / 96.3%, 6 → 41 / 95.7%, **7 → 37 / 95.6%**,
 * 8 → 34 / 95.5%, 10 → 32 / 95.3%, never-confirm → 28 / 94.3%.
 *
 * 7/62 is the value that lands the median inside the 35–40 target band. Accuracy
 * is nearly flat across the whole sweep, so the choice is a length decision, not
 * an accuracy one — the curve only turns down when confirmation is abandoned
 * entirely.
 *
 * THE FIGURE TO QUOTE IS **38 items at n = 6,000**, not the 37 above. The sweep
 * is a relative comparison across thresholds and was run at half the sample; the
 * shipped median was then re-measured on the same harness at the headline
 * n = 6,000 and reads 38. Both describe the same knob at the same setting, and
 * the one-item gap is sampling. `DEFAULT_WALK_POLICY` in `walk.ts` and
 * `docs/Contracts_Amendment_Diagnostic_Probe_Policy.md` §1 both quote the 38.
 * Reconciled 2026-07-26 — always state the sample size alongside a median.
 */
export const DEFAULT_CONFIRM_SCOPE_FRACTION = 7 / 62;

/**
 * The absolute cascade size at which a decision must be confirmed, for a scope of
 * `scopeSize` nodes. A fraction of 0 confirms everything (the pre-amendment
 * 2-of-3); a fraction above 1 can never be reached, so nothing is confirmed.
 *
 * Rounded DOWN, which makes the rule self-disabling on a small scope: below the
 * point where the share is worth a whole node the threshold reaches 0 and every
 * decision is confirmed. That is what keeps the live 6-node D1 walk bit-identical
 * to its pre-amendment behaviour while the 62-node walk confirms at 7. Rounding
 * up instead costs D1 ~2 points of accuracy to save one item, which is the wrong
 * trade on the only scope students currently see.
 */
export function confirmThresholdFor(scopeSize: number, fraction: number): number {
  if (fraction <= 0) {
    return 0;
  }
  // Epsilon so an exactly-representable share (7/62 × 62) does not fall to 6.
  return Math.max(0, Math.floor(fraction * scopeSize + 1e-9));
}

export type Adjudication =
  | { done: false }
  | {
      done: true;
      result: "passed" | "failed";
      /** True ONLY for a clean two-correct-in-a-row pass — drives the top city seed. */
      robust: boolean;
      /**
       * True when this pass licenses crediting the node's prerequisite closure
       * (INV-DIAG-8 as amended): a clean 2/2, or a single-item pass whose closure
       * was too small to be worth confirming. Never set on a 2-of-3 pass, which
       * remains too shaky to cascade.
       */
      infers: boolean;
      correct_count: number;
      item_count: number;
    };

/**
 * Adjudicate a node from its scorable outcomes so far (`true` = correct) and the
 * consequence of deciding it. Returns `{ done: false }` while another item is
 * needed. Never reads difficulty — the walk chooses each probe/confirm item;
 * this only counts correctness.
 *
 * The defaults confirm everything, i.e. the pre-amendment 2-of-3. Real callers
 * (the walk and the record recompute) always pass the scope-derived consequence
 * and the scope-derived threshold from `confirmThresholdFor`.
 *
 * `inferOnMajorityPass` is OFF in the shipped policy and exists so the lever can
 * be swept: it licenses a 2-of-3 pass to credit its prerequisite closure, which
 * is the borderline case INV-DIAG-8 names explicitly. See
 * `docs/Diagnostic_Tail_Policy_Measurement.md` §4 for what it is worth.
 */
export function adjudicate(
  outcomes: readonly boolean[],
  consequence: NodeConsequence = ISOLATED_CONSEQUENCE,
  confirmThreshold = 0,
  inferOnMajorityPass = false,
): Adjudication {
  const itemCount = outcomes.length;
  const correctCount = outcomes.filter(Boolean).length;

  if (itemCount === 0) {
    return { done: false };
  }

  // One item: the decision stands on its own unless it would cascade. A pass that
  // would credit a big prerequisite closure, or a miss that would prune a big
  // dependent cone, buys a confirming item instead.
  if (itemCount === 1) {
    const passes = correctCount === 1;
    const reach = passes ? consequence.passClosure : consequence.failCone;
    if (reach >= confirmThreshold) {
      return { done: false };
    }
    return {
      done: true,
      result: passes ? "passed" : "failed",
      robust: false,
      infers: passes,
      correct_count: correctCount,
      item_count: 1,
    };
  }

  // Two items: only a clean sweep decides. 2/2 correct is a robust pass; anything
  // else (two misses, or a 1-1 split) defers to a third confirming item.
  if (itemCount === 2) {
    if (correctCount === 2) {
      return {
        done: true,
        result: "passed",
        robust: true,
        infers: true,
        correct_count: 2,
        item_count: 2,
      };
    }
    return { done: false };
  }

  // Three or more: majority decides, and it can never be a clean 2/2 (that stops
  // at two), so a pass here is non-robust — credited for the node, seeding 2 and
  // licensing no downward inference. It still tests out: seed 2 clears the `>= 2`
  // unlock bar (probe-policy amendment §3.5).
  const result = correctCount >= 2 ? "passed" : "failed";
  return {
    done: true,
    result,
    robust: false,
    infers: inferOnMajorityPass && result === "passed",
    correct_count: correctCount,
    item_count: itemCount,
  };
}
