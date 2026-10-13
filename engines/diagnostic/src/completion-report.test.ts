import { getNodesByScope } from "@cr/skill-graph";
import type {
  AssessmentAdministration,
  AssessmentItemResponse,
  AssessmentPurpose,
  ScoringStatus,
  UUID,
} from "@cr/state-schema";
import { describe, expect, it } from "vitest";

import { buildCompletionReport, type CompletionRetakeEvidence } from "./completion-report";
import {
  COVERAGE_SCORING_MODEL_VERSION,
  type CoverageAdministrationRecord,
  computeCoverageMeasurementFromRecords,
  coverageResolutionRulesFor,
  scoreCoverageAdministration,
} from "./coverage-measurement";

/**
 * The completion ceremony's selector, driven through the REAL record pipeline
 * rather than hand-built evidence objects wherever the claim is about what the
 * instrument produced.
 *
 * Every case here is a ruling from
 * `docs/superpowers/specs/2026-07-31-game-completion-ceremony-design.md` and names
 * the ruling it pins, because the whole value of this module is that the rulings
 * are checkable rather than remembered.
 */

const D1_SCOPE = getNodesByScope("mvp").map((node) => node.id);
const STUDENT = "completion-student" as UUID;

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
    scoring_model_version: COVERAGE_SCORING_MODEL_VERSION,
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

const hit = (nodeId: string) => row(nodeId, "correct");
const miss = (nodeId: string) => row(nodeId, "incorrect");

function record(
  purpose: AssessmentPurpose,
  form_id: string,
  path: readonly string[],
  responses: readonly AssessmentItemResponse[],
): CoverageAdministrationRecord {
  return {
    administration: administration({ purpose, form_id, routing_path: [...path] }),
    responses,
  };
}

/** The retake's evidence as the live engine hands it over, from its records. */
function evidenceOf(post: CoverageAdministrationRecord): CompletionRetakeEvidence {
  const score = scoreCoverageAdministration({
    administration: post.administration,
    responses: post.responses,
    scope: D1_SCOPE,
  });
  return {
    resolved: score.resolved,
    robust_pass_node_ids: score.robust_pass_node_ids,
    ceiling_reached: score.ceiling_reached,
  };
}

function measure(pre: CoverageAdministrationRecord, post: CoverageAdministrationRecord) {
  return computeCoverageMeasurementFromRecords({ pre, post, scope: D1_SCOPE });
}

/**
 * A learner who could only do signed numbers at entry: NUM.S clean, NUM.2 missed
 * outright (three items, because two misses defer to a confirming third), which
 * leaves everything above NUM.2 unreached.
 */
const weakEntry = () =>
  record(
    "pre",
    "A",
    ["NUM.S", "NUM.2"],
    [hit("NUM.S"), hit("NUM.S"), miss("NUM.2"), miss("NUM.2"), miss("NUM.2")],
  );

/** A retake that clears the ladder cleanly: robust NUM.4 tests out beneath it, robust NUM.5. */
const aceRetake = (form = "B") =>
  record(
    "post",
    form,
    ["NUM.4", "NUM.5"],
    [hit("NUM.4"), hit("NUM.4"), hit("NUM.5"), hit("NUM.5")],
  );

describe("the growth ceremony (D-END7)", () => {
  const report = buildCompletionReport({
    retake: evidenceOf(aceRetake()),
    measurement: measure(weakEntry(), aceRetake()),
  });

  it("is chosen when the pair is comparable", () => {
    expect(measure(weakEntry(), aceRetake()).status).toBe("computed");
    expect(report.kind).toBe("growth");
    expect(report.standing_reason).toBeNull();
  });

  it("names the robustly-held skills the baseline did not already hold", () => {
    // NUM.4 and NUM.5 are the two the retake decided on a clean 2/2. NUM.S was
    // already held at entry, so it is confirmed and not newly held.
    expect([...report.named_node_ids].sort()).toEqual(["NUM.4", "NUM.5"]);
    expect(report.named_node_ids).not.toContain("NUM.S");
  });

  it("counts every pass in the aggregate, including the ones it may not name", () => {
    // The retake resolves all six: two measured, four credited by test-out.
    expect(report.confirmed_node_ids).toHaveLength(D1_SCOPE.length);
    expect(report.named_node_ids.length).toBeLessThan(report.confirmed_node_ids.length);
    for (const named of report.named_node_ids) {
      expect(report.confirmed_node_ids).toContain(named);
    }
  });

  it("shows the aggregate delta as a supporting line rather than suppressing it", () => {
    expect(report.coverage).not.toBeNull();
    const coverage = report.coverage as NonNullable<typeof report.coverage>;
    expect(coverage.post).toBeCloseTo(1, 10);
    expect(coverage.gain).toBeCloseTo(coverage.post - coverage.pre, 10);
    expect(coverage.gain).toBeGreaterThan(0);
  });

  it("never names a skill on an INFERRED pass, however the walk credited it", () => {
    // NUM.S/F/2/3 are all resolved `passed` here, credited by NUM.4's robust pass.
    // They are in the aggregate and none of them may be named: nothing was asked.
    const inferred = ["NUM.F", "NUM.2", "NUM.3"];
    for (const nodeId of inferred) {
      expect(report.confirmed_node_ids).toContain(nodeId);
      expect(report.named_node_ids).not.toContain(nodeId);
    }
  });

  it("never names a skill on a NON-ROBUST pass", () => {
    // NUM.5 decided 2-of-3 rather than a clean 2/2: still a pass, still in the
    // aggregate, and below the bar the record sets for naming one.
    const shaky = record(
      "post",
      "B",
      ["NUM.4", "NUM.5"],
      [hit("NUM.4"), hit("NUM.4"), miss("NUM.5"), hit("NUM.5"), hit("NUM.5")],
    );
    const shakyReport = buildCompletionReport({
      retake: evidenceOf(shaky),
      measurement: measure(weakEntry(), shaky),
    });
    expect(shakyReport.confirmed_node_ids).toContain("NUM.5");
    expect(shakyReport.named_node_ids).not.toContain("NUM.5");
    expect(shakyReport.named_node_ids).toContain("NUM.4");
  });
});

describe("the standing-city ceremony (D-END5)", () => {
  it("is what a learner with no baseline gets, and it still names their cold passes", () => {
    const report = buildCompletionReport({
      retake: evidenceOf(aceRetake()),
      measurement: null,
    });
    expect(report.kind).toBe("standing");
    expect(report.standing_reason).toBe("no_baseline");
    expect([...report.named_node_ids].sort()).toEqual(["NUM.4", "NUM.5"]);
    expect(report.confirmed_node_ids).toHaveLength(D1_SCOPE.length);
  });

  it("makes no pre/post claim at all", () => {
    expect(
      buildCompletionReport({ retake: evidenceOf(aceRetake()), measurement: null })
        .coverage,
    ).toBeNull();
  });

  it("catches an uncounterbalanced pair rather than reporting a number for it", () => {
    // Same form for both sittings: the learner would be re-answering items they
    // have already seen, so the gate refuses the pair.
    const post = aceRetake("A");
    expect(measure(weakEntry(), post).status).toBe("not_comparable");
    const report = buildCompletionReport({
      retake: evidenceOf(post),
      measurement: measure(weakEntry(), post),
    });
    expect(report.kind).toBe("standing");
    expect(report.standing_reason).toBe("not_comparable");
    expect(report.coverage).toBeNull();
  });

  it("catches a baseline that was never finalized", () => {
    const unfinished: CoverageAdministrationRecord = {
      administration: administration({ purpose: "pre", form_id: "A", routing_path: null }),
      responses: [hit("NUM.S")],
    };
    const post = aceRetake();
    const report = buildCompletionReport({
      retake: evidenceOf(post),
      measurement: measure(unfinished, post),
    });
    expect(report.kind).toBe("standing");
    expect(report.standing_reason).toBe("pre_invalid");
  });
});

describe("truncation is never reported as a loss (D-END10)", () => {
  /**
   * A walk that spent the whole ceiling on one node. `rebuildWalkState` re-derives
   * `ceiling_reached` as "served the record's own version's budget", so this is a
   * truncated administration by the same rule the live engine applied.
   */
  const ceiling = coverageResolutionRulesFor(COVERAGE_SCORING_MODEL_VERSION).maxItems;
  const spentBudget = (purpose: AssessmentPurpose, form: string) =>
    record(
      purpose,
      form,
      ["NUM.S"],
      Array.from({ length: ceiling }, () => hit("NUM.S")),
    );

  it("the fixture really does trip the ceiling, and is otherwise a valid pair", () => {
    const post = spentBudget("post", "B");
    const score = scoreCoverageAdministration({
      administration: post.administration,
      responses: post.responses,
      scope: D1_SCOPE,
    });
    expect(score.ceiling_reached).toBe(true);
    expect(score.status).toBe("valid");
    expect(measure(weakEntry(), post).status).toBe("computed");
  });

  it("falls back to the standing ceremony when the RETAKE was truncated", () => {
    const post = spentBudget("post", "B");
    const report = buildCompletionReport({
      retake: evidenceOf(post),
      measurement: measure(weakEntry(), post),
    });
    expect(report.kind).toBe("standing");
    expect(report.standing_reason).toBe("truncated");
    expect(report.coverage).toBeNull();
  });

  it("falls back when the BASELINE was truncated, so a budget artifact cannot read as growth", () => {
    // The mirror of the ruling: the pre's unreached nodes resolve not-passed, so
    // every one of them is free to look "newly held" at post.
    const pre = spentBudget("pre", "A");
    const post = aceRetake();
    expect(measure(pre, post).status).toBe("computed");
    expect(measure(pre, post).pre.ceiling_reached).toBe(true);
    const report = buildCompletionReport({
      retake: evidenceOf(post),
      measurement: measure(pre, post),
    });
    expect(report.kind).toBe("standing");
    expect(report.standing_reason).toBe("truncated");
  });
});

describe("what the retake missed (D-END8b)", () => {
  // Three misses on NUM.4, because two defer to a confirming third; NUM.2 clean.
  const halfRetake = record(
    "post",
    "B",
    ["NUM.4", "NUM.2"],
    [miss("NUM.4"), miss("NUM.4"), miss("NUM.4"), hit("NUM.2"), hit("NUM.2")],
  );

  it("lists a MEASURED miss, so the door to its practice can be opened", () => {
    const report = buildCompletionReport({
      retake: evidenceOf(halfRetake),
      measurement: null,
    });
    expect(report.unconfirmed_node_ids).toContain("NUM.4");
  });

  it("never lists a node the instrument did not ask about", () => {
    // NUM.5 was never probed here, so fail-closed resolution leaves it unknown or
    // pruned. Naming it would be the instrument's budget talking, not the learner.
    const report = buildCompletionReport({
      retake: evidenceOf(halfRetake),
      measurement: null,
    });
    expect(report.unconfirmed_node_ids).not.toContain("NUM.5");
    expect(report.confirmed_node_ids).not.toContain("NUM.5");
    // ...and the population is non-empty, so the assertion above is not passing
    // over an empty list.
    expect(report.unconfirmed_node_ids.length).toBeGreaterThan(0);
  });
});

describe("the report's shape carries nothing a ceremony may not read (D-END6)", () => {
  it("has no placement field, on either branch", () => {
    for (const measurement of [null, measure(weakEntry(), aceRetake())]) {
      const report = buildCompletionReport({
        retake: evidenceOf(aceRetake()),
        measurement,
      });
      expect(Object.keys(report).sort()).toEqual([
        "confirmed_node_ids",
        "coverage",
        "kind",
        "named_node_ids",
        "standing_reason",
        "unconfirmed_node_ids",
      ]);
    }
  });
});
