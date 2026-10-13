import { NO_CRISIS_DAMAGE } from "@cr/game";

import type { CityLoad } from "./city/types";
import type { PlayRuntimeMode } from "./runtimeMode";

/**
 * The exact opt-in for restoring crisis gameplay to ordinary account builds.
 *
 * This is deliberately not a truthy parser. A typo must leave the capability off.
 */
export const CRISIS_CAPABILITY_ENABLED_VALUE = "enabled";

export interface CrisisCapabilityEnvironment {
  readonly DEV?: boolean;
  readonly VITE_CRISIS_CAPABILITY?: string;
}

export type CrisisCapabilitySource =
  | "disabled"
  | "ordinary-release"
  | "explicit-review"
  | "demo";

export interface CrisisCapability {
  readonly enabled: boolean;
  readonly source: CrisisCapabilitySource;
}

export interface CrisisCapabilityInput {
  readonly runtimeMode: PlayRuntimeMode;
  readonly explicitReviewRoute: boolean;
  readonly env: CrisisCapabilityEnvironment;
}

/**
 * The one crisis capability decision made by the application composition root.
 *
 * Ordinary account play is fail-closed. Exact demo keeps its already-sent fixtures, an
 * explicit crisis query keeps local review routes usable, and the one release value restores
 * ordinary gameplay without a source edit.
 */
export function resolveCrisisCapability({
  runtimeMode,
  explicitReviewRoute,
  env,
}: CrisisCapabilityInput): CrisisCapability {
  if (runtimeMode === "demo") {
    return { enabled: true, source: "demo" };
  }
  if (env.VITE_CRISIS_CAPABILITY === CRISIS_CAPABILITY_ENABLED_VALUE) {
    return { enabled: true, source: "ordinary-release" };
  }
  if (runtimeMode === "local" && env.DEV === true && explicitReviewRoute) {
    return { enabled: true, source: "explicit-review" };
  }
  return { enabled: false, source: "disabled" };
}

/**
 * Project persisted crisis consequences out of ordinary play without deleting them.
 *
 * The hold is temporary, so stored damage and its monotone repair-id mint remain untouched.
 * Every render-facing island receives a fresh no-damage value; learning state, layout, roads,
 * economy counters, and island identity pass through byte-for-byte.
 */
export function withoutCrisisState(load: CityLoad): CityLoad {
  return {
    ...load,
    crisis_damage: NO_CRISIS_DAMAGE,
    ...(load.islands
      ? {
          islands: load.islands.map((island) => ({
            ...island,
            crisis_damage: NO_CRISIS_DAMAGE,
          })),
        }
      : {}),
  };
}
