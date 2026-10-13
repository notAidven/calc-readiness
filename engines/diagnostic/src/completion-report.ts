import type { NodeResolution } from "./coverage";
import type { CoverageMeasurementRecord } from "./coverage-measurement";

/**
 * WHAT THE GAME-COMPLETION CEREMONY IS ALLOWED TO SAY — the selector, and nothing
 * that renders.
 *
 * `docs/superpowers/specs/2026-07-31-game-completion-ceremony-design.md` rules that
 * the ending is a `purpose: "post"` retake of the entry diagnostic and that the
 * ceremony is what happens when its results come back. Most of what that record
 * decides is a decision about a CLAIM — which skills may be named, which number may
 * be shown, and which of two ceremonies the learner gets — so it belongs in a pure
 * function over the evidence rather than in a component, where it would be
 * unreachable to a test and would be re-decided by the next surface that renders an
 * ending.
 *
 * This module holds exactly that decision. It knows nothing about buildings, eras,
 * copy or React; it takes the retake's evidence plus the paired measurement (if
 * there is one) and returns what may be claimed.
 *
 * ## The four rulings it implements
 *
 * - **D-END5** — a learner without a comparable pair gets a DIFFERENT ceremony, not
 *   a degraded one. The fallback (`kind: "standing"`) makes no pre/post claim at
 *   all and is computed from the single administration.
 * - **D-END7** — the headline is the skills the retake newly holds, and **only a
 *   skill whose post pass is `robust` may be NAMED.** At the full 62-node scope 31
 *   of 62 nodes pass on one item and 20 admit a flip claim resting on two items
 *   total, so the naming bar is the clean 2/2 the tree already trusts enough to
 *   cascade from. Non-robust passes still count in the aggregate.
 * - **D-END8** — the retake is the subject: a skill it did not confirm is not on
 *   the list (clause a), and a skill it missed is *unconfirmed today* rather than
 *   unmastered (clause b), which is why the miss list is called
 *   {@link CompletionReport.unconfirmed_node_ids} and is measured misses only.
 * - **D-END10** — a truncated retake may never be reported as a loss, because
 *   fail-closed resolution (INV-DIAG-6) marks nodes the ceiling never reached as
 *   not-passed. `ceiling_reached` distinguishes truncation from an abandoned run,
 *   so a truncated retake falls back to the standing ceremony.
 *
 * ## What it deliberately does not do
 *
 * It never reads `placement_by_node`, and it is not given it. That is D-END6's
 * named prohibition and it is load-bearing rather than fussy: `finalize()` returns
 * `placement_by_node` for a `post` too — the guard against a retake wrecking a city
 * is at the WRITE boundary, not in the shape of the value — so the landmine is a
 * ceremony that reasonably reads the field and passes it where the pretest passes
 * it, which is a destructive full reset of ten eras of city. Robustness is
 * available here through `robust_pass_node_ids` precisely so that no consumer needs
 * the `placement === 3` encoding of it.
 */

/**
 * The retake's own evidence, and the whole of what the standing ceremony needs.
 *
 * Structurally satisfied by BOTH `CompletedWalkDiagnostic` (a live administration,
 * straight off `finalize()`) and `CoverageAdministrationScore` (the same
 * administration re-derived from its immutable records). That is the point of the
 * shape: the browser holds the first and a server read hands back the second, and
 * the ceremony's claim must not depend on which one reached it (INV-DIAG-4).
 */
export interface CompletionRetakeEvidence {
  /** Downward-closed per-node resolution over the instrument's scope. */
  resolved: readonly NodeResolution[];
  /** Nodes whose measured pass was robust — a clean 2/2 (`robustPassNodeIds`). */
  robust_pass_node_ids: readonly string[];
  /** The instrument ceiling cut this administration short of resolving everything. */
  ceiling_reached: boolean;
}

/** Which of the two ceremonies the evidence supports. */
export type CompletionCeremonyKind = "growth" | "standing";

/**
 * Why the standing ceremony was chosen.
 *
 * **This is diagnostic-facing and D-END5 forbids rendering it.** The shipped dev
 * results screen prints the machine status with its underscores swapped for spaces
 * — *"Not comparable yet (not comparable)"* — which is acceptable on a dev surface
 * and unusable as the last thing a learner sees after ten eras. It is carried so a
 * test, a log line or a future support tool can tell the five cases apart; the
 * ceremony copy branches on `kind` and never on this.
 */
export type CompletionStandingReason =
  /** No entry diagnostic was ever taken. The entry diagnostic is optional, so this is the common case. */
  | "no_baseline"
  /** The pair failed the three-field structural gate (blueprint / scoring model / counterbalanced forms). */
  | "not_comparable"
  /** The baseline is not a valid administration (never finalized, or over the fault budget). */
  | "pre_invalid"
  /** The retake is not a valid administration. */
  | "post_invalid"
  /** An administration in the pair hit the instrument ceiling, so its fail-closed nodes are a budget artifact (D-END10). */
  | "truncated";

export interface CompletionReport {
  kind: CompletionCeremonyKind;
  /** Null for `growth`; see {@link CompletionStandingReason} for why it is never rendered. */
  standing_reason: CompletionStandingReason | null;
  /**
   * The skills the ceremony may NAME, in scope order. Robust post passes only
   * (D-END7); for `growth`, further narrowed to the ones the baseline did not
   * already hold, which is what makes the list a record of what changed.
   *
   * May be empty, and an empty list is a real answer rather than a failure: a
   * learner who aced the entry diagnostic has nothing to newly hold. The surface
   * owes copy for it.
   */
  named_node_ids: readonly string[];
  /**
   * Every in-scope node the retake resolved as passed, measured or inferred — the
   * aggregate the named list is a subset of. Counted, never named: a non-robust
   * pass is one item of evidence, which is enough to weigh and not enough to
   * congratulate someone for (D-END7).
   */
  confirmed_node_ids: readonly string[];
  /**
   * In-scope nodes the retake MEASURED a miss on. Named `unconfirmed` rather than
   * `failed` or `unmastered` because that is the whole of what it means (D-END8b):
   * the learner reached era ten, so every one of these is at practice mastery >= 2,
   * and one cold sitting has no standing to withdraw earned evidence.
   *
   * `unknown` and `pruned` nodes are deliberately NOT here. Fail-closed resolution
   * treats them as not-passed, which is a conservative floor for an aggregate and
   * would be a fabrication in a list: the instrument did not ask.
   */
  unconfirmed_node_ids: readonly string[];
  /**
   * The supporting aggregate line, present only for `growth`. Shown small and not
   * suppressed (D-END7): a ceremony that reports only the good half is the kind of
   * thing that gets found later and read as a lie.
   */
  coverage: { pre: number; post: number; gain: number } | null;
}

function passedNodeIds(resolved: readonly NodeResolution[]): string[] {
  return resolved
    .filter((resolution) => resolution.status === "passed")
    .map((resolution) => resolution.node_id);
}

function failedNodeIds(resolved: readonly NodeResolution[]): string[] {
  return resolved
    .filter((resolution) => resolution.status === "failed")
    .map((resolution) => resolution.node_id);
}

/**
 * Which ceremony the evidence supports, or `null` when it supports the growth one.
 *
 * The order matters and follows the record's own: validity first (a score that is
 * not `valid` says nothing about comparability), then the structural gate, then
 * truncation.
 *
 * **Truncation is checked on BOTH sides, which is one step past D-END10's letter
 * and squarely inside its reason.** The record rules the retake's case: fail-closed
 * nodes the ceiling never reached would be shown to the learner as skills they
 * lack, which is a fabricated regression. A truncated BASELINE is the identical
 * artifact pointing the other way — its unreached nodes read not-passed, so they
 * are all available to be "newly held" at post, and the ceremony would name skills
 * the learner had all along and inflate the delta besides. Both are the ceiling
 * talking rather than the learner, and the standing ceremony is the answer to both.
 */
function standingReasonFor(
  retake: CompletionRetakeEvidence,
  measurement: CoverageMeasurementRecord | null,
): CompletionStandingReason | null {
  if (measurement === null) {
    return "no_baseline";
  }
  if (measurement.status === "pre_invalid") {
    return "pre_invalid";
  }
  if (measurement.status === "post_invalid") {
    return "post_invalid";
  }
  if (measurement.status !== "computed") {
    return "not_comparable";
  }
  if (retake.ceiling_reached || measurement.pre.ceiling_reached) {
    return "truncated";
  }
  return null;
}

/**
 * What the completion ceremony may claim, from the retake's evidence and the paired
 * measurement.
 *
 * `measurement` is `null` when there is no baseline to pair at all — which is the
 * COMMON case, not an edge one, because the entry diagnostic is optional
 * (`TitleScreen` offers "Start" beside "Take Diagnostic") and because the offline
 * path does not persist administrations across sessions at all (D-END12).
 */
export function buildCompletionReport(input: {
  retake: CompletionRetakeEvidence;
  measurement: CoverageMeasurementRecord | null;
}): CompletionReport {
  const { retake, measurement } = input;

  const confirmed = passedNodeIds(retake.resolved);
  const confirmedSet = new Set(confirmed);
  // A robust pass that resolution did not carry through to `passed` is a node
  // whose own items were clean but whose prerequisite failed, so the walk pruned
  // it. Naming it would contradict the resolved state the aggregate is built from.
  const robustlyHeld = retake.robust_pass_node_ids.filter((id) => confirmedSet.has(id));

  const standing_reason = standingReasonFor(retake, measurement);
  if (standing_reason !== null || measurement === null) {
    return {
      kind: "standing",
      standing_reason: standing_reason ?? "no_baseline",
      named_node_ids: robustlyHeld,
      confirmed_node_ids: confirmed,
      unconfirmed_node_ids: failedNodeIds(retake.resolved),
      coverage: null,
    };
  }

  const heldAtEntry = new Set(passedNodeIds(measurement.pre.resolved));
  return {
    kind: "growth",
    standing_reason: null,
    named_node_ids: robustlyHeld.filter((id) => !heldAtEntry.has(id)),
    confirmed_node_ids: confirmed,
    unconfirmed_node_ids: failedNodeIds(retake.resolved),
    coverage: {
      pre: measurement.pre.coverage,
      post: measurement.post.coverage,
      // `coverage_gain` is non-null exactly when the status is `computed`, which
      // `standingReasonFor` has already established. Recomputed from the two
      // coverages rather than trusted through a `?? 0`, so a future change that
      // decouples the two cannot make this line silently read zero.
      gain: measurement.post.coverage - measurement.pre.coverage,
    },
  };
}
