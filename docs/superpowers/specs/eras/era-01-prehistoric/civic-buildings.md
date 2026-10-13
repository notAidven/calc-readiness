# Era 1 — Prehistoric Era: civic buildings

**Status: PROPOSED.** The companion to `style-guide.md`. That file covers the **skill
buildings** — the six earned 1:1 with lessons, plus the Town Hall. This one covers the
**civic buildings**: the ones the player *buys*, which carry the city's food, livability and
happiness.

Together they are era one's answer to **O-12** (*how many civic types each era's catalogue
holds, and what they are*) and **O-6** (*the era's resource identity*), both of which §17 of
the era design dates as decided **with** the style guides.

---

## 0. The contract: what a civic building is, and what it is not

**D-ERA7** splits the two classes on purpose, and the split is the whole design:

| | **Skill buildings** (`style-guide.md`) | **Civic buildings** (this file) |
| --- | --- | --- |
| How you get it | **Earned** — one per lesson, strictly 1:1, never bought | **Bought** with the era resource, placed freely |
| Count in era one | 6 + the Town Hall | **4 types**, buildable as many times as you can afford |
| Economic role | **Neither produces.** Completing a lesson pays a one-time lump of the era material; the building it earns pays nothing thereafter | **Provide** — they carry the primary food, livability and happiness values, per placement and never per tick |
| Across eras | **Frozen in the era they were built** | **Frozen in the era they were built** (D-ERA11) |
| Art cost | **One look each, ever.** Era one draws all six masses because it introduces all six | **One look each, ever** — era-exclusive, so ~4 per era, ~40 total |

> **TWO ROWS AMENDED 2026-07-29 by team-lead rulings, and both were decided items.** *Economic
> role* read *"**Produce** the resource; mastery doubles the rate"* against *"produce
> **nothing**"* — withdrawn by the **no-generation ruling**
> (`../../2026-07-29-era-resource-model-design.md` §5: *"we dont need the buildings to passively
> produce income"*). *Across eras* read *"**Re-dress automatically** every era"* — withdrawn by
> the **re-dressing ruling** (`../../2026-07-27-era-progression-design.md` §6.1: *"everything
> should stay the same because of the art overhead, with the exception of the town hall, which
> should retheme"*), which also takes the *"re-dressed 10 times"* art-cost figure with it.
>
> **The class split survives both, and is now EARNED against BOUGHT.** That was always the
> load-bearing half. The Town Hall is the single exception to the frozen row.

**Skill buildings are earned; civic buildings are bought.** A skill building carries only a
small livability or happiness contribution, typed by its `citizen_roles`
entry. Everything the population actually *needs* comes from this file.

> **REWRITTEN 2026-07-29.** This read *"Skill buildings produce; civic buildings provide. A
> skill building trickles resource and carries only a small livability or happiness
> contribution."* **A skill building trickles nothing.** The small `citizen_roles` contribution
> is real and unchanged; the trickle is withdrawn.

**Three consequences that shape era one's art specifically:**

1. **Every civic building here is drawn once and never again.** A Prehistoric shelter stays
   a Prehistoric shelter in the neon era — that is the archaeological-layers reading
   (§6.4), and it arrives without extra art. **Since 2026-07-29 this is true of the skill
   buildings in `style-guide.md` as well**, so era one's whole footprint on the island is
   permanently Prehistoric and the reading covers the entire city rather than the bought half
   of it (era design §6.4a).
2. **Nothing here carries forward into era two's menu.** Era-exclusivity means these four
   are buildable **only while the player is in era one**, which is what gives the era a
   real "build it now or not at all" pull.
3. **There is no renovation, ever** (D-ERA11). You cannot bring a Prehistoric shelter up to
   date, because era two has no shelter to bring it to. The only way to reclaim the ground
   is teardown, for a cost and with no refund (D-ERA12) — which *converts* the quarter
   rather than modernising it.

---

## 1. The era's resource: stone

**Era one's material is `stone`** — authored, shipped, and the only one of the ten that is
(`packages/economy/src/materials.ts`).

> **RENAMED 2026-07-29 from `flint`, by the team lead's recognisability ruling**, verbatim:
> *"flint should be stone"*. **The rule: every material must be immediately recognisable to the
> vast majority of users**, and flint fails it as *a specimen of a familiar category* — flint is
> a kind of stone, so the ruling says name the category and not the specimen. Seven of the ten
> ids changed in the same pass; the reasoning and the before/after table for all ten are at
> `../../2026-07-29-era-resource-model-design.md` §4.1a, and the code landed in `#233`.
>
> **This section used to read:** *"Proposed answer to O-6 for era one: flint. §7 of the era
> design names the sequence as running 'from flint through to credits or data', so this is the
> spec's own starting point rather than an invention."* Both halves are now stale: the id is
> `stone`, and §7's sequence line has itself been amended to *"from stone through to data"*
> (`credits` was never an id).
>
> **`stone` still stockpiles as a count of worked pieces.** The clause below reads as though the
> rename should have touched it and it does not: *"a count of worked pieces, not a weight or a
> currency"* is a statement about `unit_noun`, not about the name, and `stone` carries `pieces`
> exactly as `flint` did.
>
> **The flint on the ground is NOT renamed.** `style-guide.md` describes *pale flint chips* on
> the island's worn earth, and those are a physical object in the art rather than a material id.
> **Flint chips being a kind of stone is the ruling's whole point**, not a contradiction of it.

It reads well for the era and it stockpiles believably: stone is knapped, traded, carried
and stored, and a heap of worked stone is a legible measure of a settlement's wealth. In the
HUD it wants to read as a **count of worked pieces**, not a weight or a currency.

The forward-conversion rate at the era change is **decided**: half the purchasing power
survives (§7 below, and O-6's rate half). **It is not yet wired**, and the shipped arithmetic
retains an eighth rather than a half — both measured 2026-07-31 in
`../../2026-07-31-era-material-carry-forward-ruling.md`, which is the record to read before
citing the rate as behaviour.

---

## 2. What civic buildings provide — RULED 2026-07-29

**THE RULING (Gabriel, 2026-07-29, verbatim): *"the updated mapping is livability (Housing and
food) and happiness"*.**

**Two capacities: livability and happiness. Housing and food are INPUTS to livability, not
capacities in their own right.** This is the ruling this section asked for and assigned to
Gabriel by name, and it is the ruling all ten `civic-buildings.md` files named as blocking their
pricing. **All ten are now unblocked**, and none of their figures moves: every catalogue was
already written against this reading.

**What it resolves.** §7's **D-ERA13** and its "two dials" note disagreed:

> **D-ERA13, bullet two:** *"**Housing and food are the two capacities.** Farms and their
> era successors are civic buildings that support N people. Food is a capacity, not a
> stockpile."*
>
> **§7, "Two dials, not three":** *"**Livability** sets how many people the city can
> sustain; **happiness** decides whether they stay. **There is no separate housing
> capacity.**"*

**§7 is the statement that survives; D-ERA13's first sentence is the one that is wrong**, and in
one clause only. Sentence two (*farms support N people*) stands, with the N now read as a
livability contribution. Sentence three (*food is a capacity, not a stockpile*) becomes imprecise
rather than wrong: "not a stockpile" was always the load-bearing half and is untouched. Sentence
four, the no-offline-decline guarantee, is untouched and is why the bullet exists. §7 is also
**incomplete** rather than wrong — it rules out a separate *housing* capacity and says nothing
about food, which is exactly what let the two look survivable side by side, and it should say
there is no separate food capacity either.

**Three edits this ruling owes the era design**, which is Evan's document and not this one:
amend **D-ERA13 in place** (following D-ERA6's own precedent rather than minting a new decision
id), extend **§7** to rule out a separate food capacity, and correct the **§16** restatement,
which repeats the error. There is a knock-on in D-ERA13's own header — *"two capacities, and two
derived readouts"*, the readouts being population and happiness — which no longer closes now that
happiness is a capacity; the spec already has the vocabulary to fix it, since §7 prices amenities
in *happiness coverage*, so **coverage is the capacity and the happiness level is the derived
readout**, leaving population as the other. That is a wording reconciliation, not a second ruling.

> **THE AGGREGATION, RULED 2026-07-29 (the team lead, recorded by Gabriel): LIVABILITY IS A
> SINGLE POOL, and housing and food are not tracked separately.** *"Inputs to livability"*
> admitted two readings and they price differently: **(a) one pool**, so a food building and a
> dwelling are substitutes; or **(b) two terms**, a housing term and a food term with the lower
> binding, so they are complements. This file carried (b) as where the evidence pointed. **(a) is
> the ruling**, and the reasoning overrides that evidence: **there is no middle ground on separate
> tracking.** If housing and food are distinct quantities then every building in every era
> catalogue has to declare which of them it feeds, and that is a great deal of specification
> bought for one extra dial in a game where the city is motivation rather than the subject.
>
> **What (b) was covering up was a pricing problem wearing an aggregation problem's clothes.**
> The measurement behind (b) was real: under one pool the Smokehouse (2×1, 80 stone, +20)
> weakly dominates the Family Lodge (2×2, 80 stone, +20) on footprint, cost and magnitude at once, so
> nobody would ever build a Family Lodge, and the same collapse appeared in 7 of the 10 eras (1, 2,
> 3, 4, 6, 7, 10). But a building that is worse on every axis with no compensating property is not
> a design that needs a cleverer formula; it is a building nobody will place. So the buildings were
> differentiated instead, on the three axes available — **footprint, cost, and a secondary
> contribution to happiness** — and §3 is where era one paid: the Family Lodge now carries the hall's
> own fire. Era ten took two numbers rather than one, because its food tower and its dwelling
> share a footprint and a magnitude; §7 records it.

Under that reading, each civic building is described by three things, per **D-ERA24**:

- **Resource efficiency** — value per unit of stone spent
- **Land efficiency** — value per grid cell occupied
- **Mix** — livability only, happiness only, or a blend

**No building may win on every axis**, or the catalogue collapses into one right answer.
Within era one the four below must trade against each other, not form a ladder.

**That sentence is now a test rather than a sentence.** Stated so it cannot quietly stop being
true: **no building in an era's catalogue may be weakly dominated by another** — for any two rows,
each must beat the other on at least one of four axes, **footprint, cost, livability, happiness**.
`test/eraCivicCatalogueDominance.test.ts` sweeps all ten authored catalogues, parsing these tables
rather than a copy of them, and names the pair when one fails. Run against era one's pre-rebalance
row it reports *"The Family Lodge (4 cells, 80 cost, 20 livability, 0 happiness) is weakly dominated
by The Smokehouse (2 cells, 80 cost, 20 livability, 0 happiness) — it beats it on nothing"*. That
file is the half of this section that cannot go stale.

---

## 3. Era one's catalogue: four types

Provisional values use the era multiplier `2^(N-1)`, which for era one is **×1**, so era
one's numbers *are* the base numbers in §7's table. Every figure is an illustrative anchor
for checking the arithmetic, not a shipping number.

| Building | Footprint | Provides | Cost | Resource eff. | Land eff. | Mix |
| --- | --- | --- | --- | --- | --- | --- |
| **The Smokehouse** | 2×1 (8×4u) | food capacity for ~20 | 80 stone | good | good | livability only |
| **The Family Lodge** | 2×2 (8×8u) | 20 livability + 5 happiness | 80 stone | **best** | fair | livability, and the hall's own fire |
| **The Campfire** | 2×2 (8×8u) | 20 happiness coverage | 100 stone | fair | **worst** | pure happiness |
| **The Spring** | 1×1 (4×4u) | 10 livability + 10 happiness | 120 stone | **worst** | **best** | blend |

**How they trade, which is the point.** The Family Lodge is the best value for the stone — the
same 20 livability as the Smokehouse for the same 80, with 5 happiness thrown in from the
fire burning inside it — and it pays for that by taking a full 2×2 where the Smokehouse takes
2×1. **Those 5 happiness are what stop it being a Smokehouse that costs a plot more**; under
the pooled ruling a dwelling and a food building of equal magnitude are otherwise the same
contribution, which is what §2's invariant refuses. The Campfire costs more for the same
magnitude and wants open ground it cannot share — it is deliberately land-hungry, because a
gathering place that fits in a cupboard is not a gathering place. The Spring is the most
expensive per unit of anything, and what the premium buys is **a plot**: 1×1 for both dials
at once, the best value per cell in the era, which matters enormously in era one where the
whole island is 88 tiles and only 13 further 2×2 slots exist once the skill buildings are
placed. Which of those is *correct* depends on whether the player is short of stone or short
of ground, and that flips as the island grows.

> **FOUR TYPES PER ERA IS DECIDED, for all ten catalogues (Evan, 2026-07-29).** Nine of the ten
> files asked some version of *"is four right for this era?"*, and answering that ten times
> separately is how a catalogue drifts to five in one era and three in another. **It is four,
> everywhere**, and the reason is not the asset budget: **four is the smallest number that can
> carry D-ERA24's three axes without a dominated member** — one food, one pure livability, one
> pure happiness, one blend — and about the largest a single era's buildable land can hold enough
> of for the trade to be visible. Era one is the tightest case and it still holds: 13 further 2×2
> slots is already more than one of each.
>
> **Era six asked the opposite question**, whether it should carry *more* than four; the answer is
> the same, and its premise was stale as well — it read *"given it only adds two skill
> buildings"* and the era adds **six**. **An era that genuinely needs a fifth needs an amendment
> here, with a reason that is not "this era feels thin".**

> ## ⚑ AMENDED 2026-07-29 — heights are stated as an ORDER, not as world-unit figures
>
> Each of the four below carried a `Height ~N units` figure. **The order wins on a mechanical
> ground rather than an editorial one, and this era is where that ground was measured:** every
> stage is contain-fit to its plot by one uniform scale, so the same model stands at two different
> heights on two different plots and a figure is not something a modeller can aim at.
> `style-guide.md` §0 constraint 1 and its own measurement of the `NUM.5` footprint reversal say
> it directly — *"a smaller plot cannot make a building slender; it spends height for no change in
> shape"*, and *"on a shared plot, the taller building is simply the more slender one."* The nine
> later guides all state height as a ranking for that reason, and `../README.md`'s "Constraints
> every guide inherits" carries the rule folder-wide. **Nothing is lost, because the order is what
> the figures were encoding** — The Family Lodge, then The Smokehouse, then The Spring, then The
> Campfire — and it is now stated directly. The one real number is the 24-unit ceiling
> (`MAX_BUILD_HEIGHT`), a cap rather than a target, and §0 records that it binds no era-one
> building. Flagged independently by the era two, five and six image-generation briefs, so this is
> a folder-wide split between the two file types rather than any one era's slip.

### The Smokehouse — food *(2×1)*

Lashed timber A-frames over a low fire trench, hung with strips of meat and fish, a
windbreak of hide on the exposed side, a woodpile, smoke sitting in the frames. Reads as
busy and worked-in: this is where the settlement's survival actually happens.

*Materials:* timber, cordage, hide, undressed stone for the trench lip. **Height: second of the
four**, below The Family Lodge and above The Spring —
deliberately low, so it never competes with a skill building's silhouette.

### The Family Lodge — livability *(2×2)*

**ONE large communal building, and RECTANGULAR in plan.** One long thatched roof with a shallow
ridge running the long axis, carried on battered earth walls, low eaves nearly touching the
ground, a single doorway with a notched post beside it, smoke escaping the ridge. The era's
densest dwelling: **one roof over many families**, not several roofs over one each.

**Those two properties are the whole of what keeps this building distinct, so they are stated
rather than left to the modeller** (and they are why the name is *Lodge* — see the amendment
below):

- **One mass, never a cluster.** Era one's *skill* building on the dwelling mass is "Dwellings,
  the Hut Cluster", and under the no-re-dress ruling both stand on the island **at the same time**.
  The Hut Cluster is three or four small huts round a shared yard; if this were also a cluster of
  huts the two would differ only in how the player got them, which is not a difference you can
  see. One unbroken roof against a scatter of small ones is a silhouette difference and holds at
  full zoom-out.
- **Rectangular, never round.** The round conical form belongs to "Assembly Hall, the
  Roundhouse" in this same era, and era one's §6 spends a whole table keeping *that* apart from the
  hub's ring. A third round building would undo it. The ridge is the tell: a shallow linear ridge
  reads rectangular from any angle, where a cone reads as a point.

**The ridge smoke is load-bearing too.** The 5 happiness in §3's table is the hall's own
fire — the one thing this building has that the Smokehouse does not — so it has to read from
outside: smoke at the ridge, and firelight in the doorway. It is a *domestic* fire and must
stay smaller than the Campfire's, which is the whole settlement's and is worth four
times as much.

*Materials:* rammed earth, thatch, timber posts. **Height: the tallest of the four.** It should
read as *bigger than the Hut Cluster* in `style-guide.md` §6 without reading as more important
than the hub's Stone Circle — and since 2026-07-28 the Hut Cluster is **also 2×2**, so "bigger"
can no longer lean on a bigger plot. It has to be carried by mass and proportion: **one unbroken
roof over the whole tile, markedly taller than the Hut Cluster's scatter of smaller huts round a
yard** — and on a shared plot the taller of two is simply the less squat one, which is the lever
§0's measurement leaves an author.

> ## ⚑ RENAMED 2026-07-29 from *The Longhouse* — an AMENDMENT to #231, which kept it on purpose
>
> **This overrides a decision rather than fixing an oversight, so #231's reasoning is quoted
> instead of overwritten:** *"`The Longhouse` kept. A learner who has never met the word still
> parses *a long house*. It is the best case in the set of period flavour that costs nothing."*
> **The team lead overrode it.** A reader who finds that reasoning should be able to see it was
> considered and superseded, not missed — which is the whole point of recording it here.
>
> **The lead's test is stricter than "parses":** *you do not have to know what a longhouse is.*
> Parsing *long* + *house* gets a learner to "a house that is long", which is a shape rather than
> an institution — it does not say who lives there or that many families share it, and those are
> the two things this building is. *Family Lodge* says both without a period word.
>
> **"Family Huts" was the first instinct and it is REJECTED, for a reason that outlives it.** It
> would have put a cluster of huts you *bought* beside the cluster of huts you *earned* — era
> one's Hut Cluster — differing only in provenance. **That is the distinctness audit failing at the
> name**, before any art exists, and it is why the noun had to be singular and large. Recorded so
> it is not re-proposed, and so the next author naming a bought dwelling checks the era's earned
> one first.
>
> **No number moved:** 2×2, 20 livability + 5 happiness, 80 stone.

### The Campfire — happiness *(2×2)*

Mostly ground rather than building: a wide ring of undressed stone, a fire at the centre,
seating logs and hide mats around it, the earth worn smooth and pale from use. One or two
tally posts at the edge where the settlement keeps its count.

*Materials:* undressed stone, timber, hide, worn earth. **Height: the lowest of the four** —
nothing on it rises except the posts, and the ring itself is knee-high. This is the era's
clearest expression of the "cleared ground kept deliberately open"
idea that `yard` also carries — they should read as siblings without being confusable.

### The Spring — blend *(1×1)*

Water rising in a shallow rock hollow, kerbed with undressed stone to hold it clear, a lip
worn smooth where the vessels rest and an overflow channel cut away downhill. A hide awning on
three poles over the head of it, a hollowed log trough beside it, gourds and skin bags on the
kerb, and the earth all round it beaten pale and hard by the traffic of everyone in the
settlement. **Clean water *and* the place the settlement meets while it queues** — the smallest
plot in the game and the one every path leads to.

*Materials:* undressed stone kerb, hide awning, timber poles and trough, worn earth. **Height:
third of the four**, above only The Campfire — nothing on it rises except the awning poles.

> ## ⚑ RENAMED 2026-07-29 from *The Storage Pit* — an AMENDMENT to #231, which kept it on purpose
>
> **This overrides a decision, so #231's reasoning is quoted rather than overwritten:** *"`The
> Storage Pit` kept … *Storage pit* tells you its function from its own words."* **The team lead
> overrode it**, and a reader who finds that entry should see this was considered and superseded.
>
> **The objection is not obviousness — it is that the name POINTS AT THE WRONG MECHANIC**, and
> that is a sharper failure than an unclear word. *Storage pit* says storage, and **this building
> stores nothing.** It is era one's **blend**: 10 livability and 10 happiness, and **no food at
> all**. A learner reading the catalogue would reasonably expect it to feed people, decide it
> overlaps the Smokehouse, and be wrong about both. **A name that mis-states the mechanic is worse
> than one that merely fails to state it**, because the second leaves the learner to look and the
> first tells them not to bother.
>
> *(An earlier draft of this pass answered the looser brief — *"could be more immediately
> obvious"* — with **The Root Cellar**. That is **superseded**: it is a clearer name for the wrong
> building, since a root cellar stores food too. The lead's item replaced the question, not just
> the answer.)*
>
> **"Gathering Ground" was considered and REJECTED. Recorded so it is not re-proposed:** it
> collides with era one's Commons skill building, **"Clearing"** — two *Grounds* in one era,
> both open outdoor spaces, standing on the island together under the no-re-dress ruling.
>
> **What the name buys, beyond not lying.** *The Spring* gives livability **honestly** (water is a
> capacity a settlement genuinely lives on), it is a natural gathering point, so the happiness half
> is earned by what the building is rather than asserted, and it is **pre-agricultural** — a spring
> is found, not dug or farmed, which is the one thing era one must stay on the right side of.
>
> **And it puts era one into a family the run has had for ten eras without writing it down.** The
> blend building is *always* the small shared amenity everyone uses: Spring → Village Well →
> Fountain, and on to the Chapel's well and beyond. **That regularity is now stated in
> `../README.md`** beside the other structural naming rules, because it is the rule to reach for
> when naming the next one.
>
> **No number moved:** 1×1, 10 livability + 10 happiness, 120 stone.

> ## ⚑ BOTH ERA-ONE RENAMES REACH `packages/economy`, AND THAT PACKAGE IS DELIBERATELY NOT EDITED
>
> **Reported rather than crossed, because another lane is rewriting it** — retiring a currency,
> adding a typed civic catalogue and re-deriving solvency — and editing it here would conflict with
> live work. **Cited by SYMBOL rather than by line**, because a rewrite of that size voids a line
> number the moment it lands:
>
> | Where | What it names | Kind |
> | --- | --- | --- |
> | `capacity.ts`, `deriveCapacities` docblock | *"era one's Smokehouse … weakly dominates the Longhouse"* | Comment; the D-ERA24 argument for the pooled ruling |
> | `capacity.ts`, `greedyPlanCost` docblock | *"era one's Storage Pit (10 + 10 for 120)"* | Comment; the case the heuristic loses to |
> | `capacity.test.ts`, file docblock | *"the Longhouse also carries the 5 happiness"* | Comment |
> | `capacity.test.ts`, fixture constants | **`LONGHOUSE`** and **`STORAGE_PIT`**, plus `ERA_ONE` which spreads all four | Identifiers, not strings |
> | `capacity.test.ts`, inline comments | the Longhouse's happiness, *"one Smokehouse or one Longhouse"*, *"Three Longhouses cost 240"* | Comments |
>
> **Nothing there asserts a name.** `CivicCapacityProfile` carries `livability`, `happiness` and
> `cost` and no display string, so every one of those is a comment or an identifier and **not one
> assertion changes** — which is the same finding #231 recorded when it repointed the same fixtures
> for the Smokehouse and the Campfire. **The rename is a find-and-replace there, not a re-derivation.**
>
> **The one place it is NOT cosmetic is the other lane's own new work.** Its typed catalogue keys
> its parity census on the **display name** in both directions, so an era-one row renamed here and
> not there fails twice — once as a markdown row with no shipped row, once as the reverse. Its ids
> are declared stable and independent of the display name, so the reconciliation is a string per
> row and never an id. **Fifteen of the forty rows are affected**, not two: this pass renamed
> thirteen others, and the full row-by-row list is in the pull request rather than here, because it
> is a merge artefact rather than a design record.

---

## 4. The free first one — and a naming problem in the spec

**§8.1 guarantees the starting city is solvent by construction**, and names two mechanisms:
the Town Hall feeds and houses its founders on its own, and **"the first farm is free —
introduced by the tutorial as the player's first real placement choice."**

> **The word "farm" is wrong for era one, and by a whole era.** Era one is the
> **Prehistoric Era** — *counting, tallying, sharing a kill.* Agriculture is era two's
> entire premise: *"first settlements and agriculture: seed that multiplies, grain stores
> doubling."* A Prehistoric settlement forages, hunts and dries; it does not farm.
>
> So era one's free food building is **the Smokehouse**, and "farm" becomes the correct
> word from era two onward. This is a wording fix in §8.1 rather than a design change — the
> solvency guarantee itself is untouched — but it needs making, because "the first farm is
> free" is the sentence the tutorial will be built from, and it is also the free placement
> that **O-8** (how the coach-mark introduces it) hangs on.

**What the guarantee demands of the numbers here.** For every reachable learning state, the
stone granted so far must cover the livability and food capacity needed for the population
at that point (§8.1). Era one's population sustains around 60, and the citizens work already
sweeps all 33 valid D1 build orders and all 4,096 mastery vectors — so the harness to prove
this exists and should be reused rather than rebuilt.

---

## 5. Legacy decay, and what it means for these four

**D-ERA23** decays a frozen civic building's **contribution**: it keeps working but
contributes **less relative to a city whose needs are scaling by
`2^(N-1)`**. By era four a Prehistoric Family Lodge is charming rather than load-bearing.

> **AMENDED 2026-07-29 — D-ERA23 was SPLIT by the no-generation ruling and this is the half
> that survives.** The sentence read *"applies decay to civic buildings as well as skill
> buildings"*. The skill half decayed a building's **output**, and there is no output, so it is
> withdrawn with nothing to replace it; **the civic-contribution half — this file's half — is
> untouched.** And the superlative below is no longer earned: §7's *"the single most
> load-bearing unset number"* rested on *"sixty accumulated producers"* trivialising the
> economy, which cannot now happen. **Do not cite it.** The curve itself is decided in §7 of
> this file.

**The decay curve is decided (§7 below: `0.9 ^ (eras behind)`, floored at 0.5)**, against the
two failure modes O-5 names — too steep makes old quarters worthless, too shallow makes
the late game free.

**What this file owes that decision:** era one's buildings are the ones decay is applied to
for the longest, so they are the natural test case. If a Prehistoric quarter still meaningfully
feeds a Cyberpunk city, the curve is too shallow; if the player is pushed to tear era one
down, it is too steep and the archaeological-layers reading dies with it.

**The visual side is already constrained.** §6.5 requires older buildings to recede subtly —
less contrast, no glow — and explicitly **not** to converge with the island-decay weathering
language, because *"an old building is old, not neglected."*

---

## 6. Rules the copy and the art must not break

- **INV-ERA-3 / D-ERA14: happiness responds to how you built, never to how fast you
  study.** Nothing about these buildings, their tooltips, or their shortfall warnings may
  key off study pace, absence, time since last session, streaks, or wall-clock time of any
  kind. Shortfalls in food, housing, jobs and amenities are fair game — those are
  allocation choices.
- **INV-COS-1: no shortfall may gate anything.** Not a lesson, not mastery, not the trial,
  not the era advance. A hungry city is a management problem, never a lock.
- **Departures are slow, signposted and reversible**, measured in play time — roughly one
  per ten minutes of play after a ten-minute grace period — and fixing the shortfall brings
  people back. What the return looks like is **open (O-7, Evan)**.
- **New arrivals carry a grace period** and are visibly flagged, so the waiting crowd
  motivates without becoming cruelty.
- **Mastery gold `#FFB703` is reserved** and can never appear on a civic building.
- **Nothing carries meaning by art alone** — the canvas is `aria-hidden`, so every capacity,
  shortfall and count lives in the DOM.

---

## 7. CLOSED — and the four economy numbers all ten catalogues wait on

**Nothing here is open as of 2026-07-29.** Era ten's row closed, re-opened when the aggregation
re-ruling deleted the axis its answer rested on, and closed again the same day once the pair was
differentiated — the round trip is left visible rather than tidied away, because it is the clearest
example in these ten files of a ruling being undone by a later one. Items are kept with their
resolutions rather than deleted, so nobody re-raises them. **The economy rows below are the ones the
other nine `civic-buildings.md` files point at**, which is why they are written out here once rather
than nine times.

| What | Resolution | Decided |
| --- | --- | --- |
| ~~**The capacity model**~~ | **Two capacities, livability and happiness; housing and food are INPUTS to livability.** §2 above | **Gabriel, 2026-07-29** |
| ~~**The aggregation residual**~~ | **RULED TWICE THE SAME DAY, and the second one stands: (a), ONE POOL** — `livability = Σ` every contribution, and housing and food are not tracked separately. It was first ruled (b), the limiting factor, in `2026-07-29-era-resource-model-design.md` §4.5; the team lead then re-ruled it (a), because separate tracking has no middle ground and would make every building in every catalogue declare which of the two it feeds. **This did change catalogues**, unlike the first ruling: six of the ten held a weakly dominated building under one pool, and §2 records the fix and the invariant that now watches for it | **Gabriel, 2026-07-29 (#227, re-ruled in #236)** |
| ~~**Era ten held two buildings that were the same building**~~ | **DIFFERENTIATED, and it took two numbers.** Its Vertical Farm and Capsule Homes — the latter since renamed **The Pod Apartments**, at the same numbers — are both 1×1 for 10,240, so one axis could only ever favour one of them: the Farm now carries **2,560 happiness** (fresh food is a luxury in a neon city) and the Homes drop to **35,840 data** (the cheapest housing in the run, which is what capsule housing is). Neither dominates, and **Evan's own criterion — separated by cost *and mix* — is satisfied in its own words** once mix exists again. The sweep now runs with **no exceptions list at all** | **The team lead (*"differentiate these"*) + Gabe, 2026-07-29** |
| ~~**O-6** the forward-conversion rate~~ | **THIS IS THE CURRENCY RULE — what happens to a player's MATERIAL BALANCE when the city advances an era. RULED: a haircut of half the purchasing power.** `materialCarryForward(amount)` = `floor(amount × MATERIAL_CARRY_FORWARD / ERA_COST_MULTIPLIER_STEP)` with `MATERIAL_CARRY_FORWARD = 0.5` (`packages/economy/src/constants.ts`), so a leftover stone stockpile is worth **half its purchasing power** in grain rather than all of it. **Not O-5 two rows below**, which decays a *building's* contribution — see the box under this table. **Two caveats measured 2026-07-31 and recorded in `../../2026-07-31-era-material-carry-forward-ruling.md`:** the shipped arithmetic retains **12.5%** of purchasing power rather than the 50% this row claims, and the rate is **still unwired** — no era advance converts anything. **Also stale rather than open**, for the rate half; the identity half is per-era and every era has named its material | **Gabe, 2026-07-29 (#227)** |
| **O-4** teardown pricing | **RULED: 25% of the CURRENT era's build cost for that building type, no refund**, scaling with the era multiplier `ERA_COST_MULTIPLIER_STEP ** (N-1)`. The spec's own starting suggestion, promoted. Deliberately **not** 25% of what the building originally cost: clearing an era-two Granary in era eight costs a quarter of an *era-eight* build, which is what keeps teardown a real decision late on. Clearing still **converts** a quarter rather than modernising it (D-ERA12) | **Gabe, 2026-07-29** |
| **O-5** the legacy-decay curve | **RULED: `0.9 ^ (eras behind the current era)`, floored at 0.5**, applying to both classes (D-ERA23). Arithmetic below. **What decays is a frozen civic BUILDING's contribution — the livability and happiness it still supplies. This row says nothing whatever about a material balance, a wallet or a price; currency is O-6, two rows above.** | **Gabe, 2026-07-29** |
| **§8.1's "first farm"** | **Renamed "the first food building."** Era one's is the **Smokehouse**, which is not a farm and must not be called one: the era is pre-agricultural, and **era two's Granary is the first thing in the run that deserves the word** | **Evan, 2026-07-29** |
| **O-8** the coach-mark for the free Smokehouse | **Two anchored steps, no more.** One on the Smokehouse as it lands (*"this dries the food, and it came with the settlement"*), one on the food readout in the HUD the first time it moves. The machinery exists (`apps/web/src/city/coachmarks/`, with its `useSyncExternalStore` anchor registry), so this is copy plus two anchors | **Evan, 2026-07-29** |
| Whether four types is right for era one, on 88 tiles | **Yes, four. And four in EVERY era** — see the box under §3 | **Evan, 2026-07-29** |
| **Whether the four prices may share one shape across the ten eras** | **NO — RULED: *"the buildings shouldn't all have the same price ratios and be priced the exact same relative to each other across eras. Doesn't need to be drastic; just some kind of variance would be nice."*** Seven eras were re-priced and **era one was not**, being the anchor and the only reviewed era; eras seven and ten were also left alone, having shapes the lead had already ruled on. All ten ratio vectors are now distinct. **The doubling LADDER between eras is untouched** — it is the shape *within* an era that varies. The rule that keeps INV-ERA-4 closed: an era's city price is `3 × (min(food, dwelling) + amenity)` and every re-priced era holds that sum at 180 at era-one scale, so **the ladder sets what a city costs and the era sets which of the four pays for it**. Full before/after and the per-era reasoning at `../README.md`; each era's own note is in its `civic-buildings.md` §2 | **The team lead, 2026-07-30** |
| ~~The 1×1 row's art drew a different building from the one the row named~~ | **RULED FOR THE ART, so the row moved and the model did not.** The catalogue said *The Storage Pit*, a sunken thatch-capped pit; the authored art is a stone-ringed spring. Evan: *"the storage pit is supposed to be a bathhouse"*. The row is now **The Water Spring** and describes what is drawn, the type id and the GLB are renamed with it, and `civicBuildings.ts`'s subject-divergence declaration is closed. **The name is not his word**, because era three already ships The Bathhouse and all forty civic names must be unique — the box under §3 has the full reasoning and flags the departure. **No figure moved**, deliberately | **Evan, 2026-07-29** |

### O-5 and O-6 are the two easiest rows in this table to mistake for each other

**Recorded 2026-07-31 because the confusion has now happened, at the top of the team.** Asked
what the game does to a player's currency at an era advance, a reader arriving at this table
lands on **O-5** — a decay curve, ruled the same day, by the same owner, with a floor of
`0.5` in it — and takes it for the answer. It is not. The two rows govern different things
and are not alike in kind:

| | **O-5**, the legacy-decay curve | **O-6**, the forward-conversion rate |
| --- | --- | --- |
| What it changes | A frozen civic **building's** contribution: the livability and happiness it still supplies | A **material balance**: a count of stone, grain, bronze |
| The number | `LEGACY_DECAY_PER_ERA = 0.9` per era behind, floored at `LEGACY_DECAY_FLOOR = 0.5` | `MATERIAL_CARRY_FORWARD = 0.5` of purchasing power, per advance, with no floor |
| When it applies | Continuously — recomputed on every read, from the distance to the current era | Once, at the advance itself |
| Whether a retune reaches the past | **Yes.** It is a derivation, so changing the number changes every city ever built | **No.** It writes ledger rows, so an executed conversion is a historical fact |

The short form: **O-5 is a lens and O-6 is a transaction.** Both carry a `0.5` and the two
`0.5`s mean entirely different things.

`../../2026-07-31-era-material-carry-forward-ruling.md` is the measured record of what the
game does today, what O-6 does and does not settle, and the two defects it found; this box
exists so that the question does not have to be asked a second time.

### The aggregation rule was RULED TWICE ON ONE DAY. Here is how to read the three records

**Recorded 2026-07-29 because this file, the resource-model record and the code disagreed for part
of a day, and a reader arriving later will meet all three.** The disagreement is now resolved and
the trail is worth keeping, because the second ruling reversed the first.

| Record | What it says | Standing |
| --- | --- | --- |
| **§2, above** | Now carries the pooled ruling directly. It previously read *"(b) is where the evidence points and it is not yet ruled"* | **Rewritten**, so a reader of §2 alone is no longer misled. The quoted sentence was true when written |
| **`2026-07-29-era-resource-model-design.md` §4.5** | Shipped `min(Σ housing, Σ food)` — reading **(b)**, the limiting factor — decided in the economy lane on a measurement | **Superseded the same day**, and left standing there deliberately, because the record of why it was wrong is worth more than the record of the decision |
| **The tip, and the row above** | **ONE POOL** — `livability = Σ` every contribution, housing and food not tracked separately | **CURRENT.** Ruled by the **team lead** and shipped in `#236`: `deriveCapacities` sums, and `CapacityContribution` no longer has separate `housing`/`food` fields at all |

**What made the reversal a product call rather than a correction.** The lead's reason is that
**there is no middle ground on separate tracking**: if housing and food are distinct quantities,
every building in every era catalogue must declare which it feeds, which is a great deal of
specification for one extra dial in a game where the city is motivation rather than the subject.
Two capacities was always the shape (§7's *"two dials, not three"*); a housing term and a food term
inside one of them is a third and a fourth by the back door.

**And the measurement that (b) rested on was real but misdiagnosed.** Under one pool, one of each
era's food-building/dwelling pair dominated the other on cells, cost and magnitude at once in **7
of the 10 eras** — which looked like D-ERA24 breaking and was **a pricing problem wearing an
aggregation problem's clothes.** A building worse on every axis with no compensating property does
not need a cleverer formula; it needs a different price or a different property. The fix went into
the catalogues, and `test/eraCivicCatalogueDominance.test.ts` now states D-ERA24 over all ten so it
cannot quietly stop being true.

**How to cite it.** `min` is **history**, not shipped behaviour, and not a fallback. **One pool is
the lead's ruling**, and it is the only one of the three that is current. **There is no
`LIVABILITY_AGGREGATION` constant** and there never was — the choice lives in `deriveCapacities`
and in the tests around it; `rg LIVABILITY_AGGREGATION` over the repo returns nothing, so any
document naming one is wrong.

### Era one IS solvent on the lesson lump alone — as of the pooled ruling, and not before it

**Re-verified at the tip on 2026-07-29, after `#236`.** `packages/economy/src/capacity.test.ts`
pins it in a test whose name carries the history: *"finds era one solvent at the six-lesson payout,
**which min did not**"*.

- `granted` = 6 era-one nodes × `EARN.lessonComplete.material` 100 = **600 stone**
- `needed` = `greedyPlanCost(ERA_ONE, { livability: 60, happiness: 60 })` = **540 stone**
- `isSolvent(600, 540)` is **`true`**, with 60 stone of headroom.

**This is the clearest thing the aggregation reversal changed, and it changed a claim about
INV-ERA-4.** Under `min` the same target priced at **780** against the same 600, so era one was
**not** solvent on the lump and the 180-stone gap was closed — if it was closed — by three of
Evan's numbers, none of them quantified anywhere: the free first Smokehouse (§4 above), the Town
Hall feeding and housing its founders, and a population climbing over play time rather than
arriving at 60. **Pooling pays for the same population once instead of twice**, so the predicate now
holds outright and **those three became headroom rather than the whole margin.**

**Why it is worth stating that it used to fail.** §8.1's **INV-ERA-4** promises the game never
manufactures a shortfall the player could not have prevented, and for one day the shipped predicate
said era one broke it. It no longer does — but the margin is 60 stone on illustrative anchors, so
**a re-price of any of the four rows in §3 can put era one back under water**, and the test is what
would say so. That is the reason the predicate shipped rather than the bare assertion.

**Note what the no-generation ruling does to this, because it cuts the other way from the reversal.**
There is no trickle: a building's withdrawn `2/hour` output would have closed a 180-stone gap in a
day and a half of wall-clock. **Era one's finite supply is exactly 600 and nothing else will ever
arrive**, so the 60 of headroom is the whole of it. `../../2026-07-29-era-resource-model-design.md`
§5.4 puts era one in its **hard tier** — costs a learner must pay to progress must fit inside the
finite one-time earnable, with headroom — and era one now satisfies it, narrowly, for the first time.

### O-5, spelled out, because §7 calls it the most load-bearing unset number in the economy

**A building's contribution is multiplied by `0.9 ^ (eras behind)`, and never falls below half.** One
era behind, 0.9; three behind, 0.73; six behind, 0.53; seven or more, the 0.5 floor.

**Read "contribution" strictly: this is a BUILDING's livability and happiness, and nothing
else.** O-5 never touches a material balance, a wallet, a price or a purchase. What happens to
a player's currency at an era advance is **O-6**, and the box under §7's table says why the two
are so easy to swap.

**Why a gentle curve.** §17 names the failure modes on both sides — *too steep makes old quarters
worthless, too shallow makes the late game free* — and the era ladder is what makes gentle the right
answer: costs and values already scale by `ERA_COST_MULTIPLIER_STEP ** (N-1)`, so a building three
eras behind is worth **an eighth** of a current one *before any decay at all*. A steep curve on top of
that double-counts the ageing. 0.9 per era leaves the frontier carrying the economy without making an
old quarter a liability.

**Why the floor, and why exactly half.** §8's solvency guarantee promises that every population
increase arrives with resource enough to sustain it, and INV-COS-1 forbids a shortfall gating
anything. A curve running to zero eventually turns a player's own earlier building into a net drag on
a city they cannot clear for free, which punishes them for having played — the thing the visual
brief's non-punishing stance rules out, and the same argument #227 used to reject a 0.0 carry-forward.
**At the floor an old quarter is charming and half useful, which is D-ERA23's stated intent in as many
words.**

**What is still owed on it, and it is a test rather than a decision:** the sweep era nine asks for.
See that file's row.

---

## Related

- `style-guide.md` — the six skill masses, the Town Hall, materials, palette, and the nine
  hard constraints every design in this folder inherits.
- `../../2026-07-27-era-progression-design.md` — §6 the two classes, §6.4 freezing and
  era-exclusivity, §7 the economy, §8 happiness and the solvency guarantee, §12 the asset
  budget.
- `../README.md` — the ten eras and what each guide owes.
