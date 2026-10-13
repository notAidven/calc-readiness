-- Diagnostic persistence (0002), ported to plain Postgres for Aurora. Additive:
-- the served-order `seq` key on the immutable response log + the ephemeral engine
-- progress table. No RLS/policies — the server is the only caller and scopes every
-- row by the verified Cognito sub. See docs/Contracts_Amendment_Diagnostic_Persistence.md.

-- 1. Served-order key on the immutable response log ------------------------------
-- The measurement pipeline recomputes theta from the append-only responses "in
-- served order" (Assessment_Scoring_Spec §9). Postgres has no implicit row order,
-- so a server-assigned monotonic seq makes the ordered read deterministic. It is
-- generated always as identity: present on every read, never client-supplied, and
-- NOT surfaced on the frozen @cr/state-schema wire type (it rides on @cr/db's
-- AssessmentItemResponseRow instead).
alter table public.assessment_item_response
  add column seq bigint generated always as identity;

create index assessment_response_seq_idx
  on public.assessment_item_response (administration_id, seq);

comment on column public.assessment_item_response.seq is
  'Server-assigned append order (0002 amendment). Ordered read key so the '
  'measurement pipeline reproduces served order from immutable records '
  '(Assessment_Scoring_Spec §9). Generated always as identity, never client-supplied.';

-- 2. Ephemeral engine working state ---------------------------------------------
-- The adaptive engine persists progress between turns (current stage, served item
-- refs, per-stage scored outcomes). This is NOT an immutable record and is NOT
-- part of the frozen metric: it is server-written, server-read working state.
-- served / outcomes are jsonb payloads of the engine's AdministrationProgress
-- (see @cr/diagnostic).
create table public.assessment_administration_progress (
  administration_id uuid primary key
    references public.assessment_administration (administration_id) on delete cascade,
  student_id uuid not null,
  current_stage_id text,
  served jsonb not null default '[]'::jsonb,
  outcomes jsonb not null default '[]'::jsonb,
  status text not null default 'in_progress'
    check (status in ('in_progress', 'complete')),
  updated_at timestamptz not null default now()
);

create index assessment_progress_student_idx
  on public.assessment_administration_progress (student_id);

comment on table public.assessment_administration_progress is
  'Ephemeral engine working state between adaptive turns. NOT an immutable record; '
  'server-written and server-read. Not part of the frozen metric.';

-- 3. Grants (least-privilege; app_service is the runtime role) --------------------
grant select, insert, update on public.assessment_administration_progress to app_service;
