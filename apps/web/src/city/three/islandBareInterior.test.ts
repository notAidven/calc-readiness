import { ERA_SEQUENCE, type EraId } from "@cr/skill-graph";
// Type-only, following `islandDressingFillsTheIsland.test.ts`: a VALUE import of `three` here
// loads a second runtime copy alongside the one `StarterIsland.tsx` uses, and meshes are
// recognised by three's own `isMesh` flag.
import type * as THREE from "three";
import { describe, expect, it } from "vitest";

import { islandGround } from "../islandGround";
import { eraCityLayout, eraLandRadius } from "../islandLand";
import { buildIslandGroup } from "./StarterIsland";

/**
 * **WHY THE MIDDLE OF THE ISLAND IS EMPTY — measured, because the two readings of the lead's
 * complaint want opposite fixes.**
 *
 * The lead, having advanced an era and watched the island grow: *"the graphics also are cooked
 * after the age advances / the island expands; this needs to be fixed. not sure if theres
 * behavior for this already."* The frame is a big green island, one Civic Center dead centre, a
 * placement grid over bare ground, and every tree, boulder and earth patch out in a ring at the
 * rim.
 *
 * Two things could produce it and they are not the same bug:
 *
 *  1. **the dressing pass is failing to fill the expanded interior**, leaving a bare annulus
 *     where decoration should be — in which case the fix is in the scatter;
 *  2. **the interior was never dressed at any era**, in which case nothing is broken and what
 *     the lead is reacting to is emptiness plus a grid.
 *
 * **It is the second, and this file is the measurement that says so.** The decoration floor is
 * the walkable annulus — `BUILDABLE_RADIUS + 3` before #544 and the era's own disc plus three
 * after it — because a tree standing in a cell a building may occupy is a collision, and
 * `islandDressingFillsTheIsland.test.ts` already holds that floor as a veto. What this file adds
 * is the other half of the same claim: **the emptiness is exactly that disc and nothing else.**
 * The dressing starts at the floor rather than somewhere beyond it, and from the floor out to
 * the shore there is no second hole.
 *
 * ## The numbers, at `5f470d62`
 *
 * The undressed central disc, as a share of the island's own area:
 *
 * | era | grass | disc | floor | first decoration | undressed share |
 * | --- | --- | --- | --- | --- | --- |
 * | prehistoric | 30 | 22 | 25.0 | 25.35 | **71.4%** |
 * | neolithic | 38 | 22 | 25.0 | 25.35 | 44.5% |
 * | bronze_age | 43 | 22 | 25.0 | 25.25 | 34.5% |
 * | classical … cyberpunk | 46 | 22 | 25.0 | 25.21 | **30.0%** |
 *
 * Read the first and last rows together, because they are the answer: the undressed disc is an
 * ABSOLUTE 25 units at every era, so as the island grows it becomes a SMALLER share of it —
 * 71.4% of era one's island, 30.0% of era four's. A dressing pass that was failing to fill new
 * ground would move that number the other way. There is no era at which any 2-unit annulus
 * between the floor and the shore carries nothing.
 *
 * ## ⚑ What #544 does to it, measured on the forward-merged tree and NOT asserted here
 *
 * #544 grows the buildable disc to
 * follow the drawn land, so the floor follows it too and the decoration band becomes era one's
 * 2.8 units at every era instead of widening to 18.8. The undressed disc then goes the other
 * way:
 *
 * | era | undressed share, `5f470d62` → with #544 merged |
 * | --- | --- |
 * | prehistoric | 71.4% → 71.4% (its disc does not move) |
 * | neolithic | 44.5% → **76.2%** |
 * | bronze_age | 34.5% → **78.6%** |
 * | classical … cyberpunk | 30.0% → **79.4%** |
 *
 * **Every assertion below still passes on that tree**, and that is deliberate rather than
 * lucky: the claim here is about the SHAPE of the emptiness — one disc, explained by the
 * placement rule, with no hole beyond it — and #544 keeps that shape while moving the disc.
 * The size of the disc is #544's to author and the lead's to rule on; a bar drawn here would be
 * this file vetoing another lane's mid-merge change under cover of a measurement. What the
 * numbers are FOR is the report, and the frames that go with them are in
 * `docs/design-refs/island-reads-as-a-place/`.
 */

/** Every decoration position on one era's island, as a distance from the centre. */
function decorationRadii(eraId: EraId): number[] {
  const grassR = eraLandRadius(eraId);
  const group = buildIslandGroup(eraCityLayout(eraId), islandGround(eraId), grassR);
  const found: number[] = [];
  group.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) {
      return;
    }
    // Read the actual world transform. Evan's plot exclusion adapter scales complete authored
    // clusters after seating them in the rim; summing translations silently ignores that scale
    // and reports a child at its pre-adaptation source radius.
    mesh.updateWorldMatrix(true, false);
    const x = mesh.matrixWorld.elements[12] ?? 0;
    const z = mesh.matrixWorld.elements[14] ?? 0;
    const r = Math.hypot(x, z);
    // The origin-anchored planes — the sea, the ground disc, the shore rings, the cell grid —
    // are the island rather than decoration on it, and they all sit exactly on the centre.
    if (r > 0.001 && r <= grassR) {
      found.push(r);
    }
  });
  return found.sort((a, b) => a - b);
}

/** The band decoration is allowed to stand in, read off the layout the era actually ships. */
function band(eraId: EraId): { readonly floor: number; readonly outer: number } {
  return {
    floor: eraCityLayout(eraId).buildableRadius + 3,
    outer: eraLandRadius(eraId) - 2.2,
  };
}

/**
 * How far the dressing may begin BEYOND its own floor, in world units.
 *
 * Set above the measured starter scatter (0.35) and the authored Classical wall/tree composition
 * (1.25), while remaining well below the 2.8-unit band itself.
 */
const FLOOR_SLACK = 1.5;

/** The width of the annuli the no-hole sweep walks, in world units. */
const ANNULUS = 2;

describe("the island's bare middle is the placement disc, and nothing else", () => {
  it("sweeps every era, on islands and bands that really differ", () => {
    // FLOORS UNDER THE POPULATION. Every assertion in this file is per era, so a sweep over one
    // island would satisfy all of them without saying anything about a grown one.
    expect(ERA_SEQUENCE.length).toBeGreaterThanOrEqual(10);
    const islands = new Set(ERA_SEQUENCE.map((era) => eraLandRadius(era.id)));
    expect(islands.size).toBeGreaterThanOrEqual(4);
    expect(Math.max(...islands) / Math.min(...islands)).toBeGreaterThan(1.5);
    // ...and every era draws real decoration. Later islands use fewer, larger authored meshes
    // instead of hundreds of starter pebbles and grass blades.
    for (const era of ERA_SEQUENCE) {
      expect(decorationRadii(era.id).length, era.id).toBeGreaterThan(20);
    }
  });

  /**
   * **THE DRESSING STARTS AT ITS FLOOR — which is what tells reading 2 from reading 1.**
   *
   * `islandDressingFillsTheIsland.test.ts` holds the other side of this line: nothing decorative
   * may reach INSIDE the floor, because that is ground a building may stand on. Alone, that
   * assertion is satisfied by decoration that starts twenty units further out and leaves a bare
   * annulus the lead would be right to complain about. This is the pair to it.
   */
  it("puts its first decoration on the floor, at every era", () => {
    let checked = 0;
    for (const era of ERA_SEQUENCE) {
      const { floor } = band(era.id);
      const grassR = eraLandRadius(era.id);
      const first = decorationRadii(era.id)[0] as number;
      expect(
        first - floor,
        `${era.id}: the island's first decoration stands at ${first.toFixed(2)} on a floor of ` +
          `${floor.toFixed(1)}, leaving ${((first / grassR) ** 2 * 100).toFixed(1)}% of the ` +
          "island undressed",
      ).toBeLessThanOrEqual(FLOOR_SLACK);
      checked += 1;
    }
    expect(checked).toBe(ERA_SEQUENCE.length);
  });

  /**
   * **AND THERE IS NO SECOND HOLE, which is the half a "closest decoration" check cannot see.**
   *
   * A band that is dense at both ends and deserted through the middle passes the assertion above
   * and is exactly the picture the complaint describes. So this walks the whole band in
   * {@link ANNULUS}-unit steps and requires every step to carry something.
   *
   * ⚑ **THE FAMILY THAT CARRIES THIS IS THE TUSSOCK, and saying so is the point.** Every other
   * family is placed through `bandAt`, at a FRACTION of the band, so each covers a slice of it;
   * the coarse tussock is the one `StarterIsland` scatters uniformly from `marginIn + 0.25` to
   * `marginOut`, and at era four that is 165 clumps of three blades over the whole 18.8 units.
   * So an injection aimed at `bandAt` alone leaves this green, correctly — the band really is
   * still covered. What reds it is a defect at the FLOOR both derive from, which is reading 1 of
   * the complaint and is recorded in the ledger under
   * `docs/design-refs/island-reads-as-a-place/`.
   */
  it("leaves no empty annulus between that floor and the shore", () => {
    let swept = 0;
    for (const era of ERA_SEQUENCE) {
      const { floor, outer } = band(era.id);
      const radii = decorationRadii(era.id);
      for (let inner = floor; inner < outer; inner += ANNULUS) {
        const edge = Math.min(outer, inner + ANNULUS);
        const standing = radii.filter((r) => r >= inner && r < edge).length;
        expect(
          standing,
          `${era.id}: nothing stands between ${inner.toFixed(1)} and ${edge.toFixed(1)} on a ` +
            `band of ${floor.toFixed(1)}-${outer.toFixed(1)}`,
        ).toBeGreaterThan(0);
        swept += 1;
      }
    }
    // A FLOOR UNDER THE SWEEP, so this cannot pass over a band too narrow to hold an annulus:
    // it is 86 steps on `5f470d62` and 20 with #544's disc, and one per era is the minimum a
    // ten-era sweep of era one's own 2.8-unit band could produce.
    expect(swept).toBeGreaterThanOrEqual(ERA_SEQUENCE.length);
  });
});
