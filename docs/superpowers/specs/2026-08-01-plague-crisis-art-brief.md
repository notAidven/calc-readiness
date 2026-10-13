# The Plague: art and asset brief, era six

**Date:** 2026-08-01
**Status:** brief, for a design pass. Nothing here is built and no code is changed.
**Measured at:** `integration` `e53bf9cd`, with
#369 (open, `mergedAt: null`) merged into
the branch this was written on, because this brief's plates extend that PR's generator.
**Audience:** a designer or modeller who will not read the code.
**Scope:** era six's mid-era crisis, as it renders on the 3D island.
**Plates:** `crisis-reference-packs/plague/`, six of them.

---

## 0. What this is, and what it is not

**There is already a merged presentation brief for this crisis and this does not replace it.**
`crises/era-06-plague.md` landed with
#307 at `2026-08-01T01:53:21Z` (read from
the API, not inferred from a push) and it rules the surface, the layout at both widths, the copy, the
accessibility table and the asset list. **Read it first.** This document is the art half and it adds
the mechanic inventory (section 1), the cross-crisis propagation reading (section 4) and the plates
(section 7).

> ### Where the brief I was given was inexact, corrected
>
> The task said the three unbuilt crises were *"designs on paper with no art direction at all"*.
> **True when written, false at this tip:** #307 merged an 830-line presentation brief for era six
> carrying a lighting table, the link layer, the barrier stone, the four building states, a motion
> rule, a transition and an asset list. This pass adds to that rather than starting it.
>
> Two corrections to the shared boundary, both measured at
> `crisis-reference-packs/README.md` section 1a: `#296` is **CLOSED and unmerged** where
> `crises/README.md` calls it open. Its historical `#E9C2A1` value was settled at that tip and
> is now superseded by the live Northern Early Modern body `#C7A48E` under dark slate/sheet
> lead `#596675`. And *"nine lighting numbers"* is now **thirteen
> controls**, because `WINTER_LIGHT` shipped carrying exposure, shadow intensity, a light-position
> ratio and fog ratios as well.

---

## 0a. The renderer boundary, which is stated once and not here

**Read `crises/README.md`, sections *"The hard boundary, shared by all nine"* and *"What is
available, which is the more useful half"*.** Measured, shared by all four crises, not restated here.
`crisis-reference-packs/README.md` section 1a records what has changed since it was taken and
re-verifies the rest at this tip.

**Era six collides with less of it than any other crisis in the run**, and that is worth knowing when
a build order is chosen: nothing in this crisis wants a glow, a pool of light, a flare or a beacon.
**It is the only one of the four that can be built exactly as designed.** The three that touch it at
all:

1. **Nothing tints a building at runtime.** An infected building cannot be drawn by tinting it and a
   closed one cannot be drawn by greying it. Both are added geometry, per sections 5 and 6.
2. **No image textures.** No painted plague cross on a door. The mark is a cut panel.
3. **No environment map.** Era six's lead domes cannot be lead-coloured **and** reflective. They are
   pale, faceted and flat-shaded, which is what they already are.

**And one item of the boundary is era six's whole opportunity rather than its problem.** The shared
ground-decal ladder is the cheapest place in the renderer to put new art, and **era six's entire
propagation layer lives on it.**

---

## 1. The mechanic inventory, era six

**Every row is a visual treatment or an explicit statement that this crisis has no analogue.** The 24
rows and their derivation are at `crisis-reference-packs/README.md` section 3.

| # | Mechanic | What the player sees | Told apart from its neighbours by |
| --- | --- | --- | --- |
| M1 | **The crisis call** | The city HUD chip and the era-six advisor's briefing slides | It is the only crisis surface that appears before the crisis |
| M2 | **The city frozen while a call is unanswered** | Nothing new is drawn. The freeze is a state of the CITY and is announced in the call | **No analogue on the island, deliberately.** A visual mark for it would be a punishment cue, which the tone bans forbid |
| M3 | **Entry and exit** | In: the lighting numbers, the flat grey sky, the inlaid bands appearing in the paving, the first infected marker, shutters closing, the survey stopping. Out: **everything comes off.** Section 9 | **Era six's exit is unlike the other three: the crisis leaves no trace.** Capacity lifts on its own, nothing was destroyed, and there is no bill |
| M4 | **Atmosphere** | High thin overcast. Not dark, not stormy, not dusk: even, shadowless and slightly cold. The read is **a day nobody went out in**. Section 3 | The only preset of the four aiming for **shadowless**. Era four wants hard shadow, era nine wants long soft ones, era one wants shallow ones |
| M5 | **Ground under the crisis** | The geometric paving is unchanged as a surface. The crisis draws **inlaid bands** into it, flush, on the decal ladder. Section 4 | **The only crisis of the four whose ground layer is per-LINK rather than per-cell or absent** |
| M6 | **Water and shoreline** | Largely unchanged. Two small additions: a quiet quay, and **one hull holding position out past the mole**, which is the quarantine read from outside | Water as an outside observer rather than as weather or as economy |
| M7 | **Vegetation** | Formal and it stays formal. **One change and it is the best image in the section: the gravel walk is raked and there are no footprints in it.** Nothing is overgrown and nothing wilts, because the outbreak is short and the gardeners are still alive | Maintenance continuing is the tell, where era one's vegetation is loaded and era nine's is untouched |
| M8 | **The hazard's own body, and its stages** | **No analogue as a thing on the ground.** The infection has no body: it is a status on a building, marked at its threshold. There are no stages, because a building is clean or infected | Era one's frost has three stages and occupies ground; era six's hazard occupies none |
| M9 | **Propagation, and its leading edge** | **The inlaid band, and the notches that appear along it.** The leading edge is a row of cut notches travelling from a source end to a destination end, then a marker appearing at the far building. Section 4 | Section 4.4 answers this against the frost and against eras four and nine |
| M10 | **The counter-mechanic as an object** | **The barrier stone**: a plain dressed stone laid across an inlaid band at its midpoint. Section 5 | The only counter-mechanic of the four that acts on a **connection** rather than on a place |
| M11 | **Its own states** | A stone with one band, two bands, a full collar, and **a stone with no band, which is a closure that has expired.** Plate `05` | An expired closure is a different silhouette from a stone that was never set, which is what stops the board lying about what is shut |
| M12 | **Aimed coverage** | **No analogue as an area, and one as a set.** A closure has no footprint; what it has is a **reachable set** it separates. That set is drawn as an outline round the buildings in it, in the read-out panel and on the board | Era one aims at ground; era six aims at a graph |
| M13 | **Pre-commit preview** | **A proposed closure is a raised OUTLINE of a barrier stone, not a stone.** The links it would cut are outlined along their length rather than notched, and the set it would separate carries a second lighter outline | Frame against fill, shared by all four |
| M14 | **Duration** | **Era six is the crisis where duration is the point**: accuracy sizes how long a closure holds, and the **band count on the stone is the read**. One band, two bands, a full collar | The only one of the four whose counter-mechanic expires, and the only one that draws a duration at all |
| M15 | **Protection** | **No analogue as a shield.** Era six does not absorb harm, it removes a path. Closing a building is closing all of its links at once, which is why it costs more capacity | Era one absorbs a bite; era six prevents an arrival |
| M16 | **The threatened building** | **A clean building with an open link to an infected one is the threatened one**, and the board already says so: the link is drawn and the infected marker is drawn. **No separate threat marker is needed and none should be added** | Section 4.3, and it is the cleanest row in the inventory: the topology IS the threat display |
| M17 | **Accumulating damage short of destruction** | **No analogue.** Nothing accumulates. A building is clean, infected, closed, or both | Era six's states are all binary and all reversible |
| M18 | **The ruin** | **No analogue, and era six sits furthest inside the failure floor of all ten crises.** It has **no destructive verb at all**, so there is no implementation slip that could remove a building, because there is no removal in its vocabulary to slip with | Section 6 |
| M19 | **Ground lost for good** | **No analogue.** No ground is scarred or abandoned | |
| M20 | **Repair and rebuild** | **No analogue.** Capacity lifts when the outbreak ends. **No bill, no action** | Era six is the only crisis of the four whose aftermath is nothing at all |
| M21 | **Giving ground up, and buying it back** | **No analogue.** No ground changes hands | |
| M22 | **The accuracy ladder read off the board** | One band, two bands, a full collar: the ladder is **on the player's own mark** rather than on the ground. Countable, non-colour | The only ladder of the four that persists on the board after the round it was earned in |
| M23 | **Ambient motion** | **Almost nothing, and less than any other of the four.** Nothing at all in the town. **The boat standing off moves slightly, and it is outside the town, which is the point.** Section 8 | Era six is the stillest of the four and its only motion is external |
| M24 | **The conclusion** | A standalone sheet with a derived verdict, per D-CRISIS-30. **The city it reports on is unmarked**, because everything lifted | The only conclusion of the four with nothing persistent to point at, which makes the accuracy sentence carry more here than anywhere else |

**Nine rows say "no analogue" and one of them is the strongest sentence in the brief:** era six cannot
destroy anything, because destruction is not in its vocabulary.

---

## 2. The read, in one sentence a modeller can check against

*The same measured town under a flat grey sky with nobody in it, lines inlaid across the paving from
door to door, a barrier stone across two of them, and a survey left standing where somebody put it
down.*

**That sentence is `crises/era-06-plague.md` §2.8's and it is not improved on here.** Plate
`01-wide-master` is the frame that either satisfies it or does not.

---

## 3. The light, and the ground it falls on

### 3.1 The light, which is the biggest lever

**High thin overcast, and the correct read is "a day nobody went out in".** Neutral near-white key well
down in intensity, high and flat so there is almost no shadow, hemisphere intensity up because under
thin overcast most of the light in the world is ambient, and a flat pale grey sky with barely any blue
in it.

**The trap, and it is the one thing in this brief a designer will get wrong first: do not make it
gloomy.** A dark plague town is the obvious move and it fights the era, which is pale stucco under
lead. **Pale, even and empty is more unsettling than dark**, and it is also what the era's materials
actually do under an overcast sky.

**Three notes on top of `crises/era-06-plague.md` §2.1's lever table, which is not restated.**

- **The key's ANGLE is now an authorable control** through `key.posRatio`, and era six wants it high
  and flat. That brief asked for it in prose and had no lever; `WINTER_LIGHT` shipped one.
- **`shadowIntensity` is the shadowless read's actual control**, at 0.55 in era one's preset. Era six
  wants it **lower than era one's**, because era one keeps shadows present but shallow and era six
  wants them nearly gone. **This is the single most identifying number in era six's preset** and it
  did not exist as a lever when that brief was written.
- **Fog stays roughly where fair weather has it.** Era six wants **clarity**: the whole point is that
  everything is visible and empty. It is the only one of the four that does not pull the fog in.

**And era six is the era whose whole identity is composition, which is why the atmosphere works at
all.** The atmosphere here is carried entirely by absence, and absence is hard to draw. **A composed
square with nobody in it is one of the most legible images in the run**, and it costs nothing but the
light.

### 3.2 The ground, and the link layer

**Era six's ground already contains the crisis's central object.** The era's props kit carries a
**meridian line inlaid in a walk** and a **bench mark cut into paving with an arrow under it**. This
is a town that draws lines in its own floor.

> **The link layer is inlaid lines in the paving.** A link between two buildings is a narrow inlaid
> band running across the ground from one to the other, flat, on the shared decal ladder, sitting
> **within** the paving pattern rather than on top of it.

**That is era six's signature move applied to the crisis: a drawing made physical.**

**One tone decision, because the obvious choice was wrong and the plates prove it.** The bands are
drawn in **a darker cut of the floor**, not in era six's slate/lead accent. Cool metal against pale
dressed stone reads as a thing lying **on** the floor, which is precisely era seven's object, so
reaching for the era's own accent here would have undone the separation in section 4.2 on every other
plate. **The inlay belongs to the floor's colour family, not to the building's.**

**The reach question.** Under #298 (still open, so still a design figure) era six's buildable radius
is 51 against a drawn grass radius of 30. Era six lays **no per-cell layer**, so the clipping problem
is smaller here than in most of the nine, but **the bands must still clip to the drawn island**,
because a link between two outlying buildings could route across ground that is not drawn.

### 3.3 Water, and vegetation

**Water is largely unchanged**, because era six's guide spends its change budget on the ground pattern
rather than on the water and the crisis should not be the thing that alters it. Two small additions: a
**quiet quay** with nothing being unloaded, and **one hull standing off past the mole**, holding
position. That is the quarantine read from outside and it is one mesh.

**Vegetation is formal and stays formal**, and the one change is the best image in this section: **the
gravel walk is raked and there are no footprints in it.** A formal garden maintained and unwalked says
the town has stopped moving better than any amount of dressing, and it is a treatment on existing
geometry.

**Nothing is overgrown and nothing wilts.** The outbreak is short and the gardeners are still alive.
**A wilting plant would tell the wrong story**, and it is the same trap era nine's brief names for its
own planting.

---

## 4. THE PROPAGATION VISUAL, which is the whole crisis

### 4.1 What propagates, and along what

**Infection propagates, along authored links between the buildings people use.** **Never through tile
adjacency**, and two linked buildings may sit on opposite sides of the settlement. **That last point
is not incidental; it is the whole topology.**

**"A few visible links" is a constraint, not a suggestion**, and it is worth restating here because
an artist can break it without touching a line of code. **No commuter agents, no per-citizen
itineraries, no trip volumes, no schedules, no exposure counters.** A link exists or it does not; it
is open or suspended. **Anything drawn that invites the player to reason about how much traffic a link
carries has crossed the line**, which rules out varying a band's width by use, drawing figures on it,
or wearing it more where more people walk.

### 4.2 In the floor, against on it: the separation that costs the most to get wrong

**D-CRISIS-8 deliberately moved the Plague onto a link layer the Boiler Cascade also wants**, so the
two are now closer in machinery and further apart in semantics. The crisis spec's own warning: **the
Plague's edges are a hazard the player wants to CUT, and the Cascade's are a supply line the player
wants INTACT.** An identical visual language would invite a player to sever era seven's network, which
is the correct move in era six and the destructive one in era seven.

> **Era six's links are IN the floor. Era seven's are ON it.**
>
> Era six inlays a line in the paving: flat, walkable, part of the ground. Era seven runs a pipe on
> sleepers: raised, structural, something you would not step on. One is a path people take; the other
> is a thing that feeds something. **The two read as opposite kinds of object at a glance and they
> share one implementation.**

**Plate `02-link-in-the-floor-against-on-it` draws both once**, so nobody has to imagine the
difference. **Era seven is shelved and the plate is still worth its place**: a shelved design comes
back, D-CRISIS-32 defers rather than cancels, and the cheapest moment to fix this is before either is
built.

**No arrowheads on era six's bands.** Era six's links are undirected. Era seven's directed version of
the same primitive adds cut arrowheads, which is what makes the two networks read differently while
sharing an implementation. **An arrowhead on an era six band would be a lie about the mechanic.**

### 4.3 The three link states, and the partly hidden half

| State | Geometry | Second channel |
| --- | --- | --- |
| **Open** | Inlaid band, flush, continuous, its ends meeting both buildings' thresholds | The ends meet thresholds, which is what says it is a route rather than a decoration |
| **Suspended** | The band is **interrupted at its midpoint by a raised barrier stone laid across it** | The band's inlay goes **matte and recessed** either side of the stone |
| **Carrying the outbreak** | The band gains a **row of cut notches** along its length | Notches are geometry and they read at zoom-out where an inlay alone might not |

**The design's most delicate point, and the reading that makes two sources agree.** The lead calls the
movement network *"partly hidden"* and the implementation calls the links *"visible"*. **The links are
visible and the infection travelling along them is not.** You can see the network and you cannot see
everywhere the disease has already reached.

**So: links are always drawn, in full, from the first turn.** No fog, no discovery, no unlocking.
**Infection markers appear only when a cycle resolves.** And **there is no "probably infected"
state**: that is era nine's, it is protected by D-CRISIS-22, and giving era six a confidence grade
would collapse the two crises into one.

**This is also why M16 needs no threat marker.** A clean building with an open link to an infected one
**is** the threatened one, and the board already draws the link and the marker. **The topology is the
threat display**, and adding a separate warning object would be the one thing that could make era six
look like era one.

### 4.4 How it reads differently from the frost, and from eras four and nine

The four-way table is at `crisis-reference-packs/README.md` section 4. Era six's row, argued:

**Against the frost.** Frost moves through **tile adjacency**, so the player's question is *how far
has the front got* and the answer is an area. Era six moves through **drawn lines**, so the question is
*what is connected to what* and the answer is a graph. **The visual test is the sharpest in the set:
era six's board has lines on it and era one's has none.** And the consequence for a player is
opposite: in era one a building is safer for being far from the edge, and **in era six distance means
nothing at all.** Plate `03-long-link-not-adjacency` is that sentence as a picture: one notched band
crossing the whole island between two buildings that do not touch, with two untouched buildings
standing between them.

**Against era four.** Era four draws no connections whatever; its boundary stones **enclose** rather
than **join**. So era four's board is a set of regions and era six's is a set of edges, which is
almost the maximum available separation on this axis.

**Against era nine.** Both hide something and they hide different things, which is the collision worth
watching. Era six hides **what has travelled along a visible network**; era nine hides **the status of
a known thing** and has **no network at all**. **Era nine must never be given an edge layer**, and era
six must never be given a confidence grade. Held to, the two are: *read the graph and cut it* against
*read the board and pay to know more*.

**One sentence to carry into a review:** era six is the crisis where the player can see every path and
not what has walked down it.

### 4.5 The resolution beat, which is a hard requirement

**Two beats, in this order, always.**

1. The player commits a closure. **The barrier stone appears immediately.** The player's own action is
   never delayed; only its consequence is.
2. The player advances the cycle. **Then infections travel**: each carrying link gains its notches, in
   order along its length from the source end to the destination end, then the newly infected buildings
   get their threshold markers, then the board settles.

**The gap between those two beats is the crisis.** A closure that resolved immediately would collapse
D-CRISIS-20's third separating axis against era five and **it would look like a responsiveness
improvement to whoever did it.** That is the whole reason this is stated as a requirement rather than
as a preference.

**One interpolation, player-advanced, never a timed animation. Under `prefers-reduced-motion` the
whole resolution is a single posed frame**: notches present, markers present, no travel. Plate
`06-building-four-states` is that posed frame for the building half.

---

## 5. The player's own mark: the barrier stone

**Era six's player closes a link, and the mark of a closed link is a raised stone set across the
inlaid band at its midpoint.**

**Why a stone and not a gate.** Era three's player closes a road with a gate, which is a structure
with hinges. **Era six's closure is administrative, not physical:** the town has decided that people
will not go this way. A plain dressed stone set across a line in the floor is the right object for a
decision made on paper and enacted in the street, and it is era six's material vocabulary exactly.

**The band count on the stone is the duration read**, and it is the only place in the four packs where
a magnitude is drawn on the board:

| Rung | How long the closure holds | On the board |
| --- | --- | --- |
| **1 right** | One cycle | One barrier stone, **one cut band** round it |
| **2 right** | Two cycles | One stone, **two bands** |
| **3 right** | Until the outbreak ends | One stone, **a full collar**, and the band's inlay recessed along its whole length |

**A closure that has expired is a stone with no bands**, which is a different silhouette from a stone
that was never set. **That distinction is what stops the board lying about what is currently shut**,
and plate `05-closure-duration-bands` puts all four side by side because it is not decidable in prose
whether one band, two bands and a collar are countable at the camera's distance.

**Closing a building is closing all of its links at once**, which is why it costs more capacity and
why it is the heavier move. **The board should show that**: when a building closes, every band touching
it gets a barrier stone, from the same closure.

**No number is invented for how long a closure holds.** The ruled cadence says *"permission or
duration"* and does not choose, and section 10 carries it as owed.

---

## 6. The building states, as a treatment

**Four states, and the fourth is the one to get right.** Plate `06-building-four-states` draws all
four. **None of them is a ruin**, and that is a rule rather than an omission.

| State | Treatment | Channels |
| --- | --- | --- |
| **Untouched: clean** | The building as authored | None added |
| **Affected: infected** | **A pedestal at the threshold carrying a covered vessel.** Era six's kit carries a pedestal with nothing on it and says why it is more useful than a full one; this is that sentence made into a mechanic. Period-correct as a vinegar vessel or a smoke pot at a door | A silhouette change at the building's edge, plus the notched bands running from it |
| **Affected: closed by the player** | **Shutter plates**: painted timber shutters closed and barred across the openings, in the era's own joinery, plus **a barred panel over the door** | A silhouette change across the elevation, plus the panel |
| **Affected: infected AND closed** | Both, and **the two must be separately readable** | Both channels, independently |
| **Ruined** | **There is no ruined state in this crisis** | See below |

**The fourth row is the one to get right.** A player must be able to see that a building is both
infected and closed, because those are **different facts with different consequences**: one is why the
building matters and the other is what the player did about it. **A treatment that merged them would
hide half the board.**

**The door panel is era six's corner tag**, using the era's own armorial panel format with the device
replaced by **a single cut bar**.

> **The bar is deliberately not a cross.** A cross is the historically obvious mark and it collides
> twice: `hw-cell__lose` already uses a cross glyph for ground the player would lose, and a cross
> reads as the wrong-answer mark on a screen that is also showing a batch verdict. **A single
> horizontal bar is unambiguous and unclaimed.**

**Why there is no ruin, stated as a rule.** `crisis-damage.ts` holds exactly `ruined_buildings`,
`ruined_cells` and `suspended_civic`, and era six's whole consequence lands in the third. **Era six has
no destructive verb at all**, so there is no implementation slip that could remove a building. **No
ruin asset may be authored for era six.**

**The one thing this treatment must not do: converge with a ruin.** A shuttered building has kept its
silhouette and lost its openings; a ruin has lost its silhouette. **In era six the difference matters
more than anywhere else**, because a closure lifts on its own and a player who thinks it is permanent
will not make it. Section 9 of the merged brief says *"while it is shut"* everywhere for the same
reason.

---

## 7. The plate set

Six. `crisis-reference-packs/plague/README.md` carries the reading key and the prompt sheet.

| Plate | The visual question it settles |
| --- | --- |
| `01-wide-master` | Whether the one-sentence read in section 2 is satisfiable at the fixed camera, and whether **pale, even and empty** is actually unsettling rather than merely quiet |
| `02-link-in-the-floor-against-on-it` | **The most expensive confusion in the set.** Era six's inlaid band against era seven's raised main, in one frame, at one scale |
| `03-long-link-not-adjacency` | Whether *spread through movement* reads as different from *spread through adjacency*, with two untouched buildings standing between the two marked ones |
| `04-link-three-states` | Open, suspended and carrying, plus the three durations and an expired closure, side by side |
| `05-closure-duration-bands` | Whether one band, two bands, a collar and none are **countable** at the camera's distance. If they are not, duration needs a second channel |
| `06-building-four-states` | The row that must not merge: clean, infected, closed, and infected-and-closed, with the fourth readable as two facts rather than one |

**Six, and four of them are about one object**, because era six is the only crisis of the four whose
player verb acts on an **edge**, and an edge has more states than a cell does. Era one's ground,
water-boundary and snow-density plates have no subject here.

---

## 8. What moves, and the rule motion obeys

**Almost nothing, and less than any other of the four.** Era six's crisis is the stillest scene in the
set.

- **Nothing at all in the town.** No people, no carts, no smoke.
- **The boat standing off moves slightly**, which is the only motion in the frame, **and it is outside
  the town, which is the point.**

**The rule: nothing that moves may advance the encounter.** The cycle resolution is one interpolation
on a player-caused advance, and **the notches travelling is the only motion in the crisis that carries
information.** It must never appear to happen on its own, because era six has a cycle and a cycle that
turned by itself would read as a timer, which INV-CRISIS-1 forbids and which
`docs/Game_Visual_Design_Brief.md` §2 bans independently as urgency framing.

**Every animation is gated on `prefers-reduced-motion`**, and under that setting the resolution is a
posed still frame rather than nothing. **The test for any proposed motion: screenshot it at a random
moment and ask whether the board still reads.**

---

## 9. The transition, in and out

**In:** the lighting preset, the flat grey sky, the inlaid bands appearing in the paving, the first
infected building's marker, the shutters closing across the town, the survey stopping mid-measurement.

**What never changes:** the buildings, the paving pattern, the steps and channels, the island's
geometry, the shoreline.

**Out, and era six's exit is unlike any other of the four.** The crisis spec records that **the Plague
is the only crisis of the ten that leaves no trace once it is over**: capacity lifts automatically,
nothing was destroyed, and there is no bill.

**So the exit is: the barrier stones come up, the inlay goes flush, the markers go from the doors, the
shutters open, and the surveyor comes back to the plane table.** That last one is the beat worth
spending on: it is the town resuming the thing it was interrupted in the middle of, and it is the
inverse of the entry.

**Whether the town should keep SOME residue** is carried in the crisis spec as O-10 and in section 10
below. **The no-trace exit is the ruling and it is not softened here.**

---

## 10. Owed, and deliberately not invented

**No tuning number is guessed anywhere above**, per §1 of the crisis design spec.

1. **Whether duration is what accuracy sizes.** The ruled cadence says *"permission or duration"* and
   does not choose. Duration is drawn here because it is the reading under which era six's own
   question (*"what do I shut down, and for how long?"*) has an answer, **and because it is the only
   reading that gives the band count a job.** **Team lead.**
2. **How long each rung holds.** One cycle, two cycles and until-the-outbreak-ends is
   `crises/era-06-plague.md` §4.2's reading, not a ruling. **The band count in section 5 draws whatever
   the ruling turns out to be**, but if a rung is more than three cycles the collar stops being
   countable and needs a different channel. **Team lead.**
3. **Whether some links are themselves unknown until used.** Carried as O-10, and **it would change
   section 3.2 substantially**: an unknown link cannot be an inlaid band, because an inlaid band is
   permanent stonework. **Settle it before the link layer is built.** **Team lead.**
4. **How many links there are, and whether they are authored or derived.** Every link is a band, a hit
   target and a row in the rail's link list, so the count is an asset multiplier and a layout
   constraint. **Whoever authors era six's land**, which is Evan's lane.
5. **Whether the town keeps any residue after the outbreak.** O-10's other half. The no-trace exit is
   ruled; whether it is the *right* ending for a crisis that took capacity for several cycles is a
   question the conclusion screen makes visible. **Team lead.**
6. **Era seven's link layer, if it is ever built.** Section 4.2 tells era seven what era six looks
   like so the two cannot converge. **Build the layer selectable and directional whoever goes
   first**: era six alone needs edges clickable, era seven's are directed, and directionality is
   expensive to retrofit into hit-testing, routing and the preview. **Recorded here because era six is
   now the one shipping and so the decision falls to whoever builds it.**

---

## 11. References

- `crises/era-06-plague.md`: the merged presentation brief. **The authority for the surface, the
  layout, the copy and the accessibility table, and not superseded by this document**
- `crises/README.md`: the renderer boundary, the carrier set, the shutter plate, the copy rules, and
  the era six against era seven separation
- `crisis-reference-packs/README.md`: the mechanic inventory's derivation, the propagation reading, the
  pack conventions, and the four corrections to the shared boundary at this tip
- `crisis-reference-packs/plague/`: the six plates, the reading key and the prompt sheet
- `2026-07-29-mid-era-crisis-design.md`: D-CRISIS-1 (the axis), **D-CRISIS-8** (three propagation
  topologies, and the sentence that era six moves through human movement and not through tile
  adjacency), D-CRISIS-20 (immediate against batched resolution), D-CRISIS-22 (era nine's protected
  hedged reading), D-CRISIS-33 (the set of four), and INV-CRISIS-1, 4, 10 and 16
- `2026-08-01-hard-winter-art-brief-addendum.md`: the same inventory run over era one, and what it
  turned up
- `eras/era-06-early-modern/style-guide.md`: the geometric paving, the meridian line and bench marks,
  the pale stone base, the warm-buff body hue `#C7A48E`, the dark slate/sheet-lead accent
  `#596675`, and the props kit
- `2026-07-30-era-palette-ladder.md`: why era six's body moved, and the era four against era six pair
  it was moved to fix
- `docs/Game_Visual_Design_Brief.md` §2 and §4: the tone bans and the locked art direction, including
  the reserved meaning colours. **Read as binding and not amended here**
- `apps/web/src/city/three/winterTones.ts`: `WINTER_LIGHT`, and `key.shadowIntensity`, which is era
  six's most identifying control
