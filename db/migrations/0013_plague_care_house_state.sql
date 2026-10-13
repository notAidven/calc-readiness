-- Exact, per-student resume state for Three Rounds at the Care House.
--
-- The browser posts events, never a computed state. The authenticated service derives
-- student_id from Cognito, locks this row, applies @cr/game's reducer, and writes the resulting
-- JSON in the same transaction. That makes Aurora authoritative for signed-in play while the
-- explicit frontend-only demo uses its own versioned browser store.
create table public.plague_crisis_state (
  student_id uuid primary key,
  state jsonb not null,
  updated_at timestamptz not null default now(),
  constraint plague_crisis_state_is_object check (jsonb_typeof(state) = 'object')
);

grant select, insert on public.plague_crisis_state to app_service;
grant update (state, updated_at) on public.plague_crisis_state to app_service;

comment on table public.plague_crisis_state is
  'Authoritative in-progress Era 6 Care House state. Written only by server-applied reducer events.';
