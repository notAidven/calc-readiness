# Resource Model — XP and Gold (SETTLED DESIGN — implementation-ready)

**Status:** SETTLED DESIGN, implementation-ready. **All internal design decisions
are resolved** (as of 2026-07-25 — see
`2026-07-25-townhall-resource-decision-brief.md` for the triage rationale). It is
**not** all-hands-ratified and **no code implements it yet**; the only things
still genuinely open are cross-lane seams flagged in §11 (Anthony's post-MVP
"advancement" signal for the anti-grind rule; the lesson-side half of the
`NUM.S → City Bank` rename, the game-label half having landed 2026-07-27; interleaved
item selection/grading ownership). This spec deepens the
ratified cosmetic economy (`docs/Contracts.md` §8 +
`docs/Contracts_Amendment_Cosmetic_Economy.md`) and the parent design
`docs/superpowers/specs/2026-07-25-island-decay-and-gold-design.md`, porting §8's
invariants onto the ACTUAL stack (Aurora Postgres via the RDS Data API behind a
Lambda, Cognito auth, **no RLS**), and specifies the wallet/ledger/earn model, the
anti-grind design, and the HUD surface. §8's **invariants survive; its
RLS/client-write mechanics do not** (see §8 of this doc).

**Gold is earned only by doing practice — there is no passive/idle income of any
kind** (no time-based accrual, no collectors, no tap-to-collect). This is the
decided design and it matches the parent (whose only gold paths are lesson
completion and interleaved practice).

**Owner:** Gabe owns the shared economy types, tables/migrations, and the economy
service APIs (`docs/Contracts.md` §8.5 / OWNERS.md). Evan owns the game-side
consumption: surfacing server-verified earn triggers, the HUD, the shop/cosmetic
UI, and the `equipCosmetic` call. **Cross-lane seams are flagged inline and
collected in §11.**

**Companion:** `docs/superpowers/specs/2026-07-25-town-hall-design.md` (the Town
Hall — where interleaved practice is launched and where XP/gold are displayed; its
**island-condition readout is stale**, since the condition clock is sunset — §8.3).
 The two specs share the earn seam (§6) and the HUD (§9); each is
focused on its own lane (economy data model here; the building + UX there) and
they cross-reference rather than duplicate. See that doc's Companion note for the
split rationale.

---

## 1. Summary

The economy has **exactly two resources: XP and gold.** Both are earned **only
from demonstrated learning** — neither has any passive/idle source. They differ
in **both** what kind of number each is **and** what each credits (the settled
distinction — §3, D-R3):

- **XP is a monotonic, non-spendable record of competence/depth.** It only ever
  increases and is never consumed. It is earned from completing lessons, **each
  mastery star gained**, and interleaved practice, and it drives a player
  level/rank and (D-R1/D-R2, decided) milestone-granted prestige cosmetics. It
  never gates learning.
- **Gold is the spendable cosmetic wallet, earned from *activity*.** It comes from
  exactly two paths — completing a lesson and interleaved practice — and
  **decreases when spent on cosmetics**. **Stars grant no gold.**

Two things make these genuinely different numbers rather than one shown twice.
First, a single number **cannot** be both a spend-safe record of progress and a
depletable wallet: if the progress record were spendable, buying a cosmetic would
erase "how far you've come." Second, they credit different things — earning your
2nd and 3rd star on an already-complete building moves XP but not gold, so XP
rewards going *deeper* on material you have already passed while gold rewards
doing the work (§3).

---

## 2. Precise definitions

### 2.1 XP (experience)

- **What it is:** a per-student, monotonic, **non-spendable** integer that only
  ever increases, granted for demonstrated learning. It is an economy-lane
  *record of progress*, distinct from the `mastery` field (see §11.1 — XP is NOT
  mastery and never feeds a mastery/progression decision).
- **How it is earned:** completing a lesson, **each mastery star gained**, and
  clearing an interleaved practice session — never passively, never by idle time.
  The star credit is exactly what gold does **not** get (the settled asymmetry —
  §3.2, D-R3). See the earn table (§6).
- **What it is for:** a **player level / rank** (a title such as
  Apprentice → Journeyman → …, purely a badge) and, at level milestones,
  **prestige cosmetics that are granted, not sold** — cosmetics a student can only
  earn by learning, never buy with gold.
- **What it is NOT for:** XP **never gates any learning.** It does not unlock
  islands, lessons, storms, or mastery, and it is never spent. Island access stays
  a pure function of the prerequisite graph + mastery (see §3.4).

### 2.2 Gold

- **What it is:** a per-student, non-negative integer that goes **up** (earned)
  and **down** (spent). `balance = sum(grants) - sum(spends)`, never negative.
- **How it is earned:** **exactly two paths — completing a lesson (which also
  upgrades that node's building) and clearing an interleaved practice session at
  the Town Hall.** There is **no** passive accrual, no collectors, no tap-to-
  collect, and no time-based income of any kind. (This is verbatim the parent's
  decided design — parent §3.)
- **What it is for:** buying **cosmetics only** — building skins, decorations,
  district/palette themes, storm-weather cosmetics (the §8 catalog, now
  code-resident — §8.4). Spending gold produces a cosmetic and nothing else
  (INV-COS-3).
- **What it is NOT for:** anything that touches progression. No consumables that
  feed mastery, no "skip", no hint pack, no gating (INV-COS-3/6). Gold is a pure
  sink into appearance.

### 2.3 The two-line contrast (the decision, stated once)

> Both **XP** and **gold** are earned only by demonstrated learning and neither
> has any passive source — but they credit **different** things: **gold** comes
> from *activity* (completing a lesson, interleaved practice), while **XP** comes
> from those **plus each mastery star**, so XP additionally rewards depth. **XP is
> a monotonic, non-spendable record** (it never goes down and buys nothing
> directly), driving level/rank and prestige cosmetics; **gold is the spendable
> cosmetic wallet** (it goes down when you buy skins/decor). One number cannot be
> both a spend-safe progress record and a depletable wallet — so there are two.

---

## 3. The XP-vs-gold decision, justified

**DECIDED (D-R3):** XP additionally credits **mastery stars**; gold does not.
Gold is earned from *activity* (completing a lesson, interleaved practice); XP is
earned from those **plus each star gained**. Rationale: this makes the two
resources genuinely different *shapes* — moving your 2nd/3rd star on an
already-complete building raises XP but not gold — so XP measures competence/depth
while gold measures spendable activity, rather than one number displayed twice.

The distinction therefore stands on two independent legs: what *kind* of number
each is (§3.1) and what each *credits* (§3.2). Both are settled.

### 3.1 The core distinction: a monotonic record vs. a depletable wallet

- **XP only ever increases and is never consumed.** It is a permanent record of
  total demonstrated learning — a progress meter that must never fall.
- **Gold increases when you learn and decreases when you spend.** It is a wallet:
  its whole purpose is to be depleted buying cosmetics.

A **single** number cannot serve both roles. If the progress record were
spendable, then buying a cosmetic would visibly reduce "how far you've come,"
which is both a false progress signal and actively demotivating for the anxious
learner this product exists for. If the wallet were unspendable, it could buy
nothing. The moment you want *both* (a) a permanent, spend-safe record of learning
and (b) a currency to spend on cosmetics, you need two numbers. This is the
standard RPG experience-vs-money split, and it is a real, motivated distinction —
not two arbitrary counters.

### 3.2 XP credits mastery depth; gold does not (DECIDED — D-R3)

The two resources have **different earn shapes** — the settled ruling:

- **Gold is earned by the two practice *activities*** — completing a lesson and
  clearing an interleaved session (the decided paths, §2.2). **Stars grant no
  gold.**
- **XP is earned by those same activities *plus* mastery *quality*** — each
  mastery star (§6 row 3), which gold does not credit.

So XP measures demonstrated competence and depth (you earn extra XP for
*mastering*, not merely for *doing*), while gold measures spendable practice
activity. Concretely: earning your 2nd and 3rd star on a building you have already
completed raises XP but not gold — XP rewards going deeper on material you have
already passed. This is what makes the two genuinely different measures rather
than one number shown twice.

### 3.3 Is two resources justified? (settled verdict)

**Yes, on two independent grounds.** (1) The monotonic-record-vs-spendable-wallet
distinction alone requires two numbers: you cannot make one number both a
spend-safe record of progress and a depletable wallet, because spending would make
the progress record fall (§3.1). (2) The decided earn-shape asymmetry (§3.2, D-R3)
makes XP and gold measure genuinely different things — competence/depth vs.
spendable activity — so they are not one number shown twice. The earlier concern
that XP might collapse to "lifetime gold earned" is resolved by the D-R3 ruling:
because stars move XP but not gold, the two do not track in lockstep.

### 3.4 Resolving the gating tension (XP vs. the §8 one-way invariant)

The task flags that **if XP gated content it would collide** with the §8 one-way
invariant (the economy never gates learning). The resolution is a hard rule:

- **XP never gates learning.** Islands, lessons, storms, and mastery are **never**
  functions of XP (or gold). Island access is the prerequisite graph + mastery
  exactly as today (e.g. `NUM.4` is the gateway that opens D2/D3/D4/D10 —
  `Island_Lesson_Themes_Design_Spec.md` §1.5); storm eligibility stays
  `isNeighborhoodReady` (all required nodes mastered `>= 2`). No resource is ever
  an input to any of these (INV-COS-1/2).
- **The only things XP may "unlock" are cosmetics** (a prestige level's granted
  skin/badge). That is cosmetic → cosmetic, which §8 permits: the economy may
  *produce* cosmetics; it may never gate *learning*. To avoid even the appearance
  of gating, XP-milestone cosmetics are modelled as **grants** fired when XP
  crosses a threshold, not as a spend or a lock.
- **XP is not spendable**, so there is no "spend XP to progress" path by
  construction.

---

## 4. What each resource is spent on / used for

| Resource | Number behaves like | Used for | Spendable? |
| --- | --- | --- | --- |
| **XP** | A **monotonic record** (only ever rises) | Player level/rank (a badge) **and** milestone-granted **prestige cosmetics** (earned, never bought) — **D-R1/D-R2, decided**. It does **not** drive the Town Hall's appearance (**D-TH4**: the hall's three construction stages are driven by *lessons completed* on the island, never by XP). | **No** (never debited) |
| **Gold** | A **depletable wallet** (rises on learning, falls on spend) | Buying cosmetics from the catalog (building skins, decor, district/palette themes, storm-weather cosmetics) | **Yes** (atomic, idempotent spend, §8.4) |

Both are earned **only** from demonstrated learning (§6) and both are
**cosmetic-terminal**: neither can ever be turned into a progression advantage
(INV-COS-3/6). The catalog splits into **gold-purchasable** items and
**XP-prestige** items (granted at levels, not for sale); an item is one or the
other, never both — see §8.4 and D-R2.

---

## 5. Cross-cutting principles (inherited, non-negotiable)

These carry over unchanged from §8 / the parent design and constrain everything
below:

1. **One-way and purely cosmetic.** No economy field is an input to mastery,
   completion, placement, diagnostic, lessons, or the storm/checkpoint
   (INV-COS-1/2/3).
2. **Server-authoritative, idempotent grants.** No client path mints, increments,
   or writes a balance. Every grant is a server-verified progression event, keyed
   by a deterministic `event_id`; a replay is a no-op (INV-COS-4, §8.4).
3. **Non-negative, reconstructable balances.** Each `(student, resource)` balance
   equals `sum(grants) - sum(spends)` and is never negative; gold spends are
   rejected on insufficient balance (INV-COS-5). XP is never debited, so its
   balance is monotonic by construction.
4. **No real money.** No IAP, no top-up, no external currency, ever.
5. **No passive/idle income.** Neither resource accrues over time, from idle
   buildings, or from checking in. All earning is a server-verified consequence of
   demonstrated learning (§6).
6. **Tuning lives in one place.** Every number (earn amounts, XP curve, the
   rolling cap, and prices) is a **descriptor constant**, not inline logic — see
   §12. The condition/decay curve that used to sit in this list went out with the
   condition clock (§8.3).

---

## 6. The earn table

Earn triggers, the resource(s) each grants, the shape of the deterministic
idempotency key, and a **magnitude class** (deliberately not a tuned number —
numbers live in the constants table, §12). "One-time" grants fire once ever per
student (monotonic progression makes replay a no-op); the one "repeatable" grant
recurs but each occurrence is idempotent on its own key.

| # | Trigger (server-verified) | XP | Gold | `event_id` shape | Class |
| - | --- | :-: | :-: | --- | --- |
| 1 | **Lesson completed** (a node's building is completed via the lesson path) | ✓ | ✓ | `lesson_complete:{node_id}` | one-time / small |
| 2 | **Interleaved practice cleared** (Town Hall session across all completed skills) | ✓ | ✓ | `interleaved:{session_id}` | repeatable / medium (need-scaled + capped) |
| 3 | **Mastery star gained** (each star: 1★/2★/3★ = `mastery` 1/2/3) | ✓ | ✗ **(none)** | `star:{node_id}:{star_level}` | one-time / small (per star) |

**Gold comes from exactly rows 1 and 2 — the two decided practice paths — and
nothing else.** There is no passive row and no third gold path. Notes:

- **Row 3 (mastery star → XP only, gold none):** the settled earn-shape asymmetry
  (**DECIDED — D-R3**, §3.2): **stars move XP but not gold.** Stars credit learning
  *quality/depth*; gold credits only *activity* (rows 1–2). Earning a 2nd or 3rd
  star on an already-complete building raises XP without raising gold. Note a
  lesson completed at high accuracy fires both row 1 and one-or-more row-3 stars;
  they are distinct credits on distinct keys (no double-count of the same event).
- **Interleaved earning (row 2):** interleaved practice is the one **repeatable**
  earn source for either resource, so it is governed by the anti-farm rule (§7).
  **DECIDED (D-R4): cap-only for MVP** — the structural layer (server-composed
  interleaving) plus a rolling cap (D-R6). The second structural layer, repair-gold
  bounded by island condition, is **withdrawn** with the condition clock (§7, §8.3),
  which leaves the cap carrying more weight than D-R4 assumed.
  Advancement-weighting (a repeat that surfaces no new evidence pays little) is the
  **post-MVP target**, locked as the principle now, but it depends on a signal
  Anthony's session grading does not yet emit (§11.3) — so at MVP the cap is the
  only knob.
- **Event-id scoping:** `event_id` shapes are **per student**; the student is the
  verified Cognito `sub`, carried as a column, never embedded from the payload. The
  ledger keys on the composite `(student_id, event_id, resource_type)` (**D-R5,
  DECIDED** — matches every per-student table in migration `0001`, and a
  single-column `event_id` PK literally cannot hold the two-row grant). A row-1
  event granting *both* XP and gold writes two ledger rows (one per resource) under
  one `event_id`, applied atomically in **one** `grantResources` call (**D-R9,
  DECIDED**: one atomic call, `withTransaction`; §8.5).
- **Where triggers come from:** rows 1 and 3 are **derived from progression events
  the server already computes** (the mastery service's evidence outcome — building
  completion and mastery/stars). Row 2 is emitted by the interleaved-practice
  session on a verified clear (Anthony's lesson-engine lane composes/grades the
  session — §11.3). **The client never asserts an earn**; it can only *report* a
  session clear for the server to verify.
- **Completion vs. test-out seam:** a "star" (row 3) is the monotonic `mastery`
  value 0–3, so the first star credit can fire *before* completion (mastery 1 is
  below the completion bar). For a normal node, "lesson completed" (row 1)
  coincides with mastery crossing 2 — which also fires row-3 stars 1 and 2; a
  **test-out** node completes at **mastery 0** (no stars yet). `completion_status`
  is a generated column (`mastery >= 2`) while test-out completes at 0 (the
  diagnostic/test-out amendments), so the grant-trigger derivation must handle both.

  > **DECIDED 2026-07-26 — testing out does not pay directly.** Row 1 is
  > **retimed**, not duplicated: the learner receives the lesson-completion grant
  > when they later do that node's **mastery practice**, and receives nothing for
  > testing out. **No new `EARN` entry, no new reason code, no new event-id
  > builder** — `lesson_complete:{node_id}` stays the event id and is simply
  > emitted later, so the idempotency scheme (the load-bearing part) gains no
  > fourth key. A compensatory second grant was considered and rejected for
  > exactly that reason. Same total, same key, later.
  >
  > **The trigger is `last_practiced_at`, NOT `mastery >= 2`.** Keying on
  > `mastery >= 2` would withhold gold from a genuine below-bar finish: a learner
  > who works the practice set and lands at mastery 1 has done the lesson and the
  > practice, and `devStageNodeState` maps a built node to
  > `{ mastery: 1, lesson_stage: "done" }` with its own comment saying a below-bar
  > finish still lands on Complete (`apps/web/src/city/citySession.ts`). What
  > actually separates test-out from every other path is **practice evidence**,
  > and `last_practiced_at` is the persisted field that records it — both test-out
  > seeds leave it `null`, every practice path stamps it.
  >
  > **The paid-record is the ledger's own `hasEvent`, not an inference from
  > `placement_estimate`.** The ledger already answers "did we pay
  > `lesson_complete:NUM.S`?" directly and authoritatively, and already backs the
  > dedupe. `placement_estimate >= 2` records what the *diagnostic concluded*, not
  > whether we paid, and it misfiles a learner who tests out and then chooses to
  > do the lesson anyway — which this amendment explicitly permits.
  >
  > Keep the trigger a **pure function of persisted node state** (a predicate
  > inside `deriveEarnEvents`) rather than an event emitted from a
  > practice-completion callback, so it behaves correctly both before and after
  > the ledger is persisted (#96).
  >
  > **Implementation is Evan's, tracked in issue #102 — not implemented here.**
  > Full analysis and line-pinned references live on that issue. Governing
  > progression model: `docs/Contracts_Amendment_Diagnostic_TestOut_Unlock.md`
  > §8.2.
- **Storm/checkpoint:** the neighborhood storm is **checkpoint-only** and grants
  **no** resources — no gold (adding storm gold would violate the two-path gold
  rule, and it is not a mastery-evidence source) and, **DECIDED (D-R10), no XP**
  either. This keeps "storm = checkpoint-only, grants no resources" maximally
  clean; a one-time XP prestige credit may be revisited later if XP prestige (D-R2)
  wants the hook.

---

## 7. Anti-grind (the only volume control now that there is no passive income)

The stated requirement is that students must not be able to farm currency by
grinding their easiest lesson. Because **100% of gold now comes from practice**,
this section carries the full weight of volume control. **DECIDED (D-R4): cap-only
for MVP** — rely on the two structural layers already inherent to the design plus a
rolling cap; advancement-weighting is the post-MVP target and depends on Anthony's
not-yet-existing "advancement/new-evidence" signal (§11.3). The layers, strongest
first (they mirror the parent's §6):

1. **Interleaved practice is composed *by the server across all completed
   skills*.** The student does not choose the questions and there is **no
   single-skill session to repeat**, so "grind the easiest lesson" is not an
   available strategy — it is removed structurally, not policed. (Session
   composition is Anthony's lane — §11.3.)
2. **Lesson-completion gold is one-time per lesson.** Row 1 is monotonic (fires
   once per node ever), so a lesson cannot be re-completed for more gold; the
   ledger's idempotency key makes a replay a no-op.
3. ~~**The repair-linked portion of an interleaved payout is bounded by need.** A
   pristine island has nothing to repair, so the decay-linked part of the payout
   is zero until island condition falls again.~~ **WITHDRAWN 2026-07-29 — the
   condition clock is sunset (§8.3).** There is no repair portion to bound, so this
   layer no longer exists. **Note what that costs: this layer was the only thing
   rate-limiting the repeatable path "without a visible timer", so layer 4 below is
   now the sole explicit volume control on the only repeatable income the game has.**
   Kept struck through rather than deleted, because a reader who remembers four
   layers should be able to see which one went.
4. **A rolling cap as the backstop — and, with passive income gone and layer 3
   withdrawn, the only explicit volume control.** **DECIDED (D-R6): the cap covers
   the repeatable source only** — interleaved practice (row 2), **both its gold and
   its XP** —
   while the one-time grants (rows 1 and 3) are left **uncapped** (they are
   monotonically bounded already, so capping them would throttle honest first-time
   progress). The window and size are §12 tuning constants, not a design call.
   Because there is no idle income, the cap plus layer 1 are the whole story: a
   student earns by doing genuine, server-composed practice, up to a per-window
   ceiling.

XP's one-time sources (rows 1 and 3) are naturally bounded (monotonic, once each);
only the interleaved source (row 2) is repeatable, and the D-R6 cap covers both its
gold and its XP, so neither resource is farmable by repetition. (Post-MVP,
advancement-weighting will further reward genuine new evidence over empty
repetition — §11.3.)

---

## 8. Data model (ported onto the real stack)

§8 was written for Supabase with RLS and a single `balance` column. The
**invariants survive; the mechanics change** to match `db/migrations/*` and
`packages/db`: plain Postgres on Aurora Serverless v2 reached over the RDS Data
API, **no RLS/policies**, the Lambda as the only DB caller scoping every row by
the verified Cognito `sub`, and a least-privilege `app_service` role that owns no
tables. All DDL below is **illustrative/PROPOSED** — Gabe authors the live
migration (§8.6 / OWNERS.md); **do not create a migration file from this doc.**
There is **no** generator/collector table — there is no passive income to persist.

### 8.1 Wallet — keyed by resource type (composite key)

The wallet is **not** a single balance column. It is one row per
`(student_id, resource_type)`:

```sql
-- PROPOSED / illustrative. Not a live migration. No RLS (server scopes by sub).
create type public.resource_type as enum ('xp', 'gold');   -- exactly two
create type public.economy_txn_kind as enum ('grant', 'spend');

create table public.resource_wallet (
  student_id     uuid not null,               -- the verified Cognito sub
  resource_type  public.resource_type not null,
  balance        bigint not null default 0 check (balance >= 0),
  updated_at     timestamptz not null default now(),
  primary key (student_id, resource_type)
);
```

- XP rows are only ever incremented (no spend path writes them — enforced in the
  service, §8.5). Gold rows go up and down but stay `>= 0`.

### 8.2 Ledger — append-only, idempotent, per resource

```sql
create table public.resource_ledger (
  student_id     uuid not null,               -- verified sub, never payload
  event_id       text not null,               -- deterministic idempotency key (§6)
  resource_type  public.resource_type not null,
  kind           public.economy_txn_kind not null,
  amount         bigint not null check (amount > 0),   -- kind carries the sign
  reason_code    text not null,               -- 'lesson_complete' | 'interleaved' | 'purchase:<cosmetic_id>' | ...
  cosmetic_id    text,                         -- set on 'spend' (gold), null on 'grant'
  created_at     timestamptz not null default now(),
  primary key (student_id, event_id, resource_type),   -- D-R5, DECIDED: composite PK
  check ((kind = 'spend') = (cosmetic_id is not null)),
  check (kind = 'grant' or resource_type = 'gold')      -- XP is never spent
);
```

- `balance == sum(grant.amount) - sum(spend.amount)` per `(student_id,
  resource_type)`; a duplicate `(student_id, event_id, resource_type)` is a no-op
  (idempotent). The XP-never-spent rule is a DB check, belt-and-suspenders with the
  service.

### 8.3 ~~Island-condition state~~ — WITHDRAWN 2026-07-29, the condition clock is sunset

**THE RULING (the team lead, 2026-07-29, verbatim): *"i think we're gonna sunset
condition clock - don't really think it makes sense in the new model."*** The whole
section goes, and **D-R7 is withdrawn with it** — there is no island-scoped
`last_restored_at`, no `island_condition_state` table, and no economy read of
condition at all.

**What it was.** The economy read island condition to need-scale the repair portion
of an interleaved payout (§7 layer 3, also withdrawn). Condition was derived from one
persisted timestamp per island, `last_restored_at`, which a cleared interleaved
session set to `now`.

**Why it went, which is the "new model" the ruling names.** The
[no-generation ruling](2026-07-29-era-resource-model-design.md) had already removed
every other wall-clock-keyed channel: buildings do not produce, there is no trickle,
no storage cap and no offline accrual. The repair term was the last magnitude in the
economy that answered *"how long since you last played?"* rather than *"what have you
done?"*, which left it arguing against the model around it rather than within it.

**What replaced it: nothing, deliberately.** A crisis mechanic that may reuse the
decay-and-repair idea is under design and is not specified; it is not anticipated
here. The 30-gold repair term was **dropped rather than folded into the base**, so
interleaved practice now pays a flat `EARN.interleaved` (see §12).

**Not to be confused with the legacy decay that survives.** O-5 scales a frozen civic
building's contribution by `0.9 ^ (eras behind the current era)`, floored at `0.5`.
That is keyed on **eras advanced** — a pure function of learning state — and is
untouched by this withdrawal. The two mechanics share the word "decay" and nothing
else.

**Code:** `condition.ts` is deleted, `CONDITION` is out of `constants.ts`,
`EconomyDevSnapshot.last_restored_at_ms` is gone, and `ECONOMY_DEV_SCHEMA_VERSION` is
bumped to **2** so a stored v1 wallet is orphaned rather than part-restored.

### 8.4 Cosmetic catalog lives in CODE (descriptors), not a DB table

This project is descriptor-registry driven and has no admin tooling, so the
catalog is **not** a DB table. It is a code descriptor registry (in the proposed
`packages/economy` — §13), mirroring how neighborhoods/building archetypes are
descriptors in `engines/game/src/descriptors.ts`:

```ts
// PROPOSED. Illustrative. Cosmetic catalog as code descriptors.
export type CosmeticAcquisition =
  | { via: "gold"; cost: number }             // purchasable with gold
  | { via: "xp_prestige"; xp_level: number }; // granted at an XP level (never sold)

export interface CosmeticDescriptor {
  cosmetic_id: string;
  display_name: string;
  category: string;                            // 'building_skin' | 'district_theme' | ...
  effect_class: "cosmetic";                    // exhaustive: economy only makes cosmetics
  acquisition: CosmeticAcquisition;            // gold price OR xp-prestige level, never both
}
```

- **The server validates prices/levels from these same descriptors** — the client
  never supplies a price. A gold purchase reads `acquisition.cost`; an XP-prestige
  item is granted (not sold) when XP crosses `acquisition.xp_level`. Because the
  catalog is code, retuning prices or adding items is a code change with no
  migration.
- **DECIDED (D-R1/D-R2):** XP drives a **player level/rank** *and* a **small
  earned-only prestige set** — one granted skin/badge at a **few** XP milestones
  (`via: "xp_prestige"`); **everything else is gold-purchasable** (`via: "gold"`).
  The split is just descriptors, so it is tunable without a migration. This gives
  XP a real, cosmetic-only payoff and never gates learning (§3.4, INV-COS-1).
- `owned_cosmetic` / `equipped_cosmetic` remain tables (they are per-student
  state), but `cosmetic_catalog` as a table is **dropped** from the §8 port.

```sql
create table public.owned_cosmetic (
  student_id           uuid not null,
  cosmetic_id          text not null,          -- validated against the code catalog
  acquired_at          timestamptz not null default now(),
  acquired_via_event_id text not null,         -- ledger spend (gold) or grant (xp prestige)
  primary key (student_id, cosmetic_id)
);

create table public.equipped_cosmetic (
  student_id   uuid not null,
  slot         text not null,                  -- 'building:NUM.S' | 'district:D1' | ...
  cosmetic_id  text not null,
  equipped_at  timestamptz not null default now(),
  primary key (student_id, slot)
);
```

### 8.5 APIs (ported §8.4; still §8's four API groups — no fifth "collect" endpoint)

Same authoritative shape as §8, generalized to two resources and re-homed on the
Lambda. `student_id` is always the verified `sub`, never the payload. There are
**four** API groups — grant, spend, read, equip — the same count as ratified §8;
**no `collect`/passive endpoint is added**, because there is no passive income.

```ts
// PROPOSED. Authoritative, server-side, idempotent by event_id.
// Grants a SET of resources atomically under one event_id (the porting change:
// one learning event can raise both XP and gold, e.g. lesson_complete).
grantResources(input: {
  event_id: string;                            // deterministic (§6)
  reason_code: string;                         // 'lesson_complete' | 'interleaved' | 'star' | ...
  amounts: Partial<Record<"xp" | "gold", number>>;  // each > 0; XP never negative
}): Promise<{
  balances: Record<"xp" | "gold", number>;     // post-grant
  applied: boolean;                            // false if event_id already seen
}>

// Atomic gold spend: debit gold + credit ownership in ONE Data API transaction
// (packages/db withTransaction). Rejects on insufficient gold, no partial state,
// idempotent by event_id. Price is read from the CODE catalog, not the payload.
purchaseCosmetic(input: {
  event_id: string;
  cosmetic_id: string;                         // must exist + be gold-acquirable in the code catalog
}): Promise<{
  status: "purchased" | "already_owned" | "insufficient_gold" | "unknown_cosmetic" | "not_purchasable";
  balances: Record<"xp" | "gold", number>;
  owned: boolean;
}>

// Read wallet (both resources) + inventory + XP level.
getWallet(): Promise<{
  balances: Record<"xp" | "gold", number>;
  xp_level: number;                            // derived from XP via the curve descriptor
}>
getInventory(): Promise<{
  owned: string[]; equipped: Record<string, string>;  // slot -> cosmetic_id
  catalog: CosmeticDescriptor[];               // from code, for the shop UI
}>

// Equip is now a NORMAL authed endpoint (NOT an RLS client write): the Lambda
// verifies the sub owns the cosmetic before writing equipped_cosmetic. This is
// the §8 "equipCosmetic becomes a normal authed endpoint" port.
equipCosmetic(input: { slot: string; cosmetic_id: string }): Promise<{
  slot: string; cosmetic_id: string;
}>
```

- **Atomicity/idempotency** use the exact Data API transaction primitive already
  in the repo (`packages/db` `withTransaction`, `json()` binds), mirroring how the
  diagnostic service writes. `grantResources` is **one atomic call** that writes
  the XP and gold rows together or not at all (**D-R9, DECIDED**; INV-COS-5) and is
  idempotent on `event_id`; `purchaseCosmetic` is atomic + idempotent.
- **Equip is server-verified ownership**, not RLS `with check` — the no-RLS port
  moves the "must own it" guard into the Lambda (a `WHERE exists (... owned_cosmetic
  ...)` on the write), exactly as the diagnostic service scopes every row by the
  verified sub.

### 8.6 Ownership

Per `docs/Contracts.md` §8.5 / OWNERS.md: **Gabe** authors the live migration
(§8.1–8.3), shared types, and the service APIs (§8.5); **Evan** owns the game-side
consumption (§11.4).

---

## 9. HUD surface

Both resources live in the always-on HUD (top corners), consistent with
`Immersive_City_Shell_Spec.md` §5 and `City_Art_Bible.md` §8 (dark frosted
"drafting glass", sticker icons **always paired with a text label**, never colour
alone):

- **Gold:** a labelled balance ("Gold: N") with the shop entry (spend). Reward
  grants animate as the existing **reward arc** to the HUD counter
  (`City_Art_Bible.md` §6), reduced-motion-aware. There is **no** collect
  affordance, no idle-income bubble on any building, and nothing to "tap" — gold
  only ever appears as a consequence of completing a lesson or clearing interleaved
  practice.
- **XP:** a labelled **level + progress-to-next-level** meter ("Level 4 ·
  Journeyman", with a progress bar toward the next level). XP has no spend
  affordance and no collect affordance.
- **Town Hall detail card** shows XP and gold together and hosts the
  interleaved-practice launch — specified in the Town Hall spec (§6 and §9 there).
  This spec owns the *numbers*; that spec owns the *card*. **It also lists an island-
  condition readout, which is stale**: there is no condition value to display since
  the clock was sunset (§8.3), and that edit is owed in the Town Hall spec.
- **DOM mirror is the semantic source of truth.** Both resources, the XP level, and
  the shop are real, labelled, focusable DOM; the 3D/canvas is decorative
  (`aria-hidden`). Grants are announced politely, purchases/level-ups politely
  (`announcements.ts`).
- **Fail-closed & no optimistic spend:** balances/ownership change only after the
  server confirms; the HUD never pre-decrements gold or shows an item owned before
  `purchaseCosmetic` returns (D1 spec §10, restated).

---

## 10. Decisions — all resolved (2026-07-25)

Every resource-model decision (D-R1..D-R10) is **settled**; see
`2026-07-25-townhall-resource-decision-brief.md` for the triage rationale. Each is
recorded as settled at the section an implementer actually reads (not only here);
the IDs are **retired in place** (nothing renumbered). This is now a log, not an
open queue.

| ID | Ruling (settled) | Recorded at |
| --- | --- | --- |
| D-R1 | XP drives a player level/rank **and** milestone-granted prestige cosmetics (cosmetic-only; never gates learning) | §2.1, §3.4, §8.4 |
| D-R2 | A **small** earned-only prestige set at a few XP milestones; everything else gold-purchasable; tunable (descriptors) | §8.4 |
| D-R3 | XP credits mastery stars; gold does not | §3.2 |
| D-R4 | Anti-farm = **cap-only for MVP** (structural layers + rolling cap); advancement-weighting is the post-MVP target (needs Anthony's signal) | §7 |
| D-R5 | Ledger PK = composite `(student_id, event_id, resource_type)` | §6, §8.2 |
| D-R6 | The rolling cap covers the **repeatable source only** (row 2 gold + XP); one-time grants uncapped; window/size are §12 constants | §7 |
| ~~D-R7~~ | ~~A **new island-scoped `last_restored_at`** (not per-node `last_practiced_at`)~~ **WITHDRAWN 2026-07-29: the condition clock is sunset, so there is no timestamp to scope.** Row kept so the id is never reused | §8.3 |
| D-R8 | **Ship the shop with the economy** — the code-resident catalog dissolves the parent's "gold with nothing to buy" worry | §13, parent §8 D4 |
| D-R9 | **One atomic `grantResources` call** (one `event_id`, two rows, `withTransaction`) | §6, §8.5 |
| D-R10 | **No XP grant for clearing the storm** — storm stays checkpoint-only, grants no resources | §6 |

**Still genuinely open — cross-lane only (not resource-model design gaps):**
Anthony's "advancement / new-evidence" signal that the post-MVP D-R4 rule needs
(§11.3); the `NUM.S → City Bank` coordinated rename (§11.5); and interleaved item
selection/grading ownership (§11.3). **Tuning** (earn magnitudes, XP curve, cap
window/size, catalog scope/prices, decay curve) lives in the one §12 constants
table, not here.

---

## 11. Cross-lane dependencies & contract interactions (must hold)

### 11.1 Economy is never mastery (mastery firewall)

Neither XP nor gold is ever an input to `mastery`, `completion_status`,
`placement_estimate`, the diagnostic/assessment metric, or
`isNeighborhoodReady`/`neighborhood_state.checkpoint_cleared` (INV-COS-1/2,
`Mastery_Scoring_Spec.md`). The economy **reads** progression events to decide
grants and **writes** only economy tables. Note XP is a *separate* economy-lane
number and is explicitly **not** the ratified monotonic `mastery` field, even
though both are monotonic — they must never be conflated or share a writer. The
mastery service, diagnostic engine, and `isNeighborhoodReady` import nothing from
the economy module (INV-COS-1, a dependency-lint test).

### 11.2 Decay must NOT touch monotonic mastery — now vacuous for condition, live for O-5

**The economy no longer reads island condition at all** (§8.3, sunset 2026-07-29), so
the cross-lane risk this section was written about is gone by construction rather than
by discipline: there is no repair-gold tie, no `last_restored_at`, and nothing for a
condition value to reach into. The one cross-lane item it left open — confirming with
the mastery owner that island condition stays visual-only — **no longer needs asking.**

**The rule itself is retained, because a second decay inherited it.** O-5 scales a
frozen civic building's *capacity contribution* by `0.9 ^ (eras behind)`, floored at
`0.5` (`packages/economy/src/civicBuilding.ts`). It **never** lowers `mastery`, which
is monotonic and does not decay (`Mastery_Scoring_Spec.md` §8, Contracts §1). The
direction is one-way in the same sense the withdrawn one was: **learning state decides
the decay factor, and the decay factor never decides learning state.**

The two decays differ on the axis that made the first one contentious. Island
condition was keyed on **wall-clock time away**; O-5 is keyed on **eras advanced**,
which a player only moves by learning. INV-ERA-3 — *"happiness responds to how you
built, never to how fast you study"* — is why the second survives the ruling that
removed the first.

### 11.3 Interleaved practice selection + grading is Anthony's lane

This spec specifies only the **economy requirement**: on a server-verified clear of
an interleaved session (composed across all completed skills), emit the row-2 grant
keyed by the session id. **How the set is drawn, presented, graded, and whether it
writes mastery evidence is Anthony's lesson-engine lane** (parent §3.2, D5). The
economy consumes the clear event; it does not compose or grade the set. The launch
surface + seam is the Town Hall spec (§6 there).

### 11.4 Economy ownership + package boundaries (Gabe / Evan; §8 / Blueprint)

- **Gabe** owns the shared economy types, the tables/migrations (§8.1–8.3, §8.6),
  and the economy service APIs (§8.5). **Evan** owns the game-side consumption: earn
  triggers surfaced from the game/lesson seams, the HUD (§9), the shop UI, and the
  `equipCosmetic` call.
- Per `Game_Architecture_Blueprint.md` §4, `@cr/game` stays framework-free and holds
  **no** wallet/balance types, and `@cr/state-schema` gains economy types only as the
  **§8 post-MVP expansion** (§8.3 there), not the frozen MVP schema. The pure economy
  rules core lives in a new `packages/economy` (§13), not in `@cr/game`.

### 11.5 The `NUM.S` → "City Bank" rename (parent §7.3) — no longer a dependency here

The parent design vacated the "Town Hall" building name on `NUM.S`, which is now named
**City Bank** (`buildingAssets.ts`, 2026-07-27), while the hub is labelled **"Civic
Center"**. Both names the HUD and the hub surface speak are therefore final and
unambiguous, so **this spec's dependency is discharged.** What remains of the rename is
lesson prose + item-bank theming in Anthony's lane (parent §7.3), which no economy
surface reads.

---

## 12. Tuning constants (one descriptor table)

No numbers appear in this spec by design. Every tunable belongs in **one economy
descriptor constants table** (proposed `packages/economy`), retunable without a
migration or backfill: the earn amounts per trigger (§6), the XP → level curve +
level titles, the rolling-cap window (e.g. ~24h) + size (§7), the cosmetic
prices/XP-prestige levels (as `CosmeticDescriptor.acquisition`, §8.4). There is
**no** passive rate/capacity/fill-window constant — there is no passive income — and
**no island-condition/decay constant**, because the condition clock is sunset (§8.3).
The `0.9 ^ (eras behind)` legacy-decay constants that DO live there belong to O-5 and
are keyed on eras advanced, not on wall-clock time. First guesses will be wrong; keeping them in
one place makes retuning a code change that applies retroactively.

---

## 13. Architecture (agreed) — where the code lives

Per the agreed plan and mirroring the diagnostic stack:

- **`packages/economy` — a pure rules core with zero I/O.** Grant/spend math, the
  XP-level curve, the anti-grind rolling cap, the cosmetic-catalog descriptors +
  price validation, the era materials and the two capacities, and the civic
  catalogue with its purchase / teardown / legacy-decay math. No DB, no network, no
  framework — unit-testable like `@cr/game`. There is no passive-accrual math because
  there is no passive income, and no condition→repair derivation because the
  condition clock is sunset (§8.3).
- **`services/economy-api` — a Lambda mirroring `services/diagnostic-api`.** A Hono
  app (`app.ts`) with authed routes, a `lambda.ts` handler, an `env.ts` composition
  root building the Data API client + Cognito authenticator, and a reads/writes
  module scoping every row by the verified `sub` — the SAME shape as
  `services/diagnostic-api` (`app.ts`/`lambda.ts`/`env.ts`/`reads.ts`) over
  `packages/db`.
- **An in-memory dev adapter calling the SAME pure core.** The app runs fully
  in-memory by default (like `citySession.ts`); the dev economy adapter calls
  `packages/economy` directly with an in-memory wallet/ledger, so the loop is
  demonstrable with no backend. **`isServerBacked` requires BOTH Cognito auth and a
  configured economy API URL** (mirroring the city loader's
  in-memory-vs-`loadCityFromApi` split); absent either, the in-memory core runs.
- Because both the dev adapter and the Lambda call the one pure core, grant/spend
  semantics can never drift between demo and production.
- **Rollout (D-R8, DECIDED): ship the shop together with the economy.** Because the
  cosmetic catalog is code-resident (§8.4), there is no reason to mint gold with
  nothing to buy — the parent's "empty reward" worry (parent §8 D4) is dissolved.
  The shop UI ships with the catalog descriptors.

---

## 14. Self-review (consistency check)

- **No passive income anywhere.** No generator/collector, no `last_collected_at`,
  no fill-window/capacity, no `collectResources` API, no collect UI, no "building
  type → resource / stars → rate" mapping, no fifth API. Gold is rows 1 and 2 only
  (§6); §5 principle 5 states it outright.
- **All decisions settled.** §10 is now a resolved-decisions log, not an open
  queue: D-R1..D-R10 are each recorded as settled at the section an implementer
  reads (§3/§6/§7/§8/§13). The only genuinely-open items are cross-lane seams
  (§11.3, §11.5) plus the post-MVP advancement signal — not design gaps. Nothing
  renumbered; IDs retired in place.
- **No numbers.** All magnitudes are classes (§6) or constants (§12).
- **XP-vs-gold distinction is settled and coherent.** It rests on two independent
  legs — monotonic-record vs. spendable-wallet (§3.1) and the decided earn-shape
  asymmetry (D-R3, §3.2: XP credits mastery stars, gold does not) — so the two are
  genuinely different measures, not one number shown twice.
- **Invariants intact.** One-way/cosmetic-only (§5, §11.1); XP-non-spendable
  enforced twice (DB check §8.2 + service §8.5); balances non-negative +
  reconstructable (§8.1–8.2).
- **No repair loop to keep coherent.** The condition clock is sunset (§8.3), so
  interleaved practice pays a flat amount and the economy reads no clock of any
  kind. The surviving decay is O-5's, keyed on eras advanced (§11.2).

---

## 15. References

- `docs/superpowers/specs/2026-07-25-island-decay-and-gold-design.md` — parent
  (gold from lesson completion + interleaved practice; island decay; Town Hall;
  anti-grind §6 — no passive income there either).
- `docs/superpowers/specs/2026-07-25-town-hall-design.md` — the Town Hall (launch
  surface for interleaved practice; XP/gold display). **Its condition-display text
  is stale as of 2026-07-29** and owes an edit; see §8.3.
- `docs/Contracts.md` §2 (mastery), §3 (write-mapping), §5 (Aurora/no-RLS), §8
  (cosmetic economy) + `docs/Contracts_Amendment_Cosmetic_Economy.md`.
- `docs/Mastery_Scoring_Spec.md` — monotonic mastery, no decay, `review_due`.
- `docs/superpowers/specs/Game_Architecture_Blueprint.md` — module boundaries,
  descriptor-registry pattern, economy deferral.
- `db/migrations/0001_core_contracts.sql` .. `0003_walk_persistence.sql` — the real
  Aurora/no-RLS schema + `app_service` grant pattern this ports onto.
- `packages/db/src/data-api.ts` — the Data API executor + `withTransaction` +
  `json()` binds the economy service reuses.
- `services/diagnostic-api/src/{app,lambda,env,reads}.ts` — the Lambda service shape
  `services/economy-api` mirrors.
- `apps/web/src/city/{citySession.ts,apiCityLoad.ts,types.ts}` — the in-memory
  session + server-backed loader + `isServerBacked` pattern the economy adapter
  mirrors.
