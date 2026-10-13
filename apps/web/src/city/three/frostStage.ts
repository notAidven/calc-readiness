import * as THREE from "three";

import { type Footprint, GRID_CELL } from "../worldLayout";
import { WINTER_GROUND_TONES } from "./winterTones";

/**
 * **FROST ON A BUILDING. A DAMAGED BUILDING IS NOT A DIFFERENT BUILDING.**
 *
 * The third building appearance beside the construction stages and the ruin
 * (`engines/game/src/hard-winter.ts`'s `winterDamageStage`), and it deliberately does NOT go
 * through `ruinStage.ts`'s seam even though it is the nearest neighbour.
 *
 * ## Why this is an overlay and the ruin is a swap
 *
 * A ruin is a different SILHOUETTE: the building came down, and `ruinStage.ts` answers that by
 * replacing the model, which is right because there is no building shape left to keep. Damage
 * is the opposite claim, since the building is still standing, still itself, and still
 * recognisable as which building it is, so replacing its geometry would say the wrong thing
 * however carefully it was modelled. It is the SURFACE that changed, so this adds a surface and
 * leaves the model stack alone.
 *
 * That also means going into damage and being mended out of it needs no cross-fade: nothing is
 * being substituted, so there is nothing to fade between. `PlacedModelStack` is untouched.
 *
 * ## THIS COSTS NO ART, AND THAT IS THE POINT
 *
 * Frost already renders on this island. `WinterGround.tsx` paints the ground in
 * `WINTER_GROUND_TONES`, and this reads the same two tones out of the same table. So a damaged
 * building is the picture the player has already learnt (the frost is winning here), one scale
 * up from the ground onto the thing standing on it. **Nothing on this lands on Evan.** If the
 * real treatment should instead be an authored per-node frost variant, the swap is local:
 * {@link frostShellModel} is the only thing `PlacedBuilding` calls.
 *
 * ## CONSTRAINTS THAT BIND WHATEVER GOES IN HERE
 *
 * 1. **It must read at the fixed camera and at full zoom-out**, by geometry and tone step and
 *    never by lighting: `flatShading`, a flat colour, no emissive and no added light, exactly
 *    as every other stage template here does.
 * 2. **Mastery gold `#FFB703` is reserved** and may never appear on it. Both tones come from
 *    `WINTER_GROUND_TONES`, which `winterGround.test.ts` already sweeps for it.
 * 3. **It must not out-grow the building it is on.** The shell rises with the damage stage but
 *    is capped at {@link MAX_SHELL_RATIO} of the height THAT BUILDING actually renders at, so
 *    the worst damaged building is a rimed base and never a white block: a shell that swallowed
 *    the silhouette would read as a ruin, which is the one state it has to be distinguishable
 *    from.
 * 4. **It must not take the pointer.** A damaged building is one click from its lesson, and the
 *    click target is the rendered geometry under the named group, so this hangs INSIDE that
 *    group and adds volume rather than covering it.
 *
 * ## CONSTRAINT 3 WAS BANDED AGAINST A CAP NOTHING REACHES, AND IT BURIED TWO BUILDINGS
 *
 * Until 2026-08-01 the crust was `MAX_BUILD_HEIGHT * MAX_SHELL_RATIO * (step / stages)` with the
 * ratio at 0.16, which is `24 * 0.16` and so **2.56u at stage two and 3.84u at stage three**,
 * the same figures for every building on the island. `MAX_BUILD_HEIGHT` is a CEILING on how tall
 * a model may render and not the height of anything: measured off the shipped GLBs through
 * `footprintFitScale`, era one's seven placements render at 1.828u (the Workshop, on its 1x1),
 * 2.149u (the Store), 2.608u (the Dwellings, which is the figure `worldLayout.ts` records),
 * 3.096u (the hall), 3.774u (the Commons), 4.821u (the Assembly Hall) and 9.769u (the Tower).
 * Nothing comes within 14u of the cap.
 *
 * So the stage-two crust was **140% of the Workshop and 119% of the Store**, and both of era
 * one's two shortest buildings rendered as a featureless pale cube with a badge over it. That is
 * constraint 3 broken by the file's own arithmetic, not a matter of taste, and
 * `winterFraming.ts`'s `WINTER_ROOFLINE_ALLOWANCE` records the identical substitution being
 * caught in the camera fit: *"`MAX_BUILD_HEIGHT` is a cap rather than a height and is not
 * binding for any era-one building, so it is the wrong number to fit against"*.
 *
 * The fix is the whole of this file's public change: the caller measures the building it is
 * putting a crust on and passes the height in, so a 1.8u Workshop wears a 1.8u building's crust.
 * `BuildingFrostCrust.tsx` is that measurement, live and per frame, for the reason
 * `BuildingShield.tsx` gives for the storm roof: a node's building is whatever its GLB turned
 * out to be after the contain-fit, and it changes as the node builds site to construction to
 * built.
 */

/**
 * How tall the shell may get at the worst stage, as a fraction of THE BUILDING'S OWN height.
 *
 * **0.4, AND IT IS CHOSEN SO THE ONE BUILDING THIS WAS EVER JUDGED ON DOES NOT MOVE.** The frame
 * set that approved the crust put it on the Tower at 9.769u (`winterProtectionStates.browser
 * .test.tsx` says why: on a short building there was no silhouette left to compare). At the old
 * `MAX_BUILD_HEIGHT * 0.16` the crest of that crust stood 2.79u up the Tower at stage two; at
 * 0.4 of the Tower's own height it stands 2.84u, which is 1.8% different and inside the
 * lip's own thickness. So the appearance nobody objected to is preserved and the whole of the
 * change lands on the short buildings, where the cap was wrong.
 *
 * The ceiling on it is the ruling in constraint 3 rather than this number: a crust may never
 * reach half of its building, or "a rimed base" has become "half a white block".
 * `frostCrustSilhouette.browser.test.tsx` asserts that against the buildings as rendered, so
 * raising this past about 0.45 fails there and brings a reader back here.
 */
export const MAX_SHELL_RATIO = 0.4;

/** How far the shell stands proud of the footprint, so it reads as a crust and not a wall. */
const SHELL_INSET = 0.86;

/**
 * The leading edge's thickness, as a fraction of the crust it edges.
 *
 * NO FLOOR IN WORLD UNITS, and that is deliberate: this carried `Math.max(height * 0.18, 0.06)`
 * while the crust was banded against the global cap, where a stage-one crust was 1.28u on every
 * building and the floor could never bind. A crust banded against its own building cannot get
 * short unless the building is short, and a constant that survives a short building is exactly
 * the substitution the header is about.
 */
const LIP_SHARE = 0.18;

/**
 * How finely a measured building height is rounded before it keys the template cache.
 *
 * The caller measures a live scene graph, so it hands over a continuous number, and a cache
 * keyed on one would grow a template per frame. A 32nd of a world unit is under a tenth of a
 * pixel at the shipped camera and it makes the key set as small as the set of buildings.
 */
const HEIGHT_QUANTUM = 32;

/** The height bucket that owns one cached frost shell; one quantum is 1/32 world unit. */
export function quantizeBuildingHeight(buildingHeight: number): number {
  return Math.round(buildingHeight * HEIGHT_QUANTUM) / HEIGHT_QUANTUM;
}

/** The whole crust group, named so a guard can measure it against the building under it. */
export const FROST_SHELL_NAME = "frost-shell";
/** The slab hugging the base. */
export const FROST_CRUST_NAME = "frost-crust";
/** Its leading edge, one tone step colder. */
export const FROST_LIP_NAME = "frost-crust-lip";

function frostMaterial(color: number): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.6,
    metalness: 0.02,
    flatShading: true,
  });
}

const shellTemplates = new Map<string, THREE.Object3D>();

/**
 * How far the crust climbs a building of `buildingHeight`, at `stage` of `stages`.
 *
 * The slab's own height, so the group's crest is this plus half the lip that sits on it. Pure
 * and exported so the banding can be swept over every height a building could render at rather
 * than only over the ones era one happens to ship.
 */
export function frostCrustHeight(
  buildingHeight: number,
  stage: number,
  stages: number,
): number {
  if (buildingHeight <= 0 || stage <= 0 || stages <= 0) {
    return 0;
  }
  const step = Math.min(stage, stages);
  return buildingHeight * MAX_SHELL_RATIO * (step / stages);
}

/**
 * The FROST SHELL for one damage stage, or `null` for an unmarked or unmeasured building.
 *
 * This is the whole public surface of the seam: `BuildingFrostCrust` calls exactly this and
 * nothing else, so whatever frost damage becomes, it becomes it here. Cached per footprint,
 * stage and building height, and CLONED by the caller, following `ruinStage.ts` and
 * `constructionStages.ts`.
 *
 * `stage` is `winterDamageStage`'s reading and `stages` is `HARD_WINTER.damage.stages`, both
 * passed in rather than imported, so this file holds no opinion about how many steps there are
 * and a retune of the tuning table moves the picture with it.
 *
 * `buildingHeight` is the height the building this crust goes on ACTUALLY renders at, measured
 * off the live scene graph by the caller. `null` at or below zero, which is the honest answer
 * before the node's GLB has resolved: a crust with no building to be a fraction of would have to
 * pick a number, and picking one is the defect this parameter exists to end.
 */
export function frostShellModel(
  footprint: Footprint,
  stage: number,
  stages: number,
  buildingHeight: number,
): THREE.Object3D | null {
  if (stage <= 0 || stages <= 0 || buildingHeight <= 0) {
    return null;
  }
  const step = Math.min(stage, stages);
  const banded = quantizeBuildingHeight(buildingHeight);
  if (banded <= 0) {
    return null;
  }
  const key = `${footprint.w}x${footprint.d}:${step}/${stages}@${banded}`;
  const cached = shellTemplates.get(key);
  if (cached) {
    return cached;
  }

  const group = new THREE.Group();
  group.name = FROST_SHELL_NAME;
  const width = footprint.w * GRID_CELL * SHELL_INSET;
  const depth = footprint.d * GRID_CELL * SHELL_INSET;
  const height = frostCrustHeight(banded, step, stages);

  // The crust itself: a slab hugging the base, rising with the stage.
  const crust = new THREE.Mesh(
    new THREE.BoxGeometry(width, height, depth),
    frostMaterial(WINTER_GROUND_TONES.frost),
  );
  crust.name = FROST_CRUST_NAME;
  crust.position.y = height / 2;
  crust.castShadow = true;
  crust.receiveShadow = true;
  group.add(crust);

  // And its leading edge, one tone step colder, the same cue the ground's frost line uses,
  // so "this is how far the frost has got" is said in the vocabulary already on the island.
  const lipHeight = height * LIP_SHARE;
  const lip = new THREE.Mesh(
    new THREE.BoxGeometry(width * 1.04, lipHeight, depth * 1.04),
    frostMaterial(WINTER_GROUND_TONES.frostLine),
  );
  lip.name = FROST_LIP_NAME;
  lip.position.y = height;
  lip.castShadow = true;
  lip.receiveShadow = true;
  group.add(lip);

  shellTemplates.set(key, group);
  return group;
}
