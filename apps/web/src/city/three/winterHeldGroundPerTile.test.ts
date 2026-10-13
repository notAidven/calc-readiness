import {
  createHardWinter,
  HARD_WINTER,
  type HardWinterState,
  hardWinterFirePreview,
  hardWinterIsland,
  hardWinterView,
  WINTER_TIERS,
  type WinterActionTier,
  winterCellKey,
  winterFireWard,
} from "@cr/game";
import { getNode } from "@cr/skill-graph";
import * as THREE from "three";
import { describe, expect, test } from "vitest";

import { liveCityLayoutFrom } from "../../winter/liveCityLayout";
import { CURRENT_ERA_ID } from "../eraDressing";
import { TOWN_HALL_ID } from "../townHall";
import {
  footprintCells,
  footprintFor,
  GRID_CELL,
  NODE_FOOTPRINTS,
  occupiedCells,
  type PlacedTransform,
} from "../worldLayout";
import { skillLabelTargets } from "./SkillLabels";
import { buildWinterGroundGroup, WINTER_TILE_NAMES } from "./WinterGround";
import { FIRE_GHOST_PATCH_NAME } from "./winterFireGhost";

/**
 * **GROUND A FIRE IS HOLDING IS DRAWN PER TILE, AND NOT UNDER A BUILDING.**
 *
 * Two rulings from one QA pass, and they meet each other, so they are held in one file.
 *
 * > *"everything looks good on the first era crisis except the tiles that are protected by fire;
 * > instead of making all the tiles overlap, just make the tiles protected by the real fire look
 * > like it does in the preview, with each tile individually protected as shown in image"*
 *
 * > *"also the fire-protected squares that overlap with buildings look terrible; just make the
 * > fire not show when it overlaps with the building"*
 *
 * ## WHICH MODULE PRODUCED WHICH LOOK, since that is what the diagnosis turned on
 *
 * Neither. `winterFireGhost.ts` owns the one held-ground spec, `winterScene.ts`'s
 * `buildCellTerrain` owns the geometry, and the preview and the committed fire went through both
 * — with the same spec, the same dish, the same facets and the same feather. They diverged on
 * ONE argument, in `WinterGround.tsx`: the cell set each handed the builder as `exposed`, since a
 * feather is only cut on a side where the state ends.
 *
 * The preview was built band by band. A band is the difference of two of `winterWardOffsets`'
 * Euclidean discs, and no two cells of one are orthogonal neighbours — asserted below over every
 * legal fire cell of era one's island — so every previewed cell was exposed on all four sides and
 * rimmed all round. The committed fire was built against the whole warded region at once, so its
 * interior cells had no exposed side, kept their rim vertices where the neighbour would compute
 * them, and merged into the single irregular blob the objection names.
 *
 * So the fix reuses the preview's own geometry rather than writing a third treatment:
 * `buildHeldGroundTile` takes no exposure argument at all, and both surfaces call it.
 *
 * ## WHAT IS ASSERTED HERE, AND WHY EACH ONE CAN FAIL
 *
 *  1. the two surfaces are the SAME VERTEX BUFFER at a given cell, not merely the same spec —
 *     which is the claim "they now match" actually makes;
 *  2. every held tile is rimmed on all four sides, at every reach a fire can have, including
 *     cells with held neighbours on all four sides. A single-cell hold and a thirteen-cell one
 *     are different pictures and both are swept;
 *  3. no held ground on any cell of any building's FOOTPRINT, not merely its anchor;
 *  4. the population that makes (3) safe, in both directions — see below.
 */

const CITY: readonly PlacedTransform[] = [
  { nodeId: "NUM.S", col: -4, row: -3, rot: 0 },
  { nodeId: "NUM.F", col: 2, row: 3, rot: 0 },
  { nodeId: "NUM.2", col: 4, row: -1, rot: 0 },
  { nodeId: "NUM.3", col: -3, row: 2, rot: 0 },
  { nodeId: "NUM.4", col: 1, row: -4, rot: 0 },
  { nodeId: "NUM.5", col: -1, row: 0, rot: 0 },
];
const HALL: PlacedTransform = { nodeId: TOWN_HALL_ID, col: -1, row: -1, rot: 0 };

/** Every ward radius a fire can actually have, weakest first and without the null rung. */
const REACHES: readonly number[] = WINTER_TIERS.map(
  (tier) => HARD_WINTER.fire.radius_by_tier[tier],
).filter((radius): radius is number => radius !== null);

function opening(buildings: readonly PlacedTransform[] = CITY): HardWinterState {
  return createHardWinter({
    era: CURRENT_ERA_ID,
    buildings: buildings.map((p) => ({ node_id: p.nodeId, col: p.col, row: p.row })),
  });
}

/** A board with one burning fire of `radius` at `(col, row)`, and nothing else played. */
function withFire(radius: number, col: number, row: number): HardWinterState {
  return {
    ...opening(),
    round: 2,
    fires: [{ col, row, radius, rounds_left: 2, lit_in_round: 1 }],
  };
}

/** Every mesh of a given name in a built layer, keyed by the cell it stands on. */
function tilesByCell(group: THREE.Group, name: string): Map<string, THREE.Mesh> {
  const found = new Map<string, THREE.Mesh>();
  group.updateMatrixWorld(true);
  group.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh || mesh.name !== name) {
      return;
    }
    found.set(
      winterCellKey(
        Math.round(mesh.position.x / GRID_CELL - 0.5),
        Math.round(mesh.position.z / GRID_CELL - 0.5),
      ),
      mesh,
    );
  });
  return found;
}

/** The narrower of a tile's two plan dimensions. The skirt drops straight, so the box is the plan. */
function planWidth(mesh: THREE.Mesh): number {
  const box = new THREE.Box3().setFromObject(mesh);
  return Math.min(box.max.x - box.min.x, box.max.z - box.min.z);
}

function positionsOf(mesh: THREE.Mesh): Float32Array {
  return (mesh.geometry.getAttribute("position") as THREE.BufferAttribute)
    .array as Float32Array;
}

/* -------------------------------------------------------------------------- */
/* 1. The diagnosis: why the preview already read per tile                     */
/* -------------------------------------------------------------------------- */

describe("a fire's tier bands are orthogonally isolated, which is why the preview read per tile", () => {
  /**
   * The finding the whole change rests on, measured over the real population rather than argued
   * from the offsets: for every cell of era one's island a fire can legally be lit on, and for
   * every tier band of the preview at that cell, no two cells of the band touch on a side.
   *
   * That is why `exposureOf` returned all-four-sides-exposed for every previewed cell, which is
   * why the preview was already the per-tile picture the lead is pointing at — and it is the
   * reason the fix could be "use the preview's geometry" rather than "invent a third treatment".
   */
  test("no two cells of one band are orthogonal neighbours, on any legal fire cell", () => {
    const island = hardWinterIsland(CURRENT_ERA_ID);
    const state = opening();
    let cellsChecked = 0;
    let bandsChecked = 0;
    let multiCellBands = 0;
    for (const key of island.cells) {
      const [col, row] = key.split(",").map(Number) as [number, number];
      const preview = hardWinterFirePreview(state, { col, row });
      expect(preview.legal, `${key} is on the island and refuses a fire`).toBe(true);
      cellsChecked += 1;

      const bands = new Map<WinterActionTier, Set<string>>();
      for (const [cellKey, tier] of preview.tier_by_cell) {
        const band = bands.get(tier) ?? new Set<string>();
        band.add(cellKey);
        bands.set(tier, band);
      }
      for (const [tier, band] of bands) {
        bandsChecked += 1;
        if (band.size > 1) {
          multiCellBands += 1;
        }
        for (const member of band) {
          const [c, r] = member.split(",").map(Number) as [number, number];
          for (const [dc, dr] of [
            [1, 0],
            [-1, 0],
            [0, 1],
            [0, -1],
          ] as const) {
            expect(
              band.has(winterCellKey(c + dc, r + dr)),
              `a fire at ${key} has ${member} and ${winterCellKey(c + dc, r + dr)} in the same ` +
                `${tier} band, sharing a side — so that band would MERGE rather than draw per tile`,
            ).toBe(false);
          }
        }
      }
    }
    // Floors, and a composition assertion beside them: "no two cells touch" is trivially true of
    // bands that all hold one cell, and the weak band always does. So the sweep has to have seen
    // plenty of bands with SEVERAL cells in them, which are the ones the claim is about.
    expect(cellsChecked, "the island came back empty").toBe(88);
    expect(bandsChecked).toBeGreaterThan(cellsChecked * 2);
    expect(
      multiCellBands,
      "every band swept held a single cell, so the isolation claim measured nothing",
    ).toBeGreaterThan(cellsChecked);
  });
});

/* -------------------------------------------------------------------------- */
/* 2. The promise and the fact are one geometry                               */
/* -------------------------------------------------------------------------- */

describe("the committed fire is the preview's own tile", () => {
  /**
   * **THE CLAIM "THEY NOW MATCH", AS A CLAIM ABOUT VERTEX BUFFERS.**
   *
   * Sharing `WARDED_TERRAIN` was never enough — the two surfaces shared every value in it and
   * still drew different pictures, because the rim is decided by an argument the spec does not
   * carry. So the assertion is over the built geometry: at a given cell, the committed tile's
   * positions and the ghost patch's are the same numbers.
   */
  test.each(REACHES)(
    "at reach %s, every held cell's tile is the ghost patch's geometry",
    (radius) => {
      const at = { col: -1, row: 0 };
      const held = winterFireWard(withFire(radius, at.col, at.row), {
        col: at.col,
        row: at.row,
        radius,
        rounds_left: 2,
        lit_in_round: 1,
      });
      // The committed board and the PREVIEW board are built separately, because they are two
      // states of one cell and no board carries both — which is exactly why they could drift.
      const committed = tilesByCell(
        buildWinterGroundGroup(hardWinterView(withFire(radius, at.col, at.row)).rows, [], {
          weather: false,
        }),
        WINTER_TILE_NAMES.warded,
      );
      const previewed = tilesByCell(
        buildWinterGroundGroup(hardWinterView(opening(), { fire_preview: at }).rows, [], {
          weather: false,
        }),
        FIRE_GHOST_PATCH_NAME,
      );

      // Floors on both, so "every one matches" cannot hold over an empty intersection.
      expect(committed.size, `no held ground at reach ${radius}`).toBe(held.length);
      expect(committed.size).toBeGreaterThan(0);
      expect(previewed.size, "the preview drew nothing").toBeGreaterThan(0);

      let compared = 0;
      for (const [key, tile] of committed) {
        const ghost = previewed.get(key);
        expect(ghost, `${key} is held but the preview draws no patch on it`).toBeDefined();
        expect(
          Array.from(positionsOf(tile)),
          `${key}: the committed tile and the preview's patch are different geometry`,
        ).toEqual(Array.from(positionsOf(ghost as THREE.Mesh)));
        compared += 1;
      }
      expect(compared).toBe(committed.size);
    },
  );

  /**
   * **AND EVERY TILE IS RIMMED ON ALL FOUR SIDES, AT EVERY REACH.**
   *
   * A fire's reach grows with accuracy, so the held set varies in size and shape: a single cell,
   * a five-cell cross, a thirteen-cell diamond. All three are swept, because a lone cell was
   * always rimmed and the defect only ever showed where two held cells touched.
   */
  test.each(REACHES)("at reach %s, every held tile keeps its own rim", (radius) => {
    const at = { col: -1, row: 0 };
    const tiles = tilesByCell(
      buildWinterGroundGroup(hardWinterView(withFire(radius, at.col, at.row)).rows, [], {
        weather: false,
      }),
      WINTER_TILE_NAMES.warded,
    );
    expect(tiles.size).toBeGreaterThan(0);
    for (const [key, tile] of tiles) {
      expect(
        planWidth(tile),
        `${key} runs the full cell, so it merges with the tile beside it`,
      ).toBeLessThan(GRID_CELL);
      // The trade the old bounded feather protected, kept: a rim on four sides is four chances
      // to eat the extent, so no cell may lose more than a quarter of its plan.
      expect(planWidth(tile)).toBeGreaterThan(GRID_CELL * 0.75);
    }
  });

  /**
   * **THE COMPOSITION: the widest reach really does hold cells surrounded on all four sides.**
   *
   * "Every tile is rimmed" is satisfied by a board whose tiles never touch, and at reach 0 that
   * is exactly the board. So the sweep above is only load-bearing if some cell it walked had a
   * held neighbour on every side — which is the interior cell the overturned assertion in
   * `winterGround.test.ts` used to require to be full width.
   */
  test("the widest reach holds a cell with held ground on all four sides", () => {
    const at = { col: -1, row: 0 };
    const widest = Math.max(...REACHES);
    const held = new Set(
      winterFireWard(withFire(widest, at.col, at.row), {
        col: at.col,
        row: at.row,
        radius: widest,
        rounds_left: 2,
        lit_in_round: 1,
      }),
    );
    const surrounded = [...held].filter((key) => {
      const [col, row] = key.split(",").map(Number) as [number, number];
      return (
        held.has(winterCellKey(col + 1, row)) &&
        held.has(winterCellKey(col - 1, row)) &&
        held.has(winterCellKey(col, row + 1)) &&
        held.has(winterCellKey(col, row - 1))
      );
    });
    expect(
      surrounded.length,
      "no held cell has held ground on all four sides, so nothing could have merged",
    ).toBeGreaterThan(0);
    // ...and it is rimmed, which is the instance rather than the class.
    const tiles = tilesByCell(
      buildWinterGroundGroup(hardWinterView(withFire(widest, at.col, at.row)).rows, [], {
        weather: false,
      }),
      WINTER_TILE_NAMES.warded,
    );
    for (const key of surrounded) {
      const tile = tiles.get(key);
      expect(tile, `${key} is held and draws no tile`).toBeDefined();
      expect(planWidth(tile as THREE.Mesh)).toBeLessThan(GRID_CELL);
    }
  });
});

/* -------------------------------------------------------------------------- */
/* 3. No held ground under a building                                         */
/* -------------------------------------------------------------------------- */

describe("held ground is not drawn under a building", () => {
  /**
   * A fire big enough to reach a building, lit ON one, so the sweep has both the anchor cell and
   * the rest of the footprint under held ground. `NUM.5` is a 2x2 at `(-1, 0)` and the hall a 3x2
   * at `(-1, -1)`, so a strong fire at `(-1, 0)` covers cells of both.
   */
  const widest = Math.max(...REACHES);
  const at = { col: -1, row: 0 };

  function board(preview: boolean): {
    group: THREE.Group;
    buildingCells: Set<string>;
    held: Set<string>;
  } {
    const placements = [...CITY, HALL];
    const buildingCells = occupiedCells(placements);
    const state = preview ? opening() : withFire(widest, at.col, at.row);
    const rows = preview
      ? hardWinterView(state, { fire_preview: at }).rows
      : hardWinterView(state).rows;
    const held = new Set(
      rows
        .flat()
        .filter((cell) => (preview ? cell.preview_tier !== null : cell.warded))
        .map((cell) => winterCellKey(cell.col, cell.row)),
    );
    return {
      group: buildWinterGroundGroup(rows, [], { weather: false, buildingCells }),
      buildingCells,
      held,
    };
  }

  test.each([
    ["the committed fire", false, WINTER_TILE_NAMES.warded],
    ["the preview", true, FIRE_GHOST_PATCH_NAME],
  ] as const)("%s draws no tile on a building's cell", (_label, preview, name) => {
    const { group, buildingCells, held } = board(preview);
    const drawn = tilesByCell(group, name);

    // The premise: this fire really does cover building ground, or the sweep proves nothing.
    const covered = [...held].filter((key) => buildingCells.has(key));
    expect(
      covered.length,
      "the fire reaches no building cell, so there was nothing to omit",
    ).toBeGreaterThan(2);
    // ...and MORE THAN ONE CELL of at least one footprint, which is the second edge case: the
    // winter models a building as its anchor cell only, so a rule derived from the rows would
    // clear one corner of a 2x2 and leave tan under the other three.
    const perBuilding = [...CITY, HALL].map((placement) => ({
      nodeId: placement.nodeId,
      hit: footprintCells(placement, footprintFor(placement.nodeId)).filter((key) =>
        held.has(key),
      ),
    }));
    expect(
      perBuilding.filter((b) => b.hit.length > 1).length,
      `no footprint has more than one cell under held ground: ${JSON.stringify(perBuilding)}`,
    ).toBeGreaterThan(0);

    // THE CLAIM, in both directions.
    for (const key of covered) {
      expect(drawn.has(key), `${key} is a building's cell and wears held ground`).toBe(
        false,
      );
    }
    const clear = [...held].filter((key) => !buildingCells.has(key));
    expect(clear.length, "the fire holds nothing away from a building").toBeGreaterThan(2);
    for (const key of clear) {
      expect(
        drawn.has(key),
        `${key} is held, is under no building, and draws nothing — the filter is too wide`,
      ).toBe(true);
    }
    expect(drawn.size).toBe(clear.length);
  });

  /**
   * **THE SET IS THE FOOTPRINT, AND THAT IS ONLY A CLAIM IF THE TWO SETS COME APART.**
   *
   * The winter models a building as its ANCHOR cell — `liveCityLayout.ts` says so in as many
   * words — so the anchor is the derivation this would most plausibly have got. Handed an
   * anchor-only set, the layer draws tan on the rest of every footprint, which is the same defect
   * in a smaller and more confusing form: one clear corner under a 2x2 and three tan ones.
   *
   * Asserted rather than commented, so "the caller passes footprints" is a difference somebody
   * can see. `CityScene` passes `occupiedCells`, which is `footprintCells` per placement.
   */
  test("an anchor-only set would leave tan under the rest of a footprint", () => {
    const placements = [...CITY, HALL];
    const rows = hardWinterView(withFire(widest, at.col, at.row)).rows;
    const held = new Set(
      rows
        .flat()
        .filter((cell) => cell.warded)
        .map((cell) => winterCellKey(cell.col, cell.row)),
    );
    const anchors = new Set(placements.map((p) => winterCellKey(p.col, p.row)));
    const footprints = occupiedCells(placements);

    // The premise: some footprint has a NON-anchor cell under this fire, or the two sets are the
    // same here and nothing below distinguishes them.
    const beyondTheAnchor = [...held].filter(
      (key) => footprints.has(key) && !anchors.has(key),
    );
    expect(
      beyondTheAnchor,
      "no held cell is a footprint cell that is not an anchor, so the two derivations agree here",
    ).not.toEqual([]);

    const drawn = tilesByCell(
      buildWinterGroundGroup(rows, [], { weather: false, buildingCells: anchors }),
      WINTER_TILE_NAMES.warded,
    );
    for (const key of beyondTheAnchor) {
      expect(
        drawn.has(key),
        `${key} belongs to a footprint, and an anchor-only set was expected to leave it drawn`,
      ).toBe(true);
    }
    // ...and the footprint set clears exactly those, which is the difference the product buys.
    const withFootprints = tilesByCell(
      buildWinterGroundGroup(rows, [], { weather: false, buildingCells: footprints }),
      WINTER_TILE_NAMES.warded,
    );
    expect(drawn.size - withFootprints.size).toBe(beyondTheAnchor.length);
  });

  /** With no building set at all, nothing is omitted. The default may not quietly filter. */
  test("omits nothing when the caller names no buildings", () => {
    const rows = hardWinterView(withFire(widest, at.col, at.row)).rows;
    const held = rows.flat().filter((cell) => cell.warded).length;
    const drawn = tilesByCell(
      buildWinterGroundGroup(rows, [], { weather: false }),
      WINTER_TILE_NAMES.warded,
    );
    expect(held).toBeGreaterThan(8);
    expect(drawn.size).toBe(held);
  });
});

/* -------------------------------------------------------------------------- */
/* 4. What makes omitting it safe                                             */
/* -------------------------------------------------------------------------- */

/**
 * **THE GROUND MAY GO BECAUSE THE CAPTION SAYS IT — FOR EVERY BUILDING THE WINTER MODELS.**
 *
 * #502 made a building's floating caption its crisis status, so a building a fire is holding
 * reads SAFE or SHIELDED and can never read IN DANGER (`winterThreatenedNodeIds` folds a warded
 * cell into not-threatened). That is the fact the ground under it was the third channel for.
 *
 * **The civic exception is now one-directional, not two.** A bought CIVIC building is drawn on
 * the island and DOES gain a caption (2026-08-22: "add name tags to the civic buildings like the
 * skill buildings do? but smaller") — its own name, in `SkillLabels`' smaller `civic` style — but
 * it still never joins the winter board: `liveCityLayoutFrom` reads `placements` and `town_hall`
 * and nothing else, so there is no protection fact about it for this ground to have been
 * carrying regardless of whether it is captioned. So the caption population is now the board's
 * PLUS the civic exception, not exactly the board's.
 *
 * Both directions still matter for the board itself: a building on the winter board that stops
 * being captioned fails, and the civic building joining the board (rather than merely gaining a
 * caption) also fails.
 */
describe("what makes omitting the ground safe", () => {
  const CIVIC: PlacedTransform = { nodeId: "civic:longhouse:1", col: 3, row: 3, rot: 0 };

  test("every building the winter board models is captioned, and the civic one is named but never on the board", () => {
    const placements = [...CITY, HALL, CIVIC];
    const crisis = {
      ruinedNodeIds: new Set<string>(),
      shieldedNodeIds: new Set<string>(),
      threatenedNodeIds: new Set<string>(),
    };
    const captioned = new Set(
      skillLabelTargets(placements, crisis).map((target) => target.nodeId),
    );

    // The board the live city hands the engine, built the way the surface builds it.
    const live = liveCityLayoutFrom({
      placements: CITY,
      town_hall: HALL,
    });
    if (live.status !== "ready") {
      throw new Error(`the live city refused a board: ${live.reason}`);
    }
    const onTheBoard = new Set(live.layout.buildings.map((b) => b.node_id));

    // Floors first: neither set may be empty, or the equalities below hold vacuously.
    expect(onTheBoard.size).toBe(CITY.length + 1);
    expect(captioned.size).toBeGreaterThan(CITY.length);

    // FORWARD: everything the winter can protect says so in words.
    expect([...onTheBoard].sort()).toEqual(
      [...onTheBoard].filter((id) => captioned.has(id)).sort(),
    );
    // BACKWARD, MINUS THE NAMED CIVIC EXCEPTION: the caption population is exactly the board's
    // plus the civic building's own name tag, so a caption cannot start promising something
    // about a building the engine never sees for any OTHER reason.
    expect([...captioned].filter((id) => id !== CIVIC.nodeId).sort()).toEqual(
      [...onTheBoard].sort(),
    );

    // THE NAMED EXCEPTION, now failing only the one direction that still matters: the civic
    // building is drawn on the island (`scenePlaced` concatenates the civic placements) and
    // captioned with its own name, but it never joins the winter board — the day it does, this
    // goes red.
    expect(
      getNode(CIVIC.nodeId),
      "a civic placement joined the skill graph",
    ).toBeUndefined();
    expect(captioned.has(CIVIC.nodeId), "the civic building gained a caption").toBe(true);
    expect(onTheBoard.has(CIVIC.nodeId), "the civic building joined the winter board").toBe(
      false,
    );
    // ...and it really is a placement the renderer would draw, with a real footprint, rather
    // than an id this test invented that nothing could ever place.
    expect(footprintFor(CIVIC.nodeId).w).toBeGreaterThan(0);
  });

  /**
   * AND A BUILDING ON HELD GROUND READS SAFE OR SHIELDED, NEVER IN DANGER — which is the
   * specific caption the removed ground is standing in for. Read off a real board.
   */
  test("a building a fire is holding is captioned SAFE, on a board the engine produced", () => {
    const island = hardWinterIsland(CURRENT_ERA_ID);
    const widest = Math.max(...REACHES);
    // Everything the frost could take, taken, so the caption has every reason to say IN DANGER
    // except the fire. `NUM.5` stands at the fire's own cell.
    const state: HardWinterState = {
      ...opening(),
      round: 2,
      frozen: island.cells.filter((key) => (island.rim_depth.get(key) as number) <= 1),
      fires: [{ col: -1, row: 0, radius: widest, rounds_left: 2, lit_in_round: 1 }],
    };
    const rows = hardWinterView(state).rows;
    const held = new Set(
      rows
        .flat()
        .filter((cell) => cell.warded)
        .map((cell) => winterCellKey(cell.col, cell.row)),
    );
    const threatened = new Set<string>();
    for (const line of rows) {
      for (const cell of line) {
        if (
          cell.building?.state === "standing" &&
          (cell.frozen || cell.frost_next) &&
          !cell.warded
        ) {
          threatened.add(cell.building.node_id);
        }
      }
    }
    const captions = new Map(
      skillLabelTargets([...CITY, HALL], {
        ruinedNodeIds: new Set<string>(),
        shieldedNodeIds: new Set<string>(),
        threatenedNodeIds: threatened,
      }).map((target) => [target.nodeId, target.text] as const),
    );

    // The premise: some building really is standing on ground this fire holds, and some other
    // building really is in danger — so SAFE is a reading and not the only word on the board.
    const onHeldGround = [...CITY, HALL].filter((placement) =>
      footprintCells(placement, footprintFor(placement.nodeId)).some((key) =>
        held.has(key),
      ),
    );
    expect(
      onHeldGround.map((p) => p.nodeId),
      "no building stands on held ground, so this proves nothing",
    ).not.toEqual([]);
    expect(threatened.size, "nothing is in danger, so SAFE is unopposed").toBeGreaterThan(
      0,
    );

    for (const placement of onHeldGround) {
      expect(
        captions.get(placement.nodeId),
        `${placement.nodeId} stands on ground a fire holds and is captioned ` +
          `${captions.get(placement.nodeId)}`,
      ).toBe("SAFE");
    }
  });
});

/* -------------------------------------------------------------------------- */
/* 5. The footprint shapes this has to survive                                */
/* -------------------------------------------------------------------------- */

test("era one really does ship footprints wider than one cell", () => {
  // The second edge case is only an edge case if multi-cell footprints exist. Derived from the
  // table rather than written down, so a re-shaped building brings itself here.
  const shapes = Object.values(NODE_FOOTPRINTS);
  expect(shapes.length).toBeGreaterThanOrEqual(7);
  expect(
    shapes.filter((fp) => fp.w * fp.d > 1).length,
    "every footprint is a single cell, so omitting the anchor would have been enough",
  ).toBeGreaterThanOrEqual(6);
  // And the hub is the largest of them, which is the worst case for a partial omission.
  const hub = footprintFor(TOWN_HALL_ID);
  expect(hub.w * hub.d).toBeGreaterThanOrEqual(6);
});
