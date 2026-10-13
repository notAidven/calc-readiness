import { GOLD_MASTERY } from "@cr/mastery-service";
import { ERA_SEQUENCE, type EraId } from "@cr/skill-graph";

import type { CityDevSession, CityDevSnapshot } from "../city/citySession";
import type { IslandFoundingAuthority } from "../city/islandUnlockAuthority";
import type { RoadCell } from "../city/roads";
import { TOWN_HALL_ID } from "../city/townHall";
import type { CityLoad } from "../city/types";
import { cityEraId, setCityEra, subscribeCityEra } from "../city/useCityEra";
import type { PlacedTransform } from "../city/worldLayout";
import {
  type ArchipelagoState,
  archipelagoFrom,
  bayDamageMint,
  foundIsland,
  foundingLayout,
  type IslandLayout,
  type IslandRecord,
  isFounded,
  layoutFromLoad,
  layoutOf,
  resetPastIsland,
  standOn,
  withLayout,
} from "./islandState";

/**
 * **THE SESSION THAT KNOWS WHICH ISLAND IT IS STANDING ON.**
 *
 * `islandState.ts` is the model and this is the thing the app actually holds: a
 * {@link CityDevSession} whose ground is ONE island's, over an {@link ArchipelagoState} that
 * holds the rest of them. Every existing caller — `App.tsx`'s handlers, the economy
 * decorators, `CitySurface`'s writes — keeps working unchanged, because from outside this is
 * a `CityDevSession` and nothing more.
 *
 * ## THE ERA STORE IS THE NAVIGATION CONTROL, and that is the whole integration
 *
 * The obvious design is a `sailTo` that everything calls. It is the wrong one here, because
 * FOUR things already move the era and each would need teaching: the advance ceremony
 * (`completeCeremony`), the catch-up's landing (`landCatchUp`), the dev era control
 * (`DevEraSkip`), and `?era=` at boot. Every one of them means *"the city is now standing in
 * era N"*, which under the archipelago means *"the learner is now on era N's island"*.
 *
 * So this subscribes to `eraState`'s store instead, and **the era moving IS the landfall**.
 * An era with no island gets one founded (with its hall standing, §8.4) and is landed on; an
 * era that already has one is sailed back to, with everything the learner left there. The
 * payoff is that `CitySurface.completeCeremony` needed no edit at all: it still calls
 * the explicit Sail choice, and the learner arrives only after the destination is founded.
 *
 * {@link ArchipelagoSession.sailTo} exists for the navigation surface and is a thin
 * `setCityEra` over the same path, so a press on the bay and a completed ceremony land through
 * one mechanism rather than two.
 *
 * ## A LANDFALL REBUILDS THE INNER SESSION, WHICH IS WHY THERE IS A TAIL
 *
 * Swapping ground means: read what is standing here, keep it, and build a session over the
 * other island's ground. `createCityDevSession` restores a snapshot by plain assignment, so
 * rebuilding is cheap and — importantly — runs no placement rule, meaning an island restores
 * exactly as it was left.
 *
 * The read is asynchronous (`CityDevSession.load` is), so a landfall is asynchronous, so every
 * method here awaits {@link tail} first. That is `apiCitySession.ts`'s `ready` pattern and it
 * is load-bearing for the same reason: without it `CitySurface.refresh()` fired by the era
 * change could read the OLD island's ground and render era one's buildings on era two's beach.
 *
 * ## WHAT IS SHARED ACROSS A LANDFALL, AND WHY IT MUST BE
 *
 * `node_states` and the neighborhood checkpoints travel with the learner: they are what the
 * learner KNOWS, and an island that re-locked them would take a skill away for sailing. They
 * are carried into the rebuilt session verbatim, which is also what keeps the roster, the
 * mastery meter and every lesson door identical on both sides of a crossing.
 *
 * **THE DAMAGE MINT TRAVELS TOO, and that one is not obvious.** A repair spend is keyed
 * `n<damage_id>:<kind>:<subject>` (`@cr/economy`'s `materialSpend.ts`), so two islands that
 * both minted `d1` for a ruined hall would collide in the ledger and the second repair would
 * report `already_spent` — a ruin the economy believes is paid for and the learner cannot
 * clear. So a landfall raises the island's mint to the bay's high-water mark
 * ({@link bayDamageMint}), which makes ids monotone across the whole civilization rather than
 * only within one island.
 */

/** A `CityDevSession` over one island of an archipelago, plus the bay it belongs to. */
export interface ArchipelagoSession extends CityDevSession {
  /** The island the learner is standing on. Always `cityEraId()`. */
  standing: () => EraId;
  /** Every founded island, in sequence order. */
  islands: () => readonly EraId[];
  /** The whole bay, for the overview and for persistence. */
  snapshot: () => ArchipelagoState;
  /**
   * Found and unlock an island without moving the learner. Idempotent: an already-founded
   * island is unchanged and receives no second founding grant.
   */
  unlockIsland: (eraId: EraId, authority?: IslandFoundingAuthority) => Promise<void>;
  /**
   * Commit a canonical diagnostic prefix as one bay update. Durable founding grants remain
   * idempotent, so a rejected attempt can safely replay without publishing a partial bay.
   */
  unlockDiagnosticPrefix: (eraIds: readonly EraId[]) => Promise<void>;
  /**
   * Sail to an already-founded island. An unfounded destination is refused; founding requires
   * explicit exam or diagnostic authority through {@link unlockIsland}.
   */
  sailTo: (eraId: EraId) => Promise<void>;
  /** Reset a founded past island to its Hall and founding population. */
  resetIsland: (eraId: EraId) => Promise<void>;
  /**
   * Presenter-only atomic fixture transaction. The capability rejects unless the composition
   * root explicitly enabled presenter mutations; learner and account sessions never do.
   */
  completeEraForPresenter: (input: PresenterEraCompletion) => Promise<void>;
  /** Remove one disposable Presenter placement without changing its learning record. */
  removeBuildingForPresenter: (nodeId: string) => Promise<PresenterBuildingRemovalResult>;
  /** Observe landfalls and foundings. Returns the unsubscribe. */
  subscribeBay: (listener: () => void) => () => void;
  /** Stop watching the era store. Called when the app tears the session down. */
  dispose: () => void;
}

export interface PresenterEraCompletion {
  readonly eraId: EraId;
  /** Placed lesson-shortcut focus, normally reset to Foundation. */
  readonly focusNodeId: string;
  /** The separate current-era skill left untouched and absent from the island. */
  readonly unbuiltNodeId: string;
  /** Shared learning state required to make the target legitimately reachable. */
  readonly completedNodeIds: readonly string[];
  /** Every other skill building that stands on the target island. */
  readonly skillPlacements: readonly PlacedTransform[];
  /** Bought civic buildings in their completed, no-lesson state. */
  readonly civicPlacements: readonly PlacedTransform[];
  /** Deterministic, connected roads for the disposable target island. */
  readonly roadCells: readonly RoadCell[];
}

export interface PresenterBuildingRemovalResult {
  readonly nodeId: string;
  readonly status: "removed" | "protected" | "missing";
  readonly kind: "skill" | "civic" | null;
}

export interface ArchipelagoSessionDeps {
  /**
   * The session the learner is already standing in — hydrated, persisted, whatever the host
   * built. Taken rather than built so this wrapper never decides how an island is stored.
   */
  readonly initial: CityDevSession;
  /** Explicit standing era for hosts that seed a session before the era-store effect runs. */
  readonly standingEra?: EraId;
  /**
   * Build a session over another island's ground. The snapshot carries that island's layout
   * AND the learner's shared node states, so the host only has to decide persistence.
   */
  readonly makeIsland: (restoreFrom: CityDevSnapshot) => CityDevSession;
  /** Islands other than the one the learner is standing on, restored from storage. */
  readonly stashed?: readonly IslandRecord[];
  /** Called after every founding and every landfall, with the bay as it now is. */
  readonly onChange?: (state: ArchipelagoState) => void;
  /** Apply the idempotent founding grant before a new island becomes reachable. */
  readonly onFound?: (
    eraId: EraId,
    authority?: IslandFoundingAuthority,
  ) => void | Promise<void>;
  /** Reset that island's durable wallet before its layout is cleared. */
  readonly onReset?: (eraId: EraId) => void | Promise<void>;
  /** Persist the new current-island pointer before publishing a landfall. */
  readonly onLand?: (eraId: EraId, snapshot: CityDevSnapshot) => void | Promise<void>;
  /** Account sessions require exam/diagnostic authority; local/demo may retain dev navigation. */
  readonly requireExplicitFoundingAuthority?: boolean;
  /** Exact presenter composition only. False by default, including ordinary local/demo play. */
  readonly presenterMutationsEnabled?: boolean;
}

/** Structural capability check for callers that can consume the bay read-only. */
export function isArchipelagoSession(
  session: CityDevSession,
): session is ArchipelagoSession {
  return (
    "snapshot" in session &&
    "subscribeBay" in session &&
    "unlockIsland" in session &&
    "completeEraForPresenter" in session &&
    "removeBuildingForPresenter" in session &&
    typeof (session as Partial<ArchipelagoSession>).snapshot === "function" &&
    typeof (session as Partial<ArchipelagoSession>).subscribeBay === "function" &&
    typeof (session as Partial<ArchipelagoSession>).unlockIsland === "function" &&
    typeof (session as Partial<ArchipelagoSession>).completeEraForPresenter ===
      "function" &&
    typeof (session as Partial<ArchipelagoSession>).removeBuildingForPresenter ===
      "function"
  );
}

export function createArchipelagoSession(deps: ArchipelagoSessionDeps): ArchipelagoSession {
  const {
    initial,
    makeIsland,
    onChange,
    onFound,
    onReset,
    onLand,
    requireExplicitFoundingAuthority = false,
    presenterMutationsEnabled = false,
  } = deps;

  let inner: CityDevSession = initial;
  /**
   * The bay. Seeded with the island the learner is standing on and whatever storage kept,
   * with a PLACEHOLDER layout for the standing island — the real one is read out of `inner`
   * at the first landfall. Reading it eagerly would mean an async constructor.
   */
  let state: ArchipelagoState = (() => {
    const here = deps.standingEra ?? cityEraId();
    let seeded = archipelagoFrom(here, foundingLayout());
    for (const island of deps.stashed ?? []) {
      if (island.eraId !== here) {
        seeded = foundIsland(seeded, island.eraId, island.layout);
      }
    }
    return seeded;
  })();

  const listeners = new Set<() => void>();
  function publish(): void {
    onChange?.(state);
    for (const listener of listeners) {
      listener();
    }
  }

  /**
   * The landfall in flight, or a resolved promise. Every method awaits it, so no read and no
   * write can land on ground that is halfway between two islands.
   */
  let tail: Promise<void> = Promise.resolve();

  /**
   * Give each caller its own rejection while keeping the shared serialization tail usable.
   * A failed durable write therefore cannot poison later reads, retries, or unrelated writes.
   */
  function enqueue<T = void>(run: () => T | Promise<T>): Promise<T> {
    const operation = tail.then(run);
    tail = operation.then(
      () => undefined,
      () => undefined,
    );
    return operation;
  }

  /** Everything the rebuilt session needs: the learner, carried over, plus the new ground. */
  function snapshotFor(
    here: CityLoad,
    layout: IslandLayout,
    bayState: ArchipelagoState = state,
  ): CityDevSnapshot {
    return {
      node_states: here.node_states,
      neighborhood_states: here.neighborhood_state ? [here.neighborhood_state] : [],
      placements: layout.placements,
      roads: layout.roads,
      road_gold_spent: layout.road_gold_spent,
      town_hall: layout.town_hall,
      civic: layout.civic,
      civic_material_spent: layout.civic_material_spent,
      // THE MINT IS THE BAY'S, not the island's. See the header: an id reused on a second
      // island keys a repair the ledger has already recorded, and the ruin becomes unclearable.
      crisis_damage: {
        ...layout.crisis_damage,
        next_damage_id: Math.max(
          layout.crisis_damage.next_damage_id,
          bayDamageMint(bayState),
        ),
      },
    };
  }

  /**
   * **THE LANDFALL.** Keep what is standing here, then stand somewhere else.
   *
   * Ordered so nothing can be lost: the departing island's ground is read and written into the
   * bay BEFORE the new session replaces `inner`, so a rejected read leaves the learner exactly
   * where they were rather than on a blank island.
   *
   * ⚑ **WHERE THE LEARNER IS LEAVING FROM IS READ INSIDE THE TAIL, NOT AT THE CALL.** One sail
   * queues two landfalls — {@link ArchipelagoSession.sailTo} moves the era, the era store's
   * subscriber lands on it, and then `sailTo` awaits a landfall of its own so its promise
   * resolves on settled ground. Both are correct and the second is a no-op, but only because
   * of where `from` is read: captured at CALL time both would say "leaving era one", and the
   * second would then write era TWO's ground into era one's record and delete the city the
   * learner just left. Measured before the fix: era one came back bare, and its road spend
   * came back as 0.
   */
  function landOn(eraId: EraId): Promise<void> {
    return enqueue(async () => {
      const from = state.standing;
      if (from === eraId) {
        return;
      }
      let proposed = state;
      if (!isFounded(state, eraId)) {
        if (requireExplicitFoundingAuthority) {
          return;
        }
        await onFound?.(eraId);
        proposed = foundIsland(proposed, eraId);
      }
      const here = await inner.load();
      proposed = withLayout(proposed, from, layoutFromLoad(here));
      const there = layoutOf(proposed, eraId);
      if (there === null) {
        return;
      }
      proposed = standOn(proposed, eraId);
      const nextSnapshot = snapshotFor(here, there, proposed);
      // Durable pointer/layout first. No in-memory standing, inner session, era, or subscriber
      // notification changes until this succeeds.
      await onLand?.(eraId, nextSnapshot);
      state = proposed;
      inner = makeIsland(nextSnapshot);
      publish();
    });
  }

  /**
   * Found the destination while leaving the learner on the island under their feet.
   * The standing layout is captured first so publishing the newly founded bay cannot persist
   * the constructor's placeholder over a real city. The founded-set check sits inside the
   * serialized tail, making concurrent pass/reload calls one grant and one write.
   */
  function unlockIsland(eraId: EraId, authority?: IslandFoundingAuthority): Promise<void> {
    return enqueue(async () => {
      if (isFounded(state, eraId)) {
        return;
      }
      const here = await inner.load();
      state = withLayout(state, state.standing, layoutFromLoad(here));
      await onFound?.(eraId, authority);
      state = foundIsland(state, eraId);
      publish();
    });
  }

  function unlockDiagnosticPrefix(eraIds: readonly EraId[]): Promise<void> {
    const authoredPrefix = ERA_SEQUENCE.slice(0, eraIds.length).map((era) => era.id);
    if (
      eraIds.length === 0 ||
      eraIds.some((eraId, index) => eraId !== authoredPrefix[index])
    ) {
      return Promise.reject(
        new Error("A diagnostic island unlock must be a non-empty ERA_SEQUENCE prefix."),
      );
    }
    return enqueue(async () => {
      const missing = eraIds.filter((eraId) => !isFounded(state, eraId));
      if (missing.length === 0) {
        return;
      }
      const here = await inner.load();
      let proposed = withLayout(state, state.standing, layoutFromLoad(here));
      for (const eraId of missing) {
        await onFound?.(eraId, { source: "diagnostic" });
        proposed = foundIsland(proposed, eraId);
      }
      state = proposed;
      publish();
    });
  }

  /**
   * **THE ERA STORE IS THE CONTROL.** Anything that moves the era moves the learner, so the
   * ceremony's advance, the catch-up's landing and the dev era control all land through here
   * without knowing this module exists.
   */
  const unsubscribeEra = subscribeCityEra(() => {
    const era = cityEraId();
    if (era !== state.standing) {
      void landOn(era).catch(() => {
        // An external era request is provisional until its durable landing succeeds.
        if (cityEraId() !== state.standing) {
          setCityEra(state.standing);
        }
      });
    }
  });

  /** Run against the standing island, once any landfall has settled. */
  function on<T>(run: (session: CityDevSession) => T | Promise<T>): Promise<T> {
    return tail.then(() => run(inner));
  }

  return {
    get studentId() {
      return inner.studentId;
    },
    standing: () => state.standing,
    islands: () => state.islands.map((island) => island.eraId),
    snapshot: () => state,
    unlockIsland,
    completeEraForPresenter(input) {
      return enqueue(async () => {
        if (!presenterMutationsEnabled) {
          throw new Error("Presenter era completion is unavailable on this session.");
        }
        const completedNodeIds = new Set(input.completedNodeIds);
        const targetNodeIds = new Set(
          input.skillPlacements.map((placement) => placement.nodeId),
        );
        if (
          input.skillPlacements.length === 0 ||
          targetNodeIds.size !== input.skillPlacements.length ||
          !targetNodeIds.has(input.focusNodeId) ||
          targetNodeIds.has(input.unbuiltNodeId) ||
          completedNodeIds.has(input.unbuiltNodeId) ||
          input.skillPlacements.some((placement) => !completedNodeIds.has(placement.nodeId))
        ) {
          throw new Error("Presenter era completion received an incomplete skill layout.");
        }

        const here = await inner.load();
        const presentNodes = new Set(here.node_states.map((node) => node.node_id));
        if (
          !presentNodes.has(input.focusNodeId) ||
          !presentNodes.has(input.unbuiltNodeId)
        ) {
          throw new Error("Presenter era completion cannot find its demonstration skills.");
        }
        for (const nodeId of completedNodeIds) {
          if (!presentNodes.has(nodeId)) {
            throw new Error(`Presenter era completion cannot find skill "${nodeId}".`);
          }
        }
        const completedAt = "2026-08-11T00:00:00.000Z";
        const nodeStates = here.node_states.map((node) => {
          if (
            node.node_id === input.unbuiltNodeId ||
            (node.node_id === input.focusNodeId && !completedNodeIds.has(input.focusNodeId))
          ) {
            return {
              ...node,
              placement_estimate: 0 as const,
              mastery: 0 as const,
              mastery_updated_at: null,
              completion_status: "locked" as const,
              lesson_stage: "not_started" as const,
              last_practiced_at: null,
            };
          }
          return completedNodeIds.has(node.node_id)
            ? {
                ...node,
                mastery: GOLD_MASTERY,
                mastery_updated_at: completedAt,
                completion_status: "complete" as const,
                lesson_stage: "done" as const,
                last_practiced_at: completedAt,
              }
            : node;
        });
        const targetLayout: IslandLayout = {
          ...foundingLayout(),
          placements: [...input.skillPlacements],
          civic: [...input.civicPlacements],
          roads: [...input.roadCells],
        };

        let proposed = withLayout(state, state.standing, layoutFromLoad(here));
        if (!isFounded(proposed, input.eraId)) {
          await onFound?.(input.eraId);
          proposed = foundIsland(proposed, input.eraId, targetLayout);
        } else {
          proposed = withLayout(proposed, input.eraId, targetLayout);
        }
        proposed = standOn(proposed, input.eraId);
        const nextSnapshot = snapshotFor(
          { ...here, node_states: nodeStates },
          targetLayout,
          proposed,
        );
        await onLand?.(input.eraId, nextSnapshot);
        const nextInner = makeIsland(nextSnapshot);

        // One commit point: no subscriber can observe a founded-but-unbuilt target.
        state = proposed;
        inner = nextInner;
        publish();
        setCityEra(input.eraId);
      });
    },
    removeBuildingForPresenter(nodeId) {
      return enqueue(async () => {
        if (!presenterMutationsEnabled) {
          throw new Error("Presenter building removal is unavailable on this session.");
        }
        if (nodeId === TOWN_HALL_ID) {
          return { nodeId, status: "protected", kind: null };
        }

        const here = await inner.load();
        const skill = (here.placements ?? []).some(
          (placement) => placement.nodeId === nodeId,
        );
        const civic = (here.civic ?? []).some((placement) => placement.nodeId === nodeId);
        if (!skill && !civic) {
          return { nodeId, status: "missing", kind: null };
        }

        const targetLayout: IslandLayout = {
          ...layoutFromLoad(here),
          placements: (here.placements ?? []).filter(
            (placement) => placement.nodeId !== nodeId,
          ),
          civic: (here.civic ?? []).filter((placement) => placement.nodeId !== nodeId),
        };
        const proposed = withLayout(state, state.standing, targetLayout);
        const nextSnapshot = snapshotFor(here, targetLayout, proposed);
        await onLand?.(state.standing, nextSnapshot);
        const nextInner = makeIsland(nextSnapshot);

        state = proposed;
        inner = nextInner;
        publish();
        return {
          nodeId,
          status: "removed",
          kind: skill ? "skill" : "civic",
        };
      });
    },
    unlockDiagnosticPrefix,
    async sailTo(eraId) {
      if (!isFounded(state, eraId)) {
        if (requireExplicitFoundingAuthority) {
          return;
        }
        await unlockIsland(eraId);
      }
      await landOn(eraId);
      // Publish the era only after the durable landing has committed. The subscriber observes
      // an already-settled standing island and therefore performs no second write.
      setCityEra(eraId);
    },
    async resetIsland(eraId) {
      await tail;
      if (eraId === state.standing || !isFounded(state, eraId)) {
        return;
      }
      await onReset?.(eraId);
      state = resetPastIsland(state, eraId);
      publish();
    },
    subscribeBay(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    dispose: unsubscribeEra,

    load: () => on((s) => s.load()),
    moveTownHall: (transform) => on((s) => s.moveTownHall(transform)),
    placeSkill: (nodeId, transform) => on((s) => s.placeSkill(nodeId, transform)),
    moveSkill: (nodeId, transform) => on((s) => s.moveSkill(nodeId, transform)),
    layRoads: (cells, available) => on((s) => s.layRoads(cells, available)),
    removeRoads: (cells) => on((s) => s.removeRoads(cells)),
    // THE THREE SYNCHRONOUS READS forward to whichever island is standing, and that is exactly
    // right rather than a compromise: both spend counters are netted out of
    // `WalletView.spendable`, which is the LIVE era's material, and the live era is the
    // standing island's. `islandState.ts` carries the whole argument.
    roadGoldSpent: () => inner.roadGoldSpent(),
    civicMaterialSpent: () => inner.civicMaterialSpent(),
    crisisDamage: () => inner.crisisDamage(),
    placeCivic: (type, transform, pay) => on((s) => s.placeCivic(type, transform, pay)),
    moveCivic: (placementId, transform) => on((s) => s.moveCivic(placementId, transform)),
    removeCivic: (placementId) => on((s) => s.removeCivic(placementId)),
    restoreCivicAfterFailedRemoval: (placement) =>
      on((s) => s.restoreCivicAfterFailedRemoval(placement)),
    seedCivicBuildings: (seats) => on((s) => s.seedCivicBuildings(seats)),
    recordCrisisDamage: (report) => on((s) => s.recordCrisisDamage(report)),
    repairRuinedBuilding: (nodeId) => on((s) => s.repairRuinedBuilding(nodeId)),
    reclaimRuinedCell: (cell) => on((s) => s.reclaimRuinedCell(cell)),
    liftSuspendedCivic: (placementId) => on((s) => s.liftSuspendedCivic(placementId)),
    verifyOverwrittenRecord: (damageId, correct) =>
      on((s) => s.verifyOverwrittenRecord(damageId, correct)),
    attemptStorm: (neighborhoodId) => on((s) => s.attemptStorm(neighborhoodId)),
    advanceMasteryDev: (nodeId, toMastery) =>
      on((s) => s.advanceMasteryDev(nodeId, toMastery)),
    markLessonTaught: (nodeId) => on((s) => s.markLessonTaught(nodeId)),
    setStageDev: (nodeId, stage) => on((s) => s.setStageDev(nodeId, stage)),
    seedFromPlacement(placementByNode, unlockedNodeIds) {
      // THE ONE METHOD THAT DOES NOT WAIT ON THE TAIL, and it is deliberate:
      // `citySession.ts` keeps this synchronous because *"lesson and mastery callers
      // intentionally act on the seeded state in the same turn"*, and routing it through the
      // tail would break that contract for every caller including the single-island one. It
      // is safe here because a pretest hand-off is a boot-time reset of a learner who has one
      // island — there is no landfall for it to race.
      inner.seedFromPlacement(placementByNode, unlockedNodeIds);
    },
  };
}
