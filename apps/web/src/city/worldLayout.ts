import { parseCivicPlacementId } from "./civic";

/**
 * Pure, framework-free 3D world geometry for the React Three Fiber city (no
 * `three`, no React — unit-testable without a GPU).
 *
 * The city is a free-build "starter island": a big flat grass surface a player
 * lays their own city onto (Clash-of-Clans style). This module owns the island's
 * logical model — its buildable bounds, the fine placement CELL GRID, per-building
 * footprints, and the occupancy math that decides whether a building fits at a
 * given cell + rotation. It is the single source of truth the 3D scene, the
 * accessible surface, and the in-app session all snap to.
 *
 * Coordinates: world units, `{x, z}` on the ground plane (y is up in three). The
 * buildable grass surface sits at `SURFACE_Y`. A placement is a grid TRANSFORM —
 * a min-corner cell `{col, row}` plus a quarter-turn `rot` (0..3 = 0/90/180/270°).
 */

/** A point on the island ground plane (three world units; y is up elsewhere). */
export interface GroundPoint {
  readonly x: number;
  readonly z: number;
}

/** World Y of the buildable grass surface (buildings sit here). */
export const SURFACE_Y = 0;
/** Visual grass-top radius of the island (buildable area sits well inside this). */
export const ISLAND_GRASS_RADIUS = 30;
/** Teal lagoon radius the island floats in. */
export const SEA_RADIUS = 58;
/**
 * Side of one placement cell (world units) — the single, FINE snap resolution.
 * Placement + the visible build/ground grids all live on this per-cell pitch:
 * a building's min-corner snaps to any whole cell, so a small building takes one
 * cell and a bigger one a few (standard Clash-of-Clans footprint placement).
 */
export const GRID_CELL = 4;
/**
 * **ERA ONE's buildable disc, and the FLOOR under every other era's.**
 *
 * It is no longer *the* buildable radius: {@link buildableRadiusForLand} derives an era's disc
 * from the land that era is drawn on, and every predicate below takes the answer as an
 * argument rather than closing over this. What this constant still is, is era one's own island
 * and the smallest disc the game may ever offer — which is what keeps era one exactly where it
 * was and what makes a saved transform safe, since the disc can grow under a persisted
 * placement but can never shrink past this.
 */
export const BUILDABLE_RADIUS = 22;

/**
 * How far from the origin a PERSON may walk on ERA ONE's island — three units further out than
 * anything can be built there. {@link walkableRadiusFor} is the general form and is what the
 * reachability walk below reads; this is that function at {@link BUILDABLE_RADIUS}.
 *
 * `citizenPlaces.CITIZEN_STAND_RADIUS` is this value — it is defined here because the
 * placement rule needs it and `worldLayout` may not import the render lane.
 */
export const WALKABLE_RADIUS = BUILDABLE_RADIUS + 3;

/**
 * How much walkable ground sits outside the buildable disc, in world units — at EVERY era.
 *
 * The band between the two radii is permanently clear grass: no building and no road can ever
 * claim a cell out there, so the island always has an open perimeter (`StarterIsland` rings
 * its decorative props from there outward). That perimeter is what makes the reachability rule
 * below cost no land at all ({@link placementRefusal}): every layout has an outer ring to be
 * reached from, so "leave a way in" never competes with "leave room to build".
 *
 * **It is an ABSOLUTE width and not a fraction of the disc**, which is the whole reason the
 * reachability rule survives an era-driven disc unchanged: the annulus is the width of a
 * person walking round a building, and that is a fact about a person rather than about how big
 * the island is. `ringLayout.ts` re-exports it under the name it had while it lived there.
 */
export const WALKABLE_MARGIN = WALKABLE_RADIUS - BUILDABLE_RADIUS;

/** How far a person may walk on an island whose buildable disc is `buildableRadius`. */
export function walkableRadiusFor(buildableRadius: number): number {
  return buildableRadius + WALKABLE_MARGIN;
}

/**
 * **THE GREEN THE ISLAND KEEPS BETWEEN ITS LAST BUILDABLE CELL AND ITS SHORELINE, in world
 * units — era one's own, and structural rather than taste.**
 *
 * Era one draws grass 30 around a buildable 22, so the margin is **8 units**, and every reason
 * it exists is a measurement off the shipped island rather than a fact about era one
 * (`islandLand.ts`'s header carries the three in full):
 *
 *  - a legal cell is tested at its CENTRE, so it reaches 2.83u further to its far corner, and a
 *    building would otherwise stand on the beach;
 *  - the ground is only FLAT to `grassR - 2.4`, where `StarterIsland`'s shore starts shelving;
 *  - the island's whole decoration band IS this margin, scattered between `buildable + 3` and
 *    `grassR - 2.2`, so a margin under about 5.2 inverts the band and the island loses its
 *    vegetation outright.
 *
 * **It lives here rather than in `islandLand.ts` because it is now read in both directions.**
 * `islandLand.ts` ADDS it to an era's authored budget to get the land to draw; this file
 * SUBTRACTS it from the land to get the disc that land can carry
 * ({@link buildableRadiusForLand}). One constant, so the two can never come apart —
 * `islandLand.ts` re-exports it under the name it had while it lived there.
 */
export const GRASS_OVER_BUILDABLE = ISLAND_GRASS_RADIUS - BUILDABLE_RADIUS;

/**
 * **THE BUILDABLE DISC AN ISLAND OF `grassRadius` CAN CARRY — the whole of the era-driven disc,
 * as one subtraction.**
 *
 * Drawn land is era-aware, so placement must derive its disc from the same grass radius rather
 * than closing over era one's {@link BUILDABLE_RADIUS}.
 *
 * ## Why the LAND and not the era's authored budget
 *
 * D-ERA25 authors a buildable radius per era — 22 / 30 / 35 / 42 / 46 / 51 / 55 / 60 / 64 / 69
 * — and reading those literally is the version that puts buildings in the sea. `islandLand.ts`
 * holds the drawn grass under a ceiling it measured against the road layer's depth budget, so
 * eras four to ten are all drawn at grass 46 however much land their budget asked for. A disc
 * at era nine's authored 64 would sit eighteen units past that shoreline.
 *
 * So the disc is derived from the land the era is ACTUALLY DRAWN ON, less the margin era one
 * keeps between its last legal cell and its shore. Two properties follow, and both are
 * measured rather than argued (`islandLand.test.ts`):
 *
 *  - **it never exceeds the era's own authored budget**, because `islandLand.ts` built the land
 *    by ADDING this same margin to that same budget — so this is that derivation read backwards
 *    and the two meet exactly wherever the ceiling is not binding, which is eras one to three;
 *  - **it never drops below {@link BUILDABLE_RADIUS}**, so era one does not move and no saved
 *    transform can be orphaned by a disc that came back down.
 *
 * What the ceiling still costs is reported as a number rather than left as a silence
 * (`eraLandBudget.test.ts`), and closing it is the road lane's work (era design §13) rather
 * than this file's.
 */
export function buildableRadiusForLand(grassRadius: number): number {
  return Math.max(BUILDABLE_RADIUS, grassRadius - GRASS_OVER_BUILDABLE);
}

/** A building's tile footprint (in grid cells) before rotation. */
export interface Footprint {
  readonly w: number;
  readonly d: number;
}

/** A grid placement: the min-corner cell + a quarter-turn (0..3 → 0/90/180/270°). */
export interface Transform {
  readonly col: number;
  readonly row: number;
  readonly rot: number;
}

/** A persisted placement: which node is built at a grid transform (in-app only). */
export interface PlacedTransform extends Transform {
  readonly nodeId: string;
}

/**
 * Per-building footprints: each D1 building has its OWN footprint (width `w` ×
 * depth `d`, in cells, pre-rotation) — the two towers and the housing block take a
 * square 2×2, the School a single 1×1 cell, the WIDE Glass Slab a 2×1
 * strip laid "the long way" so its X-wide model fills both tiles across, and the Park
 * a 1×2 strip (its lawn is authored long along Z, so its two tiles run front-to-back).
 * The mesh is then scaled to FILL its own footprint (see `footprintFitScale`) at the
 * placement ghost AND at every build phase, so footprints VISIBLY differ between
 * buildings, while a single building stays one constant size the whole build (no
 * shrink/growth in ground area as it climbs the phases). A footprint's 2-tile axis
 * is matched to the model's LONG ground axis — X for the wide slab, Z for the long
 * park — so a building spans its two tiles the long way instead of being crushed thin
 * into a single-tile width. Kept as pure data (never loads a GLB).
 *
 * WHAT INV-ERA-1 / D-ERA10 ACTUALLY FREEZES, because it is narrower than "footprints
 * are frozen" sounds. It binds an era ADVANCE: a building "never changes the cells it
 * occupies", so no era advance may reshuffle a layout the player arranged. It therefore
 * forbids a per-era `NODE_FOOTPRINTS`, a footprint derived from model bounds, and any
 * "the tower got bigger so it needs another cell" reasoning (era design §6.3). It does
 * NOT freeze the FIRST value a node is given, and §6.3's own "what INV-ERA-1 does not
 * forbid" paragraph says so: each era's rows were free to set until that era's style
 * guide closed them. Era one's window shut on 2026-07-28 (the two changes below); eras
 * two to seven closed theirs on 2026-07-29. It rules on nothing about masses or models
 * — see `buildingAssets.ts` on the mass column.
 *
 * ---------------------------------------------------------------------------------
 * ERAS ONE TO SEVEN ARE AUTHORED HERE. ERAS EIGHT, NINE AND TEN ARE NOT, BY THEIR OWN
 * GUIDES' CHOICE. Each era's style guide decides its own new nodes' plots in a closure
 * block (`docs/superpowers/specs/eras/era-NN-<era>/style-guide.md`), keyed by NODE id and
 * never by mass — the `workshop` mass alone carries 1×1, 2×2 and 2×1 across the run, so
 * there is no per-mass shape to inherit. The seven guides that closed the item author 38
 * of the 62 nodes; eras eight, nine and ten wrote "footprints are not yet authored" and
 * closed nothing, so their 24 nodes resolve through `footprintFor` to
 * `DEFAULT_FOOTPRINT` and MUST keep doing so. That is the designed state rather than a
 * gap in this table: their image-generation briefs are drawn to the 2×2 default and call
 * it a design fact (`output/imagegen/era-08-atomic-building-briefs/README.md` ⚑3,
 * `era-09-information-building-briefs/README.md` — *"all six of era nine's skill plots
 * are 2×2, which is a design fact, not a placeholder"*). Giving one of those 24 a value
 * here would MAKE a decision no guide has made, which is the opposite of what wiring the
 * other 38 does. `eraFootprints.test.ts` holds the three deferred eras as a named list
 * that fails in both directions.
 *
 * Every authored value is 2×2 or 2×1, so no node's plot is LARGER than the default it
 * replaces: wiring can only reduce the cells the city consumes, never raise them, and a
 * 2×1's cells are a strict SUBSET of the 2×2's at the same transform and rotation. That
 * subset relation is what makes this safe for an already-placed building — no saved
 * placement can newly overlap a neighbour or fall off the island — and it is asserted
 * per node and per rotation rather than argued.
 * ---------------------------------------------------------------------------------
 * BEFORE CHANGING A FOOTPRINT, read this. It is counter-intuitive and it has already
 * cost one wrong change (`NUM.5` → 1×1, reverted 2026-07-28).
 *
 * **A building's rendered HEIGHT is set by its PLOT, not by its model.** Every stage
 * is contain-fit by `footprintFitScale`, which returns ONE uniform scale
 * (`PlacedBuilding.prepareModel` calls `scale.setScalar`), so:
 *
 *     scale           = FOOTPRINT_FILL * plotSpan / nativeGroundSpan
 *     renderedHeight  = nativeHeight * scale
 *     rendered width:height  ==  native width:height     (a uniform scale preserves it)
 *
 * Three consequences, each of which contradicts the obvious guess:
 *
 * 1. **A smaller plot does NOT make a building read taller or more slender.** It
 *    scales the whole model down uniformly. Slenderness is a property of the MODEL and
 *    is invariant under the fit; shrinking the plot spends real height and buys no
 *    shape. Measured: the Lookout renders **9.769u** on a 2×2 and **4.885u** on a 1×1
 *    — exactly half — at an unchanged width:height of **0.778** either way.
 * 2. **On a SHARED plot, the taller building is simply the more SLENDER one.** The
 *    rendered height ratio between two buildings on the same plot is the INVERSE ratio
 *    of their native width:height. Measured on 2×2: the Lookout at 0.778 renders
 *    **2.03× taller** than the Roundhouse at 1.58 (9.769u vs 4.821u). That, not
 *    the plot size, is what makes the Lookout read as the tower.
 * 3. **A compact model is scaled UP relative to a bulky one at the same plot**, since
 *    the scale goes as 1/nativeGroundSpan — so a small model does not render small.
 *
 * So the lever for "reads taller" is the MODEL's proportions (or `MAX_BUILD_HEIGHT`,
 * which caps rather than grants and is not binding for any D1 building today). The
 * lever a footprint genuinely controls is **how much of its plot a building fills**,
 * which is what made the `NUM.2` change below correct and the `NUM.5` one wrong.
 * ---------------------------------------------------------------------------------
 */
export const DEFAULT_FOOTPRINT: Footprint = { w: 2, d: 2 };
export const NODE_FOOTPRINTS: Readonly<Record<string, Footprint>> = {
  "NUM.S": { w: 2, d: 2 }, // Deco Tower (tall)
  // Tower — 2×2, and 1×1 was TRIED AND REVERTED (2026-07-28). The 1×1 argument was
  // that a smaller plot would reinforce "slender and vertical"; per the block above
  // that is false, and the renders settled it: at 1×1 the Lookout drops to 4.885u,
  // within 1.3% of the Roundhouse's 4.821u and the SMALLEST building on the
  // island, where at 2×2 it stands 2.03× the Roundhouse's height. Its width:height is
  // 0.778 at both, so the smaller plot bought no slenderness and spent all the height.
  "NUM.5": { w: 2, d: 2 },
  // Brownstones / the island's housing — 2×2, changed from 2×1 and CONFIRMED by the
  // same renders. This is the case a footprint genuinely fixes: at 2×1 the near-square
  // model filled only 4.247u of its 7.6u plot (44.1% of the width empty) and the fit
  // crushed it to 1.457u, the shortest building in the settlement. At 2×2 it fills
  // 100% × 89.5% of its plot and stands 2.608u — 1.79× taller, from plot SHAPE alone.
  "NUM.2": { w: 2, d: 2 },
  "NUM.3": { w: 1, d: 1 }, // School (compact)
  "NUM.4": { w: 1, d: 2 }, // Park (long lawn — two tiles run front-to-back along Z)
  "NUM.F": { w: 2, d: 1 }, // Glass Slab (wide block — fills 2 tiles the long way)
  // The island HUB (Town Hall, `TOWN_HALL_ID`). 3×2 (wider than deep) so a CONTAIN
  // fit binds on depth and the hall renders ~26% larger than a 2×2, matching the
  // model's ~1.25 x:z aspect. Kept equal to `TOWN_HALL_FOOTPRINT` (city/townHall.ts)
  // — locked by townHall.test.ts. Literal id avoids a worldLayout→townHall cycle.
  "town-hall": { w: 3, d: 2 },

  // ── Era 2, Neolithic — era-02-neolithic/style-guide.md closure block ────────────
  // "EXP.1 (store) takes the long plot; RAD.1 (workshop), RAD.2 (yard), RAD.3 (hall)
  // and RAD.4 (tower) take the square full plot." A raised store is a run you walk
  // along and take from; everything else here is a round plan or a working ground.
  // Three of the five ids were crossed against their masses until 2026-07-29 and the
  // guide records the correction in place — these are the corrected pairings.
  "EXP.1": { w: 2, d: 1 }, // the Bee House, a long block of brick on the ground
  "RAD.1": { w: 2, d: 2 }, // the Potter's Kiln
  "RAD.2": { w: 2, d: 2 }, // the Sheep Pen (a working ground wants the square)
  "RAD.3": { w: 2, d: 2 }, // the Meeting House
  "RAD.4": { w: 2, d: 2 }, // the Stone Tower (square: a smaller plot spends height)

  // ── Era 3, Bronze Age — era-03-bronze-age/style-guide.md closure block ─────────
  // "LIN.4 (store) takes the long plot; LIN.1 (hall), LIN.3 (workshop), LIN.5 (yard)
  // and LIN.6 (tower) take the square full plot." The bonded store is a run of bays
  // behind a counter, which is what makes the one open bay beside the locked ones read.
  "LIN.1": { w: 2, d: 2 }, // the trade hall
  "LIN.3": { w: 2, d: 2 }, // the foundry shop
  "LIN.4": { w: 2, d: 1 }, // the bonded store
  "LIN.5": { w: 2, d: 2 }, // the ingot-weighing yard
  "LIN.6": { w: 2, d: 2 }, // the corner bastion

  // ── Era 4, Classical — era-04-classical/style-guide.md closure block ───────────
  // "POL.1 (workshop) and POL.8 (workshop) both take the square full plot; POL.2
  // (yard) takes the long plot; POL.3 (hall) takes the square full plot; POL.4 (store)
  // takes the long plot." A barracks is one range of cells you walk along and a
  // warehouse a row of vaulted bays, so both are long buildings. POL.1 and POL.8 share
  // mass AND plot and separate on openness first, props second.
  //
  // POL.2 was authored as a stone yard when this block closed and has since been
  // re-authored as the Barracks — era four's entry in the defence lineage. The plot did
  // not move with it (INV-ERA-1 binds once authored), and the guide's argument for the
  // long plot survives the change: a single-storey range one room deep is also a long
  // building. Anything drawn here must fit 2×1 and not the 2×2 a barracks suggests.
  "POL.1": { w: 2, d: 2 }, // the mason's workshop
  "POL.2": { w: 2, d: 1 }, // the Barracks (was the stone yard)
  "POL.3": { w: 2, d: 2 }, // the basilica hall
  "POL.4": { w: 2, d: 1 }, // the bonded warehouse
  "POL.8": { w: 2, d: 2 }, // the surveyor's shop

  // ── Era 5, Medieval — era-05-medieval/style-guide.md closure block ─────────────
  // "RAT.2 (store) and RAT.6 (dwelling) take the long plot; RAT.1 (workshop), RAT.3
  // (hall) and RAT.4 (tower) take the square full plot." A tithe barn is long by
  // definition and a jettied row of three houses is a street frontage. RAT.3's square
  // is load-bearing: §5 records that the guild hall is a long FRONTAGE with depth
  // behind it precisely because the plot is 1:1 and the mesh fills 95% of its span.
  "RAT.1": { w: 2, d: 2 }, // the guild hall-workshop
  "RAT.2": { w: 2, d: 1 }, // the parish tithe store
  "RAT.3": { w: 2, d: 2 }, // the guild hall
  "RAT.4": { w: 2, d: 2 }, // the tower house
  "RAT.6": { w: 2, d: 1 }, // the jettied row

  // ── Era 6, Early Modern — era-06-early-modern/style-guide.md closure block ───────
  // "All six take the square full plot (2×2), with one exception: GEO.2's Drawing
  // Office takes the long plot (2×1)." GEO.2 shares the workshop mass with the chain
  // instance and a north-lit drawing office wants a run of windows down one side, so
  // the long plot separates the pair by plan rather than by scale.
  "GEO.1": { w: 2, d: 2 }, // the domed hall
  "GEO.2": { w: 2, d: 1 }, // the Drawing Office
  "CG.1": { w: 2, d: 2 }, // the Mapmakers' House (was the surveyor's yard)
  "POL.6": { w: 2, d: 2 }, // the Printing House (was the printer's terrace)
  "POL.7": { w: 2, d: 2 }, // the lecture theatre
  // RAT.5 was authored as a cistern court when this block closed and has since been
  // re-authored as the Cannon Tower, era six's entry in the defence lineage. The plot
  // did not move with it.
  "RAT.5": { w: 2, d: 2 }, // the Cannon Tower (was the cistern court)

  // ── Era 7, Industrial — era-07-industrial/style-guide.md closure block ─────────
  // "FUN.2 (store) and FUN.3 (workshop) take the long plot; FUN.1 (hall), FUN.7
  // (hall), FUN.8 (workshop) and POL.5 (tower) take the square full plot." The plot is
  // what separates both of this era's shared-mass pairs by plan: the erecting shop is
  // one tall bay with a crane running down its LENGTH, against the square block beside
  // it. FUN.8 was authored as a pattern shop when this block closed and has since been
  // re-authored as the Cannon Factory, era seven's entry in the defence lineage; the
  // plot did not move, and a square casting house against a long crane bay is still the
  // plan difference the closure block was reasoning from.
  "FUN.1": { w: 2, d: 2 }, // the machine hall
  "FUN.2": { w: 2, d: 1 }, // the bonded warehouse
  "FUN.3": { w: 2, d: 1 }, // the erecting shop
  "FUN.7": { w: 2, d: 2 }, // the assembly hall
  "FUN.8": { w: 2, d: 2 }, // the Cannon Factory (was the pattern shop)
  "POL.5": { w: 2, d: 2 }, // the hydraulic accumulator tower
};

/**
 * Fraction of a footprint's cell span the mesh fills. Tuned close to 1 so a
 * building fills its own footprint tiles for a chunky Clash-of-Clans scale, with
 * only a hair of yard left so it still sits fully INSIDE its footprint (a
 * "contain" fit never spills past `w × d` cells, so neighbours on adjacent tiles
 * never overlap). The same fill applies to every phase + the placement ghost, so
 * a building's size stays constant across the whole build, ghost included.
 */
export const FOOTPRINT_FILL = 0.95;

/**
 * Hard ceiling (world units) on a building's rendered HEIGHT. A slender tower
 * scaled to fill its base would otherwise rise very tall, and from the fixed ~49°
 * village camera an over-tall tower throws its silhouette back across extra cells —
 * so a placed building looks like it grew past its plot. Capping the height keeps
 * the footprint honest: the building fills its base but never towers past ~6 cells,
 * so it stays visually inside its plot. Raised from four to six cells so the taller
 * buildings read as satisfyingly BIG (height is the main "bigger" lever) without
 * reintroducing the old sprawl. Only over-tall models are affected (the tallest
 * towers get a gentle vertical squash); shorter buildings are untouched.
 * 6 × GRID_CELL = 24u ≈ six cells tall.
 */
export const MAX_BUILD_HEIGHT = GRID_CELL * 6;

/**
 * The tile footprint for a placement (falls back to the default 2×2 block).
 *
 * A BOUGHT CIVIC BUILDING'S FOOTPRINT COMES FROM THE CATALOGUE, not from
 * {@link NODE_FOOTPRINTS}, because it is authored there: era one section 3 gives the
 * Smokehouse 2×1, the Longhouse and the Campfire 2×2, and the Water Spring 1×1, and
 * those figures are load-bearing for how the four trade against each other (D-ERA24 —
 * footprint is one of the four axes `test/eraCivicCatalogueDominance.test.ts` sweeps).
 * Copying them into the table above would be a second place for them to be wrong, and
 * INV-ERA-1 / D-ERA10 freezes them across all ten eras either way, so there is no
 * version of this where a footprint is ours to pick.
 *
 * Resolved HERE rather than at each call site so `placementRefusal` — the one
 * placement decision every gate calls — sizes a civic ghost correctly with no
 * knowledge of what a civic building is.
 */
export function footprintFor(nodeId: string): Footprint {
  const civic = parseCivicPlacementId(nodeId);
  if (civic !== null) {
    return {
      w: civic.row.footprint.width,
      d: civic.row.footprint.depth,
    };
  }
  return NODE_FOOTPRINTS[nodeId] ?? DEFAULT_FOOTPRINT;
}

/**
 * The single uniform scale that fits a mesh's ground box (`sizeX`×`sizeZ`, world
 * units) INTO its footprint's cell span — filling the binding horizontal axis with
 * NO overhang on either (a "contain" fit). Height is unconstrained so the building
 * always FILLS its footprint (a tall model just rises; a construction crane simply
 * overhangs). Because it satisfies both ground axes, the fit also holds under 90°
 * rotation. Callers pass the FINISHED (built) model's box so every build phase of a
 * node shares one scale — the building is the same size the whole build.
 *
 * Because the scale is UNIFORM, this sets a building's rendered HEIGHT as well as its
 * base, and it preserves the model's width:height exactly. See the block above
 * `NODE_FOOTPRINTS` before reasoning about how a plot size affects how tall something
 * looks — the answer is not the intuitive one.
 */
export function footprintFitScale(sizeX: number, sizeZ: number, fp: Footprint): number {
  const fitX = (fp.w * GRID_CELL * FOOTPRINT_FILL) / (sizeX || 1);
  const fitZ = (fp.d * GRID_CELL * FOOTPRINT_FILL) / (sizeZ || 1);
  return Math.min(fitX, fitZ);
}

/** A footprint rotated by `rot` quarter-turns (odd turns swap width/depth). */
export function rotatedFootprint(fp: Footprint, rot: number): Footprint {
  return ((rot % 2) + 2) % 2 === 1 ? { w: fp.d, d: fp.w } : { w: fp.w, d: fp.d };
}

/** World-space center of grid cell `(col,row)`. */
export function cellCenter(col: number, row: number): GroundPoint {
  return { x: (col + 0.5) * GRID_CELL, z: (row + 0.5) * GRID_CELL };
}

/** World-space center of a footprint placed at transform `t`. */
export function transformCenter(t: Transform, fp: Footprint): GroundPoint {
  const { w, d } = rotatedFootprint(fp, t.rot);
  return { x: (t.col + w / 2) * GRID_CELL, z: (t.row + d / 2) * GRID_CELL };
}

/** rotationY (radians) for a quarter-turn `rot`. */
export function rotationYFor(rot: number): number {
  return (((rot % 4) + 4) % 4) * (Math.PI / 2);
}

/**
 * Snap a fractional cell index to the FINE per-cell grid — the nearest whole cell.
 * Normalizes a possible `-0` (from rounding e.g. `-0.5`) to `+0`.
 */
function snapCell(cell: number): number {
  const snapped = Math.round(cell);
  return snapped === 0 ? 0 : snapped;
}

/**
 * Snap a world point to the origin cell that seats footprint `fp` (at rotation
 * `rot`) centered under the point, with its min-corner on the FINE per-cell grid.
 * Buildings sit on their footprint CELLS (standard CoC) — an even footprint whose
 * center lands on a grid line simply straddles it; footprints are not forced to
 * center inside a coarser tile. Rotation swaps width/depth first.
 */
export function snapToCell(
  x: number,
  z: number,
  fp: Footprint,
  rot: number,
): { col: number; row: number } {
  const { w, d } = rotatedFootprint(fp, rot);
  return {
    col: snapCell(x / GRID_CELL - w / 2),
    row: snapCell(z / GRID_CELL - d / 2),
  };
}

/** A grid cell, by index. */
interface Cell {
  readonly col: number;
  readonly row: number;
}

/** Every grid cell a footprint covers at transform `t`. */
function footprintCoords(t: Transform, fp: Footprint): Cell[] {
  const { w, d } = rotatedFootprint(fp, t.rot);
  const cells: Cell[] = [];
  for (let i = 0; i < w; i += 1) {
    for (let j = 0; j < d; j += 1) {
      cells.push({ col: t.col + i, row: t.row + j });
    }
  }
  return cells;
}

/** Every grid-cell key (`"col,row"`) a footprint covers at transform `t`. */
export function footprintCells(t: Transform, fp: Footprint): string[] {
  return footprintCoords(t, fp).map((cell) => `${cell.col},${cell.row}`);
}

/**
 * True if a single cell sits on buildable ground. The whole flat inside the
 * buildable disc is usable — there are no interior exclusions, so the entire
 * central island can be built on.
 *
 * ## ⚑ IT TAKES THE DISC. IT USED TO CLOSE OVER {@link BUILDABLE_RADIUS}, AND THAT WAS THE BUG
 *
 * The DRAWN island became era-aware on 2026-08-02 and the placement surface did not follow, so
 * the land visibly expanded and then refused to be built on. This predicate is where that
 * lived: it closed over era one's 22, and so did `isFootprintInBounds`, `isPlacementValid`,
 * `placementRefusal`, `findOpenCell`, `defaultPlacements`, the reachability walk's annulus and
 * the candidate `CELL_REACH` — one closure, eight symptoms.
 *
 * **The radius is REQUIRED and has no default, on #521's precedent.** `computeCityLayout`'s
 * island radius used to default to era one's, and two guards measured ERA TWO through it and
 * were green over a container the game does not ship. A caller here has to say which island it
 * means, and {@link buildableRadiusForLand} / `islandLand.ts`'s `eraBuildableDiscRadius` are how
 * it says so — including for era one, which is how a measurement about era one says so rather
 * than getting it by omission.
 *
 * The two objections the old split raised are answered rather than dropped:
 *
 *  - **Placements are persisted**, so a disc that ever came back down would orphan a saved
 *    transform. {@link buildableRadiusForLand} floors at {@link BUILDABLE_RADIUS} and derives
 *    from land that only grows, so the disc is monotone in the era and the case does not arise.
 *  - **The ceiling means this cannot seat every era's roster.** True, and it is reported rather
 *    than hidden: eras four to ten are all drawn at grass 46, so they all get a disc of 38, and
 *    `eraLandBudget.test.ts` names what each era is short by. Widening the drawn land past the
 *    ceiling is the road lane's depth-budget work (era design §13).
 */
export function isCellBuildable(
  col: number,
  row: number,
  buildableRadius: number,
): boolean {
  const { x, z } = cellCenter(col, row);
  return Math.hypot(x, z) <= buildableRadius;
}

/** True if EVERY cell of a footprint sits on buildable ground. */
export function isFootprintInBounds(
  t: Transform,
  fp: Footprint,
  buildableRadius: number,
): boolean {
  const { w, d } = rotatedFootprint(fp, t.rot);
  for (let i = 0; i < w; i += 1) {
    for (let j = 0; j < d; j += 1) {
      if (!isCellBuildable(t.col + i, t.row + j, buildableRadius)) {
        return false;
      }
    }
  }
  return true;
}

/**
 * The set of occupied cell keys covered by every already-placed building.
 *
 * Pass `ignoreNodeId` to EXCLUDE one building from the count — the "ignore self"
 * rule used while RELOCATING a placed building: its own current footprint must
 * not count as occupied, or every cell it already sits on (and every neighbour)
 * would read as blocked and it could never be dropped back onto its own spot.
 */
export function occupiedCells(
  placements: readonly PlacedTransform[],
  ignoreNodeId?: string | null,
): Set<string> {
  const occupied = new Set<string>();
  for (const p of placements) {
    if (ignoreNodeId != null && p.nodeId === ignoreNodeId) {
      continue;
    }
    for (const key of footprintCells(p, footprintFor(p.nodeId))) {
      occupied.add(key);
    }
  }
  return occupied;
}

/**
 * A placement fits iff its whole footprint is on buildable ground AND none of its
 * cells overlap an already-occupied cell.
 *
 * This is the FITTING primitive, not the whole rule: {@link placementRefusal} adds
 * reachability on top and is what the ghost, the confirm button and the session gate
 * on. Kept separate because the candidate scans below need a cheap per-cell test.
 */
export function isPlacementValid(
  t: Transform,
  fp: Footprint,
  occupied: ReadonlySet<string>,
  buildableRadius: number,
): boolean {
  if (!isFootprintInBounds(t, fp, buildableRadius)) {
    return false;
  }
  for (const key of footprintCells(t, fp)) {
    if (occupied.has(key)) {
      return false;
    }
  }
  return true;
}

/* -------------------------------------------------------------------------- */
/* Reachability: every building must stay walkable-to (O-13, 2026-07-29).      */
/* -------------------------------------------------------------------------- */

/** Grid cell reach (in cells) from the origin a person could ever walk within. */
function walkableCellReach(buildableRadius: number): number {
  return Math.ceil(walkableRadiusFor(buildableRadius) / GRID_CELL) + 1;
}

/** The four orthogonal neighbours, in the same fixed order the router walks. */
const NEIGHBOUR_STEPS: readonly Cell[] = [
  { col: 0, row: -1 },
  { col: 1, row: 0 },
  { col: 0, row: 1 },
  { col: -1, row: 0 },
];

/**
 * True if a cell is ground a person can stand on, ignoring what is built there: inside
 * {@link walkableRadiusFor}. Strictly wider than {@link isCellBuildable} at the same disc, so
 * every buildable cell is walkable and the outer band is walkable only.
 *
 * **It takes the BUILDABLE radius rather than the walkable one**, so a caller cannot hand the
 * two predicates discs that disagree — the annulus the flood fill is seeded from is exactly the
 * difference between them, and a caller free to pass both could make it empty.
 */
export function isCellWalkable(col: number, row: number, buildableRadius: number): boolean {
  const { x, z } = cellCenter(col, row);
  return Math.hypot(x, z) <= walkableRadiusFor(buildableRadius);
}

/**
 * Every cell of open ground a person can reach on foot from the island's permanent
 * perimeter, given what is built.
 *
 * WALKABLE, NOT ROAD-TOUCHING. Bare grass is walked exactly as freely as paving, so
 * this takes buildings and nothing else: roads are absent from `blocked` on purpose
 * (INV-COS-1 — "a road only ever blocks a CELL, never progress" — and D-CIT7/D-CIT18,
 * which reject roads as required infrastructure). A rule that wanted a road here would
 * hand a cosmetic gold sink authority over whether a building may exist.
 *
 * The flood fill is seeded from the WHOLE permanent annulus rather than from one cell,
 * because that band is the ground no placement can ever claim — so "reachable" means
 * "reachable from outside the settlement", which is what a person walking in does.
 */
function reachableGround(
  placements: readonly PlacedTransform[],
  buildableRadius: number,
): Set<string> {
  const blocked = occupiedCells(placements);
  const reached = new Set<string>();
  const frontier: Cell[] = [];
  const reach = walkableCellReach(buildableRadius);
  for (let col = -reach; col <= reach; col += 1) {
    for (let row = -reach; row <= reach; row += 1) {
      // The annulus only: walkable but never buildable, so never blocked.
      if (
        !isCellWalkable(col, row, buildableRadius) ||
        isCellBuildable(col, row, buildableRadius)
      ) {
        continue;
      }
      reached.add(`${col},${row}`);
      frontier.push({ col, row });
    }
  }
  while (frontier.length > 0) {
    const current = frontier.pop() as Cell;
    for (const step of NEIGHBOUR_STEPS) {
      const col = current.col + step.col;
      const row = current.row + step.row;
      const key = `${col},${row}`;
      if (
        reached.has(key) ||
        blocked.has(key) ||
        !isCellWalkable(col, row, buildableRadius)
      ) {
        continue;
      }
      reached.add(key);
      frontier.push({ col, row });
    }
  }
  return reached;
}

/**
 * The node ids of every building nobody could walk up to: one whose footprint has no
 * orthogonally-adjacent cell of reachable open ground. A building sealed in by its
 * neighbours is the case this exists for — the pocket beside it may be empty and still
 * be cut off from the rest of the island.
 *
 * Order follows `placements`, so a caller can name the first offender deterministically.
 */
export function unreachableNodeIds(
  placements: readonly PlacedTransform[],
  buildableRadius: number,
): readonly string[] {
  const reached = reachableGround(placements, buildableRadius);
  const stranded: string[] = [];
  for (const placed of placements) {
    const touches = footprintCoords(placed, footprintFor(placed.nodeId)).some((cell) =>
      NEIGHBOUR_STEPS.some((step) =>
        reached.has(`${cell.col + step.col},${cell.row + step.row}`),
      ),
    );
    if (!touches) {
      stranded.push(placed.nodeId);
    }
  }
  return stranded;
}

/** Why a placement/move is refused, or `null` when it may be committed. */
export type PlacementRefusal = "bounds" | "overlap" | "unreachable";

/**
 * THE placement decision, for a fresh placement and for a relocation alike: bounds,
 * then overlap, then reachability. The one function every gate calls, so the ghost, the
 * confirm button, and the session write can never disagree about what is legal.
 *
 * `"unreachable"` is a HARD refusal rather than a penalty (Evan, 2026-07-29, closing
 * O-13): *"a person should be able to reach the building so the user can't just toss
 * all the buildings in a big blob."* It is checked over the WHOLE hypothetical set —
 * `others` plus `candidate` — because the building that gets sealed off is usually not
 * the one being dropped. Validating only the moved footprint is the naive version, and
 * it misses every seal-off.
 *
 * IT REFUSES WHAT THIS MOVE BREAKS, NOT WHAT IT INHERITS. A layout saved before this
 * rule existed can already strand somebody, and a bare "everything is reachable" test
 * would then refuse every move on that island — including the moves that repair it. So
 * a building already stranded without the candidate is not held against it, which is
 * also what makes a saved dev city safe to load without relocating anyone's buildings.
 * On any layout this rule has governed the baseline is empty and the two readings
 * coincide.
 *
 * `blockedCells` is the overlap set (buildings + hall + ROADS — a building may not drop
 * onto paving); `others` is every other occupant as a placement, for the walk. Roads
 * appear in the first and deliberately not in the second.
 */
export function placementRefusal(params: {
  readonly candidate: PlacedTransform;
  readonly others: readonly PlacedTransform[];
  readonly blockedCells: ReadonlySet<string>;
  /**
   * The disc this island offers, in world units — `islandLand.ts`'s
   * `eraBuildableDiscRadius` for a caller that means an era, or the live
   * `buildableDiscRadius` for one mid-ceremony. Required, so no gate can get era one's
   * island by omission while the learner is standing on era six's.
   */
  readonly buildableRadius: number;
}): PlacementRefusal | null {
  const { candidate, others, blockedCells, buildableRadius } = params;
  const fp = footprintFor(candidate.nodeId);
  if (!isFootprintInBounds(candidate, fp, buildableRadius)) {
    return "bounds";
  }
  for (const key of footprintCells(candidate, fp)) {
    if (blockedCells.has(key)) {
      return "overlap";
    }
  }
  const after = unreachableNodeIds([...others, candidate], buildableRadius);
  if (after.length === 0) {
    return null;
  }
  // Only reached when something IS stranded, so the second flood fill costs nothing
  // in the ordinary case.
  const inherited = new Set(unreachableNodeIds(others, buildableRadius));
  return after.some((nodeId) => !inherited.has(nodeId)) ? "unreachable" : null;
}

/** Grid cell reach (in cells) from the origin that could ever be buildable. */
function cellReachFor(buildableRadius: number): number {
  return Math.ceil(buildableRadius / GRID_CELL) + 1;
}

/**
 * Find a sensible open cell for a footprint, scanning the FINE per-cell grid
 * outward from the origin so the shop → "Build here" path (and headless tests)
 * always land on the open spot nearest the center. Returns `null` only if the
 * island is somehow full.
 */
export function findOpenCell(
  fp: Footprint,
  occupied: ReadonlySet<string>,
  buildableRadius: number,
  rot = 0,
  /**
   * When given, the cell must also satisfy {@link placementRefusal} — so a seeded
   * spot is one the player can actually confirm, rather than a ghost that opens
   * blocked. `nodeId` must be the node whose footprint `fp` is.
   */
  reachability?: { readonly nodeId: string; readonly others: readonly PlacedTransform[] },
): Transform | null {
  const reach = cellReachFor(buildableRadius);
  const candidates: Transform[] = [];
  for (let col = -reach; col <= reach; col += 1) {
    for (let row = -reach; row <= reach; row += 1) {
      candidates.push({ col, row, rot });
    }
  }
  candidates.sort((a, b) => {
    const ca = transformCenter(a, fp);
    const cb = transformCenter(b, fp);
    return Math.hypot(ca.x, ca.z) - Math.hypot(cb.x, cb.z);
  });
  for (const t of candidates) {
    if (!isPlacementValid(t, fp, occupied, buildableRadius)) {
      continue;
    }
    if (
      reachability &&
      placementRefusal({
        candidate: { nodeId: reachability.nodeId, ...t },
        others: reachability.others,
        blockedCells: occupied,
        buildableRadius,
      }) !== null
    ) {
      continue;
    }
    return t;
  }
  return null;
}

/**
 * A tidy default layout for the demo mock (all-placed states) — greedily lays each
 * node on the next open cell from the per-cell candidate grid (nearest the center
 * first) so the mock city reads as a real little settlement, never overlapping and
 * always in bounds. Mixed footprints pack side by side on the fine grid.
 *
 * `reserved` marks cells as already occupied BEFORE the layout runs — pass the
 * pre-seeded Town Hall here so no skill building is ever auto-placed on top of the
 * hub (the layout fills nearest-origin-first, which is exactly where the hub sits).
 */
export function defaultPlacements(
  nodeIds: readonly string[],
  reserved: readonly PlacedTransform[],
  buildableRadius: number,
): PlacedTransform[] {
  const reach = cellReachFor(buildableRadius);
  const spaced: Transform[] = [];
  for (let col = -reach; col <= reach; col += 1) {
    for (let row = -reach; row <= reach; row += 1) {
      spaced.push({ col, row, rot: 0 });
    }
  }
  spaced.sort((a, b) => {
    const ca = cellCenter(a.col, a.row);
    const cb = cellCenter(b.col, b.row);
    return Math.hypot(ca.x, ca.z) - Math.hypot(cb.x, cb.z);
  });

  const placed: PlacedTransform[] = [];
  const occupied = occupiedCells(reserved);
  for (const nodeId of nodeIds) {
    const fp = footprintFor(nodeId);
    // Greedy, but reachability-aware: the layout it produces satisfies
    // `placementRefusal` for the same reason a player's does, rather than by luck.
    // The shipped era-one layout is unchanged by this — it never sealed anyone in —
    // so no existing fixture moves.
    const others = [...reserved, ...placed];
    const reachability = { nodeId, others };
    const fits = (t: Transform): boolean =>
      isPlacementValid(t, fp, occupied, buildableRadius) &&
      placementRefusal({
        candidate: { nodeId, ...t },
        others,
        blockedCells: occupied,
        buildableRadius,
      }) === null;
    const spot =
      spaced.find(fits) ?? findOpenCell(fp, occupied, buildableRadius, 0, reachability);
    if (!spot) {
      continue;
    }
    const transform: PlacedTransform = { nodeId, ...spot };
    placed.push(transform);
    for (const key of footprintCells(transform, fp)) {
      occupied.add(key);
    }
  }
  return placed;
}

/**
 * How far the default camera sits from its target, as a multiple of the island's
 * grass radius. A whole-island framing is a RATIO and not a distance: the picture a
 * player gets is scale-invariant, so the same multiple over a bigger disc is the same
 * composition seen from further out. That is the property that makes island growth a
 * camera no-op (`three/cityFraming.ts` re-derives the frame from the radius), and it
 * only holds while the distance is derived from the radius rather than pinned.
 */
export const CAMERA_DISTANCE_RATIO = 2.3;

/** Everything the 3D scene + camera need — a fixed-size island framing. */
export interface CityLayout {
  /** The island (and world) center — always the origin. */
  readonly center: GroundPoint;
  /** World Y of the buildable grass surface. */
  readonly surfaceY: number;
  /** Visual grass-top radius (drives shadows / fog / camera framing). */
  readonly islandRadius: number;
  /**
   * Radius a footprint must sit within to be buildable — {@link buildableRadiusForLand} of
   * this layout's own `islandRadius`, so it grows with the island rather than staying on era
   * one's constant.
   */
  readonly buildableRadius: number;
  /** Teal lagoon radius. */
  readonly seaRadius: number;
  /** Placement tile size. */
  readonly gridCell: number;
  /** Default fixed-angle camera target (looks slightly above the ground). */
  readonly cameraTarget: readonly [number, number, number];
  /** Default fixed-angle camera distance from the target. */
  readonly cameraDistance: number;
}

/**
 * Compose the starter-island layout a scene/camera needs, FOR THE ISLAND RADIUS IT IS
 * LAYING OUT.
 *
 * ## WHY THIS TAKES AN ARGUMENT, WHEN NOBODY PASSES ONE YET
 *
 * `cameraDistance` has always been `radius * 2.3` — the scaling was written and then
 * closed over `ISLAND_GRASS_RADIUS`, so there was nothing a caller could drive it with.
 * That was the same defect shape as `isCellBuildable`, which closed over `BUILDABLE_RADIUS`
 * and is why the auto-layout seated a four-age roster of 21 buildings as 18. Here it meant the
 * camera COULD NOT follow a growing island even though it was written as if it could. Both are
 * now closed, and by the same move: the radius is an input.
 *
 * Taking the radius is the whole of the fix, because the framing downstream is
 * scale-invariant: at `radius * CAMERA_DISTANCE_RATIO` the island projects to the same
 * picture at every radius, so a grown island is framed correctly without a second
 * decision anywhere. `three/cityFraming.ts` re-derives the default frame from this
 * layout, and `three/cityFraming.browser.test.tsx` photographs two radii to show the
 * two frames are the same picture.
 *
 * ## ⚑ `buildableRadius` NOW FOLLOWS THE LAND, AND IT USED TO BE THE MODULE CONSTANT
 *
 * This block used to read *"`buildableRadius` stays on its module constant"*, on the reasoning
 * that D-ERA25 authors the disc per era and that deriving it here would put a number on screen
 * no era authored. The first half is still true and the conclusion was wrong: the number an era
 * authors is a number the drawn land often cannot pay for. Four of the ten budgets are clamped
 * by `islandLand.ts`'s growth ceiling, so era nine's authored 64 sits eighteen units past the
 * grass 46 the game actually draws it on.
 *
 * What is NOT a free choice is the relation between the two. `islandLand.ts` derives an era's
 * grass by ADDING {@link GRASS_OVER_BUILDABLE} to its authored budget, so subtracting the same
 * margin here is that derivation read backwards rather than a second opinion about it — the two
 * meet exactly at every unclamped era, which `islandLand.test.ts` asserts per era. That is what
 * lets this stay a composition: it authors nothing, it re-reads what `islandLand.ts` authored.
 *
 * And it means every caller that already had to name its island under #521 gets the right disc
 * for that island with no second argument to forget. `seaRadius` keeps its own separate default
 * for the reason below.
 *
 * ## WHAT DOES NOT FOLLOW THE RADIUS, AND WHY IT WOULD BE WRONG TO MAKE IT
 *
 * `seaRadius` is a SECOND ARGUMENT rather than a derivation. §5.1 / D-ERA26 record that
 * `ISLAND_GRASS_RADIUS` and `SEA_RADIUS` "do not follow `BUILDABLE_RADIUS` — they are
 * independent constants that `computeCityLayout` reads separately", so every era that grows the
 * island re-authors its shore. Deriving the lagoon from the grass radius HERE would put a
 * number on screen that no era authored, which is exactly what #376 refused to do.
 *
 * So the lagoon is taken exactly as the grass radius is — from the caller, defaulting to
 * the shipped constant — and `city/islandLand.ts` is where the per-era decision lives and
 * carries its own reasoning. That keeps this function a composition and not an author.
 *
 * ## ⚑ THE RADIUS IS REQUIRED, AND IT USED TO DEFAULT TO ERA ONE'S
 *
 * `islandRadius` defaulted to {@link ISLAND_GRASS_RADIUS}, so `computeCityLayout()` returned
 * **era one's island** — and it read like "the city layout" at every call site that wrote it.
 * Two guards took it that way while measuring ERA TWO: `eraTwoGround.test.ts` asserted era
 * two's worked field against a **2.8u** margin ring and `three/eraTwoField.browser.test.tsx`
 * PHOTOGRAPHED it there, where era two's island is drawn at grass **38** with a **10.8u** ring.
 * Both were green, and both were green over a container the game does not ship: era two's
 * fields shipped a third of the width its style guide implies, and the era ceremony's fourth
 * beat — *"the whole island has turned"* — moved 0.62% of a 1024x580 frame.
 *
 * `.cursor/rules/qa-verification.mdc` calls this shape out under *"a width pinned in a guard is
 * the same substitution with a test standing in for the box"*: a true measurement in a box no
 * container has. **The default was what made it free to write, so the default is gone.** A
 * caller now has to say which island it means, and `islandLand.ts`'s `eraCityLayout` is the
 * answer for anyone who means *"the one this era is drawn on"* — including era one, which is
 * how a measurement about era one says so rather than getting it by omission.
 *
 * `seaRadius` keeps its default, deliberately and narrowly: it is not the axis anything was
 * measured wrong on, and the framing sweeps that pass a radius alone (`cityFraming.test.ts`)
 * want the shipped lagoon behind a grown island on purpose.
 */
export function computeCityLayout(
  islandRadius: number,
  seaRadius: number = SEA_RADIUS,
): CityLayout {
  return {
    center: { x: 0, z: 0 },
    surfaceY: SURFACE_Y,
    islandRadius,
    buildableRadius: buildableRadiusForLand(islandRadius),
    seaRadius,
    gridCell: GRID_CELL,
    cameraTarget: [0, 2, 0],
    cameraDistance: islandRadius * CAMERA_DISTANCE_RATIO,
  };
}
