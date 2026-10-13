/**
 * Cross-domain reachability — the guard that an authored lesson domain is WIRED, not
 * just written.
 *
 * D2 shipped fully authored and completely unreachable: `d2.ts` had zero importers, so
 * its lessons had no host lookup, no dev-view entry and no practice source, and a D2
 * lesson that reached practice fell through to the D1 pool and threw "not enough practice
 * instances". Nothing went red, because every test we had iterated `d1Lessons`.
 *
 * These properties are domain-generic, so they cover D3+ the moment its packs land:
 *
 *  1. Every `content/lessons/<id>/` folder on disk is registered in `LESSON_DOMAINS`, and
 *     every pack in it is reachable through the all-domains registry.
 *  2. Every registered lesson resolves a practice source in ITS OWN domain.
 *  3. Every registered lesson builds its full practice set — every difficulty cell —
 *     with each drawn instance registered with the practice checker, so the set is
 *     gradable rather than merely built, and each cell can also serve a retry.
 *
 * Deliberately a NODE test: no jsdom, no Chromium, nothing to wedge. It is collected by
 * the root `web-reachability` project so `npm run test:unit` and CI both run it.
 */

// TEMPORARY, and read only by the demonstration-pin exemption below.
import { isDemoPinned } from "@cr/item-bank";
import { PRACTICE_SET_SIZE } from "@cr/mastery-service";
import { describe, expect, it } from "vitest";

import {
  allLessons,
  domainForNode,
  LESSON_DOMAINS,
  lessonByNode,
  practiceSourceForNode,
} from "./domains";
import { practiceItemsById } from "./practiceChecker";
import type { LessonContent } from "./types";

/** Every authored pack on disk, discovered the way each domain module discovers its own. */
const authoredPacks = import.meta.glob<LessonContent>(
  "../../../../content/lessons/*/*.json",
  { eager: true, import: "default" },
);

/** ".../content/lessons/d2/EXP.1.json" -> "d2". */
function domainIdOf(path: string): string {
  const folder = /\/content\/lessons\/([^/]+)\//.exec(path)?.[1];
  if (!folder) {
    throw new Error(`unexpected lesson pack path: ${path}`);
  }
  return folder;
}

describe("every authored domain is registered", () => {
  const authoredDomainIds = [...new Set(Object.keys(authoredPacks).map(domainIdOf))].sort();

  it("has a LESSON_DOMAINS entry for every content/lessons/<id> folder", () => {
    // Both shipped domains must be present, so the test cannot pass vacuously.
    expect(authoredDomainIds).toEqual(expect.arrayContaining(["d1", "d2"]));
    expect([...LESSON_DOMAINS].map((domain) => domain.id).sort()).toEqual(
      authoredDomainIds,
    );
  });

  it("exposes every authored pack through the all-domains registry", () => {
    for (const [path, pack] of Object.entries(authoredPacks)) {
      expect(lessonByNode[pack.node_id], `${path} is not in the registry`).toBeDefined();
      expect(domainForNode(pack.node_id)?.id, `${path} resolves the wrong domain`).toBe(
        domainIdOf(path),
      );
    }
  });

  it("gives every registered domain at least one lesson", () => {
    for (const domain of LESSON_DOMAINS) {
      expect(domain.lessons.length, `${domain.id} registers no lessons`).toBeGreaterThan(0);
    }
  });

  it("authors each node in exactly one domain", () => {
    const nodeIds = allLessons.map((lesson) => lesson.node_id);
    expect(new Set(nodeIds).size).toBe(nodeIds.length);
  });
});

for (const domain of LESSON_DOMAINS) {
  describe(`${domain.id} lessons reach practice`, () => {
    for (const lesson of domain.lessons) {
      it(`${lesson.node_id} resolves its own domain's practice source`, () => {
        expect(domainForNode(lesson.node_id)?.id).toBe(domain.id);
        const resolved = practiceSourceForNode(lesson.node_id);
        expect(resolved.nodeId).toBe(lesson.node_id);
        // A retry draw is deterministic per pool, so drawing the same cell from the
        // dispatched source and from the domain's own source must agree — dispatching
        // to another domain's pool returns a different id, or nothing at all.
        const own = domain.practiceSource(lesson.node_id).drawFresh(1, []);
        expect(own, `${domain.id} serves no L1 retry for ${lesson.node_id}`).toBeDefined();
        expect(resolved.drawFresh(1, [])?.item_version_id).toBe(own?.item_version_id);
      });

      it(`${lesson.node_id} builds a gradable set across every difficulty cell`, () => {
        const source = practiceSourceForNode(lesson.node_id);
        // The crash this whole file exists for: an unwired domain throws right here.
        const { initialInstanceIds } = source.createSession();
        expect(initialInstanceIds).toHaveLength(PRACTICE_SET_SIZE);

        const items = initialInstanceIds.map((id) => practiceItemsById.get(id));
        for (const [slot, item] of items.entries()) {
          expect(item, `slot ${slot} is not registered with the checker`).toBeDefined();
          expect(item?.node_id).toBe(lesson.node_id);
        }

        // The mix is served easy -> hard, so a non-decreasing run of PRACTICE_SET_SIZE
        // slots means every difficulty cell the domain declares was drawn.
        const difficulties = items.map((item) => item?.difficulty ?? 0);
        expect([...difficulties].sort((a, b) => a - b)).toEqual(difficulties);
        expect(new Set(difficulties).size).toBeGreaterThan(1);

        // Every opening item must have a reveal -> "Try a new version" retry that is a
        // different id AND a different prompt (the UI hard-uniqueness gate).
        for (const item of items) {
          if (!item) {
            continue;
          }
          // TEMPORARY. A template pinned to one instance for the demonstration has no second
          // version to offer, so it is skipped rather than reported as an unreachable retry.
          // Everything above this line still applies to it: the pinned item must still be
          // registered, gradable, and in the right cell. What is excused is only the retry.
          // Proved still earned by `describe("the demonstration pin")` in `d3.test.ts`.
          if (isDemoPinned(item.template_id)) {
            continue;
          }
          const fresh = source.drawFresh(
            item.difficulty,
            initialInstanceIds,
            item.template_id,
          );
          expect(fresh, `no retry instance for ${item.item_version_id}`).toBeDefined();
          expect(fresh?.item_version_id).not.toBe(item.item_version_id);
          const freshFrozen = fresh
            ? practiceItemsById.get(fresh.item_version_id)
            : undefined;
          expect(freshFrozen?.prompt).not.toBe(item.prompt);
        }
      });
    }
  });
}
