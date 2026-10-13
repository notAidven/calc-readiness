# Era resource model — the decision record

**Status: DECIDED for the spine, and the one place the resource decisions live.** Gabe,
2026-07-29. Reviewer: `notAidven`.

> **AMENDED 2026-07-29, same day**, by the team lead's recognisability ruling on material
> names, which arrived after the spine merged as `#227`. **§4.1a** carries the ruling, the
> before/after table for all ten eras and the reasoning on the two the lead left open;
> **§4.1b** carries the attribution change (the identity slot is Evan's, seven of the names
> are now the lead's); **§4.1c** records the seven era documents that are stale as a result;
> **§1a** records how far the rename reached into durable data. Nothing about the model,
> the ledger, the capacities or the rate changed — only the names.

> **AMENDED AGAIN THE SAME DAY, and this one changes the model.** §4.5's aggregation is
> **re-ruled** by the team lead: livability is a **single pool** and housing and food are not
> tracked separately, where this document first shipped `min(Σ housing, Σ food)`. The superseded
> argument is kept in place there rather than deleted, because what it was covering up — seven
> catalogues holding a building nobody would ever build — is the useful part. D-ERA24 is now
> asserted over all ten authored catalogues by `test/eraCivicCatalogueDominance.test.ts`, and six
> of them were rebalanced to satisfy it.

This is the framework document for **era-themed materials** (stone, and the nine that
follow) in `@cr/economy`. It exists because the era design ruled a resource model
(`2026-07-27-era-progression-design.md` §7, **D-ERA13**) and then left five numbers and
four shapes open, all of them on the economy owner (§17 **O-4**, **O-5**, **O-6**;
`OWNERS.md` gives the economy shared types, tables, grants, migrations and service APIs to
Gabe). Ten `civic-buildings.md` documents are blocked on the shape rather than on the
numbers, so the shape is what this settles.

**What this document is not.** It is not an implementation plan for the whole economy, and
it deliberately does not author civic-building catalogues or per-era cost tables. §8 names
what is left for a second pass, and why each thing is left.

> **2026-07-29 — §5 is now a RULING, not a deferral.** It was written as the one open question
> on this record owned by the team lead ("the production trickle"). The lead has ruled: **there
> is no generation economy — every unit of every resource is earned by completing a lesson or a
> practice set, and buildings do not produce income.** §5 states it, records what it supersedes
> in the era design, and works out its five consequences; §7 item 5 is closed against it. This
> **supersedes D-ERA13's trickle clause** and the two §7 tuning rows that priced it, so it is a
> change to `2026-07-27-era-progression-design.md` and not merely a confirmation of it.

---

## 0. Two premises the task was briefed on that are no longer true

Both were true when the issues were filed and are false at `02c6f4c`. They are recorded
first because the first of them was framed as the decision this work turns on.

**The economy IS persisted. Issue `#96` is fixed.** `apps/web/src/devPersistence/economyPersistence.ts`
(397 lines) and its 556-line test file landed in `df09175`, "Persist the economy through a
refresh, so a reload stops rewriting the wallet (#96)". The ledger, the prestige set, the
equipped map and the island restore clock are a stored `EconomyDevSnapshot` behind a schema
version, `useEconomy` primes its fired-event set from `EconomyClient.appliedEventIds()`
(the persisted ledger) rather than from a set a refresh emptied, and the store is inert
whenever the app could be server-backed. So the described consequences — refunded gold,
deleted cosmetics, a cap that a refresh bypasses, a full-total toast on every load — are
all already gone.

**Lesson-completion gold no longer fires on the test-out seam. Issue `#102` is fixed.**
`04b12a6` conjoins the completion union with practice evidence (`last_practiced_at`), so a
learner who tests out of six nodes is no longer paid for work never done.

**What follows from that** is §1.

---

## 1. RULING — persistence comes WITH, because it already came first

**Decision: the resource spine extends the existing persistence path in the same change,
and owes it exactly one thing.**

The question as briefed ("first, with, or deferred?") assumed there was nothing there. There
is, and it is good: an append-only ledger as the single reconstructable source of truth,
all-or-nothing parsing behind an independent schema version, write-through saves, and every
restored row re-checked against the core's own invariants. A material resource built on
*that* inherits none of `#96`'s consequences.

What it does inherit is one trap, and it is the kind that reports green:

```ts
const RESOURCE_TYPES: readonly unknown[] = ["xp", "gold"];   // economyPersistence.ts:112
```

That allow-list is inside `isLedgerEntry`, and `parseStoredEconomy` is **all-or-nothing**.
So a stored ledger containing a single `stone` row does not lose the stone — it fails the
guard, discards **the whole blob**, and hands back a null snapshot. Every symptom of `#96`
returns in full the moment a material is minted, and no test in the tree would have said
so, because no test in the tree mints a material.

So persistence is not a prerequisite to *build*; it is a prerequisite to *not silently
break*. Two consequences, both implemented here:

1. **The allow-list is derived, not extended by hand.** It reads `ECONOMY_RESOURCES` out of
   `@cr/economy`, so a material added to the union is admitted by the parser without anyone
   remembering to edit a second list. A hand-maintained copy is the same defect deferred.
2. **`ECONOMY_DEV_SCHEMA_VERSION` is NOT bumped.** Widening an allow-list is backward
   compatible: a v1 blob written before materials existed contains no material rows and
   parses identically afterwards. Bumping would discard every saved wallet in exchange for
   nothing. `economyPersistence.test.ts` pins both directions — a material row round-trips,
   and a pre-material blob still loads.

### 1a. How far the 2026-07-29 rename reached into durable data: one surface

Renaming a `MaterialId` renames a value that gets **stored**, so this was checked surface by
surface rather than assumed. The answer is that it reached exactly one, and barely:

| Surface | Reached? |
| --- | --- |
| **`localStorage` (`cr.devEconomy.v1.*`)** | **YES.** `resource_type` on a stored ledger row is a `MaterialId`. A saved blob holding `flint` now fails the allow-list, and the all-or-nothing parse discards it |
| Reason codes | No. `lesson_complete`, `interleaved`, `star`, `purchase:<cosmetic_id>`, `build:<placement_id>`, `era_advance:<era_id>` — the era-advance one keys on the **era id**, which did not change |
| Event ids | No. Built from node id, session id, star level, cosmetic id, placement id — never from a material |
| The item-bank snapshots | No. Not one contains any material name. *(This row said **eight**; there are **NINE** `.snap` files in `packages/item-bank/src/__snapshots__/` as of 2026-07-29 — `d2`, `d3`, `d5`, `d7`, `d8`, `interactive`, `product`, `template`, `walk`. The conclusion is unchanged and was re-checked by enumerating them.)* |
| `db/migrations`, `@cr/state-schema` | No. Materials never left `@cr/economy`; the frozen package is still unfrozen for economy wire types in a later phase |
| Hand-written stored-blob fixtures | No. `economyPersistence.test.ts`'s forged blobs use `gold`, `xp`, `mana`, `unobtanium` |

**The blast radius on the one surface is minutes.** The store is dev-only, `localStorage`-only,
inert whenever the app could be server-backed, and there is no economy service — so the only
blobs at risk were written by a developer's browser between `#227` merging (16:49 UTC) and this
change. **Which is the argument for doing the rename today rather than next week**: the same
rename after a server economy ships is a data migration, and after the ledger is
`resource_grant_ledger` rows in Aurora it is a migration with a rollback plan.

**Still no schema bump, and this direction owes the argument the widening did not** — it is a
*narrowing*, so it genuinely breaks old blobs. It is not bumped because the outcome is
identical either way (the whole blob goes) and the mechanism is tidier: the allow-list path
**deletes** the unusable blob, where a bump changes the storage key and orphans it in
`localStorage` indefinitely, unread and undeleted. Pinned by a test that asserts a pre-rename
`flint` blob is discarded *and removed*, and that the app comes up on an empty wallet rather
than a half-restored one.

**What the spine deliberately does not do** is make materials durable on the *server*.
There is no economy service (`services/` holds the diagnostic API, the diagnostic runtime
and the scorer), and the dev store is emphatically not a security boundary — it is
hand-editable `localStorage`. Spend authority belongs to `services/economy-api`, which does
not exist. That is unchanged by this work and is the same position `#96` shipped.

---

## 2. RULING — materials live on the ONE existing ledger

**Decision: a material is a new value on the existing `LedgerEntry.resource_type` axis, not
a second ledger and not a second store.**

`LedgerEntry.resource_type` widens from `ResourceType` (`"xp" | "gold"`) to
`EconomyResource` (`ResourceType | MaterialId`). Nothing else about the row shape changes —
in particular **no new field**, because the subject of a spend already travels in
`reason_code` (`purchase:<cosmetic_id>` today, `build:<placement_id>` for a material) and
identity already travels in `event_id`.

**Why not a parallel material ledger.** Five behaviours are already correct and tested
here, and a sibling ledger duplicates all five and then lets them drift: idempotency on a
deterministic `event_id`, atomic all-or-nothing application, balances derived rather than
stored, the row invariants, and the persistence path. The `#102` retiming is the concrete
argument: because the material lump is an amount inside `lessonCompleteGrant`, it fires on
the seam `#102` moved the grant to, and a learner who tests out of six nodes is not handed
600 stone. A parallel ledger with its own lesson-completion trigger would have had to
rediscover that bug.

**Why the READ model still splits.** `computeBalances` keeps its exact meaning — the
`xp`/`gold` wallet — and materials get `computeMaterialBalances`. That is not a hedge; the
two projections have different lifetimes. XP is permanent and monotonic and is the level
curve's input. A material is era-scoped, spendable, and converts away at an era boundary.
Folding materials into `Balances = Record<ResourceType, number>` would make every balance
snapshot in the system a twelve-key record of which eleven keys are structurally zero, and
would put a `stone` field on the XP level readout. `computeBalances` skipping material rows
is pinned by a test rather than left as a comment.

**Why the material axis stops at the client seam.** `OWNERS.md` gives Gabe the shared types,
tables, grants, migrations and service APIs, and Evan the game-side consumption — the store
UI and the equip call. So this change ends at `EconomyClient`/`WalletView`, which is the
seam. `EconomyHud` is not touched, and a material readout in the DOM is Evan's (it is also
required: era one §6 says every capacity, shortfall and count lives in the DOM, because the
canvas is `aria-hidden`).

---

## 3. RULING — the ledger invariant is loosened along the reason code, not the resource

The row invariant `assertLedgerEntryInvariant` said two things, and a material spend
violates both as written:

| Old clause | Why a material spend breaks it |
| --- | --- |
| `a spend row must be gold` | a stone spend is not gold |
| `cosmetic_id is set iff kind === "spend"` | placing a Family Lodge buys no cosmetic |

**Decision: re-key both clauses off what they are actually about.**

- **XP is never spendable** becomes *a spend of a NON-SPENDABLE resource throws*, with
  `NON_SPENDABLE_RESOURCES = {xp}` as the one-element set it has always been. Gold and
  every material are spendable; XP is not. The defect the clause was written for is
  unchanged, and `spend.test.ts`'s "XP is never spendable" case still fails at it.
- **`cosmetic_id` is set iff the row is a cosmetic purchase**, decided by
  `reason_code.startsWith("purchase:")` rather than by `kind` or by resource. This is
  strictly stronger than the old clause in one way that matters: a *gold* spend that forgot
  its `cosmetic_id` still throws, and so does a grant that carries one.

Keying on the reason code rather than on `gold` is deliberate future-proofing. D-ERA13 drops
gold eventually (§6), at which point a cosmetic is bought with a material — under a
resource-keyed clause that migration would have to loosen this line a second time, and a
line loosened twice is a line nobody trusts.

**Both loosened clauses are proved by injection**, per `.cursor/rules/qa-verification.mdc`:
forcing a material into `NON_SPENDABLE_RESOURCES`, and stripping the `purchase:` prefix
check, each make named assertions fail. A guard changed without a demonstrated red is not
evidence.

---

## 4. THE RESOURCE MODEL

### 4.1 Per-era, and only one is authored

**Decision: materials are per-era identities in a registry keyed by `EraId`, with the
`EraLandBudget` shape (D-ERA25) reused deliberately.**

```ts
export type EraMaterial =
  | { readonly status: "authored"; readonly material: MaterialIdentity }
  | { readonly status: "proposed"; readonly proposed_id: MaterialId; readonly owner: "Evan" };
```

`ERA_MATERIALS` is a `Record<EraId, EraMaterial>`, so it is **total over `ERA_SEQUENCE` by
compiler**: adding an era without a material entry does not typecheck. Era one is
`authored` (stone). The other nine are `proposed`, and **nothing can mint from a `proposed`
entry** — the compiler will not let a caller read a `MaterialIdentity` off one, which is
exactly the guard `EraLandBudget`'s `unauthored` variant provides for a radius nobody
authored.

**Why the nine are recorded at all rather than left blank.** All ten identity SLOTS are
Evan's (O-6's identity half), and all ten are written down in his era documents. Recording
them keeps the second half of O-6 — the rate, mine — readable next to the thing it converts.
Promoting one to `authored` remains his call. **The names, however, are no longer all his:
see §4.1a.**

The registry is asserted by **census, not by count**: the set of eras reaching an `authored`
material must equal `{prehistoric}` exactly, and the id it reaches must equal `{"stone"}`
exactly. A floor would have been satisfied by the wrong nine.

### 4.1a THE RECOGNISABILITY RULING — every material is a category, and a thing

**Team lead, 2026-07-29, verbatim:** *"flint should be stone, ingots should be bronze,
medieval should be gold or something more recognizable, florins should be something else,
kilowatt-hours should be electricity, compute cycles should be something else and less
abstract"*

**The rule: every material must be immediately recognisable to the vast majority of users** —
not period-accurate, not precise, recognisable at a glance to someone who has never played.
Two failure modes generalise his examples, and they are the test each of the ten was put to:

- **A specimen of a familiar category.** Flint is a kind of stone; a florin is a kind of coin;
  an ingot is a shape metal comes in. **Name the category, not the specimen.**
- **A unit of measurement rather than a thing.** Kilowatt-hours and compute cycles *measure* a
  substance instead of being one. **Name the substance, not its unit.**

The identical ruling landed on the era buildings (`horrea`, `insula`, `tithe barn` all failed
the same test) and is being applied there separately.

| Era | Was | Now | Which test it failed, or why it passed |
| --- | --- | --- | --- |
| 1 Prehistoric | `flint` | **`stone`** | Specimen. The lead's own example |
| 2 Neolithic | `grain` | `grain` *(kept)* | Passes both: a category, a substance, universally known. **Cannot become "food"** — food is a livability *input* here, never a stockpile |
| 3 Bronze Age | `ingots` | **`bronze`** | A shape metal comes in. The substance is the era's own name |
| 4 Classical | `silver_coin` | **`silver`** | A coin qualified by its metal — the florin failure exactly. Naming the substance also continues the one ladder nobody needs taught: bronze, then silver |
| 5 Medieval | `guild_marks` | **`coins`** | Opaque. The lead offered `gold`; it is **unavailable** (see below), so this takes the category the ruling itself invoked, and era five is guild ledgers and tithes — money recorded and paid |
| 6 Early Modern | `florins` | **`gems`** | Specimen of `coins`, which era five now holds. Gems are the other portable wealth nobody needs taught, and keep Renaissance banking reading as wealth rather than a second coinage |
| 7 Industrial | `coal` | `coal` *(kept)* | Passes both: a substance, a category, known to everyone |
| 8 Atomic | `kilowatt_hours` | **`electricity`** | Unit. The lead's own example |
| 9 Information | `compute_cycles` | **`silicon`** | Unit. Reasoned below |
| 10 Cyberpunk | `data` | `data` *(kept)* | Passes both. Reasoned below, and flagged reviewable |

Seven ids change; three were already right. Ten remain, one per era.

**`gold` cannot be an era material, which is why era five is `coins`.** The lead offered it,
and it is the most recognisable word available — but `gold` is already a `ResourceType`. On a
shared ledger an era holding it would make `resource_type` **ambiguous between the legacy
currency and a material**, and that field is the exact discriminator `computeBalances` and
`computeMaterialBalances` split on (§2). The collision is not theoretical: forcing era five to
`gold` fails fourteen assertions, including `applyGrant`'s row-count tests, because the
duplicate makes one grant write two gold rows. **Era five takes `gold` the day D-ERA13's
gold-drop (§6) frees the word**, at which point it is a one-line change plus a stored-data
migration. A test pins that no `MaterialId` collides with a `ResourceType`.

**Era 9, the hard one: `silicon`.** Generic is not automatically the fix, so the candidates
were weighed rather than defaulted. `data` was unavailable (era ten) and abstract anyway.
`bandwidth` is another unit. `chips` is ambiguous (potato, poker) and the vast-majority test
cuts hardest against ambiguity. `microchips` is unambiguous and concrete — and loses on the
ruling's own logic: **a chip is a manufactured specimen, exactly the way an ingot was.**
`silicon` is the *substance* those chips are made of, which is the half of the rule the lead
applied to bronze; era nine's own rationale is "doubling transistors, orders of magnitude",
and transistors are silicon; and "Silicon Valley" has already done the recognisability work
for a global audience. It also keeps the material sequence reading as substances — stone,
grain, bronze, silver, coins, gems, coal, electricity, silicon.

**Era 10, `data`, kept and flagged.** It was not in the ruling's list, and the caution that it
"may be as abstract as what it replaces" is fair. It is kept because it passes both halves of
the stated test: it is the **category** (gigabytes are the unit; data is the thing) and it is
**not a unit**. And its recognisability is not really in doubt — most people alive meter, buy
and run out of data monthly, which is also exactly the spend semantics this resource needs.
**Recorded as reviewable rather than settled**, since it is the one kept name whose category
membership is arguable.

### 4.1b Attribution: the slot is Evan's, the name may be the lead's

Renaming seven ids means seven of them are no longer Evan's words, so leaving `owner: "Evan"`
on them would credit him with strings he did not write. The registry therefore carries
`MaterialAttribution` instead of an owner:

- `named_by: "Evan" | "team lead"` — who wrote **the name this entry holds**, which is a
  different question from who owns the era's identity slot. **The slot is Evan's in all ten
  cases** and this does not change that; O-6's identity half is still his to settle.
- `renamed_from` — Evan's original word, kept beside the replacement rather than discarded, so
  the provenance of all ten is readable in one place.

Asserted **in both directions**, per `.cursor/rules/qa-verification.mdc`: every `team lead`
entry must carry a `renamed_from` (so a rename cannot lose Evan's word) and every `Evan` entry
must not (so a stale `renamed_from` cannot linger claiming a rename that was reverted). The
composition of both lists is asserted, not just their sizes, and every retired word is
asserted absent from `MATERIAL_IDS`.

### 4.1c The era documents are now stale, and that is a decision

Six of the seven renamed materials are named in their own `civic-buildings.md`, mostly in cost
columns (`80 flint`, `160 florins`). **`materials.ts` and those documents now disagree.** One
has to give, and it is the documents: the lead's ruling is the newer product call, and it is
being applied to the era buildings in the same breath. **They are another owner's files and
are not touched from here** — recorded so the reconciliation is findable rather than
discovered:

| Document | Stale word | Lines to change |
| --- | --- | --- |
| `era-01-prehistoric/civic-buildings.md` | flint | 16 (+ 3 in `style-guide.md`) — 13 when this table was written, and the aggregation rebalance added three more, which is why the count is worth keeping true rather than remembered |
| `era-03-bronze-age/civic-buildings.md` | ingots | 6 (+ 4 in `style-guide.md`) |
| `era-04-classical/civic-buildings.md` | silver coin | 2 |
| `era-05-medieval/civic-buildings.md` | guild marks | 2 |
| `era-06-early-modern/civic-buildings.md` | florins | 6 |
| `era-08-atomic/civic-buildings.md` | kilowatt-hours | 3 |
| `era-09-information/civic-buildings.md` | compute cycles | 2 |

Eras two, seven and ten need no edit, because their names did not change. Note that era one's
`style-guide.md` and era three's lesson content also use the old words as **physical objects**
(pale flint chips on the starter island's ground, ingots on a balance scale in D3's word
problems). Those are not the material id and are **correctly left alone** — flint chips are a
kind of stone, which is the ruling's whole point.

> ### CORRECTED and DISCHARGED 2026-07-29 — the table above was INCOMPLETE by three files
>
> **The reconciliation is done** (all ten era documents now print the shipped ids), and doing it
> turned up a defect in the list itself that is worth recording rather than quietly fixing,
> because it is the same defect the era-buildings rename and the no-generation ruling each hit.
>
> **"Eras two, seven and ten need no edit" is FALSE.** All three print retired ids — not their
> own, which is why the list missed them:
>
> | File | What it cited | Why the list missed it |
> | --- | --- | --- |
> | `era-02-neolithic/civic-buildings.md` | `flint`, **4 lines** — era ONE's material, in the step-up prose and the carry-forward row | Its own id `grain` was kept, so nobody re-read it |
> | `era-07-industrial/civic-buildings.md` | `kilowatt-hours`, `cycles`, **1 line** — eras EIGHT and NINE's, looking forward | Its own id `coal` was kept |
> | `era-10-cyberpunk/civic-buildings.md` | **six retired ids in one sentence** — the ten-resource arc list (`flint`, `ingots`, `coin`, `guild marks`, `florins`, `kilowatt-hours`, `compute cycles`) | Its own id `data` was kept |
>
> **The list was derived as "which files name their OWN material", and an era document's most
> quotable sentence is the one that names everyone else's.** Era ten's arc list is the extreme
> case: the file needing the most edits was the one declared to need none. Two of its
> parentheticals had to change with the words — `kilowatt-hours (measured)` and `compute cycles
> (spent)` were both describing *units*, which is exactly what the ruling rejected.
>
> **The era progression spec was also missing from the list**, and it is where D-ERA13 is
> *defined*: `2026-07-27-era-progression-design.md` §7 read *"from flint through to credits or
> data"*. Amended there, with the note that `credits` was never an id.
>
> **The physical-object judgement above is CONFIRMED by reading each occurrence, and there are
> nine of them, not two.** Era one's `style-guide.md` has **two** flint-chip mentions (the
> shoreline margins and the props kit) and era three's `style-guide.md` has **seven** ingot
> mentions — the ingot-weighing yard, ingots in the bonded store, the ingot yard, stacked ingots
> near the quay, the casting props, the ingot as a splittable unit, and `LIN.1`'s *"counted number
> of standard ingots"* on the balance beam. **All nine keep the old word**, and both files now
> carry a block saying so, because a find-and-replace over the folder would take era three's best
> framing device with it.

One clause of era one §1 survives the rename intact and is worth noting because it reads like
it should not: *"it wants to read as a count of worked pieces, not a weight or a currency"* is
a statement about `unit_noun`, not about the name, so `stone` still carries `pieces`.

### 4.2 Consumed AND accumulated — but never both at once in one place

**Decision: a material is a stockpile that is spent down. It accumulates between spends and
is consumed by placement. It is never a per-tick drain.**

Era one's document wants its material to "read as a count of worked pieces", and it stockpiles
believably. The thing that is explicitly *not* a stockpile is **food** — D-ERA13 makes food
a capacity precisely so a city cannot decline while nobody is playing, and §15 records
"food as a draining stockpile" as rejected. So the model has exactly one stockpiled
quantity per era (the material) and no draining ones at all.

### 4.3 They convert forward, with a haircut — O-6's second half, DECIDED

**Decision: `materialCarryForward(amount, fromEraNumber)` converts a leftover stockpile at
`floor(amount × MATERIAL_CARRY_FORWARD / ERA_COST_MULTIPLIER_STEP)`, with
`MATERIAL_CARRY_FORWARD = 0.5`.**

The reasoning is the era ladder. Costs scale by `2^(N-1)`, so era N+1 prices are exactly
twice era N's, and **purchasing-power-neutral carry-forward is division by two**. The
decision is therefore not "what rate" but "what fraction of purchasing power survives", which
is a number between 0 and 1 with an argument on each end:

- **1.0 (neutral) is wrong** because era-exclusive catalogues are the whole pull of an era
  (era one §0: "build it now or not at all"). If a stockpile crosses the boundary intact,
  hoarding through an era is never worse than building in it, and the pull dies.
- **0.0 (confiscation) is wrong** because it punishes the player who saved, and it reads as
  the game taking something. The visual brief's non-punishing stance covers the tone here.

**0.5 splits it**: half your purchasing power survives, so carrying forward is a real but
lossy option, and the leftovers of a well-built era are a head start rather than a windfall
or a loss. Net of the ladder that is `floor(stone / 4)` grain.

Two properties are asserted rather than assumed: conversion is **monotonic** (more stone is
never less grain) and **lossy** (`carry(x) < x/2` for every `x` where the neutral rate would
have been positive, so it can never mint purchasing power). It also **floors to zero**
rather than going negative for small stockpiles.

Two honest limits. Conversion writes ledger *rows*, so a later retune of the rate does not
rewrite a conversion that already happened — an executed conversion is a historical fact,
unlike a balance, which is always re-derived. And **the transaction cannot be exercised
end-to-end yet**, because it needs two `authored` eras and era two's identity is Evan's
(§4.1). The rate function is pure arithmetic and is tested exhaustively on its own; the
transaction that applies it is gated on both eras being authored and fails loud rather than
converting into nothing.

### 4.4 How they relate to the two capacities — indirectly, and never the reverse

**Decision: materials buy civic buildings; civic buildings provide capacity; capacity is a
derived readout that is never stored, never spent, and never a ledger resource.**

This is the whole shape of the answer to "how do resources relate to the two capacities",
and the direction is the load-bearing part. There is no capacity balance, no capacity row,
and no way to spend livability. A test asserts that neither capacity name is a member of
`ECONOMY_RESOURCES`, so a future edit cannot quietly make one storable.

### 4.5 THE CAPACITY MODEL — the ruling ten documents were blocked on

Era one §2 sets out the contradiction: **D-ERA13** says "housing and food are the two
capacities", §7's "two dials, not three" says "there is no separate housing capacity". The
team lead ruled this morning: **two capacities, livability and happiness, with housing and
food as inputs to livability.** That resolves the contradiction rather than picking a side —
housing and food both survive as real quantities, and neither is a capacity.

**Decision, RE-RULED BY THE TEAM LEAD ON 2026-07-29 AFTER THIS SECTION SHIPPED: livability is
a SINGLE POOL. Housing and food are not tracked separately.**

```
livability = Σ (each building's livability contribution)
happiness  = Σ happiness
```

**This section shipped `min(Σ housing, Σ food)` — reading (b) — and carried it for one day.
The record of why that was wrong is worth more than the record of the decision, so the
superseded argument is left standing below rather than deleted.**

**The lead's reasoning, which overrides the evidence (b) was chosen on: THERE IS NO MIDDLE
GROUND ON SEPARATE TRACKING.** If housing and food are distinct quantities then every
building in every era catalogue has to declare which of them it feeds, and that is a great
deal of specification bought for one extra dial in a game where the city is motivation rather
than the subject. Two capacities was always the shape (§7's "two dials, not three"); a
housing term and a food term inside one of them is a third and a fourth by the back door.

**What (b) was covering up, and this is the part that cost something.** The measurement
behind it was real: under one pool, one of each era's food-building/dwelling pair dominated
the other on cells, cost and magnitude at once in **7 of the 10 eras** (1, 2, 3, 4, 6, 7,
10), which reads as D-ERA24 breaking outright. **It was a pricing problem wearing an
aggregation problem's clothes.** A building that is worse on every axis with no compensating
property is not a design that needs a cleverer formula; it is a building nobody will place.
So the fix belongs in the catalogues, and it went there: era one's Family Lodge gained the
hall's own fire, era four's dwelling halved the plot its own column already claimed it saved,
era seven's cold store took the price cut its own column already claimed it had, and eras
two, three and six gained the courtyard each of them was already drawn with. **Era ten needed
two numbers rather than one**, because its food tower and its dwelling share a footprint *and*
a magnitude, so a single axis could only ever favour one of them: the Vertical Farm gained a
quarter-magnitude happiness for being the city's only fresh food, and the Capsule Homes took
the run's cheapest dwelling price for being its least dignified housing. It was carried as a
declared exception for one afternoon, until the team lead ruled *"differentiate these"*.
*(**The Capsule Homes** have since been renamed **The Pod Apartments** in the consolidated rename
pass. No number moved and the shipped id did not change, so the two-axis separation above is
untouched; the old name is kept because this sentence is a record of when the numbers were set.)*

**And D-ERA24 stopped being a sentence.** `test/eraCivicCatalogueDominance.test.ts` states it
so it cannot quietly stop being true: **no building in an era's catalogue may be weakly
dominated by another** — for any two rows, each must beat the other on at least one of
**footprint, cost, livability, happiness**. It parses the ten authored tables rather than a
copy of them, pools the livability axis through the shipped `deriveCapacities` so a third
ruling breaks it loudly instead of silently, fails at any era whose table stops parsing
rather than sweeping it as empty, and **carries no exceptions list at all** — the one exception
it briefly held was era ten's, and that pair is now differentiated, so the exemption machinery
and the skip path in the sweep are both gone. That guard, not the rebalance, is the durable
half of this change: it catches the eleventh catalogue too.

**The argument (b) shipped on, and what survives of it.** Reasons 1 and 3 were real costs,
now paid deliberately rather than avoided:

1. **"It is what the words mean."** Livability "sets how many people the city can sustain"
   (§7), and a pool lets 100 food with 0 housing read as 100 livability — a settlement with
   nowhere to sleep, claiming to sustain a hundred. **This is the price of the ruling.** It is
   payable because nothing in the model or the fiction distinguishes a bed from a meal any
   more: there is one pool called livability and buildings contribute to it.
2. **"It makes era one's four types trade rather than ladder."** This was the load-bearing
   reason and it is the one that did not survive: `min` made the Smokehouse and the Family Lodge
   complements *by formula*, which is exactly how it hid that they were priced identically.
   They now trade because they are DIFFERENT — 2×1 against 2×2, and a fire.
3. **"It gives shortfall warnings something true to say."** Gone, and named as gone:
   `capacityShortfall` can no longer report *"food is your binding constraint"*, because
   there is no food term to bind. It reports two independent numbers, `unsustained` and
   `happinessGap`, which are separately actionable and are bought from different rows.

**Reading the era tables under this ruling.** A dwelling row's `Provides` says "N livability"
and a food row's says "food for ~N". **Both are the same contribution** — `livability: N` —
which is precisely what made seven catalogues collapse, and precisely what the invariant now
watches. A catalogue is priced against two declared quantities rather than three.

`CivicCapacityProfile` is the contract a civic building satisfies —
`{ livability, happiness, cost }` — and it is **a type, not a catalogue**. The era-one
numbers appear only as test fixtures.

**One consequence worth stating in numbers.** INV-ERA-4's predicate got easier by
construction, because a population is now housed and fed once instead of twice. Era one's
~60 sustained population with happiness covering it priced at **780 stone** under `min`
against a six-lesson payout of 600 — not solvent, closed only by Evan's three mechanisms —
and prices at **540** under the pool, so the predicate holds outright and those mechanisms
became headroom. `capacity.test.ts` pins both the number and the reading.

**Two knock-ons the prior entry predicted, both now real.**

- It recorded that `livability`, `happiness` and `food` *"appear in NO source file anywhere"*.
  As of this change they do, in `packages/economy/src/capacity.ts`, which is the first code
  home the ruling has had.
- It recorded that `CitizenCapacity` (`engines/game/src/citizens-tuning.ts:26`) is
  *"a housing capacity only"* and that its `population <= capacity` guarantee is a
  single-term bound needing a second term or a minimum once livability carries food.
  **The pooled ruling retires that worry rather than answering it**: a single term is now the
  right shape, because there is only one pool for it to bound. Still Evan's file, and
  **nothing in `engines/game` is touched here**; `deriveCapacities` is the sum his bound can
  read.

**On the recommended home.** That entry recommended a new `docs/Contracts.md` §9, "City
capacity model", following §8's own amendment-then-fold-in pattern, and said that until it
exists §7 of the era spec is the normative home. This document is deliberately the
**amendment step** of that pattern and not the fold-in: `Contracts.md` is the ratified frozen
surface, and amending it for a capacity model whose shape has been exercised by exactly one
thin slice would freeze the shape before the evidence is in. §9 is owed when the economy
service and its shared types land, which is when Contracts §8's own subjects (tables, grants,
service APIs) arrive.

### 4.6 What grants a material — row 1, and only row 1 for now

**Decision: the lesson-completion lump credits the era material; nothing else does yet.**

> **Bounded by §5.** "For now" means rows 2 and 3 may later pay a material. It does **not**
> leave room for a fourth, passive channel: after the ruling there are exactly two earn
> channels ever — completing a lesson and completing a practice set — so the only open
> question here is which of the existing rows pays a material, never whether a building does.

§7 names exactly one material payout unambiguously — "lesson completion pays `100x`" — and
it is also the one **INV-ERA-4** (solvency) rests on: every population increase arrives with
the resource to house and feed it, and population arrives with lesson completion. Era one is
`×1`, so era one pays 100 stone.

The other two rows stay XP/gold-only in this change, each for a stated reason:

- **Row 3 (star).** §7's "mastering a skill pays `60x`" is a *mastery* trigger, and the
  adapter's trigger is `reportStar({ starLevel: 1 | 2 | 3 })`. Which star counts as
  "mastered" is a game-side seam (mastery is `>= 2` in the scoring spec, and stars are not
  mastery levels), so wiring it needs Evan. Also note D-R3 — a star grants no *gold* by
  design — is about gold rewarding activity and not depth; whether that argument transfers
  to a material is a real question, not an obvious yes.
- **Row 2 (interleaved).** Repeatable and capped. No material cap is authored, and §7 names
  no material payout for interleaving. Rather than default it to uncapped, `applyGrant`
  **throws** if a capped reason carries a material amount — a fail-loud fence in the style
  of `descriptors.ts`, so the day someone wants interleaved stone they have to author its
  cap first instead of discovering it was infinite.

---

## 5. RULING — there is no generation economy. Every unit is earned by learning

**Status: SETTLED, 2026-07-29.** Ruled by the team lead; recorded by Gabe as economy lane
owner. This closes §7 item 5, which was the one open question on this record owned by the
lead, and it answers the contradiction the previous pass escalated rather than settled.

**The lead, verbatim:** *"i think there shouldn't be a generation economy to begin with
honestly - just resources on lesson completion and completing practices make more sense. we
dont need the buildings to passively produce income"*

### 5.1 The ruling, stated positively

**Every unit of every resource is earned by a learner completing a lesson or completing a
practice set. There are exactly those two channels, and there is never a third.**

Stated as the four things that follow, because the prohibition is easier to enforce than to
remember:

- **Buildings are not sources.** No building has a production rate, a yield, an output, or a
  storage cap to fill. Nothing accrues to a building, and nothing is collected from one.
- **Time is not a source.** No resource amount is a function of elapsed wall-clock time. No
  tick, no interval, no per-frame accrual, no offline catch-up on load, no welcome-back
  grant, and no per-elapsed-time value for having been away or for returning. **EXTENDED
  2026-07-31: this reaches MULTIPLIERS and not only grants** — no quantity in the game may
  take a time-based value of any kind, which is the last exemption closing rather than a new
  rule (§5.3a).
- **Mastery does not create a source.** A star may pay a one-time lump (§7 item 3, still
  open); it may never raise a rate, because there is no rate to raise.
- **The two channels are the two the tree already has** — row 1 (lesson completion) and row 2
  (a cleared practice set). The ruling adds nothing and builds nothing; it forecloses a
  third.

**Why.** It makes every unit of currency trace to learning work, so the economy cannot be
advanced by waiting — which is the same stance `docs/Game_Visual_Design_Brief.md` §2 takes
when it bans urgency timers and artificial scarcity, applied to the reward side rather than
the pressure side.

**The ruling makes three merged designs agree, and the trickle was the one dissenter.** This
is the strongest argument for it and it is not mine — the position was already settled twice,
for the other two quantities the city tracks:

- **`2026-07-25-resource-model-xp-gold-design.md` §5 principle 5** (SETTLED): *"No
  passive/idle income. Neither resource accrues over time, from idle buildings, or from
  checking in."*
- **`2026-07-27-citizens-and-city-life-design.md` §5, D-CIT2** (DECIDED): *"population is a
  pure function of learning state. No time-based trickle, no capacity-driven arrivals … you
  cannot wait for people and you cannot farm them by building houses"*, with *"No clock.
  Nothing accrues while the tab is open."* Its §15 rejects time-based growth because it makes
  the city *"farmable by idling"* and *"makes every tuning question untestable without a fake
  clock"* — which is the same objection, reached independently, about a different quantity.

So **resources were the only quantity in the game still specified to accrue with time**, and
D-ERA13's trickle was the outlier rather than the pattern. D-CIT2's second objection also
transfers exactly: a trickle would have made the economy's own tuning questions untestable
without a fake clock, in a package whose value is that it is pure and unit-testable.

### 5.2 What this supersedes, and what survives

The trickle was **DECIDED** in the era design rather than open there, so this is a change to
that document and not merely a confirmation of it. Those are Evan's sections; nothing under
`docs/superpowers/specs/eras/` or in `2026-07-27-era-progression-design.md` is edited here,
and the hand-off is recorded in §5.5.

| Site | Status under this ruling |
| --- | --- |
| **D-ERA13**, "a **trickle from skill buildings into a storage cap**" (§7, and the §16 row) | **SUPERSEDED.** The lump half stands unchanged; the trickle clause is withdrawn, and with it "so returning is rewarded and idling is not", which was the trickle's rationale |
| **§7 tuning table**, "Skill building output `2/hour x`, doubled at mastery, into a **12-hour** storage cap" | **WITHDRAWN.** The whole row goes, including the "a full day of idling is worth roughly one lesson" note that justified its magnitude |
| **§7 tuning table**, "Mastering a skill pays `60x`, **and doubles that building's output**" | **HALF SURVIVES.** The `60x` lump stands (§7 item 3 decides its trigger); "doubles that building's output" is withdrawn |
| **D-ERA7 / §6's two-class table**, "Skill buildings **produce**; civic buildings **provide**" | **THE DISTINCTION SURVIVES, ITS ECONOMIC BASIS DOES NOT.** Skill buildings are still earned 1:1 with lessons and civic buildings still bought, which is the load-bearing half. But "produce" is no longer what a skill building does, so the two classes are now distinguished by **how they are acquired**, not by what they do economically. The ten `civic-buildings.md` files each restate this in their §1 or their economic-role table |
| **D-ERA23**, legacy decay | **SPLIT.** "A skill building's **output** falls as it ages" has no subject left and is withdrawn. "The same rule applies to frozen civic buildings' **contributions**" survives, and is the half **O-5** already measures (§7 item 1). Its stated rationale — "sixty accumulated producers do not trivialise it" — is void: with no producers, there is no accumulation to counteract |
| **`constants.ts`**'s "There is NO passive-income constant … Do not add one" | **CONFIRMED**, and now has a ruling behind it rather than only the xp/gold spec's §5.5 |
| **`2026-07-25-resource-model-xp-gold-design.md`** §5 principle 5, §14 | **CONFIRMED.** That document already asserts the position for xp/gold on **17 lines** (counted, not estimated); the ruling extends it to materials and makes it the whole economy's rule rather than one resource pair's |

**The previous pass's recommendation is WITHDRAWN, not deferred.** §5 used to recommend making
production **play-time** driven rather than wall-clock driven, and to note that it needed a
play-time clock that does not exist. The ruling removes production altogether, so the
play-time clock is **not owed by the economy** and nobody should build one for this reason.
Recorded because a withdrawn recommendation that is merely deleted tends to be reinvented.

### 5.3 The one ambiguous mechanic — RESOLVED 2026-07-29: the condition clock is SUNSET

**THE RULING (the team lead, 2026-07-29, verbatim): *"i think we're gonna sunset condition
clock - don't really think it makes sense in the new model."*** This section asked the lead
whether the no-generation ruling reached *multipliers* as well as grants. It does, for this
mechanic, and the answer is removal rather than a reading.

**What this section flagged.** `conditionAt(nowMs, lastRestoredMs)` read elapsed wall-clock
time and `interleavedGrant` paid `goldBase + round(goldRepairMax × repairScale)`, so **how
much** a cleared practice set paid depended on how long it had been since the last one — 10
gold for a regular player, up to 36 for a returning one. The verdict recorded here was *"keep,
and let the lead say whether the ruling reaches multipliers."* He has, and it is gone.

**What was removed:** `condition.ts` (both `conditionAt` and `repairScale`), the `CONDITION`
block in `constants.ts`, the repair term in `interleavedGrant`, `EconomyDevSnapshot`'s
`last_restored_at_ms` and its persistence round-trip, the now-dead `islandId` on
`reportInterleavedClear`, and the spec sections describing all of it
(`2026-07-25-resource-model-xp-gold-design.md` §7 layer 3, §8.3, §11.2, D-R7).

**`goldRepairMax` was DROPPED, not folded into the base**, and that is a balance decision
rather than a mechanical one. The 30 was sized as what a week of neglect was worth repairing,
not as what one practice set is worth; folding it in would have kept the magnitude while
deleting its only justification, and would have made the 200-gold rolling cap bind after 5
sessions instead of 20 — converting the anti-grind backstop into the primary rate limiter as a
side effect of a deletion. Interleaved practice now pays a flat `{ xp: 12, gold: 10 }`.

> **THE PAYOUT SENTENCE ABOVE IS STALE IN ITS CURRENCY AND EXACT IN ITS SHAPE, corrected in
> place 2026-07-31.** Both of the mechanisms it names were retired after it was written: gold
> is retired (§6's gold-drop), and the rolling cap it reasons about is gone too. **The flat
> payout is the part that survives and it is the part the sentence was making a claim about**
> — `EARN.interleaved` is `{ xp: 12, material: 20 }` at era-one scale, era-scaled by
> `eraScaledPrice`, with no second term. **The 10 became 20 on the gold-drop and not by any
> re-folding of the repair term**, which is the only way this sentence could mislead.

**No replacement was added.** A crisis mechanic that may reuse the decay-and-repair idea is
under design and is not specified; anticipating it here would be inventing a mechanic.

**This is not the O-5 legacy decay, which stays.** O-5 scales a frozen civic building's
contribution by `0.9 ^ (eras behind the current era)`, floored at `0.5`. It is keyed on **eras
advanced**, a pure function of learning state, where the condition clock was keyed on
**wall-clock time away**. That difference is the whole reason one survives the ruling and the
other does not.

**The two corrections this section recorded were both accurate at the time and are now
history.** Pristine deflated rather than inflated the payout (`repairScale(1) === 0`), and the
clock was genuinely persisted rather than reset on reload. Kept so that a reader meeting the
old description elsewhere knows it was checked, not merely repeated.

### 5.3a The ruling generalised — no time-based VALUE, and it was already discharged

**AMENDED 2026-07-31.** §5.3 above answered the multiplier question *"for this mechanic"*.
The team lead has since stated it as a **principle**: the no-generation ruling forbids
**time-based value of any kind, not merely time-based grants.** Recorded as an **extension of
the clocklessness principle rather than as a new idea**, because the principle is older than
this document — D-CIT2 settled it for population (*"a pure function of learning state. No
time-based trickle"*, with §15 rejecting time-based growth as **farmable by idling** and
**untestable without a fake clock**), and §5.1 settled it for resource **grants**. **The
condition clock was the last quantity in the game still exempt**, and its exemption was
exactly the gap between a grant and a multiplier: nothing accrued while a player was away,
and the *value* of their next cleared set rose anyway. Both of D-CIT2's objections transfer
to a multiplier without a word changing.

**Nothing was removed under this extension, because §5.3 had already removed all of it.** The
extension is a widening of the stated principle over a tree that already satisfies it, and it
is worth saying that plainly: **there is no second deletion owed here.** Verified by execution
rather than recalled, first at `382632c7` and **re-verified unchanged on the merged result at
`fc068054`** after `integration` moved economy-adjacent code underneath this record mid-run —
`packages/economy/src/condition.ts` does not exist, `repairScale` and `conditionAt` survive
nowhere in `packages/`, `apps/` or `engines/` outside one docblock sentence describing their
removal, `EconomyDevSnapshot` has no `last_restored_at_ms`, and `interleavedGrant` takes no
`condition` argument and returns one material term.

**The guard was WIDENED rather than paralleled, which is what this extension asks for and is
already true.** `packages/economy/src/clockless.test.ts` is not a sweep for `condition.ts`; it
is a sweep for the **behaviour**, and its own header says so in this rule's terms — *"scope a
guard by the behaviour, not by the implementation … Reading `Date.now()` is an implementation
of 'the payout depends on time'."* It bans the ambient reads **and** every shape a
time-denominated mechanic needs without one, over a population derived from disk with a floor
under it, and it carries the behavioural half as an equality: **the same practice pays the
same total however its instants are spread.** The widening has already caught a second
mechanic the narrow version would have missed — the rolling 24-hour cap, which never asked
the environment for anything and passed every regex the earlier file had. **So the right
guard for this extension exists, and adding a parallel one would weaken it** by splitting the
population.

**The removal reached the CONCEPT and not only the payout, and that is reported rather than
re-ruled.** The ruling is about value, and a neglected city is entitled to look neglected. But
there is nothing left to look at: `condition.ts` held both `conditionAt` and `repairScale`,
the `CONDITION` block left `constants.ts`, and `reportInterleavedClear` lost the `islandId`
that was *"read by exactly one thing, the condition clock's lookup"*. **No visual, no
persisted field and no other consumer survived it**, so the concept went out with the payout
as a consequence rather than as a decision. **If a visible condition is wanted back it is a
new mechanic and a separate decision**, and this ruling does not forbid one — it forbids that
mechanic paying anybody.

**The schema question this raises is already answered, and the answer is a THIRD shape rather
than one of the two on record.** Removing `last_restored_at_ms` took the v2 bump. The
precedent pair is a *retired* id, which fails the resource allow-list for free and needs no
bump, against a *repurposed* one, which passes it and is silently reinterpreted — which is why
the gold-drop bought v3 and the material rename bought nothing. **A removed FIELD is neither**,
because the parser does not police fields at all: `economyPersistence.ts` records that a v1
blob *"is still syntactically parseable by the v2 parser — unknown keys are ignored"*, so
without a bump a saved wallet would have restored cleanly while carrying a timestamp for a
mechanic that no longer existed. **The bump was owed for legibility rather than for
correctness**, which is a weaker reason than the gold-drop's silently-wrong wallet and still a
sufficient one.

### 5.4 Consequences, worked out rather than asserted

Each was checked against the tree at `4bf1147`. One of the five is **corrected** rather than
confirmed, and one is **narrower** than it first appears.

**1. Earnings are derivable from persisted learning state for row 1, and NOT for row 2 —
so total-ever-earned is not derivable.** Row 1's event id is
`lesson_complete:{node_id}` (`events.ts`), derived from persisted node state by
`deriveEarnEvents` (`useEconomy.ts:81`), and is idempotent on replay. Row 2's is
`interleaved:{session_id}`, and the session id is minted per drill as
`` `${Date.now().toString(36)}-${random}` `` (`CitySurface.tsx:1939`), then suffixed with a
round counter. It is **not** a function of any persisted progress, and `deriveEarnEvents`
reads only `node_states`, so it cannot rebuild row 2 even in principle. Removing time-based
generation therefore does *not* make the money supply derivable; it makes **the finite half**
derivable. Spending is not derivable either, which is why the ledger is persisted rather than
recomputed (§1). **If derivability is wanted as a property, row 2's key has to change** — it
would need to be keyed on something durable, e.g. a per-node practice counter, and that is a
real design change with a dedupe question inside it, not a refactor.

**2. It does NOT sharpen an open persistence defect, because that defect is fixed.**
`#96` ("Economy state is not persisted, and refreshing silently rewrites it") is **CLOSED**,
and its fix is at the tip: `economyPersistence.ts` stores the ledger, the prestige set, the
equipped map and the restore clock, and `useEconomy` primes its fired set from the persisted
ledger via `appliedEventIds()`. `#102` (lesson gold on the test-out seam) is **CLOSED** too.
§0 already recorded both. **What survives of the recommendation** is the shape, which the
ruling does sharpen and which the shipped fix already matches: derive the idempotent half
from progress keyed per node, and persist the spend side plus the dedupe record. The one gap
the ruling exposes is consequence 1's — row 2 is persisted but not derivable — and that is
not a bug in the persistence layer.

**3. Practice is the sole grind vector, and the cap DOES cover every repeatable path that
pays — because the two endless surfaces differ in whether they pay at all.** This was traced
through the mounts rather than inferred from the cap's own wording. `CAP` covers
`REASON_INTERLEAVED` only (`CAPPED_REASONS`, `constants.ts`), bounding both xp and gold at
`{ xp: 120, gold: 200 }` per 24h window. Rows 1 and 3 are left uncapped correctly: they are
one-time and monotonic, so capping them could only throttle honest first-time progress.

There are **two** endless practice surfaces, and only one of them is an earning path:

| Surface | Mount | Pays? | Capped? |
| --- | --- | --- | --- |
| **`DomainInfinitePractice`** — the domain-level interleaved drill | `CitySurface.tsx:2630`, with `onCorrectAnswer={handleInterleavedCorrect}` | **Yes**, row 2, once per completed round via `reportInterleavedClear` | **Yes**, it is row 2 |
| **`InfinitePractice`** — the per-node endless drill off the lesson menu | `AdvisorLesson.tsx:234`, given only `nodeId` and `onExit` | **No.** `onCorrectAnswer` is optional and is not passed, so no grant is ever reported | N/A — nothing to cap |

So the cap's coverage is complete today, and the thing to watch is the shape of that
completeness: **the cap's population is "whatever reports under the interleaved reason
code", not "whatever is repeatable"**. The uncapped infinite surface is safe because it pays
nothing, not because anything stops it — so wiring `onCorrectAnswer` into it, or minting under
a new reason code, would create an uncapped repeatable path by default. That is the guard this
consequence actually asks for.

**Materials cannot be earned repeatably at all yet**: `applyGrant` **throws** if a capped
reason carries a material amount (§4.6), so the material economy has exactly one channel,
row 1, which is finite.

**4. Total cost must fit inside total earnable with margin — and at today's numbers it does
not, in two places that can be computed now.** This is the constraint any future cost
schedule must satisfy, and it is not hypothetical:

| Budget | Earnable (finite) | Cost | Verdict |
| --- | --- | --- | --- |
| **Gold vs the cosmetic catalogue** | 62 live nodes × `EARN.lessonComplete.gold` 15 = **930 gold** | 20 gold-priced cosmetics summing to **1,702 gold** | **Does not fit.** A 772-gold shortfall, i.e. ≈3.86 days of practice at the 200/day cap, must come from row 2 |
| **Era-one stone vs era one's catalogue** | 6 era-one nodes × `EARN.lessonComplete.material` 100 = **600 stone** | **540 stone** for a 60 livability / 60 happiness target | **NOW FITS, with 60 stone of headroom — CORRECTED 2026-07-29 after the pooled-livability re-ruling.** This row read *"780 stone … does not fit"*, which was true under `min` and is the clearest thing the reversal changed: pooling pays for the same population once instead of twice. `capacity.test.ts` asserts `isSolvent(600, 540) === true` in a test named *"finds era one solvent at the six-lesson payout, **which min did not**"*. **The margin is 60 on illustrative anchors**, so a re-price of any of era one's four rows can put it back under water — which is why the predicate ships rather than the bare assertion |

**Restating the constraint precisely, because the obvious version is wrong.** With no
time-based component, gold is *not* bounded by the amount of learning content that exists:
row 2 is repeatable and the cap bounds its **rate**, not its total, so total earnable gold is
unbounded in calendar time. What the ruling bounds is the **finite, one-time** supply. So the
constraint has two tiers, and the second is the one that matters:

- **Hard tier:** the sum of costs a learner *must* pay to progress must be strictly less than
  the finite one-time earnable for that era, with headroom, or progression is gated on
  repeat practice — which INV-COS-1 forbids in spirit even where it does not gate literally.
- **Soft tier:** optional and cosmetic spend may exceed the finite supply and draw on row 2.
  The catalogue's 1,702-against-930 is the soft tier and is defensible. **Era one's is the hard
  tier, and it now PASSES:** 540 against 600, since the pooled-livability re-ruling. *(This bullet
  read "780-against-600 is the hard tier and is not [defensible], unless Evan's free first
  Smokehouse, the Town Hall's founders and a population that climbs over play time close it".
  Those three are now **headroom rather than the whole margin**, and none of them is quantified
  anywhere, which is why they were never a satisfying answer.)* **The hard tier is satisfied by 60
  stone on illustrative anchors**, so it is the thinnest pass in the economy and
  `capacity.test.ts` is what would report its loss.

**5. Buildings are sinks or milestones, never sources — and the design space is tighter than
the era spec assumed.** A building's whole economic role is now: it costs material to place,
it occupies land, and it contributes housing, food and/or happiness. Nothing about it
accrues.

- **The capacity model's wording is already clean.** §4.4 says "materials buy civic
  buildings; civic buildings **provide** capacity", `CapacityContribution` has exactly the
  three provide-side fields and no rate, and `capacity.ts` is clockless by test. Checked for
  an accidental production reading and there is none.
- **The interaction with D-ERA24 (non-dominance) is the real cost of this ruling.** With no
  yield dimension, a catalogue row varies on only **cost, land footprint, and the
  housing/food/happiness split**. Every trade-off must come from those. That is materially
  tighter than a design space with production in it, and it is what makes §4.5's `min`
  aggregation load-bearing rather than merely tidy: under `min`, a food building and a
  dwelling are **complements**, which manufactures a genuine trade-off out of the split
  alone. Under a sum they are substitutes and one dominates the other on all three axes in
  7 of 10 eras. **`min` is not just the better reading of the words; after this ruling it is
  most of what stops D-ERA24 collapsing.**

### 5.5 Owed to Evan, and not blocking him

Nothing in his lane is edited here. What the ruling asks of him, when the era spec is next
touched: withdraw D-ERA13's trickle clause and the two §7 tuning rows, amend the §16
D-ERA13 and D-ERA7 rows in place (following D-ERA6's "AMENDED" precedent rather than adding a
new id), and re-base the two-class distinction on acquisition rather than on production in
§6 and in the ten `civic-buildings.md` economic-role tables. **Issue `#181`** is the open
era-spec correction issue and is the natural vehicle.

> ### DISCHARGED 2026-07-29, in the reconciliation pass that also recorded the team lead's
> ### re-dressing, shape, review and chronicler rulings. `#181` carries the notice
>
> Every item above is now done, with the lead's authorisation to edit Evan's sections and the
> amendment convention this section asked for (in place, dated, no new `D-ERA` id):
>
> | Owed | Where it landed |
> | --- | --- |
> | Withdraw D-ERA13's trickle clause | `2026-07-27-era-progression-design.md` §7, as a dated `AMENDED` block above the bullet, with the lump left intact |
> | Withdraw the two §7 tuning rows | Same file §7's tuning table. The `2/hour` row is **struck through and kept** rather than deleted, so the withdrawal is legible to anyone who read the table before; the mastery row keeps its `60x` and loses *"and doubles that building's output"* |
> | Amend the §16 D-ERA13 and D-ERA7 rows in place | Both done, plus **D-ERA23** (split), **D-ERA8**, **D-ERA19** and **D-ERA22**, which the re-dressing and review rulings reached |
> | Re-base the two-class distinction on acquisition | §6's table (two rows), §6's summary sentence, and all ten `civic-buildings.md` |
>
> **Three citation sites the hand-off list did not name, and each would have kept the withdrawn
> model alive on its own.** They are recorded because the pattern is the point: a ruling written at
> its definition site does not reach the places that restate it.
>
> - **§1, the SUMMARY** — *"a Town Hall upgrade that expands the map, re-skins and levels up every
>   existing building"*, plus the same claim as a node in the mermaid loop. A summary is where most
>   readers form their model of the design.
> - **§4, D-ERA5's chapter-break list** — item 2 was *"Every existing building re-skins into the new
>   era and levels up — more capacity or output — at an unchanged footprint"*. Both halves gone, one
>   to each ruling. This is four hundred lines from either decided item, and it is what a reader
>   asking "what does an advance actually do?" would have found.
> - **§13's `packages/economy` row** — still named *"production into a storage cap"* as a thing the
>   code owed. It is now explicitly not owed, and the code's absence of production was never a gap.
>
> **Also reconciled outside the era spec:** `eras/README.md`'s *"Skill buildings **produce** the era
> resource and **re-dress every era**"* (both halves wrong in one sentence), the ten
> `civic-buildings.md` contract lines, `City_Art_Bible.md` §1.2, and `Post_MVP_Backlog.md` item 16,
> whose sub-point (c) cited D-ERA8's withdrawn clause as the reason a cosmetic skin is a defect.
>
> **NOT done here, and deliberately:** the **clocklessness sweep** recommended below. It is a code
> change, this pass is docs-only, and its population needs the argument the note below already
> gives. Still owed, still Gabe's.

**The guard is now SHIPPED — `packages/economy/src/clockless.test.ts`.** This ruling is a
prohibition on future code, so the honest test for it is a **clocklessness sweep** over
`packages/economy` asserting that no module reads an ambient clock to compute an amount. It
was recommended here with a named two-way exception list covering `condition.ts` (deliberate,
§5.3) and the `created_at` stamping in `grant.ts`/`spend.ts`/`materialSpend.ts`.

**The condition-clock sunset made it stronger than the recommendation allowed for: the
exception list for ambient reads is now EMPTY, because `condition.ts` was the only entry and
it is deleted.** Not one module in the package calls `Date.now`, `performance.now` or
`new Date()`. So the sweep asserts the ban outright rather than around a list.

That leaves the risk this section warned about — a guard that bans nothing looks identical to
a guard that passes — so the emptiness is not left to speak for itself. The sweep derives its
population from disk with a floor, and it carries a **second, non-empty census in the other
direction**: the three modules that stamp `created_at` from a **passed-in** `nowMs` are named,
and each must still do so. That is what keeps `new Date(input.nowMs)` provably distinguished
from `new Date()` rather than merely un-banned, and it fails both ways — a named module that
stops stamping fails, and an unnamed module that starts reading a clock fails.

---

## 6. Gold is not removed here

D-ERA13 drops gold: "it was the era material under a modern name". This change does not drop
it, and the material is **additive** for now.

Gold is load-bearing in ten places that are not the resource model — `applySpend`, the
cosmetic catalogue's every price, `CAP.max`, the HUD readout, the reward toast, the shop, and
four of the core's test files. Removing it is a migration with a content dependency (every
cosmetic reprices in a per-era material, and a cosmetic is cross-era while a material is
not — an unsolved question in its own right). Doing it inside a spine PR would bury the
spine.

The one thing this change does spend on that migration is §3: the row invariant is keyed on
the reason code rather than on `gold`, so a cosmetic bought with a material is already legal and
the migration does not have to loosen an invariant a second time.

---

## 7. Open questions this record does NOT close

| # | Question | Owner | Blocked on |
| --- | --- | --- | --- |
| 1 | **O-5, the legacy-decay curve** — **narrowed by §5.** It now decays **capacity contributions only**; the "skill building's output" half of D-ERA23 has no subject after the ruling. §7 called it "the single most load-bearing unset number in the economy" on the strength of a runaway — "sixty accumulated producers" — that can no longer happen, so it is **still open but less load-bearing than that line claims** | Gabe | It measures a building's contribution against how far its era sits behind the current one, so it needs the two-class building model (Evan's) to have contributions to decay. The capacity contract in §4.5 is the input it will multiply |
| 2 | **O-4, teardown pricing** (~25% of current-era build cost suggested, no refund) | Gabe | A build cost to take a percentage of, i.e. a civic catalogue |
| 3 | **Does a mastery star pay a material?** §7 says mastering pays `60x`; the adapter's trigger is per-star | Gabe + Evan | Which star is "mastered" (§4.6) |
| 4 | **Is a cosmetic cross-era when the material is not?** Falls out of dropping gold (§6) | Gabe | Nothing; it is next |
| 5 | ~~**The production trickle** (§5)~~ **RESOLVED 2026-07-29 by the team lead: there is no generation economy at all.** Every unit is earned by completing a lesson or a practice set; buildings do not produce. See §5, which states the ruling, what it supersedes in the era design, and its five consequences. Row kept so the number is never reused | ~~Team lead~~ | **Done.** The wall-clock contradiction is dissolved rather than reconciled — the channel it applied to no longer exists. One mechanic is flagged as ambiguous and deliberately kept (§5.3), and a guard is recommended but not shipped (§5.5) |
| 6 | **INV-ERA-4 as a real sweep** over all 33 D1 build orders, reusing the citizens harness | Gabe | A civic catalogue and the retuned population curve (Evan's). The predicate is shipped; the sweep is not |
| 7 | **Era two's material identity**, which is what makes conversion exercisable end-to-end (§4.3) | Evan (O-6 identity) | His era-two authoring |
| 8 | **Seven era documents name a retired material** (§4.1c). The ruling is newer, so the documents give | Evan / the era-folder owner | Nothing; the list of lines is in §4.1c |
| 9 | **Era five takes `gold`** once D-ERA13's gold-drop frees the word (§4.1a) | Gabe | The gold-drop migration (§6) |
| 10 | **Is `data` recognisable enough for era ten?** Kept because it passes both halves of the rule, flagged because it is the one arguable keep (§4.1a) | Team lead | Nothing; it is a re-read, not a blocker |

---

## 8. Left for a second pass, deliberately

- **Ten eras of cost tables and civic catalogues.** Out of scope by instruction, and out of
  lane besides: the buildings are Evan's two-class model. What is shipped is the *contract*
  a catalogue row must satisfy (`CivicCapacityProfile`) and era one's numbers as fixtures.
- **A material readout in the HUD.** Evan's, per `OWNERS.md`. Required before a material is
  playable, because the canvas is `aria-hidden`.
- **The era-advance transaction** that converts a stockpile. The rate is decided and tested;
  the transaction is gated on two authored eras (§4.3).
- **Server durability.** No economy service exists; unchanged by this work (§1).

---

## Related

- `docs/superpowers/specs/2026-07-27-era-progression-design.md` — §7 the economy, D-ERA13,
  D-ERA23, D-ERA24, §8.1 INV-ERA-4, §13's row on this exact package, §17 O-4/O-5/O-6, §18
  the work split.
- `docs/superpowers/specs/eras/*/civic-buildings.md` — ten catalogues; era one §2 is the
  contradiction §4.5 rules on, and its §7 table is the fixture set.
- `docs/superpowers/specs/2026-07-25-resource-model-xp-gold-design.md` — the XP/gold model
  this extends, including §5 principle 5's no-passive-income position (§5).
- `docs/superpowers/specs/2026-07-27-citizens-and-city-life-design.md` — §5 **D-CIT2** ("no
  time-based trickle", "no clock") and §15's rejection of time-based growth as "farmable by
  idling": the same ruling already made for population, cited in §5.1 as precedent.
- `packages/skill-graph/src/eras.ts` — `ERA_SEQUENCE`, and `EraLandBudget`, the
  authored/unauthored precedent §4.1 reuses.
- `apps/web/src/devPersistence/economyPersistence.ts` — the persistence path §1 extends.
