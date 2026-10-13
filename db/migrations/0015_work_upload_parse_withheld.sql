-- WHY A READING SHOWED NO COACHING. One nullable column, no new table, no new grant.
--
-- `0011` added `explanation` and `next_steps`, and the route drops BOTH whenever either is
-- unusable (`sanitizeCoaching`: "no partial acceptance here"). What it did not add was any
-- record of the dropping, and that turns out to be the difference between a diagnosable
-- feature and an inscrutable one.
--
-- ## THE FAILURE THIS COLUMN IS PAID FOR, because it is not hypothetical
--
-- A learner uploaded a page reading `2/3 - 1/3 = 1/0` against `d1.num-f.l1:practice:7006`.
-- The model read it at 0.95, flagged the line, and returned exactly the coaching the feature
-- exists to produce: *"You subtracted the numerators correctly to get 1, but you wrote 0 in
-- the denominator instead of keeping the original denominator 3."* The route refused it,
-- because the one verdict list it screened against was matched with a bare substring test and
-- the marker `correct` matched inside the ADVERB `correctly`. That list is now split into
-- `SCORING_STEMS` (substring) and `VERDICT_PHRASINGS` (whole word) in `workUploadParse.ts`.
--
-- What the row recorded was `explanation = null, next_steps = []`, which is character for
-- character what a row records when the model offers nothing at all. So the surface showed a
-- transcript, and a transcript is ALSO what a correct page with no slip on it shows. Three
-- distinct states — no coaching offered, coaching refused, nothing to coach — collapsed into
-- one indistinguishable row, and the feature read from outside as never having been built.
-- Reconstructing which one it was took a replay of the original photograph through the
-- provider.
--
-- ## STORED, NOT SERVED
--
-- Nothing puts this on the wire. `WorkUploadParseWire`'s key set is pinned by an exact
-- `toEqual` in `workUploadParse.test.ts`, so a future edit that tries to serve it fails there
-- rather than quietly telling a learner their help was censored. The audience is whoever is
-- asking why a reading looks thin.
--
-- ## FEEDBACK-ONLY, UNCHANGED
--
-- The values name what the ROUTE did, never anything about the learner: no verdict, no
-- correctness, no credit, and nothing joinable to `assessment_item_response` or
-- `student_node_state`. `test/workUploadParseStaysFeedbackOnly.test.ts` scans this table's
-- column names for scoring concepts on every run, and it reads the migration directory, so
-- this file is inside its census the moment it lands.
--
-- ## NO NEW GRANT, and no burden on read
--
-- `0010` grants `select, insert` on this table to `app_service`, and a table-level insert
-- grant covers columns added later. The column is nullable with no default, so every row
-- `0010` and `0011` wrote stays valid and reads back as a row that recorded no reason, which
-- is exactly what it is. Nothing backfills: the reason was never captured, and inventing one
-- now would be a guess written into a diagnostic.
--
-- **NOTHING APPLIES THIS AUTOMATICALLY** (`node db/apply.mjs`, by hand, tracked in
-- `schema_migrations`). It requires `0011`.
--
-- APPLY THIS BEFORE THE BUILD THAT WRITES IT. A Lambda built from this branch against a
-- cluster that stopped at `0011` answers `POST /api/work-upload/parse` with
-- `column "coaching_withheld_reason" of relation "work_upload_parse" does not exist`, wrapped
-- by `missingSchemaHint` into the command that fixes it.

alter table public.work_upload_parse
  add column coaching_withheld_reason text;

alter table public.work_upload_parse
  -- A closed set rather than free text. This is read by a person triaging "why is the
  -- coaching thin", and a column that accepts anything becomes a column holding five
  -- spellings of the same reason within a month.
  add constraint work_upload_parse_withheld_reason_is_known
    check (
      coaching_withheld_reason is null
      or coaching_withheld_reason in (
        'no_grounding',
        'no_suspect_line',
        'none_offered',
        'verdict_language',
        'answer_key_stated'
      )
    ),
  -- A REASON AND A REASON NOT TO NEED ONE ARE MUTUALLY EXCLUSIVE. A row carrying prose AND
  -- an account of why it carries none is a row whose writer has come apart, and the check
  -- is here rather than trusted to the route for the same reason `0011` caps the length in
  -- three places: the route is the enforcement, and this is what holds when the next writer
  -- forgets it.
  add constraint work_upload_parse_withheld_excludes_coaching
    check (coaching_withheld_reason is null or explanation is null);

comment on column public.work_upload_parse.coaching_withheld_reason is
  'Why this reading carries no explanation: whether none was offered, or one was offered and '
  'refused for reading as a verdict or for stating the item''s answer. Diagnostic only, never '
  'served to the browser, and never a statement about the learner. Null on rows written '
  'before this column existed and on rows that did show coaching.';
