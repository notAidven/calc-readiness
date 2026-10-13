import { type EraId, ERA_SEQUENCE, eraNumber, getEraOrThrow } from "@cr/skill-graph";

import { CRISIS_PREVIEW_ROUTES, type CrisisPreviewRoute } from "../crisisPreviewRoutes";
import { SUCCESSION_PARAM } from "../succession/SuccessionEntryChip";

/**
 * Every address the title-screen showcase needs.
 *
 * Crisis destinations are the router's canonical `CRISIS_PREVIEW_ROUTES`, not a demo copy.
 * Eras come from `ERA_SEQUENCE` at render time. This module only builds mutually exclusive
 * addresses: choosing one destination removes every other crisis parameter and the era
 * parameter first.
 *
 * The controls are links and write no state. A production demo may follow them, while ordinary
 * production never mounts the showcase or honors these preview routes.
 */

/** Every query parameter that sends `App.tsx` to a built crisis page. */
export const ENTRY_PARAMS: readonly string[] = CRISIS_PREVIEW_ROUTES.map(
  (route) => route.param,
);

/** The parameter `App.tsx`'s `previewStartEra()` reads. */
export const ERA_PARAM = "era";
const PROTOTYPE_PARAM = "prototype";

export type DemoCrisis = CrisisPreviewRoute;

/** Compatibility name for the canonical built-crisis registry used by existing tests. */
export const DEMO_CRISES: readonly DemoCrisis[] = CRISIS_PREVIEW_ROUTES;

/** Strip every entry parameter and the era, leaving whatever else was on the address bar. */
function withoutEntries(from: string): URL {
  const url = new URL(from);
  for (const param of [...ENTRY_PARAMS, ERA_PARAM, PROTOTYPE_PARAM]) {
    url.searchParams.delete(param);
  }
  return url;
}

/**
 * `App.tsx` only ever asks `has(param)`, so the bare form is what a reviewer types and what
 * belongs on the address bar. `URLSearchParams.set` with an empty value writes `?winter=`;
 * this trims the trailing `=` the way each chip's own builder does.
 */
function bare(url: URL, param: string): string {
  url.searchParams.set(param, "");
  return url.toString().replace(/=(&|#|$)/g, "$1");
}

/** The address that stands the city in one era, from wherever the presenter is now. */
export function demoEraHref(from: string, eraId: EraId): string {
  const url = withoutEntries(from);
  url.searchParams.set(ERA_PARAM, eraId);
  return url.toString();
}

/** The address that opens one crisis, from wherever the presenter is now. */
export function demoCrisisHref(from: string, param: string): string {
  const target = bare(withoutEntries(from), param);
  return param === SUCCESSION_PARAM ? bare(new URL(target), PROTOTYPE_PARAM) : target;
}

/** Which era the address bar is currently asking for, or null for era one / no request. */
export function requestedEra(search: string): EraId | null {
  const requested = new URLSearchParams(search).get(ERA_PARAM)?.trim();
  if (!requested) {
    return null;
  }
  return ERA_SEQUENCE.find((era) => era.id === requested)?.id ?? null;
}

/** "era 4 · Classical Era", the one label a presenter reads off both rows. */
export function eraCaption(eraId: EraId): string {
  return `era ${eraNumber(eraId)} · ${getEraOrThrow(eraId).name}`;
}
