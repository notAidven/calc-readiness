-- CIVILIZATION STATE. Somewhere to put the city, and permission to write it.
--
-- Of the eighteen kinds of state that make up a civilization, exactly one — the
-- onboarding placement estimate — survived a sign-in before this file. Two separate
-- reasons, and this migration fixes both:
--
--  1. NO TABLE COULD HOLD THE CITY. Placements, the town hall, roads, the netting
--     counter, crisis damage, the ledger and the live era had nowhere to go at all.
--  2. THE SERVICE ROLE COULD NOT WRITE THE TABLES THAT DID EXIST. `app_service` held
--     `select` plus `insert (student_id, node_id, placement_estimate)` on
--     `student_node_state` — NO `update` — and `select` only on `neighborhood_state`.
--     So `mastery` was frozen at 0 forever, `completion_status` is generated over it
--     and was therefore permanently `locked`, and `lesson_stage` was permanently
--     `not_started`. New tables with no grants would reproduce exactly that, which is
--     why every table below is granted in the same file that creates it.
--
-- Design record: `docs/superpowers/specs/2026-07-31-civilization-persistence-design.md`
-- (§6.3 groups A-E). This is Wave 0 item B: the whole set lands before any writer, so
-- no writer ships against a table that is still moving. The writers themselves are
-- Waves 1-3 and are NOT in this file.
--
-- MIGRATION BURDEN: NONE. Measured against the live cluster over the Data API on
-- 2026-07-31 — `student_node_state` 0 rows, `neighborhood_state` 0,
-- `assessment_item_response` 0, `mastery_evidence` 0, `raw_response_log` 0, with a
-- single abandoned smoke-test row in `assessment_administration` and its `_progress`
-- sibling. Nothing below rewrites a row, and Group A adds no column and changes no
-- type: it is a grant and nothing else.
--
-- NOTHING HERE TOUCHES GRADED EVIDENCE. No change to `assessment_administration`,
-- `assessment_item_response`, `mastery_evidence` or `raw_response_log`; no item hash,
-- no `scoring_model_version`, no `equivalence_checker_version`, no `routing_path`, no
-- `seq`. `hashItemDefinition` canonicalises exactly `{node_id, prompt, answer}` and no
-- field it reaches is touched, so NO RESCORE IS IMPLIED.
--
-- Conventions follow `0001_core_contracts.sql`: plain Postgres, no `auth.users`, no
-- RLS. `student_id` is the Cognito `sub`, supplied by the server from a verified JWT,
-- and per-student scoping is enforced in the app layer (`where student_id = :sub`).

-- ===========================================================================
-- GROUP A — grants only, on the two tables that already exist.
-- NO new columns. NO learning-record widening. This is the whole of the change
-- needed to unfreeze mastery.
-- ===========================================================================

grant update (mastery, mastery_updated_at, lesson_stage, last_practiced_at)
  on public.student_node_state to app_service;

-- `completion_status` is `generated always as ... stored` over `mastery`, so it
-- follows the grant above with no grant of its own — and must not be granted, since
-- Postgres forbids writing a generated column.

grant insert (student_id, neighborhood_id, checkpoint_cleared)
  on public.neighborhood_state to app_service;
grant update (checkpoint_cleared) on public.neighborhood_state to app_service;

-- ===========================================================================
-- GROUP B — city layout (new; ordinary game state).
-- ===========================================================================

create type public.city_era as enum (
  'prehistoric',
  'neolithic',
  'bronze_age',
  'classical',
  'medieval',
  'renaissance',
  'industrial',
  'atomic_age',
  'information_age',
  'cyberpunk'
);

create type public.city_placement_kind as enum ('skill', 'town_hall', 'civic');

-- ONE TABLE FOR ALL THREE KINDS, because the grid, the occupancy math and the move
-- path are already one mechanism in the app. `kind` is what keeps the hall out of the
-- `N/6` roster count, exactly as the client already does.
--
-- `grid_col`/`grid_row` rather than the app's `col`/`row`: `row` is a reserved word in
-- Postgres and would need quoting at every call site. The read model aliases them back.
create table public.city_placement (
  student_id uuid not null,
  -- THE IDEMPOTENCY KEY, AND IT IS SHARED WITH THE LEDGER. A civic purchase is a
  -- ledger row whose event id is `build:<placement_id>`, so this string must be
  -- BYTE-IDENTICAL to the one in `resource_grant_ledger.event_id` or the join that
  -- makes a purchase idempotent silently stops matching.
  placement_id text not null,
  kind public.city_placement_kind not null,
  -- The node id for a skill (`NUM.S`), `town-hall` for the hall, or the civic
  -- catalogue row's shipped id (`prehistoric_longhouse`) — never a display name.
  subject_id text not null check (subject_id <> ''),
  grid_col integer not null,
  grid_row integer not null,
  rot integer not null default 0,
  era_built public.city_era not null,
  created_at timestamptz not null default now(),
  primary key (student_id, placement_id),
  -- `:` IS THE EVENT-ID DELIMITER. `buildEventId` rejects a colon inside a part, and
  -- PR #288 found exactly this defect in this exact seam: `civic:<type>:<sequence>`
  -- was fed whole to `buildEventId` and all four era-one building types threw. A
  -- placement id that cannot be spelled into an event id is a placement that can
  -- never be paid for, so the database refuses it at the source.
  constraint city_placement_id_is_event_id_safe
    check (placement_id <> '' and position(':' in placement_id) = 0)
);

create index city_placement_student_kind_idx
  on public.city_placement (student_id, kind);

-- A road only ever occupies a cell: laid or lifted, never edited. Hence no surrogate
-- key and no update grant below.
create table public.city_road (
  student_id uuid not null,
  grid_col integer not null,
  grid_row integer not null,
  primary key (student_id, grid_col, grid_row)
);

-- The per-student scalars. ROADS AND `road_gold_spent` ARE ONE UNIT: persist one
-- without the other and the player gets free roads, or material taken for roads that
-- are not there. The browser store already honours this (both live in one
-- `CityDevSnapshot`); `city_road` and this column landing in one migration is how the
-- server honours it.
--
-- A road spend is NEVER a ledger row — `roadsEconomy.ts` nets it on `spendable` and
-- leaves the ledger's own read untouched — so this counter is not derivable from
-- `resource_grant_ledger` and genuinely needs storing.
create table public.city_state (
  student_id uuid primary key,
  -- THE LIVE ERA, which today lives only in `localStorage` under `cr.city.era.v1` —
  -- ungated, so it is one of the few things that already "persists" for a signed-in
  -- learner, per device, with no server able to see or correct it. This column is
  -- where it lands.
  --
  -- THE REPOINT IS NO LONGER HALF DONE (amended 2026-08-01, Wave 1; comment only, no
  -- DDL moved). The design record states the ordering constraint as *"the stored era
  -- and the persisted ledger must land in the same change, and the economy's four
  -- static-era reads must be repointed in that same change"*, and warns that
  -- repointing the wallet alone leaves the shop showing one price while the wallet
  -- charges another. PR #309 repointed the wallet and left three; Wave 1 repointed
  -- those three at the live era store, so `Shop.tsx` (the displayed price),
  -- `materialWord.ts` (the material every sentence names) and `roadsEconomy.ts` (the
  -- road decorator's affordability check) now read `cityEraId()`/`useCityEra()` like
  -- the wallet. Nothing economic is pinned to `CURRENT_ERA_ID` any more.
  --
  -- WHAT IS STILL OWED HERE. The repoints all read the BROWSER's era store
  -- (`cr.city.era.v1`), which is ungated and per-device, so a signed-in learner's era
  -- follows their laptop rather than their account. This column is where that lands,
  -- and the ordering constraint's remaining half stands: the stored era and the
  -- persisted ledger must arrive together (Wave 2 G), because a wallet denominated by
  -- a stored era while the ledger is not persisted converts nothing and reconciles
  -- nothing. The read model deliberately does not select this column yet, and
  -- `services/diagnostic-api/src/reads.test.ts` fails if someone adds it without
  -- reading this.
  era_id public.city_era not null,
  -- THE ROAD NETTING COUNTER, AND IT HAS NO ERA ON IT — deliberately mirroring the
  -- browser rather than quietly improving on it. `roadsEconomy.netWallet` subtracts
  -- this from whatever `spendable` currently is, so four tiles laid in era one read 20
  -- off an era-two grain stockpile (clamped at zero; nothing goes negative). A per-era
  -- counter is NOT the fix and is not built here: `roadsEconomy.ts` names the real
  -- answer as the repeatable `spendMaterial({ amount, reason })` primitive, at which
  -- point a road spend is an ordinary ledger row and this column is deleted rather
  -- than migrated. Widening it now would be building a mechanism already slated to go.
  road_gold_spent integer not null default 0 check (road_gold_spent >= 0),
  updated_at timestamptz not null default now()
);

-- CITIZENS NEED NO TABLE. `cityCitizenRoster` derives the whole roster from
-- `{viewModel, placements, seed}`, so population comes free once `city_placement`
-- persists. This comment exists so nobody adds one later.

-- ===========================================================================
-- GROUP C — crisis damage (new; ordinary game state, with the mint redesigned).
-- ===========================================================================

-- `building` and `ground` are the two REPAIRABLE kinds and match the economy core's
-- `RepairSubjectKind` exactly, because they are half of a repair spend's key.
-- `civic` is a SUSPENSION rather than a ruin: it is carried in the same `CrisisDamage`
-- record, it lifts by other means, and no repair spend is keyed by it.
create type public.crisis_damage_subject as enum ('building', 'ground', 'civic');

create table public.city_crisis_damage (
  student_id uuid not null,
  -- THE MINT IS NOT PORTED, AND THAT IS THE POINT. The browser stores
  -- `next_damage_id` and guards it with a strict "greater than every issued id"
  -- invariant, because a browser has no atomic counter and a rewound mint re-issues
  -- an id the ledger already recorded a repair against — leaving a ruin the economy
  -- believes is paid for and the player cannot clear. Server-side the counter is
  -- DERIVED, `max(damage_ordinal) + 1` within the writing transaction, which deletes
  -- that failure mode rather than migrating it.
  --
  -- Stored as the ordinal and not as the string so `max()` orders correctly: `d10`
  -- sorts before `d2` as text.
  damage_ordinal integer not null check (damage_ordinal >= 1),
  -- The string the ledger joins on, derived so it can never drift from the client's
  -- `crisisDamageId()`. The repair spend's event id is
  -- `repair:<damage_id>:<kind>:<subject>`, so every part of it must stay colon-free.
  damage_id text generated always as ('d' || damage_ordinal::text) stored,
  subject_kind public.crisis_damage_subject not null,
  -- A building's node id, or a ground cell's `"col,row"` key, or a civic placement id.
  subject text not null,
  created_at timestamptz not null default now(),
  -- ONE DAMAGE ID COVERS MANY SUBJECTS. `foldCrisisDamage` mints ONE id per crisis run
  -- and stamps it on every subject that run ruined, so `(student_id, damage_id)` is
  -- NOT unique and cannot be the key. The identity is the triple the repair event id
  -- spells out, which is why the primary key is shaped like the event id.
  primary key (student_id, damage_ordinal, subject_kind, subject),
  constraint city_crisis_damage_subject_is_event_id_safe
    check (subject <> '' and position(':' in subject) = 0)
);

-- ===========================================================================
-- GROUP D — economy (new). TWO tables, not Contracts §8's five.
--
-- §8's invariants, ownership and write-mapping are ratified and stand. Its DDL does
-- not survive contact with the shipped core, for two reasons recorded in the
-- amendment landing with this migration:
--
--  1. It is Supabase-shaped (`references auth.users`, RLS `with check`, `auth.uid()`).
--     The AWS-native port deleted all of that in favour of app-layer scoping, and
--     these tables need the same re-port `0001` already did for §1/§2.
--  2. It models ONE generic `balance`. The shipped `LedgerEntry` carries
--     `resource_type` over ELEVEN resources and is keyed
--     `(student_id, event_id, resource_type)` — one lesson completion writes two rows
--     (xp + the era material) under one event id, which §8's `event_id`-alone primary
--     key structurally forbids. §8's own open decisions invited this generalisation.
--
-- THE THREE TABLES DELIBERATELY NOT BUILT:
--   `resource_wallet`    — every balance is a projection over the ledger
--                          (`computeBalances` / `computeMaterialBalances`), so
--                          INV-COS-5 (`balance == sum(grants) - sum(spends)`) holds by
--                          construction. A stored column would have to be kept in
--                          step. Add a materialized cache only if reads measure slow.
--   `owned_cosmetic`     — `purchasedIds()` derives ownership from spend rows carrying
--                          `cosmetic_id`; prestige is re-derived from the XP balance
--                          on every restore, deliberately.
--   `cosmetic_catalog`   — the catalogue ships in code (`CosmeticDescriptor`,
--                          `civicCatalogue.ts`). A table would be a second source of
--                          truth for something with no runtime editor.
-- ===========================================================================

-- RESOURCE IDS ARE AN ENUM, NEVER FREE TEXT, and that is a lesson carried over from
-- the browser store rather than a preference:
--
--  * A RETIRED id fails loudly. `flint` fell out of the allow-list, the blob was
--    rejected and deleted, and no version bump was needed. An enum gives the same
--    outcome server-side: a retired id fails at write time.
--  * A REPURPOSED id passes every membership check, and that is the case with no
--    automated defence. `gold` was the legacy currency and became era five's
--    material; the word is a member before the change and after it, so nothing
--    derived from the union could tell the two meanings apart. Only bumping the
--    browser key version stopped a pre-drop wallet restoring as an era-five
--    stockpile. A SERVER TABLE HAS NO KEY VERSION TO BUMP.
--
-- Hence the rule, which no constraint can enforce and which is therefore written
-- here where the next author will read it: NEVER REPURPOSE A RESOURCE ID. RETIRE IT
-- AND ADD A NEW ONE. `era_id` on the row below is the backstop that makes a breach
-- recoverable after the fact instead of permanent.
create type public.economy_resource as enum (
  'xp',
  'stone',
  'grain',
  'bronze',
  'silver',
  'gold',
  'gems',
  'coal',
  'electricity',
  'silicon',
  'data'
);

create type public.economy_txn_kind as enum ('grant', 'spend');

create table public.resource_grant_ledger (
  student_id uuid not null,
  event_id text not null check (event_id <> ''),
  resource_type public.economy_resource not null,
  kind public.economy_txn_kind not null,
  -- Always > 0; `kind` carries the sign. `integer` rather than §8's `bigint`: a row is
  -- a single grant or spend (tens to low thousands), and the Data API round-trips an
  -- int64 as a string, which every reader would then have to parse.
  amount integer not null check (amount > 0),
  -- 'lesson_complete' | 'interleaved' | 'star' | 'purchase:<cosmetic_id>' |
  -- 'build:<placement_id>' | 'repair:<damage_id>:<kind>:<subject>' |
  -- 'era_advance:<era_id>'.
  reason_code text not null check (reason_code <> ''),
  cosmetic_id text,
  -- SELF-DESCRIBING ROWS, and the one column here that is not in the shipped
  -- `LedgerEntry`. Had `gold` rows existed in Aurora when the currency was dropped,
  -- this column would have told a currency row from an era-five material row after
  -- the fact; without one, `computeBalances` and `computeMaterialBalances` split on
  -- `resource_type` alone and nothing downstream can recover the distinction. One
  -- column, and it makes the single failure mode with no automated defence
  -- recoverable rather than permanent.
  era_id public.city_era not null,
  created_at timestamptz not null default now(),
  -- THE COMPOSITE KEY (D-R5), not §8's `event_id` alone: one lesson completion writes
  -- an xp row and a material row under one event id, and an era advance writes a
  -- debit leg and a credit leg under one `era_advance:<era_id>`. Both are distinct
  -- 3-of-3 on `resource_type`, and both are replay no-ops on the whole event.
  primary key (student_id, event_id, resource_type),
  -- XP IS NEVER SPENT. It credits competence, and competence is not currency.
  constraint resource_grant_ledger_xp_is_never_spent
    check (not (kind = 'spend' and resource_type = 'xp')),
  -- A SPEND MUST NAME ITS SUBJECT. The four prefixes are the economy core's own
  -- `SPEND_REASON_PREFIXES`; a grant is free to carry any reason.
  constraint resource_grant_ledger_spend_names_its_subject
    check (
      kind = 'grant'
      or starts_with(reason_code, 'purchase:')
      or starts_with(reason_code, 'build:')
      or starts_with(reason_code, 'repair:')
      or starts_with(reason_code, 'era_advance:')
    ),
  -- `cosmetic_id` IS SET IFF THE ROW IS A COSMETIC PURCHASE. A civic build and a
  -- repair are spends that carry none, which is why this is keyed on the reason
  -- rather than on `kind`.
  constraint resource_grant_ledger_cosmetic_id_iff_cosmetic_purchase
    check ((cosmetic_id is not null) = starts_with(reason_code, 'purchase:'))
);

create index resource_grant_ledger_student_created_idx
  on public.resource_grant_ledger (student_id, created_at);

-- The one thing the ledger genuinely cannot express. Ownership is derivable and
-- prestige re-derives from the XP balance, but which cosmetic sits in which slot is a
-- choice, not a consequence.
create table public.equipped_cosmetic (
  student_id uuid not null,
  -- e.g. 'district:D1', 'building:NUM.S'.
  slot text not null check (slot <> ''),
  cosmetic_id text not null check (cosmetic_id <> ''),
  equipped_at timestamptz not null default now(),
  primary key (student_id, slot)
);

-- ===========================================================================
-- GROUP E — era. `city_state.era_id` above covers the live era, and that is all of
-- Group E that lands here.
--
-- NO `city_era_ceremony` TABLE. OT-13 is explicitly open on whether the era-trial
-- ceremony checkpoint belongs server-side at all, and `ceremonyCheckpoint.ts` warns
-- that the answer "must not turn stage progress into a second write nobody ratified".
-- That is not a decision to take silently in a migration.
-- ===========================================================================

-- ===========================================================================
-- RUNTIME GRANTS. Least-privilege, and scoped to the DML each writer will actually
-- issue — the half of this migration most easily forgotten, and the half that
-- unfreezes the game.
-- ===========================================================================

-- Placed and moved, never removed: nothing in the app demolishes a placement (a
-- crisis RUINS a building and SUSPENDS a civic contribution; neither deletes a row).
-- Update is column-scoped to the transform, so no writer can rewrite what a placement
-- IS — only where it stands.
grant select, insert on public.city_placement to app_service;
grant update (grid_col, grid_row, rot) on public.city_placement to app_service;

-- Laid or lifted; there is a real `removeRoads` path, and no update path at all.
grant select, insert, delete on public.city_road to app_service;

grant select, insert on public.city_state to app_service;
grant update (era_id, road_gold_spent, updated_at) on public.city_state to app_service;

-- A repair clears a ruin, so delete is real here. Damage rows are never edited: the
-- fold keeps an already-ruined subject's ORIGINAL damage id rather than re-stamping
-- it, precisely so an unpaid repair cannot be silently invalidated.
grant select, insert, delete on public.city_crisis_damage to app_service;

-- APPEND-ONLY, AND DELIBERATELY WITHOUT `update` OR `delete` (INV-COS-4/5). The ledger
-- is the single reconstructable source of truth for every balance and for ownership;
-- a role that can edit or drop a row can rewrite a player's history and break
-- `balance == sum(grants) - sum(spends)` in a way nothing downstream could detect.
grant select, insert on public.resource_grant_ledger to app_service;

-- Equipping into an occupied slot replaces what is there, so this is an upsert:
-- insert plus a column-scoped update. No delete — nothing unequips today.
grant select, insert on public.equipped_cosmetic to app_service;
grant update (cosmetic_id, equipped_at) on public.equipped_cosmetic to app_service;

comment on table public.city_placement is
  'City layout: skill buildings, the town hall and civic purchases on one grid. '
  '`placement_id` is byte-identical to the ledger''s `build:<placement_id>` event id.';
comment on table public.city_road is
  'Road cells. Travels with `city_state.road_gold_spent`; neither persists alone.';
comment on table public.city_crisis_damage is
  'Standing crisis damage. The damage-id mint is DERIVED from max(damage_ordinal) in '
  'the writing transaction, never carried from the client.';
comment on table public.resource_grant_ledger is
  'Append-only economy ledger, keyed (student_id, event_id, resource_type). Every '
  'balance and all cosmetic ownership are projections over these rows.';
comment on table public.equipped_cosmetic is
  'Slot -> cosmetic. The one economy fact the ledger cannot express.';
