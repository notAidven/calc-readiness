# XP + Gold Economy — Implementation Plan (phased, executable)

**Status:** PLAN. Sequencing + risk only. **The design is settled elsewhere — this
plan does not redesign it.** It sequences the build of the settled resource model
onto the real stack and flags the genuine gaps the specs left open.

**Design of record (do not re-litigate here):**
- `docs/superpowers/specs/2026-07-25-resource-model-xp-gold-design.md` — resource model (D-R1..D-R10)
- `docs/superpowers/specs/2026-07-25-town-hall-design.md` — hub that launches interleaved practice (D-TH1..D-TH10)
- `docs/superpowers/specs/2026-07-25-island-decay-and-gold-design.md` — parent loop
- `docs/superpowers/specs/2026-07-25-townhall-resource-decision-brief.md` — triage/rationale
- `docs/Contracts.md` §2/§3/§5/§8 + `docs/Contracts_Amendment_Cosmetic_Economy.md`
- `docs/Mastery_Scoring_Spec.md` (mastery monotonic; no decay)
- `docs/superpowers/specs/Game_Architecture_Blueprint.md` §4 (frozen module boundaries)

**Grounded stack (verified in code, not assumed):**
- `db/migrations/0001..0003*.sql` — plain Postgres for Aurora, **no RLS**, composite `(student_id, …)` PKs, `create type … as enum`, `generated always as … stored`, column-scoped `grant … to app_service`, heavy `comment on`. Next file is `0004_`.
- `db/apply.mjs` — **the migration runner already exists** (see §"Migration reality").
- `packages/db/src/data-api.ts` — `createDataApiClient` → `query` / `execute` / **`withTransaction`** / **`json()`** (the atomic + idempotent primitive; no new infra needed).
- `services/diagnostic-api/src/{app,env,lambda,node,reads}.ts` + `esbuild.config.mjs` + `package.json` — the exact Lambda template `services/economy-api` mirrors.
- `apps/web/src/api.ts` — `apiBaseUrl()` (from `VITE_DIAGNOSTIC_API_URL`), `isServerBacked(hasCognitoAuth)` (needs **both** auth AND a URL), `apiGetJson()`. *(Since `#373` there is an `apiPostJson()` beside it, which is what a sub-scoped write goes through.)*
- `apps/web/src/city/citySession.ts` (`createCityDevSession`) — the in-memory session to mirror; `apps/web/src/work-upload/store.ts` — precedent for an in-memory adapter behind `isServerBacked` that becomes server-backed later.
- `apps/web/src/App.tsx` — where in-memory vs server load is selected. *(Read at 2026-07-25 as `authedCity && base ? loadCityFromApi : session.load`. `#373` moved the branch one level up: `loadCity` is now always the session's own read, and it is the SESSION that is chosen by identity — `apiCity ?? devSession`, where the API-backed one hydrates from `GET /api/city` and mirrors to `POST /api/city`. Same axis, one object instead of two.)*
- `packages/shared-state-schema/src/index.ts` — a single **frozen** file, §1/§2 types only, **no economy types** (Blueprint §4 forbids them; owner Gabe).
- **Confirmed absent:** `packages/economy`, `services/economy-api`, any `resource_*` table.

**Lane owners (OWNERS.md + resource spec §8.6/§11.4):** **Gabe** — `packages/economy`
core, shared wire types, migration `0004`, `services/economy-api`, infra. **Evan** —
game-side consumption: HUD, shop UI, Town Hall surface, `equipCosmetic` call, the
in-memory dev adapter, surfacing earn triggers. **Anthony** — interleaved session
composition/grading (the row-2 clear + post-MVP anti-farm signal) and the lesson-side
of the `NUM.S → City Bank` rename.

---

## TL;DR — phase list (one line each)

| # | Phase | Demonstrably true when it lands | Owner | Depends on |
| - | --- | --- | --- | --- |
| 0 | **Governance / unfreeze (docs)** | The frozen-schema unfreeze is announced; Blueprint §4, OWNERS.md, Contracts §8 are updated to permit + own the economy packages | Gabe | — (∥ P1) |
| 1 | **`packages/economy` pure core (zero I/O)** | Idempotent grant + atomic spend + event-id scheme + XP curve + rolling cap + catalog + condition math exist as **unit-tested pure functions** — no DB, no network | Gabe | — (∥ P0) |
| 2 | **In-memory adapter + HUD + shop (`apps/web`)** | `npm run dev` shows gold + XP level, grants on lesson-complete, and an atomic gold purchase — **all on the real core, no backend** | Evan | P1 |
| 3 | **Shared wire types in `@cr/state-schema`** | The two-resource, composite-key economy types are exported and both adapters compile against them (frozen edit lands) | Gabe | P0 |
| 4 | **Migration `0004_economy.sql`** | `node db/apply.mjs` applies the economy tables (no-RLS, composite PKs, XP-never-spent CHECK, timestamp-only condition) idempotently | Gabe | P3 |
| 5 | **`services/economy-api` Lambda (Aurora)** | Cognito-verified, sub-scoped grant/spend/read/equip over Aurora via `withTransaction`, calling the **same** core | Gabe | P1, P3, P4 |
| 6 | **Deploy wiring (infra) + web server switch** | `EconomyFn` is deployed behind `/api/*`; the web app flips to the server economy client, fail-closed | Gabe + Evan | P4, P5 |
| 7 | **Earn triggers + cap enforcement + INV-COS-1 guard** | Real grants fire from server-verified progression (rows 1/3) + interleaved clear (row 2), cap-bounded; a dependency-lint proves the one-way invariant | Gabe + Anthony + Evan | P5 (+ Anthony) |

**Recommended first slice = P1 + P2** (pure core + in-memory demo). See §"First slice".

---

## Migration reality (what actually exists for applying `db/migrations/*`)

There **is** a runner; do not assume otherwise. `db/apply.mjs`:
- Runs over the **RDS Data API** (no VPC, no psql), admin secret runs DDL.
- Tracks applied files in a `public.schema_migrations` table; **skips already-applied**, applies pending in lexical order, **one transaction per file** (all-or-nothing).
- Bootstraps the least-privilege `app_service` role (idempotent) before the ordered files, so `grant … to app_service` in the migration resolves.
- Splits each file into statements (`splitSqlStatements`, unit-tested) because the Data API runs one statement per call.
- Env: `DB_CLUSTER_ARN`, `DB_NAME`, `DB_ADMIN_SECRET_ARN`, `DB_APP_SERVICE_SECRET_ARN`.
- Invoked manually post-deploy: `node db/apply.mjs` (no npm script; CDK outputs supply the ARNs — `infra/lib/calc-readiness-stack.ts`).

**The real unknown is operational, not architectural:** `0004` will be the **first
migration applied since initial provisioning** (0001–0003 are the greenfield set).
Nobody has run `apply.mjs` for an *additive* file against a live cluster yet. That is
a deploy-time risk (§Risks R2), mitigated by a throwaway-DB dry run; the runner
itself is idempotent + per-file transactional, so a bad `0004` rolls back cleanly and
leaves `schema_migrations` unchanged.

---

## Phase 0 — Governance / unfreeze (docs-only; unblocks P3)

**Demonstrably true:** the deliberate unfreeze of `@cr/state-schema` for economy
types is announced and recorded; the docs that currently *forbid* or *mis-own* the
economy no longer contradict the build.

**Why it's a phase:** `Game_Architecture_Blueprint.md` §4 states **"No economy types
in `@cr/state-schema`"** and lists wallet/ledger types as forbidden in `@cr/game`;
`OWNERS.md` + `Contracts.md` §8 / amendment §9 name Gabe as owner of a **single-balance,
RLS** model that the settled design supersedes. Per the cross-lane change policy
(OWNERS.md), a frozen-interface change is **owner-gated** and must be documented in
the **PR + work log + spec** — a `packages/*` schema break is exactly that.

**Checklist:**
- [ ] `Game_Architecture_Blueprint.md` §4 — carve the exception: economy wire types are permitted in `@cr/state-schema` as the ratified §8 expansion; the persistent economy rules core lives in **new `packages/economy`** (not `@cr/game`); `@cr/game` still holds no wallet/balance types.
- [ ] `OWNERS.md` — add rows for **`packages/economy`** (Gabe) and **`services/economy-api`** (Gabe); note the economy-types unfreeze under the post-MVP cosmetic-economy section.
- [ ] `docs/Contracts.md` §8.3 + `docs/Contracts_Amendment_Cosmetic_Economy.md` §5 — mark the single-`balance` / single-column-`event_id` / RLS shapes **superseded** by the two-resource, composite-key, no-RLS shapes in the resource spec §8 (invariants survive; mechanics change). See §Gaps G3.
- [ ] `TEAM_CHECKLIST.md` — track (a) the unfreeze announcement and (b) the `NUM.S → City Bank` coordinated rename, mirroring the existing `lesson_shell → lesson_archetype` cross-lane follow-up entry.
- [ ] Post the unfreeze announcement (owner-gated, not full all-hands, per the policy); record in `work-log/gabe.md`.

**Proof:** docs review; `npm run check` still green (docs-only). **Parallel with P1.**

---

## Phase 1 — `packages/economy` pure rules core (zero I/O) ← the pure core first

**Demonstrably true:** the two most bug-prone operations — **idempotent grant of a
resource set** and **atomic spend with insufficient-balance rejection** — plus the
deterministic event-id scheme and the island-condition/stage math exist as **plain
unit-testable functions before any DB or network exists** (plan requirement #3).

**New package `packages/economy/` (framework-free, like `@cr/game`):**

```text
packages/economy/
  package.json            # @cr/economy; no UI/DB/network deps
  tsconfig.json
  src/
    index.ts
    resources.ts          # ResourceType 'xp'|'gold'; CosmeticDescriptor registry + validatePurchasable
    events.ts             # deterministic event_id builders (resource spec §6 shapes)
    grant.ts              # applyGrant(state, input) -> { balances, ledgerRows, applied }
    spend.ts              # applySpend(state, input) -> { status, balances, ledgerRows }
    levels.ts             # xpLevel(xp) + level titles (XP->level curve)
    cap.ts                # rolling-window cap; row-2 only (D-R6)
    condition.ts          # conditionAt(now,lastRestoredAt) + repairScale(condition)
    constants.ts          # §12 tuning table (earn magnitudes, curve, cap window/size, prices, decay)
    *.test.ts
```

**Public interface (planned signatures — authoritative shapes live in resource spec §8.4/§8.5):**

```ts
// Pure, storage-agnostic. Both adapters (Lambda + in-memory) call THESE.
export type ResourceType = "xp" | "gold";
export function buildEventId(kind: "lesson_complete"|"interleaved"|"star", parts: Record<string,string>): string;
export function applyGrant(state: LedgerView, input: GrantInput): GrantResult; // idempotent on event_id; two rows under one id
export function applySpend(state: LedgerView, input: SpendInput): SpendResult; // reject on insufficient gold; XP never debited
export function xpLevel(totalXp: number): { level: number; title: string; toNext: number };
export function withinCap(window: LedgerView, add: number): boolean;             // repeatable (row 2) only
export function conditionAt(nowMs: number, lastRestoredMs: number): number;      // visual-only condition
export function repairScale(condition: number): number;                         // need-scales row-2 repair gold
export const COSMETIC_CATALOG: readonly CosmeticDescriptor[];                    // gold OR xp_prestige, never both
```

**Tests prove (the correctness gates):**
- [ ] Grant idempotency — replay of the same `event_id` is a no-op (`applied:false`), no double-credit.
- [ ] Two-row grant — one `lesson_complete` event writes **xp + gold** under one `event_id` atomically (D-R9).
- [ ] Atomic spend — insufficient gold rejects with **balance unchanged**, no partial state (INV-COS-5).
- [ ] `balance = sum(grants) − sum(spends) ≥ 0` per `(student, resource)`; **XP is never debitable** (spend of xp is impossible by type + guard).
- [ ] Cap covers **row 2 only** (its gold + XP); rows 1/3 uncapped (D-R6).
- [ ] Condition decay is monotone in elapsed time with a floor; `repairScale` = 0 at pristine (§7 layer 3).
- [ ] Catalog validation — an item is gold-purchasable **xor** xp-prestige; price/level read from the descriptor, never a payload.

**Owner:** Gabe. **No dependency on P0** (new package, touches nothing frozen). **Strictly parallel with P0.**

---

## Phase 2 — In-memory adapter + minimal HUD + shop (`apps/web`) ← first DEMO slice

**Demonstrably true:** with `npm run dev` (no auth, no network, no Aurora) the HUD
shows **gold + XP level**; a dev lesson-complete grants XP+gold through the **real
`@cr/economy` core**; the shop lists the code catalog and a gold purchase **debits
atomically** and shows the cosmetic owned; XP-prestige items are granted at
milestones — all behind the existing `isServerBacked` gate, mirroring
`citySession.ts` / `work-upload/store.ts`.

**Checklist / files:**
- [ ] `apps/web/src/economy/economyClient.ts` — the `EconomyClient` interface **both** adapters satisfy (`getWallet`, `getInventory`, `purchaseCosmetic`, `equipCosmetic`, the internal grant surface) + the `isServerBacked`-based selector.
- [ ] `apps/web/src/economy/economySession.ts` — in-memory adapter mirroring `createCityDevSession`: wallet/ledger/owned/equipped `Map`s, all Promise-returning, delegating rule math to `@cr/economy`.
- [ ] HUD: extend the always-on HUD (`apps/web/src/city/`, reuse `HudIcon.tsx` + `announcements.ts`) — labelled **"Gold: N"** + **"Level N · <title>"** progress meter; reward arc reduced-motion-aware (`City_Art_Bible.md` §6); **DOM-first, never colour alone** (resource spec §9).
- [ ] `apps/web/src/economy/Shop.tsx` — DOM-accessible catalog + buy/equip; **no optimistic spend** (balance/ownership change only after the call resolves).
- [ ] Wire into `App.tsx` / `CitySurface.tsx` alongside the existing session selection.

**Tests prove:**
- [ ] Dev grant/spend/equip flow through the real core (reuse P1's guarantees end-to-end).
- [ ] HUD renders labelled gold + XP level (accessibility: word labels, not colour).
- [ ] No optimistic UI; fail-closed on a rejected purchase.
- [ ] The economy surface **never gates** a lesson or storm launch (INV-COS-1 at the UI).

**Owner:** Evan, on Gabe's P1 core. **Depends on P1.**

---

## Phase 3 — Shared wire types in `@cr/state-schema` (the frozen edit)

**Demonstrably true:** `@cr/state-schema` exports the **two-resource, composite-key**
economy wire types (resource spec §8), superseding the stale §8 single-balance shapes;
the dev adapter (P2) and the future service (P5) compile against them.

**Checklist:**
- [ ] `packages/shared-state-schema/src/index.ts` (+ `index.test.ts`) — add `ResourceType` (`'xp' | 'gold'`), `EconomyTxnKind`, and the wallet / ledger-entry / owned / equipped / cosmetic-descriptor wire types per resource spec §8.1–8.4.
- [ ] Repoint `@cr/economy` + the dev adapter to import the shared types.
- [ ] Test asserts `ResourceType` is exactly `'xp' | 'gold'` (two, no more).

**Owner:** Gabe. **Depends on P0** (announcement). **Recommended after P1/P2** so the
shapes are validated in-memory before the frozen file is edited (de-risks the unfreeze).

---

## Phase 4 — Migration `0004_economy.sql` (first economy migration)

**Demonstrably true:** `node db/apply.mjs` applies `0004_economy.sql` idempotently
(recorded in `schema_migrations`), creating the economy tables in the **0001 style**:
plain Postgres, **no RLS**, composite PKs, XP-never-spent CHECK, timestamp-only
condition state, column-scoped `app_service` grants, heavy `comment on`. **Catalog is
NOT a table** (code descriptors, §8.4).

**Checklist (DDL authored to mirror `0001_core_contracts.sql`; illustrative shapes in resource spec §8.1–8.3):**
- [ ] `create type public.resource_type as enum ('xp','gold');` + `economy_txn_kind`.
- [ ] `resource_wallet (student_id, resource_type, balance ≥ 0, …)` — composite PK.
- [ ] `resource_ledger` — **composite PK `(student_id, event_id, resource_type)`** (D-R5); `check (kind='grant' or resource_type='gold')` (XP never spent); `check ((kind='spend') = (cosmetic_id is not null))`.
- [ ] `island_condition_state (student_id, island_id, last_restored_at)` — **timestamp only** (D-R7); condition derived from descriptors, never stored.
- [ ] `owned_cosmetic`, `equipped_cosmetic` — per-student state (no `cosmetic_catalog` table).
- [ ] Least-privilege grants: `app_service` gets only the DML the service issues (select + insert on ledger/owned; select + insert/update on wallet + condition + equipped); it owns no tables.
- [ ] `comment on` every table/non-obvious column.
- [ ] **No change to `apply.mjs`** — it already picks up new files.

**Proof:** `splitSqlStatements` unit stays green; **dry-run `node db/apply.mjs`
against a throwaway Aurora** is the integration proof (first additive-migration run —
see R2). **Owner:** Gabe. **Depends on P3.** Authorable in parallel with P5.

---

## Phase 5 — `services/economy-api` Lambda (Aurora adapter over the shared core)

**Demonstrably true:** a Hono service mirroring `services/diagnostic-api` exposes
Cognito-verified, **sub-scoped** grant / spend / read / equip; every row scoped by the
verified `sub` (never payload); atomic two-row grant + atomic spend via `packages/db`
`withTransaction`; and it calls the **same `@cr/economy` core**, so semantics can't
drift from the dev adapter.

**Checklist (copy the diagnostic-api shape 1:1):**
- [ ] `services/economy-api/{package.json, tsconfig.json, esbuild.config.mjs}` — same as diagnostic-api (esbuild → `bundle/lambda.mjs` + `bundle/node.mjs`; `@cr/*` deps + `hono`).
- [ ] `src/app.ts` — pure Hono factory, `/api` basePath, CORS, injected memoized providers.
- [ ] `src/env.ts` — composition root: build `createDataApiClient` + `createCognitoAuthenticator` from env (`DB_CLUSTER_ARN`, `DB_SECRET_ARN`, `DB_NAME`, `COGNITO_USER_POOL_ID`, `COGNITO_CLIENT_ID`); memoize.
- [ ] `src/reads.ts` — `getWallet` / `getInventory` scoped by `sub` (the `scoped(token, …) -> 401|200` wrapper from diagnostic `reads.ts`).
- [ ] `src/writes.ts` — `grantResources` (one `withTransaction`, two ledger rows + wallet upsert, idempotent on `event_id`), `purchaseCosmetic` (atomic debit + ownership, reject insufficient), `equipCosmetic` (verify ownership in-Lambda, **not RLS**).
- [ ] `src/lambda.ts` (`hono/aws-lambda`) + `src/node.ts` (`@hono/node-server`).

**API surface (resource spec §8.5 — four groups, no fifth "collect"):**
`grantResources` (service/internal), `purchaseCosmetic`, `getWallet`/`getInventory`, `equipCosmetic`.

**Tests prove (unit, with an in-memory `DataApiExecutor`/RDS double as `packages/db/src/data-api.test.ts` does):**
- [ ] Idempotent grant; atomic spend rolls back on insufficient gold; equip rejected unless owned.
- [ ] Every query scoped by the verified `sub`; 401 on a bad/absent token.
- [ ] Same-core parity: service and dev adapter produce identical balances for the same event stream.

**Owner:** Gabe. **Depends on P1 + P3 + P4.** Parallel with P2 after P1.

---

## Phase 6 — Deploy wiring (infra) + web server-backed switch

**Demonstrably true:** CDK builds + deploys `EconomyFn` from
`services/economy-api/bundle`, wired behind the same HTTP API + CloudFront `/api/*`;
`db/apply.mjs` has applied `0004`; the web app flips to the **server** economy client
when Cognito + the economy endpoint are configured, **fail-closed** (no optimistic UI).

**Checklist:**
- [ ] `infra/lib/calc-readiness-stack.ts` — add `EconomyFn` (`lambda.Function` from the bundle), `rds-data:*` on the cluster + `appServiceSecret.grantRead`, and `httpApi.addRoutes` for the public economy routes (wallet/inventory/purchase/equip); **grant is service-internal**, not a public mutation route the client can call to mint (INV-COS-4).
- [ ] Run `node db/apply.mjs` post-deploy (env from stack outputs).
- [ ] `apps/web/src/api.ts` + `App.tsx` — the economy client selector (server vs dev). **See Gaps G2** (economy URL / topology decision) — resolve before this lands.
- [ ] Smoke: authed `GET /api/wallet` returns the caller's wallet; unauth → 401.

**Owner:** Gabe (infra/service) + Evan (web switch). **Depends on P4 + P5.** Near-last.

---

## Phase 7 — Earn triggers + anti-farm cap + INV-COS-1 guard (most cross-lane)

**Demonstrably true:** real earn triggers fire server-verified grants — **row 1**
(lesson complete, incl. **test-out at mastery 0**) and **row 3** (each mastery star)
derived from the mastery/completion outcome; **row 2** (interleaved clear) keyed by
Anthony's `session_id`; the rolling cap bounds row 2 (gold + XP); and a
**dependency-lint test** proves the mastery service, diagnostic engine, and
`isNeighborhoodReady` import nothing from `@cr/economy`.

**Checklist:**
- [ ] Earn-trigger **orchestration layer** (NOT inside `@cr/shared-mastery-service` — see Gaps G1): on a server-verified mastery/completion change, call `grantResources` with the deterministic `event_id`. Rows 1 + 3 are distinct credits on distinct keys (no double-count).
- [ ] Test-out seam: a passed placement completing a node at **mastery 0** fires **row 1 with no star** (resource spec §6 note; Mastery spec §5 test-out).
- [ ] Interleaved clear: the Town Hall host `onCleared({ session_id })` (Town Hall spec §6.2 stub) → economy grants row 2, need-scaled by `repairScale(condition)`; resets `last_restored_at`.
- [ ] Cap enforcement wired to `withinCap` (row 2 only).
- [ ] **INV-COS-1 dependency-lint test** (new): assert no edge from mastery/diagnostic/`isNeighborhoodReady` into `@cr/economy` (the spec's `assert(!dependsOn(...))`, currently aspirational — no such test exists yet).

**Owner:** Gabe (triggers/economy) + Anthony (interleaved contract) + Evan (Town Hall launch). **Depends on P5** and is **blocked on Anthony** for row 2. Post-MVP advancement-weighting deferred (D-R4).

---

## What's parallel vs. strictly serial

```text
P0 (docs unfreeze)  ─┐
P1 (pure core)      ─┴─> P2 (web dev adapter + HUD + shop)      [Evan]      ← DEMO
                          P3 (shared types)  [needs P0]         [Gabe]
                          P4 (migration 0004)[needs P3]         [Gabe]  ─┐
                          P5 (economy-api)   [needs P1,P3,P4]   [Gabe]  ─┴─> P6 (deploy + web switch)
                                                                              P7 (triggers + cap + lint)  [needs P5 + Anthony]
```

- **Parallel from day one:** P0 (docs) ∥ P1 (pure core) — disjoint, no shared files.
- **Parallel after P1:** P2 (Evan, apps/web) ∥ P4 (Gabe, SQL) ∥ P5 (Gabe, service). P2 needs only the core; P4/P5 need the types (P3) settled first.
- **Strictly serial:** P3 after P0; P4 after P3; P5 after P4; P6 after P4+P5; P7 after P5.
- **Split across agents:** the core/service/migration (Gabe) and the HUD/shop/dev-adapter (Evan) are disjoint file sets and proceed independently once P1 exists — the same disjoint-lane discipline the repo already relies on.

---

## Recommended first slice (buildable now; no Lambda, no database) {#first-slice}

**P1 + P2 together.** Ship the pure `@cr/economy` core and an in-memory adapter wired
into `apps/web` behind the existing `isServerBacked` gate, with a minimal HUD (gold +
XP level) and a shop over the **code-resident** catalog.

- **Runs with `npm run dev` alone** — no Cognito, no `VITE_*_API_URL`, no Aurora — because the app already defaults to in-memory when unauthenticated/unconfigured (`api.ts`), exactly like `citySession.ts` and `work-upload/store.ts`.
- **Exercises the REAL rules** (idempotent grant, atomic spend, XP curve, catalog validation) in the browser, so the two bug-prone parts are proven before any I/O exists.
- **Delivers visible value + de-risks the most:** a playable earn→spend→equip loop and the settled HUD, with zero backend surface area. When the Lambda + DB land (P4–P6), the same core swaps in behind the same interface, so demo and prod can't diverge.

---

## Risk list (explicit)

| # | Risk | Why it bites | Mitigation |
| - | --- | --- | --- |
| **R1** | **Frozen-package unfreeze of `@cr/state-schema`** | Blueprint §4 forbids economy types there + in `@cr/game`; OWNERS.md + Contracts §8/amendment §9 name Gabe over a superseded single-balance/RLS model. A casual edit breaks the frozen-interface rule. | **P0** does the owner-gated unfreeze + announcement and updates Blueprint §4, OWNERS.md, Contracts §8 **as part of this work**; validate the type shapes in the in-memory adapter (P1/P2) first, then land the frozen edit (P3) as one documented pass (PR + work log + spec). |
| **R2** | **First real economy migration; `apply.mjs` never run for an additive file** | 0001–0003 are the greenfield set; `0004` is the first migration applied to a live cluster. A syntax/grant error surfaces only at deploy time. | The runner **exists** and is idempotent + per-file transactional; dry-run `node db/apply.mjs` against a throwaway Aurora (P4). A failed `0004` rolls back and leaves `schema_migrations` unchanged. |
| **R3** | **One-way invariant (INV-COS-1) accidentally violated** | Two concrete ways: **(a)** wiring the earn trigger *inside* `@cr/shared-mastery-service` makes it `dependsOn @cr/economy` — failing INV-COS-1's own lint; **(b)** an economy read sneaking into a learning gate (storm/lesson/Town-Hall first-placement). | Put grants in an **orchestration layer above** the mastery service (§Gaps G1); add the **dependency-lint test** (P7, does not exist yet); keep Town-Hall "first placement" a pure ordering rule with no economy read; keep the `<2 skills` interleave affordance a UX floor, not a gate. |
| R4 | Earn-shape double-count (row 1 + row 3 on one high-accuracy lesson) | A lesson at ≥80% fires row 1 **and** row-3 stars; sharing an `event_id` would collapse or double them. | Distinct `event_id` shapes per row (§6); idempotency on the composite key; unit test for the combined-completion case. |
| R5 | Semantic drift between dev adapter and Lambda | Two implementations of grant/spend invite divergence. | **Both call the one `@cr/economy` core**; a same-core parity test (P5). |
| R6 | Optimistic UI on spend | Pre-decrementing gold or showing an item owned before the server confirms breaks fail-closed. | No optimistic spend (P2/P6); balances/ownership change only on confirmed response (resource spec §9, D1 spec §10). |

**Top 3: R1 (frozen unfreeze), R2 (first migration apply), R3 (one-way invariant).**

---

## Cross-lane dependencies (what's blocked on whom)

| Dependency | Who | Blocks | Notes |
| --- | --- | --- | --- |
| **Interleaved session composition + grading** — emits a server-verified `session_id` clear | **Anthony** | P7 row-2 earn path (the repeatable path) | Economy consumes the clear; it never composes/grades (resource §11.3, Town Hall §6.2). MVP ships a **stub host** so the launch→grant seam is demonstrable before the real engine. |
| **"Advancement / new-evidence" anti-farm signal** | **Anthony** (post-MVP) | The *sophisticated* anti-farm rule (D-R4(b)) | **Not** MVP-blocking: MVP is **cap-only** (D-R4(a)/D-R6). Principle locked now; signal deferred. |
| **`NUM.S → City Bank` rename** — game labels **DONE 2026-07-27**; lesson prose + item-bank theming **open** | **Evan** (game labels, landed) + **Anthony** (lesson prose + item-bank theming) + shared (authoring docs) | Nothing — D-TH7 is resolved and the hub's "Civic Center" is final | Never blocked the economy core/HUD/shop. The remaining rows are lesson text only; track like `lesson_shell → lesson_archetype` in `TEAM_CHECKLIST.md` (parent §7.3 lists files/owners/status). |
| **Island condition stays visual-only** | **Anthony** (mastery owner) | P4/P7 condition tie | Already an invariant (`Mastery_Scoring_Spec.md` §8); D-R7 uses a **new** `last_restored_at`, not the mastery-lane `last_practiced_at`. Confirm, don't re-decide. |
| **Earn-trigger orchestration placement** | **Gabe + Anthony** | P7 | See Gaps G1 — genuinely unspecified; needs sign-off, not invention. |

---

## Genuinely unresolved (flagged, not invented)

The specs are otherwise complete; these are seams they left open. I did **not** pick a
final answer for any of them — each needs an owner decision.

- **G1 — Where the earn trigger is orchestrated (and its collision with INV-COS-1's own lint).** The resource spec says rows 1/3 are *"derived from progression events the server already computes (the mastery service's evidence outcome)"* but never names the component that turns a mastery/completion change into a `grantResources` call. Placing it inside `@cr/shared-mastery-service` would make that package `dependsOn @cr/economy`, which **fails INV-COS-1's own dependency assertion** (`assert(!dependsOn("@cr/mastery-service","@cr/economy"))`). The economy-as-sink direction (progression → economy) is allowed, but the *code edge* must live **above** the mastery service (the API caller / an orchestration module), not inside it. **Recommendation (needs Gabe + Anthony sign-off):** an orchestration layer at the request boundary that, after `submitAssessmentEvidence` reports `changed`/completion, invokes the economy grant. Flagged, not decided.
- **G2 — Economy client's server-backed gate + API topology.** `apps/web/src/api.ts` keys `isServerBacked` / `apiBaseUrl` to `VITE_DIAGNOSTIC_API_URL`; the resource spec §13 wants *"a configured economy API URL"* and names `services/economy-api` as its **own** Lambda — but the deployed topology is a **single CloudFront origin** serving `/api/*` from one HTTP API. So it's unspecified whether the economy is (a) a separate Lambda behind the **same** `/api` origin (no new env var; reuse the base), (b) a distinct origin via a new `VITE_ECONOMY_API_URL` + `economyApiBaseUrl()`/`isEconomyServerBacked()`, or (c) folded into the existing diagnostic Lambda. **Recommendation (needs Evan sign-off, since it touches `api.ts`):** separate Lambda, **same** `/api` origin (option a). Flagged.
- **G3 — Contracts §8 / amendment shared-type shapes are stale.** Both define a single-`balance` `ResourceWallet`, a single-column `event_id` PK ledger, and **RLS** — all three superseded by the settled two-resource, composite-key, no-RLS design. So *"the §8 wire types live in `shared-state-schema`"* **cannot** be a literal copy of §8; the shapes to add are the **resource-spec §8** shapes, and Contracts §8.3 / amendment §5 must be marked superseded (P0). Called out so no one ports the wrong (ratified-but-outdated) types.
- **G4 — Test-out completion → row 1 without a star (implementation seam, per the specs).** `completion_status` is a generated column (`mastery ≥ 2`), but a **test-out** node completes at **mastery 0**. The specs explicitly call this *"an implementation seam to reconcile, not an open decision"*: the trigger derivation (G1) must fire **row 1** for a test-out completion that has **no** row-3 star. Carried as a P7 checklist item, not a redesign.
