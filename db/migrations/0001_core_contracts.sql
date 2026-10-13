-- Frozen storage contracts from docs/Contracts.md, ported to plain Postgres for
-- Aurora Serverless v2 (AWS-native). There is no `auth.users` table and no RLS
-- policies: `student_id` is the Cognito `sub` (a uuid), supplied by the server.
-- The Lambda is the only DB caller (over the RDS Data API) and enforces
-- per-student scoping in the app layer (WHERE student_id = :sub, from the verified
-- JWT). A least-privilege `app_service` role (bootstrapped by db/apply.mjs) gets
-- only the table DML the server actually issues and does NOT own the tables.

create type public.completion_status as enum ('locked', 'in_progress', 'complete');
create type public.lesson_stage as enum ('not_started', 'teaching', 'practice', 'done');
create type public.assessment_purpose as enum ('pre', 'post', 'placement');
create type public.scoring_status as enum (
  'correct',
  'incorrect',
  'invalid_input',
  'unsupported_expression',
  'scoring_error'
);

create table public.student_node_state (
  student_id uuid not null,
  node_id text not null,
  placement_estimate smallint not null check (placement_estimate between 0 and 3),
  mastery smallint not null default 0 check (mastery between 0 and 3),
  mastery_updated_at timestamptz,
  completion_status public.completion_status
    generated always as (
      case
        when mastery >= 2 then 'complete'::public.completion_status
        when mastery = 1 then 'in_progress'::public.completion_status
        else 'locked'::public.completion_status
      end
    ) stored,
  lesson_stage public.lesson_stage not null default 'not_started',
  last_practiced_at timestamptz,
  primary key (student_id, node_id)
);

create table public.neighborhood_state (
  student_id uuid not null,
  neighborhood_id text not null,
  checkpoint_cleared boolean not null default false,
  primary key (student_id, neighborhood_id)
);

create table public.assessment_administration (
  administration_id uuid primary key,
  student_id uuid not null,
  purpose public.assessment_purpose not null,
  form_id text not null,
  form_version integer not null check (form_version > 0),
  blueprint_version integer not null check (blueprint_version > 0),
  scoring_engine_version integer not null check (scoring_engine_version > 0),
  -- adaptive-diagnostic amendment (ratified 2026-07-20): frontier scoring model + routing path
  scoring_model_version integer not null check (scoring_model_version > 0),
  equivalence_checker_version integer not null check (equivalence_checker_version > 0),
  routing_path jsonb,
  started_at timestamptz not null,
  submitted_at timestamptz,
  check (submitted_at is null or submitted_at >= started_at)
);

create table public.assessment_item_response (
  administration_id uuid not null references public.assessment_administration
    (administration_id) on delete restrict,
  item_version_id text not null,
  node_id text not null,
  raw_answer jsonb not null,
  item_definition_hash text not null,
  equivalence_checker_version integer not null check (equivalence_checker_version > 0),
  client_correct boolean not null,
  authoritative_correct boolean not null,
  scoring_status public.scoring_status not null,
  reason_code text not null,
  primary key (administration_id, item_version_id)
);

create table public.mastery_evidence (
  evidence_id text primary key,
  student_id uuid not null,
  node_id text not null,
  received_at timestamptz not null default now()
);

create table public.raw_response_log (
  response_id uuid primary key,
  student_id uuid not null,
  item_version_id text not null,
  node_id text not null,
  difficulty smallint not null check (difficulty between 1 and 3),
  raw_answer jsonb not null,
  context text not null check (context in ('diagnostic', 'lesson')),
  form_id text,
  attempt integer not null check (attempt > 0),
  hints_used integer not null default 0 check (hints_used >= 0),
  time_on_item_ms integer not null check (time_on_item_ms >= 0),
  misconception_tag text,
  created_at timestamptz not null default now()
);

create index student_node_state_node_idx
  on public.student_node_state (node_id);
create index assessment_administration_student_idx
  on public.assessment_administration (student_id, purpose);
create index assessment_response_node_idx
  on public.assessment_item_response (node_id);
create index raw_response_student_created_idx
  on public.raw_response_log (student_id, created_at);

-- Least-privilege runtime grants for app_service (the role is bootstrapped by
-- db/apply.mjs before this file runs). Only the DML the server actually issues:
-- placement seed + reads on node/neighborhood state, and the administration
-- lifecycle. app_service does NOT own the tables and cannot run DDL.
grant usage on schema public to app_service;
grant select on public.student_node_state to app_service;
grant insert (student_id, node_id, placement_estimate)
  on public.student_node_state to app_service;
grant select on public.neighborhood_state to app_service;
grant select, insert on public.assessment_administration to app_service;
grant update (routing_path, submitted_at) on public.assessment_administration to app_service;
grant select, insert on public.assessment_item_response to app_service;

comment on column public.student_node_state.placement_estimate is
  'Diagnostic-only onboarding seed. Written once by the server at placement.';
comment on column public.student_node_state.mastery is
  'Monotonic 0-3 value. The server is the only writer.';
comment on table public.neighborhood_state is
  'Checkpoint-only game state. The server verifies readiness before writing.';
comment on table public.assessment_item_response is
  'Immutable response finalized by the authoritative scorer (server-only writes).';
