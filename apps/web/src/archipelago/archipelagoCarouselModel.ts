import { ERA_SEQUENCE } from "@cr/skill-graph";

/** Every behavior-scoped product path that can request a selected island. */
export const ARCHIPELAGO_NAV_INPUTS = [
  "previous-arrow",
  "next-arrow",
  "left-key",
  "right-key",
  "home-key",
  "end-key",
  "swipe",
  "direct-list",
] as const;

export type ArchipelagoNavInput = (typeof ARCHIPELAGO_NAV_INPUTS)[number];

export interface ArchipelagoCarouselCommandState {
  /** The latest destination requested by input, including the one pending under a veil. */
  readonly requestedIndex: number;
  /** The island whose scene and state actions are currently rendered. */
  readonly renderedIndex: number;
  /** The durable island the learner is standing on; browsing never changes it. */
  readonly standingIndex: number;
  readonly input: ArchipelagoNavInput;
}

export type ArchipelagoCarouselIntent =
  | { readonly type: "step"; readonly delta: -1 | 1 }
  | { readonly type: "select"; readonly index: number }
  | { readonly type: "first" }
  | { readonly type: "last" }
  | { readonly type: "escape" };

function clampIndex(index: number): number {
  return Math.min(ERA_SEQUENCE.length - 1, Math.max(0, Math.trunc(index)));
}

export function initialCarouselState(
  standingIndex: number,
): ArchipelagoCarouselCommandState {
  const standing = clampIndex(standingIndex);
  return {
    requestedIndex: standing,
    renderedIndex: standing,
    standingIndex: standing,
    input: "direct-list",
  };
}

/**
 * Request one destination without claiming its scene has rendered.
 *
 * The component settles this value only when the one-canvas veil reaches its swap point.
 * Keeping that second step explicit prevents a fast action press from acting on hidden state.
 */
export function commandCarousel(
  state: ArchipelagoCarouselCommandState,
  intent: ArchipelagoCarouselIntent,
  input: ArchipelagoNavInput,
): ArchipelagoCarouselCommandState {
  let requestedIndex = state.requestedIndex;
  switch (intent.type) {
    case "step":
      requestedIndex = clampIndex(state.requestedIndex + intent.delta);
      break;
    case "select":
      requestedIndex = clampIndex(intent.index);
      break;
    case "first":
      requestedIndex = 0;
      break;
    case "last":
      requestedIndex = ERA_SEQUENCE.length - 1;
      break;
    case "escape":
      requestedIndex = state.standingIndex;
      break;
  }
  return { ...state, requestedIndex, input };
}

/** Mark the requested destination as the scene and action state now on screen. */
export function settleCarousel(
  state: ArchipelagoCarouselCommandState,
): ArchipelagoCarouselCommandState {
  return { ...state, renderedIndex: state.requestedIndex };
}
