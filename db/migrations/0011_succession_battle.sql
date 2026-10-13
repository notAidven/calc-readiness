-- ERA FOUR SUCCESSION BATTLE.
--
-- The browser is not the authority for a signed-in crisis. One row holds the exact reducer
-- state plus any interrupted three-question batch, scoped by the Cognito `sub` the service
-- verified. Commands are compare-and-swap by `revision`, so two tabs cannot silently overwrite
-- one another.
--
-- This is ordinary game state, not mastery evidence. It has no foreign key or write path to
-- `student_node_state`, `mastery_evidence`, or `assessment_item_response`. Eligibility and the
-- question window READ authoritative node state; only the service writes this table.

create table public.succession_battle (
  student_id uuid primary key,
  revision integer not null check (revision >= 1),
  battle jsonb not null,
  updated_at timestamptz not null default now(),
  constraint succession_battle_is_object check (jsonb_typeof(battle) = 'object')
);

grant select, insert on public.succession_battle to app_service;
grant update (revision, battle, updated_at) on public.succession_battle to app_service;

comment on table public.succession_battle is
  'Server-authoritative Era 4 Succession reducer state and interrupted question batch. '
  'Optimistically versioned; never a mastery or assessment-evidence source.';
