/**
 * The bay has two independent gates. Developers retain the explicit `?bay` preview. Production
 * requires `VITE_ARCHIPELAGO_MODE=bay`; absent, unknown, and `single-island` values all render
 * the existing cumulative city. A server-backed app then requires
 * {@link ARCHIPELAGO_SERVER_VERSION}, so deploying the SPA before migration 0011/API support
 * falls back instead of creating browser-only islands.
 *
 * Rollback is data-preserving: build with `single-island`. The migration stays applied and no
 * partitioned row is deleted. `docs/Deployment.md` owns the deploy order.
 */

/** The slice of `import.meta.env` the gate reads. `devServerReset.ts`'s `BuildEnv` shape. */
export interface ArchipelagoBuildEnv {
  /** Vite's dev flag: `true` under `vite dev`, compiled to the literal `false` by a build. */
  readonly DEV: boolean;
  /**
   * Production rollout mode. Only `bay` enables the archipelago; `single-island` is the
   * explicit rollback and every unknown value fails closed.
   */
  readonly VITE_ARCHIPELAGO_MODE?: string;
  /** The persistent frontend-only demo always exposes the bay navigator. */
  readonly VITE_DEMO_MODE?: string;
}

/** The query parameter that opens the overview, kept beside the only code that reads it. */
export const ARCHIPELAGO_QUERY_PARAM = "bay";

/**
 * Whether the overview may be reached in the process reading this.
 *
 * Pure and fully injected, so both answers are drivable from a test without touching ambient
 * environment — which is what `WinterEntryChip.tsx` records as the reason its own gate has no
 * override prop: a gate whose true answer can only be reached by an override is a gate whose
 * true answer is never actually tested.
 */
export function isArchipelagoEnabled(
  env: ArchipelagoBuildEnv,
  search: string | undefined,
  pathname = "/",
): boolean {
  if (pathname === "/demo") {
    return true;
  }
  const mode = env.VITE_ARCHIPELAGO_MODE?.trim();
  if (mode === "bay") {
    return true;
  }
  if (!env.DEV || (mode !== undefined && mode !== "")) {
    return false;
  }
  if (typeof search !== "string") {
    return false;
  }
  return new URLSearchParams(search).has(ARCHIPELAGO_QUERY_PARAM);
}

/**
 * The gate against the real environment. The one call site is `CitySurface`, and it is a
 * function rather than a constant because `window.location` moves under a running app while a
 * module-level constant would be captured at import time.
 */
export function archipelagoEnabled(): boolean {
  return isArchipelagoEnabled(
    {
      DEV: import.meta.env.DEV,
      VITE_ARCHIPELAGO_MODE: import.meta.env.VITE_ARCHIPELAGO_MODE,
      VITE_DEMO_MODE: import.meta.env.VITE_DEMO_MODE,
    },
    typeof window === "undefined" ? undefined : window.location.search,
    typeof window === "undefined" ? "/" : window.location.pathname,
  );
}

/** The city payload capability implemented by migration 0011 and the matching API. */
export const ARCHIPELAGO_SERVER_VERSION = 1;

/**
 * Qualify the rollout switch with server capability. Local/dev state needs no server marker;
 * a server-backed learner gets the bay only from an API that declares the partitioned shape.
 */
export function archipelagoAvailable(input: {
  readonly rolloutEnabled: boolean;
  readonly serverBacked: boolean;
  readonly serverVersion?: number;
}): boolean {
  return (
    input.rolloutEnabled &&
    (!input.serverBacked || input.serverVersion === ARCHIPELAGO_SERVER_VERSION)
  );
}
