import type { CrisisDamage } from "@cr/game";
import { NO_CRISIS_DAMAGE } from "@cr/game";
import { isEraId } from "../city/eraState";
import type { RoadCell } from "../city/roads";
import type { PlacedTransform } from "../city/worldLayout";
import {
  type DevSessionStorage,
  defaultDevStorage,
  isLocalPersistenceEnabled,
  readDevUserKey,
} from "../devPersistence/devSession";
import type { ArchipelagoState, IslandLayout, IslandRecord } from "./islandState";

/**
 * **THE ISLANDS THE LEARNER IS NOT STANDING ON, kept across a reload.**
 *
 * A SIBLING store to `devPersistence/devSession.ts` and `economyPersistence.ts`, deliberately
 * and on their own terms: same gate, same versioned key, same all-or-nothing parse, same
 * best-effort writes. Three stores rather than one because a version bump is a DELETION —
 * *"the value is part of the storage key, so bumping discards the whole saved city"* — and a
 * schema change to the bay should not cost a learner their wallet or their city.
 *
 * ## ⚑ IT DOES NOT STORE THE ISLAND THE LEARNER IS ON, AND THAT IS THE WHOLE DESIGN
 *
 * The standing island is already persisted, by the store that has always persisted it:
 * `devSessionStore` saves the city after every mutation and `citySession` restores it. Writing
 * it here as well would make two stores authoritative for one island, and the loser of that
 * race is a learner's city.
 *
 * So the rule is one sentence: **`devSessionStore` owns the island under the learner's feet,
 * this store owns the rest of the bay.** {@link readArchipelago} drops any entry for the
 * standing era on the way out rather than trusting the writer to have left it out, so a blob
 * written by an older build cannot smuggle a stale copy of the live city back in.
 *
 * ## THE STANDING ERA IS NOT STORED HERE EITHER
 *
 * It is `eraState.ts`'s, under `cr.city.era.v1`, and it has been since before the archipelago
 * existed. Storing it twice would create a state where the two disagree and no rule for which
 * wins, and there is nothing to gain: under the archipelago *"which era is the city wearing"*
 * and *"which island is the learner on"* are one question, which is exactly why
 * `archipelagoSession.ts` navigates by that store.
 *
 * ## WHAT A BAD BLOB COSTS, AND WHY IT IS REFUSED WHOLE
 *
 * `devSession.ts`'s doctrine, which applies here unchanged: *"a stale blob half-loading into
 * new code is worse than no persistence at all."* A half-parsed bay would be a civilization
 * with some of its islands missing and their material still spent, so every check below is
 * all-or-nothing and a failure discards the key.
 *
 * The cost of that is bounded and worth naming: a discarded bay leaves the learner standing on
 * the island `devSessionStore` restores, with the others un-founded. They are re-founded the
 * moment the era store reaches them, with a hall and nothing else — which is a loss, and is
 * the same loss any of these three stores takes on a bad blob.
 */

/**
 * Bump when the persisted shape changes; a mismatch discards the blob.
 *
 * `v1` is the first, and it is deliberately NOT folded into `DEV_SESSION_SCHEMA_VERSION`. That
 * constant's own docblock records what happens when two unrelated migrations share a number —
 * *"because the LITERAL was identical on both sides, git merged that line with no conflict at
 * all"* — and the bay is a second shape with a second lifetime.
 */
export const ARCHIPELAGO_SCHEMA_VERSION = 1;

const KEY_PREFIX = "cr.archipelago";

/** Where the bay is kept, or `""` while the store is inert. */
export function archipelagoStorageKey(storage: DevSessionStorage | null): string {
  return storage === null
    ? ""
    : `${KEY_PREFIX}.v${ARCHIPELAGO_SCHEMA_VERSION}.${readDevUserKey(storage)}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function everyIs<T>(
  value: unknown,
  guard: (entry: unknown) => entry is T,
): value is readonly T[] {
  return Array.isArray(value) && value.every((entry) => guard(entry));
}

function isPlacedTransform(value: unknown): value is PlacedTransform {
  return (
    isRecord(value) &&
    typeof value.nodeId === "string" &&
    Number.isInteger(value.col) &&
    Number.isInteger(value.row) &&
    Number.isInteger(value.rot)
  );
}

function isRoadCell(value: unknown): value is RoadCell {
  return isRecord(value) && Number.isInteger(value.col) && Number.isInteger(value.row);
}

function isCount(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function hasDamageId(value: unknown): value is { damage_id: string } {
  return isRecord(value) && isNonEmptyString(value.damage_id);
}

/**
 * A stored {@link CrisisDamage}, mint included.
 *
 * The mint is checked for the reason `devSession.ts`'s own guard checks it: an id below the
 * mint is one the ledger may already have a repair recorded against, and a rewound mint would
 * re-issue it. Here the stakes are a shade higher, because `archipelagoSession.ts` raises every
 * island's mint to the bay's high-water mark — so one island's rewound mint would drag the
 * whole civilization's numbering back with it.
 */
function isCrisisDamage(value: unknown): value is CrisisDamage {
  if (!isRecord(value)) {
    return false;
  }
  const mint = value.next_damage_id;
  if (!Number.isInteger(mint) || (mint as number) < 1) {
    return false;
  }
  if (
    !everyIs(value.ruined_buildings, hasDamageId) ||
    !everyIs(value.ruined_cells, hasDamageId) ||
    !everyIs(value.suspended_civic, hasDamageId)
  ) {
    return false;
  }
  return [...value.ruined_buildings, ...value.ruined_cells, ...value.suspended_civic].every(
    (entry) => {
      const match = /^d(\d+)$/.exec(entry.damage_id);
      return match !== null && Number(match[1]) < (mint as number);
    },
  );
}

/** One island's layout, checked field by field. Optional fields default the way a bare island does. */
function parseLayout(value: unknown): IslandLayout | null {
  if (!isRecord(value)) {
    return null;
  }
  if (
    !everyIs(value.placements, isPlacedTransform) ||
    !everyIs(value.roads, isRoadCell) ||
    !everyIs(value.civic, isPlacedTransform)
  ) {
    return null;
  }
  if (!isCount(value.road_gold_spent) || !isCount(value.civic_material_spent)) {
    return null;
  }
  const hall = value.town_hall;
  if (hall !== null && !isPlacedTransform(hall)) {
    return null;
  }
  const damage = value.crisis_damage;
  if (damage !== undefined && !isCrisisDamage(damage)) {
    return null;
  }
  return {
    placements: value.placements,
    roads: value.roads,
    road_gold_spent: value.road_gold_spent,
    town_hall: hall,
    civic: value.civic,
    civic_material_spent: value.civic_material_spent,
    crisis_damage: (damage ?? NO_CRISIS_DAMAGE) as CrisisDamage,
  };
}

/**
 * Parse a stored bay, or `null` if ANYTHING about it is off.
 *
 * An era id the sequence no longer authors takes the whole blob down rather than being dropped
 * quietly, which is the direction `devSession.ts` chose for a renamed civic type and for the
 * same reason: a civilization silently missing an island is a loss nobody can see, where a
 * refused one starts from a state the learner can recognise.
 */
export function parseStoredArchipelago(raw: string): readonly IslandRecord[] | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isRecord(parsed) || parsed.version !== ARCHIPELAGO_SCHEMA_VERSION) {
    return null;
  }
  if (!Array.isArray(parsed.islands)) {
    return null;
  }
  const islands: IslandRecord[] = [];
  const seen = new Set<string>();
  for (const entry of parsed.islands) {
    if (!isRecord(entry) || typeof entry.eraId !== "string" || !isEraId(entry.eraId)) {
      return null;
    }
    // A bay holding one era twice has no correct reading, so it is refused rather than
    // resolved: one of the two copies is somebody's city and there is no way to tell which.
    if (seen.has(entry.eraId)) {
      return null;
    }
    seen.add(entry.eraId);
    const layout = parseLayout(entry.layout);
    if (layout === null) {
      return null;
    }
    islands.push({ eraId: entry.eraId, layout });
  }
  return islands;
}

export interface ArchipelagoStore {
  /** False whenever the app is — or could become — server-backed. Then nothing is touched. */
  readonly enabled: boolean;
  /** The key this store uses, or "" while disabled. */
  storageKey(): string;
  /** Every island the blob holds, EXCEPT the one named — see the header. */
  read(exceptEra: string): readonly IslandRecord[];
  /** Write the bay. Synchronous, like the dev store, so a `pagehide` can land it. */
  write(state: ArchipelagoState): void;
  /** Drop the saved bay. Wired to the shared `?reset` hatch. */
  clear(): void;
}

export interface ArchipelagoStoreOptions {
  storage?: DevSessionStorage | null;
  enabled?: boolean;
  now?: () => Date;
}

export function createArchipelagoStore(
  options: ArchipelagoStoreOptions = {},
): ArchipelagoStore {
  const storage = options.storage === undefined ? defaultDevStorage() : options.storage;
  const enabled = (options.enabled ?? isLocalPersistenceEnabled()) && storage !== null;
  const now = options.now ?? (() => new Date());

  let cachedKey: string | null = null;
  function resolveKey(): string {
    if (cachedKey === null) {
      cachedKey = archipelagoStorageKey(storage);
    }
    return cachedKey;
  }

  function discard(): void {
    if (!enabled || storage === null) {
      return;
    }
    try {
      storage.removeItem(resolveKey());
    } catch {
      // Best-effort: a store we cannot clear is still a store we never trust.
    }
  }

  return {
    enabled,
    storageKey: () => (enabled ? resolveKey() : ""),
    read(exceptEra) {
      if (!enabled || storage === null) {
        return [];
      }
      let raw: string | null;
      try {
        raw = storage.getItem(resolveKey());
      } catch {
        return [];
      }
      if (raw === null) {
        return [];
      }
      const islands = parseStoredArchipelago(raw);
      if (islands === null) {
        discard();
        return [];
      }
      // THE STANDING ISLAND IS DROPPED HERE rather than trusted to be absent. `devSessionStore`
      // is authoritative for it, and a stale copy restored beside the fresh one is the
      // two-writers defect this store exists to avoid.
      return islands.filter((island) => island.eraId !== exceptEra);
    },
    write(state) {
      if (!enabled || storage === null) {
        return;
      }
      try {
        storage.setItem(
          resolveKey(),
          JSON.stringify({
            version: ARCHIPELAGO_SCHEMA_VERSION,
            saved_at: now().toISOString(),
            islands: state.islands,
          }),
        );
      } catch {
        // Quota or blocked storage: persistence here is best-effort, never fatal.
      }
    },
    clear: discard,
  };
}

/** The app-wide bay store. Inert unless the app can never be server-backed. */
export const archipelagoStore: ArchipelagoStore = createArchipelagoStore();
