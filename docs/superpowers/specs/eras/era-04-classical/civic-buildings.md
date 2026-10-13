# Era 4 — Classical Era: civic buildings

**Status: PROPOSED.** The companion to `style-guide.md`. That file covers the **skill
buildings** — earned 1:1 with lessons. This one covers the **civic
buildings**: bought, and **providing** the city's food, livability and happiness.

> **AMENDED 2026-07-29 by two team-lead rulings, both of which overturned a decided item.**
> *(1)* **There is no generation economy**: no building produces, so *"which **produce**"*
> is cut from the line above and from §0. A skill building's only credit was always the
> one-time lump paid for **completing its lesson**
> (`../../2026-07-29-era-resource-model-design.md` §5). *(2)* **Skill buildings no longer
> re-dress across eras** — only the Town Hall rethemes, on the stated grounds of art
> overhead (`../../2026-07-27-era-progression-design.md` §6.1, §6.4a). **The two classes are
> now split by how they are ACQUIRED — earned against bought — and nothing else.**

Era four's answer to **O-12**, and to the identity half of **O-6**.

**Era multiplier: ×8.**

---

## 0. The contract

Skill buildings are **earned**; civic buildings are **bought** (D-ERA7). **Neither produces**
on a per-tick basis, and both are **frozen in the era they were built** — the Town Hall is the
one building that rethemes. Civic buildings are **frozen in era four forever**, the catalogue is
**era-exclusive**, and there is **no renovation** (D-ERA11). Teardown only, for a cost, no
refund (D-ERA12). Full table in `../era-02-neolithic/civic-buildings.md` §0.

---

## 1. The era's resource: silver

> **RENAMED 2026-07-29 from `silver_coin` to `silver`, by the team lead's recognisability ruling** —
> *every material must be immediately recognisable to the vast majority of users*. A coin qualified by its metal is the same failure as a florin; naming the substance also continues the ladder nobody needs taught — bronze, then silver. Seven of
> the ten ids changed in the same pass; the full before/after table and the reasoning are at
> `../../2026-07-29-era-resource-model-design.md` §4.1a, and the code landed in `#233`. **The `Cost` column below said `coin`** and now says `silver`; `coins` is era five's id and cannot mean two things on one ledger.

**Era four's material is `silver`.** Period-honest and unambiguously spendable.

**This is not gold returning.** D-ERA13 dropped *gold as a separate parallel currency* — every
era still has exactly **one** era-themed spendable resource, and here it happens to be minted
metal. Mastery gold `#FFB703` remains reserved and cannot be used for this material's colour either.

It is the first resource that is **abstract** — a token standing for value rather than the value
itself, where stone, grain and bronze were all useful in themselves. That is the era's genuine
step forward.

---

## 2. The catalogue: four types

§7's anchors at **×8**. Illustrative anchors, not shipping numbers. Footprints in grid cells.

| Building | Footprint | Provides | Cost | Wins on | Loses on |
| --- | --- | --- | --- | --- | --- |
| **The Grain Dock** | 2×2 | food for ~160 | 560 silver | resource efficiency | it is a blank box — the least characterful thing in the era |
| **The Cottages** | 1×2 | 160 livability | 840 silver | **land efficiency** — it goes UP where earlier dwellings spread | **resource efficiency** — the era's height premium, and it is a real **1.5×** the Grain Dock |
| **The Baths** | 3×2 | 160 happiness | 880 silver | the era's centrepiece, and it anchors a whole quarter | **land efficiency**, and **resource efficiency** — dearer per unit than the Cottages, which D-ERA24 requires of an amenity |
| **The Fountain** | 1×1 | 80 livability + 80 happiness | 1,120 silver | **the smallest plot** | **resource efficiency** |

**How they trade (D-ERA24), and note what changed.** For the first three eras the dwelling was
the land-efficiency winner *and* the cheap option. Here they separate: **the Cottages win
on land by going vertical, and pays for it in cost** — half again the Grain Dock's price, which is
what a height premium costs when it is priced rather than asserted. So the player short of silver
now buys the Grain Dock and a cheap sprawl, while the player short of ground buys the Cottages.
That is the axis genuinely splitting rather than one building dominating.

**The 1×2 footprint is what makes that sentence true, and it was 2×2 until 2026-07-29.** At 2×2 the
Cottages housed the same 160 on the same four cells as the Grain Dock's food, for 160
silver more — under the pooled livability ruling (`../era-01-prehistoric/civic-buildings.md` §2) that
is the same contribution at a higher price, so the dwelling was weakly dominated and the paragraph
above described a trade the numbers did not make. Halving its plot is the smallest change that gives the
building back the property it is *for*: four storeys and an external stair are how a city houses
people without spreading, and the run agrees with it — era eight's Apartment Tower and era nine's
Residential Tower are 1×1. Era four is where that curve starts.

**The specific failure mode to design against in this era.** The Baths are the most appealing
building in the catalogue so far, and the temptation is to make them strictly the best purchase.
**D-ERA24 forbids it** — an amenity must cost more per unit than a dwelling *and* lose on land,
or the trade disappears and the catalogue becomes a ladder.

> ## ⚑ RE-PRICED 2026-07-30 — and it closes TWO of this file's own sentences
>
> **THE RULING (team lead, 2026-07-30, verbatim):** *"the buildings shouldn't all have the same
> price ratios and be priced the exact same relative to each other across eras. Doesn't need to be
> drastic; just some kind of variance would be nice."* The catalogue was one price shape scaled by
> the doubling ladder — era four shared `1 : 1.25 : 1.25 : 1.5` with era eight, and eras one, two and
> three shared `1 : 1 : 1.25 : 1.5` between them. What varies now is the shape **inside** an era; the
> ladder between eras is untouched.
>
> **`640 / 800 / 800 / 960` becomes `560 / 840 / 880 / 1,120`**, and the reason is that era four
> already argued for this shape in prose and did not have the numbers:
>
> - §2 says the Cottages *"win on land by going vertical, and pay for it in cost"*. At 800 against
>   640 that premium was a quarter; it is now **half again**, which is what a height premium reads as.
> - The paragraph directly above says an amenity *"must cost more per unit than a dwelling"* — and the
>   Baths and the Cottages were **both 800**, a tie in the very file that asked for the inequality.
>   At 880 against 840 it is satisfied, and the Baths still lose on land.
>
> **Nothing else moved:** the four plots, both contributions on all four rows, and era four's
> **solvency** — the era's optimal city is still 4,320 silver against a mintable 4,800, because the
> ladder fixes what a city costs and this ruling only changes which of the four you pay it to.
> `packages/economy/src/civicSolvency.test.ts` re-derives it.
>
> **The Grain Dock's and the Cottages' rename notes below each end *"No number moved"*, and both stay
> true of the 2026-07-29 naming pass they were written for.** The plots and contributions they pin
> are current; the two costs are now 560 and 840.

> ## ⚑ AMENDED 2026-07-29 — heights are stated as an ORDER, and four material lines are reconciled with `style-guide.md` §2
>
> **(1) Heights.** Each of the four below carried a `Height ~N units` figure while
> `style-guide.md` §3 states height as a ranking and says in terms that the guide *"deliberately
> gives no world-unit targets"* — so the era's two files disagreed about what a height even is.
> **The ranking wins on a mechanical ground rather than an editorial one:** every stage is
> contain-fit to its plot by one uniform scale, so the same model stands at two different heights
> on two different plots and a figure is not something a modeller can aim at. Proportion is the
> only lever they hold, and **the more slender of two neighbours is simply the taller one**
> (`../README.md`, "Constraints every guide inherits"; `../era-01-prehistoric/style-guide.md`
> §0). **Nothing is lost, because the order is what the figures were encoding** — the Cottages,
> then the Baths, then the Grain Dock, then the Fountain — and that order is now stated directly.
> The one real number is the 24-unit ceiling (`MAX_BUILD_HEIGHT`), a cap rather than a target,
> and nothing in this era approaches it. Flagged independently by the era two, five and six
> image-generation briefs, so this is a folder-wide split between the two file types rather than
> an era-four slip.
>
> **(2) Four things this file specified that §2 rules out or the era does not carry.** All four
> were found by `output/imagegen/era-04-classical-building-briefs/README.md`, which is the
> document the art is being generated from, so each is reconciled the way that brief drew it:
>
> | What | Where it stood | How it is reconciled |
> | --- | --- | --- |
> | **Buttressed side walls** | The Grain Dock | **Dropped.** §2 absents *"the pointed arch and the buttress, which the Medieval era owns"*, §3 says *"Nothing that needs a buttress, because the buttress is Medieval"*, and the Lesson framings rule restates *"no buttress"* — three statements against one, and the flattest contradiction of the four. The brief draws load-bearing walls on a solid vented plinth and no buttress anywhere |
> | **A domed caldarium** | The Baths | **Kept, and qualified.** What §2 withholds is *"the dome on a **drum**"*, which is the Renaissance's announcement; a low dome springing straight off the hot room's own walls with no drum and no lantern is Classical, is what a Roman bath actually was, and is what the brief draws. §2's banner and §4's flat restatement now carry the qualification |
> | **High clerestory windows** | The Baths | **Kept, and worded honestly.** §2 absents *"window glass at any size … so every opening here is a shutter, a grille or a void"*. The form is legal — `POL.3`'s basilica clerestory is authored in §5 — so *windows* here always meant unglazed openings, and now says so |
> | **Brick and concrete as visible faces** | The Grain Dock, The Cottages, The Baths | **Moved behind the four materials.** §2 admits brick only as a substrate — lime plaster and stucco are *"a skin over rubble or brick where ashlar is not affordable"* — and concrete appears in §2 nowhere at all. Roman concrete being period-honest is not the same as its being one of this era's four. The visible faces are stucco over brick, and the Baths' vaulting is mortared masonry |

### The Grain Dock *(2×2, food)*

A rectangular granary of ashlar, a raised ventilated floor on a solid plinth with a line of
vents under the floor line, loading doors along one long side under a shallow tiled roof, and a
paved apron in front of them with sacks and a hand crane. Deliberately plain — this is
infrastructure, and the era's character lives in the Baths.

*Materials:* ashlar, lime stucco over brick where ashlar is not worth spending, terracotta tile,
timber floor. **Height: third of the four** — low and wide, below the Baths and above the
Fountain.

> ## ⚑ RENAMED TWICE ON 2026-07-29, and the second name is the one that stands
>
> **`The Public Granary` → `The Harbour Granary` → `The Grain Dock`.** The first pass fixed the
> collision with era two's **The Granary** — *public* is decoration, since era two's is public too —
> by qualifying it with the era instead. **The lead rejected that as well, and he was right:** it was
> still a third *granary* in the run, and the qualifier was carrying the era rather than naming the
> building. Two eras holding *Granary* and *Harbour Granary* is the same defect one step quieter.
>
> **`The Grain Dock` names the thing.** §2's art is a granary with **loading doors along one long
> side and a paved apron with a hand crane** — the building exists because grain arrives by ship,
> and the dock is the half of it a player can see. It is where this era's grain lands, which is
> era-locked in the way *Lighthouse* is: a Classical port has one and a Neolithic village cannot.
>
> **What it deliberately is not:** *the horrea*, which `../README.md` names as failing; *the Grain
> Warehouse*, which would have made a third warehouse beside era seven's and era nine's; and
> *Harbour* anything, since this era's `hall` and `store` dressings are now the Custom's House and the
> Wine Cellars and the harbour does not need saying three times. **No number moved:** 2×2, food for
> ~160, 640 silver.

### The Cottages *(1×2, livability)*

Four storeys: shops with wide openings at street level, stuccoed dwellings above, small
balconies, a tiled shallow roof, external stair to the upper floors. **The first building in the
run to go properly vertical for housing**, and it should read as crowded and alive.

*Materials:* lime stucco over brick, timber balconies, terracotta tile. **Height: the tallest of
the four, and the tallest civic building in the run so far.** **On half the plot it had
before** — 1×2 rather than 2×2, so the mass is a slab rather than a block, and the height is
doing all the work. Read from the locked tilt they should look tight and tall against the Grain
Dock's low sprawl beside them.

> ## ⚑ RENAMED TWICE ON 2026-07-29, and the second name is the lead's own
>
> **`The Apartment Block` → `The High Houses` → `The Cottages`.** *Apartment Block* is a
> twentieth-century phrase standing in a Classical catalogue, and it was one word from era eight's
> **Apartment Tower**. The Roman institution is the *insula*, which `../README.md` names as failing
> outright, so the period's own word was never available. The first pass answered with *The High
> Houses*, keeping this folder's `<qualifier> Houses` convention and saying the one thing that makes
> this building different — it goes up where earlier dwellings spread.
>
> **The lead chose `The Cottages`, and it is available because era five's housing became `The
> Castle` in the same review.** It is the plainest word in the run for a row of small dwellings, and
> the run now reads **Cottages → Castle → Merchant Houses** across eras four, five and six rather
> than putting cottages *after* the castle, which is the ordering the first pass argued against and
> which this avoids by going one era earlier instead of one era later.
>
> **What the name costs, stated rather than hidden:** *cottage* says small and low, and §2's art is
> four storeys and the tallest civic building in the run so far. **The plural is doing
> that work**: a cottage is small, *the Cottages* is a row of them, and the building is a stack of
> small dwellings rather than one large one. If the lead wants the height back in the name, *The
> Cottage Rows* is the alternative and it is his call. **No number moved:** 1×2, 160 livability,
> 800 silver.

### The Baths *(3×2, happiness)*

A vaulted frigidarium hall with high clerestory openings — unglazed voids or grilles, because
window glass at any size is absent from this era — a **low domed caldarium springing straight
off its own walls, no drum under it and no lantern over it**, a smoking furnace end, a
colonnaded palaestra court along the front, statuary in niches. The era's centrepiece and its
clearest statement of what mortar and dressed stone make possible.

*Materials:* mortared masonry vaulting, ashlar, marble accents, terracotta tile, mosaic.
**Height: second of the four**, just below the Cottages and above everything else in the era.

> **KEPT 2026-07-29, deliberately, while the other two bathing buildings were renamed.** The run
> held three near-identical bath names — era three's *Bathhouse*, this era's *Baths* and era
> seven's *Public Baths* — and `../README.md`'s rule says to reach for the institution the period
> actually had rather than to add a qualifier. **For this era that institution IS "the baths."**
> It is the one of the three where the word is the true name of the thing and not a shorthand for
> it: a vaulted hall, a hot room, a cold plunge and an exercise court used for a whole afternoon,
> which is what an English speaker means by *the baths* with no further explanation. So era three
> took the half it owns (**The Steam House** — heat, and the first heated building in the run) and
> era seven took the half it owns (**The Wash House**, since renamed **The Food Works** in the
> consolidated pass — the weekly wash for houses with no bathroom), and **the three now share no
> word.** Renaming this one as well would have cost the
> catalogue its most recognisable name to satisfy the letter of "differentiate all three" after the
> substance of it was already met. **Flagged rather than assumed**: if the lead wants all three
> strings to move, this is the one to argue about.

### The Fountain *(1×1, blend)*

A small paved court with a fountain basin fed by a visible pipe from an aqueduct spur, benches
under two clipped trees, a low wall. Water security *and* the place a quarter gathers, on one
cell.

*Materials:* ashlar, marble basin, terracotta paving, lead pipe. **Height: the lowest of the
four** — nothing on it above the two clipped trees.

---

## 3. Solvency, decay, and the rules

**§8.1's solvency guarantee** holds unchanged.

**D-ERA23 legacy decay** now has real distance to work with: era one's buildings are three eras
behind. **The curve is open (O-5, Gabriel)** and this is the first era where the player can
plausibly *see* whether old quarters read as charming or as dead weight.

**All copy and art rules** are enumerated in `../era-01-prehistoric/civic-buildings.md` §6 and
inherited in full.

---

## 4. CLOSED

**Nothing here is open as of 2026-07-29.** Full statements in
`../era-01-prehistoric/civic-buildings.md` §7.

| What | Resolution | Decided |
| --- | --- | --- |
| ~~**The capacity model** contradiction~~ | Two capacities, **livability** and **happiness**; **housing and food are INPUTS to livability**, aggregated as **one pool** — `livability = Σ` every contribution. Ruled `min(Σ housing, Σ food)` in #227 and re-ruled by the team lead the same day. This era was one of the seven the pool broke — the Grain Dock dominated the Cottages outright at 2×2 each — and the fix is in §2: the dwelling drops to **1×2**, which is the land win its own `Wins on` cell already claimed | **Gabriel + Gabe, 2026-07-29 (#227, re-ruled in #236)** |
| ~~**O-6** the conversion rate~~ | **Half the purchasing power survives:** `floor(amount × 0.5 / 2)` | **Gabe, 2026-07-29 (#227)** |
| **O-4** teardown pricing | **25% of the CURRENT era's build cost for that type, no refund** | **Gabe, 2026-07-29** |
| **O-5** the legacy-decay curve | **`0.9 ^ (eras behind)`, floored at 0.5** | **Gabe, 2026-07-29** |
| Whether the Cottages' height premium is the right size | **Yes: the 25% premium over the food building stands.** It is the same quarter the teardown rule uses, which is deliberate — a quarter is about the smallest step a player reliably notices in a price and about the largest that does not make the vertical option a trap. **The premium is the mechanism that split two axes that had moved together for three eras:** until now the dwelling was both the cheap option and the land-efficiency winner, and here the player short of resource sprawls while the player short of ground pays for height. Neither choice is ever wrong, which is D-ERA24 working. **It should not be tuned away**, and if it is ever tuned, it moves with the teardown percentage rather than on its own | **Evan, 2026-07-29** |

---

## Related

- `style-guide.md` — the **five** skill buildings this era adds. *(It re-dresses none, per the
  2026-07-29 ruling; and the count was corrected 7 → 5 when the Renaissance rebalance moved
  `POL.6` and `POL.7`.)*
- `../era-01-prehistoric/civic-buildings.md` — the authored template, the full rules list, and
  the two flagged contradictions.
- `../../2026-07-27-era-progression-design.md` — §6.4, §7, §8, §12.
