import {
  createHardWinter,
  type HardWinterState,
  hardWinterReducer,
  hardWinterView,
  WINTER_FIRE_STATES,
  type WinterAction,
  type WinterActionTier,
  type WinterCellView,
  type WinterFire,
  winterFireState,
} from "@cr/game";
import * as THREE from "three";
import { describe, expect, it } from "vitest";

import { CURRENT_ERA_ID } from "../eraDressing";
import {
  BUILDABLE_RADIUS,
  cellCenter,
  GRID_CELL,
  ISLAND_GRASS_RADIUS,
  SEA_RADIUS,
} from "../worldLayout";
import { roadStackTop } from "./Roads";
import {
  buildWinterGroundGroup,
  FIRE_GHOST_HEARTH_NAME,
  SLAB_THICK,
  snowCourseBase,
  snowCourseCrest,
  WINTER_GROUND_TONES,
  WINTER_TILE_NAMES,
  winterCourseTop,
} from "./WinterGround";
import {
  FLAME_MESH_NAME,
  HEARTH_NAME,
  SMOKE_COLUMN_NAME,
  SMOKE_WISP_NAME,
} from "./winterFire";
import { GHOST_OPACITY, WARDED_TERRAIN } from "./winterFireGhost";
import { FROST_FRONT_REACH_NAME, FROST_FRONT_WALL_NAME } from "./winterFrostFront";
import {
  COLD_WATER_NAME,
  FROST_MARGIN_NAME,
  ICE_SHEET_NAME,
  PATH_NAME,
  PATH_SHOULDER_NAME,
  SHOVE_ICE_NAME,
  SNOW_COURSE_NAME,
} from "./winterScene";
import { WINTER_SCENE_TONES } from "./winterTones";

/**
 * **THE CRISIS, AS IT REACHES THE CANVAS.**
 *
 * `WinterGround.tsx` has claimed since it was written that "`winterGround.test.ts` sweeps
 * this table and the built meshes" for reserved mastery gold. There was no such file, so the
 * sweep it promised covered nothing — which is the reason this one leads with that assertion
 * and does it over the RENDERED materials rather than over the token table alone.
 *
 * What is pinned here is everything the winter needs the island to say, and nothing about how
 * pretty it says it:
 *
 *  - every ground state the engine projects gets a tile, and the population is derived from
 *    {@link WINTER_TILE_NAMES} rather than written out, so a state added to the renderer
 *    without a rung fails here;
 *  - the states stack rather than replace, on distinct rungs, because a cell can be frozen AND
 *    warded AND under a preview at once;
 *  - the whole layer sits above the road stack, because frost falls on paved cells too;
 *  - it reads by geometry and tone and never by light: no light, no emissive, flat shading;
 *  - mastery gold `#FFB703` appears nowhere on it.
 *
 * ## Why the rows come from the engine and not from a literal
 *
 * A hand-written row is a renderer test that has stopped being about the winter: it can go on
 * passing over a view model the engine no longer produces. `hardWinterView` is cheap and pure,
 * so the sweeps below run over the projection the product actually hands this layer.
 */

/** Mastery gold, reserved and never a body colour anywhere in the city. */
const MASTERY_GOLD = 0xffb703;

/** The states this layer draws, derived from the renderer's own name table. */
const TILE_NAMES = Object.values(WINTER_TILE_NAMES);

/**
 * **THE TWO NAMES IN THAT TABLE THAT ARE NOT ONE-PER-CELL, EACH WITH ITS REASON.**
 *
 * The sweeps below put every state on ONE cell and expect one tile each, which is the right
 * instrument for a state drawn as ground lying in its cell and the wrong one for a mark that
 * stands somewhere else. Two marks are somewhere else, and they are named rather than quietly
 * left out — an exclusion that hides a state which stopped drawing is the failure this list is
 * shaped to prevent, so every entry is asserted PRESENT wherever it is excused from a count:
 *
 *  - **the fire** stands where it was declared, from `state.fires`, and is not in the rows at
 *    all;
 *  - **the front** stands on the ring of ice OUTSIDE the ground the round takes, since
 *    2026-08-03 (`frostFrontMarks`, and the lead's *"it needs to start one layer out"*). A
 *    one-cell board therefore draws one mark per off-board neighbour, not one mark.
 */
const NOT_PER_CELL: readonly string[] = [
  WINTER_TILE_NAMES.fire,
  WINTER_TILE_NAMES.frostNext,
];
const PER_CELL_TILE_NAMES = TILE_NAMES.filter((name) => !NOT_PER_CELL.includes(name));

function cell(overrides: Partial<WinterCellView> = {}): WinterCellView {
  return {
    col: 0,
    row: 0,
    land: true,
    rim_depth: 0,
    frozen: false,
    warded: false,
    frost_line: false,
    frost_next: false,
    building: null,
    damage_stage: 0,
    preview_tier: null,
    ...overrides,
  };
}

/** Every ground state at once, on one cell. */
function everyStateCell(overrides: Partial<WinterCellView> = {}): WinterCellView {
  return cell({
    frozen: true,
    frost_line: true,
    frost_next: true,
    warded: true,
    preview_tier: "strong",
    ...overrides,
  });
}

/**
 * **EVERY GROUND STATE AT ONCE, OVER THE SMALLEST BOARD THAT CAN HONESTLY CARRY THEM — and it is
 * TWO cells since 2026-08-03, not one.**
 *
 * `frost_line` is not a state a cell holds beside `frozen`; the engine defines it as a refinement
 * of it (*"frozen with an unfrozen land neighbour"*), and the renderer now draws ONE fill on such
 * a cell rather than stacking a sheet under a line that covers it — the extra layer the lead
 * reported as *"random interior weird icicles"*. So a one-cell fixture asking for a sheet AND a
 * line asks for a picture the layer is right to refuse, and the sweeps that used one were
 * measuring a board the engine cannot hand them.
 *
 * The sheet and the line therefore get a cell each. Everything that genuinely IS simultaneous —
 * frozen ground a fire is holding, under a preview, with the round reaching for it — stays
 * stacked on the first cell, which is what those sweeps are about.
 */
function everyStateRows(
  overrides: Partial<WinterCellView> = {},
): readonly (readonly WinterCellView[])[] {
  return [
    [
      cell({
        col: 0,
        row: 0,
        frozen: true,
        frost_next: true,
        warded: true,
        preview_tier: "strong",
        ...overrides,
      }),
      // The line gets a cell of its own and NOT the overrides: a caller asking for a preview
      // or for water means one cell in that state, not two.
      cell({ col: 1, row: 0, frozen: true, frost_line: true }),
    ],
  ];
}

function fire(overrides: Partial<WinterFire> = {}): WinterFire {
  return { col: 0, row: 0, radius: 2, rounds_left: 2, lit_in_round: 1, ...overrides };
}

/**
 * **ONE HEARTH IN EVERY STATE THE ENGINE CAN HAND THIS LAYER**, which is the population every
 * sweep below runs over.
 *
 * It was `[fire(), fire({ radius: null })]` — the only two states that existed while the engine
 * DELETED a fire the round its fuel ran out. A spent hearth is a state now (`WinterFire` in
 * `hard-winter.ts`), and a sweep whose population predates it would report green over a hearth it
 * had never drawn, which is how the emissive, flat-shading, metalness, light and reserved-tone
 * guards would all have missed a whole new asset at once.
 *
 * The census below is a SET EQUALITY against the engine's own list rather than a count, so it
 * fails whichever way the two come apart: a state added to the union with no fixture here, and a
 * fixture here that has stopped being the state it was written for.
 */
const EVERY_FIRE_STATE: readonly WinterFire[] = [
  fire({ col: 0, row: 0 }),
  fire({ col: 2, row: 1, radius: null }),
  fire({ col: -2, row: 2, rounds_left: 0 }),
];

function named(group: THREE.Object3D, name: string): THREE.Object3D[] {
  const found: THREE.Object3D[] = [];
  group.traverse((child) => {
    if (child.name === name) {
      found.push(child);
    }
  });
  return found;
}

/**
 * The state fills, derived from what the renderer BUILT rather than from a written-down list:
 * a fill is a tile name that came back as a `Mesh`, which the four terrain states are and the
 * two provisional outlines and the fire (both `Group`s) are not.
 *
 * Derived this way so a fifth ground state joins every sweep below the moment it is drawn.
 */
function fillTiles(
  group: THREE.Object3D,
): { readonly name: string; readonly mesh: THREE.Mesh }[] {
  const found: { name: string; mesh: THREE.Mesh }[] = [];
  for (const name of TILE_NAMES) {
    for (const object of named(group, name)) {
      if ((object as THREE.Mesh).isMesh) {
        found.push({ name, mesh: object as THREE.Mesh });
      }
    }
  }
  return found;
}

/**
 * Every world-space Y on a tile's VISIBLE surface, with the bedded skirt excluded.
 *
 * A tile is terrain now: its top dishes below its rung and its skirt runs down to `SLAB_THICK`
 * to bed it in. The claims below are about the surface a player sees, so the skirt is dropped
 * by height — anything within half the bed depth of the floor is skirt.
 */
function surfaceY(mesh: THREE.Mesh): number[] {
  const position = mesh.geometry.getAttribute("position") as THREE.BufferAttribute;
  const ys: number[] = [];
  for (let i = 0; i < position.count; i += 1) {
    const y = position.getY(i);
    if (y > -SLAB_THICK / 2) {
      ys.push(mesh.position.y + y);
    }
  }
  return ys;
}

/** The distinct per-face value multipliers on a tile's top surface, as a sorted list. */
function faceValues(mesh: THREE.Mesh): number[] {
  const color = mesh.geometry.getAttribute("color") as THREE.BufferAttribute;
  const seen = new Set<string>();
  for (let i = 0; i < color.count; i += 1) {
    seen.add(color.getX(i).toFixed(4));
  }
  return [...seen].map(Number).sort((a, b) => a - b);
}

/** Relative luminance of an sRGB hex, for "these states differ by value and not only by hue". */
function luminance(hex: number): number {
  const c = new THREE.Color(hex);
  return 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
}

function materialsOf(object: THREE.Object3D): THREE.MeshStandardMaterial[] {
  const found: THREE.MeshStandardMaterial[] = [];
  object.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh) {
      return;
    }
    for (const m of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
      found.push(m as THREE.MeshStandardMaterial);
    }
  });
  return found;
}

/**
 * One live winter, projected the way the city projects it — SEVERAL ROUNDS IN, so the board
 * actually carries frost, a frost line, held ground and a scar.
 *
 * **THE ROUNDS ARE THE LOAD-BEARING PART, and their absence was a real defect in this file.**
 * As it shipped, this helper projected a winter at round one, where nothing has frozen yet: the
 * board it handed the sweeps below had 0 frozen cells, 0 frost-line cells, 0 warded and 0
 * abandoned, and 41 provisional preview outlines. So the sweep named "no emissive anywhere in
 * the layer" cleared its floor of 20 materials entirely on preview outlines and never looked at
 * a single one of the four GROUND FILLS it exists to check — measured, at the tip, by making
 * exactly one ground tone emissive and watching all 24 assertions stay green.
 *
 * The rounds are played through the shipped reducer rather than a re-implementation of what a
 * round does, and the composition of the result is asserted below rather than assumed.
 */
function liveRows(): readonly (readonly WinterCellView[])[] {
  return liveWinter().rows;
}

function liveWinter(): { rows: readonly (readonly WinterCellView[])[] } {
  let winter = createHardWinter({
    era: CURRENT_ERA_ID,
    buildings: [
      { node_id: "NUM.S", col: 0, row: 0 },
      { node_id: "NUM.F", col: 2, row: -2 },
    ],
  });
  /*
   * Two rounds of holding one spot, which is every round but the last.
   *
   * **IT WAS FOUR ROUNDS WITH A PULL-BACK IN THE MIDDLE**, and the ORDER mattered: a fire burns
   * down in a round, so a pull-back played last left nothing warded, and playing the fire last is
   * what put all four fills on the board at once. Measured then: 74 frozen, 13 frost-line, 13
   * warded, 28 abandoned, and both previews. The lead ruled the give-up-ground action out on
   * 2026-08-02, so there are THREE ground fills and one provisional preview, and the composition
   * of what is left is asserted below rather than described here.
   *
   * **THE LENGTH MATTERS TOO, and the guard below is what says so.** The fixture has to stop
   * short of the last round, because a three-round winter left mid-encounter is the only state an
   * ICE FRONT is drawn in: `hardWinterView` skips the advance in the `ended` phase, deliberately,
   * because a front there would threaten ground with a frost that is over. When `HARD_WINTER.rounds`
   * was briefly ruled to 4 on 2026-08-01 this fixture played the whole winter and
   * `winter-frost-front` read zero, which is how the length was caught rather than assumed. It is
   * derived from the constant below rather than counted out, for that reason.
   */
  winter = playRound(winter, { kind: "fire", col: 1, row: 0 });
  winter = playRound(winter, { kind: "fire", col: 1, row: 0 });
  if (winter.phase === "ended") {
    throw new Error(
      "the fixture played the whole winter, so there is no ice front left to draw",
    );
  }
  return hardWinterView(winter, { fire_preview: { col: 1, row: 0 } });
}

/** Declare, resolve at full marks, and close the round — one whole round of the real reducer. */
function playRound(winter: HardWinterState, action: WinterAction): HardWinterState {
  let next = hardWinterReducer(winter, { type: "declare", action });
  next = hardWinterReducer(next, { type: "resolve", correct: 3, asked: 3 });
  return hardWinterReducer(next, { type: "end_round" });
}

describe("the winter draws every state the engine projects", () => {
  it("sweeps a derived population, not a written-down one", () => {
    // A floor, because every sweep below iterates this list and a shortened one would pass by
    // not looking. THREE ground fills, the frost front, one provisional outline, and the fire —
    // it was four fills and two outlines until 2026-08-02, when the give-up-ground action was ruled
    // out and took `abandoned` and `previewAbandon` with it.
    expect(TILE_NAMES.length).toBeGreaterThanOrEqual(6);
    expect(new Set(TILE_NAMES).size).toBe(TILE_NAMES.length);
  });

  it("gives every named state a tile when the cell is in that state", () => {
    // ONE cell carrying every ground state at once, plus one fire. If a state exists in the
    // name table and nothing draws it, it is missing from this group and the sweep fails —
    // which is the failure a renderer that grew a state and forgot a rung produces.
    const group = buildWinterGroundGroup(everyStateRows({ preview_tier: "steady" }), [
      fire(),
    ]);
    for (const name of PER_CELL_TILE_NAMES) {
      expect(named(group, name), name).toHaveLength(1);
    }
    // ...and the two that are NOT one-per-cell are still drawn, so excusing them from the count
    // above cannot be how one of them stops being drawn at all. See `NOT_PER_CELL`.
    for (const name of NOT_PER_CELL) {
      expect(
        named(group, name).length,
        `${name} is excused the per-cell count and is absent`,
      ).toBeGreaterThan(0);
    }
  });

  it("draws nothing at all on a board with no states on it", () => {
    const group = buildWinterGroundGroup([[cell()]], []);
    for (const name of TILE_NAMES) {
      expect(named(group, name), name).toHaveLength(0);
    }
  });

  it("skips water, so the crisis is never painted where nobody can act", () => {
    // The claim is about the BOARD: no frost tile, no scar and no preview may land on the
    // lagoon, because that would put the crisis somewhere the player cannot act. It is not
    // about the weather, which genuinely does reach the water — the frozen lagoon is an asset
    // and freezing over is not something the player is being asked to answer.
    const wet = everyStateCell({ land: false });
    expect(buildWinterGroundGroup([[wet]], [], { weather: false }).children).toHaveLength(
      0,
    );
    // ...and with the weather on, the board half is still empty over that cell.
    const dressed = buildWinterGroundGroup([[wet]], []);
    for (const name of TILE_NAMES) {
      expect(named(dressed, name), name).toHaveLength(0);
    }
    // A floor, so "the board is empty" is not being satisfied by an empty layer: the weather
    // put a real scene on the island beside it.
    expect(materialsOf(dressed).length).toBeGreaterThanOrEqual(20);
  });

  it("centres each tile on its own cell rather than on the raw grid index", () => {
    // Cell centres are half a cell off the index, so a tile placed at the index straddles
    // four cells — visible as frost that does not line up with the roads beside it.
    const group = buildWinterGroundGroup([[cell({ col: 3, row: -2, frozen: true })]], []);
    const tile = named(group, WINTER_TILE_NAMES.frozen)[0];
    const want = cellCenter(3, -2);
    expect(tile?.position.x).toBeCloseTo(want.x, 6);
    expect(tile?.position.z).toBeCloseTo(want.z, 6);
  });

  it("stacks the states instead of replacing them, each on its own rung", () => {
    // A cell can be frozen AND warded AND previewed at once, and two coplanar
    // slabs z-fight into a flicker at the fixed camera. Every state therefore owes a distinct
    // height on the one shared ladder.
    const group = buildWinterGroundGroup(everyStateRows(), [], { weather: false });
    // Derived from the renderer's own state table rather than written down, so a state added
    // without a rung of its own fails here instead of quietly sharing one. The two names that
    // are not one-per-cell are excluded by `NOT_PER_CELL`, which states why for each — and the
    // front, which is one of them, is measured for its rung separately below rather than
    // dropped: it stands off the cell, so it has as many children as the cell has open sides.
    const perCell = group.children.filter(
      (child) => child.name !== WINTER_TILE_NAMES.frostNext,
    );
    const ys = perCell.map((child) => child.position.y);
    expect(ys).toHaveLength(PER_CELL_TILE_NAMES.length);
    expect(new Set(ys.map((y) => y.toFixed(6))).size).toBe(ys.length);
    // THE FRONT SHARES NO RUNG EITHER, which is the half the exclusion above could have lost.
    const frontYs = named(group, WINTER_TILE_NAMES.frostNext).map(
      (mark) => mark.position.y,
    );
    expect(frontYs.length, "no front on a cell the round is taking").toBeGreaterThan(0);
    expect(new Set(frontYs).size, "the front stands on more than one rung").toBe(1);
    expect(ys, "the front shares a rung with a per-cell state").not.toContain(
      frontYs[0] as number,
    );
  });

  it("sits above the whole road stack, because frost falls on paved cells too", () => {
    // Continued from the roads' own top rather than restarted, so an era that surfaces its
    // roads with more courses pushes the winter up with it instead of ending up underneath.
    expect(winterCourseTop(0)).toBeGreaterThan(roadStackTop(CURRENT_ERA_ID));
    expect(winterCourseTop(1)).toBeGreaterThan(winterCourseTop(0));
  });

  it("starts the board states above the SNOW COURSE'S CREST, not above its base", () => {
    // The course is not flat — it jitters so it facets under the flat shading — so a state one
    // 0.05 rung above the course's base would be swallowed by the nearest snow bump over most
    // of the disc, and the frost line would disappear exactly where the player is looking.
    expect(snowCourseBase()).toBeGreaterThan(roadStackTop(CURRENT_ERA_ID));
    expect(snowCourseCrest()).toBeGreaterThan(snowCourseBase());
    // **MEASURED OFF THE GEOMETRY, NOT OFF THE MESH POSITION, and that is the load-bearing
    // part.** As this assertion shipped it compared `position.y + SLAB_THICK / 2` against the
    // crest, which was arithmetic over a bedded box: true of the box's top face. A state's
    // surface now DISHES below its rung (`buildCellTerrain`), so the same arithmetic would
    // clear the crest by half a bed depth while the dish sat under the snow — it would have
    // gone on passing over exactly the defect it exists to catch. This reads the lowest
    // vertex of every state's visible surface instead.
    const group = buildWinterGroundGroup(everyStateRows(), [], { weather: false });
    const tiles = fillTiles(group);
    // A floor on the population, so a layer that stopped drawing its fills cannot pass this
    // by having no surface to measure. THREE, not four: the abandoned fill came out with its
    // action on 2026-08-02, and the floor is lowered with the population rather than left where a
    // layer that stopped drawing one of the three would still clear it.
    expect(tiles.length).toBeGreaterThanOrEqual(3);
    let sampled = 0;
    for (const { name, mesh } of tiles) {
      const ys = surfaceY(mesh);
      // ...and a floor on each tile's sample, for the same reason.
      expect(ys.length, name).toBeGreaterThan(20);
      sampled += ys.length;
      expect(Math.min(...ys), name).toBeGreaterThan(snowCourseCrest());
    }
    expect(sampled).toBeGreaterThan(150);
    // The outlines and the frost front are objects standing on rungs above the fills rather
    // than terrain, so they clear the crest by sitting higher still.
    // `previewAbandon` was a third entry here and went with the give-up-ground action on
    // 2026-08-02. The list is short because there are two objects, not because one was dropped to
    // make this pass: `WINTER_TILE_NAMES` is the derived population in the sweep above.
    for (const name of [WINTER_TILE_NAMES.preview, WINTER_TILE_NAMES.frostNext]) {
      expect(named(group, name)[0]?.position.y, name).toBeGreaterThan(snowCourseCrest());
    }
  });

  it("measures the course's own top faces against that crest rather than trusting it", () => {
    // The clearance above is arithmetic over two exported numbers, which is worth nothing if
    // the geometry ignores them. This reads the built disc's highest vertex.
    const group = buildWinterGroundGroup([[cell()]], []);
    const course = named(group, SNOW_COURSE_NAME)[0] as THREE.Mesh;
    expect(course).toBeDefined();
    const position = course.geometry.getAttribute("position");
    let peak = Number.NEGATIVE_INFINITY;
    for (let i = 0; i < position.count; i += 1) {
      peak = Math.max(peak, position.getY(i));
    }
    // A floor on the sample, so a disc that lost its vertices cannot pass by having none.
    expect(position.count).toBeGreaterThan(200);
    expect(peak).toBeLessThanOrEqual(snowCourseCrest() + 1e-6);
    // ...and the relief is real: a flat plate would make the crest a lie in the other
    // direction and lose the faceting the whole asset is built on.
    expect(peak).toBeGreaterThan(snowCourseBase() + 0.05);
  });
});

describe("the snow covers the WHOLE island, not the gameplay grid", () => {
  it("reaches past the grass so no green ring is left round the settlement", () => {
    // The grid stops at 22 and the grass reaches 30. A per-cell course would leave an
    // eight-unit green ring visible from every heading — which is the defect that decided
    // this asset is one mesh for the disc rather than one slab per cell.
    const group = buildWinterGroundGroup([[cell()]], []);
    const course = named(group, SNOW_COURSE_NAME)[0] as THREE.Object3D;
    const size = new THREE.Box3().setFromObject(course).getSize(new THREE.Vector3());
    expect(size.x / 2).toBeGreaterThan(ISLAND_GRASS_RADIUS);
    expect(size.z / 2).toBeGreaterThan(ISLAND_GRASS_RADIUS);
    expect(size.x / 2).toBeGreaterThan(BUILDABLE_RADIUS * 1.3);
  });

  it("faces the course with a colour attribute, because vertexColors without one is black", () => {
    // Three of these assets read per-face tones off a `color` attribute. In three.js a
    // `vertexColors` material over geometry that has none renders BLACK: the shader declares
    // the attribute and WebGL supplies (0,0,0) for a missing one. Swept over the built group
    // rather than asserted at the one call site, so a new faceted asset joins it for free.
    const group = buildWinterGroundGroup([[cell({ frozen: true })]], [fire()], {
      roadCells: [{ col: 0, row: 0 }],
    });
    let faced = 0;
    group.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (!mesh.isMesh) {
        return;
      }
      for (const m of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
        if ((m as THREE.MeshStandardMaterial).vertexColors) {
          faced += 1;
          expect(mesh.geometry.getAttribute("color"), mesh.name).toBeDefined();
        }
      }
    });
    // A floor, because "no material lost its attribute" is trivially true of a layer with no
    // faceted material in it at all.
    expect(faced).toBeGreaterThanOrEqual(2);
  });

  it("treads the player's own roads back into the snow, and banks the edges", () => {
    // Without this the course buries the road network and the settlement reads as evacuated.
    const straight = [
      { col: 0, row: 0 },
      { col: 1, row: 0 },
      { col: 2, row: 0 },
    ];
    const group = buildWinterGroundGroup([[cell()]], [], { roadCells: straight });
    expect(named(group, PATH_NAME)).toHaveLength(3);
    // A shoulder is snow banked where the path ENDS, so a three-cell run gets banks along
    // both long sides plus one cap at each end: eight, not twelve.
    expect(named(group, PATH_SHOULDER_NAME)).toHaveLength(8);
    // And no roads means no paths, rather than a ribbon through empty snow.
    expect(named(buildWinterGroundGroup([[cell()]], []), PATH_NAME)).toHaveLength(0);
  });

  /**
   * **AND THE ISLAND OUTSIDE THE BOARD IS THE FROST'S FROM ROUND ONE, WHICH IS WHERE THE FRONT
   * STARTS.**
   *
   * The lead, 2026-08-02, having played it: *"the frost ring doesnt start on the edge of the island
   * like i instructed."* The engine had the front on the board's outermost ring already, and the
   * board is `BUILDABLE_RADIUS` (22) while the island is drawn to `ISLAND_GRASS_RADIUS` (30) plus
   * overhang — so the mark stood between 72% and 79% of the drawn radius with **51.5% of the
   * island's plan area in untouched snow outside it**, more than the board covers.
   * `buildFrostMargin` covers that margin and this is the measurement of it;
   * `frostFront.browser.test.tsx` carries the frames it was diagnosed from.
   *
   * ## THE TWO DIRECTIONS, because either alone is satisfiable by a defect
   *
   * **It covers the whole margin.** Sampled on a polar lattice between the board's own outer
   * envelope and the coast, every point is inside the margin's plan bounds and there is a floor
   * under the sample so an empty lattice cannot pass.
   *
   * **And it covers no clear board cell.** The margin lies BELOW every per-cell state, so a margin
   * that ran under the board would paint unfrozen settlement ground frozen — the exact defect a
   * round annulus at radius 22 would have shipped, and the reason this is cell-aligned. Asserted by
   * reading the height of the margin surface under a board cell's centre, which is the direction
   * that fails if the subtraction is dropped.
   */
  it("freezes the island outside the board from the first round, and nothing inside it", () => {
    // A real board, at round one, so the sweep is over the cells the engine actually projects
    // rather than over a fixture: nothing is frozen yet, which is the round the objection is about.
    const opening = createHardWinter({
      era: CURRENT_ERA_ID,
      buildings: [{ node_id: "town-hall", col: -1, row: -1 }],
    });
    const rows = hardWinterView(opening).rows;
    const board = new Set<string>();
    for (const line of rows) {
      for (const view of line) {
        if (view.land) {
          board.add(`${view.col},${view.row}`);
        }
      }
    }
    expect(board.size, "no board to subtract").toBe(88);
    expect(
      rows.flat().filter((view) => view.land && view.frozen),
      "something is frozen at round one, so this is not the frame in question",
    ).toHaveLength(0);

    const group = buildWinterGroundGroup(rows, []);
    const margin = named(group, `${FROST_MARGIN_NAME}-plate`)[0] as THREE.Mesh;
    expect(margin, "no frozen margin on the layer at all").toBeDefined();

    // WHERE THE MARGIN'S SURFACE IS, per plan cell, read off its own vertices. A map rather than a
    // bounding box: the claim is about coverage of a ring, and a box round a ring is a box round
    // the whole island.
    const position = margin.geometry.getAttribute("position");
    expect(position.count, "the margin has no vertices").toBeGreaterThan(600);
    const covered = new Set<string>();
    for (let i = 0; i < position.count; i += 1) {
      const x = position.getX(i);
      const z = position.getZ(i);
      covered.add(`${Math.round(x * 2) / 2},${Math.round(z * 2) / 2}`);
    }
    const near = (x: number, z: number): boolean => {
      for (let dx = -1.5; dx <= 1.5; dx += 0.5) {
        for (let dz = -1.5; dz <= 1.5; dz += 0.5) {
          if (
            covered.has(`${Math.round((x + dx) * 2) / 2},${Math.round((z + dz) * 2) / 2}`)
          ) {
            return true;
          }
        }
      }
      return false;
    };

    // 1. EVERY POINT OF THE MARGIN IS UNDER ICE. Sampled from just outside the board's own cells
    //    out to the coast, at every heading.
    let sampled = 0;
    for (let step = 0; step < 72; step += 1) {
      const angle = (step / 72) * Math.PI * 2;
      for (let r = BUILDABLE_RADIUS + GRID_CELL; r <= ISLAND_GRASS_RADIUS - 1; r += 0.75) {
        const x = Math.cos(angle) * r;
        const z = Math.sin(angle) * r;
        expect(
          near(x, z),
          `bare island at (${x.toFixed(1)}, ${z.toFixed(1)}), ${r.toFixed(1)} out of ${ISLAND_GRASS_RADIUS}`,
        ).toBe(true);
        sampled += 1;
      }
    }
    // A floor, because "every sample is covered" is trivially true of no samples.
    expect(sampled, "the lattice is empty, so it proves nothing").toBeGreaterThan(300);

    // 2. AND THE SETTLEMENT'S OWN GROUND IS NOT. The heart of the board is four rim bands in;
    //    a margin that ran under it would make round one's clear ground read as frozen.
    const heart = cellCenter(-1, -1);
    expect(
      near(heart.x, heart.z),
      "the margin runs under the board, so clear settlement ground is drawn frozen",
    ).toBe(false);
  });

  it("freezes the lagoon out past the shore, with a jagged lip where it meets the water", () => {
    const group = buildWinterGroundGroup([[cell()]], []);
    const sheet = named(group, ICE_SHEET_NAME)[0] as THREE.Object3D;
    expect(sheet).toBeDefined();
    const reach = new THREE.Box3().setFromObject(sheet).getSize(new THREE.Vector3()).x / 2;
    expect(reach).toBeGreaterThan(ISLAND_GRASS_RADIUS);
    // The lip carries the read: without it, ice and water are two flat colours meeting along a
    // line, which looks like a selection error rather than a freeze.
    expect(named(group, SHOVE_ICE_NAME).length).toBeGreaterThanOrEqual(48);
    // Cold water beyond, and it reaches the lagoon's own rim rather than stopping short.
    const water = named(group, COLD_WATER_NAME)[0] as THREE.Object3D;
    expect(water).toBeDefined();
    expect(
      new THREE.Box3().setFromObject(water).getSize(new THREE.Vector3()).x / 2,
    ).toBeGreaterThanOrEqual(SEA_RADIUS);
  });
});

/**
 * **A CANDIDATE SHOWS THE FIRE, AND IT SHOWS IT IN THE FIRE'S OWN COLOURS.**
 *
 * The candidate cells shipped as four raised bars each, toned per tier out of a table of three
 * BLUES. Blue is the winter's own colour here — frost is `0xdce8f2`, the frost line `0x9fc0d8`,
 * the cold lagoon `0x2f5a63` — so the marker for the one action that pushes frost back was
 * drawn in the language of the thing the player was losing to. The lead: *"it shouldnt display
 * this chunky looking blue (its fire, not snow). it should show a preview of what the fire
 * looks like in the actual game."*
 *
 * These are the claims that replace the two the outline treatment carried. The hue claim is
 * asserted NEGATIVELY as well as positively — "it is ochre" and "no cold tone survives on it" —
 * because a patch could be ochre and still have kept a blue rim.
 */
describe("a fire's candidate ground previews the fire, not a frame round it", () => {
  /** Every material on the previewed cells of a built group. */
  function previewMaterials(group: THREE.Group): THREE.MeshStandardMaterial[] {
    const found: THREE.MeshStandardMaterial[] = [];
    for (const patch of named(group, WINTER_TILE_NAMES.preview)) {
      patch.traverse((child) => {
        const mesh = child as THREE.Mesh;
        if (mesh.isMesh) {
          found.push(mesh.material as THREE.MeshStandardMaterial);
        }
      });
    }
    return found;
  }

  it("draws the candidate as the HELD GROUND it would become, from one shared spec", () => {
    // The load-bearing claim of "reuse rather than redraw": the preview and the fact are the
    // same terrain spec OBJECT, so a re-tone of held ground cannot leave the preview promising
    // the old one. Identity, not a value comparison — two equal literals would drift apart.
    const group = buildWinterGroundGroup([[cell({ warded: true })]], [], {
      weather: false,
    });
    const real = named(group, WINTER_TILE_NAMES.warded)[0] as THREE.Mesh;
    expect((real.material as THREE.MeshStandardMaterial).color.getHex()).toBe(
      WARDED_TERRAIN.color,
    );
    expect(WARDED_TERRAIN.color).toBe(WINTER_GROUND_TONES.warded);
  });

  it("keeps no cold tone on it, because blue is what the winter itself is drawn in", () => {
    const group = buildWinterGroundGroup(
      [[cell({ frozen: true, preview_tier: "weak" })]],
      [],
      { weather: false },
    );
    const materials = previewMaterials(group);
    // A floor, so a layer that stopped drawing the preview cannot pass by having no material.
    expect(materials).not.toHaveLength(0);
    const winterBlues = [
      WINTER_GROUND_TONES.frost,
      WINTER_GROUND_TONES.frostLine,
      WINTER_SCENE_TONES.WATER_COLD,
      WINTER_SCENE_TONES.ICE_SHADE,
    ];
    for (const material of materials) {
      // The tone is the ochre, and the facets multiply it — so the blue check below is the
      // one that catches a rim or a band that kept the old palette.
      expect(material.color.getHex()).toBe(WINTER_GROUND_TONES.warded);
      for (const blue of winterBlues) {
        expect(material.color.getHex()).not.toBe(blue);
      }
    }
  });

  it("reads as a PROPOSAL: translucent, and never writing depth over what it covers", () => {
    // `GhostBuilding.tsx` separates proposed from placed with exactly these, and a ghost that
    // looked identical to a lit fire would tell the player the fire is already there.
    const group = buildWinterGroundGroup([[cell({ preview_tier: "weak" })]], [], {
      weather: false,
      firePreviewAt: { col: 0, row: 0 },
    });
    const hearth = named(group, FIRE_GHOST_HEARTH_NAME)[0];
    expect(hearth, "the proposed fire stands on the cell it would be lit on").toBeDefined();

    const ghosted: THREE.MeshStandardMaterial[] = [...previewMaterials(group)];
    hearth?.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (mesh.isMesh) {
        ghosted.push(mesh.material as THREE.MeshStandardMaterial);
      }
    });
    // A floor covering BOTH halves: the patch is one mesh and the hearth is a ring of nine
    // stones, three logs, a bed and seven tongues, so anything under this lost a part.
    expect(ghosted.length).toBeGreaterThanOrEqual(20);
    for (const material of ghosted) {
      expect(material.transparent).toBe(true);
      expect(material.opacity).toBeLessThan(1);
      expect(material.opacity).toBeGreaterThan(0);
      expect(material.depthWrite).toBe(false);
    }
  });

  it("does not ghost the REAL held ground while ghosting the proposal over it", () => {
    // The two are one tone and `buildCellTerrain` caches its material by tone, so the ghost
    // reaching for that cache would have turned every warded cell on the board translucent —
    // a fire the player already paid for would read as another proposal.
    const group = buildWinterGroundGroup(
      [[cell({ warded: true, preview_tier: "weak" })]],
      [],
      { weather: false },
    );
    const real = named(group, WINTER_TILE_NAMES.warded)[0] as THREE.Mesh;
    const realMaterial = real.material as THREE.MeshStandardMaterial;
    expect(realMaterial.transparent).toBe(false);
    expect(realMaterial.opacity).toBe(1);
    expect(realMaterial.depthWrite).toBe(true);
  });

  it("keeps the three bands tellable apart, so accuracy visibly buys reach", () => {
    // The extent claim. The blues were three hues; the ghost is one hue at three opacities,
    // and the ramp MEANS something they did not — `tier_by_cell` records the WEAKEST tier that
    // reaches a cell, so an inner cell is held whatever the player scores and an outer one only
    // if they ace it. Opacity is therefore certainty, and it has to be monotone in it.
    const reaching: readonly WinterActionTier[] = ["weak", "steady", "strong"];
    expect(new Set(reaching.map((t) => GHOST_OPACITY[t])).size).toBe(reaching.length);
    expect(GHOST_OPACITY.weak).toBeGreaterThan(GHOST_OPACITY.steady);
    expect(GHOST_OPACITY.steady).toBeGreaterThan(GHOST_OPACITY.strong);
    // ...and every band is actually visible. A band at zero would be "tellable apart" by not
    // being drawn, which loses the extent this treatment exists to keep.
    for (const tier of reaching) {
      expect(GHOST_OPACITY[tier], tier).toBeGreaterThan(0.15);
    }
    // Built, not just tabulated: the three bands reach the group at three opacities.
    const group = buildWinterGroundGroup(
      [
        [
          cell({ col: 0, preview_tier: "weak" }),
          cell({ col: 1, preview_tier: "steady" }),
          cell({ col: 2, preview_tier: "strong" }),
        ],
      ],
      [],
      { weather: false },
    );
    const opacities = previewMaterials(group).map((m) => m.opacity);
    expect(opacities).toHaveLength(3);
    expect(new Set(opacities).size).toBe(3);
  });

  it("stands no proposed hearth when no cell is being aimed at", () => {
    const group = buildWinterGroundGroup([[cell({ preview_tier: "weak" })]], [], {
      weather: false,
    });
    expect(named(group, FIRE_GHOST_HEARTH_NAME)).toHaveLength(0);
  });

  it("keeps the pull-back preview in its own tone, since confusing them inverts the choice", () => {
    // Held ground and lost ground are the two provisional states and they must never be read
    // for each other. The fire's is now the warded ochre, so the claim is against that.
    expect(WINTER_GROUND_TONES.previewAbandon).not.toBe(WINTER_GROUND_TONES.warded);
  });
});

/**
 * **THE STATES ARE TERRAIN NOW, AND FOUR OF THEM STILL HAVE TO BE TELLABLE APART.**
 *
 * Every state was one flat single-tone full-cell quad, on an island whose ground is faceted
 * low-poly with per-facet value. That is why each state in turn read as colour painted onto the
 * map, and it is one defect at the layer rather than four defects in four states — so the fix
 * is one builder every state goes through, and these sweeps run over a population DERIVED from
 * what the layer built rather than a list written down here.
 *
 * The pull in the other direction is the whole reason this block is long: there is a legend on
 * screen because the player acts on the difference between these states, and the frost line's
 * own legend entry is *"the frost line: how far it has got"*. Faceting and tonal variation are
 * exactly what could blur four flat colours into four similar mottled patches. So the states
 * are separated on four channels — value, relief, facet count and edge treatment — and each
 * channel is measured off the built geometry below, not asserted of the table that requests it.
 */
describe("the winter's ground states read as terrain, not as paint", () => {
  /** A board with all four fills on one cell, which is the population every sweep here uses. */
  function everyState(): THREE.Group {
    // TWO cells, because the sheet and the line cannot share one: `frost_line` is a refinement
    // of `frozen` and the layer draws a frost-line cell once, as the line. See `everyStateRows`.
    return buildWinterGroundGroup(
      [
        [
          cell({ col: 0, row: 0, frozen: true, warded: true }),
          cell({ col: 1, row: 0, frozen: true, frost_line: true }),
        ],
      ],
      [],
      { weather: false },
    );
  }

  /**
   * The frost FRONT is deliberately absent from `everyState`, and that is a scoping decision
   * rather than an omission. Every sweep in this block is about a state drawn as TERRAIN — the
   * dish, the facet values, the edge treatment — and the front is not terrain: it is shove ice
   * and rime standing on ground the frost has not taken. Its own claims are in
   * "the frost front says where the frost starts" below, and the sweeps that apply to
   * everything in the layer (emissive, flat shading, metalness, reserved gold) reach it through
   * `liveRows`.
   */

  it("facets every state's surface and varies its value across the facets", () => {
    const tiles = fillTiles(everyState());
    // THREE FILLS, not four: the abandoned one went with its action on 2026-08-02.
    expect(tiles.length).toBeGreaterThanOrEqual(3);
    for (const { name, mesh } of tiles) {
      const ys = surfaceY(mesh);
      const relief = Math.max(...ys) - Math.min(...ys);
      // Relief, so the flat key light catches its planes at different angles at all. A flat
      // quad is exactly zero here, which is what every one of these states used to be.
      expect(relief, `${name} relief`).toBeGreaterThan(0.05);
      // Enough faces to facet: a full-cell quad is two triangles.
      const faces =
        (mesh.geometry.getAttribute("position") as THREE.BufferAttribute).count / 3;
      expect(faces, `${name} faces`).toBeGreaterThanOrEqual(18);
      // ...and the facets do not all carry the same value, which is the other half of the
      // defect: geometry alone under this near-shadowless winter key is a weak read.
      const values = faceValues(mesh);
      expect(values.length, `${name} distinct facet values`).toBeGreaterThanOrEqual(3);
      expect(
        (values[values.length - 1] as number) - (values[0] as number),
        `${name} value spread`,
      ).toBeGreaterThan(0.15);
    }
  });

  it("keeps the facet variation a grey MULTIPLIER, so a state is still one named colour", () => {
    // The in-city legend paints its swatch from `WINTER_GROUND_TONES`, and the reserved-gold
    // sweep at the bottom of this file reads `material.color`. Both are only sound while the
    // per-facet variation is a value multiplier on that one tone: a per-face HUE would make
    // the legend a lie and would walk a colour past the gold sweep in an attribute it does
    // not read. So the attribute is checked for grey.
    const tiles = fillTiles(everyState());
    // THREE FILLS, not four: the abandoned one went with its action on 2026-08-02.
    expect(tiles.length).toBeGreaterThanOrEqual(3);
    let checked = 0;
    for (const { name, mesh } of tiles) {
      const color = mesh.geometry.getAttribute("color") as THREE.BufferAttribute;
      expect(color, name).toBeDefined();
      for (let i = 0; i < color.count; i += 1) {
        expect(color.getY(i), `${name} vertex ${i} green`).toBeCloseTo(color.getX(i), 6);
        expect(color.getZ(i), `${name} vertex ${i} blue`).toBeCloseTo(color.getX(i), 6);
        checked += 1;
      }
    }
    expect(checked).toBeGreaterThan(400);
  });

  it("separates every ground state by VALUE and not only by hue", () => {
    // The states must survive being read at a glance on a near-shadowless overcast board, and
    // hue alone is what the crisis's own INV-CRISIS-16 forbids relying on. Pairwise, so a new
    // state cannot be dropped in next to an existing one.
    //
    // THE FRONT IS IN THIS SWEEP AND IT IS THE PAIR THAT MATTERS: it and `abandoned` are the two
    // darkest things on the board, so a front toned by eye toward the deepest blue available
    // lands on the dead char and the player cannot tell "the frost arrives here next" from
    // "this ground is gone". Named rather than indexed, because a numbered failure over five
    // tones says nothing about which pair collided.
    const tones = {
      frost: WINTER_GROUND_TONES.frost,
      frostLine: WINTER_GROUND_TONES.frostLine,
      frostFront: WINTER_GROUND_TONES.frostFront,
      warded: WINTER_GROUND_TONES.warded,
      abandoned: WINTER_GROUND_TONES.abandoned,
    };
    const named = Object.entries(tones);
    for (let i = 0; i < named.length; i += 1) {
      for (let j = i + 1; j < named.length; j += 1) {
        const [a, toneA] = named[i] as [string, number];
        const [b, toneB] = named[j] as [string, number];
        expect(
          Math.abs(luminance(toneA) - luminance(toneB)),
          `${a} against ${b}`,
        ).toBeGreaterThan(0.05);
      }
    }
  });

  it("keeps FROZEN ground tellable from the snow it lies on, by value and by cast", () => {
    /*
     * **THE PAIR THE STATE-AGAINST-STATE SWEEP ABOVE CANNOT SEE, and the one the lead was
     * looking at.** Every assertion in this block compares board states with each other. Frozen
     * ground's real neighbour is not another state, it is the SNOW COURSE — and the two tables
     * are separate on purpose (`winterTones.ts`: a cell being frozen and snow being pale are
     * different claims), so nothing was holding the one relationship the frost's whole
     * visibility depends on.
     *
     * It was not holding because it was not true. `frost` was authored as *"pale, desaturated
     * ice"* against a vivid yellow-green tussock, which it was right against; #323 then laid a
     * snow course over the whole island. Measured in a rendered frame at the shipped camera, the
     * old tone put frozen ground at `(171, 181, 186)` beside unfrozen winter ground at
     * `(152, 166, 166)`: fifteen points of blue, and the frost the LIGHTER of the two.
     *
     * Both channels, because either alone is a way to be invisible here: a cool cast at the same
     * value is a tint nobody notices under a near-shadowless overcast key, and a value step with
     * no cast is grey snow.
     */
    const cast = (hex: number): number => (hex & 0xff) - ((hex >> 16) & 0xff);
    const snow = WINTER_SCENE_TONES.SNOW_LIT;
    const frost = WINTER_GROUND_TONES.frost;
    expect(
      luminance(snow) - luminance(frost),
      "frozen ground is as light as the snow it lies on",
    ).toBeGreaterThan(0.15);
    expect(
      cast(frost),
      "frozen ground carries no more blue than the snow it lies on",
    ).toBeGreaterThan(cast(snow) * 2);
    // ...and it is still PALE ICE and not the frost's own leading edge, which has to stay a
    // visible step colder than the sheet behind it or the boundary stops reading.
    expect(luminance(frost)).toBeGreaterThan(luminance(WINTER_GROUND_TONES.frostLine));
    expect(luminance(frost)).toBeGreaterThan(0.6);
  });

  it("gives every state a DIFFERENT relief and facet count, so two never read alike", () => {
    // The channels have to be distinct per state and not merely present: four states all
    // faceted the same way is four mottled patches that differ by hue, which is the failure
    // mode this whole block exists to rule out.
    const shapes = fillTiles(everyState()).map(({ name, mesh }) => {
      const ys = surfaceY(mesh);
      return {
        name,
        relief: (Math.max(...ys) - Math.min(...ys)).toFixed(3),
        faces: (mesh.geometry.getAttribute("position") as THREE.BufferAttribute).count / 3,
      };
    });
    // Three fills since 2026-08-02, and the pairwise distinctness below is what the floor exists
    // for rather than the count: three states that read alike is the same defect as four.
    expect(shapes.length).toBeGreaterThanOrEqual(3);
    expect(new Set(shapes.map((s) => `${s.relief}/${s.faces}`)).size).toBe(shapes.length);
  });

  it("makes the FROST LINE the sharpest state, because it is where the frost has got to", () => {
    // Its legend entry is "the frost line: how far it has got", so a player reads it to predict
    // where the damage lands. It is the one state whose edge rises ABOVE its rung, and it
    // therefore stands proud of the sheet of frost behind it rather than dissolving into it.
    const group = buildWinterGroundGroup(
      [
        [
          cell({ col: 0, row: 0, frozen: true }),
          // TWO sheet cells and not one, so the floor below stays a floor: the third cell is the
          // line, and a frost-line cell no longer carries a sheet under it (`everyStateRows`).
          cell({ col: 1, row: 0, frozen: true }),
          cell({ col: 2, row: 0, frozen: true, frost_line: true }),
        ],
      ],
      [],
      { weather: false },
    );
    const line = named(group, WINTER_TILE_NAMES.frostLine)[0] as THREE.Mesh;
    const frozen = named(group, WINTER_TILE_NAMES.frozen).map((m) =>
      Math.max(...surfaceY(m as THREE.Mesh)),
    );
    expect(frozen.length).toBe(2);
    expect(Math.max(...surfaceY(line))).toBeGreaterThan(Math.max(...frozen) + 0.05);
    // ...and it is the deepest behind that crest, which is what makes the crest directional.
    const ys = surfaceY(line);
    expect(Math.max(...ys) - Math.min(...ys)).toBeGreaterThan(0.14);
  });

  it("merges two cells in the same state and shows an edge only where the state ends", () => {
    // §3.2 of the art brief: "two frozen cells side by side should merge; a frozen cell beside
    // a clear one should show a lip". Both halves are measurable — a lip is rim vertices held
    // at the rung, and a merged seam is rim vertices that dish like the interior.
    const lone = named(
      buildWinterGroundGroup([[cell({ frozen: true })]], [], { weather: false }),
      WINTER_TILE_NAMES.frozen,
    )[0] as THREE.Mesh;
    const pair = buildWinterGroundGroup(
      [[cell({ col: 0, row: 0, frozen: true }), cell({ col: 1, row: 0, frozen: true })]],
      [],
      { weather: false },
    );
    const west = named(pair, WINTER_TILE_NAMES.frozen)[0] as THREE.Mesh;
    // A lone cell's whole rim is a lip, so its surface reaches its rung all the way round.
    const rimOf = (mesh: THREE.Mesh, side: 1 | -1) => {
      const position = mesh.geometry.getAttribute("position") as THREE.BufferAttribute;
      const ys: number[] = [];
      for (let i = 0; i < position.count; i += 1) {
        if (
          position.getY(i) > -SLAB_THICK / 2 &&
          Math.abs(position.getX(i) - (side * GRID_CELL) / 2) < 1e-6
        ) {
          ys.push(position.getY(i));
        }
      }
      return ys;
    };
    const loneEast = rimOf(lone, 1);
    expect(loneEast.length).toBeGreaterThan(2);
    expect(Math.min(...loneEast)).toBeCloseTo(0, 6);
    // The west cell of the pair has a neighbour to its east, so that rim is NOT a lip: it
    // dishes, and the neighbour's own west rim dishes to the same heights because the hash is
    // positional — which is what makes the two read as one sheet.
    const pairEast = rimOf(west, 1);
    expect(pairEast.length).toBe(loneEast.length);
    expect(Math.min(...pairEast)).toBeLessThan(-0.01);
    const east = named(pair, WINTER_TILE_NAMES.frozen)[1] as THREE.Mesh;
    expect(rimOf(east, -1).sort()).toEqual(pairEast.sort());
  });

  /**
   * **HALF OF THIS IS OVERTURNED (2026-08-04), AND THE TRADE IT PINNED IS CARRIED FORWARD.**
   *
   * It read *"…and keeps its extent countable"*, and its second half asserted that the middle
   * cell of a plus-shaped patch is FULL CELL WIDTH: no side exposed, so nothing pulled back, so
   * two held cells that touch merge into one surface. That was §3.2 of the art brief working as
   * designed — *"two cells in the same state that touch should merge"* — and the trade written
   * beside it was real: a feather is a softer boundary, so it was bounded to at most
   * `FEATHER_INSET` and cut only where the held area actually ends, which kept the extent
   * countable and stopped the cross reading as a grid selection.
   *
   * The lead has looked at the result and ruled the other way for held ground: *"instead of
   * making all the tiles overlap, just make the tiles protected by the real fire look like it
   * does in the preview, with each tile individually protected"*. So every held cell is rimmed
   * on all four sides now, interior or not, and this expectation is the one that has to move.
   *
   * **The countability half survives and is asserted harder than before.** That was what the
   * bound on the feather was protecting, and per tile there are as many rims as cells, so the
   * claim is now made of every cell rather than of the outline: no held cell may lose more than
   * a quarter of its plan. `winterHeldGroundPerTile.test.ts` owns the ruling itself and holds
   * the committed tile against the preview's own geometry; this is the instance in the file that
   * pinned the merge.
   */
  it("holds the held ground in era one's OWN bare earth, and rims every cell of it", () => {
    // The brief's reasoning, kept: the held patch should sit in the island's bare-earth family
    // (`C.earth` / `C.earthWorn` in `StarterIsland.tsx`) "so the one thing a fire is for looks
    // like ground that has been walked on". This is `C.earth` to the digit, repeated as a
    // literal because `winterTones.ts` may not import the island (it may not import `three`).
    expect(WINTER_GROUND_TONES.warded).toBe(0xc9a06a);

    const plan = (mesh: THREE.Mesh) => {
      const box = new THREE.Box3().setFromObject(mesh);
      // The skirt runs straight down from the rim, so the box is the plan of the surface.
      return Math.min(box.max.x - box.min.x, box.max.z - box.min.z);
    };
    const lone = named(
      buildWinterGroundGroup([[cell({ warded: true })]], [], { weather: false }),
      WINTER_TILE_NAMES.warded,
    )[0] as THREE.Mesh;
    // Feathered on all four sides, and still three quarters of its cell.
    expect(plan(lone)).toBeLessThan(GRID_CELL);
    expect(plan(lone)).toBeGreaterThan(GRID_CELL * 0.75);

    // The middle of a plus-shaped patch, which is the shape a middle-tier fire holds. It used to
    // be full cell width because none of its sides was exposed; it is now rimmed exactly as the
    // lone cell is, which is what "each tile individually" means where two held cells touch.
    const plus = buildWinterGroundGroup(
      [
        [
          cell({ col: 0, row: -1, warded: true }),
          cell({ col: -1, row: 0, warded: true }),
          cell({ col: 0, row: 0, warded: true }),
          cell({ col: 1, row: 0, warded: true }),
          cell({ col: 0, row: 1, warded: true }),
        ],
      ],
      [],
      { weather: false },
    );
    const tiles = named(plus, WINTER_TILE_NAMES.warded) as THREE.Mesh[];
    // A floor on the population, so "every tile is rimmed" cannot be true of an empty patch —
    // and the middle cell is in it, which is the one the old assertion was about.
    expect(tiles).toHaveLength(5);
    for (const tile of tiles) {
      const width = plan(tile);
      expect(
        width,
        `a held tile at (${tile.position.x}, ${tile.position.z}) runs the full cell, so it merges ` +
          `with its neighbour`,
      ).toBeLessThan(GRID_CELL);
      // AND THE TRADE THE OLD BOUND PROTECTED, now made of every cell: a rim on all four sides
      // is four chances to eat the extent, so the floor is what keeps a patch of five cells
      // reading as five cells rather than as five dots.
      expect(width).toBeGreaterThan(GRID_CELL * 0.75);
    }
  });
});

/**
 * **WHERE DOES THE FROST START? THE STATE THAT DID NOT EXIST, AND THE ONE THAT IS TRUE ON LOAD.**
 *
 * The lead: *"right now the frost layer is not very visible / where the frost is right now. it
 * should also be visible on load, so that users can see where the frost starts."*
 *
 * The frost was not faint. At round one there was NONE of it — `createHardWinter` opens with
 * `frozen: []` and the first advance is part of `end_round` — so a board on load carried 0 frozen
 * cells and 0 frost-line cells, and the renderer faithfully drew nothing. The first assertion
 * below is that measurement, because everything after it is only worth having if it holds.
 *
 * ## The three claims, and each is a channel the board had no room left for
 *
 * The island is already entirely white (#323 made every ground state faceted snow-toned terrain,
 * which is right and is exactly why frost has no lightness contrast). So the front is asserted
 * on the channels that were still free, and each of these has a way of being got wrong that
 * looks fine in a diff:
 *
 *  - **VALUE, downward.** A front toned pale to "match the ice" is invisible for the same reason
 *    the frost is. Measured against lit snow rather than asserted of the hex.
 *  - **OPACITY, absent.** The fire ghost's ramp had to be raised off a photograph because alpha
 *    over near-white snow composites to a pale tint whatever the arithmetic says. The front may
 *    not be translucent at all, so it cannot fall into the same trap.
 *  - **PLACE.** A wall drawn on every side of every cell of the front is a lattice, not a line,
 *    and it would say nothing about which way the frost is going. It stands only where the front
 *    meets water or ground the frost already holds — which is what puts it on the shoreline at
 *    round one and on the frost's own edge afterwards, from ONE rule.
 */
describe("the frost front says where the frost starts", () => {
  /** A real board at round one, straight from the engine: nothing frozen, nothing played. */
  function onLoadRows(): readonly (readonly WinterCellView[])[] {
    return hardWinterView(
      createHardWinter({
        era: CURRENT_ERA_ID,
        buildings: [{ node_id: "NUM.S", col: 0, row: 0 }],
      }),
    ).rows;
  }

  /**
   * HOW MANY CELLS CARRY A MARK ON THE OPENING BOARD, derived from that board.
   *
   * It was the literal 28 — the shoreline band, which is what the front stood on until
   * 2026-08-03. The mark now stands one full ring further OUT, on the ice outside the board
   * (`frostFrontMarks`, and the lead's *"it needs to start one layer out"*), so the population is
   * the off-board ring and it is a different number. Derived rather than repinned, so an era
   * whose radius moves brings its own count here, and floored where it is used.
   *
   * `frostFrontRing.test.ts` is what asserts the marks land on exactly this ring; this is only
   * the size of it, so the sweeps below cannot be satisfied by a front that stopped drawing.
   */
  function openingMarkCount(): number {
    const land = new Set<string>();
    const takes: { col: number; row: number }[] = [];
    for (const line of onLoadRows()) {
      for (const c of line) {
        if (!c.land) {
          continue;
        }
        land.add(`${c.col},${c.row}`);
        if (c.frost_next) {
          takes.push({ col: c.col, row: c.row });
        }
      }
    }
    const ring = new Set<string>();
    for (const { col, row } of takes) {
      for (const [dc, dr] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ] as const) {
        const key = `${col + dc},${row + dr}`;
        if (!land.has(key)) {
          ring.add(key);
        }
      }
    }
    return ring.size;
  }

  /** Every mesh under a named object, so a group's parts can be measured. */
  function meshesUnder(object: THREE.Object3D): THREE.Mesh[] {
    const found: THREE.Mesh[] = [];
    object.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        found.push(child as THREE.Mesh);
      }
    });
    return found;
  }

  /** The world-space direction one shard's taper points, read off its own transform. */
  function shardHeading(shard: THREE.Object3D): THREE.Vector3 {
    return new THREE.Vector3(1, 0, 0).applyEuler(shard.rotation).setY(0).normalize();
  }

  /**
   * WHICH SIDES OF A CELL ITS WALL STANDS ON, read off the built plates' own positions.
   *
   * A COUNT of plates was tried first and is the wrong instrument: "nine plates" is three sides
   * and says nothing about WHICH three, so a wall placed on the sides facing the settlement
   * instead of the sides facing the frost would pass every count in this file. The plates stand
   * inset from the cell rim, and the run along an edge never reaches as far as the inset, so the
   * coordinate at full inset is the side.
   */
  function wallSides(mark: THREE.Object3D): Set<string> {
    const sides = new Set<string>();
    for (const mesh of meshesUnder(mark)) {
      if (mesh.name !== FROST_FRONT_WALL_NAME) {
        continue;
      }
      const edge = Math.max(Math.abs(mesh.position.x), Math.abs(mesh.position.z));
      if (Math.abs(mesh.position.x) === edge) {
        sides.add(mesh.position.x > 0 ? "east" : "west");
      } else {
        sides.add(mesh.position.z > 0 ? "south" : "north");
      }
    }
    return sides;
  }

  it("is the ONLY frost mark on a board at round one, and it is the whole shoreline", () => {
    // THE DEFECT, MEASURED ON THE PROJECTION THE PRODUCT ACTUALLY HANDS THIS LAYER. Not a
    // hand-written row: a literal would let this pass over a view model the engine no longer
    // produces, and the whole point is what the engine really says on load.
    const rows = onLoadRows();
    const land = rows.flat().filter((c) => c.land);
    expect(land).toHaveLength(88);
    expect(
      land.filter((c) => c.frozen),
      "something is frozen on load",
    ).toHaveLength(0);
    expect(
      land.filter((c) => c.frost_line),
      "a frost line on load",
    ).toHaveLength(0);

    const group = buildWinterGroundGroup(rows, [], { weather: false });
    // Nothing the frost HOLDS is drawn, because it holds nothing...
    expect(named(group, WINTER_TILE_NAMES.frozen)).toHaveLength(0);
    expect(named(group, WINTER_TILE_NAMES.frostLine)).toHaveLength(0);
    // ...and the front is drawn all the way round the shoreline band, which is what a player has
    // to be able to find before their first decision. On the RING OUTSIDE it since 2026-08-03,
    // so the count is derived — see `openingMarkCount`, and `frostFrontRing.test.ts` for where
    // the ring falls.
    const front = named(group, WINTER_TILE_NAMES.frostNext);
    expect(openingMarkCount(), "the derived ring is too small to be one").toBeGreaterThan(
      24,
    );
    expect(front, "the board on load draws no frost front").toHaveLength(
      openingMarkCount(),
    );
    for (const cell of land.filter((c) => c.frost_next)) {
      expect(cell.rim_depth, `(${cell.col},${cell.row}) is not on the shore`).toBe(0);
    }
    // It is a RING and not a patch: the marks reach past the centre on both axes, so the read is
    // "the frost is coming from all round" rather than "something is happening over there".
    const xs = front.map((mark) => mark.position.x);
    const zs = front.map((mark) => mark.position.z);
    expect(Math.min(...xs)).toBeLessThan(-GRID_CELL * 3);
    expect(Math.max(...xs)).toBeGreaterThan(GRID_CELL * 3);
    expect(Math.min(...zs)).toBeLessThan(-GRID_CELL * 3);
    expect(Math.max(...zs)).toBeGreaterThan(GRID_CELL * 3);
  });

  it("reads by VALUE, several times harder than the frost it precedes", () => {
    // The design premise, as arithmetic over the tones that ship. Frost against lit snow is the
    // eleven-point gap that was carrying the whole read and could not; the front's job is to be
    // the one dark thing on the board, so its own gap has to be a different order of thing.
    const snow = luminance(WINTER_SCENE_TONES.SNOW_LIT);
    const frostGap = snow - luminance(WINTER_GROUND_TONES.frost);
    const frontGap = snow - luminance(WINTER_GROUND_TONES.frostFront);
    expect(
      frostGap,
      "the frost is not the pale state this is written against",
    ).toBeLessThan(0.2);
    expect(frontGap, "the front is as pale as the frost").toBeGreaterThan(frostGap * 3);
    // Built, not tabulated: every material on the mark is a value step of that ONE tone, so a
    // plate re-toned by hand cannot drift out of the state the legend names.
    const group = buildWinterGroundGroup(onLoadRows(), [], { weather: false });
    const marks = named(group, WINTER_TILE_NAMES.frostNext);
    const front = new THREE.Color(WINTER_GROUND_TONES.frostFront);
    let checked = 0;
    for (const mark of marks) {
      for (const mesh of meshesUnder(mark)) {
        const color = (mesh.material as THREE.MeshStandardMaterial).color;
        // A grey multiplier keeps the ratios between the channels, so a hue shift shows up as a
        // channel that no longer divides to the same number.
        const scale = color.r / front.r;
        expect(scale, mesh.name).toBeGreaterThan(0);
        expect(scale, mesh.name).toBeLessThanOrEqual(1);
        expect(color.g / front.g, `${mesh.name} green`).toBeCloseTo(scale, 4);
        expect(color.b / front.b, `${mesh.name} blue`).toBeCloseTo(scale, 4);
        checked += 1;
      }
    }
    expect(checked, "no front materials to check").toBeGreaterThan(100);
  });

  it("is OPAQUE, because alpha over near-white snow is the trap that caught the fire ghost", () => {
    // `winterFireGhost.ts` records it: its first ramp was internally consistent and read badly,
    // because ochre at 0.28 over `SNOW_LIT` is a pale tan and the band the player most needed
    // nearly disappeared. The front is the state that could least afford that, so it is drawn as
    // solid geometry and the assertion is that it has no alpha to get wrong.
    const group = buildWinterGroundGroup(onLoadRows(), [], { weather: false });
    const marks = named(group, WINTER_TILE_NAMES.frostNext);
    expect(marks.length).toBeGreaterThan(20);
    let checked = 0;
    for (const mark of marks) {
      for (const mesh of meshesUnder(mark)) {
        const material = mesh.material as THREE.MeshStandardMaterial;
        expect(material.transparent, mesh.name).toBe(false);
        expect(material.opacity, mesh.name).toBe(1);
        expect(material.depthWrite, mesh.name).toBe(true);
        checked += 1;
      }
    }
    expect(checked).toBeGreaterThan(100);
  });

  it("cannot be read for the fire ghost, on hue, on form and on opacity", () => {
    // The convention `winterFireGhost.ts` owns is translucent ochre = ground a fire WOULD hold,
    // solid ochre = ground it does hold. The front sits right beside that and means the opposite
    // thing, so all three channels are asserted rather than the one that happens to differ.
    const group = buildWinterGroundGroup(
      [[cell({ frost_next: true, preview_tier: "weak" })]],
      [],
      { weather: false },
    );
    const front = named(group, WINTER_TILE_NAMES.frostNext)[0] as THREE.Object3D;
    const ghost = named(group, WINTER_TILE_NAMES.preview)[0] as THREE.Mesh;
    expect(front, "no front on a cell the round is taking").toBeDefined();
    expect(ghost, "no ghost on a previewed cell").toBeDefined();

    // HUE. Cold against ochre, and the two never share a tone.
    for (const mesh of meshesUnder(front)) {
      expect((mesh.material as THREE.MeshStandardMaterial).color.getHex()).not.toBe(
        WINTER_GROUND_TONES.warded,
      );
    }
    expect((ghost.material as THREE.MeshStandardMaterial).color.getHex()).toBe(
      WINTER_GROUND_TONES.warded,
    );
    // FORM. The ghost is the terrain the cell would become — one ground mesh lying in the cell.
    // The front is a thing arriving on ground it has not taken, so it is several standing
    // objects, and it stands: a flat mark would be a fourth pale patch on a white board.
    expect(ghost.isMesh).toBe(true);
    expect(meshesUnder(front).length).toBeGreaterThan(4);
    const size = new THREE.Box3().setFromObject(front).getSize(new THREE.Vector3());
    expect(size.y, "the front lies flat on the ground").toBeGreaterThan(0.4);
    expect(
      size.y,
      "the front is tall enough to hide the settlement behind it",
    ).toBeLessThan(1.6);
    // OPACITY. Asserted from BOTH sides, so this cannot pass by the ghost having quietly become
    // opaque too — which would lose the proposal-against-fact distinction it exists to carry.
    expect((ghost.material as THREE.MeshStandardMaterial).transparent).toBe(true);
    for (const mesh of meshesUnder(front)) {
      expect((mesh.material as THREE.MeshStandardMaterial).transparent, mesh.name).toBe(
        false,
      );
    }
  });

  it("stands its wall on the frost's own edge and nowhere else", () => {
    /*
     * THE ONE RULE, CHECKED IN BOTH PLACES IT HAS TO LAND. A wall on every side of every cell of
     * the front is a lattice and says nothing about direction; a wall only where it meets FROZEN
     * ground draws nothing at all on load, which is the whole defect. So the rule is "water or
     * frozen", and both halves are measured off real boards.
     *
     * Read as a COUNT of plates per cell against the count of qualifying sides, because "the
     * wall exists" and "the wall is in the right place" are different claims and only the second
     * one is about a boundary.
     */
    const plates = (mark: THREE.Object3D): number =>
      meshesUnder(mark).filter((mesh) => mesh.name === FROST_FRONT_WALL_NAME).length;

    // ON LOAD: nothing is frozen, so every wall is against open water — and every shoreline cell
    // gets one, which is what makes the ring exist before the frost has taken anything.
    const onLoad = buildWinterGroundGroup(onLoadRows(), [], { weather: false });
    const rim = named(onLoad, WINTER_TILE_NAMES.frostNext);
    expect(rim).toHaveLength(openingMarkCount());
    for (const mark of rim) {
      expect(plates(mark), `(${mark.position.x}, ${mark.position.z})`).toBeGreaterThan(0);
      // ...and it stands on the side that faces the SEA. Read as a direction rather than a
      // count: a rim cell's water side is roughly radial, so the wall's own outward offset has
      // to agree with the outward direction from the island's middle.
      const outward = new THREE.Vector3(mark.position.x, 0, mark.position.z).normalize();
      let best = -2;
      for (const mesh of meshesUnder(mark)) {
        if (mesh.name !== FROST_FRONT_WALL_NAME) {
          continue;
        }
        const away = Math.abs(mesh.position.x) > Math.abs(mesh.position.z);
        const normal = new THREE.Vector3(
          away ? Math.sign(mesh.position.x) : 0,
          0,
          away ? 0 : Math.sign(mesh.position.z),
        );
        best = Math.max(best, normal.dot(outward));
      }
      expect(
        best,
        `(${mark.position.x}, ${mark.position.z}) has no seaward wall`,
      ).toBeGreaterThan(0.3);
    }

    /*
     * A LINE AND NOT A LATTICE, on a three-cell board: frozen ground at `-1`, and two cells the
     * same round is taking beside it.
     *
     * **THE SUBJECT MOVED WITH THE MARK AND THE CLAIM DID NOT.** This used to read the two taken
     * cells' own walls and require the seam between them to be bare. The mark now stands on the
     * ICE around the pair rather than on the pair (`frostFrontMarks`), so those two cells carry
     * nothing at all — which is a stronger version of the same claim and is asserted as such:
     * no wall stands anywhere on the ground the round is taking, and the ring around it is real
     * rather than absent.
     */
    const row = buildWinterGroundGroup(
      [
        [
          cell({ col: -1, row: 0, frozen: true, rim_depth: 0 }),
          cell({ col: 0, row: 0, frost_next: true, rim_depth: 1 }),
          cell({ col: 1, row: 0, frost_next: true, rim_depth: 1 }),
        ],
      ],
      [],
      { weather: false },
    );
    const marks = named(row, WINTER_TILE_NAMES.frostNext);
    // A floor, so "no mark stands on the taken ground" cannot pass by there being no marks.
    expect(marks.length, "no front at all on the three-cell board").toBeGreaterThan(2);
    const taken = [cellCenter(0, 0), cellCenter(1, 0)];
    for (const mark of marks) {
      for (const at of taken) {
        expect(
          Math.hypot(mark.position.x - at.x, mark.position.z - at.z),
          `a mark stands on (${at.x}, ${at.z}), which is ground the round takes`,
        ).toBeGreaterThan(1);
      }
      expect(plates(mark), "a mark on the ring with no wall on it").toBeGreaterThan(0);
    }
    // The frozen cell at `-1` is ice the frost holds, so it carries a mark; the two taken cells
    // do not. Read as the westmost mark rather than by index, since the ring has no order.
    const west = marks.reduce((a, b) => (a.position.x <= b.position.x ? a : b));
    expect(west.position.x).toBeCloseTo(cellCenter(-1, 0).x, 6);
    // ...and its wall faces AWAY from the advance, onto the ice behind it, never onto the seam
    // with the ground the round is taking. Both directions: `west` present and `east` absent.
    expect(wallSides(west)).toContain("west");
    expect(wallSides(west)).not.toContain("east");
  });

  it("breaks where a fire is holding the ground, so the front dents visibly", () => {
    /*
     * The counter-play, in the picture. A warded cell is never `frost_next` (the engine's advance
     * blocks on it) and it is not ice the frost holds either, so the front's ring simply does not
     * reach across it. Without this the front would draw straight through the one thing the
     * player spent their round on.
     *
     * READ AS "IS THERE A MARK ON THE FIRE'S SIDE" rather than as a set of wall sides, because
     * the mark moved off the taken cell on 2026-08-03: the dent is now a gap in the RING and the
     * cell it used to be a bare edge of carries nothing at all.
     */
    const markAt = (group: THREE.Group, col: number, row: number): boolean => {
      const at = cellCenter(col, row);
      return named(group, WINTER_TILE_NAMES.frostNext).some(
        (mark) => Math.hypot(mark.position.x - at.x, mark.position.z - at.z) < 1,
      );
    };
    const held = buildWinterGroundGroup(
      [
        [
          cell({ col: 0, row: 0, warded: true, rim_depth: 0 }),
          cell({ col: 1, row: 0, frost_next: true, rim_depth: 0 }),
        ],
      ],
      [],
      { weather: false },
    );
    // A floor first: the ring exists on the other three sides, so the gap below is a dent and
    // not an empty board.
    expect(
      named(held, WINTER_TILE_NAMES.frostNext).length,
      "no front at all beside the fire",
    ).toBeGreaterThan(2);
    expect(markAt(held, 0, 0), "the front stands on the ground the fire is holding").toBe(
      false,
    );

    /*
     * AND THE SAME BOARD WITH THE FIRE GONE AND THE FROST THROUGH IT marks that cell, which is
     * what makes the assertion above about the FIRE rather than about the arithmetic.
     *
     * The control is the western cell FROZEN and not merely clear, and the difference matters:
     * clear ground carries no mark either, correctly — it is not ice the front can stand on — so
     * a control that only removed the ward would have passed while proving nothing.
     */
    const taken = buildWinterGroundGroup(
      [
        [
          cell({ col: 0, row: 0, frozen: true, rim_depth: 0 }),
          cell({ col: 1, row: 0, frost_next: true, rim_depth: 0 }),
        ],
      ],
      [],
      { weather: false },
    );
    expect(markAt(taken, 0, 0), "frozen ground beside the advance carries no mark").toBe(
      true,
    );
  });

  it("points its rime INWARD, which is how a line becomes a direction", () => {
    /*
     * A wall says how far. It cannot say which way — and "which way" is half of what the lead
     * asked for. The shards carry it, so the claim is that they point AWAY from the frost and
     * into the settlement, measured off each mark's own transform rather than off the code that
     * set it: the first draft derived the heading through `atan2(dx, dz)` and turned every shard
     * ninety degrees off its own front, which is a picture of rime running ALONG the shoreline.
     */
    const group = buildWinterGroundGroup(onLoadRows(), [], { weather: false });
    const marks = named(group, WINTER_TILE_NAMES.frostNext);
    expect(marks).toHaveLength(openingMarkCount());

    let measured = 0;
    for (const mark of marks) {
      const inward = new THREE.Vector3(-mark.position.x, 0, -mark.position.z).normalize();
      const shards = meshesUnder(mark).filter((m) => m.name === FROST_FRONT_REACH_NAME);
      expect(shards.length, "a front mark with no rime on it").toBeGreaterThan(1);
      for (const shard of shards) {
        // Toward the island's middle, allowing for the per-shard jitter and for a rim cell whose
        // one water side is not quite radial. A heading ninety degrees out scores about zero
        // here and a heading reversed scores about minus one, so the floor separates all three.
        expect(
          shardHeading(shard).dot(inward),
          `(${mark.position.x}, ${mark.position.z}) rime points outward`,
        ).toBeGreaterThan(0.3);
        measured += 1;
      }
    }
    expect(measured, "no rime measured").toBeGreaterThan(60);
  });

  it("stands ON its rung rather than half inside it", () => {
    /*
     * THE DEFECT A PHOTOGRAPH FOUND, PINNED. Both marks are box and cone geometry centred on
     * their own origin, so building them at `y = 0` on the rung buried half of each: the wall
     * stood 0.42 units of a designed 0.72 and the rime nearly vanished from the near arc of the
     * ring, where it points away from the camera and the wall is all there is left to see.
     *
     * Nothing in the layer's other assertions could see it. The mark was named, counted,
     * positioned, toned and pointed correctly, and every one of those passed. So the claim is
     * about the HEIGHT ABOVE THE RUNG, which is the number the frame was actually reading.
     */
    const group = buildWinterGroundGroup(onLoadRows(), [], { weather: false });
    // The world matrices, so the boxes below are genuinely world-space: `Box3.setFromObject`
    // calls `updateWorldMatrix(false, true)`, which does NOT walk up to the parents, so a mark
    // measured off a group nobody has updated comes back in the group's own local frame — where
    // "above the rung" is a comparison against a number that is not in the answer.
    group.updateMatrixWorld(true);
    const marks = named(group, WINTER_TILE_NAMES.frostNext);
    expect(marks).toHaveLength(openingMarkCount());
    let walls = 0;
    let rime = 0;
    for (const mark of marks) {
      const rung = mark.position.y;
      expect(rung, "the mark is not on a rung at all").toBeGreaterThan(0);
      for (const mesh of meshesUnder(mark)) {
        const box = new THREE.Box3().setFromObject(mesh);
        const above = box.max.y - rung;
        const buried = Math.max(0, rung - box.min.y) / (box.max.y - box.min.y);
        expect(above, `${mesh.name} does not stand above its rung`).toBeGreaterThan(0.3);
        if (mesh.name === FROST_FRONT_WALL_NAME) {
          /*
           * The wall is BEDDED, and the bound is asserted in both directions because both
           * failures are real pictures. Too deep and it is the centred version this test exists
           * for, which measures 0.5 and hid half the mark; not bedded at all and a run of plates
           * sitting flat on the snow reads as a fence somebody built rather than as ice shoved
           * ashore. `WALL_BED` asks for a quarter, and a tilted plate's box drops one corner a
           * little further than that, which is where the headroom above 0.25 goes.
           */
          expect(buried, `${mesh.name} is buried`).toBeLessThan(0.42);
          expect(
            buried,
            `${mesh.name} is not bedded into the ground at all`,
          ).toBeGreaterThan(0.1);
          walls += 1;
        } else {
          // The rime is not bedded at all: on the near arc it points away from the camera, so
          // every unit of height it has is a unit the wall in front of it is not hiding.
          expect(buried, `${mesh.name} is buried`).toBeLessThan(0.05);
          rime += 1;
        }
      }
    }
    // Floors on both populations, because a per-name loop over marks that had stopped drawing
    // one of their two halves would pass by never reaching that branch.
    expect(walls).toBeGreaterThan(80);
    expect(rime).toBeGreaterThan(80);
  });

  it("draws no front once the winter has ended, because nothing more is coming", () => {
    // The engine stops projecting `frost_next` at `phase: "ended"` and the thaw clears it, so
    // this is the renderer's half of the same claim: a board with the flag off draws no mark.
    // Asserted over a cell that is otherwise fully frozen, so it is the FLAG being read and not
    // an empty board.
    const group = buildWinterGroundGroup(
      [
        [
          cell({ col: 0, row: 0, frozen: true, frost_next: false }),
          cell({ col: 1, row: 0, frozen: true, frost_line: true, frost_next: false }),
        ],
      ],
      [],
      { weather: false },
    );
    expect(named(group, WINTER_TILE_NAMES.frozen)).toHaveLength(1);
    expect(named(group, WINTER_TILE_NAMES.frostLine)).toHaveLength(1);
    expect(named(group, WINTER_TILE_NAMES.frostNext)).toHaveLength(0);
  });
});

describe("a fire is a shape on a cell, never a glow", () => {
  it("stands one fire per declaration, on the cell it was declared at", () => {
    const group = buildWinterGroundGroup(
      [[cell({ col: 1, row: 1 })]],
      [fire({ col: 1, row: 1 }), fire({ col: 4, row: -3 })],
    );
    expect(named(group, WINTER_TILE_NAMES.fire)).toHaveLength(2);
    const at = named(group, WINTER_TILE_NAMES.fire)[0];
    const want = cellCenter(1, 1);
    expect(at?.position.x).toBeCloseTo(want.x, 6);
    expect(at?.position.z).toBeCloseTo(want.z, 6);
  });

  it("shows a laid hearth with no ember for a fire that never caught", () => {
    // The board has to be able to show a declaration that bought nothing: `radius === null`
    // is a real outcome of a lost batch, and a hearth that looked lit would misreport it.
    const caught = named(
      buildWinterGroundGroup([[cell()]], [fire()]),
      WINTER_TILE_NAMES.fire,
    );
    const cold = named(
      buildWinterGroundGroup([[cell()]], [fire({ radius: null })]),
      WINTER_TILE_NAMES.fire,
    );
    expect(caught[0]?.children).toHaveLength(2);
    expect(cold[0]?.children).toHaveLength(1);
  });

  /**
   * **THE SMOKE SAYS WHICH OF THE THREE IT IS, and the middle one is the state that could not
   * exist before 2026-08-02.** A column marks a fire that IS burning; a spent hearth gets the
   * brief's *"thin wisp of smoke or none at all"*; a hearth that never caught gets neither,
   * because a column would advertise a fire the board is reporting as cold and a wisp would say
   * it had burnt something.
   *
   * Asserted per state over a derived list, so a fourth state cannot be added without a decision
   * about what smoke it gets. `winterScene.test.ts` owns what the wisp IS; this owns which hearth
   * is given one.
   */
  it("gives a column to a burning hearth, a wisp to a spent one, and neither to a cold one", () => {
    const smoke: Record<string, { column: number; wisp: number }> = {};
    for (const spec of EVERY_FIRE_STATE) {
      const group = buildWinterGroundGroup([[cell()]], [spec], { weather: false });
      const stack = named(group, WINTER_TILE_NAMES.fire)[0] as THREE.Object3D;
      smoke[winterFireState(spec)] = {
        column: named(stack, SMOKE_COLUMN_NAME).length,
        wisp: named(stack, SMOKE_WISP_NAME).length,
      };
      // Every one of them is a built hearth, whatever the smoke says.
      expect(named(stack, HEARTH_NAME), winterFireState(spec)).toHaveLength(1);
    }
    expect(smoke).toEqual({
      burning: { column: 1, wisp: 0 },
      spent: { column: 0, wisp: 1 },
      never_caught: { column: 0, wisp: 0 },
    });
    // The list really covered the union, or the object above is an assertion about a subset.
    expect(Object.keys(smoke).sort()).toEqual([...WINTER_FIRE_STATES].sort());
  });

  it("has real height, so it is findable at a glance on a board of flat slabs", () => {
    const group = buildWinterGroundGroup([[cell()]], [fire()]);
    const size = new THREE.Box3()
      .setFromObject(named(group, WINTER_TILE_NAMES.fire)[0] as THREE.Object3D)
      .getSize(new THREE.Vector3());
    expect(size.y).toBeGreaterThan(1);
    expect(size.x).toBeGreaterThan(0);
  });
});

/**
 * **THE WINTER ADDS NO LIGHT. ONE MESH IN IT IS A BRIGHT FACE, AND IT IS NAMED.**
 *
 * This guard shipped as "emissive is exactly zero on every material in the layer", which was
 * right about the ground and wrong about a fire. A hearth's flame has to read as hot against
 * snow, the scene budget is four lights and no `EffectComposer`, and the only way to say
 * "bright" without a fifth lamp or a bloom pass is an emissive face — three.js emissive
 * illuminates nothing, so it is a brightness claim and not a lighting one.
 *
 * ## The loosening is a NAMED EXCEPTION, asserted in both directions
 *
 * It is deliberately NOT "winter materials may have emissive", which would let a frost tile
 * glow. The hole is: a material on a mesh called `FLAME_MESH_NAME` that sits under a mesh
 * called `HEARTH_NAME`. Both conditions, so renaming a ground tile to the flame's name does
 * not buy it an exemption either.
 *
 * A member that does not owe the property and a member that forgot it look identical from
 * outside a guard, so the list is asserted BOTH ways:
 *
 *  - every exempt material must actually BE emissive, so an exemption that has stopped
 *    excusing anything fails here instead of sitting in the list forever;
 *  - every other material must be exactly zero, which is the assertion that shipped;
 *  - and both halves carry a floor, because a containment claim holds trivially over an empty
 *    collection and an emptied layer would satisfy either loop by not looking.
 *
 * The other two claims — `flatShading` and `metalness === 0` — are NOT loosened, and hold over
 * the flame too. That is why the flame is a flat-shaded standard material with an emissive term
 * rather than the design batch's `MeshBasicMaterial`: a basic material has neither property, so
 * it would have needed three exemptions where this needs one.
 */
describe("the winter reads by geometry and tone, never by light", () => {
  /** Every material in the layer, paired with whether the flame exemption covers it. */
  function judgedMaterials(root: THREE.Object3D): {
    readonly material: THREE.MeshStandardMaterial;
    readonly exempt: boolean;
    readonly where: string;
  }[] {
    const found: {
      material: THREE.MeshStandardMaterial;
      exempt: boolean;
      where: string;
    }[] = [];
    root.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (!mesh.isMesh) {
        return;
      }
      // Both conditions: the flame's own name AND a hearth above it. A ground tile renamed to
      // the flame's name is still swept, because no hearth stands over it.
      let inHearth = false;
      for (let node: THREE.Object3D | null = mesh.parent; node; node = node.parent) {
        if (node.name === HEARTH_NAME) {
          inHearth = true;
          break;
        }
      }
      const exempt = mesh.name === FLAME_MESH_NAME && inHearth;
      for (const m of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
        found.push({
          material: m as THREE.MeshStandardMaterial,
          exempt,
          where: mesh.name || "(unnamed)",
        });
      }
    });
    return found;
  }

  it("sweeps a board that actually has every ground state on it", () => {
    // COMPOSITION, not just a count. A floor on the material total says how many were swept
    // and never WHICH: this file's own floor of 20 was met for its whole shipped life by
    // preview outlines over a round-one board with nothing frozen on it, which is how a guard
    // named for the ground came to sweep none of it. Derived from the renderer's own name table
    // rather than written out, so a state added to the layer joins this census — and every
    // sweep below it — without anybody remembering to.
    const group = buildWinterGroundGroup(liveRows(), EVERY_FIRE_STATE);
    for (const name of TILE_NAMES) {
      expect(named(group, name).length, name).toBeGreaterThan(0);
    }
    expect(named(group, WINTER_TILE_NAMES.fire)).toHaveLength(EVERY_FIRE_STATE.length);
    // ...and the fires on it really are every state, which is the other half of composition: the
    // count above is met by three copies of one hearth.
    expect(new Set(EVERY_FIRE_STATE.map(winterFireState))).toEqual(
      new Set(WINTER_FIRE_STATES),
    );
  });

  it("adds no light anywhere in the layer", () => {
    const group = buildWinterGroundGroup(liveRows(), EVERY_FIRE_STATE);
    let lights = 0;
    group.traverse((child) => {
      if ((child as THREE.Light).isLight) {
        lights += 1;
      }
    });
    expect(lights).toBe(0);
  });

  it("keeps emissive at exactly zero on everything except the named flame face", () => {
    const group = buildWinterGroundGroup(liveRows(), EVERY_FIRE_STATE);
    const judged = judgedMaterials(group);
    const swept = judged.filter((entry) => !entry.exempt);
    const exempt = judged.filter((entry) => entry.exempt);

    // Floors on BOTH halves. The original floor of 20 is kept on the swept half, so the
    // loosening cannot be what made the strict sweep vacuous; and the exempt half has one of
    // its own, so a decorative exemption over nothing fails here.
    expect(swept.length).toBeGreaterThanOrEqual(20);
    expect(exempt.length).toBeGreaterThanOrEqual(2);

    for (const entry of swept) {
      expect(entry.material.emissive?.getHex() ?? 0, entry.where).toBe(0);
    }
    // The other direction: an exempt material that has stopped being emissive is an exemption
    // excusing nothing, and it fails rather than quietly widening the hole.
    for (const entry of exempt) {
      expect(entry.material.emissive?.getHex() ?? 0, entry.where).not.toBe(0);
      expect(entry.material.emissiveIntensity, entry.where).toBeGreaterThan(0);
    }
  });

  it("does not loosen flat shading or metalness, not even for the flame", () => {
    const group = buildWinterGroundGroup(liveRows(), EVERY_FIRE_STATE);
    const judged = judgedMaterials(group);
    expect(judged.length).toBeGreaterThanOrEqual(22);
    // Including the exempt ones — which is the whole reason the flame is a standard material.
    expect(judged.some((entry) => entry.exempt)).toBe(true);
    for (const entry of judged) {
      expect(entry.material.flatShading, entry.where).toBe(true);
      expect(entry.material.metalness, entry.where).toBe(0);
    }
  });

  it("gives the flame to a fire that caught and withholds it from one that did not", () => {
    // The exemption is for a FLAME, so a hearth with no flame in it must have nothing exempt —
    // otherwise the hole is "a hearth", which is wider than the claim.
    const caught = judgedMaterials(
      buildWinterGroundGroup([[cell()]], [fire()], { weather: false }),
    );
    const cold = judgedMaterials(
      buildWinterGroundGroup([[cell()]], [fire({ radius: null })], { weather: false }),
    );
    expect(caught.filter((entry) => entry.exempt).length).toBeGreaterThan(0);
    expect(cold.filter((entry) => entry.exempt)).toHaveLength(0);
    // ...and the cold hearth's own stones are swept and clean, so it is not exempt by being empty.
    expect(cold.length).toBeGreaterThanOrEqual(9);
    for (const entry of cold) {
      expect(entry.material.emissive?.getHex() ?? 0, entry.where).toBe(0);
    }
  });
});

describe("mastery gold is reserved and never appears on the winter", () => {
  it("keeps it out of every token in both tables", () => {
    // The BOARD-STATE tones and the SCENE tones. The per-tier preview table used to be the
    // second half of this sweep and no longer exists — a fire's candidate ground is drawn in
    // the held-ground ochre it would become, so the tones it can reach are these two tables
    // plus the flame's, which the scene table carries.
    const tones = [
      ...Object.values(WINTER_GROUND_TONES),
      ...Object.values(WINTER_SCENE_TONES),
    ];
    // A floor, so an emptied token table cannot satisfy this by having nothing to check.
    expect(tones.length).toBeGreaterThanOrEqual(11);
    for (const tone of tones) {
      expect(tone).not.toBe(MASTERY_GOLD);
    }
  });

  it("keeps it out of every rendered material, whatever the tokens are named", () => {
    // The tables above are what this file can see; the sweep is over what actually ships, so
    // a colour introduced straight into the geometry is caught too.
    const group = buildWinterGroundGroup(liveRows(), EVERY_FIRE_STATE);
    const colors = materialsOf(group).map((m) => m.color.getHex());
    expect(colors.length).toBeGreaterThanOrEqual(20);
    for (const color of colors) {
      expect(color).not.toBe(MASTERY_GOLD);
    }
  });
});
