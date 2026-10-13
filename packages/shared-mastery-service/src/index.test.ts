import { describe, expect, it, vi } from "vitest";

import {
  completionStatusForMastery,
  createMasteryService,
  type EvidenceResponse,
  type MasteryStateStore,
  masteryFromCorrectCount,
  type StoredMastery,
  type SubmitAssessmentEvidenceInput,
  type SubmitAssessmentEvidenceResult,
} from "./index";

describe("mastery rules", () => {
  it.each([
    [0, 1],
    [3, 1],
    [4, 2],
    [5, 3],
  ] as const)("maps %i of 5 correct to mastery %i", (correct, mastery) => {
    expect(masteryFromCorrectCount(correct)).toBe(mastery);
  });

  it("derives completion only from mastery", () => {
    expect(completionStatusForMastery(0)).toBe("locked");
    expect(completionStatusForMastery(1)).toBe("in_progress");
    expect(completionStatusForMastery(2)).toBe("complete");
    expect(completionStatusForMastery(3)).toBe("complete");
  });
});

/** Minimal in-memory fake of the injected repository boundary. */
function createFakeStore(seed?: StoredMastery): MasteryStateStore & {
  writes: Array<{ mastery: number; completion_status: string }>;
} {
  const masteryByNode = new Map<string, StoredMastery>();
  const evidenceById = new Map<string, SubmitAssessmentEvidenceResult>();
  const writes: Array<{ mastery: number; completion_status: string }> = [];

  return {
    writes,
    getMastery(node_id) {
      if (seed && !masteryByNode.has(node_id)) {
        return seed;
      }

      return masteryByNode.get(node_id) ?? null;
    },
    setMastery(node_id, mastery, completion_status) {
      masteryByNode.set(node_id, { mastery, completion_status });
      writes.push({ mastery, completion_status });
    },
    getEvidenceResult(evidence_id) {
      return evidenceById.get(evidence_id) ?? null;
    },
    recordEvidenceResult(evidence_id, result) {
      evidenceById.set(evidence_id, result);
    },
  };
}

function response(overrides: Partial<EvidenceResponse> = {}): EvidenceResponse {
  return {
    item_id: "item-1",
    item_version: 1,
    raw_answer: "ok",
    hints_used: 0,
    revealed: false,
    attempt: 1,
    time_on_item_ms: 1000,
    ...overrides,
  };
}

function makeInput(
  responses: readonly EvidenceResponse[],
  overrides: Partial<SubmitAssessmentEvidenceInput> = {},
): SubmitAssessmentEvidenceInput {
  return {
    student_id: "ignored",
    context: "lesson",
    node_id: "NUM.5",
    responses,
    evidence_id: "ev-1",
    ...overrides,
  };
}

const fiveResponses = (correctFlags: readonly boolean[]): EvidenceResponse[] =>
  correctFlags.map((correct, index) =>
    response({ item_id: `item-${index}`, raw_answer: correct ? "right" : "wrong" }),
  );

describe("createMasteryService.submitAssessmentEvidence", () => {
  const correctByAnswer = (r: EvidenceResponse) => r.raw_answer === "right";

  it("evidences mastery 2 on a 4-of-5 set", async () => {
    const store = createFakeStore();
    const service = createMasteryService({
      store,
      recomputeCorrectness: correctByAnswer,
    });

    const result = await service.submitAssessmentEvidence(
      makeInput(fiveResponses([true, true, true, true, false])),
    );

    expect(result).toEqual({
      node_id: "NUM.5",
      mastery: 2,
      changed: true,
      completion_status: "complete",
    });
  });

  it("evidences gold mastery 3 on a 5-of-5 set", async () => {
    const store = createFakeStore();
    const service = createMasteryService({
      store,
      recomputeCorrectness: correctByAnswer,
    });

    const result = await service.submitAssessmentEvidence(
      makeInput(fiveResponses([true, true, true, true, true])),
    );

    expect(result.mastery).toBe(3);
    expect(result.completion_status).toBe("complete");
  });

  it("evidences mastery 1 on a 3-of-5 set (below bar)", async () => {
    const store = createFakeStore();
    const service = createMasteryService({
      store,
      recomputeCorrectness: correctByAnswer,
    });

    const result = await service.submitAssessmentEvidence(
      makeInput(fiveResponses([true, true, true, false, false])),
    );

    expect(result.mastery).toBe(1);
    expect(result.completion_status).toBe("in_progress");
  });

  it("counts a revealed slot as not correct even when the answer recomputes correct", async () => {
    const store = createFakeStore();
    const recompute = vi.fn(() => true);
    const service = createMasteryService({ store, recomputeCorrectness: recompute });

    const responses = [
      response({ item_id: "a" }),
      response({ item_id: "b" }),
      response({ item_id: "c" }),
      response({ item_id: "d" }),
      response({ item_id: "e", revealed: true }),
    ];

    const result = await service.submitAssessmentEvidence(makeInput(responses));

    expect(result.mastery).toBe(2);
    // The revealed slot short-circuits without consulting the recompute function.
    expect(recompute).toHaveBeenCalledTimes(4);
  });

  it("never lowers mastery (monotonic max)", async () => {
    const store = createFakeStore({ mastery: 3, completion_status: "complete" });
    const service = createMasteryService({
      store,
      recomputeCorrectness: correctByAnswer,
    });

    const result = await service.submitAssessmentEvidence(
      makeInput(fiveResponses([true, true, false, false, false])),
    );

    expect(result.mastery).toBe(3);
    expect(result.changed).toBe(false);
    expect(store.writes).toHaveLength(0);
  });

  it("replays a duplicate evidence_id as a no-op with changed:false", async () => {
    const store = createFakeStore();
    const recompute = vi.fn(correctByAnswer);
    const service = createMasteryService({ store, recomputeCorrectness: recompute });
    const input = makeInput(fiveResponses([true, true, true, true, true]));

    const first = await service.submitAssessmentEvidence(input);
    expect(first.changed).toBe(true);

    const callsAfterFirst = recompute.mock.calls.length;
    const replay = await service.submitAssessmentEvidence(input);

    expect(replay).toEqual({ ...first, changed: false });
    // The replay short-circuits before re-scoring.
    expect(recompute.mock.calls.length).toBe(callsAfterFirst);
    expect(store.writes).toHaveLength(1);
  });

  it("keeps client_correct out of the authoritative path", async () => {
    const store = createFakeStore();
    const service = createMasteryService({
      store,
      // Authoritative recompute disagrees with any client grade: everything wrong.
      recomputeCorrectness: () => false,
    });

    const result = await service.submitAssessmentEvidence(
      makeInput(fiveResponses([true, true, true, true, true])),
    );

    expect(result.mastery).toBe(1);
  });

  it("requires exactly five resolved slots", async () => {
    const store = createFakeStore();
    const service = createMasteryService({
      store,
      recomputeCorrectness: correctByAnswer,
    });

    await expect(
      service.submitAssessmentEvidence(makeInput(fiveResponses([true, true, true, true]))),
    ).rejects.toThrow(/exactly 5 resolved slots/);
  });
});
