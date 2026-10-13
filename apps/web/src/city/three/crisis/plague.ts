import { PLAGUE_MECHANICS as ENGINE_PLAGUE_MECHANICS } from "@cr/game";
import type * as THREE from "three";

import type { CrisisAtmosphere } from "./atmosphere";
import {
  CRISIS_MECHANICS,
  elsewhere,
  type MechanicCoverage,
  noAnalogue,
  openSeam,
  sharedSeam,
} from "./mechanics";
import { type CrisisPropagation, RESERVED_LINK_RELIEF } from "./propagation";

/** High, thin overcast: the approved calm Care House light over the real city. */
export const PLAGUE_LIGHT = {
  exposure: 0.98,
  sky: 0xdcdedb,
  fog: { color: 0xd2d5d3, nearRatio: 3, farRatio: 20 },
  hemi: { sky: 0xe8ebea, ground: 0xcfcdc4, intensity: 1.02 },
  ambient: { color: 0xdedfdd, intensity: 0.54 },
  key: {
    color: 0xf6f7f6,
    intensity: 0.52,
    shadowIntensity: 0.28,
    posRatio: [1.04, 1.42, 0.8],
  },
  fill: { color: 0xd6dad8, intensity: 0.4, posRatio: [0.9, 1.2, 1.0] },
} as const satisfies CrisisAtmosphere;

/** Infection reaches across authored building links drawn as inlaid bands in the live city. */
export const PLAGUE_PROPAGATION: CrisisPropagation<THREE.Group> = {
  read: "reaching",
  job: "watch-a-line",
  topology: {
    kind: "authored-link",
    endpoints: "building-pair",
    linkRelief: RESERVED_LINK_RELIEF.renaissance,
    requiresContact: false,
  },
  layer: {
    kind: "built",
    carrier: { kind: "floor-inlay" },
    markName: "plague-live-city-layer",
    build: (layer) => layer,
  },
};

/**
 * The renderer answers the same source-derived twenty-four rows as the engine. Engine-built rows
 * point to the Care House source; genuine absences stay explicit; presentation deferrals remain
 * open rather than being misreported as complete.
 */
export const PLAGUE_MECHANICS: MechanicCoverage = Object.fromEntries(
  CRISIS_MECHANICS.map((row) => {
    const answer = ENGINE_PLAGUE_MECHANICS.find((entry) => entry.id === row.id);
    if (answer === undefined) {
      throw new Error(`The Care House engine does not answer ${row.id}.`);
    }
    if (row.id === "M4") {
      return [
        row.id,
        sharedSeam(
          "atmosphere",
          "PLAGUE_LIGHT supplies the approved high, shadowless overcast on entry and the ordinary city returns when the crisis unmounts.",
        ),
      ];
    }
    if (row.id === "M9") {
      return [
        row.id,
        sharedSeam(
          "propagation",
          "PLAGUE_PROPAGATION declares authored building links and the live floor-inlay layer that PlagueInCity supplies.",
        ),
      ];
    }
    if (answer.answer === "built") {
      return [
        row.id,
        elsewhere(
          "apps/web/src/plague/PlagueSurface.tsx",
          `${answer.instance} The production DOM and procedural Care House scene render this engine state over the live island.`,
        ),
      ];
    }
    if (answer.answer === "no_analogue") {
      return [row.id, noAnalogue(answer.instance)];
    }
    return [row.id, openSeam(answer.next ?? answer.instance)];
  }),
) as MechanicCoverage;
