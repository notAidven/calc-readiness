# Currency transfer at an era advance — already ruled, and the three things the ruling does not say

**Measured 2026-07-31 at `04b1dfba`** (`integration`). `integration` moved twice while this
was being written, so **all 45 file:line citations below were re-checked line by line at each
new tip** — `d1cb58e7`, then `99dbaf60` — rather than trusted from the first reading. The
first re-check moved one citation by a line (`types.ts`'s idempotency key) and the second
moved none. What landed in between was two new documentation files and a body of work on the
winter crisis surface, none of it touching anything measured here.

This is an **investigation and a design record**. No gameplay code was changed, and none
should be changed on the strength of this document alone: §6 lists the findings it
deliberately does not fix, with an owner each.

**The question, from the team lead:** *"whats our behavior on currency transfer? should it
transfer completely, at a pro-rated rate, or not at all"*

**The answer: pro-rated, and it was ruled on 2026-07-29.** It is **O-6's second half**, not
O-5. What is genuinely open is not *whether* a balance carries — it is the three things §4
lists, one of which is a **4x disagreement between the ruling's stated intent and the
arithmetic that implements it**.

---

## 0. In one screen

1. **It is already ruled.** `MATERIAL_CARRY_FORWARD = 0.5`
   (`packages/economy/src/constants.ts:475`), applied by `materialCarryForward`
   (`materials.ts:368`), recorded in **all ten** `civic-buildings.md` files, in
   `2026-07-29-era-resource-model-design.md` §4.3, and in the code. The lead's three options
   were decided as the middle one. **Do not re-rule it.**
2. **O-5 is not about currency.** O-5 is the **legacy-decay curve on a frozen civic
   building's contribution** — `0.9 ^ (eras behind)` floored at `0.5`
   (`constants.ts:531`, `constants.ts:541`). It governs how much happiness and livability an
   old building still supplies. It has nothing to say about a material balance. The lead's
   suspicion was right, and §3.4 says why the two are so easy to confuse.
3. **Nothing converts anything today, and nothing calls for a conversion.** The era advance
   is wired (`CitySurface.tsx:2367` -> `useCityEra.ts:77`), and it touches the economy at
   **zero** points. `materialCarryForward` has **no call site outside
   `packages/economy`'s own tests** — measured by search across `apps/`, which returns
   nothing.
4. **"The old material is stranded" is the wrong description of today's behaviour, and the
   truth is the exact inverse.** Four economy call sites read the era-one constant rather
   than stored era state, so **the wallet never notices the era changed**. Driven through
   the real adapter (§1.4): a player holding 120 stone who advances to era two still sees
   `spendable: 120`, still sees the word *stone*, still pays era-one prices, and **can still
   complete a purchase**. What is stranded is the **new** era's earnings — an era-two lesson
   credits `grain: 240` into a balance no sink can reach.
5. **The lead's premise that there is "almost nothing to transfer" does not survive
   measurement.** Era headroom is **10-20% of an era's grant on the lesson channel alone**
   (59.98 to 120 at era-one scale against `greedyPlanCost`'s bound, 80 for era one against its
   exact optimum), and about **35% of era income** once the drill channel is counted — which
   the brief's figures leave out. The cosmetics catalogue is also deliberately priced to
   **create** savers. So the policy is load-bearing rather than decorative, which argues for
   getting the number right rather than for simplifying it away. §4.1.
6. **The shipped rate retains one eighth of purchasing power, where the record says one
   half.** Measured through the real `eraScaledPrice` at all nine boundaries: **12.50%**,
   uniformly. This is a **documentation-and-constant defect, reported here and not fixed
   here** (§4.2).
7. **A conversion is mechanically clean on the append-only ledger, with one edge case**, and
   it needs **no `ECONOMY_DEV_SCHEMA_VERSION` bump**. §5.

---

## 1. What happens today, measured before any design reasoning

### 1.1 The ten materials and the era mapping

Verified rather than trusted, by executing `ERA_MATERIALS` over `ERA_SEQUENCE`
(`packages/economy/src/materials.ts:159`, `types.ts:85`):

| # | Era | Material | Unit noun | Words | Named by |
| --: | --- | --- | --- | --- | --- |
| 1 | `prehistoric` | `stone` | pieces | authored | team lead (was `flint`) |
| 2 | `neolithic` | `grain` | units | defaulted | Evan |
| 3 | `bronze_age` | `bronze` | units | defaulted | team lead (was `ingots`) |
| 4 | `classical` | `silver` | units | defaulted | team lead (was `silver_coin`) |
| 5 | `medieval` | **`gold`** | units | defaulted | team lead (was `coins`) |
| 6 | `renaissance` | `gems` | units | defaulted | team lead (was `florins`) |
| 7 | `industrial` | `coal` | units | defaulted | Evan |
| 8 | `atomic_age` | `electricity` | units | defaulted | team lead (was `kilowatt_hours`) |
| 9 | `information_age` | `silicon` | units | defaulted | team lead (was `compute_cycles`) |
| 10 | `cyberpunk` | `data` | units | defaulted | Evan |

**One correction to the list the brief carried.** Era five is **`gold`**, not `coins`.
`coins` is a **retired word** and is no longer a member of `MaterialId` — the gold-drop freed
the word and era five took it, and `materials.ts:190` keeps `coins` only as
`renamed_from`. A search for `coins` in the material union at this SHA returns nothing.
Anyone reasoning about ten materials by name should use the table above.

**All ten eras mint**, as of the 2026-07-30 flag split: every era credits its own material on
a lesson completion, which is a change from the state where nine credited nothing. Confirmed
by resolving each era's first node through `materialForNode` — era two's `EXP.1` resolves to
`grain`, era ten's `TRG.1` to `data`, and so on for all ten.

### 1.2 Is there any conversion at all? No — and the era advance emits no economy event

**The era advance is wired.** This corrects the brief's stated expectation, which was that
nothing in the app advances an era yet:

- `CitySurface.tsx:2367` — `completeCeremony` calls `advanceCityEra(eraId)` when the rebuild
  ceremony finishes.
- `useCityEra.ts:77` — `advanceCityEra` resolves the next era, calls `setCityEra`, persists
  through `saveEraId` and publishes to every subscriber.
- `eraState.ts:56` — the persisted key is `cr.city.era.v1`, holding a bare era id.

**And it touches the economy at zero points.** `EraAdvanceCeremony.tsx` contains no
occurrence of `ledger`, `economy` or `Economy` in any casing. `advanceCityEra` writes one
storage key and notifies React; it appends no ledger row, emits no event and calls nothing in
`@cr/economy`.

**`materialCarryForward` is authored and unwired.** Searching `apps/` for the symbol returns
**no files**. Its only references anywhere are its own definition, its own unit tests, and
two docblock mentions in `civicBuilding.ts`. `2026-07-29-economy-measured-at-tip.md` §2.1 row
5 recorded the same thing at `189690f` — *"not wired — no call site outside
`packages/economy` tests"* — and it is still true at `04b1dfba`.

**What the ledger does with a balance in the meantime.** The ledger is append-only, keyed on
the composite `(student_id, event_id, resource_type)` (`types.ts:187`), and
`computeMaterialBalances` (`ledger.ts:55`) projects it **per material, sparsely** — a
material the ledger has never touched is absent rather than zero, and one it has touched
keeps its balance **forever**. Nothing ages, expires or sweeps a balance. So an era-one stone
row survives every advance untouched, and would still be there in era ten.

### 1.3 The four economy call sites pinned to the era-one constant

Confirmed and enumerated at `04b1dfba`. All four read `CURRENT_ERA_ID`
(`eraDressing.ts:341`, derived from `ERA_SEQUENCE[0]`) rather than the live era store:

| # | Surface | Site | What it decides |
| --: | --- | --- | --- |
| 1 | **The wallet** | `apps/web/src/economy/economySession.ts:72` | `currentEra()` — which material `spendable` and `spendableMaterial` report |
| 2 | **The material's name** | `apps/web/src/economy/materialWord.ts:27` | `MATERIAL_WORD`, `MATERIAL_WORD_CAPITALISED`, `MATERIAL_UNIT` — every sentence built from them |
| 3 | **The shop's displayed price** | `apps/web/src/economy/Shop.tsx:441` | `eraScaledPrice(eraOnePrice, CURRENT_ERA_ID)` — the price a learner is shown and charged |
| 4 | **The road decorator** | `apps/web/src/city/roadsEconomy.ts:92` | `eraScaledPrice(check.cost, CURRENT_ERA_ID)` — the cost of laying road |

Site 2 is a **module constant**, evaluated once at import. That is worth separating from the
other three: a hook or a store read can be swapped in at sites 1, 3 and 4, but a module
constant cannot follow a store at all, so site 2's fix is structural.

**This is why the framing matters.** Because all four are pinned together, an advance changes
nothing economic — the wallet does not notice, so there is no moment at which an old balance
*becomes* old. A conversion has nothing to fire on and nothing to convert into.

### 1.4 What a player would actually see — the 120-stone walkthrough

Driven through the real `createInMemoryEconomyClient` on a ledger seeded with one 120-stone
grant row, with `setCityEra("neolithic")` called between the two reads.

**Before the advance, city in era one:**

```
spendable: 120   spendableMaterial: { id: "stone", display_name: "Stone", unit_noun: "pieces" }
materials: { stone: 120 }
```

**After the advance, city in era two, same ledger — byte for byte identical:**

```
spendable: 120   spendableMaterial: { id: "stone", display_name: "Stone", unit_noun: "pieces" }
materials: { stone: 120 }
```

**Can they still spend it?** Yes. Purchasing the cheapest catalogue item
(`decor.ground.wildflower`, authored at 12) while standing in era two:

```
status: "purchased"   spendable: 108
spend row: { resource_type: "stone", amount: 12, reason_code: "purchase:decor.ground.wildflower" }
```

Note the **amount: 12**, not 24. The shop charged the era-one price because site 3 is pinned,
so the stone did not merely survive the advance — it kept its era-one purchasing power intact.

**And what happens to money earned in the new era?** Completing era two's `EXP.1`:

```
grantedMaterials: { grain: 240 }
materials: { stone: 108, grain: 240 }
spendable: 108        spendableMaterial: stone
```

**So the answer to the brief's question is the inverse of its premise.** The stranded balance
is not the outgoing material — it is the **incoming** one. 240 grain is credited correctly,
lands on the ledger correctly, and is invisible to `spendable`, to the shop, to the roads and
to every sentence the HUD prints. The outgoing stone is the only currency that works.

**In one sentence, for the lead:** *today, a player who advances an era sees their wallet,
their prices and their currency's name not change at all; nothing is taken from them, and
nothing they earn afterwards can be spent.*

### 1.5 PR #309 — what it covers and what it does not

[#309 "Two surfaces pinned to era one: the hub's drill and the wallet"](PR #309).
**Read from the PR's own metadata rather than inferred from pushes, at `04b1dfba` and again
at `d1cb58e7`: `state: OPEN`, `mergedAt: null` both times.** It is **not merged**, and the
`integration` merges that landed while this was being written were other lanes' work, not
its. So §1.3 and §1.4 describe `integration` with #309's changes **not applied**,
which is the state a learner is in today; nothing above should be read as describing the tree
after #309 lands. Its contents are not the tree's contents.

**It covers site 1 only, of the four.** It repoints `economySession.ts`'s `currentEra()` at a
new `cityEraId()` read on the era store, and adds the era as a dependency of the wallet
effect so the HUD re-reads when the chapter turns. It also fixes an unrelated defect — the
Town Hall's interleaved drill was disabled in nine of the ten eras.

**It explicitly does not cover sites 2, 3 or 4**, and names each of them: `materialWord.ts`
("the third pin, same shape", measured at 41 references across 4 files),
`Shop.tsx:441`, `roadsEconomy.ts:92`, and `winter/liveCityLayout.ts:88`.

**It explicitly does not implement the conversion, and states the ruling correctly.** Its own
words: *"The ratified rule runs the other way: O-6's `materialCarryForward` is a haircut of
half the purchasing power. That conversion is authored and still unwired, and stays so here
on purpose — it needs a ledger event ... an idempotency key per era, and a caller at the
advance."* Its guard asserts **retention**, not conversion: a balance held across an advance
is retained on the ledger, and the alternative of summing all materials into one wallet is
rejected in the same test. That is the right guard to have while the conversion is unwired,
and it is not a conversion policy.

**One consequence worth flagging to whoever reviews #309.** After it lands, site 1 follows
the live era while sites 2, 3 and 4 still do not. A player in era two would then see
`spendable: 0` (their era-two grain, correctly, since they have none) while the shop still
charges era-one prices in a chip labelled "stone". That is a **strictly better** state than
today's — an era-two learner can finally see and spend era-two earnings — but it is a
**mixed** state, and it is the first point in the tree's history at which an old balance
genuinely does become unreachable. **That is the moment this ruling stops being theoretical.**

---

## 2. Where the ruling is already recorded

Nine of the ten `civic-buildings.md` files carry an O-6 conversion-rate row; era ten carries
an explicit "there is nothing to rule" row. All were decided the same day, by the same owner,
in `#227`.

| File | What it says |
| --- | --- |
| `eras/era-01-prehistoric/civic-buildings.md:489` | The full row: `materialCarryForward(amount)` = `floor(amount x MATERIAL_CARRY_FORWARD / ERA_COST_MULTIPLIER_STEP)`, `MATERIAL_CARRY_FORWARD = 0.5` |
| `eras/era-01-prehistoric/civic-buildings.md:96` | §1's prose: *"The forward-conversion rate at the era change is decided: half the purchasing power survives"* |
| `eras/era-02-neolithic/civic-buildings.md:247` | The stone -> grain rate, with the plainest gloss in the ten |
| `eras/era-03-bronze-age/civic-buildings.md:217` | Same rate |
| `eras/era-04-classical/civic-buildings.md:260` | Same rate |
| `eras/era-05-medieval/civic-buildings.md:296` | Same rate |
| `eras/era-06-early-modern/civic-buildings.md:276` | Same rate |
| `eras/era-07-industrial/civic-buildings.md:248` | Same rate |
| `eras/era-08-atomic/civic-buildings.md:211` | Same rate |
| `eras/era-09-information/civic-buildings.md:310` | Same rate |
| `eras/era-10-cyberpunk/civic-buildings.md:347` | **No forward conversion — there is no era eleven.** A player finishing era ten keeps a balance with nowhere to go |
| `2026-07-29-era-resource-model-design.md:395` | §4.3, the decision and its reasoning |
| `packages/economy/src/constants.ts:475` | The constant |
| `packages/economy/src/materials.ts:368` | The function |

**The era progression spec does not carry the rate.** `2026-07-27-era-progression-design.md`
§17 lists O-6 as open (`:2379`), and §7 (`:1641`) says the rate is *"open ... Gabriel for the
rate"*. Both statements were true when written and are **stale at this SHA**. They are
another owner's file and are not edited here; §6 lists them as owed.

---

## 3. What O-5 actually governs, and why the confusion happened

### 3.1 O-5 is a rule about buildings

**O-5 is the legacy-decay curve.** `civic-buildings.md:491` and `:583`, and
`constants.ts:516-541`:

> A frozen civic building's **contribution** is multiplied by `0.9 ^ (eras behind the current
> era)`, never falling below `LEGACY_DECAY_FLOOR = 0.5`.

The thing being decayed is `CapacityContribution` — the `livability` and `happiness` an old
building still supplies to the city, applied by `civicContribution`
(`civicBuilding.ts:114`). **It does not touch a balance, a wallet, a material or a price.**
Its floor exists so that a player's own early quarter never becomes a net drag on a city they
cannot clear for free.

**So it is not the answer to the lead's question, and it should be left exactly where it
is.** The record held in the brief — *"O-5: decay at `0.9 ^ (eras behind)`, floored at
0.5"* — is an accurate quotation of a rule about **civic buildings**.

### 3.2 O-6's second half is the rule about currency

`civic-buildings.md:489`. The rate is `MATERIAL_CARRY_FORWARD = 0.5`, expressed as *the
fraction of purchasing power that survives an advance* rather than as a raw exchange rate.
The two rejected ends are argued in `2026-07-29-era-resource-model-design.md` §4.3 and are
exactly the lead's outer two options:

- **1.0, complete transfer** — rejected because it kills era-exclusivity's *"build it now or
  not at all"* pull. If a stockpile crosses intact, hoarding through an era is never worse
  than building in it.
- **0.0, no transfer** — rejected because it punishes the player who saved and reads as the
  game taking something.

That is the same argument the lead's own recommendation makes, reached independently and two
days earlier.

### 3.3 The two rules side by side

| | **O-5** | **O-6, second half** |
| --- | --- | --- |
| Subject | A frozen civic **building** | A **material balance** |
| Quantity | `livability` / `happiness` contribution | A count of stone, grain, ... |
| Curve | `0.9 ^ (eras behind)`, **floored at 0.5** | `0.5` of purchasing power, **per advance, unfloored** |
| Keyed on | Distance from the current era, recomputed every read | The single advance, applied once and recorded |
| Reversible | Yes — it is a derivation, so a retune applies retroactively | **No** — it writes ledger rows, so an executed conversion is a historical fact |
| Constant | `LEGACY_DECAY_PER_ERA`, `LEGACY_DECAY_FLOOR` | `MATERIAL_CARRY_FORWARD` |
| Owner | Gabe | Gabe |

The last row of that table is the one that makes the two genuinely different in kind, and it
is easy to miss: **O-5 is a lens and O-6 is a transaction.** Changing O-5's number changes
every city ever built, immediately. Changing O-6's number changes nothing that has already
happened.

### 3.4 Four reasons this was hard to find, and it has happened on this repo before

This is the failure the brief predicted, and it is worth naming precisely rather than
generally, because three of the four causes are fixable by editing prose.

1. **O-6's title hides its second half.** In every register that lists it — `eras/README.md`
   and `2026-07-27-era-progression-design.md` §17 — O-6 is titled *"the era's resource
   identity"*, or *"each era's resource identity"*. A reader scanning for a currency-transfer
   ruling reads that title and moves on. The conversion rate is a **second half bolted onto
   an identity question**, split across two owners, and is invisible from the name.
2. **O-5 sits directly beside it and is also a decay rule with a floor.** Anyone
   remembering *"there was a decay ruling with a floor this week"* lands on O-5. The
   resemblance is close enough to be actively misleading: both were ruled the same day by the
   same owner, both are fractions, both have a `0.5` in them — **`LEGACY_DECAY_FLOOR` is
   `0.5` and `MATERIAL_CARRY_FORWARD` is `0.5`, and they mean entirely different things.**
3. **There are two different O-6s in `docs/superpowers/specs/`.** The era progression's O-6
   (identity + conversion rate) is **closed**.
   `2026-07-29-mid-era-crisis-design.md:2903` has its own **O-6** — *"Does unspent influence
   survive the Succession Crisis?"* — which is **open**. Searching the specs for "O-6" returns
   both, and the open one is about **whether a currency survives a boundary**, which is close
   enough to the question being asked to look like the answer. Anyone who lands on it
   concludes the question is open when it is not.
4. **The two records point at each other only in one direction.** Era one's file is the
   record for all ten, and its O-5 and O-6 rows are adjacent in one table with nothing
   distinguishing their subjects. §7's spelled-out section is titled *"O-5, spelled out"* and
   never says what O-5 is **not**.

**Causes 1, 2 and 4 are addressed by this change** (§7). Cause 3 is another lane's document
and is left alone; it is listed in §6 as owed.

---

## 4. The ruling stands. Here are the three things it does not say

The lead's recommendation — pro-rated decay, visible at the chapter break, floored rather
than compounding to nothing — is **already the ruling on its first clause** and is **not yet
the ruling on the other two**. The brief asked for its reasoning to be tested rather than
restated. Taken one at a time rather than as a class:

| The brief's claim | Verdict |
| --- | --- |
| *"In a well-tuned era there is almost nothing to transfer ... a player who engages ends near zero."* | **CONTRADICTED** by measurement. §4.1 |
| *"The policy therefore mostly governs whether deliberate hoarding is viable, not how much wealth carries."* | **HOLDS**, and more strongly than the brief argued it — the catalogue is priced to produce hoarders. §4.1 |
| *"Complete transfer makes under-building optimal, which hollows out the early city."* | **HOLDS.** It is the ruling's own reason for rejecting 1.0, in almost the same words: *"if a stockpile crosses the boundary intact, hoarding through an era is never worse than building in it, and the pull dies."* §3.2 |
| *"Zero transfer deletes something the player earned ... reads as a bug rather than a rule."* | **HOLDS.** It is the ruling's own reason for rejecting 0.0, and the same argument O-5's floor is built on. §3.2 |
| *"Decay keeps saving from being a trap while making spending-in-era correct."* | **HOLDS as design, CONTRADICTED by the shipped arithmetic** — at `floor(x/4)` a saved balance is annihilated by era six, which makes saving exactly the trap this clause rules out. §4.2 |

### 4.1 CONTRADICTED: "in a well-tuned era there is almost nothing to transfer"

The brief's own figures — 600 earnable against 540 needed — **are correct at this SHA**, and
re-verified: `civicSolvency.test.ts` passes 23/23, and its *"re-derives era one at 600
projected against 540 needed"* case holds. But that pair understates the leftover on three
counts.

**First, 540 is an upper bound, not the cost.** `greedyPlanCost` prices the two capacity axes
separately and cannot see a row that covers both, so it overstates. The **exact optimum** for
era one is **520**, and the surplus is **80**, not 60. The shipped table:

| Era | Mintable | Optimum | Surplus | Surplus at era-one scale |
| --- | --: | --: | --: | --: |
| prehistoric | 600 | 520 | 80 | 80 |
| neolithic | 1,200 | 1,080 | 120 | 60 |
| bronze_age | 2,400 | 2,160 | 240 | 60 |
| classical | 4,800 | 4,320 | 480 | 60 |
| medieval | 9,600 | 8,640 | 960 | 60 |
| renaissance | 19,200 | 17,280 | 1,920 | 60 |
| industrial | 38,400 | 30,720 | 7,680 | 120 |
| atomic_age | 76,797 | 69,120 | 7,677 | 59.98 |
| information_age | 153,600 | 138,240 | 15,360 | 60 |
| cyberpunk | 307,197 | 245,760 | 61,437 | 119.99 |

**Second, and much larger: the lesson channel is not the only income.** The drill pays
`EARN.interleaved.material = 20` at era-one scale for up to
`DRILL_PAID_SETS_PER_ERA = 10` sets an era, so era income is **800 at era-one scale**, not
600. Against an optimum of 520 that is **280 of headroom, about 35% of era income** — which
is not "almost nothing" by any reading.

**Third, and this is the part that decides the question: the catalogue is priced to create
savers.** The cosmetics catalogue is 20 purchasable items totalling **1,702** at era-one
scale, and `ERA_MATERIAL_TOTAL`'s own docblock states the intent in as many words: the two
aspirational items at **210** and **240** are *"unbuyable in ANY single era without giving up
part of that era's city."* A player who wants the showpiece **has been told by the price to
save across a chapter break**. Deliberate hoarding is not a hypothetical player this policy
governs in theory — it is the player the catalogue was tuned to produce.

**So the conclusion the brief drew from this premise is right for the wrong reason.** It is
true that the policy *"mostly governs whether deliberate hoarding is viable"*. It is not true
that there is almost nothing to transfer. The policy is load-bearing, it will be noticed, and
**that argues against the brief's own fallback of "a simpler rule nobody will ever notice"**
— a rule that bites on 35% of era income will be noticed by anyone who saves.

### 4.2 THE DEFECT: the rate retains one eighth of purchasing power, not one half

**This is the most important finding in the document, and it is a defect in a design record
and an unwired constant — reported here, not fixed here.**

The record, in three places, says half the purchasing power survives. The arithmetic gives an
eighth. Measured through the shipped `eraScaledPrice`, holding one era's whole grant and
pricing a standard 12-unit good on both sides of every boundary:

```
prehistoric  -> neolithic : hold 600     (50.00 goods at 12)   -> carry 150    (6.25 goods at 24)   = 12.50%
neolithic    -> bronze_age: hold 1,200   (50.00 goods at 24)   -> carry 300    (6.25 goods at 48)   = 12.50%
bronze_age   -> classical : hold 2,400   (50.00 goods at 48)   -> carry 600    (6.25 goods at 96)   = 12.50%
classical    -> medieval  : hold 4,800   (50.00 goods at 96)   -> carry 1,200  (6.25 goods at 192)  = 12.50%
medieval     -> renaissance: hold 9,600  (50.00 goods at 192)  -> carry 2,400  (6.25 goods at 384)  = 12.50%
renaissance  -> industrial: hold 19,200  (50.00 goods at 384)  -> carry 4,800  (6.25 goods at 768)  = 12.50%
industrial   -> atomic_age: hold 38,400  (50.00 goods at 768)  -> carry 9,600  (6.25 goods at 1536) = 12.50%
atomic_age   -> information_age: hold 76,800 (50.00 at 1536)   -> carry 19,200 (6.25 at 3072)       = 12.50%
information_age -> cyberpunk: hold 153,600 (50.00 at 3072)     -> carry 38,400 (6.25 at 6144)       = 12.50%
```

**The error is a direction, and it is one sentence long.**
`2026-07-29-era-resource-model-design.md` §4.3 reads:

> Costs scale by `2^(N-1)`, so era N+1 prices are exactly twice era N's, and
> **purchasing-power-neutral carry-forward is division by two**.

`constants.ts:461-463` says the same thing. **Both have the ladder inverted.** If prices
double, then keeping the same number of units already halves your purchasing power. To hold
purchasing power *neutral* you must **multiply** the unit count by two, not divide it. So:

| Rule | Units carried from 120 | Purchasing power retained |
| --- | --: | --: |
| `carry(x) = 2x` | 240 | **100%** — this is neutral |
| `carry(x) = x` | 120 | **50%** — this is "half the purchasing power survives" |
| `carry(x) = x/2` | 60 | 25% |
| **`carry(x) = x/4`** (shipped) | **30** | **12.5%** |

**The unit tests do not catch it, and the reason is instructive.**
`materials.test.ts:335` asserts the conversion is LOSSY against
`const neutral = amount / ERA_COST_MULTIPLIER_STEP` — the same inverted definition of
neutral. `floor(x/4) < x/2` is true, so the assertion passes; it simply passes against a
baseline that is itself 4x too low. The *direction* the test claims (never mints purchasing
power) is genuinely true, and would be true against the correct baseline too. Only the
*magnitude* is wrong, which is exactly the part a design record is for.

**What this does to the lead's "floored rather than compounding to nothing" rider.** At the
shipped rate the compounding is severe. A 600-stone hoard carried the whole run, never spent:

```
era 1  prehistoric  600   (100.0000% of that era's grant)
era 2  neolithic    150   ( 12.5000%)
era 3  bronze_age    37   (  1.5417%)
era 4  classical      9   (  0.1875%)
era 5  medieval       2   (  0.0208%)
era 6  renaissance    0   — annihilated
```

**Zero, by era six, without the player doing anything wrong.** That is precisely the outcome
the rider warns about: *a long gap becomes the zero-transfer rule by another route*. Under the
record's stated intent — `carry(x) = x` — the same hoard would read 600 in every era,
declining only in relative worth, and **the player's number would never go down at all**.

**The reconciliation this points at, offered as a recommendation and not as a ruling, since
the number is Gabe's:** set the conversion to the unit-count identity, `carry(x) = x`. It is
simultaneously (i) exactly what every existing record already says — half the purchasing
power — so no record needs its meaning changed, only its arithmetic corrected; (ii) the
simplest rule available, requiring no formula at the chapter break; and (iii) an answer to
the floor rider that needs no floor, because a count that never decreases cannot compound to
nothing. In the constant's own terms that is `MATERIAL_CARRY_FORWARD = 2` over the existing
`/ ERA_COST_MULTIPLIER_STEP`, or a multiplication in place of the division; **which of those
two spellings is right is a code decision and is not taken here.**

The alternative is equally legitimate and must be chosen deliberately rather than by
default: **keep `floor(x/4)` and correct every record that states the rate to say 12.5%** —
nine era-file O-6 rows, era one's §1 prose, design-record §4.3, and three docblocks in code. What is not
acceptable is the present state, where the number and its stated meaning disagree by 4x and
every downstream reader takes the prose.

### 4.3 UNSPECIFIED: visibility at the chapter break

The lead's first rider — *the conversion must be visible at the chapter break, naming the
actual numbers, or it is a hidden tax they cannot plan around* — **is not ruled anywhere**. A
search of the ten era documents, the progression spec and the resource-model record for any
statement about announcing, displaying or narrating a conversion returns nothing.

**Recommend adopting it, and there is a precedent in this exact economy to follow rather than
invent.** `DRILL_PAID_SETS_PER_ERA`'s docblock argues a hard cap over a taper on exactly this
ground — the lead's objection to a taper was that it is invisible to the player — and pays the
cliff's cost by **announcing it from the first set of the era rather than at the last one**.
The same shape applies: the ceremony already exists (`EraAdvanceCeremony.tsx`, four beats),
it already has a screen at the moment the era turns, and it is the natural place to name both
numbers. Under the §4.2 reconciliation the sentence is short enough to be unmissable: *"Your
600 stone is now 600 grain. Everything in the new era costs twice as much."*

### 4.4 UNSPECIFIED: a floor, and whether the rate compounds

Also not ruled anywhere. `materialCarryForward` floors to **zero** for any stockpile under 4,
which is a *rounding* floor and the opposite of the rider's *retention* floor. There is no
minimum-retained rule, and the compounding in §4.2 is unbounded.

**Two things to note before a floor is designed.** First, a floor expressed as a fraction of
the original balance requires remembering the original balance, which the ledger does not
carry: an `era_advance:` row records what was converted at that advance, not what a player
first earned six eras ago. Second, under the §4.2 reconciliation **no floor is needed at
all**, because the count is preserved and only its relative worth falls. That is a strong
argument for fixing the arithmetic before designing a floor on top of it — a floor added to
`floor(x/4)` would be a second mechanism compensating for the first one being wrong.

---

## 5. Mechanics: is the conversion clean on an append-only ledger, and does it need a bump?

### 5.1 Two legs under one event id — clean, and already anticipated

The brief's presumed shape is **correct and already provisioned for at this SHA**. Measured
by constructing both rows and running them through the shipped guards:

- **Both legs pass `assertLedgerEntryInvariant`.** The debit leg (`stone` / `spend` /
  `reason_code: "era_advance:neolithic"`) passes because `era_advance:` is already the fourth
  member of `SPEND_REASON_PREFIXES` (`constants.ts:83`), so the "a spend must name its
  subject" clause is satisfied. The credit leg (`grain` / `grant`) passes because grants are
  free to carry any reason.
- **The composite key holds.** With both legs under `event_id: "era_advance:neolithic"`, the
  three keys on the ledger are distinct 3-of-3: the two legs differ in `resource_type`, which
  is the third component of `(student_id, event_id, resource_type)`. This is the same
  mechanism a lesson completion already uses to write an XP row and a material row under one
  id.
- **Replay is a wholesale no-op.** `hasEvent(view, "era_advance:neolithic")` returns `true`
  after the append, so a repeated advance appends nothing. Keying the event on the **era id**
  rather than on a counter is what makes it idempotent per era rather than per attempt.
- **`ledgerInvariant.test.ts` already asserts the shape**, at `:129` (the exact-set census
  admitting `era_advance:`) and `:187` (*"leaves GRANTS free to carry any reason, including
  era_advance's credit leg"*).

Balances after converting 120 stone at the shipped rate: `{"stone": 0, "grain": 30}`.

### 5.2 The one edge case, and it is a real decision

**A credit leg of amount zero is rejected**, and it is rejected by the first clause of the row
invariant, not by anything about eras:

```
amount 0 credit leg: REJECTED -> economy ledger: amount must be a positive finite number (0).
```

`materialCarryForward` returns 0 for any stockpile below 4 at the shipped rate. So the
two-leg shape is **not universal**, and a conversion of 1-3 units has to choose:

- **write the debit leg alone** — which deletes the balance and grants nothing, i.e. applies
  the zero-transfer rule to exactly the poorest case; or
- **write nothing at all** — which leaves the small balance on the ledger in the outgoing
  material, permanently unreachable once the wallet follows the live era.

Neither is obviously right and the ruling does not cover it. **Under §4.2's reconciliation the
case disappears entirely**, since `carry(x) = x` is zero only for a zero balance, and a
conversion of nothing correctly writes nothing. That is a third reason to fix the arithmetic
first.

### 5.3 No `ECONOMY_DEV_SCHEMA_VERSION` bump — measured against the stated precedent

**No bump.** The version stays at 3 (`economyPersistence.ts:131`).

The precedent, quoted from that constant's own docblock rather than reasoned from scratch:

- A **retired** id (`flint`) **fails** the derived allow-list for free. The blob is rejected,
  the key is deleted, and a bump buys nothing. **No bump was taken.**
- A **repurposed** id (`gold`) **passes** the allow-list, because the word is a member of
  `ECONOMY_RESOURCES` before the change and after it, so a pre-drop blob restores cleanly and
  lands its rows in the wrong projection. **A bump was taken, 2 to 3.**

**A conversion event is neither.** It adds no material id, retires none, and repurposes none.
It adds ledger **rows** carrying a **reason code**, and `isLedgerEntry`
(`economyPersistence.ts:209`) validates `reason_code` only as a non-empty string; the
allow-list it derives from `ECONOMY_RESOURCES` is over `resource_type`, which is untouched.
This is the same **widening** case that era materials themselves presented, where the docblock
records: *"a blob written before materials existed contains no material rows and parses
identically, and a blob with material rows is the same blob with more rows in it."*

Measured rather than argued, at v3 with no code changed:

```
ECONOMY_DEV_SCHEMA_VERSION = 3   storage key = cr.devEconomy.v3.<user>
rows written: 3   rows read back: 3   era_advance rows survived: 2
old-shaped blob (no era_advance rows) reads back: 1 row — parses identically
```

**One thing a conversion *does* owe, which is not a schema question but is the same class of
risk.** `reconcileProgress` re-derives rows 1 and 3 from learning state on every city load. A
conversion is **not** derivable from learning state — it depends on the balance at the instant
of the advance — so it is durable in exactly the way a spend is, and a lost ledger loses it
irrecoverably. That is defect `#96`'s shape, and the economy already carries the machinery
(the persisted snapshot, the `primeFromLedger` seed) that closes it. It needs no new
mechanism, only the discipline of not inventing one.

---

## 6. Findings reported and deliberately not fixed here

A currency ruling and a bug fix should not share a diff. Each of these is named with enough
detail to be actioned by its owner without re-deriving it.

1. **The carry-forward rate disagrees with its own stated meaning by 4x** (§4.2). Owner:
   Gabe (economy). Touches `constants.ts:475`, `materials.ts:368`, `materials.test.ts:335`,
   `2026-07-29-era-resource-model-design.md` §4.3, and the O-6 row in all nine era files that
   carry one. **Not a shipped-behaviour defect** — the function has no production call site —
   but every downstream reader takes the prose, so it will become one the moment it is wired.
2. **Three of the four era-one pins remain after #309** (§1.3, §1.5): `materialWord.ts:27`,
   `Shop.tsx:441`, `roadsEconomy.ts:92`. #309 names all three itself.
3. **Two O-6s exist in `docs/superpowers/specs/`** (§3.4 cause 3). The era progression's is
   closed; `2026-07-29-mid-era-crisis-design.md:2903`'s is open and is about a different
   currency surviving a different boundary. Owner: whoever owns the crisis design. A
   disambiguating clause in the crisis document would close the search collision from the
   other side.
4. **`2026-07-27-era-progression-design.md` still lists O-6's rate as open**, at `:1641` and
   `:2379`. True when written, stale at this SHA. Not edited here: that document is parsed by
   `test/eraDecisionCount.test.ts`, which pins a `D-ERA` id census against a prose tally, so
   an edit there owes that guard a run.
5. **The design record's §4.3 names a two-argument signature**,
   `materialCarryForward(amount, fromEraNumber)`, where the shipped function takes one
   argument. Harmless drift, but it means the record cannot be pasted into code.
6. **§4.3's "honest limit" is stale.** It says the conversion *"cannot be exercised end to
   end yet, because it needs two `authored` eras and era two's identity is Evan's."* All ten
   eras mint as of the 2026-07-30 flag split, so the gate that sentence describes no longer
   exists.

---

## Related

- `2026-07-29-era-resource-model-design.md` — §4.3 is the decision this document reports on.
- `eras/era-01-prehistoric/civic-buildings.md` — §7 is the record for all ten eras; O-4, O-5
  and O-6 are the rows.
- `2026-07-29-economy-measured-at-tip.md` — measured at `189690f`; its §2.1 row 5 is the
  earlier reading of "not wired", still true here.
- `2026-07-27-era-progression-design.md` — §7 the economy, §17 the open-question register.
- `packages/economy/src/constants.ts` — `MATERIAL_CARRY_FORWARD`, `LEGACY_DECAY_PER_ERA`,
  `LEGACY_DECAY_FLOOR`, `TEARDOWN_COST_FRACTION`, `REASON_ERA_ADVANCE_PREFIX`.
