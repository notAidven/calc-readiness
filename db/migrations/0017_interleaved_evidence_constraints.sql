-- Forward-only repair for 0012's array-type-only checks.
--
-- Existing invalid rows cannot be made truthful. Preserve them verbatim in an admin-only
-- quarantine table, remove them from the grant-authorizing table, then validate the stronger
-- constraints. The already-issued append-only ledger is untouched for auditability.

create or replace function public.evidence_text_array_matches(
  value jsonb,
  member_pattern text
)
returns boolean
language sql
immutable
strict
parallel safe
as $$
  select
    jsonb_typeof(value) = 'array'
    and jsonb_array_length(value) > 0
    and not exists (
      select 1
      from jsonb_array_elements(value) as members(member)
      where jsonb_typeof(member) <> 'string'
         or btrim(member #>> '{}') = ''
         or not ((member #>> '{}') ~ member_pattern)
    )
$$;

create table public.interleaved_practice_clear_invalid (
  student_id uuid not null,
  session_id text not null,
  era_id public.city_era not null,
  item_version_ids jsonb not null,
  node_ids jsonb not null,
  response_count integer not null,
  cleared_at timestamptz not null,
  quarantine_reason text not null,
  quarantined_at timestamptz not null default now(),
  primary key (student_id, session_id)
);

insert into public.interleaved_practice_clear_invalid (
  student_id,
  session_id,
  era_id,
  item_version_ids,
  node_ids,
  response_count,
  cleared_at,
  quarantine_reason
)
select
  student_id,
  session_id,
  era_id,
  item_version_ids,
  node_ids,
  response_count,
  cleared_at,
  case
    when not public.evidence_text_array_matches(
      item_version_ids,
      '^[a-z0-9][a-z0-9._:-]*$'
    ) then 'invalid_item_version_ids'
    when not public.evidence_text_array_matches(
      node_ids,
      '^[A-Z0-9]+[.][A-Z0-9]+$'
    ) then 'invalid_node_ids'
    else 'response_count_mismatch'
  end
from public.interleaved_practice_clear
where
  not public.evidence_text_array_matches(
    item_version_ids,
    '^[a-z0-9][a-z0-9._:-]*$'
  )
  or not public.evidence_text_array_matches(
    node_ids,
    '^[A-Z0-9]+[.][A-Z0-9]+$'
  )
  or jsonb_array_length(item_version_ids) <> response_count
  or jsonb_array_length(node_ids) <> response_count
  or jsonb_array_length(item_version_ids) <> jsonb_array_length(node_ids);

delete from public.interleaved_practice_clear as active
using public.interleaved_practice_clear_invalid as invalid
where active.student_id = invalid.student_id
  and active.session_id = invalid.session_id;

alter table public.interleaved_practice_clear
  add constraint interleaved_practice_clear_item_ids_are_nonempty_strings
    check (
      public.evidence_text_array_matches(
        item_version_ids,
        '^[a-z0-9][a-z0-9._:-]*$'
      )
    ),
  add constraint interleaved_practice_clear_node_ids_are_nonempty_strings
    check (
      public.evidence_text_array_matches(
        node_ids,
        '^[A-Z0-9]+[.][A-Z0-9]+$'
      )
    ),
  add constraint interleaved_practice_clear_evidence_lengths_match
    check (
      jsonb_array_length(item_version_ids) = response_count
      and jsonb_array_length(node_ids) = response_count
      and jsonb_array_length(item_version_ids) = jsonb_array_length(node_ids)
    );

comment on table public.interleaved_practice_clear_invalid is
  'Admin-only quarantine of pre-0017 rows that could not prove valid typed evidence. '
  'Rows are preserved for audit; no runtime grant is issued on this table.';

comment on constraint interleaved_practice_clear_evidence_lengths_match
  on public.interleaved_practice_clear is
  'Every recorded item/node pair corresponds to exactly one response.';
