# Contracts (v2, authoritative)

*The frozen interfaces the three lanes build against. This document is AUTHORITATIVE for the data model: where the PRD or Architecture differ, this wins. Frozen Day 1. Changes are deliberate and owner-approved (see the Change control below), never a casual commit. Rebuilt to fold in the mastery-scoring spec and the metric/storage rework from the review triage. Companion docs: Mastery_Scoring_Spec.md (how mastery is computed), Architecture.md (how the pieces connect), Contracts_Amendment_Cosmetic_Economy.md (rationale/detail for the §8 cosmetic economy).*

*__Change control:__ amended __2026-07-20__ (all-hands ratified) to add a __post-MVP cosmetic economy__ (§8) — new §3 write-mapping rows, invariants INV-COS-1..5, new shared types, and grant/spend/equip APIs. This is a __Days 13-24 ranked-expansion__ addition; the frozen Day-12 MVP contract (§1–§6) is unchanged. Detailed rationale: `docs/Contracts_Amendment_Cosmetic_Economy.md`.*

*__Change control:__ amended __2026-07-20__ (all-hands ratified) to make the __diagnostic an adaptive multistage instrument__ scored on a difficulty-aware ability frontier — updated the §2 `assessment_administration.purpose` wording and added the additive `scoring_model_version` + `routing_path` fields (INV-DIAG-1..5 preserve the mastery firewall and the metric-from-answered-items-only rule). This is an __MVP-scope__ change to the diagnostic engine + assessment metric definition; it supersedes Assessment_Scoring_Spec §3/§5. Detailed rationale: `docs/Contracts_Amendment_Adaptive_Diagnostic.md`.*

*__Change control:__ amended __2026-07-23__ to **relax the cross-lane change process** (governance only, no data-model change). Changing a frozen interface, or another owner's `packages/*` / engine lane, no longer requires a full all-hands: it requires the **owning developer's review + explicit approval** (in-person or async sign-off both count), documented in the **PR description**, the **changing developer's work log**, and the **relevant spec/doc**. A full all-hands is reserved for changes with **no clear single owner**, or changes that **break broadly across multiple lanes**. This changes the change *process* only; §1–§8 are untouched. Normative policy in `OWNERS.md` ("Cross-lane change policy").*

*__Change control:__ clarified __2026-07-21__ — the lesson unit is now defined as **per node (1 node = 1 lesson = 1 building)**. The old fold-in "lesson shell" (one lesson teaching several nodes) is replaced by the **interaction archetype**: a reusable lesson-interaction template that several nodes' lessons may share for build-effort savings, invisible to the student (each node stays its own lesson + building). `placement_estimate` is defined as a **lesson entry-point router** (a high placement lets a student skip a node's teaching and enter directly at the short "prove it" practice), never an outcome — the building is always earned by practice evidence, nothing is pre-built. This is a **terminology + read-relationship clarification, not a §1/§2 schema change** (no field/write-mapping changes). The registry field rename `lesson_shell` → `lesson_archetype` is a tracked code migration (TEAM_CHECKLIST), owned with the lesson/game lanes.*

*__Change control (proposed 2026-07-23 — RATIFIED 2026-07-26 by Gabe, diagnostic-lane owner and team tie-break; Evan ACK'D 2026-07-26, Anthony did not ack; FOLDED IN 2026-07-26):__ a ratified amendment __expands the diagnostic→building model__. Any node the diagnostic resolves as **`passed`** (`placement_estimate >= 2`, **measured OR graph-inferred**) now unlocks that node's building for immediate placement **without the lesson/practice** ("build-without-lesson" / test-out), completing at **`mastery` 0** so the practice still earns every star; only **failed/unresolved** nodes (`placement_estimate <= 1`) still require the lesson. **The normative text now lives in §1.1** (with the §1 field rows and invariants amended in place); `docs/Contracts_Amendment_Diagnostic_TestOut_Unlock.md` is the rationale / detail record, and **where the two disagree about what ships, this document wins.** It __amends__ the §1 "placement never pre-builds / placement and mastery never equal by construction" invariants (for passed nodes only) and the placement→city mapping in `docs/Contracts_Amendment_Adaptive_Diagnostic_v2.md` §4.4. The diagnostic **engine** still writes **only** `placement_estimate` (INV-DIAG-1 mastery firewall intact) and §3's write-mapping is unchanged; the "passed placement → unlock + complete" behavior is a **city/mastery-lane** responsibility. Because it touches Evan's (construction/placement) and Anthony's (mastery) lanes it is __owner-gated, not all-hands__ (`OWNERS.md` cross-lane change policy). Evan ack'd; __Anthony did not__, and the boxes in his lane were carried by Gabe's tie-break rather than by his signature — so the production mastery-service completion trigger is **still owed his agreement** as implementation work. Rationale/detail, including exactly how the ack gate closed: `docs/Contracts_Amendment_Diagnostic_TestOut_Unlock.md` §6.*

---

## 0. What this doc freezes (and why)

*Terms used throughout: a **node** is one measurable prerequisite skill (the atomic unit; e.g. `FUN.1`), keyed by `node_id`; mastery and state are per node. A **domain** is a group of nodes (a game neighborhood). A **lesson** is the per-node teaching+practice unit: **1 node = 1 lesson = 1 building** (all 1:1) — nodes are never taught in one shared multi-node lesson. An **interaction archetype** is a reusable lesson-interaction template that several nodes' lessons may share for build-effort savings; it is invisible to the student and is not a grouping they experience. Full definitions in PRD §1.5.*

Three surfaces (diagnostic, lessons, game) touch shared things. Merge pain and runtime bugs come from shared *state and interfaces*, not shared concepts. So we freeze, early and in small files:

1. The **student-state schema** (§1) and the **immutable assessment records** (§2).
2. The **write-mappings**: who is allowed to write what, and through which call (§3).
3. The **shared-component APIs** (§4): graphing widget, math input / answer check, state client, mastery service.
4. **Code organization + RLS** (§5, §6).

Implementation happens behind these in each person's lane. Agree the interface, then work behind it.

---

## 1. Student state: `student_node_state`

One row per (student_id, node_id). This is the only per-node mutable state all three engines read.

| field | type | written by | meaning |
|---|---|---|---|
| `student_id` | uuid | auth (never payload) | owner; RLS keys off this |
| `node_id` | text | static | e.g. `FUN.1` |
| `placement_estimate` | int 0-3 | diagnostic ONLY, once at onboarding | seeds initial city visuals (the blueprint ghost) **and routes each node's lesson entry point** (high placement → skip teaching, enter at the "prove it" practice). **Immutable after onboarding. The posttest never touches it.** Not mastery: the diagnostic never writes `mastery` or `completion_status`. A **passed** placement (`>= 2`, measured or inferred) is nevertheless grounds for the city/mastery lane to **unlock + complete that node's building without the lesson** (test-out, §1.1); a **failed/unresolved** placement (`<= 1`) auto-builds nothing and is still earned by practice evidence. *(⚠ **AMENDED 2026-07-23, RATIFIED AND FOLDED IN 2026-07-26.** Superseded text: "it never sets mastery/completion and never auto-builds — the building is always earned by practice evidence", which held for every node before test-out and now holds only for failed/unresolved ones. The write boundary is unchanged: completion is written by the city/mastery lane, never by the diagnostic. Rationale: `docs/Contracts_Amendment_Diagnostic_TestOut_Unlock.md`.)* |
| `mastery` | int 0-3 | **mastery service ONLY** | starts at 0; confirmed only through evidence. Drives "ready" + progression. Monotonic: `max(existing, evidenced)`. See Mastery_Scoring_Spec. |
| `mastery_updated_at` | timestamptz | mastery service | field-specific timestamp (replaces a meaningless row-level `source_of_last_change`) |
| `completion_status` | enum | mastery service (derived) | `locked` / `in_progress` / `complete`. Derived from mastery, NOT from lesson_stage, so it can't contradict mastery — **with one ratified exception: a tested-out node is `complete` at `mastery` 0** (§1.1). |
| `lesson_stage` | enum | lesson engine | `not_started` / `teaching` / `practice` / `done`. The lesson engine may start a node directly at `practice` (skipping `teaching`) when `placement_estimate` is high. UI hint only; never the source of truth for completion. |
| `last_practiced_at` | timestamptz | lesson/mastery service | for the post-MVP `review_due` nudge (no decay in v1) |

**Key invariants:**
- `placement_estimate` and `mastery` are DIFFERENT constructs and never equal by construction: they are distinct fields with distinct writers, and **`mastery` always starts at 0** — the diagnostic never writes it. Placing high seeds a taller blueprint ghost and may fast-track a node's lesson straight to the "prove it" practice. For **failed/unresolved** nodes (`<= 1`) nothing is pre-built and the building is earned only by practice evidence; for **passed** nodes (`>= 2`) the building is pre-built without the lesson, still at `mastery` 0 (§1.1). *(⚠ **AMENDED 2026-07-23, RATIFIED AND FOLDED IN 2026-07-26.** Superseded text: "nothing is pre-built; the building is earned only by practice evidence", stated unconditionally. Only the pre-build half was relaxed, and only for passed nodes — the two fields stay distinct and test-out never moves `mastery`. Rationale: `docs/Contracts_Amendment_Diagnostic_TestOut_Unlock.md`.)*
- `mastery` is monotonic in v1 (nothing lowers it; no decay).
- Building completion reads `completion_status`, never `lesson_stage` alone. This kills the "mastery=2 but lesson_stage=not_started" contradiction. `completion_status` reaches `complete` on exactly two routes: **`mastery >= 2`** (the practice route), or **test-out** (`placement_estimate >= 2`), which completes at `mastery` 0 (§1.1). *(⚠ **AMENDED 2026-07-26** as a consequence of the test-out fold. This bullet previously read "reads `completion_status` (derived from `mastery >= 2`)" with no exception, which the shipped test-out seed contradicts — it writes `completion_status: "complete"` alongside `mastery: 0`. The anti-contradiction rule it exists to enforce is unchanged; only the enumeration of routes to `complete` is.)*

**Mastery scale** (full definition in Mastery_Scoring_Spec.md): 0 = not demonstrated, 1 = engaged/below bar, 2 = mastered (>=80% / 4-of-5 on the practice set), 3 = mastered with margin (100% / 5-of-5). **Mastered = >= 2.** Nothing is gated behind 3 (it's a cosmetic "gold" state).

**Neighborhood checkpoint (game-layer, not per-node):** a small neighborhood-level table `neighborhood_state (student_id, neighborhood_id, checkpoint_cleared bool)` set by the game engine when the storm is beaten. The storm can only be attempted once all the neighborhood's required nodes are mastered (>= 2), so `checkpoint_cleared` is a progression/cosmetic flag, never an input to mastery. It is the ONLY thing the game engine writes.

### 1.1 Test-out: a passed placement builds without the lesson (RATIFIED 2026-07-26)

*Proposed 2026-07-23 and **folded in here 2026-07-26** from `docs/Contracts_Amendment_Diagnostic_TestOut_Unlock.md`, which is now the rationale / detail record and holds no second copy of the rule. **This section is normative; where the two disagree about what ships, this document wins.** Ratified by **Gabe**, as diagnostic-lane owner and team tie-break. Be precise about what that rests on, because the ack gate asked for two and got one: **Evan (construction/placement) ACK'D 2026-07-26** (that doc's §6(c)). **Anthony (mastery) did NOT ack** — the two boxes in his lane, §6(b) and the jointly-held §6(d), are **carried by Gabe's tie-break** under the `OWNERS.md` "Cross-lane change policy (amended 2026-07-23)", not by his signature.*

**The unlock rule.** `placement_estimate >= 2` (resolution `passed`, **measured or graph-inferred**) ⇒ that node's building **unlocks and completes on placement, without the lesson or the practice**. `placement_estimate <= 1` (`failed`/unresolved) ⇒ the lesson is still required. The 2-vs-1 boundary is exactly the passed/failed boundary, so the rule needs no new field and no new threshold. **Measured and inferred passes unlock identically** — both are placement 2, and nothing downstream distinguishes an inferred 2 from a measured 2.

**Test-out completes the building at `mastery` 0 — zero of three stars.** It hands over the *building*, never the evidenced quality the practice produces. A learner who tests out of all six D1 nodes has six finished buildings and **no stars**, and earns each star afterwards by practising the already-built skill. So "without the practice" describes what the *building* costs, not what the learner has left to do: **the practice is still the only route to `mastery`, and test-out skips the lesson only.**

**Consequence: the storm's `mastery >= 2` gate is correct and must not change.** Storm eligibility stays a pure function of `mastery` (the Neighborhood-checkpoint rule above; `Mastery_Scoring_Spec` §5 is the authority). A tested-out learner is therefore **not finished, not blocked** — test-out skipped their lesson, not their practice, and the storm gates on mastery precisely because mastery is the evidence that the practice happened. The gate keys on `mastery`, never on `completion_status` or the derived build stage, which is exactly what keeps it correct when test-out moves those two and deliberately leaves `mastery` at 0.

**The write boundary does not move (INV-DIAG-1 intact).** The diagnostic **engine** still writes only `placement_estimate` and the immutable §2 records; it never writes `mastery` or `completion_status`. Build-without-lesson is realized **downstream**, by the city/mastery lane treating a passed placement as a legitimate completion trigger — so `mastery` keeps exactly one writer and §3's write-mapping is unchanged by this amendment.

> **Still owed by another owner, and NOT settled by this fold: Anthony's agreement to the production mastery-service completion trigger** for tested-out nodes (`docs/Contracts_Amendment_Diagnostic_TestOut_Unlock.md` §6(b)/§7, recorded outstanding in PR #106). In production the completion for a tested-out node must flow through the **mastery service he owns**; only the dev / in-memory session simulates it today. That is an implementation commitment rather than a ratification gate — which is why it blocked neither the ratification nor this fold — and it **remains open**.

---

## 2. Immutable assessment records (the marketed metric reads THESE, not §1)

The pre/post gain is NOT computed from mutable per-node state (a posttest would overwrite a pretest and the city could visually shrink). It is computed from append-only records.

### `assessment_administration`
One row per administered assessment sitting.

| field | type | meaning |
|---|---|---|
| `administration_id` | uuid | server-issued session id |
| `student_id` | uuid | from auth |
| `purpose` | enum | `pre` / `post` / `placement`. **Pre and post use the same adaptive blueprint + `scoring_model_version`, administered as a multistage adaptive test (MST); comparability comes from a shared difficulty-aware scoring model and counterbalanced parallel item pools, not identical fixed forms.** (Amended 2026-07-20; rationale in `docs/Contracts_Amendment_Adaptive_Diagnostic.md`.) |
| `form_id` + `form_version` | text/int | which parallel item pool was administered |
| `blueprint_version` | int | the assessment blueprint used |
| `scoring_engine_version` | int | scorer at time of computation |
| `scoring_model_version` | int | the adaptive frontier scoring model (distinct from the scorer). Pre and post MUST share it to be comparable. (Added 2026-07-20.) |
| `equivalence_checker_version` | int | symbolic-equivalence checker version |
| `routing_path` | jsonb | ordered stage ids served + scoring-model version, so the frontier score recomputes deterministically from immutable records (Assessment_Scoring_Spec §9). (Added 2026-07-20.) |
| `started_at` / `submitted_at` | timestamptz | |

### `assessment_item_response`
**One row per ITEM per administration** (NOT per node: the blueprint is ~2 items/node, so a per-node row could not store both responses). Immutable. The metric aggregates these item rows; any per-node or per-strand figure is derived from them, not stored as the primary record.

| field | type | meaning |
|---|---|---|
| `administration_id` | uuid | FK |
| `item_version_id` | text | immutable item-version snapshot (NOT the mutable item_id) |
| `node_id` | text | the node this item assesses (denormalized for easy aggregation) |
| `raw_answer` | jsonb | the student's actual response to THIS item |
| `item_definition_hash` | text | cryptographic hash of the item version; verify integrity without duplicating the answer key |
| `equivalence_checker_version` | int | checker version used for the authoritative recompute |
| `client_correct` | bool | client grader output. **NON-authoritative.** UX only. |
| `authoritative_correct` | bool | recomputed server-side from `raw_answer` + versioned key/equivalence-checker. The metric reads THIS. |
| `scoring_status` | enum | `correct`/`incorrect`/`invalid_input`/`unsupported_expression`/`scoring_error`. An application fault (last two) invalidates the response for review; it is NOT counted as wrong in the metric. |
| `reason_code` | text | why (drives feedback + authoring diagnostics) |

(An optional derived/materialized `assessment_node_summary` may be computed for convenience, but it is NOT the authoritative record; the item rows are.)

**Rules:**
- Append-only. A post administration creates NEW rows; it never mutates pre rows or `placement_estimate`.
- **Report aggregate gain** (overall + broad strands), NOT per-node and NOT per single-node domain (~2 items/node is too noisy). See Assessment_Scoring_Spec §5.
- Metric name: **"foundational assessment gain."**
- We do NOT claim measurement error cancels in pre-minus-post (form differences, guessing, regression-to-mean, differential attrition don't auto-cancel).

---

## 3. Write-mapping: who writes what, through which call

| source | may write | may NOT write | via |
|---|---|---|---|
| Diagnostic/Pretest (Gabe) | `placement_estimate` (once, from the pretest), `assessment_administration`/`assessment_item_response` | `mastery` | pretest doubles as placement (Assessment_Scoring_Spec §1); writes placement_estimate directly; never mastery |
| Lesson (Anthony) | `lesson_stage`, `last_practiced_at`; submits evidence | `mastery`, `placement_estimate`, `completion_status` directly | `submitAssessmentEvidence({context:"lesson", ...})` |
| Game/Storm (Evan) | `neighborhood_checkpoint_cleared` only (a progression flag) | `mastery`, `placement_estimate` | reads mastery; sets the checkpoint flag. Does NOT call `submitAssessmentEvidence` (storm is not a mastery evidence source) |
| Mastery service | `mastery`, `mastery_updated_at`, `completion_status` | | it is the ONLY mastery writer |
| Pre/post assessment run | `assessment_administration`, `assessment_item_response` | mutable state | append-only insert |
| Economy/Resource service (Gabe) — **post-MVP expansion** | `resource_wallet.balance`, `resource_grant_ledger` (append-only), `owned_cosmetic` (on purchase) | `mastery`, `placement_estimate`, `completion_status`, `neighborhood_state`, assessment records | authoritative grant + atomic spend (§8); service role only; grants idempotent on `event_id`; cosmetic-only, never gates progression |
| Game/Storm cosmetic-selection (Evan) — **post-MVP expansion** | `equipped_cosmetic` (cosmetic-selection only, over cosmetics already owned) | `resource_wallet.balance`, `resource_grant_ledger`, `owned_cosmetic`, `mastery`, `placement_estimate`, `neighborhood_state` | `equipCosmetic({cosmetic_id})`; RLS `with check` requires the row to exist in `owned_cosmetic` for `auth.uid()`; client can NEVER write a balance or grant a resource (§8) |

**The storm does not write or evidence mastery.** The earlier `confirmMasteryViaStorm(nodeIds, results)` is REMOVED, and the later "storm submits evidence" idea is also dropped (it created an undefined cross-context slot-accumulation problem and a ~30-response mega-battle for a 6-node neighborhood). MVP rule: node mastery comes only from lessons/confirmation sets via `submitAssessmentEvidence`. The storm reads mastery and controls one flag, `neighborhood_checkpoint_cleared`; it can only be cleared once all the neighborhood's required nodes are already mastered (>= 2). So a storm never masters an unfinished node. See Mastery_Scoring_Spec (Storm rule).

**Post-MVP expansion (cosmetic economy).** The two rows tagged *post-MVP expansion* above are additive and belong to the **Days 13-24 ranked expansion**, NOT the Day-12 MVP. They add a fourth authoritative writer (the economy service) plus one narrow client write (`equipped_cosmetic`). Like the storm, the economy READS progression but its writes never re-enter progression: resources and cosmetics never affect mastery, node completion, diagnostic/placement, or storm/checkpoint access. Full model, invariants, shared types, and APIs are in §8; detailed rationale in `docs/Contracts_Amendment_Cosmetic_Economy.md`.

---

## 4. Shared-component APIs (frozen stubs, Week 1)

Consumers build against these; owners fill implementation behind them. (The **post-MVP** economy service APIs — `grantResource`, `purchaseCosmetic`, `getWallet`/`getInventory`, `equipCosmetic` — are expansion-scope and live in §8, not part of the frozen Day-12 MVP stubs.)

### 4.1 Mastery service (the one mastery writer)

```ts
submitAssessmentEvidence(input: {
  student_id: uuid;          // ignored if present; taken from auth
  context: "lesson" | "diagnostic-practice";  // NOT storm (storm is not a mastery evidence source)
  node_id: string;           // the node this evidence bears on
  responses: Array<{
    item_id: string;
    item_version: number;
    template_id?: string;
    template_params?: object;
    raw_answer: unknown;      // NOT a correctness bool; the raw response
    hints_used: number;
    revealed: boolean;        // full answer shown -> counts as not-correct (Mastery_Scoring_Spec §4)
    attempt: number;
    time_on_item_ms: number;
    misconception_tag?: string; // resolved node misconception ID or "other"; feedback/analysis only, NOT a mastery input (Error_Typing_Spec)
  }>;
  evidence_id: string;        // idempotency key; duplicate submit = no-op
}): Promise<{
  node_id: string;
  mastery: 0 | 1 | 2 | 3;     // post-update value
  changed: boolean;           // did monotonic max raise it
  completion_status: "locked" | "in_progress" | "complete";
}>
```

Service behavior (authoritative, per Mastery_Scoring_Spec):
1. Recompute correctness server-side from `raw_answer` + versioned key/equivalence-checker (never trust a client bool).
2. Score the node's practice set: hints count as correct; `revealed:true` counts as not-correct (needs a fresh instance to recover the slot).
3. `mastery_evidenced` = 2 at >=80% (4/5), 3 at 100% (5/5), else 1.
4. `mastery = max(existing, evidenced)` (monotonic).
5. Update only this node; set `completion_status` from mastery; record `evidence_id` (idempotent).

### 4.2 Math input + answer check

The checker takes an IMMUTABLE item version and a checker version, never a mutable item id (so historical recomputation is exact regardless of later item edits). Answer-equivalence semantics live in Answer_Equivalence_Spec (currently v0.8; the D1 Node/Chromium candidate passes, but team fixture/grammar review remains before lock, and later categories are still provisional).

```ts
checkAnswer(input: {
  raw_answer: unknown;
  item_version_id: string;            // immutable snapshot, NOT the mutable item_id
  equivalence_checker_version: number;
}): {
  status: "correct" | "incorrect" | "invalid_input"
        | "unsupported_expression" | "scoring_error";
  reason_code: string;                // value_mismatch, form_mismatch, not_simplified,
                                      // wrong_representation, sign_error, missing_exclusion,
                                      // wrong_unit, parse_error, ...
  client_correct: boolean;            // UX only; server recompute is authoritative
  checker_version: number;
}
```

Rules (see Answer_Equivalence_Spec):
- The item's `AnswerSpec` (compositional: answer_type, equivalence, representation, simplification, required_form, required_notation, precision, unit_policy) lives in the immutable item-version record, NOT hardcoded in the checker.
- Client and server MUST call the SAME `equivalence_checker_version` for a given response; a mismatch is a logged error, never a silent pass.
- **Status vs metric:** `incorrect` counts as not-correct; `invalid_input` (malformed STUDENT input) is treated as unanswered (re-prompt), NOT wrong; `scoring_error`/`unsupported_expression` (an APPLICATION fault) must NOT count as wrong in the pre/post metric, it invalidates that response for review.
- The client verdict exists for immediate feedback; **server recomputation is authoritative for assessment reporting.**

### 4.3 Graphing widget

```ts
<GraphWidget
  mode="plot" | "read" | "manipulate"
  spec={GraphSpec}          // functions, points, domain/range, gridlines
  onInteract={(state) => void}
  onSubmit={(response: GraphResponse) => void}  // structured, NOT a bitmap
/>
```
SVG, self-contained, lessons/diagnostic only (never in the city canvas). Owned by Gabe; consumed by Anthony's lessons + diagnostic. The 6-node D1 MVP has no graph-response items. Later graph answers are scored by a **separate geometric comparator** (Answer_Equivalence_Spec §8), not `checkAnswer`: it matches sampled points within tolerance plus declared scored features (intercepts, vertex, asymptotes). The widget emits a structured `GraphResponse` (functions/points/transformations) so the comparator never touches pixels. Build and spike the comparator before the first Phase-2 graph item is authored.

### 4.4 State client

```ts
getNodeState(node_id): StudentNodeState
getDomainStates(domain): StudentNodeState[]
isDomainReady(domain): boolean   // GROUP BY ... HAVING count(mastered)=count(*)
// no realtime subscription: load-on-enter + refresh-on-explicit-event
```

---

## 5. Data isolation + integrity (Aurora / Postgres + AWS)

- **Infra split (see Architecture §7):** Aurora PostgreSQL Serverless v2 (reached over the RDS Data API) holds state, assessment records, and the response log; Amazon Cognito is the auth provider. The **authoritative scorer that computes `authoritative_correct` is an AWS Lambda** (running the same shared checker module as the client) — and the same Lambda is the sole DB caller for every read/write. **AWS S3** holds the item-bank assets and post-MVP work-upload photos. "Server-side recompute" throughout this doc means the Lambda scorer.
- Isolation is app-layer: the Lambda derives `student_id` from the verified Cognito JWT (never the payload) and scopes every query `WHERE student_id = :sub`, backed by a least-privilege DB role that owns no tables and holds only the required DML. The browser never connects to the DB. (RLS-via-session-GUC is an optional future second layer.)
- `assessment_item_response` and the raw-response log are **INSERT-only** (no UPDATE/DELETE), written only by the server; `student_id` is taken from the verified token, not the payload.
- `mastery` is writable only by the mastery service role, not by client engines directly (enforced, not just conventional).
- Idempotency: `evidence_id` and `response_id` dedupe replays.

### 5.1 Account subject and lifecycle boundary (ratified 2026-08-08)

- The account product is direct-to-consumer Cognito email self-sign-up with email verification.
- Exact `/demo` is not an account. It initializes no Cognito/API client, sends no auth/API request,
  stores only under `cr.demo.*`, and can never import or claim account state.
- Every account request derives immutable `student_id` from the cryptographically verified Cognito
  access-token `sub`. A body, path, query, browser UUID, email, or demo key can never select it.
- Slice 1 establishes that subject boundary but adds no account row or persistence claim. Slice 2
  adds the opaque `learner_account` bootstrap keyed by verified `sub`; email remains in Cognito.
- Account lifecycle status is server-owned: `active | deletion_pending`. A deletion request changes
  access to disabled immediately and starts a 30-day recovery window. Recovery may restore `active`
  during that window. After it expires, the lifecycle worker permanently purges learner-owned rows
  and work-upload objects before removing/disabling the Cognito principal.
- Slice 1 intentionally has no deletion UI or endpoint. A local token clear, hidden button, or
  client-authored status is not account deletion.

---

## 6. Code organization (merge safety)

- `shared/state-schema`: the §1/§2 types. ONE module, imported everywhere. Never duplicated per engine (silent divergence is worse than a conflict).
- `shared/mastery-service`: the §4.1 interface + implementation. Only writer of `mastery`.
- `shared/components`: graph widget, math input/checkAnswer, state client (frozen APIs, §4).
- `shared/skill-graph/`: nodes + edges, one file per domain for edges/items so two authors never touch the same file.
- `engines/diagnostic` (Gabe), `engines/lesson` (Anthony), `engines/game` (Evan): disjoint by construction.
- Short-lived branches off a daily integration branch; the disjoint-files layout means most branches never collide.

---

## 7. What changed from v1 (for the team)

- `confirmMasteryViaStorm` is GONE. One mastery service fed by lessons/confirmation sets via `submitAssessmentEvidence`. The storm is checkpoint-only (sets `neighborhood_checkpoint_cleared`), never a mastery writer or evidence source.
- `diagnostic_estimate` renamed to `placement_estimate`; explicitly immutable, explicitly not mastery.
- Mastery is now accuracy-based (4/5), NOT the old "cleared a difficulty-2 item" rule. Difficulty tags shape set composition, not the gate. See Mastery_Scoring_Spec.
- The pre/post metric reads immutable `assessment_administration`/`assessment_item_response`, never mutable per-node state. Aggregate gain, not per-node.
- `client_correct` is explicitly non-authoritative; server recompute (`authoritative_correct`) is the record.
- `completion_status` (derived from mastery) replaces relying on `lesson_stage`; `source_of_last_change` replaced by field-specific timestamps.
- `checkAnswer` now takes `item_version_id` + `equivalence_checker_version` (not a mutable item id) and returns a status enum, not a bare bool. Item scoring config is a compositional `AnswerSpec` on the immutable item version, not hardcoded. See Answer_Equivalence_Spec (v0.8).
- Application scoring faults (`scoring_error`/`unsupported_expression`) never count as wrong answers in the pre/post metric; only genuine `incorrect` does. Malformed student input is `invalid_input` (unanswered), not wrong.
- Graph answers are scored by a separate geometric comparator, not `checkAnswer`; graph categories are Phase-2 work and do not block the D1 MVP checker.
- Answer_Equivalence_Spec is v0.8, freeze-blocked per category on browser/server capability spikes. Lock the D1 arithmetic categories first; later symbolic and graph categories remain gated until their probes pass.
- **Error typing (capability deferred post-MVP, 2026-07-20):** the raw-response log and `submitAssessmentEvidence` responses still carry an **optional, nullable** `misconception_tag` (a per-node misconception ID or `other`). It is feedback/analysis metadata, NOT an input to mastery or the pre/post metric, and now **optional to populate** — the misconception vocabulary, distractor/item tagging, and error-typed feedback are deferred to post-MVP (granular lessons + adaptive-diagnostic descent already localize failures). The field is retained so the capability switches on later without a schema change. See Error_Typing_Spec.
- **Cosmetic economy amendment (ratified 2026-07-20, post-MVP expansion).** An all-hands-ratified, additive cosmetic economy is now recorded in §8: new economy write-mapping rows in §3, invariants INV-COS-1..5, new shared types, and grant/spend/equip APIs. It is a **Days 13-24 ranked-expansion** addition and does NOT change the frozen Day-12 MVP contract (§1–§6). Resources and cosmetics are **one-way and purely cosmetic** — they never affect mastery, node completion, placement/diagnostic, or storm/checkpoint access. Detailed rationale: `docs/Contracts_Amendment_Cosmetic_Economy.md`.
- **Adaptive diagnostic amendment (ratified 2026-07-20, MVP scope).** The diagnostic is now a multistage adaptive test scored on a difficulty-aware ability frontier `θ` (not raw percent), so it stays pre/post-comparable while covering the map efficiently via prereq-graph routing/inference. Updated the §2 `assessment_administration.purpose` wording and added the additive `scoring_model_version` + `routing_path` fields; invariants INV-DIAG-1..5 preserve the mastery firewall (diagnostic writes only `placement_estimate`) and the metric-from-answered-items-only rule (graph inference seeds the city, never `θ`). Supersedes Assessment_Scoring_Spec §3/§5. Detailed rationale: `docs/Contracts_Amendment_Adaptive_Diagnostic.md`.
- **Lesson unit + placement routing clarification (2026-07-21, terminology/read-relationship, no schema change).** The lesson unit is **per node (1 node = 1 lesson = 1 building)**; the old fold-in "lesson shell" is replaced by the **interaction archetype** (a reusable lesson-interaction template shared across nodes' lessons for build savings, invisible to the student). `placement_estimate` is a **lesson entry-point router** (high placement skips teaching → straight to the "prove it" practice), never an outcome — the building is always earned by evidence, nothing is pre-built. No §1/§2 field or write-mapping changed. Registry field `lesson_shell` → `lesson_archetype` is a tracked code migration.
- **Diagnostic test-out unlock amendment (proposed 2026-07-23 — RATIFIED 2026-07-26 by Gabe as diagnostic-lane owner and team tie-break; Evan ACK'D 2026-07-26, Anthony did not ack — the two boxes in his lane were carried by the tie-break, not by his signature — and FOLDED IN 2026-07-26).** Expands the diagnostic→building model: any node resolved **`passed`** (`placement_estimate >= 2`, **measured OR graph-inferred**) unlocks its building for immediate placement **without the lesson** (build-without-lesson / test-out) — completing at **`mastery` 0**, so the practice still earns every star and the storm's `mastery >= 2` gate stays correct; only **failed/unresolved** nodes (`placement_estimate <= 1`) still require the lesson. **The normative text is now §1.1**, with the §1 `placement_estimate` / `completion_status` rows and the placement/mastery + completion invariants amended in place; the amendment doc is the rationale/detail record and **§1.1 wins on conflict**. This partially supersedes the §1 "placement never pre-builds / never equal by construction" invariants (for passed nodes only) and `Contracts_Amendment_Adaptive_Diagnostic_v2` §4.4, while **preserving INV-DIAG-1** — the diagnostic engine still writes only `placement_estimate`, and §3's write-mapping is untouched. **Still open, deliberately visible:** Anthony's agreement to the production mastery-service completion trigger (that doc's §6(b)/§7). Rationale (downward-closure over the prereq DAG makes forcing a prerequisite's lesson contradictory) + detail: `docs/Contracts_Amendment_Diagnostic_TestOut_Unlock.md`.

---

## 8. Cosmetic economy (post-MVP ranked expansion — ratified 2026-07-20; **SUPERSEDED 2026-08-03**)

> **⚑ SUPERSEDED 2026-08-03 — THE COSMETIC ECONOMY IS SUNSET AND THIS SECTION IS NO LONGER TO BE BUILT.**
>
> Team lead: *"sunset the cosmetic shop and xp systems completely - they dont really have a role in our game. remove it from the interface and it shouldnt really have any implications anywhere."*
>
> Everything below is kept as the ratified record of a decision that was taken and has now been reversed; **nothing in it is a live instruction.** The five §8.2 tables must not be built, the five §8.3 shared types must not be added to `packages/shared-state-schema`, and the four §8.4 APIs must not be written. `db/migrations/0007_sunset_cosmetics_and_xp.sql` removes the parts of §8 that `0004` had built (`equipped_cosmetic`, the ledger's `cosmetic_id` column, the `xp` enum member and the two CHECKs about them).
>
> **THREE THINGS SURVIVE §8 AND ARE STILL NORMATIVE**, because they were never about cosmetics:
> - **INV-COS-1 (one-way)** — no economy field is an input to a progression decision. It is about the DIRECTION of the dependency edge, and the era-material economy is still on the far side of it. `packages/economy/src/one-way-invariant.test.ts` enforces it.
> - **INV-COS-4 (server-authoritative)** — a client never mints or writes a balance. The era material is granted by rules the client only reports events to.
> - **INV-COS-5 (reconstructable ledger)** — `balance == sum(grants) - sum(spends)`, never negative. `resource_grant_ledger` is what it is stated over, and it is untouched: the ten era materials, the append-only rows, and the derived balances are how buildings get paid for.
>
> INV-COS-2 and INV-COS-3 are about a catalogue and an `effect_class` that no longer exist. The multi-resource amendment noted below is likewise still normative for the ledger, minus its cosmetic column.

*__Expansion-scope, NOT part of the frozen Day-12 MVP (§1–§6).__* This section folds in the all-hands-ratified cosmetic-economy amendment as a real part of the contract for the **Days 13-24 ranked expansion**. It is purely additive — new tables, new shared types, a new economy service, and one narrow client write — and touches nothing in §1/§2 and gates nothing. The normative content now lives here; `docs/Contracts_Amendment_Cosmetic_Economy.md` remains the detailed rationale/DDL/approval record.

**HARD INVARIANT (one-way, purely cosmetic):** earned resources and purchased/equipped cosmetics have **no read path into any progression, mastery, assessment, or storm decision**. They cannot gate, accelerate, unlock, or slow learning progression or storm/checkpoint eligibility. Grants are server-side/authoritative; the client can never mint, adjust, or write a balance — it may only select/equip cosmetics it already owns.

> **⚑ AMENDED 2026-07-31 — the ledger is MULTI-RESOURCE, and §8.2 builds two tables, not five.** `docs/Contracts_Amendment_Economy_Multi_Resource_Ledger.md` is normative over §8.2 and over INV-COS-4's table list; the invariants, the ownership split and §8.4's APIs below are unchanged. In short: the ledger's primary key is `(student_id, event_id, resource_type)` rather than `event_id` alone (one lesson completion writes two rows under one event id, which the `event_id` key structurally forbids); a `resource_type` enum and an `era_id` column are added to the row; and `resource_wallet`, `owned_cosmetic` and `cosmetic_catalog` are **not built** because all three are derived or already ship in code. Built by `db/migrations/0004_civilization_state.sql`.

### 8.1 Invariants (INV-COS)

Each must remain true by construction:
- **INV-COS-1 (one-way):** no economy field is an input to any progression decision. The mastery service, diagnostic engine, and `isNeighborhoodReady()` import NOTHING from the economy module (enforceable as a dependency-graph/lint test).
- **INV-COS-2 (storm access unchanged):** storm eligibility is a pure function of mastery only ("all the neighborhood's required nodes mastered (>= 2)" per §1/§3); wallet balance and inventory are never inputs.
- **INV-COS-3 (cosmetic-only outcome):** every catalog item's effect is cosmetic (`effect_class = 'cosmetic'`). Spending resources can only produce a cosmetic — no consumables that touch progression, no "skip", no hint pack that feeds mastery evidence.
- **INV-COS-4 (server-authoritative grants):** no client role holds INSERT/UPDATE on `resource_wallet` or `resource_grant_ledger`; all balance changes flow through the economy service. *(2026-07-31: two of those nouns move and the invariant gets stronger. There is no `resource_wallet` — every balance is a projection over the ledger — and `app_service`, the only DB caller, holds `select, insert` on `resource_grant_ledger` with **no `update` and no `delete`**, so the ledger is append-only against the service role itself. See the amendment.)*
- **INV-COS-5 (non-negative, monotone ledger):** `balance == sum(grants) - sum(spends)`, never negative; a spend is rejected on insufficient balance (atomic, §8.4).

**Boundary statement:** the economy service is a *sink* of progression events (it may READ mastery/checkpoint events to decide grants) and a *source* of cosmetics only. There is no edge from wallet/cosmetics back into `student_node_state`, `neighborhood_state`, or the assessment tables. `engines/game` continues to write ONLY `neighborhood_state.checkpoint_cleared` (§1); the economy tables are written by the economy service, not the game client.

### 8.2 New tables (expansion; row-level-secured on `student_id`)

Additive tables following §1/§5 conventions: snake_case names, `student_id uuid references auth.users` with `student_id` from `auth.uid()` (never payload), RLS enabled, clients `revoke all` then narrowly `grant`, append-only ledgers INSERT-only for clients, authoritative fields service-role-only. Illustrative DDL is in the amendment doc; no Day-12 MVP migration is changed.
- `resource_wallet` — one balance row per student (`balance bigint not null default 0 check (balance >= 0)`); service-role-authoritative; read-own, no client write.
- `resource_grant_ledger` — append-only, idempotent on `event_id` (primary key); `balance = sum(grant) - sum(spend)`; read-own, no client write.
- `cosmetic_catalog` — reference/config of purchasable cosmetics; `effect_class` is `cosmetic` by type (exhaustive enum); active rows readable by authenticated users.
- `owned_cosmetic` — cosmetics the student has purchased; written by the economy service on an atomic spend; read-own, no client write.
- `equipped_cosmetic` — the student's current cosmetic selection; the ONLY client-writable economy table (INSERT/UPDATE restricted to cosmetics already in the student's `owned_cosmetic`).

### 8.3 New shared types (extends `packages/shared-state-schema`; expansion)

Consistent with §1/§2 naming (snake_case wire fields, `UUID`/`ISODateTime` aliases, interfaces mirroring table rows):

```ts
export type ResourceAmount = number;                 // non-negative integer (bigint on the wire)
export type EconomyTxnKind = "grant" | "spend";
export type CosmeticEffectClass = "cosmetic";        // exhaustive: the economy can only produce cosmetics

export interface ResourceWallet {
  student_id: UUID;
  balance: ResourceAmount;                           // >= 0, service-authoritative
  updated_at: ISODateTime;
}

export interface ResourceGrantLedgerEntry {
  event_id: string;                                  // idempotency key; duplicate = no-op
  student_id: UUID;
  kind: EconomyTxnKind;
  amount: ResourceAmount;                            // always positive; kind carries the sign
  reason_code: string;                               // 'node_mastered' | 'checkpoint_cleared' | 'purchase:<id>' | ...
  cosmetic_id: string | null;                        // set on spend, null on grant
  created_at: ISODateTime;
}

export interface CosmeticItem {
  cosmetic_id: string;
  display_name: string;
  cost: ResourceAmount;
  effect_class: CosmeticEffectClass;                 // always "cosmetic"
  category: string;                                  // 'building_skin' | 'neighborhood_decor' | ...
  is_active: boolean;
}

export interface OwnedCosmetic {
  student_id: UUID;
  cosmetic_id: string;
  acquired_at: ISODateTime;
  acquired_via_event_id: string;                     // FK to the ledger spend that granted ownership
}

export interface EquippedCosmetic {
  student_id: UUID;
  slot: string;                                      // 'building:NUM.S' | 'neighborhood:D1' | ...
  cosmetic_id: string;                               // must be in the student's OwnedCosmetic set
  equipped_at: ISODateTime;
}
```

### 8.4 Economy service APIs (extends §4; owner: Gabe)

Like the mastery service, `student_id` is taken from auth and ignored if present in the payload. All writes are authoritative; the client calls these and does not write the tables directly (except the equip path, which is an ordinary RLS-guarded client write).

```ts
// 8.4.1 Authoritative grant. Server-side only, idempotent by event_id. The client
// NEVER calls this to mint resources; earn triggers are server-verified progression
// events (node mastered, checkpoint cleared) and the service decides the grant.
grantResource(input: {
  student_id?: UUID;         // ignored; taken from auth/service context
  event_id: string;          // idempotency key (e.g. mastery evidence_id or checkpoint event id)
  amount: ResourceAmount;    // > 0
  reason_code: string;       // 'node_mastered' | 'checkpoint_cleared' | ...
}): Promise<{
  balance: ResourceAmount;   // post-grant balance
  applied: boolean;          // false if event_id already seen (idempotent no-op)
}>

// 8.4.2 Spend / purchase. ATOMIC: debit balance + credit ownership in ONE transaction.
// Rejects on insufficient balance (no partial state). Idempotent by event_id.
purchaseCosmetic(input: {
  student_id?: UUID;         // ignored; taken from auth
  event_id: string;          // idempotency key for the purchase attempt
  cosmetic_id: string;       // must exist and be is_active in cosmetic_catalog
}): Promise<{
  status: "purchased" | "already_owned" | "insufficient_balance" | "unknown_cosmetic";
  balance: ResourceAmount;   // post-transaction balance
  owned: boolean;            // true iff the student now owns the cosmetic
}>

// 8.4.3 Read wallet + inventory (read-own; RLS-backed).
getWallet(): Promise<ResourceWallet>
getInventory(): Promise<{
  owned: OwnedCosmetic[];
  equipped: EquippedCosmetic[];
  catalog: CosmeticItem[];   // active catalog, for the store UI
}>

// 8.4.4 Equip (cosmetic-selection only). Ordinary client write, RLS-guarded:
// only cosmetics already in owned_cosmetic can be equipped. Touches NOTHING in
// progression, mastery, or storm state.
equipCosmetic(input: {
  slot: string;
  cosmetic_id: string;       // must be in the caller's owned_cosmetic
}): Promise<EquippedCosmetic>
```

**Idempotency & atomicity:** `grantResource` is idempotent on `event_id` (ledger PK) — a replayed grant is a no-op (`applied: false`). `purchaseCosmetic` is atomic — within one DB transaction it verifies `balance >= cost`, inserts a `spend` ledger row, decrements `resource_wallet.balance`, and inserts `owned_cosmetic`; insufficient balance rolls the whole transaction back and returns `insufficient_balance` with the balance unchanged — and idempotent on `event_id` so a retried purchase neither double-charges nor double-grants. `resource_wallet.balance` stays `>= 0` (DB check) and equals `sum(grant) - sum(spend)`.

### 8.5 RLS + integrity (extends §5; expansion)
- Read-own on `resource_wallet`, `resource_grant_ledger`, `owned_cosmetic`, `equipped_cosmetic`; `cosmetic_catalog` active rows readable by authenticated users.
- **No client INSERT/UPDATE** on `resource_wallet`, `resource_grant_ledger`, or `owned_cosmetic` — service role only (INV-COS-4).
- Client INSERT/UPDATE on `equipped_cosmetic` **only** for a `cosmetic_id` already present in the student's `owned_cosmetic`; `student_id` comes from `auth.uid()`, never payload.

**Ownership (per OWNERS.md):** **Gabe** owns the shared types (`packages/shared-state-schema`), the tables/RLS/migrations, and the economy service APIs. **Evan** owns the game-side consumption: surfacing server-verified earn triggers to the service, the store/cosmetic UI, and `equipCosmetic` selection.
