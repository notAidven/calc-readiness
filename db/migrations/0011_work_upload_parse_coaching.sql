-- THE COACHING COLUMNS. Two columns on an existing ledger, no new table, no new grant.
--
-- `0010` stores what a vision model READ off a photograph of a learner's paper working: the
-- lines, and an index into them where the working stopped following itself. It stores nothing
-- that explains the divergence in words, so the surface pairs the transcript with a headline
-- picked from a fixed map. `docs/Photo_Work_Upload_AI_Feedback_Eval.md` §1 names that gap
-- exactly -- the Coach layer produces "headline + caveat only (server-authored framing)"
-- today, against a planned "short feedback naming the likely slip and one or two next steps".
-- These are the two columns that reading lands in.
--
-- ## Still feedback-only, and these columns are where that gets easiest to forget
--
-- Prose is the first thing on this table that a person could read as a judgement, so it is
-- worth saying what it is: `explanation` says why one line of the learner's own handwriting
-- does not follow from the line above it, and `next_steps` says what to try on paper. Neither
-- is a verdict on the answer, neither is derived from grading anything, and neither is
-- readable by a scorer -- there is still no `score`, no `correct`, no `mastery`, no `theta`,
-- no credit, and no foreign key into `assessment_item_response` or `student_node_state`.
-- `test/workUploadParseStaysFeedbackOnly.test.ts` holds that over the type, the wire shape and
-- BOTH migrations; before this file it read `0010` alone, so a column added here would have
-- escaped its scoring-name scan entirely. Its census is now derived from the directory.
--
-- The route refuses to store coaching that contains the item's own answer key or any scoring
-- word (`workUploadParse.ts`, `sanitizeCoaching`), so the invariant is enforced before the
-- insert rather than trusted at the read.
--
-- ## NO NEW GRANT, and that is not an omission
--
-- `0010` grants `select, insert` on this table to `app_service`, and a table-level insert
-- grant covers columns added later. Adding a grant here would widen nothing and would put a
-- second, drifting copy of the privilege set in a second file. Still no UPDATE and no DELETE:
-- the ledger is append-only and rows cascade away with their upload, unchanged by this file.
--
-- ## MIGRATION BURDEN: NONE ON READ, and the default is what makes that true.
--
-- Both columns are nullable or defaulted, so every row `0010` has already written stays valid
-- and reads back as a reading with no coaching, which is exactly what it is. Nothing
-- backfills: re-reading a stored photograph would mean paying a provider again for a learner
-- who has already been shown their transcript.
--
-- **NOTHING APPLIES THIS AUTOMATICALLY** (`node db/apply.mjs`, by hand, tracked in
-- `schema_migrations`). It requires `0010`.
--
-- APPLY THIS BEFORE THE COACHING BUILD IS DEPLOYED, NOT BEFORE THE MERGE. A Lambda built from
-- this branch against a cluster that stopped at `0010` answers `POST /api/work-upload/parse`
-- with `column "explanation" of relation "work_upload_parse" does not exist`, wrapped by
-- `missingSchemaHint` into the command that fixes it. The other five routes are unaffected:
-- no existing table, column, grant or enum is altered by this file.

alter table public.work_upload_parse
  -- Why the suspect line does not follow from the line above it, in the learner's own terms.
  -- Null on every reading that produced none: an unreadable page, a low-confidence one, an
  -- item we hold no canonical solution for, or a reply whose coaching we refused to show.
  add column explanation text,
  -- One to three things to try on paper. An array for the same reason `steps` is one: it is a
  -- display artifact, read as a whole and never joined, filtered or aggregated.
  add column next_steps jsonb not null default '[]'::jsonb;

alter table public.work_upload_parse
  add constraint work_upload_parse_next_steps_is_an_array
    check (jsonb_typeof(next_steps) = 'array'),
  -- A bound on what one model reply may put on a learner's screen, in the schema as well as
  -- in the route. Three copies of a cap looks redundant until you ask which of them a bug can
  -- bypass: the model instruction is a request, the route's sanitizer is the enforcement, and
  -- this is what holds when the next writer forgets the route.
  add constraint work_upload_parse_explanation_within_cap
    check (explanation is null or char_length(explanation) <= 600),
  add constraint work_upload_parse_next_steps_within_cap
    check (jsonb_array_length(next_steps) <= 3),
  -- COACHING WITHOUT A TRANSCRIPT IS COACHING ABOUT NOTHING. Prose explaining a line of
  -- working, stored on a row that read no working, could only ever have been invented -- and
  -- it would be invented prose about a child's homework, presented as a reading of it.
  add constraint work_upload_parse_coaching_needs_steps
    check (
      (explanation is null and jsonb_array_length(next_steps) = 0)
      or jsonb_array_length(steps) > 0
    );

comment on column public.work_upload_parse.explanation is
  'Why the suspect line does not follow from the one above it, in words. Feedback only: not '
  'a verdict on the answer, never an input to mastery, placement or the pre/post metric. '
  'Null whenever the reading produced no coaching, which includes every row written before '
  'the coaching layer shipped.';

comment on column public.work_upload_parse.next_steps is
  'Up to three things to try on paper, drawn from the item''s own canonical solution path. '
  'Never states the keyed answer: the route drops coaching that contains it.';
