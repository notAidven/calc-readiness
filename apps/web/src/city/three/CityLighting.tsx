import { useEffect, useRef } from "react";
import type * as THREE from "three";

import type { PaletteVariant } from "../palette";
import {
  atmosphereHex,
  atmosphereLightSpec,
  type CrisisAtmosphere,
} from "./crisis/atmosphere";
import { BUILDING_SHADOW_LAYER } from "./islandBatching";
import { useStaticShadowMap } from "./staticShadowMap";
import { WINTER_LIGHT } from "./winterTones";

/**
 * The shared city lighting rig (R3F), mirroring the Gridwork diorama that the
 * Phase-1 proof validated: a cool→warm hemisphere fill, one warm KEY light that
 * casts PCF soft shadows, and a cool RIM/back light for silhouette separation.
 * ACES tone mapping + exposure ~1.05 are set on the renderer in `CityScene`.
 *
 * A hemisphere light's SECOND colour is the light bouncing back up off the ground, so it
 * has to be the colour the ground actually is. Both the day and the night preset shipped
 * with a green one, from a meadow island that no longer exists: era one's ground is dry
 * grass over warm earth, and lighting earth buildings from below with grass-green fill
 * greyed every warm surface in the city — one of the reasons the scene read dead. Both
 * are now warm earth. The colourblind preset keeps its neutral grey deliberately, since
 * that variant's whole job is to hold chroma down.
 *
 * The warm "parchment city" identity is carried by a runtime environment LUT
 * (day / warm-dusk night / colorblind-safe), so the lighting theme is switchable
 * from one place. Colors never carry state on their own — that lives in the DOM
 * mirror — the variants only re-light the same world.
 */

export interface CityEnvironment {
  /** Scene clear color (behind the island). */
  readonly background: string;
  /** Distance fog color for gentle aerial depth. */
  readonly fog: string;
  /** Parchment ground top color. */
  readonly ground: string;
  /** Soil / island-side color. */
  readonly soil: string;
  /** Sage inner plaza tint. */
  readonly plaza: string;
  /** Empty-lot pad color. */
  readonly pad: string;
}

/**
 * Resolve the environment palette for a lighting variant, optionally under a crisis's own sky.
 *
 * A crisis atmosphere is WEATHER and deliberately not a fourth {@link PaletteVariant}: a variant
 * re-resolves every building hue, every road tone and every HUD colour through
 * `city/palette.ts`, and a crisis changes none of those — it changes the sky, the fog and
 * the four lights. So it overrides the two environment fields it owns and leaves the
 * variant's own answer for everything else, which is also what makes it composable with
 * `night` and `colorblind` instead of exclusive with them.
 *
 * `null` is the exit and needs no revert path of its own: the fair-weather answer comes back
 * because it was never overwritten. See `crisis/atmosphere.ts`.
 */
export function cityEnvironmentFor(
  variant: PaletteVariant,
  atmosphere: CrisisAtmosphere | null,
): CityEnvironment {
  const base = fairEnvironment(variant);
  if (atmosphere === null) {
    return base;
  }
  return {
    ...base,
    background: hex(atmosphere.sky),
    fog: hex(atmosphere.fog.color),
  };
}

/**
 * Era one's shorthand: `true` is the Hard Winter's registered preset.
 *
 * Kept beside the general form rather than replaced by it because the boolean is the shape the
 * shipped callers and their guards already speak, including files under an open pull request.
 * Nothing resolves differently through it — `winter` is `WINTER_LIGHT` and always was.
 */
export function cityEnvironment(variant: PaletteVariant, winter = false): CityEnvironment {
  return cityEnvironmentFor(variant, winter ? WINTER_LIGHT : null);
}

const hex = atmosphereHex;

function fairEnvironment(variant: PaletteVariant): CityEnvironment {
  switch (variant) {
    case "night":
      return {
        background: "#1a1d33",
        fog: "#232746",
        ground: "#5d5a52",
        soil: "#33313f",
        plaza: "#4a5866",
        pad: "#6a6656",
      };
    case "colorblind":
      return {
        background: "#dfe6ee",
        fog: "#cdd6e0",
        ground: "#d8d2c4",
        soil: "#9a9488",
        plaza: "#aeb6be",
        pad: "#c3bdb0",
      };
    default:
      // CoC-style "village": a bright grass island under a soft sky, with a
      // tilled-soil build pad. The subtle tile grid is drawn as an overlay in
      // CityScene so the ground reads as a grid without a texture.
      //
      // `background` is the far backdrop and stays the original pale sky tone.
      // `fog` is what actually reads as the water immediately around the island (Three's
      // fog blends toward it at the distances the camera sees the shoreline at), so
      // that is the one carrying the ocean colour -- deeper and more saturated than
      // the old #d6ecf7, which was nearly the same pale tone as the background and
      // read as more haze than water.
      return {
        background: "#bfe1f2",
        fog: "#3f96c9",
        ground: "#83bd6a",
        soil: "#7a5a34",
        plaza: "#95cd76",
        pad: "#cab787",
      };
  }
}

export interface LightSpec {
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

function lightSpec(variant: PaletteVariant): LightSpec {
  switch (variant) {
    case "night":
      return {
        hemiSky: "#5a6296",
        hemiGround: "#2f2418",
        hemiIntensity: 0.5,
        ambient: "#3a3452",
        ambientIntensity: 0.28,
        key: "#ffd29b",
        keyIntensity: 1.05,
        rim: "#7f93c8",
        rimIntensity: 0.55,
      };
    case "colorblind":
      return {
        hemiSky: "#eef3f8",
        hemiGround: "#b8b4ab",
        hemiIntensity: 0.9,
        ambient: "#e8ecf1",
        ambientIntensity: 0.34,
        key: "#fff7ea",
        keyIntensity: 1.2,
        rim: "#c6d2dc",
        rimIntensity: 0.5,
      };
    default:
      // Bright, cheerful daylight: a blue sky hemisphere bouncing off WARM EARTH, a
      // clean warm key, and a cool sky rim for silhouette separation.
      return {
        hemiSky: "#cfe6f6",
        hemiGround: "#c08f57",
        hemiIntensity: 0.95,
        ambient: "#f5efe2",
        ambientIntensity: 0.3,
        key: "#fff6e6",
        keyIntensity: 1.32,
        rim: "#bfdcef",
        rimIntensity: 0.48,
      };
  }
}

/**
 * The four lights' positions, as ratios of the island radius. Named so the crisis can move
 * two of them by a multiplier and keep the rig scaling with the island rather than pinning a
 * world-unit literal that stops tracking it.
 *
 * ⚑ THE KEY'S TRIPLE IS EXPORTED, because a crisis preset's `posRatio` is a MULTIPLIER on it
 * and not a direction, so the key's ELEVATION cannot be read off a preset alone. Era nine is
 * the first crisis whose geometry is designed against that angle — a groove's self-shadowing
 * width and a mass's shadow reach are both functions of it — and `intrusionMetrics.test.ts`
 * asserts its re-declared copy equals this one, so a retune here cannot leave that geometry
 * measuring an angle the rig no longer has.
 */
export const CITY_KEY_POS = [-1.5, 2.1, 1.25] as const;
const KEY_POS = CITY_KEY_POS;
const FILL_POS = [1.4, 0.85, -1.45] as const;

/**
 * A crisis's re-valuation of {@link lightSpec}, or the fair-weather answer untouched.
 *
 * The mapping itself lives in `crisis/atmosphere.ts` and works for any registered preset, which
 * is what makes the four lights a seam rather than a winter: era four's brief asks for the key to
 * go UP and close to overhead where era one's goes down and shallow, and the same nine numbers
 * come out either way.
 */
export function resolveCrisisLightSpec(
  variant: PaletteVariant,
  atmosphere: CrisisAtmosphere | null,
): LightSpec {
  return atmosphere === null ? lightSpec(variant) : atmosphereLightSpec(atmosphere);
}

/**
 * Era one's shorthand, unchanged.
 *
 * Exported for `winterCamera.test.ts`, which asserts the contrast ratio the batch's whole
 * argument rests on (key:fill goes from about 4:1 to about 1.7:1) rather than the digits.
 */
export function resolveLightSpec(variant: PaletteVariant, winter: boolean): LightSpec {
  return resolveCrisisLightSpec(variant, winter ? WINTER_LIGHT : null);
}

/** A light position ratio triple scaled by an optional per-axis winter move. */
function positioned(
  base: readonly [number, number, number],
  d: number,
  move: readonly number[] | null,
): [number, number, number] {
  return [
    base[0] * d * (move?.[0] ?? 1),
    base[1] * d * (move?.[1] ?? 1),
    base[2] * d * (move?.[2] ?? 1),
  ];
}

/** An explicit preset always wins; `winter` is era one's shorthand for its own. */
function resolveAtmosphere(
  atmosphere: CrisisAtmosphere | null | undefined,
  winter: boolean,
): CrisisAtmosphere | null {
  if (atmosphere !== undefined) {
    return atmosphere;
  }
  return winter ? WINTER_LIGHT : null;
}

/**
 * Warm key + cool hemisphere + rim, with a PCF-soft shadow frustum sized to the island —
 * or, under a crisis atmosphere, the same FOUR LIGHTS re-valued for that crisis's own sky.
 *
 * A crisis preset adds no light and removes none: the budget is four lights scene-wide and no
 * post-processing, so the weather is a change of values (see {@link CrisisAtmosphere}) and of two
 * positions, never a fifth lamp. `shadow-intensity` is three r155+'s own knob and is what lets
 * era one's shadows stay present while going shallow, with no blur available — and what lets era
 * four keep the full hard term while everything else about its rig moves.
 */
export function CityLighting({
  islandRadius,
  variant,
  winter = false,
  atmosphere,
}: {
  islandRadius: number;
  variant: PaletteVariant;
  /** A hard winter is on the island, so the rig wears era one's overcast preset. */
  winter?: boolean;
  /**
   * The crisis preset to light by, for a crisis that is not era one's.
   *
   * Optional so the shipped `winter` callers keep working unchanged; when it is given it wins,
   * including as an explicit `null` meaning fair weather.
   */
  atmosphere?: CrisisAtmosphere | null;
}) {
  const crisis = resolveAtmosphere(atmosphere, winter);
  const spec = resolveCrisisLightSpec(variant, crisis);
  const d = islandRadius;
  // Shadow frustum bounds cover the whole island with a little slack.
  const half = d * 1.65;
  const keyMove = crisis === null ? null : crisis.key.posRatio;
  const fillMove = crisis === null ? null : crisis.fill.posRatio;
  const keyRef = useRef<THREE.DirectionalLight>(null);

  useEffect(() => {
    keyRef.current?.shadow.camera.layers.enable(BUILDING_SHADOW_LAYER);
  }, []);

  // The key light below used to cast into a 2048x2048 map every frame. In the ordinary
  // idle city, citizens, carts and gulls animate but opt out of the shadow pass, so those
  // redraws were identical. Ceremony instances and material/depth transitions are dynamic
  // participants and the derived signature notices them. This mounts with the light it owns;
  // see `staticShadowMap.ts` for the current measurement and the safety argument.
  useStaticShadowMap();

  return (
    <>
      <hemisphereLight
        args={[spec.hemiSky, spec.hemiGround, spec.hemiIntensity]}
        position={[0, d * 2, 0]}
      />
      <ambientLight color={spec.ambient} intensity={spec.ambientIntensity} />
      <directionalLight
        ref={keyRef}
        castShadow
        position={positioned(KEY_POS, d, keyMove)}
        intensity={spec.keyIntensity}
        color={spec.key}
        shadow-intensity={crisis === null ? 1 : crisis.key.shadowIntensity}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={0.5}
        shadow-camera-far={d * 6}
        shadow-camera-left={-half}
        shadow-camera-right={half}
        shadow-camera-top={half}
        shadow-camera-bottom={-half}
        shadow-bias={-0.0006}
        shadow-normalBias={0.02}
      />
      <directionalLight
        position={positioned(FILL_POS, d, fillMove)}
        intensity={spec.rimIntensity}
        color={spec.rim}
      />
    </>
  );
}
