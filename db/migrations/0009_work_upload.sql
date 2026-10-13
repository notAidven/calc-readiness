-- THE PHOTO-OF-WORK UPLOAD INDEX. One table, one index, three grants and no UPDATE.
--
-- `docs/Photo_Work_Upload_Scope.md` §4 ("Metadata (MUST ADD)") and §5 (the association):
-- an uploaded photo of a student's paper working is held in a private S3 bucket, and this
-- is the row that says whose it is and which miss it belongs to. The bytes never come near
-- Aurora; `object_key` is the only link, and it is only ever resolved into a short-lived
-- presigned URL by the Lambda, for the owner (§6 "Private by default").
--
-- ## What this table is NOT, structurally
--
-- It is not an assessment record, and the schema is where that is made non-negotiable
-- rather than only asserted in TypeScript (§1, §3.5, §7: an upload is NEVER an input to
-- mastery, placement, or the pre/post metric). There is no `mastery`, no `score`, no
-- `correct`, no `theta`, no foreign key into `assessment_item_response` or
-- `student_node_state`, and no grant that would let this service write one. A reviewer
-- reads a photo; nothing reads this table into a scorer.
--
-- ## `upload_id`, not `id`
--
-- §5 lists the column as `id`. Spelled `upload_id` here to match every other primary key
-- in these migrations (`administration_id`, `response_id`, `evidence_id`), which is also
-- what makes it unambiguous in a join.
--
-- ## The ownership check is in the DATABASE, not only in the route
--
-- `work_upload_key_is_student_scoped` requires `object_key` to begin
-- `work-uploads/<student_id>/`. The route derives the key from the verified Cognito `sub`
-- and never from the request (§4/§6), so this constraint should never fire — which is
-- exactly why it is worth having. It is the one line that makes "a student's row can only
-- ever name a student's own object" true of the DATA rather than true of the code that
-- happened to write it, so a future writer (the QR fast-follow's login-less endpoint, a
-- back-fill script, a reviewer tool) cannot cross-wire two learners even by accident.
--
-- ## NO UPDATE GRANT, deliberately
--
-- A stored upload is append-only plus student-initiated deletion (§6 "Retention +
-- deletion"). Nothing edits one: not the association, not the key, not the size. Without an
-- UPDATE grant, a row cannot be re-pointed at another student's object after the fact, and
-- `test/workUploadGrants.test.ts` fails if the service ever issues an update against this
-- table. `delete` IS granted, because deletion is a requirement.
--
-- ## MIGRATION BURDEN: NONE. A new table nothing has written yet.
--
-- **NOTHING APPLIES THIS AUTOMATICALLY.** Migrations run BY HAND (`node db/apply.mjs` over
-- the RDS Data API, tracked in `schema_migrations`); the one CI workflow does not run them
-- and the CDK stack says migrations happen post-deploy. Merging is therefore inert: nothing
-- reaches the cluster until a person deploys.
--
-- APPLY THIS BEFORE THE UPLOAD ROUTES ARE DEPLOYED, NOT BEFORE THE MERGE. A Lambda built
-- from this branch against a cluster that stopped at `0008` answers the work-upload routes
-- with `relation "public.work_upload" does not exist`, wrapped by `missingSchemaHint` into
-- the command that fixes it. The rest of the API is unaffected: no existing table, column,
-- grant or enum is touched by this file.

-- ===========================================================================
-- THE TABLE.
--
-- `content_type` is constrained to the three containers the ingest path can actually
-- VERIFY and strip metadata from (`@cr/image-hygiene`). §6 says "image/* only"; the
-- narrower list is that rule made checkable, because `image/heic` cannot be stripped
-- without an ISOBMFF parser and an unstrippable photo must not be stored at all.
--
-- `size_bytes` repeats the client's and the route's 10 MB cap as a constraint. Three copies
-- of one number looks redundant until you ask which of them a bug can bypass: the client's
-- is a courtesy, the route's is the enforcement, and this one is what holds when the next
-- writer forgets the route.
-- ===========================================================================

create table public.work_upload (
  upload_id uuid primary key,
  -- The Cognito `sub`, server-derived from the verified JWT and never client-supplied.
  student_id uuid not null,
  object_key text not null unique,
  content_type text not null,
  size_bytes integer not null,
  -- Which wrong-answer / review surface the photo was attached to (§2).
  surface text not null,
  -- Lesson surfaces anchor on the node; the post-diagnostic review anchors on the
  -- administration. Exactly one of the two is present — see the constraint below.
  node_id text,
  administration_id uuid,
  item_version_id text not null,
  -- Optional generator provenance, so a reviewer can reproduce the exact item (§5).
  template_id text,
  attempt_id text,
  created_at timestamptz not null default now(),

  constraint work_upload_content_type_is_a_strippable_image
    check (content_type in ('image/jpeg', 'image/png', 'image/webp')),
  constraint work_upload_size_within_cap
    check (size_bytes > 0 and size_bytes <= 10485760),
  constraint work_upload_surface_is_known
    check (surface in ('lesson-practice', 'lesson-cfu', 'diagnostic-review')),
  -- THE OWNERSHIP INVARIANT, in the data. See the header.
  constraint work_upload_key_is_student_scoped
    check (object_key like 'work-uploads/' || student_id::text || '/%'),
  -- The association is per-surface and total: a lesson upload has a node and no
  -- administration, a diagnostic-review upload has an administration and no node. A row
  -- with neither is an artifact nobody can find again, which is the whole point of §5.
  constraint work_upload_association_matches_surface
    check (
      case
        when surface = 'diagnostic-review'
          then administration_id is not null and node_id is null
        else administration_id is null and node_id is not null
      end
    )
);

-- The read path is always "this student's uploads, newest first, optionally for one item"
-- (`GET /api/work-upload?item=…`). `student_id` leads because every query is `sub`-scoped;
-- nothing reads this table unscoped.
create index work_upload_student_item_idx
  on public.work_upload (student_id, item_version_id, created_at desc);

-- ===========================================================================
-- GRANTS. Table-wide select/insert/delete and NO update — see the header for why the
-- absence is the design. `0004`'s own lesson was that a table created without its grants
-- froze `mastery` at zero forever, so these live in the file that creates the table.
-- ===========================================================================

grant select, insert, delete on public.work_upload to app_service;

comment on table public.work_upload is
  'Photo-of-work uploads (docs/Photo_Work_Upload_Scope.md). Store-only: an upload is '
  'never an input to mastery, placement or the pre/post metric. Bytes live in the private '
  'uploads bucket; this row is the sub-scoped index, and object_key is constrained to the '
  'owning student''s prefix so a row can never name another learner''s object.';

comment on column public.work_upload.object_key is
  'S3 key under work-uploads/<student_id>/. Resolved only into short-lived presigned URLs '
  'minted for the owning student; never a public URL.';
