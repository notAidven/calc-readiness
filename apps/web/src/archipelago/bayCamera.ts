import type { EraId } from "@cr/skill-graph";

import type { IslandManifestEntry } from "./islandManifest";

/** Every product surface that can issue the same bay camera intent. */
export const BAY_CAMERA_INPUTS = ["pointer", "touch", "keyboard", "toolbar"] as const;
export type BayCameraInput = (typeof BAY_CAMERA_INPUTS)[number];

/** Observable endpoints plus the two in-flight states owed by the evidence frames. */
export type BayCameraPhase = "opening" | "overview" | "selected" | "landing" | "landed";

export interface BayCameraState {
  readonly phase: BayCameraPhase;
  readonly eraId: EraId;
  /** Diagnostic only: proves which input reached the shared command path. */
  readonly input: BayCameraInput;
}

export type BayCameraIntent =
  | { readonly type: "settle" }
  | { readonly type: "show-overview"; readonly eraId: EraId }
  | { readonly type: "select"; readonly eraId: EraId }
  | { readonly type: "land"; readonly eraId: EraId };

/** Mount at the city close-up, then pull out; reduced motion starts at the same endpoint. */
export function initialBayCameraState(
  eraId: EraId,
  reducedMotion: boolean,
): BayCameraState {
  return {
    phase: reducedMotion ? "overview" : "opening",
    eraId,
    input: "toolbar",
  };
}

/**
 * The one command path. Input origin is recorded, never branched on: pointer, touch,
 * keyboard and toolbar must produce the same state for the same intent.
 */
export function commandBayCamera(
  state: BayCameraState,
  intent: BayCameraIntent,
  input: BayCameraInput,
  reducedMotion: boolean,
): BayCameraState {
  switch (intent.type) {
    case "select":
      return { phase: "selected", eraId: intent.eraId, input };
    case "show-overview":
      return { phase: "overview", eraId: intent.eraId, input };
    case "land":
      return {
        phase: reducedMotion ? "landed" : "landing",
        eraId: intent.eraId,
        input,
      };
    case "settle":
      if (state.phase === "opening") {
        return { ...state, phase: "overview", input };
      }
      if (state.phase === "landing") {
        return { ...state, phase: "landed", input };
      }
      return state;
  }
}

export interface BayCameraFrame {
  readonly scale: number;
  /** Translation as a percentage of the 1024×580 camera plane. */
  readonly xPercent: number;
  readonly yPercent: number;
}

export interface BayProjectedIsland {
  readonly cx: number;
  readonly cy: number;
  readonly r: number;
}

const FRAME_WIDTH = 1024;
const FRAME_HEIGHT = 580;

/**
 * Fit one manifest-backed island into the bay camera.
 *
 * The projection radius is the overview mark. The ratio from manifest footprint to
 * overview radius corrects that mark back to the geometry the city camera must fit, so
 * swapping in a wider island zooms out rather than clipping it.
 */
export function bayCameraFrame(
  state: BayCameraState,
  projected: BayProjectedIsland,
  manifest: IslandManifestEntry,
): BayCameraFrame {
  if (state.phase === "overview") {
    return { scale: 1, xPercent: 0, yPercent: 0 };
  }

  const geometryRatio = manifest.footprintRadius / manifest.overviewRadius;
  const targetDiameter =
    state.phase === "selected" ? FRAME_HEIGHT * 0.56 : FRAME_HEIGHT * 1.26;
  const scale = Math.max(
    1,
    Math.min(8, targetDiameter / Math.max(1, projected.r * 2 * geometryRatio)),
  );
  return {
    scale,
    xPercent: ((FRAME_WIDTH / 2 - projected.cx * scale) / FRAME_WIDTH) * 100,
    yPercent: ((FRAME_HEIGHT / 2 - projected.cy * scale) / FRAME_HEIGHT) * 100,
  };
}
