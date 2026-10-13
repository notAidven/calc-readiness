import { getNodesByScope, getProductNodes, prereqDepth } from "@cr/skill-graph";
import type {
  AssessmentAdministration,
  AssessmentItemResponse,
  AssessmentPurpose,
  ScoringStatus,
  UUID,
} from "@cr/state-schema";
import { describe, expect, it } from "vitest";

import { adjudicate, confirmThresholdFor } from "./adjudicator";
import {
  COVERAGE_SCORING_MODEL_VERSION,
  computeCoverageMeasurementFromRecords,
  coverageResolutionRulesFor,
  isCoverageScoringModelVersion,
  rebuildWalkState,
  recomputeCoverage,
  STATIC_CONSEQUENCE_SCORING_MODEL_VERSION,
  scoreCoverageAdministration,
} from "./coverage-measurement";
import {
  adjudicateRecordedWalk,
  DEFAULT_WALK_POLICY,
  STATIC_CONSEQUENCE_WALK_POLICY,
} from "./walk";

const D1_SCOPE = getNodesByScope("mvp").map((node) => node.id);
const PRODUCT_IDS = getProductNodes().map((node) => node.id);
const STUDENT = "records-student" as UUID;

function administration(
  overrides: Partial<AssessmentAdministration> & {
    purpose: AssessmentPurpose;
    form_id: string;
  },
): AssessmentAdministration {
  return {
    administration_id: `adm-${overrides.form_id}-${overrides.purpose}` as UUID,
    student_id: STUDENT,
    form_version: 1,
    blueprint_version: 2,
    scoring_engine_version: 1,
    scoring_model_version: 2,
    equivalence_checker_version: 1,
    routing_path: null,
    started_at: new Date(0).toISOString(),
    submitted_at: new Date(1).toISOString(),
    ...overrides,
  };
}

let rowSeq = 0;
function row(nodeId: string, status: ScoringStatus): AssessmentItemResponse {
  rowSeq += 1;
  return {
    administration_id: "adm" as UUID,
    item_version_id: `iv-${nodeId}-${rowSeq}`,
    node_id: nodeId,
    raw_answer: "x",
    item_definition_hash: `h-${nodeId}-${rowSeq}`,
    equivalence_checker_version: 1,
    client_correct: status === "correct",
    authoritative_correct: status === "correct",
    scoring_status: status,
    reason_code: status,
  };
}

/** A test-out ace of D1: robust-pass NUM.4 (infers NUM.S/F/2/3) then robust-pass NUM.5. */
const ACE_PATH = ["NUM.4", "NUM.5"];
const ACE_ROWS = [
  row("NUM.4", "correct"),
  row("NUM.4", "correct"),
  row("NUM.5", "correct"),
  row("NUM.5", "correct"),
];

describe("recomputeCoverage from records", () => {
  it("reproduces a test-out ace: full resolved coverage, half measured", () => {
    const result = recomputeCoverage(D1_SCOPE, ACE_PATH, ACE_ROWS);
    // Weights over D1: S1 F1 N2=2 N3=1 N5=2 N4=3, total 10. Measured = N4(3)+N5(2)=5.
    expect(result.coverage).toBeCloseTo(1, 10);
    expect(result.coverage_measured).toBeCloseTo(0.5, 10);
  });

  it("is deterministic across repeated recomputation", () => {
    expect(recomputeCoverage(D1_SCOPE, ACE_PATH, ACE_ROWS)).toEqual(
      recomputeCoverage(D1_SCOPE, ACE_PATH, ACE_ROWS),
    );
  });

  it("excludes faults from the outcomes it re-adjudicates", () => {
    // A fault before two correct still adjudicates a clean 2/2 robust pass on NUM.4.
    const withFault = [row("NUM.4", "scoring_error"), ...ACE_ROWS];
    expect(recomputeCoverage(D1_SCOPE, ACE_PATH, withFault).coverage).toBeCloseTo(1, 10);
  });
});

describe("scoreCoverageAdministration validity gates", () => {
  it("marks a never-finalized administration incomplete (no coverage)", () => {
    const score = scoreCoverageAdministration({
      administration: administration({ purpose: "pre", form_id: "A", routing_path: null }),
      responses: ACE_ROWS,
      scope: D1_SCOPE,
    });
    expect(score.status).toBe("incomplete");
    expect(score.coverage).toBe(0);
  });

  it("withholds an administration over the fault budget as needs_review", () => {
    const faults = Array.from({ length: 10 }, () => row("NUM.4", "scoring_error"));
    const score = scoreCoverageAdministration({
      administration: administration({
        purpose: "pre",
        form_id: "A",
        routing_path: ACE_PATH,
      }),
      responses: [...ACE_ROWS, ...faults],
      scope: D1_SCOPE,
    });
    expect(score.status).toBe("needs_review");
  });

  it("scores a finalized, clean administration valid", () => {
    const score = scoreCoverageAdministration({
      administration: administration({
        purpose: "pre",
        form_id: "A",
        routing_path: ACE_PATH,
      }),
      responses: ACE_ROWS,
      scope: D1_SCOPE,
    });
    expect(score.status).toBe("valid");
    expect(score.coverage).toBeCloseTo(1, 10);
  });
});

describe("computeCoverageMeasurementFromRecords comparability", () => {
  const finalizedPre = {
    administration: administration({
      purpose: "pre",
      form_id: "A",
      routing_path: ["NUM.4"],
    }),
    responses: [row("NUM.4", "correct"), row("NUM.4", "correct")],
  };
  const finalizedPost = {
    administration: administration({
      purpose: "post",
      form_id: "B",
      routing_path: ACE_PATH,
    }),
    responses: ACE_ROWS,
  };

  it("computes a gain for a valid, counterbalanced pair", () => {
    const measurement = computeCoverageMeasurementFromRecords({
      pre: finalizedPre,
      post: finalizedPost,
      scope: D1_SCOPE,
    });
    expect(measurement.status).toBe("computed");
    expect(measurement.coverage_gain).not.toBeNull();
    expect(measurement.coverage_gain).toBeGreaterThan(0);
  });

  it("refuses to compare the same form (counterbalancing broken)", () => {
    const measurement = computeCoverageMeasurementFromRecords({
      pre: finalizedPre,
      post: {
        administration: administration({
          purpose: "post",
          form_id: "A",
          routing_path: ACE_PATH,
        }),
        responses: ACE_ROWS,
      },
      scope: D1_SCOPE,
    });
    expect(measurement.status).toBe("not_comparable");
    expect(measurement.coverage_gain).toBeNull();
  });

  it("refuses to compare across scoring-model versions", () => {
    const measurement = computeCoverageMeasurementFromRecords({
      pre: finalizedPre,
      post: {
        administration: administration({
          purpose: "post",
          form_id: "B",
          routing_path: ACE_PATH,
          scoring_model_version: 99,
        }),
        responses: ACE_ROWS,
      },
      scope: D1_SCOPE,
    });
    expect(measurement.status).toBe("not_comparable");
  });

  it("flags an invalid (incomplete) pre", () => {
    const measurement = computeCoverageMeasurementFromRecords({
      pre: {
        administration: administration({
          purpose: "pre",
          form_id: "A",
          routing_path: null,
        }),
        responses: ACE_ROWS,
      },
      post: finalizedPost,
      scope: D1_SCOPE,
    });
    expect(measurement.status).toBe("pre_invalid");
    expect(measurement.coverage_gain).toBeNull();
  });
});

/**
 * INV-DIAG-4 requires a stored record to replay under the resolution rules it was
 * SCORED with, which is what `scoring_model_version` names. Recompute used to read
 * today's `DEFAULT_WALK_POLICY` unconditionally, so a shipped-policy change
 * silently reached backwards into old records; it now reads the rules the record's
 * own version declares.
 *
 * These tests carry the two halves of that: the differential proving the
 * 2026-07-26 probe-policy amendment (PR #89) was additive and so correctly kept
 * version 2, and the tripwire that makes the NEXT rule change answer the question
 * rather than skip it. See `docs/Contracts_Amendment_Diagnostic_Probe_Policy.md`
 * §3.4.
 */
describe("versioned resolution rules (INV-DIAG-4)", () => {
  const CURRENT = coverageResolutionRulesFor(COVERAGE_SCORING_MODEL_VERSION);

  /**
   * Knobs `WalkPolicy` carries that recompute deliberately does NOT register,
   * each with the reason it is exempt. Both are probe ORDERING, which Amendment
   * v2 §4.2 declares a tunable policy: `rebuildWalkState` never reproduces which
   * node was chosen next — it reads the order off `routing_path` — so changing
   * either cannot make a stored record replay differently.
   *
   * Named rather than left out of the population, and asserted in both
   * directions below, because a knob that is exempt and a knob that was
   * forgotten look identical from outside this test.
   */
  const ORDERING_ONLY: readonly string[] = ["foundationDomainSpan", "perDomainTarget"];

  it("registers every ADJUDICATION knob the shipped policy carries", () => {
    // The tripwire, derived from `DEFAULT_WALK_POLICY` rather than from a list
    // written down here: a new knob that decides a node is in the population the
    // moment it exists, so it cannot be added and left unregistered.
    //
    // If this fails, a rule recompute depends on has moved, and exactly one of
    // two things must happen before it can land: bump
    // `COVERAGE_SCORING_MODEL_VERSION` and register the new rules alongside the
    // frozen old ones (Route A), or carry a written additivity proof over the
    // frozen record population (Route B) — see
    // `docs/Contracts_Amendment_Diagnostic_Probe_Policy.md` §3.4.1. Silently
    // re-pinning is how INV-DIAG-4 broke the first time.
    const adjudicationKnobs = Object.keys(DEFAULT_WALK_POLICY).filter(
      (key) => !ORDERING_ONLY.includes(key),
    );
    // A floor, so an exemption list that grew until it swallowed the policy
    // cannot leave this asserting over nothing.
    expect(adjudicationKnobs.length).toBeGreaterThanOrEqual(4);
    expect([...adjudicationKnobs].sort()).toEqual(Object.keys(CURRENT).sort());
    for (const key of adjudicationKnobs) {
      expect(CURRENT[key as keyof typeof CURRENT], key).toBe(
        DEFAULT_WALK_POLICY[key as keyof typeof DEFAULT_WALK_POLICY],
      );
    }
  });

  it("the ordering exemptions still exist, and are still exempt", () => {
    // Fails both ways. A renamed or deleted knob cannot sit in the list forever
    // exempting nothing, and a knob that starts being registered cannot go on
    // being excused as ordering-only.
    expect(ORDERING_ONLY.length).toBeGreaterThan(0);
    for (const key of ORDERING_ONLY) {
      expect(Object.keys(DEFAULT_WALK_POLICY), key).toContain(key);
      expect(Object.keys(CURRENT), key).not.toContain(key);
    }
  });

  it("knows every registered version is a coverage model, and that v1 is not", () => {
    // The predicate `measurement-read.ts` dispatches on. Asserted over the same
    // population the registry holds, so a version can be registered without being
    // taught to the reader only if this fails first.
    for (const version of [
      STATIC_CONSEQUENCE_SCORING_MODEL_VERSION,
      COVERAGE_SCORING_MODEL_VERSION,
    ]) {
      expect(isCoverageScoringModelVersion(version), String(version)).toBe(true);
    }
    // v1 is the difficulty-aware θ model and must keep routing to `computeMeasurement`.
    expect(isCoverageScoringModelVersion(1)).toBe(false);
    expect(isCoverageScoringModelVersion(99)).toBe(false);
  });

  it("falls back to the current rules for a version it does not know", () => {
    // A v1 θ record (or a future model) is not a coverage administration; the
    // dispatch + comparability gates are what reject it, not this lookup.
    expect(coverageResolutionRulesFor(1)).toEqual(CURRENT);
    expect(coverageResolutionRulesFor(99)).toEqual(CURRENT);
  });

  /**
   * The other half of Route A, and the half a bare bump does not buy.
   *
   * §3.4.1 requires the OUTGOING entry to be left in place, because that is what
   * keeps a record written before the change re-deciding under the rules it was
   * scored with. Bumping the version while quietly re-pinning the old entry to
   * today's values would satisfy the drift test above — `CURRENT` would still
   * match `DEFAULT_WALK_POLICY` — and would silently re-adjudicate every stored
   * record, which is the exact failure INV-DIAG-4 exists to prevent.
   *
   * So version 2's rules are asserted as LITERALS here rather than derived from
   * anything. They label records that exist; nothing may move them.
   */
  const VERSION_2_AS_ADMINISTERED = {
    confirmScopeFraction: 7 / 62,
    maxItems: 70,
    livePassClosure: false,
    liveFailCone: false,
    liveConsequenceFrom: 0,
    confirmBudget: Number.POSITIVE_INFINITY,
    inferOnMajorityPass: false,
  };

  it("keeps the outgoing version's rules frozen at what it was administered under", () => {
    expect(STATIC_CONSEQUENCE_SCORING_MODEL_VERSION).toBe(2);
    expect(coverageResolutionRulesFor(STATIC_CONSEQUENCE_SCORING_MODEL_VERSION)).toEqual(
      VERSION_2_AS_ADMINISTERED,
    );
  });

  it("the current version is genuinely a NEW entry, not a re-pin of the old one", () => {
    // The floor under the test above. If a future change bumps the version but
    // leaves both entries identical, the registry has two names for one rule set
    // and the bump bought nothing — every record replays under the new rules
    // whatever it is stamped with, which is indistinguishable from not having
    // versioned at all.
    expect(COVERAGE_SCORING_MODEL_VERSION).toBeGreaterThan(
      STATIC_CONSEQUENCE_SCORING_MODEL_VERSION,
    );
    expect(CURRENT).not.toEqual(VERSION_2_AS_ADMINISTERED);
    // And name the difference, so this cannot be satisfied by an unrelated knob
    // drifting while the tail cut is quietly reverted.
    expect(CURRENT.livePassClosure).toBe(true);
    expect(CURRENT.liveConsequenceFrom).toBe(20);
    expect(VERSION_2_AS_ADMINISTERED.livePassClosure).toBe(false);
  });

  it("a record stamped 2 re-decides under version 2's rules, not today's", () => {
    // The property the two tests above exist to protect, measured end to end on a
    // record rather than on the registry: the same rows, stamped with the two
    // versions, must reach DIFFERENT states — otherwise the freeze is decorative
    // and nothing would notice version 2's entry being re-pinned.
    //
    // The 62-node scope, because the confirmation threshold rounds to 0 on D1 and
    // the two rule sets coincide there by construction — which is the whole
    // reason the D1 walk is bit-identical across this change, and so exactly the
    // wrong scope to look for a divergence on.
    //
    // Root-first order and all-correct rows, so that by the time the fold is past
    // the twentieth item the deeper nodes have had their prerequisites credited
    // and their LIVE closure has collapsed. That is the case the two rule sets
    // disagree about: version 2 still buys a confirming item for a cascade that
    // has already happened, version 3 does not.
    const scope = PRODUCT_IDS;
    const path = [...scope].sort(
      (a, b) => prereqDepth(a) - prereqDepth(b) || a.localeCompare(b),
    );
    const rows = path.flatMap((nodeId) => [row(nodeId, "correct"), row(nodeId, "correct")]);
    const underV2 = rebuildWalkState(
      scope,
      path,
      rows,
      undefined,
      STATIC_CONSEQUENCE_SCORING_MODEL_VERSION,
    );
    const underV3 = rebuildWalkState(
      scope,
      path,
      rows,
      undefined,
      COVERAGE_SCORING_MODEL_VERSION,
    );
    // Same rows, same order, same scope: only the stamped rules differ.
    expect(Object.keys(underV2.probed).sort()).toEqual(Object.keys(underV3.probed).sort());
    expect(underV2.probed).not.toEqual(underV3.probed);
    // A floor under that inequality, so it cannot be met by one stray node, and
    // so the divergence is visibly the tail cut rather than noise: count nodes
    // version 2 spent two items on that version 3 decided on one.
    const relieved = path.filter(
      (id) =>
        (underV2.probed[id]?.outcomes.length ?? 0) === 2 &&
        (underV3.probed[id]?.outcomes.length ?? 0) === 1,
    );
    expect(relieved.length).toBeGreaterThanOrEqual(5);
  });

  it("a record stamped 2 replays exactly as the pre-cut build replayed it", () => {
    // "No existing placement becomes unreproducible" is the claim the tail cut has
    // to make before it can land, and it is the one most worth measuring rather
    // than asserting: it is the difference between a version bump and a data
    // migration.
    //
    // The pre-cut build recomputed by spreading version 2's registered rules over
    // the then-current `DEFAULT_WALK_POLICY` — which is exactly
    // `STATIC_CONSEQUENCE_WALK_POLICY`, frozen for this purpose. So folding the
    // same record under that literal reproduces the old build's answer without
    // needing the old build, and today's recompute has to agree with it node for
    // node.
    const scope = PRODUCT_IDS;
    const path = [...scope].sort(
      (a, b) => prereqDepth(a) - prereqDepth(b) || a.localeCompare(b),
    );
    const outcomes = new Map(
      path.map((id, index) => [id, index % 3 === 0 ? [false, true, true] : [true, true]]),
    );
    const rows = path.flatMap((nodeId) =>
      (outcomes.get(nodeId) ?? []).map((correct) =>
        row(nodeId, correct ? "correct" : "incorrect"),
      ),
    );

    const asThePreCutBuildDidIt = adjudicateRecordedWalk(
      scope,
      path,
      outcomes,
      STATIC_CONSEQUENCE_WALK_POLICY,
    );
    const today = rebuildWalkState(
      scope,
      path,
      rows,
      undefined,
      STATIC_CONSEQUENCE_SCORING_MODEL_VERSION,
    );
    expect(today.probed).toEqual(asThePreCutBuildDidIt);

    // A floor, so an empty record cannot satisfy the equality, and a control so
    // it cannot be satisfied by the fold ignoring its policy argument.
    expect(Object.keys(today.probed).length).toBe(scope.length);
    expect(adjudicateRecordedWalk(scope, path, outcomes, DEFAULT_WALK_POLICY)).not.toEqual(
      asThePreCutBuildDidIt,
    );
  });

  /**
   * Every per-node outcome sequence a FINALIZED pre-amendment record can hold.
   * Pre-amendment `adjudicate` never decided on one item, so the walk never left a
   * node behind with a single outcome, and there was no ceiling to cut it short;
   * it stopped a node at two items only on a clean sweep, so `[T,T,*]` is
   * unreachable. That leaves exactly these seven.
   */
  const PRE_AMENDMENT_TERMINAL: readonly boolean[][] = [
    [true, true],
    [true, false, true],
    [true, false, false],
    [false, true, true],
    [false, true, false],
    [false, false, true],
    [false, false, false],
  ];

  const CONSEQUENCES = [
    { passClosure: 0, failCone: 0 },
    { passClosure: 1, failCone: 0 },
    { passClosure: 0, failCone: 1 },
    { passClosure: 6, failCone: 6 },
    { passClosure: 7, failCone: 7 },
    { passClosure: 49, failCone: 49 },
  ];

  it("PR #89 is additive: a completed pre-amendment node replays byte-identically", () => {
    // The proof that version 2 was the right answer, and it is the STRONG leg —
    // a property of the record shape, not of which scope happens to be live. The
    // amended rule reads `consequence`/`confirmThreshold` only at itemCount 1, so
    // on every sequence a completed record can contain it is the ratified 2-of-3
    // function, whatever the scope grows to.
    for (const outcomes of PRE_AMENDMENT_TERMINAL) {
      const ratified = adjudicate(outcomes);
      expect(ratified.done, JSON.stringify(outcomes)).toBe(true);
      for (const consequence of CONSEQUENCES) {
        for (const threshold of [0, 1, 3, 7, 11, 999]) {
          expect(adjudicate(outcomes, consequence, threshold)).toEqual(ratified);
        }
      }
    }
  });

  it("PR #89's added `infers` licenses nothing a pre-amendment record did not", () => {
    // Pre-amendment records carry only `robust`, and `licensesInference` reads
    // `infers ?? robust`. The two agree on every completed sequence, so replaying
    // an old record cannot newly credit a prerequisite closure.
    for (const outcomes of PRE_AMENDMENT_TERMINAL) {
      const decision = adjudicate(outcomes, { passClosure: 49, failCone: 49 }, 7);
      expect(decision.done && decision.infers, JSON.stringify(outcomes)).toBe(
        decision.done && decision.robust,
      );
    }
  });

  it("the one bound: a node left with a SINGLE surviving outcome does diverge", () => {
    // Pins the documented bound rather than hiding it. A completed pre-amendment
    // walk cannot produce this, but invalidating rows out of a stored record can,
    // and on a scope wide enough for a non-zero threshold the two rule sets then
    // disagree: the ratified rule leaves the node undecided (fail-closed), the
    // amended one decides it on that one item.
    expect(adjudicate([true])).toEqual({ done: false });
    expect(adjudicate([true], { passClosure: 0, failCone: 0 }, 7)).toMatchObject({
      done: true,
      result: "passed",
      infers: true,
    });
    // ...and it cannot bite on any scope where the threshold rounds to 0, which is
    // every scope the live instrument has ever served.
    expect(adjudicate([true], { passClosure: 0, failCone: 0 }, 0)).toEqual({
      done: false,
    });
  });

  /**
   * The same question asked of the NEXT candidate rule, because the answer turns
   * out to be different and that difference is what it costs to ship.
   *
   * A live consequence is always <= the static one (it counts the same closure
   * minus the part already resolved). So on every sequence a DECIDED static-rule
   * node can hold, the two rule sets return an identical `Adjudication`: at two
   * items or more `adjudicate` never reads `consequence` at all, and a node the
   * static rule decided on ONE item had `reach < threshold`, which a smaller
   * live reach also satisfies.
   *
   * What breaks it is the undecided case, and unlike PR #89's bound that one is
   * not confined to invalidation — the instrument ceiling can land mid-node, so a
   * FINALIZED record can hold a node with one outcome and no result. See
   * `docs/Diagnostic_Tail_Policy_Measurement.md` §6.
   */
  const STATIC_DECIDED_SEQUENCES: readonly boolean[][] = [
    [true],
    [false],
    ...PRE_AMENDMENT_TERMINAL,
  ];

  it("a live consequence is additive over every DECIDED static-rule node", () => {
    for (const outcomes of STATIC_DECIDED_SEQUENCES) {
      for (const staticReach of CONSEQUENCES) {
        for (const threshold of [0, 1, 3, 7, 11]) {
          const underStatic = adjudicate(outcomes, staticReach, threshold);
          if (!underStatic.done) {
            continue;
          }
          // Every live reading of that node's consequence, up to the static one.
          for (let pass = 0; pass <= staticReach.passClosure; pass++) {
            for (let fail = 0; fail <= staticReach.failCone; fail++) {
              expect(
                adjudicate(outcomes, { passClosure: pass, failCone: fail }, threshold),
                `${JSON.stringify(outcomes)} @${threshold} live ${pass}/${fail}`,
              ).toEqual(underStatic);
            }
          }
        }
      }
    }
  });

  it("the bound that makes a live consequence a Route A change, not a Route B one", () => {
    // A node the ceiling left with ONE outcome and no decision. The static rule
    // holds it undecided and it resolves fail-closed; a live rule whose cascade
    // has already happened decides it on that item. A finalized record can
    // contain this, so the divergence is not confined to invalidation the way
    // PR #89's was, and the population is therefore NOT frozen.
    const big = { passClosure: 49, failCone: 49 };
    expect(adjudicate([true], big, 7)).toEqual({ done: false });
    expect(adjudicate([true], { passClosure: 0, failCone: 49 }, 7)).toMatchObject({
      done: true,
      result: "passed",
      infers: true,
    });
  });

  it("the live D1 scope confirms everything, so the amendment is inert on it", () => {
    expect(confirmThresholdFor(D1_SCOPE.length, CURRENT.confirmScopeFraction)).toBe(0);
    // The boundary, recorded so widening the scope is a visible decision: a
    // 9-node scope is the smallest at which the amended rule can decide a node on
    // one item, and 62 is the full product graph the sweep tuned against.
    expect(confirmThresholdFor(8, CURRENT.confirmScopeFraction)).toBe(0);
    expect(confirmThresholdFor(9, CURRENT.confirmScopeFraction)).toBe(1);
    expect(confirmThresholdFor(62, CURRENT.confirmScopeFraction)).toBe(7);
  });

  it("re-derives truncation from the record's own ceiling, not today's", () => {
    // `ceiling_reached` is the second thing #89 changed under a record's feet: a
    // record written before there was any ceiling would be labelled truncated by
    // today's 70. Inert on real records (pre-amendment D1 tops out at 18 items),
    // but the budget now comes from the version's rules rather than a hard-coded
    // read of the shipped policy.
    const atCeiling = Array.from({ length: CURRENT.maxItems }, () =>
      row("NUM.4", "correct"),
    );
    expect(rebuildWalkState(D1_SCOPE, ["NUM.4"], atCeiling).ceiling_reached).toBe(true);
    expect(rebuildWalkState(D1_SCOPE, ["NUM.4"], atCeiling.slice(1)).ceiling_reached).toBe(
      false,
    );
  });

  it("recomputes an administration under the version stamped on it", () => {
    const score = scoreCoverageAdministration({
      administration: administration({
        purpose: "pre",
        form_id: "A",
        routing_path: ACE_PATH,
        scoring_model_version: COVERAGE_SCORING_MODEL_VERSION,
      }),
      responses: ACE_ROWS,
      scope: D1_SCOPE,
    });
    expect(score.coverage).toBeCloseTo(
      recomputeCoverage(
        D1_SCOPE,
        ACE_PATH,
        ACE_ROWS,
        undefined,
        COVERAGE_SCORING_MODEL_VERSION,
      ).coverage,
      10,
    );
  });
});
