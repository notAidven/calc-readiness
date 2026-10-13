import { type WinterCellView, type WinterFire, winterFireState } from "@cr/game";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

import { CURRENT_ERA_ID } from "../eraDressing";
import type { RoadCell } from "../roads";
import { cellCenter, GRID_CELL, SEA_RADIUS } from "../worldLayout";
import { roadStackTop } from "./Roads";
import { GROUND_DECAL_STEP, WATERLINE_Y } from "./StarterIsland";
import {
  buildHearth,
  buildSmokeColumn,
  buildSmokeWisp,
  HEARTH_NAME,
  SMOKE_COLUMN_NAME,
  updateFire,
} from "./winterFire";
import {
  buildFireGhostPatch,
  buildGhostHearth,
  buildHeldGroundTile,
  FIRE_GHOST_HEARTH_NAME,
  FIRE_GHOST_PATCH_NAME,
  WARDED_TERRAIN,
} from "./winterFireGhost";
import {
  buildFrostFrontGroup,
  FROST_FRONT_NAME,
  FROST_FRONT_SIDES,
  type FrostFrontApproach,
  type FrostFrontSide,
} from "./winterFrostFront";
import {
  ALL_EXPOSED,
  buildCellTerrain,
  buildFrostMargin,
  buildFrozenLagoon,
  buildSnowCourse,
  buildTroddenPaths,
  CELL_MAX_DISH,
  type CellExposure,
  type CellTerrainSpec,
  isFrostMarginCell,
  SNOW_COURSE_RELIEF,
  WIND_DEG,
} from "./winterScene";
import { buildSnowfall, updateSnowfall } from "./winterSnowfall";
import { WINTER_GROUND_TONES } from "./winterTones";

/**
 * **THE WINTER, ON THE ISLAND THE PLAYER BUILT.**
 *
 * The crisis was only ever legible on a 2D debugging grid (`winter/WinterGrid.tsx`). This is
 * the same board drawn on the real island: frost creeping over the cells the player laid
 * buildings on, fires standing where they were placed, and the ground each fire is holding.
 *
 * ## ONE WINTER LAYER, AND THE SCENE ASSETS LIVE IN IT
 *
 * The 2026-07-30 scene-asset batch's snow course, trodden paths, frozen lagoon, hearth, smoke
 * column and falling snow are all built HERE, into the group this file returns, on the ladder
 * this file owns. That is a deliberate refusal of the obvious alternative: a second "winter
 * weather" component mounted beside this one would have put two systems in charge of one
 * picture, with two depth ladders over one ground plane — the defect `Roads.tsx`'s own note
 * documents and `depthPrecision.test.ts` pins. The board states and the weather are one layer.
 *
 * **IT IS A RENDERING PROBLEM AND NOTHING ELSE, which is why nothing here computes.** The
 * engine already projects every ground state a renderer needs — `hardWinterView` hands back
 * rows of {@link WinterCellView} carrying `frozen`, `frost_line`, `frost_next`, `warded` and
 * `preview_tier` — and `winterCellKey` and `roadCellKey` are
 * the same key, so a cell means the same cell on both boards with nothing scaled or offset. This
 * file maps those flags to geometry and tone, exactly as `WinterGrid` maps them to CSS classes.
 * Two renderers, one view model, no second source of truth about what is frozen.
 *
 * `frost_next` is the one that took an engine change rather than a renderer one, and the reason
 * is this rule and not an exception to it: *where does the frost arrive next* is the reducer's
 * own advance, so the engine now runs `winterFrostAfterAdvance` for the view and for `end_round`
 * alike. A renderer that flooded the grid itself would have been a second timetable, checked
 * nowhere, free to promise ground the rules would not take.
 *
 * ## THE FROST'S OWN EDGE IS THE ONLY THING HERE THAT IS NOT A CELL FILL
 *
 * Every state above is drawn as terrain lying IN its cell. The front is not: it is standing
 * shove ice on the boundary and rime reaching across the cell, because it is the one state whose
 * subject is a BOUNDARY and a direction rather than a patch of ground, and because a board that
 * is already entirely white has no pale fill left that would mark anything. See
 * `winterFrostFront.ts`, which owns the whole spec and the measurement behind it.
 *
 * ## Every state reads as TERRAIN, by facet and value. None of them reads by light
 *
 * There is no light, no ambient occlusion, no specular and no rim light anywhere in this
 * layer. What each state has instead is the treatment the rest of the island already has: a
 * faceted, value-varied surface with an edge where the state ends (`buildCellTerrain`, and
 * see `TERRAIN` below for the four channels that keep the states tellable apart). Every one of
 * them was a flat single-tone full-cell quad before, which is why each in turn read as colour
 * painted onto the map rather than as ground.
 *
 * **The one exception is the flame, and it is named.** A hearth's flame carries an emissive
 * term, because the scene budget is four lights and no `EffectComposer` and a bright face is
 * the only way left to say "hot"; three.js emissive brightens its own face and illuminates
 * nothing, so it is a brightness claim rather than a lighting one. It is a NAMED exemption in
 * `winterGround.test.ts` (the flame's mesh name, under a hearth) and everything else in the
 * layer is still swept for emissive exactly zero — including the fire's own stones and fuel.
 *
 * ## The two provisional states are drawn as provisional
 *
 * `preview_tier` (ground a fire WOULD hold) and `preview_abandon` (ground a pull-back WOULD
 * give up) are hypotheses about a declaration nobody has made. They are drawn as raised
 * OUTLINES rather than fills, so they never read as something that has happened — and they
 * get deliberately different treatments from each other, because one is ground held and the
 * other is ground lost, and confusing them would invert the decision.
 */

/* -------------------------------------------------------------------------- */
/* The depth ladder — continued, not restarted                                */
/* -------------------------------------------------------------------------- */

/**
 * Where winter course `index` (0 = lowest) puts its top face, in world Y.
 *
 * The winter layer sits ABOVE the whole road stack, which is forced rather than chosen: frost
 * falls on paved cells as well as bare ones, so a frozen road has to read as frozen. It
 * therefore continues the ONE ladder the island and the roads already share
 * (`GROUND_DECAL_STEP`) from the highest face the roads present, instead of starting a second
 * one — the mistake `Roads.tsx`'s own note documents and `depthPrecision.test.ts` pins.
 *
 * Derived from `roadStackTop`, so an era that surfaces its roads with more courses pushes the
 * winter up with it and cannot end up underneath them.
 */
export function winterCourseTop(index: number): number {
  return roadStackTop(CURRENT_ERA_ID) + (index + 1) * GROUND_DECAL_STEP;
}

/**
 * How many rungs the snow course's own relief consumes.
 *
 * **THE SNOW COURSE IS NOT FLAT, AND THAT IS WHAT MAKES THIS NUMBER NECESSARY.** The course
 * jitters `SNOW_COURSE_RELIEF` world units above its base so it facets under the flat shading;
 * a board state placed one 0.05 rung above the base would therefore disappear into the nearest
 * snow bump for most of the disc. So the states start at the first rung ABOVE the course's
 * crest, derived from the relief rather than hand-counted, and `winterGround.test.ts` pins the
 * clearance.
 */
const COURSE_RUNGS = Math.ceil(SNOW_COURSE_RELIEF / GROUND_DECAL_STEP);

/**
 * How many rungs a state's own relief consumes UNDER its rung.
 *
 * **THE STATES SINK, WHICH IS WHY THIS IS BELOW THE RUNG AND NOT ABOVE IT.** A cell is terrain
 * now (`buildCellTerrain`) and its surface dishes below its rung by up to `CELL_MAX_DISH`, so
 * the first board rung has to clear the snow course's crest by at least that much or the course
 * pokes up through the dish. Sinking rather than rising is what keeps the LADDER unchanged
 * above the first rung: a state can never reach the plane of the state stacked over it, so the
 * six states still sit one 0.05 step apart and a cell that is abandoned AND frozen AND under a
 * preview still draws all three without a z-fight.
 *
 * Derived from the builder's own ceiling rather than hand-counted, and
 * `winterGround.test.ts` measures the built geometry against the crest instead of trusting
 * this arithmetic.
 */
const DISH_RUNGS = Math.ceil(CELL_MAX_DISH / GROUND_DECAL_STEP);

/** The rung the snow course's base sits on: the lowest thing the winter puts down. */
const SNOW_RUNG = 0;

/**
 * The rungs, in the order a cell stacks them. A cell can hold several at once — abandoned
 * ground can be frozen, frozen ground can be warded, and any of it can be under a preview —
 * so each state owns a rung and they are never coplanar with one another.
 *
 * They start above the snow course rather than at zero, because the course is now the ground
 * every state is painted onto.
 */
const STATE_BASE_RUNG = SNOW_RUNG + COURSE_RUNGS + DISH_RUNGS + 1;
const RUNG = {
  frozen: STATE_BASE_RUNG,
  frostLine: STATE_BASE_RUNG + 1,
  /**
   * The front sits with the frost family and above it, because it is the frost's own leading
   * edge one beat early. It shares a cell with either provisional preview (a fire can be aimed
   * at the ground the round is taking, and a pull-back's ring can be the same ring) and stands
   * through both, which is right: a fact standing through a proposal.
   */
  frostNext: STATE_BASE_RUNG + 2,
  warded: STATE_BASE_RUNG + 3,
  /*
   * **TWO RUNGS CAME OUT WITH THE GIVE-UP-GROUND ACTION (2026-08-02)**, and the numbering is left
   * with a gap at 4 and 6 rather than closed up: the ladder's spacing is what
   * `winterGround.test.ts` measures, and re-numbering it would move every state above the gap for
   * no reason. The finding one of them recorded is worth keeping, because the next ground state
   * that has no way back inherits it:
   *
   * *"ABANDONED IS ABOVE THE FROST, AND IT USED TO BE UNDER IT. It sat on the lowest rung, which
   * made the legend's fourth entry — 'given up for good' — invisible on every real board: measured
   * on a played winter, all 28 abandoned cells were also frozen, and a full-cell frost fill one
   * rung higher covers a full-cell scar completely. A state the player cannot see is not a state
   * they can tell apart, and this one has no way back, so it is the last word on a cell rather
   * than the first."* §3.5 of the art brief asks for exactly that: a durable ground state *"needs
   * to survive being under snow, since snow will fall on it too"*.
   */
  preview: STATE_BASE_RUNG + 5,
} as const;

/**
 * Where the trodden paths' slush lies: on the snow course, under every board state.
 *
 * A path is a fact about the SNOW (it is thinner where people walk), not a fact about the
 * board, so frost, a ward and an abandonment all have to be able to show over one. It shares
 * the course's crest rung rather than taking a rung of its own — nothing else is up there, and
 * the two cannot overlap in plan with anything that is.
 */
const PATH_RUNG = SNOW_RUNG + COURSE_RUNGS;

/** The base and crest of the snow course, in world Y. Exported for the ladder's tests. */
export function snowCourseBase(): number {
  return winterCourseTop(SNOW_RUNG);
}
export function snowCourseCrest(): number {
  return snowCourseBase() + SNOW_COURSE_RELIEF;
}

/** How far a state's tile is bedded below its rung, so only the top and a lip are ever seen. */
export const SLAB_THICK = 1.0;

/* -------------------------------------------------------------------------- */
/* Tones — cold, and none of them mastery gold                                */
/* -------------------------------------------------------------------------- */

/**
 * Every tone this layer draws.
 *
 * They live in `winterTones.ts` and are re-exported here so nothing has to know that: the
 * in-city legend has to name the same tones the island wears, and it is reached from a static
 * import graph that must not pull `three` in. See that file for the whole of the reason.
 *
 * There is no longer a per-tier PREVIEW table beside them. The tier bands used to be three
 * blues, and a fire's candidate ground is now drawn as the ochre held ground it would actually
 * become — see `winterFireGhost.ts` for why the hue was the defect and not just the shape.
 */
export { WINTER_GROUND_TONES } from "./winterTones";

/* -------------------------------------------------------------------------- */
/* Shared geometry and materials                                              */
/* -------------------------------------------------------------------------- */

/**
 * **HOW EACH STATE IS BUILT AS TERRAIN, AND HOW FOUR OF THEM STAY TELLABLE APART.**
 *
 * Every state used to be one flat full-cell quad in one tone, which is why each of them in turn
 * read as colour painted onto the map rather than as ground. They now all go through
 * `buildCellTerrain`, so the fix is at the layer and a state added later inherits it.
 *
 * **The states are read apart by FOUR channels and only one of them is hue**, which is the
 * constraint that shaped this table: faceting and tonal variation are exactly the things that
 * could blur four flat colours into four similar mottled patches, and there is a legend on
 * screen because the player acts on the difference.
 *
 * | | value | dish (relief) | facets | edge |
 * | --- | --- | --- | --- | --- |
 * | frozen | palest | shallowest, 0.09 | 3 | a **lip** at full rung height |
 * | frost line | one cold step down | deepest, 0.14 | 3 | a **crest** standing 0.04 proud |
 * | held by a fire | warm bare earth | 0.12 | 4 | **feathered**, pulled back and sunk |
 * | given up for good | far darkest | 0.13 | 4 | **churned**, broken at every vertex |
 *
 * **The frost line is deliberately the sharpest**, because its own legend entry is "the only
 * part that moves next" and a player reads it to predict where the damage lands: it is the one
 * state whose edge RISES above its rung, and its interior dishes deepest, so the crest reads as
 * a directional leading edge against the flatter sheet of frost behind it. That is §3.2 of the
 * art brief ("the frost line is not a stage, it is an edge") drawn rather than described.
 *
 * **What it could never do is exist before the frost did**, and that is the gap `frost_next`
 * fills rather than a fault in the crest: a frost line is by definition frozen ground, so on
 * load there were none of them. The front stands on the OTHER side of the same seam, so where
 * both are on the board the crest rises on the frozen side and the shove ice stands on the side
 * the frost has not taken — one ridge, said twice, in the two states' own vocabularies.
 *
 * **What was traded, since the two halves genuinely pull against each other.** A feathered edge
 * is a softer boundary than a cell-square fill, and held ground is load-bearing information —
 * the player is choosing where a fire goes. So the feather is bounded: it pulls the rim back by
 * at most `FEATHER_INSET` (0.5 of a 4-unit cell, an eighth), only on sides where the held area
 * actually ends, and it keeps the cell's own corners at the corner. The extent stays countable
 * and the cross stops reading as a grid selection. Nothing else takes a plan-space edge at all.
 */
const TERRAIN: Readonly<Record<string, CellTerrainSpec>> = {
  frozen: {
    color: WINTER_GROUND_TONES.frost,
    dish: 0.09,
    segments: 3,
    edge: "lip",
    // The snow course's own three-tone spread, so frost facets like the snow it lies on.
    values: [0.8, 0.89, 1.0],
  },
  frostLine: {
    color: WINTER_GROUND_TONES.frostLine,
    dish: 0.14,
    segments: 3,
    edge: "crest",
    values: [0.74, 0.86, 1.0],
  },
  // NOT a literal, and that is deliberate. `winterFireGhost.ts` owns the one held-ground
  // treatment and draws the fire PREVIEW from it, so a re-tone here cannot leave the preview
  // promising ground that no longer looks like this. Its own note carries the values: era
  // one's bare earth, reaching down toward `earthWorn` (`#B2854F`), feathered at the rim.
  warded: WARDED_TERRAIN,
  /*
   * **THE ABANDONED TERRAIN CAME OUT WITH ITS ACTION (2026-08-02)**, and the spec it carried is
   * recorded here because it is the only churned-ground treatment this layer has ever had and the
   * next durable ground state should start from it rather than from nothing:
   * `color: WINTER_GROUND_TONES.abandoned`, `dish: 0.13`, `segments: 4`, `edge: "churn"`, and
   * values `[0.72, 0.88, 1.0, 1.18]` — one step ABOVE the tone, unlike any other state, because
   * broken spoil catching the flat key light is what makes churned ground read as churned rather
   * than as a dark hole.
   *
   * **THE TONE ITSELF STAYS AND IS STILL DRAWN**, by `ScarredGround.tsx`, which is the city's own
   * layer for a scar that outlives the thaw and is fed by persisted damage rather than by a winter.
   */
} as const;

/**
 * **HELD GROUND IS NOT DRAWN UNDER A BUILDING, AND HERE IS WHY THAT LOSES NOTHING.**
 *
 * The lead: *"also the fire-protected squares that overlap with buildings look terrible; just
 * make the fire not show when it overlaps with the building"*. A building is contain-fit to
 * `FOOTPRINT_FILL` (0.95) of its plot, so the ochre never read as ground the building stood on:
 * it read as a tan collar peeking out round the model's base, and per tile it is a tan collar
 * with a feathered rim in it.
 *
 * ## The obvious objection is that this hides the fact that the building is protected
 *
 * **For the buildings the winter actually models, it does not, because #502 moved that fact into
 * words.** A building's floating caption during a crisis IS its status — FROZEN, SHIELDED, IN
 * DANGER or SAFE (`CRISIS_LABEL_TEXT`) — and `winterThreatenedNodeIds` folds a warded cell into
 * not-threatened, so a building a fire is holding reads SAFE or SHIELDED and can never read IN
 * DANGER. The ground under it was the third channel saying so, behind the caption and behind the
 * hearth and smoke column standing a cell or two away, and it was the worst-looking of the three.
 * `SkillLabels.tsx`'s own note on why a warded building is `safe` rather than a state of its own
 * lists that ground as one of its three channels; it is now two, which is what that note says.
 *
 * ## ⚑ AND THERE IS A POPULATION THE CAPTION DOES NOT COVER, WHICH IS REPORTED RATHER THAN RELIED ON
 *
 * **A bought CIVIC building gets no caption at all**, and this was checked rather than assumed.
 * `skillLabelTargets` captions a placement iff the skill graph knows it, plus the hub while a
 * crisis is on; a civic placement id is deliberately not in the graph. It is still drawn on the
 * island — `CitySurface`'s `scenePlaced` concatenates the civic placements onto the skill ones —
 * so a civic building can stand on ground a fire is holding with no word over its head.
 *
 * That is a hole in the caption and it is NOT widened here, because there is no protection fact
 * about a civic building for this ground to have been carrying: `liveCityLayoutFrom` builds the
 * winter board from `placements` and `town_hall` and nothing else, so a civic building is not on
 * the board, cannot be warded, threatened, shielded or ruined, and takes no damage either way.
 * The tan under one was a fact about the CELL and never about the building.
 *
 * So the rule is applied to every building the renderer draws rather than only to the captioned
 * ones — one visual rule, because a tan collar round one building and not round its neighbour is
 * a distinction the player has no way to read. `winterHeldGroundPerTile.test.ts` asserts both
 * halves of that reasoning in both directions, so the day a civic building joins the winter board
 * without gaining a caption, it fails there instead of shipping.
 *
 * A function rather than an inline `has`, so the rule is one named thing a guard can put a board
 * to without rebuilding a scene graph to find out what the renderer would have done.
 */
export function heldGroundIsDrawnOn(
  col: number,
  row: number,
  buildingCells: ReadonlySet<string>,
): boolean {
  return !buildingCells.has(`${col},${row}`);
}

/** Outline bar width — thick enough to read at full zoom-out, thin enough to stay an outline. */
const OUTLINE_BAR = 0.55;
const OUTLINE_SPAN = GRID_CELL - 0.35;
const OUTLINE_OFFSET = OUTLINE_SPAN / 2 - OUTLINE_BAR / 2;
const OUTLINE_H = 0.34;
const OUTLINE_GEO_EW = new THREE.BoxGeometry(OUTLINE_SPAN, OUTLINE_H, OUTLINE_BAR);
const OUTLINE_GEO_NS = new THREE.BoxGeometry(OUTLINE_BAR, OUTLINE_H, OUTLINE_SPAN);

const MATERIALS = new Map<number, THREE.MeshStandardMaterial>();

/**
 * A flat-shaded material per tone, cached — for the PREVIEW OUTLINES, which are bars and not
 * ground. The ground states are faceted terrain and take their material from
 * `buildCellTerrain` instead. Nothing either function makes is emissive: the only emissive
 * material in the layer belongs to the flame, and `winterFire.ts` owns it.
 */
function tone(color: number): THREE.MeshStandardMaterial {
  const cached = MATERIALS.get(color);
  if (cached) {
    return cached;
  }
  const made = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.94,
    metalness: 0,
    flatShading: true,
  });
  MATERIALS.set(color, made);
  return made;
}

/** Names, so tests can count a state's tiles without reaching into the geometry. */
export const WINTER_TILE_NAMES = {
  frozen: "winter-frozen-tile",
  frostLine: "winter-frost-line-tile",
  /**
   * Ground the frost takes when this round CLOSES — the one mark on the board that exists
   * before the frost has taken anything, and the answer to "where does it start". A group of
   * standing shove ice and rime rather than a tile, because it is a thing arriving on ground it
   * does not hold yet; `winterFrostFront.ts` owns the whole spec.
   */
  frostNext: FROST_FRONT_NAME,
  warded: "winter-warded-tile",

  /** A candidate cell's GHOSTED held ground — what a fire here would take. */
  preview: FIRE_GHOST_PATCH_NAME,

  fire: "winter-fire",
} as const;

/**
 * The proposed hearth, which is NOT in the per-cell table above and should not be.
 *
 * That table is one entry per CELL STATE, swept by a guard that puts every state on one cell
 * and expects one tile each. The ghost hearth is a single object standing on the one cell the
 * fire would be lit on, so it has its own name and its own assertions.
 */
export { FIRE_GHOST_HEARTH_NAME };

/**
 * One cell of a state, as terrain on its rung.
 *
 * `held` is every cell in the SAME state, so the builder knows which of the four sides the
 * state actually ends on — an edge treatment is owed where a state stops and nowhere else,
 * which is what lets two frozen cells merge into one sheet while the pair of them still shows
 * a boundary.
 */
function addFill(
  group: THREE.Object3D,
  col: number,
  row: number,
  rung: number,
  spec: CellTerrainSpec,
  name: string,
  held: ReadonlySet<string> | null,
): void {
  const { x, z } = cellCenter(col, row);
  const mesh = buildCellTerrain(
    spec,
    x,
    z,
    winterCourseTop(rung),
    SLAB_THICK,
    held ? exposureOf(held, col, row) : ALL_EXPOSED,
  );
  mesh.name = name;
  group.add(mesh);
}

/** Which of a cell's four sides have no neighbour in the same state. */
function exposureOf(held: ReadonlySet<string>, col: number, row: number): CellExposure {
  return {
    north: !held.has(`${col},${row - 1}`),
    south: !held.has(`${col},${row + 1}`),
    west: !held.has(`${col - 1},${row}`),
    east: !held.has(`${col + 1},${row}`),
  };
}

/** The neighbour a side of `(col, row)` faces, as a key. */
const NEIGHBOUR: Readonly<Record<FrostFrontSide, readonly [number, number]>> = {
  north: [0, -1],
  south: [0, 1],
  east: [1, 0],
  west: [-1, 0],
};

/** One cell of the front, and which way the frost comes at it. */
export interface FrostFrontStand {
  readonly col: number;
  readonly row: number;
  readonly approach: FrostFrontApproach;
}

/**
 * **WHERE THE FRONT STANDS: ON THE ICE, ONE FULL RING OUTSIDE THE GROUND THE ROUND WILL TAKE.**
 *
 * The lead, having played it: *"the initial ring is still too close bro; it needs to start one
 * layer out."* This function is that ring, and the change is WHICH CELLS carry the mark rather
 * than anything about how a mark is built — `winterFrostFront.ts` is untouched.
 *
 * ## WHAT WAS WRONG, AND `buildFrostMargin` IS WHAT MADE IT WRONG
 *
 * The mark used to be drawn on every `frost_next` cell: the wall on that cell's water-facing
 * sides and the rime lying across the cell inward. At round one that is the board's outermost
 * ring, so the ice stood between world radius 18 and 22 with the settlement's own outer ring of
 * buildable ground UNDERNEATH it — measured on the photographed board, the outermost building
 * (`NUM.2`) is a depth-0 cell, so the front opened standing on it, nought cells clear.
 *
 * That placement was right while the ground outside the board was open island: shove ice at the
 * shoreline is ice arriving on land. It stopped being right the day {@link buildFrostMargin}
 * landed. The margin draws every off-board cell of the island in the board's own frost tone, so
 * the frost already HOLDS the ring outside the board — and shove ice is ice pushed up out of a
 * sheet, not a fence planted on the ground ahead of it. The mark was standing one ring inside
 * the ice it is pushed up from.
 *
 * ## THE RULE: ONE RING, THE STAND RING, AND NOTHING ELSE
 *
 * **The mark is drawn on ground the frost already HOLDS which touches ground this round takes**
 * — an off-board margin cell, or a frozen board cell — and on nothing else. It carries the WALL
 * on the sides facing the frost's own deeper holdings, so the plates have the sheet at their
 * back, and the rime reaching inward off that same cell, which is the heading.
 *
 * Worked through era one's five bands:
 *
 *   | round | frozen | takes | the one ring | wall at |
 *   |-------|--------|-------|--------------|---------|
 *   |   1   | none   | 0     | off-board    | the margin's outer edge, r ≈ 26 |
 *   |   2   | 0      | 1, 2  | 0            | the board's own edge, r ≈ 22    |
 *   |   3   | 0,1,2  | 3, 4  | 2            | the depth-1/2 seam              |
 *
 * ## ⚑ IT WAS `K` RINGS WIDE UNTIL 2026-08-04, AND THAT IS THE DOUBLE RING
 *
 * The lead, for at least the fifth time: *"the double ice ring in the winter crisis is still
 * there. it should always just be one ring bro like for the 50th time there shouldnt be two
 * concentric rings once the frost moves"*.
 *
 * The band used to be as many cell rings wide as the round had STEPS: the stand ring, plus
 * *"layers 1..K-1, the shallower cells of the coming advance, rime only"*. Era one's schedule is
 * 1 / 2 / 3, so round one drew one ring and rounds two and three drew **two** — which is exactly
 * *"once the frost moves"*, and it is why neither of the two previous fixes in this area touched
 * it. Measured on the boards a player actually reaches, before the change: round one marked 32
 * cells on one ring; **round two marked 28 cells on rim depth 0 carrying 120 wall plates, and a
 * further 24 cells on rim depth 1 carrying no wall at all and 72 rime shards** — a second,
 * wall-less ring of blue spikes a full cell inside the first. Round three: 16 cells on depth 2
 * with the wall, 12 more on depth 3 with 36 shards and no wall.
 *
 * **What the width was buying is given up rather than forgotten.** It was the one channel
 * saying *how deep is this round* on the ground — {@link FROST_FRONT_REACH_NAME}'s own note
 * claimed it — and a two-step round now reads exactly like a one-step round at the front. The
 * reading survives elsewhere and is not lost from the product: the crisis panel states the
 * round's advance in words, and the frost's own extent grows by those rings when the round
 * closes whether or not the front was drawn over them a beat early.
 *
 * `frostFrontOneRing.test.ts` counts the rings on every round of a played winter, so a band that
 * widens again fails there rather than being reported a sixth time.
 *
 * ## WHAT THIS DOES NOT TOUCH, WHICH IS THE HALF THAT COULD HAVE COST THE ENCOUNTER
 *
 * Nothing here reaches the engine. `WinterCellView.frost_next` is read exactly as before and is
 * not written; `winterFrostAfterAdvance` still decides what freezes and when; the schedule is
 * still `spread` 1 / 2 / 3 over three rounds, so the frost still reaches the heart of the
 * settlement as the last round closes. The picture moved and the timetable did not, which is
 * what `frostFrontRing.test.ts` asserts in both directions.
 *
 * A cell a fire is holding is neither held nor taken, so it is in no layer and gives no wall —
 * the front still dents visibly around a bonfire, exactly as it did.
 */
export function frostFrontMarks(
  land: ReadonlySet<string>,
  frozen: ReadonlySet<string>,
  frostNext: ReadonlySet<string>,
): FrostFrontStand[] {
  if (frostNext.size === 0) {
    return [];
  }
  const parse = (key: string): { col: number; row: number } => {
    const [col, row] = key.split(",");
    return { col: Number(col), row: Number(row) };
  };
  // Ground the frost HOLDS: a frozen board cell, or any off-board cell of the island, which the
  // margin has drawn in the frost's own tone since 2026-08-02. Asked through the margin's own
  // predicate so the two cannot disagree about where the ice reaches.
  const holds = (key: string): boolean =>
    frozen.has(key) ||
    (!land.has(key) && isFrostMarginCell(parse(key).col, parse(key).row, GRID_CELL));

  /*
   * THE ONE RING: the ice that touches the ground this round takes.
   *
   * There is no breadth-first walk under this any more. There used to be one, spreading a
   * `layerOf` map over the coming advance so the band could be `K` rings wide for a `K`-step
   * round; that map is the double ring, and the note above records what it drew and what
   * dropping it costs.
   */
  const marked = new Set<string>();
  for (const key of frostNext) {
    const { col, row } = parse(key);
    for (const side of FROST_FRONT_SIDES) {
      const [dc, dr] = NEIGHBOUR[side];
      const neighbour = `${col + dc},${row + dr}`;
      if (holds(neighbour)) {
        marked.add(neighbour);
      }
    }
  }

  const marks: FrostFrontStand[] = [];
  for (const key of marked) {
    const { col, row } = parse(key);
    const wall: FrostFrontSide[] = [];
    const approach: FrostFrontSide[] = [];
    for (const side of FROST_FRONT_SIDES) {
      const [dc, dr] = NEIGHBOUR[side];
      const neighbour = `${col + dc},${row + dr}`;
      // A WALL side faces the frost's own settled ice — the sheet the plates were shoved out
      // of — and never the ground ahead. Every marked cell is now on the one ring, so that is
      // any neighbour the frost holds which is not itself part of the ring: further out at
      // round one, and the settled sheet behind the band from round two on.
      if (!marked.has(neighbour) && holds(neighbour)) {
        wall.push(side);
        approach.push(side);
      }
    }
    marks.push({ col, row, approach: { wall, approach } });
  }
  return marks;
}

/**
 * A raised outline around a cell — four bars, no fill. The provisional treatment: it frames
 * ground without claiming anything has happened to it, and it leaves the state UNDERNEATH
 * visible, which a fill would hide (the player aiming a fire needs to see what is already
 * frozen inside the band they are considering).
 */
function addOutline(
  group: THREE.Object3D,
  col: number,
  row: number,
  rung: number,
  color: number,
  name: string,
): void {
  const { x, z } = cellCenter(col, row);
  const y = winterCourseTop(rung);
  const material = tone(color);
  const frame = new THREE.Group();
  frame.name = name;
  for (const [geo, dx, dz] of [
    [OUTLINE_GEO_EW, 0, OUTLINE_OFFSET],
    [OUTLINE_GEO_EW, 0, -OUTLINE_OFFSET],
    [OUTLINE_GEO_NS, OUTLINE_OFFSET, 0],
    [OUTLINE_GEO_NS, -OUTLINE_OFFSET, 0],
  ] as const) {
    const bar = new THREE.Mesh(geo, material);
    bar.position.set(dx, 0, dz);
    frame.add(bar);
  }
  frame.position.set(x, y, z);
  group.add(frame);
}

/**
 * The hearth's ring radius. Inside one cell, so two adjacent fires never intersect.
 *
 * **Exported since 2026-08-02, and the reason is a clearance that was guessed.** `winterFire.ts`
 * sizes the smoke column's floor to clear the flame's tip, and a flame's tip is a multiple of THIS
 * number — so its `COLUMN_BASE` was a world constant standing in for a radius it could not see, and
 * it stood 0.4u short, putting the lowest puff inside the flame. A test that wants to check the
 * clearance holds has to be able to ask what radius ships rather than keeping a copy.
 */
export const HEARTH_RADIUS = GRID_CELL * 0.3;

/**
 * A lit fire, standing ON the cell rather than lying in it — the one thing in this layer with
 * real height, because a fire is the player's own mark on the board and has to be findable at
 * a glance.
 *
 * **THE GEOMETRY IS NOW THE DESIGN BATCH'S HEARTH** (`winterFire.ts`), which replaced a
 * seven-sided cylinder ring with a cone in it at exactly this scale.
 *
 * The SMOKE COLUMN is what actually marks the fire's position at the shipped camera, because
 * a three-unit hearth disappears behind the first building between it and the eye. It hangs
 * under the same named group, so a test that counts fires counts one thing per declaration.
 *
 * **`rounds_left` REACHES A MESH HERE, WHICH IT DID NOT USED TO.** This function spent only
 * `radius !== null` on the view, so the fire's duration — a ladder the tuning has run since it
 * was measured — was drawn nowhere at all. `winterFire.ts` takes it into the fuel stack, the
 * flame's height and, since the 2026-08-02 ruling, the SMOKE COLUMN'S REACH, and into nothing
 * that moves what the fire COVERS: the ring, the warded tile and the column's foot are the same
 * at every step, because duration is not width.
 *
 * **AND ALL THREE OF THE ENGINE'S FIRE STATES ARE DRAWN HERE, the third of them since
 * 2026-08-02.** `radius !== null` was every state there was while a hearth was DELETED from
 * `state.fires` the round its fuel ran out. It is not now: a spent hearth stays on the board, and
 * that same expression would have drawn it in full blaze with a smoke column over it, warding
 * nothing — visibly worse than the deletion it replaced. The state is `winterFireState`'s to
 * decide, so the picture and the rules cannot disagree about which hearth is which, and the smoke
 * follows it: a column for a fire that is burning, a wisp for one that has gone out, and nothing at
 * all over one that never caught.
 */
function addFire(group: THREE.Object3D, fire: WinterFire): void {
  const { x, z } = cellCenter(fire.col, fire.row);
  const base = winterCourseTop(RUNG.warded);
  const state = winterFireState(fire);
  const stack = new THREE.Group();
  stack.name = WINTER_TILE_NAMES.fire;
  stack.add(buildHearth(HEARTH_RADIUS, state, fire.rounds_left));

  // Seeded off the cell, so two hearths tumble out of step and the same board looks the same on
  // a reload. A hearth that never caught gets neither: a column over one would advertise a fire
  // the board is reporting as cold, and a wisp would say it had burnt something.
  const seed = fire.col * 31 + fire.row * 17;
  if (state === "burning") {
    // AND THE DURATION GOES UP THE COLUMN, which is the 2026-08-02 ruling: the hearth is three
    // world units inside a ring of stones and does not have the pixels for three states, so the
    // 26-unit column carries the read and the fuel stack corroborates it. Same `rounds_left` into
    // both, so the two channels cannot disagree about which round it is.
    stack.add(buildSmokeColumn(seed, WIND_DEG, HEARTH_RADIUS, fire.rounds_left));
  } else if (state === "spent") {
    stack.add(buildSmokeWisp(seed, WIND_DEG, HEARTH_RADIUS));
  }

  stack.position.set(x, base, z);
  group.add(stack);
}

/* -------------------------------------------------------------------------- */
/* The layer                                                                  */
/* -------------------------------------------------------------------------- */

/** What the layer needs beyond the board itself, all of it optional. */
export interface WinterGroundOptions {
  /**
   * The roads the player has committed, so the snow course can have the settlement's own paths
   * trodden back into it. Absent, the island is under unbroken snow — which is the right
   * picture for a city with no roads and the wrong one for a city with them.
   */
  readonly roadCells?: readonly RoadCell[];
  /**
   * Build the WEATHER (the snow course, the frozen lagoon, the paths) as well as the board
   * states. Defaults to on. `false` leaves the layer as the per-cell board alone, which is what
   * an assertion about one cell's rungs wants and what a jsdom test that only cares about the
   * board can afford.
   */
  readonly weather?: boolean;
  /**
   * The cell a fire is being AIMED at, so the proposed hearth can stand on it.
   *
   * The engine hands the covered ground back per cell (`preview_tier`) but the centre is not
   * recoverable from that: the island clips the disc, so a fire aimed near the shore has a
   * lopsided footprint whose centroid is not the cell the player picked. It is passed rather
   * than derived for that reason.
   */
  readonly firePreviewAt?: { readonly col: number; readonly row: number } | null;
  /**
   * **EVERY CELL A BUILDING STANDS ON, so held ground is not drawn under one.** See
   * {@link HELD_GROUND_SKIPS_BUILDINGS}.
   *
   * It is passed rather than read off the rows, and the reason is the whole of the second edge
   * case: `WinterCellView.building` is only ever set on a building's ANCHOR cell, because the
   * winter models a building as the one cell it is anchored on (`liveCityLayout.ts` says so in
   * as many words). Era one ships 2x1, 1x2 and 2x2 footprints and a 3x2 hub, so a set derived
   * from the rows would clear one corner of a hall and leave tan under the other five — the
   * same defect in a smaller and more confusing form. `occupiedCells` in `worldLayout.ts` is
   * what the RENDERER means by a building's ground, and that is what `CityScene` hands over.
   */
  readonly buildingCells?: ReadonlySet<string>;
}

/** No buildings. A module constant so a default cannot re-key a memo. */
const NO_BUILDING_CELLS: ReadonlySet<string> = new Set<string>();

/**
 * Build the whole winter ground layer as one group, from the engine's own view rows.
 *
 * Exported for unit tests, which assert the states land one per cell on their own rungs — the
 * same reason `buildRoadsGroup` and `buildScarredGroundGroup` are exported.
 *
 * Water cells are skipped: the view covers the island's bounding box, and painting frost on
 * the lagoon would put the crisis somewhere the player cannot act.
 */
export function buildWinterGroundGroup(
  rows: readonly (readonly WinterCellView[])[],
  fires: readonly WinterFire[] = [],
  options: WinterGroundOptions = {},
): THREE.Group {
  const group = new THREE.Group();
  const buildingCells = options.buildingCells ?? NO_BUILDING_CELLS;

  // Which cells each state covers, BEFORE any of them is drawn. The edge treatments need it:
  // a state's boundary is where it has no neighbour in the same state, and that cannot be
  // known while walking the rows one cell at a time.
  const covered = {
    frozen: new Set<string>(),
    frostLine: new Set<string>(),
    frostNext: new Set<string>(),
  };
  // The LAND. It is the frost front's, and it is not derivable from the state sets: the front
  // now stands on the ice OUTSIDE the ground the round takes (see {@link frostFrontMarks}), and
  // knowing which cells are off the board is the whole of how that ice is found.
  const land = new Set<string>();
  /*
   * **NEITHER HELD-GROUND SET IS COLLECTED ANY MORE, and that is the per-tile ruling in the one
   * place it could still have been got wrong.**
   *
   * There used to be a `covered.warded` beside these three, and a `previewByTier` map beside it
   * collecting the preview one band at a time. Both existed to answer "which of this cell's four
   * sides does the state end on", and both are gone because held ground no longer asks: it is
   * rimmed on all four sides of every cell, held and previewed alike. See `HELD_TILE_RIM` in
   * `winterFireGhost.ts` for the ruling and for the ruling it overturns.
   *
   * The three that remain are the FROST's, which still merges — a frozen board is one field of
   * ice and not 88 stamps — so the edge treatments still need to know where the sheet, the line
   * and the coming advance stop.
   */
  for (const line of rows) {
    for (const cell of line) {
      if (!cell.land) {
        continue;
      }
      const key = `${cell.col},${cell.row}`;
      land.add(key);
      if (cell.frozen) {
        covered.frozen.add(key);
      }
      if (cell.frost_line) {
        covered.frostLine.add(key);
      }
      if (cell.frost_next) {
        covered.frostNext.add(key);
      }
    }
  }

  // The whole island under snow, first, because everything else is painted ONTO it. One mesh
  // for the disc rather than one per cell: the grid stops at 22 and the grass reaches 30, so a
  // per-cell course would leave an eight-unit green ring round the settlement.
  if (options.weather !== false) {
    group.add(buildSnowCourse(snowCourseBase()));
    group.add(buildFrozenLagoon(SEA_RADIUS, WATERLINE_Y));
    /*
     * **AND THE ISLAND OUTSIDE THE BOARD, ALREADY FROZEN, which is what puts round one's front on
     * the island's edge.** Same eight-unit ring the course exists to cover: the course made it
     * white so it would not read as a green collar, and white is what let the frost front read as
     * a line drawn inside an untouched field. See {@link buildFrostMargin} for the frame this was
     * measured off. Above the course and BELOW every per-cell state, on the frost's own rung, so a
     * board cell always wins over the margin under it.
     *
     * The board's own cells are subtracted, so the margin is exactly the island the player never
     * held, and it is passed `land` rather than the frozen set: it is a fact about the BOARD's
     * extent, unchanged for the whole winter, not a fact about how far the frost has got.
     */
    group.add(
      buildFrostMargin(
        land,
        winterCourseTop(RUNG.frozen),
        GRID_CELL,
        TERRAIN.frozen as CellTerrainSpec,
      ),
    );
    // The paths keep the settlement inhabited: the course buries the player's roads, and
    // these are what puts them back as worn slush between snow banks.
    if (options.roadCells && options.roadCells.length > 0) {
      group.add(buildTroddenPaths(options.roadCells, winterCourseTop(PATH_RUNG)));
    }
  }

  for (const line of rows) {
    for (const cell of line) {
      if (!cell.land) {
        continue;
      }
      // GROUND GIVEN UP IS NO LONGER A BOARD STATE, so nothing is drawn for it here. The
      // give-up-ground action was ruled out on 2026-08-02 (see `WinterAction` in
      // `hard-winter.ts`) and `WinterCellView.abandoned` went with it. `RUNG.abandoned`,
      // `TERRAIN.abandoned` and `WINTER_TILE_NAMES.abandoned` all stay: the TONE is
      // `ScarredGround.tsx`'s, which draws the city's persisted scars and is untouched, and the
      // rung ladder is asserted as a whole in `winterGround.test.ts` rather than per entry.
      /*
       * **THE FROST SHEET, AND NOT UNDER THE FROST LINE — which it was until 2026-08-03.**
       *
       * The lead, on a round-two frame: *"theres a bunch of random interior weird icicles;
       * think theres an extra layer thats being rendered unecssiarily."* He is right, and this
       * `&& !cell.frost_line` is the extra layer.
       *
       * `frost_line` is not a state a cell holds BESIDE `frozen`, the way warded or previewed
       * ground is — the engine defines it as a refinement of it (*"frozen with an unfrozen land
       * neighbour"*), so it is always true of frozen ground and every frost-line cell was
       * getting two full-cell terrain surfaces. That is not merely wasted: the two INTERLEAVE.
       * The frost line sits one 0.05 rung above the sheet and dishes 0.14 below its own rung
       * while the sheet dishes 0.09 below one 0.05 lower, so both surfaces live in the same
       * 0.14-unit band and each pokes through the other wherever their hashes disagree.
       *
       * The ladder's own note above says the states sink *"so a state can never reach the plane
       * of the state stacked over it"*. That is the right protection pointed the wrong way: it
       * stops the LOWER state rising into the upper, and the defect is the UPPER state sinking
       * into the lower. Measured on a round-two board at 1024x580, the sheet showed through the
       * line over 12,192 pixels in a serrated comb all round the ring — the same order as the
       * whole of the front's rime, and reading as a second band of pale spikes outside it.
       *
       * `covered.frozen` deliberately still holds the frost-line cells: it is the frost's whole
       * EXTENT and the edge treatments read it, so a sheet cell beside a line cell must still
       * see a neighbour in its own state or it would grow a lip against ground that is the same
       * frost. What changes is only which of the two draws the cell.
       */
      if (cell.frozen && !cell.frost_line) {
        addFill(
          group,
          cell.col,
          cell.row,
          RUNG.frozen,
          TERRAIN.frozen as CellTerrainSpec,
          WINTER_TILE_NAMES.frozen,
          covered.frozen,
        );
      }
      // The frost LINE is a second, colder fill on its own rung rather than a different
      // colour on the same one, so the advancing edge reads as an edge at zoom-out instead of
      // dissolving into the mass of frost behind it. It REPLACES the sheet on its own cell
      // rather than lying over it — see the note above.
      if (cell.frost_line) {
        addFill(
          group,
          cell.col,
          cell.row,
          RUNG.frostLine,
          TERRAIN.frostLine as CellTerrainSpec,
          WINTER_TILE_NAMES.frostLine,
          covered.frostLine,
        );
      }
      /*
       * GROUND A FIRE IS HOLDING, ONE TILE PER CELL — the preview's own builder, not a second
       * treatment beside it. `buildHeldGroundTile` is what the ghost patch below is made of too,
       * so the committed fire and the proposal are the same vertex buffer at a given cell and
       * cannot come apart the way they had. See `HELD_TILE_RIM`.
       *
       * ...and NOT under a building, which is the one filter on that set. Applied to the ghost
       * as well as to the fact, deliberately: the two are one treatment now, and a rule applied
       * to one of them would be the promise and the result disagreeing again, at exactly the
       * cells a player is deciding over. See {@link heldGroundIsDrawnOn}.
       */
      const heldGroundHere = heldGroundIsDrawnOn(cell.col, cell.row, buildingCells);
      if (cell.warded && heldGroundHere) {
        const tile = buildHeldGroundTile(
          cell.col,
          cell.row,
          winterCourseTop(RUNG.warded),
          SLAB_THICK,
        );
        tile.name = WINTER_TILE_NAMES.warded;
        group.add(tile);
      }
      if (cell.preview_tier !== null && heldGroundHere) {
        group.add(
          buildFireGhostPatch(
            cell.col,
            cell.row,
            cell.preview_tier,
            winterCourseTop(RUNG.preview),
            SLAB_THICK,
          ),
        );
      }
    }
  }
  /*
   * THE FRONT: standing shove ice on the frost's own ice, with rime reaching inward over the
   * ground this round takes. The one mark that exists before the frost has taken anything, which
   * is the whole of "where does it start".
   *
   * Built from the whole board at once rather than inside the per-cell walk, because it is not a
   * per-cell state: since the mark moved out to the ring of ice OUTSIDE the advance it stands on
   * cells that are not on the board at all at round one, and no walk of `rows` would ever reach
   * them. See {@link frostFrontMarks}, which owns where the ring falls, and
   * `winterFrostFront.ts`, which owns what one mark is made of.
   */
  for (const mark of frostFrontMarks(land, covered.frozen, covered.frostNext)) {
    const { x, z } = cellCenter(mark.col, mark.row);
    group.add(buildFrostFrontGroup(x, z, winterCourseTop(RUNG.frostNext), mark.approach));
  }

  for (const fire of fires) {
    addFire(group, fire);
  }

  // The proposed fire itself, on the cell it would be lit on. Last, so it draws over the ghost
  // ground it is proposing — the same order the real hearth stands over real held ground in.
  if (options.firePreviewAt) {
    const { col, row } = options.firePreviewAt;
    const { x, z } = cellCenter(col, row);
    const ghost = buildGhostHearth(HEARTH_RADIUS);
    ghost.position.set(x, winterCourseTop(RUNG.preview), z);
    group.add(ghost);
  }
  return group;
}

export interface WinterGroundProps {
  /** The engine's projected board (`hardWinterView(...).rows`). */
  readonly rows: readonly (readonly WinterCellView[])[];
  /** Fires standing on the board (`state.fires`). */
  readonly fires?: readonly WinterFire[];
  /** The roads the player committed, so the paths can be trodden back into the snow. */
  readonly roadCells?: readonly RoadCell[];
  /** The cell a fire is being aimed at, so the proposed hearth stands on it. */
  readonly firePreviewAt?: { readonly col: number; readonly row: number } | null;
  /** Every cell a building stands on, so held ground is not drawn under one. */
  readonly buildingCells?: ReadonlySet<string>;
  /**
   * Under reduced motion the snow hangs and the smoke stands. Both are decorative and both
   * hold a still frame rather than disappearing, which is how `StarterIsland`'s gulls behave
   * and what `prefers-reduced-motion` asks for.
   */
  readonly reducedMotion?: boolean;
}

/** No roads. A module constant so the memo below is not re-keyed by a fresh literal. */
const NO_ROAD_CELLS: readonly RoadCell[] = [];

/**
 * The falling snow, and the drift of every smoke column on the board.
 *
 * **THE ONE PLACE IN THE WINTER THAT READS A FRAME CLOCK, AND IT DECIDES NOTHING.** The crisis
 * advances on player actions and on nothing else, which `test/hardWinterClockless.test.ts`
 * enforces over the engine's import closure and over every source in `apps/web/src/winter`.
 * This file is in neither population — the island's renderer has always sat outside it, beside
 * `StarterIsland.tsx`'s gulls and `MasteryStars`' float — and that scoping is right rather
 * than lucky: the guard's stated subject is "a module that can decide what the winter does",
 * and a snowflake's height decides nothing. Under reduced motion nothing here is called at all
 * and the crisis plays identically, which is the cleanest available demonstration of it.
 */
function WinterWeatherMotion({
  group,
  reducedMotion,
}: {
  readonly group: THREE.Group;
  readonly reducedMotion: boolean;
}) {
  const snowfall = useMemo(() => buildSnowfall(), []);
  const seatedRef = useRef(false);

  useFrame((state) => {
    // Seat the field once even under reduced motion, so it is a still image of falling snow
    // rather than the raw spawn column it was built as.
    const t = reducedMotion ? 0 : state.clock.elapsedTime;
    if (reducedMotion && seatedRef.current) {
      return;
    }
    seatedRef.current = true;
    const target = state.controls as { target?: THREE.Vector3 } | null;
    updateSnowfall(snowfall, t, target?.target ?? { x: 0, z: 0 });
    for (const fire of group.children) {
      if (fire.name !== WINTER_TILE_NAMES.fire) {
        continue;
      }
      const column = fire.getObjectByName(SMOKE_COLUMN_NAME);
      if (column) {
        updateFire(fire.getObjectByName(HEARTH_NAME) ?? null, column, t);
      }
    }
  });

  return <primitive object={snowfall} />;
}

export function WinterGround({
  rows,
  fires,
  roadCells = NO_ROAD_CELLS,
  firePreviewAt = null,
  buildingCells = NO_BUILDING_CELLS,
  reducedMotion = false,
}: WinterGroundProps) {
  // Keyed on the two NUMBERS rather than on the object, so a parent that hands over a fresh
  // literal every render does not rebuild the whole island group on every frame.
  const aimCol = firePreviewAt?.col ?? null;
  const aimRow = firePreviewAt?.row ?? null;
  const group = useMemo(
    () =>
      buildWinterGroundGroup(rows, fires ?? [], {
        roadCells,
        buildingCells,
        firePreviewAt:
          aimCol === null || aimRow === null ? null : { col: aimCol, row: aimRow },
      }),
    [rows, fires, roadCells, buildingCells, aimCol, aimRow],
  );
  return (
    <>
      <primitive object={group} />
      <WinterWeatherMotion group={group} reducedMotion={reducedMotion} />
    </>
  );
}
