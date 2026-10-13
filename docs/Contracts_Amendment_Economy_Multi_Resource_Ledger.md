# Contracts Amendment: the economy ledger is multi-resource, and three of §8's five tables are not built (RATIFIED 2026-07-31)

*__Status: RATIFIED 2026-07-31, single-lane and additive.__ Owner: Gabe (economy shared types, tables, grants, migrations, service APIs) per `OWNERS.md`. Under the relaxed cross-lane change policy (`OWNERS.md` → "Cross-lane change policy (amended 2026-07-23)", ratified in PR #19) a Gabe-only additive change in Gabe's own lane needs no all-hands sign-off, so this is recorded rather than circulated. Companion artifact: `db/migrations/0004_civilization_state.sql`. Design record: `docs/superpowers/specs/2026-07-31-civilization-persistence-design.md` §6.2.*

---

## 1. Why this exists

Contracts §8 (all-hands ratified 2026-07-20) specifies five economy tables — `resource_wallet`, `resource_grant_ledger`, `cosmetic_catalog`, `owned_cosmetic`, `equipped_cosmetic` — with illustrative DDL in `docs/Contracts_Amendment_Cosmetic_Economy.md` §4. **No migration was ever written**, and in the eleven days since, the shipped economy core moved somewhere §8's DDL cannot follow.

That is a real asset rather than a loss: §8's **invariants (INV-COS-1..5), its ownership split, and its write-mapping are correct and stand unchanged**. What cannot be transcribed is the table shape. `0004_civilization_state.sql` is the first migration to build any of it, so the divergence has to be recorded before it is built rather than taken silently inside a migration.

---

## 2. What changes

### 2.1 The ledger's primary key is the composite, not `event_id`

**§8 says** (`Contracts.md:286`, and again at `:387`): *"`resource_grant_ledger` — append-only, idempotent on `event_id` (primary key)"*.

**The shipped core says** (`packages/economy/src/types.ts:187`): the idempotency key is `(student_id, event_id, resource_type)` (D-R5).

**§8's key is not merely narrower, it is structurally broken by the shipped shape.** One earn event writes more than one row:

- a **lesson completion** writes an `xp` row and an era-material row under one `lesson_complete:<node_id>`;
- an **era advance** writes a debit leg and a credit leg under one `era_advance:<era_id>` (`docs/superpowers/specs/2026-07-31-era-material-carry-forward-ruling.md` §5.1).

Both are distinct 3-of-3 on `resource_type`, and both replay as a whole-event no-op. Under `event_id` alone the second row of every lesson completion is a primary-key violation.

**Ratified:** the primary key is `(student_id, event_id, resource_type)`.

**This was invited, not improvised.** `Contracts_Amendment_Cosmetic_Economy.md:370`, under "Open decisions (not blockers)", already reads: *"This amendment models a single `balance`; a multi-resource variant would generalize `resource_wallet`/ledger to a `(student_id, resource_type)` key."* This amendment takes that option.

### 2.2 A ledger row is denominated, and carries its era

`resource_type` is a Postgres **enum** over the eleven shipped resources (`xp` plus the ten era materials), never free text. `era_id` is added to the row — the one column with no counterpart in the shipped `LedgerEntry`.

The reason is a failure mode the browser store already met and survived only by accident of having a version to bump:

- A **retired** id (`flint`) fails a membership check for free.
- A **repurposed** id passes every membership check. `gold` was the legacy currency and became era five's material; the word is a member of `ECONOMY_RESOURCES` before the change and after it, so nothing derived from that union could tell the two meanings apart. `computeBalances` and `computeMaterialBalances` split on `resource_type` alone. Only bumping `ECONOMY_DEV_SCHEMA_VERSION` (2 → 3) stopped a pre-drop wallet restoring as an era-five stockpile for a player in era one.

**A server table has no key version to bump.** So the rule — *never repurpose a resource id; retire it and add a new one* — is written into the migration where the next author will read it, and `era_id` is the backstop that makes a breach recoverable after the fact rather than permanent.

### 2.3 Three of the five tables are not built

| §8 table | Built? | Why |
|---|---|---|
| `resource_grant_ledger` | **Yes** | The single reconstructable source of truth |
| `equipped_cosmetic` | **Yes** | Slot → cosmetic is a choice, not a consequence; the ledger genuinely cannot express it |
| `resource_wallet` | **No** | Every balance is a projection over the ledger (`computeBalances`, `computeMaterialBalances`). INV-COS-5 (`balance == sum(grants) - sum(spends)`) then holds **by construction**, where a stored column has to be kept in step. A materialized cache is a later optimisation if reads measure slow, not a contract |
| `owned_cosmetic` | **No** | `purchasedIds()` derives ownership from spend rows carrying `cosmetic_id`; prestige is re-derived from the XP balance on every restore, deliberately, so a retuned milestone table applies retroactively |
| `cosmetic_catalog` | **No** | The catalogue ships in code (`CosmeticDescriptor`, `civicCatalogue.ts`), which `resources.ts` states as a design position: *"the cosmetic catalog lives in CODE as descriptors … not a DB table"*. A table would be a second source of truth for something with no runtime editor |

### 2.4 INV-COS-4's wording, corrected in place

INV-COS-4 currently reads: *"no client role holds INSERT/UPDATE on `resource_wallet` or `resource_grant_ledger`."* Two of the three nouns move.

**The invariant is unchanged and is now stronger.** `app_service` — the only DB caller — holds `select, insert` on `resource_grant_ledger` and **no `update` and no `delete`**, so the ledger is append-only against the service role itself, not merely against a client. There is no `resource_wallet` for anyone to hold anything on, and a balance nobody stores is a balance nobody can desynchronise.

### 2.5 The AWS-native re-port

§8's DDL is Supabase-shaped: `references auth.users`, RLS `with check`, `auth.uid()`. `0001_core_contracts.sql` already deleted all of that for §1/§2 in favour of app-layer scoping — `student_id` is the Cognito `sub` from a verified JWT, and the Lambda is the only DB caller. §8's tables take the same re-port. §8.5's RLS clauses are read as app-layer scoping obligations, exactly as §5's were.

### 2.6 One deviation from §8's types, recorded

`amount` is `integer`, not §8's `bigint`. A row is a single grant or spend — tens to low thousands — and the RDS Data API round-trips an int64 as a **string**, which every reader would then have to parse. If a resource ever needs more than 2.1 billion in one row, widening is a one-line migration on a column no reader parses today.

---

## 3. What does NOT change

- **INV-COS-1, 2, 3, 5** — unchanged, word for word.
- **§8.4's service APIs** — unchanged in shape. `getWallet` returns a derived balance instead of a stored row, which is invisible across the seam.
- **Ownership** — unchanged. Gabe owns the tables, grants, migrations and service APIs; Evan owns game-side consumption.
- **The one-way boundary** — unchanged. Nothing in the economy is readable by a progression decision.
- **Graded evidence** — untouched. Nothing here alters `assessment_administration`, `assessment_item_response`, `mastery_evidence` or `raw_response_log`. No rescore is implied.
