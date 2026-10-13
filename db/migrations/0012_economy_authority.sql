-- A paid interleaved round needs durable evidence independent of the append-only wallet.
-- The browser supplies raw answers, never a completion flag; the authenticated service
-- recomputes every answer against the immutable item bank and inserts this row only when the
-- response population covers the whole server-derived mix.
create table public.interleaved_practice_clear (
  student_id uuid not null,
  session_id text not null
    check (session_id <> '' and position(':' in session_id) = 0),
  era_id public.city_era not null,
  item_version_ids jsonb not null check (jsonb_typeof(item_version_ids) = 'array'),
  node_ids jsonb not null check (jsonb_typeof(node_ids) = 'array'),
  response_count integer not null check (response_count >= 2),
  cleared_at timestamptz not null default now(),
  primary key (student_id, session_id)
);

create index interleaved_practice_clear_student_era_idx
  on public.interleaved_practice_clear (student_id, era_id, cleared_at);

-- Append-only evidence, for the same reason the material ledger is append-only. A clear can
-- be claimed once and read back; the runtime role cannot edit it into a different round or
-- delete the evidence after its grant has landed.
grant select, insert on public.interleaved_practice_clear to app_service;

comment on table public.interleaved_practice_clear is
  'Server-graded evidence for a complete interleaved round. The client supplies raw answers; '
  'the API derives the eligible mix and writes this row only after authoritative grading.';