import * as THREE from "three";

import { SUCCESSION_SCENE_TONES as S } from "./successionTones";

/**
 * **THE TWO MARKS, AS REAL GROOVES — asset 3's construction, which four objects share.**
 *
 * Claude Design's third pass (`output/claude-design/era-04-succession/response-v3/`) states the
 * rule and then states why it is not a stylistic preference:
 *
 * > Every mark is **cut, never drawn.** In this renderer that is not a stylistic claim: there is
 * > no texture path to draw one with, and a groove made of real faces shades with the object as
 * > the camera orbits and reads at any heading.
 *
 * That is the part the first build got wrong rather than the shapes. A chevron drawn as two thin
 * dark bars sunk a hair below the face it sits on is a **decal made of boxes**: it has no walls,
 * so it does not shade, and at the shipped ~49° tilt its own bars stand between the eye and the
 * stone from half the orbit. This module replaces it with the sheet's construction — a stone
 * plate with the mark **subtracted**, over a floor one groove-depth down in {@link
 * S.CUT_SHADOW} — so a mark has a lit wall, a shadowed wall and a floor, and the hard key that
 * `SUCCESSION_LIGHT` holds at `shadowIntensity: 1` is what makes it legible.
 *
 * ## THE TWO SHAPES SEPARATE ON CLOSED AGAINST OPEN, AND THAT IS WHY THE SET STOPS AT TWO
 *
 * A **chevron** is two strokes meeting at a mitred point with two open ends. A **ring** returns
 * to itself and encloses a disc of untouched stone standing at full height — so the ring's
 * enclosed island is a real mesh rather than a hole that happens to be annular, which is what
 * makes *closed* something the geometry says rather than something the outline implies.
 *
 * Neither is ever a character. The first image pass, asked for *"a single mark"* with no shape
 * named, returned a serifed capital **I**, and the era prohibits a glyph outright.
 *
 * ## AND NOTHING HERE READS A PLACE, WHICH IS WHY IT MAY EXIST AT ALL
 *
 * A mark's whole content is **whose** — the standing claimant's chevron or the seated one's ring
 * — so this module names an allegiance and sits in `test/successionPropagation.test.ts`'s
 * population by both of its derivations. Every function below takes the face it is cutting and
 * returns a group; not one of them takes a district, an allegiance or a spot on the ground, so
 * there is nothing here a decision could be read back out of.
 *
 * ## ONE VOCABULARY NOTE, BECAUSE IT LOOKS LIKE A TYPO OTHERWISE
 *
 * A slab's ruled compartment is a **seat** in this codebase and never a *cell*: the propagation
 * sweep bans `cell` in code across this whole population, because era one's board is a grid of
 * them and era four's is not. `SuccessionSlab` in the web lane already says `seats` for the same
 * reason. Prose may say cell; an identifier may not.
 */

/** The two marks, and there is no third. Both are shapes; nothing here is a character. */
export type SuccessionMark = "chevron" | "ring";

/**
 * How wide a mark's stroke is, as a fraction of the mark's own span.
 *
 * One figure for both shapes, which is what makes them a pair rather than two drawings: the
 * chevron's arms and the ring's band are the same weight of cut, so *closed against open* is the
 * only difference between them.
 */
export const MARK_STROKE = 0.133;

/** How far across its face a mark reaches, as a fraction of the face. The sheet's 0.68. */
export const MARK_SPAN_OF_FACE = 0.68;

/** A mark's rise, as a fraction of its span. Sets the chevron's included angle at about 88°. */
const MARK_RISE = 0.52;

/** The ring's outer edge, as a fraction of the mark's span. */
const RING_OUTER = 0.45;

/**
 * **A CHEVRON, AS ONE CLOSED SIX-POINT RIBBON.**
 *
 * Mitred at the apex and square at the two open ends. Built as a single polygon rather than as
 * two overlapping rectangles, and that is a constraint rather than tidiness: `ExtrudeGeometry`
 * triangulates its holes with earcut, and earcut does not survive two holes that overlap — it
 * returns slivers spread across the face, which is invisible at close range and unmistakable at
 * full zoom-out.
 *
 * The included angle falls out of the proportions as `2 * atan(span / 2 / rise)`, about 88° at
 * the ruled rise. Wide enough that the two arms read as two strokes and not as a wedge.
 */
export function chevronShape(span: number, rise: number, stroke: number): THREE.Shape {
  const half = rise / 2;
  const reach = span / 2;
  const along = new THREE.Vector2(reach, -rise).normalize();
  // The outward normal of the right arm, and the mitre offset it implies at the apex.
  const out = new THREE.Vector2(-along.y, along.x);
  const wide = stroke / 2;
  const mitre = wide / out.y;

  const shape = new THREE.Shape();
  shape.moveTo(0, half + mitre);
  shape.lineTo(reach + out.x * wide, -half + out.y * wide);
  shape.lineTo(reach - out.x * wide, -half - out.y * wide);
  shape.lineTo(0, half - mitre);
  shape.lineTo(-(reach - out.x * wide), -half - out.y * wide);
  shape.lineTo(-(reach + out.x * wide), -half + out.y * wide);
  shape.closePath();
  return shape;
}

/**
 * **THE RING'S OUTER EDGE, AS A HOLE, AT AN ARBITRARY CENTRE.**
 *
 * It takes a centre because not every marked face in this crisis puts its mark in the middle:
 * the claim post's four side marks sit high on the shaft. **A ring cut at the face's centre
 * while its enclosed disc is placed at the mark's centre is the exact defect this signature
 * exists to prevent** — the ring would be in one place and the stone it is supposed to enclose
 * in another, and the mark would read as a hole with a lump beside it.
 */
export function ringHole(outer: number, atX = 0, atY = 0): THREE.Path {
  const path = new THREE.Path();
  path.absarc(atX, atY, outer, 0, Math.PI * 2, false);
  return path;
}

/**
 * A shape moved, by rebuilding it.
 *
 * `THREE.Shape` and `THREE.Path` have no `translate()`, so a mark that is not centred on its
 * face has to be built somewhere else rather than moved there. Worth a named helper because
 * every marked face except a boundary stone's needs one.
 */
export function offsetPath(shape: THREE.Shape, byX: number, byY: number): THREE.Path {
  const points = shape.getPoints(24);
  const path = new THREE.Path();
  const first = points[0] as THREE.Vector2;
  path.moveTo(first.x + byX, first.y + byY);
  for (const point of points.slice(1)) {
    path.lineTo(point.x + byX, point.y + byY);
  }
  path.closePath();
  return path;
}

/** The name every cut mark's group takes, so a guard can find one among several hundred. */
export const CUT_MARK_NAME = "succession-cut-mark";

function flat(tone: number): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: tone,
    flatShading: true,
    metalness: 0,
    roughness: 0.94,
  });
}

/** The hole and the untouched island one mark needs, in the face's own plane. */
function markHoles(
  mark: SuccessionMark,
  span: number,
  atX: number,
  atY: number,
): { readonly holes: THREE.Path[]; readonly islands: number[] } {
  if (mark === "chevron") {
    return {
      holes: [
        offsetPath(chevronShape(span, span * MARK_RISE, span * MARK_STROKE), atX, atY),
      ],
      islands: [],
    };
  }
  const outer = span * RING_OUTER;
  return {
    holes: [ringHole(outer, atX, atY)],
    islands: [outer - span * MARK_STROKE],
  };
}

/**
 * **A MARKED TOP FACE: the construction the boundary stone and the drift block share.**
 *
 * Two plates and, for a ring, one island. The upper plate is the stone with the mark subtracted
 * from it; the lower is the groove's floor, a real plate rather than a fill so the groove has
 * walls to shade. {@link S.CUT_SHADOW} is the limestone 44 percent down, and that ratio is the
 * ruled figure rather than a picked hue — which is what lets the stone be retuned without the
 * mark going flat.
 *
 * `mark` may be `null`, and a bare top face is a **positive state**: a mark whose whole content
 * is *whose* has nothing to say about a district nobody holds. So an unclaimed district's stone
 * is finished, level, uncut stonework and not a stone whose mark failed to draw.
 */
export function markedTopFace(options: {
  readonly across: number;
  readonly deep: number;
  readonly mark: SuccessionMark | null;
  readonly span: number;
  readonly cut: number;
  readonly topY: number;
  readonly stone?: number;
  readonly groove?: number;
}): THREE.Group {
  const group = new THREE.Group();
  group.name = CUT_MARK_NAME;
  group.userData.mark = options.mark;
  const stone = options.stone ?? S.LIMESTONE;
  const groove = options.groove ?? S.CUT_SHADOW;

  const face = new THREE.Shape();
  face.moveTo(-options.across / 2, -options.deep / 2);
  face.lineTo(options.across / 2, -options.deep / 2);
  face.lineTo(options.across / 2, options.deep / 2);
  face.lineTo(-options.across / 2, options.deep / 2);
  face.closePath();

  const { holes, islands } =
    options.mark === null
      ? { holes: [], islands: [] }
      : markHoles(options.mark, options.span, 0, 0);
  face.holes = holes;

  const plate = new THREE.Mesh(
    new THREE.ExtrudeGeometry(face, {
      depth: options.cut,
      bevelEnabled: false,
      curveSegments: 18,
    }),
    flat(stone),
  );
  plate.name = `${CUT_MARK_NAME}-face`;
  plate.geometry.rotateX(-Math.PI / 2);
  plate.geometry.translate(0, options.topY - options.cut, 0);
  plate.castShadow = true;
  plate.receiveShadow = true;
  group.add(plate);

  if (holes.length > 0) {
    const floor = new THREE.Mesh(
      new THREE.BoxGeometry(options.across - 0.02, 0.02, options.deep - 0.02),
      flat(groove),
    );
    floor.name = `${CUT_MARK_NAME}-floor`;
    floor.position.y = options.topY - options.cut - 0.01;
    floor.castShadow = false;
    floor.receiveShadow = true;
    group.add(floor);
  }

  for (const island of islands) {
    // The disc of untouched stone the ring encloses, standing at the face's own full height.
    // This is the whole of "closed against open" as geometry rather than as an outline.
    const disc = new THREE.Mesh(
      new THREE.CylinderGeometry(island, island, options.cut, 18),
      flat(stone),
    );
    disc.name = `${CUT_MARK_NAME}-island`;
    disc.position.y = options.topY - options.cut / 2;
    disc.castShadow = true;
    disc.receiveShadow = true;
    group.add(disc);
  }
  return group;
}

/**
 * **A MARKED UPRIGHT FACE: the same two plates, stood on edge.**
 *
 * The claim post's four sides. *"Same idea, one axis different"* — except that a vertical face
 * has no groove **floor** to lay under it, it has a **core** behind it, so the caller supplies
 * the core once and this only returns the outer skin and the ring's island.
 *
 * The plate spans the outer `cut` of the post's own thickness, so the core showing through the
 * subtracted mark is the groove. Returned facing local **+Z**, for a caller to turn.
 */
export function markedUprightFace(options: {
  readonly across: number;
  readonly tall: number;
  readonly mark: SuccessionMark;
  readonly span: number;
  readonly cut: number;
  /** The mark's centre, measured up from the face's own foot. */
  readonly markY: number;
  readonly stone: number;
}): THREE.Group {
  const group = new THREE.Group();
  group.name = `${CUT_MARK_NAME}-upright`;
  group.userData.mark = options.mark;

  const face = new THREE.Shape();
  face.moveTo(-options.across / 2, -options.tall / 2);
  face.lineTo(options.across / 2, -options.tall / 2);
  face.lineTo(options.across / 2, options.tall / 2);
  face.lineTo(-options.across / 2, options.tall / 2);
  face.closePath();

  const up = options.markY - options.tall / 2;
  const { holes, islands } = markHoles(options.mark, options.span, 0, up);
  face.holes = holes;

  const plate = new THREE.Mesh(
    new THREE.ExtrudeGeometry(face, {
      depth: options.cut,
      bevelEnabled: false,
      curveSegments: 18,
    }),
    flat(options.stone),
  );
  plate.name = `${CUT_MARK_NAME}-face`;
  plate.position.set(0, options.tall / 2, options.across / 2 - options.cut);
  plate.castShadow = true;
  plate.receiveShadow = true;
  group.add(plate);

  for (const island of islands) {
    const disc = new THREE.Mesh(
      new THREE.CylinderGeometry(island, island, options.cut, 18),
      flat(options.stone),
    );
    disc.name = `${CUT_MARK_NAME}-island`;
    disc.rotation.x = Math.PI / 2;
    disc.position.set(0, options.markY, options.across / 2 - options.cut / 2);
    disc.castShadow = true;
    disc.receiveShadow = true;
    group.add(disc);
  }
  return group;
}
