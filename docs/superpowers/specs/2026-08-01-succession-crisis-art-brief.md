# The Succession: art and asset brief, era four

**Date:** 2026-08-01
**Status:** brief, for a design pass. Nothing here is built and no code is changed.
**Measured at:** `integration` `e53bf9cd`, with
#369 (open, `mergedAt: null`) merged into
the branch this was written on, because this brief's plates extend that PR's generator.
**Audience:** a designer or modeller who will not read the code.
**Scope:** era four's mid-era crisis, as it renders on the 3D island.
**Plates:** `crisis-reference-packs/succession/`, six of them.

---

## 0. What this is, and what it is not

**There is already a merged presentation brief for this crisis and this does not replace it.**
`crises/era-04-succession-crisis.md` landed with
#307 at
`2026-08-01T01:53:21Z` (read from the API, not inferred from a push) and it rules the surface, the
layout at both widths, the copy, the accessibility table and the asset list. **Read it first.** This
document is the art half and it adds three things that brief does not have:

1. **The mechanic inventory**, run over era four, so an undesigned mechanic is visible rather than
   unreached. That is section 1, and it is why this document exists at all: the same audit against
   era one found a fire and a shield with no art direction, in a crisis that ships.
2. **The propagation reading**, which is a cross-crisis property no single brief can carry. Section
   4.
3. **The plates**, which settle in a frame what neither brief can settle in prose. Section 7.

> ### Where the brief I was given was inexact, corrected
>
> The task that produced this document said the three unbuilt crises were *"designs on paper with no
> art direction at all"*. **That was true when it was written and it is false at this tip.** #307
> merged a 743-line presentation brief for era four with a lighting table, a ground treatment, a
> water treatment, a vegetation treatment, an atmosphere read in one sentence, a motion rule, a
> transition and a 24-item asset list. **So this pass is not the first art direction for era four,
> and a document written as though it were would have duplicated all of it and contradicted some.**
>
> Two smaller corrections, both about the shared boundary rather than about era four:
> `crises/README.md` says `#296` is open and would move five era body hues; it is **CLOSED and
> unmerged**, and the hues moved by another route, so era four's body is `#D2C8AA` at this tip rather
> than pending. And that document's *"nine lighting numbers"* is now **thirteen controls**, because
> `WINTER_LIGHT` shipped carrying exposure, shadow intensity, a light-position ratio and fog ratios
> as well. Both are recorded at `crisis-reference-packs/README.md` section 1a with their
> measurements.

---

## 0a. The renderer boundary, which is stated once and not here

**Read `crises/README.md`, sections *"The hard boundary, shared by all nine"* and *"What is
available, which is the more useful half"*.** It is measured, it is shared by all four crises, and
this brief does not restate it. `crisis-reference-packs/README.md` section 1a records the four
things about it that have changed since it was measured, and re-verifies the rest at this tip.

**The three that bite hardest on era four**, from that document rather than from a fresh derivation:

1. **Nothing tints a building at runtime.** This crisis is *about* buildings changing hands and the
   obvious drawing is a faction colour on a wall. `faceTones()` is called by nothing but its own
   test and a building's colour is baked into its GLB. **Every allegiance mark in this crisis is
   added geometry**, and it is better than a tint would have been, because geometry survives full
   zoom-out.
2. **Four global lights, no local light.** Braziers in a contested district cannot light it.
3. **No image textures.** No banner with a device on it, no chalked proclamation, no painted mark on
   the paving. Every mark is cut into stone or it is in the DOM.

---

## 1. The mechanic inventory, era four

**Every row is a visual treatment or an explicit statement that this crisis has no analogue.** The
24 rows and their derivation are at `crisis-reference-packs/README.md` section 3. **A blank row
would be an omission; the point of the table is that there are none.**

| # | Mechanic | What the player sees | Told apart from its neighbours by |
| --- | --- | --- | --- |
| M1 | **The crisis call** | The city HUD chip and the era-four advisor's briefing slides, in `crisisBriefingFor`'s shape. **The slides are the manual** and era four is the second crisis a player meets, so it inherits era one's tutorial lines rather than restating them | It is the only crisis surface that appears before the crisis |
| M2 | **The city frozen while a call is unanswered** | Nothing new is drawn. D-CRISIS-35 freezes building and leaves lessons alone, and the freeze is a state of the CITY rather than of the crisis | **No analogue on the island, deliberately.** A visual mark for the freeze would be a punishment cue, and the tone bans forbid it. The freeze is announced in the call and nowhere else |
| M3 | **Entry and exit** | In: the lighting numbers, the bleached sky, boundary stones appearing along the paving's own joint lines, plinths, the port shutting, the crane stopping. Out: **the crane finishes its lift**, in one cut, at the resolution panel | The exit is a single object completing a motion, which nothing else in the four uses |
| M4 | **Atmosphere** | A hard white noon: cool near-white key raised close to overhead, short hard shadows, sky bleached almost white at the horizon, haze pushed back. Section 3 | **The only one of the four whose key goes UP.** Eras one, six and nine all pull the key down |
| M5 | **Ground under the crisis** | Unchanged as a surface. The crisis writes on the paved floor with **objects on its joint lines**, never with a fill or a per-cell layer. Section 3.2 | **The only one of the four that lays no ground layer at all** |
| M6 | **Water and shoreline** | The port shuts: two or three hulls standing off at anchor, the quay cleared, and **the public basin still running**, which is the one thing that has not stopped | Water as a stopped economy rather than as weather |
| M7 | **Vegetation** | The limbed-up avenue is unchanged. One permitted change at its feet: the ground beneath the line has been standing room, scuffed | **Almost no analogue.** A political dispute does not change what grows, and saying so is the row |
| M8 | **The hazard's own body** | **No analogue, and it is the defining absence.** Era four's antagonist is not a thing on the board; it is time passing without the player. Nothing advances across the ground, nothing burns, nothing arrives | This is what makes the atmosphere hard: it has to be carried by a city that has stopped working |
| M9 | **Propagation, and its leading edge** | A district decides on its own, in favour of whoever is currently strongest. **The leading edge is an OBJECT arriving at a plinth** one cycle before the decision lands. Section 4 | Section 4 answers this against the frost and against eras six and nine |
| M10 | **The counter-mechanic as an object** | **Influence, and it is the only banked resource in the four**: a ruled marble slab with stone counters seated in its cells. Section 5 | The only crisis whose counter-mechanic is a store rather than a placement |
| M11 | **Its own states** | The slab empty, part filled, filled past its first row; and a counter **spent**, which leaves the slab and seats in a socket in a plinth's base | A resource that visibly moves from one object to another |
| M12 | **Aimed coverage** | **No analogue.** Influence has no footprint: it is spent on a named district or a named building, not over an area. D-CRISIS-21 reserves repeated area placement to era one | The absence is what keeps era four off era one's axis |
| M13 | **Pre-commit preview** | **A planned spend is an OUTLINE**: a planned figure on a plinth is an outline of the figure, raised, not a figure; a planned claim plate is an outline of the plate. Committed marks are solid | Frame against fill, which is era one's own convention and is shared by all four |
| M14 | **Duration** | **No analogue.** Nothing era four places expires. A statue stays, a plate stays | The one crisis with no clock of any kind on any of its own marks |
| M15 | **Protection** | **No analogue as a shield.** Securing a civic building is closer to a claim than to a defence: the plate goes up and the building goes back to work | Era four spends to DECIDE, never to absorb |
| M16 | **The threatened building** | **The drift warning is era four's version of it**, and it is the most important object in the crisis: a marked block waiting at a plinth's foot under shear-legs. Section 4.2 | A threat to a DISTRICT rather than to a building, and it names who as well as that |
| M17 | **Accumulating damage short of destruction** | **No analogue.** Nothing accumulates on a building here. A civic building is working, contested, or resolved | Era four's consequence is binary per building and reversible |
| M18 | **The ruin** | **No analogue, and this is a hard rule rather than an omission.** `crisis-damage.ts` records era four's whole consequence in `suspended_civic`; nothing is destroyed; and the floor confines factions to CIVIC buildings, so a skill building is never claimed at all. **No ruin asset may be authored for this crisis** | Section 6 |
| M19 | **Ground lost for good** | **No analogue.** No ground is scarred, abandoned or spoiled | |
| M20 | **Repair and rebuild** | **No analogue.** There is nothing to repair, so there is no bill | Era four is the only one of the four whose aftermath costs the player nothing in material |
| M21 | **Giving ground up, and buying it back** | **No analogue.** No ground changes hands | |
| M22 | **The accuracy ladder read off the board** | Three counters, two, one, seating into the slab. **The plainest ladder of the four and it should stay plain**: era four's complexity is in what the player does with the bank | The only ladder read off a resource rather than off an extent |
| M23 | **Ambient motion** | **Almost nothing, and that is the read.** The basin's water moves. The block in the crane's sling turns very slightly. Nothing else in the city moves at all | Section 8 |
| M24 | **The conclusion** | A standalone sheet with a derived verdict, per D-CRISIS-30, and **the statues are the record**: they stay on the island afterwards, whoever raised them | The only crisis of the four whose conclusion leaves a permanent object behind |

**Eleven rows say "no analogue" and every one of them names a reason.** That is not thin coverage:
era four is the crisis furthest from era one on the axis the inventory measures, and a reader who
wanted to know what era four is could get most of the way from this table alone.

---

## 2. The read, in one sentence a modeller can check against

*The same port city under a hard white noon, ships standing off, the crane stopped with a block in
the air, and a statue on some plinths and not on others.*

**That sentence is `crises/era-04-succession-crisis.md` §2.8's and it is not improved on here.** It
is the check: a still frame with no UI in it either satisfies it or does not. Plate `01-wide-master`
is that frame.

---

## 3. The light, and the ground it falls on

### 3.1 The light, which is the biggest lever

**Era four's crisis is the only one of the four whose key goes UP**, and that is the single most
identifying decision in this brief. Eras one, six and nine are all overcast in their own ways.
Era four is a flat hot noon: **short hard shadows, no long rakes, the sun close to overhead.**

**The reasoning, which is worth holding onto because it is easy to talk out of.** Era four is the era
that set the island out to a line, and the crisis is order becoming brittle rather than weather
arriving. **Weather would be a lie about the mechanic.** Nothing is wrong with the sky; something is
wrong with who is in charge, and a bright, clear, hard-edged, entirely visible city with nobody
willing to say what they intend is a more accurate picture than a dark one.

**The lever table is in `crises/era-04-succession-crisis.md` §2.1 and is not restated.** Four notes
on top of it:

- **The key's ANGLE is now an authorable control and that brief could not know it.** `WINTER_LIGHT`
  ships `key.posRatio` and `fill.posRatio`, expressed as multipliers on the shipped position so they
  keep scaling with the island radius. Era four's *"high, close to overhead"* was prose without a
  lever; it now has one, and it is the lever that does the most work in this crisis.
- **`exposure` is available too**, at 0.92 in era one's preset. Era four wants it at or above 1.0:
  the point is a picture with the colour burnt out of it, not a darkened one.
- **`shadowIntensity` is available.** Era four wants it UP, not down. Hard shadow is the point, and
  it is the one preset in the four that does.
- **Judge the ground tone and the key intensity together, in a render.** Era one's own palette work
  records that a light, low-chroma ground washes out entirely under a bright key, and era four's
  floor is pale dressed stone under a raised key. **This is the trap in this preset** and it is not
  answerable on paper.

### 3.2 The ground: objects on the joint lines, never a fill

**Era four's floor is the era's whole ground identity and the crisis does not touch it.** Fitted
stone laid to a regular bond with the joint lines running through, cambered, kerbed and guttered.

**The crisis writes on it with two objects the era's kit already has: the boundary stone and the
milestone.** A district edge is a run of low squared boundary stones **set along a joint line in the
paving**, one every few cells. That is era four's signature move applied to the crisis: the module
counted along a wall, counted along a floor.

**Nothing fills a district**, for two reasons and either alone would do. A fill covers the paving,
which is the era's ground identity. And a filled district makes the board read as a **map** rather
than as a city, which is the failure era one's own frost narrowly avoided by keeping relief rather
than tone as its channel.

**Era four therefore lays no per-cell ground layer at all**, which incidentally sidesteps the
clipping problem every other crisis inherits: under #298 (still open, so still a design figure) era
four's buildable radius is 43 against a drawn grass radius of 30, so a per-cell layer would paint
cells off the drawn island. **That is a happy consequence and not the reason**, and it is recorded so
nobody adds a layer later without knowing.

**Plate `03-district-boundary-on-paving` settles the mark.** Four stones: no mark, a cut chevron, a
cut ring, both. **The marks are cut, not coloured**, which is era four's own motif at its smallest:
the era's tally descendant is the carved inscription panel with cut letters.

### 3.3 Water, and the one thing still running

**Era four is a port city and the crisis shuts the port.** This is the largest atmosphere change
available and it costs two or three hulls: ships standing off at anchor rather than unloading, and a
cleared quay with the bales and the tall jars gone.

**The public basin still runs.** The era's kit has it running continuously with an overflow channel,
and **the one thing that has not stopped is the water.** That is worth keeping precisely because
everything else has: a city with nothing moving in it reads as a diagram, and a city with exactly one
thing moving reads as stopped.

### 3.4 Vegetation, which does not change

The limbed-up avenue is era four's own planting and a political dispute does not change what grows.
**One permitted change, at the foot of the trees rather than in them:** the ground beneath the line
has been standing room, scuffed and littered, where people have been gathering. Relief on the decal
ladder, no change to the trees.

---

## 4. THE PROPAGATION VISUAL, which is what makes this crisis its own

### 4.1 What propagates, and along what

**Allegiance propagates, and it propagates along nothing spatial at all.** Each cycle the player does
not commit, an undecided district picks a side on its own, and it picks **whoever is currently
strongest**. So the thing that spreads is a lead, and the medium it spreads through is the standings
rather than the ground.

**That is a real topology and it is not a cop-out.** It has a rule a player can learn (waiting
compounds, because the position you will have to spend against gets stronger), it has a next step a
player can see, and it has a direction. What it does not have is **adjacency of any kind**: a district
is not more likely to fall because the one beside it did.

### 4.2 How the player watches it: the drift warning

**A district about to decide shows a numbered block waiting at the foot of its plinth, with
shear-legs standing over it.** Both are era four props. The reading is immediate and needs no legend:
somebody is about to raise a statue here.

**Three properties, and each one is load-bearing.**

- **The block carries the mark of the faction it will go to, cut into its top face.** So the warning
  says **who** and not only **that**. A warning that said only *that* would make the player's
  hesitation a coin-flip rather than a decision.
- **When the drift lands, the block goes up on the plinth.** Same object, moved, one interpolation on
  a player-caused advance. **Never a timed lift**, because era four has a cycle and a cycle that
  appeared to turn on its own would read as a timer, which INV-CRISIS-1 forbids and which the tone
  bans forbid independently.
- **A district with no block at its plinth is not drifting this cycle, and that absence is as
  informative as the block.** Plate `04-drift-warning` puts absence, waiting and landing in one
  frame for exactly this reason.

**Why this object is the fairness of the crisis.** D-CRISIS-16 charges for hesitation, and a charge
nobody saw coming is a punishment rather than a stake. INV-CRISIS-3's no-dead-ends principle is about
the player always having seen the better move. **If one item in this brief is built well it is this
one**, and if it is built badly the crisis is unfair in a way no copy can rescue.

### 4.3 How it reads differently from the frost, and from eras six and nine

The four-way table is at `crisis-reference-packs/README.md` section 4. Era four's row, argued:

**Against the frost.** The frost is an **edge** and the player watches which way it is moving. Era
four has no edge and nothing to watch move: the player watches an **object appear**, at a place, once
per cycle. **The frost's question is "how far has it got"; era four's is "which one is next".** A
player who has learned to read a front learns nothing transferable here, which is D-CRISIS-1
satisfied in the picture rather than only in the mechanics.

**Against era six.** The Plague travels along **drawn lines** and the player's whole job is to read a
graph. Era four draws **no connections at all**: its boundary stones enclose, they do not join, and
two districts that sit side by side have no relationship whatever. **The visual test: era six's
board has lines on it and era four's has none.**

**Against era nine.** The Intrusion hides status and the player pays to learn it. **Era four hides
nothing.** Every district's allegiance is visible on its plinth from the first cycle, the drift
warning tells the player what happens next, and the pressure comes from the cost of acting rather
than from ignorance. **The visual test: era nine's board is mostly unknown and era four's is fully
known and getting worse.**

**One sentence to carry into a review:** era four is the crisis where the player can see everything
and is losing anyway.

---

## 5. The player's own mark: the counting board

**Influence is the only banked resource in the four, and drawing it as a bank rather than as a number
is a design decision with a reason.** Era four's decision is *whether to hold or spend*. A bank you
can see filling makes holding feel like a choice; a number makes it feel like a stat.

**The object is the era's own: a marble slab ruled out for lettering**, with stone counters seated in
the ruled cells. Earning influence **seats counters into the slab**, filling from one end. Spending
**takes counters off the slab** and seats them in a socket in the plinth's base at the district they
were spent on.

**A ruled grid is countable at a glance**, which is what INV-CRISIS-16 wants from a non-colour
channel, and the count is in the DOM as well because the canvas is `aria-hidden`.

**Plate `06-influence-counting-board` settles the fill read**: empty, part filled, and filled past
the first row. **The question it answers is whether a second row is legible as a second row** at the
camera's distance, because that is where a naive ruled slab stops working.

**No number is invented for how many counters a batch seats.** The three-rung ladder is one, two,
three, which is `crises/era-04-succession-crisis.md` §4.2's reading of a cadence the crisis spec does
not fully specify. **The spec does not say what accuracy sizes here**, and section 9 carries it as
owed rather than as settled.

---

## 6. The three building states, as a treatment

**Two states and a declared absence, and the absence is the interesting one.** Plate
`05-civic-building-states` draws three masses and none of them is a ruin.

| State | Treatment | Channels |
| --- | --- | --- |
| **Untouched** | The building as authored | None added |
| **Affected: contested** | **Shutter plates over the openings**, in era four's own boarding: squared boards set **between the columns of its own bay**, which is the era's signature module doing the work. Plus **a corner tag**: a milestone-shaped marker at the front lower corner with the contest mark cut into it | Silhouette change across the elevation, plus the tag. Two carriers, neither of them hue |
| **Affected: claimed** | A **claim plate**: a carved inscription panel on a bracket, fixed to the wall beside the door, cut with the same chevron or ring the district's boundary stones carry | A silhouette change at the building's edge, and the same mark the ground already carries |
| **Ruined** | **There is no ruined state in this crisis.** Nothing here destroys anything | See below |

**Why there is no ruin, stated as a rule rather than as an omission.** `crisis-damage.ts` holds
exactly `ruined_buildings`, `ruined_cells` and `suspended_civic`, and era four's whole consequence
lands in the third. The floor confines factions to **civic** buildings, because a faction taking a
skill building would change ownership of a completed lesson, which D-CRISIS-7's always-preserved list
forbids outright. **So no ruin asset may be authored for era four, and no claim marker may be
authored that fits a skill building or the hub.**

**The one thing this treatment must not do: converge with a ruin.** A shuttered building has kept its
silhouette and lost its openings; a ruin has lost its silhouette. Those must not read as the same
thing, because one lifts on its own and the other costs material. **The shared shutter plate is
specified once in `crises/README.md` for exactly this reason** and era four's version is the era's
own boarding rather than a new invention.

**And this is where the no-tint constraint pays.** A faction colour on a wall would have been the
obvious drawing and it is unbuildable. Every mark here is geometry instead, and geometry survives
full zoom-out where a tint on a three-tone body under a raised key would not.

---

## 7. The plate set

Six. `crisis-reference-packs/succession/README.md` carries the reading key and the prompt sheet.

| Plate | The visual question it settles |
| --- | --- |
| `01-wide-master` | Whether the one-sentence read in section 2 is satisfiable at the fixed camera. It is the check for the whole brief |
| `02-plinth-four-states` | Whether allegiance survives being carried by **pose alone**. A standing figure against a seated one is the claim; if the two do not separate here they will not separate on the island |
| `03-district-boundary-on-paving` | How a district edge reads with **no fill**, and whether four cut marks on a small stone top are distinguishable |
| `04-drift-warning` | Whether *about to decide* is legible **before** it decides, and whether absence reads as "not this cycle" |
| `05-civic-building-states` | Untouched, contested and claimed side by side, and whether contested is distinguishable from a ruin when there is no ruin to compare it with |
| `06-influence-counting-board` | Whether a banked resource is countable on the island rather than as a number, and whether a second row reads as a second row |

**Six rather than era one's six is arithmetic, not imitation.** Era four drops era one's ground,
water-boundary and snow-density plates, because it has no ground layer, no frozen water and no
weather. It earns three of its own: the plinth states, the drift warning and the counting board.

---

## 8. What moves, and the rule motion obeys

**Almost nothing, and that is the read.** Era four's crisis is the stillest scene of the four.

- **The basin's water moves.** Everything else in the city is stopped.
- **The block in the crane's sling turns slightly.** One small rotation, nearly imperceptible, and it
  is the thing that makes a stopped city read as **stopped** rather than as **unfinished**.
- **No crowds, no processions, no marching.** There are no mobile agents in this crisis and it does
  not need them.

**The rule: nothing that moves may advance the encounter.** Era four has a **cycle**, and a cycle that
appeared to turn on its own would read as a timer, which INV-CRISIS-1 forbids and which
`docs/Game_Visual_Design_Brief.md` §2 independently bans as urgency framing. The drift lift is one
interpolation on a player-caused advance and never on elapsed time.

**Every animation is gated on `prefers-reduced-motion`**, and under that setting it holds a posed
still frame rather than disappearing. **The test for any proposed motion here: screenshot it at a
random moment and ask whether the board still reads.**

---

## 9. The transition, in and out

**In:** the lighting preset, the bleached sky, the boundary stones appearing along the joint lines,
the plinths, the port shutting, the crane stopping. **A short cross-fade on the lighting and the fog**
is the shape era one uses and the entry is worth spending more on than the exit, because it is the
moment the crisis announces itself.

**What never changes, ever:** the buildings, the paving, the kerbs and gutters, the island's geometry,
the shoreline, and era four's authored ground palette. A player who leaves must find the island as
they left it.

**Out, and era four's exit is unlike the other three.** When the last district decides, **the crane
finishes its lift.** The city starts working again in one cut, at the resolution panel. **The statues
stay**, whoever raised them, which is the crisis's persistent record of how it went and the only
permanent object any of the four leaves behind that is not damage.

---

## 10. Owed, and deliberately not invented

**No tuning number is guessed anywhere above**, per §1 of the crisis design spec: era one's numbers are
real and measured and the other nine have none.

1. **What accuracy sizes.** `crises/era-04-succession-crisis.md` §4.2 draws it as counters banked per
   batch, one / two / three, and says the spec rules it *"by implication"*. **The spec does not state
   it**, and the ladder in section 5 above is that brief's reading rather than a ruling. **Team lead.**
2. **How many districts there are, and whether they are authored or derived.** Every district needs a
   plinth, a boundary run and a header glyph, so the count is an asset multiplier. **Whoever authors
   era four's land**, which is Evan's lane.
3. **Whether there are exactly two claimants.** The standing and seated pair separates two by
   silhouette. **Three would need a third pose and the set stops reading at a glance.** **Team lead**,
   and it is the whole allegiance carrier.
4. **What advances a cycle.** Carried as O-14 and answered for era four by D-CRISIS-34 (a cycle is a
   question batch), which landed after that brief was written. **The drift line's *"decides next
   cycle"* is now meaningful**, and this is recorded as resolved rather than left open.
5. **Whether a district that resolved against the player keeps its capacity suspended.** It decides
   whether the shutter plates come off at the end for every district or only for some, which is a
   visible difference on the island. **Team lead.**
6. **Whether unspent influence survives the crisis.** Carried as O-6. Presentationally the slab should
   be swept clean at the resolution panel, which reads as a decision either way. **Team lead.**

---

## 11. References

- `crises/era-04-succession-crisis.md`: the merged presentation brief. **The authority for the
  surface, the layout, the copy and the accessibility table, and not superseded by this document**
- `crises/README.md`: the renderer boundary, the carrier set, the shutter plate and the copy rules
- `crisis-reference-packs/README.md`: the mechanic inventory's derivation, the propagation reading,
  the pack conventions, and the four corrections to the shared boundary at this tip
- `crisis-reference-packs/succession/`: the six plates, the reading key and the prompt sheet
- `2026-07-29-mid-era-crisis-design.md`: D-CRISIS-1 (the axis), D-CRISIS-4 (influence), D-CRISIS-16
  (neutral drift and the clockless cycle), D-CRISIS-21 (area placement reserved to era one),
  D-CRISIS-33 (the set of four), D-CRISIS-34 (a cycle is a batch), D-CRISIS-35 (the freeze), and
  INV-CRISIS-1, 3, 10 and 16
- `2026-08-01-hard-winter-art-brief-addendum.md`: the same inventory run over era one, and what it
  turned up
- `eras/era-04-classical/style-guide.md`: the repeated bay, the paved floor, the body hue `#D2C8AA`,
  and the props kit including the empty plinth and the ruled marble slab
- `2026-07-30-era-palette-ladder.md`: why era four's body moved, and the era four against era six
  pair it was moved to fix
- `docs/Game_Visual_Design_Brief.md` §2 and §4: the tone bans and the locked art direction, including
  the reserved meaning colours. **Read as binding and not amended here**
- `apps/web/src/city/three/winterTones.ts`: `WINTER_LIGHT`, the shape a crisis lighting preset takes
