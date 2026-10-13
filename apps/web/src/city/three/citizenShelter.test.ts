import {
  createHardWinter,
  hardWinterIsland,
  hardWinterReducer,
  hardWinterView,
  type WinterCellView,
} from "@cr/game";
import { describe, expect, it } from "vitest";
import { thawWinterRows } from "../../winter/thaw";
import { CURRENT_ERA_ID } from "../eraDressing";
import { TOWN_HALL_ID } from "../townHall";
import { footprintFor } from "../worldLayout";
import {
  SHELTER_PER_CELL,
  SHELTER_PER_PLOT_CELL,
  SHELTER_TIER,
  SHELTER_TIERS,
  shelterCapacityOf,
  shelterGround,
  shelterTierOf,
  shelterWall,
} from "./citizenShelter";

/**
 * The board a sheltering crowd reads, cell by cell.
 *
 * `citizensInTheWinter.test.ts` holds the behaviour over real played winters; this holds the
 * READING, which is the part that can be wrong in a way no arrangement of people would reveal —
 * a tier table that quietly admitted frozen ground would put the crowd on ice while every
 * placement rule downstream behaved perfectly.
 */

/** One row of hand-built cells, so a tier can be asked about a board of exactly one thing. */
function cell(
  over: Partial<WinterCellView> & { col: number; row: number },
): WinterCellView {
  return {
    land: true,
    rim_depth: 0,
    frozen: false,
    warded: false,
    frost_line: false,
    frost_next: false,
    building: null,
    damage_stage: 0,
    preview_tier: null,
    ...over,
  };
}

describe("shelterGround — no crisis, a live crisis and a thawed board", () => {
  it("returns null with no rows, and null once the board has thawed", () => {
    expect(shelterGround(null)).toBeNull();
    expect(shelterGround(undefined)).toBeNull();

    // **THE THAW, WHICH IS HOW THE CROWD COMES HOME (2026-08-03).** This case read the other
    // way until then — a hand-built row of one warm cell was "round one, where nothing has been
    // taken and everybody is already sheltering". That was WRONG about the engine and it is what
    // kept the crowd huddled after the crisis was over: `WinterInCity`'s bridge keeps publishing
    // rows for as long as the outcome panel is up, thawed by `thawWinterRows`, and a thawed board
    // is exactly a board with no cold ground on it. So a settlement whose winter had ended stood
    // in its doorways indefinitely.
    //
    // A warm row is now a thawed board and the crowd goes back to its day. What makes the
    // reading total rather than a heuristic is the case below: a LIVE board always carries cold
    // ground, so nothing that is really a crisis lands here.
    const thawed = shelterGround([[cell({ col: 0, row: 0 }), cell({ col: 1, row: 0 })]]);
    expect(thawed).toBeNull();
  });

  it("holds a live board on either flag, which is what makes the thaw reading total", () => {
    // Both halves, because either one alone is a board the reducer really produces: round one
    // has nothing frozen and the whole shoreline under the coming advance, and the last round
    // has everything frozen and nothing left to take.
    const opening = shelterGround([
      [cell({ col: 0, row: 0, frost_next: true }), cell({ col: 1, row: 0 })],
    ]);
    expect(opening).not.toBeNull();
    expect(opening?.frozen.size).toBe(0);
    expect(opening?.frostNext.size).toBe(1);
    expect(opening?.land.size).toBe(2);

    const closing = shelterGround([
      [cell({ col: 0, row: 0, frozen: true }), cell({ col: 1, row: 0, frozen: true })],
    ]);
    expect(closing).not.toBeNull();
    expect(closing?.frozen.size).toBe(2);
    expect(closing?.frostNext.size).toBe(0);
  });

  it("reads the ENGINE's opening board as live, so a real round one is never a thaw", () => {
    // The load-bearing half of the thaw reading, measured against the reducer rather than
    // argued: `createHardWinter` opens with nothing frozen at all, so if the coming advance
    // were also empty the crowd would spend round one commuting through a blizzard. It is not
    // empty — the whole 28-cell shoreline band is under it — and the widest ward era one has is
    // 13 cells, so no legal opening board can be mistaken for a thawed one.
    const view = hardWinterView(createHardWinter({ era: CURRENT_ERA_ID }));
    let frozen = 0;
    let coming = 0;
    for (const line of view.rows) {
      for (const at of line) {
        if (!at.land) {
          continue;
        }
        if (at.frozen) {
          frozen += 1;
        }
        if (at.frost_next) {
          coming += 1;
        }
      }
    }
    expect(frozen).toBe(0);
    expect(coming).toBe(28);
    expect(shelterGround(view.rows)).not.toBeNull();

    // And the thaw really does clear both, so the two cases above are the two worlds the
    // shipped surface produces rather than two hand-built rows.
    expect(shelterGround(thawWinterRows(view.rows))).toBeNull();
  });

  it("reads frozen, the coming advance and the land, and skips water", () => {
    const ground = shelterGround([
      [
        cell({ col: 0, row: 0, frozen: true }),
        cell({ col: 1, row: 0, frost_next: true }),
        cell({ col: 2, row: 0 }),
        cell({ col: 3, row: 0, land: false, rim_depth: null, frozen: true }),
      ],
    ]);
    expect(ground?.land.size).toBe(3);
    expect([...(ground?.frozen ?? [])]).toEqual(["0,0"]);
    expect([...(ground?.frostNext ?? [])]).toEqual(["1,0"]);
    // A water cell is not land and never enters any set, frozen flag or not: painting the
    // lagoon would put the crowd's safe region out to sea.
    expect(ground?.frozen.has("3,0")).toBe(false);
  });
});

describe("shelterTierOf — frozen is a refusal, and the other two are an order", () => {
  it("refuses frozen ground and nothing else", () => {
    const ground = shelterGround([
      [
        cell({ col: 0, row: 0, frozen: true }),
        cell({ col: 1, row: 0, frost_next: true }),
        cell({ col: 2, row: 0 }),
      ],
    ]);
    if (!ground) {
      throw new Error("no ground");
    }
    expect(shelterTierOf(ground, 0, 0)).toBeNull();
    expect(shelterTierOf(ground, 1, 0)).toBe(SHELTER_TIER.exposed);
    expect(shelterTierOf(ground, 2, 0)).toBe(SHELTER_TIER.interior);
    // Off the board entirely: the permanently-clear annulus, which the frost cannot reach.
    expect(shelterTierOf(ground, 40, 40)).toBe(SHELTER_TIER.fringe);
  });

  it("puts frozen ahead of the coming advance, so ice wins over a forecast", () => {
    // A cell can be both — no, it cannot, and the engine says so (`frost_next` is "never true
    // of a cell that is already frozen"). This is the guard for a caller that hands over a board
    // where both flags are set anyway: the refusal has to win, because standing on ice is the
    // thing that must not happen and standing on ground the frost is coming for merely should
    // not.
    const ground = shelterGround([
      [cell({ col: 0, row: 0, frozen: true, frost_next: true })],
    ]);
    if (!ground) {
      throw new Error("no ground");
    }
    expect(shelterTierOf(ground, 0, 0)).toBeNull();
  });

  it("orders the tiers safest-first and holds all three", () => {
    // `citizenPlaces.ts` keys its distance penalties on these values, so the ORDER is behaviour
    // rather than documentation. A reordering that put the fringe first would empty the
    // settlement onto the shoreline.
    expect([...SHELTER_TIERS]).toEqual([
      SHELTER_TIER.interior,
      SHELTER_TIER.exposed,
      SHELTER_TIER.fringe,
    ]);
    expect(SHELTER_TIER.interior).toBeLessThan(SHELTER_TIER.exposed);
    expect(SHELTER_TIER.exposed).toBeLessThan(SHELTER_TIER.fringe);
  });
});

describe("the tiers over era one's real board", () => {
  it("refuses every cell the reducer froze, and admits every cell it did not", () => {
    // The reading, checked against the engine's own board rather than against a hand-built one:
    // one round of a winter nobody defended, then every land cell asked about both ways.
    let winter = createHardWinter({ era: CURRENT_ERA_ID });
    winter = hardWinterReducer(winter, {
      type: "declare",
      action: { kind: "reinforce", node_id: winter.buildings[0]?.node_id ?? "" },
    });
    winter = hardWinterReducer(winter, { type: "resolve", correct: 2, asked: 3 });
    winter = hardWinterReducer(winter, { type: "end_round" });
    const view = hardWinterView(winter);
    const ground = shelterGround(view.rows);
    if (!ground) {
      throw new Error("no ground");
    }
    // Floors, off the engine: era one's island is 88 cells and the first advance takes the whole
    // 28-cell shoreline band. Both have to be real, or the sweep below runs over nothing.
    expect(ground.land.size).toBe(hardWinterIsland(CURRENT_ERA_ID).cells.length);
    expect(ground.land.size).toBe(88);
    expect(ground.frozen.size).toBe(28);

    let refused = 0;
    let admitted = 0;
    for (const key of ground.land) {
      const [col, row] = key.split(",");
      const tier = shelterTierOf(ground, Number(col), Number(row));
      if (ground.frozen.has(key)) {
        expect(tier, `${key} is frozen and was admitted`).toBeNull();
        refused += 1;
      } else {
        expect(tier, `${key} is clear and was refused`).not.toBeNull();
        expect(tier, `${key} was read as off-board`).not.toBe(SHELTER_TIER.fringe);
        admitted += 1;
      }
    }
    expect(refused).toBe(28);
    expect(admitted).toBe(60);
  });
});

describe("the huddle's density", () => {
  it("is tighter than an ordinary day's, and not so tight the knot is a heap", () => {
    // The band is the claim rather than the digit. Below the fair-weather five it would spread a
    // ring knot over more cells than an ordinary crowd, which is the opposite of a huddle; far
    // above it and one cell holds the whole settlement, which is a heap rather than a knot —
    // measured at 30 of 44 citizens in a single cell before the tiers became a preference.
    expect(SHELTER_PER_CELL).toBeGreaterThan(5);
    expect(SHELTER_PER_CELL).toBeLessThanOrEqual(12);
  });
});

describe("how much shelter a building is: the capacity rule", () => {
  it("is the PLOT, so a bigger building holds more and no second table can drift", () => {
    // The rule as behaviour rather than as a docblock: capacity is footprint area times the
    // per-cell figure, so it is derived from the one table INV-ERA-1 freezes and there is
    // nowhere for "how big is this building" to disagree with itself.
    for (const nodeId of [
      "NUM.S",
      "NUM.F",
      "NUM.2",
      "NUM.3",
      "NUM.4",
      "NUM.5",
      TOWN_HALL_ID,
    ]) {
      const { w, d } = footprintFor(nodeId);
      expect(shelterCapacityOf(nodeId), nodeId).toBe(w * d * SHELTER_PER_PLOT_CELL);
      // Nothing on the island shelters nobody: the smallest plot era one authors is 1x1, and a
      // building with a capacity of zero would be a shelter the allocator could never use.
      expect(shelterCapacityOf(nodeId), nodeId).toBeGreaterThan(0);
    }

    // And it really does separate era one's buildings by size, which is the example the ruling
    // was posed with — a Roundhouse plausibly holds more than a Hide Shed. The Workshop is the
    // island's only 1x1 and the hall its only 3x2, so they are the two ends.
    expect(shelterCapacityOf("NUM.3")).toBeLessThan(shelterCapacityOf("NUM.2"));
    expect(shelterCapacityOf("NUM.2")).toBeLessThan(shelterCapacityOf(TOWN_HALL_ID));
    // The eras that authored no footprints resolve through `DEFAULT_FOOTPRINT` by their own
    // guides' choice, so the rule already covers them rather than needing a decision nobody made.
    expect(shelterCapacityOf("EXP.7")).toBe(
      footprintFor("EXP.7").w * footprintFor("EXP.7").d * SHELTER_PER_PLOT_CELL,
    );
  });

  it("is a whole number of people, and the hall is bounded like everything else", () => {
    // `citizens-tuning.ts` makes the hall's fair-weather gathering crowd UNBOUNDED. Its shelter
    // is not, and that is the decision the readout rests on: an unbounded hall would hold every
    // population the game can produce, so nobody would ever be on the ring while it stood and
    // the ending would stop varying with anything but whether the hall fell.
    expect(Number.isInteger(shelterCapacityOf(TOWN_HALL_ID))).toBe(true);
    expect(shelterCapacityOf(TOWN_HALL_ID)).toBeLessThan(44);
  });
});

describe("the lee WALL a doorway is cut in", () => {
  /** The 2x2 at the origin, so a face's arithmetic is readable. */
  const SQUARE = { nodeId: "NUM.2", col: 0, row: 0, rot: 0 } as const;

  it("crosses the face the bearing points at, with an inward normal and the face's extent", () => {
    // A 2x2 at (0,0) spans 0..8 on both axes, so its centre is (4,4) and each face is 8 long.
    for (const [bearing, at, inward] of [
      [0, { x: 8, z: 4 }, { x: -1, z: 0 }],
      [Math.PI, { x: 0, z: 4 }, { x: 1, z: 0 }],
      [Math.PI / 2, { x: 4, z: 8 }, { x: 0, z: -1 }],
      [-Math.PI / 2, { x: 4, z: 0 }, { x: 0, z: 1 }],
    ] as const) {
      const wall = shelterWall(SQUARE, bearing);
      expect(wall.at.x, `${bearing}`).toBeCloseTo(at.x, 6);
      expect(wall.at.z, `${bearing}`).toBeCloseTo(at.z, 6);
      expect(wall.inward, `${bearing}`).toEqual(inward);
      expect(wall.half, `${bearing}`).toBe(4);
      // The face runs perpendicular to the way in, which is what lets a crowd lay ALONG a wall.
      expect(wall.along.x * wall.inward.x + wall.along.z * wall.inward.z).toBe(0);
    }
  });

  it("rotates with the building, so a quarter-turned plot is not given its unrotated face", () => {
    // The failure this catches is a crowd put through a wall: `transformCenter` already rotates,
    // so half-extents taken from the unrotated footprint would disagree with it. `NUM.F` is 2x1,
    // the island's widest-versus-deepest plot, so the two orientations are tellable apart.
    const flat = shelterWall({ nodeId: "NUM.F", col: 0, row: 0, rot: 0 }, Math.PI / 2);
    const turned = shelterWall({ nodeId: "NUM.F", col: 0, row: 0, rot: 1 }, Math.PI / 2);
    // Unrotated the 2x1 is 8 wide and 4 deep, so the +z face is at z = 4 and is 8 long.
    expect(flat.at.z).toBeCloseTo(4, 6);
    expect(flat.half).toBe(4);
    // A quarter turn swaps them: 4 wide, 8 deep, so the +z face is at z = 8 and is 4 long.
    expect(turned.at.z).toBeCloseTo(8, 6);
    expect(turned.half).toBe(2);
  });

  it("puts the threshold ON the plot boundary, which is where indoors begins", () => {
    // The claim the whole doorway rests on: the crossing point is the plot's own edge, and a
    // plot edge is a CELL edge because footprints are cell-aligned. So a step inward from here
    // lands in a footprint cell — ground `standableTiers` refuses precisely because it is inside
    // a building — and "indoors" is the same rule that kept the fair-weather crowd out of walls.
    for (const bearing of [0, Math.PI / 3, Math.PI, -2]) {
      const wall = shelterWall(SQUARE, bearing);
      const onEdge = Math.abs(wall.at.x % 4) < 1e-9 || Math.abs(wall.at.z % 4) < 1e-9;
      expect(onEdge, `bearing ${bearing} crossed at ${wall.at.x},${wall.at.z}`).toBe(true);
    }
  });
});
