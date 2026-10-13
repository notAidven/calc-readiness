import * as THREE from "three";

import { GRID_CELL, ISLAND_GRASS_RADIUS } from "../worldLayout";
import { WINTER_SCENE_TONES as W } from "./winterTones";

/**
 * **THE CRISIS'S SCENE ASSETS: SNOW ON THE GROUND, SNOW AGAINST WALLS, AND THE PATHS THAT
 * KEEP THE SETTLEMENT INHABITED.**
 *
 * Wired from `docs/superpowers/specs/2026-07-30-winter-crisis-scene-assets.html` (assets 2, 3
 * and 4). It is one layer with `WinterGround.tsx` and not a second winter system: everything
 * here is built into the SAME group `buildWinterGroundGroup` returns, on the SAME depth
 * ladder, so there is one place that decides what the island wears while a winter is on it.
 *
 * ## THE HOUSE RULES THESE ASSETS ARE BUILT UNDER
 *
 * Four lights scene-wide and no `EffectComposer`, so nothing here may add a light, an
 * emissive, a bloom or a post effect. No textures and no environment map. Everything
 * flat-shaded, which is how the whole island reads its facets. Every mesh states
 * `castShadow` and `receiveShadow` rather than leaving them at their defaults — including
 * where the answer is `false`, because a ground plane that casts onto itself is shadow acne
 * and saying so is the point.
 *
 * ## VERTEX COLOURS ARE ALWAYS BACKED BY AN ATTRIBUTE THIS FILE BUILT
 *
 * Three of these assets face their facets with per-triangle vertex colours rather than one
 * material per tone, because a hundred materials is a hundred draw calls. In three.js
 * `vertexColors: true` over geometry with no `color` attribute renders BLACK — the shader
 * declares the attribute, WebGL supplies `(0,0,0)` for a missing one, and the diffuse term is
 * multiplied by it. Every `vertexColors` material below is therefore created in the same
 * function that wrote the attribute, and `winterScene.test.ts` sweeps the built groups for a
 * material that lost its attribute. See {@link facedMaterial}.
 */

/** The house material rule, applied to every material this batch creates. */
export function flatWinter(
  params: THREE.MeshStandardMaterialParameters = {},
): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    flatShading: true,
    metalness: 0,
    roughness: 0.95,
    ...params,
  });
}

/**
 * A `vertexColors` material that can only be made for geometry that already carries the
 * attribute it reads.
 *
 * The guard is the whole reason this function exists rather than a `flatWinter({ vertexColors:
 * true })` at each site: it makes the black-out hazard unrepresentable instead of merely
 * documented, and it throws at build time on the island rather than rendering a black plate.
 */
export function facedMaterial(
  geometry: THREE.BufferGeometry,
  params: THREE.MeshStandardMaterialParameters = {},
): THREE.MeshStandardMaterial {
  if (!geometry.getAttribute("color")) {
    throw new Error(
      "a vertexColors winter material needs a `color` attribute; without one three.js " +
        "multiplies the diffuse term by (0,0,0) and the surface renders black",
    );
  }
  return flatWinter({ vertexColors: true, ...params });
}

/** Write one linear-space colour into a per-vertex buffer for all three verts of a face. */
function paintFace(
  into: Float32Array,
  firstVertex: number,
  scratch: THREE.Color,
  hex: number,
): void {
  scratch.set(hex).convertSRGBToLinear();
  for (let k = 0; k < 3; k += 1) {
    into.set([scratch.r, scratch.g, scratch.b], (firstVertex + k) * 3);
  }
}

/* -------------------------------------------------------------------------- */
/* Asset 2 — the snow ground course                                           */
/* -------------------------------------------------------------------------- */

/**
 * How far past the visible grass the course reaches, so the snow ends on the beach rather
 * than at the grass line.
 */
const COURSE_OVERHANG = 0.4;

/** Angular segments in the disc. 84 puts a facet edge about every 2.3 units at the rim. */
const COURSE_SEGMENTS = 84;

/**
 * Rings of facets from the middle out to the coast.
 *
 * **THE DESIGN BATCH'S DISC CANNOT FACET, AND THIS IS THE FIX.** It builds the course from
 * `THREE.CircleGeometry(30.4, 84)`, which has no radial subdivision at all: it is 84 long thin
 * pie slices sharing one centre vertex. Both of the asset's own mechanisms degenerate on that
 * geometry — the per-vertex jitter can only move the rim and the single centre point, so it
 * makes a shallow cone rather than a field of facets, and the per-face tone picker reads 84
 * centroids strung round one circle, so it lays the three tones down as radial STRIPES. Rendered
 * and photographed before this was changed, the island wore an unmistakable grey-and-white
 * sunburst, at both 49° and the plates' 16°.
 *
 * Thirteen rings puts the ring width at about 2.34 units against a 2.28-unit arc at the rim, so
 * a rim facet is roughly square and the tone picker has a genuinely two-dimensional field of
 * centroids to hash. 2,100 triangles, which is nothing beside the road stack.
 */
const COURSE_RINGS = 13;

/**
 * Peak of the course's own vertex jitter above its base, in world units.
 *
 * **THIS NUMBER SETS WHERE THE PER-CELL STATES START.** The course is not flat, so the board
 * states stacked over it have to clear its crest or the frost line disappears into a snow
 * bump. `winterCourseTop` derives the states' first rung from this, and `winterGround.test.ts`
 * pins the clearance — see that file's ladder assertions.
 */
export const SNOW_COURSE_RELIEF = 0.2;

/** Name on the whole snow group, so a test can find it without reaching into geometry. */
export const SNOW_COURSE_NAME = "winter-snow-course";
export const SNOW_LIP_NAME = "winter-snow-coast-lip";

/**
 * **ONE MESH FOR THE WHOLE DISC, NOT ONE PER CELL — and that is the load-bearing decision.**
 *
 * The crisis grid stops at `BUILDABLE_RADIUS` (22) and the grass reaches `ISLAND_GRASS_RADIUS`
 * (30), so a per-cell course leaves an eight-unit green ring around the settlement: visible
 * from every heading, and unmistakably a bug rather than a design. The course is a single
 * faceted disc laid OVER the whole island, jittered per vertex so it facets under the flat
 * shading instead of reading as a white plate, with a darker lip at the coast so the snow ends
 * banked on a beach rather than cut at a clean circle.
 *
 * The jitter is hashed off POSITION rather than drawn from a generator, so the same island
 * facets the same way across a reload and a save — the design batch's own requirement, and the
 * house rule every seeded thing on this island already follows.
 *
 * A consequence worth stating: the visual extent and the gameplay extent are now deliberately
 * decoupled. A per-cell "is this cell frozen" query is a gameplay concern and no longer
 * describes what the player sees.
 */
export function buildSnowCourse(baseY: number): THREE.Group {
  const outer = ISLAND_GRASS_RADIUS + COURSE_OVERHANG;

  // Height at one point on the disc: the jitter is hashed off POSITION, so the same island
  // facets the same way across a reload and a save, and flattened to nothing at the coast so
  // the edge is a rim rather than a cliff.
  const heightAt = (x: number, z: number): number => {
    const r = Math.hypot(x, z);
    const h = Math.sin(x * 1.7 + z * 0.9) * Math.cos(z * 1.31 - x * 0.44);
    const rim = Math.min(1, Math.max(0, (outer - r) / 2.2));
    const relief = SNOW_COURSE_RELIEF / 2;
    return baseY + (relief + relief * h) * rim;
  };

  // A ring-subdivided disc, written out rather than taken from `CircleGeometry` — see
  // `COURSE_RINGS` for why that primitive cannot carry this asset. Non-indexed by
  // construction, which per-face colour needs anyway.
  const verts: number[] = [];
  const pushVertex = (x: number, z: number) => verts.push(x, heightAt(x, z), z);
  for (let ring = 0; ring < COURSE_RINGS; ring += 1) {
    const r0 = (outer * ring) / COURSE_RINGS;
    const r1 = (outer * (ring + 1)) / COURSE_RINGS;
    for (let seg = 0; seg < COURSE_SEGMENTS; seg += 1) {
      const a0 = (seg / COURSE_SEGMENTS) * Math.PI * 2;
      const a1 = ((seg + 1) / COURSE_SEGMENTS) * Math.PI * 2;
      const [c0, s0] = [Math.cos(a0), Math.sin(a0)];
      const [c1, s1] = [Math.cos(a1), Math.sin(a1)];
      // Wound so the face normal is +Y. A ground plane wound the other way is INVISIBLE from
      // this camera and passes every structural assertion about it; `winterScene.test.ts`
      // measures the winding for exactly that reason.
      if (ring > 0) {
        pushVertex(c0 * r0, s0 * r0);
        pushVertex(c1 * r0, s1 * r0);
        pushVertex(c0 * r1, s0 * r1);
      }
      pushVertex(c0 * r1, s0 * r1);
      pushVertex(c1 * r0, s1 * r0);
      pushVertex(c1 * r1, s1 * r1);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
  const position = geometry.attributes.position as THREE.BufferAttribute;
  geometry.computeVertexNormals();

  // Three-tone facets, plus a fourth at the rim. Depth of drift, not noise: the course is
  // read as deeper toward the middle and banked where it meets the water.
  const tones = [W.SNOW_LIT, W.SNOW_MID, W.SNOW_SHADE];
  const colors = new Float32Array(position.count * 3);
  const scratch = new THREE.Color();
  for (let f = 0; f < position.count; f += 3) {
    const cx = (position.getX(f) + position.getX(f + 1) + position.getX(f + 2)) / 3;
    const cz = (position.getZ(f) + position.getZ(f + 1) + position.getZ(f + 2)) / 3;
    const r = Math.hypot(cx, cz) / ISLAND_GRASS_RADIUS;
    const pick =
      r > 0.94
        ? W.SNOW_DEEP
        : (tones[Math.abs(Math.round(cx * 3.1 + cz * 1.7)) % 3] as number);
    paintFace(colors, f, scratch, pick);
  }
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

  const course = new THREE.Mesh(
    geometry,
    facedMaterial(geometry, {
      // Beat the grass and every ground decal under it: the course is above them on the
      // ladder, but the ladder's step is small and the offset is in depth-buffer units, so
      // one unit is one resolvable step however far out the camera is.
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    }),
  );
  course.name = SNOW_COURSE_NAME;
  course.receiveShadow = true;
  // A ground plane that casts onto itself is shadow acne, which is why this is the one
  // `false` in the layer and why it is stated rather than defaulted.
  course.castShadow = false;

  // The coast lip: a low ring in the deepest snow tone so the edge reads as banked. The
  // design batch substituted it for the reference plates' feathered alpha edge, which would
  // have needed either a texture or a shader.
  const lipGeometry = new THREE.RingGeometry(
    ISLAND_GRASS_RADIUS - 0.7,
    outer + 0.05,
    COURSE_SEGMENTS,
    1,
  ).rotateX(-Math.PI / 2);
  const lip = new THREE.Mesh(lipGeometry, flatWinter({ color: W.SNOW_DEEP }));
  lip.name = SNOW_LIP_NAME;
  lip.position.y = baseY - 0.03;
  lip.receiveShadow = true;
  lip.castShadow = false;

  const group = new THREE.Group();
  group.name = "winter-snow-ground";
  group.add(course, lip);
  return group;
}

/** Name on the frozen margin, so a test can find it without reaching into geometry. */
export const FROST_MARGIN_NAME = "winter-frost-margin";

/** Where the drawn island ends: the grass line plus the snow course's overhang onto the beach. */
export const WINTER_COAST_RADIUS = ISLAND_GRASS_RADIUS + COURSE_OVERHANG;

/**
 * Is this off-board cell part of the frozen margin — that is, ground the frost already holds?
 *
 * The same corner test {@link buildFrostMargin} draws by, exported so the FRONT can ask the
 * question too. The two have to agree: the front now stands on the frost's own ice
 * (`frostFrontMarks` in `WinterGround.tsx`), so a cell this says yes to is a cell the margin
 * painted, and a mark placed on ground the margin left bare would be shove ice standing on snow.
 */
export function isFrostMarginCell(col: number, row: number, cell: number): boolean {
  const half = cell / 2;
  const cx = (col + 0.5) * cell;
  const cz = (row + 0.5) * cell;
  const nearest = Math.hypot(
    Math.max(0, Math.abs(cx) - half),
    Math.max(0, Math.abs(cz) - half),
  );
  return nearest < WINTER_COAST_RADIUS;
}

/**
 * **THE ISLAND OUTSIDE THE BOARD, ALREADY THE FROST'S. THIS IS WHY THE FRONT NOW STARTS AT THE
 * ISLAND'S EDGE.**
 *
 * The lead, 2026-08-02, having played it: *"the frost ring doesnt start on the edge of the island
 * like i instructed."*
 *
 * ## THE MEASUREMENT, off the frame rather than off the model
 *
 * He is right, and the engine is not where it was wrong. The board is `eraBuildableRadius` — 22
 * world units for era one — and round one's front is every one of its 28 depth-0 cells, which is
 * genuinely the outermost ring of ground a player can hold. But the island a player SEES reaches
 * `ISLAND_GRASS_RADIUS` (30) plus {@link COURSE_OVERHANG}, snow-coursed edge to edge by
 * {@link buildSnowCourse}. So round one's front was drawn between 72% and 79% of the drawn
 * island's radius, and **more of the island lay outside the frost than under the board: 1,408
 * units² of plan area against a 2,903-unit² disc, so 51.5% of what a player sees was untouched
 * ground beyond the front.** A blue ring in a white field with beach, trees and snow beyond it,
 * which is exactly the picture he objected to. Photographed at 1024x580 before and after, in
 * `frostFront.browser.test.tsx`.
 *
 * ## WHAT THIS DRAWS, AND WHY IT IS THIS RATHER THAN A WIDER BOARD
 *
 * Every cell of the island that is not on the board, in the frost's own tone, for the whole
 * winter. The frost holds the sea (`buildFrozenLagoon`) and it holds the margin, so the front is
 * the boundary between what the settlement still has and what the winter already took, and there
 * is no untouched ground outside it at any round.
 *
 * The other two ways to close the gap were both worse, and one of them has been tried:
 *
 *  - **widen the board to the drawn coast.** That is `frost_rings_beyond_buildable`, hand-edited
 *    in under demo pressure on 2026-07-31 (`93cf65c7`) and dropped after #362 measured it as the
 *    most destructive of that day's three values: the frost spends a round crossing ground nothing
 *    stands on, which makes the encounter LONGER and emptier. `HARD_WINTER.spread`'s docblock
 *    carries that history;
 *  - **shrink the drawn island to the board.** That is the summer city's silhouette, five eras of
 *    authored dressing sit in the margin, and it would be a change to the whole product to fix one
 *    frame of one encounter.
 *
 * Cell-aligned rather than an annulus, because the board's outer boundary is a digitised circle
 * and a round inner edge would either leave gaps against it or run under clear board cells and
 * paint them frozen. Vertices are clamped radially to the coast, so the outer edge is the coast's
 * own circle however the cell grid falls across it.
 *
 * ## AND IT IS THE BOARD'S OWN FROST, NOT A SECOND ICE
 *
 * `spec` is `TERRAIN.frozen`'s, passed in, so the margin is the same tone, the same three-value
 * facet spread and the same dish as the board's frozen cells: the frost that reaches the
 * settlement in round two is continuous with the frost that already holds the shore, which is the
 * whole point of drawing it. It is one merged mesh rather than {@link buildCellTerrain} per cell
 * for the coast's sake — a per-cell margin ends in four-unit steps against a round island, and the
 * outermost step overhangs the beach.
 *
 * **THE FACET HASH IS OFF WORLD POSITION and not off the cell**, which is the same rule
 * {@link buildCellTerrain} states and for a sharper reason here: hashed per cell on a regular
 * lattice, three values over `col * 7 + row * 13` came back as an unmistakable CHECKERBOARD, and
 * it was photographed before it was fixed. A lattice hashed by a linear form in the lattice
 * indices is periodic by construction.
 */
export function buildFrostMargin(
  onBoard: ReadonlySet<string>,
  y: number,
  cell: number,
  spec: CellTerrainSpec,
): THREE.Group {
  const group = new THREE.Group();
  group.name = FROST_MARGIN_NAME;
  const coast = WINTER_COAST_RADIUS;
  // One cell past the coast, so a cell whose centre is outside it still contributes the part of
  // itself that is inside. Clamping turns whatever hangs over into a zero-area sliver on the
  // circle, so there is no seam and nothing to special-case.
  const reach = Math.ceil((coast + cell) / cell) + 1;
  const half = cell / 2;
  const salt = spec.color % 97;
  const n = Math.max(2, spec.segments);

  const positions: number[] = [];
  const values: number[] = [];
  // Radially clamped to the coast: a vertex inside it is where it is, one outside is pulled back
  // along its own ray. The island's edge is a circle and the grid is not, so this is what makes
  // the margin end ON the coast rather than in cell steps beside it.
  const push = (x: number, z: number): void => {
    const r = Math.hypot(x, z);
    const scale = r > coast ? coast / r : 1;
    // Dished on the same hash the board's cells use, so a margin cell and the frozen cell beside
    // it agree on the height of the vertex they share and the pair reads as one surface.
    positions.push(x * scale, y - spec.dish * groundHash(x, z, salt), z * scale);
  };

  for (let row = -reach; row <= reach; row += 1) {
    for (let col = -reach; col <= reach; col += 1) {
      if (onBoard.has(`${col},${row}`)) {
        continue;
      }
      const cx = (col + 0.5) * cell;
      const cz = (row + 0.5) * cell;
      // Any corner inside the coast is enough to be worth drawing; a cell wholly outside would
      // clamp to nothing anyway, and skipping it keeps the buffer small. Asked through the
      // exported predicate so the FRONT, which now stands on this ice, cannot disagree about
      // where it reaches.
      if (!isFrostMarginCell(col, row, cell)) {
        continue;
      }
      for (let i = 0; i < n; i += 1) {
        for (let j = 0; j < n; j += 1) {
          const x0 = cx - half + (i / n) * cell;
          const x1 = cx - half + ((i + 1) / n) * cell;
          const z0 = cz - half + (j / n) * cell;
          const z1 = cz - half + ((j + 1) / n) * cell;
          // Wound +Y, for the same reason the snow course is: ground facing down is ground
          // nobody sees, and it passes every structural assertion about being present.
          push(x0, z0);
          push(x0, z1);
          push(x1, z0);
          push(x1, z0);
          push(x0, z1);
          push(x1, z1);
          const pick = Math.floor(
            groundHash((x0 + x1) / 2, (z0 + z1) / 2, salt + 3) * spec.values.length,
          );
          const value = spec.values[Math.min(spec.values.length - 1, pick)] as number;
          values.push(value, value);
        }
      }
    }
  }

  if (positions.length === 0) {
    return group;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  const colors = new Float32Array((positions.length / 3) * 3);
  for (const [face, value] of values.entries()) {
    paintFaceValue(colors, face * 3, value);
  }
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geometry.computeVertexNormals();

  const plate = new THREE.Mesh(
    geometry,
    // The state's tone in `material.color` with the facets multiplying it, exactly as a board
    // cell carries it, so the in-city legend's frost swatch describes the margin too.
    facedMaterial(geometry, {
      color: spec.color,
      roughness: 0.94,
      // Over the snow course and its coast lip, both of which reach the same reach.
      polygonOffset: true,
      polygonOffsetFactor: -3,
      polygonOffsetUnits: -3,
    }),
  );
  plate.name = `${FROST_MARGIN_NAME}-plate`;
  plate.receiveShadow = true;
  plate.castShadow = false;
  group.add(plate);
  return group;
}

/* -------------------------------------------------------------------------- */
/* The board states, as terrain rather than as paint                          */
/* -------------------------------------------------------------------------- */

/**
 * **A BOARD-STATE CELL, DRAWN THE WAY THIS ISLAND DRAWS GROUND.**
 *
 * Every state the winter projects — frozen, the frost line, ground a fire holds, ground given
 * up for good — used to be one `BoxGeometry(4, 1, 4)` in one flat tone. Four of those in a
 * cross is what the lead was looking at: *"the frosted 'Covered' squares look super flat too.
 * it should absolutely not be a flat square"*. The defect is not the hue and it is not per
 * state, it is that **a flat single-tone quad is not how anything else on this island is
 * drawn.** The ground around it is faceted low-poly with per-facet tone: `buildSnowCourse`
 * above jitters its vertices and paints its faces, `StarterIsland`'s own worn earth is lumps
 * on a ladder, and the light catching those planes at different angles is the whole look.
 *
 * So this is ONE builder every state goes through, and a state added later inherits it:
 *
 *  - **the top is a subdivided surface, not a quad**, sinking below its rung by `dish` on a
 *    hash of WORLD position, so it facets under the flat shading the island reads form by;
 *  - **the facets carry their own value**, as a per-face multiplier on the state's one tone.
 *    The tone stays in `material.color` (the in-city legend paints its swatch from the same
 *    table) and the variation is a multiplier on it, so the state is still ONE named colour
 *    and `winterGround.test.ts`'s reserved-gold sweep still sees the hue it checks;
 *  - **the edge is a treatment, not a cut**, and which treatment is the state's own — see
 *    {@link CellEdge}.
 *
 * ## WHY THE HASH IS OFF WORLD POSITION AND NOT OFF THE CELL
 *
 * Two cells in the same state that touch must read as ONE surface with a boundary round the
 * pair, which is what §3.2 of the art brief asks for. A per-cell hash would put a seam down
 * every shared edge and hand back the grid of squares this replaces. Hashing off world
 * position means both cells compute the same height for the shared vertex and the surface is
 * continuous across it — for free, with no neighbour bookkeeping.
 *
 * `exposed` is still needed, because the EDGE treatment is only owed where the state actually
 * ends. It says which of the four sides has no same-state neighbour.
 */
export type CellEdge = "lip" | "crest" | "feather" | "churn";

export interface CellTerrainSpec {
  /** The state's one tone. Goes in `material.color`; the facets multiply it. */
  readonly color: number;
  /** How far the surface sinks below its rung at its deepest, in world units. */
  readonly dish: number;
  /** Facets per axis. A second channel the states read apart by. */
  readonly segments: number;
  /** How the state ends where it has no neighbour. */
  readonly edge: CellEdge;
  /** Per-face value multipliers on `color`, darkest first. Three or more. */
  readonly values: readonly number[];
}

export interface CellExposure {
  readonly north: boolean;
  readonly south: boolean;
  readonly east: boolean;
  readonly west: boolean;
}

/** Every side exposed: a state standing alone, which is the common case for a frost line. */
export const ALL_EXPOSED: CellExposure = {
  north: true,
  south: true,
  east: true,
  west: true,
};

/**
 * How far a `crest` edge stands ABOVE its rung.
 *
 * Deliberately under `GROUND_DECAL_STEP` (0.05), which is the one thing keeping the crest
 * honest: the rungs are one step apart, so a rise of a full step could reach the plane of the
 * state stacked above it on the same cell and z-fight along the border. This cannot.
 */
const CREST_RISE = 0.04;

/** How far a `feather` edge is pulled back in plan, at most. About an eighth of a cell. */
const FEATHER_INSET = 0.5;

/** Hash in [0,1) off a world position. Positional, so a seam between two cells agrees. */
function groundHash(x: number, z: number, salt: number): number {
  const v = Math.sin(x * 12.9898 + z * 78.233 + salt * 37.719) * 43758.5453;
  return v - Math.floor(v);
}

/** Write a linear value multiplier into all three vertices of a face. */
function paintFaceValue(into: Float32Array, firstVertex: number, value: number): void {
  for (let k = 0; k < 3; k += 1) {
    into.set([value, value, value], (firstVertex + k) * 3);
  }
}

const CELL_MATERIALS = new Map<number, THREE.MeshStandardMaterial>();

/**
 * One material per state tone, cached across cells so 128 tiles are a handful of draw calls.
 *
 * `facedMaterial` is what creates it, so the black-out hazard its own note describes is
 * checked here too: the first geometry through carries the attribute or this throws.
 */
function cellMaterial(
  geometry: THREE.BufferGeometry,
  color: number,
): THREE.MeshStandardMaterial {
  const cached = CELL_MATERIALS.get(color);
  if (cached) {
    return cached;
  }
  const made = facedMaterial(geometry, { color, roughness: 0.94 });
  CELL_MATERIALS.set(color, made);
  return made;
}

/**
 * Build one cell of board-state terrain, centred on `(x, z)` with its rung at `topY`.
 *
 * `depth` is how far the tile is bedded below its rung. Only the band between the rung and the
 * snow under it is ever seen; the rest is buried, for the same reason the roads bed their
 * courses — a visible side wall is most of what makes a flat band look laid down rather than
 * worn in, and here a shallow band of it is exactly the "low sheet with thickness" §3.2 asks
 * the frost for.
 */
export function buildCellTerrain(
  spec: CellTerrainSpec,
  x: number,
  z: number,
  topY: number,
  depth: number,
  exposed: CellExposure = ALL_EXPOSED,
): THREE.Mesh {
  const n = spec.segments;
  const half = GRID_CELL / 2;
  const salt = spec.color % 97;

  // Plan and height for every vertex of the top surface, in LOCAL space. Corner vertices on
  // an exposed side are moved in plan (a feather) and in height (a lip, a crest, a churn);
  // vertices on a shared side are left where the neighbour will also compute them.
  const grid: { x: number; y: number; z: number }[][] = [];
  for (let i = 0; i <= n; i += 1) {
    const column: { x: number; y: number; z: number }[] = [];
    for (let j = 0; j <= n; j += 1) {
      let lx = -half + (i / n) * GRID_CELL;
      let lz = -half + (j / n) * GRID_CELL;
      const onWest = i === 0 && exposed.west;
      const onEast = i === n && exposed.east;
      const onNorth = j === 0 && exposed.north;
      const onSouth = j === n && exposed.south;
      const rim = onWest || onEast || onNorth || onSouth;
      const inner = (i === 1 || i === n - 1 || j === 1 || j === n - 1) && !rim && n >= 3;

      if (spec.edge === "feather" && rim) {
        // Pull the rim back, unevenly, so the patch ENDS ragged instead of on a cell line.
        const back = FEATHER_INSET * (0.3 + 0.7 * groundHash(x + lx, z + lz, salt + 5));
        if (onWest) {
          lx += back;
        }
        if (onEast) {
          lx -= back;
        }
        if (onNorth) {
          lz += back;
        }
        if (onSouth) {
          lz -= back;
        }
      }

      const h = groundHash(x + lx, z + lz, salt);
      let y = -spec.dish * h;
      if (spec.edge === "churn") {
        // Broken, spoil-heaped: a second coarser octave, and the rim breaks up with it
        // rather than staying a straight line at one height.
        y =
          -spec.dish * (0.25 + 0.75 * h) +
          spec.dish * 0.35 * groundHash(x + lx, z + lz, salt + 11);
      } else if (rim) {
        if (spec.edge === "lip") {
          // The sheet ends on a lip at full height: a frozen cell beside a clear one shows
          // an edge, while two frozen cells merge because neither rim is exposed.
          y = 0;
        } else if (spec.edge === "crest") {
          y = CREST_RISE;
        } else if (spec.edge === "feather") {
          // Sunk to the floor of the dish, so held ground melts INTO the snow around it.
          y = -spec.dish;
        }
      } else if (inner && spec.edge === "crest") {
        // Deepest just behind the crest, which is what makes the crest read as directional.
        y = -spec.dish;
      }
      column.push({ x: lx, y, z: lz });
    }
    grid.push(column);
  }

  const positions: number[] = [];
  const push = (p: { x: number; y: number; z: number }) => positions.push(p.x, p.y, p.z);
  const at = (i: number, j: number) =>
    (grid[i] as { x: number; y: number; z: number }[])[j] as {
      x: number;
      y: number;
      z: number;
    };

  // The top surface. Wound +Y — a ground plane wound the other way is invisible from this
  // camera and passes every structural assertion about it (see the snow course).
  for (let i = 0; i < n; i += 1) {
    for (let j = 0; j < n; j += 1) {
      push(at(i, j));
      push(at(i, j + 1));
      push(at(i + 1, j));
      push(at(i + 1, j));
      push(at(i, j + 1));
      push(at(i + 1, j + 1));
    }
  }
  const topFaces = positions.length / 9;

  // The skirt: down from the rim to the bed, following the rim's own ragged plan, so a
  // feathered or churned edge is not given away by a straight wall under it.
  const rim: { x: number; y: number; z: number }[] = [];
  for (let i = 0; i < n; i += 1) {
    rim.push(at(i, 0));
  }
  for (let j = 0; j < n; j += 1) {
    rim.push(at(n, j));
  }
  for (let i = n; i > 0; i -= 1) {
    rim.push(at(i, n));
  }
  for (let j = n; j > 0; j -= 1) {
    rim.push(at(0, j));
  }
  for (let k = 0; k < rim.length; k += 1) {
    const a = rim[k] as { x: number; y: number; z: number };
    const b = rim[(k + 1) % rim.length] as { x: number; y: number; z: number };
    const floorA = { x: a.x, y: -depth, z: a.z };
    const floorB = { x: b.x, y: -depth, z: b.z };
    push(a);
    push(floorA);
    push(b);
    push(b);
    push(floorA);
    push(floorB);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  const position = geometry.attributes.position as THREE.BufferAttribute;
  const colors = new Float32Array(position.count * 3);
  const faces = position.count / 3;
  const darkest = spec.values[0] as number;
  for (let f = 0; f < faces; f += 1) {
    const v0 = f * 3;
    if (f >= topFaces) {
      // The bedded band, one step below the darkest facet: a side wall in the same value as
      // the top reads as a colour swatch standing on edge.
      paintFaceValue(colors, v0, darkest * 0.82);
      continue;
    }
    const cx = (position.getX(v0) + position.getX(v0 + 1) + position.getX(v0 + 2)) / 3;
    const cz = (position.getZ(v0) + position.getZ(v0 + 1) + position.getZ(v0 + 2)) / 3;
    // Discrete steps, not a ramp: a continuous gradient over a low-poly surface reads as a
    // smooth shaded blob, and the whole point is that the facets are individually visible.
    const pick = Math.floor(groundHash(x + cx, z + cz, salt + 3) * spec.values.length);
    paintFaceValue(
      colors,
      v0,
      spec.values[Math.min(pick, spec.values.length - 1)] as number,
    );
  }
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geometry.computeVertexNormals();

  const mesh = new THREE.Mesh(geometry, cellMaterial(geometry, spec.color));
  mesh.position.set(x, topY, z);
  mesh.receiveShadow = true;
  // A ground plane that casts onto itself is shadow acne, which is why this is `false` here
  // exactly as it is on the snow course under it, and why it is stated rather than defaulted.
  mesh.castShadow = false;
  return mesh;
}

/**
 * The deepest dish any state may take, in world units.
 *
 * **THE LADDER IS DERIVED FROM THIS, NOT HAND-COUNTED.** A state's surface sinks BELOW its
 * rung, so the first board rung has to clear the snow course's crest by at least this much or
 * the course pokes up through the dish. `WinterGround.tsx` derives `STATE_BASE_RUNG` from it
 * and `winterGround.test.ts` measures the built geometry against the crest rather than
 * trusting the arithmetic.
 */
export const CELL_MAX_DISH = 0.14;

/* -------------------------------------------------------------------------- */
/* Asset 3 — drifts against vertical surfaces                                 */
/* -------------------------------------------------------------------------- */

/**
 * The measured ceiling on a drift's height, in world units.
 *
 * **SIZING IS THE WHOLE JOB OF THIS ASSET.** At the shipped tilt a one-storey building is a
 * couple of world units of visible wall; a drift above this eats the wall and the building
 * stops reading as a building. The design batch asks for `min(0.9, wallHeight * 0.28)`, and
 * the cap is what binds on this island: the 0.28 term only wins below 3.21 units of wall, and
 * six of era one's seven placements render taller than that (the Lookout at 9.769u, the
 * Roundhouse at 4.821u — `worldLayout.ts` records the measurements). The Brownstones at
 * 2.608u would take 0.73 instead of 0.90, a 0.17-unit difference that is under two pixels at
 * the shipped camera distance, so the drift is built to the cap for every footprint and the
 * per-building measurement is not worth a frame-loop read of the model box.
 */
export const DRIFT_MAX_H = 0.9;

/** Prevailing wind, degrees. The windward pair of walls take the full drift, the lee pair 55%. */
export const WIND_DEG = 315;

export const DRIFT_NAME = "winter-drift";

/**
 * One drift, in local space: the wall runs along +X at z = 0 and the drift banks out toward
 * +Z. Full height where it meets the wall, collapsed to the ground at its outer edge, with
 * the crest notched so the seam is described by geometry rather than by the reference plates'
 * painted contact shadow.
 */
function driftGeometry(
  len: number,
  h: number,
  depth: number,
  seed: number,
): THREE.BoxGeometry {
  const geometry = new THREE.BoxGeometry(len, h, depth, Math.max(2, Math.round(len)), 1, 1);
  const position = geometry.attributes.position as THREE.BufferAttribute;
  const hash = (n: number) => (Math.sin(n * 12.9898 + seed * 78.233) * 43758.5453) % 1;

  for (let i = 0; i < position.count; i += 1) {
    const x = position.getX(i);
    const y = position.getY(i);
    const z = position.getZ(i);
    if (z > 0) {
      // Outer edge: collapse to the ground so the box becomes a bank.
      if (y > 0) {
        position.setY(i, -h / 2 + h * 0.06);
      }
    } else if (y > 0) {
      // Wall edge: notch the crest, and bite very slightly into the wall.
      position.setY(i, y - h * 0.22 * Math.abs(hash(x * 3.7)));
      position.setZ(i, z - depth * 0.04);
    }
  }
  geometry.translate(0, h / 2, depth / 2);
  geometry.computeVertexNormals();
  return geometry;
}

/**
 * **SNOW BANKED AGAINST A FOOTPRINT'S FOUR WALLS, plus two corner wedges.**
 *
 * Built in the local space of a building's own group (origin at the footprint centre, +Y up),
 * so `PlacedBuilding` can hang it beside the model stack exactly as it hangs the frost shell.
 * The corner wedges exist because a heading between the axes shows the corners, and four
 * axis-aligned banks leave them reading hollow from there.
 *
 * `spanX`/`spanZ` are the WALL span in world units, not the cell count — the caller has a
 * footprint and the model is contain-fit into it, so the wall the drift meets is the fitted
 * span and not the plot.
 */
export function buildDrifts(spanX: number, spanZ: number): THREE.Group {
  const h = DRIFT_MAX_H;
  const depth = 0.9 + h * 0.45;
  const group = new THREE.Group();
  group.name = DRIFT_NAME;

  const windward = flatWinter({ color: W.SNOW_LIT });
  const lee = flatWinter({ color: W.SNOW_MID });
  const wind = THREE.MathUtils.degToRad(WIND_DEG);

  const sides = [
    { rot: 0, len: spanX, off: [0, -spanZ / 2] },
    { rot: Math.PI, len: spanX, off: [0, spanZ / 2] },
    { rot: -Math.PI / 2, len: spanZ, off: [spanX / 2, 0] },
    { rot: Math.PI / 2, len: spanZ, off: [-spanX / 2, 0] },
  ] as const;

  sides.forEach((side, i) => {
    const facing = Math.cos(side.rot - wind);
    const scale = facing > 0 ? 1 : 0.55;
    const mesh = new THREE.Mesh(
      driftGeometry(side.len * (0.72 + 0.2 * scale), h * scale, depth * scale, i + 1),
      facing > 0 ? windward : lee,
    );
    mesh.rotation.y = side.rot;
    mesh.position.set(side.off[0], 0.04, side.off[1]);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
  });

  for (const [i, [sx, sz]] of (
    [
      [1, 1],
      [-1, -1],
    ] as const
  ).entries()) {
    const mesh = new THREE.Mesh(driftGeometry(1.3, h * 0.8, depth * 0.8, 9 + i), lee);
    mesh.rotation.y = Math.atan2(sx, sz) + Math.PI;
    mesh.position.set(((sx * spanX) / 2) * 0.9, 0.04, ((sz * spanZ) / 2) * 0.9);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
  }

  return group;
}

/* -------------------------------------------------------------------------- */
/* Asset 4 — trodden paths                                                    */
/* -------------------------------------------------------------------------- */

export const PATH_NAME = "winter-trodden-path";
export const PATH_SHOULDER_NAME = "winter-path-shoulder";

/** How far a shoulder bank rises above the snow it sits on. */
const SHOULDER_RISE = 0.3;

/** How wide a shoulder bank is, as a fraction of the cell it edges. */
const SHOULDER_WIDTH = 0.16;

/**
 * **THE PATHS ARE WHAT KEEPS THE SETTLEMENT INHABITED RATHER THAN ABANDONED.**
 *
 * The snow course covers the whole island, roads included, so without this the player's road
 * network is buried and the settlement reads as evacuated. The paths are drawn back on top:
 * a slush ribbon over each road cell, flanked by raised snow shoulders wherever the network
 * ENDS — so a path reads as worn down between banks, which is what a trodden path is.
 *
 * ## Why this takes road cells and not the batch's spline
 *
 * The batch's `buildTroddenPath(pts)` samples "the existing footpath spline". There is no such
 * spline in the settlement: the island's authored footpaths are decorative and live out in the
 * margin past `BUILDABLE_RADIUS`, and the thing people actually walk on is the ROAD NETWORK
 * the player painted — cells, keyed exactly as the winter's own cells are (`roadCellKey` and
 * `winterCellKey` are the same key). Deriving the ribbon from those cells is the same asset
 * against a truer source, and it avoids the defect a spline would have had here: consecutive
 * coplanar quads laid along a polyline overlap at every joint and z-fight, where one slab per
 * cell cannot overlap another at all.
 *
 * Puddling is kept — the slush alternates two tones by cell rather than by segment — and so
 * is the batch's reason for the warm brown: it is the only warm value left in the scene while
 * the crisis is on, which is exactly why it reads.
 */
export function buildTroddenPaths(
  roadCells: readonly { readonly col: number; readonly row: number }[],
  ribbonY: number,
): THREE.Group {
  const group = new THREE.Group();
  group.name = "winter-trodden-paths";

  // Deduplicated on the same `"col,row"` key the roads and the winter board both use, so a
  // cell laid twice is one ribbon rather than two coplanar slabs z-fighting on it.
  const cells = new Set(roadCells.map((cell) => `${cell.col},${cell.row}`));
  if (cells.size === 0) {
    return group;
  }

  const slushMid = flatWinter({ color: W.SLUSH_MID, roughness: 0.9 });
  const slushDark = flatWinter({ color: W.SLUSH_DARK, roughness: 0.9 });
  const shoulder = flatWinter({ color: W.SNOW_LIT });

  // A slab rather than a sheet: only the top face is ever seen, and a bedded slab cannot
  // z-fight the course under it the way two coplanar sheets would.
  const thick = 0.5;
  const ribbon = new THREE.BoxGeometry(GRID_CELL, thick, GRID_CELL);
  const bankLong = new THREE.BoxGeometry(
    GRID_CELL,
    SHOULDER_RISE,
    GRID_CELL * SHOULDER_WIDTH,
  );
  const bankShort = new THREE.BoxGeometry(
    GRID_CELL * SHOULDER_WIDTH,
    SHOULDER_RISE,
    GRID_CELL,
  );

  for (const key of [...cells].sort()) {
    const [colText, rowText] = key.split(",") as [string, string];
    const col = Number(colText);
    const row = Number(rowText);
    const x = (col + 0.5) * GRID_CELL;
    const z = (row + 0.5) * GRID_CELL;

    const slush = new THREE.Mesh(ribbon, (col + row) % 3 === 0 ? slushDark : slushMid);
    slush.name = PATH_NAME;
    slush.position.set(x, ribbonY - thick / 2, z);
    slush.receiveShadow = true;
    slush.castShadow = false;
    group.add(slush);

    // Shoulders only where the network ends, which is where a bank can actually exist:
    // between two road cells there is no snow left to bank.
    const edges = [
      { dc: 0, dr: -1, geo: bankLong, dx: 0, dz: -(GRID_CELL / 2) },
      { dc: 0, dr: 1, geo: bankLong, dx: 0, dz: GRID_CELL / 2 },
      { dc: -1, dr: 0, geo: bankShort, dx: -(GRID_CELL / 2), dz: 0 },
      { dc: 1, dr: 0, geo: bankShort, dx: GRID_CELL / 2, dz: 0 },
    ] as const;
    for (const edge of edges) {
      if (cells.has(`${col + edge.dc},${row + edge.dr}`)) {
        continue;
      }
      const bank = new THREE.Mesh(edge.geo, shoulder);
      bank.name = PATH_SHOULDER_NAME;
      bank.position.set(x + edge.dx, ribbonY + SHOULDER_RISE / 2, z + edge.dz);
      bank.castShadow = true;
      bank.receiveShadow = true;
      group.add(bank);
    }
  }

  return group;
}

/* -------------------------------------------------------------------------- */
/* Asset 5 — the frozen lagoon                                                */
/* -------------------------------------------------------------------------- */

export const ICE_SHEET_NAME = "winter-ice-sheet";
export const SHOVE_ICE_NAME = "winter-shove-ice";
export const COLD_WATER_NAME = "winter-cold-water";

/** Radial segments round the freeze collar. Each is one shove-ice plate. */
const FREEZE_SEGMENTS = 72;

/** How far past the grass line the freeze reaches, before the boundary jitter. */
const FREEZE_REACH = 5.4;

/**
 * **THREE PARTS: A PALE FACETED SHEET, DARK COLD OPEN WATER BEYOND IT, AND A BROKEN LIP
 * WHERE THEY MEET.**
 *
 * The lip carries the read. Without it, ice and water are two flat colours meeting along a
 * line, which looks like a selection error rather than a freeze. Shove ice is a run of small
 * tilted plates along the boundary, pale on the up-face, and it is the one place in the scene
 * with a genuinely jagged edge.
 *
 * ## Why this is laid OVER the lagoon instead of replacing it
 *
 * `StarterIsland.tsx` builds the sea once, inside a `useMemo` on the layout, with a radial
 * teal gradient baked into its vertex colours; it is era one's shore and its style guide owns
 * it. So the crisis lays its own cold water over that lagoon while it is mounted and takes it
 * away on the way out — which makes the thaw a removal rather than a re-tint, and gives the
 * fair-weather teal back for free. The batch's `WATER_COLD` is a winter-only variant for
 * exactly this reason.
 *
 * The boundary is derived from the island's own radii rather than from a lagoon outline,
 * because the outline the batch assumes does not exist as data: the shore is a shelved ring
 * around `ISLAND_GRASS_RADIUS` and the sea is a puck of `seaRadius`. Jittering a radius per
 * segment is the same jagged closed loop the batch's `freezeBoundary` produces, expressed in
 * the coordinates this scene actually has.
 */
export function buildFrozenLagoon(seaRadius: number, waterline: number): THREE.Group {
  const group = new THREE.Group();
  group.name = "winter-frozen-lagoon";

  const inner = ISLAND_GRASS_RADIUS - 1.2;
  const iceY = waterline + 0.16;
  const boundary: THREE.Vector2[] = [];
  for (let i = 0; i < FREEZE_SEGMENTS; i += 1) {
    const a = (i / FREEZE_SEGMENTS) * Math.PI * 2;
    const jitter = 0.6 * Math.sin(i * 1.7) + 0.35 * Math.cos(i * 3.9);
    const r = ISLAND_GRASS_RADIUS + FREEZE_REACH + jitter;
    boundary.push(new THREE.Vector2(Math.cos(a) * r, Math.sin(a) * r));
  }

  // 1. Sheet ice: a flat faceted collar from under the beach out to the jagged boundary,
  //    four discrete tones and a near-flat lift. The plates are near-flat on purpose — more
  //    relief and the ice reads as crumpled paper rather than as a frozen surface.
  const positions: number[] = [];
  const tones = [W.ICE_PALE, W.ICE_FACET, W.ICE_SHADE, W.ICE_PALE];
  const scratch = new THREE.Color();
  const push = (x: number, y: number, z: number) => positions.push(x, y, z);
  for (let i = 0; i < FREEZE_SEGMENTS; i += 1) {
    const a0 = (i / FREEZE_SEGMENTS) * Math.PI * 2;
    const a1 = ((i + 1) / FREEZE_SEGMENTS) * Math.PI * 2;
    const o0 = boundary[i] as THREE.Vector2;
    const o1 = boundary[(i + 1) % FREEZE_SEGMENTS] as THREE.Vector2;
    const lift = 0.05 * Math.abs(Math.sin(i * 0.37));
    const y = iceY + lift;
    // Wound +Y, for the same reason the snow course is: ice facing down is ice nobody sees.
    push(Math.cos(a0) * inner, y, Math.sin(a0) * inner);
    push(Math.cos(a1) * inner, y, Math.sin(a1) * inner);
    push(o0.x, y, o0.y);
    push(o0.x, y, o0.y);
    push(Math.cos(a1) * inner, y, Math.sin(a1) * inner);
    push(o1.x, y, o1.y);
  }
  const sheetGeometry = new THREE.BufferGeometry();
  sheetGeometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  const faceCount = positions.length / 9;
  const sheetColors = new Float32Array((positions.length / 3) * 3);
  for (let f = 0; f < faceCount; f += 1) {
    paintFace(sheetColors, f * 3, scratch, tones[f % tones.length] as number);
  }
  sheetGeometry.setAttribute("color", new THREE.BufferAttribute(sheetColors, 3));
  sheetGeometry.computeVertexNormals();
  const sheet = new THREE.Mesh(
    sheetGeometry,
    // Matte: the ice here is pale, not glassy. A sheen would need a specular lobe.
    facedMaterial(sheetGeometry, { roughness: 1 }),
  );
  sheet.name = ICE_SHEET_NAME;
  sheet.receiveShadow = true;
  sheet.castShadow = false;

  // 2. Open water beyond: flat, dark and cold. Unlit-LOOKING, still lit — no emissive.
  //
  // 64 segments and a hair past the lagoon's own radius, deliberately, because it has to COVER
  // the lagoon rather than merely sit on it: the batch authors a six-sided disc, whose whole
  // point is that at its authored radius of 300 the hexagon reads as a plane. Sized to this
  // island instead, a low segment count is a visible polygon — an eight-sided plate at 1.02x
  // has an INRADIUS of only 0.92x, so the fair-weather teal showed through in a broad band
  // along each of its eight edges. Photographed before this was changed: a dark octagon on a
  // lighter teal circle, unmissable at full zoom-out. `buildSea` uses 64 segments, so matching
  // it is what makes the crisis's water the lagoon's own surface re-toned.
  const water = new THREE.Mesh(
    new THREE.CircleGeometry(seaRadius * 1.02, 64).rotateX(-Math.PI / 2),
    flatWinter({ color: W.WATER_COLD, roughness: 1 }),
  );
  water.name = COLD_WATER_NAME;
  water.position.y = waterline + 0.02;
  water.receiveShadow = true;
  water.castShadow = false;

  // 3. Shove ice: the boundary itself, as tilted plates jammed up against each other.
  const plate = new THREE.BoxGeometry(1, 0.16, 0.9);
  const pale = flatWinter({ color: W.ICE_PALE, roughness: 1 });
  const facet = flatWinter({ color: W.ICE_FACET, roughness: 1 });
  const lip = new THREE.Group();
  lip.name = "winter-shove-ice-lip";
  boundary.forEach((point, i) => {
    const next = boundary[(i + 1) % boundary.length] as THREE.Vector2;
    const dir = new THREE.Vector2().subVectors(next, point);
    const mesh = new THREE.Mesh(plate, i % 2 ? pale : facet);
    mesh.name = SHOVE_ICE_NAME;
    mesh.scale.set(dir.length() * 1.15, 1 + (i % 3) * 0.4, 0.8 + (i % 2) * 0.5);
    mesh.position.set((point.x + next.x) / 2, iceY + 0.05, (point.y + next.y) / 2);
    mesh.rotation.y = -Math.atan2(dir.y, dir.x);
    mesh.rotation.z = THREE.MathUtils.degToRad(9 + (i % 4) * 5);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    lip.add(mesh);
  });

  // Water first so the ice draws over it wherever the two overlap in plan.
  group.add(water, sheet, lip);
  return group;
}
