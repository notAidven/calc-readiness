import { eraLandRadius } from "../islandLand";

export const INTRUSION_VIEW = { width: 1024, height: 580 } as const;
export const DRAWN_ISLAND_REACH = eraLandRadius("information_age");
export const CAMERA_REST_RATIO = 2.3;
export const CITY_FOV = 32;
/** The shipped island framing lens, measured independently from the camera dolly. */
export const FRAMING_LENS = 1.4506;
export const CAMERA_ELEVATION = Math.PI / 2 - 0.72;

export const REST_PX_PER_UNIT =
  INTRUSION_VIEW.height /
  (2 *
    DRAWN_ISLAND_REACH *
    CAMERA_REST_RATIO *
    Math.tan((CITY_FOV / 2) * (Math.PI / 180)) *
    FRAMING_LENS);

/** Approved redesign A1-A5, in world units. */
export const RELAY_GEOMETRY = {
  height: 10,
  record: {
    span: 6.8,
    height: 4.2,
    rim: 0.3,
    bezel: 0.24,
    cellPitch: 0.75,
    barWidth: 0.5,
    barHeight: 2.85,
    cutHeight: 0.24,
  },
  crest: {
    pitch: 0.89,
    width: 0.55,
    thickness: 0.42,
    standingHeight: 1.5,
    foldedHeight: 0.22,
  },
  intake: {
    span: 5.8,
    height: 1.7,
    baySpan: 1.45,
    bayHeight: 1.3,
    mullion: 0.4,
    depth: 0.35,
  },
  copy: {
    baySpan: 2.2,
    bayHeight: 0.7,
    cartridgeSpan: 1.7,
    cartridgeHeight: 0.4,
    depth: 0.3,
  },
} as const;

export function relayPixels(units: number, dolly = 1): number {
  return (units * REST_PX_PER_UNIT) / dolly;
}
