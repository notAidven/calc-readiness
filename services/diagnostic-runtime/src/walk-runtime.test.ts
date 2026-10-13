import {
  computeCoverageMeasurementFromRecords,
  type DiagnosticResponseScorer,
  type FrontierWalkConfig,
  type NewAdministration,
  recomputeCoverage,
  type WalkItemSource,
  type WalkState,
} from "@cr/diagnostic";
import { getNodesByScope } from "@cr/skill-graph";
import type {
  AssessmentItemResponse,
  AssessmentItemSubmission,
  UUID,
} from "@cr/state-schema";
import { describe, expect, it } from "vitest";

import {
  createInMemoryDiagnosticStore,
  createInMemoryPlacementWriter,
  createInMemoryResponseRepository,
  createInMemoryWalkStore,
  type InMemoryResponseRepository,
} from "./in-memory";
import { createWalkRuntime, DEFAULT_WALK_VERSIONS, type WalkRuntime } from "./walk-runtime";

const D1_SCOPE = getNodesByScope("mvp").map((node) => node.id);
const D1_CONFIG: FrontierWalkConfig = { scope: D1_SCOPE, entryTier: 2 };

/** Node-addressed synthetic pool with unlimited parallel depth (attempt index). */
const itemSource: WalkItemSource = {
  selectProbeItem({ node_id, attempt, form_id }) {
    const id = `${form_id}:${node_id}:${attempt}`;
    return { item_version_id: id, node_id, item_definition_hash: `hash-${id}` };
  },
};

function oracleScorer(
  repo: InMemoryResponseRepository,
  verdict: (submission: AssessmentItemSubmission) => "correct" | "incorrect",
): DiagnosticResponseScorer {
  return {
    async scoreAndAppend(submission) {
      const status = verdict(submission);
      const response: AssessmentItemResponse = {
        ...submission,
        authoritative_correct: status === "correct",
        scoring_status: status,
        reason_code: status,
      };
      await repo.append(response);
      return response;
    },
  };
}

/** Wire `createWalkRuntime` over the SHIPPED in-memory doubles (the Aurora parity reference). */
function harness(
  verdict: (submission: AssessmentItemSubmission) => "correct" | "incorrect",
) {
  const store = createInMemoryDiagnosticStore();
  const walkStore = createInMemoryWalkStore();
  const repo = createInMemoryResponseRepository();
  const placementWriter = createInMemoryPlacementWriter();
  const runtime = createWalkRuntime({
    config: D1_CONFIG,
    itemSource,
    store,
    walkStore,
    scorer: oracleScorer(repo, verdict),
    placementWriter,
  });
  return { runtime, store, walkStore, repo, placementWriter };
}

/** Drive a walk to completion (start → submit each probe → finalize). */
async function runToCompletion(runtime: WalkRuntime, administration: NewAdministration) {
  const serve = await runtime.engine.start(administration);
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
      equivalence_checker_version: administration.equivalence_checker_version,
      client_correct: false,
    });
    if (advance.complete) {
      break;
    }
    node = advance.node_id;
    item = advance.item;
    if (guard > 10_000) {
      throw new Error("walk runtime did not terminate");
    }
  }
  const completed = await runtime.engine.finalize(administrationId);
  return { completed, administrationId };
}

async function drivePre(
  verdict: (submission: AssessmentItemSubmission) => "correct" | "incorrect",
) {
  const h = harness(verdict);
  const { completed, administrationId } = await runToCompletion(
    h.runtime,
    h.runtime.newAdministration({ student_id: "stu-1" as UUID, purpose: "pre" }),
  );
  return { ...h, completed, administrationId };
}

describe("createWalkRuntime over the shipped in-memory doubles", () => {
  it("aces D1, persists walk state, seeds placement, and is reproducible from records", async () => {
    const { completed, walkStore, repo, placementWriter, administrationId } =
      await drivePre(() => "correct");

    expect(completed.coverage.coverage).toBeCloseTo(1, 10);
    // The in-memory walk store actually persisted the walk between turns.
    expect(walkStore.walks.size).toBe(1);
    expect(walkStore.walks.get(administrationId)).toBeDefined();
    // Pretest seeds placement for every scope node; responses were logged.
    expect(placementWriter.writes).toHaveLength(D1_SCOPE.length);
    expect(repo.responses.length).toBeGreaterThan(0);

    // Coverage recomputes bit-for-bit from routing_path + the logged response rows.
    const routingPath = completed.administration.routing_path;
    expect(routingPath).not.toBeNull();
    if (routingPath) {
      expect(recomputeCoverage(D1_SCOPE, routingPath, repo.responses).coverage).toBe(
        completed.coverage.coverage,
      );
    }
  });

  it("recomputes a positive pre/post coverage gain from the persisted records (parity)", async () => {
    // One immutable-record store + walk store spans the pre and post administrations
    // (the shipped doubles), each with its own served-order response repository.
    const store = createInMemoryDiagnosticStore();
    const walkStore = createInMemoryWalkStore();
    const student = "stu-pair" as UUID;

    const preRepo = createInMemoryResponseRepository();
    const prePlacement = createInMemoryPlacementWriter();
    const preRuntime = createWalkRuntime({
      config: D1_CONFIG,
      itemSource,
      store,
      walkStore,
      scorer: oracleScorer(preRepo, (submission) =>
        submission.node_id === "NUM.4" || submission.node_id === "NUM.2"
          ? "incorrect"
          : "correct",
      ),
      placementWriter: prePlacement,
    });
    const pre = await runToCompletion(
      preRuntime,
      preRuntime.newAdministration({ student_id: student, purpose: "pre" }),
    );

    const postRepo = createInMemoryResponseRepository();
    const postPlacement = createInMemoryPlacementWriter();
    const postRuntime = createWalkRuntime({
      config: D1_CONFIG,
      itemSource,
      store,
      walkStore,
      scorer: oracleScorer(postRepo, () => "correct"),
      placementWriter: postPlacement,
    });
    const post = await runToCompletion(
      postRuntime,
      postRuntime.newAdministration({ student_id: student, purpose: "post" }),
    );

    // Counterbalanced onto distinct forms so the pair is comparable (INV-DIAG-5).
    expect(pre.completed.administration.form_id).not.toBe(
      post.completed.administration.form_id,
    );

    const measurement = computeCoverageMeasurementFromRecords({
      pre: { administration: pre.completed.administration, responses: preRepo.responses },
      post: {
        administration: post.completed.administration,
        responses: postRepo.responses,
      },
      scope: D1_SCOPE,
    });

    expect(measurement.status).toBe("computed");
    // Engine parity: coverage recomputed from records == the live finalize coverage.
    expect(measurement.pre.coverage).toBe(pre.completed.coverage.coverage);
    expect(measurement.post.coverage).toBe(post.completed.coverage.coverage);
    expect(measurement.coverage_gain).toBeGreaterThan(0);
    // The pretest walk seeds placement; the posttest never does (INV-DIAG-1).
    expect(prePlacement.writes.length).toBeGreaterThan(0);
    expect(postPlacement.writes).toHaveLength(0);
  });

  it("stamps the coverage versions and counterbalances a student's pre vs post forms", () => {
    const { runtime } = harness(() => "correct");
    const pre = runtime.newAdministration({ student_id: "stu-1" as UUID, purpose: "pre" });
    const post = runtime.newAdministration({
      student_id: "stu-1" as UUID,
      purpose: "post",
    });

    // 3, not 2: the 2026-08-04 tail cut reads a pass's consequence live past the
    // twentieth item, which is a rule a stored record's replay depends on, so
    // Route A of probe-policy §3.4.1 required the bump. Version 2's rules stay
    // registered beside it — `coverage-measurement.test.ts` is where that freeze
    // is asserted, and it is what keeps records stamped 2 recomputing faithfully.
    expect(runtime.versions.scoring_model_version).toBe(3);
    // 4, not 2 or 3: the instrument widened past the six D1 nodes and then past the twenty
    // content-derived ones, and `scope` is an argument the reader supplies rather than a field
    // on the record, so leaving the version alone would have re-denominated every baseline
    // already collected (D-END4). Which node set each version denotes is recorded in
    // `walkInstrumentScope.test.ts`.
    expect(runtime.blueprint_version).toBe(6);
    expect(pre.scoring_model_version).toBe(3);
    expect(pre.blueprint_version).toBe(6);
    expect(pre.form_version).toBe(DEFAULT_WALK_VERSIONS.form_version);
    // Counterbalanced onto distinct forms so the pre/post pair is comparable (INV-DIAG-5).
    expect(pre.form_id).not.toBe(post.form_id);
  });
});

describe("createInMemoryWalkStore", () => {
  it("round-trips walk state (null before save, exact state after)", async () => {
    const store = createInMemoryWalkStore();
    const state: WalkState = {
      scope: ["NUM.2"],
      entry_tier: 2,
      target_tier: 2,
      current: "NUM.2",
      probed: {},
    };

    expect(await store.getWalk("adm-1")).toBeNull();
    await store.saveWalk("adm-1", state);
    expect(await store.getWalk("adm-1")).toEqual(state);
    expect(store.walks.get("adm-1")).toBe(state);
  });
});
