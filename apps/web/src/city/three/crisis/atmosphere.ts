/**
 * **THE CRISIS ATMOSPHERE PRESET — the one lever every crisis in this renderer actually has.**
 *
 * `docs/superpowers/specs/crises/README.md` calls the light, sky and fog numbers *"the
 * highest-leverage lever available to every one of these nine briefs"*, and
 * `crisis-reference-packs/README.md` §1a records that era one has already walked the path:
 * `WINTER_LIGHT` ships, `CityLighting.tsx` and `CityScene.tsx` read it, and the three unbuilt
 * crises can copy its shape rather than argue for it. This file is that shape, named.
 *
 * ## WHY THIS IS GENUINELY SHARED AND NOT ERA-ONE-SHAPED
 *
 * Because the thing it re-values is a property of the RENDERER, not of the winter. There are
 * exactly four lights in the whole scene and they are all global (`CityLighting.tsx`: one
 * hemisphere, one ambient, one shadowed key, one fill), there is no `EffectComposer`, and the
 * fog is one distance-based setting for the whole scene. So *"what does this crisis's weather
 * look like"* has the same finite answer for all four crises whatever the crisis is: re-value
 * those four lights, the sky, the fog and the exposure, and change nothing else. Era one did
 * not invent that budget; it discovered it.
 *
 * Read the three unbuilt briefs against these fields and every one of them fits without a new
 * control. Era four asks for a cooler whiter key, RAISED intensity, the key angle taken *high*
 * rather than raking, a paler hemisphere, a bleached sky and the fog near plane pushed OUT
 * (`crises/era-04-succession-crisis.md` §2.1). Era nine asks for a flat cool grey sky and the
 * far plane pulled IN (`era-09-intrusion.md` §2.1). Both of those are this table with different
 * numbers in it, including the two directions era one happened not to use: era one pulls its
 * near plane in and drops its key, era four pushes its near plane out and raises its key.
 *
 * **The fields that exist here beyond the nine `lightSpec` numbers are the ones era one had to
 * add**, and `crisis-reference-packs/README.md` §1a records the finding: *"every brief written
 * against 'nine numbers' understated the lever by four controls, one of which (the key's angle)
 * several of those briefs then asked for in prose"*. Those four are {@link CrisisAtmosphere
 * .exposure}, `key.shadowIntensity`, the two `posRatio` triples, and fog expressed as RATIOS.
 *
 * ## NOTHING HERE IMPORTS `three`, AND THAT IS LOAD-BEARING
 *
 * `winterTones.ts`'s own header records the reason: it is reached from `CitySurface`'s STATIC
 * import graph, and pulling `three` into that graph is the cost `WinterEntryChip` and the lazy
 * surface exist to avoid. `WINTER_LIGHT` satisfies the type below, so this file is in that graph
 * too and is held to the same rule. It is types and plain numbers, and the two resolvers at the
 * bottom hand back plain records rather than three.js objects for exactly that reason.
 *
 * ## WHAT THIS DELIBERATELY DOES NOT CARRY
 *
 * **No fifth light, no post-processing hook, no environment map and no shadow colour.** Every
 * one of those is a measured absence in this renderer rather than an omission here, and a field
 * for one would invite a brief to author a number nothing can read. The boundary is stated once,
 * at `crises/README.md` under *"The hard boundary, shared by all nine"*, and this table is the
 * whole of what is on the other side of it.
 */

/**
 * A light or fill position, as a per-axis multiplier on the shipped rig's own ratio.
 *
 * A multiplier rather than world units because the shipped rig derives every light position
 * from the island radius, and a literal would stop scaling with it — `WINTER_LIGHT.key.posRatio`
 * records that reasoning against the design batch's own world-unit numbers.
 */
export type LightPositionRatio = readonly [number, number, number];

/**
 * **ONE CRISIS'S WEATHER, as the thirteen controls this renderer actually has.**
 *
 * Authored per crisis and registered in `registry.ts`. A crisis that wants an effect not on this
 * list wants a renderer change, and its brief's section 12 is where that is argued.
 */
export interface CrisisAtmosphere {
  /**
   * Renderer tone-mapping exposure. ACES is already applied; this scales the top end.
   *
   * 1 is the fair-weather value, so a preset that omits an opinion here writes 1 rather than
   * leaving the field out: an absent exposure and a neutral exposure are the same picture and
   * only one of them is checkable.
   */
  readonly exposure: number;
  /** Scene clear colour, behind the island. */
  readonly sky: number;
  /**
   * Fog colour, and its near and far planes as RATIOS of the island radius.
   *
   * Ratios rather than world units because the camera dollies (`VILLAGE_CAMERA
   * .maxDistanceRatio`) and may pan the island off centre, so a fixed far plane can put the
   * whole island past the fog at full zoom-out. `WINTER_LIGHT.fog` records that measurement.
   * The fair-weather rig is 3 to 20.
   */
  readonly fog: {
    readonly color: number;
    readonly nearRatio: number;
    readonly farRatio: number;
  };
  /**
   * The hemisphere light. Its SECOND colour is the light bouncing back up off the ground, so it
   * has to be the colour the ground actually is — which is why era one's swaps warm earth for
   * cold blue-white and era four's brief asks for stone rather than earth.
   */
  readonly hemi: {
    readonly sky: number;
    readonly ground: number;
    readonly intensity: number;
  };
  readonly ambient: { readonly color: number; readonly intensity: number };
  /**
   * The one shadow-casting light.
   *
   * `shadowIntensity` is three r155+'s own knob and is what lets shadows stay present while
   * going shallow, with no blur available. `posRatio` moves the ANGLE with the preset, which is
   * the control era four's brief leans on hardest: *"high, close to overhead"* against era
   * three's long rake is its single most identifying lever, and it is unreachable without this.
   */
  readonly key: {
    readonly color: number;
    readonly intensity: number;
    readonly shadowIntensity: number;
    readonly posRatio: LightPositionRatio;
  };
  /** The fill, which the shipped rig calls the rim. */
  readonly fill: {
    readonly color: number;
    readonly intensity: number;
    readonly posRatio: LightPositionRatio;
  };
}

/** `#rrggbb` for a packed hex, which is what the R3F props and the scene background take. */
export function atmosphereHex(color: number): string {
  return `#${color.toString(16).padStart(6, "0")}`;
}

/**
 * The nine `LightSpec` numbers a preset resolves to.
 *
 * Structurally `CityLighting.tsx`'s own `LightSpec`, restated here rather than imported so this
 * module keeps its no-`three` import graph clean of a `.tsx` file. `CityLighting` asserts the
 * two agree by assigning one to the other, so a field added there and not here fails to compile.
 */
export interface AtmosphereLightSpec {
  readonly hemiSky: string;
  readonly hemiGround: string;
  readonly hemiIntensity: number;
  readonly ambient: string;
  readonly ambientIntensity: number;
  readonly key: string;
  readonly keyIntensity: number;
  readonly rim: string;
  readonly rimIntensity: number;
}

/**
 * A preset's four lights, in the shape the shipped rig already speaks.
 *
 * This is the whole of the swap-on-entry half of M3: a crisis mounts, its preset resolves here,
 * and the four lights are re-valued. The revert half is the absence of a preset — see
 * {@link atmosphereOrFair} — which is why nothing here has an "off" branch.
 */
export function atmosphereLightSpec(atmosphere: CrisisAtmosphere): AtmosphereLightSpec {
  return {
    hemiSky: atmosphereHex(atmosphere.hemi.sky),
    hemiGround: atmosphereHex(atmosphere.hemi.ground),
    hemiIntensity: atmosphere.hemi.intensity,
    ambient: atmosphereHex(atmosphere.ambient.color),
    ambientIntensity: atmosphere.ambient.intensity,
    key: atmosphereHex(atmosphere.key.color),
    keyIntensity: atmosphere.key.intensity,
    rim: atmosphereHex(atmosphere.fill.color),
    rimIntensity: atmosphere.fill.intensity,
  };
}

/**
 * **THE EXIT, AND WHY IT IS A FUNCTION RATHER THAN A REVERT ROUTINE.**
 *
 * `thaw.ts` is era one's exit and its header states the principle this generalises: the
 * transition is *"a pure function of the state"*, taken on the state change the player's own
 * last action caused, with no interpolation anywhere — because a fade needs elapsed time and
 * INV-CRISIS-1 forbids a crisis surface reading a clock.
 *
 * So the framework does not hold a revert. An atmosphere is resolved from the board on every
 * render, and a crisis ending is the board handing back `null`: the fair-weather answer comes
 * back because it was never overwritten. Nothing has to remember what the sky used to be, which
 * is the only version of this that cannot leak a crisis into a city that has finished one.
 *
 * The half that genuinely does need reverting is per-cell board STATE, and that is era one's own
 * (`thawWinterRows`) rather than the framework's: era four has no cells to thaw, so a shared
 * "clear the transient flags" pass would be a frost in disguise. See `propagation.ts`.
 */
export function atmosphereOrFair<T>(
  atmosphere: CrisisAtmosphere | null,
  resolve: (atmosphere: CrisisAtmosphere) => T,
  fair: T,
): T {
  return atmosphere === null ? fair : resolve(atmosphere);
}

/** A preset's near and far fog planes in world units, against the island it is drawn over. */
export function atmosphereFogRange(
  atmosphere: CrisisAtmosphere,
  islandRadius: number,
): { readonly near: number; readonly far: number } {
  return {
    near: islandRadius * atmosphere.fog.nearRatio,
    far: islandRadius * atmosphere.fog.farRatio,
  };
}
