import type { CrisisDamage } from "@cr/game";
import type { EraId } from "@cr/skill-graph";
import type { NeighborhoodState, StudentNodeState } from "@cr/state-schema";

import type { RoadCell } from "./roads";
import type { PlacedTransform } from "./worldLayout";

/**
 * The shape the city surface loads on entry. At MVP it is served by an in-file
 * mock seed (`mockCity.ts`) or the in-app dev session (`citySession.ts`); a
 * production loader would do an RLS-scoped read of the student's own node state
 * plus the neighborhood checkpoint. There is NO economy payload — but no longer
 * because the economy is deferred: it SHIPPED, and it is simply not this load's
 * business. Gold, XP, ownership and equipping are the economy client's
 * (`@cr/economy` + `apps/web/src/economy/`), read through `useEconomy` alongside
 * this payload rather than inside it. The mastery-derived cosmetic preview this
 * comment used to advertise is superseded; see `engines/game/src/cosmetic-preview.ts`.
 */
export interface CityLoad {
  /**
   * Server-owned first-use state. True after an authenticated Era 1 bootstrap or whenever the
   * API has found existing canonical account data. Absent on demo/dev and legacy servers.
   */
  launch_initialized?: boolean;
  node_states: readonly StudentNodeState[];
  neighborhood_state?: NeighborhoodState | null;
  /** Per-node authoring completeness; a missing node defaults to authoring-complete. */
  authoring_complete?: Readonly<Record<string, boolean>>;
  /**
   * Free-form building placements (the approved layout feature): which D1 skill
   * is built where, as a grid transform (cell + quarter-turn rotation). Purely
   * in-app session state (NOT a shared-schema/game write); a missing/empty array
   * means nothing has been built yet (a fresh, empty island).
   */
  placements?: readonly PlacedTransform[];
  /**
   * The road tiles the player has laid (the gold-sink layout feature): one grid
   * cell each, on the SAME grid buildings snap to. Purely in-app session state
   * (like `placements`, NOT a shared-schema/game write); a missing/empty array
   * means no roads. The server loader does not carry roads yet (dev-only feature).
   */
  roads?: readonly RoadCell[];
  /**
   * Cumulative gold spent laying roads (monotonic — removal never refunds). The
   * economy wallet nets this out so the balance survives a refresh without a
   * "free refund". Missing means 0.
   */
  road_gold_spent?: number;
  /**
   * The island HUB's placement — the Town Hall (a `PlacedTransform` keyed by
   * `TOWN_HALL_ID`), or `null`/absent when no hub is present. Held apart from
   * `placements` because the hall is NOT a skill node (it has no lesson, no mastery,
   * no `node_id`). Purely in-app session state.
   *
   * (Corrected 2026-07-26, Gabe: this said the hall is "the required FIRST placement
   * on the island, after which skill buildings unlock (spec §4)", and that absence
   * meant "not founded yet". The 2026-07-26 pre-seed redesign removed that gate — the
   * hall is pre-seeded and only ever relocated, and skills are placeable immediately.)
   */
  town_hall?: PlacedTransform | null;
  /**
   * The BOUGHT civic buildings standing on the island (era one section 3's catalogue),
   * each a `PlacedTransform` whose `nodeId` is its civic placement id (`civic.ts`).
   * Purely in-app session state, like `placements` and `roads`.
   *
   * Held apart from `placements` for the same reason the hall is: a civic building has
   * no `node_id`, no lesson and no mastery. It is what carries the city's livability and
   * happiness (D-ERA7), so it feeds the two capacities and the roster's per-building
   * roles — and nothing else. Missing/empty means the player has bought nothing.
   */
  civic?: readonly PlacedTransform[];
  /**
   * Era material (era one: stone) sunk into civic buildings. The stockpile nets this
   * out so a refresh cannot hand it back — the material-side sibling of
   * `road_gold_spent`. Missing means 0.
   */
  civic_material_spent?: number;
  /**
   * What a crisis did to this city and has not been repaired yet: ruined buildings,
   * scarred ground, suspended civic contributions (`@cr/game` — `crisis-damage.ts`).
   *
   * A READ-OUT of durable session state, exactly like `roads`. It is deliberately NOT part
   * of the learning payload: nothing here can gate a lesson, lower a mastery, or hide a
   * building — a ruined building is still in `placements` with the same node id, so every
   * surface that renders from placements renders the ruin, and the lesson behind it stays
   * one click away. Missing/absent means an undamaged city.
   */
  crisis_damage?: CrisisDamage;
  /** Present only when the server supports durable multi-island saves. */
  archipelago_version?: 1;
  /** The durable island under the learner's feet. */
  current_island?: EraId;
  /** Every founded island; absent from legacy/single-island payloads. */
  islands?: readonly CityIslandLoad[];
}

/** One place-owned partition inside an archipelago-capable city payload. */
export interface CityIslandLoad {
  readonly era_id: EraId;
  readonly placements: readonly PlacedTransform[];
  readonly roads: readonly RoadCell[];
  readonly road_gold_spent: number;
  readonly town_hall: PlacedTransform | null;
  readonly civic: readonly PlacedTransform[];
  readonly civic_material_spent: number;
  readonly crisis_damage: CrisisDamage;
}

/** Async, retryable state loader. Rejecting drives the fail-closed error surface. */
export type CityLoader = () => Promise<CityLoad>;

/** Confirmed outcome of a demo storm attempt (checkpoint-only; no economy). */
export interface StormAttemptResult {
  cleared: boolean;
  /** The game-owned `neighborhood_state.checkpoint_cleared` flag after the attempt. */
  checkpoint_cleared: boolean;
}

/**
 * Injected side-effect callbacks. `onStartLesson` navigates to the lesson shell
 * (navigation only); `onAttemptStorm` runs the demo storm and, on a genuine
 * clear, sets the checkpoint through the game-owned in-memory `CheckpointWriter`
 * (see `citySession.ts`). Returning `undefined` keeps them usable as plain no-ops
 * (e.g. in tests). There is deliberately NO cosmetic-spend handler: the
 * persistent economy is deferred to Contracts §8.
 */
export interface CityActionHandlers {
  /** Enter the lesson shell that teaches this node (navigation only). */
  onStartLesson?: (nodeId: string, lessonShell: string | null) => void;
  /** Begin (or replay) the neighborhood storm checkpoint. */
  onAttemptStorm?: (neighborhoodId: string) => Promise<StormAttemptResult> | undefined;
}

/** The secondary in-world surfaces reachable from lightweight entry points. */
export type CityEntrySurface = "diagnostic" | "lessons" | "checker";
