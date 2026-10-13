import type {
  AssessmentAdministration,
  AssessmentItemResponse,
  ScoringStatus,
  UUID,
} from "@cr/state-schema";

import { type CoverageResult, computeCoverage, type NodeResolution } from "./coverage";
import { FAULT_THRESHOLD } from "./measurement";
import { isScorable } from "./scoring";
import {
  adjudicateRecordedWalk,
  DEFAULT_WALK_POLICY,
  resolveKnowledgeState,
  robustPassNodeIds,
  type WalkState,
} from "./walk";

/**
 * Reproducible coverage from immutable records (Contracts Amendment v2 §5.3 /
 * INV-DIAG-4). The depth-weighted readiness coverage is recomputed as a pure
 * function of (the finalized `assessment_administration.routing_path` + its
 * append-only `assessment_item_response` rows in served order + the in-scope node
 * set + the versioned resolution rules) — never from a stored resolved state.
 *
 * This is the coverage analogue of `measurement.ts`'s θ recompute, and it reuses
 * the SAME `adjudicate` + `resolveKnowledgeState` the live engine used, so a
 * recomputed coverage is bit-for-bit the number the engine reported.
 *
 * Note on records (no schema change): the walk trace is already fully captured by
 * two immutable artifacts — `routing_path` holds the ordered probe node ids, and
 * each response row is tagged with its `node_id` + `authoritative_correct`. Per-node
 * outcomes are re-derived by bucketing rows by `node_id` (each node is probed in a
 * single run), and the adjudicated result + robustness are re-derived, not stored.
 * So `routing_path` stays `string[]` (additive); no frozen shared type changes.
 */

/**
 * The `scoring_model_version` that denotes the depth-weighted coverage metric
 * (coverage-weight fn + resolution rules), as opposed to v1's difficulty-aware
 * ability frontier θ (version 1). The measurement read API dispatches on this to
 * recompute θ vs coverage from a pair's records, and a pre/post pair MUST share
 * it to be comparable (INV-DIAG-5).
 *
 * **3 as of 2026-08-04**, which is Route A of
 * `docs/Contracts_Amendment_Diagnostic_Probe_Policy.md` §3.4.1 being walked for
 * the tail cut: `DEFAULT_WALK_POLICY` now reads a pass's consequence LIVE past
 * the twentieth item, and that is a rule a stored record's replay depends on.
 * Route B does not close — the bound is pinned in `coverage-measurement.test.ts`
 * ("the bound that makes a live consequence a Route A change") and reasoned in
 * `docs/Diagnostic_Tail_Policy_Measurement.md` §6.2: the instrument ceiling can
 * land mid-node, so a FINALIZED record can hold a node with one outcome and no
 * decision, which the two rule sets resolve differently. That population is not
 * frozen, so the version has to move.
 *
 * **The comparability impact, recorded rather than acknowledged** (§3.4.1
 * requires this named, not gestured at): every existing pre/post pair becomes
 * `not_comparable` under INV-DIAG-5, all of them administered at version 2 — the
 * D1 (6-node) pairs and any pair taken on the widened walk scope. The same pairs
 * were ALREADY made `not_comparable` by `DEFAULT_WALK_BLUEPRINT_VERSION` moving
 * 5 → 6 when `POL.5` widened the instrument to all 62 nodes, since
 * `comparabilityStatus` fails on either field. So this bump widens no population
 * that the blueprint bump had not already caught; it is recorded separately
 * because they are two different records of two different changes.
 *
 * Historical records still RECOMPUTE unchanged, which is the half a bare bump
 * would not buy: `rebuildWalkState` reads the rules the record's own version
 * declares, and version 2's literals stay registered below.
 */
export const COVERAGE_SCORING_MODEL_VERSION = 3;

/**
 * The version administered under the #89 static-consequence rules, kept as a
 * named constant because the tests that prove old records still replay
 * faithfully have to name it. Never move this: it labels records that exist.
 */
export const STATIC_CONSEQUENCE_SCORING_MODEL_VERSION = 2;

/**
 * The slice of the walk policy a RECORD RECOMPUTE depends on. Probe ORDERING is
 * deliberately absent: `rebuildWalkState` re-decides each node from its own
 * scorable outcomes along the recorded `routing_path` rather than replaying the
 * walk's selection, so the only things that can change what a stored record
 * replays as are the rules that decide a node, plus the ceiling that could have
 * cut the walk short.
 *
 * Every adjudication knob on `WalkPolicy` is mirrored here, including the three
 * that are off in the shipped policy. That is what the drift test in
 * `coverage-measurement.test.ts` derives its population from: a rule that is not
 * registered here cannot be turned on without the check failing, which is what
 * forces `docs/Contracts_Amendment_Diagnostic_Probe_Policy.md` §3.4.1's Route A
 * or Route B to be walked rather than skipped.
 */
export interface CoverageResolutionRules {
  /** Feeds `confirmThresholdFor`; 0 confirms every decision (the ratified 2-of-3). */
  confirmScopeFraction: number;
  /** Instrument ceiling in scorable items; `Infinity` for no ceiling. */
  maxItems: number;
  /** Judge what a pass would credit against still-unresolved prerequisites. */
  livePassClosure: boolean;
  /** Judge what a failure would prune against still-unresolved dependents. */
  liveFailCone: boolean;
  /** Items after which the two live readings above take effect. */
  liveConsequenceFrom: number;
  /** Items after which no decision is confirmed; `Infinity` never relieves. */
  confirmBudget: number;
  /** A 2-of-3 pass credits its prerequisite closure. */
  inferOnMajorityPass: boolean;
}

/**
 * The resolution rules each coverage `scoring_model_version` was scored under,
 * frozen as LITERALS rather than read off today's `DEFAULT_WALK_POLICY`.
 *
 * This is what makes INV-DIAG-4 true by construction rather than by coincidence.
 * Recompute previously reached for the CURRENT policy unconditionally, so a
 * record written under one rule set was re-adjudicated under the next one — the
 * exact failure the version field exists to prevent. Reading the rules the
 * record's own version declares means a shipped-policy change can no longer
 * reach backwards.
 *
 * Version 2 covers both the ratified v2 rules and the 2026-07-26 probe-policy
 * amendment (PR #89), deliberately and on the strong leg: #89 is provably
 * ADDITIVE over every per-node outcome sequence a finalized pre-amendment record
 * can contain. See `docs/Contracts_Amendment_Diagnostic_Probe_Policy.md` §3.4 for
 * the proof and its two bounds, and `coverage-measurement.test.ts` for the
 * exhaustive differential that pins it.
 *
 * Version 3 is the 2026-08-04 tail cut, and it is the case where that argument
 * does NOT close — hence a new version rather than a third rule set filed under
 * 2. The asymmetry is the point: #89 earned its way into an existing version by
 * proving additivity over a frozen population, and this one could not.
 *
 * Registering a version here is the only way a future rule change reaches old
 * records correctly, and `coverage-measurement.test.ts` fails when
 * `DEFAULT_WALK_POLICY` drifts from the entry registered for the current
 * version — so the next change to these rules cannot land without answering the
 * question #89 was able to skip.
 */
const RESOLUTION_RULES_BY_VERSION: ReadonlyMap<number, CoverageResolutionRules> = new Map([
  [
    // Version 2 — the #89 static-consequence rules. LEFT IN PLACE, which is what
    // makes the 2026-08-04 bump Route A rather than a bare relabel: every record
    // written before the tail cut still re-decides under the rules it was scored
    // with. These literals label records that exist and must never be re-pinned;
    // `coverage-measurement.test.ts` asserts them value by value.
    STATIC_CONSEQUENCE_SCORING_MODEL_VERSION,
    {
      confirmScopeFraction: 7 / 62,
      maxItems: 70,
      livePassClosure: false,
      liveFailCone: false,
      liveConsequenceFrom: 0,
      confirmBudget: Number.POSITIVE_INFINITY,
      inferOnMajorityPass: false,
    },
  ],
  [
    // Version 3 — the tail cut. A pass past the twentieth item is judged against
    // the prerequisites still unresolved rather than against its whole static
    // closure. `adjudicateRecordedWalk` folds along `routing_path` so this stays
    // reproducible from the immutable records without replaying probe selection.
    COVERAGE_SCORING_MODEL_VERSION,
    {
      confirmScopeFraction: 7 / 62,
      maxItems: 70,
      livePassClosure: true,
      liveFailCone: false,
      liveConsequenceFrom: 20,
      confirmBudget: Number.POSITIVE_INFINITY,
      inferOnMajorityPass: false,
    },
  ],
]);

/**
 * The resolution rules a record declaring `version` was scored under.
 *
 * A version with no registered rules is not a coverage administration at all (a
 * v1 θ record, or a model this build predates). It falls back to the current
 * rules, which is the pre-existing behaviour and is deliberate: the upstream
 * dispatch (`computeStudentReadiness`) and the INV-DIAG-5 comparability gate
 * below are what keep such a record out of a reported number, and failing here
 * instead would only move which gate rejects it.
 */
export function coverageResolutionRulesFor(version: number): CoverageResolutionRules {
  const rules =
    RESOLUTION_RULES_BY_VERSION.get(version) ??
    RESOLUTION_RULES_BY_VERSION.get(COVERAGE_SCORING_MODEL_VERSION);
  return rules as CoverageResolutionRules;
}

/**
 * Is `version` a COVERAGE scoring model — any of them — rather than v1's θ?
 *
 * The distinction only became observable when a second coverage version existed,
 * and it broke a reader the moment it did. `measurement-read.ts` dispatched on
 * `version === COVERAGE_SCORING_MODEL_VERSION`, which reads as "is this a
 * coverage record" and actually asks "is this the CURRENT coverage record". The
 * two coincided for as long as there was one coverage version, so the equality
 * was indistinguishable from the predicate and stayed that way for two versions
 * of this file.
 *
 * Bumping to 3 separates them: every stored administration is stamped 2, so the
 * equality sends all of them down the v1 θ branch, where `computeMeasurement`
 * looks up an MST stage a walk record does not have and throws. That is a hard
 * read failure on existing records, not a degraded number.
 *
 * Derived from the registry rather than a written-down list, so registering a
 * version is the single act that makes it known — a new entry cannot be added
 * and left out of the dispatch.
 */
export function isCoverageScoringModelVersion(version: number): boolean {
  return RESOLUTION_RULES_BY_VERSION.has(version);
}

const EMPTY_INVALIDATED: ReadonlySet<string> = new Set();

/**
 * Application faults only (Answer_Equivalence_Spec §12). This is the live v2
 * instrument's copy; `measurement.ts` holds the v1 one, and the two must agree.
 *
 * Do NOT add `invalid_input` here to make a wedged walk observable. That was
 * proposed and rejected; the reasoning is in `engines/diagnostic/README.md`
 * ("A rejected change: `invalid_input` is not an application fault").
 */
const FAULT_STATUSES: ReadonlySet<ScoringStatus> = new Set([
  "scoring_error",
  "unsupported_expression",
]);

/**
 * Rebuild the walk's per-node measured results from the immutable records. Buckets
 * each administration's scorable rows by `node_id` (faults + invalidated items are
 * excluded, exactly as the live engine excluded them), then re-decides each probed
 * node under the rules the record's OWN `scoring_model_version` declares
 * (INV-DIAG-4). The returned `WalkState` is resolution-ready (tiers are irrelevant
 * to the resolved state, so they are left neutral).
 *
 * The re-decision folds along `routing_path` rather than treating each node
 * independently. Under the shipped rules the two are equivalent, because every
 * input `adjudicate` reads is then a static function of `(node, scope, graph)`;
 * the fold is what lets a rule that reads the walk's own progress — a live
 * consequence, a confirm budget — stay reproducible without replaying probe
 * selection. See `adjudicateRecordedWalk` in `./walk`.
 */
export function rebuildWalkState(
  scope: readonly string[],
  routingPath: readonly string[],
  orderedResponses: readonly AssessmentItemResponse[],
  invalidated: ReadonlySet<string> = EMPTY_INVALIDATED,
  scoringModelVersion: number = COVERAGE_SCORING_MODEL_VERSION,
): WalkState {
  const outcomesByNode = new Map<string, boolean[]>();
  for (const response of orderedResponses) {
    if (invalidated.has(response.item_version_id) || !isScorable(response.scoring_status)) {
      continue;
    }
    const list = outcomesByNode.get(response.node_id);
    if (list) {
      list.push(response.authoritative_correct);
    } else {
      outcomesByNode.set(response.node_id, [response.authoritative_correct]);
    }
  }

  // Re-decided under the record's own version's rules, along its own recorded
  // probe order — never under today's `DEFAULT_WALK_POLICY` (INV-DIAG-4).
  const rules = coverageResolutionRulesFor(scoringModelVersion);
  const probed = adjudicateRecordedWalk(scope, routingPath, outcomesByNode, {
    ...DEFAULT_WALK_POLICY,
    ...rules,
  });

  // Counted off the RECORD, not off the re-decided outcomes. The ceiling bounds
  // what the learner was served, and a rule that stops reading a node's rows part
  // way through does not un-serve the rest of them.
  let served = 0;
  for (const nodeId of routingPath) {
    served += outcomesByNode.get(nodeId)?.length ?? 0;
  }

  return {
    scope: [...scope],
    entry_tier: 0,
    target_tier: 0,
    current: null,
    probed,
    // Re-derived, not stored: the walk stopped at the ceiling iff it served the
    // record's own version's budget. A record that simply ends early (an
    // abandoned administration) is NOT truncation, and the rebuilt state should
    // not claim it was — nor should a record written before there was a ceiling
    // be labelled truncated by today's.
    ceiling_reached: served >= rules.maxItems,
  };
}

/** Recompute the depth-weighted coverage deterministically from the records. */
export function recomputeCoverage(
  scope: readonly string[],
  routingPath: readonly string[],
  orderedResponses: readonly AssessmentItemResponse[],
  invalidated: ReadonlySet<string> = EMPTY_INVALIDATED,
  scoringModelVersion: number = COVERAGE_SCORING_MODEL_VERSION,
): CoverageResult {
  const state = rebuildWalkState(
    scope,
    routingPath,
    orderedResponses,
    invalidated,
    scoringModelVersion,
  );
  return computeCoverage(resolveKnowledgeState(state), scope);
}

/**
 * Per-administration validity (mirrors `measurement.ts` §6):
 * - `valid`        — finalized + within the fault budget; counts toward the gain.
 * - `incomplete`   — never finalized (student quit before frontier-empty); excluded.
 * - `needs_review` — application faults exceeded the threshold; withheld.
 */
export type CoverageAdministrationStatus = "valid" | "incomplete" | "needs_review";

export interface CoverageAdministrationScore {
  administration_id: UUID;
  status: CoverageAdministrationStatus;
  coverage: number;
  coverage_measured: number;
  answered_count: number;
  fault_count: number;
  fault_rate: number;
  /**
   * The per-node resolved state the coverage above is the weighted sum of, in scope
   * order. Empty for an administration that was never finalized, which is the same
   * case that scores `coverage: 0` — an unfinished walk has no resolved state, and
   * an empty list says that where a list of `unknown`s would look like a finding.
   *
   * Carried on the SCORE rather than left to the caller because a paired reader has
   * the records for exactly as long as it takes to compute the pair: the shipped
   * readers (`computeStudentReadiness` over Aurora, the browser client's in-memory
   * `Map`) both hand back a `CoverageMeasurementRecord` and drop the rows. Anything
   * wanting to say WHICH skills moved therefore either re-reads the records through
   * an API that does not exist, or reads it here.
   */
  resolved: readonly NodeResolution[];
  /**
   * In-scope nodes whose measured pass was robust (a clean 2/2), in scope order.
   * The same bar `robustPassNodeIds` reports on a live walk, re-derived from the
   * records — so a consumer gets the same list whether it holds the administration
   * or only its rows (INV-DIAG-4).
   */
  robust_pass_node_ids: readonly string[];
  /**
   * The instrument ceiling cut this administration short. Re-derived by
   * `rebuildWalkState` from the record's own version's budget, so it distinguishes
   * truncation (fail-closed nodes the instrument never reached) from a walk that
   * simply resolved everything.
   */
  ceiling_reached: boolean;
}

export interface CoverageAdministrationRecord {
  administration: AssessmentAdministration;
  responses: readonly AssessmentItemResponse[];
}

/** Score ONE administration's coverage + validity from its immutable records. */
export function scoreCoverageAdministration(input: {
  administration: AssessmentAdministration;
  responses: readonly AssessmentItemResponse[];
  scope: readonly string[];
  invalidatedItemVersionIds?: ReadonlySet<string>;
}): CoverageAdministrationScore {
  const { administration, responses, scope } = input;
  const invalidated = input.invalidatedItemVersionIds ?? EMPTY_INVALIDATED;

  const routingPath = administration.routing_path;
  const finalized = routingPath !== null && administration.submitted_at !== null;

  let fault_count = 0;
  for (const response of responses) {
    if (
      !invalidated.has(response.item_version_id) &&
      FAULT_STATUSES.has(response.scoring_status)
    ) {
      fault_count += 1;
    }
  }
  const answered_count = responses.length;
  const fault_rate = answered_count === 0 ? 0 : fault_count / answered_count;

  // One rebuild, read three ways: the coverage number, the per-node state behind
  // it, and the robustness of each pass. `recomputeCoverage` rebuilds and throws
  // the state away, so calling it here as well would re-derive the same state a
  // second time and — worse — could drift from it.
  const state = finalized
    ? rebuildWalkState(
        scope,
        routingPath,
        responses,
        invalidated,
        administration.scoring_model_version,
      )
    : null;
  const resolved = state === null ? [] : resolveKnowledgeState(state);
  const { coverage, coverage_measured } =
    state === null
      ? { coverage: 0, coverage_measured: 0 }
      : computeCoverage(resolved, scope);

  const status: CoverageAdministrationStatus =
    fault_rate > FAULT_THRESHOLD ? "needs_review" : finalized ? "valid" : "incomplete";

  return {
    administration_id: administration.administration_id,
    status,
    coverage,
    coverage_measured,
    answered_count,
    fault_count,
    fault_rate,
    resolved,
    robust_pass_node_ids: state === null ? [] : robustPassNodeIds(state),
    ceiling_reached: state?.ceiling_reached === true,
  };
}

export type CoverageMeasurementStatus =
  | "computed"
  | "not_comparable"
  | "pre_invalid"
  | "post_invalid";

export interface CoverageMeasurementRecord {
  student_id: UUID;
  status: CoverageMeasurementStatus;
  /** `coverage_post − coverage_pre`; non-null only when `status === "computed"`. */
  coverage_gain: number | null;
  coverage_gain_measured: number | null;
  pre: CoverageAdministrationScore;
  post: CoverageAdministrationScore;
}

function comparabilityStatus(
  pre: AssessmentAdministration,
  post: AssessmentAdministration,
  preScore: CoverageAdministrationScore,
  postScore: CoverageAdministrationScore,
): CoverageMeasurementStatus {
  if (preScore.status !== "valid") {
    return "pre_invalid";
  }
  if (postScore.status !== "valid") {
    return "post_invalid";
  }
  // Pre and post must share the graph blueprint + the resolution/weight model, and
  // be counterbalanced onto distinct forms (Amendment v2 §2.1 / INV-DIAG-5).
  if (pre.blueprint_version !== post.blueprint_version) {
    return "not_comparable";
  }
  if (pre.scoring_model_version !== post.scoring_model_version) {
    return "not_comparable";
  }
  if (pre.form_id === post.form_id) {
    return "not_comparable";
  }
  return "computed";
}

/**
 * Paired pre/post coverage gain, recomputed from immutable records with the §6
 * validity gates + the comparability gates. A student without BOTH a valid,
 * comparable pre and post contributes no gain.
 */
export function computeCoverageMeasurementFromRecords(input: {
  pre: CoverageAdministrationRecord;
  post: CoverageAdministrationRecord;
  scope: readonly string[];
  invalidatedItemVersionIds?: ReadonlySet<string>;
}): CoverageMeasurementRecord {
  const { pre, post, scope } = input;
  const invalidated = input.invalidatedItemVersionIds ?? EMPTY_INVALIDATED;

  if (pre.administration.student_id !== post.administration.student_id) {
    throw new Error(
      `cannot pair a measurement across different students: ${pre.administration.student_id} vs ${post.administration.student_id}`,
    );
  }

  const preScore = scoreCoverageAdministration({
    administration: pre.administration,
    responses: pre.responses,
    scope,
    invalidatedItemVersionIds: invalidated,
  });
  const postScore = scoreCoverageAdministration({
    administration: post.administration,
    responses: post.responses,
    scope,
    invalidatedItemVersionIds: invalidated,
  });

  const status = comparabilityStatus(
    pre.administration,
    post.administration,
    preScore,
    postScore,
  );
  const computed = status === "computed";

  return {
    student_id: pre.administration.student_id,
    status,
    coverage_gain: computed ? postScore.coverage - preScore.coverage : null,
    coverage_gain_measured: computed
      ? postScore.coverage_measured - preScore.coverage_measured
      : null,
    pre: preScore,
    post: postScore,
  };
}
