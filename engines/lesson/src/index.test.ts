import { configureAnswerChecker } from "@cr/components";
import type {
  MasteryService,
  SubmitAssessmentEvidenceInput,
  SubmitAssessmentEvidenceResult,
} from "@cr/mastery-service";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  createLessonEngine,
  getMvpLessonShellManifests,
  type PracticeItemInstance,
} from "./index";

describe("MVP lesson shell manifests", () => {
  it("groups all six D1 nodes into the three registry shells", () => {
    expect(getMvpLessonShellManifests()).toEqual([
      { shell_id: "L1", node_ids: ["NUM.S", "NUM.F"] },
      { shell_id: "L2", node_ids: ["NUM.2", "NUM.3", "NUM.4"] },
      { shell_id: "L3", node_ids: ["NUM.5"] },
    ]);
  });
});

/**
 * Fake answer checker: an answer is graded correct when its string starts with
 * "right"; "bad" is malformed input; anything else is incorrect.
 */
function configureFakeChecker(): void {
  configureAnswerChecker((input) => {
    const raw = String(input.raw_answer);

    if (raw === "bad") {
      return {
        status: "invalid_input",
        reason_code: "parse_error",
        client_correct: false,
        checker_version: input.equivalence_checker_version,
      };
    }

    const correct = raw.startsWith("right");

    return {
      status: correct ? "correct" : "incorrect",
      reason_code: correct ? "match" : "value_mismatch",
      client_correct: correct,
      checker_version: input.equivalence_checker_version,
    };
  });
}

function resetChecker(): void {
  configureAnswerChecker((input) => ({
    status: "scoring_error",
    reason_code: "checker_not_configured",
    client_correct: false,
    checker_version: input.equivalence_checker_version,
  }));
}

function fakeMasteryService(): {
  service: MasteryService;
  calls: SubmitAssessmentEvidenceInput[];
} {
  const calls: SubmitAssessmentEvidenceInput[] = [];
  const service: MasteryService = {
    submitAssessmentEvidence(input): Promise<SubmitAssessmentEvidenceResult> {
      calls.push(input);
      return Promise.resolve({
        node_id: input.node_id,
        mastery: 2,
        changed: true,
        completion_status: "complete",
      });
    },
  };

  return { service, calls };
}

function items(count = 5): PracticeItemInstance[] {
  return Array.from({ length: count }, (_, index) => ({
    item_id: `item-${index}`,
    item_version: 1,
    item_version_id: `iv-${index}`,
    equivalence_checker_version: 1,
  }));
}

describe("lesson stage machine + practice orchestrator", () => {
  beforeEach(configureFakeChecker);
  afterEach(resetChecker);

  it("progresses not_started -> teaching -> practice -> done through a full set", async () => {
    const { service, calls } = fakeMasteryService();
    const engine = createLessonEngine(service);
    const session = engine.startLesson({ node_id: "NUM.5", items: items() });

    expect(session.getStage()).toBe("not_started");

    session.startTeaching();
    expect(session.getStage()).toBe("teaching");

    session.submitCheckForUnderstanding(true);
    session.startPractice();
    expect(session.getStage()).toBe("practice");

    for (let slot = 0; slot < 5; slot += 1) {
      const outcome = session.submitAnswer({ raw_answer: "right", time_on_item_ms: 10 });
      expect(outcome.resolved).toBe(true);
      session.advanceSlot();
    }

    expect(session.isPracticeComplete()).toBe(true);
    expect(session.getCurrentSlot()).toBeNull();

    const result = await session.submitPractice("ev-lesson-1");

    expect(session.getStage()).toBe("done");
    expect(result.mastery).toBe(2);
    expect(calls).toHaveLength(1);
    const call = calls[0];
    expect(call?.node_id).toBe("NUM.5");
    expect(call?.context).toBe("lesson");
    expect(call?.responses).toHaveLength(5);
    // Every submitted response is non-revealed (reveal forces a fresh-instance retry).
    expect(call?.responses.every((r) => r.revealed === false)).toBe(true);
  });

  it("blocks practice until the check-for-understanding passes", () => {
    const { service } = fakeMasteryService();
    const session = createLessonEngine(service).startLesson({
      node_id: "NUM.5",
      items: items(),
    });

    session.startTeaching();
    session.submitCheckForUnderstanding(false);

    expect(() => session.startPractice()).toThrow(/check-for-understanding must pass/);
  });

  it("supports hint then reveal then fresh-instance retry to resolve a slot", async () => {
    const { service, calls } = fakeMasteryService();
    const session = createLessonEngine(service).startLesson({
      node_id: "NUM.5",
      items: items(),
    });

    session.startTeaching();
    session.submitCheckForUnderstanding(true);
    session.startPractice();

    // Slot 0: hint, then reveal, then recover on a fresh instance.
    expect(session.useHint()).toBe(1);
    session.reveal();
    expect(session.getCurrentSlot()?.revealed).toBe(true);

    // Submitting on a revealed instance cannot resolve; it demands a fresh instance.
    const blocked = session.submitAnswer({ raw_answer: "right", time_on_item_ms: 5 });
    expect(blocked.resolved).toBe(false);
    expect(blocked.requires_fresh_instance).toBe(true);
    expect(() => session.advanceSlot()).toThrow(/fresh instance/);

    session.retryWithFreshInstance({
      item_id: "item-0b",
      item_version: 2,
      item_version_id: "iv-0b",
      equivalence_checker_version: 1,
    });
    const view = session.getCurrentSlot();
    expect(view?.revealed).toBe(false);
    expect(view?.hints_used).toBe(0);
    expect(view?.attempt).toBe(2);

    session.submitAnswer({ raw_answer: "right", time_on_item_ms: 5 });
    session.advanceSlot();

    for (let slot = 1; slot < 5; slot += 1) {
      session.submitAnswer({ raw_answer: "right", time_on_item_ms: 5 });
      session.advanceSlot();
    }

    await session.submitPractice("ev-lesson-2");

    const slot0 = calls[0]?.responses[0];
    expect(slot0?.item_id).toBe("item-0b");
    expect(slot0?.attempt).toBe(2);
    expect(slot0?.revealed).toBe(false);
    expect(slot0?.hints_used).toBe(0);
  });

  it("lets a student give up after reveal: skipRevealedSlot resolves the slot as revealed", async () => {
    const { service, calls } = fakeMasteryService();
    const session = createLessonEngine(service).startLesson({
      node_id: "NUM.5",
      items: items(),
    });

    session.startTeaching();
    session.submitCheckForUnderstanding(true);
    session.startPractice();

    // Slot 0: exhaust to reveal, then give up (move on, losing credit).
    session.useHint();
    session.reveal();
    // A revealed slot cannot advance normally...
    expect(() => session.advanceSlot()).toThrow(/fresh instance/);
    // ...but the student can skip it (records a revealed, not-correct response).
    session.skipRevealedSlot(42);
    expect(session.getCurrentSlot()?.slot).toBe(1);

    for (let slot = 1; slot < 5; slot += 1) {
      session.submitAnswer({ raw_answer: "right", time_on_item_ms: 5 });
      session.advanceSlot();
    }

    expect(session.isPracticeComplete()).toBe(true);
    await session.submitPractice("ev-lesson-skip");

    const slot0 = calls[0]?.responses[0];
    expect(slot0?.revealed).toBe(true);
    expect(slot0?.raw_answer).toBeNull();
    expect(slot0?.time_on_item_ms).toBe(42);
  });

  it("only allows skipRevealedSlot after a reveal", () => {
    const { service } = fakeMasteryService();
    const session = createLessonEngine(service).startLesson({
      node_id: "NUM.5",
      items: items(),
    });

    session.startTeaching();
    session.submitCheckForUnderstanding(true);
    session.startPractice();

    expect(() => session.skipRevealedSlot()).toThrow(/reveal it first/);
  });

  it("treats invalid input as unanswered (no resolution)", () => {
    const { service } = fakeMasteryService();
    const session = createLessonEngine(service).startLesson({
      node_id: "NUM.5",
      items: items(),
    });

    session.startTeaching();
    session.submitCheckForUnderstanding(true);
    session.startPractice();

    const outcome = session.submitAnswer({ raw_answer: "bad", time_on_item_ms: 3 });

    expect(outcome.status).toBe("invalid_input");
    expect(outcome.resolved).toBe(false);
    expect(session.getCurrentSlot()?.has_provisional).toBe(false);
    expect(() => session.advanceSlot()).toThrow(/Submit an answer/);
  });

  it("rejects a practice set that is not exactly five items", () => {
    const { service } = fakeMasteryService();
    const session = createLessonEngine(service).startLesson({
      node_id: "NUM.5",
      items: items(4),
    });

    session.startTeaching();
    session.submitCheckForUnderstanding(true);

    expect(() => session.startPractice()).toThrow(/exactly 5 items/);
  });

  it("does not submit evidence directly grading answers (checkAnswer stays client-side)", async () => {
    // The engine forwards raw answers; it never sends client_correct to the service.
    const { service, calls } = fakeMasteryService();
    const spy = vi.spyOn(service, "submitAssessmentEvidence");
    const session = createLessonEngine(service).startLesson({
      node_id: "NUM.5",
      items: items(),
    });

    session.startTeaching();
    session.submitCheckForUnderstanding(true);
    session.startPractice();

    for (let slot = 0; slot < 5; slot += 1) {
      session.submitAnswer({ raw_answer: "right", time_on_item_ms: 1 });
      session.advanceSlot();
    }

    await session.submitPractice("ev-lesson-3");

    expect(spy).toHaveBeenCalledTimes(1);
    for (const response of calls[0]?.responses ?? []) {
      expect(response).not.toHaveProperty("client_correct");
    }
  });
});
