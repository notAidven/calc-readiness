import * as THREE from "three";

import {
  CUT_MARK_NAME,
  MARK_SPAN_OF_FACE,
  markedTopFace,
  markedUprightFace,
  type SuccessionMark,
} from "./successionMarks";
import { SUCCESSION_SCENE_TONES as S } from "./successionTones";

/**
 * **ERA FOUR'S CRISIS, AS PROCEDURAL GEOMETRY.**
 *
 * Every object the Succession puts on the island, built from boxes, extrusions and lathes the
 * way `winterFire.ts` and `winterShield.ts` build era one's. **No `.glb` is added and nothing
 * here waits on art**: the nineteen reference frames in
 * `output/imagegen/era-04-succession-crisis-scenes/` are read as a description of a shape and
 * are never loaded — the game ships procedural geometry and models, and no generated image is
 * reachable from the app at all.
 *
 * ## THE HOUSE RULES, WHICH ARE ERA ONE'S AND ARE NOT RESTATED PER FUNCTION
 *
 * Four lights scene-wide and no `EffectComposer`, so nothing here adds a light, an emissive or
 * a post effect. No textures. Everything flat-shaded. Every mesh states `castShadow` and
 * `receiveShadow` rather than leaving them at their defaults, including where the answer is
 * `false` — a ground plane that casts onto itself is shadow acne and saying so is the point.
 *
 * ## THE FIVE RULINGS THAT DECIDED THE SHAPES, IN THE ORDER THEY BIT
 *
 *  1. **No state is carried by hue.** A district's allegiance is drawn by POSE — a tall narrow
 *     standing figure with a raised arm against a wide low seated one with a knee thrown
 *     forward past the plinth's front edge — and by nothing else. Both figures are one tone
 *     ({@link S.FIGURE}), so the read survives full zoom-out and survives a player who cannot
 *     tell two pale stones apart. There is no tint anywhere in this file that means anything.
 *  2. **Every mark is cut into stone**, a groove with a shadow lying inside it, never a line
 *     drawn on top. `successionMarks.ts` owns the construction — a stone plate with the mark
 *     SUBTRACTED, over a floor one groove-depth down — so a groove has a lit wall, a shadowed
 *     wall and a floor, and shades with the object as the camera orbits. That is why
 *     `SUCCESSION_LIGHT` keeps `shadowIntensity` at 1 while era one drops its to 0.55.
 *  3. **Nothing joins one thing to another.** The boundary stones ENCLOSE and never JOIN: a run
 *     is separate stones turning a corner round an area, and there is no function here that
 *     returns a line, a band or a path between two districts. That is the propagation
 *     separation — era six draws lines, era four draws none — expressed as a missing builder.
 *  4. **Everything is intact.** The city has stopped working, not fallen. A shuttered building
 *     keeps every line of its outline and loses its openings; nothing is collapsed, nothing is
 *     broken, and the quay is bare rather than strewn.
 *  5. **A proposal is the object itself rendered thinner, and it has TWO DIRECTIONS.** One
 *     vocabulary — see-through stone — pointed either way. {@link ghostSuccession} is the
 *     ADDITION: a ghost standing where nothing yet does, in the dark end of the stone family,
 *     keeping its cut mark, because a proposal that hides the mark says *a claim is coming* in
 *     the one crisis whose whole question is *whose*. {@link fadeSuccession} is the REMOVAL:
 *     the object that is already there, turned see-through at {@link REMOVAL_OPACITY}, which is
 *     the only way a spend whose result is a SUBTRACTION can be drawn at all. See that
 *     function for why an added ghost cannot express one.
 *
 * ## AND NOTHING HERE DECIDES ANYTHING
 *
 * `test/successionPropagation.test.ts` sweeps every source that names an allegiance for a
 * spatial token in code, and this file is in that population by name and by content. It holds
 * no `col`, no row, no grid seat and no metric between two objects: every builder takes what it
 * draws and returns a group, and where the group goes is `successionStands.ts`'s answer, handed
 * in by the caller. A builder that read a place and returned a different shape for it would be
 * era one's topology arriving by the back door.
 */

/** The house material rule, applied to every material this file creates. */
export function flatStone(
  params: THREE.MeshStandardMaterialParameters = {},
): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    flatShading: true,
    metalness: 0,
    roughness: 0.94,
    ...params,
  });
}

function box(
  sizeX: number,
  sizeY: number,
  sizeZ: number,
  tone: number,
  name: string,
): THREE.Mesh {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(sizeX, sizeY, sizeZ),
    flatStone({ color: tone }),
  );
  mesh.name = name;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function at(mesh: THREE.Object3D, x: number, y: number, z: number): THREE.Object3D {
  mesh.position.set(x, y, z);
  return mesh;
}

/* -------------------------------------------------------------------------- */
/* Names, so a guard can find one object among several hundred                */
/* -------------------------------------------------------------------------- */

export const PLINTH_NAME = "succession-plinth";
export const FIGURE_NAME = "succession-figure";
export const ASSEMBLY_SUPPORTER_NAME = "succession-assembly-supporter";
export const DRIFT_BLOCK_NAME = "succession-drift-block";
export const SHEAR_LEGS_NAME = "succession-shear-legs";
export const SLING_NAME = "succession-sling";
export const BOUNDARY_STONE_NAME = "succession-boundary-stone";
export const CIVIC_NAME = "succession-civic";
/**
 * The building's own fabric — podium, walls, colonnade, roof, doorway — as one child group.
 *
 * Split out so a guard can measure the OUTLINE of a building across all three claim states
 * without the claim furniture standing outside it confusing the box. *"Shuttered against
 * sacked"* is the costliest confusion in the batch and it separates on silhouette against
 * fabric, so a bounding box that is provably identical in all three states is the assertion the
 * ruling actually wants — and it is only assertable if there is a group that holds exactly the
 * fabric.
 */
export const CIVIC_FABRIC_NAME = "succession-civic-fabric";
export const SHUTTER_NAME = "succession-shutter";
export const OPENING_BAR_NAME = "succession-opening-bar";
export const CLAIM_POST_NAME = "succession-claim-post";
export const REMOVAL_CLEAT_NAME = "succession-removal-cleat";
export const BASIN_NAME = "succession-basin";
export const BASIN_WATER_NAME = "succession-basin-water";
export const QUAY_NAME = "succession-quay";
export const CRANE_NAME = "succession-crane";
export const CRANE_LOAD_NAME = "succession-crane-load";
export const HULL_NAME = "succession-hull";
export const FLOOR_NAME = "succession-floor";
export const TREE_NAME = "succession-tree";

/**
 * The two marks, and the construction that cuts them, re-exported from the module that owns
 * them so a caller reads a scene asset out of one place.
 */
export { CUT_MARK_NAME, type SuccessionMark };

/* -------------------------------------------------------------------------- */
/* M5: the ground, which is objects and not a layer                           */
/* -------------------------------------------------------------------------- */

/** How wide a boundary stone is, so a caller can size a cut mark against it. */
export const BOUNDARY_STONE_SPAN = 1.02;

/**
 * How far a boundary stone sits BELOW the paving it is set into.
 *
 * *"Set into the paving along one of its own joint lines"*, and the sinking is what carries that
 * — a block sitting entirely on top of the floor reads as dropped rather than set, which at
 * 1024x580 over a whole forum of them reads as rubble. That is the sacked-city confusion arriving
 * through the ground rather than through the buildings, and it is the one this era can least
 * afford.
 */
export const BOUNDARY_STONE_SUNK = 0.2;

/**
 * How deep a groove is cut into a boundary stone or a drift block, and it is one figure for
 * both.
 *
 * The sheet's 0.045 held at the sheet's own scale, deliberately rather than scaled with the
 * object: a groove's job is to hold a shadow, and how much shadow a groove holds is a function
 * of its depth against the key's elevation and of nothing about how wide the stone is. Scaling
 * it with a 1.02 stone would deepen it to 0.074 and the mark would read as a trench.
 */
export const MARK_CUT_DEPTH = 0.045;

/**
 * **HOW FAR PROUD OF THE PAVING A BOUNDARY STONE STANDS.** Exported because it is half of the
 * post-against-stone separation, and a guard should read it rather than restate it.
 */
export const BOUNDARY_STONE_PROUD = BOUNDARY_STONE_SPAN * 0.68 - BOUNDARY_STONE_SUNK;

/**
 * **A BOUNDARY STONE — ERA FOUR'S WHOLE ANSWER TO "GROUND UNDER THE CRISIS" (M5).**
 *
 * The row is a REFUSAL of the shared decal ladder and it is a design decision rather than an
 * omission. Era one continues the road stack's ground ladder through `winterCourseTop` and lays
 * a course over every tile; era four lays **nothing**, and the two reasons are quoted in
 * `succession-mechanics.ts`: a fill would cover the paved floor that is the era's whole ground
 * identity, and *"it would make the board read as a map rather than as a city"*. Era four's
 * authored land reaches 42 where the drawn grass stops at 30, so a per-tile layer would also
 * paint past the island.
 *
 * So the crisis writes on the ground with OBJECTS. A low squared block about knee height, set
 * into the paving on one of the joints the floor already has, with the claimant's mark cut into
 * its top face — or no mark at all, which is a positive state and not a stone whose mark failed
 * to draw: an unclaimed district has nothing to say about *whose* it is.
 */
export function buildBoundaryStone(mark: SuccessionMark | null): THREE.Group {
  const group = new THREE.Group();
  group.name = BOUNDARY_STONE_NAME;
  group.userData.mark = mark;

  const span = BOUNDARY_STONE_SPAN;
  const tall = span * 0.68;
  /*
   * THE BODY STOPS ONE GROOVE-DEPTH SHORT OF THE TOP, and the marked plate completes it. That is
   * the two-plate construction rather than a block with a mark laid over it: the plate IS the top
   * face, so the mark is a hole through real stone with the groove's floor visible at the bottom
   * of it. A stone whose top face was solid and whose mark sat on top of it would be a decal made
   * of boxes, which is what the first build shipped.
   */
  const body = box(
    span,
    tall - MARK_CUT_DEPTH,
    span,
    S.LIMESTONE,
    `${BOUNDARY_STONE_NAME}-block`,
  );
  body.position.y = (tall - MARK_CUT_DEPTH) / 2 - BOUNDARY_STONE_SUNK;
  group.add(body);

  group.add(
    markedTopFace({
      across: span,
      deep: span,
      mark,
      span: span * MARK_SPAN_OF_FACE,
      cut: MARK_CUT_DEPTH,
      topY: tall - BOUNDARY_STONE_SUNK,
    }),
  );
  return group;
}

/**
 * **ONE DISTRICT'S BOUNDARY RUN: separate stones, turning a corner round an area.**
 *
 * The spots come from `successionStands.ts`; this only builds. **Nothing fills what the run
 * encloses**, which is the art brief's sharpest instruction for era four and the reason there
 * is no fill parameter here to be tempted by: the stones enclose, and a board that coloured the
 * ground inside them would be the map the whole picture is defined against.
 */
export function buildBoundaryRun(
  spots: readonly { readonly x: number; readonly z: number; readonly turn: number }[],
  mark: SuccessionMark | null,
): THREE.Group {
  const run = new THREE.Group();
  run.name = `${BOUNDARY_STONE_NAME}-run`;
  for (const spot of spots) {
    const stone = buildBoundaryStone(mark);
    stone.position.set(spot.x, 0, spot.z);
    stone.rotation.y = spot.turn;
    run.add(stone);
  }
  return run;
}

/**
 * **THE PAVED FLOOR, which is era four's own ground and not a crisis layer.**
 *
 * A disc of fitted dressed limestone over a deeper cut, with a dressed kerb at its edge. Built
 * here because this crisis mounts its own scene rather than dressing the city island, and drawn
 * with facets in two tones so a floor of one material still has something for the hard noon key
 * to catch — which is what stops the biggest surface on screen reading as a flat plate.
 *
 * It carries **no state at all** and it never will. A board-state fill on this surface is
 * exactly what M5 refuses.
 */
export function buildForumFloor(across: number, deep = 1.1): THREE.Group {
  const group = new THREE.Group();
  group.name = FLOOR_NAME;

  /*
   * **IT REACHES BELOW THE WATER, and `deep` is what the caller uses to say so.**
   *
   * At a fixed 1.1 the disc's underside stopped 0.3 ABOVE the harbour — an island floating over
   * its own sea, hidden only because its near wall occludes the gap at the shipped tilt. It is
   * invisible today and it is one camera change from not being, so the caller passes a depth it
   * derives from `SEA_LEVEL` rather than this carrying a literal that happens to work.
   */
  const slab = new THREE.Mesh(
    new THREE.CylinderGeometry(across, across * 0.97, deep, 40, 1),
    flatStone({ color: S.PAVING }),
  );
  slab.name = `${FLOOR_NAME}-slab`;
  slab.position.y = -deep / 2;
  slab.castShadow = false;
  slab.receiveShadow = true;
  group.add(slab);

  // The joint lines the floor already has, as shallow inset bands. Straight through, level,
  // and thin — the boundary stones sit ON these, which is what makes a stone read as SET INTO
  // the paving rather than dropped on it.
  const joints = new THREE.Group();
  joints.name = `${FLOOR_NAME}-joints`;
  const step = across / 5;
  for (let index = -5; index <= 5; index += 1) {
    for (const along of [0, 1] as const) {
      const width = 2 * Math.sqrt(Math.max(0, across * across - (index * step) ** 2));
      if (width < 1) {
        continue;
      }
      const joint = box(
        along === 0 ? width : 0.16,
        0.05,
        along === 0 ? 0.16 : width,
        S.PAVING_DEEP,
        `${FLOOR_NAME}-joint`,
      );
      joint.castShadow = false;
      at(joint, along === 0 ? 0 : index * step, 0.01, along === 0 ? index * step : 0);
      joints.add(joint);
    }
  }
  group.add(joints);

  const kerb = new THREE.Mesh(
    new THREE.TorusGeometry(across, 0.55, 4, 40),
    flatStone({ color: S.KERB }),
  );
  kerb.name = `${FLOOR_NAME}-kerb`;
  kerb.rotation.x = Math.PI / 2;
  kerb.position.y = 0.1;
  kerb.castShadow = true;
  kerb.receiveShadow = true;
  group.add(kerb);

  return group;
}

/* -------------------------------------------------------------------------- */
/* M9 / M11 / M16: the plinth, the figures, and the block that arrives         */
/* -------------------------------------------------------------------------- */

/** How tall a plinth stands, so a caller can hang a badge or a label over one. */
export const PLINTH_HEIGHT = 1.72;
const PLINTH_SPAN = 1.5;

/**
 * The span of the plinth's WIDEST course — its bottom step, and so its footprint on the paving.
 *
 * Exported because it is what anything set out beside a plinth has to clear, and a caller that
 * guessed instead is how the drift block came to stand 0.35 from the stonework rather than the
 * ruled {@link DRIFT_BLOCK_CLEARANCE}. Derived from the step table below rather than written
 * twice.
 *
 * **`BASE` and not `FOOT`**, though the prose here and in `successionForum.ts` says *"at the
 * plinth's foot"* and should keep saying it. `personSize.test.ts` sweeps the whole app for a
 * `const` pairing a body word with a size word, which is how one module came to hold a second
 * opinion about how tall a person is; `FOOT` is on its list and `SPAN` is on the other one, so
 * `PLINTH_FOOT_SPAN` fails that sweep. The guard is right to catch the shape, and a plinth's
 * bottom step reads the same either way, so this is renamed rather than excused.
 */
export const PLINTH_BASE_SPAN = PLINTH_SPAN * 1.3;

/**
 * **THE FOUR COURSES, span by height, from the ground up.**
 *
 * The base steps IN going up and the cornice steps back OUT, so the silhouette has two horizontal
 * accents the hard key throws a crisp line under — which is what makes it read as dressed stonework
 * rather than as a crate.
 *
 * Exported because a spend is seated in the BASE course and the socket has to be measured against
 * that course rather than against the plinth's overall height. Read here rather than restated
 * there, so the two cannot come apart.
 */
export const PLINTH_COURSES: readonly (readonly [number, number])[] = [
  [PLINTH_SPAN * 1.3, 0.24],
  [PLINTH_SPAN * 1.12, 0.2],
  [PLINTH_SPAN, PLINTH_HEIGHT - 0.72],
  [PLINTH_SPAN * 1.16, 0.28],
];

/**
 * **A BARE PLINTH, AND A BARE PLINTH IS A POSITIVE STATE.**
 *
 * *"Nothing is going to happen here"*, rather than *"a figure failed to draw"* — which the art
 * sheet calls the hardest thing on its whole sheet to get right. It is answered by making the
 * stonework plainly FINISHED: three dressed steps, a level top face with nothing cut into it,
 * crisp arrises, and nothing at its foot. A prepared plinth would carry a socket, a dowel hole
 * and chippings; this carries none, so it reads as complete rather than waiting.
 */
export function buildPlinth(): THREE.Group {
  const group = new THREE.Group();
  group.name = PLINTH_NAME;

  let base = 0;
  for (const [span, tall] of PLINTH_COURSES) {
    const course = box(span, tall, span, S.LIMESTONE, `${PLINTH_NAME}-course`);
    course.position.y = base + tall / 2;
    group.add(course);
    base += tall;
  }
  return group;
}

/**
 * **THE TWO CLAIMANTS, SEPARATED BY POSE AND BY NOTHING ELSE.**
 *
 * `succession-tuning.ts` quotes the ruling: *"a standing figure against a seated one is a
 * silhouette difference that survives full zoom-out, which colour on a three-tone body would
 * not, and which no runtime tint could deliver anyway."*
 *
 * So the two are one tone and two outlines, and each outline has one feature carrying it:
 *
 *  - **standing** is tall and narrow with **one arm raised clear of the body**, so the raised
 *    arm is part of the silhouette rather than tucked inside it;
 *  - **seated** is wide and low with **one knee thrown forward past the plinth's front edge**,
 *    so the overhang breaks the plinth's own outline downward and sideways.
 *
 * The overhang is the seated figure's whole decision, as the raised arm is the standing one's:
 * without it a seated figure is just a shorter standing one, which is the confusion the pair
 * exists to avoid.
 */
export function buildFigure(pose: "standing" | "seated"): THREE.Group {
  const group = new THREE.Group();
  group.name = FIGURE_NAME;
  group.userData.pose = pose;
  const part = (
    wide: number,
    tall: number,
    deep: number,
    x: number,
    y: number,
    z: number,
    turnX = 0,
    turnZ = 0,
  ): THREE.Mesh => {
    const mesh = box(wide, tall, deep, S.FIGURE, `${FIGURE_NAME}-part`);
    mesh.position.set(x, y, z);
    mesh.rotation.set(turnX, 0, turnZ);
    return mesh;
  };

  /** Where the crown's front edge is, which is the thing a seated figure has to break. */
  const front = (PLINTH_SPAN * 1.16) / 2;

  if (pose === "standing") {
    /*
     * **NINE PARTS, AND THE SILHOUETTE IS THE WHOLE OF IT.**
     *
     * It was three — a slab, a cube and one arm — and at 1024x580 that came back as a dark angular
     * wedge on a plinth. A figure has to be a figure at 40 pixels tall, and what does it at that
     * size is not detail but a TAPER: a hem wider than a skirt wider than a torso gives the hard
     * near-overhead key three horizontal arrises to throw a line under, so the mass reads as a
     * standing body rather than as a block.
     *
     * Claude Design's own construction, at its own numbers, which come out within a hundredth of
     * the height the previous figure was frame-checked at — 2.30 above the crown against 2.31.
     */
    group.add(part(0.78, 0.3, 0.52, 0, 0.15, 0)); // hem, the widest plane
    group.add(part(0.68, 0.62, 0.48, 0, 0.61, 0)); // skirt
    group.add(part(0.58, 0.52, 0.44, 0, 1.18, 0.01)); // torso, stepped in
    group.add(part(0.5, 0.14, 0.4, 0, 1.49, 0)); // shoulders
    group.add(part(0.28, 0.3, 0.28, 0, 1.71, 0)); // head

    /*
     * **THE RAISED ARM, AND IT CLEARS THE TORSO BY A STATED GAP.**
     *
     * The sheet puts the arm at `0.26 * PLINTH.W`, which is a fraction of the PLINTH — and that is
     * the one number in its figure that cannot carry across, because this forum's plinth is
     * narrower than the sheet's while its figure is the same size. Taken literally it would stand
     * the arm at 0.33 and the torso's own half-width is 0.29, so the arm would touch the body.
     *
     * That is exactly the defect a frame already caught here once: *"the arm was 0.19 across,
     * tucked 0.42 from the trunk, and at the shipped camera it merged into the body — which loses
     * the ONE feature that separates this pose from the seated one at full zoom-out."* So the arm
     * is set out against the thing it has to clear rather than against the plinth, which lands on
     * the sheet's own 0.53 by a route that survives a change to the pedestal.
     */
    const clear = 0.58 / 2 + 0.16 + 0.16 / 2;
    group.add(part(0.16, 0.52, 0.16, clear * 0.7, 1.36, 0.02, 0, -0.2)); // upper arm
    group.add(part(0.16, 0.62, 0.16, clear, 1.86, 0.02)); // forearm, vertical
    group.add(part(0.17, 0.16, 0.17, clear, 2.22, 0.02)); // hand — the high point
    group.add(part(0.14, 0.4, 0.14, -0.34, 0.98, 0.04, 0, 0.1)); // the slack arm
  } else {
    /*
     * **NINE PARTS, AND TWO OF THEM ARE THE ENTIRE POSE.**
     *
     * The shin and the foot hang over the crown's front edge and BELOW it, which is the only thing
     * on this island that puts stone under a plinth's top face while standing on it. Without them a
     * seated figure is not a seated figure, it is a shorter standing one — and that is the confusion
     * the pair exists to avoid, so it is asserted in `successionForum.test.ts` rather than eyeballed.
     *
     * The overhang is measured from the CROWN's own front edge, so it survives a change to the
     * pedestal's proportion. The height lands at 1.28 above the crown, which is the sheet's 0.62 of
     * the standing figure and is what makes the two blobs different at any size.
     */
    const over = 0.72;
    group.add(part(1.0, 0.44, 0.66, 0, 0.22, -0.24)); // seat mass, set back
    group.add(part(0.86, 0.56, 0.54, 0, 0.72, -0.3)); // torso
    group.add(part(0.3, 0.28, 0.28, 0, 1.14, -0.3)); // head
    group.add(part(0.3, 0.26, 0.98, -0.24, 0.2, 0.22, -0.28)); // near thigh, thrown out
    group.add(part(0.26, 0.62, 0.26, -0.24, -0.16, front + over * 0.42, 0.34)); // shin, over
    group.add(part(0.28, 0.14, 0.36, -0.24, -0.44, front + over * 0.61)); // foot, hanging
    group.add(part(0.3, 0.26, 0.72, 0.26, 0.3, 0.02, -0.1)); // far thigh
    group.add(part(0.24, 0.16, 0.44, 0.26, 0.14, 0.4)); // far shin, tucked
    group.add(part(0.2, 0.34, 0.2, -0.44, 0.6, -0.1, 0, 0.22)); // arm resting on the knee
  }
  return group;
}

/**
 * **A WARD THAT HAS CHOSEN IS INHABITED, NOT MERELY LABELLED.**
 *
 * The statue and the cut post are the durable allegiance carriers, but at the shipped wide
 * camera they are small pieces of stone among many. Three supporters at the foot of a decided
 * ward turn the same state into civic conflict: people have gathered behind that claimant.
 *
 * Both sides use the same body tone and separate by the standard above them. A chevron is two
 * bars meeting in a point; a ring is a real open torus. The state therefore survives greyscale
 * and does not borrow a glow, a tint, or a screen-space effect.
 */
export function buildAssemblySupporters(mark: SuccessionMark): THREE.Group {
  const assembly = new THREE.Group();
  assembly.userData.mark = mark;

  const places: readonly (readonly [number, number, number])[] = [
    [-0.95, 0, 0.12],
    [0, 0, -0.32],
    [0.95, 0, 0.16],
  ];
  for (const [index, [x, y, z]] of places.entries()) {
    const supporter = new THREE.Group();
    supporter.name = ASSEMBLY_SUPPORTER_NAME;
    supporter.userData.mark = mark;
    supporter.userData.index = index;
    supporter.position.set(x, y, z);

    const skirt = new THREE.Mesh(
      new THREE.ConeGeometry(0.28, 0.72, 5),
      flatStone({ color: S.FIGURE }),
    );
    skirt.name = `${ASSEMBLY_SUPPORTER_NAME}-body`;
    skirt.position.y = 0.36;
    skirt.castShadow = true;
    skirt.receiveShadow = true;
    supporter.add(skirt);

    const head = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.18, 0),
      flatStone({ color: S.FIGURE }),
    );
    head.name = `${ASSEMBLY_SUPPORTER_NAME}-head`;
    head.position.y = 0.92;
    head.castShadow = true;
    head.receiveShadow = true;
    supporter.add(head);

    const staff = box(0.08, 1.55, 0.08, S.TIMBER_DARK, `${ASSEMBLY_SUPPORTER_NAME}-staff`);
    staff.position.set(index === 1 ? 0.34 : -0.34, 0.78, 0);
    staff.rotation.z = index === 1 ? -0.05 : 0.05;
    supporter.add(staff);

    const sign = new THREE.Group();
    sign.name = `${ASSEMBLY_SUPPORTER_NAME}-sign`;
    sign.position.set(staff.position.x, 1.55, 0);
    if (mark === "ring") {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.25, 0.075, 4, 10),
        flatStone({ color: S.CUT_SHADOW }),
      );
      ring.castShadow = true;
      ring.receiveShadow = true;
      sign.add(ring);
    } else {
      for (const side of [-1, 1] as const) {
        const stroke = box(
          0.08,
          0.52,
          0.08,
          S.CUT_SHADOW,
          `${ASSEMBLY_SUPPORTER_NAME}-chevron`,
        );
        stroke.position.set(side * 0.1, 0, 0);
        stroke.rotation.z = side * -0.42;
        sign.add(stroke);
      }
    }
    supporter.add(sign);
    assembly.add(supporter);
  }
  return assembly;
}

/**
 * How wide a drift block is.
 *
 * **Half again the width of a boundary stone, and that gap is load-bearing.** At 1.06 against a
 * stone's 1.02 the two were the same cube at the shipped camera, so the object the whole crisis
 * is watched through was indistinguishable from the run of markers around it — a warning nobody
 * can pick out of the furniture is a warning nobody got.
 */
export const DRIFT_BLOCK_SPAN = 1.55;

/**
 * **HOW MUCH CLEAR PAVING THE DRIFT BLOCK STANDS IN, edge to edge from the plinth's foot.**
 *
 * The block and a boundary stone are the hardest pair in the crisis to tell apart at distance,
 * and #488's own frame index says so in terms: *"the drift block and a boundary stone are the
 * same object at a distance … in `04` you can tell them apart, but only because you know where
 * to look."* They already separate on size — {@link DRIFT_BLOCK_SPAN} against
 * {@link BOUNDARY_STONE_SPAN}, 1.55 to 1.02 — and that is not enough, for a reason that is
 * about the camera rather than about the objects: at the shipped ~49° tilt a block standing on
 * the paving projects to nearly the same screen height as its own crown, so a size difference
 * in plan arrives at the eye much smaller than it is on the ground.
 *
 * **What separates them is the cast shadow, and a shadow needs somewhere to fall.** These two
 * objects throw genuinely different ones: the block stands its full height on the paving under
 * a key `SUCCESSION_LIGHT` holds at `shadowIntensity` 1, and a boundary stone is SUNK
 * ({@link BOUNDARY_STONE_SUNK}) and stands barely half as tall, so it throws almost nothing.
 * That difference is invisible while the block's shadow lands on the plinth's own stonework,
 * which is where 0.35 of clearance put it. At 0.55 the shadow falls on open paving beside the
 * plinth and the block reads as the only object in the forum standing clear of anything.
 *
 * So this is a spacing that exists to make a SHADOW legible rather than to make a gap look
 * nice, which is why it is named and why the caller derives its offset from it instead of
 * carrying a distance of its own.
 */
export const DRIFT_BLOCK_CLEARANCE = 0.55;

/**
 * **THE DRIFT BLOCK — the object the whole crisis is watched through (M9, M16).**
 *
 * A squared limestone block with the claimant's mark cut into its upward face. §3.4 calls it
 * *"the most important object in this brief"*, and the reason is the fairness property: the
 * block is set at a plinth one whole cycle before the district decides, so the charge for
 * hesitating is one a player saw coming.
 *
 * **The mark is on the block, and it has to be.** Frame 11's brief: *"the cut mark must be
 * legible enough to say WHOSE block it is, not merely that a block is there, which is what
 * makes the drift a warning rather than a surprise."*
 */
export function buildDriftBlock(mark: SuccessionMark): THREE.Group {
  const group = new THREE.Group();
  group.name = DRIFT_BLOCK_NAME;
  group.userData.mark = mark;

  const tall = DRIFT_BLOCK_SPAN * 0.62;
  const block = box(
    DRIFT_BLOCK_SPAN,
    tall - MARK_CUT_DEPTH,
    DRIFT_BLOCK_SPAN,
    S.LIMESTONE,
    `${DRIFT_BLOCK_NAME}-block`,
  );
  block.position.y = (tall - MARK_CUT_DEPTH) / 2;
  group.add(block);

  /*
   * The mark reaches 51 percent across the block's edge, which the sheet argues is the largest a
   * mark can be and still leave a margin of untouched stone that reads as a dressed face rather
   * than as a stamped one. Wider here than on a boundary stone in proportion as well as in
   * absolute size, because this is the object the warning is READ off.
   */
  group.add(
    markedTopFace({
      across: DRIFT_BLOCK_SPAN,
      deep: DRIFT_BLOCK_SPAN,
      mark,
      span: DRIFT_BLOCK_SPAN * 0.51,
      cut: MARK_CUT_DEPTH,
      topY: tall,
    }),
  );
  return group;
}

/**
 * **THE SHEAR-LEGS, AND THE SLING THAT SAYS WHETHER THE LIFT HAS HAPPENED.**
 *
 * Three undressed timber legs lashed at the head, straddling the plinth, with a fibre sling
 * hanging from them. The sling is the whole tell and it has exactly two states:
 *
 *  - **slack** — hanging in a visible curve, block on the ground at the plinth's foot. Somebody
 *    is about to raise a statue here. This is the WARNING;
 *  - **taut** — the block hanging level and still, clear of the top face it is going onto, with
 *    daylight visible between the two. This is the drift LANDING, and the gap is the subject.
 *
 * Same object, moved — which is the propagation declaration's own sentence, and is what era
 * four has instead of a leading edge.
 *
 * **It must not read as a demolition**, which is where a suspended stone block goes on its own.
 * They separate on placing against dropping: the block hangs level and still, directly over the
 * face it is going onto, and nothing falls, nothing is broken and there is no dust.
 */
export function buildShearLegs(sling: "slack" | "taut"): THREE.Group {
  const group = new THREE.Group();
  group.name = SHEAR_LEGS_NAME;
  group.userData.sling = sling;

  const tall = PLINTH_HEIGHT + 2.1;
  const spread = 1.55;
  /**
   * The three feet, and they STRADDLE the plinth rather than standing beside it: two in front,
   * one behind, all leaning in to one head.
   *
   * **Built by aiming each leg from its foot at the head, and that is a correction rather than a
   * style.** The first pass set each leg's rotation on two Euler axes independently, which for a
   * leg leaning on both axes at once composes to the wrong orientation: photographed at
   * 1024x580 the legs came back as loose crossed sticks lying over the plinth, and the whole
   * forum read as a SACKED city — which the art sheet names as this crisis's costliest
   * confusion, and which a hoist that has fallen over produces immediately. A quaternion from
   * the leg's own axis to its own direction cannot compose wrongly.
   */
  const feet: readonly [number, number][] = [
    [-spread, spread * 0.75],
    [spread, spread * 0.75],
    [0, -spread * 0.95],
  ];
  const head = new THREE.Vector3(0, tall, 0);
  const up = new THREE.Vector3(0, 1, 0);
  for (const [x, z] of feet) {
    const foot = new THREE.Vector3(x, 0, z);
    const along = head.clone().sub(foot);
    const leg = box(0.19, along.length(), 0.19, S.TIMBER_MID, `${SHEAR_LEGS_NAME}-leg`);
    leg.position.copy(foot).addScaledVector(along, 0.5);
    leg.quaternion.setFromUnitVectors(up, along.clone().normalize());
    group.add(leg);
  }

  /*
   * **THE LASHING AT THE HEAD, AND IT USED TO BE THE WORST OBJECT ON THE ISLAND.**
   *
   * It was a bar `spread * 2.3` long — 3.57 units — laid across the two front legs and offset in z,
   * on the reasoning that the apex needed thickness against the sky rather than resolving to a
   * pixel line. Photographed at 1024x580 that is not what it did: a beam sticking a unit and a half
   * out on both sides of a three-legged frame reads as **crossed sticks lying over the plinth**,
   * which is the *sacked city* confusion the sheet calls this era's costliest, arriving on the
   * object it calls the crisis's most important. See `docs/design-refs/era4-drift-warning/`.
   *
   * The reasoning behind it was sound and the object was wrong. A lashing is what BINDS the three
   * heads, so it is sized to the bundle it binds rather than to the frame's spread: wide enough to
   * wrap three 0.19 legs converging on one point, in `TIMBER_DARK` so it reads as cord over timber,
   * and centred on the apex rather than pushed toward the camera.
   */
  const lash = box(0.56, 0.3, 0.56, S.TIMBER_DARK, `${SHEAR_LEGS_NAME}-head`);
  lash.position.set(0, tall - 0.14, 0);
  group.add(lash);

  /**
   * **THE SLING, AND IT IS THE WHOLE TELL.**
   *
   * Slack: two ropes hanging in a visible curve down to a bight well above the ground, with
   * nothing in it. Taut: two short straight ropes holding a block clear of the plinth's top
   * face. Drawn as boxes rather than a curve because the read is the SHAPE of the hang, and a
   * faceted rope is the vocabulary everything else on this island is drawn in.
   */
  const rig = new THREE.Group();
  rig.name = SLING_NAME;
  rig.userData.sling = sling;
  const drop = sling === "slack" ? 1.9 : 0.95;
  /*
   * **THICK ENOUGH TO SEE, WHICH IT WAS NOT.**
   *
   * The sheet draws the sling as a 0.07 cylinder, quoted at its own inspection distance. At the
   * forum's camera that is two pixels of pale hemp against pale paving, and the whole of *slack
   * against taut* is carried by the shape of the hang — so the object the read depends on was
   * effectively invisible. Widened until it is a line somebody can follow, and no further: a rope
   * as thick as a leg would read as a fourth timber.
   */
  const cord = 0.16;
  for (const side of [-1, 1] as const) {
    const rope = box(cord, drop, cord, S.FIBRE, `${SLING_NAME}-leg`);
    rope.position.set(side * (sling === "slack" ? 0.19 : 0.3), tall - 0.14 - drop / 2, 0);
    /*
     * **NEGATIVE, AND THE SIGN WAS WRONG.** A box rotated by `+θ` about z sends its lower end toward
     * `+x`, so `side * θ` splays the two runs APART going down — a Λ with the bight wide at the
     * bottom, which is what the 1.3-wide bight it used to carry was quietly consistent with. What
     * *slack* has to say is that two runs meet LOW and hold nothing, so they converge: the top out at
     * the head the legs are lashed to, the bottom in at the bight.
     */
    rope.rotation.z = sling === "slack" ? -side * 0.116 : 0;
    rig.add(rope);
  }
  /*
   * **THE BIGHT IS SHORT, BECAUSE A V IS THE READ AND A U IS NOT.**
   *
   * It was 1.3 across under two runs 1.0 apart, which is not a V hanging empty — it is a flat-
   * bottomed loop, and a flat-bottomed loop looks like something is IN it. The sheet's is 0.40
   * across under runs 0.40 apart, and that ratio is what makes the silhouette a V at twelve pixels.
   */
  const bight = box(
    sling === "slack" ? 0.46 : 0.72,
    cord,
    cord,
    S.FIBRE,
    `${SLING_NAME}-bight`,
  );
  bight.position.set(0, tall - 0.14 - drop, 0);
  rig.add(bight);
  group.add(rig);
  return group;
}

/**
 * How high a lifted block hangs above the plinth's top face. **The gap is the subject**, so it
 * has to be unambiguous at a glance: daylight visible between the block and the face it is
 * going onto, and not a block resting on it.
 */
export const LIFT_CLEARANCE = 0.62;

/** Where a block hangs in the sling, measured from the ground. */
export const SLING_HEIGHT = PLINTH_HEIGHT + 2.1 - 0.16 - 0.95;

/* -------------------------------------------------------------------------- */
/* M16 / M20: the civic building, open, claimed and shuttered                  */
/* -------------------------------------------------------------------------- */

/**
 * **THE CLAIM POST — and it used to be a plate on a wall, which did not survive measurement.**
 *
 * The first build fixed a marble plate to the wall beside a civic building's principal door.
 * `scripts/measure-era4-frontage.mjs` then measured that rule against era four's twenty real
 * models and it fails on four of the ten claimable ones, in three ways no threshold fixes:
 *
 *  - **three of the ten have no door at all.** The Fountain, the Customs House and the Wine
 *    Cellars open through arches and arcades, so *"a wall plane containing the principal door"*
 *    is unsatisfiable on a third of the set;
 *  - **on the Cottages, "the principal door" is not well defined.** It is an L-plan with ten
 *    openings across four planes and the choice moves the answer by 40 percent;
 *  - **the plate is wider than the entrance on all ten**, from 1.02x on the Senate House to
 *    4.01x on the Barracks. It is out of scale even where it fits.
 *    `docs/design-refs/era4-frontage/` holds the frame of that, because a ratio is arithmetic
 *    and *"is that plate absurd on that wall"* is a claim about a picture.
 *
 * The third finding is the one that reframes the asset: **a mark sized against an entrance is
 * sized against the one feature of an era-four civic building that varies most and is sometimes
 * absent.** So the mark stops being sized against the entrance and stops touching the wall.
 *
 * ## WHAT IT IS NOW
 *
 * A free-standing marble upright at the plot's front corner. {@link CLAIM.POST.side} square,
 * height a fixed fraction of the building's own wall clamped into a band, with a capped head and
 * **the claimant's mark cut into all four faces** — the camera orbits, the post is square in
 * plan, and four cuts of one shape is the only construction that reads at every heading without
 * a top face big enough to hold one.
 *
 * **Moving it off the wall is a gain and not a concession.** A marble slab flat against a
 * limestone wall separates from that wall on hue purity alone — `#CCC8BD` against `#D2C8AA` is
 * under one percent of lightness — and it is edge-on from half the orbit, so it was never going
 * to survive full zoom-out. An upright standing clear of the building has **silhouette**, which
 * is the one channel this renderer actually gives you and the same channel the two claimants
 * already use.
 *
 * **THE CORNER MILESTONE IS DELETED INTO THIS.** It existed to tag a contested building at its
 * corner, which is exactly where the post now stands; two uprights at one corner carrying the
 * same mark was one object too many, and the second had nothing to say the first does not. So
 * `contested` is now the post PLUS the boards — the post says WHOSE and the boards say
 * SUSPENDED, which is the engine's own two layers carried by two pieces of geometry rather than
 * three.
 */
/**
 * **HOW MUCH LARGER THIS FORUM DRAWS ITS SMALL GROUND FURNITURE THAN THE SHEET'S LITERALS.**
 *
 * The sheet's world-unit numbers are quoted at an inspection distance — its own preview scaffold
 * looks at a boundary stone from 2.4 units — and the shipped forum's camera sits 35 to 70 units off
 * a 30-unit floor. So a mark that reads on the sheet's stone is two pixels on this one, and the
 * sheet says which way that resolves: *"if the renderer pass has already chosen different ones, it
 * wins, and the ratios in each asset are what carry across."*
 *
 * This forum has chosen. `BOUNDARY_STONE_SPAN` is 1.02 against the sheet's 0.62, and the drift
 * block is 1.55 against 0.86 — both raised off frames at 1024x580 rather than off arithmetic. So
 * the factor is DERIVED from the one object both worlds size for the same job, rather than picked:
 * change the stone and the post follows it, which is the relationship asset 4's separation is
 * about.
 *
 * **It is applied to world units and never to ratios.** `hRatio`, `markUp`, `MARK_SPAN_OF_FACE` and
 * `MARK_STROKE` are the sheet's and stay the sheet's; `side`, the height band, the cap and the
 * inset are the sheet's numbers times this.
 */
const SHEET_STONE = 0.62;
export const SHEET_TO_FORUM = BOUNDARY_STONE_SPAN / SHEET_STONE;

export const CLAIM = {
  POST: {
    /** Narrow enough to remain an upright below both claimant silhouettes. */
    side: 0.32 * SHEET_TO_FORUM,
    /**
     * The groove's depth, and it is the ONE post dimension that does not scale.
     *
     * A groove's depth decides how much shadow it holds, which is a function of the key's elevation
     * and not of how wide the stone is — the same reason {@link MARK_CUT_DEPTH} is held at the
     * sheet's figure on a stone this forum draws two thirds larger. On an upright face it also sets
     * the marble skin's thickness, and 0.045 of skin over a groove core is plenty.
     */
    cut: MARK_CUT_DEPTH,
    /** The mark's span, at asset 3's ruled 0.7 of the face it is cut into. */
    span: 0.32 * SHEET_TO_FORUM * MARK_SPAN_OF_FACE,
    capH: 0.1 * SHEET_TO_FORUM,
    capOver: 0.03 * SHEET_TO_FORUM,
    /** Height as a fraction of the wall it stands beside, then clamped into the band below. */
    hRatio: 0.31,
    /** A low civic standard, below either claimant statue's lowest silhouette. */
    hMin: 0.68 * SHEET_TO_FORUM,
    /**
     * Below the seated statue's hanging foot, not merely below the crown. Both claimant poses
     * must remain the district statement while this low standard labels civic control.
     */
    hMax: 1.2,
    /**
     * How far off the plot's corner it stands, on both axes, so the post is on the paving and
     * never inside the podium. The sheet's 0.34.
     */
    inset: 0.34 * SHEET_TO_FORUM,
    /** Where the mark's centre sits up the shaft. High, so it clears a passer-by's shadow. */
    markUp: 0.62,
  },
  /** A shutter board: new squared timber, one width, one thickness, one constant pitch. */
  BOARD: { across: 0.24, thick: 0.075, pitch: 0.25, proud: 0.13, over: 0.1 },
  /** The barred panel the WIDEST opening gets instead of boards. */
  BAR: { rails: 4, thick: 0.075, tall: 0.12, pitch: 0.5, proud: 0.15, over: 0.2 },
} as const;

/**
 * **ONE OPENING IN A CIVIC BUILDING'S FABRIC.**
 *
 * The only mesh fact this whole asset still reads, and it is the one every model can answer:
 * three of the ten claimable buildings lack a **door**, none lacks an **opening**. Handed in as
 * data by whoever built the fabric rather than measured off a mesh, so nothing here opens a
 * `.glb`.
 */
export interface SuccessionOpening {
  readonly across: number;
  readonly tall: number;
  readonly at: THREE.Vector3;
  /** The outward normal of the wall plane it is in. Unit length, level with the ground. */
  readonly out: THREE.Vector3;
}

/**
 * **THE CLAIM POST, BUILT. It touches nothing and it reads at every heading.**
 *
 * Sized against the building — `hRatio` of its wall — and clamped, so a one-bay fountain and a
 * three-bay senate house both get a post a person could stand next to. `wallHeight` may be
 * anything; the clamp is what makes that safe, which is why the assertion this asset owes is
 * about the OPENINGS and never about the height.
 *
 * The four marked faces are asset 3's two-plate construction stood on edge: a marble skin with
 * the mark subtracted, over a core in {@link S.CUT_SHADOW} that the four cuts reveal. A vertical
 * face has no groove floor to lay under it — it has a core behind it — so the core is built once
 * here rather than four times.
 */
export function buildClaimPost(mark: SuccessionMark, wallHeight: number): THREE.Group {
  const group = new THREE.Group();
  group.name = CLAIM_POST_NAME;
  group.userData.mark = mark;

  const post = CLAIM.POST;
  const tall = Math.min(post.hMax, Math.max(post.hMin, wallHeight * post.hRatio));
  const shaft = tall - post.capH;
  group.userData.tall = tall;

  /*
   * THE CORE, IN THE GROOVE TONE, and it is the only core there is.
   *
   * The sheet builds two — a marble core at `side - cut * 2` and a groove core 0.004 larger over
   * it — and the marble one cannot be seen from any heading, because the groove core is strictly
   * larger in both plan axes, shares its height, is capped above and stands on the paving below.
   * One core, in the tone the cuts are meant to reveal, is the same picture with one fewer mesh.
   */
  const core = box(
    post.side - post.cut * 2,
    shaft,
    post.side - post.cut * 2,
    S.CUT_SHADOW,
    `${CLAIM_POST_NAME}-core`,
  );
  core.position.y = shaft / 2;
  /*
   * AND IT CASTS NOTHING. The core is enclosed on all four sides by the marble skin and capped
   * above, so the only surface its shadow can ever land on is its own skin 0.045 away — which is
   * about one and a half shadow-map texels at this island's camera, well inside any bias, so what
   * it actually produced was the whole post reading mid-grey. Measured on a frame rather than
   * reasoned about: `docs/design-refs/era4-claim-post/README.md`. The skin casts the post's shadow,
   * which is the right answer anyway — the shadow of a post is the shape of its outside.
   */
  core.castShadow = false;
  group.add(core);

  for (let quarter = 0; quarter < 4; quarter += 1) {
    const face = markedUprightFace({
      across: post.side,
      tall: shaft,
      mark,
      span: post.span,
      cut: post.cut,
      markY: shaft * post.markUp,
      stone: S.MARBLE,
    });
    face.rotation.y = (quarter * Math.PI) / 2;
    group.add(face);
  }

  // A cap, because an uncapped square post reads as an offcut standing on end.
  const cap = box(
    post.side + post.capOver * 2,
    post.capH,
    post.side + post.capOver * 2,
    S.MARBLE,
    `${CLAIM_POST_NAME}-cap`,
  );
  cap.position.y = shaft + post.capH / 2;
  group.add(cap);
  return group;
}

/**
 * **THE BOARDS: lost openings, kept outline.**
 *
 * The costliest confusion in the batch is *shuttered* against *sacked* and they are one short
 * step apart. They separate on **silhouette against fabric**: this building has lost its
 * openings and kept its outline — no collapse, no fallen column, no gap in the roofline, no
 * rubble, no scorch, no weed.
 *
 * The boards are **new squared timber**, not salvage: every board is the same width, the same
 * thickness, cut to the same length within an opening, and set at a constant pitch. **That
 * regularity is the tell** that says somebody did this on purpose, recently, and can undo it —
 * which is the whole difference between a suspended capacity and a ruin.
 */
export function buildShutters(openings: readonly SuccessionOpening[]): THREE.Group {
  const group = new THREE.Group();
  group.name = `${SHUTTER_NAME}-set`;
  const board = CLAIM.BOARD;

  for (const opening of openings) {
    const along = new THREE.Vector3(-opening.out.z, 0, opening.out.x);
    const many = Math.max(2, Math.round(opening.across / board.pitch));
    for (let index = 0; index < many; index += 1) {
      const plank = box(
        board.across,
        opening.tall + board.over,
        board.thick,
        S.TIMBER_LIT,
        SHUTTER_NAME,
      );
      plank.position
        .copy(opening.at)
        .addScaledVector(along, (index - (many - 1) / 2) * board.pitch)
        .addScaledVector(opening.out, board.proud);
      plank.lookAt(plank.position.clone().add(opening.out));
      group.add(plank);
    }
  }
  return group;
}

/**
 * **THE WIDEST OPENING GETS A BARRED PANEL RATHER THAN BOARDS.**
 *
 * Four horizontal rails in {@link S.TIMBER_DARK}. **One opening has to differ from the rest**,
 * because a frontage boarded uniformly reads as one continuous hoarding and the building loses
 * its front.
 *
 * The rule used to say *the door*. It says **the widest opening** now, which is the same read
 * and is well defined on a building with no door — three of era four's ten claimable buildings
 * open only through arches, and a rule naming a door cannot express them at all.
 */
export function buildOpeningBar(opening: SuccessionOpening): THREE.Group {
  const group = new THREE.Group();
  group.name = OPENING_BAR_NAME;
  const bar = CLAIM.BAR;

  for (let index = 0; index < bar.rails; index += 1) {
    const rail = box(
      opening.across + bar.over,
      bar.tall,
      bar.thick,
      S.TIMBER_DARK,
      `${OPENING_BAR_NAME}-rail`,
    );
    const up =
      opening.at.y -
      opening.tall / 2 +
      bar.tall * 2 +
      (index * (opening.tall - bar.tall * 3)) / (bar.rails - 1);
    rail.position.copy(opening.at).setY(up).addScaledVector(opening.out, bar.proud);
    rail.lookAt(rail.position.clone().add(opening.out));
    group.add(rail);
  }
  return group;
}

/**
 * A proposed reopening is a removal, so it adds no ghost building. This narrow lifted cleat
 * sits at the closed frontage while the committed shutters remain solid; it says "these
 * boards will come away" without pretending they already have.
 */
export function buildRemovalCleat(): THREE.Group {
  const group = new THREE.Group();
  group.name = REMOVAL_CLEAT_NAME;
  const rail = box(2.4, 0.18, 0.18, S.TIMBER_DARK, `${REMOVAL_CLEAT_NAME}-rail`);
  rail.position.set(0, 0.42, 0);
  rail.rotation.z = -0.12;
  group.add(rail);
  for (const side of [-1, 1] as const) {
    const foot = box(0.18, 0.5, 0.18, S.TIMBER_LIT, `${REMOVAL_CLEAT_NAME}-foot`);
    foot.position.set(side * 0.88, 0.25, 0);
    group.add(foot);
  }
  group.userData.proposedRemoval = true;
  return group;
}

/**
 * **A CIVIC BUILDING IN THREE STATES: open, claimed, and contested.**
 *
 * One colonnaded limestone mass under a terracotta pan-and-cover roof, with a repeated bay at
 * constant spacing — *"the repeated bay is the ornament"* — and a doorway in its front wall.
 * Read the states in the engine's own ladder rather than in the sheet's tiling order:
 *
 *  - **unclaimed** is the building as built;
 *  - **claimed** is **one small object gained at its plot corner** and the building still works;
 *  - **contested** is that same object plus boards in every opening and a bar across the widest,
 *    with the capacity suspended — the crisis's only durable consequence, and it is capacity
 *    rather than ruin. Nothing in this crisis destroys anything: there is no rebuild cost, no
 *    reclaim cost and no damage ladder anywhere in the tuning table.
 *
 * ## THE FABRIC IS A CHILD GROUP AND THE CLAIM FURNITURE IS A SIBLING
 *
 * {@link CIVIC_FABRIC_NAME} holds the podium, the walls, the colonnade, the roof and the
 * doorway, and nothing a claim adds ever goes inside it. That is what makes *shuttered against
 * sacked* assertable rather than judged: the fabric's bounding box is byte-identical in all
 * three states, so an outline that provably has not changed cannot be read as a ruin.
 *
 * ## AND THE POST IS PLACED OFF THE PLOT, NOT OFF ANY MESH
 *
 * `placement.footprint` and `placement.facing` are the whole input, and both are data. The post
 * goes at the plot's front-left corner **in the building's own frame**, so the caller's own
 * position and rotation carry it — which means the placement rule is one subtraction and reads
 * no frontage, no bay and no door.
 */
export function buildCivicBuilding(options: {
  readonly claim: "unclaimed" | "claimed" | "contested";
  /** The holder's mark, cut into the claim post's four faces. `null` when unclaimed. */
  readonly mark: SuccessionMark | null;
  readonly bays?: number;
  /**
   * A spend waiting in the plan for THIS building, drawn on the building itself in the two
   * directions of the one proposal grammar rather than as a second see-through mass laid over
   * it. Both verbs only ever apply to a `contested` building, which is the engine's own
   * refusal (`successionSpendRefusal`: *"is not in dispute, so there is no claim to settle"*).
   *
   *  - **`"cancel"`** is a pure REMOVAL: the boards, the bar and the standing post go thin
   *    ({@link fadeSuccession}) and nothing is added, because nothing is added.
   *  - **`"secure"`** takes the boards off, and whether it is ALSO an addition depends on
   *    {@link proposeMark} — see there. That is the one grammar pointed in whichever directions
   *    the spend actually has, rather than in both by convention.
   */
  readonly propose?: "reopen" | null;
  /**
   * The mark a planned `secure` would leave standing, which is not always the one standing now:
   * the surface aims the verb at the STRONGEST claimant, and that is often not the claimant
   * currently holding the building.
   *
   *  - **same mark** — the post is not changing, so it stays solid and the only thing the plan
   *    says is that the boards come off. One direction, honestly;
   *  - **a different mark** — the standing post is being re-cut, so it goes thin and a ghost
   *    carrying the new mark arrives in the same corner. Both directions of the one grammar, in
   *    the one place a player is already looking.
   */
  readonly proposeMark?: SuccessionMark | null;
}): THREE.Group {
  const group = new THREE.Group();
  group.name = CIVIC_NAME;
  group.userData.claim = options.claim;
  group.userData.mark = options.mark;
  const propose = options.propose ?? null;
  group.userData.propose = propose;

  const bays = options.bays ?? 5;
  const bayStep = 1.15;
  const width = bays * bayStep;
  const deep = Math.min(4.2, width);
  const wall = 2.5;
  const podiumH = 0.35;

  const fabric = new THREE.Group();
  fabric.name = CIVIC_FABRIC_NAME;
  group.add(fabric);

  const bodyWide = width * 0.72;
  const bodyDeep = deep * 0.7;
  const body = box(bodyWide, wall, bodyDeep, S.LIMESTONE, `${CIVIC_NAME}-body`);
  body.position.y = wall / 2 + podiumH;
  fabric.add(body);

  const podium = box(width, podiumH, deep, S.PAVING_DEEP, `${CIVIC_NAME}-podium`);
  podium.position.y = podiumH / 2;
  fabric.add(podium);

  // THE COLONNADE, running round rather than fronting one approach — which is what separates a
  // working civic building from a temple. Constant spacing, because the counted module is the
  // ornament.
  const columnR = 0.2;
  const columnZ = deep / 2 - 0.32;
  for (let index = 0; index < bays; index += 1) {
    const x = (index - (bays - 1) / 2) * bayStep;
    for (const side of [-1, 1] as const) {
      const column = new THREE.Mesh(
        new THREE.CylinderGeometry(columnR, 0.23, wall, 8),
        flatStone({ color: S.LIMESTONE }),
      );
      column.name = `${CIVIC_NAME}-column`;
      column.castShadow = true;
      column.receiveShadow = true;
      column.position.set(x, wall / 2 + podiumH, side * columnZ);
      fabric.add(column);
    }
  }

  /*
   * THE DOORWAY, AND IT IS HERE SO THAT "THE WIDEST OPENING" IS WELL DEFINED.
   *
   * A colonnade of equal bays has no widest opening — every intercolumniation ties, and a rule
   * that picks the first of a tie picks an arbitrary one. A civic building with a way in settles
   * it and is the better building anyway. Drawn as a recessed reveal in `LIMESTONE_DEEP`, which
   * is the limestone twelve percent down: an undercut rather than a hole, because the era's hard
   * near-overhead key puts almost nothing into a hole and a reveal has a wall to catch it.
   *
   * Note what this does NOT do: the placement rule below still never names it. The bar goes on
   * the widest opening, which on THIS building happens to be the doorway and on a fountain would
   * be an arch.
   */
  const doorWide = 0.9;
  const doorTall = 1.95;
  const doorZ = bodyDeep / 2;
  const reveal = box(doorWide, doorTall, 0.14, S.LIMESTONE_DEEP, `${CIVIC_NAME}-doorway`);
  reveal.position.set(0, podiumH + doorTall / 2, doorZ - 0.06);
  fabric.add(reveal);

  // THE ROOF: pan-and-cover terracotta with an ordered ridge, and it is era four's one strong
  // colour. A low gable, because a hipped mass at this camera is the trapezoid every other
  // building already is.
  const roof = new THREE.Mesh(
    new THREE.CylinderGeometry(0.02, deep * 0.78, 1.15, 4, 1),
    flatStone({ color: S.TERRACOTTA }),
  );
  roof.name = `${CIVIC_NAME}-roof`;
  roof.scale.x = (width * 1.06) / (deep * 0.78 * 2);
  roof.rotation.y = Math.PI / 4;
  roof.position.y = wall + podiumH + 0.575;
  roof.castShadow = true;
  roof.receiveShadow = true;
  fabric.add(roof);

  /*
   * THE OPENING SET: every intercolumniation the camera can reach, plus the doorway.
   *
   * Handed to the shutter builder as data. This is the one geometric fact the whole asset needs
   * and it is stated by whoever built the fabric, in the same function, from the same module —
   * so there is no mesh to read and nothing to measure.
   */
  const openings: SuccessionOpening[] = [];
  for (let index = 0; index < bays - 1; index += 1) {
    const x = (index - (bays - 2) / 2) * bayStep;
    for (const side of [-1, 1] as const) {
      openings.push({
        across: bayStep - columnR * 2,
        tall: wall,
        at: new THREE.Vector3(x, wall / 2 + podiumH, side * columnZ),
        out: new THREE.Vector3(0, 0, side),
      });
    }
  }
  openings.push({
    across: doorWide,
    tall: doorTall,
    at: new THREE.Vector3(0, podiumH + doorTall / 2, doorZ),
    out: new THREE.Vector3(0, 0, 1),
  });

  // A planned spend on a contested building takes the boards, the bar and the standing post
  // away, so those are the objects the removal is drawn on. Applied per object as it is added
  // rather than by sweeping the finished group, so the fabric — which no spend touches — stays
  // solid and the thing going thin is exactly the thing going.
  /**
   * Where the claim post stands, in the building's own frame: the plot's front-left corner,
   * stood off on both axes so it lands on the paving and never inside the podium.
   *
   * **The plot rectangle and the facing are the only inputs**, and the facing is the caller's own
   * rotation of this group. One answer, one place, committed or proposed.
   */
  const postCorner: readonly [number, number, number] = [
    -(width / 2 + CLAIM.POST.inset),
    0,
    deep / 2 + CLAIM.POST.inset,
  ];

  if (options.claim !== "unclaimed" && options.mark !== null) {
    const post = buildClaimPost(options.mark, wall);
    post.position.set(...postCorner);
    group.add(post);
  }

  const widest = openings.reduce((one, other) => (other.across > one.across ? other : one));
  /*
   * THE OPENING SET AND THE ONE THAT IS BARRED, RECORDED WHERE A GUARD CAN READ THEM.
   *
   * Written on every state and not only on `contested`, so the set a claim would act on is
   * inspectable before a claim lands — and so a guard can assert that the bar goes on the WIDEST
   * opening rather than on whichever one a `reduce` happened to keep. Measuring a rail's own span
   * cannot make that distinction: every opening on this building is wide enough for a rail.
   */
  group.userData.openings = openings.map((opening) => opening.across);
  group.userData.barred = widest.across;

  if (options.claim === "contested") {
    group.add(buildShutters(openings.filter((opening) => opening !== widest)));
    group.add(buildOpeningBar(widest));
    if (propose === "reopen") {
      const cleat = buildRemovalCleat();
      cleat.position.set(0, 0, bodyDeep / 2 + CLAIM.BOARD.proud + 0.35);
      group.add(cleat);
    }
  }

  return group;
}

/* -------------------------------------------------------------------------- */
/* M10 / M22: a spend, seated in the district it bought                        */
/* -------------------------------------------------------------------------- */

export const SPENT_COUNTER_NAME = "succession-spent-counter";

/**
 * **A COUNTER, AND IT IS THE SAME DISC THE BANK IS COUNTED IN.**
 *
 * Eight-sided rather than smooth, and that is a reading of the rig rather than a saving: at this
 * size a 32-segment cylinder is a circle with a specular-free grey top and reads as a painted dot.
 * Eight facets catch the key on two of them and shade the rest, so the disc has a top and a rim.
 *
 * **It sits 0.015 of its own scale PROUD of its seat and not flush in it**, which is the ruling
 * `SuccessionSlab` already carries in the web lane and the one place this asset's direction was
 * reversed. Truly flush does not read: a disc whose face is level with the stone around it has no
 * edge, and with no edge it has no cast shadow — and a cast shadow is the only presence cue this
 * renderer offers, because there is no ambient occlusion, no outline pass and no specular.
 */
export const COUNTER = {
  /** The sheet's 0.23, at this forum's own scale. See {@link SHEET_TO_FORUM}. */
  across: 0.23 * SHEET_TO_FORUM,
  thick: 0.09 * SHEET_TO_FORUM,
  /** The seat is cut shallower than the disc is thick, and the difference is the relief. */
  seat: 0.075 * SHEET_TO_FORUM,
} as const;

export function buildCounter(x: number, seatFloorY: number, z: number): THREE.Group {
  const group = new THREE.Group();
  group.name = SPENT_COUNTER_NAME;

  const rim = new THREE.Mesh(
    new THREE.CylinderGeometry(COUNTER.across / 2, COUNTER.across / 2, COUNTER.thick, 8),
    flatStone({ color: S.COUNTER_SIDE }),
  );
  rim.name = `${SPENT_COUNTER_NAME}-rim`;
  rim.position.set(x, seatFloorY + COUNTER.thick / 2, z);
  rim.castShadow = true;
  rim.receiveShadow = true;
  group.add(rim);

  const face = new THREE.Mesh(
    new THREE.CylinderGeometry(
      COUNTER.across / 2 - 0.008,
      COUNTER.across / 2 - 0.008,
      COUNTER.thick * 0.18,
      8,
    ),
    flatStone({ color: S.COUNTER }),
  );
  face.name = `${SPENT_COUNTER_NAME}-face`;
  face.position.set(x, seatFloorY + COUNTER.thick * 0.94, z);
  face.castShadow = true;
  face.receiveShadow = true;
  group.add(face);
  return group;
}

/**
 * **THE SPEND, AS AN OBJECT MOVED RATHER THAN A NUMBER SUBTRACTED.**
 *
 * One counter seated in a socket cut into the plinth's **base course**, on a district the player
 * bought. Same disc, same tones, moved: *"that is what makes a spend feel paid rather than
 * deducted."* It is the half of asset 5 only the scene can say — the bank itself is counted in the
 * web lane beside the card prices it exists to be compared against, and a slab out on the island
 * would be a number a player has to look away from the cards to read.
 *
 * **The socket is in the BASE course and never in the crown**, and that is asset 1's ruling rather
 * than a placement preference. A bare plinth has to read as *this district has not decided* rather
 * than as *a figure failed to draw*, and it does that by being finished stonework — so a socket in
 * the top face would turn every bare plinth in the forum into a prepared one waiting for a statue.
 */
export const SPEND_SOCKET = {
  /** In from the base course's own arris, on the corner the plinth faces. */
  inset: 0.16 * SHEET_TO_FORUM,
} as const;

export function seatSpentCounter(plinth: THREE.Group): THREE.Group {
  const [courseSpan, courseTall] = PLINTH_COURSES[0] as readonly [number, number];
  const at = courseSpan / 2 - SPEND_SOCKET.inset;
  /*
   * **THE SEAT IS THE COURSE, AND THERE IS NO SOCKET MESH.**
   *
   * A base course is a solid box, so a disc whose underside is `COUNTER.seat` below its top face is
   * already sunk in real stone with real stone all round it. Cutting a socket plate to sit in the
   * same place would put two surfaces on one plane and z-fight, which at full zoom-out is a
   * flickering speck on a plinth — and it would buy nothing, because the stone the plate would be
   * made of is the stone that is already there.
   *
   * **The 0.015 of relief is kept and it is sub-pixel here, which is worth saying plainly.** At the
   * forum's camera a scaled 0.025 of proud disc is under a pixel, and the shadow it throws under a
   * 77-degree key is a fifth of one, so the relief is not what makes a seated counter legible on the
   * island. What is legible is the disc's own tone against the stone: `COUNTER` is the marble 30
   * percent down and the course is limestone, on two horizontal faces the key hits equally, so it
   * reads as a dark dot set in a pale step. The relief is the WEB LANE's to make visible and
   * `SuccessionSlab` does it there, by displacing the counter's drawn shadow rather than by moving
   * the counter — which is the only way 0.015 can be seen at all.
   */
  plinth.add(buildCounter(at, courseTall - COUNTER.seat, at));
  plinth.userData.spent = true;
  return plinth;
}

/* -------------------------------------------------------------------------- */
/* M6: the port shuts, and the basin still runs                               */
/* -------------------------------------------------------------------------- */

/**
 * **THE QUAY, CLEARED — which is §2.4's *"largest single atmosphere change available at almost
 * no cost"*.**
 *
 * A dressed kerb line and a set of bollards, and **nothing on it**: the tall jars and the
 * corded bales are gone. The clearing is the whole content of this builder, which is why there
 * is no `cargo` parameter — a quay that could be drawn loaded is a quay somebody will draw
 * loaded during a crisis whose entire read is that the port has shut.
 *
 * It separates a stopped port from a SACKED city on **stock against fabric**: every building is
 * sound and it is the goods that have gone, where a sacked city loses the buildings and keeps
 * the mess.
 */
/**
 * **HOW HIGH THE QUAY'S TOP FACE STANDS, and how deep the deck runs.**
 *
 * Exported because the deck is a SURFACE — the crane stands on it — and a caller that guessed
 * at the height is how the crane came to be raised by exactly this much while standing two and a
 * half units in front of the deck, on open paving, with the whole machine floating. Anything set
 * down on the quay reads these, and `successionNothingFloats.test.ts` reads them too.
 */
export const QUAY_DECK_TOP = 0.5;
export const QUAY_DEEP = 3.4;

/**
 * **HOW DEEP A HULL SITS IN THE WATER, below its own origin.**
 *
 * A quarter of the hull's beam, which is what a small laden craft draws and is enough that the
 * waterline visibly cuts the timber rather than grazing it. Named because it is the whole of the
 * contract between {@link buildHull} and whoever seats one: put the origin at the harbour's
 * surface and the keel goes under by this.
 */
export const HULL_DRAUGHT = 0.32;

export function buildQuay(along: number): THREE.Group {
  const group = new THREE.Group();
  group.name = QUAY_NAME;

  const deck = box(along, QUAY_DECK_TOP, QUAY_DEEP, S.PAVING, `${QUAY_NAME}-deck`);
  deck.position.y = QUAY_DECK_TOP / 2;
  deck.castShadow = false;
  group.add(deck);

  const lip = box(along, 0.4, 0.5, S.KERB, `${QUAY_NAME}-lip`);
  lip.position.set(0, 0.4, 1.7);
  group.add(lip);

  const posts = Math.max(2, Math.round(along / 3.5));
  for (let index = 0; index < posts; index += 1) {
    const x = (index - (posts - 1) / 2) * (along / posts);
    const bollard = new THREE.Mesh(
      new THREE.CylinderGeometry(0.19, 0.22, 0.62, 6),
      flatStone({ color: S.KERB }),
    );
    bollard.name = `${QUAY_NAME}-bollard`;
    bollard.castShadow = true;
    bollard.receiveShadow = true;
    bollard.position.set(x, QUAY_DECK_TOP + 0.31, 1.25);
    group.add(bollard);
  }
  return group;
}

/**
 * **THE TREADWHEEL CRANE, STOPPED MID-LIFT — the wide master's signature object.**
 *
 * §2.1's own sentence: *"A timber treadwheel crane stands stopped mid-lift with a squared
 * limestone block hanging still in its sling."* It is the picture of a working port that has
 * stopped working: the machine is intact, the load is in the air, and nobody is turning it.
 *
 * **It is also where era four's ambient motion lives, and that reading is the brief's own.** §2.6
 * gives the crisis two motions — *"the basin's water moves and the block in the crane's sling
 * turns slightly"* — and the crane in question is this one rather than a plinth's shear-legs: a
 * block waiting at a plinth's foot is on the ground with the sling hanging slack ABOVE it, so
 * there is nothing in a sling there to turn. The block that hangs is the one on the quay.
 *
 * That split is worth having in one place, because it also settles what a district's plinth
 * draws: bare, or a block on the ground under a slack sling, or a figure standing. A hoisted
 * block over a plinth is the EXIT beat — *"the crane finishing its lift, in one cut, at the
 * resolution panel"* — and not a state a board can sit in.
 */
export function buildTreadwheelCrane(completed = false): THREE.Group {
  const group = new THREE.Group();
  group.name = CRANE_NAME;
  group.userData.completed = completed;

  const mastHeight = 5.2;
  const mast = box(0.42, mastHeight, 0.42, S.TIMBER_MID, `${CRANE_NAME}-mast`);
  mast.position.y = mastHeight / 2;
  group.add(mast);

  // The wheel a crew would have walked, standing on edge beside the mast. Faceted, six-sided,
  // and stopped: it is the one machine in the city and nothing is turning it.
  const wheel = new THREE.Mesh(
    new THREE.TorusGeometry(1.5, 0.22, 4, 8),
    flatStone({ color: S.TIMBER_LIT }),
  );
  wheel.name = `${CRANE_NAME}-wheel`;
  wheel.position.set(-1.1, 1.7, 0);
  wheel.rotation.y = Math.PI / 2;
  wheel.rotation.x = completed ? Math.PI / 6 : 0;
  wheel.castShadow = true;
  wheel.receiveShadow = true;
  group.add(wheel);
  for (let spoke = 0; spoke < 3; spoke += 1) {
    const bar = box(0.16, 2.9, 0.16, S.TIMBER_DARK, `${CRANE_NAME}-spoke`);
    bar.position.set(-1.1, 1.7, 0);
    bar.rotation.x = (spoke * Math.PI) / 3;
    group.add(bar);
  }

  const jib = box(0.3, 0.3, 4.4, S.TIMBER_DARK, `${CRANE_NAME}-jib`);
  jib.position.set(0, mastHeight - 0.3, 1.7);
  jib.rotation.x = 0.22;
  group.add(jib);

  const fallTall = completed ? 0.8 : 2.4;
  const loadY = completed ? mastHeight - 1.3 : mastHeight - 2.85;
  const fall = box(0.1, fallTall, 0.1, S.FIBRE, `${CRANE_NAME}-fall`);
  fall.position.set(0, mastHeight - 0.4 - fallTall / 2, 3.6);
  group.add(fall);

  // THE LOAD, HELD IN THE AIR. Named so the ambient rig can find it, and marked as movable so
  // nothing else on this island can be turned by mistake.
  const load = box(1.3, 0.9, 1.3, S.LIMESTONE, CRANE_LOAD_NAME);
  load.position.set(0, loadY, 3.6);
  load.userData.hoisted = !completed;
  group.add(load);

  return group;
}

/**
 * **A HULL STANDING OFF AT ANCHOR: nothing is being unloaded.**
 *
 * A timber hull with its mast up and its yard bare, holding position past the harbour mouth.
 * Two or three of these is the picture §2.4 asks for, and it is a re-pose of props the era's
 * kit already carries rather than new art.
 *
 * **THE GROUP'S ORIGIN IS THE WATERLINE**, and saying so is the point of this paragraph. The
 * keel sits {@link HULL_DRAUGHT} below it, so a caller seats a hull by putting its origin at the
 * harbour's own surface and at nothing else. It used to be placed at a y of -0.2 chosen against
 * no stated datum at all, over water drawn at -1.4 in a different file, and all three hulls flew.
 */
export function buildHull(): THREE.Group {
  const group = new THREE.Group();
  group.name = HULL_NAME;

  const hull = new THREE.Mesh(
    new THREE.CylinderGeometry(0.62, 0.24, 4.4, 5, 1),
    flatStone({ color: S.TIMBER_MID }),
  );
  hull.name = `${HULL_NAME}-body`;
  hull.rotation.z = Math.PI / 2;
  hull.rotation.y = Math.PI / 10;
  hull.position.y = 0.62 - HULL_DRAUGHT;
  hull.castShadow = true;
  hull.receiveShadow = true;
  group.add(hull);

  /*
   * A DECK, and it is what stops a hull reading as a floating log. The body is a lathed prism
   * seen from a near-overhead camera, so what the eye gets of it is one long facet — add a pale
   * deck inside the sheer and the same object reads as a vessel with an inside, at a distance
   * where the mast is two pixels wide.
   */
  const deck = box(3.5, 0.12, 0.86, S.TIMBER_LIT, `${HULL_NAME}-deck`);
  deck.position.y = 0.62 - HULL_DRAUGHT + 0.42;
  deck.rotation.y = Math.PI / 10;
  group.add(deck);

  const mast = box(0.14, 2.6, 0.14, S.TIMBER_DARK, `${HULL_NAME}-mast`);
  mast.position.y = 1.6;
  group.add(mast);

  // The yard is BARE. A furled sail would be a ship at rest; nothing hanging is a ship that
  // has arrived and is not being worked, which is the difference the frame has to carry.
  const yard = box(1.9, 0.1, 0.1, S.TIMBER_DARK, `${HULL_NAME}-yard`);
  yard.position.y = 2.5;
  group.add(yard);
  return group;
}

/**
 * **THE PUBLIC BASIN, STILL RUNNING — the one thing on the island that has not stopped.**
 *
 * Kept *"precisely because everything else has"*. A kerbed stone tank with a water surface in
 * {@link S.WATER_BASIN}, which is the harbour's own slate lifted in value: shallow moving water
 * over pale stone, and a step of about 0.13 in relative luminance against the shut harbour, so
 * the two waters are legibly a different thing at a glance.
 *
 * The water plane is named so the ambient-motion rig can find it and so a reduced-motion still
 * can leave it exactly where it is.
 */
export function buildBasin(across: number): THREE.Group {
  const group = new THREE.Group();
  group.name = BASIN_NAME;

  const wall = 0.62;
  const sides: readonly (readonly [number, number, number, number])[] = [
    [across, wall, 0, -across / 2],
    [across, wall, 0, across / 2],
    [wall, across, -across / 2, 0],
    [wall, across, across / 2, 0],
  ];
  for (const [sx, sz, x, z] of sides) {
    const side = box(sx, 0.66, sz, S.KERB, `${BASIN_NAME}-kerb`);
    at(side, x, 0.33, z);
    group.add(side);
  }

  const floor = box(across, 0.2, across, S.PAVING_DEEP, `${BASIN_NAME}-floor`);
  floor.position.y = 0.1;
  floor.castShadow = false;
  group.add(floor);

  const water = box(across - wall, 0.08, across - wall, S.WATER_BASIN, BASIN_WATER_NAME);
  water.position.y = 0.42;
  water.castShadow = false;
  group.add(water);
  return group;
}

/**
 * **HOW HIGH THE TRUNK IS LIMBED UP BEFORE ANY LEAF STARTS.**
 *
 * The whole of the fix, in one number. It was 0.15 — the trunk stood 2.1 and the cone's skirt
 * came down to 1.95 — so the crown sat on the ground with a fifteen-hundredths sliver of stem
 * under it, and at 1024x580 that is not a tree, it is a **tent**, which is exactly what the
 * lead called them. A tent has no daylight beneath it and a limbed-up tree is nothing but
 * daylight beneath it.
 *
 * 2.35 is the era's own instruction rather than a taste: *"trunks limbed up to the same height,
 * which is the paving's module carried into the planting"*. Above a person and clear enough
 * that the cast shadow lands as a separate pool on the paving, which is the second cue — a tent
 * shades the ground it stands on and a tree shades the ground beside it.
 */
export const TREE_LIMBED_UP = 2.35;

/**
 * **A LIMBED-UP TREE, UNTOUCHED BY THE CRISIS (M7) — and it used to read as a tent.**
 *
 * Era four's own planting, and the crisis leaves it alone because a political dispute does not
 * change what grows. Here so the forum has the era's own edge in frame rather than because the
 * crisis does anything to it — which is exactly the row's answer.
 *
 * ## WHAT WAS WRONG, BECAUSE IT WAS THREE THINGS AND ONLY ONE OF THEM WAS THE SHAPE
 *
 *  1. **No trunk showed.** See {@link TREE_LIMBED_UP}. A six-sided cone whose skirt reaches
 *     almost to the paving is a tent whatever it is called;
 *  2. **it was a cone**, which is a clean triangle in silhouette — and this island's key is
 *     near-overhead and hard, so a triangle is what it stays. The crown is now three
 *     overlapping icosahedra flattened into a broad head: the outline is lumpy, no two trees
 *     present the same one, and there is no apex to read as a peak;
 *  3. **it was one flat green.** Under one tone every facet of a convex solid takes nearly the
 *     same light and the mass has no interior. The head is now {@link S.FOLIAGE} over
 *     {@link S.FOLIAGE_DEEP}, which is the island's own two canopy tones.
 *
 * The row it stands in is `successionForum.ts`'s answer, and it matters as much as the shape:
 * era four's guide asks for *"trees in rows — a colonnade of them … evenly spaced"*, and six
 * trees in two blobs at the disc's edges was neither.
 */
export function buildTree(): THREE.Group {
  const group = new THREE.Group();
  group.name = TREE_NAME;

  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.17, 0.31, TREE_LIMBED_UP, 6),
    flatStone({ color: S.TIMBER_MID }),
  );
  trunk.name = `${TREE_NAME}-trunk`;
  trunk.position.y = TREE_LIMBED_UP / 2;
  trunk.castShadow = true;
  trunk.receiveShadow = true;
  group.add(trunk);

  /*
   * THE LIMBS, and they are what makes the gap read as deliberate rather than as a crown
   * hovering. Two short stubs angling up out of the top of the stem into the head, so the eye
   * has something carrying the mass — without them a floating ball over a post is the other way
   * to draw the same defect.
   */
  for (const [lean, turn] of [
    [0.46, 0.7],
    [-0.5, -1.9],
  ] as const) {
    const limb = box(0.13, 0.92, 0.13, S.TIMBER_MID, `${TREE_NAME}-limb`);
    limb.position.set(Math.sin(turn) * 0.24, TREE_LIMBED_UP + 0.34, Math.cos(turn) * 0.24);
    limb.rotation.set(Math.sin(turn) * lean, turn, Math.cos(turn) * lean);
    group.add(limb);
  }

  /*
   * THE HEAD: three flattened icosahedra, offset from each other so the outline is a broad
   * lumpy mass rather than any one solid. BROAD and not tall — this era's trees are clipped,
   * and a wide low head is also the shape that reads at a near-overhead key, where a tall one
   * shows the camera mostly its own shadowed side.
   */
  const puffs: readonly (readonly [number, number, number, number, number])[] = [
    [1.32, 0, 0, 0, S.FOLIAGE],
    [0.96, -0.62, -0.26, 0.44, S.FOLIAGE_DEEP],
    [0.86, 0.66, -0.16, -0.4, S.FOLIAGE_DEEP],
  ];
  for (const [size, x, up, z, tone] of puffs) {
    const puff = new THREE.Mesh(
      new THREE.IcosahedronGeometry(size, 0),
      flatStone({ color: tone }),
    );
    puff.name = `${TREE_NAME}-crown`;
    puff.scale.set(1, 0.66, 1);
    puff.position.set(x, TREE_LIMBED_UP + 0.92 + up, z);
    puff.castShadow = true;
    puff.receiveShadow = true;
    group.add(puff);
  }
  return group;
}

/* -------------------------------------------------------------------------- */
/* M11: the proposal grammar                                                  */
/* -------------------------------------------------------------------------- */

/**
 * How solid a PROPOSED object is: **0.58**, which is Claude Design's answer to its own question 2.
 *
 * The shipped `GhostBuilding` runs 0.5, ruled against a pale ground; era four's ground is paler
 * still, so a ghost needs more body rather than less. This was 0.7 here, raised off a frame at a
 * time when a proposal also multiplied its own colour by 0.55 — two moves in the same direction,
 * which together took the ghost most of the way to a solid dark object. It is 0.58 over a single
 * named tone now, which is one move.
 */
export const GHOST_OPACITY = 0.58;

/**
 * **HOW MUCH A PROPOSAL IS LIT FROM INSIDE, AND THE NUMBER COMES DOWN RATHER THAN UP.**
 *
 * `GhostBuilding` runs 0.40. Era four runs 0.18, and DOWN is the point: an emissive lift is exactly
 * what would undo the dark end of the stone family and hand the ghost back to the pale ground it was
 * moved away from. 0.18 is enough to keep the shadowed quarter of an orbit from crushing a ghost to
 * a silhouette, and not enough to make it look lit from inside — which matters because the only
 * emissive anywhere in era four is this one. Question 4 refuses it on every mark and every face, for
 * the reason that a face lit from inside *"is the one thing on this island that would look like it is
 * telling you something, which is precisely the wrong sentence for this crisis."*
 */
export const GHOST_EMISSIVE = 0.18;

/**
 * **A PROPOSAL IS THE STONE OBJECT ITSELF, RENDERED THINNER — never an outline.**
 *
 * The art sheet settles the grammar on the evidence of its own first run: an outline came back
 * as solid raised moulding, which is committed masonry carrying no translucency at all, while
 * the see-through object came back with the paving joints legible through it. So this takes a
 * built group and thins it, keeping the silhouette, the facets and — the part likeliest to be
 * dropped — **the cut mark**, because a proposal that hides the mark says only that a claim is
 * coming, in the crisis whose whole question is whose.
 *
 * It goes to the DARK end of the stone family rather than the pale end, deliberately: era
 * four's stone is the palest in the run and a ghost reasoning correctly toward pale resolves to
 * nothing against it.
 *
 * **It must not read as a UI overlay.** A proposal here is the material itself; nothing added
 * is a dash, a hatch, a reticle or a bracket.
 */
export function ghostSuccession(group: THREE.Group): THREE.Group {
  /*
   * **ONE MATERIAL INSTANCE FOR THE WHOLE GHOST, AND THAT IS A RENDERING FACT.**
   *
   * It used to clone the object's own material per mesh and multiply each colour down. Two problems,
   * and the second is the one that would have shown up as a bug rather than as a preference. A
   * ghosted claim post came out marble-thinned over groove-thinned, which is a picture of the
   * object; a proposal is a picture of *the object about to change existence*, so it is one flat
   * tone. And `state.plan` holds one spend per district and as many districts as a player can
   * afford, so a six-ward board can carry six ghosts — six ghosts on a dozen separate transparent
   * materials is a dozen draw calls with unstable sort order, which is how a ghost flickers as the
   * camera orbits. One instance per sign, not per mesh.
   */
  const thin = new THREE.MeshStandardMaterial({
    color: S.STONE_DEEP,
    emissive: S.STONE_DEEP,
    emissiveIntensity: GHOST_EMISSIVE,
    transparent: true,
    opacity: GHOST_OPACITY,
    // A proposal must not occlude the committed stone behind it — the paving's own joints and the
    // wall's own coursing have to stay legible THROUGH it, which is the claim
    // `planned-against-committed` rests on. A ghost's own back faces must not occlude its front
    // ones either, which is the same flag doing a second job.
    depthWrite: false,
    flatShading: true,
    metalness: 0,
    roughness: 0.95,
  });

  group.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh) {
      return;
    }
    mesh.material = thin;
    /*
     * A ghost throws no shadow, and this is the sharpest of the three differences rather than the
     * incidental one: at `shadowIntensity: 1` a committed figure throws a hard black shadow across
     * the plinth's crown and a proposed one throws nothing, so the two are distinguishable at full
     * zoom-out **from the ground alone**, without the ghost itself being legible.
     */
    mesh.castShadow = false;
    mesh.receiveShadow = false;
  });
  group.userData.proposed = true;
  return group;
}

/**
 * How solid an object PROPOSED FOR REMOVAL is.
 *
 * Thinner than an addition's {@link GHOST_OPACITY}, and the gap between the two is the whole
 * point: the two directions have to be told apart on a board where both can be in the plan at
 * once, and they are told apart on value rather than on any added mark. An addition is
 * substantial enough to read as arriving; a removal is thin enough to read as going.
 */
export const REMOVAL_OPACITY = 0.44;

/**
 * **A REMOVAL IS THE EXISTING OBJECT TURNED SEE-THROUGH — the other direction of the one
 * proposal vocabulary.**
 *
 * This closes a gap #488's own author found and wrote down: *"cancel is the one spend verb
 * whose result is a subtraction, which a see-through added object cannot express."* The
 * surface used to draw a planned `cancel` by ghosting the building it WOULD be — an
 * `unclaimed` civic mass, see-through, laid over the contested one. That says nothing,
 * because the shutters and the corner marker the cancel would take away are still standing
 * solid underneath it, and the ghost's only content is a second copy of the mass they are on.
 * A proposal drawn as an addition can only ever add.
 *
 * So a removal is drawn on the object itself. The shutters and the marker stay exactly where
 * they are and go thin, which says *these are what goes* in the one place a player is already
 * looking, and leaves the building they are on solid so the subtraction has something to be
 * subtracted from.
 *
 * **It keeps its own colour**, unlike {@link ghostSuccession}, which walks to the dark end of
 * the stone family so a NEW object separates from pale limestone behind it. A removal has no
 * such problem — it is already sitting against the building it belongs to — and darkening it
 * would say a different object had appeared, which is the opposite of what is meant.
 *
 * **It keeps its cast shadow.** The object is committed and still standing; only its future is
 * in question. Dropping the shadow is what {@link ghostSuccession} does to say *this is not a
 * fact yet*, and doing it here would say the removal had already happened — the same error as
 * the overlay it replaces, pointed the other way.
 */
export function fadeSuccession(group: THREE.Object3D): THREE.Object3D {
  const thin = (material: THREE.Material): THREE.Material => {
    const fading = (material as THREE.MeshStandardMaterial).clone();
    fading.transparent = true;
    fading.opacity = REMOVAL_OPACITY;
    // What is BEHIND a thing on its way out is the point of showing it going, so the wall and
    // the openings under a shutter have to stay legible through it.
    fading.depthWrite = false;
    return fading;
  };

  group.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh) {
      return;
    }
    mesh.material = Array.isArray(mesh.material)
      ? mesh.material.map(thin)
      : thin(mesh.material);
  });
  group.userData.proposedRemoval = true;
  return group;
}
