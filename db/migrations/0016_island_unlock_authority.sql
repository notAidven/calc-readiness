-- The migration runner owns the transaction for this entire file. Do not add BEGIN/COMMIT.

create or replace function public.next_city_era(value public.city_era)
returns public.city_era
language sql
immutable
strict
parallel safe
as $$
  select case value
    when 'prehistoric' then 'neolithic'::public.city_era
    when 'neolithic' then 'bronze_age'::public.city_era
    when 'bronze_age' then 'classical'::public.city_era
    when 'classical' then 'medieval'::public.city_era
    when 'medieval' then 'renaissance'::public.city_era
    when 'renaissance' then 'industrial'::public.city_era
    when 'industrial' then 'atomic_age'::public.city_era
    when 'atomic_age' then 'information_age'::public.city_era
    when 'information_age' then 'cyberpunk'::public.city_era
    when 'cyberpunk' then null
  end
$$;

create or replace function public.island_unlock_target(value public.city_era)
returns integer
language sql
immutable
strict
parallel safe
as $$
  select case value
    when 'prehistoric' then 12
    when 'neolithic' then 10
    when 'bronze_age' then 10
    when 'classical' then 10
    when 'medieval' then 10
    when 'renaissance' then 12
    when 'industrial' then 12
    when 'atomic_age' then 18
    when 'information_age' then 12
    when 'cyberpunk' then 18
  end
$$;

-- One bounded row owns the mutable state needed to grade an arbitrarily long exam. The two
-- JSON values are bounded by the outgoing era's skill count; response history is normalized.
create table public.island_unlock_exam_session (
  student_id uuid not null,
  session_id text not null
    check (session_id <> '' and position(':' in session_id) = 0),
  outgoing_era public.city_era not null,
  destination_era public.city_era not null,
  score integer not null default 0 check (score >= 0),
  target_score integer not null check (target_score > 0),
  response_count integer not null default 0 check (response_count >= 0),
  cycle_node_ids jsonb not null default '[]'::jsonb
    check (
      jsonb_typeof(cycle_node_ids) = 'array'
      and jsonb_array_length(cycle_node_ids) <= target_score / 2
      and not jsonb_path_exists(
        cycle_node_ids,
        '$[*] ? (@.type() != "string" || @ == "")'
      )
    ),
  last_node_id text,
  last_item_by_node jsonb not null default '{}'::jsonb
    check (
      jsonb_typeof(last_item_by_node) = 'object'
      and not jsonb_path_exists(
        last_item_by_node,
        '$.keyvalue() ? (@.key == "" || @.value.type() != "string" || @.value == "")'
      )
    ),
  started_at timestamptz not null default now(),
  expires_at timestamptz not null,
  passed_at timestamptz,
  primary key (student_id, session_id),
  check (destination_era = public.next_city_era(outgoing_era)),
  check (target_score = public.island_unlock_target(outgoing_era)),
  check (score <= target_score),
  check (passed_at is null or score = target_score)
);

create table public.island_unlock_exam_response (
  student_id uuid not null,
  session_id text not null,
  response_id text not null
    check (response_id <> '' and position(':' in response_id) = 0),
  sequence integer not null check (sequence >= 0),
  item_version_id text not null
    check (item_version_id <> '' and item_version_id !~ '[[:space:]]'),
  node_id text not null
    check (node_id ~ '^[A-Z0-9]+[.][A-Z0-9]+$'),
  outcome text not null check (outcome in ('answer', 'skip')),
  raw_answer jsonb,
  checker_version integer,
  correct boolean not null,
  delta integer not null check (delta in (-1, 1)),
  score_after integer not null check (score_after >= 0),
  answered_at timestamptz not null default now(),
  primary key (student_id, session_id, response_id),
  unique (student_id, session_id, sequence),
  foreign key (student_id, session_id)
    references public.island_unlock_exam_session (student_id, session_id),
  check (
    (outcome = 'skip' and raw_answer is null and checker_version is null and not correct)
    or
    (outcome = 'answer' and raw_answer is not null and checker_version is not null)
  ),
  check ((correct and delta = 1) or (not correct and delta = -1))
);

-- One immutable authority row per destination. Exam authority names a passed normalized
-- session; diagnostic authority records a prefix/landing derived by the authenticated API.
create table public.island_unlock_authority (
  student_id uuid not null,
  island_era public.city_era not null,
  authority_kind text not null check (authority_kind in ('exam', 'diagnostic')),
  outgoing_era public.city_era,
  session_id text,
  target_score integer,
  authorized_at timestamptz not null default now(),
  primary key (student_id, island_era),
  foreign key (student_id, session_id)
    references public.island_unlock_exam_session (student_id, session_id),
  check (
    (
      authority_kind = 'exam'
      and outgoing_era is not null
      and session_id is not null
      and target_score = public.island_unlock_target(outgoing_era)
      and island_era = public.next_city_era(outgoing_era)
    )
    or
    (
      authority_kind = 'diagnostic'
      and outgoing_era is null
      and session_id is null
      and target_score is null
    )
  )
);

create index island_unlock_exam_session_destination_idx
  on public.island_unlock_exam_session (student_id, destination_era, started_at);

create index island_unlock_exam_response_session_idx
  on public.island_unlock_exam_response (student_id, session_id, sequence);

grant select, insert on public.island_unlock_exam_session to app_service;
grant update (
  score,
  response_count,
  cycle_node_ids,
  last_node_id,
  last_item_by_node,
  passed_at
) on public.island_unlock_exam_session to app_service;
grant select, insert on public.island_unlock_exam_response to app_service;
grant select, insert on public.island_unlock_authority to app_service;

comment on table public.island_unlock_exam_session is
  'Bounded server-owned score and shuffle state for an arbitrarily long island unlock exam.';
comment on table public.island_unlock_exam_response is
  'Append-only, independently graded exam responses with idempotent response ids and sequence.';
comment on table public.island_unlock_authority is
  'Append-only server authority for destination founding: passed exam session or diagnostic.';
