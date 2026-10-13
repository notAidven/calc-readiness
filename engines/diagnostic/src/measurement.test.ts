import type {
  AssessmentAdministration,
  AssessmentItemResponse,
  AssessmentItemSubmission,
  AssessmentPurpose,
  ScoringStatus,
} from "@cr/state-schema";
import { describe, expect, it } from "vitest";

import {
  type AdministrationProgress,
  type CompletedDiagnostic,
  createAdaptiveDiagnosticEngine,
  type DiagnosticAdministrationStore,
  type DiagnosticItem,
  type DiagnosticItemBank,
  type DiagnosticResponseScorer,
  type NewAdministration,
  type PlacementWriter,
} from "./engine";
import {
  computeMeasurement,
  recomputeAbilityScore,
  scoreAdministration,
} from "./measurement";
import { createD1MultistageSpec, getStage, type MultistageSpec } from "./routing";

// --- Fakes for the engine-parity path (mirrors engine.test.ts) ---------------

class FakeStore implements DiagnosticAdministrationStore {
  private readonly administrations = new Map<string, AssessmentAdministration>();
  private readonly progress = new Map<string, AdministrationProgress>();
  private seq = 0;

  async createAdministration(input: NewAdministration): Promise<AssessmentAdministration> {
    this.seq += 1;
    const administration: AssessmentAdministration = {
      administration_id: `adm-${this.seq}`,
      student_id: input.student_id,
      purpose: input.purpose,
      form_id: input.form_id,
      form_version: input.form_version,
      blueprint_version: input.blueprint_version,
      scoring_engine_version: input.scoring_engine_version,
      scoring_model_version: input.scoring_model_version,
      equivalence_checker_version: input.equivalence_checker_version,
      routing_path: null,
      started_at: "2026-07-20T00:00:00.000Z",
      submitted_at: null,
    };
    this.administrations.set(administration.administration_id, administration);
    return administration;
  }

  async getAdministration(administrationId: string): Promise<AssessmentAdministration> {
    const administration = this.administrations.get(administrationId);
    if (!administration) {
      throw new Error(`unknown administration ${administrationId}`);
    }
    return administration;
  }

  async getProgress(administrationId: string): Promise<AdministrationProgress | null> {
    return this.progress.get(administrationId) ?? null;
  }

  async saveProgress(progress: AdministrationProgress): Promise<void> {
    this.progress.set(progress.administration_id, progress);
  }

  async finalizeAdministration(input: {
    administration_id: string;
    routing_path: readonly string[];
  }): Promise<AssessmentAdministration> {
    const administration = this.administrations.get(input.administration_id);
    if (!administration) {
      throw new Error(`unknown administration ${input.administration_id}`);
    }
    const finalized: AssessmentAdministration = {
      ...administration,
      routing_path: input.routing_path,
      submitted_at: "2026-07-20T00:10:00.000Z",
    };
    this.administrations.set(finalized.administration_id, finalized);
    return finalized;
  }
}

const itemBank: DiagnosticItemBank = {
  selectItem(slot, formId) {
    return {
      item_version_id: `${formId}:${slot.node_id}:L${slot.difficulty}`,
      node_id: slot.node_id,
      difficulty: slot.difficulty,
      item_definition_hash: `hash:${slot.node_id}:L${slot.difficulty}`,
    };
  },
};

function makeScorer(
  isCorrect: (itemVersionId: string) => boolean,
  log: AssessmentItemResponse[],
): DiagnosticResponseScorer {
  return {
    async scoreAndAppend(submission) {
      const correct = isCorrect(submission.item_version_id);
      const response: AssessmentItemResponse = {
        ...submission,
        authoritative_correct: correct,
        scoring_status: correct ? "correct" : "incorrect",
        reason_code: correct ? "correct" : "value_mismatch",
      };
      log.push(response);
      return response;
    },
  };
}

class FakePlacementWriter implements PlacementWriter {
  async writePlacement(): Promise<void> {}
}

function toSubmissions(
  administrationId: string,
  items: readonly DiagnosticItem[],
): AssessmentItemSubmission[] {
  return items.map((item) => ({
    administration_id: administrationId,
    item_version_id: item.item_version_id,
    node_id: item.node_id,
    raw_answer: "x",
    item_definition_hash: item.item_definition_hash,
    equivalence_checker_version: 1,
    client_correct: false,
  }));
}

function baseInput(purpose: AssessmentPurpose, formId: string): NewAdministration {
  return {
    student_id: "s1",
    purpose,
    form_id: formId,
    form_version: 1,
    blueprint_version: 1,
    scoring_engine_version: 1,
    scoring_model_version: 1,
    equivalence_checker_version: 1,
  };
}

interface DiagnosticRun {
  completed: CompletedDiagnostic;
  log: AssessmentItemResponse[];
}

/** Drive the real engine end-to-end, capturing the append-only response log in served order. */
async function runDiagnostic(
  spec: MultistageSpec,
  opts: {
    purpose?: AssessmentPurpose;
    formId?: string;
    isCorrect: (itemVersionId: string) => boolean;
  },
): Promise<DiagnosticRun> {
  const store = new FakeStore();
  const log: AssessmentItemResponse[] = [];
  const engine = createAdaptiveDiagnosticEngine({
    spec,
    itemBank,
    store,
    scorer: makeScorer(opts.isCorrect, log),
    placementWriter: new FakePlacementWriter(),
  });

  const started = await engine.start(baseInput(opts.purpose ?? "pre", opts.formId ?? "A"));
  const admId = started.administration.administration_id;
  let advance = await engine.submitStage(admId, toSubmissions(admId, started.items));
  while (!advance.complete) {
    advance = await engine.submitStage(admId, toSubmissions(admId, advance.items));
  }
  const completed = await engine.finalize(admId);
  return { completed, log };
}

// --- Helpers for synthetic immutable records ---------------------------------

interface SlotResult {
  correct?: boolean;
  status?: ScoringStatus;
  item_version_id?: string;
}

/** Build a full one-row-per-served-slot response log (served order) for a given path. */
function buildResponses(
  spec: MultistageSpec,
  path: readonly string[],
  resolve: (ctx: {
    stageId: string;
    node_id: string;
    difficulty: number;
    index: number;
  }) => SlotResult,
): AssessmentItemResponse[] {
  const out: AssessmentItemResponse[] = [];
  let index = 0;
  for (const stageId of path) {
    const stage = getStage(spec, stageId);
    for (const slot of stage.slots) {
      const result = resolve({
        stageId,
        node_id: slot.node_id,
        difficulty: slot.difficulty,
        index,
      });
      const correct = result.correct ?? false;
      const status: ScoringStatus = result.status ?? (correct ? "correct" : "incorrect");
      out.push({
        administration_id: "adm",
        item_version_id:
          result.item_version_id ?? `${stageId}:${slot.node_id}:L${slot.difficulty}`,
        node_id: slot.node_id,
        raw_answer: "x",
        item_definition_hash: `hash:${slot.node_id}`,
        equivalence_checker_version: 1,
        client_correct: false,
        authoritative_correct: correct,
        scoring_status: status,
        reason_code: correct ? "correct" : "value_mismatch",
      });
      index += 1;
    }
  }
  return out;
}

function makeAdmin(
  overrides: Partial<AssessmentAdministration> = {},
): AssessmentAdministration {
  return {
    administration_id: "adm",
    student_id: "s1",
    purpose: "pre",
    form_id: "A",
    form_version: 1,
    blueprint_version: 1,
    scoring_engine_version: 1,
    scoring_model_version: 1,
    equivalence_checker_version: 1,
    routing_path: ["R", "H"],
    started_at: "2026-07-20T00:00:00.000Z",
    submitted_at: "2026-07-20T00:10:00.000Z",
    ...overrides,
  };
}

// --- Tests -------------------------------------------------------------------

describe("recomputeAbilityScore (reproducibility from immutable records, INV-DIAG-4)", () => {
  it("matches the live engine score on an UP route", async () => {
    const spec = createD1MultistageSpec(0.7);
    const run = await runDiagnostic(spec, { isCorrect: () => true });

    expect(run.completed.path).toEqual(["R", "H"]);
    expect(recomputeAbilityScore(spec, run.completed.path, run.log)).toBeCloseTo(
      run.completed.ability_score,
      10,
    );
  });

  it("matches the live engine score on a DOWN route", async () => {
    const spec = createD1MultistageSpec(0.7);
    const aceEasyPlusTwo = new Set(["A:NUM.S:L2", "A:NUM.F:L2"]);
    const run = await runDiagnostic(spec, {
      isCorrect: (id) => aceEasyPlusTwo.has(id) || id.endsWith(":L1"),
    });

    expect(run.completed.path).toEqual(["R", "E"]);
    expect(run.completed.ability_score).toBeCloseTo(1.333_333, 4);
    expect(recomputeAbilityScore(spec, run.completed.path, run.log)).toBeCloseTo(
      run.completed.ability_score,
      10,
    );
  });

  it("is deterministic (same inputs, same score)", () => {
    const spec = createD1MultistageSpec(0.7);
    const responses = buildResponses(spec, ["R", "H"], () => ({ correct: true }));
    expect(recomputeAbilityScore(spec, ["R", "H"], responses)).toBe(
      recomputeAbilityScore(spec, ["R", "H"], responses),
    );
  });
});

describe("scoreAdministration (per-administration §6 gates)", () => {
  const spec = createD1MultistageSpec(0.7);

  it("scores a complete, fault-free administration as valid with correct counts", () => {
    const responses = buildResponses(spec, ["R", "H"], () => ({ correct: true }));
    const score = scoreAdministration({
      administration: makeAdmin({ routing_path: ["R", "H"] }),
      responses,
      spec,
    });

    expect(score.status).toBe("valid");
    expect(score.expected_count).toBe(9);
    expect(score.answered_count).toBe(9);
    expect(score.scorable_count).toBe(9);
    expect(score.correct_count).toBe(9);
    expect(score.completeness).toBe(1);
    expect(score.ability_score).toBeCloseTo(3, 5);
  });

  it("flags an administration below the completeness threshold as incomplete", () => {
    const full = buildResponses(spec, ["R", "H"], () => ({ correct: true }));
    const truncated = full.slice(0, 7); // student quit: 7 of 9

    const score = scoreAdministration({
      administration: makeAdmin({ routing_path: ["R", "H"] }),
      responses: truncated,
      spec,
    });

    expect(score.answered_count).toBe(7);
    expect(score.completeness).toBeCloseTo(7 / 9, 5);
    expect(score.status).toBe("incomplete");
  });

  it("never scores an application fault as wrong, and withholds when faults exceed the threshold", () => {
    const responses = buildResponses(spec, ["R", "H"], ({ index }) =>
      index === 0 ? { status: "scoring_error" } : { correct: true },
    );

    const score = scoreAdministration({
      administration: makeAdmin({ routing_path: ["R", "H"] }),
      responses,
      spec,
    });

    expect(score.fault_count).toBe(1);
    expect(score.fault_rate).toBeCloseTo(1 / 9, 5);
    // the fault is excluded from the denominator, never counted as a wrong answer
    expect(score.scorable_count).toBe(8);
    expect(score.correct_count).toBe(8);
    expect(score.status).toBe("needs_review");
  });

  it("drops an invalidated item from the denominator and from θ", () => {
    // Down route: 4 of 6 routing correct, easy cleared -> θ = 1 + 4/6.
    const responses = buildResponses(spec, ["R", "E"], ({ stageId, index }) =>
      stageId === "R" ? { correct: index < 4 } : { correct: true },
    );
    const admin = makeAdmin({ routing_path: ["R", "E"] });

    const before = scoreAdministration({ administration: admin, responses, spec });
    expect(before.ability_score).toBeCloseTo(1 + 4 / 6, 4);

    // Invalidate one WRONG routing item -> routing becomes 4/5, θ = 1 + 0.8.
    const wrong = responses[4];
    if (!wrong || wrong.authoritative_correct) {
      throw new Error("expected an incorrect routing response at index 4");
    }
    const invalidatedItemVersionIds = new Set([wrong.item_version_id]);
    const after = scoreAdministration({
      administration: admin,
      responses,
      spec,
      invalidatedItemVersionIds,
    });

    expect(after.invalidated_count).toBe(1);
    expect(after.scorable_count).toBe(before.scorable_count - 1);
    expect(after.ability_score).toBeCloseTo(1.8, 4);
  });

  it("throws on an administration with no routing_path (not finalized)", () => {
    const responses = buildResponses(spec, ["R", "H"], () => ({ correct: true }));
    expect(() =>
      scoreAdministration({
        administration: makeAdmin({ routing_path: null }),
        responses,
        spec,
      }),
    ).toThrow(/routing_path/);
  });
});

describe("computeMeasurement (paired pre/post gain)", () => {
  const spec = createD1MultistageSpec(0.7);
  const fullCorrect = () => buildResponses(spec, ["R", "H"], () => ({ correct: true }));

  it("computes a reproducible synthetic gain from two engine runs", async () => {
    const pre = await runDiagnostic(spec, {
      purpose: "pre",
      formId: "A",
      isCorrect: (id) => id === "A:NUM.S:L2" || id === "A:NUM.F:L2" || id.endsWith(":L1"),
    });
    const post = await runDiagnostic(spec, {
      purpose: "post",
      formId: "B",
      isCorrect: () => true,
    });

    // finalize now persists routing_path onto the record, so the pipeline
    // consumes the real finalized administration (no test-side patching).
    const measurement = computeMeasurement({
      pre: { administration: pre.completed.administration, responses: pre.log },
      post: { administration: post.completed.administration, responses: post.log },
      spec,
    });

    expect(pre.completed.administration.routing_path).toEqual(["R", "E"]);
    expect(post.completed.administration.routing_path).toEqual(["R", "H"]);

    expect(measurement.status).toBe("computed");
    expect(measurement.pre.ability_score).toBeCloseTo(1.333_333, 4);
    expect(measurement.post.ability_score).toBeCloseTo(3, 5);
    expect(measurement.ability_gain).toBeCloseTo(3 - 4 / 3, 4);
  });

  it("returns pre_invalid (no gain) when the pre is incomplete", () => {
    const incompletePre = buildResponses(spec, ["R", "H"], () => ({ correct: true })).slice(
      0,
      6,
    );
    const measurement = computeMeasurement({
      pre: {
        administration: makeAdmin({ form_id: "A", routing_path: ["R", "H"] }),
        responses: incompletePre,
      },
      post: {
        administration: makeAdmin({
          administration_id: "adm-2",
          form_id: "B",
          routing_path: ["R", "H"],
        }),
        responses: fullCorrect(),
      },
      spec,
    });

    expect(measurement.status).toBe("pre_invalid");
    expect(measurement.ability_gain).toBeNull();
  });

  it("returns post_invalid (no gain) when the post needs review", () => {
    const faultyPost = buildResponses(spec, ["R", "H"], ({ index }) =>
      index === 0 ? { status: "scoring_error" } : { correct: true },
    );
    const measurement = computeMeasurement({
      pre: {
        administration: makeAdmin({ form_id: "A", routing_path: ["R", "H"] }),
        responses: fullCorrect(),
      },
      post: {
        administration: makeAdmin({
          administration_id: "adm-2",
          form_id: "B",
          routing_path: ["R", "H"],
        }),
        responses: faultyPost,
      },
      spec,
    });

    expect(measurement.status).toBe("post_invalid");
    expect(measurement.ability_gain).toBeNull();
  });

  it("refuses cross-blueprint, cross-scoring-model, or same-form pairs", () => {
    const base = {
      pre: {
        administration: makeAdmin({ form_id: "A" }),
        responses: fullCorrect(),
      },
      post: {
        administration: makeAdmin({ administration_id: "adm-2", form_id: "B" }),
        responses: fullCorrect(),
      },
      spec,
    };

    const blueprintMismatch = computeMeasurement({
      ...base,
      post: {
        administration: makeAdmin({
          administration_id: "adm-2",
          form_id: "B",
          blueprint_version: 2,
        }),
        responses: fullCorrect(),
      },
    });
    expect(blueprintMismatch.status).toBe("not_comparable");

    const scoringModelMismatch = computeMeasurement({
      ...base,
      post: {
        administration: makeAdmin({
          administration_id: "adm-2",
          form_id: "B",
          scoring_model_version: 2,
        }),
        responses: fullCorrect(),
      },
    });
    expect(scoringModelMismatch.status).toBe("not_comparable");

    const sameForm = computeMeasurement({
      ...base,
      post: {
        administration: makeAdmin({ administration_id: "adm-2", form_id: "A" }),
        responses: fullCorrect(),
      },
    });
    expect(sameForm.status).toBe("not_comparable");
    expect(sameForm.ability_gain).toBeNull();
  });

  it("throws when pairing different students", () => {
    expect(() =>
      computeMeasurement({
        pre: {
          administration: makeAdmin({ student_id: "s1", form_id: "A" }),
          responses: fullCorrect(),
        },
        post: {
          administration: makeAdmin({
            administration_id: "adm-2",
            student_id: "s2",
            form_id: "B",
          }),
          responses: fullCorrect(),
        },
        spec,
      }),
    ).toThrow(/different students/);
  });
});
