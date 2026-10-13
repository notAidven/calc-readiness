# Contracts Amendment: Cosmetic Economy (RATIFIED 2026-07-20 — **SUPERSEDED 2026-08-03**)

> ## ⚑ SUPERSEDED 2026-08-03. Nothing in this document is a live instruction.
>
> **THE DECISION.** Team lead, 2026-08-03: *"sunset the cosmetic shop and xp systems completely - they dont really have a role in our game. remove it from the interface and it shouldnt really have any implications anywhere."*
>
> **THE REASON.** The economy the game actually needs turned out to be the one this amendment did not describe. Between ratification and now, the era MATERIALS became the single spendable currency (the 2026-07-29 gold-drop) and grew three real sinks — civic buildings, roads and crisis repair — which are how a city gets built. Cosmetics never acquired a role beside them: `equipCosmetic` was visually inert for its entire life, so a purchased skin changed nothing a learner could see, and XP was a parallel score with one consumer, the prestige unlocks in this amendment. Sunsetting both leaves one currency, one thing to spend it on, and no second progress number.
>
> **THIS DOCUMENT IS NOT DELETED**, because a ratified all-hands decision is a record even after it is reversed. It stays as the rationale for what §8 was and why. Read it as history.
>
> **WHAT WAS BUILT, AND WHAT WAS UNBUILT ON 2026-08-03.** The 2026-07-31 note on `TEAM_CHECKLIST.md`'s §8 line measured this amendment's surface as entirely unbuilt (`packages/shared-state-schema` holding none of the five types, `db/migrations/` at `0001`-`0003`). **The types half of that is still true and the migrations half has expired**: `0004_civilization_state.sql` landed after that measurement and built two of the five tables' worth of surface — `equipped_cosmetic` whole, and `resource_grant_ledger` carrying a `cosmetic_id` column, an `xp` member on the `economy_resource` enum, and two CHECK constraints written about them. Nothing ever WROTE either (`services/diagnostic-api/src/writes.ts` says so), so no learner data was lost; `db/migrations/0007_sunset_cosmetics_and_xp.sql` removes the shapes.
>
> **WHAT SURVIVES.** INV-COS-1 (one-way), INV-COS-4 (server-authoritative) and INV-COS-5 (a reconstructable, non-negative ledger) are still normative — they are about the direction of a dependency and the integrity of a ledger, not about cosmetics, and the era-material economy is held to all three. INV-COS-2 and INV-COS-3 quantify over a catalogue and an `effect_class` that no longer exist. See `docs/Contracts.md` §8's superseding note.
>
> **DO NOT BUILD:** the five §4 tables, the five §5 shared types, the four §6 service APIs, or any surface that sells, grants, owns or equips a cosmetic, or that accumulates a second progress score under any name (points, XP, level, rank).

*__Status: RATIFIED / APPROVED at all-hands on 2026-07-20. SUPERSEDED 2026-08-03 (see above).__*

*__Original status note, kept verbatim:__ This amendment to `docs/Contracts.md` (v2, authoritative) has been approved and __folded into the contract__: its normative content — the §3 write-mapping rows, the invariants (INV-COS-1..5), the new shared types, and the grant/spend/equip APIs — now lives in `docs/Contracts.md` §8 (and the tagged rows in §3). __This document remains the rationale/detail record__ (design reasoning, illustrative DDL, and the approval-blockers checklist); Contracts.md §8 is the normative source. The cosmetic economy is a __post-MVP (Days 13-24 ranked expansion)__ addition; the frozen Day-12 MVP contract is unchanged. The approval-blockers in §7 below were all satisfied as the ratification gate. All SQL and TypeScript below are illustrative reference blocks (the live migration/types are Gabe's to author during the ranked expansion, per Contracts §8). Owner: Gabe (shared types/tables/RLS/APIs); Evan (game-side consumption). Companion docs: `docs/Contracts.md` §8 (the ratified contract), `TEAM_CHECKLIST.md` (sequencing).*

---

## 1. Summary & scope

Evan proposes a **cosmetic economy** for the game lane: players earn an in-game resource through gameplay/progress and spend it on **cosmetic-only** upgrades (visual/decorative building and neighborhood customizations). The economy is **one-way and purely cosmetic** — earned resources and purchased cosmetics NEVER affect mastery, node completion, diagnostic results, or storm/checkpoint access. Resource grants are **server-side / authoritative**: the client cannot mint, adjust, or write a balance; it may only *select/equip* cosmetics it already owns.

This touches the contract in exactly four places, all additive:
- **§3 Write-mapping** — new rows for a resource/economy service (authoritative balance + ledger writer) and a narrowly-scoped client cosmetic-selection write.
- **New data model** (extends §1/§5 conventions) — new tables for wallet balance, an append-only grant/transaction ledger, a cosmetic catalog, and player-owned/equipped cosmetics, all row-level-secured on `student_id`.
- **New shared types** (extends `packages/shared-state-schema`) — wallet, grant/transaction, cosmetic item, owned/equipped cosmetic.
- **New APIs** (extends §4) — authoritative grant (idempotent), spend/purchase (atomic), read wallet/inventory.

It does NOT touch: `mastery`, `placement_estimate`, `completion_status`, `lesson_stage`, `neighborhood_state.checkpoint_cleared`, the assessment records, or the mastery/scoring pipeline. The frozen MVP contract is unchanged; this is proposed as a **post-MVP (Days 13-24 ranked expansion)** addition (see `TEAM_CHECKLIST.md` — Evan, ranked expansion: "Cosmetic economy (materials → customization; never gates learning)").

---

## 2. Invariants

**HARD INVARIANT (the one that must be preserved and stated explicitly):** the cosmetic economy is **one-way and purely cosmetic**. Earned resources and purchased/equipped cosmetics have **no read path into any progression, mastery, assessment, or storm decision**. They cannot gate, accelerate, unlock, or slow learning progression or storm/checkpoint eligibility.

Explicitly **forbidden** (each must remain false by construction):
1. Resources or cosmetics affect `mastery` (any node, any student). — forbidden.
2. Resources or cosmetics affect `completion_status` or node completion (`mastery >= 2`). — forbidden.
3. Resources or cosmetics affect diagnostic results (`placement_estimate`, `assessment_administration`, `assessment_item_response`, or the foundational assessment gain metric). — forbidden.
4. Resources or cosmetics affect storm/checkpoint access or `neighborhood_state.checkpoint_cleared`. Storm eligibility remains solely "all the neighborhood's required nodes mastered (>= 2)" per `docs/Contracts.md` §1/§3 and `engines/game/src/index.ts::isNeighborhoodReady`. — forbidden.
5. The client mints, increments, or writes a wallet balance or a grant ledger row. — forbidden (all grants are authoritative/server-side).
6. Spending resources ever produces anything other than a cosmetic (no consumables that touch progression, no "skip", no "hint pack" that feeds mastery evidence). — forbidden.

**Boundary statement:** the economy service is a *sink* of progression events (it may READ mastery/checkpoint events to decide grants) and a *source* of cosmetics only. There is no edge from wallet/cosmetics back into `student_node_state`, `neighborhood_state`, or the assessment tables. `engines/game` continues to write ONLY `neighborhood_state.checkpoint_cleared` (Contracts §1); the economy tables are written by the new economy service, not by the game client.

### 2.1 Invariant in assertable/testable form

The invariant reduces to a **no-back-edge** property plus a **grant-authority** property. Both are checkable:

```ts
// INV-COS-1 (one-way): no economy field is an input to any progression decision.
// Asserted structurally: the mastery service, diagnostic engine, and
// isNeighborhoodReady() import NOTHING from the economy module.
// (enforceable as a lint/dependency-cgraph test)
assert(!dependsOn("@cr/mastery-service", "@cr/economy"));
assert(!dependsOn("@cr/diagnostic",     "@cr/economy"));
assert(!dependsOn("isNeighborhoodReady","@cr/economy"));

// INV-COS-2 (storm access unchanged): storm eligibility is a pure function of
// mastery only; wallet balance and inventory do not appear in its inputs.
function stormEligibleUnaffectedByEconomy(states, wallet, inventory): boolean {
  return isNeighborhoodReady(domain, states) ===
         isNeighborhoodReady(domain, states); // wallet/inventory are not parameters
}

// INV-COS-3 (cosmetic-only outcome): every catalog item's effect is cosmetic.
assert(catalog.every((item) => item.effect_class === "cosmetic"));

// INV-COS-4 (server-authoritative grants): no client role holds INSERT/UPDATE
// on wallet balance or grant ledger (verified against RLS grants, see §4).
assert(clientGrants("resource_wallet").writable === false);
assert(clientGrants("resource_grant_ledger").writable === false);

// INV-COS-5 (non-negative, monotone ledger): balance == sum(grants) - sum(spends),
// never negative; spend rejected on insufficient balance (see §6 atomicity).
assert(wallet.balance === sumGrants - sumSpends && wallet.balance >= 0);
```

---

## 3. Write-mapping additions (proposed rows for Contracts.md §3)

The following rows are proposed for the §3 write-mapping table. They preserve the existing pattern: `student_id` from auth (never payload); authoritative state written by a service role; clients narrowly scoped.

| source | may write | may NOT write | via |
|---|---|---|---|
| Economy/Resource service (Gabe) | `resource_wallet.balance`, `resource_grant_ledger` (append-only), `owned_cosmetic` (on purchase) | `mastery`, `placement_estimate`, `completion_status`, `neighborhood_state`, assessment records | authoritative grant + atomic spend (§6); service role only; grants keyed by idempotent `event_id` |
| Game/Storm (Evan) | `equipped_cosmetic` (cosmetic-selection only, over cosmetics the student already owns) | `resource_wallet.balance`, `resource_grant_ledger`, `owned_cosmetic`, `mastery`, `placement_estimate`, `neighborhood_state` | `equipCosmetic({cosmetic_id})`; RLS `with check` requires the row to exist in `owned_cosmetic` for `auth.uid()`; **client can NEVER write a balance or grant a resource** |

Notes to fold into §3 prose if approved:
- **The client never writes resources.** All balance changes flow through the economy service (grant or atomic spend). The only client write in the entire economy is `equipped_cosmetic`, and only for cosmetics the student already owns.
- The economy service is a **new fourth authoritative writer** alongside the mastery service, the diagnostic writer, and the assessment pipeline. It does not write, and does not gate, anything in §1/§2. Like the storm, it READS progression but its writes never re-enter progression.
- Ownership follows OWNERS.md: **Gabe** owns the shared types/tables/RLS/APIs (`packages/*`, migrations); **Evan** owns the game-side consumption (earn triggers surfaced to the service, cosmetic UI, equip calls).

---

## 4. New data model (proposed DDL — do NOT create a migration file)

Proposed as illustrative DDL only, following the conventions in `supabase/migrations/0001_core_contracts.sql`: snake_case names, `student_id uuid ... references auth.users (id) on delete cascade`, RLS enabled per table, clients `revoke all` then narrowly `grant`, `student_id` from `auth.uid()` (never payload), append-only ledgers are INSERT-only for clients, and authoritative fields are service-role-only.

```sql
-- PROPOSED. Illustrative only; not a live migration.

create type public.cosmetic_effect_class as enum ('cosmetic'); -- exhaustive on purpose: economy can ONLY produce cosmetics
create type public.economy_txn_kind as enum ('grant', 'spend');

-- 4.1 Wallet: one balance row per student. Service-role-authoritative.
create table public.resource_wallet (
  student_id uuid primary key references auth.users (id) on delete cascade,
  balance bigint not null default 0 check (balance >= 0),
  updated_at timestamptz not null default now()
);

-- 4.2 Append-only grant/transaction ledger. Idempotent on event_id.
-- balance is always reconstructable as sum(grant) - sum(spend) over this table.
create table public.resource_grant_ledger (
  event_id text primary key,                       -- idempotency key; duplicate submit = no-op
  student_id uuid not null references auth.users (id) on delete cascade,
  kind public.economy_txn_kind not null,
  amount bigint not null check (amount > 0),        -- always positive; kind carries the sign
  reason_code text not null,                        -- e.g. 'node_mastered', 'checkpoint_cleared', 'purchase:<cosmetic_id>'
  cosmetic_id text,                                 -- set on 'spend' rows; null on 'grant'
  created_at timestamptz not null default now(),
  check ((kind = 'spend') = (cosmetic_id is not null))
);

-- 4.3 Cosmetic catalog: reference/config of purchasable cosmetics. Effect is cosmetic by type.
create table public.cosmetic_catalog (
  cosmetic_id text primary key,
  display_name text not null,
  cost bigint not null check (cost >= 0),
  effect_class public.cosmetic_effect_class not null default 'cosmetic',
  category text not null,                           -- e.g. 'building_skin', 'neighborhood_decor'
  is_active boolean not null default true
);

-- 4.4 Player-owned cosmetics: what the student has purchased. Written on purchase (service).
create table public.owned_cosmetic (
  student_id uuid not null references auth.users (id) on delete cascade,
  cosmetic_id text not null references public.cosmetic_catalog (cosmetic_id) on delete restrict,
  acquired_at timestamptz not null default now(),
  acquired_via_event_id text not null references public.resource_grant_ledger (event_id) on delete restrict,
  primary key (student_id, cosmetic_id)
);

-- 4.5 Equipped cosmetics: the student's current selection. THE ONLY client-writable economy table.
create table public.equipped_cosmetic (
  student_id uuid not null references auth.users (id) on delete cascade,
  slot text not null,                              -- e.g. 'building:NUM.S', 'neighborhood:D1'
  cosmetic_id text not null,
  equipped_at timestamptz not null default now(),
  primary key (student_id, slot),
  foreign key (student_id, cosmetic_id)
    references public.owned_cosmetic (student_id, cosmetic_id) on delete cascade
);

create index resource_grant_ledger_student_idx
  on public.resource_grant_ledger (student_id, created_at);
create index owned_cosmetic_student_idx
  on public.owned_cosmetic (student_id);

alter table public.resource_wallet enable row level security;
alter table public.resource_grant_ledger enable row level security;
alter table public.cosmetic_catalog enable row level security;
alter table public.owned_cosmetic enable row level security;
alter table public.equipped_cosmetic enable row level security;

-- Read-own on all student-scoped tables; catalog is world-readable reference data.
create policy "students read own wallet"
  on public.resource_wallet for select
  to authenticated
  using (student_id = auth.uid());

create policy "students read own ledger"
  on public.resource_grant_ledger for select
  to authenticated
  using (student_id = auth.uid());

create policy "anyone reads active catalog"
  on public.cosmetic_catalog for select
  to authenticated
  using (is_active);

create policy "students read own cosmetics"
  on public.owned_cosmetic for select
  to authenticated
  using (student_id = auth.uid());

create policy "students read own equipped"
  on public.equipped_cosmetic for select
  to authenticated
  using (student_id = auth.uid());

-- The ONLY client write in the economy: equip a cosmetic you already own.
create policy "students equip owned cosmetics"
  on public.equipped_cosmetic for insert
  to authenticated
  with check (
    student_id = auth.uid()
    and exists (
      select 1 from public.owned_cosmetic owned
      where owned.student_id = auth.uid()
        and owned.cosmetic_id = equipped_cosmetic.cosmetic_id
    )
  );

create policy "students re-equip owned cosmetics"
  on public.equipped_cosmetic for update
  to authenticated
  using (student_id = auth.uid())
  with check (
    student_id = auth.uid()
    and exists (
      select 1 from public.owned_cosmetic owned
      where owned.student_id = auth.uid()
        and owned.cosmetic_id = equipped_cosmetic.cosmetic_id
    )
  );

-- Fail closed, then grant the narrowest client privileges.
-- NOTE: NO client insert/update on resource_wallet, resource_grant_ledger, or
-- owned_cosmetic. Those are written only by the economy service role.
revoke all on public.resource_wallet from anon, authenticated;
revoke all on public.resource_grant_ledger from anon, authenticated;
revoke all on public.cosmetic_catalog from anon, authenticated;
revoke all on public.owned_cosmetic from anon, authenticated;
revoke all on public.equipped_cosmetic from anon, authenticated;

grant select on public.resource_wallet to authenticated;
grant select on public.resource_grant_ledger to authenticated;
grant select on public.cosmetic_catalog to authenticated;
grant select on public.owned_cosmetic to authenticated;
grant select on public.equipped_cosmetic to authenticated;
grant insert (student_id, slot, cosmetic_id) on public.equipped_cosmetic to authenticated;
grant update (slot, cosmetic_id, equipped_at) on public.equipped_cosmetic to authenticated;

comment on table public.resource_wallet is
  'One earned-resource balance per student. Economy service role is the only writer; balance >= 0 enforced.';
comment on table public.resource_grant_ledger is
  'Append-only, idempotent (event_id) economy ledger. Client has no INSERT/UPDATE; balance = sum(grant) - sum(spend).';
comment on table public.owned_cosmetic is
  'Cosmetics the student has purchased. Written by the economy service on an atomic spend, never by the client.';
comment on table public.equipped_cosmetic is
  'Cosmetic selection. The ONLY client-writable economy table; INSERT/UPDATE restricted to owned cosmetics.';
```

RLS sketch summary (read-own, no client write to balances):
- `resource_wallet`: read-own; **no client write** (service role only).
- `resource_grant_ledger`: read-own; **no client write** (append-only, service role only).
- `cosmetic_catalog`: read active rows; no client write.
- `owned_cosmetic`: read-own; **no client write** (service writes on purchase).
- `equipped_cosmetic`: read-own; client INSERT/UPDATE **only** for a `cosmetic_id` present in the student's `owned_cosmetic`.

---

## 5. New shared types (proposed — do NOT edit index.ts)

Proposed additions consistent with `packages/shared-state-schema/src/index.ts` naming (snake_case wire fields, `UUID`/`ISODateTime` aliases, interfaces mirroring table rows).

```ts
// PROPOSED additions to @cr/state-schema. Illustrative only; not applied.

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

---

## 6. API signatures (proposed extensions to Contracts §4)

New economy service (proposed owner: Gabe). Like the mastery service, `student_id` is taken from auth and ignored if present in the payload. All writes are authoritative; the client calls these, it does not write the tables directly (except the equip path, which is an ordinary RLS-guarded client write).

```ts
// 6.1 Authoritative grant. Server-side only, idempotent by event_id.
// The client NEVER calls this to mint resources for itself; earn triggers are
// surfaced as server-verified progression events (e.g. node mastered,
// checkpoint cleared) and the service decides the grant. Duplicate event_id = no-op.
grantResource(input: {
  student_id?: UUID;         // ignored; taken from auth/service context
  event_id: string;          // idempotency key (e.g. the mastery evidence_id or checkpoint event id)
  amount: ResourceAmount;    // > 0
  reason_code: string;       // 'node_mastered' | 'checkpoint_cleared' | ...
}): Promise<{
  balance: ResourceAmount;   // post-grant balance
  applied: boolean;          // false if event_id already seen (idempotent no-op)
}>

// 6.2 Spend / purchase. ATOMIC: debit balance + credit ownership in ONE transaction.
// Rejects on insufficient balance (no partial state). Idempotent by event_id so a
// retried purchase does not double-charge.
purchaseCosmetic(input: {
  student_id?: UUID;         // ignored; taken from auth
  event_id: string;          // idempotency key for the purchase attempt
  cosmetic_id: string;       // must exist and be is_active in cosmetic_catalog
}): Promise<{
  status: "purchased" | "already_owned" | "insufficient_balance" | "unknown_cosmetic";
  balance: ResourceAmount;   // post-transaction balance
  owned: boolean;            // true iff the student now owns the cosmetic
}>

// 6.3 Read wallet + inventory (read-own; RLS-backed).
getWallet(): Promise<ResourceWallet>
getInventory(): Promise<{
  owned: OwnedCosmetic[];
  equipped: EquippedCosmetic[];
  catalog: CosmeticItem[];   // active catalog, for the store UI
}>

// 6.4 Equip (cosmetic-selection only). Ordinary client write, RLS-guarded:
// only cosmetics already in owned_cosmetic can be equipped. Touches NOTHING in
// progression, mastery, or storm state.
equipCosmetic(input: {
  slot: string;
  cosmetic_id: string;       // must be in the caller's owned_cosmetic
}): Promise<EquippedCosmetic>
```

**Idempotency & atomicity requirements (explicit):**
- `grantResource` MUST be idempotent on `event_id`: the ledger's `event_id` primary key makes a replayed grant a no-op (`applied: false`). Grants are server-side only; there is no client code path that increments a balance.
- `purchaseCosmetic` MUST be atomic: within a single DB transaction it (a) verifies `balance >= cost`, (b) inserts a `spend` ledger row, (c) decrements `resource_wallet.balance`, and (d) inserts `owned_cosmetic`. If balance is insufficient, the whole transaction rolls back and returns `insufficient_balance` with the balance unchanged. It MUST be idempotent on `event_id` so a retried purchase neither double-charges nor double-grants ownership.
- `resource_wallet.balance` MUST remain `>= 0` (DB check constraint) and equal `sum(grant.amount) - sum(spend.amount)` over the ledger.

---

## 7. Correctness conditions / blockers checklist (approval gate — SATISFIED 2026-07-20)

These all had to hold for the amendment to be approved and folded into `docs/Contracts.md`. Each is a correctness blocker, not a product preference. **All were satisfied at the 2026-07-20 all-hands, which is why the amendment was ratified and folded into Contracts §8.**

- [x] **(a) Grants server-side only.** No client role can insert/update `resource_wallet` or `resource_grant_ledger`; all balance changes flow through the economy service. The client cannot mint resources. (Contracts §8.1 INV-COS-4, §8.5)
- [x] **(b) Grant idempotency.** `grantResource` is idempotent on `event_id` (ledger PK); a replayed grant is a no-op and does not double-credit. (Contracts §8.4)
- [x] **(c) Atomic spend transaction.** `purchaseCosmetic` debits balance and credits ownership in a single transaction, rejects on insufficient balance with no partial state, and is idempotent on `event_id`. (Contracts §8.4)
- [x] **(d) RLS prevents client balance writes.** RLS + grants confirm clients have SELECT-only on wallet/ledger/owned, and INSERT/UPDATE on `equipped_cosmetic` restricted to owned cosmetics; `student_id` comes from `auth.uid()`, never payload. (Contracts §8.5)
- [x] **(e) One-way invariant to mastery/storm.** No economy field is an input to `mastery`, `completion_status`, `placement_estimate`, the assessment metric, or `isNeighborhoodReady`/`neighborhood_state.checkpoint_cleared`. Storm eligibility remains "all required nodes mastered (>= 2)" and is provably independent of wallet/inventory (INV-COS-1..3, §2.1; Contracts §8.1). (Contracts §8.1)

---

## 8. Open decisions (not blockers)

These are product decisions to settle before build; none is a correctness blocker and none affects the invariants above:
- **Earn rates.** How much resource per node mastered / checkpoint cleared / item-type mastered; anti-grind caps.
- **Resource types.** One generic currency vs. multiple resource types tied to the D1 building-type/answer-type taxonomy (`TEAM_CHECKLIST.md` — Evan MVP: "mastering different item types yields different RESOURCES"). This amendment models a single `balance`; a multi-resource variant would generalize `resource_wallet`/ledger to a `(student_id, resource_type)` key.
- **Cosmetic catalog scope.** Which cosmetics ship first (building skins, neighborhood decor), pricing, and rotation via `is_active`.
- **Timing / sequencing.** Whether this lands in the **Days 13-24 ranked expansion** (default, per `TEAM_CHECKLIST.md`) or is pulled earlier. It should NOT compete with the **Day-12 MVP** (depth-first D1: 6 nodes / 3 shells, pipeline computing the D1 aggregate gain). The MVP already calls for building-type-linked *resources* as a game-feel element; a full spend/customization economy is the ranked-expansion follow-on.

---

## 9. Ownership & rollout

- **Ownership (per OWNERS.md):** Gabe owns the shared types (`packages/shared-state-schema`), tables/RLS/migrations, and the economy service APIs (`packages/*` are frozen interfaces, one owner behind them). Evan owns the game-side consumption: surfacing server-verified earn triggers, the store/cosmetic UI, and `equipCosmetic` selection.
- **Rollout:** ratified as a **post-MVP (ranked expansion, Days 13-24)** addition. It does NOT destabilize the frozen MVP contract: it is purely additive (new tables, new types, new service, one narrow client write), touches nothing in §1/§2, and was gated behind the 2026-07-20 all-hands review. The §3 rows and normative content are now folded into `docs/Contracts.md` (§3 + §8). The live DDL migration and the `packages/shared-state-schema` type additions are Gabe's to author during the ranked expansion (not at MVP).
- **Change control:** ratified at all-hands 2026-07-20 and folded into `docs/Contracts.md` (§3 write-mapping rows + §8 cosmetic economy). This document is now the rationale/detail record; the normative contract is Contracts §8. The code artifacts (`packages/shared-state-schema/src/index.ts`, `supabase/migrations/*`) remain unchanged until the Days 13-24 ranked expansion implements them.
