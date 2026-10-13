import {
  assertLedgerEntryInvariant,
  ECONOMY_RESOURCES,
  type LedgerEntry,
} from "@cr/economy";

import type { EconomyDevSnapshot, InMemoryEconomyClient } from "../economy/economySession";
import {
  consumeDevResetRequest,
  type DevSessionStorage,
  defaultDevStorage,
  isLocalPersistenceEnabled,
  readDevUserKey,
} from "./devSession";

/**
 * DEV-ONLY ECONOMY persistence: the wallet and the drill bound survive a browser
 * refresh (issue #96).
 *
 * WHY THIS EXISTS. The in-memory economy adapter held its whole state in closure
 * variables, so a reload emptied the ledger — and because `useEconomy`'s
 * `reconcileProgress` RE-DERIVES earn grants from learning state on every city load,
 * an empty ledger did not merely lose state, it silently rewrote it in the player's
 * favour: the grants replayed, but the SPENDS did not (they are not derivable from
 * learning state), so a saved-up stockpile came back and every already-paid practice set
 * became re-payable. Interleaved grants are worse
 * than lossy: they are keyed by a `session_id` that appears nowhere in `CityLoad`, so
 * they are unrecoverable even in principle. All of it has to be STORED, not recomputed.
 *
 * (This paragraph named "the rolling 24h interleaved cap reset — making refresh a cap
 * bypass", which was the sharper symptom at the time and is gone with the window: the
 * practice cap is per completed set now, so a reload has no accumulation to hand back.
 * The re-payable SETS are what the store is still protecting.)
 *
 * WHY A SIBLING STORE, NOT A FIELD ON `CityDevSnapshot`. The city snapshot and the
 * economy have different lifetimes and different owners: the city session is the
 * game's dev double, while the economy is a separate service in waiting
 * (`services/economy-api`). Keeping them in two keys means adding the economy costs
 * the city NOTHING — in particular it does not bump
 * `DEV_SESSION_SCHEMA_VERSION`, whose value is part of the city's storage key,
 * so no saved city is discarded to ship this. The two versions can also move
 * independently, which matters because both files are under active change.
 *
 * SAME GATE, SAME GUARANTEES as `devSession.ts`, deliberately: one
 * {@link isDevPersistenceEnabled} check (so the store is inert the moment the app
 * could ever be server-backed — Contracts §3 keep the Lambda the only writer of real
 * student state), an all-or-nothing parse behind a schema version, the same `?reset`
 * hatch, and the same namespacing under the dev identity.
 *
 * SIZE. The ledger is the only part there is, and it grows at ONE row (~150 bytes) per
 * earn event — it was two while a lesson credited xp beside its material, and the star
 * rows are gone entirely. Six lessons and a day's interleaved rounds come to a couple of
 * KB, three orders of magnitude under the ~5 MB `localStorage` budget the city store
 * already reasons about. It would take tens of thousands of practice rounds to
 * matter, and by then the ledger belongs to the server.
 *
 * ON TRUST. A ledger in `localStorage` is a ledger the player can hand-edit, so this
 * store is emphatically NOT a security boundary — spend authority belongs to
 * `services/economy-api`, which does not exist yet. What this layer does do is keep
 * the dev economy HONEST rather than authoritative: balances and ownership are
 * always re-derived from ledger rows (never read from a stored number), every
 * restored row must satisfy the core's own ledger invariants (via
 * {@link assertLedgerEntryInvariant} — a forged spend that names no subject discards the
 * whole blob), and the store cannot run at all in a deployment that has an API endpoint.
 * When the server economy lands, this file simply stops being reached.
 */

/**
 * Bump when the persisted ECONOMY shape changes; a mismatch discards the economy
 * blob and nothing else. v1 was the initial shape (ledger + prestige set + equipped
 * map + island restore clock).
 *
 * Independent of `DEV_SESSION_SCHEMA_VERSION` on purpose: bumping this must never
 * cost a saved city, and bumping that must never cost a saved wallet.
 *
 * **v2 — THE CONDITION CLOCK WAS SUNSET**, and `last_restored_at_ms` left
 * {@link EconomyDevSnapshot} with it. The two earlier material changes did NOT bump
 * (see below), so this one owes the difference: those changed which VALUES a field
 * could hold, and this one removes a FIELD. A v1 blob is still syntactically
 * parseable by the v2 parser — unknown keys are ignored — so without a bump a saved
 * wallet would restore silently while carrying a timestamp for a mechanic that no
 * longer exists. Bumping makes the removal legible in storage rather than only in
 * the type.
 *
 * THE COST, stated because the material-rename note below argues against bumps on
 * exactly this ground: the v1 blob is ORPHANED rather than deleted. `discard()`
 * removes the key this store resolves, which is now the v2 key, so the v1 payload
 * sits in `localStorage` unread and undeleted. That is accepted here — it is a few
 * KB in a dev-only store — and it is the trade a key-versioned store makes.
 *
 * DELIBERATELY NOT BUMPED FOR ERA MATERIALS. Widening a row's permitted
 * `resource_type` set is backward compatible in both directions that matter: a blob
 * written before materials existed contains no material rows and parses
 * identically, and a blob with material rows is the same blob with more rows in it.
 * A bump would have discarded every saved wallet in exchange for nothing. Both
 * directions are pinned in `economyPersistence.test.ts`.
 *
 * STILL NOT BUMPED FOR THE 2026-07-29 MATERIAL RENAME, and that one is a NARROWING
 * rather than a widening, so it owes the argument the widening did not. A blob
 * holding a `flint` row — writable only in the minutes between #227 merging and the
 * rename landing — fails the allow-list, and the all-or-nothing parse discards it.
 * That is the same OUTCOME a version bump gives and a tidier mechanism: that path
 * DELETES the unusable blob (`discard()`). Pinned by `economyMaterials.test.ts`,
 * "discards a blob holding a pre-rename material id".
 *
 * **v3 — THE GOLD-DROP, AND IT IS THE EXACT OPPOSITE CASE TO THAT RENAME.**
 *
 * `gold` was the legacy CURRENCY; it is now era five's MATERIAL. The word is in
 * `ECONOMY_RESOURCES` before the change and after it, so the allow-list — which is
 * derived from that union precisely so it never goes stale — admits a stored
 * `resource_type: "gold"` row either way and cannot tell the two meanings apart.
 *
 * That is why the rename argument above does NOT transfer, and the difference is worth
 * stating because the two changes look alike from a distance:
 *
 *  - A RETIRED id (`flint`) fails the allow-list for free. The blob is rejected, the
 *    key is deleted, and no bump buys anything.
 *  - A REPURPOSED id (`gold`) PASSES the allow-list. Without a bump, a pre-drop blob
 *    restores cleanly and every gold row lands in `computeMaterialBalances` as an era
 *    five stockpile — for a player in era one, who never had one. `computeBalances`
 *    and `computeMaterialBalances` split on `resource_type` alone, so nothing
 *    downstream can recover the distinction either.
 *
 * A silently WRONG wallet is strictly worse than an empty one, which is this file's
 * own stated reason for parsing all-or-nothing: an empty wallet is at least
 * reconstructable from learning state. The version is part of the storage key, so
 * bumping means a pre-drop blob is never fetched at all.
 *
 * Pinned by `economyMaterials.test.ts`, "refuses to read a pre-gold-drop blob whose
 * `gold` row means the retired currency".
 *
 * **v4 — THE COSMETIC SHOP AND XP WERE SUNSET (2026-08-03), and this is the FIELD-REMOVAL
 * case again, twice over plus a narrowing.** `owned_prestige` and `equipped` left
 * {@link EconomyDevSnapshot}; `xp` left `ECONOMY_RESOURCES`, so a stored xp row now fails
 * the derived allow-list; and `purchase:` left `SPEND_REASON_PREFIXES`, so a stored
 * cosmetic purchase now fails {@link assertLedgerEntryInvariant}.
 *
 * The last two are the `flint` case and would discard a pre-sunset blob for free, which
 * is the outcome a bump gives anyway. The bump is owed by the FIRST: a v3 blob's
 * `owned_prestige` and `equipped` keys are simply ignored by a parser that no longer
 * looks for them, so a wallet holding an equipped cosmetic would restore silently
 * WITHOUT it and the player would be told nothing. Bumping makes the removal legible in
 * storage rather than only in the type — the same argument v2 made for the condition
 * clock's timestamp.
 */
export const ECONOMY_DEV_SCHEMA_VERSION = 4;

const KEY_PREFIX = "cr.devEconomy";

export interface EconomyDevStore {
  /**
   * False whenever the app is — or could become — server-backed. While false the
   * store performs no reads, no writes, and no deletes.
   */
  readonly enabled: boolean;
  /** The namespaced key this store uses, or "" while disabled. */
  storageKey(): string;
  /** The saved economy, or null when absent, disabled, or unusable. */
  load(): EconomyDevSnapshot | null;
  /** Write `snapshot` now (or queue it, when a debounce is configured). */
  save(snapshot: EconomyDevSnapshot): void;
  /** Write any queued snapshot right now. */
  flush(): void;
  /** Drop the saved economy and any queued write. */
  clear(): void;
}

export interface EconomyDevStoreOptions {
  /** Defaults to `localStorage` when the browser exposes a usable one. */
  storage?: DevSessionStorage | null;
  /** Defaults to {@link isDevPersistenceEnabled}. */
  enabled?: boolean;
  /** Defaults to the dev identity in storage, else a single local dev user. */
  userKey?: string;
  /**
   * Defaults to 0 — WRITE-THROUGH. Unlike the city (which the camera and the
   * placement ghost can dirty many times a second) an economy write happens only on
   * a grant or a spend: a handful per session, each one a thing the player would
   * notice losing. Writing synchronously means a spend is durable the instant it
   * returns, with no debounce window for a closing tab to fall into and so no
   * `pagehide` flush to remember to wire up.
   */
  debounceMs?: number;
  now?: () => Date;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/**
 * The resources a stored row may be denominated in — DERIVED from the core's own
 * union, never a hand-written copy.
 *
 * This list is the reason the resource spine had to touch persistence at all.
 * `parseStoredEconomy` is ALL-OR-NOTHING, so a hand-maintained `["xp", "gold"]`
 * would not merely have dropped a `stone` row: it would have failed the guard,
 * discarded the WHOLE blob, and handed back a null snapshot — every symptom of #96
 * back in full the moment a material was minted, with no test in the tree to say so
 * because nothing in the tree minted one. Deriving it means a material added to
 * `ECONOMY_RESOURCES` is admitted here without anyone remembering a second edit.
 *
 * DERIVING IT IS ALSO WHY THE GOLD-DROP NEEDED A SCHEMA BUMP. A derived allow-list
 * tracks the union's MEMBERSHIP, which is the right thing for an added or a removed
 * id and no help at all for a REPURPOSED one: `gold` is a member before the drop and
 * after it, so nothing here can see that its meaning moved from the wallet to era
 * five's stockpile. The version is the only place that distinction can live.
 */
const ALLOWED_RESOURCES: readonly unknown[] = ECONOMY_RESOURCES;
const TXN_KINDS: readonly unknown[] = ["grant", "spend"];

/**
 * A stored ledger row, checked field by field AND against the core's own row
 * invariants.
 *
 * THE `created_at` CHECK IS NOW STRUCTURAL RATHER THAN LOAD-BEARING, and that is worth
 * recording because its stated reason has expired. It was justified by the rolling cap
 * reading the timestamp (`sumInterleavedInWindow`), so an unparseable one would drop a
 * row out of the 24h window and widen the cap. Nothing in `@cr/economy` reads a stored
 * instant any more — `clockless.test.ts` asserts that as a partition — so this check now
 * only keeps a malformed row out of a ledger that must be well-formed to be a ledger.
 * Kept on those grounds, not the old ones.
 */
function isLedgerEntry(value: unknown): value is LedgerEntry {
  if (
    !isRecord(value) ||
    typeof value.student_id !== "string" ||
    typeof value.event_id !== "string" ||
    value.event_id === "" ||
    !ALLOWED_RESOURCES.includes(value.resource_type) ||
    !TXN_KINDS.includes(value.kind) ||
    typeof value.amount !== "number" ||
    !Number.isFinite(value.amount) ||
    value.amount <= 0 ||
    typeof value.reason_code !== "string" ||
    value.reason_code === "" ||
    typeof value.created_at !== "string" ||
    !Number.isFinite(Date.parse(value.created_at))
  ) {
    return false;
  }
  try {
    // The same guard the core applies when it MINTS a row: an amount is positive, and
    // a spend NAMES ITS SUBJECT. A row that fails it could only have been hand-edited
    // (or written before the sunset), and it takes the whole blob down with it.
    assertLedgerEntryInvariant(value as unknown as LedgerEntry);
  } catch {
    return false;
  }
  return true;
}

/**
 * Parse a stored payload, or null if ANYTHING about it is off. All-or-nothing for
 * the same reason the city's parser is: a half-restored ledger is a wrong wallet,
 * and a wrong wallet is worse than an empty one (an empty one is at least
 * reconstructable from learning state).
 *
 * NOTHING HERE CAN PARTIALLY RESTORE A PRE-v2 BLOB, by three independent routes,
 * which is what the condition-clock removal turns on:
 *  1. The version is part of the storage key, so a v1 payload is never fetched.
 *  2. If one were fetched, the `parsed.version` check below rejects it outright and
 *     `load()` discards; there is no per-field fallback.
 *  3. The return below is an explicit one-field literal rather than a spread of
 *     `economy`, so a surviving `last_restored_at_ms` — or a v3 `owned_prestige` /
 *     `equipped` — cannot ride along into a snapshot even if the first two were somehow
 *     bypassed.
 */
function parseStoredEconomy(raw: string): EconomyDevSnapshot | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isRecord(parsed) || parsed.version !== ECONOMY_DEV_SCHEMA_VERSION) {
    return null;
  }
  const economy = parsed.economy;
  if (!isRecord(economy)) {
    return null;
  }
  if (
    !Array.isArray(economy.entries) ||
    !economy.entries.every((entry) => isLedgerEntry(entry))
  ) {
    return null;
  }
  // The ledger is the whole payload now. `owned_prestige` and `equipped` were parsed
  // here, each optional and each all-or-nothing when present; both left with the shop,
  // and a v3 blob carrying them is not reached at all because the version is part of the
  // key.
  return { entries: economy.entries as readonly LedgerEntry[] };
}

export function createEconomyDevStore(
  options: EconomyDevStoreOptions = {},
): EconomyDevStore {
  const storage = options.storage === undefined ? defaultDevStorage() : options.storage;
  const enabled = (options.enabled ?? isLocalPersistenceEnabled()) && storage !== null;
  const debounceMs = options.debounceMs ?? 0;
  const now = options.now ?? (() => new Date());

  let cachedKey: string | null = null;
  let pending: EconomyDevSnapshot | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;

  // Resolved lazily (and only while enabled) so a disabled store never reads
  // storage, not even to work out which key it would have used.
  function resolveKey(): string {
    if (cachedKey === null) {
      const configured = options.userKey ?? readDevUserKey(storage);
      cachedKey = `${KEY_PREFIX}.v${ECONOMY_DEV_SCHEMA_VERSION}.${configured}`;
    }
    return cachedKey;
  }

  function write(): void {
    timer = null;
    const snapshot = pending;
    pending = null;
    if (!enabled || storage === null || snapshot === null) {
      return;
    }
    try {
      storage.setItem(
        resolveKey(),
        JSON.stringify({
          version: ECONOMY_DEV_SCHEMA_VERSION,
          saved_at: now().toISOString(),
          economy: snapshot,
        }),
      );
    } catch {
      // Quota or blocked storage: dev persistence is best-effort, never fatal.
    }
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
    storageKey() {
      return enabled ? resolveKey() : "";
    },
    load() {
      if (!enabled || storage === null) {
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
      const snapshot = parseStoredEconomy(raw);
      if (snapshot === null) {
        discard();
        return null;
      }
      return snapshot;
    },
    save(snapshot) {
      if (!enabled) {
        return;
      }
      pending = snapshot;
      if (debounceMs <= 0) {
        write();
        return;
      }
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
 * Save the economy after every mutation it makes. Like `withDevPersistence`, the
 * wrapper only forwards and observes: each method calls through to the real adapter
 * and then stores the state the adapter now reports, so nothing here can influence a
 * grant, a cap, or a spend.
 *
 * The READS (`getWallet`, `appliedEventIds`) forward untouched — they cannot dirty
 * anything, and snapshotting on a read would write on every HUD refresh. Every WRITE captures, including `reportInterleavedClear`, whose ledger
 * rows are the record of which practice sets have already been paid.
 *
 * While the store is disabled the ORIGINAL adapter is returned untouched, so a
 * server-backed app carries no wrapper at all.
 */
export function withEconomyDevPersistence(
  client: InMemoryEconomyClient,
  store: EconomyDevStore,
): InMemoryEconomyClient {
  if (!store.enabled) {
    return client;
  }

  const capture = (): void => store.save(client.snapshot());

  return {
    snapshot: () => client.snapshot(),
    getWallet: () => client.getWallet(),
    appliedEventIds: () => client.appliedEventIds(),
    // A REPAIR IS A SPEND, so it must capture for the same reason a civic purchase does
    // — and for one more. A repair's ledger row is the ONLY record that this ruin was paid for:
    // lose it and the next reload restores a ruin whose repair has already been charged,
    // so the retry reports `already_spent` against an empty ledger and the player pays
    // twice for a building they earned once.
    async repairRuin(input) {
      const outcome = await client.repairRuin(input);
      capture();
      return outcome;
    },
    // A CIVIC PURCHASE IS A SPEND, and its ledger row is the only record that this
    // placement was paid for. Lose it and a reload restores a city holding a building the
    // ledger says nothing about, with the stone back in the wallet — a free building.
    // That is the same argument the repair above makes, and it is why the ledger-backed
    // path had to capture here rather than ride a session counter.
    async purchaseCivicBuilding(input) {
      const outcome = await client.purchaseCivicBuilding(input);
      capture();
      return outcome;
    },
    async reportIslandFounded(input) {
      const outcome = await client.reportIslandFounded(input);
      capture();
      return outcome;
    },
    async resetIslandWallet(input) {
      await client.resetIslandWallet(input);
      capture();
    },
    async reportLessonComplete(input) {
      const outcome = await client.reportLessonComplete(input);
      capture();
      return outcome;
    },
    async reportPracticeSetComplete(input) {
      const outcome = await client.reportPracticeSetComplete(input);
      capture();
      return outcome;
    },
    async reportInterleavedClear(input) {
      const outcome = await client.reportInterleavedClear(input);
      capture();
      return outcome;
    },
    // A GRANT is still a WRITE: its ledger row is the only record this era's civic
    // bootstrap was already paid out, and losing it would re-grant on the next reload.
    async reportCivicBootstrap(input) {
      const outcome = await client.reportCivicBootstrap(input);
      capture();
      return outcome;
    },
  };
}

/**
 * Read the saved economy for a fresh page load, honouring `?reset` FIRST — the same
 * hatch (and the same helper) the city session goes through, so the two can never
 * disagree about whether this visit was reset.
 */
export function loadEconomyDevSnapshot(store: EconomyDevStore): EconomyDevSnapshot | null {
  consumeDevResetRequest(store);
  return store.load();
}

/*
 * NO MODULE-SCOPE `economyDevStore` SINGLETON, unlike the city's `devSessionStore`, and
 * the difference is deliberate rather than an omission.
 *
 * The city's store is shared: `DevLessons` and three `winter/` modules read and write
 * the same saved city, so they must all hold one instance. This store had exactly one
 * consumer — `createEconomyClient` — so a singleton bought no sharing and cost the one
 * thing that matters here: `enabled` was fixed when this MODULE was imported, which is
 * before the composition root has decided anything. That put the economy's auth gate
 * out of reach of the composition root and out of reach of a test, which is how
 * `createEconomyClient` went unguarded (persistence plan §5.3).
 *
 * `createEconomyClient` now builds its store from the gate it asks itself, so the
 * answer is the composition root's and is made at construction. Anything else needing
 * an economy store should take one, not reach for a shared one.
 */
