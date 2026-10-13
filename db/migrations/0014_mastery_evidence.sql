-- THE ROW A MASTERY SUBMISSION IS IDEMPOTENT AGAINST, and the grant that lets the runtime
-- role write it.
--
-- `mastery_evidence` has existed since `0001_core_contracts.sql` and has never been
-- writable: that file granted `app_service` nothing on it, and no later migration added a
-- grant. So the table is EMPTY ON EVERY CLUSTER — not measured-empty, which is a reading
-- that expires, but empty by construction, because no runtime role has ever held `insert`
-- on it and no other role runs DML here. That is what makes the `not null` columns below
-- safe to add with no default and no backfill.
--
-- WHAT IT IS FOR. `@cr/mastery-service`'s `MasteryStateStore` requires a store that can
-- answer "have I scored this `evidence_id` already?" and replay the SAME result when it
-- has (`getEvidenceResult` / `recordEvidenceResult`). The id is minted in the browser, so
-- a retried request, a double-tapped Submit or a replayed network call must not score one
-- practice set twice. A table that records only that an id was seen cannot do that: a
-- replay would have to either re-score, which is the thing being prevented, or answer with
-- a different shape than it gave the first time.
--
-- WHY THE RESULT AND NOT ONLY THE ID. `submitAssessmentEvidence` returns
-- `{node_id, mastery, changed, completion_status}` and its caller acts on all four.
-- `changed` is the load-bearing one: it is true only on the run that actually raised
-- mastery, so a replay that recomputed it would hand the city a second promotion for one
-- practice set. Storing what the service concluded is the only way a replay can be honest
-- about being a replay.
--
-- `completion_status` is stored rather than re-derived on read for the reason it is a
-- generated column over `mastery` on `student_node_state`: `completionStatusForMastery` is
-- the one mapping, and a reader that re-derives it is a second opinion free to drift from
-- the first. What belongs here is what the service concluded AT THE TIME, which is what a
-- replay owes its caller.

alter table public.mastery_evidence
  add column mastery smallint not null check (mastery between 0 and 3),
  add column completion_status public.completion_status not null,
  add column changed boolean not null;

-- APPEND-ONLY, for the reason `interleaved_practice_clear` is in `0012_economy_authority`:
-- a recorded score is evidence. `select` so a replay can be recognised and `insert` so it
-- can be recorded, with no `update` and no `delete` — the runtime role cannot edit a scored
-- submission into a different one, nor drop the evidence after the mastery write it
-- justified has landed.
--
-- NO GRANT IS NEEDED ON `student_node_state`, and that is worth saying rather than leaving
-- to be rediscovered. `0004_civilization_state.sql` Group A already grants
-- `update (mastery, mastery_updated_at, lesson_stage, last_practiced_at)` — it exists
-- precisely to unfreeze mastery and has been waiting for a writer ever since — and `0001`
-- grants `insert (student_id, node_id, placement_estimate)`. Between them they are exactly
-- the upsert the mastery and lesson-stage writers issue. `completion_status` is generated
-- and must stay ungranted, because Postgres forbids writing a generated column.
grant select, insert on public.mastery_evidence to app_service;

comment on table public.mastery_evidence is
  'Idempotency record for one scored practice submission. The browser mints evidence_id and '
  'sends raw answers only; the API recomputes correctness and records its verdict here, so a '
  'replay returns the first verdict instead of scoring the same set a second time.';