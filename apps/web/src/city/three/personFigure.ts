import * as THREE from "three";

import type { CitizenCrown, CitizenCut, CitizenDress } from "../citizenDress";

/**
 * **HOW TALL A PERSON IS ON THIS ISLAND, AND WHAT SHAPE THEY ARE. One module, one height,
 * every surface.**
 *
 * This file exists because there were two of them and they drifted. `Citizens.tsx` sized the
 * everyday crowd against a BUILDING — half the Dwellings' rendered height — and
 * The retired gathering renderer sized its crowd against a pixel count at one camera. So a
 * citizen inflated when they walked in to gather, which is not a thing people do, and the lead
 * ruled on it in one sentence:
 *
 * > *"why are there groups of citizens at different sizes? they should all be the same size
 * > bro. the crowd coming into gather doesn't mean they all become giant sized - they can just
 * > retain their initial size and just come in to the center to watch."*
 *
 * The repair is structural rather than arithmetic. Two constants that happen to be equal drift
 * again the first time somebody tunes one of them against a screenshot; **one constant that
 * both surfaces import cannot**. `personSize.test.ts` is the guard that keeps it that way, and
 * it fails if a second person-height literal appears anywhere in the city's source.
 *
 * ## ⚑ HOW FAR APART THEY HAD DRIFTED — 2.31x, AND NOT THE 2.18x THIS FILE USED TO SAY
 *
 * **2.18x is a drawn crown divided by a nominal**, and there is no reading of the two figures
 * under which that is the comparison anybody wants: it takes the old ceremony figure's topmost
 * DRAWN vertex (2.843u, because a detail-0 icosahedron has no vertex at its pole) and divides it
 * by the everyday figure's NOMINAL standing height (1.300u). Like for like the divergence is
 * larger, and it is three numbers rather than one because there are three honest ways to ask:
 *
 *  - **2.31x as nominals** — 3.000u of declared ceremony height against 1.300u, which is the
 *    comparison between the two CONSTANTS and the one this docblock's own sentence was about;
 *  - **2.26x as drawn crowns** — 2.843u against 1.260u, the comparison between the two
 *    SILHOUETTES a learner could actually see;
 *  - **2.30x as drawn pixels** — 17.9 CSS pixels against 7.8 at 1024x580, which is the same
 *    comparison through the projection, and differs from the crown ratio because a figure's crown
 *    is nearer the camera than its feet so height does not project linearly.
 *
 * The shared constants keep everyday and crisis crowds on one world scale.
 *
 * ## THE HEIGHT IS THE EVERYDAY ONE, AND THE RULING PICKS IT
 *
 * *"They can just retain their initial size"* — a citizen's initial size is the one they have
 * while they are living in the city, at their doorsteps, which is this file's
 * {@link PERSON_HEIGHT}. It is also the only one of the two that was ever DERIVED: the
 * ceremony's figure was reverse-engineered from a pixel count at a camera that has since moved
 * three times, and a screen measurement standing in for a world constant is exactly the defect
 * that produced the drift.
 *
 * ## THE ANCHOR IS THE DWELLINGS, and era one's style guide picks it for us
 *
 * `rowhouse` renders **2.608u** (era one section 6, measured), it is *"the only residence on
 * the island"* — so it is literally the building people live in — and it is *"the lowest of
 * the full-plot buildings: a wide 8x8 patch of settlement that never rises, which is what
 * stops it competing with the Round House beside it."* Height competition is the guide's own
 * stated concern for this mass, which makes it the pair a human figure is most at risk of
 * losing. Get this one right and every other mass is clear by construction.
 *
 * WHAT METRIC REALISM SAYS, AND WHY IT IS THE WRONG FRAME. Reasoning from real-world sizes
 * gives a BIGGER figure, not a smaller one: a 2.6u dome you stand up in implies about 0.9u per
 * metre and therefore a 1.7m person at roughly 1.75u. It disagrees with the Round House (which
 * implies 1.5u) and the Lookout (1.85u), because the contain-fit scales every mass by its own
 * plot and leaves no consistent metric scale to derive from. So the ratio below is a READ
 * ratio taken from the guide's own hierarchy, and saying that plainly is better than dressing
 * it as a measurement.
 *
 * THE RATIO: HALF THE DWELLINGS' RENDERED HEIGHT.
 *
 *     1.30u  =  49.8% of the Dwellings (2.608u)   <- the anchor: clearly subordinate
 *            =  27.0% of the Round House (4.821u) <- the tallest roofed building
 *            =  13.3% of the Lookout (9.769u)     <- the tallest thing on the island
 *
 * Half reads as *a person beside a hut they can enter* while leaving the dwelling unmistakably
 * the larger thing. The previous 1.78u was **68% of the Dwellings**, which is a person
 * two-thirds as tall as the whole cluster of huts they live in — the figure competing with the
 * architecture, which is what Evan saw.
 *
 * It is also what keeps a person clear of the depth-precision claim `#152` bought.
 * `depthPrecision.test.ts` justifies its near plane with a measured sweep in which nothing
 * solid came within 3u of the camera; a person stands ON the ground and is shorter than the
 * terrain already swept, so they cannot get closer than something already measured. The
 * mastery stars are the exception there precisely because they float, and a person never does.
 *
 * ## THE SILHOUETTE IS THE WHOLE JOB AT THIS SIZE
 *
 * A single tapered cylinder was tried first and it reads as a tally post, not a person — which
 * matters here more than usual, because a notched post is a real prop in this era's kit and
 * the crowd would have been mistaken for scenery. A person needs legs narrower than the body,
 * a hem wider than the shoulders, and arms: three cues, none of which survives being left out.
 * They are merged into ONE geometry rather than parented as separate meshes, so a whole crowd
 * is still a single instanced draw (the Art Bible's silhouette-first rule, section 3, applied
 * at the smallest thing on the island).
 *
 * **THAT IS ALSO WHY THE CEREMONY CROWD IS BUILT HERE AND NOT OUT OF ITS OWN PRIMITIVES.**
 * The retired gathering renderer used a tapered cylinder and an icosahedron — no legs, no hem, no
 * arms — so the two crowds differed in SHAPE as well as in size and *"the same people, standing
 * somewhere else"* was not true of either. One geometry builder is what makes it true.
 */

/* -------------------------------------------------------------------------- */
/* Proportions — the one place any of these numbers exist                      */
/* -------------------------------------------------------------------------- */

const LEG_HEIGHT = 0.3;
const LEG_RADIUS = 0.12;
const TUNIC_HEIGHT = 0.43;
const TUNIC_TOP_RADIUS = 0.19;
const TUNIC_BASE_RADIUS = 0.28;
const ARM_LENGTH = 0.29;
const ARM_RADIUS = 0.06;

/**
 * A HEAD-HEAVY proportion, deliberately. At the fixed ~49-degree camera a person is about a
 * dozen screen pixels tall at default framing, and at anatomical proportions the head is then
 * two pixels and the figure reads as a post — which is a real hazard in this era, whose props
 * kit includes notched tally posts in three heights. Oversizing the head is the standard
 * low-poly answer and it costs nothing: it is the one cue that survives being small.
 *
 * THE DOWNSIZE IS NOT UNIFORM, for exactly that reason. Shrinking 1.78u -> 1.30u is a x0.730
 * scale, which would have taken the head to a 0.248 radius. It is held at 0.27 instead — about
 * 9% larger than its share — and the difference comes out of the legs and the tunic. The head
 * is therefore 41.5% of standing height where it was 38.2%: the figure got smaller and MORE
 * head-heavy at the same time, because the smaller it gets the more the head is carrying. The
 * body radii shrink by only x0.78 for the same reason, so the silhouette stays stocky rather
 * than going spindly at distance.
 */
const HEAD_RADIUS = 0.27;

/** A neck's worth of gap between the tunic's shoulder and the head. */
const NECK_GAP = 0.03;

/**
 * The radius of the SOLE — the bottom face of the leg mass, which is the part in contact with
 * the ground. Not a new dimension: it is the taper the leg cylinder below was already built
 * with, given a name.
 *
 * **Exported because a caller that TIPS a person forward about their feet needs it.** Leaning
 * a figure by `angle` about its own origin sinks the leading edge of the sole below the
 * ground by `PERSON_SOLE_RADIUS * sin(angle)`, so the lift that keeps the feet on the surface
 * is derivable rather than eyeballed — and a number eyeballed against one lean angle is wrong
 * at the next one. The traffic layer's cart-puller is the caller (`Vehicles.tsx`); the crowd's
 * crisis hunch does not need it, because that pose is measured against a tolerance rather than
 * seated on a surface.
 */
export const PERSON_SOLE_RADIUS = LEG_RADIUS * 0.85;

/** Where the garment's shoulder line sits, measured from the sole of the foot. */
export const SHOULDER_Y = LEG_HEIGHT + TUNIC_HEIGHT;

/** Where the head's centre sits, measured from the sole of the foot. */
export const HEAD_CENTRE_Y = SHOULDER_Y + NECK_GAP + HEAD_RADIUS;

/**
 * **A PERSON'S STANDING HEIGHT IN WORLD UNITS, at `height_scale = 1`. The one figure, and the
 * only place it is written down.**
 *
 * Both crowds on this island are instanced from the geometry below at this height, so a
 * citizen walking to their door and the same citizen gathering for a ceremony are the same
 * person. See the header for why this number rather than the ceremony's old one, and
 * `personSize.test.ts` for the guard that stops a second one appearing.
 */
export const PERSON_HEIGHT = HEAD_CENTRE_Y + HEAD_RADIUS;

/**
 * Where the CROWN of the head actually is, as a share of {@link PERSON_HEIGHT}.
 *
 * `THREE.IcosahedronGeometry(r, 0)`'s topmost VERTEX sits at `r * t / sqrt(1 + t^2)` with `t`
 * the golden ratio, which is `0.8507 r` and not `r`: a detail-0 icosahedron has no vertex at
 * its pole. So the drawn figure stops a little under the nominal height, and a claim about
 * what a frame SHOWS has to use this rather than the nominal. `PERSON_HEIGHT` stays the
 * nominal because it is what the near-plane and Dwellings-ratio arguments are stated in.
 *
 * The squared crown is a box whose half-height stays inside `HEAD_RADIUS`, so it reaches
 * slightly higher than the icosahedron and still under the nominal. This is the conservative
 * of the two.
 */
const GOLDEN = (1 + Math.sqrt(5)) / 2;
export const PERSON_CROWN_FRACTION =
  (HEAD_CENTRE_Y + (HEAD_RADIUS * GOLDEN) / Math.sqrt(1 + GOLDEN ** 2)) / PERSON_HEIGHT;

/**
 * The Dwellings' MEASURED rendered height, from era one's style guide section 6: at its 2x2
 * plot `rowhouse` *"fills 100% x 89.5% and stands 2.608u"*. Exported so the size guard can pin
 * the RATIO to the building rather than to a bare literal — if the art changes and this number
 * moves, the guard says so instead of the crowd quietly ending up the wrong size against it
 * again.
 */
export const DWELLINGS_RENDERED_HEIGHT = 2.608;

/**
 * A person stands half the height of the dwelling they live in. See the header for why the
 * Dwellings is the anchor and why a metric derivation is not.
 */
export const CITIZEN_DWELLING_FRACTION = 0.5;

/**
 * THE PER-CUT RADII, all expressed against era one's so a reader can see the difference rather
 * than three unrelated sets of numbers. Every cut shares {@link SHOULDER_Y}, the head and the
 * arms, so only the OUTLINE below the shoulders moves — which is what keeps the derived
 * height, the near-plane claim and the Dwellings ratio true in all ten eras at once.
 *
 * **Era two's wrap.** The waist is pinched to 55% of era one's hem and the hem itself comes in
 * to 84% of it, so the figure reads as an upright belted column where era one reads as a cone.
 * `WRAP_WAIST_FRACTION` puts the belt just above the middle of the garment, which is where a
 * belt sits and is also where it is most visible from above.
 *
 * **Era three's mantle.** It drops `MANTLE_DROP` below era one's hemline — a third of the leg
 * — which is *"long"*, and the shoulder slab is a fifth of the garment's height on one side
 * only, which is *"over one shoulder"*. The hem stays between era two's and era one's: a
 * mantle hangs rather than flares.
 */
const WRAP_WAIST_RADIUS = TUNIC_BASE_RADIUS * 0.55;
const WRAP_HEM_RADIUS = TUNIC_BASE_RADIUS * 0.84;
const WRAP_WAIST_FRACTION = 0.44;
const MANTLE_HEM_RADIUS = TUNIC_BASE_RADIUS * 0.93;
const MANTLE_DROP = LEG_HEIGHT * 0.34;
const MANTLE_SHOULDER_HEIGHT = TUNIC_HEIGHT * 0.2;

/** Which shoulder the mantle is thrown over. One side, fixed, so the whole crowd agrees. */
const MANTLE_SHOULDER_SIDE = -1;

/** The bead / pin. Small enough to be trim, large enough to survive the default framing. */
const ORNAMENT_RADIUS = 0.062;

/** Low, faceted, and era-appropriate: six sides read as hand-made at this size. */
const BODY_RADIAL_SEGMENTS = 6;

/**
 * The widest a figure gets, at `height_scale = 1` — era one's hem, which is the broadest of
 * the three cuts. Exported so a composition claim about how far apart people stand can be read
 * against how broad one of them is, rather than against a literal copied out of this file.
 */
export const PERSON_HEM_RADIUS = TUNIC_BASE_RADIUS;

/* -------------------------------------------------------------------------- */
/* The geometry                                                                */
/* -------------------------------------------------------------------------- */

/**
 * Concatenate several geometries into one, so a multi-part figure is still a single instanced
 * draw. A local helper rather than three's `BufferGeometryUtils`, which lives under
 * `three/examples` and is not otherwise imported anywhere in this app — four boxes and
 * cylinders do not justify pulling in an examples module.
 *
 * Non-indexed only, which every primitive here becomes via `toNonIndexed()`, so there are no
 * index offsets to remap and the merge is a straight buffer copy.
 */
function mergeGeometries(parts: readonly THREE.BufferGeometry[]): THREE.BufferGeometry {
  const flat = parts.map((part) => (part.index ? part.toNonIndexed() : part));
  let vertices = 0;
  for (const part of flat) {
    vertices += part.getAttribute("position").count;
  }
  const positions = new Float32Array(vertices * 3);
  const normals = new Float32Array(vertices * 3);
  let at = 0;
  for (const part of flat) {
    const position = part.getAttribute("position");
    const normal = part.getAttribute("normal");
    positions.set(position.array as Float32Array, at * 3);
    normals.set(normal.array as Float32Array, at * 3);
    at += position.count;
  }
  const merged = new THREE.BufferGeometry();
  merged.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  merged.setAttribute("normal", new THREE.BufferAttribute(normals, 3));
  for (const part of flat) {
    part.dispose();
  }
  return merged;
}

/**
 * One person's body, cut to the era: legs, a garment, and two arms. Built with y=0 at the
 * feet, so a single instance matrix seats the body, its head and its ornament together — and
 * so the everyday crowd and the ceremony crowd can compose that matrix the same way.
 *
 * ## THE CUT IS THE ONLY THING THAT SURVIVES FULL ZOOM-OUT, so it carries the era
 *
 * At default framing a person is about a dozen screen pixels; zoomed out it is a few, and an
 * ornament is sub-pixel long before the outline is. So each cut changes the OUTLINE and not
 * the trim, and each is a quotation from that era's guide rather than a shape picked to be
 * different:
 *
 *   - **`tunic`** (era one) — a hide tunic flaring to a hem WIDER than the shoulders. The
 *     shipped shape, unchanged to the last digit.
 *   - **`wrap`** (era two) — *"belted with a cord"*: an upright column pinched at the waist
 *     and hanging to a NARROWER hem, so era two reads as taller and straighter beside era
 *     one's cone. The belt is the guide's own nominated marker of the advance on a person.
 *   - **`mantle`** (era three) — *"a long fringed wool mantle over ONE shoulder"*: the garment
 *     reaches lower over the legs, and a slab sits over one shoulder only. It is the one
 *     asymmetric figure in the run, which is what makes it read across most of the orbiting
 *     camera's arc where a cone reads identically from all of it.
 *
 * **Every cut keeps {@link SHOULDER_Y} and the hem's floor**, so a person's standing height is
 * the same in all ten eras and the derived scale against the Dwellings holds era by era rather
 * than only in era one.
 */
export function buildPersonBodyGeometry(cut: CitizenCut): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];

  // Era three's mantle hangs lower over the legs, so less of the leg shows. The legs
  // themselves are the same height in every era — only how much of them is covered moves.
  const legs = new THREE.CylinderGeometry(
    LEG_RADIUS,
    PERSON_SOLE_RADIUS,
    LEG_HEIGHT,
    BODY_RADIAL_SEGMENTS,
    1,
  );
  legs.translate(0, LEG_HEIGHT / 2, 0);
  parts.push(legs);

  if (cut === "wrap") {
    // Two cones meeting at the belt. The pinch is the whole read: era two is the first era
    // whose people wear something CUT rather than something draped.
    const upper = new THREE.CylinderGeometry(
      TUNIC_TOP_RADIUS + 0.015,
      WRAP_WAIST_RADIUS,
      TUNIC_HEIGHT * WRAP_WAIST_FRACTION,
      BODY_RADIAL_SEGMENTS,
      1,
    );
    upper.translate(0, LEG_HEIGHT + TUNIC_HEIGHT * (1 - WRAP_WAIST_FRACTION / 2), 0);
    const lower = new THREE.CylinderGeometry(
      WRAP_WAIST_RADIUS,
      WRAP_HEM_RADIUS,
      TUNIC_HEIGHT * (1 - WRAP_WAIST_FRACTION),
      BODY_RADIAL_SEGMENTS,
      1,
    );
    lower.translate(0, LEG_HEIGHT + (TUNIC_HEIGHT * (1 - WRAP_WAIST_FRACTION)) / 2, 0);
    parts.push(upper, lower);
  } else if (cut === "mantle") {
    // A long garment reaching down over the legs, plus a slab over ONE shoulder. The
    // asymmetry is era three's, and it is the only asymmetric figure in the run.
    const mantle = new THREE.CylinderGeometry(
      TUNIC_TOP_RADIUS,
      MANTLE_HEM_RADIUS,
      TUNIC_HEIGHT + MANTLE_DROP,
      BODY_RADIAL_SEGMENTS,
      1,
    );
    mantle.translate(0, LEG_HEIGHT - MANTLE_DROP + (TUNIC_HEIGHT + MANTLE_DROP) / 2, 0);
    // Wide enough to protrude past the head, which is the whole point: the head is 41.5% of
    // standing height and hides anything inboard of about |x| = 0.24, so a shoulder slab that
    // stopped at the body's own radius would be an asymmetry nobody could see.
    const shoulder = new THREE.BoxGeometry(
      TUNIC_TOP_RADIUS * 1.8,
      MANTLE_SHOULDER_HEIGHT,
      TUNIC_TOP_RADIUS * 1.5,
    );
    shoulder.translate(
      MANTLE_SHOULDER_SIDE * TUNIC_TOP_RADIUS * 0.75,
      SHOULDER_Y - MANTLE_SHOULDER_HEIGHT / 2,
      0,
    );
    parts.push(mantle, shoulder);
  } else {
    const tunic = new THREE.CylinderGeometry(
      TUNIC_TOP_RADIUS,
      TUNIC_BASE_RADIUS,
      TUNIC_HEIGHT,
      BODY_RADIAL_SEGMENTS,
      1,
    );
    tunic.translate(0, LEG_HEIGHT + TUNIC_HEIGHT / 2, 0);
    parts.push(tunic);
  }

  // Arms hang just clear of the garment, angled out a few degrees. At this size they are the
  // cue that turns a cone into a figure, which is why they are worth two cylinders.
  for (const side of [-1, 1]) {
    const arm = new THREE.CylinderGeometry(ARM_RADIUS, ARM_RADIUS * 0.8, ARM_LENGTH, 4, 1);
    arm.rotateZ(side * 0.16);
    arm.translate(side * (TUNIC_TOP_RADIUS + ARM_RADIUS), SHOULDER_Y - ARM_LENGTH / 2, 0);
    parts.push(arm);
  }
  return mergeGeometries(parts);
}

/**
 * One person's head, seated at {@link HEAD_CENTRE_Y}.
 *
 * **The head is the largest part of a person on screen** at the fixed ~49-degree downward tilt
 * — you look down onto the top of it — so squaring it is the cheapest per-era read the figure
 * has, and it is era three's own words: *"Hair and beard oiled and squared off, which is the
 * period's own read for a man of office."*
 *
 * The box is sized so it neither out-masses nor under-masses the icosahedron it replaces: its
 * half-height stays inside `HEAD_RADIUS`, so {@link PERSON_HEIGHT} is still the tallest point
 * of a person in every era and the near-plane and Dwellings-ratio claims hold unchanged.
 */
export function buildPersonHeadGeometry(crown: CitizenCrown): THREE.BufferGeometry {
  const head =
    crown === "squared"
      ? new THREE.BoxGeometry(HEAD_RADIUS * 1.66, HEAD_RADIUS * 1.9, HEAD_RADIUS * 1.55)
      : new THREE.IcosahedronGeometry(HEAD_RADIUS, 0);
  head.translate(0, HEAD_CENTRE_Y, 0);
  return head;
}

/**
 * The era's ONE note on a person — era two's fired-clay bead at the throat, era three's bronze
 * pin at the shoulder — or `null` for an era that puts nothing on a person.
 *
 * A small octahedron: eight faces is the fewest that still reads as a made object rather than
 * as a speck, and at this size the flat shading does the rest. It takes the era's colour on
 * the MATERIAL rather than per instance, because an ornament is the era's and not the
 * person's: nobody in a crowd wears a different bead from their neighbour.
 */
export function buildPersonOrnamentGeometry(
  dress: CitizenDress,
): THREE.BufferGeometry | null {
  const ornament = dress.ornament;
  if (!ornament) {
    return null;
  }
  const bead = new THREE.OctahedronGeometry(ORNAMENT_RADIUS, 0);
  if (ornament.at === "crown") {
    // On the headband, standing PROUD of the crown rather than flush with it — near the axis,
    // so it clears the head's own topmost face, and still inside `PERSON_HEIGHT`. Flush was
    // the first attempt and it read as a fleck; see `citizenDress.test.ts`.
    bead.translate(0, HEAD_CENTRE_Y + HEAD_RADIUS * 0.74, HEAD_RADIUS * 0.3);
  } else {
    // At the shoulder joint, OUTBOARD past the head's own half-width so it clears it —
    // `TUNIC_TOP_RADIUS + ARM_RADIUS` is where the arm is hung, which is the joint.
    bead.translate(
      MANTLE_SHOULDER_SIDE * (TUNIC_TOP_RADIUS + ARM_RADIUS),
      SHOULDER_Y - ORNAMENT_RADIUS * 0.2,
      TUNIC_TOP_RADIUS * 0.3,
    );
  }
  return bead;
}
