import { NO_CRISIS_DAMAGE } from "@cr/game";
import type { EraId } from "@cr/skill-graph";
import type { UUID } from "@cr/state-schema";

import { type AccessTokenGetter, apiPostJsonAuthenticated } from "../api";
import { snapshotFromLoad } from "../devPersistence/devSession";
import { type CityDevSession, createCityDevSession } from "./citySession";
import type { CityLoad } from "./types";
import { cityEraId } from "./useCityEra";

/**
 * **THE SIGNED-IN CITY, MIRRORED TO THE ACCOUNT IT BELONGS TO.**
 *
 * A signed-in learner used to read their city from `GET /api/city` and write it to an
 * in-memory session that nothing persisted. The design record measured what that costs and
 * the cost was not "the city resets": the surface computed occupancy from the PAYLOAD and
 * sent the write to the SESSION, so the two disagreed about what stood on the island and the
 * learner's first placement was aimed at the pre-seeded hall's own cells and silently
 * refused (`ROSTER 'Built' BADGES AFTER PLACING: 0`).
 *
 * This closes both halves with one object. The session below is HYDRATED from the server's
 * city and MIRRORED back to it, so the state the surface validates against and the state it
 * writes to are the same state, and that state is the account's.
 *
 * ## It is the sibling of `withDevPersistence`, deliberately
 *
 * Same shape, same debounce, same flush-on-hide, same "the wrapper only forwards and
 * observes" rule — because the alternative is a second model of persistence for the same
 * session. Two differences, both forced:
 *
 *  1. **Hydration is asynchronous**, where `devSessionStore.load()` is a synchronous
 *     `localStorage` read. Every method therefore awaits the shared hydration first, which is what
 *     makes the ordering safe: NOTHING is posted until the server's city has been restored,
 *     so a mirror can never overwrite a real city with the empty island a not-yet-loaded
 *     session would have reported.
 *  2. **A failed save is retried** rather than dropped. The whole city is posted every time
 *     and the write is idempotent, so keeping the pending snapshot means the next gesture
 *     re-sends everything the failed one carried.
 *
 * ## What a failed save costs, and what now says so
 *
 * If the POST fails and the learner does nothing else before closing the tab, that last
 * gesture is lost. This file used to record that as a named follow-up — *"there is no
 * surface for it yet"* — and the follow-up came due the hard way: `POST /api/city` was not
 * routed at the edge, every save 404'd, and the only thing standing between that and the
 * learner was a surface that did not exist.
 *
 * So a failed save is now OBSERVABLE ({@link ApiCitySession.subscribeUnsaved}), and
 * `UnsavedChangesNotice` renders it as a persistent "changes not saved" line for as long as
 * the queue has something in it. It is deliberately not a retry queue: the existing
 * gesture-driven retry and the `pagehide` flush are unchanged, and the notice reports the
 * state they leave rather than adding a third mechanism. The cost is still bounded — every
 * save carries the whole city rather than a delta, so the next one that lands carries
 * everything the failed ones did.
 */

/** What a `POST /api/city` body carries. Mirrors the service's `CityWrite`. */
export interface CityWritePayload {
  placements: readonly { nodeId: string; col: number; row: number; rot: number }[];
  civic: readonly { nodeId: string; col: number; row: number; rot: number }[];
  town_hall: { nodeId: string; col: number; row: number; rot: number } | null;
  roads: readonly { col: number; row: number }[];
  road_gold_spent: number;
  civic_material_spent: number;
  crisis_damage: CityLoad["crisis_damage"];
  era_id: EraId;
  island_era: EraId;
  current_island: EraId;
}

/** Default debounce for a mirror; a burst of city writes lands as one POST. */
const DEFAULT_DEBOUNCE_MS = 250;

/**
 * Swallow a rejection that has already been reported elsewhere. Used only where a `then`
 * exists to keep local state current: the same rejection reaches the caller through every
 * awaited method, and an unhandled one is a console error in the browser and a failure
 * attributed to an unrelated file under vitest.
 */
const noop = (): void => {};

/**
 * The city as `POST /api/city` wants it, from the same `load()` the dev snapshot is built
 * from. `snapshotFromLoad` is shared rather than re-derived so the two persistence paths
 * cannot disagree about what a city consists of.
 *
 * `era_id` is the browser's live era, and it is the one field here with no counterpart in the
 * dev snapshot. `city_state.era_id` is `not null` with no default and `road_gold_spent` lives
 * on that same row, so a writer that persists roads MUST supply an era — there is no shape of
 * this change in which the stored era stays empty. The read deliberately does not hand it
 * back yet; see `services/diagnostic-api/src/writes.ts` for why that is the ledger's
 * ordering constraint and not an oversight.
 */
export function cityWriteFromLoad(
  load: CityLoad,
  eraId: EraId,
  islandEra: EraId = eraId,
  currentIsland: EraId = islandEra,
): CityWritePayload {
  const snapshot = snapshotFromLoad(load);
  return {
    placements: snapshot.placements,
    civic: snapshot.civic ?? [],
    town_hall: snapshot.town_hall ?? null,
    roads: snapshot.roads ?? [],
    road_gold_spent: snapshot.road_gold_spent ?? 0,
    civic_material_spent: snapshot.civic_material_spent ?? 0,
    crisis_damage: snapshot.crisis_damage ?? NO_CRISIS_DAMAGE,
    era_id: eraId,
    island_era: islandEra,
    current_island: currentIsland,
  };
}

/** POST the whole city to the sub-scoped write endpoint. */
export function saveCityToApi(
  cityUrl: string,
  getToken: AccessTokenGetter,
): (city: CityWritePayload) => Promise<void> {
  return async (city) => {
    await apiPostJsonAuthenticated<{ saved: boolean }>(cityUrl, getToken, city);
  };
}

/** Atomically wipe one durable island while preserving its Hall and refilling its wallet. */
export function resetIslandOnApi(
  cityUrl: string,
  getToken: AccessTokenGetter,
): (eraId: EraId) => Promise<void> {
  return async (eraId) => {
    await apiPostJsonAuthenticated<{ reset: boolean }>(`${cityUrl}/reset`, getToken, {
      island_era: eraId,
    });
  };
}

export interface ApiCitySessionDeps {
  /** The signed-in student, for the session's own id. */
  studentId: UUID;
  /**
   * Advance the learning record's `lesson_stage` — `postLessonStage`, bound to the API.
   *
   * Separate from {@link save} because it is a different table with a different owner.
   * `POST /api/city` stores the layout and deliberately stores no learning record; the
   * stage goes to `POST /api/lesson/stage`, whose writes are monotonic server-side, so a
   * revisit cannot walk a built skill backwards however often this fires.
   *
   * Optional so a session built without it behaves exactly as this file did before the
   * route existed: forwarded to the in-memory session, mirrored to the city, and not
   * recorded.
   */
  saveLessonStage?: (nodeId: string, stage: "practice") => Promise<unknown>;
  /** Read the server's city — `loadCityFromApi`, hall seed included. */
  load: () => Promise<CityLoad>;
  /** Write it back — `saveCityToApi`. */
  save: (city: CityWritePayload) => Promise<void>;
  /** The live era. Defaults to the browser's era store. */
  eraId?: () => EraId;
  debounceMs?: number;
}

/**
 * A `CityDevSession` over the signed-in learner's stored city: every read and every mutation
 * runs against a session restored from `GET /api/city`, and every mutation is mirrored back
 * through `POST /api/city`.
 *
 * The returned object also carries {@link ApiCitySession.flush}, which the app calls on
 * `pagehide` exactly as it flushes the dev store, so a debounced save lands before the tab
 * goes away.
 */
export interface ApiCitySession extends CityDevSession {
  /**
   * Replace the hydrated read model with a freshly fetched canonical city.
   *
   * Used after diagnostic finalization, whose learning writes bypass this layout session.
   * Refuses to discard a queued layout save; the caller must flush successfully first.
   */
  rehydrate: (city: CityLoad) => Promise<void>;
  /** Write any queued snapshot right now (page hide, tests). */
  flush: () => Promise<void>;
  /** Whether the last save attempt failed and its snapshot is still queued. */
  hasUnsavedChanges: () => boolean;
  /**
   * Observe {@link hasUnsavedChanges}. Called on every change and never on a no-op, so a
   * `useSyncExternalStore` subscriber does not re-render on each debounced save that lands.
   * Returns the unsubscribe.
   */
  subscribeUnsaved: (listener: () => void) => () => void;
}

export function createApiCitySession(deps: ApiCitySessionDeps): ApiCitySession {
  const { studentId, load, save, saveLessonStage } = deps;
  const readEra = deps.eraId ?? cityEraId;
  const debounceMs = deps.debounceMs ?? DEFAULT_DEBOUNCE_MS;

  /**
   * THE ORDERING GUARANTEE. Every method below awaits this, so no mutation runs and no save
   * is queued against a session that has not been restored yet. A rejected hydrate rejects
   * every method with it, which drives `CitySurface`'s Retry surface — fail-closed, and the
   * right direction: an empty city posted over a real one is not recoverable, where a Retry
   * button is.
   */
  // The live session once it exists, for the two SYNCHRONOUS reads the interface has. Both
  // fail closed before hydration: no road spend to net out of the wallet, and no ruin to
  // offer a repair on. Neither is reachable by a learner, because the surface renders from
  // `load()` and that has not resolved either.
  let hydrated: CityDevSession | null = null;
  let ready: Promise<CityDevSession> | null = null;
  function hydrate(): Promise<CityDevSession> {
    if (ready !== null) {
      return ready;
    }
    const attempt = load().then((city) => createCityDevSession(snapshotFromLoad(city)));
    ready = attempt;
    attempt.then(
      (session) => {
        if (ready === attempt) {
          hydrated = session;
        }
      },
      () => {
        // Retry must be able to recover the session as well as the launch decision. The bundle
        // invalidates its rejected GET before trying again; dropping this rejected hydration
        // lets the next session.load() join that successful replacement promise.
        if (ready === attempt) {
          ready = null;
          hydrated = null;
        }
      },
    );
    return attempt;
  }
  // Eagerly share App's initial city GET with launch; a rejection is observed above and reset.
  void hydrate();

  let pending: CityWritePayload | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let inFlight: Promise<void> = Promise.resolve();
  let mutationTail: Promise<void> = Promise.resolve();

  /**
   * "A save has failed and its city is still queued." Not simply `pending !== null`: a
   * snapshot waiting out the 250ms debounce is normal and says nothing to a learner. This
   * flips only when an attempt has actually come back rejected, and back when one lands.
   */
  let unsaved = false;
  const unsavedListeners = new Set<() => void>();
  function setUnsaved(next: boolean): void {
    if (unsaved === next) {
      return;
    }
    unsaved = next;
    for (const listener of unsavedListeners) {
      listener();
    }
  }

  function write(): Promise<void> {
    timer = null;
    const city = pending;
    if (city === null) {
      return Promise.resolve();
    }
    inFlight = save(city).then(
      () => {
        // Only clear the queue on a save that landed. A pending snapshot left in place is
        // what makes the next gesture re-send this one.
        if (pending === city) {
          pending = null;
        }
        // Every save carries the WHOLE city, so one that lands clears the debt of every one
        // that did not — including the gestures made while the notice was up.
        setUnsaved(false);
      },
      () => {
        // Best-effort, exactly like the dev store. The snapshot stays queued; the whole city
        // is idempotent, so the retry costs one statement per table and no reconciliation.
        // The learner is told, which is the part that used to be missing: an unreported
        // failure here is indistinguishable from a save, and the tab is about to close.
        setUnsaved(true);
      },
    );
    return inFlight;
  }

  /**
   * Queue a debounced mirror of whatever the session now reports.
   *
   * AWAITED by its callers, which is not fussiness. `session.load()` is asynchronous even
   * though the in-memory session resolves immediately, so a `capture` left un-awaited sets
   * `pending` a microtask later — and `flush()` on `pagehide` would then post the snapshot
   * from BEFORE the gesture that triggered it. Measured while writing
   * `signedInCityPersists.test.tsx`: a place-then-move flushed the placement and dropped the
   * move (`expected col 4, received col -4`).
   */
  function capture(session: CityDevSession): Promise<void> {
    return session.load().then((city) => {
      pending = cityWriteFromLoad(city, readEra());
      if (timer === null) {
        timer = setTimeout(() => void write(), debounceMs);
      }
    });
  }

  /** Keep account mutations out of a deletion save/rollback gap. */
  function serializeMutation<T>(run: () => Promise<T>): Promise<T> {
    const result = mutationTail.then(run);
    mutationTail = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }

  /** Run a mutation on the hydrated session, then mirror it. */
  function mutate<T>(run: (session: CityDevSession) => Promise<T>): Promise<T> {
    return serializeMutation(async () => {
      const session = await hydrate();
      const result = await run(session);
      await capture(session);
      return result;
    });
  }

  /**
   * Civic deletion is the one city write whose UI must wait for the server verdict.
   * A rejected save restores the exact placement before rejecting, so the caller can keep
   * the confirmation open and truthfully say the building is still standing.
   */
  function removeCivicAndPersist(placementId: string) {
    return serializeMutation(async () => {
      const session = await hydrate();
      const before = await session.load();
      const placement = (before.civic ?? []).find(
        (candidate) => candidate.nodeId === placementId,
      );
      const result = await session.removeCivic(placementId);
      if (result.status === "missing") {
        return result;
      }

      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
      await inFlight;
      const after = await session.load();
      const deletion = cityWriteFromLoad(after, readEra());
      const attempt = save(deletion);
      inFlight = attempt.catch(noop);
      try {
        await attempt;
        pending = null;
        setUnsaved(false);
        return result;
      } catch (error: unknown) {
        if (placement) {
          const restored = await session.restoreCivicAfterFailedRemoval(placement);
          if (!restored) {
            throw new Error(
              `Account civic deletion failed and "${placementId}" could not be restored.`,
              { cause: error },
            );
          }
        }
        const rolledBack = await session.load();
        pending = cityWriteFromLoad(rolledBack, readEra());
        setUnsaved(true);
        throw error;
      }
    });
  }

  return {
    studentId,
    load: async () => (await hydrate()).load(),
    rehydrate: (city) =>
      serializeMutation(async () => {
        await inFlight;
        if (timer !== null || pending !== null || unsaved) {
          throw new Error(
            "Your city still has changes waiting to save. Try the handoff again.",
          );
        }
        const session = createCityDevSession(snapshotFromLoad(city));
        hydrated = session;
        ready = Promise.resolve(session);
      }),
    moveTownHall: (transform) => mutate((s) => s.moveTownHall(transform)),
    placeSkill: (nodeId, transform) => mutate((s) => s.placeSkill(nodeId, transform)),
    moveSkill: (nodeId, transform) => mutate((s) => s.moveSkill(nodeId, transform)),
    // ROADS AND THEIR SPEND TRAVEL TOGETHER, and one `city_state` row is what makes that
    // true server-side: `road_gold_spent` is on the row the same save writes. Persist one
    // without the other and the learner gets free roads, or material taken for roads that
    // are not there.
    layRoads: (cells, availableGold) => mutate((s) => s.layRoads(cells, availableGold)),
    removeRoads: (cells) => mutate((s) => s.removeRoads(cells)),
    roadGoldSpent: () => hydrated?.roadGoldSpent() ?? 0,
    // CIVIC PURCHASE AND RELOCATION — forwarded and mirrored exactly as
    // `withDevPersistence` forwards them, and for its stated reason: a bought building
    // that never reaches a snapshot vanishes on the next load while the material it cost
    // does not come back with it. `civicMaterialSpent` is a pure read, so it takes the
    // synchronous `hydrated` path `roadGoldSpent` takes and fails closed at 0 before
    // hydration — nothing bought, nothing to net out of the stockpile.
    //
    // The whole-city payload carries both civic placements and the legacy spent counter.
    // The server replaces the placement set but derives authoritative spend from its
    // append-only economy ledger, so removing a row can never manufacture a refund.
    placeCivic: (type, transform, availableMaterial) =>
      mutate((s) => s.placeCivic(type, transform, availableMaterial)),
    moveCivic: (placementId, transform) =>
      mutate((s) => s.moveCivic(placementId, transform)),
    removeCivic: removeCivicAndPersist,
    restoreCivicAfterFailedRemoval: (placement) =>
      mutate((s) => s.restoreCivicAfterFailedRemoval(placement)),
    // The catch-up's inherited seeding is another civic-layout mutation and mirrors on the
    // same whole-city path.
    seedCivicBuildings: (seats) => mutate((s) => s.seedCivicBuildings(seats)),
    civicMaterialSpent: () => hydrated?.civicMaterialSpent() ?? 0,
    crisisDamage: () => hydrated?.crisisDamage() ?? NO_CRISIS_DAMAGE,
    // A CRISIS'S DAMAGE IS MIRRORED LIKE ANY OTHER MUTATION, and unlike the civic half above
    // the server really does store it: `CityWritePayload.crisis_damage` is on the write
    // endpoint, so a signed-in learner's ruins survive the tab. Forwarding it here is also
    // what keeps the winter's carry-back one call rather than two — the surface asks the
    // session, and which session it got is not its business.
    recordCrisisDamage: (report) => mutate((s) => s.recordCrisisDamage(report)),
    repairRuinedBuilding: (nodeId) => mutate((s) => s.repairRuinedBuilding(nodeId)),
    reclaimRuinedCell: (cell) => mutate((s) => s.reclaimRuinedCell(cell)),
    liftSuspendedCivic: (placementId) => mutate((s) => s.liftSuspendedCivic(placementId)),
    verifyOverwrittenRecord: (damageId, correct) =>
      mutate((s) => s.verifyOverwrittenRecord(damageId, correct)),
    attemptStorm: (neighborhoodId) => mutate((s) => s.attemptStorm(neighborhoodId)),
    // THE CFU SIGNAL REACHES THE STAGE ROUTE; PRACTICE COMPLETION ALREADY LANDED.
    //
    // `POST /api/city` stores no `student_node_state` and still must not: Contracts §3 keeps
    // the mastery service the only writer of `mastery`, and a whole-city body composed by
    // the browser is precisely what may not assert one. What changed is that the record
    // finally has a writer of its own, so the CFU signal mirrors to the session and reports
    // `practice` to the lane that owns it.
    //
    // A FINISHED SET no longer goes to two requests. `POST /api/mastery/evidence` writes
    // mastery, `lesson_stage = done`, and both timestamps in one transaction before the
    // practice surface calls `advanceMasteryDev` with its receipt. This method mirrors that
    // confirmed receipt into the hydrated browser session for the immediate city refresh;
    // issuing `/lesson/stage` here would split an atomic server transition back into two.
    //
    // `setStageDev` stays session-only, because it is a genuine testing override with no
    // learner behind it — there is no evidence to record and nothing that should outlive
    // the tab.
    advanceMasteryDev: async (nodeId, toMastery) => {
      await mutate((s) => s.advanceMasteryDev(nodeId, toMastery));
    },
    markLessonTaught: async (nodeId) => {
      await mutate((s) => s.markLessonTaught(nodeId));
      await saveLessonStage?.(nodeId, "practice");
    },
    setStageDev: (nodeId, stage) => mutate((s) => s.setStageDev(nodeId, stage)),
    seedFromPlacement: (placementByNode, unlockedNodeIds) => {
      // A pretest on a server-backed session persists placement through the diagnostic API,
      // so `App.tsx` does not call this here — and it must not, because a reset would post an
      // empty city over the learner's island. Forwarded rather than stubbed so this object
      // stays a `CityDevSession` and the gate stays in one place.
      hydrate()
        .then((session) => {
          session.seedFromPlacement(placementByNode, unlockedNodeIds);
          return capture(session);
        })
        .catch(noop);
    },
    async flush() {
      await mutationTail;
      if (timer !== null) {
        clearTimeout(timer);
      }
      await write();
      await inFlight;
    },
    hasUnsavedChanges: () => unsaved,
    subscribeUnsaved(listener) {
      unsavedListeners.add(listener);
      return () => {
        unsavedListeners.delete(listener);
      };
    },
  };
}
