import { getNodesByScope } from "@cr/skill-graph";
import type {
  AssessmentAdministration,
  AssessmentItemResponse,
  AssessmentItemSubmission,
  AssessmentPurpose,
  PlacementEstimate,
  UUID,
} from "@cr/state-schema";
import { describe, expect, it } from "vitest";

import {
  computeCoverageMeasurementFromRecords,
  recomputeCoverage,
} from "./coverage-measurement";
import type {
  DiagnosticAdministrationStore,
  DiagnosticResponseScorer,
  NewAdministration,
} from "./engine";
import type { WalkState } from "./walk";
import {
  createFrontierWalkEngine,
  type FrontierWalkConfig,
  type WalkItemSource,
  type WalkProgressStore,
} from "./walk-engine";

const D1_SCOPE = getNodesByScope("mvp").map((node) => node.id);
const D1_CONFIG: FrontierWalkConfig = { scope: D1_SCOPE, entryTier: 2 };

let idCounter = 0;
function nextAdministrationId(): UUID {
  idCounter += 1;
  return `walk-admin-${idCounter}` as UUID;
}

type Verdict = "correct" | "incorrect" | "scoring_error";

/** Node-addressed synthetic pool with unlimited parallel depth (attempt index). */
const itemSource: WalkItemSource = {
  selectProbeItem({ node_id, attempt, form_id }) {
    const id = `${form_id}:${node_id}:${attempt}`;
    return { item_version_id: id, node_id, item_definition_hash: `hash-${id}` };
  },
};

function inMemoryAdminStore(): DiagnosticAdministrationStore & {
  administrations: Map<string, AssessmentAdministration>;
} {
  const administrations = new Map<string, AssessmentAdministration>();
  return {
    administrations,
    async createAdministration(input: NewAdministration) {
      const administration: AssessmentAdministration = {
        administration_id: nextAdministrationId(),
        ...input,
        routing_path: null,
        started_at: new Date(0).toISOString(),
        submitted_at: null,
      };
      administrations.set(administration.administration_id, administration);
      return administration;
    },
    async getAdministration(id) {
      const administration = administrations.get(id);
      if (!administration) {
        throw new Error(`unknown administration ${id}`);
      }
      return administration;
    },
    async getProgress() {
      return null;
    },
    async saveProgress() {},
    async finalizeAdministration({ administration_id, routing_path }) {
      const administration = administrations.get(administration_id);
      if (!administration) {
        throw new Error(`unknown administration ${administration_id}`);
      }
      const finalized = {
        ...administration,
        routing_path,
        submitted_at: new Date(1).toISOString(),
      };
      administrations.set(administration_id, finalized);
      return finalized;
    },
  };
}

function inMemoryWalkStore(): WalkProgressStore {
  const byId = new Map<string, WalkState>();
  return {
    async getWalk(id) {
      return byId.get(id) ?? null;
    },
    async saveWalk(id, state) {
      byId.set(id, state);
    },
  };
}

function oracleScorer(
  responses: AssessmentItemResponse[],
  verdict: (submission: AssessmentItemSubmission) => Verdict,
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
      responses.push(response);
      return response;
    },
  };
}

function inMemoryPlacement() {
  const writes: {
    student_id: UUID;
    node_id: string;
    placement_estimate: PlacementEstimate;
  }[] = [];
  return {
    writes,
    async writePlacement(input: {
      student_id: UUID;
      node_id: string;
      placement_estimate: PlacementEstimate;
    }) {
      writes.push(input);
    },
  };
}

function newAdministration(purpose: AssessmentPurpose, form_id: string): NewAdministration {
  return {
    student_id: "walk-student" as UUID,
    purpose,
    form_id,
    form_version: 1,
    blueprint_version: 2,
    scoring_engine_version: 1,
    scoring_model_version: 2,
    equivalence_checker_version: 1,
  };
}

interface Harness {
  store: ReturnType<typeof inMemoryAdminStore>;
  placement: ReturnType<typeof inMemoryPlacement>;
  responses: AssessmentItemResponse[];
}

async function driveWalk(
  input: NewAdministration,
  verdict: (submission: AssessmentItemSubmission) => Verdict,
  harness?: Harness,
) {
  const store = harness?.store ?? inMemoryAdminStore();
  const placement = harness?.placement ?? inMemoryPlacement();
  const responses = harness?.responses ?? [];
  const engine = createFrontierWalkEngine({
    config: D1_CONFIG,
    itemSource,
    store,
    walkStore: inMemoryWalkStore(),
    scorer: oracleScorer(responses, verdict),
    placementWriter: placement,
  });

  const serve = await engine.start(input);
  const administrationId = serve.administration.administration_id;
  let node = serve.node_id;
  let item = serve.item;
  let guard = 0;
  for (;;) {
    const submission: AssessmentItemSubmission = {
      administration_id: administrationId,
      item_version_id: item.item_version_id,
      node_id: node,
      raw_answer: "answer",
      item_definition_hash: item.item_definition_hash,
      equivalence_checker_version: input.equivalence_checker_version,
      client_correct: false,
    };
    const advance = await engine.submitProbe(administrationId, submission);
    if (advance.complete) {
      break;
    }
    node = advance.node_id;
    item = advance.item;
    if (++guard > 10_000) {
      throw new Error("walk engine did not terminate");
    }
  }

  const completed = await engine.finalize(administrationId);
  return { completed, store, placement, responses };
}

describe("frontier walk engine (v2, end to end through the ports)", () => {
  it("aces D1 with test-out and seeds placement (pretest)", async () => {
    const { completed, placement } = await driveWalk(
      newAdministration("pre", "A"),
      () => "correct",
    );

    expect(completed.coverage.coverage).toBeCloseTo(1, 10);
    expect(completed.probed_node_count).toBeLessThan(D1_SCOPE.length); // roots inferred, not probed
    expect(completed.placement_by_node["NUM.4"]).toBe(3); // measured pass
    expect(completed.placement_by_node["NUM.S"]).toBe(2); // inferred pass
    expect(completed.per_domain_coverage.D1).toBeCloseTo(1, 10);

    // Pretest seeds placement for every scope node; routing_path is the probe trace.
    expect(placement.writes).toHaveLength(D1_SCOPE.length);
    expect(completed.administration.routing_path).toEqual(completed.path);
    expect(completed.administration.submitted_at).not.toBeNull();
    // The finalized result says which of the three endings this was, so a reader
    // can tell a complete picture from a truncated one. D1 cannot reach the
    // ceiling (18 items against 70); `walk-ceiling.test.ts` covers the case that
    // can. Asserted here because the flag is only worth carrying if it arrives.
    expect(completed.ceiling_reached).toBe(false);
  });

  it("fails fail-closed and never seeds a pass (posttest writes no placement)", async () => {
    const { completed, placement } = await driveWalk(
      newAdministration("post", "B"),
      () => "incorrect",
    );
    expect(completed.coverage.coverage).toBe(0);
    for (const value of Object.values(completed.placement_by_node)) {
      expect(value).toBeLessThanOrEqual(1); // failed floor or not-ready; never a pass seed
    }
    expect(placement.writes).toHaveLength(0); // posttest never writes placement
  });

  it("localizes a broken top node while crediting the foundation", async () => {
    const { completed } = await driveWalk(newAdministration("pre", "A"), (s) =>
      s.node_id === "NUM.4" ? "incorrect" : "correct",
    );
    // Hard fail (no correct attempt) seeds not-ready (0); the foundation is credited.
    expect(completed.placement_by_node["NUM.4"]).toBe(0);
    expect(completed.placement_by_node["NUM.S"]).toBeGreaterThanOrEqual(2);
    expect(completed.coverage.coverage).toBeGreaterThan(0);
    expect(completed.coverage.coverage).toBeLessThan(1);
  });

  it("seeds a partial floor (1) for a fail that still had a correct attempt", async () => {
    // NUM.4 grades correct once then misses twice -> 1-of-3 fail (partial ground).
    const { completed } = await driveWalk(newAdministration("pre", "A"), (s) => {
      if (s.node_id !== "NUM.4") return "correct";
      return Number(s.item_version_id.split(":")[2]) === 0 ? "correct" : "incorrect";
    });
    expect(completed.placement_by_node["NUM.4"]).toBe(1);
  });

  it("re-serves the same node on a fault without scoring it", async () => {
    const store = inMemoryAdminStore();
    let served404 = false;
    const engine = createFrontierWalkEngine({
      config: D1_CONFIG,
      itemSource,
      store,
      walkStore: inMemoryWalkStore(),
      scorer: oracleScorer([], () => {
        // Fault the very first item once; everything else grades correct.
        if (!served404) {
          served404 = true;
          return "scoring_error";
        }
        return "correct";
      }),
      placementWriter: inMemoryPlacement(),
    });

    const serve = await engine.start(newAdministration("pre", "A"));
    const firstNode = serve.node_id;
    const advance = await engine.submitProbe(serve.administration.administration_id, {
      administration_id: serve.administration.administration_id,
      item_version_id: serve.item.item_version_id,
      node_id: firstNode,
      raw_answer: "answer",
      item_definition_hash: serve.item.item_definition_hash,
      equivalence_checker_version: 1,
      client_correct: false,
    });
    expect(advance.complete).toBe(false);
    if (!advance.complete) {
      expect(advance.node_id).toBe(firstNode); // same node re-served after the fault
    }
  });

  it("is reproducible: identical inputs yield identical coverage + probe order", async () => {
    const verdict = (s: AssessmentItemSubmission): Verdict =>
      s.node_id === "NUM.4" ? "incorrect" : "correct";
    const a = await driveWalk(newAdministration("pre", "A"), verdict);
    const b = await driveWalk(newAdministration("pre", "A"), verdict);
    expect(a.completed.coverage.coverage).toBe(b.completed.coverage.coverage);
    expect(a.completed.path).toEqual(b.completed.path);
    expect(a.completed.resolved).toEqual(b.completed.resolved);
  });

  it("reports a positive coverage gain from a broken pre to a healthy post", async () => {
    const pre = await driveWalk(newAdministration("pre", "A"), (s) =>
      s.node_id === "NUM.4" || s.node_id === "NUM.2" ? "incorrect" : "correct",
    );
    const post = await driveWalk(newAdministration("post", "B"), () => "correct");
    expect(post.completed.coverage.coverage).toBeGreaterThan(
      pre.completed.coverage.coverage,
    );
  });
});

describe("coverage is reproducible from immutable records (INV-DIAG-4)", () => {
  it("recomputes the engine's exact coverage from routing_path + response rows", async () => {
    const { completed, responses } = await driveWalk(newAdministration("pre", "A"), (s) =>
      s.node_id === "NUM.4" ? "incorrect" : "correct",
    );
    const routingPath = completed.administration.routing_path;
    expect(routingPath).not.toBeNull();
    if (!routingPath) {
      return;
    }

    // Recompute purely from records — no live walk state — and match bit-for-bit.
    const recomputed = recomputeCoverage(D1_SCOPE, routingPath, responses);
    expect(recomputed.coverage).toBe(completed.coverage.coverage);
    expect(recomputed.coverage_measured).toBe(completed.coverage.coverage_measured);
    // Deterministic across repeated recomputation.
    expect(recomputeCoverage(D1_SCOPE, routingPath, responses).coverage).toBe(
      recomputed.coverage,
    );
  });

  it("pairs a valid pre/post coverage gain from records, matching the live engine", async () => {
    const pre = await driveWalk(newAdministration("pre", "A"), (s) =>
      s.node_id === "NUM.4" || s.node_id === "NUM.2" ? "incorrect" : "correct",
    );
    const post = await driveWalk(newAdministration("post", "B"), () => "correct");

    const measurement = computeCoverageMeasurementFromRecords({
      pre: { administration: pre.completed.administration, responses: pre.responses },
      post: { administration: post.completed.administration, responses: post.responses },
      scope: D1_SCOPE,
    });

    expect(measurement.status).toBe("computed");
    expect(measurement.pre.coverage).toBe(pre.completed.coverage.coverage);
    expect(measurement.post.coverage).toBe(post.completed.coverage.coverage);
    expect(measurement.coverage_gain).toBeCloseTo(
      post.completed.coverage.coverage - pre.completed.coverage.coverage,
      10,
    );
    expect(measurement.coverage_gain).toBeGreaterThan(0);
  });
});
