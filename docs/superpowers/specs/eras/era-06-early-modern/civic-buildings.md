# Era 6 — Early Modern: civic buildings

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

Era six's answer to **O-12**, and to the identity half of **O-6**.

**Era multiplier: ×32.**

> ## ⚑ 2026-08-02 — EARLY MODERN PRODUCTION SILHOUETTES
>
> The display name is **Early Modern**; the stable runtime id remains **`renaissance`**. The
> canonical images and standalone prompts are in
> `output/imagegen/era-06-early-modern-building-briefs/`.
>
> The four refined canonical images lock each civic model's composition, silhouette,
> proportions and medium-rich architectural detail. Runtime reconstruction remains directly
> Three.js-feasible through simple primary masses plus shared or instanced trim. **Only the art
> description changed.** Footprints, costs, contributions, acquisition rules and the stable
> `renaissance_*` catalogue ids remain exactly as authored.

> **This era's catalogue matters more than most.** These four carry a large share of era six's
> visual identity, and under-investing here makes the whole era read as a gap in the city's
> history.
>
> *(Corrected 2026-07-29. This opened "With only three new skill buildings", against a roster of
> **six** — the same premise the file already corrects at §4: "It reads 'given it only adds two
> skill buildings' — this era adds six." The claim these four carry the bulk of the era's identity
> was the weaker for it, so it is stated at the strength the real count supports. `style-guide.md`'s
> "Related" section repeats the same premise and is corrected with it.)*

---

## 0. The contract

Skill buildings are **earned**; civic buildings are **bought** (D-ERA7). **Neither produces**
on a per-tick basis, and both are **frozen in the era they were built** — the Town Hall is the
one building that rethemes. Civic buildings are **frozen in era six forever**, the catalogue is **era-exclusive**,
and there is **no renovation** (D-ERA11). Teardown only, for a cost, no refund (D-ERA12). Full
table in `../era-02-neolithic/civic-buildings.md` §0.

---

## 1. The era's resource: gems

> **RENAMED 2026-07-29 from `florins` to `gems`, by the team lead's recognisability ruling** —
> *every material must be immediately recognisable to the vast majority of users*. A florin is a specimen of `coins`, which era five now holds — the lead's own example of the failure. Gems are the other portable wealth nobody needs taught, and they keep Renaissance banking reading as wealth rather than as a second coinage.
> Seven of the ten ids changed in the same pass; the full before/after table and the reasoning
> are at `../../2026-07-29-era-resource-model-design.md` §4.1a, and the code landed in `#233`.

**Era six's material is `gems`.** Banking is the Renaissance's own economic signature, and this
resource is distinguished from era four's **silver** and era five's **coins** by being **portable
concentrated wealth** — a thing you hold that is worth a great deal — rather than a coinage.

> **The pre-rename distinction was about CREDIT and it did not survive the rename, so it is
> recorded rather than quietly reworded.** This section argued that a florin was *"credit that
> circulates — bills of exchange, ledgers across cities"*, set against era five's guild marks as
> *"credit inside a single guild"*. That was a fine distinction between two coinages and it is not
> available to `gems`, which are not credit at all. **The reason for keeping the rename anyway is
> the one the ruling gives:** a florin fails recognisability, and eras four through six reading as
> "money" three times over was itself the problem this section was trying to argue its way out of.
> Silver, coins and gems are three visibly different things, which does the same work without the
> argument.

---

## 2. The catalogue: four types

§7's anchors at **×32**. Illustrative anchors, not shipping numbers. Footprints in grid cells.

| Building | Footprint | Provides | Cost | Wins on | Loses on |
| --- | --- | --- | --- | --- | --- |
| **The Covered Market** | 2×2 | food for ~640 | 2,080 gems | **resource efficiency** — the cheapest row in the era by a wide margin | it is a shed with good manners — least characterful of the four |
| **The Merchant Houses** | 2×2 | 640 livability + 160 happiness | 3,200 gems | **the cortile** — a private square for the people who live there | **resource efficiency** — the era's height and finish premium, at 1.54× the Market |
| **The Town Square** | 3×2 | 640 happiness | 3,680 gems | it is the era's signature and the best-looking thing in the city | **land efficiency badly** — 6 cells of mostly open paving — **and cost: it is the dearest of the four**, the only era in the run where the amenity is |
| **The Painters' School** | 1×2 | 320 livability + 320 happiness | 3,360 gems | **the blend, in a shape that tucks along an edge** | **resource efficiency** — dearer per unit than the Market or the Houses, though no longer the dearest row here |

**How they trade (D-ERA24).** The Town Square is the trap: it is the most desirable building in
the catalogue and it must **lose** on land and cost, or it becomes the only right answer. **Since
2026-07-30 it does lose on both**, at 3,680 against the blend's 3,360 — era six is the one era whose
amenity is the dearest of its four, and this paragraph is why. The
Painters' School is the blend, and note its shape differs from earlier eras' 1×1 plot-savers —
at 1×2 it fits along a frontage rather than into a gap, which is a different kind of land win
and worth having in the set.

**The Merchant Houses' 160 happiness is new as of 2026-07-29, and it is the cortile.** Under the
pooled livability ruling (`../era-01-prehistoric/civic-buildings.md` §2) they housed the same 640
on the same 2×2 as the Covered Market's food, for 320 gems more — the same contribution at a
higher price, so they were weakly dominated and nobody would have built one. What they have that
the Market does not is the **internal courtyard**, which the art description already carried and
the numbers did not: a private square for the people who live there, worth a quarter of the Town
Square's public one. That is the smallest change that gives the building a reason to exist, and it
does not touch its plot — era six's four shapes (2×2, 2×2, 3×2, 1×2) are part of how this
catalogue reads.

**Resource efficiency is now the sharp axis.** Five expansions in, ground is no longer the
binding constraint, so a 3×2 amenity costs the player *money* rather than *options*. The catalogue
should be tuned with that in mind — it is the shift D-ERA24 anticipates when it says which
building is better *"changes era by era as land expands."*

> ## ⚑ RE-PRICED 2026-07-30 — the ONE era whose amenity is the dearest of its four, which is what §2 asked for
>
> **THE RULING (team lead, 2026-07-30, verbatim):** *"the buildings shouldn't all have the same
> price ratios and be priced the exact same relative to each other across eras. Doesn't need to be
> drastic; just some kind of variance would be nice."* Era six's `2,560 / 2,880 / 3,200 / 3,840` was
> `1 : 1.125 : 1.25 : 1.5`, the same ratio vector as eras five and nine, and the blend was the dearest
> row in all ten eras.
>
> **This era is the one that had already written down why it should not be.** The paragraph above says
> the Town Square *"must **lose** on land and cost, or it becomes the only right answer"* — and at
> 3,200 against the Painters' School's 3,840 it was **not** the dearest row, so the instruction was
> half-unmet in its own file. `2,080 / 3,200 / 3,680 / 3,360` closes it: the Square is now the dearest
> building in era six and the era's signature costs what a signature should. The Covered Market — *"a
> shed with good manners"* — drops to 2,080 and becomes the cheapest row by a clear margin, which is
> the other half of a catalogue whose sharp axis is money rather than ground.
>
> **The blend is still dearer per unit than the food or dwelling rows** and its `Loses on` cell keeps
> saying so; what it has stopped being is the dearest row in the era. **This is not a D-ERA24
> failure**: `test/eraCivicCatalogueDominance.test.ts` clears all six pairs, because the Square wins
> happiness while the School wins footprint, cost and livability against it.
>
> **What did NOT move.** The four plots — the 2×2 / 2×2 / 3×2 / 1×2 set §2 calls *"part of how this
> catalogue reads"* — both contributions on all four rows, and era six's **solvency**: the optimal
> city still costs 17,280 gems against a mintable 19,200, because the ladder fixes what a city costs
> and this ruling only changes which of the four you pay it to.
>
> **Two notes below cite a cost and both remain true of the pass they were written for**: the Merchant
> Houses' rename ends *"2×2, 640 livability + 160 happiness, 2,880 gems"* and the hospital-swap note
> records era six keeping *"1×2, 320 + 320, 3,840 gems"*. The plots and contributions still hold; the
> two costs are now 3,200 and 3,360.

> ## ⚑ AMENDED 2026-07-29 — heights are stated as an ORDER, not as world-unit figures
>
> Each of the four below carried a `Height ~N units` figure while `style-guide.md` §3 states
> height as a ranking and says **twice** that the guide *"deliberately gives no world-unit
> targets"* — so the era's two files disagreed about what a height even is. **The ranking wins on
> a mechanical ground rather than an editorial one:** every stage is contain-fit to its plot by
> one uniform scale, so the same model stands at two different heights on two different plots and
> a figure is not something a modeller can aim at. Proportion is the only lever they hold, and
> **the more slender of two neighbours is simply the taller one** (`../README.md`, "Constraints
> every guide inherits"; `../era-01-prehistoric/style-guide.md` §0). **Nothing is lost, because
> the order is what the figures were encoding** — The Merchant Houses, then The Painters' School,
> then The Covered Market, then The Town Square — and that order is now stated directly. The one
> real number is the 24-unit ceiling (`MAX_BUILD_HEIGHT`), a cap rather than a target, and
> nothing in this era approaches it; §3's own note that the campanile leads the domed hall and the
> council hall *"only just"* is the era's tight ranking and is unaffected. Flagged independently
> by the era two, five and six image-generation briefs, so this is a folder-wide split between
> the two file types rather than an era-six slip.

> ## ⚑ 2026-08-03 — NORTHERN EARLY MODERN MATERIALS
>
> **`style-guide.md` §2 now fixes one Northern material system:** warm buff lime plaster
> `#C7A48E` is the dominant body, hand-made muted red-brown brick `#B1775A` is localized,
> pale dressed stone `#D8CDB3` frames openings and corners, and dark slate/sheet lead
> `#596675` owns every roof. Three of these four buildings name a material beyond stucco, so
> each is resolved here rather than left to drift.
>
> - **Brick — The Covered Market and The Painters' School.** Brick is a clean localized
>   secondary material on a gable edge, base, chimney or selected façade bay. It never takes
>   over the broad wall field, never becomes terracotta roofing, and never adopts Era 7's
>   dark soot finish. Individual courses may be implied rather than modelled.
> - **Rusticated stone — the skill roster's Cannon Tower** (`style-guide.md`, not this file) and
>   **dressed stone — The Town Square's two façade blocks.** Bases, quoins, lintels and sills use
>   the pale trim; the broad wall within that frame remains warm buff plaster.
> - **Marble stays white-grey** on the Town Square's one large fountain or monument.
> - **Terracotta roundels remain historically permitted but are not modelled.** The newer
>   production budget removes them from the canonical Painters' School along with all repeated
>   façade ornament.

### The Covered Market *(2×2, food)*

One high-roof hall with a single lead roof prism, two stepped end gables, 4–6 large open bays and
2–3 plain stall blocks. The bays are broad voids rather than a repeated arcade, and the stalls
carry no individual goods. Well-mannered and quiet — the era's character is spent on the Town
Square.

*Materials:* one broad warm-buff plaster field, localized muted brick at selected gable edges,
pale dressed-stone piers and a **dark slate/lead roof**. No dominant brick façade or exposed
truss detail.
**Height: third of the four**, above only The Town Square — a shallow-pitched roof over a single
storey.

### The Merchant Houses *(2×2, livability)*

**Exactly three connected narrow house masses and no fourth.** Each has one distinct simple
gable, one dark lead roof, 2–3 large windows and one broad ground shop opening. The three gables
are large profiles — stepped, shallow-curved and clipped-triangular — rather than decorated
façades.

**The private shared rear court remains the authored reason for the 160 happiness**, but it is
abstracted inside the 2×2 footprint rather than added as a fourth visible mass or a prop-filled
cortile. The art simplification does not change the contribution.

*Materials:* smooth warm-buff stucco, pale dressed-stone bases and window trim, restrained
brick chimneys and **three dark slate/lead roof prisms**.
**Height: the tallest of the four** — the three narrow masses get their height from storeys rather
than from a cupola or tower.

> **RENAMED 2026-07-29 from *The Grand Apartments*, which fitted the Renaissance no better than
> era four's *Apartment Block* fitted the Classical era.** *Apartments* is a modern letting word
> and *grand* is an adjective doing no era work, so the name told a learner neither what the
> building is beyond "flats" nor which century they are standing in. **The period's own word is
> *palazzo*, and `../README.md` records this era as the one the naming rule cost the most
> precisely because five of its seven subtitles were Italian** — so the Italian was not available
> and a gloss for it is what the rule forbids.
>
> *Merchant houses* is the institution: the Renaissance's characteristic town house was built by
> the merchant and banking families the era is about, and a courtyard behind a carriage arch is
> what those houses were. **It also dates the building without a costume word** — merchants place
> it as firmly as *palazzo* would, in English a learner already owns — and it keeps the folder's
> dwelling convention (Village Houses, Walled Houses, High Houses, Workers' Houses). **The cortile
> is untouched and still load-bearing**, because it is the 160 happiness. **No number moved:**
> 2×2, 640 livability + 160 happiness, 2,880 gems.

### The Town Square *(3×2, happiness)*

Mostly open: one simple square bounded by **exactly two** tall simplified gabled façade blocks,
with one oversized fountain or geometric monument at the centre. There is no third façade,
arcade, statue, stall, lamp, bench row or background city. The era's set piece is the open plan
and the single central vertical.

*Materials:* a few very large cool stone paving planes, a white-grey fountain, warm-buff
façades with pale dressed-stone trim and dark slate/lead roof prisms. **Height: the lowest of the four as a civic place** — its two edge
blocks frame rather than fill the plot, whose character remains the open paving.

### The Painters' School *(1×2, blend)*

One compact guild/studio block with one stepped gable, 3–5 very large north windows and at most
two flush rooflights. One oversized easel with a blank canvas is the only function prop. There is
no arcade, courtyard, roundel row, apprentice crowd, drying-canvas pile or bench clutter.
**Training and delight in the same building** remain the civic argument; the large studio
apertures carry it.

*Materials:* one broad warm-buff plaster field, localized muted brick, a pale dressed-stone
base and a **dark slate/lead roof**. No dominant brick field or terracotta ornament. **Height:
second of the four**, below The Merchant Houses and above The Covered Market — two storeys, with
the studio floor carrying the extra height.

> ## ⚑ THE ROUNDELS ARE ALLOWED — ruled 2026-07-30, and the OTHER file moved
>
> **The conflict, which was real:** `style-guide.md` §4 excluded *"fine relief panels"* because
> they do not read at zoom-out, and this entry specifies **roundels in the spandrels** with
> **terracotta roundels** in its materials line. Both survived the same day's pass because neither
> reader noticed they conflict, and
> `../../../../../output/imagegen/era-06-early-modern-building-briefs/README.md` reported it for a
> ruling rather than resolving it.
>
> **The historical team-lead ruling allowed the roundels and narrowed the ornament rule rather than
> excepted.** The ban's reason is legibility; a roundel is a large medallion rather than a fine
> panel, so it reads at the distance the camera holds. §4 now excludes *fine relief, small-scale
> carved detail* in those terms, which puts a roundel outside the exclusion by definition instead
> of by exemption — **an exception invites the next one and a precise rule does not.**
>
> **The 2026-08-02 production budget makes a separate complexity decision.** Roundels remain
> historically allowed, but the canonical model omits them. The building's plot, contribution,
> cost and height ranking remain untouched.

> **THIS SLOT HELD *The Hospital* UNTIL 2026-07-29, WHEN THE HOSPITAL MOVED TO THE INFORMATION
> AGE.** The lead's instruction was that era nine should have it and that era six should get
> something artsier, with a painter's school named as the suggestion. **It is a clean swap and
> deliberately nothing more:** era six's blend and era nine's were **both 1×2**, so the two
> buildings could exchange identities without either footprint, contribution or cost moving. Era
> six keeps 1×2, 320 livability + 320 happiness, 3,840 gems; era nine keeps 1×2, 2,560 + 2,560,
> 30,720 silicon. **No number moved on either side, in either direction.**
>
> **Why the swap is right rather than merely permitted.** A hospital in the Renaissance was a
> genuine institution and it is the *only* medical building in a ten-era run, so it belonged in the
> era a learner would expect one — and era nine's slot was *The Clinic*, which is the same
> institution one size smaller, so the run was spending two of its forty names on one idea. Moving
> the hospital to nine both places it and frees era six.
>
> **And the painter's school is the Renaissance's own answer to what a blend is for.** Every blend
> row in the run is a small public service with something loved attached — the well, the fountain,
> the chapel, the library — and the workshop where a master trained apprentices in public is
> exactly that in this era: it feeds and houses the people in it (the livability half) and the city
> is proud of it (the happiness half). **It does not collide with this era's `workshop` dressing,
> *the Drawing Office***, which is a surveyor's room rather than a school, and the two separate on
> plan: one is a private upper room, this is an open arcade you can see into.

---

## 3. Solvency, decay, and the rules

**§8.1's solvency guarantee** holds unchanged.

**D-ERA23 legacy decay** — era one's civic buildings are five eras behind and, on any plausible
curve, now decorative. **The curve is open (O-5, Gabriel).**

**All copy and art rules** are enumerated in `../era-01-prehistoric/civic-buildings.md` §6 and
inherited in full. Two bite hardest here: **mastery gold `#FFB703` stays reserved**, which a
Renaissance palette will want to reach for, and **`../../City_Art_Bible.md` §3's** one-shape-plus-
one-accent rule at full zoom-out — the dome reads, the pilaster order does not.

---

## 4. CLOSED

**Nothing here is open as of 2026-07-29.** Full statements in
`../era-01-prehistoric/civic-buildings.md` §7.

| What | Resolution | Decided |
| --- | --- | --- |
| ~~**The capacity model** contradiction~~ | Two capacities, **livability** and **happiness**; **housing and food are INPUTS to livability**, aggregated as **one pool** — `livability = Σ` every contribution. Ruled `min(Σ housing, Σ food)` in #227 and re-ruled by the team lead the same day. This era was one of the seven the pool broke — identical footprint and magnitude, with the Covered Market the cheaper of the pair — and the fix is in §2: the Merchant Houses now carry **160 happiness** for the cortile | **Gabriel + Gabe, 2026-07-29 (#227, re-ruled in #236)** |
| ~~**O-6** the conversion rate~~ | **Half the purchasing power survives:** `floor(amount × 0.5 / 2)` | **Gabe, 2026-07-29 (#227)** |
| **O-4** teardown pricing | **25% of the CURRENT era's build cost for that type, no refund** | **Gabe, 2026-07-29** |
| **O-5** the legacy-decay curve | **`0.9 ^ (eras behind)`, floored at 0.5** | **Gabe, 2026-07-29** |
| Whether this era should carry **more** than four types | **No: four, like every era. And the premise is stale twice over.** It reads *"given it only adds two skill buildings"* — this era adds **six**, since the rebalance moved `POL.6`, `POL.7` and `RAT.5` here on top of `CG.1` joining earlier, so it is no longer the thin era the question was asked about. The general answer is in `../era-01-prehistoric/civic-buildings.md` §3: four is the smallest catalogue that carries D-ERA24's three axes without a dominated member, and a fifth type in one era only would make that era's catalogue the odd one out for the whole run | **Evan, 2026-07-29** |

---

## Related

- `style-guide.md` — the **six** skill buildings this era adds. *(It re-dresses none, per the
  2026-07-29 ruling; and the count was corrected 3 → 6 by the rebalance.)*
- `../era-01-prehistoric/civic-buildings.md` — the authored template, the full rules list, and
  the two flagged contradictions.
- `../../2026-07-27-era-progression-design.md` — §6.4, §7, §8, §12.
