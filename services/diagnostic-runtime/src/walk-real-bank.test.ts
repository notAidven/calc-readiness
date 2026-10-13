import { createProductAnswerChecker } from "@cr/components";
import type { FrontierWalkConfig } from "@cr/diagnostic";
import {
  createItemPackWalkSource,
  D1_WALK_ITEM_PACK,
  toProductItemVersions,
} from "@cr/item-bank";
import { createAuthoritativeScorer } from "@cr/scorer";
import { getNodesByScope } from "@cr/skill-graph";
import type { UUID } from "@cr/state-schema";
import { describe, expect, it } from "vitest";

import {
  createInMemoryDiagnosticStore,
  createInMemoryPlacementWriter,
  createInMemoryResponseRepository,
  createInMemoryWalkStore,
} from "./in-memory";
import { createWalkRuntime } from "./walk-runtime";

/**
 * The §8 gate, closed. The amendment blocked flipping the default on one fact: the
 * shipped v1 forms hold 1 item per (node, difficulty) cell → 2 per node, so the
 * walk's 2-of-3 rule "cannot yet drive a confirmed failure or non-robust pass" on
 * the real bank. These tests drive the SHIPPED walk engine over the REAL deepened
 * walk pool (`D1_WALK_ITEM_PACK`) and the REAL authoritative scorer, and force a
 * probed node through the asymmetric third item — a confirmed fail and a non-robust
 * pass — proving three DISTINCT real items are served and graded per node.
 *
 * THE SCOPE HERE IS STILL D1, and the CHECKER is now the product (v2) one. The pairing
 * looks odd for a file whose subject is the D1 pack, and it is the only pairing that runs:
 * `DEFAULT_WALK_VERSIONS.equivalence_checker_version` moved to v2 when the walk's scope
 * widened, both checkers fail closed on a version mismatch, and this harness stamps the
 * runtime's own version onto every submission. Composed against the D1 checker it therefore
 * scored `scoring_error` on the first item, which `isScorable` refuses, so the walk
 * re-served that item until the 10,000-iteration guard tripped. That is the half-migration
 * wedge `DEFAULT_WALK_VERSIONS`' docblock warns about, reproduced here by accident, and
 * worth leaving recorded: it is total rather than partial, and it hits D1's items too.
 * v2 grades all 36 D1 walk items and every alternate spelling of them
 * (`docs/Diagnostic_11_Node_Scope_Measurement.md` §3), so nothing about what this file
 * measures changes.
 */

const D1_SCOPE = getNodesByScope("mvp").map((node) => node.id);
const D1_CONFIG: FrontierWalkConfig = { scope: D1_SCOPE, entryTier: 2 };

const ENTRY_BY_ID = new Map(
  D1_WALK_ITEM_PACK.map((entry) => [entry.item_version_id, entry] as const),
);

/** A valid raw answer that grades INCORRECT (never a fault, so it counts as a miss). */
function wrongAnswer(itemVersionId: string): string {
  const entry = ENTRY_BY_ID.get(itemVersionId);
  // "x" is a wrong-but-parseable expression; "999999" is out of every L2 numeric range.
  return entry?.answer.answer_spec.answer_type === "expression" ? "x" : "999999";
}

function rightAnswer(itemVersionId: string): string {
  return ENTRY_BY_ID.get(itemVersionId)?.answer.answer_key ?? "";
}

/**
 * Drive a pretest walk over the real bank + real scorer, forcing the FIRST probed
 * node through `pattern` (correct?/miss? per attempt) and acing every other node.
 * Returns the completed diagnostic, the persisted walk state, and the item ids
 * served for the forced node.
 */
async function driveFirstNode(pattern: readonly boolean[]) {
  const store = createInMemoryDiagnosticStore();
  const walkStore = createInMemoryWalkStore();
  const repo = createInMemoryResponseRepository();
  const placementWriter = createInMemoryPlacementWriter();
  const scorer = createAuthoritativeScorer(
    createProductAnswerChecker({
      itemVersions: toProductItemVersions(D1_WALK_ITEM_PACK),
    }),
    repo,
  );
  const runtime = createWalkRuntime({
    config: D1_CONFIG,
    itemSource: createItemPackWalkSource(D1_WALK_ITEM_PACK),
    store,
    walkStore,
    scorer,
    placementWriter,
  });

  const serve = await runtime.engine.start(
    runtime.newAdministration({ student_id: "stu-real" as UUID, purpose: "pre" }),
  );
  const administrationId = serve.administration.administration_id;
  const targetNode = serve.node_id;
  const servedForTarget: string[] = [];
  let targetAttempt = 0;
  let { node_id: node, item } = serve;

  for (let guard = 0; guard < 10_000; guard += 1) {
    const forced = node === targetNode ? (pattern[targetAttempt] ?? true) : true;
    if (node === targetNode) {
      servedForTarget.push(item.item_version_id);
      targetAttempt += 1;
    }
    const advance = await runtime.engine.submitProbe(administrationId, {
      administration_id: administrationId,
      item_version_id: item.item_version_id,
      node_id: node,
      raw_answer: forced
        ? rightAnswer(item.item_version_id)
        : wrongAnswer(item.item_version_id),
      item_definition_hash: item.item_definition_hash,
      equivalence_checker_version: runtime.versions.equivalence_checker_version,
      client_correct: forced,
    });
    if (advance.complete) {
      break;
    }
    node = advance.node_id;
    item = advance.item;
  }

  const completed = await runtime.engine.finalize(administrationId);
  const state = walkStore.walks.get(administrationId);
  return { completed, state, targetNode, servedForTarget, repo };
}

describe("v2 walk over the REAL deepened bank + REAL scorer (Amendment v2 §8)", () => {
  it("drives a CONFIRMED FAILURE (2-of-3 wrong) with three distinct real items", async () => {
    const { state, targetNode, servedForTarget, repo } = await driveFirstNode([
      false,
      false,
      false,
    ]);

    // Three DISTINCT real item versions were served for the one node.
    expect(servedForTarget).toHaveLength(3);
    expect(new Set(servedForTarget).size).toBe(3);
    for (const id of servedForTarget) {
      expect(ENTRY_BY_ID.get(id)?.node_id).toBe(targetNode);
    }

    // The adjudicator reached the asymmetric third item and confirmed the failure.
    const record = state?.probed[targetNode];
    expect(record?.outcomes).toEqual([false, false, false]);
    expect(record?.result).toBe("failed");

    // The real scorer graded all three as authoritative misses.
    const scored = repo.responses.filter((response) => response.node_id === targetNode);
    expect(scored).toHaveLength(3);
    expect(scored.every((response) => response.scoring_status === "incorrect")).toBe(true);
  });

  it("drives a NON-ROBUST PASS (2-of-3 correct) with three distinct real items", async () => {
    const { state, targetNode, servedForTarget } = await driveFirstNode([
      false,
      true,
      true,
    ]);

    expect(servedForTarget).toHaveLength(3);
    expect(new Set(servedForTarget).size).toBe(3);

    const record = state?.probed[targetNode];
    expect(record?.outcomes).toEqual([false, true, true]);
    expect(record?.result).toBe("passed");
    // Reaching a third item means it was NOT a clean 2/2 sweep → non-robust (no test-out).
    expect(record?.robust).toBe(false);
  });

  it("still decides a clean sweep in TWO items (robust pass — the 2-item boundary)", async () => {
    const { state, targetNode, servedForTarget } = await driveFirstNode([true, true]);

    expect(servedForTarget).toHaveLength(2);
    const record = state?.probed[targetNode];
    expect(record?.outcomes).toEqual([true, true]);
    expect(record?.result).toBe("passed");
    expect(record?.robust).toBe(true);
  });
});
