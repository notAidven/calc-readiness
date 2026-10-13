# The calc-readiness economy, measured at the tip

**Measured 2026-07-30 at `189690f`** (`integration`), which is `80760dd` plus two
documentation-only merges (`git diff --stat 80760dd origin/integration` reports
`2 files changed, 2719 insertions(+)`, both under `docs/`). Every figure below was
re-derived from code at that SHA; nothing is carried over from an earlier note.

**This is a measurement, not a change.** No economy code was edited. The one temporary
edit made during the run — `ERA_MATERIAL_TOTAL` forced to 500 to prove the solvency
census bites — was reverted and re-verified green (§4.3).

Every number carries the file and line it came from so the next reader can re-derive
rather than trust. Where the brief's figure disagreed with the measurement, the
measurement is reported and the disagreement is named.

---

## 0. What moved, in one screen

Five things a reader who stops here should take away.

1. **The one repeatable paid stream pays nothing at all.** The Town Hall drill builds a
   session id containing a colon (`CitySurface.tsx:1964`); `assertPart`
   (`events.ts:22-28`) rejects a colon in an event-id part, so `interleavedGrant` throws
   before a ledger row exists. Reproduced end to end through the real adapter in §2.4:
   **0 ledger rows, 0 material, 0 XP** for a live-shaped id, against 2 rows and 10 stone
   for a colon-free control. So practice is **0% of era income today**, not ~20%.
2. **Nine of the ten eras credit no material either.** `materialForEra`
   (`materials.ts:181-184`) returns `null` for every era whose `ERA_MATERIALS` entry is
   `proposed`, and only `prehistoric` is `authored` (`materials.ts:120-128`). The grant
   recipes then omit the payout key entirely (`earn.ts:56-59`, `earn.ts:125-128`), so a
   lesson completed in eras two to ten pays **XP only**. The whole per-era income table
   is what the code *would* pay if those materials were authored (§1.4).
3. **A priced cosmetics catalogue does exist, and it is wired.** Twenty purchasable
   items totalling **1,702** at era-one scale (`resources.ts:107-319`), sold through a
   mounted shop with era scaling applied at the point of sale (`Shop.tsx:440-441`,
   `App.tsx:618`). The brief's contingency ("if it does not exist, the lead's scarcity
   has nothing to bite on") does not apply. **The civic catalogue is the one with no
   implementation**: `applyCivicPurchase` / `applyMaterialSpend` have no production call
   site anywhere (§3.4).
4. **Practice's share of era income is constant across eras — but not for the stated
   reason, and not at 20%.** It is `K·m / (T + K·m)`, era-invariant because both streams
   ride the same `2^(N-1)` ladder, **not** because both scale with node count: lesson
   income is deliberately node-count-*independent* (`materials.ts:276-287`). At the
   repo's own "realistic" ten sets it is **14.29%** of total era income (16.67% of the
   lesson channel), not 20% (§1.3).
5. **Four prose claims about the nine-node rounding are backwards.** The rate rounds
   **down**, not up, and the two nine-node eras land **3 under**, not 3 over
   (`materials.ts:273-275`, `civicSolvency.test.ts:325-328`, `:474-477`). The same
   reversed sign produced the "10% to 20.5% (60–123)" headroom claim in
   `constants.ts:124-126`; measured, it is **10% to 20%, 59.98–120** (§4.4). Every
   assertion around them is green — the errors are entirely in the commentary, and one
   of them contradicts the assertion it sits above.

---

## 1. Income, per era

### 1.1 Lesson completion

**The grant.** `lessonCompleteGrant` (`earn.ts:49-68`) credits two things under one
event id `lesson_complete:{node_id}` (`events.ts:43-45`): `EARN.lessonComplete.xp = 20`
(`constants.ts:162`) and `lessonMaterialAmount(era)` of the node's era material.

**It is normalised per era, not flat.** `lessonMaterialAmount`
(`materials.ts:276-278`) is

```ts
Math.round((ERA_MATERIAL_TOTAL * eraCostMultiplier(eraId)) / eraNodeCount(eraId))
```

with `ERA_MATERIAL_TOTAL = 600` (`constants.ts:138`), `eraCostMultiplier(era) = 2^(N-1)`
(`materials.ts:224-226`, `ERA_COST_MULTIPLIER_STEP = 2` at `constants.ts:283`), and
`eraNodeCount` reading `ERA_SEQUENCE[…].nodes.length` (`materials.ts:251-257`). The era
TOTAL is the authored constant and the per-lesson rate is derived from it, so node count
leaves the supply side entirely.

**The XP on the same grant is NOT normalised.** `EARN.lessonComplete.xp` is a flat 20
per node (`constants.ts:162`), so XP per era still tracks era size while material does
not. That asymmetry is real and undiscussed in the constants table.

| Era | N | ×mult | nodes | per lesson | **material / era** | ÷mult | lesson XP / era |
| --- | --: | --: | --: | --: | --: | --: | --: |
| `prehistoric` | 1 | 1 | 6 | 100 | **600** | 600.000 | 120 |
| `neolithic` | 2 | 2 | 5 | 240 | **1,200** | 600.000 | 100 |
| `bronze_age` | 3 | 4 | 5 | 480 | **2,400** | 600.000 | 100 |
| `classical` | 4 | 8 | 5 | 960 | **4,800** | 600.000 | 100 |
| `medieval` | 5 | 16 | 5 | 1,920 | **9,600** | 600.000 | 100 |
| `renaissance` | 6 | 32 | 6 | 3,200 | **19,200** | 600.000 | 120 |
| `industrial` | 7 | 64 | 6 | 6,400 | **38,400** | 600.000 | 120 |
| `atomic_age` | 8 | 128 | 9 | 8,533 | **76,797** | 599.977 | 180 |
| `information_age` | 9 | 256 | 6 | 25,600 | **153,600** | 600.000 | 120 |
| `cyberpunk` | 10 | 512 | 9 | 34,133 | **307,197** | 599.994 | 180 |

Node counts read off `ERA_SEQUENCE` (`packages/skill-graph/src/eras.ts:143`, `154`,
`163`, `172`, `185`, `197`, `212`, `224`, `236`, `245-255`): 6, 5, 5, 5, 5, 6, 6, 9, 6, 9.

**Idempotency: one-shot.** The event id is a pure function of the node id
(`events.ts:43-45`), `applyGrant` returns a no-op for an id already on the ledger
(`grant.ts:97-99`), and `useEconomy` primes its fired set from `appliedEventIds()`
before reconciling (`useEconomy.ts:172-191`). Measured: replaying `lesson_complete:NUM.S`
against a ledger already holding its rows gives `applied=false, rows=0,
grantedMaterials={}`.

**Call sites.** `economySession.ts:245-249` (`reportLessonComplete`) ←
`useEconomy.ts:201-212` (`reconcileProgress`) ← `App.tsx:601` (`onCityLoad`). The grant
fires on **practice evidence**, not on the lesson being read: `deriveEarnEvents` requires
`finished && hasPracticeEvidence(state)` (`useEconomy.ts:99-109`), which is the #102
retiming so a tested-out node is not paid for work never done (`earn.ts:30-36`).

**Mastery stars are the third row and pay no currency.** `starGrant`
(`earn.ts:75-90`) credits `EARN.star.xp = 15` (`constants.ts:169`) and carries no
material key at all. One-shot per `star:{node_id}:{level}` (`events.ts:53-58`), levels 1
to 3 (`useEconomy.ts:110-112`), so up to 45 XP per node and `45 × nodes` per era —
again not normalised.

### 1.2 Practice

**Exactly one grant fires from a practice surface, and it is not the lesson practice
set.** `LessonPractice.tsx` contains no economy reference of any kind (grepped for
`economy|Economy|onCorrectAnswer|grant`: zero hits). Lesson practice reaches the economy
only indirectly, by stamping `last_practiced_at` and thereby releasing row 1 above.

The paying surface is `interleavedGrant` (`earn.ts:118-137`): XP 12 + material 10, both
at era-one scale (`constants.ts:184`), the material scaled by `eraScaledPrice`
(`materials.ts:290-292`) into the era the player is *in* — which `economySession.ts:63`
fixes at `CURRENT_ERA_ID`, i.e. `prehistoric` (`eraDressing.ts:153`).

| Era | ×mult | material / cleared set | XP / set | per-set cap (material) | per-set cap (XP) |
| --- | --: | --: | --: | --: | --: |
| `prehistoric` | 1 | 10 | 12 | 10 | 12 |
| `neolithic` | 2 | 20 | 12 | 20 | 12 |
| `bronze_age` | 4 | 40 | 12 | 40 | 12 |
| `classical` | 8 | 80 | 12 | 80 | 12 |
| `medieval` | 16 | 160 | 12 | 160 | 12 |
| `renaissance` | 32 | 320 | 12 | 320 | 12 |
| `industrial` | 64 | 640 | 12 | 640 | 12 |
| `atomic_age` | 128 | 1,280 | 12 | 1,280 | 12 |
| `information_age` | 256 | 2,560 | 12 | 2,560 | 12 |
| `cyberpunk` | 512 | 5,120 | 12 | 5,120 | 12 |

Caps measured by calling `capMaxFor` (`cap.ts:59-64`) on each era's material id. The cap
is **derived from the payout** (`constants.ts:270-271`: `max.xp = EARN.interleaved.xp`,
`maxMaterial = EARN.interleaved.material`), so it equals one set's request exactly and
never binds a correctly wired caller. It does clamp an over-request: asking for
`{xp: 9999, stone: 9999}` on the `interleaved` reason grants `{xp: 12}` and
`{stone: 10}`; the same request on `lesson_complete` (uncapped) grants all 9,999 of each.

The material column is subject to the same authored-material gate as §1.4: calling
`interleavedGrant` with `currentEra` set to each era in turn gives
`amounts={xp:12, stone:10}` for `prehistoric` and `amounts={xp:12}` — no material key at
all — for the other nine. The caps are real for all ten because `capMaxFor` reads the
material id rather than the era's authored status.

**There is no per-era total.** The number of sets is a free variable of learner effort,
so "practice income per era" is only defined against an assumption. The only such
assumption written down in the tree is **ten sets**, in
`civicSolvency.test.ts:671` (`const realisticSets = 10`), giving 100 material against 600
at era-one scale.

**Idempotency: repeatable, keyed per round.** The event id is
`interleaved:{session_id}` (`events.ts:48-50`) and the session id is
`` `${token}:${rounds}` `` where the token is minted fresh on every drill open
(`CitySurface.tsx:1939-1941`) and `rounds` increments per completed round
(`CitySurface.tsx:1958-1965`). So a fresh id per round, and re-reporting the same id is a
no-op — measured: same id `applied=false`, next round `applied=true` with
`{stone: 10}`. That the id shape is *also* the reason the whole stream throws is §2.4.

**Call sites.** `economySession.ts:257-268` ← `useEconomy.ts:251-283` ←
`App.tsx:602` (`onInterleavedClear`) ← `CitySurface.tsx:1956-1968`
(`handleInterleavedCorrect`) ← `CitySurface.tsx:2632` (`onCorrectAnswer` on the mounted
`EraInfinitePractice`) ← `EraInfinitePractice.tsx:115` ← `InfiniteDrill.tsx:199`.

**A round is not a fixed amount of work, and that is an economy fact.**
`interleavedRoundLength = Math.max(interleavedSkills.length, INTERLEAVED_PRACTICE_MIN_COMPLETED)`
(`CitySurface.tsx:1928-1931`) with the floor at 2 (`townHall.ts:109`). One round pays a
flat 10 material at era one, so the rate per correct answer is:

| practiced skills in the era | round length | material per correct answer |
| --: | --: | --: |
| 2 | 2 | 5.000 |
| 3 | 3 | 3.333 |
| 4 | 4 | 2.500 |
| 5 | 5 | 2.000 |
| 6 | 6 | 1.667 |

A learner who has unlocked two skills earns **three times as much per problem** as one
who has unlocked six. The incentive points away from finishing an era's lessons. Nothing
in `packages/economy` can see this, because the economy is told "a set was cleared" and
the city decides what a set is.

### 1.3 Practice as a percentage of era income

**The belief is half right and its stated reason is wrong.**

The share is `K·m / (T + K·m)` where `K` is sets completed, `m = EARN.interleaved.material`
and `T = ERA_MATERIAL_TOTAL`. The era multiplier `2^(N-1)` multiplies both terms and
cancels, so the percentage is **constant across all ten eras** for any fixed `K`.
Measured, per era, over K ∈ {1, 5, 10, 20, 60}: 1.64%, 7.69%, 14.29%, 25.00%, 50.00% —
identical to two decimal places in every era, including the two nine-node eras whose
totals are 3 short.

But **not "because both streams scale with node count"**. Neither does:

- Lesson income is *deliberately node-count-independent*: `lessonMaterialAmount` divides
  by the node count (`materials.ts:277`) and `eraMaterialTotal` multiplies it back
  (`materials.ts:285-287`), landing on `ERA_MATERIAL_TOTAL` up to rounding. That is the
  entire point of the normalisation (`constants.ts:93-98`).
- Practice income does not scale with node count either — it scales with sets completed.
  The only node-count dependency is the round length above, which makes practice pay
  *less* per problem as an era's node count is unlocked.

**And it is not ~20%.** 20% needs exactly 15 sets per era. At the tree's own "realistic"
ten sets it is **14.29% of total era income**, or **16.67% of the lesson channel** —
which is the figure `civicSolvency.test.ts:673` pins as `toBeCloseTo(0.17, 2)`. The
"~20%" belief is most likely a memory of the *headroom* share (10%–20% of the era grant,
§4.4), which is a different quantity on the outgoings side.

**At the tip the measured share is 0% in every era**, because the stream throws (§2.4).

### 1.4 The caveat that swallows the whole table

`materialForEra` (`materials.ts:181-184`) returns the identity only for an `authored`
entry, and `ERA_MATERIALS` (`materials.ts:119-178`) marks exactly one era authored:
`prehistoric` (`materials.ts:120-128`). The other nine carry `status: "proposed"`.
Both paying recipes then build the payout as `null` and spread nothing:

```ts
const payout = era === undefined || material === null ? null : { [material.id]: … };
amounts: { xp: EARN.lessonComplete.xp, ...(payout ?? {}) }
```

(`earn.ts:55-64`; the same shape at `earn.ts:124-133`.)

Measured by calling `lessonCompleteGrant` on the first node of each era and applying it
to an empty ledger:

| Era | first node | rows written | granted | granted materials |
| --- | --- | --: | --- | --- |
| `prehistoric` | `NUM.S` | 2 | `{xp: 20}` | `{stone: 100}` |
| `neolithic` … `cyberpunk` | `EXP.1` … `TRG.1` | 1 | `{xp: 20}` | `{}` |

So **§1.1's material column is a projection, not a payout**, for nine eras out of ten.
`civicSolvency.test.ts:101-103` computes `earnableIn` straight from
`lessonMaterialAmount`, bypassing the authored gate — so the solvency sweep is green over
income nine eras cannot currently receive. That is a scoping fact about the sweep, not a
defect in it, but it belongs beside the verdict.

---

## 2. The one unbounded stream

### 2.1 Every call site that credits a resource

`applyGrant` (`grant.ts:84-165`) is the only function in the tree that mints a
`kind: "grant"` ledger row (`grant.ts:130-139`). Its only production caller is
`economySession.ts:147`, reached through three adapter methods. The complete enumeration:

| # | Credit path | Kind | Bound |
| --: | --- | --- | --- |
| 1 | `lessonCompleteGrant` → `economySession.ts:247` ← `useEconomy.ts:207` ← `App.tsx:601` | **one-shot** per `lesson_complete:{node}` | ≤ node count; era total ≈ 600·2^(N-1) |
| 2 | `starGrant` → `economySession.ts:253` ← `useEconomy.ts:219` ← `App.tsx:601` | **one-shot** per `star:{node}:{level}` | ≤ 3 per node; **XP only, no currency** |
| 3 | `interleavedGrant` → `economySession.ts:260` ← `useEconomy.ts:253` ← `App.tsx:602` ← `CitySurface.tsx:1963` ← `CitySurface.tsx:2632` | **repeatable**, one id per round | per-set clamp only; **no aggregate ceiling** |
| 4 | `prestigeUnlocks` → `economySession.ts:140-144` | repeatable-safe reconciliation | grants **cosmetics**, never a resource (`resources.ts:410-415`) |
| 5 | `materialCarryForward` / `era_advance:` credit leg (`materials.ts:306-311`, `constants.ts:49-50`) | would be one-shot per era advance | **not wired** — no call site outside `packages/economy` tests |
| 6 | Road removal "refund" (`citySession.ts:670-675`, `roadsEconomy.ts:26-28`) | not a credit | decrements a city-side spend counter; `roadsEconomy` "NEVER mints material" |

**Two more endless practice surfaces exist and pay nothing**, which is worth stating
because it is a property of their *wiring*, not of any guard:

- `EraInfinitePractice` on the dev page — mounted with `eraId`, `completedNodeIds`,
  `onExit` and **no `onCorrectAnswer`** (`DevLessons.tsx:375-379`).
- `InfinitePractice` from the lesson menu — mounted with `nodeId` and `onExit` only
  (`AdvisorLesson.tsx:239-242`), and from the diagnostic probe likewise
  (`InteractivePracticeProbe.tsx:67-71`).

Both accept an optional `onCorrectAnswer` (`InfiniteDrill.tsx:118`,
`EraInfinitePractice.tsx:69`). Wiring either would create a second uncapped repeatable
path by default, and nothing in the tree would fail.

### 2.2 Verdict on the claim

**Confirmed, with one correction to the phrasing.** Exactly one paid stream is
repeatable: the interleaved drill reached from the Town Hall (`CitySurface.tsx:2619-2636`,
opened from the hub panel at `CitySurface.tsx:1936-1944`). It is unbounded in the
aggregate. It is **not** uncapped: there is a per-grant clamp.

### 2.3 The caps, quoted

The only ceiling that exists:

```ts
export function capMaxFor(resource: EconomyResource): number {
  if (isMaterialId(resource)) {
    return Math.round(CAP.maxMaterial * eraCostMultiplier(eraOfMaterial(resource)));
  }
  return CAP.max[resource];
}
```

(`cap.ts:59-64`.) Applied in `applyGrant` at `grant.ts:126`
(`const amount = capped ? Math.min(requested, capRemaining(resource)) : requested`), and
only for reasons in `CAPPED_REASONS`, which is the single-element set
`{REASON_INTERLEAVED}` (`constants.ts:76`).

Because `CAP` is derived from `EARN.interleaved` (`constants.ts:270-271`), the clamp
equals one set's payout in every era, so it never reduces an honest grant. There is no
window (`constants.ts:20-23`: "There is NO `windowMs` on `CAP`"), no daily ceiling, and
no per-era ceiling — the last is an explicit ruling, not an omission
(`constants.ts:228-249`: "A hard per-era ceiling on practice income was queued and is
**WITHDRAWN** … Do not build one").

**So the ceiling on lifetime practice income is: none.** The bound is effort, at
10·2^(N-1) material per cleared round.

### 2.4 …except that the stream is dead

**Defect D-1, severity: the entire repeatable economy.**

`buildEventId` rejects a colon inside any part, because colon is the delimiter:

```ts
function assertPart(part: string, label: string): void {
  if (part.length === 0 || part.includes(":")) {
    throw new Error(
      `economy event id: ${label} must be non-empty and contain no ':' (got "${part}").`,
    );
  }
}
```

(`events.ts:22-28`, reached from `interleavedEventId` at `events.ts:48-50`.)

The Town Hall builds its session id **with a colon in it**:

```ts
void onInterleavedClear?.({
  sessionId: `${interleavedSessionRef.current}:${rounds}`,
});
```

(`CitySurface.tsx:1963-1965`.)

**Reproduced through the real in-memory adapter** (`createInMemoryEconomyClient`,
`economySession.ts:113`), using a session id built exactly as `CitySurface.tsx:1939-1941`
and `:1964` build it:

```
live-shaped id "ms6w5hon-5mj1:1": THREW -> economy event id: part must be non-empty
                                  and contain no ':' (got "ms6w5hon-5mj1:1").
ledger rows after the live-shaped report: 0
control id "session-1": applied=true granted={"xp":12} materials={"stone":10}
ledger rows after the control report: 2
wallet after control: spendable=10 materials={"stone":10} xp=12
```

The throw is synchronous inside `economySession.ts:257-268`; `useEconomy`'s
`reportInterleavedClear` is `async` (`useEconomy.ts:251-283`) so it becomes a rejected
promise, and `CitySurface.tsx:1963` discards it with `void`. Nothing is logged to the
learner; the drill keeps running and the streak keeps counting.

**Why no test catches it.** The two halves of the seam are each covered, and the join is
covered by neither:

- The producer side asserts the ids are distinct against a `vi.fn()` mock and never
  hands one to the economy: `CitySurface.interleaved.test.tsx:138`, `:168-169`,
  `:224-225`.
- The consumer side is exercised only with hand-written, colon-free ids —
  `"session-1"`, `"grind-0"`, `"same-set"` (`useEconomy.test.tsx:51`, `:74`, `:95`),
  `"town-hall-round-1"`, `"post-refresh"`, `"round-1"` (`economyPersistence.test.ts:278`,
  `:318`, `:337`, `:353`), `"sess-1"` (`economyMaterials.test.ts:165`).

This is the guard-population failure the repo's own QA rule describes: the population was
scoped to where the mechanic is implemented rather than to the behaviour, so the one
string the product actually produces sits outside both guards.

**Age.** `git log -L` dates the colon-bearing wiring to `6ac0638`, *"Wire interleaved
practice into the Town Hall"*, 2026-07-26. `assertPart` predates it by a day, in
`1a4d181`, 2026-07-25. So the payout has never fired since the day it was wired, and
`work-log/evan.md:322`'s "a clear now actually pays" was never true of the shipped path.

**Not fixed here, per the brief.** The obvious repairs are (a) drop the colon in
`CitySurface.tsx:1964` in favour of a separator `assertPart` allows, or (b) let
`interleavedEventId` accept a structured `(token, round)` pair. Either wants a guard
built from the id the city actually produces rather than a literal.

---

## 3. Outgoings, per era

### 3.1 The civic catalogue

Forty rows, four per era, one of each role (`civicCatalogue.ts:230-709`; the four roles
are declared at `civicCatalogue.ts:78-80` and every `(era, role)` pair is asserted
resolvable at `civicCatalogue.test.ts:123-128`). Costs are authored data at each era's
own scale, **not** derived from the ladder — era seven prices its food row at 3,840 where
`2^6 × 80` would say 5,120 (`civicCatalogue.ts:504-517`). Contributions *do* follow the
ladder: the headline magnitude is `20 × 2^(N-1)` in every era, with a blend row at half
of it and a dwelling's secondary happiness at a quarter (`civicCatalogue.ts:220-224`).

> ## ⚑ THE COST COLUMN BELOW IS THE PRE-2026-07-30 SNAPSHOT — 28 of the 40 have since moved
>
> **This document is a measurement at a SHA and stays one**, so the table is not rewritten. What is
> owed is the notice: the team lead ruled on 2026-07-30 that the ten catalogues may not share one
> price shape (*"the buildings shouldn't all have the same price ratios and be priced the exact same
> relative to each other across eras"*), and **seven eras were re-priced — two, three, four, five,
> six, eight and nine.** Eras one, seven and ten are unchanged, so their twelve rows below are still
> current. **Read `packages/economy/src/civicCatalogue.ts` and the ten `civic-buildings.md` tables
> for the live figures**, which `test/eraCivicCatalogueParity.test.ts` holds identical.
>
> **What the pass did NOT move**, so this document's own conclusions are not all stale: every
> footprint, every contribution, and **every `greedy` column in §3.3 and every `income − greedy`
> column in §4.1** — the re-price holds each era's `min(food, dwelling) + amenity` at 180 at era-one
> scale, which is what the greedy plan buys. **What it did move is the exact optimum in two eras**, and
> §3.3 carries that note beside the table it affects.
>
> **The name column was already stale independently of this** — it reads *The Cold Store*, *The Wash
> House*, *The Food Warehouse*, *The Capsule Homes* and *The Reservoir*, all renamed on 2026-07-29.

Under the pooled-livability ruling a food row's "food for ~N" and a dwelling's "N
livability" are the **same contribution** (`capacity.ts:60-68`, `civicCatalogue.ts:224-228`),
which is why both land in `livability` below.

> **⚑ FOUR DISPLAY NAMES BELOW HAVE SINCE BEEN RENAMED, and the `id` column is why this table is
> still usable rather than merely wrong.** This is a **measurement at a SHA** and the numbers are the
> point, so no figure below is touched. But a reader grepping
> `packages/economy/src/civicCatalogue.ts` for a name in this table will not find four of them, so
> the map is here:
>
> | This table says | The module says now | `id`, which did NOT change |
> | --- | --- | --- |
> | The Wash House | **The Food Works** | `industrial_public_baths` |
> | The Food Warehouse | **The Distribution Center** | `information_age_food_warehouse` |
> | The Capsule Homes | **The Pod Apartments** | `cyberpunk_capsule_homes` |
> | The Reservoir | **The Nightclub** | `cyberpunk_station` |
>
> **Not one number moved with any of the four**, so every figure, total and derivation in this file
> stands exactly as measured. **The ids are stable by design** — `test/eraCivicCatalogueParity.test.ts`
> says so in as many words, *"the shipped `id` is stable and must not change with a display name"* —
> which is what makes a rename safe for a document like this one. The `cyberpunk_station` id is the
> oddest-looking of the four and it is correct: that row has been The Station, The Nightclub, The
> Reservoir and now **The Nightclub again**, and the id has never moved.

| Era (×mult) | Building (`id`) | Role | Footprint | Cost | Livability | Happiness |
| --- | --- | --- | --- | --: | --: | --: |
| 1 `prehistoric` ×1 | The Smokehouse (`prehistoric_smokehouse`) | food | 2×1 | 80 | 20 | 0 |
| | The Family Lodge (`prehistoric_longhouse`) | dwelling | 2×2 | 80 | 20 | 5 |
| | The Campfire (`prehistoric_campfire`) | amenity | 2×2 | 100 | 0 | 20 |
| | The Spring (`prehistoric_storage_pit`) | blend | 1×1 | 120 | 10 | 10 |
| 2 `neolithic` ×2 | The Granary (`neolithic_granary`) | food | 2×1 | 160 | 40 | 0 |
| | The Village Houses (`neolithic_village_houses`) | dwelling | 2×2 | 160 | 40 | 10 |
| | The Bread Oven (`neolithic_bread_oven`) | amenity | 2×2 | 200 | 0 | 40 |
| | The Village Well (`neolithic_village_well`) | blend | 1×1 | 240 | 20 | 20 |
| 3 `bronze_age` ×4 | The Terraced Fields (`bronze_age_terraced_fields`) | food | 1×2 | 320 | 80 | 0 |
| | The Walled Houses (`bronze_age_walled_houses`) | dwelling | 2×2 | 320 | 80 | 20 |
| | The Steam House (`bronze_age_bathhouse`) | amenity | 3×2 | 400 | 0 | 80 |
| | The Trading Post (`bronze_age_weigh_house`) | blend | 1×1 | 480 | 40 | 40 |
| 4 `classical` ×8 | The Grain Dock (`classical_public_granary`) | food | 2×2 | 640 | 160 | 0 |
| | The Cottages (`classical_apartment_block`) | dwelling | 1×2 | 800 | 160 | 0 |
| | The Baths (`classical_baths`) | amenity | 3×2 | 800 | 0 | 160 |
| | The Fountain (`classical_fountain`) | blend | 1×1 | 960 | 80 | 80 |
| 5 `medieval` ×16 | The Great Barn (`medieval_great_barn`) | food | 2×2 | 1,280 | 320 | 0 |
| | The Castle (`medieval_cottages`) | dwelling | 2×1 | 1,440 | 320 | 0 |
| | The Fairground (`medieval_market_square`) | amenity | 2×2 | 1,600 | 0 | 320 |
| | The Chapel (`medieval_chapel`) | blend | 1×1 | 1,920 | 160 | 160 |
| 6 `renaissance` ×32 | The Covered Market (`renaissance_covered_market`) | food | 2×2 | 2,560 | 640 | 0 |
| | The Merchant Houses (`renaissance_grand_apartments`) | dwelling | 2×2 | 2,880 | 640 | 160 |
| | The Town Square (`renaissance_town_square`) | amenity | 3×2 | 3,200 | 0 | 640 |
| | The Painters' School (`renaissance_hospital`) | blend | 1×2 | 3,840 | 320 | 320 |
| 7 `industrial` ×64 | The Cold Store (`industrial_cold_store`) | food | 2×2 | 3,840 | 1,280 | 0 |
| | The Workers' Houses (`industrial_workers_houses`) | dwelling | 2×1 | 4,480 | 1,280 | 0 |
| | The Wash House (`industrial_public_baths`) | amenity | 2×2 | 6,400 | 0 | 1,280 |
| | The Library (`industrial_library`) | blend | 1×1 | 7,680 | 640 | 640 |
| 8 `atomic_age` ×128 | The Supermarket (`atomic_age_supermarket`) | food | 2×2 | 10,240 | 2,560 | 0 |
| | The Apartment Tower (`atomic_age_apartment_tower`) | dwelling | 1×1 | 12,800 | 2,560 | 0 |
| | The Swimming Pool (`atomic_age_swimming_pool`) | amenity | 3×2 | 12,800 | 0 | 2,560 |
| | The Fire Station (`atomic_age_community_centre`) | blend | 2×1 | 15,360 | 1,280 | 1,280 |
| 9 `information_age` ×256 | The Food Warehouse (`information_age_food_warehouse`) | food | 2×2 | 20,480 | 5,120 | 0 |
| | The Condominium (`information_age_residential_tower`) | dwelling | 1×1 | 23,040 | 5,120 | 0 |
| | The Roof Garden (`information_age_park`) | amenity | 3×2 | 25,600 | 0 | 5,120 |
| | The Hospital (`information_age_clinic`) | blend | 1×2 | 30,720 | 2,560 | 2,560 |
| 10 `cyberpunk` ×512 | The Vertical Farm (`cyberpunk_vertical_farm`) | food | 1×1 | 40,960 | 10,240 | 2,560 |
| | The Capsule Homes (`cyberpunk_capsule_homes`) | dwelling | 1×1 | 35,840 | 10,240 | 0 |
| | The Night Market (`cyberpunk_night_market`) | amenity | 3×2 | 46,080 | 0 | 10,240 |
| | The Reservoir (`cyberpunk_station`) | blend | 2×2 | 61,440 | 5,120 | 5,120 |

Two ids read wrong against their own names and stay that way deliberately —
`renaissance_hospital` holds *The Painters' School* and `information_age_clinic` holds
*The Hospital*, because the lead moved the hospital to era nine and an id is a key
(`civicCatalogue.ts:98-125`, `:487-490`, `:642-644`).

### 3.2 The target the city must meet

**This lives only in the test file.** `packages/economy/src` ships no population model:
`capacityShortfall` takes population as a parameter (`capacity.ts:125-135`) and
`isSolvent` takes both sides as parameters (`capacity.ts:147-149`). The target used
below is `civicSolvency.test.ts:108-119`:

```ts
const people = 3 * (20 * eraCostMultiplier(eraId));   // 3 × the headline magnitude
return { livability: people, happiness: people };
```

so 60/60 at era one, doubling per era. Anyone retuning the economy is retuning against a
number that exists in a test and nowhere else.

### 3.3 The optimal city, and the greedy upper bound

`greedyPlanCost` (`capacity.ts:168-205`) prices each axis independently at the cheapest
row per unit, so it cannot see a blend row covering both. It is documented as an upper
bound (`capacity.ts:155-166`) and it is one.

I re-derived the exact optimum independently — exhaustive search over whole-building
counts with duplicates allowed, pruned on cost — rather than reading
`civicSolvency.test.ts:136-181`. The two agree on all ten eras.

| Era | greedy | **optimal** | gap | cheapest mix at the optimum |
| --- | --: | --: | --: | --- |
| `prehistoric` | 540 | **520** | 20 | 4× The Family Lodge, 2× The Campfire |
| `neolithic` | 1,080 | **1,040** | 40 | 4× The Village Houses, 2× The Bread Oven |
| `bronze_age` | 2,160 | **2,080** | 80 | 4× The Walled Houses, 2× The Steam House |
| `classical` | 4,320 | **4,320** | 0 | 3× The Grain Dock, 3× The Baths |
| `medieval` | 8,640 | **8,640** | 0 | 3× The Great Barn, 3× The Fairground |
| `renaissance` | 17,280 | **17,280** | 0 | 3× The Covered Market, 3× The Town Square |
| `industrial` | 30,720 | **30,720** | 0 | 3× The Cold Store, 3× The Wash House |
| `atomic_age` | 69,120 | **69,120** | 0 | 3× The Supermarket, 3× The Swimming Pool |
| `information_age` | 138,240 | **138,240** | 0 | 3× The Food Warehouse, 3× The Roof Garden |
| `cyberpunk` | 245,760 | **245,760** | 0 | 3× The Capsule Homes, 3× The Night Market |

**The gap is non-zero in exactly three eras, and always for the same reason.** Those are
the three whose dwelling row carries a secondary happiness — 5, 10 and 20 (§3.1) — and in
each of them **four dwellings supply exactly one amenity's worth of happiness** (4×5 = 20
against the Campfire's 20; 4×10 = 40 against the Bread Oven's 40; 4×20 = 80 against the
Steam House's 80) while costing less than the amenity does. So the optimum buys a fourth
dwelling instead of a third amenity and banks the difference: 100 − 80 = 20, 200 − 160 =
40, 400 − 320 = 80 — which is the measured gap in each case, exactly. Greedy prices the
two axes separately and cannot see happiness riding on a livability purchase. From era
four on every dwelling is happiness-zero, so the two methods agree.

Normalised to era-one scale the optimum is 520 for eras one to three, 540 for eras four,
five, six, eight and nine, and 480 for eras seven and ten — the two that price food below
the ladder.

Era ten is the one era whose optimum uses the *dwelling* rather than the food row: The
Capsule Homes at 35,840 undercut The Vertical Farm at 40,960 (`civicCatalogue.ts:657-684`).

> ## ⚑ THE GAP IS NON-ZERO IN ONE ERA SINCE 2026-07-30, NOT THREE — and the mechanism above is why
>
> **The explanation in this section is what predicted it, so it is worth reading before the numbers.**
> The gap needs a dwelling that carries a secondary happiness AND costs no more than its era's food
> row, so that a fourth dwelling is cheaper than the amenity it replaces. Eras one, two and three had
> both halves **only because all three priced their dwelling identically to their food row** — which
> is precisely the uniformity the team lead's 2026-07-30 cost-variance ruling removed. Era two's
> dwelling is now 20 grain dearer than its Granary and era three's 80 bronze dearer than its Fields,
> so both optima rose to meet their own greedy bound: **`neolithic` 1,040 → 1,080 and `bronze_age`
> 2,080 → 2,160**, with the `+160` and `+320` in §4.1 becoming `+120` and `+240`. Era one is
> unchanged and keeps its gap, which is the only reason the mechanism is still observable at all.
>
> **The cheapest-mix column moves with it**: eras two and three now buy `3× food + 3× amenity` like the
> six eras below them, and era five's mix is now `3× The Great Barn, 3× The Fairground` for a second
> reason — its Fairground is the cheapest of its four rather than merely the cheapest amenity.
>
> `packages/economy/src/civicSolvency.test.ts` derives the qualifying set from the catalogue and
> asserts it equals the gap list, so the two cannot drift apart again.

### 3.4 The civic catalogue has no purchase path

**Defect D-2.** `applyCivicPurchase` (`civicBuilding.ts:219`) and the
`applyMaterialSpend` it wraps (`materialSpend.ts:63`) have **no production call site
anywhere.** Grepped tree-wide:

- `applyCivicPurchase` — its own definition, its own test file
  (`civicBuilding.test.ts`, 13 call sites), and one prose reference in `spend.ts:92`.
  Nothing else.
- `applyMaterialSpend` outside `packages/economy` — three hits, all in one web-lane test
  (`economyMaterials.test.ts:2`, `:428`, `:443`).
- `CIVIC_CATALOGUE` / `civicCatalogueForEra` / `civicBuildingOrThrow` /
  `findCivicBuilding` outside `packages/economy` — one file,
  `test/eraCivicCatalogueParity.test.ts`.

So the outgoings priced in §3.1 and optimised in §3.3 **cannot be spent today**. The
headline in §4 is a solvency statement about a sink that does not exist in the product.
`roadsEconomy.ts:36-39` already names the missing primitive: *"a real
`@cr/economy.spendMaterial({ amount, reason })` + `EconomyClient.spendMaterial`, which is
the recommended follow-up"*.

### 3.5 Cosmetics — the priced catalogue exists

**The brief's contingency does not apply.** `COSMETIC_CATALOG` (`resources.ts:107-319`)
holds 24 descriptors: **20 material-purchasable totalling 1,702** at era-one scale, and 4
XP-prestige items that are granted, never sold (`resources.ts:283-318`,
`resources.ts:410-415`).

| Band | Items | Prices |
| --- | --: | --- |
| Impulse decorations | 4 | 12, 18, 28, 35 |
| Early–mid skins + cheapest theme | 6 | 20, 22, 22, 40, 50, 55 |
| Mid skins and themes | 6 | 60, 75, 110, 120, 125, 150 |
| Aspirational | 4 | 150, 160, 210, 240 |

(Read off `resources.ts:116`, `:124`, `:132`, `:140`, `:153`, `:161`, `:169`, `:177`,
`:185`, `:193`, `:201`, `:209`, `:217`, `:229`, `:237`, `:245`, `:253`, `:261`, `:272`,
`:280`. Sum measured: 1,702, matching `civicSolvency.test.ts:625`.)

**And it is wired.** The shop is mounted at `App.tsx:618`, reads the descriptor price and
scales it at the point of sale (`Shop.tsx:440-441`,
`eraScaledPrice(eraOnePrice, CURRENT_ERA_ID)`), and the purchase goes through
`applySpend` (`economySession.ts:213-232`), guarded against the road-net balance
(`roadsEconomy.ts:68-89`).

**Roads are the second live sink, and they are mispriced against the ladder.**
`ROAD_TILE_GOLD_COST = 5` lives in `apps/web/src/city/roads.ts:34`, outside the §12
tuning table, and is **never multiplied by `eraCostMultiplier`** — the file says so
itself (`roads.ts:27-33`: "a per-tile price 'should' live in the economy's §12 tuning
table … It lives here only because `@cr/economy` is frozen for this lane"). Every other
price in the economy is authored at era one and scaled at the point of sale
(`constants.ts:30-39`). So a road tile is 0.83% of an era-one lesson and 0.0015% of an
era-ten one. Call it **defect D-3**; it does not bite while `CURRENT_ERA_ID` is era one.

**A third set of economy magnitudes lives outside the tuning table too**, and it is worth
knowing about before constants are set: `engines/game/src/hard-winter-tuning.ts` holds
`reclaim_cost_per_cell: 3` (`:298`) and `rebuild_cost_per_ruin: 60` (`:352`), summed into
`recovery_cost` at `hard-winter.ts:1365`. Both are documented as **reported and never
spent** — there is no sink behind them — so they do not enter any figure above. The new
`docs/superpowers/specs/2026-07-29-mid-era-crisis-design.md`, merged into `integration`
during this run, builds on them, which is what makes them a live tuning surface rather
than a curiosity.

---

## 4. The headline, per era

### 4.1 Income minus the optimal city

Lesson income from §1.1, optimum from §3.3. Practice income is excluded because it has no
per-era denominator (§1.2) and, at the tip, pays zero (§2.4).

| Era | lesson income | optimal city | **income − optimal** | headroom share | income − greedy |
| --- | --: | --: | --: | --: | --: |
| `prehistoric` | 600 | 520 | **+80** | 13.33% | +60 |
| `neolithic` | 1,200 | 1,040 | **+160** | 13.33% | +120 |
| `bronze_age` | 2,400 | 2,080 | **+320** | 13.33% | +240 |
| `classical` | 4,800 | 4,320 | **+480** | 10.00% | +480 |
| `medieval` | 9,600 | 8,640 | **+960** | 10.00% | +960 |
| `renaissance` | 19,200 | 17,280 | **+1,920** | 10.00% | +1,920 |
| `industrial` | 38,400 | 30,720 | **+7,680** | 20.00% | +7,680 |
| `atomic_age` | 76,797 | 69,120 | **+7,677** | 10.00% | +7,677 |
| `information_age` | 153,600 | 138,240 | **+15,360** | 10.00% | +15,360 |
| `cyberpunk` | 307,197 | 245,760 | **+61,437** | 20.00% | +61,437 |

**No era fails to clear.** All ten are positive at the optimum and all ten are positive
even against the conservative greedy bound. The tightest margin is `atomic_age` at
9.9996% — narrower than `prehistoric`'s exact 10% only because its nine-node rate rounds
down (§4.4), which is the opposite of the reason recorded in
`civicSolvency.test.ts:474-477`.

Summed at era-one scale, the ten optimum headrooms come to **779.97**, which is 45.83% of
the 1,702-unit cosmetics catalogue. So lesson income alone funds a little under half the
cosmetics across an entire ten-era run, with every city built at its cheapest.

### 4.2 The solvency assertion

It is `packages/economy/src/civicSolvency.test.ts`. Four of its seventeen tests carry the
claim:

| Line | What it pins |
| --- | --- |
| `:255-354` | The full ten-row report — lessons, earnable, greedy need, headroom, solvent — as a `toEqual` on literal data |
| `:356-373` | The insolvency census asserted **empty**, with a floor (`toHaveLength(10)` on the population and on the solvent subset) and the four formerly-failing eras named individually |
| `:375-424` | The same ten eras against the **exact optimum**, plus `needed >= optimal` for every row and the verdicts agreeing between bound and optimum |
| `:426-468` | That solvency no longer reads off lesson count: `earnable / multiplier ≈ ERA_MATERIAL_TOTAL` for all ten, with a shape floor requiring the population to actually contain the 5-, 6- and 9-node sizes |

**It is green.** Measured at `189690f`:

```
✓ packages/economy/src/civicSolvency.test.ts  (17 tests)
  Test Files  1 passed (1)
       Tests  17 passed (17)
```

### 4.3 …and it is load-bearing, demonstrated rather than argued

A census asserted empty is satisfied by an empty population, so green alone proves
nothing. Injected defect: `ERA_MATERIAL_TOTAL` forced from 600 to 500 in
`constants.ts:138` — below the measured floor of 540 — and the file re-run:

```
FAIL  … > names the eras that do NOT close, as a census that is now EMPTY
AssertionError: expected [ 'prehistoric', 'neolithic', …(6) ] to deeply equal []

 Test Files  1 failed (1)
      Tests  9 failed | 8 passed (17)
```

Eight of the ten eras are named insolvent and nine of the seventeen assertions turn red,
including the pinned report, the exact-optimum table and the two cosmetics-arithmetic
tests. `constants.ts` was restored from a pre-edit copy and the file re-run: **17 passed
(17)**, with `git status` clean.

### 4.4 Defect D-4: four prose claims with a reversed sign

`600` does not divide by `9`, so the two nine-node eras round. The tree records the
direction four times, and it is backwards each time.

Measured: `Math.round(600 × 128 / 9) = Math.round(8533.33) = 8533`, and `8533 × 9 =
76,797` against a target of `76,800`. Same shape at era ten: `34,133 × 9 = 307,197`
against `307,200`. **The rate rounds down and the total lands 3 under.**

| Where | What it says | Measured |
| --- | --- | --- |
| `materials.ts:273-275` | "the two nine-node eras land **3 OVER** rather than 6 under — the safe direction for a solvency guarantee" | 3 **under**; the direction named as safe is the one it does not take |
| `civicSolvency.test.ts:325-328` | "the derived rate **rounds UP** and the era total comes in **3 over at era-one scale** (76,797 against 76,800 here)" | rounds **down**; 3 under; and the 3 is at era-*eight* scale (0.023 at era-one scale) |
| `civicSolvency.test.ts:474-477` | "Era eight … holds the tightest margin … because its nine-node rate **rounds up and adds 3** to a supply of 76,800" | rounds down and subtracts 3 — **and the stated mechanism contradicts the assertion three lines below it** |
| `constants.ts:124-126` | "headroom is **10% to 20.5%** of an era's grant (**60–123** at era-one scale)" | **10% to 20%**, **59.98–120** |

The third row is the sharpest, because it is self-refuting: if era eight's supply were
76,803 its headroom share would be 0.10004, i.e. *wider* than era one's exact 0.1, and
`expect(narrowest.era).toBe("atomic_age")` at `:485` would fail. That assertion passes
precisely because the supply is 76,797. Measured: 7,677/76,797 = 0.099965 against era
one's 60/600 = 0.100000.

The fourth follows arithmetically from the first two: if era ten's total were 3 *over* at
era-one scale, its headroom would be 120 + 3 = 123 and 123/600 = 20.5%. One reversed sign
produced all four numbers.

**Nothing is broken by it.** 599.977 still clears a need of 540, so solvency is
unaffected, and every assertion in the area is written loosely enough to pass either way
(`civicSolvency.test.ts:438` is `toBeCloseTo(ERA_MATERIAL_TOTAL, 1)`; `:480-481` are
`toBeCloseTo(0.1, 3)` and `toBeCloseTo(0.2, 3)`). It matters because the lead is about to
set constants against a headroom band, and the published top of that band is 2.5% too
generous.

---

## 5. Reaching 30%

### 5.1 The two constants

| Constant | Current value | Location |
| --- | --: | --- |
| `EARN.interleaved.material` | **10** | `packages/economy/src/constants.ts:184` |
| `ERA_MATERIAL_TOTAL` | **600** | `packages/economy/src/constants.ts:138` |

**Not changed**, per the brief.

Practice's share of era income is `K·m / (T + K·m)`, so those two are the whole lever;
the era multiplier cancels and nothing else enters. A third constant moves for free:
`CAP.maxMaterial` is *defined as* `EARN.interleaved.material` (`constants.ts:271`), so
raising the payout raises the ceiling in the same edit. There is no stale-ceiling trap
here — which is exactly what `constants.ts:251-257` says the derivation is for.

### 5.2 What 30% costs, both readings

"30% of era income" is ambiguous between the total and the lesson channel; both are
below, both at the tree's own ten-sets assumption (`civicSolvency.test.ts:671`).

| Reading | Formula | Current | Lever: sets | Lever: payout |
| --- | --- | --: | --- | --- |
| share of **total** era income | `K·m / (T + K·m)` | **14.29%** | 25.71 → **26 sets** gives 30.23% | `m = 25.71` → **26** gives 30.23% |
| share of the **lesson channel** | `K·m / T` | **16.67%** | **18 sets** gives exactly 30% | `m = 18` gives exactly 30% |

**`ERA_MATERIAL_TOTAL` is not a usable lever.** Holding `K = 10` and `m = 10`, 30% of
total income needs `T = 233.33`. The floor is 540 — the worst era's optimum city at
era-one scale, measured in §3.3 and stated at `constants.ts:110-113` — so cutting `T`
that far makes six of the ten eras unfinishable. The only feasible lever is
`EARN.interleaved.material`.

### 5.3 What raising the payout does to the scarcity ruling

The lead's second ruling (`constants.ts:102-107`) is that no era may afford both its city
and the whole cosmetics catalogue. Raising `m` moves that boundary, measured against the
catalogue total 1,702 and the scarcity ceiling `480 + 1,702 = 2,182`
(`civicSolvency.test.ts:652-659`):

| `m` | share @ 10 sets (total) | sets for the whole catalogue | sets to clear the ceiling inside one era | sets to out-earn the lesson channel |
| --: | --: | --: | --: | --: |
| **10** (today) | 14.29% | 171 | 159 | 60.0 |
| 15 | 20.00% | 114 | 106 | 40.0 |
| 18 | 23.08% | 95 | 88 | 33.3 |
| 20 | 25.00% | 86 | 80 | 30.0 |
| **26** (30% of total) | 30.23% | 66 | 61 | 23.1 |

At `m = 26` a dedicated learner buys the entire cosmetics catalogue in 66 sets rather
than 171, and 61 sets inside one era buys that era out of the tradeoff entirely — against
the 159 the ruling was sized on. Whether that is acceptable is the lead's call; it is not
a free re-denomination.

**What a retune would cost the suite, measured rather than guessed.** Injecting
`EARN.interleaved.material = 26` and running `packages/economy`:

```
Test Files  2 failed | 15 passed (17)
     Tests  4 failed | 226 passed (230)
```

The four are `civicSolvency.test.ts`'s *"puts the whole catalogue 171 practice sets
away"*, *"shows a REALISTIC amount of practice at ~17% of an era"* and *"shows the
retired 24h window cost WAITING and not effort"*, plus `clockless.test.ts`'s *"would have
differed under the retired window, which is why it is asserted"*. They want re-pinning to
the new arithmetic, not loosening.

**Notably `cap.test.ts` and `grant.test.ts` both stay green**, which is the derived
ceiling doing its job: the cap tracks the payout with no second edit and no stale-ceiling
trap. `constants.ts` was restored and re-run at **230 passed (230)**.

---

## 6. Second question: cross-session memory for practice items

### 6.1 The `seen` claim — confirmed, and it is narrower than it sounds

```ts
export function buildRandomizedSetByShape(
  items, nodeId, mix, rng, shortfall,
): FrozenItem[] {
  const set: FrozenItem[] = [];
  const seen = new Set<string>();          // ← fresh on every call
  …
}
```

(`packages/item-bank/src/practiceSelect.ts:131-150`, the `seen` at `:139`.)

**Confirmed: a fresh `seen` on every call, and nothing anywhere persists which items have
been served.** Every domain's builder routes through this one function
(`d1/index.ts:107`, `d2/practice.ts:202`, `d3/practice.ts:214`, `d5/practice.ts:198`,
`d7/practice.ts:192`, `d8/practice.ts:203`), the RNG defaults to `Math.random`
(`d1/index.ts:105`), and `createWebPracticeSession` calls it fresh per session
(`practiceSession.ts:143-145`).

**But `seen` is not the served-item record the claim implies.** It holds *answer variety
keys* (`practiceSelect.ts:61-68`) and exists to stop the same answer arriving twice
inside one five-slot set from two different cells (`practiceSelect.ts:14-21`). Persisting
*it* across sessions would suppress answers, not items. A cross-session fix wants a new
record of served `item_version_id`s, not a longer life for this one.

The endless drill has no memory either: `createInterleavedScheduler`
(`infiniteScheduler.ts:73-124`) keeps only the last item per node
(`:89`, `:119-120`), is constructed per mount (`EraInfinitePractice.tsx:100-103`), and the
only thing `InfiniteDrill` persists to `localStorage` is the best streak
(`InfiniteDrill.tsx:145`, `:189`).

### 6.2 Pool depth — the brief's "four to seven" is right

Measured over every served node, counting frozen instances per `(node, difficulty)` cell
and taking `min(⌊|L1|/1⌋, ⌊|L2|/2⌋, ⌊|L3|/2⌋)` under the 1×L1 / 2×L2 / 2×L3 mix
(`d1/practice.ts:79-83` and its siblings):

| Pool | Nodes | L1 | L2 | L3 | total | **clean sets** |
| --- | --- | --: | --: | --: | --: | --: |
| D1 | NUM.2 | 7 | 8 | 14 | 29 | **4** |
| D1 | NUM.4, NUM.5, NUM.F | 7 | 14 | 8 | 29 | **4** |
| D1 | NUM.3, NUM.S | 13 | 20 | 8 | 41 | **4** |
| D2 | EXP.1, RAD.2 | 7 | 20 | 14 | 41 | **7** |
| D2 | RAD.1, RAD.3, RAD.4 | 7 | 14 | 14 | 35 | **7** |
| D3 | LIN.1, LIN.3, LIN.4, LIN.5, LIN.6 | 7 | 14 | 14 | 35 | **7** |
| D5 | RAT.1 … RAT.6 | 7 | 14 | 14 | 35 | **7** |
| D7 | LF.1 … LF.4 | 7 | 14 | 14 | 35 | **7** |
| D8 | EL.1 … EL.5 | 7 | 14 | 14 | 35 | **7** |

**Six D1 nodes at 4, twenty-five other nodes at 7** — thirty-one served nodes in all, so
the brief's "four to seven clean sets per node" is exactly right. Every D1 node is bound
by a cell holding 8 instances against a two-slot draw: L3 for five of them, L2 for NUM.2.
(`EL.6` is in era nine's node list at `eras.ts:236` but had no practice items when this was
measured, so it does not appear here. **It does now**: five templates landed 2026-07-30, so
D8 reads `EL.1 … EL.6` and the served-node count is thirty-two rather than thirty-one. The
per-node economy figures above are unaffected, because `EL.6`'s mix is the same 1xL1 / 2xL2 /
2xL3 shape every other D8 node uses.)

### 6.3 What a learner realises — the "1.4" does not reproduce

Simulated by calling the real builders with `Math.random`, 400 trials per figure, one
`buildRandomized*PracticeSet` call per session, counting distinct `item_version_id`s.

**At K = the node's own clean-set depth:**

| Pool | clean sets | distinct items realised | with perfect memory | **uplift** | sets' worth realised |
| --- | --: | --: | --: | --: | --: |
| D1 (six nodes) | 4 | 15.05 – 15.91 | 20 | 1.26× – 1.33× | **3.01 – 3.18** |
| D2/D3/D5/D7/D8 (25 nodes) | 7 | 22.73 – 24.22 | 35 | 1.45× – 1.54× | **4.55 – 4.84** |

**Across all thirty-one served nodes, at a fixed number of sessions:**

| sessions K | distinct now | distinct with memory | uplift | sets' worth realised now |
| --: | --: | --: | --: | --: |
| 2 | 9.27 | 10.00 | 1.08× | 1.85 |
| 3 | 12.89 | 15.00 | 1.16× | 2.58 |
| 4 | 15.98 | 20.00 | 1.25× | 3.20 |
| 5 | 18.64 | 25.00 | 1.34× | 3.73 |
| 6 | 20.91 | 29.87 | 1.43× | 4.18 |
| 8 | 24.49 | 34.87 | 1.42× | 4.90 |

**The claim does not hold.** A learner who repeats a node as many times as its pool has
clean sets realises **3.0 to 4.8 sets' worth of distinct items**, not 1.4. Even at two
sessions — the smallest number for which the question means anything — it is 1.85, and
the uplift available from cross-session memory there is 8%.

I could not locate the prior measurement anywhere in the tree (grepped `docs/` and
`work-log/` for "clean sets", "distinct sets", "cross-session"), so I cannot say what it
was measuring. The one quantity I measure that lands on 1.4 is the **uplift factor** at
six to eight sessions (1.43×, 1.42×) — which would make "1.4" a correct number attached
to the wrong noun.

The per-session repeat rate is the intuitive form of the same fact: a second session on
the same node re-serves **0.62 to 0.96 of its five items** on average (D1: 0.75–0.96,
everything else: 0.62–0.78). Noticeable, and a long way from "you get the same set again".

### 6.4 Verdict on "roughly quadruple at zero authoring cost"

**Refuted on the quadrupling, and the ceiling is arithmetic rather than an artefact of
the draw.** Cross-session memory cannot serve more distinct items than the pool holds, so
its maximum possible uplift is `poolSize / distinctRealised`. Measured, that is:

- **1.26× – 1.33×** for the six D1 nodes at four sessions,
- **1.45× – 1.54×** for the other twenty-five at seven sessions,
- **1.42× – 1.43×** averaged across all thirty-one at six to eight sessions.

A 4× uplift would require the pools to be roughly four times larger than a learner
currently reaches, and they are not: the gap is 26–54%. **Quadrupling distinct practice
needs authoring, not memory.** The most memory can do is recover the 26–54% the random
draw currently wastes — real, worth having, and not the headline claimed.

### 6.5 Scoping the fix (not implemented)

**Where the record would live.** Two candidates, and the second is the right one:

1. **The economy's `EconomyDevSnapshot`** (`economySession.ts:93-100`) — rejected. Its
   `entries` field is an append-only ledger under a hard row invariant
   (`economyPersistence.ts:209-237`), served items are not economic events, and it would
   put a learning-content record inside the package whose one-way invariant
   (`one-way-invariant.test.ts`) exists to keep learning out of the economy.
2. **A sibling dev store**, next to `economyPersistence.ts` and `devSession.ts` under
   `apps/web/src/devPersistence/`, keyed `cr.devPractice.v1.<user>` on the pattern
   `economyPersistence.ts:133` and `:322-328` establish. The payload is
   `Record<nodeId, string[]>` of served `item_version_id`s. Sizing, with a real id
   measured at 25–27 characters (`d1.num-s.l2b:practice:5002`): 31 nodes × up to 41 ids
   × ~30 JSON bytes ≈ **38 KB worst case**, against the ~5 MB budget
   `economyPersistence.ts:50-54` already reasons about.

**Does the schema need a version bump?** Not `ECONOMY_DEV_SCHEMA_VERSION`
(currently 3, `economyPersistence.ts:131`) and not `DEV_SESSION_SCHEMA_VERSION`
(currently 3, `devSession.ts:47`) — a new store carries its own version at v1, which is
the argument `economyPersistence.ts:35-42` makes for keeping the two existing stores
apart: "adding the economy costs the city NOTHING". Putting the record inside either
existing blob *would* force a bump and discard every saved wallet or city for a dev-only
feature. That is the decisive reason for a third store.

**Shape of the change.** Roughly:

- new `apps/web/src/devPersistence/practicePersistence.ts` — store, all-or-nothing
  parser, `?reset` hatch, mirroring `economyPersistence.ts:268-415` (~200 lines with the
  doc comment this tree writes);
- a `servedIds?: ReadonlySet<string>` parameter threaded through
  `buildRandomizedSetByShape` (`practiceSelect.ts:131`) and `drawSpreadByShape`
  (`practiceSelect.ts:81`), preferring unserved instances the way `seen` already prefers
  unrepeated answers — **as a preference, never a constraint**, so an exhausted node still
  fills its five slots (`practiceSelect.ts:76-79` states that rule; the fix must keep it);
- six one-line pass-throughs at the domain builders (`d1/index.ts:107`,
  `d2/practice.ts:202`, `d3/practice.ts:214`, `d5/practice.ts:198`, `d7/practice.ts:192`,
  `d8/practice.ts:203`);
- a read/write at `createWebPracticeSession` (`practiceSession.ts:143-145`) and the seven
  `PracticeSource` factories that wrap it (`practiceSession.ts:188-307`).

`@cr/item-bank` stays I/O-free: it receives a set, it does not load one.

**The risk worth naming.** Preferring unserved items makes the draw *less* random, so a
learner who exhausts a cell gets a deterministic order on the way back round. The existing
`seen` handles that by falling back to the head of the queue
(`practiceSelect.ts:109-110`); the served-id preference must layer *under* the existing
shape-spreading rather than replacing it, or it will undo the cross-shape variety that
`practiceSelect.ts:6-21` was written for.

---

## 7. Defects found, consolidated

Reported, not fixed, per the brief.

| # | Defect | Evidence | Severity |
| --- | --- | --- | --- |
| **D-1** | Town Hall interleaved practice **pays nothing**: the session id contains a colon that `assertPart` rejects, so `interleavedGrant` throws before any row is written | §2.4 — reproduced through the real adapter: 0 rows, throw message quoted; `CitySurface.tsx:1964` vs `events.ts:22-28` | The only repeatable income in the game, dead since 2026-07-26 |
| **D-1b** | The guards around it are each green and jointly cover nothing: producer tested against a mock, consumer tested only with colon-free literals | `CitySurface.interleaved.test.tsx:138`, `:168`; `useEconomy.test.tsx:51`, `:74`, `:95`; `economyPersistence.test.ts:278`, `:318`, `:337` | Structural — the same shape will hide the next such defect |
| **D-2** | The civic catalogue has **no purchase path**: `applyCivicPurchase` / `applyMaterialSpend` have no production call site | §3.4 — tree-wide grep | The entire outgoings side is unspendable |
| **D-3** | `ROAD_TILE_GOLD_COST = 5` sits outside the tuning table and is never era-scaled, unlike every other price | `roads.ts:34`, `:27-33` vs `constants.ts:30-39` | Latent; harmless while era one is the only era |
| **D-4** | Four prose claims reverse the sign of the nine-node rounding; the published headroom band (20.5%, 123) is 2.5pp too generous, and one comment contradicts the assertion below it | §4.4 — `materials.ts:273-275`, `civicSolvency.test.ts:325-328`, `:474-477`, `constants.ts:124-126` | Documentation only, but the lead is about to tune against it |
| **D-5** | Nine of ten eras pay no material at all, and the solvency sweep computes income that bypasses that gate | §1.4 — `materials.ts:181-184`, `earn.ts:55-64`, `civicSolvency.test.ts:101-103` | Expected while content is unauthored; worth stating beside every income figure |

---

## 8. Gates

**Snapshots.** All ten files in `packages/item-bank/src/__snapshots__/` enumerated and
compared byte-for-byte against `git show origin/integration:<path>`; the reverse direction
checked with `git ls-tree` so neither side holds a file the other lacks. **Ten identical,
zero differing, zero missing.** `vitest -u` was not run at any point.

```
IDENTICAL  packages/item-bank/src/__snapshots__/d1.test.ts.snap
IDENTICAL  packages/item-bank/src/__snapshots__/d2.test.ts.snap
IDENTICAL  packages/item-bank/src/__snapshots__/d3.test.ts.snap
IDENTICAL  packages/item-bank/src/__snapshots__/d5.test.ts.snap
IDENTICAL  packages/item-bank/src/__snapshots__/d7.test.ts.snap
IDENTICAL  packages/item-bank/src/__snapshots__/d8.test.ts.snap
IDENTICAL  packages/item-bank/src/__snapshots__/interactive.test.ts.snap
IDENTICAL  packages/item-bank/src/__snapshots__/product.test.ts.snap
IDENTICAL  packages/item-bank/src/__snapshots__/template.test.ts.snap
IDENTICAL  packages/item-bank/src/__snapshots__/walk.test.ts.snap
```

**`npm run test:unit`** — `Test Files 205 passed | 2 skipped (207)`,
`Tests 4628 passed | 2 skipped (4630)`, 38.62s.

**`packages/economy` alone** — `Test Files 17 passed (17)`, `Tests 230 passed (230)`.

**`civicSolvency.test.ts` alone** — `Tests 17 passed (17)`.

**Two injections, both reverted from a pre-edit copy and both re-verified green.**
`ERA_MATERIAL_TOTAL = 500` (§4.3) takes `civicSolvency.test.ts` to
`9 failed | 8 passed (17)`, restoring to 17/17. `EARN.interleaved.material = 26` (§5.3)
takes `packages/economy` to `2 failed | 15 passed (17)` files and
`4 failed | 226 passed (230)` tests, restoring to 230/230. `git status` was checked clean
after each.

**`npm run typecheck`** (`tsc --build`) — exit 0, no output.

**Biome is VACUOUS on this deliverable, not a pass.** Biome 2.5.4 does not process
Markdown at all. Run against a spec file in this same directory it reports:

```
× No files were processed in the specified paths.
i These paths were provided but ignored:
- docs/superpowers/specs/2026-07-29-era-resource-model-design.md
```

and exits 0. A green `npm run lint` says nothing whatever about this document.

**Not run:** `npm run test:browser` (needs `playwright install chromium`, which this run
did not perform), `npm run check:graph`, `npm run check:lessons`. None of them bear on the
figures above, and none were needed to reach any of them.

---

## 9. How to re-derive

Nothing above was taken on trust from a comment. Every table is one of:

- a direct read of a literal (catalogue rows, cosmetic prices, constants) at the cited
  line;
- a call into the shipped function (`lessonMaterialAmount`, `eraMaterialTotal`,
  `capMaxFor`, `greedyPlanCost`, `lessonCompleteGrant`, `interleavedGrant`, `applyGrant`,
  the six `buildRandomized*PracticeSet` builders, `createInMemoryEconomyClient`) over
  `ERA_SEQUENCE`; or
- an exhaustive search written independently of `civicSolvency.test.ts`'s own
  (§3.3), which agrees with it on all ten eras; or
- a reproduction run against the shipped adapter (§2.4) or an injected defect run against
  the shipped suite (§4.3, §5.3), with the actual output pasted rather than described.

The harness that produced them was a throwaway vitest project outside the collected
globs; it is deliberately **not** committed, since a measurement that has to be
maintained is a guard, and a guard wants the scoping argument §2.4 shows this tree does
not always get right. Re-deriving any single figure needs no harness: the citation names
the function and the line.
