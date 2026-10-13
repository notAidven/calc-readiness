import { ERA_SEQUENCE, type EraId } from "@cr/skill-graph";
// Type-only, following `Roads.test.ts` and `roadSurface.test.ts`: a VALUE import of `three`
// here loads a second runtime copy alongside the one `StarterIsland.tsx` uses ("Multiple
// instances of Three.js"), so meshes are recognised by three's own `isMesh` flag.
import type * as THREE from "three";
import { describe, expect, it } from "vitest";

import {
  ERA_GROUND_LADDER,
  ERA_ISLAND_GROUND,
  ERA_ONE_TERRAIN,
  hasAuthoredIslandGround,
  islandGround,
  UNAUTHORED_ISLAND_GROUND,
} from "../islandGround";
import { eraCityLayout } from "../islandLand";
import { buildIslandGroup, ERA_ONE_PROP_TONES } from "./StarterIsland";

/**
 * **THE ISLAND CARRIES THE ERA — read out of the built scene graph, era by era.**
 *
 * THE DEFECT THIS PINS: `StarterIsland.tsx` took `{ layout, reducedMotion }` and contained no
 * era concept at all, so all ten eras rendered era one's island. The island is the largest
 * thing on screen, so that was the single biggest reason an era advance read as nothing
 * happening — and D-ERA32's load-bearing half is that an era's identity has to be visible in
 * the ground, because the ground is the only large surface an advance changes.
 *
 * Every assertion below reads MATERIAL COLOURS AND MESH COUNTS off the group the builder
 * actually produced, never off `islandGround.ts`'s tables. A tone that is declared and never
 * painted, or a prop gated out of the table but still drawn, must not be able to satisfy this.
 *
 * ## The population is `ERA_SEQUENCE`, and both verdicts carry a floor
 *
 * Not a written-down list of the nine unauthored eras: a hardcoded population passes while
 * covering a fraction of reality, which is the recurring failure mode here. And a floor under
 * each of the two verdicts, because this file's claims are about the DIFFERENCE between them —
 * with every era authored there would be no fallback under test, and with none authored there
 * would be no authored ground under test.
 */

/**
 * **ERA ONE'S ISLAND, NAMED — every measurement below is of a DRESSING and not of an island.**
 *
 * Holding the radius fixed across ten eras is RIGHT for this file: its claims are all
 * differences between two dressings, and comparing them on two different islands would measure
 * the growth instead. What was wrong was getting era one by OMISSION, through
 * `computeCityLayout()`'s default (#521 removed it).
 *
 * With the island named, what this file does not cover can be named too: **nothing here says
 * anything about a GROWN island.** `islandDressingFillsTheIsland.test.ts` is that half, and it
 * builds every era on its own.
 */
const layout = eraCityLayout("prehistoric");

/** Every distinct opaque material colour painted in one era's island, as a set of hex ints. */
function paintedColors(eraId: EraId): Set<number> {
  const group = buildIslandGroup(layout, islandGround(eraId), layout.islandRadius);
  const colors = new Set<number>();
  group.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) {
      return;
    }
    for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
      const tinted = material as THREE.MeshStandardMaterial;
      // The sea is painted through vertex colours rather than through `material.color`, so
      // it is deliberately not in this set; every other surface here is a flat tone.
      if (tinted.color && !tinted.vertexColors) {
        colors.add(tinted.color.getHex());
      }
    }
  });
  return colors;
}

/** How many meshes one era's island draws. */
function meshCount(eraId: EraId): number {
  const group = buildIslandGroup(layout, islandGround(eraId), layout.islandRadius);
  let count = 0;
  group.traverse((object) => {
    if ((object as THREE.Mesh).isMesh) {
      count += 1;
    }
  });
  return count;
}

describe("D-ERA26/D-ERA32 — the island's ground is per-era", () => {
  it("paints every now-authored era ground through the runtime builder", () => {
    const authored: EraId[] = [];
    const unauthored: EraId[] = [];

    for (const era of ERA_SEQUENCE) {
      const colors = paintedColors(era.id);
      // The ground tone is painted whichever era it is — the island always draws, which is
      // the total contract `islandGround` shares with `roadSurfacing`.
      expect(colors.size, era.id).toBeGreaterThan(5);

      if (hasAuthoredIslandGround(era.id)) {
        authored.push(era.id);
        expect(colors.has(islandGround(era.id).tones.ground), era.id).toBe(true);
        expect(colors.has(UNAUTHORED_ISLAND_GROUND.ground), era.id).toBe(false);
      } else {
        unauthored.push(era.id);
        // THE ASSERTION THE WHOLE CHANGE IS FOR: an unauthored era does not paint era one's
        // ground. Before the era axis existed this was false in nine eras out of ten.
        expect(colors.has(UNAUTHORED_ISLAND_GROUND.ground), era.id).toBe(true);
        expect(colors.has(ERA_ONE_TERRAIN.ground), era.id).toBe(false);
      }
    }

    expect(authored.length + unauthored.length).toBe(ERA_SEQUENCE.length);
    expect(ERA_SEQUENCE.length).toBeGreaterThanOrEqual(10);
    expect(authored).toEqual(Object.keys(ERA_ISLAND_GROUND));
    expect(authored).toEqual(ERA_SEQUENCE.map((era) => era.id));
    expect(unauthored).toEqual([]);
  });

  /**
   * Era one's authored PROPS — the camp and the landing — are era one's own content, and an
   * era that has authored no ground draws none of them. This is the half of the fallback that
   * is about the borrowed-dressing defect rather than about pigment: a prehistoric hide boat
   * hauled up on a Early Modern shore is *silently showing era one* at its most vivid.
   *
   * The population is `ERA_ONE_PROP_TONES` itself, so a tone added to era one's props joins
   * this sweep without anybody editing the test.
   */
  it("no longer draws era one's retired camp and landing on any island", () => {
    const propTones = Object.values(ERA_ONE_PROP_TONES);
    // A floor under the population: nine prop tones today, and every assertion below holds
    // trivially over an empty one.
    expect(propTones.length).toBeGreaterThanOrEqual(6);

    // 2026-08-21: the windblown-camp feature group (hearth, drying rack, midden, flint
    // scatter, hide boat, worn routes) that used to paint these tones for prehistoric is
    // deliberately no longer built ("theres still excess stuff laying around on the island...
    // delete all the brown stuff. there should be like 8 things total"). The tones stay
    // declared and authored (era one's own record of what its camp used to be), but nothing
    // paints them on any island now.
    for (const era of ERA_SEQUENCE) {
      const colors = paintedColors(era.id);
      const present = propTones.filter((tone) => colors.has(tone));
      expect(present, era.id).toEqual([]);
    }
  });

  /** Every authored design remains a substantial runtime graph rather than an empty dispatch. */
  it("keeps a substantial island graph in every authored era", () => {
    const counts = ERA_SEQUENCE.map((era) => [era.id, meshCount(era.id)] as const);
    expect(counts).toHaveLength(10);
    // 2026-08-21: prehistoric's authored population is deliberately much smaller than the
    // other nine islands now that its gravel-shelf, shore-boulder-clusters, scrub, reed banks,
    // and windblown camp are all retired -- only its trees and grazing patches remain. Every
    // other era keeps the original floor.
    const floors = new Map(counts.map(([id]) => [id, id === "prehistoric" ? 20 : 100]));
    for (const [id, count] of counts) {
      expect(count, id).toBeGreaterThan(floors.get(id) ?? 100);
    }
  });

  /**
   * **ERA ONE DID NOT MOVE**, which is the property a reviewer of this change worries about
   * most: era one's island is shipped, generated, measured and approved art, and giving it an
   * era axis must not have re-tinted it.
   *
   * The palette moved from `StarterIsland.tsx`'s `const C` (plus its `FOLIAGE`,
   * `TUSSOCK_TONES`, `REED_TONES` and `ROCK_TONES` arrays) into `../islandGround.ts`, and a
   * transcription is exactly where a mistyped digit hides. So these are the values as they
   * shipped, taken from the file at `03d5a2b9` and pinned here: 27 in the `C` table plus the
   * three foliage tones, thirty in total, with nothing added and nothing changed.
   *
   * Read as a SET rather than field by field, because the fields were also renamed on the way
   * (`tussock` became `ground`, since a later era's walking surface is not grass), so a
   * per-field pin would be asserting the rename rather than the values.
   */
  it("keeps era one's palette byte-for-byte as it shipped", () => {
    const shipped = [
      // Water
      0xa8d4d8, 0x3f7f92,
      // Ground, and the pale variation in it
      0xa8b850, 0xc2cc68,
      // Bare soil, three values
      0xc9a06a, 0xb2854f, 0x8a6a45,
      // The shelving shore
      0xc9b98a, 0xb8a877, 0x998a63,
      // Vegetation
      0x8f6c45, 0x7f9a4e, 0xaeb85e,
      // Foliage — `FOLIAGE` at the shipped tip, outside the `C` table
      0x7ea350, 0x93b45f, 0x6b8f45,
      // Boulders
      0x8b93a0, 0x8b8779, 0x7c8591, 0x9aa1ac, 0x6f7885,
      // Era one's own props: the camp's leavings and the landing
      0x5b544a, 0x8d8a82, 0xa9835c, 0x8a6845, 0xa5825f, 0x6d5a41, 0xc2bcae, 0xd3cdbe,
      0xdad6cb,
    ];
    expect(new Set(shipped).size).toBe(30);

    const authored = new Set<number>([
      ERA_ONE_TERRAIN.shallows,
      ERA_ONE_TERRAIN.deepWater,
      ERA_ONE_TERRAIN.ground,
      ERA_ONE_TERRAIN.groundPale,
      ERA_ONE_TERRAIN.earth,
      ERA_ONE_TERRAIN.earthWorn,
      ERA_ONE_TERRAIN.earthDeep,
      ERA_ONE_TERRAIN.coarseSand,
      ERA_ONE_TERRAIN.gravel,
      ERA_ONE_TERRAIN.gravelWet,
      ERA_ONE_TERRAIN.trunk,
      ERA_ONE_TERRAIN.scrub,
      ERA_ONE_TERRAIN.reed,
      ...ERA_ONE_TERRAIN.foliage,
      ...ERA_ONE_TERRAIN.bladeTones,
      ...ERA_ONE_TERRAIN.reedTones,
      ...ERA_ONE_TERRAIN.rockTones,
      ...Object.values(ERA_ONE_PROP_TONES),
    ]);
    expect([...authored].sort()).toEqual([...new Set(shipped)].sort());

    // AND THEY ARE ALL PAINTED, so this is not a pin over a table nobody reads: era one's
    // built island presents every one of them except the two water tones, which the sea draws
    // through vertex colours rather than through a material, and the tones that were only ever
    // painted by decorative props deliberately removed on 2026-08-21 ("take out any of the art
    // thats not the trees, it just looks so bad"):
    //  - `coarseSand`/`gravelWet` were the gravel-shelf's plain and 34%-chance "wetGravel" tones.
    //  - `scrub` (== `bladeTones[2]`, 0x7f9a4e) was one of three tuft-blade colours drawn only by
    //    the ground-scatter loop, whose count is now 0 for era one; `bladeTones[0]`/`[1]` survive
    //    the check because they coincide with the still-painted ground/groundPale terrain tones.
    //  - `rockTones` (the five boulder greys) were `this.stone()`'s palette, drawn only by
    //    gravel-shelf, shore-boulder-clusters (both removed) and the now-empty ground-scatter's
    //    small-stone branch; `shore()`'s shared gravel-rim/boulder families were already
    //    unconditionally skipped for era one before this change (see `evanIslandGeometry.ts`).
    //  - `reed` and `groundPale` (0xaeb85e, 0xc2cc68) were `reedTones`' two colours, drawn only
    //    by the reed banks `shore()` used to place around era one's margin. Those are gone too
    //    (2026-08-21: "there should be like 8 things total"). `groundPale`'s only other use is
    //    the town-hall fallback and the unlock-exam UI, neither built by this traversal.
    //  - `earth`/`earthWorn`/`earthDeep` were painted by the windblown-camp's worn-earth
    //    decals and the two now-recoloured (green, not brown) grazing patches; the camp itself
    //    is retired the same day for the same reason.
    //  - every `ERA_ONE_PROP_TONES` value (the camp's own hearth/hide/timber/midden/flint
    //    palette) is now painted nowhere at all, because the camp that was its only painter is
    //    gone.
    // Every excluded tone stays declared and authored (`coarseSand` still colours the
    // unlock-exam UI floor via `IslandUnlockExam.tsx`) — they just have nothing left to paint in
    // the 3D geometry.
    const unpaintedByDesign = new Set<number>([
      ERA_ONE_TERRAIN.shallows,
      ERA_ONE_TERRAIN.deepWater,
      ERA_ONE_TERRAIN.coarseSand,
      ERA_ONE_TERRAIN.gravelWet,
      ERA_ONE_TERRAIN.scrub,
      ERA_ONE_TERRAIN.reed,
      ERA_ONE_TERRAIN.groundPale,
      ERA_ONE_TERRAIN.earth,
      ERA_ONE_TERRAIN.earthWorn,
      ERA_ONE_TERRAIN.earthDeep,
      ...ERA_ONE_TERRAIN.rockTones,
      ...Object.values(ERA_ONE_PROP_TONES),
    ]);
    const painted = paintedColors(ERA_SEQUENCE[0]?.id ?? "prehistoric");
    for (const tone of authored) {
      if (unpaintedByDesign.has(tone)) {
        continue;
      }
      expect(painted.has(tone), `#${tone.toString(16)} is declared but never painted`).toBe(
        true,
      );
    }
  });

  /**
   * The grid line travels with the ground, because a grid line is a relationship to its
   * ground rather than a colour. Pinned as an inequality plus the pairing's own measurement,
   * since the affordance is what has to survive and it is measured in `islandGround.ts`.
   */
  it("gives every dressing its own grid line", () => {
    expect(UNAUTHORED_ISLAND_GROUND.gridLine).not.toBe(ERA_ONE_TERRAIN.gridLine);
    for (const era of ERA_SEQUENCE) {
      expect(islandGround(era.id).tones.gridLine, era.id).toMatch(/^rgba\(/);
    }
  });

  /**
   * The ratified ladder is TOTAL over the ten eras, which is what makes it different from the
   * pigment: every era has an authored sentence for its ground even where its palette is
   * PROPOSED. Set equality both ways against `ERA_SEQUENCE`, so an era added to the sequence
   * without a row fails here rather than reading as an era with nothing to say.
   *
   * `eraGroundLadder.test.tsx` is the half that reads the same rows out of the rendered
   * ceremony; this one is the half that pins the table against the sequence.
   */
  it("carries a ratified ladder row for every era in the sequence", () => {
    expect(new Set(Object.keys(ERA_GROUND_LADDER))).toEqual(
      new Set(ERA_SEQUENCE.map((era) => era.id)),
    );
    for (const era of ERA_SEQUENCE) {
      const row = islandGround(era.id).ladder;
      expect(row.ground.length, era.id).toBeGreaterThan(40);
      expect(row.step.length, era.id).toBeGreaterThan(40);
      // Transcribed prose, not a placeholder: no era's row repeats another's.
      expect(
        ERA_SEQUENCE.filter((other) => ERA_GROUND_LADDER[other.id].step === row.step)
          .length,
        era.id,
      ).toBe(1);
    }
  });
});
