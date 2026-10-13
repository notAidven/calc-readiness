# D2 / Boomtown Square — RAD.1–RAD.4 Building Concepts — **DECIDED (HISTORICAL RECORD)**

> # STOP. THIS DOC IS NOT THE DESIGN. IT IS THE RECORD OF A DECISION.
>
> **The current D2 building design lives in one place only:**
> [`2026-07-26-d2-boomtown-square-island-design.md`](./2026-07-26-d2-boomtown-square-island-design.md).
> If anything here disagrees with that spec, **the spec is right and this page is
> stale** — do not model, wire, or author from anything below.
>
> **Of the twelve concepts on this page, four were chosen. The other eight were NOT
> chosen and are no part of any current or planned design.** They are kept only so
> the reasoning behind the four survives. Every unchosen option is marked
> **NOT CHOSEN** in capitals at its heading.
>
> **The chosen four — the only D2 radicals buildings there are:**
>
> | Node | Chosen | Register |
> | --- | --- | --- |
> | **RAD.1** | **Option A — the Kiln Yard** | industrial |
> | **RAD.2** | **Option A — the Railhouse** | transport |
> | **RAD.3** | **Option A — the Telegraph Office** | communications |
> | **RAD.4** | **Option B — the Toll Gate & Keeper's Lodge** | infrastructure |
>
> The recommended slate in §6 was taken unchanged, and the four are **specified in
> full** in the island spec (§2, §4, §5, §6, §7, §12).
>
> **The eight unchosen renders were deleted** so the render folder holds only live
> assets. Each unchosen option below keeps its full written description; where its
> render used to sit there is now a one-line note. The images are recoverable from
> this branch's first commit if anyone wants them back.
>
> **The four winning renders live at canonical paths:**
> `rad-1-kiln-yard.png`, `rad-2-railhouse.png`, `rad-3-telegraph-office.png`,
> `rad-4-toll-gate.png` (see §8).

**Status:** DECIDED. Superseded as a *proposal*; retained as the decision record.

**What this is.** Two earlier passes gave the four radicals nodes four building
**identities** that were all variations on one utilitarian frontier shed — a yard,
a works, an exchange, a post — so the set read as four of one thing. This pass
**replaced those identities outright**; they are gone from the design, and the
island spec neither contains them nor discusses them. For each of the four
in-scope nodes this doc proposed **three genuinely different building types** and
rendered each one, so the choice was a real decision about what kind of town
Boomtown Square is.

**Out of scope and untouched:** the **Boom Hotel** (EXP.1), the **Land Office /
hub**, and the **island terrain layer**. None of them are re-designed, re-massed,
or referenced as changeable here.

**Date:** 2026-07-26. **Lane:** presentation/skin only. No math, node identity,
prereq order, lesson prose, or advisor persona is touched.

---

## 0. How to read this, and how to choose

Each node gets three options, presented in the same shape:

- **The pitch** — one line.
- **Register** — which corner of a boomtown it comes from (industrial, civic,
  commercial, transport, social, utility). Deliberately spread wide.
- **The silhouette** — the one shape it owns at grid scale, in plain words.
- **The read** — how the skill comes off the building's *function*, not off a
  decoration bolted to it.
- **Fit** — footprint, and the stage story (site → construction → built).
- **The catch** — the honest downside. Every option has one.

**Pick one per node, then check §5**, which lists the only cross-option collisions
worth avoiding (two round towers, two cupolas, two civic porticoes). If you want a
fast answer rather than four decisions, §6 names a recommended slate and says why.

### At a glance

| Node | Skill, in one line | Option A | Option B | Option C |
| --- | --- | --- | --- | --- |
| **RAD.1** | Evaluate & simplify roots; pull perfect squares out | **Kiln Yard** *(industrial)* | **Market House** *(commercial/civic)* | **Tower Mill** *(landmark)* |
| **RAD.2** | Combine like radicals; clear radicals from denominators | **Railhouse** *(transport)* | **Steam Laundry & Bathhouse** *(social)* | **Waterworks** *(utility)* |
| **RAD.3** | Convert fractional-exponent ↔ radical form | **Telegraph Office** *(communications)* | **Printing House** *(press/commercial)* | **Opera House** *(social landmark)* |
| **RAD.4** | Variable radicands; `sqrt(x^2)=abs(x)`; even-root domain | **Courthouse** *(civic)* | **Toll Gate & Lodge** *(infrastructure)* | **Powder Magazine** *(hazard/earthwork)* |

**The four superseded buildings, for contrast — these no longer exist anywhere in
the design, and this page is the only place they are still described:** RAD.1
Masons' Yard (open work shed + gantry), RAD.2 Framing Works (sawtooth carpentry
hall), RAD.3 Exchange (small stone strongroom + scale arm), RAD.4 Datum Post
(obelisk + hut). All four were
**work-sheds or a monument beside a shed**, all four were roughly the same
rectangle-with-a-roof, and three of the four hung their whole identity on a bolted-on
prop (a gantry, a rack, a scale beam). **Not one of the twelve options below is a
gabled work-shed.**

---

## 1. RAD.1 — Evaluate & simplify roots (product / quotient reasoning)

**What the node teaches.** Turn an area back into a side. Pull the perfect-square
factors out of a root and leave the rest under it (`sqrt(12) = 2*sqrt(3)`), and
split a root across a product or a quotient. This is one of D2's two entry
buildings, so it should feel welcoming and foundational, not fussy.

**Why the Masons' Yard failed:** it was a roof on posts over a stone pile — the
plainest possible frontier shed, and the prop that carried the idea (a hanging
block) was a small object in a big empty apron.

---

### Option A — **The Kiln Yard**  *(industrial)*  — CHOSEN

**CHOSEN.** Now specified in full in the island spec §2.2 / §12.2.

![RAD.1, the Kiln Yard: three domed clay-tan beehive kilns in a row linked by an arched flue, a tall tapering chimney stack behind them, an open drying shelter stacked with square brick pallets, and a fourth kiln half-built inside timber scaffolding](../../../output/imagegen/d2-boomtown-square/rad-1-kiln-yard.png)

**The pitch.** The town bakes its own bricks: a row of domed kilns under one tall
stack, turning heaps of raw clay into stacks of clean square units.

**The silhouette.** Three repeated **domes** plus one tall **tapering chimney**.
Nothing else in D2 is round-topped and nothing else has a stack, so this is the
most far-legible option on the board — it reads at any zoom as "hemispheres and a
spike."

**The read.** A brick is the unit square, and the yard's whole job is turning
formless material into **whole square units plus the rubble that would not make
one**. The clean pallets sorted by size against the broken-brick heap *is*
`sqrt(12) = sqrt(4)*sqrt(3)`: the perfect squares come out and stack, the remainder
stays in the pile. The batch structure of a kiln (fire a whole square array at
once) carries the product read without a single painted symbol.

**Fit.** **2×1**, long along X — the kiln row wants a working face. Site: a marked
pad with the circular kiln footings ringed out in stone. Construction: one kiln
finished and firing while the second is a waist-high ring in scaffold — the
strongest three-stage story of any option here, because a kiln yard is *built one
kiln at a time* and the render already shows it.

**The catch.** It is the most industrial option, so if you want Boomtown Square to
feel like a *town* rather than a works, this pushes the other way. Also needs
palette care: the kilns must be clay-tan adobe, not red brick (the render is
already corrected for this).

---

### Option B — **The Market House**  *(commercial / civic)*  — NOT CHOSEN

**NOT CHOSEN — not part of the D2 design.** *Render removed.* It showed a broad
open arcaded pavilion of stout timber posts on a stone plinth under a wide
hipped shingle roof with a bell cupola, filled with a grid of square crates and
bushel measures, one bay at the end still bare framing.

**The pitch.** An open-sided market pavilion on a stone plinth, where everything the
town buys and sells is measured out in square crates and bushels.

**The silhouette.** A **wide low hipped roof floating on an open arcade**, capped by
a small bell cupola. It is the only building in D2 you can **see straight through**,
which is a silhouette trick nothing else can copy: at small size it reads as a roof
with daylight under it.

**The read.** A market is where a bulk quantity gets **broken into equal parcels** —
which is exactly quotient reasoning, and exactly the "how big is one share" question
that a root answers. The grid of square measures under the roof is the visual: area
laid out, side read off. It is also the friendliest possible entry building, which
matters because RAD.1 is a door into the island.

**Fit.** **2×1**, long along X. Site: the stone plinth laid and the post positions
marked. Construction: **plinth first, then posts, then the roof** — an open frame is
literally a scaffold that becomes the building, so the middle stage is unambiguous.

**The catch.** Its read is the gentlest of the three; "market" says *trade* before it
says *measure*, so it leans harder on the crates to carry the idea. And its cupola
collides with the Courthouse's cupola if you pick RAD.4 Option A (§5).

---

### Option C — **The Tower Mill**  *(landmark)*  — NOT CHOSEN

**NOT CHOSEN — not part of the D2 design.** *Render removed.* It showed a tall
tapering round clay-tan tower with a shingled conical cap and four timber
lattice sails, a timber gallery ringing it halfway up with an external stair,
and a low attached grain store with a second store still bare framing.

**The pitch.** A tapering round tower mill with four lattice sails — the one thing on
the island that turns, and the town's landmark on the skyline.

**The silhouette.** A **cone on a cylinder with a great X of sails across it.** The
only radial, only round-plan, only moving-looking form in D2, and it is legible at a
size where everything else is a smudge.

**The read.** Milling is **reduction to simplest form**: a load goes in whole and
comes out as its finest constituent. The sack hoist, the graded bins, and the sized
grinding stones are the sizing-from-quantity idea. It also quietly rhymes with the
island's growth spine — a mill is the first thing a settlement builds when it stops
being a camp.

**Fit.** **1×1** (compact plan, tall) or 2×1 if the grain store grows. Site: the
circular stone base course laid. Construction: the tower rises in courses with the
cap and sails going on last — a visibly climbing build, and the cap-and-sails moment
is a satisfying final stage.

**The catch.** It is **tall**, and EXP.1's Boom Hotel is supposed to own height. A
mill that out-landmarks the hotel weakens the island's centrepiece; it would need to
be authored clearly shorter. It is also the least "boomtown Main Street" of the
three — more agrarian than frontier-commercial.

---

## 2. RAD.2 — Combine radical terms; clear radicals from denominators

**What the node teaches.** Two motions: **only matching things combine** (`2*sqrt(3)
+ 5*sqrt(3) = 7*sqrt(3)`, but `sqrt(3) + sqrt(2)` stays apart), and **clear the
root out of the denominator** so what sits underneath is clean.

**Why the Framing Works failed:** a long shed with a jagged roof is a barn, and its
whole idea lived in a timber rack that vanished at grid scale.

---

### Option A — **The Railhouse**  *(transport)*  — CHOSEN

**CHOSEN.** Now specified in full in the island spec §2.3 / §12.3.

![RAD.2, the Railhouse: a semicircular six-stall engine roundhouse with arched timber doors radiating around a sunken turntable, a tall braced coaling tower behind it, a locomotive nose in one open stall, and two end stalls still bare timber framing](../../../output/imagegen/d2-boomtown-square/rad-2-railhouse.png)

**The pitch.** The railhead has arrived: a fan-shaped engine roundhouse around a
turntable, with a coaling tower over it — the single loudest signal that this town is
booming.

**The silhouette.** A **semicircular fan** with a **tall braced tower** behind it.
There is no other curved plan and no other lattice tower in D2; at small size it
reads as a half-disc with a mast, which is unmistakable.

**The read.** A yard's job is **sorting rolling stock into matched rakes**: only like
couples to like, and a mismatched car goes to a different road. That is the
like-terms rule as an operation you can watch. The turntable adds the second read
cleanly — everything must be brought to a **common orientation** before it can be
coupled, which is what finding a common radical (or a common denominator) actually
is.

**Fit.** **2×2** — a fan needs a square-ish plot, and it earns the size. Site: the
turntable pit dug and ringed in stone with the stall footings radiating out.
Construction: **stalls complete one at a time around the fan** while the rest stand
as bare arches, which is exactly how roundhouses were really built and gives the best
mid-stage image in this whole document.

**The catch.** It brings a **railroad** into the island's story, which the current
terrain does not have. Contained on its own lot with stub track it is fine, but it
implies a rail motif the terrain pass may eventually want to answer. It is also the
biggest footprint proposed here.

---

### Option B — **The Steam Laundry & Bathhouse**  *(social)*  — NOT CHOSEN

**NOT CHOSEN — not part of the D2 design.** *Render removed.* It showed a long
clay-tan block with a bank of five copper wash coppers steaming under a lean-to,
a tall slender chimney, a domed bathhouse wing, and a fenced drying green of
stepped racks hung with matched bundles of linen.

**The pitch.** A bank of steaming coppers under a tall chimney, fronted by a drying
green where every line carries only linen that matches.

**The silhouette.** A **long low block with one tall thin stack**, fronted by a
**field of stepped horizontal lines** — a texture no other building has. The domed
bath wing gives the far end a bump so the block is not a bar.

**The read.** Both halves of the skill land here, and they land on *function*.
**Sorting:** the drying green is authored so each line holds only matching pieces and
the ranks step down line by line — the like-terms rule, legible before anyone reads a
word. **Clearing:** washing is the everyday act of **getting the grit out so what is
underneath is clean**, which is what rationalizing a denominator is for.

**Fit.** **2×1**, long along X (the green needs frontage). Site: the copper
foundations and the fenced green pegged out. Construction: the chimney goes up first
and stands alone over a half-walled block — a good, readable middle stage.

**The catch.** It is the least glamorous of the three and reads slightly domestic
next to a hotel and a courthouse. The drying green is also the one piece of this
design that could get fiddly at low poly; the racks must be chunky or they will
disappear.

---

### Option C — **The Waterworks**  *(utility)*  — NOT CHOSEN

**NOT CHOSEN — not part of the D2 design.** *Render removed.* It showed a tall
riveted standpipe cylinder on a battered stone base with an external spiral
stair, a small pump house with a beam engine and thin chimney, and three stepped
circular stone filter beds sunk in the ground, a fourth just begun.

**The pitch.** A standpipe on a battered stone base with a spiral stair up it, over
three stepped filter beds sunk into the clay.

**The silhouette.** A **tall cylinder with a helix wrapped round it**, standing over
**concentric rings in the ground**. The stair reads as a spiral even when tiny, and
the sunken rings give the lot a second silhouette below the ground line — a trick
only this option uses.

**The read.** **Clearing radicals from the denominator is filtration**: you pass the
mess through successive beds until what comes out the far side is clean, and what the
town stands on is a clean supply. The stepped beds, each smaller than the last, are
the stages of that clearing made into objects. The like-terms half is weaker here and
would ride on the graded settling beds sorting by grain size.

**Fit.** **1×1** (tall, compact) or 2×1 with the beds. Site: the beds dug and ringed.
Construction: the stone base and the beds first, the iron cylinder hooped up in
courses after — a genuinely different build story from every other option.

**The catch.** Two problems. The island brief says **no open water anywhere**, so the
beds must read dry and this building must be about *supply*, not a pond. And the
riveted iron cylinder is a **large non-clay surface**, which needs handling as a dark
neutral so it does not become a second body colour. Also: only one of the node's two
ideas reads strongly.

---

## 3. RAD.3 — Convert between fractional-exponent and radical form

**What the node teaches.** `x^(1/2)` and `sqrt(x)` are the **same value in two
notations**; the index is the denominator and the power the numerator. Nothing is
gained or lost in the conversion. This node sits where the exponent half and the root
half of the island meet.

**Why the Exchange failed:** it was a small stone box whose whole personality was a
scale beam, and "bank" is the most obvious possible answer to "two forms of one
value."

---

### Option A — **The Telegraph Office**  *(communications)*  — CHOSEN

**CHOSEN.** Now specified in full in the island spec §2.4 / §12.4.

![RAD.3, the Telegraph Office: a compact two-storey clay-tan office with a shaded porch, a tall braced lattice mast on the roof carrying three crossarms of glass insulators with wires fanning to the pad edges, a two-armed semaphore on the gable, and twin notice boards by the door](../../../output/imagegen/d2-boomtown-square/rad-3-telegraph-office.png)

**The pitch.** Words go in, dots and dashes go out on the wire, and words come back at
the other end — the same message in two scripts, which is the node's whole idea.

**The silhouette.** A small block with a **tall crossarmed mast** and **wires fanning
off the lot**. The fan of wires is the key move: it gives a 1×1 building **reach**
without giving it footprint, which is exactly the problem the old Datum Post's range
poles were trying to solve, solved better.

**The read.** A telegraph office is a **conversion machine**, and it is the cleanest
non-cutesy match on this page: the operator's whole trade is encoding one
representation into another and back with nothing added or lost. The twin notice
boards by the door — the same day's traffic posted in both plain writing and in code —
say it without a symbol. The two-armed semaphore on the gable is the same thought
again: a numerator arm and a denominator arm, one reading.

**Fit.** **1×1.** Site: the pole holes dug and the wire route staked. Construction:
the mast is stepped up in braced sections above a half-built office — a distinctive
mid-stage, and it rhymes with the finished form.

**The catch.** The wires must be authored **inside the model's own ground box** or the
engine's contain-fit will shrink the whole building (spec §9.1). Thin wires also risk
disappearing at low poly, so they need to be chunky enough to survive.

---

### Option B — **The Printing House**  *(press / commercial)*  — NOT CHOSEN

**NOT CHOSEN — not part of the D2 design.** *Render removed.* It showed a
two-storey clay-tan false-front office with a glazed shopfront showing an iron
press, a long press hall behind under a raised clerestory monitor roof, a
hoarding wall pasted with two identical columns of posters, and drying racks of
printed sheets.

**The pitch.** The town's newspaper: type set backwards in metal, pulled forwards onto
paper — one text, two forms, and one of them is the mirror of the other.

**The silhouette.** A **false-front block with a long raised clerestory ridge** behind
it, plus a **flat hoarding wall** off one flank. The monitor roof is a second ridge
floating above the first, which is a distinctive stepped profile, and the hoarding
gives it a blank vertical plane nothing else has.

**The read.** Typesetting is the most physically honest conversion in a frontier town:
the forme and the printed sheet are **the same content, one reversed**, and a
compositor moves between them fluently all day. The twin poster columns on the
hoarding are the equality statement. There is a bonus read the other options do not
get: a press is also where the town's **growth gets published**, which ties this
building to the island's spine.

**Fit.** **1×2**, long along Z (the press hall runs back). Site: the footing course
and the hall's post positions. Construction: the front block finished while the hall
behind is open-ribbed — the clerestory going on last is a good final beat.

**The catch.** It is a **false-front commercial block**, which is the most
conventional Main Street shape in the set — closer to "a building you have seen in
this town already" than the telegraph or the opera house. It is also the option most
dependent on signage detail, and signage is what shrinks first.

---

### Option C — **The Opera House**  *(social landmark)*  — NOT CHOSEN

**NOT CHOSEN — not part of the D2 design.** *Render removed.* It showed a tall
clay-tan false front with a scrolled parapet and a big painted signboard over
three arched windows, a deep entrance canopy with twin playbill cases flanking
the doors, and a taller blank fly tower box rising behind the auditorium roof.

**The pitch.** The boomtown's status building: a scrolled false front and a blank fly
tower behind it — the playbill out front and the performance inside are the same thing
in two forms.

**The silhouette.** An **ornate scrolled parapet** in front of a **plain tall box**.
That front-low, back-tall step is unique in the set, and the scrolled parapet is the
only curved skyline profile on the island. It also reads *social* at a glance, which
nothing else in D2 does.

**The read.** A score and a performance are the same work written and enacted; the
twin playbill cases either side of the doors post the same night twice. Softer than
the telegraph's read, but it does something none of the others do: it tells you the
town has got **rich enough to want a theatre**, which is the growth story showing up
in the skyline rather than in a chimney.

**Fit.** **1×2**, long along Z. Site: the footing course with the fly tower's deeper
pit already dug. Construction: the fly tower stands as an open braced box while the
front is still framing — the tower-first build is legible and unusual.

**The catch.** The **weakest conceptual read** of the three; it needs the playbill
pairing to carry it. And the fly tower is another tall element competing with the
Boom Hotel.

---

## 4. RAD.4 — Variable radicands; `sqrt(x^2)=abs(x)`; even-root domain restriction

**What the node teaches.** Three things: pull the pairs out when the radicand is a
variable, `sqrt(x^2) = abs(x)` (a **magnitude, regardless of which side of zero you
came from**), and **even roots of negatives are not allowed** — a genuine forbidden
input. Note this node's items are checker-gated, so its building may land in a later
art drop.

**Why the Datum Post failed:** a shack with a monument next to it, in a town of
shacks — and the monument was the only interesting thing on the lot.

---

### Option A — **The Courthouse**  *(civic)*  — NOT CHOSEN

**NOT CHOSEN — not part of the D2 design.** *Render removed.* It showed a formal
two-storey clay-tan block with a four-column pedimented portico over broad stone
steps, shuttered windows, a hipped roof crowned by an octagonal bell cupola, a
low barred jail annex at the rear, and one wing still bare framing.

**The pitch.** A pedimented courthouse with a bell cupola and a barred annex: the
building that decides which claims the town will hear and which it throws out.

**The silhouette.** A **triangular pediment on columns**, over a broad stair, under an
**octagonal cupola**. It is the only classical frontage in D2 and the only building
with a real portico, and it reads instantly as *institution*.

**The read.** Both halves land. **The domain restriction is jurisdiction**: some
claims are simply **not admissible** — the court will not hear them at all, which is
a much more natural picture of "undefined over the reals" than a fence around a
vacant lot. **`abs(x)` is the judgment**: the court measures the **size** of a wrong,
not which direction you crossed the line from — the same magnitude either way, which
is exactly what the absolute value is for.

**Fit.** **2×1**, long along X. Site: the stone step block and the portico column
bases set out. Construction: the columns and pediment go up as a bare timber frame in
front of a half-walled block — the most dramatic mid-stage in the set.

**The catch.** It is **civic**, and the hub (the Land Office) is also civic. They must
not compete: the Land Office is a **broad false front with a bell**, so a courthouse
with a portico and a **cupola** needs the hub's bell kept as a bell-cote, not a cupola
(§5). There is also a tone question — a jail annex on a calm, non-punishing learning
product is worth a deliberate yes or no.

---

### Option B — **The Toll Gate & Keeper's Lodge**  *(infrastructure)*  — CHOSEN

**CHOSEN.** Now specified in full in the island spec §2.5 / §12.5 — which adds a
**second, nailed-shut side gate** beside the liftable bar, so the building separates
*restricted* from *not admitted at all*.

![RAD.4, the Toll Gate and Keeper's Lodge: a heavy timber gantry arch over a rutted road carrying a painted rate board and a lamp, a small clay-tan pyramid-roofed lodge with a canted bay window watching both ways, a striped counterweighted swing barrier down across the road, and a two-faced milepost](../../../output/imagegen/d2-boomtown-square/rad-4-toll-gate.png)

**The pitch.** A timber arch over the road with the bar down, and a bay-windowed lodge
that watches both directions: the town's one gate, where some traffic is turned back.

**The silhouette.** A **gantry arch with a long diagonal bar swung across a road** —
the only **horizontal-emphasis, pass-through** structure in D2, and the only building
whose lot has a road running through it. At small size it reads as a gate, which is a
shape no other option produces.

**The read.** The strongest domain read available: a gate is the physical form of
**"this input is not admitted."** Some wagons pass, some are turned back, and the rate
board on the beam lists exactly which. And `abs(x)` comes free and honestly: **the
toll is by distance, the same either way you are travelling** — the two-faced milepost
counts off in both directions from the gate, so the gate is zero and both directions
read positive. That is the `NUM.S` "distance from zero" inheritance, without an
obelisk.

**Fit.** **1×1** (the lodge) or **2×1** if the arch and road need width. Site: the
road ruts graded and the two arch post-holes dug. Construction: the posts stand and
the beam is being hoisted between them while the lodge is a half-built shell.

**The catch.** It is the **least building-like** option — half of its mass is a
structure rather than an interior — so on a grid of buildings it may read as scenery.
It also implies a road crossing its lot, which is a small ask of the placement layer
(contained on the pad, but worth confirming).

---

### Option C — **The Powder Magazine**  *(hazard / earthwork)*  — NOT CHOSEN

**NOT CHOSEN — not part of the D2 design.** *Render removed.* It showed a
barrel-vaulted stone-faced magazine buried in a large earthen berm with only its
arched door face showing, ringed by a dog-leg blast wall, a dark warning flag on
a mast, a lightning rod, roped-off ground with warning boards, and a small
sentry box.

**The pitch.** A vaulted magazine buried in an earth berm behind a dog-leg blast wall,
flag flying: the one lot in town that is fenced against you.

**The silhouette.** An **earth mound with a stone arch cut into it**, with a **thin
flag mast**. It is the only earth-covered, only buried, only *negative-space* form on
the island — it reads as a hole in the ground rather than a building, which is a
genuinely different silhouette class.

**The read.** The **loudest possible** statement of the domain restriction: some
values are not merely unused, they are **kept behind a blast wall**, and the whole
lot's design is about exclusion — the dog-leg entry, the doubled rope, the warning
boards, the flag. If the domain restriction is the part of RAD.4 you most want the
learner to feel, this is the option.

**Fit.** **1×1**, or 2×1 with the blast wall. Site: the vault's stone footing laid in
an open cut before the berm is heaped. Construction: the vault standing bare and
un-buried with the berm half-heaped over it — a striking and unmistakable mid-stage.

**The catch.** It carries **only one** of the node's three ideas. `sqrt(x^2)=abs(x)`
and the variable-radicand pair-pulling get nothing from it, and those are two-thirds
of the skill. It is also the **darkest** object in a calm, non-punishing product; the
warning boards and the "keep out" register need a deliberate sign-off. *(This is a
much better-massed version of the "Powder House" alternative the island spec already
floats in its §14 Q2, so choosing it also closes that open question.)*

---

## 5. Does the set still read as one town? Yes, and here is what holds it together

Variety across registers is the point, but four unrelated set pieces would be a worse
failure than four identical sheds. Five things hold any combination together:

1. **One body, one material story.** Every building is the **Clay `#C9A15E`** body in
   the fixed 3-tone face lighting, with **weathered dark-brown timber** and
   **desaturated grey-tan dressed stone** as the only other materials, and **no gold
   anywhere** (island spec §0 guardrail 2, §6). Pale raw lumber still means "under
   construction" and nothing else. A kiln yard, a courthouse, and an opera house built
   from the same three materials read as one settlement; that is how real boomtowns
   looked.
2. **One rule they all keep: the town is still going up.** Every option above is
   authored with **one visibly unfinished addition** off to a side — a half-built
   kiln, an unclad market bay, two bare roundhouse stalls, a framed courthouse wing.
   That single shared habit is what makes a courthouse and a laundry look like
   neighbours, and it is already in all twelve renders.
3. **A boomtown is exactly the town that grows all these at once.** The premise is a
   settlement outgrowing itself: it builds a kiln because it needs bricks, a railhouse
   because the line arrived, a courthouse because there are now disputes, an opera
   house because there is now money. **The mix is the evidence of the boom** — a town
   of four work-sheds would actually contradict the theme.
4. **They stay in one scale ladder.** The Boom Hotel keeps height, the hub keeps
   civic frontage, and every option here is authored to sit under both. The two
   options that push on height (Tower Mill, Opera House fly tower) are flagged in
   their own sections.
5. **They still occupy the same grid vocabulary** — {2×2, 2×1, 1×2, 1×1} — with long
   axes authored to match the footprint's long axis (spec §9.4). No option asks for a
   new footprint or any engine change.

### Cross-option collisions to avoid

Only three, and each had an easy fix:

| If you pick… | …and also… | The clash | Fix |
| --- | --- | --- | --- |
| RAD.1 **Market House** | RAD.4 **Courthouse** | Two bell cupolas on the skyline | Give the Market House an open lantern with **no bell**; the bell belongs to the civic building |
| RAD.1 **Tower Mill** | RAD.2 **Waterworks** | Two round towers | Pick one; if you want both, the mill's cap-and-sails must clearly dominate and the standpipe must come down in height |
| RAD.4 **Courthouse** | *(the hub, always)* | Two civic frontages | Keep the hub a **broad false front with a bell-cote**; the courthouse owns the portico and the cupola |

> **None of those three fired** — the chosen slate contains no cupola, no round tower,
> and no second civic frontage, so the hub is untouched. **The chosen four raised a
> different collision that this list did not anticipate:** the Kiln Yard's stack, the
> Railhouse's coaling tower, and the Telegraph Office's mast are **three tall thin
> things** over three low buildings. That is resolved in the island spec §2, which
> separates them on **weight, transparency, and what sits at the top** (solid / loaded
> / transparent), gives each one an exclusive cue (smoke / chute / wires), and fixes a
> height ladder that keeps the Boom Hotel the tallest thing in town.

---

## 6. If you want one recommendation

> **This is the slate that was chosen, unchanged.**

Pick **Kiln Yard (RAD.1) → Railhouse (RAD.2) → Telegraph Office (RAD.3) → Toll Gate
(RAD.4)**.

That slate maximises the two things that were actually broken. **Silhouette spread:**
domes-and-a-stack, a fan-and-a-mast, a wire-fanned mast, and a pass-through arch —
four completely different shape classes, none of them a rectangle with a pitched roof.
**Register spread:** industrial, transport, communications, infrastructure, which
together tell one story — *the town got connected* — and leave the civic register
uncontested to the hub. It also produces the strongest set of construction stages,
because all four are genuinely built in visible increments.

**The strongest single alternative:** swap RAD.4 to the **Courthouse** if you want the
island to gain one dignified civic anchor besides the hub, and accept the cupola
management in §5.

---

## 7. What happened next — **done**

1. ~~You pick one option per node.~~ **Done** — the §6 slate, unchanged.
2. ~~A follow-up pass folds the choices into the island spec.~~ **Done** —
   `2026-07-26-d2-boomtown-square-island-design.md` describes the chosen four
   throughout and **names none of the superseded four anywhere**, in any form: the
   spec carries no was/is table and no predecessor comparisons, and reads as though
   the chosen four were always the design. All of that history lives here instead.
   Two footprints moved with the shapes (RAD.2 `1×2 → 2×2`, RAD.4 `1×1 → 1×2`).
   **No GLB filename changed** — they are derived from node ids (`rad-1-built.glb`
   and so on).
3. ~~RAD.4's §14 Q2 open question closes.~~ **Done** — closed in favour of the Toll
   Gate; the Powder Magazine alternative is dropped.
4. The Boom Hotel, the Land Office, and the terrain layer are **untouched**.
5. ~~`Island_Lesson_Themes_Design_Spec.md` §4's stale "RAD.4's building is a
   PLACEHOLDER pending Evan" marker.~~ **Done** — that D2 row now names the decided
   set and carries no placeholder marker.

**Still open, and outside this decision:** `engines/game/src/descriptors.ts` still
reserves only `"RAD.4": "generic"` — that entry is the node→building **engine
hook**, and wiring it is the separate implementation task in the island spec §13.

## 8. Render index

All in `output/imagegen/d2-boomtown-square/`.

**Live — the chosen four, at canonical names:**

| File | Node | Building |
| --- | --- | --- |
| `rad-1-kiln-yard.png` | RAD.1 | The Kiln Yard |
| `rad-2-railhouse.png` | RAD.2 | The Railhouse |
| `rad-3-telegraph-office.png` | RAD.3 | The Telegraph Office |
| `rad-4-toll-gate.png` | RAD.4 | The Toll Gate & Keeper's Lodge |

Alongside the untouched `exp-1-boom-hotel.png`, `d2-land-office.png`, and
`d2-boomtown-square-island.png`.

**Removed after the decision** (recoverable from this branch's first commit): the
eight unchosen `rad-N-opt-*.png` renders — Market House, Tower Mill, Steam Laundry,
Waterworks, Printing House, Opera House, Courthouse, Powder Magazine — and the four
renders of the **superseded** buildings (`rad-1-masons-yard.png`,
`rad-2-framing-works.png`, `rad-3-exchange.png`, `rad-4-datum-post.png`), which
depicted identities the spec no longer contains and sat in the canonical namespace.

**Reading the renders.** They are **concept art at presentation fidelity**, not target
geometry — they exist to make the silhouette and the character decidable. The shipped
assets are low-poly flat-shaded GLBs in the Gridwork family (spec §9.5), so read these
for **shape, massing, and register**, not for texture or detail density.

## 9. References

- `docs/superpowers/specs/2026-07-26-d2-boomtown-square-island-design.md` — the island
  spec these options will be folded into; §0 guardrails, §6 palette, §7 stages, §9
  engine constraints, §14 Q2.
- `docs/Game_Visual_Design_Brief.md` — §4.1 D2's Clay `#C9A15E` hue family and the
  reserved meaning colours, §4.2 three-tone face lighting, §4.3 silhouette-first.
- `packages/skill-graph/src/skill_graph.json` — RAD.1–RAD.4 ids, prereqs, and RAD.4's
  coverage note (the source for each node's skill summary above).
- `docs/Node_Spine_v4.md` — D2 skill text.
