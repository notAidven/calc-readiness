import {
  cellCenter,
  footprintCells,
  footprintFor,
  GRID_CELL,
  isFootprintInBounds,
  type PlacedTransform,
  type Transform,
  unreachableNodeIds,
} from "../city/worldLayout";

export { WALKABLE_MARGIN } from "../city/worldLayout";

/**
 * *"HAVE THE GAME DO IT FOR ME"* — the auto-layout, as a ring.
 *
 * The lead's own instruction and the whole of the brief for this file: *"auto-layout
 * shouldnt be too costly i feel - it can just build out in a ring."* So it is a ring, it is
 * about a hundred lines, and it does not try to be clever.
 *
 * It is the third of the walk's three options (`catchUpWalk.ts`) and the one **§10.10** rules
 * the default for ages two onward, on D-ERA18's grounds — *"every student places era one by
 * hand; later eras auto-fill during the montage"* — with the safety net stated to the
 * learner in §10.12's own words: **D-TH9** keeps every placed building movable afterwards,
 * *"purely spatial (no mastery/stage/star change)"*, so nothing this file decides is
 * permanent.
 *
 * ## ⚑ IT TAKES THE RADIUS. THAT IS THE POINT OF THE FILE, NOT A PARAMETER STYLE
 *
 * `worldLayout.ts`'s own header used to name the defect this avoids: `isCellBuildable` **closed
 * over** `BUILDABLE_RADIUS`, and *"that is why the auto-layout seats 24 of 53 buildings on
 * ground that would seat 53 of 53."* Beat two of every ceremony grows the island, so a layout
 * that closes over one radius is wrong at nine of the ten ages it will be asked about.
 * {@link ringLayout} therefore takes {@link RingLayoutInput.buildableRadius} and reads no module
 * constant for it, and `ringLayout.test.ts` seats one roster at three radii and reads three
 * different answers — which is the only thing that shows the radius is genuinely an input
 * rather than decoration. Measured over the ten cumulative rosters at each era's own authored
 * radius, every one seats in full, against 19 of 53 at the shipped 22.
 *
 * **19 and not 20**, which is worth a line because the wrong figure was written down first: 20
 * was measured on a draft that also left an unbuilt radial corridor, and that corridor is gone
 * for the reason below. Re-measured on the shipped code at `54cac8d6`.
 *
 * ## ⚑ THE CAP IS GONE, BECAUSE THE PLACEMENT RULE FOLLOWED
 *
 * This block used to warn that widening the layout *"does NOT widen the shipped placement
 * rule"* — `placeSkill` gated on `isCellBuildable`'s 22, so a transform beyond it was one the
 * session would silently refuse — and it exported `SHIPPED_PLACEMENT_RADIUS` so the cap was
 * visible at the call site rather than implied. Both are gone: the disc is now derived per era
 * from the land that era is drawn on, and `CityCatchUp` passes the age's own disc.
 *
 * The one thing that has NOT changed is the discipline the cap existed for. **A caller must
 * pass the layout the same radius the session's gate is using**, or the layout seats buildings
 * the write refuses and the shortfall report never fires, because this function believed it had
 * seated them. `eraDiscSeatsTheRoster.test.tsx` drives the mounted walk and counts what the host
 * actually received, which is the assertion that catches a disagreement rather than the comment
 * that asks for one.
 *
 * ## ONE MECHANISM KEEPS THE LAYOUT LEGAL, AND IT IS THE SHIPPED RULE
 *
 * A closed ring of buildings seals whatever is inside it, and what is inside the first ring
 * is the Town Hall. **D-ERA35 / O-13 make that a hard refusal** rather than a penalty:
 * *"a person should be able to reach the building so the user can't just toss all the
 * buildings in a big blob."* So every candidate is run through {@link strandedAtRadius} over
 * the whole hypothetical set, and a candidate that strands anybody is passed over.
 *
 * **An earlier draft also left an unbuilt radial corridor and claimed it made the interior
 * connected "by construction". That claim was false and the measurement is why it is gone
 * rather than kept as belt and braces.** Disabling the corridor while leaving the
 * reachability check in place produced legal layouts at all ten eras, so the corridor was
 * not what kept them legal; and it was not free either way, seating 20 of the 53-node roster
 * at radius 22 against 19 without it, but 15 of the 16-node roster against 16. A second
 * mechanism that is neither load-bearing nor a clear win is a mechanism a later reader has
 * to reason about for nothing — and the roster it cost a building is the one that fits, where
 * the roster it gained one on does not fit either way.
 */

export interface RingLayoutInput {
  /** The buildings to seat, in the order they should go round the ring. */
  readonly nodeIds: readonly string[];
  /**
   * Everything already on the grid — the Town Hall, and every building already placed.
   * Cells they occupy are unavailable, and they are in the reachability walk too, which is
   * the half that is easy to miss: the hall is what a closed ring seals in.
   */
  readonly reserved: readonly PlacedTransform[];
  /** The buildable disc this layout must fit inside, in world units. */
  readonly buildableRadius: number;
}

export interface RingLayoutResult {
  /** The seated buildings, in the order they were seated. */
  readonly placed: readonly PlacedTransform[];
  /**
   * Buildings there was no room for at this radius. **Reported rather than dropped**, and it
   * still has work to do now that the disc follows the era: `islandLand.ts`'s growth ceiling
   * holds eras four to ten at grass 46, so they all get a disc of 38 rather than the 42 to 69
   * their budgets authored, and the two largest rosters still do not fit on it.
   *
   * Measured through the mounted walk at each age's own disc: one to eight handed ages seat in
   * full (6, 11, 16, 21, 26, 32, 38, 47), and the shortfall starts at nine, where 53 seats 50.
   * Before the disc followed the land the shortfall started at four, where 21 seated 18.
   */
  readonly unseated: readonly string[];
  /** How many rings the layout reached. A reviewer's read on how tight the fit was. */
  readonly rings: number;
}

/** Every cell key a set of placements occupies. */
function occupied(placements: readonly PlacedTransform[]): Set<string> {
  const cells = new Set<string>();
  for (const placed of placements) {
    for (const key of footprintCells(placed, footprintFor(placed.nodeId))) {
      cells.add(key);
    }
  }
  return cells;
}

/**
 * Which of these buildings nobody could walk up to, on a disc of `buildableRadius`.
 *
 * ## ⚑ IT IS NOW THE SHIPPED FUNCTION, NOT A COPY PINNED TO IT
 *
 * This was a second flood fill — `worldLayout.unreachableNodeIds` transcribed with the two radii
 * taken as arguments instead of closed over — and it existed for exactly one reason: the shipped
 * one could not be told which island it was walking. Now that it can, the copy is a second
 * notion of reachability with nothing left to justify it, so it is an alias and the walk has one
 * implementation again.
 *
 * `ringLayout.test.ts` kept a guard that drove both over the same layouts and asserted the same
 * set, with a walled-in hall proving neither answered over an empty one. That guard now compares
 * a function with itself, so it says nothing; what replaced it is a check that the layout this
 * file produces satisfies **`placementRefusal`**, the whole shipped rule and the one the session
 * actually gates on, rather than its reachability clause alone.
 */
export function strandedAtRadius(
  placements: readonly PlacedTransform[],
  buildableRadius: number,
): readonly string[] {
  return unreachableNodeIds(placements, buildableRadius);
}

/**
 * Every candidate cell on the disc, ordered ring by ring and then round each ring.
 *
 * A "ring" is one grid cell of radial depth, so ring `k` holds the cells whose centre falls
 * in `[k · GRID_CELL, (k+1) · GRID_CELL)`. Within a ring the order is by angle, which is what
 * makes the result read as a ring rather than as a nearest-first blob: the shipped
 * `defaultPlacements` sorts purely by distance and produces a cluster.
 */
function ringCandidates(buildableRadius: number): readonly Transform[] {
  const reach = Math.ceil(buildableRadius / GRID_CELL) + 1;
  const cells: { t: Transform; ring: number; angle: number }[] = [];
  for (let col = -reach; col <= reach; col += 1) {
    for (let row = -reach; row <= reach; row += 1) {
      const { x, z } = cellCenter(col, row);
      const distance = Math.hypot(x, z);
      if (distance > buildableRadius) {
        continue;
      }
      cells.push({
        t: { col, row, rot: 0 },
        ring: Math.floor(distance / GRID_CELL),
        angle: Math.atan2(z, x),
      });
    }
  }
  cells.sort((a, b) => a.ring - b.ring || a.angle - b.angle);
  return cells.map((cell) => cell.t);
}

/**
 * Seat every building on the smallest rings that will hold them.
 *
 * Greedy and single-pass: each building takes the first candidate that fits, is not
 * occupied, and strands nobody. A building with no such candidate goes to
 * {@link RingLayoutResult.unseated} rather than being forced somewhere illegal, because
 * `placeSkill` would refuse it anyway and a silently-missing building is worse than a
 * reported one.
 *
 * The reachability test runs over the WHOLE hypothetical set — everything reserved, plus
 * everything seated so far, plus the candidate — because `placementRefusal`'s own docblock
 * names the naive version and why it fails: *"the building that gets sealed off is usually
 * not the one being dropped."*
 */
export function ringLayout(input: RingLayoutInput): RingLayoutResult {
  const { nodeIds, reserved, buildableRadius } = input;
  const candidates = ringCandidates(buildableRadius);
  const taken = occupied(reserved);
  const placed: PlacedTransform[] = [];
  const unseated: string[] = [];
  let rings = 0;

  for (const nodeId of nodeIds) {
    const footprint = footprintFor(nodeId);
    let seated: PlacedTransform | null = null;
    for (const candidate of candidates) {
      if (!isFootprintInBounds(candidate, footprint, buildableRadius)) {
        continue;
      }
      const cells = footprintCells(candidate, footprint);
      if (cells.some((key) => taken.has(key))) {
        continue;
      }
      const proposal: PlacedTransform = { nodeId, ...candidate };
      if (
        strandedAtRadius([...reserved, ...placed, proposal], buildableRadius).length > 0
      ) {
        continue;
      }
      seated = proposal;
      break;
    }
    if (seated === null) {
      unseated.push(nodeId);
      continue;
    }
    placed.push(seated);
    for (const key of footprintCells(seated, footprint)) {
      taken.add(key);
    }
    const { x, z } = cellCenter(seated.col, seated.row);
    rings = Math.max(rings, Math.floor(Math.hypot(x, z) / GRID_CELL) + 1);
  }

  return { placed, unseated, rings };
}
