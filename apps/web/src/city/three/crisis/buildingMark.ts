import type * as THREE from "three";

import type { Footprint } from "../../worldLayout";

/**
 * **HOW A CRISIS MARKS A BUILDING, AND THE THREE CONTRACTS EVERY CRISIS MARKS ONE THROUGH.**
 *
 * `crises/README.md` calls the constraint behind this *"the single most reshaping constraint in
 * this folder, because eight of the nine crises mark a building"*: **nothing tints a building at
 * runtime**. `faceTones()` exists and no renderer calls it, a building's colour is baked into its
 * GLB by the Gridwork export, and `reviveMaterial` only restores flat shading and the emissive
 * lift. Its ruling is the sentence this whole file is built to make mechanical:
 *
 * > **A crisis marks a building with ADDED GEOMETRY.** A plate, a hood, a boarded opening, a
 * > tilted mass, a standing marker at its corner. Geometry also survives full zoom-out and
 * > satisfies the never-hue-alone rule for free.
 *
 * ## WHY THESE THREE ARE GENUINELY SHARED AND THE ART ON THEM IS NOT
 *
 * A building can be marked in exactly three places, and the three are forced by the renderer
 * rather than chosen by era one:
 *
 *  1. **ABOVE the roofline**, as a billboard in the slot the mastery stars occupy — the only
 *     channel that is above the model and therefore cannot be hidden by whatever else the crisis
 *     added to it ({@link CRISIS_BADGE_SLOT});
 *  2. **ON the model**, as a surface overlay that leaves the silhouette recognisable, because the
 *     building is still standing and still itself ({@link CrisisDamageOverlay});
 *  3. **INSTEAD OF the model**, as a stage swap, because a ruin has no building shape left to
 *     keep ({@link CrisisRuinTemplate}).
 *
 * **What is shared is those three slots and their signatures. What is emphatically not shared is
 * what goes in them.** `crises/README.md` records the ruling under *"Three ruin families"*: eras
 * five, eight and ten get charred posts standing, tilted slabs and bent planes, and panels off the
 * frame with conduit hanging, because *"each says what happened, and a single shared ruin template
 * would lose that"*. So {@link CrisisRuinTemplate} is a function type and never a builder, and
 * `ruinStage.ts`'s own header already says the swap is meant to be this local: *"`ruinedStageModel`
 * is the only thing `PlacedBuilding` calls"*.
 *
 * The same split runs through the badge. The SLOT is shared; the statuses are not. Era one's are
 * `threatened` and `lost`; era four's districts are held by a standing claimant, a seated one or
 * contested; era nine's buildings are clean, compromised or unread. A shared status enum would be
 * era one's two words asked to describe a succession, so `CrisisStatusMarker.tsx` keeps its own
 * `CRISIS_STATUSES` and this file keeps only the geometry of the slot they sit in.
 */

/* -------------------------------------------------------------------------- */
/* 1. The slot above the roofline                                             */
/* -------------------------------------------------------------------------- */

/**
 * **THE BADGE SLOT, which is one slot and holds one thing.**
 *
 * `CrisisStatusMarker.tsx` establishes the rule and the reason: while a crisis is on, a marked
 * building says so above its roofline **in the slot the mastery stars occupy the rest of the
 * time**, replacing them rather than joining them, *"because the slot holds one thing legibly and
 * two things never"*. Mastery is not undone by a crisis and the stars come straight back when it
 * ends.
 *
 * Two properties of the slot are shared and both are load-bearing:
 *
 *  - **the roofline is MEASURED, never assumed.** A node's building is whatever its GLB turned out
 *    to be after the contain-fit, and it changes as the node builds site to construction to built.
 *    `frostStage.ts` records what assuming costs: banded against `MAX_BUILD_HEIGHT`, which is a
 *    ceiling nothing on era one's island comes within 14 units of, two buildings rendered as a
 *    featureless pale cube with a badge over it;
 *  - **the measurement includes whatever the crisis ADDED to the building.** A shielded building's
 *    badge has to ride above its storm roof rather than through it, so the caller measures the
 *    group holding the model AND the addition, not the model.
 */
export const CRISIS_BADGE_SLOT = {
  /** How far above the measured roofline the badge floats, in world units. */
  margin: 2.4,
  /**
   * The roof height used until the model mesh is measurable.
   *
   * `MasteryStars`' own fallback, deliberately, because this slot is the stars' slot: a badge and
   * the stars it replaces must not sit at two different heights on an unmeasured building or the
   * swap would read as a jump.
   */
  fallbackTopY: 6,
} as const;

/**
 * Where a badge sits in its parent's local Y, given a measured world roofline.
 *
 * Pure and exported so the slot can be swept over heights a building could render at rather than
 * only the ones one era happens to ship — the discipline `frostCrustHeight` is exported under, and
 * for the same reason.
 */
export function crisisBadgeLocalY(
  measuredWorldTop: number,
  parentWorldY: number,
  margin: number = CRISIS_BADGE_SLOT.margin,
): number {
  return measuredWorldTop - parentWorldY + margin;
}

/**
 * The world-space roofline of a group, or the fallback when it is not measurable yet.
 *
 * `box` is passed in rather than allocated because this runs on the frame loop: a `Box3` per
 * frame per marked building is garbage the crisis does not need to make.
 */
export function crisisMeasuredRooflineY(
  target: THREE.Object3D | null,
  box: THREE.Box3,
  fallback: number = CRISIS_BADGE_SLOT.fallbackTopY,
): number {
  if (!target) {
    return fallback;
  }
  box.setFromObject(target);
  return Number.isFinite(box.max.y) ? box.max.y : fallback;
}

/* -------------------------------------------------------------------------- */
/* 2. Damage, as an overlay on a building that is still standing              */
/* -------------------------------------------------------------------------- */

/**
 * **ACCUMULATING DAMAGE, AS A SURFACE ADDED TO THE MODEL — never a swap and never a tint.**
 *
 * The signature is the seam, and `frostStage.ts` argues every parameter of it:
 *
 *  - `stage` and `stages` are passed rather than imported, so the file holds no opinion about how
 *    many steps there are and a retune of the crisis's tuning table moves the picture with it;
 *  - `buildingHeight` is the height the building ACTUALLY renders at, measured off the live scene
 *    graph by the caller. It is the parameter that exists because banding against a global cap
 *    buried two of era one's seven buildings;
 *  - the return is nullable, and `null` is the honest answer before the node's GLB has resolved. A
 *    crust with no building to be a fraction of would have to pick a number.
 *
 * **A conforming overlay may not reach half its building.** That is the ceiling rather than any
 * particular ratio: past it, *"a rimed base"* has become *"half a white block"*, which is the ruin
 * it has to stay distinguishable from. {@link CRISIS_OVERLAY_MAX_SHARE} is the number, and
 * `frostCrustSilhouette.browser.test.tsx` already asserts era one's against its rendered buildings.
 */
export type CrisisDamageOverlay = (
  footprint: Footprint,
  stage: number,
  stages: number,
  buildingHeight: number,
) => THREE.Object3D | null;

/**
 * The tallest a damage overlay may stand, as a share of the building it is on.
 *
 * A ceiling, not a target. Era one runs `MAX_SHELL_RATIO` at 0.4 and `frostStage.ts` names 0.45 as
 * the point where its own browser guard fails, so the shared ceiling is set where that guard sits
 * rather than at era one's chosen value: a second crisis may spend more of the building than the
 * frost does and still owe the same silhouette.
 */
export const CRISIS_OVERLAY_MAX_SHARE = 0.5;

/* -------------------------------------------------------------------------- */
/* 3. The ruin, as a stage of the same node                                   */
/* -------------------------------------------------------------------------- */

/**
 * **THE RUIN, AS A TEMPLATE FOR A FOOTPRINT — one function, so a crisis can replace all of it.**
 *
 * D-CRISIS-7 rules that a crisis cannot permanently remove an earned building, so there is no
 * "destroyed" art anywhere in this game: a wrecked building is a RUIN, a stage of the same node at
 * the same cell, and `crises/README.md` says so under *"The failure floor"*. Three properties come
 * with that and every conforming template owes all three:
 *
 *  1. **it occupies real volume**, because on the canvas the click target IS the rendered geometry
 *     and a ruin is still one click from its lesson. An empty group takes the lesson away from the
 *     pointer, which is the one thing crisis damage may not do;
 *  2. **it keeps the wrecked building's footprint**, so the grid cell still fits;
 *  3. **it stays markedly shorter than the scaffold on the same lot**, or a ruin reads as a
 *     building under construction — a state the same lot can genuinely be in.
 *
 * Cached and cloned per lot by the caller, following `constructionStages.ts`. Not nullable, unlike
 * the overlay: a ruined node has a footprint whatever its GLB is doing, and a ruin that declined
 * to draw would be a node with no click target.
 */
export type CrisisRuinTemplate = (footprint: Footprint) => THREE.Object3D;

/**
 * How much of the scaffold's height a ruin on the same lot may reach.
 *
 * Era one's `ruinSeam.test.ts` holds its ruin under 0.6 of that height per footprint, and the
 * number is the shared one because the thing it separates is shared: the scaffold is the
 * construction stage every era's lot passes through, so *"a ruin must not read as a building under
 * construction"* is the same claim in all ten.
 */
export const CRISIS_RUIN_MAX_SCAFFOLD_SHARE = 0.6;
