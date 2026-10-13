import {
  createHardWinter,
  type HardWinterState,
  hardWinterIsland,
  hardWinterView,
  winterCellKey,
  winterFrostAfterAdvance,
  winterSpreadSteps,
} from "@cr/game";
import * as THREE from "three";
import { describe, expect, test } from "vitest";

import { CURRENT_ERA_ID } from "../eraDressing";
import { GRID_CELL } from "../worldLayout";
import { buildWinterGroundGroup } from "./WinterGround";
import {
  FROST_FRONT_NAME,
  FROST_FRONT_REACH_NAME,
  FROST_FRONT_WALL_NAME,
} from "./winterFrostFront";
import { SHOVE_ICE_NAME, WINTER_COAST_RADIUS } from "./winterScene";

/**
 * **ONE RING OF ICE ON THE ISLAND, AT EVERY ROUND OF A PLAYED WINTER.**
 *
 * The lead, for at least the fifth time: *"the double ice ring in the winter crisis is still
 * there. it should always just be one ring bro like for the 50th time there shouldnt be two
 * concentric rings once the frost moves"*.
 *
 * ## HE IS RIGHT, AND IT WAS A DESIGNED WIDTH RATHER THAN A LEAK
 *
 * Nothing was failing to be cleared and nothing was drawn twice. `frostFrontMarks` marked the
 * stand ring **and every layer of the coming advance except its deepest**, so the front's band
 * was as many cell rings wide as the round had steps — and era one's schedule is 1 / 2 / 3
 * (`HARD_WINTER.spread`, `accelerate_every: 1`). Round one takes one step and drew one ring;
 * rounds two and three take two and three and drew **two**. That is precisely *"once the frost
 * moves"*.
 *
 * Measured at `cee31658`, off the built geometry, on the boards a player actually reaches:
 *
 *   | round | marked cells, by rim depth | wall plates | rime shards |
 *   |-------|----------------------------|-------------|-------------|
 *   |   1   | −1: 32                     | −1: 144     | −1: 96      |
 *   |   2   | 0: 28, **1: 24**           | 0: 120, **1: 0** | 0: 84, **1: 72** |
 *   |   3   | 2: 16, **3: 12**           | 2: 72, **3: 0**  | 2: 48, **3: 36** |
 *
 * The second ring carries **no wall at all** — 72 and 36 free-standing rime shards, a full cell
 * inside the plates. That is why it reads as a second ring of spikes rather than as a thicker
 * front, and it is what `docs/design-refs/hard-winter-one-ice-ring/` photographs.
 *
 * ## WHY THE TWO PREVIOUS FIXES IN THIS AREA DID NOT TOUCH IT
 *
 *  - **#502's extra ice layer** was a frozen sheet drawn UNDER the frost line on the same cells,
 *    because `frost_line` is a refinement of `frozen` and the renderer walked both flags. One
 *    band, wrong up close, and fixed (`winterGroundOneFill.test.ts`);
 *  - **the ring sliding one layer out** (`frostFrontRing.test.ts`) moved WHERE the band starts
 *    and deliberately kept its width. Its own mid-encounter test asserted `{0, 1}` — two rim
 *    depths carrying marks — so this defect was not merely uncaught, it was pinned as a
 *    requirement. That assertion is overturned there and this file is what replaces it.
 *
 * ## WHAT THE WIDTH WAS BUYING, AND WHERE THAT READING WENT
 *
 * `FROST_FRONT_REACH_NAME`'s note claimed the band width is *"what makes a two-step late round
 * read as deeper than a one-step early one"*. True, and given up on the lead's ruling. It is not
 * lost from the product: the crisis panel states the round's advance in words, and the frost's
 * own extent — the sheet, the line and its crest — grows by exactly those rings when the round
 * closes, whether or not the front was drawn over them a beat early.
 *
 * ## THE POPULATION IS EVERY STANDING ICE MESH IN THE LAYER, NOT THE FRONT'S OWN TWO NAMES
 *
 * `.cursor/rules/qa-verification.mdc`: scope a guard by the behaviour. The behaviour is *"this
 * puts a rim of standing ice on the island"*, and a second ring drawn by something that never
 * imports `winterFrostFront.ts` would read to a player as exactly the defect being reported. So
 * the sweep partitions **every** standing-ice mesh the layer builds into the front's marks and
 * the frozen lagoon's own lip, floors both halves, and fails on anything that is neither — which
 * makes a third source a failure here rather than a sixth report.
 */

const CITY = [
  { node_id: "NUM.S", col: -4, row: -3 },
  { node_id: "NUM.F", col: 2, row: 3 },
  { node_id: "NUM.2", col: 4, row: -1 },
  { node_id: "NUM.3", col: -3, row: 2 },
  { node_id: "NUM.4", col: 1, row: -4 },
  { node_id: "NUM.5", col: -1, row: 0 },
] as const;

const SIDES = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
] as const;

/** The winter's whole length. */
const ROUNDS = 3;

/**
 * The names this layer draws STANDING ICE under.
 *
 * Ground treatments are deliberately absent, and the exclusion is a claim rather than an
 * oversight: the frost sheet's lip and the frost line's crest are TERRAIN, they lie inside their
 * cell and rise 0.04 world units at most, and what a player calls a ring of ice is a run of
 * raised plates or shards. These three are every mesh in the layer with real standing height in
 * the cold palette.
 */
const STANDING_ICE: readonly string[] = [
  FROST_FRONT_WALL_NAME,
  FROST_FRONT_REACH_NAME,
  SHOVE_ICE_NAME,
];

interface Mark {
  /** The cell the mark's group stands on. */
  readonly key: string;
  readonly ring: number;
  readonly walls: number;
  readonly shards: number;
}

/**
 * Every front mark in a built layer, with the ring it stands on and what it is made of.
 *
 * Read off the mark's own GROUP rather than off each plate, because a rime shard is based at its
 * cell's outer edge and a corner cell's diagonal shard reaches past the cell boundary by design
 * (*"the rime is allowed over the line"*). Attributing per piece would report that overhang as a
 * ring of its own and make this file fail on a board with one ring in it — a guard that measures
 * the wrong thing, which is the failure mode this file exists to end rather than to repeat.
 */
function marksIn(group: THREE.Group, island: ReturnType<typeof hardWinterIsland>): Mark[] {
  const found: Mark[] = [];
  const world = new THREE.Vector3();
  group.updateMatrixWorld(true);
  group.traverse((object) => {
    if (object.name !== FROST_FRONT_NAME) {
      return;
    }
    object.getWorldPosition(world);
    const key = winterCellKey(
      Math.round(world.x / GRID_CELL - 0.5),
      Math.round(world.z / GRID_CELL - 0.5),
    );
    let walls = 0;
    let shards = 0;
    object.traverse((part) => {
      if (part.name === FROST_FRONT_WALL_NAME) {
        walls += 1;
      }
      if (part.name === FROST_FRONT_REACH_NAME) {
        shards += 1;
      }
    });
    found.push({ key, ring: island.rim_depth.get(key) ?? -1, walls, shards });
  });
  return found;
}

/**
 * Every standing ice mesh that is NOT part of a front mark, with its distance from the centre.
 *
 * This is the half that scopes the guard by the behaviour: anything else in this layer that
 * stands ice up on the island lands here, and the assertions below allow only the lagoon's own
 * freeze boundary, out past the drawn coast.
 */
function looseIce(group: THREE.Group): { name: string; radius: number }[] {
  const found: { name: string; radius: number }[] = [];
  const world = new THREE.Vector3();
  group.updateMatrixWorld(true);
  group.traverse((object) => {
    if (!STANDING_ICE.includes(object.name)) {
      return;
    }
    let underAMark = false;
    for (let at: THREE.Object3D | null = object.parent; at; at = at.parent) {
      if (at.name === FROST_FRONT_NAME) {
        underAMark = true;
        break;
      }
    }
    if (underAMark) {
      return;
    }
    object.getWorldPosition(world);
    found.push({ name: object.name, radius: Math.hypot(world.x, world.z) });
  });
  return found;
}

/**
 * The board at the START of each round of a winter nobody intervenes in.
 *
 * The advance is `winterFrostAfterAdvance`'s, the function `closeRound` itself calls, so these
 * are boards the reducer produces rather than boards this file invented. No wards, because a
 * fire dents the front and the subject here is the ring's WIDTH; the dent is
 * `winterGround.test.ts`'s claim and is measured there.
 */
function everyRound(): { round: number; state: HardWinterState; steps: number }[] {
  const island = hardWinterIsland(CURRENT_ERA_ID);
  const opening = createHardWinter({
    era: CURRENT_ERA_ID,
    buildings: CITY.map((b) => ({ ...b })),
  });
  const boards: { round: number; state: HardWinterState; steps: number }[] = [];
  let frozen = new Set<string>();
  for (let round = 1; round <= ROUNDS; round += 1) {
    boards.push({
      round,
      state: { ...opening, round, frozen: [...frozen] },
      steps: winterSpreadSteps(round),
    });
    frozen = winterFrostAfterAdvance(island, frozen, new Set(), winterSpreadSteps(round));
  }
  return boards;
}

describe("the island wears exactly one ring of ice", () => {
  /**
   * The premise, measured before anything is counted: this winter really does accelerate, so the
   * rounds below are genuinely the multi-step ones the defect needs. A schedule flattened to one
   * step a round would make every assertion here pass by having nothing to catch — which is the
   * shape a guard written after the fix can quietly have.
   */
  test("the rounds it sweeps are the multi-step ones the defect needs", () => {
    const steps = everyRound().map((board) => board.steps);
    expect(steps).toEqual([1, 2, 3]);
    expect(
      steps.filter((count) => count > 1).length,
      "no round takes more than one step, so a band as wide as the advance is one ring anyway",
    ).toBeGreaterThanOrEqual(2);
  });

  test.each(everyRound())(
    "round $round, taking $steps step(s), draws its ice on ONE ring",
    ({ state }) => {
      const island = hardWinterIsland(CURRENT_ERA_ID);
      const group = buildWinterGroundGroup(hardWinterView(state).rows, [], {
        weather: true,
      });
      const marks = marksIn(group, island);

      // A floor, because "one ring" is satisfied perfectly by no ring at all — and a front that
      // stopped drawing is the one regression this file could otherwise wave through.
      expect(
        marks.length,
        `round ${state.round} has no front on the island at all`,
      ).toBeGreaterThan(12);

      /*
       * THE CLAIM. One concentric band, counted off the built geometry: a run of plates and the
       * shards beside them are one ring, and a second band of shards a cell further in is the
       * second ring the lead is looking at.
       */
      const rings = [...new Set(marks.map((mark) => mark.ring))].sort((a, b) => a - b);
      expect(
        rings,
        `round ${state.round} draws ice on ${rings.length} concentric rings (rim depths ` +
          `${rings.join(", ")}), and a winter may only ever wear one`,
      ).toHaveLength(1);

      /*
       * **AND THE ONE RING IS A WALLED RING, which is the specific shape the second one had.**
       *
       * The band that shipped was not two fronts: the inner ring carried nought plates and only
       * rime. So "one ring" is not enough on its own — a fix that had dropped the WALL instead of
       * the inner layer would satisfy the count and leave a lone ring of free-standing spikes.
       * Every marked cell owes at least one plate, and the ring as a whole owes both marks.
       */
      const wall = marks.reduce((total, mark) => total + mark.walls, 0);
      const rime = marks.reduce((total, mark) => total + mark.shards, 0);
      expect(wall, `round ${state.round}'s ring stands no shove ice`).toBeGreaterThan(0);
      expect(
        rime,
        `round ${state.round}'s ring has no rime, so it points nowhere`,
      ).toBeGreaterThan(0);
      expect(
        marks.filter((mark) => mark.walls === 0).map((mark) => mark.key),
        `round ${state.round} marks these cells with rime and no wall, which is the second ring`,
      ).toEqual([]);
    },
  );

  test.each(everyRound())(
    "round $round stands no ice on the island outside that ring",
    ({ state }) => {
      const group = buildWinterGroundGroup(hardWinterView(state).rows, [], {
        weather: true,
      });
      const loose = looseIce(group);

      /*
       * THE PARTITION, and it is what scopes this by the behaviour rather than by the module.
       * Every standing ice mesh that is not part of a front mark belongs to the frozen lagoon's
       * freeze boundary, which is the sea freezing and lies out past the drawn coast. Floored, so
       * a `looseIce` that had stopped matching could not make the emptiness claim trivially true.
       */
      expect(
        loose.length,
        "the lagoon stopped drawing its freeze boundary, so this sweep sees nothing",
      ).toBeGreaterThan(24);
      expect(
        [...new Set(loose.map((piece) => piece.name))],
        `round ${state.round} stands ice that is neither the front's nor the lagoon's`,
      ).toEqual([SHOVE_ICE_NAME]);
      expect(
        loose.filter((piece) => piece.radius < WINTER_COAST_RADIUS).length,
        `round ${state.round} stands lagoon ice on the island, which would read as a ring`,
      ).toBe(0);
    },
  );

  /**
   * **AND THE ONE RING IS THE FRONT'S OWN STAND RING, not whichever ring happened to survive.**
   *
   * "Exactly one" is satisfied by a ring in the wrong place, so the ring is identified as well:
   * it is ice the frost already holds, immediately outside the ground this round takes. That is
   * the ruling `frostFrontRing.test.ts` landed for the lead's *"it needs to start one layer
   * out"*, and narrowing the band must not quietly undo it.
   */
  test.each(everyRound())(
    "round $round puts that ring on the ice, one step outside the ground the round takes",
    ({ state }) => {
      const island = hardWinterIsland(CURRENT_ERA_ID);
      const rows = hardWinterView(state).rows;
      const takes = new Set(
        rows
          .flat()
          .filter((cell) => cell.frost_next)
          .map((cell) => winterCellKey(cell.col, cell.row)),
      );
      expect(
        takes.size,
        "the round takes no ground, so there is no front to place",
      ).toBeGreaterThan(8);

      const marked = new Set(
        marksIn(buildWinterGroundGroup(rows, [], { weather: false }), island).map(
          (mark) => mark.key,
        ),
      );
      expect(marked.size, `round ${state.round} marked no cells`).toBeGreaterThan(8);

      // DISJOINT from the advance: the mark stands on ice, never on the ground being taken.
      expect(
        [...marked].filter((key) => takes.has(key)).sort(),
        `round ${state.round} stands the front on ground the round takes`,
      ).toEqual([]);
      // ...and BESIDE it, so the one ring is the boundary of THIS round's advance rather than a
      // ring left over from a previous one — which is the other way two rings could appear.
      for (const key of marked) {
        const [col, row] = key.split(",").map(Number) as [number, number];
        const beside = SIDES.some(([dc, dr]) =>
          takes.has(winterCellKey(col + dc, row + dr)),
        );
        expect(
          beside,
          `${key} carries a mark and touches none of the ground round ${state.round} takes`,
        ).toBe(true);
      }
      // Every marked cell is ice the frost holds: frozen board ground, or the off-board margin.
      const frozen = new Set(state.frozen);
      for (const key of marked) {
        expect(
          frozen.has(key) || !island.rim_depth.has(key),
          `${key} carries the front and is neither frozen nor off the board`,
        ).toBe(true);
      }
    },
  );
});
