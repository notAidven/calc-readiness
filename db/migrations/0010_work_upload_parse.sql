-- THE v2 VISION-PARSE LEDGER. One table, two indexes, two grants, no update and no delete.
--
-- `docs/Photo_Work_Upload_Scope.md` §3.5 plans a Lambda step that runs an uploaded photo of
-- a student's paper working through a vision model to read the steps back and localize where
-- the working diverged. That step was GATED on an education-compliant provider until
-- 2026-08-05, when Gabe lifted the gate; the §3.5 and §6 banners carry the ruling verbatim,
-- its stated basis, and the fact that he expects to revisit it. This is the table the parse
-- writes to.
--
-- ## It is a LEDGER, and the word is doing work
--
-- Three jobs, and only the first is the obvious one:
--
--  1. **The reading itself**, so a learner who re-opens the same photo is shown the same
--     words and we do not pay to read it twice.
--  2. **THE SPEND CAP.** A model call is the first unbounded cost path in this product.
--     `cost_micro_usd` on every attempt makes "how much has this feature spent in the last 24
--     hours" a `sum()` the route can run BEFORE deciding whether to make the next call, which
--     is the difference between a cap and a monthly surprise. It is priced in MICRO-dollars
--     (1e-6 USD) as an integer because a parse costs about 14,000 of them and floating-point
--     money in a budget check is how a budget check goes wrong.
--  3. **The rate limit**, per learner: `count(*) where student_id = … and created_at > now()
--     - interval` is the whole of it.
--
-- Jobs 2 and 3 are why a FAILED attempt is a row. A provider that errors after being handed
-- an image may well have been billed for it, and a provider erroring in a loop is exactly
-- when a cost ceiling has to hold. `outcome` records what happened; every row counts.
--
-- ## What this table structurally CANNOT be, and why that is a schema question
--
-- §1/§3.5/§7: an upload is never an input to mastery, placement or the pre/post metric, and
-- **neither is anything read out of one**. That invariant was never part of the privacy gate
-- and it did not move on 2026-08-05 — if anything the ruling made it load-bearing, because
-- the route we just opened is one whose best available model misreads something on 37.62% of
-- real multi-step student pages (`Photo_Work_Upload_v2_OCR_Feasibility.md` §2.4).
--
-- So, as in `0009`: there is no `score`, no `correct`, no `mastery`, no `theta`, no `credit`,
-- no foreign key into `assessment_item_response` or `student_node_state`, and no grant that
-- would let this service write one. `suspect_step_index` is NOT a verdict on the answer — it
-- is an index into `steps`, this table's own guess at which line of the learner's own
-- handwriting it stopped following, which is the "localize the mistake" goal §1 states and is
-- meaningless to a scorer. `test/workUploadParseStaysFeedbackOnly.test.ts` holds that from
-- outside, over the type, the wire shape and this file.
--
-- ## NO UPDATE AND NO DELETE GRANT, and the second absence is the interesting one
--
-- Append-only, like `0009`. Nothing edits a reading: a re-parse is a new row, so the ledger
-- is a true record of what was spent rather than of what is currently believed.
--
-- Deletion is a §6 REQUIREMENT and it still happens — through `on delete cascade` rather than
-- through a grant. PostgreSQL runs a foreign key's referential action in a system trigger
-- that switches to the referencing table's OWNER (`ri_PerformCheck` in `ri_triggers.c`), not
-- the deleting role, so `delete from work_upload where …` as `app_service` removes the parse
-- rows with it even though `app_service` cannot delete from this table directly. That is the
-- least-privilege shape: a student's deletion takes the reading with the photo, and no code
-- path anywhere can remove a spend record from the ledger the cap is computed over.
--
-- MEASURED, not assumed, because "the cascade runs as the owner" is a claim about Postgres
-- and getting it wrong is a §6 deletion that silently leaves the reading behind. Applied
-- 0009 + this file to PostgreSQL 18.3 (PGlite 0.5.4) and ran as a role holding exactly the
-- two grants below: `delete from public.work_upload where …` took the parse row with it
-- (1 -> 0), and a direct `delete from public.work_upload_parse` failed with `permission
-- denied for table work_upload_parse`. Both halves, because the first without the second
-- would not distinguish a working cascade from an over-broad grant. Every check constraint
-- below was driven to failure by name in the same run.
--
-- ## MIGRATION BURDEN: NONE. A new table nothing has written yet.
--
-- **NOTHING APPLIES THIS AUTOMATICALLY** (`node db/apply.mjs`, by hand, tracked in
-- `schema_migrations`). It requires `0009`, which creates the table it references.
--
-- APPLY THIS BEFORE THE PARSE ROUTE IS DEPLOYED, NOT BEFORE THE MERGE. A Lambda built from
-- this branch against a cluster that stopped at `0009` answers `POST /api/work-upload/parse`
-- with `relation "public.work_upload_parse" does not exist`, wrapped by `missingSchemaHint`
-- into the command that fixes it. The other five routes, and the rest of the API, are
-- unaffected: no existing table, column, grant or enum is touched by this file.

-- ===========================================================================
-- THE TABLE.
--
-- `steps` is jsonb rather than a child table because it is a display artifact, read only as a
-- whole and never joined, filtered or aggregated — the shape `city_state` already uses for
-- the same reason.
--
-- `confidence` is the model's own stated confidence in its READING, in [0,1]. It exists so
-- the surface can hedge harder when the model is unsure, and it is constrained rather than
-- trusted because it arrives from a model's JSON.
-- ===========================================================================

create table public.work_upload_parse (
  parse_id uuid primary key,
  -- The photo this is a reading of. CASCADE is §6's deletion right reaching the reading; see
  -- the header for why that needs no delete grant.
  upload_id uuid not null references public.work_upload (upload_id) on delete cascade,
  -- Denormalized from `work_upload` so every read here is `sub`-scoped without a join, the
  -- same way every statement in `0009` is. The check constraint below stops the two drifting.
  student_id uuid not null,
  -- Which implementation produced this, for provenance in a review surface, and which model
  -- id it named. Both are recorded because "the parse got worse in March" is unanswerable
  -- without them, and a provider swap is expected (§3.5's banner: this is revisitable).
  parser_id text not null,
  model_id text not null,
  -- What happened. `read` and `low_confidence` carry steps; `unreadable` is the model saying
  -- it could not make out the working; `failed` is our side — a transport error, a refusal, a
  -- reply that was not the JSON we asked for, or an image too large to send.
  outcome text not null,
  confidence real,
  steps jsonb not null default '[]'::jsonb,
  -- An index into `steps`. NOT a judgement on the answer: see the header.
  suspect_step_index integer,
  -- The spend record. Tokens as reported by the provider; cost as WE computed it from the
  -- price table the function was configured with, so the ledger stays readable after a price
  -- change instead of silently re-pricing history.
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  cost_micro_usd integer not null default 0,
  created_at timestamptz not null default now(),

  constraint work_upload_parse_outcome_is_known
    check (outcome in ('read', 'low_confidence', 'unreadable', 'failed')),
  constraint work_upload_parse_confidence_is_a_fraction
    check (confidence is null or (confidence >= 0 and confidence <= 1)),
  constraint work_upload_parse_steps_is_an_array
    check (jsonb_typeof(steps) = 'array'),
  -- A suspect step has to point AT something. A reading with no steps cannot have localized
  -- anything, and an index past the end is a misread of the model's own reply.
  constraint work_upload_parse_suspect_step_is_in_range
    check (
      suspect_step_index is null
      or (suspect_step_index >= 0 and suspect_step_index < jsonb_array_length(steps))
    ),
  -- The ledger's own integrity. A negative cost would let one row pay for the next.
  constraint work_upload_parse_spend_is_not_negative
    check (input_tokens >= 0 and output_tokens >= 0 and cost_micro_usd >= 0)
);

-- THE OWNERSHIP INVARIANT, in the data, and the one thing a foreign key alone would not give.
-- `upload_id` says which photo; nothing in the FK says the `student_id` beside it is that
-- photo's owner, so a route that wrote the caller's sub against somebody else's upload id
-- would produce a row that reads as theirs. The route refuses that by looking the upload up
-- `sub`-scoped first (it "does not exist" for a stranger), and this trigger-free check is the
-- copy that holds when a future writer forgets to.
--
-- Expressed as a foreign key over the PAIR, which needs a unique key on the pair to point at.
create unique index work_upload_owner_pair_idx
  on public.work_upload (upload_id, student_id);

alter table public.work_upload_parse
  add constraint work_upload_parse_belongs_to_its_uploads_owner
  foreign key (upload_id, student_id)
  references public.work_upload (upload_id, student_id)
  on delete cascade;

-- The two reads. The first is "this learner's readings, newest first" and the per-student
-- rate limit; the second is the SPEND SUM over a rolling window, which is unscoped by design
-- (it is a question about the account's bill, not about a learner) and so needs `created_at`
-- to lead.
create index work_upload_parse_student_created_idx
  on public.work_upload_parse (student_id, created_at desc);
create index work_upload_parse_created_idx
  on public.work_upload_parse (created_at desc);

-- ===========================================================================
-- GRANTS. select + insert, and deliberately neither update nor delete — see the header.
-- ===========================================================================

grant select, insert on public.work_upload_parse to app_service;

comment on table public.work_upload_parse is
  'v2 vision-parse readings of photo-of-work uploads (docs/Photo_Work_Upload_Scope.md '
  '3.5, gate lifted 2026-08-05). FEEDBACK-ONLY: a reading is never an input to mastery, '
  'placement or the pre/post metric, and there is no column a scorer could read. '
  'Append-only; rows cascade away with their upload. Also the spend ledger the route''s '
  'daily USD cap is computed from, which is why a failed attempt is still a row.';

comment on column public.work_upload_parse.suspect_step_index is
  'Index into steps: which line of the learner''s own handwriting the reading stopped '
  'following. Not a verdict on the answer, and meaningless outside this table.';

comment on column public.work_upload_parse.cost_micro_usd is
  'What this call cost, in millionths of a USD, computed from the price table the function '
  'was configured with at the time. Summed over a rolling window to enforce the cap before '
  'the next call is made.';
