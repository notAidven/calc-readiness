import { createD1AnswerChecker } from "@cr/components";
import {
  computeMeasurement,
  createD1MultistageSpec,
  type DiagnosticItem,
  type DiagnosticResponseScorer,
} from "@cr/diagnostic";
import { D1_ITEM_PACK, toD1ItemVersions } from "@cr/item-bank";
import { type AssessmentResponseRepository, createAuthoritativeScorer } from "@cr/scorer";
import type {
  AssessmentItemResponse,
  AssessmentItemSubmission,
  AssessmentPurpose,
} from "@cr/state-schema";
import { describe, expect, it } from "vitest";

import {
  createDiagnosticRuntime,
  createInMemoryDiagnosticStore,
  createInMemoryPlacementWriter,
  createInMemoryResponseRepository,
  type InMemoryDiagnosticStore,
} from "./index";

type AnswerFor = (item: DiagnosticItem) => unknown;

async function driveToCompletion(
  store: InMemoryDiagnosticStore,
  scorer: DiagnosticResponseScorer,
  answerFor: AnswerFor,
  input: { student_id: string; purpose: AssessmentPurpose },
) {
  const placementWriter = createInMemoryPlacementWriter();
  const runtime = createDiagnosticRuntime({ store, scorer, placementWriter });
  const administrationInput = runtime.newAdministration(input);
  const started = await runtime.engine.start(administrationInput);
  const administrationId = started.administration.administration_id;

  let items: readonly DiagnosticItem[] = started.items;
  for (;;) {
    const submissions: AssessmentItemSubmission[] = items.map((item) => ({
      administration_id: administrationId,
      item_version_id: item.item_version_id,
      node_id: item.node_id,
      raw_answer: answerFor(item),
      item_definition_hash: item.item_definition_hash,
      equivalence_checker_version: runtime.versions.equivalence_checker_version,
      client_correct: false,
    }));
    const advance = await runtime.engine.submitStage(administrationId, submissions);
    if (advance.complete) {
      break;
    }
    items = advance.items;
  }

  const completed = await runtime.engine.finalize(administrationId);
  return { completed, placementWriter };
}

function gradedScorer(
  repository: AssessmentResponseRepository,
  isCorrect: (submission: AssessmentItemSubmission) => boolean,
): DiagnosticResponseScorer {
  return {
    async scoreAndAppend(submission) {
      const correct = isCorrect(submission);
      const response: AssessmentItemResponse = {
        ...submission,
        authoritative_correct: correct,
        scoring_status: correct ? "correct" : "incorrect",
        reason_code: correct ? "correct" : "value_mismatch",
      };
      await repository.append(response);
      return response;
    },
  };
}

describe("createDiagnosticRuntime end-to-end (in-memory doubles)", () => {
  it("runs a full pre + post with the REAL D1 checker and reproduces the score from records", async () => {
    const store = createInMemoryDiagnosticStore();
    const keyById = new Map(
      D1_ITEM_PACK.map(
        (entry) => [entry.item_version_id, entry.answer.answer_key] as const,
      ),
    );
    const answerKey: AnswerFor = (item) => keyById.get(item.item_version_id);

    const preRepo = createInMemoryResponseRepository();
    const pre = await driveToCompletion(
      store,
      createAuthoritativeScorer(
        createD1AnswerChecker({ itemVersions: toD1ItemVersions(D1_ITEM_PACK) }),
        preRepo,
      ),
      answerKey,
      { student_id: "stu-real", purpose: "pre" },
    );

    const postRepo = createInMemoryResponseRepository();
    const post = await driveToCompletion(
      store,
      createAuthoritativeScorer(
        createD1AnswerChecker({ itemVersions: toD1ItemVersions(D1_ITEM_PACK) }),
        postRepo,
      ),
      answerKey,
      { student_id: "stu-real", purpose: "post" },
    );

    // Counterbalanced: a student sees a different form pre vs post.
    expect(pre.completed.administration.form_id).not.toBe(
      post.completed.administration.form_id,
    );

    const measurement = computeMeasurement({
      pre: { administration: pre.completed.administration, responses: preRepo.responses },
      post: {
        administration: post.completed.administration,
        responses: postRepo.responses,
      },
      spec: createD1MultistageSpec(),
    });

    expect(measurement.status).toBe("computed");
    // Engine parity: theta recomputed from the persisted records equals the live finalize score.
    expect(measurement.pre.ability_score).toBeCloseTo(pre.completed.ability_score, 10);
    expect(measurement.post.ability_score).toBeCloseTo(post.completed.ability_score, 10);
    expect(measurement.ability_gain).toBeCloseTo(
      post.completed.ability_score - pre.completed.ability_score,
      10,
    );
    // Both administrations aced the real items -> frontier theta = 3.
    expect(pre.completed.ability_score).toBeCloseTo(3, 5);
    expect(post.completed.ability_score).toBeCloseTo(3, 5);
  });

  it("computes a positive pre/post gain with controlled routing (down -> up)", async () => {
    const store = createInMemoryDiagnosticStore();
    const difficultyById = new Map(
      D1_ITEM_PACK.map((entry) => [entry.item_version_id, entry.difficulty] as const),
    );

    // Pre: correct only on the easy (L1) items -> miss the L2 routing stage -> route
    // down -> ace the easy stage -> theta = 1 + 0 = 1.
    const preRepo = createInMemoryResponseRepository();
    const pre = await driveToCompletion(
      store,
      gradedScorer(
        preRepo,
        (submission) => difficultyById.get(submission.item_version_id) === 1,
      ),
      () => "answer",
      { student_id: "stu-gain", purpose: "pre" },
    );

    // Post: ace everything -> route up -> theta = 2 + 1 = 3.
    const postRepo = createInMemoryResponseRepository();
    const post = await driveToCompletion(
      store,
      gradedScorer(postRepo, () => true),
      () => "answer",
      { student_id: "stu-gain", purpose: "post" },
    );

    const measurement = computeMeasurement({
      pre: { administration: pre.completed.administration, responses: preRepo.responses },
      post: {
        administration: post.completed.administration,
        responses: postRepo.responses,
      },
      spec: createD1MultistageSpec(),
    });

    expect(pre.completed.ability_score).toBeCloseTo(1, 5);
    expect(post.completed.ability_score).toBeCloseTo(3, 5);
    expect(measurement.status).toBe("computed");
    expect(measurement.pre.ability_score).toBeCloseTo(pre.completed.ability_score, 10);
    expect(measurement.post.ability_score).toBeCloseTo(post.completed.ability_score, 10);
    expect(measurement.ability_gain).toBeCloseTo(2, 5);

    // The pretest doubles as placement (all 6 D1 nodes seeded); the posttest never
    // writes placement (Contracts §1, INV-DIAG-1).
    expect(pre.placementWriter.writes).toHaveLength(6);
    expect(post.placementWriter.writes).toHaveLength(0);
  });

  it("pins the counterbalanced form assignment to distinct pre/post forms", () => {
    const store = createInMemoryDiagnosticStore();
    const runtime = createDiagnosticRuntime({
      store,
      scorer: gradedScorer(createInMemoryResponseRepository(), () => true),
      placementWriter: createInMemoryPlacementWriter(),
    });
    for (const studentId of [
      "a",
      "student-2",
      "zzz",
      "00000000-0000-4000-8000-000000000000",
    ]) {
      const pre = runtime.newAdministration({ student_id: studentId, purpose: "pre" });
      const post = runtime.newAdministration({ student_id: studentId, purpose: "post" });
      expect(pre.form_id).not.toBe(post.form_id);
      expect(pre.blueprint_version).toBe(runtime.spec.spec_version);
    }
  });
});
