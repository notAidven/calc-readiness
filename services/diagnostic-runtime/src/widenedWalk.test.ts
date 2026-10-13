import { createProductAnswerChecker, PRODUCT_CHECKER_VERSION } from "@cr/components";
import type { FrontierWalkConfig } from "@cr/diagnostic";
import {
  canonicalRawAnswer,
  createItemPackWalkSource,
  DIAGNOSTIC_WALK_ITEM_PACK,
  DIAGNOSTIC_WALK_SCOPE,
  toProductItemVersions,
  wellFormedWrongRawAnswer,
} from "@cr/item-bank";
import { createAuthoritativeScorer } from "@cr/scorer";
import type { AssessmentItemResponse, UUID } from "@cr/state-schema";
import { describe, expect, it } from "vitest";

import {
  createInMemoryDiagnosticStore,
  createInMemoryPlacementWriter,
  createInMemoryResponseRepository,
  createInMemoryWalkStore,
} from "./in-memory";
import { createWalkRuntime, DEFAULT_WALK_VERSIONS } from "./walk-runtime";

/**
 * THE WIDENED INSTRUMENT, DRIVEN END TO END OVER THE REAL BANK AND THE REAL SCORER.
 *
 * `walk-real-bank.test.ts` is this file's D1 sibling and closed the §8 gate for the six
 * D1 nodes: three distinct real items per node, a confirmed fail, a non-robust pass. This
 * one is about the SCOPE and the CHECKER, which is where a widening can fail in a way no
 * unit test of either half would notice:
 *
 *  - **Every served item must be SCORABLE.** `isScorable` admits only `correct` and
 *    `incorrect`. Anything else leaves the walk state unchanged, so `attemptCount` does
 *    not advance and the identical item is re-served forever — and because
 *    `invalid_input` is not in `FAULT_STATUSES`, the administration hangs at a 0% fault
 *    rate and looks healthy in every metric it reports. That is exactly what the v1
 *    checker does to `RAD.1`, `RAD.2`, `RAD.4` and `EXP.1`
 *    (`docs/Diagnostic_11_Node_Scope_Measurement.md` §2), so it is the failure mode the
 *    checker migration exists to prevent and the one worth asserting behaviourally
 *    rather than by comparing two constants.
 *  - **The walk must TERMINATE inside the instrument ceiling.** A demo that asks eighty
 *    questions is not a demo.
 *
 * Both are driven through `createWalkRuntime` with `DEFAULT_WALK_VERSIONS` and the same
 * composition `aurora-server.ts` uses, so a half-migration of the checker version fails
 * here: each checker fails closed on a version mismatch, returning `scoring_error` on
 * every item including D1's.
 *
 * The 70-item ceiling is `DEFAULT_WALK_POLICY.maxItems` and is asserted as a bound, not
 * pinned as a value — the measured distribution over this scope lives in
 * `engines/diagnostic/sim/widened-scope.sim.test.ts`, which is a measurement tool rather
 * than a CI test.
 */

const CONFIG: FrontierWalkConfig = { scope: DIAGNOSTIC_WALK_SCOPE, entryTier: 2 };
const ENTRY_BY_ID = new Map(
  DIAGNOSTIC_WALK_ITEM_PACK.map((entry) => [entry.item_version_id, entry] as const),
);

/** The instrument ceiling in `DEFAULT_WALK_POLICY`. A walk may never exceed it. */
const INSTRUMENT_CEILING = 70;

interface WalkOutcome {
  itemsAsked: number;
  responses: readonly AssessmentItemResponse[];
  probedNodes: readonly string[];
  completed: Awaited<
    ReturnType<ReturnType<typeof createWalkRuntime>["engine"]["finalize"]>
  >;
}

/** Drive one pretest to completion, answering every probe `correct`ly or not. */
async function walk(ace: boolean, studentId: string): Promise<WalkOutcome> {
  const repository = createInMemoryResponseRepository();
  const runtime = createWalkRuntime({
    config: CONFIG,
    itemSource: createItemPackWalkSource(DIAGNOSTIC_WALK_ITEM_PACK),
    store: createInMemoryDiagnosticStore(),
    walkStore: createInMemoryWalkStore(),
    scorer: createAuthoritativeScorer(
      createProductAnswerChecker({
        itemVersions: toProductItemVersions(DIAGNOSTIC_WALK_ITEM_PACK),
      }),
      repository,
    ),
    placementWriter: createInMemoryPlacementWriter(),
  });

  const served = await runtime.engine.start(
    runtime.newAdministration({ student_id: studentId as UUID, purpose: "pre" }),
  );
  const administrationId = served.administration.administration_id;
  const probedNodes: string[] = [];
  let { node_id: node, item } = served;
  let itemsAsked = 0;

  for (let guard = 0; guard < 500; guard += 1) {
    const entry = ENTRY_BY_ID.get(item.item_version_id);
    if (!entry) {
      throw new Error(`served an item the pack does not carry: ${item.item_version_id}`);
    }
    probedNodes.push(node);
    itemsAsked += 1;
    const advance = await runtime.engine.submitProbe(administrationId, {
      administration_id: administrationId,
      item_version_id: item.item_version_id,
      node_id: node,
      raw_answer: ace ? canonicalRawAnswer(entry.answer) : wellFormedWrongRawAnswer(entry),
      item_definition_hash: item.item_definition_hash,
      equivalence_checker_version: runtime.versions.equivalence_checker_version,
      client_correct: ace,
    });
    if (advance.complete) {
      break;
    }
    node = advance.node_id;
    item = advance.item;
  }

  const completed = await runtime.engine.finalize(administrationId);
  return { itemsAsked, responses: [...repository.responses], probedNodes, completed };
}

describe("the widened walk over the real bank + the real product scorer", () => {
  it("stamps and composes the SAME checker version", () => {
    // The half-migration guard, stated as the relationship rather than as two facts: the
    // client's stamp, the runtime's stamp and the composed checker must be one version.
    // `apps/web`'s side of it is `diagnosticCheckerParity.reachability.test.ts`.
    expect(DEFAULT_WALK_VERSIONS.equivalence_checker_version).toBe(PRODUCT_CHECKER_VERSION);
  });

  it("scores every served item, so no probe can wedge the administration", async () => {
    const { responses, itemsAsked } = await walk(true, "stu-widened-ace");
    expect(itemsAsked).toBeGreaterThanOrEqual(DIAGNOSTIC_WALK_SCOPE.length / 4);
    expect(responses.length).toBe(itemsAsked);
    const unscorable = responses.filter(
      (response) =>
        response.scoring_status !== "correct" && response.scoring_status !== "incorrect",
    );
    expect(
      unscorable.map(
        (r) => `${r.node_id}/${r.item_version_id}: ${r.scoring_status}/${r.reason_code}`,
      ),
      "an unscorable response re-serves the same item forever and never trips the fault budget",
    ).toEqual([]);
  });

  it("aces to a complete pass over the whole scope, inside the ceiling", async () => {
    const { completed, itemsAsked } = await walk(true, "stu-widened-ace-2");
    expect(itemsAsked).toBeLessThanOrEqual(INSTRUMENT_CEILING);
    expect(completed.ceiling_reached).toBe(false);
    expect(completed.resolved.length).toBe(DIAGNOSTIC_WALK_SCOPE.length);
    expect(completed.resolved.every((node) => node.status === "passed")).toBe(true);
    expect(completed.coverage.coverage).toBeCloseTo(1, 5);
    // Placement is emitted for EVERY in-scope node, not only the probed ones — this is
    // the object `citySession.seedFromPlacement` consumes.
    expect(Object.keys(completed.placement_by_node).sort()).toEqual(
      [...DIAGNOSTIC_WALK_SCOPE].sort(),
    );
    expect(
      Object.values(completed.placement_by_node).every((level) => level >= 2),
      "acing every probe must place every node at or above the test-out threshold",
    ).toBe(true);
  });

  it("misses every item and still completes, inside the ceiling, placing nothing", async () => {
    // The other end of the range, and the one that actually stresses the ceiling: a
    // student who misses everything prunes rather than credits, so the walk explores
    // differently and asks more.
    const { completed, itemsAsked, responses } = await walk(false, "stu-widened-miss");
    expect(
      responses
        .filter((r) => r.scoring_status !== "incorrect")
        .map((r) => `${r.node_id}: ${r.scoring_status}/${r.reason_code}`),
    ).toEqual([]);
    expect(itemsAsked).toBeLessThanOrEqual(INSTRUMENT_CEILING);
    expect(completed.resolved.length).toBe(DIAGNOSTIC_WALK_SCOPE.length);
    expect(completed.resolved.some((node) => node.status === "failed")).toBe(true);
    expect(completed.resolved.every((node) => node.status !== "passed")).toBe(true);
    expect(
      Object.values(completed.placement_by_node).every((level) => level < 2),
      "missing everything must place nothing at the test-out threshold",
    ).toBe(true);
  });

  it("actually asks questions outside D1, across several strands", async () => {
    // Measured on the ACING student, deliberately. A student who misses everything is
    // decided entirely inside D1 and that is the prune working as designed — a failed root
    // removes its whole dependent cone, so there is nothing left to ask elsewhere. The
    // claim worth guarding is the other one: a strong learner is genuinely examined across
    // the widened graph rather than being handed six D1 questions and a lot of inference.
    const { probedNodes } = await walk(true, "stu-widened-spread");
    const beyondD1 = probedNodes.filter((id) => !id.startsWith("NUM."));
    expect(
      beyondD1,
      "every probe landed in D1, so the widening bought no measurement",
    ).not.toEqual([]);
    const families = new Set(probedNodes.map((id) => id.split(".")[0]));
    expect(
      families.size,
      "a widened instrument that only ever probes one strand is not measuring the widening",
    ).toBeGreaterThanOrEqual(4);
  });
});
