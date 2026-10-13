-- Every existing city predates the archipelago and therefore becomes the learner's Era 1
-- island. The updates are explicit before NOT NULL so no legacy row can be left unowned.
alter table public.city_placement
  add column island_era public.city_era;
update public.city_placement
   set island_era = 'prehistoric'
 where island_era is null;
alter table public.city_placement
  alter column island_era set not null;
alter table public.city_placement
  drop constraint city_placement_pkey;
alter table public.city_placement
  add primary key (student_id, island_era, placement_id);

alter table public.city_road
  add column island_era public.city_era;
update public.city_road
   set island_era = 'prehistoric'
 where island_era is null;
alter table public.city_road
  alter column island_era set not null;
alter table public.city_road
  drop constraint city_road_pkey;
alter table public.city_road
  add primary key (student_id, island_era, grid_col, grid_row);

alter table public.city_crisis_damage
  add column island_era public.city_era;
update public.city_crisis_damage
   set island_era = 'prehistoric'
 where island_era is null;
alter table public.city_crisis_damage
  alter column island_era set not null;
alter table public.city_crisis_damage
  drop constraint city_crisis_damage_pkey;
alter table public.city_crisis_damage
  add primary key (
    student_id,
    island_era,
    damage_ordinal,
    subject_kind,
    subject
  );

-- Place-owned scalar state. `city_state` remains the one per-learner row and owns which
-- island is current; road/civic spend and the damage mint move onto the island.
create table public.city_island_state (
  student_id uuid not null,
  island_era public.city_era not null,
  road_gold_spent integer not null default 0 check (road_gold_spent >= 0),
  civic_material_spent integer not null default 0 check (civic_material_spent >= 0),
  next_damage_ordinal integer not null default 1 check (next_damage_ordinal >= 1),
  reset_count integer not null default 0 check (reset_count >= 0),
  founded_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (student_id, island_era)
);

insert into public.city_island_state (
  student_id,
  island_era,
  road_gold_spent,
  civic_material_spent,
  next_damage_ordinal,
  updated_at
)
select
  student_id,
  'prehistoric'::public.city_era,
  road_gold_spent,
  0,
  next_damage_ordinal,
  updated_at
from public.city_state
on conflict (student_id, island_era) do nothing;

alter table public.city_state
  add column current_island public.city_era;
update public.city_state
   set current_island = 'prehistoric'
 where current_island is null;
alter table public.city_state
  alter column current_island set default 'prehistoric',
  alter column current_island set not null;

-- The legacy scalar columns stay in place for the same build's `single-island` rollout mode.
-- Rolling the UI back therefore needs no reverse migration and deletes no partitioned data.
grant select, insert, delete on public.city_placement to app_service;
grant update (grid_col, grid_row, rot) on public.city_placement to app_service;
grant select, insert, delete on public.city_road to app_service;
grant select, insert, delete on public.city_crisis_damage to app_service;

grant select, insert on public.city_island_state to app_service;
grant update (
  road_gold_spent,
  civic_material_spent,
  next_damage_ordinal,
  reset_count,
  updated_at
) on public.city_island_state to app_service;

grant update (current_island) on public.city_state to app_service;

-- A reset may need to reduce an over-funded island to its authored total. It remains one
-- append-only ledger row; this widens the named-subject check without granting UPDATE/DELETE.
alter table public.resource_grant_ledger
  drop constraint resource_grant_ledger_spend_names_its_subject;
alter table public.resource_grant_ledger
  add constraint resource_grant_ledger_spend_names_its_subject
  check (
    kind = 'grant'
    or starts_with(reason_code, 'purchase:')
    or starts_with(reason_code, 'build:')
    or starts_with(reason_code, 'repair:')
    or starts_with(reason_code, 'era_advance:')
    or starts_with(reason_code, 'island_reset:')
  );

comment on column public.city_placement.island_era is
  'Island-local partition key. Legacy rows migrated explicitly to prehistoric.';
comment on table public.city_island_state is
  'Per-island spend, crisis-damage mint and reset generation. One row per founded island.';
comment on column public.city_state.current_island is
  'The island under the learner''s feet. Separate from the retained legacy era_id column.';