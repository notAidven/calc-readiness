import type {
  AssessmentAdministration,
  AssessmentItemResponse,
  AssessmentItemSubmission,
  AssessmentPurpose,
} from "@cr/state-schema";
import { describe, expect, it } from "vitest";

import {
  type AdministrationProgress,
  createAdaptiveDiagnosticEngine,
  type DiagnosticAdministrationStore,
  type DiagnosticItem,
  type DiagnosticItemBank,
  type DiagnosticResponseScorer,
  type NewAdministration,
  type PlacementWriter,
} from "./engine";
import { createD1MultistageSpec } from "./routing";

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
  public writes: Array<{
    student_id: string;
    node_id: string;
    placement_estimate: number;
  }> = [];
  async writePlacement(input: {
    student_id: string;
    node_id: string;
    placement_estimate: number;
  }): Promise<void> {
    this.writes.push(input);
  }
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

function baseInput(purpose: AssessmentPurpose): NewAdministration {
  return {
    student_id: "student-1",
    purpose,
    form_id: "A",
    form_version: 1,
    blueprint_version: 1,
    scoring_engine_version: 1,
    scoring_model_version: 1,
    equivalence_checker_version: 1,
  };
}

describe("createAdaptiveDiagnosticEngine", () => {
  it("rejects a spec-version mismatch at start", async () => {
    const engine = createAdaptiveDiagnosticEngine({
      spec: createD1MultistageSpec(),
      itemBank,
      store: new FakeStore(),
      scorer: makeScorer(() => true, []),
      placementWriter: new FakePlacementWriter(),
    });

    await expect(
      engine.start({ ...baseInput("pre"), blueprint_version: 2 }),
    ).rejects.toThrow(/spec version mismatch/);
  });

  it("routes UP when the routing stage is cleared, seeds placement, and records the path", async () => {
    const store = new FakeStore();
    const log: AssessmentItemResponse[] = [];
    const placementWriter = new FakePlacementWriter();
    const engine = createAdaptiveDiagnosticEngine({
      spec: createD1MultistageSpec(0.7),
      itemBank,
      store,
      scorer: makeScorer(() => true, log), // ace everything
      placementWriter,
    });

    const started = await engine.start(baseInput("pre"));
    expect(started.stage_id).toBe("R");
    expect(started.items).toHaveLength(6);

    const routed = await engine.submitStage(
      started.administration.administration_id,
      toSubmissions(started.administration.administration_id, started.items),
    );
    expect(routed.complete).toBe(false);
    if (routed.complete) {
      throw new Error("expected another stage");
    }
    expect(routed.stage_id).toBe("H"); // cleared routing -> up

    const done = await engine.submitStage(
      started.administration.administration_id,
      toSubmissions(started.administration.administration_id, routed.items),
    );
    expect(done.complete).toBe(true);

    const completed = await engine.finalize(started.administration.administration_id);

    // aced routing + up -> theta = 2 + 1
    expect(completed.ability_score).toBeCloseTo(3, 5);
    expect(completed.path).toEqual(["R", "H"]);
    // finalize persists the recompute basis onto the immutable record
    expect(completed.administration.routing_path).toEqual(["R", "H"]);
    expect(completed.administration.submitted_at).not.toBeNull();
    // placement seeded for all 6 D1 nodes (pretest doubles as placement)
    expect(placementWriter.writes).toHaveLength(6);
    expect(placementWriter.writes.every((w) => w.student_id === "student-1")).toBe(true);
    // immutable log received every answered item (6 routing + 3 up)
    expect(log).toHaveLength(9);
  });

  it("routes DOWN when the routing stage is missed and caps the score below 2", async () => {
    const store = new FakeStore();
    const placementWriter = new FakePlacementWriter();
    const correct = new Set(["A:NUM.S:L2", "A:NUM.F:L2"]); // 2 of 6 on routing
    const engine = createAdaptiveDiagnosticEngine({
      spec: createD1MultistageSpec(0.7),
      itemBank,
      store,
      scorer: makeScorer((id) => correct.has(id) || id.endsWith(":L1"), []), // ace the easy stage
      placementWriter,
    });

    const started = await engine.start(baseInput("pre"));
    const routed = await engine.submitStage(
      started.administration.administration_id,
      toSubmissions(started.administration.administration_id, started.items),
    );
    if (routed.complete) {
      throw new Error("expected another stage");
    }
    expect(routed.stage_id).toBe("E"); // missed routing -> down

    await engine.submitStage(
      started.administration.administration_id,
      toSubmissions(started.administration.administration_id, routed.items),
    );
    const completed = await engine.finalize(started.administration.administration_id);

    // r = 2/6, e = 1.0 (>= bar) -> theta = 1 + 1/3, and always < 2 (capped)
    expect(completed.ability_score).toBeCloseTo(1.333_333, 4);
    expect(completed.ability_score).toBeLessThan(2);
    expect(completed.path).toEqual(["R", "E"]);
  });

  it("never writes placement for a posttest", async () => {
    const store = new FakeStore();
    const placementWriter = new FakePlacementWriter();
    const engine = createAdaptiveDiagnosticEngine({
      spec: createD1MultistageSpec(),
      itemBank,
      store,
      scorer: makeScorer(() => true, []),
      placementWriter,
    });

    const started = await engine.start(baseInput("post"));
    const routed = await engine.submitStage(
      started.administration.administration_id,
      toSubmissions(started.administration.administration_id, started.items),
    );
    if (routed.complete) {
      throw new Error("expected another stage");
    }
    await engine.submitStage(
      started.administration.administration_id,
      toSubmissions(started.administration.administration_id, routed.items),
    );
    const completed = await engine.finalize(started.administration.administration_id);

    // score still computed, but a posttest never seeds placement
    expect(completed.ability_score).toBeCloseTo(3, 5);
    expect(placementWriter.writes).toHaveLength(0);
  });

  it("rejects a submission whose item was not served for the open stage", async () => {
    const store = new FakeStore();
    const engine = createAdaptiveDiagnosticEngine({
      spec: createD1MultistageSpec(),
      itemBank,
      store,
      scorer: makeScorer(() => true, []),
      placementWriter: new FakePlacementWriter(),
    });

    const started = await engine.start(baseInput("pre"));
    await expect(
      engine.submitStage(started.administration.administration_id, [
        {
          administration_id: started.administration.administration_id,
          item_version_id: "A:BOGUS:L2",
          node_id: "NUM.S",
          raw_answer: "x",
          item_definition_hash: "hash",
          equivalence_checker_version: 1,
          client_correct: false,
        },
      ]),
    ).rejects.toThrow(/was not served/);
  });
});
