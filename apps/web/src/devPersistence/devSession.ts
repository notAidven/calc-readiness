import type {
  CrisisDamage,
  CrisisOverwrittenRecord,
  CrisisRuinedBuilding,
  CrisisRuinedCell,
  CrisisSuspendedCivic,
} from "@cr/game";
import { NO_CRISIS_DAMAGE } from "@cr/game";
import type { NeighborhoodState, StudentNodeState } from "@cr/state-schema";

import { isServerBacked } from "../api";
import type { CityDevSession, CityDevSnapshot } from "../city/citySession";
import type { RoadCell } from "../city/roads";
import type { CityLoad } from "../city/types";
import type { PlacedTransform } from "../city/worldLayout";
import { isDemoMode, localBrowserPersistenceEnabled } from "../demo/demoMode";
import { runtimeStorage } from "../storage/runtimeStorage";

/**
 * DEV-ONLY session persistence: survive a browser refresh.
 *
 * Without an API endpoint the whole app runs on in-memory doubles — the dev city
 * session (`city/citySession.ts`) and the in-memory diagnostic client — so every
 * refresh drops the city back to an empty island. This layer saves the dev
 * session's own state to `localStorage` and hands it back on the next load. It
 * SAVES AND RESTORES, nothing more: no rule is re-run on the way in or out, so a
 * restored session is the same session the app already built.
 *
 * INERT UNDER REAL AUTH. Contracts §3 make the Lambda the only writer of student
 * state, so a browser store must never become a competing source of truth. The
 * gate is the app's existing {@link isServerBacked} and nothing else — see
 * {@link isDevPersistenceEnabled}. When it is off there are NO reads, NO writes,
 * and no wrapper: {@link withDevPersistence} hands back the untouched session.
 *
 * FAIL-SAFE. The payload carries a schema version. A version mismatch, a parse
 * failure, or any shape error DISCARDS the blob (and deletes it) so the app
 * starts fresh — a stale blob half-loading into new code is worse than no
 * persistence at all.
 *
 * ESCAPE HATCH. `?reset` on any app URL wipes the saved session before it is
 * read; the `?dev` lesson page has a button that does the same.
 *
 * WHY `localStorage` AND NOT IndexedDB. The payload is the six D1 node states,
 * up to six grid placements, and one neighborhood flag — ~1-2 KB of JSON, three
 * orders of magnitude under the ~5 MB budget. It is also synchronous, which lets
 * {@link DevSessionStore.flush} land a pending write from a `pagehide` handler
 * with no async race. IndexedDB would buy capacity this state will never need in
 * exchange for an async, versioned, upgrade-migration surface.
 */

/**
 * Bump whenever the persisted shape changes; a mismatch discards the blob. v2 added
 * the Town Hall placement (`town_hall`); v3 adds the road layout (`roads` +
 * `road_gold_spent`). Any older blob is discarded on load (dev-only; a fresh start
 * is safer than half-restoring a stale shape).
 *
 * ## `v5` EXISTS BECAUSE TWO UNRELATED MIGRATIONS BOTH CALLED THEMSELVES `v4`
 *
 * **RAISED TO 5 DURING THE 2026-07-30 FORWARD-MERGE, and nothing in the tree would have
 * flagged it.** Two branches bumped `3` to `4` for migrations that have nothing to do
 * with each other — this lane for the civic type-id rename, `integration` for crisis
 * damage plus an economy spend reason — and because the LITERAL was identical on both
 * sides, git merged that line with no conflict at all. (Only the prose around it
 * conflicted, which is luck, not a safety net.) The version is part of the storage KEY,
 * so both builds write `…v4`: a city saved by one of them is then fetched by the other
 * and parsed as though it had matched. It would restore a blob holding a renamed civic
 * id into a parser that never learned about the rename, or a pre-crisis blob into a
 * build whose damage mint the ledger has already recorded repairs against.
 *
 * `5` is therefore not a third migration. It is the number that makes the two below
 * distinguishable, because a shared version cannot express two different shapes. Both
 * reasons are kept in full, since either alone justifies discarding a `v3` blob and a
 * reader needs to know that a `v4` key may have been written by either of two shapes.
 *
 * ### Reason one — the civic type-id rename (2026-07-29)
 *
 * `storage_pit`
 * became `water_spring` when Evan ruled the 1×1 civic row is the spring his art draws,
 * so a `civic` entry saved as `civic:storage_pit:0` now names a type that no longer
 * exists. **This is the case the two decisions below are NOT**, and the difference is
 * what a bump is for:
 *
 *   - **The CONTENT went invalid, where those two left it merely unfashionable.** A
 *     stale id parses — {@link isPlacedTransform} only asks for a string — and then
 *     resolves to nothing: `isCivicType` is false, so `resolveCivicModel` answers
 *     `null` (an empty pad), `ERA_ONE_CIVIC_TYPES` has no row to contribute livability
 *     or happiness from, and the roster has no `citizen_role` for it. The learner is
 *     left holding an invisible building that feeds nothing.
 *   - **And it is still charged for.** `civic_material_spent` rides in the same blob
 *     and is a plain number, so the 120 stone stays spent on a building that has
 *     stopped existing. That is not a layout somebody can walk back into legality; it
 *     is a wallet that cannot be reconciled from anything on the island.
 *   - **This file's own doctrine settles it**: *"a stale blob half-loading into new code
 *     is worse than no persistence at all."* A partially-dead city is exactly that
 *     half-load, and the dev store is inert under real auth
 *     ({@link isDevPersistenceEnabled}), so the whole cost is a dev session and there
 *     is a `?reset` hatch for it either way.
 *
 * The sibling economy store is deliberately keyed on its own version
 * (`economyPersistence.ts`), so this bump does not touch anybody's wallet or cosmetics.
 *
 * `DECISION — NOT bumped for the reachability placement rule (2026-07-29, O-13).`
 * A saved city can hold a layout that rule would now refuse, and three things make a
 * bump the wrong answer to that:
 *
 *   - **The shape did not change.** This version is what a blob is *parsed* against;
 *     placements are still `{nodeId, col, row, rot}` and parse identically.
 *   - **A bump is not a migration, it is a deletion.** The value is part of the storage
 *     key, so bumping discards the whole saved city — layout, progress, roads and the
 *     road spend — to fix a layout that is legal to look at. Evan's instruction was
 *     explicitly not to silently relocate anyone's buildings; silently deleting them is
 *     worse.
 *   - **A legacy layout is not a soft-lock.** `placementRefusal` only refuses what a
 *     move BREAKS, never what the layout already inherited, so every move on such an
 *     island is still allowed (including the ones that repair it), and nothing reads
 *     reachability at load: `citizenRoutes.routeBetween` degrades an unreachable
 *     destination to a direct line rather than to a null.
 *
 * So a pre-rule city loads exactly as saved, plays, and can be walked back into
 * legality one move at a time. `placementReachability.test.ts` pins both halves.
 *
 * ### Reason two — CRISIS DAMAGE (`crisis_damage`), from `integration`
 *
 * **It is the case the module's own header
 * warns about.** `CityDevSnapshot.crisis_damage` is OPTIONAL, so a v3 blob is
 * syntactically valid to the v4 parser: it simply lacks the field and restores as an
 * undamaged city. That is the RIGHT answer for a city nothing has happened to, and it is
 * also exactly why the bump is owed rather than excused — an added optional field is
 * caught by no compiler check and no parser check, so forgetting the bump is how this
 * module's stated failure mode ("a stale blob half-loading into new code") arrives with
 * nothing in the tree to say so.
 *
 * WHAT A MISSING BUMP WOULD ACTUALLY COST, since "it restores as undamaged" sounds
 * harmless. The damage-id MINT is inside the field. A blob written by a build whose
 * `crisis_damage` shape differed in any way the guard below rejects would take the whole
 * city down with it (all-or-nothing, by design) — but a blob written by a build that
 * spelled the mint differently and still parsed would restore ruins whose ids the ledger
 * had already recorded repairs against, and those repairs would report `already_spent`.
 * The player would meet a ruin the economy believes is paid for and no way to clear it.
 * A version in the storage KEY means that blob is never fetched.
 *
 * THE COST, stated as `ECONOMY_DEV_SCHEMA_VERSION` states its own: every saved dev city is
 * ORPHANED — not deleted, since `discard()` removes the current key. That is the trade a
 * key-versioned store makes, it is accepted here (dev-only, a few KB), and it is the reason
 * `economyPersistence.ts` is a SIBLING store: bumping this costs no wallet, so a player
 * whose island resets keeps the material they will need to repair the next one.
 *
 * DELIBERATELY NOT SHARED WITH THE ECONOMY BUMP. This change adds a field to the city and
 * a spend REASON to the economy; a reason prefix widens what a ledger row may say without
 * changing what a stored row means, which is the widening case
 * `ECONOMY_DEV_SCHEMA_VERSION` already argues needs no bump. So the wallet's version does
 * not move, and `economyPersistence.test.ts`'s both-directions cases still hold.
 */
export const DEV_SESSION_SCHEMA_VERSION = 6;

/** Query param on any app URL that wipes the saved dev session (`?reset`). */
export const DEV_SESSION_RESET_PARAM = "reset";

/**
 * The stable per-browser dev identity `auth/SessionContext` mints. Read here and
 * never written, purely to namespace the key so two dev identities in one browser
 * profile keep separate cities. This is NOT an auth check — the auth gate is
 * {@link isDevPersistenceEnabled}. `devSession.test.ts` pins the constant to the
 * auth module's so the two cannot drift.
 */
export const DEV_STUDENT_ID_KEY = "cr.dev-student-id";

/** Namespace used before any dev identity has been minted. */
const DEFAULT_DEV_USER = "local";

const KEY_PREFIX = "cr.devSession";

/** Default debounce for a save; a burst of city writes lands as one. */
const DEFAULT_DEBOUNCE_MS = 250;

/** The `localStorage` surface this layer needs (injectable for tests). */
export interface DevSessionStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface DevSessionStore {
  /**
   * False whenever the app is — or could become — server-backed. While false the
   * store performs no reads, no writes, and no deletes.
   */
  readonly enabled: boolean;
  /** The namespaced key this store uses, or "" while disabled. */
  storageKey(): string;
  /** The saved snapshot, or null when absent, disabled, or unusable. */
  load(): CityDevSnapshot | null;
  /** Queue a debounced write of `snapshot` (last one wins). */
  save(snapshot: CityDevSnapshot): void;
  /** Write any queued snapshot right now (page hide, tests). */
  flush(): void;
  /** Drop the saved session and any queued write. */
  clear(): void;
}

export interface DevSessionStoreOptions {
  /** Defaults to `localStorage` when the browser exposes a usable one. */
  storage?: DevSessionStorage | null;
  /** Defaults to {@link isDevPersistenceEnabled}. */
  enabled?: boolean | (() => boolean);
  /** Defaults to the dev identity in storage, else a single local dev user. */
  userKey?: string;
  debounceMs?: number;
  now?: () => Date;
}

/**
 * Whether the dev store may touch storage at all.
 *
 * The gate is the app's existing {@link isServerBacked} — this module deliberately
 * has no second notion of environment. It asks with `hasCognitoAuth = true`, the
 * STRONGEST auth state, so the answer is "could this app ever be server-backed?"
 * rather than "is a user signed in this instant". That matters because the Cognito
 * identity resolves asynchronously (`App.tsx` imports the client lazily): asking
 * about the live auth state would report "not server-backed" for the first few
 * frames of a real signed-in session and let a write slip out before the identity
 * landed. Assuming the strongest auth state makes the answer synchronous, stable
 * from the very first render, and wrong only in the safe direction — a deployment
 * with an API endpoint but a signed-out user keeps the in-memory dev session with
 * persistence switched off.
 */
export function isDevPersistenceEnabled(): boolean {
  return import.meta.env.DEV && !isDemoMode() && !isServerBacked(true);
}

/** Browser-local save authority for dev and explicit frontend-only demo builds. */
export function isLocalPersistenceEnabled(): boolean {
  return localBrowserPersistenceEnabled(import.meta.env);
}

/**
 * The browser store this layer writes to, or null when there is not a usable one.
 * Shared with the sibling economy store so both resolve storage identically.
 */
export function defaultDevStorage(): DevSessionStorage | null {
  return runtimeStorage();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/** Narrow an unknown array whose every entry satisfies `guard`. */
function everyIs<T>(
  value: unknown,
  guard: (entry: unknown) => entry is T,
): value is readonly T[] {
  return Array.isArray(value) && value.every((entry) => guard(entry));
}

/** A 0-3 tier — the shared type of both `placement_estimate` and `mastery`. */
function isTier(value: unknown): value is 0 | 1 | 2 | 3 {
  return value === 0 || value === 1 || value === 2 || value === 3;
}

function isNullableTimestamp(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

const COMPLETION_STATUSES: readonly unknown[] = ["locked", "in_progress", "complete"];
const LESSON_STAGES: readonly unknown[] = ["not_started", "teaching", "practice", "done"];

function isStudentNodeState(value: unknown): value is StudentNodeState {
  return (
    isRecord(value) &&
    typeof value.student_id === "string" &&
    typeof value.node_id === "string" &&
    isTier(value.placement_estimate) &&
    isTier(value.mastery) &&
    isNullableTimestamp(value.mastery_updated_at) &&
    COMPLETION_STATUSES.includes(value.completion_status) &&
    LESSON_STAGES.includes(value.lesson_stage) &&
    isNullableTimestamp(value.last_practiced_at)
  );
}

function isNeighborhoodState(value: unknown): value is NeighborhoodState {
  return (
    isRecord(value) &&
    typeof value.student_id === "string" &&
    typeof value.neighborhood_id === "string" &&
    typeof value.checkpoint_cleared === "boolean"
  );
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

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function isRuinedBuilding(value: unknown): value is CrisisRuinedBuilding {
  return (
    isRecord(value) && isNonEmptyString(value.node_id) && isNonEmptyString(value.damage_id)
  );
}

function isRuinedCell(value: unknown): value is CrisisRuinedCell {
  return (
    isRecord(value) && isNonEmptyString(value.cell) && isNonEmptyString(value.damage_id)
  );
}

function isSuspendedCivic(value: unknown): value is CrisisSuspendedCivic {
  return (
    isRecord(value) &&
    isNonEmptyString(value.placement_id) &&
    isNonEmptyString(value.damage_id)
  );
}

function isOverwrittenRecord(value: unknown): value is CrisisOverwrittenRecord {
  return (
    isRecord(value) &&
    isNonEmptyString(value.placement_id) &&
    isNonEmptyString(value.damage_id) &&
    Number.isInteger(value.bands_dark) &&
    (value.bands_dark as number) >= 1 &&
    (value.bands_dark as number) <= 9 &&
    typeof value.verification_attempted === "boolean"
  );
}

/**
 * A stored {@link CrisisDamage}, checked field by field — including the MINT, which is the
 * field a lax guard would wave through to the most expensive effect.
 *
 * `next_damage_id` must be a whole number of at least 1 AND strictly greater than every
 * id already in the sets, which is the invariant `foldCrisisDamage` maintains and the one
 * that makes a repair spend's event id unique. A blob whose mint had been rewound would
 * re-mint an id the ledger has already recorded a repair against, and the next repair of
 * that building would report `already_spent` — a ruin the economy believes is paid for and
 * the player cannot clear. Cheaper to refuse the whole blob (this parser is all-or-nothing
 * on purpose) than to restore a city with an unclearable ruin in it.
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
    !everyIs(value.ruined_buildings, isRuinedBuilding) ||
    !everyIs(value.ruined_cells, isRuinedCell) ||
    !everyIs(value.suspended_civic, isSuspendedCivic) ||
    !everyIs(value.overwritten_records, isOverwrittenRecord)
  ) {
    return false;
  }
  // Every stamped id must be one this mint has already issued. `d<n>` is the only form
  // `crisisDamageId` produces, so anything else is a blob this code did not write.
  const issued = (damageId: string): boolean => {
    const match = /^d(\d+)$/.exec(damageId);
    if (match === null) {
      return false;
    }
    return Number(match[1]) < (mint as number);
  };
  return [
    ...value.ruined_buildings.map((entry) => entry.damage_id),
    ...value.ruined_cells.map((entry) => entry.damage_id),
    ...value.suspended_civic.map((entry) => entry.damage_id),
    ...value.overwritten_records.map((entry) => entry.damage_id),
  ].every(issued);
}

/**
 * Parse a stored payload, or null if ANYTHING about it is off — unparseable, a
 * different schema version, or a collection that is not exactly the shape
 * `citySession` restores. Half-restoring a stale blob is the failure mode this
 * exists to prevent, so every check is all-or-nothing.
 */
function parseStoredSnapshot(raw: string): CityDevSnapshot | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isRecord(parsed) || parsed.version !== DEV_SESSION_SCHEMA_VERSION) {
    return null;
  }
  const city = parsed.city;
  if (!isRecord(city)) {
    return null;
  }
  if (
    !everyIs(city.node_states, isStudentNodeState) ||
    !everyIs(city.neighborhood_states, isNeighborhoodState) ||
    !everyIs(city.placements, isPlacedTransform)
  ) {
    return null;
  }
  // Roads + the spent total are optional (absent before any road is laid); when
  // present they must be well-formed, or the whole blob is discarded — half-
  // restoring a stale blob is the exact failure this parser prevents.
  if (city.roads !== undefined && !everyIs(city.roads, isRoadCell)) {
    return null;
  }
  const roadGoldSpent = city.road_gold_spent;
  if (
    roadGoldSpent !== undefined &&
    !(
      typeof roadGoldSpent === "number" &&
      Number.isFinite(roadGoldSpent) &&
      roadGoldSpent >= 0
    )
  ) {
    return null;
  }
  // The Town Hall placement is optional (null/absent before it is founded); when
  // present it must be a valid PlacedTransform, or the whole blob is discarded.
  const townHall = city.town_hall;
  if (townHall !== undefined && townHall !== null && !isPlacedTransform(townHall)) {
    return null;
  }
  // The bought civic buildings and their material cost, both optional (absent in every
  // blob written before purchases existed) and both all-or-nothing when present. They
  // are validated as a PAIR because they only mean anything together: a blob whose
  // buildings parse and whose spent total does not would restore a city that got its
  // Longhouses for free.
  if (city.civic !== undefined && !everyIs(city.civic, isPlacedTransform)) {
    return null;
  }
  const civicSpent = city.civic_material_spent;
  if (
    civicSpent !== undefined &&
    !(typeof civicSpent === "number" && Number.isFinite(civicSpent) && civicSpent >= 0)
  ) {
    return null;
  }
  // Crisis damage is optional (absent before any crisis, and absent from every v3 blob);
  // when present it must be exactly right, or the whole blob is discarded. See
  // `isCrisisDamage` for why a lax read here is more expensive than a refused city.
  const crisisDamage = city.crisis_damage;
  if (crisisDamage !== undefined && !isCrisisDamage(crisisDamage)) {
    return null;
  }
  return {
    node_states: city.node_states,
    neighborhood_states: city.neighborhood_states,
    placements: city.placements,
    roads: city.roads ?? [],
    road_gold_spent: roadGoldSpent ?? 0,
    town_hall: (townHall ?? null) as PlacedTransform | null,
    civic: city.civic ?? [],
    civic_material_spent: civicSpent ?? 0,
    crisis_damage: crisisDamage ?? NO_CRISIS_DAMAGE,
  };
}

/**
 * The persistable shape of a `CityLoad`. `load()` already returns every piece of
 * dev state that outlives a screen — node states, the D1 checkpoint, and the
 * layout — so the save side needs no new seam in the city session.
 */
export function snapshotFromLoad(load: CityLoad): CityDevSnapshot {
  return {
    node_states: load.node_states,
    neighborhood_states: load.neighborhood_state ? [load.neighborhood_state] : [],
    placements: load.placements ?? [],
    roads: load.roads ?? [],
    road_gold_spent: load.road_gold_spent ?? 0,
    town_hall: load.town_hall ?? null,
    // The bought civic buildings AND what they cost, together — separating them is how
    // a refresh would hand the material back and leave the buildings standing.
    civic: load.civic ?? [],
    ...((load.civic_material_spent ?? 0) > 0
      ? { civic_material_spent: load.civic_material_spent }
      : {}),
    crisis_damage: load.crisis_damage ?? NO_CRISIS_DAMAGE,
  };
}

export function createDevSessionStore(
  options: DevSessionStoreOptions = {},
): DevSessionStore {
  const storage = options.storage === undefined ? defaultDevStorage() : options.storage;
  const enabled = (): boolean =>
    (typeof options.enabled === "function"
      ? options.enabled()
      : (options.enabled ?? isLocalPersistenceEnabled())) && storage !== null;
  const debounceMs = options.debounceMs ?? DEFAULT_DEBOUNCE_MS;
  const now = options.now ?? (() => new Date());

  let cachedKey: string | null = null;
  let pending: CityDevSnapshot | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;

  // Resolved lazily (and only while enabled) so a disabled store never reads
  // storage, not even to work out which key it would have used.
  function resolveKey(): string {
    if (cachedKey === null) {
      const configured = options.userKey ?? readDevUserKey(storage);
      cachedKey = `${KEY_PREFIX}.v${DEV_SESSION_SCHEMA_VERSION}.${configured}`;
    }
    return cachedKey;
  }

  function discard(): void {
    if (!enabled() || storage === null) {
      return;
    }
    try {
      storage.removeItem(resolveKey());
    } catch {
      // Best-effort: a store we cannot clear is still a store we never trust.
    }
  }

  function write(): void {
    timer = null;
    const snapshot = pending;
    pending = null;
    if (!enabled() || storage === null || snapshot === null) {
      return;
    }
    try {
      storage.setItem(
        resolveKey(),
        JSON.stringify({
          version: DEV_SESSION_SCHEMA_VERSION,
          saved_at: now().toISOString(),
          city: snapshot,
        }),
      );
    } catch {
      // Quota or blocked storage: dev persistence is best-effort, never fatal.
    }
  }

  return {
    get enabled() {
      return enabled();
    },
    storageKey() {
      return enabled() ? resolveKey() : "";
    },
    load() {
      if (!enabled() || storage === null) {
        return null;
      }
      let raw: string | null;
      try {
        raw = storage.getItem(resolveKey());
      } catch {
        return null;
      }
      if (raw === null) {
        return null;
      }
      const snapshot = parseStoredSnapshot(raw);
      if (snapshot === null) {
        discard();
        return null;
      }
      return snapshot;
    },
    save(snapshot) {
      if (!enabled()) {
        return;
      }
      pending = snapshot;
      if (timer === null) {
        timer = setTimeout(write, debounceMs);
      }
    },
    flush() {
      if (timer !== null) {
        clearTimeout(timer);
      }
      write();
    },
    clear() {
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
      pending = null;
      discard();
    },
  };
}

/**
 * The dev identity to namespace a key under (see {@link DEV_STUDENT_ID_KEY}), or a
 * single default local user before one has been minted. Shared with the sibling
 * economy store so a city and its wallet are always namespaced the same way.
 */
export function readDevUserKey(storage: DevSessionStorage | null): string {
  try {
    const id = storage?.getItem(DEV_STUDENT_ID_KEY)?.trim();
    return id ? id : DEFAULT_DEV_USER;
  } catch {
    return DEFAULT_DEV_USER;
  }
}

/**
 * Save the dev session after every mutation it makes. The wrapper only forwards
 * and observes: each method calls through to the real session and then queues a
 * debounced snapshot of what `load()` now reports, so nothing here can influence
 * grading, mastery, placement, unlock, or seeding.
 *
 * While the store is disabled the ORIGINAL session is returned untouched, so a
 * server-backed app carries no wrapper at all.
 */
export function withDevPersistence(
  session: CityDevSession,
  store: DevSessionStore,
): CityDevSession {
  if (!store.enabled) {
    return session;
  }

  const captured = (): Promise<void> =>
    session.load().then((load) => store.save(snapshotFromLoad(load)));
  const capture = (): void => {
    void captured();
  };

  return {
    studentId: session.studentId,
    load: session.load,
    async moveTownHall(transform) {
      await session.moveTownHall(transform);
      capture();
    },
    async placeSkill(nodeId, transform) {
      await session.placeSkill(nodeId, transform);
      capture();
    },
    async moveSkill(nodeId, transform) {
      await session.moveSkill(nodeId, transform);
      capture();
    },
    // ROAD MUTATORS — these MUST be forwarded-with-capture here, or a laid/removed
    // road never gets snapshotted and silently vanishes on the next reload (the
    // exact class of bug this explicit forwarder has hit before). `roadGoldSpent`
    // is a pure read, so it forwards WITHOUT a capture.
    async layRoads(cells, availableGold) {
      const result = await session.layRoads(cells, availableGold);
      capture();
      return result;
    },
    async removeRoads(cells) {
      const result = await session.removeRoads(cells);
      capture();
      return result;
    },
    roadGoldSpent: session.roadGoldSpent,
    // CIVIC PURCHASE — a mutator, so it is forwarded WITH a capture for exactly the
    // reason the road mutators are: a bought building that never reaches a snapshot
    // vanishes on the next reload, and the material it cost does not come back with it
    // (`civic_material_spent` rides in the same blob). `civicMaterialSpent` is a pure
    // read and forwards without one.
    async placeCivic(type, transform, availableMaterial) {
      const result = await session.placeCivic(type, transform, availableMaterial);
      capture();
      return result;
    },
    // CIVIC RELOCATION — a layout mutator, so it captures too. It spends nothing, but the
    // failure here is the road one rather than the purchase one: a move that never reached
    // a snapshot would put the building back at its old spot on the next reload, so the
    // relocation would appear to work and then quietly undo itself.
    async moveCivic(placementId, transform) {
      await session.moveCivic(placementId, transform);
      capture();
    },
    // CIVIC DELETION — no refund and no spend mutation, but the missing placement is still
    // layout state that must reach storage before a reload can be trusted.
    async removeCivic(placementId) {
      const result = await session.removeCivic(placementId);
      await captured();
      return result;
    },
    async restoreCivicAfterFailedRemoval(placement) {
      const restored = await session.restoreCivicAfterFailedRemoval(placement);
      await captured();
      return restored;
    },
    // THE CATCH-UP'S INHERITED SEEDING — a layout mutator, so it captures like the two above.
    // The failure without a capture is the road one: a learner whose city was furnished by the
    // walk would reload onto an island the seeding had already run for, and the buildings
    // would be gone with no way to get them back (the walk runs once, at the hand-off).
    async seedCivicBuildings(seats) {
      const written = await session.seedCivicBuildings(seats);
      capture();
      return written;
    },
    civicMaterialSpent: session.civicMaterialSpent,
    // CRISIS-DAMAGE MUTATORS (from `integration`) — forwarded WITH capture for the same reason the road ones
    // are, and the failure is worse: a repair that never got snapshotted charges the player
    // material, clears the ruin on screen, and hands the ruin straight back on the next
    // reload — with the spend already on the ledger, so the retry reports `already_spent`
    // and the building can never be cleared. `crisisDamage` is a pure read and forwards
    // WITHOUT one.
    crisisDamage: session.crisisDamage,
    /**
     * THE ONE FORWARDER THAT AWAITS ITS CAPTURE, and the reason is a promise the surface
     * makes at the moment of the press.
     *
     * A carry-back is the last thing a player does inside a crisis before navigating back to
     * their island, and `scarLiveCity.ts` used to flush the store on the spot for exactly
     * that: *"a debounce window is a window for a closing tab to fall into"*. A caller that
     * wants to keep that promise has to be able to flush AFTER the snapshot is queued, and
     * `capture()` queues it a microtask later than its own call — so an unawaited one would
     * make `flush()` write whatever was pending BEFORE the damage. `apiCitySession.ts`
     * awaits every capture and records the same finding.
     */
    async recordCrisisDamage(report) {
      const damage = await session.recordCrisisDamage(report);
      await captured();
      return damage;
    },
    async repairRuinedBuilding(nodeId) {
      const result = await session.repairRuinedBuilding(nodeId);
      capture();
      return result;
    },
    async reclaimRuinedCell(cell) {
      const result = await session.reclaimRuinedCell(cell);
      capture();
      return result;
    },
    async liftSuspendedCivic(placementId) {
      const result = await session.liftSuspendedCivic(placementId);
      capture();
      return result;
    },
    async verifyOverwrittenRecord(damageId, correct) {
      const result = await session.verifyOverwrittenRecord(damageId, correct);
      await captured();
      return result;
    },
    async attemptStorm(neighborhoodId) {
      const result = await session.attemptStorm(neighborhoodId);
      capture();
      return result;
    },
    async advanceMasteryDev(nodeId, toMastery) {
      await session.advanceMasteryDev(nodeId, toMastery);
      capture();
    },
    async markLessonTaught(nodeId) {
      await session.markLessonTaught(nodeId);
      capture();
    },
    async setStageDev(nodeId, stage) {
      await session.setStageDev(nodeId, stage);
      capture();
    },
    seedFromPlacement(placementByNode, unlockedNodeIds) {
      session.seedFromPlacement(placementByNode, unlockedNodeIds);
      capture();
    },
  };
}

/**
 * The `?reset` escape hatch: wipe the saved dev session before anything reads it.
 * Returns whether a reset was asked for. Safe to call unconditionally — a
 * disabled store ignores it.
 *
 * Typed on `clear()` alone so EVERY dev store honours the same one hatch: the city
 * session and the sibling economy store both pass through here, and `?reset`
 * therefore cannot wipe a city while leaving its wallet behind.
 */
export function consumeDevResetRequest(store: Pick<DevSessionStore, "clear">): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  if (!new URLSearchParams(window.location.search).has(DEV_SESSION_RESET_PARAM)) {
    return false;
  }
  store.clear();
  return true;
}

/**
 * Drop `?reset` from the address bar once it has been honoured, so the NEXT
 * refresh keeps the session it just started rather than wiping it again.
 */
export function stripDevResetParam(): void {
  if (typeof window === "undefined" || typeof window.history?.replaceState !== "function") {
    return;
  }
  const url = new URL(window.location.href);
  if (!url.searchParams.has(DEV_SESSION_RESET_PARAM)) {
    return;
  }
  url.searchParams.delete(DEV_SESSION_RESET_PARAM);
  window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
}

/** The app-wide store. Inert unless the app can never be server-backed. */
export const devSessionStore: DevSessionStore = createDevSessionStore({
  enabled: isLocalPersistenceEnabled,
});
