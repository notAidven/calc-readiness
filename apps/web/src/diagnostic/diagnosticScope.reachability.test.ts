import {
  DIAGNOSTIC_WALK_ITEM_PACK,
  DIAGNOSTIC_WALK_SCOPE,
  diagnosticScopeCensus,
} from "@cr/item-bank";
import { getProductNodes } from "@cr/skill-graph";
import { describe, expect, it } from "vitest";

import { domainForNode, lessonByNode, practiceSourceForNode } from "../lessons/domains";
import type { LessonContent } from "../lessons/types";
import { skillDisplayName } from "./skillNames";

/**
 * **THE DIAGNOSTIC NEVER PLACES A LEARNER SOMEWHERE THERE IS NOTHING TO DO.**
 *
 * The instrument's scope is derived in `@cr/item-bank`, which can see the ITEM half of
 * "content exists for this node" — a practice pool, and >= 3 servable walk items per form —
 * and cannot see the LESSON half, because lesson packs live under `content/lessons/` and are
 * discovered through `import.meta.glob`, which is a Vite feature the Lambda-side package has
 * no access to. So the lesson half is asserted here, where the packs are readable.
 *
 * It matters because a placement is a DESTINATION. A node placed at 0 or 1 sends the learner
 * to its lesson and then to its practice set; a node placed at 2 or 3 is announced by name
 * as a skill they tested out of, which needs a display name. A scope node missing any of
 * those three is worse than one the diagnostic skips: the learner is told to go somewhere
 * that does not exist. That is the failure `lessonDomains.reachability.test.ts` was written
 * for when D2 shipped authored-but-unwired, in the other direction.
 *
 * Deliberately a NODE test, collected by the root `web-reachability` project: no jsdom, no
 * Chromium, nothing to wedge, and it runs under `npm run test:unit` and in CI.
 */

/** Every authored pack on disk, discovered the way each domain module discovers its own. */
const authoredPacks = import.meta.glob<LessonContent>(
  "../../../../content/lessons/*/*.json",
  { eager: true, import: "default" },
);

const lessonNodesOnDisk = new Set(Object.values(authoredPacks).map((pack) => pack.node_id));

describe("everything the diagnostic can place into has content behind it", () => {
  it("found the packs and the scope, so nothing below passes over nothing", () => {
    // Two floors, because every assertion after this is a per-member loop and a loop over an
    // empty collection is green. Both raised with `POL.5`: there is a pack for every node in
    // the product now and the instrument administers all of them, so the floors are the real
    // numbers rather than a margin under them.
    expect(
      lessonNodesOnDisk.size,
      "no lesson packs were discovered",
    ).toBeGreaterThanOrEqual(62);
    expect(
      DIAGNOSTIC_WALK_SCOPE.length,
      "the scope resolved to nothing",
    ).toBeGreaterThanOrEqual(62);
  });

  it("has an authored lesson pack on disk for every node in scope", () => {
    const missing = DIAGNOSTIC_WALK_SCOPE.filter((id) => !lessonNodesOnDisk.has(id));
    expect(
      missing,
      "the diagnostic can place a learner into these nodes and there is no lesson to send them to",
    ).toEqual([]);
  });

  it("reaches that pack through the app's own registry, in its own domain", () => {
    // On disk is not the same as wired. `lessonByNode` is what the city lesson host and the
    // `?dev` list read, and a pack the registry cannot resolve is unreachable however well
    // authored — which is the exact defect that file's sibling exists for.
    for (const nodeId of DIAGNOSTIC_WALK_SCOPE) {
      expect(lessonByNode[nodeId], `${nodeId} is not in the lesson registry`).toBeDefined();
      expect(domainForNode(nodeId)?.id, `${nodeId} resolves no domain`).toBeDefined();
    }
  });

  it("builds a gradable practice set for every node in scope", () => {
    // The crash this rules out: a learner placed at 0 opens the lesson, finishes it, reaches
    // practice, and the pool throws "not enough practice instances".
    for (const nodeId of DIAGNOSTIC_WALK_SCOPE) {
      const source = practiceSourceForNode(nodeId);
      expect(source.nodeId, `${nodeId} dispatched to another node's pool`).toBe(nodeId);
      const { initialInstanceIds } = source.createSession();
      expect(
        initialInstanceIds.length,
        `${nodeId} builds no practice set`,
      ).toBeGreaterThanOrEqual(1);
    }
  });

  it("has a learner-facing name for every node in scope", () => {
    // Placement 2 or 3 is announced BY NAME on the results table and again in the city
    // roster, so a scope node with no display name leaks a raw registry id into the UI.
    for (const nodeId of DIAGNOSTIC_WALK_SCOPE) {
      expect(skillDisplayName(nodeId), `${nodeId} has no display name`).not.toBe(nodeId);
    }
  });

  it("serves a prompt for every item it can serve", () => {
    // An item whose prompt fell out of the pack renders its own id as the question.
    for (const entry of DIAGNOSTIC_WALK_ITEM_PACK) {
      expect(entry.prompt.trim(), `${entry.item_version_id} has no prompt`).not.toBe("");
    }
  });
});

describe("the nodes the diagnostic does NOT reach, and why", () => {
  /**
   * The other direction, and the reason this file is not only a per-member loop.
   *
   * A guard that checks "every scope node has content" is satisfied by a scope of one, so the
   * SHORTFALL is asserted too. **The sentence it pins has changed twice and there is no
   * shortfall left to pin.** It used to be that the nodes outside the instrument lacked
   * assessment items and not lessons; the practice-derived walk pack gave items to all but six
   * of them, and "outside" then meant two different things, counted apart so neither could grow
   * behind the other:
   *
   *  - **not servable at all**: five nodes, then one. `POL.6` and `POL.7` were authored, which
   *    took the placement horizon from the sixth era to the seventh; `EL.3`, `TRG.7` and `TRG.8`
   *    had templates whose drawable space their own practice pool had spent, and each was fixed
   *    with authored VARIATION rather than a loosened ledger, which took `EL.4` and `EL.5` out
   *    of the prerequisite pruning with `EL.3`. `POL.5` was the last, and authoring it emptied
   *    the group.
   *  - **servable but not administered**: behind the placement horizon. Empty too, and for a
   *    consequence of the same edit rather than a second one: the horizon stops at the first
   *    era it cannot fully serve, and there is no longer such an era.
   *
   * **So the shortfall claim inverts rather than relaxing.** The previous version floored the
   * beyond-the-horizon group at fifteen and the unservable group at one, and its own comment
   * said what to do when the second went to zero: *"there will then be nothing to check here,
   * and that is a shape to decide about rather than a floor to lower again."* The shape decided
   * on is a pair of named-empty assertions plus the positive claim underneath them, which fails
   * on the first node to leave the instrument by either route and names which route it took.
   * A floor of one would now have to be lowered to zero, and a floor of zero asserts nothing.
   */
  it("has no shortfall left by either route, and the instrument is the product", () => {
    const census = diagnosticScopeCensus();
    expect(census.length, "the census returned nothing").toBeGreaterThanOrEqual(62);
    const outside = census.filter((row) => !row.in_scope);
    const unservable = outside.filter((row) => !row.servable);
    const beyondHorizon = outside.filter((row) => row.servable);

    expect(
      unservable.map((row) => row.node_id),
      "these in-product nodes cannot be served, so a content gap has reopened",
    ).toEqual([]);
    expect(
      beyondHorizon.map((row) => row.node_id),
      "these nodes are complete destinations the instrument has stopped asking about",
    ).toEqual([]);

    // The positive form, which two empty sets cannot state on their own: every in-product node
    // is administered, and each one is a real destination with all three things behind it. This
    // is the loop the beyond-the-horizon check used to run over its own small group, widened to
    // the whole census now that the group it was scoped to is empty.
    expect(census.filter((row) => row.in_scope).length).toBe(census.length);
    for (const row of census) {
      expect(
        lessonNodesOnDisk.has(row.node_id),
        `${row.node_id} is administered and has no lesson to send a learner to`,
      ).toBe(true);
      expect(row.has_practice_pool, `${row.node_id} has no practice pool`).toBe(true);
      expect(row.form_a_items, `${row.node_id} Form A`).toBeGreaterThanOrEqual(3);
      expect(row.form_b_items, `${row.node_id} Form B`).toBeGreaterThanOrEqual(3);
    }
  });

  it("accounts for every in-product node exactly once", () => {
    const census = diagnosticScopeCensus();
    expect(census.length).toBe(getProductNodes().length);
    expect(new Set(census.map((row) => row.node_id)).size).toBe(census.length);
    const inScope = census.filter((row) => row.in_scope).map((row) => row.node_id);
    expect([...inScope].sort()).toEqual([...DIAGNOSTIC_WALK_SCOPE].sort());
  });
});
