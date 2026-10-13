import { ERA_SEQUENCE, type EraId, getEraNodes } from "@cr/skill-graph";
import { describe, expect, it } from "vitest";

import {
  cityModelUrls,
  MODEL_STAGES,
  nodeFilePrefix,
  nodeModelUrls,
  SKILL_MODEL_NODES,
} from "./buildingAssets";

/**
 * ERA TWO'S FIVE SKILL BUILDINGS ARE BUNDLED AND ADDRESSABLE — fifteen GLBs, five nodes
 * × three stages, flat in `art/models/` under node-derived basenames.
 *
 * ## WHY THIS FILE EXISTS SEPARATELY FROM `buildingAssets.test.ts`
 *
 * That file pins the model glob's SHAPE — the count, the `civic-` exclusion, the
 * disjointness from the hall's subdirectory. This one pins the ERA COVERAGE question it
 * cannot answer: which eras have exported skill art, and does the tree agree. The two are
 * different claims and a count cannot carry the second, because a count of 48 is satisfied
 * by era one's 18 plus thirty files from any two undeclared cohorts.
 *
 * ## THE POPULATION IS EVERY ERA, NOT EVERY ERA WITH ART
 *
 * The tempting population is "the eras that have models", which is unfalsifiable: it is
 * read off the very registry the guard is checking, so it agrees with the tree by
 * construction and would go on agreeing if all fifteen files were deleted. The population
 * here is therefore **all ten of `ERA_SEQUENCE`**, split by a named declaration of which
 * ones have had their skill art exported, and asserted in BOTH directions:
 *
 * - an era declared as having art whose nodes do not all resolve three stages FAILS, so a
 *   deleted GLB, a renamed node or a `d2/` subdirectory that made the glob miss the files
 *   lands here;
 * - an era declared as NOT having art whose nodes resolve ANY stage FAILS, so a later era's
 *   first drop cannot land without this declaration being updated, and the declaration
 *   cannot go on excusing an absence that has stopped existing.
 *
 * The second direction is the one that stops the exemption becoming permanent by neglect,
 * and it is provable rather than assumed: move `"industrial"` out of
 * {@link ERAS_WITH_EXPORTED_SKILL_ART} and the second assertion fails at FUN.1; add a
 * later era before its files exist and the first fails there.
 *
 * ## THE FLOORS, AND WHAT EACH ONE RULES OUT
 *
 * Every assertion below is over a DERIVED set, and a derived set can be empty. So each
 * carries a floor, because "every member has three stages" and "no member has any stage"
 * are both free over nothing:
 *
 * - `ERA_SEQUENCE` is at least ten, so the split is over the real run;
 * - the declared-with-art list is exactly the nine model-backed eras;
 * - **era two alone is at least five nodes and fifteen urls**, which is the floor that
 *   makes this file about era two rather than about era one passing again;
 * - the declared-without-art list is exactly Early Modern, so the second direction is
 *   still sweeping a real six-node cohort.
 */

/**
 * THE ERAS WHOSE SKILL BUILDINGS HAVE BEEN DRAWN AND EXPORTED, in `ERA_SEQUENCE` order.
 *
 * - `prehistoric` — era one's six, exported before this lane existed
 *   (`gridwork-modern/README.md` records the retired set they replaced).
 * - `neolithic` — era two's five, from `scripts/export-era2-skill-models.mjs` over
 *   `art/building-sources/era-02-neolithic-all-buildings.dc.html`.
 * - `bronze_age` — era three's five, from `scripts/export-era3-building-models.mjs`
 *   over the embedded `Era3Kit` in `era-03-bronze-age-all-buildings.dc.html`.
 * - `classical` — era four's five, from `scripts/export-era4-building-models.mjs`
 *   over the embedded `Era4Kit` in `era-04-classical-all-buildings.dc.html`.
 * - `medieval` — era five's five, from `scripts/export-era5-building-models.mjs`
 *   over the embedded `Era5Kit` in `era-05-medieval-all-buildings.dc.html`.
 * - `industrial` — era seven's six, from `scripts/export-era7-building-models.mjs`
 *   over the embedded `Era7Kit` in `era-07-industrial-all-buildings.dc.html`.
 * - `atomic_age`, `information_age`, `cyberpunk` — the late-era cohorts from the
 *   source-contract exporter and generated asset manifest.
 *
 * Early Modern is the sole era with no exported skill art.
 */
const ERAS_WITH_EXPORTED_SKILL_ART: readonly EraId[] = [
  "prehistoric",
  "neolithic",
  "bronze_age",
  "classical",
  "medieval",
  "industrial",
  "atomic_age",
  "information_age",
  "cyberpunk",
];

/** Era two, named once so every assertion below is about the same five ids. */
const ERA_TWO: EraId = "neolithic";

/** Basename of a bundled url, which is the key the registry is actually keyed by. */
function basenames(urls: readonly string[]): string[] {
  return urls.map((url) => (url.split("?")[0] ?? url).split("/").pop() as string).sort();
}

/**
 * The exporter's own source, read through Vite's `?raw` glob rather than `node:fs` — which
 * is the precedent this repo already sets (`workUploadInvariant.browser.test.tsx`,
 * `revealReAsk.test.ts`) and the only one that typechecks under `apps/web`'s DOM-only
 * `lib`, where `node:fs` and `process` are not declared.
 */
const EXPORTER_SOURCES = import.meta.glob(
  "../../../../scripts/export-era2-skill-models.mjs",
  {
    query: "?raw",
    import: "default",
    eager: true,
  },
) as Record<string, string>;

describe("era two's skill models are bundled under node-derived basenames", () => {
  it("declares exactly the eras with exported skill art, checked against the registry both ways", () => {
    const allEraIds = ERA_SEQUENCE.map((era) => era.id);
    const withoutArt = allEraIds.filter((id) => !ERAS_WITH_EXPORTED_SKILL_ART.includes(id));

    // FLOORS FIRST, so neither sweep below can hold by being empty.
    expect(allEraIds.length).toBeGreaterThanOrEqual(10);
    expect(ERAS_WITH_EXPORTED_SKILL_ART).toHaveLength(9);
    expect(withoutArt).toEqual(["renaissance"]);
    expect(getEraNodes(withoutArt[0] as EraId)).toHaveLength(6);
    // The two lists partition the run — nothing claimed twice, nothing unclaimed.
    expect([...ERAS_WITH_EXPORTED_SKILL_ART, ...withoutArt].sort()).toEqual(
      [...allEraIds].sort(),
    );
    const declaredNodes = ERAS_WITH_EXPORTED_SKILL_ART.flatMap((eraId) =>
      getEraNodes(eraId),
    );
    expect(declaredNodes).toHaveLength(56);
    expect(new Set(declaredNodes)).toEqual(new Set(SKILL_MODEL_NODES));

    // DIRECTION ONE: a declared era owes all three stages for every one of its nodes.
    for (const eraId of ERAS_WITH_EXPORTED_SKILL_ART) {
      const nodes = getEraNodes(eraId);
      expect(nodes.length, `${eraId} has nodes`).toBeGreaterThanOrEqual(5);
      for (const node of nodes) {
        expect(
          nodeModelUrls(node),
          `${eraId} · ${node} owes ${MODEL_STAGES.length} bundled stages`,
        ).toHaveLength(MODEL_STAGES.length);
      }
    }

    // DIRECTION TWO: an era declared as having no art may not have any.
    for (const eraId of withoutArt) {
      for (const node of getEraNodes(eraId)) {
        expect(
          nodeModelUrls(node),
          `${eraId} · ${node} is declared to have no exported art`,
        ).toHaveLength(0);
      }
    }
  });

  it("bundles fifteen era-two files whose basenames are the node ids, not names", () => {
    const nodes = getEraNodes(ERA_TWO);
    // The floor that makes this test about ERA TWO: era one passing again cannot satisfy it.
    expect(nodes).toHaveLength(5);
    expect(nodes).toEqual(["EXP.1", "RAD.1", "RAD.2", "RAD.3", "RAD.4"]);

    const expected = nodes
      .flatMap((node) =>
        MODEL_STAGES.map((stage) => `${nodeFilePrefix(node)}-${stage}.glb`),
      )
      .sort();
    expect(expected).toHaveLength(15);
    expect(expected).toEqual([
      "exp-1-built.glb",
      "exp-1-construction.glb",
      "exp-1-site.glb",
      "rad-1-built.glb",
      "rad-1-construction.glb",
      "rad-1-site.glb",
      "rad-2-built.glb",
      "rad-2-construction.glb",
      "rad-2-site.glb",
      "rad-3-built.glb",
      "rad-3-construction.glb",
      "rad-3-site.glb",
      "rad-4-built.glb",
      "rad-4-construction.glb",
      "rad-4-site.glb",
    ]);

    // SET MEMBERSHIP IN THE REGISTRY, with a count behind it. Containment alone would hold
    // over an empty expected set, and a count alone would be satisfied by fifteen of
    // anything, so both are asserted.
    const bundled = new Set(basenames(cityModelUrls()));
    expect(bundled.size).toBeGreaterThanOrEqual(33);
    for (const file of expected) {
      expect(bundled.has(file), `${file} is bundled`).toBe(true);
    }

    // Every url is distinct and non-empty — a registry that mapped two stages to one file
    // would render the same model for a site and a finished building.
    const eraTwoUrls = nodes.flatMap((node) => nodeModelUrls(node));
    expect(eraTwoUrls).toHaveLength(15);
    expect(new Set(eraTwoUrls).size).toBe(15);
    for (const url of eraTwoUrls) {
      expect(url.length).toBeGreaterThan(0);
    }
  });

  it("keeps the exporter's node column in step with the era the skill graph ships", () => {
    // The exporter cannot import `@cr/skill-graph` (it is a plain `.mjs` run by node), so
    // its node list is written down. This is where the two are compared: a node moved
    // between eras, renamed or added fails HERE rather than by silently exporting a file
    // no loader will ever ask for.
    // A floor on the glob itself: a moved or renamed exporter would otherwise leave every
    // assertion below reading an empty string, and an empty string matches nothing.
    const paths = Object.keys(EXPORTER_SOURCES);
    expect(paths).toHaveLength(1);
    const exporter = EXPORTER_SOURCES[paths[0] as string] as string;
    expect(exporter.length).toBeGreaterThan(4000);
    const declared = [...exporter.matchAll(/\{ node: "([^"]+)", art: "([^"]+)"/g)].map(
      (m) => m[1],
    );
    // A floor, because an empty match list would make the equality below vacuous — which
    // is exactly what a refactor of that table's formatting would produce.
    expect(declared).toHaveLength(5);
    expect(declared).toEqual([...getEraNodes(ERA_TWO)]);
    // And the hub is deliberately NOT in that table: it has no node, so it can have no
    // node-derived basename, and it belongs to `art/models/townhall/`.
    expect(exporter).not.toMatch(/\{ node: "[^"]*", art: "shrine"/);
  });
});
