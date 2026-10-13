import {
  type DataApiClient,
  type DataApiExecutor,
  json,
  lockAccountInitialization,
} from "@cr/db";
import type { DiagnosticAuthenticator } from "@cr/diagnostic-runtime";
import {
  assertLedgerEntryInvariant,
  computeMaterialBalances,
  eraMaterialTotal,
  type LedgerEntry,
  materialForEra,
  parseCivicPlacementId,
  REASON_BUILD_PREFIX,
  REASON_ISLAND_RESET_PREFIX,
  repairEventIdFor,
  ROAD_TILE_MATERIAL_COST,
} from "@cr/economy";
import type { CrisisDamage } from "@cr/game";
import { ERA_SEQUENCE, type EraId } from "@cr/skill-graph";
import type { UUID } from "@cr/state-schema";

import type { DiagnosticWriteService } from "./app";
import { accountHasCanonicalState } from "./accountState";
import { appendEconomyRows, loadEconomyLedger } from "./economy";
import { type CityRead, type CityRoadRead, loadCityFromAurora } from "./reads";

/**
 * The server-side WRITE model behind `POST /api/city` — the half of civilization
 * persistence that did not exist.
 *
 * `0004_civilization_state.sql` created six tables and granted `app_service` the DML to
 * fill them; `reads.ts` grew `CityRead` to select from four of them. Nothing wrote them.
 * Measured at `e53bf9cd`: grepping `insert into` / `update` / `delete from` against
 * `city_placement`, `city_road`, `city_state`, `city_crisis_damage`,
 * `resource_grant_ledger` and `equipped_cosmetic` across `services/`, `packages/`,
 * `engines/` and `apps/` returned nothing at all. So a signed-in learner's city was read
 * from an empty table rather than being absent from the payload — better in shape,
 * identical to the learner, whose city was still gone on refresh.
 *
 * ## What this file writes, and what it deliberately does not
 *
 * It writes the LAYOUT and the standing crisis damage: `city_placement` (skill buildings
 * and the hall), `city_road` + `city_state.road_gold_spent` (which travel together or
 * neither is meaningful), `city_state.era_id` and `city_state.next_damage_ordinal`.
 *
 * It writes NO learning record and NO economy row, and both omissions are boundaries
 * rather than backlog:
 *
 *  * `student_node_state` (mastery, `lesson_stage`) is the mastery lane's, and Contracts
 *    §3 makes the mastery service its only writer. This body is fed by a browser POST, so
 *    persisting mastery here would make the browser authoritative over a learning record
 *    — exactly the boundary Group A's column-scoped grant exists to keep. The consequence
 *    is visible and is named in the pull request: a signed-in learner's buildings survive
 *    a refresh and their build STAGE does not.
 *  * `resource_grant_ledger` / `equipped_cosmetic` are the economy's, and the design
 *    record's §3.5 ordering constraint puts the persisted ledger, the stored era and the
 *    economy's era repoints in ONE change (Wave 2 G). Wave 1 landed the repoints; the
 *    other two are not in this one.
 *
 * ## Why a whole-city upsert rather than a command per gesture
 *
 * Because the browser already produces exactly this payload and has done since dev
 * persistence shipped: `snapshotFromLoad(load)` is the same shape, captured after every
 * mutation, and `withDevPersistence` is the same wrapper. A command protocol
 * (`{op: "place", …}`) would be a second model of state the client already holds whole,
 * and the grid rules that decide whether a gesture is legal (`worldLayout`'s footprints,
 * occupancy and `findOpenCell`) live in the app — a service cannot import an app, so a
 * command server could not validate a command anyway. See `apiCityLoad.ts`, which makes
 * the same call in the other direction for the hall seed.
 *
 * The upsert shape also falls out of the grants, which were written for it: placements
 * carry `insert` plus `update (grid_col, grid_row, rot)` and NO delete, because nothing
 * in the app demolishes a placement; roads carry `insert`/`delete` and no update, because
 * a road is laid or lifted and never edited.
 *
 * ## One transaction, one JSON parameter per collection
 *
 * Every statement below is scoped to the caller's verified `sub` and takes its rows as a
 * single `jsonb` bind (`jsonb_to_recordset`), so a city of six buildings and a city of
 * ninety road tiles both cost one Data API round trip per table — the Data API executes
 * one statement per call, so a row-per-statement writer would cost a hundred. The whole
 * save runs inside `withTransaction`: a half-written city is precisely the state the read
 * model refuses to assemble.
 */

/** The `city_era` enum's members, from the authored sequence rather than a literal list. */
const ERA_IDS: ReadonlySet<string> = new Set(ERA_SEQUENCE.map((era) => era.id));

/**
 * One placement to store, in the same shape `CityPlacementRead` hands back — the
 * browser's `PlacedTransform`. `nodeId` is a skill's node id (`NUM.S`) or the hall's
 * sentinel (`town-hall`), and it is BOTH the row's `subject_id` and its `placement_id`.
 *
 * Using the node id as the placement id is what makes a move an update rather than a
 * second building: a skill is placeable once and the hall is relocated, never re-founded,
 * so `(student_id, placement_id)` is already unique per subject and the upsert lands on
 * the row that is there. Civic purchases will NOT be able to do this — their placement id
 * is the ledger's `build:<placement_id>` key and has to be minted with the purchase — and
 * that is why this is written down rather than left to be inferred.
 */
export interface CityPlacementWrite {
  nodeId: string;
  col: number;
  row: number;
  rot: number;
}

/**
 * THE CITY A SIGNED-IN LEARNER SENDS BACK.
 *
 * Deliberately the mirror of `CityRead` minus the two fields another lane owns
 * (`node_states`, `neighborhood_state`), plus the one the schema forces
 * ({@link CityWrite.era_id}). `test/cityReadModelParity.test.ts` holds that relationship
 * from outside both files, with each difference named, so a field added to the read model
 * that no writer persists fails there rather than being discovered by a learner.
 */
export interface CityWrite {
  /** Skill buildings only. The hall travels in `town_hall`, exactly as the read splits them. */
  placements: readonly CityPlacementWrite[];
  /** Bought civic buildings, separate from skill placements. */
  civic: readonly CityPlacementWrite[];
  /** The island hub, or null when the client has no hall to record. */
  town_hall: CityPlacementWrite | null;
  roads: readonly CityRoadRead[];
  /** Net material sunk into roads; travels with `roads` or neither is meaningful. */
  road_gold_spent: number;
  /** Legacy/dev civic netting counter, now partitioned with the island. */
  civic_material_spent: number;
  crisis_damage: CrisisDamage;
  /**
   * **THE STORED ERA, WRITTEN AND NOT YET READ — and the schema is what makes that
   * non-optional rather than a choice.**
   *
   * `city_state.era_id` is `not null` with no default, and `road_gold_spent` lives on that
   * same row. So a writer that persists roads MUST supply an era: there is no shape of
   * this change in which the stored era stays empty. That settles half of what Wave 1
   * recorded as deferred — the era now has a value on the server for every city that has
   * been saved once.
   *
   * What is still not separable is the READ. `reads.ts` does not select this column, and
   * this is the argument for why, sharpened by having the writer in hand rather than
   * restated from the design record:
   *
   *  1. The ledger is not persisted, so a signed-in learner's wallet is minted empty on
   *     every page load and re-derived from their node states at whatever era the client
   *     is standing in. The era at load therefore DENOMINATES a wallet that is rebuilt
   *     from nothing, which is the coupling §3.5 names, and it is the ledger's arrival
   *     that dissolves it.
   *  2. Adopting a server era at load introduces a DEMOTION this change cannot make safe.
   *     The mirror is best-effort after each mutation (as dev persistence has always
   *     been): if the POST carrying an era advance is lost, the browser store says era
   *     five and the row says era four, and the next load would silently put the learner
   *     back in era four — undoing a ceremony they completed, over an island still
   *     covered in era-five buildings, because placements persist unconditionally. Losing
   *     an unmirrored placement costs a gesture the learner can repeat; losing an era
   *     advance costs a trial they cannot.
   *
   * So: written here, ignored by the read, and `reads.test.ts` still fails if someone
   * selects it without reading that argument. It lands with the ledger (Wave 2 G).
   */
  era_id: EraId;
  /** The island whose layout this payload carries. Defaults to Era 1 for old clients. */
  island_era: EraId;
  /** The island under the learner's feet after this save. */
  current_island: EraId;
}

/** One `city_placement` row as the `jsonb` parameter carries it. */
interface PlacementParam {
  placement_id: string;
  kind: "skill" | "town_hall" | "civic";
  subject_id: string;
  grid_col: number;
  grid_row: number;
  rot: number;
}

interface RoadParam {
  grid_col: number;
  grid_row: number;
}

interface DamageParam {
  damage_ordinal: number;
  subject_kind: "building" | "ground" | "civic" | "record";
  subject: string;
  bands_dark: number | null;
  verification_attempted: boolean | null;
}

/**
 * Every statement `saveCityToAurora` issues, in the order it issues them.
 *
 * Exported as data rather than inlined so a guard can read the DML back: the one failure
 * mode no in-memory double can reproduce is a column this writer touches that
 * `0004`/`0005` never granted, which is a `permission denied` in production and a green
 * suite everywhere else. `test/cityWriteGrants.test.ts` derives the granted columns from
 * the migration text and holds these statements to them.
 */
export const CITY_WRITE_STATEMENTS = {
  /**
   * Era one exists before any advance. Later islands are inserted only by the economy's
   * checkpoint-gated founding action; the `where` clause makes this statement incapable of
   * creating one from a city payload.
   */
  ensureInitialIsland: `insert into public.city_island_state
      (student_id, island_era, road_gold_spent, civic_material_spent,
       next_damage_ordinal, reset_count, updated_at)
    select :sid::uuid, 'prehistoric'::public.city_era, 0, 0, 1, 0, now()
    where :island::public.city_era = 'prehistoric'::public.city_era
    on conflict (student_id, island_era) do nothing`,
  prunePlacements: `delete from public.city_placement p
    where p.student_id = :sid::uuid
      and p.island_era = :island::public.city_era
      and not exists (
        select 1 from jsonb_to_recordset(:rows::jsonb)
          as incoming(placement_id text)
        where incoming.placement_id = p.placement_id
      )`,
  /**
   * PLACED AND MOVED, NEVER REMOVED. `do update` rewrites only the transform, so the
   * upsert cannot change what a placement IS — and `era_built` is therefore stamped once,
   * at the era the building was first raised in, and left alone on every later save.
   *
   * Nothing reads `era_built` back today: `CityPlacementRead` carries no era because a
   * skill building's dressing is `getEraOfNode(nodeId)`, static graph data (`eraDressing.ts`
   * R3). It is stored because the column is `not null` and because the era a building went
   * up in is not recoverable from anything else once the graph moves.
   */
  upsertPlacements: `insert into public.city_placement
      (student_id, island_era, placement_id, kind, subject_id, grid_col, grid_row, rot, era_built)
    select :sid::uuid, :island::public.city_era, p.placement_id,
           p.kind::public.city_placement_kind, p.subject_id,
           p.grid_col, p.grid_row, p.rot, :era::public.city_era
      from jsonb_to_recordset(:rows::jsonb)
        as p(placement_id text, kind text, subject_id text,
             grid_col integer, grid_row integer, rot integer)
    on conflict (student_id, island_era, placement_id) do update
      set grid_col = excluded.grid_col,
          grid_row = excluded.grid_row,
          rot = excluded.rot`,

  /**
   * LIFTED ROADS. `not exists` over the incoming set, so an empty set is a legal request
   * to remove every tile — which is what `removeRoads` on the learner's last road is.
   */
  pruneRoads: `delete from public.city_road r
    where r.student_id = :sid::uuid
      and r.island_era = :island::public.city_era
      and not exists (
        select 1 from jsonb_to_recordset(:rows::jsonb)
          as c(grid_col integer, grid_row integer)
        where c.grid_col = r.grid_col and c.grid_row = r.grid_row
      )`,

  laidRoads: `insert into public.city_road (student_id, island_era, grid_col, grid_row)
    select :sid::uuid, :island::public.city_era, c.grid_col, c.grid_row
      from jsonb_to_recordset(:rows::jsonb) as c(grid_col integer, grid_row integer)
    on conflict (student_id, island_era, grid_col, grid_row) do nothing`,

  /**
   * REPAIRED RUINS. Same `not exists` shape as the roads, and the same reading of an empty
   * set: a city with nothing ruined has had everything repaired.
   *
   * `created_at` survives a save because a surviving ruin is neither deleted nor updated
   * here — it simply is not in the prune's set and conflicts out of the insert. That
   * matters more than it looks: the fold keeps an already-ruined subject's ORIGINAL damage
   * id rather than re-stamping it, precisely so an unpaid repair cannot be invalidated.
   */
  pruneCrisisDamage: `delete from public.city_crisis_damage x
    where x.student_id = :sid::uuid
      and x.island_era = :island::public.city_era
      and not exists (
        select 1 from jsonb_to_recordset(:rows::jsonb)
          as d(damage_ordinal integer, subject_kind text, subject text)
        where d.damage_ordinal = x.damage_ordinal
          and d.subject_kind = x.subject_kind::text
          and d.subject = x.subject
      )
      and (
        x.subject_kind = 'record'::public.crisis_damage_subject
        or exists (
          select 1 from public.resource_grant_ledger paid
          where paid.student_id = x.student_id
            and paid.event_id =
              'repair:' || x.damage_id || ':' || x.subject_kind::text || ':' || x.subject
            and paid.kind = 'spend'::public.economy_txn_kind
        )
      )`,

  insertCrisisDamage: `insert into public.city_crisis_damage
      (student_id, island_era, damage_ordinal, subject_kind, subject,
       bands_dark, verification_attempted)
    select :sid::uuid, :island::public.city_era, d.damage_ordinal,
           d.subject_kind::public.crisis_damage_subject, d.subject,
           d.bands_dark, d.verification_attempted
      from jsonb_to_recordset(:rows::jsonb)
        as d(damage_ordinal integer, subject_kind text, subject text,
             bands_dark integer, verification_attempted boolean)
    on conflict (student_id, island_era, damage_ordinal, subject_kind, subject) do update
      set bands_dark = excluded.bands_dark,
          verification_attempted = excluded.verification_attempted`,

  upsertIslandState: `insert into public.city_island_state
      (student_id, island_era, road_gold_spent, civic_material_spent,
       next_damage_ordinal, updated_at)
    values (:sid::uuid, :island::public.city_era, :spent, :civic_spent, :mint, now())
    on conflict (student_id, island_era) do update
      set road_gold_spent = excluded.road_gold_spent,
          civic_material_spent = excluded.civic_material_spent,
          next_damage_ordinal =
            greatest(city_island_state.next_damage_ordinal, excluded.next_damage_ordinal),
          updated_at = now()`,

  /**
   * THE PER-STUDENT SCALARS, AND THE DAMAGE-ID MINT.
   *
   * `greatest(city_state.next_damage_ordinal, excluded.…)` is the whole of the mint fix
   * (`0005_city_damage_mint.sql`): the high-water mark is STORED, so it cannot be rewound
   * by a repair that deletes the highest-ordinal rows, and it cannot be rewound by a
   * client that posts a lower one either. A re-issued ordinal would key a repair spend the
   * ledger has already recorded, leaving a ruin the economy believes is paid for and the
   * learner cannot clear.
   */
  upsertCityState: `insert into public.city_state
      (student_id, era_id, current_island, road_gold_spent, next_damage_ordinal, updated_at)
    values (:sid::uuid, :era::public.city_era, :current::public.city_era,
            case when :island::public.city_era = 'prehistoric'::public.city_era
              then :spent else 0 end,
            case when :island::public.city_era = 'prehistoric'::public.city_era
              then :mint else 1 end, now())
    on conflict (student_id) do update
      set era_id = excluded.era_id,
          current_island = excluded.current_island,
          road_gold_spent =
            case when :island::public.city_era = 'prehistoric'::public.city_era
              then excluded.road_gold_spent else city_state.road_gold_spent end,
          next_damage_ordinal =
            case when :island::public.city_era = 'prehistoric'::public.city_era
              then greatest(city_state.next_damage_ordinal, excluded.next_damage_ordinal)
              else city_state.next_damage_ordinal end,
          updated_at = now()`,
} as const;

/**
 * The two rows that make an empty account's first city canonical.
 *
 * There is deliberately no layout, learning, or economy write here. The Town Hall is the
 * client's canonical free seed, and no mastery or material has been earned by choosing a door.
 */
export const CITY_BOOTSTRAP_STATEMENTS = {
  initializeCityState: `insert into public.city_state
      (student_id, era_id, current_island, road_gold_spent, next_damage_ordinal, updated_at)
    values (:sid::uuid, 'prehistoric'::public.city_era, 'prehistoric'::public.city_era, 0, 1, now())
    on conflict (student_id) do nothing`,
  initializeIslandState: `insert into public.city_island_state
      (student_id, island_era, road_gold_spent, civic_material_spent,
       next_damage_ordinal, reset_count, updated_at)
    values (:sid::uuid, 'prehistoric'::public.city_era, 0, 0, 1, 0, now())
    on conflict (student_id, island_era) do nothing`,
} as const;

export const ISLAND_RESET_STATEMENTS = {
  clearPlacements: `delete from public.city_placement
    where student_id = :sid::uuid
      and island_era = :island::public.city_era
      and kind <> 'town_hall'::public.city_placement_kind`,
  clearRoads: `delete from public.city_road
    where student_id = :sid::uuid
      and island_era = :island::public.city_era`,
  clearDamage: `delete from public.city_crisis_damage
    where student_id = :sid::uuid
      and island_era = :island::public.city_era`,
  resetState: `insert into public.city_island_state
      (student_id, island_era, road_gold_spent, civic_material_spent,
       next_damage_ordinal, reset_count, updated_at)
    values (:sid::uuid, :island::public.city_era, 0, 0, 1, 1, now())
    on conflict (student_id, island_era) do update
      set road_gold_spent = 0,
          civic_material_spent = 0,
          next_damage_ordinal = greatest(city_island_state.next_damage_ordinal, 1),
          reset_count = city_island_state.reset_count + 1,
          updated_at = now()`,
} as const;

/** `d7` → 7. Null for anything else, which is a payload this build did not write. */
function damageOrdinalOf(damageId: unknown): number | null {
  if (typeof damageId !== "string") {
    return null;
  }
  const match = /^d(\d+)$/.exec(damageId);
  if (match?.[1] === undefined) {
    return null;
  }
  const ordinal = Number(match[1]);
  return Number.isSafeInteger(ordinal) && ordinal >= 1 ? ordinal : null;
}

/**
 * Flatten a `CrisisDamage` into its rows, and derive the mint the row set implies.
 *
 * The ordinal is the CLIENT's, because it is what the repair spend's event id is keyed by
 * (`repair:<damage_id>:<kind>:<subject>`) and a server that renamed it would orphan every
 * repair already on the ledger. The MINT is not the client's: it is floored at one past
 * the highest ordinal in the payload, and the statement above floors it again against the
 * stored high-water mark, so neither a stale client nor a repair can rewind it.
 */
function crisisDamageRows(damage: CrisisDamage): {
  rows: DamageParam[];
  mint: number;
} | null {
  /**
   * Which field names the subject, per kind. Read with a bracket lookup off an `unknown`
   * entry rather than a typed property access: this runs over a parsed POST body, so an
   * entry may be `null`, and `r.node_id` on a null would throw out of the parser as a 500
   * where the whole point of the parser is to answer 400.
   */
  const subjectFields: readonly [DamageParam["subject_kind"], keyof never, unknown[]][] = [
    ["building", "node_id", damage.ruined_buildings as unknown[]],
    ["ground", "cell", damage.ruined_cells as unknown[]],
    ["civic", "placement_id", damage.suspended_civic as unknown[]],
  ];
  const rows: DamageParam[] = [];
  let mint = 1;
  for (const [kind, field, entries] of subjectFields) {
    for (const entry of entries) {
      if (typeof entry !== "object" || entry === null) {
        return null;
      }
      const record = entry as Record<string, unknown>;
      const subject = record[field as string];
      const ordinal = damageOrdinalOf(record.damage_id);
      const validSubject =
        typeof subject === "string" &&
        (kind === "civic" ? isCanonicalCivicPlacementId(subject) : isEventIdSafe(subject));
      if (ordinal === null || !validSubject) {
        return null;
      }
      rows.push({
        damage_ordinal: ordinal,
        subject_kind: kind,
        subject,
        bands_dark: null,
        verification_attempted: null,
      });
      mint = Math.max(mint, ordinal + 1);
    }
  }
  for (const entry of damage.overwritten_records as unknown[]) {
    if (typeof entry !== "object" || entry === null) {
      return null;
    }
    const record = entry as Record<string, unknown>;
    const ordinal = damageOrdinalOf(record.damage_id);
    const subject = record.placement_id;
    const bands = record.bands_dark;
    const attempted = record.verification_attempted;
    if (
      ordinal === null ||
      typeof subject !== "string" ||
      !isCanonicalCivicPlacementId(subject) ||
      !Number.isSafeInteger(bands) ||
      (bands as number) < 1 ||
      (bands as number) > 9 ||
      typeof attempted !== "boolean"
    ) {
      return null;
    }
    rows.push({
      damage_ordinal: ordinal,
      subject_kind: "record",
      subject,
      bands_dark: bands as number,
      verification_attempted: attempted,
    });
    mint = Math.max(mint, ordinal + 1);
  }
  const posted = damage.next_damage_id;
  if (!Number.isSafeInteger(posted) || posted < 1) {
    return null;
  }
  return { rows, mint: Math.max(mint, posted) };
}

/**
 * Whether a string can be spelled into an event id. `:` is the delimiter `buildEventId`
 * splits on, and PR #288 found exactly this defect in exactly this seam — a placement id
 * that cannot be spelled into an event id is a placement that can never be paid for. The
 * database refuses these too (`city_placement_id_is_event_id_safe`); rejecting them here
 * is what turns a 500 with a constraint name in it into a 400 that says which field.
 */
function isEventIdSafe(value: string): boolean {
  return value.length > 0 && !value.includes(":");
}

function isPlacement(value: unknown): value is CityPlacementWrite {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.nodeId === "string" &&
    isEventIdSafe(candidate.nodeId) &&
    Number.isSafeInteger(candidate.col) &&
    Number.isSafeInteger(candidate.row) &&
    Number.isSafeInteger(candidate.rot)
  );
}

function isCanonicalCivicPlacementId(value: string): boolean {
  const parsed = parseCivicPlacementId(value);
  return parsed !== null && !parsed.legacy;
}

function isCivicPlacement(value: unknown): value is CityPlacementWrite {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.nodeId === "string" &&
    isCanonicalCivicPlacementId(candidate.nodeId) &&
    Number.isSafeInteger(candidate.col) &&
    Number.isSafeInteger(candidate.row) &&
    Number.isSafeInteger(candidate.rot)
  );
}

function isRoad(value: unknown): value is CityRoadRead {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return Number.isSafeInteger(candidate.col) && Number.isSafeInteger(candidate.row);
}

/**
 * Read an untrusted POST body as a {@link CityWrite}, or say which field refused.
 *
 * All-or-nothing, on the same reasoning `devPersistence/devSession.ts` gives for its own
 * parser: a city assembled from the half of a payload that happened to be well-formed is
 * worse than a rejected save, because the learner cannot see which half landed. The
 * difference from the browser store is the audience for the message — a 400 naming the
 * field beats a 500 carrying a Postgres constraint name, since the constraint is the one
 * thing a client author cannot look up.
 */
export function parseCityWrite(value: unknown): { city: CityWrite } | { error: string } {
  if (typeof value !== "object" || value === null) {
    return { error: "the request body must be a city object" };
  }
  const body = value as Record<string, unknown>;
  if (typeof body.era_id !== "string" || !ERA_IDS.has(body.era_id)) {
    return { error: "era_id must be an era in the authored sequence" };
  }
  if (!Array.isArray(body.placements) || !body.placements.every(isPlacement)) {
    return { error: "placements must be transforms with a colon-free nodeId" };
  }
  if (!Array.isArray(body.civic) || !body.civic.every(isCivicPlacement)) {
    return {
      error: "civic must contain transforms with a canonical civic placement id",
    };
  }
  if (body.town_hall !== null && !isPlacement(body.town_hall)) {
    return { error: "town_hall must be a transform with a colon-free nodeId, or null" };
  }
  if (!Array.isArray(body.roads) || !body.roads.every(isRoad)) {
    return { error: "roads must be integer grid cells" };
  }
  const spent = body.road_gold_spent;
  if (!Number.isSafeInteger(spent) || (spent as number) < 0) {
    return { error: "road_gold_spent must be a whole number of at least 0" };
  }
  const civicSpent = body.civic_material_spent ?? 0;
  if (!Number.isSafeInteger(civicSpent) || (civicSpent as number) < 0) {
    return { error: "civic_material_spent must be a whole number of at least 0" };
  }
  const islandEra = body.island_era ?? "prehistoric";
  if (typeof islandEra !== "string" || !ERA_IDS.has(islandEra)) {
    return { error: "island_era must be an era in the authored sequence" };
  }
  const currentIsland = body.current_island ?? islandEra;
  if (typeof currentIsland !== "string" || !ERA_IDS.has(currentIsland)) {
    return { error: "current_island must be an era in the authored sequence" };
  }
  const damage = body.crisis_damage;
  if (typeof damage !== "object" || damage === null) {
    return { error: "crisis_damage must be a crisis-damage record" };
  }
  const record = damage as Record<string, unknown>;
  if (
    !Array.isArray(record.ruined_buildings) ||
    !Array.isArray(record.ruined_cells) ||
    !Array.isArray(record.suspended_civic) ||
    !Array.isArray(record.overwritten_records)
  ) {
    return { error: "crisis_damage must carry all four subject collections" };
  }
  const city: CityWrite = {
    placements: body.placements,
    civic: body.civic,
    town_hall: body.town_hall,
    roads: body.roads,
    road_gold_spent: spent as number,
    civic_material_spent: civicSpent as number,
    crisis_damage: damage as CrisisDamage,
    era_id: body.era_id as EraId,
    island_era: islandEra as EraId,
    current_island: currentIsland as EraId,
  };
  if (crisisDamageRows(city.crisis_damage) === null) {
    return {
      error:
        "crisis_damage entries need a `d<n>` damage_id and a colon-free, non-empty subject",
    };
  }
  return { city };
}

class CityAuthorityError extends Error {
  readonly status = 409;
  readonly code: string;

  constructor(code: string) {
    super(code);
    this.name = "CityAuthorityError";
    this.code = code;
  }
}

/**
 * Initialize the canonical Prehistoric founding for an untouched account and return its city.
 *
 * The advisory lock is shared with diagnostic start. Under it, the durable-state census and the
 * two founding inserts are one transaction, so concurrent devices converge on one row pair and a
 * diagnostic that records first wins without being rewritten. Existing state is read and
 * returned unchanged. A failure in either insert rolls the whole founding back.
 */
export async function bootstrapCityInAurora(
  db: DataApiClient,
  studentId: UUID,
): Promise<CityRead> {
  await db.withTransaction(async (tx) => {
    await lockAccountInitialization(tx, studentId);
    const alreadyStarted = await accountHasCanonicalState(tx, studentId);
    if (!alreadyStarted) {
      const initialized = await tx.execute(CITY_BOOTSTRAP_STATEMENTS.initializeCityState, {
        sid: studentId,
      });
      // A non-cooperating legacy writer may have inserted `city_state` after the census. Its
      // state wins; only the transaction that created the marker may add the matching empty
      // island. Current bootstrap and diagnostic writers are serialized by the lock above.
      if (initialized === 1) {
        await tx.execute(CITY_BOOTSTRAP_STATEMENTS.initializeIslandState, {
          sid: studentId,
        });
      }
    }
  });
  // Read after commit. `loadCityFromAurora` intentionally fans its independent selects out in
  // parallel, while the Data API serializes statements within one transaction. A newer canonical
  // write that lands between commit and this read is allowed to win and is exactly what to return.
  return loadCityFromAurora(db, studentId);
}

/**
 * Store a student's whole city layout: placements (skills and the hall), roads, the road
 * spend, the live era and the standing crisis damage — all of it inside ONE transaction,
 * so no reader can see a city half-saved.
 *
 * Idempotent by construction. Re-posting an unchanged city upserts every row onto itself,
 * prunes nothing, and leaves `created_at` alone; the only column that moves is
 * `updated_at`. That is what lets the browser mirror after every gesture without needing
 * to know which gesture it was.
 */
export async function saveCityToAurora(
  db: DataApiClient,
  studentId: UUID,
  city: CityWrite,
): Promise<void> {
  const damage = crisisDamageRows(city.crisis_damage);
  if (damage === null) {
    throw new Error(
      "crisis_damage entries need a `d<n>` damage_id and a colon-free, non-empty subject",
    );
  }
  const placements: PlacementParam[] = city.placements.map((placement) => ({
    placement_id: placement.nodeId,
    kind: "skill",
    subject_id: placement.nodeId,
    grid_col: placement.col,
    grid_row: placement.row,
    rot: placement.rot,
  }));
  if (city.town_hall) {
    placements.push({
      placement_id: city.town_hall.nodeId,
      kind: "town_hall",
      subject_id: city.town_hall.nodeId,
      grid_col: city.town_hall.col,
      grid_row: city.town_hall.row,
      rot: city.town_hall.rot,
    });
  }
  for (const placement of city.civic) {
    const parsed = parseCivicPlacementId(placement.nodeId);
    if (parsed === null || parsed.legacy) {
      throw new Error(`civic placement identity must be canonical: "${placement.nodeId}"`);
    }
    placements.push({
      placement_id: placement.nodeId,
      kind: "civic",
      subject_id: parsed.catalogueId,
      grid_col: placement.col,
      grid_row: placement.row,
      rot: placement.rot,
    });
  }
  const roads: RoadParam[] = city.roads.map((cell) => ({
    grid_col: cell.col,
    grid_row: cell.row,
  }));

  const sid = { sid: studentId };
  const scoped = { ...sid, island: city.island_era };
  await db.withTransaction(async (tx: DataApiExecutor) => {
    await tx.execute(CITY_WRITE_STATEMENTS.ensureInitialIsland, scoped);
    const founded = await tx.query<{ island_era: EraId }>(
      `select island_era from public.city_island_state
        where student_id = :sid::uuid`,
      sid,
    );
    const foundedEras = new Set(founded.map((row) => row.island_era));
    if (
      city.era_id !== city.current_island ||
      !foundedEras.has(city.island_era) ||
      !foundedEras.has(city.current_island)
    ) {
      throw new CityAuthorityError("island_not_founded");
    }
    const economyEntries = await loadEconomyLedger(tx, studentId);
    const settledRepairs = new Set(
      economyEntries
        .filter((entry) => entry.kind === "spend")
        .map((entry) => entry.event_id),
    );
    // A stale browser snapshot may still contain damage the atomic repair endpoint has
    // already debited and deleted. Filter it in both write directions so the mirror cannot
    // resurrect a paid ruin immediately after pruning it.
    const standingDamage = damage.rows.filter(
      (row) =>
        row.subject_kind === "record" ||
        !settledRepairs.has(
          repairEventIdFor({
            damageId: `d${row.damage_ordinal}`,
            subjectKind: row.subject_kind,
            subject: row.subject,
          }),
        ),
    );
    const authoritativeRoadSpent = roads.length * ROAD_TILE_MATERIAL_COST;
    const material = materialForEra(city.island_era);
    const authoritativeCivicSpent =
      material === null
        ? 0
        : economyEntries
            .filter(
              (entry) =>
                entry.kind === "spend" &&
                entry.resource_type === material.id &&
                entry.reason_code.startsWith(REASON_BUILD_PREFIX),
            )
            .reduce((total, entry) => total + entry.amount, 0);
    // Sequential rather than concurrent: these share a Data API transaction id, and the
    // Data API serializes statements on one anyway, so `Promise.all` would buy nothing
    // and would make the failing statement ambiguous.
    await tx.execute(CITY_WRITE_STATEMENTS.prunePlacements, {
      ...scoped,
      rows: json(placements),
    });
    await tx.execute(CITY_WRITE_STATEMENTS.upsertPlacements, {
      ...scoped,
      era: city.era_id,
      rows: json(placements),
    });
    await tx.execute(CITY_WRITE_STATEMENTS.pruneRoads, {
      ...scoped,
      rows: json(roads),
    });
    await tx.execute(CITY_WRITE_STATEMENTS.laidRoads, {
      ...scoped,
      rows: json(roads),
    });
    await tx.execute(CITY_WRITE_STATEMENTS.pruneCrisisDamage, {
      ...scoped,
      rows: json(standingDamage),
    });
    await tx.execute(CITY_WRITE_STATEMENTS.insertCrisisDamage, {
      ...scoped,
      rows: json(standingDamage),
    });
    await tx.execute(CITY_WRITE_STATEMENTS.upsertIslandState, {
      ...scoped,
      spent: authoritativeRoadSpent,
      civic_spent: authoritativeCivicSpent,
      mint: damage.mint,
    });
    await tx.execute(CITY_WRITE_STATEMENTS.upsertCityState, {
      ...scoped,
      era: city.era_id,
      current: city.current_island,
      spent: authoritativeRoadSpent,
      mint: damage.mint,
    });
  });
}

/**
 * Reset one island atomically: place-owned rows and spend disappear together, the Hall row is
 * untouched, and one append-only adjustment leaves the island with exactly its authored total.
 */
export async function resetIslandInAurora(
  db: DataApiClient,
  studentId: UUID,
  eraId: EraId,
): Promise<void> {
  await db.withTransaction(async (tx) => {
    const founded = await tx.query<{ island_era: EraId }>(
      `select island_era from public.city_island_state
        where student_id = :sid::uuid and island_era = :island::public.city_era`,
      { sid: studentId, island: eraId },
    );
    if (founded.length !== 1) {
      throw new CityAuthorityError("island_not_founded");
    }
    const entries = await loadEconomyLedger(tx, studentId);
    const material = materialForEra(eraId);
    if (material === null) {
      throw new Error(`era "${eraId}" has no material for its reset grant`);
    }
    const balance = computeMaterialBalances({ entries })[material.id] ?? 0;
    const delta = eraMaterialTotal(eraId) - balance;
    if (delta !== 0) {
      const generation =
        entries.filter((entry) =>
          entry.reason_code.startsWith(`${REASON_ISLAND_RESET_PREFIX}${eraId}:`),
        ).length + 1;
      const row: LedgerEntry = {
        student_id: studentId,
        event_id: `${REASON_ISLAND_RESET_PREFIX}${eraId}:${generation}`,
        resource_type: material.id,
        kind: delta > 0 ? "grant" : "spend",
        amount: Math.abs(delta),
        reason_code: `${REASON_ISLAND_RESET_PREFIX}${eraId}:${generation}`,
        created_at: new Date().toISOString(),
      };
      assertLedgerEntryInvariant(row);
      await appendEconomyRows(tx, studentId, [row]);
    }
    const params = { sid: studentId, island: eraId };
    await tx.execute(ISLAND_RESET_STATEMENTS.clearPlacements, params);
    await tx.execute(ISLAND_RESET_STATEMENTS.clearRoads, params);
    await tx.execute(ISLAND_RESET_STATEMENTS.clearDamage, params);
    await tx.execute(ISLAND_RESET_STATEMENTS.resetState, params);
  });
}

export interface AuroraWriteServiceDeps {
  db: DataApiClient;
  authenticate: DiagnosticAuthenticator;
}

export function createAuroraWriteService(
  deps: AuroraWriteServiceDeps,
): DiagnosticWriteService {
  const { db, authenticate } = deps;
  return {
    async bootstrapCity(token) {
      const identity = await authenticate(token);
      if (!identity) {
        return { status: 401, body: { error: "unauthorized" } };
      }
      try {
        return {
          status: 200,
          body: await bootstrapCityInAurora(db, identity.student_id),
        };
      } catch (error) {
        return { status: 500, body: { error: describeWriteFailure(error) } };
      }
    },
    async saveCity(token, body) {
      const identity = await authenticate(token);
      if (!identity) {
        return { status: 401, body: { error: "unauthorized" } };
      }
      try {
        // Inside the `try` on purpose. The parser is written to return a message rather than
        // throw, but it walks an arbitrary parsed body, and a throw escaping here would be a
        // Hono 500 with a stack in it — for a request whose answer is a 400 naming a field.
        const parsed = parseCityWrite(body);
        if ("error" in parsed) {
          return { status: 400, body: { error: parsed.error } };
        }
        // The verified `sub`, never a field of the payload (Contracts §5).
        await saveCityToAurora(db, identity.student_id, parsed.city);
        return { status: 200, body: { saved: true } };
      } catch (error) {
        if (error instanceof CityAuthorityError) {
          return { status: error.status, body: { error: error.code } };
        }
        return { status: 500, body: { error: describeWriteFailure(error) } };
      }
    },
    async resetIsland(token, body) {
      const identity = await authenticate(token);
      if (!identity) {
        return { status: 401, body: { error: "unauthorized" } };
      }
      const eraId =
        typeof body === "object" && body !== null
          ? (body as { island_era?: unknown }).island_era
          : null;
      if (typeof eraId !== "string" || !ERA_IDS.has(eraId)) {
        return { status: 400, body: { error: "island_era must be authored" } };
      }
      try {
        await resetIslandInAurora(db, identity.student_id, eraId as EraId);
        return { status: 200, body: { reset: true } };
      } catch (error) {
        if (error instanceof CityAuthorityError) {
          return { status: error.status, body: { error: error.code } };
        }
        return { status: 500, body: { error: describeWriteFailure(error) } };
      }
    },
  };
}

/**
 * Turn a Data API failure into something that names the fix.
 *
 * **The most likely reason this endpoint fails in production is that nobody has run the
 * migration.** Migrations here are applied BY HAND — `db/apply.mjs` over the Data API,
 * tracked in `schema_migrations`, invoked by a person; the one CI workflow does not run
 * them and the CDK stack says so in as many words. So the first deploy of this writer
 * against a cluster that is still on `0003` answers `relation "public.city_placement" does
 * not exist`, and the same is true of `0005`'s column on a cluster that stopped at `0004`.
 * Unwrapped, that reads like a bug in the service. Named, it reads like an instruction.
 *
 * Shared with the read path, which has had the same failure mode since Wave 1 and the same
 * silence about it.
 */
export function describeWriteFailure(error: unknown): string {
  const message = error instanceof Error ? error.message : "internal error";
  return missingSchemaHint(message) ?? message;
}

/**
 * The `run this` sentence for a missing table or column, or null when the failure is
 * something else. Matched on Postgres's own wording (`undefined_table` /
 * `undefined_column`), which the Data API passes through verbatim inside its
 * `BadRequestException`.
 */
export function missingSchemaHint(message: string): string | null {
  const relation = /relation "([^"]+)" does not exist/i.exec(message);
  const column = /column "([^"]+)" (?:of relation "[^"]+" )?does not exist/i.exec(message);
  const missing = relation?.[1] ?? column?.[1];
  if (missing === undefined) {
    return null;
  }
  return (
    `${message} — the civilization tables are created by db/migrations, which are ` +
    "applied BY HAND: run `node db/apply.mjs` against the cluster (it needs " +
    "DB_CLUSTER_ARN, DB_NAME, DB_ADMIN_SECRET_ARN and DB_APP_SERVICE_SECRET_ARN) and " +
    "retry. Nothing in CI applies them."
  );
}
