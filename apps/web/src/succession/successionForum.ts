import * as THREE from "three";

import {
  buildAssemblySupporters,
  buildBasin,
  buildBoundaryRun,
  buildCivicBuilding,
  buildDriftBlock,
  buildFigure,
  buildForumFloor,
  buildHull,
  buildPlinth,
  buildQuay,
  buildShearLegs,
  buildTreadwheelCrane,
  buildTree,
  DRIFT_BLOCK_CLEARANCE,
  QUAY_DECK_TOP,
  QUAY_DEEP,
  DRIFT_BLOCK_SPAN,
  ghostSuccession,
  PLINTH_BASE_SPAN,
  PLINTH_HEIGHT,
  type SuccessionMark,
  seatSpentCounter,
} from "../city/three/successionScene";
import {
  SUCCESSION_FORUM,
  type SuccessionForum,
  type SuccessionStand,
  successionStands,
} from "./successionStands";
import type { SuccessionBoardView, SuccessionDistrictView } from "./successionView";
import { successionClaimant } from "./successionView";

/**
 * **THE FORUM, COMPOSED: one board's worth of furniture, as a scene graph.**
 *
 * `successionScene.ts` knows how to build a plinth, a figure, a block and a shuttered building.
 * `successionStands.ts` knows where each district's furniture goes. This is the only module that
 * holds both, and it is deliberately a plain `three` module with no React in it — which is what
 * lets `successionForum.test.ts` build a whole board and read every mesh out of it without a
 * canvas, a renderer or a browser.
 *
 * ## WHAT IT MAY DO AND WHAT IT MAY NOT
 *
 * It reads a district's state and puts an object somewhere. It **decides nothing**: it names none
 * of the engine's decision functions, so `test/successionSurfaceIsOneWay.test.ts` puts it in the
 * DRAWING population and requires it to stay disjoint from the deciding one. A district's
 * allegiance arrives here already settled by the reducer, and where its plinth stands arrives
 * already settled by the drift order.
 *
 * The arrow it must never reverse is the one that would be easiest to reverse here, because this
 * is the only place both halves are in scope at once: nothing below branches on a place. Every
 * `if` is on a district's own state, and the stand is only ever written to a transform.
 *
 * ## AND THE STATES ARE FIVE DIFFERENT PICTURES
 *
 * Bare, warned, drifted, claimed and contested have to be tellable apart at the shipped camera,
 * which is what `successionForum.test.ts`'s census measures: two states that reached the renderer
 * as the same instruction would be two states a player cannot distinguish, and the guard counts
 * distinct fingerprints rather than spot-checking each one.
 */

/**
 * **HOW FAR THE DRAWN PAVING REACHES, and it came in from 30.**
 *
 * It has to be comfortably past the arc so the forum has a floor, and at 30 over an arc that
 * reached 21 it was comfortably past everything: two thirds of the disc carried nothing at all,
 * which is what the play-test frame shows and what the lead called *"all cramped into this
 * little batch"* — the batch was not especially small, the car park round it was enormous.
 *
 * 25 clears the outermost civic building's far corner by about two units, which is a rim rather
 * than a field. What actually fills the disc is the arrangement, not the shrinking; see
 * {@link buildForumFurniture} for the port, the basin and the planting that hold its open side.
 */
export const FLOOR_ACROSS = 25;

/**
 * **WHERE THE SHUT PORT IS, and it has come round to the disc's open side.**
 *
 * It was a straight quay across the back at `z: -25`, which was directly behind the arc — so on
 * a board whose whole atmosphere is *a port that has stopped working*, the port was a smudge
 * between two roofs. §2.4 calls the cleared quay *"the largest single atmosphere change
 * available at almost no cost"*, and it was costing its whole budget on something nobody could
 * see.
 *
 * The disc is an island, so every point of its rim is shoreline and a quay may stand on any of
 * them. The arc of districts now wraps 139 degrees of the back and sides, which leaves the front
 * open: the port takes the front-left of that, where it is in clear view at the shipped camera,
 * and the ships stand off past it on water the player can actually see.
 */
/**
 * **AND IT IS AT THE BACK, WHICH TOOK THREE FRAMES TO ARRIVE AT.**
 *
 * At 1024x580 the crisis panel leaves a canvas very nearly square, so the HORIZONTAL axis binds
 * the fit and the disc's left and right extremes sit hard against the frame's edge: a port at
 * either side is a port with half its quay cut off, which is what the first two attempts came
 * back with. The slack is vertical. The FRONT has slack and is unusable for a different reason
 * — it is the nearest ground to a camera at 49 degrees, so everything there is foreshortened
 * into a strip and the ships beyond it fall off the bottom.
 *
 * So the back, which is also where the brief always wanted it: *"the shut port behind the
 * city"*. What has changed is that it is now AT the shoreline instead of five units inside it,
 * and that the arc has come in far enough to leave it a clear frontage rather than standing in
 * front of it — see {@link SUCCESSION_FORUM}'s `setback`.
 */
export const PORT_BEARING = 0;

/** How far the quay runs along the water line. Read by anything set down on it. */
export const QUAY_ALONG = 13;

/**
 * How far out the quay stands, and it is **hard against the shoreline** rather than a
 * comfortable distance inside it.
 *
 * A quay is a working edge, and the whole of what makes it read as one is the water immediately
 * beyond it. Set a few units in from the rim it is a raised pale rectangle on pale paving, and
 * that is exactly what a frame came back with: a plank laid across the floor. So it is derived
 * rather than chosen — far enough out that the deck's outer CORNERS land on the rim, which is
 * what binds, because the deck is a straight chord and the shore is a curve.
 */
export const PORT_REACH =
  Math.sqrt(FLOOR_ACROSS ** 2 - (QUAY_ALONG / 2) ** 2) - QUAY_DEEP / 2;

/**
 * **HOW HIGH THE HARBOUR'S SURFACE IS, AND IT LIVES HERE BECAUSE THINGS FLOAT ON IT.**
 *
 * It was a literal in `SuccessionIsland.tsx`, on the sea's own mesh, where nothing that sits on
 * the water could read it — and the hulls are placed here. Two numbers in two files with no
 * relationship between them is how three ships came to hang most of a unit above their own
 * harbour: `buildHull` draws a keel 0.62 below its group's origin, the group was set at -0.2,
 * and the water was at -1.4. Every one of those figures is defensible on its own.
 *
 * So the water's height is a fact about the forum rather than about the mesh that draws it, and
 * anything afloat is seated against **this** rather than against a guess.
 * `successionNothingFloats.test.ts` measures the result.
 */
export const SEA_LEVEL = -1.4;

/**
 * How far the drawn harbour reaches, as a radius from the middle of the forum — the same
 * "across means radius" this module already uses for {@link FLOOR_ACROSS}.
 *
 * Exported for the same reason as {@link SEA_LEVEL}: a hull standing off past the edge of the
 * sheet of water it is standing off ON is drawn against the empty sky, which is the same defect
 * as floating and reads identically. The furthest hull was at z -41 over water that stopped at
 * -39. The anchorage below is set inside this, and the guard checks it.
 *
 * **AND ITS EDGE IS THE HORIZON, WHICH HAS TO BE IN SHOT.** This is the one place where making
 * the sheet bigger made the picture worse, and a frame is what said so. The camera looks down at
 * 49 degrees and its widest ray still points about 20 degrees below level, so it never reaches a
 * true horizon: at 2.6 of the paving the water simply filled the entire background, edge to edge,
 * with no sky anywhere and no line between them. Three ships correctly afloat on that read as
 * three masts hanging in a flat blue void — **the same picture as the defect they had just been
 * fixed out of**, arriving with the geometry entirely correct.
 *
 * 1.5 puts the sheet's far edge above the anchorage and comfortably below the top of the frame,
 * so there is a band of pale sky over a band of slate water and a ship is unmistakably on one of
 * them. It was 1.8 for one frame, which put the horizon at the very top edge and left the ships
 * with almost no water above them: enough to be correct, not enough to be read.
 */
export const SEA_ACROSS = FLOOR_ACROSS * 1.5;

/**
 * **WHERE THE CRISIS IS WATCHED FROM, and it is here rather than on the `<Canvas>`.**
 *
 * The camera decides what a player actually sees of everything below, so *"is the forum in
 * frame"* is a question about this object and the layout together — and it was unanswerable
 * while the numbers sat as JSX props inside a component no headless test can mount. A
 * `<Canvas>` needs a browser; a projection matrix does not.
 *
 * `polar` is the LOCKED tilt `OrbitControls` clamps to, and it is what a guard has to apply
 * before projecting anything: the mount's `position` is not where the camera ends up. Reading
 * `[0, 17, 22]` about `[0, 0, -8]` literally gives 46 degrees of elevation, and the clamp puts
 * the shipped camera at 49 — so a frame computed off the prop alone is a frame of a camera the
 * game does not ship. `forumFraming.test.ts` does the clamp and measures the result.
 *
 * ## AND THE FITTING LIVES IN `city/three/forumFraming.ts`, WHICH IS THE GUARD'S DOING
 *
 * `test/successionPropagation.test.ts` holds era four's separation with two derivations that
 * have to agree: every source naming an allegiance, and every source whose basename says
 * succession. A file in either set may not name a spatial relation in its code, because a
 * module that both decides an allegiance and knows a position is the one thing this model
 * forbids — and the shared projection helpers take a `radius` and a `distance` by those names.
 *
 * A framing module has no district in it and could not name an allegiance honestly, so putting
 * it under this crisis's prefix would drag it into the by-name half of a population it does not
 * belong to and then force a fabricated sentence into it to keep the two halves equal. Named
 * for what it frames, it is in neither derivation and owes neither property. That is the guard
 * placing the file rather than the file dodging the guard — and it was measured the awkward way
 * round: the first draft explained all this in ITS docblock, wrote the word "allegiance" doing
 * so, and put itself in the population.
 */
export const SUCCESSION_CAMERA = {
  /**
   * The mount's own position. `OrbitControls` keeps its RADIUS and overrides its tilt, so what
   * this states is a DISTANCE — 1.95 of the drawn paving's own radius, which leaves the player's
   * wheel room to come in to 0.4 and out to 2.4 of it either side of where they start.
   */
  position: [0, 44, 38.6] as const,
  /**
   * **THE MIDDLE OF THE FORUM, AND IT USED TO BE EIGHT UNITS BEHIND IT.**
   *
   * The offset was right when every district sat in one arc across the back: aiming at the
   * composition rather than at the disc put the buildings in the middle of the frame. It is
   * wrong now the arc wraps round the sides and the port, the basin and the planting hold the
   * front — the composition is a ring about the origin, so the disc's own centre IS the subject.
   *
   * It also has to be the origin for `forumFraming.ts` to work at all: `groundRingOnScreen`
   * measures a ring **centred on the camera's target**, and the paving is centred on the origin.
   */
  target: [0, 0, 0] as const,
  fov: 40,
  /** `VILLAGE_CAMERA.polarAngle`, locked at both ends. The whole reason a cut groove reads. */
  polar: 0.72,
  /** How close and how far the player's own wheel may take it, against {@link FLOOR_ACROSS}. */
  nearRatio: 0.4,
  farRatio: 2.4,
} as const;

/** The name every district's group takes, so a pick and a guard can both find one by id. */
export function districtGroupName(districtId: string): string {
  return `succession-district-${districtId}`;
}

/** The furniture the forum carries whatever the board is doing — floor, port, basin, planting. */
export const FORUM_FURNITURE_NAME = "succession-furniture";

/**
 * The quay, its kerb, its bollards and the machine standing on it, as one arrangement.
 *
 * A quay is a working EDGE — water on one side, city on the other — so its pieces share a spot
 * and a facing and are turned together. Placed piece by piece is how the crane came to stand two
 * and a half units off the front of its own deck at the deck's own height.
 */
export const PORT_NAME = "succession-port";

/**
 * **ONE DISTRICT'S FURNITURE.**
 *
 * The order the states are read in is the order they are ruled in, and two of them are
 * INDEPENDENT: a district's allegiance decides what stands on the plinth, and its civic
 * building's claim decides what the building wears. A district taken by drift is held and
 * contested at once — which is the ordinary outcome of a drift — so nothing here is an `else` on
 * the other.
 */
export function buildDistrict(
  district: SuccessionDistrictView,
  stand: SuccessionStand,
): THREE.Group {
  const group = new THREE.Group();
  group.name = districtGroupName(district.id);
  // The id, and never a place. This is how a pick names a district: the node carries the name it
  // was built for, so a click hands back an id that came from the engine.
  group.userData.districtId = district.id;

  const plinth = buildPlinth();
  plinth.position.set(stand.plinth.x, 0, stand.plinth.z);
  plinth.rotation.y = stand.plinth.turn;
  /*
   * **A DISTRICT THE PLAYER BOUGHT CARRIES WHAT IT COST, SEATED IN THE PLINTH'S BASE COURSE.**
   *
   * `decided_by` is the engine's own record of which of the two ways a district went: `"drift"` is
   * the board deciding it and `"player"` is a sway paid for out of the bank. So a counter in the
   * base course is *the same disc, moved* — the asset-5 grammar applied to the economy, and the one
   * statement about a spend that only the scene can make. The bank itself is counted in the web lane
   * beside the card prices it exists to be compared against.
   *
   * It is not conditional on the figure, deliberately: what the counter records is that this
   * district was PAID for, which stays true for the rest of the crisis.
   */
  if (district.decided_by === "player") {
    seatSpentCounter(plinth);
  }
  group.add(plinth);

  if (district.figure !== "none") {
    const claimant = successionClaimant(district.figure);
    const figure = buildFigure(claimant.pose);
    figure.position.set(stand.plinth.x, PLINTH_HEIGHT, stand.plinth.z);
    figure.rotation.y = stand.plinth.turn;
    group.add(figure);

    /*
     * THE CIVIC BODY OF THE CLAIM. Three supporters gather on the inward side of every
     * decided plinth, where the camera can read them against open paving rather than against
     * the civic roof. Their standard repeats the statue's cut mark in a larger silhouette.
     */
    const out = Math.hypot(stand.plinth.x, stand.plinth.z) || 1;
    const supporters = buildAssemblySupporters(claimant.mark);
    supporters.position.set(
      stand.plinth.x - (stand.plinth.x / out) * 2.75,
      0,
      stand.plinth.z - (stand.plinth.z / out) * 2.75,
    );
    group.add(supporters);
  } else if (district.proposed_figure !== null) {
    // THE PROPOSAL: the stone object itself, rendered thinner, standing in its exact committed
    // place. Only over a plinth that is still bare — a proposal on a raised figure would be a
    // spend the engine has already refused.
    const ghost = ghostSuccession(
      buildFigure(successionClaimant(district.proposed_figure).pose),
    );
    ghost.position.set(stand.plinth.x, PLINTH_HEIGHT, stand.plinth.z);
    ghost.rotation.y = stand.plinth.turn;
    group.add(ghost);
  }

  if (district.block !== null) {
    /*
     * **THE WARNING**: shear-legs straddling the plinth with the sling hanging SLACK, and the
     * block on the ground at its foot cut with the mark of the claimant it would go to.
     * Somebody is about to raise a statue here, and the mark says WHOSE — which is what makes
     * the drift a warning rather than a surprise.
     *
     * The block is set out beside the plinth rather than tucked against it, so it is not
     * swallowed by the plinth's own footprint at the shipped camera.
     */
    const legs = buildShearLegs("slack");
    legs.position.set(stand.plinth.x, 0, stand.plinth.z);
    legs.rotation.y = stand.plinth.turn;
    group.add(legs);

    /*
     * At the plinth's FOOT, on the side the plinth faces — which is the middle of the forum,
     * and so the side the camera is on. Set out along that line rather than along the plinth's
     * own rotation, because the two are not the same direction and the first attempt put the
     * block behind the stonework at the shipped camera.
     *
     * The distance is DERIVED from the two objects and the ruled clearance between them rather
     * than carried here as a number: half the plinth's foot, half the block, and
     * `DRIFT_BLOCK_CLEARANCE` of open paving between the two edges. It used to be a flat 2.1,
     * which left 0.35 — enough for the block's shadow to land on the plinth's own stonework,
     * where it cannot separate the block from a boundary stone. See `DRIFT_BLOCK_CLEARANCE`.
     */
    const out = Math.hypot(stand.plinth.x, stand.plinth.z) || 1;
    const setOut = PLINTH_BASE_SPAN / 2 + DRIFT_BLOCK_SPAN / 2 + DRIFT_BLOCK_CLEARANCE;
    const block = buildDriftBlock(district.block.mark);
    block.position.set(
      stand.plinth.x - (stand.plinth.x / out) * setOut,
      0,
      stand.plinth.z - (stand.plinth.z / out) * setOut,
    );
    block.rotation.y = stand.plinth.turn;
    group.add(block);
  }
  /*
   * **AND THERE IS NO THIRD STATE HERE, which is a correction the first frames forced.**
   *
   * A district that has decided carries its FIGURE and nothing else: the shear-legs come down
   * and the block is gone, because the block BECAME the figure — *"same object, moved"*. The
   * first pass drew a hoisted block as well, which put two objects on one plinth for a lift
   * that had already finished, and photographed at 1024x580 the drifted board came back as
   * timber lying over stonework rather than as a statue standing on it.
   *
   * A block hanging in a sling is §2.7's EXIT beat — *"the crane finishing its lift, in one cut,
   * at the resolution panel"* — rather than a board state. The block that hangs on this island
   * is the port crane's, which is also where §2.6 puts era four's one moving object.
   */

  /*
   * **THE BUILDING, ONCE, WITH ANY PLANNED SPEND DRAWN ON IT.**
   *
   * A planned `secure` or `cancel` used to be a SECOND civic mass — the building it would
   * become, ghosted, laid 0.02 over the real one. That could not say what a cancel does. A
   * cancel's result is a subtraction, so the ghost's content was an `unclaimed` building, which
   * is a mass with nothing on it, laid over a contested building whose shutters and corner
   * marker were still standing solid underneath. The player saw a doubled mass and no
   * subtraction.
   *
   * The proposal is now drawn on the building itself, in the two directions of the one grammar:
   * what goes turns see-through where it stands, and what arrives is ghosted into its committed
   * seat. See `buildCivicBuilding`'s `propose` and `fadeSuccession`.
   */
  const civic = buildCivicBuilding({
    claim: district.claim,
    mark: district.mark,
    // Six production districts share one forum. Three repeated bays keep each complete civic
    // mass inside its own boundary run; the old five-bay mass exceeded that enclosure.
    bays: 3,
    propose: district.proposed_claim,
    // WHOSE the plan would leave it, which is not always whose it is now: a `secure` is aimed at
    // the strongest claimant. Handed in so the scene can tell a re-cut of the mark from a
    // removal of the boards, which are two different pictures.
    proposeMark:
      district.proposed_holder === null
        ? null
        : successionClaimant(district.proposed_holder).mark,
  });
  civic.position.set(stand.civic.x, 0, stand.civic.z);
  civic.rotation.y = stand.civic.turn;
  group.add(civic);

  // THE BOUNDARY RUN. Separate stones enclosing this district's ground and joining nothing, each
  // carrying the holder's mark — or none at all where the district is unclaimed, because a bare
  // top face is a positive state and a mark whose whole content is *whose* has nothing to say
  // about a district nobody has claimed.
  group.add(buildBoundaryRun(stand.bounds, district.mark as SuccessionMark | null));

  return group;
}

/** A spot on the paving, out along a bearing from the middle of the forum. */
function outOnBearing(
  turn: number,
  out: number,
): { readonly x: number; readonly z: number } {
  return { x: Math.sin(turn) * out, z: -Math.cos(turn) * out };
}

/**
 * **HOW FAR OUT THE HARBOUR'S SURFACE FIRST COMES INTO VIEW PAST THE ISLAND'S OWN RIM.**
 *
 * The island stands two units proud of the water and the camera looks down at 49 degrees, so
 * the disc's far coping hides a **band of sea behind it** — and a ship anchored inside that band
 * has its hull and its waterline occluded while its mast still clears the roofs. What reaches
 * the frame is a bare mast and a yard against flat blue with nothing under them, which is the
 * floating-objects defect exactly, arriving a second time by a different route: the first three
 * hulls really were in the air, and these were correctly afloat on water nobody could see.
 *
 * Measured rather than nudged. Take the sightline from the shipped camera over the top of the
 * kerb at the disc's rim and find where it meets the water; everything nearer than that is
 * hidden. On the shipped numbers it is about 28.3, which is why an anchorage at 27.4 came back
 * looking exactly like the bug that was just fixed.
 */
export function harbourVisibleFrom(): number {
  const [px, py, pz] = SUCCESSION_CAMERA.position;
  const [tx, ty, tz] = SUCCESSION_CAMERA.target;
  const reach = Math.hypot(px - tx, py - ty, pz - tz);
  const eyeY = ty + reach * Math.cos(SUCCESSION_CAMERA.polar);
  const eyeOut = reach * Math.sin(SUCCESSION_CAMERA.polar);
  /** The top of the disc's coping, which is what the sightline grazes. */
  const coping = 0.65;
  const along = (eyeY - SEA_LEVEL) / (eyeY - coping);
  return along * (FLOOR_ACROSS + eyeOut) - eyeOut;
}

/**
 * Where the trees stand: a colonnade of them round the forum's open side.
 *
 * Era four's style guide is unusually specific about planting and it is the one instruction the
 * old scatter ignored: *"Vegetation. Deliberate and formal. Trees in rows — a colonnade of them
 * along the main street … the surveyed line is carried into the planting and should read as the
 * same decision."* Six trees in two blobs at the disc's left and right edges is not a line and
 * did not read as one.
 *
 * So they are set out on the same instrument the districts are: evenly along an arc, at one
 * radius, from the end of the buildings round to the port. Derived rather than listed, so the
 * planting follows the arc if the arc moves — and so the row is provably even rather than
 * eyeballed.
 */
function plantingBearings(): readonly { readonly turn: number; readonly out: number }[] {
  const from = SUCCESSION_FORUM.bearing + SUCCESSION_FORUM.sweep + 0.36;
  const to = 2 * Math.PI + SUCCESSION_FORUM.bearing - 0.36;
  /** The frontage the arc of buildings stands on, which is the line the planting continues. */
  const frontage = SUCCESSION_FORUM.reach + SUCCESSION_FORUM.setback;
  // Where the port's frontage is, so the row breaks round it rather than planting a tree on the
  // quay. Read off the port's own bearing, so moving the port moves the gap.
  const quay = 2 * Math.PI + PORT_BEARING;
  const clear = 0.44;

  const line = (many: number, out: number, shift: number) =>
    Array.from({ length: many }, (_, index) => ({
      turn: from + ((to - from) * (index + shift)) / (many - 1 + 2 * shift),
      out,
    }));
  return [
    ...line(8, frontage, 0),
    ...line(7, (frontage + FLOOR_ACROSS) / 2 + 1.1, 0.5),
  ].filter((spot) => Math.abs(spot.turn - quay) > clear);
}

/** The port, basin and planting. Settlement completes the one stopped machine. */
export function buildForumFurniture(settled = false): THREE.Group {
  const group = new THREE.Group();
  group.name = FORUM_FURNITURE_NAME;

  // The paving, cut deep enough that the island's underside is under the harbour rather than
  // hanging a third of a unit over it.
  group.add(buildForumFloor(FLOOR_ACROSS, -SEA_LEVEL + 0.7));

  /*
   * **M6: THE PORT HAS SHUT, AND IT IS SOMEWHERE A PLAYER CAN SEE IT.**
   *
   * The quay is bare, the hulls stand off at anchor, and the crane is stopped mid-lift with its
   * load still in the air — the wide master's own picture of a working port that has stopped
   * working. See {@link PORT_BEARING} for why it has come round from the back of the arc to the
   * disc's open side.
   *
   * The whole port is laid out on ONE spot and one facing: a quay is a working edge with the
   * water on one side, so its deck, its kerb, its bollards and the machine standing on it are a
   * single arrangement and are rotated together. Placed piece by piece is how the crane came to
   * be two and a half units off the front of its own deck.
   */
  const port = new THREE.Group();
  port.name = PORT_NAME;
  const portAt = outOnBearing(PORT_BEARING, PORT_REACH);
  // Turned so the deck runs along the shore and its kerb faces the water. A box's local +x maps
  // to the tangent under a rotation of `-turn`, and the half turn puts the lip and the bollards
  // on the seaward side rather than the city side.
  port.rotation.y = -PORT_BEARING + Math.PI;
  port.position.set(portAt.x, 0, portAt.z);

  port.add(buildQuay(QUAY_ALONG));
  /*
   * **THE CRANE STANDS ON THE DECK, and it used to stand on nothing.**
   *
   * It was seated at `y: 0.5` — the deck's own top face, {@link QUAY_DECK_TOP} — at
   * `QUAY_Z + 4.2`, which was two and a half units in FRONT of a deck {@link QUAY_DEEP} deep. So
   * it carried the deck's height while standing on open paving, and the whole machine floated
   * half a unit clear of the ground with its own shadow detached from it.
   *
   * Both halves are read off the quay now rather than written here, so the crane cannot be
   * raised for a surface it is not on: it is set down along the deck, at the deck's own height,
   * and the jib overhangs the water because that is the side a lift comes from.
   */
  const crane = buildTreadwheelCrane(settled);
  // Dead centre on the quay, which is the one part of the frontage the arc leaves a clear line
  // to: the districts are evenly spaced about the port's own bearing, so the widest gap between
  // two civic buildings is exactly here. Off to one side, the machine is a mast behind a roof.
  crane.position.set(0, QUAY_DECK_TOP, 0);
  // Facing the water, so the jib and the block hanging under it overhang the harbour. A crane
  // stopped mid-lift with its load out over the sea is the picture; the same machine turned
  // inland is a load hanging over the paving, which says a delivery rather than a stoppage.
  port.add(crane);
  group.add(port);

  /*
   * **THE HULLS SIT IN THE WATER, and the waterline is {@link SEA_LEVEL} rather than a guess.**
   *
   * They were seated at `y: -0.2` over a harbour drawn at -1.4, which stood every one of them
   * most of a unit clear of the sea — three masts with bare yards hanging at the horizon, which
   * is what the play-test frame came back with. The furthest was also at z -41 over water that
   * stops at {@link SEA_ACROSS}, so it was drawn against open sky with nothing under it at all.
   *
   * `buildHull` draws its keel {@link HULL_DRAUGHT} below its own origin, so the origin IS the
   * waterline and seating one is one constant rather than an offset somebody has to get right.
   * They ride off the port's own frontage now, close enough in that a ship reads as a ship.
   */
  const anchorage = harbourVisibleFrom();
  for (const [swing, out, heading] of [
    [-0.4, 1.4, 1.35],
    [-0.03, 5.4, 1.05],
    [0.36, 3.0, 0.75],
  ] as const) {
    const along = PORT_BEARING + swing;
    const spot = outOnBearing(along, anchorage + out);
    const hull = buildHull();
    hull.position.set(spot.x, SEA_LEVEL, spot.z);
    // Each lying at its own heading. Ships at anchor swing on their cables and never line up,
    // and three hulls on one bearing would read as a formation rather than as a stopped port.
    hull.rotation.y = -along + heading;
    group.add(hull);
  }

  /*
   * M6 again, and the half worth keeping: the public basin still runs. It stands in the OPEN
   * SQUARE the arc encloses, which is where a town's public basin goes and is the one place on
   * this island a counter-example to a stopped city is unmissable — era four's own §"the basin
   * is waist-high and the trees are the only vertical thing" is a description of exactly this
   * square. Off the middle so it does not sit dead centre, and forward of the plinths so it
   * never stands between the player and a district.
   */
  const basin = buildBasin(6.6);
  basin.position.set(0, 0, 5.2);
  group.add(basin);

  // M7: the era's own limbed-up trees, untouched — a political dispute does not change what
  // grows, so they are here for the era rather than for the crisis. See `plantingBearings` for
  // why they are a row and not a scatter.
  /*
   * **AN AVENUE, WHICH IS TWO ROWS, and the inner one stands on the buildings' own frontage.**
   *
   * The guide asks for *"an avenue at one spacing"* and says why in the next clause: the row is
   * *"the paving's module carried into the planting, and should read as the same decision"*. One
   * row on the frontage line continues the arc of buildings round the open side and closes the
   * ring; a second, staggered, half a module out fills the band of paving between that line and
   * the rim, which one row leaves as a blank margin whichever radius it stands on.
   */
  for (const { turn, out } of plantingBearings()) {
    const spot = outOnBearing(turn, out);
    const tree = buildTree();
    tree.position.set(spot.x, 0, spot.z);
    // A turn off the row's own facing, so fifteen trees are not fifteen copies of one
    // silhouette. It changes which facet the key catches and nothing else.
    tree.rotation.y = turn * 1.7 + out;
    group.add(tree);
  }

  return group;
}

/** The whole forum for one board, rebuilt whenever the board changes. */
export function buildForum(
  view: SuccessionBoardView,
  forum: SuccessionForum = SUCCESSION_FORUM,
): THREE.Group {
  const scene = new THREE.Group();
  scene.name = "succession-forum";
  scene.add(buildForumFurniture(view.settled));

  const stands = successionStands(
    view.districts.map((district) => district.id),
    forum,
  );
  for (const [index, district] of view.districts.entries()) {
    const stand = stands[index];
    if (!stand) {
      continue;
    }
    scene.add(buildDistrict(district, stand));
  }
  return scene;
}
