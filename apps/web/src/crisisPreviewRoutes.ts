import type { EraId } from "@cr/skill-graph";
import { lazy } from "react";

import { INTRUSION_QUERY_PARAM } from "./intrusion/IntrusionEntryChip";
import { PLAGUE_QUERY_PARAM } from "./plague/PlagueEntryChip";
import { SUCCESSION_PARAM } from "./succession/SuccessionEntryChip";
import { WINTER_QUERY_PARAM } from "./winter/WinterEntryChip";

/**
 * The canonical registry for every built crisis page.
 *
 * `App` routes from it and the demo showcase renders it directly. A crisis therefore cannot
 * become routable without becoming discoverable in the frontend-only demo, and the demo cannot
 * grow a stale second allowlist. The entries are learner-visible destinations; developer-only
 * benches (`?dev`, `?three`, `?graph`, `?interactive`, and `?mock`) deliberately live elsewhere.
 */
export const CRISIS_PREVIEW_ROUTES = [
  {
    param: WINTER_QUERY_PARAM,
    label: "The Hard Winter",
    eraId: "prehistoric",
    glyph: "\u2744",
    destination: "page",
    component: lazy(() =>
      import("./winter/WinterRoute").then((module) => ({
        default: module.WinterRoute,
      })),
    ),
  },
  {
    param: SUCCESSION_PARAM,
    label: "The Succession",
    eraId: "classical",
    glyph: "\u2617",
    destination: "city",
  },
  {
    param: PLAGUE_QUERY_PARAM,
    label: "The Plague",
    eraId: "renaissance",
    glyph: "\u2623",
    destination: "page",
    component: lazy(() =>
      import("./plague/PlagueRoute").then((module) => ({
        default: module.PlagueRoute,
      })),
    ),
  },
  {
    param: INTRUSION_QUERY_PARAM,
    label: "The Intrusion",
    eraId: "information_age",
    glyph: "\u26A1",
    destination: "city",
  },
] as const satisfies readonly (
  | {
      readonly destination: "page";
      readonly param: string;
      readonly label: string;
      readonly eraId: EraId;
      readonly glyph: string;
      readonly component: ReturnType<typeof lazy>;
    }
  | {
      readonly destination: "city";
      readonly param: string;
      readonly label: string;
      readonly eraId: EraId;
      readonly glyph: string;
    }
)[];

export type CrisisPreviewRoute = (typeof CRISIS_PREVIEW_ROUTES)[number];

/** Resolve the first crisis requested by the address, in canonical route order. */
export function requestedCrisisPreview(search: string): CrisisPreviewRoute | null {
  const params = new URLSearchParams(search);
  return CRISIS_PREVIEW_ROUTES.find((route) => params.has(route.param)) ?? null;
}
