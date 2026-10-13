import { isExactDemoPath } from "../runtimeMode";
import { clearExactDemoStorage, DEMO_STORAGE_PREFIX } from "../storage/runtimeStorage";

export interface DemoBuildEnv {
  readonly DEV?: boolean;
  readonly VITE_DEMO_MODE?: string;
  readonly VITE_ACCOUNT_APP_ENABLED?: string;
  readonly VITE_DIAGNOSTIC_API_URL?: string;
}

/** Legacy artifact marker checked by `amplify.yml`; it no longer selects runtime authority. */
export function demoModeEnabled(env: DemoBuildEnv): boolean {
  return env.VITE_DEMO_MODE === "true";
}

export function isDemoMode(): boolean {
  return typeof window !== "undefined" && isExactDemoPath(window.location.pathname);
}

/**
 * Local persistence is available only to a dev server or an explicit demo build, and never
 * beside a configured backend where browser storage would become a competing authority.
 */
export function localBrowserPersistenceEnabled(
  env: DemoBuildEnv,
  pathname = typeof window === "undefined" ? "/" : window.location.pathname,
): boolean {
  if (isExactDemoPath(pathname)) {
    return true;
  }
  return (
    env.DEV === true &&
    env.VITE_ACCOUNT_APP_ENABLED !== "true" &&
    !env.VITE_DIAGNOSTIC_API_URL
  );
}

/** Resolve the API base while making demo mode incapable of reaching one. */
export function resolveDemoApiBaseUrl(
  env: DemoBuildEnv,
  pathname = typeof window === "undefined" ? "/" : window.location.pathname,
): string | null {
  if (isExactDemoPath(pathname) || !env.VITE_DIAGNOSTIC_API_URL) {
    return null;
  }
  return env.VITE_DIAGNOSTIC_API_URL.replace(/\/diagnostic\/?$/, "");
}

export interface DemoStorage {
  readonly length: number;
  key(index: number): string | null;
  removeItem(key: string): void;
}

/** Clear this app's browser-local state and no other application's origin data. */
export function clearDemoStorage(storage: DemoStorage): readonly string[] {
  return clearExactDemoStorage(storage);
}

/** Deterministic public reset: clear every app key, then reload the canonical direct route. */
export function resetDemoProgress(): void {
  if (typeof localStorage !== "undefined") {
    clearDemoStorage(localStorage);
  }
  if (typeof window !== "undefined") {
    window.location.replace("/demo");
  }
}

export { DEMO_STORAGE_PREFIX };
