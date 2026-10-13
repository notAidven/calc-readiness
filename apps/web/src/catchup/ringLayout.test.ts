import { ERA_SEQUENCE, type EraId, eraBuildableRadius, eraNumber } from "@cr/skill-graph";
import { describe, expect, it } from "vitest";

import { eraBuildableDiscRadius } from "../city/islandLand";
import { TOWN_HALL_CENTER_TRANSFORM, TOWN_HALL_ID } from "../city/townHall";
import {
  BUILDABLE_RADIUS,
  cellCenter,
  footprintCells,
  footprintFor,
  isCellBuildable,
  isCellWalkable,
  occupiedCells,
  type PlacedTransform,
  placementRefusal,
  rotatedFootprint,
  unreachableNodeIds,
  walkableRadiusFor,
} from "../city/worldLayout";
import { ringLayout, strandedAtRadius, WALKABLE_MARGIN } from "./ringLayout";

/**
 * THE AUTO-LAYOUT'S THREE CLAIMS, EACH MEASURED.
 *
 * 1. **It works at more than one radius.** `worldLayout.ts` records that closing over
 *    {@link BUILDABLE_RADIUS} *"is why the auto-layout seats 24 of 53 buildings on ground
 *    that would seat 53 of 53"*, and beat two of every ceremony grows the island. So the
 *    radius being a real input is the claim, and the only way to show it is to seat the same
 *    roster at several radii and read three different answers.
 * 2. **Nobody is sealed in**, and the per-candidate reachability check is what makes that
 *    true. An earlier draft also left an unbuilt corridor and claimed the interior was
 *    connected *by construction*; disabling the corridor produced legal layouts at all ten
 *    eras, so the claim was false and the corridor is gone. The last describe below is the
 *    replacement, and it is the injection the QA rule asks for: it drives the layout with
 *    the reachability test defeated and watches the legality sweep go red.
 * 3. **The radius-taking reachability walk is the SHIPPED rule.** Pinned at the shipped
 *    radius against `unreachableNodeIds` rather than reviewed against it, over a walled-in
 *    hall so the agreement is not two empty sets agreeing.
 */

const HALL: PlacedTransform = { nodeId: TOWN_HALL_ID, ...TOWN_HALL_CENTER_TRANSFORM };

/** Every node of every era up to and including `era`, which is what the walk seats. */
function rosterThrough(era: EraId): readonly string[] {
  return ERA_SEQUENCE.slice(0, eraNumber(era)).flatMap((entry) => entry.nodes);
}

/** How far a placed footprint's furthest cell centre sits from the island centre. */
function reachOf(placed: PlacedTransform): number {
  const { w, d } = rotatedFootprint(footprintFor(placed.nodeId), placed.rot);
  let furthest = 0;
  for (let i = 0; i < w; i += 1) {
    for (let j = 0; j < d; j += 1) {
      const { x, z } = cellCenter(placed.col + i, placed.row + j);
      furthest = Math.max(furthest, Math.hypot(x, z));
    }
  }
  return furthest;
}

describe("the layout is legal: in bounds, no overlap, nobody stranded", () => {
  it("seats every era's cumulative roster legally at its own authored radius", () => {
    // POPULATION: every authored era, derived from ERA_SEQUENCE, each at the radius
    // `eras.ts` authors for it. FLOOR: ten. This is the sweep that says the layout is not
    // era-one-shaped.
    expect(ERA_SEQUENCE.length).toBeGreaterThanOrEqual(10);
    let seatedTotal = 0;
    for (const era of ERA_SEQUENCE) {
      const nodeIds = rosterThrough(era.id);
      const radius = eraBuildableRadius(era.id);
      const result = ringLayout({ nodeIds, reserved: [HALL], buildableRadius: radius });

      const cells = new Set<string>(footprintCells(HALL, footprintFor(HALL.nodeId)));
      for (const placed of result.placed) {
        expect(reachOf(placed)).toBeLessThanOrEqual(radius);
        for (const key of footprintCells(placed, footprintFor(placed.nodeId))) {
          expect(cells.has(key)).toBe(false);
          cells.add(key);
        }
      }
      expect(strandedAtRadius([HALL, ...result.placed], radius)).toEqual([]);
      expect(result.placed.length + result.unseated.length).toBe(nodeIds.length);
      seatedTotal += result.placed.length;
    }
    // FLOOR under the whole sweep: it seated real buildings rather than nothing ten times.
    expect(seatedTotal).toBeGreaterThanOrEqual(ERA_SEQUENCE.length);
  });

  it("never seats a building on the Town Hall, and never seals the hall in", () => {
    const era = ERA_SEQUENCE[4]?.id as EraId;
    const nodeIds = rosterThrough(era);
    const result = ringLayout({
      nodeIds,
      reserved: [HALL],
      buildableRadius: eraBuildableDiscRadius(era),
    });
    const hallCells = new Set(footprintCells(HALL, footprintFor(HALL.nodeId)));
    for (const placed of result.placed) {
      for (const key of footprintCells(placed, footprintFor(placed.nodeId))) {
        expect(hallCells.has(key)).toBe(false);
      }
    }
    // The hall is IN the reachability walk, which is the half that is easy to miss: a
    // closed ring seals the hall rather than any of the buildings that formed the ring.
    expect(strandedAtRadius([HALL, ...result.placed], eraBuildableDiscRadius(era))).toEqual(
      [],
    );
  });

  it("leaves prior placements alone, so a second age adds to a city rather than rebuilding it", () => {
    // Each age on its OWN disc, which is what the walk does: age two is only offered after
    // age one's founding has grown the shore, so the second pass has more room than the first.
    const first = ringLayout({
      nodeIds: rosterThrough(ERA_SEQUENCE[0]?.id as EraId),
      reserved: [HALL],
      buildableRadius: eraBuildableDiscRadius(ERA_SEQUENCE[0]?.id as EraId),
    });
    expect(first.placed.length).toBeGreaterThan(0);

    const second = ringLayout({
      nodeIds: ERA_SEQUENCE[1]?.nodes ?? [],
      reserved: [HALL, ...first.placed],
      buildableRadius: eraBuildableDiscRadius(ERA_SEQUENCE[1]?.id as EraId),
    });
    const before = new Set<string>();
    for (const placed of [HALL, ...first.placed]) {
      for (const key of footprintCells(placed, footprintFor(placed.nodeId))) {
        before.add(key);
      }
    }
    for (const placed of second.placed) {
      for (const key of footprintCells(placed, footprintFor(placed.nodeId))) {
        expect(before.has(key)).toBe(false);
      }
    }
    expect(second.placed.length).toBeGreaterThan(0);
  });
});

describe("THE RADIUS IS A REAL INPUT, and this is the measurement that says so", () => {
  it("seats strictly more of one roster as the radius grows", () => {
    // The nine-age roster is the one §10.18 measured at 24 of 53 on the shipped disc, so
    // it is the roster where the radius has something to say. Three radii, three answers.
    const nodeIds = rosterThrough(ERA_SEQUENCE[8]?.id as EraId);
    const radii = [BUILDABLE_RADIUS, 46, eraBuildableRadius(ERA_SEQUENCE[8]?.id as EraId)];
    const seated = radii.map(
      (radius) =>
        ringLayout({ nodeIds, reserved: [HALL], buildableRadius: radius }).placed.length,
    );

    // MONOTONE and STRICT between the first and the last: a layout that closed over one
    // constant would return the same count three times, which is the defect being guarded.
    expect(seated[0]).toBeLessThan(seated[2] as number);
    expect(seated[0]).toBeLessThanOrEqual(seated[1] as number);
    expect(seated[1]).toBeLessThanOrEqual(seated[2] as number);
    // And the widest authored radius seats the WHOLE roster, which is the prize
    // `worldLayout.ts` names ("53 of 53") and the reason the parameter exists.
    expect(seated[2]).toBe(nodeIds.length);
  });

  it("REPORTS the shortfall where the growth ceiling bites, rather than dropping buildings", () => {
    // ⚑ THIS GUARD USED TO PIN THE DEFECT. It seated a nine-age roster at the SHIPPED
    // radius — era one's 22, whatever age the learner was in — and asserted that something
    // did not fit. That was true and it was true for the wrong reason, so widening the disc
    // took it red at a claim nobody wanted to keep.
    //
    // What survives is the claim that is still load-bearing: `islandLand.ts` holds the drawn
    // land under a growth ceiling, so eras four to ten are all drawn at grass 46 and all get a
    // disc of 38, against the 42 to 69 their budgets authored. The two largest rosters do not
    // fit on that, and a caller that could not see the shortfall would show a learner a city
    // missing buildings with nothing saying so.
    const era = ERA_SEQUENCE[8]?.id as EraId;
    const nodeIds = rosterThrough(era);
    const result = ringLayout({
      nodeIds,
      reserved: [HALL],
      buildableRadius: eraBuildableDiscRadius(era),
    });
    // The shortfall is attributable to the CEILING and not to the layout, which is what makes
    // it somebody else's to close: the same roster seats in full on the disc era nine's budget
    // actually authored.
    expect(eraBuildableDiscRadius(era)).toBeLessThan(eraBuildableRadius(era));
    expect(
      ringLayout({ nodeIds, reserved: [HALL], buildableRadius: eraBuildableRadius(era) })
        .unseated,
    ).toEqual([]);

    expect(result.unseated.length).toBeGreaterThan(0);
    expect(result.placed.length + result.unseated.length).toBe(nodeIds.length);
    // Every reported id is a real member of the roster, so the report cannot be noise.
    for (const nodeId of result.unseated) {
      expect(nodeIds).toContain(nodeId);
    }
  });

  it("reaches more rings at a wider radius, which is the ring claim rather than the count", () => {
    const nodeIds = rosterThrough(ERA_SEQUENCE[8]?.id as EraId);
    const tight = ringLayout({
      nodeIds,
      reserved: [HALL],
      buildableRadius: BUILDABLE_RADIUS,
    });
    const wide = ringLayout({
      nodeIds,
      reserved: [HALL],
      buildableRadius: eraBuildableRadius(ERA_SEQUENCE[8]?.id as EraId),
    });
    expect(wide.rings).toBeGreaterThan(tight.rings);
  });
});

describe("the layout produces seats the SHIPPED GATE accepts, one at a time", () => {
  /*
   * ⚑ THIS DESCRIBE REPLACES A GUARD THAT NOW MEASURES NOTHING.
   *
   * It used to assert that `strandedAtRadius` and `unreachableNodeIds` returned the same set.
   * That was a real claim while the two were separate implementations — one radius-taking, one
   * closed over era one's disc — and it stopped being one the moment the shipped walk could be
   * told which island it was on: `strandedAtRadius` is now an alias, so the old assertion
   * compared a function with itself and would have gone on passing over any defect at all.
   *
   * The claim worth keeping is a level up, and it is the one the deleted
   * `SHIPPED_PLACEMENT_RADIUS` cap existed to enforce by hand: **every seat this layout
   * produces must be one `placementRefusal` accepts**, because `placeSkill` gates every write
   * on it. A layout that ran wider than the gate would seat buildings the session silently
   * refused, and `RingLayoutResult.unseated` would not even report them — the layout believed
   * it had seated them. Reachability is one clause of that rule; this checks all three.
   */
  it("has every seat accepted by placementRefusal, at every era, seated in order", () => {
    // POPULATION: one layout per era, derived from ERA_SEQUENCE at each era's own disc.
    // FLOOR: the seats are counted, so the sweep cannot pass over an empty layout.
    let checked = 0;
    for (const era of ERA_SEQUENCE) {
      const buildableRadius = eraBuildableDiscRadius(era.id);
      const result = ringLayout({
        nodeIds: rosterThrough(era.id),
        reserved: [HALL],
        buildableRadius,
      });
      // Replayed in the order the walk writes them, because that is the order the session
      // sees: seat `n` is judged against the hall plus seats `0..n-1` and nothing after.
      const standing: PlacedTransform[] = [HALL];
      for (const seat of result.placed) {
        expect(
          placementRefusal({
            candidate: seat,
            others: standing,
            blockedCells: occupiedCells(standing),
            buildableRadius,
          }),
          `${era.id}: ${seat.nodeId} at ${seat.col},${seat.row} on disc ${buildableRadius}`,
        ).toBeNull();
        standing.push(seat);
        checked += 1;
      }
    }
    // 6 + 11 + 16 + 21 + 26 + 32 + 38 + 47 + 50 + 50, measured rather than summed from the
    // rosters — the last two rows are short of their roster because the growth ceiling holds
    // eras four to ten at grass 46.
    expect(checked).toBe(297);
  });

  it("would CATCH a seat the gate refuses, so the sweep above is not vacuous", () => {
    // THE INJECTION. `placementRefusal` returning `null` for everything would satisfy the
    // sweep, and so would a layout that seated nothing. A seat one cell off the disc is the
    // exact defect the old cap was written against — a transform the layout is happy with and
    // the session refuses — so it is what the sweep has to be able to see.
    const era = ERA_SEQUENCE[4]?.id as EraId;
    const buildableRadius = eraBuildableDiscRadius(era);
    const offTheDisc = Math.ceil(buildableRadius / 4) + 1;
    expect(
      placementRefusal({
        candidate: { nodeId: "NUM.3", col: offTheDisc, row: offTheDisc, rot: 0 },
        others: [HALL],
        blockedCells: occupiedCells([HALL]),
        buildableRadius,
      }),
    ).toBe("bounds");
    // And a seat that is legal on era five's island is refused on era one's, which is the
    // whole of what the disc following the land buys.
    const outerRing = { nodeId: "NUM.3", col: 7, row: 0, rot: 0 } as const;
    expect(
      placementRefusal({
        candidate: outerRing,
        others: [HALL],
        blockedCells: occupiedCells([HALL]),
        buildableRadius,
      }),
    ).toBeNull();
    expect(
      placementRefusal({
        candidate: outerRing,
        others: [HALL],
        blockedCells: occupiedCells([HALL]),
        buildableRadius: BUILDABLE_RADIUS,
      }),
    ).toBe("bounds");
  });

  it("the walk CATCHES a sealed-in building, so the empty sets above are earned", () => {
    // THE INJECTION for the reachability clause specifically. Without it, "nobody is
    // stranded" is satisfied by a walk that returns `[]` forever, which is the emptiness the
    // QA rule says a containment assertion has to rule out. A ring of buildings drawn right
    // around the hall with no corridor is exactly the defect the check exists to prevent.
    const ringed: PlacedTransform[] = [HALL];
    const era = ERA_SEQUENCE[0] as (typeof ERA_SEQUENCE)[number];
    const hallCells = footprintCells(HALL, footprintFor(HALL.nodeId));
    expect(hallCells.length).toBeGreaterThan(0);
    // Wall the hall in on all four sides with 1x1 stand-ins, using real node ids so the
    // footprint lookup is the real one.
    let index = 0;
    for (let col = -2; col <= 3; col += 1) {
      for (let row = -2; row <= 3; row += 1) {
        const onRing = col === -2 || col === 3 || row === -2 || row === 3;
        if (!onRing) {
          continue;
        }
        const nodeId = era.nodes[index % era.nodes.length] as string;
        ringed.push({ nodeId: `${nodeId}#${index}`, col, row, rot: 0 });
        index += 1;
      }
    }

    const mine = strandedAtRadius(ringed, BUILDABLE_RADIUS);
    const shipped = unreachableNodeIds(ringed, BUILDABLE_RADIUS);
    expect(mine.length).toBeGreaterThan(0);
    expect(shipped.length).toBeGreaterThan(0);
    expect(mine).toContain(TOWN_HALL_ID);
    expect(shipped).toContain(TOWN_HALL_ID);
    expect([...mine].sort()).toEqual([...shipped].sort());
  });

  it("keeps the walkable annulus at every era, so a bigger disc is not a sealed one", () => {
    // The reachability walk is seeded from the band that is walkable and never buildable, so an
    // annulus that narrowed with the disc would eventually empty and every layout would read as
    // stranded. It does not, because the margin is an ABSOLUTE width.
    //
    // Counted through the SHIPPED predicates rather than from `WALKABLE_MARGIN`, which is the
    // difference between measuring the rule and restating the constant: a `walkableRadiusFor`
    // that went proportional would leave the constant untouched and empty the band.
    expect(WALKABLE_MARGIN).toBe(3);
    for (const era of ERA_SEQUENCE) {
      const disc = eraBuildableDiscRadius(era.id);
      const reach = Math.ceil(walkableRadiusFor(disc) / 4) + 2;
      let annulus = 0;
      for (let col = -reach; col <= reach; col += 1) {
        for (let row = -reach; row <= reach; row += 1) {
          if (isCellWalkable(col, row, disc) && !isCellBuildable(col, row, disc)) {
            annulus += 1;
          }
        }
      }
      // A floor rather than an exact count, because the staircase of cell centres makes the
      // ring's population lumpy — what matters is that it is never empty.
      expect(annulus, `${era.id} at disc ${disc}`).toBeGreaterThanOrEqual(8);
    }
  });
});

/**
 * The same greedy ring pass with the reachability test DEFEATED, and nothing else changed:
 * same candidate order, same bounds test, same occupancy. This is the injection — a
 * reference implementation of the defect rather than a seam in the shipped module, so the
 * shipped module carries no test-only branch.
 */
function ringLayoutWithoutReachability(
  nodeIds: readonly string[],
  reserved: readonly PlacedTransform[],
  buildableRadius: number,
): readonly PlacedTransform[] {
  const reach = Math.ceil(buildableRadius / 4) + 1;
  const cells: { col: number; row: number; ring: number; angle: number }[] = [];
  for (let col = -reach; col <= reach; col += 1) {
    for (let row = -reach; row <= reach; row += 1) {
      const { x, z } = cellCenter(col, row);
      const distance = Math.hypot(x, z);
      if (distance > buildableRadius) {
        continue;
      }
      cells.push({ col, row, ring: Math.floor(distance / 4), angle: Math.atan2(z, x) });
    }
  }
  cells.sort((a, b) => a.ring - b.ring || a.angle - b.angle);

  const taken = new Set<string>();
  for (const placed of reserved) {
    for (const key of footprintCells(placed, footprintFor(placed.nodeId))) {
      taken.add(key);
    }
  }
  const placed: PlacedTransform[] = [];
  for (const nodeId of nodeIds) {
    const footprint = footprintFor(nodeId);
    for (const cell of cells) {
      const candidate: PlacedTransform = { nodeId, col: cell.col, row: cell.row, rot: 0 };
      if (reachOf(candidate) > buildableRadius) {
        continue;
      }
      const keys = footprintCells(candidate, footprint);
      if (keys.some((key) => taken.has(key))) {
        continue;
      }
      placed.push(candidate);
      for (const key of keys) {
        taken.add(key);
      }
      break;
    }
  }
  return placed;
}

describe("the reachability check is what keeps the layout legal, injected rather than argued", () => {
  it("strands the hall without the check and strands nobody with it, at every era", () => {
    // A CHANGED GUARD OWES THE SAME EVIDENCE A FIX DOES, and so does a guard whose subject
    // is a protective mechanism. Without this the legality sweep at the top of the file is
    // satisfied by a layout that happened to be legal, and nothing says the check earned
    // it. POPULATION: every era. FLOOR: the injection has to strand somebody somewhere, or
    // the check is not doing the work claimed for it.
    let sealedByTheInjection = 0;
    for (const era of ERA_SEQUENCE) {
      const nodeIds = rosterThrough(era.id);
      const radius = eraBuildableRadius(era.id);

      const checked = ringLayout({ nodeIds, reserved: [HALL], buildableRadius: radius });
      expect(strandedAtRadius([HALL, ...checked.placed], radius)).toEqual([]);

      const unchecked = ringLayoutWithoutReachability(nodeIds, [HALL], radius);
      if (strandedAtRadius([HALL, ...unchecked], radius).length > 0) {
        sealedByTheInjection += 1;
      }
    }
    expect(sealedByTheInjection).toBeGreaterThan(0);
  });

  it("seals the hall specifically once the first ring closes, which is the defect's shape", () => {
    // Named rather than counted, because "somebody was stranded" is a weaker claim than
    // "the hall was", and the hall is what a ring encloses.
    const nodeIds = rosterThrough(ERA_SEQUENCE[4]?.id as EraId);
    const unchecked = ringLayoutWithoutReachability(
      nodeIds,
      [HALL],
      eraBuildableRadius(ERA_SEQUENCE[4]?.id as EraId),
    );
    const stranded = strandedAtRadius(
      [HALL, ...unchecked],
      eraBuildableRadius(ERA_SEQUENCE[4]?.id as EraId),
    );
    expect(stranded).toContain(TOWN_HALL_ID);
  });
});
