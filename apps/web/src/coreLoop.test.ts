import { createD1AnswerChecker, D1_CHECKER_VERSION, type D1NodeId } from "@cr/components";
import {
  computeCoverageMeasurementFromRecords,
  computeMeasurement,
  createD1MultistageSpec,
  type DiagnosticItem,
  type DiagnosticResponseScorer,
  type FrontierWalkConfig,
  recomputeCoverage,
  type WalkItemSource,
  type WalkProbeItem,
} from "@cr/diagnostic";
import {
  createDiagnosticRuntime,
  createInMemoryDiagnosticStore,
  createInMemoryPlacementWriter,
  createInMemoryResponseRepository,
  createInMemoryWalkStore,
  createWalkRuntime,
  type InMemoryDiagnosticStore,
  type InMemoryWalkStore,
} from "@cr/diagnostic-runtime";
import {
  D1_NEIGHBORHOOD_ID,
  getRequiredNodeIds,
  initialStormMachineState,
  isNeighborhoodReady,
  stormReducer,
} from "@cr/game";
import {
  D1_ITEM_PACK,
  D1_PRACTICE_POOL,
  getD1PracticeSet,
  toD1ItemVersions,
} from "@cr/item-bank";
import {
  createMasteryService,
  type EvidenceResponse,
  type MasteryStateStore,
  PRACTICE_SET_SIZE,
  type StoredMastery,
  type SubmitAssessmentEvidenceResult,
} from "@cr/mastery-service";
import type { AssessmentResponseRepository } from "@cr/scorer";
import { getNodesByScope } from "@cr/skill-graph";
import type {
  AssessmentItemResponse,
  AssessmentItemSubmission,
  AssessmentPurpose,
  CompletionStatus,
  LessonStage,
  Mastery,
  StudentNodeState,
  UUID,
} from "@cr/state-schema";
import { describe, expect, it } from "vitest";

/**
 * Day-5 gate: the core loop end to end — diagnose → build → storm → measurement
 * writes a record. This drives every lane's REAL code across the frozen seams
 * (no app UI, no infrastructure): Gabe's adaptive diagnostic runtime + measurement
 * (`@cr/diagnostic(-runtime)`) over the in-memory persistence doubles, Anthony's
 * mastery service (`@cr/mastery-service`, the one writer of `mastery`) fed by
 * Gabe's D1 practice pool through the real answer checker, and Evan's storm /
 * checkpoint state machine (`@cr/game`). It proves the contracts connect: the
 * pretest writes placement (never mastery), lessons raise mastery, the storm
 * clears the checkpoint only when every node is mastered (fail-closed) and never
 * touches mastery, and the posttest yields an immutable pre/post measurement.
 */

const STUDENT_ID = "core-loop-student" as UUID;
const REQUIRED_NODES = getRequiredNodeIds(D1_NEIGHBORHOOD_ID);

type AnswerFor = (item: DiagnosticItem) => unknown;

/** A scorer double whose correctness is decided by the injected predicate. */
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

/** Run one full administration (start → submit every stage → finalize). */
async function driveDiagnostic(
  store: InMemoryDiagnosticStore,
  scorer: DiagnosticResponseScorer,
  answerFor: AnswerFor,
  input: { student_id: UUID; purpose: AssessmentPurpose },
) {
  const placementWriter = createInMemoryPlacementWriter();
  const runtime = createDiagnosticRuntime({ store, scorer, placementWriter });
  const started = await runtime.engine.start(runtime.newAdministration(input));
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

/** In-memory mastery store: the persistence boundary the mastery service writes through. */
function createInMemoryMasteryStore() {
  const masteryByNode = new Map<string, StoredMastery>();
  const evidenceById = new Map<string, SubmitAssessmentEvidenceResult>();
  const store: MasteryStateStore = {
    getMastery: (node_id) => masteryByNode.get(node_id) ?? null,
    setMastery: (node_id, mastery, completion_status) => {
      masteryByNode.set(node_id, { mastery, completion_status });
    },
    getEvidenceResult: (evidence_id) => evidenceById.get(evidence_id) ?? null,
    recordEvidenceResult: (evidence_id, result) => {
      evidenceById.set(evidence_id, result);
    },
  };
  return { store, masteryByNode };
}

/** Project a mastery snapshot into the node states the game reads. */
function nodeStates(
  masteryByNode: ReadonlyMap<string, StoredMastery>,
  overrides: Readonly<Record<string, Mastery>> = {},
): StudentNodeState[] {
  return REQUIRED_NODES.map((node_id) => {
    const mastery = overrides[node_id] ?? masteryByNode.get(node_id)?.mastery ?? 0;
    const completion_status: CompletionStatus =
      mastery >= 2 ? "complete" : mastery === 1 ? "in_progress" : "locked";
    const lesson_stage: LessonStage = mastery >= 2 ? "done" : "not_started";
    return {
      student_id: STUDENT_ID,
      node_id,
      placement_estimate: 0,
      mastery,
      mastery_updated_at: mastery > 0 ? new Date(0).toISOString() : null,
      completion_status,
      lesson_stage,
      last_practiced_at: null,
    };
  });
}

describe("core loop end to end (diagnose → build → storm → measurement)", () => {
  it("runs the full D1 loop and writes an immutable pre/post measurement record", async () => {
    // One immutable-record store spans the whole loop (pre + post administrations).
    const store = createInMemoryDiagnosticStore();
    const difficultyById = new Map(
      D1_ITEM_PACK.map((entry) => [entry.item_version_id, entry.difficulty] as const),
    );

    // ── 1. DIAGNOSE (pretest) ──────────────────────────────────────────────
    // Correct only on the easy (L1) items → route down → frontier θ = 1. The
    // pretest doubles as placement: it seeds all six D1 nodes and writes NO mastery.
    const preRepo = createInMemoryResponseRepository();
    const pre = await driveDiagnostic(
      store,
      gradedScorer(preRepo, (s) => difficultyById.get(s.item_version_id) === 1),
      () => "answer",
      { student_id: STUDENT_ID, purpose: "pre" },
    );
    expect(pre.completed.ability_score).toBeCloseTo(1, 5);
    expect(pre.placementWriter.writes).toHaveLength(REQUIRED_NODES.length); // seeds the city
    expect(pre.placementWriter.writes.every((w) => w.node_id !== undefined)).toBe(true);

    // ── 2. BUILD (lessons → mastery service) ───────────────────────────────
    // The five-slot practice set per node (Gabe's pool) is answered correctly and
    // submitted as lesson evidence; the mastery service (Anthony's, the ONLY writer
    // of mastery) applies the 5/5 rule and raises each node to mastered.
    const { store: masteryStore, masteryByNode } = createInMemoryMasteryStore();
    const practiceChecker = createD1AnswerChecker({
      itemVersions: toD1ItemVersions(D1_PRACTICE_POOL),
    });
    const mastery = createMasteryService({
      store: masteryStore,
      // Real server-side recompute over the practice pool (client_correct ignored).
      recomputeCorrectness: (response) =>
        practiceChecker({
          raw_answer: response.raw_answer,
          item_version_id: response.item_id,
          equivalence_checker_version: D1_CHECKER_VERSION,
        }).client_correct,
    });

    for (const nodeId of REQUIRED_NODES) {
      const set = getD1PracticeSet(nodeId as D1NodeId);
      expect(set).toHaveLength(PRACTICE_SET_SIZE); // pool provides exactly the 5 slots the rule needs
      const responses: EvidenceResponse[] = set.map((item) => ({
        item_id: item.item_version_id,
        item_version: 1,
        raw_answer: item.answer.answer_key,
        hints_used: 0,
        revealed: false,
        attempt: 1,
        time_on_item_ms: 1_000,
      }));
      const result = await mastery.submitAssessmentEvidence({
        student_id: STUDENT_ID,
        context: "lesson",
        node_id: nodeId,
        responses,
        evidence_id: `ev-${nodeId}`,
      });
      expect(result.mastery).toBe(3); // 5/5 correct → gold
      expect(result.completion_status).toBe("complete");
    }

    // ── 3. STORM (checkpoint, fail-closed) ─────────────────────────────────
    // Fail-closed: with one node still unmastered the storm is LOCKED and cannot
    // clear the checkpoint, no matter the attempt.
    const partial = nodeStates(masteryByNode, {
      [REQUIRED_NODES[0] as string]: 1 as Mastery,
    });
    expect(isNeighborhoodReady(D1_NEIGHBORHOOD_ID, partial)).toBe(false);
    let locked = initialStormMachineState({ node_states: partial });
    expect(locked.phase).toBe("locked");
    locked = stormReducer(locked, { type: "start" });
    expect(locked.phase).toBe("locked");
    expect(locked.checkpoint_cleared).toBe(false);

    // All six mastered → ready → a genuine clear sets the one game-owned flag.
    const masterySnapshot = JSON.stringify([...masteryByNode.entries()].sort());
    const ready = nodeStates(masteryByNode);
    expect(isNeighborhoodReady(D1_NEIGHBORHOOD_ID, ready)).toBe(true);
    let storm = initialStormMachineState({ node_states: ready });
    expect(storm.phase).toBe("ready");
    storm = stormReducer(storm, { type: "start" });
    storm = stormReducer(storm, {
      type: "submit",
      submission: {
        neighborhood_id: D1_NEIGHBORHOOD_ID,
        item_count: 5,
        correct_count: 5,
        time_remaining_ms: 45_000,
      },
    });
    expect(storm.phase).toBe("cleared");
    expect(storm.checkpoint_cleared).toBe(true);
    // Frozen boundary: the storm never writes mastery.
    expect(JSON.stringify([...masteryByNode.entries()].sort())).toBe(masterySnapshot);

    // ── 4. MEASURE (posttest → immutable pre/post record) ──────────────────
    // Ace everything → route up → θ = 3. The posttest NEVER writes placement.
    const postRepo = createInMemoryResponseRepository();
    const post = await driveDiagnostic(
      store,
      gradedScorer(postRepo, () => true),
      () => "answer",
      { student_id: STUDENT_ID, purpose: "post" },
    );
    expect(post.completed.ability_score).toBeCloseTo(3, 5);
    expect(post.placementWriter.writes).toHaveLength(0); // INV-DIAG-1

    // Counterbalanced distinct forms (measurement comparability gate).
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
    // Recomputed from the persisted records = the live finalize scores (engine parity).
    expect(measurement.pre.ability_score).toBeCloseTo(pre.completed.ability_score, 10);
    expect(measurement.post.ability_score).toBeCloseTo(post.completed.ability_score, 10);
    expect(measurement.ability_gain).toBeCloseTo(2, 5);
    expect(measurement.ability_gain).toBeGreaterThan(0);

    // "Writes a record": both administrations are finalized immutable rows in the store.
    const preRecord = store.administrations.get(
      pre.completed.administration.administration_id,
    );
    const postRecord = store.administrations.get(
      post.completed.administration.administration_id,
    );
    expect(preRecord?.purpose).toBe("pre");
    expect(preRecord?.submitted_at).not.toBeNull();
    expect(preRecord?.routing_path).not.toBeNull();
    expect(postRecord?.purpose).toBe("post");
    expect(postRecord?.submitted_at).not.toBeNull();
    expect(postRecord?.routing_path).not.toBeNull();
  });
});

// ── v2: the same core loop on the prerequisite-gated walk (§9 step 7 parity) ──

const D1_WALK_SCOPE = getNodesByScope("mvp").map((node) => node.id);
const D1_WALK_CONFIG: FrontierWalkConfig = { scope: D1_WALK_SCOPE, entryTier: 2 };

/**
 * Node-addressed synthetic pool with unlimited parallel depth (attempt index) —
 * stands in for the deep assessment bank the 2-of-3 rule needs (Amendment v2 §8;
 * the shipped D1 forms are 1 item/cell, the real default-flip blocker).
 */
const walkItemSource: WalkItemSource = {
  selectProbeItem({ node_id, attempt, form_id }): WalkProbeItem {
    const id = `${form_id}:${node_id}:${attempt}`;
    return { item_version_id: id, node_id, item_definition_hash: `hash-${id}` };
  },
};

/** Run one full walk administration over the shipped doubles (start → probe* → finalize). */
async function driveWalk(
  store: InMemoryDiagnosticStore,
  walkStore: InMemoryWalkStore,
  purpose: AssessmentPurpose,
  isCorrect: (submission: AssessmentItemSubmission) => boolean,
) {
  const repo = createInMemoryResponseRepository();
  const placementWriter = createInMemoryPlacementWriter();
  const runtime = createWalkRuntime({
    config: D1_WALK_CONFIG,
    itemSource: walkItemSource,
    store,
    walkStore,
    scorer: gradedScorer(repo, isCorrect),
    placementWriter,
  });
  const serve = await runtime.engine.start(
    runtime.newAdministration({ student_id: STUDENT_ID, purpose }),
  );
  const administrationId = serve.administration.administration_id;
  let node = serve.node_id;
  let item = serve.item;
  for (let guard = 0; ; guard += 1) {
    const advance = await runtime.engine.submitProbe(administrationId, {
      administration_id: administrationId,
      item_version_id: item.item_version_id,
      node_id: node,
      raw_answer: "answer",
      item_definition_hash: item.item_definition_hash,
      equivalence_checker_version: runtime.versions.equivalence_checker_version,
      client_correct: false,
    });
    if (advance.complete) {
      break;
    }
    node = advance.node_id;
    item = advance.item;
    if (guard > 10_000) {
      throw new Error("walk did not terminate");
    }
  }
  const completed = await runtime.engine.finalize(administrationId);
  return { completed, repo, placementWriter };
}

describe("core loop on the v2 walk (diagnose → measure coverage, reproducible)", () => {
  it("seeds placement from a broken pretest walk and recomputes a positive coverage gain", async () => {
    // One immutable-record store + one ephemeral walk store span both administrations.
    const store = createInMemoryDiagnosticStore();
    const walkStore = createInMemoryWalkStore();

    // ── DIAGNOSE (pretest walk) ────────────────────────────────────────────
    // Miss the NUM.4 taproot → confirmed floor, subtree pruned, foundation credited.
    // The pretest still doubles as placement (seeds the city), never mastery (INV-DIAG-1).
    const pre = await driveWalk(store, walkStore, "pre", (s) => s.node_id !== "NUM.4");
    expect(pre.completed.coverage.coverage).toBeGreaterThan(0);
    expect(pre.completed.coverage.coverage).toBeLessThan(1);
    expect(pre.placementWriter.writes.length).toBeGreaterThan(0);

    // Reproducible from immutable records (routing_path + served-order responses).
    const routingPath = pre.completed.administration.routing_path;
    expect(routingPath).not.toBeNull();
    if (routingPath) {
      expect(
        recomputeCoverage(D1_WALK_SCOPE, routingPath, pre.repo.responses).coverage,
      ).toBe(pre.completed.coverage.coverage);
    }

    // BUILD → STORM are model-independent (mastery + game) and proven by the v1 loop above.

    // ── MEASURE (posttest walk) ────────────────────────────────────────────
    // Ace everything → full coverage; the posttest never writes placement (INV-DIAG-1).
    const post = await driveWalk(store, walkStore, "post", () => true);
    expect(post.completed.coverage.coverage).toBeCloseTo(1, 10);
    expect(post.placementWriter.writes).toHaveLength(0);
    // Counterbalanced distinct forms (comparability gate).
    expect(pre.completed.administration.form_id).not.toBe(
      post.completed.administration.form_id,
    );

    const measurement = computeCoverageMeasurementFromRecords({
      pre: { administration: pre.completed.administration, responses: pre.repo.responses },
      post: {
        administration: post.completed.administration,
        responses: post.repo.responses,
      },
      scope: D1_WALK_SCOPE,
    });
    expect(measurement.status).toBe("computed");
    // Recomputed from the persisted records = the live finalize coverage (engine parity).
    expect(measurement.pre.coverage).toBe(pre.completed.coverage.coverage);
    expect(measurement.post.coverage).toBe(post.completed.coverage.coverage);
    expect(measurement.coverage_gain).toBeGreaterThan(0);

    // Both administrations are finalized immutable rows (walk state is ephemeral + separate).
    const preRow = store.administrations.get(
      pre.completed.administration.administration_id,
    );
    const postRow = store.administrations.get(
      post.completed.administration.administration_id,
    );
    expect(preRow?.submitted_at).not.toBeNull();
    expect(preRow?.routing_path).not.toBeNull();
    expect(postRow?.submitted_at).not.toBeNull();
    expect(postRow?.routing_path).not.toBeNull();
  });
});
