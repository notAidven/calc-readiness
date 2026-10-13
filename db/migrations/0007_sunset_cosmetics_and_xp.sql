-- ===========================================================================
-- THE COSMETIC SHOP AND XP ARE SUNSET (team lead, 2026-08-03): "sunset the cosmetic
-- shop and xp systems completely - they dont really have a role in our game. remove it
-- from the interface and it shouldnt really have any implications anywhere."
--
-- ⚑ THERE WAS PERSISTENCE TO UNWIND, WHICH THE BRIEF DID NOT EXPECT. The 2026-07-31
-- note on `TEAM_CHECKLIST.md`'s §8 line measured `db/migrations/` at `eacc444f` and
-- recorded "still 0001-0003, with none of the five tables". `0004_civilization_state.sql`
-- landed after that measurement and built two of §8's surfaces: `equipped_cosmetic`
-- whole, and `resource_grant_ledger` carrying a `cosmetic_id` column, an `xp` member on
-- the `economy_resource` enum, and two CHECK constraints written about both.
--
-- Nothing WRITES either of them — `writes.ts` says so in as many words and a grep for
-- `insert into ... equipped_cosmetic` across the tree returns nothing — so no learner
-- data is being dropped here. What is being dropped is a shape the code no longer has,
-- which is the point: a column that can only ever be null and a CHECK over an id nothing
-- can mint are the database's version of a guard with an emptied population.
--
-- FOUR CHANGES, in dependency order:
--   1. `equipped_cosmetic` — the table, its grants, its comment. It held slot -> cosmetic,
--      "the one economy fact the ledger cannot express", and there are no cosmetics.
--   2. `resource_grant_ledger.cosmetic_id` — the column, with the two constraints keyed
--      on it (`cosmetic_id_iff_cosmetic_purchase`) or on the reason it implied
--      (`spend_names_its_subject`, which listed `purchase:`).
--   3. The `xp` member of `public.economy_resource`. Postgres cannot drop an enum value,
--      so the type is rebuilt — which is also the only way to be sure no row survives
--      denominated in it.
--   4. `xp_is_never_spent`, which quantified over the value being removed.
--
-- THE ID IS RETIRED, NOT REPURPOSED, which is `0004`'s own standing rule: "NEVER REPURPOSE
-- A RESOURCE ID. RETIRE IT AND ADD A NEW ONE." `xp` leaves the enum and must never come
-- back meaning something else. The browser store makes the same move by bumping its key
-- version to v4 (`economyPersistence.ts`), because a stored blob has no enum to reject it.
-- ===========================================================================

-- 1. THE EQUIPPED-COSMETIC TABLE. Dropped rather than left empty: an unused table with
--    live grants is a write path nobody is guarding.
drop table if exists public.equipped_cosmetic;

-- 2. THE LEDGER'S COSMETIC COLUMN AND THE TWO CHECKS ABOUT IT.
--
--    `spend_names_its_subject` is REPLACED rather than dropped, and that distinction is
--    the whole of what survives here. It is the clause that keeps a spend from meaning
--    "material left the wallet for no stated reason", and it was added precisely because
--    re-keying `cosmetic_id` off the purchase prefix had opened that hole. With the
--    cosmetic clause gone it is the only thing left standing there, so it is re-added
--    minus `purchase:` rather than removed with its sibling.
alter table public.resource_grant_ledger
  drop constraint resource_grant_ledger_cosmetic_id_iff_cosmetic_purchase;

alter table public.resource_grant_ledger
  drop constraint resource_grant_ledger_spend_names_its_subject;

alter table public.resource_grant_ledger
  add constraint resource_grant_ledger_spend_names_its_subject
  check (
    kind = 'grant'
    or starts_with(reason_code, 'build:')
    or starts_with(reason_code, 'repair:')
    or starts_with(reason_code, 'era_advance:')
  );

alter table public.resource_grant_ledger
  drop column cosmetic_id;

-- 3. AND 4. THE `xp` RESOURCE, AND THE CHECK THAT ONLY SPOKE ABOUT IT.
--
-- `xp_is_never_spent` reads `not (kind = 'spend' and resource_type = 'xp')`, which cannot
-- be re-expressed over a type that has no `xp`: with the value gone the clause is
-- unsatisfiable-by-construction rather than merely true, which is the same hollow shape
-- the TypeScript invariant had. It is dropped, and the code-side clause went with it.
alter table public.resource_grant_ledger
  drop constraint resource_grant_ledger_xp_is_never_spent;

-- Any surviving xp row is deleted BEFORE the type is rebuilt, so the cast below cannot
-- fail on a value the new type does not have. Nothing writes this table today, so this is
-- expected to affect zero rows; it is here because "expected to" is not a guarantee about
-- a database somebody may have applied 0004 to and poked by hand.
delete from public.resource_grant_ledger where resource_type::text = 'xp';

create type public.economy_resource_v2 as enum (
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

alter table public.resource_grant_ledger
  alter column resource_type type public.economy_resource_v2
  using resource_type::text::public.economy_resource_v2;

drop type public.economy_resource;

alter type public.economy_resource_v2 rename to economy_resource;

comment on table public.resource_grant_ledger is
  'Append-only economy ledger, keyed (student_id, event_id, resource_type). Every '
  'material balance is a projection over these rows. The cosmetic shop and XP were '
  'sunset on 2026-08-03: no cosmetic_id column, no xp resource, and no equipped_cosmetic '
  'table.';

comment on constraint resource_grant_ledger_spend_names_its_subject
  on public.resource_grant_ledger is
  'A spend must name what it bought. The three prefixes are the economy core''s own '
  'SPEND_REASON_PREFIXES; a grant is free to carry any reason. `purchase:` was a fourth '
  'until the shop was sunset.';