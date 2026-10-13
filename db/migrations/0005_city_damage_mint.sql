-- THE DAMAGE-ID MINT, STORED RATHER THAN DERIVED. One column and one grant.
--
-- `0004_civilization_state.sql` said the mint would be DERIVED server-side,
-- `max(damage_ordinal) + 1` within the writing transaction, and called that a design
-- improvement over the browser's stored counter. It is not one, and the read model's own
-- docblock (`services/diagnostic-api/src/reads.ts`) already recorded why: a derivation over
-- the rows that SURVIVE satisfies the strictly-greater invariant over rows present and goes
-- BACKWARDS the moment a repair deletes the highest-ordinal ones. `grant … delete on
-- public.city_crisis_damage` is exactly what makes that reachable.
--
--   ruins d1, d2, d3        -> next = 4
--   repair d3 (row deleted) -> next = 3, an ordinal already issued
--
-- A re-issued ordinal keys a repair spend the ledger has already recorded, so the second
-- ruin's repair reports `already_spent`: a ruin the economy believes is paid for and the
-- learner cannot clear. `0004` left it alone on the grounds that *"a mint nothing writes is
-- a mechanism with no caller"*, which was right — the caller lands in the same change as
-- this file (`services/diagnostic-api/src/writes.ts`), so the column lands with it.
--
-- MEASURED, RED BEFORE GREEN. `writes.test.ts`'s "holds the mint above a repaired ruin's
-- ordinal" drives a real save, a real repair and a real re-read; before this column it
-- reported `expected 3 to be 4`.
--
-- MIGRATION BURDEN: NONE BEYOND `0004`'s. A column with a default on a table `0004` created
-- and nothing has yet written. Postgres 11+ adds a non-volatile default without rewriting
-- the table.
--
-- **NOTHING APPLIES THIS AUTOMATICALLY, AND THIS FILE IS THE ONLY ONE PENDING.** Migrations
-- run BY HAND (`node db/apply.mjs` over the RDS Data API, tracked in `schema_migrations`); the
-- one CI workflow does not run them and the CDK stack says migrations happen post-deploy.
--
-- The live cluster was measured on 2026-08-01 at 16:29Z and was TWO BEHIND: `schema_migrations`
-- held only `0001` and `0002`, both from 2026-07-21, so `0003_walk_persistence.sql` had been
-- unapplied for ten days and `0004` since it merged. Both have since been applied and verified
-- — four rows in `schema_migrations`, all seven tables present, and column-level `UPDATE`
-- grants confirmed on `city_state` (era_id, road_gold_spent, updated_at), `city_placement`
-- (grid_col, grid_row, rot), `equipped_cosmetic` and `assessment_administration_walk`.
--
-- That measurement is what makes the grant at the bottom of this file load-bearing rather than
-- defensive: `city_state`'s UPDATE grant really is those three columns and nothing else, so
-- without the `grant update (next_damage_ordinal)` below, this file's column would be
-- unwritable by `app_service` and every returning learner's save would fail with
-- `permission denied` — while every test in the repo stayed green, because none of them runs
-- as that role. `test/cityWriteGrants.test.ts` is what stands in for the role.
--
-- APPLY THIS BEFORE THE NEXT DEPLOY, NOT BEFORE THE MERGE. The read selects
-- `next_damage_ordinal`, so a Lambda built from this branch against a cluster that stopped at
-- `0004` answers `GET /api/city` with a missing-COLUMN error (not a missing table — `0004`'s
-- tables are there now). Merging is harmless: the one CI workflow runs the invariants gate and
-- deploys nothing, so nothing reaches the cluster until a person deploys. The error is wrapped
-- to name the command that fixes it (`missingSchemaHint`), because an unapplied migration reads
-- like a broken service otherwise.

-- ===========================================================================
-- THE HIGH-WATER MARK. Monotone by construction: the writer advances it with
-- `greatest(city_state.next_damage_ordinal, excluded.next_damage_ordinal)`, so neither a
-- repair nor a stale client can pull it down, and the read takes the greater of this and
-- the surviving rows so a city written before this column still cannot rewind.
--
-- It lives on `city_state` rather than in a per-student sequence for two reasons. A
-- sequence is not transactional (a rolled-back save would still burn an id, which is
-- harmless but makes the ordinal stop meaning "the nth crisis"), and there is no sanctioned
-- path to create one sequence per student. A column on a row the writer already upserts
-- costs no extra statement.
--
-- WHY IT IS THE ORDINAL AND NOT THE `d<n>` STRING: `max()` over text sorts `d10` before
-- `d2`. Same reason `city_crisis_damage.damage_ordinal` is an integer with the string
-- generated off it.
-- ===========================================================================

alter table public.city_state
  add column next_damage_ordinal integer not null default 1
    check (next_damage_ordinal >= 1);

-- BACKFILL. A no-op on the empty table this lands on, and correct if `0004` was applied and
-- used before this file arrived: `greatest` ignores nulls, so a student with no damage rows
-- keeps the default of 1. Without it, a city whose ruins reached d7 would re-issue d1.
update public.city_state s
   set next_damage_ordinal = greatest(
         s.next_damage_ordinal,
         (select max(d.damage_ordinal) + 1
            from public.city_crisis_damage d
           where d.student_id = s.student_id)
       );

-- THE GRANT, which is the half of a migration `0004`'s own header calls the most easily
-- forgotten. `grant select, insert on public.city_state` is table-wide and already covers
-- this column on insert; the UPDATE grant is column-scoped
-- (`grant update (era_id, road_gold_spent, updated_at)`), so without this line the upsert's
-- `do update` would fail with `permission denied` for every returning learner while every
-- test in the tree stayed green. `test/cityWriteGrants.test.ts` derives the granted columns
-- from these files and holds the writer's DML to them for exactly that reason.
grant update (next_damage_ordinal) on public.city_state to app_service;

comment on column public.city_state.next_damage_ordinal is
  'High-water damage-id mint. STORED, never derived from surviving rows: a repair deletes '
  'the highest ordinal, and a re-issued ordinal collides with a repair spend the ledger '
  'has already recorded.';
