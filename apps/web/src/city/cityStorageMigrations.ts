import { type BrowserStorage, runtimeStorage } from "../storage/runtimeStorage";
import { migrateLegacyCeremonyData } from "./islandUnlockExamPersistence";

/**
 * Versioned city-runtime migrations that must run regardless of which era has a destination.
 * Each migration owns a narrow prefix; this boundary never sweeps all `cr.*` data.
 */
export function runCityStorageMigrations(
  storage: BrowserStorage | null = runtimeStorage(),
): readonly string[] {
  return migrateLegacyCeremonyData(storage);
}
