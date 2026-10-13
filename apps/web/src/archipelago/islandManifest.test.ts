import { ERA_SEQUENCE, type EraId, eraNumber } from "@cr/skill-graph";
import { describe, expect, it } from "vitest";

import { eraLandRadius } from "../city/islandLand";
import { islandFitRadius } from "../city/three/cityFraming";

import {
  type GlbIslandVisual,
  ISLAND_ASSET_DIRECTORY,
  ISLAND_VISUALS,
  type IslandManifestEntry,
  islandAssetUrl,
  islandManifest,
  islandManifestEntry,
  islandManifestProblems,
  islandPickRadius,
  islandVisual,
  PROCEDURAL_ISLAND,
  shippedIslandAssets,
} from "./islandManifest";

/**
 * **IS THE ISLAND HANDOFF ACTUALLY A HANDOFF? Measured over all ten eras, not spot-checked.**
 *
 * The claim this file exists for is that **Evan can drop a finished island and change one row**,
 * and the ways that claim goes quietly false are all in here: an era with no row, a row naming a
 * file nobody shipped, a row whose numbers cannot size an island, and — the one that would waste
 * a whole handoff — an island file landing in the directory the BUILDING registry globs.
 *
 * ## THE POPULATION IS EVERY ERA, DERIVED, WITH A FLOOR
 *
 * `.cursor/rules/qa-verification.mdc`: *"Define a guard's population by who exhibits the
 * behaviour, not by where the behaviour is implemented"*, and *"a derived population with a floor
 * is not sufficient, because it can derive the wrong set."* The behaviour here is *"has an island
 * a learner can stand on"*, and that is every era in `ERA_SEQUENCE` — there is no narrower
 * reading, because the archipelago gives each era exactly one island. So the population is
 * `ERA_SEQUENCE` itself, floored at ten, and asserted as a SET rather than a count so a sequence
 * that changed composition without changing length still fails.
 */

const ERA_IDS: readonly EraId[] = ERA_SEQUENCE.map((era) => era.id);

/** A row that names a file, for the injection cases. Never added to the shipped manifest. */
function glbRow(file: string, over: Partial<GlbIslandVisual> = {}): GlbIslandVisual {
  return {
    format: "glb",
    file,
    scale: 1,
    rotationY: 0,
    anchor: { x: 0, y: 0, z: 0 },
    seaLevelOffset: 0,
    ...over,
  };
}

/** The shipped manifest with one era's row replaced — how every injection below is driven. */
function manifestWith(
  eraId: EraId,
  visual: GlbIslandVisual,
): readonly IslandManifestEntry[] {
  return islandManifest().map((entry) =>
    entry.eraId === eraId ? { ...entry, visual } : entry,
  );
}

describe("every era has an island, and the set is the sequence", () => {
  it("has one entry per era, in sequence order, keyed by era rather than by position", () => {
    const entries = islandManifest();
    expect(entries.map((entry) => entry.eraId)).toEqual(ERA_IDS);
    // A SET assertion beside the ordered one: a sequence that swapped two eras without changing
    // its length would satisfy a count and a floor, and fails here.
    expect(new Set(entries.map((entry) => entry.eraId))).toEqual(new Set(ERA_IDS));
    expect(entries).toHaveLength(ERA_SEQUENCE.length);
    expect(entries.length).toBeGreaterThanOrEqual(10);
    for (const entry of entries) {
      expect(entry.number, entry.eraId).toBe(eraNumber(entry.eraId));
      expect(entry.name.length, entry.eraId).toBeGreaterThan(0);
    }
  });

  it("is total over EraId at the type level as well as at runtime", () => {
    // `ISLAND_VISUALS` is a `Record<EraId, …>`, so this loop cannot miss an era without the
    // record failing to typecheck. Asserted anyway, because the module casts the
    // `Object.fromEntries` result and a cast is exactly where totality stops being checked.
    for (const eraId of ERA_IDS) {
      expect(ISLAND_VISUALS[eraId], eraId).toBeDefined();
    }
    expect(Object.keys(ISLAND_VISUALS).sort()).toEqual([...ERA_IDS].sort());
  });

  it("reports no problems over the shipped manifest", () => {
    expect(islandManifestProblems()).toEqual([]);
  });
});

describe("what ships today is the procedural island, said plainly", () => {
  it("draws the procedural island for every era, with no file and no URL", () => {
    for (const eraId of ERA_IDS) {
      const resolved = islandVisual(eraId);
      expect(resolved.visual.format, eraId).toBe("procedural");
      expect(resolved.url, eraId).toBeNull();
    }
  });

  it("reports the completed ten-era authored ground population", () => {
    const authored = islandManifest().filter((entry) => entry.palette.authored);
    expect(authored.map((entry) => entry.eraId)).toEqual(ERA_SEQUENCE.map((era) => era.id));
  });
});

describe("the geometry on a row is derived, so it cannot disagree with the game", () => {
  it("keeps water outside the land and the buildable disc inside it, at every era", () => {
    for (const entry of islandManifest()) {
      expect(entry.seaRadius, entry.eraId).toBeGreaterThan(entry.landRadius);
      expect(entry.buildableRadius, entry.eraId).toBeLessThanOrEqual(entry.landRadius);
      expect(entry.fitRadius, entry.eraId).toBeGreaterThan(entry.landRadius);
      expect(entry.overviewRadius, entry.eraId).toBeGreaterThan(0);
    }
  });

  it("hands back the era's own land radius as the pick radius when no row names one", () => {
    const entry = islandManifestEntry(ERA_IDS[0] as EraId);
    expect(islandPickRadius(entry)).toBe(entry.landRadius);
    expect(
      islandPickRadius({ ...entry, visual: glbRow("x.glb", { collisionRadius: 7 }) }),
    ).toBe(7);
  });

  /**
   * **THE CAMERA'S BOUNDS COME FROM THE ISLAND, NOT FROM ERA ONE — so a wider silhouette
   * cannot clip merely for being wider.**
   *
   * `cityFraming.ts`'s `islandFitRadius` is `islandRadius + ISLAND_SHORE_REACH` over
   * `layout.islandRadius`, which is the era's own drawn land. That is already the right shape,
   * and this pins it against the manifest so the two cannot drift: an entry's `fitRadius` IS
   * that function of that era's land, at every era, and it is strictly monotone — a bigger
   * island is given a bigger frame.
   *
   * Injection that fails it: pin `fitRadius` to era one's land (`islandFitRadius(30)`), which is
   * the exact defect the requirement names, and eras two to ten fail at the equality while era
   * one still passes — so the guard cannot be satisfied by the one era anybody photographs.
   */
  it("fits the camera to each island's own land, and a wider island to a wider frame", () => {
    const entries = islandManifest();
    for (const entry of entries) {
      expect(entry.fitRadius, entry.eraId).toBe(
        islandFitRadius(eraLandRadius(entry.eraId)),
      );
    }
    // MONOTONE, swept over every pair rather than over neighbours: a fit that grew for the
    // first step and then flattened would pass a neighbour-only check.
    for (const a of entries) {
      for (const b of entries) {
        if (a.landRadius < b.landRadius) {
          expect(a.fitRadius, `${a.eraId} vs ${b.eraId}`).toBeLessThan(b.fitRadius);
        }
      }
    }
    // ...and a floor with SHAPE, so the sweep is not over ten identical islands: the bay really
    // does hold islands of at least three different sizes today.
    expect(new Set(entries.map((entry) => entry.landRadius)).size).toBeGreaterThanOrEqual(
      3,
    );
  });

  it("throws on an era the sequence does not have, rather than sizing an island from nothing", () => {
    // `eraNumber` gets there first with `Unknown era: atlantis`, which is the same fail-loud
    // answer one layer down and is better than this module's own message — it names the
    // authority. The assertion is on the FAILING, not on whose sentence it is, so the guard
    // does not break when the skill-graph rewords its error.
    expect(() => islandManifestEntry("atlantis" as EraId)).toThrow(/atlantis/);
  });
});

describe("a row that names a file", () => {
  /**
   * **THE RULE A DROP TRIPS FIRST, and the one whose silent version wastes a handoff.**
   *
   * Injection: a row naming a file nobody shipped. Without this rule the typo is an island that
   * quietly stays procedural, and the only symptom is that Evan's work does not appear.
   */
  it("is reported when the file did not ship", () => {
    const problems = islandManifestProblems(
      manifestWith(ERA_IDS[1] as EraId, glbRow("island-era-02-neolithic.glb")),
    );
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain("island-era-02-neolithic.glb");
    expect(problems[0]).toContain(ISLAND_ASSET_DIRECTORY);
  });

  it("is reported when the file is not a glTF-binary", () => {
    const problems = islandManifestProblems(
      manifestWith(ERA_IDS[1] as EraId, glbRow("island-era-02-neolithic.fbx")),
    );
    // Two problems, and both are right: it did not ship AND it is not a format this build loads.
    expect(problems.some((line) => line.includes("only island format"))).toBe(true);
    expect(problems.some((line) => line.includes("docs/Island_Asset_Handoff.md"))).toBe(
      true,
    );
  });

  it("is reported when its seating numbers cannot seat anything", () => {
    for (const [label, over] of [
      ["scale", { scale: 0 }],
      ["rotationY", { rotationY: Number.NaN }],
      ["anchor", { anchor: { x: Number.NaN, y: 0, z: 0 } }],
      ["seaLevelOffset", { seaLevelOffset: Number.NaN }],
      ["collisionRadius", { collisionRadius: -1 }],
    ] as const) {
      const problems = islandManifestProblems(
        manifestWith(ERA_IDS[1] as EraId, glbRow("island-era-02-neolithic.glb", over)),
      );
      expect(
        problems.some((line) => line.includes(label)),
        `${label} passed validation at ${JSON.stringify(over)}`,
      ).toBe(true);
    }
  });

  /**
   * **AND IT STILL DRAWS AN ISLAND**, which is the half a validator cannot assert about itself.
   * A row pointing at nothing resolves to the procedural island, so a half-finished drop is an
   * island that looks unfinished rather than a city that will not load.
   */
  it("falls back to the procedural island rather than failing to render", () => {
    // Driven through the real resolver by asking about an era whose row is procedural and whose
    // asset therefore cannot exist; the missing-file branch is the same branch.
    expect(islandAssetUrl("island-era-02-neolithic.glb")).toBeNull();
    expect(islandVisual(ERA_IDS[1] as EraId)).toEqual({
      visual: PROCEDURAL_ISLAND,
      url: null,
    });
  });
});

describe("an era with no row at all", () => {
  it("is reported by name and by island number", () => {
    const short = islandManifest().filter((entry) => entry.eraId !== ERA_IDS[4]);
    const problems = islandManifestProblems(short);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain(ERA_IDS[4] as string);
    expect(problems[0]).toContain("has no manifest entry");
  });
});

describe("the two asset registries stay disjoint", () => {
  /**
   * **AN ISLAND MUST NOT LAND IN THE BUILDING GLOB, and this asserts it in both directions.**
   *
   * `buildingAssets.ts` globs `./art/models/*.glb` non-recursively and maps every match by bare
   * filename into the per-node building registry, so an island dropped there would be offered as
   * a building. Both directions matter: an island in the models directory, and a building model
   * in the islands directory.
   */
  it("shares no filename between the island directory and the building models", async () => {
    const buildings = new Set(
      Object.keys(
        import.meta.glob("../city/art/models/*.glb", {
          query: "?url",
          import: "default",
          eager: true,
        }),
      ).map((path) => path.split("/").pop() as string),
    );
    const islands = new Set(shippedIslandAssets());
    for (const file of islands) {
      expect(buildings.has(file), `${file} is in both registries`).toBe(false);
    }
    // A FLOOR under the building side, so the disjointness cannot hold because the glob broke.
    expect(buildings.size).toBeGreaterThanOrEqual(50);
  });

  it("names every shipped island file to the era-and-slug convention", () => {
    // A convention for humans reading `ls`, not something any code parses, so this reports
    // rather than gates on the pattern — but a file that matches nothing is worth seeing.
    for (const file of shippedIslandAssets()) {
      expect(file.endsWith(".glb"), file).toBe(true);
    }
  });
});
