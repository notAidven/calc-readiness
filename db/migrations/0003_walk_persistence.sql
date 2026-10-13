-- Adaptive-Diagnostic v2 walk persistence (0003), plain Postgres for Aurora.
-- Additive: the ephemeral engine working state for the prerequisite-gated walk
-- (Contracts Amendment v2 §4/§9). Like the 0002 stage-progress table, this is
-- server-written/read working state — NOT an immutable record and NOT part of the
-- frozen metric. The v1 stage progress (assessment_administration_progress) is
-- untouched; a v2 walk administration persists here instead. No RLS/policies — the
-- server is the only caller and scopes every row by the verified Cognito sub.
-- See docs/Contracts_Amendment_Adaptive_Diagnostic_v2.md.

create table public.assessment_administration_walk (
  administration_id uuid primary key
    references public.assessment_administration (administration_id) on delete cascade,
  student_id uuid not null,
  state jsonb not null,
  updated_at timestamptz not null default now()
);

create index assessment_walk_student_idx
  on public.assessment_administration_walk (student_id);

comment on table public.assessment_administration_walk is
  'Ephemeral prerequisite-gated walk state between adaptive turns (Amendment v2). '
  'NOT an immutable record; server-written and server-read. Not part of the frozen metric.';

comment on column public.assessment_administration_walk.state is
  'jsonb-serialized engine WalkState (scope, entry/target tier, current probe node, '
  'per-node probe outcomes; see @cr/diagnostic). Reproducible coverage is recomputed '
  'from the immutable routing_path + response rows, NOT from this ephemeral state (INV-DIAG-4).';

-- Grants (least-privilege; app_service is the runtime role) ----------------------
grant select, insert, update on public.assessment_administration_walk to app_service;
