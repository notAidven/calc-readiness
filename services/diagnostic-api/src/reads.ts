import type { DataApiExecutor } from "@cr/db";
import type {
  DiagnosticAuthenticator,
  DiagnosticServerResponse,
} from "@cr/diagnostic-runtime";
import {
  computeStudentReadiness,
  type NeighborhoodStateRow,
  STUDENT_NODE_STATE_COLUMNS,
  type StudentNodeStateRow,
  toNeighborhood,
  toNodeState,
} from "@cr/diagnostic-runtime/aurora";
import { parseCivicPlacementId } from "@cr/economy";
import {
  type CrisisDamage,
  type CrisisOverwrittenRecord,
  type CrisisRuinedBuilding,
  type CrisisRuinedCell,
  type CrisisSuspendedCivic,
  D1_NEIGHBORHOOD_ID,
  NO_CRISIS_DAMAGE,
} from "@cr/game";
import { DIAGNOSTIC_WALK_SCOPE } from "@cr/item-bank";
import {
  ERA_SEQUENCE,
  type EraId,
  getNodesByScope,
  getProductNodes,
} from "@cr/skill-graph";
import type { NeighborhoodState, StudentNodeState, UUID } from "@cr/state-schema";

import { accountHasCanonicalState } from "./accountState";
import type { DiagnosticReadService } from "./app";
import { describeWriteFailure } from "./writes";

/**
 * The server-side read model behind `GET /api/city` and `GET /api/measurement`.
 * Both are Cognito-verified and scoped to the caller's `sub` (never the payload) —
 * the browser no longer reaches the DB, so these replace the old RLS-scoped
 * browser reads with the same guarantee enforced in the app layer instead
 * (Contracts §5; AWS-native migration).
 */

/**
 * Every product node a current or revisited island may render. The established MVP six stay
 * first for payload-order compatibility; the other 56 are appended once each.
 */
const MVP_NODE_IDS = getNodesByScope("mvp").map((node) => node.id);
const MVP_NODE_SET = new Set(MVP_NODE_IDS);
const CITY_NODE_IDS: readonly string[] = [
  ...MVP_NODE_IDS,
  ...getProductNodes()
    .map((node) => node.id)
    .filter((nodeId) => !MVP_NODE_SET.has(nodeId)),
];

/**
 * The denominator `GET /api/measurement` reports a pre/post gain over: the same node set
 * the walk administers (`@cr/item-bank`'s content-derived `DIAGNOSTIC_WALK_SCOPE`).
 *
 * It has to be the instrument's own scope and not the city's six, because `scope` is an
 * ARGUMENT here rather than a field on the record: coverage is depth-weighted, so
 * denominating a widened administration over six D1 nodes would report a fraction of a
 * different graph. `DIAGNOSTIC_WALK_SCOPE` is what `createAuroraWalkDiagnosticServer`
 * defaults its `config.scope` to, so the two sides of the same administration agree by
 * construction. The city read is independently the full product roster, because a returned
 * archipelago can contain any era's island.
 */
const MEASUREMENT_SCOPE: readonly string[] = DIAGNOSTIC_WALK_SCOPE;

/** A not-yet-diagnosed node: unbuilt, minimal blueprint (placement 0, mastery 0). */
function freshNodeState(studentId: UUID, nodeId: string): StudentNodeState {
  return {
    student_id: studentId,
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
 * One building on the city grid, in the shape the browser's `PlacedTransform` already
 * has (`apps/web/src/city/worldLayout.ts`). Structural rather than imported: a service
 * cannot depend on an app, and `test/cityReadModelParity.test.ts` holds the two equal
 * from outside both so the camel-cased `nodeId` here cannot drift from the one
 * `CitySurface` destructures.
 *
 * `nodeId` is the row's own `subject_id` — a skill's node id (`NUM.S`) or the hall's
 * sentinel (`town-hall`) — never a display name and never the `placement_id`.
 */
export interface CityPlacementRead {
  nodeId: string;
  col: number;
  row: number;
  rot: number;
}

/** One road tile, in the browser's `RoadCell` shape (`apps/web/src/city/roads.ts`). */
export interface CityRoadRead {
  col: number;
  row: number;
}

/**
 * THE WHOLE CITY A SIGNED-IN LEARNER GETS BACK, and until Wave 1 it was two fields of it.
 *
 * `GET /api/city` returned exactly `{ node_states, neighborhood_state }`, so `town_hall`,
 * `placements`, `civic`, `roads`, `road_gold_spent` and `crisis_damage` were all
 * permanently `undefined` for an authenticated player — the city was read from a payload
 * that could not describe one. `town_hall` is the load-bearing field: `CitySurface` computes
 * occupancy from this payload and writes to a session that has a hall at the island
 * centre, so a payload with no hall makes the centre look free, the placement ghost
 * targets the hall's own cells, and the write is silently refused. The learner's very
 * first action fails.
 *
 * Every field below is read from a real table (`0004_civilization_state.sql`), and every
 * field below is now WRITTEN by one: `writes.ts` stores skill, civic and hub layout, the
 * roads, the road spend and the crisis damage behind `POST /api/city`.
 *
 * ONE FIELD THIS DELIBERATELY DOES NOT CARRY, so its absence reads as a decision:
 *
 *  * `city_state.era_id`. **The era is now STORED — the writer has no choice, because the
 *    column is `not null` and `road_gold_spent` shares its row — and it is still not READ.**
 *    Re-assessed with the writer in hand rather than carried over: (1) the ledger is not
 *    persisted, so a signed-in learner's wallet is minted empty on every load and
 *    re-derived at whatever era the client stands in, which means the era at load
 *    DENOMINATES a wallet rebuilt from nothing (§3.5's coupling, dissolved by the ledger
 *    arriving and by nothing else); and (2) adopting a server era at load introduces a
 *    demotion this change cannot make safe — the mirror is best-effort after each mutation,
 *    so a lost POST would leave the browser in era five and the row in era four, and the
 *    next load would put the learner back in era four over an island still covered in
 *    era-five buildings. A lost placement costs a gesture they can repeat; a lost era
 *    advance costs a ceremony they cannot. It lands with the ledger (Wave 2 G).
 */
export interface CityIslandRead {
  readonly era_id: EraId;
  readonly placements: readonly CityPlacementRead[];
  readonly civic: readonly CityPlacementRead[];
  readonly roads: readonly CityRoadRead[];
  readonly road_gold_spent: number;
  readonly civic_material_spent: number;
  readonly town_hall: CityPlacementRead | null;
  readonly crisis_damage: CrisisDamage;
}

export interface CityRead {
  /**
   * Server-owned first-use marker. True for a bootstrapped founding or any pre-existing
   * diagnostic, learning, city, or economy state; unlike the browser cache, it follows the
   * account across devices.
   */
  launch_initialized: boolean;
  node_states: readonly StudentNodeState[];
  neighborhood_state: NeighborhoodState | null;
  /** Skill buildings only — the hall and bought civic buildings have separate fields. */
  placements: readonly CityPlacementRead[];
  /** Bought civic buildings, keyed by their canonical structured placement ids. */
  civic: readonly CityPlacementRead[];
  roads: readonly CityRoadRead[];
  /** Net material sunk into roads; travels with `roads` or neither is meaningful. */
  road_gold_spent: number;
  /** The island hub, or null when this student has no hall row yet. */
  town_hall: CityPlacementRead | null;
  crisis_damage: CrisisDamage;
  civic_material_spent: number;
  /** Capability marker: absent on a pre-archipelago server, so the client falls back safely. */
  archipelago_version: 1;
  current_island: EraId;
  islands: readonly CityIslandRead[];
}

/** `city_placement`, as the Data API hands it back (`row` is reserved in Postgres). */
interface CityPlacementRow {
  island_era: EraId;
  placement_id: string;
  kind: string;
  subject_id: string;
  grid_col: number;
  grid_row: number;
  rot: number;
}

interface CityRoadRow {
  island_era: EraId;
  grid_col: number;
  grid_row: number;
}

interface CityStateRow {
  current_island: EraId;
}

interface CityIslandStateRow {
  island_era: EraId;
  road_gold_spent: number;
  civic_material_spent: number;
  next_damage_ordinal: number;
}

interface CityCrisisDamageRow {
  island_era: EraId;
  damage_ordinal: number;
  damage_id: string;
  subject_kind: string;
  subject: string;
  bands_dark: number | null;
  verification_attempted: boolean | null;
}

function toPlacement(row: CityPlacementRow): CityPlacementRead {
  return {
    nodeId: row.subject_id,
    col: row.grid_col,
    row: row.grid_row,
    rot: row.rot,
  };
}

function toCivicPlacement(row: CityPlacementRow): CityPlacementRead {
  const parsed = parseCivicPlacementId(row.placement_id);
  if (parsed === null || parsed.legacy || parsed.catalogueId !== row.subject_id) {
    throw new Error(
      `civic placement identity mismatch: "${row.placement_id}" does not name subject "${row.subject_id}"`,
    );
  }
  return {
    nodeId: row.placement_id,
    col: row.grid_col,
    row: row.grid_row,
    rot: row.rot,
  };
}

/**
 * Rebuild the browser's `CrisisDamage` from its rows, mint included.
 *
 * ⚑ `storedMint` IS THE MINT, and the rows are only a floor under it. This used to be the
 * other way round and it was a defect waiting for a writer, recorded here as such: a
 * derivation over the rows that SURVIVE satisfies the strictly-greater invariant over rows
 * present and goes BACKWARDS the moment a repair deletes the highest-ordinal ones, because
 * a repair DELETES the row (`grant … delete on public.city_crisis_damage`). A re-issued
 * ordinal keys a repair spend the ledger has already recorded, so the second ruin reports
 * `already_spent` — a ruin the economy believes is paid for and the learner cannot clear.
 *
 * `city_state.next_damage_ordinal` (`0005_city_damage_mint.sql`) is the high-water mark the
 * writer advances with `greatest(…)`, so it cannot be pulled down by a repair or by a stale
 * client. Taking the GREATER of the two is belt and braces: a student whose damage rows
 * predate the column, or who has damage and no `city_state` row at all, still gets a mint
 * strictly above every ordinal present. Both directions are pinned in `writes.test.ts`.
 */
function toCrisisDamage(
  rows: readonly CityCrisisDamageRow[],
  storedMint: number,
): CrisisDamage {
  if (rows.length === 0) {
    return storedMint <= 1
      ? NO_CRISIS_DAMAGE
      : { ...NO_CRISIS_DAMAGE, next_damage_id: storedMint };
  }
  const ruined_buildings: CrisisRuinedBuilding[] = [];
  const ruined_cells: CrisisRuinedCell[] = [];
  const suspended_civic: CrisisSuspendedCivic[] = [];
  const overwritten_records: CrisisOverwrittenRecord[] = [];
  let highest = 0;
  for (const row of rows) {
    highest = Math.max(highest, row.damage_ordinal);
    switch (row.subject_kind) {
      case "building":
        ruined_buildings.push({ node_id: row.subject, damage_id: row.damage_id });
        break;
      case "ground":
        ruined_cells.push({ cell: row.subject, damage_id: row.damage_id });
        break;
      case "civic":
        suspended_civic.push({ placement_id: row.subject, damage_id: row.damage_id });
        break;
      case "record":
        if (
          row.bands_dark !== null &&
          row.verification_attempted !== null &&
          row.bands_dark >= 1 &&
          row.bands_dark <= 9
        ) {
          overwritten_records.push({
            placement_id: row.subject,
            damage_id: row.damage_id,
            bands_dark: row.bands_dark,
            verification_attempted: row.verification_attempted,
          });
        }
        break;
      default:
        // An enum value this build does not know is a row a newer writer left behind.
        // Dropping it is the safe direction: an unrendered ruin is a city that looks
        // repaired, where a mis-sorted one is a ruin nothing can clear.
        break;
    }
  }
  return {
    next_damage_id: Math.max(storedMint, highest + 1),
    ruined_buildings,
    ruined_cells,
    suspended_civic,
    overwritten_records,
  };
}

/**
 * Load a student's whole city: their own `student_node_state` + the D1
 * `neighborhood_state` checkpoint + the layout, the road spend and the standing crisis
 * damage. Always renders the full product node set: DB rows where present, a fresh unbuilt
 * node for any node the student hasn't reached yet. This is how a completed
 * pretest's placement survives reloads and follows the student across devices — the
 * seed lives in Aurora, not the tab.
 *
 * The four layout reads are issued together rather than one per section: they are
 * independent `select`s scoped to the same `student_id`, and a city assembled from
 * partial results is exactly the half-loaded state the browser store refuses a blob
 * for. One rejection fails the whole read, which `scoped()` turns into a 500 and
 * `CitySurface` turns into its Retry surface.
 */
export async function loadCityFromAurora(
  db: DataApiExecutor,
  studentId: UUID,
): Promise<CityRead> {
  const sid = { sid: studentId };
  const [
    launch_initialized,
    rows,
    neighborhoods,
    placementRows,
    roadRows,
    stateRows,
    islandStateRows,
    damageRows,
  ] = await Promise.all([
    accountHasCanonicalState(db, studentId),
    db.query<StudentNodeStateRow>(
      `select ${STUDENT_NODE_STATE_COLUMNS} from public.student_node_state
       where student_id = :sid::uuid`,
      sid,
    ),
    db.query<NeighborhoodStateRow>(
      `select student_id, neighborhood_id, checkpoint_cleared from public.neighborhood_state
       where student_id = :sid::uuid and neighborhood_id = :nid`,
      { ...sid, nid: D1_NEIGHBORHOOD_ID },
    ),
    db.query<CityPlacementRow>(
      `select island_era, placement_id, kind, subject_id, grid_col, grid_row, rot
       from public.city_placement
       where student_id = :sid::uuid
       order by island_era, created_at, placement_id`,
      sid,
    ),
    db.query<CityRoadRow>(
      `select island_era, grid_col, grid_row from public.city_road
       where student_id = :sid::uuid
       order by island_era, grid_col, grid_row`,
      sid,
    ),
    db.query<CityStateRow>(
      `select current_island from public.city_state
       where student_id = :sid::uuid`,
      sid,
    ),
    db.query<CityIslandStateRow>(
      `select island_era, road_gold_spent, civic_material_spent, next_damage_ordinal
       from public.city_island_state
       where student_id = :sid::uuid
       order by island_era`,
      sid,
    ),
    db.query<CityCrisisDamageRow>(
      `select island_era, damage_ordinal, damage_id, subject_kind, subject,
              bands_dark, verification_attempted
       from public.city_crisis_damage
       where student_id = :sid::uuid
       order by island_era, damage_ordinal, subject_kind, subject`,
      sid,
    ),
  ]);

  const byId = new Map(rows.map((row) => [row.node_id, toNodeState(row)] as const));
  const node_states = CITY_NODE_IDS.map(
    (nodeId) => byId.get(nodeId) ?? freshNodeState(studentId, nodeId),
  );

  const neighborhood = neighborhoods[0];
  const current_island = stateRows[0]?.current_island ?? "prehistoric";
  const eras = new Set<EraId>([
    current_island,
    ...placementRows.map((row) => row.island_era),
    ...roadRows.map((row) => row.island_era),
    ...islandStateRows.map((row) => row.island_era),
    ...damageRows.map((row) => row.island_era),
  ]);
  const islands: CityIslandRead[] = ERA_SEQUENCE.filter((era) => eras.has(era.id)).map(
    ({ id: era_id }) => {
      const placed = placementRows.filter((row) => row.island_era === era_id);
      const state = islandStateRows.find((row) => row.island_era === era_id);
      const hall = placed.find((row) => row.kind === "town_hall");
      return {
        era_id,
        placements: placed.filter((row) => row.kind === "skill").map(toPlacement),
        civic: placed.filter((row) => row.kind === "civic").map(toCivicPlacement),
        roads: roadRows
          .filter((row) => row.island_era === era_id)
          .map((row) => ({ col: row.grid_col, row: row.grid_row })),
        road_gold_spent: state?.road_gold_spent ?? 0,
        civic_material_spent: state?.civic_material_spent ?? 0,
        town_hall: hall ? toPlacement(hall) : null,
        crisis_damage: toCrisisDamage(
          damageRows.filter((row) => row.island_era === era_id),
          state?.next_damage_ordinal ?? 1,
        ),
      };
    },
  );
  const current =
    islands.find((island) => island.era_id === current_island) ??
    ({
      era_id: current_island,
      placements: [],
      civic: [],
      roads: [],
      road_gold_spent: 0,
      civic_material_spent: 0,
      town_hall: null,
      crisis_damage: NO_CRISIS_DAMAGE,
    } satisfies CityIslandRead);
  return {
    launch_initialized,
    node_states,
    neighborhood_state: neighborhood ? toNeighborhood(neighborhood) : null,
    placements: current.placements,
    civic: current.civic,
    roads: current.roads,
    road_gold_spent: current.road_gold_spent,
    civic_material_spent: current.civic_material_spent,
    town_hall: current.town_hall,
    crisis_damage: current.crisis_damage,
    archipelago_version: 1,
    current_island,
    islands,
  };
}

export interface AuroraReadServiceDeps {
  db: DataApiExecutor;
  authenticate: DiagnosticAuthenticator;
}

export function createAuroraReadService(
  deps: AuroraReadServiceDeps,
): DiagnosticReadService {
  const { db, authenticate } = deps;

  /** Verify the bearer token → 401, else run the read scoped to the verified sub. */
  async function scoped(
    token: string | null,
    read: (studentId: UUID) => Promise<unknown>,
  ): Promise<DiagnosticServerResponse> {
    const identity = await authenticate(token);
    if (!identity) {
      return { status: 401, body: { error: "unauthorized" } };
    }
    try {
      return { status: 200, body: await read(identity.student_id) };
    } catch (error) {
      // Shared with the write path so BOTH answer a missing table with the command that
      // creates it. The read has had this failure mode since Wave 1 pointed it at four
      // tables `0004` creates and nobody has necessarily applied; it just had no way to say
      // so. See `describeWriteFailure`.
      return { status: 500, body: { error: describeWriteFailure(error) } };
    }
  }

  return {
    city: (token) => scoped(token, (studentId) => loadCityFromAurora(db, studentId)),
    // v2 flip: report the gain under the metric the administrations were scored with
    // (coverage for the walk, θ for a legacy MST pair), dispatched by the post's
    // `scoring_model_version`. Scoped to the nodes the walk covers so a full pass reads
    // as 100% coverage (not a fraction of the 62-node product scope).
    measurement: (token) =>
      scoped(token, (studentId) =>
        computeStudentReadiness(db, studentId, { scope: MEASUREMENT_SCOPE }),
      ),
  };
}
