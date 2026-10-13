-- MASTERY ATTEMPT OWNERSHIP AT THE DATABASE EDGE.
--
-- `mastery_evidence.evidence_id` is already the global primary key from `0001`, which is
-- what makes one attempt id idempotent even when two requests race. The production writer
-- now treats a conflict owned by another Cognito subject or another node as tampering and
-- rolls the whole transaction back. These constraints close the corresponding storage
-- holes: a receipt cannot name blank identities and cannot outlive or predate the exact
-- `(student_id, node_id)` learning record it evidences.
--
-- The same transaction appends the five raw responses required by Contracts §5/§6. That
-- table predates the writer but lacked an attempt id, slot, reveal flag, generated-template
-- snapshot, and checker version, so no audit could reconstruct the exact five-slot verdict.
-- It has also never been writable by `app_service`; the column-scoped INSERT below is the
-- first and only runtime grant on it. There is still no browser role, UPDATE, or DELETE.

alter table public.mastery_evidence
  add constraint mastery_evidence_id_not_blank
    check (btrim(evidence_id) <> ''),
  add constraint mastery_evidence_node_not_blank
    check (btrim(node_id) <> ''),
  add constraint mastery_evidence_owned_node_fk
    foreign key (student_id, node_id)
    references public.student_node_state (student_id, node_id)
    on update restrict
    on delete restrict;

comment on constraint mastery_evidence_owned_node_fk on public.mastery_evidence is
  'A scored attempt belongs to the authenticated student and exact node row finalized in '
  'the same transaction; an evidence id cannot be moved across either boundary.';

alter table public.raw_response_log
  add column evidence_id text not null,
  add column slot_index smallint not null check (slot_index between 0 and 4),
  add column item_version integer not null check (item_version > 0),
  add column template_id text,
  add column template_params jsonb,
  add column revealed boolean not null,
  add column equivalence_checker_version integer not null
    check (equivalence_checker_version > 0),
  add constraint raw_response_mastery_evidence_fk
    foreign key (evidence_id)
    references public.mastery_evidence (evidence_id)
    on update restrict
    on delete restrict,
  add constraint raw_response_attempt_slot_unique
    unique (evidence_id, slot_index);

grant insert (
  response_id,
  student_id,
  evidence_id,
  slot_index,
  item_version_id,
  item_version,
  template_id,
  template_params,
  node_id,
  difficulty,
  raw_answer,
  context,
  attempt,
  hints_used,
  revealed,
  time_on_item_ms,
  misconception_tag,
  equivalence_checker_version
) on public.raw_response_log to app_service;

comment on column public.raw_response_log.evidence_id is
  'The idempotent five-slot mastery attempt this append-only response belongs to.';
comment on column public.raw_response_log.revealed is
  'True when the full answer was shown; such a slot never counts as correct.';
