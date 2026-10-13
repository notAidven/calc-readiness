# Contracts Amendment: Diagnostic Persistence (PROPOSED · SUPERSEDED / FOLDED 2026-07-23)

> **✅ SUPERSEDED / FOLDED (2026-07-23).** Under the relaxed **cross-lane change policy** (`OWNERS.md` → "Cross-lane change policy (amended 2026-07-23)", ratified in **PR #19**), this **Gabe-only, single-lane, additive** change no longer needs an all-hands sign-off, so the original "awaiting all-hands" gate is retired. Its substance has **already been folded into the AWS-native diagnostic runtime**: the server-assigned `seq` ordered read and the working-state progress table now live in the Aurora adapters (`services/diagnostic-runtime`, backed by `db/migrations/0002_diagnostic_persistence.sql` + `0003_walk_persistence.sql`). **Stack note:** the Supabase companion artifacts this doc originally cited (`supabase/`, `packages/supabase`, `@cr/supabase`) were **removed** when the stack moved to **AWS-native — Aurora PostgreSQL Serverless v2 (via the RDS Data API) + Amazon Cognito + Lambda + S3** (see `docs/Architecture.md`); the stale references below are annotated inline. The historical technical design (§1–§6) is retained unchanged as the rationale/record.

*__Status: SUPERSEDED / FOLDED (2026-07-23) — originally PROPOSED / NOT YET RATIFIED.__ This is an additive amendment to `docs/Contracts.md` (v2, authoritative) that adds one ordering column to a frozen §2 table plus one new non-frozen working-state table. It carries the same lightweight, additive shape as the ratified adaptive-diagnostic amendment (`docs/Contracts_Amendment_Adaptive_Diagnostic.md`) ~~and needs the same all-hands sign-off before it is folded into Contracts §2~~ **(retired: under the relaxed cross-lane change policy — `OWNERS.md`, PR #19 — this Gabe-only, single-lane additive change no longer needs an all-hands)**. Owner: Gabe (diagnostic lane). Companion artifacts: ~~`supabase/migrations/0002_diagnostic_persistence.sql`, `packages/supabase`~~ **`db/migrations/0002_diagnostic_persistence.sql` (the `supabase/` and `packages/supabase` dirs were removed — the stack is AWS-native; see `docs/Architecture.md`)**, `services/diagnostic-runtime`.*

---

## 1. Summary & scope

The pre/post measurement pipeline (shipped in the measurement PR) recomputes the ability frontier `θ` from the append-only `assessment_item_response` rows **in served order** (Assessment_Scoring_Spec §9, INV-DIAG-4). Postgres has no implicit row order, and the frozen response table has no ordering column, so a *live* (database-backed) run cannot yet reproduce served order on read. This amendment adds the minimum persistence needed to run the diagnostic on real records:

- **Additive `seq` on `assessment_item_response`** — a server-assigned monotonic order key so the ordered read is deterministic.
- **New `assessment_administration_progress` table** — the engine's ephemeral working state between adaptive turns (NOT an immutable record, NOT part of the metric).

It changes **no** existing column, type, or write-mapping. The frozen `@cr/state-schema` wire types are untouched (see §4).

---

## 2. Contract text this changes

### 2.1 Contracts §2 — new recorded field on `assessment_item_response`

- Add: `seq` (bigint, `generated always as identity`) — the server-assigned append order of the row within its administration. Required so the frontier score is reproducible from immutable records without relying on physical row order (Assessment_Scoring_Spec §9). Additive; no existing field changes. Server-assigned only (never client-supplied); the row remains append-only and otherwise immutable.

### 2.2 New non-frozen table `assessment_administration_progress`

- Add a working-state table `(administration_id pk/fk, student_id, current_stage_id, served jsonb, outcomes jsonb, status, updated_at)`. This is **explicitly not** a §2 immutable record: it is the adaptive engine's resumable turn-to-turn state, service-role written and student-readable. It holds no authoritative correctness and is never an input to `θ` or the gain metric. Documented here so its existence is on the record, but it is outside the frozen-record set.

---

## 3. Invariants preserved (must remain true by construction)

- **INV-DIAG-1 (mastery firewall).** Unchanged: the diagnostic still writes only `placement_estimate`, never `mastery`. Neither new object touches mastery.
- **INV-DIAG-2 (metric from answered items only).** `seq` is an ordering key, not a score input; `progress` is working state, not a record. `θ` is still computed only from answered scorable items.
- **INV-DIAG-4 (reproducibility).** Strengthened: `seq` is precisely what lets a live server reproduce served order (and thus `θ`) from immutable records.
- **Append-only immutability (Contracts §2).** `seq` is `generated always as identity`; the response row remains insert-only and immutable to clients (0001 grants stand; the service role is the only inserter).
- **RLS ownership (Contracts §5).** The progress table is RLS'd on `student_id = auth.uid()` for reads; all writes are service-role only (fail closed, matching 0001).

---

## 4. Why the frozen shared types do NOT change

`seq` is a database-internal ordering column, not a wire field the three lanes exchange. The measurement pipeline consumes `AssessmentItemResponse[]` **already in served order**; the read adapter provides that order via `order by seq`. So `seq` is surfaced on ~~`@cr/supabase`'s~~ the DB-row type `AssessmentItemResponseRow` (now the Aurora Data API row mapping in `services/diagnostic-runtime/src/aurora-rows.ts` — `@cr/supabase` was removed in the AWS-native migration), NOT on the frozen `@cr/state-schema` `AssessmentItemResponse`. No shared type changes; teammates' consumption points are unaffected. This is why the amendment is additive-at-the-storage-layer only.

---

## 5. Approval checklist (ratification gate — to confirm at all-hands)

- [ ] **(a) Additive records.** `seq` is additive to `assessment_item_response`; no existing field/type changes. The progress table is new and non-frozen.
- [ ] **(b) Shared types unaffected.** `@cr/state-schema` is unchanged (§4).
- [ ] **(c) Immutability intact.** `seq` is server-assigned identity; the response row stays append-only/immutable to clients.
- [ ] **(d) RLS fail-closed.** Progress reads are own-row; all authoritative writes (response insert, administration finalize, progress) remain service-role only.
- [ ] **(e) Reproducibility.** Served order is deterministic on read via `seq`, so `θ` recomputes from immutable records (INV-DIAG-4).

---

## 6. Ownership & rollout

**Gabe** owns the migration (`0002_diagnostic_persistence.sql` — now under `db/migrations/`), the ~~`@cr/supabase`~~ Aurora Data API row typed contract (`services/diagnostic-runtime`, `aurora-rows.ts`; `@cr/supabase` was removed in the AWS-native migration), and the `services/diagnostic-runtime` adapters that use them. The migration and adapters land now behind the DI ports; the additive `seq` field's Contracts §2 wording folds in on all-hands sign-off (as with the adaptive-diagnostic amendment). **Anthony** and **Evan** are unaffected — no shared type or write-mapping changes.
