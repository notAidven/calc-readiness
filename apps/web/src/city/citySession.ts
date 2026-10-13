import { civicCatalogueRow } from "@cr/economy";
import {
  applyRecordVerification,
  type CheckpointWriter,
  type CrisisDamage,
  type CrisisDamageReport,
  clearRuinedBuilding,
  clearRuinedCell,
  clearSuspendedCivic,
  D1_NEIGHBORHOOD_ID,
  DEFAULT_STORM_ITEM_COUNT,
  DEFAULT_STORM_TIMER_BUDGET_MS,
  DIAGNOSTIC_MASTERY_PLACEMENT_GATE,
  foldCrisisDamage,
  gradeStorm,
  isNeighborhoodReady,
  NO_CRISIS_DAMAGE,
  ruinedBuilding,
  ruinedCell,
} from "@cr/game";
import { type DomainId, getNodesByScope, getProductNodes } from "@cr/skill-graph";
import type {
  ISODateTime,
  Mastery,
  NeighborhoodState,
  PlacementEstimate,
  StudentNodeState,
  UUID,
} from "@cr/state-schema";

import type { CivicPurchaseAsk, CivicPurchaseOutcome } from "../economy/economyClient";
import { civicPlacementId, civicSequenceAfter, parseCivicPlacementId } from "./civic";
import { civicOptionsForEra } from "./civicBuildings";
import { liveBuildableRadius } from "./liveIsland";
import {
  parseRoadCellKey,
  planRoadCommit,
  planRoadRemoval,
  type RoadCell,
  type RoadCommitStatus,
  roadCellKey,
} from "./roads";
import { TOWN_HALL_CENTER_TRANSFORM, TOWN_HALL_ID } from "./townHall";
import type { CityLoad, StormAttemptResult } from "./types";
import { cityEraId } from "./useCityEra";
import {
  BUILDABLE_RADIUS,
  findOpenCell,
  footprintFor,
  isPlacementValid,
  occupiedCells,
  type PlacedTransform,
  type PlacementRefusal,
  placementRefusal,
  type Transform,
} from "./worldLayout";

/**
 * In-app D1 city session (MVP demo, in-process only).
 *
 * The loop is driven entirely from a node-state seed plus `@cr/game`
 * construction/storm derivations — there is NO network I/O and NO auth client.
 *
 * It also holds no wallet, and that is now a SEPARATION rather than a deferral: the
 * cosmetic economy (gold, XP, spend, ownership, equipping) shipped in `@cr/economy`
 * and is driven beside this session through `useEconomy`, not inside it. The one
 * place the two meet is roads, whose gold spend this session records so a single
 * balance can be checked by both sinks (`roadGoldSpent`, `roadsEconomy.ts`).
 *
 * PLACEMENT (the approved layout feature): the island opens with only the PRE-SEEDED
 * Town Hall (the island hub — always present, at the centre) and no skills. The player
 * drops each skill's building anywhere open on the grid at a free transform (cell
 * + rotation) — placeable immediately, no first-placement gate — and that layout lives
 * HERE, in the in-app session (`placements`), never in the shared schema. A skill is
 * placeable once, and only a placed skill can advance mastery, so its building climbs
 * the phases. The hall is never placed by the player, only RELOCATED (`moveTownHall`).
 *
 * FROZEN BOUNDARY (Contracts §3): the game writes ONLY
 * `neighborhood_state.checkpoint_cleared`, and only through the game-owned
 * in-memory `CheckpointWriter` below — never `mastery`/`placement`, and it never
 * submits mastery evidence. `placeSkill` and `advanceMasteryDev` are in-app
 * session/DEV stand-ins for the layout + mastery/lesson lanes; neither is a game
 * write and neither touches `@cr/game` or the checkpoint writer.
 */

const DEMO_STUDENT_ID: UUID = "demo-student";

/**
 * The build stages the DEV stage-setter can force a PLACED node into (a testing
 * override — see `setStageDev`). These mirror the visible `BuildStage`s that map
 * to a distinct rendered model: an empty `site`, a `construction` scaffold, and the
 * finished `built` model. Full mastery renders as the same `built` model (there is
 * no gold-mastered stage); drive it with `advanceMasteryDev`.
 */
export type DevBuildStage = "site" | "construction" | "built";

/**
 * Map a forced dev build stage to the minimal `student_node_state` fields that
 * DERIVE it through `deriveConstructionState` (engines/game): `site` = untouched
 * ground, `construction` = mid-practice, `built` = lesson done (still unfinished).
 * Only `mastery` + `lesson_stage` drive the derivation; `completion_status` is kept
 * internally consistent. This is the SAME shape the real mastery lane would leave,
 * so a forced stage never contradicts `@cr/game`.
 */
function devStageNodeState(
  stage: DevBuildStage,
): Pick<StudentNodeState, "mastery" | "lesson_stage" | "completion_status"> {
  switch (stage) {
    // Complete (built): the practice set is finished. Mastery 1 (a below-bar finish)
    // still lands on the Complete stage — the score rides on top as MasteryStars.
    case "built":
      return { mastery: 1, lesson_stage: "done", completion_status: "complete" };
    // Construction: CFU passed, in the practice set — no evidenced mastery yet.
    case "construction":
      return { mastery: 0, lesson_stage: "practice", completion_status: "in_progress" };
    default:
      return { mastery: 0, lesson_stage: "not_started", completion_status: "locked" };
  }
}

/**
 * A serializable copy of everything this session holds in memory: the same three
 * collections `load()` reads, widened to every neighborhood rather than just D1.
 *
 * [Gabe lane — dev-only session persistence; see `devPersistence/devSession.ts`.]
 * Consumed only by the refresh-survival layer, which is INERT whenever the app is
 * server-backed. Restoring one is a plain state assignment (below): no rule in
 * this file re-runs, so a restored session is the session that was saved.
 */
export interface CityDevSnapshot {
  readonly node_states: readonly StudentNodeState[];
  readonly neighborhood_states: readonly NeighborhoodState[];
  readonly placements: readonly PlacedTransform[];
  /**
   * The road tiles the player has laid (the gold-sink layout feature) — one grid
   * cell each, on the SAME grid as buildings. In-app session state only, exactly
   * like `placements`. OPTIONAL for back-compat: a pre-roads snapshot omits it and
   * restores as an empty road layout (the save side always writes it).
   */
  readonly roads?: readonly RoadCell[];
  /**
   * NET gold sunk into roads — everything laid minus everything refunded on removal.
   * Held so the shared wallet can net it out after a refresh; without it a reload
   * would "refund" every road for free. Optional for back-compat; missing is 0.
   */
  readonly road_gold_spent?: number;
  /**
   * The island HUB's placement (a `PlacedTransform` keyed by `TOWN_HALL_ID`), or
   * `null` when the Town Hall has not been founded yet. Held separately from the
   * skill `placements` because the hall is NOT a skill node — this keeps the two
   * concepts distinct through save/restore.
   */
  readonly town_hall?: PlacedTransform | null;
  /**
   * The BOUGHT civic buildings, each a `PlacedTransform` whose `nodeId` is its civic
   * placement id (`civic.ts`). Held apart from `placements` for the same reason the
   * hall is: a civic building is not a skill node, so the node-set filter on restore
   * would drop every one of them. OPTIONAL for back-compat; missing restores as a city
   * that has bought nothing.
   */
  readonly civic?: readonly PlacedTransform[];
  /**
   * Era-material (stone) sunk into civic buildings — monotonic, since era one has no
   * teardown yet (O-4 is priced but unbuilt). Netted out of the one shared stockpile
   * so a refresh cannot hand the material back; the exact shape `road_gold_spent`
   * takes for gold, and for the same reason. Missing is 0.
   */
  readonly civic_material_spent?: number;
  /**
   * **WHAT A CRISIS DID, and the reason it survives a reload.**
   *
   * Held BESIDE `placements` and never inside it, which is the failure floor
   * (`@cr/game` — `crisis-damage.ts`) made structural: a ruined skill building is still
   * that node's building, on the same cell, with the same mastery and the same lesson, so
   * ruin is a set of node ids and there is no code path from "a crisis happened" to a
   * placement being deleted.
   *
   * OPTIONAL, and the optionality is why {@link DEV_SESSION_SCHEMA_VERSION} had to move.
   * An added optional field is caught by no compiler check and by no parser check either —
   * a v3 blob simply lacks it and restores as an undamaged city, which is the RIGHT answer
   * for a city that was never damaged and the wrong one for a `crisis_damage` written by
   * a build that spelled it differently. The version is part of the storage key, so
   * bumping is what makes the field's arrival legible in storage rather than only in this
   * type.
   */
  readonly crisis_damage?: CrisisDamage;
}

/** Why a civic purchase did not happen, or `"built"` when it did. */
export type CivicPurchaseStatus =
  | "built"
  /** The stockpile does not cover the catalogue price. Nothing spent, nothing placed. */
  | "insufficient_material"
  /** `placementRefusal` said no — off the island, overlapping, or sealing someone in. */
  | "refused"
  /** The id names no row of era one's catalogue. */
  | "unknown_type"
  | "wrong_era"
  | "unavailable";

/** The outcome of buying and placing one civic building (see `placeCivic`). */
export interface CivicPurchaseResult {
  readonly status: CivicPurchaseStatus;
  /** The catalogue price, so the caller can say it whatever the outcome. */
  readonly cost: number;
  /** Why the placement was refused; `null` unless `status === "refused"`. */
  readonly refusal: PlacementRefusal | null;
  /** The minted placement id — `null` unless `status === "built"`. */
  readonly placementId: string | null;
  /** Exact ledger status for diagnostics; null when payment was never attempted. */
  readonly economyStatus: CivicPurchaseOutcome["status"] | null;
}

/** The idempotent outcome of removing one paid civic placement. No refund is ever issued. */
export interface CivicRemovalResult {
  readonly placementId: string;
  readonly status: "removed" | "missing";
}

export type CivicPayment = (input: CivicPurchaseAsk) => Promise<CivicPurchaseOutcome>;

/** The outcome of an atomic road commit through the session (see `layRoads`). */
export interface RoadCommitResult {
  readonly status: RoadCommitStatus;
  /** Tiles actually laid (0 unless `status === "committed"`). */
  readonly laidCount: number;
  /** Gold the commit cost — spent only on `committed`. */
  readonly cost: number;
}

/** The outcome of removing road tiles through the session (see `removeRoads`). */
export interface RoadRemoveResult {
  /** Tiles that actually carried a road and were freed (0 when nothing matched). */
  readonly removedCount: number;
  /** Gold handed back — the FULL price those tiles cost (`roadRefund`). */
  readonly refund: number;
}

/**
 * What clearing one piece of crisis damage did, so the caller can tell "there was nothing
 * ruined here" apart from "it is repaired now".
 *
 * `damage_id` is the id of the ruin that was cleared — null on a miss. It is reported
 * rather than swallowed because it is the key the repair spend was made under
 * (`repair:<damage_id>:…`), so a caller that sequenced the two can confirm it cleared the
 * ruin it paid for and not a different one. The SPEND still has to read the id from
 * {@link CityDevSession.crisisDamage} first, since by the time this result exists the ruin
 * it names is gone.
 */
export interface RuinClearResult {
  readonly cleared: boolean;
  readonly damage_id: string | null;
}

export interface CityDevSession {
  readonly studentId: UUID;
  /** Read confirmed session state (node states + neighborhood checkpoint + layout). */
  load: () => Promise<CityLoad>;
  /**
   * RELOCATE the pre-seeded Town Hall (the HUB) to a new grid transform (D-TH9 — the
   * hall is movable like any building; purely spatial). The hall is never PLACED by the
   * player — it is pre-seeded at the island centre (design 2026-07-26) — only moved.
   * No-op if the target is off the island, overlaps another building, or would leave any
   * building unreachable on foot — a relocation can seal a neighbour in exactly as a
   * placement can, and the hub's 3×2 is the biggest wall on the island. Its own
   * footprint is ignored (the same ignore-self rule as `moveSkill`).
   */
  moveTownHall: (transform: Transform) => Promise<void>;
  /**
   * Drop a D1 skill's building at a free grid transform (the approved placement
   * feature; not a game write). No-op if the node is unknown, already placed, or
   * the transform would fall off the island, overlap another building (the hall
   * included — its occupied cells block a skill drop like any building's), or leave
   * any building with no walkable ground beside it.
   */
  placeSkill: (nodeId: string, transform: Transform) => Promise<void>;
  /**
   * RELOCATE an already-placed building to a new grid transform (the approved
   * move feature; not a game write). Purely SPATIAL — it never touches the node's
   * mastery / lesson_stage / completion / construction stage, so its stars and
   * progress just follow it to the new spot. The occupancy check IGNORES this
   * building's own current footprint, so it may shift by a single cell or drop
   * back onto its own spot; a move off the island, overlapping ANOTHER building, or
   * sealing any building off from walkable ground is a safe no-op, as is a move of an
   * unknown or not-yet-placed node.
   */
  moveSkill: (nodeId: string, transform: Transform) => Promise<void>;
  /**
   * ATOMICALLY lay road tiles (the gold-sink layout feature; not a game write).
   * All-or-nothing on `availableGold`, the SERVER-AUTHORITATIVE spendable balance
   * the caller reads from the economy wallet: if the legal tiles cost more than
   * that, NOTHING is laid and NOTHING is spent (never a partial purchase). Only
   * cells on buildable ground, clear of every building AND existing road, are laid;
   * the surface gates on the same math (`planRoadCommit`). Roads and buildings are
   * mutually exclusive on a cell, so a road can never block learning (INV-COS-1) —
   * only a cell.
   */
  layRoads: (
    cells: readonly RoadCell[],
    availableGold: number,
  ) => Promise<RoadCommitResult>;
  /**
   * Remove road tiles (frees the cells for building or re-laying) and REFUND what
   * they cost, in full — `roadRefund(n)`, derived from the same per-tile price the
   * lay charged, so a laid-then-removed tile is a no-op on the wallet and roads stay
   * risk-free to experiment with. Only cells that actually carry a road are freed
   * and paid: bare terrain, a building, and the hub are never removable, and a tile
   * already gone refunds nothing a second time (no double-credit). A cell with no
   * road is a safe no-op.
   */
  removeRoads: (cells: readonly RoadCell[]) => Promise<RoadRemoveResult>;
  /**
   * Net gold currently sunk into roads — laid minus refunded, clamped at zero. Read
   * by the wallet net-out, so a refund shows up as gold returning to the balance.
   */
  roadGoldSpent: () => number;
  /**
   * BUY one civic building of `type` and place it at a grid transform (era one
   * section 3's catalogue; not a game write). The session is the authority on both
   * halves and does them in one step, because a spend without a placement and a
   * placement without a spend are both states the city must never be in.
   *
   * ATOMIC AND FAIL-CLOSED, in this order:
   *   1. the type must be a row of the catalogue;
   *   2. `availableMaterial` — the authoritative stone stockpile, already net of
   *      prior civic spend — must cover the CATALOGUE price (never a caller's price,
   *      INV-COS-4). Short, and nothing is placed and nothing is spent;
   *   3. the transform must satisfy `placementRefusal`, the SAME gate `placeSkill`,
   *      `moveSkill` and `moveTownHall` go through, so a civic building can no more
   *      seal a neighbour in than a skill building can (D-ERA35, closing O-13).
   *
   * NOTHING HERE GATES LEARNING (INV-COS-1). A refused or unaffordable purchase is a
   * management outcome: no lesson, no mastery, no trial and no era advance reads any
   * of it, and the capacity it would have provided gates nothing either.
   */
  placeCivic: (
    buildingId: string,
    transform: Transform,
    pay: CivicPayment,
  ) => Promise<CivicPurchaseResult>;
  /**
   * RELOCATE an already-bought civic building, by its civic placement id. The spatial
   * twin of {@link moveSkill} for the BOUGHT half of the island, and deliberately its
   * twin rather than its own rule: it goes through the same `refuseLayoutWrite`, so a
   * civic building can no more seal a neighbour in by being moved than by being bought
   * (D-ERA35), and a move off the island or onto another occupant is a safe no-op.
   *
   * IT SPENDS NOTHING AND REFUNDS NOTHING, which is what separates it from
   * {@link placeCivic}. A move is purely spatial: the building is already paid for, so
   * `civicMaterialSpent` is untouched and the two capacities it contributes are
   * unchanged — they are properties of the type, never of where it stands. A move that
   * charged again, or that re-minted the id, would be a second purchase wearing a move's
   * name, which is why the id is looked up rather than issued here.
   */
  moveCivic: (placementId: string, transform: Transform) => Promise<void>;
  /**
   * Remove one BOUGHT civic placement without refunding its sunk era material.
   *
   * Civic identity is required and skill/Town Hall ids are therefore safe no-ops. Repeating
   * an already-landed removal reports `missing`, so retries cannot alter state twice.
   */
  removeCivic: (placementId: string) => Promise<CivicRemovalResult>;
  /**
   * Persistence rollback seam: restore the exact placement removed by a save that rejected.
   * It refunds nothing and is not wired to any player surface.
   */
  restoreCivicAfterFailedRemoval: (placement: PlacedTransform) => Promise<boolean>;
  /**
   * **STAND UP CIVIC BUILDINGS A CAUGHT-UP LEARNER INHERITED RATHER THAN BOUGHT**, at seats
   * the caller has already laid out — the catch-up's per-age seeding, one founded age at a
   * time (`catchup/civicSeats.ts` decides which and where).
   *
   * NOT A PURCHASE: nothing is spent and no era check applies, because every one of these was
   * bought by the city the learner walked into, in an age they have already walked past. It is
   * still a LAYOUT WRITE, so every seat goes through the same `refuseLayoutWrite` gate the
   * other five writes do, and a seat off the island or one that seals a neighbour in is
   * dropped rather than written. An id already standing is refused rather than overwritten.
   *
   * Returns the placement ids actually written, which is what makes "seated" distinguishable
   * from "refused" at the call site instead of two reads later.
   */
  seedCivicBuildings: (seats: readonly PlacedTransform[]) => Promise<readonly string[]>;
  /**
   * Era material sunk into civic buildings so far. Read by the stockpile net-out, the
   * same way `roadGoldSpent` is read by the gold one.
   */
  civicMaterialSpent: () => number;
  /**
   * The standing crisis damage: which buildings are ruined, which ground is scarred, and
   * which civic contributions are suspended. Read by the surface so a ruin is visible and
   * a repair is offerable; a fresh island reports {@link NO_CRISIS_DAMAGE}.
   */
  crisisDamage: () => CrisisDamage;
  /**
   * **FOLD ONE CRISIS RUN'S DAMAGE INTO THIS CITY — the only way damage gets IN.**
   *
   * Every other crisis-damage method here CLEARS, which is how a carry-back that wrote a
   * correct snapshot straight to `localStorage` could leave the running city untouched: there
   * was no way in, so the winter went round the session instead of through it and the object
   * the surface renders from never heard. `apps/web/src/city/carryBackReachesTheIsland
   * .test.tsx` is that defect, measured end to end.
   *
   * The fold itself is `@cr/game`'s (`foldCrisisDamage`), so this mints one damage id for the
   * run, keeps an already-ruined subject's original id, and advances the mint whether or not
   * anything new was recorded — none of which is re-decided here.
   *
   * PURELY A STATE WRITE, and the failure floor holds structurally rather than by discipline:
   * `CrisisDamageReport` carries node ids and cell keys and has no field for a placement, a
   * mastery or a lesson stage, so there is no shape of this call that can remove a building
   * or undo what the learner knows.
   *
   * Returns the city's standing damage AFTER the fold, so a caller can report what it did
   * without a second read racing the next write.
   */
  recordCrisisDamage: (report: CrisisDamageReport) => Promise<CrisisDamage>;
  /**
   * **CLEAR ONE BUILDING'S RUIN — the state half of a repair, never the payment half.**
   *
   * The material is spent through `@cr/economy` (`applyRepairSpend`), and the caller
   * sequences the two: read the ruin's damage id, spend under it, clear only on a spend that
   * landed. That ordering is deliberate and it is the safe one — a spend that succeeded
   * against a clear that did not costs the player material and leaves the ruin, which they
   * can see and retry (and the retry is free, because the ledger reports `already_spent`),
   * whereas a clear that succeeded against a spend that did not is a free repair with
   * nothing in the ledger to find it by. `crisisRepair.ts` owns the sequence.
   *
   * PURELY A STATE CLEAR. It never touches `placements`, `student_node_state`, mastery, the
   * lesson stage, or the checkpoint — repairing a building cannot change what the learner
   * knows any more than ruining it could.
   */
  repairRuinedBuilding: (nodeId: string) => Promise<RuinClearResult>;
  /**
   * Clear one scarred ground cell, freeing it to build or road on again. The state half of
   * a reclaim; see {@link repairRuinedBuilding} for the ordering against the spend.
   */
  reclaimRuinedCell: (cell: RoadCell) => Promise<RuinClearResult>;
  /**
   * **LIFT ONE CIVIC SUSPENSION — the shutters come off and the building works again.**
   *
   * The third of the three sets a crisis may leave behind, and the last to get a way out.
   * `@cr/game`'s `clearSuspendedCivic` is the clear itself, so nothing is re-decided here;
   * this is the same state-half-never-payment-half split the two ruin clears keep, and
   * `crisisRepair.ts` owns the ordering against the spend for all three.
   *
   * **THE PLACEMENT IS NEVER TOUCHED, only the flag.** A suspended building was standing
   * the whole time — the crisis withheld what it CONTRIBUTES and took nothing — so there is
   * nothing here to put back on the ground, and `civic` is not in scope. That is the
   * failure floor at its narrowest for the one consequence that never destroyed anything.
   */
  liftSuspendedCivic: (placementId: string) => Promise<RuinClearResult>;
  /**
   * Spend the one verification attached to an overwritten record. The damage id is the
   * authority: a stale or repeated attempt is a no-op, and no material is involved.
   */
  verifyOverwrittenRecord: (damageId: string, correct: number) => Promise<CrisisDamage>;
  /** Run the demo storm; on a genuine clear it sets the checkpoint (game-owned). */
  attemptStorm: (neighborhoodId: string) => Promise<StormAttemptResult>;
  /**
   * DEV-only mastery/lesson stand-in for the PRACTICE-COMPLETION step (never a game
   * write). Finishing the practice set advances a PLACED skill to Complete
   * (lesson_stage "done" / completion_status "complete") regardless of the score;
   * the evidenced mastery (`toMastery`, recorded monotonically) rides on top as the
   * MasteryStars quality. Without `toMastery`, advances one mastery tier (dev stepper).
   */
  advanceMasteryDev: (nodeId: string, toMastery?: Mastery) => Promise<void>;
  /**
   * DEV-only intermediate lesson signal for a PLACED skill (never a game write): the
   * learner finished teaching + passed the CFU and is entering the practice set, so
   * the building advances Foundation → CONSTRUCTION (lesson_stage "practice"). This
   * is the Foundation→Construction write-back the 3-step progression needs BEFORE
   * practice completes. Monotonic: only a node still at Foundation (not_started /
   * teaching) advances; mastery is never changed here. No-op for unplaced/unknown.
   */
  markLessonTaught: (nodeId: string) => Promise<void>;
  /**
   * DEV-only stage OVERRIDE (temporary, for testing): force a PLACED skill's
   * rendered build stage directly (site / construction / built) by writing the
   * node state that derives it. An additional override ALONGSIDE
   * `advanceMasteryDev`; never a game write. No-op for an unplaced/unknown node.
   */
  setStageDev: (nodeId: string, stage: DevBuildStage) => Promise<void>;
  /**
   * Reset the city to a fresh, just-diagnosed onboarding state, its blueprint
   * outlines seeded by the pretest's per-node placement (higher placement ->
   * taller ghost, `construction.ts`) and any prior checkpoint cleared.
   *
   * [Evan-lane: city pre-seeding — the test-out amendment is RATIFIED 2026-07-26,
   * by Gabe as diagnostic-lane owner and tie-break; Evan ack'd, Anthony did not.
   * Cite that ratification, never the old "ratified by docs PR #36", which was
   * false when it was written] Under the test-out amendment, PASSED nodes
   * (placement >= 2 — the `unlockedNodeIds`) are PRE-BUILT to complete
   * (lesson_stage "done") but at MASTERY 0 — zero of three stars. Test-out skips
   * the lesson, the CFU and the practice; the stars are still earned afterwards by
   * practising the already-built skill. FAILED nodes (0/1) stay unbuilt (mastery 0,
   * locked, not_started) and are earned through the lesson. Matches
   * `seedFromPlacement` below; see `docs/Contracts_Amendment_Diagnostic_TestOut_Unlock.md`
   * §8.1.
   */
  seedFromPlacement: (
    placementByNode: Readonly<Record<string, PlacementEstimate>>,
    unlockedNodeIds?: readonly string[],
  ) => void;
}

function seedNodeState(nodeId: string): StudentNodeState {
  return {
    student_id: DEMO_STUDENT_ID,
    node_id: nodeId,
    placement_estimate: 0,
    mastery: 0,
    mastery_updated_at: null,
    completion_status: "locked",
    lesson_stage: "not_started",
    last_practiced_at: null,
  };
}

/**
 * The pre-seeded Town Hall transform for a set of already-placed occupants: the island
 * CENTRE when it is free, else the nearest open cell. The hall is pre-seeded on every
 * island (design 2026-07-26) — the player never places it — so its occupancy must be
 * accounted for BEFORE any auto-layout runs. The fallback matters only for a MIGRATED
 * snapshot whose skills predate the hub: it guarantees the hub still arrives and never
 * lands on top of an existing building.
 *
 * EXPORTED FOR THE AUTHENTICATED LOAD, which is a second island that needs a hub and
 * must put it in the SAME cell. `apiCityLoad.ts` calls this over the server's placements
 * when `GET /api/city` carries no hall row, because a payload with no hall makes the
 * island centre look free to `CitySurface`'s occupancy check while the session the write
 * lands in has a hall sitting there — the placement is then refused for overlapping a
 * building the learner cannot see. Sharing this one function is what stops the two
 * islands seeding their hubs in different places; the alternative is a second copy of a
 * rule that has a fallback branch in it.
 */
export function seededTownHallTransform(occupants: readonly PlacedTransform[]): Transform {
  const fp = footprintFor(TOWN_HALL_ID);
  const occupied = occupiedCells(occupants);
  // ERA ONE'S DISC, NAMED, and it is the right one here rather than the live island's: the hub
  // is pre-seeded at the CENTRE and the fallback exists only for a migrated snapshot whose
  // skills predate it. Both live well inside 22, so a wider disc could only move the fallback
  // further from the centre than it needs to be — and this runs at load, before any surface has
  // published which island is standing.
  if (isPlacementValid(TOWN_HALL_CENTER_TRANSFORM, fp, occupied, BUILDABLE_RADIUS)) {
    return { ...TOWN_HALL_CENTER_TRANSFORM };
  }
  const open = findOpenCell(fp, occupied, BUILDABLE_RADIUS);
  return open
    ? { col: open.col, row: open.row, rot: open.rot }
    : { ...TOWN_HALL_CENTER_TRANSFORM };
}

/**
 * The six D1 skills, in registry order — derived from the shared skill-graph MVP scope
 * (`getNodesByScope("mvp")`).
 *
 * **THIS IS THE DIAGNOSTIC'S SCOPE, AND IT IS NO LONGER THE CITY'S NODE LIST.** It used to
 * be both, and the shared derivation was the point: the comment here said the two "can never
 * silently drift". They were the same six only because the city could hold nothing else, and
 * the moment the roster became the era's the two became different questions.
 *
 * **AND IT IS NO LONGER THE DIAGNOSTIC'S SCOPE EITHER.** The instrument is composed over
 * `@cr/item-bank`'s `DIAGNOSTIC_WALK_SCOPE` — twenty nodes across nine domains, derived from
 * the authored content — so this list is now era one's roster and nothing else. It used to
 * key the unlock reward popup's two card grids on the reasoning that they were about the
 * DIAGNOSTIC's nodes; that reasoning stopped holding with the widening, and using a
 * six-node list as a stand-in for a twenty-node administration is exactly how that screen
 * came to tell a learner they had tested out of 2 of 6 skills when they had tested out of 4
 * of 20. The grids read the era roster (`buildMenuEntries`) and the headline reads the
 * placement (`diagnostic/placementRosters.ts`).
 *
 * What is left keyed on it is era-one-shaped: `crisisSeed`'s buildable list, and the tests
 * that drive era one specifically.
 *
 * The city's own seed is {@link CITY_NODE_IDS} below.
 */
export const D1_NODE_IDS: readonly string[] = getNodesByScope("mvp").map((node) => node.id);

/**
 * Every node the city can hold a building for — the in-product registry, all 62.
 *
 * **WHY THE WHOLE REGISTRY AND NOT THE CURRENT ERA'S ROSTER.** The roster is the era's
 * (`@cr/game` — `cityRosterNodeIds`), and it GROWS while a session is alive: the era advance
 * ceremony moves the city on, and `App.tsx` builds one session for the component's lifetime.
 * A session seeded from the era it happened to start in would be missing rows for every
 * building the learner unlocked afterwards, and `placeSkill` no-ops on a node with no row —
 * so the ceremony would hand out an era whose buildings could not be placed. Seeding the
 * whole registry cannot go stale that way, and a row costs nothing: a seeded row is
 * `mastery 0` / `not_started` / unplaced, which is the same "nothing has happened here" the
 * absent row meant.
 *
 * The ERA still decides what the city OFFERS — `buildCityViewModel({ era_id })` is what the
 * roster, the build menu and the mastery meter read — so a later era's node having a row
 * here does not put it in front of the learner early.
 */
export const CITY_NODE_IDS: readonly string[] = getProductNodes().map((node) => node.id);

/**
 * Optional dev/preview SEED. Lets a DEV-only entry (the `?mock` preview hatch)
 * start the session from a fully-built city — node states AND their grid
 * placements — instead of the default EMPTY island, so the place / move / dev
 * flows are exercisable live against a real, mutable session. Never used on the
 * real (server-backed) path; production still opens on an empty island.
 */
export interface CityDevSeed {
  readonly nodeStates?: readonly StudentNodeState[];
  readonly placements?: readonly PlacedTransform[];
  /** Pre-found the Town Hall (a `PlacedTransform` keyed by `TOWN_HALL_ID`) for the preview. */
  readonly townHall?: PlacedTransform | null;
  /**
   * Pre-laid road tiles for a DEV preview hatch. Happiness coverage only in the
   * vitality dial (D-CIT7); never an input to the roster (D-CIT18).
   */
  readonly roads?: readonly RoadCell[];
  /**
   * Pre-bought civic buildings for a DEV preview hatch — `PlacedTransform`s keyed by
   * civic placement id. Seeded FREE (no material is deducted), exactly as the seeded
   * skill placements skip every lesson: a preview is a picture of a city, not a
   * replay of how it was paid for.
   */
  readonly civic?: readonly PlacedTransform[];
}

/**
 * `restoreFrom` (optional, FIRST) rehydrates a previously saved snapshot — the
 * dev-only refresh-survival path (its existing callers pass it positionally).
 * `seed` (optional) instead pre-places a whole city for the DEV `?mock` preview
 * hatch (see `CityDevSeed`). Both are omitted everywhere else, so the default
 * behaviour is byte-for-byte an empty island. The two are independent (the
 * `?mock` preview seeds without persisting); the seed is applied first and a
 * restored snapshot, if any, is applied last (it wins).
 */
export function createCityDevSession(
  restoreFrom?: CityDevSnapshot | null,
  seed?: CityDevSeed,
): CityDevSession {
  const studentId = DEMO_STUDENT_ID;

  // DEV mastery/lesson stand-in: the mutable `student_node_state` the mastery
  // lane owns. The game NEVER writes this (Contracts §3); it is only read to
  // derive construction/preview and to gate the storm checkpoint. Starts from the
  // full in-product node set (each not-started) and then applies any dev seed overrides.
  const nodeStates = new Map<string, StudentNodeState>(
    CITY_NODE_IDS.map((nodeId) => [nodeId, seedNodeState(nodeId)]),
  );
  for (const state of seed?.nodeStates ?? []) {
    nodeStates.set(state.node_id, { ...state });
  }

  // The free-form building layout (in-app session state only): node → grid
  // transform. Starts empty (the player drops each building where they like)
  // unless a dev seed pre-places a whole city for the preview hatch.
  const placements = new Map<string, Transform>();
  for (const p of seed?.placements ?? []) {
    placements.set(p.nodeId, { col: p.col, row: p.row, rot: p.rot });
  }

  // The road layout (in-app session state only): the set of ground-cell keys the
  // player has laid roads on, plus the NET gold sunk into them. Insertion
  // order is preserved so a persisted round-trip restores byte-for-byte. Starts
  // empty (the player lays their own roads) unless a DEV seed pre-lays a network
  // for a preview hatch, and is spatially exclusive with `placements` AND the
  // hall — a cell holds a road OR a building, never both.
  const roads = new Set<string>();
  for (const cell of seed?.roads ?? []) {
    roads.add(roadCellKey(cell.col, cell.row));
  }
  let roadGoldSpentValue = 0;

  // The BOUGHT civic layout (in-app session state only): placement id → grid
  // transform, in purchase order, plus the era material sunk into it. Insertion order
  // is preserved so a persisted round-trip restores byte-for-byte and the roster's
  // per-building order is stable. Spatially exclusive with `placements`, the hall and
  // `roads` through the one occupancy set below.
  const civic = new Map<string, Transform>();
  for (const placed of seed?.civic ?? []) {
    if (parseCivicPlacementId(placed.nodeId) !== null) {
      civic.set(placed.nodeId, { col: placed.col, row: placed.row, rot: placed.rot });
    }
  }
  let civicMaterialSpentValue = 0;
  /**
   * The next civic sequence number, through `civic.ts`'s shared rule — one past the
   * HIGHEST already in use, read out of the ids themselves rather than from the map's
   * size. The rule moved to the module that owns the id scheme when the catch-up's
   * inherited seeding became a second caller that has to mint against the same ids.
   */
  const nextCivicSequence = (): number => civicSequenceAfter(civic.keys());

  // WHAT A CRISIS DID (`@cr/game` — `crisis-damage.ts`). Held as one immutable value
  // rather than as parallel sets, so the monotone damage-id mint travels with the ruins it
  // stamped: an id that repeated would key a repair spend the ledger has already recorded
  // and hand out a second repair for free.
  let crisisDamageValue: CrisisDamage = NO_CRISIS_DAMAGE;

  // The island HUB's placement — the Town Hall (spec §4). Held SEPARATELY from the
  // skill `placements` because the hall is not a skill node: it never appears in
  // `student_node_state`, the skill roster's `N/6`, or the mastery pipeline. The hall
  // is PRE-SEEDED on every island (design 2026-07-26) — seeded at the island centre
  // just below unless a dev seed or a restored snapshot supplies its transform.
  let townHall: Transform | null = seed?.townHall
    ? { col: seed.townHall.col, row: seed.townHall.row, rot: seed.townHall.rot }
    : null;

  // The one shared learning-state write the game makes, held in memory for the
  // demo: `neighborhood_state.checkpoint_cleared`.
  const neighborhoodStates = new Map<string, NeighborhoodState>();

  let clock = Date.UTC(2026, 0, 1);
  const now = (): ISODateTime => {
    clock += 1000;
    return new Date(clock).toISOString();
  };

  // [Gabe lane — dev-only session persistence] Rehydrate a saved snapshot. This
  // is an ASSIGNMENT, not a replay: none of the placement / mastery / seeding
  // rules below run, so restoring cannot produce a state the session could not
  // already be in. Unknown node ids are dropped (a stale blob can never widen the
  // seeded node set), the owner id is re-stamped (so the checkpoint writer's owner
  // check still holds), and the monotonic clock is advanced past every restored
  // timestamp so later writes stay ordered after the ones they follow.
  if (restoreFrom) {
    for (const state of restoreFrom.node_states) {
      if (nodeStates.has(state.node_id)) {
        nodeStates.set(state.node_id, { ...state, student_id: studentId });
      }
    }
    for (const placed of restoreFrom.placements) {
      if (nodeStates.has(placed.nodeId)) {
        placements.set(placed.nodeId, {
          col: placed.col,
          row: placed.row,
          rot: ((placed.rot % 4) + 4) % 4,
        });
      }
    }
    // Roads are independent of the node set, so they restore unconditionally (as a
    // plain assignment — no placement/spend rule re-runs). The spent total rides
    // alongside so the wallet net-out survives the refresh (see `road_gold_spent`).
    for (const cell of restoreFrom.roads ?? []) {
      roads.add(roadCellKey(cell.col, cell.row));
    }
    roadGoldSpentValue = Math.max(0, restoreFrom.road_gold_spent ?? 0);
    // Civic buildings restore the same way, and for the same reason the hall does: they
    // are not nodes, so the node-set filter above would drop every one of them. An id
    // naming a type the catalogue no longer authors is dropped rather than resolved to
    // some other row (`civicTypeOf` returns null), which is the safe direction — a
    // building that vanishes is visible, and one silently re-typed is not.
    for (const placed of restoreFrom.civic ?? []) {
      if (parseCivicPlacementId(placed.nodeId) !== null) {
        civic.set(placed.nodeId, {
          col: placed.col,
          row: placed.row,
          rot: ((placed.rot % 4) + 4) % 4,
        });
      }
    }
    civicMaterialSpentValue = Math.max(0, restoreFrom.civic_material_spent ?? 0);
    // Crisis damage restores as a plain assignment, like the roads: the node-set filter
    // above would be wrong here, because a ruin may name the HALL (not a node) and a
    // dropped ruin is a building that silently repaired itself for free. A blob written
    // before crisis damage existed carries none and restores an undamaged city.
    crisisDamageValue = restoreFrom.crisis_damage ?? NO_CRISIS_DAMAGE;
    // The Town Hall placement is restored separately (it is not a node, so the
    // node-set filter above would drop it). A restored session is the session that
    // was saved — hall included.
    if (restoreFrom.town_hall) {
      townHall = {
        col: restoreFrom.town_hall.col,
        row: restoreFrom.town_hall.row,
        rot: ((restoreFrom.town_hall.rot % 4) + 4) % 4,
      };
    }
    for (const state of restoreFrom.neighborhood_states) {
      neighborhoodStates.set(state.neighborhood_id, { ...state, student_id: studentId });
    }
    for (const state of restoreFrom.node_states) {
      for (const stamp of [state.mastery_updated_at, state.last_practiced_at]) {
        const at = stamp === null ? Number.NaN : Date.parse(stamp);
        if (Number.isFinite(at) && at > clock) {
          clock = at;
        }
      }
    }
  }

  // PRE-SEED / MIGRATE the hub. Every island has a Town Hall from the start (design
  // 2026-07-26), so if neither a dev seed nor a restored snapshot supplied one, seed it
  // now — at the island centre, or the nearest open cell if a restored skill happens to
  // sit there. This is also the MIGRATION path: a dev-persistence snapshot saved before
  // the hub existed restores with `town_hall` absent, and this gives that session a hub
  // rather than leaving an island with no centre.
  if (townHall === null) {
    const placed: PlacedTransform[] = [...placements.entries()].map(([nodeId, t]) => ({
      nodeId,
      ...t,
    }));
    townHall = seededTownHallTransform(placed);
  }

  const readNodeStates = (): StudentNodeState[] =>
    [...nodeStates.values()].map((state) => ({ ...state }));

  // Game-owned checkpoint writer (Contracts §3), fail-closed on readiness: it
  // sets `checkpoint_cleared` only once every required node is mastered (>= 2),
  // and it never touches mastery/placement or any economy state.
  const checkpointWriter: CheckpointWriter = {
    clearCheckpoint({ student_id, neighborhood_id }) {
      if (student_id !== studentId) {
        return Promise.reject(
          new Error("city session: checkpoint write for a non-owner student"),
        );
      }

      const existing = neighborhoodStates.get(neighborhood_id);
      if (!isNeighborhoodReady(neighborhood_id, readNodeStates())) {
        const unchanged: NeighborhoodState = existing ?? {
          student_id,
          neighborhood_id,
          checkpoint_cleared: false,
        };
        return Promise.resolve({ ...unchanged });
      }

      const cleared: NeighborhoodState = {
        student_id,
        neighborhood_id,
        checkpoint_cleared: true,
      };
      neighborhoodStates.set(neighborhood_id, cleared);
      return Promise.resolve({ ...cleared });
    },
  };

  const readPlacements = (): PlacedTransform[] =>
    [...placements.entries()].map(([nodeId, t]) => ({ nodeId, ...t }));

  const readRoads = (): RoadCell[] => [...roads].map((key) => parseRoadCellKey(key));

  /** The bought civic buildings as `PlacedTransform`s, in purchase order. */
  const readCivic = (): PlacedTransform[] =>
    [...civic.entries()].map(([nodeId, t]) => ({ nodeId, ...t }));

  /** The Town Hall as a `PlacedTransform` (sentinel id), or null when unfounded. */
  const readTownHall = (): PlacedTransform | null =>
    townHall ? { nodeId: TOWN_HALL_ID, ...townHall } : null;

  /**
   * Every occupant on the grid — skill buildings, the Town Hall, and every BOUGHT
   * civic building — so placement validity accounts for all three the same way (the
   * hall reuses the ordinary occupancy math; spec §4.3, and `footprintFor` sizes a
   * civic id off the catalogue).
   *
   * CIVIC BUILDINGS ARE IN THE REACHABILITY WALK, NOT JUST THE OVERLAP SET, which is
   * the half that is easy to get wrong. This list is what `placementRefusal` walks
   * around (`others`), so a Campfire can be walled in by a later skill placement and a
   * Campfire can wall a skill building in — both refused, symmetrically. Leaving them
   * out would have made the bought half of the island invisible to D-ERA35 in exactly
   * the direction a player would notice: a blob of purchases with a skill building
   * sealed inside it.
   */
  const readOccupants = (): PlacedTransform[] => {
    const all = readPlacements();
    const hall = readTownHall();
    if (hall) {
      all.push(hall);
    }
    all.push(...readCivic());
    return all;
  };

  /**
   * The unified occupied-cell set every placement / move / road check gates on: skill
   * buildings + the Town Hall (the hall's reserved 3×2 hub cells included) + every
   * existing road tile. A cell holds a road XOR a building/hall, so this is what makes
   * that exclusion true in BOTH directions — a road can't be laid on a building or the
   * hub, and no building or the hub can be moved onto a road. `ignoreNodeId` drops one
   * occupant's own footprint for a relocation's ignore-self rule (roads are never
   * ignored — you can't relocate a building/hall onto a road even by a single cell).
   */
  const occupiedForPlacement = (ignoreNodeId?: string | null): Set<string> => {
    const cells = occupiedCells(readOccupants(), ignoreNodeId);
    for (const key of roads) {
      cells.add(key);
    }
    // SCARRED GROUND IS UNBUILDABLE UNTIL IT IS RECLAIMED, and this one line is the whole
    // of it: every placement, relocation and road commit already gates on this set, so
    // there is no fourth call site to remember. A crisis therefore reduces what the island
    // can hold without removing anything from it — the ruling's "visible scars", priced.
    //
    // Ruined ground is NEVER ignored, exactly like a road: `ignoreNodeId` exists so a
    // building can be dropped back onto its own footprint, and a scar under a building the
    // player is relocating is still a scar when they let go of it.
    for (const record of crisisDamageValue.ruined_cells) {
      cells.add(record.cell);
    }
    return cells;
  };

  /**
   * THE authoritative placement gate for every layout write below — bounds, overlap,
   * and reachability (Evan, 2026-07-29, closing O-13: a building may only be placed
   * where every building remains reachable on foot, and an invalid placement is
   * BLOCKED rather than penalised). The session is the authority; the surface gates on
   * the same `placementRefusal` so the ghost can never offer a drop this refuses.
   *
   * `nodeId` is always the ignore-self id: for a relocation that is the whole
   * ignore-self rule, and for a fresh placement it is a no-op (the node is not on the
   * grid yet). Roads block the CELL (they are in `occupiedForPlacement`) and never the
   * walk (they are absent from `others`), so nothing here gates on paving — INV-COS-1.
   */
  const refuseLayoutWrite = (
    nodeId: string,
    transform: Transform,
  ): PlacementRefusal | null =>
    placementRefusal({
      candidate: { nodeId, col: transform.col, row: transform.row, rot: transform.rot },
      others: readOccupants().filter((occupant) => occupant.nodeId !== nodeId),
      blockedCells: occupiedForPlacement(nodeId),
      // The disc the standing island is actually drawn at, from the shared live-island read.
      buildableRadius: liveBuildableRadius(),
    });

  /**
   * Serialize every layout mutation through one tail. A civic debit awaits an external
   * ledger call between validation and commit; nothing else may change occupancy in that
   * gap or the city could charge for a placement it can no longer commit.
   */
  let layoutWriteTail: Promise<void> = Promise.resolve();
  let layoutWritesPending = 0;
  const serializeLayoutWrite = <T>(write: () => T | Promise<T>): Promise<T> => {
    layoutWritesPending += 1;
    const result = layoutWriteTail.then(write);
    layoutWriteTail = result.then(
      () => {
        layoutWritesPending -= 1;
      },
      () => {
        layoutWritesPending -= 1;
      },
    );
    return result;
  };

  function load(): Promise<CityLoad> {
    const read = (): CityLoad => ({
      node_states: readNodeStates(),
      neighborhood_state: neighborhoodStates.get(D1_NEIGHBORHOOD_ID) ?? null,
      placements: readPlacements(),
      roads: readRoads(),
      road_gold_spent: roadGoldSpentValue,
      town_hall: readTownHall(),
      civic: readCivic(),
      civic_material_spent: civicMaterialSpentValue,
      crisis_damage: crisisDamageValue,
    });
    // Preserve the existing synchronous snapshot timing while the queue is idle; the dev
    // persistence wrapper depends on capturing before its caller's next mutation. A read
    // requested behind an in-flight civic debit waits and observes the committed layout.
    return layoutWritesPending === 0 ? Promise.resolve(read()) : layoutWriteTail.then(read);
  }

  function moveTownHall(transform: Transform): Promise<void> {
    return serializeLayoutWrite(() => {
      if (!townHall || refuseLayoutWrite(TOWN_HALL_ID, transform) !== null) {
        return;
      }
      townHall = {
        col: transform.col,
        row: transform.row,
        rot: ((transform.rot % 4) + 4) % 4,
      };
    });
  }

  function placeSkill(nodeId: string, transform: Transform): Promise<void> {
    return serializeLayoutWrite(() => {
      const state = nodeStates.get(nodeId);
      if (
        !state ||
        placements.has(nodeId) ||
        refuseLayoutWrite(nodeId, transform) !== null
      ) {
        return;
      }
      placements.set(nodeId, {
        col: transform.col,
        row: transform.row,
        rot: ((transform.rot % 4) + 4) % 4,
      });
      if (
        state.placement_estimate >= DIAGNOSTIC_MASTERY_PLACEMENT_GATE &&
        state.completion_status !== "complete"
      ) {
        nodeStates.set(nodeId, {
          ...state,
          mastery: 0,
          lesson_stage: "done",
          completion_status: "complete",
        });
      }
    });
  }

  function placeCivic(
    buildingId: string,
    transform: Transform,
    pay: CivicPayment,
  ): Promise<CivicPurchaseResult> {
    return serializeLayoutWrite(async () => {
      const row = civicCatalogueRow(buildingId);
      if (row === null) {
        return {
          status: "unknown_type",
          cost: 0,
          refusal: null,
          placementId: null,
          economyStatus: null,
        };
      }
      const currentEra = cityEraId();
      if (row.era !== currentEra) {
        return {
          status: "wrong_era",
          cost: row.cost,
          refusal: null,
          placementId: null,
          economyStatus: null,
        };
      }
      const option = civicOptionsForEra(currentEra).find(
        (candidate) => candidate.row.id === row.id,
      );
      if (option === undefined) {
        return {
          status: "unavailable",
          cost: row.cost,
          refusal: null,
          placementId: null,
          economyStatus: null,
        };
      }

      const placementId = civicPlacementId(row.id, nextCivicSequence());
      const refusal = refuseLayoutWrite(placementId, transform);
      if (refusal !== null) {
        return {
          status: "refused",
          cost: row.cost,
          refusal,
          placementId: null,
          economyStatus: null,
        };
      }

      const payment = await pay({ placementId, building: row.id });
      if (payment.status !== "spent" && payment.status !== "already_spent") {
        const status: CivicPurchaseStatus =
          payment.status === "insufficient_material"
            ? "insufficient_material"
            : payment.status === "wrong_era"
              ? "wrong_era"
              : payment.status === "unknown_building"
                ? "unknown_type"
                : "unavailable";
        return {
          status,
          cost: row.cost,
          refusal: null,
          placementId: null,
          economyStatus: payment.status,
        };
      }

      // All layout writes queue behind this transaction, but re-check at the commit seam
      // so the invariant is executable rather than dependent on the mutex comment.
      const commitRefusal = refuseLayoutWrite(placementId, transform);
      if (commitRefusal !== null) {
        throw new Error(
          `city: paid civic placement ${placementId} became spatially invalid before commit`,
        );
      }
      civic.set(placementId, {
        col: transform.col,
        row: transform.row,
        rot: ((transform.rot % 4) + 4) % 4,
      });
      return {
        status: "built",
        cost: row.cost,
        refusal: null,
        placementId,
        economyStatus: payment.status,
      };
    });
  }

  function moveCivic(placementId: string, transform: Transform): Promise<void> {
    return serializeLayoutWrite(() => {
      if (
        !civic.has(placementId) ||
        parseCivicPlacementId(placementId) === null ||
        refuseLayoutWrite(placementId, transform) !== null
      ) {
        return;
      }
      civic.set(placementId, {
        col: transform.col,
        row: transform.row,
        rot: ((transform.rot % 4) + 4) % 4,
      });
    });
  }

  function removeCivic(placementId: string): Promise<CivicRemovalResult> {
    return serializeLayoutWrite(() => {
      if (parseCivicPlacementId(placementId) === null || !civic.delete(placementId)) {
        return { placementId, status: "missing" };
      }
      // Deliberately leave `civicMaterialSpentValue` untouched. A placement disappears; the
      // purchase ledger and the era material already sunk into it do not run backwards.
      return { placementId, status: "removed" };
    });
  }

  function restoreCivicAfterFailedRemoval(placement: PlacedTransform): Promise<boolean> {
    return serializeLayoutWrite(() => {
      if (parseCivicPlacementId(placement.nodeId) === null || civic.has(placement.nodeId)) {
        return false;
      }
      civic.set(placement.nodeId, {
        col: placement.col,
        row: placement.row,
        rot: ((placement.rot % 4) + 4) % 4,
      });
      return true;
    });
  }

  /**
   * **STAND UP CIVIC BUILDINGS THE LEARNER INHERITED RATHER THAN BOUGHT** — the write half
   * of the catch-up's seeding, and the write half only.
   *
   * ## WHY THE SEATS COME IN AND THE SESSION DOES NOT COMPUTE THEM
   *
   * The first version of this feature computed them here, from `inheritedCivics.ts`, and that
   * import is what turned trunk red: `citySession` is inside the era advance's transitive
   * import closure (`EraAdvanceCeremony` → `CeremonyDevSkip` → `devSession` → here), and
   * `inheritedCivics` reached the catch-up lane for its layout — so the shipped advance could
   * suddenly see `foundingClock.ts`. `catchUpCannotShortenTheAdvance.test.ts` is the guard and
   * it was right: *"the mechanism by which the compression could reach the real advance is an
   * import, and this is that import not existing."*
   *
   * So the arrow is inverted rather than the guard loosened. **WHICH buildings and WHERE they
   * stand belong to the age being founded** (`catchup/civicSeats.ts`, which is the lane that
   * already owns `ringLayout`); what belongs here is the part only the session can do — the
   * id mint, the placement gate, and the map.
   *
   * ## NOTHING IS SPENT, AND EVERY SEAT STILL GOES THROUGH THE SHIPPED PLACEMENT RULE
   *
   * `civicMaterialSpentValue` is untouched, because no purchase happened: these were bought by
   * the city the learner inherited, in ages they have already walked past — `placeCivic` would
   * refuse every one of them `wrong_era` however full their wallet was. What is NOT bypassed is
   * `refuseLayoutWrite`, the one gate `placeSkill`, `moveSkill`, `placeCivic`, `moveCivic` and
   * `moveTownHall` all go through, so a seat that would fall off the island or seal a
   * neighbour in is dropped rather than written and the session can never hold a building its
   * own rule refuses.
   *
   * **FAIL-CLOSED ON AN ID ALREADY IN USE**, which is what keeps a per-age seeding honest: the
   * ages are seeded one founding at a time, so the caller mints against the ids already
   * standing (`civicSequenceAfter`), and a collision here would mean a second age silently
   * overwriting the first age's building rather than adding to it.
   *
   * Returns the ids actually written, so a caller can report what arrived without a second
   * read racing the next write — and so a test can tell "seated" from "refused".
   */
  function seedCivicBuildings(
    seats: readonly PlacedTransform[],
  ): Promise<readonly string[]> {
    return serializeLayoutWrite(() => {
      const written: string[] = [];
      for (const seat of seats) {
        if (parseCivicPlacementId(seat.nodeId) === null || civic.has(seat.nodeId)) {
          continue;
        }
        if (refuseLayoutWrite(seat.nodeId, seat) !== null) {
          continue;
        }
        civic.set(seat.nodeId, {
          col: seat.col,
          row: seat.row,
          rot: ((seat.rot % 4) + 4) % 4,
        });
        written.push(seat.nodeId);
      }
      return written;
    });
  }

  function civicMaterialSpent(): number {
    return civicMaterialSpentValue;
  }

  function moveSkill(nodeId: string, transform: Transform): Promise<void> {
    return serializeLayoutWrite(() => {
      if (
        !nodeStates.has(nodeId) ||
        !placements.has(nodeId) ||
        refuseLayoutWrite(nodeId, transform) !== null
      ) {
        return;
      }
      placements.set(nodeId, {
        col: transform.col,
        row: transform.row,
        rot: ((transform.rot % 4) + 4) % 4,
      });
    });
  }

  function layRoads(
    cells: readonly RoadCell[],
    availableGold: number,
  ): Promise<RoadCommitResult> {
    return serializeLayoutWrite(() => {
      // ATOMIC gold sink (never a game write). The session is the authority on both
      // occupancy and the spend: it reduces the draft to the legal, unpriced cells,
      // prices them, and commits ONLY if `availableGold` (the authoritative wallet
      // balance, already net of prior road spend) covers the whole cost — otherwise
      // NOTHING is laid and NOTHING is spent. Buildings block road cells and roads
      // block building cells, so laying a road can never displace a building or gate
      // a lesson (INV-COS-1); it only ever occupies an empty cell. `readOccupants`
      // includes the Town Hall, so its reserved 3×2 hub cells block a road too.
      // SCARRED GROUND BLOCKS A ROAD TOO, and it has to be added here rather than inherited:
      // this is the one gate that does NOT go through `occupiedForPlacement`, because
      // `planRoadCommit` wants the roads separately from everything else. A road paved over a
      // scar would hide the damage while charging for the paving, and the reclaim afterwards
      // would then have to argue with a road. Found by
      // `devPersistence/crisisDamagePersistence.test.ts`, which asserted the refusal before
      // this line existed and failed.
      const blocked = occupiedCells(readOccupants());
      for (const record of crisisDamageValue.ruined_cells) {
        blocked.add(record.cell);
      }
      const plan = planRoadCommit({
        draft: cells,
        buildingCells: blocked,
        roadCells: new Set(roads),
        availableGold,
        buildableRadius: liveBuildableRadius(),
      });
      if (plan.status === "committed") {
        for (const cell of plan.cells) {
          roads.add(roadCellKey(cell.col, cell.row));
        }
        roadGoldSpentValue += plan.cost;
        return {
          status: plan.status,
          laidCount: plan.cells.length,
          cost: plan.cost,
        };
      }
      return { status: plan.status, laidCount: 0, cost: plan.cost };
    });
  }

  function removeRoads(cells: readonly RoadCell[]): Promise<RoadRemoveResult> {
    return serializeLayoutWrite(() => {
      // Free the cells and REFUND what they cost, in full. `planRoadRemoval` reduces
      // the request to cells that actually carry a road, which is what makes the
      // refund safe: bare terrain, a building, and the hub are never in `roads`, so
      // they are neither freed nor paid, and a tile already removed refunds nothing a
      // second time (no double-credit on a repeated or racing click). The refund
      // subtracts from the cumulative spend the shared wallet nets out, so the balance
      // lands exactly where it was before those tiles were laid — never above it, since
      // every refunded tile was charged the same `ROAD_TILE_GOLD_COST` on the way in.
      const plan = planRoadRemoval({ cells, roadCells: roads });
      for (const cell of plan.cells) {
        roads.delete(roadCellKey(cell.col, cell.row));
      }
      roadGoldSpentValue = Math.max(0, roadGoldSpentValue - plan.refund);
      return {
        removedCount: plan.cells.length,
        refund: plan.refund,
      };
    });
  }

  function roadGoldSpent(): number {
    return roadGoldSpentValue;
  }

  function crisisDamage(): CrisisDamage {
    return crisisDamageValue;
  }

  function recordCrisisDamage(report: CrisisDamageReport): Promise<CrisisDamage> {
    // Serialized with the layout writes, and it has to be: `load()` waits on the same tail,
    // so a carry-back pressed while a placement is still settling cannot be read back as an
    // undamaged city by a snapshot taken in the gap.
    return serializeLayoutWrite(() => {
      crisisDamageValue = foldCrisisDamage(crisisDamageValue, report);
      return crisisDamageValue;
    });
  }

  function repairRuinedBuilding(nodeId: string): Promise<RuinClearResult> {
    return serializeLayoutWrite(() => {
      // The ruin's own damage id is read BEFORE the clear, because it is what the repair
      // spend was keyed by and it stops existing the moment the ruin does.
      const record = ruinedBuilding(crisisDamageValue, nodeId);
      if (record === null) {
        return { cleared: false, damage_id: null };
      }
      crisisDamageValue = clearRuinedBuilding(crisisDamageValue, nodeId);
      return { cleared: true, damage_id: record.damage_id };
    });
  }

  function reclaimRuinedCell(cell: RoadCell): Promise<RuinClearResult> {
    return serializeLayoutWrite(() => {
      const key = roadCellKey(cell.col, cell.row);
      const record = ruinedCell(crisisDamageValue, key);
      if (record === null) {
        return { cleared: false, damage_id: null };
      }
      crisisDamageValue = clearRuinedCell(crisisDamageValue, key);
      return { cleared: true, damage_id: record.damage_id };
    });
  }

  function liftSuspendedCivic(placementId: string): Promise<RuinClearResult> {
    return serializeLayoutWrite(() => {
      // The suspension's own damage id, read BEFORE the clear for the reason the two ruin
      // clears above read theirs: it is the spend's idempotency key and it stops existing
      // the moment the suspension does.
      const record =
        crisisDamageValue.suspended_civic.find(
          (entry) => entry.placement_id === placementId,
        ) ?? null;
      if (record === null) {
        return { cleared: false, damage_id: null };
      }
      crisisDamageValue = clearSuspendedCivic(crisisDamageValue, placementId);
      return { cleared: true, damage_id: record.damage_id };
    });
  }

  function verifyOverwrittenRecord(
    damageId: string,
    correct: number,
  ): Promise<CrisisDamage> {
    return serializeLayoutWrite(() => {
      crisisDamageValue = applyRecordVerification(crisisDamageValue, damageId, correct);
      return crisisDamageValue;
    });
  }

  function attemptStorm(neighborhoodId: string): Promise<StormAttemptResult> {
    const domain = neighborhoodId as DomainId;

    // DEV stand-in for storm gameplay: simulate a strong clear so the loop
    // (grade -> checkpoint) is demonstrable. Real play answers the prompts and
    // supplies `correct_count` + `time_remaining_ms` from the actual responses.
    // The game grades locally only; it NEVER submits mastery evidence and NEVER
    // writes mastery/placement (design §7, Contracts §3).
    const graded = gradeStorm({
      neighborhood_id: neighborhoodId,
      item_count: DEFAULT_STORM_ITEM_COUNT,
      correct_count: DEFAULT_STORM_ITEM_COUNT,
      time_remaining_ms: Math.round(DEFAULT_STORM_TIMER_BUDGET_MS / 2),
    });

    if (!graded.cleared) {
      const current = neighborhoodStates.get(domain);
      return Promise.resolve({
        cleared: false,
        checkpoint_cleared: current?.checkpoint_cleared ?? false,
      });
    }

    // Clear the checkpoint through the game-owned writer (fail-closed on
    // readiness): a clear on an unready neighborhood leaves the flag untouched.
    return checkpointWriter
      .clearCheckpoint({ student_id: studentId, neighborhood_id: domain })
      .then((state) => ({ cleared: true, checkpoint_cleared: state.checkpoint_cleared }));
  }

  function advanceMasteryDev(nodeId: string, toMastery?: Mastery): Promise<void> {
    // DEV ONLY — the PRACTICE-COMPLETION step: simulates the mastery/lesson lane
    // recording an evidenced practice set (lesson engine -> mastery-service ->
    // student_node_state). NOT a game write (never touches `@cr/game` or the
    // checkpoint writer). Only a PLACED skill advances; the next `load()` re-derives
    // construction, the cosmetic preview, and storm readiness from this state.
    //
    // Finishing the practice set COMPLETES construction — lesson_stage "done" /
    // completion_status "complete" — regardless of the score, so the building tops
    // out (Complete/built). The evidenced mastery rides on top as the MasteryStars
    // quality: with `toMastery`, record that exact level (monotonic, never lowered);
    // without it, advance one mastery tier (the dev stepper control).
    if (!placements.has(nodeId)) {
      return Promise.resolve();
    }
    const state = nodeStates.get(nodeId);
    if (!state) {
      return Promise.resolve();
    }
    const target =
      toMastery === undefined
        ? (Math.min(state.mastery + 1, 3) as Mastery)
        : (Math.max(state.mastery, toMastery) as Mastery);
    nodeStates.set(nodeId, {
      ...state,
      mastery: target,
      lesson_stage: "done",
      completion_status: "complete",
      mastery_updated_at: now(),
      last_practiced_at: now(),
    });
    return Promise.resolve();
  }

  function markLessonTaught(nodeId: string): Promise<void> {
    // DEV ONLY — the intermediate lesson signal (Foundation -> CONSTRUCTION). The
    // learner finished the teaching + CFU segment and is entering the practice set,
    // so a PLACED node still at Foundation advances to lesson_stage "practice" (which
    // derives the Construction stage). Monotonic: a node already in practice / done /
    // complete is left untouched, and mastery is NEVER changed here (the practice
    // set, via `advanceMasteryDev`, is what records mastery + completes). Not a game
    // write; the next `load()` re-derives the stage from this confirmed state.
    if (!placements.has(nodeId)) {
      return Promise.resolve();
    }
    const state = nodeStates.get(nodeId);
    if (!state) {
      return Promise.resolve();
    }
    // TRULY monotonic — the revisit menu (Review / Practice set / Infinite) can fire
    // this again on an already-built skill, and it must NEVER regress a Construction
    // or Complete building back to the Construction signal. Only a Foundation node
    // still SHORT of Construction advances: it must be at Foundation (lesson_stage
    // not_started / teaching) AND not yet mastered (< 2) AND not complete. A node in
    // practice / done, mastered, or complete is left untouched (mastery is never
    // changed here — the practice set, via `advanceMasteryDev`, records + completes).
    const atFoundation =
      state.lesson_stage === "not_started" || state.lesson_stage === "teaching";
    if (atFoundation && state.mastery < 2 && state.completion_status !== "complete") {
      nodeStates.set(nodeId, {
        ...state,
        lesson_stage: "practice",
        completion_status: "in_progress",
        last_practiced_at: now(),
      });
    }
    return Promise.resolve();
  }

  function setStageDev(nodeId: string, stage: DevBuildStage): Promise<void> {
    // DEV ONLY — force a PLACED node's rendered build stage by writing the minimal
    // `student_node_state` the mastery lane would leave for that stage. A testing
    // OVERRIDE alongside `advanceMasteryDev`: it is NOT a game write (never touches
    // `@cr/game` or the checkpoint writer), and the next `load()` re-derives the
    // construction stage, cosmetic preview, and storm readiness from this state.
    // Only a PLACED skill can be forced (an unplaced/unknown node is a safe no-op).
    if (!placements.has(nodeId)) {
      return Promise.resolve();
    }
    const state = nodeStates.get(nodeId);
    if (!state) {
      return Promise.resolve();
    }
    const time = now();
    nodeStates.set(nodeId, {
      ...state,
      ...devStageNodeState(stage),
      mastery_updated_at: time,
      last_practiced_at: time,
    });
    return Promise.resolve();
  }

  function seedFromPlacement(
    placementByNode: Readonly<Record<string, PlacementEstimate>>,
    unlockedNodeIds: readonly string[] = [],
  ): void {
    const applySeed = (): void => {
      // Reset to a fresh, just-diagnosed onboarding state: the full in-product node set,
      // each blueprint outline seeded by the pretest placement (missing nodes default to
      // 0 — which is every in-product node the instrument does not administer, 42 of the 62
      // at `DIAGNOSTIC_WALK_SCOPE`'s twenty). The island returns to empty (no placements)
      // and any prior checkpoint clears.
      //
      // --- Evan-lane (city pre-seeding, test-out RATIFIED 2026-07-26; 0 stars) -----
      // Test-out amendment: PASSED nodes (placement >= 2 — the `unlockedNodeIds`) are
      // PRE-BUILT to Complete (lesson_stage "done" / completion "complete") but at
      // mastery 0 — they drop in already built at 0/3 stars, so testing out only skips
      // the lesson + CFU + practice; stars are still earned by practicing afterward.
      // FAILED nodes (0/1) stay unbuilt (mastery 0, locked, not_started) and are earned
      // through the lesson — placement only pre-builds a node the diagnostic passed.
      // --- end Evan-lane -------------------------------------------------------
      const unlocked = new Set(unlockedNodeIds);
      nodeStates.clear();
      placements.clear();
      // A fresh, just-diagnosed island has no roads and no road spend on the clock.
      roads.clear();
      roadGoldSpentValue = 0;
      // …and nothing bought. The free Smokehouse (era one section 4) is NOT seeded here:
      // it contributes through `ERA_ONE_FREE_CIVIC` in the vitality derivation and has no
      // placement yet, so seeding one would double-count its 20 livability. Giving it a
      // plot is the coach-mark's business (O-8, Evan).
      //
      // ⚑ AND THE INHERITED CIVIC BUILDINGS ARE NOT SEEDED HERE EITHER, WHICH IS A MEASURED
      // DECISION RATHER THAN AN OMISSION. A caught-up learner does inherit their skipped
      // ages' civic buildings (`catchup/civicSeats.ts`), and seeding them at this hand-off
      // put them on ERA ONE'S DISC: the foundings that grow the island all run after this
      // point, so a four-age placement seated **1 of 24** while the same loadout seats in
      // full once the land has grown. They are seeded age by age as each age is founded
      // instead, which is where the island for them exists. The free Smokehouse's phantom
      // row is untouched by that: it is the STARTING city's, on every island cold or
      // caught-up, and the seeded era-one Smokehouse is a second, real building on a real
      // plot exactly as a bought one would be.
      civic.clear();
      civicMaterialSpentValue = 0;
      // ...and no crisis has happened to it. The MINT RESETS with the sets, which is safe
      // only because this is a reset to a brand-new city rather than a repair: there is no
      // surviving ruin for a re-minted id to collide with, and no unpaid repair to invalidate.
      crisisDamageValue = NO_CRISIS_DAMAGE;
      // Fresh onboarding island: skills are cleared, but the pre-seeded Town Hall stays —
      // every island keeps its hub from the start (design 2026-07-26). Reset it to the
      // island centre (placements + roads were just cleared, so the centre is free).
      townHall = { ...TOWN_HALL_CENTER_TRANSFORM };
      for (const nodeId of CITY_NODE_IDS) {
        const base: StudentNodeState = {
          ...seedNodeState(nodeId),
          placement_estimate: placementByNode[nodeId] ?? 0,
        };
        nodeStates.set(
          nodeId,
          unlocked.has(nodeId)
            ? {
                ...base,
                mastery: 0,
                lesson_stage: "done",
                completion_status: "complete",
              }
            : base,
        );
      }
      neighborhoodStates.clear();
    };

    // Preserve the established synchronous reset contract while the queue is idle: lesson
    // and mastery callers intentionally act on the seeded state in the same turn. Only a
    // real in-flight layout mutation needs ordering. In that case `load()` and every other
    // layout mutator already wait on the tail, so the reset cannot be overwritten by a
    // civic placement that finishes paying later.
    if (layoutWritesPending === 0) {
      applySeed();
      return;
    }
    void serializeLayoutWrite(applySeed);
  }

  return {
    studentId,
    load,
    moveTownHall,
    placeSkill,
    moveSkill,
    layRoads,
    removeRoads,
    roadGoldSpent,
    placeCivic,
    moveCivic,
    removeCivic,
    restoreCivicAfterFailedRemoval,
    seedCivicBuildings,
    civicMaterialSpent,
    crisisDamage,
    recordCrisisDamage,
    repairRuinedBuilding,
    reclaimRuinedCell,
    liftSuspendedCivic,
    verifyOverwrittenRecord,
    attemptStorm,
    advanceMasteryDev,
    markLessonTaught,
    setStageDev,
    seedFromPlacement,
  };
}
