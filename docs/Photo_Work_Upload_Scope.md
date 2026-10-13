# Photo-of-Work Upload — Scope & Feasibility Note (v0.2, scoping only)

> **Status: SCOPING / DESIGN NOTE. Post-MVP, UNASSIGNED (owner = TBD). NOT a build commitment.** This note formalizes the terse `Post_MVP_Backlog.md` Tier 4 bullet ("Mobile QR work-upload") and grounds the PRD's existing intent (`PRD_Full.md` §10, "Mobile work-upload: a QR one-shot hand-off, NOT a native app") against what the repo *actually* has today (AWS-native: Cognito + Lambda + Aurora + S3/CloudFront; **no Firebase, no user-content object storage yet**). It recommends a simpler default than the PRD's QR-first framing. No code was changed to write this; the file/line references below are a read-only scan.
>
> **Decision (2026-07-23):** phased — **photo capture, store-only v1, AI-parse v2** (see the §3.5 Roadmap). The design has two independent axes (capture method × processing); photo capture is recommended over on-screen ink, and the v2 AI-parse is gated on an education-compliant provider. Header bumped v0.1 → v0.2.
>
> **Decision (2026-08-05, Gabe — THE §3.5 / §6 THIRD-PARTY-MODEL GATE IS LIFTED, and is revisitable):** the v2 AI parse may call a frontier vision model behind an API. The two in-place banners at §3.5 and §6 carry the ruling verbatim, its stated basis, and what did *not* change; nothing below is deleted. In one line: the third-party-model prohibition is **superseded**, and every other §6 control — private bucket, `sub`-scoped access, EXIF strip on ingest, retention, opt-in — **still binds**, as does the feedback-only invariant (§1, §3.5, §7), which was never part of the gate.

*Let a student, when they get a question WRONG, snap or upload a photo of the handwritten work they did on paper. v1 is capture-and-store only: the image is attached to the miss for later human review; it never touches mastery, placement, or the pre/post metric. This is the "super simple" ask — a phone-friendly capture on the incorrect/review state, with a QR desktop→phone hand-off as a fast-follow for desktop users.*

---

## 1. Feature summary + user value

When an answer is graded incorrect, offer an optional "Add a photo of your work" affordance. The student photographs the paper they worked on and it is stored against that attempt.

Value:
- **Richer diagnostic signal.** A wrong final answer hides *where* it broke; the worked steps show it. This is the same "localize the mistake" goal `Error_Typing_Spec.md` chases, captured from real paper instead of distractor tagging.
- **Enables later review + tutor feedback.** A tutor/teacher (a future surface, not v1) can look at what the student actually did.
- **Possible partial-credit / re-engagement** later. Out of scope for v1 (see §7 non-goals), but the captured artifact is the precondition.
- **Low friction, meets students where they work.** Paper-and-pencil is where math actually happens; this bridges it into the product without forcing digital math entry.

It is deliberately **one-way and inert in v1**: like the ratified cosmetic economy's one-way invariant and error-typing's "never an input to mastery" rule, an uploaded image is feedback/analysis metadata only — it never gates learning, never changes a score.

## 2. Where it attaches (read-only hook-point scan)

The affordance belongs on the **incorrect / review state**, where "you got it wrong" is already surfaced to the student. The repo has three such surfaces; the diagnostic is deliberately NOT one of them:

- **Lesson practice (primary attach point) — `apps/web/src/lessons/LessonPractice.tsx`.** `handleSubmit` grades via `session.submitAnswer(...)`; the `!outcome.client_correct` branch (currently just sets a "Not quite…" feedback string) is the natural place to render an upload button. Two adjacent moments are even better fits: the **`revealed`** state (`handleReveal` → `uiPhase === "revealed"`, renders `WorkedSolution`) where the student has given up and their paper attempt is most worth capturing, and the end-of-set **not-mastered `result`** state ("So close — … Let's run it back"). Attempt context is in hand here: `nodeId`, `slot.instance.item_version_id`, `template_id`/`template_params`.
- **End-of-lesson CFU — `apps/web/src/lessons/cfu.tsx`.** `handleSubmit` sets `status === "incorrect"`; same pattern, has `nodeId` + the CFU item id.
- **Shared checker (where "incorrect" originates, not a UI attach point) — `packages/shared-components/src/checker-core.ts`.** `incorrect(reasonCode)` returns `{ status: "incorrect", client_correct: false }`; the D1 (`d1-answer-checker.ts`) and product (`product-answer-checker.ts`) checkers both flow through it. UI reads `CheckAnswerResult.client_correct`. Useful to know the single semantic origin of "wrong," but the attach is in the lesson components above, not the pure checker.
- **Diagnostic — NOT an in-the-moment attach point.** `apps/web/src/diagnostic/session.ts` + `DiagnosticRunner.tsx` run record-only with **no mid-test grades** (by design — anxiety-sensitive placement). There is no "you got this wrong" moment during the test. If we want work capture for the diagnostic, it must be a **post-diagnostic review** screen keyed off the finalized administration + `item_version_id`, not a per-item prompt.

## 3. Recommended approach vs alternatives

**Two independent axes (not one binary).** It helps to name the design space before picking a slice — there are two axes, and they combine freely:
- **(a) Capture method:** *photo of paper* vs *on-screen digital ink* (drawing/writing math in the browser).
- **(b) Processing:** *store-only* (attach the artifact for human review) vs *AI-parse* (run it through a model for automated error analysis).

Any capture method can feed either processing step. **Recommended = photo capture + (later) an AI parse layered on the *same* photo** — store-only first (v1), parse as a fast-follow (v2); see the §3.5 Roadmap and §7. Options A and B below are both *photo-capture* delivery mechanisms (direct input vs QR hand-off) on axis (a); store-only → AI-parse is the v1 → v2 sequencing on axis (b).

**Recommend AGAINST on-screen handwriting as the primary path.** On-screen ink is a poor default for three reasons: (1) writing math with a **mouse is bad** and is only really viable with a tablet/stylus, but **this app is desktop-heavy**; (2) **math handwriting recognition is error-prone** exactly where math lives — fractions, exponents, radicals, stacked multi-step work; and (3) it **fights the "paper is where math happens" grain** this feature is built around (§1). If on-screen ink is ever added, it is an **alternate capture** feeding the *same* pipeline (store, then the v2 parse) — never the primary path and never a replacement for the photo.

### Option A — Direct in-page capture (RECOMMENDED first slice)
A file input on the incorrect/review state:

```html
<input type="file" accept="image/*" capture="environment" />
```

On a phone this opens the rear camera directly; on desktop it is a normal file picker (or webcam via `getUserMedia`, optional). No pairing, no second device, no new page.

- **Pros:** trivial to build; works *today* on the device students most often hold while doing paper math (a phone); no pairing tokens, no login-less surface, no polling; smallest new attack surface.
- **Cons:** a desktop-only user must get the photo onto the desktop (AirDrop/USB/webcam) — awkward for exactly the "did it on paper, sitting at a laptop" case; no cross-device magic.

### Option B — QR desktop→phone one-shot hand-off (RECOMMENDED fast-follow)
The PRD §10 design: desktop renders a QR encoding a one-time, session-scoped upload URL/token; the student scans it, a single-purpose phone-browser page opens (PRD says login-less), they snap a photo, it uploads against that session, and the desktop reflects it (poll/refresh — the stack is **no-realtime** by locked decision).

- **Pros:** best desktop UX; snap on the good camera, appears on the big screen; matches the PRD's stated intent.
- **Cons:** materially more surface — a pairing-token service, a login-less mobile upload page, desktop polling, and the security work that a login-less write implies (short-lived single-use token bound to the desktop session/student, rate limiting, size/type caps). More plumbing, more to get wrong.

### Recommendation
**Ship Option A first (direct input), add Option B as a fast-follow.** Rationale: A delivers the "super simple" ask immediately and covers the phone case (where paper photos naturally happen) with near-zero risk; B is a genuine desktop UX win but is the part that carries the pairing + login-less-upload complexity, so it should follow once A proves the surface is used. This **reframes** the backlog's "Mobile QR work-upload" (which is QR-first and buried among "correctness rabbit holes"): the direct-input slice is neither a correctness problem nor a rabbit hole — it is small, self-contained plumbing.

*(Note: `PRD_Full.md` §10 says "same web + Supabase stack" — that phrasing is **stale**. The backend is AWS-native now (`docs/Deployment.md`); read "Supabase" as "S3 + CloudFront + Cognito + Lambda + Aurora.")*

## 3.5. Roadmap — phased delivery (v1 store-only → v2 AI-parse)

The work-checker is built **phased** along the two axes in §3: v1 fixes the capture method (photo) and the processing (store-only); v2 layers AI-parse processing on top of the *same* photo pipeline. Nothing in v2 changes v1's contract.

### v1 — photo capture, STORE-ONLY (as scoped, unchanged)
Photo capture, store-and-review only, exactly as in §§2–7: **Option A (direct in-page input) first, Option B (QR desktop→phone hand-off) as a fast-follow.** The image is attached to the miss for later human review and is one-way/inert — it never touches mastery, placement, or the pre/post metric. No change from v0.1.

### v2 — AI vision parse (planned; gated)
A **Lambda step that runs the uploaded photo through a vision model / MathPix-style OCR** to extract the worked steps and **localize the mistake**. This directly serves the "richer diagnostic signal / localize the mistake" goal already stated in §1 — and is a **better route to it than distractor-tagging** (cf. `Error_Typing_Spec.md`), because it reads the student's actual paper work instead of inferring the misconception from a chosen wrong option. Two gates must clear before v2 is buildable:

- **Child-safety / privacy — the real blocker (gating dependency).** Sending student photos to a third-party model is **third-party sharing of student PII**, which the **§6 COPPA/FERPA posture forbids**. v2 therefore **REQUIRES** either (a) an **education-compliant provider** under a signed DPA with **no-retention / no-training** terms, or (b) **self-hosted / on-device OCR** that keeps images inside our trust boundary. Absent one of these, v2 does not ship — this is *the* gating dependency, not an implementation detail.
- **Accuracy + the one-way invariant.** A parse will **sometimes misread** (fractions, exponents, radicals, stacked steps). Its output is therefore **FEEDBACK-ONLY** and **must never be an input to mastery, placement, or the pre/post metric** — the same one-way rule that governs the rest of the system (§1, §7). The UX presents the parse provisionally: **"here's what we read — correct us if we got it wrong."**

> ### ⚑ THE TWO RECORDS BELOW WERE WRITTEN THE SAME DAY WITHOUT SEEING EACH OTHER
>
> Read in the order printed. **#650's supersession of the FIRST bullet comes first because it
> is the one that changes what may be built**; #635's research into the SECOND bullet follows.
> The collision is named here rather than resolved by deleting either: #635's block opens with
> *"Both gates stand exactly as written"*, which was true when it was written and is **not**
> true now — the first gate was lifted the same day, by the ruling immediately below. Nothing
> else in that block is affected, because it is about the second gate throughout, and its
> licence findings and its Phase 0 recommendation stand on their own merits whether or not a
> frontier API is available.

> ## ⚑ THE FIRST BULLET IS SUPERSEDED — 2026-08-05, BY GABE, AND EXPLICITLY REVISITABLE
>
> **The gate above is LIFTED. v2 may call a frontier vision model behind an API. The bullet is kept unedited because the posture it states is the one we are departing from, and a reader who finds the code without finding the departure would be entitled to think it a bug.**
>
> **The ruling, verbatim (Gabe, 2026-08-05):**
>
> > *"just assume FERPA isnt a problem as of now; because its not tied to any specific school system, we're comfortable just passing it into a frontier model and having it evaluate it. so just wire up that endpoint - if security becomes a concern later on we can touch on that."*
>
> **Its stated basis, in his words and not ours:** the product is not sold into a school system, so FERPA's school-official framing — the part of §6's posture that assumes an educational institution and its authorized agents — does not bind it. §6 itself already labelled that posture *"a chosen posture to confirm with counsel, not legal advice"*; this is the owner making the choice the sentence left open. **It is a business decision, recorded as one. No lawyer has been asked, and the note does not claim one has.**
>
> **It is explicitly temporary and he said so.** *"if security becomes a concern later on we can touch on that."* Treat this as a decision with an expiry nobody has set, not a settled position. The two doors the bullet names — an education-compliant provider under a DPA, or self-hosted OCR — are not closed; they are no longer *prerequisites*. `Photo_Work_Upload_v2_OCR_Feasibility.md` remains the costed study of door (b), and its recommendation still stands on the merits.
>
> **What did NOT change, and is not this note's to change:**
>
> - **The second bullet, in full.** Feedback-only is a *separate* invariant from the privacy gate and it survives the ruling untouched. It is also now load-bearing in a way it was not before: the best frontier model behind an API misreads something on **37.62% of real multi-step student pages** (`Photo_Work_Upload_v2_OCR_Feasibility.md` §2.4). A parse that wrong may not be allowed anywhere near placement, and the enforcement is structural rather than a promise — see §4's parse route and `test/workUploadParseStaysFeedbackOnly.test.ts`.
> - **Every other §6 control.** Private bucket, `BLOCK_ALL`, `sub`-scoped presigned URLs, the EXIF/GPS strip on ingest, retention by lifecycle rule, opt-in and never required, student-initiated deletion. The ruling is about **one destination for the bytes**, not about the bytes being less sensitive than §6 says they are. See §6's own banner.
> - **The provisional framing.** *"here's what we read — correct us if we got it wrong"* is not politeness at a 37.62% page-level error rate; it is the accurate description of the output.

#### The second gate, researched and priced — recorded 2026-08-05

> **Nothing above this line has been edited, and nothing below contradicts it.** Both gates stand exactly as written. What follows is the answer to the owner's question about the second one — *"should be on-device for sure. is there a way to conveniently wire that in?"* — and it lives in full at **`docs/Photo_Work_Upload_v2_OCR_Feasibility.md`**, read at `684a7a9f`.
>
> **The short version: no, not conveniently, and the accuracy bullet above is the reason rather than the plumbing.** In-browser is ruled out on evidence — there is no photo-input handwritten-math model in the browser ecosystem at all, and the one small in-browser recognizer that exists takes pen strokes, which is the on-screen-ink path §3 already recommends against. Self-hosting inside AWS is buildable and, in its CPU shape, effectively free at pilot volume; what it cannot buy is accuracy. The best self-hostable model reaches ~72.7% exact-match on a photograph of **one cropped expression**, and on the only published benchmark of real multi-step student pages the one *open-weight* model evaluated misreads something on 85% of them, against 38% for the best frontier model behind an API.
>
> **The note's recommendation is a narrower framing that this roadmap makes available for free**, and it belongs here because it changes what v2 should be rather than when it lands: the goal in §1 and above is to **localize the mistake**, not to transcribe the page, and the repo already holds the full canonical solution path for **2,230 of 2,230** practice items (median 4 steps). `LessonPractice.tsx` renders those steps as numbered cards on the same `revealed` state that carries v1's upload button. Making them tappable — *"which step is where yours stopped matching?"* — yields the same signal with no model, no new subprocessor and no accuracy question, and it produces the `(image, step index)` labels any later parse would need to be evaluated against.
>
> **What this changes about the roadmap:** nothing in v1, and nothing about either gate. It proposes a **Phase 0 before v2** that is not an AI parse at all, and it therefore reopens the owner assignment in §7 — v2 is assigned to Gabe as "the parse Lambda + AI-provider vetting," and Phase 0 has neither, sitting instead in `apps/web/src/lessons/**` (Anthony's lane per `OWNERS.md`) plus one additive column. Six decisions are put to the owner in that note's §10; §11 lists the eight things it could **not** establish, of which the largest is that **no published benchmark measures US pre-calculus student handwriting**.

#### Two rulings, and what open-source-only costs — recorded 2026-08-05

> **Also appended rather than edited; the block above is unchanged.** The owner has ruled twice: **Mathpix is out** (*"no - dont have time to chase after quotes right now. look into open-source ocr"*), and **Phase 0 is approved and being built**. That makes the note's Phase 1 — verify the photo against the item's own known step values instead of transcribing it — the live question, and **§13 of `docs/Photo_Work_Upload_v2_OCR_Feasibility.md` answers it**.
>
> **Two findings belong in this scope note rather than only in that one.** First, a **licence wall**: CoMER, TAMER, PosFormer and ICAL — the small specialist models any cheap self-hosted parse would reach for — ship with **no licence file at all**, and the best-known fine-tune is derived from a base licensed for research use only. The clean, commercially usable options are narrower than the field looks: **UniMERNet** and **PaddleOCR's PP-FormulaNet** (Apache-2.0 in both code and weights), and the **Qwen3-VL / Qwen3.5** variants of Uni-MuMER. Second, the verification framing carries a trap worth knowing before anyone builds to it: a student's slip and an OCR misread are **both about one symbol**, so a match rule loose enough to survive the OCR is loose enough to wave through the mistake. That is answerable — rank the item's own candidates by likelihood and abstain on a small margin — and it is why Phase 0's learner-supplied step index is a **precondition** for the parse rather than merely a cheaper substitute for it.
>
> **Nothing is recommended for building yet.** §13.5 proposes a one-afternoon measurement that can settle it either way, and §13.8 records that the subprocessor reading in that note's §8 is still live and has moved: Bedrock now serves **open-weight** multimodal models fully managed, which is a materially smaller legal question than the one §8 posed and is worth roughly a hundredfold in model capacity at the same monthly cost. That reading remains the owner's and counsel's; neither note makes it.

## 4. Backend / storage / auth wiring (grounded in the repo)

Nothing exists for user-content upload today; the pieces to add are small and follow existing patterns.

- **Auth (exists, reuse as-is).** Cognito public SRP client in the browser (`apps/web/src/auth/cognitoClient.ts`: `getAccessToken()`, `getCurrentIdentity()` → `studentId` from the JWT `sub`). Requests send `Authorization: Bearer <access token>` (`apps/web/src/api.ts` `apiGetJson`); the Lambda verifies the JWT (JWKS) and derives `student_id` from `sub` (Contracts §5). The upload endpoint reuses exactly this — the browser never touches storage or DB directly.
- **API (exists, add routes).** `services/diagnostic-api/src/app.ts` is a Hono app under `/api` (today: `POST /api/diagnostic`, `GET /api/city`, `GET /api/measurement`), deployed as one Lambda behind API Gateway + CloudFront (`/api/*` → API Gateway; default → S3 SPA — `infra/lib/calc-readiness-stack.ts`). Add e.g. `POST /api/work-upload` (mint a short-lived **presigned S3 PUT** scoped to the student + attempt) and `GET /api/work-upload?item=…` (list/mint presigned GETs for the student's own uploads). For Option B, add `POST /api/work-upload/pair` (issue a pairing token for the QR) and a login-less `POST /api/work-upload/mobile` bound to that token.
- **Object storage (MUST ADD).** There is **no user-content bucket** — the only S3 bucket in `infra/` is the private SPA-hosting `siteBucket` (`BlockPublicAccess.BLOCK_ALL`, OAC, CloudFront-fronted). Add a **new private uploads bucket** (also `BLOCK_ALL`, `enforceSSL`, encrypted), grant the Lambda `s3:PutObject`/`GetObject` (or just presign), and give it a **lifecycle expiration** rule (unlike `siteBucket`'s `RETAIN`) for retention (§6). Access is always server-mediated via short-lived presigned URLs — never a public object URL.
- **Metadata (MUST ADD).** Aurora Serverless v2 via the RDS Data API, Lambda-only as least-privilege `app_service`; schema lives in `db/migrations` applied by `db/apply.mjs`. Add a `work_upload` table: `id`, `student_id` (= Cognito `sub`), `object_key`, `content_type`, `size_bytes`, `created_at`, plus the association keys in §5. Reads are `sub`-scoped exactly like the existing city/measurement reads.
- **The v2 parse route (ADDED 2026-08-05, after the §3.5 gate was lifted).** `POST /api/work-upload/parse` with `{ uploadId }`: same Cognito verification and same `sub` scoping as the four routes above, then read the STORED (already-stripped) object back, hand it to a vision model behind the `VisionModel` port, and answer a provisional reading. Three properties are worth stating here rather than only in code, because each is a design decision somebody could reasonably reverse without noticing what it cost:
  - **It is a separate request, not a step in `complete`.** Ingest never calls a model. Uploading a photo is therefore not consent to send it to one, an upload nobody looks at costs nothing, and switching the parse on is a route somebody calls rather than an `if` somebody deletes.
  - **The reading is stored in `work_upload_parse` and cascade-deleted with its upload.** One provider call per upload; a re-open of the same photo is free, and §6's deletion right removes the reading too.
  - **Spend is capped in dollars before the call, not counted after it.** Per-student daily count plus a rolling 24-hour USD ceiling, both read out of the same table. See the parse Lambda's own docblock for the arithmetic and `docs/Deployment.md` for the numbers.

## 5. Data-model association (what an upload is tied to)

Associate each upload with enough context to find it later, all already available at the hook points:
- **`student_id`** — the Cognito `sub` (server-derived from the verified JWT, never client-supplied).
- **Lesson-practice upload:** `node_id` + `item_version_id` (+ optionally `template_id`/`template_params` and the practice-set/attempt id). The wrong-answer attempt is the anchor.
- **Diagnostic (post-test review) upload:** `administration_id` + `item_version_id` (from `apps/web/src/diagnostic/session.ts`'s `ServedStage`).
- **Optional freeform** `note`/`created_at`. Keep the association additive so it slots beside the existing append-only response log without disturbing scoring records.

## 6. Privacy & child-safety considerations (load-bearing — this is student-generated imagery)

Student photos are **sensitive**: they can contain faces, names, home surroundings, and handwriting. Treat every upload as student PII and an education record.

- **Regulatory posture:** COPPA (users under 13 → verifiable parental consent, data minimization, deletion rights) and FERPA-style education-record handling (access limited to the student and authorized adults; no third-party sharing). This is a chosen posture to confirm with counsel, not legal advice.

> ## ⚑ ONE CLAUSE OF THE POSTURE ABOVE IS SUPERSEDED — 2026-08-05, BY GABE, AND EXPLICITLY REVISITABLE
>
> **Scope of the change: the words "no third-party sharing", and only for one destination.** A student's uploaded photo may be sent to a frontier vision model behind an API for the v2 parse (§3.5, whose banner carries the ruling verbatim). Nothing else in this section moves, and the clause is kept unedited above rather than rewritten, so the posture we departed from stays legible beside the departure.
>
> **His stated basis:** the product is not sold into a school system, so FERPA's school-official framing does not bind it. He has explicitly accepted revisiting this — *"if security becomes a concern later on we can touch on that."* **This is a business decision by the owner, not a legal opinion, and the sentence it amends already said the posture was "to confirm with counsel."**
>
> **Every other bullet in §6 still binds, and the parse route is built to them:**
>
> | §6 control | Still binding? | How the parse route honours it |
> |---|---|---|
> | Opt-in, never required | **yes** | The parse is a separate authenticated request a learner makes about their own upload. Ingest never calls it, so uploading is not consenting to a model read. |
> | Private by default, `sub`-scoped | **yes** | The parse route re-derives the object key from the verified Cognito `sub` and refuses an upload id that is not the caller's, exactly as the read and delete paths do. |
> | Data minimization on ingest (EXIF/GPS strip) | **yes, and it is now load-bearing twice** | The parse reads the object back **after** the ingest strip, never the bytes as PUT. What leaves our boundary therefore carries no geolocation — which is the difference between sending a model a page of algebra and sending it a child's home coordinates. |
> | Retention + deletion | **yes** | The parse row is `on delete cascade` from `work_upload`, so a student's deletion removes the reading as well as the photo. The deploy runbook now also blocks on Bedrock account retention mode `none`; that account reading is required rather than assumed. |
> | No moderation pipeline | **yes**, unchanged | Images stay private and unshared; the parse does not change that. |
>
> **What we did NOT do, so a future reader is not misled about what was cleared.** No
> project-specific DPA review is recorded. AWS now exposes an account retention mode whose
> documented `none` value writes no request/response to durable storage and shares none with
> the model provider; `Work_Checker_Deploy_Runbook.md` §3 makes a measured `none` result a
> deploy blocker. The repository cannot read that account or enforce its organization SCP, so
> zero retention is **required but unverified** until the operator quotes the read-back.
- **Opt-in, never required.** Uploading is always optional and never gates progress (consistent with the one-way invariant). No dark patterns.
- **Private by default.** New bucket is `BLOCK_ALL` public access; all access is via short-lived presigned URLs minted by the Lambda **only** for the owning `student_id`. A student can read only their own uploads (mirror the `sub`-scoped city/measurement read path). No public/shareable links in v1.
- **Login-less QR page is the sharp edge (Option B).** A login-less upload endpoint is an *unauthenticated write*: the pairing token must be short-lived, single-use, and bound to the desktop session + student; enforce size/type caps and rate limits; the mobile page must expose no other student's data. Prefer to ship Option A (fully authenticated) first precisely because it avoids this surface.
- **Data minimization on ingest.** Strip EXIF/geolocation; store only what's needed; cap file size and accepted MIME types (image/* only).
- **Retention + deletion.** Define a retention window (e.g. term-bounded) enforced by an S3 lifecycle rule, plus student/parent-initiated deletion (delete object + metadata row). Deletion owner TBD.
- **No moderation pipeline in v1**, which is acceptable *only because* images are private and unshared; if sharing is ever added, moderation becomes a prerequisite.

## 7. Effort, dependencies, open questions, owner, non-goals

**Effort (S/M/L):**
- Option A (direct input, authenticated): **S** — one input on the incorrect/review state, one `POST /api/work-upload` presign route, one private bucket, one metadata table.
- Option B (QR pairing) fast-follow: **M** — pairing-token service, login-less mobile page, desktop poll, token security.
- Full experience (tutor-review UI, cross-device polish, moderation): **L**.

**Dependencies:**
- Deployed server-backed mode (`VITE_DIAGNOSTIC_API_URL` + Cognito) — the dev/CI loop is in-memory with no server (`apps/web/src/api.ts` `isServerBacked`), so the demo path needs the real API.
- New S3 uploads bucket + Lambda IAM (`infra/`, Gabe area) and a `work_upload` migration (`db/migrations`, Gabe area).
- If the upload record is typed into the frozen `packages/shared-state-schema`, that is an all-hands change; it can start service-local to avoid a freeze event.
- Lesson-side attach UI in `apps/web/src/lessons/**` / `engines/lesson` (Anthony area).

**Open questions:**
- Which surfaces get it first — lesson practice only, or also CFU and a post-diagnostic review?
- Authenticated-only (Option A) at launch, or also the PRD's login-less QR page (Option B)? Reconcile the login-less write with the child-safety posture above.
- Retention window length + who owns deletion requests.
- Do we ever show the image back to the *student* (in the city/review), or is it capture-only for a future tutor?
- Max size / count per attempt / accepted formats; storage-cost ceiling.
- Does the upload record need to live in the frozen Contracts (all-hands), or stay service-local for v1?

**Suggested owner: TBD / UNASSIGNED.** If picked up, it splits cleanly along existing lanes (no new owner, like the cosmetic economy). **v1 (store-only):** **Gabe** = uploads bucket + `POST /api/work-upload` + `work_upload` migration + any shared type; **Anthony** = the lesson-side attach UI on the incorrect/review state; **Evan** = optional city/review surfacing. **v2 (AI parse):** **Gabe** = the parse Lambda + AI-provider vetting (securing an education-compliant DPA / no-retention provider, or standing up self-hosted/on-device OCR). The feature as a whole remains **UNASSIGNED / post-demo**, left formally unassigned per the backlog.

**MVP non-goals (v1 explicitly does NOT):**
- **NO OCR in v1 (sequenced, not a permanent non-goal).** Capture-for-review only in v1; **AI parse is a planned v2** (see the §3.5 Roadmap), ~~**gated on an education-compliant provider** (signed DPA / no-retention, or self-hosted/on-device OCR)~~ — **that gate was LIFTED 2026-08-05 by Gabe; see the §3.5 banner for the ruling and the §6 banner for what it did and did not change.** On-screen **handwriting recognition stays off the primary path** (§3). *(This was a permanent non-goal in v0.1; v0.2 promotes it to a sequenced roadmap item.)*
- **NO partial credit from the image.** Mastery stays evidence-based via the checker; the image is never an input to mastery, placement, or the pre/post metric.
- **NO tutor/teacher dashboard.** Store + let the student see their own; tutor review is a later follow-on.
- **NO realtime.** Desktop reflects a QR upload via poll/refresh (matches the locked no-realtime decision).
- **NO moderation/sharing.** Private and unshared in v1.
