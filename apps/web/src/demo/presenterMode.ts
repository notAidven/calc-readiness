import { ERA_SEQUENCE, type EraId } from "@cr/skill-graph";

export type PresenterPreset =
  | "bronze-city"
  | "progress-foundation"
  | "progress-construction"
  | "progress-mastered"
  | "economy-city";

export type PresenterSurface =
  | "city"
  | "lesson"
  | "practice"
  | "review"
  | "work"
  | "interleaving"
  | "diagnostic"
  | "bay";

export interface PresenterRequest {
  readonly enabled: true;
  readonly preset: PresenterPreset;
  readonly surface: PresenterSurface;
  readonly eraId: EraId;
  readonly legacy: boolean;
}

const presenterDefaultEra = ERA_SEQUENCE[1];
if (!presenterDefaultEra) {
  throw new Error("Presenter mode requires the canonical second era.");
}

/** Presenter-only starting island. Learner/account defaults remain owned by `eraState.ts`. */
export const PRESENTER_DEFAULT_ERA_ID: EraId = presenterDefaultEra.id;

/** Every direct Presenter city preset accepted by the public demo route. */
export const PRESENTER_PRESETS: readonly PresenterPreset[] = [
  "bronze-city",
  "progress-foundation",
  "progress-construction",
  "progress-mastered",
  "economy-city",
];
const SURFACES: readonly PresenterSurface[] = [
  "city",
  "lesson",
  "practice",
  "review",
  "work",
  "interleaving",
  "diagnostic",
  "bay",
];

const LEGACY_SCENARIOS: Readonly<
  Record<string, { readonly preset: PresenterPreset; readonly surface: PresenterSurface }>
> = {
  "bronze-city": { preset: "bronze-city", surface: "city" },
  "progress-foundation": { preset: "progress-foundation", surface: "city" },
  "progress-construction": { preset: "progress-construction", surface: "city" },
  "progress-mastered": { preset: "progress-mastered", surface: "city" },
  "economy-city": { preset: "economy-city", surface: "city" },
  diagnostic: { preset: "bronze-city", surface: "diagnostic" },
  "interactive-lesson": { preset: "progress-foundation", surface: "lesson" },
  "mastery-check": { preset: "progress-construction", surface: "practice" },
  "work-feedback-fixture": { preset: "progress-construction", surface: "work" },
  "town-hall-interleaving": { preset: "bronze-city", surface: "interleaving" },
};

function preset(value: string | null): PresenterPreset {
  return PRESENTER_PRESETS.includes(value as PresenterPreset)
    ? (value as PresenterPreset)
    : "bronze-city";
}

function surface(value: string | null): PresenterSurface {
  return SURFACES.includes(value as PresenterSurface)
    ? (value as PresenterSurface)
    : "city";
}

function eraId(value: string | null): EraId {
  return ERA_SEQUENCE.find((era) => era.id === value)?.id ?? PRESENTER_DEFAULT_ERA_ID;
}

/** An explicit valid `?era=` wins; a plain Presenter/menu entry starts on canonical Era 2. */
export function presenterEntryEraId(search: string): EraId {
  return eraId(new URLSearchParams(search).get("era"));
}

export function resolvePresenterRequest(
  pathname: string,
  search: string,
): PresenterRequest | null {
  if (pathname !== "/demo") {
    return null;
  }
  const params = new URLSearchParams(search);
  if (params.get("presenter") === "1") {
    return {
      enabled: true,
      preset: preset(params.get("preset")),
      surface: surface(params.get("surface")),
      eraId: eraId(params.get("era")),
      legacy: false,
    };
  }
  if (params.get("showcase") !== "v1") {
    return null;
  }
  const legacy = LEGACY_SCENARIOS[params.get("scenario") ?? "bronze-city"] ?? {
    preset: "bronze-city" as const,
    surface: "city" as const,
  };
  return {
    enabled: true,
    ...legacy,
    eraId: eraId(params.get("era")),
    legacy: true,
  };
}

export function presenterHref(
  from: string,
  request: Pick<PresenterRequest, "preset" | "surface" | "eraId">,
): string {
  const url = new URL(from);
  url.pathname = "/demo";
  url.search = "";
  url.hash = "";
  url.searchParams.set("presenter", "1");
  url.searchParams.set("preset", request.preset);
  url.searchParams.set("surface", request.surface);
  url.searchParams.set("era", request.eraId);
  return url.toString();
}
