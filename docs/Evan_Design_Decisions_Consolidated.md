# Evan — one list: what was decided, what changed in your documents, what is still yours

**Written by Gabe, 2026-07-29.** This replaces the asks that had accumulated across four or five
PR comments and issues. It is **a change summary, not a to-do list** — the team lead's ruling of
2026-07-29 was *"we can invent them. we just need to solve all the open questions on every era so
that we can actually develop"*, so the open questions in your ten era folders are answered rather
than handed back. **Ordered by consequence.** Everything is yours to accept, replace or overrule.

---

## 0. The rulings that produced all of this

Four from the team lead and one from the owner, all 2026-07-29, all recorded verbatim in
`docs/Content_Authoring_Split.md` §10 with the decider named.

| # | Ruling | Recorded in |
|---|---|---|
| **O** | *"island_lesson_themes_design_spec is just completely legacy … there is no such thing as multiple islands now — it's all one island and it changes based on the era."* | Banner at the head of that file |
| **1** | *"it's the same concept as before, just with the theme of the era and its building. see docs/superpowers: there's folders for each era. let's do a pass over each of these and make sure theyre up to standard."* — **the era folders carry lesson framing** | Split doc §10.1; both authoring skills repointed |
| **2** | **One named advisor per era. Ten of them.** | Split doc §10.2; all ten now named |
| **3** | *"if it's in medeival, it gets medieval themeing."* — **theming follows the era, not the domain** | Split doc §10.3 |
| **4** | ~~**The two jointly held eras are un-split, one owner each** — Gabe takes Atomic, Anthony takes the Renaissance~~ · **MOOT 2026-07-31: Anthony owns all the content, so every era is his and there is nothing to un-split** | Split doc §10.4, superseded by **§11** |

---

## 1. Two documents are marked LEGACY, and one of them is the bigger loss

**`docs/superpowers/specs/Island_Lesson_Themes_Design_Spec.md`** and
**`docs/superpowers/specs/2026-07-26-d2-boomtown-square-island-design.md`** now carry banners at
the top saying they are superseded and authoritative for nothing. **Neither body is edited or
deleted** — the banners explain what replaced them and what survives.

**This is the one place I touched a design document to record a ruling rather than to answer an
open question**, and you should know it from me rather than from a diff.

**Why the themes spec could not be salvaged**, since "drop the island wrapper and keep the rows"
is the obvious repair and it does not work. The century is inside the framings, not around them:
its Polynomials row is an Age-of-Sail shipyard with a launch-day signal rocket and its domain sits
in the **Classical** era; its Exponents row has a telegraph office and a railhouse and sits in the
**Neolithic**; its Linear Equations row has a gas-ppm sensor and sits in the **Bronze Age**. And
several of its buildings — the Reducing Bench, the Blending Vat, the Proving Cauldron — are
exactly the rebuses **D-ERA8** records as tried and rejected. It was a per-domain document and a
domain can now sit in three eras.

**What the D2 brief's banner also moots:** its §0 and §7 carry 2026-07-28 corrections about a gold
gild on mastery. Those corrections are accurate and their cited files still say so at this tip, so
there was nothing to fix — the banner just means nobody has to keep re-checking a legacy document.

---

## 2. All ten era folders: open questions closed

Full per-era detail is in **`docs/superpowers/specs/eras/README.md`**, under *"What was closed, per
era"*. The short version:

**Every folder gained three sections it owed** — per-node **lesson framings**, a named
**advisor**, and a ratified **subtitle row**. Depth is deliberately uneven: **eras one, two, five
and most of nine have authored lesson content**, so their framings are *recorded from the shipped
packs* rather than invented. Writing a new framing for a lesson that already exists would
invalidate it.

**The ten advisors:** Oru (yours, and the only one that ships), Ket, Nabu, Kallias, Maud,
Vittoria, Ada Merrick, Dr Ines Calder, Yusuf Rahman, Wren. Each carries the era's own tally
descendant as an instrument, so Oru's notched staff chains all the way to Wren's animated readout.
All ten keep your four poses and none adds a celebration pose.

> **⚑ WITHDRAWN, and then settled by you. Read this paragraph as history.** It continued: *"Ket
> is written as Oru's successor from the same settlement, so the first advance reads as a handover
> if you ever stage one."* **`D-ET9` dissolved both the succession and the handover** — there is
> one continuous advisor for the whole run, re-themed per era, not ten — and you confirmed it on
> 2026-07-31 (*"oru redressed"*). So the nine names above are **costumes, not people**: era two's
> advisor is **Oru, re-dressed as a grain keeper**, `Ket` is retired, and the era-two art file's
> `Maka` is that costume's working title. The code says so too — `ERA_ADVISORS` names Oru in all
> ten eras and only the register after the comma moves.

**Four things are left open, and every one is the same two kinds of question:** how something
*looks* at a particular zoom (era one's `hall`/`tower` pair, era six's two yards, and emissive
surface under a single key light in eras nine and ten), or a product-scope decision about an
unbuilt game mode (**O-14**, whether the calculus-attack endgame is era ten's trial). **Nothing is
open because nobody got to it.** The emissive-light question is the single most valuable hour
anyone could spend on this folder.

---

## 3. Three node rosters were wrong, and two nodes' dressings were orphaned

**PR #210 (`c668d90`, 2026-07-28) moved `POL.6`, `POL.7` and `RAT.5` into the Renaissance** on the
rule that no graph-reading lesson precedes the coordinate plane. Three guides and the folder
README had not caught up.

| Was | Now | Consequence |
|---|---|---|
| Classical listed **7** nodes | **5** | `POL.6`'s townhouse block and `POL.7`'s odeon were dressed for an era their nodes had left |
| Medieval listed **6** | **5** | `RAT.5`'s mill yard, same problem |
| Renaissance listed **3** | **6** | The three arriving nodes had **no dressing anywhere** |

**The Renaissance was the worst folder in the set and it is worth saying why:** era four
*over*-listed, so its extra dressings existed and could be moved, but era six *under*-listed, so
an author landing on the era with the most new material to design would have found half of it
missing. It now carries Renaissance dressings for all three — a printer's terrace, a lecture
theatre and a cistern court — each keeping the distinguishing feature the retired version was
designed around. Cumulative "buildings dressed" is corrected for eras four and five; the total is
unchanged, which is the check (26 + 6 = 32).

**A smaller thing, since it was raised twice:** eras four and six both list an open item asking
era one to correct its hall-chain prediction. **That fix landed on 2026-07-28** — era one now
reads *rotunda, tholos, domed rotunda, concourse*. Both items are stale and are annotated as such
rather than removed.

---

## 4. `RAT.5` is authored against the wrong era, and it is content rather than art

Under ruling 3, a node takes its **era's** theming. `RAT.5`'s lesson exists —
`content/lessons/d5/RAT.5.json` — and is framed **Medieval**, because it was authored while the
node still sat there and while split-domain theming was an open question that
`Content_Authoring_Split.md` §9.6 and both skills told its author to leave alone.

**It owes a Renaissance re-theme.** It is **Anthony's content and stays his** — authored work does
not change hands, and §10.4 does not reach it. Expected cost is prose only: `hashItemDefinition`
reads `node_id`, `prompt` and `answer`, so a lesson-prose re-theme moves no item-bank snapshot.
Era six's framings section is what it should be re-themed *to*, and both authoring skills now
record it as a known owner-assigned item so a QA pass does not keep re-filing it.

**This is the only place in the whole pass where a roster correction reaches shipped content.**

---

## 5. The capacity model is ruled, and all ten catalogues are unblocked

**Gabriel, 2026-07-29, verbatim: *"the updated mapping is livability (Housing and food) and
happiness"*.** Two capacities — **livability** and **happiness**; **housing and food are inputs to
livability**, not capacities in their own right. Every `civic-buildings.md` named this as blocking
its pricing; **all ten rows are now closed** and **no figure moved**, because every catalogue was
already written for this reading.

**Three edits it owes the era progression spec, which is your document and which I did not
touch:** amend **D-ERA13** in place (following D-ERA6's own precedent rather than minting a new
id), extend **§7** to rule out a separate *food* capacity as well as a separate housing one, and
correct the **§16** restatement. There is a knock-on in D-ERA13's header — *"two capacities, and
two derived readouts"* no longer closes now that happiness is a capacity — and §7 already has the
vocabulary to fix it: coverage is the capacity, the happiness level is the derived readout.
Recommended: add **O-16** to §17's table and mark it resolved in the same edit, the way O-1 and
O-3 are kept as struck-through rows so the id is never reused.

**The residual is ruled too, and unlike the rest of this section it reached your numbers.**
*Inputs to livability* admitted an additive aggregation or two terms with the lower binding, and the
team lead ruled **additive: one pool, housing and food never tracked separately** — because
separate tracking has no middle ground, and would make every building in every catalogue declare
which of the two it feeds.

That is what breaks seven of the ten against D-ERA24, and **the fix belonged in the pricing rather
than the formula**: a building that is worse on every axis with no compensating property is not a
formula's fault. Six catalogues took the smallest change that gives the dominated building a reason
to exist, and in five of the six the reason was already in your own art description:

- **Eras 1, 2, 3 and 6** — the Family Lodge, the Village Houses, the Walled Houses and the Merchant
  Houses gain a happiness secondary (the hall's fire, the shared doorway court, the enclosed
  court, the cortile) at a quarter of the era's magnitude, so every blend row stays ahead of them.
- **Era 4** — the High Houses drop to **1×2**. Their own `Wins on` cell claimed land efficiency
  "by going UP", and at 2×2 against the Harbour Granary's 2×2 that claim was false; era eight and
  nine put their towers on 1×1, so era four is where the curve starts.
- **Era 7** — the Cold Store drops to **3,840 coal**, and takes the "cheapest livability in the run
  so far" superlative off the Workers' Houses, which were cheaper *and* smaller than it for the same
  magnitude.
- **Eras 5, 8 and 9 needed nothing**, because their sprawling food building was already cheaper
  than their compact dwelling — which is exactly the trade the other seven were missing.

> **⚑ ERA TEN'S DWELLING HAS SINCE BEEN RENAMED *The Capsule Homes* → *The Pod Apartments*, and its
> blend row *The Reservoir* → *The Nightclub*.** Both are the team lead's, in the consolidated rename
> pass. **No number moved with either**, and the shipped ids did not change
> (`cyberpunk_capsule_homes`, `cyberpunk_station`), so **every argument on this page stands exactly as
> written** — the two-axis separation, the 35,840, the 2,560 happiness, and your *"separated by cost
> and mix"* criterion. The old names are kept below because this page is a record of what was decided
> and when.

**Era ten needed two numbers, and YOUR RULING IS WHAT IT NOW SATISFIES.** Under one pool its
Vertical Farm and Capsule Homes were both 1×1 for 10,240 with the Farm 5,120 cheaper, so the Farm
dominated outright. I flagged it as unfixable by price alone and the team lead ruled
*"differentiate these"*, so it took a second axis:

- **The Vertical Farm carries 2,560 happiness** — a quarter of the era's magnitude, like the four
  dwellings above. Fresh food is a luxury in a neon city, and it is the one row in that catalogue
  the secondary is *not* contradictory on, which is why it moved off the capsules.
- **The Capsule Homes drop to 35,840 data**, era seven's dwelling coefficient and the cheapest in
  the run. Capsule housing is volume bought by accepting less, so pricing it above the food tower
  was the real defect; at 3.5 data per person era seven's Cold Store keeps its superlative at 3.0.

**Your #235 answer is honoured rather than overridden, and this is the part worth reading.** You
ruled both towers stay because *"separated by cost **and mix**"* satisfies D-ERA24. That criterion
was never wrong — **its second term had been deleted out from under it** by the livability
consolidation, which made a food row and a dwelling row the same contribution. The Farm's happiness
restores mix, the price cut restores cost, and the pair is separated on two axes exactly as you
said it should be. Nothing about this needs to go back to you.

**D-ERA24 is now a test, not a sentence:** `test/eraCivicCatalogueDominance.test.ts` reads all ten
of your tables, fails naming the pair, and **carries no exceptions list at all** now that era ten is
differentiated. **Your judgement columns stay yours** — `Wins on`, `Loses on` and era one's three
efficiency ratings were authored under the two-term reading, and I edited only the cells a number of
mine made false. In era ten that is two cells: the Capsule Homes no longer *lose* on resource
efficiency (they now win it), and the Vertical Farm's win names the fresh-food premium beside its
one cell.

---

## 6. One code change outstanding, and it is mechanical

**Nine subtitle rows are ratified in their guides and only era one's is wired** into
`apps/web/src/city/eraDressing.ts`. Transcribing them is mechanical. Until it happens each era
degrades to the stable name alone, which is the designed behaviour rather than a bug.

**That row is settled.** It read: *"One row to look at first: era eight's hub subtitle is the Civic
Centre against a stable name of Civic Center, so it announces as 'Civic Center, the Civic Centre'.
Deliberate, arguably the best joke in the set and arguably the worst; the alternative on offer is
the Municipal Offices."* **Ruled 2026-07-29: it is *the Heating Plant***, which is §5's own label for
that landmark and carries the sheltered-communal-fire through-line. The stable name stays *Civic
Center* (D-TH7); *the Municipal Offices* was dropped as the weaker option.

---

## 7. Smaller, and none of it blocking

- **The era spec's §6.1 still names the retired D1 building names in the present tense** — City
  Bank, Public Library, Rowhouse Flats and the rest, as D-ERA8's worked example. The shipped set
  is Assembly Hall, Store, Dwellings, Workshop, Commons, Tower. §6.2a already records that the
  rename landed, so §6.1 is internally stale rather than wrong about the design. Era one's §9 says
  "the shipped names **were**", which is correct as history.
- **The persona register is gone and nothing needs doing.** A brief I was working from said the
  authoring reference held three domain-keyed advisor names, one of them `D10`, whose meaning
  changes at the renumber. It was deleted on 2026-07-28 and I confirmed it is absent. The three
  legacy names survive only in the now-legacy themes spec and the D2 brief, reach no lesson
  string, and fill none of the ten era advisor slots.
- **`docs/README.md` does not index `docs/superpowers/specs/` and should keep not indexing it** —
  see `docs/Design_Doc_Status_Inventory.md` for the reasoning and for the pointer that was added
  instead.

---

## 8. What is still yours, and unchanged

Everything about the world: materials, palettes, silhouettes, the island, the art bible, the
visual brief. The advisor **voice** for every era (`Content_Authoring_Split.md` §1.1). The nine
proposed palettes. Every name in this pass is a name with a rationale attached, not a decision you
are held to — and the only ones expensive to unpick are framings an author has already written a
lesson against, which is why the eras with unauthored content were done first.
