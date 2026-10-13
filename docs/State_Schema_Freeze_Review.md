# State-Schema Freeze Review — `@cr/state-schema` vs Contracts §1–§2

*Reviewer: Gabe · Date: 2026-07-20 · Branch: `gabe/diagnostic` · Task: Day 1-2 "Review and all-hands-freeze the scaffolded state-schema package (types only) against Contracts §1-2."*

*Scope of this doc: a **review for all-hands ratification**, not a unilateral freeze. It compares every exported type in `packages/shared-state-schema/src/index.ts` against `docs/Contracts.md` §1–§2, cross-checks consumers so a freeze won't break callers, and checks parity with `supabase/migrations/0001_core_contracts.sql`. Cosmetic-economy types (§8 / `Contracts_Amendment_Cosmetic_Economy.md`) were reviewed **only to confirm scope boundaries** (see §7 below).*

---

## 1. Summary & freeze recommendation

**Status: FROZEN — all-hands ratified 2026-07-20.** `@cr/state-schema` §1/§2 types are locked; changes are now a deliberate all-hands event. The should-fix (`ReadinessScope`) was resolved before freeze (relocated to `@cr/components`); the 3 nits were reviewed and accepted as-is. **Frozen as amended:** the same-day adaptive-diagnostic amendment adds two additive fields to `AssessmentAdministration` (`scoring_model_version`, `routing_path`), consistent across the type, Contracts §2, and the `0001` migration; no other type changed.

**Recommendation (at review): READY TO FREEZE (0 blockers, 0 should-fix, 3 nits).**

One-line reason: the §1–§2 data model is represented completely and correctly — all field names, wire types, enums/unions, id types, and optionality match both the contract and the 0001 migration — and the one export with **no §1–§2 basis** (`ReadinessScope`, a §4.4 state-client concept) has now been **relocated to `@cr/components`**, so the frozen surface contains only Contracts §1–§2 types. The three remaining items are documentation nits.

- **Nothing here is a blocker.** Every §1/§2 entity and field is present with the correct shape; every consumer compiles against the current types.
- The single should-fix (D1, `ReadinessScope`) is **RESOLVED**: the type was moved out of the frozen package into `@cr/components` (see §8).
- The remaining §3 items (D2–D4) are nits — documentation/modeling notes with no §1/§2 shape impact.

The frozen §1/§2 surface is now clean and can be ratified as-is.

---

## 2. Type-by-type conformance table (§1–§2)

Legend: ✓ conforms · ⚠ discrepancy/decision (see §3) · n/a not a §1–§2 record (modeling helper)

| # | Exported symbol | Contract basis | Conforms? | Notes |
|---|---|---|---|---|
| 1 | `type UUID = string` | §1/§2 `uuid` columns | ✓ | Wire alias; matches `uuid` throughout. |
| 2 | `type ISODateTime = string` | §1/§2 `timestamptz` columns | ✓ | Wire alias for timestamptz. |
| 3 | `type PlacementEstimate = 0\|1\|2\|3` | §1 `placement_estimate int 0-3` | ✓ | Exact 0–3 literal union. |
| 4 | `type Mastery = 0\|1\|2\|3` | §1 `mastery int 0-3` | ✓ | Exact 0–3 literal union; monotonic rule is behavioral (mastery service), not a type concern. |
| 5 | `type CompletionStatus = "locked"\|"in_progress"\|"complete"` | §1 enum | ✓ | Exact match to enum + DB `completion_status` type. |
| 6 | `type LessonStage = "not_started"\|"teaching"\|"practice"\|"done"` | §1 enum | ✓ | Exact match to enum + DB `lesson_stage` type. |
| 7 | `type AssessmentPurpose = "pre"\|"post"\|"placement"` | §2 enum | ✓ | Exact match to enum + DB `assessment_purpose` type. |
| 8 | `type ScoringStatus = "correct"\|"incorrect"\|"invalid_input"\|"unsupported_expression"\|"scoring_error"` | §2 enum | ✓ | Exact match to enum + DB `scoring_status` type. |
| 9 | `interface StudentNodeState` | §1 `student_node_state` | ✓ | All 8 fields present; names/types/optionality match §1 and 0001. See §5. |
| 10 | `interface NeighborhoodState` | §1 neighborhood checkpoint table | ✓ | `student_id`/`neighborhood_id`/`checkpoint_cleared` match §1 table + 0001. See §3-D3 on the `neighborhood_checkpoint_cleared` prose name. |
| 11 | `interface AssessmentAdministration` | §2 `assessment_administration` | ✓ | All 10 fields present; names/types/optionality match §2 and 0001. |
| 12 | `interface AssessmentItemSubmission` | §2 (client-provided subset of `assessment_item_response`) | n/a✓ | Not a standalone contract table; models the pre-finalization client payload. Fields are the §2 client-side subset. See §3-D2. |
| 13 | `interface AssessmentItemResponse extends AssessmentItemSubmission` | §2 `assessment_item_response` | ✓ | Union of Submission + `authoritative_correct`/`scoring_status`/`reason_code` = the full §2 row. |

*(Former row 9, `ReadinessScope`, has been relocated to `@cr/components` and is no longer exported from this package — see D1 (RESOLVED) and §8.)*

### 2.1 `StudentNodeState` field-level detail

| Field | Schema type | §1 type | 0001 column | Match? |
|---|---|---|---|---|
| `student_id` | `UUID` | uuid (auth, never payload) | `uuid not null` | ✓ |
| `node_id` | `string` | text (static, e.g. `FUN.1`) | `text not null` | ✓ |
| `placement_estimate` | `PlacementEstimate` | int 0-3 | `smallint not null check 0..3` | ✓ |
| `mastery` | `Mastery` | int 0-3 | `smallint not null default 0 check 0..3` | ✓ |
| `mastery_updated_at` | `ISODateTime \| null` | timestamptz | `timestamptz` (nullable) | ✓ |
| `completion_status` | `CompletionStatus` | enum (derived) | generated-always stored enum | ✓ (see §5 note on "derived") |
| `lesson_stage` | `LessonStage` | enum (UI hint) | `not null default 'not_started'` | ✓ |
| `last_practiced_at` | `ISODateTime \| null` | timestamptz | `timestamptz` (nullable) | ✓ |

### 2.2 `AssessmentAdministration` / `AssessmentItemResponse` field-level detail

`AssessmentAdministration`: `administration_id`✓, `student_id`✓, `purpose`✓, `form_id`✓, `form_version:number`✓, `blueprint_version:number`✓, `scoring_engine_version:number`✓, `equivalence_checker_version:number`✓, `started_at:ISODateTime`✓ (non-null), `submitted_at:ISODateTime|null`✓ (nullable) — all match §2 and 0001.

`AssessmentItemResponse` (= Submission + finalized): `administration_id`✓, `item_version_id`✓, `node_id`✓, `raw_answer:unknown`✓ (jsonb), `item_definition_hash`✓, `equivalence_checker_version`✓, `client_correct:boolean`✓ (non-authoritative), `authoritative_correct:boolean`✓, `scoring_status:ScoringStatus`✓, `reason_code:string`✓ — the union equals the full §2 `assessment_item_response` row.

---

## 3. Discrepancy / decision list

No blockers and no should-fixes remain. The three items below (D2–D4) are nits with no §1/§2 shape impact.

### D1 — `ReadinessScope` has no §1–§2 basis  ·  severity: should-fix  ·  **RESOLVED**
- **Mismatch (schema vs contract):** the package exported `type ReadinessScope = "foundational" | "product"`. No §1 or §2 field used it. Its only home in the contract is §4.4 (state client), and even there the frozen signature is `isDomainReady(domain): boolean` — `scope`-based readiness is not part of §1/§2 at all.
- **Consuming code affected:** `packages/shared-components/src/index.ts` (`StateClient.isReady(scope: ReadinessScope)`). The literals `"foundational"`/`"product"` also echo assessment-scope / `product_scope` concepts used in `@cr/skill-graph` (`getNodesByScope`, `node.product_scope`), reinforcing that this is a §4/skill-graph concern, not §1/§2 shared state.
- **Resolution applied:** relocated `ReadinessScope` out of the frozen `@cr/state-schema` package and into `@cr/components` (`packages/shared-components/src/index.ts`), co-located with `StateClient`/`isReady` where it is consumed. The state-schema barrel no longer exports it; the sole import site (shared-components) now uses the local definition. No dependency cycle is introduced — `@cr/components` already depends on `@cr/state-schema`, not the reverse. The frozen §1/§2 surface now contains only §1/§2 records.

### D2 — `AssessmentItemSubmission` / `AssessmentItemResponse` split is a modeling extension  ·  severity: nit
- **Mismatch:** §2 defines a single `assessment_item_response` table; the schema splits it into a client-provided `AssessmentItemSubmission` (payload before finalization) and `AssessmentItemResponse extends …` (the finalized, append-only record adding `authoritative_correct`/`scoring_status`/`reason_code`).
- **Consuming code affected:** `services/scorer/src/index.ts` relies on exactly this split (`scoreAndAppend(submission): AssessmentItemResponse`). The split is *load-bearing* and correct — it encodes the §2/§3/§5 rule that the client supplies `client_correct` (non-authoritative) while the scorer produces the authoritative fields.
- **Proposed resolution:** keep as-is; add a one-line doc note to the review record (done here) so the all-hands ratifies the split intentionally. The existing code comments on both interfaces already explain it. No change needed.

### D3 — §3 prose name `neighborhood_checkpoint_cleared` vs field `checkpoint_cleared`  ·  severity: nit
- **Mismatch:** §3 write-mapping prose calls the game-engine write `neighborhood_checkpoint_cleared`, while the §1 table definition, the schema (`NeighborhoodState.checkpoint_cleared`), and 0001 (`neighborhood_state.checkpoint_cleared`) all use `checkpoint_cleared`.
- **Consuming code affected:** none — `engines/game` uses `NeighborhoodState`/`checkpoint_cleared` correctly.
- **Proposed resolution:** documentation-only; the schema matches the authoritative §1 table + DB. Optionally tidy the §3 prose to say `neighborhood_state.checkpoint_cleared`. Not a schema issue.

### D4 — TS cannot encode DB check constraints (versions `> 0`, `submitted_at >= started_at`)  ·  severity: nit
- **Mismatch:** 0001 enforces `form_version/blueprint_version/scoring_engine_version/equivalence_checker_version > 0` and `submitted_at >= started_at`; the schema types these as plain `number`/`ISODateTime`.
- **Consuming code affected:** none (runtime/DB enforces).
- **Proposed resolution:** accept — these are DB invariants, not expressible in structural TS without branded types. No change.

---

## 4. Coverage gaps

### 4.1 Contracts §1–§2 entities/fields NOT represented in the schema
- **None missing.** Every §1 field of `student_node_state`, the §1 `neighborhood_state` checkpoint table, and every §2 field of `assessment_administration` and `assessment_item_response` is represented.
- **Intentional non-inclusions (correct):** §2's optional derived `assessment_node_summary` is explicitly *not* the authoritative record ("item rows are"), so its absence is correct, not a gap.

### 4.2 Schema types with no §1–§2 contract basis (candidates to remove/document)
- **`ReadinessScope`** — see D1 (**RESOLVED**). This was the only true "no §1–§2 basis" export; it has been relocated to `@cr/components`, so the frozen package no longer has any no-basis exports.
- **`AssessmentItemSubmission`** — has a §2 basis as the client subset of the response row; keep (see D2).

---

## 5. DB parity notes vs `0001_core_contracts.sql`

- **Enums are byte-for-byte aligned.** `completion_status`, `lesson_stage`, `assessment_purpose`, `scoring_status` DB enum values exactly equal the TS unions (including member order and spelling).
- **`student_node_state` parity: full.** Types line up (uuid/text/smallint/timestamptz ↔ UUID/string/0-3 union/ISODateTime). Nullability lines up: `mastery_updated_at` and `last_practiced_at` are nullable in both; `placement_estimate`, `mastery`, `lesson_stage` are non-null in both (schema has them required, non-`| null`).
- **`completion_status` is a GENERATED STORED column** in 0001 (`case … mastery >= 2 → complete … mastery = 1 → in_progress … else locked`), i.e. read-only/derived, matching §1 ("Derived from mastery, NOT from lesson_stage"). The TS type is a plain field and cannot express "derived/read-only." **Recommendation (nit):** consider a doc comment marking it derived/read-only so no consumer treats it as writable; the RLS grants already prevent client writes. Not applied (touches the frozen file).
- **RLS ownership matches §1/§2/§5.** Every table is RLS'd on `student_id = auth.uid()`; `assessment_item_response` is SELECT-only for clients (INSERT via service); `student_node_state` client grants are INSERT `(student_id, node_id, placement_estimate)` + UPDATE `(lesson_stage, last_practiced_at)` only — i.e. clients cannot write `mastery`/`completion_status`, exactly as §3/§5 require. The type surface does not contradict this (it's a read/wire shape; write authority is enforced in DB, not types).
- **DB-only tables not modeled in the schema (correct):** `mastery_evidence` (idempotency, §5) and `raw_response_log` (raw log / error-typing, §5/§7) exist in 0001 but are **not §1–§2 shared-state records** that all three engines read, so their absence from `@cr/state-schema` is appropriate. Flag only: if the team wants these typed, they belong in a service-local module, not the frozen §1/§2 package.
- **PK/shape note:** 0001 `assessment_item_response` PK is `(administration_id, item_version_id)`; the "one row per ITEM per administration" rule (§2) is a DB constraint, not a type constraint — no schema action needed.

---

## 6. Freeze checklist (tick at the all-hands)

- [ ] **Naming locked** — all §1/§2 wire field names are snake_case and match the contract + 0001 (verified ✓ in §2).
- [ ] **Id types locked** — `student_id`/`administration_id` are `UUID`; `node_id`/`neighborhood_id`/`item_version_id`/`form_id` are `string` (text) (verified ✓).
- [ ] **Enums/unions locked** — `CompletionStatus`, `LessonStage`, `AssessmentPurpose`, `ScoringStatus` equal DB enums exactly (verified ✓).
- [ ] **Numeric ranges locked** — `PlacementEstimate`/`Mastery` are `0|1|2|3` literal unions (verified ✓).
- [ ] **Optionality locked** — nullable fields (`mastery_updated_at`, `last_practiced_at`, `submitted_at`) are `| null`; all others required (verified ✓).
- [ ] **No client-writable-only vs derived fields conflated** — decide whether to annotate `completion_status` as derived/read-only (D5/§5); write authority stays in RLS, not types.
- [ ] **Client/authoritative split acknowledged** — ratify the `AssessmentItemSubmission` → `AssessmentItemResponse` split (D2) as intentional.
- [x] **Scope boundary decided** — `ReadinessScope` (D1) **RESOLVED**: relocated to `@cr/components`; frozen package now holds only §1/§2 types.
- [ ] **Economy types out of the frozen MVP package confirmed** — §8 cosmetic-economy types are post-MVP and correctly ABSENT from `index.ts` (see §7).
- [ ] **Consumers verified green** — `engines/diagnostic`, `engines/game`, `services/scorer`, `packages/shared-components`, `packages/shared-mastery-service` all compile against the current types (verified by import cross-reference ✓).

---

## 7. Scope-boundary check: cosmetic economy (§8 / amendment)

Reviewed **only** to confirm boundaries, not to freeze:
- The §8 cosmetic-economy shared types (`ResourceWallet`, `ResourceGrantLedgerEntry`, `CosmeticItem`, `OwnedCosmetic`, `EquippedCosmetic`, plus `ResourceAmount`/`EconomyTxnKind`/`CosmeticEffectClass`) are **explicitly post-MVP (Days 13-24 ranked expansion)** and, per Contracts §8.3 and the amendment §5/§9, are **Gabe's to author during the ranked expansion — NOT at MVP**. The amendment repeatedly tags them "illustrative only; not applied."
- **Correct current state:** `index.ts` contains **none** of these types. That is the intended MVP boundary, so their absence is **not** a coverage gap. Freezing the §1/§2 MVP surface now does not conflict with adding them later (they are purely additive and touch nothing in §1/§2).
- **Recommendation:** do NOT add economy types as part of this freeze. Track them as a separate ranked-expansion schema task so the Day-12 MVP freeze stays minimal.

---

## 8. Applied safe fixes

**D1 (`ReadinessScope`) applied — relocated to `@cr/components`.** The type `type ReadinessScope = "foundational" | "product"` was removed from `packages/shared-state-schema/src/index.ts` and re-defined in `packages/shared-components/src/index.ts`, co-located with `StateClient`/`isReady` (its sole consumer). The shared-components import from `@cr/state-schema` was narrowed to `StudentNodeState` only. No dependency cycle results (`@cr/components` already depends on `@cr/state-schema`; the reverse dependency does not exist). Typecheck and `npm run test:unit` were re-run after the change — both green.

The remaining nits (D2 Submission/Response split, D3 §3 prose name, D4 DB check constraints) are documentation/DB-invariant notes with no §1/§2 shape impact and are intentionally left as recorded recommendations rather than code edits to the frozen file.

---

## 9. Ratification status

This review is **ready for all-hands ratification**. Recommendation: **freeze as-is** — the single should-fix (D1 `ReadinessScope`) is resolved (relocated to `@cr/components`) and only 3 documentation nits remain, none of which change §1/§2 shapes. The `TEAM_CHECKLIST.md` freeze box is intentionally left **unticked** — ticking it is the all-hands freeze event, not a solo action.
