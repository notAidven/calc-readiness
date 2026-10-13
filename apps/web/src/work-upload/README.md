# Photo-of-Work Upload — v1 (capture + store) and v2 (the reading)

Implements the student work-checker per `docs/Photo_Work_Upload_Scope.md` (v0.2).
Design doc is the source of truth; this README covers what shipped and what a deployment
still has to supply.

> **The §3.5 third-party-model gate was LIFTED on 2026-08-05 by Gabe**, so the v2 AI parse
> is built. Read that section's banner before working in this lane: it carries his ruling
> verbatim, its stated basis (the product is not sold into a school system, so FERPA's
> school-official framing does not bind it), and his explicit *"if security becomes a
> concern later on we can touch on that."* The deploy runbook now requires Bedrock account
> retention mode `none`; this repository cannot read that account state, so it remains a
> production blocker rather than a code claim.

## What v1 is

- **Photo CAPTURE + STORE-ONLY.** A student can attach a photo of the work they did on
  paper to a wrong-answer / review moment. The image is held for **later human review**.
- **Capture method:** doc §3 **Option A** — a direct device capture / file input
  (`<input type="file" accept="image/*" capture="environment">`, opens the rear camera on
  a phone, a normal picker on desktop) plus drag-and-drop. This is the recommended first
  slice.
- **QR desktop→phone hand-off (Option B):** a documented **fast-follow**, not built.
  Stubbed in `presigned.ts` (`requestPhonePairing()` throws with the reason). It needs a
  pairing endpoint + a login-less mobile upload page (doc §3/§6), which are out of scope.

## The load-bearing invariant (store-only / never scored)

An uploaded photo is **one-way and inert**: it is **NEVER** an input to mastery,
placement, or the pre/post metric (doc §1, §3.5, §7). This is enforced structurally:

- The `WorkUploadStore` surface is `upload` / `remove` / `list` only — no `grade`,
  `score`, or mastery method. `StoredWorkUpload` carries no correctness/score field, and
  neither does the server's `WorkUploadRecordWire` or the `work_upload` table (which has no
  assessment column and no foreign key into one).
- The `WorkUpload` component takes only an `association` + a store. It has no access to
  the lesson session, the answer checker, or the mastery service, and hands back only a
  `StoredWorkUpload`.
- This module imports **nothing** from the grading path (`@cr/mastery-service`,
  `@cr/scorer`, the checkers). Guarded by `workUploadInvariant.browser.test.tsx` for this
  directory and by `test/workUploadPhotoLeavesOnlyThroughTheSeam.test.ts` across all three
  lanes — the browser guard could not see a Lambda.

## Files

| File | Role |
| --- | --- |
| `types.ts` | `WorkUploadStore` interface, `StoredWorkUpload`, associations, errors |
| `validation.ts` | `image/*`-only + size-cap ingest gate (doc §6 data-minimization) |
| `imageIngest.ts` | strips EXIF/GPS (or transcodes a HEIC) **before** the bytes leave the device |
| `store.ts` | `InMemoryWorkUploadStore` (dev/CI) + the `createWorkUploadStore` decision |
| `presigned.ts` | `PresignedWorkUploadStore` — strip → presign → PUT → confirm + QR stub (gated) |
| `api.ts` | the four routes bound to `fetch` + the Cognito bearer, and the wire validator |
| `WorkUpload.tsx` | self-contained, droppable capture UI (preview / remove / status) |
| `parseTypes.ts` | `WorkParse`, `WorkParseClient` — the v2 read seam, one method, no writes |
| `parseClient.ts` | `POST /api/work-upload/parse` client + a dev stub for the serverless loop |
| `WorkParseCard.tsx` | the provisional presentation of a reading |
| `WorkChecker.tsx` | upload → separately consented parse orchestration |
| `work-upload.css` | lane-scoped styles (never touches shared `styles.css`) |

Attach point: `apps/web/src/lessons/LessonPractice.tsx`, in the `revealed` (gave-up)
state. Uploading mounts the parse consent card but never calls it; the learner must check
the separate consent box and press **Read my working**.

## The backend (doc §4's four MUST-ADDs, now built)

1. **`POST /api/work-upload`** — `services/diagnostic-api/src/workUpload.ts`. Verifies the
   Cognito JWT, derives `student_id` from `sub`, re-checks content type + size, and mints a
   short-lived presigned S3 PUT under `work-uploads/<student_id>/…`.
2. **The private uploads bucket** — `infra/lib/calc-readiness-stack.ts`: `BLOCK_ALL`,
   `enforceSSL`, encrypted, with a **lifecycle-expiration** retention rule (unlike the RETAIN
   site bucket) and an IAM grant of exactly `PutObject`/`GetObject`/`DeleteObject` on the
   prefix.
3. **The `work_upload` table** — `db/migrations/0009_work_upload.sql`, RDS Data API,
   least-privilege `app_service` (select/insert/delete, deliberately no update). Reads are
   `sub`-scoped, and the table's own check refuses a row whose key sits outside its student's
   prefix.
4. **`GET /api/work-upload?item=…`** — lists the caller's own uploads with short-lived
   presigned GETs, mirroring the `sub`-scoped city/measurement read path.
   `DELETE /api/work-upload?id=…` is §6's student-initiated deletion (object + row).

**`POST /api/work-upload/complete` is the one the doc does not name, and it is not optional.**
In a presigned-PUT design the route that mints the URL never sees the bytes, so it cannot
strip anything. So the strip happens twice: `imageIngest.ts` strips on the device (a photo's
GPS never leaves the phone), and `complete` reads the stored object back, verifies by magic
number that it really is a JPEG/PNG/WebP, strips again — the ENFORCED copy — and only then
writes the row. A `work_upload` row therefore means "read, verified, stripped".

`createWorkUploadStore()` returns the presigned store when the session is server-backed
(`VITE_DIAGNOSTIC_API_URL` **and** Cognito configured) and the in-memory store otherwise,
which is what the local and CI loop legitimately gets — that loop has no server at all
(`apps/web/src/api.ts` `isServerBacked`). The `WorkUploadStore` contract is identical either
way, so no call site knows which one it has.

**What cannot be exercised here:** the dev/CI loop has no server, so the presigned path is
covered with injected fakes for the four routes and real bytes for the strip. Signing against
real S3, the JWT verification, the Data API and the bucket's own settings are only exercised
by a deployment.

## v2 — the reading (BUILT; the gate was lifted 2026-08-05)

A vision model reads the steps in the photo and points at the line where the working stops
following itself. Backend: `POST /api/work-upload/parse` in `services/diagnostic-api`.
Browser: `WorkParseCard` over the `WorkParseClient` seam.

**It is feedback-only, and that is the same invariant as v1 — not a second, weaker one.** It
was never part of the privacy gate and it did not move with it. If anything the ruling made
it load-bearing: the best frontier model behind an API misreads something on **37.62% of
real multi-step student pages** (`docs/Photo_Work_Upload_v2_OCR_Feasibility.md` §2.4), so
better than three readings in eight have a mistake in them. A reading that wrong may not be
able to affect a learner's placement, and it structurally cannot:

- `WorkParseClient` has ONE method and it reads. No `apply`, no `accept`, no `grade`. A
  learner correcting a misread is a real feature and is deliberately absent, because a
  corrections channel is the one shape that could grow a path into grading.
- `WorkParse` carries no `score`, `correct`, `mastery` or `placement`. `suspectStepIndex` is
  an index into the transcript, not a verdict on the answer.
- `provisional` is the literal `true`, not a boolean, so no surface can present a reading as
  settled — and `headline`/`caveat` come from the server, so the hedge cannot be dropped by
  a component that forgot to add one.
- Guarded by `workUploadInvariant.test.ts` here and
  `test/workUploadParseStaysFeedbackOnly.test.ts` across the imports, the types and the
  schema.

**Presenting it (doc §3.5's own words: "here's what we read — correct us if we got it
wrong"):** the hedge renders above the transcript, the suspect line is marked *check this
line* in a warm accent rather than the checker's red, and below the server's confidence
threshold the suspect line is withheld entirely — so a low-confidence reading is a plain
transcript with no finger pointed at anything.

**In dev and CI there is no server** (`apps/web/src/api.ts` `isServerBacked` is false), so
the production factory returns `createStubWorkParseClient()` and answers one fixed,
deliberately-imperfect reading. In a server-backed Cognito build it returns
`createHttpWorkParseClient({ endpoint, getToken })`. `WorkChecker` uses that factory after a
stored upload and keeps the model request behind the explicit learner action.
