import {
  createHardWinter,
  type HardWinterState,
  hardWinterIsland,
  hardWinterView,
  winterCellKey,
} from "@cr/game";
import type * as THREE from "three";
import { describe, expect, test } from "vitest";

import { CURRENT_ERA_ID } from "../eraDressing";
import { GRID_CELL } from "../worldLayout";
import { buildWinterGroundGroup, WINTER_TILE_NAMES } from "./WinterGround";

/**
 * **ONE GROUND SURFACE PER CELL, BECAUSE TWO OF THEM INTERLEAVE INSTEAD OF STACKING.**
 *
 * The lead, on a round-two frame: *"theres a bunch of random interior weird icicles; think theres
 * an extra layer thats being rendered unecssiarily."*
 *
 * ## THE DEFECT, AND WHY THE RUNG LADDER DID NOT CATCH IT
 *
 * `WinterCellView.frost_line` is not a state a cell holds BESIDE `frozen`. The engine defines it
 * as a refinement of it — *"frozen with an unfrozen land neighbour"* — so it is true only of
 * frozen ground, and the renderer, walking the two flags independently, drew a full-cell terrain
 * surface for each. On a round-two board that is 28 cells carrying two surfaces apiece.
 *
 * The ladder in `WinterGround.tsx` puts them one 0.05 rung apart and argues that sinking rather
 * than rising is what keeps the stack safe: *"a state can never reach the plane of the state
 * stacked over it"*. True, and pointed at the wrong hazard. Sinking stops the LOWER surface
 * reaching UP; what happens here is the UPPER surface reaching DOWN. The frost line dishes 0.14
 * below its own rung while the sheet dishes 0.09 below a rung 0.05 lower, so both occupy the same
 * 0.14-unit band, and since the two dishes are hashed off world position with different salts
 * each pokes through the other over a large share of every shared cell.
 *
 * Photographed at 1024x580 on a round-two board: hiding the sheet changed **12,192 pixels**,
 * which is the same order as the whole of the front's rime, in a serrated comb of pale teeth
 * running round the outside of the front. That is the second band of spikes the objection names.
 *
 * ## WHAT THIS ASSERTS, AND IT IS THE CLASS RATHER THAN THE PAIR
 *
 * Two claims, because they fail for different reasons:
 *
 *  - **no cell carries two ground fills.** Scoped by what a real board produces rather than by
 *    the pair that was wrong, so the next state added as a refinement of another is caught;
 *  - **no two fills on one cell overlap in height** — measured off the built vertices on a board
 *    contrived to stack every state that CAN share a cell, so a future rung that is spaced by
 *    less than the dish beneath it fails here rather than in a frame.
 */

const CITY = [
  { node_id: "NUM.S", col: -4, row: -3 },
  { node_id: "NUM.F", col: 2, row: 3 },
  { node_id: "NUM.2", col: 4, row: -1 },
  { node_id: "NUM.3", col: -3, row: 2 },
  { node_id: "NUM.4", col: 1, row: -4 },
  { node_id: "NUM.5", col: -1, row: 0 },
];

/** Every full-cell ground FILL the layer draws. The front is standing objects and is not one. */
const FILL_NAMES: readonly string[] = [
  WINTER_TILE_NAMES.frozen,
  WINTER_TILE_NAMES.frostLine,
  WINTER_TILE_NAMES.warded,
];

/**
 * **ONE PAIR IS STILL KNOWN TO CROSS, AND IT IS DECLARED RATHER THAN LEFT OUT OF THE POPULATION.**
 *
 * Found by this guard while it was being written for the pair the lead reported, and reported
 * rather than folded in: **the frost line pokes 0.060 world units up through the ochre a fire is
 * holding**, so a bonfire lit on the frost's own leading edge shows blue specks through its held
 * ground. Same class as the defect above, different cause and a different fix.
 *
 * It is NOT the duplicate the lead saw. Frozen-under-frost-line was total — every frost-line cell
 * carried two surfaces on every board, 12,192 pixels of it at round two — and it went away by
 * drawing one fill instead of two, because the frost line is a refinement of the sheet and one
 * covers the other exactly. `warded` and `frost_line` are genuinely two different states of one
 * cell and both are meant to be seen (the ochre is feathered so the frost shows around its rim),
 * so nothing can be dropped: the fix is SPACING, and the arithmetic says how much. The frost line
 * crests 0.04 above its rung and the ochre dishes 0.12 below one two rungs (0.10) higher, so the
 * ochre's floor sits 0.06 below the crest. Clearing it means moving `RUNG.warded` up by at least
 * four rungs and `RUNG.preview` with it, which re-spaces a ladder `winterGround.test.ts` pins and
 * `crisisLadder.test.ts` mirrors — not a change to make in the same pass as a demo fix.
 *
 * Asserted in BOTH directions below: an unlisted pair that crosses fails, and a listed pair that
 * has stopped crossing fails too, so this cannot sit here excusing nothing.
 */
const KNOWN_CROSSING: readonly { upper: string; lower: string }[] = [
  { upper: WINTER_TILE_NAMES.warded, lower: WINTER_TILE_NAMES.frostLine },
];

interface Fill {
  readonly name: string;
  readonly cell: string;
  /** Every vertex of the visible surface, in world space. */
  readonly surface: readonly { x: number; y: number; z: number }[];
}

/** Every fill in the group, with the cell it lies on and its surface in world space. */
function fills(group: THREE.Group): Fill[] {
  const found: Fill[] = [];
  group.updateMatrixWorld(true);
  group.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh || !FILL_NAMES.includes(mesh.name)) {
      return;
    }
    const position = mesh.geometry.getAttribute("position");
    // The SURFACE only. A fill is bedded `SLAB_THICK` deep so it shows a lip, and the skirt's
    // floor would make every state reach every other one — which would be a guard that could
    // not pass. The top surface is everything above the bed, and the bed is a flat plane.
    let floor = Number.POSITIVE_INFINITY;
    for (let i = 0; i < position.count; i += 1) {
      floor = Math.min(floor, position.getY(i));
    }
    const surface: { x: number; y: number; z: number }[] = [];
    for (let i = 0; i < position.count; i += 1) {
      const y = position.getY(i);
      if (y <= floor + 1e-6) {
        continue;
      }
      surface.push({
        x: position.getX(i) + mesh.position.x,
        y: y + mesh.position.y,
        z: position.getZ(i) + mesh.position.z,
      });
    }
    found.push({
      name: mesh.name,
      cell: winterCellKey(
        Math.round(mesh.position.x / GRID_CELL - 0.5),
        Math.round(mesh.position.z / GRID_CELL - 0.5),
      ),
      surface,
    });
  });
  return found;
}

/**
 * How far the LOWER of two surfaces rises above the upper one, at the worst shared point.
 *
 * Sampled at the upper surface's own vertices against the lower surface's nearest vertex, which
 * is what a range comparison cannot answer: two surfaces whose HEIGHT BANDS overlap need not
 * cross, because the deep parts of one may everywhere sit over the deep parts of the other, and
 * a guard that could not tell those apart would be reporting on arithmetic rather than on
 * geometry. Negative means the stack is clean.
 */
function poke(upper: Fill, lower: Fill): number {
  let worst = Number.NEGATIVE_INFINITY;
  for (const above of upper.surface) {
    let nearest: { y: number; d: number } | null = null;
    for (const below of lower.surface) {
      const d = (below.x - above.x) ** 2 + (below.z - above.z) ** 2;
      if (nearest === null || d < nearest.d) {
        nearest = { y: below.y, d };
      }
    }
    if (nearest) {
      worst = Math.max(worst, nearest.y - above.y);
    }
  }
  return worst;
}

/** A played board: the shoreline band frozen, so every frozen cell is also on the frost line. */
function midEncounter(): HardWinterState {
  const island = hardWinterIsland(CURRENT_ERA_ID);
  return {
    ...createHardWinter({ era: CURRENT_ERA_ID, buildings: CITY }),
    round: 2,
    frozen: island.cells.filter((key) => island.rim_depth.get(key) === 0),
  };
}

describe("one ground fill per cell", () => {
  test("a frost-line cell is drawn once, not once as sheet and once as line", () => {
    const view = hardWinterView(midEncounter());
    const land = view.rows.flat().filter((c) => c.land);
    const frozen = land.filter((c) => c.frozen);
    const line = land.filter((c) => c.frost_line);
    // The premise, measured rather than assumed: this board is the one where the two sets are
    // the same 28 cells, which is what made the duplication total.
    expect(frozen.length, "nothing frozen, so there is nothing to draw twice").toBe(28);
    expect(line.length).toBe(28);

    const group = buildWinterGroundGroup(view.rows, [], { weather: false });
    const byCell = new Map<string, string[]>();
    for (const fill of fills(group)) {
      byCell.set(fill.cell, [...(byCell.get(fill.cell) ?? []), fill.name]);
    }
    expect(byCell.size, "no ground fills on a board with 28 frozen cells").toBe(28);
    for (const [cell, names] of byCell) {
      expect(names.sort(), `${cell} carries ${names.length} ground fills`).toEqual([
        WINTER_TILE_NAMES.frostLine,
      ]);
    }
  });

  test("no two fills sharing a cell overlap in height, on a board that stacks them", () => {
    /*
     * The general claim. A cell CAN legitimately carry two fills — frozen ground a fire is
     * holding is frozen and warded at once — and the ladder's promise is that stacked states
     * never reach each other. That promise is checked here against the built vertices rather
     * than against the rung arithmetic, because the rung is not what a frame sees: the surface
     * dishes below it, and it is the dish that decides whether two states interleave.
     */
    const island = hardWinterIsland(CURRENT_ERA_ID);
    // A LATE board rather than the round-two one above, and that is the load-bearing choice: at
    // round two every frozen cell is also on the frost line, so the only pair that could stack
    // is the declared one and the sweep would be measuring nothing it is allowed to fail on.
    // Three bands under ice leaves interior frozen ground, which a fire can hold without the
    // frost line being in the way.
    const deep = island.cells.filter((key) => (island.rim_depth.get(key) as number) <= 2);
    const base = createHardWinter({ era: CURRENT_ERA_ID, buildings: CITY });
    const withFire: HardWinterState = {
      ...base,
      round: 3,
      frozen: deep,
      // A fire standing on ground the frost already took, which is what puts `warded` and
      // `frozen` on the same cells — the pairs that are genuinely two states at once.
      fires: [{ col: -4, row: -3, radius: 4, rounds_left: 2, lit_in_round: 2 }],
    };
    const view = hardWinterView(withFire);
    const land = view.rows.flat().filter((c) => c.land);
    // Floors on the premise: without cells in two states, and without BOTH kinds of pair, this
    // test measures nothing it is allowed to fail on.
    expect(
      land.filter((c) => c.frozen && c.warded && !c.frost_line).length,
      "no cell stacks held ground over the frost sheet, so the unexcused pair is absent",
    ).toBeGreaterThan(3);
    expect(
      land.filter((c) => c.frost_line && c.warded).length,
      "no cell stacks held ground over the frost line, so the declared pair is absent",
    ).toBeGreaterThan(0);

    const group = buildWinterGroundGroup(view.rows, [], { weather: false });
    const byCell = new Map<string, Fill[]>();
    for (const fill of fills(group)) {
      byCell.set(fill.cell, [...(byCell.get(fill.cell) ?? []), fill]);
    }
    let compared = 0;
    let excused = 0;
    for (const [cell, here] of byCell) {
      for (let i = 0; i < here.length; i += 1) {
        for (let j = i + 1; j < here.length; j += 1) {
          const a = here[i] as Fill;
          const b = here[j] as Fill;
          // Which of the pair is meant to be on top is read off the geometry rather than off a
          // written-down order, so a re-rung state is measured the way it actually stacks.
          const aTop = Math.max(...a.surface.map((v) => v.y));
          const bTop = Math.max(...b.surface.map((v) => v.y));
          const [upper, lower] = aTop >= bTop ? [a, b] : [b, a];
          const through = poke(upper, lower);
          if (
            KNOWN_CROSSING.some((p) => p.upper === upper.name && p.lower === lower.name)
          ) {
            excused += 1;
            // THE OTHER DIRECTION. A declared crossing that has been fixed must stop being
            // declared, or the list goes on excusing something it has stopped describing.
            expect(
              through,
              `${cell}: ${lower.name} no longer pokes through ${upper.name} ` +
                `(${through.toFixed(3)}), so KNOWN_CROSSING is stale and the entry must go`,
            ).toBeGreaterThan(0);
            continue;
          }
          compared += 1;
          expect(
            through,
            `${cell}: ${lower.name} pokes ${through.toFixed(3)} up through ${upper.name}`,
          ).toBeLessThan(0);
        }
      }
    }
    // Floors on both populations, because "nothing pokes through" is trivially true of a board
    // where no cell carries two fills, and the exception is only load-bearing if it is reached.
    expect(compared, "no unexcused pair was compared at all").toBeGreaterThan(3);
    expect(
      excused,
      "the declared crossing was never reached on this board",
    ).toBeGreaterThan(0);
  });
});
